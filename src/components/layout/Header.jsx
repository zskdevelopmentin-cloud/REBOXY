import React, { useState } from 'react';
import { useBiz } from '../../context/BizContext';
import { RefreshCw, Search, ChevronDown, Bell } from 'lucide-react';
import { getRelativeTime } from '../../utils/formatters';

const Header = () => {
  const { data, syncData, addToast } = useBiz();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncData();
    setIsSyncing(false);
  };

  return (
    <header className="p-4 flex items-center justify-between border-b dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-[1rem] flex items-center justify-center text-white shadow-lg shadow-primary/20 rotate-3">
          <span className="font-black text-xl italic leading-none">R</span>
        </div>
        <div>
          <div className="flex items-center gap-1 cursor-pointer">
            <h1 className="font-black text-sm dark:text-white uppercase tracking-tighter leading-tight">
              {data.settings.company.name}
            </h1>
            <ChevronDown size={14} className="text-gray-400" />
          </div>
          <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
            Last synced: {getRelativeTime(data.settings.syncTime)}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <button 
          onClick={handleSync}
          className={`p-2.5 rounded-2xl transition-all shadow-sm ${
            isSyncing ? 'animate-spin text-primary bg-primary/10' : 'text-gray-500 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100'
          }`}
        >
          <RefreshCw size={20} />
        </button>
        <button 
          onClick={() => setSearchOpen(true)}
          className="p-2.5 text-gray-500 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 rounded-2xl shadow-sm transition-all active:scale-90"
        >
          <Search size={20} />
        </button>
        <div className="w-9 h-9 rounded-2xl bg-accent text-white flex items-center justify-center font-black text-xs ring-4 ring-accent/10 shadow-lg shadow-accent/20 cursor-pointer">
          AD
        </div>
      </div>
    </header>
  );
};

export default Header;
