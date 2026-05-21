# Panduan & Roadmap Chatbot Gemini (Untuk Freelance & Rujukan Masa Depan)

Dokumen ini mengandungi langkah-langkah teknikal dan penyelesaian masalah (*troubleshooting*) yang telah kita lakukan untuk membina **Sembang Multi-Turn Gemini AI** di dalam projek Next.js. Nota ini sangat berguna untuk projek freelance akan datang.

---

## 🗺️ Roadmap Pemasangan Chatbot (Next.js + Gemini)

Proses pembinaan chatbot terbahagi kepada 3 fasa utama:

### Fasa 1: Penyediaan Kunci API (API Key)
1. Layari [Google AI Studio](https://aistudio.google.com/).
2. Buat API Key baru. *Penting: Sila rujuk bahagian "Isu Mengelirukan (Ralat 403)" di bawah untuk mengetahui cara mengelakkan ralat sekatan.*
3. Salin API Key tersebut dan simpan dalam fail `.env.local` projek Next.js anda:
   ```env
   GEMINI_API_KEY=AIzaSyCtb2-GhdXp5jzmzUITbAfp5rSwTuKz6EA
   ```

### Fasa 2: Pembangunan Backend (API Route)
Kami membina API Endpoint di Next.js menggunakan fail `app/api/chat/route.ts`. API ini menerima sejarah perbualan daripada frontend dan memanggil Gemini API secara langsung menggunakan native `fetch`.

**Logik Utama di Backend:**
* Menerima tatasusunan (`array`) sejarah mesej daripada client.
* Memetakan (`map`) peranan mesej mengikut format Gemini: `user` (pengguna) dan `model` (AI).
* Menyuntik **System Instruction** (Watak/Karakter AI) untuk menentukan personaliti bot.
* Melakukan `fetch` ke endpoint Gemini:
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

### Fasa 3: Pembangunan Frontend (UI/UX)
Kami membina UI sembang yang responsif dan premium menggunakan Tailwind CSS, Framer Motion, dan Lucide Icons di `app/chatbot/page.tsx`.

**Ciri-ciri Utama UI:**
* **Chat History Rendering**: Memetakan tatasusunan `messages` untuk memaparkan gelembung sembang (*chat bubbles*) berselang-seli (kiri untuk AI, kanan untuk User).
* **Framer Motion**: Animasi kemas semasa mesej baru masuk.
* **Auto-Scroll**: Menggunakan `useRef` dan `useEffect` untuk scroll ke bawah secara automatik setiap kali senarai mesej berubah.
* **Clear Chat**: Butang untuk mengosongkan state `messages` dan memulakan perbualan baru.

---

## ⚠️ Ringkasan Bahagian Mengelirukan: Ralat 403 & Seting Google Cloud

Apabila anda membuat API Key untuk Gemini, anda akan selalu terjumpa masalah **Ralat 403 Forbidden**. Ini adalah bahagian yang paling mengelirukan bagi developer baru.

### Kenapa Ralat 403 Berlaku?
1. **Google Cloud Project (GCP) Tersekat**: Setiap Kunci API Gemini mestilah berada di bawah satu Projek Google Cloud. Jika projek GCP tersebut telah disekat (kerana isu polisi, akaun digantung, atau tetapan billing yang rosak), maka semua API Key di bawah projek itu akan mendapat ralat `403 Forbidden`.
2. **Sekatan Geografi**: Sesetengah negara tidak disokong oleh model tertentu di bawah pelan percuma.

### Cara Penyelesaian Paling Bersih (Free Tier AI Studio):
Apabila anda mahu membina projek freelance dengan kos RM0 (Free Tier):

1. **Buat Projek Baru yang Fresh**:
   * Jangan guna projek GCP lama yang pernah ada ralat.
   * Di dalam **Google AI Studio**, semasa mahu membuat API key, pilih **"Create API key in new project"** (Buat kunci API dalam projek baru). 
   * AI Studio akan secara automatik mencipta projek Google Cloud yang bersih di belakang tabir.
2. **Had Kadar Pelan Percuma (Free Tier Limits)**:
   * **Model Gemini 2.5 Flash / 1.5 Flash** mempunyai Free Tier yang sangat murah hati:
     * **15 RPM** (Requests Per Minute - Mesej seminit)
     * **1,500 RPD** (Requests Per Day - Mesej sehari)
     * **1 Million Page/Tokens Per Minute**
   * Ini lebih daripada cukup untuk fasa pembangunan (*development*) dan demo kepada klien freelance anda tanpa perlu memasukkan kad kredit atau setup *prepay/billing*!
3. **Bila Perlu Bayar (Pay-as-you-go / Prepay)?**
   * Apabila projek freelance anda sedia untuk dilancarkan ke pasaran sebenar (*production*) dan jangkaan trafik melebihi 15 mesej seminit, anda perlu pergi ke Google Cloud Console projek tersebut dan aktifkan **Billing** (Pay-as-you-go). Kadar bayaran Gemini adalah sangat murah berbanding pesaing lain (dikira mengikut jumlah token input/output).

---

## 🚀 Tips Tambahan untuk Freelance
* **Guna Native Fetch**: Tidak perlu bergantung kepada SDK rasmi Google `@google/generative-ai` melainkan anda memerlukan feature yang sangat kompleks. Native `fetch` mengurangkan saiz bundle aplikasi anda dan sangat mudah disesuaikan untuk berjalan di Next.js Edge Runtime.
* **Simpan API Key dengan Selamat**: Pastikan `.env.local` dimasukkan dalam `.gitignore`. Jangan sesekali melakukan commit API Key anda ke GitHub awam!
