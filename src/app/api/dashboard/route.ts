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
            salesAgg,
            purchasesAgg,
            receiptsAgg,
            paymentsAgg,
            outstandingAgg,
            cashBankAgg,
            recentVouchers,
            activeCompanies,
            syncLogs
        ] = await Promise.all([
            // 1. Sales & Credit Notes
            db.voucher.aggregate({
                _sum: { amount: true },
                where: {
                    ...whereClause,
                    OR: [
                        { type: { contains: 'Sales', mode: 'insensitive' } },
                        { type: { contains: 'Credit Note', mode: 'insensitive' } }
                    ]
                }
            }),
            // 2. Purchase & Debit Notes
            db.voucher.aggregate({
                _sum: { amount: true },
                where: {
                    ...whereClause,
                    OR: [
                        { type: { contains: 'Purchase', mode: 'insensitive' } },
                        { type: { contains: 'Debit Note', mode: 'insensitive' } }
                    ]
                }
            }),
            // 3. Receipt
            db.voucher.aggregate({
                _sum: { amount: true },
                where: {
                    ...whereClause,
                    type: { contains: 'Receipt', mode: 'insensitive' }
                }
            }),
            // 4. Payment
            db.voucher.aggregate({
                _sum: { amount: true },
                where: {
                    ...whereClause,
                    type: { contains: 'Payment', mode: 'insensitive' }
                }
            }),
            // 5. Outstanding (Total Debtors Closing Balance)
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
            // 6. Cash / Bank Balance
            db.ledger.aggregate({
                _sum: { closingBalance: true },
                where: {
                    ...whereClause,
                    OR: [
                        { group: { contains: 'Bank', mode: 'insensitive' } },
                        { group: { contains: 'Cash', mode: 'insensitive' } },
                        { type: 'Bank' },
                        { type: 'Cash' }
                    ]
                }
            }),
            // Recent Transactions
            db.voucher.findMany({
                where: whereClause,
                orderBy: { date: 'desc' },
                take: 15,
                include: { party: true }
            }),
            db.company.count(),
            db.syncLog.findMany({
                where: whereClause,
                orderBy: { startTime: 'desc' },
                take: 5
            })
        ]);

        return NextResponse.json({
            sales: salesAgg._sum.amount || 0,
            purchases: purchasesAgg._sum.amount || 0,
            receipts: receiptsAgg._sum.amount || 0,
            payments: paymentsAgg._sum.amount || 0,
            outstanding: Math.abs(outstandingAgg._sum.closingBalance || 0),
            cashBank: Math.abs(cashBankAgg._sum.closingBalance || 0),
            receivables: Math.abs(outstandingAgg._sum.closingBalance || 0),
            payables: Math.abs(purchasesAgg._sum.amount || 0),
            recentVouchers,
            activeCompanies,
            syncLogs
        });

    } catch (error) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
