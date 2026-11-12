# Governance & AGENTS.md Rules Optimization and Bloat Reduction Plan

> **Plan File:** `docs/plans/20261112 - Governance & AGENTS.md Rules Optimization and Bloat Reduction Plan.md`  
> **Session/Date:** 2026-11-12  
> **Authority Level:** Authoritative Governance Refactoring Plan (`AGENTS.md`, `.antigravityrules`)  

---

## 1. Goal Description

### Context & Problem
Over successive development phases and `/learn` triggers, the system's rules have accumulated across four separate locations:
1. `AGENTS.md` (injected directly into `<user_rules>` in the system prompt on **every single turn**).
2. `.antigravityrules` (the workspace root governance index).
3. `.agents/rules/ui-invariants.md` (modular deep specification for UI & tables).
4. `.agents/rules/agent-workflow.md` (modular deep specification for agent execution protocols).

### Current Pain Points:
1. **One-Off Bugfix Rules Cluttering Governance**:
   - **Rule 29 (`bulkActions: false` / Zero Checkbox Columns)**: A one-off fix from Phase 408/410. It is already the hardcoded default in `DataGrid` (`this.bulkActions = false`) and suppressed in CSS (`.datagrid-select-all { display: none !important; }`).
   - **Rule 30 (`Zero Neon Glow on Score Columns`)**: A one-off aesthetic fix for a cyan box-shadow on attendance score dividers. It is already permanently suppressed in CSS (`box-shadow: none !important;`).
   - **Rule 22 in AGENTS.md (`Side Quest Protocol /btw`)**: An experimental prompt workflow from an older session that is never used in real operations.
   - **Rule 3 & Rule 10 in `.antigravityrules`**: One-off JavaScript bug reminders (`[object Object]` sanitization and local variable scoping) from October 2026 that are already baked into class implementations.
2. **Severe `AGENTS.md` Bloat (Near 24 KB Ceiling)**:
   - `AGENTS.md` has ballooned to **22,212 bytes (305 lines)**!
   - In Section 2, lines 175–258 re-paste 20 sub-rules (`Rule 2.20` through `Rule 2.39`), duplicating the exact text of `.agents/rules/ui-invariants.md` and `.agents/rules/agent-workflow.md`.
   - Because `AGENTS.md` is injected into `<user_rules>` in the system prompt, **every single turn consumes ~5,500 prompt tokens just to load `AGENTS.md`**.
   - If not trimmed, `AGENTS.md` will breach Antigravity's hard 24 KB per-file ceiling and cause token budget warnings or truncation.

### Objective
1. **Prune One-Off Rules**: Safely remove rules 29 and 30, obsolete rule 2.22, and old one-off code snippets from top-level governance.
2. **Consolidate `.antigravityrules`**: Merge duplicate styling rules (e.g. bold discipline into typography, program chips into CSS references) while keeping the exact 4 anchor titles required by automated spatial tests.
3. **Streamline `AGENTS.md`**: Remove the 85-line duplicate block (2.20–2.39), restoring `AGENTS.md` to its original purpose: Executive Authority, Core Business Rules (2.1–2.19), Target Architecture, and the Modular Specification Map.
4. **Token Savings**: Reduce `AGENTS.md` from 22.2 KB to ~12 KB, permanently saving **~2,500 tokens per turn**.

---

## 2. User Review Required

> [!IMPORTANT]
> **Preservation of Core Business Rules**:
> None of the core product business rules (Rules 2.1 through 2.19: ABCD navigation, student login flow, level-centric tests, official grading scale, 8 test modules, AI scoring pipeline, answer tolerance matrix, test lifecycle, historical snapshots, and soft delete) will be removed. They remain 100% intact as the authoritative foundation of TopsCore LMS.

> [!NOTE]
> **Automated Test Compatibility**:
> The automated test suite (`.agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs`) specifically verifies 4 rule titles in `.antigravityrules`:
> - `20. UNIVERSAL LOWER PANEL ARCHITECTURE & 10PX CONTAINER GAP`
> - `21. DYNAMIC COLUMN SIZING, SINGLE-LINE TEXT & ZERO DEAD SPACE INVARIANT`
> - `22. CENTERED LOADING STATES`
> - `25. TUTOR'S ROOM 8-TIER TYPOGRAPHIC SCALE & ZERO SUB-11PX INVARIANT`
>
> All 4 anchor titles will be strictly preserved in `.antigravityrules` in concise, single-line format so automated test passes remain 100%.

---

## 3. Detailed Audit of Target Rules

| Location & Rule # | Rule Name | Nature | Current Enforcement in Code/CSS | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **.antigravityrules #29** | `ZERO CHECKBOX COLUMNS (bulkActions PERMANENTLY FALSE)` | One-off fix (Phase 408/410) | `DataGrid` defaults `bulkActions = false`; CSS suppresses `.datagrid-select-all` | **REMOVE** from `.antigravityrules`. Handled in DataGrid code. |
| **.antigravityrules #30** | `ZERO NEON GLOW ON SCORE COLUMNS` | One-off fix (Phase 408) | `css/admin.css` lines 7280–7284 enforce `box-shadow: none !important` | **REMOVE** from `.antigravityrules`. Handled in CSS. |
| **AGENTS.md #2.22** | `Side Quest Protocol for Side Conversations (/btw)` | Obsolete workflow idea | Never used in active workflow | **REMOVE** from `AGENTS.md`. |
| **.antigravityrules #22** | `CENTERED LOADING STATES & CANONICAL COMPONENT INVARIANT` | UI Component standard | Exported `getLoadingStateHtml()` in `js/admin/app.js` and CSS | **CONDENSE** to 1 line in `.antigravityrules` to keep test passing. Detailed spec stays in `ui-invariants.md`. |
| **.antigravityrules #3** | `DATAGRID CELL SANITIZATION ([object Object])` | One-off code bugfix | Handled in `DataGrid.prototype.renderCell` | **REMOVE** from `.antigravityrules`. Handled in code. |
| **.antigravityrules #10** | `DEFENSIVE PROPERTY SCOPING IN UI & MODALS` | One-off bug reminder | Standard JS local variable scoping | **REMOVE** from `.antigravityrules`. |
| **.antigravityrules #26** | `HEADER-ONLY BOLD DISCIPLINE` | Redundant | Exact duplicate of Rule 25 | **MERGE** into Rule 25. |
| **.antigravityrules #27** | `SINGLE-LINE COMPACT PROGRAM CHIPS` | CSS detail | Handled in `css/admin.css` (`.programs-chip-row`) | **DELEGATE** to `ui-invariants.md`. |
| **.antigravityrules #28** | `FLUSH BASE FOOTER DOCKING & ANTI-BALLOONING` | Redundant | Already covered in Rule 15 & Rule 20 | **MERGE** into Rule 15. |
| **AGENTS.md #2.20–2.39** | 20 Duplicate Sub-Rules (Lines 175–258) | Redundant prose (~8,000 bytes) | Word-for-word copy of `ui-invariants.md` and `agent-workflow.md` | **REPLACE** with clean Pointer Table to modular rule files. |

---

## 4. Proposed Changes

### Component 1: `AGENTS.md` (De-bloat & Token Optimization)

#### [MODIFY] `AGENTS.md`
- Keep Sections 0, 1, 2 (Rules 2.1 to 2.19), 3, 4, 5.
- Replace lines 175–258 ("Declarative UI, Spatial & Workflow Invariants (Pointers to Modular Rules)") with a clean, lightweight pointer table referencing `.agents/rules/ui-invariants.md` and `.agents/rules/agent-workflow.md`.
- Remove obsolete Rule 2.22 (`/btw` Side Quest Protocol).
- **Result:** File shrinks from **22,212 bytes (305 lines)** to **~13,500 bytes (~190 lines)**, saving **~2,500 prompt tokens per turn**.

```markdown
## Declarative UI, Spatial & Workflow Invariants (Modular Reference Map)

Detailed operational and spatial invariants are modularized into dedicated source-of-truth files to preserve token efficiency:

| Domain | Modular Source of Truth | Key Mandates Covered |
| :--- | :--- | :--- |
| **Spatial & Viewport** | [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md) | 100vh lock, zero outer scroll, calc(100vh - 60px) console, 10px container gap, 50px lower panel |
| **Table Architecture** | [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md) | Native table lock, dynamic column sizing, nowrap text, sticky headers/footers, 12px font, Excel gridlines |
| **Edit Mode & Badges** | [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md) | Absolute hiding when Edit OFF, flat grid edit mode (no capsules), single-responsibility columns |
| **Typographic Scale** | [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md) | 8-tier scale (`--tr-font-*`), zero sub-11px text, header-only bold discipline (data cells weight 500) |
| **Loading Components** | [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md) | Centered loading states via canonical `getLoadingStateHtml()`, pure direct English |
| **Agent Execution** | [`.agents/rules/agent-workflow.md`](file:///.agents/rules/agent-workflow.md) | Mandatory `tasks.md` pinned in editor, prompt typo refinement, plan naming & dual-write, pre-flight checks, 100% automated verification, editor tab hygiene (max 3 tabs) |
```

---

### Component 2: `.antigravityrules` (Pruning & Streamlining)

#### [MODIFY] `.antigravityrules`
- Prune one-off rules: Rule 3 (Cell sanitization), Rule 10 (Variable scoping), Rule 26 (Duplicate bold rule), Rule 27 (Program chips CSS), Rule 28 (Duplicate footer docking), Rule 29 (Checkbox column purge), Rule 30 (Neon glow purge).
- Retain exact test-checked titles:
  - `20. UNIVERSAL LOWER PANEL ARCHITECTURE & 10PX CONTAINER GAP`
  - `21. DYNAMIC COLUMN SIZING, SINGLE-LINE TEXT & ZERO DEAD SPACE INVARIANT`
  - `22. CENTERED LOADING STATES`
  - `25. TUTOR'S ROOM 8-TIER TYPOGRAPHIC SCALE & ZERO SUB-11PX INVARIANT`
- Retain core architectural rules: ABCD architecture, Frontend Shield, Answer Key Security, Supabase FK hints, Error Resilience, Strict UTF-8 / PowerShell Ban, Soft-Delete, PostgREST Async, SSOT Grading Colors, Task List on Proceed, Prompt Typo Refinement, Plan Naming & Dual-Write, Tab Hygiene, Visual Pre-Flight, Post-Milestone Compaction.
- **Result:** File shrinks from **6,843 bytes (66 lines)** to **~3,800 bytes (~42 lines)**, eliminating clutter while remaining 100% compliant with spatial checkers.

---

### Component 3: `.agents/rules/ui-invariants.md` & `agent-workflow.md`

#### [MODIFY] `.agents/rules/ui-invariants.md`
- Consolidate Section 8, 13, 14: Ensure that the removal of checkboxes (`bulkActions: false`) and neon glow removal are concisely documented as table standards (Pillars 13 & 14) so they remain documented as reference without needing top-level governance entries.

#### [MODIFY] `.agents/rules/agent-workflow.md`
- Remove obsolete Section 8 ("Side Quest Protocol for Side Conversations /btw").

---

## 5. Verification Plan

### Automated Tests
1. **Automated Spatial Invariant Audit**:
   ```powershell
   node .agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs
   ```
   *Expected Output:* 100% PASS on all spatial and layout invariant checks, including the `.antigravityrules` governance checks.

2. **JavaScript Syntax Check**:
   ```powershell
   node scripts/check_all_js_syntax.cjs
   ```
   *Expected Output:* 44/44 JavaScript files pass syntax validation.

3. **Student Dashboard Exam Parity Check**:
   ```powershell
   node scripts/test_student_dashboard_exam_parity.mjs
   ```
   *Expected Output:* 100% PASS on student dashboard ranking and scoring parity.

4. **File Size & Token Reduction Verification**:
   ```powershell
   node -e "const fs = require('fs'); ['AGENTS.md', '.antigravityrules'].forEach(f => console.log(f + ': ' + fs.statSync(f).size + ' bytes (' + fs.readFileSync(f, 'utf8').split('\n').length + ' lines)'));"
   ```
   *Expected Output:* `AGENTS.md` < 14,000 bytes (down from 22,212 bytes); `.antigravityrules` < 4,000 bytes (down from 6,843 bytes).

---

## 6. Walkthrough & Documentation
- Update `docs/CHANGELOG.md` and `docs/CURRENT_STATE.md` with Phase 413.
- Pin `tasks.md` in center editor tab.

