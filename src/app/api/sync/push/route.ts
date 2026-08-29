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

        // Verify company exists or auto-create
        let companyName = data.companyName || companyId;
        let company = await db.company.upsert({
            where: { id: companyId },
            update: {
                name: companyName,
                tallyConnected: true,
                lastSyncTime: new Date()
            },
            create: {
                id: companyId,
                name: companyName,
                tallyConnected: true,
                lastSyncTime: new Date()
            }
        });
        const activeCompanyId = company.id;

        // Create a SyncLog entry
        const syncLog = await db.syncLog.create({
            data: {
                companyId: activeCompanyId,
                status: 'IN_PROGRESS',
            }
        });

        let recordsSynced = 0;

        // Upsert Ledgers
        if (data.ledgers && Array.isArray(data.ledgers)) {
            for (const l of data.ledgers) {
                if (!l.name) continue;
                const id = String(l.tallyId || `${activeCompanyId}-${l.name}`);
                await db.ledger.upsert({
                    where: { id },
                    update: {
                        companyId: activeCompanyId,
                        name: l.name,
                        group: l.group || 'Sundry Debtors',
                        closingBalance: parseFloat(l.closingBalance) || 0,
                        type: l.type || 'Customer'
                    },
                    create: {
                        id,
                        companyId: activeCompanyId,
                        name: l.name,
                        group: l.group || 'Sundry Debtors',
                        closingBalance: parseFloat(l.closingBalance) || 0,
                        type: l.type || 'Customer'
                    }
                });
                recordsSynced++;
            }
        }

        // Upsert Vouchers
        if (data.vouchers && Array.isArray(data.vouchers)) {
            for (const v of data.vouchers) {
                if (!v.vNo) continue;
                const id = String(v.tallyId || `${activeCompanyId}-${v.vNo}`);
                await db.voucher.upsert({
                    where: { id },
                    update: {
                        companyId: activeCompanyId,
                        vNo: String(v.vNo),
                        type: v.type || 'Sales',
                        date: new Date(v.date || Date.now()),
                        amount: parseFloat(v.amount) || 0,
                        status: 'COMPLETED'
                    },
                    create: {
                        id,
                        companyId: activeCompanyId,
                        vNo: String(v.vNo),
                        type: v.type || 'Sales',
                        date: new Date(v.date || Date.now()),
                        amount: parseFloat(v.amount) || 0,
                        status: 'COMPLETED'
                    }
                });
                recordsSynced++;
            }
        }

        // Update company sync status
        await db.company.update({
            where: { id: activeCompanyId },
            data: { 
                name: companyName,
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
