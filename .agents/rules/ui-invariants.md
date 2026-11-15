# TOPSCORE LMS — UI, SPATIAL & TABLE INVARIANTS RULE (SSOT)

> **Quick Index:**
> - [Bab 1: Spasial, Viewport & Workspaces](#bab-1-spasial-viewport--workspaces)
> - [Bab 2: Tipografi & Skala Font Terpusat](#bab-2-tipografi--skala-font-terpusat-dual-scale-typography-architecture)
> - [Bab 3: Desain Sistem & Warna Terpusat](#bab-3-desain-sistem--warna-terpusat)
> - [Bab 4: Arsitektur Tabel, Grid & Master Edit Mode](#bab-4-arsitektur-tabel-grid--master-edit-mode)
> - [Bab 5: Lampiran Spesifik Komponen & Roster](#bab-5-lampiran-spesifik-komponen--roster)

---

## Bab 1: Spasial, Viewport & Workspaces

### 1.1 Zero Outer Page Scroll & Table-Only Viewport Lock (Rule 2.23)
The admin workspace (`admin.html`) strictly enforces a single-screen `100vh` viewport lock with ZERO outer scrolling:
- **Table-Only Vertical Scroll**: Vertical scrolling is strictly permitted inside `.table-wrap` only (`overflow-y: auto !important; overflow-x: hidden !important;`).
- **Root Containment**: `html` and `body` strictly enforce `height: 100vh !important; max-height: 100vh !important; width: 100vw !important; max-width: 100vw !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important;`.
- **Locked Base Banner Compensation**: Fixed height of `60px` (`#bottom-ad-banner`). `#admin-console` strictly uses `height: calc(100vh - 60px) !important; max-height: calc(100vh - 60px) !important;` for exact 100vh zero-overflow containment.
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

### 1.4 Centered Loading States & Canonical Component Invariant (Rule SSOT)
- **Zero Corner-Drifting Rule**: All loading spinners, skeletons, and async messages strictly render centered horizontally and vertically (`display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; width: 100% !important; height: 100% !important; flex: 1 1 0 !important; margin: auto !important;`). Spinners must NEVER drift into top-left or corners.
- **Canonical Helper**: All async views and tab switches MUST use `getLoadingStateHtml(message)` from `js/app.js` and `js/admin/app.js`.
- **Global & Admin CSS Redundancy**: `.topscore-loading-center` declared in both `css/style.css` and `css/admin/admin-tables.css`. Raw untracked spinners strictly prohibited.
- **Modal & Card Containment**: Inside `.modal-box`, `.modal-body`, `.modal-content`, or `.card`, automatically enforces `min-height: 180px !important;`.

### 1.5 Floating Window Architecture (Window, Wizard, Card & Popup SSOT)
- **1.5.0 Standardized "Badge Area" Invariant (Above Title Area / Modal Top Hero)**:
  - Official term **"Badge Area"** (`.badge-area` / `.modal-badge-area`): Dedicated visual status or focal container positioned specifically **ABOVE the Title Area** in floating dialogs, wizard cards, and focus windows (e.g. Pre-Exam Focus Modal, Confirm Logout Modal, Verification Dialogs).
  - Geometry & Sizing: Height/dimension standardized to **48px–56px** (e.g. `52px × 52px`), rounded square (`border-radius: 12px–14px`) or circular, mathematically centered (`display: flex; align-items: center; justify-content: center; margin: 0 auto;`).
  - Strict Vector Standard: Strictly houses crisp SVG vector icons (Zero Unicode Emojis per Rule 5.2), with subtle `1.5px` border and soft ambient semantic glow matched to its role.
- **1.5.1 Standardized 40px "Title Area" Invariant & Authoritative Perimeter Borders**:
  - Official term **"Title Area"** (`.title-area` / `.modal-header`), height exactly **`40px`** (`height: 40px !important; flex-shrink: 0 !important;`) with prominent border `border-bottom: 1.5px solid rgba(255, 255, 255, 0.16) !important;`.
  - Typography: 16px Outfit Bold (`font-size: 16px !important; font-family: var(--fm-font-display, 'Outfit', sans-serif) !important; font-weight: 700 !important;`).
  - **Centered Title Invariant**: Title text mathematically centered (`text-align: center !important; justify-content: center !important;`). Strictly ZERO close buttons or '✕' icons in the Title Area.
  - **Mandatory Uppercase Invariant (ALL CAPS)**: Title text MUST be **ALL CAPS (`text-transform: uppercase !important;`)** with `letter-spacing: 0.02em;`.
- **1.5.2 Standardized 40px "Toolbar Area" & 60px "CTA Area" Invariant**:
  - Toolbar Area: 40px height with 30px controls.
  - CTA Area: 60px height (`height: 60px !important; min-height: 60px !important; max-height: 60px !important;`) with 36px–40px buttons (`height: 36px` to `40px !important;`), prominent top divider `border-top: 1.5px solid rgba(255, 255, 255, 0.16) !important;`.
  - **Distinction Between Perimeter Borders vs Internal Section Dividers**:
    - **Perimeter Boundaries (Title Area & CTA Area)**: Garis pembatas perimeter luar header dan footer wajib tegas dan jelas (`1.5px solid rgba(255, 255, 255, 0.16)`).
    - **Internal Section Dividers**: Garis pemisah internal antar-seksi dalam isi modal (misal: di bawah nama siswa atau antar-grup formulir) adalah garis pembatas seksi konten terpisah yang berkarakter halus (`1px solid rgba(255, 255, 255, 0.08)`). Keduanya memiliki fungsi struktural yang berbeda dan sengaja dipertahankan.
- **1.5.3 Single-Screen Max Height Limit**: Modals capped at **75vh–80vh** (`max-height: 80vh !important;`) with internal scroll in `.modal-body`.
- **1.5.4 Universal Floating Window Close Policy & Button Glow Invariant (SSOT)**:
  - **Eradication of Top-Right 'X'**: Floating windows, dialogs, and modals MUST NOT render a top-right 'X' close button (`✕` / `&times;` / `.btn-close`) anywhere in the application.
  - **Bottom-Left CTA Close Button**: If a close or cancel option exists, it MUST be rendered as an explicit button in the **CTA Area (Modal Footer) at the bottom-left corner** (`align-self: flex-start; margin-right: auto;`).
  - **Button Size Golden Rules**:
    - Modal CTA Area: Strictly **36px–40px** height (`height: 36px` to `40px !important; padding: 0 16px !important; font-size: 12px !important; font-weight: 700 !important; border-radius: 6px !important;`). Must never exceed 40px.
    - In-Panel / Toolbar: Strictly **30px** height (`height: 30px !important; line-height: 28px !important; padding: 0 12px !important; font-size: 12px !important; border-radius: 4px !important;`). Must never exceed 30px.
  - **Universal Hover & Click (Active) Glow**: Every button across the application MUST emit a smooth, luminous glow on `:hover` and click/press (`:active`) via dynamic `box-shadow` matched to its theme/semantic color token.

### 1.6 Architectural Anti-Freeze & Performance Invariants
- **1.6.1 MutationObserver Loop Prevention & DOM Re-Entrancy Guard**: Always disconnect observers or flag `isMutating` during programmatic DOM updates.
- **1.6.2 In-Memory Reference Data Caching & Anti-Query-Waterfall Invariant**: Cache structural reference data in memory; never re-query static tables on every tab switch.

---

## Bab 2: Tipografi & Skala Font Terpusat (Dual-Scale Typography Architecture)

### 2.1 Dual-Scale Typography Architecture & Authoritative 3-Level Typographic System
TopsCore LMS operates on a strict Dual-Scale Typography Architecture:
1. **Primary Structural Scale (20px – 16px – 14px – 12px SSOT & Authoritative 3-Level Typographic System)**:
   - **Level 1 (20px)**: Major Page Header (`.page-title`, `.workspace-title`), Student Greeting.
   - **Level 2 (16px)**: Title Area (Modal Header 40px), Modal/Card Titles (`.modal-title`, `.card-title`).
   - **Level 2.5 (14px Specialized)**: Modal CTA 40px Buttons (`.modal-footer .btn`), Reading/Storytelling Passages, Standalone Dropdown/Selects, Lead Subtitles.
   - **Level 3 (12px Baseline)**: Table data cells (`td`), table headers (`th`), Toolbar/Sub Panel buttons (30px), badges, form inputs, toolbars, descriptions.
2. **Secondary Functional Scale (30px & 40px Hero Metrics)**:
   - **Level 0 (30px KPI / Modular Hero)**: Large metrics, KPI values, session indicators, timer counter (`.metric-number`, `.kpi-val`). Replaces deprecated 25px and 35px for exact 10px grid harmony.
   - **Level 00 (40px Hero Score)**: Single Score Hero Display on final score cards and modal certificates.

### 2.2 Strict Zero Sub-12px Invariant across the entire system
- **Strict Zero Sub-12px Standard**: No font-size under 12px exists in TopsCore LMS (`min-font-size: 12px !important;`).
- All legacy 10px, 11px, 11.5px, 13px, and 15px are strictly eradicated and bound to authoritative scale tokens. Badges, toolbars, pills, captions, and domain headers are all locked to 12px.

### 2.3 Strict System-Wide Zero Emojis Invariant (Canonical Vector SVG Icons)
- Unicode emojis (e.g. 📚, 📝, ✏️, ⚠️) are permanently forbidden in UI chrome, data tables, and cards.
- All icons strictly render as clean SVG vector icons via canonical helper `getClassSvgIcon()` in `js/grading.js`.

### 2.4 Mobile 350px Standard Viewport & Responsiveness
- All dialogs, cards, and forms must render cleanly on 350px mobile viewports without clipped text.

### 2.8 Standard Student Name (`studentName`) & Dashboard-Only Title (`Mr.` / `Miss`) (Rule 2.8 / AGENTS.md §2.23)
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

### 3.3 Anti-Ambiguity Disambiguation Guard (10 System Truths)
1. **Grade Star (★) vs Theme A Pink**: `--grade-star: #ff2d87` (100% score) is strictly decoupled from `--quad-a: #ff2d87` (Theme A). Never swap or merge them.
2. **Student Name Scope**: Standard authentic name (`studentName`) system-wide; `Mr.` / `Miss` strictly exclusive to Student Dashboard greeting (Rule 2.23).
3. **Sub-Header Typography**: Super-header baris 1 bold (700); Sub-header baris 2 **REGULAR (400, strictly NOT bold)**; Spanning standalone header 60px (`rowspan="2"`).
4. **Words vs Phrases Colors**: Words = Electric Lime (`#95ff00`, Grade B / Theme C); Phrases = Dark Orange (`#FF8C00`, Grade D / Theme B).
5. **Inverted Scale on Negative Metrics**: Error/timeout/fail rate $\le 10\%$ is Green Grade A, $>70\%$ is Red Grade E via `getInvertedGradeColor()`.
6. **Regency vs City**: Regencies drop "Regency" (*East Lombok*); Cities retain "City" (*Mataram City*). Sequence: Village $\to$ District $\to$ Regency $\to$ Province.
7. **Zero Star in Table Footers**: Table summaries dilarang ada bintang `★` (`CLASS AVERAGE`, bukan `★ CLASS AVERAGE`).
8. **Continuous Neutral Dividers**: Super-header boundary vertical dividers from row 1 to footer are strictly thick 2px neutral (`rgba(255, 255, 255, 0.22)`), never colored.
9. **Zero Emojis**: Dilarang unicode emojis di UI/tabel; strictly vector SVG icons via `getClassSvgIcon()`.
10. **Git Commit Gate**: "No commit until I say so!" All changes remain uncommitted in working tree for user review.

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
- **Data Rows (`tbody tr td`)**: Harmonic cadence of **30px – 40px** (`line-height: 1.3 !important;`).

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
- **STATUS Non-Abbreviation Invariant (Strict SSOT)**: Header dengan judul **`STATUS` DILARANG KERAS disingkat** menjadi 5-huruf (`STATS`) atau 3-huruf (`STT`/`STS`) di seluruh sistem. Singkatan `STATS` atau `STT` menimbulkan kerancuan makna dengan istilah statistik (*statistics* / *stats*). Di semua resolusi kolom, judul kolom STATUS wajib tetap ditampilkan penuh sebagai **`STATUS`**.
- **Dynamic Activation via `resolveHeaderLabel`**: $< 55$px uses 3-Letter form, $55-84$px uses 5-Letter form, $\ge 85$px uses Full form. Full name in `title="..."` tooltip. Header `STATUS` terkecualikan dari penyingkatan dan selalu bernilai `'STATUS'`.

#### 4.2.3 Geographical & Address Sequencing
- Sequence: `VILLAGE` $\to$ `DISTRICT` $\to$ `REGENCY` $\to$ `PROVINCE`. Regency is ALWAYS to the left of Province. Age numeric-only. Recognized abbreviations (NTB, NTT, DIY).

### 4.3 Universal Master Edit Mode White Excel Gridlines Invariant (Rule 2.24)
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
  1. **Manual (Cyan `#38bdf8`)**: Menghasilkan Grade M (`GRADE_PALETTE['M']`).
  2. **Remedi (Kuning `#FFFF00` / `var(--grade-c)`)**: Menghasilkan Grade R (cap 60%).
  3. **Forgive (Merah `#FF0000` / `var(--grade-e)`)**: Menghasilkan Grade F (dispensasi kelulusan).
- **Tombol Alumni (Ungu `#8b5cf6` / `#a855f7`)**: Terletak di Sub Panel / Infobar Student Roster, membuka single-step confirmation untuk meluluskan siswa terpilih langsung ke status Alumni.

---

## Bab 5: Lampiran Spesifik Komponen & Roster

### 5.1 Single-Responsibility Columns & Profile Click Invariant
- **Student Roster Column Sequence**: `LEVEL` (46px) $\to$ `PHOTO` (46px, 30px avatar) $\to$ `GENDER` (68px) $\to$ `NAME` (flex-primary, min 200px) $\to$ `DOB` (110px) $\to$ `AGE` (50px) $\to$ `EDUCATION` (140px) $\to$ `VILLAGE` (130px) $\to$ `DISTRICT` (130px) $\to$ `REGENCY` (160px) $\to$ `PROVINCE` (160px) $\to$ `CLASS EXAMS` (4 $\times$ 74px) $\to$ `SECURITY` [`PIN` (70px) $\to$ `STATUS` (90px)].
- **SECURITY Category Invariant (SSOT)**: Kolom `PIN` dan `STATUS` disatukan di bawah super-header bersama bertajuk **`SECURITY`** (`colSpan: 2`), dengan posisi `PIN` berada tepat di sebelah kiri dari `STATUS`. Kolom `PIN` menampilkan kode PIN otentik siswa dengan font monospace untuk memudahkan identifikasi dan verifikasi langsung oleh admin.
- Profile modal opens on student photo/name click in Active Students tab. Actions column purged.

### 5.2 Single-Line Compact Program Chips
- Standardized 3–4 letter uppercase codes: `CMP` (Camp), `EVN` (Evnikom), `SHR` (Sheraton), `EXP` (Explorer). Native tooltip for full name.

### 5.3 DataGrid Default Configuration & Zero Neon Glow
- `DataGrid` defaults to `bulkActions: false`. Neon box-shadow glows purged; dividers render as crisp flat lines.
