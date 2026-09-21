export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const authHeader = req.headers.get('authorization');
        const SYNC_TOKEN = process.env.SYNC_TOKEN || 'tally_local_dev_token';

        const userId = req.headers.get('x-user-id');
        const userRole = req.headers.get('x-user-role');
        const userCompanyId = req.headers.get('x-company-id');

        let companyId: string | null = null;

        // Connector authorization
        if (authHeader && authHeader === `Bearer ${SYNC_TOKEN}`) {
            companyId = searchParams.get('companyId') || userCompanyId;
        } else if (userId) {
            // User session authorization
            if (userRole === 'SUPER_ADMIN') {
                companyId = searchParams.get('companyId') || userCompanyId || null;
            } else {
                // Non-super-admins are strictly constrained to their assigned companyId
                companyId = userCompanyId || null;
            }
        } else {
            return NextResponse.json({ error: 'Unauthorized request' }, { status: 401 });
        }

        if (!companyId) {
            const firstCompany = await db.company.findFirst();
            if (firstCompany) {
                companyId = firstCompany.id;
            } else {
                return NextResponse.json({ error: 'No company found' }, { status: 404 });
            }
        }

        const company = await db.company.findUnique({
            where: { id: companyId },
            include: {
                syncLogs: {
                    orderBy: { startTime: 'desc' },
                    take: 5
                }
            }
        });

        if (!company) {
            return NextResponse.json({
                companyId,
                tallyConnected: false,
                lastSyncTime: null,
                lastAlterId: 0,
                lastSyncStatus: 'IDLE',
                lastSyncError: null,
                lastSyncDetails: null,
                recentSyncLogs: []
            });
        }

        let parsedDetails = null;
        if (company.lastSyncDetails) {
            try {
                parsedDetails = JSON.parse(company.lastSyncDetails);
            } catch (e) {
                parsedDetails = company.lastSyncDetails;
            }
        }

        return NextResponse.json({
            companyId: company.id,
            companyName: company.name,
            tallyConnected: company.tallyConnected,
            lastSyncTime: company.lastSyncTime,
            lastAlterId: company.lastAlterId || 0,
            lastSyncStatus: company.lastSyncStatus || 'IDLE',
            lastSyncError: company.lastSyncError || null,
            lastSyncDetails: parsedDetails,
            recentSyncLogs: company.syncLogs
        });
    } catch (error: any) {
        console.error('Get Sync Status Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch sync status' }, { status: 500 });
    }
}
