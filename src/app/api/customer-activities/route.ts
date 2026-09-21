export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { calculateParty360 } from '@/utils/party360';

export async function GET(req: Request) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  const userCompanyId = req.headers.get('x-company-id');
  const { searchParams } = new URL(req.url);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const customerId = searchParams.get('customerId');
  if (!customerId) {
    return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
  }

  try {
    const customer = await db.ledger.findUnique({
      where: { id: customerId },
      include: {
        salesPerson: { select: { id: true, name: true, phone: true, email: true, code: true } }
      }
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    if (role !== 'SUPER_ADMIN' && customer.companyId !== userCompanyId) {
      return NextResponse.json({ error: 'Forbidden: Tenant mismatch' }, { status: 403 });
    }

    const [vouchers, visitLogs, paymentReminders] = await Promise.all([
      db.voucher.findMany({
        where: { companyId: customer.companyId, partyId: customer.id },
        orderBy: { date: 'desc' },
        include: { items: true }
      }),
      db.visitLog.findMany({
        where: { companyId: customer.companyId, customerId: customer.id },
        orderBy: { visitDate: 'desc' },
        include: { salesPerson: { select: { name: true } } }
      }),
      db.paymentReminder.findMany({
        where: { companyId: customer.companyId, customerId: customer.id },
        orderBy: { reminderDate: 'desc' },
        include: { salesPerson: { select: { name: true } } }
      })
    ]);

    const party360 = calculateParty360(customer as any, vouchers as any);

    // Build Chronological Timeline Events
    const timeline: Array<{
      id: string;
      category: 'FINANCIAL' | 'VISIT' | 'REMINDER';
      type: string;
      date: string;
      title: string;
      subtitle: string;
      amount?: number;
      status?: string;
      details?: any;
    }> = [];

    // 1. Add Financial Vouchers
    party360.chronologicalLedger.forEach(v => {
      timeline.push({
        id: `vch-${v.id}`,
        category: 'FINANCIAL',
        type: v.type,
        date: v.date,
        title: `${v.type} #${v.vNo}`,
        subtitle: `Amount: ₹${v.amount.toLocaleString()} (Bal: ₹${v.runningBalance.toLocaleString()})`,
        amount: v.amount,
        status: 'COMPLETED',
        details: v
      });
    });

    // 2. Add Visit Logs
    visitLogs.forEach(vl => {
      timeline.push({
        id: `visit-${vl.id}`,
        category: 'VISIT',
        type: 'Customer Visit',
        date: vl.visitDate.toISOString(),
        title: `Visit: ${vl.purpose || 'General Contact'}`,
        subtitle: `By ${vl.salesPerson?.name || 'Sales Staff'} • Outcome: ${vl.outcome}${vl.notes ? ` • "${vl.notes}"` : ''}`,
        status: vl.outcome,
        details: vl
      });
    });

    // 3. Add Payment Reminders
    paymentReminders.forEach(pr => {
      timeline.push({
        id: `reminder-${pr.id}`,
        category: 'REMINDER',
        type: 'Payment Reminder',
        date: pr.reminderDate.toISOString(),
        title: `Reminder: ₹${(pr.amount || customer.closingBalance || 0).toLocaleString()}`,
        subtitle: `${pr.note || 'Follow-up for pending payment'}${pr.salesPerson?.name ? ` (Assigned: ${pr.salesPerson.name})` : ''}`,
        amount: pr.amount || customer.closingBalance || 0,
        status: pr.status,
        details: pr
      });
    });

    // Sort Timeline by Date descending
    timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate Credit Status
    const creditLimit = customer.creditLimit || null;
    const closingBal = customer.closingBalance || 0;
    let creditStatus = 'Within Limit';

    if (creditLimit && creditLimit > 0) {
      if (closingBal > creditLimit) {
        creditStatus = 'Over Limit';
      } else if (closingBal > creditLimit * 0.85) {
        creditStatus = 'Near Limit';
      }
    }

    return NextResponse.json({
      customer: {
        id: customer.id,
        name: customer.name,
        group: customer.group,
        type: customer.type,
        phone: customer.phone,
        email: customer.email,
        address: customer.address,
        gstin: customer.gstin,
        closingBalance: customer.closingBalance,
        creditLimit: customer.creditLimit,
        creditDays: customer.creditDays,
        creditStatus,
        salesPerson: customer.salesPerson
      },
      party360Summary: party360,
      timeline,
      visitCount: visitLogs.length,
      reminderCount: paymentReminders.length
    });
  } catch (error: any) {
    console.error('Customer activities API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
