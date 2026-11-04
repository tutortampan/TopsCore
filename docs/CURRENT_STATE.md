# CURRENT STATE

Last Updated: 2026-11-05 00:50 UTC+8
Current Phase: Phase 313: 7/7 Mastery Action Button Redesign to White Forward Arrow in Green Box [COMPLETE]
Status: COMPLETE

## Completed Work:
1. **Phase 313: 7/7 Mastery Action Button Redesign to White Forward Arrow in Green Box [COMPLETE]:**
   - **White Forward Arrow in Green Box (`js/dashboard.js`, `css/dashboard.css`)**:
     - When a student completes 7/7 passes on a task item, Section 6 action button displays a white forward arrow icon (`stroke="#ffffff"`) enclosed in a pure green box (`#00c000`, `--grade-star`).
     - Button dimensions: `32px` $\times$ `28px`, border-radius: `6px`, with green star glow and high-contrast styling.
     - Clicking button launches `test.html?id=<testId>` to continue repetition or advance.
   - **Verification**:
     - `scripts/test_7x7_gating_and_pass_button_e2e.mjs`: PASS 100% (Verified 7/7 button renders white forward arrow in `#00c000` green box).
     - Generated verified artifact: `dashboard_7x7_mastery_white_arrow_verified.png`.
     - 42/42 JS syntax checks: PASS.
     - `npm test`: PASS 100%.
     - Cache buster updated to `v=20261105_v125` in `dashboard.html`.

2. **Phase 312: 7×7 Repetitive Mastery Gating & Dynamic Pass Counter Action Button [COMPLETE]:**
   - **Section 3 Cleanup**:
     - Purged legacy `#btn-lobby-flashcards` button from `#dashboard-grade-legend` in `dashboard.html`.
     - Completely eliminated the mystery number "40" from Section 3.
   - **7×7 Repetitive Mastery Gating (`js/dashboard.js`, `js/api.js`, `supabase/functions/start-test/index.ts`)**:
     - Task items strictly enforce `passCount >= 7` with score $\ge 70\%$ (or `is_forgiven`) before a task is considered completed.
     - Next Assessment remains locked on the current task until 7 passes are reached.
     - Fixed topic code regex parsing: `parseInt(String(topicCode || '').replace(/^[A-Za-z]+/, ''), 10)` in both client dashboard and Edge Function, resolving the `parseInt('C2') === NaN` bug.
     - In `startTest`, prerequisite task validation verifies `passCount >= 7`.
   - **Dynamic Pass Counter Action Button (`js/dashboard.js`, `css/dashboard.css`)**:
     - Replaced static retry button with interactive pass counter badge (numbers 0 to 7) matching official TopsCore grade tiers:
       - 0–1 passes: Red (`#FF0000`, Grade E tier).
       - 2–3 passes: Dark Orange (`#FF8C00`, Grade D tier).
       - 4 passes: Yellow (`#FFFF00`, Grade C tier).
       - 5–6 passes: Electric Lime (`#95ff00`, Grade B tier).
       - 7 passes: Pure Green Play button (`#00c000`, Grade A / Star tier) indicating 7×7 completion.
     - Clicking button immediately launches `test.html?id=<testId>` to begin the next repetition.
     - Synchronized Section 5 repetitions row with active task progress.
   - **Verification**:
     - `scripts/test_7x7_gating_and_pass_button_e2e.mjs`: PASS 100% (Verified on Queen Isnantika Salsabila: Section 3 clean `FAIL`, Section 5 `1/7`, Section 6 stays on C1 with button `1` in Red E tier).
     - 42/42 JS syntax checks: PASS.
     - `npm test`: PASS 100%.

2. **Phase 311: Dual-Column Prerequisite Synchronization & Test Prerequisite Update Fix [COMPLETE]:**
   - **Root Cause Resolution**:
     - Database table `tests` contains both `prerequisite_test_id` and legacy `prerequisite_id`.
     - `crud-modals.js` only updated `prerequisite_test_id` and left `prerequisite_id` stale, causing table fallback `r.prerequisite_test_id || r.prerequisite_id` to continue displaying the old prerequisite.
   - **Dual-Column Synchronization (`js/api.js` & `js/admin/crud-modals.js`)**:
     - Enforced bi-directional synchronization in `adminInsert` and `adminUpdate` for table `'tests'`.
     - Updated `openCrudModal` to resolve existing prerequisite across both columns and display `[${shell_code}]` prefix in dropdown.
     - Updated save handler to pass both `prerequisite_test_id` and `prerequisite_id`.
   - **Database State (`public.tests`)**:
     - Synchronized `2C1-WORDS-TASK` (`prerequisite_test_id = null`, `prerequisite_id = null`).
     - Synchronized `3A1-PHRASES-TASK` (`prerequisite_id = '2439a060-2292-4280-a70e-5cfb15b93065'`).
     - Zero mismatches remaining across active tests.
   - **Verification**:
     - `scripts/test_prerequisite_update_e2e.mjs`: PASS (100% verified: C1 row shows "—" with no warning badge).
     - 42/42 JS syntax checks: PASS.

2. **Phase 310: Student Dashboard Blueprint Alignment & Dual-Panel Completed Tests with Retry [COMPLETE]:**
   - **Student Dashboard Blueprint Height Alignment (`dashboard.html`, `css/dashboard.css`)**:
     - Top Bar: strict `50px`.
     - Students Metadata Card: strict `150px`.
     - Grade Description Card: strict `40px` (dynamically displays only the single description of the student's evaluated grade e.g. `VERY GOOD`, `GOOD`, `ENOUGH`, etc.; strictly blank `""` when no exam is taken yet).
     - Class Selector Bar: strict `40px` (unified modal list trigger).
     - Repetition Points Row: strict `40px` (7 square boxes for Vocab, or last assessment for non-vocab).
     - Next Assessment Bar: strict `40px` (full title on left, REPEAT / LOCK / GO on right).
     - Dynamic Dual-Panel Card: `flex: 1 1 0%` (absorbs dynamic remaining screen space).
     - Bottom Banner: strict `50px` (`TopsCore Â© 2026 | Created by Mr. Top`).
     - Vertical Gaps: uniform `10px` across the entire layout with zero window scroll.
   - **Section 7 Dual-Panel System with Completed Tests & Retry Button (`js/dashboard.js`, `dashboard.html`)**:
     - Dual-tab header with `#btn-dock-standings` (`RANKING : MY RANK`) and `#btn-dock-completed` (`COMPLETED TESTS`).
     - `#dock-pane-standings`: Batch Leaderboard roster table (NO, Avatar, Title Mr./Miss, Full Name, Point, Grade).
     - `#dock-pane-completed`: Completed tests table with newest completion at the very top (`submitted_at DESC`).
     - Covers both Tasks and Exams with type badge pills (`TASK` / `EXAM`).
     - Interactive `Retry` button (`btn-retry-test`) positioned directly beside each score, triggering `test.html?id=<testId>`.
     - State persistence across reloads via `sessionStorage` (`topscore_dock_tab`).
   - **Dynamic Theme & Border Color Directive**:
     - Dashboard cards dynamically inherit `--tier-color` and `--tier-rgb` with radial gradient background aura based on the student's overall evaluation grade (`â˜…`, `A`, `B`, `C`, `D`, `E`).
   - **Verification & Tests**:
     - 42/42 JS files syntax check PASS (`node scripts/check_all_js_syntax.cjs`).
     - 100% CI test suite PASS (`npm test`).
     - Playwright E2E verification PASS (`scripts/test_dashboard_blueprint_e2e.mjs`):
       - Verified all section heights match expected blueprint: 50px, 150px, 40px, 40px, 40px, 40px, flex 1, 50px (diff 0.0px).
       - Verified dual tab switching between Leaderboard and Completed Tests.
       - Verified descending completion sorting (`submitted_at DESC`, newest on top).
       - Verified `Retry` buttons on every row beside score.
       - Verified mobile viewport (390 x 844) preserves layout and heights.
       - Screenshots archived: `dashboard_blueprint_completed_tab_verified.png`, `dashboard_blueprint_standings_tab_verified.png`, and `dashboard_blueprint_mobile_verified.png`.
   - **Cache Buster**: Bumped to `v=20261104_v123` across `dashboard.html`, `js/dashboard.js`, and `css/dashboard.css`.

2. **Phase 309: Inline Manual Exam Grade Input with Bi-directional Sync & Toggle [COMPLETE]:**
   - **Manual Input Controller Architecture (`js/admin/app.js`)**:
     - State tracking: `window._manualInputState = { activeStudentIds: new Set(), drafts: {} }`.
     - Live bi-directional score $\leftrightarrow$ points calculation sync (`window.onMatrixExamScoreChange`, `window.onMatrixExamPtsChange`).
     - Persistent save controller: `window.saveRowManualInput`, `window.toggleRowManualInput`, and `window.toggleAllManualInputMode` calling `adminApplyForgiven` (`action: 'manual'`) with tutor name `"Mr. Top"` and audit logging.
   - **Header & Column Redesign**:
     - Super header changed to `"MANUAL INPUT"` (`super-hdr-manual-input`) across both THEME VIEW and ALL VIEW.
     - Header sub-tag: clickable toggle badge (`ðŸŸ¢ ON` / `âšª OFF`) allowing tutors to toggle all rows at once.
     - Row action button: replaced with interactive toggle button `âœï¸ EDIT` (when inactive) and `ðŸ’¾ SAVE` (when active).
   - **Inline Cells Transformation**:
     - When active: Exam Score % and Exam Points cells transform into sleek `<input type="number">` fields.
     - Real-time calculation: typing 80 in Score % auto-populates 96 in Points (out of 120), and vice versa.
     - On Save or Enter: updates Supabase database, re-renders grid, grants authentic Grade (e.g. Grade B `#95ff00`) and Points (96 PTS), displays `á´¹` superscript, and closes manual input mode back to `âœï¸ EDIT`.
   - **Verification & Tests**:
     - 42/42 JS files syntax check PASS (`node scripts/check_all_js_syntax.cjs`).
     - 100% CI test suite PASS (`npm test`).
     - Playwright E2E verification PASS (`scripts/test_manual_input_matrix_e2e.mjs`):
       - Verified super header `"MANUAL INPUT"` and `"âšª OFF"` badge.
       - Verified clicking `"âœï¸ EDIT"` on `Abdul Basit` opens inputs and changes button to `"ðŸ’¾ SAVE"`.
       - Verified typing `80` in score input calculates `96` in points input.
       - Verified clicking `"ðŸ’¾ SAVE"` persists to Supabase and updates matrix (`80%á´¹`, `96` PTS, Grade `B`).
       - Verified button returns to `"âœï¸ EDIT"`.
       - Verified ALL VIEW also supports `"MANUAL INPUT"`.
       - Screenshots archived: `manual_input_active_editing_verified.png`, `manual_input_saved_verified.png`, and `manual_input_all_view_verified.png`.
   - **Cache Buster**: Bumped to `v=20261104_v122` across HTML pages and core JS modules.

2. **Phase 308: Smart Conditional Student Name Abbreviation & Matrix Column Fit [COMPLETE]:**
   - **Smart Conditional Abbreviation Engine (`js/api.js`)**:
     - Built and exported `formatMatrixStudentName(name, maxChars = 19)`.
     - Preserves short names completely intact: if `cleanName.length <= maxChars` (e.g. 19 chars), no abbreviation is performed.
       - Verified: `Lalu Arman Maulana` (18 chars), `Lalu Nune Mubarak` (17 chars), `Abdul Basit` (11 chars), and `Alfina Damayanti` (16 chars) remain unshortened.
     - Automatically abbreviates titles when names exceed 19 characters:
       - `Muhamad`/`Muhammad` $\rightarrow$ `M.` (`Muhamad Alifurrahman` $\rightarrow$ `M. Alifurrahman`, `Muhammad Ariwil Asrori` $\rightarrow$ `M. Ariwil Asrori`, `Muhammad Afyani Farobi` $\rightarrow$ `M. Afyani Farobi`).
       - `Lalu` $\rightarrow$ `L.` and `Baiq` $\rightarrow$ `Bq.`.
       - Middle names abbreviated to single letter initials with a dot (`Adinda Karunia Farela` $\rightarrow$ `Adinda K. Farela`, `Lalu Yuda Handika Prawira` $\rightarrow$ `L. Yuda H. Prawira`, `Abdul Qoyyim Hanif Dahuri` $\rightarrow$ `Abd. Q. H. Dahuri`).
     - Preserves 100% full original names in database, hover tooltips (`title`), and student profile modals.
   - **Matrix Column Fit & Sticky Width Expansion (`css/admin.css` & `js/admin/app.js`)**:
     - Increased `col-sticky-4` (STUDENT NAME) width from 110px to 145px (`max-width: 140px;`).
     - Aligned sticky offsets: Col 5 (`left: 259px`), Col 6 (`left: 295px`), Col 7 (`left: 329px`).
     - Total table width in ALL VIEW remains compact (699px), fitting 100% on standard screens with ZERO horizontal scrollbar.
   - **Verification & Tests**:
     - 42/42 JS files syntax check PASS (`node scripts/check_all_js_syntax.cjs`).
     - 100% CI test suite PASS (`npm test`).
     - E2E Playwright verification PASS (`scripts/test_smart_names_matrix_e2e.mjs`):
       - Verified: 0 truncations across all 18 student rows (`Has '...': false`).
       - Verified: `Lalu Arman Maulana`, `Lalu Nune Mubarak`, and `Abdul Basit` are NOT abbreviated.
       - Verified: `Lalu Yuda Handika Prawira` $\rightarrow$ `L. Yuda H. Prawira`, `Adinda Karunia Farela` $\rightarrow$ `Adinda K. Farela`, `Muhamad Alifurrahman` $\rightarrow$ `M. Alifurrahman`.
       - Screenshots archived: `smart_names_matrix_verified.png` and `smart_names_theme_view_verified.png`.
   - **Cache Buster**: Bumped to `v=20261104_v121` across HTML pages and core JS modules.

2. **Phase 307: Attendance Matrix Theme & All View Blueprint Redesign [COMPLETE]:**
   - **Student Details Columns Natural Pedagogical Order (Left Pane)**:
     - Reordered 7 sticky columns in `js/admin/app.js` (`renderAttendanceGridMatrix`): `INSTITUTION | PROGRAM | BATCH | STUDENT NAME | PROGRESS | POINTS | GRADE` (previously `GRD | PROG | PTS`).
     - Aligned sticky offsets and widths in `css/admin.css` (`col-sticky-1` through `col-sticky-7`), with `col-sticky-last` drop-shadow separator on Col 7 (`GRADE`).
     - Clean POINTS display: rendered as pure numeric points without trailing "pts" text, dynamically inheriting score tier color (`getGradeColorByScore`).
   - **Academic Grade & Point Credit for Authentic Manual Override Scores**:
     - Upgraded `computeMilestoneExamMastery` in `js/grading.js`: `cleanExamEntries` now excludes ONLY pure forgiven 0% entries (`isPureForgivenZero = Boolean(e.isForgiven) && !e.isManual && Number(e.effPoints ?? e.points ?? 0) === 0`).
     - In `js/admin/app.js`, student gradebook metrics calculate authentic scores from completed exams (Rule 2.8), giving student `Test` Grade B (`#95ff00`) and 102 PTS from their 85% Exam A score instead of penalizing with unreached future weeks.
   - **THEME VIEW (`selectedTheme !== 'ALL'`)**:
     - Super Header 1: `[THEME NAME]` spanning over `TOPIC 1 | TOPIC 2 | TOPIC 3 | TOPIC 4 ...` (formative tasks).
       - Cell content: strictly high-contrast repetition progress badge (`7/7`, `6/6`, `1/6`, `0/6`), removing stacked `0%` text for clean readability.
     - Super Header 2: `EXAM` spanning over `SCORE | POINTS` (removes duplicate `TOT SCORE %` and `PTS EXAM PTS` columns).
     - Super Header 3: `ACTION` with sub-column `BUTTON` (eye icon button `ðŸ‘ï¸` linking to student profile).
   - **ALL VIEW (`selectedTheme === 'ALL'`)**:
     - Formative drill tasks are completely hidden.
     - Each active theme displays a compact 2-column block:
       `THEME A (SCORE | POINTS) | THEME B (SCORE | POINTS) | THEME C (SCORE | POINTS) | THEME D (SCORE | POINTS)`.
     - Exactly 15 columns total (7 student details + 8 theme exam cols), fitting 100% on the screen in `FIT SCREEN` mode with zero horizontal scrollbar.
   - **Verification & Tests**:
     - 42/42 JS files syntax check PASS (`node scripts/check_all_js_syntax.cjs`).
     - 100% CI test suite PASS (`npm test`).
     - Full Playwright E2E verification PASS (`scripts/test_matrix_theme_and_all_view_e2e.mjs`):
       - Verified Student Details column order (`PROGRESS | POINTS | GRADE`).
       - Verified Student "Test" has Points 102 and Grade B.
       - Verified Topic cells render strictly clean repetition badges (e.g. `1/6`, `6/6á¶ `).
       - Verified Super Headers (`STUDENT DETAILS | THEME A | EXAM | ACTION`).
       - Verified duplicate TOT/PTS columns eliminated.
       - Verified ALL VIEW has exactly 15 columns with formative tasks hidden.
       - Verified Theme A exam score `85%á¶ ` and `102` in ALL VIEW.
       - Screenshots captured and archived: `theme_view_verified.png` and `all_view_verified.png`.
   - **Cache Buster**: Bumped to `v=20261104_v120` across HTML pages and core JS modules.

2. **Phase 306: Configurable Task Mastery Repetitions & Blueprint Test System Settings [COMPLETE]:**
   - **Configurable Repetitive Mastery Requirements**:
     - Upgraded repetition engine in `js/grading.js`: `getTaskProgressVisual(passCount, targetReps)` and `computeTopicPassLevel(..., targetReps)` dynamically scale with class-specific `targetReps`.
     - Multi-tier settings persistence in `js/api.js`: `fetchClassTestSettings` and `saveClassTestSettings` support `site_settings` table, `localStorage` fallback, and inspection of `tests` table in DB (`minimum_required_score` and `payload.task_repetitions`).
     - Dynamic gating in `js/dashboard.js` and `js/api.js`: uses configured `targetReps` (e.g. 6) and `taskMinScore` (e.g. 50%) for task completion and topic gating.
   - **Attendance Matrix Repetition Progress**:
     - In `js/admin/app.js` (`renderAttendanceGridMatrix`): Vertically stacked `.asm-cell-task-wrap` in each topic column (`1, 2, 3, etc.`) rendering both the percentage score (`roundPct%` with `á¶ `/`á´¹`/`á´¿`) and high-contrast repetition badge `.asm-rep-badge` (`passCount/targetReps`).
     - Badges dynamically color-code: green (`#00c000`) when complete, cyan (`#38bdf8`) when in progress, muted slate (`#64748b`) when unattempted.
   - **Inline Blueprint Exam Passing Score Column**:
     - In the Blueprint / Class Tests table, replaced static text with `<input type="number" class="input-test-pass-score" ...>`.
     - Typing any percentage (1â€“100%) and pressing Enter or blurring automatically invokes `updateTestPassingScore(testId, newVal)` and updates the database record immediately.
   - **Centralized Test System Settings Panel**:
     - Built `js/admin/test-system-settings-modal.js` modal dialog allowing tutors to configure:
       - Target Repetitions (1â€“10x)
       - Task Minimum Passing Score (1â€“100%)
       - Exam Minimum Passing Score (1â€“100%)
       - Scope Selection (This Class vs Global Default)
       - Batch Apply Checkbox to update all existing tests in the class.
     - Accessible via `âš™ï¸ Test System Settings` button (`#btn-open-blueprint-settings`) in Class Tests tab and `âš™ï¸ Test Settings` button (`#btn-blueprint-bottom-settings`) in Vocabulary Vault Blueprint.
   - **Verification & Tests**:
     - 42/42 JS files syntax check PASS (`node scripts/check_all_js_syntax.cjs`).
     - 100% CI test suite PASS (`npm test`).
     - Full Playwright E2E verification PASS (`scripts/test_mastery_and_blueprint_settings_e2e.mjs`):
       - Verified `saveClassTestSettings` and `fetchClassTestSettings` (set to 6 reps, 50% task min score, 60% exam min score).
       - Verified `updateTestPassingScore` persisted to DB.
       - Verified 54 repetition progress badges rendered in matrix cells (`6/6` and `0/6`).
       - Verified 19 inline `PASS (%)` editable number inputs in tests table.
       - Verified Test System Settings modal opens, edits, and saves successfully.
       - Screenshots captured: `roster_matrix_repetition_progress_verified.png`, `blueprint_exam_pass_score_inline_verified.png`, and `test_system_settings_modal_verified.png`.
   - **Cache Buster**: Bumped to `v=20261104_v119` across all HTML pages, core JS modules, and admin controllers.

2. **Phase 305: Forgiven & Exam Manual Override Wizard (Pacing Adjustment) [COMPLETE]:**
   - **Context & Motivation**:
     - Class `2nd Vocabulary` (Batch `Camp 134`) already ran for 2 weeks offline. The tutor required students to begin directly from Week 3 (Theme C) without taking Week 1â€“2 tests online, while preserving curriculum integrity for future batches.
     - Implemented Solusi B: a 2-step Forgiven & Manual Override Wizard accessible from Class Hub (`admin.html#class-hub`).
   - **Backend API & Database**:
     - Migration `supabase/migrations/20261104130000_add_manual_override_column.sql`: validated `is_forgiven`, `forgiven_by`, `forgiven_at`, `forgiven_reason`, and `is_manual_override`.
     - `adminApplyForgiven` & `adminRevokeForgiven` in `js/api.js`: full support for batch/student filtering, forgiving formative tasks (`0%á¶ `), and manual exam scoring with Rule 2.10 grading enforcement (85% = Grade B, 102 PTS). Admin name `"Mr. Top"` embedded in audit logs and attempt reasons.
   - **Admin Wizard UI (`js/admin/forgiven-wizard-modal.js`)**:
     - Step 1: Batch dropdown filter, search input, quick select/clear all, dynamic chip count.
     - Step 2: Formative tasks grouped by Theme (A, B, C, D) with theme toggles, milestone exam radio (`Abaikan`, `Forgive 0%á¶ `, `Input Nilai Manual` with live bi-directional `%` $\leftrightarrow$ `PTS` calculation), Admin name (`Mr. Top`), audit reason input, `âš¡ Setel Cepat Pekan 1 & 2` preset button, and Revoke action.
     - Toolbar button `ðŸ›¡ï¸ Forgiven & Override` (`#btn-open-forgiven-wizard`) integrated into Class Hub.
   - **Admin Roster Grid Matrix**:
     - Superscripts `.asm-forgiven-sup` (`á¶ `, `#f59e0b`) and `.asm-manual-sup` (`á´¹`, `#38bdf8`) rendered in exam and task cells with rich tooltips displaying tutor name `"Mr. Top"`, date, and audit reason.
   - **Student Gating & Dashboard Bypass**:
     - In `js/dashboard.js`, forgiven tasks count as 7/7 passes to bypass the 7Ã—7 repetitive mastery gate.
     - Forgiven milestone exams unlock subsequent theme tasks (e.g. Forgiven Exam B unlocks Task C1).
     - Student dashboard displays `0%á¶  FORGIVEN` badge with `ðŸ“– Practice` button for optional review, and renders `á¶ ` / `á´¹` superscripts.
   - **Verification & Tests**:
     - 41/41 JS files syntax check PASS (`node scripts/check_all_js_syntax.cjs`).
     - 100% CI test suite PASS (`npm test`).
     - Full Playwright E2E verification PASS (`scripts/test_forgiven_wizard_e2e.mjs`): verified database records, manual exam override, modal interaction, roster superscript `á¶ `, student lobby display, and revoke.
     - Screenshots captured: `forgiven_wizard_modal_verified.png`, `class_hub_roster_forgiven_verified.png`, and `student_dashboard_forgiven_verified.png`.
   - **Cache Buster**: Bumped to `v=20261104_v118` across `admin.html`, `dashboard.html`, `result.html`, `test.html`, `js/dashboard.js`, `js/result.js`, `js/test.js`, and `js/admin/app.js`.

2. **Phase 304: Task Question Count Clamping, Permanent 50px Banners, and Strict Level Class Isolation [COMPLETE]:**
   - **Task Question Count Overload Resolved**:
     - Root cause: In `supabase/functions/start-test/index.ts`, `themes` was evaluated before `topicCode`, causing task `2A1` (`payload.themes = ['A']`) to query all 120 words of Theme A instead of topic A1 (40 words).
     - Fixed in both `supabase/functions/start-test/index.ts` and `js/api.js`: prioritized `topicCode` over `themes`, added multi-candidate code matching (`[topicCode.toUpperCase(), themeCode + topicCode, topicCode.replace(/^[A-Za-z]/, '')]`), and implemented a hard safety clamp against `test.total_questions` (Task = 40, Exam = 120/160).
     - Result: `2nd Vocabulary A1 Words Task` now loads exactly 40 questions (`0/40 Answered`) with 0 words from A2/A3.
   - **Permanent 50px Top and Bottom Banners in Test Runner**:
     - Converted test runner header into standard 50px top header: `<header class="dashboard-header test-header" id="test-top-header">` featuring Give Up button, student avatar circle, cloud sync indicator, and countdown timer badge.
     - Extracted `.test-title-bar` as an independent 34px strip above `.test-body`.
     - Relocated `<footer id="bottom-ad-banner" class="topscore-locked-banner">` to be a permanent direct child of `body.test-page` at the very bottom, fixed at 50px height (`flex-shrink: 0 !important; z-index: 100 !important;`).
     - Added Netlify floating badge collision suppression so bottom banner remains 100% visible on all viewports without being cut off.
   - **Strict Class Level Isolation**:
     - Fixed `fetchStudentClasses` in `js/api.js` to strictly filter by the student's current active level (`cLvlNum === studentLevelNum` or `c.level_id === levelId`), removing the cumulative `<=` comparison.
     - Updated `renderClasses` in `js/dashboard.js`: past level classes (`cLvlNum < studentLevelNum`) now only push to `completedClasses` for history review and are excluded from `activeClasses`.
     - Result: Student account `Test` (in `2nd Level`) only sees `2nd Vocabulary` in the `Select Class` modal, with `1st Vocabulary` completely isolated.
   - **Verification & Parity**:
     - 40/40 JS files syntax check PASS (`node scripts/check_all_js_syntax.cjs`).
     - 100% CI test suite PASS (`npm test`).
     - `node scripts/verify_phase_304_all_issues.mjs`: 24/24 E2E assertion checks PASS.
     - Captured and archived screenshots: `test_page_verified.png` (50px top header, 50px permanent bottom banner, 0/40 Answered) and `dashboard_classes_selector_verified.png` (only 2nd Vocabulary listed).
   - **Cache Buster**: Bumped to `v=20261104_v117` across `test.html`, `dashboard.html`, `result.html`, `admin.html`, `js/test.js`, `js/dashboard.js`, `js/result.js`, and `js/admin/app.js`.

2. **Phase 303: Auto-Generator Test Hierarchy Diagnostic & Prerequisite Chain Resolution [COMPLETE]:**
   - **Root Cause Identified**:
     - Investigated why auto-generating tests for 2nd Vocabulary produced only 11 tasks and 4 exams (15 records) instead of 15 tasks and 4 exams (19 records).
     - Diagnosed fatal bug in `upsertDynamicTestShell` (`js/api.js`): `legacyCodes` check for TASK shells unconditionally included EXAM shell codes (`${levelNum}${themeCode}-WORDS-EXAM`).
     - When generating Task 1 (e.g., `2A1-WORDS-TASK`), it matched existing `2A-WORDS-EXAM` and renamed it to `2A1`. `2A2` then pointed its prerequisite to that UUID.
     - When the Theme Exam generated at the end of the theme, it matched `2A1-WORDS-TASK` and renamed it back to `2A-WORDS-EXAM`.
     - Result: Exactly 4 tasks (A1, B1, C1, D1) were clobbered by the 4 exams, leaving 11 tasks and 4 exams, with A2 pointing to the Exam as its prerequisite.
   - **Architectural Fix in `js/api.js`**:
     - Strictly bifurcated `legacyCodes` in `upsertDynamicTestShell`: EXAM shells match only legacy exam aliases; TASK shells match only legacy task/quiz aliases for their specific topic.
     - Added class isolation: `classId` is now checked so tests from another class never collide.
     - Synchronized both `prerequisite_test_id` and `prerequisite_id` columns to guarantee unified relational integrity.
     - Protected `autoGenerateTestsHierarchy` with chunked pagination via `fetchVaultWords({ targetLevel: levelNum, limit: 10000 })` so levels with >1,000 words are never truncated.
     - Applied natural alphanumeric sorting (`localeCompare(undefined, { numeric: true })`) to prevent sorting anomalies like A10 before A2.
   - **Live Production Database Resync**:
     - Resynced `2nd Vocabulary` (`class_id: 2ccf6468-1e03-41d1-b72b-1d84dcad85b2`): exactly **15 Tasks** (A1â€“A3, B1â€“B4, C1â€“C4, D1â€“D4) + **4 Exams** = **19 tests** (19 records).
     - Resynced `3rd Vocabulary` (`class_id: ab33498a-90e6-44b7-83f4-5765f964543e`): exactly **32 Tasks** (16 Words + 16 Phrases) + **8 Exams** = **40 tests** (40 records).
     - Verified linear prerequisite sequence across all topics: A1 -> A2 -> A3 -> A Exam -> B1 -> ... -> D Exam.
   - **System Answers to User Inquiries**:
     - Verified and documented that test auto-generation runs automatically in two scenarios: (1) upon Excel import in Vocabulary Vault via `autoSyncClassTestsForLevel({ force: true })`, and (2) upon Class Hub load as a self-healing mechanism when a class has 0 tests. Manual triggers via the Wizard button are also available.
   - **Verification & Parity**:
     - 40/40 JS files syntax check PASS (`node scripts/check_all_js_syntax.cjs`).
     - 100% CI test suite PASS (`npm test`).
     - E2E test suite PASS: 19/19 tests green (`node scripts/e2e_unified_code_verification.mjs`).
     - Live browser screenshot captured: `class_hub_vocab2_19_tests_verified.png` showing `âš¡ 15 Tasks | ðŸ“ 4 Exams | 19 records`.
   - **Cache Buster**: Bumped to `v=20261104_v116` across `admin.html`, `js/admin/app.js`, `auto-gen-modal.js`, `classes-management.js`, and `vocab-vault.js`.

2. **Phase 302: Unified Single `CODE` Pipeline & Level 3 Topic/Word Full Restoration [COMPLETE]:**
   - **Level 3 Restoration & Automated Chunked Pagination (`js/api.js`)**:
     - Identified root cause of missing Level 3 topics (C2..C5 and D1..D4): PostgREST's 1,000-row server ceiling truncated queries in `fetchVaultWords`.
     - Replaced single-range query with automated chunked pagination loop fetching 1,000 rows per batch.
     - Confirmed all 1,410 active rows (800 words in Level 3, 610 in Level 2) now load into memory.
     - Restored all 16 topics for Level 3 on Topic Blueprint: `[ ðŸŽ¯ 3rd (16) ]` (previously showed only 8 topics).
     - Infobar updated to accurate metrics: `Topics: 31`, `Vault Items: 1410`.
   - **Redundant Column Elimination (`js/admin/vocab-vault.js`)**:
     - Removed redundant `T.CODE` (Theme Code) column from Vocabulary Words grid (`tab=vocab`) and Phrases & Idioms grid (`tab=phrases`).
     - Removed redundant `THEME CODE` column from Topic Blueprint matrix (`tab=blueprint`).
     - Streamlined layout to 10 standard columns:
       - Grid: `INSTITUTION` | `PROGRAM` | `LEVEL` | `CODE` | `THEME` | `TOPIC` | `TYPE` | `INDONESIAN` | `ENGLISH` | `ACTIONS`.
       - Blueprint: `LEVEL` | `THEME` | `CODE` | `TOPIC` | `VERB` | `NOUN` | `ADJECTIVE` | `PHRASE` | `TOTAL` | `ACTION`.
     - `THEME` retains cascading `rowspan`, and `CODE` shows clean monospaced `A1`, `A2`, `B1`...
     - Inline edit simplified: single input for `Code` (`A1`). On save, automatically derives `topic_code = code` and `theme_code = code[0]`.
   - **Test Generation & Question Candidates Parity (`js/api.js`)**:
     - Updated `generateTestQuestions` to resolve topic code candidates across both `A1` and `1` formats, ensuring test runner questions are always retrieved.
   - **Cache Buster & Parity Checks**:
     - Bumped cache buster to `v=20261104_v115` across `admin.html`, `js/admin/app.js`, `classes-management.js`, and `vocab-vault.js`.
     - 40/40 JS syntax checks PASS (`node scripts/check_all_js_syntax.cjs`).
     - 100% CI test suite PASS (`npm test`).
     - Live browser inspection verified via Playwright Edge screenshots (`blueprint_restored_single_code.png`, `blueprint_lvl3_full_16_topics.png`, `vocab_grid_single_code.png`).

2. **Phase 301: Unified Topic Code (A1, A2, B1...) Pipeline in Vocabulary Vault [COMPLETE]:**
   - **Root Cause Resolution**:
     - Diagnosed and resolved Excel import failure where header whitespace and carriage returns caused `normalized['TOPIC CODE']` to fail silently, resulting in blank `topic_code = ''` in database.
     - Resolved Excel export issue where missing database codes led to blank cells in exported sheets.
   - **Live Database Normalization (`vocabulary_vault`)**:
     - Paginated full-table scan overcoming Supabase 1,000-row limit across all 1,410 active rows.
     - Normalized 214 rows from blank/numbers to standardized `A1`, `A2`, `B1`... `D4` codes.
     - Verified `remainingEmpty === 0` across entire Supabase table.
   - **Smart 10-Column Standard Excel Parser (`js/admin/vocab-vault.js`)**:
     - Normalized header keys by stripping hidden `\r`, `\n`, `\t` and multiple spaces.
     - Support 10-column standard (`Code: A1`, `B2`) with auto-extraction of `theme_code = 'A'` and `topic_code = 'A1'`.
     - Multi-format backward compatibility: handles legacy 11-column files (`Theme Code: A`, `Topic Code: 1` -> `A1`).
     - Curriculum dictionary fallback (`TOPIC_CODE_MAP`): auto-fills code from topic title if code column is omitted.
     - Updated import modal description to official 10-Column Standard.
   - **Full-Spectrum Excel Export (`js/api.js`)**:
     - Updated `exportVaultWords` with `.range(0, 99999)` ensuring all 1,410+ rows export completely.
     - Standardized 10-column schema with unified `Code` column (`A1`, `A2`...) with zero blank cells.
   - **UI Blueprint & Grid Synchronization (`js/admin/vocab-vault.js`)**:
     - Topic Blueprint: `TOPIC CODE` column renders clean `A1`, `A2`, `B1`... with natural alphanumeric sorting.
     - Vocabulary Words Grid: `Topic Code` / `Code` column renders monospaced badges (`A1`, `A2`...) instead of dashes (`â€”`).
     - Inline edit and save automatically normalizes topic code and theme code.
   - **Evaluation Engine & Test Hierarchy Parity (`js/admin/app.js` & `js/api.js`)**:
     - Updated `vaultCountFor` in `js/admin/app.js` to normalize and match both `A1` and `1` formats.
     - Added `cleanTopCode` in `upsertDynamicTestShell` (`js/api.js`) to guarantee clean shell codes (`3A1-WORDS-TASK`) and titles.
   - **Cache Buster & Parity Checks**:
     - Bumped cache buster to `v=20261103_v114` in `admin.html`, `app.js`, `classes-management.js`, and `vocab-vault.js`.
     - 40/40 JS syntax check PASS, 100% CI test suite PASS (`npm test`), verified with Playwright Edge screenshots (`blueprint_unified_code_verified.png`, `vocab_grid_unified_code_verified.png`).

2. **Phase 300: Unified Topic Blueprint Multi-Level Cascading Rowspan Matrix (Opsi B) [COMPLETE]:**
   - **Unified 3-Level Single-Page Visualization**: Overhauled Topic Blueprint in Vocabulary Vault (`js/admin/vocab-vault.js`) to display all 3 levels (1st, 2nd, 3rd) in one unified, continuous matrix table following user-selected **OPSI B**.
   - **Cascading Multi-Level Rowspan Hierarchy**:
     - `LEVEL` column with dynamic `rowspan` spanning all themes and topics in that level (`1ST`, `2ND`, `3RD`).
     - `THEME CODE` column with dynamic `rowspan` spanning all topics in that theme (`A`, `B`, `C`, `D`).
     - `THEME` column with dynamic `rowspan` spanning topic rows with clean vertical alignment.
     - Individual topic rows displaying `TOPIC CODE`, `TOPIC`, `VERB`, `NOUN`, `ADJECTIVE`, `PHRASE`, `TOTAL`, and inline action buttons (`âœï¸` Rename, `ðŸ—‘ï¸` Delete).
   - **Zero-Layout-Break Dynamic Search**: Real-time search (`#vault-topic-search`) re-calculates exact matching `rowspan` on the fly, ensuring zero table misalignment or broken borders during live keyword filtering.
   - **Flexible Curriculum Toolbar & Quick Jump**:
     - Added quick filter buttons: `[ ðŸŽ¯ ALL LEVELS (23) ]`, `[ ðŸŽ¯ 1st (0) ]`, `[ ðŸŽ¯ 2nd (15) ]`, `[ ðŸŽ¯ 3rd (8) ]`.
     - Graceful empty level handling for 1st Level with clear placeholder notice.
   - **High-Contrast Dark Matrix Styling**: Added CSS rules for `.cell-level-group`, `.cell-theme-code`, `.cell-theme-name`, `#blueprint-matrix-table`, and hover highlights in `css/admin.css`.
   - **Cache Buster Bump**: Bumped to `v=20261103_v113` across `admin.html`, `app.js`, `classes-management.js`, and `vocab-vault.js`.
   - **Verification**: 40/40 JS syntax checks PASS, 100% test suite PASS, Playwright live inspection verified (`blueprint_opsi_b_verified.png`).

2. **Phase 299: Realtime Full Student Journey (2nd Level -> 3rd Level) with Account "Test" & Housekeeping Reset [COMPLETE]:**
   - **Authentic Production Journey Verification**:
     - Live student account `"Test"` (`id: 0694c6f5-076c-43d1-99ee-0a8800975bcb`, CEC Camp, PIN: `1234`).
     - Real database attempts created, answered, and submitted across 46 distinct tests per run (30 attempts in Level 2 + 232 attempts in Level 3 = 262 real database attempts, ~1,310 cloud DB transactions per run).
     - Full Level 2 progression (`2A1-WORDS-TASK` $\rightarrow$ `2A2-WORDS-TASK` $\rightarrow$ `2A-WORDS-EXAM` $\rightarrow$ `2B1-WORDS-TASK` $\rightarrow$ `2B2-WORDS-TASK` $\rightarrow$ `2B-WORDS-EXAM`).
     - Verified automatic level promotion from Level 2 (Batch 134) to Level 3 (Batch 133).
     - Full Level 3 progression across Themes A, B, C, D (32 tasks with $7 \times 7$ Repetitive Mastery leveling + 8 parallel peer exams with dynamic student choice taking Phrases exam first).
   - **Critical Architectural & Engine Bugfixes**:
     - **Bugfix 1 (`themeCodeFallback` Reference Error)**: Fixed undefined identifier in `js/api.js` line 1076 inside client DB fallback for test gating, replacing with `asmData.payload?.theme_code`.
     - **Bugfix 2 (Flexible Exam Lockout Bypass)**: Fixed `startTest` in `js/api.js` and `supabase/functions/start-test/index.ts` where asynchronous/flexible exams (like Level 2 Vocabulary) were incorrectly blocked by tutor live session checks.
     - **Bugfix 3 (Proportional Points Normalization in `computeUnifiedScore`)**: In `js/grading.js` (`parseAttemptPoints`), raw question score (`att.score`) was erroneously prioritized before `percentage`, causing component points to exceed max bounds (e.g. 331/150 pts). Corrected priority order to strictly evaluate `percentage` and `effective_score` to proportionally scale points out of component max weight (`wordsMax: 120/40`, `phrasesMax: 30/10`), yielding clean, exact `142/150 pts (95%, Grade A)` results.
     - **Bugfix 4 (Direct DB Mode for Test Automation)**: Added `process.env.TOPSCORE_DIRECT_DB === '1'` optimization in `js/supabase.js` and `js/api.js` to eliminate 404 HTTP roundtrip delays on missing edge functions during automated test runs.
     - **Bugfix 5 (Level Table Compact Format & Cache Buster v112)**: Standardized compact format (`1st`, `2nd`, `3rd`, `Alumni`) across all admin tables in `classes-management.js`, `app.js`, `auto-gen-modal.js`, `vocab-vault.js`, `student-management.js`, and bumped version string `v=20261103_v112` in `admin.html` and modules.
   - **Protocol Verification Progress**:
     - Run #1: **PASSED** (46 tests, 262 real DB attempts, 0 defects).
     - Run #2: **PASSED** (46 tests, 262 real DB attempts, unified score 141.9/150 pts, 0 defects).
     - Run #3: **PASSED** (46 tests, 262 real DB attempts, unified score 141.9/150 pts, 0 defects).
     - Run #4: **PASSED** (46 tests, 262 real DB attempts, unified score 141.9/150 pts, 0 defects in 1002.3s).
     - Total: **4 consecutive runs PASSED with 0 defects** (1,048 real database attempts completed, ~5,240 cloud DB transactions). Evaluated and approved as fully sufficient and deterministic.
   - **Housekeeping & Demo Reset**:
     - Built dedicated reset script `scripts/reset_test_student.mjs`.
     - Purged all 66 test attempts and 3,280 attempt answers for student `"Test"`.
     - Restored student `"Test"` cleanly to Level 2 (`9936683a-5b4a-4796-bb5d-a7fd8ecf0b71`), Batch 134 (`3e7288b7-a90e-4323-9b02-24e73991f0d7`), active status `true`, and PIN `1234`. Student is 100% clean and ready for live presentation/demo.

1. **Phase 298: Virtual Unified Task (50 PTS) & Exam (150 PTS) with Component Selection Modal [COMPLETE]:**
   - **Student Choice Component Selector Modal**: Added `#component-selector-modal` to `dashboard.html` with card-based interface for choosing between Words (Written/Typed) and Phrases (Selection/Spoken) components. Allows students to freely decide which component to take first.
   - **Virtual 50 PTS Task & 150 PTS Exam Representation**:
     - Tasks are presented on the dashboard as a single unified card: `Theme X â€¢ Topic Y: Title`, `50 Items â€¢ 50 PTS (40 Words + 10 Phrases)`.
     - Exams are presented as a single unified card: `Theme X Exam Package`, `150 Items â€¢ 150 PTS (120 Words + 30 Phrases)`.
     - Single-component classes (e.g. `2nd Vocabulary` Level 2) automatically bypass modal selection and launch directly into test.
   - **7Ã—7 Repetitive Mastery with Math.min Leveling**:
     - A topic round is completed if and only if both Words and Phrases achieve $\ge 70\%$.
     - `computeTopicPassLevel(wordsPasses, phrasesPasses, hasPhrases)`: Calculated using `Math.min(wordsPasses, phrasesPasses)` for balanced mastery.
     - Failing one part requires retaking only that failed part; the passed sibling retains its pass.
   - **Strict Linear Topic Gating**:
     - Topic $K$ strictly requires all tasks in Topic $K-1$ to reach 7 passes with $\ge 70\%$.
     - Theme Exam strictly requires all Theme Tasks to reach 7 passes with $\ge 70\%$.
     - Theme $K+1$ strictly requires both Words Exam and Phrases Exam of Theme $K$ to reach $\ge 70\%$.
     - Parallel peer exams: Within the unlocked theme, Words Exam and Phrases Exam share the same prerequisite (`lastThemeTaskId`), allowing students to take either exam first.
   - **Class Hub Roster Unified Columns (`js/admin/app.js`)**:
     - For multi-component classes (3rd Vocabulary), dynamically renders unified columns: `A1 Task (50p)`, `A2 Task (50p)`, `A3 Task (50p)`, `A Exam (SCR %, PTS)` with breakdown tooltips and single-click access.
     - Single-component classes (2nd Vocabulary) gracefully retain their individual column view.
   - **Smart Peer Next Action Transition (`js/result.js`)**:
     - When finishing a component, smart next action automatically balances sibling components in the same topic before moving on to the next topic.
   - **Cache Buster Bump**: Bumped to `v20261103_v111` across `admin.html`, `dashboard.html`, `result.html`, `test.html`, and core modules.
   - **Verification**: 100% tests PASS (10/10 consecutive E2E runs with 132/132 assertions verified without defect).

1. **Phase 297: Level Column Standardization [COMPLETE]:**
   - Standardized level display across all admin panel tables to the compact format: `1st`, `2nd`, `3rd`, and `Alumni`.
   - Built canonical `toShortLevel(val)` helper in `js/api.js` with full support for ordinal suffixes and alumni normalization.
   - Fixed awkward two-line text wrapping (`2nd \n Level`) across Vocabulary Vault, Topic Blueprint, Student Registration, Student Inspection Modals, Curriculum Batches, Class Hub, and Program Management tables.
   - Added anti-wrapping CSS rule `.cell-level, .cell-level span, .badge-tag-level { white-space: nowrap !important; }` in `css/admin.css`.
   - Bumped cache buster in `admin.html` to `v20261103_v110`. 100% tests PASS (including 10/10 e2e runs).

1. **Phase 296: Topic Blueprint Re-Design [COMPLETE]:**
   - Replaced duplicate institution/program badges and separate level buttons with unified Curriculum Tabs: `[ ðŸŽ¯ CEC Camp 1st Level ] [ ðŸŽ¯ CEC Camp 2nd Level ] [ ðŸŽ¯ CEC Camp 3rd Level ]`.
   - Eliminated Board View and mode toggles; standardized solely on high-density Table View.
   - Relocated `[ âš’ï¸ Merge Topics ]` and `[ âš¡ Auto-Generate ]` to the bottom-right corner inside the bottom infobar action area.
   - Removed the dangerous Reset button from Vocabulary Vault and relocated it into **D â€” SYSTEM & DATA $\rightarrow$ System Settings (Danger Zone)** with mandatory `"RESET"` confirmation.
   - Cache buster bumped to `v20261103_v109`. 100% tests PASS.

1. **Phase 295: Class Tests Grid UI Streamlining [COMPLETE]:**
   - Removed redundant `CLASS` and `LEVEL` columns from `class-tests-grid` in `js/admin/app.js`.
   - Expanded `TITLE` column (`min-width: 280px; max-width: 600px;`), eliminating text clipping/ellipsis.
   - Standardized header badge and column to `ðŸŽ¯ Min. 70%` matching the 7Ã—7 Repetitive Mastery rule.
   - `admin.html` cache buster bumped to `v20261103_v108`. 100% tests PASS.

1. **Phase 294: Zero-Maintenance Auto-Provisioning & Auto-Sync of Tests from Vocabulary Vault [COMPLETE]:**
   - **Zero-Maintenance Architecture**: Tests are now automatically generated and synchronized whenever Vocabulary Vault data is imported or when a Vocabulary class is opened with 0 tests.
   - **`js/api.js`**: Enhanced `autoGenerateTestsHierarchy` with strict level/program/active-class targeting. Added `autoSyncClassTestsForLevel(levelNumberOrId, options)`.
   - **`js/admin/app.js`**: `renderClassHub` self-heals by automatically detecting if `classTests.length === 0` while vault words exist, generating tests on the fly and rendering the full thematic matrix without user manual action.
   - **`js/admin/vocab-vault.js`**: Excel import automatically triggers background auto-sync for all imported levels.
   - **Database**: Provisioned 6 test shells for `2nd Vocabulary` (Themes A and B).
   - **Cache Buster**: `admin.html` bumped to `v20261103_v107`. 100% tests PASS.

1. **Phase 293: Fix Class Hub Roster â€” Level-Exact Student Filter [COMPLETE]:**
   - **Root Cause Fixed**: `classStudents` filter in `renderClassHub` (`js/admin/app.js`) only matched program â€” now also matches level.
   - **`js/admin/app.js`**: Added `allClassLevels` to the `Promise.all` fetch, added `level_id` to the classes query, replaced old filter with new level-aware filter using `class_levels` junction table (fallback to `class.level_id`). Effective student level = `student.level_id ?? batch.current_level_id`.
   - **`admin.html`**: Cache buster bumped to `v20261103_v106`.
   - **Verified**: DB live check â€” 3rd Vocab = 29 correct students (0 from wrong level); 2nd Vocab = 17 correct students (0 from wrong level). All tests PASS.

1. **Phase 292: Vocabulary Vault Institution, Program & Level Columns Integration [COMPLETE]:**
   - **`js/api.js` Data Joins**: Updated `fetchVaultWords` select query to join `institutions(id, name, code)` and `programs(id, name, code)` on `vocabulary_vault`. All 820 items cleanly resolve with zero nulls.
   - **Words & Phrases Grid Table View**: Added explicit columns to `<thead>` and `renderRows` for `Institution`, `Program`, and `Level`:
     - Institution: Stylized cyan badge (`#38bdf8`) displaying `CEC`.
     - Program: Stylized purple badge (`#c084fc`) displaying `Camp`.
     - Level: Stylized slate badge (`#f8fafc`) displaying ordinal levels via `toOrdinalLevel()` (`2nd Level`, `3rd Level`).
   - **Dynamic Level Filter**: Added `#vault-level-filter` to the toolbar populated dynamically from vault records, enabling instant filtering by Level across both single words and phrases.
   - **Topic Blueprint Overhaul**:
     - Added prominent Institution (`INST: CEC`) and Program (`PROG: CAMP`) badges to the blueprint toolbar.
     - Implemented interactive Level Selector buttons (`[ ðŸŽ¯ 2ND LEVEL ]`, `[ ðŸŽ¯ 3RD LEVEL ]`) dynamically detected from vault records, enabling instant switching between 2nd Level and 3rd Level topics.
     - Added View Mode Switcher (`[ ðŸ—ºï¸ Board ]` and `[ ðŸ“Š Table ]`).
     - In **Board View**: Every topic card features a dedicated metadata hierarchy row `[CEC] [Camp] [2nd Level / 3rd Level]`.
     - In **Table View**: Explicit columns for `Institution`, `Program`, `Level`, `T.Code`, `Theme`, `Topic Code`, `Topic`, `Verbs`, `Adjs`, `Nouns`, `Phrases`, `Total Items`, and `Actions`.
     - Bottom infobar chips updated with Institution, Program, and Level metadata.
   - **Parity & Consistency**: Result page glow alignment, bright vibrant blue back button contrast, and 8-digit hex parsing verified alongside 100% test pass.

1. **Phase 291: Result Page Glow Alignment, 8-Digit Hex Fix & Bright Blue Back Button Contrast:**
   - **Bright Vibrant Blue Back Navigation Button Preserved**: Stripped `.btn-dashboard-primary` (`BACK TO ROOM` / `BACK TO LOBBY`) from tier-glow-active dark overrides. Restored `linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)` with bold white text and electric blue box shadow, ensuring unmistakable contrast against dark ghost button `VIEW ANSWER BREAKDOWN`.
   - **8-Digit Hex Normalization (Accidental Purple Eliminated)**: Fixed bitwise parser bug in `js/result.js` where `#00c000ff` shifted without stripping alpha bytes, corrupting Pure Green into Purple (`rgb(192, 0, 255)`). Stripped trailing alpha bytes and wired canonical RGB strings directly from `TOPSCORE_COLORS` constants (`STAR_RGB: '0, 192, 0'`, `C_RGB: '255, 255, 0'`).
   - **Synchronized Deferred Tier Glow across All 4 Content Panels**: Initial neutral dark slate borders (`rgba(255, 255, 255, 0.12)`) on all 4 cards (`#result-identity-card`, `#result-Test-name-container`, `#result-metrics-composite-card`, `#result-motivation-msg`). At the exact moment `#result-motivation-msg` reveals, all 4 cards ignite simultaneously with `1.5px solid rgba(var(--tier-rgb), 0.75-0.85)` and glowing box-shadows (Pure Green for 100% Star, Pure Yellow for Grade C).
   - **Animation Scope & Fallback Fix**: Passed `rgbColor` and `currentTier` into `runResultEntranceSequence`, resolving reference exceptions and adding `activateTierGlow()` to reduced motion and safety timeouts.
   - **/learn Codification**: Created `learning_proposal.md` and DECISION-042 establishing permanent architectural invariants.
   - **Verified**: Playwright live inspection of 100% Star (`result_star_100_verified.png`) and Grade C (`result_grade_c_verified.png`), plus 100% pass on `test_result_page_parity.cjs`, `verify_green_star_grading.mjs`, and `check_all_js_syntax.cjs`.

1. **Phase 290: Side Panel Perpetual Alphabetical Ordering for ABCD Groups:**
   - **Domain A Ordered (C -> D -> O)**: Curriculum (`classes-hub`), Dashboard (`dashboard`), Organization (`organization`).
   - **Domain B Ordered (C -> S)**: Dynamic active batches strictly ascending (Camp 132, Camp 133, Camp 134) followed by Students Registration (`student-registration`).
   - **Domain C Ordered (2 -> 3 -> T -> V)**: Dynamic active classes (2nd Vocabulary, 3rd Vocabulary) followed by Test Analytics (`tests`), Vocabulary Vault (`vocab_vault`).
   - **Domain D Ordered (M -> S)**: Modules (`modules`), System Settings (`settings`).
   - **display: contents Flow**: Configured `#sidebar-programs-list`, `#sidebar-classes-list`, `.sidebar-program-group`, and `.sidebar-class-group` with `display: contents;` in `css/admin.css` ensuring zero layout breakage and direct flexbox participation.
   - **Perpetual Sorter & MutationObserver**: Implemented `sortAllSidebarDomains()` and `initSidebarAlphabeticalObserver()` in `js/admin/admin-init.js`, auto-sorting items by clean text (stripping emojis/icons) with `{ numeric: true }` and maintaining continuous alphabetical order whenever dynamic items load.
   - **Verified**: `test_sidebar_alphabetical_verification.cjs`, `check_all_js_syntax.cjs`, and `test_result_page_parity.cjs` passing 100%.

2. **Phase 289: Result Page Harmonized Glow & 40px Button Height Alignment:**
   - **Flashcard Button Purged**: Completely removed unrequested `#open-flashcards-btn` from `result.html` and neutralized unhiding logic in `js/result.js`.
   - **Height 40px Alignment**: Aligned Action Row (`.result-action-slot`, `.btn-next-milestone`, `.tutor-remedial-segmented`), View Answer Breakdown (`.btn-breakdown-ghost`), and Back Navigation (`.btn-dashboard-primary`) to strictly 40px with uniform 11.5px font size (Weight 800) matching Image 1 wireframe. Zero vertical overflow or scrollbar.
   - **Harmonized Cohesive Color Palette**: Resolved mismatched cyan, purple, and blue borders. All panels (Metadata, Avatar Ring, Title, Topic row, Metrics Composite, Percentage, Points, Status Card, Action Buttons, Breakdown, and Back button) share the exact same `--tier-color` and `--tier-rgb`.
   - **Deferred Synchronized Tier Glow**: Configured initial clean neutral dark slate styling. Wired `activateTierGlow()` to fire at Step 6, exactly when `#result-motivation-msg` description reveals (`FAIL`...`EXCELLENT`). All panels illuminate simultaneously with glowing tier borders and radial background aura.
   - **Verified**: `test_result_page_parity.cjs`, `verify_green_star_grading.mjs`, and `check_all_js_syntax.cjs` passing 100%.

2. **Phase 288: Batch 132 Roster Activation & Ariwil Transfer to Batch 134:**
   - **Root Cause Resolution**: Resolved issue where Batch 132 appeared completely empty due to students having `level_id` set to Alumni (`b70a0ea2-785d-4291-9adf-a4cbd7a2c9a2`) and `is_active: false`.
   - **Database Trigger Fix**: Dropped dead legacy trigger `trigger_student_batch_change` and function `trg_student_batch_change()` which referenced dropped table `additional_members` and threw `42P01` on batch changes. Created migration `20261103070000_drop_legacy_batch_change_trigger.sql`.
   - **Batch 132 Reactivation**: Reactivated all 7 remaining students in Batch 132 with `level_id = 51589e1a-d96e-496e-92a3-d9d350483555` (3rd Level) and `is_active: true`.
   - **Ariwil Transfer**: Transferred Muhammad Ariwil Asrori to Batch 134 (`3e7288b7-a90e-4323-9b02-24e73991f0d7`) with `level_id = 9936683a-5b4a-4796-bb5d-a7fd8ecf0b71` (2nd Level) and `is_active: true`. Recorded `STUDENT_BATCH_TRANSFER` audit log.
   - **Batch 134 Level Alignment**: Backfilled remaining 16 students in Batch 134 to `level_id = 9936683a-5b4a-4796-bb5d-a7fd8ecf0b71` (2nd Level).
   - **Verified**: Frontend queries for Batch 132 (7 active students) and Batch 134 (17 active students including Ariwil) verified 100%.

2. **Phase 287: Result Page Wireframe Overhaul & Dual-View Parity:**
   - **Student Metadata (Strict 150px)**: Refactored `#result-identity-card` to match Student Dashboard `#welcome-banner-section` 1:1 in height, dividers, avatar photo ring, student name, and border-radius.
   - **Test Full Title (Strict 50px / 15%)**: 2-line format displaying Test Type/Title on line 1 and Assessment Topic/Theme on line 2 with fallback protection.
   - **Dynamic Metrics & Score/Grade Composite Card (35% Dynamic)**: Combined stacked vertical metrics (*CORRECT, PARTIAL, INCORRECT, POINTS*) with internal divider and 50px side-by-side Score % & Grade / Star vector row.
   - **Achievement Status (Strict 50px / 15%)**: Standardized 6-tier status (`FAIL`, `LESS`, `ENOUGH`, `GOOD`, `VERY GOOD`, `EXCELLENT`) matching Rule DECISION-018 and wireframe.
   - **Tutor 3-Button Controls (Strict 50px / 15%)**: Equal 3-column segmented button `[ NORMAL ]` `[ REMIDI ]` `[ FORGIVE ]` with uniform 11.5px font size, confirmation dialogs, and instant reactive reload.
   - **Student Next Action (Strict 50px / 15%)**: Displays tag `GO TO NEXT ASSESMENT:` with next test title link.
   - **View Answer Breakdown (Strict 30px / 10%)**: Reordered above Back button as Item 7.
   - **Bottom Navigation (Strict 30px / 10%)**: Contextual routing: `BACK TO ROOM` (`admin.html#class-hub`) for Tutor/Admin vs `BACK TO LOBBY` (`dashboard.html`) for Student.
   - **Dynamic Tier Aura**: Border color and background radial gradient across all result cards dynamically follow the student's exam score/grade calculation (`--tier-color`, `--tier-rgb`).
   - **Status Engine Helpers (`js/api.js`)**: Added `labelAttemptNormal` and `labelAttemptForgiven` with audit logs.
   - **Automated Verification**: `scripts/test_result_page_parity.cjs` passing 100% (all 30 IDs, styling, and logic verified).

1. **Phase 1: Terminology Unification (Quiz -> Task 100%):**
   - Normalized all 32 database test shells in 3rd Vocabulary to Task (`category: TASK`, `shell_code: *-TASK`, `title: * Task`).
   - Unified terminology across `js/dashboard.js`, `js/admin/app.js`, `js/admin/vocab-vault.js`, `js/admin/crud-modals.js`, `js/test.js`, and `supabase/seed.sql`.
2. **Phase 2: 7Ã—7 Repetitive Mastery Engine & Hard Gate Exam:**
   - Implemented `getTaskProgressVisual(passCount)` in `js/grading.js` with 5-tier gamified palette (Red `0/7` -> Star Green `7/7 âœ“ Complete`).
   - Implemented realtime pass counter in `js/api.js` and `task-progress-chip` in `js/dashboard.js`.
   - Hard Gate Exam locked ðŸ”’ until all prerequisite tasks reach 7/7 passes in Edge Function and client.
   - Authorized remedial attempts exempted from 7Ã—7 task prerequisite lock in `start-test` Edge Function and client.
3. **Phase 3: Words Exam Written Mode & 70% Threshold:**
   - Configured all 4 Words Exams (`3A-WORDS-EXAM` ... `3D-WORDS-EXAM`) with `answer_type = 'written'` and `minimum_required_score = 70`.
   - Verified Rule 2.13 written tolerance engine (exact match 1.0 pt, typo 0.5 pt, root form 0.5 pt).
   - Standardized auto-leveling passing threshold in `submit-test` Edge Function to 70%.
4. **Phase 4: Class 2nd Vocabulary (Batch 134) Activation:**
   - Reactivated `2nd Vocabulary` (`VOCAB_2ND`, Level 2) with active status in database.
   - Verified Batch 134 links to 2nd Level and inherits 2nd Vocabulary.
5. **Phase 5: Level Progression System, Lifecycle Actions UI, Batch Transfer & Skor F:**
   - Updated Level 0 to `Alumni` (`toOrdinalLevel(0)` = `'Alumni'`).
   - Implemented Lifecycle actions column in `js/admin/student-management.js`: `ðŸš€ NEXT`, `ðŸ”’ HOLD`, `ðŸ” REPEAT`, `ðŸ”„ Transfer Batch`.
   - Implemented mass promotion `window.promoteAllEligibleStudents` and `window.promoteStudentNextLevel`.
   - Implemented `Transfer Batch` modal with `Inherit Batch Level`.
   - Implemented `Skor F (Forgiven)` waiver (`55%á¶ ` Red E) and Remedial Cap 60% (`60%á´¿` Yellow C) with audit logging.
   - Fixed Edge Function `start-test` level resolution to support Cumulative Retroactive Access (`testLevelNum <= studentLevelNum`) and Lifetime Universal Access for Alumni (`studentLevelNum === 0`).
   - Added graduating batch filter dropdown to `ðŸŽ“ Alumni` tab and hid promote button on alumni.
   - Persisted `alumni` status tab in `localStorage` and hash routing (Rule 2.20).
   - Fixed class modal in `js/dashboard.js` to render locked exams with unlock instructions rather than silently omitting them.
6. **Phase 6: Multi-Tenant Vocabulary Vault & 11-Column Import/Export:**
   - Added `institution_id` and `program_id` columns to `vocabulary_vault`.
   - Attributed all vault words to CEC and Camp.
   - Cascading dropdowns `[Institution] -> [Program] -> [Class] -> [Level]` in test gateway.
   - Standardized Excel import/export to 11 columns in `js/api.js` and `js/admin/vocab-vault.js`.
7. **Phase 7: Full E2E Check System (10Ã— Consecutive Pass Protocol):**
   - Created `scripts/test_vocab_7x7_and_leveling_e2e.mjs` and `scripts/test_start_test_gating.mjs`.
   - Executed 10 consecutive full realtime E2E cycles: 10/10 PASS (132/132 assertions verified without defect).
   - Validated all 40 JavaScript files in workspace with `node --check` (100% clean).

## Next Exact Action
1. All 7 phases verified, hardened, and regression tested with zero defects. Ready for production release.

## Audit & Cleanup Accomplishments (Phase 284):
1. **Disk Bloat Removed (> 61 MB Freed, 670+ Unused Files Cleaned):**
   - Cleaned all 415 dead files in `scratch/` (-48.7 MB, including multi-MB JSON dumps).
   - Deleted `scripts/archive/` containing 241 obsolete scripts and old HTML tester mockups (-3.70 MB).
   - Deleted `supabase_deploy/` containing 3 duplicate SQL dump files (-1.80 MB; canonical preserved in `supabase/schema.sql` and `supabase/migrations/`).
   - Deleted `supabase/data.sql` (-7.32 MB exact duplicate of canonical `supabase/seed.sql`).
   - Deleted duplicate `docs/ASSESSMENT_EXECUTION_AUDIT.md` (canonical preserved in `docs/archive/`).
   - Cleaned 11 one-off inspect and redundant version bump scripts from `scripts/` root.
   - Partitioned oversized `docs/CHANGELOG.md` (1.59 MB -> 111.4 KB) by safely archiving historical Phases 1â€“228 entries into `docs/archive/CHANGELOG_ARCHIVE.md`.

2. **Production Dead Code Pruning (> 2,000 Lines Pruned):**
   - `js/admin/class.js`: Pruned dead functions `renderAssignments` (190 lines), `renderProgressView` (484 lines), and `renderRecalibrator` (8 lines).
   - `js/admin/imports-exports.js`: Pruned dead functions `renderImportStudents` (746 lines) and `renderImportQuestions` (545 lines). Retained only the active, canonical `renderExportQuestions`.
   - `js/admin/cv-export.js`: Pruned dead `triggerCVExport` (74 lines).
   - `css/admin.css`: Pruned dead `.global-asm-*` rules (92 lines).

3. **Button & Handler Bug Fixes (Zero Broken / Zero Double Buttons):**
   - Fixed `student-management.js` line 1306 "Authorize Retake" button (`ReferenceError: showToast is not defined`) by ensuring global `window.showToast` fallback.
   - Fixed `admin-deck.js` broken "Create Profile" button (`openCrudModal('user_professionals')`) by replacing the deprecated profile card with a clean, functional Platform Overview card.
   - Fixed hardcoded version `?v=5.3.2` across `panel-c-builder.js`, `classes-management.js`, `program-management.js`, and `avatar-engine.js` to project standard `?v=20261102_v104`.
   - Fixed duplicate auto-generate and exam buttons in `vocab-vault.js` (both in Table View bottom infobar and Blueprint View bottom infobar).

4. **Modernized Legacy Terminology (`assessment` / `asm` -> `test`):**
   - `admin.html` & `crud-modals.js`: Modernized modal IDs `bulk-edit-asm-*` -> `bulk-edit-tests-*`.
   - `result.html` & `js/result.js`: Modernized element IDs `result-asm-*` -> `result-test-*` and variable `nextAsm` -> `nextTest`.
   - `dashboard.html` & `js/dashboard.js`: Modernized notification strings from `assessment` to `test`, variable `nextAsm` to `nextTest`, and added `.next-test-*` dual classes.
   - `css/dashboard.css`: Modernized `.next-asm-*` class selectors with `.next-test-*` aliases.
   - `js/admin/dossier_export.js` & `student-management.js`: Modernized fallback titles and comments to `Test`.
   - `css/admin.css`: Modernized comment from `Master Subject List` to `Master Class List`.

5. **Authoritative Verifications Run & Passing 100%:**
   - `node scripts/check_all_js_syntax.cjs`: ALL 40 JavaScript files passed syntax validation (`node --check`).
   - `node scripts/verify_green_star_grading.mjs`: 100% PASS (Green Star grading scale and color tokens).
   - `node scripts/test_student_dashboard_exam_parity.mjs`: 100% PASS (Exam-only metrics and multi-tier ranking).
   - `node scripts/test_sequential_exam_prerequisite.mjs`: 100% PASS (Theme exam prerequisites and sequential progression).

Status: COMPLETE

## Next Exact Action
1. All requested audit items, bloat files, dead code, broken handlers, and legacy naming have been pruned and harmonized. System is running fast and clean. Ready for new user instructions.

## Database State
- Canonical schema: `supabase/schema.sql`
- Canonical seed: `supabase/seed.sql`
- Migrations: `supabase/migrations/`
- RLS status: ENABLED across all tables

## Frontend State
- Pages: `index.html`, `admin.html`, `dashboard.html`, `test.html`, `result.html`, `management.html`
- Modules: ES6 standard modules with unified cache buster `v=20261102_v104`
- Service Worker: `topscore-cache-option-a-v52`
