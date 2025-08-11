import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '../types/env';
import * as schema from './schema';

// Create connection pool
const connectionString = env.DATABASE_URL;
const sql = postgres(connectionString, {
  max: env.NODE_ENV === 'production' ? 20 : 5,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: env.NODE_ENV === 'production' ? 'require' : false,
});

// Create Drizzle instance
export const db = drizzle(sql, { 
  schema,
  logger: env.NODE_ENV === 'development',
});

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await sql.end();
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
}

export type Database = typeof db;
export { sql };