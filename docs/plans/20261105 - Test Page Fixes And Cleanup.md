# Implementation Plan — Test & Result Pages Diagnostics, Cleanup & Navigation Overhaul

> **Status: [IMPLEMENTED] (SUDAH) — CLOSED / ARCHIVED** (All planned components fully implemented and verified in Phase 314).

## Goal Description
Resolve all reported errors, redundant elements, layout overflows, and UX defects across both the **Test Page** (`test.html`) and **Result Page** (`result.html`):
1. **Test Page Console & Network Errors**: Diagnose and eliminate the browser-level CORS preflight error on `start-test` and aborted `HEAD` requests.
2. **Test Page Yellow Pacing Badge Removal**: Remove the unprompted pacing indicator (`⚡ ~20s/q`) beside the countdown timer.
3. **Test Page Part-of-Speech Cleanup**: Eliminate the redundant `[ ADJECTIVE ]` badge inside the question card, keeping the 4-cell metadata grid below the question card intact.
4. **Test Page Next Button Overhaul**: Restore consistent button styling (`btn-nav-next`, matching `48px` height, colors, and typography of `btn-nav-prev`) and fix navigation logic so that clicking "Next" navigates sequentially (`idx + 1`) rather than skipping answered questions.
5. **Result Page CSP & Service Worker Errors**: Fix Content Security Policy `connect-src` violations and Service Worker `TypeError: Failed to convert value to 'Response'` when fetching Google Fonts.
6. **Result Page Next Assessment Button Overflow Fix**: Adjust the `.result-action-slot` and `.btn-next-milestone` box dimensions and typography to prevent long assessment titles from overflowing outside the button borders, and correct the spelling of `"ASSESSMENT"`.

---

## User Review Required
> [!IMPORTANT]
> **Edge Function vs Direct Client Fallback**:
> In the Supabase cloud project (`https://oclajpyumehpojepcczg.supabase.co`), Supabase Edge Functions (`start-test`, `submit-test`, etc.) have not been deployed. When `api.js` attempts to call `start-test`, Cloudflare/Supabase responds with HTTP 404 without standard CORS headers, generating a browser-level red error in Chrome DevTools (`net::ERR_FAILED`). TopsCore already has a full, verified client DB fallback in `api.js` that succeeds immediately. We propose providing a direct client DB mode/bypass check so the client does not make an unnecessary failing network preflight call when Edge Functions are offline.

> [!NOTE]
> **Next Assessment Button on Result Page**:
> Currently, the Next Milestone button is strictly constrained to `40px` height while containing two stacked blocks: `GO TO NEXT ASSESMENT:` (typo included) and a long title such as `2ND VOCABULARY C4 WORDS TASK - BUDGETING & TRIP PLANNING ➔` at 13px bold text. This causes the text to burst out of the box and overlap the top and bottom red border. We will adjust the height to `44px` and set proportional typography (`8.5px` tag, `11px` title) with `line-height: 1.15`, ensuring any title fits cleanly inside the box borders with balanced padding.

---

## Open Questions
- None. All requirements have been visually verified from the screenshots and reproduced with diagnostic scripts.

---

## Proposed Changes

### Component 1: Test Page — Pacing Badge Removal (`test.html`, `js/test.js`, `css/test.css`)

#### [MODIFY] [test.html](file:///d:/Tutor%20Tampan/TopsCore/test.html)
- Remove `<div class="test-pacing-badge hidden" id="test-pacing-indicator" ...>...</div>` from `.test-timer-wrap`.

#### [MODIFY] [js/test.js](file:///d:/Tutor%20Tampan/TopsCore/js/test.js)
- Remove `updatePacingBadge` function and its invocation inside `startCountdown` tick callback.

#### [MODIFY] [css/test.css](file:///d:/Tutor%20Tampan/TopsCore/css/test.css)
- Remove `.test-pacing-badge`, `.pace-comfortable`, `.pace-moderate`, `.pace-urgent`, and `.pacing-icon` CSS declarations.

---

### Component 2: Test Page — Part-of-Speech Badge Elimination (`js/test.js`)

#### [MODIFY] [js/test.js](file:///d:/Tutor%20Tampan/TopsCore/js/test.js)
- In `renderQuestion`:
  - In Written mode prompt box (around line 1838), remove `${displayType ? '<div ...>[ ' + displayType + ' ]</div>' : ''}`.
  - In Spoken / MCQ prompt box (around line 1893), remove `${displayType ? '<div ...>[ ' + displayType + ' ]</div>' : ''}`.
- Keep the 4-cell metadata grid (`metadataTable`) intact, which already displays the Theme, Category, Topic, and Part of Speech / Type.

---

### Component 3: Test Page — Next Button Style & Navigation Fix (`js/test.js`, `css/test.css`)

#### [MODIFY] [js/test.js](file:///d:/Tutor%20Tampan/TopsCore/js/test.js)
- Fix button class preservation and sequential click logic in `renderQuestion`:
  - Maintain `.btn-nav-next` class (height `48px`, padding `0 14px`, border, and color `#38bdf8`), matching `.btn-nav-prev`.
  - When regular "Next ➔": `onclick = () => { saveCurrentAnswer(); if (idx < answerRows.length - 1) { renderQuestion(idx + 1); } }`.
  - When on the last question of a non-final section: text becomes `Next Sec ➔`, class `btn-nav-next is-next-sec`, `onclick = () => nextSection()`.
  - When on the last question of the final section: text becomes `Submit 📋`, class `btn-nav-next is-submit`, `onclick = () => { saveCurrentAnswer(); openSubmitModal(); }`.

#### [MODIFY] [css/test.css](file:///d:/Tutor%20Tampan/TopsCore/css/test.css)
- Add styling for `.btn-nav-next.is-submit` and `.btn-nav-next.is-next-sec` to ensure they maintain strict `48px` height, border radius, and flexbox alignment with clear visual contrast.

---

### Component 4: Test Page — Console Error Suppression & Query Optimization (`js/api.js`, `js/supabase.js`)

#### [MODIFY] [js/api.js](file:///d:/Tutor%20Tampan/TopsCore/js/api.js)
1. **Edge Function Fallback Circuit Breaker**:
   - In `callEdgeFunction`, catch failed endpoints and record offline status so repeated calls do not fire preflight OPTIONS requests that trigger browser `net::ERR_FAILED` CORS warnings.
   - For `startTest`: if `ENABLE_EDGE_START_TEST` is false or the function is offline, seamlessly route through the verified client DB fallback with zero red console errors.
2. **PostgREST HEAD Request Optimization**:
   - Line 1578: Change `sb.from('attempts').select('*', { count: 'exact', head: true })` to `sb.from('attempts').select('id', { count: 'exact', head: false }).limit(1)`, preventing `HEAD` request abortions (`net::ERR_ABORTED`).

---

### Component 5: Result Page — CSP & Service Worker Error Fixes (`sw.js`, `netlify.toml`)

#### [MODIFY] [sw.js](file:///d:/Tutor%20Tampan/TopsCore/sw.js)
- Add early return in `fetch` handler for third-party origins (such as `fonts.googleapis.com` and `fonts.gstatic.com`):
  ```javascript
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    return; // Let browser natively fetch fonts via <link> without triggering Service Worker connect-src CSP restrictions
  }
  ```
- In `.catch()` handlers, ensure a valid `Response` object is always returned instead of `undefined`, eliminating `Uncaught (in promise) TypeError: Failed to convert value to 'Response'`.

#### [MODIFY] [netlify.toml](file:///d:/Tutor%20Tampan/TopsCore/netlify.toml)
- Update `Content-Security-Policy` header on line 80:
  - Add `https://fonts.googleapis.com https://fonts.gstatic.com` to `connect-src`.

---

### Component 6: Result Page — Next Assessment Button Border Overflow Fix (`css/result.css`, `js/result.js`)

#### [MODIFY] [js/result.js](file:///d:/Tutor%20Tampan/TopsCore/js/result.js)
- Correct typo: `<span class="next-btn-tag">GO TO NEXT ASSESMENT:</span>` -> `<span class="next-btn-tag">GO TO NEXT ASSESSMENT:</span>` (lines 477, 496).

#### [MODIFY] [css/result.css](file:///d:/Tutor%20Tampan/TopsCore/css/result.css)
- Update `.result-action-slot` and `.btn-next-milestone`:
  - Increase height from `40px` to `44px` (`min-height: 44px !important; height: 44px !important; max-height: 44px !important;`).
  - Set `.next-btn-tag`: `font-size: 8.5px !important; line-height: 1 !important; letter-spacing: 0.06em !important; margin-bottom: 2px !important;`.
  - Set `.next-btn-title`: `font-size: 11px !important; line-height: 1.15 !important; font-weight: 800 !important; max-width: 100% !important; text-align: center !important;`.
- Ensure total content height is ~32px, fitting comfortably inside the 44px border with 6px vertical breathing room and zero overflow.

---

## Verification Plan

### Automated Tests
1. **Syntax Check**:
   ```bash
   node scripts/check_all_js_syntax.cjs
   ```
2. **E2E Playwright Diagnostic**:
   - Run verification on `test.html?id=1667e0e0-19aa-4a34-86a7-7c1d8d4d97be`:
     - Zero console errors (`pageerror`, `net::ERR_FAILED`, red CORS).
     - Yellow pacing badge `#test-pacing-indicator` absent from DOM.
     - Part-of-speech badge absent from question prompt box.
     - Next button `#bottom-next-btn` dimensions match Prev button (`height: 48px`, class `btn-nav-next`).
     - Clicking Next advances from question 0 to question 1 sequentially.
   - Run verification on `result.html?attempt_id=d922cd91-6ef4-4b85-9cea-ffb344887e95`:
     - Zero CSP violations or Service Worker `TypeError` in console.
     - `#btn-next-milestone` text `"GO TO NEXT ASSESSMENT:"` spelling is correct.
     - `#btn-next-milestone` content is strictly contained within its borders (`scrollHeight <= offsetHeight`).
3. **Full Regression Suite**:
   ```bash
   npm test
   ```

### Manual Verification
- Open `test.html`:
  - Inspect console: completely clean.
  - Timer: only Avatar, Saved, and Timer badge.
  - Question: only the word prompt, no `[ ADJECTIVE ]`.
  - Bottom bar: `Prev`, `0/40 Answered`, and `Next` buttons cleanly aligned.
- Open `result.html`:
  - Inspect console: zero red CSP/SW font errors.
  - Look at the `GO TO NEXT ASSESSMENT` button: text is completely inside the box borders with proper padding and correct spelling.
