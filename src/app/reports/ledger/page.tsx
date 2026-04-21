'use client';

import React, { useState, useMemo } from 'react';
import { useBiz } from '@/context/BizContext';
import { ArrowLeft, Book, Search } from 'lucide-react';
import Link from 'next/link';

export default function LedgerReportPage() {
  const { data } = useBiz();
  const [selectedLedgerId, setSelectedLedgerId] = useState<string>('');

  const selectedLedger = useMemo(() => {
    return data.ledgers.find(l => l.id === selectedLedgerId);
  }, [selectedLedgerId, data.ledgers]);

  const ledgerVouchers = useMemo(() => {
    if (!selectedLedgerId || !selectedLedger) return [];

    let runningBalance = selectedLedger.balance || 0; // In reality this is closing balance. If we had opening balance, we'd start there. For MVP, we'll just show the transactions. Wait, if we use closing balance, calculating backwards is hard. Let's just assume opening balance is 0 for the transactions view, or we show transaction impact. 
    
    // For MVP Ledger: We just show chronological transactions and their amounts.
    const vouchers = data.vouchers
        .filter(v => v.partyId === selectedLedgerId)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return vouchers.map(v => {
        // Determine whether this transaction is a Debit (Dr) or Credit (Cr) to the party
        let dr = 0;
        let cr = 0;

        if (selectedLedger.type === 'Customer') {
            if (v.type === 'Sales' || v.type === 'Debit Note') dr = v.amount;
            if (v.type === 'Receipt' || v.type === 'Credit Note') cr = v.amount;
        } else {
            // Supplier
            if (v.type === 'Purchase' || v.type === 'Credit Note') cr = v.amount;
            if (v.type === 'Payment' || v.type === 'Debit Note') dr = v.amount;
        }

        // We won't keep a strict running balance in this MVP without opening balances, but we'll show DR/CR
        return {
            ...v,
            dr,
            cr
        };
    });
  }, [selectedLedgerId, selectedLedger, data.vouchers]);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col">
      <header className="bg-[#0b96ff] text-white px-4 py-4 flex items-center gap-3 shadow-md sticky top-0 z-10">
        <Link href="/reports">
          <ArrowLeft size={24} />
        </Link>
        <h3 className="text-lg font-medium tracking-wide flex-1">Ledger Report</h3>
      </header>

      <div className="p-4 space-y-4 flex-1">
        {/* Ledger Selector */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 block">Select Account</label>
            <div className="relative">
                <select 
                    className="w-full pl-3 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedLedgerId}
                    onChange={(e) => setSelectedLedgerId(e.target.value)}
                >
                    <option value="">-- Choose Customer or Supplier --</option>
                    <optgroup label="Customers">
                        {data.ledgers.filter(l => l.type === 'Customer').map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </optgroup>
                    <optgroup label="Suppliers">
                        {data.ledgers.filter(l => l.type === 'Supplier').map(l => (
                            <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                    </optgroup>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    ▼
                </div>
            </div>
        </div>

        {/* Ledger Details */}
        {selectedLedger && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-blue-50/30">
                    <div>
                        <h4 className="font-bold text-gray-800">{selectedLedger.name}</h4>
                        <p className="text-xs text-gray-500">{selectedLedger.type}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Curr Balance</p>
                        <p className={`font-black ${selectedLedger.type === 'Customer' ? 'text-green-600' : 'text-red-500'}`}>
                            ₹{selectedLedger.balance?.toLocaleString() ?? 0}
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                            <tr>
                                <th className="p-3 font-semibold">Date</th>
                                <th className="p-3 font-semibold">Ref</th>
                                <th className="p-3 font-semibold text-right text-red-500">Dr (₹)</th>
                                <th className="p-3 font-semibold text-right text-green-600">Cr (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {ledgerVouchers.map((v) => (
                                <tr key={v.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="p-3 text-gray-600 text-xs">{formatDate(v.date)}</td>
                                    <td className="p-3">
                                        <div className="text-xs font-bold text-gray-800">{v.vNo}</div>
                                        <div className="text-[10px] text-gray-500">{v.type}</div>
                                    </td>
                                    <td className="p-3 text-right text-red-500 font-medium">{v.dr > 0 ? v.dr.toLocaleString() : '-'}</td>
                                    <td className="p-3 text-right text-green-600 font-medium">{v.cr > 0 ? v.cr.toLocaleString() : '-'}</td>
                                </tr>
                            ))}
                            {ledgerVouchers.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400">
                                        <Book size={32} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-sm">No transactions found for this account.</p>
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
