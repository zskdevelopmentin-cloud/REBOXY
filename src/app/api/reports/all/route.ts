export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
    try {
        const [ledgers, vouchers, stock, company] = await Promise.all([
            db.ledger.findMany({
                orderBy: { name: 'asc' }
            }),
            db.voucher.findMany({
                orderBy: { date: 'desc' },
                include: { party: true }
            }),
            db.inventoryItem.findMany({
                orderBy: { name: 'asc' }
            }),
            db.company.findFirst({
                where: { tallyConnected: true }
            })
        ]);

        return NextResponse.json({
            company: company || { name: 'SUPREME FOOTCARE' },
            ledgers: ledgers.map(l => ({
                id: l.id,
                name: l.name,
                group: l.group,
                closingBalance: l.closingBalance,
                type: l.type,
                phone: l.phone,
                email: l.email
            })),
            vouchers: vouchers.map(v => ({
                id: v.id,
                vNo: v.vNo,
                type: v.type,
                date: v.date.toISOString(),
                partyName: v.party?.name || 'Cash',
                partyId: v.partyId,
                amount: v.amount,
                status: v.status
            })),
            stock: stock.map(s => ({
                id: s.id,
                name: s.name,
                category: s.category,
                unit: s.unit,
                currentStock: s.currentStock,
                salesPrice: s.salesPrice
            }))
        });
    } catch (error) {
        console.error('Reports All API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
    }
}
