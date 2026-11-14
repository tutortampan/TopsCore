# Active Task List — TopsCore LMS

> **Current Focus:** Universal Visual Standardization & Normalization of TopsCore Modals, Tables and Forms
> **Current Phase:** Phase 517 (Complete) — Compact UI Before & After Screenshots Standard (Max Height 600–800px)
> **Automated Verification:** 100% Passed Across All Test Suites & Preflight (< 1.5s Fast Loop, < 8s Full Parallel Run)

---

## 📋 SSOT Governance & Architecture Milestones (Complete)
- [x] **Phase 517 (Compact UI Before & After Screenshots Standard — Max Height 600–800px)**:
  - Codified Rule 2.27 in `AGENTS.md` and updated Section 5.2 Do Not Do List as the single authoritative home (Single Source of Truth).
  - Enforced Hub & Spoke zero-duplication standard: purged redundant text blocks from `.agents/rules/ui-invariants.md`, `agent-workflow.md`, and `.antigravityrules`.
  - Linked `visual-preflight` skill checklist directly to `AGENTS.md Rule 2.27`.
  - Recorded architectural decision in `docs/DECISIONS.md` (`DECISION-055`).
- [x] **Phase 516 (Automatic Adaptive Header Abbreviations & Sort Icon Spacing Protection)**:
  - Codified Table 2 Row 24: `PHOTO` -> 5-letter `PHOTO`, 3-letter `PHT` (pure consonants without vowels; `PHO` recognized as alternative).
  - Built `resolveHeaderLabel` engine in `DataGrid` (`js/admin/datagrid.js`): Automatically selects 3-letter micro form for column width $< 55\text{px}$ (`LVL`, `PHT`, `PRG`, `SCR`, `PTS`, `GRD`, `ACT`), 5-letter medium form for width $55\text{px} - 84\text{px}$ (`LEVEL`, `PHOTO`, `GNDER`, `STATS`), and Full Form for width $\ge 85\text{px}$ (`EDUCATION`, `CITY / DISTRICT`, `PROVINCE`).
  - Column resize dynamic reactivity: Header labels adapt on-the-fly during manual dragging or double-click auto-fit.
  - Sort icon & narrow header containment: Set `padding: 0 2px !important` on narrow headers ($\le 55\text{px}$), reduced sort icon to 10px with 2px gap, and enforced `overflow: hidden; max-width: 100%;` on `.datagrid-header-content`, completely eliminating sort icon spillover and left-edge text clipping (`EVEL` / `▲PHOTO`).
- [x] **Phase 515 (Global Development & Testing Acceleration Pipeline)**:
  - In-Process AST Syntax Checker (`scripts/check_all_js_syntax.mjs`): Replaced 50 sequential Windows `execSync('node --check')` process spawns with `vm.SourceTextModule` (ESM) and `vm.Script` (CJS). Reduced syntax validation duration from ~15s to **0.14s** (>100x speedup).
  - Git-Aware Smart Test Runner (`scripts/test_smart.mjs`): Automatically inspects working tree diffs and routes execution to impacted test suites. Provides instant feedback in **< 1.5s**, eliminating unnecessary runs of unrelated test suites.
  - 2-Phase Concurrency Pool Parallel Runner (`scripts/run_all_tests_parallel.mjs`): Phase 0 (sequential pre-build for CSS & SW manifest, ~300ms) prevents race conditions; Phase 1 (parallel test pool with 4–8 worker limit & output buffering) executes all suites concurrently with heavy browser tests prioritized first.
  - Standardized NPM Scripts (`package.json`): `npm test` mapped to smart runner, `npm run test:fast` for instant preflight (~350ms), `npm run test:syntax` for in-process AST scan (~140ms), and `npm run test:full` for full parallel regression. Guarantees zero background task timeouts in Antigravity.
- [x] **Phase 514 (Education English Normalization, Edit Mode Dropdowns & 40px Table Footer)**:
  - Education standardized to pure formal English terms (`Kindergarten`, `Elementary School`, `Junior High School`, `Senior High School`, `Diploma Degree`, `Bachelor's Degree`, `Master's Degree`, `Doctorate Degree`).
  - Graduation years completely eliminated from education display and inputs.
  - Master Edit Mode controls for Education, Province, and City converted to centered dark-themed `<select class="student-inline-select text-center">` dropdowns.
  - Dependent dynamic geographical linking: City dropdown automatically updates based on selected Province.
  - Table footer summary row locked to strict 40px height (`height: 40px !important; line-height: 40px !important;`).
- [x] **Phase 513 (Student Roster Header Grouping & Geographical Standards)**:
  - Super Header 1: `STUDENT IDENTITY` (`colspan="4"`: `LEVEL`, `PHOTO`, `GENDER`, `NAME`).
  - Super Header 2: `DEMOGRAPHIC` (`colspan="5"`: `DOB`, `AGE`, `EDUCATION`, `CITY / DISTRICT`, `PROVINCE`).
  - Education placed directly after Age; City always to the left of Province.
  - Province standard abbreviations (`NTB`, `NTT`, `DIY`) and English city names (`Mataram City`, `West Lombok Regency`).
  - Age formatted as numbers only (e.g. `22`); Universal header centering (`text-align: center !important`).
- [x] **Phase 512 (3-Tier Header Architecture & 60px Spanning Headers)**: Standalone headers span `rowspan="2"` 60px full height, sub-headers regular 400 weight, DataGrid auto-fit & resize mapping synchronized.
- [x] **Phase 510 (Section "A" Electric Pink & Star Independence)**: Decoupled `--quad-a` / `TOPSCORE_QUAD_COLORS.A` and `--grade-star` / `TOPSCORE_COLORS.STAR` with independent token sources.
- [x] **Rule 2.23 (Student Name Honorific Titles Exclusivity)**: Codified in `AGENTS.md`, `ui-invariants.md` §2.8, `DECISIONS.md` DECISION-053, and `.antigravityrules`.
- [x] **Universal Clean Name Implementation**: Refactored `formatStudentName` in `js/api.js` to return pure `cleanStudentName`. Added `formatStudentDashboardName` for dashboard use.
- [x] **Database & Consumer Cleanliness**: Guaranteed pure clean names across `students.name`, session state, Test Room (`test.html`), Result Screen (`result.html`), Conversation Room (`conversation.html`), and Admin Console.
- [x] **Automated Regression Suite**: Created `scripts/test_student_title_exclusivity.mjs` (5 pillars verified 100% green).
- [x] **Documentation Hygiene**: Maintained strict 25-phase rolling window in `docs/CHANGELOG.md` and $\le 120$ lines in `docs/CURRENT_STATE.md`.

---

## 🎯 Live Sessions & Monitor Modernization (Phase 505)
- [x] **Streamline Triage Toolbar (Satu Baris yang Rapi)**:
  - Eliminated 5 bulky redundant KPI cards and merged triage tabs (`All`, `In Progress`, `Submitted`, `Not Started`, `Alarm`), Auto-Refresh (5s), and student search into a single sleek 46px toolbar.
- [x] **Single-Responsibility Action Columns (Satu Kolom Satu Info)**:
  - Split action buttons into two distinct 55px columns: `PEEK` and `EXPEL`.
- [x] **Vector SVG Action Icons (Zero Emojis & Zero Plain Text)**:
  - Replaced text words "Peek" and "Expel" with Eye vector icon (`#38bdf8`) and User-X vector icon (`var(--grade-e)`).
- [x] **Dedicated BATCH Column & Zero In-Line Batch**:
  - Removed batch numbers in parentheses `(134)` from student names; added dedicated calibrated 85px `BATCH` column to the left of `NAME`.
- [x] **Universal Centered Table Headers**:
  - Enforced `text-align: center;` across all table headers in `.live-monitor-table thead th`.

---

## 🎯 Mobile & System Modals Modernization Queue (Phases 455–458+)

- [x] **01. Welcome / Gender / Birthday Setup Modal (`#welcome-modal`)** [COMPLETE]
  - Symmetrical 350px width, 60px footer with 40px CTA button, 10px container gap, zero scroll.
- [x] **02. Student Self-Introduction Modal (`#introduce-setup-modal`)** [COMPLETE]
  - Stacked Address fields (`PROVINCE` & `CITY / DISTRICT`), 60px footer with 40px CTA button, zero scroll.
- [x] **03. Classes Selector Modal (`#classes-selector-modal` / LOBBY)** [COMPLETE]
  - 350px width, 60px footer, SVG icons, Rule 2.10 grade colors, zero scroll.
- [x] **04. Component Selector Modal (`#component-selector-modal`)** [COMPLETE]
  - 350px width, 60px footer, 2-step card selection machine, SVG icons, zero scroll.
- [x] **05. Class Levels Detail Modal (`#level-modal`)** [DECOMMISSIONED & PURGED]
  - Dormant modal and all associated code (`openClassModal`, `closeLevelModal`, `#levels` routing, CSS rules, `#classes-grid`) 100% purged cleanly from `dashboard.html`, `js/dashboard.js`, and `css/dashboard.css`. Zero leftovers remaining.
- [x] **06. Student Profile Drawer (`#profile-modal` / PROFILE) & Change PIN Modal (`#change-pin-modal`)** [COMPLETE]
  - Executive Academic CV single-page layout (single-page `PROFILE`, zero tabs; History tab decommissioned and purged per user directive).
  - Biodata Stacked Beside Photo: Avatar with camera badge on left; Student Name (`Mr. Ahmad Nur Suhendro`), Gender (`Male (Mr.)`), DOB (`1 Jan 2005`), and Age (`(21 yrs)`) neatly stacked vertically on the right.
  - 4-Tier Residential Address: Hierarchical descending stack (`PROVINCE` $\to$ `CITY / REGENCY` $\to$ `DISTRICT` $\to$ `VILLAGE`) with numbered badges (1 to 4) and 100% Zero-Truncation per Rule 2.21.
  - Auto-Calculated Education by Age: Smart calculation via `getEducationEligibility(age)` determining official tier (`Senior High School (SMA/SMK)`) with green `Verified` pill and subtitle `Auto-Calculated by Age (21 yrs)`.
  - Security Action Row & Dedicated Pop-up Modal: Replaced bulky in-line PIN form with a sleek action row (`Personal PIN •••• Active`) and glowing `CHANGE PIN` button that opens a dedicated, compact 350px dialog (`#change-pin-modal`).
  - Spatial Verification: Profile modal height strictly 537px (< 64% viewport, 307px vertical clearance, 100% zero scroll). Change PIN modal height strictly 398px (< 50% viewport). Both equipped with dedicated 60px footers and 40px action buttons. Zero emojis (100% vector SVGs).
- [ ] **07. Custom Confirm Logout Modal** *(Next in Queue)*
  - Standardize 480px compact modal dialog, 60px footer with dual 40px action buttons (`CANCEL` & `LOGOUT`).
- [ ] **08. Pre-Exam Focus Modal**
  - Standardize instructions card, countdown display, and start exam CTA.
- [ ] **09. Question Matrix 40-Tile Modal**
  - Standardize 40-tile responsive grid, status legends (Answered, Flagged, Unanswered), and jump actions.
- [ ] **10. Incomplete Submit Hazard Warning Modal**
  - Preserve 3-Tier Hazard Yellow & Orange Submit Modal design with 60px footer and 40px buttons.
- [ ] **11. Complete Submit Confirmation Modal**
  - Standardize clean confirmation dialog with submission summary.
- [ ] **12. Anti-Cheat Security Violation Overlay**
  - Standardize warning banner, violation counter, and full-screen enforcement locks.
- [ ] **13. Result Answers Breakdown Modal**
  - Standardize question breakdown table, tolerance indicators, and review layout.

---

## 🔒 Verification & Quality Gates
- [x] Strict UTF-8 & No PowerShell file piping (`AGENTS.md` §0.1.2)
- [x] No autonomous git commit or push (`AGENTS.md` §0.1.1)
- [x] All 50 JavaScript files pass syntax check (`npm run test:syntax`)
- [x] All regression test suites pass (`npm test`)
- [x] Spatial & visual invariants verified (`npm run check:spatial`)
