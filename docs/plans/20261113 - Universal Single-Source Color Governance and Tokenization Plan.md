# Implementation Plan
## Universal Single-Source Color Governance & One-Touch Tokenization Protocol

> **Plan Name:** `20261113 - Universal Single-Source Color Governance and Tokenization Plan`  
> **Date:** 2026-11-13  
> **Status:** PROPOSED (Awaiting User Review / Proceed Approval)  
> **Authority:** Direct User Requirement in Current Turn (Execution Authority Rule 0), AGENTS.md Rule 2.10, and Skill `visual-preflight`

---

## 1. Goal Description

Establish an authoritative, single-source-of-truth color architecture across TopsCore LMS where **"rubah satu, maka rubah semua"** (change once, propagate everywhere) is fully realized.

Per user instruction:
1. **Semua Merah Ikut Warna E (`--grade-e` / `#ff0000`)**: Semua elemen bernuansa merah (gagal ujian, delete/purge, bahaya, alert, bintang required `*`, indikator salah) merujuk pada token Grade E.
2. **Semua Kuning Ikut Warna C (`--grade-c` / `#ffff00`)**: Semua elemen bernuansa kuning (nilai cukup, peringatan, draft, latency warning, popover penyesuaian waktu) merujuk pada token Grade C.
3. **Semua Hijau Ikut Warna A (`--grade-a` / `#00c000ff`)**: Semua elemen bernuansa hijau (nilai sangat baik, sukses, lulus, online telemetry, published status, tombol konfirmasi aman) merujuk pada token Grade A.
4. **Eksklusivitas Star Pink (`#ff2d87` / `--grade-star`)**: Tetap 100% mutlak eksklusif untuk nilai bintang (100% Excellent).
5. **Warna Sistem (Non-Semantik)**: Chrome antarmuka (kanvas gelap `#060b18` / `#090d16`, sidebar `#0f172a`, border `rgba(255,255,255,0.08)`, teks muted `#94a3b8`, tactical sky blue `#38bdf8` / indigo `#6366f1`) tetap menggunakan token sistem yang tenang dan profesional.
6. **Purge Hardcoded Hex**: Mengganti 146 titik hardcoded hex di JavaScript dan ~35 di CSS menjadi referensi variabel CSS (`var(--grade-*)`) atau kelas utilitas terpusat.
7. **Pembaruan Aturan Tata Kelola**: Meratifikasi aturan ini ke dalam `AGENTS.md`, `.agents/rules/ui-invariants.md`, dan `.antigravityrules` dengan menetapkan percakapan ini sebagai aturan utama.

---

## 2. User Review Required

> [!IMPORTANT]
> **One-Touch Propagation Guarantee**: Setelah rencana ini dieksekusi, jika Anda mengubah nilai `--grade-e` di `css/style.css` (misalnya dari `#ff0000` menjadi `#ef4444`), perubahan tersebut akan langsung mengubah nilai rapor siswa, tanda silang salah di ujian, tombol hapus di admin, dan badge peringatan secara serentak dalam satu langkah tanpa perlu mengedit ratusan file lain.

> [!NOTE]
> Rencana ini telah memeriksa dan menyelaraskan seluruh proposal aktif di `docs/plans/` (termasuk *Complete Cross-Realm Palette Architecture Plan*, *Student Roster Polish*, dan *Submit Modal Behavior*), memastikan tidak ada konflik antar percakapan.

---

## 3. Mandatory "Before & After" Visual Planning Matrix

| Komponen / Properti | 🔴 Kondisi Saat Ini (BEFORE) | 🟢 Target Perubahan (AFTER) | Dasar Aturan / Alasan |
| :--- | :--- | :--- | :--- |
| **Pemicu Warna Merah di Seluruh Sistem** | Sebagian hardcoded `#ff0000` di JS (`desk.js`, `app.js`, `tests-access.js`, `style="color:#ff0000"`), sebagian `var(--clr-danger)` | Wajib 100% merujuk `--grade-e` / `var(--grade-e)` atau `TOPSCORE_COLORS.E` / `.text-fail` | **User Directive**: "Semua warna merah ikut warna E; rubah satu rubah semua". |
| **Pemicu Warna Kuning di Seluruh Sistem** | Sebagian hardcoded `#ffff00` atau `#ffe600` di template HTML dan badge draft | Wajib 100% merujuk `--grade-c` / `var(--grade-c)` atau `TOPSCORE_COLORS.C` / `.text-warning` | **User Directive**: "Semua kuning ikut warna C; rubah satu rubah semua". |
| **Pemicu Warna Hijau di Seluruh Sistem** | Sebagian hardcoded `#00c000` di tombol, status dot, dan tabel | Wajib 100% merujuk `--grade-a` / `var(--grade-a)` atau `TOPSCORE_COLORS.A` / `.text-success` | **User Directive**: "Semua hijau ikut warna A; rubah satu rubah semua". |
| **Alias CSS di `:root` (`css/style.css` & `css/admin.css`)** | `--clr-warning: #ff8c00` (Grade D) dan `--clr-danger: #ff0000` lepas | `--clr-danger: var(--grade-e);`<br>`--clr-warning: var(--grade-c);`<br>`--clr-success: var(--grade-a);` | Mengikat seluruh alias sistem ke Master Grade Vault. |
| **Template JS (146 Titik Hardcoded Hex)** | Inline string: `style="color: #ff0000;"` atau `style="color: #ffff00;"` | Inline CSS variable: `style="color: var(--grade-e);"` atau kelas utilitas `.text-fail` | Memutus hardcoding, mengaktifkan propagasi visual seketika. |
| **Aturan Tata Kelola (`AGENTS.md`, `ui-invariants.md`)** | Hanya menyebutkan grading scale tanpa mandat tegas propagasi UI satu langkah | Menambahkan klausul eksplisit *"One-Touch Color Propagation (SSOT)"*: Merah=E, Kuning=C, Hijau=A | Menjadikan aturan percakapan ini sebagai otoritas master. |

---

## 4. Visual Pre-Flight Architecture

```mermaid
flowchart TD
  subgraph MasterVault [Master Single Source of Truth: :root CSS]
    direction TB
    STAR["--grade-star: #ff2d87 (Eksklusif Star 100%)"]
    A["--grade-a: #00c000ff (Hijau Very Good)"]
    C["--grade-c: #ffff00 (Kuning Enough)"]
    E["--grade-e: #ff0000 (Merah Fail)"]
  end

  subgraph SystemTokens [Token Sistem Non-Semantik]
    BG["--fm-bg-main: #090d16 / #060b18"]
    PANEL["--fm-bg-panel: #0f172a"]
    BORDER["--fm-border-subtle: rgba(255,255,255,0.08)"]
    TEXT["--fm-text-muted: #94a3b8"]
    ACCENT["--fm-accent-tactical: #6366f1 / #38bdf8"]
  end

  subgraph SemanticUIBinding [Propagasi Otomatis ("Rubah Satu Rubah Semua")]
    E -->|1-Touch| RED_ALL["Tombol Delete/Purge, Indikator Salah, Danger Modals, Asterisk (*)"]
    C -->|1-Touch| YEL_ALL["Popover Waktu, Alert Peringatan, Latency Chips, Draft Status"]
    A -->|1-Touch| GRN_ALL["Status Published, Telemetry Online, Tombol Lulus/Aman, Nilai A"]
  end
```

---

## 5. Proposed Changes

### Component 1: Master Governance Files
#### [MODIFY] `AGENTS.md`
- Perbarui Bagian 2.10 dengan klausul *Universal Color Triad & One-Touch Propagation Rule*:
  - Merah $\rightarrow$ Grade E (`--grade-e` / `TOPSCORE_COLORS.E`).
  - Kuning $\rightarrow$ Grade C (`--grade-c` / `TOPSCORE_COLORS.C`).
  - Hijau $\rightarrow$ Grade A (`--grade-a` / `TOPSCORE_COLORS.A`).
  - Star Pink $\rightarrow$ Grade Star (`--grade-star` / `#ff2d87`, eksklusif 100%).
  - Dilarang keras menuliskan kode hex mentah di CSS atau JS; semua elemen wajib merujuk pada token.

#### [MODIFY] `.agents/rules/ui-invariants.md`
- Tambahkan Bagian 15: *Universal Single-Source Color Governance & One-Touch Propagation Invariant*:
  - Mengunci aturan pemetaan token.
  - Menetapkan kelas pembantu utilitas: `.text-fail`, `.text-warning`, `.text-success`, `.badge-fail`, `.badge-warning`, `.badge-success`.

#### [MODIFY] `.antigravityrules`
- Tambahkan Aturan 26:
  - *UNIVERSAL COLOR TOKEN PROPAGATION (SSOT)*: Menetapkan bahwa semua warna merah mengikuti Grade E, semua kuning mengikuti Grade C, semua hijau mengikuti Grade A.

---

### Component 2: CSS Stylesheets
#### [MODIFY] `css/style.css`
- Harmonisasikan `:root`:
  ```css
  /* Master Semantic Bindings */
  --clr-success: var(--grade-a);
  --clr-success-rgb: var(--grade-a-rgb);
  --clr-warning: var(--grade-c);
  --clr-warning-rgb: var(--grade-c-rgb);
  --clr-danger: var(--grade-e);
  --clr-danger-rgb: var(--grade-e-rgb);
  ```
- Tambahkan kelas utilitas global agar template JS dapat memanggilnya dengan ringkas:
  ```css
  .text-fail { color: var(--grade-e) !important; }
  .text-warning { color: var(--grade-c) !important; }
  .text-success { color: var(--grade-a) !important; }
  .border-fail { border-color: var(--grade-e) !important; }
  .border-warning { border-color: var(--grade-c) !important; }
  .border-success { border-color: var(--grade-a) !important; }
  ```

#### [MODIFY] `css/admin.css`
- Petakan token workstation ke Master Vault:
  ```css
  --fm-accent-pitch: var(--grade-a);
  --fm-accent-amber: var(--grade-c);
  --fm-accent-crimson: var(--grade-e);
  ```

---

### Component 3: JavaScript Templates & Hardcoded Hex Purge
#### [MODIFY] `js/admin/desk.js`, `js/admin/app.js`, `js/admin/tests-access.js`, `js/admin/student-management.js`, `js/admin/class-analytics.js`, `js/admin/tests-management.js`
- Ganti string inline hex mentah:
  - `style="color: #ff0000;"` $\rightarrow$ `style="color: var(--grade-e);"` (atau `class="text-fail"`)
  - `style="color: #ffff00;"` $\rightarrow$ `style="color: var(--grade-c);"` (atau `class="text-warning"`)
  - `style="color: #00c000;"` $\rightarrow$ `style="color: var(--grade-a);"` (atau `class="text-success"`)
  - Penugasan JS dinamis: ganti string literal `'#ff0000'` dengan `TOPSCORE_COLORS.E`, `'#ffff00'` dengan `TOPSCORE_COLORS.C`, `'#00c000'` dengan `TOPSCORE_COLORS.A`.

---

### Component 4: Verification Suite
#### [NEW] `scripts/test_universal_color_token_ssot.mjs`
- Skrip pengujian otomatis komprehensif untuk memeriksa:
  1. Keberadaan dan keterikatan variabel CSS di `:root` (`css/style.css` dan `css/admin.css`).
  2. Ketiadaan kode hex merah/kuning/hijau mentah di template admin yang dimodifikasi.
  3. Simulasi "Rubah satu maka rubah semua": memverifikasi bahwa perubahan nilai token di `:root` secara komputasional merefleksikan nilai baru ke seluruh elemen terkait.
  4. Menjalankan `npm.cmd run verify:all` untuk memastikan 100% kelulusan seluruh tes dan invariant spasial.

---

## 6. Verification Plan

### Automated Tests
1. **SSOT Token Verification**:
   ```powershell
   node scripts/test_universal_color_token_ssot.mjs
   ```
2. **Unified Sanity Suite**:
   ```powershell
   npm.cmd run verify:all
   ```

### Manual Verification
- Buka antarmuka Admin (`admin.html`), lakukan inspeksi elemen (DevTools) pada:
  1. Tombol Purge / Delete: Memastikan computed color merujuk ke `--grade-e`.
  2. Banner Peringatan / Popover Waktu: Memastikan computed color merujuk ke `--grade-c`.
  3. Status Published / Tombol Sukses: Memastikan computed color merujuk ke `--grade-a`.
- Lakukan pengujian ubah token: Ubah warna `--grade-e` di browser inspector dan pastikan seluruh elemen merah berubah serentak seketika.
