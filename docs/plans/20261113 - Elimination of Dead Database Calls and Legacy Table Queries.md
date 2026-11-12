# TOPSCORE LMS — ELIMINATION OF DEAD DATABASE CALLS & LEGACY TABLE QUERIES
**Date:** 2026-11-13  
**Phase:** 443  
**Domain:** System Streamlining, Backend Integrity & JavaScript Runtime Hygiene

---

## 1. Executive Summary & Objective

In migration `20261109020000_master_legacy_cleanup.sql`, 16 legacy database tables were permanently dropped from Supabase PostgreSQL:
- `subjects`
- `cec_app_state`
- `enrollments`
- `assignments`
- `class_meetings`
- `class_meeting_exceptions`
- `class_instances`
- `professional_skills`
- `user_professionals`
- `work_records`
- `question_usage_history`
- `questions`
- `test_items`
- `test_results`
- `test_topics`
- `student_submissions`

However, a systematic code audit revealed **84 residual calls** across 9 JavaScript files still querying these dropped tables. While some calls are swallowed by `.catch(() => [])`, others generate console warnings, wasted network latency, or runtime exceptions (such as `duplicateTest` throwing an error when attempting to copy records from the dropped `questions` table).

The objective of Phase 443 is to cleanly eliminate all dead database calls, remove obsolete uncalled view routines, and align all query patterns with TopsCore's modern schema (where tests use level-centric assignment, questions reside in `vocabulary_vault` and test `payload`, and attempt snapshots are stored immutably in `attempts`).

---

## 2. Inventory of Dead Database Calls by Module

| File | Dropped Tables Referenced | Problematic Routines | Resolution |
| :--- | :--- | :--- | :--- |
| `js/admin/admin-deck.js` | `class_meetings`, `work_records`, `professional_skills`, `user_professionals` | `renderDashboard()`, `loadProfile()`, `renderTeacherSchedule()` | Purge dead queries; return empty arrays without firing HTTP requests to Supabase. |
| `js/admin/app.js` | `questions`, `assignments`, `work_records`, `class_instances`, `test_items` | `parseHashRoute()`, `renderClassHub()`, `renderClasses()` | Remove dead router mappings, remove `test_items` query from Class Hub, remove dead toolbar buttons. |
| `js/admin/class.js` | `questions`, `class_instances` | `renderCentralQuestionImport()`, `renderClassInstances()` | Remove dead uncalled routines and clean unused imports. |
| `js/admin/crud-modals.js` | `test_items` | `openCrudModal()` test save handler, `openBulkEditTestsModal()` | Remove dead `test_items` update calls on test save. |
| `js/admin/desk.js` | `questions`, `test_items` | `renderRecycleBin()`, `btn-health-scan-orphans` | Repoint recycle bin to `vocabulary_vault`; purge `test_items` from relational health auditor. |
| `js/admin/imports-exports.js` | `test_items`, `assignments`, `questions` | `exportTestQuestionsToExcel()` | Extract test questions from `test.payload?.questions` or fallback safely without querying dropped tables. |
| `js/admin/student-management.js` | `assignments` | `renderStudents()` | Remove `adminFetchAll('assignments')`; rely purely on level-centric test inheritance per Rule 2.5. |
| `js/admin/tests-management.js` | `test_items`, `questions` | `renderTests()`, `duplicateTest()`, `renderQuestions()` | Remove `test_items` fetch, fix `duplicateTest` to copy test row & payload only, purge uncalled `renderQuestions`. |
| `js/api.js` | `test_items`, `assignments`, `user_professionals`, `class_meetings`, `class_meeting_exceptions`, `questions`, `test_topics` | `getTestQuestions()`, `adminSoftDelete()`, `detectDuplicateQuestions()`, `createTestDefinitionWithTopics()`, `upsertClassTest()` | Purge dead table references from `noDeletedAtTables`, remove dead `test_items` deletions/syncs, provide clean stubs. |

---

## 3. Detailed Implementation Strategy

### 3.1 `js/admin/admin-deck.js`
- Remove `adminFetchAll('class_meetings', ...)` from `renderDashboard()`. Initialize `upcomingMeetings = []`.
- In `loadProfile()`, remove fetches to `work_records` and `professional_skills`; set to `[]`.
- In `renderTeacherSchedule()`, set `meetings = []` without database calls.
- In `saveProfessionalProfile()`, remove writes to `user_professionals`.

### 3.2 `js/admin/app.js`
- Clean `routeAliases`: delete `'board-bank': 'questions'`, `'class-assignments': 'assignments'`, `'tests-assignments': 'assignments'`, `'work-records': 'work_records'`.
- In `renderClassHub()`, remove `adminFetchAll('test_items', ...)` from `Promise.all`. Derive question counts cleanly from test data.
- Remove dead `case 'class_instances':` and dead buttons in `renderClasses()`.

### 3.3 `js/admin/class.js`
- Remove unused imports `renderClassInstances`, `renderCentralQuestionImport`, `renderCentralQuestionBank`.
- Safely deprecate or eliminate dead uncalled question bank import / instance view functions.

### 3.4 `js/admin/crud-modals.js`
- Remove lines attempting to update `test_items` when a test's `answer_type` is modified.

### 3.5 `js/admin/desk.js`
- In `renderRecycleBin()`, replace `adminFetchDeleted('questions')` with `adminFetchDeleted('vocabulary_vault')`.
- In `btn-health-scan-orphans`, remove `adminFetchAll('test_items', ...)` and orphaned questions check.

### 3.6 `js/admin/imports-exports.js`
- In `exportTestQuestionsToExcel()`, retrieve questions from `test.payload?.questions || []` instead of querying dropped `test_items`, `assignments`, and `questions`.

### 3.7 `js/admin/student-management.js`
- Remove `adminFetchAll('assignments', 'student_id, batch_id, test_id')` from `renderStudents()`.
- Rely entirely on level-centric assignment (`levelAssesIds`) per Rule 2.5.

### 3.8 `js/admin/tests-management.js`
- Remove `adminFetchAll('test_items', ...)` from `renderTests()`.
- Fix `duplicateTest`: remove `sb.from('questions')` query. Duplicating a test now cleanly clones the `tests` row (including `payload`) and appends `(Copy)`.
- Remove dead `renderQuestions()` view.

### 3.9 `js/api.js`
- In `getTestQuestions(test)`, return `test.payload?.questions || []` when not dynamic vault.
- Remove dropped tables from `noDeletedAtTables` in `adminFetchAll`.
- In `adminSoftDelete('tests', id)`, remove `sb.from('test_items').delete()`.
- In `createTestDefinitionWithTopics` and `updateTestWithTopics`, remove queries to dropped `test_topics`.
- In `upsertClassTest` and `updateClassTestsConfig`, remove `sb.from('test_items').update(...)`.

---

## 4. Verification Protocol
1. **Automated Syntax Check**: Run `node scripts/check_all_js_syntax.cjs` on all modified files.
2. **Dead Reference Audit**: Run a dedicated verification script `scripts/verify_dead_db_calls_elimination.mjs` ensuring zero occurrences of dropped tables in active query contexts.
3. **Full System Verification**: Run `npm run verify:all` ensuring 100% pass across all 21 test suites and UI spatial invariants.
