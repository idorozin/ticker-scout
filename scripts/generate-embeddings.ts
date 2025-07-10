import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import 'dotenv/config';
import { getVectorDB } from 'lib/db/vectorDBFactory';
import { VectorDB } from 'lib/db/sqliteVectorDB'; // Import VectorDB interface

// Initialize Prisma Client for database interactions
const prisma = new PrismaClient();

// Initialize OpenAI client with API key from environment variables
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * @function generateEmbedding
 * @description Generates a vector embedding for a given text using the OpenAI API.
 * Returns a zero vector if the input text is empty.
 * @param text The text string for which to generate an embedding.
 * @returns A promise that resolves to an array of numbers representing the embedding.
 */
async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    console.log('Empty text provided, returning zero vector');
    // Return a zero vector of the expected dimension (1536 for text-embedding-3-small)
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

/**
 * @function generateEmbeddingsForCompanies
 * @description Main function to orchestrate the generation and storage of embeddings
 * for company business summaries. It fetches companies, generates embeddings in batches,
 * and stores them in both the vector database and Prisma.
 */
async function generateEmbeddingsForCompanies() {
  console.log('Starting embedding generation process...');
  
  // Ensure OpenAI API key is set before proceeding
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set in .env file');
    process.exit(1);
  }

  const vectorDB: VectorDB = getVectorDB();
  
  try {
    // Initialize the vector database support (e.g., create tables)
    await vectorDB.initializeVectorSupport();
    console.log('Vector database initialized');

    // Fetch all companies that have a longBusinessSummary from Prisma
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

    console.log(`Found ${companies.length} companies to process`);

    let processed = 0;
    const batchSize = 10; // Process embeddings in batches to manage API rate limits and memory

    // Iterate through companies in batches
    for (let i = 0; i < companies.length; i += batchSize) {
      const batch = companies.slice(i, i + batchSize);
      
      // Process each company in the current batch concurrently
      await Promise.all(batch.map(async (company) => {
        try {
          console.log(`Generating embedding for ${company.symbol} (${company.shortName})`);
          
          // Get the business summary text, defaulting to empty string if null
          const text = company.longBusinessSummary || '';
          // Generate the embedding for the company's business summary
          const embedding = await generateEmbedding(text);
          
          // Store the generated embedding in the dedicated vector database
          await vectorDB.storeEmbedding(company.id, embedding);
          
          // Also update the company record in Prisma to mark embedding as generated
          // and optionally store the embedding directly in Prisma (for backup/compatibility)
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
          console.log(`Processed ${processed}/${companies.length} companies`);
          
        } catch (error) {
          console.error(`Error processing ${company.symbol}:`, error);
        }
      }));

      // Add a delay between batches to respect API rate limits and prevent overwhelming the system
      if (i + batchSize < companies.length) {
        console.log('Waiting 1 second before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('Embedding generation completed!');
    console.log(`Successfully processed ${processed} companies`);

  } catch (error) {
    console.error('Error during embedding generation:', error);
    throw error;
  } finally {
    // Disconnect Prisma client to close the database connection
    await prisma.$disconnect();
  }
}

// This block ensures that generateEmbeddingsForCompanies() is called when the script is run directly
if (require.main === module) {
  generateEmbeddingsForCompanies().catch(console.error);
}

// Export functions for potential use in other modules (e.g., API routes)
export { generateEmbeddingsForCompanies, generateEmbedding };
