"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Bot, User, ArrowLeft, Sparkles, AlertCircle, Trash2 } from "lucide-react";
import Link from "next/link";

interface ChatResponse {
    reply?: string;
    error?: string;
}

interface Message {
    role: "user" | "model";
    text: string;
}

export default function ChatbotPage() {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, loading]);

    const handleChatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedMessage = message.trim();
        if (!trimmedMessage) return;

        const newMsg: Message = { role: "user", text: trimmedMessage };
        const updatedMessages = [...messages, newMsg];
        
        setMessages(updatedMessages);
        setMessage(""); // Clear input immediately for better UX
        setLoading(true);
        setError(null);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ messages: updatedMessages }),
            });

            const data: ChatResponse = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Server returned error status ${response.status}`);
            }

            if (data.reply) {
                setMessages(prev => [...prev, { role: "model", text: data.reply! }]);
            } else {
                throw new Error("Received empty reply from AI server.");
            }
        } catch (err: any) {
            console.error("Chat Error:", err);
            setError(err.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleClearChat = () => {
        setMessages([]);
        setError(null);
    };

    return (
        <div className="bg-[#0a0a0a] min-h-screen text-[#f8fafc] font-body relative flex flex-col items-center justify-between py-8 px-4 overflow-hidden selection:bg-[#d4af37]/30">
            {/* Ambient gold glow elements */}
            <div className="pointer-events-none absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#b8960c]/5 blur-[120px] rounded-full -z-10" />
            <div className="pointer-events-none absolute bottom-1/4 right-10 w-[300px] h-[300px] bg-[#d4af37]/5 blur-[100px] rounded-full -z-10" />

            {/* Content Container */}
            <div className="w-full max-w-2xl flex flex-col h-[calc(100dvh-4rem)] my-auto relative z-10">
                
                {/* Back to Home Link */}
                <div className="mb-4 shrink-0">
                    <Link 
                        href="/" 
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[#8a8a8a] hover:text-[#d4af37] transition-colors group"
                    >
                        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Kembali ke Laman Utama
                    </Link>
                </div>

                {/* Main Card */}
                <div className="bg-[#111111]/85 border border-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-[0_0_50px_rgba(184,150,12,0.08)] flex flex-col flex-1 min-h-0 overflow-hidden">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#b8960c]/10 border border-[#b8960c]/30 flex items-center justify-center text-[#d4af37]">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold bg-gradient-to-r from-[#b8960c] to-[#d4af37] bg-clip-text text-transparent">
                                    Gemini AI Chatbot
                                </h1>
                                <p className="text-xs text-[#8a8a8a]">Testing sandbox untuk Sembang Multi-Turn Gemini</p>
                            </div>
                        </div>
                        {messages.length > 0 && (
                            <button
                                type="button"
                                onClick={handleClearChat}
                                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 px-3 py-2 rounded-xl transition-all cursor-pointer font-semibold"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Padam Sembang</span>
                            </button>
                        )}
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto pr-1 mb-4 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <AnimatePresence initial={false}>
                            {messages.length === 0 ? (
                                <motion.div 
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="h-full flex flex-col items-center justify-center text-center p-6 text-[#8a8a8a]"
                                >
                                    <Bot className="w-12 h-12 text-[#b8960c] opacity-40 mb-3" />
                                    <p className="text-sm font-semibold">Mula bersembang dengan AI</p>
                                    <p className="text-xs mt-1 max-w-sm">Tulis apa-apa soalan di bawah. Gemini akan mengingati sejarah perbualan anda.</p>
                                </motion.div>
                            ) : (
                                <div className="space-y-4">
                                    {messages.map((msg, index) => (
                                        <motion.div
                                            key={index}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className={`flex items-start gap-3 ${
                                                msg.role === "user" ? "justify-end" : "justify-start"
                                            }`}
                                        >
                                            {msg.role !== "user" && (
                                                <div className="w-8 h-8 rounded-xl bg-[#b8960c]/10 border border-[#b8960c]/30 flex items-center justify-center text-[#d4af37] shrink-0 mt-0.5">
                                                    <Bot className="w-4 h-4" />
                                                </div>
                                            )}
                                            <div className={`flex flex-col max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                                <span className="text-[10px] font-semibold text-[#8a8a8a] uppercase tracking-wider mb-1 px-1">
                                                    {msg.role === "user" ? "Anda" : "Gemini AI"}
                                                </span>
                                                <div
                                                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                                                        msg.role === "user"
                                                            ? "bg-[#b8960c]/10 border border-[#b8960c]/30 text-[#f8fafc] rounded-tr-sm"
                                                            : "bg-white/5 border border-white/10 text-[#e2e8f0] rounded-tl-sm"
                                                    }`}
                                                >
                                                    {msg.text}
                                                </div>
                                            </div>
                                            {msg.role === "user" && (
                                                <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#8a8a8a] shrink-0 mt-0.5">
                                                    <User className="w-4 h-4" />
                                                </div>
                                            )}
                                        </motion.div>
                                    ))}

                                    {loading && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-start gap-3 justify-start"
                                        >
                                            <div className="w-8 h-8 rounded-xl bg-[#b8960c]/10 border border-[#b8960c]/30 flex items-center justify-center text-[#d4af37] shrink-0 mt-0.5">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            </div>
                                            <div className="flex flex-col items-start max-w-[80%]">
                                                <span className="text-[10px] font-semibold text-[#b8960c] uppercase tracking-wider mb-1 px-1">
                                                    Gemini AI
                                                </span>
                                                <div className="bg-[#b8960c]/5 border border-[#b8960c]/20 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-[#d4af37] flex items-center gap-2">
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    <span>AI sedang memikirkan jawapan...</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3 text-sm text-red-400"
                                        >
                                            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                                            <div className="space-y-1">
                                                <p className="font-bold text-sm">Ralat Berlaku</p>
                                                <p className="opacity-90 text-xs">{error}</p>
                                            </div>
                                        </motion.div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Chat Form */}
                    <form onSubmit={handleChatSubmit} className="mt-auto pt-4 border-t border-white/5 flex gap-2 shrink-0">
                        <input
                            id="message-input"
                            type="text"
                            required
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={loading}
                            placeholder="Tulis mesej anda di sini..."
                            className="flex-1 bg-[#1a1a1a] border border-white/10 text-white placeholder:text-[#555] px-4 py-3 rounded-xl outline-none focus:border-[#b8960c] focus:ring-1 focus:ring-[#b8960c] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
                        />
                        <motion.button
                            whileHover={{ scale: loading ? 1 : 1.02 }}
                            whileTap={{ scale: loading ? 1 : 0.98 }}
                            type="submit"
                            disabled={loading || !message.trim()}
                            className="bg-[#b8960c] hover:bg-[#d4af37] disabled:bg-[#b8960c]/40 disabled:text-[#111]/70 disabled:cursor-not-allowed text-[#111] font-bold px-5 py-3 rounded-xl transition-all shadow-[0_4px_14px_rgba(184,150,12,0.2)] hover:shadow-[0_4px_20px_rgba(184,150,12,0.3)] flex items-center justify-center gap-2 text-sm md:text-base cursor-pointer"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <span className="hidden sm:inline">Hantar</span>
                                    <Send className="w-4 h-4" />
                                </>
                            )}
                        </motion.button>
                    </form>
                </div>
            </div>
        </div>
    );
}
