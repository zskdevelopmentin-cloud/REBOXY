'use client';

import React, { useMemo } from 'react';
import { useBiz } from '@/context/BizContext';
import { ArrowLeft, UserX, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { calculateParty360 } from '@/utils/party360';
import { formatCurrency, formatDate } from '@/utils/formatters';

export default function InactiveCustomersPage() {
  const { data } = useBiz();

  const inactiveCustomers = useMemo(() => {
    const customers = data.ledgers.filter(l => l.type === 'Customer');
    
    return customers.map(c => {
        const m = calculateParty360(c, data.vouchers);
        return {
            ...c,
            metrics: m,
            daysSinceLastSale: m.daysSinceLastTransaction
        };
    }).filter(c => c.daysSinceLastSale === null || c.daysSinceLastSale > 30)
      .sort((a, b) => {
          if (a.daysSinceLastSale === null) return -1;
          if (b.daysSinceLastSale === null) return 1;
          return b.daysSinceLastSale - a.daysSinceLastSale;
      });
  }, [data.ledgers, data.vouchers]);

  return (
    <div className="bg-gray-50 min-h-screen pb-6">
      <header className="bg-[#0b96ff] text-white px-4 py-4 flex items-center gap-3 shadow-md sticky top-0 z-10">
        <Link href="/reports">
          <ArrowLeft size={24} />
        </Link>
        <h3 className="text-lg font-medium tracking-wide flex-1">Inactive Customers</h3>
      </header>

      <div className="p-4 space-y-4">
        <div className="bg-orange-50 text-orange-800 p-4 rounded-xl flex items-start gap-3 border border-orange-100">
            <AlertCircle className="shrink-0 mt-0.5 text-orange-500" size={20} />
            <p className="text-sm">Customers who have not generated any transaction activity in the last <strong>30 days</strong>.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 font-bold text-gray-800 flex items-center gap-2">
                <UserX className="text-red-500" size={20} />
                {inactiveCustomers.length} Inactive Accounts
            </div>
            
            <div className="divide-y divide-gray-50">
                {inactiveCustomers.map((cust) => (
                    <div key={cust.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center">
                        <div className="flex-1 pr-3">
                            <h5 className="font-semibold text-sm text-gray-800 mb-0.5">{cust.name}</h5>
                            <p className="text-xs text-gray-500">{cust.phone || cust.email || 'No contact info'} • Outstanding: <strong>{formatCurrency(cust.closingBalance || 0)}</strong></p>
                        </div>
                        <div className="text-right shrink-0">
                            <span className="inline-block px-2.5 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold whitespace-nowrap">
                                {cust.daysSinceLastSale ? `${cust.daysSinceLastSale} days ago` : 'Never Bought'}
                            </span>
                        </div>
                    </div>
                ))}
                
                {inactiveCustomers.length === 0 && (
                    <div className="p-8 text-center text-gray-400">
                        <p className="text-sm">All customers are currently active!</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
