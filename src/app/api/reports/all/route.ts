export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
    const userId = req.headers.get('x-user-id');
    const headerCompanyId = req.headers.get('x-company-id');

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, companyId: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized: User record not found' }, { status: 401 });
        }

        let targetCompanyId: string | null = null;
        if (user.role === 'SUPER_ADMIN') {
            targetCompanyId = headerCompanyId || user.companyId || null;
            if (!targetCompanyId) {
                const firstCompany = await db.company.findFirst({ where: { tallyConnected: true } });
                targetCompanyId = firstCompany?.id || null;
            }
        } else {
            targetCompanyId = user.companyId || null;
        }

        if (!targetCompanyId) {
            return NextResponse.json({ error: 'No active company assigned' }, { status: 400 });
        }

        const companyFilter = { companyId: targetCompanyId };

        const [ledgers, vouchers, stock, company] = await Promise.all([
            db.ledger.findMany({
                where: companyFilter,
                orderBy: { name: 'asc' }
            }),
            db.voucher.findMany({
                where: companyFilter,
                orderBy: { date: 'desc' },
                include: { party: true, items: { include: { item: true } } }
            }),
            db.inventoryItem.findMany({
                where: companyFilter,
                orderBy: { name: 'asc' }
            }),
            targetCompanyId 
                ? db.company.findUnique({ where: { id: targetCompanyId } })
                : db.company.findFirst({ where: { tallyConnected: true } })
        ]);

        // Map item quantities in/out from vouchers
        const itemMovement: Record<string, { inQty: number; outQty: number }> = {};
        vouchers.forEach(v => {
            if (v.status === 'CANCELLED') return;
            const t = (v.type || '').toLowerCase();
            const isPurchase = t.includes('purchase') || t.includes('debit note');
            const isSales = t.includes('sales') || t.includes('credit note');

            (v.items || []).forEach(vi => {
                const key = vi.itemId;
                if (!key) return;
                if (!itemMovement[key]) {
                    itemMovement[key] = { inQty: 0, outQty: 0 };
                }
                if (isPurchase) {
                    itemMovement[key].inQty += (vi.quantity || 0);
                } else if (isSales) {
                    itemMovement[key].outQty += (vi.quantity || 0);
                }
            });
        });

        return NextResponse.json({
            company: company || { name: 'SUPREME FOOTCARE' },
            ledgers: ledgers.map(l => ({
                id: l.id,
                name: l.name,
                group: l.group,
                openingBalance: l.openingBalance || 0,
                closingBalance: l.closingBalance || 0,
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
                partyId: v.partyId || undefined,
                amount: v.amount,
                status: v.status,
                items: (v.items || []).map(vi => ({
                    id: vi.id,
                    itemId: vi.itemId || vi.id,
                    description: vi.description || vi.item?.name || '',
                    qty: vi.quantity,
                    quantity: vi.quantity,
                    rate: vi.rate,
                    amount: vi.amount,
                    total: vi.amount
                }))
            })),
            stock: stock.map(s => {
                const mov = itemMovement[s.id] || { inQty: 0, outQty: 0 };
                const openingQty = s.openingStock || 0;
                const calcStock = openingQty + mov.inQty - mov.outQty;
                const currentStock = s.currentStock !== 0 ? s.currentStock : calcStock;

                return {
                    id: s.id,
                    name: s.name,
                    category: s.category || 'General',
                    unit: s.unit || 'PCS',
                    openingQty,
                    inQty: mov.inQty,
                    outQty: mov.outQty,
                    currentStock,
                    salesPrice: s.salesPrice || 0,
                    purchasePrice: s.purchasePrice || 0,
                    rate: s.salesPrice || s.purchasePrice || 0
                };
            })
        });
    } catch (error) {
        console.error('Reports All API Error:', error);
        return NextResponse.json({ error: 'Failed to fetch report data' }, { status: 500 });
    }
}
