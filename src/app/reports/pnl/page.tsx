'use client';

import React, { useMemo } from 'react';
import { useBiz } from '@/context/BizContext';
import { ArrowLeft, LineChart } from 'lucide-react';
import Link from 'next/link';

export default function PnLPage() {
  const { data } = useBiz();

  const pnl = useMemo(() => {
    let sales = 0;
    let purchases = 0;
    let payments = 0;

    data.vouchers.forEach(v => {
        if (v.type === 'Sales') sales += v.amount;
        if (v.type === 'Purchase') purchases += v.amount;
        if (v.type === 'Payment') payments += v.amount;
    });

    const grossProfit = sales - purchases;
    const netProfit = grossProfit - payments;

    return {
        sales,
        purchases,
        grossProfit,
        payments,
        netProfit
    };
  }, [data.vouchers]);

  return (
    <div className="bg-gray-50 min-h-screen pb-6">
      <header className="bg-[#0b96ff] text-white px-4 py-4 flex items-center gap-3 shadow-md sticky top-0 z-10">
        <Link href="/reports">
          <ArrowLeft size={24} />
        </Link>
        <h3 className="text-lg font-medium tracking-wide flex-1">Profit & Loss</h3>
      </header>

      <div className="p-4 space-y-4">
        {/* Net Profit Summary Card */}
        <div className={`rounded-2xl shadow-sm border p-6 flex items-center justify-between ${pnl.netProfit >= 0 ? 'bg-green-500 border-green-600 text-white' : 'bg-red-500 border-red-600 text-white'}`}>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Net Profit / Loss</p>
            <h2 className="text-3xl font-black">₹{Math.abs(pnl.netProfit).toLocaleString()}</h2>
            <p className="text-xs mt-1 font-bold">{pnl.netProfit >= 0 ? 'PROFIT' : 'LOSS'}</p>
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
            <LineChart size={28} />
          </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 font-bold text-gray-800 bg-gray-50/50">
            Statement Breakdown
          </div>
          
          <div className="divide-y divide-gray-50">
            {/* Sales */}
            <div className="p-4 flex justify-between items-center hover:bg-gray-50">
                <div>
                    <h5 className="font-semibold text-gray-800 text-sm">Sales Account</h5>
                    <p className="text-xs text-gray-500">Total Operating Revenue</p>
                </div>
                <span className="font-bold text-green-600">₹{pnl.sales.toLocaleString()}</span>
            </div>

            {/* Purchases */}
            <div className="p-4 flex justify-between items-center hover:bg-gray-50">
                <div>
                    <h5 className="font-semibold text-gray-800 text-sm">Purchase Account</h5>
                    <p className="text-xs text-gray-500">Cost of Goods</p>
                </div>
                <span className="font-bold text-red-500">- ₹{pnl.purchases.toLocaleString()}</span>
            </div>

            {/* Gross Profit */}
            <div className="p-4 flex justify-between items-center bg-blue-50/30 border-y border-blue-100">
                <h5 className="font-bold text-blue-900">Gross Profit</h5>
                <span className="font-black text-blue-700">₹{pnl.grossProfit.toLocaleString()}</span>
            </div>

            {/* Indirect Expenses */}
            <div className="p-4 flex justify-between items-center hover:bg-gray-50">
                <div>
                    <h5 className="font-semibold text-gray-800 text-sm">Indirect Expenses</h5>
                    <p className="text-xs text-gray-500">Total Payments</p>
                </div>
                <span className="font-bold text-red-500">- ₹{pnl.payments.toLocaleString()}</span>
            </div>

             {/* Net Profit */}
             <div className="p-4 flex justify-between items-center bg-gray-50 border-t border-gray-200">
                <h5 className="font-black text-gray-900 text-lg">Net Profit</h5>
                <span className={`font-black text-lg ${pnl.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    ₹{pnl.netProfit.toLocaleString()}
                </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
