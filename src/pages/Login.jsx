import React, { useState } from 'react';
import { useBiz } from '../context/BizContext';
import { ShieldCheck, Mail, Lock, Fingerprint, Eye, EyeOff } from 'lucide-react';

const Login = () => {
    const { login } = useBiz();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await login(email, password);
        } catch (err) {
            // Error is handled by context toast
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary via-indigo-700 to-purple-900 flex flex-col items-center justify-center p-6 font-inter relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-400/20 rounded-full blur-3xl animate-pulse"></div>

            <div className="w-full max-w-[400px] z-10 space-y-8">
                {/* Logo & Header */}
                <div className="text-center space-y-3">
                    <div className="w-20 h-20 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] mx-auto flex items-center justify-center shadow-2xl rotate-6 group hover:rotate-0 transition-all duration-500">
                        <span className="text-4xl font-black text-white italic tracking-tighter">R</span>
                    </div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-tighter">REBOXY TRADERS</h1>
                    <p className="text-blue-100/60 text-xs font-bold uppercase tracking-[0.2em]">Biz Analyst Elite Edition</p>
                </div>

                {/* Login Card */}
                <div className="bg-white/10 backdrop-blur-2xl border border-white/20 p-8 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-500 rounded-lg text-white">
                            <ShieldCheck size={18} />
                        </div>
                        <p className="text-white font-black uppercase text-sm tracking-tight">System Secure Login</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-blue-100/50 uppercase tracking-widest ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" size={18} />
                                <input 
                                    type="email" 
                                    required
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="Enter your email" 
                                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/10 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-blue-100/50 uppercase tracking-widest ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" size={18} />
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    required
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="Enter your password" 
                                    className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white/10 transition-all"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full py-4 bg-white text-primary rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-blue-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
                            ) : (
                                "Identify & Enter"
                            )}
                        </button>
                    </form>

                    <div className="relative">
                        <div className="absolute inset-x-0 top-1/2 border-t border-white/10"></div>
                        <span className="relative z-10 bg-[#2849c3] px-3 text-[10px] font-bold text-white/30 uppercase tracking-widest block mx-auto w-fit">Or Continue with</span>
                    </div>

                    <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center gap-3 text-white font-bold hover:bg-white/10 transition-all active:scale-95">
                        <Fingerprint size={24} className="text-blue-400" />
                        <span className="uppercase text-xs tracking-widest">Biometric Identity</span>
                    </button>
                </div>

                <div className="text-center">
                    <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Forgot Credentials? <button className="text-blue-300 hover:underline">Contact Admin</button></p>
                </div>
            </div>

            <div className="absolute bottom-6 text-white/20 text-[8px] font-black uppercase tracking-[1em]">V 2.4.0 • MIL-SPEC SECURITY</div>
        </div>
    );
};

export default Login;
