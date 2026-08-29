export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
    const role = req.headers.get('x-user-role');
    const userCompanyId = req.headers.get('x-company-id');
    const { searchParams } = new URL(req.url);
    
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const requestedCompanyId = searchParams.get('companyId');
    const groupBy = searchParams.get('groupBy') || 'ledger';
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const sort = searchParams.get('sort') || 'highest';
    const ledgerId = searchParams.get('ledgerId');
    const voucherId = searchParams.get('voucherId');

    try {
        let activeCompanyId = requestedCompanyId;
        if (role !== 'SUPER_ADMIN' && userCompanyId) {
            activeCompanyId = userCompanyId;
        }

        if (!activeCompanyId) {
            const firstCompany = await db.company.findFirst({ where: { tallyConnected: true } });
            if (firstCompany) activeCompanyId = firstCompany.id;
        }

        // Single voucher detail fetch if voucherId is provided
        if (voucherId) {
            const voucherDetail = await db.voucher.findUnique({
                where: { id: voucherId },
                include: {
                    party: true,
                    ledger: true,
                    items: { include: { item: true } }
                }
            });
            return NextResponse.json({ voucher: voucherDetail });
        }

        let whereClause: any = {
            companyId: activeCompanyId || undefined,
            OR: [
                { type: { contains: 'Sales', mode: 'insensitive' } },
                { type: { contains: 'Credit Note', mode: 'insensitive' } }
            ]
        };

        if (startDate && endDate) {
            whereClause.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        if (ledgerId) {
            whereClause.partyId = ledgerId;
        }

        // Fetch all matching vouchers
        const vouchers = await db.voucher.findMany({
            where: whereClause,
            include: {
                party: true,
                ledger: true,
                items: { include: { item: true } }
            },
            orderBy: { date: 'desc' }
        });

        // Compute Reconciled Summary Totals
        let grossSales = 0;
        let creditNotes = 0;
        let voucherCount = vouchers.length;

        vouchers.forEach(v => {
            const isReturn = v.type?.toLowerCase().includes('credit note') || v.type?.toLowerCase().includes('return');
            if (isReturn) {
                creditNotes += v.amount;
            } else {
                grossSales += v.amount;
            }
        });

        const netSales = grossSales - creditNotes;

        // Unsupported Tally dimensions check
        const unsupportedDimensions = ['costCenter', 'costCategory', 'salesperson'];
        if (unsupportedDimensions.includes(groupBy)) {
            return NextResponse.json({
                summary: { grossSales, creditNotes, netSales, voucherCount },
                groupedData: [],
                isSupported: false,
                message: `${groupBy.charAt(0).toUpperCase() + groupBy.slice(1)} tracking is not enabled in current Tally Prime export configuration.`
            });
        }

        // Multi-dimensional Group By Aggregation
        const groupMap = new Map<string, {
            id: string;
            name: string;
            type?: string;
            vNo?: string;
            date?: string;
            partyName?: string;
            grossSales: number;
            creditNotes: number;
            netSales: number;
            quantity: number;
            voucherCount: number;
        }>();

        vouchers.forEach(v => {
            const isReturn = v.type?.toLowerCase().includes('credit note') || v.type?.toLowerCase().includes('return');

            if (groupBy === 'voucherType') {
                const key = v.type || 'Sales';
                const existing = groupMap.get(key) || {
                    id: key,
                    name: key,
                    type: key,
                    grossSales: 0,
                    creditNotes: 0,
                    netSales: 0,
                    quantity: 0,
                    voucherCount: 0
                };
                if (isReturn) existing.creditNotes += v.amount;
                else existing.grossSales += v.amount;
                existing.netSales = existing.grossSales - existing.creditNotes;
                existing.voucherCount++;
                groupMap.set(key, existing);
            } else if (groupBy === 'bills' || groupBy === 'voucher') {
                const key = v.id;
                const name = `${v.vNo} - ${v.party?.name || 'Cash'}`;
                const existing = groupMap.get(key) || {
                    id: key,
                    name,
                    vNo: v.vNo,
                    date: v.date.toISOString(),
                    partyName: v.party?.name || 'Cash',
                    type: v.type,
                    grossSales: 0,
                    creditNotes: 0,
                    netSales: 0,
                    quantity: 0,
                    voucherCount: 1
                };
                if (isReturn) existing.creditNotes += v.amount;
                else existing.grossSales += v.amount;
                existing.netSales = existing.grossSales - existing.creditNotes;
                groupMap.set(key, existing);
            } else if (groupBy === 'item' || groupBy === 'itemGroup' || groupBy === 'itemCategory') {
                if (v.items && v.items.length > 0) {
                    v.items.forEach(vi => {
                        const itemName = vi.item?.name || vi.description || 'General Item';
                        const itemGrp = vi.item?.category || 'General Products';
                        const key = groupBy === 'itemGroup' ? itemGrp : (groupBy === 'itemCategory' ? 'Standard Category' : itemName);
                        const existing = groupMap.get(key) || {
                            id: key,
                            name: key,
                            grossSales: 0,
                            creditNotes: 0,
                            netSales: 0,
                            quantity: 0,
                            voucherCount: 0
                        };
                        if (isReturn) existing.creditNotes += vi.amount;
                        else existing.grossSales += vi.amount;
                        existing.quantity += vi.quantity;
                        existing.netSales = existing.grossSales - existing.creditNotes;
                        existing.voucherCount++;
                        groupMap.set(key, existing);
                    });
                } else {
                    const key = groupBy === 'itemGroup' ? 'General Group' : 'General Sales Items';
                    const existing = groupMap.get(key) || {
                        id: key,
                        name: key,
                        grossSales: 0,
                        creditNotes: 0,
                        netSales: 0,
                        quantity: 0,
                        voucherCount: 0
                    };
                    if (isReturn) existing.creditNotes += v.amount;
                    else existing.grossSales += v.amount;
                    existing.netSales = existing.grossSales - existing.creditNotes;
                    existing.voucherCount++;
                    groupMap.set(key, existing);
                }
            } else if (groupBy === 'date') {
                const dateKey = v.date.toISOString().split('T')[0];
                const existing = groupMap.get(dateKey) || {
                    id: dateKey,
                    name: dateKey,
                    grossSales: 0,
                    creditNotes: 0,
                    netSales: 0,
                    quantity: 0,
                    voucherCount: 0
                };
                if (isReturn) existing.creditNotes += v.amount;
                else existing.grossSales += v.amount;
                existing.netSales = existing.grossSales - existing.creditNotes;
                existing.voucherCount++;
                groupMap.set(dateKey, existing);
            } else if (groupBy === 'month') {
                const dateObj = new Date(v.date);
                const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                const monthName = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase();
                const existing = groupMap.get(monthKey) || {
                    id: monthKey,
                    name: monthName,
                    grossSales: 0,
                    creditNotes: 0,
                    netSales: 0,
                    quantity: 0,
                    voucherCount: 0
                };
                if (isReturn) existing.creditNotes += v.amount;
                else existing.grossSales += v.amount;
                existing.netSales = existing.grossSales - existing.creditNotes;
                existing.voucherCount++;
                groupMap.set(monthKey, existing);
            } else {
                // Default: Group By Ledger / Party
                const partyName = v.party?.name || 'General / Cash Sales';
                const key = v.partyId || partyName;
                const existing = groupMap.get(key) || {
                    id: key,
                    name: partyName,
                    grossSales: 0,
                    creditNotes: 0,
                    netSales: 0,
                    quantity: 0,
                    voucherCount: 0
                };
                if (isReturn) existing.creditNotes += v.amount;
                else existing.grossSales += v.amount;
                existing.netSales = existing.grossSales - existing.creditNotes;
                existing.voucherCount++;
                groupMap.set(key, existing);
            }
        });

        let groupedData = Array.from(groupMap.values());

        // Apply Search Filter
        if (search) {
            groupedData = groupedData.filter(g => 
                g.name.toLowerCase().includes(search) || 
                (g.vNo && g.vNo.toLowerCase().includes(search)) ||
                (g.partyName && g.partyName.toLowerCase().includes(search))
            );
        }

        // Apply Sorting
        if (sort === 'lowest') {
            groupedData.sort((a, b) => a.netSales - b.netSales);
        } else if (sort === 'nameAsc') {
            groupedData.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort === 'nameDesc') {
            groupedData.sort((a, b) => b.name.localeCompare(a.name));
        } else {
            // Default: Highest Net Sales first
            groupedData.sort((a, b) => b.netSales - a.netSales);
        }

        return NextResponse.json({
            isSupported: true,
            summary: {
                grossSales,
                creditNotes,
                netSales,
                voucherCount
            },
            groupedData,
            vouchers: vouchers.map(v => ({
                id: v.id,
                vNo: v.vNo,
                type: v.type,
                date: v.date.toISOString(),
                partyName: v.party?.name || 'Cash',
                partyId: v.partyId,
                amount: v.amount,
                status: v.status
            }))
        });

    } catch (error) {
        console.error('Sales Report API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
