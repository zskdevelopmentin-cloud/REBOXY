export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const startTime = Date.now();
  
  try {
    let ddlResult = 'OK';
    try {
      await db.$executeRawUnsafe(`ALTER TABLE "SyncLog" ADD COLUMN IF NOT EXISTS "recordsReceived" INTEGER NOT NULL DEFAULT 0;`);
      await db.$executeRawUnsafe(`ALTER TABLE "SyncLog" ADD COLUMN IF NOT EXISTS "recordsCreated" INTEGER NOT NULL DEFAULT 0;`);
      await db.$executeRawUnsafe(`ALTER TABLE "SyncLog" ADD COLUMN IF NOT EXISTS "recordsUpdated" INTEGER NOT NULL DEFAULT 0;`);
      await db.$executeRawUnsafe(`ALTER TABLE "SyncLog" ADD COLUMN IF NOT EXISTS "recordsSkipped" INTEGER NOT NULL DEFAULT 0;`);
      await db.$executeRawUnsafe(`ALTER TABLE "SyncLog" ADD COLUMN IF NOT EXISTS "recordsDeleted" INTEGER NOT NULL DEFAULT 0;`);
      await db.$executeRawUnsafe(`ALTER TABLE "SyncLog" ADD COLUMN IF NOT EXISTS "alterIdBefore" INTEGER;`);
      await db.$executeRawUnsafe(`ALTER TABLE "SyncLog" ADD COLUMN IF NOT EXISTS "alterIdAfter" INTEGER;`);
      ddlResult = 'COLUMNS_ADDED_SUCCESSFULLY';
    } catch (e: any) {
      console.error('DDL execute error:', e);
      ddlResult = `DDL_ERROR: ${e.message || String(e)}`;
    }

    const companyCount = await db.company.count();
    const dbLatencyMs = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.5.0',
      ddlResult,
      database: {
        connected: true,
        companyCount,
        latencyMs: dbLatencyMs
      },
      uptime: process.uptime()
    });
  } catch (error: any) {
    console.error('Health Check Failure:', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: false,
          error: 'Database connection failed'
        }
      },
      { status: 503 }
    );
  }
}
