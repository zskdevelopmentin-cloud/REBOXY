import { Ledger, Voucher } from '@/types';

export interface Party360Metrics {
  party: Ledger;
  openingBalance: number;
  closingBalance: number;
  totalSales: number;
  totalPurchases: number;
  totalReceipts: number;
  totalPayments: number;
  creditNotes: number;
  debitNotes: number;
  netSales: number;
  netPurchases: number;
  transactionCount: number;
  lastTransactionDate: string | null;
  daysSinceLastTransaction: number | null;
  chronologicalLedger: {
    id: string;
    vNo: string;
    type: string;
    date: string;
    amount: number;
    dr: number;
    cr: number;
    runningBalance: number;
    narration?: string;
  }[];
}

export function calculateParty360(party: Ledger, allVouchers: Voucher[]): Party360Metrics {
  const openingBalance = party.openingBalance || 0;
  const isCustomer = party.type === 'Customer';

  // Filter vouchers belonging to this party
  const partyVouchers = (allVouchers || []).filter(
    v => v.partyId === party.id || (v.partyName && v.partyName.toLowerCase() === party.name.toLowerCase())
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let totalSales = 0;
  let totalPurchases = 0;
  let totalReceipts = 0;
  let totalPayments = 0;
  let creditNotes = 0;
  let debitNotes = 0;

  let currentBalance = openingBalance;

  const chronologicalLedger = partyVouchers.map(v => {
    let dr = 0;
    let cr = 0;
    const typeLower = (v.type || '').toLowerCase();

    if (typeLower.includes('sales')) {
      totalSales += v.amount;
      dr = v.amount;
    } else if (typeLower.includes('credit note') || typeLower.includes('sales return')) {
      creditNotes += v.amount;
      cr = v.amount;
    } else if (typeLower.includes('purchase')) {
      totalPurchases += v.amount;
      cr = v.amount;
    } else if (typeLower.includes('debit note') || typeLower.includes('purchase return')) {
      debitNotes += v.amount;
      dr = v.amount;
    } else if (typeLower.includes('receipt')) {
      totalReceipts += v.amount;
      cr = v.amount;
    } else if (typeLower.includes('payment')) {
      totalPayments += v.amount;
      dr = v.amount;
    } else {
      if (isCustomer) dr = v.amount;
      else cr = v.amount;
    }

    if (isCustomer) {
      currentBalance += (dr - cr);
    } else {
      currentBalance += (cr - dr);
    }

    return {
      id: v.id,
      vNo: v.vNo || 'VCH',
      type: v.type,
      date: v.date,
      amount: v.amount,
      dr,
      cr,
      runningBalance: currentBalance,
      narration: (v as any).narration
    };
  });

  const lastVoucher = partyVouchers.length > 0 ? partyVouchers[partyVouchers.length - 1] : null;
  const lastTransactionDate = lastVoucher ? lastVoucher.date : null;
  const now = new Date().getTime();
  const daysSinceLastTransaction = lastTransactionDate 
    ? Math.max(0, Math.floor((now - new Date(lastTransactionDate).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return {
    party,
    openingBalance,
    closingBalance: party.closingBalance || currentBalance,
    totalSales,
    totalPurchases,
    totalReceipts,
    totalPayments,
    creditNotes,
    debitNotes,
    netSales: totalSales - creditNotes,
    netPurchases: totalPurchases - debitNotes,
    transactionCount: partyVouchers.length,
    lastTransactionDate,
    daysSinceLastTransaction,
    chronologicalLedger
  };
}
