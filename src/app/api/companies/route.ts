export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logAuditAction } from '@/lib/audit';

export async function GET(req: Request) {
    const userId = req.headers.get('x-user-id');
    const headerCompanyId = req.headers.get('x-company-id');

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const caller = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, companyId: true }
        });

        if (!caller) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let companies;
        if (caller.role === 'SUPER_ADMIN') {
            companies = await db.company.findMany({
                orderBy: { name: 'asc' }
            });
        } else {
            const targetCompanyId = caller.companyId || headerCompanyId || '';
            companies = await db.company.findMany({
                where: { id: targetCompanyId },
                orderBy: { name: 'asc' }
            });
        }
        
        return NextResponse.json({ companies });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const userId = req.headers.get('x-user-id');

    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const caller = await db.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, companyId: true }
        });

        if (!caller || (caller.role !== 'SUPER_ADMIN' && caller.role !== 'ADMIN')) {
            return NextResponse.json({ error: 'Forbidden: Admin access required to update company details' }, { status: 403 });
        }

        const body = await req.json();
        const { id, name, gstin, address, financialYear } = body;

        let targetCompanyId = caller.companyId;
        if (caller.role === 'SUPER_ADMIN' && id) {
            targetCompanyId = id;
        }

        if (!targetCompanyId) {
            return NextResponse.json({ error: 'Company ID is required' }, { status: 400 });
        }

        if (caller.role !== 'SUPER_ADMIN' && targetCompanyId !== caller.companyId) {
            return NextResponse.json({ error: 'Forbidden: Cannot edit another company' }, { status: 403 });
        }

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (gstin !== undefined) updateData.gstin = gstin;
        if (address !== undefined) updateData.address = address;
        if (financialYear !== undefined) updateData.financialYear = financialYear;

        const updatedCompany = await db.company.update({
            where: { id: targetCompanyId },
            data: updateData
        });

        await logAuditAction({
            userId,
            action: 'COMPANY_UPDATE',
            entity: 'Company',
            entityId: updatedCompany.id,
            details: `Updated company profile: ${updatedCompany.name}`
        });

        return NextResponse.json({ success: true, company: updatedCompany });
    } catch (error: any) {
        console.error('Update company error:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
