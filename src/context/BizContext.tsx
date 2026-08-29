'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { BizData } from '@/types';

export type DatePreset = 'Today' | 'Yesterday' | 'This Week' | 'Previous Week' | 'This Month' | 'Previous Month' | 'This Quarter' | 'Financial Year' | 'Custom';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface BizContextType {
  toasts: Toast[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  isAuthenticated: boolean;
  currentUser: any;
  login: (username: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  isLoading: boolean;
  dashboardData: any;
  refreshDashboard: (overrideStart?: string, overrideEnd?: string) => Promise<void>;
  data: BizData;
  syncData: () => Promise<void>;
  addVoucher: (voucher: any) => Promise<void>;
  migrateToCloud: () => Promise<void>;
  
  // Global Date Filter State
  datePreset: DatePreset;
  startDate: string;
  endDate: string;
  setDateRange: (preset: DatePreset, customStart?: string, customEnd?: string) => Promise<void>;
}

const BizContext = createContext<BizContextType | null>(null);

export const BizProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [fullReportData, setFullReportData] = useState<any>({ ledgers: [], vouchers: [], stock: [] });

  // Global Date Filter State - Defaults to Today matching Biz Analyst mobile UI
  const [datePreset, setDatePresetState] = useState<DatePreset>('Today');
  const [startDate, setStartDateState] = useState<string>('2026-08-29');
  const [endDate, setEndDateState] = useState<string>('2026-08-29');

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
          setIsAuthenticated(true);
          await refreshDashboard('2026-08-29', '2026-08-29');
        }
      } catch (error) {
        console.error('Auth check failed', error);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const setDateRange = async (preset: DatePreset, customStart?: string, customEnd?: string) => {
    setDatePresetState(preset);
    let s = '2026-08-29';
    let e = '2026-08-29';

    const today = new Date('2026-08-29');
    if (preset === 'Today') {
      s = '2026-08-29';
      e = s;
    } else if (preset === 'Yesterday') {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      s = y.toISOString().split('T')[0];
      e = s;
    } else if (preset === 'This Month') {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      s = first.toISOString().split('T')[0];
      e = today.toISOString().split('T')[0];
    } else if (preset === 'Financial Year') {
      s = '2026-04-01';
      e = '2027-03-31';
    } else if (preset === 'Custom' && customStart && customEnd) {
      s = customStart;
      e = customEnd;
    }

    setStartDateState(s);
    setEndDateState(e);
    await refreshDashboard(s, e);
  };

  const refreshDashboard = async (overrideStart?: string, overrideEnd?: string) => {
    const s = overrideStart || startDate;
    const e = overrideEnd || endDate;
    try {
      const params = new URLSearchParams({ startDate: s, endDate: e });
      const [dashRes, reportsRes] = await Promise.all([
        fetch(`/api/dashboard?${params.toString()}`),
        fetch(`/api/reports/all?${params.toString()}`)
      ]);

      if (dashRes.ok) {
        setDashboardData(await dashRes.json());
      } else {
        setDashboardData({ sales: 0, purchases: 0, receivables: 0, payables: 0, recentVouchers: [] });
      }

      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setFullReportData(reportsData);
      }
    } catch (error) {
      console.error('Failed to refresh dashboard', error);
      setDashboardData({ sales: 0, purchases: 0, receivables: 0, payables: 0, recentVouchers: [] });
    }
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const login = async (username: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!res.ok) {
      const errorData = await res.json();
      addToast(errorData.error || 'Login failed', 'error');
      throw new Error(errorData.error);
    }

    const data = await res.json();
    setCurrentUser(data.user);
    setIsAuthenticated(true);
    addToast(`Welcome back, ${data.user.name || data.user.email}`);
    await refreshDashboard(startDate, endDate);
    return data.user;
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setCurrentUser(null);
    setDashboardData(null);
    setFullReportData({ ledgers: [], vouchers: [], stock: [] });
    addToast('Logged out successfully');
  };

  const activeData: BizData = {
    vouchers: fullReportData.vouchers?.length ? fullReportData.vouchers : (dashboardData?.recentVouchers || []),
    ledgers: fullReportData.ledgers || [],
    stock: fullReportData.stock || [],
    users: [],
    settings: {
      company: fullReportData.company || { name: 'SUPREME FOOTCARE', gstin: '', address: '' },
      darkMode: false,
      currency: 'INR',
      dateFormat: 'DD/MM/YYYY',
      syncTime: new Date().toISOString()
    },
    auth: { username: '', password: '' }
  };

  const syncData = async () => {
    await refreshDashboard(startDate, endDate);
  };
  const addVoucher = async () => {};
  const migrateToCloud = async () => {};

  const value = {
    toasts,
    addToast,
    searchOpen,
    setSearchOpen: (open: boolean) => setSearchOpen(open),
    isAuthenticated,
    currentUser,
    login,
    logout,
    isLoading,
    dashboardData,
    refreshDashboard,
    data: activeData,
    syncData,
    addVoucher,
    migrateToCloud,
    datePreset,
    startDate,
    endDate,
    setDateRange
  };

  return <BizContext.Provider value={value}>{children}</BizContext.Provider>;
};

export const useBiz = () => {
  const context = useContext(BizContext);
  if (!context) throw new Error('useBiz must be used within BizProvider');
  return context;
};
