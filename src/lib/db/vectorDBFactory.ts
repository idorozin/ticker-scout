import { VectorDB, SQLiteVectorDB } from './sqliteVectorDB';
import { PostgreSQLVectorDB } from './postgresVectorDB';

// Singleton instances to reuse across requests
let postgresVectorDB: PostgreSQLVectorDB | null = null;
let sqliteVectorDB: SQLiteVectorDB | null = null;

/**
 * @function getVectorDB
 * @description Factory function to return the appropriate VectorDB implementation
 * based on the DATABASE_URL environment variable. Uses singleton pattern to reuse
 * the same instance and connection pool across requests for better performance.
 * @returns An instance of a class implementing the VectorDB interface.
 */
export function getVectorDB(): VectorDB {
  const dbUrl = process.env.DATABASE_URL;
  
  // If DATABASE_URL starts with 'file:', use SQLite, otherwise use PostgreSQL
  if (dbUrl?.startsWith('file:')) {
    // Return singleton SQLite instance
    if (!sqliteVectorDB) {
      sqliteVectorDB = new SQLiteVectorDB();
    }
    return sqliteVectorDB;
  } else {
    // Return singleton PostgreSQL instance  
    if (!postgresVectorDB) {
      postgresVectorDB = new PostgreSQLVectorDB();
    }
    return postgresVectorDB;
  }
}

/**
 * @function closeVectorDB
 * @description Closes the database connections. Should be called when the application shuts down.
 */
export async function closeVectorDB(): Promise<void> {
  if (postgresVectorDB) {
    await postgresVectorDB.close();
    postgresVectorDB = null;
  }
  
  if (sqliteVectorDB) {
    // SQLite doesn't have a close method in our current implementation
    sqliteVectorDB = null;
  }
}
