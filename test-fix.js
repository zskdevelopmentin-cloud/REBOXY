const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres.pdznfqregaqnddynfyfx',
  password: 'SUPREME7510141171',
  host: 'aws-1-ap-south-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    const res = await pool.query('SELECT count(*) FROM "Company";');
    console.log("SUCCESS! Result:", res.rows);
  } catch (err) {
    console.error("ERROR:", err.message);
  } finally {
    await pool.end();
  }
}

test();
