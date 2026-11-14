# TopsCore LMS — Directives & Task Log (Phases 47–373)

> **Format:** Compact Directives Log. All legacy directives cataloged below are verified complete. Active task management is maintained in [`tasks.md`](file:///tasks.md).

---

## PHASE 373 — VOCABULARY VAULT CACHE BUSTERS & TAB COUNT POLISH [COMPLETE]
- Bump `vocab-vault.js` import cache buster across `js/admin/app.js`, `classes-management.js`, `panel-c-builder.js`, and `tests-management.js` to `?v=20261109_v172`.
- Bump `admin.html` stylesheets and scripts to `?v=20261109_v172`, bump `sw.js` cache name to `topscore-cache-option-a-v97`.
- Polish `buildVaultTabs` in `js/admin/vocab-vault.js`: set `themesCount` for `🗺️ Theme Manager` and `topicsCount` for `⚡ Theme Blueprint`.

---

## PHASE 372 — VOCABULARY VAULT UX SPLIT (THEME MANAGER & BLUEPRINT) & LIVE WORDS EXAM WRITTEN MODE [COMPLETE]
- Split monolithic 16+ column Topic Blueprint in `js/admin/vocab-vault.js` into two dedicated tabs: `theme_manager` (🗺️ Theme Manager) and `blueprint` (⚡ Theme Blueprint).
- Implement dedicated Theme Manager view: replace 7 crowded POS columns with a single summary chip (`40 items (30W · 10P)`), expand multi-tenant program distribution columns with high-contrast badges...
- Implement dedicated Theme Blueprint view: Glassmorphic Hero Command Bar with Target Program dropdown, Level selector tabs, Pacing snapshot chips, `⚡ Auto-Generate All Tests` action, and real-time T...

---

## PHASE 339 — MOBILE VIEWPORT EMULATION ENGINE & OPTIMIZED AI EXTENSIONS STACK [COMPLETE]
- Audit and reorganize `.vscode/extensions.json` into 5 curated categories: Mobile Viewport & Live Emulation, CSS & Visual Accuracy, HTML & Asset Productivity, Code Quality & Runtime Safety, and AI P...
- Build 1-click mobile viewport emulation engine `scripts/open_mobile_preview.mjs` using Playwright system browser integration (390x800, touch, DPR 2x).
- Support automated mobile snapshots (`--screenshot`, `--all-screenshots`) for `dashboard.html`, `result.html`, `index.html`, `test.html`, `admin.html`.

---

## PHASE 338 — COMPLETED TESTS "RETRY" PLAY BUTTON, TOP-7 TASK GRADE CHIPS, EXAM SKY BLUE TITLE & LEADERBOARD (YOU) ELIMINATION [COMPLETE]
- Remove `(You)` text tag in leaderboard (`js/dashboard.js`), replace with Sky Blue `#38bdf8` bold font and text glow to prevent long student names from truncating.
- Lock Next Test card to strict left-alignment (`text-align: left; align-items: flex-start;`).
- Visual hierarchy for Completed Tests: Exam titles in bold Sky Blue (`#38bdf8`), Task titles in White (`#f8fafc`).

---

## PHASE 326 — UNIVERSAL BOTTOM BANNER OVERHAUL ("TOPSCORE BY MR. TOP") [COMPLETE]
- Replace legacy banner text across all pages (`index.html`, `admin.html`, `dashboard.html`, `test.html`, `result.html`) with `<span class="banner-brand">TopsCore</span>&nbsp;<span class="banner-auth...
- Enlarge and embolden typography across `style.css`, `admin.css`, `dashboard.css`, `test.css`, `result.css` (`font-size: clamp(1rem, 2.8vw, 1.15rem); font-weight: 800;` on container; `font-size: cla...
- Build automated test suite `scripts/test_bottom_banner_universal.mjs` verifying 100% presence and correct styling across all pages.

---

## PHASE 325 — VOCAB & UNIVERSAL STUDENT DASHBOARD MASTER BLUEPRINT [COMPLETE]
- Conduct `/grill-me` architectural interview on user-uploaded blueprint diagram (`media_1793897504100_ef4a45a9.png`).
- Implement 60px Header with Door Icon (`🚪`, `#btn-change-class`), Class Name Brand, and Logout; eliminate separate Classes Bar to save 60px vertical space.
- Implement 150px Metadata Card with breadcrumb header, Score, Clickable photo 70px to open profile modal, Grade symbol, and student full name.

---

## PHASE 300 — UNIFIED TOPIC BLUEPRINT CASCADING ROWSPAN MATRIX (OPSI B) [COMPLETE]
- Analyze user mockups (Gambar 1 current, Gambar 2 outline, Gambar 3 grouped, Gambar 4 inline, and user-approved Opsi B).
- Implement multi-level hierarchical grouping (Level $\rightarrow$ Theme $\rightarrow$ Topics) in `_renderTopicBlueprintTab` in `js/admin/vocab-vault.js`.
- Build 11-column cascading `rowspan` matrix: `LEVEL` | `THEME CODE` | `THEME` | `TOPIC CODE` | `TOPIC` | `VERB` | `NOUN` | `ADJECTIVE` | `PHRASE` | `TOTAL` | `ACTION`.

---

## PHASE 299 — REALTIME FULL STUDENT JOURNEY & HOUSEKEEPING RESET [COMPLETE]
- Execute full realtime student journey (2nd Level $\rightarrow$ 3rd Level) with account `"Test"` on live Supabase PostgreSQL (46 distinct tests, 262 real DB attempts per run).
- Fix runtime bugs discovered during live runs:
- Complete 4 consecutive defect-free cycles (1,048 real database attempts submitted, 100% deterministic score 141.9/150 pts).

---

## PHASE 292 — VOCABULARY VAULT INSTITUTION, PROGRAM & LEVEL INTEGRATION [COMPLETE]
- Update `fetchVaultWords` in `js/api.js` to select joined relations `institutions(id, name, code)` and `programs(id, name, code)`.
- Update `js/admin/vocab-vault.js` Words and Phrases grid table:
- Overhaul `Topic Blueprint` in `js/admin/vocab-vault.js`:

---

## PHASE 290 — SIDE PANEL PERPETUAL ALPHABETICAL ORDERING FOR ABCD GROUPS [COMPLETE]
- Audit admin sidebar navigation structure across all 4 ABCD domains (`A — ADMIN`, `B — BOARD`, `C — CLASS`, `D — SYSTEM & DATA`).
- Reorder static HTML in `admin.html`:
- Configure `display: contents;` in `css/admin.css` for `#sidebar-programs-list`, `#sidebar-classes-list`, `.sidebar-program-group`, and `.sidebar-class-group` ensuring seamless flexbox item flow and...

---

## PHASE 285 — VOCAB 7×7 & LEVEL PROGRESSION MASTER SYSTEM [COMPLETE]
- Task 1.1: `AGENTS.md` update hierarchy & display formula from `Quiz` to `Task` (Rule 1.3, 1.4, 2.5, 2.6).
- Task 1.2: `js/dashboard.js`: Replace all `isQuiz` / `Quiz` references, badges, and labels with `isTask` / `Task`.
- Task 1.3: `js/admin/app.js`: Update metric summary chips and table category renderer from `Quizzes` $\rightarrow$ `Tasks`.

---

## PHASE 279 — MILESTONE DENOMINATOR STANDARDIZATION & ROSTER MONOTONICITY [COMPLETE]
- Standardized `computeMilestoneExamMastery` denominator in `js/grading.js` to use `Math.max(canonicalMax, attemptTotalQ)` (1,900 points canonical curriculum) to eliminate early test version denomina...
- Restored Syazida Shinda Debi canonical denominator to 1,900 PTS ($1308.5 / 1900 = 69\% \rightarrow \text{Grade C}$), achieving strict grade monotonicity.
- Inserted Muhammad Alimae Pasya Theme B offline score (147 PTS) into Supabase PostgreSQL, bringing total points to 264.5 PTS.

---

## PHASE 278 — SMART WEB PROCTORED SHIELD & FULLSCREEN INTEGRATION [COMPLETE]
- Implemented Fullscreen API auto-activation via pre-exam focus modal `#pre-exam-focus-modal` with DND checklist in `js/test.js`.
- De-weaponized long-press touch gestures on mobile devices by suppressing `contextmenu` events without cheat strikes.
- Hardened test runner touch selection and callouts in `css/test.css`.

---

## PHASE 269 — FULL-HEIGHT WORKSPACE, CUMULATIVE CURRICULUM GRADING & GREEN TEST BASELINE [COMPLETE]
- Verified `#student-grid-container` and its parent `.admin-content:has(#student-grid-container)` flex layout fills 100% of workspace height (`calc(100vh - 50px - 50px)`), eliminating empty black spa...
- Updated `scripts/test_student_dashboard_exam_parity.mjs` assertions to reflect authoritative cumulative curriculum mastery (Pasya 90/1900 pts = 5% Grade E).
- Verified all automated test suites pass 100% (`npm.cmd test`, `test:grading`, `test:prereq`, `test:duration`).

---

## PHASE 268 — REDUNDANT TOOLBAR ELIMINATION & STRICT 10PX PANEL SPACING [COMPLETE]
- Completely removed redundant `Search... (Ctrl+K)` and `[Columns]` toolbar above the Class Hub attendance matrix using `hideToolbar: true` in `DataGrid` constructor and CSS display none rules.
- Standardized all panel gaps, card distances, and layout margins to strictly **10px** across `css/admin.css` and `css/dashboard.css`.
- Maximized workspace height and width with 0 wasted empty areas down to the footer infobar.

---

## PHASE 267 — ARI & AUNUL SCORE AUDIT & STRICT INTER-THEME GATING [COMPLETE]
- Audited all attempts across Supabase database for Aunul Fikri Yasir and Ari Wahyu Darma, confirming high quiz scores (87.5% - 100%) and clarifying the `ALL (EXAMS ONLY)` vs `THEME A (8)` matrix vie...
- Eliminated unshielded `isSessLive` prerequisite override in `js/dashboard.js`, ensuring live tutor sessions still enforce strict prior-theme academic passing criteria.
- Enforced universal Inter-Theme prerequisite gating across `js/dashboard.js`, `js/api.js`, `supabase/functions/start-test/index.ts`, and `js/admin/tests-access.js`.

---

## PHASE 266 — PROGRESS-FIRST RANKING, CUMULATIVE CURRICULUM GRADING & CROSS-THEME PREREQUISITE GATING [COMPLETE]
- Re-ordered leaderboard comparator in `js/admin/app.js`: `PROG %` DESC (Progress First) -> `PTS` DESC (Total Exam Points) -> `SCORE %` DESC -> `lastSubmittedAt` ASC.
- Upgraded `computeMilestoneExamMastery` in `js/grading.js` to derive Grade and Overall Score from total points earned divided by total expected curriculum points (1,900 points on 3rd Vocabulary), el...
- Added Cross-Theme Sequential Exam Prerequisite in `evaluateStudentsEligibility` (`js/admin/tests-access.js`), client fallback `startTest` (`js/api.js`), and Edge Function `start-test`: taking Theme...

---

## PHASE 265 — FULL-HEIGHT WORKSPACE INTEGRATION FOR STUDENT ROSTER & DATAGRIDS [COMPLETE]
- Stripped outer redundant `.card` class and inline padding from `#student-grid-container` in `js/admin/student-management.js`.
- Added full-height flex integration for `.admin-content:has(#student-grid-container)` and primary grid views in `css/admin.css`, filling 100% of the available viewport from topbar to the locked bott...
- Pinned summary row `★ BATCH AVERAGE` at the bottom of the table wrapper with sleek thin scrollbar and mobile responsive query.

---

## PHASE 259 — REAL-TIME DYNAMIC PACING BADGE IN TEST RUNNER [COMPLETE]
- Added real-time pacing indicator pill `#test-pacing-indicator` calculating seconds-per-unanswered-question on every timer tick in `js/test.js`.
- Styled 3 pacing states in `css/test.css`: Comfortable (>= 30s/q, Green), Moderate (15s–29s/q, Yellow), Urgent (< 15s/q, Pulsing Red).
- Verified 40/40 JS syntax checks PASS and 0 console errors across all 5 primary entrypoints.

---

## PHASE 258 — CLASSROOM 3D FLASHCARD DRILL DI CLASS HUB [COMPLETE]
- Added interactive `🎴 Drill` button in each Theme column header of the Bottlenecks board in `js/admin/tests-management.js`.
- Injected `class-flashcard-modal` in `admin.html` with front-back 3D flipping, native audio pronunciation, and presenter keyboard shortcuts (Space, Arrow keys, P).
- Enabled live classroom presentation of top bottleneck vocabulary on TV/projector screens.

---

## PHASE 257 — MODULAR MILESTONE CHUNKS & EXAM FATIGUE ELIMINATION [COMPLETE]
- Implemented automatic milestone chunking for cumulative multi-theme exams (such as Theme D High-Frequency Words Exam with 640 questions) in `js/test.js`.
- Dynamically structured questions into 4 sequential Milestone Sections (Theme A, B, C, D) with `Next Milestone ➔` navigation.
- Grouped question navigation matrix into foldable chapter blocks, eliminating mobile DOM lag and cognitive fatigue.

---

## PHASE 256 — SMART BOTTLENECK PRACTICE DI STUDENT LOBBY [COMPLETE]
- Implemented `setupLobbyFlashcards()` and `openLobbyFlashcardsForAttempt()` in `js/dashboard.js`.
- Added `🎯 Focus Practice: X Missed Words` trigger button in Achievement Status card and `🎯 Practice Missed Words` button on locked remedial exam cards in `dashboard.html`.
- Universalized 3D flashcard modal styling in `css/style.css` with 3D card flipping and native TTS pronunciation audio.

---

## PHASE 250 — ACTIVE BATCH AUTO-SELECTION, SIDEBAR SYNCHRONIZATION & CACHE V81 [COMPLETE]
- Scoped sidebar Domain B strictly to active batches (`is_active: true`), hiding inactive/past batches (`Camp 132`, `Camp 131`, `Camp 123`, `Hospitality SH-26`, `Hospitality TP-26`).
- Added auto-detection and selection of the active batch in `student-management.js` and synchronized the active highlight class on the sidebar item.
- Formatted `#topbar-title` to display Program + Batch name (e.g. `Camp 133`).

---

## PHASE 246 — STUDENT ROSTER BATCH SCOPE & DEFAULT ACTIVE TAB [COMPLETE]
- Scoped student roster topbar status counts (`Active`, `Inactive`, `All`) strictly to `window._filterBatchId` (or active batches in program if no specific batch is selected).
- Resolved root cause of 28 inactive / 50 total students (historical batches in Camp program). For Batch 133, counts are now precisely Active: 22, Inactive: 2, All: 24.
- Ensured opening Student Roster always defaults to the **Active Students** (`active`) tab first, eliminating disorienting starts on `All Students`.

---

## PHASE 245 — COMPREHENSIVE STUDENT DIFFICULTY ANALYSIS & EXAM SYSTEM PROPOSAL [COMPLETE]
- Investigated 94,746 attempt answers in Supabase to diagnose root causes of student bottlenecks and timeouts across Themes A, B, C, D.
- Discovered 1,528 `CHEAT_ATTEMPT` audit logs caused by mobile virtual keyboard `window.blur` events and implemented mobile guard in `js/test.js`.
- Extended cheat countdown grace period from 10s to 30s before auto-submit.

---

## PHASE 237 — FIX TEST ANALYTICS PACING DRAWER DOM LEAK ON CLASS HUB [COMPLETE]
- Diagnosed DOM leak where `#tac-pacing-drawer` was appended to `document.body` while its CSS lived in transient `<style>` in `#admin-content-area`.
- Relocated all pacing drawer CSS rules permanently into `css/admin.css` with persistent fixed positioning and backdrop styling.
- Implemented automated cleanup in `loadSection()` (`js/admin/app.js`) to unmount any orphaned drawer and backdrop when navigating away from `#tests`.

---

## PHASE 235 — PURE ACADEMIC DATA RESTORATION & ELIMINATION OF ALL FORGIVEN & REMEDIAL OVERRIDES [COMPLETE]
- Stripped `forgiven_student_ids` from ALL 40 tests in `3rd Vocabulary` in Supabase database.
- Removed all ad-hoc Forgiven and Remedial override logic, toolbar buttons (`⚡ Forgive`), student row triggers, and red `^F` superscript renderers from `js/admin/app.js` and `css/admin.css`.
- Restored authentic test progression (PROG %): only tests with genuine submitted attempts increment progress.

---

## PHASE 210 — FULL ROUTE & SUB-TAB STATE PERSISTENCE ALIGNMENT (RULE 2.20) [COMPLETE]
- Synchronized `history.replaceState` into `_switchClassHubTab` (`#class-hub?tab=...`), `_switchSettingTab` (`#settings?tab=...`), `_switchVaultTab` (`#vocab_vault?tab=...`), `_switchStudentRegTab` (...
- Verified bidirectional sync between URL address bar, `localStorage`, and view rendering.
- Eliminated disorienting redirects on browser refresh (F5) or background data sync.

---

## PHASE 209 — CLASS HUB DATAGRID CLEAN TYPOGRAPHY GRADE ALIGNMENT [COMPLETE]
- Replaced dense filled circular badges (`grade-circle`) in Class Attendance DataGrid with sleek, bold colored typography (`.grid-grade-val`).
- Harmonized `GRD`, `PROG`, and `PTS` into a unified typography hierarchy without button-like circle distractions in data rows.
- Rendered Star tier (★) with pure green color (`--grade-star`) and subtle glow (`--grade-star-glow`) at `0.92rem`.

---

## PHASE 208 — TEST ANALYTICS DRILL-DOWN STATE ALIGNMENT & CACHE REFRESH [COMPLETE]
- Attached `hardestQs20` and `themeTop20` directly onto `window._testAnalyticsState` for drill-down modal parity (`cardKey === 'wall'`).
- Updated `_openTestDetailDrawer` to filter submitted attempts only and exclude timeout blanks from per-test hardest question calculations.
- Bumped cache busters across `admin.html` and `js/admin/app.js` to `?v=20261031_v48`.

---

## PHASE 207 — TEST ANALYTICS SUBMITTED-ATTEMPT ISOLATION [COMPLETE]
- Isolated Test Analytics question and error calculations to officially submitted student attempts (`att.status === 'submitted' || att.status === 'auto_submitted' || att.submitted_at`).
- Filtered out unsubmitted drafts and abandoned in-progress sessions.
- Automated verification: 40/40 JS syntax checks PASS, 100% classifier tests PASS.

---

## PHASE 206 — SCREEN, SUB-TAB & ROUTE STATE PERSISTENCE ON RELOAD / DYNAMIC UPDATE [COMPLETE]
- Decoupled URL Hash Route & Query Parsing (`parseHashRoute` in `js/admin/app.js`)
- Sub-Tab & Active Filter State Synchronization across Admin Views
- Modal Hash Routing & Background Continuity across Admin and Student Dashboard

---

## PHASE 184 — 10-ROUND FULL-SYSTEM E2E AUDIT & RELIABILITY GATE [COMPLETE]
- 10-Round Verification Battery (`scratch/run_full_system_10_iterations_audit.mjs`)
- Subagent & Adversarial Audit Synchronization
- Comprehensive Verification Gate

---

## PHASE 174 — ELIMINATION OF PUNCTUATION & CONTRACTION EQUIVALENCE [COMPLETE]
- English Contractions & Apostrophe Expansion Pipeline
- Comprehensive Punctuation & Typographical Symbol Elimination
- Server Edge Function Parity

---

## PHASE 173 — VOCABULARY QUIZ DURATION 5M STANDARDIZATION [COMPLETE]
- Update Existing Database Quizzes
- Standardize Auto-Generator Default Setting
- Automated Browser & CI Verification

---

## PHASE 172 — TRANSFORMATION OF TEST MANAGEMENT INTO "TEST ANALYTICS" HUB [COMPLETE]
- Navigation Nomenclature & Section Title Standardization
- 8 High-Density Operational Intelligence Cards Engine (`js/admin/tests-management.js`)
- Enriched 40 Tests Performance DataGrid

---

## PHASE 171 — UNIFY TOPIC MANAGER & BLUEPRINT INTO ZERO-SCROLL "TOPIC BLUEPRINT" [COMPLETE]
- Consolidate Vault Navigation Tabs (`js/admin/vocab-vault.js`)
- Implement 4-Thematic Columns Zero-Scroll Grid (`js/admin/vocab-vault.js`)
- Unified Toolbar & Action Controls

---

## PHASE 170 — RESOLUTION OF TUTOR'S ROOM (CLASS HUB) BLANK RENDERING & ES MODULE PARITY [COMPLETE]
- Fix ES Module Export Mismatch for `isExam` (`js/app.js`, `js/api.js`)
- Fix Undeclared `weeklyCompletedStudents` in DataGrid summaryRow (`js/admin/app.js`)
- Cache Synchronization & Version Bumping (`admin.html`, `sw.js`)

---

## PHASE 159 — POINTS-FIRST LEADERBOARD RANKING, MILESTONE PROGRESSION & ADMIN TABLE ERGONOMICS [COMPLETE]
- Milestone Progression Engine (`js/grading.js`, `js/api.js`, `js/app.js`)
- Points-First Leaderboard Hierarchy (`js/admin/app.js`, `js/dashboard.js`)
- Admin Class Hub Ergonomics (`js/admin/app.js`)

---

## PHASE 58 — STRICT ACTIVE-ONLY BATCH DROPDOWNS & LEVEL 0 SEMANTICS ("UNDER LEVEL 1")
- Enforce Strict Active-Only Filtering in Live Session Controller (`js/admin/assessment-access.js`)
- Level 0 Semantics ("Under Level 1", NOT "All Levels") (`levels` DB, `js/admin/assessment-access.js`, `js/api.js`, `js/dashboard.js`)
- Audit Other Operational Batch Dropdowns

---

## PHASE 56 — SOFT-DELETED ASSESSMENT FILTERING & STUDENT DASHBOARD RECOVERY
- API Data Layer Remediation (`js/api.js`)
- Student Dashboard Up-Next Hero Banner & Daily Task (`js/dashboard.js`)
- Overall Score & Grade Recovery per AGENTS.md §2.8 (`js/dashboard.js`)

---

## PHASE 55 — ALPHABETICAL SORTING & FILTERING FOR STUDENT WHITELIST, BATCHES & TESTS
- Student Attendance Whitelist Alphabetical Sorting (A → Z) (`js/admin/assessment-access.js`)
- Natural Alphanumeric Sorting for Batches (`js/admin/assessment-access.js`)
- Alphabetical Tests Table Sorting & Interactive Column Headers (`js/admin/assessment-access.js`)

---

## PHASE 54 — ASSESSMENT ACCESS BATCH LOADING & SMART CATEGORIZATION
- Resolve Database Column Error in Batch Query (`js/admin/assessment-access.js`)
- Smart Categorization & Rich Metadata (`js/admin/assessment-access.js`)
- Auto-Selection & Whitelist Checklist Auto-Load (`js/admin/assessment-access.js`)

---

## PHASE 53 — REMOVE TOP HEADER & ZERO-SCROLL DYNAMIC VIEWPORT SCALING FOR CLASS ATTENDANCE MATRIX
- Removal of Top Header & DataGrid Toolbar (`js/admin/app.js`, `js/admin/datagrid.js`, `css/admin.css`)
- Dynamic Responsive Row & Font Sizing (`js/admin/app.js`, `css/admin.css`)
- Zero-Scroll Viewport Geometry (`css/admin.css`)

---

## PHASE 52 — SPLIT SCORE AND GRADE (GRD) COLUMNS IN CLASS ATTENDANCE MATRIX
- SuperHeaders Colspan Expansion (`js/admin/app.js`)
- Standalone SCORE and GRD Columns (`js/admin/app.js`)
- Summary Row Alignment (`js/admin/app.js`)

---

## PHASE 51 — ACTIVE STUDENTS ENROLLED TAB & TASK POINTS 50-POINT MAX ALIGNMENT
- Topbar Tab Active Enrolled Students Count (`js/admin/app.js`)
- Task Attempt Points Recalibration to 50 Max Points (`scratch/recalibrate_task_points_50.mjs`, `js/admin/app.js`)
- Verification & Audits

---

## PHASE 50 — CLASS ROSTER ATTENDANCE MATRIX POINTS (POIN) DISPLAY & PTS ACCUMULATION
- Assessment Columns (1-20) Points Display (`js/admin/app.js`)
- Cumulative Points (PTS) & Column Sort Value Normalization (`js/admin/app.js`)
- Verification & Audits

---

## PHASE 49 — CLASS ROSTER ATTENDANCE MATRIX 20-COLUMN LAYOUT & THEME ALIGNMENT
- Dynamic Theme SuperHeaders Colspan Generation (`js/admin/app.js`)
- Elimination of Hardcoded Test Column Highlights (`js/admin/app.js`)
- Normalization of Cell Display Values & Total Points (PTS) (`js/admin/app.js`)

---

## PHASE 48 — UNIFIED VOCABULARY TASK & TEST SYSTEM, SPOKEN/WRITTEN ANSWER TYPES & SCORE MERGE
- Auto-Generator Unification (`js/api.js`)
- Student Attempt & Score Merging for Matching Topics (`scratch/execute_merge_migration.mjs`)
- Linear Prerequisite Chain Rebuild

---

## PHASE 47 — ASSESSMENT ACCESS, LIVE TEST SESSIONS & UNIFIED WORDS/PHRASES TEST
- Database & API Layer for Test Sessions & Dynamic Duration
- Dedicated Admin Panel "Assessment Access" (`admin.html` & `js/admin/assessment-access.js`)
- Student Dashboard Always-Visible "Next Assignment / Test Arena" Panel (`dashboard.html` & `js/dashboard.js`)
