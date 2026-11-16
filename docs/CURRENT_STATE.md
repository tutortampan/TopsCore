# CURRENT STATE — TOPSCORE LMS

> **Purpose:** Single authoritative restart point across sessions and restarts.
> **Last Updated:** 2026-11-16 19:35 UTC+8
> **Current Phase:** Phase 607 [COMPLETE] — Student Dashboard Hero Next-Test Invariant, Leaderboard Waiver Exclusion & Cultural Honorific Title Fix
> **Status:** READY FOR USER CONFIRMATION & REVIEW (ALL TESTS 100% GREEN)

---

## 1. Active System Architecture & Invariants

- **Student Dashboard Hero Next-Test Invariant & Leaderboard Parity (Phase 607 — SSOT §2.10, §2.23, §5.1)**:
  - **False Positive Hero Elimination**: `renderNextAssignmentHero` dilindungi guard ketat `if (!published || published.length === 0)` yang menampilkan status *"No active tests scheduled in this class"* alih-alih secara keliru menyatakan *"All tests in this class completed! ✓ 100%"*. Kelas aktif divalidasi ke daftar kelas resmi siswa.
  - **Exclusion of Pure Forgiven 0% Waivers from Academic Average**: Menambahkan `is_forgiven` dan `is_manual_override` pada query dan pemetaan `bestMap` di `loadBatchLeaderboard` dan `computeOverallStats`. Nilai dispensasi waiver 0% dieksklusikan dari rata-rata ujian, memulihkan Grade siswa berprestasi yang sebelumnya anjlok (Miss Riska Fetrosia 702 PTS pulih dari Grade D 59% menjadi Grade C 78%, Mr. Lalu Yuda 659 PTS menjadi Grade C 76%, Mr. Wildian 609 PTS menjadi Grade C 69%).
  - **Cultural Gender Safeguard & Noble Honorifics**: Memperbaiki data `gender: 'male'` pada `Lalu Yuda Handika Prawira` dan `Lalu Arman Maulana`, serta menyematkan aturan kultural otomatis di `dashboard.js`: nama berawalan `Lalu ` otomatis diidentifikasi sebagai pria (`Mr.` / `King`), dan `Baiq ` sebagai wanita (`Miss` / `Queen`).
  - **Batch Level Synchronization**: Memastikan sesi login siswa (`verifyStudentLogin` di `js/api.js`) dan pemetaan kurikulum kelas (`fetchStudentClasses`) memprioritaskan level aktif batch (`batches.current_level_id`), melenyapkan isu siswa terisolasi di level non-aktif.
- **System-Wide Invariant, Typography, Entity Emojis & Pure English Hygiene (Phase 606 — SSOT Rule 0.2.1, §2.3, §2.9, §2.14, §2.21, §2.27)**:
  - **Zero HTML Entity Emojis & Unicode Cleanliness**: Seluruh entitas numerik HTML emoji (`&#9888;`, `&#128128;`, `&#9889;`, `&#128100;`, `&#128269;`, `&#128737;`, `&#9989;`, `&#128272;`, `&#128065;`, `&#128064;`, `&#128229;`, `&#128202;`, `&#9679;`, `&#10060;`) dimusnahkan dan diganti vektor SVG resmi (`getSvgIcon`) atau teks bersih.
  - **Dual-Scale Typography Architecture (Strict No-Intermediate Scale)**: Seluruh font perantara liar (18px, 15px, 13px, 11px) dinormalisasi ke standar dual-scale (12px, 14px, 16px, 20px, 30px) pada `admin.html`, `conversation.html`, `dashboard.css`, `test.css`, `conversation.css`, `result.js`, `dashboard.js`, dan `offline.html`.
  - **Punctuation & Zero Space before Colon**: Titik dua wajib menempel ke kata (`RANKING: MY RANK` pada `dashboard.html`).
  - **Universal Zero-Truncation Invariant**: Dihapusnya `text-overflow: ellipsis; white-space: nowrap;` pada opsi nama kartu siswa (`.opt-card-name`) di `css/auth.css` diganti dengan `word-break: break-word;` agar nama panjang tidak terpotong.
  - **Language Purity (100% English SSOT)**: Seluruh sisa teks Bahasa Indonesia pada toasts dan alert konfirmasi (`PIN berhasil diperbarui!`, pembatalan/penghentian sesi tes oleh tutor di `js/test.js`, dan toast kurikulum) dinasionalisasi 100% ke bahasa Inggris murni.
  - **Status & Abbreviation Invariants**: Menyetel unpublish ke status `DRAFT` resmi (bukan legacy `archived`), mengunci header `PTS` pada seluruh resolusi tabel di `js/admin/app.js`, dan mengganti label tabel `STUDENT ID` menjadi `RECORD UUID` per Rule 2.2.
- **Student Dashboard Zero-Truncation & Dual-Tab Harmonization (Phase 605 — SSOT Rule §2.21 & §5.1)**:
  - Proporsi grid klasemen dikalibrasi menjadi `grid-template-columns: 24px 1fr 38px 28px !important;` dengan padding 10px rapi (+46px ruang nama).
  - Teks nama siswa dibungkus secara alami (`white-space: normal; line-height: 1.25; word-break: break-word; text-overflow: clip;`), memulihkan 100% zero-truncation (nama panjang seperti `Queen Isnantika Salsabila` tampil penuh tanpa elipsis).
  - Label dock tab disederhanakan menjadi **`MY RANK`** bersanding dengan chip `#9`, berpasangan simetris dengan **`COMPLETED TESTS`** `10`.
- **PIN Micro-Interactions & Seamless Digit Navigation (Phase 604 — SSOT)**:
  - Auto-focus ke digit pertama (`#pin-0`) saat siswa memilih nama di Langkah 4.
  - Focus routing: klik/tap pada kotak selanjutnya saat digit sebelumnya kosong dialihkan ke kotak kosong pertama.
  - Backspace navigation mundur ke kotak sebelumnya secara halus; ArrowLeft/ArrowRight navigasi keyboard.
  - Verification Error Shake (`@keyframes pinShake`) dengan border merah Grade E (`var(--grade-e)`) selama 450ms sebelum auto-reset.
- **Universal PWA Network Resilience & Offline Detection (Phase 604 — SSOT)**:
  - Badge status mengambang (`.pwa-offline-badge`): Kuning Grade C (`var(--grade-c)` / `#FFFF00`) "Offline Mode — Using Cached Data" saat terputus, dan Hijau Grade A (`var(--grade-a)` / `#00c000`) "Back Online" selama 2.5s saat pulih.
  - Terintegrasi di `initPWA()` untuk seluruh halaman siswa (`index.html`, `dashboard.html`, `test.html`, `result.html`).
- **Production PWA & Mobile App Experience (Phase 603 — SSOT)**:
  - Standalone PWA support across Chromium/Android and iOS Safari (`manifest.json`, theme-color `#060911`, full-screen standalone mode).
  - Official Option A emblem logo: locked to 25% screen width (98×98px squircle golden sweet spot), eliminating redundant `h1 TOPS CORE` text while preserving semantic `aria-label="TOPS CORE"` and strict 10px spacing.
  - High-resolution brand icons: `icons/icon-192.png`, `icons/icon-512.png`, `icons/icon-maskable-192.png`, `icons/icon-maskable-512.png`, `icons/apple-touch-icon.png`, and `icons/icon.svg`.
  - Service Worker network-first caching (`sw.js` cache `v140`) ensuring immediate propagation of bug fixes while offering robust offline capabilities.
  - Ergonomic PWA install banner handler (`js/pwa.js`) hooked to `beforeinstallprompt` and `appinstalled` events without disrupting the Student Gate corridor.
- **Standing Operational Discipline (Rule 0.2 SSOT: Cepat, Cermat, Tepat, Akurat)**:
  - Setiap instruksi dieksekusi cepat tanpa seremonial dokumen berlebih, cermat memeriksa dampak sistemik, tepat sasaran sesuai konteks & SSOT, dan akurat lolos verifikasi 100% green.
- **Student Dashboard Dual-Panel Invariants & Tri-Font System (Phase 600 — SSOT §5.1 & §2.0)**:
  - Pane B Completed Tests terkunci 5 kolom independen (`NO`, `TEST NAME`, `SCORE`, `GRD`, `ACT`), melenyapkan tumpang tindih `GRADERETRY`.
  - Pane A Standings (`NO`, `STUDENT NAME`, `PTS`, `GRD`) dengan warna teks angka PTS harmonis mengikuti warna Grade global siswa. Gelar kehormatan (`King`/`Queen`, `Mr.`/`Miss`) dipertahankan penuh.
  - Sub-row 7 pips task dibukukan permanen sebagai Top-7 Highest Attempts (bukan rainbow pips). Metrik hero skor/grade profil dinaikkan ke Level 0 Hero Metric (30px, Outfit 800 Extra Bold).
  - Tri-Font System baku: Outfit (Headings & Hero), Inter (Data Tables & Body), JetBrains Mono (PIN, Log & Audit).
- **Overall Performance Completion Header Standardization (Phase 599 — SSOT Rule §2.9)**:
  - Subheader resmi: **`DONE`** (Completion Rate %), **`PTS`** (Total Points whole integer), dan **`GRD`** (Overall Grade) di sisi paling kanan tabel.
- **Modules Warehouse Architecture & Class Allocation System (Phase 598 — SSOT §1.5)**:
  - Unifikasi 8 modul evaluasi (`m1`–`m8`), tata letak simetris 4-Over-4, alokasi kelas vertikal (gap 10px), pil ringkasan di Sub Panel 40px, judul di Topbar (zero duplicate headers), dan wizard test lockdown.
- **5-Pillar Theme Matrix Compact Headers & Quadrant Color Alignment (Phases 594 & 597 — SSOT §2.9 & §2.10.1)**:
  - Subheader ringkas: **`TASK`**, **`RATE`**, **`PTS`**, **`GRD`**, dan **`STS`** dengan warna selaras kuadran masing-masing (Pink A, Orange B, Lime C, Violet D). Zero text wrapping.
- **Points (PTS) Half-Up Whole Integer Invariant (Phase 589 — SSOT Rule §2.9)**:
  - Seluruh desimal poin $\ge 0.5$ dibulatkan ke atas via `Math.round()`. Kolom poin bebas angka berkoma dan wajib berheader **`PTS`**.
- **Strict Zero-Movement Hover & Ghost-to-Solid-Glow Invariant (Phases 584, 588, 592 — SSOT §3.4)**:
  - Tombol stationary pada hover (`transform: none !important;` subtle glow only) mencegah border clipping atas; standby ghost outline vs aktif solid neon glow.
- **Alumni Multi-Program & Level/Grade X Standards (Phases 575, 579, 581, 588)**:
  - Tab program alumni A-Z (`Camp`, `Evnikom`, `Sheraton`, `All Alumni`), Level X dan Grade X mutlak, status `INACTIVE` merah `var(--grade-e)`, zero badge Disconnected.
- **Dual-Viewport Ecosystem & Room-Exclusive Print (Phase 586 — SSOT §2.28 & §2.29)**:
  - Student mobile-locked (430px) vs Admin desktop-locked (100vh). Fitur cetak eksklusif hanya ada di Room.
- **Single-Screen 100vh Viewport Lock & Spatial System (SSOT in `ui-invariants.md`)**:
  - `html, body { height: 100vh; overflow: hidden; }`. 10px container gap, 40px Sub Panel, 60px Title Area & CTA Area, zero sub-12px font, zero emojis, white Excel gridlines in Master Edit Mode.

---

## 2. Recent Active Milestones (Latest Rolling Window)

- **Phase 607**: Student Dashboard Hero Next-Test Invariant, Leaderboard Waiver Exclusion & Cultural Honorific Title Fix (`js/dashboard.js`, `js/api.js`, database sync, `d8fc0882` male, waiver 0% excluded from average, guard `!published.length`, noble title fallback).
- **Phase 606**: System-Wide Invariant, Typography, Entity Emojis & Pure English Hygiene (`admin.html`, `dashboard.css`, `test.css`, `conversation.css`, zero HTML emojis, dual-scale typography).
- **Phase 605**: Student Dashboard Zero-Truncation Invariant & Dual-Tab Label Harmonization (`css/dashboard.css`, `dashboard.html`, calibrated grid columns, `white-space: normal`, zero-ellipsis name recovery, tab label `MY RANK #9`).
- **Phase 604**: PIN Micro-Interactions, Smooth Digit Navigation, Grade E Error Shake & Universal PWA Network Status Resilience (`js/auth.js`, `js/pwa.js`, `css/auth.css`, `css/style.css`, auto-focus, backspace routing, keyframes shake, offline/online badge).
- **Phase 603**: Production PWA Architecture, High-Res Brand Icons, Web App Manifest & Install Handler (`test:pwa`, `manifest.json`, `js/pwa.js`, full standalone mobile display mode, network-first Service Worker).
- **Phase 602**: Student Gate Login Invariants: Step 1 (Institution) hierarchy restoration via `resetFrom('program')`, Open Book SVG Brand Badge (52px), 30px Brand Hero Landmark (`h1 TOPS CORE`), Zero Subtitle Clutter, Universal 10px Container Gap alignment, 44px ergonomic student option touch target, neutral PIN filled state, pure vector SVG search icons, zero-movement hover compliance, and tactical blue color unification.
- **Phase 601**: System Governance Rules Harmonization (Bab 5 & 6 separation in `ui-invariants.md`, Title Area 40px/60px fix, and Operational Discipline codification).
- **Phases 597–600**: Student Dashboard Dual-Panel Invariants, Tri-Font System, `DONE` header, Modules Warehouse 4-Over-4 Architecture, and Theme Status Quadrant Colors.
- **Phases 589–596**: 5-Pillar Theme Matrix (`TASK`, `RATE`, `PTS`, `GRD`, `STS`), Sub Panel Elevation of Summary Pills, Strict Zero-Movement Hover, and Points Half-Up.
- **Phases 584–588**: Ghost-to-Solid-Glow Button Invariant System-Wide Audit, Dual-Viewport Ecosystem, and Alumni Multi-Program Alignment.

---

## 3. Standing Governance & Execution Boundaries

- **Rule 0.1.1 (Strict Git Gate)**: NEVER execute `git commit` or `git push` autonomously.
- **Rule 0.1.2 (Strict UTF-8 & No PowerShell File Editing)**: Use native tools or Node.js only.
- **Rule 0.2 (Standing Operational Discipline)**: Cepat, Cermat, Tepat, dan Akurat di setiap eksekusi perintah.
- **Rule 2.10 (Authoritative Color SSOT)**: Zero raw hex codes. CSS variables & `TOPSCORE_COLORS`.
- **Rule 2.27 (Authoritative Entity Standards)**: Strict status & type taxonomies (ACTIVE, HOLD, ALUMNI, INACTIVE).

---

## 4. Verification Suite Status

- **Preflight & Fast AST Check**: 50/50 JavaScript files PASS in 0.10s (`npm.cmd run test:fast`).
- **Module & API Import Health**: 47/47 JS modules PASS 100% (`npm.cmd run test:imports`).
- **Universal Table Standardization**: 10/10 Pillars PASS with 100% integrity (`npm.cmd run test:table`).
- **Automated Spatial & Visual Invariants**: ALL checks PASS 100% (`npm.cmd run check:spatial`).

---

## 5. Next Exact Action

- **Target**: Pembuatan kelas baru dan pengujian integrasi alokasi modul terpilih (Class-to-Module Mapping Wizard). Seluruh perubahan tersimpan rapi dan uncommitted di working tree per Rule 0.1.1.
