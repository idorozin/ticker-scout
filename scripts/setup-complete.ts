import { loadCSVData } from './seed';
import { generateEmbeddingsForCompanies } from './generate-embeddings';

async function setupComplete() {
  console.log('🚀 Starting complete setup process...');
  console.log('This will load CSV data and generate embeddings for all companies.\n');

  try {
    // Step 1: Load CSV data
    console.log('📊 Step 1: Loading CSV data...');
    await loadCSVData();
    console.log('✅ CSV data loaded successfully\n');

    // Step 2: Generate embeddings
    console.log('🤖 Step 2: Generating embeddings...');
    await generateEmbeddingsForCompanies();
    console.log('✅ Embeddings generated successfully\n');

    console.log('🎉 Complete setup finished! Your app is ready for semantic search.');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  setupComplete().catch(console.error);
} 