if (process.env.DATABASE_URL) {
  let url = process.env.DATABASE_URL;

  // Supabase Session Pooler on port 5432 avoids transaction-mode resets
  if (url.includes(':6543')) {
    url = url.replace(':6543', ':5432');
  }

  // Ensure pooler username contains tenant project reference
  if (url.includes('pooler.supabase.com') && url.includes('://postgres:')) {
    url = url.replace('://postgres:', '://postgres.pdznfqregaqnddynfyfx:');
  }

  // Enforce sslmode=require for Supabase
  if (url.includes('supabase') && !url.includes('sslmode=')) {
    url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
  }

  process.env.DATABASE_URL = url;
}
