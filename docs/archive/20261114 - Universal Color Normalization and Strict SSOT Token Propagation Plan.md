# Universal Color Normalization & Strict SSOT Token Propagation Plan

> **Phase:** Phase 462  
> **Status:** APPROVED / IN PROGRESS  
> **Target Date:** 2026-11-14  
> **Authority:** Rule 2.10 (AGENTS.md) & Bab 3 (ui-invariants.md)

---

## 1. Executive Summary & Objective

An exhaustive audit across all 7 HTML pages, 7 stylesheets, and 45 JavaScript modules revealed **291 instances of untokenized, hardcoded raw hex colors** (primarily Tailwind palettes: red `#ef4444`, amber `#f59e0b`, emerald `#10b981`, etc.) bypassing the centralized `:root` and `grading.js` SSOT.

The objective of **Phase 462** is to completely eradicate these hardcoded hex literals across all CSS and JavaScript templates, enforcing the **"One-Touch Global Propagation Protocol" ("Rubah Satu Maka Rubah Semua")**:
1. **Semua Merah Ikut Grade E**: Every red element (errors, purge buttons, danger badges, timeout warnings) must strictly reference `--grade-e`, `var(--grade-e)`, `TOPSCORE_COLORS.E`, or `.text-fail`.
2. **Semua Kuning Ikut Grade C**: Every yellow/amber element (warnings, remedial tags, pending indicators, latency chips) must strictly reference `--grade-c`, `var(--grade-c)`, `TOPSCORE_COLORS.C`, or `.text-warning`.
3. **Semua Hijau Ikut Grade A**: Every green element (success, published badges, telemetry dots, correct answers) must strictly reference `--grade-a`, `var(--grade-a)`, `TOPSCORE_COLORS.A`, or `.text-success`.
4. **Theme Matrix Clarification**: Disambiguate Theme Cards (Theme A, B, C, D) from academic grades to prevent visual collision between Theme D and Grade A/D.

---

## 2. Execution Waves

### Wave 1: CSS Stylesheets Normalization
- **Files**: `css/admin.css`, `css/dashboard.css`, `css/test.css`, `css/result.css`.
- **Scope**:
  - Replace hardcoded Tailwind reds (`#ef4444`, `#dc2626`, `#f87171`, `#b91c1c`, `#ff0000`) with `var(--grade-e)` or `rgba(var(--grade-e-rgb), ...)`.
  - Replace hardcoded Tailwind yellows/ambers (`#fbbf24`, `#f59e0b`, `#d97706`, `#eab308`, `#facc15`) with `var(--grade-c)` or `rgba(var(--grade-c-rgb), ...)`.
  - Replace hardcoded Tailwind greens (`#10b981`, `#22c55e`, `#16a34a`, `#059669`, `#4ade80`, `#34d399`, `#00c000ff`) with `var(--grade-a)` or `rgba(var(--grade-a-rgb), ...)`.

### Wave 2: Admin Workstation JS Modules Normalization
- **Files**: `js/admin/tests-access.js`, `js/admin/vocab-vault.js`, `js/admin/forgiven-wizard-modal.js`, `js/admin/tests-management.js`, `js/admin/app.js`, `js/admin/class-analytics.js`, `js/admin/student-management.js`.
- **Scope**:
  - Replace inline `style="color: #...";` and `style="background: rgba(...);"` with centralized classes (`.text-success`, `.text-warning`, `.text-fail`, `.badge-success`, `.badge-warning`, `.badge-danger`) or dynamic `var(--grade-*)` bindings.
  - Normalise `THEME_PALETTES` in `js/admin/tests-access.js` to ensure tactical distinctness without conflicting with grade colors.

### Wave 3: Student Flow & Test Room JS Normalization
- **Files**: `js/test.js`, `js/dashboard.js`, `js/result.js`, `js/conversation-room.js`, `conversation.html`.
- **Scope**:
  - Replace inline hardcoded colors in test banners, countdown warnings, and sync indicators.
  - Normalise `.asm-forgiven-sup` and remedial status tags in `js/dashboard.js`.
  - Enforce dynamic `getGradeColorByScore()` on score text in `conversation.html` and `js/conversation-room.js`.

### Wave 4: Automated Verification & Documentation
- **Scope**:
  - Update `scripts/test_universal_color_token_ssot.mjs` to comprehensively scan all CSS and JS files for raw hex leaks.
  - Validate syntax across all 48 JS files (`scripts/check_all_js_syntax.cjs`).
  - Validate spatial invariants (`.agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs`).
  - Update `docs/CURRENT_STATE.md`, `tasks.md`, and `docs/CHANGELOG.md`.

---

## 3. Invariants & Governance Rules
- **Rule 0.1.1**: Zero autonomous git commit/push.
- **Rule 0.1.2**: Strict UTF-8 file operations (no PowerShell file piping).
- **Rule 2.10**: Universal Dark Badge Text (`#0F172A`) on all `.grade-circle`.
