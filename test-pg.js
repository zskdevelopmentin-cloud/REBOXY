const { Client } = require('pg');

async function test(url) {
    const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
    try {
        await client.connect();
        console.log("SUCCESS:", url.substring(0, 30) + '...');
        await client.end();
        return true;
    } catch (e) {
        console.error("FAILED:", url.substring(0, 30) + '...', e.message);
        return false;
    }
}

async function run() {
    const urls = [
        "postgresql://postgres.pdznfqregaqnddynfyfx:Reboxy@@4949@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
        "postgresql://postgres.pdznfqregaqnddynfyfx:Reboxy%40%404949@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
        "postgresql://postgres.pdznfqregaqnddynfyfx:Reboxy@4949@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
        "postgresql://postgres.pdznfqregaqnddynfyfx:Reboxy%404949@aws-1-ap-south-1.pooler.supabase.com:6543/postgres",
        "postgresql://postgres:Reboxy@@4949@db.pdznfqregaqnddynfyfx.supabase.co:5432/postgres",
        "postgresql://postgres:Reboxy%40%404949@db.pdznfqregaqnddynfyfx.supabase.co:5432/postgres",
    ];

    for (const u of urls) {
        await test(u);
    }
}
run();
