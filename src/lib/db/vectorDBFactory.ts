import { VectorDB, SQLiteVectorDB } from './sqliteVectorDB';
import { PostgreSQLVectorDB } from './postgresVectorDB';

/**
 * @function getVectorDB
 * @description Factory function to return the appropriate VectorDB implementation
 * based on the DATABASE_URL environment variable.
 * Defaults to SQLiteVectorDB if no specific provider is detected.
 * @returns An instance of a class implementing the VectorDB interface.
 */
export function getVectorDB(): VectorDB {
  const dbProvider = process.env.DATABASE_URL?.startsWith('postgresql') ? 'postgresql' : 'sqlite';
  
  switch (dbProvider) {
    case 'postgresql':
      return new PostgreSQLVectorDB();
    case 'sqlite':
    default:
      return new SQLiteVectorDB();
  }
}
