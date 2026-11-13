# Comprehensive Popups, Wizards, and Modals Modernization Plan (Wave 2)

> **Document ID:** `docs/plans/20261113 - Comprehensive Popups and Wizards Modernization Wave 2 Plan.md`  
> **Author:** Antigravity (TopsCore LMS Core Architecture)  
> **Target Release:** Phase 447 — System-Wide Dialogs, Onboarding Stepper, Exam Intelligence & Admin Authorizer  
> **Status:** Pending User Review & Approval (`RequestFeedback: true`)

---

## 1. Executive Summary & Architectural Goals

Following the successful completion and verification of **Phase 446** (Question Matrix Grid, Gender Setup 2-Col Grid, Universal Confirm Modal, and SSOT Grade E Delete Modal), an exhaustive audit across the entire TopsCore codebase identified all remaining unmodernized dialogs, multi-step onboarding sequences, and lingering native OS browser popups (`alert()`, `confirm()`, and raw `prompt()`).

This implementation plan unites all remaining popups, wizards, and modals across four cohesive waves:

1. **Wave 1 — Student Onboarding Multi-Step Wizard Flow & Mojibake Eradication (`dashboard.html`)**:
   - Unify four disconnected setup modals (`#gender-setup-modal`, `#birthday-setup-modal`, `#education-setup-modal`, `#photo-setup-modal`) into a sleek, continuous 4-step wizard with visual stepper indicators (`● ○ ○ ○` / `Step X of 4`).
   - Eliminate all lingering UTF-8 mojibake: `ðŸŽ“` &rarr; `🎓` (graduation cap in education modal), `ðŸ‘‘` &rarr; `👑` (champion crown badge in hero identity).
   - Modernize birthdate picker, education degree chip pills (`SMA`, `SMK`, `S1/D4`, `S2`), and webcam photo viewport into dark glassmorphism cards.

2. **Wave 2 — Test Room Pre-Exam Briefing & Submission Intelligence (`test.html`, `js/test.js`)**:
   - Upgrade `#submit-modal` into an **Exam Submission Intelligence Card** displaying real-time metrics: Answered (`35/40` with Grade A Green badge) vs Unanswered (`5 Remaining` with Grade E Red warning badge), featuring a one-click CTA to jump back to unanswered questions.
   - Upgrade `#pre-exam-focus-modal` into a tactical briefing card with rule checklist and focus countdown.
   - Eradicate 5 raw browser `alert()` popups in `js/test.js` (exam kickoff, tutor cancellation, tutor kick, session pull, access revocation).

3. **Wave 3 — Interactive 3D Flip Flashcards & Student Profile Drawer (`dashboard.html`, `result.html`)**:
   - Modernize `#flashcard-modal` into an interactive 3D flip retention card with phonetic transcription, audio trigger icon, JetBrains Mono counter (`04 / 15`), and authoritative grading CTAs (`❌ NEED PRACTICE` in Grade E vs `✓ MASTERED!` in Grade A).
   - Modernize `#profile-modal` into a glassmorphism profile drawer with glowing rank crown, clean tab navigation, and JetBrains Mono PIN reset.
   - Replace 3 native `confirm()` calls in `js/result.js` (revert, remedial, score exemption).

4. **Wave 4 — Admin Console Power Modals & Skor F Authorizer (`admin.html`, `js/admin/`)**:
   - Replace the raw browser `prompt()` in `student-management.js` with an authoritative **Skor F (Forgiven) Authorizer Modal** featuring dispensation reason presets, audit text justification, and admin credentials check.
   - Standardize `#crud-modal` with sticky header, sticky footer actions, and responsive 2-column input grid.
   - Add visual diffing (field comparison highlights) to `#duplicate-students-modal` and `#duplicate-questions-modal`.
   - Purge remaining native `confirm()` calls across admin scripts.

---

## 2. Visual Pre-Flight: Before & After Comparison Boards

### Board 1: Student Onboarding Multi-Step Wizard
![Onboarding Wizard Comparison](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/p447_comparison_onboarding_wizard.png)

### Board 2: Exam Submission Intelligence Modal
![Exam Submission Intelligence Comparison](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/p447_comparison_exam_submission.png)

### Board 3: Interactive 3D Flip Flashcard & Profile Drawer
![Flashcard & Profile Comparison](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/p447_comparison_flashcard_profile.png)

### Board 4: Admin Skor F Authorizer & Power Modals
![Admin Power Modals Comparison](file:///C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/p447_comparison_admin_power_modals.png)

---

## 3. Mandatory 4-Column Before & After Visual Planning Matrix

| Component & Target File | Baseline State (Before) | Proposed Specification (After) | Invariants & Verification Suite |
| :--- | :--- | :--- | :--- |
| **Onboarding Stepper & Education Modal**<br>`dashboard.html`<br>`css/dashboard.css`<br>`js/dashboard.js` | Disjointed popping dialogs without progress indicator. Broken mojibake `ðŸŽ“` icon. Raw select dropdowns and unstyled year input. | Continuous 4-step wizard with persistent stepper pill (`● ○ ○ ○`, `Step X of 4`). Fixed `🎓` icon. Clean degree chip pills (`SMA`, `SMK`, `S1/D4`, `S2`) with active sky-blue glow (`#38bdf8`). Dark glassmorphism container (`rgba(13,20,36,0.95)`). | **Rule 2.10 (SSOT Colors)**<br>UTF-8 clean validation.<br>`verify_p447_wave1_onboarding.mjs` |
| **Birthday & Photo Setup Modals**<br>`dashboard.html`<br>`css/dashboard.css` | Raw HTML date input. Webcam box lacks tactile borders. Action buttons use default blue with inconsistent spacing. | Unified wizard card structure. Custom styled date input with calendar trigger. Tactile webcam viewport with circular alignment frame, active camera pulse badge, and Grade A "Save & Continue" CTA. | **Spatial Invariants**<br>Card width locked to 390px mobile viewport.<br>`verify_p447_wave1_onboarding.mjs` |
| **Exam Pre-Submission Intelligence**<br>`test.html`<br>`css/test.css`<br>`js/test.js` | Plain confirmation box: *"Are you sure you want to submit?"*. Zero visibility into unanswered questions. 5 native `alert()` popups in `js/test.js`. | Real-time **Pre-Submit Inspection Card**: Answered questions metric (`35/40`, Grade A `#00c000`), Unanswered metric (`5 Soal`, Grade E `#ff0000`). Dual action buttons: `🔍 REVIEW UNANSWERED` (jumps to matrix) and `SUBMIT & LOCK FINAL 🔒`. All `alert()` replaced with glassmorphism alerts. | **Rule 2.10 (Semua Merah Grade E, Hijau Grade A)**<br>Zero native `alert()` in `js/test.js`.<br>`verify_p447_wave2_submission.mjs` |
| **Pre-Exam Focus Modal**<br>`test.html`<br>`css/test.css` | Basic centered warning box with generic text. | High-stakes Tactical Exam Briefing Card: audio hardware indicator, countdown pulse ring, and bulleted rules with checkmark icons. | **Tactical Sky Blue (`#38bdf8`)**<br>`verify_p447_wave2_submission.mjs` |
| **Interactive 3D Flashcard**<br>`dashboard.html`<br>`result.html`<br>`css/dashboard.css` | Flat 2D card with basic toggle text. Lacks phonetic pronunciation cue or semantic grading buttons. | Interactive 3D flip card (`perspective: 1000px`, `transform-style: preserve-3d`). Phonetic transcription with audio trigger icon (`/əˈkʌm.plɪʃ/ 🔊`). JetBrains Mono counter (`CARD 04 / 15`). Authoritative Grade E `❌ NEED PRACTICE` and Grade A `✓ MASTERED!` actions. | **Rule 2.10 SSOT Colors**<br>Native CSS 3D transforms.<br>`verify_p447_wave3_flashcards.mjs` |
| **Student Profile Drawer**<br>`dashboard.html`<br>`css/dashboard.css` | Centered box modal with dated tab navigation and basic form layout. | Sleek glassmorphism Profile Drawer. Avatar anchor with glowing crown badge (`👑`), smooth tab pills, JetBrains Mono PIN reset input, and active session telemetry chip. | **Mobile 390px Lock**<br>`verify_p447_wave3_flashcards.mjs` |
| **Admin Skor F Authorizer Modal**<br>`admin.html`<br>`css/admin.css`<br>`js/admin/student-management.js` | Raw browser `prompt('⚡ Skor F (Forgiven)... Masukkan alasan')`. No reason presets, no structured audit trail. | Authoritative **Skor F Dispensation Modal**: Pre-defined justification chips (*Dispensasi Sakit*, *Force Majeure*, *Technical Audio Glitch*, *Prerogatif Mr. Top*), character-counted textarea, Grade C Yellow border & button styling. | **Rule 2.10 (Semua Kuning Grade C `#ffff00`)**<br>Zero native `prompt()` calls.<br>`verify_p447_wave4_admin.mjs` |
| **Admin CRUD Modal & Diffing**<br>`admin.html`<br>`css/admin.css`<br>`js/admin/crud-modals.js` | `#crud-modal` scrolls off-screen without sticky buttons. `#duplicate-students-modal` lacks visual diff highlighting. | Sticky header with breadcrumbs and sticky footer action bar. Responsive 2-column grid. Duplicate resolver cards with green border for target record and red border for merged record. | **Rule 20 (Lower Panel Architecture)**<br>`verify_p447_wave4_admin.mjs` |

---

## 4. Wave-by-Wave Implementation Plan

### Wave 1: Student Multi-Step Onboarding Wizard Flow & Mojibake Eradication
- **Files:** `dashboard.html`, `css/dashboard.css`, `js/dashboard.js`
- **Actions:**
  1. Eradicate remaining mojibake in `dashboard.html`:
     - Line 100: `ðŸ‘‘` &rarr; `👑`
     - Line 219: `ðŸ—‚ï¸` &rarr; `🗂️`
     - Line 598: `ðŸŽ“` &rarr; `🎓`
  2. Implement unified `.wizard-stepper` component across all 4 onboarding cards:
     - Step 1: Gender Setup (`#gender-setup-modal`)
     - Step 2: Birthday Setup (`#birthday-setup-modal`)
     - Step 3: Academic Background (`#education-setup-modal`)
     - Step 4: Photo & Mic Hardware Setup (`#photo-setup-modal`)
  3. Redesign `#birthday-setup-modal` and `#education-setup-modal` into dark glassmorphism cards with degree chip selectors and tactical sky blue accents.
  4. Redesign `#photo-setup-modal` camera viewport with circular focus frame and device readiness badges.
  5. Automate verification with `scripts/verify_p447_wave1_onboarding.mjs`.

### Wave 2: Test Room Pre-Exam Briefing & Submission Intelligence
- **Files:** `test.html`, `css/test.css`, `js/test.js`
- **Actions:**
  1. Re-engineer `#submit-modal` DOM and logic in `js/test.js`:
     - Calculate live question stats on open: Total, Answered, Unanswered.
     - Display dual metric cards: Answered in Grade A Green (`#00c000`), Unanswered in Grade E Red (`#ff0000`).
     - Wire `#btn-review-unanswered`: closes modal and triggers `#matrix-popup` auto-jump.
     - Wire `#btn-confirm-submit`: locks test and proceeds to submission.
  2. Upgrade `#pre-exam-focus-modal` to tactical briefing format.
  3. Purge all 5 `alert()` calls in `js/test.js`, replacing them with custom glassmorphism modal toasts.
  4. Automate verification with `scripts/verify_p447_wave2_submission.mjs`.

### Wave 3: Interactive 3D Flip Flashcards & Student Profile Drawer
- **Files:** `dashboard.html`, `result.html`, `css/dashboard.css`, `js/dashboard.js`, `js/result.js`
- **Actions:**
  1. Upgrade `#flashcard-modal` styling: 3D perspective card flip, phonetic audio trigger, JetBrains Mono counter, and SSOT Grade E/A action buttons.
  2. Mirror flashcard upgrade in `result.html`.
  3. Upgrade `#profile-modal` into a glassmorphism profile drawer with glowing rank crown and PIN reset form.
  4. Replace 3 native `confirm()` calls in `js/result.js` with `#custom-confirm-modal`.
  5. Automate verification with `scripts/verify_p447_wave3_flashcards.mjs`.

### Wave 4: Admin Console Power Modals & Skor F Authorizer Dialog
- **Files:** `admin.html`, `css/admin.css`, `js/admin/student-management.js`, `js/admin/crud-modals.js`, `js/admin/app.js`
- **Actions:**
  1. Build `#skor-f-modal` in `admin.html` and wire `window.openSkorFModal()` in `student-management.js`, completely eliminating raw `prompt()`.
  2. Refactor `#crud-modal` with sticky header, sticky footer, and 2-column input layout.
  3. Enhance `#duplicate-students-modal` with visual diff comparison cards.
  4. Replace all remaining native `confirm()` calls across `js/admin/*.js` with custom admin confirmation dialogs.
  5. Automate verification with `scripts/verify_p447_wave4_admin.mjs`.

---

## 5. Asset Versioning & Cache Invalidation

Following the completion of each wave:
1. Bump Service Worker cache: `topscore-cache-option-a-v112` &rarr; `topscore-cache-option-a-v113` in `sw.js`.
2. Update query string timestamps on all modified assets:
   - `css/dashboard.css?v=20261113_v178`
   - `js/dashboard.js?v=20261113_v178`
   - `css/test.css?v=20261113_v176`
   - `js/test.js?v=20261113_v176`
   - `css/admin.css?v=20261113_v443`
   - `js/admin/app.js?v=20261113_v443`

---

## 6. Verification & Automated Test Protocol

Every wave is gated by a dedicated Playwright automated test suite running against the live server (`http://127.0.0.1:5500`):
1. `scripts/verify_p447_wave1_onboarding.mjs` &mdash; Validates stepper presence, mojibake absence, and chip selection.
2. `scripts/verify_p447_wave2_submission.mjs` &mdash; Validates dynamic answer calculation, unanswered warning badge, and zero native alerts.
3. `scripts/verify_p447_wave3_flashcards.mjs` &mdash; Validates 3D transform properties, phonetic triggers, and zero native confirms.
4. `scripts/verify_p447_wave4_admin.mjs` &mdash; Validates Skor F modal DOM and zero native prompts.

---

## 7. Execution Protocol

Per user instruction (*"kalau bisa kerjakan. kalau harus satu2 maka lakukan itu"*), the execution will proceed **atomically wave by wave**:
- Once approved via the "Proceed" button, execution begins immediately with **Step Zero** (pinning `tasks.md` to center screen).
- Wave 1 is implemented, tested with Playwright, and verified before moving to Wave 2.
- No autonomous `git commit` or `git push` will be performed (Rule 0.1.1 strictly preserved).
