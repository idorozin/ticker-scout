import * as sqliteVec from 'sqlite-vec';
import Database from 'better-sqlite3';

/**
 * @interface VectorDB
 * @description Defines the contract for vector database operations.
 * This abstraction allows for different database implementations (e.g., SQLite, PostgreSQL)
 * to be used interchangeably for vector storage and search.
 */
export interface VectorDB {
  initializeVectorSupport(): Promise<void>;
  storeEmbedding(companyId: number, embedding: number[]): Promise<void>;
  searchSimilar(queryEmbedding: number[], limit: number): Promise<Array<{ companyId: number, similarity: number }>>;
}

/**
 * @class SQLiteVectorDB
 * @implements VectorDB
 * @description Implements vector database operations using SQLite with the sqlite-vec extension.
 */
export class SQLiteVectorDB implements VectorDB {
  private db: Database.Database;

  constructor() {
    // Connect to the SQLite database file
    this.db = new Database('./prisma/dev.db');
    // Load the sqlite-vec extension immediately upon instantiation
    try {
      sqliteVec.load(this.db);
      console.log('SQLite vector extension loaded successfully');
    } catch (error) {
      console.error('Failed to load SQLite vector extension:', error);
      throw error;
    }
  }

  /**
   * Initializes the necessary tables and verifies vector support in the SQLite database.
   * Drops existing tables to ensure a clean state for embedding storage.
   */
  async initializeVectorSupport(): Promise<void> {
    try {
      // Drop existing tables to ensure a clean slate for embedding storage
      this.db.exec(`
        DROP TABLE IF EXISTS company_embedding_map;
        DROP TABLE IF EXISTS company_embeddings;
      `);
      
      // Create a table to store company embeddings. The 'embedding' column will store BLOB data.
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS company_embeddings (
          company_id INTEGER PRIMARY KEY,
          embedding BLOB
        );
      `);

      // Verify the extension is working by testing a simple vector operation (vec_length)
      const testStmt = this.db.prepare('SELECT vec_length(?) as len');
      const testVector = Buffer.from(new Float32Array([1, 2, 3]).buffer);
      const result = testStmt.get(testVector) as { len: number } | undefined;
      
      if (!result || typeof result.len !== 'number') {
        throw new Error('Vector extension verification failed');
      }
      
      console.log('Vector database initialized and verified');
    } catch (error) {
      console.error('Error initializing vector support:', error);
      throw error;
    }
  }

  /**
   * Stores a company's embedding in the SQLite database.
   * @param companyId The ID of the company.
   * @param embedding The numerical vector embedding to store.
   */
  async storeEmbedding(companyId: number, embedding: number[]): Promise<void> {
    try {
      // Convert the numerical embedding array to a BLOB (Buffer) as required by sqlite-vec
      const buffer = Buffer.from(new Float32Array(embedding).buffer);
      
      // Prepare and execute the SQL statement to insert or replace the embedding
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO company_embeddings (company_id, embedding)
        VALUES (?, ?)
      `);
      
      stmt.run(companyId, buffer);
    } catch (error) {
      console.error(`Error storing embedding for company ${companyId}:`, error);
      throw error;
    }
  }

  /**
   * Searches for similar companies based on a query embedding using cosine distance.
   * @param queryEmbedding The embedding of the search query.
   * @param limit The maximum number of similar companies to return.
   * @returns A promise that resolves to an array of objects, each containing companyId and similarity score.
   */
  async searchSimilar(queryEmbedding: number[], limit: number): Promise<Array<{ companyId: number, similarity: number }>> {
    try {
      // Convert the query embedding to a BLOB (Buffer)
      const queryBuffer = Buffer.from(new Float32Array(queryEmbedding).buffer);
      
      // Use vec_distance_cosine to calculate similarity and order results
      const stmt = this.db.prepare(`
        SELECT 
          company_id,
          vec_distance_cosine(embedding, ?) as distance
        FROM company_embeddings
        ORDER BY distance ASC
        LIMIT ${limit}
      `);
      
      const results = stmt.all(queryBuffer);
      
      // Convert cosine distance to a similarity score (0 to 1, where 1 is identical)
      return results.map((row: any) => ({
        companyId: row.company_id,
        similarity: 1 - row.distance / 2 // Cosine distance is 0 to 2, so 1 - distance/2 normalizes to 0 to 1
      }));
    } catch (error) {
      console.error('Vector search error:', error);
      throw error;
    }
  }
}
