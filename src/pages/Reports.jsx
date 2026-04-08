import React from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { useBiz } from '../context/BizContext';
import { 
  BarChart3, ShoppingCart, PieChart, Banknote, 
  Package, BookOpen, CalendarDays, TrendingUp, 
  Wallet, FileText, ArrowLeft, Download
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/formatters';

const ReportCard = ({ id, name, icon: Icon, color, sub }) => (
  <Link 
    to={`${id}`}
    className="flex flex-col items-center justify-center p-6 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:bg-gray-50 active:scale-95 transition-all group lg:aspect-square"
  >
    <div className={`p-4 rounded-2xl text-white mb-3 shadow-lg group-hover:scale-110 transition-transform ${color}`}>
      <Icon size={28} />
    </div>
    <p className="text-[10px] font-black text-center dark:text-white uppercase tracking-tighter leading-none mt-1">{name}</p>
  </Link>
);

const ReportGrid = () => {
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

// Sub-Component: Common Report Layout
const ReportLayout = ({ title, children, onBack }) => (
  <div className="flex flex-col h-full bg-background dark:bg-gray-950 animate-in slide-in-from-right duration-300">
    <div className="p-4 border-b dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full dark:text-white">
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-black text-lg dark:text-white uppercase tracking-tighter">{title}</h2>
      </div>
      <button className="p-2 text-primary bg-primary/10 rounded-xl">
        <Download size={20} />
      </button>
    </div>
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      {children}
    </div>
  </div>
);

// Stock Report Component
const StockReport = () => {
  const { data } = useBiz();
  const navigate = useNavigate();

  return (
    <ReportLayout title="Stock / Inventory" onBack={() => navigate('/reports')}>
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

const Reports = () => {
  return (
    <Routes>
      <Route path="/" element={<ReportGrid />} />
      <Route path="/stock" element={<StockReport />} />
      {/* Other report routes will be added here */}
      <Route path="*" element={<ReportLayout title="Report" onBack={() => {}}><div className="text-center p-12 opacity-50 font-bold">Coming Soon: Detailed Analytics</div></ReportLayout>} />
    </Routes>
  );
};

export default Reports;
