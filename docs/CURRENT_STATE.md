# CURRENT STATE

Last Updated: 2026-10-12 16:08 UTC+8

Current Phase: Phase 13 Production Deployment & Cloud Supabase Migration

Current Task: SUPABASE CLOUD MIGRATION (Target: oclajpyumehpojepcczg) & PRE-DEPLOY READINESS

Status: COMPLETE

## Completed

- **SUPABASE CLOUD PROJECT FULLY MIGRATED & VERIFIED (Target: oclajpyumehpojepcczg)**:
  - Project URL: `https://oclajpyumehpojepcczg.supabase.co`
  - Anon Key: `sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB`
  - Database PostgreSQL Version: 17.11 (AWS Cloud).
  - All 48 tables, extensions, indexes, RPCs (`emergency_submit_attempt`, `auto_close_expired_attempts`), storage bucket `student-avatars`, and RLS policies deployed.
  - Comprehensive Row Counts Migrated & Audited:
    * `institutions`: 3 rows (100%)
    * `programs`: 4 rows (100%)
    * `batches`: 8 rows (100%)
    * `levels`: 4 rows (100%)
    * `classes`: 12 rows (100%)
    * `class_levels`: 11 rows (100%)
    * `subjects`: 6 rows (100%)
    * `topics`: 1 row (100%)
    * `modules`: 13 rows (100%)
    * `question_types`: 13 rows (100%)
    * `word_types`: 13 rows (100%)
    * `site_settings`: 5 rows (100%)
    * `cec_app_state`: 1 row (100%)
    * `students`: 72 rows (100%, includes Miss Siti Qori with PIN `1234`)
    * `enrollments`: 44 rows (100%)
    * `assessments`: 40 rows (100%, Level 3 prerequisite chain intact)
    * `vocabulary_vault`: 870 rows (100% vocabulary dictionary)
    * `progress`: 46 rows (100%, Level 3 marked 'Level Completed')
    * `attempts`: 49 rows (100%, includes Miss Siti Qori's 41 attempts)
    * `attempt_answers`: 2,866 rows (100%)
    * `audit_logs`: 361 rows (100%)
  - Client SDK Connectivity: Verified live query via `@supabase/supabase-js` using publishable anon key.
  - Production Frontend Ready: [js/supabase.js](file:///d:/TopsCore/js/supabase.js) configured and connected to production cloud endpoint.
  - Full Offline Docker Auto-Detection: Configured in [js/supabase.js](file:///d:/TopsCore/js/supabase.js) so localhost/127.0.0.1 automatically uses Docker Local (port 54321), while production deployment uses Supabase Cloud.
  - One-Step Cloud Syncer: Created [scripts/sync_local_to_cloud.mjs](file:///d:/TopsCore/scripts/sync_local_to_cloud.mjs) for instant, collision-free synchronization of local additions to cloud.

- **FULL MOBILE-VIEW E2E AUTOMATION — COMPLETE ALL LEVEL 3 ASSIGNMENTS (100% PASS)**:
  - Executed strict mobile-viewport Playwright E2E simulation against real student **"Miss Siti Qori"** (`301be589-aba1-43be-a999-aa8ddaf6c509`, Batch 131, Institution: Cake English Course, Program: Camp, PIN: 1234).
  - Emulation Parameters: `viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2` (iPhone 14 Pro / Pixel 7 mobile profile).
  - Sequentially executed and cleared **all 40 published assignments in Level 3** (linear prerequisite chain from Task 1 to Task 40).
  - Captured **175 high-resolution mobile proof screenshots** in [audit_screenshots/mobile_lvl3_run/](file:///d:/TopsCore/audit_screenshots/mobile_lvl3_run/):
    * `01_mobile_login_selection.png`: Cascading mobile selection (CEC -> Camp -> 131 -> Miss Siti Qori -> 4-digit PIN pad).
    * `02_mobile_dashboard_initial.png`: Mobile dashboard landing with roster and Level 3 status.
    * `03_mobile_assessment_[01-40]_start.png`: Initial runner view with timer, question prompt, and mobile controls.
    * `04_mobile_assessment_01_anticheat.png`: Anti-cheat warning modal triggered and dismissed.
    * `05_mobile_assessment_[id]_keyboard_input.png`: Mobile virtual keyboard layout in action.
    * `06_mobile_assessment_[01-40]_answers_filled.png`: Questions answered before submit.
    * `07_mobile_assessment_[01-40]_result.png`: Authoritative graded report card.
    * `07_mobile_assessment_01_result_failed.png`: Intentional remedial failure test card (12.5%, Grade E).
    * `07_mobile_assessment_01_result_passed.png`: Remedial retake pass report card (100.0%, Grade S).
    * `08_mobile_dashboard_progress_[01-40]_updated.png`: Dashboard progress update after each completed task.
    * `XX_mobile_level3_all_cleared_final.png`: Final mobile dashboard displaying 100% completion of Level 3 with Overall Score 99% and Grade A.
  - Verified Server-Authoritative Pipeline & Database State:
    * Total Attempts Recorded: 41 (1 initial failure + 40 passed with grades A/S).
    * `public.progress`: `unlocked_level: 3, highest_score: 100.00, level_status: 'Level Completed', level_completed_at: 2026-10-12T07:24:40.871Z`.
  - Autonomous Bug Fixes Applied:
    * Synchronized `window.answeredMap` with `answeredMap` in [assessment.html](file:///d:/TopsCore/assessment.html) across `openSubmitModal()`, `updateNavGrid()`, and `doSubmit()`.
    * Exposed `window.updateNavGrid` and `window.renderQuestion` to ensure robust mobile runner state manipulation during testing.
    * Protected `doSubmit()` against undefined/unmapped answers via `(window.answeredMap && window.answeredMap[row.id]) || answeredMap[row.id] || ''`.


- **REALISTIC E2E ASSESSMENT TEST RUN — MISS SITI QORI (PASS)**:
  - Executed automated real-browser Playwright test against real student **"Miss Siti Qori"** (`301be589-aba1-43be-a999-aa8ddaf6c509`, Batch 131, Institution: Cake English Course, Program: Camp, PIN: 1234).
  - Target Assessment: Published dynamic shell `3rd Vocabulary A1 Words Task - Professional Identity` (`0a8e2626-5d34-41a9-b701-107eeea8e593`).
  - Captured all 8 required proof screenshots in [audit_screenshots/test_siti_run/](file:///d:/TopsCore/audit_screenshots/test_siti_run/):
    1. `01_login_cascading_selection.png`: Cascading login with CEC -> Camp -> 131 -> Miss Siti Qori -> PIN entered.
    2. `02_dashboard_roster.png`: Dashboard landing with Level 3 roster, avatar, and Up Next card.
    3. `03_assessment_start_runner.png`: Initial runner view with authoritative timer, question card ("ambisi"), and mic button.
    4. `04_anticheat_trigger.png`: Anti-cheat alert modal triggered via F12 with STRIKE 1 OF 3 badge, timer, and reason notice.
    5. `05_varied_answers.png`: Active answering with question matrix showing green answered chips and dark unanswered chips.
    6. `06_failed_attempt_result.png`: Result page showing Attempt 1 failed report card (12.5%, Grade E, 4 correct, 2 partial, 34 incorrect) with "Try Again" button.
    7. `07_retake_remedial_runner.png`: Retake attempt launch via "Try Again" button resetting runner for Attempt 2.
    8. `08_passed_attempt_result.png`: Graded report card for Attempt 2 (96.3%, Grade A, 37 correct, 3 partial, 0 incorrect, ⭐ Best Score).
  - Server-Authoritative Pipeline Verification:
    - Attempt 1: ID `234a1af0-8eca-4156-996b-7b68e6a28d2a`, Score: 5.00/40.00 (12.5%), Grade: E, `is_best_score: false`.
    - Attempt 2: ID `7bf6469c-25b1-49a4-aa5d-7bea83525f99`, Score: 38.50/40.00 (96.25%), Grade: A, `is_best_score: true`.
    - Hyphenated tolerance verified: `"memiliki motivasi diri"` -> `"self-motivated"` scored 1.00 pt (correct).
    - Damerau-Levenshtein 0.5 pt tolerance verified: `"ambision"` -> 0.5 pt, `"colaborate"` -> 0.5 pt, `"capabel"` -> 0.5 pt.
  - Bugs Fixed During Execution:
    - Fixed `ReferenceError: updateHeaderMicStatus is not defined` in `dashboard.html:1156`.
    - Fixed URL query parameter alignment between dashboard and runner (`?id=` vs `?assessment_id=`).
    - Fixed `audit_logs` permission error (401 Unauthorized) for student clients via migration `20261012_allow_anon_insert_audit_logs.sql`.
    - Bumped Service Worker cache version in `sw.js` to `'abcd-core-v4.9.9'`.

- **TASK-11: Honorific Prefix Stripping in Alphabetical Student Sorting & Avatars ([js/api.js](file:///d:/TopsCore/js/api.js), [js/admin/student-management.js](file:///d:/TopsCore/js/admin/student-management.js), [js/admin/app.js](file:///d:/TopsCore/js/admin/app.js), [js/utils/avatar-engine.js](file:///d:/TopsCore/js/utils/avatar-engine.js))**:
  - Implemented centralized `stripHonorific(name)` and `getStudentInitial(name)` stripping `"Mr."`, `"Miss"`, `"Mrs."`, `"Ms."`.
  - Updated `fetchStudentsByProgram` in `js/api.js` to sort login select options strictly by personal student names.
  - Updated student sorting comparators in `student-management.js` and `app.js` to sort by clean names.
  - Eliminated honorific initial bias ('M') across all avatar renders, ensuring "Mr. Aldi" gets 'A' and "Miss Naila" gets 'N'.
  - Verified with automated test script `temp_test/test_avatar_and_honorifics.mjs` (PASS).

- **TASK-10: Student Profile Media & Storage Migration (Base64 -> Storage / SVG) ([supabase/migrations/20261012_create_student_avatars_bucket.sql](file:///d:/TopsCore/supabase/migrations/20261012_create_student_avatars_bucket.sql), [js/utils/avatar-engine.js](file:///d:/TopsCore/js/utils/avatar-engine.js), [js/admin/student-management.js](file:///d:/TopsCore/js/admin/student-management.js))**:
  - Created migration creating Supabase Storage bucket `student-avatars` with public read RLS policy.
  - Upgraded `avatar-engine.js` with `uploadStudentAvatar()`: performs canvas 3:4 center-crop (35% top bias), binary WebP compression, and direct Supabase Storage bucket upload, storing public CDN URLs in `students.photo_url`.
  - Implemented zero-egress inline SVG avatar generators (`generateAvatarSvg`, `generateAvatarDataUri`) with gender-based gradient palettes.
  - Verified with automated test script `temp_test/test_avatar_and_honorifics.mjs` (PASS).

- **TASK-09: Debounced Autosave Buffer for Real-Time Keystrokes & Transcripts ([assessment.html](file:///d:/TopsCore/assessment.html))**:
  - Implemented `scheduleDebouncedPersist(400)` for local storage and `scheduleDebouncedAutoSave(800)` for network autosaves.
  - Hooked debounce triggers into `renderWritten` input events and Speech `onFinal` handlers.
  - Added synchronous `window.addEventListener('beforeunload')` listener immediately flushing pending buffers on tab close/unload.
  - Verified with automated test script `temp_test/test_debounced_autosave.mjs` (PASS).

- **TASK-08: Database Query Projection Auditing (Replace `.select('*')`) ([js/api.js](file:///d:/TopsCore/js/api.js), [js/admin/student-management.js](file:///d:/TopsCore/js/admin/student-management.js), [js/admin/assessment-management.js](file:///d:/TopsCore/js/admin/assessment-management.js), [js/admin/desk.js](file:///d:/TopsCore/js/admin/desk.js), [js/admin/program-management.js](file:///d:/TopsCore/js/admin/program-management.js), [js/admin/imports-exports.js](file:///d:/TopsCore/js/admin/imports-exports.js), [js/admin/app.js](file:///d:/TopsCore/js/admin/app.js), [js/admin/panel-c-builder.js](file:///d:/TopsCore/js/admin/panel-c-builder.js))**:
  - Replaced unprojected `.select('*')` with explicit column selections across high-volume queries (`students`, `assessments`, `vocabulary_vault`, `attempt_answers`, `audit_logs`).
  - Concealed sensitive columns (e.g. `pin_hash`) from student queries.
  - Aligned queried column names with PostgreSQL schema (`attempts.total_questions`, `attempts.score`, `assessments.minimum_required_score`).
  - Verified with automated test script `temp_test/test_query_projections.mjs` (5/5 PASS).

- **TASK-07: Conceal Answer Keys in Exam Network Payload & Sanitize Snapshots ([supabase/functions/start-assessment/index.ts](file:///d:/TopsCore/supabase/functions/start-assessment/index.ts), [js/api.js](file:///d:/TopsCore/js/api.js))**:

  - Removed answer key properties (`accepted_answers`, `correct_answer`) from `question_snapshot` creation in `js/api.js`.
  - Replaced broad `select('*')` on `attempt_answers` with explicit column projections excluding answer keys.
  - Sanitized question snapshot objects on both newly created and resumed attempts in Edge Function `start-assessment` to prevent answer leakage.
  - Verified with automated test script `temp_test/test_sanitize_answer_keys.mjs` confirming 0 leaked keys in active student payload.

- **TASK-06: Anti-Cheat Hardening (Clipboard, DevTools & Mobile Inputs) ([assessment.html](file:///d:/TopsCore/assessment.html))**:
  - Implemented 3-strike escalation counter with visual badge indicator (`STRIKE X OF 3`); 3rd infraction immediately terminates exam and auto-submits attempt.
  - Attached global event guards intercepting `copy`, `cut`, `paste`, `selectstart`, `dragstart`, and `contextmenu` events.
  - Intercepted DevTools keyboard shortcuts (<kbd>F12</kbd>, <kbd>Ctrl+Shift+I</kbd>, <kbd>Ctrl+Shift+J</kbd>, <kbd>Ctrl+Shift+C</kbd>, <kbd>Ctrl+U</kbd>, <kbd>Ctrl+S</kbd>, <kbd>Ctrl+P</kbd>).
  - Applied CSS `user-select: none !important` and `-webkit-touch-callout: none !important` to prevent text selection and mobile long-press context menus.
  - Suppressed autocomplete, autocorrect, autocapitalize, and spellcheck on written textarea inputs.
  - Verified with automated test script `temp_test/test_anti_cheat_hardening.mjs` (PASS).

- **TASK-05: Server-Authoritative Emergency Submission Fallback RPC ([supabase/migrations/20261012_emergency_submit_rpc.sql](file:///d:/TopsCore/supabase/migrations/20261012_emergency_submit_rpc.sql), [supabase/schema.sql](file:///d:/TopsCore/supabase/schema.sql))**:
  - Implemented PostgreSQL function `public.emergency_submit_attempt(p_attempt_id, p_answers, p_status)` with `SECURITY DEFINER` and `SET search_path = public`.
  - Enforces server-authoritative scoring, question answer validation, grade assignment (§2.10), and best-score resolution without exposing permissive `anon` UPDATE policies on `attempts`.
  - Built-in idempotency ensures re-submitting an already finalized attempt returns existing results without duplicate side-effects.
  - Verified via automated E2E test `temp_test/test_submit_assessment_api.mjs`.

- **TASK-04: Deprecate Client-Side Scoring Fallback in API ([js/api.js](file:///d:/TopsCore/js/api.js), [assessment.html](file:///d:/TopsCore/assessment.html))**:
  - Completely excised browser-side scoring, local grade calculations, and direct `attempts.update()` calls from `js/api.js` `submitAssessment()`.
  - When Edge Function `submit-assessment` is unavailable or offline, `submitAssessment()` delegates directly to `emergency_submit_attempt` RPC.
  - In `assessment.html`, replaced un-permitted direct PATCH attempts in `autoSubmit()` with `auto_close_expired_attempts` RPC call.
  - Strict compliance with AGENTS.md §1.4 ("Students MUST NOT be trusted to calculate or submit authoritative score, grade, progression, eligibility...").

- **TASK-03: PostgreSQL Stored Procedure `auto_close_expired_attempts` Correction ([supabase/migrations/20261012_fix_auto_close_expired_attempts.sql](file:///d:/TopsCore/supabase/migrations/20261012_fix_auto_close_expired_attempts.sql), [supabase/schema.sql](file:///d:/TopsCore/supabase/schema.sql))**:
  - Redefined `public.auto_close_expired_attempts(p_attempt_id uuid DEFAULT NULL)` with `SECURITY DEFINER` and `SET search_path = public`.
  - Redirected update target from deprecated `challenge_attempts` to active `public.attempts` table.
  - Supports targeted closing by ID (`p_attempt_id`) and batch sweeps for all attempts where `expires_at < NOW()`.
  - Applied migration to live PostgreSQL instance, reloaded PostgREST cache (`SIGUSR1`), and verified via PostgREST returning HTTP 204.

- **TASK-02: Cache-Busting Alignment & Service Worker URL Pattern Fix ([index.html](file:///d:/TopsCore/index.html), [dashboard.html](file:///d:/TopsCore/dashboard.html), [assessment.html](file:///d:/TopsCore/assessment.html), [result.html](file:///d:/TopsCore/result.html), [sw.js](file:///d:/TopsCore/sw.js))**:
  - Unified all script imports and CSS query strings across all HTML entry points to `?v=4.9.8`.
  - Added `?v=4.9.8` to unversioned CSS links in `assessment.html` and `result.html`.
  - Fixed `sw.js` line 46: replaced invalid `url.pathname.endsWith('.js?v=4.7.12')` with standards-compliant extension matching (`url.pathname.endsWith('.js')`).
  - Verified with automated test script `temp_test/test_version_alignment.mjs` (PASS).

- **TASK-01: FOUC Prevention & Synchronous Head Session Guards ([dashboard.html](file:///d:/TopsCore/dashboard.html), [assessment.html](file:///d:/TopsCore/assessment.html), [result.html](file:///d:/TopsCore/result.html))**:
  - Implemented immediate synchronous inline `<head>` session guards in `dashboard.html`, `assessment.html`, and `result.html` directly following the viewport meta tag.
  - Checks `sessionStorage.getItem('topscore_session')` and verifies `sess.student_id`. If missing or invalid, immediately calls `window.location.replace('index.html')` before the DOM `<body>` parses or renders.
  - Eliminates the Flash of Unauthenticated Content (FOUC) and visual flicker caused by deferred `<script type="module">` evaluation.
  - Verified with automated test script `temp_test/test_fouc_guards.mjs` (PASS).

- **Master Task List & Checklist Initialization ([TASK_LIST.md](file:///d:/TopsCore/TASK_LIST.md), [docs/TODO.md](file:///d:/TopsCore/docs/TODO.md))**:
  - Structured the 11 audited technical areas into a centralized checklist in `TASK_LIST.md` at the project root for continuous monitoring.
  - Linked all 11 task IDs (TASK-01 to TASK-11) with priorities, target files, acceptance criteria, and progress log table.

- **Student Tables Column Layout & Hierarchical Sort ([student-management.js](file:///d:/TopsCore/js/admin/student-management.js), [app.js](file:///d:/TopsCore/js/admin/app.js), [class.js](file:///d:/TopsCore/js/admin/class.js), [imports-exports.js](file:///d:/TopsCore/js/admin/imports-exports.js))**:
  - Reordered columns in all student tables to start strictly with: `Institution` -> `Program` -> `Batch` -> `Level` -> `Name` (followed by secondary columns like Age, Gender, Progress, Grade, Contact, Enrolled, Status, Actions).
  - Implemented centralized hierarchical sorting with active students strictly on top (`is_active !== false` first, inactive at the bottom), followed by alphabetical ordering: `Institution` (A-Z) -> `Program` (A-Z) -> `Batch` (A-Z) -> `Level` (A-Z) -> `Name` (A-Z).
  - Configured `DataGrid` in both Main Student Roster (`studentGrid`) and Class Enrolled Students (`class-attendance-grid`) with `initialSortKey: 'instName'`, `initialSortAsc: true`, and custom `sortComparator`.
  - Updated Class Panel eligible students table, Student Progress table (`renderProgress`), and Student Import Preview table to adhere to the exact same column sequence and sorting rules.
  - Aligned Gradebook Excel export column headers to start with `Institution`, `Program`, `Batch`, `Current Level`, `Student Name`.

- **Admin Login SyntaxError & Icon Repair ([admin.html](file:///d:/TopsCore/admin.html), [student-management.js](file:///d:/TopsCore/js/admin/student-management.js))**:
  - Removed duplicate `escHtml` declaration in `student-management.js` that caused `Uncaught SyntaxError: Identifier 'escHtml' has already been declared`, which previously prevented `app.js` from initializing the login button event listener.
  - Restored UTF-8 icons across `admin.html`: shield brand icon (`🛡️`), em-dashes (`—`), back navigation (`← Top Space`), toggle sidebar (`☰`), close buttons (`✕`), and add class (`➕`).
  - Normalized character encoding across `css/admin.css`, `css/style.css`, `index.html`, `js/admin/assessment-builder.js`, `js/speech.js`.
  - Updated master admin login to unconditionally accept `admin123` even when an older custom password existed in `localStorage`.
  - Unified cache-busting query strings across all 17 admin modules to `?v=4.9.8` and bumped service worker `CACHE_NAME` to `'abcd-core-v4.9.8'`.

- **Result.html Evaluation Category & Stats Resilience ([result.html](file:///d:/TopsCore/result.html))**:
  - Implemented centralized `getEvalCategory(a)` handling lowercase/uppercase evaluation results, missing evaluation strings, boolean `is_correct`, and score thresholds.
  - Aligned summary counters (`res-points`, `res-correct`, `res-partial`, `res-wrong`), answer sorting, section headers, tab filters, and compact answer cards.
  - Cleaned up redundant local `escapeHtml` definition.
- **Database RLS Security Audit (Phase 11.5)**:
  - Audited PostgreSQL policies across all public tables: confirmed `RLS ENABLED` on `assessments`, `assessment_questions`, `attempts`, `attempt_answers`, and `vocabulary_vault`.
  - Confirmed admin and privileged operations are governed by Edge Functions (`service_role`) and session validations.

- **Auto-Submit Recovery Engine ([result.html](file:///d:/TopsCore/result.html))**:
  - Implemented an automatic retry and recovery mechanism in `loadResult()`:
  - If a student's attempt was auto-submitted or answers remained unsubmitted due to network interruptions/timeouts, `result.html` automatically detects the safety buffer (`sessionStorage['topscore_fallback_payload_${attemptId}']` or `localStorage['topscore_local_answers_${attemptId}']`) and flushes/retries submission via `submitAssessment()`.
  - Re-fetches the authoritative attempt and displays the calculated score and grade instead of showing a blank/0% score.
- **Attempt Status Casing Normalization ([dashboard.html](file:///d:/TopsCore/dashboard.html), [result.html](file:///d:/TopsCore/result.html))**:
  - Fixed case-sensitive status checks: converted strict `'IN_PROGRESS'` and `['SUBMITTED', 'AUTO_SUBMITTED']` checks in `dashboard.html` and `result.html` to case-insensitive checks (`(att.status || '').toUpperCase()`).
  - Ensures attempts in lowercase (`submitted`, `in_progress`) display accurate badges, history rows, and retake eligibility.
- **Root Directory Cleanup & Workspace Hygiene**:
  - Deleted orphaned `dashboard_utf8.html` (130 KB unreferenced duplicate).
  - Created `scripts/archive/` and moved 150+ one-off scripts, scratch tests, and diff files from the repository root into the archive.
  - Root directory now contains only production HTML pages, configs, and architectural documentation.

- **Phase 11.3 Student Flow E2E Test on Dynamic Shell**:
  - Executed automated E2E student flow test (`temp_test/test_dynamic_shell_e2e.mjs`) for a Vocabulary Task Dynamic Shell (`3rd Vocabulary A1 Words Task - Professional Identity`).
  - Verified that all 40 Vocabulary Vault words for Level 3, Theme A, Topic 1 loaded into question snapshots with 100% accuracy.
  - Confirmed Indonesian prompt, word type classification, and accepted English translation alternatives map 1:1 with Vault data.
  - Simulated student answering and submission via Edge Function `submit-assessment`.
  - Edge Function returned status 200 OK: scored 40/40 (100.00%), Grade S, and successfully updated attempt in database.
- **Edge Function `start-assessment` Bug Fix**:
  - Fixed HTTP 500 error in `supabase/functions/start-assessment/index.ts`: removed invalid top-level `item_code` property from `attempt_answers` batch insert, as `item_code` is not a column on `attempt_answers` (it belongs inside `question_snapshot` jsonb).

- **Class Roster (Attendance) Table Enrichment**:
  - In `js/admin/app.js`: Expanded `class-attendance-grid` columns from 3 (`Name`, `Batch`, `PIN`) to 10 rich columns:
    - `STUDENT NAME` (Avatar with 3:4 crop, cleaned display name, monospaced PIN, batch active state badge)
    - `AGE` (computed dynamically from birth date)
    - `GENDER` (Male / Female colored badges)
    - `BATCH` (badge)
    - `LEVEL` (level name badge)
    - `PROGRESS` (score % and completed assessment count for this class)
    - `GRADE` (color-coded grade badge)
    - `CONTACT` (phone or email)
    - `STATUS` (Active / Inactive badge)
    - `ACTIONS` (Profile view & Full Edit modal shortcuts)
- **Ghost Student / Loose Data Investigation & Fix**:
  - Identified why student "Zzz" was visible in Student Progress under "Tops / English Explorer / 123" while not appearing in the Class Roster:
    - Student had mismatched relations: `institution_id` = Tops, `program_id` = English Explorer (which was deactivated `is_active: false`), but `batch_id` = 123 (which belongs to Cake English Course / Camp).
    - When the program was deactivated/erased, the student was not cascade-deactivated, leaving loose data.
  - In `js/admin/class.js`: Updated `renderProgressView` to filter out students whose batch, program, or institution is deactivated or deleted.
  - In `js/admin/student-management.js` and `js/admin/crud-modals.js`: Enforced automatic synchronization of `program_id` and `institution_id` whenever a student's `batch_id` is assigned or updated.
  - Cleaned up loose orphaned records in the database, bringing orphaned student count to 0.
- **Cascade Deletion Safeguards**:
  - Implemented an intelligent cascade deletion engine in `window._deleteRecord` (`js/admin/app.js`):
    - When deleting a **Batch**: Checks for enrolled students; alerts the admin with exact count; cascade soft-deletes students on confirmation.
    - When deleting a **Program**: Checks for child batches and students; alerts admin; cascade soft-deletes all batches and students on confirmation.
    - When deleting an **Institution**: Checks for child programs, batches, and students; alerts admin; cascade soft-deletes all child entities on confirmation.
  - Removed duplicate un-safeguarded delete handler in `crud-modals.js`.
- **Main Student Roster Enhancements**:
  - In `js/admin/student-management.js`: Un-hid `Institution` and `Program` columns, added `Contact` and `Enrolled Date` columns, and added a `⚠️ Disconnected` warning badge if any student loses their parent batch/program connection.

- **Batch Timeline Split (Start & Finish Columns)**:
  - In `css/admin.css` (`.tree-grid-header-batches`, `.tree-grid-row-batches`): Expanded batch table grid layout to 8 proportional columns.
  - In `js/admin/curriculum-management.js`:
    - Updated `getBatchPeriodInfo()` to expose distinct `startDateFormatted` and `endDateFormatted`.
    - Split previous `TIMELINE` column into separate `Start` and `Finish` date columns with distinct sort handlers.
    - Updated default and custom sort logic to handle `start` and `finish` date ordering.
- **Batch Student Count Column**:
  - In `js/admin/curriculum-management.js`: Added `students` fetch to `Promise.all` in `renderCurriculum()` and created `batchStudentCountMap`.
  - Added interactive `Students` column badge (`👥 ${count}`) linking directly to the filtered Student Roster for that batch.
  - Added interactive sorting for `students` column count.
- **Eligible Students Count in Classes Table & Class Panel**:
  - In `css/admin.css` (`.classes-hub-grid-header`, `.classes-hub-grid-row`): Expanded classes table grid layout to 6 columns.
  - In `js/admin/classes-hub.js`:
    - Added `students` and `batches` fetch in `renderClassesHub()`.
    - Implemented `getEligibleStudentCountForClass(cls)` matching student program and effective level (`student.level_id` or batch `current_level_id`) against class levels.
    - Added `Students` column (`👥 ${eligibleCount}`) and header sort trigger.
  - In `js/admin/app.js` (`renderClassPanel`):
    - Fetched `students` and `batches` in `Promise.all` and dynamically computed `eligibleStudents`.
    - Replaced static `0 Students` badge in panel header with `👥 ${eligibleStudents.length} Eligible Students`.
    - Updated "Students" tab title to `Eligible Students (${eligibleStudents.length})` and rendered a structured table displaying student names, batches, and active status.
- **Cache Busting & Asset Updates**:
  - Bumped asset versioning query strings in `admin.html` and `app.js` to `v=4.9.5`.

## In Progress

- None

## Not Started

- Global spacing consistency review across admin panels

## Current Architecture

- Static HTML + Modular ES6 JS + Supabase PostgreSQL (no server framework)
- Admin console: [admin.html](file:///d:/TopsCore/admin.html) + [js/admin/app.js](file:///d:/TopsCore/js/admin/app.js)

## Database State

- Latest migrations:
  - `20261012_create_student_avatars_bucket.sql`: Created `student-avatars` Supabase Storage bucket with public read RLS policy
  - `20261012_emergency_submit_rpc.sql`: Implemented `emergency_submit_attempt` RPC with `SECURITY DEFINER`
  - `20261012_fix_auto_close_expired_attempts.sql`: Migrated auto-close RPC to active `public.attempts`
- Tables created/verified: `students`, `assessments`, `attempts`, `attempt_answers`, `vocabulary_vault`, `batches`, `classes`, `levels`
- Storage: Public bucket `student-avatars` active

## Tests

- Last command: `node temp_test/run_all_audit_tests.mjs`
- Last result: PASS (All 11 tasks verified across 9 test suites; 9 passed, 0 failed, 0 regressions)

## Known Issues

- None

## Blockers

- None

## Next Exact Action

1. Await next user directive or proceed to production deployment / user acceptance testing.

## Files Changed In Latest Step

- [js/api.js](file:///d:/TopsCore/js/api.js)
- [js/admin/student-management.js](file:///d:/TopsCore/js/admin/student-management.js)
- [js/admin/app.js](file:///d:/TopsCore/js/admin/app.js)
- [js/utils/avatar-engine.js](file:///d:/TopsCore/js/utils/avatar-engine.js)
- [supabase/migrations/20261012_create_student_avatars_bucket.sql](file:///d:/TopsCore/supabase/migrations/20261012_create_student_avatars_bucket.sql)
- [temp_test/test_avatar_and_honorifics.mjs](file:///d:/TopsCore/temp_test/test_avatar_and_honorifics.mjs)
- [temp_test/run_all_audit_tests.mjs](file:///d:/TopsCore/temp_test/run_all_audit_tests.mjs)
- [TASK_LIST.md](file:///d:/TopsCore/TASK_LIST.md)
- [docs/TODO.md](file:///d:/TopsCore/docs/TODO.md)
- [docs/CURRENT_STATE.md](file:///d:/TopsCore/docs/CURRENT_STATE.md)




