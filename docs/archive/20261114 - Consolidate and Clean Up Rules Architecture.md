# Rencana Final Konsolidasi & Penataan Arsitektur Aturan TopsCore LMS (Hasil Tuntas /grill-me)

## Ringkasan Eksekutif & Hasil Penyelarasan /grill-me
Berdasarkan wawancara mendalam `/grill-me`, seluruh potensi kekeliruan aturan pada 4 domain umum (Warna, Font, Tabel, Panel) telah diselaraskan secara tuntas dan disepakati bersama:

```mermaid
graph TD
    subgraph 4 PILAR UTAMA KESEPAKATAN
        W["1. WARNA: Akademik vs UI Chrome<br/>(Hex Paten Grade vs Soft Token CSS Chrome)"]
        F["2. FONT: Skala 3-Level<br/>(20px Display - 16px Title - 12px Rest / Sub-12px Standard)"]
        T["3. TABEL: Dimensi & Text-Wrap<br/>(Header 40px, Two-Tier 30+30=60px, Footer 40px, Row 30-40px, Wrap Phrase)"]
        P["4. SPASIAL & PANEL: Harmonis 40px<br/>(Top Panel 40px, Sub Panel/Lower Panel 40px, Gap 10px)"]
    end

    subgraph ARSITEKTUR FILE (Hub & Spoke)
        HUB[".antigravityrules & AGENTS.md<br/>(Master Governance Index: 10 Prinsip Inti)"]
        SPOKE_UI[".agents/rules/ui-invariants.md<br/>(5 Bab: Spasial, Font, Warna, Tabel, Lampiran Komponen)"]
        SPOKE_WORK[".agents/rules/agent-workflow.md<br/>(Lean Workflow + Guardrails)"]
    end

    W --> SPOKE_UI
    F --> SPOKE_UI
    T --> SPOKE_UI
    P --> SPOKE_UI
    HUB -->|Tautan SSOT| SPOKE_UI
    HUB -->|Tautan SSOT| SPOKE_WORK
```

---

## 4 Pilar Spesifikasi Baku (Authoritative Baseline)

### Pilar 1: WARNA (Pemisahan Akademik vs UI Chrome)
- **Warna Akademik / Grade / Rapor**: Menggunakan hex paten resmi Grade Vault (`#ff2d87` Star Pink eksklusif, `#00c000ff` Grade A, `#95ff00ff` Grade B, `#FFFF00` Grade C, `#FF8C00` Grade D, `#FF0000` Grade E). Badge bulat selalu menggunakan teks dark slate `#0F172A`.
- **Warna UI Chrome (Buttons, Alerts, Status Chips)**: Menggunakan token variabel CSS semantik (`--btn-danger`, `--status-warning`, `--status-success`, dll.) dengan pola profesional: background lembut `rgba(..., 0.15)` + solid border & teks tajam agar tidak silau (*harsh*) pada kanvas gelap `#090D16`/`#0F172A`.

### Pilar 2: FONT (Sistem 3-Level & Zero Sub-12px Standard)
- **Skala 3-Level Sederhana**:
  1. `Display`: **20px** (`Outfit 800`, judul utama / hero)
  2. `Title`: **16px** (`Outfit 700`, judul kartu, modal header, tab)
  3. `Rest (Tabel, Body, Controls, Caption, Mono)`: **12px** (`Inter 500/600` & `JetBrains Mono`)
- **Zero Sub-12px Rule**: Batas mutlak minimal teks di workstation admin adalah **12px** (tidak boleh ada lagi teks buram 8px–10px).
- **Layar Siswa**: Halaman siswa (`test.html`, `result.html`, `dashboard.html`) tetap bebas menggunakan font besar untuk soal ujian (18px–24px) dan skor rapor hero (48px–72px).

### Pilar 3: TABEL (Dimensi Presisi & Fleksibilitas Text-Wrap)
- **Tinggi Single Header (`thead th`)**: **40px**.
- **Tinggi Two-Tier Header (Super-Header & Sub-Header)**: **30px + 30px = Total 60px** (ruang lega dan proporsional untuk ikon dan teks).
- **Tinggi Footer Tabel (`tfoot td`)**: **40px**.
- **Tinggi Baris Data (`tbody tr td`)**: **30px – 40px**.
- **Display Lock & Scroll**: Wajib native `display: table`, vertical scroll strictly inside `.table-wrap`.
- **Master Edit Mode**: View mode bersih tanpa input/kapsul; Edit mode ON memunculkan garis grid putih Excel dengan input transparan borderless.
- **Aturan Text-Wrap**:
  - Default Data Tabel (Roster, Skor, Status, Batch): `white-space: nowrap !important; text-overflow: ellipsis; overflow: hidden;`.
  - **Pengecualian Resmi (Wrap Allowed)**: Khusus kalimat panjang di **Vocabulary Vault Phrases & Definitions** (teks bahasa Inggris dan terjemahan Indonesia) DIIZINKAN melakukan text-wrap agar kalimat utuh dapat dibaca tanpa terpotong `...`.

### Pilar 4: SPASIAL & PANEL (Harmonisasi 40px)
- **Definisi Terminologi**: Istilah **"Sub Panel"** adalah sebutan resmi user untuk **Lower Panel** (`.workspace-lower-panel` yang berada di bagian bawah tabel/workspace).
- **Tinggi Top Panel & Toolbars**: **40px**.
- **Tinggi Sub Panel (Lower Panel)**: **40px** (diselaraskan dari 50px menjadi 40px agar harmonis dengan sidebar footer dan header tabel).
- **Universal Container Gap**: **10px** jarak antar kartu, panel, toolbar, dan tabel.
- **100vh Viewport Lock**: `html`, `body` locked 100vh (`overflow: hidden !important;`), `#admin-console` `calc(100vh - 60px)`.
- **Centered Loading State**: Spinner pemuatan terpusat vertikal & horizontal menggunakan helper canonical `getLoadingStateHtml(message)` dengan teks bahasa Inggris baku.

---

## Rincian Perubahan File

### 1. [MODIFY] `.antigravityrules`
Transformasi menjadi **Master Governance Index** ringkas (~40–45 baris) dengan 10 Prinsip Inti berurutan (1 s/d 10), bebas duplikasi teks tabel CSS/hex, dan mengarahkan AI langsung ke tautan SSOT.

### 2. [MODIFY] `.agents/rules/ui-invariants.md`
Restrukturisasi penuh ke dalam 5 Bab:
- **Bab 1: Spasial, Viewport & Workspaces** (100vh lock, 10px gap, Sub Panel 40px, Centered Loading).
- **Bab 2: Tipografi & Skala Font Terpusat** (Sistem 3-Level 20-16-12, Zero Sub-12px, single-line data, direct English).
- **Bab 3: Desain Sistem & Warna Terpusat** (Pemisahan Akademik Grade Hex vs UI Chrome CSS Soft Tokens, dark slate `#0F172A` badge text).
- **Bab 4: Arsitektur Tabel, Grid & Master Edit Mode** (Single Header 40px, Two-tier 30+30=60px, Footer 40px, Row 30-40px, Flex-Primary column, Text-wrap untuk Phrase).
- **Bab 5: Lampiran Spesifik Komponen & Roster** (Urutan kolom Student Roster, dossier on click, kode chip `CMP`/`EVN`, DataGrid default).

### 3. [MODIFY] `.agents/rules/agent-workflow.md`
Menambahkan **Section 11: Code Quality & File Guardrails**:
- *No Backup Suffixes* (`_2.*`, `_new.*`, edit in-place).
- *Module Variable Hoisting* (`_currentSection`, modal refs).
- *JavaScript Syntax Validation* (`node --check`).

### 4. [DELETE] File Mini Redundant
- Hapus `.agents/rules/powershell.md`.
- Hapus `.agents/rules/guardrails.md`.

### 5. [ARCHIVE] File Log Lama di `docs/`
- Pindahkan `docs/SESSION_LOG.md` $\rightarrow$ `docs/archive/SESSION_LOG_LEGACY.md`.
- Pindahkan `docs/TODO.md` $\rightarrow$ `docs/archive/TODO_LEGACY.md`.

### 6. [MODIFY] `css/admin.css`
- Sesuaikan `.workspace-lower-panel` dari `height: 50px !important;` menjadi `height: 40px !important;` (dan `line-height: 40px`) agar 100% sesuai dengan standar baku 40px yang baru disepakati.

### 7. [MODIFY] `AGENTS.md`
- Perbarui tabel Section 4 (Modular Specification Map) agar menunjuk ke struktur baru.

---

## Verification Plan

### Automated Tests
1. **Verifikasi Spatial Layout**:
   ```bash
   node .agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs
   ```
2. **Syntax Validation pada File JavaScript**:
   ```bash
   node --check js/admin/app.js
   node --check js/grading.js
   ```
3. **Pemeriksaan Link dan Integritas File**:
   Memastikan seluruh tautan `file:///...` pada `.antigravityrules` dan `AGENTS.md` valid dan dapat diakses.

### Manual Verification
- Memastikan folder `.agents/rules/` kini hanya memiliki 2 file yang terstruktur rapi.
- Memastikan `.antigravityrules` ringkas dan mudah dipindai tanpa ada aturan yang saling bertabrakan.
