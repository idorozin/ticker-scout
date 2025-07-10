import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

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
    
    let companies = [];

    if (query) {
      // Semantic search using SQL LIKE with multiple fields
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

      // Add sector filter if provided
      if (sector) {
        whereClause.AND.push({
          sector: {
            equals: sector
          }
        });
      }

      // Add market cap filters if provided
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