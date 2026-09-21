export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logAuditAction } from '@/lib/audit';

const VALID_VOUCHER_TYPES = [
  'Sales',
  'Purchase',
  'Receipt',
  'Payment',
  'Sales Order',
  'Purchase Order',
  'Credit Note',
  'Debit Note',
  'Journal',
  'Contra'
];

export async function POST(req: Request) {
  const userId = req.headers.get('x-user-id');
  const role = req.headers.get('x-user-role');
  const userCompanyId = req.headers.get('x-company-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify user in database to ensure server-side identity & authority
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, companyId: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized: User record not found' }, { status: 401 });
    }

    const body = await req.json();
    const { type, date, partyId, partyName, narration, items } = body;

    // Determine target company with strict server-side tenant isolation
    let targetCompanyId: string | null = null;

    if (user.role === 'SUPER_ADMIN') {
      targetCompanyId = body.companyId || user.companyId || userCompanyId;
      if (!targetCompanyId) {
        const firstCompany = await db.company.findFirst({ where: { tallyConnected: true } });
        targetCompanyId = firstCompany?.id || null;
      }
    } else {
      // Non-super-admin users MUST be constrained to their own assigned companyId
      targetCompanyId = user.companyId || userCompanyId;
      
      // If client attempts to target a different company, reject request
      if (body.companyId && targetCompanyId && body.companyId !== targetCompanyId) {
        return NextResponse.json({ error: 'Forbidden: Cannot create vouchers for another company' }, { status: 403 });
      }
    }

    if (!targetCompanyId) {
      return NextResponse.json({ error: 'No active company assigned to user' }, { status: 400 });
    }

    // Validate Voucher Type
    if (!type || typeof type !== 'string') {
      return NextResponse.json({ error: 'Voucher type is required' }, { status: 400 });
    }

    const matchedType = VALID_VOUCHER_TYPES.find(
      t => t.toLowerCase() === type.toLowerCase()
    ) || type;

    // Validate Party Ledger if provided
    let verifiedPartyId: string | null = null;
    if (partyId) {
      const partyLedger = await db.ledger.findFirst({
        where: { id: partyId, companyId: targetCompanyId }
      });
      if (partyLedger) {
        verifiedPartyId = partyLedger.id;
      }
    }

    if (!verifiedPartyId && partyName) {
      const partyLedger = await db.ledger.findFirst({
        where: { name: partyName, companyId: targetCompanyId }
      });
      if (partyLedger) {
        verifiedPartyId = partyLedger.id;
      }
    }

    // Process Line Items and Calculate Totals Server-Side
    let calculatedTotal = 0;
    const processedItems: { itemId?: string; description?: string; quantity: number; rate: number; amount: number }[] = [];

    if (items && Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const qty = Math.abs(parseFloat(item.quantity || item.qty) || 1);
        const rate = Math.abs(parseFloat(item.rate) || 0);
        const itemAmount = qty * rate;

        let itemId: string | undefined = undefined;
        if (item.itemId) {
          const invItem = await db.inventoryItem.findFirst({
            where: { id: item.itemId, companyId: targetCompanyId }
          });
          if (invItem) {
            itemId = invItem.id;
          }
        }

        calculatedTotal += itemAmount;
        processedItems.push({
          itemId,
          description: item.description || item.name || (itemId ? undefined : 'Line Item'),
          quantity: qty,
          rate,
          amount: itemAmount
        });
      }
    } else {
      calculatedTotal = Math.abs(parseFloat(body.amount) || 0);
    }

    // Auto-generate Voucher Number if missing
    const prefixMap: Record<string, string> = {
      'Sales': 'SAL',
      'Purchase': 'PUR',
      'Receipt': 'REC',
      'Payment': 'PAY',
      'Sales Order': 'SO',
      'Purchase Order': 'PO',
      'Credit Note': 'CN',
      'Debit Note': 'DN'
    };
    const prefix = prefixMap[matchedType] || 'VCH';
    const vNo = body.vNo || `${prefix}/${Date.now().toString().slice(-6)}`;

    const vDate = date ? new Date(date) : new Date();

    // Atomic Execution using Prisma Transaction
    const newVoucher = await db.$transaction(async (tx) => {
      const createdVoucher = await tx.voucher.create({
        data: {
          companyId: targetCompanyId!,
          vNo,
          type: matchedType,
          date: vDate,
          partyId: verifiedPartyId,
          amount: calculatedTotal,
          narration: narration || `Created via REBOXY Web Client by user ${userId}`,
          status: 'COMPLETED'
        },
        include: {
          party: true
        }
      });

      if (processedItems.length > 0) {
        for (const pi of processedItems) {
          await tx.voucherItem.create({
            data: {
              voucherId: createdVoucher.id,
              itemId: pi.itemId,
              description: pi.description,
              quantity: pi.quantity,
              rate: pi.rate,
              amount: pi.amount
            }
          });
        }
      }

      return createdVoucher;
    });

    await logAuditAction({
      userId,
      action: 'VOUCHER_CREATE',
      entity: 'Voucher',
      entityId: newVoucher.id,
      details: `Created ${newVoucher.type} voucher #${newVoucher.vNo} for ₹${newVoucher.amount.toLocaleString()}`
    });

    return NextResponse.json({ success: true, voucher: newVoucher }, { status: 201 });
  } catch (error: any) {
    console.error('Voucher Creation Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
