import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildContextBlock } from "@/lib/contextBuilder";

async function saveLead(data: any) {
    // TODO: replace with Google Sheets webhook URL
    console.log("Saving lead to Google Sheets:", data);
}

// ─── Supabase Product Search (server-only, service role) ─────────────────────

async function searchProducts(query: string, language: string = "ms") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Guard: if service role key not configured, return graceful fallback
    if (!url || !serviceKey) {
        console.warn("searchProducts: SUPABASE_SERVICE_ROLE_KEY not configured — skipping DB lookup.");
        const summary = language === "en" ? "Product database not connected. Please contact admin." : language === "zh" ? "产品数据库未连接。请联系管理员。" : "Pangkalan data produk belum disambungkan. Sila hubungi pentadbir.";
        return { products: [], summary };
    }

    try {
        const supabase = createClient(url, serviceKey);

        const q = query.toLowerCase();
        let baseSearch = query;
        if (q.includes("whisky") || q.includes("whiskey")) baseSearch = "whisky";
        else if (q.includes("wine")) baseSearch = "wine";
        else if (q.includes("vodka")) baseSearch = "vodka";
        else if (q.includes("cognac")) baseSearch = "cognac";
        else if (q.includes("brandy")) baseSearch = "brandy";
        else if (q.includes("beer")) baseSearch = "beer";
        else baseSearch = query.split(' ')[0] || query;

        const { data, error } = await supabase
            .from('products')
            .select('name, description, price, category, image_url, stock_quantity')
            .or(`name.ilike.%${baseSearch}%,category.ilike.%${baseSearch}%,description.ilike.%${baseSearch}%`)
            .gt('stock_quantity', 0);

        if (error || !data || data.length === 0) {
            // Fallback: just return ANY top 3 available products to avoid empty states
            const { data: fallbackData } = await supabase
                .from('products')
                .select('name, description, price, category, image_url, stock_quantity')
                .gt('stock_quantity', 0)
                .order('stock_quantity', { ascending: false })
                .limit(3);
            
            if (!fallbackData || fallbackData.length === 0) {
                const emptySummary = language === "en" ? "No products found." : language === "zh" ? "未找到产品。" : "Tiada produk dijumpai.";
                return { products: [], summary: emptySummary };
            }
            
            const fallbackSummary = language === "en" ? `No exact matches for "${query}", but here are our popular products:` : language === "zh" ? `未找到 "${query}" 的确切匹配，但这里是我们的热门产品：` : `Tiada hasil tepat untuk "${query}", tapi ini adalah produk popular kami:`;
            
            return {
                summary: fallbackSummary,
                products: fallbackData.slice(0, 3).map((p: any) => ({
                    name: p.name,
                    category: p.category,
                    price: `RM ${p.price}`,
                    description: p.description,
                    image_url: p.image_url,
                    badge: p.stock_quantity < 10 ? "TERHAD" : "TERSEDIA",
                    whatsapp_message: `Saya berminat dengan ${p.name} (RM ${p.price}). Boleh info lanjut?`
                }))
            };
        }

        let rankedData = [...data];

        // Rank based on mapped intent
        if (q.includes("restaurant") || q.includes("bar")) {
            // Horeca suitable, fast movers -> Sort by price ascending (volume-friendly)
            rankedData.sort((a, b) => a.price - b.price);
        } else if (q.includes("event") || q.includes("party")) {
            // Crowd favorites -> Sort by price ascending or mid-tier
            rankedData.sort((a, b) => a.price - b.price);
        } else if (q.includes("wholesale") || q.includes("resale") || q.includes("bulk")) {
            // Best margin, reseller friendly -> Sort by stock quantity descending
            rankedData.sort((a, b) => b.stock_quantity - a.stock_quantity);
        } else if (q.includes("personal") || q.includes("gift") || q.includes("premium")) {
            // Premium, gifting -> Sort by price descending
            rankedData.sort((a, b) => b.price - a.price);
        } else {
            // Default -> sort by price descending
            rankedData.sort((a, b) => b.price - a.price);
        }

        const top3 = rankedData.slice(0, 3);
        
        const successSummary = language === "en" ? `Found ${top3.length} product(s) for "${query}":` : language === "zh" ? `为您找到 ${top3.length} 款 "${query}" 产品：` : `Jumpa ${top3.length} produk untuk "${query}":`;

        return {
            summary: successSummary,
            products: top3.map((p: any) => ({
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
        const errSummary = language === "en" ? "Error searching for products. Please try again." : language === "zh" ? "搜索产品时出错。请重试。" : "Ralat semasa mencari produk. Cuba lagi.";
        return { products: [], summary: errSummary };
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

        const { message, messages, cart: incomingCart, language = "ms", action, leadContext = {}, customerContext, flowType } = body;
        const cart = Array.isArray(incomingCart) ? incomingCart : [];

        // Task 3: Lead Capture for WhatsApp click
        if (action === "whatsapp_click") {
            await saveLead({
                action: "whatsapp_click",
                language,
                cart,
                budget: leadContext.budget || "",
                quantity: leadContext.quantity || "",
                preference: leadContext.preference || "",
                timestamp: new Date().toISOString()
            });
            return NextResponse.json({ success: true });
        }
        
        let languageInstruction = "";
        if (language === "en") {
            languageInstruction = `## LANGUAGE & TONE\n- Use casual, conversational English. Speak like a helpful local friend, not a rigid corporate consultant.`;
        } else if (language === "zh") {
            languageInstruction = `## LANGUAGE & TONE\n- Use natural, conversational Mandarin (Chinese). Friendly, warm, and direct.`;
        } else {
            // Default: ms
            languageInstruction = `## LANGUAGE & TONE\n- Gunakan bahasa Melayu santai. Boleh campur sikit slang Sabah (contoh: "bos", "ngam"). Speak like a helpful local friend.\n- Jangan terlalu skema. Elakkan ayat korporat.`;
        }
        
        // Build context block from customer session (injected by ChatWidget)
        const contextBlock = customerContext ? buildContextBlock(customerContext) : "";

        let systemInstructionText = `ROLE:
You are Golden AI, a lightning-fast, exclusive, and friendly concierge for Golden Isle Wholesale (a premium duty-free liquor supplier). 

CRITICAL CONSTRAINTS (VIOLATION IS STRICTLY FORBIDDEN):
1. LENGTH STRICT LIMIT: Maximum 3 short sentences per reply. Keep it extremely punchy and scannable.
2. NO FORMATTING: Strictly NO bullet points, NO bolding, NO markdown. Just natural chat.
3. PRICING: NEVER quote a price unless it comes directly from a tool result.
4. TONE: Be warm, persuasive, and proactive. Lead them back to your premium beverages. Never apologize like a robot.

${languageInstruction}

${contextBlock}
`;

        if (flowType === "ask_question") {
            systemInstructionText += `
CONCIERGE INQUIRY RULES:
1. Provide sophisticated, concise answers about products, shipping, delivery, and payments.
2. Even when answering questions, maintain your identity as a friendly consultant.
`;
        } else if (flowType === "wholesale_quote" || flowType === "competitor_compare") {
            systemInstructionText += `
EXECUTIVE QUOTATION RULES:
1. When a user asks for recommendations, use the 'search_products' tool to show product cards. Anticipate their needs instead of asking open-ended questions like "what is your budget?".
2. Product Cards: When returning products via 'search_products', the UI will automatically show "Add to Quote", "More Like This", and "Checkout".
3. Add to Quote: When they ask to add to quote, use the 'add_to_cart' tool.
4. Keep the conversation focused on building a premium wholesale quote smoothly.
`;
        } else {
            // General legacy flow rules
            systemInstructionText += `
CONCIERGE FLOW RULES:
1. Main Menu: When a user starts or says hello, offer these options: 'Browse Products', 'Recommend by Budget', 'Build Quote', 'Talk to Sales'.
2. Browse Products: If they ask to browse, use the 'get_categories' tool to fetch and show category buttons.
3. Category Click: Once a category is selected or mentioned, IMMEDIATELY use 'search_products' tool to show product cards. Do NOT ask open-ended questions like "what is your budget?".
4. Product Cards: When returning products via 'search_products', the UI will automatically show "Add to Quote", "More Like This", and "Checkout".
5. Add to Quote: When they ask to add to quote/cart, use the 'add_to_cart' tool.
6. Checkout: When they say checkout or pay, use the 'request_checkout' tool.
`;
        }

        systemInstructionText += `
GLOBAL RULES:
- Never hallucinate products, prices, stock, payment links, or shipping details.
- If they want to talk to a human, provide a WhatsApp link.

## PRICING GUARDRAILS
- NEVER suggest, quote, or calculate any price not returned directly from the database search tool.
- NEVER offer discounts, modify prices, or imply special rates not in the system.
- If user asks for discount: respond with "Boss, harga borong kami dah competitive. Untuk pembelian 10 karton ke atas, hubungi sales terus untuk harga khas."
- ALL prices must come from the search_products tool result only.

## FLOW GUARDRAILS  
- NEVER create, confirm, or finalise orders in text — the checkout_card UI handles this.
- NEVER process, simulate, or describe payment — the payment page handles this.
- NEVER bypass the checkout flow. If user asks to pay directly, call request_checkout tool.

## INTERACTIVE SUGGESTIONS
- Append 'SHOW_SUGGESTIONS:item1,item2,...' at the end of your response for quick contextual actions.
- Example: SHOW_SUGGESTIONS:Browse Products,Recommend by Budget,Talk to Sales`;


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
                                name: "update_lead_context",
                                description: "Save or update user's budget, product preference, and quantity requirements to memory.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        budget: { type: "string", description: "User's stated budget (e.g. 'RM500', 'under 1k')" },
                                        preference: { type: "string", description: "User's stated product preference (e.g. 'whisky', 'red wine')" },
                                        quantity: { type: "string", description: "User's stated quantity requirements (e.g. '10 bottles', '2 cartons')" }
                                    }
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
                        },
                        {
                            type: "function",
                            function: {
                                name: "get_categories",
                                description: "Dapatkan senarai kategori produk yang ada dalam kedai.",
                                parameters: {
                                    type: "object",
                                    properties: {}
                                }
                            }
                        },
                        {
                            type: "function",
                            function: {
                                name: "request_checkout",
                                description: "Panggil ini apabila pengguna sedia untuk checkout / membayar. Ia akan meminta butiran pelanggan atau terus membuka Payment Options Card jika details sudah ada.",
                                parameters: {
                                    type: "object",
                                    properties: {
                                        customer_name: { type: "string", description: "Nama pelanggan (jika ada)" },
                                        customer_phone: { type: "string", description: "Nombor telefon pelanggan (jika ada)" }
                                    }
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

            // get_categories — fetch available categories
            if (functionName === "get_categories") {
                // To keep it simple and dynamic, we just return the predefined categories or fetch from Supabase.
                // In this case, we'll return a static list that maps to what we expect in the DB.
                const categories = [
                    { label: "Whisky", value: "whisky" },
                    { label: "Wine", value: "wine" },
                    { label: "Vodka", value: "vodka" },
                    { label: "Cognac", value: "cognac" },
                    { label: "Craft Beer", value: "craft beer" }
                ];
                return NextResponse.json({
                    reply: "TOOL_RESULT_CATEGORIES:" + JSON.stringify(categories)
                });
            }

            // search_products — live Supabase product lookup
            if (functionName === "search_products") {
                const query = args.query ?? "";
                const result = await searchProducts(query, language);
                return NextResponse.json({
                    reply: "TOOL_RESULT_PRODUCT_CARDS:" + JSON.stringify(result)
                });
            }

            // request_checkout — switch to payment options
            if (functionName === "request_checkout") {
                return NextResponse.json({
                    reply: "TOOL_RESULT_CHECKOUT_CARD:" + JSON.stringify(args)
                });
            }
            if (functionName === "generate_quote_card") {
                return NextResponse.json({
                    reply: "TOOL_RESULT_QUOTE_CARD:" + JSON.stringify(args)
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

                // Lead Capture
                await saveLead({
                    action: "add_to_cart",
                    language,
                    cart: updatedCart,
                    budget: leadContext.budget || "",
                    quantity: leadContext.quantity || "",
                    preference: leadContext.preference || "",
                    timestamp: new Date().toISOString()
                });

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

            if (functionName === "update_lead_context") {
                let summaryText = "";
                if (language === "en") summaryText = "I have noted your preferences. How else can I assist you?";
                else if (language === "zh") summaryText = "我已经记录了您的需求。还有什么可以帮您的吗？";
                else summaryText = "Noted bosku! Ada apa-apa lagi yang saya boleh tolong?";

                return NextResponse.json({
                    reply: `TOOL_RESULT:{"action":"context_updated","data":${JSON.stringify(args)},"summary":"${summaryText}"}`
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
        return NextResponse.json({ reply });

    } catch (error: any) {
        console.error("Chat API Route Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
