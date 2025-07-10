import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import * as sqliteVec from 'sqlite-vec';
import Database from 'better-sqlite3';
import 'dotenv/config';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Database abstraction for vector operations
interface VectorDB {
  initializeVectorSupport(): Promise<void>;
  storeEmbedding(companyId: number, embedding: number[]): Promise<void>;
  searchSimilar(queryEmbedding: number[], limit: number): Promise<Array<{ companyId: number, similarity: number }>>;
}

class SQLiteVectorDB implements VectorDB {
  private db: Database.Database;

  constructor() {
    this.db = new Database('./prisma/dev.db');
    // Load the extension immediately in constructor
    try {
      sqliteVec.load(this.db);
      console.log('✅ SQLite vector extension loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load SQLite vector extension:', error);
      throw error;
    }
  }

  async initializeVectorSupport(): Promise<void> {
    try {
      // Drop existing tables to ensure clean slate
      this.db.exec(`
        DROP TABLE IF EXISTS company_embedding_map;
        DROP TABLE IF EXISTS company_embeddings;
      `);
      
      // Create simple table for embeddings
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS company_embeddings (
          company_id INTEGER PRIMARY KEY,
          embedding BLOB
        );
      `);

      // Verify the extension is working by testing a simple vector operation
      const testStmt = this.db.prepare('SELECT vec_length(?) as len');
      const testVector = Buffer.from(new Float32Array([1, 2, 3]).buffer);
      const result = testStmt.get(testVector) as { len: number } | undefined;
      
      if (!result || typeof result.len !== 'number') {
        throw new Error('Vector extension verification failed');
      }
      
      console.log('✅ Vector database initialized and verified');
    } catch (error) {
      console.error('❌ Error initializing vector support:', error);
      throw error;
    }
  }

  async storeEmbedding(companyId: number, embedding: number[]): Promise<void> {
    try {
      // Convert to BLOB (Buffer) as required by sqlite-vec
      const buffer = Buffer.from(new Float32Array(embedding).buffer);
      
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO company_embeddings (company_id, embedding)
        VALUES (?, ?)
      `);
      
      stmt.run(companyId, buffer);
    } catch (error) {
      console.error(`❌ Error storing embedding for company ${companyId}:`, error);
      throw error;
    }
  }

  async searchSimilar(queryEmbedding: number[], limit: number): Promise<Array<{ companyId: number, similarity: number }>> {
    try {
      // Convert to BLOB (Buffer) as required by sqlite-vec
      const queryBuffer = Buffer.from(new Float32Array(queryEmbedding).buffer);
      
      // Use vec_distance_cosine as documented
      const stmt = this.db.prepare(`
        SELECT 
          company_id,
          vec_distance_cosine(embedding, ?) as distance
        FROM company_embeddings
        ORDER BY distance ASC
        LIMIT ${limit}
      `);
      
      const results = stmt.all(queryBuffer);
      
      // Convert distance to similarity score (1 - distance/2)
      return results.map((row: any) => ({
        companyId: row.company_id,
        similarity: 1 - row.distance / 2 // Convert to similarity score (1 = identical, 0 = opposite)
      }));
    } catch (error) {
      console.error('❌ Vector search error:', error);
      throw error;
    }
  }
}

// Future PostgreSQL implementation
class PostgreSQLVectorDB implements VectorDB {
  async initializeVectorSupport(): Promise<void> {
    // Would use pgvector extension
    // CREATE EXTENSION IF NOT EXISTS vector;
    // CREATE TABLE IF NOT EXISTS company_embeddings (
    //   company_id INTEGER PRIMARY KEY,
    //   embedding vector(1536)
    // );
    throw new Error('PostgreSQL vector support not implemented yet');
  }

  async storeEmbedding(companyId: number, embedding: number[]): Promise<void> {
    throw new Error('PostgreSQL vector support not implemented yet');
  }

  async searchSimilar(queryEmbedding: number[], limit: number): Promise<Array<{ companyId: number, similarity: number }>> {
    throw new Error('PostgreSQL vector support not implemented yet');
  }
}

// Factory function to get the appropriate vector DB
function getVectorDB(): VectorDB {
  const dbProvider = process.env.DATABASE_URL?.startsWith('postgresql') ? 'postgresql' : 'sqlite';
  
  switch (dbProvider) {
    case 'postgresql':
      return new PostgreSQLVectorDB();
    case 'sqlite':
    default:
      return new SQLiteVectorDB();
  }
}

async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    console.log('Empty text provided, returning zero vector');
    return new Array(1536).fill(0);
  }

  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text.trim(),
      encoding_format: 'float',
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

async function generateEmbeddingsForCompanies() {
  console.log('🚀 Starting embedding generation process...');
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY is not set in .env file');
    process.exit(1);
  }

  const vectorDB = getVectorDB();
  
  try {
    // Initialize vector support
    await vectorDB.initializeVectorSupport();
    console.log('✅ Vector database initialized');

    // Get all companies, regardless of embedding status
    const companies = await prisma.company.findMany({
      where: {
        longBusinessSummary: {
          not: null
        }
      },
      select: {
        id: true,
        symbol: true,
        shortName: true,
        longBusinessSummary: true,
      }
    });

    console.log(`📊 Found ${companies.length} companies to process`);

    let processed = 0;
    const batchSize = 10;

    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (company) => {
        try {
          console.log(`📝 Generating embedding for ${company.symbol} (${company.shortName})`);
          
          const text = company.longBusinessSummary || '';
          const embedding = await generateEmbedding(text);
          
          // Store normalized embedding in vector database
          await vectorDB.storeEmbedding(company.id, embedding);
          
          // Store embedding in Prisma (as backup and for compatibility)
          const embeddingBuffer = Buffer.from(new Float32Array(embedding).buffer);
          await prisma.company.update({
            where: { id: company.id },
            data: {
              // @ts-ignore - temporary fix until Prisma client regeneration
              embedding: embeddingBuffer,
              // @ts-ignore - temporary fix until Prisma client regeneration
              embeddingGenerated: true,
            }
          });
          
          processed++;
          console.log(`✅ Processed ${processed}/${companies.length} companies`);
          
        } catch (error) {
          console.error(`❌ Error processing ${company.symbol}:`, error);
        }
      }));

      // Add delay between batches to respect rate limits
      if (i + batchSize < companies.length) {
        console.log('⏳ Waiting 1 second before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('🎉 Embedding generation completed!');
    console.log(`📊 Successfully processed ${processed} companies`);

  } catch (error) {
    console.error('❌ Error during embedding generation:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  generateEmbeddingsForCompanies().catch(console.error);
}

export { generateEmbeddingsForCompanies, getVectorDB, generateEmbedding }; 