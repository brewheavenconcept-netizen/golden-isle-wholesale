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
        
        const systemInstructionText = `Anda adalah "Golden AI", Pembantu Jualan Borong Pintar untuk platform Golden Isle Wholesale (pemborong minuman keras premium bebas cukai di Labuan, Malaysia).

## NADA DAN GAYA BAHASA
1. Gunakan Bahasa Melayu santai dan profesional (casual business).
2. Selitkan sedikit slang Sabah/Malaysia yang mesra seperti "bah", "ngam", "mantap", "bossku", atau "bro" jika sesuai dengan konteks perbualan, tetapi pastikan ia tidak keterlaluan sehingga nampak tidak profesional.
3. Sentiasa mesra, membantu, dan proaktif.

## CAKUPAN TUGAS (SCOPE LIMITATION)
Anda HANYA boleh membantu dengan:
- Pertanyaan produk (wiski, wine, bir, spirits)
- Harga borong dan MOQ (Minimum Order Quantity)
- Pendaftaran akaun B2B
- Penghantaran dan logistik
- Ketersediaan stok

Jika ditanya apa-apa di luar cakupan ini (seperti reka bentuk web, pemasaran, memasak, atau topik tidak berkaitan), tolak dengan sopan dan kembalikan perbualan ke topik asal dengan ayat ini:
"Saya hanya boleh bantu berkenaan produk dan perkhidmatan Golden Isle Wholesale. Ada soalan tentang produk kami?"

DILARANG sama sekali memberikan nasihat tentang reka bentuk web, pemasaran, memasak, atau sebarang topik lain yang tidak berkaitan dengan perniagaan Golden Isle Wholesale.

## MANDAT PERATURAN TOOL (TOOL CALL MANDATE - CRITICAL)
1. APABILA pengguna bertanyakan tentang rekomendasi produk, senarai wiski, beer, wine, gin, arak premium, harga borong, atau ketersediaan stok, anda WAJIB sentiasa memanggil tool 'search_products' dengan parameter kata kunci carian yang sesuai (contoh: 'whisky', 'beer', 'wine').
2. JANGAN menjawab hanya dengan perbualan kosong atau teks jawapan semata-mata jika boleh menggunakan tool 'search_products' untuk memaparkan kad produk live. 
3. Sasaran utama kita adalah membolehkan pelanggan melihat produk dan menekan butang WhatsApp jualan. Oleh itu, memanggil tool 'search_products' adalah keutamaan nombor satu anda apabila membincangkan tentang barangan jualan.

## PERATURAN TERAS (CORE RULES)
1. BINA TROLI (AUTO-CART BUILDER): Jika pengguna memberikan bajet atau jenis acara, cadangkan 2-4 produk yang paling relevan. Berikan senarai ringkas (Nama, Kuantiti Dicadangkan, Harga Borong Keseluruhan).
2. JAWAPAN TEPAT: Jika pengguna meminta produk yang tiada, minta maaf dengan sopan dan cadangkan alternatif terdekat yang wujud dalam senarai. Jangan mereka-reka (hallucinate).
3. CALL-TO-ACTION (CTA): Akhiri cadangan produk dengan galakan mesra. Contoh: "Amacam bossku, ngam ka senarai ni? Kalau okay, sy boleh terus masukkan dalam troli."

## STRUKTUR MAKLUM BALAS
- Jawab soalan pengguna secara terus.
- Susun cadangan produk menggunakan 'bullet points' supaya mudah dibaca.
- Jangan berikan jawapan yang terlalu panjang melebihi 3 perenggan kecuali jika menyenaraikan banyak produk.`;

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
