# TOPSCORE LMS — UI, SPATIAL & TABLE INVARIANTS RULE

## 1. Zero Outer Page Scroll & Table-Only Viewport Lock
The admin workspace (`admin.html`) strictly enforces a single-screen `100vh` viewport lock with ZERO outer scrolling:
- **Root Containment**: `html` and `body` strictly enforce `height: 100vh !important; max-height: 100vh !important; width: 100vw !important; max-width: 100vw !important; overflow: hidden !important; margin: 0 !important; padding: 0 !important;`.
- **Locked Base Banner Compensation**: The locked base footer (`#bottom-ad-banner` / `.topscore-locked-banner`) has a fixed height of `60px`. Therefore, `#admin-console` strictly uses `height: calc(100vh - 60px) !important; max-height: calc(100vh - 60px) !important;` so total page height equals exactly `100vh` with zero pixel overflow.
- **Flexbox Toolbar Non-Expansion**: Toolbars (`.student-roster-toolbar`, `.attendance-matrix-toolbar`, `.datagrid-toolbar`, `.admin-toolbar`) must be `flex: 0 0 auto !important; height: auto !important; min-height: 0 !important;`. Only grid containers receive `flex: 1 1 0 !important; min-height: 0 !important;`.
- **Empty Toolbar Collapse in Edit Mode OFF**: When Edit Mode is OFF, any action toolbar containing only hidden `.edit-mode-only` buttons must completely collapse (`display: none !important; margin: 0 !important; padding: 0 !important;`).
- **Table-Only Vertical Scroll & Native Table Lock**: HTML tables must strictly preserve native display context (`display: table`, `display: table-row-group`, etc. — NEVER `display: flex` or `grid`). Vertical scrolling is permitted EXCLUSIVELY inside `.table-wrap { overflow-y: auto; }`. Headers (`thead th`) stick to top (`top: 0`), footers (`tfoot`) stick to bottom (`bottom: 0`). Empty footers collapse (`tfoot:empty { display: none !important; }`).

## 2. Global Master Edit Mode Across All Admin Pages (Pristine Read-Only View vs Excel-Like Edit Mode & Zero Inner Capsule Invariant)
All admin screens strictly obey the Master Edit Mode toggle in `admin-topbar`:
- **Absolute Hiding when OFF (Pristine View Mode)**: When Edit Mode is OFF, ALL edit buttons, rename pencils, delete trash cans, inline input steppers, "+ Add" creation buttons, manual score overrides, and destructive actions MUST be COMPLETELY HIDDEN (`display: none !important;`). The interface renders as a pristine, distraction-free view across Curriculum, Dashboard, Organization, Batches, Student Registration, Class Hub, Vocabulary Vault, Modules, and System Settings. Zero table cells, numbers, scores, counts, or statuses may render inside capsule badges or bordered pill boxes.
- **Edit Mode (Edit Mode ON)**: Table column and row gridlines (`th`, `td`) across ALL tables turn crisp WHITE (`border-right: 1px solid rgba(255, 255, 255, 0.45); border-bottom: 1px solid rgba(255, 255, 255, 0.45)`). Inputs inside cells are completely borderless (`border: none !important`), transparent (`background: transparent !important`), and zero-radius (`border-radius: 0 !important`). ZERO inner boxes or capsules inside table cells. The Excel gridline of the cell itself serves as the sole boundary.
- **Universal Synchronization**: In-place edits to Student Name, Gender, DOB, Education, Exam Scores, and Status auto-sync immediately to Supabase and cache, updating all dependent views from a single source of truth.

## 3. Universal Lower Panel Architecture, Table Workspace Containment & 10px Container Gap
- **Strict 40px Height Alignment**: The lower panel (`.workspace-lower-panel`) strictly has an exact height of `40px` (`height: 40px !important; min-height: 40px !important; max-height: 40px !important; box-sizing: border-box;`), seamlessly matching the 40px sidebar footer (`.sidebar-footer`). Table summary rows (`tfoot`) strictly enforce `32px` height (`height: 32px !important; min-height: 32px !important; max-height: 32px !important; line-height: 32px !important;`), harmoniously matching data row cadence (`24px–28px`).
- **Table Workspace Containment & Lower Panel Separation**: All tables (`thead`, `tbody`, `tfoot`) live 100% inside the workspace container (`#student-grid-container` / `.table-wrap`). Table footers (`tfoot`) must NEVER enter the lower panel.
- **Lower Panel Payload**: Docked flush at the bottom (0px margin to bottom banner and side panel) reserved exclusively for action toolbars (`[🚀 NEXT]`, `[➕ Add Student]`, `[📥 Import Excel/CSV]`), summary info, search, and triage pills.
- **Universal 10px Container Gap Invariant**: Every card, panel, table container, workspace toolbar, and banner across all admin screens strictly enforces an exact 10px gap (`gap: 10px !important;` or `margin-bottom: 10px !important;`). A strict 10px gap separates the table container from the lower panel.

## 4. Single-Responsibility Columns & Profile Click Invariant
- **Single-Responsibility Columns (1 Info = 1 Column)**: Every column in every table contains strictly ONE metric or info item. In Student Roster: Photo (30px avatar) and Name are split into 2 dedicated columns. Column sequence: `LEVEL` -> `PHOTO` -> `GENDER (Mr./Miss.)` -> `NAME` -> `DOB` -> `AGE` -> `EDUCATION` -> `CLASS EXAMS` -> `STATUS`.
- **Purge of Actions Column & Accidental Deletion Protection**: In Active Students roster, the Actions column is completely purged. Clicking on a student's Photo or Name directly opens their Dossier Profile modal. Student deletion is restricted exclusively to the Inactive Students tab.
- **No-Capsule View Mode (Edit Mode OFF)**: Zero table cells, numbers, scores, counts, or statuses may render inside capsule badges or bordered pill boxes. Everything renders as clean, flat, high-contrast text with `font-variant-numeric: tabular-nums`.

## 5. Dynamic Column Sizing, Single-Line Text & Zero Dead Space
- **Zero Dead Space & Proportional Width Distribution**: Tables dynamically expand across 100% width (`width: 100% !important;`), distributing space proportionally across all columns without leaving empty voids in the center or clustering columns at the edges.
- **Harmonious Proportional Allocation**:
  - Flexible text columns (`STUDENT NAME`, `PROGRAM`, `INSTITUTION`) expand naturally with balanced minimum widths (e.g., Name min-width: 220px–320px).
  - Metric and exam columns (`TASK`, `PTS`, `SCR`, `Exam 1–4`) scale proportionately with comfortable widths (min-width: 65px–140px) to absorb available viewport space gracefully.
  - Hardcoded micro-widths (< 50px) that cause header text clipping (e.g. 'INSTIT', 'PROGRA', 'RATCH') and rigid broken sticky offsets that create artificial voids are strictly forbidden.
- **Single-Line Non-Wrapped Text**: Table cell text must NEVER wrap onto multiple lines (`white-space: nowrap !important; text-overflow: ellipsis; overflow: hidden;`). Strictly 1 line.
- **Typography**: Uniform font sizing across cells and headers (`font-size: 0.78rem` to `0.8rem`). No clipped text.

## 6. Pure Direct English UI Standard
- All user interfaces, navigation menus, tab titles, table column headers, status labels, buttons, tooltips, dialogs, toasts, and system messages across all pages (`index.html`, `dashboard.html`, `test.html`, `result.html`, `admin.html`) must use direct, professional English.
- Sole permissible exception: Indonesian vocabulary meaning inside Vocabulary Vault (`vocabulary_vault.meaning`).

## 7. Centered Loading States & Canonical Component Invariant
- All loading spinners and indicators in Tutor's Room must strictly render centered horizontally and vertically (`display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; width: 100% !important; height: 100% !important; min-height: calc(100vh - 200px) !important; flex: 1 1 0 !important; margin: auto !important; box-sizing: border-box !important;`).
- **Zero Side-Drifting & Zero Top-Offsetting**: All parent and tab containers (`#class-hub-tab-content`, `.workspace-content`, `.tab-content`) must enforce `width: 100% !important; height: 100% !important; flex: 1 1 0 !important; display: flex !important; flex-direction: column !important;`.
- **Canonical Helper**: All dynamic asynchronous views must use `getLoadingStateHtml(message)` exported from `js/admin/app.js`.
- All loading status messages must use professional English.

## 8. Universal Table Standardization Protocol & Construction Blueprint
All data tables across TopsCore strictly enforce the 8-pillar standardization invariant:
1. **Spatial View Margins & Flush Base Docking**: Table container (`.table-wrap`) strictly adheres to `10px` top, `10px` sides, and `0px` bottom (`margin: 10px 10px 0 10px !important;`), flush docked to the 60px bottom banner (`#bottom-ad-banner`).
2. **Uniform Font Size (11px) & Single-Line Text**: Header text (`th`), data cells (`td`), super-headers, and inputs strictly enforce uniform `font-size: 11px !important; line-height: 1.3 !important;`. Cell text must NEVER wrap (`white-space: nowrap !important; text-overflow: ellipsis; overflow: hidden;`).
3. **Superscript Tag Standard**: Remedial tags (`<sup>R</sup>`) and waiver tags (`<sup>F</sup>`) strictly enforce `font-size: 1.0em !important; font-weight: 900 !important; vertical-align: super !important; line-height: 0 !important;`.
4. **Two-Tier Sticky Header Locking**: Super-headers are sticky at `top: 0 !important; z-index: 20 !important; height: 24px !important;`, sub-headers are sticky at `top: 24px !important; z-index: 19 !important; height: 24px !important;` with solid opaque backgrounds (`#0d1527` / `#0b1120`). Single headers sticky at `top: 0 !important; z-index: 10 !important; height: 28px !important;`.
5. **Small Table Anti-Ballooning & Sticky Footer Docking**: In `fitMatrixToScreen()` and CSS, row heights are bounded between `24px` and `32px` (`min: 24px, max: 32px`). Small rosters (< 15 rows) do not stretch or balloon (`height: auto !important;`), empty space is absorbed cleanly by an invisible `<tr class="table-spacer-row"><td colspan="..."></td></tr>` in `tbody`, and vertical scrollbars are dynamically eliminated (`overflow-y: hidden`). Summary rows (`tfoot`, `BATCH AVG`, Grand Totals) must ALWAYS remain docked at the bottom of the table container (`position: sticky; bottom: 0;`), flush against the 40px lower panel. DILARANG KERAS menerapkan `display: flex` pada tabel untuk docking footer.
6. **Active-Only Sort Arrow (No Idle ⇅)**: The ambiguous idle `⇅` sort icon is strictly purged across all tables. Sort indicators `▲` (asc) or `▼` (desc) in tactical cyan (`#38bdf8`) appear EXCLUSIVELY when a column is actively clicked and sorted.
7. **Pure Direct English & Grade Star Contrast**: All table headers, KPI labels, and modals use 100% direct English (Rule 2.30). Circular Star grade badges strictly enforce `#0F172A` dark slate text (Rule 2.10).
8. **Master Edit Mode Table Input Safeguards**: In both view mode and edit mode, zero capsule pills around data. When Master Edit Mode is ON, interactive table inputs are completely flat, borderless, and transparent (`border: none !important; border-radius: 0 !important; background: transparent !important; height: 24px !important; font-size: 11px !important; padding: 2px 6px !important;`), framed solely by the crisp white Excel table cell gridlines.

## 9. Header-Only Bold Discipline & Zero Data Cell Bold Overuse
- **Headers & Sub-headers**: Font weight `700` (Bold) or `800` (Extra Bold).
- **Table Data Cells & Numbers**: Strictly `font-weight: 400` (Normal) or `500` (Medium). Zero bold on standard numbers, scores, theme names, or student names. Let color, contrast, and alignment drive hierarchy — not heavy bolding.

## 10. Single-Line Compact Program Chips (Official 3–4 Letter Codes)
- Assigned programs/institutions must render on a **SINGLE non-wrapping line** (`white-space: nowrap !important;`) using standardized 3–4 letter uppercase codes: `CMP` (Camp), `EVN` (Evnikom), `SHR` (Sheraton), `EXP` (English Explorer).
- Multi-line stacking of program badges that expands table row height is strictly prohibited.
- Full program names appear via native HTML tooltip (`title="Camp, Evnikom, Sheraton"`).

## 11. Eradication of Multiple Selection Checkbox Columns
- Unused leftmost multi-selection checkbox columns (`bulkActions: true`, `.datagrid-select-all`) are completely purged across ALL tables.
- DataGrid instances default `bulkActions: false`. Setting `bulkActions: true` is permanently prohibited.

## 12. Zero Neon Glow on Score Columns
- All `box-shadow` neon glow effects on table columns and dividers are strictly purged.
- Dividers must render as crisp, flat 1px or 2px solid lines without blur or drop-shadow (`border-right: Npx solid <color> !important;` with NO `box-shadow`).

## 13. Dynamic Column Resizing with Persistent Width Memory (Excel-Like)
- **A. Drag Handles**: Each `<th>` renders a subtle 4px vertical resize handle at its right edge. `:hover` color: `rgba(56, 189, 248, 0.5)`; cursor: `col-resize`. Dragging resizes that column via colgroup `<col>` widths in real-time.
- **B. Double-Click Auto-Size (Best-Fit)**: Double-clicking a resize handle triggers auto-size — measures max rendered content width across all cells in that column (`getBoundingClientRect()`) and sets width to `Math.max(headerWidth, maxCellWidth) + 16px`.
- **C. Persistent Width Storage**: Column widths saved to `localStorage` keyed `topscore_col_widths_<table-id>`. Rehydrated before first render; restored on page refresh. Each table maintains an independent width memory.
- **D. Implementation**: All `DataGrid` instances and custom table renderers must expose `initColumnResize(tableId)` called after `renderHeaders()`. Min column width: `40px`, max: `600px`. Reset to defaults via double-click on super-header row (clears the localStorage key).
- **E. Visual Standards**: Handle zone `4px` wide, `position: absolute; right: 0; height: 100%`. Default: `background: transparent`. Hover: `background: rgba(56, 189, 248, 0.5); transition: 0.15s ease`. Active drag: `background: #38bdf8`.

## 14. Tutor's Room 8-Tier Typographic Scale & Zero Sub-11px Invariant
- **Authoritative 8-Tier Scale**:
  - `--tr-font-display`: 20px Outfit 800 (`-0.02em`)
  - `--tr-font-title`: 16px Outfit 700 (`-0.01em`)
  - `--tr-font-subtitle`: 14px Inter 600 (`normal`)
  - `--tr-font-body`: 13px Inter 500 (`normal`)
  - `--tr-font-table`: 11px Inter 500/700 (`normal`)
  - `--tr-font-control`: 11px Inter 600 (`0.02em`)
  - `--tr-font-caption`: 11px Inter 600 (`0.03em`)
  - `--tr-font-mono`: 11px JetBrains Mono / monospace 600 (`normal`)
- **Zero Sub-11px Rule**: Absolutely no text element in Tutor's Room (`admin.html`) may render with a font size smaller than `11px`. Eradicate all instances of `0.65rem` (8.3px), `0.70rem` (8.9px), `8pt`, and `8.5pt`.
- **Font-Weight Hierarchy**: Standard data cells and descriptive text enforce `font-weight: 500` (Medium). Bold (`700/800`) is strictly reserved for primary entity titles, page headers, active tabs, and table headers.
- **Zero Italic Degradation**: Slanted text (`font-style: italic`) is forbidden on dark slate surfaces.

## 15. §TABLE-FLEX-PRIMARY — Flex Primary Column Pattern (Universal Table Standard)

**Applies to:** Any table that uses (or should use) `table-layout: fixed; width: 100%` — includes all `DataGrid` instances and any `.table-wrap table` with explicit `table-layout: fixed`.

**Core Rule:** Under `table-layout: fixed; width: 100%`, assign calibrated fixed pixel widths to N−1 columns, and designate exactly **one primary content column** (the "Flex Primary Column") with **no `width`** and only a `minWidth` guard. The browser natively allocates all remaining viewport space to that column — zero JavaScript required.

**Formula:** `Flex Column Width = Container Width − Σ(All Fixed Column Widths) − scrollbar`

**Implementation Checklist:**
1. Identify the primary content column (usually Name, Title, Word, Question text — the longest, most unique label).
2. Remove its `width:` declaration entirely.
3. Set `minWidth: '<N>px'` (minimum 160px) to prevent collapse on narrow screens.
4. Set `max-width` constraints only on **cell content `<div>` wrappers**, never on the column `width` itself.
5. Calibrate all other columns with accurate fixed pixel widths (content max + padding).
6. Verify: `Σ(fixed widths) + minWidth < container_min_width`. Reduce fixed widths if this fails.
7. **Never** set `autoFitOnMount: true` on a DataGrid that uses this pattern — it defeats the flex calculation.

**Explicit Non-Applicability:**
- 2D coordinate matrix tables (`blueprint-matrix-table`, `class-attendance-grid`) where all columns are semantically equal.
- Transient modal/popup tables where all columns need tight fixed widths.
- Tables that intentionally overflow with a horizontal scrollbar (CSV/import preview tables).

**Current Implementations:**
| Table | File | Flex Primary Column | Fixed Column Sum | Min Safe Container |
|:---|:---|:---|:---|:---|
| Student Roster | `student-management.js` | `sortName` (Name), minWidth 220px | ~780px | 1000px ✅ |
| Class Tests List | `classes-management.js` | `title` (TITLE), minWidth 220px | ~885px | 1105px ✅ |
| Audit & Activity Log | `desk.js` | `new_value` (DETAILS), minWidth 260px | ~600px | 860px ✅ |
| Central Question Bank | `class.js` | `question_text` (QUESTION TEXT), minWidth 240px | ~640px | 880px ✅ |
| Vocabulary Vault | `vocab-vault.js` | `indonesian` (INDONESIAN), minWidth 220px | ~800px | 1020px ✅ |
| Theme Manager | `vocab-vault.js` | `topic` (TOPIC NAME), minWidth 240px | ~854px | 1094px ✅ |

## 16. Universal Single-Source Color Governance & One-Touch Propagation Invariant
All colors across TopsCore LMS strictly obey the single-source-of-truth color tokenization architecture ("Rubah satu, maka rubah semua"):
- **Semua Merah Ikut Grade E (`--grade-e` / `#ff0000`)**: Any red-toned semantic UI element (destructive actions, deletion/purge buttons, incorrect answer indicators, critical strike/danger alerts, required asterisks `*`) MUST strictly reference `--grade-e` / `var(--grade-e)`, `TOPSCORE_COLORS.E`, or `.text-fail`.
- **Semua Kuning Ikut Grade C (`--grade-c` / `#ffff00`)**: Any yellow-toned semantic UI element (caution notices, latency chips, warning banners, draft badges, time-adjustment popovers) MUST strictly reference `--grade-c` / `var(--grade-c)`, `TOPSCORE_COLORS.C`, or `.text-warning`.
- **Semua Hijau Ikut Grade A (`--grade-a` / `#00c000ff`)**: Any green-toned semantic UI element (passing status, telemetry online dot, published state, safe confirmation buttons) MUST strictly reference `--grade-a` / `var(--grade-a)`, `TOPSCORE_COLORS.A`, or `.text-success`.
- **Star Pink Exclusivity (`--grade-star` / `#ff2d87`)**: 100% EXCLUSIVE to Grade Star (100% score). Strictly forbidden on chrome buttons, cards, or non-star badges.
- **Strict Prohibition of Raw Hardcoded Hex**: Raw hex literals (`#ff0000`, `#ffff00`, `#00c000`) must NEVER be hardcoded in CSS rules or JS template strings. Modifying the central token in `:root` MUST instantaneously propagate across both academic evaluation and system UI without secondary edits.
- **System Chrome Canvas**: Non-semantic chrome (workstation canvas `#090D16`, sidebars `#0F172A`, borders `rgba(255, 255, 255, 0.08)`, tactical blue `#38BDF8`, indigo `#6366F1`) strictly uses neutral system tokens.

