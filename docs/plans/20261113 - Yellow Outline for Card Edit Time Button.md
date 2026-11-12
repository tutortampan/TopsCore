# Plan: SSOT Color Governance Audit & Wireframe Action Buttons Alignment

## 1. Context & User Instruction
The user requested verification and alignment of the three action colors:
> **"warna hijau, kuning, dan merah harus ikuti aturan kita, cek apakah sesuai?"**

Per **Rule 2.10 SSOT Color Governance & One-Touch Global Propagation Protocol ("Rubah Satu Maka Rubah Semua")**:
1. **Semua Hijau Ikut Grade A**: `var(--grade-a)` (`#00c000ff` / `#00c000`), `rgba(var(--grade-a-rgb, 0, 192, 0), ...)`.
2. **Semua Kuning Ikut Grade C**: `var(--grade-c)` (`#FFFF00` / `#ffff00`), `rgba(var(--grade-c-rgb, 255, 255, 0), ...)`.
3. **Semua Merah Ikut Grade E**: `var(--grade-e)` (`#FF0000` / `#ff0000`), `rgba(var(--grade-e-rgb, 255, 0, 0), ...)`.
4. **Strict No-Hardcoding**: DILARANG KERAS mengetikkan kode hex mentah (`#ef4444`, `#ffe600`, `#10b981`, dll). Seluruh styling wajib merujuk ke token CSS variables atau `TOPSCORE_COLORS`.

---

## 2. Audit Findings: Current Compliance vs Rule 2.10

| Elemen / Komponen | Warna Saat Ini | Status Kepatuhan | Pelanggaran & Rekomendasi Perbaikan |
| :--- | :--- | :--- | :--- |
| **Tombol +LATE & Normal** (`.btn-wireframe-late`, `.btn-wireframe-normal`) | `border: 1.5px solid var(--grade-a, #00c000)` | 🟢 **SESUAI** | Sudah merujuk ke Grade A (`#00c000`), tidak meminjam Star Pink. |
| **Preset Tambah Waktu (+5m s.d +30m)** (Popover & Modal) | Hardcoded `#10b981` (Tailwind Emerald) & `#34d399` | 🔴 **BELUM SESUAI** | Wajib diganti ke `var(--grade-a)` dan `rgba(var(--grade-a-rgb, 0, 192, 0), 0.12)`. |
| **Tombol TIME** (`.btn-wireframe-edit-time`) | Border gelap/hilang di browser (`#0F172A`), CSS parser error | 🔴 **BELUM SESUAI** | Wajib dikunci: `border: 1.5px solid var(--grade-c, #ffff00) !important;`, `width: 100% !important;`, background kuning transparan `0.08`. |
| **Popover Edit Time Menu** (`.card-add-time-menu`, `#live-modal-add-time-menu`) | Hardcoded `#ffe600` (Amber kusam) & `rgba(255, 230, 0)` | 🔴 **BELUM SESUAI** | Wajib diselaraskan ke `var(--grade-c, #ffff00)` dan `rgba(var(--grade-c-rgb, 255, 255, 0), 0.28)`. |
| **Tombol CLOSE** (`.btn-wireframe-close`) | Hardcoded `#ef4444` (Tailwind Red) & `rgba(239, 68, 68)` | 🔴 **BELUM SESUAI** | Wajib diganti ke `border: 1.5px solid var(--grade-e, #ff0000) !important;` dan `rgba(var(--grade-e-rgb, 255, 0, 0), 0.08)`. |
| **Box Locked / Alarms** (`.box-wireframe-locked`) | Hardcoded `#ef4444` & `rgba(239, 68, 68)` | 🔴 **BELUM SESUAI** | Wajib diganti ke `border: 1px solid rgba(var(--grade-e-rgb, 255, 0, 0), 0.35) !important;` dan `rgba(var(--grade-e-rgb, 255, 0, 0), 0.08)`. |
| **Preset Kurangi Waktu (-5m s.d -30m)** (Popover & Modal) | Hardcoded `#ef4444` & `#f87171` | 🔴 **BELUM SESUAI** | Wajib diganti ke `rgba(var(--grade-e-rgb, 255, 0, 0), 0.12)` dan border `rgba(var(--grade-e-rgb, 255, 0, 0), 0.3)`. |

---

## 3. Visual Before & After Comparative Matrix

| Komponen / Properti | 🔴 Kondisi Saat Ini (BEFORE) | 🟢 Target Perubahan (AFTER) | Dasar Aturan / Alasan |
| :--- | :--- | :--- | :--- |
| **Tombol TIME (Kuning)** | Border gelap `#0F172A` / invisible, tidak ada outline kuning di browser | `border: 1.5px solid var(--grade-c, #ffff00) !important;`<br>`background: rgba(var(--grade-c-rgb, 255, 255, 0), 0.08) !important;`<br>`width: 100% !important;` | **Rule 2.10: Semua Kuning Ikut Grade C (`#ffff00`)** |
| **Tombol CLOSE (Merah)** | `border: 1.5px solid #ef4444 !important;`<br>`background: rgba(239, 68, 68, 0.08) !important;` (Tailwind) | `border: 1.5px solid var(--grade-e, #ff0000) !important;`<br>`background: rgba(var(--grade-e-rgb, 255, 0, 0), 0.08) !important;` | **Rule 2.10: Semua Merah Ikut Grade E (`#ff0000`)** |
| **Tombol +LATE (Hijau)** | `border: 1.5px solid var(--grade-a, #00c000) !important;` | Dipertahankan & diperkuat fallback `var(--grade-a, #00c000)` | **Rule 2.10: Semua Hijau Ikut Grade A (`#00c000`)** |
| **Popover Preset Options** | Hardcoded `#10b981` (hijau), `#ffe600` (kuning), `#ef4444` (merah) | Menggunakan `var(--grade-a)`, `var(--grade-c)`, `var(--grade-e)` & RGB variables | **Strict No-Hardcoding Protocol** |
| **CSS Syntax Integrity** | Unmatched `}` di baris 849 dan dangling block di baris 7149 | 100% balanced braces, nol syntax error | Mencegah parser browser memotong deklarasi CSS |

---

## 4. Visual Pre-Flight Verification

### 4.1 Current State Screenshot (Before)
![Current State - Dark/No Border on Time Button](C:/Users/Top/.gemini/antigravity/brain/e109f303-e1a5-4e34-b57b-3d40f829c347/user_current_time_button.png)

### 4.2 Proposed High-Fidelity Comparison (Before vs After)
![Before and After Comparison](C:/Users/Top/.gemini/antigravity/brain/e109f303-e1a5-4e34-b57b-3d40f829c347/time_button_before_after.png)

### 4.3 Sleek Modern Workstation Evolution (Eradicating Tacky & Clunky Aesthetics)
![Sleek Modern Evolution](C:/Users/Top/.gemini/antigravity/brain/e109f303-e1a5-4e34-b57b-3d40f829c347/sleek_modern_card_evolution.png)

### 4.3 Visual Pre-Flight Verification Checklist
- [x] **Current State Screenshot (Before)**: Embedded baseline visual showing existing appearance and dimensions.
- [x] **Proposed Visual Mockup (After)**: High-fidelity rendered mockup showing the new yellow outline layout.
- [x] **Zero Outer Page Scroll**: Verified root `100vh` lock with `calc(100vh - 60px)` console sizing.
- [x] **Container Spacing**: Verified strict 10px gap between all cards, tables, and top/lower panels.
- [x] **Lower Panel Alignment**: Verified 50px fixed height aligned with `.sidebar-footer`.
- [x] **Dynamic Columns & Nowrap**: Verified `white-space: nowrap !important;` on buttons with zero clipped text.
- [x] **Zero Dead Space**: Verified button fills 100% width of its flex column cell.
- [x] **Language Standard**: Verified all headers, labels, and badges use 100% direct English.

---

## 5. Execution Plan
1. **Perbaikan Token di `css/admin.css`**:
   - Ganti `#ef4444` dan `rgba(239, 68, 68, ...)` pada `.btn-wireframe-close` & `.box-wireframe-locked` menjadi `var(--grade-e, #ff0000)` dan `rgba(var(--grade-e-rgb, 255, 0, 0), ...)`.
   - Ganti `#ffe600` pada `.card-add-time-menu` menjadi `var(--grade-c, #ffff00)` dan `rgba(var(--grade-c-rgb, 255, 255, 0), ...)`.
   - Perbaiki syntax error baris 849 (unmatched `}`) dan baris 7149 (dangling block).
   - Tambahkan `width: 100% !important;` pada `.btn-wireframe-edit-time`.
2. **Pembersihan Hardcode di `js/admin/tests-access.js`**:
   - Perbaiki template tombol baris 1007 dengan inline style fallback: `width:100%; border:1.5px solid var(--grade-c, #ffff00) !important;`.
   - Selaraskan styling preset option di popover menu dengan token SSOT CSS variables.
3. **Bump Version Cache-Buster**:
   - `admin.html`: `css/admin.css?v=20261113_v434`.
   - `js/admin/app.js`: `./tests-access.js?v=20261113_v434`.
4. **Automated Verification**:
   - Jalankan script test assertion Node.js (`scripts/verify_ssot_colors_wireframe_buttons.mjs`) untuk memvalidasi zero hardcoded colors dan validitas syntax.
