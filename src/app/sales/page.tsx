'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Calendar, Search, ChevronRight, ChevronLeft,
  DollarSign, Share2, X, Package, Users, Layers, FileText
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';

type DatePreset = 'Today' | 'Yesterday' | 'This Week' | 'This Month' | 'Previous Month' | 'This Quarter' | 'Financial Year' | 'Custom';
type GroupByOption = 'party' | 'item' | 'itemGroup' | 'voucher' | 'date' | 'month';
type SortOption = 'highest' | 'lowest' | 'nameAsc' | 'nameDesc';

import { useBiz } from '@/context/BizContext';

export default function SalesPage() {
  const { datePreset, startDate, endDate, setDateRange } = useBiz();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [mode, setMode] = useState<'net' | 'gross'>('net');
  const [groupBy, setGroupBy] = useState<GroupByOption>('party');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortOption>('highest');

  const [salesData, setSalesData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Drill-down State
  const [selectedLedger, setSelectedLedger] = useState<any>(null);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [voucherDetail, setVoucherDetail] = useState<any>(null);
  const [loadingVoucher, setLoadingVoucher] = useState(false);

  const handlePresetChange = (preset: DatePreset) => {
    setDateRange(preset);
  };

  const shiftDay = (days: number) => {
    const s = new Date(startDate);
    s.setDate(s.getDate() + days);
    const e = new Date(endDate);
    e.setDate(e.getDate() + days);
    setDateRange('Custom', s.toISOString().split('T')[0], e.toISOString().split('T')[0]);
  };

  // Fetch Sales Data API
  const fetchSalesData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiGroupBy = groupBy === 'party' ? 'ledger' : groupBy;
      const params = new URLSearchParams({
        startDate,
        endDate,
        groupBy: apiGroupBy,
        search,
        sort
      });
      const res = await fetch(`/api/reports/sales?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch sales report');
      const data = await res.json();
      setSalesData(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to load Sales data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSalesData();
  }, [startDate, endDate, groupBy, search, sort]);

  // Fetch Single Voucher Detail for Drill-down
  const openVoucherDetail = async (vId: string) => {
    setSelectedVoucherId(vId);
    setLoadingVoucher(true);
    try {
      const res = await fetch(`/api/reports/sales?voucherId=${vId}`);
      if (res.ok) {
        const data = await res.json();
        setVoucherDetail(data.voucher);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVoucher(false);
    }
  };

  const summary = salesData?.summary || { grossSales: 0, creditNotes: 0, netSales: 0, voucherCount: 0 };
  const groupedData = salesData?.groupedData || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 font-inter text-gray-900 dark:text-gray-100 pb-24 animate-in fade-in duration-300">
      
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <ArrowLeft size={20} className="dark:text-white" />
          </Link>
          <div>
            <h1 className="text-base font-black tracking-tight uppercase">SUPREME FOOTCARE</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Tally Realtime Sales Analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            <Share2 size={18} />
          </button>
        </div>
      </header>

      {/* Biz Analyst Primary Main Tabs: Items vs Party */}
      <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setGroupBy('item')}
            className={`py-3 px-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider transition-all border ${
              groupBy === 'item' || groupBy === 'itemGroup'
                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
            }`}
          >
            <Package size={18} />
            <span>Items</span>
          </button>

          <button
            onClick={() => setGroupBy('party')}
            className={`py-3 px-4 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider transition-all border ${
              groupBy === 'party'
                ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
            }`}
          >
            <Users size={18} />
            <span>Party</span>
          </button>
        </div>

        {/* Secondary Sub-Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-1 no-scrollbar">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest pr-1">Filter By:</span>
          {[
            { id: 'party', label: 'All Parties' },
            { id: 'item', label: 'All Items' },
            { id: 'itemGroup', label: 'Item Groups' },
            { id: 'voucher', label: 'Vouchers' },
            { id: 'date', label: 'By Date' },
            { id: 'month', label: 'By Month' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setGroupBy(tab.id as GroupByOption)}
              className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all ${
                groupBy === tab.id
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Selector Navigation Bar */}
        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/60 p-2 rounded-2xl border border-gray-100 dark:border-gray-800">
          <button onClick={() => shiftDay(-1)} className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-colors">
            <ChevronLeft size={18} />
          </button>

          <button 
            onClick={() => setShowDatePicker(!showDatePicker)}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-200 hover:text-primary transition-colors"
          >
            <Calendar size={14} className="text-primary" />
            <span>{formatDate(startDate)} {startDate !== endDate ? `to ${formatDate(endDate)}` : ''} ({datePreset})</span>
          </button>

          <button onClick={() => shiftDay(1)} className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-white dark:hover:bg-gray-700 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Date Range Selector Drawer Modal */}
      {showDatePicker && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 space-y-3 animate-in slide-in-from-top duration-200">
          <div className="flex justify-between items-center">
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Select Date Preset</span>
            <button onClick={() => setShowDatePicker(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(['Today', 'Yesterday', 'This Week', 'This Month', 'Previous Month', 'This Quarter', 'Financial Year'] as DatePreset[]).map(preset => (
              <button
                key={preset}
                onClick={() => { handlePresetChange(preset); setShowDatePicker(false); }}
                className={`py-2 px-2 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all ${
                  datePreset === preset 
                    ? 'bg-primary text-white border-primary shadow-md' 
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center pt-2">
            <input 
              type="date" 
              value={startDate} 
              onChange={e => { setStartDate(e.target.value); setDatePreset('Custom'); }}
              className="flex-1 p-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700" 
            />
            <span className="text-xs font-bold text-gray-400">to</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={e => { setEndDate(e.target.value); setDatePreset('Custom'); }}
              className="flex-1 p-2 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700" 
            />
          </div>
        </div>
      )}

      <div className="p-4 space-y-4">

        {/* Sales Summary KPI Section */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                {mode === 'net' ? 'Total Net Sales' : 'Total Gross Sales'}
              </p>
              <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mt-0.5">
                {formatCurrency(mode === 'net' ? summary.netSales : summary.grossSales)}
              </h2>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
                Selected Group: <span className="text-primary uppercase font-black">{groupBy}</span>
              </p>
            </div>

            {/* Gross / Net Selector */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setMode('net')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  mode === 'net' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                }`}
              >
                Net
              </button>
              <button
                onClick={() => setMode('gross')}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  mode === 'gross' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
                }`}
              >
                Gross
              </button>
            </div>
          </div>

          {/* Reconciled Summary Grid */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-center">
            <div className="p-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl">
              <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Gross Sales</p>
              <p className="text-sm font-black text-blue-950 dark:text-blue-200 mt-0.5">{formatCurrency(summary.grossSales)}</p>
            </div>
            <div className="p-2 bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl">
              <p className="text-[9px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Credit Note</p>
              <p className="text-sm font-black text-orange-950 dark:text-orange-200 mt-0.5">{formatCurrency(summary.creditNotes)}</p>
            </div>
            <div className="p-2 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl">
              <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Net Sales</p>
              <p className="text-sm font-black text-emerald-950 dark:text-emerald-200 mt-0.5">{formatCurrency(summary.netSales)}</p>
            </div>
          </div>
        </div>

        {/* Controls Bar: Search & Sort */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${groupBy}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={sort}
            onChange={e => setSort(e.target.value as SortOption)}
            className="p-2.5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer"
          >
            <option value="highest">Highest Sales</option>
            <option value="lowest">Lowest Sales</option>
            <option value="nameAsc">Name A-Z</option>
            <option value="nameDesc">Name Z-A</option>
          </select>
        </div>

        {/* Grouped Categorised List View */}
        {isLoading ? (
          <div className="text-center py-16 space-y-3">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Sales Analytics...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-3xl border border-red-100 p-6 space-y-3">
            <p className="text-sm font-bold text-red-500 uppercase tracking-wide">{error}</p>
            <button onClick={fetchSalesData} className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider">
              Retry
            </button>
          </div>
        ) : groupedData.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-6 opacity-60">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">No records found for the selected view.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {groupedData.map((item: any) => (
              <div
                key={item.id}
                onClick={() => {
                  if (groupBy === 'voucher') {
                    openVoucherDetail(item.id);
                  } else {
                    setSelectedLedger(item);
                  }
                }}
                className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between active:scale-[0.99] transition-all cursor-pointer group hover:border-primary/40"
              >
                <div className="flex items-center gap-3 max-w-[65%]">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 font-black text-sm uppercase shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                    {item.name[0]}
                  </div>
                  <div className="truncate">
                    <h4 className="text-sm font-black dark:text-white uppercase tracking-tight truncate">{item.name}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5 tracking-wider">
                      {item.voucherCount} Voucher{item.voucherCount > 1 ? 's' : ''} {item.quantity > 0 ? `• ${item.quantity} Qty` : ''}
                    </p>
                  </div>
                </div>

                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="text-sm font-black text-gray-900 dark:text-white">
                      {formatCurrency(mode === 'net' ? item.netSales : item.grossSales)}
                    </p>
                    {item.creditNotes > 0 && (
                      <p className="text-[9px] text-orange-600 font-bold uppercase mt-0.5">
                        Return: {formatCurrency(item.creditNotes)}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Ledger Sales Drill-Down Modal */}
      {selectedLedger && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 h-full overflow-y-auto p-4 space-y-4 animate-in slide-in-from-right duration-300">
            <header className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedLedger(null)} className="p-2 -ml-2 text-gray-400 hover:text-gray-600">
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h3 className="text-base font-black dark:text-white uppercase tracking-tight truncate">{selectedLedger.name}</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Sales Detail</p>
                </div>
              </div>
              <button onClick={() => setSelectedLedger(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </header>

            {/* Category Summary Card */}
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 space-y-2">
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                <span>Gross Sales</span>
                <span className="font-black text-gray-900 dark:text-white">{formatCurrency(selectedLedger.grossSales)}</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-wider">
                <span>Credit Notes</span>
                <span className="font-black text-orange-600">{formatCurrency(selectedLedger.creditNotes)}</span>
              </div>
              <div className="flex justify-between text-sm font-black text-gray-900 dark:text-white border-t border-primary/10 pt-2 uppercase tracking-tight">
                <span>Net Sales</span>
                <span className="text-primary">{formatCurrency(selectedLedger.netSales)}</span>
              </div>
            </div>

            {/* Related Transactions List */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">Transactions</h4>
              {salesData?.vouchers
                ?.filter((v: any) => v.partyName === selectedLedger.name || v.partyId === selectedLedger.id)
                .map((v: any) => (
                  <div
                    key={v.id}
                    onClick={() => openVoucherDetail(v.id)}
                    className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between cursor-pointer hover:border-primary/40 transition-all"
                  >
                    <div>
                      <p className="text-xs font-black dark:text-white uppercase tracking-tight">{v.vNo}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{formatDate(v.date)} • {v.type}</p>
                    </div>
                    <p className={`text-xs font-black ${v.type?.toLowerCase().includes('credit') ? 'text-orange-600' : 'text-green-600'}`}>
                      {formatCurrency(v.amount)}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Invoice Voucher Detail Modal */}
      {selectedVoucherId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            
            <header className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-3">
              <div>
                <h3 className="text-base font-black dark:text-white uppercase tracking-tight">Invoice Details</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{voucherDetail?.vNo || selectedVoucherId}</p>
              </div>
              <button onClick={() => { setSelectedVoucherId(null); setVoucherDetail(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </header>

            {loadingVoucher ? (
              <div className="py-12 text-center space-y-2">
                <div className="w-6 h-6 border-3 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fetching Voucher Details...</p>
              </div>
            ) : voucherDetail ? (
              <div className="space-y-4">
                
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Voucher No:</span>
                    <span className="font-black dark:text-white">{voucherDetail.vNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Date:</span>
                    <span className="font-bold dark:text-white">{formatDate(voucherDetail.date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Type:</span>
                    <span className="font-bold text-primary">{voucherDetail.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400 font-bold uppercase tracking-wider">Party:</span>
                    <span className="font-black dark:text-white">{voucherDetail.party?.name || 'Cash'}</span>
                  </div>
                </div>

                {voucherDetail.items && voucherDetail.items.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-400">Line Items</h4>
                    <div className="divide-y divide-gray-100 dark:divide-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
                      {voucherDetail.items.map((vi: any) => (
                        <div key={vi.id} className="p-3 bg-white dark:bg-gray-900 flex justify-between items-center text-xs">
                          <div>
                            <p className="font-black dark:text-white uppercase tracking-tight">{vi.description || vi.item?.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">{vi.quantity} Qty @ {formatCurrency(vi.rate)}</p>
                          </div>
                          <p className="font-black dark:text-white">{formatCurrency(vi.amount)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="p-4 bg-primary text-white rounded-2xl flex justify-between items-center shadow-lg shadow-primary/20">
                  <span className="text-xs font-black uppercase tracking-widest">Total Invoice Amount</span>
                  <span className="text-xl font-black">{formatCurrency(voucherDetail.amount)}</span>
                </div>

              </div>
            ) : null}

          </div>
        </div>
      )}

    </div>
  );
}
