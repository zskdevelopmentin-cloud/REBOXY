import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getSanitizedDbUrl(): string {
  let url = process.env.DATABASE_URL || "postgresql://postgres.pdznfqregaqnddynfyfx:SUPREME7510141171@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require";

  // Ensure pooler username includes tenant project reference
  if (url.includes('pooler.supabase.com') && url.includes('://postgres:')) {
    url = url.replace('://postgres:', '://postgres.pdznfqregaqnddynfyfx:');
  }

  // Ensure sslmode=require for Supabase
  if (url.includes('supabase') && !url.includes('sslmode=')) {
    url += (url.includes('?') ? '&' : '?') + 'sslmode=require';
  }

  return url;
}

function createPrismaClient(): PrismaClient {
  const connectionString = getSanitizedDbUrl();
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
