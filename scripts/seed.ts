import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import csv from 'csv-parser';
import path from 'path';

const prisma = new PrismaClient();

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

async function main() {
  console.log('Starting to seed database...');
  
  // Clear existing data
  await prisma.company.deleteMany({});
  console.log('Cleared existing data.');
  
  const csvFilePath = path.join(process.cwd(), 'sp500_companies.csv');
  const companies: any[] = [];
  
  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (row: CsvRow) => {
        // Convert string values to appropriate types
        const company = {
          exchange: row.Exchange,
          symbol: row.Symbol,
          shortName: row.Shortname,
          longName: row.Longname,
          sector: row.Sector,
          industry: row.Industry,
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
          // Insert companies in batches
          const batchSize = 100;
          for (let i = 0; i < companies.length; i += batchSize) {
            const batch = companies.slice(i, i + batchSize);
            await prisma.company.createMany({
              data: batch,
            });
            console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(companies.length / batchSize)}`);
          }
          
          console.log('Database seeding completed successfully!');
          resolve();
        } catch (error) {
          console.error('Error inserting companies:', error);
          reject(error);
        }
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        reject(error);
      });
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 