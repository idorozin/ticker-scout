import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client for database interactions
const prisma = new PrismaClient();

/**
 * @function GET
 * @description Handles GET requests to retrieve a list of unique sectors from the database.
 * This API route is used to populate the sector filter dropdown in the frontend.
 * @param request The NextRequest object.
 * @returns A NextResponse object containing the list of unique sectors or an error message.
 */
export async function GET(request: NextRequest) {
  try {
    // Query the database to get all unique sector names from the Company table
    // The `distinct: ['sector']` ensures only unique sector values are returned.
    // `orderBy: { sector: 'asc' }` sorts the sectors alphabetically.
    const sectors = await prisma.company.findMany({
      select: {
        sector: true
      },
      distinct: ['sector'],
      orderBy: {
        sector: 'asc'
      }
    });

    // Extract just the sector names from the query result and filter out any null or undefined values
    const sectorNames = sectors.map(item => item.sector).filter(Boolean);

    // Return a successful JSON response with the array of sector names
    return NextResponse.json({
      success: true,
      data: sectorNames
    });

  } catch (error) {
    console.error('Sectors API error:', error);
    // Return an error response if something goes wrong during the process
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error : undefined // Include error details in development mode
      },
      { status: 500 } // Set HTTP status code to 500 for internal server error
    );
  }
}