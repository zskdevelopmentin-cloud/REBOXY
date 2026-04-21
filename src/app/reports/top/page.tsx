'use client';

import React, { useMemo } from 'react';
import { useBiz } from '@/context/BizContext';
import { ArrowLeft, Trophy, Users, Package } from 'lucide-react';
import Link from 'next/link';

export default function TopReportPage() {
  const { data } = useBiz();

  const { topCustomers, topItems } = useMemo(() => {
    const sales = data.vouchers.filter(v => v.type === 'Sales');
    
    // Aggregate by Customer
    const customerTotals: Record<string, { name: string, total: number }> = {};
    // Aggregate by Item
    const itemTotals: Record<string, { name: string, qty: number, revenue: number }> = {};

    sales.forEach(v => {
      if (!customerTotals[v.partyId]) {
        customerTotals[v.partyId] = { name: v.partyName, total: 0 };
      }
      customerTotals[v.partyId].total += v.amount;

      v.items.forEach(item => {
        const stockItem = data.stock.find(s => s.id === item.itemId);
        const itemName = stockItem ? stockItem.name : 'Unknown Item';
        
        if (!itemTotals[item.itemId]) {
          itemTotals[item.itemId] = { name: itemName, qty: 0, revenue: 0 };
        }
        itemTotals[item.itemId].qty += item.qty;
        itemTotals[item.itemId].revenue += item.total;
      });
    });

    return {
      topCustomers: Object.values(customerTotals).sort((a, b) => b.total - a.total).slice(0, 5),
      topItems: Object.values(itemTotals).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
    };
  }, [data]);

  return (
    <div className="bg-gray-50 min-h-screen pb-6">
      <header className="bg-[#0b96ff] text-white px-4 py-4 flex items-center gap-3 shadow-md sticky top-0 z-10">
        <Link href="/reports">
          <ArrowLeft size={24} />
        </Link>
        <h3 className="text-lg font-medium tracking-wide flex-1">Top Report</h3>
      </header>

      <div className="p-4 space-y-6">
        {/* Top Customers Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-blue-50/50 p-4 border-b border-gray-100 flex items-center gap-2">
            <Users className="text-blue-500" size={20} />
            <h4 className="font-bold text-gray-800">Top 5 Customers</h4>
          </div>
          <div className="p-0">
            {topCustomers.map((c, i) => (
              <div key={i} className="flex justify-between items-center p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${i === 0 ? 'bg-yellow-100 text-yellow-600' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-500'}`}>
                    #{i + 1}
                  </div>
                  <span className="font-medium text-sm text-gray-800 line-clamp-1">{c.name}</span>
                </div>
                <span className="font-bold text-[#0b96ff]">₹{c.total.toLocaleString()}</span>
              </div>
            ))}
            {topCustomers.length === 0 && (
                <div className="p-4 text-center text-gray-500 text-sm">No sales data found.</div>
            )}
          </div>
        </div>

        {/* Top Items Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-purple-50/50 p-4 border-b border-gray-100 flex items-center gap-2">
            <Package className="text-purple-500" size={20} />
            <h4 className="font-bold text-gray-800">Top 5 Selling Items</h4>
          </div>
          <div className="p-0">
            {topItems.map((item, i) => (
              <div key={i} className="flex justify-between items-center p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <div className="flex flex-col flex-1 truncate pr-4">
                  <span className="font-medium text-sm text-gray-800 truncate">{item.name}</span>
                  <span className="text-xs text-gray-500">{item.qty} units sold</span>
                </div>
                <span className="font-bold text-[#0b96ff]">₹{item.revenue.toLocaleString()}</span>
              </div>
            ))}
            {topItems.length === 0 && (
                <div className="p-4 text-center text-gray-500 text-sm">No sales data found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
