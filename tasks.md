# Active Task List — TopsCore LMS

> **Current Focus:** Universal Visual Standardization & Normalization of TopsCore Modals, Tables, Forms & Data Taxonomies
> **Current Phase:** Phase 572 (Complete) — Alumni Main Panel Routing & Clickability Resolution
> **Automated Verification:** 100% Passed Across All Test Suites & Preflight (< 1.5s Fast Loop, < 20s Full Parallel Run)

---

## 📋 SSOT Governance & Architecture Milestones (Complete)
- [x] **Phase 572 (Alumni Main Panel Routing & Clickability Resolution)**:
  - Fixed sidebar Alumni navigation item (`#sidebar-alumni-item`) click handling and routing.
  - Added dedicated routing case `case 'alumni':` to `loadSection` switch statement in [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js) preventing it from falling through to the `default` placeholder ("This section is under development").
  - Registered `alumni: 'Alumni'` in `sectionTitles` and `alumni: 'BOARD'` in `sectionDomainMap`.
  - Exposed `window.loadSection = loadSection;` immediately after function declaration in [js/admin/app.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/app.js) for early availability.
  - Added fail-safe inline `onclick` handler to `#sidebar-alumni-item` in [admin.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/admin.html) and direct click event binding in `loadSidebarPrograms()`.
  - Added `program_status` to `adminFetchAll('students')` select list in [js/admin/student-management.js](file:///d:/Drives/Tutor%20Tampan/TopsCore/js/admin/student-management.js) and recognized `PROGRAM_COMPLETED` status, accurately querying and displaying all 20 alumni students.
  - Bumped asset versioning query parameters in [admin.html](file:///d:/Drives/Tutor%20Tampan/TopsCore/admin.html) to `20261115_v571` to defeat browser HTTP caching.
- [x] **Phase 571 (Dedicated Theme STATUS Column & Pure Canonical GRADE Invariant)**:
  - Added 5th sub-column `STATUS` (`colSpan: 5`) across each active theme (THEME A, B, C, D) in the Class Hub Attendance & Performance Grid.
  - Column `STATUS` displays: Green checkmark (✓) for normal pass ($\ge 60\%$), Yellow `R` for remedial, Red `F` for forgiven waiver, Tactical Cyan `M` for manual override, and Dash (—) for unattempted/failed.
  - Interactive checkboxes for `Remedi (R)` and `Forgive (F)` Sub Panel modes rendered directly within the `STATUS` column.
  - Column `GRADE` strictly restored to pure canonical academic grades (★, A, B, C, D, E) matching student-facing reports.
  - Resolved `check_attempts_grade` PostgreSQL constraint violation by saving canonical grades to `attempts.grade` while storing administrative flags (`is_forgiven`, `is_remedial`, `forgiven_reason`) safely.
  - Enforced 2px solid neutral continuous divider on `col-test-theme-status` and quadrant color theme subheaders in `css/admin.css`.
- [x] **Phase 570 (Manual Edit Deferred Batch Save & Confirmation Prompt on Exit)**:
  - Eliminated premature auto-saves on `blur` from class matrix input fields (`task-progress`, `exam-score`, `exam-pts`).
  - Held draft edits in memory without triggering network requests during active editing.
  - Implemented deferred batch saving triggered exclusively when user presses `Done Editing (Manual)` or Escape.
  - Added TopsCore standard confirmation dialog (`Save Changes` vs `Cancel (Discard)`).
- [x] **Phase 569 (Student Dashboard Bottom Banner De-Overlap & Zero-Clipping Invariant)**:
  - Fixed banner overlap bug: `#bottom-ad-banner` had inherited `position: fixed !important; bottom: 0;` from `style.css`, causing it to float over the bottom 60px of `.dashboard-content` and block test Row 11 (`2nd Vocabulary A Words Exam`).
  - Added `position: relative !important;` to `body.dashboard-page #bottom-ad-banner` in `css/dashboard.css` so it participates in standard flex column flow below `.dashboard-content`.
  - Added `padding: 4px 6px 20px 6px !important;` to `.completed-table-wrap` and `#completed-Tests-container` for breathing room when scrolled to the end.
- [x] **Phase 568 (Direct Table Remedi & Forgive Inline Checkboxes — Zero Pop-ups, Capped R & Waiver F)**:
  - Purged all pop-up wizards for Remedial and Forgiven actions per user directive.
  - Interactive checkboxes appear right beside grade symbols in `GRADE` column when `Remedi (R)` or `Forgive (F)` mode is active.
  - Remedial (R): Score capped at maximum exam threshold (60.0%) with Grade `R` in yellow (`var(--grade-c)`). Reverts to canonical grade upon uncheck.
  - Forgiven (F): Unlocks milestone completion (`is_forgiven = true`, Grade `F` in red `var(--grade-e)`) without score inflation. Reverts upon uncheck.
  - Integrated `toggleCellRemedial` and `toggleCellForgiven` direct database operations with cache invalidation and UI reactivity.
  - Mutually exclusive button modes for Manual, Remedi, and Forgive with Escape key reset.
- [x] **Phase 567 (Universal Terminology Standardization — 'RATE' Metric, Zero Cohort/Assessment/Subject/Quiz)**:
  - Standardized score percentage column header to **`RATE`** (4 letters).
  - Cleared all occurrences of `cohort` $\rightarrow$ strictly **`Batch`**.
  - Cleared all occurrences of `Class Board` & `Subject` $\rightarrow$ strictly **`Class`**.
  - Cleared orphan `assessment` references $\rightarrow$ strictly **`Test`**.
  - Renamed Student Roster completion column header to **`PASSED`** (micro `PASS`).
  - Purged legacy `wizard-quiz-*` to `wizard-task-*`.
  - Registered `PASSED` and `RATE` in DataGrid abbreviation dictionary.
- [x] **Phase 566 (Alumni Main Panel in Board & Hold-Inactive Category Consolidation)**:
  - Added dedicated `Alumni` nav item under Domain B (`B — BOARD`) pinned to the bottom of Domain B (`admin.html`, `admin-init.js`).
  - Integrated `#alumni` route with topbar title `Alumni` pulling all institutional alumni without batch boundaries (`app.js`, `student-management.js`).
  - Consolidated `Hold Students` and `Inactive Students` into a single unified tab `Hold & Inactive` (`hold_inactive`) displayed together in a single table with clear status badges (Hold yellow, Inactive slate).
  - Streamlined regular batch toolbar tabs into 3 clean tabs: `Active Students`, `Hold & Inactive`, and `All Students`.
- [x] **Phase 565 (Role Separation for Special Grades — Admin/Tutor 'M'/'R'/'F' vs Student Score Grade)**:
  - Admin & Tutor View: Special tokens `M` (Manual Score Cyan), `R` (Remedial Yellow), and `F` (Forgiven Red) strictly exclusive to Admin/Tutor Student Test and Grade matrix (`app.js`).
  - Student View: In Student Dashboard (`dashboard.js`), Result Page (`result.js`), and Leaderboard, grades are strictly computed from score percentage (`calculateGrade(percentage)`: `★`, `A`, `B`, `C`, `D`, `E`). Students never see `M`, `R`, or `F`.
- [x] **Phase 564 (Categorical Entity Standardization — Student, Class, Batch, Test Status & Types)**:
  - Codified Rule 2.27 in `AGENTS.md` and updated Section 2.14.
  - Student Status: Strictly `ACTIVE`, `HOLD`, `ALUMNI`, `INACTIVE` (eradicated legacy `graduated` & `completed`).
  - Class Status: Strictly `ACTIVE` and `INACTIVE` (`archived` aliased/purged to inactive).
  - Batch Status: Strictly `ACTIVE` and `INACTIVE` (`completed` eradicated).
  - Test Status: Strictly `PUBLISHED` and `DRAFT` (`unpublished` and `archived` normalized to `DRAFT`).
  - Test Type: Strictly `TASK` and `EXAM` (`quiz` legacy eradicated).
  - Synchronized across `student-management.js`, `test-builder.js`, `tests-management.js`, `classes-management.js`, `app.js`, `crud-modals.js`, and `api.js`.
- [x] **Phase 563 (Purge Student Roster Table Footer — Exclusivity to Student Grade Matrix)**:
  - Removed batch average footer from Student Roster; made exclusive to Student Test and Grade in Class Hub.
- [x] **Phase 562 (Gender Header Abbreviation Standardization — 'SEX' Strictly, Purge 'GNDER')**:
  - Enforced 3-letter abbreviation `SEX` without 5-letter variant.
- [x] **Phase 561 (Database Constraint Expansion for Special Grades — 'M', 'R', 'F')**:
  - Expanded Postgres check constraint on attempts grade to include special administrative grades.
  - Codified Table 2 Row 24: `PHOTO` -> 5-letter `PHOTO`, 3-letter `PIC` (representing picture or photo).
  - Built `resolveHeaderLabel` engine in `DataGrid` (`js/admin/datagrid.js`): Automatically selects 3-letter micro form for column width $< 55\text{px}$ (`LVL`, `PIC`, `SEX`, `PRG`, `SCR`, `PTS`, `GRD`, `ACT`), 5-letter medium form for width $55\text{px} - 84\text{px}$ (`LEVEL`, `PHOTO`), and Full Form for width $\ge 85\text{px}$ (`EDUCATION`, `CITY / DISTRICT`, `PROVINCE`). GENDER strictly resolves to `SEX` when abbreviated (no 5-letter `GNDER`).
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
- [x] **07. Custom Confirm Logout Modal (`#custom-confirm-modal`)** [COMPLETE]
  - Dedicated 60px CTA panel / modal footer with prominent 1.5px neutral top border (`border-top: 1.5px solid rgba(255, 255, 255, 0.16)`).
  - Neutral Warning Theme: Clean neutral canvas `#0D1424`, 1.5px neutral slate icon box with exit-door SVG, 16px ALL CAPS pure white title `#f8fafc` (`LOG OUT SESSION`), slate description. Zero harsh red fills on dialog chrome.
  - Symmetrical 40px Action Buttons with Dynamic Hover Activation:
    - `STAY HERE`: Dark slate idle with subtle green border (`rgba(0, 192, 0, 0.4)`), ignites into luminous Grade A green glow on `:hover` (`var(--grade-a)` / `#00c000`).
    - `LOG OUT`: Dark slate idle with subtle red border (`rgba(255, 0, 0, 0.4)`), ignites into luminous Grade E red gradient glow on `:hover` (`var(--grade-e)` / `#FF0000`).
- [x] **08. Pre-Exam Focus Modal (`#pre-exam-focus-modal`)** [COMPLETE]
  - Codified Section 1.5.0 "Badge Area" Invariant in `.agents/rules/ui-invariants.md`: Dedicated visual status/focal container positioned specifically ABOVE the Title Area.
  - Positioned Tactical Blue integrity shield SVG inside dedicated `.badge-area.focus-badge-area` (50px × 50px) at the top of the modal window.
  - Standardized 16px Outfit Bold ALL CAPS Title: `EXAM PREPARATION & FOCUS`.
  - Structured 5 Concise Integrity Checklist Items with 100% SVG Vector Icons:
    1. `Turn Off All Notifications` (Ico Danger `bell-off` SVG)
    2. `No Second Devices` (Ico Danger `smartphone-slash` SVG)
    3. `No Tab Switching` (Ico Warning `layers` SVG)
    4. `Fullscreen Focus Mode` (Ico Tactical `maximize-2` SVG)
    5. `Independent Completion` (Ico Success `clock` SVG)
  - Dedicated 60px CTA Area / Modal Footer with 1.5px neutral top boundary and 40px `START EXAM` button with responsive hover glow.
- [ ] **09. Question Matrix 40-Tile Modal** *(Next in Queue)*
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

## 🎙️ Planned Architecture / Backlog
- [ ] **Conversation / Roleplay Room Integration (P2P Oral Module)**:
  - Tombol standalone `Oral Room` telah dilepas dari header utama `dashboard.html`.
  - Halaman dan logika P2P Conversation (`conversation.html`, `js/conversation-room.js`, `js/conversation-eval.js`) tersimpan aman.
  - Direncanakan terhubung langsung dari dalam konteks kelas Conversation/Roleplay (bukan tombol independen di header siswa).
  - Dijadwalkan pengingat malam ini untuk pembahasan arsitektur integrasi kelas.

---

## 🔒 Verification & Quality Gates
- [x] Strict UTF-8 & No PowerShell file piping (`AGENTS.md` §0.1.2)
- [x] No autonomous git commit or push (`AGENTS.md` §0.1.1)
- [x] All 50 JavaScript files pass syntax check (`npm run test:syntax`)
- [x] All regression test suites pass (`npm test`)
- [x] Spatial & visual invariants verified (`npm run check:spatial`)
