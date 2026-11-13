# Laporan Audit Sistem TopsCore

Berdasarkan pengecekan berstatus *read-only* (tanpa melakukan modifikasi pada kode), berikut adalah laporan status untuk kelima parameter yang diminta:

## 1. Layout & Tampilan Layar Ujian
- **Kontainer Utama & Scrolling:** **[SESUAI]**
  Kontainer utama `.assessment-body` telah menggunakan `flex: 1` dengan `overflow-y: auto`. Hal ini memastikan bahwa area pertanyaan dapat di-scroll secara internal tanpa memicu *vertical scrolling* pada keseluruhan `body` yang terkunci (`overflow: hidden`).
- **Letak & Styling Tombol "Next":** **[SESUAI]**
  Tombol navigasi diletakkan di dalam `.bottom-nav-bar` yang posisinya *sticky/fixed* terhadap sisa halaman, sehingga tidak jatuh terlalu ke bawah atau tersembunyi.
- **Teks Nama Ujian (Exam Name):** **[SESUAI]**
  Nama asesmen ditempatkan di dalam elemen `<header>` pada tag `<h1 id="assessment-main-title">`. Posisinya sudah berada selaras (sebaris) dengan Timer dan tepat **di atas** foto serta data diri siswa (`assessment-student-avatar` & `assessment-student-details`).
- **Tombol Kumpul Dini (Submit Early):** **[SESUAI]**
  Terdapat tombol **"🏳️ Give up!"** di pojok kanan atas sejajar dengan nama ujian dan timer untuk melakukan *submit early*.
- **Penulisan Teks "Assessment":** **[SESUAI]**
  Penyebutan *user-facing* telah diperbarui. Tombol utama yang dulunya "Submit Exam" sudah diubah teksnya menjadi "Submit ASSESSMENT 📋".

## 2. Fitur Navigasi & Matrix Soal
- **Posisi & Fungsionalitas Kotak "Progress":** **[SESUAI]**
  Elemen `#progress-bar-toggle` berada di bawah `<header>` (yang memuat data siswa). Elemen ini memiliki instruksi `(Tap to view grid)` dan sudah bisa diklik untuk melakukan *toggle* kemunculan `#matrix-popup`.
- **Logika Warna pada Daftar/Nomor Soal:** **[BELUM SESUAI]**
  Pada CSS, nomor yang berstatus terjawab (`.answered`) telah disetel berubah warna menjadi hijau (`rgba(16,185,129,0.15)`). **Namun**, untuk soal yang dilewati/belum dijawab, tidak ada aturan CSS yang mewarnainya menjadi **merah**. Warna nomor yang belum dijawab masih memakai warna abu-abu default (`var(--clr-surface)`).
- **Letak & Desain Tombol Navigasi:** **[SESUAI]**
  Tombol "Next" dan "Prev" terletak di *bottom nav bar* yang selalu terlihat tanpa harus di-scroll. Tombol "Jump to Next Unanswered" juga dapat dipanggil dengan cepat melalui menu Matrix Soal.
- **Logika "Auto-Jump" Saat Menekan Next:** **[BELUM SESUAI / GAP]**
  Ketika menekan "Next ➔" pada *bottom nav bar*, sistem secara statis menjalankan `renderQuestion(idx + 1)` (hanya berpindah ke indeks soal berikutnya secara berurutan) dan tidak mengevaluasi atau meloncat otomatis melewati soal yang mungkin sudah terjawab. Fitur loncat cerdas baru terjadi jika pengguna mengklik opsi ganda (opsi memicu `nextBtn.click()`), tapi logikanya tetap bergerak berurutan +1 alih-alih loncat ke soal belum terjawab (*Jump to Next Unanswered* hanya bisa ditekan secara manual di dalam matriks).

## 3. Modul Vocabulary / Words (Input Suara/Ketik)
- **Interaktivitas Daftar Nomor/Progres (Bug Scroll & Klik):** **[BUG DITEMUKAN]**
  Pada mode asesmen tipe *Speech/Vocabulary*, daftar soal digenerasi dalam elemen tambahan `.speech-unanswered-panel`. Terdapat potensi masalah pada kalkulasi tinggi layar (karena ada komponen layout `.speech-center-layout` dipadu *overflow: hidden* di root) dan/atau **overlay transparan dari komponen Keyboard Virtual**. Elemen `#virtual-keyboard-container` disisipkan di struktur akhir dengan `z-index: 1000` dan meng-intercept *mousedown* (`e.preventDefault()`). Pada perangkat kecil, ini dapat menumpuk *(overlap)* atau merusak ruang interaksi `.assessment-body` dan menonaktifkan klik pada `.speech-unanswered-chip`.
- **Penanganan Jawaban (Suara/Ketik):** **[SESUAI]**
  Sudah ada logika transisi mode (fallback): Jika mikrofon mengalami *error/unavailable*, modul mengubah `transcriptBox.contentEditable = 'true'` atau memunculkan Keyboard Virtual khusus secara otomatis untuk fallback ketik.
- **Posisi Tombol Mikrofon:** **[POTENSI GAP]**
  Tombol diletakkan di tengah pada *speech layout*. Pada layar HP kecil, setelah kemunculan Banner Global (50px) dan/atau Virtual Keyboard, ruang sisa untuk tombol ini mengecil. Meski saat ini tidak ada tumpukan (overlapping) statis karena pemakaian *flex*, elemen bisa tertekan ke atas jika *viewport* terlalu sempit.

## 4. Global Footer (Banner)
- **Persistensi Global Footer:** **[SESUAI]**
  Elemen `<div id="bottom-ad-banner">` telah terpasang statis di *index*, *dashboard*, *admin*, dan *assessment* dengan penempatan di paling bawah halaman.
- **Pencegahan Overlap / Tumpang Tindih:** **[SESUAI]**
  Area kerja utama (`.assessment-page`, `#admin-console`, dll.) sudah direduksi tingginya menggunakan fungsi komputasi `calc(100vh - 50px)` dipadu dengan `padding-bottom: 50px`. Ini memastikan *banner* tidak menindih konten utama dan elemen di baliknya.

## 5. Keyboard Virtual & Keamanan Layar Ujian (Anti-Cheat)
- **Proporsi Keyboard Virtual:** **[SESUAI]**
  Tombol `.vk-key` telah menggunakan `aspect-ratio: 1`, tanpa margin besar, membentuk grid kotak-kotak sempurna yang lebih modern dan ramping.
- **Implementasi "Focus Mode":** **[SESUAI]**
  Sistem menambahkan class `.focus-mode` pada `body` ketika tombol mikrofon diklik/merekam atau area ketik difokuskan. CSS dengan `.focus-mode` mengaburkan (`opacity: 0.15`) dan mematikan klik (`pointer-events: none`) pada elemen navigasi/header.
- **Status Keamanan Anti-Cheat:** **[SESUAI]**
  Terdapat validasi pada `visibilitychange` dan `contextmenu` (klik kanan diblokir). Jika terdeteksi berpindah tab (visibility hidden), status *isAssessmentActive* memicu fungsi anti-cheat (memberi peringatan, hingga mengirimkan pelanggaran ke server). Peringatan penutupan tab paksa (`beforeunload`) juga telah dikonfigurasi.
