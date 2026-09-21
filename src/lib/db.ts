import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function getPrismaClient() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.startsWith('file:')) {
    let dbPath = path.join(process.cwd(), 'prisma', 'dev.db');

    // On Vercel / serverless production environment, ensure dev.db in /tmp has full write permissions
    if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
      try {
        const tmpPath = '/tmp/dev.db';
        let isWritable = false;

        if (fs.existsSync(tmpPath)) {
          try {
            fs.chmodSync(tmpPath, 0o666);
            isWritable = true;
          } catch (e) {
            try { fs.unlinkSync(tmpPath); } catch (err) {}
          }
        }

        if (!isWritable && !fs.existsSync(tmpPath) && fs.existsSync(dbPath)) {
          fs.copyFileSync(dbPath, tmpPath);
          try { fs.chmodSync(tmpPath, 0o666); } catch (e) {}
        }

        if (fs.existsSync(tmpPath)) {
          dbPath = tmpPath;
        }
      } catch (e) {
        console.warn('Could not copy db to /tmp:', e);
      }
    }

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




