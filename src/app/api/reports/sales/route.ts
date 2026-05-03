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

    try {
        let whereClause: any = { type: 'Sales' };
        
        // Enforce role company isolation unless SUPER_ADMIN
        if (role !== 'SUPER_ADMIN') {
            whereClause.companyId = userCompanyId;
        } else if (requestedCompanyId) {
            whereClause.companyId = requestedCompanyId;
        }

        if (startDate && endDate) {
            whereClause.date = {
                gte: new Date(startDate),
                lte: new Date(endDate)
            };
        }

        const sales = await db.voucher.findMany({
            where: whereClause,
            include: {
                party: true,
                items: { include: { item: true } }
            },
            orderBy: { date: 'desc' }
        });

        return NextResponse.json({ sales });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
