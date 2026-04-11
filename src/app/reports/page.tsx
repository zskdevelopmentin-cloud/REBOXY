'use client';

import React from 'react';
import Link from 'next/link';
import { 
  BarChart3, ShoppingCart, PieChart, Banknote, 
  Package, BookOpen, CalendarDays, TrendingUp, 
  Wallet, FileText
} from 'lucide-react';

const ReportCard = ({ id, name, icon: Icon, color }: { id: string, name: string, icon: any, color: string }) => (
  <Link 
    href={`/reports/${id}`}
    className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 transition-all group aspect-square"
  >
    <div className={`p-4 rounded-2xl text-white mb-3 shadow-lg group-hover:scale-110 transition-transform ${color}`}>
      <Icon size={28} />
    </div>
    <p className="text-[10px] font-black text-center dark:text-white uppercase tracking-tighter leading-none mt-1">{name}</p>
  </Link>
);

const ReportsPage = () => {
  const reports = [
    { id: 'sales', name: 'Sales Analysis', icon: BarChart3, color: 'bg-blue-500 shadow-blue-500/20' },
    { id: 'purchase', name: 'Purchase Analysis', icon: ShoppingCart, color: 'bg-orange-500 shadow-orange-500/20' },
    { id: 'pl', name: 'Profit & Loss', icon: PieChart, color: 'bg-green-500 shadow-green-500/20' },
    { id: 'cash', name: 'Cash & Bank', icon: Banknote, color: 'bg-teal-500 shadow-teal-500/20' },
    { id: 'stock', name: 'Stock / Inventory', icon: Package, color: 'bg-indigo-500 shadow-indigo-500/20' },
    { id: 'ledger', name: 'Ledger Report', icon: BookOpen, color: 'bg-purple-500 shadow-purple-500/20' },
    { id: 'daybook', name: 'Daybook', icon: CalendarDays, color: 'bg-pink-500 shadow-pink-500/20' },
    { id: 'top', name: 'Top Reports', icon: TrendingUp, color: 'bg-red-500 shadow-red-500/20' },
    { id: 'expense', name: 'Expense Report', icon: Wallet, color: 'bg-yellow-600 shadow-yellow-600/20' },
    { id: 'order', name: 'Order Analysis', icon: FileText, color: 'bg-cyan-600 shadow-cyan-600/20' }
  ];

  return (
    <div className="p-4 space-y-4">
      <header className="px-1">
        <h3 className="text-xl font-black dark:text-white uppercase tracking-tighter">Reports</h3>
        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Business Intelligence Suite</p>
      </header>
      <div className="grid grid-cols-2 gap-4">
        {reports.map(r => <ReportCard key={r.id} {...r} />)}
      </div>
    </div>
  );
};

export default ReportsPage;
