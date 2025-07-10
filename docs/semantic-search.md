# Semantic Search Setup Guide

Your stock screener now supports true semantic search using OpenAI embeddings and sqlite-vec! This guide will walk you through the setup process.

## Prerequisites

1. **OpenAI API Key**: Get one from [OpenAI Platform](https://platform.openai.com/api-keys)
2. **Environment Variables**: Set up your `.env` file

## Step 1: Configure Environment Variables

Create a `.env` file in your project root with the following:

```env
# Database
DATABASE_URL="file:./dev.db"

# OpenAI API Key - Get from https://platform.openai.com/api-keys
OPENAI_API_KEY="your-openai-api-key-here"
```

**Important**: Replace `your-openai-api-key-here` with your actual OpenAI API key.

## Step 2: Database Setup

The database schema has been updated to include embedding columns. Run the following to ensure your database is up to date:

```bash
npm run db:push
```

## Step 3: Complete Setup (Recommended)

Run the complete setup script that will:
1. Load all S&P 500 companies from the CSV file
2. Generate embeddings for all company descriptions
3. Set up the vector database for semantic search

```bash
npm run db:setup
```

This process will take several minutes as it generates embeddings for 500+ companies.

## Alternative: Step-by-Step Setup

If you prefer to run each step individually:

### Load CSV Data
```bash
npm run db:seed
```

### Generate Embeddings
```bash
npm run db:embeddings
```

## How It Works

### 1. **Vector Embeddings**
- Each company's business description is converted to a 1536-dimensional vector using OpenAI's `text-embedding-3-small` model
- Embeddings capture semantic meaning, not just keywords

### 2. **Semantic Search**
- When you search for "cloud computing companies", the system:
  1. Converts your query to an embedding
  2. Finds companies with similar embeddings using vector similarity
  3. Returns results ranked by semantic similarity

### 3. **Hybrid Approach**
- Vector search finds semantically similar companies
- Traditional filters (sector, market cap) still work
- Fallback to text search if vector search fails

### 4. **Database-Agnostic Design**
- Currently uses SQLite with sqlite-vec
- Designed to easily support PostgreSQL with pgvector later
- Vector operations are abstracted through interfaces

## Database Structure

### New Schema Fields
```typescript
model Company {
  // ... existing fields
  embedding             Bytes?     // Stores the vector embedding
  embeddingGenerated    Boolean    // Tracks if embedding was generated
}
```

### Vector Database (sqlite-vec)
```sql
-- Virtual table for vector operations
CREATE VIRTUAL TABLE company_embeddings 
USING vec0(
  company_id INTEGER PRIMARY KEY,
  embedding FLOAT[1536]
);
```

## API Changes

The `/api/search` endpoint now:
1. **Generates embeddings** for search queries
2. **Performs vector similarity search** using sqlite-vec
3. **Applies traditional filters** (sector, market cap)
4. **Returns results sorted by similarity**
5. **Falls back to text search** if vector search fails

## Usage Examples

### Semantic Search Examples
- "renewable energy companies"
- "artificial intelligence and machine learning"
- "financial services with high growth"
- "healthcare technology companies"
- "cloud computing infrastructure"

### Why This Is Better
- **Intent Understanding**: Finds companies that match your intent, not just keywords
- **Contextual Matching**: Understands related concepts and synonyms
- **Business Logic**: Matches based on what companies actually do
- **Flexible Queries**: Natural language instead of exact keywords

## Troubleshooting

### Common Issues

1. **Missing OpenAI API Key**
   ```
   Error: OPENAI_API_KEY is not set in .env file
   ```
   Solution: Add your OpenAI API key to the `.env` file

2. **Rate Limit Errors**
   ```
   Error: Rate limit exceeded
   ```
   Solution: The script includes rate limiting, but if you hit limits, wait and retry

3. **Database Connection Issues**
   ```
   Error: sqlite-vec extension not loaded
   ```
   Solution: Ensure better-sqlite3 is installed and the database file exists

4. **Import Errors**
   ```
   Error: Cannot find module
   ```
   Solution: Run `npm install` to ensure all dependencies are installed

### Verification

Test your setup:
1. Start the development server: `npm run dev`
2. Try semantic searches like "cloud computing companies"
3. Check the browser console for any errors
4. Verify results are relevant to your query

## Cost Considerations

- **Embedding Generation**: ~$0.01 per 1000 companies (one-time cost)
- **Search Queries**: ~$0.0001 per search query
- **Total Setup Cost**: ~$0.50 for all S&P 500 companies

## Future Enhancements

- **PostgreSQL Support**: Easy migration to PostgreSQL with pgvector
- **Multiple Models**: Support for different embedding models
- **Caching**: Cache embeddings for faster repeated searches
- **Batch Operations**: Bulk embedding generation for large datasets

## Architecture

```
Query: "cloud computing companies"
    ↓
OpenAI Embeddings API → Vector [1536 dimensions]
    ↓
sqlite-vec → Similarity Search
    ↓
Company IDs → Prisma → Apply Filters
    ↓
Sorted Results (by similarity + filters)
```

This setup provides a production-ready semantic search system that's both powerful and cost-effective! 