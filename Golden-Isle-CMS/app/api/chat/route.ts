import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("GEMINI_API_KEY is not defined in environment variables.");
            return NextResponse.json(
                { error: "API key configuration error" },
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

        const { message, messages } = body;
        
        let contents = [];
        if (Array.isArray(messages)) {
            contents = messages.map((m: any) => ({
                role: m.role === "model" || m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.text || m.content || "" }]
            }));
        } else if (message && typeof message === "string") {
            contents = [
                {
                    role: "user",
                    parts: [{ text: message }]
                }
            ];
        } else {
            return NextResponse.json(
                { error: "Either 'message' or 'messages' array is required" },
                { status: 400 }
            );
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    contents,
                    systemInstruction: {
                        parts: [{ 
                            text: "Kau adalah ORB AI, pembantu digital rasmi untuk Ekosistem ORB (Orb Automasi, Orb Wallet, dan Marketplace Aircon). Gunakan bahasa Melayu Sabah yang santai, mesra, dan profesional. Jangan jawab skema sangat macam robot. Fokus tulung customer atau developer yang mahu setup automasi atau servis aircond." 
                        }]
                    }
                }),
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error(`Gemini API error (Status ${response.status}):`, errText);
            return NextResponse.json(
                { error: `Gemini API error: ${response.statusText}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!reply) {
            console.error("Unexpected Gemini API response structure:", JSON.stringify(data));
            return NextResponse.json(
                { error: "Failed to parse reply from Gemini API response" },
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
