// 🎤 VOICE COMPARISON TEST — baca key dari .env.local
// Run: node --env-file=.env.local test-voice.mjs
// Output: 1-el-adam.mp3, 6-openai-onyx.mp3, etc.

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!ELEVENLABS_API_KEY || !OPENAI_API_KEY) {
  console.error('❌ Kena run dengan: node --env-file=.env.local test-voice.mjs');
  process.exit(1);
}

const testText = "Halo bosku! Selamat datang ke Golden Isle Wholesale. KIRA sedia bantu bos cari stok minuman, suggest package, dan urus order. Hari ni bos cari apa?";

import fs from 'fs';

async function elevenLabs(label, voiceId, filename) {
  console.log(`\n🎙️  ElevenLabs [${label}]...`);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: testText,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true }
    })
  });
  if (!res.ok) { console.log(`   ❌ ${res.status} ${await res.text()}`); return; }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filename, buf);
  console.log(`   ✅ ${filename} (${(buf.length/1024).toFixed(1)} KB)`);
}

async function openAI(label, voice, filename) {
  console.log(`\n🤖 OpenAI [${label}]...`);
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'tts-1', input: testText, voice, response_format: 'mp3' })
  });
  if (!res.ok) { console.log(`   ❌ ${res.status} ${await res.text()}`); return; }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filename, buf);
  console.log(`   ✅ ${filename} (${(buf.length/1024).toFixed(1)} KB)`);
}

await elevenLabs('Adam',    'pNInz6obpgDQGcFmaJgB', '1-el-adam.mp3');
await elevenLabs('Josh',    'TxGEqnHWrfWFTfGW9XjX', '2-el-josh.mp3');
await elevenLabs('Antoni',  'ErXwobaYiN019PkySvjV', '3-el-antoni.mp3');
await elevenLabs('Callum',  'N2lVS1w4EtoT3dr4eOWO', '4-el-callum.mp3');
await openAI('Onyx',  'onyx', '5-openai-onyx.mp3');
await openAI('Echo',  'echo', '6-openai-echo.mp3');

console.log('\n✅ Done! Dengar semua & pilih mana mantap!\n');
