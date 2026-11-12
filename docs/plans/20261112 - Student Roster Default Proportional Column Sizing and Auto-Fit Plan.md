# Implementation Plan: Student Roster Default Proportional Column Sizing & Auto-Fit

Resolve the initial column disproportion in the Student Roster (`#students`) where the Name column is clipped upon entry (Image 1) and only looks correct after manually double-clicking auto-resize (Image 2). Ensure the table automatically opens with flawless, content-proportional column widths by default on initial entry, page reload, and tab switching, without requiring any manual user interaction, and eliminate the footer `BATCH ...` truncation.

---

## 🎯 Deep-Dive Root Cause Analysis: Why Image 1 Occurs vs. Image 2

An exhaustive audit of Chromium's table layout engine, `student-management.js`, and `datagrid.js` identified **5 interconnected factors**:

### 1. The Super-Header `colspan="7"` Equal-Split Bug (Primary Structural Defect)
In `js/admin/student-management.js:2227`, `buildSuperHeaders()` creates the super-header row as:
```javascript
sh.push({ label: '', colSpan: fixed_before, style: 'background:var(--clr-bg-2);border:none;' });
// where fixed_before = 7 (Level, Photo, Gender, Name, DOB, Age, Education)
```
In CSS `table-layout: fixed; width: 100%`:
- Chromium inspects the **first row of cells in `<thead>`** to resolve column width distribution across the 100% table container.
- Because Cell 1 is a single `<th>` spanning 7 columns (`colspan="7"`), Chromium allocates total width to that super-cell and then **divides it equally among the 7 columns (~110px per column)**!
- Result: Small columns (Level 50px, Photo 48px, Gender 65px) are forced to balloon into ~110px each with massive dead space, while **Name** (which requires ~300px+ for Indonesian full names) is crushed down to ~110px, causing immediate `...` truncation (`Abdul Ba...`, `Muhammad Afy...`).
- The `★ BATCH AVERAGE (16 Students)` summary row sits in the Name column and is likewise truncated to `★ BATC...`.

### 2. Hardcoded `max-width` on Header `<th>` in DataGrid
In `js/admin/datagrid.js:274`:
```javascript
const widthStyle = col.width ? `width:${col.width}; max-width:${col.width};` : '';
```
Every header `<th>` enforces `max-width: ${col.width};`. Even if excess horizontal space exists on a wide monitor (1366px, 1600px, 1920px), the Name column (`col.width: '220px'`) is artificially capped and cannot flex to absorb available space.

### 3. Passive Auto-Fit Logic (Only Bound to Click Event)
`datagrid.js:453` contains a canvas text measurement algorithm (`calculateColumnAutoWidth(th, cells)`). However, this logic was purely passive: it only ran inside a mouse `dblclick` event listener on the column resize handle. It was never executed automatically during the initial table mount.

### 4. Re-Mount Without Explicit Table ID (Reset Upon Navigation)
When switching sidebar batches or roster tabs (Active/Inactive), `renderStudents()` tears down and re-instantiates `new DataGrid(...)`. Because `student-management.js` did not pass an explicit `tableId`, the persistence key defaulted to a generic string, and `localStorage` widths were not reliably rehydrated or applied to both `<col>` and `<th>`.

### 5. Summary Row Footer Truncation (`BATCH ...` in Image 2)
In `summaryRow` (`student-management.js:2335`), the cell under `levelName` renders:
```javascript
cells += `<td ...>BATCH AVG</td>`;
```
In Image 2, when the Level column is narrowed to its proper ~50px width, `"BATCH AVG"` (which requires ~75px) gets truncated to **`BATCH ...`**. Meanwhile, the Name column in that same summary row already displays `★ BATCH AVERAGE (16 Students)`. This label is redundant and must be adjusted to `"AVG"` so zero text is truncated in any row.

---

## 🖼️ Visual Baseline & Proposed Mockup

### Current State Screenshot (Before — Image 1: Initial Entry Defect)
![Initial Entry Disproportionate Columns](/C:/Users/Top/.gemini/antigravity/brain/0cc055bc-6115-4880-89a3-5b72dafc9e68/img_roster_initial_misaligned.jpg)

### Proposed Visual State (After — Image 2: Out-Of-The-Box Auto-Fit Target)
![Target Out-Of-The-Box Content-Fitted Columns](/C:/Users/Top/.gemini/antigravity/brain/0cc055bc-6115-4880-89a3-5b72dafc9e68/img_roster_after_autoresize.jpg)

---

### 📐 Visual Pre-Flight Verification Checklist
- [ ] **Current State Screenshot (Before)**: Embedded baseline visual showing existing appearance and dimensions (`img_roster_initial_misaligned.jpg`).
- [ ] **Proposed Visual Mockup (After)**: Target screenshot verified showing ideal proportional spacing (`img_roster_after_autoresize.jpg`).
- [ ] **Zero Outer Page Scroll**: Verified root `100vh` zero outer page scroll lock with `calc(100vh - 60px)` console sizing.
- [ ] **Container Spacing**: Verified strict 10px container gap between cards, tables, and top/lower panels.
- [ ] **Lower Panel Alignment**: Verified 50px fixed height lower panel aligned with `.sidebar-footer`.
- [ ] **Dynamic Columns & Nowrap**: Verified single-line `white-space: nowrap !important;` on table cells with zero clipped text.
- [ ] **Zero Dead Space**: Verified table expands across 100% width proportionally without horizontal scrollbars.
- [ ] **Language Standard**: Verified all headers, labels, and badges use 100% direct English.

---

## User Review Required

> [!IMPORTANT]
> **Zero Manual Interaction Required**: The table will automatically render with the ideal proportions of Image 2 out-of-the-box upon first entry, navigation, tab switching, and page reload. Manual column dragging remains available as an optional user override, and will persist cleanly across sessions.

---

## Proposed Changes

### Component 1: `js/admin/student-management.js`

#### [MODIFY] `js/admin/student-management.js`
1. **Punt `colspan: 7` Bug in `buildSuperHeaders()`**:
   Replace the single `colSpan: 7` blank cell with 7 distinct `colSpan: 1` cells so Chromium respects individual column width definitions:
   ```javascript
   // BEFORE:
   sh.push({ label: '', colSpan: fixed_before, style: 'background:var(--clr-bg-2);border:none;' });

   // AFTER:
   for (let i = 0; i < fixed_before; i++) {
     sh.push({ label: '', colSpan: 1, style: 'background:var(--clr-bg-2);border:none;' });
   }
   ```
2. **Optimize Proportional Column Widths**:
   - `levelName`: `width: '50px'`, `minWidth: '45px'`
   - `photo_url`: `width: '48px'`, `minWidth: '45px'`
   - `gender`: `width: '65px'`, `minWidth: '55px'`
   - `sortName` (Name): `width: '320px'`, `minWidth: '240px'` (primary flex column, absorbs remaining screen width)
   - `birth_date`: `width: '95px'`, `minWidth: '90px'`
   - `ageDisplay`: `width: '60px'`, `minWidth: '55px'`
   - `education`: `width: '110px'`, `minWidth: '95px'`
   - `Exam 1–4`: `width: '85px'`, `minWidth: '75px'` each
   - `program_status`: `width: '90px'`, `minWidth: '85px'`
3. **Fix Footer `BATCH ...` Truncation in `summaryRow`**:
   Change `levelName` summary cell label from `"BATCH AVG"` to `"AVG"`:
   ```javascript
   // BEFORE:
   cells += `<td style="...font-size:0.75rem;">BATCH AVG</td>`;

   // AFTER:
   cells += `<td style="...font-size:0.75rem;letter-spacing:0.05em;">AVG</td>`;
   ```
   "AVG" easily fits in 50px without truncation, while the Name column beside it displays `★ BATCH AVERAGE (${filteredData.length} Students)`.
4. **Supply Authoritative `tableId` to DataGrid**:
   ```javascript
   studentGrid = new DataGrid({
     container: gridContainer,
     tableId: 'student_roster_grid',
     ...
   ```

---

### Component 2: `js/admin/datagrid.js`

#### [MODIFY] `js/admin/datagrid.js`
1. **Remove Restrictive `max-width` on Header `<th>`**:
   In `renderHeaders()`, remove `max-width:${col.width};` so columns in `table-layout: fixed; width: 100%` can expand gracefully to fill large viewports without clipping:
   ```javascript
   // BEFORE:
   const widthStyle = col.width ? `width:${col.width}; max-width:${col.width};` : '';

   // AFTER:
   const widthStyle = col.width ? `width:${col.width};` : '';
   ```
2. **Automatic Content-Aware Width Calibration on Mount (`autoFitOnMount`)**:
   In `constructor()` or after `this.render()`, if no custom user widths exist in `localStorage`, automatically measure all visible columns using `calculateColumnAutoWidth` and assign optimal content-proportional widths immediately on mount.
3. **Synchronize Widths Across Both `<col>` and `<th>` in `initColumnResize()`**:
   Ensure loaded widths from `localStorage` apply to both `<col>` elements in `<colgroup>` and corresponding `<th>` cells.

---

### Component 3: Cache Busting Synchronization

#### [MODIFY] `admin.html` & `js/admin/app.js`
- Bump asset query strings to `v=20261112_v425` to guarantee immediate client cache bypass.

---

## Verification Plan

### Automated Tests
1. **Pre-Flight Plan Gate**:
   ```powershell
   node scripts/verify_plan_preflight.mjs "docs/plans/20261112 - Student Roster Default Proportional Column Sizing and Auto-Fit Plan.md"
   ```
2. **Comprehensive Proportional Width Verification**:
   Create and execute `scripts/verify_student_roster_auto_fit.mjs` verifying:
   - Super-header row does NOT contain `colSpan: 7` monolithic cell.
   - Name column baseline width is $\ge 300\text{px}$ with zero artificial `max-width` clipping.
   - Header `<th>` elements do not enforce restrictive `max-width`.
   - Footer summary row renders `"AVG"` under Level to avoid `"BATCH ..."` truncation.
   - `autoFitOnMount` correctly calculates content dimensions without requiring user clicks.
   - `scripts/verify_system_wide_no_hscroll.mjs` passes 14/14 checks.
   - `scripts/verify_student_roster_polish.mjs` passes 17/17 checks.

### Manual Verification
1. Navigate directly to `http://localhost:5500/admin.html?status=active#students`.
2. Verify without clicking anything that the table immediately renders matching **Image 2**:
   - `Wildan Yusroni`, `Muhammad Afyani Farobi`, `Lalu Yuda Handika Prawira` are fully visible without `...`.
   - `★ BATCH AVERAGE (16 Students)` is 100% visible in the summary row without `...`.
   - Level footer cell cleanly displays `AVG` with zero truncation (`BATCH ...` is gone).
   - `Level`, `Photo`, `Gender` are tightly aligned and compact.
   - Zero horizontal scrollbar is present.
3. Switch tabs (Active -> Inactive -> Active) or reload the page: verify the layout remains perfectly proportioned.
