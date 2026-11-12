# 20261113 — Vocabulary Vault Column Consolidation and Truncation Eradication Plan

> **Document Type:** Master UI & Data Architecture Plan  
> **Authority Level:** Standard TopsCore Plan (AGENTS.md Rule 2.1, Rule 2.20, `.agents/rules/agent-workflow.md`, `.agents/rules/ui-invariants.md`)  
> **Target Files:** `js/admin/vocab-vault.js`, `css/admin.css`  
> **Status:** 📋 PROPOSED — Awaiting Final User Approval (RequestFeedback: true)  

---

## 1. Goal Description & Approved Column Architecture

Sesuai arahan dan keputusan tegas dari pengguna:
1. **Daftar Vocabulary Words & Phrases**:
   - Menghapus seluruh kolom identitas redundant (`INST`, `PROG`, `LVL`, dan `CODE`) yang sebelumnya memakan 263px.
   - Tabel kini **dimulai langsung dari `LEX-CD`** dengan susunan 6 kolom inti yang sangat bersih:
     $$\mathbf{LEX\text{-}CD \;\vert\; THEME \;\vert\; TOPIC \;\vert\; TYPE \;\vert\; INDONESIAN \;\vert\; ENGLISH}$$
     *(ditambah kolom `ACT` hanya saat Edit Mode ON).*
   - **Alasan Teknis:** Kode `LEX-CD` (contoh: `3C2-W01` atau `3C2-P01`) sudah secara cerdas merangkum Level (`3`), Tema (`C`), Topik (`2`), dan ID Butir (`W01`/`P01`), sehingga kolom `INST`, `PROG`, `LVL`, dan `CODE` 100% tidak diperlukan lagi di dalam tabel baris. Filter Program tetap tersedia di panel bawah (`[PROG: ALL]` `[CMP]` `[EVN]` `[SHR]`).
   - **Dampak Positif:** Penghematan **263px** ruang horizontal bersih dialihkan langsung ke kolom `THEME`, `TOPIC`, `INDONESIAN`, dan `ENGLISH`, melenyapkan seluruh masalah teks terpotong (*truncation / ellipsis*).
2. **Theme Manager (Tab 1)**:
   - Menghapus pembatas buatan `max-width: 130px;` pada kolom `TOPIC NAME` dan `max-width: 120px;` pada kolom `THEME`.
   - Mengubah `TOPIC NAME` menjadi kolom fleksibel (`min-width: 240px; width: auto;`).
   - Merampingkan 8 kolom angka breakdown (`VERB`, `NOUN`, `ADJ`, `OTH`, `EXP`, `PRV`, `IDM`, `OTH`) dari 40px menjadi **30px** (menghemat 80px ruang horizontal).
   - Memastikan nama topik panjang seperti *"Review, Evaluation & Final Rehearsal"* dan *"Podcast Evaluation & Collaboration"* tampil utuh 100% tanpa elipsis `...`.
3. **Dynamic Single-Line Guarantee & Hover Tooltip**:
   - Kolom `ENGLISH` diperlebar menjadi `min-width: 360px; width: 35%;`, dan `INDONESIAN` menjadi `min-width: 280px; width: 30%;`.
   - Frasa terpanjang (45+ karakter) tampil lega dalam satu baris. Setiap sel tetap dilengkapi atribut `title="..."` asli untuk aksesibilitas penuh.

---

## 2. Standardized Before & After Comparative Matrix

| Komponen / Properti | 🔴 Kondisi Saat Ini (BEFORE) | 🟢 Target Perubahan (AFTER) | Dasar Aturan / Alasan |
| :--- | :--- | :--- | :--- |
| **Susunan Kolom Grid Words & Phrases (`vault-table`)** | 10 kolom sesak:<br/>`INST` (68px) \| `PROG` (75px) \| `LVL` (55px) \| `CODE` (65px) \| `LEX-CD` (80px) \| `THEME` \| `TOPIC` \| `TYPE` \| `INDONESIAN` \| `ENGLISH` | **Hanya 6 kolom ramping & elegan**:<br/>`LEX-CD` (85px) \| `THEME` (150px) \| `TOPIC` (180px) \| `TYPE` (80px) \| `INDONESIAN` (28%) \| `ENGLISH` (35%) | **Instruksi Tegas Pengguna**: Menghapus `INST`, `PROG`, `LVL`, `CODE`. Memulai langsung dari `LEX-CD`. Menghemat 263px ruang horizontal! |
| **Lebar Kolom ENGLISH (`vault-table`)** | `width: 26%; min-width: 200px;` (terpotong elipsis: `A chain is only as strong as its we...`) | `min-width: 360px; width: 35%;` (tampil penuh 100%: `A chain is only as strong as its weakest link`) | **Zero Truncation Rule**: Frasa idiom terpanjang muat utuh dalam 1 baris tanpa elipsis. |
| **Lebar Kolom INDONESIAN (`vault-table`)** | `width: 26%; min-width: 200px;` | `min-width: 280px; width: 30%;` | Teks terjemahan bahasa Indonesia tampil lega dan jelas. |
| **Header TOPIC NAME (`theme-manager-flat-table`)** | `max-width: 130px;` (terpotong elipsis pada topik >3 kata) | `min-width: 240px; width: auto;` (tanpa pembatas max-width) | **Gambar 4 Diagnostic**: Membebaskan nama topik dari artificial ceiling. |
| **Header THEME (`theme-manager-flat-table`)** | `max-width: 120px;` | `min-width: 150px; width: auto;` | Mencegah elipsis pada nama tema. |
| **8 Kolom Breakdown Angka (`WORDS & PHRASES`)** | `width: 40px;` per kolom (total 320px) | `width: 30px;` per kolom (total 240px) | Menghemat 80px ruang horizontal tanpa mengurangi keterbacaan angka 2 digit. |

---

## 3. Visual Pre-Flight Verification

### Current State (Before) — Screenshot User
![Gambar 1 - Redundant Columns](C:/Users/Top/.gemini/antigravity/brain/f9f716d8-bd46-4f6b-a01d-ba72e36526ff/.user_uploaded/media_1794501141010_0c452b5f.png)
![Gambar 2 - Truncated Phrases](C:/Users/Top/.gemini/antigravity/brain/f9f716d8-bd46-4f6b-a01d-ba72e36526ff/.user_uploaded/media_1794501160474_245107d5.jpg)
![Gambar 4 - Truncated Topic Names](C:/Users/Top/.gemini/antigravity/brain/f9f716d8-bd46-4f6b-a01d-ba72e36526ff/.user_uploaded/media_1794501232345_d2400ea5.jpg)

---

### Proposed Visual Layout (After Changes)

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ TAB PHRASES & IDIOMS / VOCABULARY WORDS (APPROVED 6-COLUMN MASTER ARCHITECTURE)                              │
├─────────┬──────────────────────┬─────────────────────────┬───────────┬──────────────────┬────────────────────┤
│ LEX-CD  │ THEME                │ TOPIC                   │ TYPE      │ INDONESIAN       │ ENGLISH (FULL)     │
├─────────┼──────────────────────┼─────────────────────────┼───────────┼──────────────────┼────────────────────┤
│ 3C2-P01 │ CCU                  │ Family & Community      │ Proverb   │ Kekuatan kelo... │ A chain is only    │
│         │                      │                         │           │                  │ as strong as its   │
│         │                      │                         │           │                  │ weakest link ✨    │
│ 3C2-P02 │ CCU                  │ Family & Community      │ Proverb   │ Kebersamaan d... │ A family that eats │
│         │                      │                         │           │                  │ together stays     │
│         │                      │                         │           │                  │ together ✨        │
│ 3C4-P03 │ CCU                  │ Clothing & Food         │ Proverb   │ Tindakan lebih.. │ Actions speak      │
│         │                      │                         │           │                  │ louder than        │
│         │                      │                         │           │                  │ words ✨           │
└─────────┴──────────────────────┴─────────────────────────┴───────────┴──────────────────┴────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ THEME MANAGER (EXPANDED TOPIC NAME, LEAN BREAKDOWN COLUMNS)                                                  │
├─────┬───────┬─────────────────────────┬───────┬──────────────────────────────────────────┬──────┬───┬───┬────────┤
│ LVL │ TH-CD │ THEME                   │ TP-CD │ TOPIC NAME (100% FULL TEXT)              │ CODE │VRB│NN │TOT ... │
├─────┼───────┼─────────────────────────┼───────┼──────────────────────────────────────────┼──────┼───┼───┼────────┤
│ 2ND │ D     │ Cooking                 │ 4     │ Review, Evaluation & Final Rehearsal ✨   │ 2D4  │20 │10 │ 40     │
│ 2ND │ B     │ Podcast                 │ 4     │ Podcast Evaluation & Collaboration ✨     │ 2B4  │20 │10 │ 40     │
│ 2ND │ C     │ Shopping                │ 4     │ Budgeting & Trip Planning ✨              │ 2C4  │20 │10 │ 40     │
│ 3RD │ C     │ CCU                     │ 4     │ Clothing, Food, Music & Performance ✨    │ 3C4  │20 │10 │ 40     │
│ 3RD │ D     │ High-Frequency          │ 4     │ Strategy, Solutions & Expressions ✨      │ 3D4  │20 │10 │ 40     │
└─────┴───────┴─────────────────────────┴───────┴──────────────────────────────────────────┴──────┴───┴───┴────────┘
```

---

## 4. Technical Implementation Steps

### Phase 1: Update Grid Thead & Tbody (`js/admin/vocab-vault.js`)
1. **Thead Update**:
   - Hapus `INST`, `PROG`, `LVL`, dan `CODE` `<th>` elements.
   - Kolom pertama: `<th title="Lexicon Coordinate Code">LEX-CD</th>` (`width: 85px;`).
   - Perlebar `THEME` (`min-width: 150px;`), `TOPIC` (`min-width: 180px;`).
   - Perlebar `INDONESIAN` (`min-width: 280px; width: 30%;`).
   - Perlebar `ENGLISH` (`min-width: 360px; width: 35%;`).
2. **Tbody Row Template**:
   - Hapus `<td>` untuk INST, PROG, LVL, dan CODE.
   - Awali baris langsung dengan `<td>` untuk `LEX-CD` (`.col-vault-lexicon-code`).
   - Pastikan edit mode input handlers dan duplicate checkers tetap berfungsi mulus dengan `data-id` pada setiap sel.
   - Sesuaikan `colspan` pada empty state row dari 11 menjadi 6 (atau 7 saat Edit Mode).

### Phase 2: Update Theme Manager Widths (`js/admin/vocab-vault.js`)
1. **Thead Update**:
   - Hapus `max-width: 120px;` pada kolom `THEME`, ganti dengan `min-width: 140px;`.
   - Hapus `max-width: 130px;` pada kolom `TOPIC NAME`, ganti dengan `min-width: 240px; width: auto;`.
   - Ubah lebar kolom angka breakdown (`VERB`, `NOUN`, `ADJ`, `OTH`, `EXP`, `PRV`, `IDM`, `OTH`) dari 40px menjadi `width: 30px;`.
2. **Tbody Update**:
   - Pastikan sel `TOPIC NAME` dan `THEME` tidak mewarisi `max-width` inline.

### Phase 3: Automated Verification Suite (`scripts/verify_no_vault_truncation.mjs`)
- Menguji via Playwright di resolusi 1440×900:
  - Assert bahwa `INST`, `PROG`, `LVL`, `CODE` sudah tidak ada di thead/tbody grid.
  - Assert bahwa kolom pertama adalah `LEX-CD`.
  - Assert bahwa teks idiom terpanjang (`A chain is only as strong as its weakest link`) tidak terpotong (`scrollWidth <= clientWidth`).
  - Assert bahwa nama topik panjang (`Review, Evaluation & Final Rehearsal`) tampil 100% penuh tanpa elipsis `...`.
  - Capture visual artifact.
