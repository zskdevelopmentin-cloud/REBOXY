import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Supabase Session Pooler on port 5432 works reliably with Prisma on Vercel
  if (url.includes('pooler.supabase.com:6543')) {
    url = url.replace(':6543', ':5432');
  }

  // Rewrite unreachable direct host if configured
  if (url.includes('.supabase.co:5432') && !url.includes('pooler.supabase.com')) {
    url = url.replace(/db\.[a-z0-9]+\.supabase\.co:5432/, 'aws-1-ap-south-1.pooler.supabase.com:5432');
  }

  if (url.includes('supabase.com')) {
    try {
      const urlObj = new URL(url);
      urlObj.searchParams.delete('pgbouncer');
      if (!urlObj.searchParams.has('sslmode')) {
        urlObj.searchParams.set('sslmode', 'require');
      }
      url = urlObj.toString();
    } catch (e) {
      if (!url.includes('sslmode=')) {
        url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
      }
    }
  }

  return url;
}

const dbUrl = getDatabaseUrl();

export const db =
  globalForPrisma.prisma ||
  new PrismaClient(
    dbUrl
      ? {
          datasources: {
            db: {
              url: dbUrl,
            },
          },
        }
      : undefined
  );

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;






