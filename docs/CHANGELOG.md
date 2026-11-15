# TopsCore LMS — Active Changelog (Phases 576–600)

> **Format:** Ultra-Condensed Active Changelog (Strict 25-Phase Rolling Window per AGENTS.md §5.3). Each entry highlights core functional deliverables, architectural milestones, and affected systems.
> **Full Archives:** Historical verbose logs for earlier phases are preserved in:
> - [`docs/archive/CHANGELOG_ARCHIVE.md.gz`](file:///docs/archive/CHANGELOG_ARCHIVE.md.gz) (Phases 1–228, Gzip Compressed)
> - [`docs/archive/CHANGELOG_ARCHIVE_2.md.gz`](file:///docs/archive/CHANGELOG_ARCHIVE_2.md.gz) (Phases 229–451, Gzip Compressed)
> - [`docs/archive/CHANGELOG_ARCHIVE_3.md.gz`](file:///docs/archive/CHANGELOG_ARCHIVE_3.md.gz) (Phases 452–539, Gzip Compressed)

---

## [2026-11-16 03:55] — Phase 600: Student Dashboard Dual-Panel Invariants & Tri-Font System Codification
- **Penyelesaian Tumpang Tindih Kolom Pane B (GRADERETRY Eradicated)**:
  - Di [dashboard.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/dashboard.html), menghapus perbenturan class `.standings-table-header` pada `.completed-table-header` dan mengunci grid 5 kolom independen (`grid-template-columns: 28px 1fr 48px 40px 38px !important;`) di [css/dashboard.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/dashboard.css).
  - Header Pane B distandarisasi ringkas: **`NO`**, **`TEST NAME`**, **`SCORE`**, **`GRD`**, dan **`ACT`** (melenyapkan tumpang tindih `GRADERETRY`).
- **Pane A Standings Header & Harmonization**:
  - Header Pane A distandarisasi: **`NO`**, **`STUDENT NAME`**, **`PTS`** (Rule 2.9 3-letter invariant), dan **`GRD`**.
  - Angka **`PTS`** (Global Points) diselaraskan warnanya dengan `theme.color` (warna **Global Grade** siswa) di [js/dashboard.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/dashboard.js), sehingga warna angka poin persis seirama dengan badge huruf Grade siswa.
- **Penetapan Aturan Sub-Row 7 Nilai Terbaik Task (SSOT Invariant §5.1)**:
  - 7 pips pada sub-row Task Completed Tests dibukukan resmi sebagai **Daftar 7 Nilai Riwayat Terbaik (Top 7 Highest Attempts sorted descending)** untuk menghitung rata-rata nilai dan grade task. Dilarang diubah menjadi rainbow pips.
- **Dashboard Honors & Gelar Kehormatan Siswa (SSOT Invariant §5.1)**:
  - Gelar siswa (`King`/`Queen` untuk Rank 1, `Mr.`/`Miss` untuk siswa lain) dipertahankan penuh pada tabel peringkat (leaderboard) dashboard siswa sebagai elemen motivasi.
- **Kodifikasi Tri-Font System (SSOT §2.0)**:
  - `Outfit` (Display, Headings, Hero Metrics), `Inter` (Body Text, Data Tables, Form Controls), dan `JetBrains Mono` (Technical, PIN, Security Logs) resmi dikodifikasikan di [.agents/rules/ui-invariants.md](file:///.agents/rules/ui-invariants.md) Bab 2.

## [2026-11-16 03:10] — Phase 599: Overall Performance Completion Header Standardization (DONE Replacing PRGRS)
- **Penggantian Header Progress Overall Menjadi DONE**:
  - Sesuai instruksi pengguna ("pakai DONE"):
  - Header kolom persentase capaian kurikulum pada Overall Performance resmi diganti dari `PROGRESS` / `PRGRS` menjadi **`DONE`** di [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js) dan [js/admin/datagrid.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/datagrid.js).
  - Melenyapkan total kerancuan singkatan `PRGRS` / `PRG` dengan istilah Program.
  - Struktur 3 subheader Overall Performance kini ultra-ringkas: **`DONE`** (Completion Rate %), **`PTS`** (Total Points whole integer), dan **`GRD`** (Overall Grade).
- **Codification**:
  - Dibukukan resmi di [AGENTS.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/AGENTS.md) §2.9 dan [.agents/rules/ui-invariants.md](file:///.agents/rules/ui-invariants.md) §4.2.
- **Verification**:
  - Seluruh test suites lolos 100% green.

## [2026-11-16 03:05] — Phase 598: Modules Warehouse Architecture & Class Allocation System
- **Unifikasi 'Module' SSOT & Alokasi Kelas Interaktif**:
  - Unifikasi istilah mesin evaluasi ujian menjadi **`Module`** (`m1` s/d `m8`), meniadakan kerancuan legacy *Answer Type* dan *Method*.
  - Pemetaan disiplin kelas terpadu (Vocabulary, Storytelling, Speaking, Basic English) langsung pada setiap kartu modul.
  - Penambahan seksi **`APPLICABLE CLASSES`** dengan pil interaktif tersusun vertikal atas ke bawah dengan jarak tepat **10px** (`gap: 10px !important;`).
- **Tata Letak Simetris 4-Over-4 & Kepatuhan UI Invariants (§1.5)**:
  - Grid kartu modul dikunci strictly 4 kolom di atas dan 4 kolom di bawah (`repeat(4, minmax(0, 1fr))`).
  - Standardized Badge Area (§1.5.0): Wadah 48px × 48px radius 12px di bagian paling atas membingkai ikon SVG vektor 24px.
  - Standardized 40px Title Area (§1.5.1): Judul modul 16px Outfit Bold ALL CAPS dan subtitle terintegrasi kode modul (`M1 — VISUAL CONTEXT`, `M2 — STANDARDIZED CHOICES`, dst).
  - Relokasi pil ringkasan kelas ke **Sub Panel 40px** (`#admin-bottom-infobar`) setinggi 28px per pil, dan elevasi judul ke **Topbar** workstation, melenyapkan seluruh header ganda dari area konten.
- **Wizard Test Lockdown**:
  - `getAllowedModulesForClass()` di `modules.js`, `test-builder.js`, dan `crud-modals.js` otomatis mengunci pilihan modul pada form tes sesuai kelas terpilih.

## [2026-11-16 03:00] — Phase 597: Theme Status Column Quadrant Color Alignment (STS Theme Color Matching)
- **Penyelarasan Warna Header STS Sesuai Kuadran Tema**:
  - Sesuai instruksi pengguna ("bagian status warna disamakan dengan yang tema"):
  - Menambahkan selector kuadran tema untuk `col-test-theme-status-*` di [css/admin/admin-tables.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/admin/admin-tables.css):
    - Theme A: `col-test-theme-status-a` $\to$ Electric Pink (`var(--quad-a, #ff2d87)`).
    - Theme B: `col-test-theme-status-b` $\to$ Dark Orange (`var(--quad-b, #ff8c00)`).
    - Theme C: `col-test-theme-status-c` $\to$ Electric Lime (`var(--quad-c, #95ff00)`).
    - Theme D: `col-test-theme-status-d` $\to$ Vibrant Violet (`var(--quad-d, #c084fc)`).
  - Kelima subheader tema kini 100% selaras memancarkan warna kuadran tema masing-masing.
- **Verification**:
  - Seluruh test suites lolos 100% green.

## [2026-11-16 02:53] — Phase 594: 5-Pillar Theme Matrix Compact Header Standardization (TASK, RATE, PTS, GRD, STS)
- **Standarisasi 5 Subheader Tema (Strict 3–4 Karakter)**:
  - Sesuai instruksi pengguna ("GRADE = GRD lalu kolom Progress ganti namanya dengan TASK saja, STATUS ini pakai nama STS, simpan dalam aturan"):
  - 1. Formative Progress $\to$ **`TASK`** (bukan `PROGRESS`/`PRGRS`).
  - 2. Exam Rate % $\to$ **`RATE`**.
  - 3. Exam Points $\to$ **`PTS`** (Math.round whole integer).
  - 4. Exam Grade $\to$ **`GRD`** (bukan `GRADE`).
  - 5. Administrative Status $\to$ **`STS`** (bukan `STATUS`).
- **Integrasi Kamus DataGrid & App**:
  - Diselaraskan di [js/admin/datagrid.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/datagrid.js) dan [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js) (`dynamicAsmCols` dan Overall Performance).
  - Meniadakan seluruh penumpukan teks dan tumpang tindih kolom (*zero text wrapping / anti-crowding*).
- **Codification**:
  - Dibukukan resmi di [AGENTS.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/AGENTS.md) §2.9 dan [.agents/rules/ui-invariants.md](file:///.agents/rules/ui-invariants.md) §4.2.
- **Verification**:
  - Seluruh tes unit AST, 10 pilar standarisasi tabel, dan super-header divider tests 100% green.

## [2026-11-16 02:48] — Phase 592: Strict Zero-Movement Hover Discipline & Border Clipping Eradication
- **Strict Zero-Movement Button Hover Invariant (§3.4 SSOT)**:
  - Sesuai instruksi pengguna ("saat tombolnya hover di atas tombolnya ada animasi bergerak sedikit, itu membuat bagian garis atas tombol malah hilang,,, jangan buat gerak, cukup efek sedikit pendar yang ada"):
  - Seluruh efek pergeseran fisik (`transform: translateY(-1px)`, `translateY(-2px)`, `scale(...)`) pada state `:hover` dan `:active` tombol telah dieliminasi total dari seluruh stylesheet ([css/style.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/style.css), [css/admin.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/admin.css), [css/dashboard.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/dashboard.css), [css/test.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/test.css), [css/result.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/result.css), [css/auth.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/auth.css), dan modular `css/admin/` files).
  - Mengunci aturan baku global `button:hover, .btn:hover, button:active, .btn:active { transform: none !important; }`.
- **Eradikasi Border Clipping Garis Atas**:
  - Tombol tetap diam 100% di tempat (*strictly stationary*), memastikan garis batas atas tombol (*top border*) tidak terpotong oleh overflow kontainer (tabel data, sub panel, kartu, popover, modal).
  - Efek hover murni pendaran cahaya halus (*subtle glow* via `box-shadow`) dan peningkatan kecerahan/saturasi warna latar tipis (*subtle background tint*).
- **Codification**:
  - Dibukukan resmi di [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md) §3.4 butir 5.
- **Verification**:
  - Seluruh 28 test suites lolos 100% green (`node scripts/run_all_tests_parallel.mjs`).

## [2026-11-16 02:40] — Phase 589: Points Half-Up Whole Integer Invariant & 3-Letter 'PTS' Header Standardization
- **Points (PTS) Half-Up Whole Integer Invariant (Math.round)**:
  - Sesuai instruksi pengguna ("nilai yang ada .5 lebih, dibulatkan ke atas. ini jadikan aturan dalam penghitungan poin! simpan dalam sistem"):
  - Seluruh akumulasi dan nilai poin siswa/kelas (Theme Exam Points, Overall Points, Class Average Points, Student Academic Profile, Result Summary) yang memiliki desimal $\ge 0.5$ dibulatkan ke atas menjadi bilangan bulat penuh via `Math.round()` (misal `274.5` $\to$ `275`, `257.5` $\to$ `258`, `229.5` $\to$ `230`, `176.5` $\to$ `177`, `225.9` $\to$ `226`, `473.2` $\to$ `473`, `814.6` $\to$ `815`).
  - Meniadakan seluruh angka pecahan/berkoma pada kolom dan metrik poin.
- **3-Letter 'PTS' Header Standardization**:
  - Sesuai permintaan pengguna ("bisakah kita pakai singkatan 3 huruf agar tidak menumpuk?"):
  - Header kolom poin diubah dari `POINT` (5-huruf) menjadi singkatan resmi 3-huruf **`PTS`** di seluruh resolusi kolom (di [js/admin/datagrid.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/datagrid.js) dan [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)).
  - Kolom poin bernapas lega tanpa tumpang tindih (*anti-crowding / zero text wrapping*).
- **Codification**:
  - Dibukukan resmi di [AGENTS.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/AGENTS.md) §2.9 dan [.agents/rules/ui-invariants.md](file:///.agents/rules/ui-invariants.md) §4.2.
- **Verification**:
  - Seluruh 10 Pilar Standarisasi Tabel lolos 100%.
  - `node scripts/test_class_hub_super_headers_and_continuous_dividers.mjs` lolos 16/16 assertions.

## [2026-11-16 02:35] — Phase 588: Ghost-to-Solid-Glow Button Invariant Zero-Violation Audit & Alumni Multi-Program Alignment
- **Universal Ghost-to-Solid-Glow Button Audit & Zero Violations**:
  - Melakukan audit komprehensif pada seluruh tombol di seluruh halaman (`admin.html`, `dashboard.html`, `test.html`, `result.html`, `conversation.html`, `index.html`) serta berkas JavaScript template terkait.
  - Mengeliminasi seluruh 14 tombol dengan inline background padat mentah:
    - [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js): `#btn-manual-prompt-save` dimigrasikan ke `.btn-tactical`.
    - [js/admin/auto-gen-modal.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/auto-gen-modal.js): `#wizard-generate-btn` dimigrasikan ke `.btn-purple`.
    - [js/admin/desk.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/desk.js): `#btn-health-scan-orphans`, `#btn-apply-recal`, `#btn-recal-confirm-run` dimigrasikan ke `.btn-tactical`.
    - [js/admin/quick-score-wizards.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/quick-score-wizards.js): `#btn-confirm-quick-alumni` dimigrasikan ke `.btn-purple`.
    - [js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js): `#rl-save-btn` dimigrasikan ke `.btn-purple`.
    - [js/admin/tests-access.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/tests-access.js): `#btn-confirm-add-late` dimigrasikan ke `.btn-tactical`.
    - [js/admin/vocab-vault.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/vocab-vault.js): Tab level dan program pada infobar serta modal tombol duplikat dimigrasikan ke class baku `.btn-tactical`, `.btn-success`, `.btn-purple` dengan state `.active` terpusat.
  - Hasil audit verifikasi: **0 pelanggaran** di seluruh sistem.
- **Alumni Multi-Program & Level X Alignment**:
  - Memverifikasi top panel program alumni terurut alfabetis A-Z (`Camp`, `Evnikom`, `Sheraton`) dengan tab `All Alumni` di posisi paling akhir.
  - Memverifikasi seluruh alumni berlevel `X` (ungu) dan ber-Grade `X`, siswa berlevel X otomatis berstatus Alumni, status Inactive bertoken merah resmi (`var(--grade-e)`), serta red badge `DISCONNECTED` dihilangkan total untuk alumni.
- **Verification**:
  - Seluruh 28 test suites lolos 100% green (`node scripts/run_all_tests_parallel.mjs`).

## [2026-11-16 02:25] — Phase 586: Room-Exclusive Print Protocol & Dual-Viewport Ecosystem Standardization
- **Eradikasi Fitur Cetak dari Halaman Result**:
  - Sesuai instruksi pengguna ("di halaman result, hilangkan fitur cetak! SEMUA fitur cetak hanya melalui room saja!"), tombol cetak `#btn-print-result` dan seluruh blok dokumen cetak `#printable-report-card` serta styles `@media print` telah dieliminasi total dari [result.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/result.html), [js/result.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/result.js), dan [css/result.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/result.css).
  - Seluruh fitur cetak resmi (rapor, dossier, CV, sertifikat evaluasi) kini eksklusif hanya dapat diakses melalui Room (Admin Console / Tutors Room / Live Room).
- **Dual-Viewport Ecosystem Standard (SSOT)**:
  - **Student Realm (Mobile-Locked 430px)**: Seluruh alur antarmuka siswa (`index.html`, `dashboard.html`, `test.html`, `result.html`, `conversation.html`) terkunci 100% dalam format mobile terpusat (`max-width: 430px; margin: 0 auto;`), baik diakses di smartphone maupun monitor laptop/desktop PC.
  - Header, bottom bar, dan banner terkunci dalam koridor 430px di [css/auth.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/auth.css), [css/dashboard.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/dashboard.css), [css/test.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/test.css), dan [css/result.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/result.css).
  - **Admin & Tutor Realm (Desktop-Locked 100vh)**: Seluruh workstation admin (`admin.html`) terkunci 100% dalam format desktop single-screen 100vh.
  - **Codification**: Dibukukan resmi di [AGENTS.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/AGENTS.md) §2.28 & §2.29 dan [.agents/rules/ui-invariants.md](file:///.agents/rules/ui-invariants.md) §1.0.
- **Verification**:
  - `npm.cmd run test:fast` lolos 50/50 file JS AST (0.10s), minifikasi CSS otomatis sinkron.
  - 10/10 Pillars Standarisasi Tabel lolos 100%.

## [2026-11-16 02:22] — Phase 585: Universal Table Thick Perimeter Border Invariant & Super-Header Vertical Clipping Fix
- **Universal Table Thick Perimeter Frame (Atas, Bawah, Kiri, Kanan)**:
  - Sesuai instruksi pengguna ("tambahkan garis pembatas tebal di sekeliling semua tabel yang ada, atas, bawah, kiri, kanan. memutar di semua tubuh tabel"), seluruh tabel data (`.table-wrap`, `.datagrid-container`) dikunci bingkai perimeter `2px solid rgba(255, 255, 255, 0.28) !important;` memutar penuh di ke-4 sisi luar.
  - Menyelaraskan border perimeter sel terluar: `border-top: 2px` pada baris header pertama, `border-left: 2px` pada kolom pertama, `border-right: 2px` pada kolom terakhir, dan `border-bottom: 2px` pada baris footer terakhir.
- **Super-Header Vertical Text Clipping Fix**:
  - Mengeliminasi aturan usang `height: 19px` pada `#class-attendance-grid th.super-hdr` dan menyelaraskannya ke standar baku `height: 30px !important; line-height: 30px !important; vertical-align: middle !important;`, sehingga selaras sempurna dengan subheader Row 2 (30px) dan spanning header (60px). Teks super-header bernapas lega tanpa terpotong.
  - Perlindungan jarak dan clearance horisontal untuk teks `STATUS`, `PRGRS ▼`, `POINT`, dan `GRADE`.
- **Verification**:
  - `scripts/test_class_hub_super_headers_and_continuous_dividers.mjs` lolos 16/16 assertions.
  - `npm.cmd run test:table` lolos 10/10 Pillars.

## [2026-11-16 02:18] — Phase 584: Ghost-to-Solid-Glow Button Invariant SSOT System-Wide Standardization
- **Pembukuan Resmi Ghost-to-Solid-Glow Invariant (§3.4)**:
  - Membukukan aturan baku antarmuka untuk seluruh kontrol tombol aksi dan mode toggle di [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md) §3.4:
    - **Inaktif / Standby = Ghost Outline**: Latar transparan (`background: transparent`), garis tepi 1px dan teks menyala mengikuti token semantik masing-masing untuk melenyapkan *visual noise* di atas kanvas gelap.
    - **Aktif / ON / Ditekan = Solid Filled + Neon Glow**: Latar penuh warna padat dengan pendaran neon taktis `box-shadow: 0 0 10px rgba(..., 0.45)`.
    - **Strict Luminance Contrast**: Teks gelap `#0F172A` pada warna terang (Kuning & Hijau); teks putih `#FFFFFF` pada warna pekat (Merah, Cyan, Ungu, Pink).
- **Implementasi Terpadu CSS**:
  - Diterapkan secara terpusat di [css/style.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/style.css), [css/admin.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/admin.css), dan seluruh minified bundles (`.btn-tactical`, `.btn-danger`, `.btn-warning`, `.btn-success`, `.btn-purple`, `.btn-secondary`).
  - Penyelarasan header tabel Test Blueprint `METHOD` pada `scripts/test_vocab_vault_and_edit_mode.mjs` sesuai Rule 2.11.
- **Verification**:
  - `npm.cmd run test:fast` lolos 50/50 file JS AST (0.18s), minifikasi CSS otomatis sinkron.
  - 28/28 test suites parallel pool lolos 100% green dalam 18.28s.

## [2026-11-16 02:05] — Phase 583: Incomplete & Complete Submit Hazard Modal Standardization (Window 10 Standard)
- **Arsitektur 3-Tier Baku Modal 10 (`#submit-modal`)**:
  - **Badge Area (Invariant 1.5.0)**: Container 52px × 52px beradius 14px tepat di atas Title Area. Incomplete state menampilkan segitiga warning SVG dengan border amber & soft glow `var(--grade-c)`; Complete state menampilkan centang hijau SVG dengan border & glow `var(--grade-a)`.
  - **Title Area 40px Baku (Invariant 1.5.1)**: Tinggi baku tepat **40px** dengan pembatas perimeter tegas `border-bottom: 1.5px solid rgba(255, 255, 255, 0.16) !important;`. Tipografi 16px Outfit Bold ALL CAPS: `WARNING: INCOMPLETE TEST!` (kuning `var(--grade-c)`) dan `READY TO SUBMIT` (hijau `var(--grade-a)`).
  - **Body Area**: Menampung peringatan konsekuensi `Unanswered questions will be forfeited with 0 points.` (12px slate) dan deep-well counter strip `QUESTIONS ANSWERED` dengan Hero KPI `14 / 40` (30px Outfit Bold) serta mini progress bar hijau `var(--grade-a)`.
  - **CTA Area / Modal Footer 60px (Invariant 1.5.2 & 1.5.4)**: Tinggi baku tepat **60px** dengan pembatas perimeter tegas `border-top: 1.5px solid rgba(255, 255, 255, 0.16) !important;`. Tombol aksi proporsional tepat **40px**:
    - Incomplete State: Tombol bahaya `GIVE UP!` (Merah Grade E `var(--grade-e)`) di sudut kiri-bawah vs `BACK TO TEST` (Hijau Grade A `var(--grade-a)` dengan luminous glow) di sudut kanan-bawah.
    - Complete State: Tombol `BACK TO TEST` (Netral Slate 40px) di kiri vs `SUBMIT TEST` (Hijau Grade A 40px) di kanan.
- **Zero Truncation & Mobile 350px Viewport**:
  - Terverifikasi 100% bebas dari teks terpotong atau terhimpit pada layar mobile 350px.
  - Eradikasi tombol 'X' di sudut kanan-atas; seluruh dismiss terpusat pada tombol CTA Area di footer (Invariant 1.5.4).
- **Verification**:
  - `npm.cmd run test:fast` lolos 50/50 file JS AST (0.12s), minifikasi CSS otomatis sinkron.
  - 10/10 Pillars Standarisasi Tabel lolos 100% (`npm.cmd run test:table`).

## [2026-11-16 01:52] — Phase 581: Inactive Status Red Color SSOT, Level X Automatic Alumni Status & Completed Tests Scroll Clearance
- **Inactive Status Red Color SSOT & Level X Auto-Alumni**:
  - Sesuai direktif user ("inactive pakai warna merah, jangan putih"), status `INACTIVE` pada kolom `STATUS` tabel, opsi select inline, dan badge modal profil kini mutlak merujuk ke token Grade E (`var(--grade-e)` / `#FF0000`). Siswa dengan Level `X` otomatis berstatus `ALUMNI` (`program_status = 'ALUMNI'`, `color = 'var(--quad-d)'`).
- **Urutan Alfabetis Tab Program Alumni & All Alumni di Posisi Akhir**:
  - Sesuai instruksi pengguna ("urutkan panel dengan cra nama program dengan alpabet, tapi all alumni taruh paling akhir"), tab program di top panel Alumni diurutkan menurut abjad A–Z (`Camp`, `Evnikom`, `Sheraton`), dan tab master `All Alumni` diposisikan di paling akhir.
- **Dashboard Completed Tests Scroll Clearance**:
  - Menambah bottom padding container scroll `.completed-table-wrap` dan `#completed-Tests-container` di [css/dashboard.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/dashboard.css) menjadi `60px !important`.
  - Memastikan seluruh tes yang telah selesai (termasuk tes ke-11 di posisi terbawah) dapat di-scroll sepenuhnya ke atas tanpa terpotong atau tertutup banner bawah ("TopsCore by Mr. Top").
- **Verification**:
  - `npm.cmd run test:fast` lolos 50/50 file JS AST (0.12s), minifikasi CSS otomatis sinkron.
  - 28/28 test suites parallel pool lolos 100% green dalam 16.55s.

## [2026-11-16 01:45] — Phase 580: Class Hub Attendance Matrix Far-Right Overall Repositioning, Theme D Progress Inflation Bug Fix & Strict Zero Horizontal Scroll
- **Relokasi OVERALL PERFORMANCE ke Paling Kanan**:
  - Memindahkan super-header `OVERALL PERFORMANCE` dan kolomnya (`PRGRS`, `POINT`, `GRADE`) dari samping kiri ke posisi paling kanan tabel (setelah `THEME D`), menata alur matriks menjadi: Data Siswa $\rightarrow$ Tema A–D $\rightarrow$ Rangkuman Total.
  - Menghapus kelas sticky `col-sticky-3/4/5` dari kolom Overall untuk melenyapkan tabrakan sticky header dan robeknya tampilan visual.
- **Theme D Progress Inflation Bug Fix**:
  - Mengidentifikasi dan mematikan bug `if (hasAtt || ...)` di [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js) baris 3224 yang memaksakan `earnedTasks = maxThemeTasks` (`28/28`) setiap kali siswa memiliki attempt ujian.
  - Siswa yang belum mengerjakan task (seperti Abdul Basit, Muhamad Alifurrahman, dan Abd. Qoyyim) kini akurat menampilkan `0/28`, dan Overall Progress mereka tidak lagi terkerek palsu ke 100%.
- **Penegakan Mutlak Zero Horizontal Scroll (100% Viewport Lock)**:
  - Mengunci `#class-attendance-grid .table-wrap` dengan `overflow-x: hidden !important;` dan tabel dengan `table-layout: fixed !important; width: 100% !important;` di [css/admin/admin-tables.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/admin/admin-tables.css).
  - Menghapus event listener pembajakan mousewheel horizontal scroll di `fitMatrixToScreen()` sehingga tabel pas 100% di layar.
- **Verification**:
  - 10/10 Pillars Standarisasi Tabel lolos 100%, 16/16 Super-Headers lolos, validasi AST 50 JS files lolos.

## [2026-11-16 01:30] — Phase 579: Alumni Multi-Program Top Panel Tabs & Dedicated Program Tables
- **Pembeda Alumni per Program via Top Panel (SSOT)**:
  - Sesuai instruksi pengguna ("di tabel alumni, kita bedakan alumni di tiap program, mereka punya tabel deda2 yang dipilih lewat top panel"), diimplementasikan tab folder interaktif di top panel via `window.setTopbarTabs`:
    - `All Alumni (20)`: Tabel gabungan seluruh alumni.
    - `Sheraton (14)`: Tabel khusus alumni program Sheraton.
    - `Camp (6)`: Tabel khusus alumni program Camp.
    - `Evnikom (0)`: Program aktif dengan indikator neutral slate.
  - Menghubungkan fungsi `window._switchAlumniProgram` untuk menyaring data in-memory secara instan tanpa re-fetch jaringan.
  - Dropdown batch di bottom infobar (`#select-alumni-batch-infobar`) secara dinamis tersinkronisasi hanya menampilkan batch lulusan milik program yang sedang aktif.
- **Verification**:
  - E2E Playwright mengonfirmasi klik tab Camp menampilkan 6 baris alumni Camp, klik Sheraton menampilkan 14 baris alumni Sheraton, dan All Alumni menampilkan 20 baris.
  - 28/28 test suites 100% green dalam 16.58s.

## [2026-11-16 01:30] — Phase 578: Class Hub Attendance Matrix Responsive Expansion & Multi-Attempt Special Status Recovery
- **Akar Masalah Tabel Berantakan & Kolom Terpotong**:
  - Matriks 25 kolom sebelumnya dipaksa oleh `table-layout: fixed !important; overflow-x: hidden !important;`, menyebabkan header `STATUS` terpotong ("STATU") dan Theme D terdorong ke luar layar tanpa bisa diakses.
  - Dimodifikasi `css/admin/admin-tables.css` (SSOT) dan dikompilasi ke `css/admin.css` & `css/admin.min.css`: `#class-attendance-grid .table-wrap` kini `overflow-x: auto !important;`, tabel `table-layout: auto !important; min-width: max-content !important;`, dan kolom `STATUS` dikunci `min-width: 58px !important; width: 58px !important;` (zero-truncation). BATCH dan STUDENT NAME tetap terkunci sticky di kiri.
- **Pemulihan Status Administratif M, R, dan F**:
  - Pada [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js), baris data menyematkan `allAttempts: studentAttempts`. Evaluasi kolom `STATUS` (`theme_${tc}_status`), `RATE`, dan `POINT` kini menginspeksi seluruh riwayat attempt ujian siswa (`row.allAttempts`), mencegah attempt dengan skor murni menutupi attempt berstatus remedial (`is_remedial`), forgiven (`is_forgiven`), atau manual override (`MANUAL_OVERRIDE`).
  - Siswa berstatus khusus tampil presisi: Abdul Basit $\rightarrow$ **`M`** (Cyan), Muhamad Alifurrahman $\rightarrow$ **`R`** (Kuning), Abd. Qoyyim H. Dahuri $\rightarrow$ **`F`** (Merah), siswa lulus normal $\ge 60\%$ $\rightarrow$ **`✓`** (Hijau), dan unattempted/gagal $\rightarrow$ **`—`**.
- **Cache Busters Sync & Verification**:
  - Diperbarui cache buster di [admin.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/admin.html) ke `v576` dan [sw.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/sw.js) ke `v132`.
  - 10/10 Pillars Standarisasi Tabel lolos 100%, 16/16 Super-Headers lolos, AST 50 JS files lolos.

## [2026-11-16 01:25] — Phase 577: Question Matrix 40-Tile Modal Standardization (`#matrix-popup`)
- **Arsitektur 3-Tier Baku Modal 09**:
  - Merekonstruksi `#matrix-popup` di [test.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/test.html) dan [css/test.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/test.css) menjadi container modal 3-Tier dengan backdrop gelap (`rgba(0, 0, 0, 0.75)` + 8px blur), kotak modal `.matrix-box` berbatas tegas 1.5px netral (`border: 1.5px solid rgba(255, 255, 255, 0.16)`), dan **0 Badge Area** (clean & compact per instruksi user).
- **Title Area 40px Baku Murni Keterangan Soal**:
  - Membuang teks "QUESTION MATRIX"; judul menampilkan murni `ANSWERED = xx` (hijau `var(--grade-a)`) dan `UNANSWERED = xx` (merah `var(--grade-e)`) di baris 40px terpusat, tanpa tombol '✕' di header per Invariant 1.5.1.
- **Progress Bar Ganda & Skema Tri-Color Tile**:
  - Membuang legend grid dan menggantinya dengan progress bar dual-color (hijau untuk answered, merah untuk unanswered). Tile grid mengadopsi skema tri-color resmi: Hijau (`var(--grade-a)`) untuk answered, Kuning (`var(--grade-c)`) untuk current aktif, dan Merah (`var(--grade-e)`) untuk unanswered. Pembuangan total tip box bawah grid (`.matrix-tip-box`).
- **CTA Area 60px & Tombol Berdampingan Baku (Invariant 1.5.2 & 1.5.4)**:
  - Footer `.matrix-footer.modal-footer` terkunci di tinggi tepat **60px** dengan batas atas 1.5px netral.
  - Tombol aksi ditata berdampingan horizontal (bukan stacked vertikal):
    - Kiri: `CLOSE` (40px) di sudut kiri bawah dengan hover glow netral.
    - Kanan: `NEXT UNANSWERED →` (40px) berlatar gradien Tactical Blue dengan hover glow aktif dan ikon panah SVG murni (Zero Unicode Emojis), bebas dari clipping atau overlap pada layar sempit hingga 320px.
- **Verification**:
  - AST 50/50 JS files lolos 100% dalam 0.13s. Minifikasi CSS all passed. 10/10 Universal Table Pillars passed 100%. Single-screen zero-scroll < 40% viewport pada layar HP.

## [2026-11-16 01:15] — Phase 576: Batch Manual Score Concurrent Throughput & Fail-Safe Audit Logging
- **Akar Masalah RLS 401 audit_logs & Resolusi Permanen**:
  - Dibuat migrasi SQL [supabase/migrations/20261116000000_allow_anon_audit_logs_all_roles.sql](file:///d:/Drives/Tutor%20Tampan/TopsCore/supabase/migrations/20261116000000_allow_anon_audit_logs_all_roles.sql) yang membuka policy `anon_insert_audit_logs` untuk seluruh role valid (`ADMIN`, `tutor`, `student`), melenyapkan error `HTTP 401 (Unauthorized)` / PostgreSQL `42501` saat admin menulis log audit.
  - Ditambahkan helper terpusat `logAuditEvent` di [js/api.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/api.js) yang memvalidasi UUID `entity_id` dan menangani audit logging secara *non-blocking* dan *fail-safe* sehingga operasi esensial (seperti simpan nilai `attempts`) tidak pernah terhambat atau memicu unhandled error di browser console.
- **Optimasi Konkuren Batch Save Manual Score (15 Siswa 1–2 Detik)**:
  - Dirombak eksekusi simpan beruntun (*sequential loop* 15x lambat) di `saveAllManualDrafts` dan prompt konfirmasi [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js) menjadi pemrosesan paralel slice berkecepatan tinggi (`Promise.all` slice batch). Waktu simpan 15 siswa terpangkas dari ~25 detik menjadi **1–2 detik**.
  - Ditambahkan parameter `skipAudit: true` pada panggilan per-siswa di `adminApplyForgiven`, lalu menulis **1 log audit batch terpadu** di akhir proses, mencegah flood 15 request redundan ke `audit_logs`.
  - Pembersihan cache `clearAdminCache('attempts')` dieksekusi 1 kali setelah seluruh batch tuntas.
- **Verification**:
  - Validasi sintaks 50/50 JS lolos 100% (AST zero process spawn), 10/10 table pillars green, fast test suite lolos.

## [2026-11-16 01:10] — Phase 575: Alumni Level X & Grade X Standardization & Disconnected Eradication
- **Standarisasi Penuh Level X & Grade X untuk Alumni (Rule 2.10 SSOT)**:
  - Sesuai instruksi pengguna ("bagi Alumni, level mereka adalah X dan Grade Mereka juga X"), seluruh data siswa alumni ditetapkan berlevel **`X`** (ungu `#c084fc` / `var(--quad-d)`) pada kolom `LVL`, properti `levelName`, dan fungsi `toShortLevel` di [js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js) dan [js/api.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/api.js).
  - Menetapkan Grade siswa alumni secara mutlak menjadi Grade **`X`** (`TOPSCORE_COLORS.X: #8B5CF6`) pada `globalGrade`, `mastery.grade`, dan `calculateGrade({ isAlumni: true })` di [js/grading.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/grading.js).
- **Eradikasi Badge Merah DISCONNECTED pada Alumni**:
  - Memperbaiki logika `isOrphaned` di [js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js) dengan menambahkan guard `!isAlumni`. Batch yang tidak aktif (`batches.is_active === false`) adalah kondisi alami bagi alumni yang telah lulus, bukan catatan yatim/terputus.
  - Menambahkan pengaman `!isAlumniPanel` pada render nama siswa, memastikan badge `Disconnected` merah tidak muncul pada tabel Alumni.
- **Verification**:
  - E2E Playwright mengonfirmasi tabel Alumni menampilkan 20 baris dengan `"badges": []` (0 badge Disconnected), `"lvl": "X"`, dan `globalGrade: "X"`.
  - Seluruh 28 test suites 100% green dalam 18.40s tanpa regresi.
  - Seluruh 28 test suites 100% green dalam 22.95s tanpa regresi.

## [2026-11-16 01:00] — Phase 574: Dead Windows, Obsolete Popups & Modals Eradication
- **Eradikasi Modul Usang & Dead Code**:
  - Dihapus permanen file [js/admin/forgiven-wizard-modal.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/forgiven-wizard-modal.js) (32.7 KB), telah digantikan 100% oleh [js/admin/quick-score-wizards.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/quick-score-wizards.js).
  - Dihapus modal usang `#roster-modal` dari [admin.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/admin.html) serta CSS usang `.modal-box-roster`, `.roster-add-bar`, `.roster-table-scroll`, `.roster-table` dari [css/admin/admin-modals.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/admin/admin-modals.css).
- **Pembersihan Dead Functions & Router Modernization**:
  - Dihapus fungsi usang `window.viewClassInstanceRoster` dan impor usang dari [js/admin/class.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/class.js).
  - Dibersihkan dead duplicate code di [js/admin/tests-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/tests-management.js): stub `renderQuestions`, duplikat `renderResults`, dan modal legacy `openSessionModal` (-215 baris).
  - Dimodernisasi router `loadSection` di [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js) dengan pengalihan langsung seksi `topics` dan `question_types` ke `vocab_vault`.
  - Dinamai ulang `registerServiceWorker` menjadi `unregisterAdminServiceWorker` di [js/admin/admin-init.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/admin-init.js) mencerminkan aksi unregistrasi Service Worker pada konsol admin.
- **Perbaikan Close Trigger Popup Jawaban**:
  - Diperbaiki tombol CLOSE (`#done-answers-modal-btn`) dan click backdrop pada modal Answer Breakdown di [result.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/result.html) & [js/result.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/result.js).
- **Verification**:
  - Seluruh 50 file JS lulus validasi AST sintaks, 10/10 table pillars lulus, 28/28 test suite 100% hijau dalam 18.66s.

## [2026-11-16 00:55] — Phase 573: Manual Edit Surgical Dirty Tracking & Batch Sweep Eradication
- **Eradikasi Total DOM Sweep di `saveAllManualDrafts`**:
  - Menghapus loop DOM sweep yang menyapu seluruh elemen input tabel dan secara keliru memperlakukan input yang tidak disentuh (`!curDraft`) sebagai kotor/diedit.
  - Memastikan hanya siswa yang baris nilainya benar-benar diubah oleh pengguna yang dikirim ke backend `adminApplyForgiven`.
- **Surgical Per-Field Dirty Tracking**:
  - Menyematkan metadata nilai asli (`data-original-earned`, `data-original-score`, `data-original-pts`) pada seluruh input tabel.
  - Handler `onMatrixExamScoreChange`, `onMatrixExamPtsChange`, dan `onMatrixTaskChange` hanya menandai `isDirty: true` jika input numerik riil berbeda dari nilai asli. Jika pengguna mengembalikan nilai ke semula, status dirty otomatis dibatalkan.
- **Rollback 273 Status M Palsu di Supabase**:
  - Membersihkan efek samping batch sweep sebelumnya di Supabase: menghapus 31 attempt fiktif dan me-reset `forgiven_reason = null`, `is_forgiven = false` pada 242 attempt asli sekelas.
  - Memulihkan tampilan status centang hijau (✓) dan strip (—) pada siswa yang tidak diedit.
- **Verification**:
  - Fast AST preflight, 10/10 table pillars, spatial invariants, dan test suite 100% PASS.

## [2026-11-15 19:00] — Phase 572: Alumni Main Panel Routing & Clickability Resolution
- **Perbaikan Click & Routing Panel Alumni (SSOT)**:
  - Menyelesaikan akar masalah klik alumni macet: mendeteksi dan menghentikan endless `MutationObserver` loop pada [js/admin/admin-init.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/admin-init.js) dengan menambahkan guard `alumniItem.nextElementSibling !== null` sebelum `appendChild`, mencegah DOM detaching siklis 60fps yang menelan event klik pengguna.
  - Menambahkan handler routing resmi `case 'alumni':` pada switch statement `loadSection` ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)).
  - Mengintegrasikan section metadata `alumni: 'Alumni'` pada `sectionTitles` dan `alumni: 'BOARD'` pada `sectionDomainMap`.
  - Mengikat fail-safe direct click listener dan cursor pointer pada `#sidebar-alumni-item` di `loadSidebarPrograms()` dan menambahkan inline `onclick` di [admin.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/admin.html).
  - Mengekspos `window.loadSection = loadSection;` secara dini tepat setelah definisinya di [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js).
- **Pengenalan Sempurna 20 Siswa Alumni & Query program_status**:
  - Menambahkan kolom `program_status` ke query `adminFetchAll('students')` di [js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js).
  - Memperbarui pengenal `isStudentAlumni` agar menyertakan status `PROGRAM_COMPLETED`, sehingga seluruh 20 siswa alumni dari Supabase tampil lengkap.
- **Verification**:
  - Pengujian E2E browser mengonfirmasi 0 mutasi DOM siklis dan klik `#sidebar-alumni-item` berhasil membuka rute `#alumni`, mengaktifkan tab KPI Alumni, dan me-render 20 baris tabel siswa alumni dengan 100% data akurat.
  - Seluruh 28 test suites berjalan 100% green dalam 26.65s tanpa regresi.

## [2026-11-15 18:00] — Phase 571: Dedicated Theme STATUS Column & Pure Canonical GRADE Invariant
- **Kolom Baru STATUS & Separation of Concerns (SSOT)**:
  - Menambahkan kolom ke-5 `STATUS` di samping kolom `GRADE` pada setiap tema (`THEME A`, `B`, `C`, `D`) matriks nilai kelas ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)).
  - Kolom `STATUS` menampilkan: Centang hijau (**✓** / `check-circle`) untuk kelulusan normal ($\ge 60\%$), Kuning **`R`** untuk remedial, Merah **`F`** untuk forgiven waiver, Tactical Cyan **`M`** untuk manual override, dan Strip (**—**) untuk belum lulus/belum ujian.
  - Checkbox interaktif untuk mode `Remedi (R)` dan `Forgive (F)` Sub Panel muncul langsung di dalam kolom `STATUS`.
- **Kolom GRADE Murni Nilai Akademik**:
  - Kolom `GRADE` murni menampilkan grade kanonik siswa (**★, A, B, C, D, E** atau lock) berdasarkan skor riil dan persentase, tanpa pernah ditimpa oleh token administratif `M`, `R`, atau `F`.
- **Penyelesaian Tuntas Constraint `check_attempts_grade`**:
  - Memperbaiki `adminApplyForgiven`, `saveRowManualInput`, `saveAllManualDrafts`, dan `toggleCellRemedial` di [js/api.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/api.js) dan [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js) agar selalu menyimpan grade kanonik ('★'..'E') ke kolom `attempts.grade`, sedangkan status administratif tersimpan aman di metadata/flag (`is_forgiven`, `is_remedial`, `forgiven_reason`).
- **Styling Continuous Divider & Quadrant Header**:
  - Menetapkan continuous neutral divider 2px solid (`rgba(255,255,255,0.22)`) pada `col-test-theme-status` dan mengaplikasikan warna kuadran tematik A, B, C, D pada label header `STATUS` ([css/admin.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/admin.css)).
- **Verification**:
  - Seluruh test fast, test table invariants (10/10 pilar), super headers divider test (16/16), dan smart test runner 100% PASS.

## [2026-11-15 17:30] — Phase 570: Manual Edit Deferred Batch Save & Confirmation Prompt on Exit
- **Eradikasi Premature Auto-Save on Blur**:
  - Menghapus seluruh event `onblur` dari input nilai matriks kelas (`input-matrix-task-progress`, `input-matrix-exam-score`, `input-matrix-exam-pts`).
  - Pengguna bebas mengetik, berpindah sel (tab/klik), dan mengedit nilai banyak siswa tanpa gangguan network request di tengah proses.
- **Simpan Terpadu Hanya Saat Tombol Edit Selesai Ditekan**:
  - Semua perubahan disimpan dalam in-memory drafts (`window._manualInputState.drafts`).
  - Saat tombol **`Done Editing (Manual)`** atau tombol `Escape` ditekan, sistem mendeteksi apakah ada draft yang dimodifikasi (`hasDirtyManualDrafts`).
- **Window Prompt Save / Cancel (Dialog Konfirmasi Standar TopsCore)**:
  - Memunculkan dialog prompt konfirmasi terpadu:
    - **`Save Changes` (Cyan)**: Menyimpan seluruh draft perubahan secara batch ke database via `saveAllManualDrafts()`, mengunci kembali tabel, dan me-refresh matriks dengan toast sukses.
    - **`Cancel (Discard)` (Secondary)**: Membuang seluruh draft perubahan, mengunci kembali tabel, dan mengembalikan data asli dengan toast info.
    - Jika tidak ada perubahan, mode edit keluar langsung secara mulus tanpa memunculkan prompt.
- **Verification**:
  - Seluruh test suite lolos 100% hijau, AST syntax lolos 100%.

## [2026-11-15 17:15] — Phase 568: Direct Table Remedi & Forgive Inline Checkboxes (Zero Pop-ups, Capped R & Waiver F)
- **Eliminasi Pop-up Wizard Remedi & Forgive (Zero Pop-up Invariant)**:
  - Pop-up wizard untuk Remedi dan Forgiven dibuang total sesuai arahan pengguna.
  - Tombol Sub Panel **`Remedi (R)`** (Kuning) dan **`Forgive (F)`** (Merah) kini mengaktifkan mode inline langsung pada tabel matriks kelas ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js)).
- **Tanda Centang / Checkbox Interaktif di Samping Kolom Grade**:
  - Saat mode Remedi atau Forgive aktif, tanda centang/checkbox muncul di samping simbol nilai pada kolom `GRADE`:
    - **Remedial (R)**: Nilai setinggi apapun turun menjadi batas maksimum ujian tersebut (capped 60%) dan mendapatkan Grade **`R`** (`var(--grade-c)`). Saat uncheck, kembali normal.
    - **Forgiven (F)**: Nilai siswa berapapun tidak dinaikkan, hanya dianggap selesai dan **PASSED** saja, serta berstatus Grade **`F`** (`var(--grade-e)`). Saat uncheck, status waiver dicabut.
  - Memperbarui `theme_${tc}_grade` render dan fungsi backend `toggleCellRemedial` serta `toggleCellForgiven`.
- **Single Active Sub Panel Mode & Anti-Shift Dimensions**:
  - Tombol Manual, Remedi, dan Forgive bersifat mutually exclusive. Menekan Escape keluar dari seluruh mode edit.
- **Verification**:
  - Seluruh 28/28 regression test suites lolos 100% (48.07s).

## [2026-11-15 17:05] — Phase 567: Universal Terminology Standardization ('RATE' Metric, Zero Cohort/Assessment/Subject/Quiz)
- **Standardisasi Metrik SCORE Menjadi RATE**:
  - Kolom nilai persentase pada matriks kelas ([js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js), [js/admin/class.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/class.js), [js/admin/tests-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/tests-management.js), [js/admin/datagrid.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/datagrid.js)) resmi dinamai **`RATE`** (4-huruf pas). Membedakan secara mutlak antara persentase kelulusan/akurasi (`RATE` %) dan akumulasi poin jawaban benar (`POINT` PTS): $\text{PROG} \rightarrow \text{RATE} \rightarrow \text{POINT} \rightarrow \text{GRADE}$.
- **Pembersihan Menyeluruh Istilah Rancu Sesuai Arahan Pengguna**:
  - **Zero Cohort**: Istilah `cohort` dibersihkan 100% dan diseragamkan menjadi **`Batch`** di seluruh modal transfer, modal re-enroll, info enrollment, dan tabel duplikat.
  - **Zero Subject & Zero Class Board**: Seluruh kemunculan label `Class Board` dan `Subject` dibersihkan menjadi **`Class`**.
  - **Zero Assessment**: Seluruh istilah orphan `assessment` di dashboard siswa, halaman hasil, dan test room dinormalisasi menjadi **`Test`**.
  - **PASSED Column Standard**: Header kolom jumlah tes selesai di Student Roster diubah dari `COMPLETED` menjadi **`PASSED`** (micro `PASS`).
  - **Zero Quiz Legacy**: Seluruh sisa ID modal dan label wizard pada [js/admin/auto-gen-modal.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/auto-gen-modal.js) dibersihkan dari `quiz` menjadi **`task`**.
- **Verification**:
  - 10/10 Pilar Standardisasi Tabel lolos 100%. Spatial layout lolos 100%. AST Syntax 51/51 berkas lolos 100%. Workspace hygiene lolos 100%.

---
