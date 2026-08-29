'use client';

import React, { useState } from 'react';
import { useBiz, DatePreset } from '@/context/BizContext';
import { RefreshCw, Search, ChevronDown, Calendar, X } from 'lucide-react';
import { getRelativeTime, formatDate } from '@/utils/formatters';

const Header = () => {
  const { data, syncData, setSearchOpen, currentUser, datePreset, startDate, endDate, setDateRange } = useBiz();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  const handleSync = async () => {
    setIsSyncing(true);
    await syncData();
    setIsSyncing(false);
  };

  const initials = currentUser?.email
    ? currentUser.email.substring(0, 2).toUpperCase()
    : 'AD';

  const handlePreset = async (preset: DatePreset) => {
    setShowDatePicker(false);
    await setDateRange(preset);
  };

  const applyCustom = async () => {
    setShowDatePicker(false);
    await setDateRange('Custom', customStart, customEnd);
  };

  return (
    <>
      <header className="px-4 py-3 flex items-center justify-between border-b dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md sticky top-0 z-40">
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
          {/* Prominent Global Date Filter Button */}
          <button 
            onClick={() => setShowDatePicker(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
          >
            <Calendar size={14} />
            <span>{datePreset === 'Custom' ? `${formatDate(startDate)}` : datePreset}</span>
            <ChevronDown size={12} />
          </button>

          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className={`p-2.5 rounded-2xl transition-all shadow-sm ${
              isSyncing ? 'animate-spin text-primary bg-primary/10' : 'text-gray-500 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100'
            }`}
          >
            <RefreshCw size={18} />
          </button>
          
          <button 
            onClick={() => setSearchOpen(true)}
            className="p-2.5 text-gray-500 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 rounded-2xl shadow-sm transition-all active:scale-90"
          >
            <Search size={18} />
          </button>
          
          <div className="w-9 h-9 rounded-2xl bg-accent text-white flex items-center justify-center font-black text-xs ring-4 ring-accent/10 shadow-lg shadow-accent/20 cursor-pointer">
            {initials}
          </div>
        </div>
      </header>

      {/* Global Date Range Selector Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 pt-16 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-sm font-black dark:text-white uppercase tracking-tight">Select Filter Date</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Updates Dashboard & Sales Metrics</p>
              </div>
              <button onClick={() => setShowDatePicker(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(['Today', 'Yesterday', 'This Month', 'Financial Year'] as DatePreset[]).map(preset => (
                <button
                  key={preset}
                  onClick={() => handlePreset(preset)}
                  className={`py-3 px-3 text-xs font-black uppercase tracking-wider rounded-2xl border transition-all ${
                    datePreset === preset 
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-800">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Custom Date Range</span>
              <div className="flex gap-2 items-center">
                <input 
                  type="date" 
                  value={customStart} 
                  onChange={e => setCustomStart(e.target.value)}
                  className="flex-1 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700" 
                />
                <span className="text-xs font-bold text-gray-400">to</span>
                <input 
                  type="date" 
                  value={customEnd} 
                  onChange={e => setCustomEnd(e.target.value)}
                  className="flex-1 p-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700" 
                />
              </div>
              <button 
                onClick={applyCustom}
                className="w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl text-xs font-black uppercase tracking-wider shadow-md mt-2"
              >
                Apply Custom Range
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
};

export default Header;
