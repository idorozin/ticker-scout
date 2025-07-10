import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Get all unique sectors from the database
    const sectors = await prisma.company.findMany({
      select: {
        sector: true
      },
      distinct: ['sector'],
      orderBy: {
        sector: 'asc'
      }
    });

    // Extract just the sector names
    const sectorNames = sectors.map(item => item.sector).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: sectorNames
    });

  } catch (error) {
    console.error('Sectors API error:', error);
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