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

1. **Kedisiplinan Operasional (Rule 0.2 SSOT)**:
   - **Cepat (Fast & Direct)**: Eksekusi langsung ke inti tanpa seremonial/basa-basi berlebih.
   - **Cermat (Meticulous & Comprehensive)**: Periksa seluruh relasi dan dampak sistemik sebelum dan sesudah perubahan.
   - **Tepat (Precise & Aligned)**: Tepat sasaran pada kebutuhan pengguna dan taat 100% pada SSOT.
   - **Akurat (Accurate & Verified)**: Verifikasi otomatis setiap selesai mengedit (100% Green).
2. **Tanpa Student ID Bisnis (Rule 2.2)**: Tidak ada input atau tampilan Student ID. Identitas murni internal UUID.
3. **Alur Login Siswa (Rule 2.3)**: `INSTITUTION` &rarr; `PROGRAM` &rarr; `BATCH` &rarr; `STUDENT NAME` &rarr; `PIN`.
4. **Official Grading Scale (Rule 2.10 SSOT)**:
   * `★` (100% - Electric Pink `#ff2d87` / `var(--grade-star)`)
   * `A` (90%–99% - Pure Green `#00c000ff` / `#00c000` / `var(--grade-a)`)
   * `B` (80%–89% - Electric Lime `#95ff00ff` / `var(--grade-b)`)
   * `C` (60%–79% - Pure Yellow `#FFFF00` / `var(--grade-c)`) — KKM / Passing Threshold resmi
   * `D` (30%–59% - Dark Orange `#FF8C00` / `var(--grade-d)`)
   * `E` (0%–29% - Pure Red `#FF0000` / `var(--grade-e)`)
   * *Token Khusus*: `Grade R` (Remedial, capped maksimal 60%), `Grade F` (Forgiven waiver kelulusan), `Grade M` (Manual Override Admin), `Grade X` (Alumni).
5. **Arsitektur Tanpa Framework Backend**:
   * Murni **HTML5 + Modular ES6 JS + CSS3** di frontend.
   * Murni **Supabase PostgreSQL + Edge Functions (Deno)** di backend.
   * Dilarang memperkenalkan Django, Docker, Redis, Celery, atau Express.
6. **Git Commit & Push Gate (Rule 0.1)**: Mutlak DILARANG git commit atau push mandiri ("no commit until I say so!").
7. **Larangan Aksi Tanpa Permintaan (Rule 0.3 SSOT)**: DILARANG KERAS men-generate, membuat, merubah, atau menghapus berkas, kode, elemen UI, atau konfigurasi apa pun yang TIDAK diminta secara eksplisit oleh pengguna. Fokus 100% bedah masalah yang diperintahkan.

---

> [!TIP]
> **Cara Menjaga Tab Ini Tetap Terbuka:**
> Klik kanan pada tab **`ANTIGRAVITY_GUIDE.md`** di bagian atas editor &rarr; pilih **Pin Tab** (`Ctrl + K Shift + Enter`). Dengan di-pin, tab ini tidak akan pernah tertutup secara tidak sengaja.


