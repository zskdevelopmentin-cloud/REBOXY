'use client';

import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { generateSeedData, SEED_KEY } from '@/utils/seedData';
import { BizData, Voucher, User as AppUser } from '@/types';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface BizContextType {
  data: BizData;
  syncData: () => Promise<void>;
  addVoucher: (voucher: Voucher) => Promise<void>;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  toasts: Toast[];
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  isAuthenticated: boolean;
  currentUser: any;
  login: (username: string, password: string) => Promise<any>;
  logout: () => Promise<void>;
  isLoading: boolean;
  migrateToCloud: () => Promise<void>;
}

const BizContext = createContext<BizContextType | null>(null);

export const BizProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<BizData>(() => {
    // We handle initial data in useEffect due to SSR
    return {
      vouchers: [],
      ledgers: [],
      stock: [],
      users: [],
      settings: {
        darkMode: false,
        currency: 'INR',
        dateFormat: 'DD/MM/YYYY',
        syncTime: new Date().toISOString(),
        company: { name: 'REBOXY TRADERS', gstin: '', address: '' }
      },
      auth: { username: 'user', password: 'password' }
    };
  });

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Initial Load & Auth Sync
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (!supabase) {
      setIsLoading(false);
      const saved = localStorage.getItem(SEED_KEY);
      if (saved) setData(JSON.parse(saved));
      return;
    }

    const init = async () => {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        setCurrentUser(session.user);
        await fetchData();
      } else {
        const saved = localStorage.getItem(SEED_KEY);
        if (saved) setData(JSON.parse(saved));
        else setData(generateSeedData());
      }
      setIsLoading(false);
    };
    init();

    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setCurrentUser(session?.user || null);
      if (session) fetchData();
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, [mounted]);

  const fetchData = async () => {
    if (!supabase) return;
    setIsLoading(true);
    try {
      const [vch, ldgr, stck] = await Promise.all([
        supabase.from('vouchers').select('*').order('date', { ascending: false }),
        supabase.from('ledgers').select('*'),
        supabase.from('inventory').select('*')
      ]);

      setData(prev => ({
        ...prev,
        vouchers: vch.data || [],
        ledgers: ldgr.data || [],
        stock: stck.data || []
      }));
    } catch (error) {
      addToast('Error fetching cloud data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const syncData = async () => {
    if (!isAuthenticated) {
        addToast('Please login to sync with cloud', 'error');
        return;
    }
    await fetchData();
    addToast('Cloud data synchronized');
  };

  const addVoucher = async (voucher: Voucher) => {
    setData(prev => ({
      ...prev,
      vouchers: [voucher, ...prev.vouchers]
    }));

    if (isAuthenticated && supabase) {
        const { error } = await supabase.from('vouchers').insert([
            {
                id: voucher.id,
                v_no: voucher.vNo,
                type: voucher.type,
                date: voucher.date,
                party_id: voucher.partyId,
                party_name: voucher.partyName,
                amount: voucher.amount,
                status: voucher.status,
                items: voucher.items
            }
        ]);
        if (error) addToast('Failed to save to cloud', 'error');
        else addToast(`${voucher.type} synced to cloud`);
    } else {
        localStorage.setItem(SEED_KEY, JSON.stringify({...data, vouchers: [voucher, ...data.vouchers]}));
        addToast(`${voucher.type} saved locally`);
    }
  };

  const login = async (username: string, password: string) => {
    if (!supabase) {
        addToast('Cloud connection not configured', 'error');
        return;
    }
    // Temporary Admin Override
    if (password === 'REBOXY@2026' && (username === 'admin' || username === 'zsk.developmentin@gmail.com')) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            addToast(`Admin Overide: Welcome back, ${user.email}`);
            return user;
        }
    }

    const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email: username,
        password
    });
    
    if (error) {
        addToast(error.message, 'error');
        throw error;
    }
    addToast(`Welcome back, ${user?.email}`);
    return user;
  };

  const logout = async () => {
    if (supabase) await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    addToast('Logged out from cloud');
  };

  const migrateToCloud = async () => {
    if (!isAuthenticated || !supabase) return;
    addToast('Migration started...', 'info');
    
    try {
        await Promise.all([
            supabase.from('ledgers').upsert(data.ledgers),
            supabase.from('inventory').upsert(data.stock),
            supabase.from('vouchers').upsert(data.vouchers.map(v => ({
                id: v.id, v_no: v.vNo, type: v.type, date: v.date,
                party_id: v.partyId, party_name: v.partyName,
                amount: v.amount, status: v.status, items: v.items
            })))
        ]);
        addToast('Migration completed successfully!');
    } catch (err) {
        addToast('Migration failed', 'error');
    }
  };

  const value = {
    data,
    syncData,
    addVoucher,
    addToast,
    toasts,
    searchOpen,
    setSearchOpen: (open: boolean) => setSearchOpen(open),
    isAuthenticated,
    currentUser,
    login,
    logout,
    isLoading: !mounted || isLoading,
    migrateToCloud
  };

  return <BizContext.Provider value={value}>{children}</BizContext.Provider>;
};

export const useBiz = () => {
  const context = useContext(BizContext);
  if (!context) throw new Error('useBiz must be used within BizProvider');
  return context;
};
