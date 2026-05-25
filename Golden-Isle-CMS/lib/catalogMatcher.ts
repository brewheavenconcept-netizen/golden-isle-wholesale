// ─── Catalog Matcher ──────────────────────────────────────────────────────────
// Cross-references extracted invoice items against Golden Isle catalog via Supabase.
// Returns matched products + savings calculation.
// Called once after invoice scan — zero ongoing API cost.

import { createClient } from "@supabase/supabase-js";
import { InvoiceItem } from "./contextBuilder";

export interface MatchedItem {
  invoiceItem: InvoiceItem;
  goldenIsleProduct?: {
    name: string;
    price: number;
    category: string;
    image_url?: string;
    badge: string;
  };
  savings?: number; // per unit savings
  totalSavings?: number; // savings × quantity
}

export interface CatalogMatchResult {
  matches: MatchedItem[];
  totalInvoiceSpend: number;
  totalGoldenIsleSpend: number;
  totalSavings: number;
  savingsPercent: number;
}

export async function matchInvoiceToCatalog(
  items: InvoiceItem[]
): Promise<CatalogMatchResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const matches: MatchedItem[] = [];
  let totalGoldenIsleSpend = 0;
  const totalInvoiceSpend = items.reduce(
    (sum, i) => sum + i.unitPrice * i.quantity,
    0
  );

  if (!url || !serviceKey) {
    // No DB — return unmatched items
    return {
      matches: items.map((i) => ({ invoiceItem: i })),
      totalInvoiceSpend,
      totalGoldenIsleSpend: totalInvoiceSpend,
      totalSavings: 0,
      savingsPercent: 0,
    };
  }

  const supabase = createClient(url, serviceKey);

  for (const item of items) {
    // Build search terms from invoice item name
    const searchTerm = item.name
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .split(" ")
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .join(" ");

    const { data } = await supabase
      .from("products")
      .select("name, price, category, image_url, stock_quantity")
      .or(
        `name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`
      )
      .gt("stock_quantity", 0)
      .limit(1);

    if (data && data.length > 0) {
      const match = data[0];
      const savingsPerUnit = item.unitPrice - match.price;
      const totalSavings = savingsPerUnit * item.quantity;

      matches.push({
        invoiceItem: item,
        goldenIsleProduct: {
          name: match.name,
          price: match.price,
          category: match.category,
          image_url: match.image_url,
          badge: match.stock_quantity < 10 ? "TERHAD" : "TERSEDIA",
        },
        savings: savingsPerUnit,
        totalSavings,
      });

      totalGoldenIsleSpend += match.price * item.quantity;
    } else {
      // No match — use invoice price as baseline
      matches.push({ invoiceItem: item });
      totalGoldenIsleSpend += item.unitPrice * item.quantity;
    }
  }

  const totalSavings = totalInvoiceSpend - totalGoldenIsleSpend;
  const savingsPercent =
    totalInvoiceSpend > 0
      ? Math.round((totalSavings / totalInvoiceSpend) * 100)
      : 0;

  return {
    matches,
    totalInvoiceSpend,
    totalGoldenIsleSpend,
    totalSavings: Math.max(0, totalSavings),
    savingsPercent: Math.max(0, savingsPercent),
  };
}
