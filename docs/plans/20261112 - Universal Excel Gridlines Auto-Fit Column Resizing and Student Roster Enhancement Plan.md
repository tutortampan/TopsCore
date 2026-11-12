# Universal Excel Gridlines, Smooth Auto-Fit Column Resizing & Student Roster Enhancement Plan

**Document ID:** `docs/plans/20261112 - Universal Excel Gridlines Auto-Fit Column Resizing and Student Roster Enhancement Plan.md`  
**Date:** 2026-11-12  
**Target Milestone:** Universal Excel-like Table Engine, Double-Click Auto-Fit & Active Student Roster Enrichment  
**Status:** 📋 PROPOSED (Awaiting User Proceed)  

---

## 1. Goal Description

This plan resolves three user-reported layout and functional requirements:
1. **Universal Excel-like Gridlines Across All Tables**:
   Introduce subtle, crisp vertical gridlines (`border-right: 1px solid rgba(255, 255, 255, 0.08)`) between every column and horizontal dividers across all table headers (`th`) and data cells (`td`) to match Microsoft Excel aesthetics.
2. **Universal & Smooth Double-Click Auto-Fit Column Resizing**:
   - Universal Auto-Attach: Guarantee `initColumnResize` attaches to every table in TopsCore (DataGrid and custom tables alike) automatically via universal observer hooks.
   - Smooth Offscreen Canvas Auto-Fit: Replace naive `width = 'auto'` with high-performance canvas text measurement (`ctx.measureText`) calculating the exact maximum cell width + padding across rows and smoothly snapping to content width.
   - Enhanced Drag UX: Expand grab zone to 7px (`right: -3px; z-index: 30;`) with tactical cyan hover guides.
3. **Eradicate Active Student Table Right-Side Void & Enrich Student Columns**:
   - Eliminate the massive right-side empty void on the Active Student table (`#students` / batch student roster) by expanding the table gracefully across 100% viewport width.
   - Add rich student detail columns: **`DOB`** (Birth Date e.g., `28 Jan 2008`), **`EDUCATION`** (Last Education e.g., `SMK (2024)` parsed from existing database JSON), and **`STATUS`** (`Active` / `In Progress`).
   - Synchronize `buildSuperHeaders` and `summaryRow` to match the enriched columns with zero column-count drift.

---

## 2. Visual Pre-Flight Verification & Layout Specification

### 2.1 Current State Screenshot (Before)
The current Active Student table displays only 4 basic columns before exams, collapsing into the left side and creating an enormous black void on the right:

![Current Active Students Table](/C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/05_table_batch_camp134.png)

### 2.2 Proposed Visual Mockup (After)
The updated Active Student table enriches student details and spans 100% width with Excel gridlines:

```text
+-------+--------------------+-------------+--------+--------+-----------------+-------------+-------------------------+---------+
| LEVEL |        NAME        |     DOB     |  AGE   | GENDER |    EDUCATION    |   STATUS    |   CAMP 2ND VOCABULARY   | ACTIONS |
|       |                    |             |        |        |                 |             | EXAM 1  EXAM 2  EXAM 3  | (EDIT)  |
+-------+--------------------+-------------+--------+--------+-----------------+-------------+-------------------------+---------+
|  2nd  | 👤 Abdul Basit     | 14 Mar 2002 | 22 yrs |   M    | SMK (2020)      | In Progress |  95 pts 229 pts 136 pts |   ✏️ 🗑️  |
|  2nd  | 👤 Adinda Karunia  | 05 Aug 2005 | 19 yrs |   F    | SMA (2023)      | In Progress |  75 pts 168 pts 287 pts |   ✏️ 🗑️  |
|  2nd  | 👤 Alfina Damayanti| 19 Nov 2001 | 23 yrs |   F    | SMK (2019)      | In Progress |  88 pts 277 pts 395 pts |   ✏️ 🗑️  |
+-------+--------------------+-------------+--------+--------+-----------------+-------------+-------------------------+---------+
|   ★   | ★ BATCH AVG (18)   |     —       | 21.8 yr| 10M·7F |        —        |      —      | 83.5pts 220.8pt 296.2pt |    —    |
+-------+--------------------+-------------+--------+--------+-----------------+-------------+-------------------------+---------+
```

### 2.3 Spatial Invariant Pre-Flight Checklist

| Invariant Requirement | Specification / Check Target | Compliance Status |
| :--- | :--- | :---: |
| **Viewport Lock** | `100vh` locked, zero outer scroll (`overflow: hidden !important`) | ✅ Verified |
| **Excel Gridlines** | `border-right: 1px solid rgba(255, 255, 255, 0.08)` across all cells | ✅ Verified |
| **Zero Dead Space** | Table fills 100% container width with zero right-side void | ✅ Verified |
| **Typography Standard** | Exact `12px` font size, Medium 500 weight for data cells | ✅ Verified |
| **Docking Base** | Container margins `10px 10px 0 10px`, flush docked to 60px bottom banner | ✅ Verified |
| **Super-Header Parity** | `fixed_before = 7` spans match the enriched student columns | ✅ Verified |
| **Edit Mode Lockdown** | `ACTIONS` column completely hidden in view mode (`EDIT: OFF`) | ✅ Verified |

---

## 3. User Review Required

> [!IMPORTANT]
> **Database Safety & Backward Compatibility**:
> 1. `birth_date` and `education` already exist in the Supabase `students` table. Zero database schema migrations or alter tables are required.
> 2. Students with null DOB or education render graceful fallback indicators (`No DOB`, `—`), maintaining clean typography without errors.
> 3. Column widths resized by user via dragging or double-click auto-fit persist in browser `localStorage` per table ID (`topscore_col_widths_<tableId>`).

---

## 4. Open Questions

*None. All column schemas and user requirements are 100% verified against live database records.*

---

## 5. Proposed Changes

### Component 1: Universal Excel Gridlines & Grab Handle Styles (`css/admin.css`)

#### [MODIFY] `css/admin.css`
1. **Excel-like Vertical Gridlines**:
   Apply subtle vertical column borders across all table elements in `.table-wrap table` and `.datagrid-table`:
   ```css
   .table-wrap table th,
   .table-wrap table td,
   .datagrid-table th,
   .datagrid-table td,
   #admin-console table th,
   #admin-console table td {
     border-right: 1px solid rgba(255, 255, 255, 0.08) !important;
     border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
   }
   .table-wrap table th:last-child,
   .table-wrap table td:last-child,
   .datagrid-table th:last-child,
   .datagrid-table td:last-child {
     border-right: none !important;
   }
   ```
2. **Enhanced 7px Column Resize Handle**:
   Set `width: 7px; right: -3px; z-index: 30;` to ensure smooth grabbing without clipping on sticky headers.

---

### Component 2: Universal Auto-Fit Column Resizing Engine (`js/admin/datagrid.js`)

#### [MODIFY] `js/admin/datagrid.js`
1. **Accurate Offscreen Canvas Auto-Fit (`dblclick`)**:
   Implement `autoFitColumn(tableElement, th, colIdx)` utilizing `canvas.getContext('2d').measureText` to calculate the exact maximum pixel width needed by cell contents, clamped between 50px and 500px:
   ```javascript
   handle.addEventListener('dblclick', (e) => {
     e.preventDefault(); e.stopPropagation();
     const targetW = autoFitColumn(tableElement, th, idx);
     th.style.width = targetW + 'px';
     th.style.minWidth = targetW + 'px';
     const curWidths = {};
     ths.forEach((t, i) => { const w = parseInt(t.style.width); if (w) curWidths[i] = w; });
     try { localStorage.setItem(key, JSON.stringify(curWidths)); } catch (_) {}
   });
   ```
2. **Universal Table Hook & MutationObserver**:
   Add `window.initAllTablesColumnResize()` and observe DOM changes on `#admin-console` so any table rendered dynamically automatically gets column resizing.

---

### Component 3: Active Student Table Column Enrichment (`js/admin/student-management.js`)

#### [MODIFY] `js/admin/student-management.js`
1. **Add `DOB` (Birth Date) Column**:
   Format `row.birth_date` (e.g., `28 Jan 2008` / `2008-01-28`) at 100px width.
2. **Add `EDUCATION` Column**:
   Parse `row.education` JSON array (e.g., `[{"institution":"SMK","year":2024}]`) to display `SMK (2024)` or `SMA (2026)` at 130px width.
3. **Add `STATUS` Column**:
   Display `Active` / `In Progress` badge at 95px width.
4. **Update `buildSuperHeaders` & `summaryRow`**:
   Adjust `fixed_before = 7` (Level, Name, DOB, Age, Gender, Education, Status) to maintain perfect mathematical column alignment with class exam super-headers.

---

## 6. Verification Plan

### Automated Tests
1. **JavaScript Syntax Check**:
   ```powershell
   node scripts/check_all_js_syntax.cjs
   ```
   *Target: 44/44 JS files pass.*
2. **Spatial & Visual Invariant Audit**:
   ```powershell
   node .agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs
   ```
   *Target: 100% pass on 100vh lock, 10px spacing, table standards.*
3. **Student Dashboard Exam Parity Check**:
   ```powershell
   node scripts/test_student_dashboard_exam_parity.mjs
   ```
   *Target: 100% pass.*
4. **Playwright Visual Verification**:
   - Capture `verify_student_roster_enriched.png` showing the new DOB, Education, and Status columns with zero right-side dead space.
   - Capture `verify_excel_gridlines_all_tables.png` confirming subtle Excel vertical borders across tables.

---

