# Implementation Plan: Calibrated Modern UI Polish, Capsule Purge & Invariant Normalization (Phase 481)

## Goal Description
Following the system audit and the user's feedback regarding corner curvature (*"ada banyak panel yang pojoknya menjadi tidak lengkung, kenapa? apakah itu aturan modern?"*), this plan establishes the **balanced, calibrated modern UI standard** across all TopsCore LMS modules.

Rather than an over-correction that flattens everything to harsh square boxes, modern UI architecture distinguishes between:
1. **Dialogs, Cards & Panels**: Maintain subtle, elegant rounded corners (**`12px` – `14px`**) to provide an elevated, friendly, and polished modern feel (aligned with Apple HIG, Linear, and Vercel standards).
2. **Action Buttons & Input Controls**: Standardized to precision rounded corners (**`6px` – `8px`**). This completely eliminates bulky pill capsules (`9999px` / `20px+`) while avoiding boxy, harsh 0px corners.
3. **Badges & Small Indicators**: Standardized to **`4px` – `6px`**.
4. **Table Grids & Data Cells**: Flat (**0px**) strictly within data grids and edge-docked panels to guarantee maximal information density, aligned column dividers, and zero dead space.
5. **Decorative Icon & Emoji Purge**: Eliminates lingering decorative emojis (`🚀`, `🔁`, `⚡`, `🎯`, `🏆`, `📊`, `💬`, `🚪`, `💡`, `✍️`, `🎙️`, `🚨`, `⚠️`) from buttons, card titles, badges, and modals.
6. **Dual-Scale Typography Architecture Alignment**: Replaces floating, sub-12px, and forbidden font sizes (14px, 13px, 15px, 0.72rem, 0.68rem) with strict Family A content/control standards (`20px – 16px – 12px`).
7. **Table Header ALL CAPS Exclusivity (Source Code Level)**: Harmonizes raw HTML and JS string templates from Title Case (`<th>Test Title</th>`) to strict ALL CAPS (`<th>TEST TITLE</th>`), locking all table `<th>` to `font-size: 12px !important;`.

---

## User Review Required

> [!IMPORTANT]
> **Updated Calibrated Simulator & Visual Overview Artifacts:**
> - **Interactive HTML Simulator**: [`system_wide_side_by_side_comparison.html`](file:///C:/Users/Top/.gemini/antigravity/brain/9cd18e1a-e810-46b1-b07c-aa2fbf26c31a/system_wide_side_by_side_comparison.html)
> - **Rendered Visual Snapshot**: [`side_by_side_comparison_overview.png`](file:///C:/Users/Top/.gemini/antigravity/brain/9cd18e1a-e810-46b1-b07c-aa2fbf26c31a/side_by_side_comparison_overview.png)
>
> Review the calibrated side-by-side Before and After specifications below.

### 📐 Visual Pre-Flight Verification Checklist
- [x] **Current State Snapshot (Before)**: Documented baseline appearance with bulky capsules, decorative emojis, and non-conforming font sizes.
- [x] **Proposed Visual Mockup (After)**: Updated interactive simulator and screenshot reflecting balanced modern curves (12px–14px dialogs, 6px–8px buttons).
- [x] **Zero Outer Page Scroll**: Verified root `100vh` lock with `calc(100vh - 60px)` console sizing.
- [x] **Container Spacing**: Verified strict 10px gap between all cards, tables, and top/lower panels.
- [x] **Lower Panel Alignment**: Verified 40px fixed Sub Panel height aligned with `.sidebar-footer` (Sub Corner).
- [x] **Dynamic Columns & Nowrap**: Verified `white-space: nowrap !important;` on table cells with zero clipped text.
- [x] **Zero Dead Space**: Verified tables and cards expand to fill 100% width cleanly.
- [x] **Language Standard**: Verified all headers, labels, and loading messages use 100% direct English.

---

### Side-by-Side Before vs After Detailed Specifications

#### Area 1: Admin Workstation (Topbar Controls & Modals)
| Component | Before (Current) | After (Calibrated Modern) | Invariant Enforced |
| :--- | :--- | :--- | :--- |
| **Edit Mode Button** | `border-radius: 9999px;` (Capsule) + Padlock emoji: `🔒 EXIT EDIT MODE` | `border-radius: 6px; height: 30px;` + Clean text: `EXIT EDIT MODE` | 30px Toolbar Button Invariant + Modern 6px Precision Radius + Zero Emoji Rule |
| **Profile & Dossier Modals** | `border-radius: 16px;` on `.student-profile-dialog` and `.student-dossier-dialog` | `border-radius: 12px;` | Modern Dialog Curve (12px) |
| **Topbar Logout Button** | Door emoji `<button>🚪</button>` | Clean text or standard icon | Zero Emoji Rule |
| **Master Edit HUD** | `⚠️ MASTER EDIT MODE ACTIVE` | `MASTER EDIT MODE ACTIVE` | Zero Emoji Rule |

#### Area 2: Student Dashboard (Cards, Buttons & Tab Nav)
| Component | Before (Current) | After (Calibrated Modern) | Invariant Enforced |
| :--- | :--- | :--- | :--- |
| **Exam / Task Action Buttons** | Capsule `border-radius: 20px;` with emojis: `Start Exam 🚀`, `🔁 Retake Exam`, `🎯 Retake Drill` | Standard `40px` height button, modern `border-radius: 8px;` with clean text: `START EXAM`, `RETAKE EXAM`, `RETAKE DRILL` | 40px Action Invariant + Modern 8px Curve + Zero Emoji Rule |
| **Profile Tab Bar** | Capsule container `border-radius: 20px;`, buttons `border-radius: 14px;`, font `0.72rem` (11.5px) | Container `border-radius: 8px;`, buttons `height: 30px; border-radius: 6px; font-size: 12px; font-weight: 700;` | Family A 12px Min Font + Modern 6px-8px Tab Architecture |
| **Component Cards Header** | Emojis: `<span>📊</span> Words Component`, `<span>💬</span> Phrases Component` | Clean text: `WORDS COMPONENT`, `PHRASES COMPONENT` | Zero Emoji Rule |
| **Birthday & Education Setup Dialogs** | `border-radius: 16px;` with font sizes `0.85rem` (13.6px), `0.8rem` (12.8px), `0.9rem` (14.4px) | `border-radius: 12px;`, all labels & inputs standardized to `12px` | Family A 12px Rule + Modern Dialog Radius (12px) |
| **Dashboard Modals Header** | `&#128682; Lobby`, `&#127891; Profile`, `🚪 Sign Out` | `LOBBY`, `PROFILE`, `SIGN OUT` | Header ALL CAPS + Zero Emoji Rule |

#### Area 3: Student Test Room & Cheat Warning Dialog
| Component | Before (Current) | After (Calibrated Modern) | Invariant Enforced |
| :--- | :--- | :--- | :--- |
| **Cheat Warning Box** | Extreme `border-radius: 28px;` | Modern dialog `border-radius: 14px;` | Modern Dialog Radius Invariant (14px) |
| **Cheat Strikes Badge** | Pill capsule `border-radius: 9999px;` | Crisp badge `border-radius: 6px; font-size: 12px; font-weight: 900;` | Precision Badge Invariant (6px) |
| **Cheat Return Button** | `border-radius: 16px; font-size: 1.25rem;` | `height: 40px; border-radius: 6px; font-size: 12px; font-weight: 800;` | 40px Dialog Button Invariant + Modern 6px Curve |
| **Speech Question & Transcript Cards** | `border-radius: 16px;` | Standard card `border-radius: 12px;` | Modern Card Radius Invariant (12px) |
| **Hazard Give Up & Return Buttons** | `border-radius: 16px;` | Standardized to modern `border-radius: 8px;` | Precision Button Invariant (8px) |
| **Hazard Block & Warning Counter** | `border-radius: 18px;` | Standardized to `border-radius: 10px;` | Modern Container Invariant (10px) |
| **Hint & Word Counters** | `💡 Hint`, `✍️ 0/1`, `🎙️ 0/1` | `Hint`, `0/1`, `0/1` | Zero Emoji Rule |
| **Toast Notifications** | `🚨 Exam terminated...`, `⚠️ Less than 2 minutes...` | `Exam terminated...`, `Less than 2 minutes remaining!` | Zero Emoji Rule |

#### Area 4: Flashcard & Review Stage (`css/style.css`)
| Component | Before (Current) | After (Calibrated Modern) | Invariant Enforced |
| :--- | :--- | :--- | :--- |
| **Flashcard Modal Box** | `border-radius: 20px;` | `border-radius: 12px;` | Modern Dialog Box Invariant (12px) |
| **Flip Card Stages** | `border-radius: 16px;` | `border-radius: 12px;` | Modern Card Invariant (12px) |
| **POS Pill & Speak Button** | `border-radius: 12px;`, `border-radius: 20px;` | `border-radius: 6px;` | Precision Control Invariant (6px) |
| **Flashcard Metadata Fonts** | Sub-12px: `0.68rem` (10.9px), `0.72rem` (11.5px), `0.76rem` (12.2px) | Standardized strictly to `12px` | Family A 12px Minimum Invariant |

#### Area 5: Table Headers (String Level ALL CAPS & 12px Font Lock)
| Component | Before (Current) | After (Calibrated Modern) | Invariant Enforced |
| :--- | :--- | :--- | :--- |
| **Dashboard Exam History Table** | `<th>Test Title</th>`, `<th>Score</th>`, `<th>Grade</th>`, `<th>Date</th>` | `<th>TEST TITLE</th>`, `<th>SCORE</th>`, `<th>GRADE</th>`, `<th>DATE</th>` | Table Header ALL CAPS Exclusivity |
| **Dashboard & Result Table CSS** | `table th { font-size: 0.72rem; }` (11.5px) and `0.68rem` (10.9px) | `table th { font-size: 12px !important; }` | Family A 12px Rule + 40px Header Invariant |
| **Admin Classes & Tests Management JS** | String templates with `<th>Topic Name</th>`, `<th>Indonesian Prompt</th>`, `<th>Fail Rate</th>`, `<th>Student Name</th>` | `<th>TOPIC NAME</th>`, `<th>INDONESIAN PROMPT</th>`, `<th>FAIL RATE</th>`, `<th>STUDENT NAME</th>` | Table Header ALL CAPS Exclusivity |

#### Area 6: Login Portal & Result Page
| Component | Before (Current) | After (Calibrated Modern) | Invariant Enforced |
| :--- | :--- | :--- | :--- |
| **Login Inputs & Buttons (`css/auth.css`)** | `border-radius: 100px;` (Capsule) with floating fonts (`0.95rem`, `0.74rem`) | `border-radius: 6px;`, standardized to `16px` (labels/inputs) and `12px` (meta/buttons) | Precision 6px Input + Dual-Scale Rule |
| **Login Action Buttons** | `&#128465;&#65039; Clear saved login info`, `&#9881;&#65039; Tutor Portal` | Clean text: `Clear saved login info`, `Tutor Portal` | Zero Emoji Rule |
| **Result Page Stamps** | `🛡️` stamp icon, `🎉 Congratulations`, `🔒 Next Milestone` | Clean text: `Verified Official Report`, `Congratulations`, `Next Milestone` | Zero Emoji Rule |

---

## Open Questions

None. The calibrated curvature scale (12px–14px for dialogs, 6px–8px for buttons, 4px–6px for badges, and 0px for table data cells) aligns modern aesthetic ergonomics with the non-negotiable rules.

---

## Proposed Changes

### Component 1: Admin Workstation Styles & Templates
#### [MODIFY] `css/admin.css`
- Line 4057: Change `.btn-edit-mode-global` from `border-radius: 9999px;` to `border-radius: 6px; height: 30px;`.
- Lines 5520, 5588: Change `.student-profile-dialog` and `.student-dossier-dialog` from `border-radius: 16px;` to `border-radius: 12px;`.
- Bump cache buster in `admin.html`.

#### [MODIFY] `admin.html`
- Purge emojis in topbar: line 85 (`🔒`), line 132 (`🚪`), line 152 (`⚠️`), line 156 (`🔒`).
- Standardize raw `<th>` strings in line 562 from `Student Name` / `Enrollment Type` to ALL CAPS `STUDENT NAME` / `ENROLLMENT TYPE`.

---

### Component 2: Student Dashboard Styles & Logic
#### [MODIFY] `css/dashboard.css`
- Lines 1222, 1235: Change `table th` font-size from `0.72rem` / `0.68rem` to `font-size: 12px !important;`.
- Lines 1385, 1396: Change `.profile-tab-nav` to `border-radius: 8px;` and `.profile-tab-btn` to `border-radius: 6px; font-size: 12px;`.
- Lines 3823, 3986: Change `.gender-square-card` and `.gender-card` from `border-radius: 16px;` to `border-radius: 10px;`.
- Lines 4250, 4333: Change `.birthday-setup-card` and `.education-setup-card` from `border-radius: 16px;` to `border-radius: 12px;`.
- Normalize `.setup-card-subtitle`, `.setup-input-label`, `#onboard-birth-date` to `12px`.
- Bump cache buster in `dashboard.html`.

#### [MODIFY] `dashboard.html`
- Line 200: Change raw `<th>` from `Test Title`, `Score`, `Grade`, `Date` to `TEST TITLE`, `SCORE`, `GRADE`, `DATE`.
- Lines 223, 266, 280, 303, 422: Purge emojis from `Lobby`, `Words Component`, `Phrases Component`, `Profile`, and `Sign Out`.

#### [MODIFY] `js/dashboard.js`
- Lines 2083–2156, 2672–2675: Purge emojis from action buttons (`Start Exam 🚀` $\rightarrow$ `Start Exam`, `🔁 Retake` $\rightarrow$ `Retake`, `🎯 Retake Drill` $\rightarrow$ `Retake Drill`, `⚡ Retake` $\rightarrow$ `Retake`).
- Line 3934: Purge `🔒` from toast notifications.

---

### Component 3: Student Test Room Styles & Logic
#### [MODIFY] `css/test.css`
- Lines 1445, 1470, 1527: Change `.cheat-box` to `border-radius: 14px;`, `.cheat-strikes-badge` to `border-radius: 6px; font-size: 12px;`, and `.cheat-dismiss-btn` to `height: 40px; border-radius: 6px; font-size: 12px;`.
- Lines 190, 223: Change `.speech-question-card` and `.speech-transcript-card` to `border-radius: 12px;`.
- Lines 1568, 1621, 1633, 1773, 1804: Change `#submit-modal-box` to `border-radius: 14px;`, `.hazard-block` and `.hazard-block-ready` to `border-radius: 10px;`, and `.hazard-btn-giveup` / `.hazard-btn-back-neon` to `border-radius: 8px;`.
- Bump cache buster in `test.html`.

#### [MODIFY] `test.html`
- Lines 152, 166, 202: Purge emojis (`💡`, `🛡️`, `🚀`) from instructions and fullscreen modal.

#### [MODIFY] `js/test.js`
- Lines 2513, 2612: Purge `💡` from `Hint`.
- Lines 2499, 2587: Purge `✍️` and `🎙️` from counter indicators.
- Lines 486, 1601: Purge emojis from alert toasts (`🚨`, `⚠️`).

---

### Component 4: Flashcards, Login & Result Pages
#### [MODIFY] `css/style.css`
- Lines 1703, 1774, 1800, 1844: Standardize `.flashcard-modal-card` to `border-radius: 12px;`, `.flip-card-front`/`.flip-card-back` to `border-radius: 12px;`, and `.fc-pos-pill`/`.fc-speak-btn` to `border-radius: 6px;`.
- Normalize sub-12px fonts in `.fc-pos-pill`, `.fc-tap-hint`, `.fc-target-label`, `.fc-front-student-ans` to `12px`.

#### [MODIFY] `css/auth.css`
- Line 113: Change capsule `border-radius: 100px;` to `border-radius: 6px;`.
- Standardize odd rem fonts to `16px` and `12px`.

#### [MODIFY] `index.html`
- Lines 170, 175: Purge trash and gear emojis from login action links.

#### [MODIFY] `css/result.css`
- Lines 342, 409, 1776, 1867: Standardize table `th` to `font-size: 12px !important;` and eliminate sub-12px and 20px capsule radii.

#### [MODIFY] `result.html` & `js/result.js`
- Purge stamp emoji `🛡️` from report card and congratulations emoji `🎉` from result message.

---

### Component 5: Table Headers Source Strings
#### [MODIFY] `js/admin/student-management.js`, `js/admin/tests-management.js`, `js/admin/class.js`, `js/admin/classes-management.js`
- Convert all template string table headers (`<th>Topic Name</th>`, `<th>Indonesian Prompt</th>`, `<th>Fail Rate</th>`, `<th>Task Score</th>`, `<th>Student Name</th>`) to strict ALL CAPS (`<th>TOPIC NAME</th>`, `<th>INDONESIAN PROMPT</th>`, `<th>FAIL RATE</th>`, `<th>TASK SCORE</th>`, `<th>STUDENT NAME</th>`).

---

## Verification Plan

### Automated Tests
1. **JavaScript Syntax Check**:
   ```powershell
   node scripts/check_all_js_syntax.cjs
   ```
   *(Must validate 48/48 JS files with zero syntax errors).*

2. **Spatial & Visual Invariants Audit**:
   ```powershell
   node .agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs
   ```
   *(Must pass 100% on 100vh lock, 40px Sub Panel, 60px dialog footer, 10px container gap).*

3. **Universal Single-Source Color SSOT Check**:
   ```powershell
   node scripts/test_universal_color_token_ssot.mjs
   ```
   *(Must pass 6/6 pillars of single-source color tokenization).*

4. **Complete Regression Test Suite**:
   ```powershell
   npm.cmd test
   ```
   *(Must pass all 47 test suites without regressions).*

### Manual Verification
1. Open [`system_wide_side_by_side_comparison.html`](file:///C:/Users/Top/.gemini/antigravity/brain/9cd18e1a-e810-46b1-b07c-aa2fbf26c31a/system_wide_side_by_side_comparison.html) to verify visual side-by-side alignment across all 6 areas.
2. Inspect `admin.html` in browser: confirm Exit Edit Mode button is a modern 6px button (not a capsule pill) and modal dialogs have a clean 12px curve.
3. Inspect `dashboard.html` in browser: confirm action buttons (`Start Exam`, `Retake Exam`) are modern 8px rounded buttons without emojis or capsule borders.
4. Inspect `test.html` in browser: trigger warning modal, verify 14px box radius, 6px strike badge, and clean text.
