"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const GlowingOrb = dynamic(() => import("./GlowingOrb"), { ssr: false });

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
  Paperclip,
  Wine,
  Beer,
  Package,
  MessageSquare,
  Phone,
  ShoppingBag,
  LayoutGrid,
  Zap,
  Building2,
  Gift,
  Globe,
  CheckCircle2,
  GlassWater,
  ChevronRight,
  Truck,
  Wallet,
  MessageCircle,
  Mic,
  Orbit,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePublicStore } from "@/hooks/usePublicStore";
import { getProducts, createOrderWithStockCheck, clearCart } from "@/lib/storage";
import { Order, OrderItem } from "@/types";
import toast from "react-hot-toast";
import {
  CustomerContext,
  createEmptyContext,
  extractContextFromMessage,
} from "@/lib/contextBuilder";
import { generateContextualChips } from "@/lib/chipGenerator";

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

type Language = "ms" | "en" | "zh";

// ─── Flow Type ────────────────────────────────────────────────────────────────
type FlowType =
  | "browse_products"      // Flow 1 — deterministic, no LLM
  | "wholesale_quote"      // Flow 2 — LLM for recommendation only
  | "delivery_coverage"    // Flow 3 — deterministic delivery
  | "ask_question"         // Flow 4 — constrained LLM
  | null;

type ChatStep =
  // ── Entry ────────────────────────────────────────────────────────────────
  | "START"
  | "MAIN_MENU"
  // ── Flow 1: Browse Products (deterministic, zero LLM) ────────────────────
  | "BROWSE_CATEGORY"
  | "BROWSE_PRODUCTS"
  | "CART_REVIEW"
  | "CHECKOUT_DETAILS"
  | "PAYMENT_SELECTION"
  | "PAYMENT_COMPLETE"
  // ── Flow 2: Wholesale Quote (LLM for recommendation only) ─────────────────
  | "QUOTE_CATEGORY"
  | "QUOTE_BUSINESS_TYPE"
  | "QUOTE_RECOMMENDATION"
  | "QUOTE_REVIEW"
  | "QUOTE_HANDOFF"
  // ── Flow 3: Delivery Coverage ──────────────────────────────────────────────
  | "DELIVERY_AREA"
  // ── Flow 4: Ask a Question (constrained LLM) ──────────────────────────────
  | "FAQ_CHAT";

const TRANSLATIONS = {
  ms: {
    title: "Golden AI",
    subtitle: "Premium B2B Concierge",
    placeholder: "Taip sesuatu atau pilih di bawah...",
    welcomeTitle: "Boss nak stok untuk event atau restoran? 🎯",
    welcomeDesc: "Sy suggest dalam 60 saat. Pilih je di bawah.",
    quickActionsTitle: "Quick Actions",
    errorTitle: "Ralat Berlaku",
    thinking: "Sedang membuat cadangan terbaik...",
    userLabel: "Anda",
    botLabel: "Golden AI",
    quoteTitle: "Quote Draft",
    brandTitle: "Golden Isle Wholesale",
    grandTotal: "Grand Total",
    modifyBtn: "Modify Quote",
    whatsappBtn: "WhatsApp Sales",
    noQuote: "Tiada draf sebut harga buat masa ini.",
    addedConfirm: "✅ Ditambah ke sebut harga draf",
    addedBtn: "✓ Added!",
    addBtn: "Add to Quote",
    waBtn: "WhatsApp",
    errReceipt: "Ralat memproses resit draf.",
    errProduct: "Ralat memproses senarai produk.",
    noProduct: "Tiada produk ditemui.",
    waProceedMsg: "Hi, saya mahu proceed pesanan borong untuk:\n\n",
    waTotalMsg: "\n*Jumlah Keseluruhan: RM {total}*\n\nSila sediakan bil & pautan QR untuk pembayaran. Terima kasih!",
    paymentSuccess: (orderId: string) => `🎉 Order ${orderId} confirmed!\n\nTeam kami akan contact boss dalam 30 minit via WhatsApp 📱\n\nSambil tunggu — nak tambah item lagi untuk order yang sama?`,
    addMoreItems: "➕ Tambah Item Lagi",
    talkToSales: "💬 Hubungi Sales",
    addCartBtn: "Tambah ke Troli",
    menuGreeting: "Helo 👋 Macam mana kami boleh bantu boss hari ni?",
    menuBrowse: "Browse Produk",
    menuBrowseDesc: "Lihat katalog produk premium kami",
    menuQuote: "Sebut Harga Borong",
    menuQuoteDesc: "Bina sebut harga untuk pesanan pukal",
    menuDelivery: "Kawasan Penghantaran",
    menuDeliveryDesc: "Semak kawasan & ETA penghantaran",
    menuFAQ: "Tanya Golden AI",
    menuFAQDesc: "Pilih produk, semak delivery & MOQ instant",
    menuSales: "Bercakap dengan Sales",
    menuSalesDesc: "Connect terus dengan team sales kami",
    faqPlaceholder: "Tanya apa sahaja tentang produk kami...",
    faqRefusal: "Maaf, saya hanya boleh bantu soalan berkaitan produk dan pesanan kami. Sila hubungi team sales untuk bantuan lanjut.",
    suggestions: [
      { label: "Recommend by Budget", icon: "🥃", query: "Tolong recommend produk borong ikut budget saya." },
      { label: "Build Wholesale Quote", icon: "📦", query: "Saya nak minta sebut harga (wholesale quote)." },
      { label: "Talk to Human Sales", icon: "💬", query: "Boleh saya bercakap terus dengan sales / WhatsApp?" },
    ]
  },
  en: {
    title: "Golden AI",
    subtitle: "Premium B2B Concierge",
    placeholder: "Describe your wholesale requirements...",
    welcomeTitle: "Stocking up for an event or restaurant? 🎯",
    welcomeDesc: "We'll suggest the perfect wholesale package in 60 seconds. Just select below.",
    quickActionsTitle: "Quick Actions",
    errorTitle: "Error Occurred",
    thinking: "Curating the best wholesale options...",
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
    addBtn: "Add to Quote",
    waBtn: "WhatsApp",
    errReceipt: "Error processing quote draft.",
    errProduct: "Error processing product list.",
    noProduct: "No listed products found.",
    waProceedMsg: "Hi, I would like to proceed with this wholesale order for:\n\n",
    waTotalMsg: "\n*Grand Total: RM {total}*\n\nPlease prepare the invoice & QR payment link. Thank you!",
    paymentSuccess: (orderId: string) => `🎉 Order ${orderId} confirmed!\n\nOur team will contact you within 30 minutes via WhatsApp 📱\n\nWhile you wait — want to add more items to the same order?`,
    addMoreItems: "➕ Add More Items",
    talkToSales: "💬 Talk to Sales",
    addCartBtn: "Add to Cart",
    menuGreeting: "Hello 👋 How can we help you today?",
    menuBrowse: "Browse Products",
    menuBrowseDesc: "Explore our premium wholesale catalog",
    menuQuote: "Get Wholesale Quote",
    menuQuoteDesc: "Build a quote for your bulk order",
    menuDelivery: "Delivery Coverage",
    menuDeliveryDesc: "Check delivery area & ETA",
    menuFAQ: "Ask Golden AI",
    menuFAQDesc: "Choose products, check delivery & MOQ instantly",
    menuSales: "Talk to Sales",
    menuSalesDesc: "Connect directly with our sales team",
    faqPlaceholder: "Ask anything about our products or ordering...",
    faqRefusal: "Sorry, I can only assist with questions related to our products and ordering. Please talk to our sales team for further assistance.",
    suggestions: [
      { label: "Recommend by Budget", icon: "🥃", query: "Please recommend wholesale products based on my budget." },
      { label: "Build Wholesale Quote", icon: "📦", query: "I would like to build a wholesale quote." },
      { label: "Talk to Human Sales", icon: "💬", query: "I want to talk directly to human sales / WhatsApp." },
    ]
  },
  zh: {
    title: "Golden AI",
    subtitle: "高端 B2B 采购助理",
    placeholder: "请描述您的批发需求...",
    welcomeTitle: "为活动或餐厅采购？我们60秒内为您推荐 🎯",
    welcomeDesc: "选择下方选项，立即获取专属批发报价。",
    quickActionsTitle: "快捷操作",
    errorTitle: "发生错误",
    thinking: "正在定制专属批发方案...",
    userLabel: "您",
    botLabel: "Golden AI",
    quoteTitle: "报价单草稿",
    brandTitle: "Golden Isle Wholesale",
    grandTotal: "总计金额",
    modifyBtn: "修改报价",
    whatsappBtn: "联系 WhatsApp 销售",
    noQuote: "目前没有报价单草稿。",
    addedConfirm: "✅ 已添加到报价单草稿",
    addedBtn: "✓ 已添加!",
    addBtn: "加入报价单",
    waBtn: "联系 WhatsApp",
    errReceipt: "处理报价草稿时出错。",
    errProduct: "处理产品列表时出错。",
    noProduct: "未找到相关产品。",
    waProceedMsg: "您好，我想为以下货品办理大宗批发订单：\n\n",
    waTotalMsg: "\n*总计金额: RM {total}*\n\n请准备发票和付款二维码。谢谢！",
    paymentSuccess: (orderId: string) => `🎉 订单 ${orderId} 已确认！\n\n我们的团队将在30分钟内通过 WhatsApp 与您联系 📱\n\n趁等待期间 — 还想为同一张订单添加更多商品吗？`,
    addMoreItems: "➕ 继续添加商品",
    talkToSales: "💬 联系销售",
    addCartBtn: "加入购物车",
    menuGreeting: "您好 👋 今天我们能为您提供什么帮助？",
    menuBrowse: "浏览产品",
    menuBrowseDesc: "探索我们的优质批发目录",
    menuQuote: "获取批发报价",
    menuQuoteDesc: "为您的批量订单建立报价单",
    menuDelivery: "配送范围",
    menuDeliveryDesc: "查看配送区域和预计时间",
    menuFAQ: "询问 Golden AI",
    menuFAQDesc: "即时选择产品、查询配送及起订量",
    menuSales: "联系销售",
    menuSalesDesc: "直接与我们的销售团队联系",
    faqPlaceholder: "请询问有关我们产品或订购的任何问题...",
    faqRefusal: "抱歉，我只能回答与我们产品和订购相关的问题。如需进一步帮助，请联系我们的销售团队。",
    suggestions: [
      { label: "Recommend by Budget", icon: "🥃", query: "请根据我的预算推荐批发产品。" },
      { label: "Build Wholesale Quote", icon: "📦", query: "我想获取批发报价单。" },
      { label: "Talk to Human Sales", icon: "💬", query: "我想直接联系销售代表/WhatsApp。" },
    ]
  }
};


// ─── Sub-components ───────────────────────────────────────────────────────────

function AvatarBot() {
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mt-0.5 shadow-sm flex items-center justify-center bg-transparent">
      <GlowingOrb size={32} />
    </div>
  );
}

function AvatarUser() {
  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#d4af37]/10 via-[#d4af37]/5 to-[#d4af37]/20 border border-[#d4af37]/45 flex items-center justify-center shrink-0 mt-0.5 shadow-[0_2px_8px_rgba(212,175,55,0.12)]">
      <User className="w-[14px] h-[14px] text-[#1a1a1a]" strokeWidth={2.5} />
    </div>
  );
}

function SmartLoader({ lang }: { lang: Language }) {
  const [stepIndex, setStepIndex] = useState(0);

  const steps = {
    ms: [
      "Menganalisis keperluan borong boss...",
      "Menyemak inventori bebas cukai...",
      "Mengira margin diskaun B2B...",
      "Sedang membuat cadangan terbaik..."
    ],
    en: [
      "Analyzing your B2B requirements...",
      "Scanning duty-free catalog...",
      "Optimizing wholesale price margins...",
      "Curating the best wholesale options..."
    ],
    zh: [
      "正在分析您的批发采购需求...",
      "正在扫描免税商品实时库存...",
      "正在优化 B2B 批发价格利润...",
      "正在定制专属最佳批发方案..."
    ]
  };

  const currentSteps = steps[lang] || steps.en;

  useEffect(() => {
    setStepIndex(0);
    const interval = setInterval(() => {
      setStepIndex((prev) => (prev < currentSteps.length - 1 ? prev + 1 : prev));
    }, 1800);
    return () => clearInterval(interval);
  }, [lang, currentSteps.length]);

  return (
    <div className="bg-white/85 backdrop-blur-md border border-[#d4af37]/25 rounded-[22px] rounded-tl-[6px] overflow-hidden shadow-md min-w-[260px] max-w-full flex flex-col divide-y divide-slate-100/80">
      {/* CSS Keyframes for shimmer animation */}
      <style>{`
        @keyframes customShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: customShimmer 2.2s infinite;
        }
      `}</style>

      {/* Top Section: Smart Status Bar */}
      <div className="p-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          {/* Animated Custom Outer Ring with Pulsing Inner Dot */}
          <div className="relative flex items-center justify-center w-3.5 h-3.5 shrink-0">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#d4af37]/35 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#d4af37]" />
          </div>
          
          {/* Dynamic progress bar steps indicator */}
          <div className="flex gap-1.5 items-center flex-1">
            {currentSteps.map((_, idx) => (
              <div
                key={`step-indicator-${idx}`}
                className="h-1 flex-1 rounded-full bg-slate-200/60 overflow-hidden relative"
              >
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: idx <= stepIndex ? "100%" : "0%" }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                  className="h-full bg-gradient-to-r from-[#b8960c] to-[#d4af37]"
                />
              </div>
            ))}
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1 select-none">
            {stepIndex + 1}/{currentSteps.length}
          </span>
        </div>

        {/* Slide & Fade text container (without truncation, allowing wrap) */}
        <div className="relative overflow-hidden min-h-[18px] flex items-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={`step-text-${stepIndex}`}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -8, opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="text-[12.5px] text-[#1a1a1a] font-semibold leading-relaxed select-none block w-full"
            >
              {currentSteps[stepIndex]}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Section: Shimmering Product Card skeleton */}
      <div className="relative p-3.5 bg-white/40 flex flex-col gap-3 select-none pointer-events-none overflow-hidden">
        {/* Shimmer overlay animation across the skeleton */}
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" 
             style={{ backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.4) 50%, rgba(255,255,255,0) 100%)' }} />
        
        <div className="flex flex-row gap-3">
          {/* Image Skeleton Column (Left) */}
          <div className="w-[32%] bg-slate-100/70 h-[92px] rounded-xl flex items-center justify-center p-2 border border-[#d4af37]/15 relative overflow-hidden animate-pulse shrink-0">
            <div className="w-6 h-12 bg-slate-200/80 rounded-sm" />
          </div>

          {/* Content Skeleton Column (Right) */}
          <div className="flex-1 flex flex-col gap-1.5 animate-pulse min-w-0">
            {/* Category tag skeleton */}
            <div className="h-1.5 w-12 bg-slate-200/80 rounded" />
            {/* Title lines skeleton */}
            <div className="h-3 w-32 bg-slate-200/90 rounded mt-0.5" />
            <div className="h-2 w-20 bg-slate-200/70 rounded" />
            
            {/* Price skeleton */}
            <div className="h-3.5 w-14 bg-slate-200/90 rounded mt-1.5" />
          </div>
        </div>

        {/* Action Button Skeletons */}
        <div className="flex gap-2 w-full animate-pulse mt-1">
          <div className="h-8 flex-1 bg-slate-200/80 rounded-lg" />
          <div className="h-8 flex-1 bg-slate-200/50 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function OnboardingPointer() {
  return (
    <div className="relative flex flex-col items-center justify-center pointer-events-none">
      {/* Curved dotted line with arrowhead guiding attention from bottom-right up to the touch target */}
      <svg
        className="absolute -right-8 top-10 w-16 h-20 overflow-visible pointer-events-none opacity-90"
        viewBox="0 0 60 80"
        fill="none"
      >
        <path
          d="M45,75 Q60,45 28,10"
          stroke="#D4AF37"
          strokeWidth="1.5"
          strokeDasharray="4,4"
          strokeLinecap="round"
        />
        {/* Elegant golden arrowhead */}
        <path
          d="M23,16 L28,8 L35,13"
          fill="none"
          stroke="#D4AF37"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Floating Animated Hand Cursor */}
      <motion.div
        animate={{
          x: [0, 2, 0],
          y: [0, -6, 0],
          rotate: [0, -4, 2, 0]
        }}
        transition={{
          repeat: Infinity,
          duration: 1.6,
          ease: "easeInOut"
        }}
        className="relative flex flex-col items-center justify-center h-20 w-full"
      >
        {/* Premium glowing tap/click target ripple */}
        <div className="absolute -top-1.5 w-8 h-8 rounded-full border border-[#D4AF37] bg-[#D4AF37]/15 animate-ping" />
        <div className="absolute top-0 w-5 h-5 rounded-full border border-[#D4AF37]/50 bg-[#D4AF37]/35 flex items-center justify-center shadow-[0_0_10px_rgba(212,175,55,0.45)]">
          <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
        </div>

        {/* Realistic modern 3D sleeve-cuff cursor hand SVG */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 28"
          className="w-11 h-13 drop-shadow-[0_6px_14px_rgba(0,0,0,0.12)] relative z-10 mt-4"
        >
          {/* Blue Sleeve / Cuff */}
          <path
            d="M7 21h10v5a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-5Z"
            fill="#3B82F6"
            stroke="#2563EB"
            strokeWidth="1"
          />
          <path
            d="M7 21h10v2.5H7V21Z"
            fill="#EFF6FF"
          />

          {/* Hand Body & Skin Fingers */}
          <path
            d="M10 16.5V2.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V12h1V5.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V12h1V7.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V12h1V9.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V18c0 3.31-2.69 6-6 6h-2c-2.48 0-4.58-1.51-5.48-3.68l-1.42-3.55a1.5 1.5 0 0 1 2.3-1.8l2.18 1.63V16.5Z"
            fill="#FCD34D"
            stroke="#D97706"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Subtle highlights */}
          <path
            d="M11 4.5v5M14 6.5v4M17 8.5v3"
            stroke="#F59E0B"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>
    </div>
  );
}

// ─── Quote Renderer ────────────────────────────────────────────────────────────

function QuoteRenderer({ text, onModifyQuote, onWhatsAppCheckout, lang }: { text: string; onModifyQuote: () => void; onWhatsAppCheckout: (products: CartItem[], total: number) => void; lang: Language }) {
  const t = TRANSLATIONS[lang];
  let data: { action: string; summary: string; products: CartItem[] } | null = null;
  try { data = JSON.parse(text.substring(12)); } catch (e) { }

  if (!data) return (
    <div className="bg-[#fafaf8] border border-[#d4af37]/20 text-[#1a1a1a] text-[13px] p-4 rounded-2xl rounded-tl-[5px] shadow-sm">
      {t.errReceipt}
    </div>
  );

  const grandTotal = data.products.reduce((acc, item) => acc + (item.priceNum * item.quantity), 0);

  return (
    <div className="space-y-3 w-full">
      <div className="text-[13px] font-medium text-[#1a1a1a] leading-relaxed">{data.summary}</div>
      {data.products?.length > 0 ? (
        <div className="bg-[#fafaf8] rounded-2xl overflow-hidden shadow-md p-5 space-y-4 border border-[#d4af37]/20">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#d4af37] animate-pulse" />
              <span className="text-[10px] font-black text-[#1a1a1a] tracking-wider uppercase">{t.quoteTitle}</span>
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.brandTitle}</span>
          </div>
          <div className="space-y-3 divide-y divide-slate-100">
            {data.products.map((p, idx) => (
              <div key={`quote-prod-${p.name}-${idx}`} className="flex items-start justify-between gap-3 pt-3 first:pt-0">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-black text-[#1a1a1a] truncate">{p.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{p.quantity} unit × {p.price}</p>
                </div>
                <span className="text-[13px] font-extrabold text-[#1a1a1a] shrink-0">{p.total}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t.grandTotal}</span>
            <span className="text-[16px] font-black text-[#1a1a1a]">RM {grandTotal.toFixed(2)}</span>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onModifyQuote}
              className="flex-1 text-[11px] font-semibold text-[#1a1a1a] bg-white border border-slate-200 hover:bg-slate-50 py-2.5 rounded-full transition-all cursor-pointer">
              {t.modifyBtn}
            </button>
            <button type="button" onClick={() => onWhatsAppCheckout(data!.products, grandTotal)}
              className="flex-1 text-[11px] font-semibold text-white bg-[#b8960c] hover:bg-[#d4af37] py-2.5 rounded-full text-center transition-all shadow-sm cursor-pointer active:scale-[0.98]">
              {t.whatsappBtn}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-[12px] text-slate-500 bg-[#fafaf8] border border-slate-200/50 rounded-xl p-4 text-center">
          {t.noQuote}
        </div>
      )}
    </div>
  );
}

// ─── Urgency Copy Helper ──────────────────────────────────────────────────────

function getUrgencyCopy(category: string, badge: string, lang: Language): string {
  const cat = (category || "").toLowerCase();
  if (badge === "TERHAD") {
    if (lang === "zh") return "⚡ 库存有限 — 立即下单锁货！";
    if (lang === "en") return "⚡ Limited stock — order now to secure yours!";
    return "⚡ Stok terhad — pesan sekarang sebelum kehabisan!";
  }
  if (cat.includes("whisky") || cat.includes("whiskey")) {
    if (lang === "zh") return "🥃 本月拿督餐厅热销款 — 批量订购享优先配送";
    if (lang === "en") return "🥃 Top B2B pick this month — hotels & bars repeat ordering";
    return "🥃 Pilihan #1 horeca Labuan bulan ini — restoran dah repeat order 🔥";
  }
  if (cat.includes("wine")) {
    if (lang === "zh") return "🍷 宴会及高端晚宴首选 — 库存充足";
    if (lang === "en") return "🍷 Event & gala dinner best seller — well stocked";
    return "🍷 Best seller event & gala dinner — stok penuh sekarang";
  }
  if (cat.includes("beer") || cat.includes("craft")) {
    if (lang === "zh") return "🍺 进口精酿 — 派对活动大量采购首选";
    if (lang === "en") return "🍺 Imported craft — crowd favourite for events & parties";
    return "🍺 Import premium — crowd favourite untuk event & majlis";
  }
  if (cat.includes("cognac") || cat.includes("brandy")) {
    if (lang === "zh") return "✨ 高端礼品首选 — VIP 接待及商务场合热门款";
    if (lang === "en") return "✨ Premium gifting & VIP hospitality favourite";
    return "✨ Pilihan premium untuk hadiah VIP & majlis korporat";
  }
  if (lang === "zh") return "✨ 优质批发精选 — 现货供应";
  if (lang === "en") return "✨ Premium wholesale selection — in stock now";
  return "✨ Pilihan borong premium — stok tersedia sekarang";
}

function ProductCard({ p, onAddToCart, onSendText, lang, mode = "quote", cartCount = 0 }: { p: any; onAddToCart: (product: any, quantity: number) => void; onSendText: (text: string) => void; lang: Language; mode?: "cart" | "quote"; cartCount?: number }) {
  const t = TRANSLATIONS[lang];
  const [showQtyPicker, setShowQtyPicker] = useState(false);
  const [selectedQty, setSelectedQty] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAddClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowQtyPicker(true);
    setSelectedQty(1);
  };

  const handleConfirmAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToCart(p, selectedQty);
    setShowQtyPicker(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const urgencyCopy = getUrgencyCopy(p.category, p.badge, lang);

  return (
    <div className="bg-[#fafaf8] border border-[#d4af37]/20 rounded-[18px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:border-slate-200/80 transition-all duration-300 w-full relative">
      <div className="flex flex-row">
        {/* Image — Left Column */}
        <div className="w-[40%] bg-white flex items-center justify-center p-1.5 border-r border-[#d4af37]/10 overflow-hidden">
          {p.image_url ? (
            <img src={p.image_url} alt={p.name} className="w-full h-[175px] object-contain scale-105 transition-transform duration-500 hover:scale-112" />
          ) : (
            <GlassWater className="w-8 h-8 text-[#d4af37]/40" />
          )}
        </div>

        {/* Content — Right Column */}
        <div className="w-[60%] p-3.5 flex flex-col min-w-0 bg-white">
          <div className="flex items-start justify-between gap-1 mb-1">
            <span className="text-[9px] uppercase tracking-widest font-bold text-[#D4AF37]">{p.category}</span>
          </div>

          <h4 className="text-[14px] font-bold text-[#1a1a1a] leading-tight mb-0.5 tracking-tight">{p.name}</h4>

          {p.description && (
            <p className="text-[11px] text-slate-500 line-clamp-1 leading-relaxed font-normal mb-1.5">{p.description}</p>
          )}

          <div className="text-[16px] font-black text-[#1a1a1a] tracking-tight mb-2">
            {p.price}
          </div>

          {p.badge && (
            <div className="mb-3">
              <span className={`inline-flex items-center gap-1.5 text-[8.5px] tracking-wider uppercase font-bold px-2.5 py-1 rounded-full border ${p.badge === "TERHAD"
                ? "bg-[#fafaf8] text-[#d4af37] border-[#d4af37]/20"
                : "bg-[#fafaf8] text-emerald-600 border-emerald-100"
                }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${p.badge === "TERHAD" ? "bg-[#d4af37]" : "bg-emerald-500"}`}></span>
                {p.badge}
              </span>
            </div>
          )}

          {/* Quantity Picker */}
          <AnimatePresence>
            {showQtyPicker && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden mb-2"
              >
                <div className="bg-white border border-slate-200 rounded-xl p-2.5 space-y-2.5">
                  <p className="text-[9px] font-semibold text-[#1a1a1a] uppercase tracking-widest text-center">
                    {lang === "zh" ? "选择数量" : lang === "en" ? "Select Quantity" : "Pilih Kuantiti"}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedQty(q => Math.max(1, q - 1)); }}
                      className="w-7 h-7 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-[#1a1a1a] flex items-center justify-center font-bold text-[14px] transition-all cursor-pointer">−</button>
                    <span className="text-[16px] font-bold text-[#1a1a1a] w-6 text-center">{selectedQty}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedQty(q => q + 1); }}
                      className="w-7 h-7 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-[#1a1a1a] flex items-center justify-center font-bold text-[14px] transition-all cursor-pointer">+</button>
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" onClick={(e) => { e.stopPropagation(); setShowQtyPicker(false); }}
                      className="flex-1 text-[10px] font-medium text-slate-500 bg-white border border-slate-200 py-2 rounded-lg cursor-pointer hover:bg-slate-50">
                      {lang === "zh" ? "取消" : lang === "en" ? "Cancel" : "Batal"}
                    </button>
                    <button type="button" onClick={handleConfirmAdd}
                      className="flex-1 text-[10px] font-semibold text-white bg-[#b8960c] hover:bg-[#d4af37] py-2 rounded-lg cursor-pointer shadow-sm active:scale-[0.98] transition-all">
                      {lang === "en" ? `Add ${selectedQty}` : `Tambah ${selectedQty}`}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!showQtyPicker && (
            <div className="flex flex-col gap-2 mt-auto">
              <button onClick={handleAddClick}
                className={`w-full flex items-center justify-center gap-2 text-[11px] font-bold py-2.5 rounded-lg transition-all cursor-pointer shadow-sm active:scale-[0.98] ${added ? "bg-emerald-500 text-white" : "bg-[#b8960c] hover:bg-[#d4af37] text-white shadow-[0_4px_12px_rgba(184,150,12,0.15)]"
                  }`}>
                <ShoppingCart className="w-3.5 h-3.5" />
                {added ? t.addedBtn : mode === "cart" ? t.addCartBtn : t.addBtn}
              </button>

              <button onClick={() => window.dispatchEvent(new CustomEvent('showProductDetails', { detail: p }))}
                className="w-full flex items-center justify-center gap-2 text-[11px] font-medium text-[#1a1a1a] bg-white border border-slate-200 hover:bg-[#fafaf8] py-2.5 rounded-lg cursor-pointer shadow-sm">
                <AlertCircle className="w-3.5 h-3.5" />
                View Details
              </button>
            </div>
          )}

          {/* Checkout text link - bottom right */}
          {!showQtyPicker && cartCount > 0 && (
            <div className="flex justify-end mt-3">
              <button
                onClick={() => onSendText("Checkout")}
                className="text-[11px] font-bold text-[#b8960c] hover:text-[#d4af37] flex items-center gap-1 transition-colors cursor-pointer"
              >
                Checkout <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tool Result Renderers ──────────────────────────────────────────────────

function ToolResultProductCards({ text, onAddToCart, onSendText, lang, mode = "quote", cartCount = 0 }: { text: string; onAddToCart: (product: any, quantity: number) => void; onSendText: (text: string) => void; lang: Language; mode?: "cart" | "quote"; cartCount?: number }) {
  const t = TRANSLATIONS[lang];
  let data: { summary: string; products: any[] } | null = null;
  try { data = JSON.parse(text.substring("TOOL_RESULT_PRODUCT_CARDS:".length)); } catch (e) { }

  if (!data) return (
    <div className="text-slate-600 text-[13px] p-3.5 bg-[#fafaf8] border border-slate-200 rounded-2xl rounded-tl-[5px] shadow-sm">
      {t.errProduct}
    </div>
  );

  return (
    <div className="space-y-3 w-full">
      <div className="text-[13px] font-medium text-[#1a1a1a] leading-relaxed">{data.summary}</div>
      {data.products?.length > 0 ? (
        <div className="space-y-3">
          {data.products.map((p, idx) => (
            <ProductCard key={`result-prod-${p.name}-${idx}`} p={p} onAddToCart={onAddToCart} onSendText={onSendText} lang={lang} mode={mode} cartCount={cartCount} />
          ))}
        </div>
      ) : (
        <div className="text-[12px] text-slate-500 bg-[#fafaf8] border border-slate-200 rounded-xl p-4 text-center">
          {t.noProduct}
        </div>
      )}
    </div>
  );
}

// ─── Empty state helper options ──────────────────────────────────────────────

const ROTATING_PROMPTS = [
  { text: "Need wholesale whisky?", query: "Tolong recommend whisky premium yang best bosku." },
  { text: "Build instant quote", query: "Saya nak request sebut harga (wholesale quote)." },
  { text: "Check payment options", query: "Boleh saya tahu pilihan pembayaran?" },
  { text: "Talk to sales", query: "Boleh saya bercakap terus dengan sales / WhatsApp?" }
];

function ToolResultCategories({ text, onSendText, lang }: { text: string; onSendText: (text: string) => void; lang: Language }) {
  let categories: { label: string, value: string }[] = [];
  try { categories = JSON.parse(text.substring("TOOL_RESULT_CATEGORIES:".length)); } catch (e) { }

  if (!categories || categories.length === 0) return null;

  return (
    <div className="space-y-3 w-full">
      <div className="text-[13px] font-medium text-[#1a1a1a] leading-relaxed">Here are our product categories:</div>
      <div className="grid grid-cols-2 gap-2">
        {categories.map((cat, idx) => (
          <button
            key={`cat-res-${cat.label}-${idx}`}
            onClick={() => onSendText(cat.label)}
            className="flex items-center justify-center p-3 rounded-xl bg-[#fafaf8] border border-slate-200 shadow-sm hover:border-[#d4af37] hover:bg-[#d4af37]/5 transition-all text-[12px] font-bold text-[#1a1a1a]"
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToolResultCheckoutCard({ text, cart, onProcessCheckout, lang }: { text: string; cart: CartItem[]; onProcessCheckout: (method: 'qr' | 'bank_transfer' | 'whatsapp', name: string, phone: string, email?: string) => void; lang: Language }) {
  let data: { customer_name?: string; customer_phone?: string; customer_email?: string } | null = null;
  try { data = JSON.parse(text.substring("TOOL_RESULT_CHECKOUT_CARD:".length)); } catch (e) { }

  const [emailInput, setEmailInput] = useState(data?.customer_email || "");

  if (!data || !data.customer_name || !data.customer_phone) {
    return (
      <div className="text-[13px] font-medium text-[#1a1a1a] leading-relaxed">
        Please provide your name and phone number to proceed with checkout.
      </div>
    );
  }

  const grandTotal = cart.reduce((acc, item) => acc + (item.priceNum * item.quantity), 0);

  return (
    <div className="bg-[#fafaf8] border border-[#d4af37]/20 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col p-5 w-full text-[#1a1a1a]">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
        <ShoppingCart className="w-4 h-4 text-[#1a1a1a]" />
        <span className="text-[11px] font-semibold text-[#1a1a1a] uppercase tracking-wider">Checkout</span>
      </div>

      <div className="py-3 text-[12px] text-slate-650 space-y-1 font-medium">
        <p><strong className="text-[#1a1a1a] font-semibold">Name:</strong> {data.customer_name}</p>
        <p><strong className="text-[#1a1a1a] font-semibold">Phone:</strong> {data.customer_phone}</p>
        <p><strong className="text-[#1a1a1a] font-semibold">Total:</strong> RM {grandTotal.toFixed(2)}</p>
      </div>
      
      <div className="pb-3">
        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
          Email Address <span className="text-[9px] text-slate-400 normal-case font-normal">(optional - for PDF Receipt)</span>
        </label>
        <input
          type="email"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder="e.g. customer@email.com"
          className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-[12px] text-[#1a1a1a] outline-none focus:border-[#d4af37] transition shadow-inner"
        />
      </div>

      <div className="pt-2 space-y-2 border-t border-slate-200">
        <button onClick={() => onProcessCheckout('qr', data?.customer_name || '', data?.customer_phone || '', emailInput)}
          className="w-full text-[12px] font-semibold text-white bg-[#b8960c] hover:bg-[#d4af37] py-3 rounded-full transition-all shadow-[0_4px_12px_rgba(184,150,12,0.15)] active:scale-[0.98] cursor-pointer">
          QR Payment
        </button>
        <button onClick={() => onProcessCheckout('bank_transfer', data?.customer_name || '', data?.customer_phone || '', emailInput)}
          className="w-full text-[12px] font-semibold text-[#1a1a1a] bg-white hover:bg-[#fafaf8] py-3 rounded-full transition-all shadow-sm border border-slate-200 cursor-pointer">
          Bank Transfer
        </button>
        <button onClick={() => onProcessCheckout('whatsapp', data?.customer_name || '', data?.customer_phone || '', emailInput)}
          className="w-full text-[12px] font-semibold text-emerald-600 bg-white border border-slate-200 hover:bg-emerald-50/20 py-3 rounded-full transition-all shadow-sm cursor-pointer">
          Talk to Human Agent
        </button>
      </div>
    </div>
  );
}

function ToolResultRenderer({ text, onAddToCart, lang }: { text: string; onAddToCart: (product: any) => void; lang: Language }) {
  const t = TRANSLATIONS[lang];
  let data: { summary: string; products: any[] } | null = null;
  try { data = JSON.parse(text.substring("TOOL_RESULT:".length)); } catch (e) { }

  if (!data) return null;

  return (
    <div className="space-y-3 w-full text-[#1a1a1a]">
      <div className="text-[13px] font-medium text-slate-650 leading-relaxed">{data.summary}</div>
      {data.products?.length > 0 && (
        <div className="space-y-3">
          {data.products.map((p, idx) => (
            <div key={`tool-res-item-${p.name}-${idx}`} className="bg-[#fafaf8] border border-slate-200 rounded-xl p-3">
              <p className="font-bold text-[12px] text-[#1a1a1a]">{p.name}</p>
              <p className="text-[11px] text-slate-500">{p.price}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Quote Card UI (Generative) ───────────────────────────────────────────────

function QuoteCardUI({ text, lang }: { text: string; lang: Language }) {
  const t = TRANSLATIONS[lang];
  let data: { items: any[]; total_amount: number } | null = null;
  try { data = JSON.parse(text.substring("TOOL_RESULT_QUOTE_CARD:".length)); } catch (e) { }

  if (!data) return null;

  const handleWaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "whatsapp_click", language: lang, cart: data?.items || [] })
    }).catch(() => { });

    let msg = `🛒 *New Lead - Golden AI*\n---------------------------\n`;
    data!.items.forEach((item) => {
      msg += `• ${item.quantity}x ${item.name} (RM ${item.price})\n`;
    });
    msg += `---------------------------\n💰 *TOTAL: RM ${data!.total_amount.toFixed(2)}*\n🌐 Language: ${lang.toUpperCase()}\n⏰ ${new Date().toLocaleString()}`;

    window.open(`https://wa.me/601164073143?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bg-[#fafaf8] border border-[#d4af37]/20 rounded-2xl overflow-hidden shadow-sm flex flex-col p-4 w-full text-[#1a1a1a]">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
        <span className="flex h-2 w-2 rounded-full bg-[#d4af37] animate-pulse" />
        <span className="text-[10px] font-extrabold text-[#1a1a1a] tracking-widest uppercase">Wholesale Quote</span>
      </div>
      <div className="space-y-2 py-3">
        {data.items.map((item, idx) => (
          <div key={`quote-ui-item-${item.name}-${idx}`} className="flex justify-between items-center text-[12.5px] text-slate-655">
            <span>{item.quantity}x {item.name}</span>
            <span className="font-bold text-[#1a1a1a]">RM {item.price.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t.grandTotal}</span>
        <span className="text-[16px] font-semibold text-[#1a1a1a]">RM {data.total_amount.toFixed(2)}</span>
      </div>
      <div className="pt-4">
        <button onClick={handleWaClick}
          className="block w-full text-[12px] font-semibold text-white bg-[#b8960c] hover:bg-[#d4af37] py-3 rounded-full text-center transition-all shadow-sm cursor-pointer active:scale-[0.98]">
          {t.whatsappBtn}
        </button>
      </div>
    </div>
  );
}

// ─── Suggestion Chips ─────────────────────────────────────────────────────────

function SuggestionChips({ text, onSelect, lang }: { text: string; onSelect: (option: string) => void; lang: Language }) {
  const match = text.match(/SHOW_SUGGESTIONS:(.*)/);
  if (!match) return null;

  const rawTags = match[1].split(",").map(s => s.trim());

  const iconMap: Record<string, string> = {
    whisky: "Premium Whisky",
    wine: "Fine Wine",
    beer: "Premium Beer",
    quote: "Build Quote",
    payment: "Payment Options",
    contact: "Talk to Sales",
    sales: "Talk to Sales"
  };

  const chipsToRender = rawTags.map(tag => {
    const formatted = iconMap[tag.toLowerCase()];
    if (formatted) {
      return { label: formatted, query: tag };
    }
    return { label: tag, query: tag };
  });

  return (
    <div className="flex flex-wrap gap-2 mt-2.5 w-full">
      {chipsToRender.map((chip, idx) => (
        <button
          key={`chip-${chip.query}-${idx}`}
          onClick={() => onSelect(chip.query)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-[12px] bg-[#fafaf9] border border-[#d4af37]/25 hover:bg-[#d4af37]/5 hover:border-[#d4af37]/50 transition-all text-[12px] font-semibold text-[#1a1a1a] shadow-[0_2px_6px_rgba(0,0,0,0.015)] active:scale-95 cursor-pointer"
        >
          <span>{chip.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Deterministic Flow Pickers ──────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Whisky: <GlassWater className="w-5 h-5 text-[#d4af37]" />,
  Wine: <Wine className="w-5 h-5 text-[#d4af37]" />,
  Beer: <Beer className="w-5 h-5 text-[#d4af37]" />,
  "Mixed Wholesale": <Package className="w-5 h-5 text-[#d4af37]" />,
};

function CategorySelector({ onSelect }: { onSelect: (category: string) => void }) {
  const categories = [
    { name: "Whisky", desc: "Premium single malts & luxury B2B brands" },
    { name: "Wine", desc: "Fine duty-free red, sparkling & white wines" },
    { name: "Beer", desc: "Imported premium lagers & craft beers" },
    { name: "Mixed Wholesale", desc: "Custom mixed wholesale allocations" }
  ];

  return (
    <div className="space-y-4 w-full p-5 bg-[#fafaf8] border border-[#d4af37]/20 rounded-3xl">
      <div className="text-[11px] font-semibold text-[#d4af37] uppercase tracking-widest text-center">Pilih Kategori / Select Category</div>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat, idx) => (
          <button
            key={`cat-sel-${cat.name}-${idx}`}
            onClick={() => onSelect(cat.name)}
            className="flex flex-col items-start p-4 rounded-[20px] border border-slate-200 bg-white hover:border-[#d4af37] hover:bg-[#d4af37]/5 transition-all text-left group active:scale-98 cursor-pointer"
          >
            <span className="mb-3 group-hover:scale-105 transition-transform">{CATEGORY_ICONS[cat.name]}</span>
            <span className="text-[13px] font-semibold text-[#1a1a1a]">{cat.name}</span>
            <span className="text-[10px] text-slate-500 mt-1 leading-tight font-medium">{cat.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const BIZTYPE_ICONS: Record<string, React.ReactNode> = {
  "Restaurant / Bar": <Wine className="w-5 h-5 text-[#d4af37]" />,
  "Event / Party": <Sparkles className="w-5 h-5 text-[#d4af37]" />,
  "Wholesale Reseller": <Package className="w-5 h-5 text-[#d4af37]" />,
  "Personal Purchase": <Gift className="w-5 h-5 text-[#d4af37]" />,
};

function BusinessTypeSelector({ onSelect, highlightFirst }: { onSelect: (type: string) => void; highlightFirst?: boolean }) {
  const types = [
    { name: "Restaurant / Bar", desc: "Horeca selection, premium wholesale margins" },
    { name: "Event / Party", desc: "Volume-friendly crowd favorites & quick delivery" },
    { name: "Wholesale Reseller", desc: "Best case rates, duty-free bulk logistics" },
    { name: "Personal Purchase", desc: "Premium single-bottle duty-free catalog" }
  ];

  return (
    <div className="space-y-4 w-full p-5 bg-[#fafaf8] border border-[#d4af37]/20 rounded-3xl">
      <div className="text-[11px] font-semibold text-[#d4af37] uppercase tracking-widest text-center">Tujuan Pesanan / Usage Intent</div>
      <div className="grid grid-cols-2 gap-3">
        {types.map((t, idx) => {
          const isHighlighted = idx === 0 && highlightFirst;
          return (
            <motion.button
              key={`type-sel-${t.name}-${idx}`}
              onClick={() => onSelect(t.name)}
              animate={isHighlighted ? {
                boxShadow: [
                  "0 0 0 rgba(212, 175, 55, 0)",
                  "0 0 15px rgba(212, 175, 55, 0.3)",
                  "0 0 0 rgba(212, 175, 55, 0)"
                ],
                borderColor: [
                  "rgba(0,0,0,0.06)",
                  "rgba(212, 175, 55, 0.5)",
                  "rgba(0,0,0,0.06)"
                ]
              } : undefined}
              transition={isHighlighted ? {
                repeat: Infinity,
                duration: 2.2,
                ease: "easeInOut"
              } : undefined}
              className={`flex flex-col items-start p-4 rounded-[20px] bg-white border border-slate-200 hover:border-[#d4af37] hover:bg-[#d4af37]/5 transition-all text-left group active:scale-98 cursor-pointer relative ${isHighlighted ? "overflow-visible" : "overflow-hidden"}`}
            >
              <span className="mb-2 group-hover:scale-105 transition-transform">{BIZTYPE_ICONS[t.name]}</span>
              <span className="text-[13px] font-semibold text-[#1a1a1a] leading-tight">{t.name}</span>
              <span className="text-[10px] text-slate-500 mt-1 leading-tight font-medium">{t.desc}</span>
              {isHighlighted && (
                <div className="absolute -bottom-14 right-2 z-50 pointer-events-none">
                  <OnboardingPointer />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Progress Tracker ─────────────────────────────────────────────────────────

function ProgressTracker({ step, flowType, cartCount = 0 }: { step: ChatStep; flowType: FlowType; cartCount?: number }) {
  // Don't show tracker for entry screens or FAQ
  if (!flowType || flowType === "ask_question" || step === "START" || step === "MAIN_MENU") {
    return null;
  }

  const stageConfig: Record<string, { stages: string[]; activeMap: Partial<Record<ChatStep, number>> }> = {
    browse_products: {
      stages: ["Browse", "Cart", "Checkout", "Payment"],
      activeMap: {
        BROWSE_CATEGORY: 0, BROWSE_PRODUCTS: 0,
        CART_REVIEW: 1,
        CHECKOUT_DETAILS: 2,
        PAYMENT_SELECTION: 3, PAYMENT_COMPLETE: 3,
      }
    },
    wholesale_quote: {
      stages: ["Category", "Intent", "Recommend", "Quote"],
      activeMap: {
        QUOTE_CATEGORY: 0,
        QUOTE_BUSINESS_TYPE: 1,
        QUOTE_RECOMMENDATION: 2,
        QUOTE_REVIEW: 3, QUOTE_HANDOFF: 3,
      }
    },
  };

  const config = stageConfig[flowType];
  const stages = config?.stages ?? ["Browse", "Cart", "Checkout", "Payment"];
  const activeIdx = (config?.activeMap as any)?.[step] ?? 0;

  return (
    <div className="bg-white/40 backdrop-blur-md px-6 py-2.5 border-b border-[#d4af37]/10 flex items-center justify-between select-none shrink-0">
      <div className="flex items-center justify-between w-full relative">
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-slate-200/60 -translate-y-1/2 z-0" />
        <div
          className="absolute top-1/2 left-0 h-[2px] bg-[#D4AF37] -translate-y-1/2 z-0 transition-all duration-500 ease-out"
          style={{ width: `${(activeIdx / Math.max(stages.length - 1, 1)) * 100}%` }}
        />
        {stages.map((stage, idx) => {
          const isCartStage = stage.toLowerCase() === "cart" || stage.toLowerCase() === "quote";
          return (
            <div key={`stage-${stage}-${idx}`} className="flex flex-col items-center relative z-10 bg-transparent px-2 first:pl-0 last:pr-0">
              {isCartStage ? (
                <div className="relative">
                  <motion.div
                    key={`cart-bounce-${cartCount}`}
                    animate={cartCount > 0 ? {
                      y: [0, -7, 2, 0],
                      scale: [1, 1.2, 0.95, 1],
                    } : {}}
                    transition={{
                      duration: 0.5,
                      ease: "easeInOut"
                    }}
                    className={`p-1 rounded-full border transition-all duration-350 flex items-center justify-center ${idx === activeIdx
                      ? "bg-[#D4AF37]/10 border-[#D4AF37] text-[#D4AF37] shadow-[0_0_6px_rgba(212,175,55,0.4)]"
                      : idx < activeIdx
                        ? "bg-[#D4AF37] border-[#D4AF37] text-white"
                        : "bg-white border-slate-200 text-slate-400"
                      }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                  </motion.div>

                  {/* Cart Item Badge inside Stepper (pop animation on add) */}
                  {cartCount > 0 && (
                    <motion.span
                      key={`stepper-badge-${cartCount}`}
                      initial={{ scale: 0.3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 15 }}
                      className="absolute -top-2 -right-2 bg-[#D4AF37] text-[#1a1a1a] text-[8px] font-black h-3.5 min-w-[14px] px-1 rounded-full flex items-center justify-center border border-white shadow-sm"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </div>
              ) : (
                <span className={`h-2.5 w-2.5 rounded-full border-2 transition-all duration-300 ${idx === activeIdx
                  ? "bg-[#D4AF37] border-[#D4AF37] scale-110 shadow-[0_0_6px_rgba(212,175,55,0.4)]"
                  : idx < activeIdx
                    ? "bg-[#D4AF37] border-[#D4AF37]"
                    : "bg-white border-slate-200"
                  }`} />
              )}
              <span className={`text-[9px] tracking-wide font-medium mt-1.5 transition-colors duration-300 ${idx === activeIdx ? "text-[#D4AF37] font-semibold" : idx < activeIdx ? "text-[#1a1a1a]" : "text-slate-400"
                }`}>
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Quote Review View ────────────────────────────────────────────────────────

function QuoteReviewView({ cart, onBack, onCheckout, onRemove, onUpdateQty, lang, proceedLabel }: { cart: CartItem[]; onBack: () => void; onCheckout: () => void; onRemove: (name: string) => void; onUpdateQty: (name: string, qty: number) => void; lang: Language; proceedLabel?: string }) {
  const t = TRANSLATIONS[lang];
  const grandTotal = cart.reduce((acc, item) => acc + (item.priceNum * item.quantity), 0);

  return (
    <div className="flex flex-col h-full bg-[#ffffff] text-[#1a1a1a] p-6 space-y-5">
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-[#1a1a1a] transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="text-[16px] font-semibold tracking-tight text-[#1a1a1a]">Your Wholesale Quote</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
        {cart.length > 0 ? (
          cart.map((item, idx) => (
            <div key={`cart-item-${item.name}-${idx}`} className="bg-[#fafaf8] border border-slate-200 rounded-[20px] p-4 flex gap-4 items-center shadow-[0_4px_20px_-2px_rgba(0,0,0,0.01)]">
              {item.image_url && (
                <div className="w-12 h-12 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-200">
                  <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#1a1a1a] truncate">{item.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{item.price}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onUpdateQty(item.name, Math.max(1, item.quantity - 1))} className="w-7 h-7 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-[#1a1a1a] flex items-center justify-center font-bold text-[14px]">-</button>
                <span className="text-[12px] font-semibold w-6 text-center text-[#1a1a1a]">{item.quantity}</span>
                <button onClick={() => onUpdateQty(item.name, item.quantity + 1)} className="w-7 h-7 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-[#1a1a1a] flex items-center justify-center font-bold text-[14px]">+</button>
              </div>
              <button onClick={() => onRemove(item.name)} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-full transition ml-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        ) : (
          <div className="h-40 flex items-center justify-center text-[12px] text-slate-555 font-medium">
            Your quote is empty. Let's find some premium options.
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="border-t border-slate-200 pt-4 space-y-4 shrink-0">
          <div className="flex justify-between items-center text-[12.5px] text-slate-555 font-medium">
            <span>Subtotal</span>
            <span className="font-semibold text-[#1a1a1a]">RM {grandTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Total</span>
            <span className="text-[20px] font-semibold text-[#1a1a1a]">RM {grandTotal.toFixed(2)}</span>
          </div>
          <button onClick={onCheckout}
            className="w-full text-[12px] font-semibold tracking-wider uppercase text-[#1a1a1a] bg-[#d4af37] hover:bg-[#b8960c] py-3.5 rounded-full transition-all shadow-[0_4px_12px_rgba(212,175,55,0.25)] active:scale-98 cursor-pointer">
            {proceedLabel ?? "Proceed to Checkout"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Checkout Details View ───────────────────────────────────────────────────

function CheckoutDetailsView({ onBack, onSubmit, lang }: { onBack: () => void; onSubmit: (name: string, phone: string, email: string) => void; lang: Language }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [phoneError, setPhoneError] = useState("");

  const validatePhone = (value: string) => {
    // Strip everything except digits and plus sign
    const cleaned = value.replace(/[^0-9+]/g, "");
    if (!cleaned) {
      return lang === "zh" ? "请输入手机号码" : lang === "en" ? "Phone number is required" : "Nombor telefon diperlukan";
    }
    
    // Malaysian mobile numbers check:
    // Raw regex: starts with +601, 601, or 01, followed by 7-9 digits
    const regex = /^(\+?6?01)[0-9]{7,9}$/;
    if (!regex.test(cleaned)) {
      return lang === "zh" 
        ? "格式错误。例如: +60123456789" 
        : lang === "en" 
          ? "Invalid format. E.g., +60123456789 or 0123456789" 
          : "Format nombor salah. Contoh: +60123456789 atau 0123456789";
    }
    return "";
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    const error = validatePhone(val);
    setPhoneError(error);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validatePhone(phone);
    if (error) {
      setPhoneError(error);
      return;
    }

    if (name.trim() && phone.trim()) {
      // Normalize number format to 601XXXXXXXX
      let cleaned = phone.replace(/[^0-9]/g, "");
      if (cleaned.startsWith("0")) {
        cleaned = "6" + cleaned; // 012... -> 6012...
      }
      onSubmit(name, cleaned, email.trim());
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#ffffff] text-[#1a1a1a] p-6 space-y-5">
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-[#1a1a1a] transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="text-[16px] font-semibold tracking-tight text-[#1a1a1a]">Wholesale Registration</h3>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between min-h-0">
        <div className="space-y-4 overflow-y-auto pr-1">
          <p className="text-[12px] text-slate-555 leading-relaxed font-normal">
            Please enter your B2B wholesale details to generate the official purchase quote and payment reference.
          </p>
          <div className="space-y-2">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Eddy Rahman"
              className="w-full bg-[#fafaf8] border border-slate-200 rounded-xl p-3.5 text-[13px] text-[#1a1a1a] outline-none focus:bg-white focus:border-[#d4af37] transition shadow-inner"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">Phone Number / WhatsApp</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="e.g. +60123456789"
              className={`w-full bg-[#fafaf8] border ${phoneError ? 'border-rose-400 focus:border-rose-500' : 'border-slate-200 focus:border-[#d4af37]'} rounded-xl p-3.5 text-[13px] text-[#1a1a1a] outline-none focus:bg-white transition shadow-inner`}
            />
            {phoneError && (
              <span className="text-[11px] text-rose-500 font-medium block mt-1 px-1">
                {phoneError}
              </span>
            )}
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Email Address <span className="text-[9px] text-slate-400 normal-case font-normal">(untuk terima PDF Invois — optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. customer@email.com"
              className="w-full bg-[#fafaf8] border border-slate-200 rounded-xl p-3.5 text-[13px] text-[#1a1a1a] outline-none focus:bg-white focus:border-[#d4af37] transition shadow-inner"
            />
          </div>
        </div>

        <button type="submit"
          disabled={!name.trim() || !phone.trim() || !!phoneError}
          className="w-full text-[12px] font-semibold tracking-wider uppercase text-[#1a1a1a] bg-[#d4af37] hover:bg-[#b8960c] py-3.5 rounded-full transition-all shadow-[0_4px_12px_rgba(212,175,55,0.25)] disabled:opacity-50 disabled:cursor-not-allowed mt-4 shrink-0 cursor-pointer">
          Continue to Payment
        </button>
      </form>
    </div>
  );
}

// ─── Payment Selection View ──────────────────────────────────────────────────

function PaymentSelectionView({ cart, name, phone, email, onBack, onProcessCheckout, lang }: { cart: CartItem[]; name: string; phone: string; email?: string; onBack: () => void; onProcessCheckout: (method: 'qr' | 'bank_transfer' | 'whatsapp', name: string, phone: string, email?: string) => void; lang: Language }) {
  const grandTotal = cart.reduce((acc, item) => acc + (item.priceNum * item.quantity), 0);

  return (
    <div className="flex flex-col h-full bg-[#ffffff] text-[#1a1a1a] p-5 space-y-6">
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-[#1a1a1a] transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="text-[16px] font-black tracking-tight text-[#1a1a1a]">Select Payment Mode</h3>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
        <p className="text-[12px] text-slate-555 leading-relaxed font-medium">
          Choose your preferred method to complete payment of **RM {grandTotal.toFixed(2)}**.
        </p>

        <div className="space-y-3 pt-2">
          <button
            onClick={() => onProcessCheckout('qr', name, phone, email)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#fafaf8] border border-slate-200 hover:border-[#d4af37] hover:bg-[#d4af37]/5 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#d4af37]/15 flex items-center justify-center">
                <Zap className="w-4 h-4 text-[#d4af37]" />
              </div>
              <div>
                <span className="text-[13px] font-bold text-[#1a1a1a] block">DuitNow QR</span>
                <span className="text-[10px] text-slate-500">Instant validation, automatic credit</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>

          <button
            onClick={() => onProcessCheckout('bank_transfer', name, phone, email)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#fafaf8] border border-slate-200 hover:border-[#d4af37] hover:bg-[#d4af37]/5 transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#d4af37]/15 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-[#d4af37]" />
              </div>
              <div>
                <span className="text-[13px] font-bold text-[#1a1a1a] block">Bank Transfer</span>
                <span className="text-[10px] text-slate-500">Manual upload, bank transaction slip</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </button>

          <button
            onClick={() => onProcessCheckout('whatsapp', name, phone, email)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#d4af37] hover:bg-[#b8960c] transition-all text-left cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-black/10 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-[#1a1a1a]" />
              </div>
              <div>
                <span className="text-[13px] font-bold text-[#1a1a1a] block">Talk to Human Sales</span>
                <span className="text-[10px] text-[#1a1a1a]/60">Support chat, manual order checkout</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#1a1a1a]/60" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Premium AI Sales Concierge (Golden AI) ───────────────────────────────────

const CONCIERGE_CARDS = [
  {
    title: "Delivery Question",
    subtitle: "Check delivery timing & area",
    icon: "truck",
    step: "DELIVERY_ASK",
    botReply: "Sure 🚚 Where should we deliver?",
    chips: ["Kota Kinabalu", "Tawau", "Sandakan", "Lahad Datu", "Other Area"]
  },
  {
    title: "Help Me Choose",
    subtitle: "AI product guidance",
    icon: "sparkles",
    step: "CHOOSE_ASK",
    botReply: "Happy to help 🥃 What are you buying for?",
    chips: ["Restaurant / Bar", "Event / Party", "Retail Resale", "Personal Use"]
  },
  {
    title: "Wholesale Pricing",
    subtitle: "Get quote guidance",
    icon: "wallet",
    step: "WHOLESALE_ASK",
    botReply: "Sure 💰 What best describes your purchase?",
    chips: ["Restaurant / Bar", "Retail Shop", "Event Bulk Order", "Distributor"]
  },
  {
    title: "Minimum Order",
    subtitle: "MOQ information",
    icon: "package",
    step: "MOQ_ASK",
    botReply: "Minimum order usually starts from 1 carton depending on category.\n\nWhat are you planning to buy?",
    chips: ["Whisky", "Beer", "Wine", "Mixed Order"]
  },
  {
    title: "Ask Something Else",
    subtitle: "Custom question",
    icon: "message-circle",
    step: "FREE_CHAT",
    botReply: "Sure 💬 What is on your mind? Ask me anything about our premium labels, wholesale pricing, delivery, or custom orders.",
    chips: ["Check Delivery Area", "Talk to Sales", "Browse Products"]
  }
];

const CONCIERGE_ICONS: Record<string, React.ReactNode> = {
  truck: <Truck className="w-5 h-5 text-[#1a1a1a]" />,
  sparkles: <Sparkles className="w-5 h-5 text-[#1a1a1a]" />,
  wallet: <Wallet className="w-5 h-5 text-[#1a1a1a]" />,
  package: <Package className="w-5 h-5 text-[#1a1a1a]" />,
  "message-circle": <MessageCircle className="w-5 h-5 text-[#1a1a1a]" />
};

function ConciergeEntryView({ onSelect }: { onSelect: (card: typeof CONCIERGE_CARDS[0]) => void }) {
  return (
    <div className="h-full overflow-y-auto px-5 py-6 space-y-6">
      {/* Bot Greeting */}
      <div className="flex items-start gap-2.5">
        <AvatarBot />
        <div className="bg-[#fafaf9] border border-slate-200/80 rounded-3xl rounded-tl-[6px] px-4 py-3.5 max-w-[85%] shadow-sm">
          <p className="text-[13.5px] text-[#1a1a1a] leading-relaxed font-semibold">
            👋 Hi! Need quick answers before placing your order?
            <span className="text-slate-500 text-[12px] font-normal mt-1.5 block leading-normal">
              I can help you choose products, check delivery, pricing, and wholesale options.
            </span>
          </p>
        </div>
      </div>

      {/* List of Premium Cards */}
      <div className="space-y-3 pb-4">
        {CONCIERGE_CARDS.map((card, idx) => (
          <motion.button
            key={`concierge-card-${idx}`}
            onClick={() => onSelect(card)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-[#fafaf8] border border-slate-200 hover:border-black/20 hover:bg-slate-100 transition-all text-left cursor-pointer group shadow-[0_2px_8px_rgba(0,0,0,0.005)]"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-slate-200 transition-colors">
              {CONCIERGE_ICONS[card.icon]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13.5px] font-bold text-[#1a1a1a] leading-tight">{card.title}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight font-medium">{card.subtitle}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-black transition-colors" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function appendSuggestionsIfMissing(reply: string, lang: Language): string {
  if (reply.startsWith("TOOL_RESULT")) return reply;
  if (reply.includes("SHOW_SUGGESTIONS:")) return reply;

  const q = reply.toLowerCase();
  let suggestions: string[] = [];

  if (q.includes("whisky") || q.includes("whiskey") || q.includes("macallan") || q.includes("johnnie")) {
    suggestions = ["Black Label", "Red Label", "Browse Whisky", "Talk to Sales"];
  } else if (q.includes("delivery") || q.includes("hantar") || q.includes("tonight") || q.includes("hari") || q.includes("area") || q.includes("kawasan")) {
    suggestions = ["Check Delivery Area", "Talk to Sales", "Browse Products"];
  } else if (q.includes("price") || q.includes("harga") || q.includes("wholesale") || q.includes("borong") || q.includes("quote")) {
    suggestions = ["Get Wholesale Quote", "Browse Products", "Talk to Sales"];
  } else if (q.includes("moq") || q.includes("minimum") || q.includes("carton")) {
    suggestions = ["Minimum Order", "Browse Products", "Talk to Sales"];
  } else {
    suggestions = ["Browse Products", "Get Wholesale Quote", "Talk to Sales"];
  }

  return `${reply}\nSHOW_SUGGESTIONS:${suggestions.join(",")}`;
}

function TypingText({ text, speed = 25 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let startLength = 0;
    
    if (text.startsWith("What") || text.startsWith("Apa")) {
      const spaceIdx = text.indexOf(" ");
      startLength = spaceIdx > 0 ? spaceIdx : 0;
    } else {
      startLength = Math.min(text.length, 2);
    }
    
    const firstPart = text.substring(0, startLength);
    const restPart = text.substring(startLength);
    
    setDisplayedText(firstPart);
    
    let current = firstPart;
    let i = 0;
    
    if (!restPart) {
      setDisplayedText(text);
      return;
    }

    const timer = setInterval(() => {
      if (i < restPart.length) {
        current += restPart.charAt(i);
        setDisplayedText(current);
        i++;
      } else {
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <span>
      {displayedText}
      <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-fuchsia-500/80 animate-[pulse_0.8s_infinite] align-middle" />
    </span>
  );
}

function GreetingMenuView({ lang, onSelect, onTalkToSales }: { lang: Language; onSelect: (flow: Exclude<FlowType, null>) => void; onTalkToSales: () => void }) {
  const getGreetingData = () => {
    const hr = new Date().getHours();
    
    // Time zones and hours definition:
    // Morning: 5:00 - 11:59 (5 <= hr < 12)
    // Afternoon: 12:00 - 16:59 (12 <= hr < 17)
    // Evening: 17:00 - 20:59 (17 <= hr < 21)
    // Night / Late Night: 21:00 - 4:59 (hr >= 21 || hr < 5)

    if (lang === "zh") {
      let greeting = "早上好。";
      if (hr >= 12 && hr < 17) greeting = "下午好。";
      else if (hr >= 17 && hr < 21) greeting = "傍晚好。";
      else if (hr >= 21 || hr < 5) {
        greeting = hr >= 0 && hr < 5 ? "深夜好。" : "晚上好。";
      }
      return { 
        greeting, 
        sub: hr >= 0 && hr < 5 
          ? "深夜了，还在忙着采购吗？💼" 
          : "今天 Golden AI 能为您提供什么帮助呢？" 
      };
    }
    
    if (lang === "ms") {
      let greeting = "Selamat pagi.";
      if (hr >= 12 && hr < 14) greeting = "Selamat tengah hari.";
      else if (hr >= 14 && hr < 19) greeting = "Selamat petang.";
      else if (hr >= 19 || hr < 5) greeting = "Selamat malam.";
      
      return { 
        greeting, 
        sub: hr >= 0 && hr < 5 
          ? "Lama tak jumpa boss, masih kerja kuat malam-malam? 🔥" 
          : "Bagaimanakah Golden AI dapat membantu boss hari ini?" 
      };
    }
    
    // Default English
    let greeting = "Good morning.";
    if (hr >= 12 && hr < 17) greeting = "Good afternoon.";
    else if (hr >= 17 && hr < 21) greeting = "Good evening.";
    else if (hr >= 21 || hr < 5) greeting = "Good night.";
    
    return { 
      greeting, 
      sub: hr >= 0 && hr < 5 
        ? "Burning the midnight oil? How can Golden AI help you tonight? 🦉" 
        : "How can Golden AI assist you today?" 
    };
  };

  const { greeting, sub } = getGreetingData();

  return (
    <div className="h-full flex flex-col justify-between overflow-y-auto px-5 py-6 space-y-6">
      
      {/* Spatial UI Header */}
      <header className="pt-2 px-1 flex flex-col gap-3 relative select-none shrink-0">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-light tracking-tighter text-gray-900 mt-2 flex items-center gap-1.5">
              {greeting} <span className="text-[#d4af37] font-normal animate-[pulse_3s_infinite]">✨</span>
            </h1>
          </div>
        </div>

        <p className="text-[15.5px] text-slate-500 font-light leading-relaxed min-h-[44px]">
          <TypingText text={sub} speed={25} />
        </p>
      </header>

      {/* Main Interface Grid */}
      <div className="flex-1 flex flex-col justify-center gap-3.5 pb-4 select-none">
        
        {/* Action 1: Neural Chat (Primary) */}
        <button
          onClick={() => onSelect("ask_question")}
          className="group relative w-full p-px rounded-[28px] overflow-hidden transition-all active:scale-[0.98] shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_40px_rgba(0,0,0,0.06)] cursor-pointer"
        >
          {/* Animated Glowing Border */}
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-400/50 via-yellow-400/50 to-violet-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          {/* Inner Glass Card */}
          <div className="relative bg-white/70 backdrop-blur-2xl rounded-[28px] p-5.5 flex items-center gap-4.5 border border-white group-hover:bg-white/90 transition-colors">
            
            {/* Dynamic Glowing Orb Animation */}
            <div className="shrink-0 flex items-center justify-center w-12 h-12 bg-transparent rounded-full overflow-hidden">
               <GlowingOrb size={46} />
            </div>

            <div className="flex-1 text-left min-w-0">
              <h3 className="text-[15.5px] font-bold text-gray-900 mb-0.5 group-hover:text-fuchsia-600 transition-colors flex items-center gap-1">
                {lang === "zh" ? "咨询 Golden AI" : lang === "ms" ? "Tanya Golden AI" : "Ask Golden AI"}
                <span className="text-[#d4af37]">✨</span>
              </h3>
              <p className="text-[11.5px] text-slate-400 font-medium">
                {lang === "zh" ? "即时获取批发报价" : lang === "ms" ? "Sebutharga borong segera" : "Instant wholesale quotes"}
              </p>
            </div>

            <div className="w-7 h-7 rounded-full bg-[#fafaf9] flex items-center justify-center group-hover:scale-105 transition-transform border border-slate-100/80 shadow-sm shrink-0">
              <ChevronRight size={14} className="text-[#d4af37]" />
            </div>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-3.5">
          {/* Action 2: Browse Product */}
          <button
            onClick={() => onSelect("browse_products")}
            className="group relative w-full p-px rounded-[24px] overflow-hidden transition-all active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.05)] cursor-pointer text-left"
          >
            <div className="relative h-full bg-white/60 backdrop-blur-xl rounded-[24px] p-4.5 flex flex-col gap-4 border border-white group-hover:bg-white/80 transition-colors">
              <LayoutGrid size={18} className="text-[#d4af37]" strokeWidth={1.5} />
              <div>
                <h4 className="text-[13.5px] font-bold text-gray-800">Browse Product</h4>
                <p className="text-[10.5px] text-slate-400 mt-0.5 font-semibold">
                  {lang === "zh" ? "浏览产品目录" : lang === "ms" ? "Teroka katalog" : "Explore catalog"}
                </p>
              </div>
            </div>
          </button>

          {/* Action 3: Human Concierge */}
          <button
            onClick={onTalkToSales}
            className="group relative w-full p-px rounded-[24px] overflow-hidden transition-all active:scale-[0.98] shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_25px_rgba(0,0,0,0.05)] cursor-pointer text-left"
          >
            <div className="relative h-full bg-white/60 backdrop-blur-xl rounded-[24px] p-4.5 flex flex-col gap-4 border border-white group-hover:bg-white/80 transition-colors">
              <Mic size={18} className="text-[#d4af37]" strokeWidth={1.5} />
              <div>
                <h4 className="text-[13.5px] font-bold text-gray-800">Talk to Sales</h4>
                <p className="text-[10.5px] text-slate-400 mt-0.5 font-semibold">
                  {lang === "zh" ? "联系销售团队" : lang === "ms" ? "Hubungi jualan" : "Human link"}
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Secure Trust Footer */}
      <footer className="pt-2 pb-0.5 flex items-center justify-center gap-1.5 text-[8.5px] font-bold tracking-[0.25em] text-slate-400 uppercase select-none shrink-0 border-t border-slate-100/10">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-slate-400/80 mr-0.5">
          <path fillRule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clipRule="evenodd" />
        </svg>
        <span>Secure • Private • Trusted</span>
      </footer>
    </div>
  );
}

// ─── BrowseProductsView — Deterministic Product Grid (no LLM) ─────────────────

function BrowseProductsView({ category, storeId, onAddToCart, onSendText, lang, cartCount = 0 }: { category: string; storeId: string; onAddToCart: (product: any, quantity: number) => void; onSendText: (text: string) => void; lang: Language; cartCount?: number }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const all = await getProducts(storeId || "00000000-0000-0000-0000-000000000000");
        const filtered = (all as any[]).filter((p: any) => {
          if (!category || category.toLowerCase() === "mixed wholesale") return true;
          return p.category?.toLowerCase().includes(category.toLowerCase());
        });
        const result = filtered.length > 0 ? filtered : (all as any[]).slice(0, 6);
        setProducts(result.map((p: any) => ({
          ...p,
          price: `RM ${Number(p.price).toFixed(2)}`,
          badge: (p.stock_quantity || 0) < 10 ? "TERHAD" : "TERSEDIA",
        })));
      } catch {
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    }
    load();
  }, [category, storeId]);

  if (loadingProducts) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
          <p className="text-[12px] text-slate-400 font-medium">
            {lang === "zh" ? "加载产品中..." : lang === "en" ? "Loading products..." : "Memuatkan produk..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-5 space-y-3">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-0.5">
        {category} · {products.length} {lang === "zh" ? "款产品" : lang === "en" ? "products" : "produk"}
      </p>
      {products.length > 0 ? (
        <div className="space-y-3 pb-4">
          {products.map((p, idx) => (
            <ProductCard
              key={`browse-${p.name}-${idx}`}
              p={p}
              onAddToCart={onAddToCart}
              onSendText={onSendText}
              lang={lang}
              mode="cart"
              cartCount={cartCount}
            />
          ))}
        </div>
      ) : (
        <div className="h-40 flex items-center justify-center text-[12px] text-slate-400">
          {lang === "zh" ? "未找到产品" : lang === "en" ? "No products found" : "Tiada produk dijumpai"}
        </div>
      )}
    </div>
  );
}



// ─── QuoteHandoffView — WA Handoff Confirmation ───────────────────────────────

function QuoteHandoffView({ lang, onBack }: { lang: Language; onBack: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 space-y-6 text-center">
      <div className="w-20 h-20 rounded-full bg-[#d4af37]/15 border border-[#d4af37]/30 flex items-center justify-center">
        <CheckCircle2 className="w-9 h-9 text-[#d4af37]" />
      </div>
      <div className="space-y-2">
        <h3 className="text-[17px] font-semibold text-[#1a1a1a]">
          {lang === "zh" ? "报价已发送！" : lang === "en" ? "Quote Sent!" : "Sebut Harga Dihantar!"}
        </h3>
        <p className="text-[12.5px] text-slate-500 leading-relaxed max-w-[250px]">
          {lang === "zh"
            ? "我们的销售团队将在30分钟内通过WhatsApp联系您。"
            : lang === "en"
              ? "Our sales team will contact you within 30 minutes via WhatsApp."
              : "Team sales kami akan menghubungi boss dalam 30 minit melalui WhatsApp."}
        </p>
      </div>
      <div className="flex flex-col gap-2 w-full max-w-[260px]">
        <button
          onClick={onBack}
          className="w-full text-[12px] font-semibold text-[#1a1a1a] bg-[#d4af37] hover:bg-[#b8960c] py-3.5 rounded-full transition-all cursor-pointer"
        >
          {lang === "zh" ? "返回主菜单" : lang === "en" ? "Back to Main Menu" : "Kembali ke Menu Utama"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

export default function ChatWidget() {
  const router = useRouter();
  const { storeId } = usePublicStore();
  const [previewProduct, setPreviewProduct] = useState<any | null>(null);

  useEffect(() => {
    const handler = (e: any) => setPreviewProduct(e.detail);
    window.addEventListener('showProductDetails', handler);
    return () => window.removeEventListener('showProductDetails', handler);
  }, []);
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setShowTooltip(false);
    }
  }, [isOpen]);

  const [onboardingSeen, setOnboardingSeen] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [leadContext, setLeadContext] = useState({ budget: "", preference: "", quantity: "" });
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>("ms");
  const [isMobile, setIsMobile] = useState(false);
  const [currentStep, setCurrentStep] = useState<ChatStep>("FAQ_CHAT");
  const [flowType, setFlowType] = useState<FlowType>("ask_question");
  const [browseCategory, setBrowseCategory] = useState<string>("");
  const [quoteItems, setQuoteItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [conciergeStep, setConciergeStep] = useState<string>("ENTRY");

  // ── Customer Context — tracks everything we learn, injected into LLM
  const [customerContext, setCustomerContext] = useState<CustomerContext>(createEmptyContext());

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
      const savedStep = localStorage.getItem("golden_ai_step") as ChatStep;
      const savedName = localStorage.getItem("golden_ai_name");
      const savedPhone = localStorage.getItem("golden_ai_phone");
      const seenOnboarding = localStorage.getItem("golden_onboarding_seen");

      if (savedMessages) setMessages(JSON.parse(savedMessages));
      if (savedCart) setCart(JSON.parse(savedCart));
      if (savedLang && ["ms", "en", "zh"].includes(savedLang)) setLang(savedLang);
      if (savedStep) {
        if (savedStep === "START") {
          setCurrentStep("FAQ_CHAT");
          setFlowType("ask_question");
        } else {
          setCurrentStep(savedStep);
        }
      }
      if (savedName) setCustomerName(savedName);
      if (savedPhone) setCustomerPhone(savedPhone);
      setOnboardingSeen(seenOnboarding === "true");
    } catch (e) { }
  }, []);

  useEffect(() => {
    try { localStorage.setItem("golden_ai_messages", JSON.stringify(messages)); } catch (e) { }
  }, [messages]);

  useEffect(() => {
    try { localStorage.setItem("golden_ai_cart", JSON.stringify(cart)); } catch (e) { }
  }, [cart]);

  useEffect(() => {
    try { localStorage.setItem("golden_ai_language", lang); } catch (e) { }
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem("golden_ai_name", customerName);
      localStorage.setItem("golden_ai_phone", customerPhone);
    } catch (e) { }
  }, [customerName, customerPhone]);

  useEffect(() => {
    try { localStorage.setItem("golden_ai_step", currentStep); } catch (e) { }
  }, [currentStep]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, currentStep]);

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("golden-chat-toggle", { detail: { isOpen } }));
  }, [isOpen]);

  // ── handleProcessCheckout ───────────────────────────────────────────────────

  const handleProcessCheckout = async (method: 'qr' | 'bank_transfer' | 'whatsapp', customerName: string, customerPhone: string, customerEmail?: string) => {
    if (method === 'whatsapp') {
      let waMsg = `Hi, saya mahu proceed pesanan borong untuk:\n\n`;
      cart.forEach((item) => {
        waMsg += `• ${item.quantity}x ${item.name} (RM ${(item.priceNum || parseFloat(item.price.replace(/[^0-9.]/g, ""))).toFixed(2)})\n`;
      });
      const grandTotal = cart.reduce((acc, item) => acc + (item.priceNum * item.quantity), 0);
      waMsg += `\n*Jumlah Keseluruhan: RM ${grandTotal.toFixed(2)}*\n\nSila sediakan bil & pautan QR untuk pembayaran. Terima kasih!`;
      window.open(`https://wa.me/601164073143?text=${encodeURIComponent(waMsg)}`, "_blank", "noopener,noreferrer");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const orderId = `ORD-${Date.now()}`;
      const subtotal = cart.reduce((acc, item) => acc + (item.priceNum * item.quantity), 0);
      const deliveryFee = 0;
      const total = subtotal + deliveryFee;

      // 1. Fetch store products to match name with ID
      const targetStoreId = storeId || '00000000-0000-0000-0000-000000000000';
      const storeProducts = await getProducts(targetStoreId);

      // 2. Map cart items to the strict OrderItem structure
      const orderItems: OrderItem[] = cart.map(item => {
        const dbProduct = storeProducts.find(p => p.name.toLowerCase() === item.name.toLowerCase());
        return {
          product: {
            id: dbProduct?.id || `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: item.name,
            price: item.priceNum,
            images: item.image_url ? [item.image_url] : []
          },
          qty: item.quantity
        };
      });

      const newOrder: Order = {
        id: orderId,
        store_id: targetStoreId,
        customer_name: customerName,
        customer_phone: customerPhone,
        items: orderItems,
        subtotal,
        delivery_fee: deliveryFee,
        total: total,
        status: 'pending',
        created_at: new Date().toISOString(),
        payment_method: method,
        payment_status: 'unpaid'
      };

      const result = await createOrderWithStockCheck(newOrder, targetStoreId);

      if ('error' in result) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Trigger order created alert in background
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "order_created",
          language: lang,
          cart,
          orderId,
          name: customerName,
          phone: customerPhone,
          email: customerEmail
        })
      }).catch((e) => console.error("Failed to send order notification:", e));

      // Clear standard cart and local storage chatbot cart
      clearCart();
      setCart([]);
      try {
        localStorage.removeItem("golden_ai_cart");
      } catch (e) { }

      // Add a rich success message with upsell
      const tLocal = TRANSLATIONS[lang];
      const successText = tLocal.paymentSuccess(orderId);
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: `${successText}\nSHOW_SUGGESTIONS:${lang === "zh" ? "继续添加商品,联系销售" : lang === "en" ? "Add More Items,Talk to Sales" : "Tambah Item Lagi,Hubungi Sales"}`
        }
      ]);
      setCurrentStep("PAYMENT_COMPLETE");

      // Redirect to payment transfer page
      setTimeout(() => {
        router.push(`/payment/transfer/${orderId}`);
      }, 2500);

    } catch (err: any) {
      console.error("handleProcessCheckout error:", err);
      setError(err.message || "Failed to process checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── autoViewCart ─────────────────────────────────────────────────────────────

  const autoViewCart = async (latestCart?: CartItem[]) => {
    setLoading(true);
    setError(null);
    try {
      const savedCart = latestCart || JSON.parse(localStorage.getItem("golden_ai_cart") || "[]");
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
          } catch (e) { }
        }
      }
    } catch (err) {
      console.error("autoViewCart error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── handleAddToCart ───────────────────────────────────────────────────────────

  const handleAddToCart = (product: any, quantity: number = 1) => {
    const qty = Math.max(1, quantity);
    let newCart: CartItem[] = [];
    setCart((prev) => {
      const updated = [...prev];
      const existingIdx = updated.findIndex((c) => c.name.toLowerCase() === product.name.toLowerCase());
      const priceNum = parseFloat((product.price || "RM 0").replace(/[^0-9.]/g, "")) || 0;
      if (existingIdx > -1) {
        updated[existingIdx].quantity += qty;
        updated[existingIdx].total = `RM ${(updated[existingIdx].quantity * updated[existingIdx].priceNum).toFixed(2)}`;
      } else {
        updated.push({
          name: product.name,
          category: product.category || "Beverage",
          price: product.price,
          priceNum,
          quantity: qty,
          total: `RM ${(qty * priceNum).toFixed(2)}`,
          image_url: product.image_url,
          whatsapp_message: `Saya berminat dengan ${product.name} (${qty} unit, jumlah RM ${(qty * priceNum).toFixed(2)}). Boleh proceed pesanan?`
        });
      }
      newCart = updated;
      return updated;
    });

    // Immediately write to local storage to avoid race conditions
    try { localStorage.setItem("golden_ai_cart", JSON.stringify(newCart)); } catch (e) { }

    // Only call autoViewCart if we are inside a chat view where messages are visible
    if (currentStep === "START" || currentStep === "QUOTE_RECOMMENDATION") {
      setTimeout(() => { autoViewCart(newCart); }, 100);
    }

    // Update context — customer has added to cart
    setCustomerContext(prev => ({
      ...prev,
      hasAddedToCart: true,
      mentionedProducts: prev.mentionedProducts.includes(product.name)
        ? prev.mentionedProducts
        : [...prev.mentionedProducts, product.name],
    }));
  };

  // ── handleInvoiceUpload — Vision API ─────────────────────────────────────────



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
      // Extract context signals from user message (zero API cost)
      const ctxUpdates = extractContextFromMessage(trimmedMessage, customerContext);
      const updatedCtx = { ...customerContext, ...ctxUpdates };
      setCustomerContext(updatedCtx);

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages,
          cart,
          language: lang,
          leadContext,
          customerContext: updatedCtx,
          flowType,
        }),
      });
      const data: ChatResponse = await response.json();
      if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
      if (data.reply) {
        const processedReply = appendSuggestionsIfMissing(data.reply, lang);
        setMessages((prev) => [...prev, { role: "model", text: processedReply }]);
        if (data.reply.startsWith("TOOL_RESULT:")) {
          try {
            const parsed = JSON.parse(data.reply.substring(12));
            if (parsed && (parsed.action === "cart_updated" || parsed.action === "cart_viewed") && Array.isArray(parsed.products)) {
              setCart(parsed.products);
            }
            if (parsed && parsed.action === "context_updated" && parsed.data) {
              setLeadContext((prev) => ({
                budget: parsed.data.budget || prev.budget,
                preference: parsed.data.preference || prev.preference,
                quantity: parsed.data.quantity || prev.quantity
              }));
            }
          } catch (e) { }
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

  const handleLanguageSelect = (selectedLang: Language) => {
    setLang(selectedLang);
    setMessages([]);
    setCart([]);
    try {
      localStorage.removeItem("golden_ai_messages");
      localStorage.removeItem("golden_ai_cart");
      localStorage.setItem("golden_ai_language", selectedLang);
    } catch (e) { }
    setCurrentStep("MAIN_MENU");
    setFlowType(null);
  };

  // ── handleFlowSelect — User picks an intent from the main menu ───────────────

  const handleFlowSelect = async (flow: Exclude<FlowType, null>) => {
    setFlowType(flow);
    setMessages([]);
    setError(null);
    switch (flow) {
      case "browse_products":
        setCurrentStep("BROWSE_CATEGORY");
        break;
      case "wholesale_quote":
        setCurrentStep("QUOTE_CATEGORY");
        break;
      case "delivery_coverage":
        setCurrentStep("DELIVERY_AREA");
        setMessages([{
          role: "model",
          text: "🚚 Which delivery area should we check?\nSHOW_SUGGESTIONS:Tawau,Kota Kinabalu,Sandakan,Lahad Datu,Semporna,Other Area"
        }]);
        break;
      case "ask_question":
        setCurrentStep("FAQ_CHAT");
        setConciergeStep("ENTRY");
        setMessages([]);
        break;
    }
  };

  // ── handleTalkToSales — Direct WA escalation from main menu ─────────────────

  const handleTalkToSales = () => {
    const waMsg = lang === "zh"
      ? "您好，我想和销售团队联系讨论批发订单。"
      : lang === "en"
        ? "Hi, I'd like to talk to the sales team about my wholesale order."
        : "Hi, saya nak bercakap dengan team sales tentang pesanan borong saya.";
    window.open(`https://wa.me/601164073143?text=${encodeURIComponent(waMsg)}`, "_blank", "noopener,noreferrer");
  };

  // ── handleQuoteWAHandoff — Send quote to WA and go to QUOTE_HANDOFF screen ──

  const handleQuoteWAHandoff = () => {
    let waMsg = lang === "zh"
      ? `您好，我想为以下货品办理大宗批发订单：\n\n`
      : lang === "en"
        ? `Hi, I would like to proceed with this wholesale order for:\n\n`
        : `Hi, saya mahu proceed pesanan borong untuk:\n\n`;
    const items = quoteItems.length > 0 ? quoteItems : cart;
    items.forEach((item) => {
      waMsg += `• ${item.quantity}x ${item.name} (RM ${(item.priceNum || parseFloat((item.price || "0").replace(/[^0-9.]/g, ""))).toFixed(2)})\n`;
    });
    const grandTotal = items.reduce((acc, item) => acc + (item.priceNum * item.quantity), 0);
    waMsg += lang === "zh"
      ? `\n*总计金额: RM ${grandTotal.toFixed(2)}*\n\n请准备发票和付款二维码。谢谢！`
      : lang === "en"
        ? `\n*Grand Total: RM ${grandTotal.toFixed(2)}*\n\nPlease prepare the invoice & QR payment link. Thank you!`
        : `\n*Jumlah Keseluruhan: RM ${grandTotal.toFixed(2)}*\n\nSila sediakan bil & pautan QR untuk pembayaran. Terima kasih!`;
    window.open(`https://wa.me/601164073143?text=${encodeURIComponent(waMsg)}`, "_blank", "noopener,noreferrer");
    setCurrentStep("QUOTE_HANDOFF");
  };



  const handleClearChat = () => {
    setMessages([]);
    setCart([]);
    setQuoteItems([]);
    setError(null);
    setCurrentStep("FAQ_CHAT");
    setFlowType("ask_question");
    setConciergeStep("ENTRY");
    setBrowseCategory("");
    setCustomerName("");
    setCustomerPhone("");
    setLeadContext({ budget: "", preference: "", quantity: "" });
    try {
      localStorage.removeItem("golden_ai_messages");
      localStorage.removeItem("golden_ai_cart");
      localStorage.removeItem("golden_ai_step");
      localStorage.removeItem("golden_ai_name");
      localStorage.removeItem("golden_ai_phone");
    } catch (e) { }
  };

  const handleSuggestionClick = (query: string) => {
    setMessage(query);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ── handleSuggestionClickAndSubmit — Hybrid LLM routing ──────────────────────
  // Deterministic chips = $0 (no API call)
  // Only ambiguous/free text → real OpenAI call

  const handleSuggestionClickAndSubmit = async (query: string) => {
    const trimmedMessage = query.trim();
    if (!trimmedMessage) return;

    const q = trimmedMessage.toLowerCase();

    // ── DETERMINISTIC ROUTES (zero API cost) ─────────────────────────────────

    // "View Cart" / "Quote" / cart-related chips
    if (q === "view cart" || q === "tunjuk cart" || q === "cart" || q === "quote") {
      setCurrentStep("CART_REVIEW");
      return;
    }

    if (q === "checkout" || q === "semak keluar" || q === "结账") {
      setCurrentStep("CART_REVIEW");
      return;
    }

    // "Talk to Sales" / "WhatsApp" chips
    if (
      q.includes("talk to sales") || q.includes("hubungi sales") || q.includes("联系销售") ||
      q.includes("whatsapp") || q.includes("human") || q.includes("sales team")
    ) {
      const waMsg = lang === "zh"
        ? "您好，我需要销售人员协助处理批发订单。"
        : lang === "en"
          ? "Hi, I need assistance from the sales team for a wholesale order."
          : "Hi, saya perlu bantuan dari tim sales untuk pesanan borong.";
      window.open(`https://wa.me/601164073143?text=${encodeURIComponent(waMsg)}`, "_blank", "noopener,noreferrer");
      return;
    }

    // "Add More Items" after payment
    if (
      q === "add more items" || q === "tambah item lagi" || q === "继续添加商品"
    ) {
      setCurrentStep("MAIN_MENU");
      return;
    }

    // ── DETERMINISTIC CONCIERGE STATES (zero API cost) ─────────────────────
    if (currentStep === "FAQ_CHAT") {
      let replyText = "";
      let nextStep = conciergeStep;
      let nextChips: string[] = [];

      // 1. Delivery Flow
      if (conciergeStep === "DELIVERY_ASK") {
        const area = q;
        if (area.includes("tawau")) {
          replyText = "Yes, we deliver to Tawau. Delivery usually takes 1–2 working days depending on stock availability.";
        } else if (area.includes("kota kinabalu") || area.includes("kk")) {
          replyText = "Yes, we deliver to Kota Kinabalu. Delivery usually takes 1–2 working days depending on stock availability.";
        } else if (area.includes("sandakan")) {
          replyText = "Yes, we deliver to Sandakan. Delivery usually takes 1–2 working days depending on stock availability.";
        } else if (area.includes("lahad datu")) {
          replyText = "Yes, we deliver to Lahad Datu. Delivery usually takes 1–2 working days depending on stock availability.";
        } else {
          replyText = "Yes, we coordinate delivery across Sabah & Labuan through reliable B2B logistic partners.";
        }
        replyText += "\n\nIs this urgent delivery or normal planning?";
        nextChips = ["Urgent", "Normal", "Browse Products"];
        nextStep = "DELIVERY_RESULT";
      } else if (conciergeStep === "DELIVERY_RESULT") {
        if (q.includes("urgent")) {
          replyText = "For urgent delivery, our sales team can confirm fastest availability immediately.";
          nextChips = ["Talk to Sales", "Browse Products"];
        } else if (q.includes("normal") || q.includes("planning")) {
          replyText = "Great planning! Normal scheduled delivery is fully available. Feel free to browse our premium catalog or let me help you build a wholesale quote draft.";
          nextChips = ["Browse Products", "Get Wholesale Quote"];
        }
      }

      // 2. Help Me Choose Flow
      else if (conciergeStep === "CHOOSE_ASK") {
        if (q.includes("event") || q.includes("party")) {
          replyText = "Nice 🎉 For an event, what kind of vibe are you going for?";
          nextChips = ["Premium", "Casual Crowd", "Elegant", "Not Sure"];
          nextStep = "CHOOSE_EVENT_VIBE";
        } else if (q.includes("restaurant") || q.includes("bar")) {
          replyText = "Perfect 🥃 Restocking or building a new menu? We offer highly competitive wholesale pricing for high-volume accounts.\n\nWant me to show matching options?";
          nextChips = ["Show Products", "Ask Another Question", "Talk to Sales"];
          nextStep = "CHOOSE_RESULT";
        } else if (q.includes("retail") || q.includes("resale") || q.includes("shop")) {
          replyText = "Got it! Whether you are stocking shelves or curating a personal collection, we have direct duty-free pricing on all premium labels.\n\nWant me to show matching options?";
          nextChips = ["Show Products", "Ask Another Question", "Talk to Sales"];
          nextStep = "CHOOSE_RESULT";
        } else if (q.includes("personal") || q.includes("use")) {
          replyText = "Got it! For your personal collection or immediate enjoyment, we have a stunning selection of single malts and fine wines.\n\nWant me to show matching options?";
          nextChips = ["Show Products", "Ask Another Question", "Talk to Sales"];
          nextStep = "CHOOSE_RESULT";
        }
      } else if (conciergeStep === "CHOOSE_EVENT_VIBE") {
        if (q.includes("premium") || q.includes("elegant")) {
          replyText = "An elegant/premium vibe deserves fine labels. Single malts like Macallan and rare wines will elevate your event and leave a lasting impression.\n\nWant me to show matching options?";
          nextChips = ["Show Products", "Ask Another Question", "Talk to Sales"];
          nextStep = "CHOOSE_RESULT";
        } else if (q.includes("casual")) {
          replyText = "A casual crowd is all about easy-drinking favorites. Premium imported beers and light wines are perfect for keeping the energy high and the drinks flowing.\n\nWant me to show matching options?";
          nextChips = ["Show Products", "Ask Another Question", "Talk to Sales"];
          nextStep = "CHOOSE_RESULT";
        } else if (q.includes("not sure") || q.includes("sure")) {
          replyText = "If you want easy crowd-friendly choices, beer usually works well. For premium events, whisky is popular.\n\nWant me to show matching options?";
          nextChips = ["Show Products", "Ask Another Question", "Talk to Sales"];
          nextStep = "CHOOSE_RESULT";
        }
      }

      // 3. Wholesale Pricing Flow
      else if (conciergeStep === "WHOLESALE_ASK") {
        replyText = "Estimated monthly volume?";
        nextChips = ["Small", "Medium", "Large", "Not Sure"];
        nextStep = "WHOLESALE_VOLUME";
      } else if (conciergeStep === "WHOLESALE_VOLUME") {
        if (q.includes("large")) {
          replyText = "Larger orders may qualify for better pricing.";
          nextChips = ["Get Custom Quote", "Browse Products"];
          nextStep = "WHOLESALE_RESULT";
        } else {
          replyText = "We cater to all batch sizes starting from just 1 carton! We can prepare a custom wholesale quote to suit your needs.";
          nextChips = ["Get Wholesale Quote", "Browse Products", "Talk to Sales"];
          nextStep = "WHOLESALE_RESULT";
        }
      }

      // 4. MOQ Flow
      else if (conciergeStep === "MOQ_ASK") {
        replyText = "Category-specific MOQ may apply.";
        nextChips = ["Browse Products", "Talk to Sales"];
        nextStep = "MOQ_RESULT";
      }

      // If we matched one of our deterministic paths, handle it locally
      if (replyText) {
        setConciergeStep(nextStep);
        setMessages([...messages, { role: "user", text: trimmedMessage }, { role: "model", text: `${replyText}\nSHOW_SUGGESTIONS:${nextChips.join(",")}` }]);
        setMessage("");
        return;
      }
    }

    // Direct general navigations in concierge flow
    if (q === "browse products" || q === "show products" || q === "browse produk") {
      handleFlowSelect("browse_products");
      return;
    }

    if (q === "get wholesale quote" || q === "get custom quote" || q === "wholesale quote") {
      handleFlowSelect("wholesale_quote");
      return;
    }

    if (q === "ask another question" || q === "tanya soalan lain") {
      setConciergeStep("ENTRY");
      setMessages([]);
      return;
    }

    // ── Delivery Coverage Deterministic Routes ──
    const dRoute = q.toLowerCase();
    let dReply = "";
    if (dRoute === "tawau") {
      dReply = "✅ Delivery to Tawau usually takes around 1 working day depending on stock availability.";
    } else if (dRoute === "kota kinabalu") {
      dReply = "✅ Delivery to Kota Kinabalu usually takes 1-2 working days depending on stock availability.";
    } else if (dRoute === "sandakan") {
      dReply = "✅ Delivery to Sandakan usually takes around 1-2 working days depending on logistics schedule.";
    } else if (dRoute === "lahad datu") {
      dReply = "✅ Delivery to Lahad Datu usually takes around 1 working day depending on stock.";
    } else if (dRoute === "semporna") {
      dReply = "✅ Delivery to Semporna usually takes around 1-2 working days depending on route scheduling.";
    } else if (dRoute === "other area") {
      dReply = "📍 Tell us your location and we’ll check delivery availability for you.";
    }
    
    if (dReply) {
      setCurrentStep("DELIVERY_AREA");
      setMessages([...messages, { role: "user", text: trimmedMessage }, { role: "model", text: dReply + "\nSHOW_SUGGESTIONS:Browse Products,Ask Question,Talk to Sales" }]);
      setMessage("");
      return;
    }

    // ── LLM ROUTE (API call for genuine free text) ────────────────────────────

    if (currentStep !== "START" && currentStep !== "FAQ_CHAT") {
      setCurrentStep("FAQ_CHAT");
    }

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
        const processedReply = appendSuggestionsIfMissing(data.reply, lang);
        setMessages((prev) => [...prev, { role: "model", text: processedReply }]);
        if (data.reply.startsWith("TOOL_RESULT:")) {
          try {
            const parsed = JSON.parse(data.reply.substring(12));
            if (parsed && (parsed.action === "cart_updated" || parsed.action === "cart_viewed") && Array.isArray(parsed.products)) {
              setCart(parsed.products);
            }
          } catch (e) { }
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

  const handleCartRemoveItem = (name: string) => {
    setCart(prev => {
      const updated = prev.filter(item => item.name.toLowerCase() !== name.toLowerCase());
      localStorage.setItem("golden_ai_cart", JSON.stringify(updated));
      return updated;
    });
  };

  const handleCartUpdateQty = (name: string, qty: number) => {
    setCart(prev => {
      const updated = prev.map(item => {
        if (item.name.toLowerCase() === name.toLowerCase()) {
          const priceNum = item.priceNum;
          return {
            ...item,
            quantity: qty,
            total: `RM ${(qty * priceNum).toFixed(2)}`
          };
        }
        return item;
      });
      localStorage.setItem("golden_ai_cart", JSON.stringify(updated));
      return updated;
    });
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

  const getTooltipText = () => {
    switch (lang) {
      case "zh":
        return {
          label: "Golden AI • 智能销售助理",
          title: "您好！我是 Golden AI 👋",
          desc: "随时问我任何问题！我会即时为您解答。"
        };
      case "ms":
        return {
          label: "Golden AI • Pembantu Jualan AI",
          title: "Hi! Saya Golden AI 👋",
          desc: "Tanya apa-apa soalan saja, saya sedia membantu boss!"
        };
      default:
        return {
          label: "Golden AI • AI Sales Assistant",
          title: "Hi! I'm Golden AI 👋",
          desc: "Feel free to ask me any question! I'm here to help."
        };
    }
  };
  const tooltipText = getTooltipText();

  return (
    <>
      {/* ── Floating Trigger Bubble ── */}
      <AnimatePresence>
        {!isOpen && (
          <>
            {/* Elegant Floating Prompt Tooltip */}
            {showTooltip && (
              <motion.div
                key="chat-prompt-tooltip"
                initial={{ opacity: 0, x: 15, scale: 0.92, y: 0 }}
                animate={{ opacity: 1, x: 0, scale: 1, y: [0, -4, 0] }}
                exit={{ opacity: 0, x: 15, scale: 0.92 }}
                transition={{
                  opacity: { delay: 0.5, duration: 0.4 },
                  x: { delay: 0.5, duration: 0.4 },
                  scale: { delay: 0.5, duration: 0.4 },
                  y: {
                    repeat: Infinity,
                    duration: 3,
                    ease: "easeInOut"
                  }
                }}
                onClick={() => setIsOpen(true)}
                style={{ zIndex: 9999 }}
                className="flex fixed bottom-[30px] right-20 sm:right-[88px] mr-2 z-[9999] items-center gap-3 py-3 pl-4.5 pr-10 rounded-2xl bg-white border border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.06)] select-none pointer-events-auto cursor-pointer group transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
              >
                {/* Absolute Close Button inside the card on the top right */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTooltip(false);
                  }}
                  className="absolute right-2 top-2 text-slate-400 hover:text-black p-0.5 rounded-full hover:bg-slate-50 transition-all cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                <div className="flex flex-col text-left justify-center shrink-0">
                  {/* Top Line: Golden AI */}
                  <span className="text-[13px] font-black text-[#1a1a1a] leading-none">Golden AI</span>
                  
                  {/* Bottom Line: Glowing Lamp + Ready to Assist */}
                  <div className="flex items-center gap-1.5 mt-2.5 leading-none">
                    {/* Blinking Glowing Green Lamp */}
                    <div className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-450 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
                    </div>
                    <span className="text-[10.5px] text-slate-500 font-semibold tracking-wide">Ready to Assist</span>
                  </div>
                </div>

                {/* Subtle speech bubble beak */}
                <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-white border-r border-t border-slate-100 rotate-45" />
              </motion.div>
            )}

            <motion.button
              key="chat-trigger-bubble"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={() => setIsOpen(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Open Golden AI chat"
              style={{ zIndex: 9999 }}
              className="fixed bottom-6 right-4 sm:right-6 w-14 h-14 rounded-full bg-white border border-slate-200 hover:border-black/35 text-[#1a1a1a] flex items-center justify-center shadow-lg cursor-pointer transition-all"
            >
              <GlowingOrb size={56} />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#1a1a1a] text-white text-[9.5px] font-bold flex items-center justify-center shadow-md">
                  {cart.reduce((a, c) => a + c.quantity, 0)}
                </span>
              )}
            </motion.button>
          </>
        )}
      </AnimatePresence>

      {/* ── Chat Panel ── */}
      <AnimatePresence>
        {isOpen && isMobile && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 sm:hidden"
            style={{ zIndex: 9997 }}
            onClick={() => setIsOpen(false)}
          />
        )}

        {isOpen && (
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
              background: "#F4F4F7",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(212,175,55,0.25)",
              boxShadow: "0 24px 80px -12px rgba(212,175,55,0.15), 0 0 0 1px rgba(212,175,55,0.08), 0 0 60px rgba(124,58,237,0.04)"
            }}
            className={`
              fixed flex flex-col overflow-hidden text-[#1a1a1a]
              ${isMobile
                // Mobile: full screen, slides up from bottom
                ? "inset-0 rounded-none"
                // Desktop: premium floating panel, larger
                : "bottom-6 right-6 w-[440px] h-[660px] rounded-[32px]"
              }
            `}
          >
            {/* Ambient Spatial Glows & Pattern for 2026 Futurist UI */}
            <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-fuchsia-400/10 rounded-full blur-[80px] animate-pulse duration-[4000ms] pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-[24rem] h-[24rem] bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-300/10 rounded-full blur-[80px] pointer-events-none" />
            
            {/* Grain/Noise overlay */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02] mix-blend-multiply pointer-events-none" />
            {/* Tech data grid lines */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_15%,transparent_100%)] pointer-events-none" />

            {/* ── Header ── */}
            <div className={`flex items-center justify-between shrink-0 border-b border-slate-100 bg-white/40 backdrop-blur-md ${isMobile ? "px-5 py-4 pt-12" : "px-6 py-4"
              }`}>
              <div className="flex items-center gap-3">
                {currentStep !== "MAIN_MENU" && currentStep !== "START" ? (
                  <button
                    type="button"
                    onClick={() => {
                      switch (currentStep) {
                        case "BROWSE_CATEGORY":
                          setCurrentStep("MAIN_MENU");
                          setFlowType(null);
                          setMessages([]);
                          setError(null);
                          break;
                        case "BROWSE_PRODUCTS":
                          setCurrentStep("MAIN_MENU");
                          setFlowType(null);
                          setMessages([]);
                          setError(null);
                          break;
                        case "CART_REVIEW":
                          setCurrentStep("BROWSE_PRODUCTS");
                          break;
                        case "CHECKOUT_DETAILS":
                          setCurrentStep("CART_REVIEW");
                          break;
                        case "PAYMENT_SELECTION":
                          setCurrentStep("CHECKOUT_DETAILS");
                          break;
                        case "PAYMENT_COMPLETE":
                          setCurrentStep("MAIN_MENU");
                          setFlowType(null);
                          setMessages([]);
                          setError(null);
                          break;
                        case "QUOTE_CATEGORY":
                          setCurrentStep("MAIN_MENU");
                          setFlowType(null);
                          setMessages([]);
                          setError(null);
                          break;
                        case "QUOTE_BUSINESS_TYPE":
                          setCurrentStep("QUOTE_CATEGORY");
                          break;
                        case "QUOTE_RECOMMENDATION":
                          setCurrentStep("QUOTE_BUSINESS_TYPE");
                          break;
                        case "QUOTE_REVIEW":
                          setCurrentStep("QUOTE_RECOMMENDATION");
                          break;
                        case "QUOTE_HANDOFF":
                          setCurrentStep("MAIN_MENU");
                          setFlowType(null);
                          setMessages([]);
                          setMessage("");
                          setError(null);
                          break;
                        case "DELIVERY_AREA":
                          setCurrentStep("MAIN_MENU");
                          setFlowType(null);
                          setMessages([]);
                          setMessage("");
                          setError(null);
                          setLoading(false);
                          break;
                        case "FAQ_CHAT":
                          if (conciergeStep !== "ENTRY") {
                            setConciergeStep("ENTRY");
                            setMessages([]);
                            setMessage("");
                            setError(null);
                            setLoading(false);
                          } else {
                            setCurrentStep("MAIN_MENU");
                            setFlowType(null);
                            setMessages([]);
                            setMessage("");
                            setError(null);
                            setLoading(false);
                          }
                          break;
                        default:
                          setIsOpen(false);
                          break;
                      }
                    }}
                    className="p-1.5 -ml-1 rounded-xl text-slate-500 hover:text-[#d4af37] hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                ) : (
                  // Only show left close button on mobile, desktop has the right close button
                  isMobile && (
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="p-1.5 -ml-1 rounded-xl text-slate-500 hover:text-[#d4af37] hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )
                )}
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden">
                  <GlowingOrb size={36} />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-[#1a1a1a] tracking-tight leading-none">Golden AI</h2>
                  <p className="text-[9.5px] text-slate-400 font-semibold mt-1 tracking-widest uppercase">Premium Concierge</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearChat();
                    }}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all cursor-pointer"
                    title="Clear chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 select-none px-1.5 py-1">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]"></span>
                  </span>
                  <span className="tracking-wider uppercase text-[9.5px]">
                    {lang === "zh" ? "在线" : lang === "ms" ? "Aktif" : "Online"}
                  </span>
                </div>
                {!isMobile && (
                  <button type="button" onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-[#1a1a1a] hover:bg-slate-100 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* ── Progress Tracker ── */}
            <ProgressTracker step={currentStep} flowType={flowType} cartCount={cart.reduce((a, c) => a + c.quantity, 0)} />

            {/* ── Main View Dispatcher ── */}
            <div className="flex-1 min-h-0 relative">
              {currentStep === "MAIN_MENU" ? (
                <GreetingMenuView
                  lang={lang}
                  onSelect={handleFlowSelect}
                  onTalkToSales={handleTalkToSales}
                />
              ) : currentStep === "FAQ_CHAT" && conciergeStep === "ENTRY" ? (
                <ConciergeEntryView
                  onSelect={(card) => {
                    setConciergeStep(card.step);
                    setMessages([
                      { role: "user", text: card.title },
                      { role: "model", text: `${card.botReply}\nSHOW_SUGGESTIONS:${card.chips.join(",")}` }
                    ]);
                  }}
                />
              ) : currentStep === "BROWSE_PRODUCTS" || currentStep === "BROWSE_CATEGORY" ? (
                <BrowseProductsView
                  category={browseCategory}
                  storeId={storeId!}
                  lang={lang}
                  onAddToCart={(p, q) => handleAddToCart(p, q)}
                  onSendText={handleSuggestionClickAndSubmit}
                  cartCount={cart.reduce((a, c) => a + c.quantity, 0)}
                />

              ) : currentStep === "QUOTE_HANDOFF" ? (
                <QuoteHandoffView
                  lang={lang}
                  onBack={() => setCurrentStep("MAIN_MENU")}
                />
              ) : currentStep === "QUOTE_REVIEW" ? (
                <QuoteReviewView
                  cart={quoteItems}
                  lang={lang}
                  onBack={() => setCurrentStep("QUOTE_RECOMMENDATION")}
                  onCheckout={handleQuoteWAHandoff}
                  onRemove={(name) => {
                    setQuoteItems(prev => prev.filter(item => item.name.toLowerCase() !== name.toLowerCase()));
                  }}
                  onUpdateQty={(name, qty) => {
                    setQuoteItems(prev => prev.map(item => item.name.toLowerCase() === name.toLowerCase() ? { ...item, quantity: qty, total: `RM ${(qty * item.priceNum).toFixed(2)}` } : item));
                  }}
                  proceedLabel={lang === "zh" ? "联系WhatsApp完成" : lang === "en" ? "Proceed via WhatsApp" : "Proceed via WhatsApp"}
                />
              ) : currentStep === "CART_REVIEW" ? (
                <QuoteReviewView
                  cart={cart}
                  lang={lang}
                  onBack={() => setCurrentStep("BROWSE_PRODUCTS")}
                  onCheckout={() => setCurrentStep("CHECKOUT_DETAILS")}
                  onRemove={handleCartRemoveItem}
                  onUpdateQty={handleCartUpdateQty}
                />
              ) : currentStep === "CHECKOUT_DETAILS" ? (
                <CheckoutDetailsView
                  lang={lang}
                  onBack={() => setCurrentStep("CART_REVIEW")}
                  onSubmit={(name, phone, email) => {
                    setCustomerName(name);
                    setCustomerPhone(phone);
                    setCustomerEmail(email);
                    setCurrentStep("PAYMENT_SELECTION");
                  }}
                />
              ) : currentStep === "PAYMENT_SELECTION" ? (
                <PaymentSelectionView
                  cart={cart}
                  name={customerName}
                  phone={customerPhone}
                  email={customerEmail}
                  lang={lang}
                  onBack={() => setCurrentStep("CHECKOUT_DETAILS")}
                  onProcessCheckout={handleProcessCheckout}
                />
              ) : (
                /* ── Chat Messages Mode ── */
                <div className="h-full flex flex-col justify-between">
                  <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-5 space-y-5 min-h-0 overscroll-contain">
                    <AnimatePresence initial={false}>

                      {/* ── STEP 1: Onboarding Welcome (Language selection) ── */}
                      {currentStep === "START" && (
                        <motion.div
                          key="step-start"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -12 }}
                          className="h-full flex flex-col items-center justify-center text-center px-6 py-6 space-y-6"
                        >
                          <div className="relative">
                            <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                              <GlowingOrb size={80} />
                            </div>
                            <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
                          </div>

                          <div className="space-y-3 max-w-[320px]">
                            <h3 className="text-[20px] font-semibold text-[#1a1a1a] tracking-tight leading-snug">
                              {lang === "zh" ? "为活动或餐厅采购？" : lang === "en" ? "Stocking up for an event or restaurant?" : "Boss nak stok untuk event atau restoran?"}
                            </h3>
                            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest leading-none">
                              Golden AI · Premium B2B Concierge
                            </p>
                            <p className="text-[13px] text-slate-600 leading-relaxed font-normal">
                              {lang === "zh" ? "请先选择您的语言" : lang === "en" ? "Please select your language first" : "Pilih bahasa dulu, then sy terus recommend produk terbaik untuk boss."}
                            </p>
                          </div>

                          <div className="w-full max-w-[290px] bg-[#fafaf8] border border-slate-200 rounded-3xl p-5 space-y-4 shadow-[0_2px_8px_rgba(0,0,0,0.005)]">
                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                              <Globe className="w-3 h-3" /> Choose Your Language / Pilih Bahasa
                            </p>
                            <div className="flex flex-col gap-2">
                              <button type="button" onClick={() => handleLanguageSelect("en")} className="w-full py-3 px-5 rounded-full border border-slate-200 bg-white hover:border-black/35 hover:bg-slate-50 text-[13px] font-semibold text-[#1a1a1a] transition-all cursor-pointer flex items-center justify-between active:scale-98 group">
                                <span>English</span><span className="text-[9px] text-slate-400 group-hover:text-black font-semibold uppercase tracking-wider">Start</span>
                              </button>
                              <button type="button" onClick={() => handleLanguageSelect("ms")} className="w-full py-3 px-5 rounded-full border border-slate-200 bg-white hover:border-black/35 hover:bg-slate-50 text-[13px] font-semibold text-[#1a1a1a] transition-all cursor-pointer flex items-center justify-between active:scale-98 group">
                                <span>Bahasa Melayu</span><span className="text-[9px] text-slate-400 group-hover:text-black font-semibold uppercase tracking-wider">Mula</span>
                              </button>
                              <button type="button" onClick={() => handleLanguageSelect("zh")} className="w-full py-3 px-5 rounded-full border border-slate-200 bg-white hover:border-black/35 hover:bg-slate-50 text-[13px] font-semibold text-[#1a1a1a] transition-all cursor-pointer flex items-center justify-between active:scale-98 group">
                                <span>中文 / 华语</span><span className="text-[9px] text-slate-400 group-hover:text-black font-semibold uppercase tracking-wider">开始</span>
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* ── Flow 2: Quote Category Selection ── */}
                      {currentStep === "QUOTE_CATEGORY" && (
                        <motion.div key="step-quote-cat" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="py-4 px-4">
                          <CategorySelector onSelect={(c) => {
                            setLeadContext(prev => ({ ...prev, preference: c }));
                            setMessages([{ role: "user", text: `Selected Category: ${c}` }]);
                            setCurrentStep("QUOTE_BUSINESS_TYPE");
                          }} />
                        </motion.div>
                      )}

                      {/* ── Flow 2: Quote Business Type Selection ── */}
                      {currentStep === "QUOTE_BUSINESS_TYPE" && (
                        <motion.div key="step-quote-biz" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="py-4 px-4 space-y-4">
                          <BusinessTypeSelector onSelect={async (bt) => {
                            setLeadContext(prev => ({ ...prev, quantity: bt }));
                            const updatedMessages: Message[] = [...messages, { role: "user", text: `Selected Use Case: ${bt}` }];
                            setMessages(updatedMessages);
                            setCurrentStep("QUOTE_RECOMMENDATION");
                            setLoading(true);
                            try {
                              const response = await fetch("/api/chat", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  messages: [...updatedMessages, { role: "user", text: `Recommend premium ${leadContext.preference || 'liquor'} tailored for ${bt}` }],
                                  cart: quoteItems,
                                  language: lang,
                                  leadContext: { preference: leadContext.preference, quantity: bt },
                                  flowType: "wholesale_quote"
                                }),
                              });
                              const data: ChatResponse = await response.json();
                              if (data.reply) setMessages(prev => [...prev, { role: "model", text: data.reply! }]);
                            } catch (e) { setError("Failed to get recommendation"); } finally { setLoading(false); }
                          }} highlightFirst={false} />
                        </motion.div>
                      )}

                      {/* Free Chat / Active Conversation Messages */}
                      {(currentStep === "QUOTE_RECOMMENDATION" || currentStep === "FAQ_CHAT" || currentStep === "PAYMENT_COMPLETE" || messages.length > 0) && (
                        <div key="step-chat" className="space-y-5">
                          {messages.map((msg, index) => (
                            <motion.div
                              key={`msg-${index}`}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                              className={`flex items-start gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                              {msg.role === "model" && <AvatarBot />}
                              <div className={`flex flex-col max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"}`}>
                                <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">
                                  {msg.role === "user" ? t.userLabel : t.botLabel}
                                </span>
                                {msg.role === "model" && msg.text.startsWith("TOOL_RESULT_QUOTE_CARD:") ? (
                                  <QuoteCardUI text={msg.text} lang={lang} />
                                ) : msg.role === "model" && msg.text.startsWith("TOOL_RESULT_PRODUCT_CARDS:") ? (
                                  <ToolResultProductCards text={msg.text} onAddToCart={handleAddToCart} onSendText={handleSuggestionClickAndSubmit} lang={lang} cartCount={cart.reduce((a, c) => a + c.quantity, 0)} />
                                ) : msg.role === "model" && msg.text.startsWith("TOOL_RESULT_CATEGORIES:") ? (
                                  <ToolResultCategories text={msg.text} onSendText={handleSuggestionClickAndSubmit} lang={lang} />
                                ) : msg.role === "model" && msg.text.startsWith("TOOL_RESULT_CHECKOUT_CARD:") ? (
                                  <ToolResultCheckoutCard text={msg.text} cart={cart} onProcessCheckout={handleProcessCheckout} lang={lang} />
                                ) : msg.role === "model" && msg.text.startsWith("TOOL_RESULT:") ? (
                                  msg.text.includes('"action":"cart_') ? (
                                    <QuoteRenderer
                                      text={msg.text}
                                      onModifyQuote={() => handleSuggestionClick(lang === "zh" ? "请修改此报价单：" : lang === "en" ? "Please modify this quote: " : "Tolong ubah quote ni bosku: ")}
                                      onWhatsAppCheckout={(products, total) => {
                                        fetch("/api/chat", {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({ action: "whatsapp_click", language: lang, cart: products, leadContext })
                                        }).catch(() => { });

                                        let waMsg = `🛒 *New Lead - Golden AI*\n---------------------------\n`;
                                        products.forEach((item, idx) => {
                                          waMsg += `• ${item.quantity}x ${item.name} (RM ${item.priceNum || item.price})\n`;
                                        });
                                        waMsg += `---------------------------\n💰 *TOTAL: RM ${total.toFixed(2)}*\n🌐 Language: ${lang.toUpperCase()}\n⏰ ${new Date().toLocaleString()}`;

                                        window.open(`https://wa.me/601164073143?text=${encodeURIComponent(waMsg)}`, "_blank", "noopener,noreferrer");
                                      }}
                                      lang={lang}
                                    />
                                  ) : (
                                    <ToolResultRenderer text={msg.text} onAddToCart={handleAddToCart} lang={lang} />
                                  )
                                ) : (
                                  <div className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} w-full`}>
                                    <div
                                      className={`rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed whitespace-pre-wrap inline-block ${msg.role === "user"
                                        ? "bg-[#fdf8e8] border border-[#d4af37]/35 text-[#1a1a1a] font-medium rounded-tr-[6px]"
                                        : "bg-[#f5f5f0] border border-slate-200 text-[#1a1a1a] rounded-tl-[6px]"
                                        }`}
                                      style={{ overflowWrap: "break-word", wordBreak: "break-word", overflowX: "hidden" }}
                                    >
                                      {msg.role === "user" ? (
                                        msg.text.replace(/SHOW_SUGGESTIONS:(.*)/, "").trim()
                                      ) : (
                                        <ReactMarkdown
                                          components={{
                                            img: ({ src, alt }) => (
                                              <img src={src} alt={alt ?? ""} className="max-w-full rounded-lg mt-2" />
                                            ),
                                            a: ({ href, children }) => (
                                              <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-blue-600">{children}</a>
                                            ),
                                            p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                                            ul: ({ children }) => <ul className="list-disc list-inside mb-1 space-y-0.5">{children}</ul>,
                                            ol: ({ children }) => <ol className="list-decimal list-inside mb-1 space-y-0.5">{children}</ol>,
                                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                                            code: ({ children }) => <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-[12px] font-mono">{children}</code>,
                                          }}
                                        >
                                          {msg.text.replace(/SHOW_SUGGESTIONS:(.*)/, "").trim()}
                                        </ReactMarkdown>
                                      )}
                                    </div>
                                    {msg.role === "model" && msg.text.includes("SHOW_SUGGESTIONS:") && (
                                      <SuggestionChips text={msg.text} onSelect={handleSuggestionClickAndSubmit} lang={lang} />
                                    )}
                                  </div>
                                )}
                              </div>
                              {msg.role === "user" && <AvatarUser />}
                            </motion.div>
                          ))}

                          {/* Loading */}
                          {loading && (
                            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2.5">
                              <AvatarBot />
                              <div className="flex flex-col items-start max-w-[85%]">
                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 px-0.5">{t.botLabel}</span>
                                <SmartLoader lang={lang} />
                              </div>
                            </motion.div>
                          )}

                          {/* Error */}
                          {error && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                              className="flex items-start gap-2.5 bg-rose-50 border border-rose-250 rounded-2xl px-4 py-3">
                              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-[12px] font-bold text-rose-600">{t.errorTitle}</p>
                                <p className="text-[11.5px] text-rose-500 mt-0.5">{error}</p>
                              </div>
                            </motion.div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </AnimatePresence>
                  </div>


                  {/* ── Human Escalation Banner ── */}
                  <div className="bg-[#fafaf8] border-t border-[#d4af37]/15 px-6 py-2.5 flex items-center justify-between text-[11px] shrink-0 select-none">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] animate-pulse" />
                      <span className="text-slate-600 font-medium">Need human assistance?</span>
                    </div>
                    <a
                      href="https://wa.me/601164073143?text=Hi,%20saya%20perlu%20bantuan%20dari%20tim%20sales%20untuk%20pesanan%20borong."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#d4af37] hover:text-[#b8960c] font-semibold tracking-wide transition-colors uppercase text-[10px]"
                    >
                      Talk to Sales
                    </a>
                  </div>

                  {messages.length > 0 && (
                    <div className={`shrink-0 border-t border-[#d4af37]/15 bg-white ${isMobile ? "px-5 py-4 pb-8" : "px-6 py-4"}`}>
                      <form onSubmit={handleChatSubmit} className="relative flex items-center gap-2 w-full">
                        <div className="relative flex-1">
                          <input
                            ref={inputRef}
                            type="text"
                            required
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            disabled={loading}
                            placeholder={t.placeholder}
                            className="w-full bg-[#fafaf8] border border-slate-200 text-[#1a1a1a] placeholder:text-slate-400 pl-5 pr-14 py-3.5 rounded-full outline-none focus:border-[#d4af37] focus:bg-white transition-all disabled:opacity-50 text-[13.5px] font-medium"
                          />
                          <motion.button
                            whileTap={{ scale: loading ? 1 : 0.9 }}
                            type="submit"
                            disabled={loading || !message.trim()}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#d4af37] text-black rounded-full transition-all flex items-center justify-center cursor-pointer hover:bg-[#b8960c] disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </motion.button>
                        </div>
                      </form>
                    </div>
                  )}

                </div>
              )}


              {/* ── Mini Screen Product Details Overlay ── */}
              <AnimatePresence>
                {previewProduct && (
                  <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="absolute inset-0 z-[100] bg-white flex flex-col"
                  >
                    {/* Header with Close Button */}
                    <div className="flex items-center justify-between p-4 border-b border-slate-100 shrink-0">
                      <h3 className="text-[14px] font-bold text-[#1a1a1a]">Product Details</h3>
                      <button
                        onClick={() => setPreviewProduct(null)}
                        className="p-2 -mr-2 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-5">
                      <div className="w-full bg-[#fafaf8] rounded-2xl flex items-center justify-center p-6 border border-[#d4af37]/10 mb-5">
                        {previewProduct.image_url ? (
                          <img src={previewProduct.image_url} alt={previewProduct.name} className="w-full max-w-[180px] h-auto object-contain" />
                        ) : (
                          <GlassWater className="w-12 h-12 text-[#d4af37]/40" />
                        )}
                      </div>

                      <div className="space-y-4">
                        <div>
                          <span className="text-[10px] uppercase tracking-widest font-bold text-[#b8960c]">{previewProduct.category}</span>
                          <h2 className="text-[18px] font-black text-[#1a1a1a] leading-tight mt-1">{previewProduct.name}</h2>
                          <div className="text-[20px] font-black text-[#1a1a1a] tracking-tight mt-2">{previewProduct.price}</div>
                        </div>

                        {previewProduct.badge && (
                          <span className={`inline-flex items-center gap-1.5 text-[9px] tracking-wider uppercase font-bold px-3 py-1.5 rounded-full border ${previewProduct.badge === "TERHAD"
                            ? "bg-amber-50 text-[#b8960c] border-[#b8960c]/20"
                            : "bg-emerald-50 text-emerald-600 border-emerald-200"
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${previewProduct.badge === "TERHAD" ? "bg-[#b8960c]" : "bg-emerald-500"}`}></span>
                            {previewProduct.badge}
                          </span>
                        )}

                        {previewProduct.description && (
                          <div className="pt-2 border-t border-slate-100">
                            <h4 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Description</h4>
                            <p className="text-[13px] text-slate-655 leading-relaxed font-medium">{previewProduct.description}</p>
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-100 mt-4">
                          <button
                            onClick={() => window.open(`/product/${previewProduct.id}`, '_blank')}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[#b8960c] text-[#b8960c] hover:bg-[#b8960c]/5 hover:border-[#d4af37] hover:text-[#d4af37] font-bold text-[12px] transition-all cursor-pointer active:scale-[0.98]"
                          >
                            Open Full Page <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
