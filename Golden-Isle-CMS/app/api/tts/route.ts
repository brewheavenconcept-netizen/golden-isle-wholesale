import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text, voiceId } = await req.json();
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "ElevenLabs API Key not configured." },
        { status: 500 }
      );
    }

    if (!text) {
      return NextResponse.json(
        { error: "Text is required." },
        { status: 400 }
      );
    }

    // Default to the provided voiceId, or environment variable, or fallback to Adam (pNInz6obpgDQGcFmaJgB)
    const selectedVoiceId = voiceId || process.env.ELEVENLABS_VOICE_ID || "pNInz6obpgDQGcFmaJgB";

    // Clean up text (remove markdown elements, SHOW_SUGGESTIONS metadata, etc.)
    const cleanText = text
      .replace(/SHOW_SUGGESTIONS:(.*)/g, "") // remove suggestions line
      .replace(/TOOL_RESULT_PRODUCT_CARDS:(.*)/g, "") // remove raw json parts
      .replace(/TOOL_RESULT_QUOTE_CARD:(.*)/g, "")
      .replace(/TOOL_RESULT_CATEGORIES:(.*)/g, "")
      .replace(/TOOL_RESULT:(.*)/g, "")
      .replace(/[#*`_]/g, "") // remove basic markdown syntax
      .trim();

    if (!cleanText) {
      return NextResponse.json(
        { error: "Text is empty after cleaning." },
        { status: 400 }
      );
    }

    // Call ElevenLabs Text to Speech API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "accept": "audio/mpeg",
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.8,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs API error:", errText);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.statusText}`, details: errText },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error: any) {
    console.error("TTS API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate TTS" },
      { status: 500 }
    );
  }
}
