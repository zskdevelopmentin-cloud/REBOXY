const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres.pdznfqregaqnddynfyfx',
  password: 'SUPREME7510141171',
  host: 'aws-1-ap-south-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function fixSyncLog() {
  try {
    console.log("Adding missing columns to SyncLog table in Supabase PostgreSQL using explicit user object...");

    await pool.query(`ALTER TABLE "SyncLog" ADD COLUMN IF NOT EXISTS "recordsReceived" INTEGER NOT NULL DEFAULT 0;`);
    await pool.query(`ALTER TABLE "SyncLog" ADD COLUMN IF NOT EXISTS "recordsCreated" INTEGER NOT NULL DEFAULT 0;`);
    await pool.query(`ALTER TABLE "SyncLog" ADD COLUMN IF NOT EXISTS "recordsUpdated" INTEGER NOT NULL DEFAULT 0;`);
    await pool.query(`ALTER TABLE "SyncLog" ADD COLUMN IF NOT EXISTS "recordsSkipped" INTEGER NOT NULL DEFAULT 0;`);
    await pool.query(`ALTER TABLE "SyncLog" ADD COLUMN IF NOT EXISTS "recordsDeleted" INTEGER NOT NULL DEFAULT 0;`);
    await pool.query(`ALTER TABLE "SyncLog" ADD COLUMN IF NOT EXISTS "alterIdBefore" INTEGER;`);
    await pool.query(`ALTER TABLE "SyncLog" ADD COLUMN IF NOT EXISTS "alterIdAfter" INTEGER;`);

    console.log("SUCCESS! SyncLog table columns updated!");
  } catch (err) {
    console.error("Migration Error:", err);
  } finally {
    await pool.end();
  }
}

fixSyncLog();
