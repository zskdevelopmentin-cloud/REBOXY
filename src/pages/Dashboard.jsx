import React, { useMemo } from 'react';
import { useBiz } from '../context/BizContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown } from 'lucide-react';

const Dashboard = () => {
  const { data } = useBiz();
  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const todaySales = data.vouchers
      .filter(v => v.type === 'Sales' && v.date.startsWith(today))
      .reduce((sum, v) => sum + v.amount, 0);
      
    const todayPurchase = data.vouchers
      .filter(v => v.type === 'Purchase' && v.date.startsWith(today))
      .reduce((sum, v) => sum + v.amount, 0);

    const receivables = data.ledgers
      .filter(l => l.type === 'Customer')
      .reduce((sum, l) => sum + l.balance, 0);

    const payables = data.ledgers
      .filter(l => l.type === 'Supplier')
      .reduce((sum, l) => sum + l.balance, 0);

    return { todaySales, todayPurchase, receivables, payables };
  }, [data, today]);

  const chartData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const sales = data.vouchers
        .filter(v => v.type === 'Sales' && v.date.startsWith(dateStr))
        .reduce((sum, v) => sum + v.amount, 0);
      return {
        name: d.toLocaleDateString('en-IN', { weekday: 'short' }),
        value: sales,
        fullDate: formatDate(dateStr)
      };
    });
  }, [data]);

  return (
    <div className="p-4 space-y-4 font-inter animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 p-4 rounded-xl shadow-sm">
          <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Today's Sales</p>
          <p className="text-xl font-black text-blue-900 dark:text-white mt-1">{formatCurrency(stats.todaySales)}</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 p-4 rounded-xl shadow-sm">
          <p className="text-[10px] text-orange-600 dark:text-orange-400 font-bold uppercase tracking-wider">Today's Purchase</p>
          <p className="text-xl font-black text-orange-900 dark:text-white mt-1">{formatCurrency(stats.todayPurchase)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Receivables</p>
          <div className="flex items-baseline gap-1 mt-1">
            <p className="text-xl font-black dark:text-white">{formatCurrency(stats.receivables)}</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-green-600 mt-2 font-bold italic">
            <TrendingUp size={10} /> 12.5% vs LW
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Payables</p>
          <div className="flex items-baseline gap-1 mt-1">
            <p className="text-xl font-black dark:text-white">{formatCurrency(stats.payables)}</p>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-red-600 mt-2 font-bold italic">
            <TrendingDown size={10} /> 3.2% vs LW
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-sm font-black dark:text-white uppercase tracking-tight">7-Day Sales Trend</h4>
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
                        <p className="text-primary">{formatCurrency(payload[0].value)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 6 ? '#1a56db' : '#e5e7eb'} className="dark:fill-gray-700" />
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
          {data.vouchers.slice(0, 5).map(v => (
            <div key={v.id} className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-50 dark:border-gray-700 shadow-sm active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${v.type === 'Sales' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {v.type === 'Sales' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                </div>
                <div>
                  <p className="text-sm font-black dark:text-white uppercase tracking-tight">{v.partyName}</p>
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
};

export default Dashboard;
