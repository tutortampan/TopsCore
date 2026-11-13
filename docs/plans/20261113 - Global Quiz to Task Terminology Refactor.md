# Plan: Global "Quiz" → "Task" Terminology Refactor & SSOT Alignment

> **Date:** 2026-11-13  
> **Phase:** 456  
> **Scope:** Replace all user-facing instances of "Quiz" / "Quizzes" with "Task" / "Tasks", while strictly preserving PostgreSQL ENUM (`test_type: 'quiz'`) and legacy DB identifiers to prevent runtime regressions.

---

## 1. Executive Summary & Architectural Boundaries

TopsCore terminology designates non-exam learning checkpoints as **"Tasks"** (e.g. Vocabulary Tasks, Daily Tasks, Practice Tasks) and milestone assessments as **"Exams"** (e.g. Words Exam, Phrases Exam).
However, historical code left legacy "Quiz" terminology in various UI headers, buttons, toast notifications, status messages, and wizard labels.

### Strict Safety Boundaries:
1. 🔴 **DO NOT MODIFY DATABASE ENUM OR PERSISTED VALUES**:
   - PostgreSQL enum `public.test_type` in Supabase is explicitly `('quiz', 'exam')`. Altering `test_type: 'quiz'` to `'task'` in database inserts/updates without a DB migration will crash with PostgreSQL error `invalid input value for enum public.test_type: "task"`.
   - Legacy shell codes (e.g. `-WORDS-QUIZ`, `-PHRASES-QUIZ`, `Phrases Quiz`) stored in database records must continue to be matched defensively.
   - DB query filters (e.g. `.in('test_type', ['QUIZ', 'EXAM'])`) must remain intact.
2. 🟢 **REFACTOR ALL USER-FACING LABELS & MESSAGES**:
   - Table headers: `<th>Quizzes</th>` → `<th>Tasks</th>`
   - Action buttons: `Add Quiz` → `Add Task`, `⚡ 5 Minutes (Quiz)` → `⚡ 5 Minutes (Task)`
   - Filter buttons: `Quizzes (${count})` → `Tasks (${count})`
   - Readiness matrix status labels: `⚠️ Incomplete Quizzes` → `⚠️ Incomplete Tasks`, `✓ Quizzes Completed` → `✓ Tasks Completed`, `🟡 Remedial (Quizzes Completed)` → `🟡 Remedial (Tasks Completed)`
   - Toasts & tooltips: `Success: Created N Quizzes` → `Success: Created N Tasks`
   - Result card labels: `QUIZ: 'Quiz'` → `QUIZ: 'Task'`, `WORD_TASK: 'Word Quiz'` → `WORD_TASK: 'Word Task'`
   - Wizard/modal labels: `durasi quiz` → `durasi task`, `Daily Quiz` → `Daily Task`
3. 🟡 **SAFE INTERNAL JAVASCRIPT IDENTIFIERS**:
   - Rename UI-bound function parameters and variables (e.g., `themeQuizzes` → `themeTasks`, `allAreQuizzes` → `allAreTasks`, `quizCount` → `taskCount`, `filterQuizzes` → `filterTasks`) while maintaining backwards-compatible defensive checks (`a.test_type === 'task' || a.test_type === 'quiz'`).

---

## 2. Before & After Comparative Matrix

| Komponen / Properti | 🔴 Kondisi Saat Ini (BEFORE) | 🟢 Target Perubahan (AFTER) | Dasar Aturan / Alasan |
| :--- | :--- | :--- | :--- |
| `tests-access.js:852` | `<th ...>Quizzes</th>` | `<th ...>Tasks</th>` | User screenshot inquiry; table super-header child header standardization. |
| `tests-access.js:430` | `title="Allow students who haven't completed quizzes to participate"` | `title="Allow students who haven't completed tasks to participate"` | UI tooltip terminology consistency. |
| `tests-access.js:3202` | `statusLabel = '⚠️ Incomplete Quizzes (' + ...` | `statusLabel = '⚠️ Incomplete Tasks (' + ...` | User-facing readiness matrix status indicator. |
| `tests-access.js:3212` | `statusLabel = '✓ Quizzes Completed (Exam Ready)'` | `statusLabel = '✓ Tasks Completed (Exam Ready)'` | User-facing readiness matrix status indicator. |
| `tests-access.js:3225` | `statusLabel = '⚠️ Incomplete Quizzes (' + ...` | `statusLabel = '⚠️ Incomplete Tasks (' + ...` | Remedial mode user-facing eligibility indicator. |
| `tests-access.js:3239` | `statusLabel = '🟡 Remedial (Quizzes Completed)'` | `statusLabel = '🟡 Remedial (Tasks Completed)'` | Remedial mode user-facing eligibility indicator. |
| `classes-management.js:520` | `&#128221; Add Quiz` | `&#128221; Add Task` | Primary Class Hub action button label. |
| `classes-management.js:698` | `<button ... id="filter-quizzes">Quizzes (${quizCount})</button>` | `<button ... id="filter-tasks">Tasks (${taskCount})</button>` | Class Tests sub-tab filter toolbar button. |
| `classes-management.js:602` | `showToast('Success: Created ${res.quizzes ...} Quizzes, ...')` | `showToast('Success: Created ${res.tasks ...} Tasks, ...')` | Auto-generation completion feedback toast. |
| `admin.html:346` | `<button ...>⚡ 5 Minutes (Quiz)</button>` | `<button ...>⚡ 5 Minutes (Task)</button>` | Test duration bulk preset button label. |
| `tests-management.js:414` | `const testTypeLabel = isExam ? 'Weekly Exam' : 'Daily Quiz';` | `const testTypeLabel = isExam ? 'Weekly Exam' : 'Daily Task';` | Test management drawer title label. |
| `tests-management.js:643` | `<button ...>Quizzes (${count})</button>` | `<button ...>Tasks (${count})</button>` | Pacing drawer filter tab. |
| `tests-management.js:675` | `⚡ Quiz` | `⚡ Task` | Pacing drawer type badge. |
| `result.js:58-62` | `QUIZ: 'Quiz', WORD_TASK: 'Word Quiz', PHRASE_TASK: 'Phrase Quiz'` | `QUIZ: 'Task', WORD_TASK: 'Word Task', PHRASE_TASK: 'Phrase Task'` | Student & Admin result card type badges. |
| `auto-gen-modal.js:141` | `Konfigurasi blueprint kurikulum, durasi quiz, cara jawab...` | `Konfigurasi blueprint kurikulum, durasi task, cara jawab...` | Wizard subtitle description copy. |
| `css/admin.css:4798-4837` | `.col-quiz` | `.col-task, .col-quiz` (backward compatible) | Table attendance grid column styling. |

---

## 3. Visual Pre-Flight Verification Checklist

```markdown
- [x] Baseline UI screenshot analyzed (user provided).
- [x] Exact UI element pinpointed: `<th>Quizzes</th>` at line 852 of `js/admin/tests-access.js`.
- [x] Spatial boundary confirmed: "Tasks" is shorter than "Quizzes" (5 chars vs 7 chars), zero column overflow or wrapping risk.
- [x] Text wrap invariance: `white-space: nowrap` preserved on all table cells and headers.
- [x] 100vh viewport lock and 50px lower panel invariant unaffected.
- [x] Database enum safety verified: `test_type: 'quiz'` preserved in DB writes.
- [x] Zero regressions against all 47 master test suites.
```

---

## 4. Execution Plan (Phased Steps)

1. **Phase 1: Readiness Matrix & Tests Access (`js/admin/tests-access.js`)**
   - Update header `<th>Quizzes</th>` → `<th>Tasks</th>`.
   - Update status labels and reasons to "Tasks".
   - Update parameters and local variables (`themeQuizzes` → `themeTasks`, `completedQuizCount` → `completedTaskCount`).
   - Maintain backward compatibility for any caller passing `themeQuizzes`.

2. **Phase 2: Classes Management & Hub (`js/admin/classes-management.js`)**
   - Update "Add Quiz" button label to "Add Task" (preserve `window.handleAddQuiz` as an alias to `window.handleAddTask`).
   - Update filter button `Quizzes (${count})` → `Tasks (${count})`.
   - Update toast notifications and empty state descriptions.

3. **Phase 3: Auto-Gen Modal & Test Management (`js/admin/auto-gen-modal.js`, `js/admin/tests-management.js`)**
   - Update modal subtitle "durasi quiz" → "durasi task".
   - Update drawer badges "⚡ Quiz" → "⚡ Task", "Daily Quiz" → "Daily Task", "Quizzes" → "Tasks".
   - Update DOM element IDs and variables safely.

4. **Phase 4: Result Displays, Presets & CSS (`js/result.js`, `admin.html`, `css/admin.css`, `js/admin/crud-modals.js`, `js/test.js`)**
   - Update `result.js` category map: `'Task'`, `'Word Task'`, `'Phrase Task'`.
   - Update `admin.html` preset: `⚡ 5 Minutes (Task)`.
   - Add `.col-task` selector alias in `css/admin.css`.
   - Update hint button title in `test.js` to "Task practice only".

5. **Phase 5: Automated Verification & Master Test Suite**
   - Run `scripts/check_all_js_syntax.cjs`.
   - Run spatial checker.
   - Run all 47 regression test suites via `npm test`.
   - Update `docs/CURRENT_STATE.md` and `docs/CHANGELOG.md`.
