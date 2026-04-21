'use client';

import React, { useMemo } from 'react';
import { useBiz } from '@/context/BizContext';
import { ArrowLeft, Banknote, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function ExpensesReportPage() {
  const { data } = useBiz();

  const { expenses, totalAmount } = useMemo(() => {
    // For this implementation, Payment vouchers are considered cash out / expenses.
    const exp = data.vouchers
      .filter(v => v.type === 'Payment')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
    const total = exp.reduce((sum, v) => sum + v.amount, 0);
    return { expenses: exp, totalAmount: total };
  }, [data]);

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-6">
      <header className="bg-[#0b96ff] text-white px-4 py-4 flex items-center gap-3 shadow-md sticky top-0 z-10">
        <Link href="/reports">
          <ArrowLeft size={24} />
        </Link>
        <h3 className="text-lg font-medium tracking-wide flex-1">Expenses</h3>
      </header>

      <div className="p-4 space-y-4">
        {/* Summary Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Expenses</p>
            <h2 className="text-2xl font-black text-red-500">₹{totalAmount.toLocaleString()}</h2>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500">
            <Banknote size={24} />
          </div>
        </div>

        {/* Expenses List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 font-bold text-gray-800">
            Expense History
          </div>
          <div className="divide-y divide-gray-50">
            {expenses.map((exp) => (
              <div key={exp.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 pr-2">
                    <h5 className="font-semibold text-sm text-gray-800">{exp.vNo} - {exp.partyName || 'Cash Expense'}</h5>
                  </div>
                  <span className="font-bold text-red-500 shrink-0">₹{exp.amount.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500 relative">
                    <Calendar size={12} />
                    <span>{formatDate(exp.date)}</span>
                </div>
              </div>
            ))}
            
            {expenses.length === 0 && (
                <div className="p-8 text-center text-gray-400">
                    <Banknote size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No expenses recorded yet.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
