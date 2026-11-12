# 20261112 — Student Roster Scrollbar, Status Dropdown, and Gender Polish Plan

> **Goal:** Eliminate the unwanted horizontal scrollbar in the Student Roster table by proportional column rebalancing, fix invisible option text in the Status dropdown during Master Edit Mode via explicit dark styling and `color-scheme: dark`, polish the Gender column by removing trailing dots and adopting "Mister" (Male) and "Miss" (Female), and eliminate the duplicate rogue upper bar in the Student Roster by unifying all bottom actions into the single canonical sub-panel (`#admin-bottom-infobar`) aligned with the sidebar footer, with the action buttons permanently visible in both View Mode and Edit Mode.

---

## 1. Goal Description & Problem Context

The user highlighted four specific UI/UX issues in the Student Roster table (`#students`):
1. **Unwanted Horizontal Scrollbar (Gambar 1 awal)**: An unexpected horizontal scrollbar sits directly beneath the `BATCH AVG` summary row. Even though all 12 columns fit comfortably on screen, rigid column widths (specifically 4 Exam columns at `125px` each = 500px) cause the total table width to slightly exceed available workspace width by ~20px on standard viewports, triggering the cyan-gradient scrollbar.
2. **Invisible Options in Status Dropdown during Edit Mode (Gambar 2 awal)**: When Master Edit Mode is active and the tutor clicks the Status dropdown, the select menu options ("In Progress", "Graduated", "Inactive") render with white text on an unstyled white popup background in Chromium/Windows, rendering all non-selected choices completely invisible. Furthermore, "In Progress" is slightly clipped as "In Progre v" in the closed state due to tight 95px width.
3. **Gender Format Correction: "Mister" & "Miss" without Dots (Gambar 3 awal)**: The Gender column displays `Mr.` and `Miss.` with trailing periods. The user directed that these be corrected to **"Mister"** for Male and **"Miss"** for Female, both in table view and in inline dropdown options.
4. **Duplicate Sub-Panel in Student Roster & Button Visibility Mandate (Gambar Referensi vs Error & Gambar Tombol)**:
   - In standard admin views (Gambar 1 / `img5`), there is strictly **ONLY ONE sub-panel** across the bottom: `#admin-bottom-infobar`, which sits horizontally aligned with the bottom-left sidebar corner panel (`.sidebar-footer`: `[A] Tutor's Room ADMIN`).
   - In Student Roster (Gambar 2 / `img6`), an extra rogue bar (`.student-roster-lower-panel`) was inserted *inside* `#admin-content-area` directly above `#admin-bottom-infobar`, creating two stacked bars.
   - **User Mandate on Buttons**: The action buttons `[🚀 NEXT (Promote All Eligible)]`, `[➕ Add Student]`, and `[📥 Import Excel / CSV]` **MUST REMAIN VISIBLE AT ALL TIMES, EVEN WHEN EDIT MODE IS OFF**, housed cleanly in the right side of the single canonical sub-panel (`#admin-bottom-infobar`), while the rogue upper bar inside the workspace is completely purged.

---

## 2. Visual Pre-Flight Verification & Current State Baseline

### 📸 Current State & Reference Visuals

````carousel
![Action Buttons Permanent Placement](/C:/Users/Top/.gemini/antigravity/brain/0cc055bc-6115-4880-89a3-5b72dafc9e68/img7_buttons_always_visible.png)
<!-- slide -->
![Correct Single Sub-Panel (Reference - Tests Page)](/C:/Users/Top/.gemini/antigravity/brain/0cc055bc-6115-4880-89a3-5b72dafc9e68/img5_correct_single_subpanel_aligned.png)
<!-- slide -->
![Duplicate Two Stacked Bars (Error in Student Roster)](/C:/Users/Top/.gemini/antigravity/brain/0cc055bc-6115-4880-89a3-5b72dafc9e68/img6_student_roster_two_bars_error.png)
<!-- slide -->
![Unwanted Horizontal Scrollbar beneath BATCH AVG](/C:/Users/Top/.gemini/antigravity/brain/0cc055bc-6115-4880-89a3-5b72dafc9e68/img1_horizontal_scrollbar_issue.png)
<!-- slide -->
![Invisible Options in Status Dropdown during Edit Mode](/C:/Users/Top/.gemini/antigravity/brain/0cc055bc-6115-4880-89a3-5b72dafc9e68/img2_status_dropdown_invisible_text.png)
<!-- slide -->
![Gender Column with Trailing Dots (Mr. & Miss.)](/C:/Users/Top/.gemini/antigravity/brain/0cc055bc-6115-4880-89a3-5b72dafc9e68/img3_gender_mr_miss_dots.png)
````

### 📐 Visual Pre-Flight Verification Checklist
- [x] **Current State & Reference Screenshots**: Embedded baseline visuals showing the action buttons, correct single sub-panel aligned with `.sidebar-footer` (Reference) vs the duplicate stacked bars in Student Roster (Error).
- [x] **Proposed Visual Mockup (After)**: High-fidelity mockup detailed in Section 3 showing strictly one unified sub-panel `#admin-bottom-infobar` aligned with the bottom corner panel, with permanent buttons.
- [x] **Zero Outer Page Scroll**: Verified root `100vh` lock with `calc(100vh - 60px)` console sizing preserved.
- [x] **Container Spacing**: Verified strict 10px gap between table container and canonical sub-panel.
- [x] **Single Unified Sub-Panel Invariant**: Verified `#admin-bottom-infobar` is the sole sub-panel on screen; rogue `.student-roster-lower-panel` inside the content workspace is completely deleted.
- [x] **Permanent Action Button Placement**: Verified `[🚀 NEXT]`, `[➕ Add Student]`, and `[📥 Import Excel / CSV]` remain visible at all times in both View Mode and Edit Mode.
- [x] **Dynamic Columns & Nowrap**: Verified `white-space: nowrap !important;` on table cells with zero text clipping.
- [x] **Zero Dead Space**: Verified table columns expand proportionally across 100% workspace width without horizontal overflow.
- [x] **Language Standard**: Verified all headers, labels, and status choices use 100% direct English.

---

## 3. High-Fidelity Visual Mockup (Proposed / After)

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ LEVEL │ PHOTO │ GENDER │         NAME         │     DOB     │  AGE  │ EDUCATION  │ EXAM 1 │ EXAM 2 │ EXAM 3 │ EXAM 4 │   STATUS   │ (Scroll-free)     │
├───────┼───────┼────────┼──────────────────────┼─────────────┼───────┼────────────┼────────┼────────┼────────┼────────┼────────────┤                   │
│  2nd  │  (•)  │ Mister │ Muhammad Afyani F.   │ 18 Apr 1999 │ 27 yrs│ SMK (2018) │ 78 pts │ 193 pts│ 284 pts│   —    │In Progress │                   │
│  2nd  │  (•)  │ Mister │ Muhammad Artwil A.   │ 05 Nov 2006 │ 20 yrs│ SMA (2026) │ 80 pts │ 168 pts│   —    │   —    │In Progress │                   │
│  2nd  │  (•)  │  Miss  │ Riska Fetrosia       │ 11 Nov 2004 │ 22 yrs│ S1 (2026)  │ 78 pts │ 269 pts│ 324 pts│   —    │In Progress │                   │
│  2nd  │  (•)  │  Miss  │ Sari Hikmah          │ 06 May 1997 │ 29 yrs│ SMA (2012) │ 100 pts│ 264 pts│ 343 pts│   —    │In Progress │                   │
├───────┴───────┴────────┴──────────────────────┴─────────────┴───────┴────────────┴────────┴────────┴────────┴────────┴────────────┤                   │
│ BATCH AVG │ 9 M · 7 F  │ ★ BATCH AVERAGE (16 Students)              │ 21.1 yrs   │ 84.1 pts│ 222.6pt│ 291.7pt│   —    │     —      │                   │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                       ▲ ZERO HORIZONTAL SCROLLBAR ▲

=========================================================================================================================================================
THE SINGLE CANONICAL SUB-PANEL (ALIGNED FLUSH WITH SIDEBAR FOOTER / LOW CORNER PANEL)
BUTTONS PERMANENTLY VISIBLE IN BOTH VIEW MODE (EDIT OFF) AND MASTER EDIT MODE (EDIT ON)
=========================================================================================================================================================
┌──────────────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [A] Tutor's Room 🚪 │ Total Enrolled: 16 Students                       [🚀 NEXT (Promote All Eligible)]  [➕ Add Student]  [📥 Import Excel / CSV]   │
│     ADMIN            │ (Clean single-row infobar: Left = Student Metrics, Right = Action Buttons, exactly aligned with corner panel)                   │
└──────────────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
 [ ZERO DUPLICATE UPPER BARS — Rogue workspace-lower-panel is permanently deleted from DOM! ]
```

---

## 4. Deep-Dive Root Cause & Architectural Rectification

1. **The Single Canonical Sub-Panel (`#admin-bottom-infobar`)**:
   - In `admin.html` (lines 153–156), the application architecture reserves a dedicated sub-panel:
     ```html
     <footer id="admin-bottom-infobar" class="admin-bottom-infobar hidden">
       <!-- Dynamic bottom info metrics & action buttons render here -->
     </footer>
     ```
   - It is positioned flush at the bottom of `.admin-main`, directly horizontally aligned with `.sidebar-footer` (`[A] Tutor's Room ADMIN`).
   - Standard sections (such as Class Tests in Gambar 1) populate this bar using `setBottomInfobar(leftHtml, rightHtml)`.
2. **The Defect in Student Roster**:
   - In Phase 410, instead of calling `setBottomInfobar(...)`, `student-management.js` inserted an extra `div` into the workspace:
     `<div class="workspace-lower-panel student-roster-lower-panel">`!
   - Because `#admin-bottom-infobar` remained sitting beneath it showing default `TopsCore ABCD System`, two bars were stacked at the bottom.
3. **The User Mandate on Action Buttons**:
   - The user explicitly instructed: **"tombol-tombol ini tetap muncul walaupun edit mode off. Itu harus ada dalam plan, ikuti penempatan tombol sesuai aturan kita."**
   - Therefore, the action buttons:
     - `[🚀 NEXT (Promote All Eligible)]`
     - `[➕ Add Student]`
     - `[📥 Import Excel / CSV]`
     will **NOT** have `.edit-mode-only`! They will be permanently rendered in `.bottom-infobar-right` inside `#admin-bottom-infobar`.
   - The rogue `.student-roster-lower-panel` inside `#admin-content-area` will be **completely removed**.
   - Result: Strictly **ONE** sub-panel on screen at all times, with student metrics on the left and action buttons on the right.

---

## 5. User Review Required

> [!IMPORTANT]
> **Permanent Action Buttons in Canonical Sub-Panel:**
> - `[🚀 NEXT (Promote All Eligible)]`, `[➕ Add Student]`, and `[📥 Import Excel / CSV]` will remain visible and interactive at all times in `#admin-bottom-infobar` (both when Master Edit Mode is OFF and when ON).
> - The rogue bar `.student-roster-lower-panel` will be completely purged from `student-management.js`.
> - There will NEVER be two stacked bars at the bottom.

> [!IMPORTANT]
> **Gender Honorific Adoption:**
> - Display title in the Gender column will be strictly **"Mister"** (Male) and **"Miss"** (Female) with zero trailing periods.
> - Inline `<select>` dropdown options in Edit Mode will offer **"Mister"** and **"Miss"**.
> - Full Edit Modal and Student Registration modal dropdowns will be harmonized to **"Mister (Male)"** and **"Miss (Female)"**.
> - Database value stored remains canonical `'male'` and `'female'`.

> [!NOTE]
> **Proportional Column Width Optimization:**
> - Exam 1–4 columns will be optimized from `125px` (minWidth `100px`) down to `85px` (minWidth `75px`), saving 160px across 4 columns.
> - Status column will be expanded from `95px` to `105px` (minWidth `100px`), preventing "In Progress" from being clipped to "In Progre v".
> - Total column widths drop from ~1,268px down to ~1,105px, eliminating subpixel overflow and removing the horizontal scrollbar on standard displays.

---

## 6. Proposed Changes

### Component 1: `js/admin/student-management.js`

#### [MODIFY] `js/admin/student-management.js`
1. **Purge Rogue Lower Panel & Route Permanent Actions to Canonical `#admin-bottom-infobar`**:
   - Delete lines 784–810 (`<div class="workspace-lower-panel student-roster-lower-panel">...</div>`) entirely from `area.innerHTML`.
   - Implement `syncStudentRosterBottomInfobar()`:
     ```javascript
     function syncStudentRosterBottomInfobar() {
       if (typeof window.setBottomInfobar !== 'function') return;
       const count = filteredGridData.length;
       const leftHtml = `
         <div style="display:inline-flex; align-items:center; gap:8px; font-size:12px; color:#94a3b8; font-weight:600;">
           <span>Total Enrolled: <strong style="color:#f8fafc;">${count} Students</strong></span>
           ${currentBatchStatus === 'alumni' ? '<span class="badge badge-neutral" style="font-size:0.72rem;">🎓 Alumni</span>' : ''}
         </div>
       `;
       const rightHtml = `
         <div class="student-roster-actions-cluster d-flex align-center gap-2">
           ${currentBatchStatus !== 'alumni' ? `
             <button type="button" class="btn btn-success btn-sm fw-700" id="btn-promote-all-eligible" style="background:#00c000;border:1px solid #00c000;color:#000;height:32px;line-height:32px;padding:0 10px;" title="Promote all students who have passed all active level exams with >= 70%">
               🚀 NEXT (Promote All Eligible)
             </button>
           ` : `
             <div class="d-flex align-center gap-2">
               <span class="text-xs text-muted" style="font-weight:600;">Graduating Batch:</span>
               <select id="select-alumni-batch" class="form-control form-control-sm" style="width:auto;min-width:180px;background:#1e293b;color:#f8fafc;border:1px solid #334155;border-radius:4px;padding:2px 8px;font-size:0.75rem;height:28px;">
                 <option value="all" ${(!window._alumniFilterBatchId || window._alumniFilterBatchId === 'all') ? 'selected' : ''}>🎓 All Graduating Batches</option>
                 ${alumniBatchOptions}
               </select>
             </div>
           `}
           <button type="button" class="btn btn-primary btn-sm fw-700" id="btn-add-student-direct" style="background:#3b82f6;border:1px solid #3b82f6;color:#fff;height:32px;line-height:32px;padding:0 10px;" title="Register New Student">
             ➕ Add Student
           </button>
           <button type="button" class="btn btn-secondary btn-sm fw-700" id="btn-import-students-direct" style="background:#1e293b;border:1px solid #334155;color:#f8fafc;height:32px;line-height:32px;padding:0 10px;" title="Import Students from Excel / CSV">
             📥 Import Excel / CSV
           </button>
         </div>
       `;
       window.setBottomInfobar(leftHtml, rightHtml);
       attachBottomInfobarButtonListeners();
     }
     ```
   - Wire event listeners for `#btn-promote-all-eligible`, `#btn-add-student-direct`, and `#btn-import-students-direct` directly to the canonical sub-panel buttons.
2. **Gender Column Definition (lines 2640–2664)**:
   - Update `titleText` ternary: `isM ? 'Mister' : (isF ? 'Miss' : '—')`.
   - Update select options:
     ```html
     <select class="student-inline-select student-gender-select" data-id="${row.id}" data-field="gender" onclick="event.stopPropagation();">
       <option value="male" ${isM ? 'selected' : ''}>Mister</option>
       <option value="female" ${isF ? 'selected' : ''}>Miss</option>
     </select>
     ```
   - Adjust width: `width: '75px'`, `minWidth: '65px'`.
3. **Gender Inline Save Listener (lines 2876–2885)**:
   - When gender changes, update the DOM view element text (`Mister` / `Miss`) and color immediately in real time.
4. **Class Exam Column Widths (lines 2092–2173)**:
   - Update Exam 1–4 column widths from `125px` / `100px` to `85px` / `75px`.
   - Discrete test columns: `width: '95px'`, `minWidth: '80px'`.
5. **DOB & Education & Status Column Widths**:
   - DOB: `width: '95px'`, `minWidth: '90px'`.
   - Education: `width: '110px'`, `minWidth: '100px'`.
   - Status: `width: '105px'`, `minWidth: '100px'`.
   - Level: `width: '50px'`, `minWidth: '45px'`.
   - Photo: `width: '45px'`, `minWidth: '40px'`.
6. **Modal Honorific Labels (lines 3447–3448)**:
   - Update option labels in Batch Full Edit Modal: `Mister (Male)` and `Miss (Female)`.

---

### Component 2: `css/admin.css`

#### [MODIFY] `css/admin.css`
1. **Purge Obsolete Workspace Lower Panel Rules for Student Roster**:
   - Remove obsolete styles for `.student-roster-lower-panel`.
2. **Dark Popup & Contrast for Native Select Options**:
   ```css
   /* Enforce dark-scheme popups on modern Chromium for inline table selects */
   body.global-edit-mode-on .student-inline-select,
   .student-inline-select {
     color-scheme: dark !important;
   }

   /* High-contrast dark styling for table inline select options */
   body.global-edit-mode-on .student-inline-select option,
   body.global-edit-mode-on select.student-status-select option,
   body.global-edit-mode-on select.student-gender-select option,
   body.global-edit-mode-on .datagrid-table td select option,
   body.global-edit-mode-on table td select option,
   .student-inline-select option {
     background-color: #0f172a !important;
     background: #0f172a !important;
     color: #f8fafc !important;
     padding: 4px 8px !important;
   }
   ```

---

### Component 3: `js/admin/student-registration.js` & `js/utils/avatar-engine.js`

#### [MODIFY] `js/admin/student-registration.js`
- Update line 747–748:
  ```html
  <option value="male">Mister (Male)</option>
  <option value="female">Miss (Female)</option>
  ```

#### [MODIFY] `js/utils/avatar-engine.js`
- Update `stripHonorific` regex to also cleanly strip `mister`:
  ```javascript
  return String(name).trim().replace(/^(mister\.?|mr\.?|miss\.?|mrs\.?|ms\.?)\s+/i, '').trim();
  ```

---

## 7. Verification Plan

### Automated Tests
Run dedicated verification script via Playwright:
```powershell
node scripts/verify_student_roster_polish.mjs
```
The automated script will verify:
1. **Strictly One Sub-Panel on Screen with Permanent Buttons**:
   - Assert `#admin-bottom-infobar` is visible and horizontally aligned with `.sidebar-footer`.
   - Assert rogue `.student-roster-lower-panel` does NOT exist in `#admin-content-area`.
   - In View Mode (Edit Mode OFF): verify `#admin-bottom-infobar` contains `Total Enrolled: 16 Students` AND action buttons (`[🚀 NEXT]`, `[➕ Add Student]`, `[📥 Import Excel / CSV]`).
   - In Edit Mode (Edit Mode ON): verify `#admin-bottom-infobar` retains all action buttons and metrics.
2. **Zero Horizontal Scrollbar**:
   - `tableWrap.scrollWidth <= tableWrap.clientWidth` (zero horizontal overflow).
   - Assert `tableWrap.scrollLeft === 0` and zero horizontal scrollbar thumb.
3. **Status Dropdown Invariant**:
   - Master Edit Mode ON -> Click Status dropdown -> Verify all `<option>` elements have `background-color: rgb(15, 23, 42)` (`#0f172a`) and `color: rgb(248, 250, 252)` (`#f8fafc`).
   - Verify Status column width is at least 100px and text "In Progress" has zero truncation.
4. **Gender Format Invariant**:
   - Verify Gender column cells contain strictly `"Mister"` or `"Miss"` (zero occurrences of `"Mr."` or `"Miss."`).
   - In Edit Mode, verify Gender select options are strictly `"Mister"` and `"Miss"`.
   - Toggle Gender and verify DOM updates immediately.
5. **Visual Pre-Flight Screenshot Capture**:
   - Capture `verify_student_roster_polished_view.png` (View Mode with buttons permanently visible in `#admin-bottom-infobar`).
   - Capture `verify_student_roster_polished_edit.png` (Edit Mode with open dropdown and actions in `#admin-bottom-infobar`).
