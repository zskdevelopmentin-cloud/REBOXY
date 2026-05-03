export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(req: Request) {
    const authHeader = req.headers.get('authorization');
    const SYNC_TOKEN = process.env.SYNC_TOKEN || 'tally_local_dev_token';

    if (!authHeader || authHeader !== `Bearer ${SYNC_TOKEN}`) {
        return NextResponse.json({ error: 'Unauthorized connector' }, { status: 401 });
    }

    try {
        const body = await req.json();
        const { companyId, data } = body;

        if (!companyId || !data) {
            return NextResponse.json({ error: 'Missing required payload' }, { status: 400 });
        }

        // Verify company exists
        const company = await db.company.findUnique({ where: { id: companyId } });
        if (!company) {
             return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }

        // Create a SyncLog entry
        const syncLog = await db.syncLog.create({
            data: {
                companyId,
                status: 'IN_PROGRESS',
            }
        });

        // Simulating the upsert of Ledgers and Vouchers from `data`
        // In a real scenario, we loop through data.ledgers and data.vouchers to upsert
        let recordsSynced = 0;

        if (data.ledgers && Array.isArray(data.ledgers)) {
            recordsSynced += data.ledgers.length;
        }
        if (data.vouchers && Array.isArray(data.vouchers)) {
            recordsSynced += data.vouchers.length;
        }

        // Update company sync status
        await db.company.update({
            where: { id: companyId },
            data: { 
                tallyConnected: true,
                lastSyncTime: new Date()
            }
        });

        // Complete SyncLog
        await db.syncLog.update({
            where: { id: syncLog.id },
            data: {
                status: 'SUCCESS',
                endTime: new Date(),
                recordsSynced
            }
        });

        return NextResponse.json({ success: true, syncId: syncLog.id, recordsSynced });
    } catch (error: any) {
        console.error('Push Sync Error:', error);
        return NextResponse.json({ error: error.message || 'Sync failed' }, { status: 500 });
    }
}
