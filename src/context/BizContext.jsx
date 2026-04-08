import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { generateSeedData, SEED_KEY } from '../utils/seedData';

const BizContext = createContext();

export const BizProvider = ({ children }) => {
  const [data, setData] = useState({
    vouchers: [],
    ledgers: [],
    stock: [],
    users: [],
    settings: {
      company: { name: 'REBOXY TRADERS', gstin: '', address: '' },
      syncTime: new Date().toISOString()
    },
    auth: { username: 'user', password: 'password' }
  });

  const [toasts, setToasts] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initial Load & Auth Sync
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        setCurrentUser(session.user);
        await fetchData();
      } else {
        // Fallback to local if no cloud session
        const saved = localStorage.getItem(SEED_KEY);
        if (saved) setData(JSON.parse(saved));
      }
      setIsLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      setCurrentUser(session?.user || null);
      if (session) fetchData();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
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

  const addToast = (message, type = 'success') => {
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

  const addVoucher = async (voucher) => {
    // Optimistic Update
    setData(prev => ({
      ...prev,
      vouchers: [voucher, ...prev.vouchers]
    }));

    if (isAuthenticated) {
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

  const login = async (email, password) => {
    const { data: { user }, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        addToast(error.message, 'error');
        throw error;
    }
    addToast(`Welcome back, ${user.email}`);
    return user;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    addToast('Logged out from cloud');
  };

  const migrateToCloud = async () => {
    if (!isAuthenticated) return;
    addToast('Migration started...', 'info');
    
    // Push everything to Supabase
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
    setSearchOpen,
    isAuthenticated,
    currentUser,
    login,
    logout,
    isLoading,
    migrateToCloud
  };

  return <BizContext.Provider value={value}>{children}</BizContext.Provider>;
};

export const useBiz = () => useContext(BizContext);
