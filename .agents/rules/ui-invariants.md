# TOPSCORE LMS — UI, SPATIAL & TABLE INVARIANTS RULE (SSOT)

> **Quick Index:**
> - [Bab 1: Spasial, Viewport & Workspaces](#bab-1-spasial-viewport--workspaces)
> - [Bab 2: Tipografi & Skala Font Terpusat](#bab-2-tipografi--skala-font-terpusat)
> - [Bab 3: Desain Sistem & Warna Terpusat](#bab-3-desain-sistem--warna-terpusat)
> - [Bab 4: Arsitektur Tabel, Grid & Master Edit Mode](#bab-4-arsitektur-tabel-grid--master-edit-mode)
> - [Bab 5: Lampiran Spesifik Komponen & Roster](#bab-5-lampiran-spesifik-komponen--roster)

---

## Bab 1: Spasial, Viewport & Workspaces

### 1.1 Zero Outer Page Scroll & Table-Only Viewport Lock
The admin workspace (`admin.html`) strictly enforces a single-screen `100vh` viewport lock with ZERO outer scrolling:
- **Table-Only Vertical Scroll**: Vertical scrolling is strictly permitted inside `.table-wrap` only (`overflow-y: auto !important; overflow-x: hidden !important;`).
- **Root Containment**: `html` and `body` strictly enforce `height: 100vh !important; max-height: 100vh !important; width: 100vw !important; max-width: 100vw !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important;`.
- **Locked Base Banner Compensation**: The locked base footer (`#bottom-ad-banner` / `.topscore-locked-banner`) has a fixed height of `60px`. Therefore, `#admin-console` strictly uses `height: calc(100vh - 60px) !important; max-height: calc(100vh - 60px) !important;` so total page height equals exactly `100vh` with zero pixel overflow.
- **Flexbox Toolbar Non-Expansion**: Toolbars (`.student-roster-toolbar`, `.attendance-matrix-toolbar`, `.datagrid-toolbar`, `.admin-toolbar`) must be `flex: 0 0 auto !important; height: auto !important; min-height: 0 !important;`. Only grid containers receive `flex: 1 1 0 !important; min-height: 0 !important;`.
- **Empty Toolbar Collapse in Edit Mode OFF**: When Edit Mode is OFF, any action toolbar containing only hidden `.edit-mode-only` buttons must completely collapse (`display: none !important; margin: 0 !important; padding: 0 !important;`).

### 1.2 Universal 10px Container Gap Invariant
- Every card, panel, table container, workspace toolbar, and banner across all admin screens strictly enforces an exact 10px gap (`gap: 10px !important;` or `margin-bottom: 10px !important;`).
- A strict 10px gap separates the table container from the Sub Panel.

### 1.3 Sub Panel (Lower Panel `.workspace-lower-panel`) Architecture
- **Official Terminology**: The term **"Sub Panel"** is the official designation for the Lower Panel (`.workspace-lower-panel` docked at the bottom of the workspace).
- **Strict 40px Height Alignment**: The Sub Panel strictly has an exact height of `40px` (`height: 40px !important; min-height: 40px !important; max-height: 40px !important; line-height: 40px !important; box-sizing: border-box;`), seamlessly aligning with the 40px sidebar footer (.sidebar-footer / Sub Corner on the left) and harmoniously matching the 40px top toolbars and 40px table headers/footers.
- **In-Panel 30px Button Invariant**: Whenever buttons or interactive form controls are placed inside a panel (including the 40px Sub Panel, toolbar panels, and filter strips), they strictly enforce a **`30px`** height (`height: 30px !important; min-height: 30px !important; max-height: 30px !important; line-height: 28px !important; padding: 0 12px !important; font-size: 12px !important; border-radius: 4px !important; box-sizing: border-box !important;`). In a 40px panel, a 30px button leaves an exact 5px top and 5px bottom margin (`(40px - 30px) / 2 = 5px`), ensuring perfect vertical centering without touching panel boundaries.
- **Workspace Containment & Payload**: Docked flush at the bottom (0px margin to bottom banner and side panel), reserved exclusively for action toolbars (`[Next →]`, `[Add Student]`, `[Import Excel/CSV]`), summary info, search, and triage pills. All tables (`thead`, `tbody`, `tfoot`) live 100% inside `.table-wrap`. Table footers (`tfoot`) must NEVER enter the Sub Panel.

### 1.4 Centered Loading States & Canonical Component Invariant (Rule SSOT)
- **Zero Corner-Drifting Rule**: All loading spinners, skeleton loaders, and asynchronous status messages in Tutor's Room and across TopsCore must strictly render centered horizontally and vertically (`display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; width: 100% !important; height: 100% !important; flex: 1 1 0 !important; margin: auto !important; box-sizing: border-box !important;`). Spinners must NEVER drift into the top-left or corners.
- **Canonical Helper**: All dynamic asynchronous views, section changes, tab switches, and modal scans must use `getLoadingStateHtml(message)` (exported from `js/app.js` and `js/admin/app.js`, and attached to `window.getLoadingStateHtml`).
- **Global & Admin CSS Redundancy**: The `.topscore-loading-center` component rules MUST be declared in both `css/style.css` (universal baseline) and `css/admin/admin-tables.css` (workstation styles), guaranteeing immediate centering even during partial page loads or cache cascades.
- **Strict Prohibition of Raw Untracked Spinners**: Never inject bare `<div class="spinner"></div>` directly into tables, containers, or content areas without the canonical centering wrapper (`.topscore-loading-center`).
- **Modal & Card Containment**: Inside `.modal-box`, `.modal-body`, `.modal-content`, or `.card`, `.topscore-loading-center` automatically respects `min-height: 180px !important;` to prevent dialog blowout while maintaining complete vertical and horizontal centering.
- **CSS Syntax & Brace Integrity Guard**: CSS stylesheets MUST maintain 100% valid bracket and brace balance at all times to prevent CSS rule block discard by browser engines.
- **Professional Direct Messages**: All loading status messages must use professional, direct English (e.g., "Loading...", "Scanning Recycle Bin...", "Fetching audit trail...").

### 1.5 Floating Window Architecture (Window, Wizard, Card & Popup SSOT)

#### 1.5.1 Standardized 40px "Title Area" Invariant (Baris Judul Floating Window & Card)
- **Official Terminology**: Baris judul atas pada seluruh floating window, dialog modal, wizard, card (misal: Session Card), dan popup secara resmi dan baku disebut **"Title Area"** (`.title-area` / `.title-panel` / `.modal-header`).
- **Tinggi Standar 40px (Single-Line Title)**: Wajib berukuran tepat **`40px`** (`height: 40px !important; min-height: 40px !important; max-height: 40px !important; line-height: 40px !important; box-sizing: border-box !important; flex-shrink: 0 !important;`).
- **Garis Pembatas Bawah (Bottom Divider)**: Wajib memiliki garis pembatas bawah `border-bottom: 1px solid var(--clr-border, rgba(255, 255, 255, 0.08)) !important;` yang identik secara visual dengan garis pembatas atas pada CTA Area.
- **Tipografi Standar Title (Family A Level 2: Title)**:
  - **Ukuran Font**: **`16px`** (`font-size: 16px !important;`)
  - **Keluarga Font**: **`Outfit`** (`font-family: var(--fm-font-display, 'Outfit', sans-serif) !important;`)
  - **Weight**: **`700` (Bold)**
  - **Letter Spacing**: `0.02em`
  - **Warna**: Putih `#ffffff` (`var(--fm-text-primary)`) atau aksen semantik domain/tema.
  - **Alignment Vertikal & Horizontal**: Terpusat sempurna secara horizontal dan vertikal (`display: flex !important; align-items: center !important; justify-content: center !important; text-align: center !important; padding: 0 16px !important; position: relative !important;`).
  - **Matematika Spasial**: Di dalam wadah 40px, teks 16px menghasilkan margin vertikal simetris $12\text{px}$ (`(40 - 16) / 2 = 12px`), dan tombol tutup silang (`×` / Close 30px) diposisikan secara absolut di sisi kanan (`position: absolute; right: 16px; top: 50%; transform: translateY(-50%);`) agar tidak menggeser titik tengah matematis judul.
- **Perataan Terpusat Wajib (Centered Title Invariant)**:
  - SEMUA teks judul di dalam **Title Area** WAJIB berada di tengah-tengah (**Centered** / `text-align: center !important; justify-content: center !important;`). Dilarang meletakkan judul merapat ke kiri (*left-aligned*) jika tidak diimbangi elemen simetris.
  - Tombol tutup (`✕` / Close 30px) diposisikan absolut di sisi kanan sehingga judul utama tetap terkunci tepat di sumbu tengah (*center axis*) jendela dialog.
- **Kapitalisasi Wajib ALL CAPS (Mandatory Uppercase Invariant)**:
  - Seluruh teks judul utama di dalam **Title Area** pada setiap floating window, dialog modal, wizard, popup, dan card (misal: Session Card) **WAJIB menggunakan huruf kapital penuh (ALL CAPS / `text-transform: uppercase !important;`)** dengan letter spacing terkalibrasi (`letter-spacing: 0.02em !important;`).
  - DILARANG KERAS menggunakan Title Case (`Live Test Session Monitor`) atau Mixed Case pada judul utama di Title Area. Judul harus selalu tampil tegas sebagai identitas resmi jendela/dialog (contoh: `LIVE TEST SESSION MONITOR: THEME A`, `EXPEL STUDENT FROM EXAM`, `ADD NEW CLASS`, `SELECT TOPIC COMPONENT`, `TOPIC SELECTION`, `EDIT STUDENT DOSSIER`).
- **Aturan Subtitle Tersusun Vertikal (Stacked Subtitle Invariant - Dual-Line 60px)**:
  - Apabila jendela dialog/modal memiliki Sub-Title (keterangan topik, batch, modul, atau konteks aksi), Sub-Title WAJIB ditaruh **tersusun bertumpuk secara vertikal di bawah Judul Utama** (`display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;`), BUKAN menyamping dalam satu baris datar dengan separator titik (`•`).
  - **Baris 1**: Judul Utama (`16px Outfit 700`, ALL CAPS, Terpusat).
  - **Baris 2**: Sub-Title deskriptif (`12px Inter 500`, `#94a3b8`, Terpusat, mixed case, margin-top: `2px - 3px`).
  - **Tinggi Baku Dual-Line**: Title Area dengan Sub-Title bertumpuk wajib berukuran tepat **`60px`** (`.title-area.dual-line` / `.modal-header.dual-line`, `height: 60px !important; min-height: 60px !important; max-height: 60px !important;`), menjaga irama kelipatan 10px dan simetri sempurna dengan 60px CTA Area di bawah.
- **Pengecualian Dua Baris Judul (Dual-Line Exception: 60px)**:
  Title Area **hanya diizinkan setinggi `60px`** (`.title-area.dual-line`) apabila memiliki **Dua Baris Judul Tersusun Vertikal** (Baris 1: Title `16px Outfit 700` + Baris 2: Subtitle deskriptif `12px Inter 500`), contohnya pada *Live Test Session Monitor*. Untuk seluruh modal standar berbaris judul tunggal, tinggi wajib terkunci pada **`40px`**.

#### 1.5.2 Standardized 40px "Toolbar Area" Invariant (Bilah Kontrol & Toolbar di Bawah Title Area)
- **Official Terminology & Posisi**: Bilah alat (*toolbar*), bilah filter, bilah pencarian, atau bilah triage yang terletak tepat di bawah **Title Area** secara resmi dan baku disebut **"Toolbar Area"** (`.toolbar-area` / `.window-toolbar` / `.modal-toolbar`).
- **Tinggi Mutlak 40px**: Wajib berukuran tepat **`40px`** (`height: 40px !important; min-height: 40px !important; max-height: 40px !important; box-sizing: border-box !important; flex-shrink: 0 !important;`).
- **Garis Pembatas Bawah (Bottom Divider)**: Wajib memiliki garis pembatas bawah `border-bottom: 1px solid var(--clr-border, rgba(255, 255, 255, 0.08)) !important;` untuk memisahkan Toolbar Area secara tegas dari area konten/tabel di bawahnya.
- **Aturan Kontrol 30px & Margin Simetris 5px**: Seluruh tombol aksi, tab filter, dan input pencarian di dalam Toolbar Area 40px wajib setinggi **`30px`** (`height: 30px !important; min-height: 30px !important; max-height: 30px !important; line-height: 28px !important; padding: 0 10px !important; font-size: 12px !important; border-radius: 4px !important; box-sizing: border-box !important;`). Dipadukan dengan tinggi panel 40px, menghasilkan simetri vertikal sempurna:
  $$\frac{40\text{px (Tinggi Toolbar Area)} - 30\text{px (Tinggi Kontrol)}}{2} = \mathbf{5\text{px (Margin Atas & Bawah)}}$$
- **Zero-Wrap Lock Invariant**: Wajib menggunakan `flex-wrap: nowrap !important;` agar seluruh kontrol filter, tombol aksi, dan input pencarian tetap terkunci rapat dalam satu baris datar tanpa pernah turun ke baris berikutnya (*wrapping*) yang dapat merusak spatial container 40px.
- **Visual Styling**: Menggunakan latar belakang transparan lembut `background: rgba(15, 23, 42, 0.6) !important;` dengan padding horizontal simetris (`padding: 0 16px !important;`).

#### 1.5.3 Standardized 60px "CTA Area" Invariant (Wadah Aksi Konfirmasi Bawah)
- **Official Terminology**: Wadah tombol aksi di bagian bawah floating window, wizard, dan popup secara resmi dan baku disebut **"CTA Area"** (`.cta-area` / `.cta-panel` / `.modal-footer`). Mulai sekarang, nama baku ini menggantikan sebutan lama (*wizard footer*, *window footer*, *modal footer*, dan *CTA panel*).
- **Tinggi Mutlak 60px**: Wajib berukuran tepat **`60px`** (`height: 60px !important; min-height: 60px !important; max-height: 60px !important; box-sizing: border-box !important; flex-shrink: 0 !important;`).
- **Garis Pembatas Atas (Top Divider)**: Memiliki garis pembatas atas `border-top: 1px solid var(--clr-border, rgba(255, 255, 255, 0.08)) !important;` dengan latar belakang transparan lembut `background: rgba(15, 23, 42, 0.6) !important;`.
- **Aturan Tombol 40px & Margin 10px**: Tombol Call-To-Action di dalamnya wajib setinggi **`40px`** (`height: 40px !important; min-height: 40px !important; line-height: 38px !important; padding: 0 16px !important; font-size: 12px !important; font-weight: 600 !important; border-radius: 4px !important; box-sizing: border-box !important;`). Dipadukan dengan padding vertikal $10\text{px}$, menghasilkan simetri sempurna:
  $$\text{Padding Atas } (10\text{px}) + \text{Tinggi Tombol } (40\text{px}) + \text{Padding Bawah } (10\text{px}) = \mathbf{60\text{px}}$$
- **Alignment & Jarak**: Tombol-tombol di dalam CTA Area berjarak `gap: 10px !important;` dengan perataan fleksibel (`justify-content: flex-end !important;` atau `justify-content: space-between !important;` jika terdapat tombol sekunder `CANCEL` / `BACK` di sisi kiri).

#### 1.5.4 Matriks Komparasi Asimetris: Title Area (40px) vs Toolbar Area (40px) vs CTA Area (60px)
| Parameter | Title Area (Atas) | Toolbar Area (Sub-Header) | CTA Area (Bawah) |
| :--- | :--- | :--- | :--- |
| **Fungsi Utama** | Identitas & Konteks Dialog | Bilah Kontrol, Filter & Search | Eksekusi Komitmen / Aksi CTA |
| **Tinggi Baku** | **`40px`** *(60px jika dual-line)* | **`40px`** *(jika ada)* | **`60px`** |
| **Tinggi Komponen Isi** | Teks Title **`16px`** + Close **`30px`** | Tombol & Input **`30px`** | Tombol CTA **`40px`** |
| **Margin / Padding Vertikal** | $12\text{px}$ (teks) / $5\text{px}$ (tombol) | $5\text{px}$ (atas & bawah simetris) | $10\text{px}$ (atas & bawah simetris) |
| **Garis Pembatas** | `border-bottom: 1px solid rgba(255,255,255,0.08)` | `border-bottom: 1px solid rgba(255,255,255,0.08)` | `border-top: 1px solid rgba(255,255,255,0.08)` |
| **Alasan Desain** | Mencegah ruang kosong melompong (*no 22px void*) & hemat ruang vertikal | Menjaga satu baris datar (*nowrap*) & irama kelipatan 10px | Memberi ruang sentuh besar (*ergonomic touch target*) untuk tombol 40px |

#### 1.5.5 Authoritative 3-Tier Modal Width & Height Architecture (Golden Standard Modular Dimensions)
  - **Tier 1: Compact Modal (`480px`)**: Single-column dialogs, delete confirmations (`.modal-box-delete`), add class modals (`.modal-box-add-class`), single-field prompt windows.
  - **Tier 2: Standard Modal (`640px`)**: Multi-field CRUD dialogs (`.modal-box`), bulk edit windows (`.bulk-edit-modal-box`), setting modals, single-card review panels.
  - **Tier 3: Wide Modal / Wizard (`960px`)**: Two-column layout wizards, tabular enrollment lists (`.modal-box-roster`), batch review tables (`.modal-box-lg`), duplicate resolution drawers.
- **Standard Floating Window Modal Height (75vh – 80vh Height Invariant)**:
  - Seluruh floating window dialog, wizard, dan modal (Tier 2 dan Tier 3) WAJIB dibatasi tingginya maksimal **`75vh` – `80vh`** (`max-height: 80vh !important; height: 75vh; min-height: 480px;`).
  - Dilarang merentang hingga `90vh` – `95vh` yang membuat jendela dialog memanjang ekstrem ke bawah, hampir menabrak taskbar/banner bawah dan menghilangkan ruang pernapasan visual (*headroom* dan *bottom clearance*).
  - Area tabel atau formulir di dalam dialog menyerap fleksibilitas ruang secara mandiri dengan *smooth scrolling* internal (`overflow-y: auto`).
- **Mobile Smartphone Modal Standard (`350px` Width, `20px` Edge Margin & Zero Scroll)**:
  On mobile smartphone viewports (390 × 844 px), all modal dialogs enforce `max-width: 350px !important; width: 100% !important; border-radius: 20px !important; overflow: hidden !important;` with symmetrical `20px` edge margins on left and right (`padding: 20px !important;` on backdrop). Total modal height stays strictly within ~50%–75% of screen height (450px–620px on 844px screen), ensuring ample headroom and strictly **100% zero scroll**.
- **Stacked Mobile Form Fields Invariant (Bersusun SSOT)**:
  On mobile dialogs, form fields (such as Province, City/District, Education, Birthday) MUST be structured in a stacked vertical layout (`.intro-field-group`: label on top, `input`/`select` below with 100% width and 40px height) rather than compressed side-by-side. This ensures full readability of long entity names without truncation, maintains comfortable touch targets, and preserves the strict 10px vertical container gap.
- **Deliberate Two-Step Mobile Selection State Machine**:
  For mobile option and selector dialogs (e.g. Lobby Class Selector, Module Selector):
  - **Tap 1 (Select)**: Tapping a card highlights it as the candidate (`.selected`, cyan outline + subtle glow) without prematurely closing the modal.
  - **Tap 2 (Commit)**: Tapping the primary CTA button in the 60px footer (`ENTER CLASS →`) commits the selection, updates state, and closes the modal. (Double-tapping the active card also acts as a fast-path commit).

### 1.6 Frontend Runtime Performance & Anti-Lag Invariants (Anti-Thrashing Standards)

#### 1.6.1 MutationObserver Loop Prevention & DOM Re-entrancy Guard (Anti-Freeze Invariant)
- **Problem**: Calling DOM mutation methods (`appendChild()`, `insertBefore()`, `innerHTML`, `replaceChildren()`) inside a function observed by a `MutationObserver` creates an infinite feedback loop (up to 1,320 mutations/sec at 60 FPS), locking the main thread and cancelling mouse click events.
- **Mandatory Guard Protocol**:
  1. **Temporary Disconnect or Re-entrancy Flag**: Any function that reorganizes or sorts DOM subtrees (e.g. `sortAllSidebarDomains`, datagrid re-renders) MUST temporarily disconnect the active observer:
     ```javascript
     observer.disconnect();
     // Perform DOM sorting/mutations
     observer.observe(targetNode, config);
     ```
     OR use an `isMutating` state flag to immediately ignore internally triggered mutations.
  2. **Zero Recursive Append**: Never append or move elements inside the same element container that triggered the observer callback without an explicit disconnect/suppression guard.

#### 1.6.2 In-Memory Reference Data Caching & Anti-Query Waterfall Invariant
- **Problem**: Re-fetching 8 structural database tables (`levels`, `programs`, `batches`, `classes`, `tests`, `students`, `progress`, `attempts`) on every tab switch or table open floods network egress and causes multi-second loading spinners.
- **Mandatory Caching Standard**:
  1. **Static Metadata In-Memory Cache**: Structural reference data (`levels`, `programs`, `batches`, `classes`, `tests`) changes rarely during an active session and MUST be cached in memory (e.g., `_cachedReferenceData` or module-level store) after initial hydration.
  2. **Targeted Dynamic Fetching**: When switching tabs or refreshing views, fetch ONLY dynamic transactional data (`students`, `attempts`, `progress`), referencing the pre-loaded static metadata rather than re-querying all 8 tables simultaneously.
  3. **Zero Network Waterfalls in Tests**: Layout, spatial, and unit tests must NEVER hit live database queries; always use cached in-memory fixtures.

#### 1.6.3 Robust Event Delegation Standard (Anti-Detached Click Invariant)
- **Problem**: Attaching click listeners directly to dynamically re-rendered elements causes click handlers to detach when DOM nodes are refreshed or re-sorted.
- **Mandatory Event Delegation**:
  All dynamic button clicks and table cell actions MUST be bound once to stable, permanent parent containers (e.g. `document` or `#admin-console`) using `e.target.closest('[data-action]')`:
  ```javascript
  parentElement.addEventListener('click', (e) => {
    const btn = e.target.closest('.action-btn');
    if (!btn) return;
    // Handle action safely
  });
  ```
  This guarantees that table re-rendering, sort operations, and DOM refreshes never drop mouse clicks or require complex headless browser click tracing.

---

## Bab 2: Tipografi & Skala Font Terpusat (Dual-Scale Typography Architecture)

### 2.1 Dual-Scale Typography Architecture (Authoritative 3-Level Typographic System & Display Scale)
Sistem antarmuka TopsCore LMS mengadopsi arsitektur tipografi dua keluarga yang harmonis dan terstruktur secara matematis:

1. **Family A: Standard UI & Content Hierarchy (Authoritative 3-Level Typographic System: `20px – 16px – 12px`)**:
   - Skala baku wajib untuk seluruh teks kalimat, tabel data, formulir input, tombol aksi, chips, subtitel, dan dialog modal:
     - **Level 1: Display / Primary Action (`20px`)**: `Outfit`, Weight `800` (Extra Bold, letter-spacing `-0.02em`). Judul hero utama, header modal, dan tombol aksi primer besar (`SUBMIT`, `GIVE UP!`, `BACK TO THE TEST`).
     - **Level 2: Title / Secondary Action (`16px`)**: `Outfit`, Weight `700` (Bold, letter-spacing `-0.01em`). Judul kartu/card, subheader dialog modal, judul seksi, strip peringatan, dan tombol sekunder (`CANCEL`).
     - **Level 3: Rest / Labels / Data (`12px`)**: `Inter 500/600` (dan `JetBrains Mono 600` untuk angka tabular / PIN). Standar universal untuk SELURUH sel tabel data, header tabel, kontrol formulir, tombol tabel/bilah alat, label subtitel, dan body copy.
   - **Zero Tolerance Policy**: Menghapus seluruh ukuran font mengambang/ambigu (`14px`, `13px`, `15px`), mikro-font (`sub-12px`: 8px, 9px, 10px, 11px), dan unit rem mengambang (`0.75rem`, `0.82rem`, `0.88rem`, `0.9rem`).

2. **Family B: Hero Metric & Display Scale (`25px – 30px – 35px – 40px`)**:
   - Khusus diperuntukkan bagi indikator numerik vokal berbobot tinggi, counter soal (`14 / 40` menggunakan **`35px`**), timer hitung mundur ujian, dan persentase skor akhir rapor (`100% ★`).
   - Dilarang keras digunakan untuk teks kalimat biasa, tombol, atau label umum.

### 2.2 Zero Sub-12px Standard & Anti-Blur Discipline
- Tidak boleh ada teks dalam antarmuka berukuran di bawah **12px**.
- Seluruh mikro-font (8px, 9px, 10px, `0.65rem`, `8pt`) dibasmi tuntas agar teks tetap tajam dan terbaca sempurna di tema gelap (*dark mode*).
- Teks miring (`font-style: italic`) dilarang pada kanvas slate gelap untuk mencegah efek kabur (*anti-aliasing blur*).
- **Superscript Exception**: Tipografis glif pendamping metrik seperti huruf penanda remedial `60%ᴿ` (`<sup>R</sup>` / `ᴿ`) dikecualikan karena merupakan glif superscript standar bawaan pendamping metrik persentase, bukan ukuran teks hierarki mandiri.

### 2.3 Header-Only Bold Discipline & Sub-Header Regular Standard (SSOT)
- **Single Headers, Super-Headers & Spanning Headers**: Strictly `font-weight: 700` (Bold) or `800` (Extra Bold).
- **Sub-Headers (Child Column Headers)**: Strictly `font-weight: 400` (Regular — STRICTLY NOT BOLD) per Rule 4.1, creating clear visual hierarchy beneath 700-bold super-headers.
- **Table Data Cells & Numbers**: Strictly `font-weight: 400` (Normal) or `500` (Medium). Zero bold on standard numbers, scores, theme names, or student names. Let color, contrast, and alignment drive hierarchy — not heavy bolding.

### 2.4 Pure Direct English UI Standard
- All user interfaces, navigation menus, tab titles, table column headers, status labels, buttons, tooltips, dialogs, toasts, and system messages across all pages must use direct, professional English.
- Sole permissible exception: Indonesian vocabulary translation inside Vocabulary Vault (`vocabulary_vault.meaning` / phrase Indonesian text).

### 2.5 ALL CAPS Exclusivity (Headers, Modal Titles & Primary Hero CTAs Only) vs Personal Names
- **Where ALL CAPS is Permitted**:
  1. **Table Headers** (`<thead><th>`): All column headers across all data tables.
  2. **Official Institutional Acronyms**: Standard abbreviations (`TOP`, `CEC`, `CMP`, `EVN`, `SHR`, `EXP`).
  3. **Section & Modal Titles**: Major modal titles (`WELCOME`, `ABOUT YOU`, `LOBBY`, `DOSSIER`) in Tactical Cyan (`#38bdf8`, 20px bold 800) accompanied by a horizontal divider line directly beneath them.
  4. **Primary Hero Action CTAs**: High-stakes primary call-to-action buttons (`SUBMIT`, `GIVE UP!`, `BACK TO THE TEST`, `ENTER CLASS →`, `SAVE & CONTINUE →`, `CONFIRM`).
- **Where ALL CAPS is Forbidden (Title Case / Sentence Case Strict)**:
  - All table body cells (`<tbody><td>`), status labels (`Draft`, `Published`, `Unpublished`, `Archived`), test types (`Task`, `Exam`), answers (`Spoken`, `Written`), categories, access orders, dropdown options, and system messages.
  - Secondary and table action buttons (`Add Student`, `Edit`, `Cancel`, `Download Template`, `Upload Roster`).
- **Personal Name Exclusivity (Strictly Title Case, Never ALL CAPS)**: Personal names (such as Student Name in Welcome dialogs or Profile cards), even when styled at Level 1 Display/Title scale (`20px`, bold 800), are **STRICTLY FORBIDDEN FROM ALL CAPS**. They must always render in natural **Title Case / Capitalize** (`Jessica Pratama`, never `JESSICA PRATAMA`) with crisp white color (`#f8fafc`).
- CSS rule `text-transform: uppercase;` is strictly forbidden on table body cells (`td`), student names, dropdown selects, and inputs.

### 2.6 System-Wide Zero Emojis Invariant & Vector SVG Iconography Architecture
- All table data cells, toolbars, buttons, cards, class representations, and modal dialogs across TopsCore LMS must remain crisp, professional, and purely alphanumeric or vector SVG.
- Decorative unicode emojis (`📚`, `✍️`, `🗣️`, `🎧`, `📈`, `🔒`, `🚪`, `⚠️`, `🎯`, `⚡`, `🟢`, `🟡`, `🔴`, etc.) are **STRICTLY FORBIDDEN** across the entire TopsCore ecosystem.
- Meaning, visual categories, and class topics MUST be communicated through clean typography, semantic CSS color tokens, or clean **monochromatic vector SVG icons** (`stroke="#38bdf8"` or dynamic tier/grade color, `viewBox="0 0 24 24"`, stroke-width 2, round linecap/linejoin) housed in geometric containers (`32 × 32 px`, radius 8px, background `rgba(255, 255, 255, 0.05)` or `rgba(56, 189, 248, 0.2)` when selected). This ensures pixel-perfect clarity on Retina/OLED displays and eliminates cross-platform emoji rendering fragmentation.

### 2.7 Universal Vector SVG Icon Standard for Classes & Categories (`getClassSvgIcon`)
Seluruh representasi kelas (*Classes / Subjects*) di TopsCore LMS (baik di desktop workstation, topbar tabs, student class deck, active class cards, maupun mobile dialog selector) WAJIB menggunakan fungsi terpusat `getClassSvgIcon(className, size, strokeColor)` yang diekspor dari `js/grading.js`:
- **Smart Keyword Mapping Catalog**:
  1. **Vocabulary / Lexicon / Word Bank / Vault** (`vocab`, `lexic`, `word`, `vault`, `lexis`): Closed Book Vault / Glossary SVG.
  2. **Pronunciation / Accent / Phonetics** (`pronun`, `accent`, `phonet`, `intonat`): Acoustic Voice Microphone SVG.
  3. **Listening / Audio / Sound** (`listen`, `audio`, `hear`, `sound`): Ergonomic Headphones SVG.
  4. **Grammar / Structure / Writing / Basic** (`gramm`, `struct`, `writ`, `compos`, `basic`): Precision Feather Pen & Document SVG.
  5. **Presentation / Public Speaking / Business** (`present`, `public`, `busin`, `pitch`): Presentation Display Screen SVG.
  6. **Storytelling / Reading / Literature** (`story`, `read`, `litera`, `narrat`): Open Reading Book SVG.
  7. **Speaking / Conversation / Roleplay / Oral** (`speak`, `convers`, `talk`, `oral`, `roleplay`): Dual Dialogue Speech Bubble SVG.
  8. **General English / All Classes / Fallback**: Tactical Global Sphere SVG.
- **Dimensional Standards**:
  - Modal Selector (`#classes-selector-modal`): `18px × 18px` dalam wadah `32px × 32px` (`.classes-selector-icon-wrap`).
  - Dashboard Deck Box (`.class-deck-box`): `16px × 16px` (`display: flex; align-items: center; gap: 6px;`).
  - Active Class Card (`.class-card`): `24px × 24px` atau `28px × 28px` di dalam `.class-icon`.
  - Admin Topbar Tabs (`.topbar-tab-icon`): `16px × 16px` sejajar vertikal dengan teks nama tab.

### 2.8 Standard Student Name (`studentName`) & Dashboard-Only Title (`Mr.` / `Miss`)
- **Default Principle**: By default, student names across the entire TopsCore LMS are standard names (`studentName` / `name` / `session.student_name`).
- **Single Location of Title Addition (Dashboard-Only)**: The **Student Dashboard** (`dashboard.html` / `js/dashboard.js`) is the **SOLE location in the entire system** where gender honorific titles (`Mr.` for male, `Miss` for female, or royal titles `King` / `Queen` for batch champions) are prepended to `studentName` for student greeting and gamified presentation.
- **Universal Standard Name Everywhere Else**: All other user interfaces, tables, modals, dialogs, test rooms (`test.html`), and result summaries (`result.html`) display standard `studentName` / `name` directly without adding titles:
  - **Admin Data Grids & Rosters**: Table cells in Student Management, Class Hub, Attendance Matrix, and Live Session Monitor display standard `studentName` / `name`. Never prepend `Mr.` or `Miss` in `<td>` elements.
  - **Test & Exam Room (`test.html`)**: Student header greeting, status bar, and timer metadata display standard `session.student_name`.
  - **Result & Report Card Screen (`result.html`)**: Result header card, test breakdown, and print/certificate views display standard `session.student_name`.
  - **Conversation Room (`conversation.html`)**: Participant badges and turn signals display standard `session.student_name`.
  - **Form Dropdowns & Pickers**: Student selection dropdowns and batch checklists display standard `studentName`.

---

## Bab 3: Desain Sistem & Warna Terpusat

### 3.1 Pemisahan Tegas Warna Akademik vs UI Chrome
- **Warna Akademik / Grade / Rapor (SSOT Reference)**:
  - Definisi baku skala nilai (★, A, B, C, D, E), kode hex paten Grade Vault, aturan eksklusivitas Star (`#ff2d87`), teks badge gelap `#0F172A`, persentase metrik positif vs metrik error terbalik, batas remedial 60%, dan protokol propagasi satu sentuhan (*"Rubah Satu Maka Rubah Semua"*) terpusat secara mutlak di [Official Grading Scale in AGENTS.md Section 2.10](file:///AGENTS.md#210-grade).
  - Seluruh komponen rapor dan kartu nilai wajib memanggil fungsi sentral di `js/grading.js` (`TOPSCORE_COLORS`, `getGradeColorByScore()`, `getInvertedGradeColor()`).
- **Warna UI Chrome (Buttons, Alerts, Status Chips)**:
  - Reference CSS variables and semantic soft tokens (`--btn-danger`, `--status-warning`, `--status-success`).
  - **Professional Dark Theme Soft Token Pattern**: Soft transparent background (`rgba(..., 0.15)`) + solid border & crisp text. Prevents harsh/blinding solid pure red/yellow on dark backgrounds.
  - **System Chrome Canvas**: Non-semantic chrome (workstation canvas `#090D16`, sidebars `#0F172A`, borders `rgba(255, 255, 255, 0.08)`, tactical blue `#38BDF8`, indigo `#6366F1`) strictly uses neutral system tokens.
  - **Strict No-Hardcoding**: Raw hex literals (`#ff0000`, `#ffff00`, `#00c000`) must NEVER be hardcoded in CSS rules or JS template strings. Modifying central tokens in `:root` must instantaneously propagate across the entire application in a single step per the "Rubah Satu Maka Rubah Semua" protocol.

### 3.2 Standar Warna 4-Pillar (ABCD System, ABCD Tema & 4 Tahapan)
Struktur 4 entitas (4 Tahap, 4 Tema Class A/B/C/D, 4 Domain Navigasi ABCD, dan 4 Tahapan Wizard) wajib mengikuti palet hierarki **Pink – Orange – Lime – Ungu**:
1. **Entitas A / Tahap 1 / Theme A / A — ADMIN**: `--quad-a` / `TOPSCORE_QUAD_COLORS.A` (Electric Pink `#FF2D87`). *(Memiliki deklarasi sumber token mandiri terpisah dari `--grade-star` / `TOPSCORE_COLORS.STAR`)*.
2. **Entitas B / Tahap 2 / Theme B / B — BOARD**: `--quad-b` / `var(--grade-d)` (Dark Orange `#FF8C00`).
3. **Entitas C / Tahap 3 / Theme C / C — CLASS**: `--quad-c` / `var(--grade-b)` (Electric Lime `#95ff00`).
4. **Entitas D / Tahap 4 / Theme D / D — DATA**: `--quad-d` / `TOPSCORE_QUAD_COLORS.D` (Vibrant Purple / Violet `#C084FC`).
- **Aturan Visual Aksen**: Penggunaan warna pink/oranye/lime/ungu pada entitas A/B/C/D difokuskan sebagai aksen teks, ikon domain, border pembatas tema, dan pill penanda kategori dengan latar transparan lembut (`rgba(..., 0.15)`), bukan blok solid pekat yang mendominasi kanvas workstation.

---

## Bab 4: Arsitektur Tabel, Grid & Master Edit Mode

### 4.1 Dimensi Tabel Baku & Native Display Lock
All data tables across TopsCore strictly enforce the standardized dimensional invariants:
- **Native Table Lock**: HTML tables must strictly preserve native display context (`display: table`, `display: table-row-group` — NEVER `display: flex` or `grid`). Vertical scrolling is permitted EXCLUSIVELY inside `.table-wrap { overflow-y: auto; }`.
- **Single Header (`thead th`)**: Fixed height of **40px** (`height: 40px !important; line-height: 40px !important;`). Sticky at `top: 0; z-index: 10;`, font-size: 12px, font-weight: 700 (Bold).
- **Two-Tier Header Structure (Super-Header, Sub-Header & Spanning Standalone Header SSOT)**:
  - **Super-Header (`.datagrid-super-header-row th`, `th.super-hdr`)**: Height **30px** (`height: 30px !important; line-height: 30px !important;`), sticky at `top: 0; z-index: 20;`, font-size: 12px, font-weight: 700 (Bold). Groups two or more related child columns (`colspan >= 2`).
  - **Sub-Header (`.datagrid-sub-header`, `tr:not(.datagrid-super-header-row) th`)**: Height **30px** (`height: 30px !important; line-height: 30px !important;`), sticky at `top: 30px; z-index: 19;`, font-size: 12px, **font-weight: 400 (Regular — STRICTLY NOT BOLD)** per user requirement. Child column headers directly under super-headers.
  - **Spanning Standalone Header (`th[rowspan="2"]`, `.datagrid-rowspan-2-header`)**: Height **60px** (`height: 60px !important; line-height: 60px !important; vertical-align: middle !important;`), sticky at `top: 0; z-index: 26;`, font-size: 12px, font-weight: 700 (Bold). Standalone columns (e.g. `BATCH`, `STUDENT NAME`, `PROGRAMS`, `ACTIONS`, select-all checkbox) that are NOT grouped under multi-column super-headers MUST span both tiers (`rowspan="2"`), completely filling the combined 60px header height from top to bottom without half-cut 30px clipping or empty dummy super-header cells.
- **Table Footer (`tfoot td`)**: Fixed height of **40px** (`height: 40px !important; line-height: 40px !important;`). Sticky at `bottom: 0; z-index: 10;`. Empty footers collapse (`tfoot:empty { display: none !important; }`).
- **Table Data Rows (`tbody tr td`)**: Harmonic cadence of **30px – 40px** (`line-height: 1.3 !important;`).

### 4.2 Aturan Text-Wrap, Universal Zero-Truncation Invariant & Standar Singkatan Header 3-Tier (SSOT)

#### 4.2.1 Universal Zero-Truncation Invariant (Strict No-Clipped-Text SSOT)
- **Zero Truncation Guarantee**: Table data cells, headers, cards, form inputs, and modal dialogs across TopsCore LMS MUST NEVER truncate, clip, or obscure meaningful text (`text-overflow: ellipsis`) when adequate spatial layout exists.
- **Calibrated Column Widths**: Every column must specify an authoritative fixed width or `minWidth` tailored to its largest realistic entity content (e.g. `PROVINCE` $\ge 160\text{px}$, `CITY / DISTRICT` $\ge 150\text{px}$, `EDUCATION` $\ge 140\text{px}$, `NAME` $\ge 200\text{px}$ flex-primary, `TITLE` $\ge 240\text{px}$). Arbitrarily squished columns that choke data or trigger `scrollWidth > clientWidth` are strictly prohibited.
- **Balanced Flex-Primary Space**: The designated flex-primary column (`§TABLE-FLEX-PRIMARY`, Section 4.4) absorbs remaining space without starving adjacent columns or creating excessive void deserts.
- **Single-Line Non-Wrapped Discipline**: Applies to Student Roster, Batches, Class Exams, Attendance, Exam Scores, and System Logs (`white-space: nowrap !important; text-overflow: ellipsis; overflow: hidden;`). The column width itself MUST be wide enough to render the full text cleanly without triggering ellipsis.
- **Vocabulary Vault Phrases Exception**: Multi-line wrapping (`white-space: normal !important;`) is explicitly permitted for phrase columns (English sentence & Indonesian translation) in Vocabulary Vault to ensure long conversational sentences remain fully visible without truncation.
- **Stacked Layout on Mobile**: On narrow mobile viewports ($\le 350\text{px}$), fields with long entity names MUST use vertical stacked layouts (`.intro-field-group`) rather than compressed columns to prevent text clipping.

#### 4.2.2 Standar Singkatan Header 3-Tier (Full Form, 5-Letter Form, 3-Letter Form SSOT)
Untuk menjaga keterbacaan data grid tanpa menimbulkan teks terpotong (*zero truncation*), sistem menetapkan standarisasi header 3 tingkat: **Bentuk Utuh (Full Form)**, **Bentuk 5 Huruf (5-Letter Form)**, dan **Bentuk 3 Huruf (3-Letter Form)**.

##### Aturan Baku Singkatan 3 Huruf:
1. **Konsonan Murni**: Wajib terdiri dari huruf konsonan murni (tanpa vokal).
2. **Pengecualian Vokal Awalan (Prefix Only)**: Huruf vokal **HANYA diperbolehkan** jika berada di posisi **huruf pertama / awalan kata** (contoh: `EDU`, `ATT`, `AVG`, `ACT`, `ACC`, `INS`).
3. **Singkatan Khusus Kelas**: Vocabulary wajib menggunakan **`VCB`** (3 huruf) dan **`VOCAB`** (5 huruf).
4. **Singkatan Khusus Wilayah (SSOT)**: 
   - **Regency**: Full Form = **`REGENCY`**, 5-Letter Form = **`REGEN`**, 3-Letter Form = **`RGC`** (konsonan murni R-G-C).
   - **District**: Full Form = **`DISTRICT`**, 5-Letter Form = **`DISTR`**, 3-Letter Form = **`DST`**.
   - **Village**: Full Form = **`VILLAGE`**, 5-Letter Form = **`VILLG`**, 3-Letter Form = **`VLG`**.
   - **Province**: Full Form = **`PROVINCE`**, 5-Letter Form = **`PROVN`**, 3-Letter Form = **`PRV`**.
   - Dilarang keras menggunakan istilah bahasa Indonesia `KABKO`.

##### Tabel 1: Standar Singkatan 5 Nama Kelas Utama (Core Classes)
| No | Nama Kelas Lengkap (Full Form) | Singkatan 5 Huruf (5-Letter Form) | Singkatan 3 Huruf (3-Letter Form) | Keterangan & Aturan Vokal |
|:---:|:---|:---:|:---:|:---|
| 1 | **VOCABULARY** | `VOCAB` | `VCB` | Konsonan murni tanpa vokal |
| 2 | **SPEAKING** | `SPEAK` | `SPK` | Konsonan murni tanpa vokal |
| 3 | **BASIC ENGLISH** | `BASIC` | `BSC` | Konsonan murni tanpa vokal |
| 4 | **STORYTELLING** | `STORY` | `STR` | Konsonan murni tanpa vokal |
| 5 | **GRAMMAR** | `GRAMR` | `GRM` | Konsonan murni tanpa vokal |

##### Tabel 2: Standar Singkatan Istilah Sistem Umum (Common System Terms)
| No | Istilah Lengkap (Full Form) | Singkatan 5 Huruf (5-Letter Form) | Singkatan 3 Huruf (3-Letter Form) | Kategori & Aturan Vokal |
|:---:|:---|:---:|:---:|:---|
| 1 | **REGENCY** | `REGEN` | `RGC` | Wilayah Kabupaten/Kota (English: Regency - Regen - RGC, konsonan murni) |
| 2 | **PROVINCE** | `PROVN` | `PRV` | Konsonan murni tanpa vokal |
| 3 | **INSTITUTION** | `INSTN` | `INS` | Vokal di awal diperbolehkan |
| 4 | **PROGRAM** | `PROGM` | `PRG` | Konsonan murni tanpa vokal |
| 5 | **BATCH** | `BATCH` | `BTC` | Konsonan murni tanpa vokal |
| 6 | **STUDENT** | `STUDT` | `STD` | Konsonan murni tanpa vokal |
| 7 | **ATTENDANCE** | `ATTND` | `ATT` | Vokal di awal diperbolehkan |
| 8 | **EDUCATION** | `EDUCT` | `EDU` | Vokal di awal diperbolehkan |
| 9 | **AVERAGE** | `AVERG` | `AVG` | Vokal di awal diperbolehkan |
| 10 | **ACTION** | `ACTON` | `ACT` | Vokal di awal diperbolehkan |
| 11 | **ACCURACY** | `ACCUR` | `ACC` | Vokal di awal diperbolehkan |
| 12 | **LEVEL** | `LEVEL` | `LVL` | Konsonan murni tanpa vokal |
| 13 | **PERCENTAGE** | `PERCT` | `PCT` | Konsonan murni tanpa vokal |
| 14 | **POINTS** | `POINT` | `PTS` | Konsonan murni tanpa vokal |
| 15 | **REMEDIAL** | `REMED` | `RMD` | Konsonan murni tanpa vokal |
| 16 | **QUESTIONS** | `QUEST` | `QST` | Konsonan murni tanpa vokal |
| 17 | **DURATION** | `DURAT` | `DRT` | Konsonan murni tanpa vokal |
| 18 | **STATUS** | `STATS` | `STS` | Konsonan murni tanpa vokal |
| 19 | **TOTAL** | `TOTAL` | `TTL` | Konsonan murni tanpa vokal |
| 20 | **THEME CODE** | `THEME` | `THM` | Konsonan murni tanpa vokal |
| 21 | **TOPIC CODE** | `TOPIC` | `TPC` | Konsonan murni tanpa vokal |
| 22 | **GENDER** | `GNDER` | `GND` | Konsonan murni tanpa vokal |
| 23 | **DATE OF BIRTH** | `DOB` | `DOB` | Akronim baku standar (selalu DOB untuk mencegah overflow/text clipping) |
| 24 | **PHOTO** | `PHOTO` | `PHT` | Konsonan murni tanpa vokal (diakui juga `PHO`) |
| 25 | **DISTRICT** | `DISTR` | `DST` | Wilayah Kecamatan (English; konsonan murni) |
| 26 | **VILLAGE** | `VILLG` | `VLG` | Wilayah Kelurahan / Desa (English; konsonan murni) |
| 27 | **PROGRESS** | `PRGRS` | `PGS` | Konsonan murni tanpa vokal |

##### Panduan Penerapan UI & Mesin Singkatan Otomatis (`resolveHeaderLabel` SSOT):
- **Aktivasi Otomatis Berdasarkan Lebar Ruang**: Singkatan 3-tier aktif secara dinamis dan otomatis berdasarkan lebar aktual kolom (`width` / `minWidth` / saat resize):
  - **Lebar Kolom $< 55\text{px}$** (contoh: Level 46px, Photo 42px, Sesi Ujian 46px): Otomatis aktif **Bentuk 3 Huruf (3-Letter Form)** (contoh: `LVL`, `PHT`, `DOB`, `PGS`, `SCR`, `PTS`, `GRD`, `ACT`). Menghindari teks tumpang-tindih dengan ikon sorting (`▲`/`▼`) dan mencegah teks terpotong.
  - **Lebar Kolom $55\text{px} - 84\text{px}$** (contoh: Gender 68px, Status 84px): Otomatis aktif **Bentuk 5 Huruf (5-Letter Form)** (contoh: `LEVEL`, `PHOTO`, `GNDER`, `STATS`).
  - **Lebar Kolom $\ge 85\text{px}$** (contoh: Education 140px, Regency 160px, Province 160px): Menggunakan **Bentuk Utuh (Full Form)** (contoh: `EDUCATION`, `REGENCY`, `PROVINCE`). Catatan: `DOB` tetap berformat singkatan `DOB` agar proporsional dan tidak terpotong.
- **Tooltip Aksesibilitas Utuh**: Seluruh elemen header (`<th>`) wajib menyematkan atribut `title="..."` dengan nama lengkap utuh tanpa singkatan, sehingga pengguna yang melakukan hover selalu melihat nama lengkap kolom secara jernih.
- **Sort Icon & Narrow Header Protection**: Header kolom sempit ($\le 55\text{px}$) menerapkan `padding: 0 2px !important;` dengan `.sort-icon` berukuran 10px dan `overflow: hidden;`, menjamin ikon sorting tidak pernah meluap atau menimpa kolom tetangga.

#### 4.2.3 Geographical & Address Column Sequencing & Formatting Standards (SSOT)
- **Roster Super-Header Architecture**:
  1. Super Header 1: **`STUDENTS DATA`** (`colSpan: 4`: `LEVEL`, `PHOTO`, `GENDER`, `NAME`).
  2. Super Header 2: **`DEMOGRAPHIC`** (`colSpan: 3`: `DOB`, `AGE`, `EDUCATION`). Mengelompokkan seluruh data demografi personal siswa di luar nama.
  3. Super Header 3: **`ADDRESS`** (`colSpan: 4`: `VILLAGE`, `DISTRICT`, `REGENCY`, `PROVINCE`).
- **Class Hub Matrix Super-Header Architecture**:
  1. Super Header 1: **`STUDENTS DATA`** (`colSpan: 2`: `BATCH`, `STUDENT NAME`).
  2. Super Header 2: **`OVERALL PERFORMANCE`** (`colSpan: 3`: `PROGRESS` [PRGRS/PGS], `POINT`, `GRADE`).
  3. Super Header 3+: **`THEME A`**, **`THEME B`**, **`THEME C`**, **`THEME D`** (`colSpan: 4` per tema).
- **Address Hierarchy Sequence**: Urutan kolom alamat wajib mengikuti: `VILLAGE` (Desa/Kelurahan) $\to$ `DISTRICT` (Kecamatan) $\to$ `REGENCY` (Kota/Kabupaten) $\to$ `PROVINCE` (Provinsi).
- **Regency Before Province Invariant**: Kolom Kota/Kabupaten (`REGENCY`) **WAJIB SELALU berada di sebelah kiri kolom Provinsi (`PROVINCE`)** dalam seluruh tampilan dan tabel tanpa pengecualian.
- **Numeric-Only Age Formatting**: Nilai usia/umur ditampilkan **murni angka saja** (contoh: `22`, bukan `22 yrs`) dengan `font-variant-numeric: tabular-nums;`.
- **Recognized Standard Province Abbreviations**: Penamaan provinsi wajib menggunakan singkatan resmi yang diakui umum (contoh: Nusa Tenggara Barat disingkat **`NTB`**, Nusa Tenggara Timur disingkat **`NTT`**, Daerah Istimewa Yogyakarta disingkat **`DIY`**).
- **English Regional Terminology for Cities & Regencies (SSOT)**:
  - Header kolom dan label resmi menggunakan **`REGENCY`** (singkatan: `REGEN` / `RGC`).
  - Untuk nama wilayah kabupaten (yang memiliki kata `Regency`, misal `East Lombok Regency`, `Central Lombok Regency`, `Sumbawa Regency`, `Kab. Lombok Barat`), **KATA "REGENCY" WAJIB DIBUANG** sehingga hanya menampilkan nama wilayah inti (contoh: `East Lombok`, `Central Lombok`, `West Lombok`, `Sumbawa`, `West Sumbawa`).
  - Untuk nama wilayah kota yang memiliki kata `City` (misal `Mataram City`, `Surabaya City`, `Kota Mataram`), kata **`City` TETAP DIBIARKAN** (contoh: `Mataram City`, `Surabaya City`, `Bima City`).

- **Universal Address Category Redundancy Stripping Protocol (SSOT)**:
  - Jika dalam nama pilihan atau data alamat terdapat kata yang sama dengan nama kategorinya, **kata kategori tersebut wajib dibuang** sehingga hanya menyisakan nama intinya:
    - **`VILLAGE`**: Kata `Village`, `Desa`, atau `Kelurahan` wajib dibuang (contoh: `Gunungsari Village` $\to$ **`Gunungsari`**, `Desa Gunungsari` $\to$ **`Gunungsari`**, `Kelurahan Rembiga` $\to$ **`Rembiga`**).
    - **`DISTRICT`**: Kata `District` atau `Kecamatan` wajib dibuang (contoh: `Gunungsari District` $\to$ **`Gunungsari`**, `Kecamatan Ampenan` $\to$ **`Ampenan`**, `Ampenan District` $\to$ **`Ampenan`**).
    - **`REGENCY`**: Kata `Regency` atau `Kabupaten` wajib dibuang (contoh: `East Lombok Regency` $\to$ **`East Lombok`**, `Central Lombok Regency` $\to$ **`Central Lombok`**). Khusus nama kota dengan `City` tetap dipertahankan (`Mataram City`, `Surabaya City`).
    - **`PROVINCE`**: Kata `Province` atau `Provinsi` wajib dibuang (contoh: `Bali Province` $\to$ **`Bali`**, `Provinsi NTB` $\to$ **`NTB`**).

#### 4.2.4 Universal Header Centering & Data Cell Alignment Invariant (SSOT)
- **Universal Header Centering**: Seluruh header tabel tanpa terkecuali (**Single Header**, **Super-Header**, maupun **Sub-Header**) **WAJIB berposisi di tengah (`text-align: center !important; justify-content: center !important;`)**.
- **Data Cell Alignment Discipline**: Seluruh isi sel data dalam kolom wajib berposisi di tengah (**centered** / `text-align: center !important;`), **KECUALI** kolom yang memuat:
  1. Nama orang / nama siswa (`NAME` / Student Name).
  2. Nama program (`PROGRAM NAME`).
  3. Nama mata pelajaran / nama kelas (`CLASS NAME`).
  4. Nama topik / tema (`TOPIC NAME`, `THEME`).
  5. Kosakata dan kalimat percakapan Vocabulary Vault (English words/sentences & Indonesian translations).
  Kolom-kolom bernuansa nama dan teks bacaan tersebut tetap rata kiri (`text-align: left;`) demi kenyamanan membaca (*natural reading flow*).

#### 4.2.5 Education English Terminology & Zero-Graduation-Year Invariant (SSOT)
- **Pure Formal English Terminology**: Jenjang pendidikan pada kolom `EDUCATION` wajib menggunakan terminologi formal bahasa Inggris sesuai data masukan saat onboarding sistem pertama kali:
  - `Kindergarten` (menggantikan TK / Paud)
  - `Elementary School` (menggantikan SD / MI)
  - `Junior High School` (menggantikan SMP / MTs)
  - `Senior High School` (menggantikan SMA / SMK / MA)
  - `Diploma Degree` (menggantikan D1–D3)
  - `Bachelor's Degree` (menggantikan S1 / D4)
  - `Master's Degree` (menggantikan S2)
  - `Doctorate Degree` (menggantikan S3 / PhD)
- **Zero Graduation Year**: Tahun kelulusan (seperti `(2026)`, `(2025)`) **wajib dihilangkan sepenuhnya** dari tampilan tabel maupun dropdown. Cukup jenjang pendidikannya saja.

#### 4.2.6 Master Edit Mode Dropdown Controls & Dependent Geographical Linking (SSOT)
- **Dropdown Control Standard in Edit Mode**: Saat Master Edit Mode aktif (`body.global-edit-mode-on`), kolom **Pendidikan (`EDUCATION`)**, **Provinsi (`PROVINCE`)**, dan **Kabupaten/Kota (`REGENCY`)** wajib menggunakan elemen dropdown `<select class="student-inline-select text-center">` (bukan input teks bebas), dengan tema gelap (`color-scheme: dark;`) dan teks centered (`text-align-last: center;`).
- **Dependent Geographical Linking (Province $\to$ Regency)**: Pilihan opsi pada dropdown Kabupaten/Kota (`REGENCY`) **WAJIB dinamis mengikuti Provinsi yang sedang dipilih**. Saat admin mengganti provinsi pada baris siswa tertentu, daftar kabupaten/kota pada baris tersebut seketika diperbarui secara otomatis dengan kabupaten/kota dari provinsi baru tersebut, memilih opsi pertama secara otomatis, dan menyimpan keterikatan keduanya secara serentak ke database dan memori tampilan.
- **Table Summary Footer 40px Height Invariant**: Tinggi baris ringkasan tabel (`tfoot tr`, `.datagrid-summary-row`, `tfoot td`) **wajib dikunci tepat pada 40px** (`height: 40px !important; min-height: 40px !important; max-height: 40px !important; line-height: 40px !important; padding: 0 8px !important;`), selaras dengan ketinggian Sub Panel 40px dan table header 40px.

### 4.3 Global Master Edit Mode Across All Admin Pages & Universal White Excel Gridlines
All admin screens strictly obey the Master Edit Mode toggle in `admin-topbar`:
- **View Mode (Edit Mode OFF - Pristine Read-Only)**: Absolute Hiding when OFF — ALL edit buttons, rename pencils, delete trash cans, inline input steppers, "+ Add" creation buttons, manual score overrides, and destructive actions MUST be COMPLETELY HIDDEN (`display: none !important;`). Zero table cells, numbers, scores, counts, or statuses may render inside capsule badges or bordered pill boxes. Everything renders as clean, flat text with `font-variant-numeric: tabular-nums`. Gridlines are subtle and quiet (`border-right: 1px solid rgba(255, 255, 255, 0.08); border-bottom: 1px solid rgba(255, 255, 255, 0.05);`).
- **Edit Mode (Edit Mode ON - Universal White Excel Gridlines Invariant)**: Table column and row gridlines (`th`, `td`) across **ALL tables without exception** turn crisp WHITE (`border-right: 1px solid rgba(255, 255, 255, 0.45) !important; border-bottom: 1px solid rgba(255, 255, 255, 0.45) !important;`), with `border-left` on the first column and `border-top` on the first header row. Inputs and selects inside cells are completely borderless (`border: none !important`), transparent (`background: transparent !important`), and zero-radius (`border-radius: 0 !important; height: 28px !important; font-size: 12px !important; padding: 2px 6px !important;`). The crisp white cell gridline itself serves as the sole visual boundary. Zero tables in the system may display non-white or missing gridlines when Edit Mode is active.

### 4.4 §TABLE-FLEX-PRIMARY — Flex Primary Column Pattern
- Applies to all `DataGrid` instances and any table using `table-layout: fixed; width: 100%`.
- Designate exactly ONE primary content column (e.g. Student Name, Title, Word, Question text) with **no `width`** and only a `minWidth` guard (`minWidth: 220px`).
- Assign calibrated fixed pixel widths to all other N−1 columns.
- The browser natively allocates all remaining viewport space to the primary column — zero JavaScript required.
- **Ratified Implementations**:
  - `Audit & Activity Log` (`js/admin/desk.js`): DETAILS column (`minWidth: 260px`).
  - `Vocabulary Vault` (`js/admin/vocab-vault.js`): INDONESIAN column (`minWidth: 220px`).
  - `Theme Manager` (`js/admin/vocab-vault.js`): TOPIC NAME column (`minWidth: 240px`).

### 4.5 Dynamic Column Resizing with Persistent Width Memory & Active Sort Arrows
- **Drag Handles**: Each `<th>` renders a subtle 4px vertical resize handle at its right edge (`position: absolute; right: 0; height: 100%`). Hover color: `rgba(56, 189, 248, 0.5)`. Dragging resizes that column via colgroup `<col>` widths in real-time.
- **Double-Click Auto-Size (Best-Fit)**: Measures max rendered content width across all cells in that column and snaps to best-fit.
- **Persistent Width Storage**: Column widths saved to `localStorage` keyed `topscore_col_widths_<table-id>`, rehydrated before first render.
- **Active-Only Sort Arrow**: Ambiguous idle `⇅` sort icon is strictly purged. Tactical cyan arrows `▲` (asc) or `▼` (desc) in `#38bdf8` appear EXCLUSIVELY on actively sorted columns.

### 4.6 Universal Leftmost Column Hierarchy Sequence
Across ALL data tables in TopsCore LMS, organizational scoping columns must strictly occupy the leftmost positions in this authoritative invariant sequence (whenever present in the table schema):
1. **`INSTITUTION`** (if applicable)
2. **`PROGRAM`** (if applicable)
3. **`BATCH`** (if applicable)
4. **`LEVEL`** (if applicable)
Followed by entity identifiers (`CODE`, `NAME` / `TITLE`), dependencies, operational parameters, metrics, and lifecycle status. In Class Tests table, `LEVEL` is positioned at the far left (Column 1), immediately followed by `CODE` and `TITLE`.

### 4.7 Aturan Pembatas Vertikal Netral Super Header (Universal Super-Header Continuous Neutral Divider Invariant)
- **Universal Neutral Boundary Standard ("Semua Garis yang Bersambung dari Header Sampai Footer Harus Tebal")**:
  - Pada semua tabel yang memiliki super-header (seperti matriks nilai kelas, vocabulary vault, student roster, dsb.), **SELURUH garis vertikal yang bermula dari batas super-header di baris 1 dan menyambung membelah tabel sampai ke footer WAJIB TEBAL (2px solid neutral: `border-right: 2px solid rgba(255, 255, 255, 0.22) !important;`)**.
  - Garis pembatas tebal 2px ini wajib berjalan kontinu 100% tanpa putus di setiap level tabel:
    1. **Baris 1 Super-Header (`th.super-hdr`)**: Garis kanan pemisah antar-kelompok super-header tebal 2px netral.
    2. **Baris 2 Sub-Header (`th.super-hdr-divider`)**: Kolom terakhir dari tiap kelompok super-header tebal 2px netral.
    3. **Baris Data Siswa/Topik (`tbody td.super-hdr-divider`)**: Setiap sel data pada kolom batas kelompok tebal 2px netral.
    4. **Baris Ringkasan Footer (`tfoot td.super-hdr-divider` / `datagrid-summary-row`)**: Sel ringkasan rata-rata pada kolom batas kelompok tebal 2px netral.
- **Otomasi Arsitektural DataGrid SSOT (`js/admin/datagrid.js`)**:
  - `DataGrid` secara otomatis menghitung `this.dividerColKeys` secara matematis berdasarkan akumulasi `colSpan` dan `rowSpan` dari array `superHeaders`.
  - Secara otomatis menginjeksikan class `.super-hdr-divider` pada kolom batas di sub-header, data rows (`tbody td`), dan baris ringkasan (`tfoot td`) secara deterministik tanpa memerlukan intervensi manual.
- **Strict Prohibition of Colored Dividers**: DILARANG KERAS menggunakan garis pembatas vertikal berwarna tematik (seperti garis vertikal pink `--quad-a`, orange `--quad-b`, lime `--quad-c`, ungu `--quad-d`, dsb.). Warna aksen tema hanya boleh diterapkan pada teks judul super-header dan border horizontal atas (top accent), TIDAK pada garis pembatas vertikal pemisah kolom.
- **Universal Class & Token**: Seluruh selector pembatas kelompok super-header (`th.super-hdr`, `.col-sticky-last`, `.col-sticky-2`, `col-test-theme-grade`, dan `.super-hdr-divider`) wajib merujuk ke border netral yang seragam.

### 4.8 Zero Star Invariant pada Footer Tabel (Zero Star in Table Footers & Summaries)
- **Zero Decorative Stars in Footers**: Seluruh logo atau simbol bintang (`★`) pada footer tabel atau baris ringkasan rata-rata (`datagrid-summary-row` / `tfoot`) WAJIB DIHAPUS. Simbol bintang `★` tidak boleh lagi muncul di kolom identitas, batch, maupun di samping label rata-rata.
- **Clean Footer Labels**:
  - Kolom nomor/batch di baris rata-rata dirender kosong (`<td></td>`), bukan dengan simbol `★`.
  - Label rata-rata ditulis bersih dan lugas: `CLASS AVERAGE` (bukan `★ CLASS AVERAGE`) dan `BATCH AVERAGE (...)` (bukan `★ BATCH AVERAGE (...)`).
  - Simbol bintang `★` secara sistem strictly dikhususkan HANYA untuk predikat nilai sempurna 100% (Grade Star / Excellent) sesuai Rule 2.10 (Star Exclusivity), tidak boleh dijadikan dekorasi footer tabel.

---

## Bab 5: Lampiran Spesifik Komponen & Roster

### 5.1 Single-Responsibility Columns & Profile Click Invariant
- **Student Roster Column Sequence & Calibrated Widths (Authoritative SSOT)**:
  - **Super Header 1: `STUDENTS DATA` (`colSpan: 4`)**:
    `LEVEL` (46px, min 42px) $\to$ `PHOTO` (46px, min 42px, 30px avatar) $\to$ `GENDER` (68px, min 64px) $\to$ `NAME` (flex-primary, min 200px).
  - **Super Header 2: `DEMOGRAPHIC` (`colSpan: 3`)**:
    `DOB` (110px, min 105px) $\to$ `AGE` (50px, min 45px) $\to$ `EDUCATION` (140px, min 140px).
  - **Super Header 3: `ADDRESS` (`colSpan: 4`)**:
    `VILLAGE` (130px, min 120px) $\to$ `DISTRICT` (130px, min 120px) $\to$ `REGENCY` (160px, min 150px) $\to$ `PROVINCE` (160px, min 150px).
  - **Dynamic Class Columns & Status**:
    `CLASS EXAMS` (per-class exams, 4 $\times$ 74px) $\to$ `STATUS` (84px, min 80px).
  - **Zero Truncation Guarantee**: The calibrated widths guarantee that full entity names (`West Lombok`, `Senior High School`, `Nusa Tenggara Barat`, etc.) render completely without clipping (`...`) while preserving a balanced `NAME` flex-primary column.
- **Profile Modal on Click**: In Active Students roster, the Actions column is purged. Clicking on a student's Photo or Name directly opens their Dossier Profile modal. Student deletion is restricted exclusively to the Inactive Students tab.

### 5.2 Single-Line Compact Program Chips (Official 3–4 Letter Codes)
- Assigned programs/institutions render on a single non-wrapping line using standardized 3–4 letter uppercase codes: `CMP` (Camp), `EVN` (Evnikom), `SHR` (Sheraton), `EXP` (English Explorer). Full name appears via native HTML tooltip (`title="Camp, Evnikom, Sheraton"`).

### 5.3 DataGrid Default Configuration & Zero Neon Glow
- Unused leftmost multi-selection checkbox columns are completely purged; `DataGrid` defaults to `bulkActions: false`.
- All `box-shadow` neon glow effects on table columns and score dividers are strictly purged. Dividers render as crisp, flat 1px solid lines without drop-shadows.
