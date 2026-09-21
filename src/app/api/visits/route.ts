export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildDateRangeFilter } from '@/lib/reporting';
import { logAuditAction } from '@/lib/audit';

export async function GET(req: Request) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  const userCompanyId = req.headers.get('x-company-id');
  const { searchParams } = new URL(req.url);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let targetCompanyId = searchParams.get('companyId') || userCompanyId;
    if (role !== 'SUPER_ADMIN') {
      targetCompanyId = userCompanyId;
    }

    if (!targetCompanyId) {
      const firstCompany = await db.company.findFirst({ where: { tallyConnected: true } });
      targetCompanyId = firstCompany?.id || null;
    }

    if (!targetCompanyId) {
      return NextResponse.json({ visits: [] });
    }

    const customerId = searchParams.get('customerId');
    const salesPersonId = searchParams.get('salesPersonId');
    const outcome = searchParams.get('outcome');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const whereClause: any = {
      companyId: targetCompanyId
    };

    if (customerId) whereClause.customerId = customerId;
    if (salesPersonId) whereClause.salesPersonId = salesPersonId;
    if (outcome) whereClause.outcome = outcome;

    const dateFilter = buildDateRangeFilter(startDate, endDate);
    if (dateFilter) {
      whereClause.visitDate = dateFilter;
    }

    const visits = await db.visitLog.findMany({
      where: whereClause,
      include: {
        customer: { select: { id: true, name: true, phone: true, closingBalance: true, creditLimit: true } },
        salesPerson: { select: { id: true, name: true, code: true } }
      },
      orderBy: { visitDate: 'desc' }
    });

    return NextResponse.json({ visits });
  } catch (error: any) {
    console.error('Fetch visits error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  const userCompanyId = req.headers.get('x-company-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const caller = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, companyId: true }
    });

    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized user' }, { status: 401 });
    }

    const body = await req.json();
    const { customerId, salesPersonId, visitDate, purpose, notes, outcome, nextFollowUpDate } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    const customer = await db.ledger.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    let activeCompanyId = caller.companyId || userCompanyId;
    if (caller.role !== 'SUPER_ADMIN' && customer.companyId !== activeCompanyId) {
      return NextResponse.json({ error: 'Forbidden: Tenant mismatch' }, { status: 403 });
    }

    const newVisit = await db.visitLog.create({
      data: {
        companyId: customer.companyId,
        customerId: customer.id,
        salesPersonId: salesPersonId || customer.salesPersonId || null,
        visitDate: visitDate ? new Date(visitDate) : new Date(),
        purpose: purpose || 'General Visit',
        notes: notes || null,
        outcome: outcome || 'PLANNED',
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        createdByUserId: userId
      },
      include: {
        customer: { select: { id: true, name: true } },
        salesPerson: { select: { id: true, name: true } }
      }
    });

    await logAuditAction({
      userId,
      action: 'VISIT_CREATE',
      entity: 'VisitLog',
      entityId: newVisit.id,
      details: `Created customer visit for ${customer.name} (Outcome: ${newVisit.outcome})`
    });

    return NextResponse.json({ success: true, visit: newVisit }, { status: 201 });
  } catch (error: any) {
    console.error('Create visit error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  const userCompanyId = req.headers.get('x-company-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, purpose, notes, outcome, nextFollowUpDate } = body;

    if (!id) {
      return NextResponse.json({ error: 'Visit ID is required' }, { status: 400 });
    }

    const existing = await db.visitLog.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Visit log not found' }, { status: 404 });
    }

    if (role !== 'SUPER_ADMIN' && existing.companyId !== (userCompanyId)) {
      return NextResponse.json({ error: 'Forbidden: Tenant mismatch' }, { status: 403 });
    }

    const updated = await db.visitLog.update({
      where: { id },
      data: {
        purpose: purpose !== undefined ? purpose : existing.purpose,
        notes: notes !== undefined ? notes : existing.notes,
        outcome: outcome !== undefined ? outcome : existing.outcome,
        nextFollowUpDate: nextFollowUpDate !== undefined ? (nextFollowUpDate ? new Date(nextFollowUpDate) : null) : existing.nextFollowUpDate
      },
      include: {
        customer: { select: { id: true, name: true } },
        salesPerson: { select: { id: true, name: true } }
      }
    });

    await logAuditAction({
      userId,
      action: 'VISIT_UPDATE',
      entity: 'VisitLog',
      entityId: updated.id,
      details: `Updated visit log ${updated.id} outcome to ${updated.outcome}`
    });

    return NextResponse.json({ success: true, visit: updated });
  } catch (error: any) {
    console.error('Update visit error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
