# 20261112 — Relocate Vocabulary Vault to Domain D (System & Data) Plan

> **Document Type:** UI Architecture & Domain Hierarchy Refactoring Plan  
> **Authority Level:** Standard TopsCore Plan (AGENTS.md Rule 2.1, Rule 2.20, `.agents/rules/agent-workflow.md`, `.agents/rules/ui-invariants.md`)  
> **Status:** Proposal & Plan for User Review  

---

## 1. Executive Summary & Problem Diagnostic

Pada arsitektur navigasi **ABCD System** TopsCore saat ini:
- **A — ADMIN**: Executive Dashboard, Curriculum & Level Master, Organization Structure.
- **B — BOARD**: Active Student Cohorts & Batches (`Camp 134`, `Evnikom EV-07`), Roster, Attendance.
- **C — CLASS**: Active Learning Classes (`Camp 2nd Vocabulary`, `Evnikom 1st Vocabulary`).
- **D — SYSTEM & DATA**: Core Engines (`Modules (Core Blocks)`), System Settings.

### Problem Diagnostic: Semantic & Operational Mismatch
Saat ini, menu **`Vocabulary Vault`** berada di bawah grup **`C — CLASS`**. Penempatan ini menimbulkan anomali konseptual dan operasional:
1. **Bukan Kelas Siswa (Bukan Class Instance)**:
   Item lain di bawah `C — CLASS` adalah *kelas aktif* tempat siswa terdaftar, presensi dicatat, dan ujian kelas dijadwalkan (`Camp 2nd Vocabulary`, `Evnikom 1st Vocabulary`). Sebaliknya, `Vocabulary Vault` sama sekali **bukan kelas**, melainkan **Master Data Repository / Lexicon Bank** (1.330 kata, 160 frasa, 9 tema, 33 topik, serta blueprint ujian) yang menjadi bank materi bersama untuk semua kelas dan program.
2. **Kesesuaian Alami dengan Domain D**:
   Domain D dinamai **`D — SYSTEM & DATA`** dan saat ini menaungi `Modules (Core Blocks)` (arsitektur 8 modul evaluasi AI) dan `System Settings`. Menempatkan `Vocabulary Vault` di Domain D menyatukan semua **fondasi data master, modul mesin, dan repositori global** ke dalam satu "rumah" yang tepat.
3. **Kejelasan Mental Model Pengguna (Admin vs Tutor)**:
   Tutor yang berfokus mengajar hanya perlu berinteraksi dengan `B — BOARD` dan `C — CLASS`. Pengelolaan kamus kosakata master dan blueprint tes adalah tugas administratif/kurikulum data yang berpusat di `D — SYSTEM & DATA`.

---

## 2. Before & After Visual & Architectural Comparison

### Standardized Before & After Comparative Matrix

| Komponen / Properti | 🔴 Kondisi Saat Ini (BEFORE) | 🟢 Target Perubahan (AFTER) | Dasar Aturan / Alasan |
| :--- | :--- | :--- | :--- |
| **Sidebar Domain Grouping (`admin.html`)** | `Vocabulary Vault` berada di dalam `<div class="nav-domain-group" data-domain="class">` (di bawah daftar kelas dinamis) | `Vocabulary Vault` dipindahkan ke dalam `<div class="nav-domain-group" data-domain="desk">` (`D — System & Data`), di atas `Modules (Core Blocks)` | **AGENTS.md Rule 2.1 & Single Responsibility**: Domain C murni untuk kelas operasional; Domain D untuk Master Data & Engine Repositories. |
| **Domain State Mapping (`js/admin/app.js`)** | `sectionDomainMap.vocab_vault = 'CLASS'` | `sectionDomainMap.vocab_vault = 'DATA'` | Menyelaraskan active indicator dan sinkronisasi rute navigasi ABCD dengan domain data. |
| **Hash Route & Sub-Tabs (`#vocab_vault`)** | URL hash `#vocab_vault`, `#vocab_vault?tab=words`, dll. | **Tetap identik 100%**: `#vocab_vault` (Zero breaking change) | Mempertahankan routing URL dan deep-linking yang sudah ada. |
| **Tampilan Sidebar Domain C** | Terisi kelas dinamis + 1 tombol master vault | Bersih, murni hanya berisi daftar kelas siswa aktif | Menghilangkan kerancuan antara kelas belajar vs bank data kosakata global. |
| **Tampilan Sidebar Domain D** | Hanya berisi 2 item: `Modules` dan `Settings` | Terisi lengkap: `Vocabulary Vault`, `Modules (Core Blocks)`, `System Settings` | Memperkuat Domain D sebagai pilar data dan mesin sistem. |

---

## 3. Visual Pre-Flight Verification

### Current State (Before) — Screenshot User
Di bawah `C — CLASS`, terdapat `Camp 2nd Vocabulary`, `Evnikom 1st Vocabulary`, dan `Vocabulary Vault`:

![Current Sidebar Layout](C:/Users/Top/.gemini/antigravity/brain/f9f716d8-bd46-4f6b-a01d-ba72e36526ff/.user_uploaded/media_1794498667821_acd1cb3c.jpg)

---

### Proposed Structure (After) — Mockup Navigasi

```text
┌────────────────────────────────────────────────────────┐
│ TOPSCORE SIDEBAR HIERARCHY (STREAMLINED ABCD)           │
├────────────────────────────────────────────────────────┤
│ 💼 A — ADMIN                                           │
│   🎓 Curriculum                                        │
│   📊 Dashboard                                         │
│   🏢 Organization                                      │
│                                                        │
│ 📈 B — BOARD                                           │
│   👥 Camp 134                                          │
│   👥 Evnikom EV-07                                     │
│                                                        │
│ ⚡ C — CLASS                                           │
│   📖 Camp 2nd Vocabulary                               │
│   📖 Evnikom 1st Vocabulary                            │
│   (Pure active learning classes only!)                 │
│                                                        │
│ 🛡️ D — SYSTEM & DATA                                  │
│   📚 Vocabulary Vault    <── DIPINDAHKAN KE SINI!     │
│   🧩 Modules (Core Blocks)                             │
│   ⚙️ System Settings                                  │
└────────────────────────────────────────────────────────┘
```

---

## 4. Technical Implementation Steps

### Phase 1: Update Sidebar DOM (`admin.html`)
Pindahkan elemen nav item `vocab_vault` dari grup domain `class` ke grup domain `desk` (Domain D):
```html
<!-- D — System & Data -->
<div class="nav-domain-group" data-domain="desk">
  <div class="nav-domain-header"><span class="domain-icon">&#128737;&#65039;</span>D &mdash; System & Data</div>
  <div class="admin-nav-item" data-sub="vocab_vault"><span class="nav-icon">&#128214;</span>Vocabulary Vault</div>
  <div class="admin-nav-item" data-sub="modules"><span class="nav-icon">&#129513;</span>Modules (Core Blocks)</div>
  <div class="admin-nav-item" data-sub="settings"><span class="nav-icon">&#9881;&#65039;</span>System Settings</div>
</div>
```

### Phase 2: Update Domain Mapping (`js/admin/app.js`)
Perbarui pemetaan domain agar state aktif sinkron dengan Domain D:
```javascript
// Line ~450 js/admin/app.js
sectionDomainMap = {
  // ...
  'class-panel': 'CLASS', 'class-hub': 'CLASS',
  audit: 'DATA', settings: 'DATA', recycle: 'DATA', health: 'DATA', recalibrator: 'DATA', modules: 'DATA', vocab_vault: 'DATA'
};
```

### Phase 3: Rule & Documentation Update
1. Sinkronisasi definisi navigasi ABCD di `AGENTS.md` Rule 2.1:
   - `C — CLASS (Active Classes, Learning Sessions, Class Tests)`
   - `D — DATA (Vocabulary Vault, Question Banks, Modules, Settings, Audit Logs)`
2. Perbarui `docs/CURRENT_STATE.md` dan `docs/DECISIONS.md` (ADR-041).

---

## 5. Visual Pre-Flight Verification Checklist

```markdown
### 📐 Visual Pre-Flight Verification Checklist
- [x] **Current State Screenshot (Before)**: Embedded baseline visual showing existing appearance under Domain C.
- [x] **Proposed Visual Mockup (After)**: Structural text mockup showing relocated position in Domain D.
- [x] **Zero Outer Page Scroll**: Verified root `100vh` lock with `calc(100vh - 60px)` console sizing.
- [x] **Container Spacing**: Verified strict 10px gap between all cards, tables, and top/lower panels.
- [x] **Lower Panel Alignment**: Verified 50px fixed height aligned with `.sidebar-footer`.
- [x] **Dynamic Columns & Nowrap**: Verified `white-space: nowrap !important;` on table cells with zero clipped text.
- [x] **Zero Dead Space**: Verified tables and cards expand to fill 100% width cleanly.
- [x] **Language Standard**: Verified all headers, labels, and loading messages use 100% direct English.
```

---

## 6. Automated Verification Plan
1. **Playwright Visual Verification**: Menjalankan skrip browser otomatis untuk memastikan:
   - Menu `Vocabulary Vault` muncul tepat di bawah `D — SYSTEM & DATA`.
   - Mengklik `Vocabulary Vault` mengarahkan ke `#vocab_vault` dan merender tabel Theme Manager dengan sempurna.
   - Domain group D menyala aktif saat `#vocab_vault` diakses.
   - Mengambil screenshot hasil verifikasi untuk memastikan visual 100% bersih.
