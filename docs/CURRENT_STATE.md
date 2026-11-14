# CURRENT STATE — TOPSCORE LMS

> **Purpose:** Single authoritative restart point across sessions and restarts.
> **Last Updated:** 2026-11-15 04:25 UTC+8
> **Current Phase:** Phase 540 [COMPLETE] — Universal Super-Header Continuous Neutral Divider Invariant (All Continuous Lines from Header to Footer Strictly 2px Neutral)
> **Status:** READY FOR USER CONFIRMATION & REVIEW (ALL TEST SUITES 100% GREEN)

---

## 1. Active System Architecture & Invariants

- **Universal Super-Header Continuous Neutral Divider Invariant ("Semua Garis yang Bersambung dari Header Sampai Footer Harus Tebal") (Phase 540 / SSOT)**:
  - **Universal Standard**: In any table featuring super-headers (e.g. Student Management Roster, Class Hub Performance Matrix, Vocabulary Theme Manager, Generation Blueprint Matrix), **every single vertical line that originates from a super-header boundary in Header Row 1 and extends through the table down to the footer MUST BE THICK (2px solid neutral: `border-right: 2px solid rgba(255, 255, 255, 0.22) !important;`)**.
  - **4-Tier Unbroken Continuity**: The 2px neutral divider runs unbroken through:
    1. Header Row 1 Super-Headers (`th.super-hdr` / `bp-super-header-row th`).
    2. Header Row 2 Sub-Headers (`th.super-hdr-divider` / `col-bp-sep`).
    3. Body Data Rows (`tbody td.super-hdr-divider` / `col-bp-sep`).
    4. Footer Summary Rows (`tfoot td.super-hdr-divider` / `datagrid-summary-row td`).
  - **DataGrid SSOT Automated Divider Engine (`js/admin/datagrid.js`)**:
    - Mathematically computes `this.dividerColKeys` based on running `colSpan` and `rowSpan` totals of `this.superHeaders`.
    - Automatically injects `.super-hdr-divider` to boundary column headers, data cells, and footer summary cells without manual per-column wiring.
    - Guaranteed zero gap, zero thin breaks, and zero mismatched dividers when dynamic columns (such as active class exams) expand or collapse.

- **Official Predicate Letter Grades: GRADE R & GRADE F Invariant (Phase 538 / SSOT)**:
  - **Eradication of Superscripts/Subscripts**: Permanently eradicated all superscripts and subscripts (`ᴿ`, `<sup>R</sup>`, `ᶠ`, `<sup>F</sup>`, `test-rem-sup`, `test-forgiven-sup`, `asm-rem-sup`, `asm-forgiven-sup`) across the entire LMS platform (Student Dashboard, Result Screen, Admin Class Hub / Attendance Matrix, Student Management Roster, Test Analytics, and Excel Export formats). Scores display clean and uncluttered (e.g. `60%`, `55%`, `0%`).
  - **Official Predicate Letter Grades (SSOT in `js/grading.js`)**:
    - **GRADE `R` (Remedial)**: Official grade symbol for remedial attempts. Rendered in **Pure Yellow** identical to Grade C (`#FFFF00` / `var(--grade-c)` / `TOPSCORE_COLORS.C`), with predicate label `'Remedial'`, dark badge text (`#0F172A`), and capped score representation ($60\%$).
    - **GRADE `F` (Forgiven)**: Official grade symbol for admin-forgiven prerequisite waiver attempts. Rendered in **Pure Red** identical to Grade E (`#FF0000` / `var(--grade-e)` / `TOPSCORE_COLORS.E`), with predicate label `'Forgiven'`, dark badge text (`#0F172A`), and authentic score representation ($0\%$ or waived score).
  - **Authoritative Palette & Functions Integration**:
    - `GRADE_PALETTE.R` & `GRADE_PALETTE.F` codified in `js/grading.js`.
    - `calculateGrade(percentage, { isRemedial, isForgiven })` returns `'R'` for remedial and `'F'` for forgiven.
    - `getGradeColor('R')` $\to$ `TOPSCORE_COLORS.C`, `getGradeColor('F')` $\to$ `TOPSCORE_COLORS.E`.
    - `getGradeSymbol('R')` $\to$ `'R'`, `getGradeSymbol('F')` $\to$ `'F'`.
    - `getAchievementStatus('R')` $\to$ `'REMEDIAL'`, `getAchievementStatus('F')` $\to$ `'FORGIVEN'`.
    - `formatGradeBadgeHtml('R')` $\to$ `.grade-circle.grade-circle-r`, `formatGradeBadgeHtml('F')` $\to$ `.grade-circle.grade-circle-f`.
  - **CSS Styling Integration**: Codified `.grade-R`, `.text-grade-R`, `.grade-F`, `.text-grade-F`, `.grade-circle.grade-circle-r`, `.grade-circle.grade-circle-f`, `.form-pill.grade-r`, `.form-pill.grade-f` in `css/style.css`, `css/admin/admin-tables.css`, `css/admin.css`, and `css/admin.min.css`.
  - **Database Persistence Alignment (`js/api.js`)**:
    - When an exam is marked or unlocked as remedial (`adminUnlockRemedialExam`), its record in `attempts` persists with `grade: 'R'`.
    - When an exam is exempted as forgiven (`adminApplyForgiven`), its record in `attempts` persists with `grade: 'F'`.
    - Post-submit remedial sync retains earned score capped at 60% with `grade: 'R'`.

- **Super-Header Continuous Neutral Vertical Divider & Category Split Invariant (Phase 537 / SSOT)**:
  - **Continuous Top-to-Bottom Neutral Dividers**: All tables featuring super-headers enforce an unbroken vertical separator (`border-right: 2px solid rgba(255, 255, 255, 0.22) !important;`) running continuously from the very top of Row 1 super-headers (`datagrid-super-header-row` / `th.super-hdr`), through Row 2 sub-headers, table body data rows (`tbody td`), down to table summaries/footers (`tfoot td`).
  - **Eradication of Thematic Vertical Dividers**: Strictly banned colored vertical borders (pink, orange, lime, purple) between super-header groups in favor of clean, professional neutral borders (`rgba(255, 255, 255, 0.22)`).
  - **Category Grouping Hierarchy**:
    - **Class Hub Matrix Table (`app.js`)**: Super Header 1: **`STUDENTS DATA`** (`colSpan: 2`: `BATCH`, `STUDENT NAME`) with sticky positioning and 2px neutral divider; Super Header 2: **`OVERALL PERFORMANCE`** (`colSpan: 3`: `PROGRESS`, `POINT`, `GRADE`); Super Header 3+: **`THEME A`**, **`THEME B`**, **`THEME C`**, **`THEME D`** (`colSpan: 4` per theme).
    - **Student Management Roster (`student-management.js`)**: Super Header 1: **`STUDENTS DATA`** (`colSpan: 4`: `LEVEL`, `PHOTO`, `GENDER`, `NAME`); Super Header 2: **`DEMOGRAPHIC`** (`colSpan: 3`: `DOB`, `AGE`, `EDUCATION`); Super Header 3: **`ADDRESS`** (`colSpan: 4`: `VILLAGE`, `DISTRICT`, `REGENCY`, `PROVINCE`). Boundary columns (`sortName`, `education`, `province`) enforce `.super-hdr-divider`.
  - **Eradication of Decorative Stars in Footers**: All decorative star symbols (`★`) purged from table footers and summary rows across the entire application; clean text `CLASS AVERAGE` and `BATCH AVERAGE` enforced. Star (`★`) remains strictly reserved for 100% score achievements (Grade Star Exclusivity).
  - **PROGRESS 3-Tier Abbreviation**: Standardized 3-tier abbreviations for progress: Full `PROGRESS`, Medium (5-letter) **`PRGRS`**, Micro (3-letter) **`PGS`**.

- **Class Hub Formative Task Progress & Exam Gate Sync Invariant (Phase 536 / SSOT)**:
  - **Prerequisite Gate Synchronization ("Sudah Bisa Ambil Ujian")**: In `admin.html#class-hub` (Theme columns: PROG, SCORE, POINT, GRADE), when a student has already taken the milestone exam (`hasAtt === true` / `hasExamAttempt`) OR has passed all prerequisite topics in that theme (`topicsPassedCount >= numTopics`), their formative task progress is strictly recognized as 100% full (`earnedTasks = maxThemeTasks`, `isTaskCompleted = true`).
  - **Elimination of Mismatched Denominators & False 14% Failures**: Fixed the flaw where single-attempt completed tasks (e.g. 4 topics completed out of 4 topics) were divided by artificial $4 \times 7 = 28$ repetition denominators, producing misleading `4/28` (14% Red) indicators for students who already passed all prerequisite tasks and completed exams with Grade A/B/C.
  - **Proportional Credit for Partial Mastery**: When a student has passed some topics with $\ge 1$ pass $\ge 60\%$, each passed topic awards proportional progress (`Math.round(topicsPassedCount * topicWeight)`), eliminating zero-score distortion for active practicing students.
  - **Visual State Alignment**: Formative task progress cells for exam-ready/attempted students display `maxTasks/maxTasks` in Pure Green (`var(--grade-a)`) with `.rep-complete`, and table summary footers accurately reflect 100% completion in Grade A Green.

- **Regency, City & Address Category Redundancy Standardization (Phase 535 / SSOT)**:
  - **Column Header & System Labels**: Standardized from `CITY / REGENCY` to **`REGENCY`** across Admin Roster, DataGrid dictionary, modals, and Student Dashboard onboarding / profile drawer. Codified 3-tier abbreviations: Full `REGENCY`, Medium `RGNCY`, Short `REG`.
  - **Universal Redundancy Stripping Protocol**: If an address value or choice contains the name of its category, the redundant category word is strictly stripped:
    - **`VILLAGE`**: Strips `Village`, `Desa`, or `Kelurahan` (e.g. `Gunungsari Village` $\to$ `Gunungsari`, `Desa Gunungsari` $\to$ `Gunungsari`, `Kelurahan Rembiga` $\to$ `Rembiga`).
    - **`DISTRICT`**: Strips `District` or `Kecamatan` (e.g. `Gunungsari District` $\to$ `Gunungsari`, `Kecamatan Ampenan` $\to$ `Ampenan`).
    - **`REGENCY`**: Strips `Regency` or `Kabupaten` (e.g. `East Lombok Regency` $\to$ `East Lombok`, `Central Lombok Regency` $\to$ `Central Lombok`, `Sumbawa Regency` $\to$ `Sumbawa`).
    - **`PROVINCE`**: Strips `Province` or `Provinsi` (e.g. `Bali Province` $\to$ `Bali`). Mapped abbreviations (`NTB`, `NTT`, `DIY`) preserved.
  - **City Suffix Retention Protocol**: For municipal cities (e.g. `Mataram City`, `Kota Mataram`, `Surabaya City`), the word **"City" is strictly preserved** (`Mataram City`, `Surabaya City`).
  - **Authoritative Transformation Engines**: Implemented centrally in `formatVillageName()`, `formatDistrictName()`, `formatCityDistrict()`, and `formatProvinceName()` inside `js/indonesia-regions.js`. All tests verified 100% green via `scripts/test_regency_city_standardization.mjs`.

- **Class Hub Theme Exam Score Visibility & Gating Priority Invariant (Phase 534)**:
  - **Authoritative Precedence**: In `admin.html#class-hub` (Theme columns: SCORE, POINT, GRADE), student exam attempts (`hasExamAttempt && scoreVal >= 0`) take absolute rendering precedence. Real scores, points, and grades are ALWAYS displayed even if daily practice task quotas (`theme_task_progress < theme_task_max`) are incomplete.
  - **Lock Icon Exclusivity**: The red/yellow lock icons are strictly reserved for unattempted exams (`!hasExamAttempt`), never masking or obscuring recorded student exam results.
  - **Zero Database Loss**: Confirmed historical scores and class averages remain 100% intact and accurately calculated across all themes.

- **Centered Loading States & In-Screen Centering Invariant (Rule 2.28, UI-Invariants §1.4 & Antigravityrules Domain 3)**:
  - **Zero Corner-Drifting Standard**: Every loading spinner, skeleton, and async message across TopsCore without exception MUST be strictly centered horizontally and vertically (`display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; width: 100% !important; height: 100% !important; flex: 1 1 0 !important; margin: auto !important; box-sizing: border-box !important;`).
  - **Dual-Layer CSS Declaration**: Defined both in `css/style.css` (universal baseline for all pages) and `css/admin/admin-tables.css` / `css/admin.css` / `css/admin.min.css` (workstation styles), ensuring zero fallback to uncentered top-left drifting.
  - **Modal & Card Containment**: Automatically capped at `min-height: 180px !important;` inside `.modal-box`, `.modal-body`, `.modal-content`, and `.card` to maintain perfect centering without dialog blowout.
  - **CSS Brace & Syntax Integrity Guard**: All stylesheets validated with 100% brace and bracket balance via automated test suite `scripts/test_unified_tutor_room_typography_and_loading.mjs` (Pillar 9).
  - **Canonical Helper**: All dynamic asynchronous views and tab changes use `getLoadingStateHtml(message)` (exported from `js/app.js` and `js/admin/app.js`, globally exposed as `window.getLoadingStateHtml`).

- **In-Browser Photo & Avatar Processing Invariant (Rule 2.25 & Decision 054)**:
  - All avatars and photos are processed 100% in the web browser client-side (SVG data URIs via `generateAvatarDataUri()` or HTML5 Canvas compression).
  - Uploading uncompressed, raw camera files to Supabase Storage or server-side image processing is permanently banned. Zero egress, zero database bloat.
  - Locked as permanent architectural standard across `AGENTS.md` (§2.25 & §5.2), `.antigravityrules` (Domain 1 Item 8), and `docs/DECISIONS.md` (DECISION-054).

- **Compact UI Screenshot & Before/After Capture Invariant (Rule 2.27 & Decision 055)**:
  - Whenever UI editing involves capturing Before and After design screenshots or layout comparisons, all screenshots MUST be captured or resized at a small, compact resolution.
  - Maximum image height is strictly capped at **600–800px** (e.g. viewport height $600\text{--}800\text{px}$ or target crop/resize $\le 800\text{px}$).
  - Capturing or embedding oversized, full-resolution desktop screenshots (1080p, 1440p, 4K) is strictly forbidden.
  - Authoritatively codified as a single SSOT in [`AGENTS.md` Rule 2.27 & §5.2](file:///AGENTS.md) and recorded in `docs/DECISIONS.md` (DECISION-055).

- **Student Profile Drawer (Pop-up 06) Interactive Address & DOB Redesign (Phase 532 / Rule 2.21 & ui-invariants §2.1/§2.2)**:
  - **Single-Page PROFILE Architecture (`dashboard.html` & `js/dashboard.js`)**:
    - Purged legacy 2-tab navigation ("Account & PIN" and "History") in favor of a clean, single-page **PROFILE** drawer following the Executive Academic CV paradigm.
    - Centered 40px Header (`.profile-modal-header`) with ALL CAPS title and absolute close button `[✕]`.
    - 60px Dedicated Modal Footer with dual 40px action buttons: `CLOSE` and `SAVE CHANGES` (`#btn-save-profile-modal-footer`).
  - **Hero Biodata & Stacked Organization Metadata**:
    - Row 1: Student Name with honorific title (`#prof-student-name`, e.g. `Mr. Ahmad Nur Suhendro`).
    - Row 2: Combined `DOB / AGE` with interactive native date picker (`#prof-inp-dob` `<input type="date">`) and dynamic age badge (`#prof-age-display` `(21 yrs)`). Changing the date picker immediately recalculates age and auto-updates the educational background in real-time.
    - Row 3: Organizational metadata (`#prof-org-meta`): `Institution • Program • Batch` (e.g. `TopsCore Academy • General English • Batch Alpha 2026`), styled with natural wrapping to eliminate ellipsis truncation per Rule 2.21.
  - **Dedicated ADDRESS Card (4-Tier Cascading Selectors)**:
    - Dedicated card strictly titled **`ADDRESS`** with location pin SVG icon.
    - `PROVINCE`: Dropdown (`#prof-sel-province`) populated with 38 Indonesian provinces from `INDONESIA_REGIONS` with suggested NTB pinned at top.
    - `CITY / REGENCY`: Dropdown (`#prof-sel-city`) dynamically populated and cascading based on chosen province.
    - `DISTRICT`: Text input (`#prof-inp-district`).
    - `VILLAGE`: Text input (`#prof-inp-village`).
  - **Locked Educational Background**:
    - Dedicated card titled **`EDUCATIONAL BACKGROUND`** locked for students with a lock icon.
    - Dynamically auto-calculated based on age via `getEducationEligibility(age)`. Editable only by admin.
    - Completely purged the unneeded text `"Auto-Calculated by Age"`.
  - **Decoupled Security Card & Dedicated Change PIN Modal**:
    - Replaced in-line PIN form clutter with an elegant single-row card featuring `CHANGE PIN` action button.
    - Clicking opens the dedicated `#change-pin-modal` dialog (40px Header, clean vertical form, 60px Footer with `CANCEL` and `UPDATE PIN`).
  - **Form Dirty Tracking & Unsaved Changes Guard**:
    - Integrated `window.isProfileDirty` tracking across all interactive fields. Attempting to close with unsaved changes triggers the standard TopsCore Confirmation Dialog (`window.showConfirmDialog`).
    - Clicking `SAVE CHANGES` persists modifications to Supabase `students` table (`birth_date`, `education`, `province`, `city`, `district`, `village`), updates active `session` and `sessionStorage`, shows a success toast, and closes cleanly.
  - **Spatial Invariants (100% Zero-Scroll)**:
    - Width locked strictly to 350px (20px edge margin on 390px mobile viewports).
    - Total modal box height 662px on 844px mobile viewport (~78% coverage), preserving ~182px clearance with zero outer scrollbar.
    - Zero Sub-12px standard enforced across all labels, inputs, and badges ($\ge 12\text{px}$).

- **Table Grid Borders, Cache Busting & Service Worker Activation (Phase 531 / Rule 4.1 & Rule 2.21)**:
  - **Service Worker Claim Error Fix (`sw.js`)**: Wrapped `self.clients.claim()` inside `event.waitUntil(...)` with promise-chain handling and catch block, preventing unhandled `InvalidStateError` when the service worker activates or is unregistering.
  - **Unified Cache Busting Version (`v517`)**: Synchronized `api.js?v=20261114_v517` across `admin.html` and all `js/admin/*.js` files, eliminating stale cached browser syntax errors.
  - **Thin 1px & Thick 2px Table Borders (`css/admin/admin-tables.css`)**:
    - Thin 1px vertical borders (`rgba(255, 255, 255, 0.12)`) and thin horizontal borders between super-headers and sub-headers.
    - Thick 2px solid horizontal divider (`rgba(255, 255, 255, 0.28)`) separating `thead` from `tbody`.
    - Thick 2px solid horizontal divider (`rgba(255, 255, 255, 0.28)`) separating `tbody` from `tfoot` summary rows.
  - **Exam Points Simplification & DOB Single-Line**: Removed `pts` suffix from student roster exam columns and summary rows so cells render pure numbers (e.g. `95`, `136.5`). Widened DOB to 110px with `white-space: nowrap !important;` to strictly prevent birth dates from wrapping into 2 lines.

- **Live Monitor Retake Real-Time Tracking & Expel-Only Action Shield (Phase 530 / `js/admin/tests-access.js` & `js/api.js`)**:
  - **Retake Priority Engine (`getActiveOrLatestAttempt`)**: Solved the issue where retakes (*pengulangan*) remained frozen on Attempt #1 in the tutor's live view. The attempt selection engine now prioritizes active `in_progress` attempts first, followed by newest `created_at` / `started_at` descending. When a student starts an exam retake, the tutor's live view immediately flips to `● Starting Retake` / `● Actively Answering (Retake)` with real-time answered count, accuracy %, and retake scores!
  - **Expel-Only Action Column**: Removed the `PEEK` column and inspect answers modal completely from the live session table per user command. The table now features a single clean `EXPEL` (`✖`) column, perfectly calibrated to 65px with zero horizontal scrollbar (7 fixed columns: BATCH, NAME, TEST STATUS, PROGRESS, SCORE, ALARM, EXPEL).
  - **Supabase Egress Shield (99.5% Bandwidth Reduction)**:
    - Removed `attempt_answers` snapshot queries from 5-second polling loop in `fetchLiveTestSessionData`.
    - Query now selects only scalar fields (`attempt_id, is_correct, score, updated_at`) and filters `.not('student_answer', 'is', null).neq('student_answer', '')` so unanswered blank questions are never transmitted over the wire.
    - Dropped 5-second polling network payload from **~1,200 KB down to ~2–5 KB per poll**, saving gigabytes of data transfer per exam session!
  - **Verified by Automated Suite**: `scripts/test_live_monitor_retake_and_egress.mjs` (100% PASS in 0.88s).

- **Client-Side Vocabulary Vault Caching & Zero-Egress Engine (Phase 529 / `js/api.js`)**:
  - Implemented high-speed in-memory client-side caching (`VAULT_CACHE_KEY`, 5-minute TTL) for `fetchVaultWords` and `fetchVaultTopics`.
  - Added fast-path cached retrieval in `generateTestQuestions`: tests generate questions directly from memory in **0ms** with zero network roundtrips and **0 byte egress**.
  - High-speed in-memory filtering: searching words, filtering by topic/level takes **< 2ms** (over 50,000x faster than network fetch).
  - Cache Invalidation: Automatically cleared upon any modifying operation (`importVaultWords`, `deleteVaultWord`, `updateVaultWord`, `clearApiCache('vault')`, `clearAdminCache('vocabulary_vault')`).
  - Benchmarked via `scripts/test_vocab_caching_performance.mjs`: cold fetch 1,581ms $\to$ warm fetch **0.03ms**.

- **Table Header Grid Architecture & 2px Section Dividers (Phase 528 / Rule 4.1 & Rule 2.21)**:
  - **Thin Gridlines (1px)**: Thin vertical dividers (`border-right: 1px solid rgba(255, 255, 255, 0.12) !important;`) applied between all header columns, and thin horizontal dividers (`border-bottom: 1px solid rgba(255, 255, 255, 0.12) !important;`) between Row 1 super-headers and Row 2 sub-headers. Last column right border suppressed.
  - **Thick Section Dividers (2px)**: Thick horizontal divider (`border-bottom: 2px solid rgba(255, 255, 255, 0.28) !important;`) cleanly separates header area from table body (`tbody`) across single-tier and two-tier tables. Thick horizontal divider (`border-top: 2px solid rgba(255, 255, 255, 0.28) !important;`) separates table body from table footer (`tfoot`, summary row).

- **Active Supabase Project Migration (Phase 527 / `lgzkbmsyqhvdjirbyzsg`)**:
  - Successfully migrated from the old full database (`oclajpyumehpojepcczg`) to the brand-new clean Supabase project (`lgzkbmsyqhvdjirbyzsg`).
  - All 29 migrations deployed via direct PostgreSQL; all 13 canonical tables created with active RLS, RPC scoring (`emergency_submit_attempt`), and auto-close functions.
  - 100% clean data restored: 3 institutions, 5 programs, 4 levels, 10 batches, 17 classes, 13 class-levels, 114 students, 13 modules, 68 tests, 2,141 vocabulary vault items, 845 authoritative best-score attempts, 72 audit logs.
  - Active frontend configuration updated: `js/supabase.js` (`SUPABASE_CLOUD_URL = 'https://lgzkbmsyqhvdjirbyzsg.supabase.co'`, `SUPABASE_CLOUD_ANON_KEY = 'sb_publishable_LrCQQcnozGAq5Ea6Mov8lQ_hxrRE-P6'`) and `.env`.
  - Diagnostics and system health audit 100% verified green across all tables.

- **Master Catalog In-Memory Caching & Live Monitor Egress Shield (Phase 526 / Option 1–3)**:
  - **In-Memory TTL Caching for Master Catalogs (`js/api.js`)**: Implemented 60-second TTL in-memory caching in `adminFetchAll` for master catalog tables (`institutions`, `programs`, `classes`, `levels`, `batches`, `modules`, `site_settings`). Switching between batches, tabs, or program dropdowns executes in **0ms** directly from memory. Cache is automatically invalidated upon any mutating CRUD operation (`adminInsert`, `adminUpdate`, `adminSoftDelete`, `clearAdminCache`).
  - **Live Monitor Egress Shield (`js/api.js` & `js/admin/tests-access.js`)**: Purged bulky `accepted_answers_snapshot` and `correct_answer_snapshot` text blobs from the 5-second polling projection in `fetchLiveTestSessionData`. Reduced 5s polling payload size by **>95%** (from ~1.2 MB down to < 5 KB per poll).
  - **Smart Visibility Guard (`js/admin/tests-access.js`)**: Added `visibilitychange` listener that automatically pauses 5s polling when the tutor minimizes or switches browser tabs (`document.hidden`), preventing silent egress quota consumption in the background. Polling resumes immediately upon returning to the tab.
  - **Specific Field Projections (`js/admin/student-management.js`)**: Directly project `district, village` in `students` queries to eliminate unnecessary fallbacks.

- **Purge "pts" Text Suffix from Roster Exam Columns (Phase 525 / Rule 4.2.1 & Rule 2.3)**:
  - Removed textual suffix `pts` from all active curriculum test/exam cells (`Exam 1`, `Exam 2`, `Exam 3`, `Exam 4`, and discrete tests) and summary footer averages in `js/admin/student-management.js`.
  - Cells now render pure numbers (e.g. `95`, `229`, `136.5`, `169`, `287`), eliminating two-line wrapping on decimal numbers like `136.5 \n pts`.
  - Normalized font weight from bold `fw-700` to `font-weight: 500` per Header-Only Bold Discipline (§2.3) and locked with `white-space: nowrap !important;`. Rich hover tooltips (`Theme C Total Exam Points: 136.5 pts (82%)`) remain active.

- **Table Single-Line Invariant & Class Hub Sub-Header Remediation (Phase 524 / Rule 4.2.1 & Rule 2.21)**:
  - **Single-Line Non-Wrapped DOB**: `DOB` column width expanded from `96px / 92px` to `110px / 105px` in `js/admin/student-management.js` and `.student-cell-view` globally enforced with `white-space: nowrap !important; overflow: hidden; text-overflow: ellipsis;`. Eliminates 2-line wrapped birth dates like `16 Oct \n 2004`.
  - **Header Clipping & Cell Font Weight**: Photo column calibrated to `46px / 42px` to eliminate left-edge clipping on `PHT`. Gender cells normalized from bold `fw-700` to `font-weight: 500` per Header-Only Bold Discipline.
  - **Class Hub Theme Sub-Headers**: Resolved `:-FLEX;` artifact in `#class-attendance-grid` sub-headers by stripping raw HTML template strings from column `label` definitions in `js/admin/app.js` and escaping attributes in `js/admin/datagrid.js`. Columns now cleanly display `PROGRESS`, `SCORE`, `POINTS`, and `GRADE` with proper theme quadrant accent colors (`--quad-a`, `--quad-b`, `--quad-c`, `--quad-d`) applied via CSS.

- **Lean Storage Architecture & Best Score Retention (Phase 523 / Option B / Rule 2.24 & Rule 2.10)**:
  - **Zero Telemetry Spam in Supabase**: Student focus loss events (`CHEAT_ATTEMPT`, window blur, visibility change) are handled purely client-side via `sessionStorage` in `js/api.js` (`logCheatingEvent`). Warning overlays, strikes (1-10), and auto-submit penalty remain 100% active in-browser, while eliminating thousands of redundant log rows from `public.audit_logs`.
  - **Authoritative Best Score Guard & Superseded Answers Purge**: In `js/api.js` (`submitTest`), each completed attempt evaluates against prior attempts for that `(student_id, test_id)`. If the new attempt is higher, it becomes `is_best_score: true`, demoting older attempts and automatically purging their superseded `attempt_answers` rows. If the retake scores lower, its answers are purged while leaving the official best score intact. At most 1 active answer set exists per student per test.
  - **Authoritative Dummy Account Standard ("Top") & Ultra-Compact Avatar Rule (Rule 2.24 & 5.2)**: Canonical dummy name is strictly "Top" (e.g. `Top`, `Top Evnikom`, `Top Anon`), permanently deprecating "Test" and "test_anon". Dummy avatars strictly use zero-egress SVG data URIs (~1.2 KB) via `generateAvatarDataUri('Top')`, eliminating storage bucket bloat.
  - **Production Database Cleanliness Verified**: Production database pruned of 145,226 legacy `attempt_answers` rows and 1,713 cheat spam rows; 845 official best-score attempts, 114 students, 68 tests, and 2,141 vocabulary vault items preserved 100%.

- **Table Header & Sub-Header Typography Standardization (Phase 522 / ui-invariants §2.3 & §4.1)**:
  - **Single Headers (40px)**, **Super-Headers (30px)**, and **Spanning Standalone Headers (rowspan="2" / 60px)**: strictly locked to `font-weight: 700` (Bold).
  - **Sub-Headers (child columns beneath super-headers, 30px)**: strictly locked to `font-weight: 400` (Regular — STRICTLY NOT BOLD), preventing heavy visual clutter in two-tier matrix tables.
  - Resolved CSS cascade bug in `css/admin/admin-tables.css` and `css/admin.css` where `#admin-console table thead th` previously forced all headers to 700 bold. Recompiled minified CSS bundle cleanly.

- **Global System Acceleration (Phase 521)**:
  - **Domain 1 (Developer / Agent Feedback Loop)**:
    - Parallel Pool Concurrency (`test_smart.mjs`): Targeted test suites execute concurrently via `Promise.all` + buffered I/O, cutting run duration from 5.00s to **2.23s**.
    - Auto-Hash In-Memory CSS Cache Guard (`build_admin_css.mjs`): Source hashes compared in memory; unchanged builds return instantly with **0ms cache hit** and zero disk I/O.
    - Anti-Recursive Execution Guard: Dedicated runner filter prevents self-execution fork bombs.
  - **Domain 2 (Frontend Runtime & Browser Performance)**:
    - Batched Off-DOM Table Rendering (`js/admin/datagrid.js`): Table rows assembled in memory via `DocumentFragment`, reducing $N$ live DOM reflows to a single atomic insertion.
    - Consolidated Minified Master Stylesheet: Consolidated `css/admin.min.css` (173 KB, -23.3%) replaces 5 separate stylesheet roundtrips in `admin.html`.
    - Parallel ES Module Preload Graph: 11 `<link rel="modulepreload">` tags in `admin.html` preload core dependencies concurrently, eliminating waterfall network delays.

- **Standard Student Name & Dashboard-Only Title Rule (Phase 509 & 520 / Rule 2.23 & ui-invariants §2.8 & DECISION-053)**:
  - Default Principle: Student names are authentic standard names (`studentName` / `name` / `students.name`) across the entire system.
  - The **Student Dashboard** (`dashboard.html` / `js/dashboard.js`) is the **SOLE location in the system** where gender honorific titles (`Mr.` / `Miss`) or champion royal titles (`King` / `Queen`) are attached for presentation.
  - Database Cleanliness: All 49 legacy student records in Supabase PostgreSQL `students` table containing `Mr.` / `Miss` have been permanently cleaned via migration `20261114000003_strip_honorifics_from_student_names.sql`. Total titled students in DB is now **0**.
  - Floating Windows & Modals Defense: `Live Test Session Monitor` (`js/admin/tests-access.js`), `Inspect Answers Peek Modal`, `Late Joiners Checklist`, `Student Integrity Alarm Modal`, and Admin Dossiers render clean student names directly with defensive read sanitization.

- **Frontend**: Vanilla HTML5 + modern CSS3 + modular ES6 JavaScript (`js/` modules). Deployable via Netlify/Vercel.
- **Adaptive Header Abbreviations & Invariants (Phase 516 / ui-invariants §4.2.2)**:
  - Header text dynamically resolves via `resolveHeaderLabel(label, widthPx)`:
    - Width $< 55\text{px}$: 3-Letter Micro Form (e.g. `LVL` for Level, `PHT` for Photo, `PRG`, `SCR`, `PTS`, `GRD`, `ACT`).
    - Width $55\text{px} - 84\text{px}$: 5-Letter Medium Form (e.g. `LEVEL`, `PHOTO`, `GNDER`, `STATS`).
    - Width $\ge 85\text{px}$: Full Form (e.g. `EDUCATION`, `CITY / DISTRICT`, `PROVINCE`). Note: `DATE OF BIRTH` / `DOB` strictly standardizes to `DOB` across all column widths to prevent text clipping (`DATE OF BIRTI`).
  - Column resizer (`initColumnResize`) updates header labels on-the-fly during drag and double-click auto-fit. Full title always preserved in `title="..."` attribute.
  - Narrow header protection: `padding: 0 2px !important` on headers $\le 55\text{px}$, sort icon 10px with 2px gap, `overflow: hidden;`, eliminating sort arrow spillover (`EVEL` / `▲PHOTO`).
- **Education & Geographical Standards (Phase 513–514 / ui-invariants §4.2.3–§4.2.6)**:
  - Education normalized to pure English terms (`Kindergarten`, `Elementary School`, `Junior High School`, `Senior High School`, `Diploma Degree`, `Bachelor's Degree`, `Master's Degree`, `Doctorate Degree`). Zero graduation year displayed.
  - Demographic column sequence strictly locked: `DOB` $\to$ `AGE` $\to$ `EDUCATION` $\to$ `CITY / DISTRICT` $\to$ `PROVINCE`.
  - Province standard abbreviations (`NTB`, `NTT`, `DIY`) & English cities (`Mataram City`, `West Lombok Regency`).
  - Master Edit Mode: Education, Province, and City use centered dark `<select>` dropdowns; City dropdown dynamically follows selected Province.
- **Table Footer Height Standard (Phase 514 / ui-invariants §4.1)**:
  - Table footer summary row (`tfoot tr`, `tfoot td`, `.datagrid-summary-row`) strictly locked to **40px height** (`height: 40px !important; line-height: 40px !important; padding: 0 8px !important;`), matching 40px Sub Panel and 40px table headers.
- **3-Tier Table Header Architecture & Invariants (Phase 512 / ui-invariants §4.1)**:
  - **Single Header**: 40px height (`height: 40px !important; line-height: 40px !important; font-size: 12px; font-weight: 700;`).
  - **Super-Header**: 30px height (`height: 30px !important; line-height: 30px !important; font-size: 12px; font-weight: 700; colspan >= 2`).
  - **Sub-Header**: 30px height (`height: 30px !important; line-height: 30px !important; font-size: 12px; font-weight: 400 !important;` — **Regular weight, strictly not bold**).
  - **Spanning Standalone Header**: 60px height (`height: 60px !important; line-height: 60px !important; vertical-align: middle !important; font-weight: 700 !important; rowspan="2"`). Standalone columns span full 60px height.
  - **Universal Header Centering**: All table headers centered (`text-align: center !important; justify-content: center !important;`).
- **Student Name Honorific Titles Scope & Dashboard-Only Exclusivity (Phase 509 / Rule 2.23 & ui-invariants §2.8)**:
  - Gender honorific titles (`Mr.` / `Miss`) and royal titles (`King` / `Queen`) are strictly exclusive to the Student Dashboard (`dashboard.html` / `js/dashboard.js`). Pure clean names system-wide.
- **4-Pillar Progression Palette Standard (Phase 500 & 510 / §2.10.1)**:
  - Official Palette: **Electric Pink (`#ff2d87`) – Orange (`#ff8c00`) – Lime (`#95ff00`) – Purple (`#c084fc`)**.
  - **Star (★) & Section A Token Source Independence**: Both use Electric Pink (`#ff2d87`), strictly decoupled (`--grade-star` vs `--quad-a`).
- **Single-Screen 100vh Viewport Lock**:
  - `html, body { height: 100vh; overflow: hidden; }`
  - `#admin-console { height: calc(100vh - 60px); }` (offsetting docked bottom banner).
  - Canonical 40px Sub Panel, 40px table headers/footers, 30px in-panel buttons, 10px container gap.
- **Unified Color SSOT (Rule 2.10)**:
  - Star (★, 100%) Electric Pink (`#ff2d87`). One-Touch Global Propagation: Merah -> Grade E, Kuning -> Grade C, Hijau -> Grade A.

---

## 2. Recent Active Milestones (Rolling Window: Phases 515–539)

Full historical phase logs are maintained in [`docs/CHANGELOG.md`](file:///docs/CHANGELOG.md) and [`docs/archive/`](file:///docs/archive/).

- **Phase 539 — Onboarding Pop-up Modernization: WELCOME (All-in-One Profile) & SMILE! (Photo Setup Modal Title Area & Divider)**:
  - **Pop-Up 01: WELCOME (All-in-One Profile Setup)**:
    - Merged Profile and Address onboarding into a single unified 350px dialog (`#introduce-setup-modal`).
    - Standardized Title to **`WELCOME`**, followed immediately by Student Name with thin bottom divider line.
    - Square 110×110 px gender selection cards with SVG Mars (♂) and Venus (♀) and labels "Mister" and "Miss".
    - 3 thematic section dividers: `DATE OF BIRTH`, `EDUCATION`, and `ADDRESS`.
    - Centered dropdown text alignment across Education and 4-tier Address (`Province` $\to$ `Regency` $\to$ `District` $\to$ `Village`).
    - Smart dropdown suggestion: top age-appropriate suggestion promoted to the top, separated by clean divider `──────────`, followed by remaining options in alphabetical A–Z order (no `★` or `(Suggested)` labels).
    - Mandatory 7-field validation gate: `SAVE & CONTINUE` remains strictly disabled until Gender, DOB (Day, Month, Year), Education, Province, Regency, District, and Village are all selected.
  - **Pop-Up 02: SMILE! (Photo & Mic Setup Modal)**:
    - Title modernized to **`SMILE!`** per user command.
    - Standardized 40px Title Area (`.photo-modal-header`) with formal bottom divider line (`border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;`) adhering strictly to `ui-invariants.md` §1.5.1.
    - Redundant student name (`#photo-student-name`) above the photo removed from the visual DOM.
    - Strict 10px spacing invariant across webcam viewport (200×200 px), camera button (50×50 px), and verification status cards (Photo & Mic 40px each).
    - Total modal height 495 px (~58% viewport, strictly within 75vh–80vh limit, zero empty void).
    - All 50 JS files passed AST syntax validation; all regression suites 100% green. Low-res screenshots verified.

- **Phase 520 — Standard Student Name Database Remediation & Floating Windows Sanitization**: Resolved root cause of honorific titles appearing in floating windows (`Live Test Session Monitor: Theme A` from screenshot). Discovered and cleaned 49 legacy student records in Supabase PostgreSQL `students` table where `Mr.` / `Miss` had been prepended by legacy code prior to Phase 509. Authored migration `20261114000003_strip_honorifics_from_student_names.sql` and updated all 49 rows via Supabase API (verified 0 titled records remaining in DB). Added defensive sanitization in `js/admin/tests-access.js` across Live Test Session Monitor table rows, late joiners list, answer peek modal, alarm details, and expel confirm dialogs. Enhanced `scripts/test_student_title_exclusivity.mjs`. All 48 test suites pass 100%.

- **Phase 519 — Student Identity & Address Super-Header Architecture & 4-Tier Address Integration**: Restructured Student Roster matrix headers: permanently eliminated `DEMOGRAPHIC` category; absorbed `DOB`, `AGE`, and `EDUCATION` into Super-Header 1 `STUDENT IDENTITY` (`colSpan: 7`: `LEVEL`, `PHOTO`, `GENDER`, `NAME`, `DOB`, `AGE`, `EDUCATION`); instituted Super-Header 2 `ADDRESS` (`colSpan: 4`: `VILLAGE`, `DISTRICT`, `CITY / REGENCY`, `PROVINCE`). Integrated `VILLAGE` (130px) and `DISTRICT` (130px) columns with interactive Master Edit Mode text inputs and local storage caching. Created migration `20261114000002_add_student_district_and_village.sql`. Updated search keys, summary averages, and profile drawer display. All tests pass 100%.
- **Phase 518 — Geographical Standardization (CITY / REGENCY -> CT/RG & C/R) & Progressive Profiling Architecture**: Standardized column and field terminology from `City / District` to `City / Regency` across Admin Roster, DataGrid dictionary, and Student Dashboard onboarding modal. Codified authoritative abbreviations: Full Form `CITY / REGENCY`, 5-Letter Medium `CT/RG` (along with `RGNCY` & `CTY`), and 3-Letter Micro `C/R`. Added dictionary mappings for upcoming `DISTRICT` (`DISTR` / `DST`) and `VILLAGE` (`VILLG` / `VLG`). Designed progressive profiling architecture: macro levels (`City / Regency` & `Province`) managed in Admin Roster, and micro levels (`District` & `Village`) completed progressively by students in their student dashboard profile drawer. All 48 regression tests pass 100%.
- **Phase 517 — Demographics (Province & City) Supabase Cloud Migration & Live Verification**: Successfully verified remote Supabase database execution of `province` and `city` columns on `public.students`. Updated `student-management.js` to select `province, city` on all student queries (`renderStudents`, `openStudentDrawer`, `openStudentDossier`) and locked `_dbHasAddressColumns = true`. Verified live cloud read/write roundtrip via `@supabase/supabase-js` (`status: 200, error: null`). Fixed query column in `progress` from non-existent `level_id` to `unlocked_level`, eliminating yellow schema warnings. Upgraded toast styling in `css/style.css` to solid opaque background (`#0f172a !important`) with `z-index: 99999` to permanently prevent translucent text overlap.
- **Phase 516 — Automatic Adaptive Header Abbreviations & Sort Icon Spacing Protection**: Codified Table 2 Row 24: `PHOTO` -> 5-letter `PHOTO`, 3-letter `PHT` (and `PHO`). Integrated `resolveHeaderLabel` engine in `DataGrid` (`js/admin/datagrid.js`), automatically choosing 3-letter micro abbreviations for column width $< 55\text{px}$ (`LVL`, `PHT`, `PRG`, `SCR`, `PTS`, `GRD`, `ACT`), 5-letter medium form for width $55\text{px} - 84\text{px}$ (`LEVEL`, `PHOTO`, `GNDER`, `STATS`), and Full Form for width $\ge 85\text{px}$ (`EDUCATION`, `CITY / DISTRICT`, `PROVINCE`). Header labels dynamically update during column resizing. Protected narrow headers ($\le 55\text{px}$) with `padding: 0 2px !important`, 10px sort icon, and `overflow: hidden;`, completely eliminating sort icon spillover and left-edge text clipping (`EVEL` / `▲PHOTO`). All tests pass 100%.
- **Phase 515 — Global Development & Testing Acceleration Pipeline**: Replaced 50 sequential Windows `execSync('node --check')` spawns in `check_all_js_syntax.mjs` with in-process AST validation via `vm.SourceTextModule` (ESM) and `vm.Script` (CJS), slashing syntax check time from ~15s to **0.14s** (>100x speedup). Built Git-aware Smart Runner (`scripts/test_smart.mjs`) for targeted preflights in **< 1.5s**. Architected 2-Phase Concurrency Pool Parallel Runner (`scripts/run_all_tests_parallel.mjs`) with sequential CSS pre-build to eliminate race conditions and prioritized browser suites, slashing regression run time to guarantee zero Antigravity backgrounding. Standardized `package.json` scripts (`npm test`, `test:fast`, `test:full`, `test:syntax`). All tests pass 100%.
- **Phase 514 — Education English Normalization, Edit Mode Dropdowns & 40px Table Footer**: Normalized all education entries to pure formal English (`Kindergarten`, `Elementary School`, `Junior High School`, `Senior High School`, `Diploma Degree`, `Bachelor's Degree`, `Master's Degree`, `Doctorate Degree`) and purged all graduation years. Converted Edit Mode inputs for Education, Province, and City into centered dark dropdowns (`<select class="student-inline-select text-center">`) with dynamic dependent linking (City dropdown automatically updates to match the selected Province). Standardized table summary footer height strictly to 40px (`height: 40px !important; line-height: 40px !important;`). All 48 regression test suites pass 100%.
- **Phase 513 — Student Roster Header Grouping (`STUDENT IDENTITY` & `DEMOGRAPHIC`) & Geographical Standards**: Formed Super-Header 1 `STUDENT IDENTITY` (`colSpan: 4`: `LEVEL`, `PHOTO`, `GENDER`, `NAME`) and Super-Header 2 `DEMOGRAPHIC` (`colSpan: 5`: `DOB`, `AGE`, `EDUCATION`, `CITY / DISTRICT`, `PROVINCE`). Enforced sequence: Education directly after Age; City always to the left of Province. Standardized province abbreviations (`NTB`, `NTT`, `DIY`) and English city names (`Mataram City`, `West Lombok Regency`). Numbers-only age format and universal table header centering. All 48 regression test suites pass 100%.
- **Phase 512 — 3-Tier Header Architecture, 60px Spanning Standalone Headers & Regular Sub-Header Typography**: Implemented universal 3-tier header standards across all two-tier matrix tables. Standalone headers span `rowspan="2"` with 60px height, eliminating half-cut 30px clipping. Standardized sub-headers to regular weight (`font-weight: 400 !important; font-size: 12px;`). Synchronized `DataGrid` engine auto-fit and column resizer. All 48 regression test suites pass 100%.
- **Phase 511 — Student Mobile Pop-up 06 (Profile Drawer / PROFILE) & Change PIN Modal (#change-pin-modal)**: Refactored `#profile-modal` into an authoritative single-page Executive Academic CV per user directive. Biodata Stacked Beside Photo: Avatar with camera badge on left; Student Name (`Mr. Ahmad Nur Suhendro`), Gender (`Male (Mr.)`), DOB (`1 Jan 2005`), and Age (`(21 yrs)`) neatly stacked vertically on the right. 4-Tier Residential Address: Hierarchical descending stack (`PROVINCE` $\to$ `CITY / REGENCY` $\to$ `DISTRICT` $\to$ `VILLAGE`) with numbered badges (1 to 4) and 100% Zero-Truncation per Rule 2.21. Auto-Calculated Education by Age: Smart calculation via `getEducationEligibility(age)` determining official tier (`Senior High School (SMA/SMK)`) with green `Verified` pill and subtitle `Auto-Calculated by Age (21 yrs)`. Security Action Row & Dedicated Pop-up Modal: Replaced bulky in-line PIN form with a sleek action row (`Personal PIN •••• Active`) and glowing `CHANGE PIN` button that opens a dedicated compact 350px dialog (`#change-pin-modal`). Spatial Verification: Profile modal height strictly 537px (< 64% viewport, 307px vertical clearance, 100% zero scroll). Change PIN modal height strictly 398px (< 50% viewport). Both equipped with dedicated 60px footers and 40px action buttons. Zero emojis (100% vector SVGs). Side-by-side comparison image and viewer generated. All tests pass 100%.

---

## 3. Standing Governance & Execution Boundaries

- **Rule 0.1.1 (Strict Git Gate)**: NEVER execute `git commit` or `git push` autonomously. All changes remain uncommitted for user review.
- **Rule 0.1.2 (Strict UTF-8 / No PowerShell File Piping)**: NEVER use PowerShell file cmdlets (`Set-Content`, `Get-Content`, `Out-File`, `-replace`) to edit or write files. All file edits must strictly use Antigravity native file tools or Node.js `fs` with explicit `'utf8'`.
- **Rule 2.10 (Authoritative Color SSOT)**: Zero raw hex codes. All colors must use CSS variables or `TOPSCORE_COLORS`.

---

## 4. Verification Suite Status

- **Syntax Validation**: 50/50 JavaScript files PASS (`scripts/check_all_js_syntax.cjs`).
- **Cache Manifest**: 25/25 cache assets exist on disk (`scripts/generate_sw_manifest.mjs`).
- **Spatial Checker**: 100% PASS (`.agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs`).
- **Continuous Dividers & Super Headers**: 12/12 PASS (`scripts/test_class_hub_super_headers_and_continuous_dividers.mjs`).
- **Regression Suite**: 48/48 test suites PASS (`npm.cmd test`).

---

## 5. Next Exact Action

- Advance to **Pop-up 07: Profile Drawer — History Tab** or user's next directive. All changes remain uncommitted in the working tree for user review per Rule 0.1.1.
