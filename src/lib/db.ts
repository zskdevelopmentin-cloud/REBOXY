import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getDatabaseUrl(): string | undefined {
  let url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Ensure Supabase pooler username includes tenant project reference
  if (url.includes('pooler.supabase.com') && url.includes('://postgres:')) {
    url = url.replace('://postgres:', '://postgres.pdznfqregaqnddynfyfx:');
  }

  if (url.includes('supabase') && !url.includes('sslmode=')) {
    url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
  }

  return url;
}

const dbUrl = getDatabaseUrl();
if (dbUrl) {
  process.env.DATABASE_URL = dbUrl;
}

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;






