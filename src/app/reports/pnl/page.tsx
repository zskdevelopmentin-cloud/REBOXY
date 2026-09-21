'use client';

import React, { useMemo, useState } from 'react';
import { useBiz } from '@/context/BizContext';
import { ArrowLeft, LineChart, Calendar, Printer } from 'lucide-react';
import Link from 'next/link';

export default function PnLPage() {
  const { data } = useBiz();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const pnl = useMemo(() => {
    let grossSales = 0;
    let creditNotes = 0;
    let grossPurchases = 0;
    let debitNotes = 0;
    let operatingExpenses = 0;

    const ledgerMap = new Map(data.ledgers.map(l => [l.id, l]));

    const start = startDate ? new Date(startDate) : null;
    if (start) start.setHours(0, 0, 0, 0);

    const end = endDate ? new Date(endDate) : null;
    if (end) end.setHours(23, 59, 59, 999);

    data.vouchers.forEach(v => {
      // Exclude cancelled vouchers
      if (v.status === 'CANCELLED') return;

      const typeLower = (v.type || '').trim().toLowerCase();

      // Exclude non-financial order vouchers
      if (typeLower === 'sales order' || typeLower === 'purchase order') return;

      const vDate = new Date(v.date);
      if (start && vDate < start) return;
      if (end && vDate > end) return;

      if (typeLower === 'sales') {
        grossSales += v.amount;
      } else if (typeLower === 'credit note' || typeLower === 'sales return') {
        creditNotes += v.amount;
      } else if (typeLower === 'purchase') {
        grossPurchases += v.amount;
      } else if (typeLower === 'debit note' || typeLower === 'purchase return') {
        debitNotes += v.amount;
      } else if (typeLower === 'payment') {
        const party = (v.partyId ? ledgerMap.get(v.partyId) : null) || data.ledgers.find(l => l.name === v.partyName);
        const isSupplier = party && (party.type === 'Supplier' || party.group?.toLowerCase().includes('creditor'));
        const isCustomer = party && (party.type === 'Customer' || party.group?.toLowerCase().includes('debtor'));
        
        // Count payments as operating expenses ONLY if they are not settlements to suppliers or customers
        if (!isSupplier && !isCustomer) {
          operatingExpenses += v.amount;
        }
      }
    });

    const netSales = grossSales - creditNotes;
    const netPurchases = grossPurchases - debitNotes;
    const grossProfit = netSales - netPurchases;
    const netProfit = grossProfit - operatingExpenses;

    return {
      grossSales,
      creditNotes,
      sales: netSales,
      grossPurchases,
      debitNotes,
      purchases: netPurchases,
      grossProfit,
      expenses: operatingExpenses,
      netProfit
    };
  }, [data.vouchers, data.ledgers, startDate, endDate]);

  return (
    <div className="bg-gray-50 dark:bg-gray-950 min-h-screen pb-24 font-inter">
      <header className="bg-[#0b96ff] text-white px-4 py-4 flex items-center justify-between shadow-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h3 className="text-lg font-black uppercase tracking-tight">Profit & Loss Statement</h3>
        </div>
        <button 
          onClick={() => window.print()} 
          className="p-2.5 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-md transition-all text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
        >
          <Printer size={16} /> Print
        </button>
      </header>

      <div className="p-4 space-y-4 max-w-4xl mx-auto">

        {/* Date Filter Bar */}
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <Calendar size={16} /> Statement Period:
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white"
            />
            <span className="text-xs text-gray-400 font-bold">to</span>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold dark:text-white"
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-xs font-black text-primary uppercase hover:underline ml-2"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Net Profit Summary Card */}
        <div className={`rounded-3xl shadow-xl p-6 flex items-center justify-between transition-all ${pnl.netProfit >= 0 ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20' : 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-500/20'}`}>
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-1 opacity-90">Net Profit / Loss</p>
            <h2 className="text-3xl font-black">₹{Math.abs(pnl.netProfit).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</h2>
            <span className="inline-block mt-2 text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">
              {pnl.netProfit >= 0 ? 'NET OPERATING PROFIT' : 'NET OPERATING LOSS'}
            </span>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
            <LineChart size={32} />
          </div>
        </div>

        {/* Detailed Financial Breakdown */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 font-black text-gray-800 dark:text-white text-xs uppercase tracking-wider bg-gray-50/50 dark:bg-gray-800/50">
            Statement Breakdown
          </div>
          
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {/* Gross Sales */}
            <div className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <div>
                <h5 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Gross Sales</h5>
                <p className="text-[10px] text-gray-400 font-medium">Total Invoiced Revenue</p>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">₹{pnl.grossSales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>

            {/* Credit Notes / Sales Returns */}
            <div className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <div>
                <h5 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Credit Notes / Sales Returns</h5>
                <p className="text-[10px] text-gray-400 font-medium">Return Adjustments</p>
              </div>
              <span className="font-bold text-red-500">- ₹{pnl.creditNotes.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>

            {/* Net Sales */}
            <div className="p-4 flex justify-between items-center bg-emerald-50/40 dark:bg-emerald-950/20 font-bold border-y border-emerald-100 dark:border-emerald-900/30">
              <h5 className="text-emerald-900 dark:text-emerald-300 text-sm uppercase tracking-tight">Net Sales Revenue</h5>
              <span className="font-black text-emerald-600 dark:text-emerald-400">₹{pnl.sales.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>

            {/* Gross Purchases */}
            <div className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <div>
                <h5 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Gross Purchases</h5>
                <p className="text-[10px] text-gray-400 font-medium">Stock Purchases</p>
              </div>
              <span className="font-bold text-red-500">- ₹{pnl.grossPurchases.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>

            {/* Debit Notes / Purchase Returns */}
            <div className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <div>
                <h5 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Debit Notes / Purchase Returns</h5>
                <p className="text-[10px] text-gray-400 font-medium">Purchase Adjustments</p>
              </div>
              <span className="font-bold text-emerald-600">+ ₹{pnl.debitNotes.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>

            {/* Net Purchases */}
            <div className="p-4 flex justify-between items-center bg-gray-50 dark:bg-gray-800/40 font-bold">
              <h5 className="text-gray-700 dark:text-gray-300 text-sm uppercase tracking-tight">Net Cost of Purchases</h5>
              <span className="font-black text-red-500">- ₹{pnl.purchases.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>

            {/* Gross Profit */}
            <div className="p-4 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-950/30 border-y border-indigo-100 dark:border-indigo-900/30">
              <h5 className="font-black text-indigo-900 dark:text-indigo-300 uppercase tracking-tight">Gross Profit</h5>
              <span className="font-black text-indigo-600 dark:text-indigo-400 text-base">₹{pnl.grossProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>

            {/* Operating Expenses */}
            <div className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <div>
                <h5 className="font-bold text-gray-800 dark:text-gray-200 text-sm">Operating & Indirect Expenses</h5>
                <p className="text-[10px] text-gray-400 font-medium">Overheads & Administrative Payments</p>
              </div>
              <span className="font-bold text-red-500">- ₹{pnl.expenses.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>

            {/* Net Profit Summary Row */}
            <div className="p-5 flex justify-between items-center bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <h5 className="font-black text-gray-900 dark:text-white text-base uppercase tracking-tight">Net Profit</h5>
              <span className={`font-black text-xl ${pnl.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                ₹{pnl.netProfit.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
