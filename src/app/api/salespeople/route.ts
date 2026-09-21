export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
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
      return NextResponse.json({ salespeople: [] });
    }

    const salespeople = await db.salesPerson.findMany({
      where: { companyId: targetCompanyId },
      include: {
        assignedCustomers: {
          select: {
            id: true,
            name: true,
            group: true,
            closingBalance: true,
            type: true,
            creditLimit: true,
            creditDays: true
          }
        },
        _count: {
          select: { visitLogs: true, paymentReminders: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Calculate Salesperson Performance Metrics
    const allVouchers = await db.voucher.findMany({
      where: { companyId: targetCompanyId, status: { not: 'CANCELLED' } }
    });

    const salespeopleWithMetrics = salespeople.map(sp => {
      const assignedCustomerIds = new Set(sp.assignedCustomers.map(c => c.id));
      
      let grossSales = 0;
      let creditNotes = 0;
      let invoiceCount = 0;
      let totalReceivables = 0;

      sp.assignedCustomers.forEach(c => {
        totalReceivables += (c.closingBalance || 0);
      });

      allVouchers.forEach(v => {
        if (v.partyId && assignedCustomerIds.has(v.partyId)) {
          const typeLower = (v.type || '').trim().toLowerCase();
          if (typeLower === 'sales') {
            grossSales += v.amount;
            invoiceCount++;
          } else if (typeLower === 'credit note' || typeLower === 'sales return') {
            creditNotes += v.amount;
          }
        }
      });

      const netSales = grossSales - creditNotes;
      const avgInvoiceValue = invoiceCount > 0 ? grossSales / invoiceCount : 0;

      return {
        ...sp,
        metrics: {
          assignedCustomerCount: sp.assignedCustomers.length,
          grossSales,
          creditNotes,
          netSales,
          invoiceCount,
          avgInvoiceValue,
          totalReceivables,
          visitCount: sp._count.visitLogs,
          reminderCount: sp._count.paymentReminders
        }
      };
    });

    return NextResponse.json({ salespeople: salespeopleWithMetrics });
  } catch (error: any) {
    console.error('Fetch salespeople error:', error);
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
      return NextResponse.json({ error: 'Unauthorized: User record not found' }, { status: 401 });
    }

    if (caller.role !== 'SUPER_ADMIN' && caller.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Admin authorization required' }, { status: 403 });
    }

    const body = await req.json();
    const { name, phone, email, code, status, companyId: targetCompany } = body;

    if (!name) {
      return NextResponse.json({ error: 'Salesperson name is required' }, { status: 400 });
    }

    let activeCompanyId = caller.companyId || userCompanyId;
    if (caller.role === 'SUPER_ADMIN' && targetCompany) {
      activeCompanyId = targetCompany;
    }

    if (!activeCompanyId) {
      return NextResponse.json({ error: 'No active company assigned' }, { status: 400 });
    }

    const newSalesperson = await db.salesPerson.create({
      data: {
        companyId: activeCompanyId,
        name: name.trim(),
        phone: phone ? phone.trim() : null,
        email: email ? email.trim() : null,
        code: code ? code.trim() : null,
        status: status || 'ACTIVE'
      }
    });

    await logAuditAction({
      userId,
      action: 'SALESPERSON_CREATE',
      entity: 'SalesPerson',
      entityId: newSalesperson.id,
      details: `Created salesperson ${newSalesperson.name} (${newSalesperson.code || 'No Code'})`
    });

    return NextResponse.json({ success: true, salesperson: newSalesperson }, { status: 201 });
  } catch (error: any) {
    console.error('Create salesperson error:', error);
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
    const caller = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, companyId: true }
    });

    if (!caller || (caller.role !== 'SUPER_ADMIN' && caller.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin authorization required' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, phone, email, code, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'Salesperson ID is required' }, { status: 400 });
    }

    const existing = await db.salesPerson.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Salesperson not found' }, { status: 404 });
    }

    if (caller.role !== 'SUPER_ADMIN' && existing.companyId !== (caller.companyId || userCompanyId)) {
      return NextResponse.json({ error: 'Forbidden: Tenant mismatch' }, { status: 403 });
    }

    const updated = await db.salesPerson.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : existing.name,
        phone: phone !== undefined ? (phone ? phone.trim() : null) : existing.phone,
        email: email !== undefined ? (email ? email.trim() : null) : existing.email,
        code: code !== undefined ? (code ? code.trim() : null) : existing.code,
        status: status !== undefined ? status : existing.status
      }
    });

    await logAuditAction({
      userId,
      action: 'SALESPERSON_UPDATE',
      entity: 'SalesPerson',
      entityId: updated.id,
      details: `Updated salesperson ${updated.name} (Status: ${updated.status})`
    });

    return NextResponse.json({ success: true, salesperson: updated });
  } catch (error: any) {
    console.error('Update salesperson error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
