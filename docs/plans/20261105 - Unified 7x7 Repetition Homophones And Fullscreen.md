# Unified Implementation Plan — 7x7 Repetitive Mastery Harmonization, Acoustic Homophone Engine & Result Page Fullscreen Mode

> **Status: [IMPLEMENTED — VERIFIED WITH 100% PASSES]**
> **Executed Under: `/goal` Directive**
> **Verification: `npm test` PASS 4/4 suites (Syntax, SW Manifest, Dashboard Parity, Acoustic Homophones)**

## Goal Description
Consolidate and execute all remaining pending tasks requested by the user into a single unified plan:
1. **Ayya Sofyandi & Adinda Karunia Gating Deadlock Resolution**:
   - In `2nd Vocabulary` tests, `payload.task_repetitions` stored `6` from past configuration tests.
   - Result page evaluated `currentPassCount < 6` (6 < 6 = FALSE), concluded the drill was finished after 6 passes, and displayed `"ADVANCE TO NEXT TASK: C2"`.
   - But backend `startTest` strictly enforces the 7x7 Repetitive Mastery rule (`passCount >= 7`).
   - When Ayya and Adinda attempted to start C2, they were blocked with `403 PREREQUISITE_NOT_MET`.
   - **Resolution**: Harmonize all test payloads in database to `task_repetitions = 7`, upsert persistent `site_settings`, ensure result page displays `"CONTINUE THE DRILL (6/7)"` until pass 7, and connect prerequisite minimum passing score dynamically to `prereqTest.minimum_required_score` (e.g. 50% for C1/C2).
2. **Acoustic Homophone Tolerance Engine (Spoken Assessment Mode)**:
   - In spoken tests, the speech recognition engine frequently transcribes homophones (e.g., student pronounces `"buy"`, STT writes `"bye"` or `"by"`; student pronounces `"wrap"`, STT writes `"rap"`).
   - Currently, these are scored 0.0 points, frustrating students who spoke correctly.
   - **Resolution**: Build a curated, bidirectional homophone dictionary `HOMOPHONE_MAP` in `js/grading.js` active strictly in **Spoken mode** (`mode === 'spoken'`). Award **1.0 pt (correct)** with evaluation tag `homophone_match`. Keep Written mode strict for spelling.
3. **Result Page Fullscreen Mode (Matching Test Page)**:
   - When taking a test in `test.html`, the browser runs in true Fullscreen mode.
   - Upon submitting, `test.js` previously called `document.exitFullscreen()`, popping the browser back to windowed mode with visible tabs and address bar.
   - **Resolution**: Remove `exitFullscreen()` in `test.js:doSubmit()`, wire up `requestFullscreenMode()` / toggle button on `result.html` header, auto-request fullscreen on user interaction, and gracefully exit fullscreen only when clicking "Back to Lobby".

---

## Technical Components to Execute

### Component 1: Database Payload Harmonization & Site Settings
- Run `scripts/harmonize_task_repetitions_to_7.mjs`:
  - Update all 19 tests of `2nd Vocabulary` (and all other classes) in `tests` table: set `payload.task_repetitions = 7`.
  - Upsert `site_settings`:
    - `default_test_system_settings = {"taskRepetitions": 7, "taskMinScore": 70, "examMinScore": 60}`
    - `class_test_settings_2ccf6468-1e03-41d1-b72b-1d84dcad85b2` = `{"taskRepetitions": 7, "taskMinScore": 50, "examMinScore": 60}`
    - `class_test_settings_ab33498a-90e6-44b7-83f4-5765f964543e` = `{"taskRepetitions": 7, "taskMinScore": 50, "examMinScore": 60}`

### Component 2: Unified Backend Gating Validator
- In `js/api.js` (lines 1345-1365 & 1500-1515):
  - Dynamic `requiredPasses` (defaults to 7 for tasks, 1 for exams).
  - Dynamic `taskMinScore = prereqTest?.minimum_required_score || testSettings?.taskMinScore || 50`.
- In `supabase/functions/start-test/index.ts`:
  - Mirror dynamic prerequisite checks.

### Component 3: Result Page & Dashboard 7-Repetition Loop Synchronization
- In `js/result.js`:
  - Ensure `targetReps` strictly evaluates to `7` for vocabulary tasks.
  - When student is at 6/7 passes: renders `"CONTINUE THE DRILL (6/7): [TEST TITLE] →"`.
  - When student completes 7/7 passes: renders `"ADVANCE TO NEXT TASK: [NEXT TEST] →"`.
- In `js/dashboard.js`:
  - Ensure Section 5 renders 7 repetition boxes for vocabulary classes.
  - Section 6 displays pass count `6` until pass 7 is reached, then displays the White Forward Arrow in Green Box.

### Component 4: Acoustic Homophone Tolerance Engine
- In `js/grading.js`:
  - Define `HOMOPHONE_MAP`.
  - In `evaluateAnswer()`: when `mode === 'spoken'`, check `HOMOPHONE_MAP`. Award 1.0 pt (`correct`) if student spoken word is an accepted acoustic homophone of the target word.
- In `js/api.js`:
  - Include homophone tolerance in post-submission answer tolerance sync.

### Component 5: Result Page Fullscreen Integration
- In `js/test.js`:
  - Maintain fullscreen across test submission into `result.html`.
- In `result.html` & `css/result.css`:
  - Header fullscreen toggle button (`#result-fullscreen-btn`) with icon `⛶` / `🗗`.
- In `js/result.js`:
  - Fullscreen helpers, toggle listener, auto-enter on interaction, and clean exit when returning to lobby.

---

## Verification & Parity
1. Database audit confirming 0 tests remain with `task_repetitions = 6`.
2. Gating simulation confirming Ayya and Adinda receive `"CONTINUE THE DRILL (6/7)"` on C1, and upon pass 7, advance to C2 with `startTest` succeeding.
3. Homophone test suite confirming spoken `"bye"` for `"buy"` and `"rap"` for `"wrap"` score 1.0 pt, while written mode rejects homophones.
4. Syntax checks: 45/45 JS files pass.
5. CI test suite: `npm test` PASS 100%.
6. Cache busters bumped to `v=20261105_v128` and SW cache bumped to `v56`.
