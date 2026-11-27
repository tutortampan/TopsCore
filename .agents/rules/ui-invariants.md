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

### 1.2 Universal 10px Container Gap & 4-Way Panel Perimeter Invariant (SSOT)
- **Bukan Hanya Antar-Elemen**: Aturan jarak 10 pixel **BUKAN HANYA** berlaku antar-elemen (kartu, form, tombol, toolbar, tabel), melainkan juga berlaku **MUTLAK sebagai jarak pembatas (clearance/gap) dengan seluruh panel di sekelilingnya (4-Way Panel Perimeter)**:
  1. **Panel Atas (Top Panel / Nav Tabs / Workspace Header)**: Jarak tepi atas elemen/kartu/tabel ke panel atas terkunci tepat **10px** (`padding-top: 10px;` atau `gap: 10px;`).
  2. **Panel Bawah (Sub Panel / Lower Panel 40px)**: Jarak tepi bawah elemen/kartu/tabel ke Sub Panel terkunci tepat **10px** (`padding-bottom: 10px;` atau `gap: 10px;`).
  3. **Panel Samping Kiri (Sidebar / Left Navigation)**: Jarak tepi kiri elemen/kartu/tabel ke sidebar terkunci tepat **10px** (`padding-left: 10px;`).
  4. **Panel Samping Kanan (Tepi Layar / Right Viewport Edge)**: Jarak tepi kanan elemen/kartu/tabel ke batas kanan monitor terkunci tepat **10px** (`padding-right: 10px;`).
- **Workspace Container Full-Perimeter Clearance**: Setiap container ruang kerja (`.admin-content`, `#mockup-table-canvas-wrap`, dialog container) konsisten menerapkan `padding: 10px 10px 10px 10px !important; box-sizing: border-box !important; gap: 10px !important;`.
- **Single Perimeter Ownership SSOT (Zero Nested / Double Padding)**: Kontainer induk workspace (`#admin-content-area` / `.admin-content`) adalah SATU-SATUNYA pemilik `padding: 10px` perimeter ruang kerja. Modul, view, grid-wrapper, atau split-panel apa pun yang di-render ke dalamnya **DILARANG KERAS** menambahkan `padding: 10px` lagi pada elemen wrapper terluarnya (`<div style="padding:10px; ...">`). Penambahan padding anak menciptakan akumulasi padding ganda (10px + 10px = 20px Phantom Gap) yang merusak estetika dan melanggar presisi 10px.
- **Zero Phantom Gaps**: Dilarang menggunakan margin ganda (20px–30px) atau jarak rapat 0px terhadap panel tepi. Seluruh perimeter dan celah internal seragam presisi 10px.
- **Strict Top Element Invariant & Direct Ceiling Docking SSOT**:
  Elemen pertama (paling atas) di dalam workspace container MUTLAK HANYA BOLEH salah satu dari dua entitas:
  1. **Table Header (`thead` dari `.table-wrap`)** untuk tampilan tabel/datagrid. Header tabel wajib menempel langsung pada ceiling ruang kerja dengan jarak persis 10px dari Top Panel (diberikan oleh padding 10px container induk). DILARANG KERAS menyisipkan sub-header bar, banner judul tabel, bar info, badge strip, atau legend mengambang di atas tabel!
  2. **Active Interactive Card** untuk tampilan dashboard/kontrol (kartu yang memiliki tombol aksi, filter dinamis, atau form interaktif). Dilarang membuat kartu statis yang hanya berisi teks keterangan atau info pasif di atas workspace.
- **Sub Panel Monopoly for Legends, Triage & Summaries**: Seluruh indikator status (Legend titik Full/Partial/Missed, Grade A/C/E), triage pills, counter akumulasi mingguan, dan action buttons WAJIB 100% berlabuh di **Sub Panel bawah (40px Lower Panel / `#admin-bottom-infobar`)** via `window.setBottomInfobar(leftHtml, rightHtml, centerHtml)`. Dilarang menempatkan legend atau keterangan rekap di atas atau di sekitar datagrid.

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
  - **CTA Ghost-to-Solid Button Invariant (Standby Ghost, Hover/Click Solid Matte)**:
    - Seluruh tombol aksi pada CTA Area (baik tombol sekunder `CLOSE` maupun tombol aksi utama) **WAJIB menggunakan pola Ghost-to-Solid**:
      - **Standby (Default)**: Ghost Outline Mode (`background: transparent !important;`, border 1.5px dan teks menyala mengikuti warna semantik token tanpa glow).
      - **Hover / Click (:active)**: Solid Filled Matte Mode (`background: [TOKEN_COLOR] !important; color: #FFFFFF / #0F172A; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4); text-shadow: none !important;`).
      - **Strict Stationary Hover**: DILARANG bergerak fisik saat hover (`transform: none !important;`).
  - **Universal Matte Enterprise Palette SSOT**: Seluruh tombol, kartu, badge, dan teks di seluruh sistem TopsCore LMS MUTLAK menerapkan warna matte murni tanpa neon glow, tanpa `text-shadow`, dan tanpa `box-shadow: 0 0 Xpx`. Efek hover dan tekan (:active) mengandalkan perubahan latar belakang solid atau kontras warna matte berbobot elevasi `box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4)`.

### 1.5.5 Unified Duplicate Resolver & Large Datagrid Dialog Invariant (SSOT)
- **Unified Workspace Layout**: Dialog peninjauan duplikasi profil siswa dan soal menyatukan seluruh cakupan (Same Class dan Cross-Class) dalam satu kanvas utuh tanpa tab navigasi terpisah yang memperlambat alur kerja.
- **Strict 1380px Modal Box Dimension**: Dialog yang memuat tabel data 8 kolom atau lebih wajib menerapkan `max-width: 1380px !important; width: 96vw !important;` (menggantikan pembatas sempit `.modal-box-lg 960px`) guna menjamin seluruh kolom (`RECORD UUID`, `PROGRAM / LEVEL`, `BATCH`, `INSTITUTION`, `ATTEMPTS`, `CREATED AT`, `ACTION`, dan `RESULT PREVIEW`) tampil utuh tanpa terpotong (*Universal Zero-Truncation*) dan tanpa memicu scrollbar horizontal di dalam kartu.
- **Card Header Single-Line Nowrap**: Baris judul kartu grup duplikat menggunakan `flex-wrap: nowrap` sehingga baris nama siswa dan kotak pratinjau `RESULT:` tampil simetris dalam satu baris sejajar.

### 1.5.6 Strict Zero-Pill & Zero-Box Inline Status Tag Invariant
- **Eradication of Boxed Tags**: Tag status inline (seperti `(Cross-Class)`, `(Same Class)`, `(Repeat - 130)`, `(Alumni - 131)`) **MUTLAK DILARANG KERAS MENGGUNAKAN BORDER KOTAK, OUTLINE SQUIRCLE, ATAU LATAR BELAKANG PILL CAPSULE**.
- **Pure Typography Inline Standard**: Tag status murni berupa teks tebal berbobot `font-weight: 600–700` dengan ukuran baku `font-size: 12px !important;` yang menempel rapi di sebelah nama siswa atau label grup:
  - **Repeat**: Warna Oranye (`#FF8C00` / `var(--quad-b)`), contoh: `Suke Ajai (Repeat - 130)`.
  - **Alumni**: Warna Ungu (`#c084fc` / `var(--grade-star)`), contoh: `Siti Qori' Atun Hizbaeni (Alumni - 131)`.
  - **Cross-Class**: Warna Oranye (`#FF8C00` / `var(--quad-b)`), contoh: `Duplicate Group 1 — Name: "..." (Cross-Class)`.
  - **Same Class**: Warna Cyan (`#38bdf8` / `var(--primary-tactical)`), contoh: `Duplicate Group 1 — Name: "..." (Same Class)`.
- **Mutual Exclusivity**: Status `(Repeat - ...)` dan `(Alumni - ...)` bersifat saling eksklusif; siswa yang mengulang tidak boleh menampilkan tag alumni.

### 1.6 Architectural Anti-Freeze & Performance Invariants

#### 1.6.1 MutationObserver Loop Prevention & DOM Re-Entrancy Guard (Anti-Freeze Invariant)
Always disconnect observers or flag `isMutating` during programmatic DOM updates.

#### 1.6.2 In-Memory Reference Data Caching & Anti-Query-Waterfall Invariant
Cache structural reference data in memory; never re-query static tables on every tab switch.

### 1.7 Protokol Audit Tangkapan Layar & Visual Invariant Audit (7 Pillars SSOT)
Setiap kali pengguna mengunggah tangkapan layar (screenshot), agen WAJIB secara proaktif melakukan audit visual menyeluruh berdasarkan 7 pilar tanpa menunggu diminta:
1. **Spacing, Container Gaps & 4-Way Panel Perimeter (Strict 10px Lock)**: Jarak 10 pixel BUKAN HANYA antar-elemen (kartu, form, tombol, toolbar, tabel), melainkan juga berlaku MUTLAK sebagai jarak pembatas perimeter dengan panel atas (Top Panel), panel bawah (Sub Panel), dan panel samping (Sidebar & tepi kanan). Seluruh sisi terkunci tepat 10px (`padding: 10px; gap: 10px;`), bebas gap ganda 20px–30px atau phantom gaps.
2. **Card Internal Padding (Strict 10px Lock)**: Jarak konten dalam kartu ke garis border luar tepat 10px.
3. **Dual-Scale Typography Architecture**: Skala terpusat (12px, 14px, 16px, 20px, 30px, 40px); mutlak nol font sub-12px dan nol angka perantara liar (18px, 13px, 15px).
4. **Punctuation & Zero-Truncation**: Titik dua wajib menempel ke kata tanpa spasi (`Label:` bukan `Label :`), teks tidak terpotong (*zero truncation/ellipsis*).
5. **Color SSOT & Semantic Precision**: Menggunakan token resmi (`#38bdf8` Tactical Blue, Grade Vault tokens), dilarang menggunakan warna hijau Grade A pada status input belum terverifikasi. Seluruh tema mematuhi arsitektur 3-Theme Spectrum (Navy, Charcoal Dark, Tiered Grey Light).
6. **Language Purity (100% English)**: Seluruh label, judul, tombol, dan pesan instruksi wajib dalam bahasa Inggris murni (zero mixed languages).
7. **Clutter & Redundancy Eradication**: Mutlak nol deskripsi redundan (*Zero Subtitle Clutter* & *Zero Description Clutter*) dan mutlak nol pendaran neon liar pada posisi standby (*Flat Enterprise Precision & Zero Standby Aura*).

### 1.8 Standardized 50px Bottom Banner Invariant (`#bottom-ad-banner` / `.topscore-locked-banner`) (SSOT)
Seluruh halaman sistem TopsCore LMS (Student Realm & Admin Realm) menerapkan banner bawah permanen terkunci (**Locked Base Banner**) dengan aturan baku mutlak:
1. **Strict 50px Height Lock**: Tinggi banner bawah terkunci mati tepat **`50px`** (`height: 50px !important; min-height: 50px !important; max-height: 50px !important; box-sizing: border-box !important;`).
2. **Centered Alignment SSOT**: Teks `"TopsCore by Mr. Top"` berada tepat di tengah (*centered*) secara mutlak di seluruh realm (`justify-content: center !important; text-align: center !important; padding: 0 16px !important;`), baik pada kontainer banner maupun inner wrapper (`.banner-brand-wrap` & `.banner-brand-content`). Aturan lama yang menerapkan rata kiri (*left-aligned*) dan asymmetric padding kiri telah resmi dihapus dan dilarang.
3. **Dual-Viewport Invariant Execution**:
   - **Student Realm (Mobile Corridor 430px)**: Banner terkunci terpusat pada koridor mobile dengan `max-width: 430px !important; margin: 0 auto !important; left: 0; right: 0; bottom: 0; position: fixed !important;`.
   - **Admin Desktop Realm (100vh Workstation)**: Banner menempel di dasar layar monitor (`width: 100vw; bottom: 0; left: 0; position: fixed !important;`). Konsol kerja `#admin-console` memotong tepat 50px (`height: calc(100vh - 50px) !important; max-height: calc(100vh - 50px) !important;`) untuk menjamin zero outer page scroll (100vh lock sempurna).
4. **Internal Spacing & Clearance**:
   - Pada halaman dengan scrollable content, body mengalokasikan padding bawah `padding-bottom: calc(50px + env(safe-area-inset-bottom, 0px)) !important;`.
   - Pada halaman hasil (`result.html`) dan ruang ujian (`test.html`) yang menerapkan *Zero-Scroll Single Screen Architecture*, jarak vertikal dari elemen/tombol terbawah (misal `#back-dashboard-btn`) ke banner terkunci tepat **10px** (`padding-bottom: 10px; gap: 10px;`).
5. **Uniform 12px Brand Typography & Colors (SSOT)**:
   - **Ukuran & Berat Seragam**: Seluruh teks banner (`TopsCore` maupun `by Mr. Top`) berukuran **`12px`** (`font-size: 12px !important;`), font `'Inter', sans-serif`, dan bobot identik **`font-weight: 700` (Bold)** (`letter-spacing: 0.04em`). Aturan lama yang membedakan ukuran/berat (16px/14px, 900/800) telah resmi dihapus demi kerapian visual.
   - **Brand**: `TopsCore` menggunakan warna Tactical Cyan (`#38bdf8`) dengan warna matte tegas (`text-shadow: none !important;`).
   - **Author**: `by Mr. Top` menggunakan warna White Slate (`#f8fafc`).
   - **Background & Border**: Background `#070b19` (matte solid dark tanpa radial glow), border atas `1px solid rgba(56, 189, 248, 0.25)` (atau `1.5px solid var(--tier-color)` saat tier aktif) dengan drop-shadow matte `0 2px 8px rgba(0, 0, 0, 0.35)`.

### 1.9 Workspace Dual-Zone Rule (Card + Table Layout Invariant SSOT)
Dalam perancangan workspace/halaman workstation admin yang memadukan Kartu Kontrol / Governance / Indikator (*Cards/Panels*) dengan Tabel Data (*Data Table/Datagrid*), arsitektur tata letak **MUTLAK** memilih salah satu dari 2 format resmi:
1. **Split Horizontal (Cards Kiri & Tabel Kanan)**:
   - `Cards/Panels di sisi KIRI` (proporsional 35%–40%), `Table di sisi KANAN` (60%–65%).
   - Digunakan optimal HANYA jika tabel memiliki sedikit kolom ($\le 6$–7 kolom) atau cards membutuhkan ruang vertikal penuh dari atas ke bawah.
2. **Split Vertikal (Cards Atas & Tabel Bawah — SSOT Multi-Column Datagrids)**:
   - `Cards/Panels di sisi ATAS` (dalam satu baris horizontal / grid multi-kolom yang proporsional, `flex: 0 0 auto;`, tinggi baku terikat ~160px–180px).
   - `Table di sisi BAWAH` (memanfaatkan lebar layar penuh / *full-width container*, `flex: 1 1 0 !important; min-height: 0 !important;`).
   - **Wajib diterapkan saat tabel memiliki banyak kolom ($\ge 8$–12 kolom)** seperti Curriculum Hub (`#classes-hub`), Roster Table, dan Matriks Kelas, agar seluruh kolom data memiliki ruang horizontal yang lega, bebas kompresi/crowding, dan bebas pemotongan teks (*zero text wrapping/truncation*).
3. **Strict Zero Toolbars Invariant**:
   - Di dalam body workspace dilarang keras membuat toolbar mandiri (seperti search bar, filter bar, atau action button bar mengambang di antara card dan table). Seluruh filter dan aksi global wajib berlabuh di Top Panel atau Sub Panel (40px Lower Panel).
4. **Strict 100vh Lock**:
   - Workspace container tetap terkunci penuh (`height: 100% !important; overflow: hidden !important; gap: 10px; padding: 10px; box-sizing: border-box;`). Tabel di bagian bawah menggunakan `.table-wrap` dengan `overflow-y: auto !important; overflow-x: auto !important;` sehingga scrollbar hanya terjadi di dalam area tabel data.

### 1.10 Alphabetical Ordering First Priority Invariant (SSOT Aturan Baku Pengurutan Alfabetis)
Setiap kali sistem melakukan pengurutan (*sorting*), merender daftar modul, kartu komponen, dropdown list, option menu, atau elemen antarmuka yang setara, **urutan alfabetis (Alphabetical A–Z) MUTLAK menjadi aturan yang dipertimbangkan pertama kali (First Priority Consideration)**:
1. **Modul Pembelajaran & Evaluasi (Evaluation Engines)**:
   - Urutan nama modul dalam satu keluarga engine wajib selalu tersusun alfabetis:
     1. **Recognition Module** (R)
     2. **Spoken Module** (S)
     3. **Written Module** (W)
   - Berlaku seragam pada kartu kontrol tata kelola (*Governance Cards*), aturan pacing kata/frase (*Pacing Cards*), deskripsi engine di kolom tabel workstation, modal pengaturan, dan definisi metadata kurikulum.
2. **Dropdown, Option List & Komponen Seleksi**:
   - Seluruh daftar pilihan dalam `<select>`, dropdown menu kustom, checkbox list, dan filter yang tidak memiliki hierarki numerik bawaan (seperti Level 1, 2, 3) WAJIB diurutkan secara alfabetis (A–Z) guna memudahkan pemindaian visual (*visual scanning*) yang intuitif dan cepat.
3. **Pengecualian**:
   - Hanya dikecualikan jika ada hierarki ordinal/numerik yang tegas dan mengikat (misal: urutan jenjang Level 1 $\rightarrow$ Level 2 $\rightarrow$ Level 3, urutan ranking juara 1 $\rightarrow$ 2 $\rightarrow$ 3, atau urutan topik kurikulum A1 $\rightarrow$ A2 $\rightarrow$ B1).

### 1.11 Universal 3-Theme Spectrum Architecture (Navy, Charcoal Dark, Tiered Grey Light SSOT)
TopsCore LMS menerapkan arsitektur 3-Theme Spectrum terstandarisasi di seluruh workstation admin dan antarmuka sistem:
1. **Navy Mode (`data-theme="navy"`)**:
   - Canvas: `#090D16` | Cards/Tables: `#0F172A` | Headers: `#0F172A` | Gridlines: `rgba(255, 255, 255, 0.05)`
2. **Charcoal / Black OLED Mode (`data-theme="dark"`)**:
   - Canvas: `#141414` / `#161616` | Cards/Tables: `#212121` | Headers: `#2a2a2a` | Gridlines: `#2d2d2d`
3. **Tiered Grey Light Mode (`data-theme="light"`)**:
   - Canvas: `#eef2f6` (Soft Calm Slate — Level 0 canvas yang nyaman di mata, bukan putih silau 100%)
   - Cards & Table Paper: `#ffffff` (Elevated White Paper Card — Level 1 surface dengan border `#cbd5e1`)
   - Sidebar & Headers: `#1e293b` (Sleek Light Charcoal / Slate Gray — lebih terang, modern, dan nyaman di mata)
   - Gridlines: `#cbd5e1` (garis kisi antar-sel `td`)
- **Universal Dark Header Framing Across All Themes**:
  Header tabel dan sub-navbar konsisten mempertahankan latar belakang gelap (`#0f172a` / `#212121`) di SEMUA tema termasuk Light Mode, dengan teks/font yang berwarna sesuai kelompok kategori (Theme A Pink, Theme B Orange, Theme C Lime, Theme D Cyan). Hal ini menjamin keterbacaan, keteraturan visual, dan kekompakan CTA di seluruh spektrum tema.

---

## Bab 2: Tipografi & Skala Font Terpusat (Single-Font Architecture: Inter SSOT)

### 2.0 Single-Font System Architecture (100% Inter Typeface SSOT)
TopsCore LMS strictly governs typography through a pure Single-Font Architecture:
1. **`Inter`** (`--font-sans` / `--fm-font-sans` / `--font-display` / `--fm-font-display`):
   - **Exclusive Typeface**: The font **`Inter`** (`'Inter', sans-serif`) is the single authoritative typeface used throughout the entire application for all headers, titles, cards, hero metrics, datagrids, form controls, and CTAs.
   - **Eradication of Outfit**: The previous font `Outfit` is completely eradicated and forbidden from all parts of the system.
   - **Weight Hierarchy**: Visual contrast and hierarchy are established exclusively through weights (`400` Regular for sub-headers, `500` Medium for normal table data cells, `600` SemiBold for student names and sticky identifier columns, `700` Bold for super-headers, labels, and CTA buttons, `800` Extra Bold for card headers and modal titles, `900` Black for brand hero titles and KPI landmarks).
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

### 2.8 Standard Student Name (`studentName`) & Dashboard/Result Title (`Mr.` / `Miss`) (AGENTS.md §2.23)
- Student names across database, sessions, admin tables, exam rooms, and exports are authentic standard names (`studentName`).
- Gender honorific titles (`Mr.` / `Miss`) and champion titles (`King` / `Queen`) are presented on both the **Student Dashboard** (`dashboard.html`) and **Result Page** (`result.html`).

---

## Bab 3: Desain Sistem & Warna Terpusat

### 3.1 Universal Single-Source Color Governance & One-Touch Propagation Invariant ("Rubah Satu Maka Rubah Semua")
Pemisahan Tegas Warna Akademik vs UI Chrome:
- **Warna Akademik / Grade / Rapor**:
  - **Semua Merah Ikut Grade E**: Error, delete, bahaya, tanda bintang wajib `*`, alert kritis WAJIB merujuk ke Grade E (`--grade-e`, `var(--grade-e)`, `TOPSCORE_COLORS.E`, `.text-fail`).
  - **Semua Kuning Ikut Grade C**: Warning, latency alert, pending, draft WAJIB merujuk ke Grade C (`--grade-c`, `var(--grade-c)`, `TOPSCORE_COLORS.C`, `.text-warning`).
  - **Semua Hijau Ikut Grade A**: Sukses, kelulusan, online, published WAJIB merujuk ke Grade A (`--grade-a`, `var(--grade-a)`, `TOPSCORE_COLORS.A`, `.text-success`).
  - **Star (★) Independence & Exclusivity**: System Grade `★` (100%) uses Pure Green (`#00c000ff` / `var(--grade-a)`) per `AGENTS.md` §2.10, while Result Page Celebration Gimmick (`LEGEND`) & CSS `--grade-star` use Vibrant Purple (`#a855f7` / `#c084fc`). Pink (`#ff2d87`) is exclusively reserved for Pillar A / Quad A (`--quad-a`), never merged with Grade Star.
  - **Universal Dark Badge Text**: Grade badges (`.grade-circle`) render dark slate (`#0F172A`) for all symbols.
- **UI Chrome**: Kanvas workstation `#090D16`, sidebar `#0F172A`, border `rgba(255,255,255,0.08)`, metadata slate `#94A3B8`, tactical blue `#38BDF8`, indigo `#6366F1`.
- **Standar Warna 4-Pillar (ABCD System & ABCD Tema)**:
  - Pillar A (Theme A / Exam 1): **Electric Pink** (`--quad-a`, `TOPSCORE_QUAD_COLORS.A`: `#ff2d87`).
  - Pillar B (Theme B / Exam 2): **Dark Orange** (`--quad-b`, `TOPSCORE_QUAD_COLORS.B`: `#FF8C00`).
  - Pillar C (Theme C / Exam 3): **Electric Lime** (`--quad-c`, `TOPSCORE_QUAD_COLORS.C`: `#95ff00`).
  - Pillar D (Theme D / Exam 4): **Tactical Cyan** (`--quad-d`, `TOPSCORE_QUAD_COLORS.D`: `#38bdf8`).

### 3.2 Universal Inverted Percentage Scale for Negative Metrics
- Achievement metrics follow normal grade colors (`getGradeColorByScore()`).
- Negative error metrics (Error Rate, Mistake Rate, Fail Rate, Timeout Rate) MUST invert scale via `getInvertedGradeColor()`: $\le 10\%$ (Green Grade A), $11-20\%$ (Lime Grade B), $21-40\%$ (Yellow Grade C), $41-70\%$ (Orange Grade D), $> 70\%$ (Red Grade E).

### 3.3 Anti-Ambiguity Disambiguation Guard (12 System Truths)
1. **Grade Star (★) vs Theme A Pink**: System Grade `★` (`TOPSCORE_COLORS.STAR`, Pure Green `#00c000ff`) and Result Page `★` Gimmick (`--grade-star: #a855f7` / `#c084fc`) are completely decoupled and distinct from Theme A Pink (`--quad-a: #ff2d87`). Never swap or merge them.
2. **Student Name Scope**: Standard authentic name (`studentName`) in database, sessions, test room, conversation room, and admin tables; `Mr.` / `Miss` (and `King` / `Queen`) honorific titles presented exclusively on **Student Dashboard** (`dashboard.html`) and **Result Page** (`result.html`) (Rule 2.23).
3. **Sub-Header Typography**: Super-header baris 1 bold (700); Sub-header baris 2 **REGULAR (400, strictly NOT bold)**; Spanning standalone header 60px (`rowspan="2"`). Sel data tabel normal menggunakan weight 500 (Medium), dan nama siswa/kolom sticky menggunakan weight 600 (SemiBold).
4. **Words vs Phrases & Task vs Exam Colors**: Words & TASK = Electric Lime (`#95ff00`, `var(--grade-b)`); Phrases & EXAM = Electric Pink (`#ff2d87`, `var(--quad-a)`). Konteks semantik dengan Grade B dibedakan secara visual melalui tipe elemen UI (chip/label teks vs badge rapor bulat). Pip 7 spektrum pelangi tetap menggunakan Ungu Spektrum (`#C084FC` / `--rainbow-step-7`).
5. **Inverted Scale on Negative Metrics**: Error/timeout/fail rate $\le 10\%$ is Green Grade A, $>70\%$ is Red Grade E via `getInvertedGradeColor()`.
6. **Regency vs City**: Regencies drop "Regency" (*East Lombok*); Cities retain "City" (*Mataram City*). Sequence: Village $\to$ District $\to$ Regency $\to$ Province.
7. **Zero Star in Table Footers**: Table summaries dilarang ada bintang `★` (`CLASS AVERAGE`, bukan `★ CLASS AVERAGE`).
8. **Continuous Neutral Dividers**: Super-header boundary vertical dividers from row 1 to footer are strictly thick 2px neutral (`rgba(255, 255, 255, 0.22)`), never colored.
9. **Zero Emojis**: Dilarang unicode emojis di UI/tabel; strictly vector SVG icons via `getClassSvgIcon()`.
10. **Zero Table Capsule & Zero Table Glow**: Seluruh isi sel tabel bebas kapsul, pill, badge, border kotak kapsul, dan background-fill (status semantik hanya melalui warna font teks); mutlak nol glow, text-shadow, atau box-shadow di seluruh sel tabel (`AGENTS.md` §2.31 & §4.9). Sel data tabel (`td`) WAJIB memiliki garis pembatas kisi adaptif (Adaptive Dual-Layer Gridlines: `border-bottom` dan `border-right`, dengan `:last-child { border-right: none; }`).
11. **Level 0 (Non-Level `0`) vs Alumni (Level X)**: `Level 0` (`level_number = 0`) adalah program tanpa jenjang (single-tier, misal institusi TOP). Ditampilkan di seluruh tabel workstation admin (kolom `LVL`), filter dropdown, dan modal sebagai angka **`0`** (bukan tanda strip `—`), dan pada baris metadata identitas Student Dashboard/Result sebagai tahun enrollment (misal `2026`). Tanda strip `—` hanya digunakan sebagai representasi data kosong/belum ditentukan (`null`/`undefined`). `Level X` (`level_number = 99`) adalah Alumni kelulusan puncak setelah Level 3, ditampilkan sebagai simbol **`X`** ungu (`#c084fc` / `var(--grade-star, #a855f7)`). Alumni mutlak dilarang menggunakan angka 0.
12. **Zero-Level Omission Invariant**: Program tanpa jenjang (Level 0) wajib meniadakan seluruh segmen level pada nama kelas & kode kelas (`EVNK-VOCAB`, `SHRT-VOCAB`, `TPTC-VOCAB`), serta menggunakan prefix `0` konsisten pada kode tema/tes Level 0 (`Evnikom Vocabulary Task 0G1 - Time Name`, `EVNK-VCB-0G1-TASK`).
13. **Interface System (3-Pillar UI Governance SSOT)**: Seluruh kendali tema UI dipusatkan di panel **Interface System** (Domain D System Settings) dengan 3 sub-tab terpadu: *Colours & Palette*, *Typography & Texts*, serta *Surface & Chrome*. Seluruh perubahan dipropagasi secara realtime ke CSS variables (`:root`) dan dipersistensikan secara global ke `site_settings` serta `localStorage`.

### 3.4 Ghost-to-Solid Matte Button Invariant (Aturan Baku Tombol TopsCore SSOT)
Aturan baku antarmuka untuk seluruh tombol aksi, mode toggle, dan kontrol sistem:
1. **Standby / Inaktif = Ghost Outline Mode & Flat Precision**:
   - Latar belakang transparan (`background: transparent`).
   - Garis tepi (*border*) tipis 1px dan teks menyala mengikuti warna semantik token yang dialokasikan (Cyan, Kuning, Merah, Hijau, Ungu, Pink).
   - **Flat Enterprise Precision (Zero Standby Glow & Zero Heavy Shadow)**: Pada posisi standby/diam, tombol, badge, dan kartu MUTLAK BEBAS dari efek glow atau bayangan berat (`box-shadow: none !important; text-shadow: none !important;`). Pada Light Mode, kartu kerja menggunakan elevasi mikro `box-shadow: 0 1px 3px rgba(0,0,0,0.04)`.
   - Mengeliminasi *visual noise* dan kejenuhan mata pada semua tema.
2. **Aktif / ON / Pressed = Solid Filled Mode**:
   - Latar terisi penuh warna padat sesuai alokasi token (`var(--primary-tactical, #38bdf8)` untuk Cyan, `var(--grade-c)` untuk Kuning, `var(--grade-e)` untuk Merah, `var(--grade-a)` untuk Hijau, `var(--grade-star, #a855f7)` untuk Ungu).
   - Efek iluminasi aktif terfokus hanya pada interaksi tombol CTA primer dengan tampilan matte bersih tanpa neon bleed (`text-shadow: none !important;`).
3. **Aturan Kontras Teks (Luminance Contrast — `DECISION-087`)**:
   - Warna latar terang (Cyan `var(--primary-tactical, #38bdf8)`, Kuning `var(--grade-c)`, Hijau `var(--grade-a)`): Teks WAJIB gelap (**`#090D16`** / **`#0F172A`**).
   - Warna latar pekat (Merah `var(--grade-e)`, Ungu `var(--grade-star, #a855f7)`, Pink `var(--quad-a)`): Teks WAJIB putih (**`#FFFFFF`**).
4. **Anti-Layout Shift (Zero CLS)**:
   - Tombol toggle mode yang labelnya berganti (misal: `Edit Mode` $\to$ `Done Editing`) WAJIB mengunci lebar tetap (`width`, `min-width`, `max-width`) untuk mencegah pergeseran layout tombol di sekitarnya.
5. **Strict Zero-Movement Hover Invariant (Anti-Clipping & Anti-Jitter SSOT)**:
   - **DILARANG KERAS** menggunakan animasi pergerakan fisik saat hover atau ditekan (`transform: translateY(...)`, `transform: scale(...)`, `translate`, atau pergeseran margin/top).
   - Pergerakan fisik sekecil 1px (`translateY(-1px)`) terbukti membuat garis batas atas tombol (*top border*) terpotong/hilang karena membentur batas *overflow* kontainer atau terdistorsi *sub-pixel rendering*.
   - Efek hover MURNI HANYA elevasi bayangan matte bersih (`box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);`, nol *neon glow* & `text-shadow: none !important;`) dan peningkatan saturasi warna latar tipis (*subtle background tint*), posisi fisik tombol WAJIB tetap diam 100% (*strictly stationary* `transform: none !important;`).

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
- **Anti-Double Divider Line Invariant (Unified Single Border SSOT - "Garis yang Sejalur Wajib Disatukan, Dilarang Double")**:
  - Apabila terdapat dua garis atau border yang berada pada jalur/sumbu perbatasan yang sama (misalnya pertemuan sisi kanan kolom sebelumnya `border-right` dengan sisi kiri kolom berikutnya `border-left`, atau garis pembatas antar-komponen/sticky headers), garis tersebut **MUTLAK WAJIB DISATUKAN menjadi 1 garis tunggal (single 2px line)**.
  - **Dilarang Keras Double Border**: DILARANG KERAS membiarkan dua elemen yang bersentuhan sama-sama memiliki border di sisi pertemuan yang sama sehingga garis tampak mendua (*double border*) atau menebal menjadi double (`2px + 2px = 4px`). Penegakan dilakukan dengan mendeklarasikan border hanya pada satu sisi (`border-right: 2px solid ...; border-left: none !important;`) atau memanfaatkan `border-collapse: collapse` secara presisi.

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
  - Seluruh isi sel tabel (`table td`, `.datagrid-table td`, `.table-wrap td`, `.classes-hub-grid-row`, `.tree-grid-row`, `.matrix-table td`, floating window tables, modal student lists `#modal-theme-open-session`, `#modal-theme-live-monitor`, dll.) **MUTLAK TIDAK BOLEH** menggunakan kapsul, pill, badge, background fill/box (`background: transparent !important;`), border kotak kapsul (`.badge { border: none !important; }`), maupun padding badge (`padding: 0 !important;`).
  - **Yang Boleh Berwarna HANYA Font Teks Saja**: Arti semantik status (seperti `Active` hijau `var(--grade-a)`, `Inactive` merah `var(--grade-e)`, `Hold` kuning `var(--grade-c)`, `Published` hijau, `Draft` netral, `EXAM` orange, `TASK` indigo, status kesiapan ujian `Tasks Completed (Exam Ready)`, `Tasks Incomplete`, status eligibility, dll.) HANYA boleh direpresentasikan melalui warna font teks tipografi (`color: ...`). Font di dalam tabel tampil flat menyatu dengan baris tabel tanpa kapsul pembungkus.
- **Ketegasan Garis Pembatas Kisi Sel (Adaptive Dual-Layer Gridlines)**:
  - Larangan border kotak di atas khusus melarang elemen badge/kapsul di dalam sel, TETAPI sel tabel (`td`) itu sendiri **WAJIB memiliki garis pembatas kisi adaptif (Adaptive Dual-Layer Gridlines)** berupa `border-bottom` dan `border-right` tipis per tema (`#e2e8f0` di Light, `#2d2d2d` di Charcoal Dark, `rgba(255, 255, 255, 0.05)` di Navy, dengan `:last-child { border-right: none; }`).
- **Mutlak Nol Glow (Zero Text-Shadow & Zero Box-Shadow) di Seluruh Sistem**:
  - Dilarang keras menggunakan efek GLOW, text-shadow, box-shadow, filter glow, atau pendaran neon apa pun pada teks maupun elemen di dalam isi sel tabel di SELURUH SISTEM (`text-shadow: none !important; box-shadow: none !important; filter: none !important;`).
  - Teks di dalam tabel wajib terbaca tegas, bersih (*crisp, matte*), kontras tinggi, dan bebas blur atau efek neon yang mengaburkan ketajaman angka dan huruf.

### 4.10 Standar Formula Kode Kelas: PROGRAM-LEVELCLASS (SSOT)
- **Formula Baku**: `PROGRAM-LEVELCLASS` (contoh bertingkat: `CAMP-3VOCAB`, `CAMP-1BASIC`, `CAMP-2SPEAK`).
- **Segmen 1 (PROGRAM)**: Singkatan program 4-huruf resmi (`CAMP` = Camp, `EVNK` = Evnikom, `SHRT` = Sheraton, `TPTC` = Tamata, `EXPL` = English Explorer).
- **Separator**: Tanda hubung (`-`).
- **Segmen 2 (LEVELCLASS)**: Angka level belajar murni langsung digabung dengan singkatan kelas tanpa spasi dan tanpa huruf 'L' (contoh: `3VOCAB`, `1BASIC`, `1STORY`, `2SPEAK`).
- **Pengecualian Program Tanpa Jenjang (Level 0 / Zero-Level Omission Invariant)**:
  - Pada program yang tidak memiliki jenjang bertahap (seperti seluruh program institusi TOP: Evnikom, Sheraton, Tamata), angka level **wajib ditiadakan (dianggap kosong)** sehingga formulanya murni `PROGRAM-CLASS` (contoh: `EVNK-VOCAB`, `SHRT-VOCAB`, `TPTC-VOCAB`). Dilarang keras mencantumkan angka 1 (`EVNK-1VOCAB`).
- **Penegakan Sistemik**:
  - Kolom `classes.code` di database Supabase wajib mematuhi formula ini.
  - Tampilan pada tabel admin (`admin.html#classes-hub`) dan auto-generator/placeholder di `crud-modals.js` wajib menghasilkan format ini.

### 4.11 Universal Two-Tier Themed Headers Architecture (Dark Surface with Category-Themed Colored Fonts Across All Tables SSOT)
- **Universal Two-Tier Themed Headers across ALL Tables in TopsCore (Font Saja Yang Berwarna)**:
  - Setiap tabel di seluruh sistem TopsCore (baik `#class-attendance-grid`, `student_roster_raport_grid_v2`, `student_roster_data_grid_v2`, `#blueprint-matrix-table`, `#vault-table`, maupun tabel modular/dinamis lainnya) yang memiliki dua tingkat header (Baris 1 Super-Header dan Baris 2 Sub-Header) **WAJIB menerapkan latar belakang gelap pekat solid (`#0b1120`, `#0f172a`, atau `#212121`) dengan HANYA FONT/TEKS YANG BERWARNA**, dan format pembingkaian gelap ini **BERLAKU SERAGAM DI SEMUA TEMA TERMASUK LIGHT MODE** (Solid Dark Header Framing with Category-Themed Fonts).
  - Dilarang menggunakan blok latar belakang neon/terang solid yang berat dan menyilaukan mata pada tema gelap (*no full bright solid background blocks*).
  - Sub-Header pada Baris 2 **MUTLAK MENGIKUTI 100% warna font/teks Super-Header induknya** di atas kanvas latar belakang gelap pekat yang sama dengan bobot font regular (`font-weight: 400 !important;`).
- **Larangan Efek Opasitas Murky (Anti-Muddy Background SSOT)**:
  - Latar belakang header wajib 100% solid opacity (`#0b1120`, `#0f172a`, atau `#212121`) agar baris tabel yang di-scroll di bawahnya tidak tembus pandang (*no opacity bleed-through*). Dilarang keras menggunakan opasitas parsial (`rgba 0.5–0.9`).
- **Pemisah Antar-Baris & Garis Grid Excel (Crisp Excel Gridlines Invariant)**:
  - Garis horizontal 1px halus (`border-bottom: 1px solid rgba(255, 255, 255, 0.18) !important;`) membatasi Super-Header dan Sub-Header secara presisi.
  - Garis batas vertikal antar-kelompok kolom menggunakan border solid 2px (`border-right: 2px solid rgba(255, 255, 255, 0.22) !important;`).
- **Pemetaan Warna Font Header & Sub-Header Kuadran/Kategori SSOT**:
  - `STUDENTS DATA` / `CURRICULUM IDENTITY` (`BTC`, `STUDENT NAME`, `NO`, `INST`, `PROGRAM`, `LVL`, `CLASS NAME`, `CODE`, `STUDENTS`): Latar `#0b1120` / `#0f172a`, font putih bersih `#ffffff` atau slate `#94a3b8`, bold 700 (Row 1) & regular 400 (Row 2).
  - `THEME A` / `PHRASES BREAKDOWN` & sub-kolomnya: Latar `#0b1120` / `#0f172a`, font Electric Pink `var(--quad-a, #ff2d87)`, bold 700 (Row 1) & regular 400 (Row 2).
  - `THEME B` / `PASSING STANDARDS` / `GENERATION BLUEPRINT` & sub-kolomnya: Latar `#0b1120` / `#0f172a`, font Dark Orange / Amber `var(--quad-b, #ff8c00)`, bold 700 (Row 1) & regular 400 (Row 2).
  - `THEME C` / `READINESS` / `METRICS SUMMARY` & sub-kolomnya: Latar `#0b1120` / `#0f172a`, font Electric Lime `var(--quad-c, #95ff00)`, bold 700 (Row 1) & regular 400 (Row 2).
  - `THEME D` / `ASSESSMENT ENGINE` / `WORDS BREAKDOWN` / `CURRICULUM TOPIC` & sub-kolomnya: Latar `#0b1120` / `#0f172a`, font Tactical Cyan `var(--quad-d, #38bdf8)`, bold 700 (Row 1) & regular 400 (Row 2).
  - `OVERALL` / `VOCABULARY POOL` (`DONE`, `PTS`, `GRD` / `ITEMS`, `WORDS`, `PHRASES`): Latar `#0b1120` / `#0f172a`, font Vibrant Star Purple `var(--grade-star, #c084fc)`, bold 700 (Row 1) & regular 400 (Row 2).
  - `DEMOGRAPHIC`, `ADDRESS`, `SECURITY`, `CLASSES`: Latar `#0b1120` / `#0f172a`, font putih bersih `#ffffff`, bold 700 (Row 1) & regular 400 (Row 2).
  - `EXAM` (Theme Exams): Super-Header Ujian (`THEME A EXAM`, `THEME B EXAM`, dst.) wajib 100% mengikuti warna kuadran tema induknya (Pink untuk Tema A, Oranye untuk Tema B, Lime untuk Tema C, Cyan untuk Tema D) dan SELARAS 100% dengan seluruh sub-header ujiannya (`WRD %`, `W-PTS`, `PHR %`, `P-PTS`, `ACC`, `GRD`, `STS` atau `RATE`, `PTS`, `GRD`, `STS`). Dilarang keras super-header ujian berwarna kuning sementara sub-headernya berwarna kuadran tema.
- **Aturan Keselarasan Warna Super Header dan Sub Header (100% Exact Group Color Match Invariant)**:
  - Setiap super-header dan seluruh sub-header di bawah kelompok kolom yang sama WAJIB memiliki warna font/teks yang 100% PERSIS SAMA (satu kelompok = satu warna identik).
  - Dilarang keras super-header berwarna berbeda dari sub-headernya (misal: super-header kuning sementara sub-header pink).
  - Ujian tema (Exam) adalah anggota keluarga tak terpisahkan dari tema terkait, sehingga Super-Header Ujian (`THEME A EXAM`, `THEME B EXAM`, dst.) wajib menggunakan warna kuadran tema aktif (Electric Pink `#ff2d87` untuk Tema A, Dark Orange `#ff8c00` untuk Tema B, Electric Lime `#95ff00` untuk Tema C, Tactical Cyan `#38bdf8` untuk Tema D) dan dilarang keras di-override ke warna kuning/amber arbitrer.
- **Anti-Double Divider Line Invariant**:
  - Garis pembatas vertikal antar-kelompok kolom yang berada pada jalur/sumbu pertemuan yang sama WAJIB DISATUKAN menjadi 1 garis tunggal 2px (`border-right: 2px solid rgba(255, 255, 255, 0.22); border-left: none !important;`). Dilarang keras border ganda 4px (`border-right` + `border-left`) yang membuat garis tampak menebal atau berhimpit.
- **Sub Panel Theme/Topic Navigation Architecture (Zero Floating Bar SSOT)**:
  - Seluruh tombol navigasi tema (`OVERVIEW`, `THEME A`, `THEME B`, `THEME C`, `THEME D`) dan topik berlabuh di **Sub Panel (Lower Panel 40px) pada sisi paling kiri (`flex-start`)**, bukan di floating bar atas tabel (menjaga 100vh lock & zero layout shift).
  - **Dimensi Seragam (Uniform 95px Button SSOT)**: Seluruh tombol navigasi tema/topik memiliki lebar tetap yang sama persis yaitu **95px** (`width: 95px !important; height: 30px !important;`) untuk keteraturan visual maksimal.
- **Propagasi Otomatis di Tingkat Engine DataGrid (`js/admin/datagrid.js`)**:
  - Engine `DataGrid` secara otomatis menyalurkan gaya dan class tema (`col-subhdr-theme-*`, `col-subhdr-students-data`, `col-subhdr-demographic`, `col-subhdr-address`, `col-subhdr-security`, `col-subhdr-class`) dari `superHeaders` ke setiap anak kolom sub-header yang dinaunginya, menjamin konsistensi 100% di seluruh aplikasi.

### 4.13 Pilar ke-13 Datagrid SSOT — Adaptive Dual-Layer Table Gridlines, Boundary Dividers & Semantic Colors
- **Dual-Layer Subtle Borders in Normal Mode**:
  Di seluruh tabel antarmuka workstation TopsCore LMS pada mode tampilan normal, setiap sel data (`table td`) wajib memiliki garis kisi tipis 1px horizontal (`border-bottom`) dan vertikal (`border-right`):
  - **Navy Mode**: `border-bottom: 1px solid var(--admin-border-subtle); border-right: 1px solid var(--admin-border-subtle);` (`rgba(255, 255, 255, 0.08)`)
  - **Charcoal Dark Mode**: `border-bottom: 1px solid var(--admin-border-subtle); border-right: 1px solid var(--admin-border-subtle);` (`#383838`)
  - **Tiered Grey Light Mode**: `border-bottom: 1px solid var(--admin-border-subtle); border-right: 1px solid var(--admin-border-subtle);` (`#cbd5e1` Slate 300)
  - Kolom terakhir pada setiap baris wajib meniadakan border kanan: `table td:last-child { border-right: none !important; }`.
- **Super-Header Boundary Dividers & Sticky Column Dividers (2px Solid)**:
  Pembatas antar-grup kategori (misal: kolom batas `STUDENTS DATA`, `DEMOGRAPHIC`, `ADDRESS`, `SECURITY`, serta kolom sticky `col-sticky-2`) wajib menggunakan garis pembatas 2px solid bersambung dari header hingga footer:
  - **Navy Mode**: `border-right: 2px solid var(--admin-border-divider);` (`rgba(255, 255, 255, 0.22)`)
  - **Charcoal Dark Mode**: `border-right: 2px solid var(--admin-border-divider);` (`#52525b` Zinc 600)
  - **Tiered Grey Light Mode**: `border-right: 2px solid var(--admin-border-divider);` (`#94a3b8` Slate 400 — tegas dan kontras tinggi, dilarang transparan putih)
- **Universal Table Perimeter Framing (2px Solid)**:
  Garis tepi terluar tabel (first-child left, last-child right, top thead, bottom tfoot/tbody) wajib menggunakan `var(--admin-border-perimeter)` (`#64748b` di Light, `#52525b` di Charcoal Dark, `rgba(255, 255, 255, 0.28)` di Navy).
- **Universal Semantic Column Colors Across All Tables (Statuses & Percentages)**:
  1. **Status**: Wajib berwarna semantik (`.status-active` hijau `var(--grade-a)`, `.status-inactive` merah `var(--grade-e)`, `.status-hold` amber `var(--grade-c)`, `.status-alumni` ungu `var(--grade-star, #a855f7)`, `.status-ongoing` cyan `var(--primary-tactical)`). Dilarang dipaksa hitam pada Light Mode.
  2. **Persentase**: Seluruh angka persentase (`RATE`, `DONE %`, `WRD %`, `PHR %`, `TASK %`, `ACC`) wajib berwarna grade-tier ($\ge 80\%$ hijau, $60\% - 79\%$ amber/kuning, $< 60\%$ merah).
  3. **Tombol Promosi Level (`.btn-level-up-cell`)**: Menampilkan badge tombol hijau taktis interaktif dengan styling adaptif per tema.
- **Intensified Excel Gridlines in Master Edit Mode**:
  Saat Master Edit Mode diaktifkan (`body.global-edit-mode-on`), seluruh garis kisi bertransformasi menjadi garis putih tegas khas spreadsheet Excel (`border: 1px solid rgba(255, 255, 255, 0.45) !important;` / `var(--admin-border-active)`) dengan input dan dropdown borderless transparan per [AGENTS.md §2.22](file:///AGENTS.md#222-universal-master-edit-mode-white-excel-gridlines-invariant--sub-panel-edit-mode-standard).

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
- **Standar Metrik Hero Individual**: Metrik hero tunggal pada kartu nilai (`#bottom-stat-avg-score` dan `#stat-overall-grade-value`) menerapkan **Level 0 Hero Metric (30px, Inter 800 Extra Bold)** dengan tabular-nums dan elevasi matte bersih (tanpa glow).

### 5.3 Student Gate & Cascade Login Invariants (index.html SSOT)
- **Hierarki Alur Cascade Login**:
  - Alur baku pemilihan identitas siswa: `INSTITUTION -> PROGRAM -> BATCH -> STUDENT -> PIN`.
  - Setiap seksi yang telah dipilih **wajib tetap terlihat dalam kondisi terlipat (`.selected`)**, lengkap dengan label nilai yang dipilih dan tombol `Change` (`.cascade-change-btn`) untuk memungkinkan siswa mengubah pilihan.
  - Pemanggilan fungsi reset cascade wajib menargetkan langkah persis di bawahnya (`resetFrom('program')` saat institusi dipilih), DILARANG memanggil reset pada langkah yang baru saja dipilih karena akan melenyapkan elemen tersebut dari DOM visual (`max-height: 0`).
- **Brand Header & Pure Typography (SSOT)**:
  - **Judul Brand `TOPS CORE`**: Menggunakan tipografi murni tanpa boks squircle/emblem (`<h1 class="brand-title">TOPS <span class="brand-core">CORE</span></h1>`) berukuran **30px (`font-size: 30px; font-weight: 900; font-family: 'Inter', sans-serif; line-height: 1.1; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;`)** — **Level 0 Brand Hero Landmark**. Teks `TOPS` putih bersih dan `CORE` Tactical Cyan `#38bdf8`, terpusat rapi dan proporsional dalam koridor mobile 430px.
  - **Eliminasi Subtitle (Zero Subtitle Clutter)**: Deskripsi atau subtitle di bawah judul (`Student Gate — Sign in to continue`) **DIHAPUS SECARA PERMANEN**. Menghilangkan elemen teks dekoratif yang berulang, memaksimalkan ruang vertikal *above-the-fold*, dan menjaga tampilan gerbang login tetap bersih (*ultra-lean, high-focus*). Margin bawah brand ke kartu langkah 1 terkunci tepat 10px (*Strict 10px Container Gap Invariant*).
- **Rata Kiri Kolom Label (90px Fixed Label Alignment) & Eliminasi Angka Langkah**:
  - **Eliminasi Angka Langkah (`.cascade-step-num`)**: Lingkaran angka langkah (1, 2, 3, 4, 5) di sebelah kiri setiap panel **DIHAPUS** untuk memaksimalkan ruang horizontal nama siswa dan menyajikan antarmuka yang bersih dan modern.
  - **Rata Kiri Kolom Label 90px**: Lebar label seksi (`.cascade-label`) dikunci tepat **90px (`width: 90px; min-width: 90px; max-width: 90px; flex: 0 0 90px;`)** pada seluruh panel (Institution, Program, Batch, Name, PIN). Tanda titik dua (`:`) berjarak margin kanan 12px, sehingga seluruh nilai terpilih (`.cascade-selection-label`) berlabuh pada garis kolom vertikal yang persis sama (*razor-sharp tabular alignment*).
- **Persistent Student Session & Default Auto-Save Login**:
  - Sesi login siswa dan kredensial tersimpan secara persisten pada `localStorage` secara otomatis, sehingga siswa tidak perlu berulang kali memilih institusi/program/batch/nama atau memasukkan PIN setiap membuka halaman, kecuali siswa secara eksplisit menekan tombol **Logout / Exit** pada dashboard.
  - **Eradikasi Elemen Redundan (`#remember-me-banner` & `#clear-session-link`)**: Saklar "Remember me on this device" dan tautan "Clear saved login info" di bawah kartu PIN **DIHAPUS SECARA PERMANEN** dari DOM dan CSS karena sistem kini otomatis menyimpan status sesi, serta tombol "Change" pada setiap kartu sudah menyediakan kontrol pembaruan data secara mandiri.
- **Viewport Auto-Centering (100dvh - 50px Lock)**:
  - Kontainer halaman login `.login-page` menggunakan `min-height: calc(100vh - 50px); min-height: calc(100dvh - 50px);` dengan `padding: 10px;` simetris di keempat sisinya.
  - Kontainer kartu `.login-wrapper` berlabuh secara otomatis di titik tengah geometris dan optis layar (*auto vertically centered*) antara batas atas layar dan batas atas banner bawah 50px, melenyapkan pergeseran ke atas (*zero upward-drift*).
- **Universal 10px Container Gap & Card Internal Padding Invariant**:
  - Jarak antar seksi kartu cascade pada mobile corridor 430px terkunci tepat **10px** (`.login-wrapper { gap: 10px; }`, `.cascade-section.selected { margin-bottom: 10px; }`, `.cascade-section.unlocked { margin-bottom: 10px; }`).
  - Jarak elemen internal kartu ke garis batas luar (*Card Internal Padding*) terkunci tepat **10px** (`.cascade-header { padding: 10px 14px; gap: 10px; }`, `.cascade-body { padding: 10px; }`, `.pin-section { padding: 10px; }`).
- **Options Grid Dynamic Shrink-to-Fit Invariant (Anti-Gap Kosong)**:
  - Kontainer daftar pilihan (`.options-grid`) **DILARANG KERAS** menggunakan `min-height` statis (seperti `min-height: 120px;`).
  - Kontainer wajib menyesuaikan tinggi secara dinamis mengikuti jumlah item (*shrink-to-fit*), sehingga bila hanya ada 1 atau 2 opsi (misal institusi/program `TOP`), jarak tepi bawah tombol ke garis pembatas luar kotak tetap **tepat 10px presisi**.
  - Batas maksimal kontainer adalah `max-height: 35vh` dengan scrollbar tipis 4px.
- **Kapsul Pilihan Siswa / Dropdown Touch Target Invariant (Level 2.5 SSOT)**:
  - Tombol kapsul pilihan siswa (`.opt-card`) wajib memiliki tinggi sentuh ergonomis mobile minimal **44px** (`min-height: 44px; padding: 11px 14px; border-radius: 10px; gap: 12px;`) untuk melenyapkan kesan sempit/gepeng.
  - Teks nama siswa wajib berukuran **14px** (Level 2.5 Specialized Selects, `font-weight: 600; line-height: 1.35;`) dengan bullet dot vektor Tactical Cyan (`#38bdf8`) dan aksen kontras matte saat aktif (`.active`).
  - Label seksi terlipat (`.cascade-label`) menggunakan `min-width: 68px; max-width: 90px; width: auto;` agar nama siswa terpilih pada baris atas tidak terpotong elipsis (`...`) sesuai aturan *Universal Zero-Truncation Invariant*.
- **Netralisasi Digit PIN (False Affordance Prevention)**:
  - Kotak digit PIN yang sedang diketik (`.pin-digit.filled`) **DILARANG KERAS menggunakan warna Hijau** (`#00c000`). Hijau eksklusif untuk Grade A (Sukses / Kelulusan). Digit PIN yang belum terverifikasi wajib berkarakter **Netral** (White/Slate Subtle: `border-color: rgba(255, 255, 255, 0.35); background: rgba(255, 255, 255, 0.08); color: #fff;`).
  - Kotak aktif/fokus dan tombol "Sign In" wajib menggunakan token **Tactical Blue** (`#38bdf8` / `#0284c7`), bukan warna ungu legacy.
- **Strict Zero-Movement Hover Invariant**:
  - Tombol opsi siswa (`.opt-card:hover`) wajib *strictly stationary* (`transform: none !important;`), efek interaksi murni berupa background tint dan elevasi drop-shadow matte tanpa glow.
- **Strict Zero Emojis Invariant**:
  - Seluruh kotak pencarian wajib menggunakan ikon vektor SVG Search murni, unicode emoji `🔍` dilarang keras.
- **PWA Install Banner Ergonomics & Placement Invariant**:
  - Banner instalasi PWA (`.pwa-install-banner`) disisipkan tepat di antara judul brand `TOPS CORE` dan kartu langkah 1 (`#sec-institution`).
  - Menggunakan `margin: 0;` dengan gap vertikal 10px otomatis dari `.login-wrapper`.
  - Teks wajib menggunakan **Bahasa Inggris murni**: Judul "Install TopsCore App" (14px Inter Bold, Level 2.5 SSOT), tombol aksi "Install" dan "Later" (`pwa-btn-dismiss`).
  - Dilarang menampilkan teks deskripsi tambahan di bawah judul (*Zero Description Clutter*) untuk menjaga profil kartu tetap ramping (~48px) dan menghemat ruang vertikal layar.

### 5.4 Universal 2-Line Test Title Architecture (SSOT Format 2 Baris Judul Tes)
- **Cakupan Universal**: Seluruh tampilan antarmuka yang menyajikan judul tes (Dashboard Next Assignment Card, Header Ruang Ujian `test.html`, Halaman Hasil `result.html`, dan Modal Konfirmasi/Pilihan Komponen Tes) WAJIB menggunakan format **2 Baris Terpisah**:
  - **Baris 1 (Jenis & Kode Tes)**: Pada Dashboard & Ruang Ujian (`test.html`) yang sudah menampilkan header kelas di bagian atas, digunakan `[TASK/EXAM] [CODE]` (misal `Task A1`, `Task B1`, `Exam A`, `Exam D`) tanpa mengulang nama kelas (*Zero Class Redundancy*). Pada **Halaman Hasil (`result.html` — §5.6)** yang tidak memiliki ambient class header, Baris 1 menampilkan judul tipe autentik sebelum tanda ` - ` (misal `3rd Vocabulary Task B1`) tanpa `text-transform: uppercase`. Ditampilkan tebal (Inter 800), kontras tinggi (Putih `#FFFFFF` / `#F8FAFC`).
  - **Baris 2 (Nama Tema dan/atau Topik)**: `[NAMA_TEMA/TOPIK]` (misal `Greetings & Basics`, `Travel Planning, Flights & Accommodation`, `World of Work`, `Cooking Class`). Ditampilkan di baris kedua secara mandiri dengan warna Tactical Blue (`#38bdf8`) atau Slate Cerah (`#cbd5e1`), `text-transform: none`, tanpa pemotongan teks atau elipsis (*zero truncation*).
- **Formula Resolusi**: Menggunakan helper resmi `formatTestDisplay(test)` (`line1` untuk Baris 1, `line2` untuk Baris 2) dan `formatTestTitleHtml(test)`.
- **Invarian Eliminasi Truncation**: Pembagian 2 baris ini menjamin judul tes dapat terbaca utuh 100% pada koridor mobile 350px–430px tanpa terpotong elipsis (`...`).

### 5.5 Faculty & Staff Identity Card Standards (Tutor & Staff ID Badge SSOT)
- **Konsep & Arsitektur Kartu Tanda Pengenal (ID Badge Style)**:
  - Seluruh kartu pengenal pengajar (Tutor), instruktur, dan staf di lingkungan TopsCore (baik pada panel dashboard admin, roster staff, maupun detail profil) WAJIB diformat dengan **estetika Kartu Tanda Pengenal Fisik (Physical ID Badge)**:
    - **Lanyard Clip Notch**: Indikator slot gantungan tali lanyard di bagian atas tengah kartu (`width: 32px; height: 4px; border-radius: 2px;`).
    - **Photo / Avatar Frame**: Avatar berukuran 44px–48px dengan border aksen gender dan status dot online.
    - **Bidang Data Wajib**: `NAME`, `GENDER`, `DOB / AGE` (format tanggal lahir disertai kalkulasi usia otomatis, e.g. `14 May 1995 (31 yrs)`), `ADDRESS` (alamat asal/domisili), `ASSIGNED CLASSES`, dan status tugas live.
    - **Security Stamp & Digital Barcode**: Nomor registrasi ID staf monospace (`TC-CEC-TUTOR-###` / `TC-TOP-INST-###`) dan strip barcode visual di bagian bawah kartu.
- **Standar Pembeda Institusi: CEC vs TOP (Institutional Differentiation SSOT)**:
  - 🏛️ **Kartu CEC Campus Faculty (`.tutor-id-card.tenant-cec`)**:
    - **Header Tag**: **Tactical Cyan (`#38bdf8` / `var(--primary-tactical)`)** dengan badge `CEC ACADEMIC FACULTY`.
    - **Spesialisasi Akademik**: Menampilkan penugasan jenjang level mengajar (`Level 1`, `Level 2`, `Level 3`) dan modalitas kelas (Vocabulary, Speaking, Storytelling, Basic, Grammar).
  - 🏨 **Kartu TOP Corporate Instructor (`.tutor-id-card.tenant-top`)**:
    - **Header Tag**: **Dark Orange (`#ff8c00` / `var(--quad-b)`)** dengan badge `TOP CORPORATE INSTRUCTOR`.
    - **Spesialisasi Korporat**: Menampilkan penugasan program korporat (*Evnikom*, *Sheraton*, *Tamata*), fokus hospitality/perhotelan, dan penanda Level 0 (Non-Level).
- **Aturan Baku Aksen Warna Gender (Gender Color Accent SSOT)**:
  - 🍏 **Tutor & Staf Pria (Male — `.gender-male`)**:
    - **Aksen Warna**: **Electric Lime (`#95ff00` / `var(--grade-b)`)** pada border kiri kartu (4px solid), avatar frame, lanyard notch, dan badge gender.
    - **Kontras Teks Wajib**: Teks di dalam badge gender Lime WAJIB menggunakan warna **Dark Slate (`#0f172a`)** tebal (Inter 800) untuk menjamin keterbacaan tinggi.
  - 🌸 **Tutor & Staf Wanita (Female — `.gender-female`)**:
    - **Aksen Warna**: **Electric Pink (`#ff2d87` / `var(--quad-a)`)** pada border kiri kartu (4px solid), avatar frame, lanyard notch, dan badge gender.
    - **Kontras Teks Wajib**: Teks di dalam badge gender Pink WAJIB menggunakan warna **Crisp White (`#ffffff`)** tebal (Inter 800).
- **Spatial & Typography Invariants**:
  - Padding internal kartu strictly **10px** (`padding: 10px !important`).
  - Gap antar kartu strictly **10px** (`gap: 10px`).
  - Tipografi 100% Inter (Nama **14px Bold** `#ffffff`, Label **12px** `#94a3b8`, Value **12px** `#f8fafc`). Zero sub-12px.
  - Dilarang keras menggunakan warna abu-abu pudar untuk nama tutor; nama wajib kontras tinggi dan mudah diidentifikasi.

### 5.6 Result Page Unified Student Architecture & Vertical Card Invariants (`result.html` SSOT)
- **Unified Student-Only View (Zero Admin Override UI)**:
  - `result.html`, `js/result.js`, dan `css/result.css` wajib 100% seragam untuk siswa maupun admin (versi admin dibuang permanen: nol `isAdminSession` split, nol segmen `NORMAL | REMEDIAL | FORGIVE`, nol override grade `R`/`F`, nol tombol `BACK TO ROOM`).
  - Aksi navigasi bawah standar siswa: `#smart-next-action-container` (`NEXT TEST`) dan `#back-dashboard-btn` (`BACK TO CLASS`).
- **Strict Vertical Card Sequence (`#result-hero-section`)**:
  1. **`#result-identity-card` (Student Identity Card — Topmost)**: Mutlak berada di atas kartu judul tes, menampilkan `#result-student-name-label` berprefiks `Mr.` / `Miss` / `King` / `Queen` (`§2.8`, termasuk deteksi `Lalu`/`Baiq`), metadata akademik (`CEC/TOP • PROGRAM • BATCH • 3RD STEP`), avatar 3:4 (inisial dari nama dasar tanpa prefiks), dan tabel biodata (`Sex`, `DOB`, `Age`, `Adr`).
  2. **`#result-Test-name-container` (Exam Title Card — Below Student Card)**: Format 2 Baris Autentik tanpa `text-transform: uppercase` dan tanpa elipsis (`#result-test-type-row` `#F8FAFC`, `#result-test-topic-row` `#38bdf8`).
  3. **`#result-metrics-composite-card`**: Baris metrik `CORRECT`, `PARTIAL`, `INCORRECT`, `POINTS`.
  4. **`#result-score-grade-card`**: Skor `%` & simbol Grade.
  5. **`#result-motivation-msg`**: Kartu deskripsi grade.
  6. **`#smart-next-action-container` & `#back-dashboard-btn`**, berjarak tepat 10px dari footer terpusat 50px `#bottom-ad-banner` (`TopsCore by Mr. Top`).
- **Spatial & Matte Compliance**: Single 10px mobile perimeter padding (zero double padding), matte surfaces tanpa neon `text-shadow` / `drop-shadow` glow, dan relasi Camp menggunakan relasi jamak PostgREST agar selalu tampil `3RD STEP` (`AGENTS.md §2.41`).

---

## Bab 6: DataGrid & Roster Table Architecture

### 6.1 Single-Responsibility Columns & Profile Click Invariant
- **Student Roster Column Sequence**: `LEVEL` (46px) $\to$ `PHOTO` (46px, 30px avatar) $\to$ `GENDER` (68px) $\to$ `NAME` (flex-primary, min 200px) $\to$ `DOB` (110px) $\to$ `AGE` (50px) $\to$ `EDUCATION` (140px) $\to$ `VILLAGE` (130px) $\to$ `DISTRICT` (130px) $\to$ `REGENCY` (160px) $\to$ `PROVINCE` (160px) $\to$ `CLASS EXAMS` (4 $\times$ 74px) $\to$ `SECURITY` [`PIN` (70px) $\to$ `STATUS` (90px)].
- **SECURITY Category Invariant (SSOT)**: Kolom `PIN` dan `STATUS` disatukan di bawah super-header bersama bertajuk **`SECURITY`** (`colSpan: 2`), dengan posisi `PIN` berada tepat di sebelah kiri dari `STATUS`. Kolom `PIN` menampilkan kode PIN otentik siswa dengan font monospace untuk memudahkan identifikasi dan verifikasi langsung oleh admin.
- Profile modal opens on student photo/name click in Active Students tab. Actions column purged.

### 6.2 Single-Line Compact Program Chips
- Standardized 4-letter uppercase codes: `CAMP` (Camp), `EVNK` (Evnikom), `SHRT` (Sheraton), `TPTC` (Tamata Persada), `EXPL` (Explorer). Native tooltip for full name.

### 6.3 DataGrid Default Configuration & Zero Neon Glow
- `DataGrid` defaults to `bulkActions: false`. Neon box-shadow glows purged; dividers render as crisp flat lines.

### 6.4 Level Promotion & Passing Threshold Invariant (NEXT Action Invariant SSOT)
- **Kepatuhan Ambang Batas Resmi ($\ge 60\%$ / Level 3 Exam $70\%$)**: Penentuan kelayakan promosi level siswa (`isEligibleNext` / tombol `NEXT`) WAJIB mematuhi 100% ambang batas minimum kelulusan resmi TopsCore, yaitu **skor $\ge 60\%$** (**Grade D — Enough** pada CEC / **Grade C — Enough** pada TOP per `AGENTS.md` §2.10; khusus **Ujian Akhir Tema Level 3 / 3rd Step** minimal **$\ge 70\%$** per `DECISION-084`) atau `min_score` pada metadata tes, dispensasi administratif resmi (**Grade F** / `is_forgiven = true`), atau Remedial yang diselesaikan (**Grade R**) per [`AGENTS.md` §2.4.1](file:///AGENTS.md#241-level-promotion--passing-threshold-invariant-ssot-aturan-baku-promosi-level).
- **Mutlak Nol Ambang Batas Arbitrer**: Dilarang keras menerapkan angka batas hardcoded di luar SSOT (seperti angka liar `70%`). Siswa yang telah mencapai ambang kelulusan resmi ($\ge 60\%$) telah berstatus Lulus (*Enough*) dan mutlak berhak naik level bersamaan dalam satu rombongan belajar tanpa ada yang tertahan.
- **Aktivasi Tombol Aksi NEXT di Roster**: Tombol `NEXT` di Sub Panel atau toolbar roster otomatis aktif (*enabled*) hanya saat seluruh siswa aktif dalam batch telah memenuhi batas kelulusan (lulus, remedial tuntas, atau dispensasi Grade F). Jika masih ada siswa yang belum tuntas, tombol dinonaktifkan (*disabled*) dengan tooltip alasan.

### 6.5 Arsitektur Tampilan Level: Level 0 (Non-Level `0`), Level 1–3, dan Alumni (Level X) SSOT
- **Prinsip Identitas Level Resmi**:
  1. **Level 0 (Non-Level Programs)**: Khusus untuk program yang sejak awal tidak memiliki jenjang bertahap (single-tier, misal seluruh program pada institusi TOP: Evnikom, Sheraton, Tamata Persada). Pada seluruh tabel workstation admin (kolom `LVL`), filter dropdown, modal, dan dashboard siswa, Level 0 ditampilkan sebagai angka **`0`** (bukan tanda strip `—`). Tanda strip `—` hanya digunakan sebagai representasi data kosong/belum ditentukan (`null`/`undefined`). Dilarang keras menampilkan teks "L0" atau tanda strip pada entitas Level 0 yang valid.
  2. **Level 1–3 (Jenjang Reguler)**: Ditampilkan sebagai `1st`, `2nd`, `3rd` dengan tabular numbers tebal (`color: #f8fafc; font-weight: 700; font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap;`).
  3. **Level X (Alumni Graduation)**: Siswa yang telah lulus dari Level 3 resmi berstatus **Level X** (`level_number = 99` di database, `program_status = 'ALUMNI'`). Ditampilkan sebagai huruf **`X`** tebal berwarna ungu (`var(--grade-star, #a855f7)` per `DECISION-086`). Alumni mutlak DILARANG menggunakan angka 0.
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
    - **Kode Kelas**: `EVNK-VOCAB`, `SHRT-VOCAB`, `TPTC-VOCAB` (dilarang menggunakan `EVNK-1VOCAB`).
    - **Judul Tes**: `Evnikom Vocabulary Task 0G1 - Time Name`, `Evnikom Vocabulary Exam 0G - General` (dilarang menggunakan `1st`).
    - **Kode Tes**: `EVNK-VCB-0G1-TASK`, `EVNK-VCB-0G-EXAM`, `EVNK-VCB-0G2-TASK` (dilarang menggunakan `EVNK-1VCB-...`).
- **Student Dashboard & Class Lobby Invariants**:
  - **Non-Level**: Badge Level pada header dashboard disembunyikan/ditiadakan (dianggap kosong), dan seluruh kelas program dapat diakses langsung.
  - **Alumni**: Mempertahankan *Lifetime Universal Access* ke seluruh kelas program di Class Lobby dan Dashboard, dengan badge bertuliskan **`ALUMNI`** / **`X`** berwarna ungu matte (`#c084fc`).

### 6.6 Faculty & Tutor Identity Card Standards (2-Column Grid & Standardized Badge Geometry SSOT)
- **2-Column Vertical Grid Layout**: On the Attendance Dashboard (Domain A, Right Panel 50%), tutor identity cards strictly render in a balanced **2-column grid** (`grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-content: start;`). For CEC (6 tutors), this forms an elegant 3-row $\times$ 2-column matrix; for TOP (2 tutors), it forms 1 row $\times$ 2 columns.
- **Pure White Background & High Contrast**: Card backgrounds strictly enforce **`#ffffff`** (`background: #ffffff !important; color: #0f172a !important;`), paired with dark text for maximum legibility.
- **Gender-Themed Title Area Banners**:
  - **Male**: Lime green header (`#95ff00`, border `#84cc16`), dark slate text (`#0f172a`), badge `MALE`.
  - **Female**: Electric pink header (`#ff2d87`, border `#db2777`), crisp white text (`#ffffff`), badge `FEMALE`.
- **Friendly Callout Nicknames**: Banners must feature the tutor's formal name alongside their friendly nickname in quotes (e.g. `"Mr. Top"`, `"Mr. Amrul"`, `"Miss Elysa"`, `"Miss Nizan"`, `"Miss Cita"`, `"Miss Amelia"`, `"Miss Siti"`).
- **Physical ID Badge Geometry**:
  - Banner height: ~28px (`padding: 6px 10px;`).
  - Avatar frame: 38px $\times$ 38px rounded square with colored border.
  - Structured metadata rows: DOB/Age, Address (truncated with hover tooltip), and assigned class chips.
  - Bottom security stamp: Monospace ID serial (`TC-CEC-TUTOR-XXX` / `TC-TOP-INST-XXX`) and faux barcode glyphs.
  - Total card height: ~156px–165px, enabling 3 rows to fit cleanly within the viewport height.

### 6.7 Mobile Tutor Desk Workspace Invariants (Level Box, Class Schedule, Time Card & Time Colour SSOT)
- **1. Level Box SSOT**:
  - Dinamai resmi **`Level Box`** (analog dengan Gender Box pada modul registrasi).
  - Menggunakan kartu kotak presisi persegi (**Square aspect-ratio 1:1**, `aspect-ratio: 1 / 1 !important;`).
  - Strict 10px perimeter & 10px gap antar level cards (`gap: 10px !important;`).
  - **Angka Murni Tanpa Huruf 'L' (Strict Zero "L" on Level)**: Tampilan nomor level HANYA angka murni: `1`, `2`, `3` (dan `0` untuk program non-level TOP). DILARANG KERAS mencantumkan huruf "L" (`L1`, `L2`, `L3` dilarang).
  - Visual State: Redup saat inaktif (`opacity: 0.45; filter: grayscale(15%);`), aktif tegas saat dipilih dengan border 2px Grade Color dan elevasi matte bersih `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35)`.
- **2. Class Schedule Matrix SSOT**:
  - Urutan 4 kolom baku: **`LVL`** (tengah, nomor murni) | **`CLASS`** (kiri, nama disiplin) | **`TUTOR`** (tengah, nama panggilan/nickname) | **`TIME`** (kanan, jam sesi).
  - Header: `LVL` | `CLASS` | `TUTOR` | `TIME`.
  - **Dynamic Responsive Sizing**: Kontainer 5 baris kelas (`.class-matrix-grid`) mengadopsi flex dinamis (`flex: 1 1 auto;`) sehingga kartu kelas menyesuaikan tinggi secara dinamis mengikuti sisa ruang vertikal layar tanpa scrollbar artifisial.
- **3. Time Card & Time Colour SSOT**:
  - Dinamai resmi **`Time Card`** (`.time-card` / `#time-card`).
  - Terbagi rata menjadi 3 porsi setara (`grid-template-columns: repeat(3, 1fr)`).
  - Tiga pilar waktu: **`TIME`** | **`DAY`** | **`DATE`**.
  - **Aturan Baku Time Colour**: Warna teks waktu mengadopsi 3 variasi warna level yang terang dan kontras tinggi:
    - **`TIME`**: Level 1 Merah Grade E (`#ff4d4d` / `var(--grade-e)`)
    - **`DAY`**: Level 2 Kuning Grade C (`#ffe600` / `var(--grade-c)`)
    - **`DATE`**: Level 3 Tactical Cyan Grade A (`#38bdf8` / `var(--primary-tactical)`)
- **4. Button Invariants (Dual Mode & Master CTA)**:
  - **Zero SVG Icons**: Seluruh tombol aksi peluncuran (`REGULAR`, `EXAM`, dan `START CLASS`) murni berupa teks tebal tanpa ikon SVG.
  - **Strict 10px Spacing**: Jarak antar tombol `REGULAR` dan `EXAM` adalah 10px (`gap: 10px;`), jarak vertikal ke `START CLASS` adalah 10px, dan jarak bebas dari tombol terbawah ke batas banner 50px adalah persis 10px.
  - **Master CTA Height**: Tombol utama `START CLASS` locked 50px (`height: 50px !important;`).

### 6.8 Universal Table Column Ordering & Zero Header-Repetition in Data Cells SSOT
- **1. Universal Code Column Positioning Invariant**:
  - **Tabel Berkolom Nomor / Ordinal (`#`, `NO`, `LVL`)**: Seluruh kolom yang memuat kode sistem (`CODE`, `CLASS CODE`, `TEST CODE`) **WAJIB diletakkan tepat setelah kolom nomor/ordinal tersebut** sebelum kolom nama (`[NO / LVL] | [CODE] | [NAME] | ...`).
  - **Tabel Tanpa Kolom Nomor**: Kolom **`CODE`** WAJIB diletakkan sebagai **kolom pertama (paling kiri)** di tabel tersebut (`[CODE] | [NAME] | ...`).
  - **Penerapan Resmi**:
    - *Academic Classes Matrix*: `LVL | CODE | CLASS NAME | DAY | START | END | ROOM | TUTOR | STD | RATE | STATUS`.
    - *Faculty & Tutors*: `CODE | PIC | NAME | DOB | AGE | ACT`.
    - *Camp Rooms & Venues*: `CODE | ROOM NAME | CAP | TYPE | ACT`.
- **2. Zero Header-Repetition in Data Cells (Header/Data Non-Redundancy SSOT)**:
  - Dilarang keras mengulang kata atau label yang sudah ada di header kolom ke dalam nilai sel data.
  - **Penerapan Resmi pada Kolom BATCH**: Jika header kolom tabel adalah **`BATCH`**, maka isi sel kolom mutlak hanya menampilkan angka/nama pengenal murni (`135`, `134`, `123`, `EV-07`), DILARANG menambahkan awalan kata "Batch" (`Batch 135`, `Batch 134`) karena menciptakan redundansi visual (*visual clutter*). Seluruh awalan `Batch ` wajib di-strip secara konsisten.

### 6.9 Tutor Desk Mobile Navigation, Bottom Cluster & Spreadsheet Score Matrix SSOT
- **1. Switcher Dock Height Invariant (Strict 40px SSOT Across All Areas)**:
  - Bilah pengalih area kerja utama / switcher dock (`.tutor-master-dock` / `#tutor-master-dock`) dikunci mutlak dengan tinggi **`40px`** (`height: 40px !important; min-height: 40px !important; max-height: 40px !important; line-height: 40px !important; box-sizing: border-box;`) di seluruh area aplikasi.
  - Tombol switcher (`.dock-switch-btn`) memiliki tinggi proporsional 32px (`height: 32px !important;`) dengan padding vertikal 4px dari batas dock.
  - Memisahkan 2 kluster kerja utama: **`STUDY AREA`** (Attendance & Scores) dan **`ENGLISH AREA`** (Fines & Payment) yang dapat beralih via tap/klik atau gestur horizontal swipe.
- **2. Bottom Level Selector Bar Invariant (Strict 30px SSOT)**:
  - Bilah pemilih level (`.tutor-bottom-level-bar` / `#tutor-bottom-level-bar` dengan tombol `1st | 2nd | 3rd`) berlabuh di bagian bawah layar tepat di atas switcher dock 40px.
  - Tinggi bilah level dikunci mutlak **`30px`** (`height: 30px !important; min-height: 30px !important; max-height: 30px !important; line-height: 28px !important;`).
  - Tombol level memiliki tinggi 26px, mengisi porsi setara (`flex: 1 1 33.333%`), kontras tinggi, dan tersinkronisasi di seluruh view (Attendance, Scores, Fines, Payment).
  - Peniadaan duplikasi: Level bar atas pada masing-masing panel datagrid dihilangkan, membebaskan ruang vertikal tabel untuk tampilan data yang lapang dan bersih.
- **3. Spreadsheet Grid Score Input Invariant (Zero Floating Capsule Boxes)**:
  - Seluruh input nilai manual pada datagrid nilai (`.grade-manual-input` di kelas Vocabulary, Speaking, Storytelling, Grammar, Basic English, dsb.) WAJIB mengadopsi format **Spreadsheet Grid Cell murni**.
  - DILARANG KERAS menggunakan kotak input mengambang (floating capsule), border terpisah per-kotak, border-radius melengkung, atau latar belakang gelap terpisah di dalam sel data (`border: none !important; border-radius: 0 !important; background: transparent !important;`).
  - Input mengisi 100% tinggi dan lebar sel `<td>` (`width: 100% !important; height: 100% !important;`), dengan garis grid pembatas tabel standar (`border-bottom: 1px solid rgba(255, 255, 255, 0.08)`, `border-right: 1px solid rgba(255, 255, 255, 0.08)`).
  - State fokus (`:focus`) memberikan highlight outline Excel (`outline: none !important; background: rgba(56, 189, 248, 0.12) !important; box-shadow: inset 0 0 0 1.5px var(--primary-tactical, #38bdf8) !important;`).
  - Browser number spinners disembunyikan sepenuhnya (`-webkit-appearance: none; -moz-appearance: textfield;`).



