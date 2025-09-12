import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Database configuration
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create postgres client
const client = postgres(connectionString, {
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 1, // Limit connections for NextAuth usage
});

// Create drizzle instance
export const db = drizzle(client);

export default db;