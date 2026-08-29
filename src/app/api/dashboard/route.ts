export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
    const companyId = req.headers.get('x-company-id');
    const role = req.headers.get('x-user-role');

    try {
        let whereClause: any = {};
        if (role !== 'SUPER_ADMIN' && companyId) {
            whereClause = { companyId };
        }

        const [
            totalSales,
            totalPurchases,
            receivables,
            payables,
            recentVouchers,
            activeCompanies,
            syncLogs
        ] = await Promise.all([
            // Sales aggregate: Match type containing 'Sales' or any positive voucher
            db.voucher.aggregate({
                _sum: { amount: true },
                where: {
                    ...whereClause,
                    type: { contains: 'Sales', mode: 'insensitive' }
                }
            }),
            // Purchase aggregate: Match type containing 'Purchase'
            db.voucher.aggregate({
                _sum: { amount: true },
                where: {
                    ...whereClause,
                    type: { contains: 'Purchase', mode: 'insensitive' }
                }
            }),
            // Receivables: Match ledgers where group contains 'Debtor' OR type = 'Customer'
            db.ledger.aggregate({
                _sum: { closingBalance: true },
                where: {
                    ...whereClause,
                    OR: [
                        { group: { contains: 'Debtor', mode: 'insensitive' } },
                        { type: 'Customer' }
                    ]
                }
            }),
            // Payables: Match ledgers where group contains 'Creditor' OR type = 'Supplier'
            db.ledger.aggregate({
                _sum: { closingBalance: true },
                where: {
                    ...whereClause,
                    OR: [
                        { group: { contains: 'Creditor', mode: 'insensitive' } },
                        { type: 'Supplier' }
                    ]
                }
            }),
            db.voucher.findMany({
                where: whereClause,
                orderBy: { date: 'desc' },
                take: 10,
                include: { party: true }
            }),
            db.company.count(),
            db.syncLog.findMany({
                where: whereClause,
                orderBy: { startTime: 'desc' },
                take: 5
            })
        ]);

        // Fallback: If sales aggregate returned 0 because vouchers had generic type names, aggregate all vouchers
        let finalSales = totalSales._sum.amount || 0;
        if (finalSales === 0) {
            const allVouchersAgg = await db.voucher.aggregate({
                _sum: { amount: true },
                where: whereClause
            });
            finalSales = allVouchersAgg._sum.amount || 0;
        }

        return NextResponse.json({
            sales: finalSales,
            purchases: totalPurchases._sum.amount || 0,
            receivables: Math.abs(receivables._sum.closingBalance || 0),
            payables: Math.abs(payables._sum.closingBalance || 0),
            recentVouchers,
            activeCompanies,
            syncLogs
        });

    } catch (error) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
