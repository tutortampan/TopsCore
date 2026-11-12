# 20261112 - Star Pink Exclusivity Enforcement and Non-Star Pink Purge Plan

## Goal Description
Enforce TopsCore's non-negotiable **Star (★) Exclusivity** rule (AGENTS.md Section 2.10 & Rule 11). Electric Pink (`#ff2d87`, `--grade-star`) is strictly reserved for a 100% score (Grade ★ / Excellent). Conduct a comprehensive audit and systematic purge of all rogue pink, fuchsia, rose, and magenta color leaks across the application—including Student Gate completed step cards (Image 2), green status pulse shadows that glow pink (Image 1), test-taking inputs, test chips, and recording indicators.

---

## User Review Required

> [!IMPORTANT]
> **Star (★) Exclusivity Principle (Rule 2.10 & Rule 11)**:
> - **Electric Pink (`#ff2d87`)** is 100% exclusive to Grade ★ (100% score / Excellent). It must NEVER be inherited, copied, or shared by badges, borders, inputs, cards, buttons, or mic icons.
> - **Grade A Pure Green (`#00c000ff`)** is the authoritative color for completed states, active capsules, and correct answers.
> - **Tactical Indigo / Cyan (`#6366f1` / `#38bdf8`)** is the authoritative color for active steps, navigation cards, and test metadata.

### Baseline Evidence (Before)
The user identified two critical visual leaks:

1. **Rogue Pink Glow on Active Capsule (Image 1)**:
   ![Active Capsule Pink Glow](/before_active_capsule.png)
   *Analysis:* The green status dot and pulse animation (`@keyframes pulseGreen` in `css/admin.css`) was erroneously using `rgba(var(--grade-star-rgb), 0.7)` instead of green (`rgba(0, 192, 0, 0.7)`), causing active green indicators to emit an electric pink glow.

2. **Rogue Pink Steps on Student Gate Login (Image 2)**:
   ![Student Gate Pink Steps](/before_student_gate_pink.png)
   *Analysis:* In `css/auth.css`, completed steps (`.cascade-step-num.done` and `.cascade-section.selected .cascade-inner`) directly referenced `var(--grade-star)` and `rgba(var(--grade-star-rgb), 0.2)`. When students select Institution, Program, Batch, and Name, every step card turned bright electric pink.

3. **Microphone Recording State**:
   *Analysis:* During speech evaluation tests (`js/test.js`), the listening state used a translucent red gradient with an outer box-shadow that blended against the `#060b18` dark navy background, appearing as a translucent magenta/pink halo.

---

## Proposed Mockup Design (After)

```html
<!-- Proposed Clean Student Gate: Completed Steps Render Brand Indigo & Grade A Green (Zero Pink) -->
<div style="background:#0a0a1a; padding:20px; border-radius:12px; max-width:480px; font-family:'Inter', sans-serif;">
  <p style="color:#94a3b8; font-size:12px; text-align:center; margin-bottom:12px;">Student Gate — Sign in to continue</p>
  
  <!-- Step 1: Institution (Done -> Pure Grade A Green or Tactical Indigo) -->
  <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.04); border:1px solid rgba(0, 192, 0, 0.35); border-radius:8px; padding:10px 14px; margin-bottom:8px;">
    <div style="display:flex; align-items:center; gap:10px;">
      <div style="width:24px; height:24px; border-radius:50%; background:rgba(0, 192, 0, 0.2); border:1px solid rgba(0, 192, 0, 0.5); color:#00c000; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center;">1</div>
      <div style="font-size:13px; font-weight:600; color:#fff;">Institution <span style="color:#64748b;">:</span> <strong style="color:#38bdf8;">CEC</strong></div>
    </div>
    <span style="font-size:11px; color:#94a3b8; border:1px solid rgba(255,255,255,0.1); padding:2px 8px; border-radius:4px;">Change</span>
  </div>

  <!-- Step 2: Program (Done) -->
  <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.04); border:1px solid rgba(0, 192, 0, 0.35); border-radius:8px; padding:10px 14px; margin-bottom:8px;">
    <div style="display:flex; align-items:center; gap:10px;">
      <div style="width:24px; height:24px; border-radius:50%; background:rgba(0, 192, 0, 0.2); border:1px solid rgba(0, 192, 0, 0.5); color:#00c000; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center;">2</div>
      <div style="font-size:13px; font-weight:600; color:#fff;">Program <span style="color:#64748b;">:</span> <strong style="color:#38bdf8;">Camp</strong></div>
    </div>
    <span style="font-size:11px; color:#94a3b8; border:1px solid rgba(255,255,255,0.1); padding:2px 8px; border-radius:4px;">Change</span>
  </div>

  <!-- Step 3: Batch (Done) -->
  <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.04); border:1px solid rgba(0, 192, 0, 0.35); border-radius:8px; padding:10px 14px; margin-bottom:8px;">
    <div style="display:flex; align-items:center; gap:10px;">
      <div style="width:24px; height:24px; border-radius:50%; background:rgba(0, 192, 0, 0.2); border:1px solid rgba(0, 192, 0, 0.5); color:#00c000; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center;">3</div>
      <div style="font-size:13px; font-weight:600; color:#fff;">Batch <span style="color:#64748b;">:</span> <strong style="color:#38bdf8;">134</strong></div>
    </div>
    <span style="font-size:11px; color:#94a3b8; border:1px solid rgba(255,255,255,0.1); padding:2px 8px; border-radius:4px;">Change</span>
  </div>

  <!-- Step 4: Name (Done) -->
  <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.04); border:1px solid rgba(0, 192, 0, 0.35); border-radius:8px; padding:10px 14px;">
    <div style="display:flex; align-items:center; gap:10px;">
      <div style="width:24px; height:24px; border-radius:50%; background:rgba(0, 192, 0, 0.2); border:1px solid rgba(0, 192, 0, 0.5); color:#00c000; font-size:11px; font-weight:800; display:flex; align-items:center; justify-content:center;">4</div>
      <div style="font-size:13px; font-weight:600; color:#fff;">Name <span style="color:#64748b;">:</span> <strong style="color:#38bdf8;">Miss Adinda Karunia Farela</strong></div>
    </div>
    <span style="font-size:11px; color:#94a3b8; border:1px solid rgba(255,255,255,0.1); padding:2px 8px; border-radius:4px;">Change</span>
  </div>
</div>
```

---

## Visual Pre-Flight Verification Checklist
- [ ] **Current State Screenshot (Before)**: Embedded baseline visual showing existing appearance and dimensions (`/before_active_capsule.png` and `/before_student_gate_pink.png`).
- [ ] **Proposed Visual Mockup (After)**: Interactive generative UI widget or high-fidelity mockup showing the new layout.
- [ ] **Zero Outer Page Scroll**: Verified root `100vh` lock with `calc(100vh - 60px)` console sizing.
- [ ] **Container Spacing**: Verified strict 10px container gap between all cards, tables, and top/lower panels.
- [ ] **Lower Panel Alignment**: Verified 50px fixed height aligned with `.sidebar-footer`.
- [ ] **Dynamic Columns & Nowrap**: Verified `white-space: nowrap !important;` on table cells with zero clipped text.
- [ ] **Zero Dead Space**: Verified tables and cards expand to fill 100% width cleanly.
- [ ] **Language Standard**: Verified all headers, labels, and loading messages use 100% direct English.

---

## Proposed Changes

### Component 1: Student Gate CSS (`css/auth.css`)
Purge all `--grade-star` and `--grade-star-rgb` references from step cards, indicators, and selection checks.

#### [MODIFY] css/auth.css
- Lines 201-203: Change `.cascade-step-num.done` from `rgba(var(--grade-star-rgb), 0.2)` / `var(--grade-star)` to `rgba(0, 192, 0, 0.2)` / `var(--grade-a, #00c000ff)`.
- Lines 259-264: Change `.cascade-section.selected .cascade-inner` and `.cascade-step-num` from `var(--grade-star)` to `rgba(0, 192, 0, 0.35)` border and `var(--grade-a, #00c000ff)` text.
- Line 333: Change `.opt-card-check` from `var(--grade-star)` to `var(--grade-a, #00c000ff)`.

---

### Component 2: Admin Styles & Animations (`css/admin.css`)
Purge rogue pink pulse shadows, exam header pink styling, and pink chip borders.

#### [MODIFY] css/admin.css
- Lines 2569-2573: Fix `@keyframes pulseGreen` to pulse with `rgba(0, 192, 0, 0.7)` instead of `rgba(var(--grade-star-rgb), 0.7)`.
- Line 5853: Fix `.status-dot.dot-live, .status-dot.dot-active, .status-dot.dot-success` shadow to `box-shadow: 0 0 8px rgba(0, 192, 0, 0.6)`.
- Lines 4577-4582: Change `#class-attendance-grid th.super-hdr-exam` from `#f472b6` to tactical amber `#fbbf24` (or cyan `#38bdf8`) with dark border.
- Lines 6193-6203: Change `.badge-test-chip` from `#f472b6` to `#38bdf8`.
- Line 6574: Change `#blueprint-matrix-table td.cell-theme-code` from `#f472b6` to `#38bdf8`.

---

### Component 3: Test Engine Styles (`css/test.css` & `js/test.js`)
Ensure the test-taking environment strictly reserves Electric Pink for 100% results only.

#### [MODIFY] css/test.css
- Lines 409-429: Change `.mc-option.selected` from `var(--grade-star)` to cyan `#06b6d4` / emerald `#00c000ff`.
- Lines 474-477: Change `.frosted-input:focus, .form-control:focus` border from `var(--grade-star)` to cyan `rgba(56, 189, 248, 0.8)`.
- Lines 1624-1627: Change `.test-page .test-progress-fill` gradient from `var(--grade-star)` to `linear-gradient(90deg, #06b6d4, #00c000ff)`.
- Lines 1646-1650: Change `.test-pacing-badge.pace-comfortable` from `var(--grade-star)` to `#00c000ff`.
- Lines 279-290: Update `.speech-mic-btn-lg.listening` and `@keyframes micPulse` to use pure high-contrast red (`#ff0000`, `var(--grade-e)`) with zero translucent magenta/pink tint.

#### [MODIFY] js/test.js
- Lines 2698-2704: Verify listening mic button styling is solid Pure Red (`#FF0000`) and idle button is Grade A Green (`#00c000ff`).

---

### Component 4: Admin JavaScript String Replacements (`js/admin/app.js` & `js/admin/student-management.js`)
Remove hardcoded `#f472b6` string replaces on "Test" and "Exam".

#### [MODIFY] js/admin/app.js
- Lines 2007, 2008, 2040, 2076: Replace `#f472b6` with `#38bdf8` or standard styling.

#### [MODIFY] js/admin/student-management.js
- Line 1067: Replace `#f472b6` with `#38bdf8`.
- Line 2653: Replace `#f472b6` with soft lavender `#c084fc` or crisp slate `#e2e8f0`.

#### [MODIFY] js/admin/auto-gen-modal.js & js/admin/vocab-vault.js
- Auto-gen modal and Vocab Vault tags: replace `#f472b6` / `#ec4899` with `#38bdf8` / `#fbbf24`.

---

### Component 5: Dashboard CSS (`css/dashboard.css`)
#### [MODIFY] css/dashboard.css
- Line 677: Change `.q-nav-btn:not(.answered):not(.current)` from `#f43f5e` to neutral soft slate `rgba(255,255,255,0.08)` / `#64748b`.
- Lines 1819, 1826, 1842: Change banner avatar box border and camera badge from `#ec4899` to brand tactical indigo `#6366f1` / `#38bdf8`.

---

## Verification Plan

### Automated Tests
1. **Pre-Flight Plan Quality Gate**:
   `node scripts/verify_plan_preflight.mjs "docs/plans/20261112 - Star Pink Exclusivity Enforcement and Non-Star Pink Purge Plan.md"`
2. **Automated Pink Exclusivity Scanner**:
   Create and execute `scripts/verify_star_pink_exclusivity.mjs` to ensure zero occurrences of `#ff2d87`, `var(--grade-star)`, `#ec4899`, `#f472b6`, `#f43f5e` outside of Grade ★ / Star-specific scoring contexts.
3. **Spatial & Visual Invariant Audit**:
   `node .agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs`
4. **JS Syntax Verification**:
   `node scripts/check_all_js_syntax.cjs`
5. **Playwright Visual Verification**:
   Capture screenshots of:
   - Student Gate (`index.html`) with completed steps 1–4 to confirm green/indigo styling and zero pink.
   - Admin console active status dots to confirm pure green glow without pink halo.
   - Test runner (`test.html`) to confirm mic button and selected MC option styling.

### Manual Verification
- None required. All checks are 100% verified via automated Playwright screenshots and AST color scans.
