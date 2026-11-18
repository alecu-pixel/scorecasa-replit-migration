import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const url = process.env.DATABASE_URL;

// Neon URLs use Neon's serverless driver; any other Postgres (Render, Railway,
// Supabase, local) uses the standard node-postgres driver.
const useNeon = /neon\.tech/.test(url);

function makeDb() {
  if (useNeon) {
    neonConfig.webSocketConstructor = ws;
    const pool = new NeonPool({ connectionString: url });
    return { pool, db: drizzleNeon({ client: pool, schema }) };
  }
  const needsSsl = !/localhost|127\.0\.0\.1/.test(url) && !/sslmode=disable/.test(url);
  const pool = new pg.Pool({
    connectionString: url,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });
  return { pool, db: drizzlePg({ client: pool, schema }) };
}

const made = makeDb();
export const pool = made.pool as any;
// Both drivers expose the same query API; type it as the Neon one the code was written against.
export const db = made.db as unknown as ReturnType<typeof drizzleNeon<typeof schema>>;
