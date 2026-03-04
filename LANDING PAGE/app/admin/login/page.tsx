'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { AlertCircle, Loader2, Eye, EyeOff, X, Mail, Send, CheckCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/admin/reset-password`,
            });
            if (error) throw error;
            setSent(true);
            toast.success('Reset link sent! Check your inbox.');
        } catch (err: any) {
            toast.error(err.message || 'Failed to send reset link');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
            <div className="bg-[#111111] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center"><Mail className="w-5 h-5 text-emerald-400" /></div>
                    <div>
                        <h2 className="font-bold text-white text-lg">Forgot Password?</h2>
                        <p className="text-slate-400 text-sm">We'll send a reset link to your email</p>
                    </div>
                </div>
                {sent ? (
                    <div className="text-center py-4">
                        <div className="text-4xl mb-3">📬</div>
                        <p className="text-emerald-400 font-semibold">Reset link sent!</p>
                        <p className="text-slate-400 text-sm mt-1">Check your inbox or spam folder.</p>
                        <button onClick={onClose} className="mt-4 w-full h-11 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors">Close</button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full h-11 px-4 bg-black/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all"
                                placeholder="admin@crocodilerock.com" />
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full h-11 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-black rounded-xl font-bold transition-all">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);
    const [error, setError] = useState('');
    const [showForgot, setShowForgot] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) throw authError;
            toast.success('Welcome back! 🥃', { duration: 3000 });
            router.push('/admin/dashboard');
        } catch (err: any) {
            setError('Invalid email or password. Please try again.');
            toast.error('Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setGoogleLoading(true);
        setError('');
        try {
            const { error: authError } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/admin`
                }
            });
            if (authError) throw authError;
            // Note: The page will redirect to Google's OAuth flow before this finishes.
        } catch (err: any) {
            setError('Failed to initialize Google login.');
            setGoogleLoading(false);
        }
    };

    return (
        <>
            <Toaster position="top-right" />
            {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} />}
            <div className="min-h-screen flex w-full bg-[#f5f3ee]">
                <div className="w-full flex flex-col items-center justify-center px-4 sm:px-8 py-12 relative overflow-hidden">
                    {/* Premium glows */}
                    <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-[#d4af37]/20 blur-[120px] rounded-full pointer-events-none -z-10"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#b8960c]/20 blur-[120px] rounded-full pointer-events-none -z-10"></div>

                    <div className="w-full max-w-md bg-white p-8 sm:p-10 rounded-3xl border border-[#e8e4dd] shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative z-10">
                        <div className="flex items-center justify-center gap-3 mb-8">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#d4af37] to-[#b8960c] flex items-center justify-center shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-glass-water"><path d="M15.2 22H8.8a2 2 0 0 1-2-1.79L5 3h14l-1.81 17.21A2 2 0 0 1 15.2 22Z" /><path d="M6 12h12" /></svg>
                            </div>
                            <span className="text-[#1a1a1a] font-display font-bold text-2xl tracking-tight">Golden Isle Wholesale</span>
                        </div>

                        <div className="mb-8 text-center">
                            <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#1a1a1a] mb-2">Welcome Back</h1>
                            <p className="text-[#6b6b6b] text-sm">Sign in to manage your wholesale dashboard.</p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-600 font-medium">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-[#1a1a1a] mb-2">Email Address</label>
                                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="w-full h-12 px-4 bg-[#f5f3ee] border border-[#e8e4dd] rounded-xl text-[#1a1a1a] placeholder:text-[#a0a0a0] focus:outline-none focus:ring-2 focus:ring-[#b8960c]/50 focus:border-[#b8960c] transition-all"
                                    placeholder="admin@goldenisle.com" />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-sm font-bold text-[#1a1a1a]">Password</label>
                                    <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-[#b8960c] hover:text-[#d4af37] transition-colors font-medium">Forgot password?</button>
                                </div>
                                <div className="relative">
                                    <input type={showPassword ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)}
                                        className="w-full h-12 px-4 pr-12 bg-[#f5f3ee] border border-[#e8e4dd] rounded-xl text-[#1a1a1a] placeholder:text-[#a0a0a0] focus:outline-none focus:ring-2 focus:ring-[#b8960c]/50 focus:border-[#b8960c] transition-all"
                                        placeholder="••••••••" />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0a0] hover:text-[#b8960c] transition-colors p-1" tabIndex={-1}>
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <button type="submit" disabled={loading || googleLoading}
                                className="w-full h-12 flex items-center justify-center gap-2 bg-[#b8960c] hover:bg-[#d4af37] disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-[0_4px_14px_rgba(184,150,12,0.3)] mt-2">
                                {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Signing in...</> : 'Sign In'}
                            </button>
                        </form>

                        <div className="relative my-8">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-white/10"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-[#111111] text-slate-500 font-medium">Or continue with</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading || googleLoading}
                            className="w-full h-12 flex items-center justify-center gap-3 bg-white hover:bg-slate-100 disabled:opacity-60 disabled:cursor-not-allowed text-black rounded-xl font-semibold transition-all"
                        >
                            {googleLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                    <path d="M1 1h22v22H1z" fill="none" />
                                </svg>
                            )}
                            Sign in with Google
                        </button>

                        <div className="mt-8 text-center">
                            <Link href="/" className="text-sm border-b border-transparent hover:border-emerald-400 text-slate-400 hover:text-emerald-400 transition-colors">
                                ← Back to Storefront
                            </Link>
                        </div>
                    </div>

                    <p className="text-center text-xs text-slate-600 mt-8 relative z-10">
                        <CheckCircle className="inline w-3.5 h-3.5 mr-1 text-emerald-600" />
                        Enterprise-grade security by Supabase
                    </p>
                </div>
            </div>
        </>
    );
}
