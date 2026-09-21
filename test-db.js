const { Client } = require('pg');

async function test(connStr) {
    console.log("Testing:", connStr);
    const client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        const res = await client.query('SELECT NOW()');
        console.log("SUCCESS:", res.rows[0]);
        await client.end();
        return true;
    } catch (err) {
        console.error("FAIL:", err.message);
        return false;
    }
}

async function run() {
    const pass = "SUPREME7510141171";
    const ref = "pdznfqregaqnddynfyfx";

    const urls = [
        `postgresql://postgres.${ref}:${pass}@aws-1-ap-south-1.pooler.supabase.com:6543/postgres`,
        `postgresql://postgres.${ref}:${pass}@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
        `postgresql://postgres.${ref}:${pass}@aws-1-ap-south-1.pooler.supabase.com:5432/postgres`,
        `postgresql://postgres.${ref}:${pass}@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`,
        `postgresql://postgres:${pass}@db.${ref}.supabase.co:5432/postgres`,
        `postgresql://postgres:${pass}@db.${ref}.supabase.co:6543/postgres`,
        `postgresql://postgres.${ref}:${pass}@pooler.supabase.com:6543/postgres`,
        `postgresql://postgres.${ref}:${pass}@pooler.supabase.com:5432/postgres`,
    ];

    for (const url of urls) {
        if (await test(url)) break;
    }
}

run();
