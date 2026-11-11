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

## Declarative UI, Spatial & Workflow Invariants (Pointers to Modular Rules)

The following operational and spatial rules are codified and enforced across the platform (see [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md) and [`.agents/rules/agent-workflow.md`](file:///.agents/rules/agent-workflow.md)):

### 2.20 Screen, Sub-Tab, and Route State Persistence on Reload/Refresh (/learn)
Preserve active screen, hash, sub-tabs, and filters across browser reloads without disorienting redirects.

### 2.21 Master Terminology & Spatial Architecture
Strict terminology: Student Gate (`index.html`), Class Hub (`dashboard.html`), Class Lobby (`#classes-selector-modal`), Test Room (`test.html`), Result Scoreboard (`result.html`).

### 2.22 Side Quest Protocol for Side Conversations (/btw)
Isolate branched requests into dedicated `Side Quest — <Title>` plan artifacts without polluting primary roadmaps.

### 2.23 Zero Outer Page Scroll & Table-Only Viewport Lock (/learn)
`html` and `body` strictly enforce `100vh` viewport lock (`overflow: hidden !important;`). Layout `#admin-console` uses `height: calc(100vh - 60px) !important;` to compensate the 60px locked bottom banner.
**Table-Only Vertical Scroll**: Vertical scrolling is permitted EXCLUSIVELY inside table body containers (`.table-wrap` / `tbody`) with sticky headers (`top: 0`) and sticky footers (`bottom: 0`). Toolbars collapse when Edit Mode is OFF.

### 2.24 Global Master Edit Mode Across All Admin Pages (/learn)
Global toggle in `admin-topbar`.
**Absolute Hiding when OFF**: When Edit Mode is OFF, all edit/delete/add/override buttons and steppers are completely hidden (`display: none !important;`) across all admin domains.

### 2.25 Mandatory Mockup Design & Current State Screenshot for All UI Proposals (/learn)
UI plans must include Current State Screenshot (Before) and Proposed Visual Mockup (After) prior to production code changes.

### 2.26 Mandatory Automated Verification & Zero Manual Verification Burden (/learn)
All verification is programmatically executed via automated scripts. Zero manual burden on the user.

### 2.27 Mandatory Task List Artifact & Real-Time Progress Tracking on Proceed (/learn)
Step Zero: Create and pin `tasks.md` in center editor tab via `antigravity-ide.cmd -r` before modifying code.

### 2.28 Mandatory Prompt Refinement & Structured Intent Clarification (/learn)
Inspect user prompt for typos and present `### 🎯 Perbaikan Perintah (Typo Fixed)` before execution.

### 2.29 Standard Plan Artifact Naming Convention & Repository Dual-Write (`docs/plans/`) (/learn)
All plans use the date-prefixed format `YYYYMMDD - <Plan Name>.md`. To ensure plans persist across multiple laptops and Git clones, plans are dual-written: officially saved in `docs/plans/` in the workspace repository and mirrored in the active brain artifact directory for interactive session control.

### 2.30 Pure Direct English UI Standard (Sole Exception: Vocab Vault Indonesian Meanings) (/learn)
All UI text, labels, and system messages use direct English. Sole exception: vocabulary Indonesian meaning.

### 2.31 Single-Responsibility Columns & Edit-Mode-Only Capsule Invariant (/learn)
Every column holds strictly 1 metric. Zero capsule pill badges in view mode; capsule styling is reserved for inputs when Master Edit Mode is ON.

### 2.32 Automatic Middle-Panel Tab Hygiene & Editor Cleanup Upon Process Completion (/learn)
Do not leave lingering open source files. Only pin `tasks.md`. Enforce max 3 open editor tabs.

### 2.33 Universal Lower Panel Architecture & Universal 10px Container Gap (/learn)
Lower panel and table footers strictly enforce exact `50px` height. Every container, panel, card, table, and toolbar strictly maintains an exact `10px` gap (`gap: 10px !important; margin-bottom: 10px !important;`).

### 2.34 Dynamic Column Sizing, Single-Line Text & Zero Dead Space Invariant (/learn)
Tables expand 100% width with proportional dynamic space distribution: zero center voids, zero edge clustering. Flexible text columns expand proportionately, metric/exam columns fit snugly. Cells enforce `white-space: nowrap !important; text-overflow: ellipsis; overflow: hidden;`. Rigid micro-widths (<50px) that clip headers are forbidden.

### 2.35 Centered Loading States & Canonical Component Invariant (/learn)
All loading spinners and indicators in Tutor's Room must strictly render centered horizontally and vertically (`display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; min-height: calc(100vh - 200px); flex: 1 1 0; margin: auto;`). All parent and tab containers (`#class-hub-tab-content`, `.workspace-content`) must enforce `width: 100% !important; height: 100% !important; flex: 1 1 0 !important;` to eliminate horizontal side-drifting and top-offsetting. Canonical helper `getLoadingStateHtml(message)` in `js/admin/app.js` is the authoritative component with direct English messaging.

### 2.36 Mandatory Visual Pre-Flight Checklist & Subagent Gating (/learn)
Embed pre-flight checklist in UI plans. Subagent delegation and code changes gated until checklist is verified.

### 2.37 Context Window Budget Hygiene & Post-Milestone Compaction (/learn)
Recommend `/compact` after completing multi-phase milestones.

### 2.38 Universal Table Standardization Protocol & Construction Blueprint (/learn)
All data tables across TopsCore strictly enforce the 8-pillar standardization invariant:
1. **Spatial View Margins & Flush Base Docking**: Table container (`.table-wrap`) strictly adheres to `10px` top, `10px` sides, and `0px` bottom (`margin: 10px 10px 0 10px !important;`), flush docked to the 60px bottom banner (`#bottom-ad-banner`).
2. **Uniform Font Size (12px) & Single-Line Text**: Header text (`th`), data cells (`td`), super-headers, and inputs strictly enforce uniform `font-size: 12px !important; line-height: 1.4 !important;`. Cells enforce `white-space: nowrap !important; text-overflow: ellipsis; overflow: hidden;`.
3. **Superscript Tag Standard**: Remedial tags (`<sup>R</sup>`) and waiver tags (`<sup>F</sup>`) strictly enforce `font-size: 1.0em !important; font-weight: 900 !important; vertical-align: super !important; line-height: 0 !important;`.
4. **Two-Tier Sticky Header Locking**: Super-headers are sticky at `top: 0 !important; z-index: 20 !important; height: 24px !important;`, sub-headers are sticky at `top: 24px !important; z-index: 19 !important; height: 24px !important;` with solid opaque backgrounds (`#0d1527` / `#0b1120`). Single headers sticky at `top: 0 !important; z-index: 10 !important; height: 28px !important;`.
5. **Small Table Anti-Ballooning & Zero Scrollbar**: In `fitMatrixToScreen()` and CSS, row heights are bounded between `24px` and `32px` (`min: 24px, max: 32px`). Small rosters (< 15 rows) do not stretch or balloon (`height: auto !important;`), and vertical scrollbars are dynamically eliminated (`overflow-y: hidden`).
6. **Active-Only Sort Arrow (No Idle ⇅)**: The ambiguous idle `⇅` sort icon is strictly purged across all tables. Sort indicators `▲` (asc) or `▼` (desc) in tactical cyan (`#38bdf8`) appear EXCLUSIVELY when a column is actively clicked and sorted.
7. **Pure Direct English & Grade Star Contrast**: All table headers, KPI labels, and modals use 100% direct English (Rule 2.30). Circular Star grade badges strictly enforce `#0F172A` dark slate text (Rule 2.10).
8. **Master Edit Mode Table Input Safeguards**: In view mode (Edit Mode OFF), zero capsule pills around data. When Master Edit Mode is ON, interactive table inputs receive capsule styling (`border-radius: 9999px !important; height: 24px !important; font-size: 12px !important; padding: 2px 8px !important;`) to prevent row jumping or layout distortion.

### 2.39 Tutor's Room 8-Tier Typographic Scale & Zero Sub-11px Invariant (/learn)
Tutor's Room (`admin.html`) enforces an authoritative 8-tier typographic scale rooted in `:root` CSS variables (`--tr-font-*`):
- Display (20px Outfit 800), Title (16px Outfit 700), Subtitle (14px Inter 600), Body (13px Inter 500), Table (12px Inter 500/700), Control (12px Inter 600), Caption (11px Inter 600), Mono (11px Mono 600).
- **Zero Sub-11px Rule**: Absolutely no text element in Tutor's Room may render smaller than `11px`. Eradicate legacy `0.65rem` (8.3px), `0.70rem` (8.9px), `8pt`, and `8.5pt`.
- **Weight Discipline & Zero Italic Degradation**: Standard data cells and descriptions use weight `500` (Medium); weight `700/800` is reserved for headers and active states. Purge unneeded italics on dark backgrounds.

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
- DO NOT commit or push to Git until explicit user command.
