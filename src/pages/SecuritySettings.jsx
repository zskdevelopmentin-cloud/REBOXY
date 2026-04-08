import React, { useState } from 'react';
import { useBiz } from '../context/BizContext';
import { ShieldCheck, User, Lock, Save, ChevronLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SecuritySettings = () => {
    const { data, updateCredentials } = useBiz();
    const navigate = useNavigate();
    
    const [username, setUsername] = useState(data.auth.username);
    const [password, setPassword] = useState(data.auth.password);
    const [showPassword, setShowPassword] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => {
            updateCredentials(username, password);
            setIsSaving(false);
        }, 800);
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-950 font-inter">
            {/* Header */}
            <div className="p-4 flex items-center gap-4 bg-white dark:bg-gray-900 border-b dark:border-gray-800">
                <button 
                    onClick={() => navigate(-1)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                    <ChevronLeft size={24} className="text-gray-500" />
                </button>
                <h1 className="text-lg font-black dark:text-white uppercase tracking-tighter">Security Settings</h1>
            </div>

            <div className="flex-1 p-6 space-y-8 overflow-y-auto no-scrollbar">
                {/* Security Banner */}
                <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                            <ShieldCheck size={32} />
                        </div>
                        <div>
                            <p className="font-black uppercase tracking-tight text-lg">System Identity</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-blue-100">Manage your administrative access</p>
                        </div>
                    </div>
                </div>

                {/* Credentials Form */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Admin Username</label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                            <input 
                                type="text"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl text-sm font-bold dark:text-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                                placeholder="Edit username"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Admin Password</label>
                        <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full pl-12 pr-12 py-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl text-sm font-bold dark:text-white focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all shadow-sm"
                                placeholder="Edit password"
                            />
                            <button 
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                        <ShieldCheck size={18} className="text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-relaxed">
                            These credentials are required to access the entire REBOXY ecosystem. Keep them confidential. Changes take effect on next login.
                        </p>
                    </div>
                </div>

                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-5 bg-primary text-white rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-2xl shadow-primary/30 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
                >
                    {isSaving ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                        <>
                            <Save size={18} /> Update Access Point
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default SecuritySettings;
