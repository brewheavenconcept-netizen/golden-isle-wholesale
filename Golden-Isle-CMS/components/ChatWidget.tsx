"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  Bot,
  User,
  X,
  Sparkles,
  AlertCircle,
  Trash2,
  MessageCircle,
} from "lucide-react";

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
    label: "Recommend Whisky",
    icon: "🥃",
    query: "Tolong recommend whisky premium yang best bosku.",
  },
  {
    label: "Request Bulk Quote",
    icon: "📦",
    query: "Saya nak request sebut harga (bulk quote) untuk stok hotel/restoran.",
  },
  {
    label: "View Cart",
    icon: "🛒",
    query: "Tunjuk cart saya.",
  },
  {
    label: "Talk to Sales",
    icon: "💬",
    query: "Macam mana nak bercakap terus dengan sales / WhatsApp?",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function AvatarBot() {
  return (
    <div className="w-7 h-7 rounded-[9px] bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 shrink-0 mt-0.5 shadow-sm">
      <Bot className="w-[13px] h-[13px]" />
    </div>
  );
}

function AvatarUser() {
  return (
    <div className="w-7 h-7 rounded-[9px] bg-slate-100 border border-slate-200/80 flex items-center justify-center text-slate-400 shrink-0 mt-0.5 shadow-sm">
      <User className="w-[13px] h-[13px]" />
    </div>
  );
}

function MessageLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1 px-0.5 select-none">
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
      <div className="bg-white border border-slate-200/60 text-slate-500 text-[12px] p-3 rounded-[16px] rounded-tl-[5px] shadow-sm">
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
    <div className="space-y-2.5 w-full">
      <div className="text-[12px] font-medium text-[#0F172A] leading-relaxed">
        {data.summary}
      </div>
      
      {data.products && data.products.length > 0 ? (
        <div className="bg-white border border-slate-100 rounded-[16px] overflow-hidden shadow-sm p-3.5 space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-[#b8960c] animate-pulse" />
                  <span className="text-[9px] font-extrabold text-[#1a1a1a] tracking-wider uppercase">
                      DRAF RESIT
                  </span>
              </div>
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                  Golden Isle Wholesale
              </span>
          </div>

          <div className="divide-y divide-slate-50 space-y-2">
            {data.products.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 pt-2 first:pt-0">
                <div className="min-w-0">
                  <h4 className="text-[11.5px] font-bold text-[#0F172A] truncate">
                    {p.name}
                  </h4>
                  <p className="text-[9.5px] text-[#64748B] mt-0.5 font-medium">
                    {p.quantity} x {p.price}
                  </p>
                </div>
                <span className="text-[11.5px] font-extrabold text-[#0F172A] shrink-0">
                  {p.total}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Jumlah Keseluruhan
            </span>
            <span className="text-[13px] font-black text-indigo-600">
              RM {grandTotal.toFixed(2)}
            </span>
          </div>

          <a
            href={checkoutLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 text-[10.5px] font-bold text-white bg-[#25D366] hover:bg-[#20ba56] py-2.5 rounded-[11px] transition-all duration-200 shadow-md hover:shadow-lg mt-1"
          >
            <span>WhatsApp Checkout</span>
            <svg
              className="w-3 h-3 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.968C16.644 1.97 14.178.948 11.55.948c-5.443 0-9.87 4.372-9.874 9.799-.001 1.768.479 3.494 1.39 5.048L2.08 21.628l6.195-1.62c.366.19.742.366 1.127.48.243.072.483.102.725.102.13 0 .26-.008.39-.024.116-.014.23-.035.346-.062z" />
            </svg>
          </a>
        </div>
      ) : (
        <div className="text-[11px] text-slate-400 bg-white border border-slate-100 rounded-[14px] p-3.5 text-center shadow-sm">
          Troli draf ko kosong, bossku.
        </div>
      )}
    </div>
  );
}

// ─── Tool Result Renderer ───────────────────────────────────────────────────

function ProductCard({ p, onAddToCart }: { p: any; onAddToCart: (product: any) => void }) {
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    onAddToCart(p);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className="bg-white border border-slate-100 rounded-[16px] overflow-hidden shadow-sm hover:shadow transition-shadow duration-200 flex flex-col gap-2 p-2.5">
      {p.image_url && (
        <div className="w-full h-[110px] rounded-[10px] overflow-hidden bg-slate-50 shrink-0 border border-slate-100/60 flex items-center justify-center">
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
            <span className="text-[8.5px] uppercase tracking-wider font-extrabold text-slate-400 truncate">
              {p.category}
            </span>
            <span
              className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full select-none ${
                p.badge === "TERHAD"
                  ? "bg-amber-50 text-amber-600 border border-amber-100"
                  : "bg-emerald-50 text-emerald-600 border border-emerald-100"
              }`}
            >
              {p.badge}
            </span>
          </div>
          
          <h4 className="text-[12.5px] font-bold text-[#0F172A] tracking-tight mt-0.5 truncate">
            {p.name}
          </h4>
          
          <p className="text-[10.5px] text-[#64748B] line-clamp-2 leading-normal mt-0.5">
            {p.description}
          </p>
        </div>
        
        <div className="flex flex-col gap-2 mt-2.5 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-[12.5px] font-extrabold text-indigo-600">
              {p.price}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 w-full">
            <button
              onClick={handleAdd}
              className="flex-1 inline-flex items-center justify-center gap-1 text-[10.5px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 px-2 py-1.5 rounded-[9px] transition-all duration-200"
            >
              {added ? "Added!" : "Add to Order"}
            </button>
            <a
              href={`https://wa.me/601164073143?text=${encodeURIComponent(p.whatsapp_message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1 text-[10.5px] font-bold text-white bg-[#25D366] hover:bg-[#20ba56] px-2 py-1.5 rounded-[9px] transition-all duration-200 shadow-sm hover:shadow"
            >
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolResultRenderer({ text, onAddToCart }: { text: string; onAddToCart: (product: any) => void }) {
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
      <div className="bg-white border border-slate-200/60 text-slate-500 text-[12px] p-3 rounded-[16px] rounded-tl-[5px] shadow-sm">
        Ralat memproses senarai produk.
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full">
      <div className="text-[12px] font-medium text-[#0F172A] leading-relaxed">
        {data.summary}
      </div>
      
      {data.products && data.products.length > 0 ? (
        <div className="space-y-2.5">
          {data.products.map((p, idx) => (
            <ProductCard key={idx} p={p} onAddToCart={onAddToCart} />
          ))}
        </div>
      ) : (
        <div className="text-[11px] text-slate-400 bg-white border border-slate-100 rounded-[14px] p-3.5 text-center shadow-sm">
          Tiada produk tersenarai dijumpai.
        </div>
      )}
    </div>
  );
}

// ─── Widget ───────────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem("golden_ai_messages");
      const savedCart = localStorage.getItem("golden_ai_cart");
      if (savedMessages) setMessages(JSON.parse(savedMessages));
      if (savedCart) setCart(JSON.parse(savedCart));
    } catch (e) {
      console.error("Failed to load state from localStorage", e);
    }
  }, []);

  // Save state to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem("golden_ai_messages", JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save messages to localStorage", e);
    }
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem("golden_ai_cart", JSON.stringify(cart));
    } catch (e) {
      console.error("Failed to save cart to localStorage", e);
    }
  }, [cart]);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Dispatch custom event to notify parent components (like HeroSection) of chat open state
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("golden-chat-toggle", { detail: { isOpen } })
    );
  }, [isOpen]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleAddToCart = (product: any) => {
    setCart((prev) => {
      const updated = [...prev];
      const existingIdx = updated.findIndex((c) => c.name.toLowerCase() === product.name.toLowerCase());
      
      const priceString = product.price || "RM 0";
      const priceNum = parseFloat(priceString.replace(/[^0-9.]/g, '')) || 0;

      if (existingIdx > -1) {
        updated[existingIdx].quantity += 1;
        updated[existingIdx].total = `RM ${(updated[existingIdx].quantity * updated[existingIdx].priceNum).toFixed(2)}`;
      } else {
        updated.push({
          name: product.name,
          category: product.category || "Beverage",
          price: product.price,
          priceNum: priceNum,
          quantity: 1,
          total: `RM ${priceNum.toFixed(2)}`,
          image_url: product.image_url,
          whatsapp_message: `Saya berminat dengan ${product.name} (1 unit, jumlah RM ${priceNum.toFixed(2)}). Boleh proceed pesanan?`
        });
      }
      return updated;
    });
  };

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
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Something went wrong.";
      console.error("Chat Error:", err);
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setCart([]);
    setError(null);
    try {
      localStorage.removeItem("golden_ai_messages");
      localStorage.removeItem("golden_ai_cart");
    } catch (e) {
      console.error("Failed to clear localStorage", e);
    }
  };

  const handleSuggestionClick = (query: string) => {
    setMessage(query);
    inputRef.current?.focus();
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Floating Trigger Bubble — Hidden when open to prevent overlap ── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            aria-label="Open Golden AI chat"
            style={{ zIndex: 9999 }}
            className="fixed bottom-24 lg:bottom-6 right-4 lg:right-6 w-14 h-14 rounded-full bg-[#1a1a1a] hover:bg-[#333] text-white flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.28)] cursor-pointer border border-white/10"
          >
            <Bot className="w-6 h-6 text-[#EAB308]" />
            <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-[#EAB308] border-2 border-[#1a1a1a] animate-pulse" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat Panel — slides up above the bubble ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Mobile backdrop */}
            <motion.div
              key="chat-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 sm:hidden"
              style={{ zIndex: 9997 }}
              onClick={() => setIsOpen(false)}
            />

            {/* Floating Panel */}
            <motion.div
              key="chat-panel"
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="fixed bottom-[90px] right-6 w-[calc(100vw-3rem)] sm:w-[380px] h-[520px] flex flex-col overflow-hidden rounded-[22px] border border-white/60 shadow-[0_24px_60px_rgba(0,0,0,0.18)]"
              style={{
                zIndex: 9998,
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                fontFamily: "var(--font-inter), var(--font-dm-sans), sans-serif",
              }}
            >
            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[10px] bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-[13.5px] font-bold text-[#0F172A] tracking-tight leading-none">
                    Golden AI
                  </h2>
                  <p className="text-[10px] text-[#64748B] mt-0.5 font-medium">
                    Pembantu Jualan Borong
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Online status */}
                <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </div>

                {/* Clear button */}
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearChat}
                    title="Clear chat"
                    className="p-1.5 rounded-lg text-rose-400 hover:text-rose-500 hover:bg-rose-50 transition-all duration-200 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Close button */}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200 cursor-pointer"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Messages area ─────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
              <AnimatePresence initial={false}>

                {/* Empty state */}
                {messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className="h-full flex flex-col items-center justify-center text-center py-4"
                  >
                    {/* Icon */}
                    <div className="relative mb-4">
                      <div className="absolute inset-0 rounded-2xl blur-2xl bg-indigo-400/10 scale-150" />
                      <div className="relative w-[52px] h-[52px] rounded-[16px] bg-indigo-500 flex items-center justify-center shadow-xl shadow-indigo-500/20">
                        <Bot className="w-6 h-6 text-white" />
                      </div>
                    </div>

                    <h3 className="text-[15px] font-bold text-[#0F172A] tracking-tight">
                      Selamat datang ke Golden AI
                    </h3>
                    <p className="text-[11.5px] text-[#64748B] mt-1.5 max-w-[240px] leading-relaxed">
                      Tanya tentang katalog arak premium, harga borong, atau cara
                      daftar akaun B2B.
                    </p>

                    {/* Suggestions */}
                    <div className="mt-6 w-full">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center mb-3">
                        Quick Actions
                      </p>
                      <div className="flex flex-wrap justify-center gap-2">
                        {SUGGESTIONS.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleSuggestionClick(s.query)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[11.5px] font-bold text-[#0F172A] bg-white hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-300 rounded-full transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
                          >
                            <span className="text-[13px]">{s.icon}</span>
                            <span>{s.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Messages */}
                {messages.length > 0 && (
                  <div className="space-y-4">
                    {messages.map((msg, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22 }}
                        className={`flex items-start gap-2 ${
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
                              <ToolResultRenderer text={msg.text} onAddToCart={handleAddToCart} />
                            )
                          ) : (
                            <div
                              className={`rounded-[16px] px-3.5 py-2.5 text-[12.5px] leading-relaxed whitespace-pre-wrap ${
                                msg.role === "user"
                                  ? "bg-[#6366F1] text-white rounded-tr-[5px] shadow-lg shadow-indigo-500/15"
                                  : "bg-white border border-slate-200/60 text-[#0F172A] rounded-tl-[5px] shadow-sm"
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
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.22 }}
                        className="flex items-start gap-2 justify-start"
                      >
                        <div className="w-7 h-7 rounded-[9px] bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                          <Loader2 className="w-[13px] h-[13px] text-indigo-400 animate-spin" />
                        </div>
                        <div className="flex flex-col items-start">
                          <MessageLabel>Golden AI</MessageLabel>
                          <div className="bg-white border border-slate-200/60 rounded-[16px] rounded-tl-[5px] px-3.5 py-2.5 flex items-center gap-2 shadow-sm">
                            <span className="flex gap-1">
                              {[0, 1, 2].map((i) => (
                                <span
                                  key={i}
                                  className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                                  style={{ animationDelay: `${i * 0.15}s` }}
                                />
                              ))}
                            </span>
                            <span className="text-[11.5px] text-[#64748B] font-medium">
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
                        className="flex items-start gap-2.5 bg-rose-50 border border-rose-200/70 rounded-[14px] px-3.5 py-3 shadow-sm"
                      >
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11.5px] font-bold text-rose-700">
                            Ralat Berlaku
                          </p>
                          <p className="text-[11px] text-rose-500 mt-0.5">{error}</p>
                        </div>
                      </motion.div>
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Input bar ─────────────────────────────────────────────────── */}
            <div className="px-4 py-3 border-t border-slate-100/80 shrink-0">
              <form onSubmit={handleChatSubmit} className="flex gap-2 items-center">
                <input
                  ref={inputRef}
                  id="chat-widget-input"
                  type="text"
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={loading}
                  placeholder="Tanya Golden AI sesuatu..."
                  className="flex-1 bg-slate-50 border border-slate-200/80 text-[#0F172A] placeholder:text-slate-400 px-3.5 py-2.5 rounded-[12px] outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/8 shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-[12.5px] font-medium"
                />
                <motion.button
                  whileHover={{ scale: loading ? 1 : 1.04 }}
                  whileTap={{ scale: loading ? 1 : 0.96 }}
                  type="submit"
                  disabled={loading || !message.trim()}
                  className="bg-[#6366F1] hover:bg-indigo-600 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-semibold px-4 py-2.5 rounded-[12px] transition-all duration-200 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 flex items-center justify-center gap-1.5 text-[12.5px] cursor-pointer shrink-0"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <span className="hidden sm:inline">Hantar</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </motion.button>
              </form>
              <p className="text-center text-[9.5px] text-slate-400 mt-2 select-none">
                Golden AI · Powered by OpenAI · Golden Isle Wholesale
              </p>
            </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
