"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
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
  Paperclip,
  FileText,
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
  | "competitor_compare"   // Flow 3 — OCR + then reuses Flow 2
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
  // ── Flow 3: Competitor Comparison (Vision API → then Flow 2) ─────────────
  | "COMPARE_UPLOAD"
  | "COMPARE_PROCESSING"
  | "COMPARE_RESULTS"
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
    thinking: "Sedang merangka cadangan terbaik...",
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
    menuCompare: "Bandingkan Harga Pesaing",
    menuCompareDesc: "Upload invois lama — kami tunjuk penjimatan boss",
    menuFAQ: "Tanya Soalan",
    menuFAQDesc: "Tentang produk, penghantaran atau pembayaran",
    menuSales: "Bercakap dengan Sales",
    menuSalesDesc: "Connect terus dengan team sales kami",
    faqPlaceholder: "Tanya apa sahaja tentang produk kami...",
    faqRefusal: "Maaf, saya hanya boleh bantu soalan berkaitan produk dan pesanan kami. Sila hubungi team sales untuk bantuan lanjut.",
    compareUploadTitle: "Upload Invois Pesaing",
    compareUploadDesc: "Upload invois supplier boss sekarang. Kami analisa dan tunjuk berapa boss boleh jimat dengan Golden Isle.",
    compareUploadBtn: "Pilih Fail (JPG/PNG/PDF)",
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
    menuCompare: "Compare Competitor Price",
    menuCompareDesc: "Upload your invoice — see how much you save",
    menuFAQ: "Ask a Question",
    menuFAQDesc: "About products, delivery or payment",
    menuSales: "Talk to Sales",
    menuSalesDesc: "Connect directly with our sales team",
    faqPlaceholder: "Ask anything about our products or ordering...",
    faqRefusal: "Sorry, I can only assist with questions related to our products and ordering. Please talk to our sales team for further assistance.",
    compareUploadTitle: "Upload Competitor Invoice",
    compareUploadDesc: "Upload your current supplier's invoice. We'll analyse it and show exactly how much you save with Golden Isle.",
    compareUploadBtn: "Choose File (JPG/PNG/PDF)",
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
    menuCompare: "比较竞争对手价格",
    menuCompareDesc: "上传发票 — 查看您能节省多少",
    menuFAQ: "提问",
    menuFAQDesc: "询问有关产品、配送或付款的问题",
    menuSales: "联系销售",
    menuSalesDesc: "直接与我们的销售团队联系",
    faqPlaceholder: "请询问有关我们产品或订购的任何问题...",
    faqRefusal: "抱歉，我只能回答与我们产品和订购相关的问题。如需进一步帮助，请联系我们的销售团队。",
    compareUploadTitle: "上传竞争对手发票",
    compareUploadDesc: "上传您当前供应商的发票。我们将进行分析，并向您展示使用Golden Isle可以节省多少费用。",
    compareUploadBtn: "选择文件（JPG/PNG/PDF）",
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
    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200/50 shadow-sm">
      <Bot className="w-[14px] h-[14px] text-[#1F2937]" />
    </div>
  );
}

function AvatarUser() {
  return (
    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 mt-0.5 border border-slate-300/30">
      <User className="w-[14px] h-[14px] text-slate-600" />
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
  try { data = JSON.parse(text.substring(12)); } catch (e) {}

  if (!data) return (
    <div className="bg-slate-50 border border-slate-200 text-slate-500 text-[13px] p-4 rounded-2xl rounded-tl-[5px] shadow-sm">
      {t.errReceipt}
    </div>
  );

  const grandTotal = data.products.reduce((acc, item) => acc + (item.priceNum * item.quantity), 0);

  return (
    <div className="space-y-3 w-full">
      <div className="text-[13px] font-medium text-slate-700 leading-relaxed">{data.summary}</div>
      {data.products?.length > 0 ? (
        <div className="bg-white rounded-2xl overflow-hidden shadow-md p-5 space-y-4 border border-slate-100">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-[#D4AF37] animate-pulse" />
              <span className="text-[10px] font-black text-slate-800 tracking-wider uppercase">{t.quoteTitle}</span>
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t.brandTitle}</span>
          </div>
          <div className="space-y-3 divide-y divide-slate-100">
            {data.products.map((p, idx) => (
              <div key={`quote-prod-${p.name}-${idx}`} className="flex items-start justify-between gap-3 pt-3 first:pt-0">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-black text-slate-900 truncate">{p.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{p.quantity} unit × {p.price}</p>
                </div>
                <span className="text-[13px] font-extrabold text-slate-900 shrink-0">{p.total}</span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{t.grandTotal}</span>
            <span className="text-[16px] font-black text-slate-900">RM {grandTotal.toFixed(2)}</span>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onModifyQuote}
              className="flex-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 py-2.5 rounded-full transition-all cursor-pointer">
              {t.modifyBtn}
            </button>
            <button type="button" onClick={() => onWhatsAppCheckout(data!.products, grandTotal)}
              className="flex-1 text-[11px] font-semibold text-white bg-[#1F2937] hover:bg-slate-800 py-2.5 rounded-full text-center transition-all shadow-sm cursor-pointer">
              {t.whatsappBtn}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-[12px] text-slate-500 bg-slate-50 border border-slate-200/50 rounded-xl p-4 text-center">
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

function ProductCard({ p, onAddToCart, onSendText, lang, mode = "quote" }: { p: any; onAddToCart: (product: any, quantity: number) => void; onSendText: (text: string) => void; lang: Language; mode?: "cart" | "quote" }) {
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
    setTimeout(() => setAdded(false), 2000);
  };

  const urgencyCopy = getUrgencyCopy(p.category, p.badge, lang);

  return (
    <div className="bg-white border border-slate-100/80 rounded-[24px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.04)] hover:border-slate-200/80 transition-all duration-300 flex flex-col w-full group">
      {p.image_url ? (
        <div className="w-full h-[200px] bg-slate-50 overflow-hidden relative">
          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" />
          <div className="absolute top-3.5 right-3.5">
            <span className={`text-[9px] tracking-wider uppercase font-semibold px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-md ${
              p.badge === "TERHAD" 
                ? "bg-white/90 text-amber-600 border-amber-100/50" 
                : "bg-white/90 text-emerald-600 border-emerald-100/50"
            }`}>{p.badge}</span>
          </div>
        </div>
      ) : (
        <div className="w-full h-[140px] bg-slate-50 flex items-center justify-center border-b border-slate-100/60">
          <span className="text-3xl">🥃</span>
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest font-semibold text-[#D4AF37]">{p.category}</span>
        </div>
        <h4 className="text-[15px] font-semibold text-slate-900 leading-snug tracking-tight">{p.name}</h4>
        {/* Urgency copy line */}
        <p className="text-[11px] font-medium text-emerald-600 leading-snug">{urgencyCopy}</p>
        <p className="text-[12px] text-slate-400 line-clamp-2 leading-relaxed flex-1 font-normal">{p.description}</p>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-[16px] font-semibold text-[#1F2937] tracking-tight">{p.price}</span>
        </div>

        {/* Quantity Picker (inline) */}
        <AnimatePresence>
          {showQtyPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-3 mt-1">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest text-center">
                  {lang === "zh" ? "选择数量" : lang === "en" ? "Select Quantity" : "Pilih Kuantiti"}
                </p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedQty(q => Math.max(1, q - 1)); }}
                    className="w-9 h-9 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[16px] transition-all cursor-pointer active:scale-95"
                  >−</button>
                  <span className="text-[20px] font-bold text-slate-900 w-8 text-center">{selectedQty}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedQty(q => q + 1); }}
                    className="w-9 h-9 rounded-full bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[16px] transition-all cursor-pointer active:scale-95"
                  >+</button>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowQtyPicker(false); }}
                    className="flex-1 text-[11px] font-medium text-slate-500 bg-white border border-slate-200 py-2.5 rounded-full transition-all cursor-pointer hover:bg-slate-50"
                  >
                    {lang === "zh" ? "取消" : lang === "en" ? "Cancel" : "Batal"}
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAdd}
                    className="flex-1 text-[11px] font-semibold text-white bg-[#1F2937] hover:bg-slate-800 py-2.5 rounded-full transition-all cursor-pointer shadow-sm active:scale-98"
                  >
                     {lang === "zh" ? `加入 ${selectedQty} 件` : lang === "en" ? (mode === "cart" ? `Add ${selectedQty} to Cart` : `Add ${selectedQty} to Quote`) : (mode === "cart" ? `Tambah ${selectedQty} ke Troli` : `Tambah ${selectedQty} ke Quote`)}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!showQtyPicker && (
          <div className="flex flex-col gap-2 mt-1">
            <button onClick={handleAddClick}
              className={`w-full text-[12px] font-semibold tracking-wider uppercase py-3 rounded-full transition-all shadow-[0_4px_12px_rgba(31,41,55,0.15)] active:scale-98 cursor-pointer ${
                added
                  ? "bg-emerald-500 text-white"
                  : "bg-[#1F2937] hover:bg-slate-800 text-white"
              }`}>
              {added ? t.addedBtn : mode === "cart" ? t.addCartBtn : t.addBtn}
            </button>
            <div className="flex gap-2">
              <button onClick={() => onSendText(`More like ${p.name}`)}
                className="flex-1 text-[11px] font-medium text-slate-650 bg-white border border-slate-205 hover:bg-slate-50 hover:border-slate-350 py-2.5 rounded-full transition-all cursor-pointer shadow-sm">
                More Like This
              </button>
              <button onClick={() => onSendText(`Checkout`)}
                className="flex-1 text-[11px] font-medium text-slate-700 bg-white border border-slate-205 hover:bg-slate-50 hover:border-slate-350 py-2.5 rounded-full transition-all cursor-pointer shadow-sm">
                Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tool Result Renderers ──────────────────────────────────────────────────

function ToolResultProductCards({ text, onAddToCart, onSendText, lang, mode = "quote" }: { text: string; onAddToCart: (product: any, quantity: number) => void; onSendText: (text: string) => void; lang: Language; mode?: "cart" | "quote" }) {
  const t = TRANSLATIONS[lang];
  let data: { summary: string; products: any[] } | null = null;
  try { data = JSON.parse(text.substring("TOOL_RESULT_PRODUCT_CARDS:".length)); } catch (e) {}

  if (!data) return (
    <div className="text-slate-500 text-[13px] p-3.5 bg-slate-50 border border-slate-200 rounded-2xl rounded-tl-[5px] shadow-sm">
      {t.errProduct}
    </div>
  );

  return (
    <div className="space-y-3 w-full">
      <div className="text-[13px] font-medium text-slate-700 leading-relaxed">{data.summary}</div>
      {data.products?.length > 0 ? (
        <div className="space-y-3">
          {data.products.map((p, idx) => (
            <ProductCard key={`result-prod-${p.name}-${idx}`} p={p} onAddToCart={onAddToCart} onSendText={onSendText} lang={lang} mode={mode} />
          ))}
        </div>
      ) : (
        <div className="text-[12px] text-slate-400 bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
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
  try { categories = JSON.parse(text.substring("TOOL_RESULT_CATEGORIES:".length)); } catch (e) {}

  if (!categories || categories.length === 0) return null;

  return (
    <div className="space-y-3 w-full">
      <div className="text-[13px] font-medium text-slate-700 leading-relaxed">Here are our product categories:</div>
      <div className="grid grid-cols-2 gap-2">
        {categories.map((cat, idx) => (
          <button
            key={`cat-res-${cat.label}-${idx}`}
            onClick={() => onSendText(cat.label)}
            className="flex items-center justify-center p-3 rounded-xl bg-white border border-slate-200 shadow-sm hover:border-amber-400 hover:bg-slate-50 transition-all text-[12px] font-bold text-slate-700"
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToolResultCheckoutCard({ text, cart, onProcessCheckout, lang }: { text: string; cart: CartItem[]; onProcessCheckout: (method: 'qr' | 'bank_transfer' | 'whatsapp', name: string, phone: string) => void; lang: Language }) {
  let data: { customer_name?: string; customer_phone?: string } | null = null;
  try { data = JSON.parse(text.substring("TOOL_RESULT_CHECKOUT_CARD:".length)); } catch (e) {}

  if (!data || !data.customer_name || !data.customer_phone) {
    return (
      <div className="text-[13px] font-medium text-slate-700 leading-relaxed">
        Please provide your name and phone number to proceed with checkout.
      </div>
    );
  }

  const grandTotal = cart.reduce((acc, item) => acc + (item.priceNum * item.quantity), 0);

  return (
    <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col p-5 w-full text-slate-800">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100/60">
        <ShoppingCart className="w-4 h-4 text-[#1F2937]" />
        <span className="text-[11px] font-semibold text-[#1F2937] uppercase tracking-wider">Checkout</span>
      </div>
      
      <div className="py-3 text-[12px] text-slate-500 space-y-1 font-medium">
        <p><strong className="text-slate-800 font-semibold">Name:</strong> {data.customer_name}</p>
        <p><strong className="text-slate-800 font-semibold">Phone:</strong> {data.customer_phone}</p>
        <p><strong className="text-slate-800 font-semibold">Total:</strong> RM {grandTotal.toFixed(2)}</p>
      </div>

      <div className="pt-2 space-y-2">
        <button onClick={() => onProcessCheckout('qr', data?.customer_name || '', data?.customer_phone || '')}
          className="w-full text-[12px] font-semibold text-white bg-[#1F2937] hover:bg-slate-800 py-3 rounded-full transition-all shadow-[0_4px_12px_rgba(31,41,55,0.15)] cursor-pointer">
          QR Payment
        </button>
        <button onClick={() => onProcessCheckout('bank_transfer', data?.customer_name || '', data?.customer_phone || '')}
          className="w-full text-[12px] font-semibold text-slate-700 bg-white/80 hover:bg-slate-50 py-3 rounded-full transition-all shadow-sm border border-slate-200 cursor-pointer">
          Bank Transfer
        </button>
        <button onClick={() => onProcessCheckout('whatsapp', data?.customer_name || '', data?.customer_phone || '')}
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
  try { data = JSON.parse(text.substring("TOOL_RESULT:".length)); } catch (e) {}

  if (!data) return null;

  return (
    <div className="space-y-3 w-full text-slate-800">
      <div className="text-[13px] font-medium text-slate-700 leading-relaxed">{data.summary}</div>
      {data.products?.length > 0 && (
        <div className="space-y-3">
          {data.products.map((p, idx) => (
            <div key={`tool-res-item-${p.name}-${idx}`} className="bg-slate-50 border border-slate-200/50 rounded-xl p-3">
              <p className="font-bold text-[12px] text-slate-900">{p.name}</p>
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
  try { data = JSON.parse(text.substring("TOOL_RESULT_QUOTE_CARD:".length)); } catch (e) {}

  if (!data) return null;

  const handleWaClick = (e: React.MouseEvent) => {
    e.preventDefault();
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "whatsapp_click", language: lang, cart: data?.items || [] })
    }).catch(() => {});
    
    let msg = `🛒 *New Lead - Golden AI*\n---------------------------\n`;
    data!.items.forEach((item) => {
      msg += `• ${item.quantity}x ${item.name} (RM ${item.price})\n`;
    });
    msg += `---------------------------\n💰 *TOTAL: RM ${data!.total_amount.toFixed(2)}*\n🌐 Language: ${lang.toUpperCase()}\n⏰ ${new Date().toLocaleString()}`;
    
    window.open(`https://wa.me/601164073143?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col p-4 w-full text-slate-800">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] font-extrabold text-slate-800 tracking-widest uppercase">Wholesale Quote</span>
      </div>
      <div className="space-y-2 py-3">
        {data.items.map((item, idx) => (
          <div key={`quote-ui-item-${item.name}-${idx}`} className="flex justify-between items-center text-[12.5px] text-slate-600">
            <span>{item.quantity}x {item.name}</span>
            <span className="font-bold text-slate-800">RM {item.price.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{t.grandTotal}</span>
        <span className="text-[16px] font-semibold text-slate-900">RM {data.total_amount.toFixed(2)}</span>
      </div>
      <div className="pt-4">
        <button onClick={handleWaClick}
          className="block w-full text-[12px] font-semibold text-white bg-[#1F2937] hover:bg-slate-800 py-3 rounded-full text-center transition-all shadow-sm cursor-pointer">
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
    whisky: "🥃 Premium Whisky",
    wine: "🍷 Fine Wine",
    beer: "🍺 Premium Beer",
    quote: "🧾 Build Quote",
    payment: "💳 Payment Options",
    contact: "📞 Talk to Sales",
    sales: "📞 Talk to Sales"
  };

  const chipsToRender = rawTags.map(tag => {
    const formatted = iconMap[tag.toLowerCase()];
    if (formatted) {
      return { label: formatted, query: tag };
    }
    return { label: `💡 ${tag}`, query: tag };
  });

  return (
    <div className="flex flex-wrap gap-2 mt-2.5 w-full">
      {chipsToRender.map((chip, idx) => (
        <button
          key={`chip-${chip.query}-${idx}`}
          onClick={() => onSelect(chip.query)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/70 backdrop-blur-md border border-slate-200/50 hover:border-slate-350 hover:bg-white transition-all text-[12px] font-medium text-slate-650 hover:text-slate-800 active:scale-95 cursor-pointer shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
        >
          <span>{chip.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Deterministic Flow Pickers ──────────────────────────────────────────────

function CategorySelector({ onSelect }: { onSelect: (category: string) => void }) {
  const categories = [
    { name: "Whisky", icon: "🥃", desc: "Premium single malts & luxury B2B brands" },
    { name: "Wine", icon: "🍷", desc: "Fine duty-free red, sparkling & white wines" },
    { name: "Beer", icon: "🍺", desc: "Imported premium lagers & craft beers" },
    { name: "Mixed Wholesale", icon: "📦", desc: "Custom mixed wholesale allocations" }
  ];

  return (
    <div className="space-y-4 w-full p-5 bg-white border border-slate-100 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest text-center">Pilih Kategori / Select Category</div>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((cat, idx) => (
          <button
            key={`cat-sel-${cat.name}-${idx}`}
            onClick={() => onSelect(cat.name)}
            className="flex flex-col items-start p-4 rounded-[20px] border border-slate-100 bg-white hover:border-slate-300 hover:shadow-sm transition-all text-left group active:scale-98 cursor-pointer"
          >
            <span className="text-3xl mb-3 group-hover:scale-105 transition-transform">{cat.icon}</span>
            <span className="text-[13px] font-semibold text-slate-800">{cat.name}</span>
            <span className="text-[10px] text-slate-400 mt-1 leading-tight font-medium">{cat.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BusinessTypeSelector({ onSelect, highlightFirst }: { onSelect: (type: string) => void; highlightFirst?: boolean }) {
  const types = [
    { name: "Restaurant / Bar", desc: "Horeca selection, premium wholesale margins", icon: "🍷" },
    { name: "Event / Party", desc: "Volume-friendly crowd favorites & quick delivery", icon: "🎉" },
    { name: "Wholesale Reseller", desc: "Best case rates, duty-free bulk logistics", icon: "📦" },
    { name: "Personal Purchase", desc: "Premium single-bottle duty-free catalog", icon: "🎁" }
  ];

  return (
    <div className="space-y-4 w-full p-5 bg-white border border-slate-100 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.02)]">
      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest text-center">Tujuan Pesanan / Usage Intent</div>
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
                  "0 0 15px rgba(212, 175, 55, 0.25)",
                  "0 0 0 rgba(212, 175, 55, 0)"
                ],
                borderColor: [
                  "rgba(241, 245, 249, 1)",
                  "rgba(212, 175, 55, 0.4)",
                  "rgba(241, 245, 249, 1)"
                ]
              } : undefined}
              transition={isHighlighted ? {
                repeat: Infinity,
                duration: 2.2,
                ease: "easeInOut"
              } : undefined}
              className={`flex flex-col items-start p-4 rounded-[20px] bg-white border border-slate-100 hover:border-slate-350 hover:bg-slate-50/50 hover:shadow-sm transition-all text-left group active:scale-98 cursor-pointer relative ${isHighlighted ? "overflow-visible" : "overflow-hidden"}`}
            >
              <span className="text-2xl mb-2 group-hover:scale-105 transition-transform">{t.icon}</span>
              <span className="text-[13px] font-semibold text-slate-800 leading-tight">{t.name}</span>
              <span className="text-[10px] text-slate-400 mt-1 leading-tight font-medium">{t.desc}</span>
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

function ProgressTracker({ step, flowType }: { step: ChatStep; flowType: FlowType }) {
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
    competitor_compare: {
      stages: ["Upload", "Compare", "Quote"],
      activeMap: {
        COMPARE_UPLOAD: 0, COMPARE_PROCESSING: 0,
        COMPARE_RESULTS: 1,
        QUOTE_RECOMMENDATION: 2, QUOTE_REVIEW: 2, QUOTE_HANDOFF: 2,
      }
    },
  };

  const config = stageConfig[flowType];
  const stages = config?.stages ?? ["Browse", "Cart", "Checkout", "Payment"];
  const activeIdx = (config?.activeMap as any)?.[step] ?? 0;

  return (
    <div className="bg-white/50 backdrop-blur-md px-6 py-2.5 border-b border-slate-100 flex items-center justify-between select-none shrink-0">
      <div className="flex items-center justify-between w-full relative">
        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-slate-100 -translate-y-1/2 z-0" />
        <div
          className="absolute top-1/2 left-0 h-[2px] bg-[#D4AF37] -translate-y-1/2 z-0 transition-all duration-500 ease-out"
          style={{ width: `${(activeIdx / Math.max(stages.length - 1, 1)) * 100}%` }}
        />
        {stages.map((stage, idx) => (
          <div key={`stage-${stage}-${idx}`} className="flex flex-col items-center relative z-10 bg-white px-2 first:pl-0 last:pr-0">
            <span className={`h-2.5 w-2.5 rounded-full border-2 transition-all duration-300 ${
              idx === activeIdx
                ? "bg-[#D4AF37] border-[#D4AF37] scale-110 shadow-[0_0_6px_rgba(212,175,55,0.4)]"
                : idx < activeIdx
                  ? "bg-[#1F2937] border-[#1F2937]"
                  : "bg-white border-slate-200"
            }`} />
            <span className={`text-[9px] tracking-wide font-medium mt-1.5 transition-colors duration-300 ${
              idx === activeIdx ? "text-[#D4AF37] font-semibold" : idx < activeIdx ? "text-slate-700" : "text-slate-400"
            }`}>
              {stage}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Quote Review View ────────────────────────────────────────────────────────

function QuoteReviewView({ cart, onBack, onCheckout, onRemove, onUpdateQty, lang, proceedLabel }: { cart: CartItem[]; onBack: () => void; onCheckout: () => void; onRemove: (name: string) => void; onUpdateQty: (name: string, qty: number) => void; lang: Language; proceedLabel?: string }) {
  const t = TRANSLATIONS[lang];
  const grandTotal = cart.reduce((acc, item) => acc + (item.priceNum * item.quantity), 0);

  return (
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-md text-slate-800 p-6 space-y-5">
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-800 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="text-[16px] font-semibold tracking-tight text-slate-900">Your Wholesale Quote</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-0">
        {cart.length > 0 ? (
          cart.map((item, idx) => (
            <div key={`cart-item-${item.name}-${idx}`} className="bg-white border border-slate-100 rounded-[20px] p-4 flex gap-4 items-center shadow-[0_4px_20px_-2px_rgba(0,0,0,0.01)]">
              {item.image_url && (
                <div className="w-12 h-12 rounded-xl bg-slate-50 overflow-hidden shrink-0 border border-slate-100">
                  <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-900 truncate">{item.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{item.price}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => onUpdateQty(item.name, Math.max(1, item.quantity - 1))} className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200/60 hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[14px]">-</button>
                <span className="text-[12px] font-semibold w-6 text-center text-slate-800">{item.quantity}</span>
                <button onClick={() => onUpdateQty(item.name, item.quantity + 1)} className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200/60 hover:bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[14px]">+</button>
              </div>
              <button onClick={() => onRemove(item.name)} className="p-2 text-rose-500 hover:bg-rose-550/10 rounded-full transition ml-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        ) : (
          <div className="h-40 flex items-center justify-center text-[12px] text-slate-400 font-medium">
            Your quote is empty. Let's find some premium options.
          </div>
        )}
      </div>

      {cart.length > 0 && (
        <div className="border-t border-slate-100 pt-4 space-y-4 shrink-0">
          <div className="flex justify-between items-center text-[12.5px] text-slate-400 font-medium">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-850">RM {grandTotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[13px] font-semibold text-slate-405 uppercase tracking-wider">Total</span>
            <span className="text-[20px] font-semibold text-slate-900">RM {grandTotal.toFixed(2)}</span>
          </div>
          <button onClick={onCheckout}
            className="w-full text-[12px] font-semibold tracking-wider uppercase text-white bg-[#1F2937] hover:bg-slate-800 py-3.5 rounded-full transition-all shadow-[0_4px_12px_rgba(31,41,55,0.15)] active:scale-98 cursor-pointer">
            {proceedLabel ?? "Proceed to Checkout"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Checkout Details View ───────────────────────────────────────────────────

function CheckoutDetailsView({ onBack, onSubmit, lang }: { onBack: () => void; onSubmit: (name: string, phone: string) => void; lang: Language }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && phone.trim()) {
      onSubmit(name, phone);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-md text-slate-800 p-6 space-y-5">
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-800 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="text-[16px] font-semibold tracking-tight text-slate-900">Wholesale Registration</h3>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col justify-between min-h-0">
        <div className="space-y-4 overflow-y-auto pr-1">
          <p className="text-[12px] text-slate-400 leading-relaxed font-normal">
            Please enter your B2B wholesale details to generate the official purchase quote and payment reference.
          </p>
          <div className="space-y-2">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Eddy Rahman"
              className="w-full bg-slate-50/50 border border-slate-200/85 rounded-xl p-3.5 text-[13px] text-slate-900 outline-none focus:bg-white focus:border-slate-350 transition shadow-inner"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">Phone Number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +60123456789"
              className="w-full bg-slate-50/50 border border-slate-200/85 rounded-xl p-3.5 text-[13px] text-slate-900 outline-none focus:bg-white focus:border-slate-350 transition shadow-inner"
            />
          </div>
        </div>

        <button type="submit"
          disabled={!name.trim() || !phone.trim()}
          className="w-full text-[12px] font-semibold tracking-wider uppercase text-white bg-[#1F2937] hover:bg-slate-800 py-3.5 rounded-full transition-all shadow-[0_4px_12px_rgba(31,41,55,0.15)] disabled:opacity-50 disabled:cursor-not-allowed mt-4 shrink-0 cursor-pointer">
          Continue to Payment
        </button>
      </form>
    </div>
  );
}

// ─── Payment Selection View ──────────────────────────────────────────────────

function PaymentSelectionView({ cart, name, phone, onBack, onProcessCheckout, lang }: { cart: CartItem[]; name: string; phone: string; onBack: () => void; onProcessCheckout: (method: 'qr' | 'bank_transfer' | 'whatsapp', name: string, phone: string) => void; lang: Language }) {
  const grandTotal = cart.reduce((acc, item) => acc + (item.priceNum * item.quantity), 0);

  return (
    <div className="flex flex-col h-full bg-[#FFFFFF]/90 backdrop-blur-md text-slate-800 p-5 space-y-6">
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-800 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h3 className="text-[16px] font-black tracking-tight text-slate-900">Select Payment Mode</h3>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto pr-1 min-h-0">
        <p className="text-[12px] text-slate-500 leading-relaxed font-medium">
          Choose your preferred method to complete payment of **RM {grandTotal.toFixed(2)}**.
        </p>

        <div className="space-y-3 pt-2">
          <button
            onClick={() => onProcessCheckout('qr', name, phone)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-400 hover:bg-white transition-all text-left shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <span className="text-[13px] font-black text-slate-800 block">DuitNow QR</span>
                <span className="text-[10px] text-slate-500">Instant validation, automatic credit</span>
              </div>
            </div>
            <span className="text-slate-400 font-bold">→</span>
          </button>

          <button
            onClick={() => onProcessCheckout('bank_transfer', name, phone)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-400 hover:bg-white transition-all text-left shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏦</span>
              <div>
                <span className="text-[13px] font-black text-slate-800 block">Bank Transfer</span>
                <span className="text-[10px] text-slate-500">Manual upload, bank transaction slip</span>
              </div>
            </div>
            <span className="text-slate-400 font-bold">→</span>
          </button>

          <button
            onClick={() => onProcessCheckout('whatsapp', name, phone)}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-emerald-50 border border-emerald-100 hover:border-emerald-300 hover:bg-white transition-all text-left shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl text-emerald-500">💬</span>
              <div>
                <span className="text-[13px] font-black text-emerald-600 block">Talk to Human Sales</span>
                <span className="text-[10px] text-emerald-500">Support chat, manual order checkout</span>
              </div>
            </div>
            <span className="text-emerald-500 font-bold">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── GreetingMenuView — Main Intent Menu ──────────────────────────────────────

function GreetingMenuView({ lang, onSelect, onTalkToSales }: { lang: Language; onSelect: (flow: Exclude<FlowType, null>) => void; onTalkToSales: () => void }) {
  const t = TRANSLATIONS[lang];
  const options = [
    { icon: "🛒", label: t.menuBrowse, desc: t.menuBrowseDesc, flow: "browse_products" as const },
    { icon: "📋", label: t.menuQuote, desc: t.menuQuoteDesc, flow: "wholesale_quote" as const },
    { icon: "📊", label: t.menuCompare, desc: t.menuCompareDesc, flow: "competitor_compare" as const },
    { icon: "💬", label: t.menuFAQ, desc: t.menuFAQDesc, flow: "ask_question" as const },
  ];
  return (
    <div className="h-full overflow-y-auto px-5 py-6 space-y-5">
      <div className="flex items-start gap-2.5">
        <AvatarBot />
        <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-[6px] px-4 py-3 shadow-sm max-w-[85%]">
          <p className="text-[13.5px] text-slate-800 leading-relaxed">{t.menuGreeting}</p>
        </div>
      </div>
      <div className="space-y-2.5 pb-4">
        {options.map((opt) => (
          <motion.button
            key={opt.flow}
            onClick={() => onSelect(opt.flow)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-300 hover:shadow-sm transition-all text-left cursor-pointer group"
          >
            <span className="text-2xl shrink-0 group-hover:scale-105 transition-transform">{opt.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-800 leading-tight">{opt.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">{opt.desc}</p>
            </div>
            <span className="text-slate-300 text-[18px] font-bold group-hover:text-slate-500 transition-colors">›</span>
          </motion.button>
        ))}
        <motion.button
          onClick={onTalkToSales}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-sm transition-all text-left cursor-pointer group"
        >
          <span className="text-2xl shrink-0 group-hover:scale-105 transition-transform">📞</span>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-emerald-700 leading-tight">{t.menuSales}</p>
            <p className="text-[11px] text-emerald-500 mt-0.5 leading-tight">{t.menuSalesDesc}</p>
          </div>
          <span className="text-emerald-300 text-[18px] font-bold group-hover:text-emerald-500 transition-colors">›</span>
        </motion.button>
      </div>
    </div>
  );
}

// ─── BrowseProductsView — Deterministic Product Grid (no LLM) ─────────────────

function BrowseProductsView({ category, storeId, onAddToCart, lang }: { category: string; storeId: string; onAddToCart: (product: any, quantity: number) => void; lang: Language }) {
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
              onSendText={() => {}}
              lang={lang}
              mode="cart"
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

// ─── CompareUploadView — Invoice Upload for Flow 3 ────────────────────────────

function CompareUploadView({ lang, onUpload, uploading }: { lang: Language; onUpload: (file: File) => void; uploading: boolean }) {
  const t = TRANSLATIONS[lang];
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 py-8 space-y-6 text-center">
      <div className="w-20 h-20 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center shadow-sm">
        <FileText className="w-9 h-9 text-[#D4AF37]" />
      </div>
      <div className="space-y-2 max-w-[280px]">
        <h3 className="text-[17px] font-semibold text-slate-900 tracking-tight">{t.compareUploadTitle}</h3>
        <p className="text-[12.5px] text-slate-400 leading-relaxed">{t.compareUploadDesc}</p>
      </div>
      <div className="w-full max-w-[280px] space-y-3">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
          }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-full bg-[#1F2937] hover:bg-slate-800 text-white text-[12px] font-semibold tracking-wider uppercase transition-all shadow-[0_4px_12px_rgba(31,41,55,0.15)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
        >
          {uploading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {lang === "zh" ? "分析中..." : lang === "en" ? "Analysing..." : "Sedang analisa..."}</>
          ) : (
            <><Paperclip className="w-4 h-4" /> {t.compareUploadBtn}</>
          )}
        </button>
        <p className="text-[10px] text-slate-400">
          {lang === "zh" ? "支持: JPG, PNG, PDF · 最大 10MB" : lang === "en" ? "Supports: JPG, PNG, PDF · Max 10MB" : "Sokongan: JPG, PNG, PDF · Maks 10MB"}
        </p>
      </div>
    </div>
  );
}

// ─── QuoteHandoffView — WA Handoff Confirmation ───────────────────────────────

function QuoteHandoffView({ lang, onBack }: { lang: Language; onBack: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-6 space-y-6 text-center">
      <div className="w-20 h-20 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shadow-sm">
        <span className="text-4xl">✅</span>
      </div>
      <div className="space-y-2">
        <h3 className="text-[17px] font-semibold text-slate-900">
          {lang === "zh" ? "报价已发送！" : lang === "en" ? "Quote Sent!" : "Sebut Harga Dihantar!"}
        </h3>
        <p className="text-[12.5px] text-slate-400 leading-relaxed max-w-[250px]">
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
          className="w-full text-[12px] font-semibold text-white bg-[#1F2937] hover:bg-slate-800 py-3.5 rounded-full transition-all cursor-pointer shadow-sm"
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
  const [isOpen, setIsOpen] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [leadContext, setLeadContext] = useState({ budget: "", preference: "", quantity: "" });
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<Language>("ms");
  const [isMobile, setIsMobile] = useState(false);
  const [currentStep, setCurrentStep] = useState<ChatStep>("START");
  const [flowType, setFlowType] = useState<FlowType>(null);
  const [browseCategory, setBrowseCategory] = useState<string>("");
  const [quoteItems, setQuoteItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // ── Customer Context — tracks everything we learn, injected into LLM
  const [customerContext, setCustomerContext] = useState<CustomerContext>(createEmptyContext());
  const [invoiceUploading, setInvoiceUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const invoiceInputRef = useRef<HTMLInputElement>(null);

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
      if (savedName) setCustomerName(savedName);
      if (savedPhone) setCustomerPhone(savedPhone);
      setOnboardingSeen(seenOnboarding === "true");
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
    try {
      localStorage.setItem("golden_ai_name", customerName);
      localStorage.setItem("golden_ai_phone", customerPhone);
    } catch (e) {}
  }, [customerName, customerPhone]);

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

  const handleProcessCheckout = async (method: 'qr' | 'bank_transfer' | 'whatsapp', customerName: string, customerPhone: string) => {
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
        throw new Error(result.error);
      }

      // Clear standard cart and local storage chatbot cart
      clearCart();
      setCart([]);
      try {
        localStorage.removeItem("golden_ai_cart");
      } catch (e) {}

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

  const handleAddToCart = (product: any, quantity: number = 1) => {
    const qty = Math.max(1, quantity);
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
      return updated;
    });
    setTimeout(() => { autoViewCart(); }, 100);
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

  const handleInvoiceUpload = useCallback(async (file: File) => {
    if (!file) return;
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];
    if (!validTypes.includes(file.type) && !file.type.startsWith("image/")) {
      toast.error("Please upload an image of your invoice (JPG, PNG, WebP)");
      return;
    }

    setInvoiceUploading(true);
    // Show upload message immediately
    const uploadingMsg: Message = {
      role: "user",
      text: `📎 ${lang === "zh" ? "上传发票" : lang === "en" ? "Uploaded invoice" : "Upload invoice"}: ${file.name}`,
    };
    setMessages(prev => [...prev, uploadingMsg]);
    // Transition to FAQ_CHAT or QUOTE_RECOMMENDATION so messages show
    if (currentStep === "START" || currentStep === "MAIN_MENU" || currentStep === "COMPARE_UPLOAD") {
      setCurrentStep("COMPARE_RESULTS");
    }

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // strip data:...;base64,
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setMessages(prev => [
          ...prev,
          {
            role: "model",
            text: data.error || (lang === "en"
              ? "Sorry, couldn't read that invoice. Please try a clearer image."
              : lang === "zh"
              ? "抱歉，无法识别该发票。请尝试更清晰的图片。"
              : "Maaf, sy tak dapat baca invoice tu. Cuba gambar yang lebih jelas ya."),
          },
        ]);
        return;
      }

      // Update customer context with invoice data
      const newCtx: CustomerContext = {
        ...customerContext,
        hasUploadedInvoice: true,
        previousSupplier: data.supplier || undefined,
        monthlySpend: data.invoiceTotal || undefined,
        invoiceData: {
          supplier: data.supplier,
          invoiceDate: data.invoiceDate,
          items: data.items || [],
          invoiceTotal: data.invoiceTotal || 0,
          potentialSavings: data.potentialSavings || 0,
        },
      };

      // Infer preferred category from invoice items
      if (data.items?.length > 0) {
        const firstItem = (data.items[0].name || "").toLowerCase();
        if (firstItem.includes("beer") || firstItem.includes("carlsberg") || firstItem.includes("heineken") || firstItem.includes("tiger")) {
          newCtx.preferredCategory = "beer";
        } else if (firstItem.includes("whisky") || firstItem.includes("whiskey") || firstItem.includes("chivas") || firstItem.includes("jack")) {
          newCtx.preferredCategory = "whisky";
        } else if (firstItem.includes("wine") || firstItem.includes("penfolds")) {
          newCtx.preferredCategory = "wine";
        }
      }

      setCustomerContext(newCtx);

      // Build the invoice result message
      const savings = data.potentialSavings || 0;
      const supplier = data.supplier || (lang === "en" ? "your supplier" : lang === "zh" ? "您的供应商" : "supplier lama");
      let invoiceMsg = "";

      if (lang === "en") {
        invoiceMsg = `📋 Invoice analysed! I found **${data.items?.length || 0} items** from ${supplier}.\n\nYour previous spend: **RM ${data.invoiceTotal?.toFixed(2) || "0.00"}**`;
        if (savings > 0) {
          invoiceMsg += `\n💰 Switching to Golden Isle saves you **RM ${savings.toFixed(2)}** (${data.savingsPercent || 0}% savings) on this same order!`;
        }
        invoiceMsg += `\n\nWant me to build you a quote with our prices?`;
      } else if (lang === "zh") {
        invoiceMsg = `📋 发票分析完成！找到来自${supplier}的 **${data.items?.length || 0} 件商品**。\n\n您之前的花费：**RM ${data.invoiceTotal?.toFixed(2) || "0.00"}**`;
        if (savings > 0) {
          invoiceMsg += `\n💰 切换到Golden Isle可节省 **RM ${savings.toFixed(2)}**（节省${data.savingsPercent || 0}%）！`;
        }
        invoiceMsg += `\n\n要我根据我们的价格为您建立报价单吗？`;
      } else {
        invoiceMsg = `📋 Invoice boss dah sy analisa! Jumpa **${data.items?.length || 0} item** dari ${supplier}.\n\nSpend boss sebelum ni: **RM ${data.invoiceTotal?.toFixed(2) || "0.00"}**`;
        if (savings > 0) {
          invoiceMsg += `\n💰 Kalau boss tukar ke Golden Isle, jimat **RM ${savings.toFixed(2)}** (${data.savingsPercent || 0}% savings) untuk order yang sama!`;
        }
        invoiceMsg += `\n\nNak sy buatkan quote dengan harga Golden Isle sekarang?`;
      }

      // Generate contextual chips based on new invoice context
      const chips = generateContextualChips(newCtx, lang);
      const chipsStr = chips.map(c => c.label).join(",");

      setMessages(prev => [
        ...prev,
        {
          role: "model",
          text: `${invoiceMsg}\nSHOW_SUGGESTIONS:${chipsStr}`,
        },
      ]);

    } catch (err) {
      console.error("Invoice upload error:", err);
      setMessages(prev => [
        ...prev,
        {
          role: "model",
          text: lang === "en"
            ? "Something went wrong analysing the invoice. Please try again."
            : lang === "zh"
            ? "分析发票时出现错误，请重试。"
            : "Ada masalah semasa analisa invoice. Cuba lagi ya.",
        },
      ]);
    } finally {
      setInvoiceUploading(false);
      if (invoiceInputRef.current) invoiceInputRef.current.value = "";
    }
  }, [customerContext, lang, currentStep]);

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
        setMessages((prev) => [...prev, { role: "model", text: data.reply! }]);
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

  const handleLanguageSelect = (selectedLang: Language) => {
    setLang(selectedLang);
    try { localStorage.setItem("golden_ai_language", selectedLang); } catch (e) {}
    
    if (messages.length === 0) {
      setMessages([{
        role: "model",
        text: selectedLang === "zh"
          ? "欢迎！Golden AI 在此为您提供高级批发服务。请从菜单中选择一项服务开始："
          : selectedLang === "en"
          ? "Welcome! Golden AI is here for your premium wholesale needs. Please select a service from the menu to start:"
          : "Selamat datang! Golden AI di sini untuk keperluan borong premium anda. Sila pilih perkhidmatan dari menu untuk mula:"
      }]);
    }

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
      case "competitor_compare":
        setCurrentStep("COMPARE_UPLOAD");
        break;
      case "ask_question":
        setCurrentStep("FAQ_CHAT");
        // Post a greeting so the chat area is non-empty
        setMessages([{
          role: "model",
          text: lang === "zh"
            ? "💬 请问您有什么问题？我只能回答与我们产品和订购相关的问题。"
            : lang === "en"
            ? "💬 What would you like to know? I can answer questions about our products, delivery, and ordering."
            : "💬 Apa yang boss nak tanya? Sy boleh bantu soalan berkaitan produk, penghantaran dan pesanan kami."
        }]);
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
    setCurrentStep("START");
    setFlowType(null);
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
    } catch (e) {}
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
      setCurrentStep("QUOTE_REVIEW");
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

    // ── LLM ROUTE (API call for genuine free text) ────────────────────────────

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

  return (
    <>
      {/* ── Floating Trigger Bubble ── */}
      <AnimatePresence>
        {!isOpen && (
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
            className="fixed bottom-6 right-4 sm:right-6 w-14 h-14 rounded-full bg-white/90 backdrop-blur-md hover:bg-white text-slate-800 flex items-center justify-center shadow-[0_8px_30px_rgba(0,0,0,0.06)] cursor-pointer border border-slate-200/80 transition-all"
          >
            <Bot className="w-6 h-6 text-[#1F2937]" />
            <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-emerald-450 border-2 border-white animate-pulse" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#D4AF37] text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
                {cart.reduce((a, c) => a + c.quantity, 0)}
              </span>
            )}
          </motion.button>
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
              background: "rgba(255, 255, 255, 0.82)",
              backdropFilter: "blur(18px)",
              border: "1px solid rgba(255, 255, 255, 0.45)",
              boxShadow: "0 24px 60px -12px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.04)"
            }}
            className={`
              fixed flex flex-col overflow-hidden text-slate-800
              ${isMobile
                // Mobile: full screen, slides up from bottom
                ? "inset-0 rounded-none bg-white"
                // Desktop: premium floating panel, larger
                : "bottom-6 right-6 w-[440px] h-[660px] rounded-[32px]"
              }
            `}
          >

            {/* ── Header ── */}
            <div className={`flex items-center justify-between shrink-0 border-b border-slate-100 bg-white/40 backdrop-blur-md ${
              isMobile ? "px-5 py-4 pt-12" : "px-6 py-4"
            }`}>
              <div className="flex items-center gap-3">
                {currentStep !== "START" ? (
                  <button
                    type="button"
                    onClick={() => {
                      switch (currentStep) {
                        case "MAIN_MENU":
                          setCurrentStep("START");
                          break;
                        case "BROWSE_CATEGORY":
                          setCurrentStep("MAIN_MENU");
                          break;
                        case "BROWSE_PRODUCTS":
                          setCurrentStep("MAIN_MENU");
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
                          break;
                        case "QUOTE_CATEGORY":
                          setCurrentStep("MAIN_MENU");
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
                          break;
                        case "COMPARE_UPLOAD":
                          setCurrentStep("MAIN_MENU");
                          break;
                        case "COMPARE_PROCESSING":
                          setCurrentStep("COMPARE_UPLOAD");
                          break;
                        case "COMPARE_RESULTS":
                          setCurrentStep("COMPARE_UPLOAD");
                          break;
                        case "FAQ_CHAT":
                          setCurrentStep("MAIN_MENU");
                          break;
                        default:
                          setIsOpen(false);
                          break;
                      }
                    }}
                    className="p-1.5 -ml-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                ) : null}
                <div className="w-9 h-9 rounded-full bg-slate-50/50 flex items-center justify-center shadow-sm border border-slate-150">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-[#1F2937] tracking-tight leading-none">Golden AI</h2>
                  <p className="text-[10px] text-slate-400 font-medium mt-1">Premium Concierge Assistant</p>
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
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50/50 active:scale-95 transition-all cursor-pointer"
                    title="Clear chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </div>
                {!isMobile && (
                  <button type="button" onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-xl text-slate-450 hover:text-slate-700 hover:bg-slate-50 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* ── Progress Tracker ── */}
            <ProgressTracker step={currentStep} flowType={flowType} />

            {/* ── Main View Dispatcher ── */}
            <div className="flex-1 min-h-0 relative">
                {currentStep === "MAIN_MENU" ? (
                  <GreetingMenuView
                    lang={lang}
                    onSelect={handleFlowSelect}
                    onTalkToSales={handleTalkToSales}
                  />
                ) : currentStep === "BROWSE_PRODUCTS" || currentStep === "BROWSE_CATEGORY" ? (
                  <BrowseProductsView
                    category={browseCategory}
                    storeId={storeId!}
                    lang={lang}
                    onAddToCart={(p, q) => handleAddToCart(p, q)}
                  />
                ) : currentStep === "COMPARE_UPLOAD" ? (
                  <CompareUploadView
                    lang={lang}
                    uploading={invoiceUploading}
                    onUpload={handleInvoiceUpload}
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
                    onSubmit={(name, phone) => {
                      setCustomerName(name);
                      setCustomerPhone(phone);
                      setCurrentStep("PAYMENT_SELECTION");
                    }}
                  />
                ) : currentStep === "PAYMENT_SELECTION" ? (
                  <PaymentSelectionView
                    cart={cart}
                    name={customerName}
                    phone={customerPhone}
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
                              <div className="w-20 h-20 rounded-full bg-slate-50/50 flex items-center justify-center shadow-sm border border-slate-150">
                                <Sparkles className="w-10 h-10 text-[#D4AF37]" />
                              </div>
                              <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-emerald-500 border-4 border-white animate-pulse" />
                            </div>

                            <div className="space-y-3 max-w-[320px]">
                              <h3 className="text-[20px] font-semibold text-slate-900 tracking-tight leading-snug">
                                {lang === "zh" ? "为活动或餐厅采购？🎯" : lang === "en" ? "Stocking up for an event or restaurant? 🎯" : "Boss nak stok untuk event atau restoran? 🎯"}
                              </h3>
                              <p className="text-[11px] font-semibold text-[#D4AF37] uppercase tracking-widest leading-none">
                                Golden AI · Premium B2B Concierge
                              </p>
                              <p className="text-[13px] text-slate-400 leading-relaxed font-normal">
                                {lang === "zh" ? "请先选择您的语言 👇" : lang === "en" ? "Please select your language first 👇" : "Pilih bahasa dulu, then sy terus recommend produk terbaik untuk boss. 👇"}
                              </p>
                            </div>

                            <div className="w-full max-w-[290px] bg-white/80 border border-slate-100 rounded-3xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.02)] space-y-4">
                              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">
                                Choose Your Language / Pilih Bahasa
                              </p>
                              <div className="flex flex-col gap-2">
                                <button type="button" onClick={() => handleLanguageSelect("en")} className="w-full py-3 px-5 rounded-full border border-slate-200/80 bg-white hover:border-slate-350 hover:bg-slate-50 text-[13px] font-semibold text-slate-800 transition-all cursor-pointer flex items-center justify-between shadow-sm active:scale-98">
                                  <span>🇬🇧 English</span><span className="text-[9px] text-[#D4AF37] font-semibold uppercase tracking-wider">Start</span>
                                </button>
                                <button type="button" onClick={() => handleLanguageSelect("ms")} className="w-full py-3 px-5 rounded-full border border-slate-200/80 bg-white hover:border-slate-350 hover:bg-slate-50 text-[13px] font-semibold text-slate-800 transition-all cursor-pointer flex items-center justify-between shadow-sm active:scale-98">
                                  <span>🇲🇾 Bahasa Melayu</span><span className="text-[9px] text-[#D4AF37] font-semibold uppercase tracking-wider">Mula</span>
                                </button>
                                <button type="button" onClick={() => handleLanguageSelect("zh")} className="w-full py-3 px-5 rounded-full border border-slate-200/80 bg-white hover:border-slate-350 hover:bg-slate-50 text-[13px] font-semibold text-slate-800 transition-all cursor-pointer flex items-center justify-between shadow-sm active:scale-98">
                                  <span>🇨🇳 中文 / 华语</span><span className="text-[9px] text-[#D4AF37] font-semibold uppercase tracking-wider">开始</span>
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
                        {(currentStep === "QUOTE_RECOMMENDATION" || currentStep === "COMPARE_RESULTS" || currentStep === "FAQ_CHAT" || currentStep === "PAYMENT_COMPLETE" || messages.length > 0) && (
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
                                    <ToolResultProductCards text={msg.text} onAddToCart={handleAddToCart} onSendText={handleSuggestionClickAndSubmit} lang={lang} />
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
                                          }).catch(() => {});
                                          
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
                                        className={`rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed whitespace-pre-wrap inline-block shadow-sm ${
                                          msg.role === "user"
                                            ? "bg-[#1F2937] text-white font-medium rounded-tr-[6px]"
                                            : "bg-white border border-slate-100 text-slate-800 rounded-tl-[6px]"
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
                                <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center shrink-0 mt-0.5 border border-slate-200">
                                  <Loader2 className="w-4 h-4 text-slate-700 animate-spin" />
                                </div>
                                <div className="flex flex-col items-start">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.botLabel}</span>
                                  <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-[6px] px-4 py-3 flex items-center gap-2.5 shadow-sm">
                                    <span className="flex gap-1">
                                      {[0, 1, 2].map((i) => (
                                        <span key={`loading-dot-${i}`} className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                                          style={{ animationDelay: `${i * 0.15}s` }} />
                                      ))}
                                    </span>
                                    <span className="text-[12px] text-slate-450 font-medium">{t.thinking}</span>
                                  </div>
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

                    {/* Floating Sticky Cart Button inside the Chat View */}
                    {cart.length > 0 && (
                      <motion.button
                        key="floating-cart-btn"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setCurrentStep("QUOTE_REVIEW")}
                        className="absolute bottom-24 right-6 z-50 flex items-center gap-2 px-4.5 py-3 rounded-full bg-[#1F2937] text-white font-semibold text-[12px] tracking-wider uppercase shadow-[0_12px_32px_rgba(0,0,0,0.12)] hover:bg-slate-800 transition-all border border-slate-700/10 cursor-pointer"
                      >
                        <ShoppingCart className="w-4 h-4 text-white" />
                        <span>Quote ({cart.reduce((a, c) => a + c.quantity, 0)})</span>
                      </motion.button>
                    )}

                    {/* ── Human Escalation Banner ── */}
                    <div className="bg-[#F8F8F8] border-t border-slate-100/50 px-6 py-2.5 flex items-center justify-between text-[11px] text-slate-500 shrink-0 select-none">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                        <span className="text-slate-400 font-medium">Need human assistance?</span>
                      </div>
                      <a
                        href="https://wa.me/601164073143?text=Hi,%20saya%20perlu%20bantuan%20dari%20tim%20sales%20untuk%20pesanan%20borong."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#1F2937] hover:text-[#D4AF37] font-semibold underline tracking-wide transition-colors uppercase text-[10px]"
                      >
                        Talk to Sales Team
                      </a>
                    </div>

                    {/* ── Input Bar ── */}
                    {messages.length > 0 && (
                      <div className={`shrink-0 border-t border-slate-100/80 bg-white/40 backdrop-blur-md ${isMobile ? "px-5 py-4 pb-8" : "px-6 py-4"}`}>
                        {/* Hidden invoice file input */}
                        <input
                          ref={invoiceInputRef}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleInvoiceUpload(file);
                          }}
                        />
                        <form onSubmit={handleChatSubmit} className="relative flex items-center gap-2">
                          {/* Upload invoice button */}
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.9 }}
                            onClick={() => invoiceInputRef.current?.click()}
                            disabled={invoiceUploading || loading}
                            title={lang === "zh" ? "上传发票" : lang === "en" ? "Upload invoice" : "Upload invoice"}
                            className="shrink-0 w-10 h-10 rounded-full bg-slate-50 border border-slate-200 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/40 text-slate-400 hover:text-[#D4AF37] flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer"
                          >
                            {invoiceUploading
                              ? <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                              : <Paperclip className="w-4 h-4" />
                            }
                          </motion.button>

                          <div className="relative flex-1">
                            <input
                              ref={inputRef}
                              type="text"
                              required
                              value={message}
                              onChange={(e) => setMessage(e.target.value)}
                              disabled={loading || invoiceUploading}
                              placeholder={t.placeholder}
                              className="w-full bg-white/90 border border-slate-200/80 text-slate-900 placeholder:text-slate-400 pl-5 pr-14 py-3.5 rounded-full outline-none focus:bg-white focus:border-slate-300 transition-all disabled:opacity-50 text-[13.5px] font-medium shadow-[0_2px_8px_rgba(0,0,0,0.02)] focus:shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
                            />
                            <motion.button
                              whileTap={{ scale: loading ? 1 : 0.9 }}
                              type="submit"
                              disabled={loading || invoiceUploading || !message.trim()}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-10 h-10 bg-[#1F2937] text-white rounded-full transition-all shadow-[0_4px_12px_rgba(31,41,55,0.15)] flex items-center justify-center cursor-pointer hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            </motion.button>
                          </div>
                        </form>
                        <p className="text-center text-[9.5px] text-slate-400 mt-3 select-none tracking-wide font-medium">
                          {lang === "en"
                            ? "📎 Upload invoice to compare savings · Golden AI · Powered by OpenAI"
                            : lang === "zh"
                            ? "📎 上传发票比较节省 · Golden AI · Powered by OpenAI"
                            : "📎 Upload invoice untuk compare savings · Golden AI · Powered by OpenAI"}
                        </p>
                      </div>
                    )}

                  </div>
                )}
              </div>

            </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
