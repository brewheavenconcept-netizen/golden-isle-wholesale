// 🧪 TEST VOICE APIs - Run: node test-voice.mjs
import fs from 'fs';
import path from 'path';

const ELEVENLABS_API_KEY = 'sk_a1060de25c4dc22273223a16c6f10dc398f37f3659dd3530';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''; // bos letak key OpenAI kalau ada

const testText = "Halo bosku! Ini suara test KIRA dari Golden Isle. Mantap tak?";

// ─── TEST 1: ElevenLabs ───────────────────────────────────────────────
async function testElevenLabs() {
  console.log('\n🎤 Testing ElevenLabs...');
  try {
    const res = await fetch('https://api.elevenlabs.io/v1/text-to-speech/pNInz6obpgDQGcFmaJgB?output_format=mp3_44100_128', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: testText,
        model_id: "eleven_multilingual_v2",
      })
    });

    console.log(`   Status: ${res.status} ${res.statusText}`);
    if (!res.ok) {
      const err = await res.text();
      console.log(`   ❌ FAILED: ${err}`);
      return;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync('test-elevenlabs.mp3', buf);
    console.log(`   ✅ SUCCESS! File saved: test-elevenlabs.mp3 (${buf.length} bytes)`);
  } catch (e) {
    console.log(`   ❌ ERROR: ${e.message}`);
  }
}

// ─── TEST 2: OpenAI TTS ───────────────────────────────────────────────
async function testOpenAI() {
  if (!OPENAI_API_KEY) {
    console.log('\n⚠️  OpenAI key not set, skip.');
    return;
  }
  console.log('\n🤖 Testing OpenAI TTS...');
  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: testText,
        voice: 'onyx',
        response_format: 'mp3',
      })
    });

    console.log(`   Status: ${res.status} ${res.statusText}`);
    if (!res.ok) {
      const err = await res.text();
      console.log(`   ❌ FAILED: ${err}`);
      return;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync('test-openai.mp3', buf);
    console.log(`   ✅ SUCCESS! File saved: test-openai.mp3 (${buf.length} bytes)`);
  } catch (e) {
    console.log(`   ❌ ERROR: ${e.message}`);
  }
}

// ─── RUN ──────────────────────────────────────────────────────────────
await testElevenLabs();
await testOpenAI();
console.log('\nDone! Buka file .mp3 tu untuk dengar suara.\n');
