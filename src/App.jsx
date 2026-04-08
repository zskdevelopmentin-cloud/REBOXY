import React, { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BizProvider, useBiz } from './context/BizContext';
import Header from './components/layout/Header';
import BottomNav from './components/layout/BottomNav';

// Real Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import Entries from './pages/Entries';
import Outstanding from './pages/Outstanding';
import More from './pages/More';
import SecuritySettings from './pages/SecuritySettings';

import { Search, X, ArrowRight } from 'lucide-react';
import { formatCurrency } from './utils/formatters';

const AppContent = () => {
  const { toasts, data, searchOpen, setSearchOpen, isAuthenticated, isLoading } = useBiz();
  const [searchQuery, setSearchQuery] = useState('');

  if (isLoading) {
    return (
      <div className="mobile-container flex items-center justify-center bg-background dark:bg-gray-950">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase();
    const results = [];
    
    // Search Vouchers
    data.vouchers.forEach(v => {
      if (v.vNo.toLowerCase().includes(q) || v.partyName.toLowerCase().includes(q)) {
        results.push({ ...v, resType: 'Voucher' });
      }
    });

    // Search Ledgers
    data.ledgers.forEach(l => {
      if (l.name.toLowerCase().includes(q)) {
        results.push({ ...l, resType: 'Ledger' });
      }
    });

    return results.slice(0, 10);
  }, [searchQuery, data]);

  if (!isAuthenticated) {
    return (
      <>
        <Login />
        {/* Toast System accessible on login page */}
        <div className="fixed top-8 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[200] pointer-events-none">
          {toasts.map(toast => (
            <div key={toast.id} className="bg-white/95 dark:bg-black/90 text-black dark:text-white px-6 py-3 rounded-[2rem] shadow-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest animate-in slide-in-from-top-10 duration-300 backdrop-blur-lg pointer-events-auto border border-gray-100 dark:border-white/10">
              <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
              {toast.message}
            </div>
          ))}
        </div>
      </>
    );
  }
  
  return (
    <div className="mobile-container bg-background dark:bg-gray-950 shadow-2xl transition-all duration-500 overflow-hidden font-inter">
      <Header />
      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 overflow-y-auto no-scrollbar">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/reports/*" element={<Reports />} />
            <Route path="/entries" element={<Entries />} />
            <Route path="/outstanding" element={<Outstanding />} />
            <Route path="/more/*" element={<More />} />
            <Route path="/more/security" element={<SecuritySettings />} />
          </Routes>
        </div>
      </main>
      <BottomNav />
      
      {/* Toast System */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[100] pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="bg-black/90 dark:bg-white/95 text-white dark:text-black px-6 py-3 rounded-[2rem] shadow-2xl flex items-center gap-3 text-xs font-black uppercase tracking-widest animate-in slide-in-from-bottom-10 duration-300 backdrop-blur-lg pointer-events-auto">
            <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`} />
            {toast.message}
          </div>
        ))}
      </div>

      {/* Global Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 bg-white dark:bg-gray-950 z-[200] animate-in fade-in zoom-in-95 duration-200 p-4 flex flex-col">
            <header className="flex items-center gap-4 mb-6">
                <button onClick={() => setSearchOpen(false)} className="p-2 dark:text-white"><X size={24} /></button>
                <div className="flex-1 relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        autoFocus
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search parties, bills, amounts..." 
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl ring-2 ring-primary focus:ring-4 transition-all text-sm font-bold dark:text-white"
                    />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar">
                {searchResults.length > 0 ? (
                    searchResults.map((res, i) => (
                        <div key={i} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex items-center justify-between group cursor-pointer border border-transparent hover:border-primary/20 transition-all">
                            <div className="flex items-center gap-4">
                                <span className={`text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded-full text-white ${res.resType === 'Voucher' ? 'bg-blue-500' : 'bg-purple-500'}`}>
                                    {res.resType}
                                </span>
                                <div>
                                    <p className="text-sm font-black dark:text-white uppercase tracking-tight">{res.name || res.vNo}</p>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase">{res.partyName || res.type || formatCurrency(res.amount)}</p>
                                </div>
                            </div>
                            <ArrowRight size={16} className="text-gray-300 group-hover:text-primary transition-colors" />
                        </div>
                    ))
                ) : (
                    <div className="text-center py-20 opacity-30 flex flex-col items-center">
                        <Search size={64} className="mb-4" />
                        <p className="font-black uppercase tracking-widest text-xs">Start typing to search...</p>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

const App = () => (
  <BizProvider>
    <Router>
      <AppContent />
    </Router>
  </BizProvider>
);

export default App;
