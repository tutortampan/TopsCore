# 20261113 — Student Education Timeline Auto-Estimation, Camera-Only Photo & Profile Drawer Redesign Plan

> **Scope:** Student Onboarding (`dashboard.html`), Photo Capture (`#photo-setup-modal`), Education Calculation (`#education-setup-modal`), Student Profile Drawer (`#profile-modal`), Flashcard Evaluation (`#flashcard-modal`), dan Klarifikasi Pop-Up Ruang Ujian (`#matrix-popup` vs `#anti-cheat-modal`).
> **Goal:** Menyederhanakan alur orientasi siswa dengan estimasi otomatis tahun lulus TK–S3 berbasis tanggal lahir, meniadakan unggah file foto demi kamera langsung, membatasi hak ubah foto berbasis kelulusan ujian, mengunci data diri (Gender, DOB, Nama) di Student Drawer hanya untuk Admin, serta memberikan transparansi mengenai fitur Flashcard.

---

## 🎯 1. Klarifikasi Pop-Up #4 vs #5 (Penyebab Tampilan Sama Sebelumnya)

Sebelumnya Anda mencatat bahwa pop-up nomor 4 dan 5 terlihat sama pada katalog. 
**Penyebab Teknis:**
Pada skrip penangkap layar sebelumnya, elemen `#matrix-popup` menggunakan aturan CSS `display: none` alih-alih kelas `.hidden`. Ketika skrip mencoba membuka Matrix Popup, modal briefing `#pre-exam-focus-modal` masih aktif di latar belakang sehingga tangkapan layar nomor 4 secara keliru memotret ulang Pre-Exam Focus Modal.

Masalah tersebut **telah diperbaiki**. Berikut adalah perbedaan nyata kedua pop-up tersebut:

| No | Nama Pop-Up | Target ID | Screenshot Asli | Fungsi & Perbedaan |
| :---: | :--- | :--- | :---: | :--- |
| **04** | **Question Matrix Popup** | `#matrix-popup` | ![Question Matrix](C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_04_test_question_matrix.png) | **Navigasi Soal:** Berisi kisi 40 kotak nomor soal (8 kolom × 5 baris), indikator warna (Biru = sedang dikerjakan, Hijau = terjawab, Abu-abu = kosong), dan tombol *JUMP TO NEXT UNANSWERED*. Muncul saat siswa mengetuk penghitung soal. |
| **05** | **Anti-Cheat Warning Modal** | `#anti-cheat-modal` | *(Layar Peringatan Silau)* | **Keamanan Ujian:** Layar penuh merah/kuning menyala dengan hitung mundur darurat. Muncul otomatis hanya jika siswa mencoba berpindah tab atau keluar dari mode layar penuh (*fullscreen*). |

---

## 💡 2. Penjelasan Fitur Flashcard & Opsi Pembuangan

> [!NOTE]
> Anda menanyakan: *"Lalu ada flash card, apa itu? Saya tidak pernah minta, jelaskan! Kalau saya tidak setuju, saya akan buang."*

### Apa itu Flashcard di TopsCore?
- **Asal Usul:** Fitur Flashcard (`#flashcard-modal`) dibuat pada fase pengembangan terdahulu sebagai alat retensi belajar (*learning retention*).
- **Cara Kerja:** Setiap kali siswa menyelesaikan ujian atau latihan dan ada butir soal kosakata yang **salah dijawab**, kata-kata tersebut secara otomatis dicatat ke dalam memori lokal (*missed words deck*). Di dasbor dan halaman hasil, terdapat tombol *"Review Missed Words"* yang membuka kartu bolak-balik (Depan = Bahasa Indonesia, Belakang = Target Bahasa Inggris + Audio pelafalan native).
- **Rekomendasi / Keputusan:**
  - Jika Anda merasa fitur ini **tidak diperlukan atau membingungkan siswa**, kami **merekomendasikan untuk MEMBUANG / MENGHAPUS TOTAL** seluruh kode Flashcard dari `dashboard.html`, `result.html`, `js/dashboard.js`, dan `js/result.js`.
  - Harap beri konfirmasi apakah Flashcard ingin dibuang total dari sistem.

---

## 📐 3. Visual Pre-Flight: Mockup Desain Baru

### A. Mockup: Education Setup Modal (Pilihan Tunggal & Estimasi Otomatis dari Tanggal Lahir)
Siswa memilih **1 jenjang pendidikan terakhir** dalam bahasa Inggris. Sistem membaca tahun lahir dari langkah sebelumnya dan secara instan menghitung estimasi tahun lulus untuk setiap tahapan (TK hingga jenjang terpilih):

![Proposed Education Timeline](C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/mockup_education_timeline.png)

### B. Mockup: Student Profile Drawer (Data Terkunci, Metadata Riwayat Lengkap, Ganti PIN Saja)
Menampilkan data lengkap siswa dalam format *read-only* (hanya Admin yang bisa ubah gender & tanggal lahir). Menampilkan riwayat metadata pendidikan dari TK sampai jenjang terakhir. Siswa hanya dapat mengganti PIN dan mengganti foto jika telah memenuhi syarat kelulusan ujian:

![Proposed Student Profile Drawer](C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/mockup_student_profile_drawer.png)

---

## 📊 4. Matriks Perencanaan Visual 4-Kolom (Full System Matrix)

| Komponen / Fitur | 🔴 Kondisi Saat Ini (BEFORE) | 🟢 Target Perubahan (AFTER) | Dasar Aturan / Alasan |
| :--- | :--- | :--- | :--- |
| **Education Setup: Jumlah Pilihan** | 2 pilihan input (*Entry 1: Latest* & *Entry 2: Prior Institution*) dengan input manual tahun | **Hanya 1 Pilihan Tunggal:** Siswa hanya memilih jenjang pendidikan tertinggi yang telah diselesaikan | Permintaan pengguna: menyederhanakan form dan menghilangkan input ganda |
| **Education Setup: Bahasa & Opsi** | Dropdown singkatan lokal (`TK`, `SD`, `SMP`, `SMA`, `SMK`, `S1`, `S2`, `S3`) | 8 Pilihan bahasa Inggris resmi Indonesia: `Kindergarten (TK)`, `Elementary (SD)`, `Junior High (SMP)`, `Senior High (SMA/SMK)`, `Diploma (D1–D3)`, `Bachelor's Degree (S1/D4)`, `Master's Degree (S2)`, `Doctoral Degree (S3)` | Standarisasi antarmuka bahasa Inggris internasional |
| **Education Setup: Perhitungan Tahun Lulus** | Manual ketik angka tahun (sering salah ketik) | **Estimasi Otomatis dari Tahun Lahir:**<br>• TK = Tahun Lahir + 6<br>• SD = Tahun Lahir + 12<br>• SMP = Tahun Lahir + 15<br>• SMA = Tahun Lahir + 18<br>• D3 = Tahun Lahir + 21<br>• S1 = Tahun Lahir + 22<br>• S2 = Tahun Lahir + 24<br>• S3 = Tahun Lahir + 28 | Otomasi presisi cerdas tanpa beban manual siswa |
| **Photo Setup: Metode Input** | Tersedia tombol Upload File (`<input type="file">`) dan Kamera | **Hanya Kamera Langsung (Webcam):** Opsi upload file dihapus total. Siswa wajib mengambil foto langsung | Menjamin keaslian wajah peserta ujian dan integritas anti-joki |
| **Photo Setup: Aturan Ganti Foto** | Siswa bisa unggah/ganti foto kapan saja di profil | **Gated by Exam Completion:**<br>1. Foto hanya bisa diganti setelah siswa **lulus Ujian (Exam)** (maksimal 1 kuota per ujian yang lulus, tidak akumulatif).<br>2. Diberlakukan cooldown minimal **1 minggu sekali** | Mencegah spam pergantian foto dan menjaga integritas audit log |
| **Student Profile: Edit Data Diri** | Gender bisa di-toggle (*Mr./Miss*) dan tanggal lahir bisa diedit siswa via `personal-data-form` | **KUNCI TOTAL (Read-Only):** Gender, Tanggal Lahir, dan Nama Lengkap dikunci (*Locked: Admin Only*). Siswa dilarang mengedit | Perlindungan integritas data akademik; hanya Admin yang berhak merubah |
| **Student Profile: Tampilan Riwayat Pendidikan** | Hanya menampilkan 1 teks singkat di input | **Kartu Metadata Riwayat Lengkap:** Menampilkan seluruh jenjang vertikal dari TK sampai jenjang terakhir beserta estimasi tahun kelulusannya | Transparansi rekam jejak akademik siswa |
| **Student Profile: Aksi yang Diizinkan** | Edit DOB, Gender, Upload Foto, Ganti PIN | **Hanya Ganti PIN & Ambil Foto (Jika Eligible):** Siswa hanya bisa update PIN pribadi dan jepret foto baru jika kuota ujian lulus tersedia | Prinsip *Least Privilege* akses profil siswa |
| **Fitur Flashcard** | Aktif di Dasbor dan Halaman Hasil | **Usulan: Dibuang Total** (atau dinonaktifkan sesuai keputusan pengguna) | Fitur tidak pernah diminta oleh pemilik produk |

---

## 🛠️ 5. Rencana Tahapan Eksekusi (Atomic Waves)

---

### Wave 1: Education Setup Modal Overhaul & Auto-Estimation Engine
**Files:** `dashboard.html`, `css/dashboard.css`, `js/dashboard.js`
1. **DOM Refactoring (`dashboard.html`)**:
   - Romba `#education-setup-modal` menjadi seleksi 8 jenjang pendidikan dalam bahasa Inggris (format tombol grid).
   - Tambahkan kontainer `#edu-timeline-preview` untuk menampilkan daftar estimasi tahun kelulusan secara interaktif.
2. **Auto-Estimation Logic (`js/dashboard.js`)**:
   - Ambil tanggal lahir siswa dari `session.birth_date` atau state sebelumnya.
   - Buat fungsi `calculateEducationTimeline(birthYear, highestLevel)`:
     - Menghitung array runtut dari TK sampai jenjang terpilih.
     - Menyimpan payload lengkap ke tabel `students.education` dalam format JSON terstruktur.
3. **Styling (`css/dashboard.css`)**:
   - Gaya grid 2 kolom responsif dengan status terpilih aksen biru taktis `#38bdf8` dan tombol konfirmasi hijau SSOT Grade A.

---

### Wave 2: Camera-Only Photo Setup & Anti-Upload Enforcement
**Files:** `dashboard.html`, `js/dashboard.js`
1. **Hapus Opsi Upload**:
   - Hapus `<label class="btn btn-ghost btn-sm btn-upload-label">` dan `<input type="file" id="onboard-photo-file">` dari `#photo-setup-modal`.
   - Hapus `<input type="file" id="profile-modal-photo-input">` dari `#profile-modal`.
2. **Enforce Camera Capture**:
   - Kamera otomatis menyala dengan panduan lingkaran wajah.
   - Hanya tombol `📷 Capture Photo` dan `🔄 Retake Photo` yang aktif.

---

### Wave 3: Photo Retake Gating by Exam Completion & Weekly Cooldown
**Files:** `js/api.js`, `js/test.js`, `js/dashboard.js`
1. **Aturan Kelulusan Ujian (`js/test.js`)**:
   - Saat siswa menyelesaikan sebuah Exam dengan status lulus (`pct >= 60%`), sistem menandai flag `photo_retake_eligible = true` pada data attempt/student.
   - Nilai tidak akumulatif (maksimal 1 kesempatan retake per ujian yang berhasil dilalui).
2. **Cooldown 1 Minggu & Pemeriksaan Status (`js/dashboard.js`)**:
   - Saat membuka Profile Drawer, cek apakah `photo_retake_eligible === true` DAN `last_photo_updated_at <= Date.now() - 7 days`.
   - Jika memenuhi syarat: tombol `📷 Take Photo` aktif (membuka modal kamera).
   - Jika tidak memenuhi syarat: tombol terkunci dengan status teks informatif (misal: *"Foto terkunci. Dapat diperbarui setelah lulus Exam berikutnya"*).

---

### Wave 4: Student Profile Drawer Read-Only Identity & Full Education Metadata
**Files:** `dashboard.html`, `css/dashboard.css`, `js/dashboard.js`
1. **Lock Data Diri (`dashboard.html`)**:
   - Hapus tombol toggle gender `#prof-gender-btns` (ganti dengan label teks statis `Mr. (Male)` atau `Miss (Female)` disertai badge gembok 🔒).
   - Hapus form edit data pribadi `#personal-data-form`. Ganti dengan kartu informasi resmi *Admin Only*.
2. **Render Full Educational Timeline**:
   - Tampilkan daftar metadata pendidikan dari TK hingga jenjang tertinggi lengkap dengan tahun kelulusan hasil estimasi.
3. **PIN Change Form Retention**:
   - Pertahankan `#change-pin-form` (Old PIN, New PIN, Confirm PIN) sebagai satu-satunya aksi form yang diizinkan untuk siswa.

---

### Wave 5: Flashcard Feature Removal / Purge (Sesuai Konfirmasi)
**Files:** `dashboard.html`, `result.html`, `js/dashboard.js`, `js/result.js`, `css/`
1. Jika Anda menyetujui pembuangan Flashcard:
   - Hapus `#flashcard-modal` dari `dashboard.html` dan `result.html`.
   - Hapus widget pemanggilan flashcard di lobi dan halaman nilai.
   - Hapus fungsi `initLobbyFlashcardControls()` dan listener terkait.

---

## 🧪 6. Rencana Verifikasi Otomatis (QA Plan)

1. **Uji Validasi Sintaks:**
   - Jalankan `node scripts/check_all_js_syntax.cjs` untuk memastikan seluruh file JS bebas error sintaks.
2. **Uji Algoritma Estimasi Pendidikan:**
   - Script unit test `scripts/test_education_timeline_calc.mjs` untuk menguji tahun lahir (contoh: 2002, 2008, 1995) dengan pilihan jenjang TK s/d S3, memverifikasi output tahun lulus tepat matematis.
3. **Uji Playwright Antarmuka:**
   - Buka dasbor siswa, verifikasi bahwa opsi upload file 100% tidak ada di DOM.
   - Verifikasi bahwa modal profil mengunci gender dan tanggal lahir (tanpa form input).
   - Verifikasi timeline pendidikan tampil rapi dan informatif.
4. **Uji Spatial Invariants:**
   - Jalankan `node .agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs` (100% pass).

---

## ❓ Pertanyaan & Keputusan untuk Anda:

> [!IMPORTANT]
> Mohon konfirmasi 2 poin berikut sebelum kami mengeksekusi rencana ini:
> 1. **Pembuangan Flashcard:** Apakah fitur Flashcard ingin **dihapus secara permanen** dari dasbor dan halaman hasil ujian sekarang?
> 2. **Persetujuan Rencana Desain:** Apakah struktur estimasi timeline pendidikan otomatis dan penguncian profil pada mockup di atas sudah sesuai dengan yang Anda inginkan? Tekan tombol **Proceed** untuk memulai eksekusi!
