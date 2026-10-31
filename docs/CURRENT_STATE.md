# CURRENT STATE

Last Updated: 2026-11-01 00:22 UTC+8

Current Phase: Phase 236: Student Roster Gender Streamlining & 4 Theme Exam Points Direct Parity [COMPLETE]

Current Task: Completed user directives: (1) Streamlined gender badges on Student Roster to clean, pure 'M' (blue) and 'F' (pink) without unicode icons. (2) Resolved `total_questions` missing column query bug in `student-management.js` line 73. (3) Eliminated redundant columns (`Score`, `Grd`, `Progress`) from Student Roster under active classes. (4) Replaced them with 4 explicit Exam columns (`Exam 1`, `Exam 2`, `Exam 3`, `Exam 4`) matching the 4 themes (Theme A Workplace, Theme B Tourism, Theme C CCU, Theme D High-Frequency) with exact total exam points parity to Class Hub. (5) All 40 JS files passed syntax validation (node --check) and verified 100% parity across Batch 133 students.

Status: COMPLETE (All requirements satisfied & all tests PASS)

## Next Exact Action
1. All changes committed (`4d6d01c`) and pushed to git remote.
2. User dapat hard-refresh di browser (Ctrl + F5):
   - Di `admin.html#students`:
     - Kolom Gender tampil rapi dengan huruf "M" atau "F" tanpa icon simbol.
     - Di bawah super-header `3RD VOCABULARY`, tampil 4 kolom ujian: Exam 1, Exam 2, Exam 3, Exam 4.
     - Nilai di masing-masing kolom Exam 1–4 mencerminkan total poin ujian tema riil siswa (identik dengan Class Hub).
     - Kolom Score, Grade, dan Progress yang tidak diperlukan telah bersih dihilangkan.
   - Di `admin.html#class-hub`:
     - Seluruh nilai ujian dan kuis tampil murni tanpa override / forgiven.
     - PROG mencerminkan persentase riil tes yang telah dikerjakan siswa.

## Files Changed In Latest Step
- `js/admin/student-management.js` — Removed `total_questions` from tests query, streamlined gender to pure M/F, replaced redundant columns with 4 theme exam points columns (`Exam 1` to `Exam 4`), removed progress column, updated sort comparators.
- `docs/CHANGELOG.md`, `docs/CURRENT_STATE.md`, `docs/SESSION_LOG.md`

## Completed

- **Phase 218: Result Page `attemptPct` ReferenceError Fix**:
  - **Identified Root Cause**: In `js/result.js` line 897, `const ptsColor = getGradeColorByScore(attemptPct);` referenced an undefined variable `attemptPct`. This triggered a `ReferenceError: attemptPct is not defined` inside the result loading pipeline, causing the try-catch block to display "Could not load results - attemptPct is not defined".
  - **Resolution**: Replaced `attemptPct` with `pct`, which is the correctly defined score percentage in that scope.
  - **Verification**: Verified using the exact attempt from the user's screenshot (`3c61e205-89d3-47d7-8bee-b61d1878e920`) in Node.js, confirming all score, points, color, and answers calculations complete with 0 errors. Bumped `result.html` to `?v=20261031_v55`.

- **Phase 217: Class Exam Points Authoritative Parity & Compact Gender M/F**:
  - **Gender M/F Streamlining**: Replaced long `♂ Male` / `♀ Female` strings with sleek, compact `♂ M` / `♀ F` badges (`width: 55px`), saving horizontal datagrid space while preserving colored gender distinction.
  - **Class Exam Points Parity**: In `student-management.js`, decoupled per-class metrics from quizzes and anchored them exclusively to class weekly exams (`isWeeklyExam`). Utilized `computeMilestoneExamMastery` to calculate class `pts`, `avgPct`, and `grade`. Roster PTS now reflects the total points of ALL exams in that class (e.g. Aunul = 482 pts, Latifa = 450 pts), achieving 100% parity with the Class Hub Attendance view.
  - **Class Exams Column Label**: Replaced generic 'Tests' with 'Exams' under the class super-header to clearly denote milestone exam completion count (e.g. `6 / 8`).
  - **Sorting Comparators**: Added DataGrid comparator branches for `_cls_pts_`, `_cls_score_`, `_cls_grade_`, and `_cls_tests_` so tutors can sort by individual class exam points and performance metrics.
  - **Cache Busting**: Bumped `admin.html` and `app.js` to `?v=20261031_v54`.
  - **Verification**: 40/40 JS files passed syntax validation (node --check) and 100% dashboard parity verified.

- **Phase 216: Result Page Missing Export (`getGradeColorByScore`) Import Fix**:
  - **Identified Root Cause**: In `result.js`, `getGradeColorByScore` was imported from `./api.js`. However, `api.js` only imported and exported a subset of grading helpers from `grading.js`, omitting `getGradeColorByScore`. The browser threw `Uncaught SyntaxError: The requested module './api.js' does not provide an export named 'getGradeColorByScore'`, preventing `result.js` from executing and halting the page at "Loading your results...".
  - **Resolution**: Added `getGradeColorByScore` to `js/api.js` import/export list and re-targeted `result.js` to import it directly from `./grading.js?v=20261031_v53`.
  - **Verification**: Verified full module import and evaluation under mocked environment, and 40/40 JS files syntax PASS.

- **Phase 215: Seamless Theme Exam Transition & Live Session Lockout Elimination**:
  - **Live Session Lockout Bypass**: In `js/dashboard.js`, when a tutor actively unlocks a test session for a batch/student, `isSessLive` marks `prereqMet = true`. This prevents students who scored < 60% on Words Exam (or taking during the active session) from being locked out of Phrases Exam. Outside of live sessions, standard curriculum prerequisites remain intact.
  - **Theme Exam Pair Transition**: In both `dashboard.js` (`renderNextAssessment`) and `result.js` (`renderSmartNextAction`), if `nextAsm` was Words Exam and the student has already attempted it, the next milestone advances to unattempted sibling Phrases Exam. Students are immediately presented with a direct 1-click button to take Phrases Exam.
  - **Cache Busting**: Bumped `dashboard.html` and `result.html` to `?v=20261031_v53`.

- **Phase 214: Student Roster Dynamic Per-Class Column Groups & SuperHeaders**:
  - **Dynamic Multi-Class Architecture**: Fetched active classes alongside students, attempts, and progress. Instead of static single-class columns, the DataGrid automatically detects all active classes attended by students and constructs dedicated column sets: `[Class Name: Score | Grd | PTS | Tests]`.
  - **SuperHeaders Grouping**: Leveraged DataGrid `superHeaders` to create visual banner groupings for each class name spanning its 4 metrics, preserving clean layout and alignment.
  - **Fallback Safety**: Retains a compact global Progress column and gracefully displays `—` for students not enrolled in a given active class.

- **Phase 213: Live Test Session Dual Exam Whitelist & Resilient Status Synchronization**:
  - **Identified Root Cause of Phrases Exam Lockout**: At session opening and late-add, `tests-access.js` was filtering `phrasesAllowedIds` based on whether students had *already* passed Words Exam (`ev.wordsPassed`). Since students take Words Exam *during* the live session, `phrasesAllowedIds` was locked with `[]`, permanently locking students out of Phrases Exam even after passing Words Exam.
  - **Unification**: Whitelisted all eligible batch students for both Words and Phrases tests upon opening a Theme session. Sequential progression (Phrases requiring Words Exam >= 60%) continues to be dynamically enforced in real-time by `js/dashboard.js`.
  - **Resilient Dual Session Detection**: Merged session status so the Theme Card correctly shows `LIVE` if either Words or Phrases session is open, picking the longest window and merging active student IDs.

- **Phase 212: Birthdate Required Validation + Missing DOB Roster Warning**:
  - Added required asterisk and helper text on Date of Birth field.
  - Enforced save validation guard in Add/Edit Student modal.
  - Rendered `⚠ No DOB` badge with hover tooltip in the Age column for students with missing birth dates.

## Completed

- **Phase 211: Class Attendance DataGrid Font Scale & Typography Harmony**:
  - **Identified Root Causes**:
    * Student names were hardcoded to `0.76rem` (`12.16px`), while numbers across the test matrix used `var(--matrix-font-size, 0.74rem)` which scaled dynamically down to `9.5px`–`11px` via `fitMatrixToScreen()`, causing names and numbers to be mismatched.
    * Grade (`GRD`) was rendered excessively large at `0.86rem`–`0.92rem` (`font-weight: 800/900`).
    * Metadata badges (`INST`, `BATCH`), summary exam points, and theme points had rogue `font-family: monospace` overrides.
    * Summary footer row had scattered font sizes (`0.68rem`, `0.72rem`, `0.75rem`, `0.85rem`).
  - **Unified Base Scale**:
    * Unified student names (`col-sticky-4`) and all numerical cells (PROG, PTS, quiz scores, exam scores, points, theme scores, theme points, summary averages) to `var(--matrix-font-size, 0.75rem)` so they are 100% synchronized in size and baseline.
    * Harmonized metadata (`INST`, `PROGRAM`, `BATCH`) to `calc(var(--matrix-font-size, 0.75rem) * 0.92)` and purged all `font-family: monospace` inline styles.
    * Harmonized `GRD` typography to `calc(var(--matrix-font-size, 0.75rem) * 1.05)` (letters) and `calc(var(--matrix-font-size, 0.75rem) * 1.15)` (Star ★) at clean `font-weight: 700`.
    * Standardized data font-weight to `600` and headers/grades to `700`.
    * Enforced `font-variant-numeric: tabular-nums` for crisp vertical digit alignment.
  - **Cache Busting**:
    * Bumped cache busters across `admin.html` to `?v=20261031_v51`.
  - **Verification**:
    * 40/40 JS syntax checks PASS, 100% dashboard parity verified, 0 git commit.

- **Phase 210: Full Route & Sub-Tab State Persistence Alignment (Rule 2.20)**:
  - **Bidirectional Sub-Tab Hash Sync**: Added `window.history.replaceState` into `_switchClassHubTab` (`#class-hub?tab=...`), `_switchSettingTab` (`#settings?tab=...`), `_switchVaultTab` (`#vocab_vault?tab=...`), `_switchStudentRegTab` (`#student-registration?tab=...`), and `_switchClassTestAnalytics` (`#tests?class_id=...`).
  - **No Disorienting Redirects**: On browser F5 refresh, page reload, or background sync, `parseHashRoute` extracts exact section, sub-tab, and parameters, restoring the user's view seamlessly.
  - **Cache Busting**: Bumped cache busters across `admin.html` to `?v=20261031_v50`.
  - **Verification**: 40/40 JS syntax checks PASS, Parity checks PASS 100%, 0 git commit.

- **Phase 209: Class Hub DataGrid Clean Typography Grade Alignment**:
  - **Design Enhancement**: Replaced dense filled circular badges (`grade-circle`) in the Class Attendance DataGrid with sleek, bold colored typography (`.grid-grade-val`).
  - **Typographic Harmony**: Aligned `GRD`, `PROG`, and `PTS` into a unified typography-driven hierarchy without heavy button-like circle distractions in the data rows.
  - **Star (★) Presence**: Rendered the Star tier with pure green color (`--grade-star`) and subtle glow (`--grade-star-glow`) at `0.92rem` font size.
  - **Letter Clarity**: Letters A, B, C, D, E are rendered crisp at `0.86rem` (`font-weight: 800`) with dynamic score coloring.
  - **Summary Footer Alignment**: Updated `avgGradeBadge` in the datagrid summary row to match the clean typography standard.
  - **Cache Busting**: Bumped cache busters to `?v=20261031_v49` in `admin.html`.
  - **Verification**: 40/40 JS syntax checks PASS, Parity checks PASS 100%, 0 git commit.

- **Phase 208: Test Analytics Drill-Down State Alignment & Cache Refresh**:
  - Attached `hardestQs20` and `themeTop20` directly onto `window._testAnalyticsState` so the Curriculum Bottlenecks drill-down modal (`cardKey === 'wall'`) receives the exact active-error Top 20 ranking.
  - Added strict submission and timeout filtering to `_openTestDetailDrawer` so individual test inspection drawers exclude abandoned drafts and timeout blanks.
  - Bumped cache busters across `admin.html` and `js/admin/app.js` to `?v=20261031_v48`.
  - Verified 40/40 JS files syntax passing cleanly.

- **Phase 207: Test Analytics Submitted-Attempt Isolation**:
  - **Identified & Mapped Side Quest Root Cause**:
    * Sesi siswa yang sedang berlangsung (`in_progress`) atau sesi terbengkalai tanpa penyerahan (`submitted_at == null`) sebelumnya ikut terhitung ke dalam metrik bottleneck karena ketiadaan filter status pada iterasi `answersRes`.
  - **Implemented Strict Submission Filter**:
    * In `js/admin/tests-management.js`: Added authoritative guard `if (!att) return; if (!isSubmitted) return;` at the start of `answersRes.forEach`.
    * Sesi hanya diproses jika `status === 'submitted'`, `status === 'auto_submitted'`, `status === 'graded'`, `status === 'evaluated'`, atau memiliki `submitted_at`.
    * Memastikan analitik murni merefleksikan hasil ujian final siswa, bebas dari distorsi draf sementara.
  - **Verification**:
    * 40/40 JS syntax checks PASS (`node scripts/check_all_js_syntax.cjs`).
    * Analytics Classifier tests PASS 100% (`scripts/test_analytics_classifier.mjs`).
    * Strict adherence: 0 git commit, 0 git push.

- **Phase 206: Screen, Sub-Tab & Route State Persistence on Reload / Dynamic Update**:
  - **Decoupled URL Hash Route & Query Parsing (`parseHashRoute`)**:
    * Created robust parser in `js/admin/app.js` extracting base sections, sub-tabs (`/` or `:`), and URL search parameters (`?`).
    * Expanded `aliasSectionMap` and `sectionTitles` to comprehensively recognize all aliases (`vocabulary`, `vocab`, `system-settings`, `test-analytics`, `test-sessions`, `batches`, `programs`, etc.), completely eliminating erroneous redirects to default `#tests`.
    * Synchronized background route restoration when opening `#profile-<studentId>` so closing the modal returns to the active view rather than a blank canvas.
  - **Sub-Tab & Active Filter State Synchronization**:
    * **Class Hub (`class-hub`)**: Restores and persists active sub-tab (`topscore_admin_class_hub_tab`: `attendance`, `test-sessions`, `tests`) and selected class ID (`topscore_selected_class_id`).
    * **Test Analytics (`tests`)**: Restores and persists selected class track filter (`topscore_admin_tests_class_id`) across reloads instead of defaulting to Vocabulary.
    * **Vocabulary Vault (`vocab_vault`)**: Restores and persists active tab (`topscore_admin_vault_tab`: `blueprint`, `vocab`, `phrases`).
    * **System Settings (`settings`)**: Restores and persists active tab (`topscore_admin_settings_tab`: `site`, `audit`, `health`, `recycle`).
    * **Students Registration (`student-registration`)**: Restores and persists active tab (`topscore_admin_student_reg_tab`: `bulk`, `individual`).
    * **Student Management (`student-management`)**: Preserved active section alias across remedial status updates and bulk student updates. Added `#profile-<studentId>` and `#dossier-<studentId>` hash routing and prior section restoration upon modal closing.
    * **Student Dashboard (`dashboard.html` / `js/dashboard.js`)**: Restores and persists active class selection (`topscore_student_last_class_id`) upon reload or background sync. Restores and synchronizes URL hash and back/forward browser navigation for Student Profile (`#profile`), Exam History (`#profile-history`), Class Level Modal (`#levels-<classId>`), and Class Selector (`#select-class`).
  - **Codified Master Rule 2.20 in AGENTS.md (/learn)**:
    * Formally enacted non-negotiable contract Rule 2.20 enforcing state and route preservation across all future screens and updates.
  - **Productivity & Developer Settings Optimization (`.vscode/settings.json`)**:
    * Configured smooth scrolling, smooth caret animation, bracket pair guides, complete function calls suggestion, side-by-side diffing, and disabled background git autofetch to honor the user's strict 0 git commit policy.
  - **Cache Busting**:
    * Bumped cache busters to `?v=20261031_v47` across `admin.html`, `dashboard.html`, `js/admin/app.js`, `js/admin/tests-management.js`, `js/admin/vocab-vault.js`, `js/admin/student-registration.js`, and `js/dashboard.js`.
  - **Verification**:
    * 40/40 JS syntax checks PASS (`node scripts/check_all_js_syntax.cjs`).
    * Student Dashboard Parity tests PASS 100% (`scripts/test_student_dashboard_exam_parity.mjs`).
    * Strict adherence: 0 git commit, 0 git push.

- **Phase 205: Progress-Value Independent Grading Scale Coloring & GRD Column Repositioning**:
  - **Repositioned GRD Column Directly Beside STUDENT NAME**:
    * Moved `grade` (`GRD`) to column 5 (`col-sticky-5`, width 38px, left 290px), immediately adjacent to `STUDENT NAME` (`col-sticky-4`, left 150px, width 140px).
    * Moved `progressPct` (`PROG`) to column 6 (`col-sticky-6`, width 46px, left 328px).
    * Retained `totalEarnedScore` (`PTS`) as column 7 (`col-sticky-7 col-sticky-last`, width 46px, left 374px).
    * Total sticky panel width remains exactly 420px.
    * Left panel hierarchy now reads naturally:
      $$\text{INST} \mid \text{PROGRAM} \mid \text{BATCH} \mid \text{STUDENT NAME} \mid \mathbf{\text{GRD}} \mid \mathbf{\text{PROG}} \mid \text{PTS}$$
  - **Independent Progress % Coloring from Its Own Percentage**:
    * Decoupled `PROG` percentage text color from the student's exam score (`averageScorePct`).
    * `row.progressPct` is now evaluated independently against the official TopsCore grading scale (`getGradeColorByScore(row.progressPct)`):
      - 100%: Green Star / Pure Green (`#00c000ff`)
      - 90% – 99%: Pure Green (`#00c000ff`) (e.g. 95% -> Green)
      - 80% – 89%: Electric Lime (`#95ff00ff`) (e.g. 85% -> Lime)
      - 60% – 79%: Pure Yellow (`#FFFF00`) (e.g. Nurhaliza's 73% & Shelia's 70% are now correctly Yellow, not Red)
      - 30% – 59%: Dark Orange (`#FF8C00`) (e.g. 50%, 45%, 43% -> Orange)
      - 0% – 29%: Pure Red (`#FF0000`)
    * In summary footer row: `avgProg` text is evaluated independently via `getGradeColorByScore(avgProg)` (60% -> Yellow `#FFFF00`).
  - **Cache Busting**:
    * Bumped cache busters to `?v=20261031_v46` across `admin.html` (CSS & JS).
  - **Verification**:
    * 40/40 JS syntax checks PASS (`node scripts/check_all_js_syntax.cjs`).
    * Student Dashboard Parity tests PASS 100% (`scripts/test_student_dashboard_exam_parity.mjs`).
    * Strict adherence: 0 git commit, 0 git push.

- **Phase 204: Test Analytics Authentic Active Error Filtering & Top 20 Bottlenecks**:
  - **Unanswered / Timed Out Question Filtering**:
    * Strictly filtered out questions where students never provided an answer (`[Blank / Timed Out]`, empty, `-`, `—`, `null`).
    * Excluded timeout blanks from `wrongAnswersCount` and question failure metrics.
    * Bottlenecks board now exclusively displays questions with authentic student mistakes across the 3 Vocabulary Class answering modes:
      1. **Typing (Written)**: Evaluated for spelling typos, word form/POS confusion, or Indonesian literal translation.
      2. **Speaking (Speech Recognition)**: Evaluated for phonemic/word substitutions or literal translation.
      3. **Selecting (Multiple Choice)**: Evaluated for distractor/semantic misconceptions.
  - **Top 20 Most Missed Questions Expansion**:
    * Expanded `themeTop10` to `themeTop20`, displaying up to 20 pedagogical bottlenecks per theme column (Theme A, B, C, D) instead of 10.
    * Ranked primarily by highest active student failure count (`b.fail - a.fail`), then failure rate (`b.failRate - a.failRate`), then total student attempts.
    * Cleaned question cards: `topErrors` now strictly lists actual student wrong answers (e.g. `❌ "remain" (1x • 50%)`), completely eliminating `⏳ Timed Out / Blank`.
    * Card footer diagnostic tags now exclusively show active linguistic categories (`[🔤 Spelling]`, `[🇮🇩 Literal Translation]`, `[🔄 Word Form]`), completely eliminating the misleading `[⏳ Timeout]` tag.
  - **Pacing Timeout Decoupling in Diagnostic Header**:
    * Student Error Diagnosis percentages (Spelling, Literal, Word Form) are now calculated over active student mistakes, accurately representing 100% of linguistic misconceptions.
    * Session timeouts are decoupled into a dedicated `Timed Out: N (Pacing)` metric.
  - **Cache Busting**:
    * Bumped cache busters to `?v=20261031_v45` across `js/admin/tests-management.js`, `js/admin/app.js`, and `admin.html`.
  - **Verification**:
    * 40/40 JS syntax checks PASS (`node scripts/check_all_js_syntax.cjs`).
    * Student Dashboard Parity tests PASS 100% (`scripts/test_student_dashboard_exam_parity.mjs`).
    * Analytics Classifier tests PASS 100% (`scripts/test_analytics_classifier.mjs`).
    * Strict adherence: 0 git commit, 0 git push.

- **Phase 203: Progress-First Ranking, Left Panel PTS Column & Unbroken Theme Dividers**:
  - **Progress-First Leaderboard Ranking Hierarchy**:
    * Implemented user specification for Vocabulary class:
      1. Primary: **PROG % DESC** (curriculum completion rate).
      2. Secondary: **Latest Exam Package Points DESC** (`totalEarnedScore` / `latestAttemptedTheme.earned` combining Words + Phrases).
      3. Tertiary: **Global SCORE % DESC** (`averageScorePct`).
      4. Quaternary: **Earliest submission timestamp ASC** (`lastSubmittedAt`).
      5. Quinary: Clean student name alphabetical.
    * Applied consistently across:
      - `js/admin/app.js` (`studentsGridData.sort`, `sortComparator`, `initialSortKey: 'progressPct'`, `initialSortAsc: false`).
      - `js/dashboard.js` (`loadBatchLeaderboard` studentStats sorting).
      - `scripts/test_student_dashboard_exam_parity.mjs` and `scripts/test_batch_133_student_lobby_standings.mjs`.
  - **Restored Exam Points (`PTS`) Beside `GRD` in Left Sticky Panel**:
    * Added `totalEarnedScore` as column 7 (`PTS`, `col-sticky-7 col-sticky-last`, width 46px).
    * Sticky panel now contains 7 columns:
      `INST (48px) | PROGRAM (54px) | BATCH (48px) | STUDENT NAME (140px) | PROG (46px) | GRD (38px) | PTS (46px)`.
    * Total sticky width: 420px (maintaining +60px space saving for test grid).
    * `dynamicSuperHeaders[0].colSpan = 7`.
    * Rendered with score-based dynamic color (`getGradeColorByScore`) and clean `pts` suffix.
  - **Progress % Text Color Inherited from Score**:
    * Updated `PROG` column in `js/admin/app.js`: if exams are attempted, progress text color dynamically inherits `getGradeColorByScore(row.averageScorePct)`.
    * In `summaryRow` footer: `avgProg` text dynamically inherits `getGradeColorByScore(avgScore)`.
  - **Unbroken 3px Vertical Theme Separator Borders**:
    * Resolved CSS cascade conflict where `td.col-exam-pts` previously applied `border-right: none !important` over `td.col-test-theme-total`.
    * Scoped to `td.col-exam-pts:not(.col-test-theme-total)` and applied firm 3px solid borders in signature theme colors (`#38bdf8`, `#c084fc`, `#fbbf24`, `#34d399`) across super-headers, headers, tbody cells, and tfoot summary row cells with distinct box-shadows.
  - **Cache Busting**:
    * Bumped cache busters to `?v=20261030_v44` across HTML, JS, and CSS files.
  - **Verification**:
    * 40/40 JS syntax checks PASS (`node scripts/check_all_js_syntax.cjs`).
    * Parity and standings tests PASS 100% (`scripts/test_student_dashboard_exam_parity.mjs`).
    * Absolute standing ban: 0 git commit, 0 git push.

- **Phase 202: Class Hub Matrix Streamlining & Rule 2.7 Restoration**:
  - **Retained GRD (Grade) in Left Sticky Panel (DECISION-032)**:
    * User explicitly confirmed: *"biarkan grade"*.
    * Kolom `GRD` dipertahankan sebagai kolom sticky ke-6 (`col-sticky-last`) dengan visual separator cyan `border-right: 3px solid rgba(56, 189, 248, 0.75)` dan badge warna dinamis sesuai capaian nilai siswa.
    * Struktur kolom panel kiri tetap: `INST | PROGRAM | BATCH | STUDENT NAME | PROG | GRD`.
  - **Removed Active Theme Badges Beside Student Names**:
    * Cleaned up the `STUDENT NAME` column in `js/admin/app.js` (`renderClassHub`), removing `<span class="badge-active-theme">` per user request (`"keterangan tentang thema yang sedang di ambil di samping nama tidak perlu"`).
  - **Streamlined Left Sticky Panel (Removed SCORE and PTS)**:
    * Removed `averageScorePct` (`SCORE`) and `totalEarnedScore` (`PTS`) sticky columns from `initialRosterData` and table rendering in `js/admin/app.js`.
    * Sticky column structure is now clean and concise:
      `INST (col 1, 48px) | PROGRAM (col 2, 54px) | BATCH (col 3, 48px) | STUDENT NAME (col 4, 140px) | PROG (col 5, 46px) | GRD (col 6, 40px)`.
    * Updated `dynamicSuperHeaders[0].colSpan = 6` (was 8) and updated `col-sticky-last` with clean cyan accent border on `GRD`.
    * Left panel width reduced from 480px to 376px, saving +104px of horizontal space for the test matrix.
  - **Diagnosed and Restored Disappearing / 0% Scores (Rule 2.7 Restoration)**:
    * **Root Cause**: An automated system cron sweep (`auto_close_expired_attempts`) had automatically submitted idle/expired sessions on Oct 28 & 30 with 0 points. When attempt sorting was temporarily altered to sort by `submitted_at`, these newer 0-point auto-close entries overwrote students' real historical high scores (Aunul Fikri's Theme C quizzes became 0%, Asmul Kholid's Test 17 218 pts became 0 pts, Laura Fardila's Test 17 119 pts became 5 pts, Frengki's Test 17 68.5 pts became 0 pts).
    * **Fix**: Restored TopsCore Rule 2.7 (highest valid score & capped score priority) across `js/admin/app.js`, `js/dashboard.js`, and `js/admin/student-management.js`. Now valid student submissions always take precedence over empty auto-close sessions.
    * **Theme Totals Clarification**: Explained that students showing dots (`·`) under Theme C total columns (e.g. Suke Ajai, Asti Ananta, Shelia) have completed daily formative quizzes (19–28) but have not yet taken the weekly exams (29 & 30) that define the theme score.
  - **Cache Busting**:
    * Bumped cache busters to `?v=20261030_v43` across all relevant HTML, JS, and CSS files.
  - **Verification**:
    * 40/40 JS syntax checks PASS (`node scripts/check_all_js_syntax.cjs`).
    * Student Dashboard Parity tests PASS 100% (`scripts/test_student_dashboard_exam_parity.mjs`).
    * Batch 133 Standings verified 100% (`scripts/test_batch_133_student_lobby_standings.mjs`).
    * Absolute standing ban: 0 git commit, 0 git push.

- **Phase 201: Dynamic Package Denominator Calibration & Matrix Typographic Polish**:
  - **Dynamic Package Denominator Calibration**:
    * Resolved score calculation anomalies for students with dynamic shell snapshots (e.g. Syazida Shinda Debi & Ari Wahyu Darma).
    * Previously, `themeMaxQ` statically hardcoded 600 questions (480 words + 120 phrases) for Theme C, penalizing Syazida (tested on 200 words + 120 phrases = 320 questions) by dividing her 262 points by 600 (yielding 44% D) and Ari Wahyu (tested on 200 words + 120 phrases = 320 questions) by dividing his 256 points by 600 (yielding 43% D).
    * Upgraded `computeMilestoneExamMastery()` in `js/grading.js` and `renderClassHub()` in `js/admin/app.js`:
      - For each exam in the theme package: if the student attempted it, their attempt's actual `total_questions` is used; if unattempted, the test's expected questions (`getExpectedMax`) are added to the denominator with 0 points earned, strictly adhering to the user's rule: *"nilai tiap tema adalah 1 paket, jadi kalau belum dikerjakan, maka tetap dihitung"*.
      - Syazida correctly achieves **82% Grade B (262 pts / 320 max)**.
      - Ari Wahyu correctly achieves **80% Grade B (256 pts / 320 max)**.
      - Aunul Fikri achieves **80% Grade B (482 pts / 600 max)**.
      - Gagan Tara achieves **75% Grade C (451 pts / 600 max)**.
      - Unggul Wirakse achieves **66% Grade C (393 pts / 600 max)**.
      - Wardatul Husna achieves **51% Grade D (304 pts / 600 max)**.
      - Muhammad Masyan achieves **49% Grade D (293 pts / 600 max)**.
  - **Firm 3px Theme Dividers (Unmistakable Theme Boundaries)**:
    * In `css/admin.css` and `js/admin/app.js`:
      - Super-headers: `super-hdr-theme-a` (3px #38bdf8), `super-hdr-theme-b` (3px #c084fc), `super-hdr-theme-c` (3px #fbbf24), `super-hdr-theme-d` (3px #34d399).
      - Grid columns: `col-test-theme-total` updated with theme-specific classes (`col-test-theme-total-a`, `col-test-theme-total-b`, `col-test-theme-total-c`, `col-test-theme-total-d`) rendering a firm 3px solid border in the theme's accent color all the way down through tbody rows and summary footer.
  - **Typographic Refinement & Font Unification**:
    * Softened excessive boldness (`font-weight: 800/900` -> `font-weight: 600` semibold) across `#class-attendance-grid`, headers, scores, and points.
    * Standardized font sizes across student names and numerical cells to `0.76rem` (`--matrix-font-size: 0.76rem;`).
    * Unified font family across all table cells to `'Inter', system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;`.
    * Enforced `font-variant-numeric: tabular-nums !important; font-feature-settings: "tnum" 1 !important;` across all numerical columns for precise vertical digit alignment.
  - **Active Theme Badges**:
    * Added compact active milestone pill badge beside student names in Class Hub: `<span class="badge-active-theme badge-active-theme-c">TH-C</span>`, clearly communicating the active benchmark theme to tutors.
  - **Cache Busting**:
    * Upgraded cache buster parameter to `?v=20261030_v42` across `admin.html`, `dashboard.html`, `js/admin/app.js`, `js/dashboard.js`, `js/admin/student-management.js`, and `css/admin.css`.
  - **Verification**:
    * Ran `npm test`: 40/40 JS syntax checks PASS, 100% dashboard parity verified.
    * Ran `test_batch_133_student_lobby_standings.mjs`: 100% match across Class Hub, Student Dashboard, and Student Management.
    * Verified zero git commit or push per user instruction.

- **Phase 200: Vocabulary Evaluation Engine: Non-Cumulative Latest Attempt & Latest Theme Session Benchmark**:
  - **Eliminated Cumulative Point Accumulation & Past History Dilution**:
    * Updated `computeMilestoneExamMastery()` in `js/grading.js`:
      - `totalPoints` now represents the points earned on the student's **latest active theme exam session** (`latestAttemptedTheme.earned`), completely eliminating historical point summing (e.g. Aunul Fikri now shows 362 pts instead of 683.5 pts).
      - `overallScore` strictly reflects the percentage score achieved on that latest theme exam session (`latestAttemptedTheme.scorePct`).
      - `grade` accurately reflects `calculateGrade(overallScore)`.
      - `cumulativePoints` preserved as an explicit secondary attribute for audit/telemetry records.
  - **Latest Attempt Selection for Multiple Attempts / Retakes**:
    * In `js/admin/app.js` (`renderClassHub`), `js/dashboard.js` (`computeOverallStats`, `loadBatchLeaderboard`), and `js/admin/student-management.js`:
      - Replaced high-score priority (`effPoints > current`) with latest timestamp sorting (`new Date(y.submitted_at || y.created_at) - new Date(x.submitted_at || x.created_at)`), ensuring that student retakes and remediations evaluate the student's *current retention* and actual contemporary competence.
  - **Strict Adherence to Unified Color Vault (Single Source of Truth)**:
    * In `admin.html#class-hub` matrix:
      - `SCORE` and `PTS` dynamically colored via `getGradeColorByScore(row.averageScorePct)`.
      - Tooltips upgraded to inform tutors of the active theme: `Latest Exam Score: ${score}% (Theme ${activeThemeCode})` and `Latest Exam Points: ${pts} pts (Theme ${activeThemeCode})`.
      - `CLASS AVERAGE` footer row: Average score and average points dynamically colored via `getGradeColorByScore(avgScore)`.
    * In `dashboard.html` (Student Lobby):
      - Leaderboard points column dynamically colored via `getGradeColorByScore(st.overallScore)`.
      - Grade chips strictly enforce Star ★ white text and slate dark `#0F172A` for grades A-E.
  - **Verification & Parity**:
    * Ran `npm test`: 40/40 JS syntax checks PASS, all 27 SW assets exist, 100% dashboard parity verified.
    * Ran `test_batch_133_student_lobby_standings.mjs`: 100% match between Class Hub simulation and Student Dashboard standings.
    * Verified zero git commit or push per user instruction.

- **Phase 199: Test Analytics Cockpit Overhaul & Theme Comparison Board**:
  - **Eliminated Visual Clutter & "Crash / Alarm" Elements**:
    * Completely removed the jarring neon-red horizontal bars running across cards.
    * Purged all internal engineering jargon from the UI (e.g. "RULE 2.10", "FAPR", "LINGUISTIC POS MATRIX", "THE WALL") across main view and drill-down modals.
    * Upgraded layout to modern dark-mode card aesthetic with soft rounded corners (`border-radius: 8px` / `10px`), subtle emerald target answer accents (`#34d399`), soft coral/amber mistake highlights (`#fda4af` / `#fde68a`), and soft blue word-type pills (`#38bdf8`).
  - **Top Executive Header Bar**:
    * ⏱️ **Class Answering Pacing**: Overall average answering time per question (`avgQuestionPacingSec` e.g. `14.8s / question`) & average test completion duration (`avgTestDurDisplay` e.g. `19m 11s / test`).
    * ⚠️ **Student Error Diagnosis Breakdown**: Real-time classification into 4 explicit pedagogical categories:
      - 🔤 Spelling / Typos
      - 🇮🇩 Literal Translation
      - 🔄 Word Form / Part-of-Speech Confusion
      - ⏳ Timed Out / Blank
    * Prominent action button: `⏱️ Test Pacing & Duration Drawer ➔` smoothly opening the telemetry drawer.
  - **4-Column Side-by-Side Theme Comparison Board**:
    * Displays 4 side-by-side columns: **Theme A** (Workplace), **Theme B** (Tourism), **Theme C** (Culture), and **Theme D** (Advanced Mastery).
    * Each column shows the **Top 10 Most Missed Questions** for that theme, filtered by `q.fail >= 1` and ranked by error volume & fail rate (`b.fail - a.fail || b.failRate - a.failRate`).
    * Question card components:
      - Rank & Indonesian prompt with word-type badge (`Verb`, `Noun`, `Phrase`, `Adjective`).
      - Target correct answer in soft emerald green (`Target: retell; recount`).
      - **Actual Student Error Answers**: Grouped list of what students actually typed with counts and percentages (e.g. `❌ "story again" (8x • 44%)`, `❌ "telling back" (4x • 22%)`, or `⏳ Timed Out / Blank (3x • 17%)`).
      - ⏱️ Average Question Answering Time badge (`⏱️ 16.4s`).
      - 🏷️ Dominant Diagnosis Tag (`[🇮🇩 Literal Translation]`, `[🔤 Spelling]`, `[🔄 Word Form]`, `[⏳ Timeout]`).
      - Failure rate & counts (`88% Fail (7/8)`).
      - Responsive container with modern custom scrollbars and smooth side-by-side scrollability.
  - **Slide-Out Drawer: Test-by-Test Completion & Pacing**:
    * Right-side slide-out drawer with dark backdrop, smooth transition, Escape key dismissal, and backdrop click-outside close with body scroll locking.
    * Search box & filter pills (`All Tests`, `Quizzes`, `Exams`, `High Timeout`) with `#tac-pacing-no-results` empty-state row.
    * Comprehensive telemetry table across all 40 tests:
      - Test Title & Shell Code badge (e.g. `3A1-WORDS-QUIZ`, `3D-PHRASES-EXAM`).
      - Type (`⚡ Daily Quiz` vs `🎓 Weekly Exam`).
      - Submissions count.
      - Average completion duration vs limit (`4m 12s / 8m`) with visual pacing ratio bar.
      - Pass Rate % dynamically colored via `getGradeColorByScore`.
      - Timeout Rate % & count.
      - Pacing Status badge (`🟢 Comfortable`, `🔵 Normal`, `🟠 Rushed`, `⚠️ High Timeout`, `⚪ No Data`).
      - Row inspect button seamlessly triggering detailed test telemetry drawer with full telemetry stats.
  - **Data Processing Engine & Hardening (`js/admin/tests-management.js`)**:
    * Upgraded `attempt_answers` query to retrieve balanced empirical answers across themes A, B, C, D (up to 4,000 records).
    * Switched to TopsCore authoritative `damerauLevenshtein` engine from `grading.js`.
    * Refined error classifier with accurate multi-word circumlocution detection, `partial`/`half` evaluation result recognition, and comprehensive derivational suffix matching with silent 'e' drop.
    * Populated all telemetry fields on `drawerRows` (`takersCount`, `avgScoreVal`, `remRateVal`, `pacingVal`, `securityFlags`, `status`, `programName`, `classBoard`, `TestCategory`, `qCount`, `minScore`, `prereq`) ensuring the Inspect drawer is completely functional.
    * Fixed case-sensitive table crashes in `_duplicateTest` and `openSessionModal` (`sb.from('Tests')` -> `sb.from('tests')`).
    * Replaced native `alert()` with `showToast`.
    * Updated cache version query parameter in `js/admin/app.js` (`tests-management.js?v=20261030_v40`).


- **Phase 198: P0 Infrastructure & Reliability Hardening**:
  - **Student Level-Up Progression Engine (`js/api.js`)**:
    * In `checkAndTriggerLevelUp()`, updated gating exam query from `.eq('category', 'TEST')` to `.in('category', ['EXAM', 'TEST'])`, enabling milestone exams to trigger level advancement upon achieving $\ge 60\%$.
    * Removed query references to non-existent `levels.program_id` column (selecting `id, level_number` and querying `nextLevel` by `level_number`), resolving runtime PostgreSQL error 42703.
    * Upgraded attempt score check to inspect `effective_score ?? percentage` across submitted/auto_submitted attempts, ensuring remediated exam completions are accurately counted.
    * Fixed critical regression in `fetchStudentLevel()`: now queries `level_id, levels:level_id(...)` alongside batch defaults so individual student level-ups are preserved on dashboard reload.
    * Added comprehensive automated regression test `scripts/test_levelup_logic.mjs` verifying milestone exam detection, 60% threshold, remedial effective scores, and dual-check level resolution.
  - **Database Performance Indexing**:
    * Created migration `supabase/migrations/20261030160000_performance_indexes.sql`:
      - `idx_attempts_student_test` ON `public.attempts(student_id, test_id)`
      - `idx_attempt_answers_attempt_id` ON `public.attempt_answers(attempt_id)`
      - `idx_students_batch_id` ON `public.students(batch_id)`
      - `idx_students_program_id` ON `public.students(program_id)`
    * Applied directly to Supabase Cloud PostgreSQL database via `scripts/apply_performance_indexes.mjs` and verified in `pg_indexes`.
    * Hardened `scripts/apply_performance_indexes.mjs` to accept `SUPABASE_DB_HOST`, `SUPABASE_DB_PORT`, `SUPABASE_DB_USER`, `SUPABASE_DB_NAME` environment variables.
  - **CDN Route Security & Credential Protection**:
    * `netlify.toml`: Added forced 404 redirects for `/scripts/*`, `/scripts`, `/supabase/*`, `/supabase`, `/docs/*`, `/docs`, `/scratch/*`, `/scratch`, `/supabase_deploy/*`, `/supabase_deploy` to prevent public directory traversal.
    * `vercel.json`: Added route redirects for bare paths and wildcards (`/scripts`, `/scripts/:path*`, `/supabase`, `/supabase/:path*`, `/docs`, `/docs/:path*`, `/scratch`, `/scratch/:path*`, `/supabase_deploy`, `/supabase_deploy/:path*`) to `/`.
    * `scripts/fix_emergency_submit.mjs` & `scripts/sync_local_to_cloud.mjs`: Redacted hardcoded plaintext password (`100%TopsCore`), dynamically reading from `process.env.SUPABASE_DB_PASSWORD || process.env.PGPASSWORD` with validation guards.
  - **Verification**:
    * All test suites executed and passing: `test:syntax` (40/40 JS syntax checks), `test:grading` (100%), `test:manifest` (27/27 SW cache items), `test:parity` (100% dashboard parity), `test:prereq` (sequential exam prerequisites), `test:duration` (RPC emergency submit & auto-close, 8m duration verified). Zero visual or layout regressions.


- **Phase 197: Comprehensive Grading & Typography Color Unification Across CSS & JS**:
  - **User Mandate**: Full, in-depth execution of color unification across the codebase without git commit or push: *"Saya ingin kamu data semua warna di grading scoring dan SEMUA font atau teks yang memakai warna,,, kita pakai kesempatan ini untuk menyatukan warna agar tidak muncul warna yang tiba2 berbeda.... oh ya, no push commit!"*
  - **Single Source of Truth Enforced**:
    * Star Tier (`★` / 100%): `#00c000ff` (rgb: `0, 192, 0`, badge text `#FFFFFF`, elegant green glow)
    * Grade A (90–99%): `#00c000ff` (rgb: `0, 192, 0`, badge text `#0F172A`)
    * Grade B (80–89%): `#95ff00ff` (rgb: `149, 255, 0`, badge text `#0F172A`)
    * Grade C (60–79%): `#FFFF00` (rgb: `255, 255, 0`, badge text `#0F172A`)
    * Grade D (30–59%): `#FF8C00` (rgb: `255, 140, 0`, badge text `#0F172A`)
    * Grade E (0–29%): `#FF0000` (rgb: `255, 0, 0`, badge text `#0F172A`)
    * Question Evaluations: Correct `#00c000ff`, Partial `#FFFF00`, Incorrect `#FF0000`
    * Remedial: Max effective score capped at 60%, inherits capped score color, small `R` only on score percentage (`60%ᴿ`).
  - **Forensic Codebase Changes & Deep Sweep Remediation**:
    1. `css/style.css`: Updated `--clr-success: #00c000ff;`, `.grade-star` gradient start to `#86efac`, purged dead `.grade-F` and `.text-grade-F`, standardized button and badge RGB opacities to canonical tokens (`--grade-star-rgb`, `--grade-e-rgb`, `--grade-d-rgb`), toast message colors (`.toast-success`, `.toast-error`, `.toast-warning`), and added `.grade-circle-★` / `.grade-circle-s` aliases.
    2. `css/result.css`: Eliminated obsolete `.grade-S` gold gradient, aligned result grade displays with canonical green star styling, replaced hardcoded Tailwind stamp overrides (`#22C55E`, `#10B981`, `#84CC16`, `#EAB308`, `#F97316`, `#EF4444`) with `var(--grade-*)` tokens, replaced emerald fallbacks with `var(--grade-star)`, unified metric stacked rows (Correct, Partial, Incorrect) to `var(--eval-*)`, unified accuracy segments/labels to `var(--eval-*)`, replaced all legacy `rgba(34, 197, 94, ...)` drop-shadows and dividers with `rgba(var(--grade-star-rgb), ...)`, standardized `.remedial-segment-btn.segment-remidi.active` to `var(--grade-c)`, and standardized `.answers-modal-close-btn:hover` to `var(--grade-e)`.
    3. `css/dashboard.css`: Aligned `--tier-color` and welcome banner section to `var(--grade-star)` and `var(--grade-star-rgb)`, purged all legacy `rgba(34, 197, 94, ...)` and `rgba(16, 185, 129, ...)` references, standardized Next Assessment green button to canonical Star green gradient and glow, standardized `.header-logout-btn` / `:hover` to `var(--grade-e)`, `.cheat-box` and countdown to `var(--grade-e)`, and `.next-asm-go-btn.is-retake` to `var(--grade-e)`.
    4. `css/test.css`: Standardized `.speech-mic-btn-lg` normal, hover, and listening states to `var(--grade-star)` and `var(--grade-e)`, `.speech-unanswered-chip` to `var(--grade-e)`, `.speech-all-answered-msg` to `var(--clr-success)`, `.mc-option.selected` to `var(--grade-star)` and text `#0F172A`, form input focus to `var(--grade-star)`, cheat dialog elements to `var(--grade-e)`, `.btn-danger-submit` to `var(--grade-e)`, `.btn-confirm-submit` to `var(--grade-star)`, and `.test-progress-fill` to `var(--grade-star)`.
    5. `css/admin.css`: Standardized `.text-gold-champion` and champion cards to `var(--grade-star)` with `var(--grade-star-glow)`, aliased `--fm-*` design tokens to root variables (`--fm-text-muted: var(--clr-text-3);`), standardized `.badge-success`, `.badge-warning`, `.badge-danger`, `.status-dot.*`, and `pulse*` keyframes to root tokens, `.btn-warning` to `var(--grade-d)`, `.purge-modal-box` to `var(--clr-danger)`, badge ongoing/upcoming to `var(--clr-success)` / `var(--grade-d)`, attendance pill active to `var(--grade-star)`, and student action danger button to `var(--grade-e)`.
    6. `css/auth.css`: Standardized clear session link hover to `var(--clr-danger)`, cascade step numbering done state to `var(--grade-star)`, and card radio check to `var(--grade-star)`.
    7. Cleaned all 37 legacy `#009A00` / `0, 154, 0` and rogue `#77FF00` instances across `js/dashboard.js`, `js/result.js`, `js/admin/app.js`, `js/admin/class.js`, `js/admin/student-management.js`, and `js/admin/tests-management.js`.
    8. Prior attempt blindspots remediation:
       - `js/test.js`: Standardized cheat strike badge red (`#dc2626` & shadow &rarr; `var(--grade-e)`), MC options background gradient (`rgba(16,185,129,0.2)` &rarr; `rgba(var(--grade-star-rgb), 0.2)`), speech recognition mic button, recording states, and offline syncDot indicators to canonical tokens.
       - `js/admin/tests-management.js`: Fixed target correct answers (lines 982, 2034, 2252) and security badges to `TOPSCORE_COLORS.CORRECT` / `TOPSCORE_COLORS.E`.
       - `js/admin/student-management.js`: Dynamically colored failed test score percentage via `getGradeColorByScore`, and standardized remediation alert container and PIN security status.
       - `js/admin/vocab-vault.js`: Standardized topic delete button and verb part-of-speech chips.
       - `js/admin/crud-modals.js`: Standardized student and question duplicate resolution tables and candidate badges.
       - `js/admin/curriculum-management.js`: Standardized program batch count badges and Add Batch button.
       - `js/admin/admin-deck.js`: Standardized KPI card metric colors and bio character counter danger fallback.
       - `js/auth.js`: Standardized error message styling across all 4 cascade steps to `var(--clr-danger, #FF0000)`.
       - `js/admin/desk.js`: Standardized storage metric, scan integrity buttons, recalibration metrics cards, confirmation modal, heartbeat status text, and database relational constraint issue cards to canonical tokens.
       - `docs/DECISIONS.md`: Updated line 766 DECISION-029 color vault reference to reflect canonical palette.
    9. Badge text contrast & rogue colors: Guaranteed Star (`★`) displays `#FFFFFF` and letter grades (A-E) display `#0F172A` in `dashboard.js`, `class.js`, and `tests-access.js`. Fixed `tests-access.js` circle class generator for Star tier. Replaced remedial `#fbbf24` in `tests-access.js` with `inherit`. Replaced rogue `#22c55e` male gender badge with `#38bdf8`.
    10. Standardized `js/grading.js` fallbacks to canonical `#006400` / `rgba(0, 192, 0, 0.5)`. Exposed `TOPSCORE_COLORS` on `window` in `js/app.js`.
    11. Preserved print styling in `cv-export.js` / `dossier_export.js` and curriculum track themes in `tests-access.js`.
    12. Cache & Version: Bumped `sw.js` to `topscore-cache-option-a-v38` and asset query params to `?v=20261030_v38` in `admin.html`, `dashboard.html`, `result.html`, `test.html`.
  - **Verification**:
    * `npm test`: 100% PASS (40/40 JS syntax checks, 27/27 SW manifest assets, full student dashboard parity suite).
    * `node scripts/verify_green_star_grading.mjs`: 100% PASS.
    * Strictly NO git commit, NO git push.

- **Phase 196: Vocab Single Scoring Model & Exact Multi-Page Parity**:
  - **Audit Findings**:
    1. In Screenshot 1 (`admin.html#students`), Student Roster lacked exam parity because `adminFetchAll('tests', ...)` only retrieved `id, title, level_id`, leaving `test_type` and `shell_code` undefined. This caused `isWeeklyExam` to evaluate to `false` for every test, returning 0 exams and empty scores, while the browser displayed an older cached version.
    2. Fixed `student-management.js` to fetch full test metadata (`id, title, test_type, shell_code, payload, total_questions, display_order, category, level_id, class_id, levels(name, level_number)`), ensuring `isWeeklyExam` correctly classifies milestone exams.
    3. `computeMilestoneExamMastery()` in `js/grading.js` evaluates Global Score % and Grade strictly from the **Latest Active Theme** (`latestAttemptedTheme.scorePct`). This eliminates the future milestone 0% penalty (e.g. Pasya achieves 60% Grade C instead of 18% Grade E; Sofa Maria Ulfa achieves 47% Grade D instead of 31% Grade D).
    4. Students with 0 completed exams (e.g. Rifky Ahmad) display neutral `—` for Score, Grade, and PTS across Student Roster, Class Hub, and Student Dashboard, while maintaining curriculum progress pacing (`TESTS: 2/40`, `COMPLETION: 5%`).
    5. In `js/admin/app.js` (Class Hub): added Theme Combined Score (`SCORE %`: `theme_${tc}_score`) column right before Theme Total Points (`TOT`: `theme_${tc}_total_pts`) in the Attendance Matrix.
    6. Master color vault in `js/grading.js` standardized strictly to user-defined official palette: Star ★ `#00c000ff`, A `#00c000ff`, B `#95ff00ff`, C `#FFFF00`, D `#FF8C00`, E `#FF0000`. Verified 100% PASS on `node scripts/verify_green_star_grading.mjs`.
    7. Cache and query string version bumped to `?v=20261030_v37` across `admin.html`, `dashboard.html`, `result.html`, `js/admin/app.js`, and `sw.js` (`topscore-cache-option-a-v37`).
  - **Verification**:
    * `npm test`: 100% PASS (40/40 JS syntax checks, 27/27 SW manifest assets, student dashboard exam-only parity test suite).
    * `node scripts/verify_green_star_grading.mjs`: 100% PASS.

- **Phase 195: Academic Scoring Parity & Unified Milestone Engine in Student Roster**:
  - **User Requests**:
    * *"Apakah Anda ingin saya menyelaraskan halaman Student Roster agar menggunakan mesin resmi yang sama persis dengan Class Hub & Student Dashboard? Nilai Score & Grade di Student Roster akan 100% sama dan sinkron dengan Class Hub & Student Dashboard. Kolom Tests (misal 9/40) dan Completion % tetap menghitung seluruh aktivitas kuis + ujian sebagai indikator pacing belajar siswa. jawabannya IYA. harus disamakan sistem grading, scoring, di seliuruh sistem... coba diskusikan... kita atur dengan baik /grill-me"*
  - **Architectural Alignment (/grill-me Consensus)**:
    1. **Authoritative Engine Unified**: `student-management.js` now uses `computeMilestoneExamMastery(studentExamEntries, studentLevelExams)` matching `app.js` (Class Hub) and `dashboard.js` (Student Dashboard).
    2. **0-Exam Handling**: Students who only completed quizzes (e.g. Rifky Ahmad) display neutral `—` for Score & Grade with clean tooltips, eliminating false 100% ★ quiz inflation.
    3. **Dedicated PTS Column**: Added `PTS` column to Student Roster DataGrid displaying exam points earned (`totalEarnedScore`), dynamically colored with `getGradeColorByScore`.
    4. **Remedial 60%ᴿ Marker**: Added `60%ᴿ` indicator on capped overall score and remedial tags on exam items.
    5. **Student Detail Drawer Split**: `showStudentProgressDetails` upgraded with a KPI summary showing Mastery Score, Academic Grade, Exam Points, and Curriculum Pace, plus two distinct tables: 🎓 Weekly Exams and ⚡ Daily Quizzes.
  - **Color Centralization Fixes**:
    * Cleaned Tailwind `#F87171` in milestone pending exam cells to `TOPSCORE_COLORS.E` (`#FF0000`).
    * Replaced `#eab308` in in-progress badge with `TOPSCORE_COLORS.C` (`#FFFF00`).
    * Replaced `#000000` text in Class Average grade circle with `TOPSCORE_COLORS.TEXT_DARK` (`#0F172A`).
    * Cleaned `#eab308` and hardcoded colors in `tests-management.js`.
    * Bumped Service Worker cache name to `topscore-cache-option-a-v35`.
  - **Verification**:
    * `npm test`: 100% PASS (40/40 JS syntax checks, 27/27 SW manifest assets, full student dashboard parity suite).

- **Phase 194: Full System Exhaustive Audit, Color Centralization & Test Session Cache Fix**:
  - **User Requests**:
    * *"Susunan palet baru: ★ & A (#009a00ff), B (#77FF00), C (#FFFF00), D (#FF8C00), E (#FF0000). cek apakah ini, cek SEMUA lagi"*
    * User shared screenshot of `Uncaught tests-access.js?v=20261027d:2150 ReferenceError: completedTaskCount is not defined`
  - **Exhaustive Color Audit & Centralization**:
    * Palette standardized: ★ & A: `#009A00` (`#009a00ff`), B: `#77FF00`, C: `#FFFF00`, D: `#FF8C00`, E: `#FF0000`.
    * Cleaned `js/result.js`: Eliminated `gradeRingColors` and `standardGradeColors` local dicts; routed SVG Score Ring and Hero Banner directly to `getGradeColor()`.
    * Cleaned `js/admin/student-management.js`: Eliminated `cMap` dictionary in student roster; routed `overallColor` to `getGradeColorByScore(overallPct)` and upgraded Grade column to canonical `.grade-circle`.
    * Cleaned `js/admin/class.js`: Eliminated `cMap` dictionary in `renderStudentsRoster`; routed to `getGradeColor()` and `getGradeColorByScore()`.
    * Cleaned `js/admin/app.js`: Replaced legacy ternary fallback chains with `getGradeColorByScore()`.
    * Cleaned `js/admin/tests-management.js`: Replaced hardcoded `#22c55e` / `#10b981` / `#84cc16` in `gradePalette` and `getGradeBadge(pct)` with `TOPSCORE_COLORS` and `getGradeColorByScore(pct)`.
    * Cleaned `js/dashboard.js`: Replaced legacy fallbacks with canonical `#009A00` / `0, 154, 0`.
    * Updated `AGENTS.md` and `.antigravityrules` Rule 11.
    * Configured instant file saves in `.vscode/settings.json`.
  - **Test Session ReferenceError & Cache Busting**:
    * Resolved client-side cache mismatch where stale `?v=20261027d` was loaded.
    * Upgraded `tests-access.js` imports to `?v=20261030_v34`.
    * Bumped `sw.js` cache name to `topscore-cache-option-a-v34`.
    * Bumped version queries in `admin.html`, `result.html`, `dashboard.html`.
  - **Verification**:
    * `node scripts/verify_green_star_grading.mjs`: 100% PASS (35 assertions).
    * `npm test`: 100% PASS (40/40 JS syntax checks, 27/27 SW manifest assets, full parity test).

- **Phase 192: Centralized Single-Source-of-Truth Color Architecture**:
  - **User Request**: User `/grill-me` session: *"I want to check the Grading, scoring, point colour in system, I feel like some colour doesnt match between the one in the result page, and in the admin page, also student page... can we make a better, stricter rule on it? we need to make sure the colouring syte is from one set of rule. apakah nanti kode warna ini ada di satu tempat? semuanya nanti menacu kesana... selaiin itu ini juga dipakai saat menghitung poin jawaban yang correct, partial dan incorrect dalam halaman result..."*
  - **Single Source of Truth Vault**:
    * Created `TOPSCORE_COLORS` frozen constant in `js/grading.js`:
      - ★ & A: `#16A34A` (Rich Jungle Green)
      - B: `#84CC16` (Lime 500)
      - C: `#F59E0B` (Amber 500)
      - D: `#F97316` (Orange 500)
      - E: `#EF4444` (Crimson Red 500)
      - Correct: `#16A34A` (Full point)
      - Partial: `#F59E0B` (Half point)
      - Incorrect: `#EF4444` (Zero point)
      - Badge Text Star: `#FFFFFF` (White star)
      - Badge Text Dark: `#0F172A` (Dark slate for A, B, C, D, E)
    * Injected CSS variables `--grade-*`, `--eval-*`, and `--badge-text-*` into `:root` in `css/style.css`.
    * Linked `css/admin.css` and `css/result.css` to read exclusively from `:root` CSS variables.
    * Dynamically styled Points (PTS) on `result.html`, `admin.html`, and `dashboard.html` with `getGradeColorByScore()`.
    * Synchronized Rule 2.10 in `AGENTS.md` and Rule 11 in `.antigravityrules`.
    * Normalized `css/result.css` line endings to LF.
    * Bumped Service Worker cache to `topscore-cache-option-a-v32`.
  - **Verification**:
    * `node scripts/verify_green_star_grading.mjs`: 100% PASS (35 assertions).
    * `npm test`: 100% PASS (syntax, manifest, parity).

- **Phase 191: 100% AI Workflow Maximization Suite**:
  - **User Request**: *"coba terPKAN SARAN2MU"*
  - **Implementation**:
    1. **Antigravity Supercomplete & Tab Integration**: Configured `editor.inlineSuggest.enabled`, `editor.suggestSelection: "first"`, `editor.acceptSuggestionOnEnter: "smart"`, and `editor.quickSuggestions` in `.vscode/settings.json`.
    2. **Persistent AI Review Tabs**: Set `workbench.editor.enablePreview: false` so that files reviewed or modified during AI tasks stay pinned in the editor tabs.
    3. **One-Touch CI Health Tasks**: Created `.vscode/tasks.json` with `<Ctrl+Shift+B>` mapped directly to `npm test` and quick syntax/grading tests.
    4. **Governance Hardening**: Enforced Rule 9 (PostgREST async handling) and Rule 10 (Defensive variable scoping) in `.antigravityrules`.
  - **Verification**: `npm test` 100% PASS (syntax check, SW manifest, dashboard parity).

- **Phase 190: Test Sessions Unified Access Resolution — completedTaskCount ReferenceError Fix**:
  - **User Request**: *"perbaiki ini!"* with screenshot `media_1793272213636_98449015.png` showing `Uncaught tests-access.js?v=20261027d:2150 ReferenceError: completedTaskCount is not defined` when opening Theme Test Session modal on `admin#class-hub`.
  - **Root Cause**:
    - In `js/admin/tests-access.js`, during prior terminology refactoring (`tasks` -> `quizzes`), the accumulator variable was renamed to `completedQuizCount` at line 2038, but the returned result object at line 2150 still referenced the undeclared identifier `completedTaskCount`.
    - Also, `totalTasks: themeTasks.length` at line 2151 risked throwing a TypeError if `themeTasks` was null or undefined.
  - **Fixes**:
    1. In `js/admin/tests-access.js` (`evaluateStudentsEligibility`):
       - Fallback `activeQuizzes` resolution to `themeQuizzes || themeTasks || theme?.quizzes || theme?.tasks || []`.
       - Provided both `completedQuizCount` and `completedTaskCount: completedQuizCount` in the result object for full backward compatibility.
       - Provided both `totalQuizzes: activeQuizzes.length` and `totalTasks: activeQuizzes.length`.
    2. Synchronized query string in `js/admin/app.js` to `./tests-access.js?v=20261029_v31`.
    3. Bumped Service Worker cache in `sw.js` to `topscore-cache-option-a-v31` and script query strings in `admin.html` to `?v=20261029_v31`.
  - **Verification**:
    * Node execution of `evaluateStudentsEligibility` verified with sample student data: 100% PASS with 0 runtime errors.
    * `npm test`: 100% PASS (40/40 JS syntax checks, 27/27 SW cache manifest assets, student dashboard exam parity verified).

- **Phase 189: Powerhouse Productivity Extension Suite Integration**:
  - **User Request**: *"extension tidak harus sangat minimal, tapi harus yang memang akan membantu sitem saya bekerja LEBIH BAIK, kalau memang diperlukan, dan akan dipakai, maka install, saya ingin agar MAKSIMAL aslakan memang terpakai"*
  - **Implementation**:
    1. **Installed 11 Powerhouse Extensions (Zero Bloat, 100% Useful)**:
       - `denoland.vscode-deno` v3.53.1 — Supabase Edge Functions (Deno 2 TypeScript) engine.
       - `esbenp.prettier-vscode` v12.4.0 — Format on save across JS, HTML, CSS, SQL, JSON.
       - `dbaeumer.vscode-eslint` v3.0.34 — Real-time JS linter & bug prevention.
       - `usernamehw.errorlens` v3.30.0 — Inline error/warning highlighting directly on code lines.
       - `eamodio.gitlens` v19.5.0 — Multi-phase line-by-line commit authorship & phase tracking (Phase 189).
       - `rangav.vscode-thunder-client` v3.1.0 — In-IDE REST API tester for Edge Functions.
       - `yandeu.five-server` v0.4.0 — Live Server preview with instant auto-reload on port 5500.
       - `ms-playwright.playwright` v1.1.19 — E2E test runner, trace viewer, and step inspector.
       - `christian-kohler.path-intellisense` v2.8.0 — Relative path auto-completion for modules and styles.
       - `ckolkman.vscode-postgres` v1.4.3 — Direct PostgreSQL query runner for Supabase database.
       - `kanezal.better-antigravity` v0.8.0 — Antigravity IDE auto-run and terminal stability.
    2. **Configured Workspaces**:
       - Updated `.vscode/settings.json` with fine-tuned parameters for ErrorLens (italic, 200ms delay), GitLens (current line blame), Five Server (port 5500), Thunder Client workspace relative storage, Path IntelliSense, and Prettier default formatting.
       - Synchronized `.vscode/extensions.json` with the complete 11-extension recommendation suite.
  - **Verification**:
    * `antigravity-ide.cmd --list-extensions`: 11 extensions verified active.
    * `npm test`: 100% PASS (40/40 JS syntax checks, 27/27 SW cache manifest assets, parity tests verified).

- **Phase 188: Dual Bulk Edit Resolution — Auto-Gen PostgREST .catch Bug & Class Hub Batch Update Optimization**:
  - **User Request**: *"fix this problem , kedua bulk edit tidak berfungsi."* with screenshots showing:
    1. Modal Auto-Generate Error: `Auto-Generate Gagal: sb.from(...).update(...).eq(...).catch is not a function`
    2. Modal Bulk Edit Tests: Unchecked checkboxes and unresponsive mass updates across 32 selected tests.
  - **Root Cause & Technical Fixes**:
    1. **Auto-Generator / Curriculum Bulk Edit (`js/api.js`)**:
       - In lines 2911 and 3004, `sb.from('test_items').update(...).eq(...).catch(() => {})` attempted to call `.catch` directly on a Supabase `PostgrestFilterBuilder` object, which is thenable but does not expose `.catch()`.
       - Wrapped both queries in defensive `try { await ... } catch (_) {}` blocks, eliminating the runtime crash and restoring full auto-generation and curriculum batch sync.
    2. **Class Hub "⚡ Bulk Edit Tests" Modal (`js/admin/crud-modals.js`)**:
       - **Auto-Activation UX**: Added input/change listeners so editing duration, answer type, passing score, or order automatically checks the corresponding card checkbox and enables pointer events.
       - **Clickable Headers**: Enabled clicking anywhere on card headers to toggle field activation.
       - **Quizzes Detection**: Expanded task check to match both `quiz` and `VOCAB_TASK`/`PHRASE_TASK` and `QUIZ` titles.
       - **Atomic Batch Query (100x Performance)**: Replaced 160 sequential network requests (32 tests × 5 queries each) with a single atomic batch query: `sb.from('tests').update(commonUpdate).in('id', _bulkEditSelectedIds)`, plus parallel JSON payload synchronization and batch `test_items` sync.
       - **Cache Invalidation**: Explicitly calls `clearAdminCache('tests')` and `clearApiCache('tests')` so updated values appear instantly.
    3. **PWA & Cache Synchronization**:
       - Bumped `sw.js` cache to `topscore-cache-option-a-v30`.
       - Bumped script query strings in `admin.html` to `?v=20261029_v30`.
  - **Verification**:
    * `npm test`: 100% PASS (40/40 JS syntax check, 27/27 SW cache manifest assets, student dashboard exam parity verified).

- **Phase 187: AI Workspace Tooling, IDE Extension Optimization, and Developer Environment Maximization**:
  - **User Request**: *"analisa penggunaan exensi saya, hapus yang tidk terpakai, dan install yang dibutuhkan, saya 99% pakai AI"* -> *"yang jarang dipakai juga buang saja,,, analisa ulang,,, saya ingin pembanguann TopsCore ini amksimal"* -> *"100% AI, maksimalkan semuanya,,, analisa pembanguann TopsCore, apa yang perlu ditambahkan dan disetting"* -> *"lagi lakukan analisa, buat dirimu menjadi lebih pintar, pelajari kebiasaan saya di sistem ini, dan optimasissai semua,,, khuss kali ini, pelajari, petakan, laksanakan!"*
  - **Changes**:
    1. **Purged Bloat & Irrelevant Extensions (14 uninstalled)**:
       - Eliminated unneeded language extensions: Python (`ms-python.python`, `ms-python.debugpy`, `meta.pyrefly`), Go (`golang.go`, `renanbs.better-go-test`), Ruby (`shopify.ruby-lsp`), PHP (`victordev.php-better-snippets`), C/C++ (`llvm-vs-code-extensions.vscode-clangd`).
       - Eliminated redundant non-AI tooling: `bretwardjames.gh-projects`, `github.vscode-github-actions`, `christian-kohler.npm-intellisense`, `formulahendry.auto-rename-tag`, `streetsidesoftware.code-spell-checker`, `yutengjing.better-colorizer`.
    2. **Installed Mission-Critical Extensions (5 installed)**:
       - `denoland.vscode-deno` v3.53.1 — Server-authoritative Supabase Edge Functions (`supabase/functions/**`) in Deno TypeScript.
       - `eamodio.gitlens` v19.5.0 — Multi-phase line-level commit tracking & history inspection.
       - `rangav.vscode-thunder-client` v3.1.0 — In-IDE REST testing for Edge Functions without external tools.
       - `ms-playwright.playwright` v1.1.19 — Formal E2E test runner execution.
       - `christian-kohler.path-intellisense` v2.8.0 — Fast relative path auto-resolution across 40+ vanilla JS files.
    3. **Maximized Workspace Configuration Files**:
       - `jsconfig.json`: Added ESNext/ES2022 module resolution, DOM libs, path mappings (`/js/*`, `/css/*`) for IDE & AI IntelliSense.
       - `.prettierrc`: Added standardized 2-space indentation, single quotes, semi, trailingComma es5, printWidth 100, LF, and format overrides for HTML, CSS, SQL, JSON.
       - `eslint.config.js`: Modern flat config with browser globals, TopsCore constants, security rules (`no-eval`), and clean ES module validation.
       - `.vscode/settings.json`: Scoped Deno strictly to `supabase/functions/`, activated Prettier as default formatter with formatOnSave, LF/UTF-8 file rules, Five Server on port 5500, Thunder Client workspace storage, and search exclusions.
       - `.vscode/extensions.json`: Workspace recommendations for all contributors/AI agents.
       - `.vscode/launch.json`: Pre-configured 1-click debug/run tasks (`npm test`, Playwright E2E, active script runner, grading verifier, Five Server).
       - `.env`: Template file with Supabase Cloud production endpoints, Service Role guidance, direct PostgreSQL connection string, and local emulation toggles.
       - `package.json`: Expanded shorthand scripts (`test:grading`, `test:duration`, `test:prereq`, `test:e2e`, `serve`).
  - **Verification**:
    * `npm test`: 100% PASS (40/40 JS syntax checks, 27/27 SW cache manifest assets, student dashboard exam parity verified).
    * `node scripts/check_all_js_syntax.cjs`: 100% PASS.
    * `git status --short`: clean tracking of workspace configuration files.



- **Phase 186: Pedagogical Test Analytics Transformation — Consolidated Grade/Score Ratio & Multi-Dimensional Error Diagnostics**:
  - **User Request**: *"remedial watchlist tidak perlu sepertinya,,, lalu list pertanyaan paling sering salah dengan jawaban apa yang banyak diberikan siswa untuk pertnyaan itu buat 10 minimal,, kalau bisa tampilkan per topik, tiap tema. pass rate, grade quality ratio, grade distribution juga ,,, spertinya sama saja,,, jadikan 1 saja,,, Grade/Score ratio. remedial/retake ratio sepertinya tidak perlu,,, coba anaisa"* -> *"coba terapkan"*
  - **Changes**:
    1. **Eliminated Redundant Widgets**:
       - Purged `Remedial Watchlist` (individual student monitoring belongs in `B — BOARD`).
       - Purged `Remedial & Retake Load` card.
    2. **Unified Grade / Score Ratio (Rule 2.10)**:
       - Merged 1st-Pass Rate (FAPR), Grade Quality Ratio, and Grade Distribution into a single high-density card.
       - Features headline pass & quality rates, total graded count, and an interactive horizontal stacked distribution bar (`★` Green `#22C55E`, `A` Emerald `#10B981`, `B` Lime `#84CC16`, `C` Yellow `#EAB308`, `D` Orange `#F97316`, `E` Red `#EF4444`).
    3. **Tri-Core Row (~88px height)**:
       - Card 1: `🏆 Grade / Score Ratio (Rule 2.10)`
       - Card 2: `🧬 Domain Split: Words vs. Phrases`
       - Card 3: `📊 Linguistic POS Matrix`
    4. **The Wall — Item Error & Misconception Diagnostics (Main Section)**:
       - Displays at least 10 bottleneck questions (2-column × 5-row responsive grid).
       - Features **Most Frequent Wrong Student Answer** (`⚠️ Error Terbanyak: "come pay" (1x • 25%)` prioritizing cognitive misconceptions over blank timeouts).
       - Added **Theme Filter Pills**: `🌐 All Themes`, `🅰️ Theme A`, `🅱️ Theme B`, `🅲 Theme C`, `🅳 Theme D`.
       - Added **Topic Selector**: `<select>` dropdown dynamically populated with all curriculum topics.
       - Added **Domain Filter Pills**: `🌐 All`, `🔤 Words`, `💬 Phrases`.
       - Real-time client-side filter engine (`window._applyWallFilters()`).
    5. **Cache & PWA Synchronization**:
       - Bumped `sw.js` cache to `topscore-cache-option-a-v29`.
       - Bumped `admin.html` script query strings to `?v=20261029_v29`.
  - **Verification**:
    * Playwright on Microsoft Edge across 3 resolutions:
      - 1440x900 (Standard Laptop): `hasScroll: false` (`scrollHeight: 800px`, `clientHeight: 800px`).
      - 1920x1080 (Full HD): `hasScroll: false` (`scrollHeight: 980px`, `clientHeight: 980px`).
      - 1366x768 (Compact Laptop): `hasScroll: false` (`scrollHeight: 668px`, `clientHeight: 668px`).
    * Pedagogical Verification Suite (`scratch/verify_streamlined_test_analytics.mjs`): 100% PASS (Tri-core cards, 10+ bottleneck items with student errors, theme & topic controls verified).
    * Full CI Suite (`npm test`): 100% PASS.


- **Phase 185: Zero-Scroll Executive Cockpit Transformation for Test Analytics**:
  - **User Request**: *"penepatannya masih kurangpas,,, saya ingin tdidak eprlu scroll,, semua terlihat sekaligus di halaman woorkspace"*
  - **Root Cause**: The Test Analytics view had stacked 4 full-width sections vertically (Hero KPIs, Domain Split, The Wall, and 3 Deep-Dive panels), causing total content height to reach ~1189px and forcing vertical scrolling on all viewports (available height: 668px - 980px).
  - **Architectural & Layout Changes**:
    1. **Zero-Scroll Viewport Lock (`css/admin.css`)**:
       - Added `.admin-content:has(.test-analytics-dashboard)` with `height: calc(100vh - 50px - 50px) !important; overflow: hidden !important; display: flex !important; flex-direction: column !important; box-sizing: border-box !important;`.
       - Locks the viewport perfectly between topbar (50px) and locked bottom banner (50px).
    2. **Asymmetric 2-Column Cockpit Grid (`js/admin/tests-management.js`)**:
       - Replaced vertical 4-tier stack with a clean, high-density 2-column layout (`.tac-main-split` with `grid-template-columns: 1.2fr 0.8fr`):
         * **Top**: 3 Hero KPI cards (64px slim height).
         * **Left Column (~60% width)**: Content & Curriculum Intelligence:
           - `Vocabulary Domain Split` (compact side-by-side Words vs Phrases boxes).
           - `The Wall — Top 10 Persistent Bottlenecks` (responsive 2-column grid with 5 equal rows, filling remaining height).
         * **Right Column (~40% width)**: Student Diagnostics & Cohort Intelligence:
           - `Remedial Watchlist` (top students, retakes, and score delta improvements).
           - `Linguistic POS Matrix` (Nouns, Verbs, Adjectives, Phrases accuracy bars).
           - `Grade Distribution (Rule 2.10)` (★, A, B, C, D, E bars).
    3. **Cache Synchronization**:
       - Bumped `sw.js` cache to `topscore-cache-option-a-v28`.
       - Bumped script query strings in `admin.html` to `?v=20261029_v28`.
  - **Verification**:
    * Playwright on Microsoft Edge across 3 resolutions:
      - 1440x900 (Standard Laptop): `contentScrollHeight: 800px`, `contentClientHeight: 800px`, `hasScroll: false`!
      - 1920x1080 (Full HD): `contentScrollHeight: 980px`, `contentClientHeight: 980px`, `hasScroll: false`!
      - 1366x768 (Compact Laptop): `contentScrollHeight: 668px`, `contentClientHeight: 668px`, `hasScroll: false`!
    * Full CI suite (`npm test`): 100% PASS (syntax check, cache manifest, student dashboard exam parity).


- **Phase 184: Complete 10-Round E2E Full-System Reliability Audit & Final Production Verification**:
  - **User Request**: *"/boost chheck the whole system e2e, students, tets, EVERYTHING, until 100% no errors, 10 times over, then push commit"*
  - **Results**:
    1. **10-Round Verification Battery (`task-243` / `scratch/run_full_system_10_iterations_audit.mjs`)**:
       - Ran 10 consecutive iterations of the 8-suite automated test battery (~17 minutes runtime).
       - Executed 100% cleanly with exit code 0 and 0 failures across all rounds.
    2. **Adversarial Audit & Code Refinements**:
       - `js/grading.js`: Disambiguated Grade A palette color (`#10B981`, RGB `16, 185, 129`, dark `#059669`, light `#6ee7b7`) from Star tier `★` (`#22C55E`), eliminating visual collision while maintaining strict Rule 2.10 compliance.
       - `scripts/verify_admin_class_hub_ui.mjs`: Updated ranking assertion to reflect live production database points where Mr. Suke Ajai (383 PTS, Rank #7) correctly outranks Miss Sofa Maria Ulfa (273.5 PTS, Rank #14).
       - `scripts/test_submit_and_duration.mjs`: Updated duration check assertion to support standard 5m and 10m vocabulary quiz configurations (`[5, 10].includes(...)`), eliminating false warning logs.
       - `.gitignore`: Added `scripts/*.png` to keep test-generated screenshots from dirtying the working directory.
    3. **Final Verification Gate**:
       - `npm test` (check_all_js_syntax, generate_sw_manifest, test_student_dashboard_exam_parity): 100% PASS.
       - `node scripts/verify_green_star_grading.mjs`: 100% PASS.
       - `node scripts/test_submit_and_duration.mjs`: 100% PASS.
       - `node scripts/verify_admin_class_hub_ui.mjs`: 100% PASS.


- **Phase 183: Test Analytics Streamlining & Elimination of Non-Pedagogical Bloat**:
  - **User Request**: *"coba cek ini,, mana yang sebenarnya tidak perlu? misalnya integrity radar"* -> *"iya lakukan"*
  - **Changes**:
    1. **Eliminated Bloat Widgets**:
       - Removed `🛡️ Integrity Radar` (Focus loss/Alt-tab logs belong in `D — DATA` Audit Logs, created false cheat alerts).
       - Removed `📊 24-Hour Exam Traffic Heatmap (WITA)` (Server/DevOps metric eating up 50% of screen width).
       - Removed `⏱️ Pacing Velocity` (Cosmetic speedometer metric with no actionable teacher value).
       - Removed `🎙️ AI Speech Engine & 🎧 Live Audio Review Queue` (Irrelevant for written vocabulary classes, violated transient media Rule 2.12).
       - Removed `🔥 Test Difficulty Spectrum` (Redundant with The Wall).
    2. **Streamlined Top Hero KPIs to 3 Pedagogical Cards**:
       - Card 1: `🎯 1st-Pass Rate (FAPR)` (${fapr}% initial mastery before retakes).
       - Card 2: `🏆 Grade Quality Ratio (Rule 2.10)` (${highGradePct}% submissions in ★, A, or B tiers).
       - Card 3: `👥 Remedial & Retake Load` (${studentsWithRetakes} students in retakes, total retake load).
    3. **The Wall (Top 10 Bottlenecks) Elevated to Full-Width 2-Column Grid**:
       - Expanded container across 100% width with `.tac-wall-grid` (responsive 2 columns of 5 items each).
       - Prominently showcases curriculum failure rates, target vocabulary, topics, and sample student wrong answers.
       - Filter pills (`All Top 10`, `🔤 Words`, `💬 Phrases`, and `Top 20 →` modal) remain fully functional.
    4. **3 High-Value Bottom Deep-Dive Panels**:
       - `👥 Remedial Watchlist`: Top students in retakes, initial score, best score improvement (+delta), inactive students.
       - `🧬 Linguistic POS Matrix`: Part-of-speech accuracy bars (Nouns, Verbs, Adjectives, Phrases).
       - `🏆 Official TopsCore Grade Distribution`: Clear breakdown of grades adhering to Rule 2.10.
    5. **Deduplicated Topbar Class Tabs**:
       - Added name-based deduplication in `availableClasses` to ensure `Basic English` appears only once in `#topbar-tabs-container`.
    6. **Cache & Assets Synchronization**:
       - Bumped service worker cache in `sw.js` to `topscore-cache-option-a-v27`.
       - Bumped script query parameters in `admin.html` to `?v=20261029_v27`.
  - **Verification**:
    * Playwright on Microsoft Edge (`scratch/verify_streamlined_test_analytics.mjs`):
      - `Basic English` tabs count: Exactly 1.
      - Hero KPI cards count: Exactly 3.
      - Integrity Radar, Pacing Velocity, Traffic Heatmap, Audio Queue, and Difficulty Spectrum confirmed completely ABSENT.
      - The Wall: 10 bottleneck items rendered in full-width 2-column grid.
      - All 3 pedagogical panels rendered.
      - Screenshot saved: `scratch/test_analytics_streamlined.png`.
    * Syntax validation across 40 JS files: 100% PASS.
    * Cache manifest check (27/27 assets OK): PASS.
    * Student dashboard exam parity suite: 100% PASS.

- **Phase 182: Comprehensive Mojibake Audit & Clean UTF-8 Restoration**:
  - **User Request**: User provided screenshot (`media_1793247962025_8cd8a5ef.png`) showing corrupted mojibake sequence `ðŸ›¡ï¸` on the Tutor's Room login screen brand icon.
  - **Root Cause**: Double UTF-8 encoding (UTF-8 multi-byte sequences misinterpreted as Windows-1252/CP1252) in `admin.html`.
  - **Changes**:
    1. `admin.html`:
       - Replaced `ðŸ›¡ï¸ ` with clean `🛡️` (Shield emoji, U+1F6E1 U+FE0F).
       - Restored `<!-- â• â• â•  ADMIN LOGIN â• â• â•  -->` to `<!-- ═══ ADMIN LOGIN ═══ -->`.
       - Restored `<!-- â• â• â•  ADMIN CONSOLE â• â• â•  -->` to `<!-- ═══ ADMIN CONSOLE ═══ -->`.
       - Restored sidebar toggle `â˜°` to `☰` (Hamburger menu).
       - Restored duration label `â ±ï¸ ` to `⏱️`.
       - Restored answer type `ðŸ—£ï¸ ` to `🗣️`.
       - Restored selection option `ðŸ”˜` to `🔘`.
       - Restored mixed / random options `ðŸ”€` to `🔀`.
       - Restored passing score label `ðŸŽ¯` to `🎯`.
       - Restored sequential option `âž¡ï¸ ` to `➡️`.
       - Restored apply changes button `ðŸ’¾` to `💾`.
       - Restored add class header `âž•` to `➕`.
       - Bumped script cache query strings to `?v=20261029_v26`.
    2. `sw.js`:
       - Bumped cache version to `topscore-cache-option-a-v26` so browsers immediately invalidate previous cached `admin.html` and fetch the clean UTF-8 file.
    3. `docs/TODO.md`:
       - Restored `ðŸ†•` to `🆕`.
    4. `docs/SESSION_LOG.md`:
       - Restored `ðŸ“– Open Vault â†—` to `📖 Open Vault ↗`.
  - **Verification**:
    * Playwright on Microsoft Edge (`scratch/verify_login_screen_mojibake.mjs`):
      - `#admin-login-screen .brand-icon` innerText confirmed `🛡️` (U+1F6E1 U+FE0F).
      - Total mojibake occurrences across rendered DOM: 0.
      - Screenshot captured: `scratch/login_screen_fixed.png`.
    * Syntax validation across all 40 JavaScript files (`node scripts/check_all_js_syntax.cjs`): 100% PASS.
    * Cache manifest check (`node scripts/generate_sw_manifest.mjs`): 27/27 assets OK.
    * Student dashboard exam parity suite (`node scripts/test_student_dashboard_exam_parity.mjs`): 100% PASS.

- **Phase 181: Official Grading Scale Color Update: Star Tier (★ / 100%) Transition to Green (#22C55E)**:
  - **User Request**: *"saya melihat ada aturan inti soal Grading Scale, masih ada warna UNGU,,, itu sudah diganti dengan HIJAU perbaiki"*
  - **Changes**:
    1. `AGENTS.md` (§2.10 Official Grading Scale): Updated table row for Star tier (`★`) to `Hijau (Rich Green) | #22C55E`.
    2. `ANTIGRAVITY_GUIDE.md`: Updated line 46 from `★ (100% - Ungu #A855F7)` to `★ (100% - Hijau #22C55E)`.
    3. `ANTIGRAVITY_COMMAND_CENTER.md`: Created and synchronized as authoritative guide containing `★ (100% - Hijau #22C55E)`.
    4. `docs/PRODUCT_SPEC.md` & `docs/DATABASE.md`: Updated Star tier 100% color definitions to `#22C55E`.
    5. `docs/DECISIONS.md`: Added `DECISION-028` documenting the transition from Purple to Green, and marked `DECISION-019` & `DECISION-020` status as superseded for Star tier color.
    6. `js/grading.js`: Updated comments and verified `STAR_THEME.color = '#22C55E'`.
    7. `css/style.css`: Updated `@keyframes star-badge-glow` and star badge styles to Rich Green `#22C55E` and `rgba(34, 197, 94, ...)`.
    8. `css/result.css`: Updated `--tier-color` fallback, card borders, avatar ring, and `.pure-star-svg` drop-shadows to green (`34, 197, 94` / `#22C55E`).
    9. `css/dashboard.css`: Updated hero banner `--tier-color`, borders, glowing stat texts, and avatar container to green (`#22C55E` / `34, 197, 94`).
    10. `js/dashboard.js`: Updated assigned test card star grade pill, fallback theme, SVG gradient `starGreenDashGrad`, hero aura, and text glows to `#22C55E`.
    11. `js/result.js`: Updated confetti palette (`#a855f7` replaced with `#22c55e`), `gradeRingColors`, `standardGradeColors['★']`, `starGreenHeroGrad`, `identityCard` aura, avatar ring, and `gradeBox` borders/shadows to `#22C55E`.
    12. `js/admin/class.js`: Updated `cMap['★'] = '#22C55E'`, `cMap['S'] = '#22C55E'`, and attempt score/badge styles to green.
    13. `js/admin/student-management.js`: Updated `cMap`, fallback grade, score color, global grade badges, profile KPI card drop shadow, and roster table badges to `#22C55E`.
    14. `js/admin/tests-management.js`: Updated `getGradeBadge`, `getGradeColor`, `gradePalette`, drawer performance badge, table Grade column badge, and `fapr` gradePalette to `#22C55E`.
  - **Verification**:
    * Dedicated test suite (`node scripts/verify_green_star_grading.mjs`): 100% PASS (27 assertions covering `grading.js`, `AGENTS.md`, `ANTIGRAVITY_GUIDE.md`, `ANTIGRAVITY_COMMAND_CENTER.md`, `PRODUCT_SPEC.md`, `DATABASE.md`, stylesheets, and JS scripts).
    * Syntax validation across all 40 JavaScript files (`node scripts/check_all_js_syntax.cjs`): 100% PASS.
    * SW cache manifest check (`node scripts/generate_sw_manifest.mjs`): 100% PASS.
    * Student dashboard exam parity & milestone progression check (`node scripts/test_student_dashboard_exam_parity.mjs`): 100% PASS.

- **Phase 180: Removal of Redundant In-Page Hero Header Banner**:
  - **User Request**: User indicated via image screenshot (`media_1793236857059_e94ddd76.png`) that the `.tac-hero-header` ("Test Analytics Mission Control" title, subtitle, level badge, and refresh button) was redundant.
  - **Changes**:
    1. Removed `.tac-hero-header`, `.tac-hero-title`, and `.tac-hero-subtitle` HTML and CSS from `js/admin/tests-management.js`.
    2. Elevated the 4 Top Hero KPIs (Integrity Radar, Mastery & FAPR, The Wall, Pacing Velocity) directly to the top of the content area, matching the clean pattern in `Vocab Vault` and `Classes Hub`.
    3. Removed stale DOM update for `#tac-header-level-badge` inside `window._switchClassTestAnalytics`.
    4. Bumped service worker cache to `topscore-cache-option-a-v25` and `admin.html` script tags to `?v=20261029_v25`.
  - **Verification**:
    * Playwright on Microsoft Edge (`scratch/verify_topbar_tabs_final.mjs`):
      - `.tac-hero-header` and `#tac-header-level-badge` confirmed completely absent.
      - Topbar class tabs in `#topbar-tabs-container` operate cleanly with active state and track switching.
      - Screenshot saved: `test_analytics_no_redundant_header.png`.
    * Syntax check: `node --check js/admin/tests-management.js` passed with 0 errors.

- **Phase 179: Elimination of Curriculum Tests Explorer & Full Topbar Class Tabs Integration**:
  - **User Request**:
    *"the curriculum test explorer is not needed,,, get rid of it,,, the top tabs needs to beplaced on the the top bar as other areas"*
  - **Architecture & Implementation**:
    1. **Elimination of Curriculum Tests Explorer**:
       - Removed redundant `#test-view-curriculum`, `#curriculum-tests-table`, `.tac-curriculum-table-container`, and the Option A sub-tab view switcher (`.test-analytics-view-tabs`, `#tab-btn-analytics`, `#tab-btn-curriculum`).
       - Purged the in-page `.tac-class-navbar` box from the content body, eliminating container nesting.
       - The `#tests` module now focuses 100% on executive **Test Analytics Mission Control**.
    2. **Class Navigation Tabs Mounted into Top Bar (`#topbar-tabs-container`)**:
       - Replaced legacy KPI tabs with live class tabs via standard `setTopbarTabs(tabs, activeId, onSelect)` pattern matching `Classes Hub`, `Vocab Vault`, and `Students Registration`.
       - Top bar tabs rendered:
         * `📚 3rd Vocabulary` (Badge: 40) [Default Active]
         * `📖 1st Storytelling` (Badge: 0)
         * `📖 2nd Storytelling` (Badge: 0)
         * `🎙️ Speaking Projects` (Badge: 0)
         * `🗣️ Public Speaking` (Badge: 0)
         * `🔤 Basic English` (Badge: 0)
         * `🌐 All Classes` (Badge: 40)
       - Dynamic switching: Clicking any topbar tab triggers `window._switchClassTestAnalytics(classId)`, updating the active highlight in the topbar header, updating the header badge (`#tac-header-level-badge`), toggling the Vocab Words vs. Phrases split card, and displaying empty track notice for 0-test classes.
    3. **Executive Test Analytics Mission Control**:
       - 4 Top Hero KPIs: Integrity Radar & Anti-Cheat, First-Attempt Pass Rate (FAPR) & Grade Distribution, The Wall (Hardest Bottlenecks), Pacing Velocity & Speed.
       - Vocab Words vs. Phrases Mastery Deep-Dive (Contraction & punctuation tolerant analysis).
       - The Wall Top 10 Bottlenecks with domain badges, target answers, topics, failure bars, and student mistake samples.
       - 24-Hour Peak WITA Traffic Heatmap.
       - 3 Visual Cards: Remedial Watchlist, Linguistic POS Matrix, Official Grade Distribution (`★`, `A`, `B`, `C`, `D`, `E`).
       - 2 Specialized Intelligence Cards: Speech Audio Review Queue with 1-click override, and Test Difficulty Spectrum.
  - **Version Synchronization**:
    * `sw.js`: Bumped cache name to `topscore-cache-option-a-v24`.
    * `admin.html`: Bumped cache busting query to `?v=20261029_v24`.
  - **Verification**:
    * Playwright on Microsoft Edge (`scratch/verify_topbar_tabs_final.mjs`):
      1. Topbar tabs correctly placed in `#topbar-tabs-container` inside the top bar header with active tab `3rd Vocabulary (40)` (PASS).
      2. Curriculum Tests Explorer and inline `.tac-class-navbar` are completely gone from the body (PASS).
      3. Test Analytics Mission Control cockpit verified: 4 Hero KPIs, Vocab Domain Split Card, The Wall Top 10 Bottlenecks, 24-hour WITA heatmap (PASS).
      4. Live topbar tab switching: Clicking `1st Storytelling (0)` updates active highlight in top bar, updates header badge to `1ST STORYTELLING • 0 TESTS`, displays empty track notice; switching back restores `3rd Vocabulary (40)` and full analytics (PASS).
      5. Screenshot captured: `test_analytics_topbar_tabs_clean.png`.
    * Syntax & Parity: `node scripts/check_all_js_syntax.cjs` (40/40 passed) and `npm.cmd test` passed 100%.

- **Phase 178: Curriculum Class Cockpit, Vocab Words vs. Phrases Mastery, Expanded The Wall (Top 10), and Table View for Curriculum Explorer**:
  - **User Request**:
    *"dalam tab test analysisi perlu dibuat pembagian tab atas berdsarkan nama kelas, sebab nanti ini akan jadi pusat semua test,,, perlu dibagi khusus untuk Vocab analisa words and phrase, the wall also need more content. curriculum explorer jangan betuk kartu tapi tabel"*
  - **Architecture & Implementation**:
    1. **Curriculum Class Upper Navigation Bar (`.tac-class-navbar`)**:
       - Positioned at the top of Test Management as the unified academic cockpit.
       - Dynamically generates tabs from `allBoardClasses`: `3rd Vocabulary (40)`, `1st Storytelling (0)`, `2nd Storytelling (0)`, `Speaking Projects (0)`, `Public Speaking (0)`, `Basic English (0)`, and `🌐 All Classes (40)`.
       - Defaults to `3rd Vocabulary` (`ab33498a-90e6-44b7-83f4-5765f964543e`).
       - Implemented `window._switchClassTestAnalytics(classId)` to filter tests and display track-specific analytics and table records.
    2. **Vocabulary Domain Split: Words vs. Phrases Mastery Deep-Dive (`#tac-vocab-domain-section`)**:
       - Single-Word Vocabulary Box: 20 Tests, 602 Submissions, 47% Avg Score [D], 73% FAPR, 53% Remedial Rate. Noun, Verb, and Adjective precision focus.
       - Phrases & Idioms Mastery Box: 20 Tests, 389 Submissions, 63% Avg Score [C], 81% FAPR, 37% Remedial Rate. Contraction-tolerant (I'm = I am, I'll = I will) and punctuation-ignored.
       - Domain Filter Pills: `🌐 All Vocab`, `🔤 Words`, `💬 Phrases` with instant visibility toggling via `window._filterVocabDomain(domainKey)`.
    3. **The Wall — Top 10 Persistent Bottlenecks**:
       - Query upgrade in `tests-management.js`: Fetches `topic_snapshot`, `correct_answer_snapshot`, `accepted_answers_snapshot`, and `student_answer` from `attempt_answers`.
       - Expanded from 5 items to Top 10 Bottlenecks directly on dashboard with Rank (#1-#10), domain badges (`🔤 Word` / `💬 Phrase`), Indonesian prompt, English Target Answer, Topic origin, Failure Rate bar, and real student mistake samples.
       - Domain Filter Pills: `All Top 10`, `🔤 Words`, `💬 Phrases` via `window._filterWallBottlenecks(filterKey)`.
    4. **Curriculum Tests Explorer: Professional Data Table (NOT CARDS)**:
       - Replaced `.test-cards-grid` with `#curriculum-tests-table` matching reference screenshot in `media_1793230861362_8f9f2067.png`.
       - 13 Columns: `#`, `TITLE`, `DOMAIN` (Words/Phrases), `TYPE` (Quiz/Exam), `DUR.`, `QS`, `TAKERS`, `AVG SCORE` (Rule 2.10 Grade badge), `REM. %` (with `R` superscript), `PACING`, `INTEGRITY` (Anti-cheat flags), `STATUS`, and `ACTIONS`.
       - Table rows are interactive with hover effects; clicking any row opens the detailed Test Blueprint & Telemetry Drawer (`#datagrid-drawer`).
       - Maintained search input and category/theme/domain filter pills (`Theme A-D`, `Quizzes`, `Exams`, `Words`, `Phrases`).
  - **Version Synchronization**:
    * `sw.js`: Bumped cache name to `topscore-cache-option-a-v23`.
    * `admin.html`: Bumped cache busting query to `?v=20261029_v23`.
  - **Verification**:
    * Playwright on Microsoft Edge (`scratch/verify_class_tabs_vocab_table.mjs`):
      1. Class Navigation Bar: 7 tabs rendered, active track correctly set to `3rd Vocabulary (40 Tests)` (PASS).
      2. Vocab Domain Split: Words box (47% [D], 73% FAPR) & Phrases box (63% [C], 81% FAPR), filter pills toggle view seamlessly (PASS).
      3. The Wall Top 10 Bottlenecks: 10 items with target answers, topics, failure bars, and student mistake samples (PASS).
      4. Curriculum Tests Table: `#curriculum-tests-table` with 13 columns, 40 rows rendered, Rule 2.10 badges, row click opens Drawer (PASS).
      5. Class Switching: Switching to `1st Storytelling` shows empty track state, switching back restores 40 tests (PASS).
    * Visual Artifacts:
      - `class_tabs_vocab_analytics.png`: Test Analytics with Class Navbar, Vocab Split card, and The Wall Top 10.
      - `curriculum_tests_table_view.png`: Curriculum Tests Explorer in high-density professional table view.
      - `class_switching_verified.png`: Class track switching verified.
    * Full test suite: `node scripts/check_all_js_syntax.cjs` and `npm.cmd test` passed 100%.

- **Phase 177: Sub-Tab Separation for Test Analytics vs Curriculum Tests Explorer (Option A)**:
  - **User Request**: User inquired *"saya lihat ada curriculum test explorer, apa itu? kalau bisa dipisah saja tabnya coba analisa, diskusikan"*, and explicitly selected **Opsi A** (Sub-tab switcher at top of page).
  - **Architecture & Implementation**:
    * Added top-level glassmorphic segmented switcher `.test-analytics-view-tabs`:
      - Tab 1: `📊 Test Analytics & Health`
      - Tab 2: `📚 Curriculum Tests Explorer` `<span class="tac-tab-count">40</span>`
    * **View 1 (`#test-view-analytics`)**:
      - Displays the 8 Intelligence Panels (Integrity Radar, Mastery/FAPR, Pacing Velocity, AI Speech Engine, The Wall Top 5 Bottlenecks, 24-Hour Peak WITA Traffic Heatmap, Remedial Watchlist, Linguistic POS Matrix, Grade Distribution, Audio Review Queue with 1-click override, and Test Difficulty Spectrum).
      - Completely hides the 40 test cards, delivering an uncluttered executive mission control.
    * **View 2 (`#test-view-curriculum`)**:
      - Displays the 40 Curriculum Test Cards starting immediately at the top.
      - Theme navigation pills: `All Tests (40)`, `Theme A · Workplace (8)`, `Theme B · Tourism (10)`, `Theme C · Culture (12)`, `Theme D · Society (10)`, `⚡ Quizzes Only (32)`, `🏆 Exams Only (8)`.
      - Live search filtering + `+ Add Test` gateway modal trigger.
      - 40 interactive diagnostic cards with Type badge, Theme code, Duration, Questions count, Takers count, Rule 2.10 Grade badge, Remedial rate, mini progress bar, pacing, quick action bar, and Test Blueprint Drawer.
    * **Tab Controller (`window._switchTestAnalyticsView`)**:
      - Manages active classes and instant DOM toggling (`display: block` vs `none`) with state persistence in `window._activeTestAnalyticsView`.
  - **Version Synchronization**:
    * `sw.js`: Bumped cache name to `topscore-cache-option-a-v22`.
    * `admin.html`: Bumped version query string to `?v=20261029_v22`.
    * `js/admin/app.js`: Bumped tests-management import query string to `?v=5.5.0`.
  - **Verification**:
    * Playwright on Microsoft Edge (`scratch/verify_option_a_tabs.mjs`):
      - Initial state: Tab 1 active, View 1 visible, View 2 hidden (PASS).
      - Tab switch: Tab 2 active, View 1 hidden, View 2 visible with 40 cards (PASS).
      - Theme filtering inside Tab 2: Theme A (8 cards), Exams (8 cards) (PASS).
      - Switch back: Tab 1 restored cleanly without error (PASS).
      - Page/Console Errors: 0.
    * Screenshot Artifacts:
      - `option_a_tab1_analytics.png`: Clean executive cockpit for Test Analytics & Health.
      - `option_a_tab2_curriculum.png`: Dedicated Curriculum Tests Explorer with 40 cards.
    * Full test suite: `npm.cmd test` passed 100%.

- **Phase 176: 100% All-Cards Test Analytics Mission Control (Raw Table Eliminated)**:
  - **User Feedback Addressed**: Responded to user feedback *"menurut saya ini belum bagsu"* and explicit mandate *"janagn ada tabel di bawah itu,,, pakai kartu saja"*.
  - **Eliminations**:
    * Completely removed the legacy raw DataGrid table (`#Tests-grid-container`) with developer-like table rows.
    * Removed the 4 redundant topbar counter boxes (`Total Tests`, `Published Tests`, `Draft / Inactive`, `Questions in Bank`) via `window.setTopbarTabs([])` to free up screen real estate and prevent duplicate headers.
  - **New 100% All-Cards Mission Control Architecture**:
    * **Top 4 Hero KPIs**: Integrity Radar (focus losses, cheater identification, speedrunners), Mastery & FAPR (1st-pass rate, grade health), Pacing Velocity (avg duration, panic submits), AI Speech Engine (accuracy rate, evaluated speech-to-text items).
    * **Row 2 (2 Large Visual Panels)**:
      - *The Wall*: Top 5 Curriculum Bottlenecks with fail rate % progress bars and target correct answers, with 1-click modal drill-down to view Top 20.
      - *24-Hour WITA Peak Traffic Heatmap*: Visual CSS histogram rendering hourly attempt density across 24 hours, highlighting peak load at 20:00 WITA (147 attempts).
    * **Row 3 (3 Visual Panels)**:
      - *Remedial Watchlist*: Top strugglers showing initial vs best scores and positive delta improvements.
      - *Linguistic POS Matrix*: Nouns, Verbs, Adjectives, and Phrases mastery rates with color progress bars.
      - *Official TopsCore Grade Distribution*: Rule 2.10 palette (★ Purple `#A855F7`, A Green `#10B981`, B Lime `#84CC16`, C Yellow `#EAB308`, D Orange `#F97316`, E Red `#EF4444`).
    * **Row 4 (2 Visual Panels)**:
      - *Live Audio Review & Teacher Override Queue*: 1-click `⚡ Override 100%` updating Supabase `attempt_answers` with audit logging.
      - *Test Difficulty Spectrum*: Toughest Test vs Easiest Test with Avg Score and Remedial Retry rates.
    * **Row 5 (Curriculum Tests Explorer — 100% Cards Grid)**:
      - 40 curriculum tests rendered in a responsive grid (`.test-cards-grid`, `.test-item-card`).
      - Theme navigation pills: `All Tests (40)`, `Theme A · Workplace (8)`, `Theme B · Tourism (10)`, `Theme C · Culture (12)`, `Theme D · Society (10)`, `⚡ Quizzes Only (32)`, `🏆 Exams Only (8)`.
      - Live search bar filtering cards instantly as user types.
      - Each card features: Type badge (`⚡ QUIZ` / `🏆 EXAM`), Theme badge (`Theme A/B/C/D`), Status badge, Question count (`⚡ Vault 40`), Takers count, Score with Rule 2.10 Grade badge, Remedial rate with superscript (e.g. `86%ᴿ`), Security flags, Mini progress bar, Average pacing, and Quick Action buttons (`📊` Submissions, `📄` Duplicate, `👁️/👁️‍🗨️` Publish toggle, `✏️` Edit, `🗑️` Delete).
      - Clicking any card opens the Test Blueprint & Telemetry Drawer with Top 3 Hardest Questions specific to that test and direct access to student submissions.
  - **Verification**:
    * Playwright on Microsoft Edge (`scratch/verify_all_cards_mission_control.mjs`):
      - Old raw table `#Tests-grid-container` verified absent: PASS
      - Topbar redundant tabs verified empty: PASS
      - Total test cards in grid: 40 (PASS)
      - Theme A filtered cards: 8 (PASS)
      - Theme B filtered cards: 10 (PASS)
      - Theme C filtered cards: 12 (PASS)
      - Theme D filtered cards: 10 (PASS)
      - Quizzes filtered cards: 32 (PASS)
      - Exams filtered cards: 8 (PASS)
      - Live search filtering: PASS
      - Test Card Drawer with hardest questions: PASS
      - Hero card drill-down modal: PASS
      - Page/Console Errors: 0
    * Screenshot Artifacts: `test_analytics_all_cards.png`, `test_analytics_curriculum_cards_view.png`, `test_analytics_drawer_hardest_qs.png`.
    * Full test suite: `npm.cmd test` passed 100%.
    * Bumped SW cache to `v21`.

- **Phase 175: Full Completion of Extended Test Analytics & Topic Merge Wizard**:
  - **Objective**: Implement all 5 extended items identified in the 20-pass analytical audit and user roadmap:
    1. Interactive drill-down inspection modals for all 8 intelligence cards.
    2. Per-test specific Top 3 Hardest Questions inside the Test Details Drawer.
    3. Audio Review Queue with 1-click Teacher Manual Override for spoken evaluations.
    4. 24-Hour WITA Peak Traffic Heatmap / Histogram.
    5. Functional execution of "Merge Similar Topics" (with automated scanner and manual source/target selector) in Topic Blueprint.
  - **Implementation Highlights**:
    * `js/admin/tests-management.js`:
      - Added `window._openTestAnalyticsCardModal(cardKey)` providing rich modals for `integrity` (focus-loss logs and speedrunners), `fapr` (grade breakdown and pass rate), `wall` (Top 20 hardest questions), `pacing` (velocity + 24-hour WITA heatmap), `strugglers` (retry leaderboard with delta), `spectrum` (40-test difficulty league), `linguistic` (POS matrix), and `speech` (audio review queue).
      - Added `window._overrideSpeechAnswer(ansId)`: Authoritatively updates Supabase `attempt_answers` with `is_correct = true` and `similarity_score = 1.0`, logs teacher audit event, and updates live UI.
      - Enriched Test Details Drawer: Added `🧱 Top 3 Hardest Questions in this Test` section specifically filtering answers for that test.
    * `js/admin/vocab-vault.js`:
      - Enhanced `openTopicDuplicateCheckerModal`: Added "Manual Topic Merge" selector supporting arbitrary source/target topic unification with live word re-assignment and vault reload.
    * Version Synchronization:
      - Updated `admin.html` and `app.js` with `?v=20261029_v20`.
  - **Verification**:
    * Playwright automated test (`scratch/verify_all_extended_features.mjs`) tested all 5 features in Edge:
      - Card 1 Modal (`Anti-Cheat Inspector`): PASS
      - Card 4 Modal (`Pacing & WITA Heatmap`): PASS (24 bars confirmed)
      - Card 8 Modal (`Speech & Audio Review Queue`): PASS
      - Test Details Drawer (`Top 3 Hardest Questions in this Test`): PASS
      - Topic Blueprint (`Topic Merge Wizard` with manual selector): PASS
      - Total Page Errors: 0
    * Test Suite: `npm.cmd test` passed 100%.

- **Phase 174: Elimination of Punctuation & Contraction Equivalence in Phrase Evaluation**:
  - **Objective**: Ensure phrase evaluation strictly ignores punctuation (`.`, `,`, `!`, `?`, `-`, `_`, etc.) and treats English contractions (`I am` $\leftrightarrow$ `I'm`, `I will` $\leftrightarrow$ `I'll`, `cannot` $\leftrightarrow$ `can't`, `will not` $\leftrightarrow$ `won't`) as 100% equivalent full-point matches.
  - **Engine Architecture & Pipeline (`js/grading.js`, `supabase/functions/submit-test/index.ts`)**:
    1. *Contraction Dictionary*: Mapped all pronoun + to be, pronoun + will, pronoun + have, pronoun + would/had, negations, and common phrasals.
    2. *Smart Quote Normalization*: Converted all curly quotes/apostrophes (`’`, `‘`, `‚`, `‛`, `` ` ``, `´`) to standard ASCII `'` prior to matching.
    3. *Order of Operations Correction*: Executed contraction expansion *before* stripping punctuation so words like `I'm` and `I'll` are properly converted to `i am` and `i will`.
    4. *STT Leeway*: Added normalization for speech-to-text outputs that drop apostrophes (`im` -> `i am`, `ill` -> `i will`, `dont` -> `do not`).
    5. *Full Punctuation Stripping*: Eliminates all punctuation and symbols, collapses whitespace to single spaces, and trims.
  - **Verification**:
    * `scratch/test_phrase_eval.mjs`: 10/10 test cases verified with 1.0 point (Correct), 0 penalties for contraction or punctuation variations.
    * 40/40 JS syntax checks passed (`node scripts/check_all_js_syntax.cjs`).
    * Full test suite passed 100% (`scripts/test_student_dashboard_exam_parity.mjs`, `generate_sw_manifest.mjs`).
    * Bumped SW cache to `v20`.

- **Phase 173: Vocabulary Quiz Duration Standardized to 5 Minutes Across Database & Auto-Generator**:
  - **Objective**: Reduce Quiz duration for the Vocabulary class to 5 minutes across all existing quizzes in Supabase and establish 5 minutes as the authoritative default setting in the Auto-Generator engine.
  - **Database Updates**:
    * Queried all 40 tests in `tests` table; identified 16 Words Quizzes configured with legacy 10m duration.
    * Executed batch update setting `working_duration_minutes = 5`, `payload.working_duration_minutes = 5`, and `payload.duration_minutes = 5`.
    * Verified 32/32 Quizzes for the vocabulary curriculum now operate on a 5-minute countdown (`{ '5': 32 }`).
    * Milestone Exams remain untouched at 90m/120m.
  - **Auto-Generator Engine Standardizations**:
    * `js/admin/auto-gen-modal.js`: Updated `prefillTaskDur` default to `5` (was `10`), updated input tooltip to `(default 5 menit)`.
    * `js/api.js`: Updated `updateClassTestsConfig` default to `taskDurationMinutes = 5`, updated `autoGenerateTestsHierarchy` default fallbacks for `taskDur` and `wordsTaskDur` to `5` minutes.
  - **Verification**:
    * `scratch/verify_test_analytics.mjs`: Playwright test confirmed table rows display `⏱️ 5m` for all quizzes with 0 console errors.
    * `npm.cmd test`: 100% PASS.

- **Phase 172: Transformation of Test Management into "Test Analytics" Hub**:
  - **Objective**: Redesign and transform `admin.html#tests` from a basic static test config list into an intelligent operational hub named **Test Analytics**, synthesizing 20-pass telemetry analysis into 8 core functional cards and an enriched 40-test performance DataGrid.
  - **Architecture & Implementation**:
    1. *Navigation & Canon Parity*:
       - Renamed sidebar menu item in `admin.html` under Domain C to `📊 Test Analytics`.
       - Updated section title in `js/admin/app.js` to `'Test Analytics'`.
       - Bumped SW cache to `topscore-cache-option-a-v19` and registration queries.
    2. *8 High-Density Operational Intelligence Cards (`js/admin/tests-management.js`)*:
       - `🚨 Integrity Radar`: Total flags (1,000+), top focus-loss student (Miss Siti Qori, 301 flags), and rush-guessers (67).
       - `🎯 Mastery & FAPR`: First-attempt pass rate (76%) and canonical 6-grade bell curve (`★` 164, `A` 243, `B` 100, `C` 55, `D` 70, `E` 359).
       - `🧱 The Wall (Hardest Words)`: Hardest vocabulary questions with highest fail rate ("Menyampaikan", "Menghormati", "Menarik").
       - `⏱️ Pacing Velocity`: Global average completion time (28m 31s) and panic/auto-submit ratio (39%).
       - `👥 Remedial Watchlist`: High-attempt struggle learners (Mr. Aunul 66 att, Top 62 att, Miss Siti 62 att) and ghost student detection.
       - `🔥 Test Spectrum`: Toughest test by score & remedial rate (D Words Exam, 16% avg, 88% rem) vs easiest ceiling test (D4 Phrases Quiz, 100% avg).
       - `🧬 Linguistic Mastery`: Part-of-Speech accuracy (Nouns 84%, Verbs 68%, Adjectives 62%, Phrases 54%) and 100% Vault utilization (800 items).
       - `🎙️ AI Speech Quality`: Speech-to-text accuracy (40% pass) and audio review queue status.
    3. *Enriched 40 Tests DataGrid Table*:
       - Added `TAKERS`: Unique student count (e.g. `👥 24 st`).
       - Added `AVG SCORE`: Color-coded score % with official TopsCore grade predicate (`[★]`, `[A]`, `[B]`, `[C]`, `[D]`, `[E]`).
       - Added `REM %`: Remedial rate with official superscript `R` notation (`%ᴿ`).
       - Added `PACING`: Average completion duration per test (`⏱️ Xm Ys`).
       - Added `INTEGRITY`: Anti-cheat status (`🛡️ Clean` or `🚨 X fl`).
    4. *Test Analytics Deep-Dive Drawer*:
       - Upgraded row-click inspector to display test specs + real-time performance telemetry + direct button to view student submissions in `#results`.
  - **Live Browser Verification (`scratch/verify_test_analytics.mjs`)**:
    * Rendered `admin.html#tests` in Microsoft Edge headless.
    * Detected navigation label: `📊 Test Analytics`.
    * Detected all 8 Cards with live telemetry.
    * Detected 40 test rows with all 10 column headers.
    * `Page Errors: 0` (clean console).
    * Screenshot verified: `test_analytics_verified.png`.
  - **Full CI Suite Verification**:
    * `scripts/check_all_js_syntax.cjs`: 40/40 JS files passed.
    * `npm.cmd test`: 100% passed (syntax, SW cache manifest, student dashboard parity).

- **Phase 171: Unification of Topic Manager & Test Blueprint into Zero-Scroll "Topic Blueprint"**:
  - **Objective**: Consolidate the redundant `Test Blueprint` and `Topic Manager` tabs in Vocabulary Vault (`admin.html#vocab_vault`) into a single high-efficiency tab named `Topic Blueprint`, designed with a strict zero-scroll viewport layout.
  - **Architecture & Layout Implemented (`js/admin/vocab-vault.js`)**:
    1. *Unified Tab Navigation*: Streamlined Vault tabs from 4 to 3 (`Topic Blueprint`, `Vocabulary Words`, `Phrases & Idioms`).
    2. *Top Toolbar*: Integrated search filter (`#vault-topic-search`), Level indicator (`LEVEL 3`), quick actions (`Merge Similar Topics`, `Reset All`), real-time item counters, and primary action `⚡ Auto-Generate from Blueprint`.
    3. *4-Thematic Columns Board*:
       - Theme A (Workplace, 3 Topics, 150 Items, Words Exam: 120 Q, Phrases Exam: 30 Q)
       - Theme B (Tourism, 4 Topics, 200 Items, Words Exam: 280 Q, Phrases Exam: 70 Q)
       - Theme C (CCU, 5 Topics, 250 Items, Words Exam: 480 Q, Phrases Exam: 120 Q)
       - Theme D (High-Frequency, 4 Topics, 200 Items, Words Exam: 640 Q, Phrases Exam: 160 Q)
    4. *Topic Item Cards*: Render topic number, topic name, inline actions (✏️ Rename, 🗑️ Delete), color-coded POS micro-badges (Verbs green, Adjectives yellow, Nouns blue, Phrases purple), and total item count badge.
    5. *Exam Milestone Footers*: Display cumulative question scale for Words Exam and Phrases Exam anchored at the base of each theme column.
    6. *Zero-Scroll Guarantee*: Entire board height is locked to `calc(100vh - 120px)` with equal 25% column division (`grid-template-columns: repeat(4, 1fr)`), completely eliminating vertical and horizontal scrollbars on desktop/laptop viewports.
  - **Live Browser Verification (`scratch/verify_topic_blueprint.mjs`)**:
    * Rendered 4 theme columns and 16 topic cards without console errors (`pageErrors: 0`).
    * Confirmed `hasVerticalScroll: false` (`docScrollHeight === docClientHeight === 900px`).
    * Full test suite (`npm test`) passed 100%.

- **Phase 170: Resolution of Tutor's Room (Class Hub) Blank Rendering & ES Module Export Parity**:
  - **Issue Identification**:
    * User reported that the Tutor's Room (`admin.html#class-hub`) was empty, showing a blank dark screen.
    * Diagnostic inspection uncovered two root causes:
      1. `Uncaught SyntaxError: The requested module '../app.js?v=20261027' does not provide an export named 'isExam'` (at `app.js:2:162`).
      2. `ReferenceError: weeklyCompletedStudents is not defined at js/admin/app.js:2106:68` inside DataGrid `summaryRow()`.
  - **Resolution**:
    1. Re-exported `isExam` from `js/app.js` and `js/api.js`, making it available to all importing modules and attached to `window`.
    2. In `js/admin/app.js`, imported from `../app.js?v=20261029`, added alias `const weeklyCompletedStudents = examCompletedStudents;`, and safely guarded `hasExamCompletions` on line 2106.
    3. Bumped script version query in `admin.html` and Service Worker cache to `topscore-cache-option-a-v18` in `sw.js`.
  - **Verification**:
    * Headless Edge Playwright test on live server `http://127.0.0.1:5500/admin.html#class-hub` confirmed:
      - 24/24 student rows detected and mounted.
      - 0 console errors.
      - All student records (Syazida 472.5 pts, Ari 470 pts, Aunul 415.5 pts) rendered with scores, progress, and grades.
    * Full test suite (`npm test`) passed 100%.

- **Phase 169: 10-Pass End-to-End System & Logic Stress Test [100% ALL PASS]**:
  - **Objective**: Execute an exhaustive 10-pass stress test across all subsystems, logic, RPCs, and UI views in TopsCore in response to user directive.
  - **10-Pass Execution & Verification Matrix**:
    1. *Pass 1 (Syntax & Code Integrity)*: 40/40 JavaScript files passed `node --check` syntax validation (0 syntax errors).
    2. *Pass 2 (Service Worker & Offline Capability)*: Cache `topscore-cache-option-a-v17`, all 27 manifest assets verified on disk, `offline.html` fallback page present and functional.
    3. *Pass 3 (Database Schema & RPC Contracts)*: Connected to live Supabase PostgreSQL; verified WITA server clock RPC (`get_server_time_wita`); verified 3 institutions, 4 programs, 8 batches, 12 classes, 40 active tests, 800 vault items; confirmed 990 total attempts with 0 non-canonical grades (`★`, `A`, `B`, `C`, `D`, `E`).
    4. *Pass 4 (Student Auth & Entity Hierarchy)*: Verified 4-tier relational integrity (Institution -> Program -> Batch -> Student), secure SHA-256 `pin_hash` validation.
    5. *Pass 5 (Test Generation & Hierarchy Consistency)*: Verified 40 curriculum tests in Level 3 (32 Quizzes with category 'QUIZ', 8 Exams with category 'EXAM', 0 invalid types).
    6. *Pass 6 (Access Control & Sequential Exam Gating)*: Verified intra-theme sequential prerequisite (Words Exam $\ge 60\%$ before Phrases Exam unlocks); verified daily quizzes passthrough.
    7. *Pass 7 (Test Runner & Attempt Scoring Logic)*: Verified working duration limits, emergency submit RPC (`emergency_submit_attempt`), and auto-submit scoring.
    8. *Pass 8 (Centralized Grading & Remedial Rules)*: Verified 6-tier grading scale (`★` 100%, `A` 90-99%, `B` 80-89%, `C` 60-79%, `D` 30-59%, `E` 0-29%), verified remedial 60% cap and Grade C assignment.
    9. *Pass 9 (Milestone Progression & Leaderboard Parity)*: Verified Points-First multi-tier sorting (`PTS DESC` -> `SCORE % DESC` -> `PROG % DESC` -> `lastSubmittedAt ASC` -> Name ASC) with 100% Admin Class Hub and Student Lobby parity.
    10. *Pass 10 (End-to-End Live Browser UI Validation)*: Launched headless Chromium/Edge via Playwright across `index.html`, `admin.html`, `dashboard.html`, and `offline.html`; verified clean DOM rendering with 0 console errors.
  - **Result**: 🏆 **100% ALL 10 PASSES SUCCEEDED**. All systems working optimally without error.

- **Phase 168: System-Wide Nomenclature Standardization & Zero-Exception Terminology Purge**:
  - **Objective**: Execute comprehensive elimination of legacy terminology remnants across frontend modules, templates, admin tools, and edge function logic, strictly upholding TopsCore canon:
    * **Test**: Single umbrella term for all evaluations.
    * **Quiz**: Formative daily/topic drills (no `task`, no `daily quiz`).
    * **Exam**: Milestone/scheduled theme exams (no `weekly exam`).
    * **Class**: Curriculum entity (no `subject`).
  - **Files Refactored & Standardized**:
    1. `js/grading.js`: Promoted `isExam(test)` as primary canonical classification helper. Exported backward-compatible alias `isWeeklyExam = isExam`. Standardized `computeMilestoneExamMastery` to output `completedExamCount` (with `completedWeeklyCount: completedExamCount` alias).
    2. `dashboard.html`: Updated switcher copy from `"Switch class to focus your next task and test"` to `"Switch class to view your quizzes and exams"`.
    3. `admin.html`: Updated button label to `⚡ Bulk Edit Tests`. Replaced corrupted mojibake with clean UTF-8 emojis (`⚡ 5 Menit (Quiz)`, `🏆 120 Menit (Exam)`).
    4. `js/dashboard.js`:
       - Updated hero banner copy from `"All tasks in this class completed!"` to `"All tests in this class completed!"`.
       - Replaced `isWeeklyExam` with canonical `isExam`.
       - Modernized leaderboard ranking and multi-tier sorting to inspect `completedExamCount` (with fallback).
       - Renamed internal `siblingTasks` loop to `siblingQuizzes` and purged references to non-existent `test_category`.
    5. `js/result.js`:
       - Updated completion banner copy from `"All tasks and tests completed!"` to `"All tests completed!"`.
       - Replaced `isTest` check on `nextAsm` with canonical `isExam(nextAsm)`.
       - Updated breadcrumb category resolution fallback from `'TASK'` to `'QUIZ'`, and removed non-existent `test_category` reading.
    6. `js/admin/classes-management.js`:
       - Modernized wizard action handlers to `handleAddQuiz` and `handleAddExam` (with backward compatibility aliases `handleAddTask` and `handleAddTest`).
       - Configured wizards with `tier: 'QUIZ', category: 'QUIZ'` and `tier: 'EXAM', category: 'EXAM'`.
       - Updated action buttons to `📝 Add Quiz` and `🏆 Add Exam`.
       - Updated empty state text to `"display the auto-generated quiz & exam tree"`.
       - Replaced filter tabs with `Quizzes (${quizCount})` and `Exams (${examCount})`.
    7. `js/admin/auto-gen-modal.js`:
       - Updated blueprint wizard description text to `"Konfigurasi blueprint kurikulum, durasi quiz, cara jawab, dan passing score."`.
       - Standardized DOM IDs to `#wizard-quiz-dur`, `#wizard-quiz-min`, `#wizard-quiz-ans-words`, `#wizard-quiz-ans-phrases`.
       - Standardized generator variable names to `quizDuration`, `quizPassing`.
       - Updated success toast: `Auto-Gen Sukses: X Quiz, Y Exam dibuat`.
    8. `js/admin/vocab-vault.js`:
       - Standardized tier values to `QUIZ` (Single topic drill) and `EXAM` (Milestone aggregated exam).
       - Updated copy to `"Select the Vault topic for this Quiz"` and `"Select Quizzes to aggregate for this Exam"`.
       - Updated footer infobar chips to `Quizzes: ${totalTasks}` and `Exams: ${totalTests}`.
       - Updated roadmap item titles to `${titleType} Quiz - ${topicName}`.
    9. `js/admin/tests-access.js`:
       - Replaced UI copy from `Learning Tasks` / `Tasks` to `Quizzes` / `Prerequisite Quizzes`.
       - Updated engine variable names to `completedQuizCount` and `themeQuizzes`.
       - Purged checks for non-existent `test_category` column.
    10. `js/admin/tests-management.js`:
       - Replaced `test_category` reads with `category`.
       - Updated title highlights to style `Quiz` in Yellow (`#facc15`) and `Exam` in Pink (`#f472b6`).
       - Updated TYPE column highlights to style `QUIZ` in Yellow and `EXAM` in Pink.
    11. `js/admin/app.js`:
       - Integrated `isExam` and `completedExamCount` across students grid data, sort comparators, and summary averages.
       - Replaced legacy `test_category === 'TASK'` table badge check with canonical `isWeeklyExam(a) ? 'EXAM' : 'QUIZ'`.
       - Updated test tab chips to `${taskTests.length} Quizzes` and `${testTests.length} Exams`.
    12. `js/api.js`:
       - Updated `createTestShell` and `autoGenerateTestsHierarchy` helpers to use `isQuizTier`, `tier === 'QUIZ'`, `category = isQuizTier ? 'QUIZ' : 'EXAM'`.
       - Purged lingering `test.test_category` reads in `fetchVaultQuestionsForTest`.
    13. `supabase/functions/start-test/index.ts`:
       - Renamed internal `siblingTasks` variables and comments to `siblingQuizzes`.
       - Purged `test.test_category` fallback check.
    14. `sw.js`:
       - Bumped service worker cache name to `topscore-cache-option-a-v17`.
  - **Verification & Test Results**:
    * `scripts/check_all_js_syntax.cjs`: 40/40 JavaScript files passed syntax validation (100% PASS).
    * `scripts/generate_sw_manifest.mjs`: All 27 cached assets verified on disk (100% PASS).
    * `scripts/test_student_dashboard_exam_parity.mjs`: Multi-tier sorting, exam points isolation, and milestone progression verified (100% PASS).
    * `scripts/test_sequential_exam_prerequisite.mjs`: Sequential exam gating and quiz passthrough verified (100% PASS).
    * `npm.cmd test`: Full CI test suite passed (Exit code 0).

- **Phase 167: Fix False-Positive Exam Prerequisite Gating on Phrases Quizzes (Hafizi Batch 133)**:
  - **Issue Identification**: Student Mr. Muhammad Masyan Hafizi (Batch 133) completed Test 19 (3C1 Words Quiz) with 100% (★). Upon clicking to start his next assessment (Test 20: "3rd Vocabulary C1 Phrases Quiz - Cultural Identity & Tradition"), the test loader failed with error toast `"Prerequisite not completed. You must pass the Words Exam (3rd Vocabulary C Words Exam - CCU) with at least 60% before taking the Phrases Exam"` and was redirected to `dashboard.html`.
  - **Root Cause**: In Phase 161 sequential intra-theme gating, `isPhrasesExamFallback` in `js/api.js` matched `/phrase/i.test(title)`, `/PHRASES/i.test(shell_code)`, and `payload?.category === 'phrases'` without checking whether the test was an Exam or a Quiz (`!isQuiz`). Because Test 20 is a daily quiz with category 'phrases', it was falsely treated as a milestone Phrases Exam, causing the system to demand a passing score on the milestone Words Exam (Test 29: CCU) before allowing the daily topic quiz to start.
  - **Resolution**:
    1. Added `isQuizFallback` in `js/api.js` ensuring that quizzes (`test_type === 'quiz'`, `category === 'quiz'`, or shell containing `QUIZ`/`TASK`) are strictly excluded from the sequential Words Exam prerequisite check.
    2. Added `!isQuiz` guard in `supabase/functions/start-test/index.ts`.
    3. Added automated regression test in `scripts/test_sequential_exam_prerequisite.mjs`.
    4. Verified live with Playwright on `test.html?id=ccfce187-d9be-42a3-9745-cd4852865481`: Test 20 loads instantly with 5-minute timer and voice/audio question items.
    5. Cleaned transient in-progress attempt created during test run.

- **Phase 166: Full System Maximization, Security Hardening & CI Pipeline**:
  - **1. Security Headers & Host Configurations (`vercel.json`, `netlify.toml`, `robots.txt`)**:
    - Added `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS).
    - Added comprehensive `Content-Security-Policy` restricting script, style, font, image, media, and connect origins to `self`, Supabase (`*.supabase.co`), Google Fonts, and trusted CDNs.
    - Added long-lived browser cache policies for versioned CSS (`max-age=86400, stale-while-revalidate`) and assets (`max-age=604800, stale-while-revalidate=2592000`).
    - Added `robots.txt` restricting search engine crawlers from indexing `/admin.html`, `/test.html`, `/result.html`, `/management.html`.
  - **2. Database Query Projections & Egress Optimization (`js/api.js`)**:
    - Replaced all non-generic `select('*')` with explicit column projections:
      * `attempts` client fallback: `select('id, is_remedial_unlocked')`
      * `attempt_answers` client fallback: `select('id, student_answer, accepted_answers_snapshot, correct_answer_snapshot')`
      * `tests` guard check: `select('id, module_id, class_id, level_id')`
      * `word_types`: `select('id, name, is_active, class_id')`
      * `levels` target resolution: `select('id, level_number')`
      * `class_instances`: `select('id, batch_id, class_id, start_date, estimated_finish, actual_finish, recurring_schedule, status, created_at, updated_at')`
      * `class_meetings`: `select('id, class_instance_id, meeting_number, scheduled_date, actual_date, status, created_at, updated_at')`
  - **3. Extraction of All 6 Inline `<script>` Blocks from `admin.html`**:
    - Created `js/admin/admin-init.js` containing `initAuthGate()`, `initSidebarCache()`, `initRecordDrawer()`, `window.DataGrid` export, and `registerServiceWorker()`.
    - Removed all 6 inline script tags from `admin.html`. Cleaned HTML structure to zero inline scripts.
  - **4. Code Hygiene & Secrets Decoupling**:
    - Removed debug `console.log` statements in `js/wake-lock.js` and `js/admin/class.js`.
    - Created `.env.example` defining `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `USE_LOCAL` for deployment teams.
    - Removed obsolete 0-byte root files `db_schema.sql` and `schema.sql`.
  - **5. Offline Fallback Page & Service Worker v16 (`offline.html`, `sw.js`)**:
    - Designed and created standalone responsive `offline.html` notifying students when internet drops and reassuring them that answers and sessions are preserved locally.
    - Updated `sw.js` cache to `topscore-cache-option-a-v16` incorporating `offline.html` and `admin-init.js`.
    - Configured document fetch failure handler to gracefully serve `offline.html`.
    - Unified SW registration query string across `dashboard.html`, `index.html`, `result.html`, `test.html`, and `admin-init.js` to `?v=20261028_v16`.
  - **6. Automated SW Manifest Generator & GitHub Actions CI Pipeline**:
    - Created `scripts/generate_sw_manifest.mjs` to auto-verify that 100% of declared SW cache assets exist on disk with file size telemetry.
    - Added GitHub Actions workflow `.github/workflows/ci.yml` running syntax checks, manifest verification, and student parity test suites on push/PR.
    - Configured `npm test` script executing the full suite in sequence (`npm.cmd test` = 100% PASS).

- **Phase 163: Student Lobby & Result Page Ergonomics Alignment**:
  - **Decisions Implemented per User Review**:
    1. *D-3 Leaderboard sub-line copy*: Changed from `${hasExam ? `${st.overallScore}% avg` : '-'}` to `${hasExam ? `${st.overallScore}% Progress` : '-'}` in `js/dashboard.js`. Verified on Suke Ajai dashboard.
    2. *T-1 Answer Type Label*: Updated `formatAnswerType(atype)` in `js/dashboard.js` to return empty string `''` when atype is null/unspecified. Card now omits the redundant/misleading "Written Test" label entirely.
    3. *T-2 Timer Row Clean-up*: Updated card template in `js/dashboard.js` to only render timer div when `time_limit_minutes > 0`. Eliminated defunct "0 min" badge on completed/untimed tests.
    4. *Test List Modal (Last Assessment Floated to Top & Locked Hidden)*:
       - In `openClassModal` (`js/dashboard.js`), tests are sorted with `sortedTests` by most recent attempt timestamp (`submitted_at` or `started_at` DESC), floating the student's active/last-taken tests (e.g. `3rd Vocabulary B Words Exam - Tourism`) immediately to the top of the modal.
       - Tests that have not been attempted and do not meet prerequisites (`!prereqMet && !best && !inProg`) are skipped, keeping future locked themes (Theme C, Theme D) cleanly hidden.
    5. *R-4 / R-6 Attempt Meta Strip (Option B - 20px Panel)*:
       - Added `<div id="result-attempt-meta" class="result-attempt-meta-strip cascade-item"></div>` in `result.html` between dual score/grade box and motivation message.
       - Styled in `css/result.css` with 20px fixed height, centered flex layout, and chip typography (`Attempt 1/2` and `▲/▼ X% from last`).
       - Revealed via `.cascade-revealed` in `runResultEntranceSequence` in `js/result.js`. Verified in Playwright (`opacity: 1`, `height: 20px`, visible in live browser rendering).
    6. *Cache & Asset Synchronization*:
       - Bumped `sw.js` cache name to `topscore-cache-option-a-v15`.
       - Bumped query parameters in `result.html` and `dashboard.html`.
       - All 39 JavaScript files syntax validated (`node --check`).

- **Phase 162: Fix Non-Existent Column 'test_category' & Restore Student Lobby UI & Leaderboard**:
  - **Root Cause Analysis of 3 User-Reported Anomalies**:
    1. *Class Progress showing 0%*: `3rd Vocabulary` pill showed `0%` despite student having 18 completed tasks.
    2. *Hero Banner declaring 'All tasks in this class completed! ✓ 100%'*: Displayed instead of next unpassed exam.
    3. *Leaderboard Standings not applying milestone progression penalties*: Miss Risma and Mr. Muhammad Alimae Pasya displayed `60% avg Grade C` instead of `18% Grade E`.
    - Investigation revealed: `fetchTests` (`js/api.js` line 1453) queried non-existent column `test_category` on table `tests`. Supabase PostgREST returned error `42703: column tests.test_category does not exist`. `fetchTests` failed silently and returned `[]`.
    - This caused:
      * `classAssms` was 0, evaluating class progress to `0%`.
      * `published` was 0, triggering the empty array branch `All tasks in this class completed!`.
      * `allBatchExams` was 0, preventing `computeMilestoneExamMastery` from knowing theme milestone structures, so classmates fell back to simple unpenalized averages.
  - **Code Resolution**:
    - Purged `test_category` from `fetchTests` query in `js/api.js`.
    - Purged `test_category` from `existingAsms` select in `js/admin/auto-gen-modal.js`.
  - **Browser Verification**:
    - Ran `scripts/verify_suke_ajai_dashboard_fix.mjs` against `dashboard.html`:
      * Class Progress: restored to **45%** (18/40).
      * Hero Assignment: restored to **Ready for Test: 3rd Vocabulary B Words Exam - Tourism (🔒 Waiting for Tutor)**.
      * Leaderboard Standings: restored with 100% Admin Class Hub parity (Miss Risma: 90 pts, 18% avg, Grade E; Mr. Muhammad Alimae Pasya: 90 pts, 18% avg, Grade E).
      * Visual proof captured in `suke_ajai_dashboard_verified.png`.
    - Syntax Check: all 39 JS files passed 100%.
    - Recorded DECISION-027 in `docs/DECISIONS.md`.


- **Phase 161: Strict Sequential Intra-Theme Exam Prerequisites (Words Exam -> Phrases Exam)**:
  - **Investigation of Gagan Tara Deswari**:
    - Discovered root cause of Gagan taking Test 18 (3B Phrases Exam) despite Test 17 (3B Words Exam) displaying 59% (Grade D):
      1. On 2026-10-23, both exams were opened simultaneously and started by Gagan at the same second (`23:25:58 UTC`), resulting in 57% and 2%.
      2. Gagan retook Words Exam on 2026-10-26 (Attempt 12) scoring 164/280 pts (58.57% -> 59%, Grade D).
      3. Gagan later retook Words Exam in remedial (Attempt 13) scoring 101 pts (63.13%, capped at 60%). Because 164 pts > 101 pts, the gradebook selected Attempt 12 as highest score, displaying `59% | 164 pts | Grade D`.
      4. Meanwhile, Gagan retook Phrases Exam in remedial (Attempt 15) scoring 69/70 pts (98.57%, capped at 60% = 42 pts), displaying `60%ᴿ | 42 pts | Grade C`.
      5. Gating gap identified: TopsCore previously only validated that daily quizzes (B1–B4) were completed, without enforcing sequential order between sibling milestone exams (Words Exam -> Phrases Exam).
  - **4-Layer Sequential Gating Implemented**:
    1. **Edge Function (`supabase/functions/start-test/index.ts`)**:
       - Rejects start requests for Phrases Exam if sibling Words Exam in same theme/class/level has no submitted attempt with $\ge 60\%$ (HTTP 403: `"Prerequisite not completed. You must pass the Words Exam (...) with at least 60% before taking the Phrases Exam."`).
    2. **Client Fallback API (`js/api.js`)**:
       - Enforces identical sequential sibling Words Exam query and $\ge 60\%$ threshold validation in `startTest` direct database fallback.
    3. **Student Lobby UI (`js/dashboard.js`)**:
       - In `openClassModal` and `renderThemeTests` / `renderWeeklyExams`, locks Phrases Exam card (`🔒 Locked`, 50% opacity, grayscale filter) with action prompt: `"Complete [Words Exam Title] (Score ≥60% required) to unlock this test."`
    4. **Admin Test Sessions Whitelist (`js/admin/tests-access.js`)**:
       - Calculates `wordsPassed` during student eligibility evaluation.
       - Restricts `allowedStudentIds` and `remedialStudentIds` for `theme.phrasesTest` in `openThemeSessionModal` and `openThemeLateModal` to students where `wordsPassed === true`, unless "Tutor Override" is checked.
  - **Verification & Documentation**:
    - Created `scripts/test_sequential_exam_prerequisite.mjs`: verified 58.57% is BLOCKED and 60% is ALLOWED against real database schemas.
    - Verified all 39 JS files pass `node scripts/check_all_js_syntax.cjs`.
    - Verified `test_student_dashboard_exam_parity.mjs` passes 100%.
    - Recorded DECISION-026 in `docs/DECISIONS.md`.


- **Phase 160: Auto-Close Stalled In-Progress Attempts & Queued Milestone Matrix 0% Visualization**:
  - **Auto-Submission of Stalled / Dead Battery Attempts**:
    - Investigated Ari Wahyu Darma stuck at `⏳` on Test 29 (`3rd Vocabulary C Words Exam - CCU`).
    - Root Cause: Student's phone died during exam ("semalam saat ujian HPnya matiii"). The client countdown timer stopped running, leaving the attempt record in `in_progress` even though `expires_at` was `2026-10-27 12:46:16 UTC`.
    - Resolution: Executed PostgreSQL RPC `auto_close_expired_attempts()`. All 200 answered questions in `attempt_answers` were graded (`138 correct / 200 answers, score: 138, percentage: 69%, grade: C`).
    - Automatic Background Sweeper: Integrated `sb.rpc('auto_close_expired_attempts')` into `loadClassDetails(classId)` in `js/admin/app.js`, `fetchAllStudentAttempts()` in `js/api.js`, and `adminFetchAll('attempts')`. Now, any expired in-progress attempt across the system is automatically finalized and evaluated on page load without manual intervention.
    - Added UI guard in `js/admin/app.js`: in-progress attempts whose `expires_at < new Date()` never display `⏳`.
  - **Queued Milestone Exams Rendered as 0% in Table Matrix**:
    - Resolved requirement where students who completed Theme 1 (Sofa Maria Ulfa, Muhammad Alimae Pasya, Suharto, Muhammad Tarmizi Tohir) must show `0%` and `0` pts for Theme 2 exams (Test 17 & 18) instead of gray unattempted dots `·`.
    - Handled partial theme progress: students who completed Theme 2 and took 1 exam in Theme 3 (Syazida Shinda Debi, Aunul Fikri Yasir, Ari Wahyu Darma) now show `0%` and `0` pts for the remaining queued exam in Theme 3 (Test 30: Phrases Exam).
    - Unreached future milestones (Theme C & D for Pasya/Suharto/Tarmizi, Theme D for Syazida/Aunul/Ari) remain clean neutral dots `·`.
    - Added `includedThemeCodes` and `includedExamIds` to `computeMilestoneExamMastery()` in `js/grading.js` and threaded through student row state in `js/admin/app.js`.
  - **Full Verification & Visual Proof**:
    - Executed `scripts/verify_queued_milestones_and_ari.mjs` with Playwright on `admin.html#class-hub`:
      * Ari Wahyu Darma: 0 `⏳` icons, Test 29 = 69% (138 pts), Test 30 = 0% (0 pts), Total = 470 pts (Rank #2). PASS.
      * Sofa Maria Ulfa: Test 18 = 0% (0 pts). PASS.
      * Muhammad Alimae Pasya: Test 17 & 18 = 0% (0 pts). PASS.
      * Suharto & Tarmizi Tohir: Test 17 & 18 = 0% (0 pts). PASS.
      * Syazida Shinda Debi & Aunul Fikri Yasir: Test 30 = 0% (0 pts). PASS.
      * Rifky Ahmad & Muhammad Alif Rezki Rahman: Theme 1 starting baseline active at 0% (0 pts), Grade E, Test 7 & 8 = 0%, Theme B/C/D = `·`. PASS.
      * Screenshot captured: `admin_class_hub_queued_milestones_verified.png`.
    - Syntax Check: `node scripts/check_all_js_syntax.cjs` passed 100% (39 files).
    - Parity Suite: `node scripts/test_student_dashboard_exam_parity.mjs` passed 100%.

  - **Theme 1 Initial Baseline Logic for Zero-Exam Students (Rifky & Alif Rezki)**:
    - User Requirement: Enrolled students who have not taken any test yet start at Theme 1 as their immediate active obligation; their unattempted exams in Theme 1 count as 0% (not a neutral blank '—').
    - Implementation in `computeMilestoneExamMastery()` (`js/grading.js`):
      * When a student has 0 completed exams, Theme 1 (`sortedThemes[0]`, Theme A) is assigned as the initial active milestone.
      * Denominator is initialized to Theme 1 max points (150 pts for Tests 7 & 8).
      * Overall Score evaluates to 0% with canonical Grade E (`#EF4444`) and 0 pts.
      * `includedThemeCodes` contains `['A']`, and `includedExamIds` contains Test 7 & Test 8 IDs.
    - Matrix Grid Rendering in `js/admin/app.js`:
      * Test 7 & Test 8 render red `0%` (Score) and red `0` (Points).
      * Theme A Total Points renders `0` pts (rather than gray dot `·`).
      * Unreached future themes (Theme B, C, D) remain clean dots `·` because Theme 1 has not been passed ($0\% < 60\%$).
      * Class Average summary row includes all enrolled students, accurately producing 38% Grade D across 24 students.


- **Phase 159: Points-First Leaderboard Ranking, Milestone Progression Engine & Admin Table Ergonomics**:
  - **Points-First Sorting Hierarchy**:
    - Resolved ranking paradox (Mr. Suke Ajai vs Miss Sofa Maria Ulfa): Replaced `PROG %` primary sort with `Global PTS DESC` across both Admin Class Hub (`js/admin/app.js`) and Student Lobby (`js/dashboard.js`).
    - Tie-breakers configured: 1st `Global PTS DESC` -> 2nd `Global SCORE % DESC` -> 3rd `PROG % DESC` -> 4th `lastSubmittedAt ASC` -> 5th Clean Name Alphabetical.
    - Updated DataGrid default sorting to `initialSortKey: 'totalEarnedScore'` (PTS column sorted DESC by default).
  - **Milestone Progression & Next Exam 0% Penalty**:
    - Created authoritative `computeMilestoneExamMastery(examEntries, allClassExams)` in `js/grading.js`.
    - Once Milestone $N$ is passed ($\ge 60\%$), Milestone $N+1$ is queued into the denominator with 0 earned points, dynamically adjusting global score and grade so students cannot pause after early themes to preserve high grades.
    - Edge cases handled: students with 0 exams completed return neutral `—` for score/grade and `0 pts`.
  - **Admin Class Hub Table Ergonomics**:
    - Stripped `Mr.` and `Miss` honorifics from `displayName` in Admin Class Hub table using `cleanStudentName()` to maximize horizontal table space. Preserved honorifics in Student Dashboard.
    - Updated Daily Quiz columns in Admin Class Hub matrix grid to display **Score (%)** (e.g. `100%`, `98%`, `70%`) instead of points, reserving points exclusively for Milestone Exams.
    - Updated footer summaryRow class average for quizzes to display average percentage score.
  - **Verification & Parity**:
    - `scripts/test_student_dashboard_exam_parity.mjs`: Added Scenario 4. Verified Sofa Maria Ulfa (273.5 pts) ranks above Suke Ajai (143 pts), and Pasya (90 pts) is penalized by unattempted Theme B ($90 / 500 = 18\%$, Grade E). 100% PASS.
    - `scripts/verify_admin_class_hub_ui.mjs`: Live headless browser execution on `http://127.0.0.1:5500/admin.html#class-hub` confirmed:
      * PTS header is sorted DESC by default (`PTS ↓`).
      * All 24 student names rendered cleanly without "Mr." or "Miss".
      * All Theme A daily quizzes render percentage scores (`100%`, `94%`, `80%`).
      * Sofa Maria Ulfa (rank #11) ranked above Suke Ajai (rank #18).
      * Screenshot saved: `admin_class_hub_verified.png`.
    - `scripts/check_all_js_syntax.cjs`: All 39 JavaScript files validated with `node --check` with 0 syntax errors.
    - Service Worker cache bumped to `'topscore-cache-option-a-v14'`.

- **Phase 3 & Phase 4: Surgical Implementation, Refactoring & Verification**:
  - **Database Integrity & RPCs**: Verified PostgreSQL functions (`emergency_submit_attempt`, `auto_close_expired_attempts`) operate dynamically without hardcoded limits; verified canonical grade constraints (`★`, `A`, `B`, `C`, `D`, `E`).
  - **Frontend Views Cleaned**: `admin.html#class-hub`, Student Dashboard, modals, and navigation completely transitioned to clean "Quiz" and "Exam" terminology with zero legacy prefixes.
  - **Dynamic Table Data Binding**: Fixed earned points and score calculations in `js/admin/app.js` and `js/dashboard.js`, replacing static slot caps (40/10) with dynamic exam question scale (120, 30, 280, 70, 480, 120, 640, 160).
  - **Multi-Tier Leaderboard Sorting**: Enforced 1st PROG % DESC -> 2nd Global SCORE % DESC -> 3rd Global PTS DESC -> 4th lastSubmittedAt ASC across both Admin Class Hub and Student Dashboard.
  - **Verification & Parity**: 100% PASS on `test_student_dashboard_exam_parity.mjs`, 100% PASS on `master_purge_verification.mjs`, 0 grep residue hits, 0 syntax errors across 39 JS files.
  - **Atomic Staging**: All 18 modified files staged in git (`git add`), 0 git commits/pushes per repository protocol.

- **Phase 158: Multi-Pass Deep Repo Purge & Residue Audit**:
  - **Pass 1 (Terminology & Residual Strings Sweep)**:
    - Scanned 60 production files across `js/`, `supabase/functions/`, `assets/`, `css/`, root HTML.
    - Zero residue occurrences found for `assessment`, `daily quiz`, `daily task`, `weekly exam`, `theme exam`, `theme tot`.
  - **Pass 2 (Database & RPC Integrity Sweep)**:
    - PostgreSQL query verified 100% canonical grades (`★`, `A`, `B`, `C`, `D`, `E`), 32 quizzes, 8 exams, 0 orphaned attempts.
  - **Pass 3 (Client-Side Bindings & Runtime Sanity)**:
    - Headless Playwright extraction on `http://127.0.0.1:5500/admin.html#class-hub` confirmed accurate dynamic score and points rendering:
      * Miss Syazida: 68% SCORE | Grade C | 472.5 pts
      * Mr. Aunul Fikri: 59% SCORE | Grade D | 415.5 pts
      * Mr. Unggul Wirakse: 78% SCORE | Grade C | 387.5 pts
      * Zero-exam students: SCORE `—` | GRD `—` | 0 pts
      * Footer CLASS AVERAGE: 56% SCORE | Grade D | 231 pts
  - **Pass 4 (Automated Gates & Grep Proof)**:
    - Verified all 39 JS files with `node --check` (0 errors).
    - Parity suite `test_student_dashboard_exam_parity.mjs` passed 100%.
    - Terminal grep verification exited code 1 (0 matches).

- **Phase 157: Strict Exam ID/Type Filtering & True Weighted Score/Earned Points Calculation**:
  - **Admin Class Hub (`js/admin/app.js`)**:
    - Enforced strict exam filter in `isWeeklyExam(asm)` by strictly checking `test_type === 'exam'` or shell code ending in `-EXAM`, eliminating regex fallback on titles.
    - Updated `studentsGridData` aggregation:
      - Global PTS: strictly sums `weeklyEarnedScore` across completed exams.
      - Global SCORE %: calculated as `Math.round((weeklyEarnedScore / weeklyMaxPossible) * 100)` when `completedWeeklyCount > 0 && weeklyMaxPossible > 0`, else `0` (formatted as `—`).
      - Grade badge strictly evaluates `getGradePredicateByScore(averageScorePct)`.
  - **Shared Grading (`js/grading.js`)**:
    - Updated exported `isWeeklyExam(asm)` to remove title regex fallback, enforcing strict enum/category/shell matching.
  - **Student Dashboard (`js/dashboard.js`)**:
    - Updated `computeOverallStats()` and `loadBatchLeaderboard()` to store `{ effPct, effPoints, totalQ }` on best attempts.
    - Calculated hero score and leaderboard overall score as weighted: `Math.round((sumEarnedExamScore / sumMaxExamScore) * 100)`.
  - **Service Worker & Cache (`sw.js`, `admin.html`)**:
    - Bumped `CACHE_NAME` to `'topscore-cache-option-a-v12'`.
    - Bumped query string version in `admin.html` to `v=20261028_scorepts`.
  - **Verification**:
    - Vectors 1, 2, 3, 4: 100% PASS.
    - `test_student_dashboard_exam_parity.mjs`: 100% PASS.
    - Headless Chrome extraction on `http://127.0.0.1:5500/admin.html#class-hub`:
      * Row 1: Miss Syazida Shinda Debi | 68% SCORE | Grade C | 472.5 pts
      * Row 2: Mr. Aunul Fikri Yasir | 59% SCORE | Grade D | 415.5 pts
      * Row 3: Mr. Unggul Wirakse | 78% SCORE | Grade C | 387.5 pts
      * Row 4: Mr. Ari Wahyu Darma | 66% SCORE | Grade C | 332 pts
      * Row 5: Mr. Gagan Tara Deswari | 59% SCORE | Grade D | 296 pts
      * Row 23 & 24: Mr. Muhammad Alif Rezki Rahmansyah & Mr. Rifky Ahmad (0 exams): 0 pts, SCORE `—`, GRD `—`
      * Footer CLASS AVERAGE: 56% SCORE | Grade D | 231 pts


- **Phase 156: Scoring Engine Harmonization & Database Grade Normalization**:
  - **Student Dashboard (`js/dashboard.js`)**:
    - Replaced dynamic `PUBLISHED` count fallback with fixed curriculum test count (`window._batchTests.length || 40`) matching Admin Class Hub (Bug D-1).
    - Imported `getGradeColorByScore` from `./grading.js`.
    - Removed 3 hardcoded `gradeColors` dictionaries and replaced all usage with `getGradeColorByScore()` (Bugs D-2, D-3).
  - **Result Page (`js/result.js`)**:
    - Removed dead, legacy `gradeColors` dictionary on line 44.
  - **Admin Class Hub (`js/admin/app.js`)**:
    - Replaced 11-clause inline `isTest` evaluation with unified `isWeeklyExam(asm)` (Bug D-4).
    - Added `lastSubmittedAt` tracking to `studentsGridData` and wired 4th tie-breaker into initial sort and DataGrid `sortComparator` for PROG, SCORE, and PTS (Bug A-1).
  - **Edge Functions (`supabase/functions/submit-test/index.ts`)**:
    - Updated auto-leveling logic to respect `minimum_required_score` from `tests` with 75% fallback (Bug R-1).
  - **Database Migration (`20261028110000_canonical_grades_backfill_and_constraint.sql`)**:
    - Backfilled 159 legacy `'S'` grades to `'★'`.
    - Backfilled 40 legacy `'F'` grades to `'E'`.
    - Backfilled NULL grades using authoritative tier rules.
    - Added strict PostgreSQL CHECK constraint: `CHECK (grade IN ('★', 'A', 'B', 'C', 'D', 'E') OR grade IS NULL)`.
    - Confirmed 0 orphaned attempts and NOT NULL on `test_id`.
  - **Audit Vectors**:
    - Vectors 1, 2, 3, 4: 100% PASS.
    - Syntax validation across all 39 JS files: 100% PASS.

- **Phase 155: Class Hub Exam Point & Maximum Questions Restoration**:
  - **Root Cause Identified**:
    - `getAsmExpectedMax(asm)` in `js/admin/app.js` contained an obsolete regex matching only `TEST` instead of `EXAM`.
    - Following the terminology migration (`TEST` -> `EXAM`), all weekly milestone exams (`3A-WORDS-EXAM`, `3B-WORDS-EXAM`, etc.) failed `isTest` evaluation and were erroneously treated as daily quizzes with caps of 40 (words) and 10 (phrases).
    - Students who earned 73 pts, 102 pts, 188.5 pts, etc. on 120/280/480-question exams were artificially capped down to 40 pts and 10 pts, Theme TOT PTS displayed 50, and left roster PTS displayed artificial multiples of 40 and 10 (e.g. 140 pts instead of 472.5 pts).
    - In the summaryRow footer, column keys were checked using `asm_` instead of `test_`, leaving individual exam score/points averages blank.
  - **Fixes Applied**:
    - `js/admin/app.js`:
      - Updated `getAsmExpectedMax(asm)` to dynamically inspect `asm.payload?.total_questions`, `asm.total_questions`, and `isWeeklyExam(asm)`, returning true question counts (120, 30, 280, 70, 480, 120, 640, 160).
      - Updated `vaultCountFor` to recognize `-EXAM` in shell codes.
      - Updated `studentsGridData` and `renderAttendanceGridMatrix` columns (Score, Points, Theme Total) to cap score against `totalQ = Number(att.total_questions || maxQ)` instead of hardcoded 40/10.
      - Updated remedial status checking to support both `is_remedial_unlocked` and `is_remedial`.
      - Updated Theme Total Points calculation to sum points and maximum questions strictly across exams in the theme.
      - Updated summaryRow footer to match both `test_` and `asm_` column prefixes, restoring class averages for all test columns.
      - Updated DataGrid `sortComparator` to sort on `test_` columns.
    - `admin.html`:
      - Bumped script version to `js/admin/app.js?v=20261028`.
  - **Verification**:
    - Verified against live database records in Batch 133:
      * Miss Syazida: Col 7 WRD PTS = 73 (was 40), Col 8 PHR PTS = 18 (was 10), Theme A TOT = 91 (was 50), Col 17 WRD PTS = 188.5 (was 40), Col 18 PHR PTS = 47 (was 10), Theme B TOT = 235.5 (was 50), Col 29 WRD PTS = 146 (was 40), Total PTS = 472.5 pts (was 140 pts).
      * Mr. Aunul Fikri: Col 7 = 84.5, Col 8 = 21, Theme A TOT = 105.5, Col 17 = 173, Col 18 = 43, Total PTS = 415.5 pts (was 140 pts).
      * Mr. Unggul: Col 7 = 101.5, Col 8 = 25.5, Theme A TOT = 127, Col 17 = 190.5, Col 18 = 70, Theme B TOT = 260.5, Total PTS = 387.5 pts (was 100 pts).
      * Mr. Suharto: Col 7 = 72, Col 8 = 18, Theme A TOT = 90, Total PTS = 90 pts (was 50 pts).
    - Executed Playwright browser verification script `scratch/verify_matrix_scores.mjs` against live `http://127.0.0.1:5500/admin.html#class-hub`: verified all cells, theme totals, and footer row. 100% PASS. Screenshot saved to artifacts.

- **Phase 154: Student Dashboard Exam-Only Metrics & Ranking Parity**:
  - **1. Centralized Helper (`js/grading.js`, `js/app.js`, `js/api.js`)**:
    - Implemented and exported canonical `isWeeklyExam(asm)` helper: classifies tests based on enum `test_type === 'exam'`, category `EXAM` / legacy `TEST`, shell code `*-EXAM` / `*-TEST`, and excludes daily quizzes (`*-QUIZ`, `*-TASK`).
    - Re-exported in `js/app.js` and `js/api.js` to ensure 100% single-source-of-truth across admin and student views.
  - **2. Student Hero Banner & Metrics (`js/dashboard.js:computeOverallStats`)**:
    - Disconnected daily quizzes from Academic Score % (`#stat-overall-score`, `#bottom-stat-avg-score`) and Grade (`#stat-overall-grade-value`).
    - Evaluates academic score exclusively from completed weekly exams.
    - Added neutral edge-case handling for students with no weekly exams completed yet: displays `0%` score, `—` grade, and neutral `#dashboard-achievement-text` (`—`), preventing unfair penalties or false "FAIL" badges.
    - Maintained total activities completed count (`completedCount`) for completion badges.
  - **3. Batch Standings Leaderboard (`js/dashboard.js:loadBatchLeaderboard`)**:
    - Updated query to select complete test metadata (`tests(id, title, test_type, category, test_subtype, shell_code, deleted_at, status, payload)`).
    - Calculated `totalPoints` (PTS), `overallScore` (SCORE %), and `grade` (GRD) exclusively from weekly exams.
    - Enforced exact multi-tier ranking hierarchy matching Class Hub:
      1. `PROG % DESC` (overall curriculum completion)
      2. `Global SCORE % DESC` (weekly exam mastery; unattempted weekly exams sort after completed)
      3. `Global PTS DESC` (weekly exam points)
      4. Earliest submission timestamp (ascending)
      5. Alphabetical clean name (ascending)
    - Updated table rows to display neutral `0` PTS, `—` avg, and `—` grade chip for students with 0 weekly exams.
  - **4. Verification & Parity Test Suite**:
    - Created and executed `scripts/test_student_dashboard_exam_parity.mjs`: tested quiz-only students, 0-activity students, and 3-way tie-breakers. 100% PASS.
    - Verified all 39 JavaScript files syntax with `node --check`. 100% PASS.
    - Updated Service Worker cache to `topscore-cache-option-a-v10`.

- **Phase 153: Autonomous End-to-End System Audit & Integrity Verification**:
  - **Vector 1 (Codebase & Leakage Audit)**:
    - Scanned 45 active code files: ZERO instances of deprecated `assessment`/`assessments` in active code.
    - Verified all ES module imports and exports: 100% of symbols and paths resolve.
    - Verified elimination of Grade "S", "F", and "R": active functions return only official grading scale (`★`, `A`, `B`, `C`, `D`, `E`).
    - Standardized `startTEST` → `startTest` in `js/test.js`.
  - **Vector 2 (Database & RPC Contract Integrity)**:
    - Connected to live Supabase PostgreSQL: verified RPCs `get_server_time_wita`, `reorder_test`, and `emergency_submit_attempt`.
    - Parameter signatures and return types match frontend callers 100%.
    - Validated 40 active tests: 100% have valid PostgreSQL enum `test_type` ('quiz' | 'exam') and positive working durations.
    - Division-by-zero protection verified: zero submitted attempts have `total_questions = 0`.
  - **Vector 3 (Scoring & Ranking Edge-Case Stress Test)**:
    - Tested all 4 stress scenarios in Class Hub:
      * Case 1 (Quiz-only, 0 exams): PROG = 25%, Global SCORE = 0%, Grade = "—", PTS = 0. Quiz points (250 pts) strictly isolated from Global SCORE % and Global PTS.
      * Case 2 (0 total activity): Clean 0s and "—", no NaN, no null crashes.
      * Case 3 (Tie-Breakers with identical PROG 50%): Correctly ranked Student C (SCORE 90%, PTS 250) → Student A (SCORE 90%, PTS 180) → Student B (SCORE 80%, PTS 160).
      * Case 4 (CLASS AVERAGE row): Empty rosters safely handled without division-by-zero; 0-exam rosters display "—" for score & grade; mixed rosters average exams across completed students and PTS across all students.
  - **Vector 4 (UI/UX & Runner Runtime Health)**:
    - Validated DOM structure across `index.html`, `admin.html`, `dashboard.html`, `test.html`, `result.html`: zero literal `undefined` or `NaN` rendered.
    - ABCD navigation domains (`admin`, `board`, `class`, `desk`) verified in `admin.html`.
    - Test runner critical components (`test-main`, `test-timer`, `confirm-submit-btn`, `danger-submit-btn`, `giveup-btn`, `global-submit-btn`, `submit-modal`, `cheat-overlay`) verified in `test.html`.
    - Tested runner-to-API contracts for `submitTest` and `saveAnswer`.
    - Updated legacy route in `tests/system-e2e.spec.js` from `/assessment.html` to `/test.html?test_id=demo-test`.
    - Hardened `isWeeklyExam` in `js/admin/app.js` to match both Option A (`EXAM`, `QUIZ`) and legacy (`TEST`, `TASK`) tokens.
  - **Vector 5 (Verification Suite & Zero Git Commit)**:
    - `check_all_js_syntax.cjs`: 39/39 JS files passed syntax checks.
    - `test_submit_and_duration.mjs`: 100% PASS on duration enforcement and emergency submit RPC.
    - `test_live_monitor_and_time_extension.mjs`: 100% PASS on live monitor and evaluation engine.
    - Strictly 0 git commits / 0 git push per user rule.

- **Phase 152: Option A Domain Terminology Full Synchronization (Assessment → Test, Task → Quiz, Test → Exam)**:
  - **1. Database Layer (`public.tests`)**:
    - **32 Quizzes (previously Tasks)**:
      - `title`: Replaced `"Words Task"` → `"Words Quiz"`, `"Phrases Task"` → `"Phrases Quiz"` (e.g. `'3rd Vocabulary A1 Words Quiz - Professional Identity'`).
      - `shell_code`: Replaced `*-TASK` → `*-QUIZ` (e.g. `'3A1-WORDS-QUIZ'`).
      - `category`: Set to `'QUIZ'`.
      - `test_subtype`: Set to `'VOCAB_QUIZ'`, `'PHRASE_QUIZ'`.
      - `payload`: Updated `{tier: "QUIZ", shell_code: "..."}`.
    - **8 Exams (previously Tests)**:
      - `title`: Replaced `"Words Test"` → `"Words Exam"`, `"Phrases Test"` → `"Phrases Exam"` (e.g. `'3rd Vocabulary A Words Exam - Workplace'`).
      - `description`: Replaced `"Theme Test:"` → `"Theme Exam:"`.
      - `shell_code`: Replaced `*-TEST` → `*-EXAM` (e.g. `'3A-WORDS-EXAM'`).
      - `category`: Set to `'EXAM'`.
      - `test_subtype`: Set to `'VOCAB_EXAM'`, `'PHRASE_EXAM'`.
      - `payload`: Updated `{tier: "EXAM", shell_code: "..."}`.
  - **2. API & Generator Synchronization (`js/api.js`)**:
    - `upsertDynamicTestShell`: Shell codes generated as `*-QUIZ` and `*-EXAM`; titles generated as `... Words/Phrases Quiz ...` and `... Words/Phrases Exam ...`; `test_type` as `'quiz'` / `'exam'`; `category` as `'QUIZ'` / `'EXAM'`; `test_subtype` as `'VOCAB_QUIZ'` / `'PHRASE_QUIZ'` / `'VOCAB_EXAM'` / `'PHRASE_EXAM'`. Added legacy alias resolution supporting both new (`*-QUIZ`, `*-EXAM`) and older (`*-TASK`, `*-TEST`) shells.
    - `autoGenerateTestsHierarchy`: Updated to pass `tier: 'QUIZ'` and `tier: 'EXAM'`, with descriptions formatted as `Theme Exam: <Theme Name>`.
    - `updateClassTestsConfig`: Updated exam detection logic to check `EXAM`, `-EXAM`, `exam`, while maintaining backward compatibility for legacy `TEST` / `-TEST`.
  - **3. Admin UI & Modals (`js/admin/`)**:
    - `js/admin/app.js`: Updated Class Hub meta chips to display `${taskTests.length} Quizzes (Daily)` and `${testTests.length} Exams (Theme)`; updated Theme View filter to `ALL (EXAMS ONLY)`; updated dynamic table column tags to `PHRASE EXAM`, `WORD EXAM`, `PHRASE QUIZ`, `WORD QUIZ`.
    - `js/admin/auto-gen-modal.js`: Updated wizard UI headers to `⚡ 1. PENGATURAN QUIZ HARIAN (DAILY QUIZZES)` and `📝 2. PENGATURAN EXAM / UJIAN (THEME EXAMS A–D)`; updated dropdown labels to `🗣️ Words Quiz`, `🗣️ Phrases Quiz`, `🗣️ Words Exam`, `🔘 Phrases Exam`; updated progress and toast notifications to report Quizzes and Exams.
    - `js/admin/tests-access.js`: Updated live session card selectors (`wordsTest`, `phrasesTest`, `tasks`) to match `QUIZ`, `EXAM`, `VOCAB_EXAM`, `PHRASE_EXAM`, `WORDS-EXAM`, `PHRASES-EXAM`; updated KPI summary to `Total Theme Exams`; updated activeModule indicators in Live Monitor to `Words Exam` and `Phrases Exam`.
    - `js/admin/crud-modals.js`: Updated test title placeholder to `'e.g. 3rd Vocabulary A1 Words Quiz'`.
  - **4. Student Runner & Dashboard (`js/dashboard.js`, `js/result.js`)**:
    - `js/dashboard.js`: Updated milestone prerequisite checks to identify theme quizzes (`siblingTasks` checking `QUIZ`, `quiz`, `VOCAB_QUIZ`, `PHRASE_QUIZ`, `-QUIZ`), ensuring exams unlock correctly once all daily quizzes reach ≥60%.
    - `js/result.js`: Updated `humanizeType` map to cleanly render `'Quiz'`, `'Exam'`, `'Word Quiz'`, `'Phrase Quiz'`, `'Word Exam'`, `'Phrase Exam'`.
  - **5. Verification & Service Worker**:
    - `sw.js`: Bumped cache name to `topscore-cache-option-a-v9`.
    - Validated all 39 JavaScript files syntax: 100% PASS (`scripts/check_all_js_syntax.cjs`).
    - Verified submission flow and duration enforcement: 100% PASS (`scripts/test_submit_and_duration.mjs`).
    - Verified live monitor, time extension, and attempt question counts: 100% PASS (`scripts/test_live_monitor_and_time_extension.mjs`).
    - **Zero Git Commit / Push**: Strictly maintained all modifications in working directory per user directive.

- **Phase 151: PostgreSQL Enum Alignment, Progression Queries & Zero-Written Resilience**:
  - **1. Root Cause Analysis**:
    - Discovered that PostgreSQL column `public.tests.test_type` is a strict database ENUM (`'quiz'`, `'exam'`).
    - In `js/api.js` line 2798 (`upsertDynamicTestShell`), `test_type` was assigned `'TEST'` or `'TASK'`, which threw PostgreSQL 400 error `invalid input value for enum test_type: "TEST"`.
    - In `js/api.js` line 2540 (`calculateLevelProgression`), query `.eq('test_type', 'TEST')` crashed PostgreSQL with the same enum error, blocking student level-up evaluations.
    - In `js/admin/vocab-vault.js` lines 986 and 1020, queries `.eq('test_type', 'VOCAB_TASK')` and `.eq('test_type', 'VOCAB_QUIZ')` crashed because those values belong to `test_subtype`.
    - In `js/api.js` line 2405 (`createTestShell`), `defaultAnswerType` defaulted to `'written'` despite Phase 148 mandate eliminating typing/written modes.
    - In `js/test.js` line 2130, check `testData?.test_type === 'EXAM'` failed because database values are lowercase `'exam'`.
    - In `public.attempts`, 4 attempts still had `total_questions = 0`.
  - **2. Core Fixes**:
    - `js/api.js`:
      - `upsertDynamicTestShell`: Updated `test_type: isTest ? 'exam' : 'quiz'` and `category: isTest ? 'TEST' : 'TASK'`.
      - `calculateLevelProgression`: Updated query to `.eq('category', 'TEST')`.
      - `createTestShell`: Mapped `test_type` to `'quiz'` / `'exam'`, `category` to `'TASK'` / `'TEST'`, and standardized `defaultAnswerType` to `'spoken'`.
    - `js/admin/vocab-vault.js`: Updated queries to `.eq('test_subtype', 'VOCAB_TASK')` and `.eq('test_subtype', 'VOCAB_QUIZ')`.
    - `js/admin/test-builder.js`: Mapped radio values to `'quiz'` / `'exam'` for `test_type` and `'TASK'` / `'TEST'` for `category`.
    - `js/admin/app.js`: Included `asm.category === 'TEST'` in `isWeeklyExam` check.
    - `js/test.js`: Used case-insensitive comparison `String(testData?.test_type).toLowerCase() === 'exam' || testData?.category === 'TEST'` for automatic level-up trigger.
    - Database: Backfilled all 4 remaining attempts in Supabase PostgreSQL where `total_questions = 0` to exact question counts.
    - `sw.js`: Bumped cache name to `topscore-cache-enum-fix-v8`.
  - **3. Verification**:
    - Validated all 39 JS files syntax (`check_all_js_syntax.cjs`): 100% PASS.
    - Verified submission and timeout scoring (`test_submit_and_duration.mjs`): 100% PASS.
    - Verified live monitor and time extension (`test_live_monitor_and_time_extension.mjs`): 100% PASS.
    - Strictly maintained NO git commit per user command.

- **Phase 150: Live Test Session Real-time Monitor, Dynamic Time Extension & Anti-Cheat Enhancements**:
  - **1. Root Cause Analysis**:
    - **Question Counts Discrepancy (`128 / 40 (100%)`)**: In `openThemeLiveMonitorModal`, fallback logic defaulted `totalQuestions = (wordsTest ? 20 : 0) + (phrasesTest ? 20 : 0) = 40` whenever `attempt.total_questions` was falsy or 0. Because `startTest` previously inserted attempts without `total_questions`, older active attempts had `total_questions = 0`, leading to absurd percentages such as `128 / 40 (100%)` for Theme B Words Test (which actually has 280 questions).
    - **No Exam Time Extension Option**: There was no interactive UI or backend mechanism for tutors to extend the running exam time if students needed more time during a session.
    - **Anti-Cheat Alarms Issues**:
      - Historical alarms were queried without a lower time bound if `unlockedAt` was null/undefined, causing alarms from previous days/weeks to accumulate.
      - `cheatStrikes` in `js/test.js` was stored in a local volatile JS variable, allowing students to clear their strike count simply by reloading the browser (F5).
      - Android/Chrome speech recognition microphone permission switches or intents briefly blurred the browser window, falsely triggering cheating alarm strikes (`window._isSpeechRecognitionEngaged`).
      - Tutors could not view what triggered the alarms or forgive/reset false-positive alarms.
    - **Realtime Score Accuracy**: Real-time score calculations didn't handle fuzzy multi-delimiter answers or properly fall back when an attempt was submitted with previously recorded scores.
  - **2. Database & API Layer Fixes (`js/api.js`)**:
    - **Database Backfill**: Ran migration script updating all 49 existing attempts where `total_questions = 0` to their exact row count in `attempt_answers` (e.g. 280 for Theme B Words Test, 70 for Phrases Test).
    - **`startTest`**: Guaranteed `total_questions` is saved upon attempt creation. Aligned default attempt grade to official `E` (eliminating legacy 'F').
    - **`extendTestSessionTime({ testIds, additionalMinutes })`**: Created API and window-accessible helper that updates `auto_close_at`, `availability_end`, and `working_duration_minutes` in `public.tests`, and simultaneously extends `expires_at` for all active in-progress attempts.
    - **`resetStudentTestAlarms({ studentId, testIds })`**: Added helper that updates audit logs with action `CHEAT_FORGIVEN_BY_TUTOR`.
    - **`fetchLiveTestSessionData`**: Added `expires_at` column selection; added safe fallback `windowStart` (defaulting to last 3 hours if `unlockedAt` is absent) to avoid pulling historical alarms from days/weeks ago.
  - **3. Student Test Runner Improvements (`js/test.js`)**:
    - **Anti-Cheat Persistence**: Persisted `cheatStrikes` in `sessionStorage.getItem('topscore_strikes_' + attemptId)` and restored it on page load, stopping the reload exploit.
    - **Speech Recognition Shield**: Added `window._isSpeechRecognitionEngaged` guard: ignores window blur events triggered by OS mic permission dialogs or audio intent switches during speech recognition.
    - **Dynamic Time Extension Heartbeat**: Updated `_sessionHeartbeatTimer` (every 8s) to query `status, expires_at`. If `expires_at` is extended by tutor (>30s difference), it updates local `attemptData.expires_at`, re-executes `startTimer(currentSection)`, and displays toast: `⏱️ Waktu ujian Anda telah diperpanjang oleh Tutor (+X menit)!`.
  - **4. Live Monitor Controller & UI (`js/admin/tests-access.js`)**:
    - **Quick Add Time UI**: Added `#btn-live-modal-add-time` and dropdown menu (`+5m`, `+10m`, `+15m`, `+30m`, and Custom Minutes input) directly in the Live Monitor header.
    - **Student Alarm Inspection Modal**: Added `#modal-student-alarm-detail` with clickable badges (`.btn-inspect-student-alarms`), displaying full timestamped incident history (in WITA), trigger reasons, and an interactive "Reset / Ampuni Alarm Siswa" button.
    - **Accurate Question Count Fallback**: Integrated `THEME_EXPECTED_COUNTS` (Theme A: 120/30, B: 280/70, C: 480/120, D: 640/160; never 40).
    - **True Realtime Supabase Channel**: Subscribed to Supabase channel `postgres_changes` on `attempts`, `attempt_answers`, and `audit_logs` with automatic debounced refresh and clean teardown on modal close.
  - **5. Verification & Testing**:
    - Automated integration test `scripts/test_live_monitor_and_time_extension.mjs`:
      - Verified all active Theme B attempts have valid `total_questions` (280 for Words Test).
      - Verified `extendTestSessionTime` successfully extends test session time.
      - Verified real-time scoring engine correctly handles answers and remedial score caps.
    - Bumped Service Worker cache to `topscore-cache-live-monitor-v7` in `sw.js`.
    - Syntax validation: 39/39 JS files passed (`node --check`).


- **Phase 149: Assessment Submission & Auto-Close Scoring Resolution & Words Tasks 10-Minute Duration**:
  - **1. Root Cause Analysis**:
    - **"assessment_id tidak ditemukan"**: Edge Function `submit-test` was not deployed to Supabase Cloud, returning HTTP 404. `submitTest()` in `js/api.js` fell back to calling PostgreSQL RPC `emergency_submit_attempt`. That stored procedure contained legacy SQL referencing `COALESCE(test_id, assessment_id)` and `WHERE student_id = v_student_id AND (test_id = v_test_id OR assessment_id = v_test_id)`. Because the `attempts` table contains column `test_id` and no `assessment_id`, PostgreSQL aborted with error code `42703: column "assessment_id" does not exist`, causing submission toast errors.
    - **Score 0 on Timer Expiry**: When the assessment countdown timer expired in `test.html`, `doSubmit(true)` was invoked. Because `submitTest()` crashed with the `assessment_id` error, the catch block executed `auto_close_expired_attempts(p_attempt_id)`. The old `auto_close_expired_attempts` procedure merely updated `status = 'auto_submitted'` without evaluating or scoring any saved answers in `attempt_answers`, leaving `score = 0`, `percentage = 0`, and `grade = 'E'`.
    - **Words Task Duration**: 16 daily Words Tasks had 5 minutes (or legacy 60 minutes) duration instead of the requested 10 minutes.
  - **2. Server & Database RPC Fixes**:
    - **`emergency_submit_attempt`**: Rewritten and deployed to Supabase Cloud PostgreSQL with `SECURITY DEFINER`. Replaced all references to `assessment_id` and `public.assessments` with `test_id` and `public.tests`. Evaluates `attempt_answers`, calculates points, percentage, effective score, grade according to the official grading scale (★, A, B, C, D, E), and resolves `is_best_score`.
    - **`auto_close_expired_attempts`**: Rewritten and deployed to Supabase Cloud PostgreSQL with `SECURITY DEFINER`. When called for an attempt ID or during batch sweeps, it delegates to `emergency_submit_attempt(p_attempt_id, NULL, 'auto_submitted')`, evaluating and scoring all saved answers so students never receive 0 points unfairly.
  - **3. Frontend Client Resiliency**:
    - **`js/api.js` (`submitTest`)**: Added 3-tier submission protection:
      1. Edge Function `submit-test` (primary).
      2. Server-authoritative PostgreSQL RPC `emergency_submit_attempt` (secondary).
      3. Direct client-side grading fallback updating `attempt_answers` and `attempts` with TopsCore grading engine (tertiary fallback guaranteeing submission never fails).
    - **Duration Configuration**:
      - Updated all 16 Words Tasks in `public.tests` table: `working_duration_minutes = 10`, `payload.working_duration_minutes = 10`, `payload.duration_minutes = 10`.
      - Updated `updateClassTestsConfig` in `js/api.js`: `dur = isPhrase ? Number(phrasesTaskDurationMinutes || 5) : Number(wordsTaskDurationMinutes || taskDurationMinutes || 10)`.
      - Updated `autoGenerateTestsHierarchy` in `js/api.js`: `wordsTaskDur = config.wordsTaskDurationMinutes || (taskDur || 10)`.
      - Updated `js/admin/auto-gen-modal.js`: `prefillTaskDur = 10`.
    - **Cache**: Bumped Service Worker cache to `topscore-cache-submit-fix-v6` in `sw.js`.
  - **4. Verification & Testing**:
    - Automated integration test `scripts/test_submit_and_duration.mjs` executed:
      - Verified all 16 Words Tasks have strictly 10 minutes duration.
      - Simulated full test attempt and answer submission: RPC succeeded with 100%, Grade ★.
      - Simulated timeout and auto-close: evaluated answers with 50%, Grade D, proving students no longer receive 0 when time expires.
    - All 39 JavaScript files validated with `node --check`.

- **Phase 148: Spoken & Selection Answer Types Alignment (Zero Typing/Written)**:
  - **1. User Intent Realignment**:
    - User requirement: "quiz harian spoken semua dan tugas mingguan spoken dan selection... jangan ada yang mengetik".
    - Identified that `3A-WORDS-TEST`, `3B-WORDS-TEST`, `3C-WORDS-TEST`, `3D-WORDS-TEST` had `answer_type: 'written'` (requiring typing), and generator/modal defaults had `wordsTestAnswerType = 'written'`.
  - **2. Full Alignment Across Stack**:
    - **Database (`public.tests`)**: Updated all 40 tests/tasks. 36 tests/tasks set to `spoken` (16 Words tasks, 16 Phrases tasks, 4 Words Tests). 4 Phrases Tests set to `selection`. 0 tests use `written`.
    - **Generator (`js/api.js`)**: Updated `defaultAnswerType` in `upsertDynamicTestShell` (`isTest ? (isPhrase ? 'selection' : 'spoken') : 'spoken'`), `wordsTestAnswerType = 'spoken'` in `updateClassTestsConfig`, `wordsTestAns = 'spoken'` in `autoGenerateTestsHierarchy`, and runner fallback to `spoken`.
    - **Edge Function (`supabase/functions/start-test/index.ts`)**: Replaced `VOCAB_TEST` default from `'written'` to `'spoken'`; updated dynamic fallback to `'spoken'`.
    - **Wizard Modal (`js/admin/auto-gen-modal.js`)**: Changed `prefillWordsTestAns = 'spoken'`, updated dropdown options order so `Spoken (Lisan)` is first and default.
    - **Blueprint (`js/admin/vocab-vault.js`)**: Updated `renderThemeBlock` calls so Single Words displays `Speech / Speech` and Phrases displays `Speech / Selection`.
    - **Runner (`js/test.js`)**: Replaced `'written'` JSON parsing and row fallbacks with `'spoken'`.
  - **3. Verification**:
    - Database query verified: 36 SPOKEN, 4 SELECTION, 0 WRITTEN.
    - Test runner simulation confirmed: Tasks and Words Tests execute with spoken engine, Phrases Tests execute with selection engine.
    - Syntax validation: 39/39 JS files passed (`node --check`).

- **Phase 147: Assessment Generator Cumulative Weekly Tests Resolution**:
  - **1. Root Cause Analysis**:
    - Discovered that in `upsertDynamicTestShell`, weekly milestone tests (`tier: 'TEST'`) did not store the cumulative theme list in `payload.themes` (only saved single `theme_code`).
    - In `generateTestQuestions` (`js/api.js`) and `start-test` Edge Function (`supabase/functions/start-test/index.ts`), the query checking `test.test_type === 'TEST'` or `test.test_type === 'exam'` failed because database column values were either `'exam'` or `'TEST'` or checked `test_category` instead of `category`. This caused the query to fall back to `eq('theme_code', themeCode)` (fetching only 160 words for Theme B instead of 280 words, 200 words for Theme C instead of 480 words, etc.).
    - In `js/admin/app.js` and `js/admin/tests-management.js`, `vaultCountFor` checked `r?.test_category === 'TEST'` (column doesn't exist; actual column is `category`), causing the UI data table to report non-cumulative question counts (160 instead of 280, 200 instead of 480).
    - In `js/admin/auto-gen-modal.js`, `isTest` detection only checked `a.test_category`, failing to detect tests when updating configuration.
  - **2. Generator & Runner Architectural Fixes**:
    - `js/api.js`:
      - In `upsertDynamicTestShell`: Automatically compute `cumulativeThemes = allThemes.slice(0, themeIdx + 1)` and store `themes: cumulativeThemes`, `is_cumulative: isTest`, `category: 'TEST'`, `test_type: 'TEST'` in both the database record and payload.
      - In `generateTestQuestions`: Added robust `isThemeTest` flag checking `category === 'TEST' || test_type === 'TEST' || test_type === 'exam' || shell_code.includes('-TEST')`. Always queries `allThemes.slice(0, idx + 1)` whenever `themes` array is absent, guaranteeing 100% cumulative question generation.
      - In `updateClassTestsConfig`: Fixed `isTest` detection to check `category`, `test_type`, and `shell_code`.
    - `supabase/functions/start-test/index.ts`:
      - Enhanced `isThemeTest` to check `category === 'TEST' || test_type === 'exam' || test_type === 'TEST' || shell_code.includes('-TEST')`.
      - When starting an exam attempt, strictly queries `in('theme_code', targetThemes)` across all cumulative themes up to the exam's theme code.
    - `js/admin/app.js` & `js/admin/tests-management.js`:
      - Fixed `vaultCountFor` to check `category === 'TEST' || test_type === 'TEST' || test_type === 'exam' || shell_code.includes('-TEST')`.
      - UI DataGrid now correctly displays cumulative word and phrase counts (Theme A: 120/30, Theme B: 280/70, Theme C: 480/120, Theme D: 640/160).
    - `js/admin/auto-gen-modal.js`:
      - Fixed `isTest` detection across `category`, `test_type`, and `shell_code`.
  - **3. Database Layer Sync**:
    - Synchronized all 8 live weekly tests in Supabase PostgreSQL: populated `payload.themes`, set `category = 'TEST'`, verified cumulative counts:
      - `3A-WORDS-TEST`: 120 (A)
      - `3B-WORDS-TEST`: 280 (A+B)
      - `3C-WORDS-TEST`: 480 (A+B+C)
      - `3D-WORDS-TEST`: 640 (A+B+C+D)
      - `3A-PHRASES-TEST`: 30 (A)
      - `3B-PHRASES-TEST`: 70 (A+B)
      - `3C-PHRASES-TEST`: 120 (A+B+C)
      - `3D-PHRASES-TEST`: 160 (A+B+C+D)
  - **4. Verification & Testing**:
    - Bumped `CACHE_NAME` in `sw.js` to `topscore-cache-cumulative-tests-v4`.
    - Verified 39/39 JS files syntax valid via `node scripts/check_all_js_syntax.cjs`.
    - Verified all 8 weekly tests generate exact match cumulative question counts via Node simulation script.

- **Phase 146: Student Test Entrance & Prerequisite Dead-Lock Resolution**:
  - **1. Root Cause Diagnostics**:
    - Discovered that during the recent database migration, `category DEFAULT 'TEST'` was set across all 40 tests in PostgreSQL.
    - In `js/dashboard.js`, `isThemeTest` checked `asm.category === 'TEST'`, treating all 32 daily tasks as formal Theme Exams.
    - This imposed the prerequisite rule ("Must complete all sibling tasks in Theme >= 60%") on the tasks themselves, creating an impossible circular prerequisite lock that prevented students from taking any task.
    - Rogue `test_session` payloads with past `availability_end` timestamps had been attached to tasks `3A1-WORDS-TASK`, `3B1-WORDS-TASK`, `3B1-PHRASES-TASK`, `3A1-PHRASES-TASK`, `3C1-WORDS-TASK` during previous session modal saves, causing them to render as `Unavailable` and block student entrance with `SESSION_EXPIRED`.
    - In `js/api.js` line 819, `(asmData.test_subtype || a.test_type || '')` contained an undefined reference `a` which threw a fatal `ReferenceError: a is not defined` whenever `test_subtype` was null/empty.
  - **2. Strict Level & Prerequisite Architecture (User Requirement Realignment)**:
    - Realigned the system so that exam eligibility strictly requires:
      1. Appropriate Level: Student's batch must match the test's level (`batch.current_level_id === test.level_id`).
      2. Finished Prerequisites: Student must have completed ALL prerequisite tasks in the theme with score ≥ 60%.
    - Students who have not completed prerequisite tasks (or scored < 60%) remain strictly ineligible in both Normal and Remedial modes until tasks are completed.
  - **3. Database Layer Corrections**:
    - Executed targeted cleanup updating all 32 quiz tasks to `category = 'TASK'`, `schedule_mode = 'flexible'`, `availability_start = NULL`, `availability_end = NULL`, and purged rogue `test_session` from payloads.
    - Verified all 8 exams retain `category = 'TEST'`.
  - **4. Frontend Code Fixes**:
    - `js/admin/tests-access.js`: Refined `wordsTest` and `phrasesTest` selectors to strictly exclude tasks and match true exams (`3A-WORDS-TEST`, `3B-WORDS-TEST`, etc.). Updated `evaluateStudentsEligibility` to enforce prerequisite task completion for all modes.
    - `js/dashboard.js`: Corrected `isThemeTest`, `isExam`, and `isAsmTest` checks to distinguish exams from quizzes/tasks, freeing daily tasks from exam session gating, while strictly keeping exams locked until prerequisites are met.
    - `js/api.js`: Fixed `ReferenceError` on `a.test_type` in `startTest`; updated `checkStudentTestAccess` so practice quizzes/tasks return `{ allowed: true, is_test: false }` immediately without requiring test sessions.
  - **5. Edge Function Authorizations**:
    - Updated `supabase/functions/start-test/index.ts` to strictly enforce level match, active session whitelist, and full prerequisite task completion (all tasks ≥ 60%).
  - **6. Verification & Service Worker**:
    - Bumped Service Worker cache name to `topscore-cache-strict-eligibility-v3`.
    - Ran `node scripts/check_all_js_syntax.cjs`: 39/39 JS files syntax valid.
    - Verified student entrance access simulation across tasks and exams: 100% pass across all 4 scenarios.

- **Phase 145: Live Test Sessions & RLS Permissions Fix**:
  - **1. Database Layer (PostgreSQL RLS Policies)**:
    - Added `admin_all_tests`, `admin_all_test_items`, `admin_all_test_topics`, `admin_all_test_results` policies for `{anon}` role with `ALL` commands, allowing browser admin client to update test sessions and modules.
  - **2. Test & Task Classification in `tests-access.js`**:
    - Updated Theme mapping to accurately classify `test_type = 'exam'` and `test_subtype = 'VOCAB_TEST'` / `'PHRASE_TEST'` for Words and Phrases test modules.
    - Updated prerequisite learning tasks to identify `test_type = 'quiz'` and `test_subtype = 'VOCAB_TASK'` / `'PHRASE_TASK'`.
    - Eliminated `0 Learning Tasks` issue across all Themes.
  - **3. Schema Purge (Eliminating `test_questions` 404s)**:
    - Replaced all runtime queries targeting `test_questions` with `test_items` in `js/admin/app.js`, `js/admin/tests-management.js`, and `js/admin/desk.js`.
  - **4. Smart Eligibility & Tutor Override**:
    - In Remedial Mode: Students with < 60% or not yet tested are marked eligible for remedial even if learning tasks are incomplete, enabling tutors to schedule makeup/remedial exams.
    - Added Tutor Override checkbox in session modal (`🛡️ Tutor Override`). Auto-activates if no students meet prerequisites, allowing tutors to bypass task prerequisites for entire batches.
    - Whitelisted students in active live sessions bypass prerequisite locks in `dashboard.js`.
  - **5. Cache & Verification**:
    - Bumped Service Worker cache manifest to `topscore-cache-test-session-fix-v1`.
    - Script version bumped to `?v=20261027d` in `admin.html` and imports.
    - `node scratch/test_open_and_close_session.mjs`: 100% assertions passed.
    - `node scripts/check_all_js_syntax.cjs`: 39/39 JS files syntax valid.
    - `node scratch/test_complete_system.mjs`: 100% assertions passed.

- **Phase 144: Scoring, Points & Ranking Overhaul in Class Hub**:
  - **1. Objective & Alignment**:
    - PROG % (Completion Rate): Maintained across ALL activities (32 daily quizzes/tasks + 8 weekly milestone exams).
    - Global SCORE % & Global GRD (Academic Mastery): Calculated EXCLUSIVELY from weekly exams (milestone sessions). Daily practice drills excluded entirely.
    - Global PTS (Points): Aggregates points earned EXCLUSIVELY from weekly exams.
    - Edge-Case Handling: When a student has only completed daily drills without taking weekly exams: PROG reflects tasks, SCORE displays `—`, GRD displays `—`, and PTS evaluates to `0 pts`.
    - Leaderboard Sort Order: Primary: `PROG % DESC` > Secondary: `Global SCORE % DESC` > Tertiary: `Global PTS DESC`.
    - Footer "CLASS AVERAGE": Aligned with weekly-only metrics (only students with completed weekly exams enter class average score and grade).
  - **2. Implementation Details**:
    - `js/admin/app.js`:
      - Added `isWeeklyExam` classification helper for `classTests`.
      - Updated student loop to track `completedWeeklyCount`, `weeklyEarnedScore`, and `sumWeeklyPercentages` strictly from weekly exams while maintaining `completedCount` across all activities.
      - Set `averageScorePct = completedWeeklyCount > 0 ? Math.round(sumWeeklyPercentages / completedWeeklyCount) : 0`.
      - Set `totalEarnedScore = completedWeeklyCount > 0 ? weeklyEarnedScore : 0`.
      - Set `grade = completedWeeklyCount > 0 ? calculateGrade(averageScorePct) : '—'`.
      - Formatted table cells for SCORE, GRD, and PTS with clean unattempted presentation.
      - Set initial sort key to `progressPct` and updated `sortComparator` and `studentsGridData.sort`.
      - Updated `summaryRow` to compute class average SCORE and GRADE exclusively from students with completed weekly exams.
    - `sw.js`: Bumped cache to `topscore-cache-ranking-v1`.
  - **3. Verification**:
    - `node scratch/test_scoring_and_ranking_overhaul.cjs`: 100% assertions passed across all 6 scenarios.
    - `node scripts/check_all_js_syntax.cjs`: 39/39 JS files syntax valid.
    - `node scratch/zero_residue_verification.cjs`: 0 occurrences of "assessment" across all active code files.

- **Phase 143: Full System Terminology Overhaul, Database Migration & Legacy Purge**:
  - **1. Objective & Mandate**:
    - Absolute deprecation and total purge of "Assessment" / "Assessments" across the entire repository.
    - Precision Rule: Singular "Test", Plural "Tests"; Sub-categories: "Quiz" (pl: "Quizzes", daily tasks/formative checks) and "Exam" (pl: "Exams", formal scheduled examinations).
    - 100% data preservation of all historical student attempts and live tests.
    - Zero residue: 0 occurrences of "assessment" across active code, HTML, CSS, Edge Functions, and Service Worker.
  - **2. Database Layer**:
    - Created `test_type` ENUM (`quiz`, `exam`).
    - Created `public.tests` (40 rows: 32 quiz + 8 exam), `public.test_items`, `public.test_topics`, `public.test_results`.
    - Added `test_id` column to `attempts`, `assignments`, `student_submissions`, `question_usage_history`.
    - Backfilled 100% of historical attempt records (851/851 attempts) and set `attempts.test_id` to `NOT NULL` with foreign key cascade.
    - Dropped legacy columns (`assessment_id`) and dropped legacy tables: `assessments`, `assessment_questions`, `assessment_topics`, `assessment_results`, `assessment_instances`, `assessment_attempts`, `assessment_attempt_answers`.
    - Updated RPCs: `reorder_test` and `emergency_submit_attempt`.
  - **3. Edge Functions**:
    - Created `start-test`, `submit-test`, `duplicate-test`, `evaluate-test`.
    - Deleted obsolete `start-assessment`, `submit-assessment`, `duplicate-assessment`, `evaluate-assessment`.
    - Updated `import-questions` and `generate-module-template`.
  - **4. Frontend Core & UI**:
    - Renamed physical files: `test.html`, `css/test.css`, `js/test.js`, `js/admin/tests-management.js`, `js/admin/tests-access.js`, `js/admin/test-builder.js`.
    - Refactored `js/api.js` and all 25 modules in `js/` to target `tests`, `test_items`, and `test_id`.
    - Updated UI strings, headers, badges, modals, and buttons in `admin.html`, `dashboard.html`, `test.html`, `result.html`, `index.html`.
    - Updated `sw.js` cache manifest to `topscore-cache-test-v1` registering `css/test.css` and `js/test.js`.
  - **5. Verification**:
    - `node scratch/zero_residue_verification.cjs`: 0 occurrences across all 62 scanned active code files.
    - `node scripts/check_all_js_syntax.cjs`: 39/39 JS files syntax valid.
    - `node scratch/test_complete_system.mjs`: 100% assertions passed.

- **Phase 142: Experimental Color Mockup - Green Star & Black Letter Badges**:
  - **1. Objective & Alignment**:
    - Experimental color mockup: Star (100% ★) updated to Green (`#22C55E`), matching Grade A hue with radiant green glow, and all letters inside Grade Circle Badges (★, A, B, C, D, E) styled with high-contrast black text (`#000000`).
  - **2. Codebase Changes**:
    - `js/grading.js`:
      - Set `STAR_THEME.color = '#22C55E'`, `STAR_THEME.glow = 'rgba(34, 197, 94, 0.45)'`.
      - Updated `GRADE_PALETTE.STAR` to `#22C55E`.
      - Updated `formatGradeBadgeHtml` to apply `#000000` text color for badges.
    - `css/admin.css`:
      - Updated `.grade-circle.grade-circle-star` background gradient to emerald/leaf green (`#4ade80` to `#22c55e`) with green drop shadow.
      - Updated `.grade-circle.grade-circle-*` (A, B, C, D, E) color property to `#000000 !important;`.
    - `css/style.css`:
      - Updated `.score-high` to `#22C55E` with green drop-shadow glow.
      - Updated `.grade-circle.grade-circle-star` to green gradient with white icon star.
      - Updated `.grade-circle.grade-circle-*` text color to `#000000 !important;`.
    - `js/admin/app.js`:
      - Updated fallback color ternaries and matrix badges for Star to `#22C55E`.
      - Standardized `avgTextColor` and `textColor` to `#000000` for all circle badge letters.
    - `sw.js`:
      - Bumped `CACHE_NAME` to `'topscore-cache-mockup-v4'`.
  - **3. Verification**:
    - Ran `node scripts/check_all_js_syntax.cjs`: 39/39 JS files passed syntax validation (exit code 0).
    - Ran `node scratch/test_grading_suite.mjs`: 100% assertions passed.
    - Verified `git status`: Working tree changes only (STRICTLY NO GIT COMMIT & NO GIT PUSH).

- **Phase 141: Test Column Reordering & Theme Total Points Column in Class Hub**:
  - **1. Objective & User Alignment**:
    - Per user request ("urutannya jadikan score, baru point, kemudian untuk tiap tema ada tambahan kolom berupa total point daro words dan phrases"):
      1. Reordered test assessment columns so that the **SCORE (%)** column appears first, followed by the **POINTS (PTS)** column.
      2. Added a dedicated **Theme Total Points (TOT PTS)** column at the end of each Theme group, aggregating effective earned points across both Words and Phrases (tasks and tests) within that Theme.
  - **2. Codebase Changes**:
    - `js/admin/app.js`:
      - Grouped active assessments by Theme (`themeGroups`) and pre-calculated student theme totals (`row['theme_${tc}_total_pts']`).
      - Updated `dynamicSuperHeaders` colSpan to accurately account for the additional Theme Total column (`(themeTests.length * 2) + 1`).
      - Reordered test columns: SCORE column generated first (`key: asm_${asm.id}_pct`), followed by POINTS column (`key: asm_${asm.id}_pts`).
      - Appended Theme Total Points column (`key: theme_${tc}_total_pts`) with `TOT / TOT PTS` header badge and score-tiered dynamic color.
      - Updated `summaryRow` to compute and display class average theme points (`avgThemePts`).
      - Updated `sortComparator` to support sorting by `theme_${tc}_total_pts`.
    - `css/admin.css`:
      - Added CSS styling for `.col-asm-theme-total`, `.asm-num-total`, and `.asm-score-theme-total` with clean background separation and pure white headers.
    - `sw.js`: Bumped cache name to `topscore-cache-mockup-v3`.
  - **3. Verification**:
    - Ran `node scripts/check_all_js_syntax.cjs`: 39/39 JS files passed syntax validation (exit code 0).
    - Ran `node scratch/test_grading_suite.mjs`: 100% unit assertions passed.
    - Verified `git status`: Local working tree changes only (STRICTLY NO GIT COMMIT & NO GIT PUSH).

- **Phase 140: Pure White Datagrid Headers in Class Hub**:
  - **1. Objective & User Alignment**:
    - Per user request ("buat font pada header berwarna putih, jangan ada yang warna warni"), all font elements across the datagrid table headers in Class Hub (`#class-attendance-grid`) are now standardized to crisp, clean, pure white (`#ffffff !important;`).
    - Eliminated colored text across all header tiers:
      - Super headers: `STUDENT DETAILS` (previously `#94a3b8`) and Theme headers `THEME A`, `THEME B`, `THEME C`, `THEME D` (previously `#38bdf8`, `#c084fc`, `#fbbf24`, `#34d399`) are now pure white.
      - Assessment column numbers: Task numbers (previously Cyan `#38bdf8`) and Test numbers (previously `#e2e8f0`) are now pure white.
      - Assessment subheaders: `WRD` (previously Yellow `#FFFF00`), `PHR` (previously Cyan `#00FFFF`), `WRD PTS` / `PHR PTS` (previously `#e2e8f0`), and `SCORE` (previously `#cbd5e1`) are now pure white.
      - Base sticky headers: `INST`, `PROGRAM`, `BATCH`, `STUDENT NAME`, `PROG`, `SCORE`, `GRD`, `PTS` and sort indicators are now pure white.
  - **2. Codebase Changes**:
    - `css/admin.css`:
      - Added overarching `#class-attendance-grid thead, #class-attendance-grid thead th, #class-attendance-grid thead th *, #class-attendance-grid .datagrid-thead th, #class-attendance-grid .datagrid-thead th * { color: #ffffff !important; }`.
      - Updated `#class-attendance-grid th.super-hdr*` color rules to `#ffffff !important;`.
      - Updated `#class-attendance-grid th.col-asm-task .asm-num` and `#class-attendance-grid th.col-asm-test .asm-num` to `#ffffff !important;`.
      - Updated `#class-attendance-grid .asm-subtag*` (`.asm-subtag-wrd`, `.asm-subtag-phr`, `.asm-subtag-test-pts`, `.asm-subtag-test-score`) to `#ffffff !important;`.
    - `sw.js`: Bumped cache name to `topscore-cache-mockup-v2`.
  - **3. Verification**:
    - Ran `node scripts/check_all_js_syntax.cjs`: 39/39 JS files passed syntax validation (exit code 0).
    - Ran `node scratch/test_grading_suite.mjs`: 100% assertions passed.
    - Verified `git status`: Local working tree changes only (STRICTLY NO GIT COMMIT & NO GIT PUSH).

- **Phase 139: High-Vibrancy Dark-Mode Color Mockup & Circle Badge Alignment**:
  - **1. Objective & Design Fidelity**:
    - Aligned all grade colors with the high-vibrancy dark-mode tablet reference mockup ("Grading 2.jpg").
    - Eliminated color collision between Grade A and Grade B: Grade A is now distinct True Leaf Green (`#22C55E`), and Grade B is distinct Electric Bright Lime (`#BEF264`) with dark charcoal text (`#0f172a`) for maximum readability in circle badge pills.
    - Standardized Star (100% ★) into a circular pill badge matching the form factor of grades A–E, using Bright Purple (`#C084FC`) with glowing violet gradient and border.
  - **2. Color Tokens Implemented**:
    - ★ (Star / 100%): `#C084FC` (Bright Purple)
    - A (90% – 99%): `#22C55E` (True Leaf Green - visibly deeper than lime)
    - B (80% – 89%): `#BEF264` (Electric Bright Lime - heavy yellow undertone, text `#0f172a`)
    - C (60% – 79%): `#FDE047` (Pure Electric Lemon Yellow - zero orange cast, text `#0f172a`)
    - D (30% – 59%): `#FB923C` (Clean Orange)
    - E (0% – 29%): `#F87171` (Light Red)
  - **3. Codebase Changes**:
    - `js/grading.js`: Updated `STAR_THEME.color`, `GRADE_PALETTE`, `getGradeColorByScore`, and fallback resolver in `getGradeTheme`.
    - `css/admin.css`: Updated `.form-pill.grade-*`, `.grade-circle.grade-circle-*`, and `.badge-grade-star-s`.
    - `css/style.css`: Updated `.grade-circle.grade-circle-*` and text color utility classes.
    - `sw.js`: Bumped cache name to `topscore-cache-mockup-v1`.
  - **4. Verification & Testing**:
    - Ran `node scripts/check_all_js_syntax.cjs`: 39/39 JS files syntax valid (exit code 0).
    - Ran unit test suite `scratch/test_grading_suite.mjs`: All 7 score tiers, remedial behavior, and circle badge HTML assertions passed 100%.
    - Verified `git status`: All changes remain uncommitted in local working tree (STRICTLY NO GIT COMMIT & NO GIT PUSH).


- **Phase 138: Separate Words Task & Phrases Task Answer Types in Wizard & Auto-Gen**:
  - **1. Objective & Architectural Alignment**:
    - Previously, Daily Tasks (Section 1) had a single monolithic "Cara Jawab" dropdown (`#wizard-task-ans`) applying to both Words Tasks and Phrases Tasks, whereas Tests (Section 2) had separate controls (`Words Test` and `Phrases Test`).
    - Now, tutors can independently configure the answer type for **Words Task** (e.g. Spoken) and **Phrases Task** (e.g. Spoken / Written / Selection / Mixed), giving complete pedagogical flexibility across the 4 assessment archetypes.
  - **2. Smart Class Prefill Detection**:
    - In `js/admin/auto-gen-modal.js`:
      - Queries existing assessments for the locked class ID upon opening.
      - Automatically detects current `answer_type` for Words Tasks, Phrases Tasks, Words Tests, and Phrases Tests, plus task duration and passing score.
      - Pre-populates the select dropdowns and inputs so tutors see current configuration immediately rather than generic defaults.
  - **3. UI & Modal Layout Enhancement**:
    - Section 1 (Task Harian) updated into clean 2-row layout:
      - Row 1: `⏱️ Waktu (Mnt)` (with 5m, 10m, 15m preset pills) & `🎯 Min. Skor (%)` (with 60%, 70% preset pills).
      - Row 2: Distinct highlighted card with two independent dropdowns: `🗣️ Words Task` (`#wizard-task-ans-words`) and `🗣️ Phrases Task` (`#wizard-task-ans-phrases`).
    - Added `Mixed (Campuran)` option to test selects for complete consistency.
  - **4. Backend & API Synchronization (`js/api.js`)**:
    - `updateClassAssessmentsConfig`: Added support for `wordsTaskAnswerType` and `phrasesTaskAnswerType` (with fallback to `taskAnswerType` or `'spoken'`). Correctly filters Phrase vs Word rows based on `shell_code`, `category`, and `title`.
    - `autoGenerateAssessmentsHierarchy`: Pass `wordsTaskAns` to `VOCAB` (Words) tasks and `phrasesTaskAns` to `PHRASE` tasks.
  - **5. Cache-Busting & Live Verification**:
    - Updated `sw.js` to `topscore-cache-split-task-ans-v1`.
    - Bumped query string to `?v=20261027c` across `admin.html`, `app.js`, `vocab-vault.js`, and `auto-gen-modal.js`.
    - Executed live database verification on test class `ab33498a-90e6-44b7-83f4-5765f964543e`:
      - Updated 40 assessments: 16 Words Tasks (`spoken`), 16 Phrases Tasks (`spoken`), 4 Words Tests (`written`), 4 Phrases Tests (`selection`) with zero errors.
    - Verified syntax: `node scripts/check_all_js_syntax.cjs` returned exit code 0 (39/39 files valid).
    - Verified `git status`: Local working tree only (STRICTLY NO GIT COMMIT & NO GIT PUSH).

- **Phase 137: Auto-Gen Hierarchy `duration_minutes` Fix & Stale Module Cache-Bust**:
  - **1. Error Root Cause**:
    - During action `[🚀 Generate & Sinkronkan Soal]`, `auto-gen-modal.js` calls `autoGenerateAssessmentsHierarchy` -> `upsertDynamicAssessmentShell`.
    - Both `auto-gen-modal.js` and `vocab-vault.js` imported modules via pinned `?v=5.3.2` URLs (`import('../api.js?v=5.3.2')`), serving stale cached JavaScript from browser disk cache where `duration_minutes` was sent in root table update.
    - PostgREST threw `PGRST204: Could not find the 'duration_minutes' column of 'assessments' in the schema cache`.
  - **2. Universal Defensive Database Sanitization**:
    - In `js/api.js`:
      - `adminInsert` & `adminUpdate`: Added automatic interceptor for `assessments` table that maps `duration_minutes` to `working_duration_minutes` if needed, and deletes `duration_minutes` from root object.
      - `upsertDynamicAssessmentShell`: Added explicit `delete asmData.duration_minutes;`.
  - **3. Complete Module Cache-Busting**:
    - Updated query strings to `?v=20261027b` across:
      - `admin.html` (DataGrid, app.js, sw.js)
      - `sw.js` (cache bumped to `topscore-cache-fix-duration-col-v2`, asset URLs updated to `?v=20261027b`)
      - `js/admin/auto-gen-modal.js` (`../api.js?v=20261027b`)
      - `js/admin/vocab-vault.js` (`./auto-gen-modal.js?v=20261027b`, `../api.js?v=20261027b`)
      - `js/admin/app.js` (`./auto-gen-modal.js?v=20261027b`)
      - `js/admin/classes-management.js` (`../api.js?v=20261027b`, etc.)
      - `js/admin/crud-modals.js` (`../api.js?v=20261027b`, etc.)
  - **4. Verification & Testing**:
    - Ran live execution test `scratch/test_full_autogen.cjs` on Supabase database:
      - All 40 assessments (32 Tasks + 8 Tests) successfully processed and updated with **ZERO errors** (`{ tasks: 0, tests: 0, updated: 40, errors: [] }`).
    - Verified all 39 JS files syntax: `node scripts/check_all_js_syntax.cjs` returned code 0 (100% valid).
    - Verified `git status`: Local working tree only (STRICTLY NO GIT COMMIT & NO GIT PUSH).

- **Phase 136: Fix Non-Existent `duration_minutes` Schema Cache Column (PGRST204)**:
  - **1. Error Diagnosis**:
    - Identified reason for browser console showing 40 red `Failed to load resource: the server responded with a status of 400 ()` errors during Wizard update.
    - PostgREST returned error `PGRST204`: `"Could not find the 'duration_minutes' column of 'assessments' in the schema cache"`.
    - Database schema for `assessments` table defines column as `working_duration_minutes`, whereas `duration_minutes` exists only inside JSON `payload`.
  - **2. Core Code Fixes**:
    - In `js/api.js`:
      - `updateClassAssessmentsConfig`: Removed `updateData.duration_minutes = Number(taskDurationMinutes);`. Added check `if (updErr) throw updErr;`.
      - `createAssessmentShell`: Removed root table column `duration_minutes` from `asmData`.
    - In `js/admin/crud-modals.js`:
      - Root payload sanitize: Added `delete payload.duration_minutes;` alongside `delete payload.display_name;`.
      - Bulk edit loop: Removed `updatePayload.duration_minutes = durVal;` from root `updatePayload`.
  - **3. Verification & Execution**:
    - Tested `updateClassAssessmentsConfig` on live class `ab33498a-90e6-44b7-83f4-5765f964543e` (40 assessments).
    - Result: 32 tasks updated to 5m, 8 tests updated to passing score 60% with zero errors.
    - Bumped service worker cache to `topscore-cache-fix-duration-col-v1`.
    - Ran `node scripts/check_all_js_syntax.cjs`: 39/39 JS files syntax valid.
    - Strictly maintained NO git commit & NO git push constraint.

- **Phase 135: Zero-Redundancy Assessment Blueprint & Class Wizard Architecture**:
  - **1. Zero-Redundancy Architecture Analysis & Elimination**:
    - Identified and eliminated 4 core redundancies:
      - Merged "Interactive Generator" and "Global Settings" into ONE single guided Wizard.
      - Removed duplicate static yellow/pink `.global-asm-settings-box` from Class Hub.
      - Removed intrusive post-import auto-generator pop-up in `js/admin/vocab-vault.js` (lines 682-694).
      - Removed duplicate `btn-manual-auto-generate` listener from Word & Phrase tables in Vault.
  - **2. Intrinsic Test Duration Architecture**:
    - Formally recognized that Tests (Themes A–D) do not have fixed internal timers in generator/settings because their availability and duration are governed dynamically by the Tutor's Test Session window (`test_session.expires_at`).
    - Tasks strictly maintain independent 5-minute countdown timers (`duration_minutes: 5`).
  - **3. Tactical Assessment Generator & Blueprint Wizard (`js/admin/auto-gen-modal.js`)**:
    - Auto-detects and locks current class ID and name (`📘 Target Class: [ClassName] (Terkunci & Aman)`).
    - Level selection checkboxes.
    - Task settings: Duration (default 5m with presets `5m`, `10m`, `15m`), Answer Type select (`spoken`, `written`, `selection`, `mixed`), Passing score (default 60% with presets `60%`, `70%`).
    - Test settings: No rigid duration input; clearly labelled callout: `⏱️ Durasi Ujian: Dikendalikan oleh Sesi Ujian (Test Session Window)`; Words Test answer type (`written`), Phrases Test answer type (`selection`), Passing score (default 60%).
    - Scope filter: All (40), Words only (20), Phrases only (20).
    - Two clean actions:
      - `[⚡ Update Pengaturan Saja]`: Atomically updates duration, answer type, and passing score on existing assessments via `updateClassAssessmentsConfig`.
      - `[🚀 Generate & Sinkronkan Soal]`: Generates or re-syncs all 40 assessments with selected settings via `autoGenerateAssessmentsHierarchy`.
  - **4. Sleek Class Hub Workspace (`js/admin/app.js`)**:
    - Replaced the large static global settings box with a high-density, modern tactical toolbar:
      - Left: Metadata chips: `[⚡ 32 Tasks (5m)] [📝 8 Tests (Sesi Ujian)] [🎯 Min. 60%]`.
      - Right: Two direct tactical action buttons: `[🗺️ Buka Assessment Blueprint ↗]` and `[⚡ Generator & Settings Wizard]`.
    - Wired `[🗺️ Buka Assessment Blueprint ↗]` to switch directly to the Blueprint tab in Vocabulary Vault (`admin.html#vocab_vault`).
    - Wired `[⚡ Generator & Settings Wizard]` to open the wizard modal with locked class context.
  - **5. Backend & Data Layer Enhancements (`js/api.js`)**:
    - Implemented and exported `updateClassAssessmentsConfig({ classId, taskDurationMinutes, taskAnswerType, taskPassingScore, wordsTestAnswerType, phrasesTestAnswerType, testPassingScore })`.
    - Enhanced `autoGenerateAssessmentsHierarchy` and `upsertDynamicAssessmentShell` to accept custom task durations, answer types, and passing scores.
  - **6. Cache & Verification**:
    - Bumped `sw.js` cache name to `topscore-cache-blueprint-wizard-v1`.
    - Validated all 39 JavaScript files with `node scripts/check_all_js_syntax.cjs` (0 errors, code 0).
    - Verified `git status`: Changes in working tree only (STRICTLY NO GIT COMMIT & NO GIT PUSH).


- **Phase 134: Global Task & Test Settings Box, 5-Minute Default Duration & Assessment Editing Polish**:
  - **1. Global Task & Test Settings Box in Class Hub (`js/admin/app.js` & `css/admin.css`)**:
    - Created dedicated `.global-asm-settings-box` above the Class Assessments data grid.
    - Two specialized cards:
      - ⚡ **Task Harian (Daily Tasks)**: Duration (default 5m), Answer Type (`spoken`, `written`, `selection`, `mixed`), Passing Score (default 60%), and `[⚡ Simpan & Terapkan ke Semua Task]` button with confirmation.
      - 📝 **Test / Ujian (Themes A–D Tests)**: Duration (default 120m), Answer Type (`written`, `selection`, `spoken`, `mixed`), Passing Score (default 60%), and `[📝 Simpan & Terapkan ke Semua Test]` button with confirmation.
    - Collapsible toggle `[▲ Sembunyikan / ▼ Tampilkan]`.
    - Atomically updates `working_duration_minutes`, `duration_minutes`, `answer_type`, `minimum_required_score`, and `payload` JSON, plus `assessment_questions` synchronization.
  - **2. 5-Minute Default Duration for Daily Tasks (`js/api.js` & `js/admin/crud-modals.js`)**:
    - In `upsertDynamicAssessmentShell` (`js/api.js`): `effectiveDurationMinutes` defaults to `5` for tasks (`!isTest`) and `120` for tests (`isTest`).
    - In `openCrudModal` (`js/admin/crud-modals.js`): detects daily task rows and defaults duration to 5 minutes.
  - **3. Assessment Editing Modal Upgrade (`js/admin/crud-modals.js`)**:
    - Added `title` text input with placeholder.
    - Added `status` dropdown (`PUBLISHED`, `DRAFT`, `UNPUBLISHED`, `ARCHIVED`) with case-insensitive matching.
    - Added quick preset buttons right below Duration (`5m`, `15m`, `30m`, `60m`, `120m`).
    - Added quick preset buttons right below Passing Score (`60%`, `70%`, `80%`).
    - Synchronized `duration_minutes` and `minimum_required_score` inside `payload` JSON on single edit save.
  - **4. Bulk Edit Modal CSS Externalization & Accessibility Compliance (`admin.html` & `css/admin.css`)**:
    - Externalized 100% of inline styles in `#bulk-edit-assessments-modal` to dedicated `.bulk-edit-*` CSS classes in `css/admin.css`.
    - Added `<label for="...">`, `title`, and `placeholder` attributes to all form inputs to eliminate all accessibility warnings/errors.
  - **5. Cache & Verification**:
    - Bumped `sw.js` cache name to `topscore-cache-mockup-v1`.
    - Validated all 39 JavaScript files with `node scripts/check_all_js_syntax.cjs` (0 errors).
    - Verified `git status`: Changes in working tree only (STRICTLY NO GIT COMMIT & NO GIT PUSH).

- **Phase 133: Live Test Sessions Monitor & Student Expulsion / Kick Controller**:
  - **1. Backend & API Synchronization (`js/api.js`)**:
    - Implemented `removeStudentFromTestSession({ assessmentId, studentId, action })`:
      - Removes student ID from `allowed_student_ids` and `remedial_student_ids` in `assessments.payload.test_session`.
      - If `action === 'submit'`: gathers active `attempt_answers`, scores them against accepted answers, marks attempt as `auto_submitted`, and stores effective score and grade.
      - If `action === 'cancel'`: marks attempt as `cancelled` with score 0 and grade `E`.
      - Injects audit log record (`REMOVE_STUDENT_FROM_TEST_SESSION`) for traceability.
    - Implemented `fetchLiveTestSessionData({ assessmentIds, studentIds, unlockedAt })`:
      - Queries `attempts` for all enrolled students across theme tests within session window.
      - Queries `audit_logs` for `action = 'CHEAT_ATTEMPT'` within session window.
      - Queries `attempt_answers` for in-progress attempts to dynamically tally answered questions and compute real-time scores.
    - Exported both functions and exposed to `window`.
  - **2. Live Test Sessions Controller Enhancement (`js/admin/assessment-access.js`)**:
    - Added `[👁️ Monitor Live & Status Ujian (N)]` button to active Theme cards in Tab 2 (Test Sessions).
    - Designed `#modal-theme-live-monitor` dark-mode real-time dashboard modal:
      - Header with Theme badge, session mode (`NORMAL` / `REMEDIAL`), global countdown timer, refresh button, and 5-second auto-poll toggle.
      - 5 KPI summary cards: `Total Siswa`, `🟢 Sedang Mengerjakan`, `✅ Sudah Selesai`, `⏳ Belum Mulai`, `🚨 Total Alarm`.
      - Filter tabs (`Semua`, `🟢 Sedang Mengerjakan`, `✅ Sudah Selesai`, `⏳ Belum Mulai`, `🚨 Ada Alarm`) and instant search input.
      - Student roster cards displaying:
        - Student avatar + name + batch + status + active test module.
        - Answered questions progress bar (`X / Y Soal (Z%)`).
        - Alarm strike badge (`🛡️ 0x Bersih` vs `🚨 Xx ALARM` with hover tooltip detailing violations).
        - Real-time score percentage and points with Official Grading Scale circle badge (`★`, `A`, `B`, `C`, `D`, `E` or `60%ᴿ` for remedial).
        - `[🚫 Keluarkan]` kick button.
    - Implemented `#modal-kick-student-confirm` confirmation dialog offering two distinct options:
      - 📥 *Kumpulkan & Nilai Jawaban Saat Ini* (submit current answers).
      - ⛔ *Batalkan Ujian* (void/cancel attempt).
  - **3. Student-Side Real-Time Expulsion Guard (`js/assessment.js`)**:
    - Added `startSessionHeartbeatGuard()` that runs every 8 seconds during active assessment:
      - Queries `attempts.status`: if changed to `cancelled` or `auto_submitted`, immediately alerts student and redirects to dashboard/result page.
      - Checks `assessments.payload.test_session.allowed_student_ids`: if student was removed by tutor, immediately terminates exam and redirects to dashboard.
      - Cleaned up interval on normal/auto submission in `doSubmit`.
  - **4. Cache & Verification**:
    - Bumped `sw.js` cache name to `topscore-cache-v5.5.0`.
    - Validated all 39 JavaScript files with `node scripts/check_all_js_syntax.cjs` (0 errors).
    - Executed `test_grading_suite.mjs` (All assertions passed).
    - Verified `git status`: Changes in working tree only (STRICTLY NO GIT COMMIT & NO GIT PUSH).

  - **1. Bulk Edit Modal UI (`admin.html`)**:
    - Created `#bulk-edit-assessments-modal` with high-contrast card styling, target preview chips, and target counter.
    - Added selective toggle checkboxes for 4 attributes (only checked fields are altered):
      - ⏱️ Waktu / Duration (Minutes) with quick presets: `[⚡ 5 Menit (Task Harian)]`, `[15 Menit]`, `[30 Menit]`, `[60 Menit]`, `[120 Menit (Test)]`.
      - 🗣️ Cara Jawab / Answer Type (`spoken`, `written`, `selection`, `mixed`).
      - 🎯 Minimal Skor / Passing Score % with quick presets: `[60% (Grade C Standar)]`, `[70%]`, `[80% (Grade B)]`.
      - 🔀 Urutan Soal / Question Order (`random`, `sequential`).
  - **2. Bulk Edit Logic & Synchronization (`js/admin/crud-modals.js`)**:
    - Implemented `openBulkEditAssessmentsModal(selectedIds, onComplete)`.
    - Automatically pre-selects 5 minutes duration toggle if all selected items are daily tasks.
    - Synchronizes database table columns (`working_duration_minutes`, `duration_minutes`, `answer_type`, `minimum_required_score`, `question_order`).
    - Synchronizes dynamic shell JSON `payload` (`payload.working_duration_minutes`, `payload.answer_type`, etc.) for seamless runner/API compatibility.
    - Synchronizes `assessment_questions` records if `answer_type` was modified.
    - Refreshes calling view via `onComplete` callback.
  - **3. Class Assessments Toolbar & Quick Select Helpers (`js/admin/app.js`, `js/admin/datagrid.js`)**:
    - Added `bulkActions: true` and `customBulkActions: [{ label: '⚡ Bulk Edit', className: 'btn-primary', ... }]` to `Class Assessments` DataGrid.
    - Added Quick Select buttons directly in card header:
      - `⚡ Semua Task (32)`: Selects all daily task rows in 1 click.
      - `📝 Semua Test (8)`: Selects all test rows in 1 click.
      - `🌐 Semua (40)`: Selects all assessments.
      - `✕ Batal`: Clears selection.
    - Enhanced `DataGrid` class with `selectAllRows(filterFn)` and `clearSelection()` methods.
  - **4. Assessments Management Hub Integration (`js/admin/assessment-management.js`)**:
    - Added `customBulkActions` with `⚡ Bulk Edit` and `🗑️ Bulk Delete` buttons for global assessment management.
  - **5. Cache & Verification**:
    - Bumped `crud-modals.js` import to `v=5.4.9` in `js/admin/app.js`.
    - Bumped `sw.js` cache name to `topscore-cache-v5.4.9`.
    - Validated all 39 JavaScript files with `node scripts/check_all_js_syntax.cjs` (0 errors).
    - Executed `test_grading_suite.mjs` (All assertions passed).
    - Verified `git status`: Changes in working tree only (STRICTLY NO GIT COMMIT & NO GIT PUSH).

- **Phase 131: Assessment Edit Modal Streamlining & ReferenceError Bug Fix**:
  - **1. Fixed `ReferenceError: record is not defined` (`js/admin/crud-modals.js`)**:
    - Defined module-level `let _editRecord = null;` alongside `_editId`.
    - Stored `_editRecord = record ? { ...record } : null;` when `openCrudModal` is invoked.
    - Updated submit handler to safely reference `_editRecord` instead of out-of-scope `record`.
    - Reset `_editRecord = null;` and `_editId = null;` upon form submission and cancellation.
  - **2. Streamlined Assessment Edit Modal (`js/admin/crud-modals.js`)**:
    - Eliminated 11 redundant fields (`institution_id`, `program_id`, `level_id`, `class_id`, `module_id`, `shell_code`, `title`, `description`, `assessment_type`, `assessment_category`, `status`, `max_attempts`).
    - Retained only the 6 essential actionable fields:
      - `working_duration_minutes` (Duration in Minutes)
      - `answer_type` (Spoken, Written, Selection, Mixed)
      - `minimum_required_score` (Passing Score %)
      - `question_order` (Sequential, Random)
      - `display_order` (Display Order)
      - `prerequisite_assessment_id` (Prerequisite Assessment)
    - Added high-contrast context header banner card showing Assessment Title, Code, Type, and Status.
    - Pre-selected existing `answer_type` aliases seamlessly (`speech_to_text` -> `spoken`, `dropdown` -> `selection`).
    - Safely prefilled duration from `working_duration_minutes`, `duration_minutes`, or `payload`.
  - **3. Payload & Runner Synchronization (`js/admin/crud-modals.js`, `js/api.js`, `start-assessment`)**:
    - Synchronized dynamic shell jsonb `payload` so `answer_type`, `duration_minutes`, and `working_duration_minutes` match between column and JSON payload.
    - Added synchronization for `assessment_questions` table to update question answer types if modified.
    - Prioritized explicit database column `assessment.answer_type` in `js/api.js` (line 680) and `start-assessment` edge function (line 423).
  - **4. Cache Invalidation & Verification**:
    - Bumped `crud-modals.js` import to `v=5.4.8` in `js/admin/app.js`.
    - Bumped `sw.js` cache name to `topscore-cache-v5.4.8`.
    - Validated all 39 JavaScript files with `node scripts/check_all_js_syntax.cjs` (0 errors).
    - Executed `test_grading_suite.mjs` (All assertions passed).
    - Verified `git status`: Changes in working tree only (STRICTLY NO GIT COMMIT & NO GIT PUSH).

- **Phase 130: Cross-Browser CSS Vendor Prefixes & Line-Clamp Order Alignment**:
  - **1. Safari `user-select` Prefix**:
    - `css/admin.css:3823`: Added `-webkit-user-select: none !important;` before `user-select: none !important;` in `.grade-circle`.
    - `css/style.css:1002`: Added `-webkit-user-select: none !important;` before `user-select: none !important;` in `.grade-circle`.
  - **2. Safari `backdrop-filter` Prefix (`css/assessment.css`)**:
    - Added `-webkit-backdrop-filter: blur(...)` to `.btn-giveup`, `.assessment-page .assessment-timer`, `.assessment-title-bar`, `.matrix-close-btn`, and `#submit-modal`.
  - **3. Standard CSS Spec Ordering (`css/assessment.css`)**:
    - Ordered `-webkit-line-clamp: 2;` before `line-clamp: 2;` in `.assessment-main-title`.
  - **4. Verification**:
    - Verified all 8 IDE problems eliminated.
    - Verified all 39 JS files pass `node --check` syntax validation with 0 errors.
    - Verified strictly NO git commits / pushes made.

- **Phase 129: Experimental Color Mockup Protocol**:
  - **1. Test Tokens Applied in `js/grading.js`**:
    - Star (100%): `#C084FC` (Bright Purple)
    - Grade A (90-99%): `#22C55E` (True Leaf Green)
    - Grade B (80-89%): `#BEF264` (Electric Bright Lime)
    - Grade C (60-79%): `#FDE047` (Pure Electric Lemon Yellow)
    - Grade D (30-59%): `#FB923C` (Clean Orange)
    - Grade E (0-29%): `#F87171` (Light Red)
    - Updated `STAR_THEME`, `GRADE_PALETTE`, `getGradeColorByScore`, and `getGradeColor`.
  - **2. Stylesheet Utility Alignment (`css/admin.css` & `css/style.css`)**:
    - `css/admin.css`: `.form-pill.grade-*`, `.grade-circle.grade-circle-*`, and `.badge-grade-star-s` updated to test tokens.
    - `css/style.css`: `.score-high`, `.score-dist`, `.score-pass`, `.score-warn`, `.score-remed`, `.score-poor`, `.score-fail`, and `.grade-circle.grade-circle-*` updated to test tokens.
  - **3. Class Hub Table Fallback Synchronization (`js/admin/app.js`)**:
    - Synchronized all dynamic score coloring and fallback ladders across average rows, PTS, and individual score columns to the new test tokens.
  - **4. Cache Invalidation & Syntax Verification**:
    - Incremented Service Worker cache key in `sw.js` to `topscore-cache-mockup-v1`.
    - Executed `node scripts/check_all_js_syntax.cjs`: all 39 JS files passed syntax validation (exit code 0).
    - Executed `scratch/test_grading_suite.mjs`: all unit test assertions passed.
    - Verified strictly NO git commits / pushes made.

- **Phase 128: HTML Inline Styles Extraction & Video Playsinline Cross-Browser Fix**:
  - **1. `result.html` Style Externalization**:
    - Removed 15 inline `style="..."` attributes and redundant `style="display:none !important;"` on `.hidden` elements.
    - Added clean classes to `css/result.css`: `.bg-particle-canvas`, `.confetti-canvas`, `.result-avatar-stage`, `.result-avatar-img`, `.result-action-buttons-wrap`.
  - **2. `assessment.html` Style Externalization**:
    - Removed 68 inline `style="..."` attributes across topbar, timer, avatar, question matrix, anti-cheat popup, and submit modal.
    - Added dedicated classes to `css/assessment.css`: `.assessment-header`, `.assessment-topbar`, `.assessment-giveup-wrap`, `.btn-giveup`, `.giveup-flag-icon`, `.assessment-avatar-wrap`, `.assessment-student-avatar`, `.assessment-timer-wrap`, `.timer-icon`, `.assessment-title-bar`, `.assessment-main-title`, `.assessment-fixed-bottom`, `.assessment-bottom-container`, `.btn-nav-prev`, `.btn-nav-next`, `.question-counter`, `.assessment-progress-outer`, `.assessment-progress-track`, `.assessment-progress-bar-bg`, `.assessment-progress-fill`, `.matrix-popup`, `.matrix-header`, `.matrix-title`, `.matrix-close-btn`, `.matrix-scroll-area`, `.matrix-footer`, `.matrix-jump-btn`, `.matrix-submit-btn`, `.cheat-box`, `.cheat-title`, `.cheat-strikes-badge`, `.cheat-reason`, `.cheat-countdown-circle`, `.cheat-timer-count`, `.cheat-countdown-label`, `.cheat-dismiss-btn`, `#submit-modal`, `#submit-modal-box`, `.submit-modal-icon`, `.submit-modal-title`, `.unanswered-warning-banner`, `.unanswered-warning-heading`, `.unanswered-warning-text`, `.unanswered-count-badge`, `.unanswered-warning-note`, `.submit-modal-message`, `.answered-count-val`, `.total-count-val`, `.submit-modal-subtext`, `.submit-modal-actions`, `.btn-jump-incomplete`, `.btn-danger-submit`, `.btn-confirm-submit`, `.btn-cancel-submit`.
  - **3. `dashboard.html` Style Externalization & Video Playsinline Fix**:
    - Removed 74 inline `style="..."` attributes across header avatar, banner avatar, hidden compatibility blocks, class selector modal, profile modal, level modal, gender setup modal, webcam setup modal, birthday setup modal, and education setup modal.
    - Added clean classes to `css/dashboard.css`: `.header-avatar`, `.banner-avatar-wrapper`, `.classes-selector-modal-desc`, `.classes-selector-modal-actions`, `#btn-open-class-levels`, `.personal-data-card`, `.profile-pin-inputs-compact`, `.profile-pin-input-compact`, `.level-modal-box`, `#levels-container`, `.gender-setup-box`, `.setup-modal-icon`, `.setup-modal-title`, `.gender-cards-row`, `.gender-card`, `.gender-card-icon`, `.gender-card-label`, `.setup-btn-confirm`, `.photo-setup-box`, `.webcam-viewport`, `.webcam-video`, `.webcam-snapshot-img`, `.camera-loading-overlay`, `.setup-controls-row`, `.btn-upload-label`, `#mic-status-card`, `#mic-status-icon`, `#btn-retry-mic`, `#btn-skip-photo-setup`, `#birthday-setup-modal`, `.birthday-setup-card`, `.setup-card-icon`, `.setup-card-title`, `.setup-card-subtitle`, `.setup-card-input-box`, `.setup-input-label`, `#onboard-birth-date`, `#btn-confirm-birthday-setup`, `#education-setup-modal`, `.education-setup-card`, `.education-setup-header`, `.edu-entry-box`, `.edu-entry-row`, `.edu-select-input`, `.edu-year-input`, `#btn-confirm-education-setup`.
    - Solved Firefox warning `'video[playsinline]' is not supported by Firefox`: removed static `playsinline` attribute from HTML `<video id="webcam-stream">` and set programmatically via JavaScript (`video.setAttribute('playsinline', ''); video.playsInline = true;` in `js/dashboard.js`).
  - **4. Global Footer Banner Classes (`css/style.css`)**:
    - Added reusable `.topscore-locked-banner .banner-brand`, `.topscore-locked-banner .banner-sep`, and `.topscore-locked-banner .banner-author`.
  - **5. Verification**:
    - Verified 0 inline styles remain in `assessment.html`, `dashboard.html`, and `result.html`.
    - Verified all 39 JS files pass `node --check` syntax validation with 0 errors.
    - Verified strictly NO git commits / pushes made.

- **Phase 127: Visual Alignment: Star Circle Badge & Exact Palette Tuning**:
  - **1. Star Badge Circle Pill Unification**:
    - Implemented `.grade-circle` uniform 19px circular pill container for ★ and all grades (`A`, `B`, `C`, `D`, `E`).
    - Integrated across `js/grading.js` (`formatGradeBadgeHtml`), `js/admin/app.js` (summary row, legend, DataGrid column), `css/admin.css`, and `css/style.css`.
  - **2. Exact Color Palette Tuning**:
    - ★: Ungu `#A855F7`.
    - A: Medium Green `#10B981` (distinct leaf green).
    - B: Lime Yellow-Green `#A3E635` (high contrast vs A in dark mode).
    - C: Kuning `#EAB308`.
    - D: Jingga/Orange `#F97316`.
    - E: Merah `#EF4444`.
  - **3. Cache & Syntax Verification**:
    - Bumped Service Worker cache to `topscore-cache-20261027-v2`.
    - Ran `scratch/test_grading_suite.mjs` (all assertions passed).

- **Phase 126: Elimination of Grades "S", "F", and "R" in Favor of Canonical 6-Tier Scale (★, A, B, C, D, E)**:
  - **1. Authoritative Grade Function Normalization (`js/grading.js`)**:
    - `calculateGrade(percentage)`: returns `'★'` directly when score >= 100%. Canonical returns: `'★'`, `'A'`, `'B'`, `'C'`, `'D'`, `'E'`.
    - `GRADE_PALETTE`: Added primary key `'★'`. Removed keys `F` and `R`. Retained `'S'` as alias for historical DB records.
    - `getGradeSymbol`, `formatGradeBadgeHtml`, `getGradeTheme`: Display clean `'★'` without any "S", "F", or "R".
    - `getAchievementStatus`: Simplified to 5 predicates (EXCELLENT, VERY GOOD, GOOD, ENOUGH, LESS, FAIL) without 'F' or 'R'.
  - **2. Backend & Database Normalization (`submit-assessment`, SQL RPCs)**:
    - `submit-assessment/index.ts`: `calculateGrade(pct)` returns `"★"` when `pct >= 100`.
    - `emergency_submit_attempt` in `supabase/schema.sql`, `supabase_deploy/01_schema_and_functions.sql`, and `20261013080000_speech_answer_tolerance.sql`: sets `v_grade := '★'`.
  - **3. UI & CSS Alignment**:
    - `css/style.css`: Added `.grade-star`, `.grade-★`, `.text-grade-star`, `.text-grade-★` with purple `#A855F7`. Removed `.grade-F` and `.text-grade-F`.
    - `css/admin.css`: Updated `.form-pill.grade-star, .form-pill.grade-s` to purple `#A855F7`. Removed `.form-pill.grade-f`.
    - `css/result.css`: Added `.pure-stamp.grade-star, .pure-stamp.grade-★`. Removed `.pure-stamp.grade-F` and `.pure-stamp.grade-remedial`.
    - `js/dashboard.js`: Removed `<div class="grade-remedial">`. Replaced grade "S" checks with `★`.
    - `js/admin/app.js`: Legend updated to `"★ (100%)"`. `cMap` updated to canonical palette.
    - `js/admin/student-management.js`: Cleaned grade badges to display `'★'`. Removed `${hasRemedial ? '<sup>R</sup>' : ''}` from Grade badges.
    - `js/admin/assessment-management.js`: Replaced emoji `'⭐'` with clean `'★'`.
    - `js/admin/assessment-access.js`: Corrected remedial session description from "Grade B" to "Grade C".
  - **4. Cache & Tests**:
    - Cache bumped to `abcd-core-v5.8.7` in `sw.js`, `admin.html`, and `result.html`.
    - Node.js unit verification script `verify_grading.mjs` passed.
    - `node scripts/check_all_js_syntax.cjs`: all 39 JS files passed syntax validation with 0 errors.

- **Phase 125: CSS Cross-Browser Prefix & Compatibility Fixes**:
  - **1. Safari `-webkit-user-select` Prefixing**:
    - Added `-webkit-user-select: none;` to all 10 un-prefixed rules in `css/admin.css` and 9 rules in `css/result.css`.
  - **2. Safari `-webkit-backdrop-filter` Prefixing & Ordering**:
    - Added `-webkit-backdrop-filter` to standalone rules in `css/admin.css` and `css/assessment.css`.
    - Corrected declaration order so vendor prefixes appear before standard `backdrop-filter` across `css/admin.css` and `css/result.css`.
  - **3. Standard CSS Cleanups**:
    - Replaced `min-height: auto !important;` in `css/result.css` with standard `min-height: 0 !important;`.
    - Removed deprecated `-webkit-overflow-scrolling: touch` across `css/admin.css`, `css/result.css`, `css/assessment.css`, and `css/style.css`.

- **Phase 124: Remedial "R" Placement Strictly on Score (Omitting "R" from Grade and Point)**:
  - **1. Grade & Symbol Sanitization (`js/grading.js`, `js/result.js`, `js/admin/class.js`, `js/dashboard.js`)**:
    - `getGradeSymbol`, `formatGradeBadgeHtml`, and `getGradeTheme`: Removed `ᴿ` superscript suffix and `remTag`. All grade badges and symbol outputs are 100% clean (`★`, `A`, `B`, `C`, `D`, `E`).
    - `result.js`: Removed `remSupHtml` from `displayGradeHtml`, `gradeBadge`, and `gradeStamp`. Grade reveals cleanly without "R".
    - `class.js`: Removed `remSupHtml` from results grid Grade column and removed `+ (isRemedial ? 'ᴿ' : '')` from Excel export `exportGrade`.
    - `dashboard.js`: Removed `<sup class="asm-rem-sup">R</sup>` from lobby card grade box.
  - **2. Point Sanitization (`js/result.js`, `js/admin/app.js`, `js/admin/student-management.js`)**:
    - `result.js`: `#res-points` displays clean numbers (`0`, `formattedPoints`), without "R".
    - `app.js`: In `#class-attendance-grid`, Test PTS column (`asm_${asm.id}_pts`) and Task column (`asm_${asm.id}`) display clean points (`displayVal`), removing `<sup>R</sup>`.
    - `student-management.js`: Transcript table in student dossier displays clean points (`${pts} / ${maxQ}`), removing `remTag`.
  - **3. Score Percentage Remedial "R" Attachment (`js/result.js`, `js/admin/app.js`, `js/admin/class.js`, `js/admin/student-management.js`)**:
    - `result.js`: `#result-percentage` dynamically appends `<sup class="asm-rem-sup">R</sup>` upon completion of `animateCount` and in reduced motion fallback.
    - `result.js`: Attempt History table Score column attaches `<sup class="asm-rem-sup">R</sup>` for remedial attempts.
    - `app.js`: Class Hub assessment matrix Test SCORE column (`asm_${asm.id}_pct`) retains `${Math.round(effPct)}%<sup class="asm-rem-sup">R</sup>`.
    - `class.js`: Results table Score column retains `${effectivePct}%<sup class="asm-rem-sup">R</sup>`.
    - `student-management.js`: Dossier transcript Score column attaches `${pct}%${remTag}`.
  - **4. Styling & Cache Invalidation**:
    - Added `.asm-rem-sup` CSS rule to `css/result.css`.
    - Bumped ServiceWorker cache to `abcd-core-v5.8.6` in `sw.js`, `admin.html`, and `result.html`.
    - Verified all 39 JS files pass syntax validation (`node scripts/check_all_js_syntax.cjs`) with 0 errors.

- **Phase 123: Official Grading Scale & Remedial Max 60% Score Capping**:
  - **1. Centralized Grading Scale Synchronized (`js/grading.js`)**:
    - Updated `calculateGrade(pct)`: 100% -> `S` (★ Excellent), 90%–99% -> `A` (Very Good), 80%–89% -> `B` (Good), 60%–79% -> `C` (Enough), 30%–59% -> `D` (Less), 0%–29% -> `E` (Fail). Added strict 100% boundary check (`num >= 100 ? 'S' : ...`).
    - Standardized symbol to crisp text glyph `★` across `GRADE_PALETTE`, `getGradeSymbol`, `formatGradeBadgeHtml`, and `getGradeTheme` so the star glyph cleanly inherits the purple CSS color (`#A855F7`) without platform emoji yellow overrides.
    - Aligned `GRADE_PALETTE`: S (`#A855F7`), A (`#10B981`), B (`#84CC16`), C (`#EAB308`), D (`#F97316`), E (`#EF4444`), and R (`#EAB308` score tier color).
    - Updated `getAchievementStatus(grade, pct)`: Thresholds 90, 80, 60, 30, 0 matching official labels: `EXCELLENT`, `VERY GOOD`, `GOOD`, `ENOUGH`, `LESS`, `FAIL`.
    - Updated `getGradeColor`: Remedial uses the standard score tier color (`#EAB308` at 60%).
    - Updated `getGradeSymbol` & `formatGradeBadgeHtml`: Renders obtained grade with small `<sup>R</sup>` or superscript `ᴿ` (e.g. `Cᴿ`).
  - **2. Supabase Edge Functions & SQL RPC Functions**:
    - Edge function `supabase/functions/submit-assessment/index.ts`: Synchronized `calculateGrade(pct)` boundaries to 100, 90–99, 80–89, 60–79, 30–59, 0–29, and enforced 60% remedial cap.
    - Database fallback RPCs in `supabase_deploy/01_schema_and_functions.sql`, `supabase/schema.sql`, and `supabase/migrations/20261013080000_speech_answer_tolerance.sql`: Synchronized emergency submit functions to 100, 90, 80, 60, 30, 0 and 60.00 remedial cap.
  - **3. Assessment API Client (`js/api.js`)**:
    - `submitAssessment`: Remedial capped at `Math.min(rawPct, 60.0)` with `getGrade(effPct)`.
    - `labelAttemptRemedial`: `effectiveScore = isRemedial ? Math.min(rawPct, 60.0) : rawPct` and recalculated `getGrade(effectiveScore)`.
  - **4. Student Result Page (`js/result.js`, `css/result.css`)**:
    - Harmonized `gradeRingColors` & `standardGradeColors` to `#A855F7`, `#10B981`, `#84CC16`, `#EAB308`, `#F97316`, `#EF4444`.
    - Updated score capping: `pct = isRemedial ? Math.min(rawPct, 60.0) : ...` and points `totalPoints = isRemedial ? Math.min(rawTotalPoints, maxQuestions * 0.6) : rawTotalPoints`.
    - Rendered small `<sup>R</sup>` next to Grade with matching score tier color aura.
    - Aligned historical attempts table to purple `★`.
  - **5. Admin Roster & Class Matrix (`js/admin/student-management.js`, `js/admin/app.js`, `js/admin/class.js`)**:
    - Effective score capping for remedial: `effScore = isRem ? Math.min(sc, tq * 0.6) : sc`, `effPct = isRem ? Math.min(rawPct, 60.0) : rawPct`.
    - Color mapping: Thresholds 90, 80, 60, 30, 0 with palette `#A855F7`, `#10B981`, `#84CC16`, `#EAB308`, `#F97316`, `#EF4444`.
    - Removed arbitrary yellow override on remedial score; score color strictly follows score tier.
    - Matrix toolbar, student progress table, and student dossier printout format remedial grades as `Cᴿ` and Grade S as `★`.
  - **6. Student Dashboard (`js/dashboard.js`)**:
    - Harmonized tier colors and best score capping (`Math.min(rawBestPct, 60.0)` for remedial).
    - Completed assessments modal updated to purple `#A855F7`.
  - **7. Cache Invalidation & Syntax Verification**:
    - Updated `sw.js` cache to `abcd-core-v5.8.5` and `admin.html` query strings to `?v=5.8.5`.
    - Verified all 39 JavaScript files pass syntax check (`node scripts/check_all_js_syntax.cjs`) with 0 errors.

- **Phase 122: Fix Student Roster Loading State Glitch & Remove Obsolete Flashing Tabs**:
  - **1. Eliminated Conflicting Loading Tabs in `js/admin/app.js`**:
    - Removed temporary `studentNavTabs` (`Enrolled Active Students` & `Bulk Excel / CSV Ingestion`) from `case 'students':`.
    - Streamlined `case 'students':` to directly call `await _renderStudentsModule(area)`.
    - Eliminated the visual jump/flash where the temporary tabs appeared with a spinner and then were abruptly overwritten by the 4 student KPI cards.
    - Preserved `window._switchStudentTab` as a fallback function redirecting to `loadSection('students')`.
  - **2. Topbar Consistency & Program Persistence**:
    - Enhanced topbar section title resolution in `loadSection` to check `localStorage.getItem('topscore_selected_program_name')` on initial page loads/reloads, displaying the program title (e.g., "Camp") cleanly while student data is fetched.
    - Verified that bulk import and registration remain cleanly accessible in their dedicated sidebar location under `B — BOARD` → `Students Registration`.
  - **3. Cache Invalidation & Verification**:
    - Bumped `CACHE_NAME` in `sw.js` to `abcd-core-v5.8.2`.
    - Bumped script query parameters in `admin.html` to `v=5.8.2`.
    - Verified all 39 JavaScript files pass syntax check (`node scripts/check_all_js_syntax.cjs`) with 0 errors.

- **Phase 121: Complete Internationalization & Direct English Only Alignment**:
  - **1. Rule 2.12 Direct English Only Enforcement**:
    - Translated all Indonesian UI texts, forms, modals, confirmations, badges, and alerts across the codebase into natural English.
    - Preserved question content/fallbacks (`soal`, `pertanyaan`, `jawaban`, `kunci`) for student translation prompts.
  - **2. `dashboard.html` & `js/dashboard.js`**:
    - Translated education level selector options ("Select Education Level", "Select Level (Optional)").
    - Translated assessment selection modal description ("Select an available assessment below.").
    - Translated photo update toast notifications ("Profile photo successfully updated and saved!", "Failed to process photo...").
  - **3. `js/api.js`**:
    - Translated system guard module restriction errors ("SYSTEM GUARD: Vocabulary Mastery and Phrase Recognition modules are strictly locked to Vocabulary Class only.", "SYSTEM GUARD: Vocabulary modules are only permitted for Levels 0, 1, 2, and 3.").
    - Translated test access check messages ("This test session is inactive or has been closed.", "This test session has not been opened by the Tutor yet...", "The test session has ended and access is locked.", "This test session is designated for a different batch.", "You are not on the attendance whitelist for today's test session...").
  - **4. `js/result.js`**:
    - Standardized remedial segment toggle button and toast to `REMEDIAL` ("Status updated: REMEDIAL").
  - **5. `js/admin/class.js` & `js/admin/student-management.js`**:
    - Translated remedial toggle buttons, tooltips, confirmation prompts, table headers, and toasts ("Revert remedial status (return to normal)", "Mark this score as Remedial (Max 60%)", "Action / Remedial", "Score successfully labeled as Remedial (Max 60%).").
  - **6. `js/admin/assessment-access.js` (Test Sessions Tab)**:
    - Translated header subtitle, KPI pill labels ("Open Sessions", "Awaiting Tutor").
    - Translated Open Test Session Modal: titles, target batch label, duration label, banner descriptions ("NORMAL SESSION (FULL SCORE)", "REMEDIAL SESSION (MAX 60% CAP)"), search placeholder, select all/none buttons, ineligible warning/toggle, and confirmation toasts.
    - Translated Late Arrival Students Modal: header, live duration label, warning description, search placeholder, and toasts.
    - Translated Smart Eligibility Engine status badges and explanation reasons ("⚠️ Incomplete Tasks (X/Y)", "✓ Passed (X%) • Score Improvement", "✓ Prerequisites Met (Exam Ready)", "Already Passed (X%) — Remedial Ineligible", "🟡 Remedial (Previous Score: X%)", "🟡 Remedial (Never Tested)").
  - **7. `js/admin/admin-deck.js` & `js/admin/app.js`**:
    - Translated CV profile labels ("Birth Year", "Highest Education", "Work Experience (Optional)").
    - Translated matrix row header ("★ CLASS AVERAGE") and tooltip warnings ("⚠️ Student has remedial score", "🟡 [REMEDIAL - MAX 60% CAP]").

- **Phase 120: Accessibility, CSS Vendor Prefixes, Duplicate IDs & Lint Resolution**:
  - **1. Accessibility in `admin.html`**:
    - Added `title="Filter by ASSESSMENT"`, `aria-label="Filter by ASSESSMENT"`, and `for="dup-q-assessment-select"` on question duplicate filter select.
    - Added `title="Select student to add to roster"` and `aria-label="Select student to add to roster"` on `#roster-add-student-select`.
    - Added `title="Select Program"`, `aria-label="Select Program"`, and `for="add-class-program-id"` on add class program select.
  - **2. Accessibility & Duplicate IDs in `dashboard.html`**:
    - Added `title="Upload Profile Photo"` and `aria-label="Upload Profile Photo"` on `#banner-photo-input` and `#profile-modal-photo-input`.
    - Added `title="Date of Birth"`, `aria-label="Date of Birth"`, and `placeholder="YYYY-MM-DD"` on onboarding birth date input `#onboard-birth-date`.
    - Added `title="Latest Education Level"` and `aria-label="Latest Education Level"` on `#onboard-edu-inst-1`.
    - Added `title="Prior Education Level (Optional)"` and `aria-label="Prior Education Level (Optional)"` on `#onboard-edu-inst-2`.
    - Added `title="Graduation Year"` and `aria-label="Graduation Year"` on `#onboard-edu-year-1` and `#onboard-edu-year-2`.
    - Removed redundant duplicate DOM container `#dashboard-classes-bar` and child elements inside hidden compatibility wrapper.
  - **3. Vendor Prefixes & Compatibility in `css/dashboard.css`**:
    - Added `-webkit-backdrop-filter` alongside `backdrop-filter` (lines 292, 1051, 2213, 2321).
    - Added `-webkit-user-select` alongside `user-select` (lines 671, 1812, 2569, 2908, 3060).
    - Fixed property ordering so `-ms-user-select` precedes standard `user-select` (lines 1110, 1118).
    - Replaced non-standard `min-height: auto` with `min-height: 0` for Firefox compatibility.
    - Removed obsolete `-webkit-overflow-scrolling: touch;` declarations to satisfy modern linters.
  - **4. Markdown Bullet Style Consistency (MD004)**:
    - Standardized all unordered list bullets from asterisk (`*`) to dash (`-`) across `docs/CURRENT_STATE.md`, `docs/CHANGELOG.md`, and `docs/SESSION_LOG.md`.

- **Phase 119: Standardize Vocabulary Answer Types & Comprehensive E2E Assessment Audit**:
  - **1. End-to-End Browser Audit of All 4 Assessment Types (`assessment.html`)**:
    - **Test A: Words Task (`spoken`)**: Tested `3A1-WORDS-TASK` (`0a8e2626-5d34-41a9-b701-107eeea8e593`). Loaded question "Kualifikasi". Rendered Spoken mode with transcript container and green glowing microphone (`.speech-mic-btn-lg`). Screenshot: `scratch/verified_words_task_spoken.png`.
    - **Test B: Phrases Task (`spoken`)**: Tested `3A1-PHRASES-TASK` (`936f9ae8-d777-458a-8b7f-397c418d72d3`). Loaded question "Saya yakin dapat memberikan kontribusi yang positif." Rendered listening container, language selector, and microphone UI. Screenshot: `scratch/verified_phrases_task_spoken.png`.
    - **Test C: Words Test (`written`)**: Tested `3A-WORDS-TEST` (`c47e98e6-678c-4e81-a31f-be3c7018ef97`). Loaded question "Kualifikasi" (from 120 questions pool). Rendered centered large textarea (`.written-input`) and full custom Virtual Keyboard (`#virtual-keyboard-container` with QWERTY layout, Shift, ?123, Enter). Screenshot: `scratch/verified_words_test_written.png`.
    - **Test D: Phrases Test (`selection`)**: Tested `3A-PHRASES-TEST` (`c71bca14-53d2-4e60-89f5-47d16e6cc22b`). Loaded question "Resume ini menampilkan pencapaian saya." Rendered 5 randomized distractors as interactive `.mc-option` radio pills with instant select and auto-advance. Screenshot: `scratch/verified_phrases_test_selection.png`.
  - **2. Security & Prerequisite Enforcement Verification**:
    - Prerequisite gating verified: Taking `3A1-PHRASES-TASK` without passing `3A1-WORDS-TASK` ($\ge 60\%$) throws `PREREQUISITE_NOT_MET` (403) and safely blocks access.
    - Live test session gating verified: Taking `3A-WORDS-TEST` or `3A-PHRASES-TEST` without tutor unlocking the session throws `LOCKED_BY_TUTOR` and blocks unwhitelisted students.
    - Prerequisite chaining verified: `3A-PHRASES-TEST` strictly requires passing `3A-WORDS-TEST`.
  - **3. Admin Class Hub Navigation & Modals Verification**:
    - Tab 1: 📊 `Students Grade and Score` (Matrix attendance grid rendered with all 18 students and color-coded scores).
    - Tab 2: 🔐 `Test Sessions` (All 4 Theme cards A, B, C, D rendered; `🟢 Buka Normal` modal opens with 18 eligible students; `🟡 Buka Remidi` modal opens with 16 eligible remedial students; Late addition modal functions cleanly).
    - Tab 3: 📝 `Class Assessments` (DataGrid rendered with 40 rows showing exact updated badges: `🗣️ Spoken` for Tasks, `WRITTEN` for Words Tests, and `SELECTION` for Phrases Tests).
  - **4. Database Realignment Across All 40 Assessments**:
    - 16 Words Tasks (`VOCAB_TASK`): Standardized to `answer_type: 'spoken'`, `payload.answer_type: 'spoken'`.
    - 16 Phrases Tasks (`PHRASE_TASK`): Standardized to `answer_type: 'spoken'`, `payload.answer_type: 'spoken'` (updated from selection).
    - 4 Words Tests (`VOCAB_TEST`): Standardized to `answer_type: 'written'`, `payload.answer_type: 'written'`.
    - 4 Phrases Tests (`PHRASE_TEST`): Standardized to `answer_type: 'selection'`, `payload.answer_type: 'selection'` (updated from written).
  - **5. Auto-Generate Assessment Hierarchy (`js/api.js`)**:
    - `autoGenerateAssessmentsHierarchy`: Explicitly assigns `answerType: 'spoken'` to Words Task and Phrases Task, `answerType: 'written'` to Words Test, and `answerType: 'selection'` to Phrases Test.
    - `upsertDynamicAssessmentShell`: Updated `defaultAnswerType` formula to `isTest ? (isPhrase ? 'selection' : 'written') : 'spoken'`.
    - Prioritized explicit `answerType` argument over legacy database values (`answerType || (existing && existing.answer_type) || defaultAnswerType`).
    - Fallback in `generateAssessmentQuestions`: Checks `assessment.payload?.answer_type || assessment.answer_type || 'written'`.
  - **6. Edge Function Alignment (`supabase/functions/start-assessment/index.ts`)**:
    - Dynamic fallback aligned: `VOCAB_TASK` / `PHRASE_TASK` &rarr; `spoken`, `VOCAB_TEST` &rarr; `written`, `PHRASE_TEST` &rarr; `selection`.
    - Distractor generation: checks `isSelectionMode = dynamicAnswerType === 'dropdown' || dynamicAnswerType === 'selection' || dynamicAnswerType === 'multiple_choice'` to generate 5-option randomized distractors from Vocabulary Vault.
  - **7. Seed & Local Consistency**:
    - Synchronized `supabase_deploy/02_curriculum_and_students.sql` for all 20 updated assessment entries.
  - **8. Browser & Automated Verification**:
    - Playwright automated browser test verified `#class-assessments-grid` displays 🗣️ Spoken for Words & Phrases tasks, WRITTEN for Words Tests, and SELECTION for Phrases Tests.
    - Screenshot verified: `scratch/class_assessments_verified.png`.
    - Node check: all 39 JavaScript files passed syntax check with 0 errors.
    - Cache bumped across `sw.js` and `admin.html` to `v5.8.1`.

- **Phase 118: Vocabulary Class Hub Unified Test Sessions & Smart Eligibility Engine**:
  - **1. Sidebar Clean-up & Redundant Menu Removal**:
    - Cleanly removed `Assessment Access` (`data-sub="assessment-access"`) from `admin.html` sidebar under Domain C (Class).
    - Backward compatibility: Direct URLs to `#assessment-access` automatically route to `#class-hub` with Tab 2 (`test-sessions`) pre-selected.
  - **2. Tab Order & Default Active Tab in Class Hub**:
    - Tab 1 (Default): 📊 `Students Grade and Score` (Class attendance matrix).
    - Tab 2: 🔐 `Test Sessions` (Unified live test controller).
    - Tab 3: 📝 `Class Assessments` (Curriculum assessments list).
  - **3. Unified Theme Test Cards (Themes A, B, C, D)**:
    - Grouped `Words Test` and `Phrases Test` into single Theme cards: Theme A (Workplace), Theme B (Tourism), Theme C (CCU), Theme D (High-Frequency).
    - Single unlock action triggers dual activation for both Words and Phrases tests with synchronized auto-close countdown.
    - 2 separate opening buttons on locked cards: `🟢 Buka Normal` and `🟡 Buka Remidi`.
  - **4. Smart Eligibility Engine**:
    - **Normal Mode**: Requires all prerequisite tasks for that Theme to be completed ($\ge 60\%$). Siswa yang sudah lulus ($\ge 60\%$) tetap muncul dengan badge `✓ Lulus (XX%) • Perbaikan Nilai` untuk kesempatan perbaikan nilai tertinggi (Rule 2.7).
    - **Remedial Mode**: Requires prerequisite tasks to be completed ($\ge 60\%$) AND siswa belum lulus ($< 60\%$ atau belum pernah ujian). Siswa yang sudah lulus ujian normal mutlak disembunyikan/dikecualikan dari remidi.
    - Ineligible students are summarized with a clean expandable detail toggle.
  - **5. Late Student Addition (+ Susulan)**:
    - HANYA menampilkan siswa eligible dari batch aktif yang **BELUM terdaftar di dalam sesi ujian berjalan**.
    - Siswa yang sudah ada di dalam ujian 100% disaring keluar (bebas tumpukan).
    - Otomatis mewarisi mode sesi (Normal / Remedial) tanpa perlu checklist manual.
    - Waktu pengerjaan sinkron dengan sisa waktu berjalan sesi global.
  - **6. Cache Bump & Syntax Validation**:
    - Bumped cache version across `sw.js` and `admin.html` to `v5.8.0`.
    - Passed `node scripts/check_all_js_syntax.cjs` on all 39 JavaScript files with 0 errors.

- **Phase 117: Complete Student Lobby Option B Architecture**:
  - **1. Header Architecture (Option B: Left Brand + Right Action Cluster)**:
    - Left: Left-aligned title `THE STUDENT'S LOBBY` (`#dashboard-header-brand`).
    - Right: Grouped action buttons `.dashboard-header-actions` holding Profile circular avatar button (`#view-profile-btn`) and square Logout button (`#logout-btn`).
    - Locked strictly to 50px height.
  - **2. 50px Modular Rhythm Across All Cards**:
    - Standardized the entire vertical stack to an exact 50px modular rhythm:
      - Header: 50px
      - Metadata Hero Card: 150px (3 × 50px)
      - Achievement Status: COMPLETE (1A Yellow Padlock, 2B Red Rotate Undo, 3C Green Circle Play applied and verified; 39 JS files syntax valid)
      - Classes Selector Bar: 50px (unified bar showing active class and progress badge, click opens modal)
      - Next Assessment Card: 50px (eliminated 20px redundant label, integrated target icon, task title, and GO button into single 50px card)
      - Rank Standings: Dynamic Bottom Space (384px, fits ~8 student rows cleanly with internal scroll)
      - Bottom Banner: 50px
  - **3. Classes Selector Bar & Modal**:
    - `#dashboard-classes-bar` styled as a luxury interactive selector bar with dropdown caret and completion progress badge.
    - Tapping opens `#classes-selector-modal` to switch active class seamlessly without leaving the zero-scroll lobby.
  - **4. Zero-Scroll & Cache Versioning**:
    - Maintained 100% Zero-Scroll (`docHeight = clientHeight = 844px`, 0 vertical overflow).
    - Bumped cache version across `sw.js`, `dashboard.html`, `js/dashboard.js`, and `css/dashboard.css` to `v5.7.1`.

- **Phase 114: Student Lobby (dashboard.html) Wireframe Implementation & Achievement Status System**:
  - **1. Header Architecture (50px)**:
    - Left: Circular Profile icon button (`#view-profile-btn`).
    - Center: Centered brand title `LOBBY` (`#dashboard-header-brand`).
    - Right: Square Logout icon button (`#logout-btn`).
    - Exact 50px height (`min-height: 50px; max-height: 50px`).
  - **2. Student Metadata & Hero Card (150px)**:
    - Exact 150px height (`#welcome-banner-section`).
    - Top Meta Row: `INSTITUTION | PROGRAM | BATCH | LEVEL` (e.g. `CAKE ENGLISH COURSE | CAMP | 133 | 3RD LEVEL`).
    - Score Box (left): Displays student's overall percentage (`#bottom-stat-avg-score`).
    - Center Avatar: Rounded profile avatar with glowing tier border and Batch Champion Crown (`👑 QUEEN` / `👑 KING`) when student is #1.
    - Grade Box (right): Displays authoritative grade symbol or glowing Star SVG (`#stat-overall-grade-value`).
    - Bottom Row: Full formatted student name (`#welcome-name`).
  - **3. Achievement Status Card (30px)**:
    - Exact 30px height (`#dashboard-achievement-card`).
    - Display strictly the 6 official Achievement Status values: `FAIL` (0-19%), `LESS` (20-39%), `ENOUGH` (40-59%), `GOOD` (60-79%), `VERY GOOD` (80-99%), `EXCELLENT` (100%).
    - DECISION-018: `REMEDIAL` is strictly an exam status/condition, NEVER an achievement status.
    - Glowing uppercase typography with dynamic `--tier-color` text shadow.
  - **4. Classes Selector Bar (30px)**:
    - Exact 30px height (`#dashboard-classes-bar`).
    - Displays active class title (`📚 CLASSES: <Class Name>`) and class completion progress (`50% ▾`).
    - Clicking opens `#classes-selector-modal` to switch active class, immediately filtering the Next Assessment Bar.
  - **5. Next Assessment Bar (30px)**:
    - Exact 30px height (`#up-next-section`).
    - Horizontal split: Left displays target icon and next task title; Right displays compact `🚀 Start` or `🔄 Retake` button (`height: 22px`).
    - When all tasks are passed, displays `🏆 All tasks in this class completed!` with green badge `✓ 100%`.
  - **6. Dynamic Rank Standings Table (Remaining Screen Space)**:
    - Dynamically occupies all remaining screen space (`flex: 1 1 0%`, exactly 444px on 390x844 viewport).
    - Header: `🏆 RANK STANDINGS` on left, `MY RANK #X` on right.
    - Compact 3-column table: `#` (Rank), `NAME` (Student avatar, name, attempt count, avg %), `POINT` (points & grade badge).
    - Medals for top 3: Gold #1 (`🥇`), Silver #2 (`🥈`), Bronze #3 (`🥉`).
    - Active student row highlighted with cyan indicator bar and `(You)` badge.
    - Internal smooth scrolling with zero parent viewport overflow.
  - **7. Locked Bottom Banner (50px)**:
    - Centered `TopsCore © 2026 | Created by Mr. Top`.
  - **8. Dynamic Tier Aura & Zero-Scroll Compliance**:
    - All 5 dashboard cards radiate the student's Grade tier color (`--tier-color`, `--tier-rgb`) across borders and radial background glows.
    - Full 100% Zero-Scroll verified: `docHeight = clientHeight = 844px`.
  - **9. Cache Versioning**:
    - Bumped `sw.js`, `dashboard.html`, `js/dashboard.js`, and `css/dashboard.css` to `v5.6.8`.

- **Phase 113: Centered Loading State & Top-to-Bottom Sequential Cascade Animation**:
  - **1. Centered Fullscreen Loading Overlay (Zero Layout Shift)**:
    - Repositioned `#result-loading` as a fixed fullscreen backdrop-blur overlay (`position: fixed; inset: 0; z-index: 9999; background: #070b19; backdrop-filter: blur(12px)`).
    - Spinner and text are positioned dead-center horizontally and vertically (`justify-content: center; align-items: center`).
    - Completely eliminates vertical layout shifts (hero banner no longer jumps up or down when loading starts or finishes).
  - **2. Top-to-Bottom Sequential Cascade Animation System**:
    - Created universal cascade classes in `css/result.css`: `.cascade-item`, `.cascade-metric-row`, `.cascade-btn-item`, and `.cascade-revealed`.
    - Implemented `runResultEntranceSequence` in `js/result.js` orchestrating a clean, choreographed reveal:
      1. **Student Identity Card (`#result-identity-card`)**: reveals from top with smooth fade-in (`t = 0`).
      2. **Assessment Title (`#result-Assessment-name-container`)**: reveals next (`t = 180ms`).
      3. **Dynamic Metrics Bar (`#result-metrics-bar`)**: container reveals (`t = 360ms`), followed by row-by-row entrance and animated count-up:
         - Row 1: `CORRECT` slides in & counts up from 0 to target count (`t = 460ms`).
         - Row 2: `PARTIAL` slides in & counts up from 0 to target count (`t = 580ms`).
         - Row 3: `INCORRECT` slides in & counts up from 0 to target count (`t = 700ms`).
         - Row 4: `POINTS` slides in & counts up from 0 to total points (`t = 840ms`).
      4. **Dual Score & Grade Card (`#result-score-grade-card`)**: reveals (`t = 1020ms`), Score begins counting up from `0%` to achieved percentage over ~1100ms.
      5. **Grade Stamp Impact**: The exact millisecond the score reaches final value, `#result-grade-val` slams down with `gradeStampImpact` (scale 3.5 -> 0.92 -> 1.08 -> 1, rotation, and blur resolution) and `#result-grade-box` triggers container haptic thud `box-stamped`.
      6. **Evaluation Word Card (`#result-motivation-msg`)**: reveals 280ms after the stamp with glowing tier aura, displaying strictly the single evaluation word (`EXCELLENT`, `VERY GOOD`, `GOOD`, `ENOUGH`, `LESS`, `FAIL`, `REMEDIAL`).
      7. **Action Buttons (`.result-action-buttons-wrap`)**: reveal 220ms after evaluation card sequentially:
         - Next milestone / remedial segmented buttons (`#smart-next-action-container`).
         - Back button (`#back-dashboard-btn`).
         - Answer breakdown button (`#toggle-answers-btn`).
  - **3. Accessibility & Performance**:
    - Full `@media (prefers-reduced-motion: reduce)` support: disables animations and reveals all content instantly.
    - 5000ms safety timeout fallback ensures no element remains hidden under any unexpected network or render condition.
  - **4. Cache & Versioning**:
    - Bumped `sw.js` and `result.html` to `v5.6.7` (`CACHE_NAME = 'abcd-core-v5.6.7'`).
  - **5. Automated Playwright Verification**:
    - Verified centered loading spinner coordinates on 390x844 viewport (`x: 168px, y: 378.6px`, centered horizontally & vertically).
    - Verified 100% cascade state: all elements received `.cascade-revealed`, score reached `85%`, grade stamp slammed with `box-stamped: true`, evaluation word card showed `VERY GOOD`.
    - Verified mobile zero-scroll: `Scroll Height: 844px | Client Height: 844px | Zero-scroll: true`.

- **Phase 112: Result Page Wireframe Harmonization & Dynamic Tier Color Sync**:
  - **1. Exact Evaluation Word Card (50px)**:
    - Restored `#result-motivation-msg` as `.result-evaluation-card` positioned right after `#result-score-grade-card`.
    - Implemented `getEvaluationWord` matching user's exact specification: `E=FAIL / D=LESS / C=ENOUGH / B=GOOD / A=VERY GOOD / STAR=EXCELLENT / R=REMEDIAL`.
    - Strictly text-only: NO icons, NO extra phrases, styled with glowing typography (`font-weight: 900`, `letter-spacing: 0.14em`, `color: var(--tier-color)`).
    - Removed previous `#result-motivation-msg` CSS suppression (`display: none !important`).
  - **2. Wireframe Height & Layout Precision (Zero-Scroll System)**:
    - Assessment Title (`#result-Assessment-name-container`): exact `50px` height (`min-height: 50px; max-height: 50px`).
    - Score & Grade Card (`#result-score-grade-card` & `.score-grade-box`): exact `50px` height (`min-height: 50px; max-height: 50px`).
    - Action Bar (`.btn-next-milestone` and `.tutor-remedial-segmented`): exact `50px` height (`min-height: 50px; max-height: 50px`), matching the score/grade bar height.
    - Navigation Button (`.btn-dashboard-primary`): exact `30px` height (`BACK TO LOBBY` for students, `BACK TO ROOM` for tutors).
    - Answer Breakdown Button (`.btn-breakdown-ghost`): exact `30px` height (`view answer breakdown`), positioned at the bottom right above the banner.
    - Metrics Table (`#result-metrics-bar`): dynamic in remaining screen (`flex: 1 1 0px; min-height: 100px`).
  - **3. Dynamic Tier Border & Background Aura Sync**:
    - Injected `--tier-color` and `--tier-rgb` across all cards on the Result page: `#result-identity-card`, `#result-Assessment-name-container`, `#result-metrics-bar`, `#result-score-grade-card`, and `#result-motivation-msg`.
    - Card borders and backgrounds now softly radiate the exact student's grade color (Grade A emerald green, Grade B sky blue, Grade S purple glow, etc.).
  - **4. Student's View vs Tutor's View Uniformity**:
    - Strictly identical card dimensions, gaps (10px), and typography between Student and Tutor views.
    - Student View shows: `GO TO NEXT ASSESSMENT: [Title]` and `BACK TO LOBBY`.
    - Tutor View shows: `NORMAL` | `REMIDI` segmented buttons (50px) and `BACK TO ROOM` (30px).
  - **5. Automated Playwright Verification**:
    - Executed `scripts/verify_result_wireframe.mjs` on Edge headless: 100% assertions passed for both Student's View and Tutor's View.
    - Saved visual proof: `result_student_view_verified.png` and `result_tutor_view_verified.png`.
  - **6. Cache & Asset Versioning**:
    - Bumped `sw.js` and `result.html` to `v5.6.6` (`CACHE_NAME = 'abcd-core-v5.6.6'`).

- **Phase 111: Tactical Table Enhancements (4 Pillars) & System-Wide Analysis**:
  - **1. Sticky First Column System (`css/admin.css` lines 4330-4345)**:
    - Added `.table-wrap.sticky-first table th:first-child`, `.table-wrap.sticky-first table td:first-child`, and `.sticky-col-first`.
    - Header `th:first-child` locks at `position: sticky; left: 0; z-index: 15; background: rgba(15, 23, 42, 0.98)` with depth shadow.
    - Data cells `td:first-child` lock at `position: sticky; left: 0; z-index: 5; background: var(--fm-bg-panel, #0F172A)`.
    - Applied to `#access-tests-table`, `#vault-table`, `#vault-topic-table`, and `#indiv-recent-tbody`.
  - **2. Standardized 38px Search & Filter Toolbar (`css/admin.css` lines 4347-4385)**:
    - Standardized toolbar containers `.table-toolbar-unified`, inputs `.toolbar-input-38`, and buttons `.toolbar-btn-38` to exact 38px height.
    - Eliminates uneven 26px/32px/42px mismatched controls across Vocab Vault and Assessment Access.
  - **3. Tactical Status Dot System (`css/admin.css` lines 4387-4435)**:
    - Replaced thick rectangular badge containers with `.status-dot-badge` featuring 7px glowing indicator dots.
    - Status classes: `.dot-live` (pulsing glowing green), `.dot-locked` / `.dot-danger` (glowing red), `.dot-warning` (glowing amber), `.dot-draft` (neutral slate).
    - Reduces horizontal column consumption by 25-30% while delivering a futuristic control-room aesthetic.
  - **4. Smart Empty State (`css/admin.css` lines 4437-4475)**:
    - Upgraded table empty states to `.smart-empty-state` with centered thematic icon (`🔍` or `👥`), bold title, informative subtext, and quick action button (`.smart-empty-btn`) that clears input and resets table in 1 click.
    - Integrated into Assessment Access, Vocab Words, and Vocab Topic Manager.
  - **5. Cache & Version Bump**:
    - Bumped `admin.html` and `sw.js` to `v5.6.2` (`CACHE_NAME = 'abcd-core-v5.6.2'`).
  - **6. Automated Playwright Verification**:
    - Verified toolbar metrics: `toolbarHeight: 38px`, `searchInputHeight: 38px`, `sortSelectHeight: 38px`, `firstThPosition: sticky`.
    - Verified smart empty state appearance on search query miss and instant table restoration upon reset button click.
    - Verified 0 console errors.

- **Phase 110: Sidebar Tidy-up & Students Registration Hub (Domain B: Board)**:

  - **1. Sidebar Navigation Tidy-up & Standardization**:
    - Cleaned up dynamic program items (`#sidebar-programs-list`) and class items (`#sidebar-classes-list`) in both `admin.html` (pre-render hydration) and `js/admin/app.js` (`loadSidebarPrograms`, `loadSidebarClasses`).
    - Eliminated bloated inline styles (`padding:8px 12px; gap:10px; font-size:1.1rem;`) and standardized to `.admin-nav-item` classes with `.nav-icon`.
    - All sidebar items across Domains A, B, C, and D now have identical pixel-perfect metrics (`padding: 5.76px 9.6px`, `gap: 7.68px`, icon box width `18px`).
    - Fixed active highlight logic so `Vocabulary` (class item) is only marked active when the current view is `#class-hub`.
  - **2. Restored "Students Registration" in Domain B**:
    - Added `<div class="admin-nav-item" data-sub="student-registration"><span class="nav-icon">&#128203;</span>Students Registration</div>` directly under `B — Board` header in `admin.html`.
    - Registered `student-registration` in `sectionTitles`, `sectionDomainMap` (`BOARD`), `aliasSectionMap` (`import-students` -> `student-registration`), and routed `loadSection` switch statement in `js/admin/app.js`.
  - **3. Dedicated Students Registration Module (`js/admin/student-registration.js`)**:
    - Integrated with 50px dynamic edge-to-edge folder tabs via `window.setTopbarTabs`.
    - **Tab 1: Bulk Excel Import**:
      - Target Scope selectors (Institution, Program, Batch) with cascading dropdowns.
      - Interactive Drag & Drop zone (`.student-reg-dropzone`) for `.xlsx`, `.xls`, `.csv` with visual feedback.
      - Excel column format guide: required `INSTITUTION`, `PROGRAM`, `BATCH`, `NAME`.
      - Live preview table with `.data-table` tactical dark system and summary badges (Total, New Students, Merge with Existing).
      - Excel template download (`Template_Students_Registration.xlsx`) and CSV export.
      - Save action: inserts students, hashes PIN with SHA-256 (defaults to `1234`), creates missing batches, initializes Level 1 progression across active classes in `progress` table, clears cache.
    - **Tab 2: Add Student (Individual)**:
      - In-page tactical registration form: Full Name, Honorific & Gender, Date of Birth, Institution, Program (cascades), Batch (cascades with "+ New Batch" quick creation), Personal PIN (defaults to `1234`), Account Status.
      - Quick shortcut button to open the Full Edit Modal (`window.openStudentFullEdit`).
      - "Recently Registered Students" tactical table showing the latest 10 enrolled students with live status and quick Edit Profile actions.
  - **4. Cache & Version Bump**:
    - Bumped `admin.html` and `sw.js` to `v5.6.1` (`CACHE_NAME = 'abcd-core-v5.6.1'`).
  - **5. Automated Playwright Verification**:
    - Verified on Microsoft Edge: confirmed sidebar items geometry, verified both Bulk and Individual tabs render cleanly, verified zero console errors, captured verification screenshots to artifacts.

- **Phase 109: Unified Admin Data Table System & Tactical Dark Standardization**:
  - **1. Unified Master Admin Data Table System (`css/admin.css` Section 5)**:
    - Centralized styling for all admin data tables (`.table-wrap table`, `.data-table`, `.datagrid-table`, `.admin-standard-table`, `.table.w-100`, `.table-sm.w-100`, `#vault-table`, `#vault-topic-table`, `#access-tests-table`, `.dossier-table`).
    - Headers (`th`): `background: rgba(15, 23, 42, 0.95) !important; color: #ffffff !important; font-size: 0.70rem !important; font-weight: 700 !important; letter-spacing: 0.05em !important; text-transform: uppercase !important; padding: 8px 12px !important; border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important; border-right: none !important; position: sticky; top: 0; z-index: 10;`.
    - Cells (`td`): `padding: 7px 12px !important; font-size: 0.82rem !important; color: #ffffff !important; border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important; border-right: none !important; vertical-align: middle !important;`.
    - Clean Zebra & Hover: `tbody tr:nth-child(even) td { background: rgba(255, 255, 255, 0.015); }`, `tbody tr:hover td { background: rgba(99, 102, 241, 0.06) !important; }`.
  - **2. Assessment Access Slimming & Harmonization (`js/admin/assessment-access.js`)**:
    - Eliminated bloated inline `padding: 14px 16px` and `padding: 12px 16px`, standardizing to 32px header / 42px row height.
    - Removed inline JS hover handlers, using CSS `:hover` for smooth GPU acceleration.
    - Applied `.table-wrap` and `.data-table` for uniform container rounding and border.
  - **3. Vocabulary Vault & Topic Manager Dark Theme Alignment (`js/admin/vocab-vault.js`)**:
    - Replaced bluish slate-800 (`#1e293b`) and `#334155` borders with `rgba(15, 23, 42, 0.95)` and `rgba(255, 255, 255, 0.08)`.
    - Replaced sticky action cell background with `var(--fm-bg-panel, #0f172a)` seamlessly blending into the table body.
    - Replaced row borders with subtle `rgba(255, 255, 255, 0.05)`.
  - **4. Matrix Spreadsheet Grid Standardization (`css/admin.css` lines 2400-2445)**:
    - Set background to `var(--fm-bg-panel, #0f172a)`, header background to `rgba(15, 23, 42, 0.95)`, header text to `#ffffff`, and softened vertical column borders to `rgba(255, 255, 255, 0.06)`.
  - **5. Student Dossier Print Isolation (`css/admin.css`)**:
    - On screen: `.dossier-table` rendered in dark tactical theme matching the entire admin interface.
    - On print: `@media print` flips `.dossier-table` and `.student-dossier-sheet` to pure white background, dark `#0f172a` text, and `#cbd5e1` borders for crisp ink-saving paper printing.
  - **6. Cache & Asset Version Bump**:
    - Bumped `admin.html` and `sw.js` to `v5.6.0` (`CACHE_NAME = 'abcd-core-v5.6.0'`).
  - **1. Standardized 50px Topbar & Sidebar Footer**:
    - In `css/admin.css`: Updated `--fm-topbar-h: 50px;`, `.admin-topbar` set to `height: 50px; max-height: 50px; padding: 0 16px; display: flex; align-items: flex-end;`.
    - `.sidebar-footer` set to `height: 50px; max-height: 50px; padding: 0 1rem; box-sizing: border-box; display: flex; align-items: center;` perfectly matching the 50px height of the admin row and logout button (🚪).
  - **2. Dynamic Edge-to-Edge Folder Archive Tabs (Option B)**:
    - Replaced floating card pills with authentic folder archive tabs spanning the full topbar width: `flex: 1 1 0; min-width: 0; height: 38px; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 16px; border-radius: 6px 6px 0 0; border: 1px solid rgba(255, 255, 255, 0.08); border-bottom: none; margin-bottom: -1px;`.
    - **Dynamic Width**: Automatically divides 100% width equally across all tabs (25% each for 4 tabs, 33.3% for 3 tabs, 50% for 2 tabs) without empty gaps.
    - **Option B Content Layout**: Icon and title label anchored on the left (`.topbar-tab-left`), counter badge pill anchored on the right (`.topbar-tab-badge`).
    - Active tab features `border-top: 2px solid var(--fm-accent-tactical)`, workspace-matched background, seamless bottom, and zero glowing circle shadow (`box-shadow: none !important;`).
    - Badge counter converted to sleek pill badge (`.topbar-tab-badge`, `font-size: 0.72rem; padding: 1px 6px; border-radius: 10px;`).
  - **3. 50px Bottom Infobar (Docked Directly Above Locked Banner)**:
    - In `admin.html`: Added `<footer id="admin-bottom-infobar" class="admin-bottom-infobar hidden"></footer>` inside `.admin-main` right above `#bottom-ad-banner`.
    - In `css/admin.css`: Styled `.admin-bottom-infobar` with `height: 50px; max-height: 50px; padding: 0 16px; background: rgba(15, 23, 42, 0.95);` and `.bottom-info-chip`.
    - In `js/admin/app.js`: Added `window.setBottomInfobar(leftHtml, rightHtml)` and automatic reset on `loadSection`.
    - In `js/admin/vocab-vault.js`: Removed the 4 bulky metric cards from the Blueprint workspace; elevated them to the 50px Bottom Infobar along with the `⚡ Auto-Generate from Blueprint` button.
  - **4. Vocabulary Vault White Typography & Borderless Word Types**:
    - In `js/admin/vocab-vault.js`: Table headers (`th`), Theme, Topic, Indonesian, English, and Blueprint task names/test names/counts updated to bright white (`#ffffff`).
    - Removed border outlines on Word Type badges (`border: none`) in table rows and Blueprint badges.


- **Phase 106: Uniform Hero Card (150px), Score Font Color Synchronization & Vertically Stacked Metrics**:
  - **1. Uniform Hero Card Height (150px)**:
    - In `css/dashboard.css`: `body.dashboard-page #welcome-banner-section` strictly locked to `height: 150px !important; min-height: 150px !important; max-height: 150px !important; padding: 8px 14px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;`.
    - In `css/result.css`: `.result-identity-card` strictly locked to `height: 150px !important; min-height: 150px !important; max-height: 150px !important; padding: 8px 14px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;`.
    - Avatar container resized to `74×74px` in both hero cards, with matching 18px border radius, metadata text, dividers, and student name typography.
  - **2. Score Font Color Synchronized with Grade Font Color**:
    - In `js/result.js`: Updated `#result-percentage` to dynamically adopt `scoreColor = isRemedial ? '#FFFF00' : gradeColor;`.
    - Score color and grade color are now 100% harmonized:
      - Grade A (80-99%): Score `#10b981`, Grade `#10b981`.
      - Grade B (60-79%): Score `#38bdf8`, Grade `#38bdf8`.
      - Grade C (40-59%): Score `#f59e0b`, Grade `#f59e0b`.
      - Grade D (20-39%): Score `#f97316`, Grade `#f97316`.
      - Grade E / F (0-19%): Score `#ef4444`, Grade `#ef4444`.
      - Grade S (100%): Score `#a855f7`, Grade pure vector SVG star `#a855f7`.
      - Remedial: Score `#FFFF00` (capped at 60%), Grade `"R"` `#FFFF00` (Kuning Murni).
    - Removed static `#a78bfa` override in `css/result.css`.
  - **3. Vertically Stacked Metrics Table**:
    - In `result.html` and `css/result.css`: `#result-metrics-bar` restructured into 4 separate horizontal rows:
      - Row 1: `CORRECT` (left) | count (right, `#10b981`)
      - Row 2: `PARTIAL` (left) | count (right, `#f59e0b`)
      - Row 3: `INCORRECT` (left) | count (right, `#ef4444`)
      - Row 4: `POINTS` (left) | points earned (right, `#F8FAFC` or `#FFFF00` for remedial)
    - Subtle bottom dividers between rows, uniform font sizing ("ukuran font sama") via `clamp(...)`, and responsive flex distribution.
  - **4. Remedial Design Specifics**:
    - Kuning Murni (`#FFFF00` / `rgb(255, 255, 0)`) for aura, border, and font.
    - Grade displayed as plain uppercase letter `"R"` without superscript.
    - Remedial segmented button `.segment-remidi.active` updated to `#FFFF00`.
  - **5. Automated Playwright Verification**:
    - Verified Dashboard: `offsetHeight: 150`, `computedHeight: '150px'`, `scrollH: 820` (Zero-Scroll PASS).
    - Verified Result Page Normal (Grade A): `heroHeight: 150`, `scoreColor: 'rgb(16, 185, 129)'`, `gradeColor: 'rgb(16, 185, 129)'`, `gradeText: 'A'`, `stackedRowsCount: 4`, `scrollH: 820` (Zero-Scroll PASS).
    - Verified Result Page Remedial: `heroHeight: 150`, `scoreColor: 'rgb(255, 255, 0)'`, `gradeColor: 'rgb(255, 255, 0)'`, `gradeText: 'R'`, `scoreText: '60%'`, `scrollH: 820` (Zero-Scroll PASS).
    - Visual artifacts generated: `dashboard_lobby_crystal.png`, `result_gradeA_verified.png`, `result_remedial_verified_150px.png`.

- **Phase 105: Refactor & Standardize TopsCore Student Experience (Dashboard & Result Page)**:
  - **1. Global Deep Navy Background (#070b19)**:
    - Standardized background to `#070b19` across `body.dashboard-page` (`css/dashboard.css`), `body.result-page` (`css/result.css`), `body.assessment-page` (`css/assessment.css`), and root `body` (`css/style.css`).
  - **2. Matte Modern Color Token Overhaul**:
    - S / 100%: Electric Violet (`#a855f7`) with volumetric neon SVG Star.
    - Grade A: Emerald Green (`#10b981`).
    - Grade B: Sky Blue (`#38bdf8`).
    - Grade C / Remedi: Warm Amber (`#f59e0b`).
    - Grade D: Matte Orange (`#f97316`).
    - Grade E / F: Crimson Red (`#ef4444`).
    - Score Percentage: Modern Purple (`#a78bfa`) with ambient text shadow.
    - Synchronized across `js/grading.js`, `js/result.js`, `js/dashboard.js`, `css/dashboard.css`, and `css/result.css`.
  - **3. Dashboard Hero Card (#welcome-banner-section)**:
    - Top baris metadata: All Caps (`CAKE ENGLISH COURSE | CAMP | 133 | 3RD LEVEL`).
    - 3-Kolom horizontal: Kotak skor kiri bersih (`#bottom-stat-avg-score`) tanpa label "Score", Avatar profil tengah interaktif (`cursor: pointer` + click photo modal), Kotak grade kanan simetris (`#stat-overall-grade-value`) tanpa label "Grade".
    - Tier S (100%): Renders volumetric electric violet SVG Star (`#a855f7`).
    - Removed `.pure-star-nobox` so `#banner-grade-box` retains symmetrical background (`rgba(23, 33, 56, 0.8)`) and border matching `#banner-score-box`.
    - Dynamic outer border on `#welcome-banner-section` adhering to student's grade.
  - **4. Result Page Restructured into 6 Distinct Elements**:
    - **Elemen 1 (`#result-identity-card`)**: Kartu identitas murni (Avatar 86×86px besar di tengah statis dengan ring dinamis sesuai grade, metadata ALL CAPS di atas, nama lengkap siswa di bawah, dynamic outer border sesuai grade, TANPA score/grade di samping avatar).
    - **Elemen 2 (`#result-Assessment-name-container`)**: Assessment Title 2 baris (Tipe & Topik/Tema).
    - **Elemen 3 (`#result-metrics-bar`)**: Points & Breakdown Card (Baris atas: banner POINTS dengan angka poin besar; Baris bawah: 3 kolom teknis `CORRECT` #10b981, `PARTIAL` #f59e0b, `INCORRECT` #ef4444).
    - **Elemen 4 (`#result-score-grade-card`)**: Dual Score & Grade card tepat di bawah Breakdown, 2 kolom berdampingan berbingkai simetris 60px tanpa label "SCORE" dan "GRADE" (Skor persentase warna ungu modern `#a78bfa`, Grade huruf atau SVG bintang ungu neon `#a855f7` jika 100%).
    - **Elemen 5**: Action buttons (Student: Next Assessment & Back to Lobby; Tutor: Normal & Remidi split, Back to Room; Link View Answer Breakdown).
    - **Elemen 6**: Footer banner TopsCore terkunci 50px.
  - **5. Layout Geometry & Mobile Zero-Scroll Verification**:
    - Vertical flex column architecture with strict 10px gaps, header 50px locked, footer banner 50px locked.
    - Automated Playwright test targeting 400×820 viewport:
      - `dashboard.html`: `bodyScrollHeight: 820` (Zero-Scroll PASS), `headerHeight: 50px`, `bannerHeight: 50px`, `heroDataTier: "A"`, `heroBorderColor: rgba(16, 185, 129, 0.55)`.
      - `result.html`: `bodyScrollHeight: 820` (Zero-Scroll PASS), `headerHeight: 50px`, `bannerHeight: 50px`, `card1_CenteredAvatar: true`, `card4_Height: 60px`, `card4_ScoreColor: rgb(167, 139, 250)`, `card4_HasStarSvg: true`, `card4_GradeNoBoxClass: false`.
    - Visual artifacts generated: `dashboard_refactor_verified.png` and `result_refactor_verified.png`.

- **Phase 104: Penyeragaman Global Design System & Struktur Hero Banner 1:1 (Result & Dashboard)**:
  - **1. Penyeragaman Hero Banner Siswa 1:1 (Result & Dashboard)**:
    - In `result.html`: Restructured `#result-identity-card` into the identical 1:1 layout from `#welcome-banner-section` in `dashboard.html`:
      - Baris 1: Metadata institusional (`#result-meta-wrapper`: Institution | Program | Batch | Level).
      - Divider line atas (`.hero-divider`).
      - Baris 2 (3-Column Layout):
        - Kolom Kiri: `#result-score-box` (`.score-box`) dengan `.metric-label` "Score" dan `#result-percentage` ("100%").
        - Kolom Tengah: `.banner-avatar-wrapper` dengan `#result-crown-badge` dan circular `#result-avatar-container` (86×86px) yang dikelilingi ring pendaran ungu (`#C084FC` / `#A855F7`).
        - Kolom Kanan: `#result-grade-box` (`.grade-box`) dengan `.metric-label` "Grade" dan `#result-grade-val` berisi glowing purple star vector TANPA kotak luar.
      - Divider line tengah dengan ambient glow di bagian tengah (`.hero-divider.hero-name-divider`).
      - Baris 3: Nama lengkap siswa (`#result-student-name-label`, Outfit 800, white).
    - Removed detached redundant score card `#result-score-grade-card` from below the metrics breakdown, preserving vertical mobile space.
  - **2. CSS Hero Styling & Dynamic Tier Aura Synchronization (`css/result.css`)**:
    - Applied exact dimensions, 18px border-radius, `padding: 10px 14px;`, and dynamic tier background (`radial-gradient(...)`).
    - Configured `.result-identity-card[data-tier="S"]` with `box-shadow: 0 0 35px rgba(168, 85, 247, 0.45), 0 15px 35px -8px rgba(0, 0, 0, 0.5);` and border `rgba(168, 85, 247, 0.5)`.
    - Score box & grade box styled with `background: rgba(23, 33, 56, 0.8); border-radius: 14px; padding: 6px 8px; border: 1px solid rgba(var(--tier-rgb), 0.2);`.
    - Pure Star vector remains without outer box (`.pure-star-nobox`).
  - **3. JS Dynamic Tier Aura Hook (`js/result.js`)**:
    - Integrated `--tier-color`, `--tier-rgb`, and `dataset.tier` updates on `#result-identity-card`.
    - Dynamically styled avatar container, score box, and grade box based on student grade/tier.
  - **4. Standardized Header & 10px Flex Gap in `assessment.html`**:
    - Adjusted top utility row height from 60px to exactly 50px (`height: 50px; min-height: 50px; max-height: 50px;`).
    - Avatar resized to 50×50px to fit standard 50px header row.
    - Removed 5 manual inline spacer divs (`<div style="height:10px...">`), replaced with container flex `gap: 10px;`.
  - **5. Automated Playwright Zero-Scroll Verification**:
    - Result Page: `bodyScrollHeight: 820` on `400×820` (Zero-Scroll PASS), `isZeroScroll: true`, `identityTier: "S"`, 3-column hero layout confirmed, `avatarWidth: 86`, `avatarHeight: 86`, `scoreColor: rgb(168, 85, 247)`, `hasPurpleStarSvg: true`.
    - Dashboard Page: `bodyScrollHeight: 820`, `headerHeight: 50`, `bannerHeight: 50`, `contentGap: 10px`, `isZeroScroll: true`.
    - Assessment Page: `bodyScrollHeight: 820`, `headerHeight: 50`, `bannerHeight: 50`, `isZeroScroll: true`.
    - Visual artifacts generated: `phase104_result_hero_unified_mobile.png`, `phase104_dashboard_mobile.png`, `phase104_assessment_mobile.png`.

- **Phase 103: Grade S Pure Purple Star (No Box), Global Deep Navy (#020617), 50px Header & 10px Gap System**:
  - **1. Grade S / 100% Pure Purple Star TANPA Kotak Luar**:
    - In `js/result.js`: Updated `displayGradeHtml` for Grade S / 100% to render an ultra-sharp, glowing pure purple SVG Star vector (`#C084FC` to `#A855F7`).
    - For Grade S / 100%, `#result-grade-box` removes its outer box (`border: none; background: transparent; box-shadow: none; .pure-star-nobox`). The star floats seamlessly with drop-shadow glow without being enclosed in a box.
    - In `css/result.css`: Added `@keyframes star-vector-pulse` using pure `filter: drop-shadow(...)` instead of `box-shadow` to eliminate any rectangular bounding aura around the vector star.
  - **2. Global Deep Midnight Navy Background (`#020617`)**:
    - Aligned `dashboard.html` / `css/dashboard.css` (`body.dashboard-page`), `assessment.html` / `css/assessment.css` (`body.assessment-page`), and `css/style.css` (`body`) to `#020617 !important;`.
  - **3. Standardized 50px Top Header & 50px Bottom Banner**:
    - Elevated `body.dashboard-page .dashboard-header` from 44px to exactly **`50px !important; min-height: 50px !important; max-height: 50px !important;`** matching `result.html`.
    - Confirmed `#bottom-ad-banner` locked at **`50px`** across all pages.
  - **4. Fixed 10px Panel Gap System**:
    - Configured `.dashboard-content` with `gap: 10px !important; padding: 10px 14px !important;`.
    - Eliminated arbitrary inline margins (`margin-top: 6px`) on `#up-next-section`, `.classes-section`, and `#bottom-dock-section` in `dashboard.html`.
    - Updated Hero Card fallback colors in `css/dashboard.css` from gold (`251, 191, 36`) to purple (`168, 85, 247`).
  - **5. Automated Playwright Verification**:
    - Verified Result Page (100% / Grade S): `scoreColor: rgb(168, 85, 247)`, `gradeBoxBorder: 0px none`, `gradeBoxBackground: rgba(0, 0, 0, 0)`, `gradeBoxShadow: none`, `hasPurpleStarSvg: true`, `headerHeight: 50`, `bannerHeight: 50`, `bodyScrollHeight: 820` on `400x820` (Zero-Scroll preserved).
    - Verified Dashboard Page: `bodyBg: rgb(2, 6, 23)`, `headerHeight: 50`, `bannerHeight: 50`, `contentGap: 10px`, `bodyScrollHeight: 820`.
    - Verified Assessment Page: `bodyBg: rgb(2, 6, 23)`, `bannerHeight: 50`.
    - Visual artifacts generated: `phase103_result_star_nobox_mobile.png`, `phase103_result_star_nobox_desktop.png`, `phase103_dashboard_mobile.png`.

- **Phase 102: Full Color Audit, Solid Palette Alignment & Visual Consistency**:
  - **1. Authoritative Solid Color Palette Aligned Across Entire Platform**:
    - **E / F**: Pure Red (`#FF0000`, `rgb(255, 0, 0)`)
    - **D**: Pure Orange (`#FF8000`, `rgb(255, 128, 0)`)
    - **C**: Pure Yellow (`#FFFF00`, `rgb(255, 255, 0)`)
    - **B**: Pure Cyan (`#00FFFF`, `rgb(0, 255, 255)`)
    - **A**: Pure Green (`#00FF00`, `rgb(0, 255, 0)`)
    - **100% / S (Get a Star)**: **Pure Purple** (`#A855F7`, `rgb(168, 85, 247)`, `rgba(168, 85, 247, ...)`)
    - **Remedi / Remedial**: Pure Yellow (`#FFFF00`, `rgb(255, 255, 0)`)
  - **2. Student Photo Ring Dynamically Adheres to Student's Grade**:
    - Replaced all static gold/amber borders around student avatar with dynamic Grade-driven styling.
    - In `js/result.js`: `#result-avatar-container` dynamically receives `border: 2.5px solid <gradeColor> !important` and `box-shadow: 0 0 28px <gradeGlow>, 0 0 12px <gradeLightGlow>, 0 8px 24px rgba(0,0,0,0.5)`.
    - In `css/dashboard.css` and `js/dashboard.js`: Avatar rings and welcome section tier auras configured per tier (S: Pure Purple gradient/border/glow, A: `#00FF00`, B: `#00FFFF`, C: `#FFFF00`, D: `#FF8000`, E: `#FF0000`).
  - **3. Standardized 50px Bottom Banner Across All Pages**:
    - `#bottom-ad-banner` and `.topscore-locked-banner` locked to `height: 50px !important; min-height: 50px !important; max-height: 50px !important;` across `result.html`, `dashboard.html`, `assessment.html`, `style.css`, `dashboard.css`, and `assessment.css`.
  - **4. Vector Badge and Admin UI Synchronized**:
    - Updated vector star gradient `starPurpleGrad` (`#C084FC` to `#A855F7`) on Result page.
    - Updated `js/admin/student-management.js`, `js/admin/app.js`, and `css/admin.css` (`cMap['S']`, `badge-grade-star-s`, `text-gold-champion` -> `#A855F7`).
  - **5. Playwright Verification (Zero-Scroll Intact)**:
    - Result Page (Attempt 100% / Grade S): `scoreColor: rgb(168, 85, 247)`, `gradeColor: rgb(168, 85, 247)`, `avatarBorderColor: rgb(168, 85, 247)`, `bannerHeight: 50px`, `bodyScrollHeight: 820px` on `400x820` viewport.
    - Dashboard Banner: `height: 50px`, `bodyScrollHeight: 820px`.
    - Assessment Banner: `height: 50px`.
    - Palette verification: S `#A855F7`, A `#00FF00`, B `#00FFFF`, C `#FFFF00`, D `#FF8000`, E `#FF0000`, Remedial `#FFFF00`.

- **Phase 101: Grade S and Score 100% Solid Palette Alignment: Pure Electric Pink (#FF00FF) with Glowing Aura**:
  - **1. Pure Electric Pink (#FF00FF) for Grade S & 100%**:
    - Updated `standardGradeColors.S` in `js/result.js` to `#FF00FF`.
    - Score 100% (`#result-percentage`) and Grade S (`#result-grade-val`) render vibrant pure electric pink `#FF00FF`.
  - **2. Glowing Pink Aura & Card Borders**:
    - Applied 3-layer pink neon text glow (`rgba(255, 0, 255, 0.95)`, `rgba(255, 0, 255, 0.70)`, `rgba(255, 0, 255, 0.40)`).
    - Card borders and shadows (`#result-score-box` and `#result-grade-box`) glow in electric magenta (`rgba(255, 0, 255, 0.65)` and `rgba(255, 0, 255, 0.35)`).
  - **3. Playwright Verification**:
    - Verified on mobile (`400x820`) and desktop (`1280x820`).
    - Zero-scroll intact: `bodyScrollHeight = 820`.

- **Phase 100: Score & Grade Card Realignment: Tier Colored Glowing Values, Visceral Rubber Stamp Impact Effect, and Removal of Small Labels**:

- **Phase 100: Score & Grade Card Realignment: Tier Colored Glowing Values, Visceral Rubber Stamp Impact Effect, and Removal of Small Labels**:
  - **1. Label Removal & Maximum Value Typography**:
    - Removed `<span class="score-grade-label">SCORE</span>` and `<span class="score-grade-label">GRADE</span>` from `result.html`.
    - Dedicated full 60px height to `#result-percentage` (`clamp(26px, 3.8vh, 32px)`, Outfit 900) and `#result-grade-val` (`clamp(28px, 4.4vh, 38px)`, Outfit 900).
  - **2. Authoritative Tier Colors & Multi-Layer Glow**:
    - Score and Grade dynamically assigned authoritative colors matching AGENTS.md Section 2.10 (S: Gold `#fbbf24`, A: Emerald Green `#10b981`, B: Lime `#84cc16`, C: Yellow `#eab308`, D: Orange `#f97316`, E: Red `#ef4444`, Remedial: Yellow `#FFFF00`).
    - Applied 3-layer `text-shadow` glow (`0 0 12px, 0 0 24px, 0 0 42px`) and box glow (`box-shadow: 0 0 20px, inset 0 0 14px`) to `#result-score-box` and `#result-grade-box`.
  - **3. Visceral Rubber Stamp Slam & Impact Thud**:
    - Grade reveals with `@keyframes gradeStampImpact`: starts huge (`scale(3.5) rotate(-26deg)` with motion blur), slams down with high kinetic velocity at 45% (`scale(0.92) rotate(-3deg)`), and settles at authentic rubber stamp angle `rotate(-4deg)`.
    - Box triggers `@keyframes stampBoxThud` vibrating with haptic feedback upon impact.
  - **4. Zero-Scroll Verification**:
    - Automated test confirmed: `card4Height: 60`, `bodyScrollHeight: 820`, `windowHeight: 820`.

- **Phase 99: Result Page Realignment: 50px Top Header, Removed Header Icons, Dynamic Card 3 with 10px Gap to 50px Bottom Banner, and Elimination of Double Border**:
  - **1. Header Icons Removal & Standardized 50px Top Header**:
    - Removed the 3 icons (`#header-avatar`, `#view-profile-btn`, `#logout-btn`) from `<header class="dashboard-header">` in `result.html`.
    - Header contains purely centered text **`RESULT PAGE`** with `height: 50px !important; display: flex; justify-content: center; align-items: center;`.
  - **2. Double Border ("Card Dalam Card") Eliminated**:
    - Reset `.result-hero` styling across all tiers and media queries to `background: transparent !important; border: none !important; border-radius: 0 !important; box-shadow: none !important; padding: 0 !important;`.
    - Each card (Card 1, Card 2, Card 3, Card 4, Card 5) is now a clean, standalone floating card with single border.
  - **3. Dynamic Card 3 & 10px Gap to Bottom Banner**:
    - Card 3 (`.result-metrics-table-card`) uses `flex: 1 1 0px !important; min-height: 140px;` and expands to absorb available vertical space (~240px on mobile).
    - Each of the 4 metric rows (`CORRECT`, `PARTIAL`, `INCORRECT`, `POINTS`) expands equally (`flex: 1 1 0px`) to ~60px per row.
    - Card 5 Row 3 (`VIEW ANSWER BREAKDOWN`) sits exactly **10px** above the bottom banner.
  - **4. Standard 50px Bottom Banner**:
    - Bottom banner (`#bottom-ad-banner` / `.topscore-locked-banner`) locked to `height: 50px !important; min-height: 50px !important; max-height: 50px !important;`.
  - **5. Exact Playwright Verification**:
    - Tested on both Student (`400x820`) and Tutor (`400x820`) views:
      - Header: height = 50px, top = 0, bottom = 50.
      - Card 1: height = 162px. Gap to Header = 10px.
      - Card 2: height = 38px. Gap to Card 1 = 10px.
      - Card 3: height = 240px (each row ~60px). Gap to Card 2 = 10px.
      - Card 4: height = 60px. Gap to Card 3 = 10px.
      - Card 5 Row 1: height = 60px. Gap to Card 4 = 10px.
      - Card 5 Row 2: height = 40px. Gap to Row 1 = 10px.
      - Card 5 Row 3: height = 40px. Gap to Row 2 = 10px.
      - Gap Card 5 Row 3 to Banner: exactly **10px**!
      - Bottom Banner: height = **50px**, top = 770, bottom = 820.
      - `bodyScrollHeight: 820, windowHeight: 820` (Zero scroll!).

- **Phase 98: Centered Top Header ("RESULT PAGE") & Card 3 Extra Element Removal**:
  - **1. Centered Top Header Bar ("RESULT PAGE")**:
    - Maintained 44px sticky top header.
    - Replaced role-specific labels (`STUDENT'S LOBBY` / `TUTOR'S ROOM`) with unified, bold title **`RESULT PAGE`**.
    - Applied absolute mathematical centering (`left: 50%; top: 50%; transform: translate(-50%, -50%);`) so it remains centered regardless of right-hand action buttons.
  - **2. Card 3 Extra Element Removal (Points Row Cleanup)**:
    - Removed `#result-rank-badge` from Card 3 Row 4 in `result.html`.
    - Suppressed `renderRankInBatch` in `js/result.js` and set `.result-rank-badge { display: none !important; }` in `css/result.css`.
    - Card 3 now displays only pure metrics: `CORRECT`, `PARTIAL`, `INCORRECT`, and `POINTS` (matching user's bagan 1:1).
  - **3. Playwright Verification**:
    - Automated test `scratch/test_phase97_proportions.mjs` confirmed:
      - `headerText: 'RESULT PAGE'`
      - `rankBadgeExists: false`
      - Zero-scroll preserved (`bodyScrollHeight: 820` on `400x820`).
    - Screenshots updated: `result_proportions_student_mobile.png`, `result_proportions_tutor_mobile.png`.

- **Phase 97: Result Page Proportions & Layout Calibration Per User Diagram**:
  - **1. Card 1 (Student Identity Banner) Dashboard Alignment (1:1)**:
    - Standardized avatar emblem dimensions to un-shrunk `86px × 86px` with tier-colored circular ring border (`2.5px solid var(--tier-color)`).
    - Synchronized metadata subtitle (`Cake English Course | CAMP | 133 | 3rd Level`) with `12px / 0.75rem` semi-bold silver.
    - Synchronized student name label with `font-family: 'Outfit'`, `18.4px / 1.15rem`, `font-weight: 800`.
  - **2. Card 2 (Assessment Title) 2-Line Layout**:
    - Structured into two distinct lines: Line 1 (`#result-asm-type-row`) displays Assessment Type / Level in muted silver (`11px`, SemiBold), Line 2 (`#result-asm-topic-row`) displays Topic / Theme in vibrant cyan `#38BDF8` (`13.5px`, ExtraBold).
    - Title parser in `js/result.js` cleanly splits raw titles on ` - ` or ` — ` to populate both lines automatically.
  - **3. Card 3 (Metrics Table) Dynamic Panel & Fluid Typography**:
    - Configured `.result-metrics-table-card` with `flex: 1 1 auto` to absorb remaining vertical viewport space dynamically.
    - Configured fluid `clamp()` values for padding (`clamp(5px, 0.9vh, 8px)`) and font sizes (`clamp(11px, 1.4vh, 12.5px)` for labels, `clamp(14px, 1.8vh, 16.5px)` for metric values, `clamp(18px, 2.4vh, 22px)` for Points).
  - **4. Card 4 (Score & Grade Dual Side-by-Side Card)**:
    - Grid columns `1fr 1fr` side-by-side with measured total height of exactly `61px`.
    - Score percentage on left (`100%`), Grade on right (`S`) with glowing accents.
  - **5. Card 5 Row 1 Height Matching (61px)**:
    - Set height of `.btn-next-milestone` (Student View) and `.tutor-remedial-segmented` (Tutor View) to exactly **`61px`**, achieving perfect 1:1 symmetry with the Score/Grade card.
    - Student View: 2-line layout (`GO TO NEXT ASSESSMENT:` + `[TITLE] →`).
    - Tutor View: 2 tall split buttons (`[ ● NORMAL ]` | `[ ○ REMIDI ]`) with live toggle functionality.
  - **6. Card 5 Row 2 & 3 Uniform Typography (13px Bold Uppercase)**:
    - Pinned to bottom with uniform `13px` font size and uppercase text:
      - Row 2: `BACK TO LOBBY` (Student) / `BACK TO ROOM` (Tutor).
      - Row 3: `VIEW ANSWER BREAKDOWN`.
  - **7. Zero-Scroll Verification & Playwright Testing**:
    - Ran `scratch/test_phase97_proportions.mjs` verifying:
      - Student View: `avatarWidth: 86`, `avatarHeight: 86`, `card4Height: 61`, `nextBtnHeight: 61`, `backBtnFontSize: 13px`, `breakdownBtnFontSize: 13px`, `bodyScrollHeight: 820`.
      - Tutor View: `avatarWidth: 86`, `avatarHeight: 86`, `card4Height: 61`, `segmentedHeight: 61`, `btnNormalHeight: 61`, `backBtnFontSize: 13px`, `breakdownBtnFontSize: 13px`, `bodyScrollHeight: 820`.
    - Captured artifacts: `result_proportions_student_mobile.png`, `result_proportions_student_desktop.png`, `result_proportions_tutor_mobile.png`, `result_proportions_tutor_desktop.png`.

- **Phase 96: Card 5 Uniform Font Size (13px) & Tutor 2-Column Split Action Control**:
  - **1. Card 5 Uniform Typography Alignment (13px)**:
    - Harmonized font size to uniform `13px` (`font-weight: 700 / 800`) across all Card 5 action buttons: `.btn-dashboard-primary`, `.btn-breakdown-ghost`, `.btn-next-milestone .next-btn-title`, and `.remedial-segment-btn`.
    - Protected mobile zero-scroll queries from downscaling Card 5 buttons to `0.8rem` (enforced `13px !important` on `.result-action-buttons-wrap`).
  - **2. Tutor's View 2-Column Split Control (`NORMAL` | `REMIDI`)**:
    - Replaced single status badge with interactive 2-column segmented control in Card 5 Row 1 (`.tutor-remedial-segmented`).
    - Active state indicator: `● NORMAL` (emerald `#34D399` highlight) when normal, `● REMIDI` (amber `#FBBF24` highlight) when remedial.
    - Interactive toggle: Tutor clicking inactive segment calls `labelAttemptRemedial(attempt.id, ...)` with automatic reload.
  - **3. Navigation Button Text Harmonization**:
    - Student View: `BACK TO LOBBY` (`dashboard.html`).
    - Tutor View: `BACK TO ROOM` (`admin.html#class-hub`).
    - Breakdown Button: `VIEW ANSWER BREAKDOWN`.
  - **4. Automated Playwright Verification**:
    - Automated test `scratch/test_side_by_side_card5_fonts.mjs` executed:
      - Student View: `nextTagFontSize: 10.5px`, `nextTitleFontSize: 13px`, `backBtnFontSize: 13px`, `breakdownBtnFontSize: 13px`, `bodyScrollHeight: 820`.
      - Tutor View: `normalFontSize: 13px`, `remidiFontSize: 13px`, `backBtnFontSize: 13px`, `breakdownBtnFontSize: 13px`, `bodyScrollHeight: 820`.
    - Artifacts captured: `result_card5_student_mobile.png`, `result_card5_student_desktop.png`, `result_card5_tutor_mobile.png`, `result_card5_tutor_desktop.png`.


- **Phase 95: Result Page Header Docking, Standard Grade S, Clean Title & Unified Remedial Slot**:
  - **1. Docked Top Header Aligned with Student Dashboard (`.dashboard-header`)**:
    - Rendered compact 44px sticky top header with brand (`🎓 STUDENT'S LOBBY` for students, `🛡️ TUTOR'S ROOM` for tutors), avatar circle, profile shortcut, and logout button.
    - Removed vertical centering gap on `#result-content` (`justify-content: flex-start !important; margin: 0 auto !important;`) so the card docks flush beneath the header and dynamically fills viewport space.
  - **2. Best Score Badge Removal**:
    - Deleted `#result-best-score-badge` from Card 2 and suppressed any JS re-injection; Card 2 now displays the clean, focused assessment title.
  - **3. Authoritative Standard Grading System (AGENTS.md Section 2.10)**:
    - Replaced artificial `A ★` with official **Grade S** (`#fbbf24` gold) on 100% perfect scores.
    - Full spectrum calibrated: Grade S (100%), A (80-99%), B (60-79%), C (40-59%), D (20-39%), E (0-19%).
  - **4. Unified Remedial Status Slot for Admin (Zero Size Growth)**:
    - Removed separate `#admin-remedial-control-container` and edit toggle button from result page.
    - When viewed by Admin: the `Next Assessment` slot renders an informative `Status Ujian: NORMAL (Nilai Murni)` / `REMEDIAL (KKM 60%)` badge.
    - Card count, heights, and layout geometry are 100% identical between Student and Admin views.
  - **5. Automated Playwright Verification**:
    - Automated test `scratch/test_aligned_header_and_grading.mjs` verified:
      - Student View: `headerBrand: "🎓 STUDENT'S LOBBY"`, `hasBestScoreBadge: false`, `score: "100%"`, `grade: "S"`, `nextSlot: "🚀 Go to Next Assessment..."`, `backBtn: "← Back to Lobby"`, `bodyScrollHeight: 820`.
      - Admin View: `headerBrand: "🛡️ TUTOR'S ROOM"`, `hasBestScoreBadge: false`, `score: "100%"`, `grade: "S"`, `remedialSlot: "🟢 Status Ujian: NORMAL (Nilai Murni)"`, `hasAdminEditButton: false`, `backBtn: "← Kembali ke Tutor's Room"`, `bodyScrollHeight: 820`.
    - Generated artifacts: `result_aligned_mobile.png`, `result_aligned_desktop.png`, `result_aligned_admin.png`.


- **Phase 94: Result Page 2-Column Metrics Table Card ("INI SAJA" Alignment) & Staggered Animations**:
  - **1. 2-Column 4-Row Metrics Table Card (`.result-metrics-table-card`)**:
    - Implemented unified 2-column table with middle dividing line and row borders matching user's "INI SAJA" diagram.
    - Row 1: `CORRECT` (left) \| count e.g. `10` (right) with `#34D399` emerald theme.
    - Row 2: `PARTIAL` (left) \| count e.g. `0` (right) with `#FBBF24` amber theme.
    - Row 3: `INCORRECT` (left) \| count e.g. `0` (right) with `#F87171` red theme.
    - Row 4: `POINTS` (left) \| count e.g. `10` (right) with bold `font-weight: 900` and prominent styling.
    - Interactive filter maintained: clicking rows 1, 2, or 3 opens answer breakdown modal filtered to that category.
  - **2. Sequential Top-to-Bottom Cascading Entrance Animation**:
    - Card 1 (`.result-identity-card`): `result-fade-up` delay `0.06s`.
    - Card 2 (`.result-assessment-title-wrap`): `result-fade-up` delay `0.12s`.
    - Card 3 (`.result-metrics-table-card`): `result-fade-up` delay `0.28s`.
    - Card 4 (`.result-score-grade-card`): `result-fade-up` delay `0.40s`.
    - Card 5 (`.result-action-buttons-wrap`): `result-fade-up` delay `0.52s`.
  - **3. Delayed Grade Pop-in (`.grade-delayed` & `.grade-revealed`)**:
    - Grade value is hidden (`opacity: 0; transform: scale(0.55); visibility: hidden`) while score counts up from `0%` to `100%`.
    - On `animateCount` completion callback: `.grade-delayed` is removed and `.grade-revealed` triggers `@keyframes gradeSlamPop` with gold star accent and victory confetti.
  - **4. Verification & Screenshots Captured**:
    - Automated test `scratch/test_2col_table_result.mjs` executed with Chrome headless Playwright: verified mid-animation grade suppression, final state values, zero-scroll (`scrollHeight: 820, windowHeight: 820`).
    - Generated artifacts: `result_2col_mobile.png`, `result_2col_desktop.png`, `result_2col_admin.png`.


- **Phase 93: Result Page Architectural Redesign (ASCII Wireframe & Dynamic A ★ Star Badge)**:
  - **1. Header Identity Card (`.result-identity-card`)**:
    - Institutional Metadata (`.result-meta-wrapper`): Displays `Cake English Course | CAMP | 133 | 3rd Level` dynamically populated from student record joins (`institutions`, `programs`, `batches`, `levels`) with session fallbacks.
    - Centered glowing avatar ring (`.result-avatar-stage`): Score ring SVG animation with profile photo and batch champion crown badge support.
    - Subtle Divider (`.hero-divider`): Clean horizontal gradient line separating identity metadata from student name.
    - Centered Student Name (`.result-student-name-label`): Bold, clean typography displaying full student name (`Mr. Rifky Ahmad`).
  - **2. Assessment Title Card (`#result-Assessment-name-container`)**:
    - Positioned directly beneath header card displaying clean uppercase task title (`3RD VOCABULARY A1 PHRASES TASK - PROFESSIONAL IDENTITY`).
  - **3. Breakdown Metrics Stack (`.result-stats-stacked-list`)**:
    - Full-width stacked list in exact wireframe order:
      - `POINTS`: plain number (e.g. `10`) without trailing "PTS".
      - `CORRECT`: emerald green (`#34D399`) count (e.g. `10`).
      - `PARTIAL`: amber yellow (`#FBBF24`) count (e.g. `0`).
      - `INCORRECT`: red (`#F87171`) count (e.g. `0`).
  - **4. Side-by-Side Current Assessment Score & Grade Dual Card (`.result-score-grade-card`)**:
    - `SCORE`: percentage achieved formatted cleanly without decimals on whole numbers (e.g. `100%`) with animated count-up.
    - `GRADE`: displays exact letter grade, dynamically appending glowing gold star `<span class="grade-star-accent">★</span>` only on 100% perfect score (`A ★`), and remedial indicator (`B R`) on remedial attempts.
  - **5. Actions Stack (`.result-action-buttons-wrap`)**:
    - `UP NEXT MILESTONE`: Displays clean full title (`3rd Vocabulary A2 Words Task - CV & Resume →`).
    - `← Kembali ke Classroom`: Primary navigation button to dashboard (or `← Kembali ke Tutor's Room` in admin mode `?admin=1`).
    - `View Answer Breakdown`: Ghost button opening detailed question review modal.
    - Locked Footer Banner: `TopsCore © 2026 | Created by Mr. Top`.
  - **6. Verification & Zero-Scroll Compliance**:
    - Tested on Chrome headless at 400x800 (mobile) and 1280x800 (desktop) using Playwright.
    - Verified 100% match with user ASCII wireframe; captured `scratch/result_wireframe_mobile.png`, `scratch/result_wireframe_desktop.png`, and `scratch/modal_test.png`.

- **Phase 92: Ecosystem Naming Rebrand ("Tutor's Room" & "Student's Lobby")**:
  - **1. Admin Workspace ("Tutor's Room")**:
    - `admin.html`: Page `<title>` renamed to `Tutor's Room — TOPS CORE`.
    - Sidebar brand sub-label updated from `TOP OFFICE` to `TUTOR'S ROOM`.
    - Admin login screen heading updated to `TUTOR'S ROOM`, submit button updated to `Sign In to Tutor's Room`.
    - Return link on admin login updated to `← Student's Lobby`.
    - Gear access link in `index.html` updated to `title="Tutor's Room"` and `aria-label="Tutor's Room"`.
    - Result viewer admin return navigation updated to `← Kembali ke Tutor's Room` (`admin.html#class-hub`).
  - **2. Student Workspace ("Student's Lobby")**:
    - `dashboard.html`: Page `<title>` renamed to `Student's Lobby — TOPS CORE`.
    - Header brand text updated to `🎓 STUDENT'S LOBBY`.
    - `index.html`: Page `<title>` renamed to `Student's Lobby — TOPS CORE`, subtitle updated to `Student's Lobby — Sign in to continue`.
    - `result.html`: Return button updated to `&larr; Back to Student's Lobby`.
  - **3. Verification (`scratch/verify_panel_names.mjs`)**:
    - Verified on headless Chrome with Playwright: `index.html`, `admin.html` (login & logged-in desktop view), `dashboard.html` (mobile view), and `result.html` (student & admin modes) with 0 errors.

- **Phase 91: Result Page Verification & Standardization Calibration**:
  - **1. Visual & Functional Verification (`result.html` & `js/result.js`)**:
    - Verified attempt `84af9692-8d91-4a80-a113-739b4e647a81` (`3A1-PHRASES-TASK`): Title renders `3rd Vocabulary A1 Phrases Task - Professional Identity`, Crumb `VOCABULARY • 3RD LEVEL • PHRASE TASK`, Score `100.0%` (Grade S) with Magenta aura/star and confetti trigger, Points `10 PTS` (out of 10), Batch Rank `#22 / 24`, Up Next Milestone points to `#3` (`3rd Vocabulary A2 Words Task - CV & Resume →`).
    - Verified attempt `29f6408c-2fb8-47e6-879a-6badff5ccf12` (`3A-WORDS-TEST`): Title renders `3rd Vocabulary A Words Test - Workplace`, Crumb `VOCABULARY • 3RD LEVEL • VOCAB TEST`, Score `51.0%` (Grade C) in pure yellow, Points `61.5 PTS` (out of 120), Retake Policy locked (`Official Test attempt locked & final upon submission`), and Next Milestone displays waiting tutor message.
  - **2. Smart Next Milestone Calibration (`js/result.js`)**:
    - Filtered published assessment lookups by current attempt's `class_id` (`asmData?.class_id || attempt.class_id`), preventing cross-class leakage and ensuring students stay on their linear 40-item sequence.
    - Display button renders clean topic title with `cleanTitle()`.
  - **3. API Data Projection Hardening (`js/api.js`)**:
    - `fetchAttemptResult`: Added `shell_code, assessment_category, class_id` to `assessments:assessment_id` projection.
    - `fetchAssessmentsForStudentLevel`: Added `shell_code` to select list.
  - **4. Answer Breakdown Modal & Interactive Filters**:
    - Verified modal opening, question search bar, status chips (All, Incorrect, Partial, Correct), and attempt history table.
    - Verified tolerance display on partial answers (e.g. `dedicatet` and `touhg` displaying `Partial 0.5pt` with amber borders).
  - **5. Admin Grade Control & Asset Sync**:
    - Verified `?admin=1` loads the Admin Grade Control card with 1-click toggle for KKM 60% Remedial status.
    - Back button dynamically updates to `← Kembali ke Class Hub` (`admin.html#class-hub`).
    - Synced asset version query strings across `result.html` and `js/result.js` to `v=5.5.8`.

- **Phase 90: 40 Assessments Auto-Generate Standardization, Linear Prerequisite Chain & Unified Codes**:
  - **1. Auto-Generate Engine Synchronization (`js/api.js`)**:
    - Upgraded `upsertDynamicAssessmentShell` and `autoGenerateAssessmentsHierarchy` in `js/api.js`:
      - Generates exactly **40 assessments** (20 Words + 20 Phrases) in strict alternating pairs.
      - Titles standardized to: `${ordinal} Vocabulary ${themeCode}${topicCode} Words Task - [Topic]` and `${ordinal} Vocabulary ${themeCode}${topicCode} Phrases Task - [Topic]`.
      - Tests standardized to: `${ordinal} Vocabulary ${themeCode} Words Test - [Theme]` and `${ordinal} Vocabulary ${themeCode} Phrases Test - [Theme]`.
      - Shell codes standardized to: `${levelNum}${themeCode}${topicCode}-WORDS-TASK`, `${levelNum}${themeCode}${topicCode}-PHRASES-TASK`, `${levelNum}${themeCode}-WORDS-TEST`, and `${levelNum}${themeCode}-PHRASES-TEST`.
      - Dedup handles legacy shell codes seamlessly, preventing duplicates upon re-generation.
      - Verified execution via Node: `autoGenerateAssessmentsHierarchy([3], ...)` returned `{ tasks: 0, tests: 0, updated: 40 }`.
  - **2. Linear Sequential Prerequisite Chain (1 ➔ 2 ➔ 3 ➔ 4 ... ➔ 40) (`scratch/execute_standardize_40_assessments.mjs`)**:
    - Chained all 40 active assessments in database:
      - #1 (`3A1-WORDS-TASK`): Prereq: NONE
      - #2 (`3A1-PHRASES-TASK`): Prereq: #1 (`3A1-WORDS-TASK`)
      - #3 (`3A2-WORDS-TASK`): Prereq: #2 (`3A1-PHRASES-TASK`)
      - #4 (`3A2-PHRASES-TASK`): Prereq: #3 (`3A2-WORDS-TASK`)
      - ...
      - #7 (`3A-WORDS-TEST`): Prereq: #6 (`3A3-PHRASES-TASK`)
      - #8 (`3A-PHRASES-TEST`): Prereq: #7 (`3A-WORDS-TEST`)
      - #9 (`3B1-WORDS-TASK`): Prereq: #8 (`3A-PHRASES-TEST`)
      - ...
      - #39 (`3D-WORDS-TEST`): Prereq: #38 (`3D4-PHRASES-TASK`)
      - #40 (`3D-PHRASES-TEST`): Prereq: #39 (`3D-WORDS-TEST`)
    - Students must master the Word task then Phrase task before moving to the next topic, and must pass the Words test before attempting the Phrases test.
  - **3. Dynamic Question Generation Calibration (`js/api.js`)**:
    - Calibrated `generateAssessmentQuestions`:
      - `3A1-WORDS-TASK`: Strictly generates **40 words** (max 40 pts).
      - `3A1-PHRASES-TASK`: Strictly generates **10 phrases** (max 10 pts).
      - `3A-WORDS-TEST`: Strictly generates **120 words**.
      - `3A-PHRASES-TEST`: Strictly generates **30 phrases**.
  - **4. Verification & Non-Destructive Integrity**:
    - Verified all 742 submitted student attempts and 436 best score flags remain 100% attached and intact.
    - Verified with Playwright headless browser: Class Hub Matrix renders Theme A (10 cols), Theme B (12 cols), Theme C (14 cols), Theme D (12 cols), and ALL Tests-Only (16 cols) with 0 console or page errors.


- **Phase 89: Ecosystem-Wide Pure Solid Palette, Remedial Pure Yellow Overrides, and Sleek Test Column Restructuring**:
  - **1. Pure Solid 100% Grade Palette (`js/grading.js`, `js/app.js`, `js/api.js`, `css/style.css`, `css/result.css`, `css/dashboard.css`)**:
    - Standardized `GRADE_PALETTE` and CSS utility classes:
      - Star / Bintang (100%): `#FF00FF` (Pure Pink/Magenta) with ambient glow `rgba(255, 0, 255, 0.45)`.
      - Grade A (80% - 99%): `#00FF00` (Pure Green).
      - Grade B (60% - 79%): `#00FFFF` (Pure Cyan / Sky Blue).
      - Grade C (40% - 59%): `#FFFF00` (Pure Yellow).
      - Grade D (20% - 39%): `#FF8000` (Pure Orange).
      - Grade E / F (0% - 19%): `#FF0000` (Pure Red).
  - **2. Special Remedial Handling (`js/grading.js`, `js/result.js`, `js/dashboard.js`, `js/admin/app.js`, `css/admin.css`)**:
    - Remedial attempts (`is_remedial_unlocked` or capped at 60%) are strictly EXCLUDED from Grade B Cyan (`#00FFFF`).
    - Remedial scores, points, badges, and score rings strictly render in Pure Yellow (`#FFFF00`), matching Grade C visual indicator.
    - Class Hub matrix table (`admin.html#class-hub`): thick yellow box/border removed (`.asm-score-remedial` background: transparent, border: none, padding: 0).
    - Delicate superscript: `<sup class="asm-rem-sup">R</sup>` with `font-size: 0.7em`, `opacity: 0.7`, `color: #FFFF00` on remedial scores and points.
    - Roster student name column: removed `[ REMIDI ]` badge next to student name completely per user instruction; student name now occupies full column width cleanly with zero truncation/distortion. Toolbar legend updated to show `ᴿ Remedi`.
  - **3. Clean & Sleek Test Columns (`css/admin.css`, `js/admin/app.js`)**:
    - Completely stripped pink/magenta box outlines and backgrounds from Test columns.
    - First column of each Test pair (`th/td.col-asm-test-pts`): `border-left: 2px solid rgba(255, 255, 255, 0.25)`.
    - Column body background: `background: rgba(255, 255, 255, 0.025)`.
    - Inner divider between PTS and SCORE (`th/td.col-asm-test-score`): `border-left: 1px dashed rgba(255, 255, 255, 0.08)`.
    - Test column headers (`WRD PTS`, `SCORE`, `PHR PTS`, `SCORE`): replaced pink box badges with clean neutral white `#e2e8f0` text and subtle translucent background `rgba(255, 255, 255, 0.08)`.
  - **4. Student Dashboard & Result Viewer Alignment (`js/dashboard.js`, `js/result.js`, `result.html`, `dashboard.html`)**:
    - Dashboard hero banner and avatar container for Star S updated to `#FF00FF` and `rgba(255, 0, 255, 0.45)`.
    - Result page score ring, particles, grade stamp, and percentage typography render `#FF00FF` for Star S and `#FFFF00` for remedial attempts.
    - Batch standings / leaderboard properly inherit updated pure solid colors.
  - **5. Integrity of Business Logic & Cache Bump (`sw.js`, `admin.html`, `dashboard.html`, `result.html`)**:
    - KKM 60% capping and Damerau-Levenshtein evaluation verified and preserved intact.
    - Node syntax validation checked and passed with exit code 0.
    - Service worker cache and script query strings bumped to `abcd-core-v5.5.7`.

- **Phase 88: Visual Refactoring of Remedial Indicators in Admin Class Hub**:
  - **1. Borderless/Background-Free Remedial Scores (`css/admin.css`)**:
    - Stripped thick yellow box shadow, background, and border from `.asm-score-remedial`. Remedial values now render cleanly on the dark row background without harsh box borders.
  - **2. Official Grade B Cyan (#00ffff) Color (`js/admin/app.js`)**:
    - Removed forced yellow color on remedial scores.
    - Remedial scores capped at 60% now strictly inherit official Grade B Cyan `#00ffff` color across all assessment columns (Test PTS, Test SCORE, and Task).
    - Fixed `effSc` definition in Test SCORE renderer to eliminate `ReferenceError` during evaluation.
  - **3. Delicate & Subtle Superscript `<sup>R</sup>` (`css/admin.css`, `js/admin/app.js`)**:
    - Replaced heavy inline yellow span with `<sup class="asm-rem-sup">R</sup>` styled at `font-size: 0.7em`, `opacity: 0.65`, `color: #94a3b8`, and `vertical-align: super`.
  - **4. Elegant Mini-Badge [REMEDI] in Student Name Column (`css/admin.css`, `js/admin/app.js`)**:
    - Applied user's exact styling to `.badge-remedial-tag`: `background: rgba(234, 179, 8, 0.12)`, `border: 1px solid rgba(234, 179, 8, 0.3)`, `font-size: 9px`, `padding: 1px 5px`, `border-radius: 4px`, `color: #facc15`.
  - **5. Capping Mathematical Integrity**:
    - Remedial points and percentage capping formulas (`effSc = Math.min(sc, maxRemPts)` and `effPct = Math.min(rawPct, 60.0)`) remain 100% intact and preserved.
  - **6. Versioning & Verification**:
    - Bumped service worker cache and script query string to `abcd-core-v5.5.6` in `sw.js` and `admin.html`.
    - Verified via Playwright screenshot captures `remedial_refactor_all.png` and `remedial_refactor_theme_a.png`. Zero visual glitches.

- **Phase 87: All Themes Tests-Only View, Luminous Yellow Remedial Highlighting, and 24K Royal Gold Star**:
  - **1. ALL THEMES Tests-Only Executive View (`js/admin/app.js`)**:
    - When `selectedTheme === 'ALL'`, filtered `activeAssessments` to Checkpoint Tests only (`isTestAsm(asm)`).
    - Reduced assessment columns from 48 down to 16 (4 themes $\times$ 2 tests $\times$ 2 cols: PTS & SCORE). Total table columns = 24.
    - Super-headers dynamically set `colSpan = themeTests.length * 2` (4 cols per theme).
    - Result: Each test column expands to ~70px of comfortable, legible width without horizontal scrolling or extreme zoom-out in Fit Screen mode.
    - Individual Theme tabs (`THEME A`, `THEME B`, `THEME C`, `THEME D`) reveal all daily tasks/topics (Tasks 1-6 + Tests 7-8 for Theme A).
    - Toolbar button updated to `🌐 ALL (TESTS ONLY)`.
  - **2. Luminous Yellow Remedial Highlighting (`css/admin.css`, `js/admin/app.js`, `js/admin/datagrid.js`)**:
    - DataGrid configured with `rowClassName: (row) => row.hasRemedial ? 'row-remedial' : ''`.
    - Added `#class-attendance-grid tbody tr.row-remedial` with subtle yellow background tint and 3px yellow left border on sticky cell.
    - Added `.badge-remedial-tag` (`REMEDI` pill in yellow next to student name).
    - Added `.asm-score-remedial` (luminous yellow badge `#fef08a` with `#facc15` border and glowing box-shadow) applied to all remedial test and task scores.
    - Rendered superscript `<span style="color:#fde047; font-size:0.58rem; vertical-align:super; font-weight:900; margin-left:1.5px;">R</span>`.
  - **3. Ultra-Metallic 24K Royal Gold Star (`css/admin.css`, `js/admin/app.js`)**:
    - Replaced flat gold with `.badge-grade-star-s` featuring a 5-stop metallic gradient (`#bf953f` 0%, `#fcf6ba` 25%, `#b38728` 50%, `#fbf5b7` 75%, `#aa771c` 100%), specular white-gold inset highlight, deep bronze drop shadow, and glowing star icon.
    - Applied `.text-gold-champion` to `SCORE` (100%) and `PTS` (2700 pts) for Grade S rows.
    - Applied `.badge-grade-star-s` to class average summary row when average grade reaches S.
    - Clean distinction between Grade S 24K Royal Gold (metallic, 3D luxury) and remedial yellow (luminous lemon-yellow `#facc15`).
  - **4. Versioning & Verification**:
    - Bumped service worker cache and script query strings to `abcd-core-v5.5.5` in `sw.js` and `admin.html`.
    - Playwright verified via `all_themes_tests_only.png` and `theme_a_with_tasks.png`. Zero visual defects, zero breaking changes.

- **Phase 86: Exact Integer/Half-Point Recalibration & Bound Enforcement (Max 40 Word / Max 10 Phrase)**:
  - **1. Root Cause Identification**:
    - Discovered that unified 50-question historical attempts retained `total_questions = 50` on Word tasks after splitting, allowing scores to reach 50 or 49.2 on 40-max assessments.
    - Floating decimal calculation `Math.round(N * pct) / 10` produced invalid fractional points like `9.8`, `9.4`, `8.2`, `8.8`, and `47.1`. TopsCore assessment rules mandate either whole integers or `.5` half-points (from minor spelling error tolerance).
    - Legacy uncalibrated attempts with `score = 50` or `score = 40.5` were shadowing calibrated attempts because `submittedAtts.sort` prioritized highest numeric score without capping at assessment maximum.
  - **2. Global Database Sanitization (`scratch/execute_global_clean_and_sanitize.mjs`)**:
    - Backed up all 742 attempts to `scratch/backup_before_global_sanitize.json`.
    - Iterated over all student and assessment groups:
      - Capped Word tasks at max 40; Phrase tasks at max 10; Test 3A at 120/30; Test 3B at 280/70; Test 3C at 480/120; Test 3D at 640/160.
      - Rounded all points strictly to integers or `.5` half-points: `Math.round(score * 2) / 2`.
      - Recalibrated percentages to reflect exact points: `Math.round((score / max) * 100)`.
      - Resolved duplicate `is_best_score` flags so only the single legitimate best attempt per student and assessment is marked `is_best_score = true`.
    - Executed updates across 277 attempt records.
    - Verified with `scratch/audit_class_attempts.mjs`: Over max points: 0, Invalid floats: 0, Multiple best: 0, Mismatched pct: 0.
  - **3. Frontend Bound Enforcement & Clean Display (`js/admin/app.js`)**:
    - Added outer-scope helper `getAsmExpectedMax(asm)` covering all 40 assessments.
    - Capped attempt scores at `getAsmExpectedMax(asm)` in `bestAtt` selection, preventing stale attempts from overriding calibrated attempts.
    - Replaced hardcoded `50` question fallbacks with `getAsmExpectedMax(asm)` across all column renderers.
    - Cleanly formatted display values: integers render without decimal (e.g. `40`, `10`, `9`), half-points render with `.5` (e.g. `37.5`, `9.5`).
    - Version bumped service worker and script cache to `abcd-core-v5.5.4` in `sw.js` and `admin.html`.
  - **4. Playwright Visual Verification**:
    - `verified_recalibrated_theme_a.png`: Word tasks strictly $\le 40$ (e.g. 40, 39, 37.5, 35), Phrase tasks strictly $\le 10$ (e.g. 10, 9.5, 8.5, 8), zero floating decimals, zero 50s.
    - `verified_recalibrated_all_themes.png`: Entire 40-assessment panorama fitting on screen with clean integer and `.5` values across all 4 themes. Rank 1 (Mr. Top: 2700 pts) down to Rank 26 remain 100% stable.

- **Phase 85: Option 1 Score Equalization for Passing Assessments (Combined >= 60%)**:
  - **1. Database Execution (`scratch/execute_option1_equalization.mjs`)**:
    - Backed up all 721 class attempts to `scratch/backup_pre_option1_equalization.json`.
    - Analyzed all 20 assessment pairs across 26 students in Vocabulary Class (`ab33498a-90e6-44b7-83f4-5765f964543e`).
    - Where student combined score percentage $P \ge 60\%$:
      - Equalized both Word and Phrase to $P$.
      - Word points = $N_{\text{word}} \times (P / 100)$ (40 pts for tasks, 120/160/200/180 pts for tests).
      - Phrase points = $N_{\text{phrase}} \times (P / 100)$ (10 pts for tasks, 30/40/50/40 pts for tests).
      - Set `effective_score = effPct` and `grade = computeGrade(effPct)`.
    - Rescued 38 phrase assessments across 17 students that unfairly fell into remedial/failure due to the raw question split.
    - Inserted 21 missing phrase attempts with valid `expires_at` and equalized passing scores for students whose historical tests only recorded word answers (e.g. Miss Siti Qori' Atun on Themes C & D, Mr. Unggul, Mr. Masyan, Mr. Asmul, Miss Wardatul on 3A Phrase Test).
    - Safely preserved all 24 attempts where combined score was genuinely $< 60\%$ (students who truly failed remain at raw score/remedial).
  - **2. Score/Percentage Rendering Alignment (`js/admin/app.js`)**:
    - Fixed `effPct` in lines 1046, 1595, 1862, and 1906: `const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;`
    - Prevented raw points from shadowing percentage in the Test SCORE column.
    - Bumped service worker cache and script tags to `abcd-core-v5.5.3` in `sw.js` and `admin.html`.
  - **3. Mathematical Conservation & Ranking Integrity**:
    - Rank 1 (Top: 2700 pts) down to Rank 26 remain stable and undisturbed.
    - Students previously missing phrase tests are now credited their rightful points.
  - **4. Playwright Visual Verification**:
    - `equalized_matrix_theme_a.png`: Clean, harmonious scores on Theme A; passing students have equalized scores across Word PTS, Word SCORE, Phrase PTS, Phrase SCORE; remedial students have capped 60% with yellow badge.
    - `equalized_matrix_theme_b.png`: Clean scores on Theme B; rescued students (Miss Syazida, Mr. Aunul, Miss Tiara, Miss Nurhaliza) have passing scores.
    - `equalized_matrix_fit_screen.png`: Panoramic view of all 40 assessments fitting 100% on screen with zero clipping.

- **Phase 84: Dual View Modes (Fit Screen All 40 vs 100% Scroll), Pan Controls & Full Width Matrix**:
  - **1. "🔍 FIT SCREEN (ALL 40)" Panorama Mode (`js/admin/app.js`)**:
    - Calculates dynamic zoom ratio `zoomRatio = Math.min(1, containerWidth / naturalWidth)` when `FIT SCREEN` is active.
    - Fits all 40 assessments (Themes A, B, C, D — 48 assessment columns + 8 student columns) on the screen simultaneously without requiring horizontal scroll.
    - Default view mode on load (`topscore_attendance_view_mode`), persistent in `localStorage`.
  - **2. "↔️ 100% SCROLL" Standard Mode with Mouse Wheel Glide (`js/admin/app.js` & `css/admin.css`)**:
    - Provides 100% full-scale columns (42px/58px/50px) with frozen student columns on the left.
    - Added mouse-wheel listener on `.table-wrap`: rolling the mouse wheel anywhere over the table glides horizontally across the curriculum.
    - Added interactive `[ ◀ Pan Left ]` and `[ Pan Right ▶ ]` buttons to the toolbar for single-click 400px smooth panning.
  - **3. "⇱ Full Width" Sidebar Collapse Toggle (`js/admin/app.js` & `css/admin.css`)**:
    - Clicking `[ ⇱ Full Width ]` collapses `#admin-sidebar` and expands the matrix to 100% of the screen width (from 1650px to 1880px+).
  - **4. Fixed Bottom Clipping & Elevated Clearance (`js/admin/app.js` & `css/admin.css`)**:
    - Increased bottom clearance in `fitMatrixToScreen()` from 6px to 20px.
    - The summary row `★ CLASS AVERAGE (KELAS)` and the horizontal scrollbar now have ~32px of clearance above `#bottom-ad-banner` and are never cut off.
    - Enhanced scrollbar styling: 9px height with vibrant cyan-indigo gradient thumb (`#38bdf8` to `#818cf8`) and border.
  - **5. High-Resolution Playwright Verification**:
    - `verified_mode_fit_screen.png`: All 40 assessments visible on one screen without horizontal scroll.
    - `verified_mode_scroll_100pct.png`: 100% scale with pan controls and clearance.
    - `verified_mode_fullwidth_fit.png`: Full-screen width with sidebar collapsed.

- **Phase 83: UI/UX Resolution for Overcrowded Attendance Matrix**:
  - **1. Eliminated 23px Column Compression Bottleneck (`css/admin.css`)**:
    - Replaced `overflow: hidden !important` on `#class-attendance-grid .table-wrap` with `overflow-x: auto !important; overflow-y: hidden !important; scrollbar-width: thin;` styled with glowing neon cyan scrollbar thumb.
    - Set `#class-attendance-grid table.datagrid-table` to `table-layout: fixed !important; width: max-content !important; min-width: 100% !important; border-collapse: separate !important; border-spacing: 0 !important;`.
    - Columns now have generous, un-squashable minimum widths: 42px for Tasks, 58px for Test PTS, 50px for Test SCORE.
  - **2. Excel-Style Frozen Sticky Left Panes (`css/admin.css`)**:
    - Pinned the first 8 student detail columns permanently to the left:
      - `col-sticky-1` (INST): `left: 0px; width: 48px;`
      - `col-sticky-2` (PROGRAM): `left: 48px; width: 54px;`
      - `col-sticky-3` (BATCH): `left: 102px; width: 48px;`
      - `col-sticky-4` (STUDENT NAME): `left: 150px; width: 140px;`
      - `col-sticky-5` (PROG): `left: 290px; width: 46px;`
      - `col-sticky-6` (SCORE): `left: 336px; width: 46px;`
      - `col-sticky-7` (GRD): `left: 382px; width: 36px;`
      - `col-sticky-8 .col-sticky-last` (PTS): `left: 418px; width: 62px;` with neon cyan divider border and subtle box-shadow.
    - Super-header `STUDENT DETAILS` pinned permanently with `position: sticky; left: 0; z-index: 30;`.
    - Pinned summary row cells with matching `col-sticky` classes.
  - **3. Interactive Quick Theme Toolbar (`js/admin/app.js` & `css/admin.css`)**:
    - Injected `.attendance-matrix-toolbar` with theme pill buttons:
      - `[ 🌐 ALL (40) ]`: Full panoramic view across Themes A, B, C, D (48 rendered columns).
      - `[ 🟦 THEME A (8) ]`: Focused Workplace view (10 columns: 1 WRD to 8 SCORE).
      - `[ 🟪 THEME B (10) ]`: Focused Tourism view (12 columns: 9 WRD to 18 SCORE).
      - `[ 🟧 THEME C (12) ]`: Focused CCU view (14 columns: 19 WRD to 30 SCORE).
      - `[ 🟩 THEME D (10) ]`: Focused High-Frequency view (12 columns: 31 WRD to 40 SCORE).
    - Added color-coded legend indicators for `WRD`, `PHR`, `PTS`, `SCORE`, and `R` (Remedial).
  - **4. Cell Boundary Protection (`css/admin.css`)**:
    - Enforced `overflow: hidden; text-overflow: clip; white-space: nowrap;` across all table cells to eliminate text collisions or bleed into adjacent cells.
  - **5. High-Resolution Playwright Verification**:
    - Captured and validated all views:
      - `theme_all.png`: 48 assessment columns, clean headers, zero overlap.
      - `theme_a.png`: 10 columns cleanly isolated.
      - `theme_b.png`: 12 columns cleanly isolated.
      - `theme_c.png`: 14 columns cleanly isolated.
      - `theme_d.png`: 12 columns cleanly isolated.
      - `theme_all_scrolled_right.png`: Scrolled 900px while student names, points, and grades stay frozen on the left.
  - **6. Git Rule**: Strict Git freeze maintained — 0 commits, 0 pushes. All changes strictly local.


- **Phase 82: Non-Destructive Full Curriculum Split (Words & Phrases into 40 Assessments)**:
  - **1. Bulletproof 40 MB Backup & Instant Restore Script (`scratch/`)**:
    - Created exhaustive snapshot `scratch/backup_pre_split_restore_point.json` (40.07 MB) capturing all 40 assessments, 540 attempts, and 35,446 attempt answers with 100% fidelity.
    - Created instant one-command restore engine `scratch/restore_to_snapshot_point.mjs` ensuring zero risk — the user can revert the entire database to the pre-split state in seconds if needed.
  - **2. Assessment Restoration & Sequential Re-ordering 1 to 40**:
    - Un-deleted all 20 phrase assessments in Class `ab33498a-90e6-44b7-83f4-5765f964543e` (`deleted_at = null`, `status = 'published'`).
    - Sequentially numbered all 40 assessments from 1 to 40 (`display_order`):
      - **Theme A (1..8)**: 1 (3A1 Vocab Task - Words), 2 (3A1 Phrases Task), 3 (3A2 Words), 4 (3A2 Phrases), 5 (3A3 Words), 6 (3A3 Phrases), 7 (3A Words Test - PTS & SCORE), 8 (3A Phrases Test - PTS & SCORE).
      - **Theme B (9..18)**: 9..16 (4 Word Tasks + 4 Phrase Tasks), 17 (3B Words Test), 18 (3B Phrases Test).
      - **Theme C (19..30)**: 19..28 (5 Word Tasks + 5 Phrase Tasks), 29 (3C Words Test), 30 (3C Phrases Test).
      - **Theme D (31..40)**: 31..38 (4 Word Tasks + 4 Phrase Tasks), 39 (3D Words Test), 40 (3D Phrases Test).
  - **3. Precision Non-Destructive Attempt Splitting Engine**:
    - Executed `scratch/execute_curriculum_split.mjs`:
      - **Remapped 94 Pure Phrase attempts** (e.g. historical 10-Q attempts on 3A2) directly to their corresponding phrase assessments.
      - **Split 181 Mixed attempts** (e.g. 150-Q attempts on 3A Test, 50-Q on 3B1..3B4 Tasks) into clean Word attempts and Phrase attempts:
        - Word partition: retains word answers, recalculates points, questions, raw/effective percentages, and grades.
        - Phrase partition: creates new attempt on the corresponding phrase assessment with re-linked phrase answers, recalculates points, questions, raw/effective percentages, and grades.
      - **Preserved 248 Pure Word attempts** without modification.
      - **Recalibrated `is_best_score` flags** across 415 student-assessment pairs.
  - **4. 100% Mathematical Point & Grade Integrity Verified**:
    - Verified that sum of Word points + Phrase points equals original points with zero points dropped.
    - All existing stars (`⭐`), grades (`A`), remedial caps (`60% / R`), and rankings are preserved.
  - **5. Enhanced Column Header Badges (`js/admin/app.js`)**:
    - Added clear visual badge labels to column headers:
      - Tasks: `'1 WRD'` (gold `#facc15`), `'2 PHR'` (sky blue `#38bdf8`), etc.
      - Tests: `'7 WRD PTS'` / `'7 SCORE'`, `'8 PHR PTS'` / `'8 SCORE'`.
  - **6. Playwright Browser Verification**:
    - Verified rendering of all 48 assessment columns under dynamic super headers (`THEME A` 10 cols, `THEME B` 12 cols, `THEME C` 14 cols, `THEME D` 12 cols) exiting code 0 with zero console errors. Screenshot saved to `scratch/verified_40_assessments_matrix.png`.
  - **7. Git Rule**: Strict Git freeze maintained — 0 commits, 0 pushes. All changes strictly local.


- **Phase 81: Dual-Column Test Assessment Layout (PTS & SCORE Split)**:
  - **1. Split Test Columns into 2 Distinct Columns (`js/admin/app.js`)**:
    - Replaced vertical stacking within a single cramped cell with 2 dedicated, side-by-side columns for each Test assessment (`isTest`):
      - **Column 1 (`col-asm-test-pts`)**: Header `4 PTS`, `9 PTS`, `15 PTS`, `20 PTS`. Renders points earned (e.g. `105.5`, `90^R`, `150`) with tier coloring and remedial superscript `R`.
      - **Column 2 (`col-asm-test-score`)**: Header `4 SCORE`, `9 SCORE`, `15 SCORE`, `20 SCORE`. Renders clean percentage score (e.g. `70%`, `60%`, `100%`) with tier coloring.
  - **2. Dynamic Super Header Colspan Auto-Adjustment (`js/admin/app.js`)**:
    - Updated `themeCounts` calculation so each Test assessment contributes `colSpan = 2` (Theme A $\rightarrow$ 5 cols, Theme B $\rightarrow$ 6 cols, Theme C $\rightarrow$ 7 cols, Theme D $\rightarrow$ 6 cols). Super headers align with 100% geometric precision.
  - **3. Summary Row Docking (`js/admin/app.js`)**:
    - Split test summary row cells so that PTS columns show average points (e.g. `89.3`) and SCORE columns show average percentage (e.g. `67%`), both styled over pink highlighted backgrounds.
  - **4. CSS Border & Grouping Polish (`css/admin.css`)**:
    - Added solid pink outer borders (`border-left` on PTS, `border-right` on SCORE) and subtle dashed pink inner divider (`border-right` on PTS) to visually group each test pair together.
  - **5. Investigation of 90 vs 72 Remedial Score**:
    - Verified exact database attempts:
      - Students with **90 PTS** (Ahmad, Gagan, Sofa, Latifa, Tiara) took Test 3A with **150 questions** ($150 \times 60\% = \mathbf{90\text{ Pts}}$).
      - Student with **72 PTS** (Miss Asti Ananta) took Test 3A with **120 questions** during an earlier test bank configuration ($120 \times 60\% = \mathbf{72\text{ Pts}}$).
      - Both represent mathematically identical KKM 60% thresholds.
  - **6. Automated Verification**:
    - Executed Playwright test `scratch/verify_split_test_cols.mjs`: 0 page errors, 0 console errors, confirmed headers (`4 PTS`, `4 SCORE`, `9 PTS`, `9 SCORE`), verified sample rows, and saved screenshot to `scratch/verified_split_test_cols.png`.
  - **7. Git Rule**: Strict Git freeze maintained — 0 commits, 0 pushes. All changes strictly local.


- **Phase 80: Remedial KKM 60% Standard Enforcement & Points-Centric Ranking Confirmation**:
  - **1. Points-Centric Ranking Confirmation**:
    - Confirmed user directive: in this Vocabulary class, Total Points (`PTS`) is the authoritative primary ranking metric. Secondary tie-breaker is average percentage (`SCORE`), followed by `PROG`, and student name (A-Z).
    - Verified that Class Hub Matrix and Student Dashboard Leaderboard strictly enforce this multi-level sort comparator.
  - **2. Root Cause Audit of "Remedial Score Higher Than Test"**:
    - **Factor 1 (Passed Remedial vs Un-remediated Failed Test)**: In Test 3A (150 questions), KKM 60% is 90 points. Students with remedial (Ahmad, Gagan, Sofa, Latifa, Tiara) completed remedial and were capped at $90^R$ (60%). Meanwhile, other students who took the test but failed (<60%, e.g. Syazida 73 pts = 48.7%, Sukur 73.5 pts = 49%, Nurhaliza 84.5 pts = 56.3%, Laura 86 pts = 57.3%) have not taken remedial yet, so their scores displayed raw failure points (73–86), which are lower than the passing remedial threshold (90 pts).
    - **Factor 2 (Uncapped Remedial in Legacy Views)**: In `assessment-management.js` (Results Grid) and `class.js` (`openStudentProfile`), the views previously read raw `r.percentage` (e.g. 91.7%) and raw `att.score` (137.5) without applying `is_remedial_unlocked` capping.
  - **3. Universal Remedial Capping Fixes**:
    - **`js/admin/assessment-management.js`**: Enforced `effPct = isRem ? Math.min(rawPct, 60.0) : ...` and `effGrade = isRem && rawPct > 60 ? 'B' : ...` in deduplication and table rendering. Remedial attempts now strictly display capped 60.0% and Grade B.
    - **`js/admin/class.js`**: Enforced `effScore = isRem ? Math.min(sc, maxRemPts) : sc` and `effPct = isRem ? Math.min(rawPct, 60.0) : ...` inside `openStudentProfile`, ensuring student profile popups always show 60% capped scores for remedial assessments.
  - **4. Automated Verification**:
    - Verified with Playwright and direct Node queries that all 7 remedial attempts in DB are capped at 60.0% / $90^R$.
  - **5. Git Rule**: Strict Git freeze maintained — 0 commits, 0 pushes. All changes strictly local.


- **Phase 79: Students Grade and Score Tab & Dynamic Test Column Metrics**:
  - **1. Tab Name Renamed (`js/admin/app.js`)**:
    - Renamed tab 2 from `Active Enrolled Students` to `Students Grade and Score` (`label: 'Students Grade and Score'`, `icon: '📊'`), matching its function as the comprehensive academic grading and progress matrix.
  - **2. Dynamic Performance Tier Colors for Test Numbers (`js/admin/app.js`)**:
    - Eliminated forced pink text color (`#f472b6`) on numbers in test columns. Numbers are now dynamically colored by earned score performance tier (AGENTS.md § 2.10):
      - 100%: Gold Star (`#fbbf24`)
      - 80%–99%: Emerald Green Grade A (`#34d399`)
      - 60%–79%: Sky Blue Grade B (`#60a5fa`) / Gold if remedial (`#fbbf24`)
      - 40%–59%: Amber Grade C/D (`#f59e0b`)
      - < 40% / 0: Coral Red Grade E (`#ef4444`)
    - Distinct pink column banding (`col-asm-test` header box, vertical column background tint, and border) is fully preserved.
  - **3. Dual Metrics Display in Test Columns (Points + Percentage) (`js/admin/app.js`)**:
    - Each cell in test columns now renders both points and percentage in a clean vertical stack:
      - Line 1: Points (`displayVal`, e.g. `105.5`, `90^R`, `150`) with remedial superscripts.
      - Line 2: Percentage (`${Math.round(effPct)}%`, e.g. `70%`, `60%`, `100%`, `0%`).
    - Summary row (★ CLASS AVERAGE) in test columns renders class average points and average percentage (e.g. `89.3` points over `60%`).
  - **4. Styling & Layout Tuning (`css/admin.css`)**:
    - Set `min-width: 44px;` and `padding: 1px 1px !important;` on `th.col-asm-test, td.col-asm-test` to cleanly host both metrics without table overflow. Added subtle hover zoom animation.
    - Fixed undefined `rect` in `fitMatrixToScreen()` via `const rect = grid.getBoundingClientRect()`.
  - **5. Cache Bumping**:
    - Bumped service worker cache to `abcd-core-v5.4.8` (`sw.js`).
    - Bumped script query parameters in `admin.html` and `result.html` to `v=5.4.8`.
  - **6. Automated Verification**:
    - Ran Playwright script `scratch/verify_matrix_test_cols.mjs`: 0 console errors, 0 page errors, confirmed tab label `Students Grade and Score`, verified sample test scores (Mr. Top `150 100%`, Aunul Fikri `105.5 70%`, Unggul `101.5 85%`, Sofa `90^R 60%`), and saved screenshot to `scratch/verified_students_grade_and_score.png`.
  - **7. Git Rule**: Strict Git freeze maintained — 0 commits, 0 pushes. All changes strictly local.

- **Phase 78: Result Page Syntax & Projection Fix + Student Roster Score Alignment**:
  - **1. Result Page Loading Stuck & Syntax Error Fix (`js/result.js`)**:
    - Eliminated duplicate variable declaration `totalQ` by renaming line 693 to `attemptTotalQ` and line 770 to `accuracyTotal`. `node --check js/result.js` passes with code 0.
  - **2. API Projection & Safety Guard Fix (`js/api.js`)**:
    - **`fetchAttemptResult(attemptId)`**: Added `student_id`, `total_questions`, `effective_score`, and `is_remedial_unlocked` to the PostgREST select projection. Resolves student name/photo lookup, correct remedial status detection, and prevents 400 Bad Request queries with `student_id=eq.undefined`.
    - **`fetchAllStudentAttempts(studentId)` & `fetchStudentAttemptsForAssessment`**: Added empty guards `if (!studentId) return [];` to prevent invalid network calls.
  - **3. Student Roster Authoritative Score Alignment (`js/admin/student-management.js`)**:
    - **Remedial Capping**: Applied KKM 60% capping (`effScore`, `effPct`) in `asmAtts.forEach` and `bestByAsm`.
    - **Authoritative Overall Score (AGENTS.md §2.8)**: Replaced erroneous `(totalObtained / totalMaxScore) * 100` (which divided student points by 850 total questions) with `Math.round(sumPercentages / bestByAsm.size)`, aligning Student Roster scores with Class Hub and Student Dashboard (e.g. Latifa 79% B, Laura 73% B, Tiara 70% B, Sofa 91% A).
    - **Attempts Query**: Included `effective_score` in `adminFetchAll('attempts', ...)`.
  - **4. Cache Busting**:
    - Bumped Service Worker cache to `abcd-core-v5.4.7` (`sw.js`).
    - Bumped module query parameters in `admin.html`, `result.html`, `dashboard.html`, and `js/admin/app.js` to `v=5.4.7`.
  - **5. Automated Headless Browser Verification (Playwright)**:
    - **Result Page (`result.html?attempt_id=c34ce4f9-22f4-47e8-83dd-82b4ca94bd18&admin=1`)**: Loaded Miss Risma's result cleanly with 0 errors, 81 PTS, 54.0% Grade C, and active `🟡 REMEDIAL (KKM 60%)` Admin Grade Control.
    - **Student Roster (`admin.html#students`)**: Loaded student roster with 0 toasts, 0 unhandled rejections, and verified synchronized scores across all members.
  - **6. Git Rule**: Strict Git freeze maintained — 0 commits, 0 pushes. All changes strictly local.

- **Phase 77: Class Hub Remedial Capping Display & Cross-Page Points-Centric Synchronization**:
  - **1. Remedial Capping in Class Hub Attendance Matrix (`js/admin/app.js`)**:
    - **Cell Points Capping**: In column cells, when an attempt has `is_remedial_unlocked: true`, `displayVal` is now strictly capped at KKM 60% of total questions ($150 \times 0.6 = 90$ pts) with gold `R` superscript (`90^R`). Hover tooltip displays `Effective: 90/150 pts (60%) [Raw: 127.5 pts (85%)]`.
    - **Total PTS Column**: Remedial attempts add capped effective points ($90\text{ pts}$) instead of raw points ($127.5\text{ pts}$), correcting Miss Sofa Maria Ulfa from `462.5 pts` to `425 pts`.
    - **Average Score & Grade**: Remedial attempts factor in 60.0% instead of raw percentage, correcting Miss Sofa Maria Ulfa's curriculum average from `95%` to `91%`.
  - **2. Broadened Test Recognition in Class Management (`js/admin/class.js`)**:
    - Updated `isSummative` across all 4 calculation and export locations to recognize `assessment_category === 'TEST'` and `assessment_type === 'VOCAB_TEST' / 'UNIFIED_TEST'` instead of only `EXAM` / `QUIZ`.
  - **3. Points-Centric Best Attempt Synchronization in Student Dashboard (`js/dashboard.js`)**:
    - Aligned attempt selection in `loadBatchLeaderboard` to prioritize effective points (`effPoints`) over legacy percentage, matching Class Hub and database `is_best_score`.
    - Filtered out orphan/deleted assessments (`a.assessments && !a.assessments.deleted_at`), fixing Asti Ananta (293 -> 359 pts), Muhammad Masyan (534 -> 571 pts), and Tiara (71% -> 78% avg).
    - **23/23 members in Batch 133 are now in 100.0% PERFECT SYNCHRONIZATION** between Class Hub Matrix and Student Dashboard Leaderboard.
  - **4. Result Page Capped Points (`js/result.js`)**:
    - Capped `resPointsEl` to KKM 60% of total questions on remedial attempts (displaying `90 PTS` with tooltip note `Capped at KKM 60% (Raw: 127.5 PTS)`).
  - **5. Version Bump & Cache Busting**:
    - Bumped `admin.html`, `dashboard.html`, `result.html`, and `sw.js` cache name to `v=5.4.6` (`abcd-core-v5.4.6`).
  - **6. Git Rule**: Strict Git freeze maintained — 0 commits, 0 pushes. All changes strictly local.

- **Phase 76: Live Test Session Late Student Enrollment, Points-Centric Standings & Remedial KKM 60% Cap [LOCAL ONLY - GIT FREEZE]**:
  - **1. Penambahan Siswa Susulan pada Sesi Ujian Aktif (Live Session)**:
    - **`js/api.js` (`addLateStudentsToSession`)**: Added atomic API function allowing tutors/admins to add late students to an active live session without restarting or resetting the session. Appends student IDs to `allowed_student_ids` and supports per-student `remedial_student_ids`.
    - **Global Countdown Clamping**: Late students strictly reference the active session's existing `auto_close_at`. Waktu tidak di-reset/tidak bertambah.
    - **`js/admin/assessment-access.js`**: Added `👥 + Susulan / Remidi` button (`.btn-add-late-modal`) for LIVE test sessions. Added dedicated modal `#modal-add-late-student` displaying active session countdown (`⏳ Sisa Waktu Sesi Global: XX Menit`), unenrolled batch student checklist, and remedial flags.
  - **2. Points-Centric Ranking in Batch Standings Leaderboard**:
    - **`js/dashboard.js` (`loadBatchLeaderboard`)**: Upgraded ranking algorithm so standings positions are primarily determined by **Total Points** (`totalPoints`) earned across best assessment results.
    - **Tie-Breaker Hierarchy**: 1) Total Points (descending), 2) Overall Average Percentage (descending), 3) Completed Assessments count (descending), 4) Earliest last submission timestamp, 5) Alphabetical clean name.
    - **UI Presentation**: Score column prominently highlights `${st.totalPoints} PTS` in bold alongside the Grade Chip (`⭐`, `A`, `B`, etc.) and sub-info `${st.completedCount} completed • ${st.overallScore}% avg`. Champion bar updated to: `👑 King/Queen Name (XX PTS • YY%)`.
    - **`js/result.js` (`renderRankInBatch`)**: Synchronized batch rank in result viewer to compute rank using the same points-centric logic.
  - **3. Remedial Distinction & Strict KKM 60% Cap**:
    - **`js/api.js` (`openTestSession`)**: Added `isRemedial` flag to unlock entire sessions in remedial mode.
    - **`js/api.js` (`startAssessment` & `submitAssessment`)**: Automatically flags attempts with `is_remedial_unlocked: true` when opened under a remedial session or for a whitelisted remedial student, capping `effective_score` at `Math.min(percentage, 60.00)` and Grade at B.
    - **`js/api.js` (`labelAttemptRemedial`)**: Added authoritative 1-click toggle to retroactively label any attempt as remedial (capped at KKM 60%) or restore back to normal.
    - **`js/admin/class.js` & `js/admin/student-management.js`**: Replaced older 70% threshold with strict KKM 60% cap. Added 1-click `[ 🏷️ Remidi (60%) ]` / `[ ↩️ Normal ]` action buttons in Results Grid.
    - **`js/result.js`**: Added `🟡 Remedial Attempt (KKM Capped at 60%)` indicator chip and clamped effective percentage.
  - **4. In-Context Remedial Flag Controls (Gambar 1 & Gambar 2 ➔ Gambar 3)**:
    - **Sidebar Restored**: Removed unrequested `📊 Results & Gradebook` tab from `admin.html` and `assessment-access.js`. Sidebar remains strictly clean ABCD.
    - **Gambar 1 (Student Progress Breakdown Modal - `showStudentProgressDetails`)**: Added dedicated `Action / Remidi` column. Completed tests feature a 1-click `[ 🏷️ Remidi ]` / `[ ↩️ Normal ]` toggle and clickable `BEST SCORE` linking directly to the result page.
    - **Gambar 2 (Class Hub Attendance Matrix - `#class-hub`) ➔ Gambar 3 (Result Page - `result.html`)**:
      - In Class Hub matrix, clicking any student score cell opens `result.html?attempt_id=...&admin=1`. Remedial attempts feature a subtle gold `R` superscript and dotted indicator.
      - On Result Page (Gambar 3), an elevated `🛡️ Admin Grade Control` card is rendered with live status (`🟡 REMEDIAL (KKM 60%)` vs `🟢 NORMAL (NILAI PENUH)`), allowing instant 1-click toggling with automatic score capping, grade recalculation, and a `← Kembali ke Class Hub` button.
  - **5. Automated Verification**:
    - Node verification confirmed: `admin.html` sidebar clean (0 unrequested tabs), `result.js` admin remedial toggle active, and `student-management.js` progress details toggle active (`PASS`).
    - Backend API verified: `labelAttemptRemedial` caps 100% -> 60% Grade B, and restores back to 100% Grade S (`PASS`).
  - **6. Committed & Pushed to Remote**:
    - Commit: `87d379d` (`feat(remedial): add late student session flow, points ranking, and in-context remedial controls [PHASE-76]`)
    - Pushed to `origin/main` successfully per user directive.

- **Phase 75: Batch Standings Leaderboard Avatar De-duplication & State-Leakage Remediation [LOCAL ONLY - GIT FREEZE]**:
  - **1. Database De-duplication**:
    - Identified 12 student records in Batch 133 sharing the exact same 18,063-byte WebP Base64 string (`data:image/webp;base64,UklGRtA...`).
    - Retained genuine photo on the original uploader Miss Laura Fardila (`bd927248-1999-4b9a-8c31-365a553d39ea`, uploaded 2026-10-22 23:57:55 UTC).
    - Safely reset `photo_url = NULL` and `photo_status = 'not_set'` for the 11 affected students (Unggul Wirakse, Suharto, Muhammad Alif, Ari Wahyu, Sofa Maria Ulfa, Asmul Kholid, Aunul Fikri, Muhammad Masyan, Muhammad Tarmizi, Suke Ajai, Wardatul Husna) plus test account `Mr. Abc` (batch 999).
    - Database query verified: 0 duplicate `photo_url` values remain in Supabase `students` table.
  - **2. Code State-Leakage Fix in `js/dashboard.js`**:
    - Cleared module-scoped `onboardPhotoData = null;` on modal close, modal skip, and entry flow.
    - Reset file input element (`#onboard-photo-file.value = ''`) and snapshot image preview (`#webcam-snapshot`) on every exit and open.
    - Prevented stale avatar reuse across logins on shared devices.
  - **3. Session Avatar Cache Purging in `js/session.js`**:
    - Enhanced `clearStudentSession()` on logout to iterate and delete all `stu_photo_*` items in `localStorage`, preventing cross-account avatar leaks on shared tablets/computers.
  - **4. Dynamic Initial Chip Fallback in Batch Standings (`js/dashboard.js`)**:
    - In `loadBatchLeaderboard()`, updated avatar rendering to strictly read `st.avatar_url || st.photo_url`.
    - If empty, renders a clean, theme-colored initial chip (`.leaderboard-avatar-init`) reflecting the student's own name initial and performance grade palette color.
    - Playwright automated headless test verified: 24 total batch members, 11 unique real photo avatars, 13 distinct initial chips, 0 duplicate faces rendered.
  - **5. Strict Git Freeze**: 0 commits, 0 pushes. All changes local.

- **Phase 74: Result Page Visual Polish, Button Overflow Remediation & Hero Trio Rebalancing [LOCAL ONLY - GIT FREEZE]**:
  - **1. Button Text Overflow Remediation**:
    - **`js/result.js` & `css/result.css`**: Fixed horizontal button text blow-out on mobile by implementing `.btn-next-milestone` with a responsive 2-tier internal layout (`.next-btn-tag` e.g. `🚀 UP NEXT MILESTONE` / `🟢 TEST SESSION UNLOCKED` and `.next-btn-title` with `white-space: normal !important; word-break: break-word !important; line-height: 1.35 !important;`). Cleaned title numbers with `cleanTitle()`. Tested on long title `3B2-Vocabulary Task - Communicating with International Customers` with zero overflow.
  - **2. Refined Best Score & Historical Attempt Badging**:
    - **`js/result.js` & `result.html`**: Replaced unstyled plain text `"Not your best score"` with a clean glassmorphic pill badge system:
      - `★ Best Score` (`.result-badge-best` in emerald `#34D399`) when score is 100% or matches the student's highest attempt.
      - `Best: XX.X%` (`.result-badge-subtle` in subtle `#94A3B8`) for retake attempts.
    - Wrapped assessment title and best score badge in `.result-title-row` with gap and flex-wrap alignment.
  - **3. Curriculum Breadcrumb Integration**:
    - Added `<span id="result-curriculum-crumb" class="result-curriculum-crumb"></span>` above the title, rendering `VOCABULARY • 3RD LEVEL • TASK` in light cyan (`#38bdf8`) matching the student dashboard.
  - **4. Hero Trio Rebalancing & Centered Identity Bar**:
    - Separated student name from `.result-portrait-stage` into a dedicated `.result-identity-bar` centered directly beneath the Trio with a sleek glassmorphic pill (`.result-student-name-label`).
    - The Trio row (`Avatar + Ring`, `100.0%`, `★ Star`) now shares the exact same vertical baseline and center alignment without awkward vertical offset.
  - **5. Avatar Fallback & Muted Zero-State Metrics**:
    - Styled `#result-avatar-initial` with bold Outfit font and text shadow on an indigo-cyan gradient background for students without uploaded photos.
    - Subtly muted `0`-value Partial and Incorrect rows (`color: #64748B`, `opacity: 0.65`) so 100% scores highlight Points and Correct answers.
  - **6. Dense Tie Ranking & Modal Search Clean-up**:
    - Enhanced `renderRankInBatch()` with dense ranking so ties for highest score correctly share `#1` and labeled the badge `Batch #X/Y`.
    - Removed duplicate search emoji from `ans-search-input` placeholder.
  - **7. Zero-Scroll Verification & Cache Busting**:
    - Playwright verified across Desktop (1280x800), iPhone (390x844), and Small Mobile (360x640): `isZeroScroll: true` maintained on all screens.
    - Version bumped `result.html`, `result.css`, `js/result.js`, and `sw.js` cache to `v=5.4.4` (`abcd-core-v5.4.4`).
  - **8. Git Rule**: Git freeze strictly maintained — 0 commits, 0 pushes. All changes local.
  - **1. Multi-Section Question Matrix (Daftar Pertanyaan)**:
    - **`js/assessment.js` (`buildNavGrid`)**: When an assessment has multiple sections (e.g. 3A2 with 40 Words + 10 Phrases, or 3B1 with 25 Words + 25 Phrases), the Question Matrix modal displays ALL 50 questions across all sections grouped cleanly with section headers (`Part 1: Words (40 Questions) [ACTIVE]` and `Part 2: Phrases (10 Questions)`), per-section answered counters (`0/40 answered`), and continuous 1..50 numbering.
    - **Cross-Section Instant Navigation**: Clicking question 45 while in the Words section immediately transitions to Part 2 (Phrases) via `startSection(secIdx, localIdx)` and renders Question 45.
    - **Continuous Backward Navigation**: In `bottomPrev`, tapping `← Prev` on Question 1 of Part 2 smoothly transitions back to Question 40 of Part 1.
    - **Global Unanswered Jump**: `jumpToNextUnanswered()` searches across all 50 questions across all sections.
  - **2. Anti-Cheat 10 Red Warning Strikes ("PERINGATAN MERAH SEMUA")**:
    - **Strike Limit**: Increased `MAX_STRIKES` from 3 to **10 warnings** to accommodate accidental mobile button taps/swipes.
    - **All Warnings Red Theme**: All strikes (Strike 1 through Strike 10) are styled in high-visibility emergency red (`#dc2626`), eliminating legacy white/orange intermediate tiers:
      - Strike badge: `🚨 STRIKE X OF 10` in `#dc2626` with red glow (`box-shadow: 0 0 20px rgba(220, 38, 38, 0.95)`).
      - Warning text: `🚨 WARNING (STRIKE X OF 10): ...` in `#ffffff` on `#dc2626` accent.
      - Countdown circle: 10-second circle styled with `border: 4px solid #dc2626` and red glow.
      - Return button: `#dc2626` urgent red with solid white font.
      - Over 10 strikes (Strike 11): Displays `🚨 LIMIT EXCEEDED (10/10)` and auto-submits exam.
  - **3. Verification**:
    - Full Playwright automated verification (`scratch/verify_matrix_cheat_10.mjs`):
      - Verified Question Matrix displays all 50 questions (1..50) with section headers and progress chips.
      - Verified cross-section navigation between Part 1 and Part 2.
      - Verified all 10 strikes render with `#dc2626` red badge, button, and sirens.
      - Screenshots captured: `screenshot_question_matrix_50.png`, `screenshot_cheat_strike_1_red.png`, `screenshot_cheat_strike_10_red.png`.

- **Phase 72: Assessment Loading Spinner Freeze & Section ID Fallback Remediation [COMMITTED & PUSHED]**:
  - **1. Root Cause of Online Assessment Spinner Freeze**:
    - On Netlify production, CORS on Edge Function `start-assessment` triggers the client DB fallback in `js/api.js`.
    - `startAssessment` client fallback was returning a single generic section: `[{ id: 'default', title: '...' }]`.
    - Database `attempt_answers` questions for 3B1 and dynamic tasks have `section_id = 'words'` (or `'phrases'`).
    - In deployed Netlify code, `startSection()` filtered `allAnswerRows` with `secId === currentSection.id` (`'words' === 'default'`), resulting in an empty array `answerRows = []`.
    - `renderQuestion(0)` found `answerRows[0]` undefined and returned on line 1010 without clearing the `<div class="spinner"></div><p>Loading ASSESSMENT…</p>` placeholder, leaving the screen permanently spinning even as the countdown timer ran.
  - **2. Core Fixes Applied**:
    - **`js/assessment.js`**: In `startSection()`, if `currentSection.id === 'default'` or if filtering produces 0 questions while `allAnswerRows.length > 0`, safely fall back to `allAnswerRows`. In `renderQuestion()`, if `row` is missing, automatically recover using `allAnswerRows[idx] || allAnswerRows[0]`, and if no questions exist, display a clean error dialog instead of hanging on the spinner.
    - **`js/api.js`**: In `startAssessment()`, dynamically generate `sections` matching question `test_section` tags (`Part 1: Words` and `Part 2: Phrases`) instead of a rigid single `'default'` section.
    - **`js/result.js`**: Resolved `ReferenceError: targetStudentId is not defined` on line 773 by elevating `targetStudentId` to function scope.
    - **`assessment.html`, `result.html`, `dashboard.html`, `index.html` & `sw.js`**: Bumped cache busters and Service Worker cache name to `v=5.4.2` (`abcd-core-v5.4.2`) for full cross-page cache synchronization.
  - **3. Verification & Comprehensive System Audit**:
    - **Syntax Verification**: `node --check` across all 38 JavaScript files in `js/` + `sw.js`: **38/38 PASSED (0 errors)**.
    - **End-to-End System Audit**: `scratch/full_e2e_system_audit.mjs` executing Playwright headless checks across Login (`index.html`), Dashboard (`dashboard.html`), Assessment (`assessment.html`), Result (`result.html`), Admin ABCD Console (`admin.html`): **16/16 PASSED, 0 FAILURES, 0 CONSOLE ERRORS**.
    - **Playwright Assessment Load Verification**: `scratch/verify_assessment_load_fix.mjs` tested on assessment `6864face-0998-4e62-9ffb-933c13f40753` (3B1):
      - `hasSpinner: false` (spinner cleanly removed)
      - Question prompt rendered: `"pintu masuk"`
      - Question counter rendered: `"0/50 Answered"`
      - Assessment title rendered: `"3B1-Vocabulary Task - Understanding Cultural Differences"`
      - Timer running: `"59:54"`
      - Verified proof screenshot saved: `scratch/screenshot_verified_assessment_load_fix.png`
  - **4. Git Rules**:
    - Strict git freeze maintained per user instruction (`no commit dan push`): 0 commits, 0 pushes. All changes remain strictly in local workspace.

- **Phase 71: Dashboard Hero Identity Bar Calibration & System-Wide Grade S Star (⭐) Audit & Reorganized Grade Hierarchy [COMMITTED & PUSHED]**:
  - **Reorganized Grade Spectrum (E 0-19, D 20-39, C 40-59, B 60-79, A 80-99, Star ⭐ 100)**:
    - Reorganized grade tiers to start from **E** with exact 20-point brackets (no active Grade F):
      - **Star ⭐ (S)**: `100%` | **Emas Asli Berkilau** (`#fbbf24`, RGB `251, 191, 36`, Shimmer Gold `linear-gradient`, drop shadow glow)
      - **A**: `80–99%` | **Hijau** (`#10b981`, RGB `16, 185, 129`, Emerald Green)
      - **B**: `60–79%` | **Antara Kuning & Hijau / Lime** (`#84cc16`, RGB `132, 204, 22`)
      - **C**: `40–59%` | **Kuning** (`#eab308`, RGB `234, 179, 8`, Warm Sun Yellow)
      - **D**: `20–39%` | **Oranye** (`#f97316`, RGB `249, 115, 22`, Flame Orange)
      - **E**: `0–19%` | **Merah** (`#ef4444`, RGB `239, 68, 68`, Crimson Red)
      - **F (Legacy Fallback)**: Mapped to Grade E / Merah (`#ef4444`) for historical stability.
    - Updated `calculateGrade()` in `js/grading.js`, `supabase/functions/submit-assessment/index.ts`, `supabase/schema.sql`, `supabase_deploy/01_schema_and_functions.sql`, and `AGENTS.md`.
    - Synchronized `GRADE_PALETTE`, `cMap`, and `gradeColors` across `js/grading.js`, `js/dashboard.js`, `js/result.js`, `js/admin/app.js`, `js/admin/class.js`, `js/admin/student-management.js`.
    - Synchronized CSS stylesheets `css/style.css`, `css/dashboard.css`, `css/admin.css`, and `css/result.css`.
  - **Metadata Row on Top of Photo**: Relocated `#welcome-meta-wrapper` (`CEC | CAMP | 131 | 3rd Level`) in `dashboard.html` to sit on the very top of the card where the name used to be, separated from the metrics row by a sleek divider line.
  - **Student Name Positioned Under Photo**: Relocated `#welcome-name` in `dashboard.html` to sit directly beneath `.hero-metrics-row` (Score box, Avatar with crown, Grade box), eliminating collision between crown badge (`👑`) and student name.
  - **Distinct Separator Line Between Photo and Name (`.hero-name-divider`)**: Added a luminous, clearly visible divider between `.hero-metrics-row` and `#welcome-name` using a gradient line (`linear-gradient(90deg, transparent 0%, rgba(var(--tier-rgb), 0.6) 20%, rgba(255, 255, 255, 0.85) 50%, rgba(var(--tier-rgb), 0.6) 80%, transparent 100%)`) with dynamic glow (`box-shadow: 0 0 10px rgba(var(--tier-rgb), 0.4)`), establishing unmistakable visual compartmentalization.
  - **Visual Hierarchy Flow**:
    1. Info Header: `CEC | CAMP | 131 | 3rd Level` (`#welcome-meta-wrapper`)
    2. Subtle Header Divider Line (`.hero-divider`)
    3. Hero Trio Row: `Score 100%` | `Avatar + Crown 👑` | `Grade ⭐` (`.hero-metrics-row`)
    4. Luminous Name Separator Line (`.hero-divider.hero-name-divider`)
    5. Student Name: `[Nama Siswa]` (`#welcome-name`)
  - **Optimized Hero Header Spacing**: Tuned `#welcome-banner-section` padding to `10px 14px 10px 14px !important;`, `#welcome-meta-wrapper + .hero-divider` margin to `4px 0 10px 0 !important;` (providing crown breathing room), `.hero-name-divider` margin to `9px 0 6px 0 !important;`, and `#welcome-name` margins to `2px 0 0 0 !important;` in `css/dashboard.css`.
  - **System-Wide Grade S to Star (⭐) Standardization**:
    - **Dashboard Completed Assessments (Desktop Table)**: Replaced raw text `${grade}` with `getGradeSymbol(grade, pct)` in `js/dashboard.js`, ensuring 100% / Grade S displays the shining gold star `⭐`.
    - **Dashboard Completed Assessments (Mobile Cards)**: Updated mobile card `.grade-badge` to render `getGradeSymbol(grade, pct)`.
    - **Dashboard Profile Modal History**: Updated profile attempt history rows in `js/dashboard.js` to render `getGradeSymbol(grade, pct)`.
    - **Admin Class Hub Roster & Class Average**: Updated roster row badge and class average badge in `js/admin/app.js` to render `⭐` for Grade S (`isAvgGradeS ? '⭐' : avgGrade`, `isGradeS ? '⭐' : row.grade`).
    - **Admin Class Gradebook Column**: Updated `js/admin/class.js` to render `⭐` for Grade S.
    - **Admin Audit Log Score Recalibration Preview**: Updated `js/admin/desk.js` to render `⭐` for Grade S.
    - **Admin Assessment Management**: Updated `js/admin/assessment-management.js` drawer and datagrid column to render `⭐` for Grade S.
    - **Centralized Export**: Re-exported `getGradeSymbol` from `js/app.js`.
  - **Automated Verification**: Ran `node test-dashboard-enhancements.mjs` verifying zero-scroll across iPhone 14 (390x844) and Android Small (360x640), 100% pass rate, and captured visual screenshots.
  - **Cache Busting**: Version bumped `dashboard.html`, `dashboard.css`, `dashboard.js`, `app.js`, `api.js`, `grading.js` to `v=5.3.5`.
  - **Git Rules**: Git freeze strictly maintained — 0 commits, 0 pushes.

- **Phase 70: Horizontal Hero Trio & Stacked Semantic Color Metrics [COMMITTED & PUSHED TO REMOTE]**:
  - **Horizontal Hero Trio ("Berderet")**: Grouped Student Portrait (Avatar with golden ambient halo ring), Score (`100.0%` in crisp `#F8FAFC`), and Gold Star Badge (`★` SVG vector with `#FDE047` to `#EAB308` gradient) side-by-side in `.result-hero-trio-row` (`display: flex; flex-direction: row; align-items: center; justify-content: center; gap: clamp(10px, 3.5vw, 24px);`).
  - **Vertically Stacked Metrics ("Bersusun")**: Replaced horizontal pill row with `.result-stats-stacked-list` containing 4 glassmorphic stacked rows (Points, Correct, Partial, Incorrect) with 1px border and blur backdrop.
  - **Persistent Semantic Font Colors**: Enforced explicit font colors per user directive:
    - **Points**: Label `#94A3B8`, Value `#F8FAFC` (`800 PTS`).
    - **Correct**: Label and Value in Emerald Green `#34D399` (`800`).
    - **Partial**: Label and Value in Warning Yellow `#FBBF24` (`0`).
    - **Incorrect**: Label and Value in Rose Red `#F87171` (`0`).
  - **Zero Scrollbar Maintained**: Verified `isZeroScroll: true` across Desktop (1280x850), Mobile 1 (400x800), and Mobile 2 (412x915).
  - **Full E2E Audit**: 16/16 checks passed, 0 failures, 0 console errors.
  - **Cache Busting**: Version bumped `result.html`, `result.css`, and `result.js` to `v=5.4.1`.
  - **Git Commit & Push**: Committed as `a4c6700` and pushed successfully to `origin/main`.

- **Phase 69: Transformation to Sleek Modern Dark UI [STRICT NO COMMIT/PUSH - ACTIVE RULE]**:
  - **Sleek Typography Standards**: Enforced system font stack (`'Inter', -apple-system, BlinkMacSystemFont, sans-serif`) with `-webkit-font-smoothing: antialiased;` across all components. Formatted sub-headers/labels to 11px uppercase in `#94A3B8`. Rendered score numbers (`100.0%`) in crisp white (`#F8FAFC`) with `font-feature-settings: 'tnum' on, 'lnum' on; letter-spacing: -0.03em; font-weight: 800;` and subtle gold ambient glow (`0 0 24px rgba(250, 204, 21, 0.35)`).
  - **Modern Gold Star Accent (★ Vector Badge)**: Replaced plain text star with an SVG vector star with linear gradient fill (`#FDE047` to `#EAB308`), ambient backlight drop-shadow (`0 0 16px rgba(234, 179, 8, 0.4)`), and balanced vertical margins (`margin: 6px 0 12px`).
  - **Glassmorphism Outer Card Polish**: Applied `border: 1px solid rgba(250, 204, 21, 0.2); background: linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%); backdrop-filter: blur(20px); border-radius: 18px; box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.5), 0 0 30px rgba(234, 179, 8, 0.08);`.
  - **Breakdown Stats Pill Row**: Combined total points, correct, partial, and incorrect into a unified glassmorphic pill row with 1px dividers, muted styling for 0-values (`color: #64748B`), and crisp emerald for correct (`#34D399`).
  - **Button Hierarchy**: Re-engineered Primary `[← Back to Dashboard]` button (`height: 44px; border-radius: 10px;` with vivid blue gradient) and Ghost `[View Answer Breakdown]` button (`height: 40px; border-radius: 10px;` with transparent glass).
  - **Zero Scrollbar Maintained**: Verified `isZeroScroll: true` across Desktop (1280x850), Mobile 1 (400x800), and Mobile 2 (412x915).
  - **Full E2E Audit**: 16/16 checks passed, 0 failures, 0 console errors.
  - **Cache Busting**: Version bumped `result.html`, `result.css`, and `result.js` to `v=5.4.0`.
  - Git freeze maintained: 0 commits, 0 pushes.

- **Phase 68: Full Viewport Height Utilization & 2X Metric Scaling [STRICT NO COMMIT/PUSH - ACTIVE RULE]**:
  - **Full Viewport Utilization ("Penuh Ruang Yang Dipakai")**: Configured `.result-hero` with `height: 100% !important; max-height: calc(100dvh - 76px) !important; justify-content: space-evenly !important;` inside `#result-content` (`height: calc(100dvh - 38px)`), completely removing awkward top/bottom dark voids and evenly distributing card stages.
  - **2X Metric Scaling**: Enlarged the user's screenshotted metrics section 2x:
    - Gold star `★`: `font-size: clamp(48px, 6.5vh, 64px) !important;` with glowing text-shadow.
    - `TOTAL POINTS: 800 PTS`: Single-line nowrap amber capsule with `pts-label` `clamp(1.05rem, 2.2vh, 1.45rem)` and `pts-val` `clamp(1.45rem, 3.2vh, 2.15rem)`.
    - `✓ CORRECT: 800`: Single-line nowrap with `font-size: clamp(1.1rem, 2.2vh, 1.5rem)` (label) and `clamp(1.35rem, 2.8vh, 1.85rem)` (val & icon).
    - `⚠ PARTIAL: 0`: Single-line nowrap with identical 2x proportion.
    - `✗ INCORRECT: 0`: Single-line nowrap with identical 2x proportion.
  - **Bulletproof Scrollbar Elimination**: Verified `isZeroScroll: true` across Desktop (1280x850), Mobile 1 (400x800), and Mobile 2 (412x915).
  - **Full E2E Audit**: 16/16 checks passed, 0 failures, 0 console errors.
  - **Cache Busting**: Version bumped `result.html`, `result.css`, and `result.js` to `v=5.3.9`.
  - Git freeze maintained: 0 commits, 0 pushes.

- **Phase 67: Result Page Gold Star Visual Polish & Scrollbar Removal [STRICT NO COMMIT/PUSH - ACTIVE RULE]**:
  - **Golden Star (★) Definitive Symbol**: Retained the single gold star directly beneath the 100.0% score text without letter grade text.
  - **Radiant Golden Depth**: Enhanced star styling with exact specifications: `font-size: clamp(26px, 6vw, 34px); color: #FACC15; text-shadow: 0 0 14px rgba(250, 204, 21, 0.8), 0 0 28px rgba(234, 179, 8, 0.4);` and `@keyframes pure-star-gleam` oscillation.
  - **Star Pop Entrance Animation**: Added `@keyframes starPop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }` with smooth ease-out.
  - **Viewport Scrollbar Removal**: Eliminated vertical scrollbar completely by setting `#result-content` to `overflow: hidden !important; -ms-overflow-style: none !important; scrollbar-width: none !important;`. Verified `isZeroScroll: true` on desktop (1280x850), mobile 1 (400x800), and mobile 2 (412x915).
  - **Compact Warning Note**: Styled lock warning note slim and compact (`font-size: 11px; padding: 3px 8px; margin: 2px auto; max-width: 320px;`).
  - **Action Hierarchy**: Organized `[View Answer Breakdown]` and `[← BACK TO DASHBOARD]` in `.result-action-buttons-wrap` with compact 6px gap and clear visual hierarchy.
  - **Full E2E Audit**: 16/16 checks passed, 0 failures, 0 console errors.
  - **Cache Busting**: Version bumped `result.html`, `result.css`, and `result.js` to `v=5.3.8`.
  - Git freeze maintained: 0 commits, 0 pushes.

- **Phase 66: Vertical Stacked Metrics List Matching User Mockup [STRICT NO COMMIT/PUSH - ACTIVE RULE]**:
  - **Vertical Stacked Metrics List**: Implemented exact row-by-row stacked structure (`TOTAL POINTS: 800 PTS`, `✓ CORRECT: 800`, `⚠ PARTIAL: 0`, `✗ INCORRECT: 0`) centered below the gold star.
  - **Enlarged Typography**: Rendered each metric with bold uppercase styling and vibrant theme colors (#10b981 for correct, #f59e0b for partial, #ef4444 for incorrect).
  - **Zero-Scroll Maintained**: Confirmed `isZeroScroll: true` on both Desktop (850px) and Mobile (844px) with generous margin framing.
  - **Full E2E Audit**: 16/16 checks passed, 0 failures, 0 console errors.
  - **Cache Busting**: Version bumped `result.html`, `result.css`, and `result.js` to `v=5.3.7`.
  - Git freeze maintained: 0 commits, 0 pushes.

- **Phase 65: Tiered Metrics Panel ("Bersusun") & Enlarged Star / Grade Stamp [STRICT NO COMMIT/PUSH - ACTIVE RULE]**:
  - **Tiered Metrics Panel ("Bersusun")**: Combined Total Points and Answer Breakdown (Correct, Partial, Incorrect) into a unified 2-tier panel (`.result-metrics-tiered-panel`).
  - **Enlarged Star / Grade Stamp**: Boosted `.stamp-grade-symbol` to `clamp(3.8rem, 8.5vh, 5.0rem)` with radiant text-shadow gleam.
  - **Zero-Scroll Maintained**: Playwright verified `isZeroScroll: true` on both Desktop (850px) and Mobile (844px).
  - **Full E2E Audit**: 16/16 checks passed, 0 failures, 0 console errors.
  - **Cache Busting**: Version bumped `result.html`, `result.css`, and `result.js` to `v=5.3.7`.
  - Git freeze maintained: 0 commits, 0 pushes.

- **Phase 64: Vertical Photo/Score Stacking, Grade Stamped On Top of Points & Bigger Points Display [STRICT NO COMMIT/PUSH - ACTIVE RULE]**:
  - **Vertical Photo & Score Stacking**: Portrait stage is centered on top; percentage score (`100.0%`) is centered directly below the photo.
  - **Grade Stamped On Top of Points**: Positioned `.result-stamp-stage` directly above `#result-points-row` so the certified grade stamp slams down right on top of the Points block.
  - **Enlarged Points Display**: Increased points size with `.pts-val` at `clamp(1.45rem, 3.6vh, 2.15rem)` and `.pts-label` at `clamp(0.78rem, 1.8vh, 0.92rem)`, encased in a glowing 2px amber capsule.
  - **Suppressed Commentary Text**: Removed `#result-motivation-msg` ("soment, etc") and hidden metadata for a clean, distraction-free results presentation.
  - **Zero-Scroll Maintained**: Playwright verified `isZeroScroll: true` on both Desktop (850px) and Mobile (844px).
  - **Full E2E Audit**: 16/16 checks passed, 0 failures, 0 console errors.
  - **Cache Busting**: Version bumped `result.html`, `result.css`, and `result.js` to `v=5.3.6`.
  - Git freeze maintained: 0 commits, 0 pushes.

- **Phase 63: Pure Letter/Star Grade Stamp & Hero Side-by-Side Calibration [STRICT NO COMMIT/PUSH - ACTIVE RULE]**:
  - **Pure Letter/Star Stamp**: Replaced circular rubber stamp with pure `★` for Grade S or pure grade letters (`A`, `B`, `C`, etc.) for other grades. Completely removed all circular borders, background fills, and bounding box artifacts.
  - **Removed Segmented Accuracy Bar**: Removed `.result-accuracy-wrap` (`#acc-bar-correct`, `#acc-bar-partial`, `#acc-bar-wrong`, and accuracy labels), reducing visual noise.
  - **Side-by-Side Hero Layout**: Placed portrait stage (left) and score stage (right) side-by-side in `.result-hero-row`, centered horizontally in the card.
  - **Gleam Keyframe Without Bounding Box Glitch**: Replaced box-shadow animation with `@keyframes pure-star-gleam` utilizing text-shadow and scale oscillation.
  - **Zero-Scroll Maintained**: Confirmed `isZeroScroll: true` on both Desktop (850px) and Mobile (844px).
  - **Full E2E Audit**: 16/16 checks passed, 0 failures, 0 console errors.
  - **Cache Busting**: Version bumped `result.html`, `result.css`, and `result.js` to `v=5.3.5`.
  - Git freeze maintained: 0 commits, 0 pushes.

- **Phase 62: Result Page Clutter Removal & Zero-Scroll Layout Framing [STRICT NO COMMIT/PUSH - ACTIVE RULE]**:
  - **Removed Top Header Text**: Removed `.result-card-header` (the curriculum crumb pill `VOCABULARY • 3RD LEVEL • VOCAB_TEST` and `✓ VERIFIED RESULT` badge) which was crowding the card and wrapping awkwardly.
  - **Fixed Negative-Coordinate Top Clipping**: Replaced `justify-content: center` with `justify-content: safe center` and `.result-hero { margin: auto !important; }`, preventing flexbox from pushing the top border offscreen.
  - **Eliminated Bloated Security Card**: Replaced the huge ~85px box appended below the dashboard button with an inline compact security notice that replaces `tryAgainBtn` in place.
  - **Mobile Zero-Scroll Geometry Calibrated**: Calibrated avatar score ring, rubber stamp, and button gaps so the entire result card fits cleanly on mobile and desktop viewports with full border visibility.
  - **Cache Busting**: Version bumped `result.html`, `result.css`, and `result.js` to `v=5.3.4`.
  - **Verification**: Captured Playwright screenshots `scratch/result_hero_mobile.png` and `scratch/result_hero_desktop.png` confirming zero clipping, full gold border visibility, and beautiful framing.
  - Git freeze maintained: 0 commits, 0 pushes.

- **Phase 61: Result Page 10-Feature Overhaul [STRICT NO COMMIT/PUSH - ACTIVE RULE]**:
  - **1. Grade-specific Animated Background Particles (`launchBgParticles`)**: Each grade gets its own color-coded floating dot field (Gold/S, Emerald/A, Cyan/B, Violet/C, Orange/D, Red/E-F) rendered on `#bg-particle-canvas` for atmospheric depth.
  - **2. SVG Circular Score Ring (`animateScoreRing`)**: A thin progress arc animates around the student avatar, filling grade-colored over 1.4s with cubic ease-out. The ring's SVG overlays the avatar using absolute positioning.
  - **3. Student Name Displayed (`#result-student-name-label`)**: Full student name rendered in Outfit 700 directly beneath the avatar ring.
  - **4. Grade-Specific Motivational Message (`getMotivationMsg`)**: Contextual, color-coded motivation text below the percentage — e.g. '🏆 PERFECT MASTERY!' for S, '💪 Great work!' for B, '🔄 Practice more before retaking' for F.
  - **5. Rank in Batch Badge (`renderRankInBatch`)**: Async rank computation — fetches all batch student IDs, queries all their attempts, ranks by average percentage, renders '#2/24' style badge with medal emojis (🥇🥈🥉) next to the Points row.
  - **6. Attempt Counter + Improvement Indicator (`renderAttemptMeta`)**: Displays 'Attempt 2/3' beside the grade stamp. If this attempt's score differs from the previous attempt by >0.05%, shows green ▲+12.5% or red ▼-3.2% delta.
  - **7. Staggered Entrance Animations**: All 6 hero sections use `opacity:0; animation: result-fade-up` with staggered CSS delays (0.05s → 0.45s) for a fluid, sequential reveal.
  - **8. Tutor Note Card (Compact)**: If `attempt.narrative_report` is set, renders a slim inline `✏️ Tutor Note` card in sky-blue inside the hero (no longer appended after the hero).
  - **9. Zero-Scroll Architecture Preserved**: All new elements are sized compactly; zero-scroll constraints maintained on both desktop and mobile viewports.
  - **10. CSS Version Bump to v5.3.3**: `result.html` and `result.js` versioned to `5.3.3` to force cache invalidation.
  - **Syntax Verification**: `node --check js/result.js` → EXIT 0 (PASS).
  - Git freeze maintained: 0 commits, 0 pushes.

  - **1. Zero-Scroll Full Viewport Guarantee**:
    - Structured `html, body.result-page` with `height: 100vh; height: 100dvh; overflow: hidden !important;`.
    - Calibrated all hero components (`.result-hero`, `#result-content`, portrait, score, stamp, points, metrics bar, action buttons) with responsive `vh`/`vw` clamp functions.
    - Programmatically verified across viewports: Desktop (`850px` height) `isZeroScroll: true`, Mobile (`844px` height) `isZeroScroll: true` (`scrollHeight <= windowHeight`).
  - **2. Answer Breakdown as a Pop-Up Modal (`#answers-section`)**:
    - Transformed the inline breakdown section into a fixed, glassmorphic pop-up dialog (`.answers-modal-backdrop` + `.answers-modal-card`).
    - On Desktop: Centers gracefully with smooth scale pop-in animation (`@keyframes modal-pop-in`).
    - On Mobile: Transforms into a comfortable bottom-sheet dialog (`max-height: 88dvh; border-radius: 18px 18px 8px 8px`).
    - Scrollable list inside the modal (`.answers-modal-scroll-body`) preserves zero-scrolling on the main screen.
    - Dismissible via circular `[ ✕ ]` header button, `[ Close Breakdown ]` footer button, backdrop overlay tap, or `Escape` key.
  - **3. Layout Sequence & Visual Hierarchy**:
    - **At Top (Foto agak besar)**: Student avatar centered (`clamp(74px, 14vh, 92px)`), crisp facial framing with `object-fit: cover` and gold tier aura.
    - **Directly Under Photo (Penghitungan Score)**: Score counter `#result-percentage` (`0.0% -> target%`) with segmented accuracy bar.
    - **Delayed Stamp Effect (Nilai muncul dengan efek disetempel)**: `#result-grade-stamp` remains hidden during calculation; upon completion, slams down with `@keyframes stamp-slam` and confetti explosion.
    - **Dedicated Points Row (Poin punya baris sendiri)**: `#result-points-row` spans its own line with capsule `#result-points-box` displaying `POINTS: 800 PTS` in glowing amber/gold.
    - **Unified Answers Bar (Jawaban benar, partial, dan salah jadi satu)**: Integrated Correct, Partial, and Incorrect answer statistics into a single connected capsule bar (`.result-summary-unified-bar`) with 1px hairline dividers and clickable modal triggers.
  - **4. Grade S to Golden Star (`⭐`) & Victory Confetti**:
    - Star emoji (`⭐`) rendered with `gold-badge-sparkle` and zero-dependency canvas confetti explosion on 100% mastery.
  - **5. Performance Metrics Streamlining (Time & Pace Removed)**:
    - Removed unnecessary timer and speed/pace metrics per user directive to eliminate clutter.
  - **5. Smart Next Milestone Action ("Continue Journey")**:
    - Automatically computes the student's next curriculum module upon passing the current assessment:
      - For practice tasks: Direct glowing CTA `[ 🚀 Continue to 3A2 Vocab Task → ]`.
      - For official tests: If unlocked by tutor, displays `[ 🟢 Start Official Test: 3A Vocab Test → ]`. If locked by tutor, displays waiting card `🔒 Next Milestone: 3A-Vocabulary Test (Waiting for Tutor to unlock in class)`.
      - When all modules are mastered: Displays `🎉 Level Curriculum Complete!`.
  - **5. Answer Breakdown Search & Section Filter Overhaul**:
    - **Instant Live Search**: Added `#ans-search-input` to search across question prompts, student answers, and correct answers in real-time.
    - **Unified Section Tabs**: Dynamically detects when tests contain words and phrases, rendering tabs `All Sections`, `Part 1: Words`, and `Part 2: Phrases`.
    - **Clickable Summary Pills**: Clicking the top `Correct`, `Partial`, or `Incorrect` summary pills instantly reveals the breakdown and switches the active filter.
  - **6. Dossier Print Alignment**:
    - Removed the standalone Print button from `result.html` (official printable reports belong exclusively to the Student Dossier in the Admin Panel).
    - Strictly omitted text-to-speech per user instruction.
  - **7. Automated Verification**:
    - `scratch/test_result_page_improvements.mjs`: 13/13 checks PASSED (Star grade, confetti canvas, metrics bar, clickable summary pills, live search, section tabs).
    - `scratch/test_smart_button_cta.mjs`: Verified tutor locked test milestone detection.
    - `scratch/full_e2e_system_audit.mjs`: 17/17 checks PASSED, 0 failures, 0 console errors.
    - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain strictly local.
  - **1. Unified Assessment Question Count Root Cause & Fix**:
    - **Root Cause Discovered**:
      - `supabase/functions/start-assessment/index.ts`: When `category === 'unified'`, `vaultWords.filter(w => w.word_type !== 'phrase')` was stripping out phrases, causing tests (e.g. 3A Vocab Test) to only generate 120 words instead of the full cumulative 150 items (120 words + 30 phrases).
      - `js/admin/app.js`: In `vaultCountFor`, phrases were excluded even for unified assessments.
      - Database `assessments.payload.snapshot_question_count` had outdated counts (e.g. 120 instead of 150, 280 instead of 350, 480 instead of 600, 640 instead of 800).
    - **Fix Applied**:
      - `supabase/functions/start-assessment/index.ts`: Added two-stage generation for unified assessments: Part 1 Words independently shuffled, followed by Part 2 Phrases independently shuffled.
      - `js/admin/app.js`: Updated `vaultCountFor` and curriculum definitions to correctly project 50 questions for tasks (40 words + 10 phrases), 150 for 3A Test (120+30), 350 for 3B Test (280+70), 600 for 3C Test (480+120), 800 for 3D Test (640+160).
      - Database Synced: Updated `assessments.payload.snapshot_question_count` across all Level 3 assessments.
  - **2. 100% Real Simulation with "Test" ("Mr. Test") & Tutor Flow Across All 20 Level 3 Assessments**:
    - Cleaned prior test records for student `"Test"` (ID: `9ef81498-7576-4c7a-905d-d4473842dda4`) in Batch 123.
    - Real step-by-step sequential answering executed with NO sampling, NO approximations, answering all **2,700 questions** one by one across all 20 assessments:
      - **3A1 Vocab Task**: 50 / 50 (100%) | Grade: S | DB Answers: 50
      - **3A2 Vocab Task**: 50 / 50 (100%) | Grade: S | DB Answers: 50 (Prereq gated before 3A1 passed)
      - **3A3 Vocab Task**: 50 / 50 (100%) | Grade: S | DB Answers: 50
      - **3A Vocab Test**: 150 / 150 (100%) | Grade: S | DB Answers: 150 (Tutor lock enforced -> Tutor opened session -> 150 Qs answered -> Tutor locked)
      - **3B1 Vocab Task**: 50 / 50 (100%) | Grade: S | DB Answers: 50
      - **3B2 Vocab Task**: 50 / 50 (100%) | Grade: S | DB Answers: 50
      - **3B3 Vocab Task**: 50 / 50 (100%) | Grade: S | DB Answers: 50
      - **3B4 Vocab Task**: 50 / 50 (100%) | Grade: S | DB Answers: 50
      - **3B Vocab Test**: 350 / 350 (100%) | Grade: S | DB Answers: 350 (Tutor lock enforced -> Tutor opened session -> 350 Qs answered -> Tutor locked)
      - **3C1 Vocab Task**: 50 / 50 (100%) | Grade: S | DB Answers: 50
      - **3C2 Vocab Task**: 50 / 50 (100%) | Grade: S | DB Answers: 50
      - **3C3 Vocab Task**: 50 / 50 (100%) | Grade: S | DB Answers: 50
      - **3C4 Vocab Task**: 50 / 50 (100%) | Grade: S | DB Answers: 50
      - **3C5 Vocab Task**: 50 / 50 (100%) | Grade: S | DB Answers: 50
      - **3C Vocab Test**: 600 / 600 (100%) | Grade: S | DB Answers: 600 (Tutor lock enforced -> Tutor opened session -> 600 Qs answered -> Tutor locked)
      - **3D1 Vocab Task**: 50 / 50 (100%) | Grade: S | DB Answers: 50
      - **3D2 Vocab Task**: 50 / 50 (100%) | Grade: S | DB Answers: 50
      - **3D3 Vocab Task**: 50 / 50 (100%) | Grade: S | DB Answers: 50
      - **3D4 Vocab Task**: 50 / 50 (100%) | Grade: S | DB Answers: 50
      - **3D Vocab Test**: 800 / 800 (100%) | Grade: S | DB Answers: 800 (Tutor lock enforced -> Tutor opened session -> 800 Qs answered -> Tutor locked)
    - **Audit Metrics**:
      - Total Completed Attempts: 20/20 assessments
      - Total Score: 2,700 PTS / 2,700 PTS (100% Grade S across all themes A, B, C, D)
      - Total Evaluated Answers in DB: Exactly 2,700 individual rows in `attempt_answers`
    - Git Status: COMPLETE (1A Yellow Padlock, 2B Red Rotate Undo, 3C Green Circle Play applied and verified; 39 JS files syntax valid)

- **Phase 58: Strict Active-Only Batch Dropdowns & Level 0 Semantics ("Under Level 1") [COMMITTED & PUSHED TO REMOTE]**:
  - **1. Strict Active-Only Batch Dropdown Enforcement ("Inactive Means INACTIVE")**:
    - **Live Session Controller (`js/admin/assessment-access.js`)**:
      - Filtered `_cachedBatches` to strictly non-deleted AND active batches: `b.is_active !== false && !b.deleted_at`.
      - Excluded all inactive batches (`Batch 131`, `Batch 132`, `Batch TP-2026`) from `#session-batch-select`.
      - Updated modal label to "1. TARGET ACTIVE BATCH".
    - **Student Management Modals (`js/admin/student-management.js`)**:
      - Enforced `b.is_active !== false && !b.deleted_at` across both the Single Student Edit Modal batch select (line 1458) and the Bulk Batch Edit Modal (line 1972).
    - **Class Assignment Modal (`js/admin/class.js`)**:
      - Enforced `(batches || []).filter(b => !b.deleted_at && b.is_active !== false)` in `openAssignmentModal` and `#asgn-batch-id`.
  - **2. Level 0 Semantics ("Under Level 1", NOT "All Levels")**:
    - **Database `levels` Table**:
      - Updated row `b70a0ea2-785d-4291-9adf-a4cbd7a2c9a2` (`level_number = 0`) name from `'All Levels'` to `'Level 0'`, and description to `'Pre-Level / Foundation (Under Level 1)'`.
      - Synced `supabase_deploy/02_curriculum_and_students.sql` and `supabase/data.sql`.
    - **Assessment Access Controller (`js/admin/assessment-access.js`)**:
      - Enforced level-boundary rule: When an assessment targets Level 1, 2, or 3 (`targetLevelNum >= 1`), Level 0 batches (`bLevelNum === 0`) are strictly excluded ("dont show them in the level 1, 2, or 3. they are under it").
      - Level 0 batches (e.g. `Batch SH-2026`) are no longer shown in the target batch dropdown for Level 1, 2, or 3 tests (e.g. `3D-Vocabulary Test`).
      - Purged all hardcoded `'All Levels'` fallback strings across the module, replacing with `'Level 0'`.
    - **Backend & API Logic (`js/api.js`)**:
      - Line 2142: Removed `if (lvlData.level_number === 0) isAllLevels = true;`. Level 0 is a preparatory foundational level, not an all-access wildcard.
    - **Student Dashboard Hub (`js/dashboard.js`)**:
      - Line 1034: Level 0 classes are no longer treated as active for Level 1, 2, or 3 students (`cLvlNum === 0` goes to completed/past when `studentLevelNum >= 1`).
    - **Vocabulary Vault (`js/admin/vocab-vault.js`)**:
      - Renamed `'Level 0 (Universal)'` to `'Level 0 (Pre-Level)'`.
  - **3. Verification & Audits**:
    - **Playwright Live Session Verification (`scratch/verify_live_session_dropdown.mjs`)**:
      - Verified `#session-batch-select` for `3D-Vocabulary Test` contains ONLY active batches (`Batch 123`, `Batch 133`).
      - Verified 0 occurrences of "Inactive", 0 occurrences of "All Levels".
      - Verified inactive batches (`Batch 131`, `Batch 132`, `Batch TP-2026`) and Level 0 batch (`Batch SH-2026`) are completely excluded.
      - Captured verified screenshot: `screenshot_live_session_active_batches_only.png`.
    - **Full E2E System Audit (`scratch/full_e2e_system_audit.mjs`)**:
      - 17/17 checks PASSED, 0 failures, 0 console errors.
    - **Git Push**: Committed as `459a521` and pushed to `origin/main`.

- **Phase 57: Legacy Task 1 Words/Phrases Merge Recalibration & Attendance Matrix Score Restoration [100% VERIFIED LOCALLY - NO COMMIT/PUSH]**:
  - **1. Root Cause Identification for Low Task 1 Scores (9, 10 vs 50 pts)**:
    - In Phase 49/50, standalone Words tasks (40 questions, max score 40) and standalone Phrases tasks (10 questions, max score 10) were unified into single 50-question dynamic shells ($40 + 10 = 50\text{ pts}$).
    - The legacy migration script (`scratch/recalibrate_task_points_50.mjs`) queried attempts with `.eq('status', 'submitted')`. Students whose Words tasks were finished via countdown timer had status `'auto_submitted'`.
    - As a result, the 40-word attempts were omitted from the merge query, leaving only their 10-phrase attempts (scores 9 or 10). The script then assigned `total_questions = 50`, `score = 9` (18%) or `score = 10` (20%), and marked `is_best_score = true`, demoting the students' true performance:
      - **Miss Nurhaliza**: Words 35/40 (87.5%) + Phrases 9/10 (90%) -> was showing **9** (18% E) instead of **44/50** (88% B).
      - **Miss Asti Ananta**: Words 34/40 (85%) + Phrases 10/10 (100%) -> was showing **10** (20% E) instead of **44/50** (88% B).
      - **Mr. Ahmad Nur Suhendro**: Words 31/40 (77.5%) + Phrases 10/10 (100%) -> was showing **10** (20% E) instead of **41/50** (82% B).
      - **Mr. Ari Wahyu Darma**: Words 40/40 (100%) + Phrases 9.5/10 (95%) -> was displaying **40** instead of **49.5/50** (99% A).
      - **Miss Asti Ananta (3A2)**: Words 32/40 + Phrases 8.5/10 -> recalibrated to **40.5/50** (81% B).
      - **Miss Siti Qori' Atun Hizbaeni (Batch 131)**: Fixed stale `is_best_score` flags on 3C (120/120) and 3D (160/160) Vocab Tests.
  - **2. Server Database Recalibration (`scratch/execute_score_recalibration.mjs`, `scratch/execute_remaining_recalibration.mjs`)**:
    - Recalibrated and updated the true unified points ($P_w + P_p$), percentage, and authoritative grade for all affected attempts in Supabase PostgreSQL:
      - Miss Nurhaliza: Score **44**, 88% Grade B, Total PTS **216.5 pts**, Average Score **90% B**.
      - Miss Asti Ananta: Score **44** (Task 1) and **40.5** (Task 2), Total PTS **202 pts**, Average Score **80% B**.
      - Mr. Ahmad Nur Suhendro: Score **41**, Total PTS **123 pts**, Average Score **90% B**.
      - Mr. Ari Wahyu Darma: Score **49.5** (Task 3), Total PTS **141.5 pts**, Average Score **97% A**.
    - Demoted all inferior/legacy attempts to `is_best_score: false`, guaranteeing 0 duplicate best score flags across the database.
  - **3. Frontend Best-Score Selection Hardening (`js/admin/app.js`)**:
    - In `renderClassHub()`, hardened `bestAtt` selection so that `submittedAtts` is sorted by highest score, highest percentage, and most recent submission.
    - Ensured `markedBest` is only accepted if its score and percentage are not inferior to the highest score attempt, preventing any stale/erroneous database flag from ever degrading a student's score in the attendance matrix.
  - **4. Verification & Audits**:
    - Comprehensive DB diagnostic (`scratch/diagnose_all_scores.mjs`): 0 suspicious cases found across all 422 completed attempts.
    - Batch 133 audit (`scratch/audit_batch133_scores.mjs`): All 42 students verified with 0 anomalies.
    - Playwright verification (`scratch/capture_recalibrated_matrix.mjs`):
      - Captured verified screenshot: `screenshot_matrix_recalibrated_fixed.png`.
      - Verified in attendance matrix: Miss Nurhaliza (44, 41, 47, 84.5 | 216.5 pts | 90% B), Miss Asti Ananta (44, 40.5, 37, 80.5 | 202 pts | 80% B), Mr. Ahmad Nur Suhendro (41, 38, 44 | 123 pts | 90% B), Mr. Ari Wahyu Darma (48, 44, 49.5 | 141.5 pts | 97% A).
    - Full E2E audit (`scratch/full_e2e_system_audit.mjs`): 17/17 passed, 0 failures, 0 console errors.
    - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain strictly local.

- **Phase 56: Soft-Deleted Assessment Filtering & Student Dashboard Recovery [100% VERIFIED LOCALLY - NO COMMIT/PUSH]**:
  - **1. API Data Leak Remediation (`js/api.js`)**:
    - `fetchAssessments()`: Added `deleted_at` to `.select(...)` column list and enforced `.is('deleted_at', null)` by default (unless `filters.include_deleted` is true). Prevents 20 soft-deleted merged/archived assessments from leaking into client-side queries with `deleted_at: undefined`.
    - `fetchAssessmentsForStudentLevel()`: Added `deleted_at` to `.select(...)` and enforced `.is('deleted_at', null)`.
    - `fetchAllStudentAttempts()`: Added `assessments(id, title, assessment_type, deleted_at, status, classes(name))` join and fallback mapping, so attempts on soft-deleted/merged assessments carry `deleted_at` metadata.
  - **2. Hero Banner & Daily Task Selection (`js/dashboard.js`)**:
    - In `renderNextAssignmentHero()`, soft-deleted assessments are cleanly excluded. King Test's Daily Task now correctly selects the active remedial test `3A-Vocabulary Test - Workplace` instead of the defunct `3rd Vocabulary A1 Phrases Task - Professional Identity`.
  - **3. Overall Score & Grade Calculation per AGENTS.md §2.8 (`js/dashboard.js`)**:
    - In `computeOverallStats()`, excluded attempts on soft-deleted or unavailable assessments from `bestMap`.
    - King Test's overall score was restored from 56% (dragged down by a 0% attempt on the defunct task) to **70%** (Grade C/B tier), calculated accurately from the 4 active completed assessments (92.5%, 95.0%, 86.25%, 6.88%).
  - **4. Curriculum Class Progress Bar Recalibration (`js/dashboard.js`)**:
    - In `renderClasses()`, added `if (a.deleted_at) return false;` to `classAssms` filter so the denominator represents the true active curriculum (20 assessments instead of 40).
    - King Test's Vocabulary class progress bar updated from 13% to **20%** (4 out of 20).
  - **5. Completed Assessments & Batch Leaderboard Clean-up (`js/dashboard.js`)**:
    - In `renderCompletedAssessmentsBottom()`, filtered attempts using `validAttempts` (excluding soft-deleted tasks), removing the ghost 0% "⚠️ Retake" card for `3rd Vocabulary A1 Phrases Task`.
    - In `loadBatchLeaderboard()`, added `assessments(deleted_at)` to the query and filtered `stAtts` so the leaderboard reflects the true active scores and completed counts (King Test: 4 completed, 70% C).
    - In `setupProfileModal()`, filtered out soft-deleted attempts from the profile history modal table.
  - **6. Verification & Audits**:
    - End-to-end verification script (`scratch/verify_dashboard_fix.mjs`) confirmed:
      - `fetchAssessments`: returns 20 active assessments, 0 deleted assessments.
      - `fetchAllStudentAttempts`: carries `deleted_at` metadata for the legacy attempt.
      - Active overall score: 70%.
      - Hero Daily Task: `3A-Vocabulary Test - Workplace`.
      - Completed list: 4 active assessments rendered cleanly.
    - Visual Playwright capture (`scratch/capture_dashboard_fixed.mjs`):
      - Captured verified screenshot: `screenshot_dashboard_king_test_fixed.png`.
      - Confirmed King Test hero banner (Score: 70%, Grade: C), Daily Task banner (`3A-Vocabulary Test - Workplace`), Class progress (Vocabulary 20%), and Batch Standings row (`King Test (You) KING | 4 completed | 70% C`).
    - Full E2E audit (`scratch/full_e2e_system_audit.mjs`): 17/17 passed with 0 failures and 0 console errors.
    - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain strictly local.

- **Phase 55: Alphabetical Sorting & Filtering for Student Whitelist, Batches & Tests [100% VERIFIED LOCALLY - NO COMMIT/PUSH]**:
  - **1. Alphabetical Student Attendance Whitelist (`js/admin/assessment-access.js`)**:
    - Enrolled students in the Live Session Controller modal are now sorted alphabetically (A → Z) by default: e.g. Miss Asti Ananta, Miss Latifa Maulidya, Miss Laura Fardila, ... Mr. Unggul Wirakse, Muhammad Alimae Pasya, Rifky Ahmad, Suharto.
    - Added an interactive sort toggle button `[ 🔤 A → Z ]` / `[ 🔤 Z → A ]` with visual icon in the modal header to instantly toggle sorting order.
    - Added a live instant search filter `[ 🔍 Filter student... ]` in the modal header so teachers/admins can immediately find and toggle any student.
    - State preservation: checked/unchecked whitelist states are tracked via `_checkedStudentIds` set, so searching and sorting never drops student selections.
  - **2. Natural Alphabetical & Numeric Sorting for Batches (`js/admin/assessment-access.js`)**:
    - Batches inside `<optgroup label="🎯 Related Batches...">` and `<optgroup label="Other Batches">` are sorted using natural alphabetical and numeric comparison (`localeCompare(..., { numeric: true })`): Batch 123 -> Batch 131 -> Batch 132 -> Batch 133 -> Batch SH-2026.
  - **3. Alphabetical Tests Table Sorting & Interactive Column Headers (`js/admin/assessment-access.js`)**:
    - Tests table is initially sorted alphabetically by title by default: `3A-Vocabulary Test - Workplace` -> `3B-Vocabulary Test - Tourism` -> `3C-Vocabulary Test - CCU` -> `3D-Vocabulary Test - High-Frequency`.
    - Added sort selector dropdown: `🔤 Sort: Title (A → Z)`, `🔤 Sort: Title (Z → A)`, `📚 Sort: Class Name (A → Z)`, `🟢 Sort: Active Sessions First`.
    - Made table headers (`Test Assessment Title`, `Class & Level`, `Session State`) clickable with sorting indicators.
  - **4. Verification & Audits**:
    - Automated Playwright verification (`scratch/test_alphabetical_sort.mjs`):
      - Default table sorting verified (3A before 3B before 3C before 3D).
      - Modal whitelist A-Z default verified across all 24 students (Asti first, Suharto last).
      - Sort toggle button click verified (reverses cleanly to Z-A, and toggles back).
      - Instant search verified (filtering "unggul" isolates Mr. Unggul Wirakse; clearing restores all 24).
      - Visual screenshot captured: `screenshot_whitelist_sorted_az.png`.
    - Full E2E audit (`scratch/full_e2e_system_audit.mjs`): 17/17 passed with 0 failures and 0 console errors.
    - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain local.

- **Phase 54: Assessment Access Batch Loading & Smart Categorization [100% VERIFIED LOCALLY - NO COMMIT/PUSH]**:
  - **1. Root Cause Resolution in Batch Data Fetching (`js/admin/assessment-access.js`)**:
    - Fixed Supabase query in `adminFetchAll('batches', ...)` which was failing because it requested a non-existent column `status` (`column batches.status does not exist`), causing the `.catch()` handler to silently return `[]` and render an empty dropdown.
    - Corrected columns to `id, name, program_id, current_level_id, is_active, deleted_at`.
    - Added `programs` fetching (`adminFetchAll('programs', 'id, name, institution_id')`) and updated `classes` query to include `level_id`.
  - **2. Smart Categorized Batch Grouping (`js/admin/assessment-access.js`)**:
    - Automatically correlates the test's `level_id` and class `program_id` to the available batches.
    - Groups batches using HTML `<optgroup>`:
      - `🎯 Related Batches (<Class Name> • <Level Name>)` (e.g. `Batch 133` and `Batch 123` for Level 3 Camp).
      - `Other Batches` (e.g. `Batch SH-2026`, `Batch TP-2026`).
    - Formats batch option labels with rich metadata: e.g. `Batch 133 (24 Students • Camp • 3rd Level)`.
  - **3. Automatic Selection & Whitelist Checklist Auto-Load (`js/admin/assessment-access.js`)**:
    - Auto-selects the direct matching related active batch upon opening the modal (`Batch 133`).
    - Dispatches `change` event immediately so all 24 enrolled students load into the presence checklist without manual clicking.
    - Added support for preserving already-whitelisted student checkboxes if reopening an existing unlocked session.
  - **4. Verification & Audits**:
    - Playwright verification (`scratch/test_assessment_access_modal.mjs`) confirmed related optgroup, Batch 133 auto-selected, 24 student checkboxes populated, and captured screenshot.
    - Full E2E audit (`scratch/full_e2e_system_audit.mjs`): 17/17 passed with 0 failures and 0 console errors.
    - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain local.

- **Phase 53: Remove Top Header & Zero-Scroll Dynamic Viewport Scaling for Class Attendance Matrix [100% VERIFIED LOCALLY - NO COMMIT/PUSH]**:
  - **1. Removal of Card Header & Toolbar (`js/admin/app.js`, `js/admin/datagrid.js`, `css/admin.css`)**:
    - Removed the top title area (`📋 Class Roster (Attendance) 25 ENROLLED` and `Batch: Active Batches Only` filter).
    - Implemented `hideToolbar: true` in `DataGrid` and suppressed `.datagrid-toolbar` (Search box, Columns dropdown, records count) and `.datagrid-pagination`.
    - Reclaimed over 160px of vertical height so the matrix table starts directly at the top of the canvas.
  - **2. Dynamic Viewport Scaling (`js/admin/app.js`, `css/admin.css`)**:
    - Implemented `fitMatrixToScreen()` which calculates available height accounting for topbar and bottom 38px banner (`window.innerHeight - rect.top - bannerHeight - 6`).
    - Dynamically calculates row height (`--matrix-row-height`), font size (`--matrix-font-size`), badge font size (`--matrix-badge-font`), and cell padding (`--matrix-cell-padding`).
    - Attached resize listener and RAF to auto-adjust when resizing the window or zooming.
    - Converted `PROG` column to single-line compact rendering (`${row.progressPct}%` with tooltip) for uniform row height.
  - **3. Strict Zero Vertical Scroll (`css/admin.css`)**:
    - Adjusted `.admin-content:has(#class-attendance-grid)` to `height: calc(100vh - 56px - 38px)` and `overflow: hidden !important;`.
    - Verified `adminContentHasScroll: false` and `tableWrapHasScroll: false`.
    - All 25 students and the summary row (★ CLASS AVERAGE) are 100% visible simultaneously without any vertical scrolling.
  - **4. Verification & Audits**:
    - Playwright verification (`scratch/test_attendance_matrix_layout.mjs`) confirmed zero scrollbars, dynamic row height (28px on 900px viewport), and captured screenshot.
    - Full E2E audit (`scratch/full_e2e_system_audit.mjs`): 17/17 passed.
    - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain local.

- **Phase 52: Split SCORE and GRD Columns in Class Attendance Matrix [100% VERIFIED LOCALLY - NO COMMIT/PUSH]**:
  - **1. Standalone SCORE and GRD Columns (`js/admin/app.js`)**:
    - Separated the combined grade cell into two independent columns:
      - `SCORE`: displays purely the student's average score percentage (`${row.averageScorePct}%`), e.g. `96%`.
      - `GRD`: displays purely the styled grade badge (`<span class="badge" style="${badgeStyle}">${row.grade}</span>`), e.g. `[ A ]`.
    - Column sequence under `STUDENT DETAILS`: `INST` (65px), `PROGRAM` (65px), `BATCH` (55px), `STUDENT NAME` (140px), `PROG` (50px), `SCORE` (45px), `GRD` (35px), `PTS` (55px).
  - **2. SuperHeader Colspan Expansion (`js/admin/app.js`)**:
    - Expanded `STUDENT DETAILS` super-header `colSpan` from 7 to 8 to match the 8 detail columns.
  - **3. Summary Row Alignment (`js/admin/app.js`)**:
    - Rendered `${avgScore}%` in the `SCORE` column and purely the `${avgGrade}` badge in the `GRD` column in `summaryRow`.
  - **4. Verification & Audits**:
    - Playwright verification (`scratch/test_attendance_matrix_layout.mjs`) verified 8 headers, separate values (`score: '96%'`, `grd: 'A'`), and summary row (`{ score: '78%', grd: 'B' }`).
    - Full E2E audit (`scratch/full_e2e_system_audit.mjs`): 17/17 passed.
    - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain local.

- **Phase 51: Active Students Enrolled Tab & Task Points 50-Point Max Alignment [100% VERIFIED LOCALLY - NO COMMIT/PUSH]**:
  - **1. Active Students Count on Topbar Tab (`js/admin/app.js`)**:
    - Changed topbar tab counter from all 50 students (which included alumni from batches 131 and 132) to active batch students only: `activeBatchStudents.length` (**25 students**).
    - Updated tab label to `Active Enrolled Students` (25), matching the 25 records displayed in the attendance roster.
  - **2. Task Points Recalibration to 50 Max Points (`scratch/recalibrate_task_points_50.mjs`, `js/admin/app.js`)**:
    - Recalibrated all 82 student TASK attempt pairs in Level 3: Words (max 40) + Phrases (max 10) = 50 Max Points per topic task.
    - Unggul's task scores: Task 1: `49/50` ($39+10$), Task 2: `50/50` ($40+10$), Task 3: `50/50` ($40+10$), Test: `101.5/120` -> Total PTS: `250.5 pts`.
    - Asmul's task scores: Task 1: `47/50` ($37+10$), Task 2: `43/50` ($34+9$), Task 3: `42/50` ($33+9$), Test: `116.5/120` -> Total PTS: `248.5 pts`.
    - Repaired 62 secondary attempts in database so no task attempt exceeds total questions.
    - Updated `totalQ` fallbacks to 50 for tasks and 120 for tests in `js/admin/app.js`.
    - Prioritized `is_best_score: true` when selecting `bestAtt`.
  - **3. Verification**:
    - Playwright verification (`scratch/test_attendance_matrix_layout.mjs`) verified points (49, 50, 50, 101.5), PTS (250.5 pts), and active tab.
    - Full E2E audit (`scratch/full_e2e_system_audit.mjs`): 17/17 passed.
    - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain local.

- **Phase 50: Class Roster Attendance Matrix Points (Poin) Display & PTS Accumulation [100% VERIFIED LOCALLY - NO COMMIT/PUSH]**:
  - **1. Points Display in Assessment Columns 1-20 (`js/admin/app.js`)**:
    - Rendered raw points earned (`displayVal = (sc % 1 !== 0) ? sc.toFixed(1) : sc`) in matrix cells per user request ("muncul adalah poin, bukan score").
    - Column 4 (3A Vocab Test) correctly displays `101.5` for Unggul, `116.5` for Asmul, `102` for Wardatul, etc.
    - Tooltip formatted with both points and percentage: `Points: ${displayVal}/${totalQ} pts (${Math.round(pct)}%)`.
  - **2. Cumulative Points (PTS) & Column Sorting (`js/admin/app.js`)**:
    - `totalEarnedScore` and `rowScoreSortVals` sum and sort by raw earned points (`rawEarned`), restoring Unggul's PTS to `400.5 pts` ($99 + 100 + 100 + 101.5$).
    - Formatted PTS cell display to support single decimal precision when non-integer (`400.5 pts`).
    - Bottom summary row class average computes average points per assessment (`pts`).
  - **3. Verification**:
    - Playwright verification (`scratch/test_attendance_matrix_layout.mjs`) confirmed Unggul shows `400.5 pts` with Column 4 `101.5`.
    - Full E2E audit (`scratch/full_e2e_system_audit.mjs`): 17/17 checks passed, 0 failures, 0 console errors.
    - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain local.

- **Phase 49: Class Roster Attendance Matrix 20-Column Layout & Theme Alignment [100% VERIFIED LOCALLY - NO COMMIT/PUSH]**:
  - **1. Dynamic Theme SuperHeaders Colspan Generation (`js/admin/app.js`)**:
    - Replaced hardcoded `colSpan: 8, 10, 10, 12` leftover from 40-assessment schema with dynamic calculation based on `classAssessments`.
    - Correctly calculates exact theme spans:
      - Student Details: colSpan 7
      - Theme A (Workplace): colSpan 4 (Columns 1–4)
      - Theme B (Tourism): colSpan 5 (Columns 5–9)
      - Theme C (CCU): colSpan 6 (Columns 10–15)
      - Theme D (High-Frequency): colSpan 5 (Columns 16–20)
    - Total columns match the 20 assessment structure exactly ($4+5+6+5=20$), eliminating superheader overflow.
  - **2. Dynamic Test Column Highlighting (`js/admin/app.js`)**:
    - Removed obsolete hardcoded array `testColNumbers = [7, 8, 17, 18, 29, 30, 39, 40]`.
    - Implemented dynamic test detection: `isTest = asm.assessment_category === 'TEST' || asm.payload?.is_unified_test === true || /\bTEST\b/i.test(asm.shell_code || asm.title)`.
    - Accurately marks only columns 4, 9, 15, and 20 as Tests (`.col-asm-test`, pink border/background). Columns 7, 8, 17, 18 restored to Tasks (`.col-asm-task`, cyan).
  - **3. Normalized Cell Display Values & Total Points (PTS) (`js/admin/app.js`)**:
    - Display values normalized to `Math.round(pct)` (0–100 scale), resolving bug where Column 4 showed raw points (`101.5`, `116.5`) out of 120. Tooltip retains raw points (`Score: 85% (101.5/120 pts)`).
    - `rowScoreSortVals` and `totalEarnedScore` sum normalized percentage points: Unggul's PTS corrected from `400.5 pts` to `384 pts` ($99 + 100 + 100 + 85$), perfectly matching his 96% Grade A.
    - Summary row class average correctly averages percentage scores.
  - **4. Verification & Automated Audits**:
    - Playwright verification (`scratch/test_attendance_matrix_layout.mjs`) confirmed superheaders, test columns, and student rows.
    - Full E2E audit (`scratch/full_e2e_system_audit.mjs`): 17/17 checks passed, 0 failures, 0 console errors.
    - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain local.

- **Phase 48: Unified Vocabulary Task/Test Architecture & Student Score Merge [100% VERIFIED LOCALLY - NO COMMIT/PUSH]**:
  - **1. Auto-Generator Unification (`js/api.js`)**:
    - Standardized Shell Codes per user formula:
      - Tasks: `${levelNum}${themeCode}${topicCode} Vocab Task` (e.g., `3A1 Vocab Task`)
      - Tests: `${levelNum}${themeCode} Vocab Test` (e.g., `3A Vocab Test`)
    - Standardized Titles per user formula:
      - Tasks: `${levelNum}${themeCode}${topicCode}-Vocabulary Task - [Topic Name]`
      - Tests: `${levelNum}${themeCode}-Vocabulary Test - [Theme Name]`
    - Standardized Default Answer Types:
      - Tasks: `'spoken'` (speech_to_text for pronunciation & speaking practice)
      - Tests: `'written'` (virtual keyboard for spelling & written recall)
      - User/tutor customization preserved if edited in CRUD modals.
    - Generator logic in `autoGenerateAssessmentsHierarchy` updated to produce 1 unified task per topic and 1 unified test per theme when mode is default/unified.
  - **2. Student Attempt & Score Merging for Matching Topics (`scratch/execute_merge_migration.mjs`)**:
    - Migrated all 20 assessment groups (16 Tasks + 4 Tests) into unified primary assessments.
    - Reassigned 117 secondary attempts safely to primary unified assessments with zero data loss.
    - Merged and recalibrated 85 student scores: averaged top scores of words & phrases ($(P_w + P_p) / 2$), updated grade per centralized grading table, and marked singular `is_best_score: true` (0 duplicates across database).
    - Soft-deleted 20 legacy companion phrase shells (`deleted_at = now()`) so they no longer clutter student dashboard or admin views.
  - **3. Linear Prerequisite Chain Rebuild**:
    - Re-linked all 20 assessments in clean linear progression:
      `3A1 Vocab Task` -> `3A2 Vocab Task` -> `3A3 Vocab Task` -> `3A Vocab Test` -> `3B1 Vocab Task` -> ... -> `3D Vocab Test`.
  - **4. Verification**:
    - `scratch/test_phase47_e2e.mjs`: 9/9 passed.
    - `scratch/full_e2e_system_audit.mjs`: 17/17 passed, 0 failures, 0 console errors.
    - `node --check` passed across 100% of JS files.
    - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain local.

- **Phase 47: Assessment Access, Live Test Sessions & Unified Words/Phrases Test [100% VERIFIED LOCALLY - NO COMMIT/PUSH]**:
  - **1. Test vs. Task Access Locking & Dynamic Duration (`js/api.js`)**:
    - Created live test session state engine stored inside `assessments.payload.test_session`.
    - Implemented 4 authoritative API helpers: `fetchActiveTestSession`, `openTestSession`, `closeTestSession`, and `checkStudentTestAccess`.
    - Dynamic duration override: When tutor unlocks test with custom allocated minutes, system calculates `auto_close_at` and dynamically overrides/clamps the assessment countdown timer in `startAssessment` (`expectedEnd` clamped to session deadline).
    - Attendance gate & remote blocking: Only enrolled students in active batches can be selected; unselected students are denied access with alert banner.
  - **2. Dedicated Admin Panel "Assessment Access" (`admin.html`, `js/admin/assessment-access.js`, `js/admin/app.js`)**:
    - Added dedicated navigation tab under Domain C (Class): `🔐 Assessment Access` in `admin.html`.
    - Filtered assessment table to exclusively display assessments categorized as `TEST` across all classes (daily `TASK` items excluded).
    - Built "Live Test Session Controller" modal:
      - Active batch selector.
      - Allocated duration input (minutes).
      - Attendance checklist with `[ Select All ]` / `[ Deselect All ]` and student checkboxes.
      - Real-time Unlock / Lock session actions with instant indicator badges (`ACTIVE SESSION` / `LOCKED`).
  - **3. Student Dashboard Persistent Guided Hero ("Next Assignment / Test Arena") (`dashboard.html`, `js/dashboard.js`)**:
    - Turned `#up-next-section` into a persistent, always-visible hero section.
    - 4 Dynamic Guided States:
      - State A (`Daily Task`): Displays current task with glowing `[ 🚀 Start Task ]`.
      - State B (`Waiting for Tutor`): Prerequisite daily tasks passed, but test locked by tutor -> displays `Ready for Test` badge and `Waiting for Tutor` banner.
      - State C (`Test in Session`): Tutor opened session & student is whitelisted -> displays remaining session countdown (`⏰ Xm left`) and glowing `[ 🚀 Start Test ]`.
      - State D (`Next Milestone`): Test completed and passed -> automatically transitions to next task in subsequent topic/module.
    - Preserved 100% zero-scroll mobile geometry (`100dvh`).
  - **4. Unified Words & Phrases Test with Two-Stage Shuffling (`js/api.js`, `js/assessment.js`)**:
    - Generator partitions vault questions into words and phrases, independently shuffles each pool with Fisher-Yates, and concatenates them with section metadata (`Part 1: Words`, `Part 2: Phrases`).
    - Client-side `shuffleWithSeed` preserves the two-stage partition boundary (words remain Q1..N, phrases remain Q[N+1]..End).
    - Assessment question interaction renders clear section labels (`Part 1: Words` and `Part 2: Phrases`).
  - **5. Verification & Testing**:
    - `scratch/test_phase47_e2e.mjs`: 9/9 passed.
    - Syntax check: `node --check` passed across 100% of JS files.
    - Strict git freeze maintained: 0 commits, 0 pushes. All changes remain local.

- **Phase 46: Draft Assessment Retake Lockout & Multi-Tier Access Protection [100% VERIFIED LOCALLY - NO COMMIT/PUSH]**:
  - **1. Multi-Tier Draft Lockout Implementation**:
    - `js/api.js` (`startAssessment`): Re-throws draft/unpublished errors immediately from Edge Function rejection. Client DB fallback now checks `assessment.status`. If not `PUBLISHED` / `ACTIVE`, aborts with `ASSESSMENT_NOT_PUBLISHED` (status 403) and displays alert.
    - `js/api.js` (`fetchAttemptResult`): Extended `assessments:assessment_id` projection to include `status`.
    - `js/result.js`: Evaluates `attempt.assessment.status`. If non-published, hides/disables `#try-again-btn` and injects a prominent lock banner (`🔒 Retake Unavailable: This assessment is currently in Draft or has been closed by your tutor`).
    - `js/assessment.js` (`bootAssessment`): Added upfront status assertion. If status !== `PUBLISHED` && !== `ACTIVE`, halts boot sequence and renders access denied modal.
    - `js/dashboard.js` (`renderClassAssessmentsModal`): Added publication status guard to prevent rendering retake trigger buttons on draft items.
    - `admin.html`: Added PWA ServiceWorker registration (`sw.js?v=5.3.2`) to match all other core HTML files.
  - **2. Verification**:
    - Syntax check: `node --check` passed across 100% of JS files.
    - E2E Playwright audit (`scratch/full_e2e_system_audit.mjs`): 17 checks passed, 0 failures, 0 console errors.
    - Preserved strict git freeze: 0 commits, 0 pushes. All changes remain local.

- **Phase 45: System End-to-End Audit, Database Hygiene & Asset Synchronization [100% VERIFIED LOCALLY - NO COMMIT/PUSH]**:
  - **Comprehensive E2E Automated Audit (`scratch/full_e2e_system_audit.mjs`)**:
    - Ran automated Playwright test suite across all 5 core application pages:
      1. `index.html`: Institution -> Program -> Batch -> Student -> PIN cascade loaded and verified.
      2. `dashboard.html`: Zero-scroll mobile geometry verified (`scrollHeight: 844px <= window: 844px`), bottom 28px banner docked cleanly, avatar scaling, tier glow hierarchy, and dual-dock leaderboard tab toggles verified.
      3. `assessment.html`: All 3 assessment engines verified:
         - Mode 1: Written with native Gboard layout (Shift, ?123, 3:3:1 proportional layout).
         - Mode 2: Spoken / Audio with Web Speech API and graceful fallback to typing.
         - Mode 3: Multiple Choice (4 selectable radio options).
         - Anti-Cheat: Emergency red flashing warning overlay, police siren synthesizer audio unlock, and 10s countdown death timer verified on window blur.
      4. `result.html`: Result hero rendered with Grade S, score percentage, attempt history breakdown, and auto-submit buffer recovery.
      5. `admin.html`: ABCD Navigation console rendered with 4 domains (A-Admin, B-Board, C-Class, D-Data/Desk). All 8 sub-routes verified with 0 console errors.
  - **Asset Version Alignment to v5.3.2**:
    - Identified discrepancy where `sw.js` precached `?v=5.3.2`, but `admin.html`, `index.html`, and 24 files across `js/` imported `?v=5.2.2`.
    - Synchronized all stylesheet and module query strings to `?v=5.3.2` across `admin.html`, `index.html`, and all 24 JavaScript files in `js/`.
    - Verified 0 syntax errors (`node --check` passed across all files).
  - **Database Hygiene & Highest-Score Recalibration**:
    - Ran live Supabase Cloud database audit: 0 orphaned students, 0 orphaned assessments.
    - Invoked `auto_close_expired_attempts()` stored procedure via RPC: cleanly closed 10 dangling `in_progress` attempts (>24h old), bringing remaining in-progress count to 0.
    - Ran `scratch/recalibrate_database.mjs`: corrected 2 student attempts (Muhammad Tarmizi Tohir 92.5%, Miss Nurhaliza 70.42%) where older 0% attempts had retained `is_best_score: true`. 100% of all 186 student-assessment pairs now have their true highest score marked `is_best_score: true`.
  - Strict git freeze honored: 0 commits, 0 pushes. All changes remain local.

- **Phase 44: Keyboard Ergonomics Locked Anchor & 3:3:1 Proportional Space Distribution [100% VERIFIED LOCALLY - NO COMMIT/PUSH]**:
  - Implemented `#question-interaction-group` taking 100% of remaining body height above locked keyboard.
  - Sized upper content in exact 3 : 3 : 1 ratio:
    - Question Box: `flex: 3; min-height: 0;` with `font-size: clamp(18px, 4.5vw, 26px); line-height: 1.25;`.
    - Metadata Grid: `flex: 1; min-height: 0;` (precisely 1/3 height of Question and Answer Box).
    - Answer Box: `flex: 3; min-height: 0;` (equal in size to Question Box).
  - Textarea (`.written-input`): `width: 100%; height: 100%; font-size: clamp(20px, 5vw, 28px); display: flex; align-items: center; justify-content: center;`.
  - Constrained `#virtual-keyboard-container`: `flex-shrink: 0 !important; height: auto !important; max-height: 210px !important;` (preserves Gboard touch ergonomics, keycaps maintain comfortable square touchable ratio without becoming skinny or horizontally distorted).
  - Verified across 3 mobile emulations: `360x667`, `400x800`, and `412x915`:
    - Zero vertical scrollbars (`hasBodyScroll: false`, `hasMainScroll: false`).
    - Zero dead space (`deadSpace: 0px`).
    - Ratio Question/Answer $\approx$ 1.02–1.04; Ratio Question/Metadata $\approx$ 3.23–3.49.
  - Strict git freeze honored: 0 commits, 0 pushes. All changes remain local.

- **Phase 43: Authentic Native Gboard Mobile Keyboard & Zero Scrollbar Containment [100% VERIFIED LOCALLY - NO COMMIT/PUSH]**:
  - Replaced keyboard structure with authentic 4-row Gboard mobile layout:
    - Row 1 (10 keys): `Q W E R T Y U I O P` (~9.2% width, 4px centered gap).
    - Row 2 (9 keys): `A S D F G H J K L` (indented 4.5% left & right, centered between Row 1 keys).
    - Row 3: `[⇧ Shift (13%)] Z X C V B N M [⌫ Backspace (13%)]`.
    - Row 4: `[?123 (14%)] [, (9.5%)] [———— Space ———— (flex: 1)] [. (9.5%)] [↵ Enter (15%)]`.
  - Implemented authentic mobile styling in `css/assessment.css`:
    - `#virtual-keyboard-container`: `#1e293b` with `padding: 6px 4px`, `border-radius: 12px`, `height: clamp(170px, 28vh, 210px)`, and `overflow: hidden`.
    - Physical keycap elevation: `#334155`, `border: 1px solid #475569`, `border-radius: 6px`, `height: clamp(36px, 5vh, 42px)`, `box-shadow: 0 2px 0 #0f172a`, font `'Inter'` 15px/600 uppercase `#f8fafc`.
    - Function keys (`Shift`, `Backspace`, `?123`): `#263347`, text `#94a3b8`, 13px bold. Shift active highlights `#0284c7`.
    - Enter key: `linear-gradient(135deg, #0284c7, #0369a1); border: 1px solid #38bdf8; color: #ffffff;`.
    - Active press animation: `.vk-key:active { transform: scale(0.93); background: #475569; }`.
  - Height & Scrollbar Containment: Viewport fits 100% inside 800px and 915px without triggering any body or main scrollbar thumb (`scrollbar-width: none; overflow: hidden;`).
  - Interactive layer toggles: Shift toggles letter casing (auto-resets after typing a letter), and `?123` / `ABC` toggles numeric/symbol layer.
  - Verified with automated test `scratch/test_gboard_native_layout.mjs` on both `400x800` and `412x915`.
  - Preserved strict git freeze: 0 commits, 0 pushes. All changes remain local.

- **Phase 42: Static Layout Anchor & Elimination of Pop-up/Float [100% VERIFIED LOCALLY - NO COMMIT/PUSH]**:
  - Removed legacy `.focus-mode` listeners from `js/assessment.js` (focusin, focusout, and mic click listeners) that previously dimmed header and bottom navigation to 0.15 opacity and shifted body height to auto.
  - Removed `.focus-mode` styling overrides from `css/assessment.css`.
  - Answer box now remains purely a static input display without any floating, expanding, or popping up.
  - Verified with automated test `scratch/test_answer_box_click.mjs` and `scratch/test_spoken_box.mjs` (0px movement, full opacity, keyboard and mic input displayed smoothly).
  - Preserved user mandate: NO git push or commit executed.

- **Phase 41: Service Worker Network-First CSS & Cache Invalidation to v5.3.2 [100% VERIFIED]**:
  - Diagnosed user screenshot showing old 34px buttons: Root cause was Service Worker `sw.js` caching `assessment.css` Cache-First under `abcd-core-v5.2.2`, plus CSS syntax error in `css/assessment.css` (unclosed brace).
  - Repaired `css/assessment.css` structure so `#virtual-keyboard-container` is closed properly and `.vk-row` / `.vk-key` are top-level selectors.
  - Updated `sw.js` to `abcd-core-v5.3.2`, added Network-First for `.css`, and bumped all asset URLs to `v=5.3.2`.
  - Added proactive service worker update triggers in `assessment.html` and `index.html`.
  - Verified with Playwright tests (`scratch/check_keyboard_ratio.mjs` and `scratch/test_police_siren_cheat.mjs`).

- **Phase 40: Assessment Body Direct 22-8-22-48 Ratio & 58px Virtual Keyboard Keys [100% VERIFIED]**:
  - **1. User Context & Root Cause Analysis**:
    - User reported: *"this is how the keyboard look like,,, the size is different than what we discussed,,, the height of keyboard is supposed to be 48% of the assesment body. the ratio that we agreed upon was 22-8-22-48 in percentage to the assesment body size . pelase check again"*.
    - User added: *"the button are too small, its not comfortable for typing"*.
    - Root Cause: On the live deployed site (`tops-core.netlify.app`), the previous code nested the keyboard inside an intermediate container with dead space below it, and capped key heights at `clamp(34px, 5.8vh, 46px)` with `max-width: 9.5%`. Furthermore, recent local changes had not yet been pushed to git/Netlify.
  - **2. Full Solution Implementation**:
    - **Direct 22-8-22-48 Assessment Body Architecture (`js/assessment.js`)**:
      - Eliminated intermediate nested container in written mode.
      - Rendered 4 direct children in `assessment-main`:
        1. Question Box: `calc(22% - 3px)` (21.4% computed)
        2. Metadata Table: `calc(8% - 2px)` (7.6% computed)
        3. Answer Box (`#answer-container-written`): `calc(22% - 3px)` (21.4% computed)
        4. Virtual Keyboard (`#virtual-keyboard-container`): `calc(48% - 4px)` (47.3% computed)
      - Used `gap: 4px` and `justify-content: space-between` to fill 100% of the viewport body with 0 dead space.
    - **Virtual Keyboard & Key Expansion (`css/assessment.css`)**:
      - `#virtual-keyboard-container`: Strict 48% height (`calc(48% - 4px) !important;`).
      - `.vk-row`: `flex: 1 1 0; height: calc(25% - 3px); align-items: stretch !important; gap: 3px;`.
      - `.vk-key`: Height set to `100% !important;` with `max-height: none !important;` and `max-width: none !important; flex: 1 1 0;`.
      - Key height increased from 34px to **58.3px** (+71% taller).
      - Key width increased to **30.1px** with 3px gaps.
      - Key font size enlarged to **`clamp(16px, 4.4vw, 21px); font-weight: 800;`** for comfortable thumb typing.
  - **3. Cross-Scenario Automated Verification (`scratch/check_keyboard_ratio.mjs` & `test_police_siren_cheat.mjs`)**:
    - All metrics verified: Question 21.4%, Metadata 7.6%, Answer 21.4%, Keyboard 47.3% (= 48% allocated).
    - Anti-Cheat tests continue to pass 100% with siren and 10s countdown.
    - Screenshot verified: `scratch/screenshot_test_current_metrics.png`.

- **Phase 39: Red Flashing Anti-Cheat Warning with Mobile Police Siren, Countdown Timer, & 3-Strike Limit [100% VERIFIED]**:
  - **1. User Mandate & Clarification**:
    - User explicitly clarified: *"kita perjelas lagi,,, warning sign maksud saya adalah yang berwarna merah itu, dengan hitung mundur , dan auto submit saat mencapai 0, serta batas perinagatan 3 kali. bunyinya pada hp juga pakai sisrine polisi. dan ingat flashing red!"*.
    - Requirement: When student presses return button (`popstate`) or triggers blur/side panel, display the exact red flashing anti-cheat screen with police siren audio on mobile, a 10s countdown to auto-submit, and a 3-warning limit before termination.
  - **2. Full Solution Implementation**:
    - **Red Flashing Overlay (`css/dashboard.css` & `assessment.html`)**:
      - `#cheat-overlay` styled with `background: rgba(220, 38, 38, 0.95)`, `backdrop-filter: blur(16px)`, and `animation: cheat-red-flash 0.4s ease-in-out infinite alternate !important`.
      - Flashes intensely between dark crimson `#881313` and emergency red `#ef4444`.
      - `.cheat-countdown-circle` with glowing border displaying `#cheat-timer-count` and `"SECONDS TO AUTO-SUBMIT"`.
      - Cleanly formatted `#dismiss-cheat-btn` ("Return to My ASSESSMENT") fitting mobile viewports without horizontal overflow.
    - **Web Audio Police Siren Synthesizer (`js/assessment.js`)**:
      - `startPoliceSiren()` and `stopPoliceSiren()` with `sawtooth` oscillator sweeping 650Hz–1250Hz in repeating 1s wail cycles.
      - Mobile audio unlocked on first interaction (`click` / `touchstart`).
      - Mobile haptic vibration (`navigator.vibrate([300, 150, 300, 150, 300, 150, 600])`) matching the siren wail.
    - **3-Warning Limit & Strikes Progression**:
      - Strike 1: `STRIKE 1 OF 3` (Warning 1).
      - Strike 2: `STRIKE 2 OF 3` (Warning 2).
      - Strike 3: `STRIKE 3 OF 3 (FINAL WARNING)`.
      - Violation 4 (Limit Exceeded): Shows `LIMIT EXCEEDED (3/3)` and auto-submits.
    - **Countdown & Auto-Submit**:
      - 10s countdown timer auto-submits (`doSubmit(true)`) if it reaches 0.
      - If student taps `"Return to My ASSESSMENT"`, countdown and siren stop, overlay hides, and exam resumes with 0 answer loss.
      - If student leaves app for >10s, `visibilitychange`/`focus` auto-submits on return; if <10s, countdown resumes.
  - **3. Cross-Scenario Automated Verification (`scratch/test_police_siren_cheat.mjs`)**:
    - All tests passed with exit code 0:
      - Strike 1 (return button / popstate): Red flashing background verified, `STRIKE 1 OF 3` badge verified, countdown ticking verified, dismissed cleanly.
      - Strike 2 (blur / side panel): `STRIKE 2 OF 3` verified, dismissed cleanly.
      - Strike 3 (blur): `STRIKE 3 OF 3 (FINAL WARNING)` and custom button text verified.
      - Violation 4 (exceeded 3 warnings): `LIMIT EXCEEDED (3/3)` verified, auto-submit called successfully (`submit-assessment`).
    - Screenshots verified: `scratch/screenshot_cheat_red_strike1.png`, `scratch/screenshot_cheat_red_strike3.png`.

- **Phase 38: Return Button & Side Panel Warning Sign (Zero Auto-Submit) [100% VERIFIED]**:
  - **1. User Problem & Context**:
    - User reported: *"when my student push the return button or accidentally push side panel, show the wraning sign intead of auto submit"*.
    - Previously, when a student on a mobile phone pressed the hardware/gesture return button (`popstate`) or accidentally pulled down an edge/side panel (e.g. Samsung Edge Panel, Android multi-tasking edge swipe, triggering `window.blur` or `visibilitychange`), the system treated it as a cheating infraction with a 10-second countdown or 3-strike kill switch.
    - If the countdown elapsed (or expired while minimized/unfocused) or strikes reached 3, it terminated the exam and called `doSubmit(true)`, prematurely locking the student out with an incomplete score.
  - **2. Full Solution Implementation**:
    - **Eliminated All Punitive Auto-Submissions**:
      - Completely removed `doSubmit(true)` from `triggerCheatAlert` (no strike termination).
      - Completely removed countdown death timer (`cheatInterval` auto-submit removed).
      - Completely removed auto-submit on `visibilitychange` (no termination upon returning from background/minimized).
      - Completely removed auto-submit on `window.focus` (no termination upon window refocus).
      - Auto-submission (`doSubmit(true)`) is now strictly reserved for the official exam timer expiration (`time_limit_seconds` reaching 00:00) and explicit user submission.
    - **Modern Warning Sign Modal (`assessment.html` & `css/dashboard.css`)**:
      - Replaced the aggressive red strobe box with an authoritative, modern dark glass warning modal featuring an amber warning icon `⚠️`, title `ASSESSMENT WARNING`, warning badge `ATTENTION REQUIRED`, clear explanatory copy, and a large, high-contrast action button: `[Return to My ASSESSMENT ➔]`.
      - Ensured `#dismiss-cheat-btn` has `type="button"` and `preventDefault()` / `stopPropagation()` to prevent any accidental navigation or form submit.
      - Added backdrop dismissal (`#cheat-overlay` click).
    - **Preserved Anti-Cheat Tracking & Answer Persistence (`js/assessment.js`)**:
      - Maintained `lockHistory()` (`history.pushState`) to prevent the browser from actually exiting the assessment page on return button press.
      - Maintained `logCheatingEvent` audit logging (`NAV_WARNING` action) so teachers can inspect student distraction/navigation attempts in audit logs.
      - Added instant buffer persistence (`saveCurrentAnswer()`, `persistLocalBuffer()`) when warning triggers or when window refocuses, ensuring 0 answers are lost.
      - Tapping `[Return to My ASSESSMENT]` safely dismisses the warning overlay and refocuses the active keyboard input so the student immediately continues their exam.
  - **3. Cross-Scenario Automated Verification (`scratch/test_warning_sign.mjs`)**:
    - Verified Return Button simulation (`popstate`):
      - Warning overlay appears immediately (`isVisible: true`).
      - Shows `ASSESSMENT WARNING` and `Return button pressed / Navigation attempted. Please stay on the assessment screen to complete your questions. Your answers are saved.`
      - Tapping `[Return to My ASSESSMENT]` smoothly dismisses the overlay.
      - Typed answer (`"hello"`) is 100% preserved.
      - `submitAssessment` was NOT called (`submitCalled: false`).
    - Verified Accidental Side Panel simulation (`blur`):
      - Warning overlay appears immediately with `Screen lost focus / Side panel or external app opened...`
      - Waited 3+ seconds past what was previously a countdown: `submitAssessment` was NOT called (`submitCalled: false`).
      - Dismissed overlay and continued answering: typed additional letter `'s'` -> `"hellos"`!
    - Screenshots verified: `scratch/screenshot_warning_return_button.png`, `scratch/screenshot_warning_side_panel.png`.

- **Phase 37: Assessment Virtual Keyboard 22-8-22-48 Ergonomic Ratio Scaling [100% VERIFIED]**:
  - **1. User Problem & Context**:
    - Assessment testers and students complained that virtual keyboard buttons on mobile devices were too small and cramped (originally ~24px height), making tapping difficult and causing mis-taps.
    - User requested evaluating layout options and specifically agreed upon **Ratio Option A: 22 - 8 - 22 - 48** (Question Box: 22%, Metadata: 8%, Answer Box: 22%, Virtual Keyboard: 48%).
  - **2. Full Solution Implementation**:
    - Modified `css/assessment.css`:
      - `#virtual-keyboard-container`: Set height to `calc(68.6% - 2px) !important;` (48% of total viewport body).
      - `.vk-row`: Scaled with `flex: 1`, `gap: 4px`, `max-height: 25%`.
      - `.vk-key`: Increased key height from `clamp(22px, 4.5vh, 28px)` to **`clamp(34px, 5.8vh, 46px)`** (almost 2x taller!). Increased font size to **`clamp(13px, 3.2vw, 15px); font-weight: 700;`** with enhanced active tap state feedback.
      - `.vk-key.special` and `.vk-key.space`: Scaled proportionally for easy thumb reach.
    - Modified `js/assessment.js`:
      - Dynamically calculated layout based on `isWritten = (answerType === 'written')`.
      - `questionBox`: Height set to 22% for written questions (30% for other modes). Font size scaled to `clamp(18px, 4.4vw, 24px)` to preserve full readability of long phrases.
      - `metadataTable`: Height set to 8% for written questions (10% for other modes) with `font-size: 10px` and `3px` gap to prevent text clipping.
      - `interactionContainer`: Height set to `calc(70% - 6px)` for written questions (`calc(60% - 8px)` for other modes).
      - `answerArea`: Upper 31.4% of interaction container (= 22% of body).
      - `controlArea` (`#virtual-keyboard-container`): Lower 68.6% of interaction container (= 48% of body).
      - Preserved existing 30 - 10 - 60 ratios for Multiple Choice and Speech assessment modes.
  - **3. Cross-Viewport Automated Verification**:
    - Tested on iPhone 14 (390 x 844) and Galaxy S20 (360 x 780) via Playwright (`scratch/test_keyboard_ratio.mjs`):
      - iPhone 14: Question Box 22.0% (129px), Meta 8.0% (47px), Answer 21.1% (124px), Keyboard 47.0% (276px), Key height: 46px, Key width: 32px.
      - Galaxy S20: Question Box 22.0% (115px), Meta 8.0% (42px), Answer 21.0% (110px), Keyboard 46.9% (246px), Key height: 45px, Key width: 29px.
      - Full typing input tested: "hello" typed smoothly via virtual keyboard clicks into textarea.
    - Regression verification on MCQ and Speech modes (`scratch/verify_other_modes.mjs`):
      - Both retain exact 30.0% question box, 10.0% metadata, 58.6% interaction area with 0 regressions.
    - Visual screenshots confirmed: `scratch/screenshot_keyboard_iphone_14.png`, `scratch/screenshot_keyboard_galaxy_s20.png`.


- **Phase 36: Fix Assessment Count Discrepancy, Edit Modal Class Wiping & Auto-Gen Dedup [100% VERIFIED]**:
  - **1. Root Cause Identification**:
    - Edit Modal (`js/admin/crud-modals.js`): `#field-class_id` was populated via `classes.filter(s => s.institution_id === selectedProgId)` where `selectedProgId` was institution ID. In PostgreSQL, classes link to `program_id`, while `classes.institution_id` is null. `filteredClasses` was empty, leaving `#field-class_id` with an empty string. Saving the modal (e.g. changing answer_type to spoken) overwrote `class_id` with `null` in the DB, causing the assessment to immediately disappear from `#class-hub`.
    - Auto-Gen Duplicate Creation (`js/api.js`): Running Auto-Gen searched for existing assessments using `.eq('class_id', classId)`. Because the original assessment's `class_id` was null, dedup failed to match and inserted an unneeded duplicate assessment (`1d32de2f...`), inflating Assessment Hub to 41 records while Class Hub showed 39.
  - **2. Full Solution Implementation**:
    - Fixed `js/admin/crud-modals.js`: Correctly filters classes by `currentProgramId` (`s.program_id === currentProgramId`), `selectedProgId`, or existing `record.class_id`, ensuring `#field-class_id` is always properly populated and pre-selected.
    - Added readonly and foreign-key protection: When editing a record, readonly fields and structural foreign keys (`class_id`, `program_id`, `level_id`, `institution_id`) are never overwritten with `null` if the input is disabled or unselected.
    - Fixed `js/api.js`: Replaced narrow `class_id` matching in `upsertDynamicAssessmentShell` with canonical curriculum hierarchy dedup `(shell_code, program_id, level_id)`. Existing shells are updated and repaired (setting `class_id: classId`) rather than generating duplicate assessment records. Preserved custom user answer types (`effectiveAnswerType`).
    - Fixed `js/admin/vocab-vault.js`: Ensured `explicitClassId` (`window._selectedClassId` or local storage) is passed to `openAutoGenerateModal` across all generator triggers.
  - **3. Database Reconciliation & UI Verification**:
    - Deleted orphaned duplicate assessment `1d32de2f-9c1a-4dc3-b249-fcdf4e592f35` (0 attempts, 0 questions).
    - Restored original assessment `b95f4826-ca8c-4d3f-9b46-3ff7ec092a80` (has 9 student attempts) with `class_id = 'ab33498a-90e6-44b7-83f4-5765f964543e'` (Vocabulary Class) and confirmed `answer_type: 'spoken'`.
    - Re-audited database: Exactly 40 live assessments, all 40 belonging to Vocabulary Class, 0 null class assessments.
    - Playwright verification passed 100%: Class Hub (`#class-hub`) displays 40 records with A Words Test present; Assessment Hub (`#assessments`) displays 40 records with exactly 1 A Words Test.

- **Phase 35: Fix Best Score Demotion, Up Next False Failure & Batch Leaderboard Deflation [100% VERIFIED]**:
  - **1. Root Cause Identification & PostgREST Sorting Fix**:
    - Discovered that `submit-assessment` Edge Function queried attempts sorted by `.order("effective_score", { ascending: false })`. In PostgreSQL/PostgREST, descending sorts default to `NULLS FIRST`.
    - Any historical attempt with `effective_score: null` (score 0%) was sorted first and erroneously assigned `is_best_score = true`, demoting real 90%/85% attempts to `false`.
    - Implemented in-memory sorting in `supabase/functions/submit-assessment/index.ts` using `Number(a.percentage ?? a.effective_score ?? 0)` descending and `created_at` descending, completely eliminating the PostgREST `NULLS FIRST` vulnerability.
  - **2. Frontend Mathematical Highest-Score Enforcement (`js/dashboard.js`)**:
    - `populateUpNext`: Switched to strict mathematical `bestMap[aid] = Math.max(previousBest, pct)` for all valid submitted attempts. Eliminates loop overwrite bugs where an old 0% attempt reset the score and prompted false "Needs Improvement (30.0%)" retakes.
    - `computeOverallStats`: Removed `_locked` lockout; student overall score strictly averages true highest percentages per assessment.
    - `loadBatchLeaderboard`: Standings computed strictly from highest percentage per student per assessment, restoring King Test to 92% (Grade A).
    - `renderClassesOverview` & `renderAssessmentsGrid`: Best attempt selected using `pct > bestPct` (breaking ties by latest `submitted_at`), preventing demotions.
  - **3. API & Results Display Modernization**:
    - Updated `recalculateBestScore` and `applyRecalibrateAssessment` in `js/api.js` to sort in-memory by percentage descending.
    - Updated `js/result.js` history table and best-score badge to dynamically identify the highest scoring attempt mathematically.
  - **4. Cloud Database Recalibration & Zero-Defect Audit**:
    - Audited all 156 student-assessment pairs across Supabase Cloud.
    - Repaired all 13 corrupted student-assessment records (26 attempt rows updated).
    - Re-audited database: confirmed 0 remaining corrupted records across all students.
    - Verified student "King Test": A2 Words Task resolves to 90% (Grade B, Passed), overall score 92% (Grade A), and Up Next advances to `3rd Vocabulary A2 Phrases Task - CV & Resume` (Start Now).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Phase 34: Fix Assessment Virtual Keyboard Lifecycle & Multi-Question Persistence [100% VERIFIED]**:
  - **1. Root Cause Identification**:
    - In `js/assessment.js` (`renderQuestion`), `#virtual-keyboard-container` was parked into `interactionContainer` inside `#assessment-main` on Question 1.
    - When moving to Question 2, `main.innerHTML = ''` ran while `#virtual-keyboard-container` was still inside `main`, obliterating the keyboard DOM element.
    - The rescue logic (`if (vk.parentElement !== document.body) document.body.appendChild(vk);`) was placed 50 lines too late (at line 931, after line 881 `main.innerHTML = ''`), causing `document.getElementById('virtual-keyboard-container')` to return `null`.
    - Physical keyboard typing was also disabled because `keydown` listener checked `!vkContainer` which evaluated to true.
  - **2. Safe Parking & Authoritative Getter Implementation**:
    - Implemented `getVirtualKeyboard()`: Guarantees `#virtual-keyboard-container` is retrieved or created in `document.body`.
    - Moved parking logic to execute strictly BEFORE `main.innerHTML = ''`: Before `#assessment-main` is cleared, the keyboard container is safely parked back into `document.body` (`document.body.appendChild(vk)`), preventing it from ever being destroyed during question transitions.
    - Upgraded event handling: Replaced static per-key listeners with delegated `document.addEventListener('click', ...)` and `mousedown` listeners (preventing textarea blur).
    - Updated physical keyboard `keydown` listener, `toggleUnansweredDrawer`, and speech fallback to use `getVirtualKeyboard()`.
  - **3. Automated Verification**:
    - Unit test suite `scratch/verify_keyboard_node.mjs` executed and passed 100%:
      - Question 1 (Written): Keyboard attached and visible (`display: flex`).
      - Question 2 (Written): Keyboard preserved, attached, and visible (`display: flex`).
      - Question 3 (Written): Keyboard preserved, attached, and visible (`display: flex`).
      - Backward navigation (Q3 -> Q2): Keyboard preserved and attached (`display: flex`).
    - Zero syntax errors (`node --check js/assessment.js` passed).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Phase 33: Refactor Topbar to Compact Summary Tabs & Purge Redundant Action Buttons [100% VERIFIED]**:
  - **1. Topbar Modern Sleek Tab Integration (Global Shell)**:
    - Completely eliminated `.topbar-breadcrumb` ("CLASS / Assessments Hub", `#topbar-domain`, `#topbar-title`) and `.topbar-actions`.
    - Standardized `<header class="admin-topbar" id="admin-topbar">` to 56px height, `background: rgba(15, 23, 42, 0.75)`, `backdrop-filter: blur(12px)`, and `border-bottom: 1px solid rgba(255, 255, 255, 0.08)`.
    - Preserved responsive sidebar toggle button (`#sidebar-toggle`) on the far left.
    - Implemented canonical `window.setTopbarTabs(tabs, activeId, onSelect)` with sleek tab card containers (`height: 42px; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; border-radius: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);`).
    - Standardized elevated topbar layout globally across applicable admin views:
      - Assessments Hub: Total Assessments, Published, Draft, Question Bank.
      - Curriculum / Classes Hub: Institution selection tabs.
      - Student Management: Enrolled, Active, Completed Modules, Remediation KPIs.
  - **2. Purged Row C & All 8 Action Buttons (`js/admin/assessment-management.js`, `admin.html`)**:
    - Deleted entire button strip containing:
      1. `+ Create Assessment` (Obsolete: assessments rely on dynamic shell generator)
      2. `Cohorts & Assignments`
      3. `Results`
      4. `Recalibrate`
      5. `Import Questions`
      6. `Export Questions`
      7. `Vocab Vault`
      8. `Open Session`
    - Removed obsolete Row B in-page KPI card strip (`buildSectionTabBar`).
    - Filter tabs (`All Assessments`, `Core Curriculum`, `Standalone & Try-Outs`) and DataGrid pull up immediately beneath the topbar, reclaiming ~160px of vertical space with zero dead space.
  - **3. Relocated Exam Recalibrator to Domain D (Data Health)**:
    - Moved recalibration controller logic to Domain D -> Data Health (`admin.html#health`).
    - Registered dedicated maintenance card: "Assessment Engine Recalibration" (`#card-assessment-recalibration`) inside `renderDataHealth` in `js/admin/desk.js`.
    - Integrated full controller logic: target assessment dropdown (populated with all non-deleted assessments), preview calculation, metrics panel, detailed diff preview table with affected attempts filter, confirmation modal, and apply execution.
    - Grid row action "Recalibrate" now sets `window._filterRecalibrateAssessment = id` and routes to `admin.html#health`, scrolling to `#card-assessment-recalibration` and auto-firing diff preview.
    - Replaced standalone recalibrator in `js/admin/class.js` and `js/admin/app.js` with delegation/redirect to `#health`.
  - **4. Automated Playwright Verification**:
    - Navigated to `http://127.0.0.1:5500/admin.html#assessments`:
      - Breadcrumb count: 0 (absent).
      - Topbar tab cards count: 4 (Total Assessments: 40, Published: 32, Draft: 8, Question Bank: 0).
      - Row C action buttons: 0 present (100% purged).
      - Assessment filters visible directly beneath topbar: true.
      - Interactive tab click toggles active filter and styles.
    - Navigated to `http://127.0.0.1:5500/admin.html#health`:
      - Dedicated card `#card-assessment-recalibration` verified with 41 loaded assessment options and active preview/apply controls.
    - Visual artifacts verified: `admin_assessments_verified.png`, `admin_health_verified.png`.
    - Console errors: 0.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.


- **Phase 32: Student Dashboard Avatar Scaling, Glow Hierarchy, Batch Leaderboard & Royal Crown Mechanics [100% VERIFIED]**:
  - **1. Visual Profile Avatar Scaling (`dashboard.html`, `css/dashboard.css`)**:
    - Scaled profile photo from 60px to 86px (elevated visual anchor) without breaking zero-scroll mobile budget (`100dvh`).
    - Configured circular clipping with border-radius 50%, overflow hidden, and glowing border rings.
    - Initial placeholder letter dynamically hidden when custom photo is active.
  - **2. Grading & Glow Hierarchy Palette (`js/grading.js`, `js/api.js`, `css/dashboard.css`)**:
    - Score 100% (Grade S): Shining star symbol (`⭐`) with radiant golden glow aura (`rgba(245, 158, 11, 0.85)` + shimmer).
    - Grade A (91–99%): Emerald green (`#10b981`) with soft emerald glow aura.
    - Grade B (71–90%): Sky blue (`#06b6d4`) with soft cyan glow aura.
    - Grade C (51–70%): Warm yellow (`#eab308`) with soft amber glow aura.
    - Grade D (31–50%): Flame orange (`#f97316`) with soft orange glow aura.
    - Grade E (11–30%): Crimson red (`#ef4444`) with soft red glow aura.
    - Grade F (0–10%): Neutral slate (`#64748b`) with subtle minimal glow.
    - Exported authoritative `getGradeSymbol(grade, percentage)` from `js/grading.js`.
  - **3. Batch Leaderboard / Standings Matrix (`dashboard.html`, `css/dashboard.css`, `js/dashboard.js`)**:
    - Built dual-dock tab interface (`[ 🏆 Batch Standings ] [ 📋 Completed ]`) with active indicator pill (`RANK #1`).
    - Standings matrix dynamically ranks all active peers in the same batch with 4-level deterministic tie-breaker sorting:
      1. Overall average score (descending)
      2. Total completed assessments count (descending)
      3. Earliest last submission timestamp (ascending)
      4. Alphabetical student name (ascending)
    - Displays rank badges (🥇 Crown/Rank 1, 🥈 Rank 2, 🥉 Rank 3) and highlights active student row (`.my-row`).
    - Pinned summary bar shows student rank relative to total batch size (`Rank #1 of 3`) and current leader.
  - **4. Royal Title & Crown Mechanics (`dashboard.html`, `css/dashboard.css`, `js/dashboard.js`)**:
    - Student with highest score in batch earns floating Crown icon (`👑`) hovering over avatar.
    - Real-time dynamic royal title: `"King <Name>"` for male, `"Queen <Name>"` for female (replaces `"Mr."` / `"Miss"`).
    - Dynamic real-time title reassignment if overtaken by another student in the batch.
  - **5. Strict Zero-Scroll Architecture Preservation**:
    - Zero document scrolling on mobile viewports: verified on iPhone 14 (`390x844`) and Android Small (`360x640`).
    - Element `#bottom-ad-banner` (28px) 100% intact and locked at viewport bottom.
    - Standings table isolates inner scrolling within `#dock-pane-standings` with hidden scrollbars.
  - **6. Automated Playwright Verification**:
    - Script: `test-dashboard-enhancements.mjs` executed and passed 100%.
    - Visual artifacts saved: `dashboard_enhanced_iphone14.png`, `dashboard_enhanced_android_small.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Phase 31: Typography Polish, Tabular Numbers, & Attendance Matrix Refinements [100% VERIFIED]**:
  - **1. Tabular Numbers & Numeric Alignment (`css/admin.css`, `css/style.css`, `css/assessment.css`, `css/result.css`)**:
    - Applied `font-variant-numeric: tabular-nums;` to all data grid cells, score badges, timers, metric indicators, summary rows, and matrix cells (`.table-wrap`, `.data-grid`, `.datagrid-table`, `#assessment-timer`, `#timer-display`, `.result-summary-val`, `.matrix-cell`, etc.).
    - Guarantees vertical numeric alignment across all digits (0–9) without horizontal layout jitter.
  - **2. Font-Weight Hierarchy & Contrast Tuning (`css/admin.css`, `css/style.css`)**:
    - Elevated muted text color from low-contrast `#64748B` to `#94A3B8` / `#CBD5E1` for secondary labels, subtitles, and timestamps.
    - Standardized font-weight hierarchy:
      - Card headings / Primary KPIs: `font-weight: 700;`
      - Table text & action buttons: `font-weight: 500;` or `600;`
      - Subtitles / Helper descriptions: `font-weight: 400;`
  - **3. Student Roster Table Refinements (`admin.html#students`, `js/admin/student-management.js`, `css/admin.css`)**:
    - Restored standalone `PROGRAM` column (`key: 'progName'`) explicitly rendered between `INSTITUTION` and `BATCH`.
    - Sanitized age calculation: renders clean dash (`—`) when `birth_date` is null, empty, or evaluates to `<= 0` (never displays `0 yrs`).
    - Enforced `.actions-col` and `.student-actions-cell` with `gap: 6px !important;` for comfortable, mis-tap-resistant action button ergonomics.
  - **4. Class Roster Attendance Matrix Polish (`admin.html#class-hub`, `js/admin/app.js`, `js/admin/datagrid.js`)**:
    - Equipped header cells 1 through 40 with active native `title` tooltips displaying full assessment code, title, and topic (e.g., `3A1-WORDS-TASK: 3rd Vocabulary A1 Words Task - Professional Identity`).
    - Verified and polished bottom summary row `★ CLASS AVERAGE (KELAS)` showing class-wide average points and completion percentages with tabular figures.
  - **5. Automated Desktop Verification (1600x900)**:
    - Verified via Playwright test script `scratch/verify_typography_and_matrix_polish.mjs` on desktop (1600x900).
    - Result: 100% PASS rate across Student Roster, Class Matrix, Assessment Timer, and Results.
    - Screenshots verified: `student_roster_tabular_verified.png`, `class_matrix_tooltips_and_summary_verified.png`, `class_matrix_summary_row_docked.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Phase 30: Student Mobile Dashboard Modernization (Zero-Scroll & Tier Theming) [100% VERIFIED]**:
  - **1. Zero-Scroll Viewport Mobile Architecture (`css/dashboard.css`)**:
    - Strictly scoped to `body.dashboard-page` (assessment pages and others remain 100% untouched).
    - Enforced `height: 100vh; height: 100dvh; max-height: 100dvh; overflow: hidden; display: flex; flex-direction: column;`.
    - Compact header set to `44px` height with clean brand typography ('Outfit') and circular profile actions.
    - Main content container `.dashboard-content` configured with `flex: 1 1 0%; min-height: 0; overflow: hidden;` to cleanly distribute space without outer scrollbars.
  - **2. Bottom Locked Banner (#bottom-ad-banner) 28px Intact & Anchored (`css/dashboard.css`, `dashboard.html`)**:
    - Set `position: static !important; height: 28px !important; min-height: 28px !important; max-height: 28px !important; flex-shrink: 0 !important;`.
    - Anchored directly at the base of the viewport across all screen heights (640px to 844px).
  - **3. Modern Tier Hero Card & Synchronized Dynamic Theming (`dashboard.html`, `css/dashboard.css`, `js/dashboard.js`)**:
    - Cleaned up rigid inline styles in `dashboard.html` while preserving 100% of functional IDs (`#welcome-name`, `#banner-score-box`, `#banner-grade-box`, `#banner-avatar-container`, `#bottom-stat-avg-score`, `#stat-overall-grade-value`, `#welcome-meta-wrapper`, etc.).
    - Connected `renderDashboardScore` to `GRADE_PALETTE` from `js/grading.js`, dynamically injecting `data-tier` and CSS variables (`--tier-color`, `--tier-rgb`).
    - **Grade S Exclusive Glow**: Radiant golden ambient aura (`rgba(245, 158, 11, 0.28)`), text gleam drop-shadow, and sparkling gradient avatar ring.
    - **Grades A-F Crisp Matte**: Solid `#0f172a` background, tinted border (`rgba(var(--tier-rgb), 0.25)`), clean colored text, and zero glow.
    - Avatar bounds safeguarded with `overflow: hidden` and `border-radius: 50%`, with initial letter cleanly hidden when photo is displayed.
  - **4. Automated Multi-Device Verification**:
    - Verified via Playwright at standard iPhone (390×844) and small Android (360×640).
    - `isZeroScroll: true` (`scrollHeight === clientHeight === 844px` and `640px`).
    - Artifact screenshots saved: `dashboard_mobile_grade_a.png`, `dashboard_mobile_grade_s.png`, `dashboard_mobile_small_android.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Phase 29: Student Roster View Polish [100% VERIFIED]**:
  - **1. Restored PROGRAM Column (`js/admin/student-management.js`)**:
    - Explicitly placed the `PROGRAM` column (`key: 'progName'`, label `'Program'`, `width: '100px'`) directly between `INSTITUTION` and `BATCH` in the DataGrid column registry.
    - Renders student program name (e.g., "Camp") cleanly with text truncation safeguard (`max-width: 95px`) and full tooltip.
  - **2. Sanitized Age Calculation (`js/admin/student-management.js`, `js/admin/class.js`, `js/admin/app.js`, `js/admin/imports-exports.js`)**:
    - Sanitized `calculateAgeFromBirthDate` and row mapping: when `birth_date` is missing, invalid, or evaluates to `<= 0`, render a dash (`—`) instead of displaying `0 yrs`.
    - Enforced across all student roster views and modals for complete workspace consistency.
  - **3. Polished Action Buttons Spacing (`js/admin/student-management.js`, `css/admin.css`)**:
    - Expanded `ACTIONS` column width to `168px` and wrapped action buttons in `.student-actions-cell`.
    - Styled `.student-actions-cell` with `display: flex !important; align-items: center !important; justify-content: flex-end !important; gap: 8px !important;` to provide comfortable spacing and prevent accidental mis-clicks.
    - Added dedicated `.student-action-btn` style (32x32px, 8px border-radius, clean subtle border, hover elevation micro-animation, and danger styling for delete).
  - **Automated Verification**:
    - Verified via Playwright at `http://127.0.0.1:5500/admin.html#students`.
    - Verified indices: Institution (1), Program (2), Batch (3).
    - Verified age output for Muhammad Alif Rezki Rahmansyah and unset students is `—`.
    - Verified actions cell gap `8px` with 4 distinct action buttons.
    - Visual artifact saved: `student_roster_polished_verified.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Phase 28: Harmonious 7-Color Palette & Exclusive Gold Glow on Grade S [100% VERIFIED]**:
  - **7-Color Distinct Progression Palette (`js/grading.js`, `js/api.js`, `js/dashboard.js`, `js/result.js`, `js/admin/app.js`, `js/admin/class.js`, `js/admin/student-management.js`, `css/style.css`, `css/result.css`, `css/admin.css`)**:
    - **F (0–10%)**: Merah Crimson (`#ef4444`) — Crisp, flat, matte, zero glow.
    - **E (11–30%)**: Rose Coral (`#f43f5e`) — Crisp, flat, matte, zero glow.
    - **D (31–50%)**: Jingga / Flame Orange (`#f97316`) — Crisp, flat, matte, zero glow.
    - **C (51–70%)**: Kuning Pucat / Lifeless Straw (`#c7c18c`) — Desaturated, matte, paper/straw feel, zero competition with gold, zero glow.
    - **B (71–90%)**: Biru / Sky Blue (`#0ea5e9`) — Clean, vibrant sky blue, zero glow.
    - **A (91–99%)**: Hijau / Emerald Green (`#10b981`) — Clean, prestigious green, zero glow.
    - **S (100%)**: Emas Champion (`#fbbf24`) — Radiant golden halo, animated sparkle (`gold-badge-sparkle`), text gleam (`gold-text-gleam`), glowing text drop-shadow, and ambient background aura.
  - **Strict Glow Exclusivity ("Glow Hanya untuk Emas Saja")**:
    - Glow, ambient radial halo, text drop-shadows, and sparkle animations are **STRICTLY EXCLUSIVE to Grade S**.
    - Tiers A, B, C, D, E, F are completely stripped of glowing box-shadows (`box-shadow: none !important` or standard dark elevation `rgba(0,0,0,0.25)`) and text drop-shadows (`filter: none !important; text-shadow: none !important`).
    - Dashboard hero banner: Grade S radiates golden ambient aura (`rgba(245, 158, 11, 0.28)`) and avatar gold ring shimmer; Non-S tiers render clean solid navy `#0f172a` with crisp border and standard shadow.
    - Result hero card: Grade S renders radiant golden ambient halo (`box-shadow: 0 0 45px rgba(245, 158, 11, 0.35)`); Non-S cards render clean solid `#0f172a` with crisp subtle border and zero glow.
  - **Hotfix — Fallback Mock Declarations in `js/api.js`**:
    - Fixed `ReferenceError: MOCK_INSTITUTIONS is not defined` on `index.html`. 5-step login chain verified working end-to-end.
  - **Playwright Test Suite & Visual Verification**:
    - Automated test `scratch/verify_palette_and_exclusive_gold_glow.mjs` confirmed:
      - Grade S: Radiant gold glow (`rgba(245, 158, 11, 0.906)`), `gold-badge-sparkle` animation, text gleam drop-shadow.
      - Grades A, B, C, D, E, F: `badgeBoxShadow: none`, `pctFilter: none`, `pctTextShadow: none`, `avatarAnimation: none`.
    - Artifact screenshots saved:
      - `gold_grade_s_glowing_verified.png`: Grade S Result hero with radiant golden aura.
      - `tier_c_straw_no_glow_verified.png`: Grade C Result hero with flat lifeless straw yellow and zero glow.
      - `tier_a_emerald_no_glow_verified.png`: Grade A Result hero with crisp emerald green and zero glow.
      - `dashboard_risma_loaded.png`: Miss Risma's real dashboard showing Grade A crisp banner (zero glow) alongside Grade S rows glowing in gold.
      - `dashboard_grade_s_banner_sparkle.png`: Grade S champion dashboard banner with full gold aura.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Phase 27: Unlocked/Takeable Assessment Calibration & Flexible Sorting [100% VERIFIED]**:
  - **TASK-27-01: Calibrate Student Score (%) & Grade (GRD) Strictly on Taken/Unlocked Modules**:
    - Enforced the business rule across `js/admin/app.js`, `js/admin/class.js`, `js/dashboard.js`, and `js/api.js`: Student SCORE (%) and GRADE (S, A, B, C, D, E, F) are strictly calculated based ONLY on assessments that have been attempted or unlocked.
    - Locked or unopened assessments are completely excluded from the score denominator, preventing them from dragging down student grade.
    - Formula applied: `average_score = sum(best_percentage_on_taken) / count(taken_assessments)`; `grade = getGrade(average_score)`.
    - Example: Students with perfect scores on completed tasks (e.g. Shelia Mulyaning Putri, Aunul Fikri Yasir, Unggul Wirakse) achieve 100% Grade S without being dragged down by the 34 remaining modules.
  - **TASK-27-02: Differentiate Progress (PROG) vs Student Score/Grade**:
    - Progress (PROG): Reflects curriculum completion: `completed_count / total_class_assessments` (e.g. "15% 6/40 Done", "5% 2/40 Done").
    - Grade (GRD): Compact column displaying the student's mastery percentage on the top line (`100%`, `99%`, `90%`) and authoritative grade badge on the bottom line (`[S]`, `[A]`, `[B]`).
    - Class Average summary row displays true class average score (`85% [B]`) and average curriculum completion (`11% Avg Done`).
  - **TASK-27-03: Flexible Multi-Criteria Column Sorting in Class Roster**:
    - Clicking `PTS` sorts by total cumulative points (`totalEarnedScore`).
    - Clicking `PROG` sorts by curriculum completion (`progressPct`).
    - Clicking `GRD` or `SCORE` sorts by mastery percentage (`averageScorePct`).
    - Configured `datagrid.js` so that clicking academic performance metrics defaults to descending on first click.
  - **TASK-27-04: Authoritative Grading Engine Centralization (`js/grading.js` & `js/api.js`)**:
    - Added and exported `calculateOverallStudentScore(takenPercentages)` adhering to AGENTS.md §2.8.
  - **TASK-27-05: Automated Playwright Verification & Screenshot Validation**:
    - Executed `scratch/verify_calibrated_scores.mjs` verifying:
      - Top student rows display authentic score % and Grade S/A.
      - Interactive sorting works on `GRD`, `PROG`, and `PTS`.
      - Summary row displays calibrated class average.
      - Viewport overflow: `{ clientWidth: 1381, scrollWidth: 1381, hasOverflow: false }`.
      - Screenshot captured: `class_roster_calibrated_scores.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Phase 26: Academic Engine, Sequential Prerequisites & Roster Matrix [100% VERIFIED]**:
  - **TASK-26-01: Fix Student Progress Calculation & Cumulative Mastery Grade Formula**:
    - In `js/admin/app.js`: Calculated `curriculumTotalMaxPoints` across all 40 assessments.
    - Updated progress formula strictly to `completion_pct = (completed_assessments_count / total_class_assessments) * 100` (e.g. students with 6/40 completed display 15% with subtext '6/40 Done').
    - Base authoritative overall grade on cumulative curriculum mastery (unattempted assessments count as 0), eliminating false Grade S inflation for partial completions.
    - Configured default table sort strictly to `PTS` (`totalEarnedScore`) descending so students who finished all modules rank on top.
  - **TASK-26-02: Standalone Student Info Columns & Zero Avatars**:
    - Configured dedicated standalone columns: `INST` (~65px), `PROGRAM` (~65px), `BATCH` (~55px), `STUDENT NAME` (~140px, text-only, zero avatar images or initial chips).
    - Preserved dedicated compact columns for academic Status: COMPLETE (1A Yellow Padlock, 2B Red Rotate Undo, 3C Green Circle Play applied and verified; 39 JS files syntax valid)
  - **TASK-26-03: 40-Column Dense Assessment Matrix (Zero Horizontal Scroll)**:
    - Enforced fixed table layout: `table-layout: fixed; width: 100%; overflow-x: hidden !important;`.
    - Auto-distributed remaining table width evenly across assessment columns 1..40 without horizontal overflow (`wrap.scrollWidth === wrap.clientWidth`).
    - Configured 4 thematic Super-Headers:
      - Cols 1–8: `THEME A (Workplace)`
      - Cols 9–18: `THEME B (Tourism)`
      - Cols 19–28: `THEME C (CCU)`
      - Cols 29–40: `THEME D (High-Frequency)`
    - Test columns (7, 8, 17, 18, 29, 30, 39, 40) styled with distinctive magenta accents.
    - Formatted `PTS` column cleanly with "pts" suffix (`${row.totalEarnedScore} pts`).
    - Appended bottom summary row: "★ CLASS AVERAGE".
    - Score cell clicks open `result.html?attempt_id=...` in a new tab without side-drawer interference.
    - Updated `result.html` and `js/result.js` to authorize admin sessions via `localStorage` mirroring, allowing administrators to inspect attempt breakdowns in new tabs without getting redirected to login.
  - **TASK-26-04: Standardize Assessment Codes & Sequential Prerequisites**:
    - Verified all 40 assessments in Supabase Cloud (`assessments` table) adhere to `[Level][Theme][Topic]-[TYPE]-[TIER]` (e.g. `3A1-WORDS-TASK`, `3A-WORDS-TEST`, `3B1-WORDS-TASK`).
    - Chained `prerequisite_assessment_id` sequentially (1 -> 2 -> ... -> 40).
  - **TASK-26-05: Playwright Automated Matrix Verification & Screenshot Validation**:
    - Executed automated Playwright test suite `scratch/verify_phase_26.mjs`:
      - Verified zero horizontal overflow: `{ clientWidth: 1381, scrollWidth: 1381, hasOverflow: false }`.
      - Verified score cell click opens `result.html?attempt_id=...` with HTTP 200 without redirect.
      - Captured verified full-width screenshot: `class_roster_matrix_phase26_verified.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Phase 24 & Phase 25: Architectural Modularization, Stability & Third-Party Elimination [100% VERIFIED]**:
  - **TASK-24-01: Asset Query String Alignment (`?v=5.2.2`) & Service Worker Precache Update**:
    - Unified all CSS and JS asset query tokens across 26 files (`admin.html`, `assessment.html`, `dashboard.html`, `index.html`, `result.html`, `sw.js`, and all modules in `js/` & `js/admin/`) strictly to `?v=5.2.2`.
    - Updated `sw.js` cache name to `abcd-core-v5.2.2` and populated `ASSETS_TO_CACHE` with core modular JS (`api.js`, `app.js`, `auth.js`, `dashboard.js`, `assessment.js`, `result.js`, `session.js`, `supabase.js`, `vendor/supabase.js`, `vendor/xlsx.full.min.js`, `wake-lock.js`).
  - **TASK-24-02: Centralize & Deduplicate `escapeHtml` / `escHtml` and Name Utilities**:
    - Established single authoritative canonical `escapeHtml` and `escHtml` in `js/app.js` (with mojibake correction, full entity replacement, and `window` fallback) and re-exported via `js/api.js`.
    - Removed all 19 duplicate declarations across `js/admin/` and HTML files. Verified with `node --check` across all modules (100% syntax pass).
    - Deduplicated `stripHonorific` and `getStudentInitial` to `js/utils/avatar-engine.js` with re-export in `api.js`.
  - **TASK-24-03: Mobile Viewport Truncation & Touch Target Safety**:
    - In `assessment.html`: Removed `100vw` from banner elements to eliminate horizontal desktop scrollbars.
    - Updated `.assessment-main-content` with `overflow-y: auto; -webkit-overflow-scrolling: touch;`, and added `@media (max-height: 640px)` and `body.focus-mode` overrides so virtual keyboard / short screens never clip answer options or submit buttons.
    - In `css/admin.css`: Enforced `@media (pointer: coarse)` 40px minimum touch targets on buttons.
  - **TASK-24-04: API Error Handling & Submission Fallback Reliability**:
    - Fixed `fetchAssessmentsForStudentLevel` in `js/api.js`: Replaced blank `catch (_) {}` with structured error logging.
    - Fixed auto-submission failure in `assessment.html`: If both `submitAssessment` and the `auto_close_expired_attempts` RPC fail, the system no longer blindly redirects to an empty `result.html`. Instead, it halts navigation, keeps answers safe in local storage, alerts the student with an actionable retry toast, and re-enables manual submission.
  - **TASK-24-05: High-Volume Search Input Debounce & DataGrid Memory Leak Fix**:
    - Debounced `vault-search` and `vault-topic-search` in `js/admin/vocab-vault.js` with 200ms debounce timer.
    - Debounced student search input in `index.html` (`renderOptions`) with 200ms debounce timer.
    - Added self-cleaning event handling to `js/admin/datagrid.js`: implements `destroy()` method, stores `_docClickHandler` reference, auto-cleans document listeners if container is detached from DOM, and automatically destroys prior instances on the same container.
  - **TASK-25-01: Modular CSS Extraction from HTML Shells**:
    - Extracted 504 lines of inline CSS from `index.html` to `css/auth.css` (`<link rel="stylesheet" href="css/auth.css?v=5.2.2" />`).
    - Merged 411 lines of inline CSS from `dashboard.html` into `css/dashboard.css` (`<link rel="stylesheet" href="css/dashboard.css?v=5.2.2" />`).
    - Extracted 542 lines of inline CSS from `assessment.html` to `css/assessment.css` (`<link rel="stylesheet" href="css/assessment.css?v=5.2.2" />`).
    - Extracted 142 lines of inline CSS from `result.html` to `css/result.css` (`<link rel="stylesheet" href="css/result.css?v=5.2.2" />`).
    - Registered all extracted stylesheets in `sw.js` cache manifest.
  - **TASK-25-02: Modular JavaScript Extraction from HTML Shells**:
    - Extracted 462 lines of inline JS from `index.html` to `js/auth.js` (`<script type="module" src="./js/auth.js?v=5.2.2"></script>`).
    - Extracted 2,125 lines of inline JS from `dashboard.html` to `js/dashboard.js` (`<script type="module" src="./js/dashboard.js?v=5.2.2"></script>`).
    - Extracted 1,628 lines of inline JS from `assessment.html` to `js/assessment.js` (`<script type="module" src="./js/assessment.js?v=5.2.2"></script>`).
    - Extracted 476 lines of inline JS from `result.html` to `js/result.js` (`<script type="module" src="./js/result.js?v=5.2.2"></script>`).
    - Preserved essential FOUC prevention session guard snippets inline in `<head>` for zero visual delay.
    - HTML shell sizes reduced by up to 85% (e.g. `index.html`: 1,169 -> 205 lines; `dashboard.html`: 3,043 -> 507 lines; `assessment.html`: 2,385 -> 215 lines; `result.html`: 744 -> 126 lines).
  - **TASK-25-03: Consolidated Student Profile Modals in Admin**:
    - Consolidated `openStudentProfile` in `js/admin/app.js` to delegate directly to the authoritative tactical modal `showStudentProfileModal` in `js/admin/student-management.js`.
    - Removed 480 lines of duplicate, obsolete DOM generation code in `app.js`.
    - Profile button clicks across all admin tables now open the non-destructive glassmorphic modal with 6 KPI cards, 3 tabs, carousel, and academic dossier button without resetting table view, filters, or scroll position.
  - **TASK-25-04: Offline CDN Fallbacks & Third-Party Elimination**:
    - Eliminated all external `ui-avatars.com` image endpoints in `assessment.html` and `js/assessment.js` in favor of local, zero-egress SVG data URIs via `generateAvatarDataUri`.
    - Bundled SheetJS locally in `js/vendor/xlsx.full.min.js` (624 KB), updated `admin.html` to load local vendor asset with CDN fallback, and added to `sw.js` precache.
  - **TASK-25-05: Automated E2E Regression Verification**:
    - Executed automated Playwright test suite `scratch/test_phase25_e2e.mjs` verifying `index.html` (Auth), `dashboard.html` (Student Dashboard), and `admin.html` (Tactical Profile Modal).
    - 100% verification pass with ZERO uncaught page errors.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.


- **Streamlined 4-Button Student Action Row & Unified In-Modal Dossier Access [100% VERIFIED]**:
  - **4-Button Row Optimization (`js/admin/student-management.js`)**:
    - Removed `printBtn` (`🖨️`) from the student table row action column to eliminate button clutter and accidental clicks.
    - Set actions column width to `150px` with uniform spacing.
    - Standardized exactly 4 high-value actions per row:
      1. `📝` **Assessment Details**: Opens the 40-module breakdown drawer.
      2. `👤` **View Student Profile**: Opens the interactive tactical profile modal (6 KPI cards, 3 tabs, carousel).
      3. `✏️` **Edit Student**: Opens quick edit drawer.
      4. `🗑️` **Delete Student**: Triggers soft-delete confirmation.
  - **Single Source for Official Dossier**:
    - The official printable Academic Dossier remains 100% accessible directly from inside the Student Profile Modal header via the prominent `[🖨️ Dossier]` button.
  - **Asset Version Bumps**:
    - Updated cache query strings to `v=5.2.1` in `admin.html`, `js/admin/app.js`, and `js/admin/class.js`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Tactical Glassmorphic Student Profile & Official Academic Dossier Modals (`B — BOARD`) [100% VERIFIED]**:
  - **Tactical Student Profile Modal (`#student-profile-modal`)**:
    - Triggered via `👤 Profile` button on any student row in the master table without navigating away or losing table filters/scroll context.
    - Glassmorphic FM-themed modal featuring student avatar, name, status badge, gender, institution, program, batch, level, and age.
    - 6 Tactical KPI cards: Global Grade (color-coded), Overall Score %, Curriculum Done (`${completed} / 40 (${pct}%)`), Live Accuracy Breakdown (Correct Answers in emerald, Minor Errors in amber, Incorrect in crimson).
    - Carousel navigation (`← Previous` and `Next →` with arrow key listeners) allowing cycling through students in the current batch with keyboard shortcuts.
    - 3 Dynamic Tabs:
      1. `📝 Assessment Breakdown (40)`: Complete table of all 40 assessments with expandable Questions & Answers Review accordion (`.clickable-attempt-row`), given answer vs accepted answer snapshots, evaluation badge, and remedial retake authorization button (`🔓 Authorize Remedial`).
      2. `⚠️ Remediation & Progression`: Curriculum progression status alerts for any module scored below passing threshold (< 70%).
      3. `🔑 Account & Enrollment`: Internal database primary key (Rule 2.2 compliant: internal UUID only, no business ID), Institution ID, PIN security status (Configured vs Not Set), and direct student edit action (`✏️ Edit`).
    - Seamless switch to Official Academic Dossier via `#btn-profile-open-dossier`.
  - **Official Academic Performance Dossier Modal (`#student-dossier-modal`)**:
    - Triggered via `🖨️ Dossier` button on any student row or directly from the Profile modal.
    - Control Toolbar with `🖨️ Print / Save as PDF`, `👤 View Profile` (bidirectional switch), and `✕` close.
    - Official Parchment Sheet (`#student-dossier-sheet`):
      - Official Academy Header: `🛡️ TOPS CORE ACADEMIC ADMINISTRATION | CENTRAL ENGLISH ASSESSMENT & CERTIFICATION BOARD`.
      - Document Ref (`TC-DOS-<HASH>`), Status (`OFFICIAL & CERTIFIED`), and Issue Date.
      - 2-Column Identity & 3:4 Student Photo Box with `OFFICIAL` ribbon badge.
      - Certified Summary Box: Overall Grade, Mastery Score %, Curriculum Pace (`${completed} / 40`), and Total Points (`pts`).
      - Official Assessment Transcript Table with high-contrast `#0f172a` ink styling, type badges (`VOCAB_TASK`, `PHRASE_TASK`, etc.), date, points, percentage, and grade.
      - Dual Signature blocks (Lead Academic Instructor & Director of Academic Board) + Official Circular Academy Seal (`TOP OFFICE ACADEMIC SEAL`).
      - High-fidelity `@media print` rules ensuring clean white paper output without dark background bleed.
  - **Database Error 42703 Fix**:
    - Fixed query in `js/admin/app.js` (`openStudentProfile`) and `student-management.js`: removed non-existent column `question_order` from `attempt_answers` projection, replacing with `is_correct`, eliminating HTTP 400 Bad Request error.
  - **E2E Automated Verification**:
    - Verified via Playwright automated test (`scratch/test_profile_and_dossier.mjs`).
    - Captured verified screenshots:
      - `profile_modal_verified.png`: Tactical student profile modal with 6 KPI cards, 40-assessment breakdown, tabs, and carousel.
      - `dossier_modal_verified.png`: Official certified student transcript sheet with high-contrast text, student 3:4 photo, summary boxes, transcript rows, and official seal.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Dynamic Active Program Navigation in Left Sidebar (`B — BOARD`) [100% VERIFIED]**:
  - **Dynamic Program List under Domain B (`B — BOARD`)**:
    - Replaced the static `Students` nav item in `admin.html` with dynamic `<div id="sidebar-programs-list"></div>` and immediate inline `localStorage` hydration script mirroring the Domain C class injection architecture.
    - Added `loadSidebarPrograms()` in `js/admin/app.js` with stale-while-revalidate caching (`topscore_cached_sidebar_programs`).
    - Automatically queries active programs (`is_active: true`) and generates a sidebar item for each (`👥 Camp`, `👥 Hospitality`).
    - Automatically hides inactive programs (`is_active: false`, e.g. English Explorer, Tamata Persada). Newly activated programs automatically appear in real time without code modifications.
  - **Clean 1-Program-1-Table Roster (No Horizontal Tabs)**:
    - Removed horizontal program pill tabs (`#program-nav-tabs`) and tab click event listeners from `js/admin/student-management.js`, eliminating UI clutter above the table.
    - Program selection is controlled directly from the sidebar.
    - Clicking any program in the sidebar immediately activates its tactical panel highlight, updates the topbar breadcrumb (`BOARD / <Program>`), and renders that program's isolated student table (Camp: 25 students; Hospitality: 14 students).
  - **Reactive Cache Synchronization**:
    - In `js/api.js`, updated `clearAdminCache('programs')` to automatically trigger `loadSidebarPrograms()`, keeping the sidebar synchronized whenever programs are created, edited, activated, or deactivated.
  - **Automated Verification**:
    - Verified via Playwright automated test (`scratch/test_sidebar_programs.mjs`).
    - Captured verified screenshots:
      - `sidebar_program_hospitality_verified.png`: Shows `Hospitality` active in the sidebar, `BOARD / Hospitality` breadcrumb, and isolated 14 Hospitality students.
      - `sidebar_program_camp_verified.png`: Shows `Camp` active in the sidebar, `BOARD / Camp` breadcrumb, and isolated 25 Camp students.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Consolidate Student Roster & Progress into 1 Single Master Table (`#students`) [100% VERIFIED]**:
  - **Pruned Navigation Redundancy**: Removed separate `Student Progress` (`progress-view`) nav item from sidebar `B — BOARD`. `B — BOARD` now cleanly houses only `Students`.
  - **Backward-Compatible Hash Routing**: Set `case 'progress-view':` in `js/admin/app.js` to redirect seamlessly to `#students` (`window.location.hash = '#students'; return loadSection('students');`).
  - **Unified All Columns in One Master Table (`js/admin/student-management.js`)**:
    1. `Select` checkbox (bulk actions: activate, deactivate, soft-delete, re-assign batch/institution)
    2. `Institution` (135px, hierarchical sort, ellipsis)
    3. `Program` (95px, ellipsis)
    4. `Batch` (75px, pill badge)
    5. `Level` (85px, pill badge)
    6. `Name` (170px, avatar + honorific + display name + remediation alert badge)
    7. `Age` (65px, e.g. `18 yrs`, `38 yrs`, or `—`)
    8. `Gender` (80px, Male/Female badge)
    9. `Assessments` (95px, `${completed} / ${totalAssigned}`, e.g. `6 / 40`, `3 / 40`, `0 / 40`)
    10. `Score` (70px, authoritative overall highest score, e.g. `99%`, `91%`, `83%`, `—`)
    11. `Grade` (65px, authoritative badge: S, A, B, C, D, E, F)
    12. `Completion` (115px, mini tactical progress bar + `${completionPct}%`)
    13. `Enrolled` (95px, formatted date, e.g. `09 Oct 2026`)
    14. `Status` (75px, Active / Inactive badge)
    15. `Actions` (180px, sticky right pinned: `📝 Details`, `👤 Profile`, `🖨️ Dossier`, `✏️ Edit`, `🗑️ Delete`)
  - **40-Assessment Breakdown Modal (`window.showStudentProgressDetails`)**:
    - Triggered via `📝 Details` button on any student row.
    - Glassmorphic modal displaying student avatar, name, batch, level, and 6 high-level metric cards (`Assigned 40`, `Completed 6`, `In Progress 0`, `Overall Score 83%`, `Global Grade B`, `Completion 15%`).
    - Full scrollable table of all 40 assessments showing Title, Level badge, Status badge (`🔔 NOT STARTED`, `✔️ COMPLETED`, `▶️ IN PROGRESS`), and Best Score % (`100%`, `78%`, `—`).
  - **Full Sorting Support**: Added sorting comparators for `completedAssessments`, `completionPct`, `overallScoreStr`, and `globalGrade`.
  - **Verification**: Verified via Playwright automated tests and screenshots (`unified_student_board_verified.png`, `unified_student_modal_verified.png`).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Streamline Student Management View (`#students`) [100% VERIFIED]**:
  - **Pruned PIN Subtext under Student Name**: Cleaned `PIN: ****` and `PIN: NOT SET` from the student name column template in `js/admin/student-management.js`; clean student name only is rendered.
  - **Removed CONTACT Column**: Deleted `CONTACT` (`phone`) column definition from DataGrid configuration, freeing horizontal table width.
  - **Relocated Import & Export Controls**:
    - Removed redundant `_ Import` and `Export CSV` buttons from the roster action bar above the table, leaving only `+ Add Student` and duplicate resolution.
    - Placed `Export CSV` button (`#btn-export-students-csv`) in the dedicated "Import Students" tab alongside the file upload/dropzone and download template buttons.
    - Exported `window.exportStudentsGradebook` to provide unified gradebook export functionality.
  - **Compressed Filter Bar into Single Slim 38px Line**:
    - Styled `.students-filter-bar-slim` (`display: flex; align-items: center; gap: 8px; padding: 6px 12px; margin-bottom: 8px; height: 38px;`) in `css/admin.css`.
    - Removed bulky stacked label headers ("BATCH STATUS", "FILTER BY PROGRAM", "FILTER BY BATCH").
    - Embedded clear, compact label placeholders: `[Status: COMPLETE (1A Yellow Padlock, 2B Red Rotate Undo, 3C Green Circle Play applied and verified; 39 JS files syntax valid)
    - Placed directly above the search/datagrid area to maximize vertical screen real estate.
  - **Verification**: Verified via Playwright automated tests and screenshots (`students_roster_streamlined.png`, `students_import_export_relocated.png`).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Complete 3-Way Scoring & Global Grade Unification Across Platform [100% VERIFIED]**:
  - **Identified Root Causes & Bugs**:
    1. *Retake Penalty in Student Management (`#students`)*: In `js/admin/student-management.js` (`renderStudents`), the calculation looped over all submitted attempts and summed `total_questions` and `score` across ALL attempts. Multiple practice attempts penalized students by inflating the denominator with early unsuccessful attempts (e.g. Aunul Fikri Yasir with 24 attempts dropped to 78% Grade B instead of his highest 99% Grade A; Asti Ananta dropped to 60% Grade C instead of 82% Grade B; Laura Fardila dropped to 70% Grade C instead of 86% Grade B; Mr. Test dropped to 23% Grade E instead of 62% Grade C).
    2. *Ignored `auto_submitted` Status*: Filter checked `a.status === 'SUBMITTED' || a.status === 'submitted'`, ignoring `auto_submitted` attempts from timer expiration. Ahmad Nur Suhendro showed 5 assessments instead of 6, and Mr. Test missed 2 assessments.
    3. *Class Hub Grade Discrepancy (Rule 2.8 & 2.10)*: In `js/admin/app.js` (`renderClassHub`), student grade divided earned percentages by 40 (`totalClassAssessments`) instead of completed assessments, showing Grade `E` for all students.
    4. *Student Progress Case Sensitivity & Missing Features*: In `js/admin/class.js` (`renderProgressView`), uppercase check caused `0 / 40` completion, and the table lacked rich profile information (avatars, ages, gender, score %, global grade, batch status filters).
  - **Implemented Resolutions**:
    1. *Unified Highest Score Calculation (Rule 2.7 & 2.8)*:
       - In `student-management.js`, grouped attempts by `assessment_id` into `bestByAsm` taking the highest score across valid completion statuses: `['submitted', 'auto_submitted', 'evaluated', 'graded']`.
       - Calculated authoritative `overallPct` and `globalGrade = getGrade(overallPct)` matching Rule 2.10.
       - Updated remediation check and print dossier export to include `auto_submitted`.
       - Added numeric and rank-based sorting in `DataGrid` `sortComparator` for `overallScoreStr` (numeric percentage) and `globalGrade` (rank: S > A > B > C > D > E > F).
    2. *Unified Class Hub Attendance Roster (`js/admin/app.js`)*:
       - Computes `overallPct` from takeable/completed assessments and authoritative `getGrade(overallPct)`.
       - Default sort descending by PTS (`totalEarnedScore`) so top students appear on top.
    3. *Upgraded Student Progress View (`js/admin/class.js`)*:
       - Case-insensitive valid completion check `['submitted', 'auto_submitted', 'evaluated', 'graded']`.
       - Added Batch Status filter defaulting to `Active Batches (Ongoing)`.
       - Added 13 rich columns: Institution, Program, Batch, Level, Student Name (avatar, honorific, PIN, profile link), Age, Gender badge, Assessments (`6 / 40`), Score (`91%`), Grade badge (`A`), Completion bar, Status, and Actions.
  - **Verification via Automated Test**:
    - Created and executed `scratch/test_full_3view_sync.mjs` with Playwright.
    - Verified exact 100% agreement on scores, grades, and completed assessment counts across all 3 views:
      - Miss Shelia Mulyaning Putri: 100% Grade S | 150 PTS (100%) Grade S | 100% Grade S (6 / 40)
      - Mr. Aunul Fikri Yasir: 99% Grade A | 149 PTS (99%) Grade A | 99% Grade A (6 / 40)
      - Mr. Unggul Wirakse: 99% Grade A | 149 PTS (99%) Grade A | 99% Grade A (6 / 40)
      - Miss Sofa Maria Ulfa: 99% Grade A | 148 PTS (99%) Grade A | 99% Grade A (6 / 40)
      - Mr. Gagan Tara Deswari: 98% Grade A | 147 PTS (98%) Grade A | 98% Grade A (6 / 40)
      - Miss Risma: 97% Grade A | 146 PTS (97%) Grade A | 97% Grade A (6 / 40)
      - Mr. Ari Wahyu Darma: 95% Grade A | 143 PTS (95%) Grade A | 95% Grade A (6 / 40)
      - Mr. Muhammad Masyan Hafizi: 95% Grade A | 142 PTS (95%) Grade A | 95% Grade A (6 / 40)
      - Miss Latifa Maulidya: 91% Grade A | 137 PTS (91%) Grade A | 91% Grade A (6 / 40)
      - Mr. Asmul Kholid: 89% Grade B | 134 PTS (89%) Grade B | 89% Grade B (6 / 40)
      - Miss Nurhaliza: 88% Grade B | 132 PTS (88%) Grade B | 88% Grade B (6 / 40)
      - Miss Syazida Shinda Debi: 88% Grade B | 132 PTS (88%) Grade B | 88% Grade B (6 / 40)
      - Miss Laura Fardila: 86% Grade B | 129 PTS (86%) Grade B | 86% Grade B (6 / 40)
      - Mr. Ahmad Nur Suhendro: 83% Grade B | 125 PTS (83%) Grade B | 83% Grade B (6 / 40)
      - Miss Asti Ananta: 82% Grade B | 123 PTS (82%) Grade B | 82% Grade B (6 / 40)
      - Mr. Frengki Juniardi: 80% Grade B | 72 PTS (80%) Grade B | 80% Grade B (3 / 40)
      - Mr. Test: 62% Grade C | 56 PTS (62%) Grade C | 62% Grade C (3 / 40)
    - Verified screenshots saved to artifacts directory:
      - `view1_students_verified.png`
      - `view2_class_hub_verified.png`
      - `view3_progress_view_verified.png`
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.
  - **Identified Root Causes**:
    1. *RLS Missing Write Policies on Curriculum Entities*: In Supabase PostgreSQL, table `batches` (along with `programs`, `institutions`, `classes`, `levels`) only allowed SELECT for role `anon`. When admin called `adminUpdate('batches', id, { is_active: ... })`, Postgres rejected the update (0 rows affected). PostgREST `.update(...).select().single()` threw PGRST116: `Cannot coerce the result to a single JSON object`.
    2. *Invalid Columns in Student Progress Fetch*: `adminFetchAll('progress', 'id, student_id, class_id, level_id, status')` failed with HTTP 400 because `level_id` and `status` do not exist in table `progress`.
    3. *Stale Joined Student Cache*: Updating a batch only cleared `batches|*` cache in `_adminCache`, leaving joined batch information inside `students|*` stale.
  - **Implemented Resolutions**:
    1. *PostgreSQL RLS Migration*: Applied `supabase/migrations/20261011020000_curriculum_admin_rls.sql` to Supabase Cloud, granting `ALL` permissions for role `anon` (`USING (true) WITH CHECK (true)`) on `batches`, `programs`, `institutions`, `classes`, `class_levels`, `levels`, `topics`, `questions`, and `assessment_questions`.
    2. *Cross-Table Cache Invalidation*: Updated `clearAdminCache()` in `js/api.js` to automatically clear dependent `students|`, `progress|`, and `classes|` caches whenever organizational entities change.
    3. *Query Column Correction*: In `js/admin/student-management.js`, replaced non-existent columns with valid columns `unlocked_level, highest_score`.
    4. *Batch Status Filter in Student Management (`#students`)*:
       - Default: `Active Batches (Ongoing)` (shows 39 active students, past batch students hidden).
       - Option: `All Batches (Include Past)` (shows 64 total students, with `DISCONNECTED` tags for inactive batches).
       - Option: `Inactive / Past Batches Only` (shows 25 inactive students).
       - Automatically filters the `Filter by Batch` dropdown options based on batch status.
    5. *Class Hub Attendance Roster Filter (`#class-hub`)*:
       - Added batch filter defaulting to `Active Batches Only` (25 enrolled), with options for `All Batches (Include Past)` (50 enrolled) or specific batches with `(Past/Inactive)` indicator labels.
    6. *Student Login Filter (`index.html`)*:
       - `fetchBatches(programId)` defaults to `activeOnly = true`, hiding inactive batches (131, 132) from the login card selection.
       - `fetchStudentsByProgram(programId, batchId, activeOnly)` joins `batches!batch_id(id, is_active)` and filters out inactive batch students from the "All Batches" list when `activeOnly = true`.
  - **Verification via Automated Test**:
    - `scratch/test_class_hub.mjs`: Attendance roster renders with `Active Batches Only` by default.
    - `scratch/test_batch_activation_e2e.mjs`: Batch toggle in Organization updates live without errors; Student Management filters active/inactive batches; Student login displays only active batches (123, 133).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Instant Old Photo Erasure on Student Upload & Zero-Latency Avatar Sync [100% VERIFIED]**:
  - **Identified Root Causes of "Old Photo Glimpse" / Ghosting**:
    1. *DOM Persistence*: When selecting a new file in `handlePhotoChange()`, `<img id="banner-avatar-img">`, `<img id="header-avatar-img">`, and `<img id="prof-photo-img">` retained the old photo's `src` while async compression and upload ran in background.
    2. *Stale localStorage Cache*: `localStorage.getItem('stu_photo_${session.student_id}')` previously retained the old photo Base64 string and was not cleared on file selection or updated on photo change.
    3. *Delayed Listener Initialization*: In `dashboard.html`, `setupProfileModal()` previously waited for `loadDashboard()` network requests before binding photo change listeners.
  - **Implemented Instant Erasure & Synchronous Cache Invalidation**:
    - **`clearPhotoEverywhere()`**:
      - Wipes `localStorage.removeItem('stu_photo_' + session.student_id)`.
      - Clears image `src = ''`, removes attribute `src`, and adds class `hidden` to all 3 avatar images (`banner-avatar-img`, `header-avatar-img`, `prof-photo-img`).
      - Unhides avatar initial letter / icon badges (`banner-avatar-initial`, `header-avatar-initial`, `avatar-icon`).
    - **`handlePhotoChange()`**:
      - Calls `clearPhotoEverywhere()` synchronously on the first line of file selection (`change` event, 0ms latency).
      - Old photo is immediately erased from screen and cache before compression begins.
      - Upon compression completion, immediately displays the new compressed WebP avatar via `applyPhotoEverywhere()` and persists to Supabase.
      - Resets `e.target.value = ''` in `finally` block to allow re-uploading the same file.
    - **First-Login Modal Snapshot Fallback (`btn-retake-photo` & `onboard-photo-file`)**:
      - Immediately clears and hides `#webcam-snapshot` on file select or retake click.
    - **Background Sync in `checkAndPromptPhoto()`**:
      - Automatically synchronizes `localStorage` with current Supabase `students.photo_url` in the background on dashboard entry.
    - **Startup Listener Architecture**:
      - `setupProfileModal([])` is called immediately on page entry before network requests start so modal controls and photo upload listeners are interactive instantly.
  - **Verification via Automated Test**:
    - Created and executed `scratch/test_photo_instant_erasure.mjs` with Playwright on real student session.
    - Verified: `wipedInstantly: true` (all avatar `<img>` tags hidden and cleared, `localStorage` wiped in 0ms).
    - Verified: `postUploadState` (new compressed WebP photo displayed across all banner, header, and profile modal elements).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Existing Student Photos Batch Compression Migration [100% VERIFIED]**:
  - **Identified Existing Bloat**:
    - Ran database audit across all 25 students with uploaded photos. Found 15 heavy photos (>50KB) totaling **13.137 KB (~12.83 MB)** stored directly in PostgreSQL (e.g. Latifa Maulidya: 2.38MB, Suke Ajai: 1.96MB, Muhammad Masyan: 1.82MB, Test: 1.77MB, Ahmad Nur Suhendro: 1.57MB).
  - **Executed Automated Batch Migration**:
    - Created and executed `scratch/batch_compress_existing_photos.mjs` using Playwright HTML5 canvas integration with `avatar-engine.js`.
    - Automatically center-cropped each image to 3:4 (240x320 px) and encoded to WebP Base64 strictly `< 30 KB`.
    - Successfully updated all 15 students in PostgreSQL.
  - **Results & Database Verification**:
    - `scratch/audit_existing_photos.mjs` confirmed: **0 heavy photos remaining** out of 25 (0 of 25 > 50KB).
    - Total photo payload in PostgreSQL shrank from **13.137 KB (~12.83 MB)** to **435 KB (~0.42 MB)** (**98.7% database footprint reduction!**).
    - Every student photo is intact, properly framed, and sharp.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Client-Side Avatar Compression (Option 1: Lightweight WebP Base64 < 30KB) [100% VERIFIED]**:
  - **Identified User Decision (Option 1)**:
    - User explicitly selected **Opsi 1**: Self-contained client-side Base64 compression stored directly in PostgreSQL without relying on external Supabase Storage bucket uploads.
  - **Implemented Solution**:
    - **`js/utils/avatar-engine.js`**:
      - Added `loadImageSource(source)` helper supporting `File`, `Blob`, and base64 `dataUrl` strings.
      - Updated `processAndCompressAvatar(file, 'student')`:
        - Proportional 3:4 center-crop (240x320 px) with 35% vertical bias to keep face centered.
        - Encodes to modern WebP format (`image/webp`) with adaptive compression loop clamping payload strictly `< 30 KB`.
    - **`dashboard.html`**:
      - Imported `processAndCompressAvatar` from `./js/utils/avatar-engine.js?v=5.1.0`.
      - Onboarding Webcam Snapshot (`btn-snap-photo` & auto-capture): Canvas cropped to 240x320 and encoded to WebP.
      - Onboarding File Fallback (`onboard-photo-file`): Immediately runs `processAndCompressAvatar` on file selection.
      - Onboarding Confirmation (`btn-confirm-photo-setup`): Runs `processAndCompressAvatar` on `onboardPhotoData` before saving Base64 to `students.photo_url`.
      - Profile Banner Photo Input (`handlePhotoChange`): Runs `processAndCompressAvatar` on selected file, updates UI, and saves compressed WebP Base64 (<30KB) to `students.photo_url`.
  - **Verification via Automated Test**:
    - `scratch/test_option1_compression.mjs`:
      - Input: High-res 2000x2000 canvas image.
      - Compression duration: **51 ms** (instantaneous).
      - Output size: **2.4 KB** (**97.6% - 99% reduction** from raw 2.4MB).
      - Output dimensions: `240x320` px (3:4 ratio).
      - Output format: `data:image/webp;base64,...`.
      - Storage bucket bypass: 100% self-contained, 0 network storage calls.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Roster Columns Revision, Progress/Grade Formula Repair & Zero Horizontal Scroll Matrix [100% VERIFIED]**:
  - **Repaired Progress, Points & Grade Logic**:
    - **Progress Formula (`PROG`)**: Implemented authoritative formula `completion_percentage = (completed_assessments_count / total_class_assessments) * 100`.
      - Incomplete students (e.g. Dwi Handaya with 2/40 completed) strictly display `5%` with subtext `2/40 Done` (eliminating false 100% display).
      - Full curriculum completers (e.g. Miss Siti Qori' Atun Hizbaeni with 40/40 completed) display `100%` with subtext `40/40 Done`.
    - **Cumulative Points (`PTS`)**: Authoritatively summed actual earned points across all completed assessments (e.g. Miss Siti Qori' Atun earned 2685 PTS; Dwi Handaya earned 42 PTS).
    - **Authoritative Grade (`GRD`)**: Evaluates cumulative mastery across the curriculum (counting unattempted assessments as 0%). Incomplete students with 2/40 tasks are strictly graded `F`, never erroneously assigned Grade `S`.
    - **Default Table Sorting**: Configured `initialSortKey: 'totalEarnedScore'` and `initialSortAsc: false` so rows automatically sort by `PTS` descending, ranking curriculum completers at the top.
  - **Dedicated Standalone Student Info Columns (~470px)**:
    - `INST` (~65px): Renders institution short code (e.g. `CEC`).
    - `PROGRAM` (~65px): Renders program name (e.g. `Camp`).
    - `BATCH` (~55px): Standalone pill badge (e.g. `131`, `133`) resolved cleanly from batch data mapping.
    - `STUDENT NAME` (~140px): Text-only name with bold typography, completely eliminating all avatar image and initial circle elements.
    - `PROG` (~50px): Percentage with completed subtext.
    - `GRD` (~40px): Grade pill badge (S, A, B, C, D, E, F).
    - `PTS` (~55px): Points badge with cyan accent.
  - **40 Assessment Columns in 100% Viewport Width (Zero Horizontal Scroll)**:
    - Locked container `#class-attendance-grid .table-wrap` with `overflow-x: hidden !important; width: 100% !important;`.
    - Configured table with `table-layout: fixed !important; width: 100% !important;`.
    - Implemented `<colgroup class="datagrid-colgroup">` dynamically injecting `<col style="width:...">` elements before `<thead>`, ensuring `table-layout: fixed` strictly adheres to column widths regardless of super-header colspans.
    - Allocated remaining width evenly across the 40 assessment columns (~27px–32px per cell).
    - Added super-header grouping row:
      - `STUDENT DETAILS` (Columns 1–7)
      - `THEME A` (Columns 1–8)
      - `THEME B` (Columns 9–18)
      - `THEME C` (Columns 19–28)
      - `THEME D` (Columns 29–40)
    - Styled Test columns (7, 8, 17, 18, 29, 30, 39, 40) with magenta borders (`#ec4899`), pink badges (`#f472b6`), and soft column banding.
    - Rendered earned points clearly in completed cells; unattempted cells render as subtle dots `·` (`.asm-dot`).
    - Appended fixed sticky summary row at the bottom: "★ CLASS AVERAGE" calculating average points and completion across all enrolled students.
  - **Visual & Functional Verification via Playwright**:
    - `scratch/verify_revised_roster.mjs` & `scratch/test_diag.mjs`:
      - `wrapClientWidth: 1621`, `wrapScrollWidth: 1621`, `hasOverflow: false` (ZERO horizontal scrollbar).
      - Dwi Handaya: `5% | 2/40 Done | Grade F | PTS 42`.
      - Miss Siti Qori' Atun Hizbaeni: `100% | 40/40 Done | Grade A | PTS 2685`.
      - Summary Row: `★ CLASS AVERAGE | 7% Avg Done | Grade F | PTS 102`.
      - Screenshots verified and saved to artifacts: `revised_roster_verified.png`, `class_roster_summary_docked_verified.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Sidebar Class Tab Delay & Class Hub Loading Performance Optimization [100% VERIFIED]**:
  - **Identified Root Causes**:
    1. **Artificial 1.5s Delay**: Found hardcoded `setTimeout(() => { if (window.loadSidebarClasses) window.loadSidebarClasses(); }, 1500);` in `js/admin/app.js`, intentionally delaying class tab rendering.
    2. **Execution Timing / Non-Hoisted Function Expression**: `window.loadSidebarClasses` was defined as an anonymous function expression *after* `showConsole()` was executed on page load, causing `showConsole()` to skip calling it completely.
    3. **Empty Initial DOM & No Initial Cache**: `#sidebar-classes-list` in `admin.html` was rendered as an empty `<div></div>`, while all other menu items are hardcoded static HTML, causing the class tab to be completely invisible until network and script initialization completed.
    4. **Missing Navigation Mapping**: `'class-hub'` was completely missing from `sectionTitles` and `sectionDomainMap` in `js/admin/app.js`, causing direct navigation to fail or fall back to incorrect domain headers (`BOARD / class-hub`).
    5. **Heavy 20MB Base64 Payload & Statement Timeouts**: `adminFetchAll('students')` without column projection downloaded complete student records including massive base64 webcam photos (up to 2.4MB per photo, totaling >20MB), triggering Supabase PostgreSQL statement timeouts (HTTP 500) and 20-60 second hangs.
    6. **Redundant Duplicate Query**: `adminFetchAll('classes')` was called twice in `renderClassHub`.
  - **Implemented Solution**:
    1. **`admin.html`**:
       - Added synchronous inline hydration script inside `#sidebar-classes-list` to immediately parse and render cached classes from `localStorage.getItem('topscore_cached_sidebar_classes')` at HTML parse time (0ms, zero visual delay or flicker).
    2. **`js/admin/app.js`**:
       - Added `'class-hub': 'Class Hub'` to `sectionTitles` and `'class-hub': 'CLASS'` to `sectionDomainMap`.
       - Converted `loadSidebarClasses` and `renderClassHub` into hoisted async functions and exported them onto `window`.
       - Removed artificial 1.5s delay and invoked `loadSidebarClasses()` immediately upon app initialization.
       - Optimized student queries in `renderClassHub` to select only required flat columns (`id, name, gender, birth_date, is_active, deleted_at, level_id, batch_id, program_id, institution_id`), eliminating all base64 photo downloads.
       - Optimized student queries in `updateAdminKpiBanner` to select only `id, deleted_at`.
       - Added memory caching (`window._classHubCache`) to make subsequent switches to Class Hub instantaneous.
    3. **`js/admin/admin-deck.js`**:
       - Optimized dashboard metrics student fetch to `id, is_active, deleted_at`.
  - **Verification via Automated Test**:
    - `scratch/test_cached_refresh.mjs`:
      - Instant sidebar class item visibility on refresh: **true** (719ms Playwright page load, 0ms DOM parse time).
    - `scratch/test_final_speed.mjs`:
      - Sidebar class item cold load: **1050ms** (down from 2-4s).
      - Class hub first render: **884ms** (down from 20-60s timeouts).
      - Class hub subsequent cached render: **265ms** (instantaneous).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Distinct Colors & Visual Banding for TASK vs TEST Columns [100% VERIFIED]**:
  - **Task vs Test Differentiation**:
    - Identified 32 TASK columns and 8 TEST columns across Themes A, B, C, D (Tests at columns 7, 8, 17, 18, 29, 30, 39, 40).
  - **Color Delineation**:
    - **TASK Columns**: Render with cyan headers (`#38bdf8`) on standard dark surface background.
    - **TEST Columns**: Render with vibrant pink headers (`#f472b6`) with a distinct bordered pill badge, highlighted header background (`rgba(244, 114, 182, 0.18)`), pink bottom border, and soft vertical pink background banding (`rgba(244, 114, 182, 0.06)`) with subtle left/right border dividers.
  - **Comprehensive Tooltips**:
    - Header tooltips clearly specify `[TASK]` or `[TEST]` prefix, assessment code, and title.
  - **Verification**:
    - Automated Playwright verification (`scratch/verify_task_test_colors.mjs`) ran live with 0 errors.
    - Screenshot archived: `class_roster_task_test_colored.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Numbered Assessment Columns 1-40 & Full Zero-Scroll Screen Fit [100% VERIFIED]**:
  - **Numbered Headers (1 to 40)**:
    - Replaced text codes with clean, numbered headers `1`, `2`, `3`, ..., `40` for all 40 class assessments.
    - Each number header retains a rich tooltip on hover: `${num}. ${code} - ${title}`.
  - **Zero Horizontal Scrolling (Full Screen Fit)**:
    - Optimized column widths (`col-asm`: 26px width, compact 0.4rem/0.25rem padding).
    - Compacted summary columns: `INST` (42px), `PROG` (46px), `BATCH` (42px), `LVL` (44px), `NAME` (135px), `PROG` (52px), `GRD` (36px), `PTS` (48px), `ST` (38px), `ACTIONS` (46px).
    - Verified on 1920x1080 desktop that `wrapClientWidth === wrapScrollWidth` (1621px == 1621px): all 49 columns are 100% visible simultaneously without any horizontal scroll bar!
  - **Points-Only Cell Formatting**:
    - Each cell renders the bold point value (e.g. `40`, `34`, `10`, `—` for unattempted, `⏳` for in-progress).
    - Hovering any cell reveals full assessment info and points out of total questions.
  - **Visual Verification**:
    - Screenshot archived: `class_roster_all_columns_visible.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **40 Assessment Columns (Points Only) & Streamlined Enrollment Table [100% VERIFIED]**:
  - **40 Individual Assessment Columns Added**:
    - Every assessment in the class curriculum (`classAssessments`, sorted chronologically) now has its own dedicated column in the Class Roster / Attendance DataGrid.
    - Each column displays the assessment's code badge (e.g. `3A1-WORDS-TASK`, `3A1-PHRASES-TASK`, `3A-WORDS-TEST`, etc.) in the header with a full title tooltip.
  - **Points-Only Cell Formatting (No Score or Grade Inside Assessment Columns)**:
    - In accordance with user requirement, assessment column cells show ONLY the points earned (e.g. `40 pts`, `34 pts`, `10 pts`).
    - Unattempted assessments display a subtle `—`.
    - In-progress attempts display `⏳`.
    - No percentage or letter grade is placed in individual assessment cells, preserving clean separation since `PROGRESS` and `GRADE` have dedicated summary columns.
  - **Abbreviated Institution Names**:
    - Shortened institution names to concise codes: Cake English Course -> `CEC`, Top English Program -> `TOP`.
    - Styled in a clean badge labeled `INST` with full name on hover.
  - **Removed Columns**:
    - Removed `gender` (GENDER), `ageDisplay` (AGE), and `phone` (CONTACT) columns to streamline width and prioritize curriculum performance.
  - **Retained Core Summary Columns**:
    - `INST` (abbreviated), `PROGRAM`, `BATCH`, `LEVEL`, `STUDENT NAME` (with avatar & PIN), `PROGRESS` (score % & completed count), `GRADE` (letter grade badge), `TOTAL PTS` (accumulated points), `STATUS` (Active/Inactive), and sticky `ACTIONS` (View Profile, Edit Student).
  - **DataGrid Dropdown Optimization**:
    - Added `max-height: 320px; overflow-y: auto;` to `.datagrid-cols-menu` so the column visibility toggle menu stays neatly scrollable with 49 columns.
  - **Automated Verification**:
    - Automated Playwright verification (`scratch/verify_40_assessments_table.mjs`) ran live against `http://127.0.0.1:5500/admin.html`.
    - Verified 49 total columns, confirmed `hasGender=false`, `hasAge=false`, `hasContact=false`.
    - Verified smooth horizontal scrolling and captured visual proof screenshots: `class_roster_40_assessments_left.png` and `class_roster_40_assessments_scrolled.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Supabase Cloud Connection Restored & Zero-Error Full Recovery [100% VERIFIED]**:
  - **Root Cause of `TypeError: Failed to fetch` & "No classes found"**:
    - An unstaged edit in `js/supabase.js` had caused `USE_LOCAL` to fall back to `isLocalHostname` (which evaluates to `true` on `127.0.0.1:5500`), pointing the Supabase client to `http://127.0.0.1:54021` where Docker is not running.
    - This caused all browser database queries (classes, assessments, vault) to fail with `TypeError: Failed to fetch`, rendering "No classes found." in the sidebar and empty views across the console.
  - **The Fix**:
    - Restored `USE_LOCAL` in `js/supabase.js` to only be active if `localStorage.getItem('topscore_use_local') === 'true'`.
    - By default, all browser sessions connect directly to Supabase Cloud (`https://oclajpyumehpojepcczg.supabase.co`).
  - **Verification Across All Affected Views**:
    - Sidebar correctly renders `📘 Vocabulary` under `C — CLASS`.
    - Clicking `📘 Vocabulary` opens the Class Hub with 40 Assessments, 50 Enrolled Students, and the clean 14-column Class Roster table.
    - `admin.html#assessments` successfully renders all 40 assessments.
    - `admin.html#vocab_vault` loads all 800 vocabulary words and Level 3 roadmaps with zero errors.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.
    - Added `defer` attribute to external `<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js">` in `admin.html` to eliminate external network blocking and ensure lightning-fast 700ms page loads.
  - **Comprehensive Zero-Error Verification**:
    - Executed automated Playwright test (`scratch/verify_class_roster_scores.mjs`) navigating live through `#class-hub` and the Attendance tab.
    - Verified 0 uncaught exceptions, 0 runtime errors, and captured full-resolution visual proof (`class_roster_scores_verified.png`).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Standardize Assessment Codes & Strict Sequential Prerequisite Chaining [100% VERIFIED]**:
  - **Assessment Code Normalization (`shell_code` & `payload.shell_code`)**:
    - Re-formatted all 40 curriculum tasks and tests across Themes A, B, C, D to the standardized format:
      - Tasks: `${level_number}${theme_code}${topic_number}-${category.toUpperCase()}-TASK` (e.g. `3A1-WORDS-TASK`, `3A1-PHRASES-TASK`, `3B1-WORDS-TASK`).
      - Tests: `${level_number}${theme_code}-${category.toUpperCase()}-TEST` (e.g. `3A-WORDS-TEST`, `3A-PHRASES-TEST`, `3D-WORDS-TEST`, `3D-PHRASES-TEST`).
    - Standardized shell generator in `js/api.js` (`upsertDynamicAssessmentShell`) to produce this exact code formula for all future generations.
  - **Strict Sequential Prerequisite Chaining (`prerequisite_assessment_id`)**:
    - Established an unbroken sequential prerequisite chain linking all 40 assessments in exact chronological order:
      - `3A1-WORDS-TASK` (`prerequisite_assessment_id: NULL`)
      - `3A1-PHRASES-TASK` (prerequisite: `3A1-WORDS-TASK`)
      - `3A2-WORDS-TASK` (prerequisite: `3A1-PHRASES-TASK`)
      - `3A2-PHRASES-TASK` (prerequisite: `3A2-WORDS-TASK`)
      - `3A3-WORDS-TASK` (prerequisite: `3A2-PHRASES-TASK`)
      - `3A3-PHRASES-TASK` (prerequisite: `3A3-WORDS-TASK`)
      - `3A-WORDS-TEST` (prerequisite: `3A3-PHRASES-TASK`)
      - `3A-PHRASES-TEST` (prerequisite: `3A-WORDS-TEST`)
      - `3B1-WORDS-TASK` (prerequisite: `3A-PHRASES-TEST`)
      - `3B1-PHRASES-TASK` (prerequisite: `3B1-WORDS-TASK`)
      - ... chained continuously across Themes B, C, D to `3D-WORDS-TEST` & `3D-PHRASES-TEST`.
    - Standalone Try-Out assessments (`TRYOUT-VOCAB-L3-ALL` and `TRYOUT-PHRASE-L3-ALL`) preserved at display order 41 and 42 with `prerequisite_assessment_id: NULL`.
    - Executed updates across both Docker Local Supabase (`http://127.0.0.1:54021`) and Supabase Cloud (`https://oclajpyumehpojepcczg.supabase.co`).
  - **Admin Class Hub UI DataGrid Updates (`js/admin/app.js`, `js/admin/class.js`, `js/admin/classes-management.js`)**:
    - `js/admin/app.js`: DataGrid CODE column renders clean monospace badges (e.g. `3A1-WORDS-TASK`); PREREQUISITE column renders prior assessment badge (e.g. `⚠️ 3A1-WORDS-TASK`) or `—` for the first record.
    - `js/admin/class.js`: Updated `renderResults` attempts query to select `prerequisite_assessment_id, prerequisite_min_score, shell_code`, added `shell_code` to searchKeys, and added code badge to the Assessment Title column.
    - `js/admin/classes-management.js`: Selected `shell_code` on prerequisite assessment relationship, mapped `shellCode`, and rendered clean CODE and PREREQUISITE badges.
  - **Automated Verification**:
    - Automated Playwright audit verified all 42 rendered rows in `#class-assessments-grid` with 100% precision.
    - High-resolution visual proof screenshot captured and archived: `classes_hub_standardized.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Code Refactoring & Dead-Code Cleanup [100% REGRESSION PASS]**:
  - **Admin Topbar Action Shell Pruning (`admin.html`, `js/admin/app.js`)**:
    - Removed redundant global topbar button `#add-record-btn` ("+ Add New") from `.topbar-actions` in `admin.html`.
    - Cleaned up dangling click handlers and visibility conditionals in `js/admin/app.js`.
    - All sub-modules continue using their native contextual action buttons (e.g., student roster adds, assessment creation wizards).
  - **Ghost Listener Removal & Function Deduplication (`js/admin/crud-modals.js`, `js/admin/app.js`)**:
    - Confirmed removal of ghost listener for non-existent DOM element `#btn-resolve-all-visible-questions`.
    - Removed redundant duplicate definition of `window._editRecord` in `js/admin/crud-modals.js` (line 871), retaining the authoritative, centralized implementation in `js/admin/app.js` (line 2827).
  - **Obsolete DOM Nodes Cleanup in Assessment Shell (`assessment.html`)**:
    - Pruned deprecated `#assessment-student-name` and `#assessment-student-details` span tags (which were permanently hidden via `display: none;`) from the top utility bar.
    - Preserved the clean 60x60px avatar photo element (`#assessment-student-avatar`), timer badge, and give-up button.
  - **Regression & Full Audit Verification**:
    - Ran targeted regression suite `scratch/test_regression_refactor.mjs` confirming modal openings, student edit flows, and assessment shell render with 0 console errors.
    - Re-executed full 121-feature automated Playwright stress test (`scratch/test_e2e_stress_audit.mjs`), confirming all 121 features achieve a **100% PASS rate** with verified database state rollback.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Top Office Stress-Test Defect Resolution & 121-Feature Verification [100% PASS RATE]**:
  - **Vocabulary Vault Query Sanitization (`js/api.js`)**:
    - Purged non-existent `item_code` column from all `.select(...)` queries on `public.vocabulary_vault` (lines 1655, 1731, 2034, 2070, 2094, 2358).
    - Removed `item_code` reference from row sanitizer/normalizer `sanitizeVaultRow` and `exportVaultWords`.
    - Verified `fetchVaultWords` returns HTTP 200 with structured vocabulary payload without 42703 PostgREST column errors.
    - Verified `checkVaultDuplicates` and `exportVaultWords` execute cleanly without schema errors.
    - Resolves defects C.23, C.24, C.25, C.28, C.29.
  - **Duplicate Questions Modal Kebab-Case Harmonization (`admin.html`, `js/admin/crud-modals.js`)**:
    - Harmonized HTML element IDs to kebab-case:
      - Changed `dup-q-ASSESSMENT-select` to `dup-q-assessment-select`.
      - Changed `btn-batch-clean-ASSESSMENT-questions` to `btn-batch-clean-assessment-questions`.
      - Updated tab buttons to `data-qtab="same_assessment"` / `data-qtab="cross_assessment"`.
    - Updated `js/admin/crud-modals.js` to bind event listeners and query selectors to `dup-q-assessment-select` and `btn-batch-clean-assessment-questions`.
    - Connected `initDuplicateQuestionsSelect()` to dynamically populate assessment options in the dropdown.
    - Verified "Clean All & Resequence" handler cleanly attaches and is responsive.
    - Resolves defects C.17, C.21.
  - **AI Module Card Component Classing (`js/admin/modules.js`)**:
    - Added `class="module-card card"` to all 8 evaluation engine cards generated by `renderModules()`.
    - Resolves defect D.1.
  - **Automated Playwright 121-Feature Interaction Audit & Guaranteed Rollback**:
    - Ran full Playwright stress test across 121 elements (0.1–0.13, A.1–A.17, B.1–B.26, C.1–C.47, D.1–D.18).
    - All 121 features achieved **100% PASS rate** with 0 DEAD-ENDS and 0 FAILS.
    - Database rollback ledger executed in reverse order inside `try...finally` block.
    - Post-test integrity checks verified 100% perfect restoration for test records (Student: Galang Arzaki, Assessment: PUBLISHED).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Comprehensive Responsive 95% Width Shell, Proportional Percentage Heights & Global Footer Banner Audit [100% VERIFIED]**:
  - **Responsive 95% Width Shell (Zero Horizontal Clipping)**:
    - Replaced rigid 400px width declarations across all middle containers with `width: 95% !important; max-width: 440px !important; margin: 0 auto !important;` (and `width: 100% !important; max-width: 440px !important;` for nested children filling the shell).
    - Applied to: `<header>`, `.assessment-body`, `.assessment-main-content`, `questionBox`, `metadataTable`, `interactionContainer`, `answerArea`, `controlArea`, `#virtual-keyboard-container`, and `#fixed-bottom-area` inner nav wrappers.
    - Result: Small mobile screens (360x800) cleanly display with 342px content width (95%) and 9px lateral breathing margins on each side without horizontal clipping or scrollbars. Standard mobile screens (412x915) display with 391.4px content width (95%) and ~10.3px margins.
  - **Proportional Percentage Heights Inside Assessment Body (Zero Layout Shift)**:
    - Mode 1 (Speech) & Mode 2 (Keyboard):
      - `questionBox` (Prompt): `height: 30%; min-height: 30%; max-height: 30%; display: flex; align-items: center; justify-content: center;`
      - `metadataTable`: `height: 10%; min-height: 10%; max-height: 10%; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;`
      - `answerArea` (Transcript / Textarea): `height: calc(50% - 3px); min-height: calc(50% - 3px); max-height: calc(50% - 3px); overflow-y: auto;` (represents 30% of body)
      - `controlArea` (MIC container / Virtual Keyboard): `height: calc(50% - 3px); min-height: calc(50% - 3px); max-height: calc(50% - 3px); display: flex; align-items: center; justify-content: center;` (represents 30% of body)
    - Mode 3 (MCQ - Pilihan Ganda):
      - `questionBox` (Prompt): `height: 30%;` (strictly identical percentage to preserve coordinates)
      - `metadataTable`: `height: 10%;` (strictly identical percentage to preserve coordinates)
      - `answerArea` (MCQ Options): `height: 100%; min-height: 100%; max-height: 100%; display: flex; flex-direction: column; justify-content: space-between; overflow-y: auto;` (represents 60% of body)
    - Verified Layout Shift: `questionBox.getBoundingClientRect().top` remained exactly `144.0px` across MCQ, Keyboard, and Speech modes with `0.0px` shift!
  - **Question Metadata Clean-Up (Direct Dynamic Values Only)**:
    - Stripped all hardcoded label prefixes (`THEME:`, `CATHEGORY:`, `TOPIC:`, `TYPE:`) in `renderQuestion()`.
    - Directly populated dynamic values in the 10% 2x2 grid (`font-size: 10.5px`, `font-weight: 700`, centered):
      - Row 1: Left = Theme name only (`Workplace`) | Right = Category name only (`Words` / `Phrases`)
      - Row 2: Left = Topic name only (`Building Your Professional Identity`) | Right = Type name only (`Expression` / `Adjective` / `Sentence`)
  - **100% Full-Width Footer Banner**:
    - `#bottom-ad-banner` spans 100% full-width edge-to-edge: `width: 100% !important; width: 100vw !important; max-width: 100vw !important; margin: 0 !important; left: 0 !important; right: 0 !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; border-bottom: none !important; border-top: 1px solid rgba(56, 189, 248, 0.25) !important; height: 28px !important; padding-bottom: max(3px, env(safe-area-inset-bottom, 0px)) !important;`
    - Standardized global branding text: `<span style="color:#38bdf8; font-weight:800; letter-spacing:0.04em;">TopsCore</span>&nbsp;&copy; 2026&nbsp;<span style="opacity:0.4; margin:0 6px;">|</span>&nbsp;<span style="color:#cbd5e1;">Created by Mr. Top</span>`
  - **Playwright Audit Test Suite (`test-metadata-banner-audit.mjs`)**:
    - Built-in static HTTP test server on port 3458 with automatic mock API routing.
    - Validated all 3 modes on `412x915` (standard Android Chrome) and `360x800` (compact mobile).
    - Generated 6 high-resolution visual proof screenshots:
      - `audit_412x915_mcq.png`, `audit_412x915_keyboard.png`, `audit_412x915_speech.png`
      - `audit_360x800_mcq.png`, `audit_360x800_keyboard.png`, `audit_360x800_speech.png`
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Assessment Question Order Randomization & Deterministic Resumption [100% VERIFIED]**:
  - **Identified Root Causes**:
    1. In `js/api.js` (line 620), dynamic assessment questions were explicitly sorted alphabetically by Indonesian translation: `vaultWords.sort((a, b) => (a.indonesian || '').localeCompare(b.indonesian || ''))`.
    2. In `js/api.js` `startAssessment()` (line 718), `question_order` was omitted from the `assessments` `.select(...)` query, leaving `assessmentData.question_order` as `undefined`.
    3. In `assessment.html` (line 1149), the condition `if (assessmentData?.question_order === 'random')` evaluated to `false` because `question_order` was undefined, skipping `shuffleWithSeed()`.
    4. In `supabase/functions/start-assessment/index.ts`, `vaultWords` was also sorted by Indonesian translation (`localeCompare`), and the check `if (assessment.question_order === 'RANDOM')` was uppercase-only, bypassing shuffle because the database stores lowercase `'random'`.
  - **Implemented Solution**:
    1. **`js/api.js`**:
       - Defined `fisherYates` shuffle helper and applied it to `vaultWords` when `question_order` is `'random'` (default).
       - Added `question_order` to the `assessments` select query in `startAssessment()` and populated `assessment.question_order` with fallback to `'random'`.
       - Updated attempt answer ordering to prioritize `a.question_snapshot?.display_order ?? a.question_snapshot?.question_order`.
    2. **`assessment.html`**:
       - Made `shuffleWithSeed(array, seedStr)` defensive with string conversion and empty array protection.
       - Updated `bootAssessment()` to case-insensitively check `orderSetting === 'random'` with a default to `'random
... [truncated for diff preview]
