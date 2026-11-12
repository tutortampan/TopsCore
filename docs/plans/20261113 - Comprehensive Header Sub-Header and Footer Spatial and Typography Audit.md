# Comprehensive Header, Sub-Header, and Footer Spatial & Typography Audit

> **Document Type:** System-Wide Spatial & Typographic Audit Report  
> **Date:** 2026-11-13  
> **Status:** PROPOSED & AWAITING USER DECISION  
> **Authority:** In compliance with `AGENTS.md` Rule 2.20, `.agents/rules/ui-invariants.md`, and 8-tier typographic scale (`--tr-font-*`).

---

## 1. Executive Summary & Root Conflicts Discovered

Pemeriksaan komprehensif terhadap seluruh file HTML (`admin.html`, `dashboard.html`, `test.html`, `result.html`, `index.html`, `conversation.html`), CSS (`style.css`, `admin.css`, `dashboard.css`, `test.css`, `result.css`, `auth.css`, `conversation.css`), dan modul JavaScript menemukan bahwa:

1. **Sebagian Elemen Sudah Memiliki Kesepakatan Ketat (Locked Invariants):**
   - **Locked Bottom Ad Banner**: `height: 60px !important` seragam di seluruh halaman sistem (`#bottom-ad-banner`).
   - **Workspace Lower Panel & Sidebar Footer**: `height: 50px !important` seragam di `admin.html` (`.workspace-lower-panel`, `.sidebar-footer`).
   - **Topbars Utama Murid & Ujian**: `50px !important` seragam di Dashboard Murid (`.dashboard-header`), Test Room (`.test-top-header`), Result Room (`.dashboard-header`), dan Speaking Room (`.conv-topbar`).
   - **Table Super-Header & Sub-Header**: `height: 24px !important`, font `12px Inter 700/800` pada DataGrid 2-tier (Rule 8.4).
   - **Topbar Level Tab Folders**: `height: 38px`, font `11px Inter 600` (`.topbar-tab-card`).
   - **Standings Tab Header**: `height: 38px !important` di `dashboard.html` (`.dock-tab-header`).

2. **Titik Konflik Krusial yang Belum Disepakati / Masih Tumpang Tindih:**
   - 🔴 **Konflik Admin Topbar (`.admin-topbar`)**:
     - Pada desktop: `height: 50px; max-height: 50px; padding: 0 16px;`.
     - Namun di media query `@media (max-width: 900px)` (baris 1285 `admin.css`): ditimpa menjadi `height: auto; min-height: 56px; padding: 8px 12px;`.
   - 🔴 **Konflik Table Summary Row / Footer (`tfoot`) vs Baris Tabel**:
     - Di baris 400 `admin.css`: `.table-wrap table tfoot, .datagrid-table tfoot, #blueprint-matrix-table tfoot` di-lock pada `height: 50px !important; line-height: 50px;`.
     - Padahal di Rule 8.5 (Anti-Ballooning), tinggi baris tabel dibatasi `24px - 32px`. Baris `tfoot` setinggi 50px membuat satu baris teks "BATCH AVG" terlihat terlalu tebal/longgar di dalam tabel data.
   - 🔴 **Konflik Test Bottom Bar (`.bottom-nav-bar`)**:
     - Di `test.css`: `height: 40px !important`.
     - Di `dashboard.css`: `.bottom-nav-bar` didefinisikan `min-height: 54px;`.
   - 🔴 **Konflik Single-Tier Table Header (`thead th`)**:
     - Di `admin.css` Rule 8.4: `height: 28px !important; font-size: 12px !important;`.
     - Di `style.css`: `.table-compact thead th` memakai `font-size: 0.65rem !important` (8.3px — melanggar Zero Sub-11px Rule) dan padding `4px 5px`.
     - Di `.live-monitor-table thead th`: padding `11px 14px` sehingga tingginya melar ke ~40px.
   - 🔴 **Student Gate Cascade Header & Step Headers (`index.html`)**:
     - Saat ini tidak memiliki height lock, tingginya fluid (`padding: 0.8rem 1.1rem` ~54px–62px).
   - 🔴 **Modal Headers & Footers**:
     - Tinggi header modal dan footer tombol saat ini fluid (ditentukan oleh padding dan ukuran tombol, berkisar 44px–60px).

---

## 2. Inventaris Lengkap: Seluruh Header, Sub-Header & Footer

### A. Kategori 1: Page Topbars & Main Room Headers (Viewport Level)

| Komponen & Lokasi | Selector & File | Tinggi Saat Ini (Height) | Font (Family, Size, Weight) | Status Kesepakatan | Catatan & Masalah |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin Topbar**<br>(Tutor's Room / `admin.html`) | `.admin-topbar`<br>`css/admin.css` | `50px` (Desktop)<br>`min-height: 56px` (Mobile <900px) | `Inter`, `12.8px` (base)<br>Tabs: `11px Inter 600` | ⚠️ **BELUM SEPAKAT**<br>(Konflik 50px vs 56px) | Menampung level tab folders (`38px`), search, and profile trigger. |
| **Student Dashboard Topbar**<br>(Murid / `dashboard.html`) | `body.dashboard-page .dashboard-header`<br>`css/dashboard.css` | `50px !important`<br>(Locked) | `Outfit 800`<br>`clamp(0.95rem, 3.8vw, 1.15rem)` | ✅ **DISEPAKATI**<br>(50px Lock) | Menampung tombol class lobby door, nama kelas, dan logout. |
| **Test Room Topbar**<br>(Ujian / `test.html`) | `body.test-page .test-top-header`<br>`css/test.css` | `50px !important`<br>(Locked) | `Outfit 800`<br>`clamp(1rem, 2.8vw, 1.25rem)` | ✅ **DISEPAKATI**<br>(50px Lock) | Menampung judul test, timer countdown ring, dan progress counter. |
| **Result Room Header**<br>(Rapor / `result.html`) | `.result-page .dashboard-header`<br>`css/result.css` | `50px !important`<br>(Locked) | `Outfit 800`<br>`0.95rem - 1.15rem` | ✅ **DISEPAKATI**<br>(50px Lock) | Menampung brand logo dan avatar trigger rapor. |
| **Speaking Room Topbar**<br>(Peer Room / `conversation.html`) | `.conv-topbar`<br>`css/conversation.css` | `50px`<br>(flex: 0 0 50px) | `Inter 600` / `Outfit 800`<br>`12.8px` | ✅ **DISEPAKATI**<br>(50px Lock) | Menampung logo, durasi panggilan, dan status sinyal WebRTC. |
| **Student Gate Cascade Header**<br>(Login / `index.html`) | `.cascade-header`<br>`css/auth.css` | Fluid (~54px – 62px)<br>`padding: 0.8rem 1.1rem` | `Outfit 800` (1.15rem)<br>Subtext: `Inter 500` | ⚠️ **BELUM SEPAKAT**<br>(Fluid, tanpa lock) | Header kartu login 4-step. |

---

### B. Kategori 2: Sub-Headers, Section Banners, Tab Bars & Toolbars (Workspace Level)

| Komponen & Lokasi | Selector & File | Tinggi Saat Ini (Height) | Font (Family, Size, Weight) | Status Kesepakatan | Catatan & Masalah |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Level Tab Folders**<br>(Admin Topbar / `admin.html`) | `.topbar-tab-card, .topbar-tab-folder`<br>`css/admin.css` | `38px`<br>(Locked) | `Inter 600` (11px)<br>Badge: `Inter 700` (11px) | ✅ **DISEPAKATI**<br>(38px Lock) | Tab folder level yang menempel pas di dasar topbar 50px. |
| **Standings Dock Tab Header**<br>(Dashboard Murid) | `.dock-tab-header, .standings-card-header`<br>`css/dashboard.css` | `38px !important`<br>(Locked) | `Inter 700`<br>`12px` | ✅ **DISEPAKATI**<br>(38px Lock) | Tab pengalih antara 'Class Ranks' dan 'Recent Attempts'. |
| **Domain & Workspace Section Header**<br>(Judul Modul Admin) | `.workspace-header, .section-header`<br>`css/admin.css` | Fluid (~38px – 48px)<br>`padding: 0.75rem 0` | `Outfit 700`<br>`16px` (`--tr-font-title`) | ⚠️ **BELUM SEPAKAT**<br>(Fluid padding) | Judul halaman modul admin di bawah topbar. |
| **Admin Action & Filter Toolbars**<br>(Roster/Class/Vault Toolbar) | `.admin-toolbar, .student-roster-toolbar`<br>`css/admin.css` | `0px` (Edit OFF)<br>`auto` (~36px–44px, Edit ON) | `Inter 600`<br>`12px` (`--tr-font-control`) | ✅ **DISEPAKATI**<br>(Rule 1 Toolbar Collapse) | Runtuh otomatis saat Edit Mode OFF jika tombol aksi tersembunyi. |
| **Sidebar Domain Header**<br>(Grup ABCD Admin) | `.nav-domain-header`<br>`css/admin.css` | Fluid (~28px)<br>`padding: 0.35rem 0.65rem` | `Inter 800`<br>`11px` | ⚠️ **BELUM SEPAKAT**<br>(Fluid padding) | Pemisah grup navigasi A, B, C, D di sidebar. |
| **Student Gate Step Header**<br>(Step 1–4 Login) | `.cascade-step-header`<br>`css/auth.css` | Fluid (~38px – 44px)<br>`padding: 0.5rem 0.85rem` | `Inter 700`<br>`13px`, badge `28px` round | ⚠️ **BELUM SEPAKAT**<br>(Fluid padding) | Judul tiap langkah login (Pilih Institusi, Program, Nama, PIN). |
| **Conversation Topic Banner**<br>(Speaking Room) | `.conv-topic-banner`<br>`css/conversation.css` | Fluid (~46px – 54px)<br>`padding: 14px 16px` | `Inter 600`<br>`14px` (`--tr-font-subtitle`) | ⚠️ **BELUM SEPAKAT**<br>(Fluid padding) | Kartu pengarah topik diskusi speaking 1 jam. |
| **Question Matrix & Stimulus Header**<br>(Test Room) | `.matrix-header, .prompt-header`<br>`css/test.css` | Fluid (~32px – 40px)<br>`padding: 6px 12px` | `Inter 700`<br>`12px` | ⚠️ **BELUM SEPAKAT**<br>(Fluid padding) | Navigator nomor soal dan prompt soal. |

---

### C. Kategori 3: Table Headers & Table Sub-Headers (DataGrid & Native Tables)

| Komponen & Lokasi | Selector & File | Tinggi Saat Ini (Height) | Font (Family, Size, Weight) | Status Kesepakatan | Catatan & Masalah |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Table Super-Header (Tier 1)**<br>(Super Header Row) | `thead tr.super-header-row th`<br>`css/admin.css` | `24px !important`<br>(Sticky `top: 0`, Rule 8.4) | `Inter 800 !important`<br>`12px` (`--tr-font-table`) | ⚠️ **MINOR LEAK**<br>(Ada font 10px di bp-matrix) | Super-header grup kolom (DOSSIER, EXAMS, ATTENDANCE). Harus dibersihkan dari 10px. |
| **Table Sub-Header (Tier 2)**<br>(Sub Header Row) | `thead tr.sub-header-row th`<br>`css/admin.css` | `24px !important`<br>(Sticky `top: 24px`, Rule 8.4) | `Inter 700 !important`<br>`12px` (`--tr-font-table`) | ⚠️ **MINOR LEAK**<br>(Ada height 20px & 11px di attendance) | Header kolom spesifik di bawah super-header. |
| **Table Single Header (1-Tier)**<br>(Tabel Tunggal tanpa Super) | `thead th` (1-Tier)<br>`css/admin.css`, `css/style.css` | `28px !important` (admin.css)<br>Fluid / auto (style.css) | `12px Inter 700` (admin.css)<br>`0.65rem` / `0.78rem` (style.css) | 🔴 **KONFLIK BESAR**<br>(style.css 0.65rem melanggar Zero Sub-11px!) | Harus diseragamkan ke `28px !important` dan font `12px Inter 700`. |

---

### D. Kategori 4: Footers, Lower Panels & Bottom Navigation (Docked Bottom Level)

| Komponen & Lokasi | Selector & File | Tinggi Saat Ini (Height) | Font (Family, Size, Weight) | Status Kesepakatan | Catatan & Masalah |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Locked Bottom Ad Banner**<br>(Universal All Rooms) | `#bottom-ad-banner, .topscore-locked-banner`<br>`css/admin.css`, `css/style.css`, dll | `60px !important`<br>(LOCKED SYSTEM-WIDE) | `Outfit 800/900`<br>`clamp(1rem, 2.8vw, 1.15rem)` | ✅ **DISEPAKATI**<br>(60px Strict Lock) | Banner permanen hak cipta TopsCore di seluruh halaman sistem. |
| **Workspace Lower Panel**<br>(Tutor's Room / Admin) | `.workspace-lower-panel, #admin-lower-panel`<br>`css/admin.css` | `50px !important`<br>(LOCKED Rule 3) | `Inter 600`<br>`12px` (`--tr-font-control`) | ✅ **DISEPAKATI**<br>(50px Strict Lock) | Panel bawah tempat tombol aksi utama ([🚀 NEXT], [➕ Add], [📥 Import]). |
| **Sidebar Footer**<br>(Sidebar Logout Admin) | `.sidebar-footer`<br>`css/admin.css` | `50px !important`<br>(LOCKED Rule 3) | `Inter 600`<br>`12px` | ✅ **DISEPAKATI**<br>(50px Strict Lock) | Sejajar sempurna dengan Workspace Lower Panel 50px. |
| **Table Summary Footer (`tfoot`)**<br>(Ringkasan Data Tabel) | `tfoot, tfoot tr, tfoot td`<br>`css/admin.css` | `50px !important`<br>(admin.css baris 400) | `Inter 700 !important`<br>`12px` | 🔴 **KONFLIK ARSITEKTUR**<br>(Terlalu tebal untuk tabel) | Baris data summary di dalam tabel dipaksa setinggi 50px (seperti lower panel). Padahal baris data normal `24px–32px`. |
| **Test Bottom Navigation Bar**<br>(Test Room Nav Bar) | `.bottom-nav-bar`<br>`css/test.css`, `css/dashboard.css` | `40px !important` (test.css)<br>`min-height: 54px` (dashboard.css) | `Inter 700` / `Outfit 700`<br>`13px` | ⚠️ **KONFLIK OVERRIDE**<br>(40px vs 54px) | Bar tombol [Prev] [Next] [Submit] di Test Room. |
| **Conversation Bottom Panel**<br>(Speaking Room Action Bar) | `.conv-bottom-panel`<br>`css/conversation.css` | `50px`<br>(flex: 0 0 50px) | `Inter 600`<br>`12px` | ✅ **DISEPAKATI**<br>(50px Lock) | Panel kontrol mic, push-to-talk, dan leave call. |

---

### E. Kategori 5: Modal & Dialog Headers / Footers

| Komponen & Lokasi | Selector & File | Tinggi Saat Ini (Height) | Font (Family, Size, Weight) | Status Kesepakatan | Catatan & Masalah |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Modal Header**<br>(Semua Popover / Dialog) | `.modal-header, .modal-header-bordered`<br>`css/admin.css`, `css/style.css` | Fluid (~46px – 56px)<br>`padding-bottom: 10px / 0.75rem` | `Outfit 800`<br>`1.1rem - 1.25rem` (`--fm-font-display`) | ⚠️ **BELUM SEPAKAT**<br>(Fluid padding) | Header dialog modal sistem (Add Student, Add Class, Settings). |
| **Modal Footer**<br>(Semua Popover / Dialog) | `.modal-footer, .modal-footer-bordered`<br>`css/admin.css`, `css/style.css` | Fluid (~50px – 62px)<br>`padding-top: 10px / 0.75rem` | `Inter 600`<br>`12px` (tombol aksi modal) | ⚠️ **BELUM SEPAKAT**<br>(Fluid padding) | Tempat tombol aksi ([Cancel], [Save], [Confirm]). |

---

## 3. Matriks Rekomendasi Standardisasi (Proposed Universal Height & Font Standard)

Untuk menyatukan seluruh sistem agar konsisten, rapi, dan memiliki ritme visual yang harmonis (*proportional visual cadence*), berikut adalah usulan standardisasi tinggi dan tipografi:

```text
PAGE VIEWPORT LEVEL:
  ├── MAIN TOPBARS (All Rooms): 50px Lock (Outfit 800 / Inter 600)
  ├── FOLDER LEVEL TABS / DOCK TABS: 38px Lock (Inter 600, 11px/12px)
  ├── WORKSPACE LOWER PANELS & SIDEBAR FOOTER: 50px Lock (Inter 600, 12px)
  └── LOCKED BOTTOM AD BANNER: 60px Lock (Outfit 800/900, 16px-18px)

TABLE LEVEL (DATA VIEW):
  ├── TABLE SUPER-HEADER (Tier 1): 24px Lock (Inter 800, 12px)
  ├── TABLE SUB-HEADER (Tier 2): 24px Lock (Inter 700, 12px)
  ├── TABLE SINGLE HEADER (1-Tier): 28px Lock (Inter 700, 12px)
  └── TABLE FOOTER / SUMMARY ROW (tfoot): 32px Lock (Inter 700, 12px)
      *(Diturunkan dari 50px ke 32px agar proporsional dengan baris tabel data 24-28px)*

MODAL & FLOATING DIALOGS:
  ├── MODAL HEADER: 50px Lock (Outfit 800, 16px - 18px)
  └── MODAL FOOTER: 50px Lock (Inter 600, 12px)
```

---

## 4. Pertanyaan Keputusan untuk User (User Feedback Required)

1. **Table Summary Row (`tfoot`):**
   Apakah setuju baris ringkasan tabel (`tfoot`, `BATCH AVG`, grand total) diturunkan dari `50px` menjadi `32px` agar serasi dengan baris tabel (`24px–28px`), sementara Lower Panel aksi tetap `50px` di bawahnya?
2. **Admin Topbar Media Query:**
   Apakah setuju menghapus override `min-height: 56px` di `@media (max-width: 900px)` sehingga Admin Topbar tetap konsisten `50px` di seluruh breakpoint layar?
3. **Modal Header & Footer:**
   Apakah setuju menstandarkan tinggi Modal Header dan Modal Footer menjadi seragam `50px` (dengan padding vertikal pas dan tombol 32px–36px)?
4. **Purge `0.65rem` di `style.css`:**
   Apakah setuju membersihkan sisa kode lama `.table-compact thead th { font-size: 0.65rem }` agar mematuhi aturan Zero Sub-11px?
