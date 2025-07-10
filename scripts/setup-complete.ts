import { loadCSVData } from './seed';
import { generateEmbeddingsForCompanies } from './generate-embeddings';

/**
 * @function setupComplete
 * @description Orchestrates the complete setup process for the application.
 * This includes loading initial company data from a CSV and generating embeddings
 * for semantic search functionality.
 */
async function setupComplete() {
  console.log('Starting complete setup process...');
  console.log('This will load CSV data and generate embeddings for all companies.\n');

  try {
    // Step 1: Load CSV data into the database
    console.log('Step 1: Loading CSV data...');
    await loadCSVData();
    console.log('CSV data loaded successfully\n');

    // Step 2: Generate embeddings for company descriptions and store them
    console.log('Step 2: Generating embeddings...');
    await generateEmbeddingsForCompanies();
    console.log('Embeddings generated successfully\n');

    console.log('Complete setup finished! Your app is ready for semantic search.');
    
  } catch (error) {
    console.error('Setup failed:', error);
    // Exit the process with an error code if any step of the setup fails
    process.exit(1);
  }
}

// This block ensures that setupComplete() is called when the script is run directly
if (require.main === module) {
  setupComplete().catch(console.error);
}