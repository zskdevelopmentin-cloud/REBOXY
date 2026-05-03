'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useBiz } from '@/context/BizContext';
import { 
  User, Building2, Users, ShieldCheck, 
  Settings, LogOut, ChevronRight, Moon, 
  Sun, Bell, Globe
} from 'lucide-react';

const MorePage = () => {
  const { data, logout, currentUser, migrateToCloud } = useBiz();
  const router = useRouter();

  const menuItems = [
    { 
        id: 'user', 
        name: 'User Management', 
        sub: 'Roles, Permissions & Access', 
        icon: Users, 
        color: 'bg-blue-500 shadow-blue-500/10' 
    },
    { 
        id: 'company', 
        name: 'Company Management', 
        sub: 'Profile, GSTIN & Branding', 
        icon: Building2, 
        color: 'bg-indigo-500 shadow-indigo-500/10' 
    },
    { 
        id: 'team', 
        name: 'Sales Team', 
        sub: 'Target & Check-in Stats', 
        icon: User, 
        color: 'bg-teal-500 shadow-teal-500/10' 
    },
    { 
        id: 'security', 
        name: 'Security & Login', 
        sub: 'Change Admin User & Pass', 
        icon: ShieldCheck, 
        color: 'bg-green-600 shadow-green-600/10',
        path: '/more/security'
    },
    { 
        id: 'app', 
        name: 'App Settings', 
        sub: 'Display, Regional & Time', 
        icon: Settings, 
        color: 'bg-gray-500 shadow-gray-500/10' 
    }
  ];

  return (
    <div className="flex flex-col h-full bg-background dark:bg-gray-950 overflow-y-auto no-scrollbar pb-32">
      {/* Profile Header */}
      <div className="p-6">
        <div className="flex items-center gap-4 p-6 bg-gradient-to-br from-primary to-primary/80 text-white rounded-[2.5rem] shadow-2xl shadow-primary/30 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20 ring-4 ring-white/10">
                <User size={32} />
            </div>
            <div>
                <p className="text-xl font-black uppercase tracking-tighter">{currentUser?.email?.split('@')[0] || 'Admin User'}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Super Admin • ID: 1024</p>
                <span className="inline-block mt-2 text-[8px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full">Pro Enterprise Plan</span>
            </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="px-4 space-y-3">
        {menuItems.map(item => (
            <button 
                key={item.id} 
                onClick={() => item.path ? router.push(item.path) : null}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-50 dark:border-gray-700 shadow-sm active:scale-[0.98] transition-all group"
            >
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-2xl text-white ${item.color} group-hover:scale-110 transition-transform`}>
                        <item.icon size={22} />
                    </div>
                    <div className="text-left">
                        <span className="block text-sm font-black dark:text-white uppercase tracking-tight">{item.name}</span>
                        <span className="block text-[10px] text-gray-500 font-bold uppercase tracking-wider">{item.sub}</span>
                    </div>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
            </button>
        ))}
      </div>

      {/* Preferences Section */}
      <div className="p-6 mt-4">
        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">App Preferences</h4>
        <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-50 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl text-primary">
                        <Moon size={22} />
                    </div>
                    <span className="text-sm font-black dark:text-white uppercase tracking-tight">Dark Mode</span>
                </div>
                <button 
                  className={`w-12 h-6 rounded-full transition-all relative ${data.settings.darkMode ? 'bg-primary' : 'bg-gray-200'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${data.settings.darkMode ? 'left-7' : 'left-1'}`}></div>
                </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-3xl border border-gray-50 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl text-gray-400">
                        <Bell size={22} />
                    </div>
                    <span className="text-sm font-black dark:text-white uppercase tracking-tight">Voucher Notifications</span>
                </div>
                <button className="w-12 h-6 bg-primary rounded-full relative">
                    <div className="absolute top-1 left-7 w-4 h-4 bg-white rounded-full"></div>
                </button>
            </div>
        </div>
      </div>

      <div className="px-6 pb-4">
        <button 
            onClick={migrateToCloud}
            className="w-full flex items-center justify-center gap-3 p-5 text-indigo-500 bg-indigo-50 dark:bg-indigo-900/10 rounded-[2rem] font-black uppercase tracking-widest text-sm active:scale-95 transition-all mb-4 border border-indigo-100 dark:border-indigo-800"
        >
            <Globe size={20} /> Sync to Cloud DB
        </button>
        <button 
            onClick={async () => {
                await logout();
                router.push('/');
            }}
            className="w-full flex items-center justify-center gap-3 p-5 text-red-500 bg-red-50 dark:bg-red-900/10 rounded-[2rem] font-black uppercase tracking-widest text-sm active:scale-95 transition-all"
        >
            <LogOut size={20} /> Logout Account
        </button>
        <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-6">Version 2.5.0 (Build 942)</p>
      </div>
    </div>
  );
};

export default MorePage;
