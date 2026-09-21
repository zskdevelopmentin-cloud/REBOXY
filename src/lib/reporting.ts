import { db } from '@/lib/db';

export interface DateFilterOptions {
    startDate?: string | null;
    endDate?: string | null;
}

export function buildDateRangeFilter(startDate?: string | null, endDate?: string | null) {
    if (!startDate && !endDate) return undefined;

    const filter: any = {};
    if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.gte = start;
    }
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.lte = end;
    }
    return filter;
}

export async function getCompanyFinancialSummary(companyId: string, options: DateFilterOptions = {}) {
    const dateFilter = buildDateRangeFilter(options.startDate, options.endDate);

    const voucherWhere: any = {
        companyId,
        status: { not: 'CANCELLED' }
    };
    if (dateFilter) {
        voucherWhere.date = dateFilter;
    }

    const [vouchers, ledgers, inventory] = await Promise.all([
        db.voucher.findMany({
            where: voucherWhere,
            include: { party: true, ledger: true, items: { include: { item: true } } }
        }),
        db.ledger.findMany({
            where: { companyId }
        }),
        db.inventoryItem.findMany({
            where: { companyId }
        })
    ]);

    const ledgerMap = new Map(ledgers.map(l => [l.id, l]));

    let grossSales = 0;
    let creditNotes = 0;
    let grossPurchases = 0;
    let debitNotes = 0;
    let receipts = 0;
    let payments = 0;
    let operatingExpenses = 0;
    let salesCount = 0;
    let purchaseCount = 0;

    vouchers.forEach(v => {
        const type = (v.type || '').trim();
        const amt = v.amount || 0;

        // Skip non-financial order vouchers
        if (type.toLowerCase() === 'sales order' || type.toLowerCase() === 'purchase order') return;

        if (type.toLowerCase() === 'sales') {
            grossSales += amt;
            salesCount++;
        } else if (type.toLowerCase() === 'credit note' || type.toLowerCase() === 'sales return') {
            creditNotes += amt;
        } else if (type.toLowerCase() === 'purchase') {
            grossPurchases += amt;
            purchaseCount++;
        } else if (type.toLowerCase() === 'debit note' || type.toLowerCase() === 'purchase return') {
            debitNotes += amt;
        } else if (type.toLowerCase() === 'receipt') {
            receipts += amt;
        } else if (type.toLowerCase() === 'payment') {
            payments += amt;
            // Expense classification: payment to non-customer, non-supplier ledger
            const party = (v.partyId ? ledgerMap.get(v.partyId) : null) || v.party;
            const isSupplier = party && (party.type === 'Supplier' || party.group?.toLowerCase().includes('creditor'));
            const isCustomer = party && (party.type === 'Customer' || party.group?.toLowerCase().includes('debtor'));

            if (!isSupplier && !isCustomer) {
                operatingExpenses += amt;
            }
        }
    });

    const netSales = grossSales - creditNotes;
    const netPurchases = grossPurchases - debitNotes;
    const grossProfit = netSales - netPurchases;
    const netProfit = grossProfit - operatingExpenses;

    // Receivables: Total Debtors Closing Balances
    const receivables = ledgers
        .filter(l => l.type === 'Customer' || l.group?.toLowerCase().includes('debtor'))
        .reduce((sum, l) => sum + (l.closingBalance || 0), 0);

    // Payables: Total Creditors Closing Balances
    const payables = ledgers
        .filter(l => l.type === 'Supplier' || l.group?.toLowerCase().includes('creditor'))
        .reduce((sum, l) => sum + (l.closingBalance || 0), 0);

    // Cash & Bank balances
    const cashBalance = ledgers
        .filter(l => l.type === 'Cash' || l.group?.toLowerCase().includes('cash'))
        .reduce((sum, l) => sum + (l.closingBalance || 0), 0);

    const bankBalance = ledgers
        .filter(l => l.type === 'Bank' || l.group?.toLowerCase().includes('bank'))
        .reduce((sum, l) => sum + (l.closingBalance || 0), 0);

    const cashBankTotal = cashBalance + bankBalance;

    // Stock Valuation: Sum of (currentStock * salesPrice/purchasePrice)
    const stockValuation = inventory.reduce((sum, item) => {
        const qty = item.currentStock || 0;
        const price = item.salesPrice || item.purchasePrice || 0;
        return sum + (qty * price);
    }, 0);

    return {
        grossSales,
        creditNotes,
        netSales,
        salesCount,
        grossPurchases,
        debitNotes,
        netPurchases,
        purchaseCount,
        grossProfit,
        operatingExpenses,
        netProfit,
        receipts,
        payments,
        receivables,
        payables,
        cashBalance,
        bankBalance,
        cashBankTotal,
        stockValuation,
        vouchersCount: vouchers.length,
        ledgersCount: ledgers.length,
        inventoryCount: inventory.length
    };
}
