# CURRENT STATE — TOPSCORE LMS

> **Purpose:** Single authoritative restart point across sessions and restarts.
> **Last Updated:** 2026-11-13 22:30 UTC+8
> **Current Phase:** Phase 457: Deep Workspace Hygiene & Archive Bloat Purge [COMPLETE]
> **Status:** READY FOR NEXT USER DIRECTIVE

---

## 1. Active System Architecture & Invariants

- **Frontend**: Vanilla HTML5 + modern CSS3 + modular ES6 JavaScript (`js/` modules). Deployable via Netlify/Vercel.
- **Backend Services**: Supabase PostgreSQL database, Supabase Auth, Storage buckets, and Edge Functions (`supabase/functions/`).
- **Single-Screen 100vh Viewport Lock**:
  - `html, body { height: 100vh; overflow: hidden; }`
  - `#admin-console { height: calc(100vh - 60px); }` (offsetting docked bottom banner).
  - Native `display: table` lock, internal scrolling strictly contained in `.table-wrap`.
  - Canonical 50px lower panel & sticky footers, 10px container gap, dynamic column sizing, single-line text (`nowrap`).
  - Authoritative 8-tier typography scale (`--tr-font-*`), zero sub-11px text.
- **Unified Color SSOT (Rule 2.10)**:
  - Strictly governed by [Official Grading Scale in AGENTS.md Section 2.10](file:///AGENTS.md#210-grade) and [UI Invariants](file:///.agents/rules/ui-invariants.md).
  - Star (★, 100%) is strictly **Electric Pink** (`#ff2d87`, exclusive to Star).
  - *One-Touch Global Propagation Protocol*: All semantic reds inherit Grade E (`--grade-e`), all yellows inherit Grade C (`--grade-c`), all greens inherit Grade A (`--grade-a`). Zero raw hex hardcoding.

---

## 2. Recent Active Milestones (Rolling Window: Phases 450–457)

Full historical phase logs are maintained in [`docs/CHANGELOG.md`](file:///docs/CHANGELOG.md) and [`docs/archive/`](file:///docs/archive/).

- **Phase 457 — Deep Workspace Hygiene & Archive Bloat Purge**:
  - Purged 367 obsolete legacy scripts from `scripts/archive/`, removing thousands of dead lines from global search indexes.
  - Purged untracked 504.5 KB `docs/archive/CHANGELOG_ARCHIVE_2.md` and loose screenshot dumps (`docs/screenshots/`, images).
- **Phase 456 — Active Plans Streamlining**:
  - Pruned 88 completed/obsolete plan files from `docs/plans/`, retaining strictly 7 active roadmap/reference plans.
- **Phase 455 — Scripts Pruning & Repository Hygiene**:
  - Pruned 110 temporary scratch scripts from `scripts/`, retaining 47 core regression test suites aligned with `package.json`.
- **Phase 454 — Class Hub Theme Matrix Typography Normalization**:
  - Replaced legacy 6.4px (`0.40rem`) font size in `#class-attendance-grid .test-subtag` with authoritative 11px bold tactical cyan (`#38bdf8`), eradicating sub-11px violations.
- **Phase 453 — Master Verification & Governance Ratification**:
  - Validated 100% test pass across all regression suites; ratified Rules 0.1.1, 0.1.2, and 2.10.
- **Phase 452 — AI Conversation Living Avatar & Oscilloscope Waveform**:
  - Built interactive Living Avatar (`#living-avatar-stage`) with 4 visual states (`IDLE`, `LISTENING`, `THINKING`, `SPEAKING`) and real-time audio canvas waveform visualizer.
- **Phase 451 — Diagnostic Result Cards, Star Exclusivity & Print A4 Report**:
  - Injected dedicated `#printable-report-card` and `@media print` CSS for portrait A4 parent report; enforced Star Electric Pink and Grade A Green exclusivity.
- **Phase 450 — Student Roster DataGrid & Analytics Blank Answer Exclusion**:
  - Designated `STUDENT NAME` as sole Flex Primary column; excluded timeout/unattempted questions from error rate calculations in `class-analytics.js`.
- **Phase 449 — Class Analytics Statement Timeout Resolution & Two-Step Deduplicated Query**:
  - Replaced monolithic nested join with 2-step deduplicated query engine in `js/admin/class-analytics.js`, eliminating PostgreSQL timeout `57014` on high-volume classes (1,146+ attempts $\rightarrow$ ~2.4s execution).
  - Injected `#master-edit-safety-hud` and standardized 32px toolbars.
- **Phase 448 — High-Stakes Exam Room Intelligence & Zero Native Alerts**:
  - Upgraded `#submit-modal` to Exam Submission Intelligence Card with dual metrics; replaced all 5 native `alert()` calls with glassmorphism modal.
- **Design Restoration & Rollback**:
  - Reverted experimental modal designs per user command, restoring the 3-Tier Hazard yellow/orange theme and standard inputs.

---

## 3. Standing Governance & Execution Boundaries

- **Rule 0.1.1 (Strict Git Gate)**: NEVER execute `git commit` or `git push` autonomously. All changes remain uncommitted for user review.
- **Rule 0.1.2 (Strict UTF-8 / No PowerShell File Piping)**: NEVER use PowerShell file cmdlets (`Set-Content`, `Get-Content`, `Out-File`, `-replace`) to edit or write files. All file edits must strictly use Antigravity native file tools or Node.js `fs` with explicit `'utf8'`.
- **Rule 2.10 (Authoritative Color SSOT)**: Zero raw hex codes. All colors must use CSS variables or `TOPSCORE_COLORS`.
- **Documentation Rolling-Window Protocol**:
  - `CHANGELOG.md`: Rolling window of **25 latest phases**. Older phases flush to `docs/archive/`.
  - `CURRENT_STATE.md`: Rolling window of **active phase + latest ~8 milestones**. Zero historical phase dumps.
  - `tasks.md`: Active task execution only.

---

## 4. Verification Suite Status

- **Syntax Validation**: 48/48 JavaScript files PASS (`scripts/check_all_js_syntax.cjs`).
- **Spatial Checker**: 100% PASS (`.agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs`).
- **Master Test Suite**: 100% PASS across all 47 regression test suites (`npm.cmd test`).

---

## 5. Next Exact Action

- Standby for user's next directive. All changes remain uncommitted in the working tree for user review per Rule 0.1.1.
