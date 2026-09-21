'use client';

import React, { useMemo } from 'react';
import { useBiz } from '@/context/BizContext';
import { ArrowLeft, Landmark, Printer } from 'lucide-react';
import Link from 'next/link';

export default function BalanceSheetPage() {
  const { data } = useBiz();

  const bs = useMemo(() => {
    // 1. Assets from persisted Ledgers & Inventory
    const debtors = data.ledgers
      .filter(l => l.type === 'Customer' || l.group?.toLowerCase().includes('debtor'))
      .reduce((sum, c) => sum + (c.closingBalance || 0), 0);

    const cash = data.ledgers
      .filter(l => l.type === 'Cash' || l.group?.toLowerCase().includes('cash'))
      .reduce((sum, c) => sum + (c.closingBalance || 0), 0);

    const bank = data.ledgers
      .filter(l => l.type === 'Bank' || l.group?.toLowerCase().includes('bank'))
      .reduce((sum, c) => sum + (c.closingBalance || 0), 0);

    const stockValuation = data.stock.reduce((sum, item) => {
        const qty = item.currentStock ?? ((item.openingQty || 0) + (item.inQty || 0) - (item.outQty || 0));
        const rate = item.salesPrice || item.rate || 0;
        return sum + (qty * rate);
    }, 0);

    const totalAssets = debtors + cash + bank + stockValuation;

    // 2. Liabilities & Equity from persisted Ledgers & Net Profit
    const creditors = data.ledgers
      .filter(l => l.type === 'Supplier' || l.group?.toLowerCase().includes('creditor'))
      .reduce((sum, s) => sum + (s.closingBalance || 0), 0);

    // Compute Net Profit from Vouchers
    let grossSales = 0, creditNotes = 0, grossPurchases = 0, debitNotes = 0, indirectExpenses = 0;
    const ledgerMap = new Map(data.ledgers.map(l => [l.id, l]));

    data.vouchers.forEach(v => {
        if (v.status === 'CANCELLED') return;
        const typeLower = (v.type || '').trim().toLowerCase();
        if (typeLower === 'sales order' || typeLower === 'purchase order') return;

        if (typeLower === 'sales') grossSales += v.amount;
        else if (typeLower === 'credit note' || typeLower === 'sales return') creditNotes += v.amount;
        else if (typeLower === 'purchase') grossPurchases += v.amount;
        else if (typeLower === 'debit note' || typeLower === 'purchase return') debitNotes += v.amount;
        else if (typeLower === 'payment') {
            const party = (v.partyId ? ledgerMap.get(v.partyId) : null) || data.ledgers.find(l => l.name === v.partyName);
            const isSupplier = party && (party.type === 'Supplier' || party.group?.toLowerCase().includes('creditor'));
            const isCustomer = party && (party.type === 'Customer' || party.group?.toLowerCase().includes('debtor'));
            if (!isSupplier && !isCustomer) indirectExpenses += v.amount;
        }
    });

    const netProfit = (grossSales - creditNotes) - (grossPurchases - debitNotes) - indirectExpenses;

    const totalLiabAndEquity = creditors + netProfit;
    const difference = totalAssets - totalLiabAndEquity;

    return {
        assets: { debtors, cash, bank, stockValuation },
        liabilities: { creditors, netProfit, difference },
        totalAssets,
        totalLiabAndEquity
    };
  }, [data]);

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-24 font-inter">
      <header className="bg-[#0b96ff] text-white px-4 py-4 flex items-center justify-between shadow-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h3 className="text-lg font-black uppercase tracking-tight">Balance Sheet Statement</h3>
        </div>
        <button 
          onClick={() => window.print()} 
          className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-md transition-all text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
        >
          <Printer size={16} /> Print
        </button>
      </header>

      <div className="p-4 space-y-6 max-w-4xl mx-auto">

        {/* Total Assets Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white p-6 rounded-3xl shadow-xl shadow-indigo-500/20 flex items-center justify-between">
            <div>
                <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-1">Total Assets Valuation</p>
                <h2 className="text-3xl font-black">₹{bs.totalAssets.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h2>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                <Landmark size={32} />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Assets */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/30 font-black text-emerald-900 dark:text-emerald-300 text-xs uppercase tracking-wider text-center">
                    ASSETS
                </div>
                <div className="p-0 divide-y divide-gray-100 dark:divide-gray-800">
                    <div className="p-4 flex justify-between">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Closing Stock Valuation</span>
                        <span className="font-bold text-gray-900 dark:text-white">₹{bs.assets.stockValuation.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="p-4 flex justify-between">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Sundry Debtors (Receivables)</span>
                        <span className="font-bold text-gray-900 dark:text-white">₹{bs.assets.debtors.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="p-4 flex justify-between">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Cash-in-Hand Balance</span>
                        <span className="font-bold text-gray-900 dark:text-white">₹{bs.assets.cash.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="p-4 flex justify-between">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Bank Accounts Balance</span>
                        <span className="font-bold text-gray-900 dark:text-white">₹{bs.assets.bank.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="p-4 flex justify-between bg-emerald-50 dark:bg-emerald-950/20 border-t border-emerald-100 dark:border-emerald-900/30 font-black">
                        <span className="text-sm text-emerald-900 dark:text-emerald-300 uppercase">Total Assets</span>
                        <span className="text-emerald-600 dark:text-emerald-400">₹{bs.totalAssets.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <div className="p-4 bg-red-50/60 dark:bg-red-950/30 border-b border-red-100 dark:border-red-900/30 font-black text-red-900 dark:text-red-300 text-xs uppercase tracking-wider text-center">
                    LIABILITIES & EQUITY
                </div>
                <div className="p-0 divide-y divide-gray-100 dark:divide-gray-800">
                    <div className="p-4 flex justify-between">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Sundry Creditors (Payables)</span>
                        <span className="font-bold text-gray-900 dark:text-white">₹{bs.liabilities.creditors.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="p-4 flex justify-between">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Current Period Net Profit</span>
                        <span className={`font-bold ${bs.liabilities.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            ₹{bs.liabilities.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    {Math.abs(bs.liabilities.difference) > 0.01 && (
                        <div className="p-4 flex justify-between bg-amber-50/50 dark:bg-amber-950/20">
                            <span className="text-sm font-bold text-amber-800 dark:text-amber-300">Unadjusted Capital / Retained Reserve</span>
                            <span className="font-bold text-amber-700 dark:text-amber-400">₹{bs.liabilities.difference.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        </div>
                    )}
                    <div className="p-4 flex justify-between bg-red-50 dark:bg-red-950/20 border-t border-red-100 dark:border-red-900/30 font-black">
                        <span className="text-sm text-red-900 dark:text-red-300 uppercase">Total Liabilities & Equity</span>
                        <span className="text-red-600 dark:text-red-400">₹{(bs.totalLiabAndEquity + (Math.abs(bs.liabilities.difference) > 0.01 ? bs.liabilities.difference : 0)).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
