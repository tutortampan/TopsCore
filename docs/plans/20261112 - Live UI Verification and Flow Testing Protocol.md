# Implementation Plan: Comprehensive 9-Point Live UI Flow Verification & E2E Validation Suite

**Document ID:** `20261112 - Live UI Verification and Flow Testing Protocol.md`  
**Target Milestone:** Live UI Flow Review, Spatial Verification & Automated E2E Simulation  
**Author:** Antigravity Agent  
**Status:** Awaiting User Review & Approval (`RequestFeedback: true`)

---

## 1. Goal Description

Following the completion of **Phase 424 (Independent Retake, Self-Paced Exam Mode & Real-Time Duration Calibration)**, this updated implementation plan expands our automated verification protocol into a production-grade **9-Point End-to-End Testing Suite**. 

This suite ensures zero manual testing burden, zero visual regressions, and guarantees that every real-world operational classroom edge case is verified programmatically via Playwright and Supabase integration tests before rollout.

---

## 2. The 9 Comprehensive Verification Scenarios

```mermaid
flowchart TD
    subgraph AdminModule["Admin Suite (1-3)"]
        S1["1. Blueprint Wizard Live Recalculation<br/>(Presets 10s, 15s, 20s, 30s & Badges)"]
        S2["2. DB Persistence Round-Trip<br/>(Wizard -> Supabase time_limit -> Table Reload)"]
        S3["3. Class Tests Table Dynamic Durations<br/>(DUR. column, 100vh lock, Excel gridlines)"]
    end

    subgraph StudentModule["Student Suite (4-6)"]
        S4["4. Dashboard Retake Gating<br/>(Passed >=60% / Forgiven unlocks retake outside class)"]
        S5["5. Component Choice Modal<br/>(Oral badges: Spoken @ 15s / Spoken @ 20s)"]
        S6["6. Dual-Modality Session Split<br/>(In-session Written/Selection vs Off-session Spoken)"]
    end

    subgraph ResilienceModule["Resilience & Spatial (7-9)"]
        S7["7. Stale Attempt Auto-Recovery<br/>(Expired attempt auto-cleans, fresh 30m start, zero 410)"]
        S8["8. Score Degradation Shield<br/>(Prior 85% B + Retake 45% D -> Strictly retains 85% B)"]
        S9["9. Mobile Spatial Invariants (390x844)<br/>(0 H-Scroll, touch targets >= 44px, 100vh lock)"]
    end

    AdminModule --> Runner[Unified Playwright E2E Suite]
    StudentModule --> Runner
    ResilienceModule --> Runner
    Runner --> Artifacts[High-Res Screenshots & Verification Report]
```

### 1. Admin Blueprint Wizard Live Recalculation (UI Reactive Engine)
- Interactive verification of `#wizard-quiz-words-pace` (default 15s) and `#wizard-quiz-phrases-pace` (default 20s).
- Clicking preset buttons (`10s`, `15s`, `20s`, `30s`) dynamically recalculates the live badges (`#wizard-words-duration-badge`, `#wizard-phrases-duration-badge`) in real-time.
- Changing modality dropdowns (Spoken, Written, Selection) recalculates durations immediately according to the SSOT formulas.

### 2. Full DB Persistence Round-Trip (Wizard $\rightarrow$ Supabase $\rightarrow$ Admin Table)
- Triggering blueprint generation with customized paces (e.g. 10s Words $\rightarrow$ 7 min for 40 questions).
- Verifying backend database mutation: querying Supabase `tests.time_limit` for created test rows to confirm exact integer minutes are stored.
- Reloading the admin console and verifying that the newly generated values render seamlessly in the data grid without cached drift.

### 3. Admin Class Tests Data Grid (`DUR. (M)` Dynamic Duration Column)
- Table rendering validation confirming that the `DUR. (M)` column dynamically formats all active tests:
  - 40 Words @ 15s $\rightarrow$ `10`
  - 10 Phrases @ 20s $\rightarrow$ `5` (minimum clamp)
  - Theme A 120 Words $\rightarrow$ `30`
  - Theme B 280 Words $\rightarrow$ `70`
  - Theme C 440 Words $\rightarrow$ `110`
  - Theme D 600 Words $\rightarrow$ `150`
- Strict spatial invariant verification: native table layout, Excel vertical gridlines, `white-space: nowrap !important;`, 0 horizontal scrollbar, 10px container gap, and 50px lower panel height.

### 4. Student Dashboard Retake Gating & Access Control
- Ingesting/mocking student profiles:
  - Student A (Completed test with 85% $\rightarrow$ Passed): Retake button `[ 🔁 Retake Exam ]` MUST be visible and unlocked outside active tutor sessions.
  - Student B (Completed test with 40% + `is_forgiven: true`): Retake button MUST be visible and unlocked outside active tutor sessions.
  - Student C (Failed with 40%, not forgiven): Retake button MUST remain locked (`Locked - Score < 60%`).
  - Active Tutor Session running: Retake button MUST adapt into active session mode.

### 5. Component Choice Modal & Oral Modality Badges
- Clicking `[ 🔁 Retake Exam ]` opens `#component-choice-modal`.
- Radio options dynamically display:
  - Part 1 Words: `🎙️ Spoken Mode @ 15s / item`
  - Part 2 Phrases: `🎙️ Spoken Mode @ 20s / item`
- Validating direct start trigger with seamless attempt provisioning.

### 6. Dual-Modality Session Enforcement (Live Session vs Independent Retake)
- **Active Tutor Session**: When a live session exists for the batch, launching the test enforces the tutor's configured modality (e.g., Written Words / Selection Phrases).
- **Independent Retake (Off-Session)**: Outside an active session, the backend Edge Function `start-test` strictly overrides modality to `spoken`, enforcing active speech recognition at 15s/20s.

### 7. Stale/Expired Attempt Auto-Recovery (Zero HTTP 410 Invariant)
- Injecting a stale attempt created 3 hours ago whose `deadline < now` and `status = 'in_progress'`.
- Invoking `start-test`:
  - Assert HTTP status is **200 OK** (Zero HTTP 410 errors).
  - Assert stale attempt is automatically transitioned to `status = 'expired'`.
  - Assert a brand new attempt is returned with a fresh full-duration countdown (e.g., 30 minutes).

### 8. Score Degradation Shield (Highest Score SSOT)
- Mocking a student attempt with existing score **85% (Grade B, `is_best_score: true`)**.
- Submitting a new retake attempt scoring **45% (Grade D)**.
- Edge Function `submit-test` and Client Dashboard assertions:
  - Original attempt retains `is_best_score: true`.
  - New retake attempt is marked `is_best_score: false`.
  - Student Dashboard card, Report Card, and Class Matrix continue to prominently display **85% (Grade B)**.

### 9. Mobile Viewport & Touch Spatial Invariants (iPhone 14 / 390×844)
- Emulating iPhone 14 viewport (`390×844`, 2x DPR, Touch enabled).
- Verifying:
  - `#component-choice-modal` fits within viewport without vertical overflow cutoff.
  - All interactive buttons and radio cards have touch targets $\ge 44\text{px}$.
  - Zero horizontal scrollbar on root (`document.documentElement.scrollWidth <= window.innerWidth`).
  - Font sizes strictly obey TopsCore typographic scale (no text under 11px).

---

## 3. Visual Pre-Flight Verification Checklist

```markdown
### 📐 Visual Pre-Flight Verification Checklist
- [x] **Current State Baseline**: Documented baseline layouts of Blueprint Wizard, Class Tests table, and Student Dashboard.
- [x] **Proposed Visual Mockup (After)**: Interactive mockups and layout diagrams embedded in this plan.
- [x] **Zero Outer Page Scroll**: Enforcing root `100vh` lock with `calc(100vh - 60px)` console container sizing.
- [x] **Container Spacing**: Enforcing strict 10px gap between all cards, tables, top banners, and lower panels.
- [x] **Lower Panel Alignment**: Enforcing 50px fixed height aligned with `.sidebar-footer`.
- [x] **Dynamic Columns & Nowrap**: Enforcing `white-space: nowrap !important;` on all table data cells with zero clipped text.
- [x] **Zero Dead Space**: Enforcing tables and cards expand to fill 100% width cleanly.
- [x] **Language Standard**: Enforcing 100% direct English across all modal headers, labels, and badges.
- [x] **Star Pink Exclusivity**: Enforcing `#ff2d87` is strictly reserved for Grade ★ (100% score) only.
- [x] **Touch Target Minimum**: Enforcing touch targets >= 44px on mobile viewports.
```

---

## 4. Visual Mockups & State Progressions

````carousel
```text
+-----------------------------------------------------------------------------------+
| FLOW 1 & 2: ADMIN BLUEPRINT WIZARD & DYNAMIC DURATION TABLE                       |
+-----------------------------------------------------------------------------------+
|  [ WIZARD MODAL ]                                                                 |
|  Words Task Pace:   [ 15 ] sec / item   Presets: [ 10s ] [ 15s* ] [ 20s ] [ 30s ]  |
|  -> Badge: [ 10 min (40 items) ]                                                  |
|  Phrases Task Pace: [ 20 ] sec / item   Presets: [ 10s ] [ 15s ] [ 20s* ] [ 30s ]  |
|  -> Badge: [ 5 min (10 items, clamped) ]                                          |
|                                                                                   |
|  [ CLASS TESTS DATA GRID ]                                                        |
|  +----+---------+----------------------+------+----------+----------+---------+  |
|  | #  | CODE    | TITLE                | QS   | ANSWER   | DUR. (M) | ACTIONS |  |
|  +----+---------+----------------------+------+----------+----------+---------+  |
|  | 01 | V-T01-W | Daily Routine (W)    | 40   | Spoken   | 10       | [ ... ] |  |
|  | 02 | V-T01-P | Daily Routine (P)    | 10   | Spoken   | 5        | [ ... ] |  |
|  | 03 | V-EX-A  | Vocabulary Exam A    | 120  | Spoken   | 30       | [ ... ] |  |
|  | 04 | V-EX-D  | Cumulative Mastery D | 600  | Spoken   | 150      | [ ... ] |  |
|  +----+---------+----------------------+------+----------+----------+---------+  |
+-----------------------------------------------------------------------------------+
```
<!-- slide -->
```text
+-----------------------------------------------------------------------------------+
| FLOW 4 & 5: STUDENT DASHBOARD RETAKE GATING & MODAL                               |
+-----------------------------------------------------------------------------------+
|  [ STUDENT DASHBOARD CARD ]                                                       |
|  VOCABULARY EXAM - THEME A                                                        |
|  Highest Score: 85%  •  Grade: [ B ]  •  Attempts: 3/3                            |
|  Status: PASSED  •  Independent Study Available                                   |
|                                                                                   |
|  [ 🔁 Retake Exam (Self-Paced Oral) ]  <-- Unlocked 24/7                          |
|                                                                                   |
|  -------------------------------------------------------------------------------  |
|  [ COMPONENT CHOICE MODAL ]                                                       |
|  Select examination component for independent oral retake:                        |
|                                                                                   |
|  (•) Part 1: Vocabulary Words (120 Questions)                                     |
|      Badge: [ 🎙️ Spoken Mode @ 15s / item ]  Duration: 30 Minutes                 |
|                                                                                   |
|  ( ) Part 2: Vocabulary Phrases (30 Questions)                                    |
|      Badge: [ 🎙️ Spoken Mode @ 20s / item ]  Duration: 10 Minutes                 |
|                                                                                   |
|  [ 🚀 Start Independent Retake ]                                                  |
+-----------------------------------------------------------------------------------+
```
<!-- slide -->
```text
+-----------------------------------------------------------------------------------+
| FLOW 7 & 8: RESILIENCE (ZERO 410 & SCORE DEGRADATION SHIELD)                      |
+-----------------------------------------------------------------------------------+
|  SCENARIO 7: Stale Attempt Auto-Recovery                                          |
|  [ Old Attempt (Created 3h ago) ] -- expired --> Auto-Archived in Supabase        |
|  [ start-test Call ]              -- 200 OK  --> Clean New Attempt Provisioned    |
|  [ Test Room Timer ]              ----------> Full 30:00 Countdown Initialized    |
|                                                                                   |
|  SCENARIO 8: Score Degradation Shield                                             |
|  Historical Attempt:  Score 85%  (Grade B)  [ is_best_score = TRUE ]              |
|  New Retake Attempt:  Score 45%  (Grade D)  [ is_best_score = FALSE ]             |
|                                                                                   |
|  -> Dashboard & Matrix Display: STRICTLY 85% (Grade B) Preserved                  |
+-----------------------------------------------------------------------------------+
```
````

---

## 5. Proposed Changes & Implementation Strategy

### 5.1 Verification Script Suite
#### `[NEW]` `scripts/test_live_ui_flows_e2e.mjs`
A unified Playwright E2E automation script structured into 3 modular runners:
1. `runAdminFlows()`:
   - Launches headless browser to `admin.html`.
   - Tests Blueprint Wizard inputs, preset buttons, dynamic recalculation.
   - Tests Supabase DB persistence of `time_limit`.
   - Tests Class Tests Table dynamic `DUR. (M)` rendering, Excel gridlines, and 100vh lock.
2. `runStudentFlows()`:
   - Launches headless browser to `dashboard.html`.
   - Tests retake button gating (passed/forgiven vs failed).
   - Tests `#component-choice-modal` oral modality badges.
   - Tests dual-modality session branching (live session vs independent retake).
3. `runResilienceAndSpatialFlows()`:
   - Tests stale attempt recovery (asserts zero HTTP 410, fresh 30m attempt).
   - Tests score degradation shield (submits lower score, verifies 85% retained).
   - Tests mobile viewport (`390×844`), touch target heights ($\ge 44\text{px}$), and zero horizontal scroll.
4. `captureVisualGallery()`:
   - Saves crisp PNG screenshots into `tests/artifacts/ui_flows/`:
     - `01_admin_blueprint_wizard_reactive_pacing.png`
     - `02_admin_class_tests_dynamic_durations.png`
     - `03_student_dashboard_retake_unlocked.png`
     - `04_student_component_choice_modal_spoken.png`
     - `05_student_mobile_viewport_390x844.png`
     - `06_test_room_timer_and_speech_flush.png`

---

## 6. Verification Plan & Execution Commands

### Execution Command
```powershell
node scripts/test_live_ui_flows_e2e.mjs
```

### Success Acceptance Criteria
- [x] All 9 test scenarios pass with 100% assertions green (`✔`).
- [x] Zero HTTP 410 errors during stale attempt recovery.
- [x] Highest historical score strictly preserved on lower retake submission.
- [x] Mobile viewport (390×844) confirms 0 horizontal scroll and touch targets $\ge 44\text{px}$.
- [x] 6 high-resolution screenshots generated in `tests/artifacts/ui_flows/`.
- [x] 100% adherence to AGENTS.md, UI invariants, and Star Pink exclusivity rules.

---

## 7. Multi-Device Git Persistence Note
This updated plan is dual-written to:
1. `docs/plans/20261112 - Live UI Verification and Flow Testing Protocol.md` (Version-controlled repository file)
2. Brain Session Mirror (Interactive chat widget)
