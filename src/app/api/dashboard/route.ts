export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
    const companyId = req.headers.get('x-company-id');
    const role = req.headers.get('x-user-role');
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    try {
        let whereClause: any = {};
        if (role !== 'SUPER_ADMIN' && companyId) {
            whereClause = { companyId };
        }

        let voucherWhereClause: any = { ...whereClause };
        if (startDate && endDate) {
            voucherWhereClause.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const [
            grossSalesAgg,
            creditNotesAgg,
            grossPurchasesAgg,
            debitNotesAgg,
            receiptsAgg,
            paymentsAgg,
            outstandingAgg,
            cashBankAgg,
            recentVouchers,
            activeCompanies,
            syncLogs
        ] = await Promise.all([
            // 1. Gross Sales Vouchers
            db.voucher.aggregate({
                _sum: { amount: true },
                where: {
                    ...voucherWhereClause,
                    type: { contains: 'Sales', mode: 'insensitive' }
                }
            }),
            // 2. Credit Note Vouchers (Returns)
            db.voucher.aggregate({
                _sum: { amount: true },
                where: {
                    ...voucherWhereClause,
                    type: { contains: 'Credit Note', mode: 'insensitive' }
                }
            }),
            // 3. Purchase Vouchers
            db.voucher.aggregate({
                _sum: { amount: true },
                where: {
                    ...voucherWhereClause,
                    type: { contains: 'Purchase', mode: 'insensitive' }
                }
            }),
            // 4. Debit Note Vouchers
            db.voucher.aggregate({
                _sum: { amount: true },
                where: {
                    ...voucherWhereClause,
                    type: { contains: 'Debit Note', mode: 'insensitive' }
                }
            }),
            // 5. Receipt
            db.voucher.aggregate({
                _sum: { amount: true },
                where: {
                    ...voucherWhereClause,
                    type: { contains: 'Receipt', mode: 'insensitive' }
                }
            }),
            // 6. Payment
            db.voucher.aggregate({
                _sum: { amount: true },
                where: {
                    ...voucherWhereClause,
                    type: { contains: 'Payment', mode: 'insensitive' }
                }
            }),
            // 7. Outstanding (Total Debtors Closing Balance)
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
            // 8. Cash / Bank Balance
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
                where: voucherWhereClause,
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

        const grossSales = grossSalesAgg._sum.amount || 0;
        const creditNotes = creditNotesAgg._sum.amount || 0;
        const netSales = grossSales - creditNotes;

        const grossPurchases = grossPurchasesAgg._sum.amount || 0;
        const debitNotes = debitNotesAgg._sum.amount || 0;
        const netPurchases = grossPurchases - debitNotes;

        return NextResponse.json({
            startDate,
            endDate,
            sales: netSales > 0 ? netSales : grossSales, // Net Sales formula from Tally Prime
            grossSales,
            creditNotes,
            netSales,
            purchases: netPurchases > 0 ? netPurchases : grossPurchases,
            receipts: receiptsAgg._sum.amount || 0,
            payments: paymentsAgg._sum.amount || 0,
            outstanding: Math.abs(outstandingAgg._sum.closingBalance || 0),
            cashBank: Math.abs(cashBankAgg._sum.closingBalance || 0),
            receivables: Math.abs(outstandingAgg._sum.closingBalance || 0),
            payables: Math.abs(grossPurchasesAgg._sum.amount || 0),
            recentVouchers,
            activeCompanies,
            syncLogs
        });

    } catch (error) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
