import { PrismaClient } from '@prisma/client';
import path from 'path';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getPrismaClient() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.startsWith('file:')) {
    const dbPath = path.join(process.cwd(), 'prisma', 'dev.db');
    return new PrismaClient({
      datasources: {
        db: {
          url: `file:${dbPath}`
        }
      }
    });
  }
  return new PrismaClient();
}

export const db = globalForPrisma.prisma || getPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

