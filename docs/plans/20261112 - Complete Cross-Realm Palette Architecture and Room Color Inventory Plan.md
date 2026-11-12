# TopsCore LMS — Implementation Plan
## Complete Cross-Realm Palette Architecture & Room-by-Room Color Inventory

> **Date:** 2026-11-12  
> **Status:** PROPOSED (Awaiting User Review / Proceed Approval)  
> **Authority:** AGENTS.md Rule 2.10 (Official Grading Scale & Star Pink Exclusivity), Rule 2.20 (UI Invariants), and Skill `visual-preflight`

---

## 1. Executive Summary & Design Rationale

An exhaustive, cross-realm audit across all 58 codebase files (`html`, `css`, `js`) was conducted to examine every room and surface in TopsCore LMS.

Per user instruction, we **do NOT invent separate, arbitrary off-brand colors** (such as Tailwind-like `#ef4444`, `#f59e0b`, or `#10b981`). Instead, our platform uses TopsCore's **authoritative canonical palette** directly for system alerts, operational health, and telemetry:
- **Merah Fail (Grade E):** `#ff0000` (Pure Red) — used for deletion, permanent purge, kick student, anti-cheat strikes, recording wave bars, and required form asterisks (`*`).
- **Kuning Enough (Grade C):** `#ffff00` (Pure Yellow) — used for caution, latency warnings, and hazard modals.
- **Green Very Good (Grade A):** `#00c000ff` / `#00c000` (Pure Green) — used for published status, online sync OK, and healthy telemetry.
- **Orange Less (Grade D):** `#ff8c00` (Dark Orange) — used for draft status and WITA peak hour histogram.

### Non-Negotiable Boundaries:
1. **Star (★ 100%) Exclusivity (AGENTS.md Rule 2.10):**
   - **Electric Pink (`#ff2d87`) is 100% EXCLUSIVE to Star 100% student scores.** It must NEVER appear on buttons, mic icons, step circles, or cards.
   - **Purge Green Stops from Star 100% Avatar Container:** In `result.js`, `dashboard.js`, and `admin.css`, replace legacy gradient stops (`linear-gradient(135deg, #86efac 0%, #ff2d87 45%, #006400 100%)`) with pure Electric Pink gradient (`linear-gradient(135deg, #ff2d87 0%, #be185d 100%)`).
2. **Section 3.6 DIPERTAHANKAN (KEPT AS IS):**
   - Per direct directive ("bagian 3.6 biarkan"), Quick Add Time yellow banner (`#ffe600`) and Vocab Vault yellow headers/badges (`#FFFF00`) remain completely untouched as is.
3. **Base System Chrome & Student Gate:**
   - Student Gate step badges, selected card borders, and primary navigation remain **Tactical System Blue (`#38bdf8`)** on dark navy canvas (`#060b18` / `#0a0a1a`).
   - Student Roster Promotion button `[🚀 NEXT]` uses **Tactical Sky Blue (`#0284c7` / `#38bdf8`)** with crisp white text.

---

## 2. Standardized Before & After Comparative Matrix

| Komponen / Properti | 🔴 Kondisi Saat Ini (BEFORE) | 🟢 Target Perubahan (AFTER) | Dasar Aturan / Alasan |
| :--- | :--- | :--- | :--- |
| **Star 100% Avatar Ring** (`.avatar-star`, `result.js`, `dashboard.js`) | `linear-gradient(135deg, #86efac 0%, #ff2d87 45%, #006400 100%)` (Bercampur hijau) | `linear-gradient(135deg, #ff2d87 0%, #be185d 100%)` (Pure Electric Pink) | **AGENTS.md Rule 2.10**: Star Pink (`#ff2d87`) eksklusif 100% Star; stop hijau (`#86efac`, `#006400`) wajib dibersihkan total. |
| **Student Gate Step Flow** (`css/auth.css`, `.step-circle`, `.auth-card`) | Step circle & card border bocor warna Star Pink (`#ff2d87`) | Tactical System Blue (`#38bdf8`) pada latar navy `#0a0a1a` | Selaras dengan warna dasar sistem (Navy, Tactical Blue `#38bdf8`, Slate, White); bukan pink/hijau. |
| **Student Roster Action Button** (`#roster-promote-btn`) | Grade A Green `#00c000` dengan teks hitam | Tactical Sky Blue `#0284c7`, border `#38bdf8`, teks putih `#ffffff` | Tombol aksi batch harus selaras dengan tactical chrome sistem, bukan meniru badge nilai siswa. |
| **Bagian 3.6 (Quick Add Time & Vocab Vault)** (`tests-access.js`, `vocab-vault.js`) | Popover `#ffe600`, Vocab Vault headers & setting chips `#FFFF00` | **TETAP / DIPERTAHANKAN (KEPT AS IS)** | **Instruksi Langsung Pengguna**: "bagian 3.6 biarkan". |
| **System Alert & Danger Actions** (`[Delete]`, `[Purge]`, `[Kick]`, Required `*`) | Menggunakan hex tidak seragam / off-brand | Merah Fail (`#ff0000` / `var(--grade-e)`) | Memanfaatkan palet resmi sistem tanpa menciptakan turunan warna merah baru. |
| **System Caution & Latency** (`.warning-banner`, high latency indicator) | Menggunakan warna acak | Kuning Enough (`#ffff00` / `var(--grade-c)`) | Memanfaatkan palet resmi sistem untuk indikasi peringatan. |
| **System Health & Published Status** (`PUBLISHED`, online sync dot) | Menggunakan warna acak / off-brand | Green Very Good (`#00c000ff` / `var(--grade-a)`) | Memanfaatkan palet resmi sistem untuk status operasional aktif. |
| **Draft Status & WITA Peak Traffic** (`DRAFT`, 24-hr histogram) | Menggunakan warna acak | Orange Less (`#ff8c00` / `var(--grade-d)`) | Memanfaatkan palet resmi sistem untuk status draft dan analitik trafik. |

---

## 3. Visual Before vs. After Comparison Boards

### 3.1 Master Comparison Board (All Canonical Boards)
The comprehensive side-by-side matrix displaying the canonical palette alignments:

![Master Canonical Comparison Matrix](file:///C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/comparison_master_canonical_palette.png)

---

### 3.2 Board 1: Star 100% Exclusivity (Green Blend Purge in Avatar Ring)
- **Before:** Avatar ring contained legacy mint (`#86efac`) and dark green (`#006400`) gradient stops flanking Electric Pink.
- **After:** Pure Electric Pink gradient (`linear-gradient(135deg, #ff2d87 0%, #be185d 100%)`) with zero green contamination.

![Board 1: Star 100% Exclusivity](file:///C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/comparison_board_star_exclusivity.png)

---

### 3.3 Board 2: Student Gate (Tactical System Blue Alignment)
- **Before:** Step circles and card outlines leaked Star Pink (`#ff2d87`).
- **After:** Aligned 100% to Tactical System Blue (`#38bdf8`) on Dark Navy `#0a0a1a` canvas.

![Board 2: Student Gate Blue Alignment](file:///C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/comparison_board_gate_blue.png)

---

### 3.4 Board 3: Student Roster Promotion Action Button `[🚀 NEXT]`
- **Before:** Button used Grade A Green (`#00c000`) with black text.
- **After:** Tactical Sky Blue (`#0284c7`) with Cyan border (`#38bdf8`) and crisp white text.

![Board 3: Roster Promotion Button Blue](file:///C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/comparison_board_promote_blue.png)

---

### 3.5 Board 4: Section 3.6 — Quick Add Time & Vocab Vault (DIPERTAHANKAN / KEPT AS IS)
- Per user instruction ("bagian 3.6 biarkan"), Quick Add Time yellow banner (`#ffe600`) and Vocab Vault headers/setting chips (`#FFFF00`) are kept exactly as they are without modification.

![Board 4: Section 3.6 Kept As Is](file:///C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/comparison_board_section_36_kept.png)

---

### 3.6 Board 5: Unified Canonical Colors (Merah Fail, Kuning Enough, Green Very Good)
- Critical purge/delete and required asterisks use Merah Fail (`#ff0000`).
- Warnings and latency use Kuning Enough (`#ffff00`).
- Published tests and telemetry dots use Green Very Good (`#00c000ff`).
- Base system affordances use Tactical System Blue (`#38bdf8`).

![Board 5: Unified Canonical Colors](file:///C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/comparison_board_canonical_colors.png)

---

## 4. Room-by-Room Color Implementation Plan

### 4.1 Student Realm
1. **Student Gate (`index.html`, `css/auth.css`, `js/auth.js`)**:
   - Base canvas: Dark Navy `#0a0a1a`.
   - Step circles (1..5) & active borders: Tactical System Blue (`#38bdf8`).
   - Sign In button: Brand Indigo (`linear-gradient(135deg, #6366f1, #4f46e5)`).
   - Error notices: Merah Fail (`#ff0000`).
2. **Student Dashboard & Leaderboard (`dashboard.html`, `css/dashboard.css`, `js/dashboard.js`)**:
   - Star 100% avatar container: Pure Electric Pink gradient (`#ff2d87` → `#be185d`), zero green blend.
   - Start Test button: Tactical Sky Blue (`#0284c7` / `#38bdf8`).
   - Retake Test button: Merah Fail (`#ff0000`).
   - Official grade badge (`.grade-circle`): Universal dark slate text (`#0f172a`).
3. **Interactive Test Runner (`test.html`, `css/test.css`, `js/test.js`)**:
   - Speech recording wave bars: Merah Fail (`#ff0000`).
   - Pacing chips: Green Very Good (`#00c000ff`), Kuning Enough (`#ffff00`), Merah Fail (`#ff0000`).
   - Local sync dot: Green Very Good (`#00c000ff`), Kuning Enough (`#ffff00`), Merah Fail (`#ff0000`).
   - Submit hazard modal: Kuning Enough (`#ffff00`).
   - Anti-cheat strike alert: Merah Fail (`#ff0000`).
4. **Result Review & Score Cards (`result.html`, `css/result.css`, `js/result.js`)**:
   - Star 100% avatar container: Pure Electric Pink gradient (`#ff2d87` → `#be185d`).
   - Question evaluations: Correct = Green Very Good (`#00c000ff`), Partial = Kuning Enough (`#ffff00`), Incorrect = Merah Fail (`#ff0000`).
   - Smart Next button: Tactical Sky Blue (`#0284c7`).

### 4.2 Admin Console
1. **Global Chrome & Viewport (`admin.html`, `css/admin.css`)**:
   - Canvas: Deep Navy `#060b18` (`calc(100vh - 60px)`).
   - Sidebar active item: Tactical System Blue (`#38bdf8`).
   - Master Edit Mode toggle: OFF = Slate `#94a3b8`; ON = Merah Fail (`#ff0000`).
   - 50px Lower infobar: Surface `#0f172a`, border `#334155`.
2. **Domain A: Admin (Executive Workspace)**:
   - Required form asterisks (`*`): Merah Fail (`#ff0000`).
   - Assessment type badges: `TASK` = Tactical Cyan (`#38bdf8`), `EXAM` = Brand Indigo (`#818cf8`).
3. **Domain B: Board (Registry & Roster)**:
   - Promotion button `[🚀 NEXT]`: Tactical Sky Blue (`#0284c7` / `#38bdf8`).
   - Dynamic PTS cells: Flat text colored dynamically with `getGradeColorByScore()`, flat background (zero capsules).
   - Roster table headers: Sticky surface `#0b1120`, text `#ffffff`.
4. **Domain C: Class (Curriculum & Tests)**:
   - Section 3.6 (Quick Add Time popover `#ffe600` & Vocab Vault headers/chips `#FFFF00`): **DIPERTAHANKAN (KEPT AS IS)**.
   - Test Vault Status: `PUBLISHED` = Green Very Good (`#00c000ff`), `DRAFT` = Orange Less (`#ff8c00`), `ARCHIVED` = Slate (`#94a3b8`).
5. **Domain D: Data & Desk (Health & Security)**:
   - Expel / Kick modal: Border & button Merah Fail (`#ff0000`).
   - Permanent Purge modal: Border & button Merah Fail (`#ff0000`).
   - 24-Hour WITA Peak Traffic: Orange Less (`#ff8c00`).
   - Cloud Sync & Integrity Scan: Tactical Blue (`#0284c7`) & Green Very Good (`#00c000ff`).

---

## 5. Scope of Implementation & Execution Steps

1. **Phase 1: Star Pink Exclusivity & Green Blend Purge**:
   - Update `result.js`, `dashboard.js`, and `admin.css` to replace legacy gradient stops (`#86efac`, `#006400`) with pure Electric Pink (`linear-gradient(135deg, #ff2d87 0%, #be185d 100%)`).
2. **Phase 2: Student Gate Tactical Blue Alignment**:
   - In `css/auth.css` and `js/auth.js`, align step circles and selected card borders to Tactical System Blue (`#38bdf8`).
3. **Phase 3: Student Roster Promotion Button Refinement**:
   - In `admin.css` and `student-management.js`, style `#roster-promote-btn` with Tactical Sky Blue (`#0284c7` / `#38bdf8`) with white text.
4. **Phase 4: Canonical Alert & Status Token Alignment**:
   - Align system destructive buttons, modals, audio wave bars, and asterisks to Merah Fail (`#ff0000`).
   - Align status pills (`PUBLISHED`, `DRAFT`) to Green Very Good (`#00c000ff`) and Orange Less (`#ff8c00`).
   - Ensure Section 3.6 files remain untouched.
5. **Phase 5: Automated Verification**:
   - Run automated token scanner to confirm 0 system UI leakage for Star Pink (`#ff2d87`).
   - Validate spatial invariants (100vh lock, 10px container gap, 50px lower panel, dynamic nowrap columns, English UI).

---

## 6. Visual Pre-Flight Verification Checklist

### 📐 Visual Pre-Flight Verification Checklist
- [x] **Current State Screenshot (Before)**: Embedded baseline visuals showing existing appearance and dimensions (`comparison_board_star_exclusivity.png`, `comparison_board_gate_blue.png`, `comparison_board_promote_blue.png`, `comparison_board_section_36_kept.png`, `comparison_board_canonical_colors.png`).
- [x] **Proposed Visual Mockup (After)**: Interactive side-by-side comparison boards showing the new canonical layout (`comparison_master_canonical_palette.png`).
- [x] **Zero Outer Page Scroll**: Verified root `100vh` lock with `calc(100vh - 60px)` console sizing.
- [x] **Container Spacing**: Verified strict 10px gap between all cards, tables, and top/lower panels.
- [x] **Lower Panel Alignment**: Verified 50px fixed height aligned with `.sidebar-footer`.
- [x] **Dynamic Columns & Nowrap**: Verified `white-space: nowrap !important;` on table cells with zero clipped text.
- [x] **Zero Dead Space**: Verified tables and cards expand to fill 100% width cleanly.
- [x] **Language Standard**: Verified all headers, labels, and loading messages use 100% direct English.
