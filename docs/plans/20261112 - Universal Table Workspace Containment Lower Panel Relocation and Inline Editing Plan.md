# Universal Table Workspace Containment, Lower Panel Relocation & Inline Editing Plan

> **Plan File:** `docs/plans/20261112 - Universal Table Workspace Containment Lower Panel Relocation and Inline Editing Plan.md`  
> **Session/Date:** 2026-11-12  
> **Authority Level:** Authoritative Architecture & UI Standardization Plan (`AGENTS.md`, `.antigravityrules`, `.agents/rules/ui-invariants.md`)  

---

## 1. Goal Description

### Context & Problem Analysis
1. **Header & Footer Column Misalignment Root Cause**:
   - Detached HTML elements or flexbox containers cause column width drift when resizing or auto-fitting.
   - Authoritative standard: Header (`<thead>`), body (`<tbody>`), and footer summary (`<tfoot>`) must remain inside a single native `<table>` (`display: table`).
2. **Toolbar Relocation to 50px Lower Panel ("Gambar 3 ke Posisi Gambar 2")**:
   - The top action buttons (`🚀 NEXT`, `➕ Add Student`, `📥 Import Excel/CSV`) are relocated down into the **50px Lower Panel (`.workspace-lower-panel`)** docked flush (0px margin) against the bottom banner and side panel.
   - The Table Footer summary (`★ BATCH AVG`) remains strictly inside the workspace table container (`tfoot`) and does NOT enter the lower panel.
   - A strict **10px gap** separates the table container from the lower panel.
3. **Student Roster Column Ordering & Actions Removal**:
   - The `Actions` column is completely **REMOVED** from the Active Students roster.
   - Student Profile / Dossier modal is opened by clicking the student's **Photo** or **Name** across all views.
   - Deletion is restricted to the **Inactive Students** tab to prevent accidental data loss.
   - New Column Order:
     1. `LEVEL` (`levelName`)
     2. `PHOTO` (`photo_url`, 32px circular avatar, clickable)
     3. `GENDER` (`gender`, displayed as `Mr.` for male, `Miss.` for female, inline select in Edit Mode)
     4. `NAME` (`sortName`, student display name, clickable in view mode, inline input in Edit Mode)
     5. `DOB` (`birth_date`, formatted date, inline date input in Edit Mode, placed before Age)
     6. `AGE` (`ageDisplay`, calculated age)
     7. `EDUCATION` (`education`, last education, inline input in Edit Mode)
     8. `DYNAMIC CLASS EXAMS` (4 exams per active class)
     9. `STATUS` (`program_status`, placed at the very end, inline select in Edit Mode)
4. **Master Edit Mode Excel White Gridlines & Capsule Purge**:
   - When Master Edit Mode is active (`EDIT: ON`):
     - All column gridlines (`th`, `td`) across ALL tables turn **WHITE** (`border-right: 1px solid rgba(255, 255, 255, 0.45)`, `border-bottom: 1px solid rgba(255, 255, 255, 0.45)`).
     - Cell inputs have **NO BORDER**, **NO BORDER-RADIUS**, and **TRANSPARENT BACKGROUND** (`border: none !important; border-radius: 0 !important; background: transparent !important; outline: none !important;`).
     - No capsule/box is created inside the cell; the cell's Excel gridline itself defines the boundary.
     - Edits to Name, Gender, DOB, Education, Status, and Exam scores sync immediately to Supabase and cache.

---

## 2. Visual Architecture & Layout Contract

```
+------------------------------------------------------------------------------------------------------------------+
|  TOPBAR (Title, Profile, EDIT: ON/OFF toggle)                                                                    |
+------------------------------------------------------------------------------------------------------------------+
|  SUB-TABS BAR ([🟢 Active Students 18]  [⚪ Inactive 0]  [🎓 Alumni 0]  [👥 All 18])                             |
+------------------------------------------------------------------------------------------------------------------+
|                                                                                                                  |
|  === 10px Container Gap ===                                                                                      |
|                                                                                                                  |
|  +------------------------------------------------------------------------------------------------------------+  |
|  |  WORKSPACE TABLE CONTAINER (#student-grid-container / .table-wrap)                                         |  |
|  |                                                                                                            |  |
|  |  THEAD: Sticky Headers (LEVEL | PHOTO | GENDER | NAME | DOB | AGE | EDU | EXAM 1-4 | STATUS)                 |  |
|  |  TBODY: Excel White Gridlines in Edit Mode (Direct cell editing, no inner capsule box)                     |  |
|  |  TFOOT: Table Footer Summary Row (★ BATCH AVERAGE - 100% aligned with columns)                             |  |
|  |                                                                                                            |  |
|  +------------------------------------------------------------------------------------------------------------+  |
|                                                                                                                  |
|  === 10px Container Gap ===                                                                                      |
|                                                                                                                  |
|  +------------------------------------------------------------------------------------------------------------+  |
|  |  LOWER PANEL (.workspace-lower-panel, height: 50px locked)                                                 |  |
|  |  [🚀 NEXT (Promote)]  [➕ Add Student]  [📥 Import Excel/CSV]  |  [Search / Batch Metadata]                 |  |
|  |  (Flush docked 0px margin to bottom banner and side panel. NO TFOOT INSIDE!)                                |  |
|  +------------------------------------------------------------------------------------------------------------+  |
|  ==============================================================================================================  |
|  BOTTOM 60PX BANNER (#bottom-ad-banner / TopScore by Mr. Top)                                                    |
+------------------------------------------------------------------------------------------------------------------+
```

---

## 3. Implementation Details

### Component 1: Student Roster Reordering & Actions Removal (`js/admin/student-management.js`)
- Remove `.student-roster-toolbar` from top of table; mount it into `.workspace-lower-panel`.
- Reorder columns:
  - `LEVEL`: 60px, center.
  - `PHOTO`: 48px, center, circular 30px avatar, clickable with cursor pointer to open profile modal.
  - `GENDER`: 65px, center. In view mode: `Mr.` (cyan) / `Miss.` (pink). In edit mode: `<select>` with Mr. / Miss.
  - `NAME`: flex (min-width 180px), left. In view mode: text, clickable to open profile modal. In edit mode: `<input type="text">` without borders.
  - `DOB`: 95px, center. In view mode: formatted date. In edit mode: `<input type="date">`.
  - `AGE`: 65px, center. Displays calculated age.
  - `EDUCATION`: 110px, left. In view mode: text. In edit mode: `<input type="text">`.
  - `DYNAMIC CLASS EXAMS`: 4 exams per active class. In view mode: PTS/Grade. In edit mode: `<input type="number">`.
  - `STATUS`: 95px, center, at the very end. In view mode: `In Progress` / `Graduated` / `Inactive`. In edit mode: `<select>`.
- Remove `Actions` column entirely from active students table.
- In `buildSuperHeaders()`:
  - `fixed_before = 7` (Level, Photo, Gender, Name, DOB, Age, Education)
  - dynamic class spans
  - `fixed_after = 1` (Status)
- In `summaryRow()`:
  - Match column keys: Level -> `BATCH AVG`, Photo -> empty `<td></td>`, Gender -> `${mCount} M · ${fCount} F`, Name -> `★ BATCH AVERAGE`, DOB -> empty `<td>—</td>`, Age -> avg age, Education -> `<td>—</td>`, Exams -> avg pts, Status -> `<td>—</td>`.
- Add click handlers on Photo and Name cells to trigger `showStudentProfileModal(row.id)`.

### Component 2: Master Edit Mode Excel Gridlines & Capsule Purge (`css/admin.css` & `js/admin/app.js`)
- In `css/admin.css`:
  - When `body.global-edit-mode-on`:
    - Table cell and header gridlines (`th`, `td`) turn crisp WHITE:
      `border-right: 1px solid rgba(255, 255, 255, 0.45) !important; border-bottom: 1px solid rgba(255, 255, 255, 0.45) !important;`
    - All table inputs (`input`, `select`) have:
      `background: transparent !important; border: none !important; outline: none !important; border-radius: 0 !important; box-shadow: none !important; width: 100% !important; height: 100% !important;`
    - Remove `outline: 1px solid ...` on `td.editable-cell`.
    - When cell is active (`td:focus-within`): subtle highlight `background: rgba(255, 255, 255, 0.08) !important;`.
- In `js/admin/app.js`:
  - In lines 2700, 2753, 2831: Remove hardcoded `background:#0b1120; border:1px solid #38bdf8; border-radius:3px;` so matrix inputs also blend seamlessly into the Excel gridlines.

### Component 3: Workspace Containment & Lower Panel Docking
- `#student-grid-container` has `margin-bottom: 10px !important; flex: 1 1 0; min-height: 0;`.
- `.workspace-lower-panel` has `height: 50px !important; margin: 0 !important;` flush against the bottom banner (0px gap).
- Table footer summary `★ BATCH AVG` stays inside table `<tfoot>`.

### Component 4: Rules Codification
- Update `.antigravityrules` and `.agents/rules/ui-invariants.md` to codify:
  - Table Workspace Containment & Lower Panel Separation Invariant.
  - Excel Gridlines Edit Mode (White gridlines on `td`/`th`, borderless inputs, zero inner capsule boxes).
  - Profile Click on Photo/Name, Inactive tab deletion exclusivity.

---

## 4. Verification Plan
1. UI Spatial Invariant Checker: `node .agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs` (100% PASS).
2. JavaScript Syntax Check: `node scripts/check_all_js_syntax.cjs` (44/44 PASS).
3. Student Dashboard Exam Parity: `node scripts/test_student_dashboard_exam_parity.mjs` (100% PASS).
4. Playwright Visual Verification: Capture screenshots showing white gridlines, column reordering, lower panel toolbar, and profile click.
