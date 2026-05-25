// ─── Dynamic Chip Generator ───────────────────────────────────────────────────
// Generates contextually-relevant suggestion chips based on CustomerContext.
// Zero API cost — pure TypeScript logic.
// Every chip feels RELATED to what the customer said before.

import { CustomerContext } from "./contextBuilder";

export interface Chip {
  label: string;
  icon: string;
  query: string; // what gets sent if user clicks
  isLLMCall?: boolean; // if false, handled by TypeScript routing
}

export function generateContextualChips(
  ctx: CustomerContext,
  lang: "ms" | "en" | "zh" = "ms"
): Chip[] {
  const chips: Chip[] = [];

  // ── POST INVOICE UPLOAD chips ────────────────────────────────────────────
  if (ctx.invoiceData && ctx.invoiceData.items.length > 0) {
    const savings = ctx.invoiceData.potentialSavings;
    const supplier = ctx.invoiceData.supplier || "supplier lama";

    if (lang === "en") {
      chips.push({
        label: `🔄 Reorder same as ${supplier}`,
        icon: "🔄",
        query: `Reorder same items as my ${supplier} invoice`,
        isLLMCall: false,
      });
      if (savings > 0) {
        chips.push({
          label: `💰 Save RM${savings} — switch now`,
          icon: "💰",
          query: `Show me Golden Isle alternatives that save me RM${savings}`,
          isLLMCall: true,
        });
      }
      chips.push({
        label: `📦 Build quote from invoice`,
        icon: "📦",
        query: "Build my wholesale quote based on my uploaded invoice",
        isLLMCall: false,
      });
    } else if (lang === "zh") {
      chips.push({
        label: `🔄 按发票重新订购`,
        icon: "🔄",
        query: `按我之前的发票重新订购`,
        isLLMCall: false,
      });
      if (savings > 0) {
        chips.push({
          label: `💰 节省 RM${savings} — 立即切换`,
          icon: "💰",
          query: `显示能帮我节省RM${savings}的Golden Isle替代产品`,
          isLLMCall: true,
        });
      }
    } else {
      chips.push({
        label: `🔄 Order sama macam ${supplier}`,
        icon: "🔄",
        query: `Saya mau order item yang sama macam invoice ${supplier} saya`,
        isLLMCall: false,
      });
      if (savings > 0) {
        chips.push({
          label: `💰 Jimat RM${savings} — tukar sekarang`,
          icon: "💰",
          query: `Tunjuk alternatif Golden Isle yang jimat RM${savings} berbanding supplier lama`,
          isLLMCall: true,
        });
      }
      chips.push({
        label: `📋 Buat quote dari invoice`,
        icon: "📋",
        query: "Buat wholesale quote berdasarkan invoice yang sy upload",
        isLLMCall: false,
      });
    }
    return chips; // Invoice context — these are the most relevant
  }

  // ── BASED ON PREFERRED CATEGORY ─────────────────────────────────────────
  if (ctx.preferredCategory) {
    const cat = ctx.preferredCategory;
    const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);

    if (lang === "en") {
      chips.push({ label: `🔍 More ${catLabel} options`, icon: "🔍", query: `Show me more ${cat} options`, isLLMCall: true });
      chips.push({ label: `💰 Best ${catLabel} under my budget`, icon: "💰", query: `Best ${cat} within my budget`, isLLMCall: true });
    } else if (lang === "zh") {
      chips.push({ label: `🔍 更多${catLabel}选择`, icon: "🔍", query: `显示更多${cat}选项`, isLLMCall: true });
    } else {
      chips.push({ label: `🔍 Lagi pilihan ${catLabel}`, icon: "🔍", query: `Tunjuk lebih banyak pilihan ${cat}`, isLLMCall: true });
      chips.push({ label: `💰 ${catLabel} terbaik dalam budget`, icon: "💰", query: `${catLabel} terbaik dalam budget saya`, isLLMCall: true });
    }
  }

  // ── BASED ON BUSINESS TYPE ───────────────────────────────────────────────
  if (ctx.businessType === "restaurant" || ctx.businessType === "bar") {
    if (lang === "en") {
      chips.push({ label: "📅 Set monthly standing order", icon: "📅", query: "I want to set up a monthly standing order", isLLMCall: true });
      chips.push({ label: "📊 Horeca bulk pricing", icon: "📊", query: "What are your horeca bulk rates?", isLLMCall: true });
    } else {
      chips.push({ label: "📅 Standing order bulanan", icon: "📅", query: "Saya mau setup standing order bulanan", isLLMCall: true });
      chips.push({ label: "📊 Harga horeca borong", icon: "📊", query: "Berapa harga borong untuk restoran/bar?", isLLMCall: true });
    }
  } else if (ctx.businessType === "party") {
    const paxFact = ctx.keyFacts.find(f => f.includes("pax"));
    if (paxFact) {
      if (lang === "en") {
        chips.push({ label: `🧮 Calculate drinks for ${paxFact}`, icon: "🧮", query: `Calculate how many drinks I need for ${paxFact}`, isLLMCall: true });
      } else {
        chips.push({ label: `🧮 Kira minuman untuk ${paxFact}`, icon: "🧮", query: `Kira berapa minuman yang diperlukan untuk ${paxFact}`, isLLMCall: true });
      }
    }
    if (lang === "en") {
      chips.push({ label: "🎉 Party bundle deals", icon: "🎉", query: "Show me party bundle deals", isLLMCall: true });
    } else {
      chips.push({ label: "🎉 Bundle deal event", icon: "🎉", query: "Tunjuk bundle deal untuk event/party", isLLMCall: true });
    }
  }

  // ── BASED ON CART STATE ──────────────────────────────────────────────────
  if (ctx.hasAddedToCart && !ctx.hasSeenProducts) {
    if (lang === "en") {
      chips.push({ label: "🛒 Review my quote", icon: "🛒", query: "view cart", isLLMCall: false });
      chips.push({ label: "✅ Proceed to checkout", icon: "✅", query: "checkout", isLLMCall: false });
    } else {
      chips.push({ label: "🛒 Semak quote saya", icon: "🛒", query: "view cart", isLLMCall: false });
      chips.push({ label: "✅ Proceed checkout", icon: "✅", query: "checkout", isLLMCall: false });
    }
  }

  // ── DEFAULT DISCOVERY chips (no context yet) ─────────────────────────────
  if (chips.length === 0) {
    if (lang === "en") {
      return [
        { label: "📋 Upload my invoice", icon: "📋", query: "__TRIGGER_UPLOAD__", isLLMCall: false },
        { label: "🥃 Browse products", icon: "🥃", query: "Show me your product catalog", isLLMCall: true },
        { label: "💰 Recommend by budget", icon: "💰", query: "Recommend products based on my budget", isLLMCall: true },
        { label: "💬 Talk to sales", icon: "💬", query: "talk to sales", isLLMCall: false },
      ];
    } else if (lang === "zh") {
      return [
        { label: "📋 上传发票", icon: "📋", query: "__TRIGGER_UPLOAD__", isLLMCall: false },
        { label: "🥃 浏览产品", icon: "🥃", query: "显示产品目录", isLLMCall: true },
        { label: "💰 按预算推荐", icon: "💰", query: "根据我的预算推荐产品", isLLMCall: true },
        { label: "💬 联系销售", icon: "💬", query: "联系销售", isLLMCall: false },
      ];
    } else {
      return [
        { label: "📋 Upload invoice lama", icon: "📋", query: "__TRIGGER_UPLOAD__", isLLMCall: false },
        { label: "🥃 Browse produk", icon: "🥃", query: "Tunjuk katalog produk korang", isLLMCall: true },
        { label: "💰 Recommend ikut budget", icon: "💰", query: "Recommend produk ikut budget saya", isLLMCall: true },
        { label: "💬 Hubungi sales", icon: "💬", query: "talk to sales", isLLMCall: false },
      ];
    }
  }

  // Always add a "Talk to Sales" fallback if fewer than 3 chips
  if (chips.length < 3) {
    if (lang === "en") {
      chips.push({ label: "💬 Talk to sales", icon: "💬", query: "talk to sales", isLLMCall: false });
    } else {
      chips.push({ label: "💬 Hubungi sales", icon: "💬", query: "talk to sales", isLLMCall: false });
    }
  }

  return chips.slice(0, 4); // Max 4 chips
}
