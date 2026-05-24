import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─── Supabase Product Search (server-only, service role) ─────────────────────

async function searchProducts(query: string) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Guard: if service role key not configured, return graceful fallback
    if (!url || !serviceKey) {
        console.warn("searchProducts: SUPABASE_SERVICE_ROLE_KEY not configured — skipping DB lookup.");
        return { products: [], summary: "Pangkalan data produk belum disambungkan. Sila hubungi pentadbir." };
    }

    try {
        const supabase = createClient(url, serviceKey);

        const { data, error } = await supabase
            .from('products')
            .select('name, description, price, category, image_url, stock_quantity')
            .or(`name.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`)
            .gt('stock_quantity', 0)
            .order('price', { ascending: false })
            .limit(3);

        if (error || !data?.length) {
            return { products: [], summary: "Tiada produk dijumpai." };
        }

        return {
            summary: `Jumpa ${data.length} produk untuk "${query}":`,
            products: data.map((p: {
                name: string;
                category: string;
                price: number;
                description: string;
                image_url?: string;
                stock_quantity: number;
            }) => ({
                name: p.name,
                category: p.category,
                price: `RM ${p.price}`,
                description: p.description,
                image_url: p.image_url,
                badge: p.stock_quantity < 10 ? "TERHAD" : "TERSEDIA",
                whatsapp_message: `Saya berminat dengan ${p.name} (RM ${p.price}). Boleh info lanjut?`
            }))
        };
    } catch (err) {
        console.error("searchProducts DB error:", err);
        return { products: [], summary: "Ralat semasa mencari produk. Cuba lagi." };
    }
}

async function queryProductDetails(name: string) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        console.warn("queryProductDetails: SUPABASE_SERVICE_ROLE_KEY not configured.");
        return null;
    }

    try {
        const supabase = createClient(url, serviceKey);
        const { data, error } = await supabase
            .from('products')
            .select('name, description, price, category, image_url, stock_quantity')
            .ilike('name', `%${name}%`)
            .gt('stock_quantity', 0)
            .limit(1);

        if (error || !data?.length) {
            return null;
        }

        return data[0];
    } catch (err) {
        console.error("queryProductDetails error:", err);
        return null;
    }
}

export async function POST(req: Request) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey || apiKey === "your_openai_api_key_here") {
            console.error("OPENAI_API_KEY is not defined or is placeholder in environment variables.");
            return NextResponse.json(
                { error: "OpenAI API key configuration error. Sila pastikan anda telah memasukkan key yang sah di .env.local" },
                { status: 500 }
            );
        }

        let body;
        try {
            body = await req.json();
        } catch (e) {
            return NextResponse.json(
                { error: "Invalid JSON request body" },
                { status: 400 }
            );
        }

        const { message, messages, cart: incomingCart, language = "ms" } = body;
        const cart = Array.isArray(incomingCart) ? incomingCart : [];
        
        let languageInstruction = "";
        if (language === "en") {
            languageInstruction = `## LANGUAGE & TONE
- Speak in high-end, professional, and sophisticated B2B English.
- Tone: Formal, premium, elite concierge service. Treat every client as a high-value corporate VIP.
- Persuasive Closer: Subtly guide the client to proceed with their wholesale quote draft.`;
        } else if (language === "zh") {
            languageInstruction = `## LANGUAGE & TONE
- Speak in polite, formal, and professional Business Chinese (Mandarin).
- Tone: Respectful, corporate, elite concierge service. Always address the client with respect (e.g., 您).
- Persuasive Closer: Subtly guide the client to proceed with their wholesale quote draft.`;
        } else {
            // Default: ms (Professional B2B)
            languageInstruction = `## LANGUAGE & TONE
- Speak in professional, warm, and natural Malay (B2B).
- Do NOT use exaggerated or fake Sabahan slang. Speak like a premium professional sales consultant who is polite and helpful.
- Professional & Premium: Maintain a high-quality, B2B wholesale standard. Treat every customer like a VIP.
- Persuasive Closer: Strategically nudge the client towards making a bulk purchase.`;
        }

        const systemInstructionText = `You are Golden AI, a premium B2B wholesale sales concierge for Golden Isle Wholesale (a premium duty-free liquor wholesaler in Labuan, Malaysia). Your primary goal is to provide excellent service, charm clients, and confidently close sales, while remaining strictly grounded in real product data.

${languageInstruction}

## CRITICAL RULES (DO NOT IGNORE)
1. FACTUAL INTEGRITY: You must ONLY recommend products that actually exist in the provided product catalog via tool calls. Never fabricate stock levels, pricing, or product names (no hallucinations!).
2. NO HALLUCINATIONS: If a product description is missing, vague, or contains placeholder nonsense (e.g., 'asdasd'), DO NOT invent flavor notes, tasting details, or fake features. 
3. MISSING DATA FALLBACK: If details are missing, respond honestly but cleverly. Example (if user speaks Malay): "Item ini available, tapi butiran rincinya sedang dikemas kini dalam sistem kami. Anda mahu saya simpankan stok ini untuk anda?" (Adapt the fallback response naturally to the client's language: English/Chinese).

## QUOTE BUILDER CONCIERGE FLOW (B2B)
As a premium concierge, you build Custom Quotes (Drafts) for clients.
1. ALWAYS use the 'search_products' tool when asked for product recommendations, prices, or availability.
2. RECOMMEND & CLARIFY: When recommending products, ask clarifying questions before adding to the quote. Ask about quantity needed, budget, or timeline if not provided.
3. CART AS A QUOTE DRAFT: Treat the "cart" as a "Quote Draft" (Sebut Harga Draf / 报价单草稿). 
4. Use 'add_to_cart' to add items to the quote, 'update_quantity' to change amounts, and 'remove_from_cart' to remove items. 
5. Tell the user you are preparing their Quote Draft.
6. If the user asks to see their quote or cart, use 'view_cart'.

## INTERACTIVE PAYMENT RECOMMENDATION CARD
- Whenever the client asks about payment methods, payment options, how to pay, bank details, QR payments, or payment terms, you must ALWAYS append the exact tag 'SHOW_PAYMENT_OPTIONS' at the very end of your response. This triggers an interactive payment selection card in their chat UI.
- IMPORTANT: The tag 'SHOW_PAYMENT_OPTIONS' must be at the very end of your output, with no text after it.
- If they select 'QR Payment', explain that the company will provide the DuitNow QR upon finalize of their sebut harga (quote draft).
- If they select 'Bank Transfer', display the company bank account details:
  * Bank Name: Bank Malaysia Berhad
  * Account Name: Golden Isle Wholesale
  * Account No: 123-456-789
- If they select 'FPX Online Payment', explain that they will receive a secure checkout link once they finalize their order.

## INTERACTIVE SUGGESTIONS
- To provide quick contextual actions for the user, you can append the tag 'SHOW_SUGGESTIONS:item1,item2,...' at the end of your response.
- Available suggestion tags: 'whisky', 'quote', 'cart', 'sales'.
- Example if recommending whisky: \n\nSHOW_SUGGESTIONS:whisky,quote,cart

## RESPONSE STRUCTURE
- Keep responses clean and concise (max 3 short paragraphs unless listing products).
- Use bullet points for product lists.`;

        // Format history for OpenAI
        const openAiMessages = [
            {
                role: "system",
                content: systemInstructionText
            }
        ];

        if (Array.isArray(messages)) {
            openAiMessages.push(...messages.map((m: any) => ({
                role: m.role === "model" || m.role === "assistant" ? "assistant" : "user",
                content: m.text || m.content || ""
            })));
        } else if (message && typeof message === "string") {
            openAiMessages.push({
                role: "user",
                content: message
            });
        }

        const response = await fetch(
            "https://api.openai.com/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({ 
                    model: "gpt-4o-mini",
                    messages: openAiMessages,
                    tools: [
                        {
                            type: "function",
                            function: {
                                name: "search_products",
                                description: "Cari produk arak premium dalam inventori Golden Isle Wholesale. WAJIB digunakan apabila pengguna bertanya tentang produk, harga, stok, wiski, bir, wine, rekomendasi produk, atau apa-apa barangan yang ada dijual.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        query: {
                                            type: "string",
                                            description: "Kata kunci carian produk. Contoh: 'whisky', 'beer', 'wine', 'Macallan', 'craft beer', dsb."
                                        }
                                    },
                                    required: ["query"]
                                }
                            }
                        },

                        {
                            type: "function",
                            function: {
                                name: "add_to_cart",
                                description: "Masukkan satu atau beberapa produk ke dalam troli draf (cart) pelanggan. Gunakan apabila pengguna bersetuju dengan cadangan arak atau meminta secara jelas untuk membeli/memesan kuantiti tertentu. Contoh: 'tambah 5 botol Macallan', 'saya mau order Penfolds 2 botol'.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        items: {
                                            type: "array",
                                            description: "Senarai produk dan kuantiti yang ingin dimasukkan.",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    name: {
                                                        type: "string",
                                                        description: "Nama produk yang ingin dibeli (seperti 'Macallan', 'Penfolds', 'Brandy', 'beer')."
                                                    },
                                                    quantity: {
                                                        type: "integer",
                                                        description: "Kuantiti atau bilangan botol yang ingin dipesan (minimum 1)."
                                                    }
                                                },
                                                required: ["name", "quantity"]
                                            }
                                        }
                                    },
                                    required: ["items"]
                                }
                            }
                        },
                        {
                            type: "function",
                            function: {
                                name: "remove_from_cart",
                                description: "Keluarkan atau padamkan satu atau beberapa produk daripada troli draf (cart) pelanggan. Gunakan apabila pelanggan meminta untuk membatalkan tempahan barangan tertentu.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        items: {
                                            type: "array",
                                            description: "Senarai barangan yang mahu dibuang.",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    name: {
                                                        type: "string",
                                                        description: "Nama produk yang mahu dibuang dari cart."
                                                    }
                                                },
                                                required: ["name"]
                                            }
                                        }
                                    },
                                    required: ["items"]
                                }
                            }
                        },
                        {
                            type: "function",
                            function: {
                                name: "update_quantity",
                                description: "Kemaskini (update) kuantiti untuk produk yang sudah ada dalam troli draf (cart/quote). Gunakan apabila pelanggan meminta untuk menukar jumlah pesanan bagi barangan tertentu.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        items: {
                                            type: "array",
                                            description: "Senarai barangan yang mahu ditukar kuantitinya.",
                                            items: {
                                                type: "object",
                                                properties: {
                                                    name: {
                                                        type: "string",
                                                        description: "Nama produk yang ada dalam troli."
                                                    },
                                                    quantity: {
                                                        type: "integer",
                                                        description: "Kuantiti baru."
                                                    }
                                                },
                                                required: ["name", "quantity"]
                                            }
                                        }
                                    },
                                    required: ["items"]
                                }
                            }
                        },
                        {
                            type: "function",
                            function: {
                                name: "view_cart",
                                description: "Paparkan senarai troli draf / resit draf (cart) pelanggan yang terkini. Gunakan apabila pelanggan meminta untuk menyemak pesanan mereka, bertanya 'berapa jumlah bil saya?', 'tunjuk cart saya', atau mahu proceed checkout.",
                                parameters: {
                                    type: "object",
                                    properties: {}
                                }
                            }
                        }
                    ],
                    tool_choice: "auto"
                }),
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error(`OpenAI API error (Status ${response.status}):`, errText);
            return NextResponse.json(
                { error: `OpenAI API error: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        const choiceMessage = data.choices?.[0]?.message;
        const toolCalls = choiceMessage?.tool_calls;

        // ── Tool dispatch ────────────────────────────────────────────────────

        if (toolCalls && toolCalls.length > 0) {
            const toolCall = toolCalls[0];
            const functionName = toolCall.function.name;
            let args: any = {};
            try {
                args = JSON.parse(toolCall.function.arguments || "{}");
            } catch (e) {
                console.error("Failed to parse tool call arguments:", e);
            }

            // search_products — live Supabase product lookup
            if (functionName === "search_products") {
                const query = args.query ?? "";
                const result = await searchProducts(query);
                return NextResponse.json({
                    reply: "TOOL_RESULT:" + JSON.stringify(result)
                });
            }

            const formatCartResult = (action: string, updatedCart: any[], summaryText: string) => {
                return "TOOL_RESULT:" + JSON.stringify({
                    action,
                    products: updatedCart,
                    summary: summaryText
                });
            };

            // add_to_cart — stateless cart update
            if (functionName === "add_to_cart") {
                const itemsToAdd = args.items ?? [];
                
                let updatedCart = [...cart];
                let addedCount = 0;
                let summaryList = [];

                for (const item of itemsToAdd) {
                    const dbProduct = await queryProductDetails(item.name);
                    if (dbProduct) {
                        const priceNum = Number(dbProduct.price);
                        const quantity = Number(item.quantity) || 1;
                        
                        const existingIdx = updatedCart.findIndex((c: any) => c.name.toLowerCase() === dbProduct.name.toLowerCase());
                        if (existingIdx > -1) {
                            updatedCart[existingIdx].quantity += quantity;
                            updatedCart[existingIdx].total = `RM ${(updatedCart[existingIdx].quantity * updatedCart[existingIdx].priceNum).toFixed(2)}`;
                        } else {
                            updatedCart.push({
                                name: dbProduct.name,
                                category: dbProduct.category || "Beverage",
                                price: `RM ${priceNum.toFixed(2)}`,
                                priceNum: priceNum,
                                quantity: quantity,
                                total: `RM ${(quantity * priceNum).toFixed(2)}`,
                                image_url: dbProduct.image_url,
                                whatsapp_message: `Saya berminat dengan ${dbProduct.name} (${quantity} unit, jumlah RM ${(quantity * priceNum).toFixed(2)}). Boleh proceed pesanan?`
                            });
                        }
                        addedCount += quantity;
                        summaryList.push(`${quantity}x ${dbProduct.name}`);
                    } else {
                        summaryList.push(`[Tiada Stok] ${item.name}`);
                    }
                }

                let summaryText = "";
                if (language === "en") {
                    summaryText = addedCount > 0 
                        ? `I have successfully added ${summaryList.join(", ")} to your quote draft. Here is your current quote receipt:`
                        : `I'm sorry, I couldn't find "${itemsToAdd.map((i: any)=>i.name).join(", ")}" with available stock in our inventory.`;
                } else if (language === "zh") {
                    summaryText = addedCount > 0 
                        ? `我已成功将 ${summaryList.join(", ")} 添加到您的报价单草稿中。以下是您当前的报价单明细：`
                        : `非常抱歉，在我们的库存中未找到有货的 "${itemsToAdd.map((i: any)=>i.name).join(", ")}"。`;
                } else {
                    summaryText = addedCount > 0 
                        ? `Saya sudah masukkan ${summaryList.join(", ")} ke dalam troli draf bosku. Berikut adalah resit draf ko yang terkini:`
                        : `Minta maaf bossku, saya tak jumpa produk "${itemsToAdd.map((i: any)=>i.name).join(", ")}" yang ada stok dalam inventori kita.`;
                }

                return NextResponse.json({
                    reply: formatCartResult("cart_updated", updatedCart, summaryText)
                });
            }

            // remove_from_cart — stateless cart delete
            if (functionName === "remove_from_cart") {
                const itemsToRemove = args.items ?? [];
                
                let updatedCart = [...cart];
                let removedList = [];

                for (const item of itemsToRemove) {
                    const idx = updatedCart.findIndex((c: any) => c.name.toLowerCase().includes(item.name.toLowerCase()));
                    if (idx > -1) {
                        removedList.push(updatedCart[idx].name);
                        updatedCart.splice(idx, 1);
                    }
                }

                let summaryText = "";
                if (language === "en") {
                    summaryText = removedList.length > 0 
                        ? `Perfect, I've removed ${removedList.join(", ")} from your quote draft. Here is your updated receipt:`
                        : `I couldn't find "${itemsToRemove.map((i: any)=>i.name).join(", ")}" in your quote draft.`;
                } else if (language === "zh") {
                    summaryText = removedList.length > 0 
                        ? `好的，我已从您的报价草稿中删除了 ${removedList.join(", ")}。这是您更新后的明细：`
                        : `在您的报价单草稿中未找到产品 "${itemsToRemove.map((i: any)=>i.name).join(", ")}"。`;
                } else {
                    summaryText = removedList.length > 0 
                        ? `Beres bossku, saya sudah padam ${removedList.join(", ")} dari troli draf ko. Ini resit draf terkini:`
                        : `Ehh, saya tak jumpa produk "${itemsToRemove.map((i: any)=>i.name).join(", ")}" di dalam troli draf ko sekarang.`;
                }

                return NextResponse.json({
                    reply: formatCartResult("cart_updated", updatedCart, summaryText)
                });
            }

            // update_quantity — stateless cart update
            if (functionName === "update_quantity") {
                const itemsToUpdate = args.items ?? [];
                
                let updatedCart = [...cart];
                let updatedList = [];

                for (const item of itemsToUpdate) {
                    const idx = updatedCart.findIndex((c: any) => c.name.toLowerCase().includes(item.name.toLowerCase()));
                    if (idx > -1) {
                        const quantity = Number(item.quantity) || 1;
                        updatedCart[idx].quantity = quantity;
                        updatedCart[idx].total = `RM ${(updatedCart[idx].quantity * updatedCart[idx].priceNum).toFixed(2)}`;
                        updatedList.push(`${quantity}x ${updatedCart[idx].name}`);
                    }
                }

                let summaryText = "";
                if (language === "en") {
                    summaryText = updatedList.length > 0 
                        ? `Great, I've updated the quantities to ${updatedList.join(", ")}. Here is your updated quote draft:`
                        : `I couldn't find "${itemsToUpdate.map((i: any)=>i.name).join(", ")}" in your quote draft.`;
                } else if (language === "zh") {
                    summaryText = updatedList.length > 0 
                        ? `好的，我已将数量更新为 ${updatedList.join(", ")}。这是您更新后的报价单草稿：`
                        : `在您的报价单草稿中未找到产品 "${itemsToUpdate.map((i: any)=>i.name).join(", ")}"。`;
                } else {
                    summaryText = updatedList.length > 0 
                        ? `Cantik bosku, saya dah update kuantiti jadi ${updatedList.join(", ")}. Ini draf quote terkini:`
                        : `Sori bos, saya tak jumpa produk "${itemsToUpdate.map((i: any)=>i.name).join(", ")}" dalam draf quote.`;
                }

                return NextResponse.json({
                    reply: formatCartResult("cart_updated", updatedCart, summaryText)
                });
            }

            // view_cart — stateless cart display
            if (functionName === "view_cart") {
                let summaryText = "";
                if (language === "en") {
                    summaryText = cart.length > 0
                        ? "Certainly, here are the details of your current quote draft (receipt):"
                        : "Your quote draft is currently empty. Would you like me to find some premium whiskies or beers to add?";
                } else if (language === "zh") {
                    summaryText = cart.length > 0
                        ? "好的，以下是您当前报价单（草稿）的详细信息："
                        : "您的报价单草稿目前是空的。需要我为您寻找一些高端威士忌或啤酒加入吗？";
                } else {
                    summaryText = cart.length > 0
                        ? "Baik bosku, berikut adalah butiran troli draf (resit draf) ko yang terkini:"
                        : "Troli draf ko masih kosong lagi, bossku. Mau saya carikan wiski atau beer premium untuk dimasukkan?";
                }
                
                return NextResponse.json({
                    reply: formatCartResult("cart_viewed", cart, summaryText)
                });
            }
        }

        let reply = choiceMessage?.content;

        if (!reply) {
            console.error("Unexpected OpenAI API response structure:", JSON.stringify(data));
            return NextResponse.json(
                { error: "Failed to parse reply from OpenAI API response" },
                { status: 502 }
            );
        }

        // Programmatic fail-safe for payment suggestion card
        const userQuery = (message || "").toLowerCase();
        const lastMsg = Array.isArray(messages) && messages.length > 0
            ? (messages[messages.length - 1].text || messages[messages.length - 1].content || "").toLowerCase()
            : "";
        const combinedUserText = `${userQuery} ${lastMsg}`;
        const lowercaseReply = reply.toLowerCase();

        const paymentKeywords = [
            "payment", "pay", "paying", "bank details", "bank acc", "duitnow", "fpx", "transfer", "how to pay", "kaedah pembayaran", "cara bayar", "pembayaran", "bayar", "duit now", "invoice", "receipt", "checkout",
            "付款", "支付", "转账", "汇款", "二维码", "银行"
        ];

        const userAskedPayment = paymentKeywords.some(kw => combinedUserText.includes(kw));
        const aiDiscussedPayment = paymentKeywords.some(kw => lowercaseReply.includes(kw)) &&
            (lowercaseReply.includes("bank") || lowercaseReply.includes("qr") || lowercaseReply.includes("fpx") || lowercaseReply.includes("invoice") || lowercaseReply.includes("transfer") || lowercaseReply.includes("method") || lowercaseReply.includes("bayar") || lowercaseReply.includes("pembayaran") || lowercaseReply.includes("kaedah") || lowercaseReply.includes("转账") || lowercaseReply.includes("汇款"));

        if ((userAskedPayment || aiDiscussedPayment) && !reply.includes("SHOW_PAYMENT_OPTIONS")) {
            console.log("Fail-safe: Appending SHOW_PAYMENT_OPTIONS to response.");
            reply = `${reply.trim()}\n\nSHOW_PAYMENT_OPTIONS`;
        }

        return NextResponse.json({ reply });

    } catch (error: any) {
        console.error("Chat API Route Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
