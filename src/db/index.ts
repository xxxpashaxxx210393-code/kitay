import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool =
  globalForDb.__arenaNextJsPostgresqlPool ??
  new Pool({
    connectionString: databaseUrl,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = drizzle(pool);

// Production-safe database bootstrap. It only creates missing tables and
// never deletes or overwrites existing rows, so an existing database is kept.
export async function ensureDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      project_id INTEGER NOT NULL DEFAULT 1,
      name TEXT NOT NULL,
      image_url TEXT,
      item_url TEXT,
      for_whom VARCHAR(255),
      track_number VARCHAR(255),
      status VARCHAR(100) NOT NULL DEFAULT 'В пути на склад Китая',
      quantity INTEGER NOT NULL DEFAULT 1,
      price_cny DOUBLE PRECISION NOT NULL DEFAULT 0,
      shipping_china_cny DOUBLE PRECISION DEFAULT 0,
      shipping_china_usd DOUBLE PRECISION DEFAULT 0,
      shipping_belarus_byn DOUBLE PRECISION DEFAULT 0,
      rate_cny_byn DOUBLE PRECISION NOT NULL DEFAULT 0.48,
      weight DOUBLE PRECISION DEFAULT 0,
      planned_date VARCHAR(100),
      received_date VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    INSERT INTO projects (id, name)
    SELECT 1, 'Китай — основной проект'
    WHERE NOT EXISTS (SELECT 1 FROM projects)
  `);
}
