import { NextResponse } from "next/server";
import { matchInvoiceToCatalog } from "@/lib/catalogMatcher";
import { InvoiceItem } from "@/lib/contextBuilder";

// ─── Vision API Route ─────────────────────────────────────────────────────────
// Accepts a base64 image of an invoice/receipt.
// Uses GPT-4o Vision to extract structured invoice data.
// Then cross-references with Golden Isle catalog for savings comparison.
// One API call per invoice upload (~$0.015). Zero ongoing cost.

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const body = await req.json();
    const { imageBase64, mimeType = "image/jpeg" } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // ── Vision prompt — extract structured invoice data ───────────────────
    const visionPrompt = `You are analyzing a supplier invoice or purchase receipt for a liquor/beverage wholesale business.

Extract the following information as JSON:
{
  "supplier": "supplier company name (string or null)",
  "invoiceDate": "date in YYYY-MM-DD format (string or null)",  
  "items": [
    {
      "name": "product name",
      "quantity": number,
      "unitPrice": number (in RM, numbers only, no currency symbol),
      "total": number
    }
  ],
  "invoiceTotal": number (total amount in RM)
}

Rules:
- Extract ALL line items visible in the invoice
- If a price is in another currency, convert to RM (use approximate rate if needed)
- If quantity is not clear, use 1
- If unit price is not clear but total is, calculate unit price = total / quantity
- Return ONLY valid JSON, no explanation text
- If this is not an invoice/receipt, return: {"error": "not_invoice"}`;

    const visionResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${imageBase64}`,
                  detail: "high",
                },
              },
              {
                type: "text",
                text: visionPrompt,
              },
            ],
          },
        ],
      }),
    });

    if (!visionResponse.ok) {
      const errText = await visionResponse.text();
      console.error("Vision API error:", errText);
      return NextResponse.json(
        { error: "Vision API error: " + visionResponse.statusText },
        { status: visionResponse.status }
      );
    }

    const visionData = await visionResponse.json();
    const rawContent = visionData.choices?.[0]?.message?.content || "";

    // Parse the JSON response from Vision
    let extractedInvoice: any;
    try {
      // Strip markdown code blocks if present
      const cleaned = rawContent
        .replace(/```json\n?/gi, "")
        .replace(/```\n?/g, "")
        .trim();
      extractedInvoice = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse Vision JSON:", rawContent);
      return NextResponse.json(
        { error: "Could not parse invoice data. Please try a clearer image." },
        { status: 422 }
      );
    }

    if (extractedInvoice.error === "not_invoice") {
      return NextResponse.json(
        { error: "Image doesn't appear to be an invoice or receipt." },
        { status: 422 }
      );
    }

    const items: InvoiceItem[] = (extractedInvoice.items || []).map((item: any) => ({
      name: item.name || "Unknown Product",
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      total: Number(item.total) || 0,
      supplier: extractedInvoice.supplier,
    }));

    // ── Cross-reference with Golden Isle catalog ──────────────────────────
    const catalogMatch = await matchInvoiceToCatalog(items);

    // Build the response
    const result = {
      supplier: extractedInvoice.supplier || null,
      invoiceDate: extractedInvoice.invoiceDate || null,
      items,
      invoiceTotal: extractedInvoice.invoiceTotal || catalogMatch.totalInvoiceSpend,
      potentialSavings: catalogMatch.totalSavings,
      savingsPercent: catalogMatch.savingsPercent,
      goldenIsleTotal: catalogMatch.totalGoldenIsleSpend,
      matches: catalogMatch.matches,
    };

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("Vision route error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
