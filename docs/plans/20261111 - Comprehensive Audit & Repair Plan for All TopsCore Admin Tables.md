# Comprehensive Audit & Repair Plan for All TopsCore Admin Tables

## Goal Description
Perform a full visual and structural audit across all TopsCore LMS admin data tables, diagnose the causes of layout degradation ("berantakan"), present photographic evidence from automated Playwright captures, refine `.antigravityrules` to prevent recurrence, and execute a surgical, root-cause repair plan.

---

## 1. Deep Root-Cause Diagnostic & Verification

We investigated why the tables degraded and conducted headless browser test benchmarks (`scripts/test_table_docking.mjs`):

### Why the Tables Broke:
1. **CSS Fatal Bug (`css/admin.css` lines 7203–7227):**
   - In Phase 408, in an attempt to make the table footer dock to the bottom, the following CSS was introduced:
     ```css
     .table-wrap table { display: flex !important; flex-direction: column !important; }
     .table-wrap table tbody { flex: 1 1 0 !important; overflow-y: auto !important; }
     ```
   - **Technical Reality:** Setting `display: flex` on an HTML `<table>` destroys the browser's native tabular layout algorithm (`display: table`). The cells lose column width synchronization, and `tbody` with `flex: 1 1 0` collapses to **0px height**, hiding all 18 student rows and pushing `tfoot` directly beneath the headers.
2. **JavaScript Crash Bug (`js/admin/app.js` lines 1243 & 1256):**
   - Variable declared as `const allTests = testsResult.data;`, then reassigned at line 1256: `allTests = freshTests;`.
   - Result: Fatal `TypeError: Assignment to constant variable at renderClassHub`, crashing the entire rendering sequence.
3. **Ambiguity in Rule 15 Phrasing:**
   - In `.antigravityrules`, the phrase:
     *"Scroll EXCLUSIVELY inside table `.table-wrap` / `tbody`"*
     misled previous agents into attempting to make `tbody` independently scrollable via flexbox.

---

## 2. Tested & Proven Solution: Option C (Spacer Architecture)

We ran Playwright benchmarks on 3 competing docking techniques:
- **Option A (`table { min-height: 100% }`):** Data rows ballooned from 30px up to **171.7px each** (Violated Anti-Ballooning Rule 5).
- **Option B (Separate footer table):** Required two tables, risking column misalignment.
- **Option C (Native `display: table` with `<tr class="table-spacer-row">`):**
  - Data rows maintained exact compact height (**30.5px – 31px**).
  - Footer `tfoot` docked cleanly at the bottom (**y: 557px**).
  - Column widths across `thead`, `tbody`, and `tfoot` stayed **100% mathematically synchronized**.
  - **Zero flex hacks required.**

---

## 3. Visual Audit Evidence (Current Broken State)

| Screen / Table | Defect Observed | Target Resolution |
| :--- | :--- | :--- |
| **Attendance Matrix** (`#classes`) | 18 student rows vanished; `CLASS AVERAGE` footer at top | Remove CSS table flex; fix `let allTests` JS crash; restore native table |
| **Batches** (`#batches`) | Action buttons (`Change Level`, `+ Add Student`, `Edit`, `Delete`) visible in view mode | Hide all action buttons when `body:not(.global-edit-mode-on)` |
| **Organization** (`#organization`) | Pill capsule overload on every metric; idle `↕` sort arrows | Remove pill borders in view mode; remove `↕`; show active cyan `▲`/`▼` |
| **Vocab Words & Phrases** (`#vocab_vault`) | Severe right-edge dead space; all words/meanings bold weight 700 | Dynamic 100% width proportional columns; text weight 500 (headers bold) |
| **Class Tests** (`#classes`) | Action icons (trash, duplicate, edit) and capsule badges in view mode | Hide action buttons when Edit Mode OFF; flat tabular text |
| **Theme Manager** (`#vocab_vault`) | Program access badges stacked vertically | Single-line compact codes (`CMP`, `EVN`, `SHR`) |

---

## 4. Proposed Changes

### Component 1: Permanent Rule Clarification (`.antigravityrules` & `ui-invariants.md`)
1. **Clarify Rule 15 in `.antigravityrules`:**
   ```text
   15. UNIVERSAL TABLE ARCHITECTURE & NATIVE TABLE LOCK (STRICT INVARIANT) (/learn):
       - Root 100vh lock (`overflow: hidden !important;`). Console: `calc(100vh - 60px) !important`.
       - Native Table Lock: HTML `<table>` elements are strictly `display: table !important` (NEVER flex or grid).
       - Vertical scrolling is EXCLUSIVELY on `.table-wrap { overflow-y: auto; }`. Headers stick to top, footers stick to bottom.
   ```
2. **Clarify Rule 28 in `.antigravityrules`:**
   ```text
   28. FLUSH BASE FOOTER DOCKING & ANTI-BALLOONING (/learn):
       - Table footers (`tfoot`, BATCH AVG) dock flush to base above lower panel. Small rosters use an invisible `<tr class="table-spacer-row"><td colspan="..."></td></tr>` in `tbody` so rows stay compact (28px–32px) and footers dock at the bottom without ballooning or flex hacks.
   ```

### Component 2: `css/admin.css` (CSS Table Layout Restoration)
1. **Purge Flex Table Hack:**
   Remove lines 7203–7227 (`.table-wrap table { display: flex !important; ... }`).
2. **Apply Authoritative Sticky Table Styles:**
   ```css
   .table-wrap {
     overflow-y: auto !important;
     overflow-x: auto !important;
     height: 100% !important;
     box-sizing: border-box !important;
   }
   .table-wrap table {
     display: table !important;
     width: 100% !important;
     height: 100% !important;
     border-collapse: separate !important;
     border-spacing: 0 !important;
   }
   .table-wrap thead { display: table-header-group !important; }
   .table-wrap tbody { display: table-row-group !important; }
   .table-wrap tbody tr.table-spacer-row td {
     height: auto !important;
     padding: 0 !important;
     border: none !important;
     background: transparent !important;
   }
   .table-wrap tfoot {
     display: table-footer-group !important;
     position: sticky !important;
     bottom: 0 !important;
     z-index: 10 !important;
     background: #0d1527 !important;
   }
   ```
3. **Global Edit Mode Lockdown:**
   ```css
   body:not(.global-edit-mode-on) .edit-mode-only,
   body:not(.global-edit-mode-on) .btn-table-action,
   body:not(.global-edit-mode-on) .batch-row-actions,
   body:not(.global-edit-mode-on) .class-test-actions,
   body:not(.global-edit-mode-on) td.col-actions * {
     display: none !important;
   }
   ```
4. **Purge Capsule Pills in View Mode & Remove Idle `↕` Sort Icons.**

### Component 3: `js/admin/app.js` (Runtime Crash & Matrix Fix)
1. Change line 1243: `const allTests = testsResult.data;` $\rightarrow$ `let allTests = testsResult.data;`.
2. Append `<tr class="table-spacer-row"><td colspan="..."></td></tr>` in matrix and small table rendering loops.

### Component 4: `js/admin/vocab-vault.js` (Zero Dead Space & Dynamic Widths)
1. Proportional flex distribution for Indonesian definition and English terms (`min-width: 260px; width: auto;`).
2. Font weight Medium (`font-weight: 500`) for all data cells; bold (`700`) strictly on headers.

### Component 5: Dynamic Column Resizing Engine (`js/admin/datagrid.js`)
1. Implement `initColumnResize(tableElement, storageKey)`.
2. 4px resize grab handle on each `<th>`.
3. Double-click auto-sizes column to content width.
4. Saves and restores widths from `localStorage.getItem('topscore_col_widths_' + tableId)`.

---

## 5. Automated Regression Guardrails (Future Proofing)

To guarantee that future edits never break tables again:
1. **Automated Row Count Gate (`scripts/verify_table_integrity.mjs`):**
   Playwright script visits all 11 tables and checks:
   - `tbody tr` count $> 0$ (no collapsed tbody).
   - Zero console errors (`TypeError`, `ReferenceError`).
   - Computed CSS of `table` is `display: table` (not `flex`).
2. **Pre-Commit / Pre-Flight Automated Check:**
   Runs alongside syntax checks (`scripts/check_all_js_syntax.cjs`) to block any regression before code is marked complete.

---

## Verification Plan
1. `node scripts/test_table_docking.mjs` (Benchmarking PASS).
2. `node scripts/capture_all_11_tables.mjs` (Automated visual capture).
3. `node scripts/check_all_js_syntax.cjs` (44/44 JS syntax PASS).
4. `node .agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs` (100% PASS).
