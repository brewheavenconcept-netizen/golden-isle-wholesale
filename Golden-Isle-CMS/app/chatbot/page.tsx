"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  Bot,
  User,
  ArrowLeft,
  Sparkles,
  AlertCircle,
  Trash2,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatResponse {
  reply?: string;
  error?: string;
}

interface Message {
  role: "user" | "model";
  text: string;
}

// ─── Quick Suggestion Data ────────────────────────────────────────────────────

const SUGGESTIONS = [
  {
    label: "Wiski premium terlaris 🥃",
    query: "Boleh senaraikan wiski premium terlaris dan paling popular?",
  },
  {
    label: "Harga beer borong 🍻",
    query: "Apakah perbandingan harga borong untuk pelbagai jenis craft beer?",
  },
  {
    label: "Cara tempahan & hantaran 📦",
    query:
      "Bagaimana cara membuat tempahan borong dan berapa lama masa penghantaran?",
  },
  {
    label: "Kelebihan duty-free 💰",
    query:
      "Apakah kelebihan membeli secara pukal/duty-free dengan Golden Isle?",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function AvatarBot() {
  return (
    <div className="w-8 h-8 rounded-[10px] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shrink-0 mt-0.5 shadow-sm">
      <Bot className="w-[15px] h-[15px]" />
    </div>
  );
}

function AvatarUser() {
  return (
    <div className="w-8 h-8 rounded-[10px] bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400 shrink-0 mt-0.5 shadow-sm">
      <User className="w-[15px] h-[15px]" />
    </div>
  );
}

function MessageLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5 select-none">
      {children}
    </span>
  );
}

// ─── Types and Interfaces ────────────────────────────────────────────────────

interface CartItem {
  name: string;
  category: string;
  price: string;
  priceNum: number;
  quantity: number;
  total: string;
  image_url?: string;
  whatsapp_message: string;
}

// ─── Receipt Renderer ────────────────────────────────────────────────────────

function ReceiptRenderer({ text }: { text: string }) {
  let data: {
    action: string;
    summary: string;
    products: Array<CartItem>;
  } | null = null;

  try {
    data = JSON.parse(text.substring(12));
  } catch (e) {
    console.error("Error parsing TOOL_RESULT JSON:", e);
  }

  if (!data) {
    return (
      <div className="bg-white border border-slate-200/60 text-slate-500 text-[13px] p-4 rounded-[18px] rounded-tl-[6px] shadow-sm">
        Ralat memproses resit draf.
      </div>
    );
  }

  const grandTotal = data.products.reduce((acc, item) => acc + (item.priceNum * item.quantity), 0);

  const buildWhatsAppOrderMessage = () => {
    if (!data?.products?.length) return "";
    let msg = `Hi, saya mahu proceed pesanan borong untuk:\n\n`;
    data.products.forEach(item => {
      msg += `• ${item.quantity}x ${item.name} (${item.price}/unit) — Jumlah: ${item.total}\n`;
    });
    msg += `\n*Jumlah Keseluruhan: RM ${grandTotal.toFixed(2)}*\n\nSila sediakan bil & pautan QR untuk pembayaran. Terima kasih!`;
    return msg;
  };

  const checkoutLink = `https://wa.me/601164073143?text=${encodeURIComponent(buildWhatsAppOrderMessage())}`;

  return (
    <div className="space-y-3 w-full">
      <div className="text-[13.5px] font-medium text-[#0F172A] leading-relaxed">
        {data.summary}
      </div>
      
      {data.products && data.products.length > 0 ? (
        <div className="bg-white border border-slate-100 rounded-[18px] overflow-hidden shadow-sm p-4 space-y-4 max-w-md w-full">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-[#b8960c] animate-pulse" />
                  <span className="text-[9.5px] font-extrabold text-[#1a1a1a] tracking-wider uppercase">
                      DRAF RESIT
                  </span>
              </div>
              <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-widest">
                  Golden Isle Wholesale
              </span>
          </div>

          <div className="divide-y divide-slate-50 space-y-2.5">
            {data.products.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4 pt-2.5 first:pt-0">
                <div className="min-w-0">
                  <h4 className="text-[12.5px] font-bold text-[#0F172A] truncate">
                    {p.name}
                  </h4>
                  <p className="text-[10px] text-[#64748B] mt-0.5 font-medium">
                    {p.quantity} x {p.price}
                  </p>
                </div>
                <span className="text-[12.5px] font-extrabold text-[#0F172A] shrink-0">
                  {p.total}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Jumlah Keseluruhan
            </span>
            <span className="text-[15px] font-black text-indigo-600">
              RM {grandTotal.toFixed(2)}
            </span>
          </div>

          <a
            href={checkoutLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 text-[11.5px] font-bold text-white bg-[#25D366] hover:bg-[#20ba56] py-3 rounded-[12px] transition-all duration-200 shadow-md hover:shadow-lg mt-1"
          >
            <span>WhatsApp Checkout</span>
            <svg
              className="w-4 h-4 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.644 1.97 14.178.948 11.55.948c-5.443 0-9.87 4.372-9.874 9.799-.001 1.768.479 3.494 1.39 5.048L2.08 21.628l6.195-1.62c.366.19.742.366 1.127.48.243.072.483.102.725.102.13 0 .26-.008.39-.024.116-.014.23-.035.346-.062z" />
            </svg>
          </a>
        </div>
      ) : (
        <div className="text-[12px] text-slate-400 bg-white border border-slate-100 rounded-[16px] p-4 text-center shadow-sm">
          Troli draf ko kosong, bossku.
        </div>
      )}
    </div>
  );
}

// ─── Tool Result Renderer ───────────────────────────────────────────────────

function ToolResultRenderer({ text }: { text: string }) {
  let data: {
    summary: string;
    products: Array<{
      name: string;
      category: string;
      price: string;
      description: string;
      image_url?: string;
      badge: string;
      whatsapp_message: string;
    }>;
  } | null = null;

  try {
    data = JSON.parse(text.substring(12));
  } catch (e) {
    console.error("Error parsing TOOL_RESULT JSON:", e);
  }

  if (!data) {
    return (
      <div className="bg-white border border-slate-200/60 text-slate-500 text-[13px] p-4 rounded-[18px] rounded-tl-[6px] shadow-sm">
        Ralat memproses senarai produk.
      </div>
    );
  }

  return (
    <div className="space-y-3 w-full">
      <div className="text-[13.5px] font-medium text-[#0F172A] leading-relaxed">
        {data.summary}
      </div>
      
      {data.products && data.products.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full">
          {data.products.map((p, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-100 rounded-[18px] overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col p-3"
            >
              {p.image_url && (
                <div className="w-full h-[140px] rounded-[12px] overflow-hidden bg-slate-50 shrink-0 border border-slate-100/60 flex items-center justify-center mb-3">
                  <img
                    src={p.image_url}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9.5px] uppercase tracking-wider font-extrabold text-slate-400 truncate">
                      {p.category}
                    </span>
                    <span
                      className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full select-none ${
                        p.badge === "TERHAD"
                          ? "bg-amber-50 text-amber-600 border border-amber-100"
                          : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                      }`}
                    >
                      {p.badge}
                    </span>
                  </div>
                  
                  <h4 className="text-[14px] font-bold text-[#0F172A] tracking-tight mt-1 truncate">
                    {p.name}
                  </h4>
                  
                  <p className="text-[11.5px] text-[#64748B] line-clamp-2 leading-normal mt-1">
                    {p.description}
                  </p>
                </div>
                
                <div className="flex items-center justify-between gap-2.5 mt-4 shrink-0 border-t border-slate-50 pt-2.5">
                  <span className="text-[14px] font-extrabold text-indigo-600">
                    {p.price}
                  </span>
                  
                  <a
                    href={`https://wa.me/601164073143?text=${encodeURIComponent(p.whatsapp_message)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-[#25D366] hover:bg-[#20ba56] px-3 py-2 rounded-[10px] transition-all duration-200 shadow-sm hover:shadow"
                  >
                    <span>WhatsApp</span>
                    <svg
                      className="w-3.5 h-3.5 fill-current"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.644 1.97 14.178.948 11.55.948c-5.443 0-9.87 4.372-9.874 9.799-.001 1.768.479 3.494 1.39 5.048L2.08 21.628l6.195-1.62c.366.19.742.366 1.127.48.243.072.483.102.725.102.13 0 .26-.008.39-.024.116-.014.23-.035.346-.062z" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-[12px] text-slate-400 bg-white border border-slate-100 rounded-[16px] p-4 text-center shadow-sm">
          Tiada produk tersenarai dijumpai.
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatbotPage() {
  const [message, setMessage] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;

    const newMsg: Message = { role: "user", text: trimmedMessage };
    const updatedMessages = [...messages, newMsg];

    setMessages(updatedMessages);
    setMessage("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages, cart }),
      });

      const data: ChatResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || `Server returned error status ${response.status}`
        );
      }

      if (data.reply) {
        setMessages((prev) => [...prev, { role: "model", text: data.reply! }]);

        // Sync local React cart state if reply is a cart tool result
        if (data.reply.startsWith("TOOL_RESULT:")) {
          try {
            const parsed = JSON.parse(data.reply.substring(12));
            if (parsed && (parsed.action === "cart_updated" || parsed.action === "cart_viewed") && Array.isArray(parsed.products)) {
              setCart(parsed.products);
            }
          } catch (e) {
            console.error("Failed to parse cart sync from TOOL_RESULT:", e);
          }
        }
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
    setCart([]);
    setError(null);
  };

  const handleSuggestionClick = (query: string) => {
    setMessage(query);
    document.getElementById("message-input")?.focus();
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden selection:bg-indigo-100"
      style={{ fontFamily: "var(--font-inter), var(--font-dm-sans), sans-serif" }}
    >
      {/* ── Decorative mesh blobs ──────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-32 w-[420px] h-[420px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)",
        }}
      />

      {/* ── Layout wrapper ─────────────────────────────────────────────────── */}
      <div className="w-full max-w-2xl flex flex-col h-[calc(100dvh-4rem)] relative z-10">

        {/* Back link */}
        <div className="mb-5 shrink-0">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 hover:text-indigo-500 uppercase tracking-wider transition-colors duration-200 group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform duration-200" />
            Back to Home
          </Link>
        </div>

        {/* ── Glass card ──────────────────────────────────────────────────── */}
        <div
          className="flex flex-col flex-1 min-h-0 overflow-hidden rounded-[22px] border border-white/60 shadow-xl"
          style={{
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
          }}
        >

          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100/80 shrink-0">
            <div className="flex items-center gap-3">
              {/* Logo badge */}
              <div className="w-9 h-9 rounded-[10px] bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h1 className="text-[15px] font-bold text-[#0F172A] tracking-tight leading-none">
                  Golden AI
                </h1>
                <p className="text-[11px] text-[#64748B] mt-0.5 font-medium">
                  Pembantu Jualan Borong · Golden Isle Wholesale
                </p>
              </div>
            </div>

            {/* Status pill */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online
              </div>

              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearChat}
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-500 hover:text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 hover:border-rose-200 px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* ── Messages area ───────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <AnimatePresence initial={false}>

              {/* Empty state */}
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="h-full flex flex-col items-center justify-center text-center py-6"
                >
                  {/* Icon */}
                  <div className="relative mb-5">
                    <div className="absolute inset-0 rounded-2xl blur-2xl bg-indigo-400/10 scale-150" />
                    <div className="relative w-[60px] h-[60px] rounded-[18px] bg-indigo-500 flex items-center justify-center shadow-xl shadow-indigo-500/20">
                      <Bot className="w-7 h-7 text-white" />
                    </div>
                  </div>

                  <h2 className="text-[17px] font-bold text-[#0F172A] tracking-tight">
Selamat datang ke Golden AI
                  </h2>
                  <p className="text-[12.5px] text-[#64748B] mt-2 max-w-xs leading-relaxed">
                    Tanya soalan tentang katalog arak premium, harga borong, atau
                    cara pendaftaran akaun B2B.
                  </p>

                  {/* Suggestions */}
                  <div className="mt-8 w-full max-w-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left mb-2.5">
                      Cuba tanya
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {SUGGESTIONS.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSuggestionClick(s.query)}
                          className="group flex items-center justify-between gap-2 px-3.5 py-3 text-left text-[12px] font-medium text-[#0F172A] bg-white hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 rounded-[14px] transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
                        >
                          <span>{s.label}</span>
                          <span className="text-indigo-400 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200 text-xs">
                            ›
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Messages */}
              {messages.length > 0 && (
                <div className="space-y-5">
                  {messages.map((msg, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className={`flex items-start gap-2.5 ${
                        msg.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      {msg.role === "model" && <AvatarBot />}

                      <div
                        className={`flex flex-col max-w-[85%] ${
                          msg.role === "user" ? "items-end" : "items-start"
                        }`}
                      >
                        <MessageLabel>
                          {msg.role === "user" ? "Anda" : "Golden AI"}
                        </MessageLabel>

                        {msg.role === "model" && msg.text.startsWith("TOOL_RESULT:") ? (
                          msg.text.includes('"action":"cart_') ? (
                            <ReceiptRenderer text={msg.text} />
                          ) : (
                            <ToolResultRenderer text={msg.text} />
                          )
                        ) : (
                          <div
                            className={`rounded-[18px] px-4 py-3 text-[13.5px] leading-relaxed whitespace-pre-wrap ${
                              msg.role === "user"
                                ? "bg-[#6366F1] text-white rounded-tr-[6px] shadow-lg shadow-indigo-500/15"
                                : "bg-white border border-slate-200/60 text-[#0F172A] rounded-tl-[6px] shadow-sm"
                            }`}
                          >
                            {msg.text}
                          </div>
                        )}
                      </div>

                      {msg.role === "user" && <AvatarUser />}
                    </motion.div>
                  ))}

                  {/* Loading bubble */}
                  {loading && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-start gap-2.5 justify-start"
                    >
                      <div className="w-8 h-8 rounded-[10px] bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                        <Loader2 className="w-[15px] h-[15px] text-indigo-400 animate-spin" />
                      </div>
                      <div className="flex flex-col items-start">
                        <MessageLabel>Golden AI</MessageLabel>
                        <div className="bg-white border border-slate-200/60 rounded-[18px] rounded-tl-[6px] px-4 py-3 flex items-center gap-2 shadow-sm">
                          <span className="flex gap-1">
                            {[0, 1, 2].map((i) => (
                              <span
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                                style={{ animationDelay: `${i * 0.15}s` }}
                              />
                            ))}
                          </span>
                          <span className="text-[12.5px] text-[#64748B] font-medium">
                            Sedang merangka jawapan...
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Error */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-start gap-3 bg-rose-50 border border-rose-200/70 rounded-[16px] px-4 py-3.5 shadow-sm"
                    >
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[12.5px] font-bold text-rose-700">
                          Ralat Berlaku
                        </p>
                        <p className="text-[12px] text-rose-500 mt-0.5">{error}</p>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Input bar ───────────────────────────────────────────────────── */}
          <div className="px-5 py-4 border-t border-slate-100/80 shrink-0">
            <form
              onSubmit={handleChatSubmit}
              className="flex gap-2.5 items-center"
            >
              <input
                id="message-input"
                type="text"
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={loading}
                placeholder="Tanya Golden AI sesuatu..."
                className="flex-1 bg-slate-50 border border-slate-200/80 text-[#0F172A] placeholder:text-slate-400 px-4 py-3 rounded-[14px] outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/8 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-[13.5px] font-medium"
              />
              <motion.button
                whileHover={{ scale: loading ? 1 : 1.03 }}
                whileTap={{ scale: loading ? 1 : 0.97 }}
                type="submit"
                disabled={loading || !message.trim()}
                className="bg-[#6366F1] hover:bg-indigo-600 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-semibold px-5 py-3 rounded-[14px] transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 flex items-center justify-center gap-2 text-[13.5px] cursor-pointer shrink-0"
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
            <p className="text-center text-[10px] text-slate-400 mt-2.5 select-none">
              Golden AI · Powered by OpenAI · Golden Isle Wholesale
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
