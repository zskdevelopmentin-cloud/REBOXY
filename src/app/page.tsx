'use client';

import React from 'react';
import { useBiz } from '../context/BizContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown } from 'lucide-react';
import Login from './login/page';

export default function DashboardPage() {
  const { dashboardData, isAuthenticated } = useBiz();

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

  // Dummy chart data for UI since real historical daily charts require a more complex API response
  const chartData = Array.from({ length: 7 }, (_, i) => ({
    name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
    value: Math.random() * dashboardData.sales * 0.3,
    fullDate: `Day ${i+1}`
  }));

  return (
    <div className="p-4 space-y-4 font-inter animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl shadow-sm">
          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Total Sales</p>
          <p className="text-xl font-black text-blue-900 dark:text-white mt-1">{formatCurrency(dashboardData.sales)}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 p-4 rounded-xl shadow-sm">
          <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider">Total Purchase</p>
          <p className="text-xl font-black text-orange-900 dark:text-white mt-1">{formatCurrency(dashboardData.purchases)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Receivables</p>
          <div className="flex items-baseline gap-1 mt-1">
            <p className="text-xl font-black dark:text-white">{formatCurrency(dashboardData.receivables)}</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-green-600 mt-2 font-bold italic">
            <TrendingUp size={10} /> 12.5% vs LW
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Payables</p>
          <div className="flex items-baseline gap-1 mt-1">
            <p className="text-xl font-black dark:text-white">{formatCurrency(Math.abs(dashboardData.payables))}</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-red-600 mt-2 font-bold italic">
            <TrendingDown size={10} /> 3.2% vs LW
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-sm font-black dark:text-white uppercase tracking-tight">Sales Trend (Simulated)</h4>
          <span className="text-[10px] text-gray-400 font-bold uppercase">Last 7 Days</span>
        </div>
        <div className="h-40 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} 
              />
              <Tooltip 
                cursor={{ fill: 'rgba(26, 86, 219, 0.05)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-gray-900 text-white p-2 rounded-lg text-[10px] font-bold shadow-xl">
                        <p>{payload[0].payload.fullDate}</p>
                        <p className="text-primary">{formatCurrency(payload[0].value as number)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 6 ? '#3b82f6' : '#e5e7eb'} className="dark:fill-gray-700" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="space-y-3 pb-8">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-sm font-black dark:text-white uppercase tracking-tight">Recent Transactions</h4>
          <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">View All</button>
        </div>
        <div className="space-y-2">
          {dashboardData.recentVouchers?.map((v: any) => (
            <div key={v.id} className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-50 dark:border-gray-700 shadow-sm active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${v.type === 'Sales' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {v.type === 'Sales' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                </div>
                <div>
                  <p className="text-sm font-black dark:text-white uppercase tracking-tight">{v.party?.name || 'Cash'}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">{formatDate(v.date)} • {v.vNo}</p>
                </div>
              </div>
              <p className={`text-sm font-black ${v.type === 'Sales' ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(v.amount)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
