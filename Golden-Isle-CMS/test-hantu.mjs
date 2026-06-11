// 👻 GHOST SALESMAN TEST - VERSI PONTIANAK
// Run: node --env-file=.env.local test-hantu.mjs
// Output: 3-hantu-bella.mp3, 4-hantu-elli.mp3

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  console.error('❌ Kena run dengan: node --env-file=.env.local test-hantu.mjs');
  process.exit(1);
}

// Skrip Pontianak Marketing! 👻🍻
const textHantu = "Hihihihi... bang... tak nak beli beer dengan saya ke bang... saya sejuk ni kat luar... hihihi... beli lah Corona extra satu kotak bang... kalau tak beli... malam ni saya temankan abang tidur... hihihihi!";

import fs from 'fs';

async function generateHantuVoice(label, voiceId, filename) {
  console.log(`\n👻 ElevenLabs [${label}] sedang merasuk...`);
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: textHantu,
      model_id: "eleven_multilingual_v2",
      voice_settings: { 
        stability: 0.1, // Rendahkan stability untuk suara gila/unstable
        similarity_boost: 0.9, 
        style: 0.8, // Emosi lebih
        use_speaker_boost: true 
      }
    })
  });
  
  if (!res.ok) { 
    console.log(`   ❌ Gagal: ${res.status} ${await res.text()}`); 
    return; 
  }
  
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filename, buf);
  console.log(`   ✅ Selesai merasuk: ${filename} (${(buf.length/1024).toFixed(1)} KB)`);
}

// Gunakan suara default perempuan (Free Plan Friendly)
await generateHantuVoice('Pontianak Bella', 'EXAVITQu4vr4xnSDxMaL', '3-hantu-bella.mp3');
await generateHantuVoice('Pontianak Elli', 'MF3mGyEYCl7XYWbV9V6O', '4-hantu-elli.mp3');

console.log('\n👻 Selesai! Dengar MP3 tu cepat bang... hihihihi...\n');
