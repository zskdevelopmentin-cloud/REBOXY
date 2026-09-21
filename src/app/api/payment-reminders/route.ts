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
      return NextResponse.json({ reminders: [] });
    }

    const customerId = searchParams.get('customerId');
    const salesPersonId = searchParams.get('salesPersonId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const whereClause: any = {
      companyId: targetCompanyId
    };

    if (customerId) whereClause.customerId = customerId;
    if (salesPersonId) whereClause.salesPersonId = salesPersonId;
    if (status) whereClause.status = status;

    const dateFilter = buildDateRangeFilter(startDate, endDate);
    if (dateFilter) {
      whereClause.reminderDate = dateFilter;
    }

    const reminders = await db.paymentReminder.findMany({
      where: whereClause,
      include: {
        customer: { select: { id: true, name: true, phone: true, closingBalance: true, creditLimit: true, creditDays: true } },
        salesPerson: { select: { id: true, name: true, code: true } }
      },
      orderBy: { reminderDate: 'asc' }
    });

    return NextResponse.json({ reminders });
  } catch (error: any) {
    console.error('Fetch reminders error:', error);
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
    const { customerId, salesPersonId, amount, reminderDate, note, status } = body;

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

    const newReminder = await db.paymentReminder.create({
      data: {
        companyId: customer.companyId,
        customerId: customer.id,
        salesPersonId: salesPersonId || customer.salesPersonId || null,
        amount: amount !== undefined && amount !== null ? parseFloat(String(amount)) : customer.closingBalance,
        reminderDate: reminderDate ? new Date(reminderDate) : new Date(),
        note: note || null,
        status: status || 'PENDING',
        createdByUserId: userId
      },
      include: {
        customer: { select: { id: true, name: true } },
        salesPerson: { select: { id: true, name: true } }
      }
    });

    await logAuditAction({
      userId,
      action: 'REMINDER_CREATE',
      entity: 'PaymentReminder',
      entityId: newReminder.id,
      details: `Created payment reminder for ${customer.name} (Amount: ₹${newReminder.amount || 0})`
    });

    return NextResponse.json({ success: true, reminder: newReminder }, { status: 201 });
  } catch (error: any) {
    console.error('Create reminder error:', error);
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
    const { id, note, status, reminderDate, amount } = body;

    if (!id) {
      return NextResponse.json({ error: 'Reminder ID is required' }, { status: 400 });
    }

    const existing = await db.paymentReminder.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Payment reminder not found' }, { status: 404 });
    }

    if (role !== 'SUPER_ADMIN' && existing.companyId !== userCompanyId) {
      return NextResponse.json({ error: 'Forbidden: Tenant mismatch' }, { status: 403 });
    }

    const updated = await db.paymentReminder.update({
      where: { id },
      data: {
        note: note !== undefined ? note : existing.note,
        status: status !== undefined ? status : existing.status,
        reminderDate: reminderDate ? new Date(reminderDate) : existing.reminderDate,
        amount: amount !== undefined ? parseFloat(String(amount)) : existing.amount
      },
      include: {
        customer: { select: { id: true, name: true } },
        salesPerson: { select: { id: true, name: true } }
      }
    });

    await logAuditAction({
      userId,
      action: 'REMINDER_UPDATE',
      entity: 'PaymentReminder',
      entityId: updated.id,
      details: `Updated payment reminder ${updated.id} status to ${updated.status}`
    });

    return NextResponse.json({ success: true, reminder: updated });
  } catch (error: any) {
    console.error('Update reminder error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
