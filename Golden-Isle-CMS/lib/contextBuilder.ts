// ─── Customer Context Builder ─────────────────────────────────────────────────
// Tracks everything we learn about the customer during the conversation.
// Injected into LLM system prompt so every response feels personalised.
// Zero API cost — pure TypeScript state management.

export interface InvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
  supplier?: string;
  goldenIsleMatch?: {
    name: string;
    price: number;
    savings: number;
  };
}

export interface InvoiceData {
  supplier?: string;
  invoiceDate?: string;
  items: InvoiceItem[];
  invoiceTotal: number;
  potentialSavings: number;
}

export interface CustomerContext {
  // Business profile
  businessType?: "restaurant" | "bar" | "party" | "personal" | "trade" | "hotel";
  businessName?: string;
  location?: string;

  // Preferences (learned from conversation)
  preferredCategory?: string;   // "beer", "whisky", "wine", etc.
  preferredBrands?: string[];
  budgetSignal?: "budget" | "mid-range" | "premium" | "bulk";
  budgetAmount?: number;        // RM amount if stated

  // From invoice scan
  invoiceData?: InvoiceData;
  previousSupplier?: string;
  monthlySpend?: number;

  // Conversation memory (key facts extracted)
  keyFacts: string[];           // e.g. ["200 pax event", "Tawau area", "monthly reorder"]
  mentionedProducts: string[];  // products they've shown interest in
  conversationTone: "casual" | "formal" | "urgent";

  // Journey state
  hasUploadedInvoice: boolean;
  hasSeenProducts: boolean;
  hasAddedToCart: boolean;
  sessionStart: number;
}

export function createEmptyContext(): CustomerContext {
  return {
    keyFacts: [],
    mentionedProducts: [],
    conversationTone: "casual",
    hasUploadedInvoice: false,
    hasSeenProducts: false,
    hasAddedToCart: false,
    sessionStart: Date.now(),
  };
}

// Build the context string injected into the LLM system prompt
export function buildContextBlock(ctx: CustomerContext): string {
  if (ctx.keyFacts.length === 0 && !ctx.businessType && !ctx.invoiceData) {
    return ""; // No context yet, don't add noise
  }

  const lines: string[] = ["## WHAT YOU KNOW ABOUT THIS CUSTOMER"];

  if (ctx.businessType) {
    lines.push(`- Business type: ${ctx.businessType}`);
  }
  if (ctx.businessName) {
    lines.push(`- Business name: ${ctx.businessName}`);
  }
  if (ctx.location) {
    lines.push(`- Location: ${ctx.location}`);
  }
  if (ctx.preferredCategory) {
    lines.push(`- Prefers: ${ctx.preferredCategory}`);
  }
  if (ctx.preferredBrands?.length) {
    lines.push(`- Brands they like: ${ctx.preferredBrands.join(", ")}`);
  }
  if (ctx.budgetAmount) {
    lines.push(`- Budget signal: ~RM ${ctx.budgetAmount}/order`);
  } else if (ctx.budgetSignal) {
    lines.push(`- Budget tier: ${ctx.budgetSignal}`);
  }
  if (ctx.monthlySpend) {
    lines.push(`- Previous monthly spend: ~RM ${ctx.monthlySpend}`);
  }
  if (ctx.previousSupplier) {
    lines.push(`- Previous supplier: ${ctx.previousSupplier}`);
  }
  if (ctx.invoiceData) {
    lines.push(`- Uploaded invoice from: ${ctx.invoiceData.supplier || "unknown supplier"}`);
    lines.push(`- Invoice total: RM ${ctx.invoiceData.invoiceTotal}`);
    lines.push(`- Potential savings if switch to Golden Isle: RM ${ctx.invoiceData.potentialSavings}`);
    const itemNames = ctx.invoiceData.items.map(i => i.name).join(", ");
    lines.push(`- Items they usually order: ${itemNames}`);
  }
  if (ctx.mentionedProducts.length > 0) {
    lines.push(`- Products they've shown interest in: ${ctx.mentionedProducts.join(", ")}`);
  }
  if (ctx.keyFacts.length > 0) {
    lines.push(`- Key facts: ${ctx.keyFacts.join("; ")}`);
  }

  lines.push("");
  lines.push("IMPORTANT: Reference this context naturally in your responses.");
  lines.push("NEVER ask for information you already have above.");
  lines.push("Connect every suggestion back to what you know about this customer.");

  return lines.join("\n");
}

// Extract context signals from user message (TypeScript, zero API cost)
export function extractContextFromMessage(
  msg: string,
  ctx: CustomerContext
): Partial<CustomerContext> {
  const updates: Partial<CustomerContext> = {};
  const lower = msg.toLowerCase();

  // Business type signals
  if (lower.includes("restoran") || lower.includes("restaurant")) {
    updates.businessType = "restaurant";
    if (!ctx.keyFacts.includes("restaurant operator"))
      updates.keyFacts = [...ctx.keyFacts, "restaurant operator"];
  } else if (lower.includes("bar")) {
    updates.businessType = "bar";
  } else if (lower.includes("hotel")) {
    updates.businessType = "hotel";
  } else if (lower.includes("party") || lower.includes("event") || lower.includes("majlis")) {
    updates.businessType = "party";
  }

  // Budget signals
  const budgetMatch = msg.match(/rm\s*(\d+)/i);
  if (budgetMatch) {
    const amount = parseInt(budgetMatch[1]);
    updates.budgetAmount = amount;
    updates.budgetSignal = amount < 500 ? "budget" : amount < 2000 ? "mid-range" : "premium";
  }
  if (lower.includes("bulk") || lower.includes("carton") || lower.includes("10+")) {
    updates.budgetSignal = "bulk";
  }

  // Category preference
  if (lower.includes("whisky") || lower.includes("whiskey")) {
    updates.preferredCategory = "whisky";
  } else if (lower.includes("beer") || lower.includes("bir")) {
    updates.preferredCategory = "beer";
  } else if (lower.includes("wine") || lower.includes("wain")) {
    updates.preferredCategory = "wine";
  } else if (lower.includes("vodka")) {
    updates.preferredCategory = "vodka";
  } else if (lower.includes("cognac") || lower.includes("brandy")) {
    updates.preferredCategory = "cognac";
  }

  // Location
  const locationKeywords = ["tawau", "lahad datu", "sandakan", "kota kinabalu", "kl", "labuan", "kuching"];
  for (const loc of locationKeywords) {
    if (lower.includes(loc)) {
      updates.location = loc.charAt(0).toUpperCase() + loc.slice(1);
      if (!ctx.keyFacts.some(f => f.includes(loc)))
        updates.keyFacts = [...(updates.keyFacts || ctx.keyFacts), `area ${loc}`];
      break;
    }
  }

  // Pax / crowd size
  const paxMatch = msg.match(/(\d+)\s*(pax|orang|person|guests?)/i);
  if (paxMatch) {
    const pax = parseInt(paxMatch[1]);
    const fact = `${pax} pax event`;
    if (!ctx.keyFacts.includes(fact))
      updates.keyFacts = [...(updates.keyFacts || ctx.keyFacts), fact];
  }

  // Tone
  if (lower.includes("bro") || lower.includes("boss") || lower.includes("la ") || lower.includes(" la")) {
    updates.conversationTone = "casual";
  }

  return updates;
}
