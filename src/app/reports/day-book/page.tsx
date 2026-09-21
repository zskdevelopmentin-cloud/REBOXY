'use client';

import React, { useState, useMemo } from 'react';
import { useBiz } from '@/context/BizContext';
import { ArrowLeft, BookOpen, Calendar as CalendarIcon, Printer, Share2, Search, X } from 'lucide-react';
import Link from 'next/link';
import { exportReportData } from '@/utils/export';

export default function DayBookPage() {
  const { data } = useBiz();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const dayVouchers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.vouchers
        .filter(v => {
          const isDateMatch = v.date && (v.date.substring(0, 10) === selectedDate || v.date.startsWith(selectedDate));
          if (!isDateMatch) return false;
          if (typeFilter !== 'ALL' && (v.type || '').toLowerCase() !== typeFilter.toLowerCase()) return false;
          if (!q) return true;
          return (v.vNo || '').toLowerCase().includes(q) || (v.partyName || '').toLowerCase().includes(q) || (v.type || '').toLowerCase().includes(q);
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [data.vouchers, selectedDate, search, typeFilter]);

  const handleExportCSV = () => {
    if (!dayVouchers || dayVouchers.length === 0) return;
    const headers = ['Date', 'Time', 'Voucher No', 'Type', 'Party Name', 'Amount (₹)', 'Status'];
    const rows = dayVouchers.map(v => [
      selectedDate,
      new Date(v.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      v.vNo,
      v.type,
      v.partyName || 'Cash',
      v.amount || 0,
      v.status || 'COMPLETED'
    ]);
    exportReportData(`daybook_${selectedDate}`, headers, rows);
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24 font-inter">
      <header className="bg-[#0b96ff] text-white px-4 py-4 flex items-center justify-between shadow-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h3 className="text-lg font-medium tracking-wide">Day Book Statement</h3>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportCSV} 
            className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-md transition-all text-xs font-black uppercase tracking-wider flex items-center gap-1"
          >
            <Share2 size={16} /> Export
          </button>
          <button 
            onClick={() => window.print()} 
            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-md transition-all text-xs font-black uppercase tracking-wider"
          >
            <Printer size={16} />
          </button>
        </div>
      </header>

      <div className="p-4 space-y-4 max-w-4xl mx-auto">
        {/* Date Selector & Search Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
              <CalendarIcon className="text-blue-500 shrink-0" size={20} />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="flex-1 bg-transparent border-none text-gray-800 font-bold text-xs focus:outline-none"
              />
            </div>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none"
            >
              <option value="ALL">All Types</option>
              <option value="Sales">Sales</option>
              <option value="Purchase">Purchase</option>
              <option value="Receipt">Receipt</option>
              <option value="Payment">Payment</option>
              <option value="Credit Note">Credit Note</option>
              <option value="Debit Note">Debit Note</option>
            </select>
          </div>

          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search voucher number, party name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs font-bold focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 font-bold text-gray-800 flex justify-between items-center bg-blue-50/30">
                <span className="text-xs uppercase tracking-wider">Transactions on {selectedDate}</span>
                <span className="text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md text-xs font-black">{dayVouchers.length} Entries</span>
            </div>
            
            <div className="divide-y divide-gray-50">
                {dayVouchers.map((v) => (
                    <div key={v.id} className={`p-4 transition-colors ${v.status === 'CANCELLED' ? 'bg-red-50/40 opacity-75' : 'hover:bg-gray-50'}`}>
                        <div className="flex justify-between items-start mb-1">
                            <div className="flex-1 pr-2">
                                <h5 className="font-semibold text-sm text-gray-800 leading-tight">{v.partyName || 'Cash'}</h5>
                            </div>
                            <div className="text-right">
                              <span className={`font-bold ${v.status === 'CANCELLED' ? 'line-through text-red-400' : 'text-gray-800'}`}>
                                ₹{v.amount.toLocaleString()}
                              </span>
                              {v.status === 'CANCELLED' && (
                                <span className="block text-[9px] font-black text-red-500 uppercase tracking-widest">CANCELLED</span>
                              )}
                            </div>
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
