export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
    const role = req.headers.get('x-user-role');
    const userCompanyId = req.headers.get('x-company-id');

    try {
        let companies;
        if (role === 'SUPER_ADMIN') {
            companies = await db.company.findMany({
                orderBy: { name: 'asc' }
            });
        } else {
            companies = await db.company.findMany({
                where: { id: userCompanyId || '' },
                orderBy: { name: 'asc' }
            });
        }
        
        return NextResponse.json({ companies });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
