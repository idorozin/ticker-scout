import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { generateEmbedding, getVectorDB } from '../../../../scripts/generate-embeddings';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Get search parameters
    const query = searchParams.get('q');
    const sector = searchParams.get('sector');
    const minMarketCap = searchParams.get('minMarketCap');
    const maxMarketCap = searchParams.get('maxMarketCap');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let companies: any[] = [];

    if (query) {
      try {
        console.log('🔍 Starting search for query:', query);
        
        // Check database state
        const totalCompanies = await prisma.company.count();
        const companiesWithEmbeddings = await prisma.company.count({
          where: {
            // @ts-ignore - temporary fix until Prisma client regeneration
            embeddingGenerated: true
          }
        });
        console.log(`📊 Database state: ${companiesWithEmbeddings}/${totalCompanies} companies have embeddings`);
        
        // Generate embedding for the search query
        const queryEmbedding = await generateEmbedding(query);
        console.log('✅ Generated embedding, length:', queryEmbedding.length);
        
        // Get vector database instance
        const vectorDB = getVectorDB();
        
        // Search for similar companies using vector similarity
        const similarCompanies = await vectorDB.searchSimilar(queryEmbedding, 1000);
        console.log('📊 Vector search results:', similarCompanies.length);
        
        // Also get companies that don't have embeddings and do text search on them
        const companiesWithoutEmbeddings = await prisma.company.findMany({
          where: {
            // @ts-ignore - temporary fix until Prisma client regeneration
            embeddingGenerated: false,
            OR: [
              { shortName: { contains: query } },
              { longName: { contains: query } },
              { sector: { contains: query } },
              { industry: { contains: query } },
              { longBusinessSummary: { contains: query } }
            ]
          }
        });
        console.log('📝 Text search results:', companiesWithoutEmbeddings.length);

        // Combine vector search results with text search results
        let allCompanyIds: number[] = [];
        let similarityMap = new Map<number, number>();

        // Add vector search results
        if (similarCompanies.length > 0) {
          similarCompanies.forEach((result: { companyId: number, similarity: number }) => {
            allCompanyIds.push(result.companyId);
            similarityMap.set(result.companyId, result.similarity);
          });
        }

        // Add text search results (with lower similarity scores)
        companiesWithoutEmbeddings.forEach((company: any) => {
          if (!allCompanyIds.includes(company.id)) {
            allCompanyIds.push(company.id);
            similarityMap.set(company.id, 0.1); // Low similarity for text matches
          }
        });

        console.log('🔗 Combined company IDs:', allCompanyIds.length);

        if (allCompanyIds.length === 0) {
          console.log('❌ No companies found');
          companies = [];
        } else {
          // Build where clause for traditional filters
          const whereClause: any = {
            id: {
              in: allCompanyIds
            }
          };

          // Add sector filter if provided
          if (sector) {
            whereClause.sector = {
              equals: sector
            };
            console.log('🏢 Filtering by sector:', sector);
          }

          // Add market cap filters if provided
          if (minMarketCap) {
            whereClause.marketCap = {
              gte: parseFloat(minMarketCap)
            };
            console.log('💰 Min market cap filter:', minMarketCap);
          }

          if (maxMarketCap) {
            whereClause.marketCap = {
              ...whereClause.marketCap,
              lte: parseFloat(maxMarketCap)
            };
            console.log('💰 Max market cap filter:', maxMarketCap);
          }

          // Fetch companies with filters applied
          const filteredCompanies = await prisma.company.findMany({
            where: whereClause,
          });
          console.log('🎯 Filtered companies:', filteredCompanies.length);

          // Sort by similarity score and apply user's limit
          companies = filteredCompanies
            .map((company: any) => ({
              ...company,
              similarity: similarityMap.get(company.id) || 0
            }))
            .sort((a: any, b: any) => (b.similarity as number) - (a.similarity as number))
            .slice(0, limit);
          
          console.log('✅ Final results:', companies.length);
        }
      } catch (error) {
        console.error('Vector search error:', error);
        // Fallback to traditional text search if vector search fails
        const whereClause: any = {
          AND: [
            {
              OR: [
                {
                  shortName: {
                    contains: query
                  }
                },
                {
                  longName: {
                    contains: query
                  }
                },
                {
                  sector: {
                    contains: query
                  }
                },
                {
                  industry: {
                    contains: query
                  }
                },
                {
                  longBusinessSummary: {
                    contains: query
                  }
                }
              ]
            }
          ]
        };

        // Add filters for fallback search
        if (sector) {
          whereClause.AND.push({
            sector: {
              equals: sector
            }
          });
        }

        if (minMarketCap) {
          whereClause.AND.push({
            marketCap: {
              gte: parseFloat(minMarketCap)
            }
          });
        }

        if (maxMarketCap) {
          whereClause.AND.push({
            marketCap: {
              lte: parseFloat(maxMarketCap)
            }
          });
        }

        companies = await prisma.company.findMany({
          where: whereClause,
          take: limit,
          orderBy: {
            marketCap: 'desc'
          }
        });
      }
    } else {
      // Return all companies if no search query, with optional filters
      const whereClause: any = {};

      // Add filters
      if (sector) {
        whereClause.sector = sector;
      }

      if (minMarketCap) {
        whereClause.marketCap = {
          ...(whereClause.marketCap || {}),
          gte: parseFloat(minMarketCap)
        };
      }

      if (maxMarketCap) {
        whereClause.marketCap = {
          ...(whereClause.marketCap || {}),
          lte: parseFloat(maxMarketCap)
        };
      }

      companies = await prisma.company.findMany({
        where: whereClause,
        take: limit,
        orderBy: {
          marketCap: 'desc'
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        companies,
        total: companies.length
      }
    });

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
} 