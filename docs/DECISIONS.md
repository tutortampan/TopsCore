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
Status: ACCEPTED

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
Agents are authorized and instructed to execute `powershell` commands proactively for diagnostics, verification, health checks, and build tasks across the workspace without requesting confirmation for standard non-destructive operations. Recorded in `.agents/rules/powershell.md`.

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


## DECISION-002 - Level-Centric Auto-Assignment

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

## DECISION-012 — Harmonious Tier Color Palette & Sparkling Gold Grade S Atmosphere

Date: 2026-10-18
Status: ACCEPTED

### Context
In previous releases, Grade S (100%) and Grade C (51-70%) shared ambiguous amber/gold color tones (`#f59e0b` / `#d97706`), causing visual collision and diminishing the prestige of achieving a perfect 100% score. Additionally, student scores (%) and total points (PTS) were rendered in generic colors that did not convey the student's earned achievement tier.

### Decision
1. Adopt **Option 1 Harmonious Tier Palette**:
   - **S (100%)**: Gold Champion (`#fbbf24`, shimmer `#fef08a`, glow `rgba(245, 158, 11, 0.65)`)
   - **A (91–99%)**: Emerald Master (`#10b981`, glow `rgba(16, 185, 129, 0.45)`)
   - **B (71–90%)**: Sky Diamond (`#06b6d4`, glow `rgba(6, 182, 212, 0.45)`)
   - **C (51–70%)**: Warm Topaz (`#eab308`, glow `rgba(234, 179, 8, 0.35)`) — separated from S
   - **D (31–50%)**: Flame Orange (`#f97316`, glow `rgba(249, 115, 22, 0.35)`)
   - **E (11–30%)**: Rose Coral (`#f43f5e`, glow `rgba(244, 63, 94, 0.35)`)
   - **F (0–10%)**: Crimson Alert (`#ef4444`, glow `rgba(239, 68, 68, 0.35)`)
2. Synchronize Score (%) and Total Points (PTS) text and badge styling across the entire system (Admin Roster, Student Dashboard, and Result Page) with the student's tier color.
3. Deliver a dynamic "Tier Badge Atmosphere" on Student Dashboard (`dashboard.html`) and Result Page (`result.html`) with ambient radial aura and glowing borders matching the tier.
4. For Grade S (100%), implement prestige sparkling gold animations (`@keyframes gold-badge-sparkle` & `@keyframes gold-text-gleam`) featuring pulsing gold gradients and radiant multi-layered drop shadows.

### Consequences
- Centralized `GRADE_PALETTE`, `getGradeColor`, and `getGradeTheme` in `js/grading.js` and `js/api.js`.
- Distinct, prestigious visual atmosphere where achieving Grade S feels like earning a champion's trophy badge.
- Zero color collisions between S and C.

---

## DECISION-013 — Student Dashboard Avatar Scaling, Royal Title Mechanics, Glow Hierarchy, and Dual-Tab Dock Standings

Date: 2026-10-18
Status: ACCEPTED

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
Status: ACCEPTED

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
Status: ACCEPTED

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
3. User explicitly mandated that the evaluation card must contain ONLY the exact single word without icons or extra phrases: `E=FAIL / D=LESS / C=ENOUGH / B=GOOD / A=VERY GOOD / STAR=EXCELLENT / R=REMEDIAL`.
4. User evaluated a secondary proposal of percentage-based heights (15%-35%-15%-15%-10%-10%) and formally approved retaining the fixed ergonomic + dynamic metrics scoreboard model ("baik, biarkan saja").
5. Container borders and radial backgrounds across all cards dynamically radiate the student's Grade tier color.

### Decision
1. **Fixed Ergonomic Card Heights**: Standardize Title (50px), Score/Grade (50px), Evaluation Word (50px), Next Action / Remedial segmented buttons (50px), Back button (30px), and Breakdown button (30px).
2. **Exact Word Evaluation**: `#result-motivation-msg` (`.result-evaluation-card`) renders text-only single words (`FAIL`, `LESS`, `ENOUGH`, `GOOD`, `VERY GOOD`, `EXCELLENT`, `REMEDIAL`) with glowing uppercase typography.
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
   - Grade E / F (0–19%): `FAIL`
   - Grade D (20–39%): `LESS`
   - Grade C (40–59%): `ENOUGH`
   - Grade B (60–79%): `GOOD`
   - Grade A (80–99%): `VERY GOOD`
   - Grade S / STAR (100%): `EXCELLENT`
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
Status: SUPERSEDED by DECISION-028 regarding Star tier color (Ungu/Purple -> Green #22C55E); otherwise ACCEPTED (SUPERSEDES DECISION-016 tier color mappings & prior score thresholds)

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
Status: SUPERSEDED by DECISION-028 regarding Star tier color (#A855F7 -> #22C55E); otherwise ACCEPTED (SUPERSEDES DECISION-019 regarding the letter representation of the 100% Star tier)

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
   - `Quiz` (pl: `Quizzes`): Daily tasks, formative checks, phrase runner drills, quick-feedback items.
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
Status: ACCEPTED

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
Status: ACCEPTED

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

## DECISION-024 — Points-First Leaderboard Hierarchy, Milestone Progression 0% Penalty & Admin Table Ergonomics

Date: 2026-10-28
Status: ACCEPTED (Partially supersedes DECISION-023 Tier 1 sorting)

### Context
1. **The Ranking Paradox**: Students with fewer exam points were ranking above students with vastly higher exam performance (e.g. Mr. Suke Ajai with 18 tasks / 143 pts was ranked above Miss Sofa Maria Ulfa with 17 tasks / 273.5 pts) because `PROG %` was previously evaluated as the primary sort key.
2. **The Early-Stop Score Inflation**: A student who completed only Theme A (e.g. Mr. Pasya / Miss Risma with 90 pts out of 150) received 60% (Grade C) and stopped there, while students who advanced to harder subsequent themes (Theme B: 350 questions, Theme C: 600 questions) took risks on large question banks, resulting in lower scores or failing grades.
3. **Admin Table Display Ergonomics**:
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
2. **Sequential Milestone Progression & Next Exam 0% Penalty**:
   - Implemented authoritative `computeMilestoneExamMastery(examEntries, allClassExams)` in `js/grading.js`:
     * Once a student successfully passes Milestone Theme $N$ ($\ge 60\%$), Milestone Theme $N+1$ is immediately queued into the active denominator with 0 earned points (even if ineligible or unattempted).
     * This dynamically reduces the global score and grade for students who attempt to pause their learning after early milestones, maintaining fairness against students tackling subsequent exams.
3. **Admin Table Ergonomics**:
   - **Clean Student Names**: Stripped `Mr.` and `Miss` honorifics from `displayName` in Admin Class Hub table using `cleanStudentName()` to maximize horizontal space. Student Dashboard retains honorifics in student-facing lobby views.
   - **Quiz Percentage Display**: Daily quiz matrix cells and class average summary cells display **Score (%)** (e.g. `100%`, `98%`, `70%`) with canonical grade color and remedial indicators, preserving points exclusively for Milestone Exams.

### Consequences
- Eliminates the Suke Ajai ranking inversion: Miss Sofa Maria Ulfa (273.5 pts) is immediately ranked well above Mr. Suke Ajai (143 pts).
- Pasya and students stopping after Theme A have Theme B queued at 0% ($90 / 500 = 18\%$, Grade E), accurately reflecting unfinished milestones.
- 100% parity between Tutor's Room and Student's Lobby leaderboard sorting.
- Clean, uncluttered student names and percentage-only daily quizzes in Admin Class Hub.

---

## DECISION-025 — Automatic Background Auto-Close of Expired Attempts & Active Queued Milestone 0% Matrix Visualization

Date: 2026-10-28
Status: ACCEPTED

### Context
1. **Disconnected / Battery Dead In-Progress Attempts**: When a student's device dies, crashes, or loses power mid-exam (e.g., Ari Wahyu Darma on Test 29), the browser client timer ceases to exist, preventing the client from firing the final `submit-test` API request. This left the attempt record stalled indefinitely in `in_progress` status with an hourglass `⏳` icon in the Class Hub matrix, even long after its `expires_at` deadline had passed.
2. **Matrix Visibility of Queued Active Milestone Exams**: While the global score calculation correctly penalized students who completed Theme $N$ by adding Theme $N+1$ to the denominator at 0 earned points, the individual exam columns in the table matrix rendered gray unattempted dots (`·`). This confused tutors because it wasn't visually obvious which specific exams were actively counting as `0%` and pulling down the student's score.

### Decision
1. **Automated Background Sweep for Expired Attempts**:
   - Integrated `sb.rpc('auto_close_expired_attempts')` into the primary data access lifecycle (`loadClassDetails` / `renderClassHub` in `js/admin/app.js`, `adminFetchAll('attempts')`, and `fetchAllStudentAttempts(studentId)` in `js/api.js`).
   - Every time the Admin Class Hub loads or student data is queried, any expired `in_progress` attempts are automatically finalized and evaluated by `emergency_submit_attempt`, assigning full partial credit for all saved answers.
   - Added an explicit client-side expiry check in `js/admin/app.js`: any attempt with `att.expires_at < new Date()` is never displayed with the `⏳` hourglass icon.
2. **Queued Milestone Matrix Visualization (Red 0% & 0 Pts)**:
   - Enhanced `computeMilestoneExamMastery()` in `js/grading.js` to return `includedThemeCodes` and `includedExamIds`.
   - In `renderAttendanceGridMatrix()` in `js/admin/app.js`:
     * For any unattempted exam belonging to an active or queued theme (`isQueued = row.includedExamIds.has(asm.id)`), the cell displays a distinct red `0%` (Score column) and red `0` (Points column).
     * The theme total points column for that theme displays `0` pts rather than `-1` (unreached dot).
     * Any unreached future themes (beyond the active queued milestone) remain clean gray dots (`·`).

### Consequences
- Ari Wahyu Darma's attempt (138/200, 69%, Grade C) is immediately graded and displayed as 138 pts, elevating him to Rank #2 (470 pts) with zero `⏳` icons.
- If any future student's battery dies or disconnection occurs, their attempt is automatically finalized upon the tutor opening the class.
- Tutors can immediately distinguish between:
  1. Completed exams (color-coded percentage & points).
  2. Active/queued milestone exams that the student must take (red `0%` and `0` pts).
  3. Unreached future themes (gray `·`).

---

## DECISION-026 — Strict Sequential Intra-Theme Exam Prerequisites (Words Exam Pass ≥60% Required for Phrases Exam)

Date: 2026-10-28
Status: ACCEPTED

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

## DECISION-028 — Official Grading Scale Color Update: Star Tier (★ / 100%) Transition from Purple (#A855F7) to Green (#22C55E)

Date: 2026-10-29
Status: ACCEPTED (SUPERSEDES DECISION-019 and DECISION-020 regarding the color of the Star tier ★ / 100%)

### Context
User requirement: *"saya melihat ada aturan inti soal Grading Scale, masih ada warna UNGU,,, itu sudah diganti dengan HIJAU perbaiki"*.
In the core TopsCore specifications (`AGENTS.md` §2.10, `ANTIGRAVITY_GUIDE.md`, `PRODUCT_SPEC.md`, `DATABASE.md`), the 100% Star tier (`★`) was previously documented with Purple (`#A855F7`). The user affirmed that the Star tier color has officially transitioned to Green (Hijau / `#22C55E`).

### Decision
1. Update `AGENTS.md` (Section 2.10 Official Grading Scale) table to specify:
   `| ★ | Excellent | 100% | Hijau (Rich Green) | #22C55E |`
2. Update `ANTIGRAVITY_GUIDE.md` to reflect `★ (100% - Hijau #22C55E)`.
3. Update `docs/PRODUCT_SPEC.md` and `docs/DATABASE.md` to establish `#22C55E` as the authoritative color token for 100% / Star tier.
4. Align all client styling, badges, SVG star vector gradients, drop-shadows, and fallback colors across:
   - `css/style.css`, `css/result.css`, `css/dashboard.css`
   - `js/grading.js`, `js/dashboard.js`, `js/result.js`
   - `js/admin/class.js`, `js/admin/student-management.js`, `js/admin/tests-management.js`
5. All Star tier / 100% / Grade S references strictly use Green (`#22C55E` / `rgba(34, 197, 94, ...)`) with vibrant green glows and gradients (`#86efac` -> `#22c55e` -> `#16a34a`).

### Consequences
- Absolute alignment between user specification, execution contract (`AGENTS.md`), developer guides, stylesheets, and JavaScript logic.
- Preserves clean 6-tier grading scale (★, A, B, C, D, E) without introducing non-standard grades.
- 100% passing test suites across all validation scripts.

---

## DECISION-029 — Unified Vocab Scoring Engine (Single Model Across All Levels): Latest Active Theme Score & Grade with Cumulative Exam Points

Date: 2026-10-30
Status: ACCEPTED (SUPERSEDES DECISION-024 regarding future milestone 0% penalty on global score)

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
3. **Cumulative Global Points**:
   - The left `PTS` column in Class Hub, Student Roster, and Student Dashboard displays the cumulative total points earned across ALL completed exams (e.g. Sofa = 273.5 pts, Suke = 143 pts, Pasya = 90 pts).
4. **0-Exam Handling (Quiz-Only Students)**:
   - Students who completed only quizzes and 0 exams (e.g. Rifky Ahmad) display neutral `—` for Global Score, Grade, and PTS, preventing false quiz score inflation or unfair 0% E penalization.
   - Pacing is reflected cleanly in `TESTS` (e.g. `2/40`) and `PROG %` (`5%`).
5. **Exact System-Wide Parity**:
   - Class Hub (`admin.html#class-hub`), Student Roster (`admin.html#students`), and Student Dashboard (`dashboard.html`) all use `computeMilestoneExamMastery()` with identical data queries (fetching full test metadata `test_type`, `shell_code`, `payload`, etc.).
6. **Strict Unified Color Vault**:
   - Master colors in `js/grading.js` (`TOPSCORE_COLORS`): ★ `#00c000ff` with white star, A `#00c000ff`, B `#95ff00ff`, C `#FFFF00`, D `#FF8C00`, E `#FF0000` (superseded by DECISION-030).

### Consequences
- Prevents artificial grade deflation while maintaining academic rigor.
- Fully aligns Class Hub, Student Roster, and Student Dashboard.

---

## DECISION-030 — User-Defined Official Color Palette: Star & Grade A (#00c000ff) and Grade B (#95ff00ff)

Date: 2026-10-30
Status: ACCEPTED (SUPERSEDES DECISION-028 regarding base hex values for Star, A, and B)

### Context
User requirement: *"2. palet warna saya yang rubah,,, saya pakai yang STAR dan A #00c000ff dan B #95ff00ff."*

The user explicitly defined the primary color hex codes for the highest achievement tiers:
- **Star Tier (★ / 100%)**: `#00c000ff` (Pure Rich Green with Alpha)
- **Grade A (90% – 99%)**: `#00c000ff` (Pure Rich Green with Alpha, identical base to Star)
- **Grade B (80% – 89%)**: `#95ff00ff` (Vibrant Electric Lime with Alpha)
- **Grade C (60% – 79%)**: `#FFFF00` (Pure Yellow)
- **Grade D (30% – 59%)**: `#FF8C00` (Dark Orange)
- **Grade E (0% – 29%)**: `#FF0000` (Pure Red)

### Decision
1. Update `TOPSCORE_COLORS` and `GRADE_PALETTE` in `js/grading.js`:
   - `STAR: '#00c000ff'`, `A: '#00c000ff'`, `CORRECT: '#00c000ff'`.
   - `B: '#95ff00ff'`.
   - RGB equivalents: `STAR_RGB = '0, 192, 0'`, `A_RGB = '0, 192, 0'`, `B_RGB = '149, 255, 0'`.
2. Update CSS variables in `css/style.css`:
   - `--grade-star: #00c000ff;` (RGB: `0, 192, 0`)
   - `--grade-a: #00c000ff;` (RGB: `0, 192, 0`)
   - `--grade-b: #95ff00ff;` (RGB: `149, 255, 0`)
   - `--eval-correct: #00c000ff;`
3. Update `AGENTS.md` Section 2.10 table and `scripts/verify_green_star_grading.mjs` test assertions.

### Consequences
- Absolute adherence to the product owner's explicit aesthetic decision per AGENTS.md §0 (Execution Authority Level 1: Direct User Requirements).
- 100% PASS on all automated color vault verification tests.

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





