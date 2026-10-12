# TOPSCORE LMS — AUDIT REMEDIATION TASK LIST

> **Master Execution Checklist:** Generated from the comprehensive architectural audit in `TOPSCORE_SYSTEM_AUDIT_DETAILED.md`.  
> **Status:** READY FOR STEP-BY-STEP EXECUTION  
> **Rule:** Tackle tasks strictly one by one. Check off items (`- [x]`) upon test verification and state log updates.

---

## 📋 REMEDIATION MASTER TRACKER

- [x] **TASK-01: FOUC Prevention & Synchronous Head Session Guards**
  - **Priority:** HIGH
  - **Area:** 8 (Session Safety & Layout Shifts)
  - **Files:** `dashboard.html`, `assessment.html`, `result.html`
  - **Objective:** Add an immediate synchronous inline `<head>` guard that verifies `sessionStorage` and redirects unauthenticated visitors before the `<body>` parses or renders, permanently eliminating Flash of Unauthenticated Content (FOUC).
  - **Acceptance Criteria:** Loading protected pages without a session redirects instantly with 0ms visual flicker of protected layout.
  - **Result:** ✅ COMPLETED (Synchronous inline guards placed right after viewport meta; verified with test script)

- [x] **TASK-02: Cache-Busting Alignment & Service Worker URL Pattern Fix**
  - **Priority:** HIGH
  - **Area:** 7 (Cache Synchronization)
  - **Files:** `index.html`, `dashboard.html`, `assessment.html`, `result.html`, `sw.js`
  - **Objective:**
    1. Unify all script imports and CSS query strings across all pages to `?v=4.9.8`.
    2. Add `?v=4.9.8` to unversioned CSS links in `assessment.html` and `result.html`.
    3. Fix `sw.js` line 46: replace invalid `url.pathname.endsWith('.js?v=4.7.12')` with standards-compliant extension matching (`url.pathname.endsWith('.js')`).
  - **Acceptance Criteria:** Browser network tab registers consistent version query strings across all entry points; Service Worker correctly caches and serves updated assets.
  - **Result:** ✅ COMPLETED (All CSS & JS imports across all 5 HTML entry points aligned to `?v=4.9.8`; `sw.js` URL pattern fixed; verified with `test_version_alignment.mjs`)

- [x] **TASK-03: PostgreSQL Stored Procedure `auto_close_expired_attempts` Correction**
  - **Priority:** HIGH
  - **Area:** 3 (Database & Stored Procedures)
  - **Files:** `supabase/migrations/20261012_fix_auto_close_expired_attempts.sql`, `supabase/schema.sql`
  - **Objective:** Redefine `public.auto_close_expired_attempts(p_attempt_id uuid DEFAULT NULL)` to target the active `public.attempts` table (instead of deprecated `challenge_attempts`), evaluate `expires_at < NOW()`, set `status = 'auto_submitted'`, and support both batch sweeps and single-attempt closing.
  - **Acceptance Criteria:** Calling `/rest/v1/rpc/auto_close_expired_attempts` via PostgREST succeeds with HTTP 200/204 and updates expired attempts in `public.attempts`.
  - **Result:** ✅ COMPLETED (Created migration `20261012_fix_auto_close_expired_attempts.sql` with `SECURITY DEFINER`, applied to live PostgreSQL, updated `schema.sql`, tested via PostgREST with 204 success for both targeted attempt ID and batch sweep)

- [x] **TASK-04: Deprecate Client-Side Scoring Fallback in API**
  - **Priority:** CRITICAL
  - **Area:** 2 (Server-Authoritative Security)
  - **Files:** `js/api.js` (Lines 746–830), `assessment.html`
  - **Objective:** Completely remove client-side scoring, grade calculation, and direct database updates from `submitAssessment()` fallback path, enforcing strict compliance with AGENTS.md §1.4.
  - **Acceptance Criteria:** Client never calculates scores or updates `attempts.grade`/`attempts.score` directly; all scoring is strictly governed by server-side Edge Functions or database RPCs.
  - **Result:** ✅ COMPLETED (Removed browser-side evaluation/grading and direct attempts UPDATE calls from `js/api.js`; replaced with server-authoritative RPC delegation; updated `assessment.html` auto-submit fallback)

- [x] **TASK-05: Server-Authoritative Emergency Submission Fallback RPC**
  - **Priority:** CRITICAL
  - **Area:** 8 (RLS & Emergency Fallback)
  - **Files:** `supabase/migrations/20261012_emergency_submit_rpc.sql`, `js/api.js`, `assessment.html`
  - **Objective:** Implement a dedicated PostgreSQL function `public.emergency_submit_attempt(p_attempt_id uuid, p_answers jsonb)` defined with `SECURITY DEFINER`. Allow student sessions to reliably push emergency submissions even if Edge Functions are unreachable, without granting permissive `anon` UPDATE policies on `attempts`.
  - **Acceptance Criteria:** Emergency submissions succeed through PostgREST under `anon` role and record answers securely without RLS rejection.
  - **Result:** ✅ COMPLETED (Implemented `public.emergency_submit_attempt` with `SECURITY DEFINER`, applied migration to PostgreSQL, updated `schema.sql`, verified idempotency and scoring accuracy via automated E2E test)

- [x] **TASK-06: Anti-Cheat Hardening (Clipboard, DevTools & Mobile Inputs)**
  - **Priority:** MEDIUM
  - **Area:** 1 (Anti-Cheat System Integrity)
  - **Files:** `assessment.html`
  - **Objective:**
    1. Attach global event listeners blocking `copy`, `cut`, `paste`, `selectstart`, `dragstart`.
    2. Intercept <kbd>F12</kbd>, <kbd>Ctrl+Shift+I</kbd>, and DevTools shortcuts.
    3. Implement a 3-strike escalation counter terminating the attempt on the 3rd infraction.
    4. Apply `user-select: none`, `-webkit-touch-callout: none`, and `tabindex="-1"` on written input elements to suppress mobile selection handles.
  - **Acceptance Criteria:** Copy/pasting is blocked; DevTools shortcuts trigger strike warnings; mobile long-press does not show native copy menus.
  - **Result:** ✅ COMPLETED (Implemented 3-strike escalation counter with visual badge, global copy/cut/paste/contextmenu listeners, F12/Ctrl+Shift+I interception, and CSS touch-callout/user-select suppression)

- [x] **TASK-07: Conceal Answer Keys in Exam Network Payload & Sanitize Snapshots**
  - **Priority:** HIGH
  - **Area:** 4 (Egress & Exam Integrity)
  - **Files:** `supabase/functions/start-assessment/index.ts`, `js/api.js`
  - **Objective:** Strip `accepted_answers_snapshot` and `correct_answer` from the JSON payload *on the server* before returning question rows to the student browser during active exam startup.
  - **Acceptance Criteria:** Inspecting PostgREST / Edge Function network responses reveals zero answer keys in active exam JSON.
  - **Result:** ✅ COMPLETED (Stripped `accepted_answers` and `correct_answer` from `question_snapshot` creation in `js/api.js`, sanitized returned `answers` array in `start-assessment` Edge Function for both new and resumed attempts; verified 0 key leaks with test)

- [x] **TASK-08: Database Query Projection Auditing (Replace `.select('*')`)**
  - **Priority:** MEDIUM
  - **Area:** 5 (Performance & Egress Optimization)
  - **Files:** `js/api.js`, `js/admin/student-management.js`, `js/admin/assessment-management.js`, `js/admin/desk.js`, `js/admin/program-management.js`, `js/admin/imports-exports.js`, `js/admin/app.js`, `js/admin/panel-c-builder.js`
  - **Objective:** Audit and replace unprojected `.select('*')` calls on high-volume tables (`students`, `assessments`, `vocabulary_vault`, `attempt_answers`, `audit_logs`) with explicit column selections.
  - **Acceptance Criteria:** Roster queries download only essential profile columns, reducing payload size by up to 80% and concealing sensitive columns (`pin_hash`).
  - **Result:** ✅ COMPLETED (Projected explicit columns across all high-volume tables; eliminated `pin_hash` leak in student queries; fixed schema column alignment for attempts and assessments; verified 0 leaks and 5/5 pass via `test_query_projections.mjs`)

- [x] **TASK-09: Debounced Autosave Buffer for Real-Time Keystrokes & Transcripts**
  - **Priority:** MEDIUM
  - **Area:** 6 (Client I/O Optimization)
  - **Files:** `assessment.html`
  - **Objective:** Implement a 400ms debounced write-ahead buffer on `input` events and Speech `onFinal` to prevent data loss on sudden browser terminations while eliminating main-thread blocking synchronous `localStorage.setItem` calls.
  - **Acceptance Criteria:** Typing triggers smooth debounced local storage writes; simulated tab crash retains typed input on recovery.
  - **Result:** ✅ COMPLETED (Implemented `scheduleDebouncedPersist(400)`, `scheduleDebouncedAutoSave(800)`, and `beforeunload` synchronous buffer flush; verified with `test_debounced_autosave.mjs`)

- [x] **TASK-10: Student Profile Media & Storage Migration (Base64 -> Storage / SVG)**
  - **Priority:** MEDIUM
  - **Area:** 9 (Database Hygiene & Media Egress)
  - **Files:** `js/admin/student-management.js`, `js/utils/avatar-engine.js`, `supabase/migrations/20261012_create_student_avatars_bucket.sql`
  - **Objective:** Transition avatar uploads from embedding raw Base64 data strings into PostgreSQL rows to uploading binary WebP files into Supabase Storage bucket `student-avatars` (storing public CDN URLs in `photo_url`), and fallback to lightweight zero-egress inline SVG avatars.
  - **Acceptance Criteria:** `photo_url` column contains CDN URLs instead of Base64 strings; fallback students display styled inline SVG avatars without network requests.
  - **Result:** ✅ COMPLETED (Created migration `20261012_create_student_avatars_bucket.sql`, configured Supabase Storage bucket `student-avatars` with public read RLS, implemented WebP canvas compression upload and zero-egress inline SVG generators; verified with `test_avatar_and_honorifics.mjs`)

- [x] **TASK-11: Honorific Prefix Stripping in Alphabetical Student Sorting & Avatars**
  - **Priority:** HIGH
  - **Area:** 11 (Data Representation & Sorting Correctness)
  - **Files:** `js/api.js`, `js/admin/student-management.js`, `js/admin/app.js`, `js/utils/avatar-engine.js`
  - **Objective:** Implement a centralized `stripHonorific()` comparator that ignores `"Mr."`, `"Miss"`, `"Mrs."`, and `"Ms."` when sorting student lists alphabetically and computing avatar initials.
  - **Acceptance Criteria:** Students sort strictly by personal first/last names (e.g., "Mr. Aldi" sorts under 'A', before "Miss Naila" under 'N'); avatar initials reflect the actual student initial instead of 'M'.
  - **Result:** ✅ COMPLETED (Implemented `stripHonorific` and `getStudentInitial` across `api.js` and `avatar-engine.js`, applied clean name comparator to student login dropdown and Admin DataGrids, eliminating honorific 'M' bias; verified with `test_avatar_and_honorifics.mjs`)

---

## 📌 PROGRESS LOG & CONTINUATION NOTES

| Date & Time | Task ID | Description | Status | Agent / Notes |
|---|---|---|---|---|
| 2026-10-12 01:58 | TASK-00 | Audit Report & Master Checklist Initialization | ✅ COMPLETE | Created `TASK_LIST.md` and initialized task backlog |
| 2026-10-12 02:03 | TASK-01 | FOUC Prevention & Synchronous Head Session Guards | ✅ COMPLETE | Implemented inline `<head>` session guards in `dashboard.html`, `assessment.html`, `result.html` |
| 2026-10-12 02:15 | TASK-02 | Cache-Busting Alignment & Service Worker URL Pattern Fix | ✅ COMPLETE | Aligned version `?v=4.9.8` across all HTML entry points and fixed SW `.endsWith('.js')` |
| 2026-10-12 02:22 | TASK-03 | PostgreSQL Stored Procedure `auto_close_expired_attempts` Correction | ✅ COMPLETE | Migrated RPC to `public.attempts` with `SECURITY DEFINER` and tested 204 response |
| 2026-10-12 02:30 | TASK-04 | Deprecate Client-Side Scoring Fallback in API | ✅ COMPLETE | Replaced client scoring in `js/api.js` with server RPC fallback; updated `assessment.html` |
| 2026-10-12 02:31 | TASK-05 | Server-Authoritative Emergency Submission Fallback RPC | ✅ COMPLETE | Implemented `emergency_submit_attempt` RPC with `SECURITY DEFINER` and verified E2E |
| 2026-10-12 02:38 | TASK-06 | Anti-Cheat Hardening (Clipboard, DevTools & Mobile Inputs) | ✅ COMPLETE | Added 3-strike escalation, global event guards, DevTools interception, and CSS selection suppression |
| 2026-10-12 02:45 | TASK-07 | Conceal Answer Keys in Exam Network Payload & Sanitize Snapshots | ✅ COMPLETE | Stripped answer keys from exam payloads across Edge Function & API; verified 0 leaks |
| 2026-10-12 03:01 | TASK-08 | Database Query Projection Auditing (Replace `.select('*')`) | ✅ COMPLETE | Replaced select(*) with explicit column projections across 7 files; verified with automated test |
| 2026-10-12 03:04 | TASK-09 | Debounced Autosave Buffer for Real-Time Keystrokes & Transcripts | ✅ COMPLETE | Implemented 400ms debounced write-ahead local buffer and unload flusher; verified with automated test |
| 2026-10-12 03:14 | TASK-10 | Student Profile Media & Storage Migration (Base64 -> Storage / SVG) | ✅ COMPLETE | Configured `student-avatars` bucket, canvas WebP upload, zero-egress SVG; verified with test |
| 2026-10-12 03:14 | TASK-11 | Honorific Prefix Stripping in Alphabetical Student Sorting & Avatars | ✅ COMPLETE | Implemented `stripHonorific` and `getStudentInitial`, eliminating 'M' bias in sorting & initials |
| 2026-10-12 03:18 | MASTER | Full Regression Verification Suite (01 to 11) | ✅ COMPLETE | All 11 tasks passed (9/9 suites passed, 0 failures) via `run_all_audit_tests.mjs` |

