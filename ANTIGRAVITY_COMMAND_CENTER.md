# 🚀 PANDUAN KOMANDO AI ANTIGRAVITY (TOPSCORE MISSION CONTROL)

> **Catatan Permanen Pengembang:** Simpan dokumen ini tetap terbuka di tab tengah editor saat memberikan instruksi kepada AI untuk mendapatkan hasil pengerjaan terbaik dan 100% presisi.

---

## ⚡ 1. Slash Commands Sakti (Ketik di Awal Chat)

Gunakan slash command berikut untuk mengaktifkan mode kecerdasan khusus Antigravity:

| Slash Command | Kapan Harus Digunakan? | Apa yang Terjadi? |
|---|---|---|
| **`/plan`** | **Fitur Baru & Perubahan Besar** *(Sangat Direkomendasikan)* | AI akan berhenti mengeksekusi langsung, lalu menyusun dokumen rencana kerja bertahap (*step-by-step plan*) dan meminta persetujuan Anda sebelum menyentuh kode. |
| **`/grill-me`** | **Konsep Masih Kasar / Butuh Solusi Terbaik** | AI akan bertindak sebagai Lead Architect dan mewawancarai Anda secara mendalam dengan pertanyaan-pertanyaan spesifik sampai semua keputusan desain tuntas. |
| **`/boost`** | **Bug Misterius, Rumus Rumit, & Refactoring Besar** | AI mengaktifkan mode penalaran multi-perspektif mendalam untuk membedah akar masalah tanpa menebak-nebak. |
| **`/compact`** | **Percakapan Sudah Terlalu Panjang** | AI akan meringkas memori percakapan agar konteks tetap segar, cepat, dan hemat token tanpa melupakan inti tugas. |
| **`/learn`** | **Merekam Preferensi Baru** | Menginstruksikan AI untuk mengingat aturan khusus yang Anda ajarkan agar konsisten di sesi-sesi selanjutnya. |

---

## 🎯 2. Formula Perintah Efektif (Cara Memerintah AI 95% Akurat)

### A. Gunakan Screenshot untuk Tampilan Visual
Jika ada tampilan UI yang ingin diubah (seperti tombol bergeser, teks ganda, atau warna salah), **lampirkan screenshot langsung ke chat**. AI dapat mendeteksi koordinat piksel dan elemen DOM spesifik secara instan.

### B. Perintahkan: *"Catat ke AGENTS.md"*
Jika Anda menetapkan aturan baru (misalnya rumus nilai baru atau alur verifikasi login baru), selalu katakan:
> *"Catat aturan ini ke `AGENTS.md`"*
AI akan mengunci aturan tersebut ke dalam kontrak kerja utama sehingga agen mana pun tidak akan pernah melanggarnya.

### C. Sebutkan File atau Modul Target
Menyebutkan nama file atau modul membuat AI langsung fokus ke file tersebut tanpa buang waktu mencari:
* Halaman Admin: `admin.html` / `js/admin/`
* Modul Tes & Analitik: `js/admin/tests-management.js`
* Halaman Siswa: `dashboard.html` / `test.html` / `result.html`
* Scoring & Grading: `js/grading.js` (Rule 2.10)
* Supabase Edge Functions: `supabase/functions/`

---

## 🛡️ 3. Aturan Inti TopsCore yang Tidak Boleh Dilanggar (Rule of Law)

1. **Tanpa Student ID Bisnis:** Tidak ada input atau tampilan Student ID. Identitas murni internal UUID.
2. **Alur Login Siswa:** `INSTITUTION` &rarr; `PROGRAM` &rarr; `STUDENT NAME` &rarr; `PIN`.
3. **Official Grading Scale (Rule 2.10):**
   * `★` (100% - Pure Green `#00c000ff` / `#00c000`)
   * `A` (90%–99% - Pure Green `#00c000ff` / `#00c000`)
   * `B` (80%–89% - Electric Lime `#95ff00ff`)
   * `C` (60%–79% - Pure Yellow `#FFFF00`)
   * `D` (30%–59% - Dark Orange `#FF8C00`)
   * `E` (0%–29% - Pure Red `#FF0000`)
   * *Tanpa Grade S, F, atau R! Remedial maksimal 60% (Grade C) dan simbol "R" kecil (`60%ᴿ`) HANYA muncul di samping skor persentase.*
4. **Arsitektur Tanpa Framework Backend:**
   * Murni **HTML5 + Modular ES6 JS + CSS3** di frontend.
   * Murni **Supabase PostgreSQL + Edge Functions (Deno)** di backend.
   * Dilarang memperkenalkan Django, Docker, Redis, Celery, atau Express.

---

> [!TIP]
> **Cara Menjaga Tab Ini Tetap Terbuka:**
> Klik kanan pada tab **`ANTIGRAVITY_COMMAND_CENTER.md`** di bagian atas editor &rarr; pilih **Pin Tab** (`Ctrl + K Shift + Enter`). Dengan di-pin, tab ini tidak akan pernah tertutup secara tidak sengaja.
