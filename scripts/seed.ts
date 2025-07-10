import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';

// Initialize Prisma Client for database interactions
const prisma = new PrismaClient();

/**
 * @interface CsvRow
 * @description Defines the structure of a row as read from the CSV file.
 * Each property corresponds to a column in the CSV.
 */
interface CsvRow {
  Exchange: string;
  Symbol: string;
  Shortname: string;
  Longname: string;
  Sector: string;
  Industry: string;
  Currentprice: string;
  Marketcap: string;
  Ebitda: string;
  Revenuegrowth: string;
  City: string;
  State: string;
  Country: string;
  Fulltimeemployees: string;
  Longbusinesssummary: string;
  Weight: string;
}

/**
 * @function loadCSVData
 * @description Reads company data from a CSV file, clears existing company data in the database,
 * and then inserts the new data in batches.
 * @returns A Promise that resolves when the seeding is complete, or rejects if an error occurs.
 */
export async function loadCSVData() {
  console.log('Starting to seed database...');
  
  // Clear all existing company data from the database to ensure a fresh seed
  await prisma.company.deleteMany({});
  console.log('Cleared existing data.');
  
  // Construct the absolute path to the CSV file
  const csvFilePath = path.join(process.cwd(), 'public', 'data', 'sp500_companies.csv');
  const companies: any[] = [];
  
  // Return a Promise to handle asynchronous CSV parsing and database insertion
  return new Promise<void>((resolve, reject) => {
    // Create a readable stream from the CSV file and pipe it through csv-parser
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row: CsvRow) => {
        // Transform each row from the CSV into a format suitable for Prisma's createMany operation
        const company = {
          exchange: row.Exchange,
          symbol: row.Symbol,
          shortName: row.Shortname,
          longName: row.Longname,
          sector: row.Sector,
          industry: row.Industry,
          // Parse numerical values, handling empty strings or invalid numbers as null
          currentPrice: row.Currentprice && row.Currentprice !== '' ? parseFloat(row.Currentprice) : null,
          marketCap: row.Marketcap && row.Marketcap !== '' ? parseFloat(row.Marketcap) : null,
          ebitda: row.Ebitda && row.Ebitda !== '' ? parseFloat(row.Ebitda) : null,
          revenueGrowth: row.Revenuegrowth && row.Revenuegrowth !== '' ? parseFloat(row.Revenuegrowth) : null,
          city: row.City || null,
          state: row.State || null,
          country: row.Country || null,
          fullTimeEmployees: row.Fulltimeemployees && row.Fulltimeemployees !== '' ? parseInt(row.Fulltimeemployees) : null,
          longBusinessSummary: row.Longbusinesssummary || null,
          weight: row.Weight && row.Weight !== '' ? parseFloat(row.Weight) : null,
        };
        companies.push(company);
      })
      .on('end', async () => {
        console.log(`Parsed ${companies.length} companies from CSV.`);
        
        try {
          // Insert companies into the database in batches to prevent overwhelming the database
          const batchSize = 100;
          for (let i = 0; i < companies.length; i += batchSize) {
            const batch = companies.slice(i, i + batchSize);
            await prisma.company.createMany({
              data: batch,
            });
            console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(companies.length / batchSize)}`);
          }
          
          console.log('Database seeding completed successfully!');
          resolve(); // Resolve the promise upon successful completion
        } catch (error) {
          console.error('Error inserting companies:', error);
          reject(error); // Reject the promise if an error occurs during insertion
        }
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        reject(error); // Reject the promise if an error occurs during CSV reading
      });
  });
}

// This block ensures that loadCSVData() is called when the script is run directly
if (require.main === module) {
  loadCSVData()
    .catch((e: any) => {
      console.error(e);
      process.exit(1); // Exit with an error code if the seeding fails
    })
    .finally(async () => {
      await prisma.$disconnect(); // Disconnect Prisma client after the operation completes or fails
    });
}