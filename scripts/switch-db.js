#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const sqliteSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.sqlite.prisma');
const postgresSchemaPath = path.join(__dirname, '..', 'prisma', 'schema.postgresql.prisma');

function switchToSQLite() {
  console.log('Switching to SQLite...');
  
  // Copy SQLite schema to main schema
  fs.copyFileSync(sqliteSchemaPath, schemaPath);
  
  // Regenerate Prisma client
  execSync('npx prisma generate', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  
  console.log('✅ Switched to SQLite successfully!');
  console.log('Make sure your .env file has:');
  console.log('DATABASE_URL="file:./dev.db"');
}

function switchToPostgreSQL() {
  console.log('Switching to PostgreSQL...');
  
  // Copy PostgreSQL schema to main schema
  fs.copyFileSync(postgresSchemaPath, schemaPath);
  
  // Regenerate Prisma client
  execSync('npx prisma generate', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
  
  console.log('✅ Switched to PostgreSQL successfully!');
  console.log('Make sure your .env file has:');
  console.log('DATABASE_URL="postgresql://username:password@localhost:5432/ticker_scout"');
}

function showUsage() {
  console.log('Usage: node scripts/switch-db.js [sqlite|postgresql]');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/switch-db.js sqlite      # Switch to SQLite');
  console.log('  node scripts/switch-db.js postgresql  # Switch to PostgreSQL');
}

// Get command line argument
const dbType = process.argv[2];

if (!dbType) {
  showUsage();
  process.exit(1);
}

switch (dbType.toLowerCase()) {
  case 'sqlite':
    switchToSQLite();
    break;
  case 'postgresql':
  case 'postgres':
    switchToPostgreSQL();
    break;
  default:
    console.error(`Unknown database type: ${dbType}`);
    showUsage();
    process.exit(1);
} 