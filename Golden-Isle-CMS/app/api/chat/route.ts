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

        const { message, messages, cart: incomingCart } = body;
        const cart = Array.isArray(incomingCart) ? incomingCart : [];
        
        const systemInstructionText = `You are Golden AI, a premium, professional, yet witty and highly persuasive wholesale sales assistant for Golden Isle Wholesale (a premium duty-free liquor wholesaler in Labuan, Malaysia). Your primary goal is to provide excellent service, charm clients, and confidently close sales, while remaining strictly grounded in real product data.

## LANGUAGE & TONE
- Speak in casual but professional Malay (casual business).
- Inject friendly Sabahan/Malaysian slang ("bah", "ngam", "mantap", "bossku", "bro") naturally to build rapport.
- Professional & Premium: Maintain a high-quality, B2B wholesale standard. Treat every customer like a VIP.
- Witty & Charming: Inject subtle, professional humor to make the buying experience memorable.
- Persuasive Closer (The Hook): Strategically nudge the client towards making a bulk purchase. 

## CRITICAL RULES (DO NOT IGNORE)
1. FACTUAL INTEGRITY: You must ONLY recommend products that actually exist in the provided product catalog via tool calls. Never fabricate stock levels, pricing, or product names (no hallucinations!).
2. NO HALLUCINATIONS: If a product description is missing, vague, or contains placeholder nonsense (e.g., 'asdasd'), DO NOT invent flavor notes, tasting details, or fake features. 
3. MISSING DATA FALLBACK: If details are missing, respond honestly but cleverly. Example: "Item ini available bos, tapi tasting notes detail dia tengah main sorok-sorok dalam sistem kita. Nak secure stok ni dulu?"
4. CLARIFY, DON'T GUESS: If uncertain about what the customer wants, ask engaging, clarifying questions.

## TOOL CALL MANDATE
1. ALWAYS use the 'search_products' tool when asked for product recommendations, prices, or availability.
2. NEVER guess products without using the tool data.

## HYBRID WHOLESALE LOGIC
1. NORMAL BROWSING USERS: When recommending products, clearly encourage them to use the [ Add to Order ] button on the product card to draft an order, or chat with sales via WhatsApp.
2. BULK PROCUREMENT LOGIC (B2B): If the user shows bulk buying intent (e.g., hotel, restaurant, monthly supply, large quantities), DO NOT just tell them to use the cart. You MUST ask qualifying questions:
   - Business type
   - Estimated quantity
   - Budget
   - Contact name
   - WhatsApp number
   After asking, recommend they seamlessly transition to WhatsApp for a custom quote discussion.

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
                                name: "trigger_n8n",
                                description: "Gunakan tool ini apabila pengguna meminta untuk mencetuskan (trigger) automasi n8n, buat ujian webhook, atau jalankan task automasi.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        pesanan: {
                                            type: "string",
                                            description: "Mesej atau arahan yang pengguna mahu sampaikan ke sistem n8n."
                                        }
                                    },
                                    required: ["pesanan"]
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

                const summaryText = addedCount > 0 
                    ? `Saya sudah masukkan ${summaryList.join(", ")} ke dalam troli draf bosku. Berikut adalah resit draf ko yang terkini:`
                    : `Minta maaf bossku, saya tak jumpa produk "${itemsToAdd.map((i: any)=>i.name).join(", ")}" yang ada stok dalam inventori kita.`;

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

                const summaryText = removedList.length > 0 
                    ? `Beres bossku, saya sudah padam ${removedList.join(", ")} dari troli draf ko. Ini resit draf terkini:`
                    : `Ehh, saya tak jumpa produk "${itemsToRemove.map((i: any)=>i.name).join(", ")}" di dalam troli draf ko sekarang.`;

                return NextResponse.json({
                    reply: formatCartResult("cart_updated", updatedCart, summaryText)
                });
            }

            // view_cart — stateless cart display
            if (functionName === "view_cart") {
                const summaryText = cart.length > 0
                    ? "Baik bosku, berikut adalah butiran troli draf (resit draf) ko yang terkini:"
                    : "Troli draf ko masih kosong lagi, bossku. Mau saya carikan wiski atau beer premium untuk dimasukkan?";
                
                return NextResponse.json({
                    reply: formatCartResult("cart_viewed", cart, summaryText)
                });
            }

            // trigger_n8n — webhook call (unchanged)
            if (functionName === "trigger_n8n") {
                try {
                    // Call the n8n test webhook
                    const n8nRes = await fetch("http://127.0.0.1:5678/webhook-test/orb-test");
                    if (n8nRes.ok) {
                        return NextResponse.json({ reply: "🚀 **Beres bos!** Saya dah hantar isyarat ke otak n8n! Cuba check skrin n8n sekarang, mesti warna hijau!" });
                    } else {
                        return NextResponse.json({ reply: "Hmm, isyarat dihantar tapi n8n tak sedia. Pastikan dah tekan 'Execute workflow' dekat n8n tu!" });
                    }
                } catch (err) {
                    return NextResponse.json({ reply: "⚠️ **Ralat!** Tak dapat connect dengan n8n. Pastikan bro test chatbot ni di *localhost* (npm run dev), sebab Vercel tak boleh hantar data ke Localhost komputer bro." });
                }
            }
        }

        const reply = choiceMessage?.content;

        if (!reply) {
            console.error("Unexpected OpenAI API response structure:", JSON.stringify(data));
            return NextResponse.json(
                { error: "Failed to parse reply from OpenAI API response" },
                { status: 502 }
            );
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
