import { VectorDB } from './sqliteVectorDB'; // Import the interface
import { Pool, PoolClient } from 'pg';
import { toSql } from 'pgvector/pg';

/**
 * @class PostgreSQLVectorDB
 * @implements VectorDB
 * @description PostgreSQL implementation of VectorDB using pgvector extension.
 * Provides vector storage and similarity search functionality for PostgreSQL databases.
 */
export class PostgreSQLVectorDB implements VectorDB {
  private pool: Pool;

  constructor() {
    // Parse DATABASE_URL to get connection info and SSL settings
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    const url = new URL(dbUrl);
    const sslMode = url.searchParams.get('sslmode') || url.searchParams.get('ssl');
    
    // Initialize PostgreSQL connection pool with optimized settings
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,              
      min: 2,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 3000,
      // SSL configuration
      ssl: sslMode === 'require' || sslMode === 'true' || dbUrl.includes('sslmode=require') || dbUrl.includes('amazonaws.com') || dbUrl.includes('supabase.com') || dbUrl.includes('neon.tech') 
        ? { rejectUnauthorized: false }
        : false,
    });
    
    // Add pool event listener for errors
    this.pool.on('error', (err, client) => {
      console.error('Database pool error:', err);
    });
  }

  /**
   * Initializes the necessary tables and vector extension for PostgreSQL.
   * Creates the pgvector extension and company_embeddings table if they don't exist.
   */
  async initializeVectorSupport(): Promise<void> {
    const client: PoolClient = await this.pool.connect();
    
    try {
      // Enable the pgvector extension
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');
      console.log('pgvector extension enabled');

      // Drop existing tables to ensure a clean state for embedding storage
      await client.query(`
        DROP TABLE IF EXISTS ticker_scout.company_embedding_map;
        DROP TABLE IF EXISTS ticker_scout.company_embeddings;
      `);
      
      // Create a table to store company embeddings with vector type in the ticker_scout schema
      // Using vector(1536) for OpenAI text-embedding-3-small dimension
      await client.query(`
        CREATE TABLE IF NOT EXISTS ticker_scout.company_embeddings (
          company_id INTEGER PRIMARY KEY,
          embedding vector(1536)
        );
      `);

      // Create an index for faster similarity searches using cosine distance
      await client.query(`
        CREATE INDEX IF NOT EXISTS company_embeddings_embedding_idx 
        ON ticker_scout.company_embeddings 
        USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
      `);

      // Test the vector functionality with a simple operation
      const testVector = Array.from({ length: 1536 }, () => Math.random());
      const testResult = await client.query(
        'SELECT $1::vector <=> $1::vector as distance',
        [toSql(testVector)]
      );
      
      if (testResult.rows.length === 0 || typeof testResult.rows[0].distance !== 'number') {
        throw new Error('Vector extension verification failed');
      }
      
      console.log('PostgreSQL vector database initialized and verified');
    } catch (error) {
      console.error('Error initializing PostgreSQL vector support:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Stores a company's embedding in the PostgreSQL database.
   * @param companyId The ID of the company.
   * @param embedding The numerical vector embedding to store.
   */
  async storeEmbedding(companyId: number, embedding: number[]): Promise<void> {
    const client: PoolClient = await this.pool.connect();
    
    try {
      // Validate embedding dimension
      if (embedding.length !== 1536) {
        throw new Error(`Invalid embedding dimension: expected 1536, got ${embedding.length}`);
      }

      // Insert or update the embedding using pgvector in the ticker_scout schema
      await client.query(`
        INSERT INTO ticker_scout.company_embeddings (company_id, embedding)
        VALUES ($1, $2)
        ON CONFLICT (company_id) 
        DO UPDATE SET embedding = EXCLUDED.embedding
      `, [companyId, toSql(embedding)]);
      
    } catch (error) {
      console.error(`Error storing embedding for company ${companyId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Searches for similar companies based on a query embedding using cosine distance.
   * @param queryEmbedding The embedding of the search query.
   * @param limit The maximum number of similar companies to return.
   * @returns A promise that resolves to an array of objects, each containing companyId and similarity score.
   */
  async searchSimilar(queryEmbedding: number[], limit: number): Promise<Array<{ companyId: number, similarity: number }>> {
    const client: PoolClient = await this.pool.connect();
    
    try {
      // Validate embedding dimension
      if (queryEmbedding.length !== 1536) {
        throw new Error(`Invalid query embedding dimension: expected 1536, got ${queryEmbedding.length}`);
      }

      // Use cosine distance for similarity search (<=> operator)
      // Note: cosine distance ranges from 0 (identical) to 2 (opposite)
      const result = await client.query(`
        SELECT 
          company_id,
          embedding <=> $1::vector as distance
        FROM ticker_scout.company_embeddings
        ORDER BY embedding <=> $1::vector
        LIMIT $2
      `, [toSql(queryEmbedding), limit]);
      
      // Convert cosine distance to similarity score (0 to 1, where 1 is identical)
      return result.rows.map((row: any) => ({
        companyId: parseInt(row.company_id),
        similarity: 1 - parseFloat(row.distance) / 2 // Normalize to 0-1 range
      }));
    } catch (error) {
      console.error('PostgreSQL vector search error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Optimized search that joins company_embeddings with companies table and applies filters in one query.
   * @param queryEmbedding The embedding of the search query.
   * @param limit The maximum number of similar companies to return.
   * @param filters Optional filters to apply (sector, marketCap range).
   * @returns A promise that resolves to an array of company objects with similarity scores.
   */
  async searchSimilarWithCompanyData(
    queryEmbedding: number[], 
    limit: number, 
    filters?: {
      sector?: string;
      minMarketCap?: number;
      maxMarketCap?: number;
    }
  ): Promise<any[]> {
    const client: PoolClient = await this.pool.connect();
    
    try {
      // Validate embedding dimension
      if (queryEmbedding.length !== 1536) {
        throw new Error(`Invalid query embedding dimension: expected 1536, got ${queryEmbedding.length}`);
      }

      // Build WHERE conditions for filters
      let whereConditions = [];
      let params: any[] = [toSql(queryEmbedding)];
      let paramIndex = 2;

      if (filters?.sector) {
        whereConditions.push(`c.sector = $${paramIndex}`);
        params.push(filters.sector);
        paramIndex++;
      }

      if (filters?.minMarketCap) {
        whereConditions.push(`c."marketCap" >= $${paramIndex}`);
        params.push(filters.minMarketCap);
        paramIndex++;
      }

      if (filters?.maxMarketCap) {
        whereConditions.push(`c."marketCap" <= $${paramIndex}`);
        params.push(filters.maxMarketCap);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Add limit parameter
      params.push(limit);

      // Single optimized query that joins embeddings with companies and applies all filters
      const result = await client.query(`
        SELECT 
          c.id,
          c.exchange,
          c.symbol,
          c."shortName",
          c."longName",
          c.sector,
          c.industry,
          c."currentPrice",
          c."marketCap",
          c.ebitda,
          c."revenueGrowth",
          c.city,
          c.state,
          c.country,
          c."fullTimeEmployees",
          c."longBusinessSummary",
          c.weight,
          (1 - (e.embedding <=> $1::vector) / 2) as similarity
        FROM ticker_scout.company_embeddings e
        INNER JOIN ticker_scout.companies c ON e.company_id = c.id
        ${whereClause}
        ORDER BY e.embedding <=> $1::vector
        LIMIT $${paramIndex}
      `, params);
      
      return result.rows.map((row: any) => ({
        ...row,
        similarity: parseFloat(row.similarity)
      }));
    } catch (error) {
      console.error('PostgreSQL optimized vector search error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Closes the database connection pool.
   * Should be called when the application is shutting down.
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
