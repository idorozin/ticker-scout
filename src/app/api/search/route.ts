import { NextRequest, NextResponse } from 'next/server';
import { performSearch } from '@/lib/search/searchService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const query = searchParams.get('q');
    const sector = searchParams.get('sector');
    const minMarketCap = searchParams.get('minMarketCap');
    const maxMarketCap = searchParams.get('maxMarketCap');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const companies = await performSearch(query, {
      sector,
      minMarketCap,
      maxMarketCap,
      limit,
    });

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