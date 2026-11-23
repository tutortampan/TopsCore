# CURRENT STATE — TOPSCORE LMS

> **Purpose:** Single authoritative restart point across sessions and restarts.
> **Last Updated:** 2026-11-22
> **Current Milestone:** Phase 685 [COMPLETE] — Light Mode High-Contrast Table Text & Theme Harmonization
> **Status:** READY FOR USER REVIEW (ALL 13 TABLE PILLARS & SUITES 100% GREEN)

---

## 1. System Architecture & Core Invariants

- **ABCD System Navigation & 4-Pillar Quadrant Colors**:
  - `A — ADMIN`: Electric Pink (`#ff2d87` / `var(--quad-a)`)
  - `B — BATCH`: Dark Orange (`#FF8C00` / `var(--grade-d)`)
  - `C — CLASS`: Electric Lime (`#95ff00` / `var(--grade-b)`)
  - `D — DATA`: Tactical Cyan (`#38bdf8` / `var(--primary-tactical)`)

- **Authoritative Grading Scale (Centralized SSOT)**:
  - ★ Excellent (100%): Purple (`#c084fc`) | A Very Good (90%–99%): Pure Green (`#00c000`)
  - B Good (80%–89%): Electric Lime (`#95ff00`) | C Enough (60%–79%): Pure Yellow (`#ffff00`)
  - D Less (30%–59%): Dark Orange (`#ff8c00`) | E Fail (0%–29%): Pure Red (`#ff0000`)

- **Test & Curriculum Identification SSOT (DECISION-077)**:
  - Program Code: Strictly 4 letters (`CAMP`, `EVNK`, `SHRT`, `TPTC`).
  - Class Code: `PROGRAM-LEVELCLASS` (e.g. `CAMP-3VOCAB`, `CAMP-1BASIC`; Non-Level omit level: `EVNK-VOCAB`, `SHRT-VOCAB`, `TPTC-VOCAB`).
  - Test Code: `PROGRAM-LEVEL_CLASS-CODE-TYPE` (e.g. `CAMP-3VCB-A1-TASK`, `CAMP-3VCB-D-EXAM`, `CAMP-1BSC-A-EXAM`, `CAMP-1STT-A1-TASK`, `EVNK-VCB-0G1-TASK`, `SHRT-VCB-0A-EXAM`).
  - Room Code: Strictly hyphenated uppercase zero-space (`R-101`, `R-102`, `R-103`, `LAB-01`, `HAL-0A`, `HAL-0B`, `HAL-0C`).
  - Test Name: `[LEVEL] [CLASS] [TASK/EXAM] [CODE] - [TOPIC/THEME_NAME]`. Dashboard 2-line title via `formatTestDisplay()`.

- **Repetitive Mastery & Curriculum Discipline Gating**:
  - Level 3 Unified Tasks: 14 total repetitions (7 Words + 7 Phrases). Self-healing balancer auto-partitions untagged reps.
  - Level 2 Vocabulary: Strictly Words-Only (7 Reps, 0 phrases).
  - Passing Threshold: Grade C (60%), Grade F (forgiven), or Grade R (remedial).
  - Non-Level Programs: Level 0 renders as neutral dash `—`. Alumni: Level X (`level_number = 99`, badge `X`).

- **Universal Spatial & UI Invariants**:
  - Single-Screen 100vh lock (`#admin-console` deduction `calc(100vh - 50px)` for locked bottom banner).
  - Spacing & Padding: Strict 10px container gap & 10px internal card padding.
  - Universal 40px Sub Panel (Lower Panel) with 30px in-panel buttons.
  - Universal Two-Tier 60px Solid Table Headers (Super-Header 30px + Sub-Header 30px).
  - Single-Font Architecture: 100% Inter font, dual-scale hierarchy (20/16/14/12px), zero sub-12px, tabular numbers.
  - Language: 100% English, zero subtitle clutter in headers, zero modal close 'X'.

---

## 2. Active Verification Protocols

- **Master UI Audit**: `/check-ui` (or `npm.cmd run check:ui` / `npm.cmd run check:spatial`)
- **Fast AST & Build Preflight**: `/verify` (or `npm.cmd run test:fast`)
- **Universal Table Standardization**: `/check-table` (or `npm.cmd run test:table`)
- **Color Governance & Contrast**: `/check-color` (or `npm.cmd run test:color-ssot`)
- **Workspace & Script Hygiene**: `/clean` (or `npm.cmd run check:hygiene`)

---

## 3. Key Files Map

- **Governance**: `AGENTS.md`, `.antigravityrules`, `.agents/rules/ui-invariants.md`, `.agents/rules/agent-workflow.md`
- **Frontend App**: `admin.html`, `dashboard.html`, `test.html`, `result.html`, `index.html`
- **Core Engine JS**: `js/api.js`, `js/grading.js`, `js/test.js`, `js/dashboard.js`, `js/admin/app.js`, `js/admin/datagrid.js`
- **Master Stylesheets**: `css/style.css`, `css/admin.css`, `css/dashboard.css`, `css/test.css`, `css/result.css`
- **Edge Functions**: `supabase/functions/start-test`, `submit-test`, `evaluate-conversation`, `evaluate-test`
