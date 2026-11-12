# Admin Workspace Header, Sub-Header, and Footer Standardization Plan

> **Document Type:** Admin Spatial & Typographic Implementation Plan (Desktop Workstation)  
> **Date:** 2026-11-13  
> **Status:** APPROVED SCOPE & READY FOR PROCEED  
> **Authority:** In compliance with `AGENTS.md` Rule 2.20, `.agents/rules/ui-invariants.md`, and user directive: **Fokus 100% Admin Area (Desktop Workstation)**.

---

## 1. Executive Summary & Architectural Scope

Sesuai arahan eksplisit user:
> *"Kita fokus pada admin area saja. Bagian siswa punya aturan sendiri sebab pakai HP dan admin pakai komputer."*

Rencana ini secara eksklusif mengatur arsitektur spasial dan tipografi di **Admin Area (Desktop Workstation)**:
1. **Table Summary Row (`tfoot`)**: Dipisahkan dari Lower Panel dan distandardisasi menjadi **`32px`** (`height: 32px !important; line-height: 32px !important; font-size: 12px !important; font-weight: 700 !important;`), proporsional dengan baris data tabel (`24px–28px`).
2. **Workspace Lower Panel (`.workspace-lower-panel`)**: Tetap terkunci mutlak pada **`50px`** (`height: 50px !important;`) docked di bawah dengan gap `10px` dari tabel.
3. **Admin Topbar (`.admin-topbar`)**: Dihapus override `min-height: 56px` pada `@media (max-width: 900px)`; dikunci mutlak pada **`50px`** di seluruh breakpoint agar kalkulasi `#admin-console` `calc(100vh - 60px)` tidak pernah jebol.
4. **Admin Modal Header (`.modal-header`)**: Dikunci seragam **`50px`** (`height: 50px !important; display: flex; align-items: center; justify-content: space-between; padding: 0 20px !important;`).
5. **Admin Modal Footer (`.modal-footer`)**: Dikunci seragam **`50px`** (`height: 50px !important; display: flex; align-items: center; justify-content: flex-end; padding: 0 20px !important; gap: 10px !important;`).
6. **Pembersihan Font Sub-11px di Seluruh Tabel Admin**:
   - `#blueprint-matrix-table thead tr.bp-super-header-row th` (`font-size: 10px` $\rightarrow$ `12px Inter 800`).
   - `#class-attendance-grid thead tr:not(.datagrid-super-header-row) th` (`font-size: 11px` $\rightarrow$ `12px Inter 700`, `height: 20px` $\rightarrow$ `24px`).
   - `.table-compact thead th` di `css/style.css` (`0.65rem` $\rightarrow$ `12px Inter 700`).

---

## 2. Mandatory "Before & After" Visual Planning Matrix (Admin Area Only)

| Komponen / Properti | 🔴 Kondisi Saat Ini (BEFORE) | 🟢 Target Perubahan (AFTER) | Dasar Aturan / Alasan |
| :--- | :--- | :--- | :--- |
| **Admin Table Summary (`tfoot`)**<br>`.table-wrap table tfoot, .datagrid-table tfoot, #blueprint-matrix-table tfoot` | `height: 50px !important;`<br>`line-height: 50px;`<br>*(admin.css baris 400)* | `height: 32px !important;`<br>`min-height: 32px !important;`<br>`max-height: 32px !important;`<br>`line-height: 32px !important;`<br>`padding: 0 8px !important;` | **Proporsionalitas Tabel (Rule 8.5)**: Baris summary `tfoot` di dalam tabel tidak boleh membengkak hingga 50px; harus selaras dengan baris data (24-28px). |
| **Workspace Lower Panel**<br>`.workspace-lower-panel, #admin-lower-panel` | `height: 50px !important;`<br>*(Tergabung dengan tfoot)* | Tetap `50px !important;`<br>Terpisah secara semantik dan visual dari `tfoot`. | **Rule 3 & Rule 20**: Lower panel khusus tombol aksi utama ([🚀 NEXT], [➕ Add Student]). |
| **Admin Topbar Media Query**<br>`@media (max-width: 900px) .admin-topbar` | `height: auto;`<br>`min-height: 56px;`<br>`padding: 8px 12px;`<br>*(admin.css baris 1285)* | `height: 50px !important;`<br>`min-height: 50px !important;`<br>`max-height: 50px !important;`<br>`padding: 0 16px !important;` | **Strict 100vh Lock (Rule 1)**: Mencegah jebolnya kalkulasi `calc(100vh - 60px)` dan overflow scrollbar luar pada layar $\le 900$px. |
| **Admin Modal Header**<br>`.modal-header, .modal-header-bordered` | Fluid padding (`0.75rem` / `10px`), tinggi melar `~46px–56px`. Font variatif. | `height: 50px !important;`<br>`min-height: 50px !important;`<br>`max-height: 50px !important;`<br>`padding: 0 20px !important;`<br>`display: flex; align-items: center;` | **Universal Cadence Invariant**: Menyamakan ritme vertikal seluruh header dialog popover dengan topbar sistem (50px). |
| **Admin Modal Footer**<br>`.modal-footer, .modal-footer-bordered` | Fluid padding (`0.75rem` / `10px`), tinggi bergantung tombol `~52px–62px`. | `height: 50px !important;`<br>`min-height: 50px !important;`<br>`max-height: 50px !important;`<br>`padding: 0 20px !important;`<br>`display: flex; align-items: center; gap: 10px;` | **Docked Action Footer**: Tombol aksi modal tertata presisi di tengah container 50px dengan tombol aksi `32px` (gap 10px). |
| **Compact Table Header**<br>`.table-compact thead th` | `font-size: 0.65rem !important;`<br>`padding: 4px 5px !important;`<br>*(style.css baris 488)* | `font-size: 12px !important;`<br>`font-weight: 700 !important;`<br>`padding: 3px 6px !important;` | **Zero Sub-11px Invariant (Rule 14)**: Menghilangkan mikrofon 8.3px yang tidak terbaca dan menyatukan dengan standar tabel 12px. |
| **Blueprint Super-Header Font**<br>`#blueprint-matrix-table thead tr.bp-super-header-row th` | `font-size: 10px !important;`<br>*(admin.css baris 4270)* | `font-size: 12px !important;`<br>`font-weight: 800 !important;` | **Zero Sub-11px Invariant (Rule 14)**: Memastikan super-header konsisten 12px. |
| **Attendance Sub-Header**<br>`#class-attendance-grid thead tr:not(.datagrid-super-header-row) th` | `height: 20px; font-size: 11px; font-weight: 500;`<br>*(admin.css baris 4265)* | `height: 24px !important; font-size: 12px !important; font-weight: 700 !important;` | **Rule 8.4**: Memastikan sub-header 2-tier seragam 24px dan 12px Inter 700. |

---

## 3. Visual Pre-Flight Verification & Mockup Boards

````carousel
![Master Visual Comparison](file:///C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/comparison_master_header_sub_footer.png)
<!-- slide -->
![Table Summary Row (tfoot) Comparison](file:///C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/comparison_board_table_footer_tfoot.png)
<!-- slide -->
![Modal Header & Footer Comparison](file:///C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/comparison_board_modal_header_footer.png)
<!-- slide -->
![Admin Topbar Lock Comparison](file:///C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/comparison_board_admin_topbar_lock.png)
````

---

## 4. Visual Pre-Flight Verification Checklist

```markdown
- [x] Scope Boundary Confirmed: 100% Admin Area (Desktop Workstation) - Area Siswa tidak diubah.
- [x] Current State Baseline: Analisis CSS dan live DOM terekam lengkap.
- [x] Proposed Visual Mockup: Perbandingan grafis Before vs After ter-render via Edge browser.
- [x] Spatial Invariants Verification:
  - [x] 100vh lock & 0 outer page scroll: Terjaga penuh (Admin console calc(100vh - 60px) tidak terdistorsi).
  - [x] Universal Lower Panel 50px: Tetap 50px docked di bawah tabel.
  - [x] Table Summary Footer tfoot 32px: Terpisah dari Lower Panel, harmonis dengan baris data 24-28px.
  - [x] 10px Container Gap: Terjaga antar panel dan modal buttons.
  - [x] Zero Sub-11px Font: Seluruh sisa 0.65rem, 10px, dan 11px micro di tabel admin dipurge ke 12px.
- [ ] User Approval Received: Menunggu konfirmasi Proceed dari user.
```

---

## 5. Implementation Steps (Execution Plan)

### Step 1: Table Footer (`tfoot`) Separation & 32px Standardization (`css/admin.css`)
- Pisahkan `.workspace-lower-panel` (tetap `50px !important`) dari `.table-wrap table tfoot`, `.datagrid-table tfoot`, dan `#blueprint-matrix-table tfoot`.
- Tetapkan aturan eksak untuk `tfoot`:
  ```css
  .table-wrap table tfoot,
  .datagrid-table tfoot,
  #blueprint-matrix-table tfoot,
  .datagrid-tfoot tr.datagrid-summary-row {
    height: 32px !important;
    min-height: 32px !important;
    max-height: 32px !important;
    line-height: 32px !important;
    box-sizing: border-box !important;
    border-top: 2px solid rgba(56, 189, 248, 0.6) !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
    padding: 0 8px !important;
  }
  .table-wrap table tfoot td,
  .datagrid-table tfoot td,
  #blueprint-matrix-table tfoot td,
  .datagrid-tfoot tr.datagrid-summary-row td {
    height: 32px !important;
    min-height: 32px !important;
    max-height: 32px !important;
    line-height: 32px !important;
    box-sizing: border-box !important;
    padding: 0 8px !important;
    font-size: 12px !important;
    font-weight: 700 !important;
  }
  ```

### Step 2: Admin Topbar Strict 50px Lock Across All Breakpoints (`css/admin.css`)
- Hapus `height: auto; min-height: 56px;` pada `@media (max-width: 900px) .admin-topbar`.
- Pastikan `.admin-topbar` strictly `height: 50px !important; min-height: 50px !important; max-height: 50px !important;` pada semua kondisi.

### Step 3: Admin Modal Header & Footer 50px Standardization (`css/admin.css`)
- Terapkan height lock `50px` pada `.modal-header`, `.modal-header-bordered`, `.modal-header-add-class`, dan `.modal-footer`, `.modal-footer-bordered`:
  ```css
  .modal-header,
  .modal-header-bordered {
    height: 50px !important;
    min-height: 50px !important;
    max-height: 50px !important;
    padding: 0 20px !important;
    box-sizing: border-box !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    border-bottom: 1px solid var(--clr-border, rgba(255, 255, 255, 0.08)) !important;
  }
  .modal-footer,
  .modal-footer-bordered {
    height: 50px !important;
    min-height: 50px !important;
    max-height: 50px !important;
    padding: 0 20px !important;
    box-sizing: border-box !important;
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 10px !important;
    border-top: 1px solid var(--clr-border, rgba(255, 255, 255, 0.08)) !important;
  }
  ```

### Step 4: Purge Sub-11px Font & Micro Overrides in Admin Tables (`css/style.css`, `css/admin.css`)
- Ganti `.table-compact thead th { font-size: 0.65rem !important }` di `css/style.css` dengan `font-size: 12px !important`.
- Ganti `#blueprint-matrix-table thead tr.bp-super-header-row th { font-size: 10px !important }` di `css/admin.css` dengan `font-size: 12px !important`.
- Ganti `#class-attendance-grid .datagrid-thead tr:not(.datagrid-super-header-row) th { height: 20px; font-size: 11px }` dengan `height: 24px !important; font-size: 12px !important; font-weight: 700 !important;`.

### Step 5: Automated Verification Suite (`scripts/test_header_sub_footer_standardization.mjs`)
- Buat test script komprehensif yang memvalidasi:
  1. `tfoot` height = 32px.
  2. `.admin-topbar` height = 50px di seluruh breakpoint.
  3. `.modal-header` dan `.modal-footer` height = 50px.
  4. Zero sub-11px font sizes pada table headers.
  5. Seluruh 20 test suites dan spatial invariant checker tetap 100% PASS.

---

## 6. Verification & Acceptance Criteria
- [ ] Script automated verification `node scripts/test_header_sub_footer_standardization.mjs` lulus 100%.
- [ ] Command `npm.cmd run check:spatial` lulus 100%.
- [ ] Command `npm.cmd test` (seluruh 20 suites) lulus 100%.
- [ ] Dokumentasi `docs/CURRENT_STATE.md` dan `docs/CHANGELOG.md` diperbarui.
- [ ] Standing rule 0.1.1: Tidak ada git commit sebelum izin eksplisit user.
