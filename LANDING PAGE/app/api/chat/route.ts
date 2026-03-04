import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Forward to n8n webhook
        const n8nResponse = await fetch("http://localhost:5678/webhook/orb-marketplace", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
        });

        if (!n8nResponse.ok) {
            throw new Error(`n8n error: ${n8nResponse.statusText}`);
        }

        const data = await n8nResponse.json();
        return NextResponse.json(data);

    } catch (error) {
        console.error("Proxy Error:", error);
        return NextResponse.json(
            { error: "Failed to connect to Orb Marketplace backend" },
            { status: 500 }
        );
    }
}
