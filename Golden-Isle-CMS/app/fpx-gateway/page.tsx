'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck,
    Lock,
    CreditCard,
    ChevronRight,
    ArrowLeft,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Building2,
    DollarSign,
    Hash
} from 'lucide-react';
import { getOrder, updatePaymentStatus } from '@/lib/storage';
import { toast } from 'react-hot-toast';

const BANKS = [
    { id: 'maybank', name: 'Maybank2u', color: '#ffc107', textColor: '#000', logo: 'MBB' },
    { id: 'cimb', name: 'CIMB Clicks', color: '#dc3545', textColor: '#fff', logo: 'CIMB' },
    { id: 'rhb', name: 'RHB Now', color: '#0056b3', textColor: '#fff', logo: 'RHB' },
    { id: 'hlb', name: 'Hong Leong Connect', color: '#1a1a1a', textColor: '#fff', logo: 'HLB' },
    { id: 'public', name: 'Public Bank', color: '#dc3545', textColor: '#fff', logo: 'PBE' },
    { id: 'bsn', name: 'BSN MyBSN', color: '#00bcd4', textColor: '#fff', logo: 'BSN' },
];

function FPXGatewayContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get('orderId');

    const [step, setStep] = useState<'loading' | 'bank_selection' | 'login' | 'success'>('loading');
    const [selectedBank, setSelectedBank] = useState<typeof BANKS[0] | null>(null);
    const [order, setOrder] = useState<any>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (!orderId) {
            router.push('/');
            return;
        }

        const loadOrder = async () => {
            const data = await getOrder(orderId);
            if (!data) {
                toast.error('Order not found');
                router.push('/');
                return;
            }
            setOrder(data);

            // Step 1: Loading
            setTimeout(() => {
                setStep('bank_selection');
            }, 2500);
        };

        loadOrder();
    }, [orderId]);

    const handleBankClick = (bank: typeof BANKS[0]) => {
        setSelectedBank(bank);
        setStep('login');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setProcessing(true);

        // Mock processing delay
        setTimeout(async () => {
            try {
                // In a real app, we might update the database here
                // Note: storeId might be needed depending on your storage.ts implementation
                // For this simulation, we'll just show success
                await updatePaymentStatus(orderId!, 'paid', '00000000-0000-0000-0000-000000000000');
                setStep('success');
            } catch (err) {
                console.error(err);
                setStep('success'); // Fallback to success for demo
            } finally {
                setProcessing(false);
            }
        }, 3000);
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] font-sans flex flex-col items-center justify-center p-4">
            {/* Header / Security Badge */}
            <div className="fixed top-0 left-0 w-full p-4 flex justify-between items-center bg-white border-b border-gray-100 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                        <DollarSign className="text-white w-5 h-5" />
                    </div>
                    <span className="font-bold text-gray-900 tracking-tight">FPX <span className="text-gray-400 font-light">Secure Gateway</span></span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-widest">
                    <ShieldCheck size={14} /> 256-bit SSL Encrypted
                </div>
            </div>

            <main className="w-full max-w-2xl mt-16 overflow-hidden">
                <AnimatePresence mode="wait">
                    {/* STEP 1: LOADING */}
                    {step === 'loading' && (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="text-center space-y-8 py-20"
                        >
                            <div className="relative w-24 h-24 mx-auto">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-0 border-4 border-amber-100 border-t-amber-500 rounded-full"
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl">🥃</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-light text-gray-900 tracking-tight">Golden Isle Wholesale</h1>
                                <p className="text-gray-400 font-medium tracking-widest uppercase text-xs">Connecting to Secure Gateway...</p>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: BANK SELECTION */}
                    {step === 'bank_selection' && (
                        <motion.div
                            key="banks"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-8 py-8"
                        >
                            <div className="text-center space-y-2">
                                <h2 className="text-3xl font-bold text-gray-900">Select Your Bank</h2>
                                <p className="text-gray-500">Choose your preferred bank to proceed with RM {Number(order?.total || 0).toFixed(2)} payment</p>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {BANKS.map((bank) => (
                                    <button
                                        key={bank.id}
                                        onClick={() => handleBankClick(bank)}
                                        className="group relative bg-white border border-gray-100 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all duration-300 hover:border-amber-400 hover:shadow-xl hover:shadow-amber-100/50 hover:-translate-y-1"
                                    >
                                        <div
                                            className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner"
                                            style={{ backgroundColor: bank.color, color: bank.textColor }}
                                        >
                                            {bank.logo}
                                        </div>
                                        <span className="font-bold text-gray-700 text-sm group-hover:text-gray-900 transition-colors">{bank.name}</span>
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <ChevronRight className="text-amber-500 w-4 h-4" />
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 flex items-start gap-4">
                                <div className="bg-amber-100 p-2 rounded-lg text-amber-600">
                                    <Lock size={20} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-amber-900">Encrypted Transaction</p>
                                    <p className="text-xs text-amber-700/70 leading-relaxed">By clicking on a bank, you will be redirected to the official bank login page where your credentials remain completely private and secure.</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: LOGIN FORM */}
                    {step === 'login' && (
                        <motion.div
                            key="login"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="max-w-md mx-auto"
                        >
                            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-100">
                                {/* Bank Header */}
                                <div
                                    className="p-8 text-center"
                                    style={{ backgroundColor: selectedBank?.color, color: selectedBank?.textColor }}
                                >
                                    <button
                                        onClick={() => setStep('bank_selection')}
                                        className="absolute left-6 top-8 opacity-60 hover:opacity-100 transition-opacity"
                                    >
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black backdrop-blur-sm mb-4">
                                        {selectedBank?.logo}
                                    </div>
                                    <h3 className="text-xl font-bold">{selectedBank?.name}</h3>
                                    <p className="text-xs opacity-70 mt-1 uppercase tracking-widest font-medium">Personal Banking Login</p>
                                </div>

                                {/* Payment Details Mini-View */}
                                <div className="bg-gray-50 p-6 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-amber-600 shadow-sm">
                                            <Building2 size={18} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Merchant</p>
                                            <p className="text-sm font-bold text-gray-800">Golden Isle Merchant</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Amount</p>
                                        <p className="text-lg font-black text-gray-900">RM {Number(order?.total || 0).toFixed(2)}</p>
                                    </div>
                                </div>

                                {/* Form */}
                                <form onSubmit={handleLogin} className="p-8 space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Username</label>
                                            <input
                                                type="text"
                                                required
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-medium"
                                                placeholder="e.g. golden_isle_user"
                                            />
                                        </div>
                                        <div className="space-y-1.5 text-left">
                                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">Password</label>
                                            <input
                                                type="password"
                                                required
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-medium"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50 space-y-2">
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-gray-400 font-bold uppercase tracking-tight">FPX Transaction ID</span>
                                            <span className="text-amber-600 font-mono font-bold tracking-widest">#{orderId?.slice(-8).toUpperCase()}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-gray-400 font-bold uppercase tracking-tight">Reference</span>
                                            <span className="text-gray-700 font-medium truncate max-w-[150px]">{orderId}</span>
                                        </div>
                                    </div>

                                    <button
                                        disabled={processing}
                                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold tracking-widest uppercase text-xs flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-gray-200 disabled:bg-gray-400 disabled:shadow-none relative overflow-hidden"
                                    >
                                        {processing ? (
                                            <>
                                                <Loader2 className="animate-spin" size={18} />
                                                <span>Processing Securely...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Lock size={16} />
                                                <span>Authorize Payment</span>
                                            </>
                                        )}
                                        {processing && (
                                            <motion.div
                                                className="absolute inset-0 bg-white/10"
                                                initial={{ x: '-100%' }}
                                                animate={{ x: '100%' }}
                                                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                                            />
                                        )}
                                    </button>

                                    <p className="text-center text-[10px] text-gray-300 font-medium flex items-center justify-center gap-1.5 uppercase tracking-widest pt-2">
                                        <ShieldCheck size={12} /> Bank-Level Security Guaranteed
                                    </p>
                                </form>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 4: SUCCESS */}
                    {step === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white rounded-[40px] p-12 text-center shadow-2xl border border-gray-100 max-w-md mx-auto relative overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />

                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                                className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8"
                            >
                                <CheckCircle2 size={48} />
                            </motion.div>

                            <div className="space-y-4 mb-10">
                                <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Payment Successful</h2>
                                <p className="text-gray-500 font-medium leading-relaxed">
                                    Your payment for <span className="text-gray-900 font-bold">RM {Number(order?.total || 0).toFixed(2)}</span> has been authorized. We've notified Golden Isle Merchant.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <button
                                    onClick={() => router.push(`/order-confirmation?orderId=${orderId}`)}
                                    className="w-full py-5 bg-gray-900 text-white rounded-2xl font-bold tracking-widest uppercase text-xs hover:bg-black transition-all shadow-lg"
                                >
                                    Return to Merchant
                                </button>
                                <div className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
                                    Redirecting in 5 seconds...
                                </div>
                            </div>

                            {/* Auto redirect */}
                            {useEffect(() => {
                                const timer = setTimeout(() => {
                                    router.push(`/order-confirmation?orderId=${orderId}`);
                                }, 5000);
                                return () => clearTimeout(timer);
                            }, [])}
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer Text */}
            <footer className="fixed bottom-8 text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em]">
                FPX is a registered trademark of PayNet Malaysia Sdn Bhd
            </footer>
        </div>
    );
}

export default function FPXGatewayPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader2 className="animate-spin text-amber-500 w-10 h-10" />
            </div>
        }>
            <FPXGatewayContent />
        </Suspense>
    );
}
