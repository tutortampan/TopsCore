# TopsCore LMS — AGENTS.md

> **Purpose:** This file is the execution contract for an AI coding agent (including Antigravity) that builds, modifies, tests, and maintains the TopsCore LMS application.
>
> **Primary requirement:** The project must remain restartable. Every meaningful change must be documented so a new or returning agent can continue from the exact known state without relying on conversation history.
>
> **Architecture:** Static HTML + CSS + modular JavaScript frontend, Supabase PostgreSQL + Storage + Auth/Edge Functions backend, deployable with Netlify/Vercel for the frontend and Supabase for backend services. **Do not introduce Django, Docker, Redis, Celery, or a separate traditional backend unless the user explicitly changes the architecture.**

---

# 0. EXECUTION AUTHORITY

The AI agent MUST treat the following sources in this order of authority:

1. Direct user requirements in the current task.
2. This `AGENTS.md`.
3. `docs/PRODUCT_SPEC.md` (when created/maintained).
4. `docs/DECISIONS.md`.
5. Existing database migrations and tested application behavior.
6. Existing implementation code.

When sources conflict:

- Do not silently choose.
- Stop before making a destructive architectural change.
- Record the conflict in `docs/BLOCKERS.md`.
- Propose the smallest safe resolution.
- Update the affected specification, decision record, implementation, and tests together after the resolution is approved.

**Never infer a new business rule merely because it is technically convenient.**

## 0.1 Command Execution Authority
The user has granted standing, unconditional permission to execute all `powershell` commands proactively for diagnostics, verification, health checks, database queries, and test scripts across the workspace without requesting confirmation each time.

---

# 1. PRODUCT

## 1.1 Name

TopsCore

## 1.2 Product Type

Online English learning and testing platform.

## 1.3 Core hierarchy

```text
INSTITUTION
  └── PROGRAM
        ├── BATCHES
        │     └── STUDENTS (Grouped by Batch)
        │
        └── CLASSES (Formerly 'Subjects')
              └── TESTS (Quizzes & Exams)
                    └── MODULES (AI Evaluation Engines)

STUDENT + TEST
  └── ATTEMPT
        └── ATTEMPT ANSWER

STUDENT + CLASS
  └── PROGRESS
```

## 1.4 Roles

### ADMIN

Can manage:
- Institutions
- Programs
- Classes
- Levels
- Students
- Student imports (into Batches)
- Tests (Quizzes & Exams)
- Test access assignments (to Batches or Students)
- Questions
- Question imports/exports
- Test publishing/unpublishing
- Results and attempt inspection
- Website settings/background
- Admin security
- Audit logs

### STUDENT

Can:
- log in using INSTITUTION + PROGRAM + Name + personal PIN
- complete first-login photo setup when required
- select assigned Classes
- view unlocked Levels
- start eligible published Tests (Quizzes & Exams)
- answer questions
- resume an interrupted Attempt
- submit an Attempt
- view Results
- view Progress
- view own history

Students MUST NOT be trusted to calculate or submit authoritative score, grade, progression, eligibility, attempt limits, or timer state.

---

# 2. NON-NEGOTIABLE BUSINESS RULES

These are implementation rules, not suggestions.

## 2.1 Admin primary navigation

The admin navigation uses the **ABCD System** hierarchy:
1. `A — ADMIN` (Executive Dashboard, Profiles, etc.)
2. `B — BOARD` (Batches, Rosters, Progress)
3. `C — CLASS` (Classes, Levels, Topics, Tests, Banks, Vaults)
4. `D — DATA`

Do not attempt to merge or erase this hierarchy.



## 2.2 Student business ID

There is **no business-facing Student ID**.

Use only an internal database primary key/UUID.

Never request or display Student ID in:
- login
- CRUD forms
- student lists
- imports
- exports
- student-facing pages

## 2.3 Student login

```text
INSTITUTION
  ↓
PROGRAM
  ↓
STUDENT NAME
  ↓
PERSONAL PIN
  ↓
LOGIN
```

Server MUST verify that:
- the selected PROGRAM belongs to the selected INSTITUTION;
- the Student belongs to the selected PROGRAM;
- the Student is active;
- the PIN is valid.

Never store plaintext PINs.
Never put plaintext PINs in logs or audit records.

## 2.4 Class and Level Assignment

Classes (Subjects) are assigned to a **Level** (e.g., Telling Story 1 belongs to 1st Level).
A Student/Batch progresses through Levels.

## 2.5 Test Auto-Assignment (Level-Centric)

Tests (Quizzes & Exams) are created within a **Class**.
Because that Class belongs to a **Level**, the system automatically assigns the test to any Batch/Student that has unlocked that Level. 
There is NO manual test-to-batch assignment required. Batches inherit tests automatically based on their current Level.

### Important naming note

The approved display-name formula includes PROGRAM:

```text
INSTITUTION + PROGRAM + CLASS + LEVEL + TEST TYPE + TEST TITLE
```

Because a single Test can be assigned to multiple Batches/Students, the PROGRAM text in the name is a **display/name component**, not the authorization mechanism. 

Do not silently redesign this naming decision. If the product owner later changes it, update this file + decision log + tests.

## 2.6 Test name

Approved formula:

```text
INSTITUTION + PROGRAM + CLASS + LEVEL + TEST TYPE + TEST TITLE
```

Rules:
- `INSTITUTION` comes from INSTITUTION data.
- `PROGRAM` is the approved display/name component described above.
- `CLASS` comes from Class data.
- `LEVEL` comes from Level data.
- `TEST TYPE` is either Quiz (daily formative drill) or Exam (formal scheduled test).
- `TEST TITLE` is determined by Admin.

The application SHOULD store structured fields separately and generate/display the name from those components. Do not use one concatenated string as the sole source of truth.

## 2.7 Module Progression & Prerequisites

Dynamic multi-level prerequisites supporting 0 to N parent modules.
- Minimum score thresholds apply per module.
- Aggregate average score thresholds may apply.
- Unlimited retakes bounded by availability windows (start/end date-time) and per-attempt countdown timers.
- The main report card stores HIGHEST score. 
- All attempts are recorded in attempt history.
- Global average strictly counts unopened/unattempted available modules as 0.

## 2.8 Overall score

Overall score is the average of all Tests that are:
- available/takeable for the Student under the current rules; and
- completed by the Student.

An unavailable/unassigned/unpublished test that cannot currently be taken MUST NOT enter the calculation merely because it exists in the database.

A previously completed Test remains part of the Student's historical completed score even if that Test is later unpublished.

The exact calculation must be centralized in one authoritative service/function and covered by tests.

## 2.9 Question scoring

Every question is worth **1 point**.

Answer evaluation MUST preserve question-level score and evaluation result.

## 2.10 Grade

Centralized authoritative grading (Official Grading Scale):

| Symbol | Predicate (Label) | Score Range | Main Color & Gradient | Hex Code |
|:---:|:---:|:---:|:---:|:---:|
| ★ | Excellent | 100% | Pure Green | `#00c000ff` (`#00c000`) |
| A | Very Good | 90% – 99% | Pure Green | `#00c000ff` (`#00c000`) |
| B | Good | 80% – 89% | Electric Lime | `#95ff00ff` (`#95ff00`) |
| C | Enough | 60% – 79% | Pure Yellow | `#FFFF00` |
| D | Less | 30% – 59% | Dark Orange | `#FF8C00` |
| E | Fail | 0% – 29% | Pure Red | `#FF0000` |

### Unified Color Rules (Single Source of Truth)
- **Single Source of Truth**: All colors must be imported from `TOPSCORE_COLORS` in `js/grading.js` and referenced via CSS variables in `css/style.css` (`--grade-*`, `--eval-*`). No hardcoded competing hex codes are permitted anywhere in the codebase.
- **Star (★) and Grade A Uniformity**: Both share the exact same base color (`#00c000ff`). Star is distinguished by the `★` symbol and an elegant green glow, while Grade A uses clean solid `#00c000ff` with the letter "A".
- **Grade Badge Text Contrast**: Inside the round badges/circles, the Star symbol `★` is WHITE (`#FFFFFF`), while letters for grades A, B, C, D, and E are deep DARK slate (`#0F172A`) for optimal, non-glare readability.
- **Dynamic Points (PTS) Coloring**: On all pages (`result.html`, `admin.html`, and `dashboard.html`), numeric points (PTS) dynamically inherit the student's exam score grade color (`getGradeColorByScore`).
- **Answer Evaluation Colors (Result Page)**: Correct = `#00c000ff` (Full point), Partial = `#FFFF00` (Half point), Incorrect = `#FF0000` (Zero).

### Non-Standard Grades Elimination
- **No Grade "S"**: 100% Star tier is strictly represented by the symbol `★` (U+2605). Grade "S" is eliminated.
- **No Grade "F"**: Fail tier (0%–29%) is strictly Grade `E`. Grade "F" is eliminated.
- **No Grade "R"**: Remedial receives Grade `C` (derived from the 60% cap). Grade "R" does not exist.

### Remedial Rules
- **Score Cap**: Maximum effective score is capped at **60%** (e.g., `Math.min(score, 60%)` or `Math.min(points, total_questions * 0.6)`).
- **Remedial 'R' Placement**: A small letter "R" (`<sup class="asm-rem-sup">R</sup>` or `ᴿ`) is displayed **ONLY** beside the **Score** percentage (e.g. `60%ᴿ` or `60%<sup>R</sup>`) on the result page (`result.html`) and the student grade page inside class (`admin.html` Class Hub). It MUST NOT appear beside Grade (which remains clean: `★`, `A`, `B`, `C`, `D`, `E`) or Point (which displays clean numbers without 'R').
- **Color Adherence**: Remedials do not receive a special standalone color override; the visual color strictly follows the score tier (at 60%, Yellow `#EAB308`).

No frontend page may independently implement a competing grading algorithm.

## 2.11 The 8 Test Evaluation Modules

The system uses 8 specific AI-evaluated modules:
1. Point & Speak! (Visual Pronouns)
2. Storytelling (Narrative Tense)
3. Conversation-based
4. Multiple Choice
5. Read Aloud / Pronunciation
6. Turn-based Roleplay (Realtime/WebSockets)
7. Speaking Performance (5 Pillars: Fluency, Pronunciation, Vocabulary, Grammar, Comprehension)
8. Vocabulary Mastery

## 2.12 AI Scoring Pipeline (Stateless)

Rules:
- Architecture: Stateless & Low-Egress.
- Supabase stores ONLY structured text/JSON (scores, metadata, transcripts).
- Media (audio/photos) is processed transiently in the browser, sent directly to the AI API for evaluation via Edge Functions, and discarded.
- Direct English Only for all user interfaces, prompts, and system messages.
- Manual Override: Teachers have optional manual override privileges.

## 2.13 Answer Tolerance & Partial Credit Engine

Authoritative evaluation rules for vocabulary and phrase assessments across Spoken and Written modes:

### Modality Tolerance Matrix
| Mistake Type | Spoken (Speech-to-Text) | Written (Typed) | Result Code |
| :--- | :---: | :---: | :---: |
| Exact match (normalized punctuation/case) | 1.0 pt | 1.0 pt | `correct` |
| 1–2 character edit distance (Damerau-Levenshtein $\le 2$) | 1.0 pt | 0.5 pt | Spoken: `correct`<br>Written: `minor_spelling_error` |
| Function word dropped/added in 4+ word idiom (`a`, `the`, `in`, etc.) | 1.0 pt | N/A | `correct` |
| Plural-s / -es mismatch across multi-word idiom | 1.0 pt | N/A | `correct` |
| Word form / Part-of-speech mismatch sharing common root (stem $\ge 5$) | 0.5 pt | 0.5 pt | `minor_word_form_error` |
| Pronoun substitution or semantic mismatch | 0.0 pt | 0.0 pt | `incorrect` |

Rules:
- Normalization: Always strip non-alphanumeric punctuation and expand contractions before evaluation.
- Pronoun Protection: Pronouns (`my`, `your`, `his`, `her`, `our`, `their`, `its`) are protected content words and must never be stripped as function words.
- Pedagogical Alignment: Beginners are granted 0.5 pt partial credit for producing the correct root/word family (`minor_word_form_error`) in both spoken and written modes.
- Single Source of Truth: Implemented strictly within `evaluateAnswer()` in `js/grading.js`.

The tolerance engine must be deterministic, tested, and server-authoritative.

## 2.14 Test lifecycle

Only `PUBLISHED` tests can be taken.

Recommended status enum:

```text
DRAFT
PUBLISHED
UNPUBLISHED
ARCHIVED
```

Do not physically delete historical result data.

## 2.15 Attempts

Recommended statuses:

```text
NOT_STARTED
IN_PROGRESS
SUBMITTED
AUTO_SUBMITTED
EXPIRED
CANCELLED
```

Rules:
- A refresh MUST resume an existing in-progress Attempt.
- A network interruption MUST not create a new Attempt merely because the page was reloaded.
- The server owns `started_at` and the authoritative deadline.
- Double-submit MUST be idempotent.
- A completed result MUST NOT be duplicated by a repeated submit request.

## 2.16 Timer

Server authoritative timer model:

```text
server started_at
server expected_end_at
        ↓
client visual countdown
```

Client timer is UI only.

The server validates deadline on save/submit.

At/after deadline:
- auto-submit according to the application rule;
- server determines whether the attempt is on-time/expired;
- client cannot extend the timer by manipulating JavaScript or system time.

## 2.17 Historical snapshot without Test Versions

The application MUST NOT implement Test Version entities.

Do NOT create:
- `TestVersion`
- `test_version_id` on Attempt
- a version-management UI

Instead, when an Attempt starts, create immutable snapshot data sufficient to preserve historical meaning even if current Test or Question records later change.

At minimum, attempt answer records should retain the relevant question and answer-option/correct-answer snapshot needed to evaluate/display the historical result.

Historical results MUST NOT be recalculated by rereading today's Question/Test records.

## 2.18 Soft delete

Use soft delete for business entities where deletion could affect history.

Preferred pattern:

```text
deleted_at
```

or equivalent explicit deletion state.

Soft-deleted records:
- remain in database;
- can be filtered out of active views;
- can be restored where appropriate;
- must not break historical Attempt/Result/Audit data.

Never hard-delete historical attempt/result records as part of ordinary CRUD.

## 2.19 Audit log

Create an audit log for security-sensitive and material admin actions.

Recommended fields:

```text
actor_user_id
actor_role
action
entity_type
entity_id
timestamp
old_value
new_value
ip_address
user_agent
```

Never store plaintext passwords or PINs in audit logs.

Audit examples:
- create/update/delete/restore student
- create/update/delete/restore test
- publish/unpublish test
- import questions
- import students
- assign test access to BATCH or STUDENT
- modify PROGRAM/CLASS/level
- security changes
- admin authentication events where appropriate

## 2.20 Screen, Sub-Tab, and Route State Persistence on Reload/Refresh (/learn)

The application MUST strictly preserve and restore the user's active screen, URL hash, active sub-tabs, and selected contextual filters whenever a browser refresh, page reload, background data sync, or CRUD update takes place.

Rules:
- **No Disorienting Redirects**: Under NO circumstances may an action, update, or reload reset the user's view or silently redirect them to a default screen (such as `#tests` or default dashboard) while they are working in another view (e.g., Class Hub, Vocabulary Vault, System Settings, Batches, Student Registration, Curriculum).
- **Sub-Tab & Filter Synchronization**: Contextual sub-states (e.g., active tabs in Class Hub, Vocabulary Vault tabs, System Settings tabs, Student Registration tabs, Test Analytics class track filters, and Student Dashboard selected class / active modal) MUST be persisted in URL hash and bidirectional `localStorage` / `sessionStorage`.
- **Modal & Detail State Continuity**: Opening modals or detail views (such as `#profile-<studentId>`, `#levels-<classId>`, `#select-class`, `#profile-history`) must maintain clean background view state and restore the prior view cleanly upon modal dismissal without flashing blank canvases or switching screens.
- **Authoritative Contract**: Any future module or screen added to TopsCore MUST implement this route and state persistence pattern.

---

# 3. TARGET ARCHITECTURE

## 3.1 High-level

```text
                         NETLIFY / VERCEL
                               │
                               ▼
                  Static HTML / CSS / JS
                               │
                 Supabase JS client / HTTPS
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
         Supabase Auth              Supabase Edge Functions
                                             │
                                             ▼
                                     Supabase PostgreSQL
                                             │
                                             └── Supabase Storage
```

## 3.2 Explicitly out of scope for the current architecture

Do NOT introduce unless explicitly approved:
- Django
- Django REST Framework
- Flask
- FastAPI
- Express backend
- Docker
- Redis
- Celery
- a standalone traditional API server

Edge Functions ARE the server-side backend layer.

## 3.3 Frontend approach

Use:
- semantic HTML
- CSS
- modular ES modules JavaScript
- Supabase JS SDK where appropriate

The frontend must not contain authoritative business decisions.

## 3.4 Backend approach

Use Supabase Edge Functions for server-authoritative operations that require privileged logic or validation.

Direct browser-to-Supabase database access is allowed only when protected by properly designed RLS and when no privileged business rule is bypassed.

Critical operations SHOULD go through Edge Functions, especially:
- start exam
- submit attempt
- scoring
- progression calculation
- bulk imports
- privileged admin operations
- audit logging when client tampering could be a concern

---

# 4. RECOMMENDED PROJECT STRUCTURE

Target structure:

```text
TOP-ENGLISH-PROGRAM/
│
├── .vscode/
│
├── assets/
│   ├── images/
│   └── icons/
│   ├── css/
│   │   ├── style.css
│   │   ├── auth.css
│   │   ├── admin.css
│   │   ├── dashboard.css
│   │   ├── test.css
│   │   └── result.css
│   │
│   ├── js/
│   │   ├── app.js
│   │   ├── api.js
│   │   ├── auth.js
│   │   ├── session.js
│   │   ├── validation.js
│   │   ├── storage.js
│   │   ├── timer.js
│   │   ├── speech.js
│   │   ├── scoring.js
│   │   ├── progress.js
│   │   ├── result.js
│   │   │
│   │   └── admin/
│   │       ├── dashboard.js
│   │       ├── database.js
│   │       ├── program-management.js
│   │       ├── student-management.js
│   │       ├── tests-management.js
│   │       └── imports.js
│   │
│   ├── supabase/
│   │   ├── functions/
│   │   │   ├── admin-auth-check/
│   │   │   │   └── index.ts
│   │   │   ├── start-test/
│   │   │   │   └── index.ts
│   │   │   ├── save-answer/
│   │   │   │   └── index.ts
│   │   │   ├── submit-test/
│   │   │   │   └── index.ts
│   │   │   ├── calculate-result/
│   │   │   │   └── index.ts
│   │   │   ├── import-students/
│   │   │   │   └── index.ts
│   │   │   ├── import-questions/
│   │   │   │   └── index.ts
│   │   │   └── ...
│   │   │
│   │   ├── migrations/
│   │   └── config.toml
│   │
│   ├── docs/
│   │   ├── PRODUCT_SPEC.md
│   │   ├── ARCHITECTURE.md
│   │   ├── DATABASE.md
│   │   ├── API.md
│   │   ├── SECURITY.md
│   │   ├── TESTING.md
│   │   ├── DEPLOYMENT.md
│   │   ├── CHANGELOG.md
│   │   ├── DECISIONS.md
│   │   ├── SESSION_LOG.md
│   │   ├── CURRENT_STATE.md
│   │   ├── TODO.md
│   │   └── BLOCKERS.md
│   │
│   ├── admin.html
│   ├── dashboard.html
│   ├── test.html
│   ├── result.html
│   ├── program-management.html
│   ├── student-management.html
│   ├── tests-management.html
├── management.html
├── index.html
│
├── .env.example
├── .gitignore
├── netlify.toml
├── supabase-setup.sql
├── README.md
└── AGENTS.md
```

The project may start with fewer files, but the logical separation above must remain recognizable.

---

# 5. SOURCE-OF-TRUTH FILES AND CONTINUATION SYSTEM

The project MUST maintain a persistent AI continuation system.

## 5.1 Required state files

### `docs/CURRENT_STATE.md`

This is the **single restart point**.

It MUST always contain:

```markdown
# CURRENT STATE

Last Updated: YYYY-MM-DD HH:mm UTC
Current Phase: <phase>
Current Task: <task>
Status: NOT_STARTED | IN_PROGRESS | BLOCKED | COMPLETE

## Completed
- ...

## In Progress
- ...

## Not Started
- ...

## Current Architecture
- ...

## Database State
- Latest migration:
- Tables created:
- RLS status:

## Frontend State
- Pages completed:
- Modules completed:

## Backend State
- Edge Functions completed:

## Tests
- Last command:
- Last result:

## Known Issues
- ...

## Blockers
- ...

## Next Exact Action
1. ...

## Files Changed In Latest Step
- ...
```

A new agent MUST read this file first.

### `docs/CHANGELOG.md`

Record every meaningful code/schema/config/documentation change.

Format:

```markdown
## [YYYY-MM-DD HH:mm] — <short title>

**Agent/Session:** <identifier>
**Phase:** <phase>
**Status:** PASS | FAIL | BLOCKED

### Why
- ...

### Changed
- ...

### Files
- `path/to/file`

### Database
- migration: ...
- tables/columns/policies changed: ...

### Tests
- command: `...`
- result: `PASS` / `FAIL`

### Risks / Follow-up
- ...

### Next Action
- ...
```

### `docs/DECISIONS.md`

Record durable architecture/product decisions.

Format:

```markdown
## DECISION-001 — <title>

Date: YYYY-MM-DD
Status: ACCEPTED | SUPERSEDED | PROPOSED

### Context
...

### Decision
...

### Consequences
...

### Alternatives rejected
...
```

Never rewrite history. If a decision changes, mark the old decision `SUPERSEDED` and create a new decision.

### `docs/SESSION_LOG.md`

Record each AI working session.

Required format:

```markdown
## SESSION-YYYYMMDD-HHMM

Start: ...
End: ...
Agent: Antigravity / other

### User Request
...

### Objective
...

### Work Performed
- ...

### Commands Run
- `...`

### Results
- ...

### Files Changed
- ...

### Verification
- ...

### Outstanding
- ...

### Resume From
<exact next action>
```

### `docs/TODO.md`

Use for planned work not yet implemented.

Every task should have:
- ID
- description
- priority
- dependencies
- status
- completion criteria

Example:

```markdown
- [ ] FE-007 | Student login UI | HIGH | depends: DB-003 | criteria: login flow + validation + tests
```

### `docs/BLOCKERS.md`

Use for unresolved blockers and specification conflicts.

Never hide a blocker inside a generic TODO.

---

# 6. MANDATORY AI CONTINUATION PROTOCOL

Before doing ANY implementation work:

1. Read `AGENTS.md`.
2. Read `docs/CURRENT_STATE.md`.
3. Read the latest entries of `docs/CHANGELOG.md`.
4. Read relevant entries of `docs/DECISIONS.md`.
5. Read relevant TODO/blockers.
6. Inspect the existing code before changing it.
7. Identify the exact current task and acceptance criteria.

After EVERY implementation step:

1. Run relevant tests/checks.
2. Update `docs/CHANGELOG.md`.
3. Update `docs/CURRENT_STATE.md`.
4. Update `docs/SESSION_LOG.md` at session end or interruption.
5. Update `docs/TODO.md` if task state changed.
6. Update `docs/BLOCKERS.md` if a blocker was found/resolved.
7. Add/update `docs/DECISIONS.md` for durable architectural decisions.

A task is not complete until the documentation state matches the code state.

---

# 7. ATOMIC WORK RULE

The agent must work in small resumable units.

Preferred unit:

```text
ONE TASK
  ↓
IMPLEMENT
  ↓
TEST
  ↓
DOCUMENT
  ↓
MARK COMPLETE
  ↓
NEXT TASK
```

Do NOT make a large sequence of unrelated changes without updating state.

If the user interrupts:

- stop at the safest boundary;
- record the exact current state;
- record incomplete files/operations;
- record the exact next command/action.

When resumed, continue from `docs/CURRENT_STATE.md`, not memory.

---

# 8. GIT / CHANGE TRACEABILITY

Git SHOULD be used.

Preferred commit granularity:

```text
feat(db): create INSTITUTION/PROGRAM/student schema
feat(auth): implement student pin login
feat(exam): implement attempt snapshot
fix(timer): enforce server deadline
```

A commit message SHOULD identify the task ID when possible:

```text
feat(exam): implement attempt snapshot [EXAM-012]
```

Do not rewrite public project history merely to conceal an implementation mistake.

Before destructive schema operations:
- verify migration safety;
- document the intended change;
- make a backup/restore point where possible;
- test migration on a safe environment.

---

# 9. DATABASE DESIGN

Use Supabase PostgreSQL.

The schema must preserve relational integrity and historical data.

## 9.1 Core tables

Recommended core entities:

```text
Institutions
Programs
batches
classes
users (students, teachers, admins)

modules
tests
test_items
test_topics
test_results
exam_history
progress
site_settings
audit_logs
```

Additional support tables may be created when required, but do not duplicate business concepts unnecessarily.

## 9.2 Suggested relationships

```text
Institutions 1 ─── N Programs
Institutions 1 ─── N subjects
subjects 1 ─── N levels
Programs N ─── N subjects       via class_subjects

Institutions 1 ─── N exams
subjects 1 ─── N exams
levels 1 ─── N exams
exams N ─── N Programs           via exam_classes
exams 1 ─── N questions

students N ─── 1 Programs
students N ─── 1 Institutions       direct column allowed for integrity/query convenience
students N ─── N? subjects     normally derived via class_subjects

students 1 ─── N attempts
exams 1 ─── N attempts
attempts 1 ─── N attempt_answers
students 1 ─── N progress
```

The exact cardinalities and constraints must be reflected in SQL migrations and RLS policies.

## 9.3 Recommended critical fields

### Institutions

```text
id
name
is_active
created_at
updated_at
deleted_at
```

### Programs

```text
id
program_id
name
is_active
created_at
updated_at
deleted_at
```

### subjects

```text
id
program_id
name
is_active
created_at
updated_at
deleted_at
```

### levels

```text
id
subject_id
name
level_number
is_active
created_at
updated_at
deleted_at
```

### class_subjects

```text
class_id
subject_id
created_at
```

### users (students, teachers, admins)

```text
id                     -- internal PK only (maps to auth.users)
institution_id
role                   -- 'student', 'teacher', 'admin'
full_name
pin_hash               -- if applicable for student login
created_at
updated_at
```

Do not add a business `student_id` field.

### modules

```text
id
name
module_type
description
config_schema
```

### tests

At minimum:

```text
id
class_id
level_id
test_type              -- 'quiz' or 'exam'
title
name
status                 -- 'draft', 'published', 'archived'
is_active
working_duration_minutes
payload
created_at
updated_at
```

### student_submissions

At minimum:

```text
id
student_id
test_id
status
started_at
submitted_at
overall_score
ai_transcript
ai_feedback
teacher_override_score
teacher_override_notes
```

### exam_history (Audit Log)

```text
id
submission_id
student_id
test_id
action_type
old_payload
new_payload
acted_by
created_at
```

### progress

Should support:
- student
- subject
- current/unlocked level
- completion state
- effective score inputs where appropriate

Do not store duplicated derived facts if they can be safely recalculated, unless performance requires caching; if cached, define invalidation/recalculation rules.

### audit_logs

See section 2.19.

---

# 10. RLS / AUTHORIZATION

Supabase Row Level Security is mandatory for browser-accessible tables containing user data.

Do not treat RLS as optional.

## 10.1 Student access

A student may read only data they are authorized to see.

Examples:
- own profile
- own attempts
- own answers/results
- exams available to their PROGRAM/INSTITUTION/subject/level
- progress belonging to self

## 10.2 Admin access

Admin operations require a server-verified admin role.

Never trust:

```javascript
localStorage.role = 'admin'
```

or client-only route guards as authorization.

The server/database must enforce authorization.

## 10.3 Service-role key

A Supabase service-role key MUST NEVER be embedded in browser JavaScript.

It may only exist in secure Edge Function environment variables/secrets.

---

# 11. EDGE FUNCTIONS

Edge Functions are the server-side application layer.

## 11.1 Required high-risk functions

At minimum design for:

```text
start-exam
save-answer
submit-exam
calculate-result
import-students
import-questions
```

Additional functions may be added for:
- admin auth checks
- photo upload mediation
- secure settings
- reports
- exports
- audit events

## 11.2 Edge Function contract

Each function should:

1. authenticate request
2. determine caller role
3. validate input schema
4. verify ownership/authorization
5. validate business rules
6. perform transaction-safe mutation
7. write audit log when required
8. return deterministic response
9. expose structured error codes

Suggested response shape:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "request_id": "..."
}
```

Error example:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "EXAM_NOT_ELIGIBLE",
    "message": "Student is not eligible to start this exam."
  },
  "request_id": "..."
}
```

Never return stack traces or secret values to production clients.

---

# 12. EXAM ATTEMPT ENGINE

## 12.1 Start Attempt

Flow:

```text
Student selects Exam
       ↓
verify authentication
       ↓
verify exam published
       ↓
verify INSTITUTION/PROGRAM/subject access
       ↓
verify level eligibility
       ↓
verify prerequisite
       ↓
verify retake rules
       ↓
create Attempt
       ↓
create immutable question snapshots
       ↓
return attempt data
```

## 12.2 Attempt uniqueness / duplicate prevention

The system must prevent accidental duplicate in-progress attempts where product rules require only one active attempt per Student + Exam.

Use database constraints and/or server-side locking/idempotency as appropriate.

## 12.3 Resume

When Student reloads:

```text
find active IN_PROGRESS attempt
      ↓
return same attempt
      ↓
restore answers
      ↓
recalculate remaining time from server timestamp
```

Do not create a fresh Attempt on refresh.

## 12.4 Submit

Submission must be idempotent.

Conceptual flow:

```text
POST submit-exam
      ↓
load attempt
      ↓
if already completed:
    return stored result
      ↓
validate ownership
      ↓
validate server time
      ↓
evaluate snapshot answers
      ↓
calculate percentage
      ↓
calculate grade
      ↓
persist result atomically
      ↓
recalculate relevant progress
      ↓
write audit event if applicable
      ↓
return result
```

If a second submit happens after completion, return the same persisted result rather than calculating a new result.

---

# 13. SCORE / GRADE / PROGRESSION SERVICES

These must be centralized.

Recommended logical modules:

```text
scoring/
  normalizeAnswer()
  evaluateWritten()
  evaluateMultipleChoice()
  evaluateDropdown()
  evaluateSpeechText()
  calculateExamScore()

grading/
  calculateGrade()

progression/
  calculateEffectiveExamScore()
  isLevelPassed()
  calculateUnlockedLevel()
  calculateOverallScore()
```

Do not duplicate these formulas across pages/functions.

The authoritative implementation should run server-side.

---

# 14. EXCEL WORKFLOWS

## 14.1 Question upload workflow

Required sequence:

```text
SELECT EXAM
   ↓
DETECT ANSWER TYPE
   ↓
UPLOAD
   ↓
VALIDATE
   ↓
PREVIEW
   ↓
CONFIRM
   ↓
INSERT
```

Never silently skip invalid rows.

Show:
- valid rows
- invalid rows
- duplicates
- detailed errors
- final imported count

## 14.2 Upload and Download Format

The EXAM question area must expose clear actions such as:

```text
[ DOWNLOAD FORMAT EXCEL ] [ UPLOAD EXCEL ]
```

Official templates must match the selected Answer Type.

### Multiple Choice

Columns:

```text
Question
Options
Correct Answer
```

### Drop-down

Columns:

```text
Question
Options
Correct Answer
```

### Written

Columns:

```text
Question
Correct Answer
```

### Speech to Text

Columns:

```text
Question
Expected Answer
```

A `GUIDE` sheet MAY be included in the downloaded template to explain:
- allowed values
- delimiter rules for options
- examples
- required fields
- duplicate rules
- answer-type expectations

## 14.3 Exam Type import

`Exam Type` is part of the approved Excel workflow and must be imported/read according to the final template contract.

Do not silently invent a different source for Exam Type.

The exact workbook shape must be documented in `docs/API.md` and/or `docs/DATABASE.md` once finalized.

## 14.4 Student import

Recommended columns:

```text
INSTITUTION
PROGRAM
Name
Gender
Age
Status (optional)
```

No Student ID column.

Workflow:

```text
UPLOAD
 ↓
VALIDATE
 ↓
RELATION CHECK
 ↓
DUPLICATE CHECK
 ↓
PREVIEW
 ↓
CONFIRM
 ↓
IMPORT
 ↓
SUMMARY
```

---

# 15. STUDENT PHOTO

First login:

```text
Student has no photo?
        ↓ yes
require photo setup
        ↓
camera preferred
        ↓
upload fallback
        ↓
validate
        ↓
store canonical image
        ↓
continue to dashboard
```

Target display/canonical processing:
- approximately 300×300 square
- face-centered where possible
- object-fit cover

Do not make camera permission failure equal to authentication failure. Provide a controlled fallback.

---

# 16. UI / PAGE RESPONSIBILITIES

## 16.1 Student pages

At minimum:

```text
index.html            → login
admin.html             → admin shell/dashboard entry
Dashboard              → student overview
exam.html              → attempt runner
result.html            → result detail
```

Existing project files may be retained/adapted, but each page must have one clear responsibility.

## 16.2 Admin pages

Primary navigation:

```text
DATABASE
PROGRAM
STUDENT
EXAM
```

EXAM section order:

```text
EXAM LIST
EDIT EXAM
CREATE EXAM
UPLOAD QUESTIONS
```

The exact UI may evolve, but business responsibilities must remain separated.

---

# 17. FRONTEND RULES

## 17.1 No authoritative calculations

Never trust these values from DOM/localStorage/query parameters:
- score
- grade
- progression
- attempt eligibility
- max attempt count
- timer deadline
- ownership
- admin role

## 17.2 State

Use explicit page state rather than hidden global mutable values.

Persist only what is safe and necessary client-side.

Never put secrets in:
- localStorage
- sessionStorage
- HTML
- public JS source

## 17.3 Error states

Every asynchronous operation should handle:
- loading
- success
- validation error
- authorization error
- network error
- server error
- retry path where appropriate

---

# 18. ACCESSIBILITY / RESPONSIVENESS

Minimum expectations:
- semantic HTML
- keyboard support
- visible focus states
- form labels
- readable contrast
- responsive layouts
- usable mobile exam experience
- accessible error messages
- no information conveyed only by color

Do not sacrifice exam usability for decorative UI.

---

# 19. SECURITY RULES

The AI agent MUST explicitly test for:

1. IDOR / ownership bypass
2. Student → Admin privilege escalation
3. Student accessing another student's result
4. Client score manipulation
5. Client timer manipulation
6. Duplicate attempt creation
7. Duplicate submit
8. Retake limit bypass
9. Level progression bypass
10. Exam unpublished access
11. Cross-INSTITUTION exam/PROGRAM access
12. Service-role key leakage
13. PIN/password leakage
14. Unsafe file upload
15. SQL/RLS policy bypass

Never accept a client-provided:
- score
- grade
- unlocked level
- effective score
- timer validity
- authorization result
as authoritative.

---

# 20. FILE UPLOAD SECURITY

For images and Excel:

Validate:
- MIME type
- extension
- file size
- content structure

Do not trust extension alone.

Student photo upload must not allow arbitrary executable content.

Excel imports must be parsed server-side/controlled environment and validated before insertion.

---

# 21. TESTING STRATEGY

Testing is mandatory, not optional documentation.

## 21.1 Unit tests

Cover at minimum:
- answer normalization
- written typo tolerance
- grade boundaries
- score calculation
- effective highest score
- overall score averaging
- level progression
- retake rules
- eligibility rules
- exam name generation
- import validation

## 21.2 Integration tests

Cover:
- student login
- admin authorization
- PROGRAM/subject assignment
- exam access
- attempt creation
- snapshot creation
- answer saving
- submit idempotency
- historical result after exam/question edit
- unpublish after completion
- RLS behavior

## 21.3 E2E tests

Minimum critical journeys:

### Student

```text
login
 → select subject
 → view level
 → start exam
 → answer
 → refresh
 → resume
 → submit
 → result
 → progress
```

### Admin

```text
login
 → create PROGRAM
 → create student
 → import students
 → create exam
 → assign exam to PROGRAM
 → download question format
 → upload questions
 → validate/preview
 → publish exam
```

## 21.4 Regression principle

Any fixed bug that could reappear must receive a regression test where practical.

---

# 22. ACCEPTANCE TEST MATRIX

At minimum, maintain a matrix in `docs/TESTING.md` covering:

| Area | Scenario | Expected |
|---|---|---|
| Login | wrong PIN | denied |
| Login | wrong PROGRAM/student relationship | denied |
| Access | unpublished exam | denied |
| Access | wrong INSTITUTION | denied |
| Retake | limit exceeded | denied |
| Retake | highest score | used for progression |
| Progress | one current-level exam failed | next level locked |
| Progress | all current-level exams >= 60 | next level unlocked |
| Timer | client clock changed | server remains authoritative |
| Resume | page refresh | same Attempt resumed |
| Submit | double click | one result only |
| Snapshot | source question edited later | old result unchanged |
| Unpublish | old completed exam unpublished | historical result remains |
| Excel | invalid row | visible error |
| Excel | duplicate row | flagged |
| Security | student accesses other result | denied |
| Security | client score modification | ignored |

Expand this matrix as implementation proceeds.

---

# 23. IMPLEMENTATION PHASES

Use these phases as the default build sequence. A phase may be split into smaller tasks, but phases must remain traceable.

## PHASE 0 — Repository bootstrap

Deliver:
- base folder structure
- `.gitignore`
- `.env.example`
- README
- AGENTS.md
- docs state files
- basic HTML shell
- base CSS/JS modules

Exit criteria:
- app opens
- no secrets committed
- documentation system exists

## PHASE 1 — Supabase foundation

Deliver:
- project connection
- environment configuration
- migration system
- initial schema
- RLS baseline
- storage buckets/strategy

Exit criteria:
- migration applies cleanly
- schema inspectable
- RLS policies documented

## PHASE 2 — Core master data

Implement:
- INSTITUTION
- PROGRAM
- Subject
- Level
- PROGRAM-Subject assignment
- Student

Exit criteria:
- CRUD works
- relational integrity enforced
- soft delete/restore works where applicable

## PHASE 3 — Authentication and role control

Implement:
- Admin auth
- Student login with INSTITUTION/PROGRAM/Name/PIN
- session management
- authorization
- first-login photo requirement

Exit criteria:
- unauthorized access denied server-side
- no plaintext PIN

## PHASE 4 — Exam management

Implement:
- create/edit exam
- Exam Type
- Exam Title
- answer type
- time limit
- prerequisite
- minimum score
- retake settings
- publish/unpublish
- exam/PROGRAM many-to-many assignment
- name generation

Exit criteria:
- exam list
- exam CRUD
- assignment works
- published state works

## PHASE 5 — Question management/import

Implement:
- question CRUD
- answer-type-specific templates
- download format
- upload
- validation
- preview
- confirm
- insertion

Exit criteria:
- all four answer types supported
- invalid rows never silently skipped

## PHASE 6 — Attempt engine

Implement:
- eligibility
- prerequisite
- attempt creation
- immutable snapshot
- resume
- save answer
- timer
- submit idempotency

Exit criteria:
- refresh resumes same attempt
- client cannot extend time
- double submit safe

## PHASE 7 — Scoring and results

Implement:
- all answer evaluators
- written typo tolerance
- score
- grade
- result persistence
- historical display

Exit criteria:
- all score boundaries tested
- snapshots prevent historical drift

## PHASE 8 — Progression

Implement:
- highest attempt score
- all-exams-in-level rule
- unlock next level
- overall score

Exit criteria:
- progression tests pass

## PHASE 9 — Admin UI

Complete:
- DATABASE
- PROGRAM
- STUDENT
- EXAM

Exit criteria:
- primary navigation matches specification
- CRUD/import/publish workflows usable

## PHASE 10 — Student UI

Complete:
- login
- subject selection
- progress
- exam runner
- result
- history

Exit criteria:
- critical journey complete

## PHASE 11 — Security hardening

Perform:
- RLS audit
- authz audit
- IDOR tests
- privilege escalation tests
- upload validation
- secret scan
- client manipulation tests

## PHASE 12 — Testing / regression

Run:
- unit
- integration
- E2E
- migration tests
- manual acceptance

## PHASE 13 — Deployment

Implement:
- Netlify/Vercel frontend deployment configuration
- Supabase production configuration
- environment variables
- build checks
- storage rules
- production smoke test

## PHASE 14 — Final handoff

Deliver:
- README
- architecture docs
- database docs
- API docs
- deployment docs
- test report
- known issues
- current state
- next action

---

# 24. PHASE EXIT REPORT

At the end of every phase, update the state files and produce this report:

```text
STATUS: PASS | FAIL | BLOCKED
PHASE: <number/name>

IMPLEMENTED:
- ...

FILES_CHANGED:
- ...

DATABASE_CHANGES:
- ...

EDGE_FUNCTIONS:
- ...

FRONTEND_CHANGES:
- ...

TESTS:
- command: ...
  result: PASS/FAIL

SECURITY_CHECKS:
- ...

KNOWN_ISSUES:
- ...

DECISIONS_ADDED:
- ...

NEXT_STEP:
- ...
```

Never report `PASS` without actual verification evidence.

---

# 25. INTERRUPTION / RESUME PROTOCOL

When an interruption occurs, do NOT leave the project in an undocumented state.

Before stopping:

1. Save code changes.
2. Run the fastest relevant validation available.
3. Update `docs/CURRENT_STATE.md`.
4. Add a `SESSION-...` entry to `docs/SESSION_LOG.md`.
5. Add a `CHANGELOG` entry if code/schema/config changed.
6. Update TODO status.
7. Record unresolved blockers.
8. Write an exact next action.

Example:

```markdown
## Resume Point

Phase: 6 — Attempt Engine
Task: EXAM-014 — implement idempotent submit

Completed:
- attempt table created
- snapshot creation implemented
- save-answer function passes tests

Not completed:
- submit-exam transaction
- duplicate-submit test

Last known good command:
`npm test -- --runInBand`

Next exact action:
Implement the atomic transaction in
`supabase/functions/submit-exam/index.ts`, then run
`npm test -- submit-exam`.
```

A future agent MUST be able to resume from this information alone.

---

# 26. CHANGE MANAGEMENT RULES

When the user changes a requirement:

1. Identify impacted components.
2. Record the change in `docs/DECISIONS.md`.
3. Mark superseded decisions instead of deleting them.
4. Update `AGENTS.md` if it changes a non-negotiable rule.
5. Update product/API/database docs.
6. Update implementation.
7. Update tests.
8. Add changelog entry.
9. Update current state.

Do not patch code only and leave the documentation stale.

---

# 27. DO NOT DO THESE THINGS

Never:

- create an Exam Version system;
- add `exam_version_id` to Attempt;
- add business Student ID unless explicitly re-approved;
- store plaintext PINs/passwords;
- trust frontend score/grade/progression/timer;
- hard-delete historical attempts/results;
- silently ignore failed imports;
- silently overwrite existing attempt history;
- make a new Attempt on page refresh;
- create duplicate results on double submit;
- expose service-role credentials to the browser;
- introduce Django/Express/etc. just because an Edge Function feels inconvenient;
- rewrite a large section of the project without updating state documentation;
- claim tests pass without running them;
- change a business rule without recording it.

---

# 28. REQUIRED DOCUMENTATION DELIVERABLES

The project is considered incomplete if these files are missing or stale:

```text
docs/PRODUCT_SPEC.md
docs/ARCHITECTURE.md
docs/DATABASE.md
docs/API.md
docs/SECURITY.md
docs/TESTING.md
docs/DEPLOYMENT.md
docs/CHANGELOG.md
docs/DECISIONS.md
docs/SESSION_LOG.md
docs/CURRENT_STATE.md
docs/TODO.md
docs/BLOCKERS.md
```

The agent may create additional docs when useful.

---

# 29. INITIAL STATE FILE CONTENT

When bootstrapping a new project, create `docs/CURRENT_STATE.md` with:

```markdown
# CURRENT STATE

Last Updated: <timestamp>
Current Phase: 0 — Repository bootstrap
Status: IN_PROGRESS

## Completed
- AGENTS.md created

## In Progress
- repository bootstrap

## Not Started
- Supabase schema
- authentication
- admin UI
- student UI
- exam engine
- scoring
- progression
- testing
- deployment

## Database State
- Supabase project: NOT CONFIGURED / CONFIGURED
- Latest migration: NONE

## Edge Functions
- NONE

## Frontend
- base shell: PENDING

## Tests
- not run

## Known Issues
- none recorded

## Blockers
- none recorded

## Next Exact Action
Create repository structure and documentation files, then begin Supabase schema migration.
```

---

# 30. INITIAL AGENT COMMAND

When this `AGENTS.md` is first supplied to an AI coding agent, its first job is NOT to build everything in one pass.

It must:

1. inspect repository;
2. inspect existing files;
3. preserve useful existing code only after evaluating it;
4. create/complete the documentation system;
5. establish Supabase schema/migrations;
6. verify the environment;
7. execute only the next smallest task;
8. update state documentation;
9. continue phase by phase.

Recommended initial prompt:

```text
Read AGENTS.md first and treat it as the execution contract.

Before changing application code:
1. inspect the entire repository structure;
2. read docs/CURRENT_STATE.md if it exists;
3. read docs/CHANGELOG.md, docs/DECISIONS.md, docs/TODO.md, and docs/BLOCKERS.md if they exist;
4. compare the existing implementation with AGENTS.md;
5. identify the smallest safe next task;
6. implement only that task;
7. run verification;
8. update all required state/change documentation;
9. report PASS/FAIL/BLOCKED with exact evidence and the next action.

Do not introduce Django, Docker, Redis, Celery, or another backend server.
Use static HTML/CSS/modular JavaScript + Supabase PostgreSQL/Storage/Auth/Edge Functions.
Do not create an Exam Version system.
Do not create a business-facing Student ID.
Preserve attempt history using immutable snapshots.
```

---

# 31. FINAL DEFINITION OF DONE

TopsCore is ready for production only when:

- business rules are implemented and tested;
- PostgreSQL schema and RLS are verified;
- admin and student authorization are server-enforced;
- all four answer types work;
- Excel import/export format is documented and validated;
- attempts resume correctly;
- timer is server-authoritative;
- submit is idempotent;
- snapshots preserve historical result meaning;
- highest-score retake logic works;
- level progression requires every current-level exam >= 60%;
- overall score follows the approved availability/completion rule;
- grade boundaries are exact;
- historical results survive unpublish/edit changes;
- audit logs exist for sensitive changes;
- soft delete/restore works where required;
- no secrets are exposed;
- critical security tests pass;
- deployment is reproducible;
- documentation is synchronized with implementation;
- `docs/CURRENT_STATE.md` contains a truthful final state;
- `docs/CHANGELOG.md` contains the implementation history;
- `docs/SESSION_LOG.md` makes the project resumable after interruption.

**The project is not considered complete merely because the UI looks finished.**

---

# 32. AGENT BEHAVIOR SUMMARY

Every agent should behave like this:

```text
READ STATE
   ↓
UNDERSTAND TASK
   ↓
INSPECT EXISTING CODE
   ↓
PLAN SMALLEST SAFE CHANGE
   ↓
IMPLEMENT
   ↓
TEST
   ↓
DOCUMENT
   ↓
UPDATE CURRENT STATE
   ↓
REPORT EXACT RESULT
   ↓
CONTINUE
```

The primary objective is not merely to generate code. It is to maintain a **correct, testable, auditable, and restartable application state** throughout the lifetime of TopsCore.
