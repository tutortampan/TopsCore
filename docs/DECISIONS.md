# ARCHITECTURAL DECISIONS LOG

## DECISION-001 — Static Frontend + Supabase Backend Stack Architecture

Date: 2026-09-09
Status: ACCEPTED

### Context
`AGENTS.md` mandates a static HTML5 + CSS + modular ES JavaScript frontend with Supabase (PostgreSQL, RLS, Storage, Edge Functions) as the server-authoritative backend. No traditional backend frameworks (Django, Express, Docker, Redis) are allowed.

### Decision
Use Vanilla ES Modules JavaScript frontend with Supabase JS SDK, backed by Supabase Edge Functions for all privileged actions (authentication, exam start, answer evaluation, submit, progression calculation).

### Consequences
- Clean separation of concerns.
- Server-authoritative timer, scoring, and level progression logic.
- Lightweight deployment to static web hosts (Netlify/Vercel) and Supabase backend.

---

## DECISION-002 — Student Identification & Authentication Scheme

Date: 2026-09-09
Status: ACCEPTED

### Context
AGENTS.md rule 2.2 states there is NO business-facing Student ID. Rule 2.3 mandates Student Login via: Program -> Class -> Student Name -> Personal PIN.

### Decision
Store student identification using internal primary key (UUID). Student login parameters use hashed PIN (`pin_hash`) verified server-side.

---

## DECISION-003 — Exam Class Availability & Display Naming Formula

Date: 2026-09-09
Status: SUPERSEDED by DECISION-006 & DECISION-008 (Level-Centric Auto-Assignment) and DECISION-077 (Unified 4-Letter Program Prefix, Harmonized Class & Test SKU Standards, and Strict Hyphenated Room Codes)

### Context
Rule 2.5 allows an Exam to be assigned to multiple Classes within the same Program via `exam_classes` (many-to-many).
Rule 2.6 establishes display naming formula: `PROGRAM + CLASS + SUBJECT + LEVEL + EXAM TYPE + EXAM TITLE`.

### Decision
Store structured foreign keys and attributes separately in `exams` and `exam_classes` tables while dynamically generating display names.

---

## DECISION-004 — Written Answer Tolerance Algorithm

Date: 2026-09-09
Status: ACCEPTED

### Context
Rule 2.13 mandates deterministic server-authoritative written answer tolerance using Damerau-Levenshtein edit distance.

### Decision
- 0 edit distance -> Full point (1.0) ("Correct")
- 1-2 edit distance -> Half point (0.5) ("Minor Spelling Error")
- 3+ edit distance -> Zero point (0.0) ("Incorrect")
Normalized string pre-processing applies (trimming, lowercasing, whitespace collapse, punctuation stripping).

---

## DECISION-005 — Autonomous PowerShell Command Execution

Date: 2026-09-09
Status: ACCEPTED

### Context
User instruction: "from now always allow powershell -command". Continuous manual confirmation interrupts agentic testing, database diagnostics, and automation tasks.

### Decision
Agents are authorized and instructed to execute `powershell` commands proactively for diagnostics, verification, health checks, and build tasks across the workspace without requesting confirmation for standard non-destructive operations. Recorded in `AGENTS.md` Section 0.1.

---

## DECISION-006 — Direct Program-Level Inheritance for Subjects and Exams (Batch as Student Grouping)

Date: 2026-09-09
Status: ACCEPTED

### Context
User requirement: "The relation between between Student, and Exam are about Program, Class, level. So when creating The exams those are the data needed to be determined, batch is impportant for gruouping the student." followed by "the exams only need to be created, no need assigned feature.subject assignment feature also not needed, the. put in the plan".
Prior rules (Rule 2.4 and Rule 2.5) envisioned manual assignment of subjects to classes (`class_subjects`) and exams to classes (`exam_classes`). This introduced unnecessary operational friction and orphaned exams.

### Decision
1. **Direct Program-Level Hierarchy**:
   - **Subjects**: Belong directly to a Program (`programs -> subjects`). All classes and students within a Program automatically inherit all Subjects in that Program. Manual Subject-to-Class assignment is eliminated.
   - **Exams**: Belong directly to `Program -> Subject -> Level` (`programs -> subjects -> levels -> exams`). When an exam is created and published, it is immediately available to all students enrolled in that Program who have unlocked that Level. Manual Exam-to-Class assignment is eliminated.
2. **Batch as Student Grouping**:
   - Hierarchy: `Program -> Class -> Batch -> Student`.
   - Batch does not branch or duplicate curriculum/exams.
   - Batch is essential for student grouping, tracking, filtering, and reporting in:
     - **Results View (`renderResults`)**: Batch column + cascading Program/Class/Batch filters.
     - **Student Progress View (`renderProgressView`)**: Batch column + cascading Program/Class/Batch filters.
     - **Student Management & Import**: Organizing cohorts within a Class.
3. **UI Streamlining**:
   - Removed obsolete "Subject Assignments" and "Exam Assignments" sub-tabs from admin navigation and views.
   - Streamlined `fetchStudentSubjects` and `fetchExamsForStudentLevel` to query directly by Program and Level.

---

## DECISION-007 — Level Structural Hierarchy Alignment and Permanent Default Master Data

Date: 2026-09-09
Status: ACCEPTED

### Context
1. User requested: *"Add class option when adding levels. the the hierarchy of optiion shown must fokllow the structure hierarchy. analyze this first then execute."*
2. User requested: *"The Stored Programs Are "CEC with Camp Class" and "Sheraton with "Morning", and "Afternoon" as class", Program "Tamata" with "Hospitality" Class., The Stored Subject are "Vocabularies". These are default. Stored it permanently unless I delete it. analyze and implement"*

### Decision
1. **Level Form Hierarchy**:
   The options in the Add/Edit Level modal MUST strictly follow top-to-bottom structural hierarchy:
   `Program` → `Class` → `Subject` → `Level Number` → `Level Name` → `Active`.
   - Program selection cascades to populate both Class and Subject options simultaneously.
   - Class selection allows targeting a specific class within the Program, or leaving optional (`All Classes`).
   - Editing a Level automatically resolves Program from `record.program_id || record.subjects?.program_id` and preselects Class and Subject.
2. **Permanent Default Master Data**:
   The default curriculum master data is permanently persisted in Supabase PostgreSQL:
   - Program **"CEC"** with Class **"Camp"** and Subject **"Vocabularies"**.
   - Program **"Sheraton"** with Classes **"Morning"** & **"Afternoon"** and Subject **"Vocabularies"**.
   - Program **"Tamata"** with Class **"Hospitality"** and Subject **"Vocabularies"**.
   - These records remain active and permanent unless explicitly deleted by the user.
3. **Database Schema & Resilience**:
   - Added `class_id UUID REFERENCES classes(id) ON DELETE SET NULL` to `levels` in `supabase-setup.sql`.
   - The frontend submit handler incorporates graceful fallback: if the database schema cache rejects `class_id`, the level is saved without crashing.


## DECISION-008 — Level-Centric Auto-Assignment

Date: 2026-09-26
Status: ACCEPTED

### Context
The previous assignment architecture required administrators to manually assign every new assessment to specific Batches or Students (via the ssignments table) before students could see them. This caused friction and a disconnected workflow where creating an assessment and assigning it were two separate, manual steps. The user provided a syllabus diagram indicating that subjects (Classes) are strictly grouped into Levels (e.g., 1st Level = Basic English, Telling Story 1, Vocab 1).

### Decision
We are switching to a **Level-Centric Auto-Assignment** model.
1. Classes (Subjects) belong to a Level.
2. Assessments are created within a Class.
3. Batches (and by extension, the students in them) exist at a specific Level (or unlock levels sequentially).
4. By simply being on "1st Level", a batch automatically gains access to ALL assessments belonging to ANY class mapped to the "1st Level". 
5. The ssignments table is DEPRECATED for broad cohort assignments, though it may still be retained for highly specific individual student overrides if needed.

### Consequences
- Assessment visibility queries in pi.js (e.g., etchAssessmentsForStudentClass) must be completely rewritten. Instead of joining on the ssignments table, the query will now check if the assessment's class_id belongs to a level_id that the student's batch has unlocked.
- The Admin UI "Cohorts & Assignments" tab will be repurposed or removed in favor of simply mapping Batches to Levels.
- We must update the AGENTS.md Non-Negotiable Business Rules to reflect this new mechanism.

## DECISION-011 — Single-Door Assessment Workflow (Context-Locked)

Date: 2026-09-28
Status: ACCEPTED

### Context
Curriculum management was fragmented, leading to orphaned assessments created without a parent `class_id` or `level_id`. This broke the Level-Centric Auto-Assignment architecture.

### Decision
All assessment creation must pass through a centralized Single-Door Workflow inside Domain C (Class & Curriculum). Assessments can only be initialized from within a Class workspace (Dual-Axis Binder Workspace), automatically inheriting and locking `class_id` and `level_id`.

### Consequences
- Eliminates orphaned assessment records.
- Guarantees `class_id` and `level_id` are populated at creation.
- Level-Centric Auto-Assignment to student batches functions flawlessly upon publishing.
- Assessment builder UI is locked from modifying scope and tier during editing.

---

## DECISION-013 — Student Dashboard Avatar Scaling, Royal Title Mechanics, Glow Hierarchy, and Dual-Tab Dock Standings

Date: 2026-10-18
Status: ACCEPTED (Grade S symbol and gold color superseded by DECISION-020 and DECISION-070; Royal titles superseded by DECISION-053)

### Context
Student dashboard engagement required visual dominance for student avatars, clear visual recognition for 100% scores (Grade S), healthy peer competition within the batch, and prestige gamification mechanics while maintaining a strict mobile zero-scroll budget (`100dvh`) and preserving `#bottom-ad-banner` (28px).

### Decision
1. **Visual Avatar Scaling**:
   - Enlarge `#banner-avatar-container` from 60px to 86px with 50% border radius, circular clipping, and tier glowing borders.
   - Wrap in `.banner-avatar-wrapper` with relative positioning to host floating crown.
2. **Grading & Glow Hierarchy**:
   - Grade S (100%): Shining star (`⭐`) with radiant golden glow (`rgba(245, 158, 11, 0.85)`).
   - Grade A (91–99%): Emerald green (`#10b981`) with soft emerald glow.
   - Grade B (71–90%): Sky blue (`#06b6d4`) with soft cyan glow.
   - Grade C (51–70%): Warm yellow (`#eab308`) with soft amber glow.
   - Grade D (31–50%): Flame orange (`#f97316`) with soft orange glow.
   - Grade E (11–30%): Crimson red (`#ef4444`) with soft red glow.
   - Grade F (0–10%): Neutral slate (`#64748b`) with minimal glow.
   - Export authoritative `getGradeSymbol(grade, percentage)` from `js/grading.js`.
3. **Royal Title & Crown Mechanics**:
   - The student with the highest average score (> 0%) in the active batch earns the batch championship.
   - Dynamic royal title prefix: `"King <Name>"` for male, `"Queen <Name>"` for female (replaces `"Mr."` / `"Miss"`).
   - Floating crown badge (`👑`) appears directly above the avatar with breathing animation.
   - Titles update in real-time when another student overtakes the lead.
4. **Dual-Tab Dock & Batch Standings Matrix**:
   - Replace single bottom container with dual-tab dock (`[ 🏆 Batch Standings ] [ 📋 Completed ]`) and rank badge indicator (`RANK #1`).
   - 4-level deterministic tie-breaker sorting:
     1. Overall score (descending)
     2. Completed assessments count (descending)
     3. Earliest last submission timestamp (ascending)
     4. Alphabetical student name (ascending)
   - Isolate inner scrolling within `#dock-pane-standings` with hidden scrollbars, guaranteeing zero outer viewport scrolling.

### Consequences
- Heightened gamification and peer motivation.
- 100% preservation of `100dvh` zero-scroll mobile geometry and 28px bottom ad banner.
- Authoritative grading rules remain centralized in `js/grading.js`.

---

## DECISION-014 — Global Elevated Topbar Summary Tabs, Row C Action Button Purge & Data Health Recalibrator

Date: 2026-10-18
Status: ACCEPTED

### Context
In the TopsCore LMS admin console, the Assessments Hub header suffered from redundant vertical rows:
1. Row A had static breadcrumb text ("CLASS / Assessments Hub") consuming vertical space.
2. Row B had duplicated KPI metric cards (Total, Published, Draft, Question Bank).
3. Row C had 8 action buttons, many obsolete (e.g., "+ Create Assessment", as assessments are generated dynamically from class syllabus blueprints, or buttons navigating to separate sub-sections like Cohorts, Vocab Vault, and Question imports/exports).
This wasted ~160px of vertical viewport height, pushing filter tabs and the main assessment DataGrid below the fold.

### Decision
1. **Global Elevated Topbar Summary Tabs**:
   - Standardize `<header class="admin-topbar" id="admin-topbar">` to 56px height, glassmorphic backdrop (`rgba(15, 23, 42, 0.75)`, `backdrop-filter: blur(12px)`), retaining the responsive sidebar toggle (`#sidebar-toggle`) on the left and dynamic `#topbar-tabs-container`.
   - Implement `window.setTopbarTabs(tabs, activeId, onSelect)` to elevate summary cards / category tabs directly into the topbar across all admin sections (Assessments Hub, Curriculum/Classes Hub, Student Management).
   - Render tab cards as sleek pills/boxes (`flex: 1; height: 42px; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; border-radius: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);`).
2. **Purge Row C & Redundant Action Buttons**:
   - Completely remove the button strip containing `+ Create Assessment`, `Cohorts & Assignments`, `Results`, `Recalibrate`, `Import Questions`, `Export Questions`, `Vocab Vault`, and `Open Session`.
   - Remove Row B in-page KPI cards.
   - Dock `#assessment-filters` and the DataGrid immediately beneath the topbar, reclaiming all vertical dead space.
3. **Relocate Exam Recalibrator to Domain D (Data Health)**:
   - Move the recalibration controller logic to Domain D -> Data Health (`admin.html#health`) under a dedicated maintenance card: "Assessment Engine Recalibration" (`#card-assessment-recalibration`).
   - Wire grid row actions to set `window._filterRecalibrateAssessment` and route to `#health` with smooth scrolling and auto-preview.

### Consequences
- Clean, uncluttered admin interface with modern glassmorphism.
- 160px+ of vertical space reclaimed across all displays.
- Recalibration logic centralized in its proper domain (Domain D Data Health & Maintenance).

---

## DECISION-015 — Ecosystem Naming Rebrand: Admin Panel to "Tutor's Room" and Student Panel to "Student's Lobby"

Date: 2026-10-25
Status: ACCEPTED (Student workspace naming "Student's Lobby" superseded by DECISION-044 in favor of "Student Gate" for login and "Class Hub" for dashboard)

### Context
User explicitly directed to rebrand the administrative and student workspaces:
"the admin panle's name now the "Tutor's Room". students panel now called "Student's Lobby". do it!"
Previously, the admin console was titled "Top Office" and student dashboard was titled "Top Space" or "Dashboard".

### Decision
1. **Admin Workspace ("Tutor's Room")**:
   - `admin.html`: Page `<title>` renamed to `Tutor's Room — TOPS CORE`.
   - Sidebar brand sub-label renamed from `TOP OFFICE` to `TUTOR'S ROOM`.
   - Admin Login screen title updated to `TUTOR'S ROOM` with submit button `Sign In to Tutor's Room`.
   - Return navigation on admin login card updated to `← Student's Lobby`.
   - Gear icon on student login portal updated with title and aria-label `Tutor's Room`.
   - Admin result viewer back navigation updated to `← Kembali ke Tutor's Room`.
2. **Student Workspace ("Student's Lobby")**:
   - `dashboard.html`: Page `<title>` renamed to `Student's Lobby — TOPS CORE`.
   - Header brand text in `dashboard.html` updated to `🎓 STUDENT'S LOBBY`.
   - `index.html`: Page `<title>` renamed to `Student's Lobby — TOPS CORE`, subtitle updated to `Student's Lobby — Sign in to continue`.
   - `result.html`: Primary return button updated to `&larr; Back to Student's Lobby`.

### Consequences
- High pedagogical clarity: Tutors have their dedicated "Tutor's Room", while students congregate and track learning progress in "Student's Lobby".
- Consistent naming across titles, meta tags, headers, and cross-panel navigation links.
- Non-destructive change preserving all underlying ABCD architecture, database schema, and authentication sessions.

---

## DECISION-016 — Authoritative Solid Color Palette and 50px Bottom Banner Standardization

Date: 2026-10-25
Status: SUPERSEDED by DECISION-019, DECISION-020, and DECISION-070 regarding color palette, and AGENTS.md §0.2.3 regarding 40px Lower Panel

### Context
User issued explicit non-negotiable directives:
1. "warna E = pure Red, D Pure ornage, C = Pure Yellow B =Pure Cyan A= Pure Green 100% get a star=Pure Purple Remidi Pure Yellow"
2. Student photo ring must dynamically reflect the student's Grade tier with ambient glow.
3. Bottom banner across all main application pages must measure exactly 50px in height.

### Decision
1. **Authoritative Solid Tier Colors**:
   - E / F: Pure Red (`#FF0000`, `rgb(255, 0, 0)`)
   - D: Pure Orange (`#FF8000`, `rgb(255, 128, 0)`)
   - C: Pure Yellow (`#FFFF00`, `rgb(255, 255, 0)`)
   - B: Pure Cyan (`#00FFFF`, `rgb(0, 255, 255)`)
   - A: Pure Green (`#00FF00`, `rgb(0, 255, 0)`)
   - 100% / S (Get a Star): Pure Purple (`#A855F7`, `rgb(168, 85, 247)`)
   - Remedial / Remidi: Pure Yellow (`#FFFF00`, `rgb(255, 255, 0)`)
2. **Dynamic Student Photo Ring**:
   - Eliminated all static amber/yellow avatar borders. Avatar rings now adhere dynamically to the student's Grade with `border: 2.5px solid <gradeColor>` and glowing `box-shadow`.
3. **Global 50px Bottom Banner**:
   - Fixed `#bottom-ad-banner` and `.topscore-locked-banner` to exactly `50px !important; min-height: 50px !important; max-height: 50px !important;` across `result.html`, `dashboard.html`, and `assessment.html`.

### Consequences
- Visually stunning, high-contrast, pure solid color hierarchy across both student and tutor panels.
- Unified 50px bottom banner guarantees consistent layout metrics and strictly preserves mobile zero-scroll budget (`820px`).

---

## DECISION-017 — Result Page Wireframe Architecture, Exact Word Evaluation, and Dynamic Tier Aura Synchronization

Date: 2026-10-25
Status: ACCEPTED

### Context
User provided an architectural wireframe diagram specifying exact zero-scroll vertical dimensions and visual styling for the TopsCore Result Page across Student's View and Tutor's View:
1. Realign components with fixed ergonomic heights: Header (50px), Student Metadata (150px, 1:1 with Student Dashboard), 2-Line Assessment Title (50px), Score/Grade Card (50px), Evaluation Word Card (50px), Action Bar [Next Milestone / Tutor Normal-Remidi] (50px), Navigation Button [Back to Lobby / Room] (30px), Answer Breakdown (30px), Bottom Banner (50px).
2. The Metrics Table (Correct, Partial, Incorrect, Points) dynamically absorbs the remaining vertical viewport (`flex: 1 1 0px`).
3. User explicitly mandated that the evaluation card must contain ONLY the exact single word without icons or extra phrases: `E=FAIL / D=LESS / C=ENOUGH / B=GOOD / A=VERY GOOD / STAR=EXCELLENT`.
4. User evaluated a secondary proposal of percentage-based heights (15%-35%-15%-15%-10%-10%) and formally approved retaining the fixed ergonomic + dynamic metrics scoreboard model ("baik, biarkan saja").
5. Container borders and radial backgrounds across all cards dynamically radiate the student's Grade tier color.

### Decision
1. **Fixed Ergonomic Card Heights**: Standardize Title (50px), Score/Grade (50px), Evaluation Word (50px), Next Action / Remedial segmented buttons (50px), Back button (30px), and Breakdown button (30px).
2. **Exact Word Evaluation**: `#result-motivation-msg` (`.result-evaluation-card`) renders text-only single words (`FAIL`, `LESS`, `ENOUGH`, `GOOD`, `VERY GOOD`, `EXCELLENT`) with glowing uppercase typography. (Note: `REMEDIAL` is strictly an exam status and excluded per DECISION-018 and DECISION-041).
3. **Dynamic Tier Border & Background Aura**: Card borders and backgrounds across all containers dynamically reflect `--tier-color` and `--tier-rgb`.
4. **View Parity**: Student's view and Tutor's view maintain strictly identical card heights, 10px gaps, and typography.

### Consequences
- Guaranteed zero-scroll layout across all standard mobile and desktop viewports without vertical overflow.
- Data-driven centerpiece: Metrics table retains maximum vertical headroom and legibility.
- Clean, focused, minimalist evaluation card without distracting emojis or verbose sentences.
---

## DECISION-018 — Authoritative Grade Terminology: Achievement Status & Remedial Exclusion

Date: 2026-10-25
Status: ACCEPTED

### Context
User issued an explicit directive regarding grade-based evaluation wording:
"UNTUK UCAPAN SESUAI GRADE, KITA SEBUT DENGAN ISTILAH ACHIEVEMENT STATUS, FAIL, LESS ENOUGH, GOOD, VERU GOOD, EXCELLENT. REMEDIAL BUKAN STSUS ACHEVEMENT."

### Decision
1. **Official Component Name**: The evaluation word component is formally designated as **Achievement Status** (`achievement_status`).
2. **Authoritative 6-Tier Values**:
   - Grade E (0–29%): `FAIL`
   - Grade D (30–59%): `LESS`
   - Grade C (60–79%): `ENOUGH`
   - Grade B (80–89%): `GOOD`
   - Grade A (90–99%): `VERY GOOD`
   - Grade ★ / STAR (100%): `EXCELLENT`
3. **Strict Remedial Exclusion**:
   - `REMEDIAL` is an exam status / condition, NOT an Achievement Status.
   - The Achievement Status card MUST NEVER display "REMEDIAL".
   - Remedial attempts evaluate their Achievement Status from their achieved / effective score (e.g., a remedial score capped at 60% receives `ENOUGH`; scores below 40% receive `LESS` or `FAIL`).
4. **Universal Applicability**:
   - Applies across both the Result Page (`result.html`) and the Student Lobby Dashboard (`dashboard.html`).

### Consequences
- Eliminates semantic ambiguity between exam state (normal vs remedial) and academic performance achievement.
- Provides a clean, standardized, 6-tier classification scale across the entire TopsCore platform.

---

## DECISION-019 — Official Grading Scale & Remedial Max 60% Score Capping

Date: 2026-10-26
Status: ACCEPTED (Star tier color governed by DECISION-070 #c084fc; SUPERSEDES DECISION-016 tier color mappings & prior score thresholds)

### Context
User provided the official Grading Scale diagram (tablet & printout specifications) with exact score intervals, predicate labels, and color gradients:
1. **Grading Scale Chart**:
   - **★ (S)**: 100% | Predicate: `Excellent` | Ungu / Purple (`#A855F7`)
   - **A**: 90% – 99% | Predicate: `Very Good` | Hijau / Rich Green (`#10B981`)
   - **B**: 80% – 89% | Predicate: `Good` | Lime / Hijau Muda / Yellow-Green (`#84CC16`)
   - **C**: 60% – 79% | Predicate: `Enough` | Kuning / Yellow (`#EAB308`)
   - **D**: 30% – 59% | Predicate: `Less` | Jingga / Orange (`#F97316`)
   - **E**: 0% – 29% | Predicate: `Fail` | Merah / Red (`#EF4444`)
2. **Remedial Rules**:
   - Remedials do not get a standalone special remedial score or separate artificial color override.
   - Maximum remedial score is capped at **60%** (`Math.min(rawPct, 60.0)` and `Math.min(points, totalQuestions * 0.6)`).
   - Grade is derived directly from the effective score (at the 60% cap, Grade is `C`).
   - Remedial status is visually indicated with a small "R" superscript (`<sup class="asm-rem-sup">R</sup>` or `ᴿ`) attached **ONLY** to the **Score** percentage (e.g., `60%ᴿ` or `60%<sup>R</sup>`) on the result page and student grade page in class. It is NOT attached to Grade or Point.
   - Grade and Point remain clean (Grade: `C`, `D`, `E`, etc.; Point: clean numbers).
   - The visual color strictly follows the score tier (at 60%, Yellow `#EAB308`).

### Decision
1. Update `calculateGrade(pct)` across `grading.js`, `submit-assessment` Edge Function, `api.js`, `app.js`, `student-management.js`, and `class.js` to strictly enforce the new boundaries (100, 90–99, 80–89, 60–79, 30–59, 0–29).
2. Align `GRADE_PALETTE` and CSS utility classes to `#A855F7` (S/★), `#10B981` (A), `#84CC16` (B), `#EAB308` (C/R), `#F97316` (D), `#EF4444` (E).
3. Enforce server and client remedial score capping at 60% max.
4. Render small `<sup class="asm-rem-sup">R</sup>` or `ᴿ` strictly next to the **Score** percentage on the result page and the class student grade page, omitting "R" from Grade and Point displays.

### Consequences
- Authoritative visual and functional harmony across all Student, Tutor, and Admin surfaces.
- Remedial students are fairly assessed up to the maximum 60% passing threshold with clear distinction on score percentages.
- Clean code architecture across both client ES modules and Supabase Edge Functions.

---

## DECISION-020 — Elimination of Grades "S", "F", and "R" in Favor of Canonical 6-Tier Scale (★, A, B, C, D, E)

Date: 2026-10-27
Status: ACCEPTED (Star tier color governed by DECISION-070 #c084fc; SUPERSEDES DECISION-019 regarding the letter representation of the 100% Star tier)

### Context
User requirement: "hilangkan grade 'S' dan 'F', serta 'R'".
1. **Grade "S"**: The Star tier (100%) must be represented strictly by the canonical symbol `★` (U+2605), not the letter "S".
2. **Grade "F"**: Fail tier (0%–29%) is represented exclusively by Grade `E`. The legacy alias "F" is eliminated.
3. **Grade "R"**: Remedial is an assessment condition, not a grade symbol. Remedial attempts receive Grade `C` (derived from the 60% cap). Grade "R" does not exist in any grading scale, palette, or badge.

### Decision
1. `calculateGrade(percentage)` returns `'★'` directly when score >= 100%. Allowed grade outputs across the system are strictly: `★`, `A`, `B`, `C`, `D`, `E`.
2. `GRADE_PALETTE` has `'★'` as its primary key. The keys `'F'` and `'R'` are removed. Key `'S'` is preserved solely as a backwards-compatibility alias for older database records.
3. Database Edge Function `submit-assessment` and PostgreSQL fallback RPCs assign `v_grade := '★'` when effective score >= 100.
4. CSS stylesheets define `.grade-star`, `.grade-★`, `.text-grade-star`, `.text-grade-★` with purple `#A855F7`, and remove `.grade-F` and `.form-pill.grade-f`.
5. Grade badges display clean symbols (`★`, `A`, `B`, `C`, `D`, `E`). Remedial status `R` is attached exclusively to the Score percentage (`%`).

### Consequences
- Unambiguous 6-tier grade nomenclature matching official institution standards: ★, A, B, C, D, E.
- Zero confusion between remedial attempts and grade letters.
- Flawless visual consistency across frontend, database, and backend functions.

---

## DECISION-021 — Complete Deprecation and Absolute Purge of Term "Assessment" in Favor of "Test" (Plural: "Tests", Sub-categories: "Quiz" & "Exam")

Date: 2026-10-27
Status: ACCEPTED

### Context
Over the platform's history, the term "Assessment" was used alongside "Exam", "Task", and "Quiz" resulting in lexical overlap, ambiguous table names (`assessments`, `assessment_questions`), and inconsistent UI labels.
User mandate:
1. Complete deprecation and absolute purge of the term "Assessment" / "Assessments" across the entire repository.
2. Singular/Plural Precision Rule:
   - Singular context: `Test`
   - Plural context: `Tests`
3. Sub-categories strictly split into:
   - `Quiz` (pl: `Quizzes`): Daily tasks, formative checks, phrase runner drills, quick-feedback items. (Note: The term "Quiz" was later permanently deprecated and replaced by "Task" per DECISION-039).
   - `Exam` (pl: `Exams`): Formal, scheduled, high-stakes, strictly-timed examinations.
4. ZERO RESIDUE: No orphan tables, dead alias RPCs, deprecated columns, unused TypeScript interfaces, or residual UI strings containing "assessment".
5. DATA PRESERVATION: 100% data preservation of all historical attempts (851 attempts, 44,566 attempt answers) and 40 live tests (32 quizzes + 8 exams).

### Decision
1. **Database Schema**:
   - Created `test_type` ENUM (`quiz`, `exam`).
   - Created `public.tests`, `public.test_items`, `public.test_topics`, `public.test_results`.
   - Backfilled and verified 100% of data from legacy tables.
   - Added `test_id` column to `attempts`, `assignments`, `student_submissions`, `question_usage_history`.
   - Enforced `NOT NULL` on `attempts.test_id` with foreign key `attempts_test_id_fkey` referencing `tests(id) ON DELETE CASCADE`.
   - Dropped legacy columns (`attempts.assessment_id`, etc.) and legacy tables: `assessments`, `assessment_questions`, `assessment_topics`, `assessment_results`, `assessment_instances`, `assessment_attempts`, `assessment_attempt_answers`.
   - Updated RPCs `reorder_test` and `emergency_submit_attempt`.
2. **Backend / Edge Functions**:
   - Replaced legacy functions with `start-test`, `submit-test`, `duplicate-test`, `evaluate-test`.
   - Updated `import-questions` and `generate-module-template`.
   - Deleted legacy assessment function folders.
3. **Frontend Core & State**:
   - Renamed physical files:
     - `assessment.html` -> `test.html`
     - `css/assessment.css` -> `css/test.css`
     - `js/assessment.js` -> `js/test.js`
     - `js/admin/assessment-management.js` -> `js/admin/tests-management.js`
     - `js/admin/assessment-access.js` -> `js/admin/tests-access.js`
     - `js/admin/assessment-builder.js` -> `js/admin/test-builder.js`
   - Updated all database queries in `js/api.js` and all 25 modules in `js/` to target `tests`, `test_items`, and `test_id`.
   - Updated UI text, navigation tabs, buttons, modal headers, and badges across `admin.html`, `dashboard.html`, `test.html`, `result.html`, `index.html`.
   - Updated `sw.js` cache manifest to `topscore-cache-test-v1` and registered `css/test.css` & `js/test.js`.

### Consequences
- Pristine, unified, intuitive domain terminology: Tests (Quizzes & Exams).
- Zero technical debt, zero residue, and zero semantic confusion across all layers.
- 100% preserved student attempt history and complete relational integrity.

---

## DECISION-022 — Weekly-Only Academic Scoring (SCORE, GRD, PTS) & Comprehensive PROG Leaderboard Ranking in Class Hub

Date: 2026-10-27
Status: ACCEPTED (Leaderboard sort order superseded by DECISION-024; left-panel scoring superseded by DECISION-032)

### Context
In `admin.html#class-hub`, previous metric calculations aggregated all activities indiscriminately, allowing daily drills to dilute or inflate formal academic grades and overall mastery.
User requirements:
1. **PROG % (Completion Rate)**: Maintain calculation across ALL activities (daily tasks/quizzes + weekly milestone exams).
2. **Global SCORE % & Global GRD (Academic Mastery)**: Calculate EXCLUSIVELY from weekly exams (milestone exam sessions). Exclude daily drills entirely. Dynamic GRD badge (★, A, B, C, D, E) maps directly to this weekly-only Global SCORE %.
3. **Global PTS (Points)**: Aggregate points earned EXCLUSIVELY from weekly exams.
4. **Edge-Case Handling (Unattempted Weekly Exams)**: If a student has only completed daily drills without taking weekly exams:
   - PROG % reflects task completion.
   - SCORE % displays `—` (or 0%).
   - GRD badge displays `—`.
   - PTS evaluates to 0.
5. **Leaderboard Sort Order**:
   - Primary: PROG % DESC.
   - Secondary: Global SCORE % DESC.
   - Tertiary: Global PTS DESC.
6. **Footer "CLASS AVERAGE"**: Align average calculations with the weekly-only metrics.

### Decision
1. Update `renderClassHub` in `js/admin/app.js`:
   - Classify tests via `isWeeklyExam(asm)`.
   - Compute `completedCount` across all 40 class activities for `progressPct`.
   - Compute `completedWeeklyCount`, `sumWeeklyPercentages`, and `weeklyEarnedScore` strictly from weekly exams.
   - Assign `averageScorePct = completedWeeklyCount > 0 ? Math.round(sumWeeklyPercentages / completedWeeklyCount) : 0`.
   - Assign `totalEarnedScore = completedWeeklyCount > 0 ? weeklyEarnedScore : 0`.
   - Assign `grade = completedWeeklyCount > 0 ? calculateGrade(averageScorePct) : '—'`.
2. Format table cells for SCORE, GRD, and PTS to cleanly display `—` / `0 pts` when weekly exams are unattempted.
3. Configure `sortComparator` and `studentsGridData.sort` to sort by `PROG % DESC` > `Global SCORE % DESC` > `Global PTS DESC`.
4. Update `summaryRow` so that class average SCORE and GRADE are derived strictly from students with completed weekly exams.

### Consequences
- True academic mastery is isolated from daily practice drills.
- Leaderboard fairly elevates students with high curriculum completion first, followed by formal exam mastery and points.
- Consistent, intuitive edge-case presentation for students before they take weekly exams.

---

## DECISION-023 — Terminology Simplification (Quiz vs Exam) & Dynamic Weighted Exam-Only Scoring Architecture

Date: 2026-10-28
Status: ACCEPTED (Terminology 'Quiz' superseded by DECISION-039; scoring and sort order superseded by DECISION-024, DECISION-029 & DECISION-031)

### Context
Previous implementations accumulated cluttered, conflicting terminology prefixes across the codebase ("Daily Quiz", "Daily Task", "Weekly Exam", "Theme Exam", "Theme TOT"). Furthermore, static slot ceilings (40, 10, 50) and unweighted averages leaked into point and score calculations, artificially capping student points on multi-section milestone exams and distorting class leaderboards.

### Decision
1. **Terminology Standardization**:
   - Universal two-tier functional classification:
     * **"Quiz" (pl: "Quizzes")**: Formative daily checks, vocabulary drills, phrase exercises (32 in Level 3).
     * **"Exam" (pl: "Exams")**: Evaluative milestone examinations (8 in Level 3: Words & Phrases Exams per Theme).
   - Fully deprecate and purge: "Daily Quiz", "Daily Task", "Weekly Exam", "Theme Exam", "Theme TOT", and "Assessment".
2. **Metric Scope & Mathematical Rigor**:
   - `PROG %`: Tracks curriculum completion across BOTH Quizzes and Exams: `Math.round((completedCount / totalScheduled) * 100)`.
   - `Global SCORE %`: Calculated EXCLUSIVELY from Exams as true weighted mastery:
     $$\text{Global SCORE \%} = \text{round}\left( \frac{\sum \text{Exam Earned Scores}}{\sum \text{Exam Max Possible}} \times 100 \right)$$
   - `Global PTS`: Evaluated EXCLUSIVELY as the sum of actual points earned on Exams: $\sum \text{Exam Earned Points}$.
   - `Global GRD`: Dynamic grade predicate mapping to Exam-only Score % (`★`, `A`, `B`, `C`, `D`, `E`).
   - `Zero-Exam Edge Case`: When a student has completed only Quizzes without taking any Exams, render neutral indicators: Score `—`, Grade `—`, and `0 pts`.
3. **Dynamic Exam Point Ceilings**:
   - Replace hardcoded slot caps (40/10) with dynamic question resolution (`asm.payload?.total_questions || asm.total_questions`), reflecting actual exam scale (Words Exams: 120, 280, 480, 640; Phrases Exams: 30, 70, 120, 160).
4. **Leaderboard Multi-Tier Sorting Hierarchy**:
   - Tier 1: `PROG %` DESC (Curriculum progress)
   - Tier 2: `Global SCORE %` DESC (True weighted exam mastery)
   - Tier 3: `Global PTS` DESC (Cumulative points earned on exams)
   - Tier 4: `lastSubmittedAt` ASC (Earliest submission time tie-breaker)
   - Tier 5: Student Name ASC
5. **Database Constraint & Canonical Grades**:
   - Backfilled all historical grades in Supabase PostgreSQL to canonical symbols (`★`, `A`, `B`, `C`, `D`, `E`).
   - Added PostgreSQL CHECK constraint: `CHECK (grade IN ('★', 'A', 'B', 'C', 'D', 'E') OR grade IS NULL)`.

### Consequences
- Zero ambiguity across Admin Class Hub, Student Dashboard, Edge Functions, and Database.
- Strict parity between Admin Class Hub and Student Dashboard scoring engines.
- True representation of student mastery with dynamic multi-question exam point ceilings.

---

## DECISION-024 — Points-First Leaderboard Hierarchy & Admin Table Ergonomics

Date: 2026-10-28
Status: ACCEPTED (Partially supersedes DECISION-023 Tier 1 sorting; Point 2 regarding milestone 0% penalty superseded and eliminated by DECISION-029)

### Context
1. **The Ranking Paradox**: Students with fewer exam points were ranking above students with vastly higher exam performance (e.g. Mr. Suke Ajai with 18 tasks / 143 pts was ranked above Miss Sofa Maria Ulfa with 17 tasks / 273.5 pts) because `PROG %` was previously evaluated as the primary sort key.
2. **Admin Table Display Ergonomics**:
   - The "Mr." and "Miss" honorific titles took up horizontal column space in the Admin Class Hub matrix grid where screen real estate is at a premium.
   - Daily quizzes were displaying raw points (e.g. `40`, `10`), creating confusion because points are designed for weighted Milestone Exams, whereas quizzes are formative daily checks evaluated by percentage score.

### Decision
1. **Points-First Leaderboard Hierarchy**:
   - Re-architected both Tutor's Room (`admin.html#class-hub`) and Student's Lobby (`dashboard.html`) to sort strictly by:
     * **Tier 1 (Primary)**: `Global PTS DESC` (Highest cumulative exam points first).
     * **Tier 2 (Secondary)**: `Global SCORE % DESC` (If points are tied, higher mastery percentage wins; unattempted exams sort after completed).
     * **Tier 3 (Tertiary)**: `PROG % DESC` (If points and score are tied, higher syllabus completion wins).
     * **Tier 4 (Time-breaker)**: `lastSubmittedAt ASC` (Earliest timestamp wins).
     * **Tier 5 (Alphabetical)**: Student Clean Name ASC.
   - Updated default DataGrid sort key in Admin Class Hub to `initialSortKey: 'totalEarnedScore'` (PTS column sorted DESC by default).
2. **Admin Table Ergonomics**:
   - **Clean Student Names**: Stripped `Mr.` and `Miss` honorifics from `displayName` in Admin Class Hub table using `cleanStudentName()` to maximize horizontal space. Student Dashboard retains honorifics in student-facing lobby views.
   - **Quiz Percentage Display**: Daily quiz matrix cells and class average summary cells display **Score (%)** (e.g. `100%`, `98%`, `70%`) with canonical grade color and remedial indicators, preserving points exclusively for Milestone Exams.

### Consequences
- Eliminates the Suke Ajai ranking inversion: Miss Sofa Maria Ulfa (273.5 pts) is immediately ranked well above Mr. Suke Ajai (143 pts).
- 100% parity between Tutor's Room and Student's Lobby leaderboard sorting.
- Clean, uncluttered student names and percentage-only daily quizzes in Admin Class Hub.

---

## DECISION-025 — Automatic Background Auto-Close of Expired Attempts

Date: 2026-10-28
Status: ACCEPTED (Point 2 regarding 0% matrix visualization superseded and eliminated by DECISION-029 & DECISION-032)

### Context
1. **Disconnected / Battery Dead In-Progress Attempts**: When a student's device dies, crashes, or loses power mid-exam (e.g., Ari Wahyu Darma on Test 29), the browser client timer ceases to exist, preventing the client from firing the final `submit-test` API request. This left the attempt record stalled indefinitely in `in_progress` status with an hourglass `⏳` icon in the Class Hub matrix, even long after its `expires_at` deadline had passed.

### Decision
1. **Automated Background Sweep for Expired Attempts**:
   - Integrated `sb.rpc('auto_close_expired_attempts')` into the primary data access lifecycle (`loadClassDetails` / `renderClassHub` in `js/admin/app.js`, `adminFetchAll('attempts')`, and `fetchAllStudentAttempts(studentId)` in `js/api.js`).
   - Every time the Admin Class Hub loads or student data is queried, any expired `in_progress` attempts are automatically finalized and evaluated by `emergency_submit_attempt`, assigning full partial credit for all saved answers.
   - Added an explicit client-side expiry check in `js/admin/app.js`: any attempt with `att.expires_at < new Date()` is never displayed with the `⏳` hourglass icon.

### Consequences
- Ari Wahyu Darma's attempt (138/200, 69%, Grade C) is immediately graded and displayed as 138 pts, elevating him to Rank #2 (470 pts) with zero `⏳` icons.
- If any future student's battery dies or disconnection occurs, their attempt is automatically finalized upon the tutor opening the class.

---

## DECISION-026 — Strict Sequential Intra-Theme Exam Prerequisites (Words Exam Pass ≥60% Required for Phrases Exam)

Date: 2026-10-28
Status: SUPERSEDED by DECISION-043 (which established Parallel Peer Exam Flow allowing students to take Words Exam or Phrases Exam in any order within an unlocked theme)

### Context
A tutor noticed that student Gagan Tara Deswari was able to take Test 18 (3B Phrases Exam: 60%ᴿ, 42 pts) despite having failed Test 17 (3B Words Exam: 59%, 164 pts, Grade D).
Investigation revealed:
1. Gagan took Words Exam on 2026-10-26 scoring 164/280 (58.57% -> 59%, Grade D).
2. The tutor subsequently opened a Theme B test session that unlocked both Test 17 (Words) and Test 18 (Phrases) simultaneously, whitelisting all students who had completed the daily quizzes (B1–B4).
3. The platform previously only verified that all daily quizzes were passed with $\ge 60\%$, without enforcing an intra-theme sequential gate between sibling milestone exams (Words Exam -> Phrases Exam).
4. As a result, students could skip or fail the fundamental Words Exam and proceed directly to take the advanced Phrases Exam within the same theme.

### Decision
Enforce a strict 4-layer sequential gate across the entire platform:
1. **Server Edge Function (`supabase/functions/start-test/index.ts`)**:
   - Section 3 validation: When a student requests to start a Phrases Exam, the function queries for sibling Words Exams matching the same class, level, and theme.
   - If the student has not completed and passed the sibling Words Exam with $\ge 60\%$ (respecting remedial score caps), execution is terminated with HTTP 403: `"Prerequisite not completed. You must pass the Words Exam (...) with at least 60% before taking the Phrases Exam."`
2. **Client Fallback API (`js/api.js`)**:
   - In `startTest`, the direct database fallback enforces the identical sequential sibling Words Exam query and validation before creating an attempt record.
3. **Student Lobby UI (`js/dashboard.js`)**:
   - In both `openClassModal` and `renderThemeTests` / `renderWeeklyExams`, any Phrases Exam whose sibling Words Exam is not passed ($\ge 60\%$) is rendered with `cardOpacity = 0.5`, `cardFilter = grayscale(100%)`, badge `🔒 Locked`, and action note: `"Complete [Words Exam Title] (Score ≥60% required) to unlock this test."`
4. **Admin Test Sessions Whitelist (`js/admin/tests-access.js`)**:
   - In `openThemeSessionModal` and `openThemeLateModal`, student eligibility evaluation calculates `wordsPassed`.
   - When unlocking `theme.phrasesTest`, the `allowedStudentIds` and `remedialStudentIds` lists are automatically filtered to include only students with `wordsPassed === true`, unless the tutor explicitly checks the "Tutor Override" option.

### Consequences
- Gagan and all future students are strictly guided through the sequential learning path: Quizzes ($\ge 60\%$) $\rightarrow$ Words Exam ($\ge 60\%$) $\rightarrow$ Phrases Exam ($\ge 60\%$).

---

## DECISION-027 — Elimination of Non-Existent Column 'test_category' from Query Selects & Restoration of Student Lobby Class Progress and Hero Assignment Engine

Date: 2026-10-28
Status: ACCEPTED

### Context
A user reported three interrelated anomalies on the Student Lobby (`dashboard.html`) for student Mr. Suke Ajai:
1. **Class Progress rendered 0%**: Beside the active class dropdown `3rd Vocabulary ▼`, the progress badge displayed `0%` despite the student having completed 18 of 40 class tasks.
2. **Hero Assignment Banner falsely declared 100% completion**: The top hero card displayed `🏆 All tasks in this class completed! ✓ 100%` instead of displaying the student's next unpassed exam (`3rd Vocabulary B Words Exam - Tourism`).
3. **Leaderboard Standings did not apply milestone progression penalties to classmates**: Students like Miss Risma and Mr. Muhammad Alimae Pasya displayed `60% avg Grade C` instead of the penalizing `18% avg Grade E` produced by the milestone progression engine in the Admin Class Hub.

Investigation revealed:
- In `fetchTests` (`js/api.js`), a legacy or invalid column `test_category` was included in the Supabase `.select(...)` statement.
- Because `test_category` does not exist on the PostgreSQL `tests` table (which only has `test_type` and `category`), Supabase returned error `42703: column tests.test_category does not exist`.
- `fetchTests` caught the error and returned an empty array `[]`.
- As a consequence:
  * `allTests` was `[]`, which caused `classAssms` to be 0, yielding `pct = 0%`.
  * `renderNextAssignmentHero` found 0 published tests, triggering the empty array branch: `All tasks in this class completed!`.
  * `loadBatchLeaderboard` received `allBatchExams = []`, causing `computeMilestoneExamMastery` to fall back to simple unpenalized averages for students pausing at Theme 1.

### Decision
1. Purge `test_category` from the Supabase `.select(...)` query in `fetchTests` (`js/api.js`) and `auto-gen-modal.js`.
2. Standardize database querying to the canonical columns: `category`, `test_type`, and `test_subtype`.
3. With all 40 tests reliably loaded:
   * Suke Ajai's class progress accurately reflects `18 / 40 = 45%`.
   * Next assignment hero card accurately renders `🔒 Ready for Test: 3rd Vocabulary B Words Exam - Tourism (Waiting for Tutor)`.
   * Leaderboard standings correctly apply milestone progression to all classmates (Risma and Pasya correctly display `18% avg (Grade E)`).

### Consequences
- Resolves all three user-reported anomalies simultaneously with zero architectural overhead.
- Restores 100% parity between Admin Class Hub and Student Lobby data and standings.

---

## DECISION-029 — Unified Vocab Scoring Engine (Single Model Across All Levels): Latest Active Theme Score & Grade

Date: 2026-10-30
Status: ACCEPTED (SUPERSEDES DECISION-024 regarding future milestone 0% penalty on global score; Point 3 regarding cumulative points superseded and eliminated by DECISION-031)

### Context
User requirement: *"Kita perlu bahas sosal penialian sekali lagi,,, saya lihat nilai siswa di kelas Vocab sangat rendah (D,C) saaya tidak mau membuat mereka tidak besemnagat,,, bagaimana kalau kita pakai nilai rata2 dari Exam terkahir yang mereka pakai untuk sebagai nilai global, apakah bisa? tapi sebelumnya kita atur dulu cara kita Scoring dan Grading degan maksmial dan 1 model untuk kelas vocab SEMUA LEVEL, yang menggunakan sistem quiz dan Exam /grill-me"*

Previously, when a student completed Theme A (150 pts max), passing it queued Theme B (350 pts max) into the denominator with a 0% score. This caused students who scored 60% or 80% on Theme A to immediately plummet down to 18% - 30% (Grade E or D), creating significant demotivation.

### Decision
1. **Single Model for Vocab Scoring (All Levels)**:
   - Each theme consists of 2 Exams (Word Exam + Phrase Exam), both scaled to 100%.
   - In Class Hub Attendance Matrix: each theme displays `WRD SCORE %`, `WRD PTS`, `PHR SCORE %`, `PHR PTS`, followed by Theme Combined `SCORE %` (`theme_${tc}_score`) and Theme Combined `TOT` (`theme_${tc}_total_pts`).
2. **Latest Active Theme for Global Score & Grade**:
   - The authoritative `computeMilestoneExamMastery()` evaluates the student's global `SCORE %` and `GRADE` strictly from their **Latest Active Theme** (`latestAttemptedTheme.scorePct`).
   - Removes the demotivating future milestone 0% penalty on Global Score (e.g. Pasya shows 60% Grade C instead of 18% Grade E; Sofa Maria Ulfa shows 47% Grade D instead of 31% Grade D).
3. **0-Exam Handling (Quiz-Only Students)**:
   - Students who completed only quizzes and 0 exams (e.g. Rifky Ahmad) display neutral `—` for Global Score, Grade, and PTS, preventing false quiz score inflation or unfair 0% E penalization.
   - Pacing is reflected cleanly in `TESTS` (e.g. `2/40`) and `PROG %` (`5%`).
4. **Exact System-Wide Parity**:
   - Class Hub (`admin.html#class-hub`), Student Roster (`admin.html#students`), and Student Dashboard (`dashboard.html`) all use `computeMilestoneExamMastery()` with identical data queries (fetching full test metadata `test_type`, `shell_code`, `payload`, etc.).
5. **Strict Unified Color Vault**:
   - Master colors in `js/grading.js` (`TOPSCORE_COLORS`): ★ `#c084fc` (Purple per DECISION-070), A `#00c000`, B `#95ff00`, C `#FFFF00`, D `#FF8C00`, E `#FF0000`.

### Consequences
- Prevents artificial grade deflation while maintaining academic rigor.
- Fully aligns Class Hub, Student Roster, and Student Dashboard.

---

## DECISION-031 — Vocabulary Evaluation Engine: Non-Cumulative Latest Attempt & Latest Theme Session as Primary Benchmark

Date: 2026-10-30
Status: ACCEPTED (SUPERSEDES DECISION-029 item 3 regarding cumulative points)

### Context
User requirement: *"Dalam sistem evaluasi ujian kosakata (vocabulary) ini, penilaian hasil belajar tidak didasarkan pada rata-rata kumulatif ataupun penjumlahan total poin dari seluruh sesi sebelumnya. Karena penguasaan kosakata bersifat retensi dan capaian kompetensi akhir, tolok ukur utama yang digunakan sebagai nilai acuan siswa adalah hasil dari sesi tes terbaru (latest attempt) pada jadwal ujian yang telah ditentukan. Dengan skema ini, riwayat tes sebelumnya murni berfungsi sebagai rekam jejak proses belajar, sedangkan kolom ringkasan nilai dan poin di panel utama wajib merefleksikan pencapaian aktual pada tes mutakhir tersebut, bukan akumulasi riwayat yang berpotensi mendistorsi gambaran kemampuan riil siswa saat ini."*

Previously, `PTS` (Total Points) was calculating cumulative sums across all completed historical themes (e.g. Aunul Fikri = 683.5 pts summing Theme A + B + C), and in some scenarios average scores mixed past sessions into current competency, distorting the student's real current retention level.

### Decision
1. **Latest Attempt & Latest Theme Session Benchmark**:
   - Because vocabulary mastery measures **memory retention and final competency**, the primary benchmark in the main summary panel (`admin.html#class-hub`), Student Lobby (`dashboard.html`), and Student Roster (`admin.html#students`) is strictly the **result of the latest scheduled test session** (`latestAttemptedTheme`).
   - `PTS`: Displays points earned on the latest test session (e.g. Theme C = 362 pts or 482 pts), completely eliminating cumulative summation of past themes.
   - `SCORE`: Displays the percentage score of the latest test session (`latestAttemptedTheme.scorePct`).
   - `GRD`: Displays the grade corresponding to the latest test session score (`calculateGrade(overallScore)`).
2. **Retake & Attempt Resolution**:
   - When a student attempts a test multiple times, the **latest attempt (by timestamp)** is chosen, directly reflecting current retention rather than expired past attempts.
3. **Previous Test History Role**:
   - All historical tests (Theme A, Theme B, earlier attempts) remain intact in the individual theme columns as an immutable learning track record for teachers and audit purposes.
4. **Color & Contrast Rules**:
   - Both `SCORE` and `PTS` inherit dynamic color from `getGradeColorByScore(score)` per TOPSCORE_COLORS rules.
   - Grade badges strictly preserve white text for Star ★ and `#0F172A` slate dark for grades A-E.
5. **Exact System-Wide Parity**:
   - Admin Class Hub, Student Dashboard / Lobby, and Student Roster all utilize `computeMilestoneExamMastery()` ensuring identical standings and stats.

### Consequences
- Eliminates distorted cumulative point inflation and historical score dilution.
- Fairly and accurately assesses student retention at the latest scheduled milestone.
- 100% PASS across all test suites without staging or committing to git per user instruction.

---

## DECISION-032 — Class Hub Matrix Layout: Removal of Left Score/Points and Retention of Left GRD (Grade) Sticky Column

Date: 2026-10-30
Status: ACCEPTED

### Context
In `admin.html#class-hub`, the left sticky panel originally contained 8 columns:
`INST | PROGRAM | BATCH | STUDENT NAME | PROG | SCORE | GRD | PTS`.
The user requested:
1. *"keterangan tentang thema yang sedang di ambil di samping nama tidak perlu"* -> Remove active theme indicator badge beside student names.
2. *"kolom score dan point di sebelah kri ini spertinya tidak perlu"* -> Remove SCORE and PTS from the left sticky panel, because detailed score and points are already displayed in the theme columns.
3. User decision: *"biarkan grade"* -> Retain the `GRD` (Grade) column in the left sticky panel alongside `PROG`.

### Decision
1. **Streamline Left Sticky Panel**:
   - Remove `averageScorePct` (`SCORE`) and `totalEarnedScore` (`PTS`) from the left sticky panel.
   - Retain `grade` (`GRD`) as the final sticky column (`col-sticky-6 col-sticky-last`).
   - Sticky panel column order:
     `INST (col 1, 48px) | PROGRAM (col 2, 54px) | BATCH (col 3, 48px) | STUDENT NAME (col 4, 140px) | PROG (col 5, 46px) | GRD (col 6, 40px)`.
2. **Visual Separator**:
   - `col-sticky-last` (`GRD`) carries a firm cyan border `border-right: 3px solid rgba(56, 189, 248, 0.75)` and `box-shadow: 4px 0 10px rgba(0, 0, 0, 0.4)` to cleanly separate student identity/overall standing from the horizontal scrollable test matrix.
3. **Screen Real Estate Optimization**:
   - Total sticky width reduced from 480px to 376px (+104px screen width saved for the test matrix grid).
4. **Clean Student Name**:
   - Active theme badges (`TH-A`, `TH-B`, etc.) removed from the `STUDENT NAME` cell.

### Consequences
- Cleaner, more ergonomic, and highly responsive table layout for tutors.
- Preserves high-level competency visibility at a glance via `PROG` and `GRD` while eliminating redundant left metrics.
- 100% adherence to product owner direct instructions.

---

## DECISION-033 — Resilient Navigation, Route Normalization & Dual-Tier State Persistence Across Reloads

Date: 2026-10-31
Status: ACCEPTED

### Context
When navigating TopsCore LMS (`admin.html` and `dashboard.html`), users frequently switch between sections (Class Hub, Test Analytics, Vocabulary Vault, Students Registration, System Settings), sub-tabs (e.g., Attendance vs Test Sessions vs Class Tests), and specific filters (e.g., active Class or Program).
Previously, refreshing the browser (`F5`), triggering background data syncs, or handling dynamic route changes frequently resulted in unintended resets or fallbacks to default views (such as `#tests` or default first tabs) due to:
1. Missing section aliases in `aliasSectionMap` and `sectionTitles` (e.g., `#vocabulary`, `#system-settings`).
2. Query parameters in hashes (e.g. `#class-hub?class_id=...`) causing title lookup mismatches.
3. Sub-tabs and filter selections stored only in transient memory (`window._classHubActiveTab`, `window._activeTestClassId`, `window._selectedClassId`).

### Decision
1. **Dual-Tier State Synchronization**:
   - Every primary view navigation updates both the URL hash (`window.location.hash`) and a dedicated `localStorage` key (`topscore_admin_last_section`).
   - Every sub-tab transition persists its active tab ID to `localStorage`:
     - Class Hub: `topscore_admin_class_hub_tab` (`attendance`, `test-sessions`, `tests`).
     - Vocabulary Vault: `topscore_admin_vault_tab` (`blueprint`, `vocab`, `phrases`).
     - System Settings: `topscore_admin_settings_tab` (`site`, `audit`, `health`, `recycle`).
     - Student Registration: `topscore_admin_student_reg_tab` (`bulk`, `individual`).
   - Every active filter selection persists to `localStorage`:
     - Class Hub active Class: `topscore_selected_class_id`.
     - Test Analytics active Class: `topscore_admin_tests_class_id`.
     - Student Dashboard active Class: `topscore_student_last_class_id`.
2. **Route Normalization & Parameter Parsing (`parseHashRoute`)**:
   - Unified parser extracts base section names, sub-tabs (`/` or `:`), and URL search parameters (`?`).
   - Comprehensive alias mapping ensures no valid user hash is rejected or dumped to `#tests`.
   - On `#profile-<studentId>` or `#dossier-<studentId>`, restores underlying background section so closing the profile returns to active view rather than a blank canvas.
3. **Student Dashboard (`dashboard.html`) Modal & Hash Parity**:
   - URL hash synchronization for Student Profile (`#profile`), Exam History (`#profile-history`), Class Selector (`#select-class`), and Class Level Modal (`#levels-<classId>`).
   - Browser refresh or navigation back/forward accurately restores active modals without page displacement.
4. **Permanent Contract Rule (/learn)**:
   - Formally codified into `AGENTS.md` Rule 2.20 as a non-negotiable architectural invariant.

### Consequences
- Eliminates frustrating page resets and unintended redirects on browser reload, updates, or tab switching.
- Preserves exact tutor and student workflow context effortlessly.
- Full compliance with user `/learn` and `/boost` directives.

---

## DECISION-034 — Beginner-Friendly Vocabulary Tolerance Matrix & Word Form Partial Credit

Date: 2026-10-31
Status: ACCEPTED

### Context
Empirical audit of 999 student attempts (81,446 answers) in TopsCore vocabulary and phrase classes revealed that beginner students frequently demonstrate real vocabulary comprehension but produce morphological word-form variants (e.g. answering "success" when the target is "succeed", or "location" for "locate"). In spoken assessments, microphone STT frequently drops unstressed function words ("the", "a", "in") or misrecognizes plural endings across multi-word idioms.

Penalizing word-form differences with 0 points discourages beginners, while awarding full credit (1.0 pt) undermines grammatical distinction.

### Decision
1. Codified the authoritative Beginner-Friendly Answer Tolerance Matrix in `AGENTS.md` §2.13 and implemented it within `evaluateAnswer()` in `js/grading.js`:
   - Exact match (normalized): 1.0 pt (`correct`).
   - 1–2 character Damerau-Levenshtein distance:
     - Spoken: 1.0 pt (`correct`) to absorb microphone STT acoustic noise.
     - Written: 0.5 pt (`minor_spelling_error`).
   - Function-word drops on 4+ word spoken idioms (`a`, `an`, `the`, `to`, `in`, `on`, `of`, etc.): 1.0 pt (`correct`).
   - Multi-word plural-s/es mismatches: 1.0 pt (`correct`).
   - Morphological word form / Part-of-speech mismatches sharing a common root (stem length $\ge 5$ chars): 0.5 pt (`minor_word_form_error`) for **both Spoken and Written** modalities.
   - Semantic changes and pronoun modifications (e.g. "my" vs "your"): Strictly 0.0 pt (`incorrect`).
2. The partial credit badge is visually styled and recorded in attempt answer logs as `minor_word_form_error` with `score: 0.5`.

### Consequences
- Transparent, encouraging, and pedagogically sound grading tailored for beginner students.
- Preserves strict grammatical standards while avoiding artificial zeroes for sound vocabulary knowledge.
- Deterministic, client-safe, and unified across both spoken and written test formats.

---

## DECISION-035 — Paired Theme Exam Remedial Synchronization ("Satu Paket" Rule)

Date: 2026-10-31
Status: ACCEPTED

### Context
In TopsCore vocabulary classes, each theme (A, B, C, D) comprises two integrated assessments: a Words Exam and a Phrases Exam. Because words and phrases within a single theme form an inseparable pedagogical package ("satu paket"), exhibiting remedial need in either assessment signifies incomplete mastery of that theme's vocabulary core. Previously, remedial flags were handled per-test attempt, occasionally causing a student to display remedial status (60%ᴿ) on Words while displaying an uncapped passing score (e.g. 96% or 100%) on Phrases, or vice versa, creating instructional inconsistency on the Class Hub attendance grid. Additionally, dense text in the matrix table caused adjacent characters to crowd in "Fit Screen" mode.

### Decision
1. **Paired Exam Remedial Synchronization ("Satu Paket")**:
   - In both database records and frontend display matrices (`js/admin/app.js`), if ANY exam in a theme package is unlocked or flagged as remedial (`is_remedial_unlocked || is_remedial`), BOTH the Words and Phrases exams for that student in that theme are strictly synchronized as remedial.
   - Both exams are capped at the official 60% remedial ceiling (`Math.min(score, total_questions * 0.6)` and `Math.min(pct, 60.0%)`) and display the official remedial `ᴿ` notation (`60%ᴿ`).
   - Admin unlock endpoint `adminUnlockRemedialExam(attemptId)` in `js/api.js` automatically detects sibling exams in the same theme package and authorizes both, updating effective score and grade accordingly.
2. **Class Hub Anti-Crowding Visual Scaling**:
   - Dynamic matrix font size calculation adjusted to `Math.min(10.0, Math.max(7.5, rowHeight * 0.35))` and badge font to `Math.min(8.5, Math.max(6.5, rowHeight * 0.28))`.
   - Column widths expanded to 54px for score columns and 60px for points columns.
   - Header badge flex centering, negative letter spacing, and line-height controls prevent text collision in Fit Screen mode.
3. **5-Factor Error Diagnostics (Phase 222)**:
   - Full diagnostic taxonomy (`timeout`, `spelling`, `literal`, `word_form`, `vocab_gap`) integrated into Test Analytics header chips with empirical telemetry.

### Consequences
- Absolute pedagogical and visual consistency across paired theme exams.
- Tutors and students see harmonious remedial statuses with zero confusion.
---

## DECISION-036 — Real-Time Spoken Interim Persistence, Mobile Anti-Cheat Guard & Offline Buffer Reconnect Engine

Date: 2026-11-01
Status: ACCEPTED

### Context
Telemetry investigation of 94,746 student answers across Batch 133 revealed a 42% timeout/blank rate and 1,528 cheat strike logs. Root cause analysis identified that:
1. Virtual keyboard popups on mobile Android/iOS triggered `window.blur`, causing false-positive cheat alarms with an aggressive 10s countdown that prematurely auto-submitted student exams.
2. Web Speech API on mobile Chrome/Android produces `interim` results and delays `onFinal` until 2–3s of silence; when countdown expired or students navigated, transcripts in `transcriptBox` were lost because elements lacked an ID and `saveCurrentAnswer()` only inspected `.value` of text inputs.
3. Network blips in dormitory environments caused unsaved answers to be dropped without visual feedback.

### Decision
1. **Mobile Visibility Guard**:
   - On mobile devices, `window.blur` events are ignored if the document remains visible (`document.visibilityState === 'visible'`).
   - Anti-cheat grace period extended from 10s to 30s with strike-based tolerance.
2. **Real-Time Interim Speech Persistence & Fail-Safe**:
   - Assigned explicit `transcriptBox.id = 'speech-transcript-' + row.id`.
   - Real-time auto-commit on `onResult(interim)` immediately saves spoken words into `answeredMap` as they are spoken.
   - Fail-safe commit in `onEnd` and `saveCurrentAnswer()` reads `speech-transcript-${row.id}` on navigation or time-out.
3. **Offline Resilience & Auto-Reconnect Sync**:
   - Added live `#test-sync-indicator` pill next to the countdown timer (`Saved` 🟢 / `Saving…` 🔵 / `Offline (Buffered)` 🟡).
   - Real-time `online`/`offline` listeners buffer answers to `localStorage` and auto-flush via `Promise.allSettled(saveAnswer)` upon network reconnection.

### Consequences
- Eradicates premature auto-submits caused by mobile keyboard usage.
- Zero lost spoken answers during network lags, speech delays, or navigation.
- High visual confidence and peace of mind for students in dormitory or mobile settings.

---

## DECISION-037 — Phrase Progress Word-Counter Guidance & Immediate Post-Exam 3D Flashcard Recovery

Date: 2026-11-01
Status: ACCEPTED

### Context
Empirical analysis of student errors showed two key pedagogical gaps:
1. Multi-word phrases and idioms (4+ words) suffered from incomplete submissions (students typing only 1 or 2 words due to lack of visual guidance).
2. The golden learning retention window immediately following exam submission was underutilized, with students viewing static scores without active reinforcement of missed words.

### Decision
1. **Phrase Progress Word-Counter**:
   - Questions with target phrases $\ge 2$ words dynamically render a real-time word counter: `✍️ X / Y words` for written mode and `🎙️ X / Y words` for spoken mode.
   - Counter dynamically shifts from cyan (`#38bdf8`) to vibrant green (`--clr-success, #00c000`) when the target word count is fulfilled.
2. **Immediate Post-Exam 3D Flashcard Recovery**:
   - On `result.html`, a dedicated `🗂️ FLASHCARD RECOVERY` action button dynamically activates if any questions were missed, timed out, or partially credited.
   - Launches an interactive 3D Flip Card modal presenting:
     - Front: Word category, Indonesian prompt, and student's incorrect attempt.
     - Back: Correct target English expression with native text-to-speech audio pronunciation (`🔊 Listen`) powered by Web Speech Synthesis.

### Consequences
- Substantially reduces incomplete answers on idiom and phrase assessments.
- Bridges assessment and learning, converting evaluation into immediate vocabulary mastery and retention.

---

## DECISION-038 — Active-Only Batch Sidebar Scoping, Student Roster Redundant Column Purge, and Speech Grace Buffer (+3s)

Date: 2026-11-01
Status: ACCEPTED

### Context
1. In Domain B (Board) sidebar, displaying past/inactive batches cluttered navigation and created confusion between active cohorts and historical records.
2. In the Student Roster table (`admin.html#students`), columns for Institution, Program, Batch, Enrolled Date, and Status were redundant because Program and Batch are already scoped by the sidebar, Status is toggled by topbar tabs, and enrollment date lives under Organization.
3. In spoken tests, mobile Web Speech API latency caused speech processing to lag 2–3s after speech ends, risking abrupt cut-offs and blank answers when countdown reached 0.

### Decision
1. **Active-Only Batch Sidebar Scoping**:
   - Sidebar Domain B strictly filters and renders only active batches (`is_active: true`, e.g. `Camp 133`). Inactive/past batches are completely hidden from the sidebar menu.
   - If no batch is selected, the application automatically detects and selects the first active batch of the active program and synchronizes the active highlight.
2. **Student Roster Column Streamlining & Top Panel**:
   - Removed `INSTITUTION`, `PROGRAM`, `BATCH`, `ENROLLED`, and `STATUS` columns from the Student Roster DataGrid.
   - Retained only student-centric columns: `[Checkbox] | Level | Name (Avatar) | Age | Gender (M/F) | [Class Theme Exams 1-4] | Actions`.
   - Replaced bulky filter toolbar with interactive topbar tabs (`🟢 Active Students`, `⚪ Inactive Students`, `👥 All Students`), raising table headers directly beneath metric tabs.
3. **Speech Recognition Grace Buffer (+3s)**:
   - In `js/test.js`, if the countdown deadline expires while the student is actively speaking (`window._isSpeechRecognitionEngaged`), the system initiates a 3-second grace buffer (`⏱️ Finalizing your speech recording...`), allowing speech recognition to finalize transcribing before auto-submitting.

### Consequences
- Clean, focused, uncluttered navigation for tutors.
- Zero loss of student speech on last-second answers before countdown expiration.
- Maximized horizontal screen real estate for exam performance metrics on student roster.

---

## DECISION-039 — Universal Terminology Unification: Complete Elimination of 'Quiz' in Favor of 'Task', 7×7 Repetitive Mastery Engine, and Written Words Exam (>= 60%)

Date: 2026-11-02
Status: ACCEPTED

### Context
1. TopsCore LMS previously retained mixed terminology between "Quiz" and "Task" for formative daily practice tests, creating ambiguity in code filters (`isQuiz`, `test_type === 'quiz'`, `shell_code.includes('-QUIZ')`), UI badges, and database records.
2. Pedagogically, the product owner determined that vocabulary acquisition requires intensive repetitive drill (*repetitive mastery*) rather than single-pass evaluation.
3. Batch 133 has officially graduated. The academy is preparing for Batch 134 (`2nd Level`) and Batch 135 (`1st Level`), requiring clear curriculum boundaries and rigorous mastery standards.

### Decision
1. **Universal Elimination of 'Quiz' (Zero-Exception Standard)**:
   - Eliminate the term "Quiz" across the entire TopsCore codebase, database titles, shell codes, UI labels, and documentation.
   - Establish **Task** as the sole official term for daily formative practice, paired with **Exam** for formal scheduled evaluations: `TESTS (Tasks & Exams)`.
2. **7×7 Repetitive Mastery Engine (Task System)**:
   - Every vocabulary Task topic requires a minimum of **7 passed attempts** with a score of **≥ 70%** per attempt to be marked as Complete.
   - Any attempt scoring < 70% is recorded in historical audit trails but does NOT increment the completion progress counter (`X/7`).
   - The progress counter is calculated realtime from immutable `attempts` data (`COUNT(*) WHERE test_id = X AND score >= 70%`).
   - **Visual Progression Palette (Unified with TopsCore Grade Scale)**:
     - `0/7` $\rightarrow$ Pure Red / Grade E (`#FF0000`, `var(--grade-e)`)
     - `1/7 & 2/7` $\rightarrow$ Dark Orange / Grade D (`#FF8C00`, `var(--grade-d)`)
     - `3/7 & 4/7` $\rightarrow$ Pure Yellow / Grade C (`#FFFF00`, `var(--grade-c)`)
     - `5/7 & 6/7` $\rightarrow$ Electric Lime / Grade B (`#95ff00`, `var(--grade-b)`)
     - `7/7` $\rightarrow$ Pure Green / Grade A / Star (`#00c000`, `var(--grade-star)`)
3. **Words Exam Written Mode & Minimum Passing Grade 60%**:
   - Words Exam format transitions from speech-to-text to **Written (text input)**.
   - Written answer evaluation strictly enforces AGENTS.md Rule 2.13 (partial credit of 0.5 pt for typos $\le 2$ characters).
   - The universal minimum passing score for Vocabulary Exams is standardized to **≥ 60%** (Grade C per DECISION-073 and AGENTS.md §2.4.1; the 70% threshold applies strictly to formative 7×7 Tasks).
4. **Level-Scaffolded Vocabulary Curriculum**:
   - **Level 2 (`2nd Vocabulary`)**: Designed as a **Words-Only** curriculum (no phrases) with 2 initial Themes A & B, keeping cognitive load appropriate for incoming Batch 134.
   - **Level 3 (`3rd Vocabulary`)**: Preserves the **separate Words and Phrases structure**, with Words Exam (Written $\ge 60\%$) sequentially unlocking Phrases Exam (Dropdown $\ge 60\%$) per theme.

### Consequences
- Eliminates 100% of code branching and filter bugs related to `quiz` vs `task`.
- Guarantees high student vocabulary retention through mandatory 7-pass drill repetition.
- Ensures seamless auto-assignment for Batch 134 under Rule 2.5 without cross-level interference.




---

## DECISION-040 — Level Progression System, Lifecycle Actions, Batch Transfer, and Multi-Tenant Vocabulary Vault Architecture

Date: 2026-11-03
Status: ACCEPTED

### Context
Following a rigorous `/grill-me` architectural review with the Product Owner (Mr. Top), several core progression and multi-tenant scoping mechanisms were formalized for TopsCore LMS:
1. Penamaan tingkat akademik resmi disederhanakan: `1st` (1st Level), `2nd` (2nd Level), `3rd` (3rd Level), dan `Alumni` (Completed) yang menduduki `level_number = 0`.
2. Aksi kenaikan tingkat siswa dikelompokkan ke dalam 4 status resmi operasional: `NEXT`, `HOLD`, `RETRY`, dan `REPEAT` (re-enrollment / mengulang dari level pilihan).
3. Perpindahan siswa antar angkatan (e.g. dari Batch 123 ke Batch 124) membutuhkan mekanisme `Transfer Batch` dengan opsi `Inherit Batch Level`.
4. Exam Gate diperketat menjadi **Hard Gate 🔒**: tombol Exam tidak dapat dibuka sebelum seluruh Task pada topik tersebut berstatus `7/7 Complete` (Hijau).
5. Kebutuhan kurikulum multi-program (General English untuk CEC, Hospitality English untuk Sheraton Hotel, Office English untuk Evnikom) memerlukan isolasi bank soal dan auto-generate tanpa memecah database menjadi banyak tabel terpisah.

### Decision
1. **Penyelarasan 4 Level Resmi**:
   - `level_number = 1`: Tampilan `1st`, Deskripsi `1st Level`.
   - `level_number = 2`: Tampilan `2nd`, Deskripsi `2nd Level`.
   - `level_number = 3`: Tampilan `3rd`, Deskripsi `3rd Level`.
   - `level_number = 99`: Tampilan `X` (Alumni), Deskripsi `Completed` (per DECISION-058 & DECISION-074; Level 0 is dedicated to Non-Level programs per DECISION-066).
2. **Empat Aksi Lifecycle Siswa (NEXT - HOLD - RETRY - REPEAT)**:
   - `NEXT`: Siswa lulus semua Exam di level aktif $\ge 60\%$ (Grade C per DECISION-073 and AGENTS.md §2.4.1), memajukan `students.level_id` ke level berikutnya.
   - `HOLD`: Siswa belum lulus (< 60%) atau belum menuntaskan 7×7 Task. Tombol kenaikan terkunci 🔒.
   - `RETRY`: Siswa mengulang ujian atau drill yang belum tuntas di level saat ini.
   - `REPEAT`: Siswa mengulang level dari awal, atau Alumni (Completed) yang mendaftar kembali memilih level masuk baru (`1st`, `2nd`, atau `3rd`) dengan riwayat kelulusan lama tetap diarsipkan.
3. **Mekanisme Transfer Batch**:
   - Admin dapat memindahkan siswa ke Batch baru dengan opsi `Inherit Batch Level` (level siswa otomatis sinkron mengikuti level batch target).
4. **Hard Gate Exam**:
   - Tombol pengerjaan Exam terkunci rapat 🔒 sampai seluruh Task pada topik tersebut mencapai `7/7 Complete`.
5. **Multi-Tenant Vocabulary Vault & Standar Import/Export**:
   - Menambahkan kolom `institution_id` dan `program_id` pada tabel `vocabulary_vault`. Seluruh data kosakata eksisting diatribusikan ke Institusi CEC dan Program Camp.
   - Format template file import dan hasil export Excel diselaraskan dengan urutan kolom: `Institution` (Kolom 1), `Program` (Kolom 2), `Level` (Kolom 3), disusul `Category`, `Theme Code`, `Theme`, `Topic Code`, `Topic`, `Type`, `Indonesian`, `English`.
   - Form pembuatan Test di Admin memiliki cascading dropdowns: `[Institution]` $\rightarrow$ `[Program]` $\rightarrow$ `[Class]` $\rightarrow$ `[Level]`.
   - Engine Auto-Generate hanya menarik kata dari Vault yang berlabel Institusi & Program kelas tersebut, mengisolasi soal silabus secara total.
6. **Mekanisme Remedial (60%ᴿ) & Skor F (Forgiven ᶠ)**:
   - Nilai remedial tetap di-cap maksimal **60%** dengan format superskrip **`60%ᴿ`** (warna Kuning Grade C, `#FFFF00`) dan diakui sah meloloskan prasyarat kenaikan `NEXT`.
   - Nilai Skor F (Forgiven) tetap mempertahankan skor murni yang gagal (misal 55%) dengan superskrip **`55%ᶠ`** (warna Merah Grade E, `#FF0000`), merupakan hak prerogatif Admin (Mr. Top) yang dicatat di audit log dan diakui sah meloloskan syarat `NEXT`.
7. **Kebijakan Akses Terbuka Kumulatif & Evaluasi Level Aktif**:
   - Siswa level tinggi berhak mengakses kelas level di bawahnya: Level 1 (akses Level 1), Level 2 (akses Level 2 + 1), Level 3 (akses Level 3 + 2 + 1), dan Alumni (Universal Access Level 1, 2, 3).
   - Evaluasi syarat `NEXT` hanya memeriksa Exam pada Level Aktif siswa saat ini.
   - Pengerjaan 7×7 Task instan tanpa jeda/cooldown.

### Consequences
- Menghilangkan ambiguitas peran tingkat kelulusan (Alumni resmi menjadi Level X / 99 dengan Universal Access per DECISION-058 & DECISION-074, sedangkan Level 0 didedikasikan untuk program tanpa jenjang per DECISION-066).
- Memastikan pemisahan total konten kurikulum antar institusi klien tanpa duplikasi tabel.
- Memberikan kontrol operasional penuh kepada tutor dan Mr. Top dalam mengelola kenaikan tingkat, remidi, perpindahan batch, dan pendaftaran ulang alumni.

---

---

## DECISION-040B — Zero-Maintenance Dynamic Curriculum Test Auto-Provisioning & Synchronization from Vocabulary Vault

Date: 2026-11-03  
Status: ACCEPTED  

### Context
1. Curriculum tests in Vocabulary classes previously required a manual 2-step process: (1) filling words and phrases in Vocabulary Vault, then (2) navigating to Test Management / Blueprint to click `[ Auto-Generate ]`.
2. If tests were not manually generated, a newly created or populated vocabulary class (e.g. `2nd Vocabulary`) showed `Class Tests: 0` and failed to render curriculum theme columns (Theme A, B, C, D) in the Class Hub, causing user confusion.
3. Although test question items are already dynamically populated at test runtime via `is_dynamic_shell: true`, test shells in the `tests` table are mandatory for tracking attempts, prerequisites, time limits, test sessions, and Class Hub columns.

### Decision
1. **Centralized Synchronization Engine (`autoSyncClassTestsForLevel`)**:
   - Implemented in `js/api.js`. Given a level (number or UUID) and program, it inspects `vocabulary_vault` and automatically generates/updates all required test shells (Daily Tasks + Milestone Exams for each theme/topic) for the active Vocabulary class.
2. **Dual-Trigger Automation (Zero-Maintenance)**:
   - **Trigger A — On Class Hub Load (Self-Healing)**: When opening Class Hub (`renderClassHub` in `js/admin/app.js`), if a Vocabulary class has `classTests.length === 0` but `vocabulary_vault` contains words for that level, the system automatically calls `autoSyncClassTestsForLevel` on the fly, refreshes test data, and immediately renders the full thematic attendance matrix.
   - **Trigger B — On Vocabulary Vault Import (Event-Driven)**: Upon successful Excel import in Vocabulary Vault (`vocab-vault.js`), the system automatically runs `autoSyncClassTestsForLevel` in the background for every imported level.
3. **Strict Class Scoping**:
   - `autoGenerateTestsHierarchy` now strictly targets active classes matching both `program_id = programId` and `level_id = levelId`, preventing cross-level test pollution.

### Consequences
- Eliminates manual test generation overhead entirely.
- Ensures all vocabulary classes automatically reflect the exact themes and topics present in Vocabulary Vault.
- Prevents blank or inconsistent class hub table layouts.

---

## DECISION-041 — Result Page Wireframe Overhaul & Dual-View Parity, Direct Action Controls, and Strict A-Z ABCD Sidebar Architecture

Date: 2026-11-03
Status: ACCEPTED

### Context
1. User provided a detailed hand-crafted wireframe diagram for `result.html` defining:
   - 150px Student Metadata card matching `#welcome-banner-section` on Student Dashboard 1:1.
   - Dual-view parity: Student View vs Tutor View (`isAdminSession`).
   - 3-column equal segmented control for Tutor View: `[ NORMAL ]` `[ REMIDI ]` `[ FORGIVE ]` with uniform font size and 50px height matching the score/grade row.
   - 35% dynamic composite card housing 4 metric rows (*CORRECT, PARTIAL, INCORRECT, POINTS*) and 50px side-by-side Score % and Grade / Star vector.
   - Reordering of the "View Answer Breakdown" button to sit directly above the back button.
   - Dynamic tier aura (`--tier-color`, `--tier-rgb`) wrapping card borders and backgrounds.
2. In the database, Batch 132 students were completely invisible due to being marked with `level_id = Alumni (Level 0)` and `is_active: false`. Furthermore, a legacy trigger `trigger_student_batch_change` referencing dropped table `additional_members` blocked batch transfers.
3. User required transferring student `Muhammad Ariwil Asrori` from Batch 132 to Batch 134 inheriting Batch 134's academic level (2nd Level).
4. Admin panel sidebar navigation required strict alphabetical A-Z item sorting within each of the 4 ABCD domain groups.

### Decision
1. **Result Page Hierarchy & Dual-View Parity**:
   - Implemented exact wireframe specification on `result.html`, `css/result.css`, and `js/result.js`:
     - Student Metadata Card: Strict 150px height, identical to Student Dashboard `#welcome-banner-section`.
     - Test Title: Strict 50px height, 2 lines (Line 1: Type/Title, Line 2: Assessment Topic/Theme).
     - Composite Card: 35% dynamic viewport height with internal divider and symmetrical 50px Score % & Grade row.
     - Achievement Status Remark: Strict 50px height displaying canonical predicates (`FAIL`, `LESS`, `ENOUGH`, `GOOD`, `VERY GOOD`, `EXCELLENT`).
     - Action Slot (Strict 50px height):
       - Student View: `GO TO NEXT ASSESMENT:` with link to next assessment.
       - Tutor View: 3-column segmented button `[ NORMAL ]` `[ REMIDI ]` `[ FORGIVE ]` with uniform 11.5px font size and instant confirmation dialogs.
     - Reordered Breakdown Button: Strict 30px height, positioned above bottom navigation button.
     - Bottom Navigation: Strict 30px height (`BACK TO ROOM` for Tutor vs `BACK TO LOBBY` for Student).
     - Dynamic Tier Aura: Dynamic `--tier-color` and `--tier-rgb` applied to all cards, glow shadows, and background radial gradients.
2. **Direct Result Page Waiver Handlers (`js/api.js`)**:
   - `labelAttemptRemedial(attemptId, true, 60.0)` caps effective score at 60%, marks `is_remedial: true`, clears forgiven flag, and writes audit log.
   - `labelAttemptForgiven(attemptId, reason)` grants Skor F waiver, preserves raw score, clears remedial flag, sets `forgiven_by: null` (satisfying UUID type constraint), and writes audit log.
   - `labelAttemptNormal(attemptId)` clears both remedial and forgiven flags, restoring authoritative raw percentage.
   - All audit log writes are wrapped in non-blocking try/catch blocks compatible with PostgREST builders.
3. **Database Trigger Cleanup & Batch Restoration**:
   - Dropped obsolete trigger `trigger_student_batch_change` and function `trg_student_batch_change()`. Versioned in `20261103070000_drop_legacy_batch_change_trigger.sql`.
   - Transferred `Muhammad Ariwil Asrori` to Batch 134 with `level_id = 9936683a-5b4a-4796-bb5d-a7fd8ecf0b71` (2nd Level) and `is_active: true`.
   - Reactivated all 7 students in Batch 132 with `level_id = 51589e1a-d96e-496e-92a3-d9d350483555` (3rd Level) and `is_active: true`.
   - Backfilled all 34 students in the database with null `level_id` to match their batch's `current_level_id`.
4. **Strict A-Z Alphabetical Sidebar Ordering**:
   - Implemented `sortAllSidebarDomains()` and `initSidebarAlphabeticalObserver()` in `js/admin/admin-init.js`.
   - Enforced A-Z item ordering across all 4 ABCD domains:
     - Domain A: Curriculum -> Dashboard -> Organization.
     - Domain B: Camp 132 -> Camp 133 -> Camp 134 -> Students Registration.
     - Domain C: 2nd Vocabulary -> 3rd Vocabulary -> Test Analytics -> Vocabulary Vault.
     - Domain D: Modules (Core Blocks) -> System Settings.

### Consequences
- Result page provides 100% visual and functional parity between Student and Tutor modes without page reloading friction.
- Tutors can execute immediate academic discretion (`NORMAL`, `REMIDI`, `FORGIVE`) directly from the result inspection screen with complete audit log traceability.
- Eliminates silent student disappearance caused by unintended Alumni level assignment on batch rosters.
- Admin navigation maintains consistent, predictable alphabetical order regardless of dynamic asynchronous data loading.


---

## DECISION-042 — Result Page Synchronized Tier Glow, 8-Digit Hex Normalization, and Bright Blue Primary Navigation Button Preservation

Date: 2026-11-03
Status: ACCEPTED (Synchronized tier glow shadows SUPERSEDED by DECISION-081 Flat Enterprise Precision)

### Context
1. User feedback identified that panels on `result.html` exhibited inconsistent colors:
   - For 100% Star view (Mr. Muhammad Masyan Hafizi), the Test Full Title panel and Evaluation Word Card borders rendered PURPLE instead of Pure Green (`#00c000ff`).
   - For Grade C view (Miss Nurhaliza, 70.4%), panels failed to illuminate in vibrant Pure Yellow (`#FFFF00`).
   - The primary navigation button (`BACK TO ROOM` / `BACK TO LOBBY`, `.btn-dashboard-primary`) was erroneously darkened to match the tier color, destroying its contrast against the dark ghost button directly above it (`VIEW ANSWER BREAKDOWN`).
   - User command: *"warnna penel2 masih ada yang keliru, misal disini gamabar 1, ada yang ungu, seharusnya hijau, vgambar 2 juga warna panel seharusnya Kuning semua,,, ini tidak tampak. tombol back to room disnni panel buat biru lebih terang agar terlihat bedanya dengan tombol di atasnya, sebelumnya warnyan biru lebih terang. janagn suka rubah yang saya TIDAK minta! /learn perbaiki!!! /goal"*.

### Root Causes
1. **8-Digit Hex Bitwise Shift Bug**:
   - `TOPSCORE_COLORS.STAR` is defined as `#00c000ff` (8-character hex).
   - In `js/result.js`, `parseInt(c, 16)` was shifted right by 16 bits without stripping the 2 alpha bytes, extracting `0xc0` (192) for Red and `0xff` (255) for Blue, producing `rgb(192, 0, 255)` (Purple) instead of `rgb(0, 192, 0)` (Pure Green).
2. **Unrequested Color Mutation on Functional Button**:
   - `.btn-dashboard-primary` was improperly overridden in `.tier-glow-active` with a dark slate / score-tinted gradient, eliminating visual contrast with `.btn-breakdown-ghost`.
3. **Missing Animation Scope Variables**:
   - In `runResultEntranceSequence`, parameters `rgbColor` and `currentTier` were omitted, leading to early termination before tier glow activation.

### Decision
1. **Bright Blue Primary Navigation Button**:
   - `.btn-dashboard-primary` strictly maintains its vibrant, bright blue gradient (`linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)`) with crisp bold white text and electric blue box shadow (`rgba(37, 99, 235, 0.5)`).
   - Never override or tint `.btn-dashboard-primary` with tier score colors. It must permanently stand out from `.btn-breakdown-ghost` (`rgba(15, 23, 42, 0.85)`).
2. **8-Digit Hex Normalization**:
   - In `js/result.js`, `hexToRgba` and `hexToRgbString` strip trailing alpha characters when `c.length === 8`.
   - Prefer canonical RGB strings directly from `TOPSCORE_COLORS[grade + '_RGB']` (`STAR_RGB: '0, 192, 0'`, `C_RGB: '255, 255, 0'`).
3. **Synchronized Deferred Tier Glow across All 4 Panels**:
   - All 4 panels (`#result-identity-card`, `#result-Test-name-container`, `#result-metrics-composite-card`, `#result-motivation-msg`) remain clean dark slate (`rgba(255, 255, 255, 0.12)`) until `#result-motivation-msg` reveals.
   - Upon reveal, `activateTierGlow` simultaneously illuminates all 4 panels with `1.5px solid rgba(var(--tier-rgb), 0.75-0.85)`, glowing box shadows (`rgba(var(--tier-rgb), 0.35-0.50)`), and matching radial background auras:
     - Star 100%: **Vibrant Purple (`#c084fc`, `rgb(192, 132, 252)`)** (per DECISION-070); Grade A: **Pure Green (`#00c000`, `rgb(0, 192, 0)`)**.
     - Grade C: **Pure Yellow (`#FFFF00`, `rgb(255, 255, 0)`)**.
     - Grade B: **Electric Lime (`#95ff00ff`, `rgb(149, 255, 0)`)**.
     - Grade D: **Dark Orange (`#FF8C00`, `rgb(255, 140, 0)`)**.
     - Grade E: **Pure Red (`#FF0000`, `rgb(255, 0, 0)`)**.


---

## DECISION-043 — Virtual Unified Tasks (50 PTS) and Exams (150 PTS) with Component Choice Modal, 7×7 Math.min Leveling, Parallel Peer Exam Flow, and Strict Linear Topic Gating

Date: 2026-11-03
Status: ACCEPTED

### Context
In 3rd Vocabulary (Level 3), each topic consists of two components:
1. Words Component (40 items, Written / Typed mode with tolerance matrix for typos & word forms).
2. Phrases Component (10 items, Selection / Spoken mode).
Exams correspondingly feature 120 Words and 30 Phrases (Total: 150 PTS).

Students need flexibility to choose whether to do Words or Phrases first. Previously, Exams strictly forced Words Exam before Phrases Exam, and Tasks were displayed as separate 40-item and 10-item rows on the student dashboard, cluttering the view.

### Decision
1. **Virtual Unified Representation**:
   - On the student dashboard and Class Hub roster, Tasks are presented as single unified 50 PTS items (`Theme X • Topic Y: Title`, `50 Items • 50 PTS (40 Words + 10 Phrases)`).
   - Exams are presented as single unified 150 PTS items (`Theme X Exam Package`, `150 Items • 150 PTS (120 Words + 30 Phrases)`).
   - Single-component classes (such as `2nd Vocabulary`) automatically bypass selection and launch directly into the test.
2. **Component Selector Modal**:
   - Clicking a unified card opens `#component-selector-modal`, allowing the student to freely choose which component to tackle first.
   - Shows real-time pass count ($N/7$), best score percentage, item count, and time limit for each component.
3. **7×7 Repetitive Mastery Leveling (`Math.min`)**:
   - A topic round is completed if and only if both Words and Phrases achieve $\ge 70\%$.
   - Topic Mastery Level is determined by `computeTopicPassLevel(wordsPasses, phrasesPasses, hasPhrases) = Math.min(wordsPasses, phrasesPasses)`.
   - Failing one part only requires retaking that specific part; the passed sibling retains its status.
4. **Strict Linear Topic Gating & Parallel Peer Exams**:
   - Topic $K$ strictly requires all tasks in Topic $K-1$ to reach 7 passes with $\ge 70\%$.
   - Theme Exam strictly requires all Theme Tasks to reach 7 passes with $\ge 70\%$.
   - Theme $K+1$ strictly requires both Words Exam and Phrases Exam of Theme $K$ to reach $\ge 70\%$.
   - Within an unlocked Theme, Words Exam and Phrases Exam are parallel peers sharing the same prerequisite (`lastThemeTaskId`), so students can take either first.
5. **Admin Class Hub Roster Unified Columns**:
   - In Class Hub matrix, multi-component classes render unified columns: `A1 Task (50p)`, `A2 Task (50p)`, `A3 Task (50p)`, `A Exam (SCR %, PTS)` with breakdown tooltips and single-click access.

### Consequences
- Eliminates 50% of visual row clutter on the student dashboard and Class Hub table.
- Preserves high pedagogical evaluation fidelity (Written typo tolerance for Words, Selection for Phrases).
- Ensures balanced, authentic mastery across both vocabulary and phrases.

---

## DECISION-044 — Master Terminology & Spatial Architecture (Student Portal, Class, Lobby, Test Desk, Result Page, Task & Exam)

Date: 2026-11-06
Status: ACCEPTED

### Context
In previous phases, various terms were used interchangeably or ambiguously across the frontend:
1. `index.html` was titled "Student's Lobby", even though the student has not yet entered or authenticated via PIN.
2. `dashboard.html` was also titled "Student's Lobby", but the content was 100% focused on a single active Class (e.g., `2ND VOCABULARY`), with the top door icon used to change classes.
3. In `result.html`, the return button text drifted between `BACK TO LOBBY` and `BACK TO CLASS`.
4. Testing taxonomy needed clarity on `TASK` vs `EXAM` without unnecessary temporal constraints ("daily" / "weekly").
5. The assessment interface `test.html` needed a distinct, professional spatial term.

### Decision
The user officially approved the master taxonomy and spatial architecture for TopsCore LMS (`DECISION-044` / `topscore_terminology_and_spatial_mapping_plan.md`):
1. **Halaman Login Siswa (`index.html`)**: **STUDENT GATE** (atau **GATE**)
   - The primary entrance gate where students authenticate via Institution -> Program -> Batch -> Student Name -> Personal PIN.
   - Title: `Student Gate — TOPS CORE`, Subtitle: `Student Gate — Sign in to continue`.
   - Program search placeholder: `Search program...`.
2. **Dashboard Siswa (`dashboard.html`)**: **CLASS HUB** (atau **CLASS**)
   - The primary study room for the selected subject/class.
   - Title: `Class Hub — TOPS CORE`.
   - Header center prominently features the active Class Name (e.g. `2ND VOCABULARY`).
   - Meta description: `Class Hub on TOPS CORE — track progress, view Classes, and start Tests.`
3. **Modal Pemilih / Pengganti Kelas (Ikon 🚪)**: **CLASS LOBBY**
   - The academic directory modal where students view active classes in interactive card format and switch to another room.
   - Header door button tooltip: `Class Lobby`.
4. **Halaman Hasil (`result.html`)**: **RESULT PAGE**
   - Title: `Result Page — TOPS CORE`.
   - Return navigation:
     - Student: **`BACK TO CLASS`** (returns student directly to their current class).
     - Tutor / Admin: **`BACK TO ROOM`** (returns tutor to the Admin Class Hub monitor).
5. **Klasifikasi Ujian**: **TASK** dan **EXAM**
   - **TASK**: Formative mastery practice (7x7 repetitive mastery model, storing top-7 scores).
   - **EXAM**: Formal assessment milestone with high weighting and time limits.
   - There are strictly NO "daily" (harian) or "weekly" (mingguan) labels; distinction is based purely on educational weight and pedagogical function.
6. **Halaman Pengerjaan Soal (`test.html`)**: **TEST ROOM** (atau **TEST DESK**)
   - Title: `Test Room — TOPS CORE`, Meta description: `Complete your assessment in the TOPS CORE Test Room.`

### Consequences
- Eliminates dual "Lobby" confusion between login and dashboard.
- Establishes a natural, crystal-clear mental model for students and tutors.
- Synchronizes titles, meta descriptions, button text, and documentation across the codebase.

---

## DECISION-045 — Vault Intelligent Distractor Selection Heuristics, 5-Option MCQ Standardization, and Emerald Green Audio UI Polish

Date: 2026-11-08
Status: ACCEPTED

### Context
When Multiple Choice questions were dynamically assembled from `vocabulary_vault`, candidate distractors were previously filtered by `word_type` and randomly shuffled. This caused pedagogically weak distractors (unrelated themes, jarring length discrepancies, or random phrases). Furthermore, Multiple Choice option counts were not consistently documented in mock visual previews, and the speech microphone button displayed an unintended pink/magenta tint due to an inherited `--grade-star` variable.

### Decision
1. **Authoritative Heuristic Distractor Engine (`js/grading.js`, `js/api.js`, `supabase/functions/start-test/index.ts`)**:
   - Implemented a 5-dimension scoring model in `scoreDistractorSimilarity`:
     - Topic Proximity (+35 pts) & Theme Proximity (+15 pts)
     - Word Type / Part of Speech Match (+25 pts)
     - Length & Structural Parity (+20 pts for phrases, +15 pts for single words)
     - Lexical & Collocation Overlap (+15 pts for shared head verb/tail particle)
     - Jitter Tie-Breaker (0 to 3 pts)
   - Strict Anti-Leak Filters: Disqualify exact target match, alternate slash synonyms, identical Indonesian translations, and cross-category leaks.
   - Dual-Path Parity: Applied identically to both frontend generation and Edge Functions.
2. **5-Option Multiple Choice Standard (A, B, C, D, E)**:
   - Multiple Choice items standardize on 5 distinct options (1 correct answer + 4 plausible distractors).
3. **Microphone Button Pure Emerald Green Polish**:
   - Replaced pinkish `var(--grade-star)` gradients on `.speech-mic-btn-lg` with pure Emerald Green (`linear-gradient(135deg, #4ade80 0%, #16a34a 100%)`, border `rgba(22, 163, 74, 0.45)`).

### Consequences
- Dramatically increases pedagogical rigor and authenticity of multiple choice vocabulary tests.
- Prevents giveaways where length or unrelated meaning reveals the answer.
- Eliminates visual color clashes on audio controls across all test modes.

---

## DECISION-046 — Multi-Program Theme Assignment Architecture, 2-Tier Topic Blueprint Matrix, and Edit Mode Protection

Date: 2026-11-09
Status: ACCEPTED

### Context
Client programs (**CEC Camp**, **Evnikom**, **Sheraton**, **Tamata Persada**) operate on the TopsCore platform across different institutions (`CEC` and `TOP`). While they share identical class structures (Vocabulary, Storytelling, Public Speaking) and level mechanics (1st, 2nd, 3rd Level), their curriculum materials vary: some themes are exclusive to one program (e.g., Hotel theme `E1` at Level 2 for Sheraton), while others can be shared across programs or even institutions (e.g., sharing the Hotel theme with Tamata Persada) without duplicating hundreds of vocabulary words.

### Decision
1. **Binding at Theme Level (`theme_program_assignments`)**:
   - Rather than binding individual words or entire classes statically to programs, curriculum assignment is established at the **Theme level**: composite key `(theme_code, target_level, program_id)`.
   - Table `public.theme_program_assignments` stores this many-to-many relationship with RLS enabled.
   - When generating questions or distractors, the system dynamically queries assigned theme codes for the target `(program_id, level)` and retrieves words matching those themes. Words are stored once in `vocabulary_vault`.
2. **2-Tier Topic Blueprint Matrix UI**:
   - Redesigned the Topic Blueprint tab in `js/admin/vocab-vault.js` to match the spreadsheet matrix format:
     - Header Tier 1: `LEVEL`, `code`, `Theme Name`, `Topic`, `WORD` (colspan 4), `PHRASE` (colspan 3), `Total`, Institution Group (`CEC`: `Camp`, `TOP`: `Evnikom`, `Tamata`, `Sheraton`), `EDIT MODE (On/Off)` (colspan 2).
     - Header Tier 2: `VERB`, `NOUN`, `ADJECTIVE`, `OTHER`, `Expression`, `Idiom`, `Proverb`, Program columns, `RENAME`, `DELETE`.
3. **Edit Mode Guard (On Green / Off Red)**:
   - Defaults to `OFF` (Red `#dc2626`). In OFF mode, clicking program assignment cells or action buttons (`RENAME`, `DELETE`) is inert, protecting against accidental modifications while browsing.
   - When toggled `ON` (Green `#16a34a` with pulse glow), clicking program cells immediately toggles `yes` $\leftrightarrow$ `—` and persists to the database via API, while action buttons become active.
4. **Automated Excel Import Assignment**:
   - When an Excel file is imported into `vocabulary_vault`, all unique `(theme_code, target_level, program_id)` triples are automatically upserted into `theme_program_assignments`.
5. **Class Hub "Open Vault" Shortcut**:
   - Added `📚 Open Vault` in the Class Hub header toolbar and `📚 Vault` on Vocabulary class rows to navigate directly to the Topic Blueprint tab in `#vocab_vault`.

### Consequences
- True multi-tenant curriculum isolation and selective sharing without duplicating vocabulary words or creating messy database forks.
- Completely prevents accidental edits to curriculum allocations with Edit Mode protection.
- Immediate navigation between Class management and Vocabulary Blueprint.

---

## DECISION-047 — Institution Topbar Dynamic Labeling, Full-Green Success Badge System, and Streamlined Grade & Score Roster

Date: 2026-11-09
Status: ACCEPTED

### Context
In the Organization screen, topbar tabs displayed generic strings `"Program (1)"` and `"Programs (2)"` due to an incorrect property mapping overriding `tab.label`. Additionally, active status pills and program batch counters exhibited an unintended pink/magenta border and background because `--grade-star-rgb: 255, 45, 135` was improperly used for general success badge styles. Finally, the Grade & Score roster matrix toolbar contained redundant controls (`FIT SCREEN`, `100% SCROLL`, pan buttons, `Full Width`) that squeezed font sizes via CSS zoom down to unreadable levels.

### Decision
1. **Dynamic Institution Naming on Topbar**:
   - `curriculum-management.js` assigns `label: inst.name` and `title: inst.name` so that top tabs immediately reflect the institution identity (`TOP [1]`, `CEC [2]`).
2. **Authoritative Full-Green Success & Active Palette**:
   - Explicitly defined `--clr-success-rgb: 0, 192, 0;` and `--clr-success-glow: rgba(0, 192, 0, 0.4);` in `css/style.css`.
   - Updated `.badge-tag-ongoing`, `.badge-success`, `.btn-success`, and program batch counters to pure green (`#00c000` text, `rgba(0, 192, 0, 0.15)` background, `1px solid rgba(0, 192, 0, 0.35)` border) with zero pink contamination.
3. **Streamlined Grade & Score Layout**:
   - Removed the `DISPLAY: FIT SCREEN / 100% SCROLL` switcher, pan buttons, and `Full Width` button.
   - Standardized the matrix on standard uncompressed 100% scale (`zoom: 1`) with smooth horizontal scrolling (`overflow-x: auto`), comfortable row heights ($\ge 22\text{px}$), and readable font sizes ($\ge 8.5\text{px}$).
   - Preserved theme filter pills and score legend (`WRD`, `PHR`, `PTS`, `SCORE %`, `ᴿ`, `★`).

### Consequences
- Immediate, accurate institution branding in the top navigation.
- Consistent visual language: active/ongoing states are 100% pure green without magenta/pink bleed.
- Clean, legible, and uncluttered Grade & Score student roster.


---

## DECISION-048 — Agent System Extension, Spatial Invariant Quality Gate, and Pre-Flight Protocol

Date: 2026-11-11
Status: ACCEPTED

### Context
To support the user's structured, invariant-driven development workflow, three system extensions were proposed and developed across side sessions (`faadd726-0df1-4cea-8824-2da6729641f4`) and the active roadmap:
1. `ui-spatial-checker`: Need for programmatic assertions verifying 100vh lock, 10px container gap, 50px lower panel height, tabular numbers, and dynamic nowrap table columns.
2. `visual-preflight`: Need for an automated quality gate requiring visual before-screenshots and interactive proposed mockups before subagent delegation or code edits.
3. Context Window Hygiene: Need to prevent token bloat and memory degradation over long development trajectories via systematic compaction (`/compact`) and historical rule archiving.

### Decision
1. **Pipeline Integration of `ui-spatial-checker`**:
   - Codified in `.agents/skills/ui-spatial-checker/SKILL.md` with script `scripts/check_spatial_invariants.mjs`.
   - Embedded directly into the default `npm test` script in `package.json`.
2. **Automated Subagent Pre-Flight Gate (`scripts/verify_plan_preflight.mjs`)**:
   - Created standalone script `scripts/verify_plan_preflight.mjs` verifying that any plan involving UI changes contains the authoritative `# Visual Pre-Flight Verification Checklist` and visual deliverables.
   - Delegation to subagent `DeepCoder` is strictly gated behind this automated verification.
3. **Rules 23 & 24 Codification**:
   - Codified in `.antigravityrules` and `AGENTS.md` (Sections 2.36 and 2.37).
   - Standardized `/compact` command recommendation following milestone completion.

### Consequences
- Zero manual verification burden: spatial invariants and pre-flight rules are validated deterministically via automated CLI tests.
- High-fidelity visual communication is enforced before any code changes are made.
- Long-term sustainability and reasoning sharpness across agent workflows.


---

## DECISION-049 — Vocabulary Vault Relocation to Domain D, Alphabetical Main Panel Sorting, Program Quick Filters & Lexicon Architecture

Date: 2026-11-13
Status: ACCEPTED

### Context
In the ABCD System hierarchy, Domain C (`C — CLASS`) was historically cluttered by having `Vocabulary Vault` pinned alongside active operational class instances (`Camp 2nd Vocabulary`, `Evnikom 1st Vocabulary`). Because `Vocabulary Vault` is a centralized multi-tenant master data item bank (containing 1,330 words, 160 phrases, 9 themes, 33 topics, and blueprints) rather than an enrolled class session, its presence in Domain C created cognitive friction between teaching classes and authoring master data. Furthermore, users required alphabetical ordering across Domain D menu items and main panel table contents, program-specific quick filtering in the lower panel, and fine-grained deterministic lexicon coordinates (`LEX-CD`).

### Decision
1. **Domain D Relocation & Alphabetical Order**:
   - Relocated `Vocabulary Vault` (`vocab_vault`) from Domain C to Domain D (`D — SYSTEM & DATA`) in `admin.html`.
   - Ordered Domain D sub-navigation alphabetically: `Modules (Core Blocks)` (M) ➔ `System Settings` (S) ➔ `Vocabulary Vault` (V).
   - Re-mapped `sectionDomainMap.vocab_vault = 'DATA'` in `js/admin/app.js`.
2. **Main Panel Alphabetical Sorting Engine**:
   - In `js/admin/vocab-vault.js`, modernized `_renderThemeManagerTab` and `_renderThemeBlueprintTab` to sort themes alphabetically A–Z by name within each level, and topics alphabetically A–Z by name within each theme.
   - In `_renderVaultGrid`, default sorted all vocabulary words and phrases alphabetically A–Z by English text.
3. **Program Quick Filters in Lower Panel**:
   - In `syncThemeManagerBottomBar`, added program quick filter pills (`[PROG: ALL]`, `[CMP]`, `[EVN]`, `[SHR]`) alongside level pills, allowing instant tenant isolation without page reload.
   - Added `vault-program-filter` to Vocabulary Words and Phrases bottom action bars.
4. **Lexicon Code System (`LEX-CD`) Integration**:
   - Pre-indexed all words and phrases deterministically by sorting stably before assigning incremental counters (`101-W01`..`101-W40`, `2A1-P01`..`2A1-P10`).
   - Displayed `LEX-CD` coordinate badges in tables to prevent cross-pollination and support automated distractor generation.


---

## DECISION-050 — Vocabulary Vault Column Consolidation and Truncation Eradication

Date: 2026-11-13
Status: ACCEPTED

### Context
User identified redundant identity columns (`INST`, `PROG`, `LVL`, `CODE`) in the Words & Phrases grid (Gambar 1), text truncation across English idioms and Indonesian translations (Gambar 2 & 3), and artificial text clipping in Theme Manager topic names (Gambar 4). Investigation identified that 5 redundant metadata columns consumed 343px of horizontal space, while Theme Manager had an artificial inline `max-width: 130px` cap on `TOPIC NAME` and 40px widths on 8 two-digit breakdown columns.

### Decision
1. **Words & Phrases Grid Column Simplification**:
   - Eliminated redundant `INST`, `PROG`, `LVL`, and `CODE` columns from `vault-table`.
   - Grid now begins directly with `LEX-CD`, establishing a clean 6-column architecture:
     `LEX-CD` (85px) | `THEME` (150px) | `TOPIC` (180px) | `TYPE` (80px) | `INDONESIAN` (30%) | `ENGLISH` (35%).
   - Net gain of 263px horizontal width transferred directly to `ENGLISH` (`min-width: 360px`) and `INDONESIAN` (`min-width: 280px`).
2. **Theme Manager Truncation Eradication**:
   - Eradicated hardcoded `max-width: 130px` on `TOPIC NAME` (now `min-width: 240px; width: auto;`) and `max-width: 120px` on `THEME` (now `min-width: 140px;`).
   - Slimmed down 8 count breakdown columns from 40px to 30px, freeing up 80px horizontal space for long topic titles.


---

## DECISION-051 — Vocabulary Vault Pure Blue Spectrum Palette, Interactive Header Sorting & `<colgroup>` Geometry

Date: 2026-11-13  
Status: ACCEPTED

### Context
Users reported that sorting by `LEX-CD` was inoperative in the Vocabulary Vault grids, that Proverb items showed jarring alarm red (`#FF0000`) violating the Color SSOT rule, that Test Blueprint topic names suffered severe clipping under `table-layout: fixed`, and that zero-count cells in Theme Manager created visual noise.

### Decision
1. **Interactive Column Sorting & Coordinate Attachment**:
   - Attached `lex_code` directly as a first-class property (`w.lex_code = lexCode`).
   - Wired interactive click handlers on `<th>` elements toggling between ascending and descending sort, dynamically rendering `▲` / `▼` sort direction indicators.
   - Enhanced `#vault-search` filter predicate to support searching by `LEX-CD` coordinate strings (e.g. `3D1`).
2. **Pure Blue Spectrum Palette for Word Types**:
   - Enforced all word types strictly within blue spectrum hues to preserve high-contrast professional calm and prevent grade-confusion with Grade E red:
     - Noun & Idiom: Sky Blue (`#60a5fa`)
     - Verb & Proverb: Indigo Blue (`#818cf8`) — replacing `#FF0000`
     - Adjective & Expression: Tactical Cyan (`#38bdf8`)
     - Adverb & Phrase: Powder Blue (`#93c5fd`)
     - Vocab: Periwinkle Blue (`#a5b4fc`)
   - Replaced rogue purple Exam Status (`#c084fc`) with Pure Green (`#4ade80`).
   - Implemented Zero-Dimming (`#334155`) for empty breakdown counts in Theme Manager.
3. **`<colgroup>` Geometry Overhaul for Truncation Eradication**:
   - Injected `<colgroup>` elements directly before `<thead>` in `#blueprint-matrix-table` (`Topic Name: min-width: 240px; width: auto;`) and `#theme-manager-flat-table` (`TOPIC NAME: min-width: 260px; width: auto;`).
   - Overrode super-header `colspan` distribution under `table-layout: fixed`, expanding Test Blueprint Topic Name to 290.98px and Theme Manager to 377.89px with zero truncated cells.

---

## DECISION-052 — Universal Zero-Truncation and Master Edit Mode White Excel Gridlines Invariant Across All Tables

Date: 2026-11-14  
Status: ACCEPTED

### Context
Following user directive regarding awkward table displays, text truncation in domicile and education columns, and inconsistent table gridlines during Edit Mode, a comprehensive system-wide audit was conducted. Two core invariants were mandated for permanent standardization across the entire TopsCore LMS ecosystem:
1. Universal Zero-Truncation: No table cell, header, or entity label may truncate with ellipsis (`...`) or clipped overflow when sufficient spatial viewport exists.
2. Master Edit Mode White Gridlines: When Edit Mode is active, all tables without exception must display crisp white Excel gridlines (`rgba(255, 255, 255, 0.45)`) on all cells, with borderless transparent inputs.

### Decision
1. **Universal Zero-Truncation Invariant Codification (`Rule 2.21`)**:
   - Codified in `AGENTS.md`, `.agents/rules/ui-invariants.md`, and `.antigravityrules`.
   - Every column across all data tables (Student Roster, Batches, Programs, Classes, Tests, Attendance, Vocabulary Vault, Theme Manager, Audit Log) MUST be calibrated to worst-case entity lengths (e.g. `PROVINCE` 160px, `CITY / DISTRICT` 150px, `EDUCATION` 140px, `NAME` 200px flex-primary, `TITLE` 240px).
   - In Theme Manager, added `padding: 6px 2px;` to all 8 count breakdown columns to prevent two-digit counts from exceeding cell client width.
   - Synchronized header flex justification (`datagrid.js`) with column alignment so left-aligned columns align directly with cell data below.
2. **Master Edit Mode Universal White Excel Gridlines (`Rule 2.22`)**:
   - Extended `css/admin/admin-editmode.css` selectors to universally target `table th, table td`, `.table-wrap table`, `.datagrid-table`, `.data-table`, `.matrix-table`, `.admin-standard-table`, `.vocab-vault-table`, `.live-monitor-table`, `#vault-table`, `#theme-manager-flat-table`, and `#blueprint-matrix-table`.
   - Enforced continuous white perimeter (`border-left` on first child, `border-top` on first header row, `border-right` on last child).
   - Standardized 100% borderless, transparent, zero-radius inputs and selects inside editable cells during Edit Mode (`border: none !important; background: transparent !important;`).
3. **Automated Verification**:
   - Created authoritative test suite verifying compliance across all tables in View Mode and Edit Mode.

---

## DECISION-053 — Standard Student Name (`studentName`) and Dashboard-Only Title (`Mr.` / `Miss`)

Date: 2026-11-14  
Status: ACCEPTED

### Context
Historically, `formatStudentName` in `js/api.js`, `updateStudentGender`, student registration, and `result.js` were mistakenly prepending `Mr.` and `Miss` to student names. This created confusion and polluted database records and session states. The user clarified the core architectural principle:
- By default, student names are standard authentic names (`studentName` / `name` / `students.name`). A student's name is simply their name.
- The **Student Dashboard** (`dashboard.html` / `js/dashboard.js`) is the **SOLE location in the system** where `Mr.` or `Miss` is attached to `studentName` for greeting display.
- There is no need for a convoluted "cleanstudentname" rule everywhere; standard `studentName` / `name` is naturally pure by default.

### Decision
1. **Rule 2.23 in `AGENTS.md` and Rule 2.8 in `.agents/rules/ui-invariants.md`**:
   - By default, student name is simply standard `studentName` / `name` across the entire system.
   - The Student Dashboard (`dashboard.html` / `js/dashboard.js`) is the only place where `Mr.` or `Miss` is prepended for display.
2. **Database & API Layer Discipline**:
   - `students.name` in PostgreSQL database stores standard student names directly.
   - `updateStudentGender` only updates `gender: g`, never touching the `name` column.
   - `verifyStudentLogin` and `fetchStudentsByProgram` return standard student names (`name: student.name`).
   - `formatStudentName(name)` simply returns `name || ''`.
3. **Frontend Presentation Screens & Batch Royal Titles (King & Queen)**:
   - Result screen (`js/result.js`), Test Room (`js/test.js`), Conversation Room (`js/conversation-room.js`), and Admin Console simply display standard `session.student_name` or `student.name`.
   - **Student Dashboard (`dashboard.html` / `js/dashboard.js`) Title & Crown Mechanics**:
     * In each batch, the male student with the highest score / points earns the title **`King`**.
     * The female student with the highest score / points in that batch earns the title **`Queen`**.
     * Both King and Queen receive the dynamic royal title prefix (`King <Name>` / `Queen <Name>`) across the dashboard header, welcome banner, profile modal, and standings list.
     * Both King and Queen are awarded a glowing golden crown effect (`👑`, `.avatar-crown-badge`) floating directly above their photo avatar on the dashboard and profile modal.
     * All other students in the batch retain the standard `Mr.` (male) or `Miss` (female) greeting without the crown effect.

---

## DECISION-054 — In-Browser Photo & Avatar Processing Invariant (Zero Supabase Storage Egress)

Date: 2026-11-15  
Status: ACCEPTED

### Context
Allowing direct uploads of uncompressed camera or raster image files to Supabase Storage creates substantial bandwidth egress, database bloat, and dependency on external storage buckets. The platform mandates zero-egress, lightweight, web-native representations for all student avatars and photos.

### Decision
1. **Rule 2.25 in `AGENTS.md` and Do Not Do List in §5.2**:
   - All student and user photos across the entire platform are processed strictly **in the web browser (client-side)**, NEVER in Supabase backend or via heavy storage egress.
   - Avatars are generated dynamically using SVG data URIs (`generateAvatarDataUri(name)`) or compressed directly in the browser via HTML5 Canvas before any persistence.
   - Supabase Storage is NEVER used for uploading uncompressed or raw camera images. The system strictly operates on lightweight, processed web-native representations.
2. **Permanent Enforcement**:
   - Future AI agents and developers must never propose or implement backend image resizing pipelines, Edge Functions for image conversion, or direct raw image uploads to storage buckets.
   - Dummy accounts strictly use ultra-compact SVG vector avatars (~500 bytes) via `generateAvatarDataUri('Top')` (Rule 2.24).

---

## DECISION-055 — Compact UI Before & After Screenshot Standard (Max Height 600–800px)

Date: 2026-11-15  
Status: ACCEPTED

### Context
When performing UI redesigns, styling modifications, or visual preflights, capturing Before and After screenshots at full desktop resolutions (1080p, 1440p, or 4K) generates excessively tall, heavy image files. These bloated screenshots dominate conversation context, require immense vertical scrolling, slow down artifact loading, and clutter documents.

### Decision
1. **Rule 2.27 in `AGENTS.md` (Single Source of Truth Induk)**:
   - Whenever UI editing involves capturing Before and After design screenshots, baseline layouts, or visual comparisons, all screenshots MUST be captured or resized at a small, compact resolution.
   - The height of captured screenshots is strictly capped at a maximum of **600–800px** (e.g. capture viewport height set to $600\text{--}800\text{px}$, or resized/cropped so the image height $\le 800\text{px}$).
   - Massive full-bleed raw desktop captures are strictly prohibited.
   - Use compressed formats (JPEG quality 50–70, WebP, or compact PNG) to keep artifact files lightweight.
2. **Visual Pre-Flight Integration**:
   - The `visual-preflight` skill and checklist template directly reference `AGENTS.md Rule 2.27` as the single authoritative rule.

---

## DECISION-057 — Student Dashboard Class-Scoped Architecture & Class Lobby Cumulative Access

Date: 2026-11-19  
Status: ACCEPTED

### Context
1. In earlier iterations, when students progressed to higher levels (e.g. 3rd Level), previous level classes (Level 1 and Level 2) were filtered out in `fetchStudentClasses()` by an overly strict isolation clause (`cLvlNum === studentLevelNum`), which prevented students from reviewing, practicing drills, or checking past exam scores in the Class Lobby modal.
2. The Completed Tests table at the bottom of the Student Dashboard had an artificial filter restricting visible rows exclusively to milestone Exams (`if (!isEx) return false;`), suppressing completed formative Tasks.
3. The dashboard metrics (Hero card aura/score, Grade Card [GRADE, GRADE DESCRIPTION, RATE], and Batch Standings / "MY RANK") were previously evaluated across all attempts across the entire program rather than strictly reflecting the active selected class.

### Decision
1. **Cumulative Unlocked Classes in Class Lobby (Modal 🚪)**:
   - `fetchStudentClasses()` in `js/api.js` returns all classes belonging to the student's program up to their current level (`cLvlNum <= studentLevelNum`).
   - Higher levels (`cLvlNum > studentLevelNum`) remain locked.
   - Classes from passed levels (`_isRetroactive`) render with `Completed` status (100% ★).
   - Default selected class on fresh login strictly prioritizes the student's current active level class (`cLvlNum === studentLevelNum` or `level_id === studentLevelId`) to ensure 3rd Level students always land directly in their 3rd Level class.
2. **Dashboard Class-Scoped Architecture**:
   - The entire student dashboard represents the **currently selected class exclusively**:
     - **Grade Card (`GRADE | GRADE DESCRIPTION | RATE`)**: Evaluates academic performance, grade, and rate percentage strictly from tests/attempts in the selected class.
     - **My Rank & Standings**: Computes points, scores, progress, and classmate rankings strictly within the selected class. Active student's rank badge (`#dock-my-rank-number`) represents their standing in the selected class.
     - **Hero Card**: Aura, border tier color, and score indicators strictly reflect the selected class.
     - **Next Assignment Hero Card**: Renders the next incomplete test in the selected class.
3. **Completed Tests Table Restoration (Tasks + Exams)**:
   - The Completed Tests table displays all submitted/completed tests in the selected class, encompassing both formative Tasks and milestone Exams.
   - Total count badge (`#dock-completed-count-badge`) reflects the complete count of finished tests in that class.
   - Rows remain interactive with retry and component chooser modal support for unified topic packages.

---

## DECISION-058 — Non-Level Programs Architecture (Level 0) and Alumni Promotion to Level X (Superseded by DECISION-066 for Numeric '0' Display)

Date: 2026-11-19  
Status: ACCEPTED

### Context
1. Previously, the database assigned `level_number = 0` to "Alumni". However, calling Alumni (the ultimate graduation milestone after Level 3) "Level 0" created cognitive dissonance and violated educational domain logic: 0 intuitively implies "entry-level", "pre-school", or "unleveled", while Alumni is the highest achievement.
2. In reality, multiple institutions and standalone programs (e.g. all programs under institution **TOP**: **Evnikom**, **Sheraton**, **Tamata Persada**) operate without a multi-tiered level hierarchy (no 1st, 2nd, 3rd Level progression). They are single-tier, standalone training programs.
3. Assigning active students in TOP programs to Level 0 caused them to be mistakenly treated as Alumni (displaying badge 'X') or required convoluted null checks in SQL/PostgREST.
4. User explicitly directed to overhaul this: Alumni becomes **Level X**, while **Level 0** is permanently dedicated to non-leveled programs (displayed as a clean dash **`—`** in UI tables), and in all naming conventions (classes, tests, codes) for non-leveled programs, the level component is completely omitted (considered empty).

### Decision
1. **Alumni Overhaul to Level X**:
   - In `levels` table, Alumni is updated to `level_number: 99` (Level X), name: `'Alumni'`.
   - UI formatters (`toShortLevel`, `toOrdinalLevel`) map `99` / `'Alumni'` / `'X'` to symbol **`X`** with purple tier glow (`#c084fc` / `var(--quad-d)`).
   - In `students` table, graduated students maintain `program_status: 'ALUMNI'`.
   - Level 0 is eradicated from Alumni logic.

2. **Level 0 Dedicated to Non-Level Programs**:
   - A dedicated entry is maintained in `levels` with `level_number: 0`, name: `'Non-Level'`, description: `'Program / Kelas tanpa jenjang (Unleveled)'`.
   - All classes, batches, and students in non-leveled programs (institution TOP) reference this Level 0 foreign key UUID.
   - **Visual Display (`0`)**: Governed by DECISION-066 where Level 0 is universally displayed as numeric character **`0`** across all workstation tables and student views (dash `—` is strictly reserved for null/unassigned data).
   - **Promotion Gating**: Students in Non-Level programs have no `LEVEL UP` button because there are no subsequent levels to advance to.

3. **Zero-Level Naming & Code Architecture**:
   - **Class Names & Codes (Level Segment Omission)**: The level ordinal is omitted since curriculum is single-tier:
     - Class Names: `Evnikom Vocabulary`, `Sheraton Vocabulary`, `Tamata Vocabulary` (omits `1st`).
     - Class Codes: `EVN-VOCAB`, `SHR-VOCAB`, `TMT-VOCAB` (omits `1` from `EVN-1VOCAB`).
   - **Test Titles & Codes (Uniform Level-Prefixed per DECISION-061)**:
     - Topic and theme codes use prefix `0` (`0G1`, `0G2`, `0A1`, `0G`, `0A`) for 100% uniformity across all curriculum levels:
     - Task titles & codes: `Evnikom Vocabulary Task 0G1 - Time Name` (`EVN-VCB-0G1-TASK`).
     - Exam titles & codes: `Evnikom Vocabulary Exam 0G - General` (`EVN-VCB-0G-EXAM`).

---

## DECISION-059 — Student Academic Raport (Portrait) Modal Layout & CTA 3-Pillar Architecture

Date: 2026-11-19  
Status: ACCEPTED

### Context
1. User identified layout and interaction issues on the Student Academic Raport modal (`showStudentDossierModal`) in `admin.html#students`:
   - The close button was inappropriately placed at the top-right corner of the modal header, while the desired UI hierarchy requires action controls inside the bottom CTA footer.
   - The carousel pager arrows (`← 1 of 12 →`) were placed in the top header rather than centered within the CTA footer.
   - The close button required 3 successive clicks to dismiss the modal due to nested/stacked backdrops triggered by `window.location.hash = '#profile-' + studentId` triggering `hashchange` listeners in `app.js`.
   - The raport sheet was cluttered with legacy edit buttons (`Edit Raport`, `Save Raport Changes`) when all student edits should be conducted via primary database forms.
   - Student info required clean vertical stacked rows (Full Name, Gender, Date of Birth, Age, Education, Address, and Course Data) with a 3:4 portrait photo whose height dynamically matches the exact text height.

### Decision
1. **Standardized 60px Title Area (§1.5.1 Centered Title & Zero Subtitle Clutter Invariant)**:
   - The top header toolbar (`.modal-header.title-area`) strictly enforces a 60px height (`height: 60px !important; min-height: 60px !important; max-height: 60px !important;`), a prominent bottom border (`1.5px solid rgba(255, 255, 255, 0.16)`), and solid Navy background (`#1E293B`).
   - Title text is mathematically centered (**Centered Title Invariant**), 16px Outfit 800 **ALL CAPS (`STUDENT ACADEMIC REPORT`)** with letter-spacing `0.05em`.
   - Strictly ZERO subtitle and ZERO description clutter (*Zero Subtitle Clutter SSOT*).
   - All side ribbon icons, parenthetical notes `(Portrait)`, and close buttons are completely eradicated from the Title Area.
2. **CTA 3-Pillar Architecture (`.modal-footer`)**:
   - **Bottom-Left Corner (`flex: 1; justify-content: flex-start;`)**: `CLOSE` button (`#btn-close-dossier-modal`).
   - **Center (`flex: 1; justify-content: center;`)**: Student carousel pager (`#btn-modal-prev-dossier`, `1 of X`, `#btn-modal-next-dossier`).
   - **Bottom-Right Corner (`flex: 1; justify-content: flex-end;`)**: `Export to PDF` button (`#btn-export-pdf-dossier`).
   - **Eradication of CSS Suppression**: Removed `#btn-close-dossier-modal` from the global `display: none !important;` rule in `css/style.css` so the CTA close button renders cleanly with `display: inline-flex !important;`.
3. **Instant Single-Click Dismissal Fix**:
   - Replaced direct hash assignment with `history.replaceState(null, '', url.toString())` to prevent triggering `hashchange` in `app.js`, eliminating duplicate modal instantiations.
   - Implemented `closeAllDossierModals()` which purges all matching backdrop nodes (`#student-dossier-modal, .student-modal-backdrop, #student-profile-modal`) and clears event listeners cleanly on 1 click.
4. **Raport Biodata & Course Data Standards**:
   - Stacked rows: Full Name, Gender, Date of Birth, Age (`X yo`), Education, Address, and Course Data.
   - Course Data renders without separators or bullets in solid black bold font (`#0f172a`, e.g. `CEC Camp 134`).
   - Photo box dynamically syncs its height and 3:4 proportional width to the exact height of the stacked meta rows (`syncRaportPhotoHeight`).

---

## DECISION-060 — Organization Hub Unified Datagrid Table Transformation & Sub Panel Edit Mode Architecture

Date: 2026-11-19  
Status: ACCEPTED

### Context
1. User identified that batch Sheraton 26 (`SH-26`) was inactive (`is_active: false`) and past due (`actual_final_date: '2026-10-02'`), preventing it from displaying as an ongoing batch and hiding it from the `B — BOARD` sidebar.
2. The Organization Hub page (`admin.html#organization`) previously rendered nested, fragmented accordion cards (`.curriculum-tree-node`) with sub-grids for each program, lacking a unified workstation datagrid table and single-screen 100vh viewport lock.
3. The page had no Sub Panel action controls (`#admin-bottom-infobar`), making it impossible to rename items inline or adjust class/batch statuses directly.

### Decision
1. **Sheraton SH-26 Activation & Period Extension**:
   - Updated `batches` in Supabase where `id = '67108e07-e262-4707-b07e-970627061b54'` to `is_active: true` and `actual_final_date: '2026-12-30'`.
   - Batch status is now officially `Ongoing` (green) and `Sheraton SH-26` renders dynamically under `B — BOARD` in the sidebar.
2. **Unified Desktop Workstation Datagrid Table Architecture**:
   - Replaced fragmented tree accordion nodes with a single authoritative desktop workstation table (`table.datagrid-table` inside `.table-wrap.sticky-first` with 100vh viewport lock).
   - Standardized 13-column geometry: `NO (36px) | PROGRAM (135px) | BATCH NAME (110px) | CLASS (150px) | LEVEL (55px) | STUDENTS (65px) | START (95px) | FINISH (95px) | DURATION (100px) | REMAINING (90px) | STATUS (85px) | ACTIVE (70px) | ACTIONS (84px)`.
   - Columns are fully sortable via interactive header clicks with active `▲`/`▼` indicators in Tactical Blue (`#38bdf8`) per Rule 2.38 Pillar 6.
3. **Sub Panel (40px) & Master Edit Mode Integration**:
   - Docked lower Sub Panel (`#admin-bottom-infobar`) with live statistical summary on the left (`X Batches · Y ACTIVE · Z INACTIVE · N Programs · M Enrolled Students`) and 30px action buttons on the right (`Edit Mode`, `+ Add Batch`, `+ Add Program`).
   - The `Edit Mode` button adheres to the Ghost-to-Solid-Glow invariant (§3.4): Ghost Cyan in standby, Solid Cyan `#0284c7` with glowing neon ring in active mode.
   - In Master Edit Mode, users can inline rename Batch Name, Program Name, and Class Name, adjust dates, and toggle or select Active/Inactive status for both Classes and Batches directly, persisting instantly via `adminUpdate` with toast notifications and sidebar synchronizations.

---

## DECISION-061 — Level 0 Theme Manager Support & Uniform Level-Prefixed Test Code Architecture (`0G1`, `0G2`, `0A1`)

Date: 2026-11-19  
Status: ACCEPTED

### Context
1. In `admin.html#vocab-vault` (Theme Manager & Vault Items), changing level to `0` (Level 0 / Non-Level `—`) was blocked by frontend validation checks (`newLvl < 1` and `parsedLvl < 1`) rejecting input with *"Level must be between 1 and 6."*.
2. Furthermore, in `js/api.js`, level filter queries checked `if (oldLevel)` and `if (targetLevel)`, causing integer `0` to evaluate to *falsy* (`Boolean(0) === false`), skipping database updates on Level 0 records.
3. Moving a theme's level in vocabulary tables did not cascade to `theme_program_assignments`, severing program associations for the moved theme.
4. User requested that for Level 0, test codes should explicitly include the level number `0` in front (e.g., `G1` becomes `0G1`, `G2` becomes `0G2`, and `A1` becomes `0A1`) to guarantee 100% uniformity across all curriculum levels (`0...`, `1...`, `2...`, `3...`).

### Decision
1. **Frontend Level 0 Permissibility**:
   - Updated `js/admin/vocab-vault.js` input validation in both Vault Items and Theme Manager tables to accept `0` (`newLvl < 0 || newLvl > 6`), permitting Level 0 (Non-Level `—`).
   - Standardized toast message to: `"Level must be between 0 and 6 (0 for Non-Level)."`.
2. **Theme Level Cascade (`updateVaultThemeLevelCascade`)**:
   - Implemented `updateVaultThemeLevelCascade(themeCode, oldLevel, newLevel)` in `js/api.js`.
   - Safely checks `targetLevel !== null && targetLevel !== undefined` to prevent JavaScript *falsy* coercion of `0`.
   - Moving a theme's level automatically updates all associated `vocabulary_vault` items and synchronously cascades `theme_program_assignments.target_level`.
   - Editing `LVL` on a row in Theme Manager moves the entire theme and synchronizes all DOM rows, code labels, and in-memory caches.
3. **Uniform Level-Prefixed Test Code (`0G1`, `0G2`, `0A1`)**:
   - Column `CODE` in Theme Manager, Test Blueprint, and Vault tables uniformly displays `${lvl}${cleanThemeCode}${cleanTopicCode}` (producing `0G1`, `0G2`, `0A1` for Level 0).
   - In `js/api.js` (`upsertDynamicTestShell`), test shell codes and titles on Level 0 now include the `0` prefix:
     * Task shell codes: `EVN-VCB-0G1-TASK`, `EVN-VCB-0G2-TASK`, `SHR-VCB-0A1-TASK`.
     * Task titles: `Evnikom Vocabulary Task 0G1 - Time Name`, `Evnikom Vocabulary Task 0G2 - Family Member`, `Sheraton Vocabulary Task 0A1 - Pre-Test`.
     * Exam shell codes: `EVN-VCB-0G-EXAM`, `SHR-VCB-0A-EXAM`.
     * Exam titles: `Evnikom Vocabulary Exam 0G - General`, `Sheraton Vocabulary Exam 0A - Hospitality`.
   - In `findTaskForTopic` and `findExamForTheme`, tests match both prefixed (`0G1`) and legacy bare codes (`G1`) for resilient backwards-compatibility.
4. **Evnikom & Sheraton Live Data Migration**:
   - Migrated all 90 vocabulary items of Theme `G` (`Time Name` & `Family Member`) in `vocabulary_vault` to `target_level = 0`.
   - Updated `theme_program_assignments` for Theme `G` to `target_level = 0` for Evnikom (`EEC`).
   - Cleaned up duplicate Theme `A` assignment from Evnikom, ensuring Theme `A` Level 1 is cleanly assigned to Camp.
   - Updated database test records in `tests` for Evnikom (`EVN-VCB-0G1-TASK`, `EVN-VCB-0G2-TASK`, `EVN-VCB-0G-EXAM`) and Sheraton (`SHR-VCB-0A1-TASK`, `SHR-VCB-0A-EXAM`).

## DECISION-063 — Modality-Specific Pacing SSOT for Vocabulary Classes (Words: 10s Spoken / 15s Written; Phrases: 20s Spoken / 10s Selection)

**Date:** 2026-11-21
**Status:** Approved & Enforced

### Context
In Vocabulary classes (e.g. Camp 1st/2nd/3rd Vocabulary, Evnikom/Sheraton/Tamata Vocabulary), tutors configure different answering modalities across tasks and unified exams. For example, a unified theme exam may have Part 1 (Words) as Written Answer and Part 2 (Phrases) as Selection (Multiple Choice). Previously, an outdated calculation formula in the test access modal (`totalQ * 1.5`) produced inflated durations (e.g. 200 questions $\times$ 1.5 = 300 minutes = 5 hours) with an artificial input ceiling of 180 minutes. A unified, modality-specific pacing SSOT was needed to calibrate precise, equitable test timers reflecting typing vs speaking vs selection speeds.

### Decision
1. **Vocabulary Class Modality-Specific Pacing Rules (SSOT)**:
   - **Words (Per Kata)**:
     - **Spoken**: Strictly **10 seconds** per word.
     - **Written**: Strictly **15 seconds** per word (accounts for typing and spelling).
     - **Selection / Multiple Choice**: Strictly **10 seconds** per word.
   - **Phrases (Per Frasa)**:
     - **Spoken**: Strictly **20 seconds** per phrase (accounts for complete utterance delivery).
     - **Selection / Multiple Choice**: Strictly **10 seconds** per phrase (reading and clicking 1 of 5 options).
     - **Written**: Strictly **20 seconds** per phrase.
2. **Unified Exam Dynamic Duration Formula**:
   $$\text{Duration (minutes)} = \left\lceil \frac{(\text{Words Count} \times \text{Words Pace}) + (\text{Phrases Count} \times \text{Phrases Pace})}{60} \right\rceil$$
   - **Standard 200-Question Exam (160 Words Written + 40 Phrases Selection)**:
     $$(160 \times 15\text{s}) + (40 \times 10\text{s}) = 2.400\text{s} + 400\text{s} = 2.800\text{s} \longrightarrow \lceil 2.800 / 60 \rceil = \mathbf{47\text{ minutes}}.$$
   - **All-Spoken 200-Question Exam (160 Words Spoken + 40 Phrases Spoken)**:
     $$(160 \times 10\text{s}) + (40 \times 20\text{s}) = 1.600\text{s} + 800\text{s} = 2.400\text{s} \longrightarrow \lceil 2.400 / 60 \rceil = \mathbf{40\text{ minutes}}.$$
   - **Words Task (40 Questions)**:
     - Spoken: $40 \times 10\text{s} = 400\text{s} \longrightarrow \mathbf{7\text{ minutes}}$.
     - Written: $40 \times 15\text{s} = 600\text{s} \longrightarrow \mathbf{10\text{ minutes}}$.
   - **Phrases Task (10 Questions)**:
     - Spoken: $10 \times 20\text{s} = 200\text{s} \longrightarrow \mathbf{4\text{ minutes}}$.
     - Selection: $10 \times 10\text{s} = 100\text{s} \longrightarrow \mathbf{2\text{ minutes}}$.
3. **Tutor Manual Duration Override Authority**:
   - The auto-calculated duration serves as the default suggestion and prefilled value.
   - If a tutor manually inputs an override duration (`dataset.userSet = '1'`), the manual duration takes strict precedence.
   - The modal input ceiling was raised to `max="360"` to prevent artificial clipping.
4. **Interactive Modal Reactivity**:
   - In `js/admin/tests-access.js`, changing either the Words module or Phrases module dropdown triggers instant real-time recalculation of the duration suggestion and prefilled input (e.g. `Auto: 47 min (160 Words @ 15s + 40 Phrases @ 10s)`).
5. **System-Wide Alignment**:
   - `js/api.js`: `calculateAutoDurationMinutes` and `calculateVocabUnifiedDurationMinutes` enforce the exact rates.
   - `js/admin/tests-access.js`: Modal recalculation engine enforces the exact rates.
   - `supabase/functions/start-test/index.ts`: Evaluates attempt deadline based on modality pacing for both unified and single-section tests.
   - `js/test.js`: Section filter and runtime expiration calculations honor the modality pacing.

---

## DECISION-064 — Modality and Level Structure for Vocabulary Classes (Level 2 Words-Only 7 Repetitions Architecture & Non-Phrases Governance)
**Date:** 2026-11-21  
**Status:** Approved & Enforced

### Context
In Vocabulary classes across levels, curriculum structures differ fundamentally:
1. **Level 1 Vocabulary (Foundational)**: Contains both Words and Phrases formatted as distinct module tasks.
2. **Level 2 Vocabulary (Camp 2nd Step / `CMP-2VOCAB`)**: Contains strictly **100% Words** (1,229 words, 0 active phrases in vault, `is_unified: false`). Each topic requires exactly **7 repetitions** of Words. There are no phrases tasks or phrase exam sections in Level 2.
3. **Level 3 Vocabulary (Camp 3rd Step / `CMP-3VOCAB`)**: Contains **Unified Topic Packages** (Words + Phrases combined per DECISION-034: 7 words repetitions + 7 phrase repetitions = 14 total repetitions).
4. **Non-Level Vocabulary (Level 0)**: Evnikom (`EVN-VOCAB`) is Words-only (7 reps), while Sheraton (`SHR-VOCAB`) is Unified (14 reps).

Previously, a hardcoded `isVocab ||` flag in `js/admin/app.js` assumed that *any* vocabulary class possessed phrases. This caused Level 2 to erroneously calculate topic denominators as 14 (displaying `7/14` instead of `7/7`) and render 7 empty phrase columns (`P1..P7`) filled with dashes (`—`) in the single-topic detail view.

### Decision
1. **Authoritative Level 2 Words-Only SSOT (Zero-Phrases Invariant in Level 2)**:
   - Level 2 Vocabulary curriculum is strictly **Words-only**.
   - No phrase tasks, phrase columns, or phrase repetitions exist in Level 2.
2. **Dynamic Repetition Scaling by Topic Structure**:
   - **Topics with Phrases (Level 3 / Unified)**: Requires 14 repetitions (7 Words + 7 Phrases). Topic overview displays `X/14`. Single-topic detail view renders 14 columns (`W1..W7` and `P1..P7`) under superheader colSpan 14.
   - **Words-Only Topics (Level 2 / Single Component)**: Requires exactly 7 repetitions (7 Words). Topic overview displays `X/7` (with `7/7` marking full topic completion). Single-topic detail view renders strictly 7 columns (`W1..W7`) under superheader colSpan 7. Phrase columns (`P1..P7`) are completely suppressed.
3. **Workstation Table Column Geometry**:
   - **Classes with Exam Phrases (Level 3 Vocabulary)**: Exam renders 7 distinct columns (`WRD RATE | WRD PTS | PHR RATE | PHR PTS | ACC PTS | GRADE | STATUS`) with superheader colSpan 8 (Overview) or 7 (Detail Exam).
   - **Classes without Exam Phrases (Level 2 Vocabulary & Non-Vocab)**: Exam renders standard 4 compact columns (`RATE | PTS | GRD | STS`) with superheader colSpan 5 (Overview) or 4 (Detail Exam).
4. **System-Wide Implementation**:
   - `js/admin/app.js`: Implemented `checkTopicHasPhrases`, `checkThemeHasPhrases`, and `isLevel2Vocab` guards across all attendance matrix view modes (Master Overview, Topics Overview, Single Topic Detail).
   - Ensured student mastery rates and class averages reflect accurate denominators (7 reps for Level 2, 14 reps for Level 3).

---

## DECISION-065 — 60-Second Grace Period & Seamless Session Finalization Architecture (Zero-Egress Anti-Panic Guard)
**Date:** 2026-11-21  
**Status:** Approved & Enforced

### Context
During formal exam sessions (such as Camp 3rd Vocabulary `CMP-3VCB-A-EXAM`), sudden session cut-offs and expiration can cause typing fatigue, panic, and uncertainty over whether in-flight answers are saved. Additionally, when a tutor closes or locks a session from the Admin workstation, students previously faced an abrupt browser `alert()` modal or sudden page redirect that felt like an unexpected crash.

Furthermore, auto-polling live monitors were strictly prohibited to protect Supabase quotas (Egress Bandwidth, DB read operations) per `AGENTS.md §0.1`.

### Decision
1. **Zero-Egress Floating Grace Banner (`#grace-period-banner`)**:
   - Implemented a high-visibility, calm floating banner pinned top-center (`test.html`, `css/test.css`).
   - Driven entirely by client-side countdown and the existing 15s attempt heartbeat. Strictly **zero additional Supabase queries or egress load**.
2. **Dynamic States & Visual SSOT**:
   - **Final 60 Seconds Window (`remaining <= 60s`)**: Dark slate canvas (`rgba(15, 23, 42, 0.96)`), 1.5px Dark Orange border (`var(--grade-d, #FF8C00)`), soft pulsating timer badge (`00:59`...`00:01`), and reassuring text: *"FINAL 60 SECONDS • FINISH CURRENT QUESTION — All answers are auto-saved. Finishing window active."*
   - **Tutor Session Closure / Lock State**: When tutor closes/locks session or marks attempt auto-submitted, activates emergency alert styling (`var(--grade-d)` / `var(--grade-e)`) with 2-second graceful flush: *"SESSION CLOSED BY TUTOR • AUTO-SAVING — Tutor has concluded this exam session. Submitting your work..."*
   - **Submission State (`00:00`)**: Displays Tactical Blue accent (`var(--primary-tactical, #38bdf8)`), centered spinner, and smooth auto-submit transition to `result.html` without blocking thread execution.
3. **Guaranteed Data Preservation**:
   - In-flight text is explicitly persisted via `saveCurrentAnswer()` immediately upon entering grace state and right before submitting.

---

## DECISION-066 — Level 0 Numeric Display ('0') Architecture (Universal Replacement of Dash '—')
**Date:** 2026-11-21  
**Status:** Approved & Enforced

### Context
Previously per legacy draft (DECISION-058), programs without hierarchical levels (such as Evnikom, Sheraton, Tamata on TOP institution, represented internally as `level_number = 0`) rendered level cells and badges as a neutral dash (`—`) to indicate "Non-Level".
However, rendering a dash (`—`) created ambiguity with truly empty/unassigned data fields (`null` or `undefined`) and appeared inconsistent across administrative tables (Workstations, Student Rosters, Curriculum Manager, Vault Items) where levels are expected to be numeric identifiers.

User instructed: *"pada tampilan level kita taruh saja 0 agar tidak pakai strip"*.

### Decision
1. **Universal Numeric Display '0' for Level 0**:
   - All level formatting helpers (`toShortLevel`, `toOrdinalLevel`, batch/student level cells, select filters, and modals) now explicitly return `'0'` instead of `'—'` for Level 0 / Non-Level.
   - The dash symbol (`—`) is reserved strictly for unassigned/empty data (`null`, `undefined`, or unselected).
2. **Synchronized Scope**:
   - `js/api.js`: `toShortLevel(0)` and `toOrdinalLevel(0)` return `'0'`.
   - `js/admin/curriculum-management.js`: `formatLevelOptionLabel` returns `'0'` for `level_number === 0`, and program-only batch rows render `'0'`.
   - `js/admin/student-management.js`: Workstation student level badges render `'0'`.
   - `js/admin/vocab-vault.js` & `js/admin/auto-gen-modal.js`: Select filters display `'0 (Non-Level)'`.
   - `js/admin/classes-hub.js`: Renders `'0'` for Level 0 classes.
   - `AGENTS.md` §2.4.2 & §2.6: Formally synchronized to document numeric `'0'` display and uniform level-prefixed test codes (`0G1`, `0G`, `0A1`) per DECISION-061.

---

## DECISION-067 — Workstation Topic & Theme Task Denominator Normalization Architecture (Zero Double-Multiplication Guard)
**Date:** 2026-11-21  
**Status:** Approved & Enforced

### Context
In Camp 3rd Vocabulary (`CMP-3VOCAB`), the curriculum uses Unified Topic Packages (7 Words + 7 Phrases = 14 total repetitions per topic).
In database `site_settings`, `class_test_settings` stores `taskRepetitions: 14` representing this total topic target.
However, in `js/admin/app.js`, calculations for `maxThemeTasks` and `maxTopicReps` treated `taskRepetitions` as per-component repetitions and multiplied it by 2 (`* (hasPhrases ? 2 : 1)`), resulting in:
- Topic denominator becoming `14 * 2 = 28` (instead of 14).
- Theme denominator becoming `4 * 14 * 2 = 112` (instead of 56).
- Student completion rate displaying `53%` (Orange / Grade D) despite completing 60 repetitions (full mastery).
- Class average topic footer summing `words_reps + phrases_reps + topic_reps` (7 + 7 + 7 = 21 instead of 14).

### Decision
1. **Per-Component Normalization (`compTargetReps`)**:
   - `compTargetReps = (targetReps >= 14) ? Math.round(targetReps / 2) : targetReps;`
   - Component level caps for Words and Phrases clamp to `compTargetReps` (7).
2. **Deterministic Matrix Denominators**:
   - `maxTopicReps = hasPhrases ? (compTargetReps * 2) : compTargetReps;` (strictly 14 for Unified, 7 for Words-Only).
   - `maxThemeTasks = numTopics * maxTopicReps;` (strictly 56 for Unified 4-topic theme, 28 for Words-Only).
3. **Automated Continuous Regression Guard**:
   - Codified as Pillar 5 in `scripts/test_repetitive_mastery_safeguards.mjs` running under `npm run test:fast`.

---

## DECISION-069 — System Glossary Workstation Panel (Domain D — DATA) & Hybrid Persistence Architecture
**Date:** 2026-11-21  
**Status:** Approved & Enforced

### Context
As the TopsCore LMS codebase expanded across 4 primary quadrants (A, B, C, D), numerous grading tiers (Star, A–E, F, R, X), strict curriculum structures (Unified Topics 7×7, Level 2 Words-Only, Level 0 Non-Level), and strict UI spatial invariants (100vh lock, 10px gaps, 10px padding, dual-scale typography), administrative auditing became increasingly difficult without a single unified glossary.
User requested: *"saya mau buat daftar istilah di seleutruh sistem TopsCore tabel ini berisi Group/ Lokasi | nama istilah | fungsi| warna | nanti tabel ini bisa kita edit dan periksa kita buat super detaiil. sebab saya mulai kesulitan menegcek semua yang ada . Kita Taruh di Bagian D dengan nama panel System Glossary"*.

### Decision
1. **Dedicated Workstation Navigation in Domain D (Data)**:
   - Sidebar item added in Domain D (`data-domain="desk"`) directly below *System Designs* labeled `System Glossary` (`data-sub="system-glossary"`).
   - Canonical route: `admin.html#system-glossary` (with aliases `#glossary` and `#system_glossary`).
   - Integrated tab in *System Designs* (`#interface-settings`) topbar for quick cross-navigation.
2. **5-Pillar Column Schema**:
   - `Group / Lokasi`: Categorical classification (ABCD, Grading, Curriculum, Student Gate, UI, Backend).
   - `Nama Istilah`: Authoritative term name + 1-Click Copy helper.
   - `Fungsi & Aturan SSOT`: Detailed technical description, formulas, bounds, and impact.
   - `Warna / Visual Token`: Live visual preview badge (rendering exact font/padding/color) + Hex/Token + 1-Click Copy.
   - `Referensi SSOT`: Direct pointer to governing documentation (e.g. `AGENTS.md §2.10`, `ui-invariants.md §1.2`).
3. **Subpanel Toolbar Controls**:
   - Filter pills dynamically counted by group: `[ALL]`, `[A — ADMIN]`, `[B — BOARD]`, `[C — CLASS]`, `[D — DATA]`, `[Grading & Badges]`, `[Curriculum & Tests]`, `[Student Gate]`, `[UI & Spasial]`, `[Backend & Governance]`.
   - Live debounced search bar.
   - 1-Click Export buttons for Markdown (`.md`) and CSV (`.csv`) offline cheat sheets.
   - Edit Mode toggle allowing inline table modifications, "+ Add Term", and row deletions.
4. **Hybrid Quota-Minimizing Persistence Strategy**:
   - Pre-seeded with 33+ comprehensive, authoritative SSOT terms in `js/admin/system-glossary-data.js` (0 database overhead on load).
   - When modified in Edit Mode, changes persist to Supabase `site_settings` under key `system_glossary` via a single lightweight upsert.
   - "Reset to SSOT" button provided for instantaneous restoration to canonical defaults.

---

## DECISION-070 — Task & Exam Dual-Pair Color SSOT Harmonization & 100% Unbroken Prerequisite Chain Integrity
**Date:** 2026-11-21  
**Status:** Approved & Enforced

### Context
In the Class Tests datagrid (`admin.html#class-hub?tab=tests`) and Test Generator Wizard modal:
1. `Task` was inadvertently styled with `var(--grade-c)` (yellow) and `Exam` with `#38bdf8` (tactical cyan), directly conflicting with the Dual Pairs SSOT in `AGENTS.md § 2.10.2` which dictates **Electric Lime (`#95ff00` / `var(--grade-b)` / `var(--task-color)`)** for `Task` and **Electric Pink (`#ff2d87` / `var(--quad-a)` / `var(--exam-color)`)** for `Exam`.
2. In `Camp 2nd Vocabulary`, 3 tests exhibited broken/null prerequisites: `CMP-2VCB-A-EXAM`, `CMP-2VCB-B-EXAM`, and `CMP-2VCB-C1-TASK` showed `—` because legacy auto-generator shells previously bypassed exact SKU matching.

### Decision
1. **Task & Exam Dual-Pair Color Harmonization (`AGENTS.md § 2.10.2`)**:
   - **Task Tokens**: Strict use of `var(--task-color, var(--grade-b, #95ff00))` (Electric Lime) across `TITLE` text spans, `TYPE` badge cells, modal card headers, and governance labels.
   - **Exam Tokens**: Strict use of `var(--exam-color, var(--quad-a, #ff2d87))` (Electric Pink) across `TITLE` text spans, `TYPE` badge cells, modal card headers, and governance labels.
   - Section 1 (Tasks) of the Test Generator Wizard modal styled with Electric Lime border & title; Section 2 (Exams) styled with Electric Pink border & title.
2. **100% Unbroken Prerequisite Chain Enforcement**:
   - Database prerequisites verified and linked for `Camp 2nd Vocabulary`:
     - `CMP-2VCB-A-EXAM` linked to `CMP-2VCB-A3-TASK` (`d66f11b6-c9cf-4b12-b37c-3e0bb153f51a`).
     - `CMP-2VCB-B-EXAM` linked to `CMP-2VCB-B4-TASK` (`e6fadab2-9587-4ab9-8150-88584395d199`).
     - `CMP-2VCB-C1-TASK` linked to `CMP-2VCB-B-EXAM` (`90308450-e456-4070-9e55-96ce2c26fa31`).
   - `Camp 1st Vocabulary` linked: `CMP-1VCB-A1-PHRASES-TASK` to `CMP-1VCB-A1-WORDS-TASK`.
   - All classes in TopsCore audited: 0 missing or broken prerequisite linkages.

---

## DECISION-071 — Universal Question Order (Sequential vs Random) Controls with Random Default SSOT
**Date:** 2026-11-21  
**Status:** Approved & Enforced

### Context
User requested configurable question delivery ordering (`Sequential` vs `Random`) across all relevant test governance interfaces, with `Random` enforced as the canonical system default to prevent cheating and position memorization.

### Decision
1. **Random Default SSOT**:
   - All tests, class governance defaults, and wizard auto-generators initialize with `question_order = 'random'`.
2. **5-Point Integrated Interface Architecture**:
   - **Point 1 (Card 4 — Standards & Vault on Classes Hub)**: Added `Task Order` and `Exam Order` inline selects, saved and synchronized across all active class tests on clicking `SAVE & SYNC STANDARDS`.
   - **Point 2 (Test System Settings Modal)**: Added `Question Order (Urutan Soal)` block with Task and Exam order configuration, supporting class-specific and global persistence via `site_settings`.
   - **Point 3 (Test Generator Wizard Modal)**: Integrated `Task Order` in Section 1 and `Exam Order` in Section 2 with default `Random (Acak)`.
   - **Point 4 (Class Tests Datagrid Edit Mode)**: In `[ Edit Mode ]`, the `ORDER` column renders interactive `<select>` dropdowns (`Random` vs `Sequential`), persisting changes directly via `adminUpdate('tests', id, { question_order, payload })`.
   - **Point 5 (Backend Persistence & Engine)**: `fetchClassTestSettings`, `saveClassTestSettings`, `updateClassTestsConfig`, `autoGenerateTestsHierarchy`, and `upsertDynamicTestShell` all support bidirectional parsing, defaults, and persistence of `question_order` in the `tests` table and its internal `payload`.

---

## DECISION-072 — Question Order Query Synchronization, Resilient Random Fallback & Multi-Tier Cache Invalidation
**Date:** 2026-11-21  
**Status:** Approved & Enforced

### Context
When saving class test governance settings, `tests.question_order = 'random'` successfully persisted to Supabase, but the Class Tests table UI continued rendering `Sequential`. Root causes identified:
1. `adminFetchAll('tests', ...)` in `js/admin/app.js` and `js/admin/classes-hub.js` did not list `question_order` in the explicit select query string, resulting in `r.question_order === undefined` in frontend rows.
2. The UI ternary `r?.question_order === 'random' ? 'Random' : 'Seq'` silently fell back to `Seq` instead of the mandated `Random` system default.
3. `clearApiCache('tests')` only invalidated `_apiCache` while leaving `_adminCache` stale.

### Decision
1. **Explicit Query Inclusion**: `question_order` added to all `tests` SELECT queries (`js/admin/app.js`, `js/admin/classes-hub.js`, and `js/api.js`).
2. **Resilient Random Fallback Invariant**:
   `questionOrder: (String(r?.question_order || r?.payload?.question_order || 'random').toLowerCase() === 'sequential') ? 'Seq' : 'Random'`
   If not explicitly set to `sequential`, the order strictly defaults to `Random`.
3. **Multi-Tier Cache Invalidation**: `clearApiCache('tests')` automatically invokes `clearAdminCache('tests')`, guaranteeing immediate refresh on save.
4. **Permanent Regression Guard**: Codified into `scripts/test_repetitive_mastery_safeguards.mjs` Pillar 1.4, verified on every `npm run test:fast`.

---

## DECISION-073 — Multi-Class Modality Scoping, Vocabulary Mastery Contract & Deferral of Gemini Live API
**Date:** 2026-11-21  
**Status:** Approved & Enforced

### Context
Detailed system audit resolved multiple ambiguities regarding passing thresholds across classes, class code abbreviations, evaluation module isolation, and external AI speech engines:
1. Passing rate of 70% was previously loosely referenced, creating ambiguity with the 60% Grade C passing threshold for Level Promotion.
2. Multiple future classes (Speaking, Storytelling, Grammar, Basic) require distinct evaluation mechanics and must not inherit Vocabulary-specific repetitive formulas.
3. Audio/speech evaluation via Gemini Live API (WebSocket full-duplex) was assessed against Supabase egress constraints and current project maturity.

### Decision
1. **Vocabulary Class Repetitive Mastery Contract (SSOT)**:
   - The 7x7 repetitive mastery requirement (with $\ge 70\%$ per attempt) is strictly and exclusively scoped to the **VOCABULARY** curriculum.
   - Vocabulary Theme Exams require $\ge 60\%$ (Grade C).
   - Level Promotion requires $\ge 60\%$ (Grade C).
2. **Multi-Class Modality Scoping & Item Bank Namespace Isolation**:
   - Official Class Code & Test SKU abbreviations codified:
     - Vocabulary: `VOCAB` (Class) / `VCB` (Test SKU)
     - Speaking: `SPEAK` (Class) / `SPK` (Test SKU)
     - Storytelling: `STORY` (Class) / `STT` (Test SKU — strictly `STT`, never `STY`)
     - Grammar: `GRAM` (Class) / `GRM` (Test SKU)
     - Basic: `BASIC` (Class) / `BSC` (Test SKU)
   - Item Bank items must be strictly isolated by `class_type` / `modality` namespace so questions never cross-pollinate between classes.
3. **Class-Bound Module Isolation Invariant**:
   - The 8 Evaluation Modules are bound exclusively to their host class domains. Similar interactions (e.g. voice/audio across Vocabulary Spoken vs Public Speaking Speech vs Storytelling Monologue) are technically distinct with dedicated scoring rubrics, tolerances, and passing logic.
4. **Web Speech API Retention & Gemini Live API Deferral**:
   - Web Speech API native browser engine (`js/speech.js`) is retained for current audio evaluation.
   - Real-time streaming via Google Gemini Live API (`gemini-3.8-live` over WebSockets) is officially deferred until all text modules and multi-class curricula are 100% stabilized, preserving Supabase egress quota and eliminating premature architectural complexity.

---

## DECISION-074 — Alumni Read-Only Review Mode, Universal TOP Institutions Alumni Status & Points Ceiling-Cap Rounding
**Date:** 2026-11-21  
**Status:** Approved & Enforced

### Context
Three critical operational nuances required definitive binding:
1. Student accounts that achieve ALUMNI status must be protected against accidental data overwrite or score regression when reviewing previous courses in Class Lobby.
2. Students graduating from single-tier Non-Level programs in TOP institutions (Evnikom, Sheraton, Tamata) require authoritative recognition as Alumni upon program completion.
3. Rounding half-up on fractional points (0.5 for minor spelling) risked erroneously elevating 49.5/50 to 50/50, generating an unearned 100% Star (★).

### Decision
1. **Alumni Read-Only / Review Mode Invariant**:
   - Any student with `program_status = 'ALUMNI'` accessing Class Lobby and completed tests operates in strict **Read-Only / Review Mode**.
   - Submissions, answer mutations, and retakes are locked; historical scores, percentages, and ranks cannot be overwritten.
2. **Universal Alumni Status for TOP Institutions**:
   - Graduating students from TOP institutions (Evnikom, Sheraton, Tamata) officially receive **ALUMNI status (`program_status = 'ALUMNI'`)** upon completing their program curriculum.
   - They retain full access to review all classes completed within their program.
3. **Ceiling-Cap Points Rounding Exception (Star Protection Invariant)**:
   - All fractional points $\ge .5$ round half-up via `Math.round()`.
   - **Exception**: When accumulated points approach maximum points without reaching it (`points >= maxPoints - 0.5` and `points < maxPoints`), points **strictly round down via `Math.floor()`** (e.g. 49.5/50 -> 49).
   - Protects the 100% Star (★) predicate so it is strictly exclusive to true zero-error performances.
   - Codified via `roundPointsWithCeilingCap(points, maxPoints)` in `js/grading.js`.




---

## DECISION-075 — Triple-Lock Class Modality Gating & Cross-Class Module Isolation

**Date:** 2026-11-21
**Status:** Approved & Enforced

### Context
As TopsCore expands beyond Vocabulary to Speaking, Storytelling, Basic English, and Grammar classes, the risk of module cross-contamination increases — an admin or backend call could inadvertently assign a Vocabulary module (M2/M3/M4) to a Speaking class, corrupting evaluation logic. Additionally, `detectClassDiscipline()` in `grading.js` contained a regex bug (`STY` instead of `STT`), and the auto-generate wizard was hardcoded to assume all classes are Vocabulary classes.

### Decision
**Triple-Lock Gating Architecture** implemented across three layers:

1. **Lapis 1 — SSOT Contract** (`AGENTS.md` §2.5.3):
   - New canonical section defining `Class Modality Inheritance & Strict Cross-Class Gating Invariant`.
   - Modality rules apply identically across all levels of the same class type.
   - Modality Color Identity SSOT: Vocabulary=`#95ff00`, Speaking=`#38bdf8`, Storytelling=`#FF8C00`, Basic/Grammar=`#c084fc`.

2. **Lapis 2 — UI Gating** (`js/admin/auto-gen-modal.js`):
   - Added `inferClassModality()` function (mirror of `detectClassDiscipline` without circular import).
   - Modal header now shows color-coded **modality badge** (Lime/Cyan/Orange/Violet) when in class-scoped mode.
   - Non-Vocabulary classes receive a prominent **orange warning notice** directing admin to manual test creation with the correct engine reference (M5/M6/M7 as appropriate).
   - `isVocabularyModal` / `isNonVocabularyModal` flags available for future UI section rendering.

3. **Lapis 3 — Backend Guard** (`supabase/functions/evaluate-test/index.ts`):
   - Added `inferDisciplineFromCode()` — server-side discipline inference from `classCode` in payload context.
   - Added `validateModuleClassBinding()` — rejects mismatched module/class pairs with explicit error message.
   - `routeEvaluation()` now accepts `classDiscipline` and enforces binding before scoring.

### Bug Fix (included in this decision)
- **`grading.js` line 2480**: Regex `-(?:[0-9]*STY|STORY)` corrected to `-(?:[0-9]*STT|STORY)` to match Storytelling class codes that use `STT` (not the retired `STY`). This was a silent ghost that would have caused `detectClassDiscipline()` to return `'GENERAL'` for all coded Storytelling classes.

### Inferensi Modality (Code-Based, No DB Column)
The `classes` table has no `class_type` column. Modality is inferred exclusively from `classes.code` using canonical abbreviation patterns (`VCB/VOCAB`, `SPK/SPEAK`, `STT/STORY`, `GRM/GRAM`, `BSC/BASIC`). `detectClassDiscipline()` in `grading.js` is the canonical source; `inferClassModality()` in `auto-gen-modal.js` is a local mirror.

### Not in Scope (Deferred)
- Adding a `class_type` column to the `classes` table: not needed; code inference is sufficient and avoids a migration.
- Graduated Difficulty Metadata per Level (`difficulty_tier`): deferred — not yet requested.
- Inter-class Prerequisite Chain (Class-to-Class): deferred — not yet designed.
- Modality-Specific Passing Grade in Database (`passing_grade` column): deferred.




---

## DECISION-076 — Dual-Tier Institution Identity Architecture (Shortcode SSOT vs Institution Fullname)

Date: 2026-11-22
Status: ACCEPTED

### Context
TopsCore mengelola 2 institusi resmi:
1. `CEC` (Cake English Course) — menaungi kurikulum berjenjang: Program Camp (Level 1–3).
2. `TOP` — menaungi program intensif/vokasional non-level (Level 0): Program Evnikom, Sheraton, Tamata.

Sebelumnya, nama panjang TOP belum diformalkan ("Top Optimal Program" kurang pas dan digantikan). Terdapat kebutuhan pemisahan ranah yang tegas antara nama singkatan (compact code) dan nama lengkap institusi (*Institution Fullname*) agar antarmuka tidak mengalami horizontal bloat atau truncation.

### Decision
1. **Formalisasi Nama Resmi Institusi (SSOT)**:
   - **CEC**: Standard Name: `CEC` | Full Name: **Cake English Course**
   - **TOP**: Standard Name: `TOP` | Full Name: **Top Occupational Program**
2. **General Default vs Explicit Full Name Rule**:
   - **Default Umum di Seluruh Sistem**: Nama institusi di seluruh aplikasi (database `name`, form, dropdown, tabel, badge, login gate, metadata, kode) secara standar dan default adalah strictly **`CEC`** dan **`TOP`**.
   - **Institution Full Name (On-Demand / Explicit Only)**: Nama panjang (*Cake English Course* dan *Top Occupational Program*) **HANYA** dimunculkan ketika diminta secara spesifik untuk menggunakan Institution Full Name (misal: dokumen cetak resmi/sertifikat kelulusan tertentu).
3. **Database & API Alignment**:
   - Tabel `institutions` di Supabase menyimpan `name = 'CEC' / 'TOP'`, `code = 'CEC' / 'TOP'`, dan kolom `full_name = 'Cake English Course' / 'Top Occupational Program'`.
   - `MOCK_INSTITUTIONS` dan helper di `js/api.js` diselaraskan ke SSOT ini.

### Consequences
- Menghilangkan kerancuan nama institusi di seluruh sistem.
- Menjaga kebersihan dan kekompakan tabel workstation admin (selalu menampilkan `CEC` / `TOP`).
- Memberikan identitas formal dan profesional bagi siswa dan tutor saat melihat kartu profil, sertifikat, dan laporan resmi.

---

## DECISION-077 — Unified 4-Letter Program Prefix, Harmonized Class & Test SKU Standards, and Strict Hyphenated Room Codes

Date: 2026-11-22  
Status: ACCEPTED (Supersedes & Permanently Eradicates Obsolete DECISION-056)

### Context
1. Audit sistem menyeluruh menemukan inkonsistensi panjang karakter kode (1, 2, 3, 4, 5, 8 huruf) yang menimbulkan ambiguitas lintas tabel dan modul:
   - Program codes di database memiliki panjang acak: `CAMP` (4), `EEC` (3), `SHERATON` (8), `TAMATA` (6).
   - Class codes sebelumnya menggunakan awalan 3 huruf: `CMP-1BASIC`, `EVN-VOCAB`, `SHR-VOCAB`, `TMT-VOCAB`.
   - Test `shell_code` memiliki warisan tanpa awalan (`3A1-TASK`, `3A-EXAM`, `3A-PHRASES-EXAM`) serta awalan 3 huruf `CMP-3VCB-A1-TASK`.
   - Room codes memiliki format bercampur: spasi (`Room 101`, `R 101`, `Hall A`, `Executive Hall A`), tanda hubung inkonsisten (`LAB-1`, `HALL-A`), dan kode acak.
2. Sesuai arahan mutlak pengguna: *"setiap ada decision baru maka hapus decision lama agar tak jadi rancu"*, `DECISION-056` dihapus secara permanen dan seluruh ketetapannya diunifikasi secara tuntas dalam `DECISION-077`.

### Decision
1. **Unifikasi Kode Program Baku (Strict 4 Letters SSOT)**:
   - `CAMP`: Cake English Course Camp Program (Level 1, Level 2, Level 3).
   - `EVNK`: Top Occupational Program — Evnikom English Class (Non-Level / Level 0).
   - `SHRT`: Top Occupational Program — Sheraton Hospitality Program (Non-Level / Level 0).
   - `TPTC`: Top Occupational Program — Tamata Persada Training Center (Non-Level / Level 0).
   - Database `programs.code` dan konfigurasi aplikasi diselaraskan 100% ke 4 huruf ini.

2. **Standardisasi Kode Kelas Semi-Long (`PROGRAM-LEVELCLASS` SSOT)**:
   - Format: `[PROGRAM]-[LEVEL][MODALITY]` (tanpa spasi, tanpa huruf 'L').
   - Kurikulum CEC Camp:
     - Level 1: `CAMP-1BASIC`, `CAMP-1VOCAB`, `CAMP-1STORY`, `CAMP-1SPEAK`, `CAMP-1GRAM`
     - Level 2: `CAMP-2GFS`, `CAMP-2VOCAB`, `CAMP-2STORY`, `CAMP-2SPEAK`, `CAMP-2GRAM`
     - Level 3: `CAMP-3PRON`, `CAMP-3VOCAB`, `CAMP-3STORY`, `CAMP-3SPEAK`, `CAMP-3GRAM`
   - Kurikulum TOP Non-Level (angka level ditiadakan per Zero-Level Omission Invariant):
     - `EVNK-VOCAB`, `SHRT-VOCAB`, `TPTC-VOCAB`.

3. **Standardisasi SKU & Kode Tes Simetris (`PROGRAM-LEVEL_CLASS-CODE-TYPE` SSOT)**:
   - **Pemetaan 1:1 Modalitas Kelas $\leftrightarrow$ Singkatan Kode Tes**:
     - `VOCAB` $\leftrightarrow$ `VCB`
     - `BASIC` $\leftrightarrow$ `BSC`
     - `STORY` $\leftrightarrow$ `STT` (strictly `STT`, dilarang `STY`)
     - `SPEAK` $\leftrightarrow$ `SPK`
     - `GRAM` $\leftrightarrow$ `GRM`
     - `PRON` $\leftrightarrow$ `PRN`
     - `GFS` $\leftrightarrow$ `GFS`
   - **Contoh Resmi**:
     - `CAMP-3VCB-A1-TASK` (Camp Level 3 Vocabulary Topic A1 Task)
     - `CAMP-3VCB-A-EXAM` (Camp Level 3 Vocabulary Theme A Exam)
     - `CAMP-1BSC-A-EXAM` (Camp Level 1 Basic English Theme A Exam)
     - `CAMP-1STT-A1-TASK` (Camp Level 1 Storytelling Topic A1 Task)
     - `EVNK-VCB-0G1-TASK` (Evnikom Level 0 Vocabulary Topic 0G1 Task)
     - `EVNK-VCB-0G-EXAM` (Evnikom Level 0 Vocabulary Theme 0G General Exam)
     - `SHRT-VCB-0A1-TASK` (Sheraton Level 0 Vocabulary Topic 0A1 Task)
     - `TPTC-VCB-0A1-TASK` (Tamata Level 0 Vocabulary Topic 0A1 Task)
   - Seluruh baris di tabel database `tests.shell_code` dimigrasikan ke standar ini. Parser kode di `js/api.js` dan `js/grading.js` tetap mendukung pembacaan mundur (*backwards-compatible*) untuk awalan legacy `CMP-`.

4. **Standardisasi Kode Ruangan (Strict Hyphenated Uppercase SSOT)**:
   - Format baku: `[TIPE]-[NOMOR/ID]` (huruf kapital, tanpa spasi, tanda hubung tunggal).
   - Ruang Kelas: `R-101`, `R-102`, `R-103`.
   - Laboratorium Bahasa: `LAB-01`.
   - Aula Pertemuan / Training: `HAL-0A`, `HAL-0B`, `HAL-0C`.
   - Dilarang keras menggunakan format spasi (`Room 101`, `R 101`, `Hall A`, `Executive Hall A`), tanpa pemisah (`LAB1`, `HALLA`), atau huruf kecil (`r-101`). Seluruh tabel workstation admin (`ROOM`), dropdown edit mode, modal, dan penyimpanan LocalStorage diselaraskan ke kode kanonikal ini.

5. **Pemusnahan Permanen Keputusan Usang (Obsolete Decision Eradication)**:
   - `DECISION-056` yang sebelumnya mengatur kode 3 huruf dihapus seutuhnya dari `docs/DECISIONS.md`.

### Consequences
- Menghilangkan ambiguitas dan tumpang tindih seluruh kode identifikasi di TopsCore LMS.
- Tampilan tabel workstation admin menjadi seragam, presisi, dan bersih dari inkonsistensi string ruangan atau kode kelas.
- Hubungan database (foreign keys) tetap 100% utuh karena relasi mengikat pada UUID primer.
- Dokumentasi dan aturan acuan bersih dari redundansi atau pertentangan keputusan lama vs baru.

---

## DECISION-078: Authoritative Multi-Level Assessment and Exam Regulation Architecture (Placement, 1st Step, 2nd Step, 3rd Step, Final Exam & Final Practice)

### Date
2026-11-22

### Status
Accepted & Enforced

### Context
Analisis komprehensif terhadap seluruh lembar kerja kurikulum (*NILAI TUTOR MATERI*, *TELLING STORY 1ST & 2ND STEP*, *LEMBAR NILAI EXAM*, *PLACEMENT TEST*, dan *KALKULASI NILAI AKHIR*) menetapkan perlunya acuan tunggal (SSOT) mengenai jumlah penilaian, dasar pengambilan nilai, tata cara evaluasi, dan 2 penilaian akhir (Final Exam & Final Practice).

### Decision
1. **Titik Penilaian & Distribusi per Level**:
   - **Diagnostic Phase: Placement Test**: 3 Indikator (Speaking 0–25, Baseline Vocab target 30 kata, Baseline Grammar target 25 poin). Evaluasi tatap muka 1-on-1 saat kedatangan.
   - **1st Step (Bulan ke-1 / Level 1)**: **52 Titik Data per Siswa** (12 Penilaian Akademik + 40 Sesi Presensi):
     - Presensi: 40 sesi (Senin–Jumat, 2 sesi/hari = 10 sesi/minggu).
     - Vocabulary Mastery: 4 kali (W1: 60–90 kata, W2: 120–210 kata, W3: 180–300 kata, W4: 240–450 kata kumulatif). Nilai di bawah target minimum memicu tanda merah.
     - Grammar Mastery: 2 kali (W1: 8–15 poin, W2: 12–20 poin).
     - Basic English Test: 2 kali (W1 & W2: skala 60–100 poin).
     - Speaking Practice (Telling Story): 4 kali (W1, W2, W3, W4; 10–25 poin, rubrik skala 1–5).
   - **2nd Step (Bulan ke-2 / Level 2)**: **51 Titik Data per Siswa** (11 Penilaian Akademik + 40 Sesi Presensi):
     - Presensi: 40 sesi (2 sesi/hari).
     - Vocabulary Mastery: 4 kali (W1: 75–120 kata, W2: 155–280 kata, W3: 235–440 kata, W4: 315–600 kata).
     - Advanced Grammar: 2 kali (W1: 10–30 poin, W2: 17–30 poin).
     - GFS (Grammar for Speaking): 2 kali (W1 & W2: 12–20 poin).
     - Speaking Practice (Telling Story): 3 sesi utama (W1, W2, W3; 12–25 poin / rubrik 1–5).
   - **3rd Step (Bulan ke-3 / Level 3)**: **11 Titik Nilai Akademik** (+ 40 Sesi Presensi):
     - Vocabulary Mastery: 4 kali (W1: 90–150 kata, W2: 215–400 kata, W3: 340–650 kata, W4: 415–800 kata).
     - Complex Grammar: 2 kali (W1 & W2: 8–15 poin).
     - Pronunciation Mastery: 2 kali (W1 & W2: akurasi fonetik dan intonasi).
     - Speaking Practice: 3 sesi (W1, W2, W3: tolak ukur kesiapan sebelum Ujian Akhir).

2. **Arsitektur 2 Penilaian Akhir (Final Evaluations Architecture)**:
   Evaluasi kelulusan akhir resmi terbagi menjadi **2 Penilaian Independen**:
   - **1. Final Exam (Panel 1: Main Examiner / Penguji Utama)**:
     - 4 Parameter: Fluency (25), Pronunciation (25), Idea/Content (25), Grammar (25).
     - Skor Maksimal: **100 Poin**.
   - **2. Final Practice (Panel 2: Speaking Tutor / Tutor Pendamping)**:
     - 4 Parameter: Fluency (25), Pronunciation (25), Grammar (25), Comprehension (25).
     - Skor Maksimal: **100 Poin**.
   - Total Keseluruhan: **2 Panel Penguji / 8 Parameter Nilai**. Nilai akhir digabungkan untuk kalkulasi predikat kelulusan pada transkrip sertifikat.

3. **Rubrik Acuan Baku Telling Story (Skala 1–5)**:
   - 1: Poor (Sangat Kurang)
   - 2: Fair (Kurang)
   - 3: Good (Cukup)
   - 4: Very Good (Baik)
   - 5: Excellent (Istimewa)

4. **Integrasi Sistem Workstation & Rute Admin**:
   - Workstation modul baru: `js/admin/exam-rules.js` (Route: `admin.html#exam-rules` / `#assessment-rules`).
   - Terdokumentasi pada `docs/EXAM_ASSESSMENT_REGULATIONS.md`.
   - Terintegrasi pada sidebar navigasi Domain A (Admin) dan sub panel Curriculum Hub.

### Consequences
- Standar jumlah ujian, frekuensi, metrik target, dan tata cara penilaian di setiap step menjadi transparan dan selaras antara tutor, penguji, dan sistem automated evaluation.
- Penilaian akhir memiliki kepastian pemisahan peran antara Penguji Utama (Final Exam Teori/Struktur) dan Speaking Tutor (Final Practice Praktik/Komunikasi).
- Seluruh tampilan dan kalkulasi nilai di masa mendatang wajib merujuk pada SSOT ini.


---

## DECISION-079: Student Birthplace (Place of Birth) Architecture & Roster Integration

### Date
2026-11-23

### Status
Accepted & Enforced

### Context
User requirement: *"1. untuk tanggal ahir kita punya lokasinya sendiri, kita buatkan kolom untuk tempat lahir. namakan Birthplace. apakh itu maksudmu? kita coba 1 batch dulu samapai stabil"*.
Previously, the `public.students` table maintained `birth_date` (Date of Birth / DOB), but lacked a dedicated column for Place of Birth (`birthplace`). Official graduation certificates, diplomas, and student dossiers require the standard Indonesian & international format: `[Birthplace], [Date of Birth]` (e.g. `PRAYA, 9TH DECEMBER 1984`).

### Decision
1. **Database Schema (`public.students`)**:
   - Added column `birthplace TEXT NULL` via migration `20261123010000_add_birthplace_to_students.sql`.
   - Verified active and queryable in Supabase PostgreSQL.
2. **Batch 134 Pilot Harmonization**:
   - Synchronized birthplace and birth date from `ANGKET SERTIFIKAT` (e.g., student `134001` Ayya Sofyandi Mzeth $\rightarrow$ `birthplace = 'PRAYA'`, `birth_date = '1984-12-09'`).
3. **Admin Workstation Roster Table (`js/admin/student-management.js`)**:
   - Added dedicated `BIRTHPLACE` column under `DEMOGRAPHIC` super-header (colspan updated from 3 to 4: `Birthplace`, `DOB`, `Age`, `Education`).
   - Supports inline editing in Master Edit Mode with live auto-save and visual feedback.
   - Integrated into student sorting (`sortComparator`), table export (`exportStudentsGradebook`), full edit modal (`bfe-birthplace`), and A4 printable Dossier (`Place, DOB`).

### Consequences
- Official certificate generation and student demographics have full access to both Place and Date of Birth with zero ambiguity.
- Tested on Batch 134 as pilot with 100% backward compatibility and zero impact on other batches.


---

## DECISION-080: Standardized Centered Uniform 12px Bottom Banner SSOT (Supersedes & Permanently Eradicates Conflicting Asymmetric Banner Typography Rules)

### Status
ACCEPTED (Supersedes & Eradicates Conflicting Banner Rules in UI Invariants & Legacy Blueprints)

### Date
2026-11-24

### Context
Banner dasar terkunci 50px (`#bottom-ad-banner` / `.topscore-locked-banner`) sebelumnya menerapkan aturan tipografi asimetris dengan teks rata kiri (`justify-content: flex-start; text-align: left; padding-left: 16px;`), serta disparitas ukuran dan ketebalan font antara brand dan author (`TopsCore` 16px weight 900 vs `by Mr. Top` 14px weight 800). Hal ini menimbulkan ketidakseimbangan visual, kurang rapi, dan tidak selaras saat ditampilkan pada koridor mobile 430px maupun workstation desktop 100vh.

### Decision
1. **Centered Alignment SSOT**:
   - Teks `"TopsCore by Mr. Top"` mutlak berada tepat di tengah (*centered*) di seluruh halaman dan viewport (`justify-content: center !important; text-align: center !important; padding: 0 16px !important;`).
   - Seluruh inner wrapper (`.banner-brand-wrap` & `.banner-brand-content`) berpusat 100% di tengah (`display: flex !important; align-items: center !important; justify-content: center !important; text-align: center !important; width: 100% !important;`).
   - Aturan lama yang menerapkan rata kiri (*left-aligned*) dan asymmetric left padding resmi dihapus dan dilarang.
2. **Uniform 12px Font & Weight SSOT**:
   - Seluruh teks pada banner (`TopsCore` maupun `by Mr. Top`) wajib berukuran seragam **`12px`** (`font-size: 12px !important;`), menggunakan font tunggal resmi `'Inter', sans-serif`, dan bobot identik **`font-weight: 700 !important;` (Bold)** dengan `letter-spacing: 0.04em`.
   - Aturan lama yang membedakan ukuran/bobot (16px vs 14px, 900 vs 800) resmi dihapus permanen.
   - Warna: `TopsCore` menggunakan Tactical Cyan (`#38bdf8`) dengan warna matte tegas (`text-shadow: none !important;`), dan `by Mr. Top` menggunakan White Slate (`#f8fafc`).
3. **Penyelarasan Seluruh Stylesheet**:
   - Diterapkan secara seragam di `css/style.css`, `css/dashboard.css`, `css/tutor.css`, `css/admin/admin-layout.css`, `css/admin/admin-modals.css`, `css/test.css`, `css/result.css`, serta minified bundles.

### Consequences
- Banner dasar 50px tampil rapi, simetris, berbobot seragam, dan 100% konsisten di seluruh aplikasi tanpa pertentangan aturan.
- Seluruh dokumen acuan (`AGENTS.md`, `.agents/rules/ui-invariants.md`, `docs/DECISIONS.md`) harmonis 100%.

---

## DECISION-081: Universal System-Wide Matte Enterprise Standardization & Complete Purge of Neon Glow (Flat Enterprise Precision SSOT)

### Status
ACCEPTED (Permanently Eradicates Ambient Glow, Radial Glow Gradients, and Text Shadows Across the Entire System; SUPERSEDES DECISION-016 & DECISION-042 tier glow auras)

### Date
2026-11-24

### Context
Pengguna memerintahkan standardisasi warna matte murni (pure matte) di seluruh sistem tanpa terkecuali, serta menghapus seluruh aturan lama yang berlawanan.
Sebelumnya, sistem masih menyisakan pendaran neon ambient (`box-shadow: 0 0 Xpx [color]`), gradient radial aura (`radial-gradient(...)`), dan bayangan teks (`text-shadow: 0 0 Xpx`) pada hero score cards, result cards, test modals, buttons hover, dan indicator badges yang dinilai norak (tacky) dan mengurangi wibawa enterprise.

### Decision
1. **Universal Matte Enterprise Palette SSOT**:
   - **Zero Ambient Neon Glow**: Seluruh deklarasi `box-shadow: 0 0 Xpx ...` di seluruh stylesheet CSS murni (`style.css`, `dashboard.css`, `result.css`, `test.css`, `auth.css`, `conversation.css`, `tutor.css`, dan seluruh file `css/admin/*.css`) dihapus dan diganti dengan elevasi matte bersih berbobot gelap: `box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35)` atau `box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4)` atau `none`.
   - **Zero Text Shadows**: Seluruh deklarasi `text-shadow: 0 0 Xpx ...` pada skor, persentase grade, judul hero, pips kata/frasa, dan bottom banner dihapus permanen (`text-shadow: none !important;`).
   - **Zero Radial Aura Gradients**: Latar belakang kartu (seperti `.hero-metric-box`, `.result-identity-card`, `.result-metrics-composite-card`) dialihkan dari radial gradient berkabut neon menjadi warna matte pekat yang solid (`#0f172a`, `#090d16`, `#070b19`).
   - **Crisp Matte Borders**: Penegasan kategori/tier nilai menggunakan garis border solid semantik berbobot presisi (`1px` atau `1.5px solid var(--tier-color)` / `var(--grade-*)`) tanpa pendaran glow di sekelilingnya.
2. **Eradikasi Aturan yang Bertentangan**:
   - Menghapus aturan "Universal Hover & Click Active Glow" pada `.agents/rules/ui-invariants.md`.
   - Memperbarui `AGENTS.md` §2.31 untuk mengunci *Universal Matte Enterprise Palette SSOT*.
   - Menghapus referensi tier glow pendaran pada bottom banner di `ui-invariants.md` §1.8.

### Consequences
- Seluruh antarmuka TopsCore LMS (Student Dashboard, Result, Exam Room, Tutor Desk, Admin Workstation, dan Gate) tampil profesional, tenang, berwibawa, dan berstandar enterprise modern.
- Zero ambiguitas atau konflik aturan styling antara dokumen governance dan kode implementasi.

---

## DECISION-082: Two-Tier Evaluation Architecture: Class-Daily Formative (Domain C) vs Batch-Weekly Report (Domain B) SSOT

### Status
ACCEPTED (Authoritative Architecture Standard for All Classes & Subject Assessments)

### Date
2026-11-24

### Context
Pengguna menegaskan klarifikasi arsitektur penilaian TopsCore LMS: nilai harian (*daily formative tasks / practice*) hanya berada di dalam kelas (*Domain C*), sedangkan nilai yang ditarik ke dalam Rapor Siswa (*Student's Report*) di *Domain B (Batch)* secara eksklusif adalah nilai mingguan / periodik (*weekly milestone / periodic exams*).
Perlu adanya kodifikasi resmi agar pemisahan peran antara Domain C (kelas operasional) dan Domain B (rapor rombongan belajar) terkunci secara permanen dan menjadi pedoman baku bagi perancangan seluruh kelas.

### Decision
1. **Lapis 1 — Harian (Daily Formative / Tasks / Repetitions / Practice — Domain C Exclusivity)**:
   - Seluruh aktivitas latihan, repetisi harian (seperti 7×7 kata dan frasa pada Vocabulary, drill percakapan Speaking, latihan performa teks Storytelling, dan tugas harian Grammar) **eksklusif beroperasi di dalam Domain C (Class Hub)**.
   - Bertindak sebagai kawah candradimuka proses belajar dan syarat pembuka gembok (*prerequisite gating*) menuju Ujian Mingguan.
   - **Mutlak tidak ditarik ke Rapor Siswa di Domain B**: Kesalahan selama proses latihan harian tidak pernah mengurangi nilai resmi rapor siswa.
2. **Lapis 2 — Mingguan & Periodik (Weekly Milestone & Periodic Exams — Domain B Aggregation)**:
   - Ujian resmi berkala (*Milestones*: `EX-1, EX-2, EX-3, EX-4`) diselenggarakan di dalam kelas untuk menguji capaian siswa.
   - Hasil ujian resmi mingguan/periodik inilah yang **secara otomatis ditarik ke dalam Student's Report di Domain B**.
   - Di Domain B, nilai-nilai ujian tersebut diolah menjadi Nilai Akhir per mata pelajaran dengan label **`SCORE`** (menggantikan istilah NA/TOTAL), dan seluruh SCORE dirangkum menjadi Nilai Rata-rata Keseluruhan (**`AVG`**) guna menentukan kelulusan level / promosi rombongan belajar.
3. **Harmonisasi Kolom OVERALL Domain C**:
   - Kolom `OVERALL` (`PTS` dan `GRD`) pada sisi kanan workstation Domain C adalah akumulasi poin mentah dan grade akhir khusus mata pelajaran tersebut yang mencerminkan Nilai Akhir (`SCORE`) yang mengalir ke Domain B.
4. **Protokol Pencegahan Bentrok Nama (Zero Name Clash Invariant & Audit Protocol)**:
   - Setiap perancangan atau perubahan penamaan label/kolom wajib melalui audit kode guna memastikan nol tumpang tindih semantik:
     - `SCORE`: Nilai akhir mata pelajaran (Subject Final Score %).
     - `AVG`: Rata-rata komposit seluruh mata pelajaran.
     - `PTS`: Poin mentah (*Whole Integer Raw Points*).
     - `RATE`: Persentase kelulusan ujian/topik di workstation kelas.
     - `GRD`: Simbol huruf grade (★, A, B, C, D, E).
     - `EX-1`..`EX-4`: Nomor urut resmi ujian berkala.

### Consequences
- Batas kerja antara Domain C dan Domain B menjadi 100% tegas, logis, dan intuitif bagi admin maupun pengembang.
- Seluruh kelas (Vocabulary, Speaking, Storytelling, Grammar, Basic/Pronunciation) memiliki acuan seragam dalam menstrukturkan materi harian vs ujian mingguan.

---

## DECISION-083: Dual-Tenant Step vs Level Terminology SSOT (CEC Step vs TOP Level)

### Status
ACCEPTED (Authoritative Terminology Standard for Institutional Differentiation)

### Date
2026-11-24

### Context
Institusi Cake English Course (CEC) menggunakan kurikulum berjenjang 3 bulan bertahap yang secara kultural dan pedagogis dinamakan **`Step`** (`1st Step`, `2nd Step`, `3rd Step`). Sedangkan institusi Top Occupational Program (TOP: Evnikom, Sheraton, Tamata) menyelenggarakan program vokasi/hospitality non-level intensif yang menggunakan entitas teknis **`Level`** (`Level 0`).
Pengguna memerintahkan penyelarasan terminologi: CEC resmi beralih menggunakan istilah **`Step`**, sedangkan TOP tetap mempertahankan istilah **`Level`**.

### Decision
1. **CEC Terminology SSOT (Program Camp)**:
   - Istilah resmi jenjang adalah **`Step`**:
     - `1st Step` (Bulan 1)
     - `2nd Step` (Bulan 2)
     - `3rd Step` (Bulan 3)
   - **Header Kolom Datagrid**: Menampilkan **`STEP`** (bukan `LVL`).
   - **Tombol Kenaikan Jenjang**: Menampilkan **`STEP UP`** (atau `NEXT STEP`).
   - **Kelulusan Akhir 3rd Step**: Resmi berstatus **`Alumni` (Level X)**.
2. **TOP Terminology SSOT (Program Evnikom, Sheraton, Tamata)**:
   - Istilah resmi jenjang tetap **`Level`**:
     - Entitas teknis database: **`Level 0`** (`level_number = 0`).
     - Header kolom datagrid: Menampilkan **`LVL`** (bernilai **`0`** sesuai DECISION-066).
     - Tanpa tombol promosi (program tunggal selesai), langsung lulus berstatus **`Alumni`**.
3. **Database Integrity**:
   - Kolom database internal `levels`, `level_id`, dan `level_number` tetap dipertahankan tanpa perubahan skema destruktif; pembedaan terminologi diaplikasikan pada antarmuka (UI/UX) dan label visual.

### Consequences
- Menghadirkan rasa bahasa yang otentik dan selaras 100% dengan budaya akademik CEC dan TOP.
- Pengguna dan siswa CEC melihat istilah `Step` yang alami, sementara program vokasi TOP tetap terdefinisi jelas sebagai `Level 0`.

---

## DECISION-084: 3rd Step (Level 3) Milestone Exam Passing Threshold (70%)

### Status
ACCEPTED (Authoritative Academic Standard for 3rd Step Final Exams)

### Date
2026-11-24

### Context
Pada kurikulum berjenjang CEC Camp, Step 3 (Level 3) merupakan jenjang tertinggi sebelum kelulusan resmi menjadi Alumni (Level X). Materi kosakata Level 3 mencakup kosakata tingkat lanjut dan akademis (Academic Vocabulary — TOEFL & IELTS). Pengguna menginstruksikan standar kelulusan khusus untuk Ujian Akhir Tema (Milestone Exam) pada 3rd Step adalah **70%** (berbeda dari batas standar umum 60%).

### Decision
1. **3rd Step Exam Passing Threshold (70%)**:
   - Seluruh Ujian Akhir Tema (Milestone Exams) untuk 3rd Step / Level 3 (`CAMP-3VCB-A-EXAM`, `CAMP-3VCB-B-EXAM`, `CAMP-3VCB-C-EXAM`, `CAMP-3VCB-D-EXAM`) wajib menetapkan batas minimal kelulusan `minimum_required_score = 70`.
2. **Auto-Generator Default Integration**:
   - Fungsi pembangkit tes otomatis `autoGenerateTestsHierarchy` di `js/api.js` mengadopsi aturan ini: jika `levelNum === 3`, nilai default `testPass` secara otomatis diatur ke `70%`.
3. **Database Consistency**:
   - Metadata tes pada tabel `tests` (`minimum_required_score` dan `payload.minimum_required_score`) telah diperbarui ke `70%` untuk seluruh ujian aktif Level 3.

### Consequences
- Standar kelulusan Step 3 mencerminkan rigoritas akademis tingkat lanjut sebelum siswa dipromosikan ke jenjang Alumni (Level X).
- Seluruh tugas harian (Tasks) dan ujian tema (Exams) pada 3rd Step selaras pada batas penguasaan minimal 70%.

---

## DECISION-085: Strict System-Wide Inactive Student Exclusion & Database Synchronization

### Status
ACCEPTED (Authoritative Student Lifecycle & Cohort Visibility SSOT)

### Date
2026-11-25

### Context
Pengguna melaporkan bahwa siswa yang berstatus tidak aktif (*inactive*) muncul di papan peringkat/standings dan modul sistem lainnya (contoh pada Batch 134: Adinda Karunia Farela, Abdul Basit, Ida Wayan Gana Surya Arta, dan Riska Fetrosia).
Investigasi akar masalah menemukan 3 celah:
1. **Desinkronisasi Database (`is_active` vs `program_status`)**: Data siswa di Supabase memiliki `program_status = 'INACTIVE'`, namun kolom `is_active` (boolean) bernilai `true` (karena ter-overwrite oleh script data ingest atau ketiadaan sinkronisasi otomatis).
2. **Kueri Single-Condition di Frontend**: Beberapa modul seperti `loadBatchLeaderboard` di `dashboard.js`, `fetchStudentsByProgram` di `api.js`, dan modul di `tutor.js` hanya memfilter `.eq('is_active', true)` tanpa memfilter `program_status != 'INACTIVE'`, atau sebaliknya.
3. **Ketiadaan Constraint/Trigger Postgres**: Di Supabase, belum ada mekanisme otomatis yang menjamin bahwa perubahan pada `program_status = 'INACTIVE'` selalu mematikan `is_active = false` secara atomik, dan sebaliknya.

### Decision
1. **Aturan Mutlak Visibilitas Siswa Inaktif (Strict Non-Visibility Invariant)**:
   - Siswa yang berstatus tidak aktif (`is_active = false` ATAU `program_status = 'INACTIVE'`) **DILARANG KERAS MUNCUL DI MANAPUN DI DALAM SISTEM** (Dashboard Standings / Leaderboard, Completed Tests, Student Login Gate, Class Lobby, Tutor Attendance, Class Hub Gradebook, dan KPI aktif), sampai siswa tersebut diaktifkan kembali oleh Admin.
2. **Sinkronisasi Database Penuh (Database Reconciliation & Migration `20261125010000`)**:
   - Seluruh record siswa inaktif disinkronkan langsung di Supabase (`is_active = false` dan `program_status = 'INACTIVE'`).
   - Dibuatkan PostgreSQL trigger `trg_sync_student_active_status` pada tabel `public.students` yang menyinkronkan status secara dwiarah (bidirectional):
     - `program_status IN ('INACTIVE', 'HOLD')` $\rightarrow$ `is_active = false`.
     - `is_active = false` (bukan ALUMNI) $\rightarrow$ `program_status = 'INACTIVE'`.
     - `is_active = true` $\rightarrow$ `program_status = 'ACTIVE'`.
     - `program_status IN ('ACTIVE', 'IN_PROGRESS')` $\rightarrow$ `is_active = true`.
3. **Multi-Layer Defensive Filtering di Seluruh Modul**:
   - `js/dashboard.js`: `loadBatchLeaderboard` memfilter `.eq('is_active', true).neq('program_status', 'INACTIVE')` serta validasi memori `s.is_active === true && s.program_status !== 'INACTIVE'`.
   - `js/api.js`: `fetchStudentsByProgram` mengecualikan siswa inaktif pada kueri dan filter memori. `verifyStudentLogin` dan `startTest` memblokir akses siswa inaktif.
   - `js/tutor.js`: `preloadStudentsAllLevels`, `loadStudentsForCecLevel`, dan `loadStudentsForTopProgram` memfilter `is_active = true` dan `program_status != 'INACTIVE'`.
   - `js/admin/`: Seluruh perhitungan rombel aktif, KPI, presensi, dan kelas di `app.js`, `classes-hub.js`, `admin-deck.js`, `curriculum-management.js`, dan `student-management.js` mengecualikan siswa inaktif.
   - `scripts/ingest_all_camps.mjs`: Diperbarui agar tidak pernah menimpa `is_active: true` pada siswa yang sudah berstatus inaktif.

### Consequences
- Zero ghost rows: Papan peringkat (leaderboard), dasbor, dan absensi batch 134 secara bersih hanya menampilkan 12 siswa aktif yang sedang belajar di Level 3.
- Integritas data terjamin di seluruh lapisan: database, API, admin, tutor, dan aplikasi siswa.

---

## DECISION-086: Unification of Legacy Color Variants into Authoritative 4-Color Palette (Hijau #00c000, Kuning #ffff00, Merah #ff0000, Ungu #a855f7)

### Status
ACCEPTED (Authoritative Color Palette Unification SSOT)

### Date
2026-11-25

### Context
Audit tipografi dan warna teks sistem mengidentifikasi 4.581 titik deklarasi warna font dengan berbagai varian legacy yang tidak seragam (6 varian hijau berbeda, 5 varian kuning berbeda, 6 varian merah berbeda, dan 5 varian ungu berbeda).
Pengguna menetapkan standardisasi mutlak untuk mengeliminasi varian-varian legacy tersebut dan mengunci 4 warna baku:
- Hijau: `#00c000` (Grade A / Success)
- Kuning: `#ffff00` (Grade C / Remedial)
- Merah: `#ff0000` (Grade E / Failed / Alert)
- Ungu: `#a855f7` (Grade Star / Alumni / Gimmick — Pilihan Opsi 2 Deep Purple)

### Decision
1. **Master Vault Token Locking (`css/style.css` & `js/grading.js`)**:
   - `--grade-star`: `#a855f7` (RGB: `168, 85, 247`, Glow: `rgba(168, 85, 247, 0.5)`).
   - `--grade-a`: `#00c000` (RGB: `0, 192, 0`).
   - `--grade-c`: `#ffff00` (RGB: `255, 255, 0`).
   - `--grade-e`: `#ff0000` (RGB: `255, 0, 0`).
   - `TOPSCORE_COLORS.STAR` / `LEGEND_GIMMICK` / `X` diupdate ke `#a855f7`.
2. **Pembersihan Varian Legacy Lintas Basis Kode**:
   - Varian Hijau legacy (`#15803d`, `#86efac`, `#4ade80`, `#22c55e`, `#10b981`, `#16a34a`) diganti menjadi `var(--grade-a, #00c000)`.
   - Varian Kuning legacy (`#eab308`, `#facc15`, `#f59e0b`, `#fef08a`, `#fef3c7`) diganti menjadi `var(--grade-c, #ffff00)`.
   - Varian Merah legacy (`#ef4444`, `#dc2626`, `#f87171`, `#b91c1c`, `#fca5a5`, `#fecaca`, `red`) diganti menjadi `var(--grade-e, #ff0000)`.
   - Varian Ungu legacy (`#c084fc`, `#8b5cf6`, `#a78bfa`) diganti menjadi `var(--grade-star, #a855f7)`.
3. **Penyelarasan Verifikasi Otomatis (`scripts/test_universal_color_token_ssot.mjs`)**:
   - Pillar 1 dan Pillar 6 diperbarui untuk memvalidasi deklarasi `--grade-star: #a855f7;`.
   - Seluruh 6 Pilar Color Tokenization tetap 100% HIJAU.

### Consequences
- Menghilangkan kesan "pelangi" dan saturasi warna acak pada antarmuka tabel dan workstation.
- Kontras visual menjadi tajam, terstandarisasi, dan konsisten di seluruh modul siswa, tutor, dan admin.

---

## DECISION-087: Single Product Accent Color SSOT (#38bdf8 / Tactical Cyan) with High-Contrast Dark Text

### Status
ACCEPTED (Single Product Accent Architecture SSOT)

### Date
2026-11-25

### Context
Audit warna aksen produk (brand highlight, tombol aksi CTA, tab navigasi, border fokus, dan status interaktif) menemukan 986 titik deklarasi dengan 9 varian biru/cyan/indigo yang terfragmentasi (`#6366f1`, `#3b82f6`, `#2563eb`, `#06b6d4`, `#0284c7`, `#0369a1`, `#0ea5e9`, `#7dd3fc`, `#e0f2fe`).
Pengguna memilih untuk merampingkan seluruh varian aksen produk menjadi **Murni 1 Warna Tunggal (Single Accent)**, yaitu **`#38bdf8`** (Tactical Cyan / Sky 400).

### Decision
1. **Single Authoritative Hex Token (`--primary-tactical: #38bdf8;`)**:
   - Seluruh token warna aksen utama diikat langsung ke `--primary-tactical`:
     - `--clr-primary: var(--primary-tactical);`
     - `--clr-accent-1: var(--primary-tactical);`
     - `--clr-accent-3: var(--primary-tactical);`
     - `--clr-info: var(--primary-tactical);`
   - Gradien primer dan glow disederhanakan berbasis `#38bdf8` murni tanpa kode hex ekstra.
   - Decoupled `--rainbow-step-6` (Nila pada 7 Repetisi Pips) ke `#4f46e5` independen.
2. **High-Contrast Dark Text pada Tombol Solid Primer (WCAG AAA 9.8:1)**:
   - Sesuai prinsip desain modern (ala Linear, Vercel, Supabase), tombol solid primer dengan background `#38bdf8` wajib menggunakan teks **gelap pekat (`color: #090d16 !important; font-weight: 700 !important;`)**, BUKAN teks putih `#ffffff`.
   - Menghilangkan glare/silau dan melompatkan rasio kontras dari 2.1:1 (FAIL) menjadi 9.8:1 (PASS AAA).
   - Efek interaktif tombol hover cukup menggunakan CSS native filter (`filter: brightness(0.92);`).
   - Tombol sekunder/outline menggunakan border & teks `#38bdf8`.
3. **Penyelarasan Seluruh Modul JS dan Stylesheet**:
   - `js/grading.js`: `btnPrimary: '#38bdf8'`, `btnPrimaryText: '#090d16'`.
   - `js/admin/`: Mengganti seluruh tombol solid `#0284c7` dengan background `#38bdf8` dan teks `#090d16` di `admin-deck.js`, `app.js`, `desk.js`, `exam-rules.js`, `modules.js`, `student-management.js`, `system-architecture.js`, `system-glossary.js`, `tests-access.js`, `tests-management.js`, `vocab-vault.js`.
   - Client modules (`dashboard.js`, `test.js`) dan stylesheet (`style.css`, `admin.css`, `dashboard.css`, `test.css`, `tutor.css`, `result.css`, `auth.css`) telah sepenuhnya disatukan ke `#38bdf8`.
4. **Verifikasi SSOT**:
   - `scripts/test_universal_color_token_ssot.mjs` Pillar 1 memvalidasi deklarasi `--primary-tactical: #38bdf8;` dan keterikatan `--clr-primary`, `--clr-accent-1`, `--clr-info`, serta `btnPrimary: '#38bdf8'`.

### Consequences
- Sistem kini 100% bebas dari fragmentasi warna aksen biru/indigo liar.
- Arsitektur warna menjadi ultra-clean dan konsisten dari halaman login, dasbor siswa, ruang tutor, hingga seluruh workstation admin.

---

## DECISION-088: Unified Duplicate Students Resolver, Cross-Batch Repeat Hierarchy & Zero-Box Inline Status SSOT

### Status
ACCEPTED (Duplicate Resolver, Cross-Batch Repeat & Visual Cleanliness SSOT)

### Date
2026-11-25

### Context
Saat siswa yang telah lulus atau pernah belajar di angkatan sebelumnya (misal: Batch 130) mendaftar kembali di angkatan yang lebih baru (misal: Batch 133), sistem mendeteksi adanya profil ganda (*cross-class duplicate*).
Sebelumnya:
1. Modal penyelesaian duplikat terpisah menjadi 2 tab navigasi terpisah (`Same Class Duplicates` vs `Cross-Class Same Name`) yang memakan waktu dan membingungkan admin.
2. Jendela modal terkunci di `max-width: 960px !important;` melalui kelas `.modal-box-lg`, menyebabkan tabel 8 kolom terpotong (*clipped*) dan memicu scrollbar horizontal di dalam kartu.
3. Rekomendasi target profil aktif salah memilih angkatan lama sebagai primary, bukan angkatan berjalan yang aktif saat ini.
4. Label status (`[CROSS-CLASS]`) dan suffix siswa berulang/alumni menggunakan kotak border kapsul (pill) yang melanggar estetika kesederhanaan teks (*Zero-Box Invariant*).
5. Terdapat deklarasi font sub-12px (10px dan 11px) pada pratinjau hasil penggabungan dan label status.
6. Terjadi bentrok kueri PostgREST (`more than one relationship was found for 'students' and 'batches'`) akibat penambahan kolom `original_batch_id` pada tabel `students`.

### Decision
1. **Penyatuan Modal Duplikat (Single Unified Workspace)**:
   - Menghapus tab pemisah; seluruh duplikat (Same Class & Cross-Class) disatukan dalam satu tampilan ringkas dengan bilah status informatif di bagian atas.
   - Tombol `QUICK MERGE ALL GROUPS` diposisikan secara konsisten di pojok kanan bawah (*modal footer CTA area*) mengikuti aturan spasial Ujung-ke-Ujung.
2. **Pelebaran Modal ke 1380px & Eliminasi Scrollbar Horizontal**:
   - Menetapkan `max-width: 1380px !important; width: 96vw !important;` di `css/admin/admin-modals.css`, `css/admin.css`, dan `admin.html`.
   - Menghapus wrapper `overflow-x: auto`; kedelapan kolom tabel (`RECORD UUID`, `PROGRAM / LEVEL`, `BATCH`, `INSTITUTION`, `ATTEMPTS`, `CREATED AT`, `ACTION`, dan `RESULT PREVIEW`) tampil utuh tanpa terpotong (*Universal Zero-Truncation*).
3. **Hirarki Siswa Mengulang (Cross-Batch Repeat Hierarchy)**:
   - Siswa yang mendaftar ulang di angkatan baru diposisikan sebagai **Profil Aktif Utama (Primary Target / Batch Baru)**.
   - Angkatan asal siswa dicatat di kolom `original_batch_id` dengan flag `is_repeat = true`.
   - Seluruh riwayat ujian/tugas (attempts) dan data progres dari angkatan lama dipindahkan secara atomik ke profil aktif di angkatan baru, lalu profil lama di-*soft-delete*.
4. **Tipografi Bersih Tanpa Kotak (Strict Zero-Box & Zero Sub-12px)**:
   - Menghapus seluruh border, background box, dan pill pada tag status.
   - Suffix siswa mengulang berformat teks tebal: `Nama Siswa (Repeat - <Batch Awal>)` dengan warna Oranye (`#FF8C00` / `var(--quad-b)`).
   - Suffix alumni berformat teks tebal: `Nama Siswa (Alumni - <Batch>)` dengan warna Ungu (`#c084fc` / `var(--grade-star)`).
   - Tag jenis duplikat: `(Same Class)` (cyan) dan `(Cross-Class)` (oranye).
   - Seluruh teks label dan rincian berukuran minimum 12px baku.
5. **Standarisasi Tombol CTA (Ghost-to-Solid)**:
   - Tombol `QUICK MERGE ALL GROUPS` dan `Resolve All Duplicates` mengikuti pola Ghost Outline transparan pada mode standby dan Solid Matte Yellow pada mode hover, dengan font 14px / 13px.
6. **Disambiguasi Kueri PostgREST**:
   - Seluruh kueri join `students` ke `batches` mendisambiguasi relasi secara eksplisit: `batches!batch_id(...)` dan `original_batches:batches!original_batch_id(...)`.

### Consequences
- Peninjauan dan penggabungan siswa duplikat berjalan cepat, intuitif, dan bebas error relasi database.
- Riwayat belajar siswa mengulang terjaga 100% tanpa ada attempt yang hilang.
- Tampilan antarmuka rapi, lega, bersih tanpa kotak-kotak mengganggu, dan 100% patuh pada aturan SSOT.

---

## DECISION-088: Comprehensive Codebase Sweep & Total Eradication of Rogue Color Variants (Zero Legacy Leakage SSOT)

### Status
ACCEPTED (Zero Legacy Color Leakage SSOT)

### Date
2026-11-25

### Context
Menindaklanjuti DECISION-086 (Unifikasi 4 Warna Akademik) dan DECISION-087 (Single Product Accent #38bdf8), audit mendalam mendeteksi 573 titik deklarasi hex legacy yang masih tertinggal di modul-modul CSS, JS, dan HTML (termasuk 119 titik ungu muda `#c084fc`, 80 titik `#0284c7`, 30 titik `#15803d`, 27 titik `#86efac`, 27 titik `#ea580c`, 25 titik `#16a34a`, 18 titik `#dc2626`, 14 titik `#ef4444`, 12 titik `#facc15`, 10 titik `#fef08a`).
Pengguna memerintahkan penyisiran total ("Rapikan!") untuk membersihkan seluruh sisa warna legacy tersebut agar sistem 100% patuh pada SSOT token resmi.

### Decision
1. **Universal Canonical Replacement Rules**:
   - **Ungu Legacy** (`#c084fc`, `#8b5cf6`, `#a78bfa`) $\rightarrow$ `var(--grade-star, #a855f7)`
   - **Hijau Legacy** (`#15803d`, `#86efac`, `#4ade80`, `#22c55e`, `#16a34a`, `#10b981`) $\rightarrow$ `var(--grade-a, #00c000)`
   - **Kuning Legacy** (`#eab308`, `#facc15`, `#f59e0b`, `#fef08a`, `#fef3c7`) $\rightarrow$ `var(--grade-c, #ffff00)`
   - **Merah Legacy** (`#ef4444`, `#dc2626`, `#f87171`, `#b91c1c`, `#fca5a5`, `#fecaca`) $\rightarrow$ `var(--grade-e, #ff0000)`
   - **Oranye Legacy** (`#ea580c`, `#c2410c`, `#fdba74`, `#fb923c`, `#f97316`) $\rightarrow$ `var(--grade-d, #ff8c00)`
   - **Aksen Biru/Cyan Legacy** (`#0284c7`, `#0369a1`, `#6366f1`, `#3b82f6`, `#2563eb`, `#06b6d4`, `#0ea5e9`, `#7dd3fc`, `#e0f2fe`, `#00e5ff`) $\rightarrow$ `var(--primary-tactical, #38bdf8)`
   - **Merah Muda Legacy** (`#f472b6`, `#ec4899`) $\rightarrow$ `var(--quad-a, #ff2d87)`
2. **Cakupan Eksekusi Menyeluruh (573 replacements across 44 files)**:
   - Seluruh modul stylesheet: `css/admin.css`, `admin-tables.css`, `admin-views.css`, `admin-layout.css`, `admin-modals.css`, `admin-theme.css`, `tutor.css`, `dashboard.css`, `test.css`, `result.css`, `conversation.css`, `style.css`.
   - Seluruh modul workstation admin: `student-management.js` (36x), `tests-access.js` (20x), `tests-management.js` (13x), `system-glossary-data.js` (11x), `admin-deck.js` (8x), `system-architecture.js` (8x), `app.js` (7x), `class-attendance.js` (7x), `crud-modals.js` (6x), `auto-gen-modal.js` (5x), `desk.js` (5x), `system-glossary.js` (5x), `table-designs.js` (4x), `vocab-vault.js` (3x), `classes-hub.js` (2x), `curriculum-management.js` (2x), `exam-rules.js` (2x), `quick-score-wizards.js` (2x), `classes-management.js` (1x), `exam-rules-engine.js` (1x), `modules.js` (1x), `student-registration.js` (1x).
   - Seluruh modul client & engine: `test.js` (13x), `result.js` (10x), `tutor.js` (7x), `grading.js` (7x), `avatar-engine.js` (2x), `dashboard.js` (1x).
   - Template HTML: `tutor.html` (4x), `admin.html` (4x), `offline.html` (2x), `result.html` (1x).
3. **Pilar 5 Untokenized Hex Compliance**:
   - Seluruh penggantian di file JavaScript dibungkus dengan token fallback `var(--..., #...)` sehingga tidak melanggar aturan larangan *untokenized raw hexes*.
4. **Verifikasi Zero Rogue Hexes**:
   - Audit pasca-eksekusi memvalidasi: **TOTAL REMAINING ROGUE HEXES = 0**.

### Consequences
- Tidak ada lagi perbedaan saturasi atau kontras di halaman mana pun di dalam sistem.
- Arsitektur token warna mencapai tingkat kepatuhan 100% Single Source of Truth (*Zero Legacy Leakage*).

