'use client';

import React, { useMemo } from 'react';
import { useBiz } from '@/context/BizContext';
import { ArrowLeft, FileDown, Clock } from 'lucide-react';
import Link from 'next/link';

export default function PendingPurchaseOrderPage() {
  const { data } = useBiz();

  const pendingPO = useMemo(() => {
    return data.vouchers
        .filter(v => v.type === 'Purchase Order' && v.status !== 'Fulfilled')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [data.vouchers]);

  const totalValue = pendingPO.reduce((sum, v) => sum + v.amount, 0);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-6">
      <header className="bg-[#0b96ff] text-white px-4 py-4 flex items-center gap-3 shadow-md sticky top-0 z-10">
        <Link href="/reports">
          <ArrowLeft size={24} />
        </Link>
        <h3 className="text-lg font-medium tracking-wide flex-1">Pending Purchase Order</h3>
      </header>

      <div className="p-4 space-y-4">
        {/* Summary Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total Pending Value</p>
            <h2 className="text-2xl font-black text-orange-500">₹{totalValue.toLocaleString()}</h2>
          </div>
          <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-500">
            <FileDown size={24} />
          </div>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 font-bold text-gray-800 flex justify-between items-center bg-orange-50/30">
            <span>Pending POs</span>
            <span className="text-xs bg-white text-gray-600 px-2 py-1 rounded-lg border border-gray-100">{pendingPO.length} Orders</span>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingPO.map((po) => (
              <div key={po.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 pr-2">
                    <h5 className="font-semibold text-sm text-gray-800 leading-tight mb-1">{po.partyName}</h5>
                    <p className="text-xs text-gray-500 inline-flex items-center gap-1"><Clock size={10}/> {formatDate(po.date)} | {po.vNo}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-800 block">₹{po.amount.toLocaleString()}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                        {po.status || 'Pending'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {pendingPO.length === 0 && (
                <div className="p-10 text-center text-gray-400">
                    <FileDown size={48} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">All clear!</p>
                    <p className="text-xs mt-1">No pending purchase orders right now.</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
