#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config();

async function createDatabase() {
  console.log('Creating new database for ticker-scout...');
  
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
  const currentDatabase = url.pathname.slice(1); // Remove leading slash
  
  console.log(`Connecting to host: ${host}`);
  console.log(`Current database: ${currentDatabase}`);
  
  // Connect to the existing database to create a new one
  const client = new Client({
    host: host,
    port: port,
    user: username,
    password: password,
    database: currentDatabase,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    await client.connect();
    console.log('Connected to PostgreSQL server');
    
    // Create the new database
    const newDbName = 'ticker_scout';
    
    // Check if database already exists
    const checkResult = await client.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [newDbName]
    );
    
    if (checkResult.rows.length > 0) {
      console.log(`Database '${newDbName}' already exists!`);
    } else {
      // Create the database
      await client.query(`CREATE DATABASE ${newDbName}`);
      console.log(`✅ Created database '${newDbName}' successfully!`);
    }
    
    // Create the new connection string
    const newDbUrl = `postgresql://${username}:${password}@${host}:${port}/${newDbName}${url.search || ''}`;
    
    console.log('\n🔧 Update your .env file with:');
    console.log(`DATABASE_URL="${newDbUrl}"`);
    console.log('\nThen run:');
    console.log('npm run db:push');
    console.log('npm run db:setup');
    
  } catch (error) {
    console.error('Error creating database:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('Connection refused. Check your database server is running.');
    } else if (error.code === '28000') {
      console.error('Authentication failed. Check your username and password.');
    } else if (error.code === '42501') {
      console.error('Permission denied. Make sure your user has CREATE DATABASE privileges.');
    }
    
    process.exit(1);
  } finally {
    await client.end();
  }
}

createDatabase(); 