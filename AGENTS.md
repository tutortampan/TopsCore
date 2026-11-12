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

### 0.1.1 Git Commit & Push Restriction (STRICT STANDING RULE)
**NEVER execute `git commit` or `git push` autonomously.** All commits and pushes are strictly gated: the agent MUST NOT commit or push changes until the user explicitly commands it ("no commit until I say so!"). All changes must remain uncommitted in the working tree for user review until explicit approval is given.

### 0.1.2 Strict UTF-8 & Prohibition of PowerShell File Manipulation (STRICT STANDING RULE)
**NEVER use PowerShell cmdlets (`Get-Content`, `Set-Content`, `Add-Content`, `Out-File`, or `-replace` one-liners) to read, edit, or write codebase files.**
- Windows PowerShell 5.1 defaults to ANSI (Windows-1252), which mangles UTF-8 multibyte characters into mojibake corruption.
- All file reads, creations, and edits MUST strictly be executed via:
  1. Antigravity native file tools (`edit_file`, `write_file`, `read_file`), OR
  2. Node.js scripts using explicit UTF-8 (`fs.readFileSync(file, 'utf8')`, `fs.writeFileSync(file, content, 'utf8')`).
- PowerShell execution authority is strictly limited to running processes (`node ...`, `git ...`, tests, diagnostics), NEVER for in-line file editing or text piping.

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
              └── TESTS (Tasks & Exams)
                    └── MODULES (AI Evaluation Engines)

STUDENT + TEST
  └── ATTEMPT
        └── ATTEMPT ANSWER

STUDENT + CLASS
  └── PROGRESS
```

## 1.4 Roles
- **ADMIN**: Manages Institutions, Programs, Classes, Levels, Batches, Students, Tests, Questions, Results, Site Settings, Security, and Audit Logs.
- **STUDENT**: Logs in via INSTITUTION + PROGRAM + Name + personal PIN. Can view assigned Classes, unlocked Levels, take published Tests, answer questions, resume attempts, view Results and Progress. Students MUST NOT be trusted to calculate scores, progression, or timer state.

---

# 2. NON-NEGOTIABLE BUSINESS RULES

## 2.1 Admin primary navigation
The admin navigation uses the **ABCD System** hierarchy:
1. `A — ADMIN` (Executive Dashboard, Profiles, etc.)
2. `B — BOARD` (Batches, Rosters, Progress)
3. `C — CLASS` (Classes, Levels, Topics, Tests, Banks, Vaults)
4. `D — DATA` (Audit Logs, Analytics, Exports)

## 2.2 Student business ID
There is **no business-facing Student ID**. Use only internal database primary key/UUID. Never request or display Student ID in login, forms, lists, imports, or student-facing screens.

## 2.3 Student login
```text
INSTITUTION -> PROGRAM -> STUDENT NAME -> PERSONAL PIN -> LOGIN
```
Server verifies that Program belongs to Institution, Student belongs to Program, Student is active, and PIN is valid. Never store plaintext PINs.

## 2.4 Class and Level Assignment
Classes are assigned to a **Level**. Students/Batches progress through Levels.

## 2.5 Test Auto-Assignment (Level-Centric)
Tests (Tasks & Exams) are created within a Class. Because that Class belongs to a Level, the system automatically assigns the test to any Batch/Student that has unlocked that Level. Batches inherit tests automatically based on their current Level.

## 2.6 Test name formula
```text
INSTITUTION + PROGRAM + CLASS + LEVEL + TEST TYPE + TEST TITLE
```
Store structured fields separately and generate/display the name dynamically from components.

## 2.7 Module Progression & Prerequisites
Dynamic prerequisites supporting 0 to N parent modules with minimum score thresholds. Report cards store HIGHEST score. Global average counts unattempted available modules as 0.

## 2.8 Overall score
Average of all Tests that are available/takeable under current rules and completed by the Student.

## 2.9 Question scoring
Every question is worth **1 point**. Answer evaluation preserves question-level score and result code.

## 2.10 Grade
Centralized authoritative grading (Official Grading Scale):

| Symbol | Predicate (Label) | Score Range | Main Color & Gradient | Hex Code |
|:---:|:---:|:---:|:---:|:---:|
| ★ | Excellent | 100% | Electric Pink | `#ff2d87` (`#ff2d87ff`) |
| A | Very Good | 90% – 99% | Pure Green | `#00c000ff` (`#00c000`) |
| B | Good | 80% – 89% | Electric Lime | `#95ff00ff` (`#95ff00`) |
| C | Enough | 60% – 79% | Pure Yellow | `#FFFF00` |
| D | Less | 30% – 59% | Dark Orange | `#FF8C00` |
| E | Fail | 0% – 29% | Pure Red | `#FF0000` |

### Unified Color Rules:
- **SSOT**: Colors reference `TOPSCORE_COLORS` in `js/grading.js` and `--grade-*` / `--eval-*` CSS variables in `css/style.css`.
- **Star (★) Exclusivity**: Star (100%) is strictly **Electric Pink** (`#ff2d87`). Exclusive to Star; never inherited by other components.
- **Green Color Policy**: Green elements (capsules, buttons, correct answers) reference **Grade A (`#00c000ff`)**, never Star.
- **Universal Dark Badge Text**: Round grade badges (`.grade-circle`) render dark slate (`#0F172A`) for ALL grade symbols (★, A, B, C, D, E), eliminating white text.
- **Dynamic Points**: Points (PTS) dynamically follow `getGradeColorByScore()`.
- **Remedial Rules**: Capped at 60%. Letter "R" (`60%ᴿ` or `60%<sup>R</sup>`) appears ONLY beside Score percentage on result and grade pages.

## 2.11 The 8 Test Evaluation Modules
1. Point & Speak! (Visual Pronouns), 2. Storytelling (Narrative Tense), 3. Conversation-based, 4. Multiple Choice, 5. Read Aloud / Pronunciation, 6. Turn-based Roleplay (Realtime/WebSockets), 7. Speaking Performance (5 Pillars), 8. Vocabulary Mastery.

## 2.12 AI Scoring Pipeline (Stateless)
Stateless & Low-Egress. Audio/media processed transiently in browser/Edge Functions and discarded; Supabase stores only structured text/JSON scores, transcripts, and metadata.

## 2.13 Answer Tolerance & Partial Credit Engine
Authoritative evaluation matrix implemented in `js/grading.js`:
- Exact match: 1.0 pt (`correct`).
- 1–2 char edit distance (Damerau-Levenshtein $\le 2$): Spoken 1.0 pt (`correct`), Written 0.5 pt (`minor_spelling_error`).
- Function word dropped/added in 4+ word idiom: 1.0 pt (`correct`).
- Plural-s / -es mismatch across multi-word idiom: 1.0 pt (`correct`).
- Word form / POS root match (stem $\ge 5$): 0.5 pt (`minor_word_form_error`).
- Pronoun substitution or semantic mismatch: 0.0 pt (`incorrect`).

## 2.14 Test lifecycle
Statuses: `DRAFT`, `PUBLISHED`, `UNPUBLISHED`, `ARCHIVED`. Only `PUBLISHED` tests can be taken.

## 2.15 Attempts
Statuses: `NOT_STARTED`, `IN_PROGRESS`, `SUBMITTED`, `AUTO_SUBMITTED`, `EXPIRED`, `CANCELLED`.
Page refresh resumes existing attempt; network drops do not create duplicates. Double-submit is idempotent.

## 2.16 Timer
Server-authoritative timer: client visual countdown is UI only. Server validates deadline on save/submit.

## 2.17 Historical snapshot without Test Versions
No `TestVersion` entities. At attempt start, capture immutable snapshots of questions and accepted answers. Historical results are never recalculated by rereading today's records.

## 2.18 Soft delete
Business entities use soft delete (`deleted_at IS NULL`). Never hard-delete historical results or attempts.

## 2.19 Audit log
Material admin and security actions write structured audit records. Never log plaintext passwords or PINs.

---

## 2.20 Declarative UI, Spatial & Workflow Invariants (Modular Specification Map)

To preserve context window budget and prevent file truncation, operational, spatial, and workflow specifications are modularized into dedicated source-of-truth files. Agents must strictly follow the mandates detailed in these modular references:

| Specification Domain | Authoritative Modular File | Key System Invariants Codified |
| :--- | :--- | :--- |
| **Spatial, Viewport & Tables** | [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md) | Single-screen `100vh` lock (`overflow: hidden`), `#admin-console` `calc(100vh - 60px)`, native `display: table` lock, table-only vertical scrolling (`.table-wrap`), 50px lower panel & table footers, 10px container gap, dynamic column sizing & proportional width allocation, single-line text (`nowrap`), Excel vertical gridlines, and persistent column resizing. |
| **Master Edit Mode & Styling** | [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md) | Global Edit Mode toggle: absolute hiding of mutation buttons when OFF (`display: none !important`), flat grid inputs in Edit Mode ON (no capsule pills in tables), single-responsibility columns (1 info = 1 column). |
| **Typographic Scale & Language** | [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md) | Authoritative 8-tier typographic scale (`--tr-font-*`), zero sub-11px text, data cells weight 500 (bold reserved for headers), pure direct English (sole exception: vocabulary Indonesian meanings). |
| **Canonical Components** | [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md) | Centered loading states via canonical `getLoadingStateHtml(message)` in `js/admin/app.js`, single-line compact program chips (`CMP`, `EVN`, `SHR`, `EXP`). |
| **Agent Execution Protocols** | [`.agents/rules/agent-workflow.md`](file:///.agents/rules/agent-workflow.md) | Mandatory `tasks.md` creation & center-tab pinning on proceed (Step Zero), prompt typo refinement (`### 🎯 Perbaikan Perintah`), plan naming & repository dual-write (`docs/plans/`), visual pre-flight checks, 100% automated verification (zero manual burden), editor tab hygiene (max 3 open tabs), post-milestone `/compact` recommendation. |

---

# 3. TARGET ARCHITECTURE

- **Frontend**: Static HTML5 + vanilla CSS3 + modular ES6 JavaScript (`js/` modules). Deployable on Netlify/Vercel.
- **Backend Services**: Supabase PostgreSQL database, Supabase Auth, Storage buckets, and Edge Functions (`supabase/functions/`).
- **Stateless AI Engine**: Media processed transiently; scores and transcripts stored in Supabase.
- **Explicitly Out of Scope**: Do NOT introduce Django, Docker, Celery, Redis, or a separate Node/Python web server.

---

# 4. MODULAR SPECIFICATION MAP

To prevent truncation under Antigravity's 24 KB per-file limit, detailed specifications are modularized into dedicated source-of-truth files:

| Topic | Modular File Reference |
| :--- | :--- |
| **Product & Bootstrap Roadmap** | [`docs/ROADMAP.md`](file:///docs/ROADMAP.md) (Phases 0–14 historical & live track) |
| **Live Project State & Restart Point** | [`docs/CURRENT_STATE.md`](file:///docs/CURRENT_STATE.md) (Single restart point) |
| **Architectural Decisions (ADRs)** | [`docs/DECISIONS.md`](file:///docs/DECISIONS.md) (Permanent decision records) |
| **Database Schema, Tables & RLS** | [`docs/DATABASE_SCHEMA.md`](file:///docs/DATABASE_SCHEMA.md) & `supabase/migrations/` |
| **Edge Functions & Attempt Engine** | [`docs/EDGE_FUNCTIONS.md`](file:///docs/EDGE_FUNCTIONS.md) |
| **Excel Ingestion Schemas** | [`docs/EXCEL_FORMATS.md`](file:///docs/EXCEL_FORMATS.md) |
| **AI Continuation System & Templates** | [`docs/CONTINUATION_SYSTEM.md`](file:///docs/CONTINUATION_SYSTEM.md) |
| **UI, Spatial & Table Invariants** | [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md) |
| **Agent Workflow & Execution Protocols** | [`.agents/rules/agent-workflow.md`](file:///.agents/rules/agent-workflow.md) |
| **Master Governance Rules** | [`.antigravityrules`](file:///.antigravityrules) |

---

# 5. ATOMIC WORK RULE & DO NOT DO LIST

## 5.1 Atomic Work Rule
Every change must be executed atomically:
1. Identify smallest safe next task.
2. Implement cleanly without regressions.
3. Run automated verification scripts.
4. Update `docs/CURRENT_STATE.md` and `docs/CHANGELOG.md`.

## 5.2 Do Not Do These Things
- DO NOT bypass RLS or write plaintext PINs/passwords.
- DO NOT invent business Student IDs.
- DO NOT create Test Version entities.
- DO NOT hardcode colors outside `TOPSCORE_COLORS` / CSS variables.
- DO NOT use PowerShell (`Get-Content` / `Set-Content` / `Add-Content`) to modify code or documentation files.
- DO NOT commit or push to Git until explicit user command.
