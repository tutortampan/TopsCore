# Visual Pre-Flight Plan — Pop-Up 04: Component Selector Modal Modernization

> **Target Component:** `#component-selector-modal` in `dashboard.html`, `css/dashboard.css`, and `js/dashboard.js`  
> **Mobile Footprint:** Symmetrical **350px width** (exact 20px edge margin on 390×844 px viewport)  
> **Ergonomic Invariant:** Dedicated **60px Modal Footer** housing a **40px action button** (`START TEST →`)  
> **Typographic Scale:** Pure **Dual-Scale Family A (`20 – 16 – 12`)** — Zero sub-12px, zero floating rems  
> **Color SSOT:** Rule 2.10 official grading scale dynamic coloring on best scores  
> **Zero Emojis:** Lightweight vector SVG stroke icons (`book-open`, `message-square`, `mic`, `arrow-right`)

---

## 📸 1. Side-by-Side Visual Overview

Berikut adalah visual perbandingan langsung (*side-by-side*) antara tampilan lama (*Legacy Implementation*) dan tampilan terkalibrasi baru (*Proposed Golden Standard*) pada viewport ponsel cerdas (390×844 px):

![Pop-Up 04 Side-by-Side Comparison](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_04_side_by_side_overview.png)

### 🔍 Perbandingan Detail Antar Tampilan:

- **BEFORE (Legacy):** [popup_04_before.png](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_04_before.png)
- **AFTER (Golden Standard):** [popup_04_after.png](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_04_after.png)
- **Interactive Simulator:** [popup_04_side_by_side_comparison.html](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/popup_04_side_by_side_comparison.html)

---

## 📊 2. Matriks Evaluasi & Audit Spatial Invariants

| Parameter Desain | Implementasi Lama (*Before*) | Standar Baru (*Proposed After*) | Status Invariant |
| :--- | :--- | :--- | :---: |
| **Lebar Modal (*Width*)** | `max-width: 480px;` (inline rems, menjepit layar) | **Symmetrical 350px** (margin tepi tepat 20px pada 390px viewport) | ✅ **LULUS** |
| **Radius Sudut (*Border Radius*)** | `border-radius: 16px;` | **`border-radius: 20px;`** (Golden Standard Pop-up 01–03) | ✅ **LULUS** |
| **Footer & Action Button** | ❌ **TIDAK ADA FOOTER** (hanya klik kartu langsung) | **Dedicated 60px Footer** housing **40px CTA Button** (`START WORDS DRILL →`) | ✅ **LULUS** |
| **Alur Seleksi Interaktif** | Klik kartu langsung membuka halaman ujian (*abrupt*) | **Tap to Select** (glowing cyan/purple border) + Konfirmasi di Footer (atau double-tap) | ✅ **LULUS** |
| **Hirarki Tipografi** | `0.7rem` (11.2px), `0.78rem` (12.48px), `1.15rem` (18.4px) | **Family A Strict: 20px Header, 16px Title/CTA, 12px Meta/Chip/Notes** | ✅ **LULUS** |
| **Pewarnaan Nilai (*Rule 2.10*)** | Teks putih polos (`#f8fafc`), mengabaikan skor | **Dinamis via `getGradeColorByScore()`** (85% Lime `#95ff00`, 60% Yellow `#ffff00`, 100% Pink `#ff2d87`) | ✅ **LULUS** |
| **Konsistensi Bahasa** | Campuran: *"40 Soal"*, *"Progres: 0/7 Passes"* | Standar Bahasa Inggris utuh: *"40 Questions"*, *"Progress: 0/7 Passes"* | ✅ **LULUS** |
| **Ikonografi** | Polos / tanpa ikon pendukung | Ikon vektor stroke SVG (`book-open`, `message-square`, `mic`, `arrow-right`) | ✅ **LULUS** |
| **Tinggi & Headroom** | 358px | **448px** (~53% dari tinggi layar 844px, sisa headroom 396px, **100% zero scroll**) | ✅ **LULUS** |

---

## 🛠️ 3. Rencana Eksekusi Perubahan

### A. Struktur HTML (`dashboard.html`)
1. Mengganti wrapper inline style `#component-selector-modal` dengan arsitektur modular:
   - `.component-selector-modal-box` (350px, border-radius 20px, dark glass slate `#0f172a`).
   - `.component-selector-modal-body` (padding 16px 16px 12px 16px).
   - `.component-selector-modal-header` (badge 12px, title 20px, subtitle 12px, close button 30px).
   - `.component-selector-options-list` (gap 10px, kartu opsi 12px radius).
   - Footnote 12px (`Both parts must pass ≥70% to complete 1 round of 7×7.`).
   - `.component-selector-modal-footer` (tinggi 60px, padding 10px 16px, border-top separator).
   - `#btn-confirm-component-selection` (tinggi 40px, font 16px bold).

### B. Lembar Gaya CSS (`css/dashboard.css`)
1. Menambahkan kelas terisolasi `.component-selector-*`:
   - Penegakan `max-width: 350px !important;` dengan `border-radius: 20px !important;`.
   - Gaya kartu `.component-choice-card`: resting background `#151D2F`, border `1.5px solid rgba(255, 255, 255, 0.08)`.
   - Gaya aktif `.component-choice-card.selected`: border `1.5px solid #38bdf8`, background `rgba(56, 189, 248, 0.12)`, neon bloom `box-shadow: 0 0 16px rgba(56, 189, 248, 0.25)`.
   - Gaya aktif phrases `.component-choice-card-phrases.selected`: border `1.5px solid #c084fc`, background `rgba(192, 132, 252, 0.12)`.
   - Footer 60px dan tombol CTA 40px dengan efek hover glow.

### C. Logika Interaksi Modular (`js/dashboard.js`)
1. Memperbarui `triggerComponentChoiceModal(encodedData)`:
   - State aktif: default memilih `'words'` jika tersedia (atau `'phrases'`).
   - Menghubungkan klik kartu untuk memilih (`toggle('selected', true)`), memperbarui teks tombol footer (`START WORDS DRILL →` / `START PHRASES DRILL →` / `START WORDS EXAM →`).
   - Klik kedua pada kartu yang sudah terpilih langsung mengeksekusi navigasi (`location.href = ...`).
   - Tombol footer `#btn-confirm-component-selection` mengeksekusi navigasi sesuai opsi terpilih.
   - Pewarnaan dinamis nilai terbaik (`Best: X% (Y PTS)`) memanggil helper `getGradeColorByScore(percentage)`.
   - Normalisasi teks: `40 Questions` / `10 Questions` alih-alih `Soal`, `Progress` alih-alih `Progres`.
   - Integrasi aman penutupan modal via tombol `✕`, klik backdrop luar, atau penekanan tombol `Escape`.

---

## 🧪 4. Rencana Verifikasi & Uji Regresi

Setelah implementasi diterapkan, seluruh suite verifikasi otomatis berikut akan dijalankan:
1. `node scripts/check_all_js_syntax.cjs` $\rightarrow$ 50/50 JS files PASS.
2. `node .agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs` $\rightarrow$ Spatial invariants audit PASS.
3. `node scripts/test_universal_color_token_ssot.mjs` $\rightarrow$ Universal color token SSOT PASS.
4. `npm.cmd test` $\rightarrow$ Seluruh 47 test suite PASS tanpa regresi.
5. `node scripts/check_workspace_hygiene.mjs` $\rightarrow$ Workspace hygiene PASS.
6. Pembaruan dokumentasi:
   - `docs/CURRENT_STATE.md` (tetap dijaga $\le 120$ baris).
   - `docs/CHANGELOG.md` (pencatatan fase baru).
   - `tasks.md` (checklist Pop-up 04).
