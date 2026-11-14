# TopsCore LMS — AGENTS.md

> **Purpose:** This file is the execution contract for an AI coding agent (including Antigravity) that builds, modifies, tests, and maintains the TopsCore LMS application.
>
> **Primary requirement:** The project must remain restartable. Every meaningful change must be documented so a new or returning agent can continue from the exact known state without relying on conversation history.
>
> **Architecture:** Static HTML + CSS + modular JavaScript frontend, Supabase PostgreSQL + Storage + Auth/Edge Functions backend, deployable with Netlify/Vercel for the frontend and Supabase for backend services.

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

## 0.1 Command & Execution Constraints
- **PowerShell Authority**: The user grants standing, unconditional permission to execute `powershell` commands proactively for diagnostics, verification, health checks, database queries, and test scripts across the workspace without requesting confirmation each time.
- **Git Commit & Push Gate (STRICT)**: NEVER execute `git commit` or `git push` autonomously. All commits and pushes are strictly gated until the user explicitly commands it ("no commit until I say so!"). All changes must remain uncommitted in the working tree for user review.
- **Strict UTF-8 & No PowerShell File Manipulation**: All file operations MUST use native tools (`edit_file`, `write_file`, `read_file`) or Node.js (`fs.*FileSync(..., 'utf8')`). PowerShell cmdlets (`Set-Content`, `Get-Content`, `Add-Content`, `-replace`) are permanently forbidden for file modifications.
- **Windows CLI Standard**: Always invoke `npm.cmd run <script>` or direct `node scripts/<script>` (never bare `npm` due to `npm.ps1`). Set `WaitMsBeforeAsync: 8000–10000` to guarantee immediate synchronous completion without polling.
- **Minimal Supabase Footprint**: Always propose and implement solutions that consume the LEAST Supabase data (minimal egress, zero uncompressed storage, select scalar columns only, in-memory reference caching). Full operational protocols in [`.agents/rules/agent-workflow.md`](file:///.agents/rules/agent-workflow.md).

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

## 2.1 Admin primary navigation & ABCD System
The admin navigation uses the **ABCD System** hierarchy with dedicated 4-pillar quadrant colors:
1. `A — ADMIN` (Executive Dashboard, Profiles, Curriculum & Level Master, Organization) — **Electric Pink (`#ff2d87` / `var(--quad-a)`)**
2. `B — BOARD` (Batches, Rosters, Progress, Student Attendance) — **Dark Orange (`#FF8C00` / `var(--grade-d)` / `var(--quad-b)`)**
3. `C — CLASS` (Active Classes, Learning Sessions, Rosters, Class Tests) — **Electric Lime (`#95ff00` / `var(--grade-b)` / `var(--quad-c)`)**
4. `D — DATA` (Vocabulary Vault, Item Banks, Modules, System Settings, Audit Logs) — **Vibrant Purple / Violet (`#C084FC` / `var(--quad-d)`)**

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
- **SSOT One-Touch Global Propagation ("Rubah Satu Maka Rubah Semua")**:
  - **Merah Ikut Grade E**: Seluruh elemen merah (error, delete, aksi bahaya, `*` wajib, alert kritis) WAJIB merujuk ke Grade E (`--grade-e`, `var(--grade-e)`, `TOPSCORE_COLORS.E`, `.text-fail`).
  - **Kuning Ikut Grade C**: Seluruh elemen kuning (warning, latency alert, draft/pending) WAJIB merujuk ke Grade C (`--grade-c`, `var(--grade-c)`, `TOPSCORE_COLORS.C`, `.text-warning`).
  - **Hijau Ikut Grade A**: Seluruh elemen hijau (sukses, kelulusan, online, published) WAJIB merujuk ke Grade A (`--grade-a`, `var(--grade-a)`, `TOPSCORE_COLORS.A`, `.text-success`).
  - **Strict No-Hardcoding**: DILARANG mengetik hex mentah (`#ff0000`, `#ffff00`, `#00c000`) lepas. Semua styling wajib memanggil variabel CSS atau `TOPSCORE_COLORS`.
  - **System Chrome Canvas**: Elemen non-semantik (kanvas `#090D16`, sidebar `#0F172A`, border `rgba(255,255,255,0.08)`, metadata slate `#94A3B8`, tactical blue `#38BDF8`, indigo `#6366F1`) menggunakan token palet sistem.
- **Star (★) Independence & Exclusivity**: Nilai 100% (★ / Excellent) menggunakan token mandiri `--grade-star: #ff2d87` / `TOPSCORE_COLORS.STAR: '#ff2d87'`.
- **Green Color Policy**: Green elements reference **Grade A (`#00c000ff`)**, never Star.
- **Universal Dark Badge Text**: Round grade badges (`.grade-circle`) render dark slate (`#0F172A`) for ALL grade symbols (★, A, B, C, D, E).
- **Dynamic Points**: Points (PTS) dynamically follow `getGradeColorByScore()`.
- **Universal Percentage Metrics**:
  - **Positive Metrics (Score, Progress, Pass, Readiness, Accuracy, Attendance, Pacing %)**: Dinamis mengikuti `getGradeColorByScore(percentage)`.
  - **Negative Metrics (Error, Mistake, Fail, Timeout, Retake Rate %)**: Warnanya WAJIB DIBALIK (*Inverted Scale*) via `getInvertedGradeColor(percentage)`.
- **Remedial Rules**: Capped at 60%. Letter "R" appears ONLY beside Score percentage on result and grade pages.

### 2.10.1 Standar Warna 4-Pillar (ABCD System & ABCD Tema)
Struktur 4 tahap, 4 tema kelas, atau 4 domain navigasi menetapkan palet resmi **Pink – Orange – Lime – Ungu**:
- **A (Tahap 1 / Domain A / Theme A / Exam 1)**: **Electric Pink (`#ff2d87`)** ➔ Token: `--quad-a`, `TOPSCORE_QUAD_COLORS.A`. *(Independen dari token Bintang Nilai ★)*.
- **B (Tahap 2 / Domain B / Theme B / Exam 2)**: **Dark Orange (`#FF8C00`)** ➔ Token: `--quad-b`, `var(--grade-d)`, `TOPSCORE_COLORS.D`, `TOPSCORE_QUAD_COLORS.B`.
- **C (Tahap 3 / Domain C / Theme C / Exam 3)**: **Electric Lime (`#95ff00`)** ➔ Token: `--quad-c`, `var(--grade-b)`, `TOPSCORE_COLORS.B`, `TOPSCORE_QUAD_COLORS.C`.
- **D (Tahap 4 / Domain D / Theme D / Exam 4)**: **Vibrant Purple / Violet (`#C084FC`)** ➔ Token: `--quad-d`, `TOPSCORE_QUAD_COLORS.D`.
- **Zero Raw Hex & Aksen Lembut**: Wajib token `var(--quad-*)` / `TOPSCORE_QUAD_COLORS`. Aksen teks, border, pill latar lembut (`rgba(..., 0.15)`), bukan blok solid pekat.

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

## 2.20 Declarative UI, Spatial & Workflow Invariants
Operational, spatial, typographic, and workflow specifications are modularized into dedicated source-of-truth files detailed in [# 4. MODULAR SPECIFICATION MAP](#4-modular-specification-map).

## 2.21 Universal Zero-Truncation Invariant & 3-Tier Header Standards (SSOT)
All table columns, labels, titles, and metrics must display 100% in full without truncation or ellipsis (`...`). Calibrated column dimensions and 3-tier header abbreviations are authoritatively codified in [`.agents/rules/ui-invariants.md` Section 4.2](file:///.agents/rules/ui-invariants.md#42-aturan-text-wrap-universal-zero-truncation-invariant--standar-singkatan-header-3-tier-ssot).

## 2.22 Universal Master Edit Mode White Excel Gridlines Invariant
When Master Edit Mode is active (`body.global-edit-mode-on`), every table renders crisp white Excel gridlines (`rgba(255, 255, 255, 0.45)`) with borderless, transparent inputs per [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md).

## 2.23 Standard Student Name (`studentName`) & Dashboard-Only Title (`Mr.` / `Miss`)
- **Default Principle**: Authentic standard name (`studentName` / `name` / `session.student_name`) everywhere across system.
- **Single Location of Title Addition (Dashboard-Only)**: The **Student Dashboard** (`dashboard.html` / `js/dashboard.js`) is the SOLE location where gender honorific titles (`Mr.` / `Miss`) or batch champion titles (`King` / `Queen`) are prepended to `studentName` for greeting.
- **Universal Standard Name Everywhere Else**: Standard authentic name directly in database (`students.name`), session, admin tables, test/result/conversation rooms, dropdowns, and exports.

## 2.24 Authoritative Dummy Account Standard ("Top") & Ultra-Compact Avatars
- **Canonical Dummy Name**: Strictly **"Top"** (e.g. `Top`, `Top Evnikom`, `Top Anon`). "Test", "Test Student", "test_anon" are permanently deprecated.
- **Ultra-Compact Avatars**: Use zero-egress SVG data URI via `generateAvatarDataUri('Top')` (~500 B). Raster avatars $\le 2\text{ KB}$ ($120 \times 160$ px). Never upload raw images to Supabase for dummy accounts.

## 2.25 In-Browser Photo & Avatar Processing (Zero Supabase Storage Egress)
- All photos and avatars are processed strictly **client-side (browser)** via Canvas compression or SVG data URIs, never stored as raw uncompressed image files in Supabase Storage.

## 2.26 Minimal Supabase Footprint & Ultra-Lean Architecture (SSOT)
- Minimize bandwidth/egress. Audit every call. Max 2–5 KB per polling cycle (no blobs in intervals). Client-side compute first; Supabase strictly for structured relational persistence.

---

# 3. TARGET ARCHITECTURE

- **Frontend**: Static HTML5 + vanilla CSS3 + modular ES6 JavaScript (`js/` modules). Deployable on Netlify/Vercel.
- **Backend Services**: Supabase PostgreSQL database, Supabase Auth, Storage buckets, and Edge Functions (`supabase/functions/`).
- **Stateless AI Engine**: Media processed transiently; scores and transcripts stored in Supabase.
- **Explicitly Out of Scope**: Do NOT introduce Django, Docker, Celery, Redis, or a separate Node/Python web server.

---

# 4. MODULAR SPECIFICATION MAP

To prevent truncation under Antigravity's 24 KB per-file limit, detailed specifications are modularized into dedicated source-of-truth files:

| Topic | Modular File Reference | Key System Invariants Codified |
| :--- | :--- | :--- |
| **Product Roadmap** | [`docs/ROADMAP.md`](file:///docs/ROADMAP.md) | Historical and active evolution milestones. |
| **Live Project State** | [`docs/CURRENT_STATE.md`](file:///docs/CURRENT_STATE.md) | Authoritative restart point ($\le 120$ lines). |
| **Architectural Decisions** | [`docs/DECISIONS.md`](file:///docs/DECISIONS.md) | Permanent architectural decision records (ADRs). |
| **Database Schema & RLS** | [`docs/DATABASE_SCHEMA.md`](file:///docs/DATABASE_SCHEMA.md) | Schema, foreign keys, RLS policies, migrations. |
| **Edge Functions & Lifecycle** | [`docs/EDGE_FUNCTIONS.md`](file:///docs/EDGE_FUNCTIONS.md) | Edge Functions, attempt lifecycle, server scoring. |
| **Excel Ingestion Schemas** | [`docs/EXCEL_FORMATS.md`](file:///docs/EXCEL_FORMATS.md) | Roster, question bank, vocabulary Excel formats. |
| **AI Continuation System** | [`docs/CONTINUATION_SYSTEM.md`](file:///docs/CONTINUATION_SYSTEM.md) | AI handoff, continuation triggers, prompt templates. |
| **UI, Spatial & Tables** | [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md) | 100vh lock, 10px gap, 40px Sub Panel/Title Area, zero-truncation, Excel gridlines. |
| **Agent Workflow & CLI** | [`.agents/rules/agent-workflow.md`](file:///.agents/rules/agent-workflow.md) | Lean agile workflow, no git commit/push gate, Windows CLI standards. |
| **Master Governance Rules** | [`.antigravityrules`](file:///.antigravityrules) | Master index and domain governance rules. |

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
- DO NOT prepend "Mr." or "Miss" titles outside Student Dashboard greeting (Rule 2.23).
- DO NOT use "Test", "Test Student", or "test_anon" for dummy accounts; strictly use "Top" (Rule 2.24).
- DO NOT upload large binary files or uncompressed avatars to Supabase; strictly client-side processing (Rule 2.25).
- DO NOT upload oversized screenshots; max height ~600–800px (< 30 KB).
- DO NOT allow table cells, headers, or entity labels to truncate with ellipsis (`...`) when viewport space exists.
- DO NOT render non-white or missing gridlines when Master Edit Mode is active (Universal White Excel Gridlines).
- DO NOT use unicode emojis in data tables/headers/cards; strictly use SVG vector icons via `getClassSvgIcon()`.
- DO NOT create ceremonial `/plan` files for standard UI/table tweaks (enforce Fast-Track UI Execution).
- DO NOT fragment table adjustments across multiple turns; always do single-pass updates (header, cells, edit mode).
- DO NOT run monolithic sequential tests for quick edits; use `npm run test:fast` (< 1.5s) or `npm run test:table` (~0.5s).
- DO NOT spawn headless browsers (Puppeteer/Playwright) to diagnose routine DOM clicks; diagnose statically or via JSDOM.
- DO NOT perform recursive DOM mutations inside `MutationObserver` without disconnect or re-entrancy flags.
- DO NOT re-query 8 structural tables on every tab switch; utilize in-memory session caching for reference data.
- DO NOT perform unbounded `git grep` sprees; target the authoritative rendering component directly.
- DO NOT edit governance files (`ui-invariants.md`, `AGENTS.md`) in the middle of micro-turns for trivial tweaks.
- DO NOT invoke bare `npm` in Windows PowerShell (`npm.ps1` block); use `npm.cmd run <script>`.
- DO NOT use PowerShell cmdlets (`Set-Content`, `Get-Content`) to modify code/docs; use native editor or Node.js.
- DO NOT commit or push to Git until explicit user command ("no commit until I say so!").
- DO NOT dump historical phase narratives into `docs/CURRENT_STATE.md` ($\le 120$ lines).
- DO NOT leave completed plans in `docs/plans/` (max 3 active) or scratch scripts in `scripts/`.
- DO NOT duplicate rules across documentation files; follow Hub & Spoke SSOT architecture.

## 5.3 Documentation Hygiene & Rolling Window Protocol
1. **`docs/CHANGELOG.md`**: Strict rolling window of **25 latest phases** in ultra-condensed format (Header + 2–3 high-signal deliverable bullets). Phases older than 25 must be flushed to `docs/archive/`.
2. **`docs/CURRENT_STATE.md`**: Strictly bounded to $\le 120$ lines as the authoritative restart point (current phase, system invariants, latest ~5–8 milestones, and next action). Historical phase narratives belong exclusively in `CHANGELOG.md`.
3. **`tasks.md` vs `docs/TODO.md`**: Active task checklist is strictly maintained in `tasks.md` in root. Never dump completed micro-tasks into `docs/TODO.md`.
4. **`docs/plans/` Plan Lifecycle**: Strict upper bound of $\le 3$ active plans. Completed or rejected plans must be purged or archived immediately upon phase conclusion.
5. **Workspace Hygiene & One-Off Eradication**: Any single-use script in `scripts/` must be deleted immediately after its run. Only permanent regression test suites linked in `package.json` may remain in the repository.
6. **`docs/SESSION_LOG.md`**: Deprecated / optional.

## 5.4 Hub & Spoke SSOT Architecture & Zero-Duplication Invariant
Every documentation topic belongs to exactly ONE authoritative file (Single Source of Truth). All other files MUST reference it via direct clickable link (`file:///...`), and MUST NOT copy-paste redundant rule text or tables:
- **🎨 Official Color & Grading SSOT**: [`AGENTS.md` Section 2.10](file:///AGENTS.md#210-grade).
- **📐 UI, Layout, Table & Typography SSOT**: [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md).
- **🤖 AI Agent Workflow & Protocol SSOT**: [`.agents/rules/agent-workflow.md`](file:///.agents/rules/agent-workflow.md).
- **🗄️ Database Schema & RLS Policies SSOT**: [`docs/DATABASE_SCHEMA.md`](file:///docs/DATABASE_SCHEMA.md).
- **🧭 Master Navigation & Quick Index**: [`.antigravityrules`](file:///.antigravityrules) at root.
