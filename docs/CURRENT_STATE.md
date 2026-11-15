# CURRENT STATE — TOPSCORE LMS

> **Purpose:** Single authoritative restart point across sessions and restarts.
> **Last Updated:** 2026-11-16 03:55 UTC+8
> **Current Phase:** Phase 600 [COMPLETE] — Student Dashboard Dual-Panel Invariants & Tri-Font System Codification
> **Status:** READY FOR USER CONFIRMATION & REVIEW (ALL TESTS 100% GREEN)

---

## 1. Active System Architecture & Invariants

- **Student Dashboard Dual-Panel Invariants & Header Standardization (Phase 600 — SSOT §5.1 & §2.0)**:
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
  - **Peningkatan Tipografi Hero Score & Grade Showcase Card (§2.1)**:
    - Di [css/dashboard.css](file:///d:/Drives/Tutor%20Tampan/TopsCore/css/dashboard.css), `#bottom-stat-avg-score` (Rate %) dan `#stat-overall-grade-value` (Grade) pada kotak 56px profil resmi dinaikkan ke skala **Level 0 Hero Metric (26px, Outfit 800 Extra Bold)** dengan tabular-nums dan drop-shadow bercahaya, melenyapkan tampilan font kecil/tipis default.

- **Overall Performance Completion Header Standardization (Phase 599 — SSOT Rule §2.9)**:
  - **Penggantian Header Progress Overall Menjadi DONE**: Sesuai instruksi pengguna ("pakai DONE"):
    - Header kolom persentase capaian kurikulum pada Overall Performance resmi diganti dari `PROGRESS` / `PRGRS` menjadi **`DONE`** di [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js) dan didaftarkan di [js/admin/datagrid.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/datagrid.js).
    - Mencegah kerancuan singkatan `PRGRS` / `PRG` dengan istilah Program.
    - Struktur 3 subheader Overall Performance: **`DONE`** (Completion Rate %), **`PTS`** (Total Points whole integer), dan **`GRD`** (Overall Grade).
  - **Codification**: Dibukukan resmi di [AGENTS.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/AGENTS.md) §2.9 dan [.agents/rules/ui-invariants.md](file:///.agents/rules/ui-invariants.md) §4.2.

- **Modules Warehouse Architecture & Class Allocation System (Phase 598)**:
  - **Unifikasi 'Module' SSOT & Alokasi Kelas Interaktif**: Unifikasi istilah mesin evaluasi ujian menjadi **`Module`** (`m1` s/d `m8`), meniadakan kerancuan legacy *Answer Type* dan *Method*. Pemetaan disiplin kelas terpadu (Vocabulary, Storytelling, Speaking, Basic English) langsung pada setiap kartu modul.
  - **Penyusunan Vertikal Atas ke Bawah Pil Kelas (10px Gap Rhythm)**: Pil kelas pada seksi `APPLICABLE CLASSES` disusun vertikal penuh (`gap: 10px !important;`) dari atas ke bawah (Vocabulary, Storytelling, Speaking, Basic English) selebar 100% kartu.
  - **Tata Letak Simetris 4-Over-4 & Kepatuhan UI Invariants (§1.5)**: Grid kartu modul dikunci strictly 4 kolom di atas dan 4 kolom di bawah (`repeat(4, minmax(0, 1fr))`). Standardized Badge Area 48px × 48px (§1.5.0) di bagian atas kartu. Standardized 40px Title Area (§1.5.1) dengan judul ALL CAPS dan subtitle terintegrasi kode modul (`M1 — VISUAL CONTEXT`, dst).
  - **Sub Panel Elevation & Topbar Header**: Pil ringkasan kelas direlokasi ke **Sub Panel 40px** (`#admin-bottom-infobar`) setinggi 28px per pil, dan judul/deskripsi dinaikkan ke **Topbar** workstation, melenyapkan seluruh header ganda dari area konten.
  - **Wizard Test Lockdown**: `getAllowedModulesForClass()` di `modules.js`, `test-builder.js`, dan `crud-modals.js` otomatis mengunci pilihan modul pada form tes sesuai kelas terpilih.

- **Theme Status Column Quadrant Color Alignment (Phase 597 — SSOT Rule §2.10.1)**:
  - **Penyelarasan Warna Header STS Sesuai Kuadran Tema**: Sesuai instruksi pengguna ("bagian status warna disamakan dengan yang tema"):
    - `col-test-theme-status-a` (Pink `var(--quad-a, #ff2d87)`).
    - `col-test-theme-status-b` (Orange `var(--quad-b, #ff8c00)`).
    - `col-test-theme-status-c` (Lime `var(--quad-c, #95ff00)`).
    - `col-test-theme-status-d` (Violet `var(--quad-d, #c084fc)`).
  - Kelima subheader di bawah tiap tema (`TASK`, `RATE`, `PTS`, `GRD`, `STS`) kini 100% seragam memancarkan warna kuadran tema masing-masing.
  - **Codification**: Dibukukan resmi di [AGENTS.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/AGENTS.md) §2.10.1 dan [.agents/rules/ui-invariants.md](file:///.agents/rules/ui-invariants.md) §4.1.

- **Module Card Refinements (Phases 595–596 — SSOT §1.5)**:
  - **Module Code in Subtitle & Top Header Purge**: Kode modul (`M1` s/d `M8`) disematkan di depan subtitle, baris header atas kartu dieliminasi.
  - **Vertical Stacked Classes (10px Gap)**: Kontainer `.module-class-pills` disusun vertikal dengan gap 10px tepat setinggi 28px per pil.

- **5-Pillar Theme Matrix Compact Header Standardization (Phase 594 — SSOT Rule §2.9)**:
  - **Standarisasi 5 Subheader Tema (Strict 3–4 Karakter)**: Sesuai direktif user ("GRADE = GRD lalu kolom Progress ganti namanya dengan TASK saja, STATUS ini pakai nama STS, simpan dalam aturan"):
    1. Formative Progress $\to$ **`TASK`** (bukan `PROGRESS`/`PRGRS`).
    2. Exam Rate % $\to$ **`RATE`**.
    3. Exam Points $\to$ **`PTS`** (Math.round whole integer).
    4. Exam Grade $\to$ **`GRD`** (bukan `GRADE`).
    5. Administrative Status $\to$ **`STS`** (bukan `STATUS`).
  - **Eradikasi Total Penumpukan Teks**: Di seluruh resolusi layar workstation desktop, kelima subheader per tema kini muat 100% tanpa tumpang tindih maupun pelipatan baris teks (*zero text wrapping / anti-crowding*).
  - **Codification**: Dibukukan resmi di [AGENTS.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/AGENTS.md) §2.9 dan [.agents/rules/ui-invariants.md](file:///.agents/rules/ui-invariants.md) §4.2.

- **Sub Panel Elevation of Summary Pills & Zero Duplicate Headers on Modules View (Phase 593)**:
  - **Relokasi Pil Ringkasan Alokasi Modul ke Sub Panel (Gambar 2)**: Sesuai direktif user ("bagian gambar 2 harusnya di sub panel"), 4 pil ringkasan kelas (`Vocabulary`, `Storytelling`, `Speaking`, `Basic English`) beserta indikator `● ACTIVE` resmi dipindahkan 100% ke dalam **Sub Panel 40px** (`#admin-bottom-infobar` via `setBottomInfobar`). Tiap pil dikunci tepat setinggi **28px** sesuai In-Panel 30px Control Invariant (§1.3) dengan zero overflow.
  - **Eradikasi Header Duplikat pada Konten Area (Gambar 3)**: Judul dan deskripsi modul (`Modules (Core Engines) — Central warehouse for the 8 core AI evaluation engines`) dinaikkan langsung ke **Topbar** workstation (`#topbar-tabs-container`), melenyapkan blok header usang dari tubuh area konten.
  - **Strict 100vh Workstation Containment & Zero Scroll**: Area konten modul kini 100% didedikasikan langsung untuk kisi 8 kartu (4 atas, 4 bawah) dengan margin dan padding universal 10px (§1.2), fit sempurna di workstation desktop tanpa scrolling berlebih.
  - **Kepatuhan Penuh Tipografi & Badge Area**: Ikon SVG membingkai badge 48px × 48px (§1.5.0), Title Area 40px ALL CAPS (§1.5.1), Applicable Classes interaktif, dan tombol 30px ghost-to-glow (§3.4).

- **Strict Zero-Movement Hover Invariant & Border Clipping Eradication (Phase 592 — SSOT Rule §3.4)**:
  - **Eliminasi Total Animasi Gerak pada Hover Tombol**: Sesuai instruksi pengguna ("saat tombolnya hover di atas tombolnya ada animasi bergerak sedikit, itu membuat bagian garis atas tombol malah hilang,,, jangan buat gerak, cukup efek sedikit pendar yang ada"), seluruh efek pergeseran fisik (`transform: translateY(-1px)`, `translateY(-2px)`, `scale(...)`) pada state `:hover` dan `:active` tombol telah dieliminasi total dari seluruh stylesheet (`css/style.css`, `css/admin.css`, `css/admin/` modules, `css/dashboard.css`, `css/test.css`, `css/result.css`, `css/auth.css`).
  - **Pemberantasan Clipping Garis Atas Tombol**: Pergeseran 1px ke atas sebelumnya menyebabkan garis batas atas tombol (*top border*) terpotong oleh batas *overflow* kontainer (tabel, sub panel, popover, modal). Dengan posisi tombol yang diam murni (*strictly stationary* via `transform: none !important;`), garis batas atas tetap utuh dan presisi.
  - **Pendaran Halus (Subtle Glow)**: Efek interaksi hover kini murni mengandalkan pendaran cahaya halus (*subtle glow* via `box-shadow`) dan peningkatan kecerahan/saturasi warna latar tipis (*subtle background tint*).
  - **Codification**: Dibukukan resmi di [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md) §3.4 butir 5.

- **4-Over-4 Module Grid Layout & Standardized Badge / 40px Title Area Card Architecture (Phase 591)**:
  - **Tata Letak Baku 4 Kolom di Atas & 4 Kolom di Bawah**: Layout grid kartu modul dikunci strictly **`grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px;`**, memastikan baris 1 memuat `Description`, `Selection`, `Written`, `Spoken` dan baris 2 memuat `Speech`, `Monologue`, `Dialogue`, `Interview`.
  - **Standardized Badge Area Invariant (1.5.0)**: Wadah simetris 48px × 48px beradius 12px, border 1.5px, latar tint taktis `rgba(56, 189, 248, 0.1)`, dan pendaran halus `box-shadow: 0 0 12px rgba(56, 189, 248, 0.15)`.
  - **Standardized 40px Title Area Invariant (1.5.1)**: Tepat setinggi **40px** (`height: 40px !important;`) dengan pembatas perimeter tegas `border-bottom: 1.5px solid rgba(255, 255, 255, 0.16) !important;`. Judul modul terpusat ALL CAPS (16px Outfit Bold) dan stacked subtitle 12px uppercase tactical cyan.
  - **Applicable Classes Interactive Badges**: Tiap kartu memiliki kontrol pil kelas interaktif (Vocab, Storytelling, Speaking, Basic English) yang tersinkronisasi ke wizard tes.
  - **In-Panel / Card Action Button (Invariant 1.3 / 3.4)**: Tombol *Configure Engine & Classes* tepat 30px dengan ghost outline pada standby dan neon glow padat saat hover/active.

- **Interactive Module-to-Class Allocation Section & Card UI Invariant Standardization (Phase 590)**:
  - Setiap kartu modul di [js/admin/modules.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/modules.js) memiliki seksi **`APPLICABLE CLASSES`** dengan pil status interaktif untuk 4 disiplin kelas resmi: Vocabulary (Lime), Storytelling (Orange), Speaking (Cyan), Basic English (Purple).
  - Wizard pembuatan/pengeditan tes di [js/admin/test-builder.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/test-builder.js) membaca langsung konfigurasi aktif ini, mencegah human error memilih modul yang salah untuk disiplin kelas tertentu.

- **Ghost-to-Solid-Glow Button Invariant (Phases 584 & 588 — SSOT Rule §3.4)**:
  - **Inaktif / Standby = Ghost Outline**: Seluruh tombol aksi berlatar transparan (`background: transparent !important;`) dengan border 1px dan teks sesuai warna token semantik masing-masing.
  - **Aktif / Pressed / Toggled = Solid Filled + Neon Glow**: Saat ditekan (`:active`, `.active`, `.is-active`), tombol berubah menjadi solid filled sesuai token warnanya dengan pendaran neon taktis `box-shadow: 0 0 10px rgba(..., 0.45)`.
  - **Strict Contrast Rule**: Latar terang (Kuning & Hijau) wajib teks gelap `#0F172A`; latar pekat (Merah, Cyan, Ungu) wajib teks putih `#FFFFFF`.

- **Alumni Multi-Program Top Panel Tabs & Level/Grade X Standards (Phases 575, 579, 581, 588)**:
  - Program diurutkan menurut abjad A-Z (`Camp`, `Evnikom`, `Sheraton`), dan tab master `All Alumni` ditaruh paling akhir.
  - Seluruh alumni wajib berlevel **`X`** (ungu `#c084fc`) dan Grade **`X`** (`TOPSCORE_COLORS.X: #8B5CF6`). Siswa berlevel X otomatis berstatus Alumni.
  - Status `INACTIVE` mutlak merah `var(--grade-e)` / `#FF0000`. Red badge `DISCONNECTED` dihilangkan total untuk alumni.

- **Single-Screen 100vh Viewport Lock & Spatial System (SSOT in `ui-invariants.md`)**:
  - `html, body { height: 100vh; overflow: hidden; }`. Canonical 10px container gap, 40px Sub Panel (`.workspace-lower-panel`), 30px in-panel buttons, 40px Title Area, 60px CTA Area. Zero sub-12px font. Zero emojis in data tables/cards; strictly vector SVG icons via `getClassSvgIcon()`.

---

## 2. Recent Active Milestones (Latest Rolling Window)

- **Phases 594–598**: 5-Pillar Theme Matrix Header Standardization (`TASK`, `RATE`, `PTS`, `GRD`, `STS`), Modules Warehouse 4-Over-4 Architecture, and Vertical Class Allocations.
- **Phases 591–593**: Sub Panel Elevation of Summary Pills, Zero Duplicate Headers, and Strict Zero-Movement Hover Discipline.
- **Phases 587–590**: Module SSOT Unification (m1–m8) and Ghost-to-Solid-Glow Button Invariant System-Wide Audit.

---

## 3. Standing Governance & Execution Boundaries

- **Rule 0.1.1 (Strict Git Gate)**: NEVER execute `git commit` or `git push` autonomously.
- **Rule 0.1.2 (Strict UTF-8 & No PowerShell File Editing)**: Use native tools or Node.js only.
- **Rule 2.10 (Authoritative Color SSOT)**: Zero raw hex codes. CSS variables & `TOPSCORE_COLORS`.
- **Rule 2.27 (Authoritative Entity Standards)**: Strict status & type taxonomies.

---

## 4. Verification Suite Status

- **Preflight & Fast AST Check**: 50/50 JavaScript files PASS in 0.10s (`npm run test:fast`).
- **Module & API Import Health**: 47/47 JS modules PASS 100% (`npm run test:imports`).
- **Universal Table Standardization**: 10/10 Pillars PASS with 100% integrity (`npm run test:table`).
- **Automated Spatial & Visual Invariants**: ALL checks PASS 100% (`npm run check:spatial`).

---

## 5. Next Exact Action

- **Target Besok**: Pembuatan kelas baru dan pengujian integrasi alokasi modul terpilih (Class-to-Module Mapping Wizard). Seluruh perubahan tersimpan rapi dan uncommitted di working tree per Rule 0.1.1.
