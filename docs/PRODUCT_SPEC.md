# PRODUCT SPECIFICATION — TOPSCORE LMS

## 1. Overview
TopsCore is an institutional, data-efficient, low-egress English Learning Management System (LMS) powered by an AI Test Evaluation Engine. It manages Institutions, Programs, Classes, Levels, Modules, Tests (Quizzes & Exams), Student Submissions, Progression, and Admin Operations. All user interfaces, prompts, and system messages are in Direct English Only.

## 2. Core Hierarchy
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

## 3. Key Non-Negotiable Requirements
- **Admin Primary Navigation (ABCD System)**:
  1. `A — ADMIN` (Executive Dashboard, Profiles, etc.)
  2. `B — BOARD` (Batches, Rosters, Progress)
  3. `C — CLASS` (Classes, Levels, Topics, Tests, Banks, Vaults)
  4. `D — DATA` (Settings, Audit Logs, Data Health, Modules)
- **Student Business ID**: No business-facing Student ID anywhere. UUID internal PK only (maps to auth.users).
- **Student Login**: INSTITUTION -> PROGRAM -> Student Name -> Personal PIN. Server validates that the student belongs to the program and institution, is active, and the PIN matches hashed record.
- **Test Auto-Naming Formula (Rule 2.6)**: `INSTITUTION + PROGRAM + CLASS + LEVEL + TEST TYPE + TEST TITLE`. Test types are either `Quiz` (formative drill) or `Exam` (formal milestone test).
- **Scoring & Retakes**: Unlimited retakes bounded by availability windows. The main report card stores the **HIGHEST** score. Global average strictly counts unopened/unattempted available modules as 0. Teachers have manual override privileges.
- **Prerequisites**: Dynamic multi-level prerequisites supporting 0 to N parent tests, minimum score thresholds, and aggregate average score thresholds. Strict sequential intra-theme prerequisites require passing Words Exam (≥60%) before Phrases Exam unlocks.
- **Stateless AI Media Pipeline**: Supabase stores ONLY structured text/JSON. Media (audio/photos) is processed transiently in the browser, sent directly to the AI API for evaluation via Edge Functions, and immediately discarded.
- **Official Grading Scale (Rule 2.10 & TOPSCORE_COLORS)**:
  - `★` (100%): "Excellent" | Pure Green (`#00c000ff` / `#00c000`)
  - `A` (90% – 99%): "Very Good" | Pure Green (`#00c000ff` / `#00c000`)
  - `B` (80% – 89%): "Good" | Electric Lime (`#95ff00ff` / `#95ff00`)
  - `C` (60% – 79%): "Enough" | Pure Yellow (`#FFFF00`) — Passing threshold (KKM)
  - `D` (30% – 59%): "Less" | Dark Orange (`#FF8C00`)
  - `E` (0% – 29%): "Fail" | Pure Red (`#FF0000`)
  - Non-standard grades "S", "F", and "R" are strictly eliminated.
  - Remedial attempts are capped at maximum 60% effective score (Grade C).
  - Remedial "R" indicator (`60%ᴿ` or `<sup class="asm-rem-sup">R</sup>`) is strictly attached ONLY to the Score percentage, and never appears on Grade or Point.
- **The 8 Test Evaluation Modules**: 
  1. Point & Speak! (Visual Pronouns)
  2. Storytelling (Narrative Tense)
  3. Conversation-based
  4. Multiple Choice
  5. Read Aloud / Pronunciation
  6. Turn-based Roleplay (Realtime/WebSockets)
  7. Speaking Performance (5 Pillars: Fluency, Pronunciation, Vocabulary, Grammar, Comprehension)
  8. Vocabulary Mastery
- **Server Authoritative Timer**: Server sets `started_at` & `expected_end_at`. UI visual timer countdown only.
- **Historical Snapshot**: Attempt answer records retain question and correct answer snapshot. Historical results are never recalculated by rereading current test records.
- **Soft Delete**: `deleted_at` on historical business entities.
- **Audit Log**: Log admin mutations, security events, and attempt updates. Plaintext PINs must never be logged.
- **State Persistence (Rule 2.20)**: Preserves active screen, sub-tabs, filters, and modal routes across page reloads and dynamic updates.
