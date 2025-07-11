import { PrismaClient } from '@prisma/client';
import { generateEmbedding } from '../../../scripts/generate-embeddings';
import { getVectorDB } from '../db/vectorDBFactory';

const prisma = new PrismaClient();

interface SearchFilters {
  sector?: string;
  minMarketCap?: string;
  maxMarketCap?: string;
  limit: number;
}

export async function performSearch(
  query: string | null,
  filters: SearchFilters
) {
  let companies: any[] = [];

  if (query) {
    try {
      // Generate embedding for the search query
      const queryEmbedding = await generateEmbedding(query);

      // Perform optimized vector search with company data
      const vectorDB = getVectorDB();
      
      // Prepare filters for the optimized query
      const dbFilters: any = {};
      if (filters.sector) {
        dbFilters.sector = filters.sector;
      }
      if (filters.minMarketCap) {
        dbFilters.minMarketCap = parseFloat(filters.minMarketCap);
      }
      if (filters.maxMarketCap) {
        dbFilters.maxMarketCap = parseFloat(filters.maxMarketCap);
      }
      
      // Single optimized query that gets everything
      companies = await vectorDB.searchSimilarWithCompanyData(queryEmbedding, filters.limit, dbFilters);
    } catch (error) {
      console.error('Semantic search failed:', error);
      throw error;
    }
  } else {
    // Non-semantic search (filters only)
    const whereClause: any = {};

    if (filters.sector) {
      whereClause.sector = filters.sector;
    }

    if (filters.minMarketCap) {
      whereClause.marketCap = {
        ...(whereClause.marketCap || {}),
        gte: parseFloat(filters.minMarketCap)
      };
    }

    if (filters.maxMarketCap) {
      whereClause.marketCap = {
        ...(whereClause.marketCap || {}),
        lte: parseFloat(filters.maxMarketCap)
      };
    }

    companies = await prisma.company.findMany({
      where: whereClause,
      take: filters.limit,
      orderBy: {
        marketCap: 'desc'
      }
    });
  }

  return companies;
}