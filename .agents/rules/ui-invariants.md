# TOPSCORE LMS — UI, SPATIAL & TABLE INVARIANTS RULE (SSOT)

> **Quick Index:**
> - [Bab 1: Spasial, Viewport & Workspaces](#bab-1-spasial-viewport--workspaces)
> - [Bab 2: Tipografi & Skala Font Terpusat](#bab-2-tipografi--skala-font-terpusat-dual-scale-typography-architecture)
> - [Bab 3: Desain Sistem & Warna Terpusat](#bab-3-desain-sistem--warna-terpusat)
> - [Bab 4: Arsitektur Tabel, Grid & Master Edit Mode](#bab-4-arsitektur-tabel-grid--master-edit-mode)
> - [Bab 5: Student Dashboard & Mobile Realm Invariants](#bab-5-student-dashboard--mobile-realm-invariants)
> - [Bab 6: DataGrid & Roster Table Architecture](#bab-6-datagrid--roster-table-architecture)

---

## Bab 1: Spasial, Viewport & Workspaces

### 1.0 Dual-Viewport Ecosystem: Student Mobile-Locked (430px) vs Admin Desktop-Locked (100vh) (SSOT)
- **Student Realm (Strictly Mobile-Locked Everywhere)**:
  - Seluruh alur antarmuka siswa (`index.html`, `dashboard.html`, `test.html`, `result.html`, `conversation.html`) **WAJIB tampil dalam proporsi mobile terpusat** (`max-width: 430px; margin: 0 auto;`), baik diakses melalui layar smartphone maupun layar monitor laptop/desktop PC.
  - Kanvas desktop luar menggunakan latar *deep dark slate* (`#060911`).
  - Seluruh header, sticky navigation, modal pop-up, dan fixed bottom bar (`#fixed-bottom-area`, virtual keyboard) terkunci rapat dalam koridor 430px, tidak boleh bocor melebar ke sisi monitor desktop.
  - Seluruh verifikasi UI dan screenshot untuk area siswa cukup menggunakan **1 viewport baku: Mobile Viewport**.
- **Admin & Tutor Realm (Strictly Desktop-Locked Workstation)**:
  - Seluruh workstation admin dan tutor (`admin.html`) **WAJIB berformat desktop workstation** (`height: 100vh !important`, zero outer page scroll, datagrid density tinggi, 4-pillar quadrant, Sub Panel 40px).
- **Room-Exclusive Print Protocol (Zero Print in Student Result Page)**:
  - Fitur cetak (print report, diagnostic summary, evaluasi) DILARANG berada di halaman hasil siswa (`result.html`).
  - Seluruh fitur cetak resmi hanya boleh ada dan diakses melalui **Room** (Admin Console / Tutors Room / Live Room).

### 1.1 Zero Outer Page Scroll & Table-Only Viewport Lock (AGENTS.md §2.28)
The admin workspace (`admin.html`) strictly enforces a single-screen `100vh` viewport lock with ZERO outer scrolling:
- **Table-Only Vertical Scroll**: Vertical scrolling is strictly permitted inside `.table-wrap` only (`overflow-y: auto !important; overflow-x: hidden !important;`).
- **Root Containment**: `html` and `body` strictly enforce `height: 100vh !important; max-height: 100vh !important; width: 100vw !important; max-width: 100vw !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important;`.
- **Locked Base Banner Compensation**: Fixed height of `50px` (`#bottom-ad-banner` / `.topscore-locked-banner`). `#admin-console` strictly uses `height: calc(100vh - 50px) !important; max-height: calc(100vh - 50px) !important;` for exact 100vh zero-overflow containment.
- **Flexbox Toolbar Non-Expansion**: Toolbars (`.student-roster-toolbar`, `.attendance-matrix-toolbar`, `.datagrid-toolbar`, `.admin-toolbar`) are `flex: 0 0 auto !important;`. Grid containers get `flex: 1 1 0 !important; min-height: 0 !important;`.
- **Empty Toolbar Collapse in Edit Mode OFF**: In Edit Mode OFF, action toolbars with only hidden `.edit-mode-only` buttons collapse completely (`display: none !important;`).

### 1.2 Universal 10px Container Gap Invariant
- Every card, panel, table container, workspace toolbar, and banner strictly enforces an exact 10px gap (`gap: 10px !important;` or `margin-bottom: 10px !important;`).
- A strict 10px gap separates the table container from the Sub Panel.

### 1.3 Sub Panel (Lower Panel `.workspace-lower-panel`) Architecture & In-Panel 30px Button Invariant
- **Official Terminology**: The term **"Sub Panel"** is the official designation for the Lower Panel (`.workspace-lower-panel` docked at the bottom of the workspace).
- **Strict 40px Height Alignment**: Sub Panel height is strictly **`40px`** (`height: 40px !important; min-height: 40px !important; max-height: 40px !important; line-height: 40px !important; box-sizing: border-box;`), aligning with sidebar footer (`.sidebar-footer` / Sub Corner) and 40px table headers/footers.
- **In-Panel 30px Button Invariant**: Buttons and form controls inside any panel (Sub Panel, toolbars, filter strips) strictly enforce **`30px`** height (`height: 30px !important; line-height: 28px !important; padding: 0 12px !important; font-size: 12px !important; border-radius: 4px !important;`), leaving exact 5px vertical margin.
- **Workspace Containment**: Docked flush at bottom, reserved for action buttons, summary info, search, triage pills. Table footers (`tfoot`) live 100% inside `.table-wrap` and NEVER enter Sub Panel.
- **Mandatory Sub Panel Edit Mode Button on All Table Pages**: On **EVERY workspace page or view containing a datagrid or table** (e.g. `#organization`, `#classes-hub`, `#students`, `#vocab-vault`, `#settings?tab=audit`, `#registration`, etc.), the 40px Sub Panel (`setBottomInfobar`) **MUST feature an authoritative 30px "Edit Mode" button** (`[Edit Mode]` / `[Done Editing]`). Clicking this button toggles Master Edit Mode (`window.toggleGlobalEditMode()`), activating inline Excel gridlines across the table. In-row buttons dedicated solely to "Edit" are strictly forbidden.

### 1.4 Centered Loading States & Canonical Component Invariant (Rule SSOT)
- **Zero Corner-Drifting Rule**: All loading spinners, skeletons, and async messages strictly render centered horizontally and vertically (`display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; width: 100% !important; height: 100% !important; flex: 1 1 0 !important; margin: auto !important;`). Spinners must NEVER drift into top-left or corners.
- **Canonical Helper**: All async views and tab switches MUST use `getLoadingStateHtml(message)` from `js/app.js` and `js/admin/app.js`.
- **Global & Admin CSS Redundancy**: `.topscore-loading-center` declared in both `css/style.css` and `css/admin/admin-tables.css`. Raw untracked spinners strictly prohibited.
- **Modal & Card Containment**: Inside `.modal-box`, `.modal-body`, `.modal-content`, or `.card`, automatically enforces `min-height: 180px !important;`.

### 1.5 Floating Window Architecture (Window, Wizard, Card & Popup SSOT)
- **1.5.0 Standardized "Badge Area" vs "SIGN Area" Architecture**:
  - **Badge Area** (`.badge-area` / `.modal-badge-area`): Dedicated visual status or focal container positioned specifically **ABOVE the Title Area** in floating dialogs, wizard cards, and focus windows (e.g. Pre-Exam Focus Modal, Confirm Logout Modal, Verification Dialogs). Geometry: 48px–56px (e.g. `52px × 52px`), rounded square (`border-radius: 12px–14px`), with subtle `1.5px` border.
  - **SIGN Area** (`.sign-area` / `.hazard-sign-area`): Dedicated visual hero status glyph container positioned specifically **UNDER the Title Area** (e.g. Incomplete Test Warning, Alert Windows).
    - **No Divider Rule**: The SIGN Area connects seamlessly into the body without an internal divider line (`border-bottom: none !important;`).
    - **50% Window Width Square Rule**: The icon container is strictly a **Square** scaled to **50% of the modal box width** (`width: 50% !important; aspect-ratio: 1 / 1 !important; border-radius: 20px !important;`), with a centered SVG icon scaled to 50–55% of the box, soft ambient glow, and high-contrast styling.
- **1.5.1 Standardized 60px "Title Area" Height Invariant & Striking Semantic Backgrounds (SSOT)**:
  - Official term **"Title Area"** (`.title-area` / `.modal-header`), height strictly baku **`60px`** (`height: 60px !important; min-height: 60px !important; max-height: 60px !important; flex-shrink: 0 !important;`) with prominent perimeter border `border-bottom: 1.5px solid rgba(255, 255, 255, 0.16) !important;`.
  - **Striking Semantic Area Background (Warna Aksen Terlihat Mencolok pada Kanvas Area)**:
    - Seluruh aksen warna tema/status **WAJIB diberikan ke bagian background AREANYA secara tegas dan mencolok** (bukan gradasi tipis transparan dan bukan pada font tulisannya) agar pengguna langsung mengenali tipe jendela secara instan:
      - 🔵 **Technical / Wizards / Config**: Tactical Cyan (`#0284c7` / `#0369a1`).
      - 🔴 **Danger / Permanent Delete / Kick**: Danger Red (`#b91c1c` / `#dc2626`).
      - 🟡 **Warning / Conflict Resolver**: Warning Amber/Gold (`#b45309` / `#d97706`).
      - 🔷 **Info / Student Records**: Info Navy (`#1d4ed8` / `#1e40af`).
      - 🟣 **Vault / Engine / Item Bank**: Vibrant Violet (`#6d28d9` / `#7c3aed`).
      - 🌸 **Pillar A (Admin / Master Curriculum)**: Electric Pink (`#ff2d87` / `var(--quad-a)`).
      - 🟠 **Pillar B (Board / Live Exam Sessions)**: Dark Orange (`#FF8C00` / `var(--quad-b)`).
      - 🟢 **Pillar C (Class / Active Learning)**: Electric Lime (`#95ff00` / `var(--quad-c)`).
  - **Pure 16px Left-Aligned White Title Typography (Rata Kiri Tepat di Samping Ikon)**:
    - Teks judul **MUTLAK RATA KIRI** (`text-align: left; display: flex; align-items: center;`), diposisikan tepat di sebelah kanan kotak ikon (`gap: 12px;`).
    - Ukuran font **WAJIB 16px Inter 800/900 ALL CAPS** (`font-size: 16px !important; font-family: var(--fm-font-display, 'Inter', sans-serif) !important; font-weight: 800 !important; text-transform: uppercase !important; letter-spacing: 0.04em; color: #FFFFFF !important;`).
  - **Strict Zero-Clutter Invariants (Zero Subtitle, Zero Pill, Zero Description)**:
    - **Zero Subtitle & Zero Pill in Header**: Title Area HANYA berisi Ikon dan Judul 16px. DILARANG ada teks deskripsi, subtitle, atau teks di dalam kotak/pil/tag di area header. Sisi kanan header bebas dari tombol silang `✕`.
    - **Strict Zero-Description Invariant in Modal Body**: DILARANG menambahkan kartu/panel penjelasan atau kalimat deskriptif yang tidak diminta oleh pengguna. Konten modal murni hanya kontrol form/input aktual.
  - **100% English Language Invariant**: Seluruh judul, label formulir, tombol aksi, dan status dalam modal dan CTA wajib 100% dalam bahasa Inggris murni tanpa campuran bahasa Indonesia.
- **1.5.2 Standardized 40px "Toolbar Area" & 60px "CTA Area" Invariant**:
  - Toolbar Area: 40px height with 30px controls.
  - CTA Area: 60px height (`height: 60px !important; min-height: 60px !important; max-height: 60px !important;`) with 36px–40px buttons (`height: 36px` to `40px !important;`), prominent top divider `border-top: 1.5px solid rgba(255, 255, 255, 0.16) !important;`.
  - **Distinction Between Perimeter Borders vs Internal Section Dividers**:
    - **Perimeter Boundaries (Title Area & CTA Area)**: Garis pembatas perimeter luar header dan footer wajib tegas dan jelas (`1.5px solid rgba(255, 255, 255, 0.16)`).
    - **Internal Section Dividers**: Garis pemisah internal antar-seksi dalam isi modal (misal: di bawah nama siswa atau antar-grup formulir) adalah garis pembatas seksi konten terpisah yang berkarakter halus (`1px solid rgba(255, 255, 255, 0.08)`). Keduanya memiliki fungsi struktural yang berbeda dan sengaja dipertahankan.
- **1.5.3 Single-Screen Max Height Limit**: Modals capped at **75vh–80vh** (`max-height: 80vh !important;`) with internal scroll in `.modal-body`.
- **1.5.4 Universal Floating Window Close Policy & Button Alignment Invariant (SSOT)**:
  - **Eradication of Top-Right 'X'**: Floating windows, dialogs, and modals MUST NOT render a top-right 'X' close button (`✕` / `&times;` / `.btn-close`) anywhere in the application.
  - **Universal N-Button Spatial Distribution Invariant in CTA Area (Aturan Spasial Baku N-Tombol di CTA Area SSOT)**:
    - **1 Tombol (Single Button Invariant)**: Posisi **MUTLAK DI TENGAH (Centered)** (`margin: 0 auto !important; justify-content: center !important;`). Contoh: tombol tunggal `OK`, `CONTINUE`, atau dialog informasi tunggal.
    - **2 Tombol (Dual Buttons — "Ujung dan Ujung")**: Posisi **UJUNG DAN UJUNG (Flush Opposite Ends)**. Tombol penutup/sekunder (`CLOSE`) menempel rapat di ujung KIRI (`margin-right: auto !important;`), dan tombol aksi utama (Save/Submit/Confirm) menempel rapat di ujung KANAN (`justify-content: space-between !important;`).
    - **3 Tombol (Triple Buttons — "Kiri, Tengah, Kanan")**: Posisi **KIRI, TENGAH, DAN KANAN (Left, Center, Right)**. Tombol penutup/kembali (`CLOSE` / `BACK`) di ujung KIRI, tombol aksi alternatif/sekunder (misal Reset/Preview) di TENGAH, dan tombol aksi utama (Save/Submit/Next) di ujung KANAN (`justify-content: space-between !important;`).
    - **4 Tombol atau Lebih (N-Buttons Distribution)**: Terdistribusi merata dari ujung kiri ke ujung kanan (*evenly distributed edge-to-edge* via `justify-content: space-between !important;`).
    - **Universal Left-Anchored CLOSE Button Standard (Zero 'Cancel' Invariant)**: Tombol penutup/pembatalan di sisi kiri CTA Area **WAJIB bernama `CLOSE`** (DILARANG menggunakan `Cancel`). Seluruh tombol `CLOSE` di setiap floating window, modal, wizard, dialog, dan popup **MUTLAK berada di sisi KIRI CTA**. DILARANG KERAS tombol Close bergeser ke tengah saat terdapat tombol aksi di sisi kanan.
  - **Button Size Golden Rules**:
    - Modal CTA Area: Strictly **36px–40px** height (`height: 36px` to `40px !important; padding: 0 20px !important; font-size: 14px !important; font-weight: 800 !important; border-radius: 6px !important;`). Must never exceed 40px.
    - In-Panel / Toolbar: Strictly **30px** height (`height: 30px !important; line-height: 28px !important; padding: 0 12px !important; font-size: 12px !important; border-radius: 4px !important;`). Must never exceed 30px.
  - **CTA Ghost-to-Solid Button Invariant (Standby Ghost, Hover/Click Solid Glow)**:
    - Seluruh tombol aksi pada CTA Area (baik tombol sekunder `CLOSE` maupun tombol aksi utama) **WAJIB menggunakan pola Ghost-to-Solid**:
      - **Standby (Default)**: Ghost Outline Mode (`background: transparent !important;`, border 1.5px dan teks menyala mengikuti warna semantik token).
      - **Hover / Click (:active)**: Solid Filled + Neon Glow Mode (`background: [TOKEN_COLOR] !important; color: #FFFFFF / #0F172A; box-shadow: 0 0 14px rgba(var(--token-rgb), 0.45);`).
      - **Strict Stationary Hover**: DILARANG bergerak fisik saat hover (`transform: none !important;`).
  - **Universal Hover & Click (Active) Glow**: Every button across the application MUST emit a smooth, luminous glow on `:hover` and click/press (`:active`) via dynamic `box-shadow` matched to its theme/semantic color token.

### 1.6 Architectural Anti-Freeze & Performance Invariants

#### 1.6.1 MutationObserver Loop Prevention & DOM Re-Entrancy Guard (Anti-Freeze Invariant)
Always disconnect observers or flag `isMutating` during programmatic DOM updates.

#### 1.6.2 In-Memory Reference Data Caching & Anti-Query-Waterfall Invariant
Cache structural reference data in memory; never re-query static tables on every tab switch.

### 1.7 Protokol Audit Tangkapan Layar & Visual Invariant Audit (7 Pillars SSOT)
Setiap kali pengguna mengunggah tangkapan layar (screenshot), agen WAJIB secara proaktif melakukan audit visual menyeluruh berdasarkan 7 pilar tanpa menunggu diminta:
1. **Spacing & Gaps (Strict 10px Lock)**: Jarak antar-elemen dan antar-seksi tepat 10px (bebas gap ganda 20px–30px atau phantom gaps).
2. **Card Internal Padding (Strict 10px Lock)**: Jarak konten dalam kartu ke garis border luar tepat 10px.
3. **Dual-Scale Typography Architecture**: Skala terpusat (12px, 14px, 16px, 20px, 30px, 40px); mutlak nol font sub-12px dan nol angka perantara liar (18px, 13px, 15px).
4. **Punctuation & Zero-Truncation**: Titik dua wajib menempel ke kata tanpa spasi (`Label:` bukan `Label :`), teks tidak terpotong (*zero truncation/ellipsis*).
5. **Color SSOT & Semantic Precision**: Menggunakan token resmi (`#38bdf8` Tactical Blue), dilarang menggunakan warna hijau Grade A pada status input belum terverifikasi.
6. **Language Purity (100% English)**: Seluruh label, judul, tombol, dan pesan instruksi wajib dalam bahasa Inggris murni (zero mixed languages).
7. **Clutter & Redundancy Eradication**: Mutlak nol deskripsi redundan (*Zero Subtitle Clutter* & *Zero Description Clutter*).

### 1.8 Standardized 50px Bottom Banner Invariant (`#bottom-ad-banner` / `.topscore-locked-banner`) (SSOT)
Seluruh halaman sistem TopsCore LMS (Student Realm & Admin Realm) menerapkan banner bawah permanen terkunci (**Locked Base Banner**) dengan aturan baku mutlak:
1. **Strict 50px Height Lock**: Tinggi banner bawah terkunci mati tepat **`50px`** (`height: 50px !important; min-height: 50px !important; max-height: 50px !important; box-sizing: border-box !important;`).
2. **Dual-Viewport Invariant Execution**:
   - **Student Realm (Mobile Corridor 430px)**: Banner terkunci terpusat pada koridor mobile dengan `max-width: 430px !important; margin: 0 auto !important; left: 0; right: 0; bottom: 0; position: fixed !important;`.
   - **Admin Desktop Realm (100vh Workstation)**: Banner menempel di dasar layar monitor (`width: 100vw; bottom: 0; left: 0; position: fixed !important;`). Konsol kerja `#admin-console` memotong tepat 50px (`height: calc(100vh - 50px) !important; max-height: calc(100vh - 50px) !important;`) untuk menjamin zero outer page scroll (100vh lock sempurna).
3. **Internal Spacing & Clearance**:
   - Pada halaman dengan scrollable content, body mengalokasikan padding bawah `padding-bottom: calc(50px + env(safe-area-inset-bottom, 0px)) !important;`.
   - Pada halaman hasil (`result.html`) dan ruang ujian (`test.html`) yang menerapkan *Zero-Scroll Single Screen Architecture*, jarak vertikal dari elemen/tombol terbawah (misal `#back-dashboard-btn`) ke banner terkunci tepat **10px** (`padding-bottom: 10px; gap: 10px;`).
4. **Authoritative Brand Typography & Colors**:
   - **Brand**: `TopsCore` berukuran **16px** (Level 2), font `Inter`, weight `900`, warna Tactical Blue (`#38bdf8`), letter-spacing `0.05em`, soft glow `text-shadow: 0 0 14px rgba(56, 189, 248, 0.45)`.
   - **Author**: `by Mr. Top` berukuran **14px** (Level 3), font `Inter`, weight `800`, warna White Slate (`#f8fafc`), letter-spacing `0.02em`.
   - **Background & Border**: Background `#030a12` (atau radial glow dinamis sesuai tier), border atas `1px solid rgba(56, 189, 248, 0.25)` (atau `1.5px solid rgba(var(--tier-rgb), 0.40)` saat tier glow aktif).

---

## Bab 2: Tipografi & Skala Font Terpusat (Single-Font Architecture: Inter SSOT)

### 2.0 Single-Font System Architecture (100% Inter Typeface SSOT)
TopsCore LMS strictly governs typography through a pure Single-Font Architecture:
1. **`Inter`** (`--font-sans` / `--fm-font-sans` / `--font-display` / `--fm-font-display`):
   - **Exclusive Typeface**: The font **`Inter`** (`'Inter', sans-serif`) is the single authoritative typeface used throughout the entire application for all headers, titles, cards, hero metrics, datagrids, form controls, and CTAs.
   - **Eradication of Outfit**: The previous font `Outfit` is completely eradicated and forbidden from all parts of the system.
   - **Weight Hierarchy**: Visual contrast and hierarchy are established exclusively through weights (`400` Regular for table data cells, `700` Bold for labels/subheadings, `800` Extra Bold for card headers and modal titles, `900` Black for brand hero titles and KPI landmarks).
2. **`JetBrains Mono` / Monospace** (`--font-mono` / `--fm-font-mono`):
   - **Role**: Technical, Security & Audit Data only (PIN verification displays, raw UUIDs, JSON logs).

### 2.1 Dual-Scale Typography Architecture & Authoritative 3-Level Typographic System
TopsCore LMS operates on a strict Dual-Scale Typography Architecture:
1. **Primary Structural Scale (20px – 16px – 14px – 12px SSOT & Authoritative 3-Level Typographic System)**:
   - **Level 1 (20px)**: Major Page Header (`.page-title`, `.workspace-title`), Student Greeting.
   - **Level 2 (16px)**: Title Area (Modal Header 60px), Modal/Card Titles (`.modal-title`, `.card-title`).
   - **Level 2.5 (14px Specialized)**: Modal CTA 40px Buttons (`.modal-footer .btn`), Reading/Storytelling Passages, Standalone Dropdown/Selects, Lead Subtitles.
   - **Level 3 (12px Baseline)**: Table data cells (`td`), table headers (`th`), Toolbar/Sub Panel buttons (30px), badges, form inputs, toolbars, descriptions.
2. **Secondary Functional Scale (30px & 40px Hero Metrics & Brand Hero Titles)**:
   - **Level 0 (30px KPI / Modular Hero & Brand Landmark)**: Large metrics, KPI values, session indicators, timer counter, student profile average score & grade showcase (`.metric-number`, `.kpi-val`, `#bottom-stat-avg-score`, `#stat-overall-grade-value`), serta **Judul Utama Brand Gerbang Masuk (`h1 TOPS CORE` pada Student Gate `index.html`)**. Skala 30px memberikan wibawa identitas produk yang kuat, proporsional terhadap koridor 430px, dan selaras dengan kisi kelipatan 10px ($10\text{px} \times 3$). Replaces any legacy 25px, 26px, or 35px for exact 10px grid harmony.
   - **Level 00 (40px Hero Score)**: Single Score Hero Display on final score cards and modal certificates.

### 2.2 Strict Zero Sub-12px Invariant across the entire system
- **Strict Zero Sub-12px Standard**: No font-size under 12px exists in TopsCore LMS (`min-font-size: 12px !important;`).
- All legacy 10px, 11px, 11.5px, 13px, and 15px are strictly eradicated and bound to authoritative scale tokens. Badges, toolbars, pills, captions, and domain headers are all locked to 12px.

### 2.3 Strict System-Wide Zero Emojis Invariant (Canonical Vector SVG Icons)
- Unicode emojis (e.g. 📚, 📝, ✏️, ⚠️) are permanently forbidden in UI chrome, data tables, and cards.
- All icons strictly render as clean SVG vector icons via canonical helper `getClassSvgIcon()` in `js/grading.js`.

### 2.4 Mobile 350px Standard Viewport & Responsiveness
- All dialogs, cards, and forms must render cleanly on 350px mobile viewports without clipped text.

### 2.8 Standard Student Name (`studentName`) & Dashboard-Only Title (`Mr.` / `Miss`) (AGENTS.md §2.23)
- Student names across database, sessions, admin tables, exam rooms, result screens, and exports are authentic standard names (`studentName`).
- Gender honorific titles (`Mr.` / `Miss`) and champion titles (`King` / `Queen`) are **strictly exclusive to the Student Dashboard greeting**.

---

## Bab 3: Desain Sistem & Warna Terpusat

### 3.1 Universal Single-Source Color Governance & One-Touch Propagation Invariant ("Rubah Satu Maka Rubah Semua")
Pemisahan Tegas Warna Akademik vs UI Chrome:
- **Warna Akademik / Grade / Rapor**:
  - **Semua Merah Ikut Grade E**: Error, delete, bahaya, tanda bintang wajib `*`, alert kritis WAJIB merujuk ke Grade E (`--grade-e`, `var(--grade-e)`, `TOPSCORE_COLORS.E`, `.text-fail`).
  - **Semua Kuning Ikut Grade C**: Warning, latency alert, pending, draft WAJIB merujuk ke Grade C (`--grade-c`, `var(--grade-c)`, `TOPSCORE_COLORS.C`, `.text-warning`).
  - **Semua Hijau Ikut Grade A**: Sukses, kelulusan, online, published WAJIB merujuk ke Grade A (`--grade-a`, `var(--grade-a)`, `TOPSCORE_COLORS.A`, `.text-success`).
  - **Star (★) Independence & Exclusivity**: 100% Star Pink (`--grade-star: #ff2d87` / `TOPSCORE_COLORS.STAR`). Green elements reference Grade A (`#00c000ff`), never Star.
  - **Universal Dark Badge Text**: Grade badges (`.grade-circle`) render dark slate (`#0F172A`) for all symbols.
- **UI Chrome**: Kanvas workstation `#090D16`, sidebar `#0F172A`, border `rgba(255,255,255,0.08)`, metadata slate `#94A3B8`, tactical blue `#38BDF8`, indigo `#6366F1`.
- **Standar Warna 4-Pillar (ABCD System & ABCD Tema)**:
  - Pillar A (Theme A / Exam 1): **Electric Pink** (`--quad-a`, `TOPSCORE_QUAD_COLORS.A`: `#ff2d87`).
  - Pillar B (Theme B / Exam 2): **Dark Orange** (`--quad-b`, `TOPSCORE_QUAD_COLORS.B`: `#FF8C00`).
  - Pillar C (Theme C / Exam 3): **Electric Lime** (`--quad-c`, `TOPSCORE_QUAD_COLORS.C`: `#95ff00`).
  - Pillar D (Theme D / Exam 4): **Vibrant Purple** (`--quad-d`, `TOPSCORE_QUAD_COLORS.D`: `#C084FC`).

### 3.2 Universal Inverted Percentage Scale for Negative Metrics
- Achievement metrics follow normal grade colors (`getGradeColorByScore()`).
- Negative error metrics (Error Rate, Mistake Rate, Fail Rate, Timeout Rate) MUST invert scale via `getInvertedGradeColor()`: $\le 10\%$ (Green Grade A), $11-20\%$ (Lime Grade B), $21-40\%$ (Yellow Grade C), $41-70\%$ (Orange Grade D), $> 70\%$ (Red Grade E).

### 3.3 Anti-Ambiguity Disambiguation Guard (12 System Truths)
1. **Grade Star (★) vs Theme A Pink**: `--grade-star: #ff2d87` (100% score) is strictly decoupled from `--quad-a: #ff2d87` (Theme A). Never swap or merge them.
2. **Student Name Scope**: Standard authentic name (`studentName`) system-wide; `Mr.` / `Miss` strictly exclusive to Student Dashboard greeting (Rule 2.23).
3. **Sub-Header Typography**: Super-header baris 1 bold (700); Sub-header baris 2 **REGULAR (400, strictly NOT bold)**; Spanning standalone header 60px (`rowspan="2"`).
4. **Words vs Phrases Colors**: Words = Electric Lime (`#95ff00`, Grade B / Theme C); Phrases = Dark Orange (`#FF8C00`, Grade D / Theme B).
5. **Inverted Scale on Negative Metrics**: Error/timeout/fail rate $\le 10\%$ is Green Grade A, $>70\%$ is Red Grade E via `getInvertedGradeColor()`.
6. **Regency vs City**: Regencies drop "Regency" (*East Lombok*); Cities retain "City" (*Mataram City*). Sequence: Village $\to$ District $\to$ Regency $\to$ Province.
7. **Zero Star in Table Footers**: Table summaries dilarang ada bintang `★` (`CLASS AVERAGE`, bukan `★ CLASS AVERAGE`).
8. **Continuous Neutral Dividers**: Super-header boundary vertical dividers from row 1 to footer are strictly thick 2px neutral (`rgba(255, 255, 255, 0.22)`), never colored.
9. **Zero Emojis**: Dilarang unicode emojis di UI/tabel; strictly vector SVG icons via `getClassSvgIcon()`.
10. **Zero Table Capsule & Zero Table Glow**: Seluruh isi sel tabel bebas kapsul, pill, badge, border, dan background-fill (status semantik hanya melalui warna font teks); mutlak nol glow, text-shadow, atau box-shadow di seluruh sel tabel (`AGENTS.md` §2.31 & §4.9).
11. **Level 0 (Non-Level `—`) vs Alumni (Level X)**: `Level 0` (`level_number = 0`) adalah program tanpa jenjang (single-tier, misal institusi TOP). Ditampilkan di tabel sebagai strip bersih **`—`** (slate netral `#94A3B8`), BUKAN angka "0". `Level X` (`level_number = 99`) adalah Alumni kelulusan puncak setelah Level 3, ditampilkan sebagai simbol **`X`** ungu neon (`#C084FC` / `var(--quad-d)`). Alumni mutlak dilarang menggunakan angka 0.
12. **Zero-Level Omission Invariant**: Program tanpa jenjang (Level 0) wajib meniadakan seluruh segmen level pada nama kelas, kode kelas, judul tes, dan kode tes (`EVN-VOCAB`, `Evnikom Vocabulary G1 Task - Time Name`, `EVN-VCB-G1-TASK`).

### 3.4 Ghost-to-Solid-Glow Button Invariant (Aturan Baku Tombol TopsCore SSOT)
Aturan baku antarmuka untuk seluruh tombol aksi, mode toggle, dan kontrol sistem:
1. **Standby / Inaktif = Ghost Outline Mode**:
   - Latar belakang transparan (`background: transparent`).
   - Garis tepi (*border*) tipis 1px dan teks menyala mengikuti warna semantik token yang dialokasikan (Cyan, Kuning, Merah, Hijau, Ungu, Pink).
   - Mengeliminasi *visual noise* dan kejenuhan mata pada tema gelap kanvas `#090D16`.
2. **Aktif / ON / Pressed = Solid Filled + Neon Glow Mode**:
   - Latar terisi penuh warna padat sesuai alokasi token (`#0284c7` untuk Cyan, `var(--grade-c)` untuk Kuning, `var(--grade-e)` untuk Merah, `var(--grade-a)` untuk Hijau, `var(--quad-d)` untuk Ungu).
   - Efek pendaran neon taktis: `box-shadow: 0 0 10px rgba(var(--token-rgb), 0.45)` sebagai penanda visual seketika bahwa mode sedang aktif berjalan.
3. **Aturan Kontras Teks (Luminance Contrast)**:
   - Warna latar terang (Kuning `var(--grade-c)`, Hijau `var(--grade-a)`): Teks WAJIB gelap (**`#0F172A`**).
   - Warna latar pekat (Merah `var(--grade-e)`, Cyan `#0284c7`, Ungu `var(--quad-d)`, Pink `var(--quad-a)`): Teks WAJIB putih (**`#FFFFFF`**).
4. **Anti-Layout Shift (Zero CLS)**:
   - Tombol toggle mode yang labelnya berganti (misal: `Edit Mode` $\to$ `Done Editing`) WAJIB mengunci lebar tetap (`width`, `min-width`, `max-width`) untuk mencegah pergeseran layout tombol di sekitarnya.
5. **Strict Zero-Movement Hover Invariant (Anti-Clipping & Anti-Jitter SSOT)**:
   - **DILARANG KERAS** menggunakan animasi pergerakan fisik saat hover atau ditekan (`transform: translateY(...)`, `transform: scale(...)`, `translate`, atau pergeseran margin/top).
   - Pergerakan fisik sekecil 1px (`translateY(-1px)`) terbukti membuat garis batas atas tombol (*top border*) terpotong/hilang karena membentur batas *overflow* kontainer atau terdistorsi *sub-pixel rendering*.
   - Efek hover MURNI HANYA pendaran cahaya halus (*subtle glow* via `box-shadow`) dan peningkatan saturasi warna latar tipis (*subtle background tint*), posisi fisik tombol WAJIB tetap diam 100% (*strictly stationary* `transform: none !important;`).

---

## Bab 4: Arsitektur Tabel, Grid & Master Edit Mode

### 4.1 Dimensi Tabel Baku & Native Display Lock (Universal Table Standardization Protocol & Construction Blueprint)
- **Native Table Lock**: HTML tables strictly preserve native context (`display: table`, `display: table-row-group`). Scrolling exclusively inside `.table-wrap { overflow-y: auto; }`.
- **Single Header (`thead th`)**: Height **40px** (`height: 40px !important;`), sticky at `top: 0; z-index: 10;`, font-size: 12px, font-weight: 700 (Bold).
- **Two-Tier Header Structure**:
  - Super-Header (`th.super-hdr`, `.datagrid-super-header-row th`): Height **30px**, font-weight: 700 (Bold), `top: 0; z-index: 20;`. Groups columns (`colspan >= 2`).
  - Sub-Header (`.datagrid-sub-header`, `tr:not(.datagrid-super-header-row) th`): Height **30px**, font-weight: **400 (Regular — STRICTLY NOT BOLD)**, `top: 30px; z-index: 19;`.
  - Spanning Standalone Header (`th[rowspan="2"]`, `.datagrid-rowspan-2-header`): Height **60px** (`height: 60px !important;`), sticky at `top: 0; z-index: 26;`, font-weight: 700 (Bold).
- **Table Footer (`tfoot td`)**: Height **40px**, sticky at `bottom: 0; z-index: 10;`. Empty footers collapse.
- **Data Rows (`tbody tr td`, `.standings-row`, `.completed-row`) — Universal Table Cell Regular Weight Invariant (SSOT)**:
  - **Harmonic Cadence**: 30px – 40px (`line-height: 1.3 !important;`).
  - **Font Family Wajib Inter**: Seluruh tabel data dan list baris (sel data, header, nomor urut, poin, skor, nama siswa) **WAJIB menggunakan font `Inter`** (`var(--font-sans)`, `'Inter', sans-serif`). Font display geometris membulat (`Outfit`) dihapus total dari seluruh sistem TopsCore.
  - **Font Weight Wajib Regular 400**: Di seluruh sistem TopsCore (baik Admin Desktop Workstation maupun Student Mobile Corridor), seluruh konten di dalam baris tabel (teks, nama siswa, nomor peringkat, nilai poin PTS, persentase) **MUTLAK BERBOBOT REGULAR (`font-weight: 400 !important;`)**. Tidak boleh ada huruf atau angka tebal (`700`, `800`, `900`) di dalam sel tabel.
  - **Tabular Numerics**: Semua angka dalam tabel wajib menyertakan `font-variant-numeric: tabular-nums;` untuk perataan vertikal yang presisi.
  - **Pengecualian Terisolasi**: Header kolom tabel (`thead th` single header / super-header baris 1) diizinkan `font-weight: 600–700` (sub-header baris 2 tetap regular 400), dan glif simbol grade di dalam badge/chip kecil (22px–24px) diizinkan `font-weight: 500–600` untuk kejelasan glif.

### 4.2 Aturan Text-Wrap, Universal Zero-Truncation Invariant & Standar Singkatan Header 3-Tier (SSOT)

#### 4.2.1 Universal Zero-Truncation Invariant
- Table cells, headers, cards, and dialogs MUST NEVER truncate or clip text with ellipsis (`...`) when viewport space exists.
- Calibrated column widths: `PROVINCE` $\ge 160$px, `REGENCY` $\ge 160$px, `DISTRICT` $\ge 130$px, `VILLAGE` $\ge 130$px, `EDUCATION` $\ge 140$px, `NAME` $\ge 200$px flex-primary. Single-line non-wrapped discipline (`white-space: nowrap !important;`). Multiline allowed for Vocabulary Vault phrases.

#### 4.2.2 Standar Singkatan Header 3-Tier (Full Form, 5-Letter Form, 3-Letter Form SSOT)
- **Aturan Singkatan 3 Huruf**: Konsonan murni tanpa vokal, kecuali vokal awalan kata (`EDU`, `ATT`, `AVG`, `ACT`, `ACC`, `INS`).
- **Core Classes**:
  - VOCABULARY: Full `VOCABULARY`, 5-Letter `VOCAB`, 3-Letter `VCB`.
  - SPEAKING: Full `SPEAKING`, 5-Letter `SPEAK`, 3-Letter `SPK`.
  - BASIC ENGLISH: Full `BASIC ENGLISH`, 5-Letter `BASIC`, 3-Letter `BSC`.
  - STORYTELLING: Full `STORYTELLING`, 5-Letter `STORY`, 3-Letter `STR`.
  - GRAMMAR: Full `GRAMMAR`, 5-Letter `GRAMR`, 3-Letter `GRM`.
- **REGENCY in 3-Tier Header Standards**:
  - Header Table: | 1 | **REGENCY** | `REGEN` | `RGC` | (konsonan murni).
  - Rule dropping the word 'Regency': For regencies, drop the word 'Regency' (e.g. `East Lombok`, `Central Lombok`, `Sumbawa`). For cities, retain `City` (e.g. `Mataram City`, `Surabaya City`).
  - PROVINCE: Full `PROVINCE`, 5-Letter `PROVN`, 3-Letter `PRV`.
  - DISTRICT: Full `DISTRICT`, 5-Letter `DISTR`, 3-Letter `DST`.
  - VILLAGE: Full `VILLAGE`, 5-Letter `VILLG`, 3-Letter `VLG`.
- **Common Terms**: INSTITUTION (`INS`), PROGRAM (`PRG`), BATCH (`BTC`), STUDENT (`STD`), ATTENDANCE (`ATT`), EDUCATION (`EDU`), AVERAGE (`AVG`), ACTION (`ACT`), ACCURACY (`ACC`), LEVEL (`LVL`), PERCENTAGE (`PCT`), POINTS (`PTS`), DOB, PHOTO (`PIC`), GENDER (`SEX`, tanpa singkatan 5-huruf `GNDER`), PROGRESS (`PGS`), REMEDIAL (`RMD`), QUESTIONS (`QST`), DURATION (`DRT`), TOTAL (`TTL`).
- **Points (PTS) Half-Up Whole Integer Invariant (Strict SSOT)**: Seluruh metrik dan nilai poin (Theme Exam Points, Overall Points, Class Average Points) yang memiliki desimal **`.5` ke atas WAJIB dibulatkan ke atas** menjadi bilangan bulat penuh via `Math.round()`. Tidak boleh ada nilai berkoma (`.5`, `.9`, `.2`, dsb.) pada kolom poin. Header kolom poin di semua tabel WAJIB disingkat 3-huruf baku **`PTS`** (bukan `POINT` 5-huruf) agar tidak menumpuk (*anti-crowding*).
- **STATUS ('STS'), GRADE ('GRD'), TASK & DONE Compact Header Standards (Strict SSOT)**: Sesuai direktif pengguna ("GRADE = GRD, kolom Progress ganti namanya dengan TASK, STATUS pakai nama STS, pakai DONE untuk Progress Overall"):
  - Header `STATUS` resmi menggunakan singkatan 3-huruf **`STS`** pada resolusi kolom $< 85$px agar tidak menumpuk.
  - Header `GRADE` resmi menggunakan singkatan 3-huruf **`GRD`** pada resolusi kolom $< 85$px.
  - Kolom progres tugas formatif tema resmi menggunakan nama **`TASK`** (bukan `PROGRESS`/`PRGRS`).
  - Kolom progres penyelesaian kurikulum keseluruhan resmi menggunakan nama **`DONE`** (bukan `PRGRS`, untuk mencegah kerancuan dengan singkatan Program `PRG`).
  - Struktur 5 subheader per tema: **`TASK`** | **`RATE`** | **`PTS`** | **`GRD`** | **`STS`**.
  - Struktur 3 subheader performa keseluruhan (Overall Performance): **`DONE`** | **`PTS`** | **`GRD`**.
- **Dynamic Activation via `resolveHeaderLabel`**: $< 55$px uses 3-Letter form, $55-84$px uses 3/5-Letter form, $\ge 85$px uses Full form. Full name in `title="..."` tooltip.

#### 4.2.3 Geographical & Address Sequencing
- Sequence: `VILLAGE` $\to$ `DISTRICT` $\to$ `REGENCY` $\to$ `PROVINCE`. Regency is ALWAYS to the left of Province. Age numeric-only. Recognized abbreviations (NTB, NTT, DIY).

### 4.3 Universal Master Edit Mode White Excel Gridlines & Sub Panel Edit Mode Button Invariant (AGENTS.md §2.22)
- **Mandatory Sub Panel Trigger (SSOT)**: Di setiap halaman/view pada workspace yang memiliki tabel di dalamnya, bagian Sub Panel (Lower Panel 40px) **WAJIB memiliki tombol "Edit Mode"** (yang berganti status/label menjadi `Done Editing` saat aktif). Tidak boleh ada tabel di workspace yang berdiri tanpa tombol Edit Mode di Sub Panelnya.
- **Peniadaan Tombol Edit di Baris Tabel**: Dilarang keras membuat kolom `ACTIONS` atau tombol `Edit` di dalam baris tabel hanya untuk membuka modal edit, karena pengeditan dilakukan secara terpusat melalui tombol Edit Mode di Sub Panel untuk mode inline gridline Excel.
- When Master Edit Mode is active (`body.global-edit-mode-on`), all tables render crisp white Excel gridlines (`rgba(255, 255, 255, 0.45)`).
- Global Master Edit Mode Across All Admin Pages: inputs and selects are borderless, transparent, flush, with glowing focus rings. Absolute Hiding when OFF: edit-mode-only controls completely collapse (`display: none !important;`).

### 4.4 Registered Flex-Primary Table Columns (§TABLE-FLEX-PRIMARY)
- **Student Roster**: Student Name column (`col-name`).
- **Audit Log formally registered under §TABLE-FLEX-PRIMARY**: Audit & Activity Log in `js/admin/desk.js`, Message/Details column (`col-details`).
- **Theme Manager formally ratified under §TABLE-FLEX-PRIMARY**: Theme Manager in `js/admin/vocab-vault.js`, Theme Name/Title column (`col-theme-title`).
- **Vocabulary Vault formally ratified under §TABLE-FLEX-PRIMARY**: Vocabulary Vault in `js/admin/vocab-vault.js`, Phrase/Sentence column (`col-phrase`).
- **Classes**: Class Name column (`col-class-name`).

### 4.5 Sorting Icon Spatial Clearance & In-Cell Spacing Invariant
- Sort icons (`▲`/`▼`) 10px, protected with `overflow: hidden;` and tight padding (`0 2px`) in narrow columns ($\le 55$px).

### 4.6 Universal Super-Header Continuous Neutral Divider Invariant ("Semua Garis yang Bersambung dari Header Sampai Footer Harus Tebal")
- Every vertical line originating from a super-header boundary in Row 1 down to the footer is strictly thick (**2px solid neutral: `border-right: 2px solid rgba(255, 255, 255, 0.22) !important;`**).
- Continuous across 4 tiers: Row 1 super-headers, Row 2 sub-headers (`.super-hdr-divider`), body data cells (`td.super-hdr-divider`), and summary footer cells (`tfoot td.super-hdr-divider`).
- Automated DataGrid SSOT: `DataGrid` calculates `this.dividerColKeys` from `superHeaders` colspans and injects `.super-hdr-divider` automatically. Thematic colors are strictly forbidden on vertical dividers.
- **Universal Neutral Horizontal Boundaries (Header-Body & Body-Footer)**:
  - **Header Bottom Boundary**: Garis horizontal pembatas tegas antara HEADER dan BODY wajib tebal 2px netral (`border-bottom: 2px solid rgba(255, 255, 255, 0.28) !important;`) pada baris sub-header Row 2 dan standalone spanning headers (`rowspan="2"`).
  - **Footer Top Boundary**: Garis horizontal pembatas tegas antara BODY dan FOOTER wajib tebal 2px netral (`border-top: 2px solid rgba(255, 255, 255, 0.28) !important;`) pada semua sel `tfoot td` dan `.datagrid-summary-row td`. DILARANG KERAS menggunakan warna tematik (seperti cyan `#38bdf8`, kuning, atau pink) pada garis pembatas footer.
  - **Sticky Header Stacking Protection**: Row 1 super-headers terkunci di `top: 0; z-index: 20; background: #0f172a (opaque);`, Row 2 sub-headers terkunci di `top: 30px; z-index: 19; background: #0f172a (opaque);`, dan `th[rowspan="2"]` di `top: 0; z-index: 26; background: #0f172a; height: 60px;`. Selektor Row 2 DILARANG mengecualikan `.super-hdr-divider` agar kolom pembatas tidak melompat ke `top: 0` saat scrolling vertikal.

### 4.7 Zero Star Invariant pada Footer Tabel (Zero Star in Table Footers & Summaries)
- Decorative stars (`★`) are strictly forbidden in table footers and summary rows.
- Number/batch cells are empty (`<td></td>`), labels are clean: `CLASS AVERAGE` and `BATCH AVERAGE (...)`. Star (`★`) is strictly exclusive to 100% Grade Star per Rule 2.10.

### 4.8 Proteksi Kolom Nilai & Sub Panel Action Modals (Score Column Lockdown Invariant)
- **Score Column Lockdown**: Kolom nilai (PROGRESS, RATE, POINT, GRADE) pada data matriks kelas terkunci dari input teks langsung saat Master Edit Mode aktif (`body.global-edit-mode-on`).
- **Tiga Tombol Resmi Sub Panel**: Mutasi nilai HANYA dapat dilakukan secara terkontrol melalui 3 tombol aksi berurutan di Sub Panel Student Test and Grade:
  1. **Edit Mode (Cyan `#38bdf8`)**: Mengaktifkan input/pengeditan nilai langsung pada tabel. Nilai hasil edit menghasilkan grade standar sistem (★, A, B, C, D, E) tanpa token khusus Grade M. Seluruh tombol Edit tabel di seluruh sistem berformat seragam menggunakan warna Tactical Cyan `#38bdf8`.
  2. **Remedi (Kuning `#FFFF00` / `var(--grade-c)`)**: Menghasilkan Grade R (cap 60%).
  3. **Forgive (Merah `#FF0000` / `var(--grade-e)`)**: Menghasilkan Grade F (dispensasi kelulusan).
- **Integrasi Kelulusan Alumni (Level X / Alumni)**: Sesuai Phase 611, tombol `Alumni` terpisah di Sub Panel bawah telah ditiadakan. Kelulusan menjadi alumni merupakan puncak resmi promosi level (`Level 1` $\to$ `Level 2` $\to$ `Level 3` $\to$ `Level X / Alumni`), yang dieksekusi secara terpadu melalui tombol interaktif **`LEVEL UP`** di kolom tabel atau **`LEVEL UP ALL (X Eligible)`** di Sub Panel.

### 4.9 Zero Table Capsule & Zero Table Glow Invariant (SSOT)
- **Larangan Mutlak Kapsul/Pill/Badge Pada Seluruh Isi Sel Tabel & Grid Data (No Capsule / Pill / Badge in Table Cells)**:
  - Seluruh isi sel tabel (`table td`, `.datagrid-table td`, `.table-wrap td`, `.classes-hub-grid-row`, `.tree-grid-row`, `.matrix-table td`, floating window tables, modal student lists `#modal-theme-open-session`, `#modal-theme-live-monitor`, dll.) **MUTLAK TIDAK BOLEH** menggunakan kapsul, pill, badge, background fill/box (`background: transparent !important;`), border kotak (`border: none !important;`), maupun padding badge (`padding: 0 !important;`).
  - **Yang Boleh Berwarna HANYA Font Teks Saja**: Arti semantik status (seperti `Active` hijau `var(--grade-a)`, `Inactive` merah `var(--grade-e)`, `Hold` kuning `var(--grade-c)`, `Published` hijau, `Draft` netral, `EXAM` orange, `TASK` indigo, status kesiapan ujian `Tasks Completed (Exam Ready)`, `Tasks Incomplete`, status eligibility, dll.) HANYA boleh direpresentasikan melalui warna font teks tipografi (`color: ...`). Font di dalam tabel tampil flat menyatu dengan baris tabel tanpa kapsul pembungkus.
- **Mutlak Nol Glow (Zero Text-Shadow & Zero Box-Shadow) di Seluruh Sistem**:
  - Dilarang keras menggunakan efek GLOW, text-shadow, box-shadow, filter glow, atau pendaran neon apa pun pada teks maupun elemen di dalam isi sel tabel di SELURUH SISTEM (`text-shadow: none !important; box-shadow: none !important; filter: none !important;`).
  - Teks di dalam tabel wajib terbaca tegas, bersih (*crisp, matte*), kontras tinggi, dan bebas blur atau efek neon yang mengaburkan ketajaman angka dan huruf.

### 4.10 Standar Formula Kode Kelas: PROGRAM-LEVELCLASS (SSOT)
- **Formula Baku**: `PROGRAM-LEVELCLASS` (contoh bertingkat: `CMP-3VOCAB`, `CMP-1BASIC`, `CMP-2SPEAK`).
- **Segmen 1 (PROGRAM)**: Singkatan program 3-huruf resmi (`CMP` = Camp, `EVN` = Evnikom, `SHR` = Sheraton, `TMT` = Tamata, `EXP` = English Explorer).
- **Separator**: Tanda hubung (`-`).
- **Segmen 2 (LEVELCLASS)**: Angka level belajar murni langsung digabung dengan singkatan kelas tanpa spasi dan tanpa huruf 'L' (contoh: `3VOCAB`, `1BASIC`, `1STORY`, `2SPEAK`).
- **Pengecualian Program Tanpa Jenjang (Level 0 / Zero-Level Omission Invariant)**:
  - Pada program yang tidak memiliki jenjang bertahap (seperti seluruh program institusi TOP: Evnikom, Sheraton, Tamata), angka level **wajib ditiadakan (dianggap kosong)** sehingga formulanya murni `PROGRAM-CLASS` (contoh: `EVN-VOCAB`, `SHR-VOCAB`, `TMT-VOCAB`). Dilarang keras mencantumkan angka 1 (`EVN-1VOCAB`).
- **Penegakan Sistemik**:
  - Kolom `classes.code` di database Supabase wajib mematuhi formula ini.
  - Tampilan pada tabel admin (`admin.html#classes-hub`) dan auto-generator/placeholder di `crud-modals.js` wajib menghasilkan format ini.

---

## Bab 5: Student Dashboard & Mobile Realm Invariants

### 5.1 Student Dashboard Dual-Panel Invariants (Dock Panes A & B)
- **Pane A: Standings / Leaderboard Invariant**:
  - **Compact Headers (SSOT)**: `NO`, `STUDENT NAME`, `PTS`, `GRD`.
  - **Dashboard Honors & Royal Titles**: Gelar kehormatan siswa (`King` / `Queen` untuk Rank 1, serta `Mr.` / `Miss` untuk siswa lainnya) **wajib ditampilkan pada tabel peringkat (leaderboard) Student Dashboard** sebagai elemen kebanggaan dan motivasi siswa.
  - **Global PTS & Global Grade Harmonization**: Nilai PTS dan chip GRD pada leaderboard diambil dari **Global Points** (`mastery.totalPoints`) dan **Global Grade** (`st.grade`). Warna teks angka PTS wajib menggunakan warna `theme.color` (warna Grade Global siswa) agar identik dan selaras dengan badge Grade di sampingnya.
- **Pane B: Completed Tests Invariant**:
  - **Strict 5-Column Grid Geometry**: Header dan baris data terkunci tepat 5 kolom (`grid-template-columns: 28px 1fr 48px 40px 38px !important;`) dengan header ringkas: `NO`, `TEST NAME`, `SCORE`, `GRD`, `ACT`. Dilarang menggabungkan class yang menimpa kolom ke-5 (`GRADERETRY` terlarang permanen).
  - **Aturan Baku Sub-Row 7 Nilai Terbaik Task (Top-7 Highest Attempts)**: 7 kotak kecil (pips) di bawah nama Task pada Completed Tests adalah **daftar 7 nilai riwayat percobaan terbaik (Top 7 Highest Scores, sorted descending)**, di mana nilai akhir dan grade task adalah rata-rata dari ke-7 percobaan tersebut. **Aturan ini bersifat permanen dan DILARANG diubah menjadi rainbow pips**.

### 5.2 Hero Score & Grade Showcase Card Invariant (Unified Hero Format SSOT)
- **Universal Unified Hero Card Standard (Dashboard, Profile Modal & Result Page SSOT)**:
  - Seluruh kartu profil hero siswa (`dashboard.html`, `#studentProfileModal`, `result.html`) menerapkan tata letak baku terpadu:
    1. **Spacing & Padding (Strict 10px Lock)**: Jarak antar-kartu 10px dan jarak konten internal ke border luar tepat **10px** (`padding: 10px !important; gap: 10px !important;`).
    2. **Avatar Kolom Kiri**: Avatar foto/SVG siswa berukuran baku **70px × 70px** (`.hero-avatar-wrap`, `.hero-avatar-img`), border halus `1.5px solid rgba(255, 255, 255, 0.12)`, terpusat dan rapi.
    3. **Identitas Siswa Kolom Tengah**:
       - Nama Siswa: **20px Inter Bold** (`font-size: 20px; font-weight: 800; font-family: var(--font-display, 'Inter', sans-serif); line-height: 1.2;`).
       - Baris Metadata: **12px Inter Regular** (`font-size: 12px; font-weight: 400; color: #94A3B8; margin-top: 4px;`) dengan format `Batch • Class • Level`.
    4. **Dual Metrics Kolom Kanan**:
       - Pasangan metrik `RATE %` dan `PTS` ditampilkan horizontal dengan angka **20px Inter Bold**, warna angka dinamis mengikuti warna Grade siswa (`theme.color`).
       - Label metrik: **12px Inter** berbobot regular warna slate (`#94A3B8`).
    5. **Badge Grade Bulat**: Lingkaran grade berdiameter **44px** (`.grade-circle-44`), latar belakang mengikuti warna token Grade siswa, huruf Grade berbobot `font-weight: 800` warna **Dark Slate (`#0F172A`)** untuk seluruh simbol (★, A, B, C, D, E).
    6. **Zero Subtitle Clutter**: Dilarang menampilkan teks subtitle deskriptif yang redundan di bawah nama siswa.
- **Standar Metrik Hero Individual**: Metrik hero tunggal pada kartu nilai (`#bottom-stat-avg-score` dan `#stat-overall-grade-value`) menerapkan **Level 0 Hero Metric (30px, Inter 800 Extra Bold)** dengan tabular-nums dan soft ambient glow.

### 5.3 Student Gate & Cascade Login Invariants (index.html SSOT)
- **Hierarki Alur Cascade Login**:
  - Alur baku pemilihan identitas siswa: `INSTITUTION -> PROGRAM -> BATCH -> STUDENT -> PIN`.
  - Setiap seksi yang telah dipilih **wajib tetap terlihat dalam kondisi terlipat (`.selected`)**, lengkap dengan label nilai yang dipilih dan tombol `Change` (`.cascade-change-btn`) untuk memungkinkan siswa mengubah pilihan.
  - Pemanggilan fungsi reset cascade wajib menargetkan langkah persis di bawahnya (`resetFrom('program')` saat institusi dipilih), DILARANG memanggil reset pada langkah yang baru saja dipilih karena akan melenyapkan elemen tersebut dari DOM visual (`max-height: 0`).
- **Brand Header, Tipografi & Badge Logo Buku Vektor SVG**:
  - **Judul Brand `TOPS CORE`**: Wajib menggunakan **30px (`font-size: 30px; font-weight: 900; font-family: 'Inter', sans-serif; line-height: 1.1; margin: 0;`)** — **Level 0 Brand Hero Landmark**. Skala 30px memberikan wibawa identitas visual (*brand presence*) yang kokoh pada gerbang masuk portal, berharmonisasi secara matematis dengan kelipatan 10px ($10\text{px} \times 3$), serta proporsional dalam koridor mobile 430px. Dilarang menggunakan font perantara liar 18px (*Strict Zero Sub-Scale Invariant*).
  - **Eliminasi Subtitle (Zero Subtitle Clutter)**: Deskripsi atau subtitle di bawah judul (`Student Gate — Sign in to continue`) **DIHAPUS SECARA PERMANEN**. Menghilangkan elemen teks dekoratif yang berulang, memaksimalkan ruang vertikal *above-the-fold*, dan menjaga tampilan gerbang login tetap bersih (*ultra-lean, high-focus*).
  - **Badge Logo Buku Vektor SVG**: Menggunakan ikon vektor SVG Open Book resmi TopsCore di dalam lingkaran berdiameter 52px (`.brand-badge-wrap`) dengan aksen Tactical Cyan (`#38bdf8`), background `rgba(56, 189, 248, 0.12)`, border `1.5px solid rgba(56, 189, 248, 0.35)`, pendaran `box-shadow: 0 0 16px rgba(56, 189, 248, 0.25)`, dan animasi mengambang halus (*smooth float animation*). Jarak bawah ke judul tepat 10px (`margin-bottom: 10px;`).
- **Universal 10px Container Gap & Card Internal Padding Invariant**:
  - Jarak antar seksi kartu cascade dan banner pada mobile corridor 430px terkunci tepat **10px** (`.login-wrapper { gap: 10px; }`, `.cascade-section.selected { margin-bottom: 10px; }`, `.cascade-section.unlocked { margin-bottom: 10px; }`, `.remember-me-banner { margin: 10px 0; }`).
  - Jarak elemen internal kartu ke garis batas luar (*Card Internal Padding*) terkunci tepat **10px** (`.cascade-header { padding: 10px; gap: 10px; }`, `.cascade-body { padding: 10px; }`, `.pin-section { padding: 10px; }`).
- **Options Grid Dynamic Shrink-to-Fit Invariant (Anti-Gap Kosong)**:
  - Kontainer daftar pilihan (`.options-grid`) **DILARANG KERAS** menggunakan `min-height` statis (seperti `min-height: 120px;`).
  - Kontainer wajib menyesuaikan tinggi secara dinamis mengikuti jumlah item (*shrink-to-fit*), sehingga bila hanya ada 1 atau 2 opsi (misal institusi/program `TOP`), jarak tepi bawah tombol ke garis pembatas luar kotak tetap **tepat 10px presisi**.
  - Batas maksimal kontainer adalah `max-height: 35vh` dengan scrollbar tipis 4px.
- **Kapsul Pilihan Siswa / Dropdown Touch Target Invariant (Level 2.5 SSOT)**:
  - Tombol kapsul pilihan siswa (`.opt-card`) wajib memiliki tinggi sentuh ergonomis mobile minimal **44px** (`min-height: 44px; padding: 11px 14px; border-radius: 10px; gap: 12px;`) untuk melenyapkan kesan sempit/gepeng.
  - Teks nama siswa wajib berukuran **14px** (Level 2.5 Specialized Selects, `font-weight: 600; line-height: 1.35;`) dengan bullet dot vektor Tactical Cyan (`#38bdf8`) dan aksen glow halus saat aktif (`.active`).
  - Label seksi terlipat (`.cascade-label`) menggunakan `min-width: 68px; max-width: 90px; width: auto;` agar nama siswa terpilih pada baris atas tidak terpotong elipsis (`...`) sesuai aturan *Universal Zero-Truncation Invariant*.
- **Netralisasi Digit PIN (False Affordance Prevention)**:
  - Kotak digit PIN yang sedang diketik (`.pin-digit.filled`) **DILARANG KERAS menggunakan warna Hijau** (`#00c000`). Hijau eksklusif untuk Grade A (Sukses / Kelulusan). Digit PIN yang belum terverifikasi wajib berkarakter **Netral** (White/Slate Subtle: `border-color: rgba(255, 255, 255, 0.35); background: rgba(255, 255, 255, 0.08); color: #fff;`).
  - Kotak aktif/fokus dan tombol "Sign In" wajib menggunakan token **Tactical Blue** (`#38bdf8` / `#0284c7`), bukan warna ungu legacy.
- **Strict Zero-Movement Hover Invariant**:
  - Tombol opsi siswa (`.opt-card:hover`) wajib *strictly stationary* (`transform: none !important;`), efek interaksi murni berupa subtle glow dan background tint.
- **Strict Zero Emojis Invariant**:
  - Seluruh kotak pencarian wajib menggunakan ikon vektor SVG Search murni, unicode emoji `🔍` dilarang keras.
- **PWA Install Banner Ergonomics & Placement Invariant**:
  - Banner instalasi PWA (`.pwa-install-banner`) disisipkan tepat di antara judul brand `TOPS CORE` dan kartu langkah 1 (`#sec-institution`).
  - Menggunakan `margin: 0;` dengan gap vertikal 10px otomatis dari `.login-wrapper`.
  - Teks wajib menggunakan **Bahasa Inggris murni**: Judul "Install TopsCore App" (14px Inter Bold, Level 2.5 SSOT), tombol aksi "Install" dan "Later" (`pwa-btn-dismiss`).
  - Dilarang menampilkan teks deskripsi tambahan di bawah judul (*Zero Description Clutter*) untuk menjaga profil kartu tetap ramping (~48px) dan menghemat ruang vertikal layar.

### 5.4 Universal 2-Line Test Title Architecture (SSOT Format 2 Baris Judul Tes)
- **Cakupan Universal**: Seluruh tampilan antarmuka yang menyajikan judul tes (Dashboard Next Assignment Card, Header Ruang Ujian `test.html`, Halaman Hasil `result.html`, dan Modal Konfirmasi/Pilihan Komponen Tes) WAJIB menggunakan format **2 Baris Terpisah**:
  - **Baris 1 (Jenis & Kode Tes)**: `[TASK/EXAM] [CODE]` (misal `Task A1`, `Task B1`, `Task C1`, `Exam A`, `Exam D`). Ditampilkan tebal (Inter 800), kontras tinggi (Putih `#FFFFFF` / `#F8FAFC`). Zero Class Redundancy: Nama kelas (seperti `2nd Vocabulary`) dilarang diulang pada Baris 1 karena sudah terpampang jelas di header atas halaman.
  - **Baris 2 (Nama Tema dan/atau Topik)**: `[NAMA_TEMA/TOPIK]` (misal `Greetings & Basics`, `Shopping & Choosing Products`, `World of Work`, `Cooking Class`). Ditampilkan di baris kedua secara mandiri dengan warna Tactical Blue (`#38bdf8`) atau Slate Cerah (`#cbd5e1`), huruf rapi tanpa pemotongan teks atau elipsis (*zero truncation*).
- **Formula Resolusi**: Menggunakan helper resmi `formatTestDisplay(test)` (`line1` untuk Baris 1, `line2` untuk Baris 2) dan `formatTestTitleHtml(test)`.
- **Invarian Eliminasi Truncation**: Pembagian 2 baris ini menjamin judul tes dapat terbaca utuh 100% pada koridor mobile 350px–430px tanpa terpotong elipsis (`...`).

---

## Bab 6: DataGrid & Roster Table Architecture

### 6.1 Single-Responsibility Columns & Profile Click Invariant
- **Student Roster Column Sequence**: `LEVEL` (46px) $\to$ `PHOTO` (46px, 30px avatar) $\to$ `GENDER` (68px) $\to$ `NAME` (flex-primary, min 200px) $\to$ `DOB` (110px) $\to$ `AGE` (50px) $\to$ `EDUCATION` (140px) $\to$ `VILLAGE` (130px) $\to$ `DISTRICT` (130px) $\to$ `REGENCY` (160px) $\to$ `PROVINCE` (160px) $\to$ `CLASS EXAMS` (4 $\times$ 74px) $\to$ `SECURITY` [`PIN` (70px) $\to$ `STATUS` (90px)].
- **SECURITY Category Invariant (SSOT)**: Kolom `PIN` dan `STATUS` disatukan di bawah super-header bersama bertajuk **`SECURITY`** (`colSpan: 2`), dengan posisi `PIN` berada tepat di sebelah kiri dari `STATUS`. Kolom `PIN` menampilkan kode PIN otentik siswa dengan font monospace untuk memudahkan identifikasi dan verifikasi langsung oleh admin.
- Profile modal opens on student photo/name click in Active Students tab. Actions column purged.

### 6.2 Single-Line Compact Program Chips
- Standardized 3–4 letter uppercase codes: `CMP` (Camp), `EVN` (Evnikom), `SHR` (Sheraton), `EXP` (Explorer). Native tooltip for full name.

### 6.3 DataGrid Default Configuration & Zero Neon Glow
- `DataGrid` defaults to `bulkActions: false`. Neon box-shadow glows purged; dividers render as crisp flat lines.

### 6.4 Level Promotion & Passing Threshold Invariant (NEXT Action Invariant SSOT)
- **Kepatuhan Ambang Batas Resmi (Grade C >= 60%)**: Penentuan kelayakan promosi level siswa (`isEligibleNext` / tombol `NEXT`) WAJIB mematuhi 100% ambang batas minimum kelulusan resmi TopsCore, yaitu **Grade C (skor $\ge 60\%$)** atau `min_score` pada metadata tes, dispensasi administratif resmi (**Grade F** / `is_forgiven = true`), atau Remedial yang diselesaikan (**Grade R**) per [`AGENTS.md` §2.4.1](file:///AGENTS.md#241-level-promotion--passing-threshold-invariant-ssot-aturan-baku-promosi-level).
- **Mutlak Nol Ambang Batas Arbitrer**: Dilarang keras menerapkan angka batas hardcoded di luar SSOT (seperti angka liar `70%`). Siswa yang telah mencapai Grade C (60%–79%) telah berstatus Lulus (*Enough*) dan mutlak berhak naik level bersamaan dalam satu rombongan belajar tanpa ada yang tertahan.
- **Aktivasi Tombol Aksi NEXT di Roster**: Tombol `NEXT` di Sub Panel atau toolbar roster otomatis aktif (*enabled*) hanya saat seluruh siswa aktif dalam batch telah memenuhi batas kelulusan (lulus, remedial tuntas, atau dispensasi Grade F). Jika masih ada siswa yang belum tuntas, tombol dinonaktifkan (*disabled*) dengan tooltip alasan.

### 6.5 Arsitektur Tampilan Level: Level 0 (Non-Level `—`), Level 1–3, dan Alumni (Level X) SSOT
- **Prinsip Identitas Level Resmi**:
  1. **Level 0 (Non-Level Programs)**: Khusus untuk program yang sejak awal tidak memiliki jenjang bertahap (single-tier, misal seluruh program pada institusi TOP: Evnikom, Sheraton, Tamata Persada). Pada seluruh tabel workstation admin (kolom `LVL`) dan dashboard siswa, Level 0 ditampilkan sebagai tanda strip bersih **`—`** (slate netral `#94a3b8`). Dilarang keras menampilkan angka 0 atau teks "L0" di layar agar tidak membingungkan siswa dan tutor.
  2. **Level 1–3 (Jenjang Reguler)**: Ditampilkan sebagai `1st`, `2nd`, `3rd` dengan tabular numbers tebal (`color: #f8fafc; font-weight: 700; font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap;`).
  3. **Level X (Alumni Graduation)**: Siswa yang telah lulus dari Level 3 resmi berstatus **Level X** (`level_number = 99` di database, `program_status = 'ALUMNI'`). Ditampilkan sebagai huruf **`X`** tebal berwarna ungu neon (`#c084fc` / `var(--quad-d)`). Alumni mutlak DILARANG menggunakan angka 0.
- **In-Memory & Inline Master Edit Mode Select Control**:
  - Kontainer dropdown select inline level (`.student-inline-select`) di tabel workstation menyajikan 5 opsi terstruktur:
    - `value="0"`: `—` (Non-Level)
    - `value="1"`: `1st` (1st Level)
    - `value="2"`: `2nd` (2nd Level)
    - `value="3"`: `3rd` (3rd Level)
    - `value="99"`: `X` (Alumni)
  - Memilih Level 0 (`value="0"`) mutlak tidak mengubah status siswa menjadi alumni. Status alumni eksklusif terikat pada `value="99"`.
- **Aturan Promosi Level (Promotion & Level Up Gating)**:
  - Siswa program Non-Level (Level 0) **tidak memiliki tombol promosi / LEVEL UP / NEXT** (`isEligibleNext = false`) karena kurikulum mereka adalah program tunggal selesai (*single-tier completion*).
  - Siswa Level 3 yang telah lulus seluruh ujian dipromosikan langsung ke status Alumni / Level X (`level_number = 99`, `program_status = 'ALUMNI'`).
- **Aturan Penamaan Kosong (Zero-Level Omission Invariant)**:
  - Seluruh program tanpa jenjang meniadakan (menganggap kosong) segmen angka level pada:
    - **Nama Kelas**: `Evnikom Vocabulary`, `Sheraton Vocabulary`, `Tamata Vocabulary` (dilarang menggunakan `1st`).
    - **Kode Kelas**: `EVN-VOCAB`, `SHR-VOCAB`, `TMT-VOCAB` (dilarang menggunakan `EVN-1VOCAB`).
    - **Judul Tes**: `Evnikom Vocabulary G1 Task - Time Name`, `Evnikom Vocabulary G Exam - General` (dilarang menggunakan `1st`).
    - **Kode Tes**: `EVN-VCB-G1-TASK`, `EVN-VCB-G-EXAM`, `EVN-VCB-G2-TASK` (dilarang menggunakan `EVN-1VCB-...`).
- **Student Dashboard & Class Lobby Invariants**:
  - **Non-Level**: Badge Level pada header dashboard disembunyikan/ditiadakan (dianggap kosong), dan seluruh kelas program dapat diakses langsung.
  - **Alumni**: Mempertahankan *Lifetime Universal Access* ke seluruh kelas program di Class Lobby dan Dashboard, dengan badge bertuliskan **`ALUMNI`** / **`X`** dan aura ungu neon.

