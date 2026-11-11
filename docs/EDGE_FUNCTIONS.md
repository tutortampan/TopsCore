# TopsCore LMS — Edge Functions & Attempt Engine Contract

> **Architecture:** Stateless Edge Functions & Supabase Backend Layer  
> **Source of Truth for Implementations:** `supabase/functions/` and `js/grading.js`

---

## 1. High-Risk Edge Functions
At minimum, the server architecture implements:
- `start-exam`: Validates eligibility, creates attempt, captures immutable question snapshots.
- `save-answer`: Records student answer state progressively.
- `submit-exam`: Idempotent completion, evaluation, and grading.
- `calculate-result`: Authoritative scoring and progression updates.
- `import-students`: Transaction-safe batch student ingestion.
- `import-questions`: Validation and insertion of question banks.

---

## 2. Edge Function Response Contract
Every Edge Function adheres to a standardized response envelope:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "request_id": "uuid-v4"
}
```

Structured error shape:
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "EXAM_NOT_ELIGIBLE",
    "message": "Student is not eligible to start this exam."
  },
  "request_id": "uuid-v4"
}
```
*Never return raw stack traces or database connection secrets to production clients.*

---

## 3. Exam Attempt Lifecycle Engine

### 3.1 Start Attempt Flow
1. Verify student authentication and active status.
2. Verify test is `PUBLISHED`.
3. Verify institution, program, class, and unlocked level access.
4. Verify prerequisites and retake bounds.
5. Create immutable question snapshots (questions, answer options, accepted answers).
6. Return sanitized attempt payload (*without answer keys*).

### 3.2 Duplicate Prevention & Resume Flow
- **Uniqueness**: Prevent accidental concurrent attempts (max 1 active attempt per student + test).
- **Resume on Reload**: Browser refresh resumes existing `IN_PROGRESS` attempt; recalculates remaining time from server timestamps (`started_at`, `expected_end_at`). Never creates duplicate attempts.

### 3.3 Submit Idempotency Flow
1. Verify attempt status and ownership.
2. Server validates deadline on save/submit.
3. If already `SUBMITTED`, return existing persisted result immediately (idempotent).
4. Evaluate snapshot answers against tolerance rules in `js/grading.js`.
5. Calculate percentage, score, and grade symbol.
6. Atomically persist result and update student class progress.

---

## 4. Centralized Scoring, Grading & Progression Services

All evaluation algorithms are centralized in `js/grading.js` and server functions:
- `evaluateAnswer()`: Unified answer evaluation matrix (Exact, Damerau-Levenshtein $\le 2$, Word Form, Partial).
- `calculateGrade()`: Official grading scale (★, A, B, C, D, E).
- `calculateOverallScore()`: Average of completed, takeable tests.

