'use client';

import React, { useState, useMemo } from 'react';
import { useBiz } from '@/context/BizContext';
import { ArrowLeft, BookOpen, Calendar as CalendarIcon } from 'lucide-react';
import Link from 'next/link';

export default function DayBookPage() {
  const { data } = useBiz();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const dayVouchers = useMemo(() => {
    return data.vouchers
        .filter(v => v.date.startsWith(selectedDate))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data.vouchers, selectedDate]);

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-6">
      <header className="bg-[#0b96ff] text-white px-4 py-4 flex items-center gap-3 shadow-md sticky top-0 z-10">
        <Link href="/reports">
          <ArrowLeft size={24} />
        </Link>
        <h3 className="text-lg font-medium tracking-wide flex-1">Day Book</h3>
      </header>

      <div className="p-4 space-y-4">
        {/* Date Selector */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 focus-within:ring-2 focus-within:ring-blue-500">
            <CalendarIcon className="text-blue-500 shrink-0" size={24} />
            <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 bg-transparent border-none text-gray-800 font-bold focus:outline-none focus:ring-0"
            />
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 font-bold text-gray-800 flex justify-between items-center bg-blue-50/30">
                <span>Transactions</span>
                <span className="text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md text-xs">{dayVouchers.length} Total</span>
            </div>
            
            <div className="divide-y divide-gray-50">
                {dayVouchers.map((v) => (
                    <div key={v.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                            <div className="flex-1 pr-2">
                                <h5 className="font-semibold text-sm text-gray-800 leading-tight">{v.partyName}</h5>
                            </div>
                            <span className="font-bold text-gray-800 shrink-0">₹{v.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md ${
                                    v.type === 'Sales' ? 'bg-green-100 text-green-700' : 
                                    v.type === 'Purchase' ? 'bg-blue-100 text-blue-700' :
                                    v.type === 'Receipt' ? 'bg-teal-100 text-teal-700' :
                                    v.type === 'Payment' ? 'bg-red-100 text-red-700' : 
                                    'bg-gray-100 text-gray-600'
                                }`}>
                                    {v.type}
                                </span>
                                <span className="text-xs text-gray-400 font-mono">{v.vNo}</span>
                            </div>
                            <span className="text-[10px] text-gray-500">{formatTime(v.date)}</span>
                        </div>
                    </div>
                ))}

                {dayVouchers.length === 0 && (
                    <div className="p-10 text-center text-gray-400">
                        <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
                        <p className="text-sm">No transactions found for this date.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
