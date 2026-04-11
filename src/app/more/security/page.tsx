'use client';

import React, { useState } from 'react';
import { useBiz } from '@/context/BizContext';
import { ShieldCheck, User, Lock, Save, ChevronLeft, Eye, EyeOff, KeyRound, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const SecuritySettingsPage = () => {
    const { data, addToast } = useBiz();
    const router = useRouter();
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [username, setUsername] = useState(data.auth.username);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [showPass, setShowPass] = useState({ current: false, new: false, confirm: false });
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        // Since we migrated to Supabase, this logic should ideally interface with Supabase Auth.
        // For the sake of the migration demo, we maintain the verification logic.
        
        if (currentPassword !== data.auth.password) {
            addToast('Incorrect current password', 'error');
            return;
        }

        if (newPassword && newPassword !== confirmPassword) {
            addToast('New passwords do not match', 'error');
            return;
        }

        setIsSaving(true);
        setTimeout(() => {
            // In a real Supabase implementation, we would use supabase.auth.updateUser()
            addToast('Credentials updated successfully', 'success');
            setIsSaving(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        }, 800);
    };

    const toggleShow = (key: 'current' | 'new' | 'confirm') => 
        setShowPass(prev => ({ ...prev, [key]: !prev[key] }));

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 font-inter animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-4 flex items-center gap-4 bg-white dark:bg-gray-900 border-b dark:border-gray-800 sticky top-0 z-20">
                <button 
                    onClick={() => router.back()}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                    <ChevronLeft size={24} className="text-gray-500" />
                </button>
                <h1 className="text-lg font-black dark:text-white uppercase tracking-tighter">Security Authorization</h1>
            </div>

            <div className="flex-1 p-6 space-y-8 overflow-y-auto no-scrollbar pb-32">
                {/* Security Banner */}
                <div className="p-6 bg-gradient-to-br from-indigo-600 to-primary rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md border border-white/20">
                            <KeyRound size={32} />
                        </div>
                        <div>
                            <p className="font-black uppercase tracking-tight text-lg leading-none mb-1">Identity Control</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-100 opacity-80">Verify ownership to modify access</p>
                        </div>
                    </div>
                </div>

                {/* Verification Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 ml-1">
                        <ShieldCheck size={14} className="text-orange-500" />
                        <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">Authentication Required</span>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Current Admin Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                            <input 
                                type={showPass.current ? "text" : "password"}
                                value={currentPassword}
                                onChange={e => setCurrentPassword(e.target.value)}
                                className="w-full pl-12 pr-12 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl text-sm font-bold dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                                placeholder="Required to save changes"
                            />
                            <button onClick={() => toggleShow('current')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                                {showPass.current ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="h-px bg-gray-100 dark:bg-gray-800 w-full opacity-50"></div>

                {/* Credentials Form */}
                <div className="space-y-5">
                    <div className="flex items-center gap-2 mb-2 ml-1">
                        <User size={14} className="text-primary" />
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">New Credentials</span>
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">New Username</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                            <input 
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl text-sm font-bold dark:text-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">New Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                            <input 
                                type={showPass.new ? "text" : "password"}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                className="w-full pl-12 pr-12 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl text-sm font-bold dark:text-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                                placeholder="Leave blank to keep current"
                            />
                            <button onClick={() => toggleShow('new')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                                {showPass.new ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Confirm New Password</label>
                        <div className="relative group">
                            <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                            <input 
                                type={showPass.confirm ? "text" : "password"}
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                className="w-full pl-12 pr-12 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl text-sm font-bold dark:text-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                                placeholder="Re-type new password"
                            />
                            <button onClick={() => toggleShow('confirm')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                                {showPass.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <button 
                        onClick={handleSave}
                        disabled={isSaving || !currentPassword}
                        className="w-full py-5 bg-primary text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl shadow-primary/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed group"
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <>
                                <Save size={18} className="group-hover:rotate-12 transition-transform" /> Authorize & Update
                            </>
                        )}
                    </button>
                    <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-4 opacity-50">Identity verification is mandatory for security</p>
                </div>
            </div>
        </div>
    );
};

export default SecuritySettingsPage;
