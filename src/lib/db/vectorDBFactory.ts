import { VectorDB, SQLiteVectorDB } from './sqliteVectorDB';
import { PostgreSQLVectorDB } from './postgresVectorDB';

/**
 * @function getVectorDB
 * @description Factory function to return the appropriate VectorDB implementation
 * based on the DATABASE_URL environment variable.
 * Since the schema is now set to PostgreSQL, we use PostgreSQL by default.
 * @returns An instance of a class implementing the VectorDB interface.
 */
export function getVectorDB(): VectorDB {
  const dbUrl = process.env.DATABASE_URL;
  
  // If DATABASE_URL starts with 'file:', use SQLite, otherwise use PostgreSQL
  if (dbUrl?.startsWith('file:')) {
    return new SQLiteVectorDB();
  } else {
    return new PostgreSQLVectorDB();
  }
}
