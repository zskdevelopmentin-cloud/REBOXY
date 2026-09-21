import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Fix Supabase direct host unreachable issue on Vercel/cloud serverless
  if (url.includes('.supabase.co:5432') && !url.includes('pooler.supabase.com')) {
    url = url.replace(/db\.[a-z0-9]+\.supabase\.co:5432/, 'aws-1-ap-south-1.pooler.supabase.com:6543');
  }

  if (url.includes('supabase.com')) {
    try {
      const urlObj = new URL(url);
      if (url.includes(':6543') || !urlObj.searchParams.has('pgbouncer')) {
        urlObj.searchParams.set('pgbouncer', 'true');
      }
      if (!urlObj.searchParams.has('connection_limit')) {
        urlObj.searchParams.set('connection_limit', '1');
      }
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






