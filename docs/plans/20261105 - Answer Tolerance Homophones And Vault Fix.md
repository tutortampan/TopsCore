# Implementation Plan — Answer Tolerance & Spelling Support, Result Page Repetition Loop, Dynamic Grade Colors, SW Fix & Vault Edit Repair

> **Status: [IMPLEMENTED] (SUDAH) — CLOSED / ARCHIVED** (All planned components fully implemented, tested, verified, and active in production with cache buster `v=20261105_v127` and SW cache `v55`).

## Goal Description
Resolve key issues across the evaluation pipeline, student testing loop, and admin tools:
1. **Hyphen & Punctuation Tolerance ("high quality" vs "high-quality")**: Ensure punctuation (`,`, `.`, `!`, `-`, `–`, `—`, quotes, etc.) is never used to penalize students. Currently, answering `"high quality"` for `"High-Quality"` is marked wrong (`score: 0`) due to a regression in the PostgreSQL `emergency_submit_attempt` RPC.
2. **Letter Spelling Support ("b u y" &rarr; "buy")**: When a student spells out a word letter-by-letter via mic or typing (producing `"b u y"` or `"b. u. y."`), the system automatically collapses spaces and punctuation to match `"buy"` if the characters are identical.
3. **Result Page Repetitive Drill Loop (7x Passes Before Advancing)**:
   - For Vocabulary classes (and repetition-based tasks), the student must pass 7 times before advancing.
   - If pass ($\ge$ 70%) & < 7 passes: Label is `"CONTINUE THE DRILL (X/7): [TEST TITLE] →"`.
   - If not pass (< 70%) & < 7 passes: Label is `"RETRY THE DRILL (X/7): [TEST TITLE] →"`.
   - If 7/7 passes reached: Label is `"ADVANCE TO NEXT TASK: [C2 WORDS / PHRASES] →"`.
   - **Dynamic Grade Coloring**: The button background/border **strictly follows the student's earned grade color** (E: Pure Red `#FF0000`, D: Dark Orange `#FF8C00`, C: Pure Yellow `#FFFF00`, B: Electric Lime `#95ff00`, A/★: Pure Green `#00c000`).
4. **Service Worker Syntax & CSP Fix (`sw.js`)**:
   - Fix duplicate `const url` on line 65 of `sw.js` that caused `SyntaxError` and trapped the browser on outdated `v124`.
   - Add `self.skipWaiting()` and `clients.claim()` for instant activation without manual cache clearing.
5. **Vocabulary Vault Edit Button Crash (`js/admin/vocab-vault.js`)**: Fix `TypeError: Cannot set properties of null (setting 'innerHTML')` caused by mismatched cell class names (`.cell-theme-code` vs `.cell-code`).
6. **Mojibake Cleanup (`dashboard.html`)**: Clean up corrupted `â† â€™` characters into `&rarr;`.
7. **Historical Rescoring**: Safely rescore past student attempts where `"high quality"` was scored 0 for `"High-Quality"`.

---

## User Review & Decisions

> [!IMPORTANT]
> **User Directives**:
> 1. **Homophones Postponed**: Homophone dictionary (`buy/bye`, `wrap/rap`) is **EXCLUDED** from this phase per user instruction.
> 2. **Button Dynamic Grade Colors**: The button on `result.html` must **strictly follow the student's earned grade color** (`--tier-color` derived from `getGradeColorByScore`), rather than fixed arbitrary colors.
> 3. **Authoritative Button Labels**:
>    - Passed attempt (< 7 total passes): `CONTINUE THE DRILL (X/7): [TASK TITLE] →`
>    - Failed attempt (< 7 total passes): `RETRY THE DRILL (X/7): [TASK TITLE] →`
>    - 7/7 completed: `ADVANCE TO NEXT TASK: [C2 WORDS / PHRASES] →`
> 4. **Spelling Mode ("b u y" &rarr; "buy")**: Evaluated via compact comparison (`stripAllPunctuationAndSpaces`) across both spoken and written modalities. If the letters match the target word, it is scored **1.0 pt (correct)**.

---

## Proposed Changes

### Component 1: Result Page 7x Repetition Drill Loop & Dynamic Grade Color (`js/result.js`, `css/result.css`)

#### [MODIFY] `js/result.js`
- In `determineNextMilestone()`:
  - Fetch class test settings using `fetchClassTestSettings(currentClassId)` (default `taskRepetitions: 7`, `taskMinScore: 70`).
  - For non-exam tasks (`!curIsExam`):
    Count student passes on the current task:
    `currentPassCount = allAtts.filter(at => at.test_id === curAsm.id && parseFloat(at.percentage || 0) >= minScore).length;`
    Check whether the current attempt just completed was a pass:
    `const currentAttemptPassed = parseFloat(attempt.percentage || 0) >= minScore;`
  - If `currentPassCount < targetReps`:
    Keep `nextTest = curAsm;`!
    Determine tag based on user directive:
    ```javascript
    const actionTag = currentAttemptPassed
      ? `CONTINUE THE DRILL (${currentPassCount}/${targetReps}):`
      : `RETRY THE DRILL (${currentPassCount}/${targetReps}):`;
    ```
    And when `currentPassCount >= targetReps`:
    ```javascript
    const actionTag = `ADVANCE TO NEXT TASK:`;
    ```
  - **Dynamic Grade Color Inheritance**:
    Ensure `.btn-next-milestone` dynamically inherits the attempt's grade color:
    ```javascript
    const gradeColor = getGradeColorByScore(attempt.effective_score ?? attempt.percentage);
    btn.style.setProperty('--tier-color', gradeColor);
    btn.style.borderColor = gradeColor;
    btn.style.boxShadow = `0 4px 14px ${gradeColor}55`;
    ```
  - Clicking the button directly restarts the same drill (`test.html?id=${curAsm.id}`) without returning to the lobby.

---

### Component 2: Service Worker Fix & Instant Activation (`sw.js`, `scripts/check_all_js_syntax.cjs`)

#### [MODIFY] `sw.js`
- Remove duplicate `const url = new URL(event.request.url);` on line 65.
- Add instant activation in `sw.js`:
  ```javascript
  self.addEventListener('install', event => {
    self.skipWaiting();
    // caching logic...
  });

  self.addEventListener('activate', event => {
    event.waitUntil(clients.claim());
    // cache cleanup logic...
  });
  ```
- Bypass third-party origins (`if (url.origin !== self.location.origin) return;`) so Google Fonts load natively without CSP or fetch interception.

#### [MODIFY] `scripts/check_all_js_syntax.cjs`
- Include `sw.js` and root `.js` files in syntax validation so any syntax error in Service Worker is caught during `npm test`.

---

### Component 3: Answer Tolerance & Letter Spelling Engine (`js/grading.js`, `js/api.js`, `supabase/migrations/`)

#### [MODIFY] `js/grading.js`
- In `cleanPunctuationAndSymbols(text)`:
  - Replace hyphens (`-`, `–`, `—`) and punctuation with spaces.
  - Collapse multiple spaces and trim.
- In `stripAllPunctuationAndSpaces(text)`:
  - Strips all non-alphanumeric characters: `String(text ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')`.
- In `evaluateAnswer(studentAnswer, rawCorrectAnswer, answerType)`:
  - **Letter Spelling / Space Ignorance**:
    Compare `compactStudent === compactOpt`:
    - `"b u y"` &rarr; `"buy"` == `"buy"` &rarr; **`correct` (1.0 pt)**!
    - `"w r a p"` &rarr; `"wrap"` == `"wrap"` &rarr; **`correct` (1.0 pt)**!
    - `"b. u. y."` &rarr; `"buy"` == `"buy"` &rarr; **`correct` (1.0 pt)**!
    - `"high quality"` &rarr; `"highquality"` == `"high-quality"` &rarr; **`correct` (1.0 pt)**!
  - Normalize multi-word spaced letter sequences so students who spell aloud via microphone are scored 100% correctly.

#### [MODIFY] `js/api.js`
- In line 1780, pass the actual `answerType` (`row.question_snapshot?.answer_type || row.question_type_snapshot || 'written'`) to `evaluateAnswer`.

#### [NEW] `supabase/migrations/20261105080000_upgrade_answer_tolerance_and_spelling.sql`
- Update `clean_answer_text(p_text)` and `strip_answer_symbols(p_text)`.
- Update `emergency_submit_attempt` RPC so it performs:
  1. `v_norm_student = v_cand_clean`
  2. `v_compact_student = v_cand_compact` (handles `"highquality" = "highquality"` and `"buy" = "buy"`)
  Ensuring server-side PostgreSQL scoring is 100% identical to client scoring.

---

### Component 4: Vocabulary Vault Edit Button Crash Fix (`js/admin/vocab-vault.js`)

#### [MODIFY] `js/admin/vocab-vault.js`
- In `tbody.innerHTML` (line 346):
  Adjust row rendering and selectors:
  ```html
  <td class="cell-theme-code" style="padding: 6px 8px; font-weight: 500;"><span style="color:#a5b4fc;font-family:monospace;font-size:11px;font-weight:700;">${escapeHtml(w.theme_code || '—')}</span></td>
  <td class="cell-topic-code" style="padding: 6px 8px; font-weight: 500;"><span style="color:#a5b4fc;font-family:monospace;font-size:11px;font-weight:700;">${escapeHtml(w.topic_code || '—')}</span></td>
  ```
- Add robust null guards for every cell before setting `.innerHTML`:
  ```javascript
  const themeCodeCell = tr.querySelector('.cell-theme-code');
  if (themeCodeCell) themeCodeCell.innerHTML = '...';
  const topicCodeCell = tr.querySelector('.cell-topic-code') || tr.querySelector('.cell-code');
  if (topicCodeCell) topicCodeCell.innerHTML = '...';
  ```
- Fix table header to include Theme Code and Topic Code columns or adapt row to match existing headers.

---

### Component 5: Mojibake Cleanup (`dashboard.html`)

#### [MODIFY] `dashboard.html`
- Replace `â† â€™` on lines 487 and 542 with clean `&rarr;`.

---

### Component 6: Historical Rescoring Script (`scripts/rescore_hyphen_answers.mjs`)

#### [NEW] `scripts/rescore_hyphen_answers.mjs`
- Safe & idempotent: Only updates answers where previous score was `0` and new evaluation produces `1.0`.
- Updates `attempt_answers` and recalculates attempt total points, percentage, and grade.
- Outputs detailed log of corrected records.

---

## Verification Plan

### Automated Tests
1. **Answer Tolerance & Spelling Test**:
   `node scripts/test_answer_tolerance_and_spelling.mjs`
   - `"high quality"` vs `"High-Quality"` (Written & Spoken) &rarr; `correct` (1.0 pt)
   - `"b u y"` vs `"buy"` (Spoken & Written spelling) &rarr; `correct` (1.0 pt)
   - `"b. u. y."` vs `"buy"` &rarr; `correct` (1.0 pt)
   - `"w r a p"` vs `"wrap"` &rarr; `correct` (1.0 pt)
   - `"high-quality"` vs `"high quality"` &rarr; `correct` (1.0 pt)
2. **Syntax Validation**:
   `node scripts/check_all_js_syntax.cjs` (verifies `sw.js` + 42 JS files) &rarr; ALL PASS.
3. **Full Test Suite**:
   `npm test` &rarr; PASS 100%.

### Manual Verification
1. On `result.html`:
   - Complete attempt with score $\ge$ 70%: button says `CONTINUE THE DRILL (X/7): [TITLE] →` with dynamic grade color.
   - Complete attempt with score < 70%: button says `RETRY THE DRILL (X/7): [TITLE] →` with dynamic grade color.
   - When 7/7 passes reached: button says `ADVANCE TO NEXT TASK: [C2 WORDS / PHRASES] →`.
   - Clicking button directly restarts the drill without going to lobby.
2. Console on `result.html`: No CSP errors, no Service Worker `TypeError` errors.
3. Vocabulary Vault (`admin.html#vocab_vault`): Click edit button (`✎`), inputs render, save works.
4. `dashboard.html`: No `â† â€™` characters.
5. Student attempt history: `"high quality"` now displays green / 1.0 pt.
