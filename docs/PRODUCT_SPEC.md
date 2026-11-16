# PRODUCT SPECIFICATION — TOPSCORE LMS

## 1. Overview
TopsCore is an institutional, data-efficient, low-egress English Learning Management System (LMS) powered by an AI Test Evaluation Engine. It manages Institutions, Programs, Classes, Levels, Modules, Tests (Tasks & Exams), Student Submissions, Progression, and Admin Operations. All user interfaces, prompts, and system messages are in Direct English Only.

## 2. Core Hierarchy
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

## 3. Key Non-Negotiable Requirements
- **Standing Operational Discipline (Rule 0.2)**: Every instruction must be executed with 4 operational pillars: Fast & Direct (Cepat), Meticulous & Comprehensive (Cermat), Precise & Aligned (Tepat), and Accurate & Verified (Akurat).
- **Admin Primary Navigation (ABCD System)**:
  1. `A — ADMIN` (Executive Dashboard, Profiles, Curriculum & Level Master, Organization)
  2. `B — BOARD` (Batches, Rosters, Progress, Student Attendance)
  3. `C — CLASS` (Active Classes, Learning Sessions, Rosters, Class Tests)
  4. `D — DATA` (Vocabulary Vault, Item Banks, Modules, System Settings, Audit Logs)
- **Student Business ID**: No business-facing Student ID anywhere. UUID internal PK only (maps to auth.users).
- **Student Login (Rule 2.3)**: `INSTITUTION -> PROGRAM -> BATCH -> STUDENT NAME -> PERSONAL PIN`. Server validates that the student belongs to the program, batch, and institution, is active, and the PIN matches hashed record.
- **Test Auto-Naming Formula (Rule 2.6)**: `INSTITUTION + PROGRAM + CLASS + LEVEL + TEST TYPE + TEST TITLE`. Test types are strictly `Task` (modular learning check) or `Exam` (formal examination). Legacy `Quiz` is eradicated.
- **Scoring & Retakes**: Unlimited retakes bounded by availability windows. The main report card stores the **HIGHEST** score. Global average strictly counts unopened/unattempted available modules as 0. Tutors have manual override privileges.
- **Prerequisites & Passing Threshold (Rule 2.4.1)**: Dynamic multi-level prerequisites supporting 0 to N parent tests, minimum score thresholds, and aggregate average score thresholds. Passing threshold is strictly Grade C ($\ge 60\%$). Sequential intra-theme progression requires passing Words Exam ($\ge 60\%$) before Phrases Exam unlocks.
- **Stateless AI Media Pipeline**: Supabase stores ONLY structured text/JSON. Media (audio/photos) is processed transiently in the browser, sent directly to the AI API for evaluation via Edge Functions, and immediately discarded.
- **Official Grading Scale (Rule 2.10 & TOPSCORE_COLORS)**:
  - `★` (100%): "Excellent" | Electric Pink (`#ff2d87` / `var(--grade-star)`)
  - `A` (90% – 99%): "Very Good" | Pure Green (`#00c000ff` / `#00c000` / `var(--grade-a)`)
  - `B` (80% – 89%): "Good" | Electric Lime (`#95ff00ff` / `#95ff00` / `var(--grade-b)`)
  - `C` (60% – 79%): "Enough" | Pure Yellow (`#FFFF00` / `var(--grade-c)`) — Official passing threshold (KKM)
  - `D` (30% – 59%): "Less" | Dark Orange (`#FF8C00` / `var(--grade-d)`)
  - `E` (0% – 29%): "Fail" | Pure Red (`#FF0000` / `var(--grade-e)`)
  - **Special System Tokens**:
    - `Grade R (Remedial)`: Pure Yellow (`#FFFF00`), score capped at 60% (Grade C).
    - `Grade F (Forgiven / Waiver)`: Pure Red (`#FF0000`), administrative progression waiver.
    - `Grade M (Manual Score)`: Tactical Cyan (`#38bdf8`), admin manual input/override.
    - `Grade X (Alumni)`: Vibrant Purple (`#8b5cf6` / `#C084FC`), marks graduate alumni.
- **The 8 Test Evaluation Modules (Rule 2.11 SSOT)**:
  1. `m1` **Description** (Visual Context & Pronouns)
  2. `m2` **Selection** (Standardized Multi-Option Choices)
  3. `m3` **Written** (Text, Spelling & Lexical Precision)
  4. `m4` **Spoken** (Speech & Phonetic Analysis)
  5. `m5` **Speech** (Formal 5-Pillar Speaking Assessment)
  6. `m6` **Monologue** (Independent 3–5 min Narrative Speech)
  7. `m7` **Dialogue** (Pair Live Conversation Room via WebRTC)
  8. `m8` **Interview** (Guided Sequential Q&A)
- **Server Authoritative Timer**: Server sets `started_at` & `expected_end_at`. UI visual timer countdown only.
- **Historical Snapshot**: Attempt answer records retain question and correct answer snapshot. Historical results are never recalculated by rereading current test records.
- **Soft Delete**: `deleted_at` on historical business entities.
- **Audit Log**: Log admin mutations, security events, and attempt updates. Plaintext PINs must never be logged.
- **State Persistence (Rule 2.20)**: Preserves active screen, sub-tabs, filters, and modal routes across page reloads and dynamic updates.
