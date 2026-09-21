'use client';

import React from 'react';
import { useBiz } from '@/context/BizContext';
import { formatCurrency } from '@/utils/formatters';
import ReportLayout from '@/components/layout/ReportLayout';
import { exportReportData } from '@/utils/export';
import { Share2 } from 'lucide-react';

const StockReportPage = () => {
  const { data } = useBiz();

  const handleExportCSV = () => {
    if (!data.stock || data.stock.length === 0) return;
    const headers = ['Item Name', 'Category', 'Unit', 'Opening Qty', 'In Qty', 'Out Qty', 'Current Stock', 'Rate (₹)', 'Total Valuation (₹)'];
    const rows = data.stock.map(item => {
      const opening = item.openingQty ?? 0;
      const inQty = item.inQty ?? 0;
      const outQty = item.outQty ?? 0;
      const qty = item.currentStock ?? (opening + inQty - outQty);
      const rate = item.purchasePrice || item.salesPrice || item.rate || 0;
      return [
        item.name,
        item.category || 'General',
        item.unit || 'PCS',
        opening,
        inQty,
        outQty,
        qty,
        rate,
        qty * rate
      ];
    });
    exportReportData('inventory_stock_report', headers, rows);
  };

  const totalValuation = data.stock.reduce((sum, item) => {
    const opening = item.openingQty ?? 0;
    const inQty = item.inQty ?? 0;
    const outQty = item.outQty ?? 0;
    const qty = item.currentStock ?? (opening + inQty - outQty);
    const rate = item.purchasePrice || item.salesPrice || item.rate || 0;
    return sum + (qty * rate);
  }, 0);

  return (
    <ReportLayout title="Stock / Inventory">
      <div className="space-y-4">
        {/* Total Stock Banner */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Inventory Valuation</p>
            <p className="text-xl font-black text-primary">{formatCurrency(totalValuation)}</p>
          </div>
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all"
          >
            <Share2 size={16} /> Export
          </button>
        </div>

        {data.stock.map(item => {
            const opening = item.openingQty ?? 0;
            const inQty = item.inQty ?? 0;
            const outQty = item.outQty ?? 0;
            const qty = item.currentStock ?? (opening + inQty - outQty);
            const rate = item.purchasePrice || item.salesPrice || item.rate || 0;

            return (
              <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                      <h4 className="font-black text-sm dark:text-white uppercase tracking-tight">{item.name}</h4>
                      <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full font-bold dark:text-gray-400">{item.category || 'General'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-xl">
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Opening</p>
                          <p className="text-xs font-black dark:text-white">{opening}</p>
                      </div>
                      <div className="p-2 bg-green-50 dark:bg-green-900/10 rounded-xl">
                          <p className="text-[9px] text-green-600 font-bold uppercase">In</p>
                          <p className="text-xs font-black text-green-700 dark:text-green-400">+{inQty}</p>
                      </div>
                      <div className="p-2 bg-red-50 dark:bg-red-900/10 rounded-xl">
                          <p className="text-[9px] text-red-600 font-bold uppercase">Out</p>
                          <p className="text-xs font-black text-red-700 dark:text-red-400">-{outQty}</p>
                      </div>
                  </div>
                  <div className="mt-3 pt-3 border-t dark:border-gray-700 flex justify-between items-center">
                      <div>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Closing Stock</p>
                          <p className="text-sm font-black dark:text-white">{qty} {item.unit || 'PCS'}</p>
                      </div>
                      <div className="text-right">
                          <p className="text-[9px] text-gray-400 font-bold uppercase">Total Value (Rate: ₹{rate})</p>
                          <p className="text-sm font-black text-primary">{formatCurrency(qty * rate)}</p>
                      </div>
                  </div>
              </div>
            );
         })}
      </div>
    </ReportLayout>
  );
};

export default StockReportPage;
