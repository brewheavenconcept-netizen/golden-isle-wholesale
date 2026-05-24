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
  ArrowLeft,
  ShoppingCart,
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

// ─── Languages & Translations ──────────────────────────────────────────────────

type Language = "ms" | "en" | "zh";

const TRANSLATIONS = {
  ms: {
    title: "Golden AI",
    subtitle: "Pembantu Jualan Borong",
    placeholder: "Tanya Golden AI sesuatu...",
    welcomeTitle: "Selamat datang ke Golden AI",
    welcomeDesc: "Tanya tentang katalog arak premium, harga borong, atau cara daftar akaun B2B.",
    quickActionsTitle: "Quick Actions",
    errorTitle: "Ralat Berlaku",
    thinking: "Sedang merangka jawapan...",
    userLabel: "Anda",
    botLabel: "Golden AI",
    quoteTitle: "Quote Draft",
    brandTitle: "Golden Isle Wholesale",
    grandTotal: "Grand Total",
    modifyBtn: "Modify Quote",
    whatsappBtn: "WhatsApp Sales",
    noQuote: "Tiada draf quote buat masa ini.",
    addedConfirm: "✅ Ditambah ke draf quote",
    addedBtn: "✓ Added!",
    addBtn: "Add to Order",
    waBtn: "WhatsApp",
    errReceipt: "Ralat memproses resit draf.",
    errProduct: "Ralat memproses senarai produk.",
    noProduct: "Tiada produk tersenarai dijumpai.",
    waProceedMsg: "Hi, saya mahu proceed pesanan borong untuk:\n\n",
    waTotalMsg: "\n*Jumlah Keseluruhan: RM {total}*\n\nSila sediakan bil & pautan QR untuk pembayaran. Terima kasih!",
    suggestions: [
      { label: "Recommend Whisky", icon: "🥃", query: "Tolong recommend whisky premium yang best bosku." },
      { label: "Request Bulk Quote", icon: "📦", query: "Saya nak request sebut harga (bulk quote) untuk stok hotel/restoran." },
      { label: "View Cart", icon: "🛒", query: "Tunjuk cart saya." },
      { label: "Talk to Sales", icon: "💬", query: "Macam mana nak bercakap terus dengan sales / WhatsApp?" },
    ]
  },
  en: {
    title: "Golden AI",
    subtitle: "B2B Wholesale Assistant",
    placeholder: "Ask Golden AI anything...",
    welcomeTitle: "Welcome to Golden AI",
    welcomeDesc: "Ask about our premium liquor catalog, wholesale pricing, or how to register a B2B account.",
    quickActionsTitle: "Quick Actions",
    errorTitle: "Error Occurred",
    thinking: "Drafting response...",
    userLabel: "You",
    botLabel: "Golden AI",
    quoteTitle: "Quote Draft",
    brandTitle: "Golden Isle Wholesale",
    grandTotal: "Grand Total",
    modifyBtn: "Modify Quote",
    whatsappBtn: "WhatsApp Sales",
    noQuote: "No quote drafts at the moment.",
    addedConfirm: "✅ Added to quote draft",
    addedBtn: "✓ Added!",
    addBtn: "Add to Order",
    waBtn: "WhatsApp",
    errReceipt: "Error processing quote draft.",
    errProduct: "Error processing product list.",
    noProduct: "No listed products found.",
    waProceedMsg: "Hi, I would like to proceed with this wholesale order for:\n\n",
    waTotalMsg: "\n*Grand Total: RM {total}*\n\nPlease prepare the invoice & QR payment link. Thank you!",
    suggestions: [
      { label: "Recommend Whisky", icon: "🥃", query: "Please recommend some premium whisky." },
      { label: "Request Bulk Quote", icon: "📦", query: "I would like to request a wholesale bulk quote for hotel/restaurant stock." },
      { label: "View Cart", icon: "🛒", query: "Show my cart." },
      { label: "Talk to Sales", icon: "💬", query: "How do I talk directly to sales or WhatsApp?" },
    ]
  },
  zh: {
    title: "Golden AI",
    subtitle: "B2B 批发销售助理",
    placeholder: "向 Golden AI 咨询任何问题...",
    welcomeTitle: "欢迎来到 Golden AI",
    welcomeDesc: "咨询关于高端酒类目录、批发价格或如何注册 B2B 批发账户。",
    quickActionsTitle: "快捷操作",
    errorTitle: "发生错误",
    thinking: "正在生成回复...",
    userLabel: "您",
    botLabel: "Golden AI",
    quoteTitle: "报价单草稿",
    brandTitle: "Golden Isle Wholesale",
    grandTotal: "总计金额",
    modifyBtn: "修改报价",
    whatsappBtn: "微信/WhatsApp 销售",
    noQuote: "目前没有报价单草稿。",
    addedConfirm: "✅ 已添加到报价单草稿",
    addedBtn: "✓ 已添加!",
    addBtn: "加入订单",
    waBtn: "联系 WhatsApp",
    errReceipt: "处理报价单草稿时出错。",
    errProduct: "处理产品列表时出错。",
    noProduct: "未找到相关产品。",
    waProceedMsg: "您好，我想为以下货品办理大宗批发订单：\n\n",
    waTotalMsg: "\n*总计金额: RM {total}*\n\n请准备发票和付款二维码。谢谢！",
    suggestions: [
      { label: "推荐威士忌", icon: "🥃", query: "请推荐一些高端威士忌。" },
      { label: "申请大宗报价", icon: "📦", query: "我想为酒店/餐厅库存申请大宗批发报价单。" },
      { label: "查看购物车", icon: "🛒", query: "显示我的购物车。" },
      { label: "联系销售", icon: "💬", query: "如何直接联系销售人员或通过 WhatsApp 沟通？" },
    ]
  }
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function AvatarBot() {
  return (
    <div className="w-8 h-8 rounded-[10px] bg-indigo-600 flex items-center justify-center shrink-0 mt-0.5 shadow-md shadow-indigo-500/20">
      <Bot className="w-[14px] h-[14px] text-white" />
    </div>
  );
}

function AvatarUser() {
  return (
    <div className="w-8 h-8 rounded-[10px] bg-slate-200 flex items-center justify-center shrink-0 mt-0.5">
      <User className="w-[14px] h-[14px] text-slate-500" />
    </div>
  );
}

// ─── Quote Renderer ────────────────────────────────────────────────────────────

function QuoteRenderer({ text, onModifyQuote, lang }: { text: string; onModifyQuote: () => void; lang: Language }) {
  const t = TRANSLATIONS[lang];
  let data: { action: string; summary: string; products: CartItem[] } | null = null;
  try { data = JSON.parse(text.substring(12)); } catch (e) {}

  if (!data) return (
    <div className="bg-white border border-slate-200/60 text-slate-500 text-[13px] p-3.5 rounded-2xl rounded-tl-[5px] shadow-sm">
      {t.errReceipt}
    </div>
  );

  const grandTotal = data.products.reduce((acc, item) => acc + (item.priceNum * item.quantity), 0);

  const buildWhatsAppMsg = () => {
    if (!data?.products?.length) return "";
    let msg = t.waProceedMsg;
    data.products.forEach(item => {
      msg += `• ${item.quantity}x ${item.name} (${item.price}/unit) — Jumlah: ${item.total}\n`;
    });
    msg += t.waTotalMsg.replace("{total}", grandTotal.toFixed(2));
    return msg;
  };

  const checkoutLink = `https://wa.me/601164073143?text=${encodeURIComponent(buildWhatsAppMsg())}`;

  return (
    <div className="space-y-3 w-full">
      <div className="text-[13px] font-medium text-slate-700 leading-relaxed">{data.summary}</div>
      {data.products?.length > 0 ? (
        <div className="bg-[#0F172A] rounded-2xl overflow-hidden shadow-xl p-4 space-y-4 border border-white/5">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] font-bold text-amber-400 tracking-widest uppercase">{t.quoteTitle}</span>
            </div>
            <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">{t.brandTitle}</span>
          </div>
          <div className="space-y-3 divide-y divide-white/5">
            {data.products.map((p, idx) => (
              <div key={idx} className="flex items-start justify-between gap-3 pt-3 first:pt-0">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-white truncate">{p.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{p.quantity} unit × {p.price}</p>
                </div>
                <span className="text-[13px] font-extrabold text-white shrink-0">{p.total}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t.grandTotal}</span>
            <span className="text-[16px] font-black text-amber-400">RM {grandTotal.toFixed(2)}</span>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onModifyQuote}
              className="flex-1 text-[11px] font-bold text-white bg-white/10 hover:bg-white/15 py-3 rounded-xl transition-all">
              {t.modifyBtn}
            </button>
            <a href={checkoutLink} target="_blank" rel="noopener noreferrer"
              className="flex-1 text-[11px] font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 py-3 rounded-xl text-center transition-all shadow-md">
              {t.whatsappBtn}
            </a>
          </div>
        </div>
      ) : (
        <div className="text-[12px] text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
          {t.noQuote}
        </div>
      )}
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ p, onAddToCart, lang }: { p: any; onAddToCart: (product: any) => void; lang: Language }) {
  const t = TRANSLATIONS[lang];
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart(p);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const getWaMessage = () => {
    if (lang === "en") {
      return `Hi, I am interested in ${p.name} (${p.price}). Could you provide more details?`;
    }
    if (lang === "zh") {
      return `您好，我对 ${p.name} (${p.price}) 很感兴趣。请问可以提供更多详细信息吗？`;
    }
    return p.whatsapp_message || `Saya berminat dengan ${p.name} (${p.price}). Boleh info lanjut?`;
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 flex flex-col">
      {p.image_url && (
        <div className="w-full h-[130px] bg-slate-50 overflow-hidden">
          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[9px] uppercase tracking-widest font-bold text-slate-400 truncate">{p.category}</span>
          <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
            p.badge === "TERHAD" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
          }`}>{p.badge}</span>
        </div>
        <h4 className="text-[14px] font-bold text-slate-900 leading-tight">{p.name}</h4>
        <p className="text-[11.5px] text-slate-500 line-clamp-2 leading-relaxed flex-1">{p.description}</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[14px] font-extrabold text-indigo-600">{p.price}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAdd}
            className="flex-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 py-2.5 rounded-xl transition-all">
            {added ? t.addedBtn : t.addBtn}
          </button>
          <a href={`https://wa.me/601164073143?text=${encodeURIComponent(getWaMessage())}`}
            target="_blank" rel="noopener noreferrer"
            className="flex-1 text-[11px] font-bold text-white bg-[#25D366] hover:bg-[#20ba56] py-2.5 rounded-xl text-center transition-all">
            {t.waBtn}
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Tool Result Renderer ─────────────────────────────────────────────────────

function ToolResultRenderer({ text, onAddToCart, lang }: { text: string; onAddToCart: (product: any) => void; lang: Language }) {
  const t = TRANSLATIONS[lang];
  let data: { summary: string; products: any[] } | null = null;
  try { data = JSON.parse(text.substring(12)); } catch (e) {}

  if (!data) return (
    <div className="text-slate-500 text-[13px] p-3.5 bg-white border border-slate-200/60 rounded-2xl rounded-tl-[5px] shadow-sm">
      {t.errProduct}
    </div>
  );

  return (
    <div className="space-y-3 w-full">
      <div className="text-[13px] font-medium text-slate-700 leading-relaxed">{data.summary}</div>
      {data.products?.length > 0 ? (
        <div className="space-y-3">
          {data.products.map((p, idx) => (
            <ProductCard key={idx} p={p} onAddToCart={onAddToCart} lang={lang} />
          ))}
        </div>
      ) : (
        <div className="text-[12px] text-slate-400 bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
          {t.noProduct}
        </div>
      )}
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [lang, setLang] = useState<Language>("ms");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[lang];

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Lock body scroll on mobile when open
  useEffect(() => {
    if (isMobile) {
      document.body.style.overflow = isOpen ? "hidden" : "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen, isMobile]);

  // Load from localStorage
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem("golden_ai_messages");
      const savedCart = localStorage.getItem("golden_ai_cart");
      const savedLang = localStorage.getItem("golden_ai_language") as Language;
      if (savedMessages) setMessages(JSON.parse(savedMessages));
      if (savedCart) setCart(JSON.parse(savedCart));
      if (savedLang && ["ms", "en", "zh"].includes(savedLang)) setLang(savedLang);
    } catch (e) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("golden_ai_messages", JSON.stringify(messages)); } catch (e) {}
  }, [messages]);

  useEffect(() => {
    try { localStorage.setItem("golden_ai_cart", JSON.stringify(cart)); } catch (e) {}
  }, [cart]);

  useEffect(() => {
    try { localStorage.setItem("golden_ai_language", lang); } catch (e) {}
  }, [lang]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("golden-chat-toggle", { detail: { isOpen } }));
  }, [isOpen]);

  // ── autoViewCart ─────────────────────────────────────────────────────────────

  const autoViewCart = async () => {
    setLoading(true);
    setError(null);
    try {
      const savedCart = JSON.parse(localStorage.getItem("golden_ai_cart") || "[]");
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", text: lang === "zh" ? "显示我的购物车。" : lang === "en" ? "Show my cart." : "Tunjuk cart saya." }],
          cart: savedCart,
          language: lang
        }),
      });
      const data: ChatResponse = await response.json();
      if (data.reply) {
        setMessages((prev) => [
          ...prev,
          { role: "user", text: t.addedConfirm },
          { role: "model", text: data.reply! }
        ]);
        if (data.reply.startsWith("TOOL_RESULT:")) {
          try {
             const parsed = JSON.parse(data.reply.substring(12));
             if (parsed?.action && Array.isArray(parsed.products)) setCart(parsed.products);
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error("autoViewCart error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── handleAddToCart ───────────────────────────────────────────────────────────

  const handleAddToCart = (product: any) => {
    setCart((prev) => {
      const updated = [...prev];
      const existingIdx = updated.findIndex((c) => c.name.toLowerCase() === product.name.toLowerCase());
      const priceNum = parseFloat((product.price || "RM 0").replace(/[^0-9.]/g, "")) || 0;
      if (existingIdx > -1) {
        updated[existingIdx].quantity += 1;
        updated[existingIdx].total = `RM ${(updated[existingIdx].quantity * updated[existingIdx].priceNum).toFixed(2)}`;
      } else {
        updated.push({
          name: product.name,
          category: product.category || "Beverage",
          price: product.price,
          priceNum,
          quantity: 1,
          total: `RM ${priceNum.toFixed(2)}`,
          image_url: product.image_url,
          whatsapp_message: `Saya berminat dengan ${product.name} (1 unit, jumlah RM ${priceNum.toFixed(2)}). Boleh proceed pesanan?`
        });
      }
      return updated;
    });
    setTimeout(() => { autoViewCart(); }, 100);
  };

  // ── handleChatSubmit ──────────────────────────────────────────────────────────

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
        body: JSON.stringify({ messages: updatedMessages, cart, language: lang }),
      });
      const data: ChatResponse = await response.json();
      if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
      if (data.reply) {
        setMessages((prev) => [...prev, { role: "model", text: data.reply! }]);
        if (data.reply.startsWith("TOOL_RESULT:")) {
          try {
            const parsed = JSON.parse(data.reply.substring(12));
            if (parsed && (parsed.action === "cart_updated" || parsed.action === "cart_viewed") && Array.isArray(parsed.products)) {
              setCart(parsed.products);
            }
          } catch (e) {}
        }
      } else {
        throw new Error("Empty reply from AI.");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Something went wrong.";
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
    } catch (e) {}
  };

  const handleSuggestionClick = (query: string) => {
    setMessage(query);
    inputRef.current?.focus();
  };

  // ── Panel animation variants ──────────────────────────────────────────────────

  const panelVariants = isMobile
    ? {
        initial: { y: "100%", opacity: 1 },
        animate: { y: 0, opacity: 1 },
        exit: { y: "100%", opacity: 1 },
      }
    : {
        initial: { opacity: 0, y: 20, scale: 0.96 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: 20, scale: 0.96 },
      };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Floating Trigger Bubble ── */}
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
            className="fixed bottom-6 right-4 sm:right-6 w-14 h-14 rounded-full bg-[#1a1a1a] hover:bg-[#222] text-white flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.3)] cursor-pointer border border-white/10"
          >
            <Bot className="w-6 h-6 text-amber-400" />
            <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-[#1a1a1a] animate-pulse" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-indigo-500 border-2 border-white text-[9px] font-bold text-white flex items-center justify-center">
                {cart.reduce((a, c) => a + c.quantity, 0)}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop — mobile only */}
            {isMobile && (
              <motion.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 sm:hidden"
                style={{ zIndex: 9997 }}
                onClick={() => setIsOpen(false)}
              />
            )}

            <motion.div
              key="chat-panel"
              variants={panelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={isMobile
                ? { type: "tween", duration: 0.32, ease: [0.32, 0, 0.67, 0] }
                : { type: "spring", stiffness: 340, damping: 28 }
              }
              style={{
                zIndex: 9998,
                fontFamily: "var(--font-inter), var(--font-dm-sans), sans-serif",
              }}
              className={`
                fixed flex flex-col overflow-hidden
                ${isMobile
                  // Mobile: full screen, slides up from bottom
                  ? "inset-0 rounded-none bg-white"
                  // Desktop: premium floating panel, larger
                  : "bottom-6 right-6 w-[440px] h-[640px] rounded-[24px] border border-slate-200/70 shadow-[0_32px_80px_rgba(0,0,0,0.16)] bg-white/95 backdrop-blur-xl"
                }
              `}
            >

              {/* ── Header ── */}
              <div className={`flex items-center justify-between shrink-0 border-b border-slate-100 ${
                isMobile ? "px-4 py-4 pt-12" : "px-5 py-4"
              }`}>
                <div className="flex items-center gap-3">
                  {isMobile ? (
                    <button type="button" onClick={() => setIsOpen(false)}
                      className="p-1.5 -ml-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                  ) : null}
                  <div className="w-9 h-9 rounded-[12px] bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-[14px] font-bold text-slate-900 tracking-tight leading-none">{t.title}</h2>
                    <p className="text-[10.5px] text-slate-400 mt-0.5 font-medium">{t.subtitle}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Language Switcher Dropdown */}
                  <div className="relative shrink-0 flex items-center">
                    <select
                      value={lang}
                      onChange={(e) => setLang(e.target.value as Language)}
                      style={{ WebkitAppearance: "none", MozAppearance: "none" }}
                      className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold py-1 pl-2.5 pr-6 rounded-full outline-none cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all select-none"
                    >
                      <option value="ms">🇲🇾 BM</option>
                      <option value="en">🇬🇧 EN</option>
                      <option value="zh">🇨🇳 中</option>
                    </select>
                    <div className="pointer-events-none absolute right-2.5 top-[50%] -translate-y-[50%] flex items-center text-slate-400">
                      <svg className="fill-current h-2.5 w-2.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                      </svg>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </div>
                  {cart.length > 0 && (
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full">
                      <ShoppingCart className="w-3 h-3" />
                      {cart.reduce((a, c) => a + c.quantity, 0)}
                    </div>
                  )}
                  {messages.length > 0 && (
                    <button type="button" onClick={handleClearChat}
                      className="p-1.5 rounded-xl text-rose-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {!isMobile && (
                    <button type="button" onClick={() => setIsOpen(false)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* ── Messages ── */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-5 min-h-0 overscroll-contain">
                <AnimatePresence initial={false}>

                  {/* Empty state */}
                  {messages.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="h-full flex flex-col items-center justify-center text-center py-6"
                    >
                      <div className="relative mb-5">
                        <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-xl shadow-indigo-500/25">
                          <Bot className="w-8 h-8 text-white" />
                        </div>
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 border-2 border-white animate-pulse" />
                      </div>
                      <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">{t.welcomeTitle}</h3>
                      <p className="text-[12.5px] text-slate-500 mt-2 max-w-[260px] leading-relaxed">
                        {t.welcomeDesc}
                      </p>
                      <div className="mt-7 w-full">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center mb-3.5">{t.quickActionsTitle}</p>
                        <div className="flex flex-wrap justify-center gap-2">
                          {t.suggestions.map((s, i) => (
                            <button key={i} type="button" onClick={() => handleSuggestionClick(s.query)}
                              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-semibold text-slate-700 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-full transition-all shadow-sm hover:shadow cursor-pointer">
                              <span className="text-[14px]">{s.icon}</span>
                              <span>{s.label}</span>
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
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex items-start gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {msg.role === "model" && <AvatarBot />}
                          <div className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                            <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">
                              {msg.role === "user" ? t.userLabel : t.botLabel}
                            </span>
                            {msg.role === "model" && msg.text.startsWith("TOOL_RESULT:") ? (
                              msg.text.includes('"action":"cart_') ? (
                                <QuoteRenderer text={msg.text} onModifyQuote={() => handleSuggestionClick(lang === "zh" ? "请修改此报价单：" : lang === "en" ? "Please modify this quote: " : "Tolong ubah quote ni bosku: ")} lang={lang} />
                              ) : (
                                <ToolResultRenderer text={msg.text} onAddToCart={handleAddToCart} lang={lang} />
                              )
                            ) : (
                              <div className={`rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed whitespace-pre-wrap ${
                                msg.role === "user"
                                  ? "bg-indigo-600 text-white rounded-tr-[6px] shadow-md shadow-indigo-500/15"
                                  : "bg-slate-50 border border-slate-100 text-slate-800 rounded-tl-[6px]"
                              }`}>
                                {msg.text}
                              </div>
                            )}
                          </div>
                          {msg.role === "user" && <AvatarUser />}
                        </motion.div>
                      ))}

                      {/* Loading */}
                      {loading && (
                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-[10px] bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.botLabel}</span>
                            <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-[6px] px-4 py-3 flex items-center gap-2.5">
                              <span className="flex gap-1">
                                {[0, 1, 2].map((i) => (
                                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                                    style={{ animationDelay: `${i * 0.15}s` }} />
                                ))}
                              </span>
                              <span className="text-[12px] text-slate-400 font-medium">{t.thinking}</span>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* Error */}
                      {error && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="flex items-start gap-2.5 bg-rose-50 border border-rose-200/70 rounded-2xl px-4 py-3">
                          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-[12px] font-bold text-rose-700">{t.errorTitle}</p>
                            <p className="text-[11.5px] text-rose-500 mt-0.5">{error}</p>
                          </div>
                        </motion.div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Input Bar ── */}
              <div className={`shrink-0 border-t border-slate-100 ${isMobile ? "px-4 py-4 pb-8" : "px-5 py-4"}`}>
                <form onSubmit={handleChatSubmit} className="flex gap-2.5 items-center">
                  <input
                    ref={inputRef}
                    type="text"
                    required
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={loading}
                    placeholder={t.placeholder}
                    className="flex-1 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 px-4 py-3 rounded-[14px] outline-none focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/8 transition-all disabled:opacity-50 text-[13.5px] font-medium"
                  />
                  <motion.button
                    whileTap={{ scale: loading ? 1 : 0.95 }}
                    type="submit"
                    disabled={loading || !message.trim()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white px-4 py-3 rounded-[14px] transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </motion.button>
                </form>
                <p className="text-center text-[9.5px] text-slate-300 mt-2.5 select-none">
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
