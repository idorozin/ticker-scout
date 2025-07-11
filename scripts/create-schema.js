#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config();

async function createSchema() {
  console.log('Creating new schema for ticker-scout...');
  
  // Parse the existing DATABASE_URL to get connection info
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not found in .env file');
    process.exit(1);
  }
  
  // Parse the URL to extract connection details
  const url = new URL(dbUrl);
  const host = url.hostname;
  const port = url.port || 5432;
  const username = url.username;
  const password = url.password;
  const database = url.pathname.slice(1); // Remove leading slash
  
  console.log(`Connecting to host: ${host}`);
  console.log(`Database: ${database}`);
  
  // Connect to the existing database
  const client = new Client({
    host: host,
    port: port,
    user: username,
    password: password,
    database: database,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    await client.connect();
    console.log('Connected to PostgreSQL server');
    
    // Create the new schema
    const schemaName = 'ticker_scout';
    
    // Check if schema already exists
    const checkResult = await client.query(
      `SELECT 1 FROM information_schema.schemata WHERE schema_name = $1`,
      [schemaName]
    );
    
    if (checkResult.rows.length > 0) {
      console.log(`Schema '${schemaName}' already exists!`);
    } else {
      // Create the schema
      await client.query(`CREATE SCHEMA ${schemaName}`);
      console.log(`✅ Created schema '${schemaName}' successfully!`);
    }
    
    // Grant necessary permissions to the current user
    await client.query(`GRANT ALL ON SCHEMA ${schemaName} TO ${username}`);
    console.log(`✅ Granted permissions on schema '${schemaName}' to ${username}`);
    
    // Create the new connection string with schema
    const newDbUrl = `${dbUrl}?schema=${schemaName}`;
    
    console.log('\n🔧 Update your .env file with:');
    console.log(`DATABASE_URL="${newDbUrl}"`);
    console.log('\nThen run:');
    console.log('npm run db:push');
    console.log('npm run db:setup');
    
  } catch (error) {
    console.error('Error creating schema:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused. Check your database server is running.');
    } else if (error.code === '28000') {
      console.error('Authentication failed. Check your username and password.');
    } else if (error.code === '42501') {
      console.error('Permission denied. Make sure your user has CREATE SCHEMA privileges.');
    }
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

createSchema(); 