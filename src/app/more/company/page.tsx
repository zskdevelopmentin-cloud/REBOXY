'use client';

import React, { useState, useEffect } from 'react';
import { useBiz } from '@/context/BizContext';
import { ChevronLeft, Building2, Save, FileText, MapPin, Calendar, CheckCircle, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CompanyManagementPage() {
  const { addToast } = useBiz();
  const router = useRouter();

  const [company, setCompany] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [financialYear, setFinancialYear] = useState('');

  const fetchCompany = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/companies');
      if (!res.ok) {
        addToast('Failed to fetch company details', 'error');
        return;
      }
      const data = await res.json();
      const comp = data.companies?.[0] || null;
      if (comp) {
        setCompany(comp);
        setName(comp.name || '');
        setGstin(comp.gstin || '');
        setAddress(comp.address || '');
        setFinancialYear(comp.financialYear || '2026-2027');
      }
    } catch (error) {
      console.error('Fetch company error:', error);
      addToast('Error loading company data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || isSaving) return;

    setIsSaving(true);
    try {
      const res = await fetch('/api/companies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: company.id,
          name,
          gstin,
          address,
          financialYear
        })
      });

      const responseData = await res.json();
      if (!res.ok) {
        addToast(responseData.error || 'Failed to update company', 'error');
        return;
      }

      addToast('Company profile updated successfully', 'success');
      await fetchCompany();
    } catch (error) {
      console.error('Update company error:', error);
      addToast('Failed to connect to server', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 font-inter animate-in slide-in-from-right duration-300 pb-24">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-white dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
            <ChevronLeft size={24} className="text-gray-500" />
          </button>
          <div>
            <h1 className="text-lg font-black dark:text-white uppercase tracking-tighter">Company Profile</h1>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Business Branding & Details</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6 flex-1 overflow-y-auto no-scrollbar">
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Company Profile...</p>
          </div>
        ) : company ? (
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* Header Banner */}
            <div className="p-6 bg-gradient-to-br from-indigo-600 to-primary rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/20">
                  <Building2 size={32} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">{company.name}</h2>
                  <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest mt-0.5">
                    {company.tallyConnected ? 'Tally Connected Company' : 'Standalone Company'}
                  </p>
                </div>
              </div>
            </div>

            {/* Profile Form Fields */}
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-5 shadow-sm">
              
              <div>
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 block">Company Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 block">GSTIN / Tax Identification</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={gstin}
                    onChange={e => setGstin(e.target.value)}
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 block">Registered Address</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-4 text-gray-400" size={18} />
                  <textarea
                    rows={3}
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    placeholder="Full business street address, city, pin code"
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 block">Financial Year</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={financialYear}
                    onChange={e => setFinancialYear(e.target.value)}
                    placeholder="e.g. 2026-2027"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-sm font-bold dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-5 bg-primary text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/30 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save size={18} /> Save Company Configuration
                </>
              )}
            </button>
          </form>
        ) : null}

        {/* Tally Sync Architecture & Status Section */}
        <TallySyncStatusSection companyId={company?.id} />
      </div>
    </div>
  );
}

function TallySyncStatusSection({ companyId }: { companyId?: string }) {
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSyncStatus = async () => {
    if (!companyId) return;
    try {
      const res = await fetch(`/api/sync/status?companyId=${encodeURIComponent(companyId)}`);
      if (res.ok) {
        const data = await res.json();
        setSyncStatus(data);
      }
    } catch (err) {
      console.error('Failed to fetch sync status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSyncStatus();
    const interval = setInterval(fetchSyncStatus, 15000);
    return () => clearInterval(interval);
  }, [companyId]);

  if (isLoading || !syncStatus) return null;

  const isConnected = syncStatus.tallyConnected;
  const statusColor = syncStatus.lastSyncStatus === 'SUCCESS' ? 'text-emerald-500 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20' : 
                      syncStatus.lastSyncStatus === 'FAILED' ? 'text-red-500 bg-red-50 border-red-200 dark:bg-red-900/20' : 
                      'text-amber-500 bg-amber-50 border-amber-200 dark:bg-amber-900/20';

  const metrics = syncStatus.lastSyncDetails || {};

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-black dark:text-white uppercase tracking-tight">Tally Sync Architecture</h3>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Incremental & Idempotent Sync Pipeline</p>
        </div>
        <div className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${statusColor}`}>
          {isConnected ? 'Connected' : 'Offline'} • {syncStatus.lastSyncStatus}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Last Sync Time</span>
          <span className="text-xs font-bold dark:text-white">
            {syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Never'}
          </span>
        </div>
        <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">Sync Cursor (AlterID)</span>
          <span className="text-xs font-bold text-primary">#{syncStatus.lastAlterId || 0}</span>
        </div>
      </div>

      {metrics.recordsReceived !== undefined && (
        <div className="pt-2">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Last Batch Metrics</span>
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl">
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{metrics.recordsCreated || 0}</span>
              <span className="text-[8px] font-bold text-gray-500 uppercase block">Created</span>
            </div>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-xl">
              <span className="text-xs font-black text-blue-600 dark:text-blue-400">{metrics.recordsUpdated || 0}</span>
              <span className="text-[8px] font-bold text-gray-500 uppercase block">Updated</span>
            </div>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl">
              <span className="text-xs font-black text-amber-600 dark:text-amber-400">{metrics.recordsSkipped || 0}</span>
              <span className="text-[8px] font-bold text-gray-500 uppercase block">Skipped</span>
            </div>
            <div className="p-2 bg-red-50 dark:bg-red-950/40 rounded-xl">
              <span className="text-xs font-black text-red-600 dark:text-red-400">{metrics.recordsDeleted || 0}</span>
              <span className="text-[8px] font-bold text-gray-500 uppercase block">Deleted</span>
            </div>
          </div>
        </div>
      )}

      {syncStatus.lastSyncError && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold">
          Sync Error: {syncStatus.lastSyncError}
        </div>
      )}
    </div>
  );
}

