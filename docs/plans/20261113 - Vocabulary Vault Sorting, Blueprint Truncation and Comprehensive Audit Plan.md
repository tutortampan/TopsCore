# Implementation Plan: Vocabulary Vault Interactive Sorting, Blueprint Truncation Eradication & Comprehensive Audit

> **Document:** `20261113 - Vocabulary Vault Sorting, Blueprint Truncation and Comprehensive Audit Plan.md`  
> **Status:** PROPOSED (Awaiting User Approval)  
> **Target Date:** 2026-11-13  
> **Target Components:** `js/admin/vocab-vault.js`, `css/admin.css`  

---

## 1. Goal Description

Menindaklanjuti telaah mendalam pengguna terhadap seluruh kolom di Vocabulary Vault:
1. **Penyelidikan Akar Masalah Kolom & Geometri Tabel**:
   - Mengapa sortir `LEX-CD` tidak jalan?
   - Mengapa teks masih terpotong di Test Blueprint (Gambar 2) dan Theme Manager (Gambar 3)?
2. **Standardisasi Palet Warna Kolom `TYPE` Murni Spektrum Biru Sistem**:
   - Sesuai arahan langsung pengguna: isi kolom `TYPE` **hanya menggunakan warna di spektrum biru** yang sudah eksis di dalam sistem TopsCore (`#38bdf8`, `#60a5fa`, `#818cf8`, `#93c5fd`, `#a5b4fc`).
   - Menghapus total warna merah alarm (`#FF0000`), oranye, ungu selain indigo, dan hijau pada tipe kata/frasa.
3. **Audit Mendalam Warna Tulisan, Tipografi & Kontras Visual**:
   - Mengharmonisasi warna status `Ready` yang tidak konsisten (Task = Hijau, Exam = Ungu).
   - Menghapus seluruh teks di bawah 11px (*sub-11px font violation*).
   - Memperbaiki kontras teks yang serba putih polos antara arti Indonesia dan frasa Inggris.
   - Meredupkan angka `0` (*zero-dimming*) pada kolom breakdown Theme Manager agar data positif langsung menonjol.
4. **Penyempurnaan Arsitektur & Fungsionalitas Modul Vocabulary Vault**.

---

## 2. Root Cause Analysis: Bedah Akar Masalah Kolom & Layout

### 2.1 Mengapa Sortir `LEX-CD` Tidak Berfungsi?
1. **Header Tabel Pasif / Nol Event Listener**:
   Seluruh tag `<th>` pada `#vault-table` di-render sebagai teks polos tanpa atribut `cursor: pointer;`, tanpa penanda `data-sort`, dan tanpa *click listener*.
2. **Hardcoded Sort pada Filter**:
   Pada `filterAndRender()` (baris 680), pengurutan di-hardcode mati:
   ```javascript
   filtered = [...filtered].sort((a, b) => (a.english || '').localeCompare(b.english || ''));
   ```
   Tabel selalu memaksa urutan alfabetis Bahasa Inggris, sehingga urutan koordinat kurikulum (`3C1`, `3C2`, `3D1`) teracak berantakan.
3. **`lex_code` Tidak Ditempelkan ke Objek Kata**:
   Nilai `lexCode` (`3D1-W01`, `3D1-P01`) hanya disimpan di dalam Map lokal (`topicWordIndexMap`) dan tidak dijadikan properti langsung pada objek kata `w`, sehingga fungsi filter dan sort tidak dapat membacanya.

### 2.2 Mengapa Teks Terpotong pada Test Blueprint & Theme Manager?
1. **Konflik W3C Table Algorithm: `table-layout: fixed` vs Super-Headers**:
   Di `css/admin.css` baris 3860, tabel dikunci dengan `table-layout: fixed !important;`.
   Berdasarkan spesifikasi CSS W3C, pada tabel berformat *fixed layout*, lebar kolom ditentukan oleh baris pertama (`<tr>`). Jika baris pertama adalah **Super-Header** dengan `<th colspan="6">` atau `<th colspan="4">`, browser membagi lebar super-header tersebut **sama rata** ke kolom-kolom di bawahnya:
   - Pada **Theme Manager**: `<th colspan="6">` dibagi 6 kolom secara merata $\rightarrow$ Kolom `TOPIC NAME` tertekan menjadi **67.5px**! Teks di atas 67.5px terpotong visual (*clipped*).
   - Pada **Test Blueprint**: `<th colspan="4">` dibagi 4 kolom secara merata $\rightarrow$ Kolom `Topic Name` tertekan menjadi **93.5px**! Teks panjang (208px) dipaksa memunculkan elipsis `...`.
   - Properti `min-width: 240px;` pada baris kedua `<th>` diabaikan sepenuhnya oleh browser.
2. **Solusi Definitif**: Menyuntikkan elemen `<colgroup><col style="...">` tepat sebelum `<thead>`. Browser wajib mematuhi definisi `<col>`, sehingga `TOPIC NAME` mendapatkan lebar penuh (240px–260px+) terlepas dari adanya `colspan` super-header.

---

## 3. Palet Resmi Spektrum Biru Sistem untuk Kolom `TYPE`

Sesuai instruksi pengguna ("gunakan hanya warna di spektrum biru saja, utamakan warna yang sudah dipakai dalam sistem"):

| Tipe Kata / Frasa | Warna Spektrum Biru Sistem | Token Hex | Karakteristik & Penggunaan Eksisting Sistem |
|:---|:---|:---:|:---|
| **Noun** (Kata Benda) | **Sky Blue** | `#60a5fa` | Biru tegas (Blue 400), sudah dipakai pada kolom WORDS summary. |
| **Verb** (Kata Kerja) | **Indigo Blue** | `#818cf8` | Biru nila / indigo dinamis (Indigo 400), dipakai pada super-header breakdown. |
| **Adjective** (Sifat) | **Tactical Cyan** | `#38bdf8` | Biru langit terang (Sky 400), token utama sistem navigasi/telemetri. |
| **Adverb** (Keterangan) | **Ice / Powder Blue** | `#93c5fd` | Biru es lembut (Blue 300), sudah dipakai pada sub-header VERB/NOUN. |
| **Vocab** (Umum) | **Periwinkle Blue** | `#a5b4fc` | Biru pastel sejuk (Indigo 300), dipakai pada sub-header TH-CD/TP-CD. |
| **Idiom** | **Sky Blue** | `#60a5fa` | Biru tegas & kontras tinggi pada latar `#0f172a`. |
| **Proverb** (Peribahasa) | **Indigo Blue** | `#818cf8` | Biru nila anggun — *resmi menggantikan merah alarm `#FF0000`*. |
| **Expression** | **Tactical Cyan** | `#38bdf8` | Biru langit taktis, segar dan jernih. |
| **Phrase / Phrasal Verb** | **Ice / Powder Blue** | `#93c5fd` | Biru es lembut, seragam dengan kata keterangan. |

### Fungsi Utilitas Terpusat Murni Spektrum Biru:
```javascript
export function getVaultTypeColor(wordType) {
  const wt = String(wordType || 'vocab').toLowerCase().trim();
  switch (wt) {
    // Single Words (Pure Blue Spectrum)
    case 'noun': return '#60a5fa';       // Sky Blue 400
    case 'verb': return '#818cf8';       // Indigo Blue 400
    case 'adjective': return '#38bdf8';  // Tactical Cyan Blue 400
    case 'adverb': return '#93c5fd';     // Ice / Powder Blue 300
    case 'vocab':
    case 'vocabulary': return '#a5b4fc'; // Periwinkle Blue 300

    // Phrases & Idioms (Pure Blue Spectrum)
    case 'idiom': return '#60a5fa';      // Sky Blue 400
    case 'proverb': return '#818cf8';    // Indigo Blue 400 (bukan merah!)
    case 'expression': return '#38bdf8'; // Tactical Cyan Blue 400
    case 'phrase':
    case 'phrasal verb': return '#93c5fd'; // Ice / Powder Blue 300
    default: return '#38bdf8';           // Default Tactical Blue
  }
}
```

---

## 4. Audit Komprehensif Seluruh Kolom & Tipografi Vocabulary Vault

| No | Elemen / Kolom | Kondisi Saat Ini | Masalah & Dampak Visual | Rekomendasi Solusi & Token Warna |
|:---:|:---|:---|:---|:---|
| **1** | **Sortir Header Kolom** | Pasif / statis di `#vault-table` | Tutor tidak bisa menyortir berdasarkan nomor urut modul/materi kurikulum (`LEX-CD`). | Pasang *interactive sorting* dua arah (▲ / ▼). Jadikan `LEX-CD` urutan default. |
| **2** | **Status Kesiapan Ujian di Blueprint** | `Task Status = #4ade80` (Hijau), `Exam Status = #c084fc` (Ungu) | Indikator `✓ Ready` pada dua kolom bersebelahan menggunakan warna berbeda (Hijau vs Ungu), membingungkan tutor. | Standarisasi semua `✓ Ready` ke **Hijau Sukses** (`var(--grade-a, #00c000ff)` / `#4ade80`), dan `▲ Missing` ke **Merah Fail** (`var(--grade-e, #ff0000)`). |
| **3** | **Ukuran Font Sub-11px di Blueprint** | Header dan data kolom menggunakan `font-size: 10px;` dan `10.5px;` | Pelanggaran aturan tata kelola **"zero sub-11px text"**. Teks 10px terlalu kecil dan melelahkan mata di layar 1440x900. | Naikkan seluruh teks 10px/10.5px ke standar minimum **11px** (atau 12px untuk header), `font-weight: 700/800`. |
| **4** | **Kontras Warna Teks di Grid Kata/Frasa** | `THEME`, `TOPIC`, `INDONESIAN`, `ENGLISH` semuanya putih polos (`#ffffff; font-size: 12px;`) | Tidak ada kontras visual antara hierarki modul, arti Indonesia, dan frasa Inggris. Tampilan datar dan monoton. | Terapkan kontras dinamis: `LEX-CD` (`#38bdf8` bold), `THEME/TOPIC` (`#94a3b8` slate tenang), `INDONESIAN` (`#cbd5e1` soft), `ENGLISH` (`#ffffff` crisp white tebal). |
| **5** | **Angka 0 (Nol) pada Breakdown Theme Manager** | Angka `0` ditampilkan dengan warna abu-abu terang yang sama persis dengan angka `20` dan `10` | Baris-baris Level 1 dipenuhi deretan `0 0 0 0` terang yang menimbulkan polusi visual (*noise*). | Terapkan *Zero-Dimming*: jika nilai `0`, warnai abu-abu redup (`#334155` / `#475569`); jika $> 0$, warnai cerah (`#93c5fd` / `#d8b4fe`). |
| **6** | **Pencarian Bawah Tidak Memeriksa Kode** | Input `#vault-search` hanya mencari `indonesian`, `english`, `topic`, `theme` | Tutor mengetik "3D1" atau "3D1-W01" menghasilkan 0 hasil (tabel kosong). | Tambahkan `w.lex_code.toLowerCase().includes(search)` pada filter pencarian. |
| **7** | **Dropdown Program Hardcoded** | Opsi program di grid bawah di-hardcode `<option value="Camp">`, `Evnikom`, `Sheraton` | Variasi kode program (`CMP`, `EVN`) atau penambahan program baru tidak didukung. | Render opsi dinamis dari `window._vaultMeta.programs`. |
| **8** | **Colspan Empty State Mismatch** | `colspan="7"` saat Edit Mode OFF (hanya 6 header tampil). | Tabel sedikit melebar asimetris saat baris kosong. | Dinamiskan: 6 saat Edit Mode OFF, 7 saat ON. |

---

## 5. Visual Planning Matrix (Before vs. After)

| Komponen / Kolom | Sebelum (Kondisi Saat Ini) | Sesudah (Rencana Perbaikan) | Keuntungan Estetika & Keterbacaan |
|:---|:---|:---|:---|
| **Header Sort & LEX-CD** | Header statis/pasif. Tabel di-hardcode urutan Bahasa Inggris A–Z. | Header interaktif dengan panah sortir (▲ / ▼). Default: `LEX-CD` Ascending. | Modul kurikulum tersusun teratur (`1G1-W01` $\rightarrow$ `3D1-P01`). Dapat disortir per kolom dengan 1 klik. |
| **Kategori Gramatikal (TYPE)** | Proverb = Merah Alarm (`#FF0000`). Noun/Verb = Biru Flat polos. Idiom = Oranye. | **100% Spektrum Biru Sistem**: Noun `#60a5fa`, Verb `#818cf8`, Adj `#38bdf8`, Adv `#93c5fd`, Proverb `#818cf8`, Idiom `#60a5fa`. | Tampilan sangat tenang, profesional, elegan, dan 100% bebas dari warna merah alarm. |
| **Warna Status Blueprint** | Exam Ready = Ungu (`#c084fc`), Task Ready = Hijau (`#4ade80`). | Keduanya seragam: Ready = Hijau Grade A (`#4ade80`), Missing = Merah Grade E (`#ff0000`). | Status kesiapan kurikulum 100% konsisten dan intuitif. |
| **Tipografi Test Blueprint** | Header & teks bernilai 10px / 10.5px. | Standarisasi minimum 11px (Header 11–12px bold). | Menghilangkan pelanggaran sub-11px. Nyaman dibaca tanpa menyipitkan mata. |
| **Kontras Teks Grid** | Semua teks kolom berwarna `#ffffff` polos. | Hierarki warna: `LEX-CD` (#38bdf8), `TOPIC` (#94a3b8), `INDO` (#cbd5e1), `ENG` (#ffffff). | Mata pengguna langsung fokus pada teks utama; pemindaian mata jauh lebih cepat. |
| **Breakdown Theme Manager** | Angka `0` sama terangnya dengan angka `20`. | Angka `0` diredam (`#334155`), angka $> 0$ cerah. | Distribusi kata per topik terbaca instan seperti *heatmap* tanpa polusi visual. |
| **Lebar Kolom Blueprint & Theme Manager** | `TOPIC NAME` tertekan ke 67px & 93px (terpotong elipsis / clipping). | Alokasi `<colgroup>` baku: Blueprint 240px+, Theme Manager 260px+. | Judul topik panjang tampil 100% utuh tanpa pemotongan teks. |

---

## 6. Proposed Changes

### Component: `js/admin/vocab-vault.js`

#### [MODIFY] `js/admin/vocab-vault.js`
1. **Perbaikan Geometri Tabel via `<colgroup>`**:
   - Pasang `<colgroup>` pada `#theme-manager-flat-table` (19 kolom teralokasi presisi, `TOPIC NAME: min-width: 260px; width: auto;`).
   - Pasang `<colgroup>` pada `#blueprint-matrix-table` (13 kolom teralokasi presisi, `Topic Name: min-width: 240px; width: auto;`).
   - Pasang `<colgroup>` pada `#vault-table` (`LEX-CD: 85px`, `THEME: 140px`, `TOPIC: 180px`, `TYPE: 80px`, `INDONESIAN: 30%`, `ENGLISH: 35%`).
2. **Interactive Column Sorting & LEX-CD Attachment**:
   - Tempelkan `w.lex_code = lexCode` pada setiap butir kata.
   - Tambahkan state `currentSort = { col: 'lex_code', dir: 'asc' }`.
   - Pasang click handler pada `<th>` dengan indikator panah (▲ / ▼).
   - Dukung komparasi alfanumerik `localeCompare(..., { numeric: true })` untuk `lex_code`.
3. **Penyempurnaan Warna Teks Murni Spektrum Biru Sistem**:
   - Terapkan `getVaultTypeColor()` dengan nilai murni spektrum biru (`#38bdf8`, `#60a5fa`, `#818cf8`, `#93c5fd`, `#a5b4fc`).
   - Standarisasi `Exam Status` Ready ke Hijau Grade A (`#4ade80`).
   - Terapkan kontras: `INDONESIAN` `#cbd5e1`, `ENGLISH` `#ffffff` tebal, `THEME/TOPIC` `#94a3b8`.
   - Terapkan *Zero-Dimming* pada sel breakdown angka Theme Manager (`0` = `#334155`, $>0$ = cerah).
4. **Perbaikan Tipografi Sub-11px**:
   - Naikkan seluruh font 10px dan 10.5px di Test Blueprint menjadi standar 11px/12px.
5. **Pencarian & Filter Dinamis**:
   - Tambahkan `w.lex_code` pada filter pencarian `#vault-search`.
   - Jadikan dropdown program dinamis dari `window._vaultMeta.programs`.
   - Dinamiskan empty state `colspan` (6 saat Edit Mode OFF, 7 saat ON).

---

## 7. Verification Plan

### Automated Tests
Jalankan pengujian Playwright komprehensif menggunakan:
```powershell
node scripts/verify_vault_sorting_and_all_truncation.mjs
```

Pemeriksaan otomatis meliputi:
1. **Interactive Sort Assertion**:
   - Verifikasi default sort adalah `LEX-CD` Ascending (`1G1-W01` $\rightarrow$ `2A1-W01` $\rightarrow$ `3D1-W01`).
   - Klik `LEX-CD` $\rightarrow$ Verifikasi urutan beralih ke Descending.
   - Klik `ENGLISH` $\rightarrow$ Verifikasi urutan alfabetis A–Z.
2. **Search by LEX-CODE**:
   - Ketik "3D1" $\rightarrow$ Verifikasi hanya koordinat `3D1` yang tampil.
3. **Zero Truncation & Zero Clipping**:
   - Hitung `scrollWidth <= clientWidth` pada topik terpanjang di Blueprint dan Theme Manager.
4. **Pure Blue Spectrum Color & Typography Assertions**:
   - Verifikasi seluruh label `TYPE` (Noun, Verb, Adj, Adv, Proverb, Idiom, Expression) murni menggunakan warna spektrum biru (`#38bdf8`, `#60a5fa`, `#818cf8`, `#93c5fd`, `#a5b4fc`).
   - Verifikasi tidak ada label `TYPE` yang menggunakan `#ff0000`, `--grade-e`, kuning, atau hijau.
   - Verifikasi `Exam Status` Ready menggunakan hijau (`#4ade80`), bukan ungu.
   - Verifikasi tidak ada elemen dengan `font-size < 11px`.
   - Verifikasi angka `0` pada breakdown bertipe muted color (`#334155` / `#475569`).
5. **Visual Screenshots**:
   - Tangkap screenshot live untuk ke-4 tab dan simpan ke direktori brain.
