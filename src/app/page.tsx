'use client';

import React from 'react';
import { useBiz } from '../context/BizContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, FileText, CreditCard, Scale, Landmark, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import Login from './login/page';

export default function DashboardPage() {
  const { dashboardData, isAuthenticated, refreshDashboard } = useBiz();

  React.useEffect(() => {
    if (isAuthenticated && !dashboardData) {
      refreshDashboard();
    }
  }, [isAuthenticated, dashboardData, refreshDashboard]);

  if (!isAuthenticated) {
    return <Login />;
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-full p-10">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 font-inter animate-in fade-in duration-500 pb-20">
      
      {/* Biz Analyst Metrics Cards - Grid Layout */}
      <div className="space-y-3">

        {/* 1. Sales & Credit Note */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <DollarSign size={22} />
            </div>
            <div>
              <p className="text-xl font-black dark:text-white">{formatCurrency(dashboardData.sales)}</p>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Sales - Credit Note (Gross)</p>
            </div>
          </div>
        </div>

        {/* 2. Purchase & Debit Note */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-xl">
              <ShoppingCart size={22} />
            </div>
            <div>
              <p className="text-xl font-black dark:text-white">{formatCurrency(dashboardData.purchases)}</p>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Purchase - Debit Note (Gross)</p>
            </div>
          </div>
        </div>

        {/* 3. Receipt */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <FileText size={22} />
            </div>
            <div>
              <p className="text-xl font-black dark:text-white">{formatCurrency(dashboardData.receipts)}</p>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Receipt</p>
            </div>
          </div>
        </div>

        {/* 4. Payment */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <CreditCard size={22} />
            </div>
            <div>
              <p className="text-xl font-black dark:text-white">{formatCurrency(dashboardData.payments)}</p>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Payment</p>
            </div>
          </div>
        </div>

        {/* 5. Outstanding */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <Scale size={22} />
            </div>
            <div>
              <p className="text-xl font-black dark:text-white">{formatCurrency(dashboardData.outstanding)}</p>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Outstanding</p>
            </div>
          </div>
        </div>

        {/* 6. Cash / Bank Balance */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl">
              <Landmark size={22} />
            </div>
            <div>
              <p className="text-xl font-black dark:text-white">{formatCurrency(dashboardData.cashBank)}</p>
              <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">Cash / Bank balance</p>
            </div>
          </div>
        </div>

      </div>

      {/* Recent Transactions Feed */}
      <div className="space-y-3 pt-2">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-xs font-black dark:text-white uppercase tracking-wider">Recent Transactions</h4>
          <span className="text-[10px] font-bold text-gray-400 uppercase">Realtime Tally Feed</span>
        </div>
        <div className="space-y-2">
          {dashboardData.recentVouchers?.length > 0 ? (
            dashboardData.recentVouchers.map((v: any) => (
              <div key={v.id} className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-50 dark:border-gray-700 shadow-sm active:scale-[0.98] transition-all">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${v.type?.toLowerCase().includes('sales') || v.type?.toLowerCase().includes('receipt') ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {v.type?.toLowerCase().includes('sales') || v.type?.toLowerCase().includes('receipt') ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-black dark:text-white uppercase tracking-tight">{v.party?.name || v.partyName || 'Cash / General'}</p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">{formatDate(v.date)} • {v.vNo} • {v.type}</p>
                  </div>
                </div>
                <p className={`text-sm font-black ${v.type?.toLowerCase().includes('sales') || v.type?.toLowerCase().includes('receipt') ? 'text-green-600' : 'text-orange-600'}`}>
                  {formatCurrency(v.amount)}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-8 opacity-40 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200">
              <p className="text-xs font-bold uppercase tracking-widest dark:text-white">No Vouchers Found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
