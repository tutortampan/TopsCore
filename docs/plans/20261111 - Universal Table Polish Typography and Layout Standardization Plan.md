# TopsCore Implementation Plan — Universal Table Polish, Typography Discipline & Layout Invariants

**Date:** 2026-11-11  
**Trigger:** User Comprehensive Feedback on 8 Images (`/learn` + `/plan`)  
**Target Areas:**
- Theme & Topic Manager Table (`js/admin/vocab-vault.js`)
- Attendance Matrix & Class Analytics Grid (`js/admin/app.js`, `css/admin.css`)
- Universal DataGrid Engine & Multi-Select Column (`js/admin/datagrid.js`)
- Student Roster & Batch Average Footer Docking (`js/admin/student-management.js`)
- Universal Stylesheet & Typography Scale (`css/admin.css`, `css/style.css`)

---

## 1. Problem Statement & Audit Across All 8 Images

| Image | Observed Flaw / User Feedback | Root Cause | Proposed Solution |
|:---:|:---|:---|:---|
| **Img 1 & 2** | **Multi-line Program Badge Stacking**: When topics are assigned to multiple programs (`Camp`, `Evnikom`, `Sheraton`), pills stack vertically, blowing row height to 60px+. Too much horizontal dead space in numeric columns. | Dynamic flex pill badges with wrapping (`flex-wrap: wrap`); non-compact column width allocation. | 1. Official 3–4 letter uppercase codes (`CMP`, `EVN`, `SHR`) rendered horizontally on a **single non-wrapping line** with native tooltip for full names.<br>2. Snug column widths on metric numbers (`40px–52px`), directing stretch to `THEME` and `TOPIC NAME`. |
| **Img 3** | **Edit Mode Interaction & Capsular Badges**: User loves the crisp white grid effect on edit mode and direct cell typing, but hates capsule pill styling on editable cells. | Inputs currently use `border-radius: 9999px` (capsules) or inconsistent input styling. | Unify edit mode table cells with a clean white/light grid outline (`outline: 1px solid rgba(255,255,255,0.4)`), flat rectangular inputs (`border-radius: 3px/4px`), zero capsule pills. |
| **Img 4 & 5** | **Microscopic Sub-Header Fonts**: Sub-headers `TASK`, `PTS`, `SCR` in Attendance Matrix render at tiny sub-11px (8.9px / `0.70rem`). | Hardcoded `font-size: 0.70rem;` and `font-size: 0.75rem;` in `js/admin/app.js:2804`. | Enforce Rule 2.39: elevate all matrix sub-headers (`TASK`, `PTS`, `SCR`) to **11px / 12px** with crisp `font-weight: 700`. |
| **Img 6** | **Neon Glow Distraction on Score Column**: Cyan glowing vertical shadow in Attendance Matrix between `PTS` and `SCR`. | `#class-attendance-grid td.col-test-theme-score-a` has `box-shadow: 2px 0 8px rgba(56, 189, 248, 0.3) !important;` in `css/admin.css:4770`. | Strip all `box-shadow` neon glow effects. Use clean, flat 2px solid theme border dividers (`border-right: 2px solid #38bdf8 !important;`). |
| **Img 7** | **Floating Footer & Tiny Metadata**: In small rosters (e.g. 1 student), `★ BATCH AVERAGE` floats mid-screen right below row 1, leaving a dark void at the bottom. Age (`17 yrs`), gender (`M`), points (`39 pts`) use tiny 9px/10px text. | Table uses `height: auto` without base docking; metadata spans use legacy `0.75rem` / `0.78rem`. | 1. Make summary footer (`tfoot`, `.datagrid-summary-row`) **dock firmly at the base** of the table container flush against the lower panel, leaving the empty void in the middle without row stretching.<br>2. Elevate student metadata font sizes to uniform 12px (`font-weight: 500`). |
| **Img 8** | **Unused Multiple Selection Checkbox Column**: Leftmost column displays empty checkboxes that are never utilized. | `DataGrid` instances instantiate with `bulkActions: true`. | Set `bulkActions: false` across all DataGrid tables (Student Management, Classes, Programs, Batches) and purge the checkbox column completely. |
| **General** | **Bold Overuse Across All Tables**: Heavy bolding (`font-weight: 700/800`) on numbers, text, and data cells causes visual noise. | Data cells indiscriminately use bold weights. | **Header-Only Bold Invariant**: Bold (`700/800`) strictly reserved for Headers/Sub-headers. Data cells, numbers, counts, and body text strictly use Medium/Normal (`font-weight: 500` / `400`). |

---

## 2. Standardized Row Height Proposal

To eliminate row height jumping and maintain consistent data density across all screens:
- **Standard Table Data Row Height:** **`32px`** (optimal balance between readability and density).
- **Super-Header Height:** **`24px`**
- **Sub-Header Height:** **`28px`**
- **Docked Base Footer Height:** **`32px`**
- **Compact View Toggle (Optional):** **`28px`** for ultra-dense data sheets.

---

## 3. Official Program & Institution Short Code Dictionary

To prevent vertical badge stacking in the `PROGRAMS` column:

| Entity Type | Full Name | Official Short Code | Chip Rendering |
|:---|:---|:---:|:---:|
| Institution | **CEC (Camp English Course)** | `CEC` | — |
| Institution | **TOP (Top English Program)** | `TOP` | — |
| Program | **Camp** | `CMP` | `<span class="prog-chip" title="Camp">🟢 CMP</span>` |
| Program | **Evnikom** | `EVN` | `<span class="prog-chip" title="Evnikom">🟢 EVN</span>` |
| Program | **Sheraton** | `SHR` | `<span class="prog-chip" title="Sheraton">🟢 SHR</span>` |
| Program | **English Explorer** | `EXP` | `<span class="prog-chip" title="English Explorer">🟢 EXP</span>` |

*When 3+ programs are assigned, they render horizontally on one line: `🟢 CMP  🟢 EVN  🟢 SHR` with tooltip `title="Camp, Evnikom, Sheraton"`, maintaining strict 32px row height.*

---

## 4. Proposed Changes by File

### A. [MODIFY] `css/admin.css`
1. **Purge Score Column Glow:**
   - Remove `box-shadow: 2px 0 8px rgba(56, 189, 248, 0.3) !important;` and equivalents for theme codes `a`, `b`, `c`, `d`.
   - Set clean `border-right: 2px solid #38bdf8 !important;`.
2. **Table Typography & Bold Discipline:**
   - Enforce `font-weight: 500 !important;` on standard table `td`, numbers, and text.
   - Enforce `font-weight: 700 !important;` on table `th` and super-headers.
3. **Flat White Grid Edit Mode:**
   - Define `.global-edit-mode-on .editable-cell` with crisp white grid borders (`outline: 1px solid rgba(255,255,255,0.4)`).
   - Style `.vault-edit-input` as flat rectangular box (`border-radius: 4px`, `height: 22px`), purging all capsule badge styling.
4. **Docked Base Footer (`tfoot` Base Docking):**
   - Provide flex container docking rules so `.datagrid-summary-row` or `tfoot` is anchored at the bottom edge of `.table-wrap` above the 50px lower panel.

### B. [MODIFY] `js/admin/vocab-vault.js`
1. Update `assignedPillsHtml` in `buildTableBodyHtml`:
   - Map program names to official short codes (`CMP`, `EVN`, `SHR`, `EXP`).
   - Render chips in a single-line horizontal flex wrapper (`white-space: nowrap !important; flex-wrap: nowrap !important;`).
2. Update cell font weights:
   - Change `font-weight: 700` and `font-weight: 800` on data cells (`td`) to `font-weight: 500`.
   - Keep theme/topic codes in monospace medium weight.
3. Compact numeric columns: Set snug widths (`width: 38px–45px`) on VERB, NOUN, ADJ, OTH, EXP, PRV, IDM, OTH so that empty horizontal space is smoothly allocated to `THEME` and `TOPIC NAME`.

### C. [MODIFY] `js/admin/app.js`
1. Bump sub-header font sizes in Attendance Matrix:
   - Replace `font-size: 0.70rem;` on `TASK`, `PTS`, `SCR` with `font-size: 11px; font-weight: 700;`.
2. Purge `bulkActions: true` in student matrix instantiation (line 1921):
   - Set `bulkActions: false`.

### D. [MODIFY] `js/admin/datagrid.js`
1. Ensure default `bulkActions = false`.
2. Strip checkbox header and row cells when `bulkActions` is false or disabled.

### E. [MODIFY] `js/admin/student-management.js`
1. Set `bulkActions: false` in Student Roster DataGrid.
2. Bump student age, gender, and point metadata font sizes from `0.75rem` / `0.78rem` to `12px` (`font-weight: 500`).
3. Ensure `BATCH AVERAGE` summary footer is locked to the bottom of the container.

---

## 5. Verification Plan

### Automated Tests
1. `node scripts/check_all_js_syntax.cjs` — Full syntax check across all 44 JavaScript files.
2. `node .agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs` — Automated spatial audit.
3. `node scripts/verify_merged_theme_topics.mjs` — Playwright assertion of table data and 19-column sequence.
4. Create new Playwright verification script `scripts/verify_table_polish_invariants.mjs` to assert:
   - Zero checkbox column rendered in Student Roster and Attendance Matrix.
   - Zero neon glow box-shadow on score column in Attendance Matrix.
   - All sub-headers >= 11px.
   - Programs chips use uppercase short codes (`CMP`, `EVN`, `SHR`) without line wrapping.
   - Summary footer docked at base.

### Manual Verification
- Review the interactive mockup in [table_polish_mockup.html](file:///C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/table_polish_mockup.html).
- Toggle Edit Mode to verify the white grid appearance and absence of capsules.

