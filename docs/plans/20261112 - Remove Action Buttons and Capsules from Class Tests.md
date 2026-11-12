# Implementation Plan — Remove Action Buttons, Eradicate Capsules & Universal 50px Lower Panel Architecture in Class Hub

## Goal Description
In the **Class Hub** screen (`admin.html#class-hub`), specifically within the **Class Tests** and **Students Grade and Score** (attendance) tabs:
1. **Eradicate Capsule Elements**: Table data cells for `CODE`, `PREREQUISITE`, `PASS (%)`, and `STATUS` in Class Tests still contain bordered capsule boxes, pill badges, and input borders in view mode. These must be replaced with pristine, flat, high-contrast text adhering strictly to TopsCore UI Invariants (AGENTS.md Rule 2.20 & Rule 4/10).
2. **Purge Actions Column**: The rightmost `actions` column contains 6 clustered buttons (`Results`, `Recalibrate`, `Duplicate`, `Publish Eye`, `Edit Pencil`, `Delete Trash Can`) that take up excessive horizontal space and clutter the interface. Per user direction, this entire column and its contents will be completely removed.
3. **Direct In-Place Title Renaming**: In place of the removed edit/pencil button, test titles will be directly editable when **Master Edit Mode is ON** via a borderless Excel-like inline input with auto-save on blur or `Enter`.
4. **Interactive Status Column in Edit Mode**:
   - In **View Mode (Edit: OFF)**: Renders clean flat text (`PUBLISHED` in emerald green `#00c000`, `DRAFT` in slate `#94a3b8`).
   - In **Edit Mode (Edit: ON)**: Renders an Excel-like flat `<select>` dropdown allowing direct selection between `PUBLISHED`, `DRAFT`, or `🗑️ DELETE`. Selecting `delete` prompts an explicit confirmation dialog before executing the soft-delete routine.
5. **Universal 50px Lower Panel Always Visible (Across All Room Views)**:
   - In `Class Tests`, the lower panel was completely missing from the viewport.
   - In `Students Grade and Score`, the lower panel had `edit-mode-only` with `display:none;`, disappearing completely when Edit Mode was OFF.
   - Per TopsCore Rule 3 and user specification, the 50px lower panel (`.workspace-lower-panel`) must **ALWAYS BE VISIBLE** across all room screens/tabs (even if empty of action buttons in View Mode). It maintains a strict 50px fixed height aligned seamlessly with `.sidebar-footer`, separated by a strict 10px container gap.
6. **Relocate Test Features to Class Tests Lower Panel**:
   - Move `[⚙️ Test System Settings]`, `[🗺️ Open Test Blueprint ↗]`, and `[⚡ Generator & Settings Wizard]` from the attendance/grades lower panel into the **Class Tests** lower panel, where they logically belong.
   - The attendance lower panel retains `[🛡️ Forgiven & Override]` alongside student enrollment metrics.

---

## User Review Required

> [!IMPORTANT]
> **Universal Lower Panel Always Visible (Rule 3 & Sec 2.20)**:
> The 50px lower panel (`.workspace-lower-panel`) container will **NEVER collapse or disappear** on any tab.
> - **In View Mode (Edit: OFF)**: The panel container remains docked at the bottom with exact 50px height and 10px gap, displaying non-destructive summary metrics (`Total Tests: N`, `N Enrolled`).
> - **In Edit Mode (Edit: ON)**: Action buttons (`.edit-mode-only`) dynamically reveal inside the lower panel.

> [!IMPORTANT]
> **Relocation of 3 Test Creation & System Buttons**:
> - `⚙️ Test System Settings` (`btn-open-blueprint-settings`), `🗺️ Open Test Blueprint ↗` (`btn-open-blueprint-from-class`), and `⚡ Generator & Settings Wizard` (`btn-open-generator-from-class`) are permanently moved from the attendance matrix to the **Class Tests** lower panel.
> - `🛡️ Forgiven & Override` remains docked in the **Students Grade and Score** lower panel.

> [!IMPORTANT]
> **Complete Removal of Actions Column in Class Tests**:
> The `actions` column (`Results`, `Recalibrate`, `Duplicate`, `Publish`, `Edit`, `Delete`) is permanently removed from the Class Tests table.
> - **Rename**: Directly available inline by clicking into the `TITLE` cell when Edit Mode is ON.
> - **Status & Delete**: Managed directly via the `STATUS` dropdown when Edit Mode is ON (`PUBLISHED`, `DRAFT`, or `🗑️ DELETE`).
> - **Recalibrate & Duplicate**: Permanently purged from the quick-action row as requested. Test Results remain accessible via the main `Results` section and Student Grade matrix.

> [!IMPORTANT]
> **Zero-Capsule View Mode Invariant**:
> In compliance with TopsCore UI Invariants:
> - `CODE` renders as borderless flat text (`#38bdf8`, monospace, 12px, font-weight 500).
> - `PREREQUISITE` renders as borderless flat text (`⚠️ <prereq>` in `#f59e0b` or `—` in `#94a3b8`, 12px, font-weight 500).
> - `PASS (%)` renders as pure flat text in View Mode (`🎯 <minScore>%`, 12px, font-weight 500, tabular-nums). The input box is exclusively rendered when Edit Mode is ON as a borderless transparent cell.
> - `STATUS` renders as pure flat text (`PUBLISHED` / `DRAFT`) with zero `.badge` capsule pill borders or backgrounds.

---

### 📐 Visual Pre-Flight Verification Checklist
- [x] **Current State Screenshot (Before)**: Embedded baseline visual showing existing appearance, missing lower panel in tests, and button cluster in attendance.
- [x] **Proposed Visual Mockup (After)**: Interactive generative UI widget showing the new layout in both View Mode and Edit Mode with persistent 50px lower panels.
- [x] **Zero Outer Page Scroll**: Verified root `100vh` lock with `calc(100vh - 60px)` console sizing.
- [x] **Container Spacing**: Verified strict 10px gap between all cards, tables, and top/lower panels.
- [x] **Lower Panel Alignment**: Verified 50px fixed height aligned with `.sidebar-footer`, always visible across both tabs.
- [x] **Dynamic Columns & Nowrap**: Verified `white-space: nowrap !important;` on table cells with zero clipped text.
- [x] **Zero Dead Space**: Verified tables expand to fill 100% width cleanly with space distributed to TITLE and metric columns.
- [x] **Language Standard**: Verified all headers, labels, and status options use 100% direct English.

---

## Visual Baseline & Proposed Mockup

### 1. Current State Baseline (Before)

#### A. Class Tests Tab (Missing Lower Panel & Capsule Cells)
![Class Tests Missing Lower Panel (Before)](/C:/Users/ASUS/.gemini/antigravity/brain/4d871d23-752c-41b3-9db6-2006f3117ad0/before_tests_no_lower_panel.jpg)

#### B. Attendance Tab (Lower Panel Action Buttons to be Relocated)
![Attendance Lower Panel Buttons (Before)](/C:/Users/ASUS/.gemini/antigravity/brain/4d871d23-752c-41b3-9db6-2006f3117ad0/attendance_lower_panel_buttons.jpg)

#### C. Class Tests Rightmost Action Buttons Column (To be Purged)
![Class Tests Action Buttons Column (Before)](/C:/Users/ASUS/.gemini/antigravity/brain/4d871d23-752c-41b3-9db6-2006f3117ad0/before_class_tests_actions.png)

---

### 2. Proposed Visual Mockup (After)

```html
<!-- Proposed Class Tests Tab & Universal 50px Lower Panel -->
<div style="background: #0b1120; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 16px; font-family: Inter, sans-serif; color: #f8fafc;">
  
  <!-- VIEW MODE (EDIT: OFF) -->
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
    <span style="font-weight: 700; font-size: 13px; color: #38bdf8;">CLASS TESTS — VIEW MODE (EDIT: OFF)</span>
    <span style="font-size: 11px; color: #94a3b8;">50px Lower Panel Always Visible (Summary Only)</span>
  </div>

  <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px;">
    <thead>
      <tr style="background: #0d1527; color: #94a3b8; text-transform: uppercase; font-size: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
        <th style="padding: 8px 12px; text-align: left; font-weight: 700;">TITLE</th>
        <th style="padding: 8px 12px; text-align: left; font-weight: 700;">CODE</th>
        <th style="padding: 8px 12px; text-align: left; font-weight: 700;">PREREQUISITE</th>
        <th style="padding: 8px 10px; text-align: center; font-weight: 700;">TYPE</th>
        <th style="padding: 8px 10px; text-align: center; font-weight: 700;">ANSWER</th>
        <th style="padding: 8px 10px; text-align: center; font-weight: 700;">ACCESS</th>
        <th style="padding: 8px 10px; text-align: center; font-weight: 700;">DUR. (M)</th>
        <th style="padding: 8px 10px; text-align: center; font-weight: 700;">PASS (%)</th>
        <th style="padding: 8px 10px; text-align: center; font-weight: 700;">QS</th>
        <th style="padding: 8px 12px; text-align: center; font-weight: 700;">STATUS</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
        <td style="padding: 8px 12px; font-weight: 500; color: #f8fafc; white-space: nowrap;">2nd Vocabulary A1 Words <span style="color: #ffff00;">Task</span> - Introduction & Delivery</td>
        <td style="padding: 8px 12px; font-family: monospace; color: #38bdf8; font-weight: 500; white-space: nowrap;">2A1-WORDS-TASK</td>
        <td style="padding: 8px 12px; color: #94a3b8; font-weight: 500; white-space: nowrap;">—</td>
        <td style="padding: 8px 10px; text-align: center; color: #ffff00; font-weight: 700; white-space: nowrap;">TASK</td>
        <td style="padding: 8px 10px; text-align: center; color: #38bdf8; font-weight: 500; white-space: nowrap;">🗣 Spoken</td>
        <td style="padding: 8px 10px; text-align: center; color: #94a3b8; font-weight: 500; white-space: nowrap;">🔀 Rand</td>
        <td style="padding: 8px 10px; text-align: center; color: #94a3b8; font-weight: 500; white-space: nowrap;">⏱️ 15</td>
        <td style="padding: 8px 10px; text-align: center; color: #eab308; font-weight: 500; white-space: nowrap;">🎯 70%</td>
        <td style="padding: 8px 10px; text-align: center; color: #38bdf8; font-weight: 500; white-space: nowrap;">⚡ 40 (Vault)</td>
        <td style="padding: 8px 12px; text-align: center; color: #94a3b8; font-weight: 600; text-transform: uppercase; white-space: nowrap;">DRAFT</td>
      </tr>
    </tbody>
  </table>

  <!-- 50px Lower Panel (View Mode) -->
  <div style="height: 50px; background: #070d19; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; display: flex; justify-content: space-between; align-items: center; padding: 0 16px; margin-bottom: 24px;">
    <div style="font-size: 12px; color: #64748b;">
      <span>🔒 Master Edit Mode is OFF. Toggle EDIT in topbar to rename or manage tests.</span>
    </div>
    <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">
      <span>Total Tests: <strong style="color: #f8fafc;">19</strong></span>
    </div>
  </div>

  <!-- EDIT MODE (EDIT: ON) -->
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
    <span style="font-weight: 700; font-size: 13px; color: #10b981;">CLASS TESTS — EDIT MODE (EDIT: ON)</span>
    <span style="font-size: 11px; color: #10b981;">Excel Gridlines, Direct Rename, Dropdown Status, Relocated Action Buttons</span>
  </div>

  <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 10px;">
    <thead>
      <tr style="background: #0d1527; color: #94a3b8; text-transform: uppercase; font-size: 12px; border-bottom: 1px solid rgba(255,255,255,0.45);">
        <th style="padding: 6px 10px; text-align: left; font-weight: 700; border-right: 1px solid rgba(255,255,255,0.45);">TITLE (DIRECT RENAME)</th>
        <th style="padding: 6px 10px; text-align: left; font-weight: 700; border-right: 1px solid rgba(255,255,255,0.45);">CODE</th>
        <th style="padding: 6px 10px; text-align: left; font-weight: 700; border-right: 1px solid rgba(255,255,255,0.45);">PREREQUISITE</th>
        <th style="padding: 6px 8px; text-align: center; font-weight: 700; border-right: 1px solid rgba(255,255,255,0.45);">TYPE</th>
        <th style="padding: 6px 8px; text-align: center; font-weight: 700; border-right: 1px solid rgba(255,255,255,0.45);">ANSWER</th>
        <th style="padding: 6px 8px; text-align: center; font-weight: 700; border-right: 1px solid rgba(255,255,255,0.45);">ACCESS</th>
        <th style="padding: 6px 8px; text-align: center; font-weight: 700; border-right: 1px solid rgba(255,255,255,0.45);">DUR. (M)</th>
        <th style="padding: 6px 8px; text-align: center; font-weight: 700; border-right: 1px solid rgba(255,255,255,0.45);">PASS (%)</th>
        <th style="padding: 6px 8px; text-align: center; font-weight: 700; border-right: 1px solid rgba(255,255,255,0.45);">QS</th>
        <th style="padding: 6px 10px; text-align: center; font-weight: 700; border-right: 1px solid rgba(255,255,255,0.45);">STATUS (CHOOSE)</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.45); background: rgba(255,255,255,0.03);">
        <td style="padding: 2px 4px; border-right: 1px solid rgba(255,255,255,0.45);">
          <input type="text" value="2nd Vocabulary A1 Words Task - Introduction &amp; Delivery" style="width: 100%; height: 24px; background: transparent; border: none; color: #fff; font-size: 12px; font-weight: 600; padding: 0 4px;" title="Direct inline rename" />
        </td>
        <td style="padding: 6px 10px; font-family: monospace; color: #38bdf8; font-weight: 500; border-right: 1px solid rgba(255,255,255,0.45);">2A1-WORDS-TASK</td>
        <td style="padding: 6px 10px; color: #94a3b8; font-weight: 500; border-right: 1px solid rgba(255,255,255,0.45);">—</td>
        <td style="padding: 6px 8px; text-align: center; color: #ffff00; font-weight: 700; border-right: 1px solid rgba(255,255,255,0.45);">TASK</td>
        <td style="padding: 6px 8px; text-align: center; color: #38bdf8; font-weight: 500; border-right: 1px solid rgba(255,255,255,0.45);">🗣 Spoken</td>
        <td style="padding: 6px 8px; text-align: center; color: #94a3b8; font-weight: 500; border-right: 1px solid rgba(255,255,255,0.45);">🔀 Rand</td>
        <td style="padding: 6px 8px; text-align: center; color: #94a3b8; font-weight: 500; border-right: 1px solid rgba(255,255,255,0.45);">⏱️ 15</td>
        <td style="padding: 2px 4px; text-align: center; border-right: 1px solid rgba(255,255,255,0.45);">
          <span style="font-size: 11px; color: #eab308;">🎯</span>
          <input type="number" value="70" style="width: 36px; height: 24px; background: transparent; border: none; color: #fff; font-size: 12px; font-weight: 600; text-align: center;" />%
        </td>
        <td style="padding: 6px 8px; text-align: center; color: #38bdf8; font-weight: 500; border-right: 1px solid rgba(255,255,255,0.45);">⚡ 40 (Vault)</td>
        <td style="padding: 2px 4px; text-align: center; border-right: 1px solid rgba(255,255,255,0.45);">
          <select style="background: transparent; border: none; color: #94a3b8; font-size: 12px; font-weight: 700; cursor: pointer; text-transform: uppercase;">
            <option value="draft" selected style="background: #0f172a; color: #94a3b8;">DRAFT</option>
            <option value="published" style="background: #0f172a; color: #00c000;">PUBLISHED</option>
            <option value="delete" style="background: #0f172a; color: #ef4444; font-weight: bold;">🗑️ DELETE</option>
          </select>
        </td>
      </tr>
    </tbody>
  </table>

  <!-- 50px Lower Panel (Edit Mode with Relocated Action Buttons) -->
  <div style="height: 50px; background: #070d19; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; display: flex; justify-content: space-between; align-items: center; padding: 0 16px;">
    <div style="display: flex; align-items: center; gap: 8px;">
      <button type="button" style="font-size: 12px; font-weight: 700; background: #0ea5e9; border: 1px solid #0ea5e9; color: #fff; padding: 4px 12px; border-radius: 4px; cursor: pointer;">
        ⚙️ Test System Settings
      </button>
      <button type="button" style="font-size: 12px; font-weight: 600; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); color: #fff; padding: 4px 12px; border-radius: 4px; cursor: pointer;">
        🗺️ Open Test Blueprint ↗
      </button>
      <button type="button" style="font-size: 12px; font-weight: 700; background: #4f46e5; border: 1px solid #4f46e5; color: #fff; padding: 4px 12px; border-radius: 4px; cursor: pointer;">
        ⚡ Generator &amp; Settings Wizard
      </button>
    </div>
    <div style="font-size: 12px; color: #94a3b8; font-weight: 500;">
      <span>Total Tests: <strong style="color: #f8fafc;">19</strong></span>
    </div>
  </div>

</div>
```

---

## Proposed Changes

### Component 1: `js/admin/app.js` (Class Tests & Attendance Views)

#### [MODIFY] `js/admin/app.js`

1. **Tab Structure Layout & Universal 50px Lower Panel Addition (lines 1850–1878)**:
   - **`tests` tab (`window._classHubActiveTab === 'tests'`)**:
     Replace container with flex layout containing:
     - `#class-tests-grid` with `flex: 1 1 0; min-height: 0; display: flex; flex-direction: column; overflow: hidden;`
     - `.class-tests-toolbar.workspace-lower-panel` with:
       `height: 50px !important; min-height: 50px !important; max-height: 50px !important; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; padding: 0 12px; box-sizing: border-box;`
     - Inside this lower panel:
       - `.class-tests-actions-cluster.edit-mode-only`:
         - `⚙️ Test System Settings` (`id="btn-open-blueprint-settings"`)
         - `🗺️ Open Test Blueprint ↗` (`id="btn-open-blueprint-from-class"`)
         - `⚡ Generator & Settings Wizard` (`id="btn-open-generator-from-class"`)
       - `.class-tests-summary-cluster`:
         - Displays `Total Tests: ${classTests.length}` (always visible).
   - **`attendance` tab (`window._classHubActiveTab === 'attendance'`)**:
     - Remove `edit-mode-only` and `style="display:none;"` from the `.attendance-matrix-toolbar.workspace-lower-panel` container element so it is **ALWAYS VISIBLE**.
     - Set exact height: `height: 50px !important; min-height: 50px !important; max-height: 50px !important; box-sizing: border-box;`
     - Retain `🛡️ Forgiven & Override` (`id="btn-open-forgiven-wizard"`) inside `.edit-mode-only`.
     - Remove the 3 relocated test buttons (`btn-open-blueprint-settings`, `btn-open-blueprint-from-class`, `btn-open-generator-from-class`) from the attendance toolbar.
     - Add `.attendance-summary-cluster` displaying enrolled student count (always visible).

2. **Columns Definition in `classAsmGrid` (lines 1943–2074)**:
   - **`title`**:
     - When `isEditMode === false`: Renders flat text with keyword highlighting (`Task` yellow, `Exam`/`Test` pink), font-size 12px, font-weight 500.
     - When `isEditMode === true`: Renders flat `<input type="text" class="input-test-title edit-mode-flat-input" data-test-id="${row.id}" data-original-val="${escapeHtml(row.title)}" value="${escapeHtml(row.title)}" style="width:100%; min-width:240px; height:24px; padding:0 4px; font-size:12px; font-weight:600; background:transparent !important; border:none !important; border-radius:0 !important; color:var(--clr-text-1); outline:none;" />`.
   - **`order` (`CODE`)**:
     - Purge `background`, `border`, `border-radius`, and capsule padding.
     - Render pure flat text: `<span style="font-size:12px; color:var(--clr-primary, #38bdf8); font-family:var(--font-mono, monospace); font-weight:500; white-space:nowrap;" title="${escapeHtml(row.shellCode)}">${escapeHtml(row.shellCode)}</span>`.
   - **`prereq` (`PREREQUISITE`)**:
     - Purge `background`, `border`, `border-radius`, and capsule padding.
     - Render pure flat text: `<span style="font-size:12px; color:var(--clr-warning, #f59e0b); font-family:var(--font-mono, monospace); font-weight:500; white-space:nowrap;" title="${escapeHtml(prereqDisplay)}">⚠️ ${escapeHtml(prereqDisplay)}</span>` or `<span class="text-muted" style="font-size:12px; font-weight:500;">—</span>`.
   - **`TestCategory` (`TYPE`)**:
     - Set font-size to 12px, font-weight 500 (with bold keywords 700), pure flat text.
   - **`answerType` (`ANSWER`)**:
     - Set font-size to 12px, font-weight 500, pure flat text.
   - **`questionOrder` (`ACCESS`)**:
     - Set font-size to 12px, font-weight 500, pure flat text.
   - **`timeLimit` (`DUR. (M)`)**:
     - Set font-size to 12px, font-weight 500, pure flat text.
   - **`minScore` (`PASS (%)`)**:
     - When `isEditMode === false`: Render flat text `<div style="display:inline-flex; align-items:center; justify-content:center; gap:3px; font-size:12px; font-weight:500; font-variant-numeric:tabular-nums; color:${isExamTest ? '#f472b6' : '#eab308'};"><span style="font-size:11px;">🎯</span><span>${currentMin}%</span></div>`. ZERO `<input>` rendered.
     - When `isEditMode === true`: Render borderless transparent input `<input type="number" class="input-test-pass-score edit-mode-flat-input" data-test-id="${testId}" value="${currentMin}" min="1" max="100" style="width:42px; height:24px; padding:0; font-size:12px; font-weight:600; text-align:center; background:transparent !important; border:none !important; border-radius:0 !important; color:#f8fafc; outline:none;" />%`.
   - **`qCount` (`QS`)**:
     - Set font-size to 12px, font-weight 500, pure flat text.
   - **`status` (`STATUS`)**:
     - When `isEditMode === false`: Render flat text `<span style="font-size:12px; font-weight:600; text-transform:uppercase; color:${isPub ? 'var(--grade-a, #00c000)' : '#94a3b8'};">${escapeHtml(st)}</span>`. ZERO badge capsule styling.
     - When `isEditMode === true`: Render flat dropdown `<select class="input-test-status-select edit-mode-flat-select" data-test-id="${row.id}" data-test-title="${escapeHtml(row.title)}" data-original-status="${stLower}" style="background:transparent !important; border:none !important; border-radius:0 !important; color:${stLower === 'published' ? 'var(--grade-a, #00c000)' : '#94a3b8'}; font-size:12px !important; font-weight:700; cursor:pointer; text-transform:uppercase; padding:2px 4px; outline:none;">` with options:
       - `<option value="published" ${stLower === 'published' ? 'selected' : ''} style="background:#0f172a; color:var(--grade-a, #00c000);">PUBLISHED</option>`
       - `<option value="draft" ${stLower === 'draft' ? 'selected' : ''} style="background:#0f172a; color:#94a3b8;">DRAFT</option>`
       - `<option value="delete" style="background:#0f172a; color:#ef4444; font-weight:bold;">🗑️ DELETE</option>`
   - **`actions`**:
     - **COMPLETELY PURGED**. Remove `{ key: 'actions', ... }` from `columns` array.

3. **Event Listeners for Direct Renaming, Status & Delete on `#class-tests-grid`**:
   - Store instance reference: `window._classAsmGridInstance = classAsmGrid;`
   - Wire `admin-edit-mode-changed` listener to call `window._classAsmGridInstance?.render()`, seamlessly swapping view mode and edit mode.
   - Add status select listener:
     - On change, if `val === 'delete'`, prompt:
       `if (confirm('Are you sure you want to delete test "' + testTitle + '"?\nThis action will soft-delete the test.'))`
       Call `await window._deleteRecord('tests', testId, testTitle);` and refresh view. If cancelled, revert select.
     - If `val === 'published'` or `'draft'`, call `await adminUpdate('tests', testId, { status: val.toUpperCase() })`, update local data and show success toast.
   - Add title rename listener:
     - On blur or Enter key: validate trimmed title. If non-empty and changed from `dataset.originalVal`, call `await adminUpdate('tests', testId, { title: newTitle })`, update cached record, and show toast.
   - Wire event listeners for `btn-open-blueprint-settings`, `btn-open-blueprint-from-class`, and `btn-open-generator-from-class` directly in the `tests` tab initialization.

---

### Component 2: `js/admin/classes-management.js` & Legacy Table Hygiene

#### [MODIFY] `js/admin/classes-management.js`
- Clean up legacy `order` (`CODE`) column line 793 to remove `background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.1);`. Render pure flat text `span`.

---

## Verification Plan

### Automated Tests
Execute an automated verification script:
`node scripts/verify_class_tests_no_capsule.mjs`

Assertions verified:
1. `classAsmGrid` has NO `actions` column in its columns definition.
2. In View Mode (`getGlobalEditMode() === false`):
   - `CODE` contains NO `rgba(255,255,255,0.05)`, NO `border-radius`, NO `border:1px solid`.
   - `PREREQUISITE` contains NO `rgba(255,255,255,0.05)`, NO `border-radius`, NO `border:1px solid`.
   - `PASS (%)` renders flat text and NO `<input>` when Edit Mode is OFF.
   - `STATUS` renders flat text and NO `class="badge"`.
3. In Edit Mode (`getGlobalEditMode() === true`):
   - `TITLE` column renders `<input type="text" class="input-test-title edit-mode-flat-input" ... />` for direct renaming.
   - `PASS (%)` renders borderless transparent input.
   - `STATUS` renders `<select class="input-test-status-select edit-mode-flat-select" ...>` containing `PUBLISHED`, `DRAFT`, and `DELETE`.
4. Lower Panel Architecture:
   - Verified 50px fixed height (`height: 50px !important; min-height: 50px !important; max-height: 50px !important;`) on `.workspace-lower-panel` in both `tests` and `attendance` tabs.
   - Verified lower panel container is ALWAYS VISIBLE (no `display: none` or `edit-mode-only` on the outer panel container).
   - Verified `btn-open-blueprint-settings`, `btn-open-blueprint-from-class`, and `btn-open-generator-from-class` are located in the `tests` tab lower panel.
   - Verified `btn-open-forgiven-wizard` is located in the `attendance` tab lower panel.
5. Event listeners for `change` on status select, inline rename, and `admin-edit-mode-changed` are verified present.
6. Zero sub-11px font sizes (`0.65rem`, `0.70rem` eliminated).

### Automated Pre-Flight Gate
Run:
`node scripts/verify_plan_preflight.mjs "docs/plans/20261112 - Remove Action Buttons and Capsules from Class Tests.md"`
Ensure 100% pre-flight audit pass.
