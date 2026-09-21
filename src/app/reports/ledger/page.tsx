'use client';

import React, { useState, useMemo } from 'react';
import { useBiz } from '@/context/BizContext';
import { ArrowLeft, Book, Search, Phone, Mail, FileText } from 'lucide-react';
import Link from 'next/link';
import { calculateParty360 } from '@/utils/party360';
import { formatCurrency } from '@/utils/formatters';

import { exportReportData } from '@/utils/export';
import { Printer } from 'lucide-react';

export default function LedgerReportPage() {
  const { data } = useBiz();
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>('');
  const [search, setSearch] = useState('');

  const filteredLedgers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.ledgers;
    return data.ledgers.filter(l => 
      (l.name || '').toLowerCase().includes(q) ||
      (l.phone || '').toLowerCase().includes(q)
    );
  }, [data.ledgers, search]);

  const selectedLedger = useMemo(() => {
    return data.ledgers.find(l => l.id === selectedLedgerId);
  }, [selectedLedgerId, data.ledgers]);

  const partyMetrics = useMemo(() => {
    if (!selectedLedger) return null;
    return calculateParty360(selectedLedger, data.vouchers);
  }, [selectedLedger, data.vouchers]);

  const handleExportCSV = () => {
    if (!selectedLedger || !partyMetrics) return;
    const headers = ['Date', 'Voucher No', 'Type', 'Dr Amount (₹)', 'Cr Amount (₹)', 'Running Balance (₹)'];
    const rows = partyMetrics.chronologicalLedger.map(v => [
      v.date,
      v.vNo,
      v.type,
      v.dr || 0,
      v.cr || 0,
      v.runningBalance || 0
    ]);
    exportReportData(`ledger_${selectedLedger.name}`, headers, rows);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <header className="bg-[#0b96ff] text-white px-4 py-4 flex items-center justify-between shadow-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Link href="/reports" className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h3 className="text-lg font-medium tracking-wide">Ledger Report & 360</h3>
        </div>
        {selectedLedger && (
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportCSV} 
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-md transition-all text-xs font-black uppercase tracking-wider"
            >
              Export
            </button>
            <button 
              onClick={() => window.print()} 
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl backdrop-blur-md transition-all text-xs font-black uppercase tracking-wider"
            >
              <Printer size={16} />
            </button>
          </div>
        )}
      </header>

      <div className="p-4 space-y-4 flex-1">
        {/* Ledger Selector & Search */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">Select Account</label>
            <div className="relative max-w-xs flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Filter by name/phone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="relative">
            <select 
              className="w-full pl-3 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={selectedLedgerId}
              onChange={(e) => setSelectedLedgerId(e.target.value)}
            >
              <option value="">-- Choose Customer or Supplier --</option>
              <optgroup label="Customers">
                {filteredLedgers.filter(l => l.type === 'Customer').map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </optgroup>
              <optgroup label="Suppliers">
                {filteredLedgers.filter(l => l.type === 'Supplier').map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </optgroup>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              ▼
            </div>
          </div>
        </div>

        {/* 360 Header Details */}
        {selectedLedger && partyMetrics && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden space-y-4 p-4">
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <h4 className="font-black text-lg text-gray-800 uppercase tracking-tight">{selectedLedger.name}</h4>
                <p className="text-xs font-bold text-gray-500">{selectedLedger.type} Account</p>
                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs font-semibold text-gray-600">
                  {selectedLedger.phone && <span className="flex items-center gap-1"><Phone size={12} className="text-blue-500" /> {selectedLedger.phone}</span>}
                  {selectedLedger.email && <span className="flex items-center gap-1"><Mail size={12} className="text-blue-500" /> {selectedLedger.email}</span>}
                  {selectedLedger.gst && <span className="flex items-center gap-1"><FileText size={12} className="text-blue-500" /> GST: {selectedLedger.gst}</span>}
                </div>
              </div>

              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Closing Balance</p>
                <p className={`text-xl font-black ${selectedLedger.type === 'Customer' ? 'text-green-600' : 'text-red-500'}`}>
                  ₹{partyMetrics.closingBalance.toLocaleString()}
                </p>
              </div>
            </div>

            {/* 360 Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <p className="text-[9px] font-bold text-gray-400 uppercase">{selectedLedger.type === 'Customer' ? 'Gross Sales' : 'Gross Purchases'}</p>
                <p className="font-black text-gray-900">{formatCurrency(selectedLedger.type === 'Customer' ? partyMetrics.totalSales : partyMetrics.totalPurchases)}</p>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <p className="text-[9px] font-bold text-gray-400 uppercase">{selectedLedger.type === 'Customer' ? 'Total Receipts' : 'Total Payments'}</p>
                <p className="font-black text-emerald-600">{formatCurrency(selectedLedger.type === 'Customer' ? partyMetrics.totalReceipts : partyMetrics.totalPayments)}</p>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <p className="text-[9px] font-bold text-gray-400 uppercase">{selectedLedger.type === 'Customer' ? 'Credit Notes' : 'Debit Notes'}</p>
                <p className="font-black text-orange-600">{formatCurrency(selectedLedger.type === 'Customer' ? partyMetrics.creditNotes : partyMetrics.debitNotes)}</p>
              </div>
              <div className="p-2.5 bg-gray-50 rounded-xl">
                <p className="text-[9px] font-bold text-gray-400 uppercase">{selectedLedger.type === 'Customer' ? 'Net Sales' : 'Net Purchases'}</p>
                <p className="font-black text-blue-600">{formatCurrency(selectedLedger.type === 'Customer' ? partyMetrics.netSales : partyMetrics.netPurchases)}</p>
              </div>
            </div>

            {/* Statement Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-3 font-semibold">Date</th>
                    <th className="p-3 font-semibold">Particulars / Ref</th>
                    <th className="p-3 font-semibold text-right text-red-500">Dr (₹)</th>
                    <th className="p-3 font-semibold text-right text-green-600">Cr (₹)</th>
                    <th className="p-3 font-semibold text-right text-blue-600">Balance (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Opening Balance Row */}
                  <tr className="bg-gray-50/50 italic font-semibold text-gray-600">
                    <td className="p-3 text-xs">-</td>
                    <td className="p-3 text-xs">Opening Balance</td>
                    <td className="p-3 text-right text-xs">-</td>
                    <td className="p-3 text-right text-xs">-</td>
                    <td className="p-3 text-right text-xs font-bold text-blue-700">₹{partyMetrics.openingBalance.toLocaleString()}</td>
                  </tr>

                  {partyMetrics.chronologicalLedger.map((v) => (
                    <tr key={v.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-3 text-gray-600 text-xs">{formatDate(v.date)}</td>
                      <td className="p-3">
                        <div className="text-xs font-bold text-gray-800">{v.vNo}</div>
                        <div className="text-[10px] text-gray-500">{v.type}</div>
                      </td>
                      <td className="p-3 text-right text-red-500 font-medium">{v.dr > 0 ? v.dr.toLocaleString() : '-'}</td>
                      <td className="p-3 text-right text-green-600 font-medium">{v.cr > 0 ? v.cr.toLocaleString() : '-'}</td>
                      <td className="p-3 text-right text-blue-600 font-bold">₹{v.runningBalance.toLocaleString()}</td>
                    </tr>
                  ))}

                  {partyMetrics.chronologicalLedger.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        <Book size={32} className="mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No transaction entries found for this account.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
