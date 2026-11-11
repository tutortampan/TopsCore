# Implementation Plan — Points-First Leaderboard Ranking, Score > 100% Elimination, and Database Effective Score Sanitization

> **Status: [IMPLEMENTED] (SUDAH) — CLOSED / ARCHIVED** (All planned components fully implemented, 241 database rows sanitized, tested, verified, and active in production with cache buster `v=20261105_v128` and SW cache `v56`).

## Goal Description
Resolve critical score distortion, false Star (`★`) grade tier inflation, and leaderboard ranking inversions reported by the user across the student dashboard and result page:
1. **Leaderboard Ranking Inversion (Image 1)**: Students with higher points were placed below students with lower points (e.g. Miss Adinda with **243 PTS** was ranked **#5**, while Mr. Lalu Yuda with **353 PTS** was ranked **#6**). The leaderboard table header explicitly reads `POINT | GRADE`, so ranking MUST prioritize **Total Points (`totalPoints`)** first.
2. **Universal Star (`★`) Grade Distortion (Image 1)**: Every student in the batch leaderboard showed Grade `★` (Star tier) and green badges regardless of real score.
3. **Score > 100% Glitch (Image 2 - Laura Fardila)**: On `result.html`, Miss Laura Fardila completed *3rd Vocabulary B Words Exam - Tourism* with 135 correct, 16 partial, 129 incorrect (143 points out of 280 total questions = 51.1%), but the page rendered **`143%`**, Grade **`★`**, and Predicate **`EXCELLENT`**.

---

## Root Cause Analysis

### 1. The Score > 100% & Universal Star (`★`) Root Cause
- In the Supabase `attempts` table, `effective_score` represents the **Effective Score Percentage (0.0 to 100.0)** used for authoritative grading (capped at 60.0% if remedial, otherwise matching `percentage`).
- However, in `js/api.js` (lines 4075 and 4098) inside `batchSaveManualScores`:
  ```javascript
  score: sc,
  total_questions: totalQ,
  percentage: pct,
  effective_score: sc, // <-- BUG! Wrote raw points (sc) into effective_score instead of percentage (pct)!
  ```
  Whenever exams with $> 100$ questions (e.g., 120, 280, 480, 640 questions) were saved or synced, **190 attempt rows** in the database had `effective_score` populated with the raw point count (`143`, `258`, `264`, `506`).
- **On `result.html`**:
  [`js/result.js`](file:///d:/Tutor%20Tampan/TopsCore/js/result.js#L719) resolved:
  `const pct = isRemedial ? Math.min(rawPct, 60.0) : parseFloat(attempt.effective_score ?? rawPct);`
  Because `effective_score` was 143, `pct` was rendered as **`143%`**! And because `143 >= 100`, `getGrade(143)` evaluated to **`★`** (`EXCELLENT`).
- **On `dashboard.html`**:
  [`js/dashboard.js`](file:///d:/Tutor%20Tampan/TopsCore/js/dashboard.js#L2924) resolved `effPct = parseFloat(att.effective_score ?? rawPct)`. For students like Sari Hikmah (Exam B = 264) and Havvina Solehah (Exam B = 258), their overall exam average was calculated as **182%** and **176.5%** (> 100%), assigning **`★`** to every student on the leaderboard!

### 2. The Ranking Inversion Root Cause
- In [`js/dashboard.js`](file:///d:/Tutor%20Tampan/TopsCore/js/dashboard.js#L3042), the sorting algorithm prioritized `progressPct` (percentage of completed tasks) as the primary sort key:
  ```javascript
  // 1. Primary: PROG % DESC
  const progA = Number(a.progressPct ?? 0);
  const progB = Number(b.progressPct ?? 0);
  if (progA !== progB) return progB - progA;
  ```
- Because Adinda completed 13 tests (68% Progress, 243 PTS) and Lalu Yuda completed 12 tests (63% Progress, 353 PTS), Adinda was sorted above Lalu Yuda despite having 110 fewer points.
- On a standings leaderboard displaying `NO | STUDENTS NAME | POINT | GRADE`, students and teachers expect strict descending points order (385 > 366 > 364 > 353 > 353 > 347 > 325 > 324 > 288 > 243).

---

## User Review Required

> [!IMPORTANT]
> **Authoritative Ranking Hierarchy**:
> Standings leaderboard ranking will be strictly ordered by:
> 1. **Primary: Total Points (`totalPoints`) DESC** — The student with the most points earned in the class is ranked highest.
> 2. **Secondary: Overall Exam Score % (`overallScore`) DESC** — Tie-breaker when two students have the exact same points (e.g. Havvina Solehah 353 pts vs Lalu Yuda 353 pts).
> 3. **Tertiary: Curriculum Progress % (`progressPct`) DESC** — Tie-breaker when both points and exam scores are identical.
> 4. **Quaternary: Earliest Last Submission Timestamp (`lastSubmittedAt`) ASC** — The student who reached the milestone first ranks higher.
> 5. **Quinquenary: Alphabetical Clean Name ASC** — Deterministic fallback.

> [!IMPORTANT]
> **Score Percentage Clamping**:
> Percentage on `result.html` and `dashboard.html` is strictly bounded to `[0.0, 100.0]`. If database records contain raw points in `effective_score` (> 100), the frontend defensively falls back to `percentage` (`(score / total_questions) * 100`).

---

## Proposed Changes

### Component 1: Fix Ranking Algorithm to Points-First Hierarchy (`js/dashboard.js`, `scripts/test_student_dashboard_exam_parity.mjs`)

#### [MODIFY] [`js/dashboard.js`](file:///d:/Tutor%20Tampan/TopsCore/js/dashboard.js)
1. In `renderBatchLeaderboard` (lines ~3041-3067):
   Update sorting to prioritize Total Points first:
   ```javascript
   // 4. Deterministic Multi-Tier Ranking (Points-First Standings Hierarchy):
   // Standings columns are NO | STUDENTS NAME | POINT | GRADE.
   // Higher points must always rank higher!
   studentStats.sort((a, b) => {
     // 1. Primary: Global PTS DESC (total exam points)
     const ptsA = Number(a.totalPoints ?? 0);
     const ptsB = Number(b.totalPoints ?? 0);
     if (ptsA !== ptsB) return ptsB - ptsA;

     // 2. Secondary: Global SCORE % DESC (exam mastery percentage)
     const scoreA = Number(a.overallScore ?? 0);
     const scoreB = Number(b.overallScore ?? 0);
     if (scoreA !== scoreB) return scoreB - scoreA;

     // 3. Tertiary: PROG % DESC (overall curriculum progress)
     const progA = Number(a.progressPct ?? 0);
     const progB = Number(b.progressPct ?? 0);
     if (progA !== progB) return progB - progA;

     // 4. Earliest last submission timestamp
     if (a.lastSubmittedAt && b.lastSubmittedAt) {
       const diff = new Date(a.lastSubmittedAt) - new Date(b.lastSubmittedAt);
       if (diff !== 0) return diff;
     }

     // 5. Alphabetical clean name
     return a.cleanName.localeCompare(b.cleanName, undefined, { sensitivity: 'base' });
   });
   ```
2. In `renderBatchLeaderboard` (lines ~2920-2928):
   Prevent `effPct` from taking point values > 100:
   ```javascript
   const rawPct = Math.min(100.0, Math.max(0.0, parseFloat(att.percentage || 0)));
   const isRemedial = Boolean(att.is_remedial_unlocked);
   let effPct = rawPct;
   if (att.effective_score != null) {
     const parsedEff = parseFloat(att.effective_score);
     if (parsedEff <= 100.0) effPct = parsedEff;
   }
   if (isRemedial) effPct = Math.min(effPct, 60.0);
   ```
3. In `renderBatchLeaderboard` (line ~3009):
   Clamp `overallScore` to `[0, 100]`:
   ```javascript
   const overallScore = validExamItems.length > 0
     ? Math.min(100, Math.max(0, Math.round(validExamItems.reduce((sum, e) => sum + Number(e.effPct ?? e.pct ?? 0), 0) / validExamItems.length)))
     : 0;
   ```

#### [MODIFY] [`scripts/test_student_dashboard_exam_parity.mjs`](file:///d:/Tutor%20Tampan/TopsCore/scripts/test_student_dashboard_exam_parity.mjs)
- Update `rankStudents` helper to sort by `totalPoints` first, then `overallScore`, then `progressPct`.
- Update test assertions so tests verify that students with more points rank above students with fewer points.

---

### Component 2: Fix `result.js` Score Percentage & Grade Resolution (`js/result.js`)

#### [MODIFY] [`js/result.js`](file:///d:/Tutor%20Tampan/TopsCore/js/result.js)
In `renderResultHeader()` (lines ~715-730):
```javascript
const rawPct = Math.min(100.0, Math.max(0.0, parseFloat(attempt.percentage || 0)));
const isRemedial = Boolean(attempt.is_remedial_unlocked);

// SAFE EFFECTIVE SCORE RESOLUTION:
// effective_score represents percentage (0.0 to 100.0), NEVER raw question points!
// If database contains raw points (> 100), fall back to rawPct.
let effPct = rawPct;
if (attempt.effective_score != null) {
  const parsedEff = parseFloat(attempt.effective_score);
  if (parsedEff <= 100.0) {
    effPct = parsedEff;
  }
}
const pct = isRemedial ? Math.min(effPct, 60.0) : Math.min(effPct, 100.0);
const grade = getGrade(pct);
```
- Eliminates any possibility of `143%` or false `★` grade appearing on the result page.
- Miss Laura Fardila's result will display:
  - **POINTS**: `143`
  - **SCORE**: `51.1%` (or `51%`)
  - **GRADE**: `D`
  - **PREDICATE**: `LESS` (Dark Orange `#FF8C00`)

---

### Component 3: Fix `batchSaveManualScores` in `js/api.js` (`js/api.js`)

#### [MODIFY] [`js/api.js`](file:///d:/Tutor%20Tampan/TopsCore/js/api.js)
In `batchSaveManualScores` (lines 4075 and 4098):
Replace `effective_score: sc` with `effective_score: pct`:
```javascript
// Before (BUG):
effective_score: sc,

// After (FIXED):
effective_score: pct,
```
This ensures that any future manual score entry or offline exam sync in Admin Class Hub will save the percentage (`pct`) into `effective_score`, not the point count (`sc`).

---

### Component 4: Database Sanitization Script (`scripts/sanitize_attempts_effective_score.mjs`)

#### [NEW] `scripts/sanitize_attempts_effective_score.mjs`
- Connects to Supabase Cloud PostgreSQL.
- Queries all attempts where `effective_score > 100` OR `Math.abs(effective_score - expectedPercentage) > 0.05`.
- Recalculates:
  ```javascript
  const rawPct = Math.min(100.0, Math.max(0.0, Number(att.percentage || 0)));
  const isRem = Boolean(att.is_remedial_unlocked);
  const trueEffectiveScore = isRem ? Math.min(rawPct, 60.0) : rawPct;
  const trueGrade = calculateGrade(trueEffectiveScore);
  ```
- Updates `effective_score: trueEffectiveScore` and `grade: trueGrade` in `attempts`.
- Specifically repairs Laura Fardila's attempt (`452540aa-3b61-4224-8b61-f38ac1fa954e`) and all 190 affected records.

---

### Component 5: Automated Verification & Cache Buster Bump

- Run `node scripts/sanitize_attempts_effective_score.mjs`.
- Run `node scripts/test_student_dashboard_exam_parity.mjs`.
- Run `node scripts/check_all_js_syntax.cjs`.
- Run `npm test`.
- Bump cache busters to `v=20261105_v128` across HTML and JS files; bump Service Worker cache name to `topscore-cache-option-a-v56`.
- Update `docs/CHANGELOG.md`, `docs/CURRENT_STATE.md`, and `docs/SESSION_LOG.md`.

---

## Verification Plan

### Automated Tests
1. **Database Audit & Sanitization**:
   `node scripts/sanitize_attempts_effective_score.mjs` &rarr; 190 rows updated, 0 rows remaining with `effective_score > 100`.
2. **Dashboard Exam Parity & Points-First Ranking Test**:
   `node scripts/test_student_dashboard_exam_parity.mjs` &rarr; PASS 100%.
   - Student with 353 points ranks above student with 243 points.
   - Suke (90 pts) ranks below Sofa (163.5 pts) in points-first standings.
3. **Syntax Validation**:
   `node scripts/check_all_js_syntax.cjs` &rarr; 45/45 JS files pass.
4. **Full Test Suite**:
   `npm test` &rarr; PASS 100%.

### Manual Verification
1. **Result Page (`result.html`)**:
   - Open Laura Fardila's attempt:
     - Score percentage displays `51.1%` (NOT `143%`).
     - Grade displays `D` (Dark Orange, NOT `★` Green).
     - Predicate displays `LESS` (NOT `EXCELLENT`).
2. **Student Dashboard Standings (`dashboard.html`)**:
   - Ranks are in strict descending order of points:
     - Sari Hikmah: 364 PTS
     - Lalu Yuda / Havvina: 353 PTS
     - Adinda Karunia: 243 PTS (ranked below 353 PTS, NOT above).
   - Grade chip displays authentic grades (A, B, C, D, E) instead of all students having Star (`★`).
