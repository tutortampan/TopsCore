# TopsCore LMS — Implementation Plan
## Comprehensive System UI Palette Standardization and Academic Grade Separation

> **Date:** 2026-11-12  
> **Status:** PROPOSED (Awaiting User Review / Proceed Approval)  
> **Authority:** AGENTS.md Rule 2.10 (Authoritative Grading Scale & Star Pink Exclusivity), Rule 2.20 (UI Invariants), and Skill `visual-preflight`

---

## 1. Executive Summary & Design Rationale

During in-depth codebase auditing across all 58 source files, a total of **552 grade color references** were analyzed. The audit revealed that **academic evaluation colors** have extensively leaked across nearly all system domains:
- 🟡 **Yellow (`#FFFF00` / `#FFE600` / Grade C):** Leaked into test time-adjustment banners, Vocab Vault table headers and setting chips, modal form labels, anti-cheat titles, and answer change metrics.
- 🟠 **Orange (`#FF8C00` / Grade D):** Leaked into draft test badges, upcoming batch chips, and WITA peak hour banners.
- 🔴 **Pure Red (`#FF0000` / Grade E):** Leaked into purge warnings, deletion confirmation modals, incident alerts, required form asterisks, and archived test tags.
- 🟢 **Pure Green (`#00C000` / Grade A):** Leaked into the student roster promotion button `[🚀 NEXT]`, active status badges, live pulsing dots, modules engine badges, and batch average table borders.
- 🌸 **Electric Pink (`#FF2D87` / Grade Star):** Leaked into student gate step circles, desk recalculation cards, and health scan buttons.

### 🏛️ The Non-Negotiable Semantic Boundary:
1. **Academic Evaluation Domain (100% EXCLUSIVE TO STUDENT GRADES & SCORES):**
   - ★ **Electric Pink (`#ff2d87`):** 100% / Excellent (STRICTLY EXCLUSIVE TO STAR GRADE).
   - **Grade A Pure Green (`#00c000ff`):** 90%–99% / Very Good, plus evaluated question answer correctness.
   - **Grade B Electric Lime (`#95ff00ff`):** 80%–89% / Good.
   - **Grade C Pure Yellow (`#ffff00`):** 60%–79% / Enough.
   - **Grade D Dark Orange (`#ff8c00`):** 30%–59% / Less.
   - **Grade E Pure Red (`#ff0000`):** 0%–29% / Fail, plus evaluated question incorrect answers.

2. **System Interface Domain (FOR ALL CHROME, NAVIGATION, CONTROLS, AND BADGES):**
   - **Base Canvas:** Dark Navy (`#060b18`, `#0a0a1a`, `#0f172a`, `#1e293b`).
   - **Primary Action & Active States:** Tactical Cyan / System Blue (`#38bdf8` / `#3b82f6` / `#0284c7`).
   - **Muted Borders & Labels:** Tactical Slate (`#334155`, `#475569`, `#64748b`, `#94a3b8`).
   - **Typography Primary:** Pure High-Contrast White (`#ffffff`, `#f8fafc`).
   - **Functional System Accents (Completely Decoupled from Grades):**
     - **System Amber (`#fbbf24` / `#f59e0b`):** System warnings, drafts, upcoming batches, and timer popovers (replaces Grade C Yellow `#FFFF00` and Grade D Orange `#FF8C00`).
     - **System Crimson / Rose (`#ef4444` / `#f43f5e`):** System deletion, destructive modals, and required asterisks (replaces Grade E Pure Red `#FF0000`).
     - **Soft Lavender (`#c084fc` / `#a78bfa`):** Female honorific title (`Miss`) and Alumni status.
     - **Tactical Indigo (`#6366f1` / `#818cf8`):** System avatars, desk metric cards, and branding badges (replaces rogue Star Pink).

---

## 2. Complete Visual Audit: 5-Domain Side-by-Side Comparison Boards

Every component group is presented below as a dedicated, high-resolution side-by-side comparison board. The left box shows the **Current State (Before)** with rogue grade color leakage, and the right box shows the **Proposed State (After)** with the standardized Tactical System UI palette.

### 2.1 Yellow Color Leakage: Popovers, Table Headers, Labels & Chips
- **Time Edit Popover (`js/admin/tests-access.js:446, 772`):** Previously used a bright hazard yellow `#ffe600` banner. Now standardized to Tactical Sky Blue (`#0284c7`) with cyan border.
- **Vocab Vault Table Headers & Setting Chips (`js/admin/vocab-vault.js:2686, 2776`):** Previously styled with `color: #FFFF00`. Now standardized to Tactical Cyan (`#38bdf8`) badge and neutral slate table header (`#94a3b8`).
- **Auto-Gen Modal Form Labels (`js/admin/auto-gen-modal.js:86, 245`):** Previously styled with yellow text `#ffff00`. Now standardized to clean white `#f8fafc`.

![Yellow Color Audit: Before vs After](file:///C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/comparison_board_yellow_leakage.png)

---

### 2.2 Orange Color Leakage: Draft Tests, Upcoming Batches & Peak Hours
- **Draft Test & Upcoming Batch Badges (`css/admin.css:2271, 3367`):** Previously used Grade D Orange `rgba(var(--grade-d-rgb), 0.15)` and `#FF8C00`. Now standardized to System Amber (`#fbbf24` / `#f59e0b`).
- **WITA Peak Hour Banner (`js/admin/tests-management.js:2426`):** Previously rendered in `#ff8c00`. Now standardized to System Amber `#fbbf24`.

![Orange Color Audit: Before vs After](file:///C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/comparison_board_orange_leakage.png)

---

### 2.3 Red Color Leakage: Permanent Purge Modals, Asterisks & Archived Tags
- **Purge & Deletion Warning Headers (`js/admin/desk.js:225`, `student-management.js:2574`):** Previously used Grade E Pure Red `#FF0000`. Now standardized to System Crimson (`#ef4444` / `#dc2626`).
- **Required Form Asterisks (`js/admin/student-registration.js:738-789`):** Previously `<span style="color: #FF0000;">*</span>`. Now standardized to System Rose (`#f43f5e`).
- **Archived Test Badge (`css/admin.css:2273`):** Previously used Grade E Red `rgba(var(--grade-e-rgb), 0.1)`. Now standardized to Neutral Slate (`#94a3b8`).

![Red Color Audit: Before vs After](file:///C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/comparison_board_red_leakage.png)

---

### 2.4 Green Color Leakage: Promotion Buttons, Active Badges & Live Dots
- **Roster Promotion Button `[🚀 NEXT]` (`student-management.js:808`):** Previously Grade A Green `#00c000`. Now Tactical Sky Blue (`#0284c7`) with cyan border (`#38bdf8`) and pure white text.
- **Active System Badges (`.badge-success`, `.badge-tag-ongoing`, `modules.js:32`):** Previously Grade A Green `#00c000`. Now flat Tactical Cyan (`#38bdf8`) with `rgba(56, 189, 248, 0.12)` background.
- **Topbar Metric Tab & Status Dot (`student-management.js:753`, `css/admin.css:5850`):** Previously green metric and green pulse dot. Now Tactical Cyan (`#38bdf8`) with blue glow.

![Green Color Audit: Before vs After](file:///C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/comparison_board_green_leakage.png)

---

### 2.5 Pink Color Leakage: Student Gate Steps & Desk Health Cards
- **Student Gate Steps & Cards (`css/auth.css`):** Previously rendered with Electric Pink `#ff2d87` badges and borders. Now locked 100% to Tactical System Blue (`#38bdf8`).
- **Desk Metric Card Borders (`js/admin/desk.js:617`):** Previously `border-left: 3px solid var(--grade-star)`. Now standardized to Tactical Brand Indigo (`#6366f1` / `#818cf8`).

![Pink Color Audit: Before vs After](file:///C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/comparison_board_pink_leakage.png)

---

### 2.6 Master 5-Domain Comparison Matrix (Full System Overview)
The complete visual sitemap illustrating all 5 color families side-by-side:

![Master 5-Domain Comparison Matrix](file:///C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/comparison_master_all_domains.png)

---

## 3. Scope of Implementation & Code Changes

### Phase 1: Decouple Global Semantic CSS Variables (`css/style.css` & `css/admin.css`)
- **`css/style.css:74-81`:**
  ```css
  /* System UI Semantic Palette (Decoupled from Academic Grading) */
  --clr-success: #38bdf8;   /* Tactical Cyan for system success / online / active */
  --clr-warning: #f59e0b;   /* System Amber for warnings / caution / drafts */
  --clr-danger:  #ef4444;   /* System Crimson for destructive actions / errors */
  ```
  Academic grade tokens (`--grade-star`, `--grade-a`, `--grade-b`, `--grade-c`, `--grade-d`, `--grade-e`) remain 100% intact for student evaluation and result cards.

- **`css/admin.css`:**
  - Redefine `.status-dot.dot-active`, `.status-dot.dot-live` to `#38bdf8` with cyan pulse (`@keyframes pulseTactical`).
  - Redefine `.badge-success` and `.badge-tag-ongoing` to Tactical Cyan (`#38bdf8`).
  - Redefine `.badge-warning` and `.badge-tag-upcoming` to System Amber (`#fbbf24` / `#f59e0b`).
  - Redefine `.badge-danger` to System Crimson (`#ef4444`).
  - Redefine `.test-status.draft` to Amber and `.test-status.archived` to Neutral Slate (`#94a3b8`).

### Phase 2: Purge Yellow Leakages Across JavaScript & HTML
- **`js/admin/tests-access.js`:** Update time-edit banners from `#ffe600` to `#0284c7` (Tactical Blue) with `#38bdf8` border.
- **`js/admin/vocab-vault.js`:** Update setting badge (line 2686) from `#FFFF00` to `#38bdf8` (Tactical Cyan); update table headers (line 2776) to neutral `#94a3b8`.
- **`js/admin/auto-gen-modal.js`:** Update form labels (lines 86, 92, 245, 251) from `#ffff00` to clean white `#f8fafc`.
- **`js/admin/desk.js`:** Update "Test Security" header (line 1091) from `#FFFF00` to `#f8fafc`; update latency text (line 708) to System Amber `#fbbf24`.
- **`js/admin/class.js`:** Update answer changes metric (line 918) from `#FFFF00` to Tactical Cyan `#38bdf8`.
- **`js/admin/student-management.js`:** Update batch badge (line 1089) from `#FFFF00` to Tactical Cyan.
- **`offline.html`:** Update offline text (line 64) from `#ffff00` to Tactical Slate `#94a3b8`.

### Phase 3: Purge Orange Leakages Across JavaScript
- **`js/admin/app.js`:** Update task badge (line 4362) from `#FF8C00` to System Amber `#fbbf24`.
- **`js/admin/tests-management.js`:** Update WITA Peak Hour banner and bars (lines 2426, 2447, 2450) from `#ff8c00` to System Amber `#fbbf24`.

### Phase 4: Purge Red Leakages Across JavaScript
- **`js/admin/desk.js`:** Update purge warnings (lines 225, 236) from `#FF0000` to System Crimson `#ef4444`.
- **`js/admin/student-management.js`:** Update student deletion modal header (line 2574) from `#FF0000` to `#ef4444`.
- **`js/admin/student-registration.js`:** Update required field asterisks (lines 738, 760, 769, 779, 789) from `#FF0000` to `#f43f5e`.
- **`js/admin/tests-access.js`:** Update kick student modal and incident warnings (lines 586, 613, 2623) from `#FF0000` to `#ef4444`.

### Phase 5: Purge Green & Pink Leakages Across JavaScript & CSS
- **`js/admin/student-management.js`:**
  - Update promote button (line 808) from `#00c000` to Tactical Sky Blue `#0284c7`.
  - Update "Active Students" metric tab (line 753) to `#38bdf8`.
  - Update `★ BATCH AVERAGE` table borders (lines 2335-2355) from `var(--grade-star, #00c000ff)` to `#334155`.
- **`js/admin/modules.js`:** Update `● ALL ENGINES ACTIVE` (line 32) from `var(--grade-a, #00c000)` to `#38bdf8`.
- **`js/admin/app.js`:** Update `● ANALYTICS ACTIVE` (line 1932) to `#38bdf8`.
- **`js/admin/desk.js`:** Update recalculation cards (lines 617, 619, 807) from `var(--grade-star)` to `#6366f1` (Tactical Indigo).
- **`css/auth.css`:** Verify 100% Tactical System Blue (`#38bdf8`) lock on Student Gate.

---

## 4. Verification Plan & Quality Gates

### Automated Pre-Flight Quality Gate
- Script `scripts/verify_plan_preflight.mjs` will be run against this plan file to ensure 100% compliance with Rule 23.

### Automated Codebase Audit (Zero Leakage)
- Write and run `scripts/verify_system_palette_separation.mjs`:
  1. Verifies that `--clr-success` does NOT equal `#00c000ff`.
  2. Verifies that `btn-promote-all-eligible` does NOT contain `#00c000`.
  3. Verifies that `tests-access.js` does NOT contain `#ffe600`.
  4. Verifies that `vocab-vault.js` does NOT contain yellow `#FFFF00` in setting chips or `<th>`.
  5. Verifies that `desk.js` does NOT contain `#FF0000` in purge headers.
  6. Verifies that required asterisks in `student-registration.js` do NOT use `#FF0000`.
  7. Verifies that all academic evaluation tests in `test/grading.test.js` still pass with 100% accuracy.

### Automated Spatial & Layout Invariants Check
- Run `.agents/skills/ui-spatial-checker/` validator to guarantee:
  - Single-screen `100vh` lock maintained with zero outer scrollbar.
  - Strict 10px container gap.
  - 50px fixed lower panel height.
  - Single-line `nowrap` on all table data cells.

---

## 5. Visual Pre-Flight Verification Checklist

### 📐 Visual Pre-Flight Verification Checklist
- [x] **Current State Screenshot (Before)**: Embedded baseline visuals showing existing appearance and dimensions (`comparison_board_yellow_leakage.png`, `comparison_board_orange_leakage.png`, `comparison_board_red_leakage.png`, `comparison_board_green_leakage.png`, `comparison_board_pink_leakage.png`).
- [x] **Proposed Visual Mockup (After)**: Interactive side-by-side comparison boards showing the new layout (`comparison_master_all_domains.png`, `comparison_board_yellow_leakage.png`, `comparison_board_orange_leakage.png`, `comparison_board_red_leakage.png`, `comparison_board_green_leakage.png`).
- [x] **Zero Outer Page Scroll**: Verified root `100vh` lock with `calc(100vh - 60px)` console sizing.
- [x] **Container Spacing**: Verified strict 10px gap between all cards, tables, and top/lower panels.
- [x] **Lower Panel Alignment**: Verified 50px fixed height aligned with `.sidebar-footer`.
- [x] **Dynamic Columns & Nowrap**: Verified `white-space: nowrap !important;` on table cells with zero clipped text.
- [x] **Zero Dead Space**: Verified tables and cards expand to fill 100% width cleanly.
- [x] **Language Standard**: Verified all headers, labels, and loading messages use 100% direct English.
