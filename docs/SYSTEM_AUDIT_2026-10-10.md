# TopsCore — Full-System Architectural Audit Report

**Generated:** 2026-10-10 | **Auditor:** Antigravity AI Agent  
**Scope:** Read-only. All findings are evidence-based with file + line references.

---

## 1. Logic Trees & System Decision Engines

### 1.1 Authentication & Session Lifecycle

The login flow is a **4-step cascading waterfall** rendered entirely client-side in `index.html`:

```text
Step 1: fetchInstitutions()         -> renderOptions('#list-institution')
         on select -> collapseSection + resetFrom('program')
Step 2: fetchPrograms(institutionId)-> renderOptions('#list-program')
         on select -> collapseSection + resetFrom('batch')
Step 3: fetchBatches(programId)     -> renderOptions('#list-batch')
         on select -> collapseSection + resetFrom('student')
Step 4: fetchStudentsByProgram()    -> renderOptions('#list-student')
         on select -> unlockSection('#sec-pin')
Step 5: PIN Input (4 digit inputs)  -> verifyStudentLogin() -> setStudentSession() -> redirect dashboard.html
```

**Token / sessionStorage hydration:** After success, `session.js:setStudentSession()` writes to `sessionStorage['topscore_session']`. "Remember Me" state persists in `localStorage['topscore_saved_login_v2']`.

**Session expiry guardrails:** NONE. No JWT expiry check, no server-side ping, no `authenticated_at` TTL. A student can keep a tab open indefinitely.

**Verification chain in `verifyStudentLogin` (api.js:~210):**

1. Edge Function `student-login` called first
2. Falls back to direct DB if Edge Function unavailable
3. DB fallback: verifies `program_id`, `institution_id`, `is_active`, SHA-256 PIN hash
4. WEAKNESS: Edge Function path trusts response completely — no program/institution cross-check re-validated

---

### 1.2 Leveling & Gating Engine

**Class accessibility filtering (`api.js:fetchAssessmentsForStudentClass`):**

```text
IF levelId provided:
  Fetch student level_number from 'levels' table
  Filter: assessments WHERE assessment.levels.level_number <= student.level_number
  ELSE fallback: filter WHERE assessment.level_id === levelId (exact match only)
```

**Dual-path gating — path inconsistency:**

- Path A: `fetchAssessmentsForStudentClass()` - filters by `class_id` (from dashboard class tab)
- Path B: `fetchAssessmentsForStudentLevel()` - filters by `level_id` (for level-based views)
A student can see different assessment counts depending on which path is invoked.

**Prerequisite enforcement (`grading.js:isPrerequisiteMet`):** Called in `api.js:checkAndTriggerLevelUp()` after exam submit in `assessment.html:doSubmit()`. RISK: If `doSubmit` fails midway, `checkAndTriggerLevelUp` is skipped silently.

---

### 1.3 Assessment State Machine

```text
BOOT:

  bootAssessment()
    -> session = requireStudentSession()
    -> assessmentId = sessionStorage['topscore_assessment_id']
    -> startAssessment() [Edge Function -> DB fallback]
    -> answeredMap = JSON.parse(localStorage['topscore_local_answers_${attemptId}']) || {}
    -> Section timer: localStorage['topscore_sec_started_${attemptId}_${sectionIndex}']

TIMER:
  Server provides: expected_end_at
  Client: countdown = floor((expected_end_at - now) / 1000)
  Auto-submit: timerController -> autoSubmit() -> doSubmit(true)

ANTI-CHEAT:
  visibilitychange -> if document.hidden && isAssessmentActive -> triggerCheatAlert()
  popstate -> triggerCheatAlert()
  10s countdown; if not dismissed -> auto-submit

WRITE-AHEAD BUFFER:
  On answer: localStorage.setItem('topscore_local_answers_${attemptId}', JSON.stringify(answeredMap))
  On section: localStorage.setItem('topscore_sec_started_${attemptId}_${sectionIndex}', ISO)

SUBMIT (doSubmit):
  1. Stop timer
  2. saveCurrentAnswer()
  3. Build payload: allAnswerRows.map(row -> {attempt_answer_id, student_answer})
  4. submitAssessment() -> Edge Function 'submit-assessment'
  5. On EXAM: checkAndTriggerLevelUp()
  6. localStorage buffer cleaned
  7. redirect -> result.html

AUTO-SUBMIT FALLBACK (if Edge Function fails):
  Direct REST PATCH /rest/v1/attempts - uses ANON KEY
  Only sets: status='auto_submitted', submitted_at=now
  ANSWERS NOT SUBMITTED -> SCORE WILL BE 0
```

---

### 1.4 Vault Mapping vs Answer Type

`vocab-vault.js` manages two modes: `single_words` and `phrases`.

Answer type binding:

- `IDIOM_PROVERB` -> `answerType: 'dropdown_10'`
- All other vocab -> `answerType: 'written'` (virtual keyboard)

Render dispatch in `assessment.html`:

```text
switch(row.answer_type):
  'written'         -> renderWritten() + VK + physical keyboard listener
  'speech_to_text'  -> renderSpeech() using Web Speech API
  'multiple_choice' -> renderMC()
  'dropdown'        -> renderDropdown()
  'dropdown_10'     -> renderDropdown() [same function, 10 options]
  (default)         -> renderWritten() fallback
```

---

## 2. Dead Code, Orphaned Elements & Redundancies

| File & Line | Issue | Impact & Fix |
| --- | --- | --- |
| `js/app.js:137` | `getGrade(pct)` returns a **plain string** via `calculateGrade()` in `grading.js:156` | **CRITICAL BUG**: `student-management.js:60-61` calls `g.label` and `g.color` on the string return -> both `undefined`. Grade column always shows `—`, color always `rgba(255,255,255,0.4)`. Fix: return `{label,color}` from `getGrade()`, or update student-management.js to use the string directly. |
| `js/app.js:161` | `el()` DOM helper exported | Dead export - never imported by any module. Remove or document. |
| `js/app.js:176` | `delegate()` exported | Dead export - never imported. |
| `js/app.js:190` | `scrollTop()` exported | Dead export - only referenced in test HTML files, not any JS module. |
| `js/api.js:58` | `toLevelLetter()` exported as "backward-compat alias" | **4 competing implementations**: (1) api.js returns ordinal text "1st Level", (2) admin/app.js:373 converts to Excel letter A/B/C, (3) class.js:1429 same Excel-letter algorithm, (4) imports-exports.js:7 `String.fromCharCode(64+level)` = same letter. Callers see different outputs depending on which version is in scope. |
| `js/session.js:33` | `education` field stored in session | Type ambiguity: the `students.education` DB column holds either a string or JSON array. `dashboard.html:1401-1408` has 3-branch type check. No schema migration enforces consistent type. |
| `js/admin/student-management.js:934` | `window.openStudentFullEdit = openStudentFullEdit` | **Duplicate global assignment**: also assigned at `js/admin/app.js:2186`. Second write overwrites first. |
| `js/admin/app.js:878` | `await import('./student-management.js')` (no version string) | **Cache-bust miss**: all other imports use `?v=4.7.12` or `?v=4.7.13`. This unversioned lazy import may serve a stale cached module post-deployment. |
| `js/admin/app.js:271,282` | Imports `student-management.js?v=4.7.13` | All other files use `?v=4.7.12`. Mixed versions may load two copies in same session. |
| `dashboard_utf8.html` (root) | 130KB duplicate of `dashboard.html` | Orphan file — not linked anywhere. Safe to delete. |
| Root directory | ~60 `fix_*.cjs`, `patch_*.cjs`, `update_*.cjs` scripts | One-off migration scripts left in project root with potential `SUPABASE_SERVICE_ROLE_KEY` access. Move to `/scripts/` and gitignore. |

---

## 3. Conflicting Pathways & Race Conditions

### 3.1 Casing & Schema Inconsistencies

| File & Line | Issue | Impact & Fix |
| --- | --- | --- |
| `js/admin/student-management.js:41` | `a.assessment_id \|\| a.Assessment_id` dual access | Historical DB casing bug. `api.js:914` already normalizes `Assessment_id -> assessment_id` in `adminFetchAll`. Both branches are defensive redundancy. Confirm DB column is `assessment_id` and remove uppercase branch. |
| `js/api.js:914` | `normKey = (key === 'Assessment_id') ? 'assessment_id' : key` | Living workaround for schema casing bug. |
| `js/api.js:~305` | `.in('status', ['submitted','auto_submitted','SUBMITTED','AUTO_SUBMITTED'])` | Mixed-case status values in DB. Double filter works but confirms the schema is inconsistent. Fix: SQL `UPDATE attempts SET status = UPPER(status)` then use uppercase only. |
| `js/api.js:~284` | `.is('deleted_at', null)` applied twice in same query chain | Redundant filter. Cosmetic but signals copy-paste drift. |
| `js/admin/imports-exports.js:7` | `toLevelLetter = level => String.fromCharCode(64 + parseInt(level))` | Algorithmic conflict: Level 1 = 'A', Level 2 = 'B'. But `api.js` returns '1st Level'. Import preview rows show letters; admin dashboard shows ordinal — visible to admins as inconsistency. |

### 3.2 State Storage Clashes

| File & Line | Issue | Impact & Fix |
| --- | --- | --- |
| `assessment.html` | `autoSave()` called on `blur`, not on `input` | If student never blurs a field before the timer fires or browser crashes, the last keystroke(s) are NOT in localStorage. Add `input` event listener that saves with debounce. |
| `assessment.html:doSubmit()` | `sessionStorage['topscore_attempt_id']` set before AND after submit call | Pre-submit set exists so redirect has the ID. Post-fallback PATCH still redirects but with unscored attempt. result.html cannot distinguish scored vs unscored. |
| `index.html` | `localStorage['topscore_saved_login_v2']` stores studentId | If admin deactivates student, Remember Me still fills their name. verifyStudentLogin correctly rejects but UX exposes the name on a shared device. |
| `js/session.js:84` | `admin_id: data.admin_id \|\| 'admin'` | Admin session stores literal string `'admin'` as actor ID if not provided. Audit log entries will show `admin` not a real user ID. |

### 3.3 Virtual Keyboard Input Clashes

| File & Line | Issue | Impact & Fix |
| --- | --- | --- |
| `assessment.html` | `textarea readonly + inputmode="none"` to suppress mobile keyboard | iOS Safari does not reliably honor `inputmode="none"`. Native soft keyboard may appear alongside VK buttons, causing double-input to same `window.activeKeyboardInput`. Fix: use a hidden focus-trap `<input>` instead of readonly textarea. |
| `assessment.html` | Global `document.addEventListener('keydown', ...)` intercepts all keys when VK is active | The guard `vkContainer.style.display === 'none'` only works for inline-style hiding. If CSS class hides VK, the check fails and the handler intercepts keys during speech/dropdown modes. |
| `assessment.html` | `window.activeKeyboardInput` global mutable reference | If multi-question batch rendering occurs, the last focused `<textarea>` wins. No teardown on focus-away. |

---

## 4. Empty Handlers, Dead-End Routes & Security Risks

### 4.1 Navigation Dead Ends

| File & Line | Issue | Impact & Fix |
| --- | --- | --- |
| `admin.html:73` | Nav label="Batches" but `data-sub="institutions"` | Label/ID mismatch. `loadSection('institutions')` shows institution list, not batches. Align label with actual content or change `data-sub`. |
| `js/admin/app.js:840` | `case 'levels': window.location.hash = '#classes'` | Silent redirect, no user message. No standalone levels UI exists. |
| `js/admin/app.js:924` | `case 'assessment-hub': window.location.hash = '#assessments'` | Silent redirect. |
| `js/admin/app.js:928` | `case 'import_ai_assessments': window.location.hash = '#assessments'` | Silent redirect. |
| `js/admin/app.js:931` | `case 'schedule': await renderAdminSchedule()` | Function exists but no nav item links to it in `admin.html`. Effectively orphaned from nav. |

### 4.2 RLS & Security Risks

| File & Line | Issue | Impact & Fix |
| --- | --- | --- |
| `admin.html` | `requireAdminSession()` NOT called at page load | `dashboard.html` calls `requireStudentSession()` at page top. `admin.html` relies solely on module initialization order. If module load fails, admin UI may render unauthenticated. Add inline guard script. |
| `js/admin/session.js:84` | `admin_id` defaults to string `'admin'` | Audit log actor_user_id will log `'admin'` not a real identity. |
| `js/admin/student-management.js:359,377,386` | Direct client-side `sb.from('students').update()` in bulk operations | No Edge Function wrapper. Entirely RLS-dependent. If anon key has write policy, any browser session can issue these mutations. |
| `assessment.html:doSubmit()` | Auto-submit fallback uses ANON KEY in client-side `fetch()` PATCH | Anon key exposed in source. If RLS allows anon PATCH on attempts, any student can forge a submit by replicating the request. Fallback also submits NO answers -> score=0. |

### 4.3 Auto-Submit Answer Loss

| File & Line | Issue | Impact & Fix |
| --- | --- | --- |
| `assessment.html:doSubmit()` | If Edge Function fails, fallback PATCH only sets `status/submitted_at`, no answers | All student answers irrecoverably lost. localStorage buffer remains but is never re-sent. Fix: before calling Edge Function, store the full `payload` in sessionStorage; on `result.html` load, check for pending payload and retry. |

---

## 5. Priority Summary

| Priority | # | Findings |
| --- | --- | --- |
| CRITICAL | 2 | `getGrade()` return type mismatch (grades always blank in admin); Auto-submit fallback loses all student answers |
| HIGH | 4 | `requireAdminSession` missing from admin.html; iOS VK double-input clash; `Assessment_id` casing dual branch; Mixed-case `status` enum in DB |
| MEDIUM | 6 | 4 competing `toLevelLetter` impls; version mismatch 4.7.12 vs 4.7.13; unversioned lazy import; double `window.openStudentFullEdit`; 3 silent hash-redirect dead ends; `education` field type ambiguity |
| LOW | 5 | Dead exports (`el`, `delegate`, `scrollTop`); orphan `dashboard_utf8.html`; 60+ root-level patch scripts; `admin_id='admin'` fallback; nav label/data-sub mismatch |

---

## 6. Recommended Immediate Actions (Priority Order)

1. **Fix `getGrade()` return type** — update `grading.js:calculateGrade()` to return `{ label: string, color: string }` and update all callers (`dashboard.html`, `result.html`, `student-management.js`, `assessment.html`). Or create a separate `GRADE_COLORS` map in `student-management.js`.
2. **Add admin.html session guard** — add `<script>` before module imports that reads `sessionStorage` and redirects to login if no admin session.
3. **Normalize DB status enum** — SQL migration: `UPDATE attempts SET status = UPPER(status) WHERE status != UPPER(status)`.
4. **Fix auto-submit fallback** — store `payload` (answers) in `sessionStorage` before submit attempt; if fallback fires, queue retry on `result.html`.
5. **Standardize module version strings** — pick one (e.g. `?v=4.7.13`) and apply consistently to all static imports and the unversioned lazy import at `admin/app.js:878`.
6. **Consolidate `toLevelLetter`** — delete the 3 local copies; have all files import from `api.js` (already exported).
