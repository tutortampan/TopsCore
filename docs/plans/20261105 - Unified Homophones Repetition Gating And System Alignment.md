# Master Plan — Unified Homophones Tolerance, 7x7 Repetitive Mastery Alignment, and Gating Resolution

> **Status: [IMPLEMENTED] (SUDAH) — CLOSED / ARCHIVED**
> **Consolidated From**: `repetition_gating_and_homophones_plan.md` and related pending components per user `/goal` directive.

---

## 1. Goal Description

Consolidate all open, pending system enhancements and student gating fixes into a single unified plan and execute them completely:
1. **7x7 Repetitive Mastery Alignment & Gating Resolution**:
   - Resolve the progression deadlock for **Mr. Ayya Sofyandi Mzeth** and **Miss Adinda Karunia Farela** (and any student reaching 6 passes on a task).
   - Standardize `task_repetitions = 7` across database `tests.payload`, `site_settings`, Result Page, Student Dashboard, and `startTest` backend validators.
   - Connect prerequisite pass checks to `minimum_required_score` (e.g. 50% for C1/C2 tasks, 55% for A1, 60% for exams) instead of hardcoding static `70%`.
2. **Acoustic Homophone Tolerance Engine (Spoken Mode)**:
   - In Spoken tests (mic/speech recognition), students who correctly pronounce words like *"buy"*, *"wrap"*, *"sea"*, *"hour"*, *"meat"* often have their speech acoustically transcribed by STT models as homophones (*"bye"*, *"rap"*, *"see"*, *"our"*, *"meet"*).
   - Implement curated bidirectional `HOMOPHONE_MAP` in `js/grading.js` and `js/api.js` awarding **1.0 point (correct)** strictly in `mode === 'spoken'`.
   - Keep Written tests (typing) strict on spelling.
3. **Database Harmonization & Automated Verification**:
   - Harmonize PostgreSQL database rows, run automated regression tests, update syntax and cache busters, and verify 100% test pass.

---

## 2. Status of All Plans in System

| Plan Artifact | Focus Area | Status |
|---|---|:---:|
| `dashboard_blueprint_and_exam_gating_plan.md` | Blueprint 50px standard heights, Section 5 removal, exam prerequisite gating, cumulative exam questions | **IMPLEMENTED (SUDAH)** |
| `test_page_fixes_and_cleanup_plan.md` | Yellow pacing badge purge, POS cleanup, 48px nav next button, CSP/SW fix | **IMPLEMENTED (SUDAH)** |
| `answer_tolerance_homophones_and_vault_fix_plan.md` | Hyphen & punctuation tolerance, letter spelling ("b u y"), Result page 7x loop, Vault edit fix | **IMPLEMENTED (SUDAH)** |
| `ranking_points_priority_and_score_over100_fix_plan.md` | Points-First leaderboard ranking, 241 database rows effective_score sanitization, elimination of >100% scores | **IMPLEMENTED (SUDAH)** |
| `unified_homophones_repetition_gating_and_system_alignment_plan.md` | 7x7 repetition alignment, Ayya & Adinda deadlock resolution, dynamic pass thresholds, acoustic homophones | **IMPLEMENTED (SUDAH)** |

---

## 3. Detailed Component Architecture

### Component 1: Acoustic Homophone Tolerance Engine (`js/grading.js`, `js/api.js`)
- `HOMOPHONE_MAP` constant containing bidirectional mapping:
  - `buy` ➔ `['bye', 'by']`
  - `wrap` ➔ `['rap']`
  - `sea` ➔ `['see']`
  - `hear` ➔ `['here']`
  - `right` ➔ `['write']`
  - `meat` ➔ `['meet']`
  - `flour` ➔ `['flower']`
  - `hour` ➔ `['our']`
  - `son` ➔ `['sun']`
  - `piece` ➔ `['peace']`
  - `whole` ➔ `['hole']`
  - `wait` ➔ `['weight']`
  - `break` ➔ `['brake']`
  - `stair` ➔ `['stare']`
  - `tail` ➔ `['tale']`
  - `bare` ➔ `['bear']`
  - `weather` ➔ `['whether']`
  - `knight` ➔ `['night']`
  - `week` ➔ `['weak']`
  - `road` ➔ `['rode']`
  - `mail` ➔ `['male']`
- Strictly checks `mode === 'spoken'`.
- Awards 1.0 pt, evaluation result `'correct'`, feedback `'Accepted spoken homophone'`.

### Component 2: Harmonize `task_repetitions` to 7 in Database & Code (`js/api.js`, `supabase/functions/start-test/index.ts`, `js/result.js`, `js/dashboard.js`)
- In `js/api.js`:
  - `fetchClassTestSettings`: defaults `taskRepetitions: 7`.
  - `startTest`: uses `targetReps` (7) and respects `minimum_required_score` (e.g. 50%).
- In `js/result.js`:
  - `targetReps` strictly evaluates to `7` for vocabulary classes.
  - When Ayya or Adinda has 6 passes, renders: `"CONTINUE THE DRILL (6/7): 2ND VOCABULARY C1 WORDS TASK →"`.
  - When 7 passes are reached, renders: `"ADVANCE TO NEXT TASK: 2ND VOCABULARY C2 WORDS TASK →"`.
- In `js/dashboard.js`:
  - Section 5 renders exactly 7 repetition boxes for vocabulary classes.
  - Next Assessment button dynamically displays pass count (0–6) until 7 passes are reached, then displays the White Forward Arrow in Green Box.

### Component 3: Database Synchronization Script (`scripts/apply_repetition_7_and_homophones.mjs`)
- Updates `site_settings`:
  - `default_test_system_settings` = `{"taskRepetitions": 7, "taskMinScore": 50, "examMinScore": 60}`
  - `class_test_settings_2ccf6468-1e03-41d1-b72b-1d84dcad85b2` = `{"taskRepetitions": 7, "taskMinScore": 50, "examMinScore": 60}`
- Updates `tests.payload.task_repetitions = 7` across all tests.

---

## 4. Verification Plan
1. Unit tests for Homophone tolerance in Spoken mode vs Written mode.
2. Simulation test verifying Ayya and Adinda's 6/7 progression flow.
3. Syntax check (`check_all_js_syntax.cjs`) and CI test suite (`npm test`).
4. Cache buster bump to `v=20261105_v129` and SW cache to `v57`.
