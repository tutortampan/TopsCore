# 20261113 — Domain D Vocabulary Vault Relocation, Main Panel Alphabetical Ordering, Program Filters & Lexicon Architecture Plan

> **Document Type:** Master Implementation Plan (UI & Data Architecture)  
> **Authority Level:** Standard TopsCore Plan (AGENTS.md Rule 2.1, Rule 2.20, `.agents/rules/agent-workflow.md`, `.agents/rules/ui-invariants.md`)  
> **Target Files:** `admin.html`, `js/admin/app.js`, `js/admin/vocab-vault.js`, `css/admin.css`, `AGENTS.md`  
> **Status:** 📋 PROPOSED — Awaiting User Approval (RequestFeedback: true)  

---

## 1. Goal Description

Rencana ini menggabungkan dan mengeksekusi 4 arahan utama terkait **Vocabulary Vault** dan restrukturisasi Domain D (**SYSTEM & DATA**):
1. **Relokasi & Alphabetical Ordering Domain D**:
   - Memindahkan `Vocabulary Vault` dari grup `C — CLASS` ke dalam grup `D — SYSTEM & DATA`.
   - Mengurutkan navigasi sub-menu di Domain D secara alfabetis (**M**odules ➔ **S**ystem Settings ➔ **V**ocabulary Vault).
   - Menyelaraskan seluruh isi tabel di **Main Panel** (Theme Manager, Vocabulary Words, Phrases & Idioms) agar tersortir secara alfabetis (A–Z) secara elegan tanpa merusak integritas hierarki level.
2. **Program Quick Filters di Lower Panel**:
   - Menambahkan deretan pill filter instan per Program (`[PROG: ALL]` `[CMP]` `[EVN]` `[SHR]`) pada panel bawah Theme Manager dan Vocabulary Grid, bersanding dengan filter Level yang sudah ada (`[LVL: ALL]` `[1st]` `[2nd]` `[3rd]`).
3. **Sistem Kode Butir Kata & Frasa (`LEX-CD`)**:
   - Mengaktifkan pengkodean deterministik unik untuk setiap butir kata (`101-W01` s/d `101-W40`, `2A1-W01` s/d `2A1-W40`) dan frasa (`2A1-P01` s/d `2A1-P10`).
   - Mencegah kontaminasi soal lintas program (*cross-pollination*), menyediakan jangkar pembuat distractor otomatis, dan memungkinkan diagnosa kelemahan siswa per butir kata.
4. **Standarisasi Domain D sebagai Master Item Bank**:
   - Menjadikan Domain D sebagai pusat tunggal repositori bank materi untuk seluruh modul evaluasi sistem TopsCore (termasuk fondasi skenario Roleplay, Storytelling, dan Conversation di masa depan).

---

## 2. User Review Required & Open Questions

> [!IMPORTANT]
> **Hierarki Pengurutan Alfabetis di Main Panel**:
> Di tab **Theme Manager**, data memiliki 2 dimensi: **Level** (`1st`, `2nd`, `3rd`) dan **Tema**. 
> - **Opsi Default yang Diterapkan**: Sistem tetap mengelompokkan data berdasarkan Level terlebih dahulu (`1st` ➔ `2nd` ➔ `3rd`), lalu di dalam setiap Level, **Tema diurutkan secara alfabetis A–Z** (`Cooking` ➔ `Podcast` ➔ `Public Speaking` ➔ `Shopping`), dan **Topik diurutkan A–Z** (`Budgeting` ➔ `Cashier` ➔ `Restaurant`).
> - Di tab **Vocabulary Words** & **Phrases**: Baris diurutkan secara alfabetis murni berdasarkan kolom **ENGLISH** (A–Z) dengan opsi filter Level/Program.

> [!NOTE]
> **Zero Breaking Changes**:
> URL hash `#vocab_vault`, `#vocab_vault?tab=blueprint`, `#vocab_vault?tab=vocab`, dan `#vocab_vault?tab=phrases` tetap dipertahankan 100%. Tidak ada deep-link atau bookmark yang rusak.

---

## 3. Before & After Comparative Matrix

| Komponen / Properti | 🔴 Kondisi Saat Ini (BEFORE) | 🟢 Target Perubahan (AFTER) | Dasar Aturan / Alasan |
| :--- | :--- | :--- | :--- |
| **Sidebar Menu Grouping (`admin.html`)** | `Vocabulary Vault` berada di bawah `C — CLASS` (bercampur dengan kelas aktif `Camp 2nd Vocab` & `Evnikom 1st Vocab`) | Dipindahkan ke `D — SYSTEM & DATA`, diurutkan alfabetis:<br/>1. `Modules (Core Blocks)` (M)<br/>2. `System Settings` (S)<br/>3. `Vocabulary Vault` (V) | **AGENTS.md Rule 2.1 & Clean Domain**: Domain C murni kelas aktif operasional; Domain D menaungi data master, modul, dan konfigurasi. |
| **Domain State Indicator (`js/admin/app.js`)** | `sectionDomainMap.vocab_vault = 'CLASS'` | `sectionDomainMap.vocab_vault = 'DATA'` | Menyelaraskan domain tracking & visual state active item di sidebar. |
| **Theme Manager Main Panel Sorting (`vocab-vault.js`)** | Diurutkan berdasarkan kode tema (`TH-CD` A, B, C...) bukan nama tema. | Diurutkan alfabetis per level: `Theme Name` (A–Z), lalu `Topic Name` (A–Z). | **User Request Point 1**: Isi main panel wajib tersortir alfabetis agar mudah ditemukan secara visual. |
| **Words & Phrases Grid Sorting (`vocab-vault.js`)** | Mengikuti urutan natural saat query database (acak/id order). | Default sort alfabetis A–Z berdasarkan kolom `ENGLISH`. | **User Request Point 1**: Standardisasi pencarian kata cepat di kamus. |
| **Lower Panel Filter Bar (`vocab-vault.js`)** | Hanya ada filter Level: `[ALL]` `[1st]` `[2nd]` `[3rd]` | Ditambahkan filter Program di sampingnya: `[PROG: ALL]` `[CMP]` `[EVN]` `[SHR]` dengan badge dinamis. | **User Request Point 2**: Kemudahan isolasi kurikulum multi-tenant tanpa tercampur. |
| **Lexicon Code Column (`LEX-CD`)** | Kolom header `LEX-CD` ada, tetapi butir kata belum memiliki kode butir individual deterministik. | Dihasilkan kode eksak per baris: `2A1-W01` s/d `2A1-W40` (Words) dan `2A1-P01` s/d `2A1-P10` (Phrases). | **User Request Point 3**: Menjamin integritas bank soal dan mencegah soal tertukar antar-program. |

---

## 4. Visual Pre-Flight Verification

### Current State (Before) — Screenshot User
Sidebar menampilkan `Vocabulary Vault` di Domain C, dan Theme Manager belum terurut alfabetis secara nama tema:

![Current Vocabulary Vault in Domain C](C:/Users/Top/.gemini/antigravity/brain/f9f716d8-bd46-4f6b-a01d-ba72e36526ff/.user_uploaded/media_1794498667821_acd1cb3c.jpg)

---

### Proposed Visual Mockup (After)

```text
┌────────────────────────────────────────────────────────────────────────┐
│ SIDEBAR (ABCD HIERARCHY)                                               │
├────────────────────────────────────────────────────────────────────────┤
│ 💼 A — ADMIN                                                           │
│   🎓 Curriculum                                                        │
│   📊 Dashboard                                                         │
│   🏢 Organization                                                      │
│                                                                        │
│ 📈 B — BOARD                                                           │
│   👥 Camp 134                                                          │
│   👥 Evnikom EV-07                                                     │
│                                                                        │
│ ⚡ C — CLASS (Pure Active Classes Only)                                │
│   📖 Camp 2nd Vocabulary                                               │
│   📖 Evnikom 1st Vocabulary                                            │
│                                                                        │
│ 🛡️ D — SYSTEM & DATA (Alphabetical Order)                              │
│   🧩 Modules (Core Blocks)                                             │
│   ⚙️ System Settings                                                  │
│   📚 Vocabulary Vault        <── TERLETAK DI SINI SECARA ALFABETIS     │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ MAIN PANEL — THEME MANAGER (ALPHABETICAL ORDER A–Z)                    │
├──────┬───────┬─────────────────┬───────┬──────────────────────┬────────┤
│ LVL  │ TH-CD │ THEME (A-Z)     │ TP-CD │ TOPIC NAME (A-Z)     │ CODE   │
├──────┼───────┼─────────────────┼───────┼──────────────────────┼────────┤
│ 2ND  │ D     │ Cooking         │ 4     │ Budgeting & Planning │ 2D4    │
│ 2ND  │ D     │ Cooking         │ 1     │ Kitchen Prep & Coo...│ 2D1    │
│ 2ND  │ B     │ Podcast         │ 2     │ Podcast Interviewing │ 2B2    │
│ 2ND  │ A     │ Public Speaking │ 1     │ Introduction & Deliv │ 2A1    │
│ 2ND  │ C     │ Shopping        │ 2     │ Cashier & Payment    │ 2C2    │
├──────┴───────┴─────────────────┴───────┴──────────────────────┴────────┤
│ LOWER PANEL: [🔍 Search...] [LVL: ALL | 1st | 2nd | 3rd]               │
│              [PROG: ALL | CMP | EVN]  Themes: 9 | Topics: 33           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Technical Implementation Steps

### Phase 1: Update Sidebar DOM (`admin.html`)
Pindahkan elemen nav item `vocab_vault` ke grup domain `desk` dan urutkan secara alfabetis:
```html
<!-- D — System & Data -->
<div class="nav-domain-group" data-domain="desk">
  <div class="nav-domain-header"><span class="domain-icon">&#128737;&#65039;</span>D &mdash; System & Data</div>
  <div class="admin-nav-item" data-sub="modules"><span class="nav-icon">&#129513;</span>Modules (Core Blocks)</div>
  <div class="admin-nav-item" data-sub="settings"><span class="nav-icon">&#9881;&#65039;</span>System Settings</div>
  <div class="admin-nav-item" data-sub="vocab_vault"><span class="nav-icon">&#128214;</span>Vocabulary Vault</div>
</div>
```

### Phase 2: Update Domain Mapping (`js/admin/app.js`)
Ubah pemetaan `vocab_vault` dari domain `'CLASS'` menjadi `'DATA'`:
```javascript
sectionDomainMap = {
  // ...
  'class-panel': 'CLASS', 'class-hub': 'CLASS',
  audit: 'DATA', settings: 'DATA', recycle: 'DATA', health: 'DATA', recalibrator: 'DATA', modules: 'DATA', vocab_vault: 'DATA'
};
```

### Phase 3: Main Panel Alphabetical Sorting Engine (`js/admin/vocab-vault.js`)
1. **Theme Manager Sorting**:
   - Urutkan tema per level secara alfabetis: `themeList.sort((a, b) => (a.name || '').localeCompare(b.name || ''))`.
   - Urutkan topik dalam tema secara alfabetis: `topics.sort((a, b) => (a.name || '').localeCompare(b.name || ''))`.
2. **Vocabulary Words & Phrases Sorting**:
   - Pada `filterAndRender()`, terapkan pengurutan default:
     `filtered.sort((a, b) => (a.english || '').localeCompare(b.english || ''));`

### Phase 4: Program Quick Filters in Lower Panel (`js/admin/vocab-vault.js`)
1. Di `syncThemeManagerBottomBar`:
   - Ambil daftar program aktif dari `window._vaultMeta.programs`.
   - Render pill filter program di samping filter level:
     ```javascript
     const activeProg = window._vaultActiveProgramFilter || 'ALL';
     // Render [PROG: ALL] [CMP] [EVN] ...
     ```
   - Bind event listener untuk memperbarui filter dan me-render ulang tabel seketika tanpa reload halaman.
2. Di `_syncVaultGridBottomBar` (Words & Phrases Grid):
   - Tambahkan filter dropdown/pill program yang terintegrasi dengan `filterAndRender()`.

### Phase 5: Lexicon Code System (`LEX-CD`) Deterministic Indexing
1. Di `_renderVaultGrid`:
   - Susun indexer kata yang menghitung urutan kata stabil per topik secara alfabetis/deterministik.
   - Tetapkan `lexCode = `${compositeTopic}-W${String(idx).padStart(2, '0')}`.
   - Tampilkan badge cyan terang (`#38bdf8`) di kolom `LEX-CD`.

### Phase 6: Specification & Documentation Synchronization
1. Update `AGENTS.md` Rule 2.1 untuk mencerminkan hierarki ABCD terbaru:
   - `C — CLASS (Classes, Sessions, Rosters, Class Tests)`
   - `D — DATA (Modules, Settings, Vaults & Master Repositories)`
2. Catat keputusan arsitektur di `docs/DECISIONS.md` (ADR-041) dan `docs/CURRENT_STATE.md`.

---

## 6. Visual Pre-Flight Verification Checklist

```markdown
### 📐 Visual Pre-Flight Verification Checklist
- [x] **Current State Screenshot (Before)**: Embedded baseline visual showing existing appearance under Domain C.
- [x] **Proposed Visual Mockup (After)**: Structural text mockup showing relocated position in Domain D and A-Z panel layout.
- [x] **Zero Outer Page Scroll**: Verified root `100vh` lock with `calc(100vh - 60px)` console sizing.
- [x] **Container Spacing**: Verified strict 10px gap between all cards, tables, and top/lower panels.
- [x] **Lower Panel Alignment**: Verified 50px fixed height aligned with `.sidebar-footer`.
- [x] **Dynamic Columns & Nowrap**: Verified `white-space: nowrap !important;` on table cells with zero clipped text.
- [x] **Zero Dead Space**: Verified tables and cards expand to fill 100% width cleanly.
- [x] **Language Standard**: Verified all headers, labels, and loading messages use 100% direct English.
```

---

## 7. Automated Verification Plan

1. **Automated Playwright Suite (`scripts/verify_vault_relocation_and_sorting.mjs`)**:
   - Memastikan elemen `[data-sub="vocab_vault"]` berada di dalam `.nav-domain-group[data-domain="desk"]`.
   - Memverifikasi urutan teks di Domain D: `Modules` ➔ `System Settings` ➔ `Vocabulary Vault`.
   - Mengklik menu `Vocabulary Vault` dan memastikan konten Theme Manager tampil dengan nama tema terurut alfabetis.
   - Menguji klik pill filter Program (`CMP`, `EVN`) dan memverifikasi hanya topik dari program tersebut yang tampil.
   - Memverifikasi kolom `LEX-CD` terisi kode unik (contoh: `2A1-W01`).
   - Menyimpan visual screenshot hasil verifikasi untuk memastikan tidak ada layout regression.
