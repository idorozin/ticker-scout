import { PrismaClient } from '@prisma/client';
import { generateEmbedding } from 'scripts/generate-embeddings';
import { getVectorDB } from 'db/vectorDBFactory';
import { VectorDB } from 'db/sqliteVectorDB';

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
      const queryEmbedding = await generateEmbedding(query);
      const vectorDB: VectorDB = getVectorDB();

      const similarCompanies = await vectorDB.searchSimilar(queryEmbedding, 1000) as Array<{ companyId: number, similarity: number }>;

      let allCompanyIds: number[] = [];
      let similarityMap = new Map<number, number>();

      if (similarCompanies.length > 0) {
        similarCompanies.forEach((result: { companyId: number, similarity: number }) => {
          allCompanyIds.push(result.companyId);
          similarityMap.set(result.companyId, result.similarity);
        });
      }

      if (allCompanyIds.length === 0) {
        companies = [];
      } else {
        const whereClause: any = {
          id: {
            in: allCompanyIds
          }
        };

        if (filters.sector) {
          whereClause.sector = {
            equals: filters.sector
          };
        }

        if (filters.minMarketCap) {
          whereClause.marketCap = {
            gte: parseFloat(filters.minMarketCap)
          };
        }

        if (filters.maxMarketCap) {
          whereClause.marketCap = {
            ...whereClause.marketCap,
            lte: parseFloat(filters.maxMarketCap)
          };
        }

        const filteredCompanies = await prisma.company.findMany({
          where: whereClause,
        });

        companies = filteredCompanies
          .map((company: any) => ({
            ...company,
            similarity: similarityMap.get(company.id) || 0
          }))
          .sort((a: any, b: any) => (b.similarity as number) - (a.similarity as number))
          .slice(0, filters.limit);
      }
    } catch (error) {
      // If semantic search fails, re-throw the error as requested
      throw error;
    }
  } else {
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