'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { BizData } from '@/types';

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
  refreshDashboard: () => Promise<void>;
  // Legacy properties to prevent build errors on older pages
  data: BizData;
  syncData: () => Promise<void>;
  addVoucher: (voucher: any) => Promise<void>;
  migrateToCloud: () => Promise<void>;
}

const BizContext = createContext<BizContextType | null>(null);

export const BizProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setCurrentUser(data.user);
          setIsAuthenticated(true);
          await refreshDashboard();
        }
      } catch (error) {
        console.error('Auth check failed', error);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  const refreshDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        setDashboardData(await res.json());
      }
    } catch (error) {
      console.error('Failed to refresh dashboard', error);
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
    await refreshDashboard();
    return data.user;
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setCurrentUser(null);
    setDashboardData(null);
    addToast('Logged out successfully');
  };

  // Legacy dummy data to prevent build/runtime errors on unmigrated pages
  const fallbackData = {
    vouchers: dashboardData?.recentVouchers || [],
    ledgers: [],
    stock: [],
    users: [],
    settings: {
      company: { name: 'REBOXY', gstin: '', address: '' },
      darkMode: false,
      currency: 'INR',
      dateFormat: 'DD/MM/YYYY',
      syncTime: new Date().toISOString()
    },
    auth: { username: '', password: '' }
  };

  const syncData = async () => {};
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
    data: fallbackData,
    syncData,
    addVoucher,
    migrateToCloud
  };

  return <BizContext.Provider value={value}>{children}</BizContext.Provider>;
};

export const useBiz = () => {
  const context = useContext(BizContext);
  if (!context) throw new Error('useBiz must be used within BizProvider');
  return context;
};
