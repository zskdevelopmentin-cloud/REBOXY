'use client';

import React from 'react';
import { useBiz } from '@/context/BizContext';
import { formatCurrency } from '@/utils/formatters';
import ReportLayout from '@/components/layout/ReportLayout';

const StockReportPage = () => {
  const { data } = useBiz();

  return (
    <ReportLayout title="Stock / Inventory">
      <div className="space-y-4">
         {data.stock.map(item => (
            <div key={item.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-black text-sm dark:text-white uppercase tracking-tight">{item.name}</h4>
                    <span className="text-[10px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full font-bold dark:text-gray-400">{item.category}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded-xl">
                        <p className="text-[9px] text-gray-400 font-bold uppercase">Opening</p>
                        <p className="text-xs font-black dark:text-white">{item.openingQty}</p>
                    </div>
                    <div className="p-2 bg-green-50 dark:bg-green-900/10 rounded-xl">
                        <p className="text-[9px] text-green-600 font-bold uppercase">In</p>
                        <p className="text-xs font-black text-green-700 dark:text-green-400">+{item.inQty}</p>
                    </div>
                    <div className="p-2 bg-red-50 dark:bg-red-900/10 rounded-xl">
                        <p className="text-[9px] text-red-600 font-bold uppercase">Out</p>
                        <p className="text-xs font-black text-red-700 dark:text-red-400">-{item.outQty}</p>
                    </div>
                </div>
                <div className="mt-3 pt-3 border-t dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <p className="text-[9px] text-gray-400 font-bold uppercase">Closing Stock</p>
                        <p className="text-sm font-black dark:text-white">{(item.openingQty + item.inQty - item.outQty)} {item.unit}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] text-gray-400 font-bold uppercase">Total Value</p>
                        <p className="text-sm font-black text-primary">{formatCurrency((item.openingQty + item.inQty - item.outQty) * item.rate)}</p>
                    </div>
                </div>
            </div>
         ))}
      </div>
    </ReportLayout>
  );
};

export default StockReportPage;
