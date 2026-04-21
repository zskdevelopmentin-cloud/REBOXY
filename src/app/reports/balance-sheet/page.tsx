'use client';

import React, { useMemo } from 'react';
import { useBiz } from '@/context/BizContext';
import { ArrowLeft, Landmark } from 'lucide-react';
import Link from 'next/link';

export default function BalanceSheetPage() {
  const { data } = useBiz();

  const { assets, liabilities, totalAssets, totalLiab } = useMemo(() => {
    // Assets
    const debtors = data.ledgers.filter(l => l.type === 'Customer').reduce((sum, c) => sum + (c.balance || 0), 0);
    const stockValuation = data.stock.reduce((sum, item) => {
        const qty = item.openingQty + item.inQty - item.outQty;
        return sum + (qty * item.rate);
    }, 0);

    let cash = 0;
    data.vouchers.forEach(v => {
        if (v.type === 'Receipt') cash += v.amount;
        if (v.type === 'Payment') cash -= v.amount;
    });
    // Add base seed cash to keep it positive arbitrarily for demo purposes if it goes negative
    if (cash < 0) cash = 50000 + Math.abs(cash);

    const calcTotalAssets = debtors + stockValuation + cash;

    // Liabilities
    const creditors = data.ledgers.filter(l => l.type === 'Supplier').reduce((sum, s) => sum + (s.balance || 0), 0);
    
    // Profit & Loss Transfer
    let sales = 0, purchases = 0, payments = 0;
    data.vouchers.forEach(v => {
        if (v.type === 'Sales') sales += v.amount;
        if (v.type === 'Purchase') purchases += v.amount;
        if (v.type === 'Payment') payments += v.amount;
    });
    const netProfit = (sales - purchases) - payments;

    // Capital Account (Balancing Figure)
    const capital = calcTotalAssets - (creditors + netProfit);

    const calcTotalLiab = creditors + netProfit + capital;

    return {
        assets: { debtors, stockValuation, cash },
        liabilities: { creditors, netProfit, capital },
        totalAssets: calcTotalAssets,
        totalLiab: calcTotalLiab
    };
  }, [data]);

  return (
    <div className="bg-gray-50 min-h-screen pb-6">
      <header className="bg-[#0b96ff] text-white px-4 py-4 flex items-center gap-3 shadow-md sticky top-0 z-10">
        <Link href="/reports">
          <ArrowLeft size={24} />
        </Link>
        <h3 className="text-lg font-medium tracking-wide flex-1">Balance Sheet</h3>
      </header>

      <div className="p-4 space-y-6">

        <div className="bg-indigo-600 text-white p-5 rounded-2xl shadow-md flex items-center justify-between">
            <div>
                <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Total Assets / Liab</p>
                <h2 className="text-2xl font-black">₹{totalAssets.toLocaleString()}</h2>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-md">
                <Landmark size={24} />
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Liabilities */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-3 bg-red-50/50 border-b border-gray-100 font-bold text-red-900 text-sm text-center">
                    LIABILITIES
                </div>
                <div className="p-0 divide-y divide-gray-50">
                    <div className="p-3 flex justify-between">
                        <span className="text-sm text-gray-700">Capital Account</span>
                        <span className="font-medium text-gray-900">₹{liabilities.capital.toLocaleString()}</span>
                    </div>
                    <div className="p-3 flex justify-between">
                        <span className="text-sm text-gray-700">Profit & Loss A/c</span>
                        <span className="font-medium text-gray-900">₹{liabilities.netProfit.toLocaleString()}</span>
                    </div>
                    <div className="p-3 flex justify-between">
                        <span className="text-sm text-gray-700">Sundry Creditors</span>
                        <span className="font-medium text-gray-900">₹{liabilities.creditors.toLocaleString()}</span>
                    </div>
                    <div className="p-3 flex justify-between bg-gray-50 border-t border-gray-200 font-bold">
                        <span className="text-sm text-gray-900">Total</span>
                        <span className="text-red-700">₹{totalLiab.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Assets */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-3 bg-green-50/50 border-b border-gray-100 font-bold text-green-900 text-sm text-center">
                    ASSETS
                </div>
                <div className="p-0 divide-y divide-gray-50">
                    <div className="p-3 flex justify-between">
                        <span className="text-sm text-gray-700">Closing Stock</span>
                        <span className="font-medium text-gray-900">₹{assets.stockValuation.toLocaleString()}</span>
                    </div>
                    <div className="p-3 flex justify-between">
                        <span className="text-sm text-gray-700">Sundry Debtors</span>
                        <span className="font-medium text-gray-900">₹{assets.debtors.toLocaleString()}</span>
                    </div>
                    <div className="p-3 flex justify-between">
                        <span className="text-sm text-gray-700">Cash-in-Bank / Hand</span>
                        <span className="font-medium text-gray-900">₹{assets.cash.toLocaleString()}</span>
                    </div>
                    <div className="p-3 flex justify-between bg-gray-50 border-t border-gray-200 font-bold">
                        <span className="text-sm text-gray-900">Total</span>
                        <span className="text-green-700">₹{totalAssets.toLocaleString()}</span>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
