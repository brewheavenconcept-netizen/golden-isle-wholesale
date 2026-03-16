import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const { pin } = await req.json();
    const adminPin = process.env.ADMIN_PIN;

    if (!adminPin) {
        return NextResponse.json({ success: false }, { status: 500 });
    }

    if (pin === adminPin) {
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false }, { status: 401 });
}
