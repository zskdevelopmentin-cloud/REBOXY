if (process.env.DATABASE_URL) {
  let url = process.env.DATABASE_URL;

  // Supabase Direct Host for Vercel Serverless execution
  if (url.includes('supabase')) {
    url = "postgresql://postgres:SUPREME7510141171@db.pdznfqregaqnddynfyfx.supabase.co:5432/postgres?sslmode=require";
  }

  process.env.DATABASE_URL = url;
}
