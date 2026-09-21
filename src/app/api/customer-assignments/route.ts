export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logAuditAction } from '@/lib/audit';

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

    if (!caller || (caller.role !== 'SUPER_ADMIN' && caller.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Forbidden: Admin authorization required for customer assignment' }, { status: 403 });
    }

    const body = await req.json();
    const { customerId, salesPersonId, creditLimit, creditDays } = body;

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    // Verify Customer exists and belongs to caller's company
    const customer = await db.ledger.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ error: 'Customer record not found' }, { status: 404 });
    }

    let activeCompanyId = caller.companyId || userCompanyId;
    if (caller.role !== 'SUPER_ADMIN' && customer.companyId !== activeCompanyId) {
      return NextResponse.json({ error: 'Forbidden: Cannot edit customer belonging to another company' }, { status: 403 });
    }

    // If salesPersonId provided, verify SalesPerson exists in same company
    if (salesPersonId) {
      const salesPerson = await db.salesPerson.findUnique({ where: { id: salesPersonId } });
      if (!salesPerson || salesPerson.companyId !== customer.companyId) {
        return NextResponse.json({ error: 'Invalid Salesperson or company mismatch' }, { status: 400 });
      }
    }

    const updateData: any = {};
    if (salesPersonId !== undefined) {
      updateData.salesPersonId = salesPersonId || null;
    }
    if (creditLimit !== undefined) {
      updateData.creditLimit = creditLimit !== null && creditLimit !== '' ? parseFloat(String(creditLimit)) : null;
    }
    if (creditDays !== undefined) {
      updateData.creditDays = creditDays !== null && creditDays !== '' ? parseInt(String(creditDays), 10) : null;
    }

    const updatedCustomer = await db.ledger.update({
      where: { id: customerId },
      data: updateData,
      include: { salesPerson: true }
    });

    // Record historical assignment if salesPersonId changed
    if (salesPersonId && salesPersonId !== customer.salesPersonId) {
      // Mark previous active assignments as HISTORICAL
      await db.customerAssignment.updateMany({
        where: { companyId: customer.companyId, customerId: customer.id, status: 'ACTIVE' },
        data: { status: 'HISTORICAL', unassignedAt: new Date() }
      });

      await db.customerAssignment.create({
        data: {
          companyId: customer.companyId,
          customerId: customer.id,
          salesPersonId: salesPersonId,
          status: 'ACTIVE'
        }
      });

      await logAuditAction({
        userId,
        action: 'CUSTOMER_ASSIGNMENT',
        entity: 'Ledger',
        entityId: customer.id,
        details: `Assigned customer ${customer.name} to salesperson ${updatedCustomer.salesPerson?.name || salesPersonId}`
      });
    }

    if (creditLimit !== undefined || creditDays !== undefined) {
      await logAuditAction({
        userId,
        action: 'CREDIT_TERMS_UPDATE',
        entity: 'Ledger',
        entityId: customer.id,
        details: `Updated credit terms for ${customer.name}: Limit = ₹${updateData.creditLimit ?? 'None'}, Days = ${updateData.creditDays ?? 'None'}`
      });
    }

    return NextResponse.json({ success: true, customer: updatedCustomer });
  } catch (error: any) {
    console.error('Customer assignment error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
