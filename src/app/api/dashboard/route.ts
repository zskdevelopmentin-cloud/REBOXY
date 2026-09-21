export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCompanyFinancialSummary, buildDateRangeFilter } from '@/lib/reporting';

export async function GET(req: Request) {
    const companyId = req.headers.get('x-company-id');
    const role = req.headers.get('x-user-role');
    const userId = req.headers.get('x-user-id');
    const { searchParams } = new URL(req.url);

    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        let activeCompanyId: string | null = null;
        if (role === 'SUPER_ADMIN') {
            activeCompanyId = searchParams.get('companyId') || companyId || null;
            if (!activeCompanyId) {
                const firstCompany = await db.company.findFirst({ where: { tallyConnected: true } });
                activeCompanyId = firstCompany?.id || null;
            }
        } else {
            activeCompanyId = companyId;
        }

        if (!activeCompanyId) {
            return NextResponse.json({ error: 'No active company assigned' }, { status: 400 });
        }

        const summary = await getCompanyFinancialSummary(activeCompanyId, { startDate, endDate });
        const dateFilter = buildDateRangeFilter(startDate, endDate);

        const voucherWhere: any = {
            companyId: activeCompanyId,
            status: { not: 'CANCELLED' }
        };
        if (dateFilter) {
            voucherWhere.date = dateFilter;
        }

        const [recentVouchers, activeCompanies, syncLogs] = await Promise.all([
            db.voucher.findMany({
                where: voucherWhere,
                orderBy: { date: 'desc' },
                take: 15,
                include: { party: true }
            }),
            db.company.count(),
            db.syncLog.findMany({
                where: { companyId: activeCompanyId },
                orderBy: { startTime: 'desc' },
                take: 5
            })
        ]);

        return NextResponse.json({
            startDate,
            endDate,
            sales: summary.netSales,
            grossSales: summary.grossSales,
            creditNotes: summary.creditNotes,
            netSales: summary.netSales,
            purchases: summary.netPurchases,
            grossPurchases: summary.grossPurchases,
            debitNotes: summary.debitNotes,
            netPurchases: summary.netPurchases,
            receipts: summary.receipts,
            payments: summary.payments,
            operatingExpenses: summary.operatingExpenses,
            grossProfit: summary.grossProfit,
            netProfit: summary.netProfit,
            outstanding: Math.abs(summary.receivables),
            receivables: Math.abs(summary.receivables),
            payables: Math.abs(summary.payables),
            cashBank: Math.abs(summary.cashBankTotal),
            cashBalance: summary.cashBalance,
            bankBalance: summary.bankBalance,
            stockValuation: summary.stockValuation,
            recentVouchers,
            activeCompanies,
            syncLogs
        });
    } catch (error) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
