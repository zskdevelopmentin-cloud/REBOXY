export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  const startTime = Date.now();
  
  try {
    // Basic DB connectivity check
    const companyCount = await db.company.count();
    const dbLatencyMs = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.5.0',
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
