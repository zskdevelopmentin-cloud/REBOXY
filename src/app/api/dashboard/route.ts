import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
    const companyId = req.headers.get('x-company-id');
    const role = req.headers.get('x-user-role');

    try {
        let whereClause = {};
        if (role !== 'SUPER_ADMIN' && companyId) {
            whereClause = { companyId };
        }

        const [
            totalSales,
            totalPurchases,
            receivables,
            payables,
            stockValue,
            recentVouchers,
            activeCompanies,
            syncLogs
        ] = await Promise.all([
            db.voucher.aggregate({
                _sum: { amount: true },
                where: { ...whereClause, type: 'Sales', status: 'COMPLETED' }
            }),
            db.voucher.aggregate({
                _sum: { amount: true },
                where: { ...whereClause, type: 'Purchase', status: 'COMPLETED' }
            }),
            db.ledger.aggregate({
                _sum: { closingBalance: true },
                where: { ...whereClause, group: 'Sundry Debtors' }
            }),
            db.ledger.aggregate({
                _sum: { closingBalance: true },
                where: { ...whereClause, group: 'Sundry Creditors' }
            }),
            db.inventoryItem.aggregate({
                _sum: { currentStock: true }, // Ideally currentStock * purchasePrice, but Prisma aggregate doesn't support multiplication directly. We can fetch and map or use raw SQL. For now, we return item counts.
                where: { ...whereClause }
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

        return NextResponse.json({
            sales: totalSales._sum.amount || 0,
            purchases: totalPurchases._sum.amount || 0,
            receivables: receivables._sum.closingBalance || 0,
            payables: payables._sum.closingBalance || 0,
            stockItemsCount: stockValue._sum.currentStock || 0,
            recentVouchers,
            activeCompanies,
            syncLogs
        });

    } catch (error) {
        console.error('Dashboard API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
