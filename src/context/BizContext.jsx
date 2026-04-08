import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { generateSeedData, SEED_KEY } from '../utils/seedData';

const BizContext = createContext();

export const BizProvider = ({ children }) => {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem(SEED_KEY);
    return saved ? JSON.parse(saved) : generateSeedData();
  });

  const [toasts, setToasts] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('reboxy_auth') === 'true';
  });
  const [currentUser, setCurrentUser] = useState(() => {
    const user = localStorage.getItem('reboxy_user');
    return user ? JSON.parse(user) : null;
  });

  useEffect(() => {
    localStorage.setItem(SEED_KEY, JSON.stringify(data));
  }, [data]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const syncData = () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setData(prev => ({
          ...prev,
          settings: {
            ...prev.settings,
            syncTime: new Date().toISOString()
          }
        }));
        addToast('Data synced successfully');
        resolve();
      }, 1500);
    });
  };

  const addVoucher = (voucher) => {
    setData(prev => ({
      ...prev,
      vouchers: [voucher, ...prev.vouchers]
    }));
    addToast(`${voucher.type} created successfully`);
  };

  const updateSettings = (newSettings) => {
    setData(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  };

  const deleteUser = (id) => {
    setData(prev => ({
      ...prev,
      users: prev.users.filter(u => u.id !== id)
    }));
    addToast('User deleted');
  };

  const login = (username, password) => {
    return new Promise((resolve, reject) => {
      // Direct simple credentials check
      if (username === 'user' && password === 'password') {
        const adminUser = data.users[0]; // Default to first seeded user
        setIsAuthenticated(true);
        setCurrentUser(adminUser);
        localStorage.setItem('reboxy_auth', 'true');
        localStorage.setItem('reboxy_user', JSON.stringify(adminUser));
        addToast(`Welcome back, ${adminUser.name}`);
        resolve(adminUser);
      } else {
        addToast('Invalid user or password', 'error');
        reject(new Error('Invalid credentials'));
      }
    });
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('reboxy_auth');
    localStorage.removeItem('reboxy_user');
    addToast('Logged out safely');
  };

  const value = {
    data,
    setData,
    syncData,
    addVoucher,
    updateSettings,
    deleteUser,
    addToast,
    toasts,
    searchOpen,
    setSearchOpen,
    isAuthenticated,
    currentUser,
    login,
    logout
  };

  return <BizContext.Provider value={value}>{children}</BizContext.Provider>;
};

export const useBiz = () => {
  const context = useContext(BizContext);
  if (!context) throw new Error('useBiz must be used within a BizProvider');
  return context;
};
