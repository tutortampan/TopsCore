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



