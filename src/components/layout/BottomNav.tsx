'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BarChart3, PlusSquare, Clock, Menu } from 'lucide-react';

const BottomNav = () => {
  const pathname = usePathname();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports' },
    { id: 'entries', label: 'Entries', icon: PlusSquare, path: '/entries' },
    { id: 'outstanding', label: 'Outstanding', icon: Clock, path: '/outstanding' },
    { id: 'more', label: 'More', icon: Menu, path: '/more' }
  ];

  return (
    <nav className="fixed bottom-0 w-full max-w-[420px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-t dark:border-gray-800 px-4 py-3 pb-6 flex justify-between items-center z-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
      {tabs.map((tab) => {
        const isActive = tab.path === '/' 
            ? pathname === '/' 
            : pathname.startsWith(tab.path);

        return (
          <Link
            key={tab.id}
            href={tab.path}
            className={`flex flex-col items-center gap-1.5 transition-all relative ${
                isActive ? 'text-primary' : 'text-gray-400'
            }`}
          >
            {isActive && <div className="absolute -top-3 w-1.5 h-1.5 bg-primary rounded-full blur-[1px]"></div>}
            <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-primary/10 scale-110 shadow-inner' : ''}`}>
              <tab.icon size={22} />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-tighter ${isActive ? 'opacity-100' : 'opacity-60'}`}>
              {tab.id}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

export default BottomNav;
