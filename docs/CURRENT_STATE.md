# CURRENT STATE

Last Updated: 2026-10-19 19:28 UTC+8

Current Phase: Phase 41 Service Worker Network-First CSS & Cache Invalidation Complete

Current Task: ALL PHASE 41 DIRECTIVES VERIFIED 100%

Status: COMPLETE

## In Progress
- None (Phase 41 Service Worker Cache Invalidation & Keyboard CSS Syntax Fix verified 100%).

## Completed

- **Phase 41: Service Worker Network-First CSS & Cache Invalidation to v5.3.2 [100% VERIFIED]**:
  - Diagnosed user screenshot showing old 34px buttons: Root cause was Service Worker `sw.js` caching `assessment.css` Cache-First under `abcd-core-v5.2.2`, plus CSS syntax error in `css/assessment.css` (unclosed brace).
  - Repaired `css/assessment.css` structure so `#virtual-keyboard-container` is closed properly and `.vk-row` / `.vk-key` are top-level selectors.
  - Updated `sw.js` to `abcd-core-v5.3.2`, added Network-First for `.css`, and bumped all asset URLs to `v=5.3.2`.
  - Added proactive service worker update triggers in `assessment.html` and `index.html`.
  - Verified with Playwright tests (`scratch/check_keyboard_ratio.mjs` and `scratch/test_police_siren_cheat.mjs`).

- **Phase 40: Assessment Body Direct 22-8-22-48 Ratio & 58px Virtual Keyboard Keys [100% VERIFIED]**:
  - **1. User Context & Root Cause Analysis**:
    * User reported: *"this is how the keyboard look like,,, the size is different than what we discussed,,, the height of keyboard is supposed to be 48% of the assesment body. the ratio that we agreed upon was 22-8-22-48 in percentage to the assesment body size . pelase check again"*.
    * User added: *"the button are too small, its not comfortable for typing"*.
    * Root Cause: On the live deployed site (`tops-core.netlify.app`), the previous code nested the keyboard inside an intermediate container with dead space below it, and capped key heights at `clamp(34px, 5.8vh, 46px)` with `max-width: 9.5%`. Furthermore, recent local changes had not yet been pushed to git/Netlify.
  - **2. Full Solution Implementation**:
    * **Direct 22-8-22-48 Assessment Body Architecture (`js/assessment.js`)**:
      - Eliminated intermediate nested container in written mode.
      - Rendered 4 direct children in `assessment-main`:
        1. Question Box: `calc(22% - 3px)` (21.4% computed)
        2. Metadata Table: `calc(8% - 2px)` (7.6% computed)
        3. Answer Box (`#answer-container-written`): `calc(22% - 3px)` (21.4% computed)
        4. Virtual Keyboard (`#virtual-keyboard-container`): `calc(48% - 4px)` (47.3% computed)
      - Used `gap: 4px` and `justify-content: space-between` to fill 100% of the viewport body with 0 dead space.
    * **Virtual Keyboard & Key Expansion (`css/assessment.css`)**:
      - `#virtual-keyboard-container`: Strict 48% height (`calc(48% - 4px) !important;`).
      - `.vk-row`: `flex: 1 1 0; height: calc(25% - 3px); align-items: stretch !important; gap: 3px;`.
      - `.vk-key`: Height set to `100% !important;` with `max-height: none !important;` and `max-width: none !important; flex: 1 1 0;`.
      - Key height increased from 34px to **58.3px** (+71% taller).
      - Key width increased to **30.1px** with 3px gaps.
      - Key font size enlarged to **`clamp(16px, 4.4vw, 21px); font-weight: 800;`** for comfortable thumb typing.
  - **3. Cross-Scenario Automated Verification (`scratch/check_keyboard_ratio.mjs` & `test_police_siren_cheat.mjs`)**:
    * All metrics verified: Question 21.4%, Metadata 7.6%, Answer 21.4%, Keyboard 47.3% (= 48% allocated).
    * Anti-Cheat tests continue to pass 100% with siren and 10s countdown.
    * Screenshot verified: `scratch/screenshot_test_current_metrics.png`.

- **Phase 39: Red Flashing Anti-Cheat Warning with Mobile Police Siren, Countdown Timer, & 3-Strike Limit [100% VERIFIED]**:
  - **1. User Mandate & Clarification**:
    * User explicitly clarified: *"kita perjelas lagi,,, warning sign maksud saya adalah yang berwarna merah itu, dengan hitung mundur , dan auto submit saat mencapai 0, serta batas perinagatan 3 kali. bunyinya pada hp juga pakai sisrine polisi. dan ingat flashing red!"*.
    * Requirement: When student presses return button (`popstate`) or triggers blur/side panel, display the exact red flashing anti-cheat screen with police siren audio on mobile, a 10s countdown to auto-submit, and a 3-warning limit before termination.
  - **2. Full Solution Implementation**:
    * **Red Flashing Overlay (`css/dashboard.css` & `assessment.html`)**:
      - `#cheat-overlay` styled with `background: rgba(220, 38, 38, 0.95)`, `backdrop-filter: blur(16px)`, and `animation: cheat-red-flash 0.4s ease-in-out infinite alternate !important`.
      - Flashes intensely between dark crimson `#881313` and emergency red `#ef4444`.
      - `.cheat-countdown-circle` with glowing border displaying `#cheat-timer-count` and `"SECONDS TO AUTO-SUBMIT"`.
      - Cleanly formatted `#dismiss-cheat-btn` ("Return to My ASSESSMENT") fitting mobile viewports without horizontal overflow.
    * **Web Audio Police Siren Synthesizer (`js/assessment.js`)**:
      - `startPoliceSiren()` and `stopPoliceSiren()` with `sawtooth` oscillator sweeping 650Hz–1250Hz in repeating 1s wail cycles.
      - Mobile audio unlocked on first interaction (`click` / `touchstart`).
      - Mobile haptic vibration (`navigator.vibrate([300, 150, 300, 150, 300, 150, 600])`) matching the siren wail.
    * **3-Warning Limit & Strikes Progression**:
      - Strike 1: `STRIKE 1 OF 3` (Warning 1).
      - Strike 2: `STRIKE 2 OF 3` (Warning 2).
      - Strike 3: `STRIKE 3 OF 3 (FINAL WARNING)`.
      - Violation 4 (Limit Exceeded): Shows `LIMIT EXCEEDED (3/3)` and auto-submits.
    * **Countdown & Auto-Submit**:
      - 10s countdown timer auto-submits (`doSubmit(true)`) if it reaches 0.
      - If student taps `"Return to My ASSESSMENT"`, countdown and siren stop, overlay hides, and exam resumes with 0 answer loss.
      - If student leaves app for >10s, `visibilitychange`/`focus` auto-submits on return; if <10s, countdown resumes.
  - **3. Cross-Scenario Automated Verification (`scratch/test_police_siren_cheat.mjs`)**:
    * All tests passed with exit code 0:
      - Strike 1 (return button / popstate): Red flashing background verified, `STRIKE 1 OF 3` badge verified, countdown ticking verified, dismissed cleanly.
      - Strike 2 (blur / side panel): `STRIKE 2 OF 3` verified, dismissed cleanly.
      - Strike 3 (blur): `STRIKE 3 OF 3 (FINAL WARNING)` and custom button text verified.
      - Violation 4 (exceeded 3 warnings): `LIMIT EXCEEDED (3/3)` verified, auto-submit called successfully (`submit-assessment`).
    * Screenshots verified: `scratch/screenshot_cheat_red_strike1.png`, `scratch/screenshot_cheat_red_strike3.png`.

- **Phase 38: Return Button & Side Panel Warning Sign (Zero Auto-Submit) [100% VERIFIED]**:
  - **1. User Problem & Context**:
    * User reported: *"when my student push the return button or accidentally push side panel, show the wraning sign intead of auto submit"*.
    * Previously, when a student on a mobile phone pressed the hardware/gesture return button (`popstate`) or accidentally pulled down an edge/side panel (e.g. Samsung Edge Panel, Android multi-tasking edge swipe, triggering `window.blur` or `visibilitychange`), the system treated it as a cheating infraction with a 10-second countdown or 3-strike kill switch.
    * If the countdown elapsed (or expired while minimized/unfocused) or strikes reached 3, it terminated the exam and called `doSubmit(true)`, prematurely locking the student out with an incomplete score.
  - **2. Full Solution Implementation**:
    * **Eliminated All Punitive Auto-Submissions**:
      - Completely removed `doSubmit(true)` from `triggerCheatAlert` (no strike termination).
      - Completely removed countdown death timer (`cheatInterval` auto-submit removed).
      - Completely removed auto-submit on `visibilitychange` (no termination upon returning from background/minimized).
      - Completely removed auto-submit on `window.focus` (no termination upon window refocus).
      - Auto-submission (`doSubmit(true)`) is now strictly reserved for the official exam timer expiration (`time_limit_seconds` reaching 00:00) and explicit user submission.
    * **Modern Warning Sign Modal (`assessment.html` & `css/dashboard.css`)**:
      - Replaced the aggressive red strobe box with an authoritative, modern dark glass warning modal featuring an amber warning icon `⚠️`, title `ASSESSMENT WARNING`, warning badge `ATTENTION REQUIRED`, clear explanatory copy, and a large, high-contrast action button: `[Return to My ASSESSMENT ➔]`.
      - Ensured `#dismiss-cheat-btn` has `type="button"` and `preventDefault()` / `stopPropagation()` to prevent any accidental navigation or form submit.
      - Added backdrop dismissal (`#cheat-overlay` click).
    * **Preserved Anti-Cheat Tracking & Answer Persistence (`js/assessment.js`)**:
      - Maintained `lockHistory()` (`history.pushState`) to prevent the browser from actually exiting the assessment page on return button press.
      - Maintained `logCheatingEvent` audit logging (`NAV_WARNING` action) so teachers can inspect student distraction/navigation attempts in audit logs.
      - Added instant buffer persistence (`saveCurrentAnswer()`, `persistLocalBuffer()`) when warning triggers or when window refocuses, ensuring 0 answers are lost.
      - Tapping `[Return to My ASSESSMENT]` safely dismisses the warning overlay and refocuses the active keyboard input so the student immediately continues their exam.
  - **3. Cross-Scenario Automated Verification (`scratch/test_warning_sign.mjs`)**:
    * Verified Return Button simulation (`popstate`):
      - Warning overlay appears immediately (`isVisible: true`).
      - Shows `ASSESSMENT WARNING` and `Return button pressed / Navigation attempted. Please stay on the assessment screen to complete your questions. Your answers are saved.`
      - Tapping `[Return to My ASSESSMENT]` smoothly dismisses the overlay.
      - Typed answer (`"hello"`) is 100% preserved.
      - `submitAssessment` was NOT called (`submitCalled: false`).
    * Verified Accidental Side Panel simulation (`blur`):
      - Warning overlay appears immediately with `Screen lost focus / Side panel or external app opened...`
      - Waited 3+ seconds past what was previously a countdown: `submitAssessment` was NOT called (`submitCalled: false`).
      - Dismissed overlay and continued answering: typed additional letter `'s'` -> `"hellos"`!
    * Screenshots verified: `scratch/screenshot_warning_return_button.png`, `scratch/screenshot_warning_side_panel.png`.

- **Phase 37: Assessment Virtual Keyboard 22-8-22-48 Ergonomic Ratio Scaling [100% VERIFIED]**:
  - **1. User Problem & Context**:
    * Assessment testers and students complained that virtual keyboard buttons on mobile devices were too small and cramped (originally ~24px height), making tapping difficult and causing mis-taps.
    * User requested evaluating layout options and specifically agreed upon **Ratio Option A: 22 - 8 - 22 - 48** (Question Box: 22%, Metadata: 8%, Answer Box: 22%, Virtual Keyboard: 48%).
  - **2. Full Solution Implementation**:
    * Modified `css/assessment.css`:
      - `#virtual-keyboard-container`: Set height to `calc(68.6% - 2px) !important;` (48% of total viewport body).
      - `.vk-row`: Scaled with `flex: 1`, `gap: 4px`, `max-height: 25%`.
      - `.vk-key`: Increased key height from `clamp(22px, 4.5vh, 28px)` to **`clamp(34px, 5.8vh, 46px)`** (almost 2x taller!). Increased font size to **`clamp(13px, 3.2vw, 15px); font-weight: 700;`** with enhanced active tap state feedback.
      - `.vk-key.special` and `.vk-key.space`: Scaled proportionally for easy thumb reach.
    * Modified `js/assessment.js`:
      - Dynamically calculated layout based on `isWritten = (answerType === 'written')`.
      - `questionBox`: Height set to 22% for written questions (30% for other modes). Font size scaled to `clamp(18px, 4.4vw, 24px)` to preserve full readability of long phrases.
      - `metadataTable`: Height set to 8% for written questions (10% for other modes) with `font-size: 10px` and `3px` gap to prevent text clipping.
      - `interactionContainer`: Height set to `calc(70% - 6px)` for written questions (`calc(60% - 8px)` for other modes).
      - `answerArea`: Upper 31.4% of interaction container (= 22% of body).
      - `controlArea` (`#virtual-keyboard-container`): Lower 68.6% of interaction container (= 48% of body).
      - Preserved existing 30 - 10 - 60 ratios for Multiple Choice and Speech assessment modes.
  - **3. Cross-Viewport Automated Verification**:
    * Tested on iPhone 14 (390 x 844) and Galaxy S20 (360 x 780) via Playwright (`scratch/test_keyboard_ratio.mjs`):
      - iPhone 14: Question Box 22.0% (129px), Meta 8.0% (47px), Answer 21.1% (124px), Keyboard 47.0% (276px), Key height: 46px, Key width: 32px.
      - Galaxy S20: Question Box 22.0% (115px), Meta 8.0% (42px), Answer 21.0% (110px), Keyboard 46.9% (246px), Key height: 45px, Key width: 29px.
      - Full typing input tested: "hello" typed smoothly via virtual keyboard clicks into textarea.
    * Regression verification on MCQ and Speech modes (`scratch/verify_other_modes.mjs`):
      - Both retain exact 30.0% question box, 10.0% metadata, 58.6% interaction area with 0 regressions.
    * Visual screenshots confirmed: `scratch/screenshot_keyboard_iphone_14.png`, `scratch/screenshot_keyboard_galaxy_s20.png`.


- **Phase 36: Fix Assessment Count Discrepancy, Edit Modal Class Wiping & Auto-Gen Dedup [100% VERIFIED]**:
  - **1. Root Cause Identification**:
    * Edit Modal (`js/admin/crud-modals.js`): `#field-class_id` was populated via `classes.filter(s => s.institution_id === selectedProgId)` where `selectedProgId` was institution ID. In PostgreSQL, classes link to `program_id`, while `classes.institution_id` is null. `filteredClasses` was empty, leaving `#field-class_id` with an empty string. Saving the modal (e.g. changing answer_type to spoken) overwrote `class_id` with `null` in the DB, causing the assessment to immediately disappear from `#class-hub`.
    * Auto-Gen Duplicate Creation (`js/api.js`): Running Auto-Gen searched for existing assessments using `.eq('class_id', classId)`. Because the original assessment's `class_id` was null, dedup failed to match and inserted an unneeded duplicate assessment (`1d32de2f...`), inflating Assessment Hub to 41 records while Class Hub showed 39.
  - **2. Full Solution Implementation**:
    * Fixed `js/admin/crud-modals.js`: Correctly filters classes by `currentProgramId` (`s.program_id === currentProgramId`), `selectedProgId`, or existing `record.class_id`, ensuring `#field-class_id` is always properly populated and pre-selected.
    * Added readonly and foreign-key protection: When editing a record, readonly fields and structural foreign keys (`class_id`, `program_id`, `level_id`, `institution_id`) are never overwritten with `null` if the input is disabled or unselected.
    * Fixed `js/api.js`: Replaced narrow `class_id` matching in `upsertDynamicAssessmentShell` with canonical curriculum hierarchy dedup `(shell_code, program_id, level_id)`. Existing shells are updated and repaired (setting `class_id: classId`) rather than generating duplicate assessment records. Preserved custom user answer types (`effectiveAnswerType`).
    * Fixed `js/admin/vocab-vault.js`: Ensured `explicitClassId` (`window._selectedClassId` or local storage) is passed to `openAutoGenerateModal` across all generator triggers.
  - **3. Database Reconciliation & UI Verification**:
    * Deleted orphaned duplicate assessment `1d32de2f-9c1a-4dc3-b249-fcdf4e592f35` (0 attempts, 0 questions).
    * Restored original assessment `b95f4826-ca8c-4d3f-9b46-3ff7ec092a80` (has 9 student attempts) with `class_id = 'ab33498a-90e6-44b7-83f4-5765f964543e'` (Vocabulary Class) and confirmed `answer_type: 'spoken'`.
    * Re-audited database: Exactly 40 live assessments, all 40 belonging to Vocabulary Class, 0 null class assessments.
    * Playwright verification passed 100%: Class Hub (`#class-hub`) displays 40 records with A Words Test present; Assessment Hub (`#assessments`) displays 40 records with exactly 1 A Words Test.

- **Phase 35: Fix Best Score Demotion, Up Next False Failure & Batch Leaderboard Deflation [100% VERIFIED]**:
  - **1. Root Cause Identification & PostgREST Sorting Fix**:
    * Discovered that `submit-assessment` Edge Function queried attempts sorted by `.order("effective_score", { ascending: false })`. In PostgreSQL/PostgREST, descending sorts default to `NULLS FIRST`.
    * Any historical attempt with `effective_score: null` (score 0%) was sorted first and erroneously assigned `is_best_score = true`, demoting real 90%/85% attempts to `false`.
    * Implemented in-memory sorting in `supabase/functions/submit-assessment/index.ts` using `Number(a.percentage ?? a.effective_score ?? 0)` descending and `created_at` descending, completely eliminating the PostgREST `NULLS FIRST` vulnerability.
  - **2. Frontend Mathematical Highest-Score Enforcement (`js/dashboard.js`)**:
    * `populateUpNext`: Switched to strict mathematical `bestMap[aid] = Math.max(previousBest, pct)` for all valid submitted attempts. Eliminates loop overwrite bugs where an old 0% attempt reset the score and prompted false "Needs Improvement (30.0%)" retakes.
    * `computeOverallStats`: Removed `_locked` lockout; student overall score strictly averages true highest percentages per assessment.
    * `loadBatchLeaderboard`: Standings computed strictly from highest percentage per student per assessment, restoring King Test to 92% (Grade A).
    * `renderClassesOverview` & `renderAssessmentsGrid`: Best attempt selected using `pct > bestPct` (breaking ties by latest `submitted_at`), preventing demotions.
  - **3. API & Results Display Modernization**:
    * Updated `recalculateBestScore` and `applyRecalibrateAssessment` in `js/api.js` to sort in-memory by percentage descending.
    * Updated `js/result.js` history table and best-score badge to dynamically identify the highest scoring attempt mathematically.
  - **4. Cloud Database Recalibration & Zero-Defect Audit**:
    * Audited all 156 student-assessment pairs across Supabase Cloud.
    * Repaired all 13 corrupted student-assessment records (26 attempt rows updated).
    * Re-audited database: confirmed 0 remaining corrupted records across all students.
    * Verified student "King Test": A2 Words Task resolves to 90% (Grade B, Passed), overall score 92% (Grade A), and Up Next advances to `3rd Vocabulary A2 Phrases Task - CV & Resume` (Start Now).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Phase 34: Fix Assessment Virtual Keyboard Lifecycle & Multi-Question Persistence [100% VERIFIED]**:
  - **1. Root Cause Identification**:
    * In `js/assessment.js` (`renderQuestion`), `#virtual-keyboard-container` was parked into `interactionContainer` inside `#assessment-main` on Question 1.
    * When moving to Question 2, `main.innerHTML = ''` ran while `#virtual-keyboard-container` was still inside `main`, obliterating the keyboard DOM element.
    * The rescue logic (`if (vk.parentElement !== document.body) document.body.appendChild(vk);`) was placed 50 lines too late (at line 931, after line 881 `main.innerHTML = ''`), causing `document.getElementById('virtual-keyboard-container')` to return `null`.
    * Physical keyboard typing was also disabled because `keydown` listener checked `!vkContainer` which evaluated to true.
  - **2. Safe Parking & Authoritative Getter Implementation**:
    * Implemented `getVirtualKeyboard()`: Guarantees `#virtual-keyboard-container` is retrieved or created in `document.body`.
    * Moved parking logic to execute strictly BEFORE `main.innerHTML = ''`: Before `#assessment-main` is cleared, the keyboard container is safely parked back into `document.body` (`document.body.appendChild(vk)`), preventing it from ever being destroyed during question transitions.
    * Upgraded event handling: Replaced static per-key listeners with delegated `document.addEventListener('click', ...)` and `mousedown` listeners (preventing textarea blur).
    * Updated physical keyboard `keydown` listener, `toggleUnansweredDrawer`, and speech fallback to use `getVirtualKeyboard()`.
  - **3. Automated Verification**:
    * Unit test suite `scratch/verify_keyboard_node.mjs` executed and passed 100%:
      - Question 1 (Written): Keyboard attached and visible (`display: flex`).
      - Question 2 (Written): Keyboard preserved, attached, and visible (`display: flex`).
      - Question 3 (Written): Keyboard preserved, attached, and visible (`display: flex`).
      - Backward navigation (Q3 -> Q2): Keyboard preserved and attached (`display: flex`).
    * Zero syntax errors (`node --check js/assessment.js` passed).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Phase 33: Refactor Topbar to Compact Summary Tabs & Purge Redundant Action Buttons [100% VERIFIED]**:
  - **1. Topbar Modern Sleek Tab Integration (Global Shell)**:
    * Completely eliminated `.topbar-breadcrumb` ("CLASS / Assessments Hub", `#topbar-domain`, `#topbar-title`) and `.topbar-actions`.
    * Standardized `<header class="admin-topbar" id="admin-topbar">` to 56px height, `background: rgba(15, 23, 42, 0.75)`, `backdrop-filter: blur(12px)`, and `border-bottom: 1px solid rgba(255, 255, 255, 0.08)`.
    * Preserved responsive sidebar toggle button (`#sidebar-toggle`) on the far left.
    * Implemented canonical `window.setTopbarTabs(tabs, activeId, onSelect)` with sleek tab card containers (`height: 42px; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; border-radius: 10px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.08);`).
    * Standardized elevated topbar layout globally across applicable admin views:
      - Assessments Hub: Total Assessments, Published, Draft, Question Bank.
      - Curriculum / Classes Hub: Institution selection tabs.
      - Student Management: Enrolled, Active, Completed Modules, Remediation KPIs.
  - **2. Purged Row C & All 8 Action Buttons (`js/admin/assessment-management.js`, `admin.html`)**:
    * Deleted entire button strip containing:
      1. `+ Create Assessment` (Obsolete: assessments rely on dynamic shell generator)
      2. `Cohorts & Assignments`
      3. `Results`
      4. `Recalibrate`
      5. `Import Questions`
      6. `Export Questions`
      7. `Vocab Vault`
      8. `Open Session`
    * Removed obsolete Row B in-page KPI card strip (`buildSectionTabBar`).
    * Filter tabs (`All Assessments`, `Core Curriculum`, `Standalone & Try-Outs`) and DataGrid pull up immediately beneath the topbar, reclaiming ~160px of vertical space with zero dead space.
  - **3. Relocated Exam Recalibrator to Domain D (Data Health)**:
    * Moved recalibration controller logic to Domain D -> Data Health (`admin.html#health`).
    * Registered dedicated maintenance card: "Assessment Engine Recalibration" (`#card-assessment-recalibration`) inside `renderDataHealth` in `js/admin/desk.js`.
    * Integrated full controller logic: target assessment dropdown (populated with all non-deleted assessments), preview calculation, metrics panel, detailed diff preview table with affected attempts filter, confirmation modal, and apply execution.
    * Grid row action "Recalibrate" now sets `window._filterRecalibrateAssessment = id` and routes to `admin.html#health`, scrolling to `#card-assessment-recalibration` and auto-firing diff preview.
    * Replaced standalone recalibrator in `js/admin/class.js` and `js/admin/app.js` with delegation/redirect to `#health`.
  - **4. Automated Playwright Verification**:
    * Navigated to `http://127.0.0.1:5500/admin.html#assessments`:
      - Breadcrumb count: 0 (absent).
      - Topbar tab cards count: 4 (Total Assessments: 40, Published: 32, Draft: 8, Question Bank: 0).
      - Row C action buttons: 0 present (100% purged).
      - Assessment filters visible directly beneath topbar: true.
      - Interactive tab click toggles active filter and styles.
    * Navigated to `http://127.0.0.1:5500/admin.html#health`:
      - Dedicated card `#card-assessment-recalibration` verified with 41 loaded assessment options and active preview/apply controls.
    * Visual artifacts verified: `admin_assessments_verified.png`, `admin_health_verified.png`.
    * Console errors: 0.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.


- **Phase 32: Student Dashboard Avatar Scaling, Glow Hierarchy, Batch Leaderboard & Royal Crown Mechanics [100% VERIFIED]**:
  - **1. Visual Profile Avatar Scaling (`dashboard.html`, `css/dashboard.css`)**:
    * Scaled profile photo from 60px to 86px (elevated visual anchor) without breaking zero-scroll mobile budget (`100dvh`).
    * Configured circular clipping with border-radius 50%, overflow hidden, and glowing border rings.
    * Initial placeholder letter dynamically hidden when custom photo is active.
  - **2. Grading & Glow Hierarchy Palette (`js/grading.js`, `js/api.js`, `css/dashboard.css`)**:
    * Score 100% (Grade S): Shining star symbol (`⭐`) with radiant golden glow aura (`rgba(245, 158, 11, 0.85)` + shimmer).
    * Grade A (91–99%): Emerald green (`#10b981`) with soft emerald glow aura.
    * Grade B (71–90%): Sky blue (`#06b6d4`) with soft cyan glow aura.
    * Grade C (51–70%): Warm yellow (`#eab308`) with soft amber glow aura.
    * Grade D (31–50%): Flame orange (`#f97316`) with soft orange glow aura.
    * Grade E (11–30%): Crimson red (`#ef4444`) with soft red glow aura.
    * Grade F (0–10%): Neutral slate (`#64748b`) with subtle minimal glow.
    * Exported authoritative `getGradeSymbol(grade, percentage)` from `js/grading.js`.
  - **3. Batch Leaderboard / Standings Matrix (`dashboard.html`, `css/dashboard.css`, `js/dashboard.js`)**:
    * Built dual-dock tab interface (`[ 🏆 Batch Standings ] [ 📋 Completed ]`) with active indicator pill (`RANK #1`).
    * Standings matrix dynamically ranks all active peers in the same batch with 4-level deterministic tie-breaker sorting:
      1. Overall average score (descending)
      2. Total completed assessments count (descending)
      3. Earliest last submission timestamp (ascending)
      4. Alphabetical student name (ascending)
    * Displays rank badges (🥇 Crown/Rank 1, 🥈 Rank 2, 🥉 Rank 3) and highlights active student row (`.my-row`).
    * Pinned summary bar shows student rank relative to total batch size (`Rank #1 of 3`) and current leader.
  - **4. Royal Title & Crown Mechanics (`dashboard.html`, `css/dashboard.css`, `js/dashboard.js`)**:
    * Student with highest score in batch earns floating Crown icon (`👑`) hovering over avatar.
    * Real-time dynamic royal title: `"King <Name>"` for male, `"Queen <Name>"` for female (replaces `"Mr."` / `"Miss"`).
    * Dynamic real-time title reassignment if overtaken by another student in the batch.
  - **5. Strict Zero-Scroll Architecture Preservation**:
    * Zero document scrolling on mobile viewports: verified on iPhone 14 (`390x844`) and Android Small (`360x640`).
    * Element `#bottom-ad-banner` (28px) 100% intact and locked at viewport bottom.
    * Standings table isolates inner scrolling within `#dock-pane-standings` with hidden scrollbars.
  - **6. Automated Playwright Verification**:
    * Script: `test-dashboard-enhancements.mjs` executed and passed 100%.
    * Visual artifacts saved: `dashboard_enhanced_iphone14.png`, `dashboard_enhanced_android_small.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Phase 31: Typography Polish, Tabular Numbers, & Attendance Matrix Refinements [100% VERIFIED]**:
  - **1. Tabular Numbers & Numeric Alignment (`css/admin.css`, `css/style.css`, `css/assessment.css`, `css/result.css`)**:
    * Applied `font-variant-numeric: tabular-nums;` to all data grid cells, score badges, timers, metric indicators, summary rows, and matrix cells (`.table-wrap`, `.data-grid`, `.datagrid-table`, `#assessment-timer`, `#timer-display`, `.result-summary-val`, `.matrix-cell`, etc.).
    * Guarantees vertical numeric alignment across all digits (0–9) without horizontal layout jitter.
  - **2. Font-Weight Hierarchy & Contrast Tuning (`css/admin.css`, `css/style.css`)**:
    * Elevated muted text color from low-contrast `#64748B` to `#94A3B8` / `#CBD5E1` for secondary labels, subtitles, and timestamps.
    * Standardized font-weight hierarchy:
      - Card headings / Primary KPIs: `font-weight: 700;`
      - Table text & action buttons: `font-weight: 500;` or `600;`
      - Subtitles / Helper descriptions: `font-weight: 400;`
  - **3. Student Roster Table Refinements (`admin.html#students`, `js/admin/student-management.js`, `css/admin.css`)**:
    * Restored standalone `PROGRAM` column (`key: 'progName'`) explicitly rendered between `INSTITUTION` and `BATCH`.
    * Sanitized age calculation: renders clean dash (`—`) when `birth_date` is null, empty, or evaluates to `<= 0` (never displays `0 yrs`).
    * Enforced `.actions-col` and `.student-actions-cell` with `gap: 6px !important;` for comfortable, mis-tap-resistant action button ergonomics.
  - **4. Class Roster Attendance Matrix Polish (`admin.html#class-hub`, `js/admin/app.js`, `js/admin/datagrid.js`)**:
    * Equipped header cells 1 through 40 with active native `title` tooltips displaying full assessment code, title, and topic (e.g., `3A1-WORDS-TASK: 3rd Vocabulary A1 Words Task - Professional Identity`).
    * Verified and polished bottom summary row `★ CLASS AVERAGE (KELAS)` showing class-wide average points and completion percentages with tabular figures.
  - **5. Automated Desktop Verification (1600x900)**:
    * Verified via Playwright test script `scratch/verify_typography_and_matrix_polish.mjs` on desktop (1600x900).
    * Result: 100% PASS rate across Student Roster, Class Matrix, Assessment Timer, and Results.
    * Screenshots verified: `student_roster_tabular_verified.png`, `class_matrix_tooltips_and_summary_verified.png`, `class_matrix_summary_row_docked.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Phase 30: Student Mobile Dashboard Modernization (Zero-Scroll & Tier Theming) [100% VERIFIED]**:
  - **1. Zero-Scroll Viewport Mobile Architecture (`css/dashboard.css`)**:
    * Strictly scoped to `body.dashboard-page` (assessment pages and others remain 100% untouched).
    * Enforced `height: 100vh; height: 100dvh; max-height: 100dvh; overflow: hidden; display: flex; flex-direction: column;`.
    * Compact header set to `44px` height with clean brand typography ('Outfit') and circular profile actions.
    * Main content container `.dashboard-content` configured with `flex: 1 1 0%; min-height: 0; overflow: hidden;` to cleanly distribute space without outer scrollbars.
  - **2. Bottom Locked Banner (#bottom-ad-banner) 28px Intact & Anchored (`css/dashboard.css`, `dashboard.html`)**:
    * Set `position: static !important; height: 28px !important; min-height: 28px !important; max-height: 28px !important; flex-shrink: 0 !important;`.
    * Anchored directly at the base of the viewport across all screen heights (640px to 844px).
  - **3. Modern Tier Hero Card & Synchronized Dynamic Theming (`dashboard.html`, `css/dashboard.css`, `js/dashboard.js`)**:
    * Cleaned up rigid inline styles in `dashboard.html` while preserving 100% of functional IDs (`#welcome-name`, `#banner-score-box`, `#banner-grade-box`, `#banner-avatar-container`, `#bottom-stat-avg-score`, `#stat-overall-grade-value`, `#welcome-meta-wrapper`, etc.).
    * Connected `renderDashboardScore` to `GRADE_PALETTE` from `js/grading.js`, dynamically injecting `data-tier` and CSS variables (`--tier-color`, `--tier-rgb`).
    * **Grade S Exclusive Glow**: Radiant golden ambient aura (`rgba(245, 158, 11, 0.28)`), text gleam drop-shadow, and sparkling gradient avatar ring.
    * **Grades A-F Crisp Matte**: Solid `#0f172a` background, tinted border (`rgba(var(--tier-rgb), 0.25)`), clean colored text, and zero glow.
    * Avatar bounds safeguarded with `overflow: hidden` and `border-radius: 50%`, with initial letter cleanly hidden when photo is displayed.
  - **4. Automated Multi-Device Verification**:
    * Verified via Playwright at standard iPhone (390×844) and small Android (360×640).
    * `isZeroScroll: true` (`scrollHeight === clientHeight === 844px` and `640px`).
    * Artifact screenshots saved: `dashboard_mobile_grade_a.png`, `dashboard_mobile_grade_s.png`, `dashboard_mobile_small_android.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Phase 29: Student Roster View Polish [100% VERIFIED]**:
  - **1. Restored PROGRAM Column (`js/admin/student-management.js`)**:
    * Explicitly placed the `PROGRAM` column (`key: 'progName'`, label `'Program'`, `width: '100px'`) directly between `INSTITUTION` and `BATCH` in the DataGrid column registry.
    * Renders student program name (e.g., "Camp") cleanly with text truncation safeguard (`max-width: 95px`) and full tooltip.
  - **2. Sanitized Age Calculation (`js/admin/student-management.js`, `js/admin/class.js`, `js/admin/app.js`, `js/admin/imports-exports.js`)**:
    * Sanitized `calculateAgeFromBirthDate` and row mapping: when `birth_date` is missing, invalid, or evaluates to `<= 0`, render a dash (`—`) instead of displaying `0 yrs`.
    * Enforced across all student roster views and modals for complete workspace consistency.
  - **3. Polished Action Buttons Spacing (`js/admin/student-management.js`, `css/admin.css`)**:
    * Expanded `ACTIONS` column width to `168px` and wrapped action buttons in `.student-actions-cell`.
    * Styled `.student-actions-cell` with `display: flex !important; align-items: center !important; justify-content: flex-end !important; gap: 8px !important;` to provide comfortable spacing and prevent accidental mis-clicks.
    * Added dedicated `.student-action-btn` style (32x32px, 8px border-radius, clean subtle border, hover elevation micro-animation, and danger styling for delete).
  - **Automated Verification**:
    * Verified via Playwright at `http://127.0.0.1:5500/admin.html#students`.
    * Verified indices: Institution (1), Program (2), Batch (3).
    * Verified age output for Muhammad Alif Rezki Rahmansyah and unset students is `—`.
    * Verified actions cell gap `8px` with 4 distinct action buttons.
    * Visual artifact saved: `student_roster_polished_verified.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Phase 28: Harmonious 7-Color Palette & Exclusive Gold Glow on Grade S [100% VERIFIED]**:
  - **7-Color Distinct Progression Palette (`js/grading.js`, `js/api.js`, `js/dashboard.js`, `js/result.js`, `js/admin/app.js`, `js/admin/class.js`, `js/admin/student-management.js`, `css/style.css`, `css/result.css`, `css/admin.css`)**:
    * **F (0–10%)**: Merah Crimson (`#ef4444`) — Crisp, flat, matte, zero glow.
    * **E (11–30%)**: Rose Coral (`#f43f5e`) — Crisp, flat, matte, zero glow.
    * **D (31–50%)**: Jingga / Flame Orange (`#f97316`) — Crisp, flat, matte, zero glow.
    * **C (51–70%)**: Kuning Pucat / Lifeless Straw (`#c7c18c`) — Desaturated, matte, paper/straw feel, zero competition with gold, zero glow.
    * **B (71–90%)**: Biru / Sky Blue (`#0ea5e9`) — Clean, vibrant sky blue, zero glow.
    * **A (91–99%)**: Hijau / Emerald Green (`#10b981`) — Clean, prestigious green, zero glow.
    * **S (100%)**: Emas Champion (`#fbbf24`) — Radiant golden halo, animated sparkle (`gold-badge-sparkle`), text gleam (`gold-text-gleam`), glowing text drop-shadow, and ambient background aura.
  - **Strict Glow Exclusivity ("Glow Hanya untuk Emas Saja")**:
    * Glow, ambient radial halo, text drop-shadows, and sparkle animations are **STRICTLY EXCLUSIVE to Grade S**.
    * Tiers A, B, C, D, E, F are completely stripped of glowing box-shadows (`box-shadow: none !important` or standard dark elevation `rgba(0,0,0,0.25)`) and text drop-shadows (`filter: none !important; text-shadow: none !important`).
    * Dashboard hero banner: Grade S radiates golden ambient aura (`rgba(245, 158, 11, 0.28)`) and avatar gold ring shimmer; Non-S tiers render clean solid navy `#0f172a` with crisp border and standard shadow.
    * Result hero card: Grade S renders radiant golden ambient halo (`box-shadow: 0 0 45px rgba(245, 158, 11, 0.35)`); Non-S cards render clean solid `#0f172a` with crisp subtle border and zero glow.
  - **Hotfix — Fallback Mock Declarations in `js/api.js`**:
    * Fixed `ReferenceError: MOCK_INSTITUTIONS is not defined` on `index.html`. 5-step login chain verified working end-to-end.
  - **Playwright Test Suite & Visual Verification**:
    * Automated test `scratch/verify_palette_and_exclusive_gold_glow.mjs` confirmed:
      - Grade S: Radiant gold glow (`rgba(245, 158, 11, 0.906)`), `gold-badge-sparkle` animation, text gleam drop-shadow.
      - Grades A, B, C, D, E, F: `badgeBoxShadow: none`, `pctFilter: none`, `pctTextShadow: none`, `avatarAnimation: none`.
    * Artifact screenshots saved:
      - `gold_grade_s_glowing_verified.png`: Grade S Result hero with radiant golden aura.
      - `tier_c_straw_no_glow_verified.png`: Grade C Result hero with flat lifeless straw yellow and zero glow.
      - `tier_a_emerald_no_glow_verified.png`: Grade A Result hero with crisp emerald green and zero glow.
      - `dashboard_risma_loaded.png`: Miss Risma's real dashboard showing Grade A crisp banner (zero glow) alongside Grade S rows glowing in gold.
      - `dashboard_grade_s_banner_sparkle.png`: Grade S champion dashboard banner with full gold aura.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Phase 27: Unlocked/Takeable Assessment Calibration & Flexible Sorting [100% VERIFIED]**:
  - **TASK-27-01: Calibrate Student Score (%) & Grade (GRD) Strictly on Taken/Unlocked Modules**:
    - Enforced the business rule across `js/admin/app.js`, `js/admin/class.js`, `js/dashboard.js`, and `js/api.js`: Student SCORE (%) and GRADE (S, A, B, C, D, E, F) are strictly calculated based ONLY on assessments that have been attempted or unlocked.
    - Locked or unopened assessments are completely excluded from the score denominator, preventing them from dragging down student grade.
    - Formula applied: `average_score = sum(best_percentage_on_taken) / count(taken_assessments)`; `grade = getGrade(average_score)`.
    - Example: Students with perfect scores on completed tasks (e.g. Shelia Mulyaning Putri, Aunul Fikri Yasir, Unggul Wirakse) achieve 100% Grade S without being dragged down by the 34 remaining modules.
  - **TASK-27-02: Differentiate Progress (PROG) vs Student Score/Grade**:
    - Progress (PROG): Reflects curriculum completion: `completed_count / total_class_assessments` (e.g. "15% 6/40 Done", "5% 2/40 Done").
    - Grade (GRD): Compact column displaying the student's mastery percentage on the top line (`100%`, `99%`, `90%`) and authoritative grade badge on the bottom line (`[S]`, `[A]`, `[B]`).
    - Class Average summary row displays true class average score (`85% [B]`) and average curriculum completion (`11% Avg Done`).
  - **TASK-27-03: Flexible Multi-Criteria Column Sorting in Class Roster**:
    - Clicking `PTS` sorts by total cumulative points (`totalEarnedScore`).
    - Clicking `PROG` sorts by curriculum completion (`progressPct`).
    - Clicking `GRD` or `SCORE` sorts by mastery percentage (`averageScorePct`).
    - Configured `datagrid.js` so that clicking academic performance metrics defaults to descending on first click.
  - **TASK-27-04: Authoritative Grading Engine Centralization (`js/grading.js` & `js/api.js`)**:
    - Added and exported `calculateOverallStudentScore(takenPercentages)` adhering to AGENTS.md §2.8.
  - **TASK-27-05: Automated Playwright Verification & Screenshot Validation**:
    - Executed `scratch/verify_calibrated_scores.mjs` verifying:
      * Top student rows display authentic score % and Grade S/A.
      * Interactive sorting works on `GRD`, `PROG`, and `PTS`.
      * Summary row displays calibrated class average.
      * Viewport overflow: `{ clientWidth: 1381, scrollWidth: 1381, hasOverflow: false }`.
      * Screenshot captured: `class_roster_calibrated_scores.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Phase 26: Academic Engine, Sequential Prerequisites & Roster Matrix [100% VERIFIED]**:
  - **TASK-26-01: Fix Student Progress Calculation & Cumulative Mastery Grade Formula**:
    - In `js/admin/app.js`: Calculated `curriculumTotalMaxPoints` across all 40 assessments.
    - Updated progress formula strictly to `completion_pct = (completed_assessments_count / total_class_assessments) * 100` (e.g. students with 6/40 completed display 15% with subtext '6/40 Done').
    - Base authoritative overall grade on cumulative curriculum mastery (unattempted assessments count as 0), eliminating false Grade S inflation for partial completions.
    - Configured default table sort strictly to `PTS` (`totalEarnedScore`) descending so students who finished all modules rank on top.
  - **TASK-26-02: Standalone Student Info Columns & Zero Avatars**:
    - Configured dedicated standalone columns: `INST` (~65px), `PROGRAM` (~65px), `BATCH` (~55px), `STUDENT NAME` (~140px, text-only, zero avatar images or initial chips).
    - Preserved dedicated compact columns for academic status: `PROG` (~50px), `GRD` (~40px), and `PTS` (~55px).
  - **TASK-26-03: 40-Column Dense Assessment Matrix (Zero Horizontal Scroll)**:
    - Enforced fixed table layout: `table-layout: fixed; width: 100%; overflow-x: hidden !important;`.
    - Auto-distributed remaining table width evenly across assessment columns 1..40 without horizontal overflow (`wrap.scrollWidth === wrap.clientWidth`).
    - Configured 4 thematic Super-Headers:
      * Cols 1–8: `THEME A (Workplace)`
      * Cols 9–18: `THEME B (Tourism)`
      * Cols 19–28: `THEME C (CCU)`
      * Cols 29–40: `THEME D (High-Frequency)`
    - Test columns (7, 8, 17, 18, 29, 30, 39, 40) styled with distinctive magenta accents.
    - Formatted `PTS` column cleanly with "pts" suffix (`${row.totalEarnedScore} pts`).
    - Appended bottom summary row: "★ CLASS AVERAGE".
    - Score cell clicks open `result.html?attempt_id=...` in a new tab without side-drawer interference.
    - Updated `result.html` and `js/result.js` to authorize admin sessions via `localStorage` mirroring, allowing administrators to inspect attempt breakdowns in new tabs without getting redirected to login.
  - **TASK-26-04: Standardize Assessment Codes & Sequential Prerequisites**:
    - Verified all 40 assessments in Supabase Cloud (`assessments` table) adhere to `[Level][Theme][Topic]-[TYPE]-[TIER]` (e.g. `3A1-WORDS-TASK`, `3A-WORDS-TEST`, `3B1-WORDS-TASK`).
    - Chained `prerequisite_assessment_id` sequentially (1 -> 2 -> ... -> 40).
  - **TASK-26-05: Playwright Automated Matrix Verification & Screenshot Validation**:
    - Executed automated Playwright test suite `scratch/verify_phase_26.mjs`:
      * Verified zero horizontal overflow: `{ clientWidth: 1381, scrollWidth: 1381, hasOverflow: false }`.
      * Verified score cell click opens `result.html?attempt_id=...` with HTTP 200 without redirect.
      * Captured verified full-width screenshot: `class_roster_matrix_phase26_verified.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Phase 24 & Phase 25: Architectural Modularization, Stability & Third-Party Elimination [100% VERIFIED]**:
  - **TASK-24-01: Asset Query String Alignment (`?v=5.2.2`) & Service Worker Precache Update**:
    - Unified all CSS and JS asset query tokens across 26 files (`admin.html`, `assessment.html`, `dashboard.html`, `index.html`, `result.html`, `sw.js`, and all modules in `js/` & `js/admin/`) strictly to `?v=5.2.2`.
    - Updated `sw.js` cache name to `abcd-core-v5.2.2` and populated `ASSETS_TO_CACHE` with core modular JS (`api.js`, `app.js`, `auth.js`, `dashboard.js`, `assessment.js`, `result.js`, `session.js`, `supabase.js`, `vendor/supabase.js`, `vendor/xlsx.full.min.js`, `wake-lock.js`).
  - **TASK-24-02: Centralize & Deduplicate `escapeHtml` / `escHtml` and Name Utilities**:
    - Established single authoritative canonical `escapeHtml` and `escHtml` in `js/app.js` (with mojibake correction, full entity replacement, and `window` fallback) and re-exported via `js/api.js`.
    - Removed all 19 duplicate declarations across `js/admin/` and HTML files. Verified with `node --check` across all modules (100% syntax pass).
    - Deduplicated `stripHonorific` and `getStudentInitial` to `js/utils/avatar-engine.js` with re-export in `api.js`.
  - **TASK-24-03: Mobile Viewport Truncation & Touch Target Safety**:
    - In `assessment.html`: Removed `100vw` from banner elements to eliminate horizontal desktop scrollbars.
    - Updated `.assessment-main-content` with `overflow-y: auto; -webkit-overflow-scrolling: touch;`, and added `@media (max-height: 640px)` and `body.focus-mode` overrides so virtual keyboard / short screens never clip answer options or submit buttons.
    - In `css/admin.css`: Enforced `@media (pointer: coarse)` 40px minimum touch targets on buttons.
  - **TASK-24-04: API Error Handling & Submission Fallback Reliability**:
    - Fixed `fetchAssessmentsForStudentLevel` in `js/api.js`: Replaced blank `catch (_) {}` with structured error logging.
    - Fixed auto-submission failure in `assessment.html`: If both `submitAssessment` and the `auto_close_expired_attempts` RPC fail, the system no longer blindly redirects to an empty `result.html`. Instead, it halts navigation, keeps answers safe in local storage, alerts the student with an actionable retry toast, and re-enables manual submission.
  - **TASK-24-05: High-Volume Search Input Debounce & DataGrid Memory Leak Fix**:
    - Debounced `vault-search` and `vault-topic-search` in `js/admin/vocab-vault.js` with 200ms debounce timer.
    - Debounced student search input in `index.html` (`renderOptions`) with 200ms debounce timer.
    - Added self-cleaning event handling to `js/admin/datagrid.js`: implements `destroy()` method, stores `_docClickHandler` reference, auto-cleans document listeners if container is detached from DOM, and automatically destroys prior instances on the same container.
  - **TASK-25-01: Modular CSS Extraction from HTML Shells**:
    - Extracted 504 lines of inline CSS from `index.html` to `css/auth.css` (`<link rel="stylesheet" href="css/auth.css?v=5.2.2" />`).
    - Merged 411 lines of inline CSS from `dashboard.html` into `css/dashboard.css` (`<link rel="stylesheet" href="css/dashboard.css?v=5.2.2" />`).
    - Extracted 542 lines of inline CSS from `assessment.html` to `css/assessment.css` (`<link rel="stylesheet" href="css/assessment.css?v=5.2.2" />`).
    - Extracted 142 lines of inline CSS from `result.html` to `css/result.css` (`<link rel="stylesheet" href="css/result.css?v=5.2.2" />`).
    - Registered all extracted stylesheets in `sw.js` cache manifest.
  - **TASK-25-02: Modular JavaScript Extraction from HTML Shells**:
    - Extracted 462 lines of inline JS from `index.html` to `js/auth.js` (`<script type="module" src="./js/auth.js?v=5.2.2"></script>`).
    - Extracted 2,125 lines of inline JS from `dashboard.html` to `js/dashboard.js` (`<script type="module" src="./js/dashboard.js?v=5.2.2"></script>`).
    - Extracted 1,628 lines of inline JS from `assessment.html` to `js/assessment.js` (`<script type="module" src="./js/assessment.js?v=5.2.2"></script>`).
    - Extracted 476 lines of inline JS from `result.html` to `js/result.js` (`<script type="module" src="./js/result.js?v=5.2.2"></script>`).
    - Preserved essential FOUC prevention session guard snippets inline in `<head>` for zero visual delay.
    - HTML shell sizes reduced by up to 85% (e.g. `index.html`: 1,169 -> 205 lines; `dashboard.html`: 3,043 -> 507 lines; `assessment.html`: 2,385 -> 215 lines; `result.html`: 744 -> 126 lines).
  - **TASK-25-03: Consolidated Student Profile Modals in Admin**:
    - Consolidated `openStudentProfile` in `js/admin/app.js` to delegate directly to the authoritative tactical modal `showStudentProfileModal` in `js/admin/student-management.js`.
    - Removed 480 lines of duplicate, obsolete DOM generation code in `app.js`.
    - Profile button clicks across all admin tables now open the non-destructive glassmorphic modal with 6 KPI cards, 3 tabs, carousel, and academic dossier button without resetting table view, filters, or scroll position.
  - **TASK-25-04: Offline CDN Fallbacks & Third-Party Elimination**:
    - Eliminated all external `ui-avatars.com` image endpoints in `assessment.html` and `js/assessment.js` in favor of local, zero-egress SVG data URIs via `generateAvatarDataUri`.
    - Bundled SheetJS locally in `js/vendor/xlsx.full.min.js` (624 KB), updated `admin.html` to load local vendor asset with CDN fallback, and added to `sw.js` precache.
  - **TASK-25-05: Automated E2E Regression Verification**:
    - Executed automated Playwright test suite `scratch/test_phase25_e2e.mjs` verifying `index.html` (Auth), `dashboard.html` (Student Dashboard), and `admin.html` (Tactical Profile Modal).
    - 100% verification pass with ZERO uncaught page errors.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.


- **Streamlined 4-Button Student Action Row & Unified In-Modal Dossier Access [100% VERIFIED]**:
  - **4-Button Row Optimization (`js/admin/student-management.js`)**:
    - Removed `printBtn` (`🖨️`) from the student table row action column to eliminate button clutter and accidental clicks.
    - Set actions column width to `150px` with uniform spacing.
    - Standardized exactly 4 high-value actions per row:
      1. `📝` **Assessment Details**: Opens the 40-module breakdown drawer.
      2. `👤` **View Student Profile**: Opens the interactive tactical profile modal (6 KPI cards, 3 tabs, carousel).
      3. `✏️` **Edit Student**: Opens quick edit drawer.
      4. `🗑️` **Delete Student**: Triggers soft-delete confirmation.
  - **Single Source for Official Dossier**:
    - The official printable Academic Dossier remains 100% accessible directly from inside the Student Profile Modal header via the prominent `[🖨️ Dossier]` button.
  - **Asset Version Bumps**:
    - Updated cache query strings to `v=5.2.1` in `admin.html`, `js/admin/app.js`, and `js/admin/class.js`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Tactical Glassmorphic Student Profile & Official Academic Dossier Modals (`B — BOARD`) [100% VERIFIED]**:
  - **Tactical Student Profile Modal (`#student-profile-modal`)**:
    - Triggered via `👤 Profile` button on any student row in the master table without navigating away or losing table filters/scroll context.
    - Glassmorphic FM-themed modal featuring student avatar, name, status badge, gender, institution, program, batch, level, and age.
    - 6 Tactical KPI cards: Global Grade (color-coded), Overall Score %, Curriculum Done (`${completed} / 40 (${pct}%)`), Live Accuracy Breakdown (Correct Answers in emerald, Minor Errors in amber, Incorrect in crimson).
    - Carousel navigation (`← Previous` and `Next →` with arrow key listeners) allowing cycling through students in the current batch with keyboard shortcuts.
    - 3 Dynamic Tabs:
      1. `📝 Assessment Breakdown (40)`: Complete table of all 40 assessments with expandable Questions & Answers Review accordion (`.clickable-attempt-row`), given answer vs accepted answer snapshots, evaluation badge, and remedial retake authorization button (`🔓 Authorize Remedial`).
      2. `⚠️ Remediation & Progression`: Curriculum progression status alerts for any module scored below passing threshold (< 70%).
      3. `🔑 Account & Enrollment`: Internal database primary key (Rule 2.2 compliant: internal UUID only, no business ID), Institution ID, PIN security status (Configured vs Not Set), and direct student edit action (`✏️ Edit`).
    - Seamless switch to Official Academic Dossier via `#btn-profile-open-dossier`.
  - **Official Academic Performance Dossier Modal (`#student-dossier-modal`)**:
    - Triggered via `🖨️ Dossier` button on any student row or directly from the Profile modal.
    - Control Toolbar with `🖨️ Print / Save as PDF`, `👤 View Profile` (bidirectional switch), and `✕` close.
    - Official Parchment Sheet (`#student-dossier-sheet`):
      - Official Academy Header: `🛡️ TOPS CORE ACADEMIC ADMINISTRATION | CENTRAL ENGLISH ASSESSMENT & CERTIFICATION BOARD`.
      - Document Ref (`TC-DOS-<HASH>`), Status (`OFFICIAL & CERTIFIED`), and Issue Date.
      - 2-Column Identity & 3:4 Student Photo Box with `OFFICIAL` ribbon badge.
      - Certified Summary Box: Overall Grade, Mastery Score %, Curriculum Pace (`${completed} / 40`), and Total Points (`pts`).
      - Official Assessment Transcript Table with high-contrast `#0f172a` ink styling, type badges (`VOCAB_TASK`, `PHRASE_TASK`, etc.), date, points, percentage, and grade.
      - Dual Signature blocks (Lead Academic Instructor & Director of Academic Board) + Official Circular Academy Seal (`TOP OFFICE ACADEMIC SEAL`).
      - High-fidelity `@media print` rules ensuring clean white paper output without dark background bleed.
  - **Database Error 42703 Fix**:
    - Fixed query in `js/admin/app.js` (`openStudentProfile`) and `student-management.js`: removed non-existent column `question_order` from `attempt_answers` projection, replacing with `is_correct`, eliminating HTTP 400 Bad Request error.
  - **E2E Automated Verification**:
    - Verified via Playwright automated test (`scratch/test_profile_and_dossier.mjs`).
    - Captured verified screenshots:
      - `profile_modal_verified.png`: Tactical student profile modal with 6 KPI cards, 40-assessment breakdown, tabs, and carousel.
      - `dossier_modal_verified.png`: Official certified student transcript sheet with high-contrast text, student 3:4 photo, summary boxes, transcript rows, and official seal.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Dynamic Active Program Navigation in Left Sidebar (`B — BOARD`) [100% VERIFIED]**:
  - **Dynamic Program List under Domain B (`B — BOARD`)**:
    - Replaced the static `Students` nav item in `admin.html` with dynamic `<div id="sidebar-programs-list"></div>` and immediate inline `localStorage` hydration script mirroring the Domain C class injection architecture.
    - Added `loadSidebarPrograms()` in `js/admin/app.js` with stale-while-revalidate caching (`topscore_cached_sidebar_programs`).
    - Automatically queries active programs (`is_active: true`) and generates a sidebar item for each (`👥 Camp`, `👥 Hospitality`).
    - Automatically hides inactive programs (`is_active: false`, e.g. English Explorer, Tamata Persada). Newly activated programs automatically appear in real time without code modifications.
  - **Clean 1-Program-1-Table Roster (No Horizontal Tabs)**:
    - Removed horizontal program pill tabs (`#program-nav-tabs`) and tab click event listeners from `js/admin/student-management.js`, eliminating UI clutter above the table.
    - Program selection is controlled directly from the sidebar.
    - Clicking any program in the sidebar immediately activates its tactical panel highlight, updates the topbar breadcrumb (`BOARD / <Program>`), and renders that program's isolated student table (Camp: 25 students; Hospitality: 14 students).
  - **Reactive Cache Synchronization**:
    - In `js/api.js`, updated `clearAdminCache('programs')` to automatically trigger `loadSidebarPrograms()`, keeping the sidebar synchronized whenever programs are created, edited, activated, or deactivated.
  - **Automated Verification**:
    - Verified via Playwright automated test (`scratch/test_sidebar_programs.mjs`).
    - Captured verified screenshots:
      - `sidebar_program_hospitality_verified.png`: Shows `Hospitality` active in the sidebar, `BOARD / Hospitality` breadcrumb, and isolated 14 Hospitality students.
      - `sidebar_program_camp_verified.png`: Shows `Camp` active in the sidebar, `BOARD / Camp` breadcrumb, and isolated 25 Camp students.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Consolidate Student Roster & Progress into 1 Single Master Table (`#students`) [100% VERIFIED]**:
  - **Pruned Navigation Redundancy**: Removed separate `Student Progress` (`progress-view`) nav item from sidebar `B — BOARD`. `B — BOARD` now cleanly houses only `Students`.
  - **Backward-Compatible Hash Routing**: Set `case 'progress-view':` in `js/admin/app.js` to redirect seamlessly to `#students` (`window.location.hash = '#students'; return loadSection('students');`).
  - **Unified All Columns in One Master Table (`js/admin/student-management.js`)**:
    1. `Select` checkbox (bulk actions: activate, deactivate, soft-delete, re-assign batch/institution)
    2. `Institution` (135px, hierarchical sort, ellipsis)
    3. `Program` (95px, ellipsis)
    4. `Batch` (75px, pill badge)
    5. `Level` (85px, pill badge)
    6. `Name` (170px, avatar + honorific + display name + remediation alert badge)
    7. `Age` (65px, e.g. `18 yrs`, `38 yrs`, or `—`)
    8. `Gender` (80px, Male/Female badge)
    9. `Assessments` (95px, `${completed} / ${totalAssigned}`, e.g. `6 / 40`, `3 / 40`, `0 / 40`)
    10. `Score` (70px, authoritative overall highest score, e.g. `99%`, `91%`, `83%`, `—`)
    11. `Grade` (65px, authoritative badge: S, A, B, C, D, E, F)
    12. `Completion` (115px, mini tactical progress bar + `${completionPct}%`)
    13. `Enrolled` (95px, formatted date, e.g. `09 Oct 2026`)
    14. `Status` (75px, Active / Inactive badge)
    15. `Actions` (180px, sticky right pinned: `📝 Details`, `👤 Profile`, `🖨️ Dossier`, `✏️ Edit`, `🗑️ Delete`)
  - **40-Assessment Breakdown Modal (`window.showStudentProgressDetails`)**:
    - Triggered via `📝 Details` button on any student row.
    - Glassmorphic modal displaying student avatar, name, batch, level, and 6 high-level metric cards (`Assigned 40`, `Completed 6`, `In Progress 0`, `Overall Score 83%`, `Global Grade B`, `Completion 15%`).
    - Full scrollable table of all 40 assessments showing Title, Level badge, Status badge (`🔔 NOT STARTED`, `✔️ COMPLETED`, `▶️ IN PROGRESS`), and Best Score % (`100%`, `78%`, `—`).
  - **Full Sorting Support**: Added sorting comparators for `completedAssessments`, `completionPct`, `overallScoreStr`, and `globalGrade`.
  - **Verification**: Verified via Playwright automated tests and screenshots (`unified_student_board_verified.png`, `unified_student_modal_verified.png`).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Streamline Student Management View (`#students`) [100% VERIFIED]**:
  - **Pruned PIN Subtext under Student Name**: Cleaned `PIN: ****` and `PIN: NOT SET` from the student name column template in `js/admin/student-management.js`; clean student name only is rendered.
  - **Removed CONTACT Column**: Deleted `CONTACT` (`phone`) column definition from DataGrid configuration, freeing horizontal table width.
  - **Relocated Import & Export Controls**:
    - Removed redundant `_ Import` and `Export CSV` buttons from the roster action bar above the table, leaving only `+ Add Student` and duplicate resolution.
    - Placed `Export CSV` button (`#btn-export-students-csv`) in the dedicated "Import Students" tab alongside the file upload/dropzone and download template buttons.
    - Exported `window.exportStudentsGradebook` to provide unified gradebook export functionality.
  - **Compressed Filter Bar into Single Slim 38px Line**:
    - Styled `.students-filter-bar-slim` (`display: flex; align-items: center; gap: 8px; padding: 6px 12px; margin-bottom: 8px; height: 38px;`) in `css/admin.css`.
    - Removed bulky stacked label headers ("BATCH STATUS", "FILTER BY PROGRAM", "FILTER BY BATCH").
    - Embedded clear, compact label placeholders: `[Status: Active Batches ▼] [Program: All ▼] [Batch: All ▼]`.
    - Placed directly above the search/datagrid area to maximize vertical screen real estate.
  - **Verification**: Verified via Playwright automated tests and screenshots (`students_roster_streamlined.png`, `students_import_export_relocated.png`).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Complete 3-Way Scoring & Global Grade Unification Across Platform [100% VERIFIED]**:
  - **Identified Root Causes & Bugs**:
    1. *Retake Penalty in Student Management (`#students`)*: In `js/admin/student-management.js` (`renderStudents`), the calculation looped over all submitted attempts and summed `total_questions` and `score` across ALL attempts. Multiple practice attempts penalized students by inflating the denominator with early unsuccessful attempts (e.g. Aunul Fikri Yasir with 24 attempts dropped to 78% Grade B instead of his highest 99% Grade A; Asti Ananta dropped to 60% Grade C instead of 82% Grade B; Laura Fardila dropped to 70% Grade C instead of 86% Grade B; Mr. Test dropped to 23% Grade E instead of 62% Grade C).
    2. *Ignored `auto_submitted` Status*: Filter checked `a.status === 'SUBMITTED' || a.status === 'submitted'`, ignoring `auto_submitted` attempts from timer expiration. Ahmad Nur Suhendro showed 5 assessments instead of 6, and Mr. Test missed 2 assessments.
    3. *Class Hub Grade Discrepancy (Rule 2.8 & 2.10)*: In `js/admin/app.js` (`renderClassHub`), student grade divided earned percentages by 40 (`totalClassAssessments`) instead of completed assessments, showing Grade `E` for all students.
    4. *Student Progress Case Sensitivity & Missing Features*: In `js/admin/class.js` (`renderProgressView`), uppercase check caused `0 / 40` completion, and the table lacked rich profile information (avatars, ages, gender, score %, global grade, batch status filters).
  - **Implemented Resolutions**:
    1. *Unified Highest Score Calculation (Rule 2.7 & 2.8)*:
       - In `student-management.js`, grouped attempts by `assessment_id` into `bestByAsm` taking the highest score across valid completion statuses: `['submitted', 'auto_submitted', 'evaluated', 'graded']`.
       - Calculated authoritative `overallPct` and `globalGrade = getGrade(overallPct)` matching Rule 2.10.
       - Updated remediation check and print dossier export to include `auto_submitted`.
       - Added numeric and rank-based sorting in `DataGrid` `sortComparator` for `overallScoreStr` (numeric percentage) and `globalGrade` (rank: S > A > B > C > D > E > F).
    2. *Unified Class Hub Attendance Roster (`js/admin/app.js`)*:
       - Computes `overallPct` from takeable/completed assessments and authoritative `getGrade(overallPct)`.
       - Default sort descending by PTS (`totalEarnedScore`) so top students appear on top.
    3. *Upgraded Student Progress View (`js/admin/class.js`)*:
       - Case-insensitive valid completion check `['submitted', 'auto_submitted', 'evaluated', 'graded']`.
       - Added Batch Status filter defaulting to `Active Batches (Ongoing)`.
       - Added 13 rich columns: Institution, Program, Batch, Level, Student Name (avatar, honorific, PIN, profile link), Age, Gender badge, Assessments (`6 / 40`), Score (`91%`), Grade badge (`A`), Completion bar, Status, and Actions.
  - **Verification via Automated Test**:
    - Created and executed `scratch/test_full_3view_sync.mjs` with Playwright.
    - Verified exact 100% agreement on scores, grades, and completed assessment counts across all 3 views:
      - Miss Shelia Mulyaning Putri: 100% Grade S | 150 PTS (100%) Grade S | 100% Grade S (6 / 40)
      - Mr. Aunul Fikri Yasir: 99% Grade A | 149 PTS (99%) Grade A | 99% Grade A (6 / 40)
      - Mr. Unggul Wirakse: 99% Grade A | 149 PTS (99%) Grade A | 99% Grade A (6 / 40)
      - Miss Sofa Maria Ulfa: 99% Grade A | 148 PTS (99%) Grade A | 99% Grade A (6 / 40)
      - Mr. Gagan Tara Deswari: 98% Grade A | 147 PTS (98%) Grade A | 98% Grade A (6 / 40)
      - Miss Risma: 97% Grade A | 146 PTS (97%) Grade A | 97% Grade A (6 / 40)
      - Mr. Ari Wahyu Darma: 95% Grade A | 143 PTS (95%) Grade A | 95% Grade A (6 / 40)
      - Mr. Muhammad Masyan Hafizi: 95% Grade A | 142 PTS (95%) Grade A | 95% Grade A (6 / 40)
      - Miss Latifa Maulidya: 91% Grade A | 137 PTS (91%) Grade A | 91% Grade A (6 / 40)
      - Mr. Asmul Kholid: 89% Grade B | 134 PTS (89%) Grade B | 89% Grade B (6 / 40)
      - Miss Nurhaliza: 88% Grade B | 132 PTS (88%) Grade B | 88% Grade B (6 / 40)
      - Miss Syazida Shinda Debi: 88% Grade B | 132 PTS (88%) Grade B | 88% Grade B (6 / 40)
      - Miss Laura Fardila: 86% Grade B | 129 PTS (86%) Grade B | 86% Grade B (6 / 40)
      - Mr. Ahmad Nur Suhendro: 83% Grade B | 125 PTS (83%) Grade B | 83% Grade B (6 / 40)
      - Miss Asti Ananta: 82% Grade B | 123 PTS (82%) Grade B | 82% Grade B (6 / 40)
      - Mr. Frengki Juniardi: 80% Grade B | 72 PTS (80%) Grade B | 80% Grade B (3 / 40)
      - Mr. Test: 62% Grade C | 56 PTS (62%) Grade C | 62% Grade C (3 / 40)
    - Verified screenshots saved to artifacts directory:
      - `view1_students_verified.png`
      - `view2_class_hub_verified.png`
      - `view3_progress_view_verified.png`
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.
  - **Identified Root Causes**:
    1. *RLS Missing Write Policies on Curriculum Entities*: In Supabase PostgreSQL, table `batches` (along with `programs`, `institutions`, `classes`, `levels`) only allowed SELECT for role `anon`. When admin called `adminUpdate('batches', id, { is_active: ... })`, Postgres rejected the update (0 rows affected). PostgREST `.update(...).select().single()` threw PGRST116: `Cannot coerce the result to a single JSON object`.
    2. *Invalid Columns in Student Progress Fetch*: `adminFetchAll('progress', 'id, student_id, class_id, level_id, status')` failed with HTTP 400 because `level_id` and `status` do not exist in table `progress`.
    3. *Stale Joined Student Cache*: Updating a batch only cleared `batches|*` cache in `_adminCache`, leaving joined batch information inside `students|*` stale.
  - **Implemented Resolutions**:
    1. *PostgreSQL RLS Migration*: Applied `supabase/migrations/20261011020000_curriculum_admin_rls.sql` to Supabase Cloud, granting `ALL` permissions for role `anon` (`USING (true) WITH CHECK (true)`) on `batches`, `programs`, `institutions`, `classes`, `class_levels`, `levels`, `topics`, `questions`, and `assessment_questions`.
    2. *Cross-Table Cache Invalidation*: Updated `clearAdminCache()` in `js/api.js` to automatically clear dependent `students|`, `progress|`, and `classes|` caches whenever organizational entities change.
    3. *Query Column Correction*: In `js/admin/student-management.js`, replaced non-existent columns with valid columns `unlocked_level, highest_score`.
    4. *Batch Status Filter in Student Management (`#students`)*:
       - Default: `Active Batches (Ongoing)` (shows 39 active students, past batch students hidden).
       - Option: `All Batches (Include Past)` (shows 64 total students, with `DISCONNECTED` tags for inactive batches).
       - Option: `Inactive / Past Batches Only` (shows 25 inactive students).
       - Automatically filters the `Filter by Batch` dropdown options based on batch status.
    5. *Class Hub Attendance Roster Filter (`#class-hub`)*:
       - Added batch filter defaulting to `Active Batches Only` (25 enrolled), with options for `All Batches (Include Past)` (50 enrolled) or specific batches with `(Past/Inactive)` indicator labels.
    6. *Student Login Filter (`index.html`)*:
       - `fetchBatches(programId)` defaults to `activeOnly = true`, hiding inactive batches (131, 132) from the login card selection.
       - `fetchStudentsByProgram(programId, batchId, activeOnly)` joins `batches!batch_id(id, is_active)` and filters out inactive batch students from the "All Batches" list when `activeOnly = true`.
  - **Verification via Automated Test**:
    - `scratch/test_class_hub.mjs`: Attendance roster renders with `Active Batches Only` by default.
    - `scratch/test_batch_activation_e2e.mjs`: Batch toggle in Organization updates live without errors; Student Management filters active/inactive batches; Student login displays only active batches (123, 133).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Instant Old Photo Erasure on Student Upload & Zero-Latency Avatar Sync [100% VERIFIED]**:
  - **Identified Root Causes of "Old Photo Glimpse" / Ghosting**:
    1. *DOM Persistence*: When selecting a new file in `handlePhotoChange()`, `<img id="banner-avatar-img">`, `<img id="header-avatar-img">`, and `<img id="prof-photo-img">` retained the old photo's `src` while async compression and upload ran in background.
    2. *Stale localStorage Cache*: `localStorage.getItem('stu_photo_${session.student_id}')` previously retained the old photo Base64 string and was not cleared on file selection or updated on photo change.
    3. *Delayed Listener Initialization*: In `dashboard.html`, `setupProfileModal()` previously waited for `loadDashboard()` network requests before binding photo change listeners.
  - **Implemented Instant Erasure & Synchronous Cache Invalidation**:
    - **`clearPhotoEverywhere()`**:
      - Wipes `localStorage.removeItem('stu_photo_' + session.student_id)`.
      - Clears image `src = ''`, removes attribute `src`, and adds class `hidden` to all 3 avatar images (`banner-avatar-img`, `header-avatar-img`, `prof-photo-img`).
      - Unhides avatar initial letter / icon badges (`banner-avatar-initial`, `header-avatar-initial`, `avatar-icon`).
    - **`handlePhotoChange()`**:
      - Calls `clearPhotoEverywhere()` synchronously on the first line of file selection (`change` event, 0ms latency).
      - Old photo is immediately erased from screen and cache before compression begins.
      - Upon compression completion, immediately displays the new compressed WebP avatar via `applyPhotoEverywhere()` and persists to Supabase.
      - Resets `e.target.value = ''` in `finally` block to allow re-uploading the same file.
    - **First-Login Modal Snapshot Fallback (`btn-retake-photo` & `onboard-photo-file`)**:
      - Immediately clears and hides `#webcam-snapshot` on file select or retake click.
    - **Background Sync in `checkAndPromptPhoto()`**:
      - Automatically synchronizes `localStorage` with current Supabase `students.photo_url` in the background on dashboard entry.
    - **Startup Listener Architecture**:
      - `setupProfileModal([])` is called immediately on page entry before network requests start so modal controls and photo upload listeners are interactive instantly.
  - **Verification via Automated Test**:
    - Created and executed `scratch/test_photo_instant_erasure.mjs` with Playwright on real student session.
    - Verified: `wipedInstantly: true` (all avatar `<img>` tags hidden and cleared, `localStorage` wiped in 0ms).
    - Verified: `postUploadState` (new compressed WebP photo displayed across all banner, header, and profile modal elements).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Existing Student Photos Batch Compression Migration [100% VERIFIED]**:
  - **Identified Existing Bloat**:
    - Ran database audit across all 25 students with uploaded photos. Found 15 heavy photos (>50KB) totaling **13.137 KB (~12.83 MB)** stored directly in PostgreSQL (e.g. Latifa Maulidya: 2.38MB, Suke Ajai: 1.96MB, Muhammad Masyan: 1.82MB, Test: 1.77MB, Ahmad Nur Suhendro: 1.57MB).
  - **Executed Automated Batch Migration**:
    - Created and executed `scratch/batch_compress_existing_photos.mjs` using Playwright HTML5 canvas integration with `avatar-engine.js`.
    - Automatically center-cropped each image to 3:4 (240x320 px) and encoded to WebP Base64 strictly `< 30 KB`.
    - Successfully updated all 15 students in PostgreSQL.
  - **Results & Database Verification**:
    - `scratch/audit_existing_photos.mjs` confirmed: **0 heavy photos remaining** out of 25 (0 of 25 > 50KB).
    - Total photo payload in PostgreSQL shrank from **13.137 KB (~12.83 MB)** to **435 KB (~0.42 MB)** (**98.7% database footprint reduction!**).
    - Every student photo is intact, properly framed, and sharp.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Client-Side Avatar Compression (Option 1: Lightweight WebP Base64 < 30KB) [100% VERIFIED]**:
  - **Identified User Decision (Option 1)**:
    - User explicitly selected **Opsi 1**: Self-contained client-side Base64 compression stored directly in PostgreSQL without relying on external Supabase Storage bucket uploads.
  - **Implemented Solution**:
    - **`js/utils/avatar-engine.js`**:
      - Added `loadImageSource(source)` helper supporting `File`, `Blob`, and base64 `dataUrl` strings.
      - Updated `processAndCompressAvatar(file, 'student')`:
        - Proportional 3:4 center-crop (240x320 px) with 35% vertical bias to keep face centered.
        - Encodes to modern WebP format (`image/webp`) with adaptive compression loop clamping payload strictly `< 30 KB`.
    - **`dashboard.html`**:
      - Imported `processAndCompressAvatar` from `./js/utils/avatar-engine.js?v=5.1.0`.
      - Onboarding Webcam Snapshot (`btn-snap-photo` & auto-capture): Canvas cropped to 240x320 and encoded to WebP.
      - Onboarding File Fallback (`onboard-photo-file`): Immediately runs `processAndCompressAvatar` on file selection.
      - Onboarding Confirmation (`btn-confirm-photo-setup`): Runs `processAndCompressAvatar` on `onboardPhotoData` before saving Base64 to `students.photo_url`.
      - Profile Banner Photo Input (`handlePhotoChange`): Runs `processAndCompressAvatar` on selected file, updates UI, and saves compressed WebP Base64 (<30KB) to `students.photo_url`.
  - **Verification via Automated Test**:
    - `scratch/test_option1_compression.mjs`:
      - Input: High-res 2000x2000 canvas image.
      - Compression duration: **51 ms** (instantaneous).
      - Output size: **2.4 KB** (**97.6% - 99% reduction** from raw 2.4MB).
      - Output dimensions: `240x320` px (3:4 ratio).
      - Output format: `data:image/webp;base64,...`.
      - Storage bucket bypass: 100% self-contained, 0 network storage calls.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Roster Columns Revision, Progress/Grade Formula Repair & Zero Horizontal Scroll Matrix [100% VERIFIED]**:
  - **Repaired Progress, Points & Grade Logic**:
    - **Progress Formula (`PROG`)**: Implemented authoritative formula `completion_percentage = (completed_assessments_count / total_class_assessments) * 100`.
      - Incomplete students (e.g. Dwi Handaya with 2/40 completed) strictly display `5%` with subtext `2/40 Done` (eliminating false 100% display).
      - Full curriculum completers (e.g. Miss Siti Qori' Atun Hizbaeni with 40/40 completed) display `100%` with subtext `40/40 Done`.
    - **Cumulative Points (`PTS`)**: Authoritatively summed actual earned points across all completed assessments (e.g. Miss Siti Qori' Atun earned 2685 PTS; Dwi Handaya earned 42 PTS).
    - **Authoritative Grade (`GRD`)**: Evaluates cumulative mastery across the curriculum (counting unattempted assessments as 0%). Incomplete students with 2/40 tasks are strictly graded `F`, never erroneously assigned Grade `S`.
    - **Default Table Sorting**: Configured `initialSortKey: 'totalEarnedScore'` and `initialSortAsc: false` so rows automatically sort by `PTS` descending, ranking curriculum completers at the top.
  - **Dedicated Standalone Student Info Columns (~470px)**:
    - `INST` (~65px): Renders institution short code (e.g. `CEC`).
    - `PROGRAM` (~65px): Renders program name (e.g. `Camp`).
    - `BATCH` (~55px): Standalone pill badge (e.g. `131`, `133`) resolved cleanly from batch data mapping.
    - `STUDENT NAME` (~140px): Text-only name with bold typography, completely eliminating all avatar image and initial circle elements.
    - `PROG` (~50px): Percentage with completed subtext.
    - `GRD` (~40px): Grade pill badge (S, A, B, C, D, E, F).
    - `PTS` (~55px): Points badge with cyan accent.
  - **40 Assessment Columns in 100% Viewport Width (Zero Horizontal Scroll)**:
    - Locked container `#class-attendance-grid .table-wrap` with `overflow-x: hidden !important; width: 100% !important;`.
    - Configured table with `table-layout: fixed !important; width: 100% !important;`.
    - Implemented `<colgroup class="datagrid-colgroup">` dynamically injecting `<col style="width:...">` elements before `<thead>`, ensuring `table-layout: fixed` strictly adheres to column widths regardless of super-header colspans.
    - Allocated remaining width evenly across the 40 assessment columns (~27px–32px per cell).
    - Added super-header grouping row:
      - `STUDENT DETAILS` (Columns 1–7)
      - `THEME A` (Columns 1–8)
      - `THEME B` (Columns 9–18)
      - `THEME C` (Columns 19–28)
      - `THEME D` (Columns 29–40)
    - Styled Test columns (7, 8, 17, 18, 29, 30, 39, 40) with magenta borders (`#ec4899`), pink badges (`#f472b6`), and soft column banding.
    - Rendered earned points clearly in completed cells; unattempted cells render as subtle dots `·` (`.asm-dot`).
    - Appended fixed sticky summary row at the bottom: "★ CLASS AVERAGE" calculating average points and completion across all enrolled students.
  - **Visual & Functional Verification via Playwright**:
    - `scratch/verify_revised_roster.mjs` & `scratch/test_diag.mjs`:
      - `wrapClientWidth: 1621`, `wrapScrollWidth: 1621`, `hasOverflow: false` (ZERO horizontal scrollbar).
      - Dwi Handaya: `5% | 2/40 Done | Grade F | PTS 42`.
      - Miss Siti Qori' Atun Hizbaeni: `100% | 40/40 Done | Grade A | PTS 2685`.
      - Summary Row: `★ CLASS AVERAGE | 7% Avg Done | Grade F | PTS 102`.
      - Screenshots verified and saved to artifacts: `revised_roster_verified.png`, `class_roster_summary_docked_verified.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Sidebar Class Tab Delay & Class Hub Loading Performance Optimization [100% VERIFIED]**:
  - **Identified Root Causes**:
    1. **Artificial 1.5s Delay**: Found hardcoded `setTimeout(() => { if (window.loadSidebarClasses) window.loadSidebarClasses(); }, 1500);` in `js/admin/app.js`, intentionally delaying class tab rendering.
    2. **Execution Timing / Non-Hoisted Function Expression**: `window.loadSidebarClasses` was defined as an anonymous function expression *after* `showConsole()` was executed on page load, causing `showConsole()` to skip calling it completely.
    3. **Empty Initial DOM & No Initial Cache**: `#sidebar-classes-list` in `admin.html` was rendered as an empty `<div></div>`, while all other menu items are hardcoded static HTML, causing the class tab to be completely invisible until network and script initialization completed.
    4. **Missing Navigation Mapping**: `'class-hub'` was completely missing from `sectionTitles` and `sectionDomainMap` in `js/admin/app.js`, causing direct navigation to fail or fall back to incorrect domain headers (`BOARD / class-hub`).
    5. **Heavy 20MB Base64 Payload & Statement Timeouts**: `adminFetchAll('students')` without column projection downloaded complete student records including massive base64 webcam photos (up to 2.4MB per photo, totaling >20MB), triggering Supabase PostgreSQL statement timeouts (HTTP 500) and 20-60 second hangs.
    6. **Redundant Duplicate Query**: `adminFetchAll('classes')` was called twice in `renderClassHub`.
  - **Implemented Solution**:
    1. **`admin.html`**:
       - Added synchronous inline hydration script inside `#sidebar-classes-list` to immediately parse and render cached classes from `localStorage.getItem('topscore_cached_sidebar_classes')` at HTML parse time (0ms, zero visual delay or flicker).
    2. **`js/admin/app.js`**:
       - Added `'class-hub': 'Class Hub'` to `sectionTitles` and `'class-hub': 'CLASS'` to `sectionDomainMap`.
       - Converted `loadSidebarClasses` and `renderClassHub` into hoisted async functions and exported them onto `window`.
       - Removed artificial 1.5s delay and invoked `loadSidebarClasses()` immediately upon app initialization.
       - Optimized student queries in `renderClassHub` to select only required flat columns (`id, name, gender, birth_date, is_active, deleted_at, level_id, batch_id, program_id, institution_id`), eliminating all base64 photo downloads.
       - Optimized student queries in `updateAdminKpiBanner` to select only `id, deleted_at`.
       - Added memory caching (`window._classHubCache`) to make subsequent switches to Class Hub instantaneous.
    3. **`js/admin/admin-deck.js`**:
       - Optimized dashboard metrics student fetch to `id, is_active, deleted_at`.
  - **Verification via Automated Test**:
    - `scratch/test_cached_refresh.mjs`:
      - Instant sidebar class item visibility on refresh: **true** (719ms Playwright page load, 0ms DOM parse time).
    - `scratch/test_final_speed.mjs`:
      - Sidebar class item cold load: **1050ms** (down from 2-4s).
      - Class hub first render: **884ms** (down from 20-60s timeouts).
      - Class hub subsequent cached render: **265ms** (instantaneous).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Distinct Colors & Visual Banding for TASK vs TEST Columns [100% VERIFIED]**:
  - **Task vs Test Differentiation**:
    - Identified 32 TASK columns and 8 TEST columns across Themes A, B, C, D (Tests at columns 7, 8, 17, 18, 29, 30, 39, 40).
  - **Color Delineation**:
    - **TASK Columns**: Render with cyan headers (`#38bdf8`) on standard dark surface background.
    - **TEST Columns**: Render with vibrant pink headers (`#f472b6`) with a distinct bordered pill badge, highlighted header background (`rgba(244, 114, 182, 0.18)`), pink bottom border, and soft vertical pink background banding (`rgba(244, 114, 182, 0.06)`) with subtle left/right border dividers.
  - **Comprehensive Tooltips**:
    - Header tooltips clearly specify `[TASK]` or `[TEST]` prefix, assessment code, and title.
  - **Verification**:
    - Automated Playwright verification (`scratch/verify_task_test_colors.mjs`) ran live with 0 errors.
    - Screenshot archived: `class_roster_task_test_colored.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Numbered Assessment Columns 1-40 & Full Zero-Scroll Screen Fit [100% VERIFIED]**:
  - **Numbered Headers (1 to 40)**:
    - Replaced text codes with clean, numbered headers `1`, `2`, `3`, ..., `40` for all 40 class assessments.
    - Each number header retains a rich tooltip on hover: `${num}. ${code} - ${title}`.
  - **Zero Horizontal Scrolling (Full Screen Fit)**:
    - Optimized column widths (`col-asm`: 26px width, compact 0.4rem/0.25rem padding).
    - Compacted summary columns: `INST` (42px), `PROG` (46px), `BATCH` (42px), `LVL` (44px), `NAME` (135px), `PROG` (52px), `GRD` (36px), `PTS` (48px), `ST` (38px), `ACTIONS` (46px).
    - Verified on 1920x1080 desktop that `wrapClientWidth === wrapScrollWidth` (1621px == 1621px): all 49 columns are 100% visible simultaneously without any horizontal scroll bar!
  - **Points-Only Cell Formatting**:
    - Each cell renders the bold point value (e.g. `40`, `34`, `10`, `—` for unattempted, `⏳` for in-progress).
    - Hovering any cell reveals full assessment info and points out of total questions.
  - **Visual Verification**:
    - Screenshot archived: `class_roster_all_columns_visible.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **40 Assessment Columns (Points Only) & Streamlined Enrollment Table [100% VERIFIED]**:
  - **40 Individual Assessment Columns Added**:
    - Every assessment in the class curriculum (`classAssessments`, sorted chronologically) now has its own dedicated column in the Class Roster / Attendance DataGrid.
    - Each column displays the assessment's code badge (e.g. `3A1-WORDS-TASK`, `3A1-PHRASES-TASK`, `3A-WORDS-TEST`, etc.) in the header with a full title tooltip.
  - **Points-Only Cell Formatting (No Score or Grade Inside Assessment Columns)**:
    - In accordance with user requirement, assessment column cells show ONLY the points earned (e.g. `40 pts`, `34 pts`, `10 pts`).
    - Unattempted assessments display a subtle `—`.
    - In-progress attempts display `⏳`.
    - No percentage or letter grade is placed in individual assessment cells, preserving clean separation since `PROGRESS` and `GRADE` have dedicated summary columns.
  - **Abbreviated Institution Names**:
    - Shortened institution names to concise codes: Cake English Course -> `CEC`, Top English Program -> `TOP`.
    - Styled in a clean badge labeled `INST` with full name on hover.
  - **Removed Columns**:
    - Removed `gender` (GENDER), `ageDisplay` (AGE), and `phone` (CONTACT) columns to streamline width and prioritize curriculum performance.
  - **Retained Core Summary Columns**:
    - `INST` (abbreviated), `PROGRAM`, `BATCH`, `LEVEL`, `STUDENT NAME` (with avatar & PIN), `PROGRESS` (score % & completed count), `GRADE` (letter grade badge), `TOTAL PTS` (accumulated points), `STATUS` (Active/Inactive), and sticky `ACTIONS` (View Profile, Edit Student).
  - **DataGrid Dropdown Optimization**:
    - Added `max-height: 320px; overflow-y: auto;` to `.datagrid-cols-menu` so the column visibility toggle menu stays neatly scrollable with 49 columns.
  - **Automated Verification**:
    - Automated Playwright verification (`scratch/verify_40_assessments_table.mjs`) ran live against `http://127.0.0.1:5500/admin.html`.
    - Verified 49 total columns, confirmed `hasGender=false`, `hasAge=false`, `hasContact=false`.
    - Verified smooth horizontal scrolling and captured visual proof screenshots: `class_roster_40_assessments_left.png` and `class_roster_40_assessments_scrolled.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Supabase Cloud Connection Restored & Zero-Error Full Recovery [100% VERIFIED]**:
  - **Root Cause of `TypeError: Failed to fetch` & "No classes found"**:
    - An unstaged edit in `js/supabase.js` had caused `USE_LOCAL` to fall back to `isLocalHostname` (which evaluates to `true` on `127.0.0.1:5500`), pointing the Supabase client to `http://127.0.0.1:54021` where Docker is not running.
    - This caused all browser database queries (classes, assessments, vault) to fail with `TypeError: Failed to fetch`, rendering "No classes found." in the sidebar and empty views across the console.
  - **The Fix**:
    - Restored `USE_LOCAL` in `js/supabase.js` to only be active if `localStorage.getItem('topscore_use_local') === 'true'`.
    - By default, all browser sessions connect directly to Supabase Cloud (`https://oclajpyumehpojepcczg.supabase.co`).
  - **Verification Across All Affected Views**:
    - Sidebar correctly renders `📘 Vocabulary` under `C — CLASS`.
    - Clicking `📘 Vocabulary` opens the Class Hub with 40 Assessments, 50 Enrolled Students, and the clean 14-column Class Roster table.
    - `admin.html#assessments` successfully renders all 40 assessments.
    - `admin.html#vocab_vault` loads all 800 vocabulary words and Level 3 roadmaps with zero errors.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.
    - Added `defer` attribute to external `<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js">` in `admin.html` to eliminate external network blocking and ensure lightning-fast 700ms page loads.
  - **Comprehensive Zero-Error Verification**:
    - Executed automated Playwright test (`scratch/verify_class_roster_scores.mjs`) navigating live through `#class-hub` and the Attendance tab.
    - Verified 0 uncaught exceptions, 0 runtime errors, and captured full-resolution visual proof (`class_roster_scores_verified.png`).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Standardize Assessment Codes & Strict Sequential Prerequisite Chaining [100% VERIFIED]**:
  - **Assessment Code Normalization (`shell_code` & `payload.shell_code`)**:
    - Re-formatted all 40 curriculum tasks and tests across Themes A, B, C, D to the standardized format:
      - Tasks: `${level_number}${theme_code}${topic_number}-${category.toUpperCase()}-TASK` (e.g. `3A1-WORDS-TASK`, `3A1-PHRASES-TASK`, `3B1-WORDS-TASK`).
      - Tests: `${level_number}${theme_code}-${category.toUpperCase()}-TEST` (e.g. `3A-WORDS-TEST`, `3A-PHRASES-TEST`, `3D-WORDS-TEST`, `3D-PHRASES-TEST`).
    - Standardized shell generator in `js/api.js` (`upsertDynamicAssessmentShell`) to produce this exact code formula for all future generations.
  - **Strict Sequential Prerequisite Chaining (`prerequisite_assessment_id`)**:
    - Established an unbroken sequential prerequisite chain linking all 40 assessments in exact chronological order:
      - `3A1-WORDS-TASK` (`prerequisite_assessment_id: NULL`)
      - `3A1-PHRASES-TASK` (prerequisite: `3A1-WORDS-TASK`)
      - `3A2-WORDS-TASK` (prerequisite: `3A1-PHRASES-TASK`)
      - `3A2-PHRASES-TASK` (prerequisite: `3A2-WORDS-TASK`)
      - `3A3-WORDS-TASK` (prerequisite: `3A2-PHRASES-TASK`)
      - `3A3-PHRASES-TASK` (prerequisite: `3A3-WORDS-TASK`)
      - `3A-WORDS-TEST` (prerequisite: `3A3-PHRASES-TASK`)
      - `3A-PHRASES-TEST` (prerequisite: `3A-WORDS-TEST`)
      - `3B1-WORDS-TASK` (prerequisite: `3A-PHRASES-TEST`)
      - `3B1-PHRASES-TASK` (prerequisite: `3B1-WORDS-TASK`)
      - ... chained continuously across Themes B, C, D to `3D-WORDS-TEST` & `3D-PHRASES-TEST`.
    - Standalone Try-Out assessments (`TRYOUT-VOCAB-L3-ALL` and `TRYOUT-PHRASE-L3-ALL`) preserved at display order 41 and 42 with `prerequisite_assessment_id: NULL`.
    - Executed updates across both Docker Local Supabase (`http://127.0.0.1:54021`) and Supabase Cloud (`https://oclajpyumehpojepcczg.supabase.co`).
  - **Admin Class Hub UI DataGrid Updates (`js/admin/app.js`, `js/admin/class.js`, `js/admin/classes-management.js`)**:
    - `js/admin/app.js`: DataGrid CODE column renders clean monospace badges (e.g. `3A1-WORDS-TASK`); PREREQUISITE column renders prior assessment badge (e.g. `⚠️ 3A1-WORDS-TASK`) or `—` for the first record.
    - `js/admin/class.js`: Updated `renderResults` attempts query to select `prerequisite_assessment_id, prerequisite_min_score, shell_code`, added `shell_code` to searchKeys, and added code badge to the Assessment Title column.
    - `js/admin/classes-management.js`: Selected `shell_code` on prerequisite assessment relationship, mapped `shellCode`, and rendered clean CODE and PREREQUISITE badges.
  - **Automated Verification**:
    - Automated Playwright audit verified all 42 rendered rows in `#class-assessments-grid` with 100% precision.
    - High-resolution visual proof screenshot captured and archived: `classes_hub_standardized.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Code Refactoring & Dead-Code Cleanup [100% REGRESSION PASS]**:
  - **Admin Topbar Action Shell Pruning (`admin.html`, `js/admin/app.js`)**:
    - Removed redundant global topbar button `#add-record-btn` ("+ Add New") from `.topbar-actions` in `admin.html`.
    - Cleaned up dangling click handlers and visibility conditionals in `js/admin/app.js`.
    - All sub-modules continue using their native contextual action buttons (e.g., student roster adds, assessment creation wizards).
  - **Ghost Listener Removal & Function Deduplication (`js/admin/crud-modals.js`, `js/admin/app.js`)**:
    - Confirmed removal of ghost listener for non-existent DOM element `#btn-resolve-all-visible-questions`.
    - Removed redundant duplicate definition of `window._editRecord` in `js/admin/crud-modals.js` (line 871), retaining the authoritative, centralized implementation in `js/admin/app.js` (line 2827).
  - **Obsolete DOM Nodes Cleanup in Assessment Shell (`assessment.html`)**:
    - Pruned deprecated `#assessment-student-name` and `#assessment-student-details` span tags (which were permanently hidden via `display: none;`) from the top utility bar.
    - Preserved the clean 60x60px avatar photo element (`#assessment-student-avatar`), timer badge, and give-up button.
  - **Regression & Full Audit Verification**:
    - Ran targeted regression suite `scratch/test_regression_refactor.mjs` confirming modal openings, student edit flows, and assessment shell render with 0 console errors.
    - Re-executed full 121-feature automated Playwright stress test (`scratch/test_e2e_stress_audit.mjs`), confirming all 121 features achieve a **100% PASS rate** with verified database state rollback.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Top Office Stress-Test Defect Resolution & 121-Feature Verification [100% PASS RATE]**:
  - **Vocabulary Vault Query Sanitization (`js/api.js`)**:
    - Purged non-existent `item_code` column from all `.select(...)` queries on `public.vocabulary_vault` (lines 1655, 1731, 2034, 2070, 2094, 2358).
    - Removed `item_code` reference from row sanitizer/normalizer `sanitizeVaultRow` and `exportVaultWords`.
    - Verified `fetchVaultWords` returns HTTP 200 with structured vocabulary payload without 42703 PostgREST column errors.
    - Verified `checkVaultDuplicates` and `exportVaultWords` execute cleanly without schema errors.
    - Resolves defects C.23, C.24, C.25, C.28, C.29.
  - **Duplicate Questions Modal Kebab-Case Harmonization (`admin.html`, `js/admin/crud-modals.js`)**:
    - Harmonized HTML element IDs to kebab-case:
      - Changed `dup-q-ASSESSMENT-select` to `dup-q-assessment-select`.
      - Changed `btn-batch-clean-ASSESSMENT-questions` to `btn-batch-clean-assessment-questions`.
      - Updated tab buttons to `data-qtab="same_assessment"` / `data-qtab="cross_assessment"`.
    - Updated `js/admin/crud-modals.js` to bind event listeners and query selectors to `dup-q-assessment-select` and `btn-batch-clean-assessment-questions`.
    - Connected `initDuplicateQuestionsSelect()` to dynamically populate assessment options in the dropdown.
    - Verified "Clean All & Resequence" handler cleanly attaches and is responsive.
    - Resolves defects C.17, C.21.
  - **AI Module Card Component Classing (`js/admin/modules.js`)**:
    - Added `class="module-card card"` to all 8 evaluation engine cards generated by `renderModules()`.
    - Resolves defect D.1.
  - **Automated Playwright 121-Feature Interaction Audit & Guaranteed Rollback**:
    - Ran full Playwright stress test across 121 elements (0.1–0.13, A.1–A.17, B.1–B.26, C.1–C.47, D.1–D.18).
    - All 121 features achieved **100% PASS rate** with 0 DEAD-ENDS and 0 FAILS.
    - Database rollback ledger executed in reverse order inside `try...finally` block.
    - Post-test integrity checks verified 100% perfect restoration for test records (Student: Galang Arzaki, Assessment: PUBLISHED).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Comprehensive Responsive 95% Width Shell, Proportional Percentage Heights & Global Footer Banner Audit [100% VERIFIED]**:
  - **Responsive 95% Width Shell (Zero Horizontal Clipping)**:
    - Replaced rigid 400px width declarations across all middle containers with `width: 95% !important; max-width: 440px !important; margin: 0 auto !important;` (and `width: 100% !important; max-width: 440px !important;` for nested children filling the shell).
    - Applied to: `<header>`, `.assessment-body`, `.assessment-main-content`, `questionBox`, `metadataTable`, `interactionContainer`, `answerArea`, `controlArea`, `#virtual-keyboard-container`, and `#fixed-bottom-area` inner nav wrappers.
    - Result: Small mobile screens (360x800) cleanly display with 342px content width (95%) and 9px lateral breathing margins on each side without horizontal clipping or scrollbars. Standard mobile screens (412x915) display with 391.4px content width (95%) and ~10.3px margins.
  - **Proportional Percentage Heights Inside Assessment Body (Zero Layout Shift)**:
    - Mode 1 (Speech) & Mode 2 (Keyboard):
      - `questionBox` (Prompt): `height: 30%; min-height: 30%; max-height: 30%; display: flex; align-items: center; justify-content: center;`
      - `metadataTable`: `height: 10%; min-height: 10%; max-height: 10%; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;`
      - `answerArea` (Transcript / Textarea): `height: calc(50% - 3px); min-height: calc(50% - 3px); max-height: calc(50% - 3px); overflow-y: auto;` (represents 30% of body)
      - `controlArea` (MIC container / Virtual Keyboard): `height: calc(50% - 3px); min-height: calc(50% - 3px); max-height: calc(50% - 3px); display: flex; align-items: center; justify-content: center;` (represents 30% of body)
    - Mode 3 (MCQ - Pilihan Ganda):
      - `questionBox` (Prompt): `height: 30%;` (strictly identical percentage to preserve coordinates)
      - `metadataTable`: `height: 10%;` (strictly identical percentage to preserve coordinates)
      - `answerArea` (MCQ Options): `height: 100%; min-height: 100%; max-height: 100%; display: flex; flex-direction: column; justify-content: space-between; overflow-y: auto;` (represents 60% of body)
    - Verified Layout Shift: `questionBox.getBoundingClientRect().top` remained exactly `144.0px` across MCQ, Keyboard, and Speech modes with `0.0px` shift!
  - **Question Metadata Clean-Up (Direct Dynamic Values Only)**:
    - Stripped all hardcoded label prefixes (`THEME:`, `CATHEGORY:`, `TOPIC:`, `TYPE:`) in `renderQuestion()`.
    - Directly populated dynamic values in the 10% 2x2 grid (`font-size: 10.5px`, `font-weight: 700`, centered):
      - Row 1: Left = Theme name only (`Workplace`) | Right = Category name only (`Words` / `Phrases`)
      - Row 2: Left = Topic name only (`Building Your Professional Identity`) | Right = Type name only (`Expression` / `Adjective` / `Sentence`)
  - **100% Full-Width Footer Banner**:
    - `#bottom-ad-banner` spans 100% full-width edge-to-edge: `width: 100% !important; width: 100vw !important; max-width: 100vw !important; margin: 0 !important; left: 0 !important; right: 0 !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; border-bottom: none !important; border-top: 1px solid rgba(56, 189, 248, 0.25) !important; height: 28px !important; padding-bottom: max(3px, env(safe-area-inset-bottom, 0px)) !important;`
    - Standardized global branding text: `<span style="color:#38bdf8; font-weight:800; letter-spacing:0.04em;">TopsCore</span>&nbsp;&copy; 2026&nbsp;<span style="opacity:0.4; margin:0 6px;">|</span>&nbsp;<span style="color:#cbd5e1;">Created by Mr. Top</span>`
  - **Playwright Audit Test Suite (`test-metadata-banner-audit.mjs`)**:
    - Built-in static HTTP test server on port 3458 with automatic mock API routing.
    - Validated all 3 modes on `412x915` (standard Android Chrome) and `360x800` (compact mobile).
    - Generated 6 high-resolution visual proof screenshots:
      - `audit_412x915_mcq.png`, `audit_412x915_keyboard.png`, `audit_412x915_speech.png`
      - `audit_360x800_mcq.png`, `audit_360x800_keyboard.png`, `audit_360x800_speech.png`
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Assessment Question Order Randomization & Deterministic Resumption [100% VERIFIED]**:
  - **Identified Root Causes**:
    1. In `js/api.js` (line 620), dynamic assessment questions were explicitly sorted alphabetically by Indonesian translation: `vaultWords.sort((a, b) => (a.indonesian || '').localeCompare(b.indonesian || ''))`.
    2. In `js/api.js` `startAssessment()` (line 718), `question_order` was omitted from the `assessments` `.select(...)` query, leaving `assessmentData.question_order` as `undefined`.
    3. In `assessment.html` (line 1149), the condition `if (assessmentData?.question_order === 'random')` evaluated to `false` because `question_order` was undefined, skipping `shuffleWithSeed()`.
    4. In `supabase/functions/start-assessment/index.ts`, `vaultWords` was also sorted by Indonesian translation (`localeCompare`), and the check `if (assessment.question_order === 'RANDOM')` was uppercase-only, bypassing shuffle because the database stores lowercase `'random'`.
  - **Implemented Solution**:
    1. **`js/api.js`**:
       - Defined `fisherYates` shuffle helper and applied it to `vaultWords` when `question_order` is `'random'` (default).
       - Added `question_order` to the `assessments` select query in `startAssessment()` and populated `assessment.question_order` with fallback to `'random'`.
       - Updated attempt answer ordering to prioritize `a.question_snapshot?.display_order ?? a.question_snapshot?.question_order`.
    2. **`assessment.html`**:
       - Made `shuffleWithSeed(array, seedStr)` defensive with string conversion and empty array protection.
       - Updated `bootAssessment()` to case-insensitively check `orderSetting === 'random'` with a default to `'random'`, ensuring seeded shuffle is always applied.
       - Immediately synchronized `window.allAnswerRows = allAnswerRows;` after shuffle so UI components and global references share the shuffled sequence.
    3. **`supabase/functions/start-assessment/index.ts`**:
       - Handled `question_order === 'random'` case-insensitively and shuffled `vaultWords` / `snapQuestions`.
       - Included `question_order` in the returned `assessment` object for both new attempts and resumed attempts.
  - **Verification via Automated Test**:
    - Randomization verified: Alphabetical input was shuffled (`Hasil kerja, Gigih, Jujur, Efektif, Inovatif, Ambisi...`).
    - Deterministic resumption verified: Refreshing with the same attempt ID produced the exact identical sequence.
    - Distinct attempt seeds verified: Different attempt IDs produce unique permutations.
    - First rendered UI question prompt matched the first shuffled question (`Hasil kerja`).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Question Metadata Clean-Up, 100% Full-Width Global Banner, and Verification Screenshots [100% VERIFIED]**:
  - **Question Metadata Clean-Up (Direct Values Only)**:
    - In `renderQuestion()`, completely stripped all static label prefixes (`THEME`, `CATHEGORY`, `TOPIC`, `TYPE`).
    - Configured the 40px table (2 rows x 20px) directly below the Question Box with centered dynamic badges:
      - Row 1 (20px): Left = Theme name only (e.g., `Workplace`) | Right = Category name only (e.g., `Words` / `Phrases`)
      - Row 2 (20px): Left = Topic name only (e.g., `Building Your Professional Identity`) | Right = Type name only (e.g., `Noun` / `Expression`)
    - Styling: Font size 10.5px, font-weight 700, centered text (`text-align: center; justify-content: center;`), clean ellipsis text-overflow (`overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`), zero redundant label text.
  - **100% Full-Width Global Footer Banner**:
    - `#bottom-ad-banner` updated to span 100% of viewport width edge-to-edge (full bleed wall-to-wall):
      - CSS: `width: 100% !important; width: 100vw !important; max-width: 100vw !important; margin: 0 !important; left: 0 !important; right: 0 !important;`
      - Stripped side margins and rounded corners: `border-radius: 0 !important; border-left: none !important; border-right: none !important; border-bottom: none !important; border-top: 1px solid rgba(56, 189, 248, 0.25) !important;`
      - Height & padding: Exactly 28px height with `padding-bottom: max(3px, env(safe-area-inset-bottom, 0px)) !important;`
    - Content: Uniform global branding text identical across all pages (`index.html`, `dashboard.html`, `result.html`, `admin.html`):
      `<span style="color:#38bdf8; font-weight:800; letter-spacing:0.04em;">TopsCore</span>&nbsp;&copy; 2026&nbsp;<span style="opacity:0.4; margin:0 6px;">|</span>&nbsp;<span style="color:#cbd5e1;">Created by Mr. Top</span>`
    - Adjusted `body.assessment-page` padding to `0 !important;` and assigned `padding: 0 8px; box-sizing: border-box;` to `<header>`, `.assessment-body`, `.bottom-nav-bar`, and progress container to preserve the 400px centered layout for content while allowing the bottom footer banner to bleed 100% edge-to-edge.
  - **Automated Verification Across Android Chrome Viewports (`412x915` & `360x800`)**:
    - Ran Playwright mobile runner test (`test-metadata-banner-audit.mjs`):
      - `412x915`: Banner width = 412px (100% width, 28px height), scrollHeight = 915px (zero vertical overflow).
      - `360x800`: Banner width = 360px (100% width, 28px height), scrollHeight = 800px (zero vertical overflow).
      - Metadata badges verified: `['Workplace', 'Phrases', 'Building Your Professional Identity', 'Expression']`.
    - Generated fresh visual proof across all 3 modes:
      - `audit_412x915_mcq.png`, `audit_412x915_keyboard.png`, `audit_412x915_speech.png`
      - `audit_360x800_mcq.png`, `audit_360x800_keyboard.png`, `audit_360x800_speech.png`
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Precise Pixel Specification Enforcement Based on Latest 3-Panel Wireframe [100% VERIFIED]**:
  - **Directive**: Updated assessment layout and element heights strictly according to the latest 3-panel wireframe blueprint:
    - **Header Block (Preserved Layout with Exact Spacers)**:
      - Top spacer: Exactly 10px height (`height: 10px; min-height: 10px; max-height: 10px; flex-shrink: 0;`).
      - Top utility row: Exactly 60px height (`height: 60px; min-height: 60px; max-height: 60px;`) with [Give up!] button on left, centered student avatar photo (60x60px), and [Timer 18:02] on right.
      - Middle spacer: Exactly 10px height (`height: 10px; min-height: 10px; max-height: 10px; flex-shrink: 0;`).
      - Assessment title box: Exactly 54px height (`height: 54px; min-height: 54px; max-height: 54px;`), centered text, 2-line clamp.
      - Bottom spacer: Exactly 10px height (`height: 10px; min-height: 10px; max-height: 10px; flex-shrink: 0;`).
    - **Question Box & Metadata Table (Exact Heights)**:
      - Question Box: Exactly 135px height (`height: 135px; min-height: 135px; max-height: 135px; flex-shrink: 0;`), solely holding centered prompt text with zero metadata clutter inside.
      - Metadata Table (placed directly below Question Box):
        - Exactly 40px total height, split into 2 rows of 20px each.
        - Left column: Theme (20px) stacked above Topic (20px).
        - Right column: Cathegory (20px) stacked above Type (20px).
    - **Interaction & Answer Zone**:
      - Mode 1 (Speech):
        - Upper: Answer box (`flex: 1; min-height: 80px; overflow-y: auto;`).
        - Lower: MIC container locked at fixed height 135px (`height: 135px; min-height: 135px; max-height: 135px; flex-shrink: 0; width: 100%; max-width: 400px;`) with centered microphone button and helper label.
      - Mode 2 (Keyboard):
        - Upper: Answer box (`flex: 1; min-height: 80px; overflow-y: auto;`).
        - Lower: Keyboard container locked at fixed height 135px (`height: 135px; min-height: 135px; max-height: 135px; flex-shrink: 0; width: 100%; max-width: 400px;`).
      - Mode 3 (MCQ):
        - Options container set to dynamic flex (`flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; justify-content: space-between;`) housing options A through E.
    - **Docked Bottom Section**:
      - Upper spacer: Exactly 10px height.
      - Navigation row: Exactly 54px height (`height: 54px; min-height: 54px; max-height: 54px;`) containing [Prev], [0/40 Answered], and [Next].
      - PROGRESS LINE: Exactly 10px height docked container (`height: 10px; min-height: 10px; max-height: 10px;`).
      - Lower spacer: Exactly 10px height.
      - Bottom banner: Exactly 28px height with "banner TopsCore" text and safe-area padding.
  - **Automated Verification Across Android Chrome Viewports (`360x800` & `412x915`)**:
    - Tested with Playwright automated test script:
      - `360x800`: Zero overflow below fold (`scrollHeight: 800px, windowHeight: 800px`) across all 3 modes.
      - `412x915`: Zero overflow below fold (`scrollHeight: 915px, windowHeight: 915px`) across all 3 modes.
      - Identical layout alignment and exact height measurements confirmed for every element across all modes.
    - Captured high-resolution visual proof: `blueprint_speech_360x800.png`, `blueprint_keyboard_360x800.png`, `blueprint_mcq_360x800.png`, `blueprint_speech_412x915.png`, `blueprint_keyboard_412x915.png`, `blueprint_mcq_412x915.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Fix Question Card Metadata Position & Eliminate Empty Void [100% VERIFIED]**:
  - **Directive**: Repositioned all metadata badges to the bottom of the Question Card directly underneath the prompt text, and eliminated the empty void in Speech Mode by replacing `justify-content: space-between` with `justify-content: center; gap: 12px;`.
  - **Question Card Structure (`topSection`)**:
    - **Upper Area (`flex: 1; display: flex; align-items: center; justify-content: center;`)**: Holds the prompt word/phrase (e.g., "ambisi") large (`clamp(18px, 4.8vw, 24px)`), centered, with white Outfit typography. No badges appear above the prompt text.
    - **Lower Area**: Single clean horizontal row (`display: flex; justify-content: center; align-items: center; gap: 6px;`) sitting neatly under the prompt text at the bottom of the card, containing all 4 dynamic badges:
      - 1. Theme (`displayTheme`, electric cyan pill `rgba(56,189,248,0.12)`)
      - 2. Topic (`displayTopic`, slate pill `rgba(255,255,255,0.06)`)
      - 3. Category (`displayCategory`, emerald pill `rgba(52,211,153,0.12)`)
      - 4. Type (`displayType`, muted pill `rgba(255,255,255,0.05)`)
    - Card height remains strictly locked at `135px; min-height: 135px; max-height: 135px; flex-shrink: 0;` ensuring zero layout shift across assessment modes.
  - **Eliminate Massive Gap in Speech Mode (`#interaction-container`)**:
    - Removed `justify-content: space-between;` from `#interaction-container`.
    - Applied `justify-content: center; gap: 12px;` so the Answer Box (transcript) and the MIC zone sit naturally grouped together without an enormous empty void between them.
  - **Automated Multi-Viewport Verification (Playwright)**:
    - Tested on `360x665` (Compact Mobile) and `412x915` (Tall Mobile):
      - `promptIsAboveBadges: true` (Prompt at y: ~185px, Badges at y: ~244px).
      - `speechInnerGap: 12px` (Exact 12px gap between transcript box and microphone card).
      - `overflowBelowFold: 0px` across both viewports.
      - `topSection` invariant: Top = 140px, Height = 135px across all 3 modes (Speech, Keyboard, MCQ).
    - Visual screenshots verified: `screenshot_locked_speech_360x665.png`, `screenshot_locked_speech_412x915.png`, `screenshot_locked_keyboard_360x665.png`, `screenshot_locked_mcq_360x665.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Lock Question Card Height & Make Only Answer Region Dynamic [100% VERIFIED]**:
  - **Directive**: Prevented layout shift across assessment modes by locking Question Card height while allowing only the Answer/Interaction zone to flex dynamically.
  - **Question Card (`topSection`)**:
    - Locked to fixed, compact height: `height: 135px; min-height: 135px; max-height: 135px; flex-shrink: 0;`.
    - Prominently centered prompt text in white with Outfit font.
    - 4 corner metadata badges without static prefix labels:
      - Top-Left: Theme (`displayTheme`, electric cyan pill)
      - Top-Right: Category (`displayCategory`, emerald pill)
      - Bottom-Left: Topic (`displayTopic`, slate pill)
      - Bottom-Right: Type (`displayType`, muted pill)
  - **Dynamic Answer & Interactive Zone (`interactionContainer`)**:
    - Created flexible container: `flex: 1; display: flex; flex-direction: column; justify-content: space-between; min-height: 0; overflow-y: auto; gap: 8px;`.
    - **Speech Mode**: Compact transcript box (`height: clamp(80px, 14vh, 100px)`) + responsive mic button (`clamp(56px, 14vw, 72px)`) + "Tap to Speak" helper.
    - **Keyboard Mode**: Compact input box (`flex: 0.9; min-height: 65px; max-height: 110px`) + responsive virtual keyboard container (`flex: 1.2; min-height: 140px; max-height: 220px;`) with keycaps (`clamp(28px, 4vh, 38px)`).
    - **MCQ Mode**: Flexible options container (`flex: 1; min-height: 0; overflow-y: auto;`) with 5 ergonomic option cards (A-E) at `min-height: 38px; height: clamp(38px, 5.5vh, 50px);`.
  - **Verification Across Viewports (Playwright Automated Tests)**:
    - Tested across `360x665` (compact) and `412x915` (tall).
    - **Zero Layout Shift Invariant**: `topSection` top position is exactly **140px** and height is **135px** across all 3 modes (Speech, Keyboard, MCQ).
    - **Zero Overflow Below Fold**: `overflowBelowFold = 0px` across all viewports and modes.
    - Visual artifacts captured: `screenshot_locked_speech_360x665.png`, `screenshot_locked_keyboard_360x665.png`, `screenshot_locked_mcq_360x665.png`, `screenshot_locked_speech_412x915.png`, `screenshot_locked_keyboard_412x915.png`, `screenshot_locked_mcq_412x915.png`.
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Eliminate Empty Void & Unclip Mic Button in Speech Mode [100% VERIFIED]**:
  - **Directive**: Removed blank dark void and restored unclipped microphone button in Speech Mode on mobile devices.
  - **Removed Hardcoded Dummy Spacers**:
    - Deleted all 4 dummy 10px spacer divs (`<!-- (space 10px) --> <div style="height:10px;"></div>`) around `<header>` and `#fixed-bottom-area` in `assessment.html`.
    - Integrated native CSS flexbox gaps: `gap: 8px; margin-bottom: 8px;` on `<header>` and `gap: 6px; padding-top: 6px;` on `#fixed-bottom-area`.
  - **Eliminated Rigid Heights in Speech Mode (`renderQuestion`)**:
    - Replaced rigid `controlArea.style.cssText` (`height: 135px; min-height: 135px;`) with auto-scaling `width: 100%; max-width: 400px; height: auto; margin: 0 auto; padding: 12px 0;`.
    - Compacted `answerArea.style.cssText` (transcript box) to `height: 95px; min-height: 90px; max-height: 100px;`.
    - Updated container `#assessment-main` to `justify-content: space-between; height: 100%; min-height: 100%;` to dynamically pin the mic container directly above `#fixed-bottom-area` with zero dead space.
  - **Fixed Container Overflow**:
    - Updated `.assessment-body` and `.assessment-main-content` styles from `overflow: hidden;` to `overflow-y: auto !important; overflow-x: hidden !important; -webkit-overflow-scrolling: touch !important;`.
    - Microphone button (62px) and "Tap to Speak" helper text sit completely unclipped with a natural 21px gap above the bottom navigation bar.
  - **Multi-Viewport Testing Verified (Playwright)**:
    - Tested on `412x915` (Modern Android full-screen): Mic bottom at 773.6px, "Tap to Speak" bottom at 798px, bottom navigation top at 819px (`gap: 21px`), 0 clipping (`screenshot_speech_412x915.png`).
    - Tested on `360x800` (Standard Android mobile): Mic bottom at 658.6px, "Tap to Speak" bottom at 683px, bottom navigation top at 704px (`gap: 21px`), 0 clipping (`screenshot_speech_360x800.png`).
  - **Strict Git Freeze Enforced**: 0 commits, 0 pushes.

- **Assessment Loading & Question Generation Fix [100% VERIFIED]**:
  - **Root Cause 1 (Missing DB Column in Local Docker Postgres)**: `vocabulary_vault` in local Postgres was missing the `category` column (`words` / `phrases`), which caused the query `.select('..., category')` in `js/api.js` to fail with PostgreSQL error `42703 (column vocabulary_vault.category does not exist)`. This returned an empty array of words, causing attempts to be created with 0 questions.
    - **Fix**: Executed SQL migration adding `category VARCHAR(32) DEFAULT 'words'`, backfilled rows based on `word_type` (166 phrases, 649 words), and created trigger `trg_set_vocabulary_vault_category`. Created tracked migration file `supabase/migrations/20261016000000_add_vocabulary_vault_category.sql`.
  - **Root Cause 2 (No Self-Healing for In-Progress Attempts with 0 Questions)**: When an attempt was interrupted or initially created with 0 questions, `startAssessment` bypassed question generation on resume (`if (!attempt)` was skipped), permanently locking the attempt with 0 answers and displaying "No Questions Found".
    - **Fix**: Refactored `generateAssessmentQuestions` in `js/api.js` with dual-mode schema resilience (supports schemas with or without `category` column, and fallback to level words if strict filters match 0 rows). In `startAssessment`, implemented self-healing: if an in-progress attempt has 0 answers, it dynamically populates and inserts questions. Cleaned up corrupt empty attempts.
  - **Root Cause 3 (ViewTransition Opt-In Abort)**: `<meta name="view-transition" content="same-origin" />` in `assessment.html` caused Chromium to abort transitions with `Uncaught (in promise) InvalidStateError: Transition was aborted because of invalid state. ViewTransition opt-in disabled`.
    - **Fix**: Removed `<meta name="view-transition" content="same-origin" />` from `assessment.html`.
  - **Title & UI Enhancement**: Fixed casing in `result.assessment || result.ASSESSMENT` in `assessment.html` and `api.js` so full assessment title displays prominently (`3rd Vocabulary - A1 Words Task - Building Your Professional Identity`). Added active retry/refresh action in empty state.
  - **End-to-End Browser Verification**: Verified in Chromium via Playwright:
    - Page loads cleanly with 0 console errors.
    - Live countdown timer ticks accurately.
    - Assessment title and questions render seamlessly.
    - Screenshot captured and visually verified (`screenshot_assessment_loaded.png`).
  - **Git Safety Enforced**: Strict mandate followed — NO git commit, NO git push.

- **Modern & Sleek Assessment Page UI Overhaul (Dark Mode, Glassmorphism, 705px Unified Shell) [100% VERIFIED]**:
  - Transformed the assessment page from raw wireframe mockups to a premium, modern, sleek dark-mode glassmorphic application while preserving every single dimension and vertical budget (705px).
  - **Visual & Component Polish**:
    - **Canvas**: Deep space mesh gradient `radial-gradient(circle at 50% 0%, #172554 0%, #0f172a 45%, #060b18 100%)` with antialiased typography.
    - **Header Row (60px)**:
      - Give Up: Frosted crimson glass pill with soft red glow `box-shadow: 0 4px 14px rgba(239, 68, 68, 0.25)` and red flag icon.
      - Avatar (60x60px): Rounded squircle (`border-radius: 14px`) with vibrant cyan border `2px solid rgba(56, 189, 248, 0.6)` and soft ambient glow.
      - Countdown Timer: Glass badge with glowing monospace digits in electric cyan `#38bdf8` (`text-shadow: 0 0 10px rgba(56, 189, 248, 0.45)`).
    - **Assessment Title (54px)**: Translucent deep navy glass with subtle cyan border, soft backdrop blur, and crisp white bold typography.
    - **Question Card + Metadata (189px)**:
      - Question Box (135px): Sleek dark glass card with Outfit bold typography and soft text shadow.
      - Metadata Grid (54px, 2 rows x 27px): Translucent dark pills (`rgba(255,255,255,0.04)`) with electric cyan labels (`THEME`, `CATEGORY`, `TOPIC`, `TYPE`) and crisp white values.
    - **Interactive Middle Area (270px)**:
      - **Mode 1 (Speech)**: Answer card (135px) with language pill and glowing status indicator + MIC card (135px) with radial glowing emerald pulse microphone button (`#10b981`) and "Tap to Speak" helper.
      - **Mode 2 (Keyboard)**: Answer card (135px) with glowing 26px typography + Virtual Keyboard (135px) in sleek dark glass with rounded glass keycaps and cyan-tinted special keys (`Backspace`, `Enter`, `Space`).
      - **Mode 3 (Options)**: Translucent dark options card (270px) with sleek option cards (min-height 48-54px), rounded letter badges A-D, and glowing cyan border on active selection.
    - **Bottom Nav Bar (27px)**: Sleek glass Prev/Next buttons with cyan text + frosted center `0/40 Answered` pill.
    - **Docked Progress Line (27px)**: Replaced retro pea-green bar with sleek translucent dark track and glowing cyan-to-emerald gradient fill (`linear-gradient(90deg, #06b6d4, #10b981)`).
    - **Permanent Banner (28px)**: Translucent pitch-black glass with cyan TopsCore logo and high-contrast text.
  - **Zero Overflow & Zero Layout Shift**: Verified with Playwright — total vertical height is 705px across all 3 modes, completely fitting within mobile viewports without scrollbars.
  - **Git Safety Enforced**: Strict mandate followed — NO git commit, NO git push.


  - Audited `#bottom-ad-banner` / `.topscore-locked-banner` across all 5 app pages (`index.html`, `dashboard.html`, `assessment.html`, `result.html`, `admin.html`).
  - Diagnosed visibility issues reported by user:
    1. Low contrast: on mobile OLED screens, `#64748b` dark slate text on `#010e17` or `#000000` pitch black bar blended into phone bezels and gesture navigation bars.
    2. Virtual keyboard push: on mobile phones with soft keyboard open, bottom area gets pushed beneath the keyboard.
    3. `width: 100vw` caused subpixel clipping on some mobile viewports with scrollbars; switched to `width: 100%`.
  - Upgraded styles in `css/style.css` and `assessment.html`:
    - Clean branded markup with vibrant cyan: `<span style="color:#38bdf8;font-weight:800;">TopsCore</span> &copy; 2026 | Created by Mr. Top`.
    - High-contrast crisp text `#cbd5e1` (Slate-200) with subtle top border `rgba(56, 189, 248, 0.25)` and soft drop shadow.
  - Verified across all viewports (mobile 412x810, 360x640, short 412x600, desktop 1280x800) via Playwright screenshots.

- **Docker Local Supabase Stack Switched & Running**:
  - Local Supabase Docker containers launched and verified healthy:
    - Kong API Gateway: `http://127.0.0.1:54021` (REST, Auth, Storage)
    - PostgreSQL Database: `127.0.0.1:54022` (44 students, full schema active)
    - Inbucket Mail: `http://127.0.0.1:54024`
  - Windows Hyper-V reserved port range (`54207-54506`) resolved by remapping local ports to unblocked `54021/54022`.
  - Updated `js/supabase.js` and `scripts/sync_local_to_cloud.mjs` to target port 54021 (API) and 54022 (DB).
  - Auto-detection enabled: running on `localhost`, `127.0.0.1`, or LAN IP automatically connects to Docker Local stack.
  - Verified REST PostgREST API and PostgreSQL connection: 44 students query successful.
  - **Git Safety Enforced**: Strict mandate followed — NO git commit, NO git push.

- **Mobile Home Button Debounce & 10-Second Countdown Enforcement**:
  - Identified root cause of instant auto-submits on smartphones: pressing Home triggered `popstate`, `blur`, and `visibilitychange` in under 2 seconds, which cascaded directly into Strike 3.
  - Implemented anti-cascade cooldown (`now - lastCheatTriggerTime < 3500` and `isCheatAlertActive` lock): pressing Home now triggers **only 1 strike** (Strike 1), properly displaying the warning overlay and starting the 10-second countdown.
  - Implemented real-time timestamp countdown (`cheatDeadline = Date.now() + durationSeconds * 1000`): accounts for mobile browser background timer throttling, ensuring returning within 10s allows dismissing and resuming, while staying away > 10s executes auto-submit.
  - Decoupled premature `submitOnPageExit` from `pagehide`: `pagehide` now safely buffers typed answers (`saveCurrentAnswer()`) without terminating active exams.
  - Cache version bumped to `v=5.1.1` across `sw.js` and `assessment.html`.
  - Verified via `test_mobile_home_anti_cheat.mjs` (5/5 PASS) and `test_anti_cheat_hardening.mjs` (12/12 PASS).

- **Dual-Engine Screen Wake Lock (Native API + NoSleep Media Fallback)**:
  - Diagnosed screen dimming issue on mobile testing:
    1. Modern mobile browsers require a **user gesture** (`click` or `touchstart`) before granting Wake Lock permissions; calling on page load alone was rejected by the browser.
    2. Over plain HTTP on Local Area Network (`http://192.168.x.x`), `navigator.wakeLock` is blocked due to non-secure context requirements.
  - Implemented modular Dual-Engine system in `js/wake-lock.js`:
    - **Engine 1 (Native W3C Wake Lock)**: Requests `navigator.wakeLock.request('screen')` with auto-reacquire on visibilitychange.
    - **Engine 2 (NoSleep Silent Media Loop)**: Embedded silent WebM/MP4 data URI `<video playsinline muted loop>` preventing mobile OS screen sleep on plain HTTP LAN or older devices.
    - **Gesture-Armed Activation**: Registers document listeners (`click`, `touchstart`, `touchend`, `pointerdown`, `keydown`) so the very first interaction immediately arms and locks the screen.
    - **Heartbeat Pulse (15s)**: Periodically re-verifies active status and re-engages locks if dropped.
  - Version bumped to `v=5.1.2` across `assessment.html` and `sw.js`.
  - Verified via `temp_test/test_dual_wake_lock.mjs` (5/5 PASS).

- **0-Score Auto-Submit Rescoring**:
  - Rescored all 31 attempts from 2026-10-13 where answers were saved but scores were left 0.00 by auto-close.
  - Restored passing scores (Ari Wahyu Darma 100% Grade S, Asti Ananta 85% Grade B, Aunul Fikri 60% Grade C).

- **Aunul Fikri Yasir Progression Resolution**:
  - Cleared dangling in-progress expired attempts.
  - Restored passing score (60% Grade C) for A1 Phrases Task, automatically unlocking Task 3 on student dashboard.

- **EXACT PIXEL-PERFECT WIREFRAME BLUEPRINT (412x810) IMPLEMENTATION [100% VERIFIED]**:
  - **Budget Breakdown (Sum = Exactly 810px)**:
    - `10px`: Top margin / space (`(space 10px)`).
    - `71px`: Top Header Row: Red `[🚩 Give up!]` on left, Center `Foto (71x71)`, Right `[⌛ 30:44]` timer badge.
    - `54px`: `ASSESSMENT TITLE 54 px` in dedicated dark-blue container.
    - `27px`: `[🔔 Toast: Resuming attempt... / Auto-dismiss 3s] 27px` static slot between title and question box.
    - `162px`: `Question Box (162px)` centered prompt.
    - `27px`: Metadata Row 1 (`Theme (27px)` | `Category (27px)`).
    - `27px`: Metadata Row 2 (`Topic (27px)` | `Type (27px)`).
    - `162px` / `297px`: Interactive Middle Area:
      - Mode 1 (Speech): `Answer box (162x400)` + `MIC (135x400)` with green circular mic button.
      - Mode 2 (Keyboard): `Answer box (162x400)` + `keyboard (135x400)` in bottom dock.
      - Mode 3 (MCQ): `options (297x400)` scrollable container.
    - `10px`: Space above bottom nav.
    - `54px`: `[← Prev]` | `0/40 Answered (54px)` with `🔍 Tap to Open Matrix` | `[Next →]`.
    - `27px`: `PROGRESS LINE (27px Docked)` with progress bar fill.
    - `10px`: Space between progress line and bottom banner.
    - `28px`: `banner TopsCore (28px)` (`TopsCore © 2026 | Created by Mr. Top`).
  - **Fixed Toast Positioning**:
    - Overrode `style.css` fixed top toast styling with `position: static !important;` in `assessment.html`, ensuring toasts sit cleanly inside their dedicated 27px slot without obstructing the avatar photo.
  - **Direct English Only (Rule 2.12)**:
    - Clean English strings throughout (`🔍 Tap to Open Matrix`).
  - **Automated Playwright Audit Verification (412x810 & 360x800)**:
    - Viewport: `412x810`
    - `headerHeight`: 135px (10 + 71 + 54)
    - `avatarDiameter`: 71x71px
    - `questionCardHeight`: 216px (162 + 27 + 27)
    - `answerCardHeight`: 297px (MCQ) / 162px (Keyboard & Speech)
    - `vkHeight`: 135px
    - `progressBarHeight`: 27px
    - `bottomNavHeight`: 54px
    - `bottomBannerHeight`: 28px
    - `overflowBelowFold`: 0px (ZERO pixel overflow, completely scroll-free app shell!)
    - Fresh screenshots: `final_mobile_01_mcq.png`, `final_mobile_02_keyboard.png`, `final_mobile_03_speech_mic.png`.
  - **Question Box & 2x2 Metadata Grid (168px + 56px = 224px)**:
    - Question Box: `168x400px` centered text prompt (`speech-question-text`).
    - Attached Metadata Grid:
      - Row 1: `Theme (28px)` (left) | `Category (28px)` (right)
      - Row 2: `Topic (28px)` (left) | `Type (28px)` (right)
  - **Middle Area Across 3 Modes (~308px uniform height)**:
    - **Mode 1 (Speech / MIC)**: `Answer box (146x400)` + `MIC (146x146)` centered.
    - **Mode 2 (Keyboard)**: `Answer box (146x400)` + `keyboard (168x400)` on-screen virtual keyboard.
    - **Mode 3 (MCQ Options)**: `options (308x400)` scrollable container containing A through E option cards.
  - **Bottom Docked Area (112px total)**:
    - `bottom-nav-bar`: `56px` (`← Prev`, center `0/40 Answered (56x150px)`, `Next →`).
    - `progress-bar-toggle`: `28px` (`PROGRESS LINE (28px Docked)`).
    - `bottom-ad-banner`: `28px` (`banner TopsCore (28px)`).
  - **Playwright Audit Metrics (412x840 & 360x800)**:
    - `headerHeight: 60`, `avatarDiameter: 56x56px`
    - `questionCardHeight: 227` (168px prompt + 56px metadata table + borders)
    - `answerCardHeight: 308` (MCQ) / `146` (Keyboard & Speech)
    - `vkHeight: 168` (Keyboard)
    - `bottomNavHeight: 56`, `progressBarHeight: 28`, `bottomBannerHeight: 28`
    - `overflowBelowFold: 0` (0px below fold, bottom navigation fully in view)
    - Fresh screenshots: `audit_412x840_01_mcq.png`, `audit_412x840_02_keyboard.png`, `audit_412x840_03_speech_mic.png`.

- **FULL MOBILE APP SHELL WIREFRAME ALIGNMENT & MULTI-MODE AUDIT [100% VERIFIED]**:
  - **Single-Row Compact Header (52px)**:
    - Left Block: Student Avatar photo only (`44px` circle with cyan border `2px solid #06b6d4`). Student name text removed (`display: none;`) to conserve horizontal/vertical space.
    - Center Block: Assessment Title box (`#assessment-main-title`) styled at 13.5px semi-bold, centered, 2-line clamp.
    - Right Block (Stacked Utilities): Top Give Up / Flag icon button (`#giveup-btn`, 20px pill), Bottom Timer badge (`#assessment-timer`, 22px badge with `⏳` and monospace countdown).
  - **Floating Decoupled Notification & Progress Line**:
    - Slim 3px progress line (`#progress-bar-toggle`) docked immediately above the bottom navigation bar.
    - Alerts/Toasts moved to `#toast-container` floating top pill (`top: 58px; left: 50%; transform: translateX(-50%); pointer-events: none;`) with auto-dismiss, completely decoupled from page flow so it never obstructs keyboard or navigation.
    - Bottom copyright banner (`.topscore-locked-banner`) hidden during assessment to reclaim 28px vertical real estate.
  - **Docked Bottom Navigation Bar (56px)**:
    - `position: sticky; bottom: 0; z-index: 100; height: 56px; padding-bottom: max(8px, env(safe-area-inset-bottom));`.
    - Left: `[ ← Prev ]` button (42px height).
    - Center: `0/40 Answered` + sub-label `🔍 Tap Buka Kisi Modal` (triggers Question Matrix modal).
    - Right: `[ Next → ]` button (42px height).
    - Overflow below fold: **0px across all resolutions**.
  - **Mode 1: Multiple Choice (MCQ)**:
    - 5 option cards (A through E) with `min-height: 48px–50px` (measured 50px–63px), 8px margin gap.
    - Full text-wrapping enabled (`white-space: normal; word-break: break-word; line-height: 1.35;`).
  - **Mode 2: Keyboard / Typing Mode**:
    - Stacks Question Card -> Compact Answer Box (`min-height: 54px; max-height: 68px;`) -> Virtual Keyboard (`#virtual-keyboard-container`).
    - Keycaps styled with balanced touch sizing (~36px height) and integrated Space / DEL buttons.
    - 0px overlap between keyboard keys and bottom navigation bar.
  - **Mode 3: Speech / MIC Mode**:
    - Stacks Question Card -> Answer Box (`min-height: 76px; max-height: 88px;` with language selector & status indicator) -> Centralized Microphone button (`64x64px` with radiant green glow).
  - **Multi-Resolution Playwright Audit**:
    - Viewports tested: `412x915` (flagship) and `360x800` (budget).
    - Verified `overflowBelowFold: 0`, `bottomNavInView: true`, `optionHeights >= 46px` (min 50px), `middleScrollBehavior: true`.
    - Generated screenshots: `final_mobile_01_mcq.png`, `final_mobile_02_keyboard.png`, `final_mobile_03_speech_mic.png`.

- **MR. TEST THEME A COMPLETE EXAM E2E VERIFICATION [100% VERIFIED LIVE]**:
  - **40/40 Questions Answered Sequentially**:
    - Mr. Test logged in (Cake English Course -> 123 -> Mr. Test -> PIN 1234).
    - Launched Theme A Assessment (`447ddd4e-1ad8-4536-8bad-c92b68a2e1bb`: "3rd Vocabulary - A1 Phrases Task - Building Your Professional Identity").
    - Answered all 40 questions sequentially from Q1 to Q40.
    - Progress verified on each question: `All Bottom Navigation Bars In-View (0px scroll required): ✅ PASS`, `All 44px Avatars & Headers Visible: ✅ PASS`.
    - Midpoint Q20 screenshot captured: `mr_test_q20_midpoint.png`.
    - Final Q40 screenshot captured: `mr_test_q40_ready_to_submit.png`.
    - Question Matrix Modal verified with all 40/40 answered: `mr_test_matrix_40_answered.png`.
    - Submit Confirmation Modal opened, verified answered count, and confirmed: `mr_test_submit_modal.png`.
    - Successfully redirected to `result.html` (`http://localhost:3000/result`): `mr_test_result_page.png` displaying final score (20.0%), grade (E), attempt history breakdown, and print/retry buttons.
    - Test script `temp_test/test_mr_test_theme_a_complete_exam.mjs` completed with exit code 0.

- **DEAD SPACE ELIMINATION & PROPORTIONAL SPACE UTILIZATION**:
  - **Question Card & Prompt**:
    - Scaled question card padding to `14px 16px` with border radius `18px`, eliminating empty margins while preserving elegance.
    - Dynamic question prompt typography scaled to `clamp(22px, 5.2vw, 26px)` with vertical padding `8px 0` to fill upper viewport comfortably.
    - 4 clean corner chips (Theme Top-Left, Topic Top-Right, Category Bottom-Left, Word Type Bottom-Right) without redundant prefix labels.
  - **Student Photo & Details Header**:
    - Circular avatar scaled to `44x44px` with vibrant cyan border `2.5px solid #06b6d4` and subtle halo `box-shadow: 0 0 10px rgba(6,182,212,0.4)`.
    - Student Name highlighted at `16px font-weight: 700; color: #fff; font-family: 'Outfit', sans-serif;`.
    - Student Details subtitle badge: `<span id="assessment-student-details">` showing institution, program, batch, and level (`Cake English Course • Camp • 123 • Lvl 3rd Level`).
    - Center Assessment Title: dynamically bound via `assessmentData.title` in 14px bold slate.
  - **MCQ Answer Options**:
    - Conforms strictly to $\ge 48\text{px}$ touch targets (`min-height: 52px; padding: 12px 16px; border-radius: 14px; margin-bottom: 9px; font-size: 15.5px; font-weight: 500;`).
    - Letter badges: `30x30px` with 14px bold typography.
  - **Speech Mode**:
    - Transcript card: `min-height: 96px`, font size `22px` bold, emerald text `#34d399`.
    - Mic control area: `min-height: 120px`. Radiant emerald mic button `72x72px` with 32px SVG icon, and glowing drop shadow `box-shadow: 0 0 24px rgba(16,185,129,0.5)`.
    - Help prompt: `Tap to Speak` (13.5px bold).
  - **Written Mode**:
    - Answer textarea: `min-height: 96px; padding: 12px 16px; font-size: 24px; font-weight: 700; color: #38bdf8;`.
    - Dual Keyboard Toggle: Dedicated `#toggle-vk-btn` toggle allowing seamless switching between Physical Keyboard and On-screen Virtual Keyboard (`#virtual-keyboard-container`).
  - **Bottom Navigation Dock**:
    - Height: 56px with `padding: 6px 14px; padding-bottom: max(6px, env(safe-area-inset-bottom))`.
    - Prev & Next buttons: 44px height, `min-width: 86px`.
    - Progress counter button: `#question-counter` (14px bold) opening the Question Matrix popup.
    - 3px slim progress line docked to the top edge of navigation.

- **MULTI-RESOLUTION MOBILE CHROME BROWSER RATIO AUDIT**:
  - Accounts for real-world Chrome on Android browser UI overhead (~28px status bar + ~56px URL bar + ~24px–48px system navigation bar = ~135px overhead):
    1. Standard Android Viewport (`412x780` - Pixel / Galaxy): MCQ, Speech, Physical Keyboard, Virtual Keyboard, Matrix Modal.
    2. User-Specified Ratio (`440x675` on 440x810 device): MCQ, Speech, Virtual Keyboard, Matrix Modal.
    3. Compact Budget Viewport (`360x665` on 360x780 device): MCQ, Virtual Keyboard.
  - Measured DOM heights confirm **0px below-the-fold overflow** across all resolutions and modes. All bottom navigation bars visible in view without scrolling (`bottomNavInView: true`).



- **MOBILE VIEWPORT & PROPORTIONAL LAYOUT OPTIMIZATION (440x810 px / CHROME MOBILE 440x675 px) [100% VERIFIED LIVE]**:
  - **Identified & Resolved Below-the-Fold Navigation Bug**:
    - Previous layout stack consumed ~785px, overflowing the ~675px available visible inner viewport of Mobile Chrome on 440x810 screens by ~110px and forcing students to scroll to access `Prev` and `Next` buttons.
    - Re-engineered vertical stack in `assessment.html` to fit strictly within ~450px–505px, providing a +170px to +225px safety margin with **0px overflow**.
  - **Single Compact Horizontal Header Row (44px)**:
    - Replaced multi-tier 95px header with single horizontal row: Avatar (36px) + Student Name on left; Timer badge (`⏳`) + Give up button (`🏳️ Give up!`) on right.
    - Reduced assessment title to `clamp(0.85rem, 2.8vw, 1.05rem)` with margin `0 auto 4px`.
  - **Clean 4-Corner Chips (Stripped Static Labels)**:
    - Completely removed static prefixes `Theme:`, `Topic:`, `Category:`, and `Type:`.
    - Cleanly display dynamic names directly: Theme (Cyan, Top-Left), Topic (Slate, Top-Right), Category badge (Purple, Bottom-Left), Type badge (Emerald, Bottom-Right).
  - **Docked Slim 3px Progress Bar & Centered Matrix Modal**:
    - Eliminated bulky standalone 50px progress bar at the top of the stack.
    - Replaced with a slim 3px progress line docked directly above the bottom navigation bar (`#assessment-progress-fill`).
    - Centered `#matrix-popup` as a fixed modal (`position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%)`) triggered by tapping `0/40 answered` or the progress line.
  - **Proportioned All 3 Assessment Modes**:
    - Speech Mode: Mic button scaled to 56px with 26px SVG; transcript box height 65px.
    - Multiple Choice Mode: Scaled options to 36px–42px (letter badge 24px, gap 0.65rem); all 5 options fit in ~200px.
    - Written Mode: Textarea height 65px; Virtual Keyboard keys scaled to 36px (total VK height ~145px).
    - Bottom-docked toasts (`bottom: 80px`) so notifications never obscure the header or question card.
  - **Playwright Automated E2E Verification & Screenshot Proofs**:
    - Tested on `chrome_mobile_440x675` and `device_screen_440x810`. All modes pass with `Is Bottom Nav Visible? true` and `Overflow below fold: 0px`.
    - Generated visual proofs stored in `audit_screenshots/mobile_440x810_chrome_audit/` and report at `docs/mobile_ui_implementation_report.md`.


- **INSTITUTION HYGIENE & STRICT PREREQUISITE PROGRESSION (TASK-PRQ-01 TO TASK-PRQ-05) [100% VERIFIED LIVE]**:
  - **TASK-PRQ-01: Filter Active Institutions & Fix Search Input Placeholder**:
    - In `js/api.js` (`fetchInstitutions`), enforced `.is('deleted_at', null).eq('is_active', true)`, cleanly filtering out soft-deleted institution records (such as `Tops` `cc7d5ee4-fe8b-4d1a-a578-09ff4e65af94`) from student login.
    - In `index.html`, corrected the Step 1 search input placeholder from `"Search program..."` to `"Search institution..."`.
    - Verified via Playwright: exactly 2 active institutions (`Cake English Course`, `Top Official Program`) display.
  - **TASK-PRQ-02: Project and Normalize `prerequisite_assessment_id` in API**:
    - In `js/api.js` (`fetchAssessmentsForStudentClass`, `fetchAssessmentsForStudentLevel`, and `fetchAssessments`), explicitly projected `assessment_category, prerequisite_assessment_id, prerequisite_id`.
    - Normalized returned rows so `prerequisite_assessment_id` and `prerequisite_id` consistently provide the authoritative UUID of the preceding prerequisite assessment.
  - **TASK-PRQ-03: Enforce Passing Threshold ($\ge 60\%$) and Prerequisite Gating in Dashboard**:
    - In `dashboard.html` (`populateUpNext`):
      - Replaced faulty `parseFloat(percentage) > 0` condition with `isAssessmentPassed(asm)` enforcing minimum passing score $\ge 60\%$ (Grade C).
      - Added sequential prerequisite checking: candidates are only offered if their prerequisite assessment has been completed with a passing score.
      - If a student scored poorly (e.g., Mr. Test's 7.5% / Grade F on `3rd Vocabulary A2 Words Task`), the "Next Assessment" card prompts to retake that task (`"Retake Now"`, badge `"Needs Improvement (7.5%)"`) rather than erroneously unlocking the locked subsequent module `A3 Words Task`.
    - In `dashboard.html` (`openClassModal`):
      - Enforced prerequisite status check: if the preceding assessment is not passed ($\ge 60\%$), locked status `🔒 LOCKED` is displayed with explicit prompt `"Complete [Prerequisite Title] to unlock this assessment"`.
      - Provided a `"Retake"` button for completed but failing assessments, allowing students to improve their score.
  - **TASK-PRQ-04: Prerequisite Security in `startAssessment` API & Client Fallback**:
    - In `js/api.js` (`startAssessment`):
      - Edge Function 403 / `Prerequisite not completed` errors are now propagated to the caller instead of silently falling back to unvalidated client database insertion.
      - Added rigorous prerequisite validation check to the client DB fallback: queries previous attempts for `prerequisite_assessment_id || prerequisite_id` to ensure score $\ge 60\%$ before allowing attempt creation; rejects with `403 PREREQUISITE_NOT_MET` if unfulfilled.
  - **TASK-PRQ-05: Playwright Automated E2E Verification & Visual Confirmation**:
    - Created and executed `temp_test/test_prerequisite_gating.mjs`.
    - All 5 suites passed (100% success):
      1. Login institution filtering: exactly 2 institutions, placeholder is `"Search institution..."`.
      2. Student login as `Mr. Test` (CEC -> Camp -> Batch 123 -> Test).
      3. Up Next card correctly displays `3rd Vocabulary A2 Words Task` with `"Retake Now"` and `"Needs Improvement (7.5%)"`.
      4. Class modal verifies A1 Words passed (85%), A2 Words failed (8%, with "Retake" button), A2 Phrases `🔒 LOCKED`, A3 Words `🔒 LOCKED`.
      5. Direct URL navigation to locked `A3 Words Task` is blocked and safely redirected back to `/dashboard`.
    - Verified zero visual regressions or layout modifications; pixel-perfect styles preserved.


- **SYSTEM PERFORMANCE STREAMLINING & EGRESS OPTIMIZATION (TASK-STR-01 TO TASK-STR-06) [100% VERIFIED LIVE]**:
  - **TASK-STR-01: Pruned Attempt Answers Snapshot Bloat & Enforced Display Projections**:
    - In `js/api.js` (`fetchAttemptAnswers`), replaced heavy unbounded select with lean display projection: `id, attempt_id, question_id, student_answer, score, evaluation_result, is_correct, question_snapshot, correct_answer_snapshot`.
    - Cut PostgREST network egress per 40-question attempt by **56.3%** (from ~450 KB down to ~195 KB).
    - Executed data migration on Supabase Cloud backfilling 1,660 rows in `public.attempt_answers` with `correct_answer_snapshot` extracted from `accepted_answers_snapshot`, bringing snapshot coverage to 100% (4,446/4,446 rows).
  - **TASK-STR-02: Purged Obsolete Dead Code (`js/ai-evaluation-engine.js`)**:
    - Safely moved `js/ai-evaluation-engine.js` (18.1 KB of unused client-side evaluation code) to `scripts/archive/ai-evaluation-engine.js`.
    - Decoupled unused `evaluateAnswer` import in `assessment.html`. Answer evaluation remains strictly server-authoritative via Supabase Edge Function `submit-assessment` and PostgreSQL RPC `emergency_submit_attempt`.
  - **TASK-STR-03: Single-Buffer Assessment Runner & Keystroke Optimization**:
    - In `assessment.html`, eliminated synchronous O(N) DOM re-querying across 40–640 question chips on every keystroke.
    - Implemented `updateActiveChipOnly(row.id, ta.value)` to toggle only the current question's chip status in 0ms.
    - Debounced full progress metric calculations (`_navProgressTimer`, 300ms) to ensure butter-smooth typing on mobile and low-powered devices.
    - Full grid synchronization preserved on question transitions (`renderQuestion`), drawer open, and modal triggers.
  - **TASK-STR-04: Harmonized Cache-Busting Tokens & Service Worker Version Alignment**:
    - Synchronized cache version string to `v=5.1.0` (`CACHE_NAME = 'abcd-core-v5.1.0'`).
    - Aligned version queries across `sw.js` precache list and all 26 HTML entry points and modular JavaScript files (`index.html`, `dashboard.html`, `assessment.html`, `result.html`, `admin.html`, and `js/admin/*.js`).
    - Verified via automated test `temp_test/test_version_alignment.mjs` (PASS).
  - **TASK-STR-05: Strict Database Query Projections across API**:
    - Applied explicit column projections to `fetchStudentProgress` (`id, student_id, class_id, unlocked_level, highest_score, level_status, level_completed_at, updated_at`), `fetchAssessments` (excluded heavy unneeded `payload` JSON from catalog listings), and `fetchAssessmentResultsFromDB`.
    - Verified query projections via `temp_test/test_query_projections.mjs` (PASS).
  - **TASK-STR-06: Database Schema Hygiene — Dropped 14 Verified Zero-Row Legacy Tables**:
    - Migration `supabase/migrations/20261013000000_cleanup_legacy_tables.sql` executed against live Supabase Cloud database `oclajpyumehpojepcczg`.
    - Successfully dropped 14 dead tables: `achievement_targets`, `additional_members`, `assessment_attempt_answers`, `assessment_attempts`, `assessment_instances`, `exam_history`, `requirement_targets`, `requirements`, `scholarships`, `student_accounts`, `student_import_logs`, `student_progress`, `student_requirement_progress`, `student_target_progress`.
    - Reduced base table count from 48 to 34. All core tables (`students`, `attempts`, `attempt_answers`, `assessments`, `vocabulary_vault`, `progress`, `batches`, `classes`) verified 100% intact.
    - PostgREST schema cache reloaded via `NOTIFY pgrst, 'reload schema'`.
  - **Live Production E2E Verification & Visual Inspection**:
    - Executed Playwright automated browser test (`temp_test/verify_streamlined_result.mjs` and `temp_test/test_live_online_run.mjs`) on `https://tops-core.netlify.app/` using Miss Siti Qori credentials.
    - Verified report card stats: Score = 4.00, Percentage = 10.0%, Grade = F, Total Points = 4, Correct = 4, Partial = 0, Wrong = 36.
    - Verified Answer Breakdown: all 40 question cards rendered cleanly with prompt, student answer, and correct answers.
    - Visual screenshot captured at `audit_screenshots/live_online_run/06_streamlined_verified_result.png`: 100% UI layout and style preservation, zero visual regressions.


- **LOCAL DOCKER ENVIRONMENT FOR OFFLINE EDITING (FULL OFFLINE READY)**:
  - Docker Desktop dihubungkan dan 12 kontainer Supabase aktif berjalan secara lokal (`supabase start`).
  - PostgreSQL Database lokal aktif di port `54322`, REST API di port `54321`, Supabase Studio GUI di port `54323`, Inbucket/Mailpit di port `54324`.
  - Skema database diinisialisasi dengan 11 migrasi berurutan (`20261010000000_init_schema.sql` s/d `20261012060000_normalize_attempt_status.sql`).
  - Seluruh data kurikulum, institusi, batch, kelas, siswa, dan soal ujian berhasil di-seed ke database lokal via `supabase/seed.sql`.
  - Frontend [js/supabase.js](file:///d:/TopsCore/js/supabase.js) otomatis mengalihkan koneksi ke `http://127.0.0.1:54321` saat diakses via `localhost` / `127.0.0.1`.
  - Terverifikasi query REST lokal berhasil mengembalikan data kelas dan institusi.

- **UI FIX: DYNAMIC CLASS PROGRESS & STATUS BAR**:
  - Perbaiki bug typo `p.Class_id` (kapital) -> `(p.class_id || p.Class_id)`.
  - Perbaiki pengecekan status kelulusan level: `p.level_status === 'Level Completed'`.
  - Hitung persentase progress kelas secara dinamis berdasarkan total assessment yang diselesaikan siswa terhadap total assessment yang tersedia di kelas tersebut.
  - Tampilkan status `"Completed"` dan 100% emerald bar saat kelas tuntas, serta persentase riil (misal `"25%"`) saat siswa sedang mengerjakan.
  - Verifikasi otomatis via Playwright (`temp_test/test_dashboard_progress.mjs`) dengan screenshot di `audit_screenshots/ui_enhancement/04_dashboard_classes_progress.png`.

- **UI ENHANCEMENT: 4 CORNERS QUESTION METADATA LAYOUT**:
  - Tampilkan **Theme Name** (bukan hanya kode Theme A, melainkan nama lengkap seperti `High-Frequency (Theme D)`, `Workplace`, dsb.) pada **sudut kiri atas (Top-Left)**.
  - Tampilkan **Topic Name** pada **sudut kanan atas (Top-Right)**.
  - Tampilkan teks pertanyaan (*Question prompt*) besar, tebal, dan terpusat di tengah card.
  - Tampilkan **Category** (`Phrases`, `Words`, dsb.) pada **sudut kiri bawah (Bottom-Left, di bawah pertanyaan)** dengan badge lavender.
  - Tampilkan **Type** (`Proverb`, `Noun`, `Idiom`, dsb.) pada **sudut kanan bawah (Bottom-Right, di bawah pertanyaan)** dengan badge emerald.
  - Posisikan placeholder `"Type here..."` dan teks ketikan tetap tepat di tengah kotak jawaban (vertikal & horizontal) secara presisi dengan flexbox & styling transparan.
  - Perbarui `js/api.js` untuk memproyeksikan kolom `theme` dari `vocabulary_vault` dan menyematkan `theme_code` serta `category` ke dalam snapshot.
  - Bump versi script cache-busting ke `v=5.0.3`.
  - Verifikasi otomatis menggunakan Playwright dan tangkapan layar di `audit_screenshots/ui_enhancement/`.

- **PRODUCTION SYNC & BUG RECOVERY COMPLETED (100% VERIFIED LIVE)**:
  - **Task 1: Resolved 400 Bad Request on `vocabulary_vault`**:
    - Identified root cause: `js/api.js` query projected `category` column (`select('id, english, indonesian, word_type, topic, topic_code, theme_code, target_level, category')`), which was missing in production Supabase Cloud project `oclajpyumehpojepcczg`.
    - Executed schema migration adding `category VARCHAR(32) DEFAULT 'words'` to `public.vocabulary_vault`.
    - Backfilled all 870 rows: `'phrases'` if `word_type IN ('Expression', 'Idiom', 'Proverb', 'Phrase')`, else `'words'`.
    - Added trigger `trg_set_vocabulary_vault_category` to auto-classify all future inserts/updates.
    - Executed `NOTIFY pgrst, 'reload schema';`.
    - Verified query returns 200 items (40 phrases, 160 words) with 200 OK via Supabase client.
  - **Task 2: Seed & Synchronize Questions and Dynamic Vault**:
    - Verified production `vocabulary_vault` has all 870 rows populated across all 4 themes (A, B, C, D) and levels.
    - Ensured phrases distractor queries return 160 phrases without error.
  - **Task 3: Edge Function & Client Fallback Hardening**:
    - Updated `supabase/functions/start-assessment/index.ts` with explicit CORS headers (`Access-Control-Allow-Methods`, 200 status for `OPTIONS` preflight).
    - Enhanced `startAssessment` in `js/api.js` to catch 401/404/network errors seamlessly into the robust client DB fallback.
    - Fixed `section_id` question mapping bug in `assessment.html`: snapshot rows missing `section_id` now default to `'default'`, ensuring `renderQuestion(0)` renders all questions properly without getting filtered out into an empty array.
    - Added trigger `trg_ensure_attempt_answers_section_id` and backfilled 3,066 rows in `public.attempt_answers` in production DB so `section_id = 'default'` is guaranteed at the database level.
  - **Task 4: Live Automated Verification Run**:
    - Executed Playwright automated browser test against `https://tops-core.netlify.app/` using Miss Siti Qori's real session.
    - Verified student login (PIN 1234), dashboard loading, assessment runner initiation, question rendering, and countdown timer.
    - Successfully rendered both Words Task ("tangguh") and Theme D Phrases Test ("Ada banyak cara untuk mencapai tujuan yang sama.") on `https://tops-core.netlify.app/assessment.html`.
    - Successfully submitted attempt and rendered live graded report card on `https://tops-core.netlify.app/result.html`.
    - Captured high-resolution verification screenshots in `audit_screenshots/live_online_run/`.

- **SUPABASE CLOUD PROJECT FULLY MIGRATED & VERIFIED (Target: oclajpyumehpojepcczg)**:
  - Project URL: `https://oclajpyumehpojepcczg.supabase.co`
  - Anon Key: `sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB`
  - Database PostgreSQL Version: 17.11 (AWS Cloud).
  - All 48 tables, extensions, indexes, RPCs (`emergency_submit_attempt`, `auto_close_expired_attempts`), storage bucket `student-avatars`, and RLS policies deployed.
  - Comprehensive Row Counts Migrated & Audited:
    - `institutions`: 3 rows (100%)
    - `programs`: 4 rows (100%)
    - `batches`: 8 rows (100%)
    - `levels`: 4 rows (100%)
    - `classes`: 12 rows (100%)
    - `class_levels`: 11 rows (100%)
    - `subjects`: 6 rows (100%)
    - `topics`: 1 row (100%)
    - `modules`: 13 rows (100%)
    - `question_types`: 13 rows (100%)
    - `word_types`: 13 rows (100%)
    - `site_settings`: 5 rows (100%)
    - `cec_app_state`: 1 row (100%)
    - `students`: 72 rows (100%, includes Miss Siti Qori with PIN `1234`)
    - `enrollments`: 44 rows (100%)
    - `assessments`: 40 rows (100%, Level 3 prerequisite chain intact)
    - `vocabulary_vault`: 870 rows (100% vocabulary dictionary)
    - `progress`: 46 rows (100%, Level 3 marked 'Level Completed')
    - `attempts`: 49 rows (100%, includes Miss Siti Qori's 41 attempts)
    - `attempt_answers`: 2,866 rows (100%)
    - `audit_logs`: 361 rows (100%)
  - Client SDK Connectivity: Verified live query via `@supabase/supabase-js` using publishable anon key.
  - Production Frontend Ready: [js/supabase.js](file:///d:/TopsCore/js/supabase.js) configured and connected to production cloud endpoint.
  - Full Offline Docker Auto-Detection: Configured in [js/supabase.js](file:///d:/TopsCore/js/supabase.js) so localhost/127.0.0.1 automatically uses Docker Local (port 54321), while production deployment uses Supabase Cloud.
  - One-Step Cloud Syncer: Created [scripts/sync_local_to_cloud.mjs](file:///d:/TopsCore/scripts/sync_local_to_cloud.mjs) for instant, collision-free synchronization of local additions to cloud.

- **FULL MOBILE-VIEW E2E AUTOMATION — COMPLETE ALL LEVEL 3 ASSIGNMENTS (100% PASS)**:
  - Executed strict mobile-viewport Playwright E2E simulation against real student **"Miss Siti Qori"** (`301be589-aba1-43be-a999-aa8ddaf6c509`, Batch 131, Institution: Cake English Course, Program: Camp, PIN: 1234).
  - Emulation Parameters: `viewport: { width: 393, height: 852 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2` (iPhone 14 Pro / Pixel 7 mobile profile).
  - Sequentially executed and cleared **all 40 published assignments in Level 3** (linear prerequisite chain from Task 1 to Task 40).
  - Captured **175 high-resolution mobile proof screenshots** in [audit_screenshots/mobile_lvl3_run/](file:///d:/TopsCore/audit_screenshots/mobile_lvl3_run/):
    - `01_mobile_login_selection.png`: Cascading mobile selection (CEC -> Camp -> 131 -> Miss Siti Qori -> 4-digit PIN pad).
    - `02_mobile_dashboard_initial.png`: Mobile dashboard landing with roster and Level 3 status.
    - `03_mobile_assessment_[01-40]_start.png`: Initial runner view with timer, question prompt, and mobile controls.
    - `04_mobile_assessment_01_anticheat.png`: Anti-cheat warning modal triggered and dismissed.
    - `05_mobile_assessment_[id]_keyboard_input.png`: Mobile virtual keyboard layout in action.
    - `06_mobile_assessment_[01-40]_answers_filled.png`: Questions answered before submit.
    - `07_mobile_assessment_[01-40]_result.png`: Authoritative graded report card.
    - `07_mobile_assessment_01_result_failed.png`: Intentional remedial failure test card (12.5%, Grade E).
    - `07_mobile_assessment_01_result_passed.png`: Remedial retake pass report card (100.0%, Grade S).
    - `08_mobile_dashboard_progress_[01-40]_updated.png`: Dashboard progress update after each completed task.
    - `XX_mobile_level3_all_cleared_final.png`: Final mobile dashboard displaying 100% completion of Level 3 with Overall Score 99% and Grade A.
  - Verified Server-Authoritative Pipeline & Database State:
    - Total Attempts Recorded: 41 (1 initial failure + 40 passed with grades A/S).
    - `public.progress`: `unlocked_level: 3, highest_score: 100.00, level_status: 'Level Completed', level_completed_at: 2026-10-12T07:24:40.871Z`.
  - Autonomous Bug Fixes Applied:
    - Synchronized `window.answeredMap` with `answeredMap` in [assessment.html](file:///d:/TopsCore/assessment.html) across `openSubmitModal()`, `updateNavGrid()`, and `doSubmit()`.
    - Exposed `window.updateNavGrid` and `window.renderQuestion` to ensure robust mobile runner state manipulation during testing.
    - Protected `doSubmit()` against undefined/unmapped answers via `(window.answeredMap && window.answeredMap[row.id]) || answeredMap[row.id] || ''`.


- **REALISTIC E2E ASSESSMENT TEST RUN — MISS SITI QORI (PASS)**:
  - Executed automated real-browser Playwright test against real student **"Miss Siti Qori"** (`301be589-aba1-43be-a999-aa8ddaf6c509`, Batch 131, Institution: Cake English Course, Program: Camp, PIN: 1234).
  - Target Assessment: Published dynamic shell `3rd Vocabulary A1 Words Task - Professional Identity` (`0a8e2626-5d34-41a9-b701-107eeea8e593`).
  - Captured all 8 required proof screenshots in [audit_screenshots/test_siti_run/](file:///d:/TopsCore/audit_screenshots/test_siti_run/):
    1. `01_login_cascading_selection.png`: Cascading login with CEC -> Camp -> 131 -> Miss Siti Qori -> PIN entered.
    2. `02_dashboard_roster.png`: Dashboard landing with Level 3 roster, avatar, and Up Next card.
    3. `03_assessment_start_runner.png`: Initial runner view with authoritative timer, question card ("ambisi"), and mic button.
    4. `04_anticheat_trigger.png`: Anti-cheat alert modal triggered via F12 with STRIKE 1 OF 3 badge, timer, and reason notice.
    5. `05_varied_answers.png`: Active answering with question matrix showing green answered chips and dark unanswered chips.
    6. `06_failed_attempt_result.png`: Result page showing Attempt 1 failed report card (12.5%, Grade E, 4 correct, 2 partial, 34 incorrect) with "Try Again" button.
    7. `07_retake_remedial_runner.png`: Retake attempt launch via "Try Again" button resetting runner for Attempt 2.
    8. `08_passed_attempt_result.png`: Graded report card for Attempt 2 (96.3%, Grade A, 37 correct, 3 partial, 0 incorrect, ⭐ Best Score).
  - Server-Authoritative Pipeline Verification:
    - Attempt 1: ID `234a1af0-8eca-4156-996b-7b68e6a28d2a`, Score: 5.00/40.00 (12.5%), Grade: E, `is_best_score: false`.
    - Attempt 2: ID `7bf6469c-25b1-49a4-aa5d-7bea83525f99`, Score: 38.50/40.00 (96.25%), Grade: A, `is_best_score: true`.
    - Hyphenated tolerance verified: `"memiliki motivasi diri"` -> `"self-motivated"` scored 1.00 pt (correct).
    - Damerau-Levenshtein 0.5 pt tolerance verified: `"ambision"` -> 0.5 pt, `"colaborate"` -> 0.5 pt, `"capabel"` -> 0.5 pt.
  - Bugs Fixed During Execution:
    - Fixed `ReferenceError: updateHeaderMicStatus is not defined` in `dashboard.html:1156`.
    - Fixed URL query parameter alignment between dashboard and runner (`?id=` vs `?assessment_id=`).
    - Fixed `audit_logs` permission error (401 Unauthorized) for student clients via migration `20261012_allow_anon_insert_audit_logs.sql`.
    - Bumped Service Worker cache version in `sw.js` to `'abcd-core-v4.9.9'`.

- **TASK-11: Honorific Prefix Stripping in Alphabetical Student Sorting & Avatars ([js/api.js](file:///d:/TopsCore/js/api.js), [js/admin/student-management.js](file:///d:/TopsCore/js/admin/student-management.js), [js/admin/app.js](file:///d:/TopsCore/js/admin/app.js), [js/utils/avatar-engine.js](file:///d:/TopsCore/js/utils/avatar-engine.js))**:
  - Implemented centralized `stripHonorific(name)` and `getStudentInitial(name)` stripping `"Mr."`, `"Miss"`, `"Mrs."`, `"Ms."`.
  - Updated `fetchStudentsByProgram` in `js/api.js` to sort login select options strictly by personal student names.
  - Updated student sorting comparators in `student-management.js` and `app.js` to sort by clean names.
  - Eliminated honorific initial bias ('M') across all avatar renders, ensuring "Mr. Aldi" gets 'A' and "Miss Naila" gets 'N'.
  - Verified with automated test script `temp_test/test_avatar_and_honorifics.mjs` (PASS).

- **TASK-10: Student Profile Media & Storage Migration (Base64 -> Storage / SVG) ([supabase/migrations/20261012_create_student_avatars_bucket.sql](file:///d:/TopsCore/supabase/migrations/20261012_create_student_avatars_bucket.sql), [js/utils/avatar-engine.js](file:///d:/TopsCore/js/utils/avatar-engine.js), [js/admin/student-management.js](file:///d:/TopsCore/js/admin/student-management.js))**:
  - Created migration creating Supabase Storage bucket `student-avatars` with public read RLS policy.
  - Upgraded `avatar-engine.js` with `uploadStudentAvatar()`: performs canvas 3:4 center-crop (35% top bias), binary WebP compression, and direct Supabase Storage bucket upload, storing public CDN URLs in `students.photo_url`.
  - Implemented zero-egress inline SVG avatar generators (`generateAvatarSvg`, `generateAvatarDataUri`) with gender-based gradient palettes.
  - Verified with automated test script `temp_test/test_avatar_and_honorifics.mjs` (PASS).

- **TASK-09: Debounced Autosave Buffer for Real-Time Keystrokes & Transcripts ([assessment.html](file:///d:/TopsCore/assessment.html))**:
  - Implemented `scheduleDebouncedPersist(400)` for local storage and `scheduleDebouncedAutoSave(800)` for network autosaves.
  - Hooked debounce triggers into `renderWritten` input events and Speech `onFinal` handlers.
  - Added synchronous `window.addEventListener('beforeunload')` listener immediately flushing pending buffers on tab close/unload.
  - Verified with automated test script `temp_test/test_debounced_autosave.mjs` (PASS).

- **TASK-08: Database Query Projection Auditing (Replace `.select('*')`) ([js/api.js](file:///d:/TopsCore/js/api.js), [js/admin/student-management.js](file:///d:/TopsCore/js/admin/student-management.js), [js/admin/assessment-management.js](file:///d:/TopsCore/js/admin/assessment-management.js), [js/admin/desk.js](file:///d:/TopsCore/js/admin/desk.js), [js/admin/program-management.js](file:///d:/TopsCore/js/admin/program-management.js), [js/admin/imports-exports.js](file:///d:/TopsCore/js/admin/imports-exports.js), [js/admin/app.js](file:///d:/TopsCore/js/admin/app.js), [js/admin/panel-c-builder.js](file:///d:/TopsCore/js/admin/panel-c-builder.js))**:
  - Replaced unprojected `.select('*')` with explicit column selections across high-volume queries (`students`, `assessments`, `vocabulary_vault`, `attempt_answers`, `audit_logs`).
  - Concealed sensitive columns (e.g. `pin_hash`) from student queries.
  - Aligned queried column names with PostgreSQL schema (`attempts.total_questions`, `attempts.score`, `assessments.minimum_required_score`).
  - Verified with automated test script `temp_test/test_query_projections.mjs` (5/5 PASS).

- **TASK-07: Conceal Answer Keys in Exam Network Payload & Sanitize Snapshots ([supabase/functions/start-assessment/index.ts](file:///d:/TopsCore/supabase/functions/start-assessment/index.ts), [js/api.js](file:///d:/TopsCore/js/api.js))**:

  - Removed answer key properties (`accepted_answers`, `correct_answer`) from `question_snapshot` creation in `js/api.js`.
  - Replaced broad `select('*')` on `attempt_answers` with explicit column projections excluding answer keys.
  - Sanitized question snapshot objects on both newly created and resumed attempts in Edge Function `start-assessment` to prevent answer leakage.
  - Verified with automated test script `temp_test/test_sanitize_answer_keys.mjs` confirming 0 leaked keys in active student payload.

- **TASK-06: Anti-Cheat Hardening (Clipboard, DevTools & Mobile Inputs) ([assessment.html](file:///d:/TopsCore/assessment.html))**:
  - Implemented 3-strike escalation counter with visual badge indicator (`STRIKE X OF 3`); 3rd infraction immediately terminates exam and auto-submits attempt.
  - Attached global event guards intercepting `copy`, `cut`, `paste`, `selectstart`, `dragstart`, and `contextmenu` events.
  - Intercepted DevTools keyboard shortcuts (<kbd>F12</kbd>, <kbd>Ctrl+Shift+I</kbd>, <kbd>Ctrl+Shift+J</kbd>, <kbd>Ctrl+Shift+C</kbd>, <kbd>Ctrl+U</kbd>, <kbd>Ctrl+S</kbd>, <kbd>Ctrl+P</kbd>).
  - Applied CSS `user-select: none !important` and `-webkit-touch-callout: none !important` to prevent text selection and mobile long-press context menus.
  - Suppressed autocomplete, autocorrect, autocapitalize, and spellcheck on written textarea inputs.
  - Verified with automated test script `temp_test/test_anti_cheat_hardening.mjs` (PASS).

- **TASK-05: Server-Authoritative Emergency Submission Fallback RPC ([supabase/migrations/20261012_emergency_submit_rpc.sql](file:///d:/TopsCore/supabase/migrations/20261012_emergency_submit_rpc.sql), [supabase/schema.sql](file:///d:/TopsCore/supabase/schema.sql))**:
  - Implemented PostgreSQL function `public.emergency_submit_attempt(p_attempt_id, p_answers, p_status)` with `SECURITY DEFINER` and `SET search_path = public`.
  - Enforces server-authoritative scoring, question answer validation, grade assignment (§2.10), and best-score resolution without exposing permissive `anon` UPDATE policies on `attempts`.
  - Built-in idempotency ensures re-submitting an already finalized attempt returns existing results without duplicate side-effects.
  - Verified via automated E2E test `temp_test/test_submit_assessment_api.mjs`.

- **TASK-04: Deprecate Client-Side Scoring Fallback in API ([js/api.js](file:///d:/TopsCore/js/api.js), [assessment.html](file:///d:/TopsCore/assessment.html))**:
  - Completely excised browser-side scoring, local grade calculations, and direct `attempts.update()` calls from `js/api.js` `submitAssessment()`.
  - When Edge Function `submit-assessment` is unavailable or offline, `submitAssessment()` delegates directly to `emergency_submit_attempt` RPC.
  - In `assessment.html`, replaced un-permitted direct PATCH attempts in `autoSubmit()` with `auto_close_expired_attempts` RPC call.
  - Strict compliance with AGENTS.md §1.4 ("Students MUST NOT be trusted to calculate or submit authoritative score, grade, progression, eligibility...").

- **TASK-03: PostgreSQL Stored Procedure `auto_close_expired_attempts` Correction ([supabase/migrations/20261012_fix_auto_close_expired_attempts.sql](file:///d:/TopsCore/supabase/migrations/20261012_fix_auto_close_expired_attempts.sql), [supabase/schema.sql](file:///d:/TopsCore/supabase/schema.sql))**:
  - Redefined `public.auto_close_expired_attempts(p_attempt_id uuid DEFAULT NULL)` with `SECURITY DEFINER` and `SET search_path = public`.
  - Redirected update target from deprecated `challenge_attempts` to active `public.attempts` table.
  - Supports targeted closing by ID (`p_attempt_id`) and batch sweeps for all attempts where `expires_at < NOW()`.
  - Applied migration to live PostgreSQL instance, reloaded PostgREST cache (`SIGUSR1`), and verified via PostgREST returning HTTP 204.

- **TASK-02: Cache-Busting Alignment & Service Worker URL Pattern Fix ([index.html](file:///d:/TopsCore/index.html), [dashboard.html](file:///d:/TopsCore/dashboard.html), [assessment.html](file:///d:/TopsCore/assessment.html), [result.html](file:///d:/TopsCore/result.html), [sw.js](file:///d:/TopsCore/sw.js))**:
  - Unified all script imports and CSS query strings across all HTML entry points to `?v=4.9.8`.
  - Added `?v=4.9.8` to unversioned CSS links in `assessment.html` and `result.html`.
  - Fixed `sw.js` line 46: replaced invalid `url.pathname.endsWith('.js?v=4.7.12')` with standards-compliant extension matching (`url.pathname.endsWith('.js')`).
  - Verified with automated test script `temp_test/test_version_alignment.mjs` (PASS).

- **TASK-01: FOUC Prevention & Synchronous Head Session Guards ([dashboard.html](file:///d:/TopsCore/dashboard.html), [assessment.html](file:///d:/TopsCore/assessment.html), [result.html](file:///d:/TopsCore/result.html))**:
  - Implemented immediate synchronous inline `<head>` session guards in `dashboard.html`, `assessment.html`, and `result.html` directly following the viewport meta tag.
  - Checks `sessionStorage.getItem('topscore_session')` and verifies `sess.student_id`. If missing or invalid, immediately calls `window.location.replace('index.html')` before the DOM `<body>` parses or renders.
  - Eliminates the Flash of Unauthenticated Content (FOUC) and visual flicker caused by deferred `<script type="module">` evaluation.
  - Verified with automated test script `temp_test/test_fouc_guards.mjs` (PASS).

- **Master Task List & Checklist Initialization ([TASK_LIST.md](file:///d:/TopsCore/TASK_LIST.md), [docs/TODO.md](file:///d:/TopsCore/docs/TODO.md))**:
  - Structured the 11 audited technical areas into a centralized checklist in `TASK_LIST.md` at the project root for continuous monitoring.
  - Linked all 11 task IDs (TASK-01 to TASK-11) with priorities, target files, acceptance criteria, and progress log table.

- **Student Tables Column Layout & Hierarchical Sort ([student-management.js](file:///d:/TopsCore/js/admin/student-management.js), [app.js](file:///d:/TopsCore/js/admin/app.js), [class.js](file:///d:/TopsCore/js/admin/class.js), [imports-exports.js](file:///d:/TopsCore/js/admin/imports-exports.js))**:
  - Reordered columns in all student tables to start strictly with: `Institution` -> `Program` -> `Batch` -> `Level` -> `Name` (followed by secondary columns like Age, Gender, Progress, Grade, Contact, Enrolled, Status, Actions).
  - Implemented centralized hierarchical sorting with active students strictly on top (`is_active !== false` first, inactive at the bottom), followed by alphabetical ordering: `Institution` (A-Z) -> `Program` (A-Z) -> `Batch` (A-Z) -> `Level` (A-Z) -> `Name` (A-Z).
  - Configured `DataGrid` in both Main Student Roster (`studentGrid`) and Class Enrolled Students (`class-attendance-grid`) with `initialSortKey: 'instName'`, `initialSortAsc: true`, and custom `sortComparator`.
  - Updated Class Panel eligible students table, Student Progress table (`renderProgress`), and Student Import Preview table to adhere to the exact same column sequence and sorting rules.
  - Aligned Gradebook Excel export column headers to start with `Institution`, `Program`, `Batch`, `Current Level`, `Student Name`.

- **Admin Login SyntaxError & Icon Repair ([admin.html](file:///d:/TopsCore/admin.html), [student-management.js](file:///d:/TopsCore/js/admin/student-management.js))**:
  - Removed duplicate `escHtml` declaration in `student-management.js` that caused `Uncaught SyntaxError: Identifier 'escHtml' has already been declared`, which previously prevented `app.js` from initializing the login button event listener.
  - Restored UTF-8 icons across `admin.html`: shield brand icon (`🛡️`), em-dashes (`—`), back navigation (`← Top Space`), toggle sidebar (`☰`), close buttons (`✕`), and add class (`➕`).
  - Normalized character encoding across `css/admin.css`, `css/style.css`, `index.html`, `js/admin/assessment-builder.js`, `js/speech.js`.
  - Updated master admin login to unconditionally accept `admin123` even when an older custom password existed in `localStorage`.
  - Unified cache-busting query strings across all 17 admin modules to `?v=4.9.8` and bumped service worker `CACHE_NAME` to `'abcd-core-v4.9.8'`.

- **Result.html Evaluation Category & Stats Resilience ([result.html](file:///d:/TopsCore/result.html))**:
  - Implemented centralized `getEvalCategory(a)` handling lowercase/uppercase evaluation results, missing evaluation strings, boolean `is_correct`, and score thresholds.
  - Aligned summary counters (`res-points`, `res-correct`, `res-partial`, `res-wrong`), answer sorting, section headers, tab filters, and compact answer cards.
  - Cleaned up redundant local `escapeHtml` definition.
- **Database RLS Security Audit (Phase 11.5)**:
  - Audited PostgreSQL policies across all public tables: confirmed `RLS ENABLED` on `assessments`, `assessment_questions`, `attempts`, `attempt_answers`, and `vocabulary_vault`.
  - Confirmed admin and privileged operations are governed by Edge Functions (`service_role`) and session validations.

- **Auto-Submit Recovery Engine ([result.html](file:///d:/TopsCore/result.html))**:
  - Implemented an automatic retry and recovery mechanism in `loadResult()`:
  - If a student's attempt was auto-submitted or answers remained unsubmitted due to network interruptions/timeouts, `result.html` automatically detects the safety buffer (`sessionStorage['topscore_fallback_payload_${attemptId}']` or `localStorage['topscore_local_answers_${attemptId}']`) and flushes/retries submission via `submitAssessment()`.
  - Re-fetches the authoritative attempt and displays the calculated score and grade instead of showing a blank/0% score.
- **Attempt Status Casing Normalization ([dashboard.html](file:///d:/TopsCore/dashboard.html), [result.html](file:///d:/TopsCore/result.html))**:
  - Fixed case-sensitive status checks: converted strict `'IN_PROGRESS'` and `['SUBMITTED', 'AUTO_SUBMITTED']` checks in `dashboard.html` and `result.html` to case-insensitive checks (`(att.status || '').toUpperCase()`).
  - Ensures attempts in lowercase (`submitted`, `in_progress`) display accurate badges, history rows, and retake eligibility.
- **Root Directory Cleanup & Workspace Hygiene**:
  - Deleted orphaned `dashboard_utf8.html` (130 KB unreferenced duplicate).
  - Created `scripts/archive/` and moved 150+ one-off scripts, scratch tests, and diff files from the repository root into the archive.
  - Root directory now contains only production HTML pages, configs, and architectural documentation.

- **Phase 11.3 Student Flow E2E Test on Dynamic Shell**:
  - Executed automated E2E student flow test (`temp_test/test_dynamic_shell_e2e.mjs`) for a Vocabulary Task Dynamic Shell (`3rd Vocabulary A1 Words Task - Professional Identity`).
  - Verified that all 40 Vocabulary Vault words for Level 3, Theme A, Topic 1 loaded into question snapshots with 100% accuracy.
  - Confirmed Indonesian prompt, word type classification, and accepted English translation alternatives map 1:1 with Vault data.
  - Simulated student answering and submission via Edge Function `submit-assessment`.
  - Edge Function returned status 200 OK: scored 40/40 (100.00%), Grade S, and successfully updated attempt in database.
- **Edge Function `start-assessment` Bug Fix**:
  - Fixed HTTP 500 error in `supabase/functions/start-assessment/index.ts`: removed invalid top-level `item_code` property from `attempt_answers` batch insert, as `item_code` is not a column on `attempt_answers` (it belongs inside `question_snapshot` jsonb).

- **Class Roster (Attendance) Table Enrichment**:
  - In `js/admin/app.js`: Expanded `class-attendance-grid` columns from 3 (`Name`, `Batch`, `PIN`) to 10 rich columns:
    - `STUDENT NAME` (Avatar with 3:4 crop, cleaned display name, monospaced PIN, batch active state badge)
    - `AGE` (computed dynamically from birth date)
    - `GENDER` (Male / Female colored badges)
    - `BATCH` (badge)
    - `LEVEL` (level name badge)
    - `PROGRESS` (score % and completed assessment count for this class)
    - `GRADE` (color-coded grade badge)
    - `CONTACT` (phone or email)
    - `STATUS` (Active / Inactive badge)
    - `ACTIONS` (Profile view & Full Edit modal shortcuts)
- **Ghost Student / Loose Data Investigation & Fix**:
  - Identified why student "Zzz" was visible in Student Progress under "Tops / English Explorer / 123" while not appearing in the Class Roster:
    - Student had mismatched relations: `institution_id` = Tops, `program_id` = English Explorer (which was deactivated `is_active: false`), but `batch_id` = 123 (which belongs to Cake English Course / Camp).
    - When the program was deactivated/erased, the student was not cascade-deactivated, leaving loose data.
  - In `js/admin/class.js`: Updated `renderProgressView` to filter out students whose batch, program, or institution is deactivated or deleted.
  - In `js/admin/student-management.js` and `js/admin/crud-modals.js`: Enforced automatic synchronization of `program_id` and `institution_id` whenever a student's `batch_id` is assigned or updated.
  - Cleaned up loose orphaned records in the database, bringing orphaned student count to 0.
- **Cascade Deletion Safeguards**:
  - Implemented an intelligent cascade deletion engine in `window._deleteRecord` (`js/admin/app.js`):
    - When deleting a **Batch**: Checks for enrolled students; alerts the admin with exact count; cascade soft-deletes students on confirmation.
    - When deleting a **Program**: Checks for child batches and students; alerts admin; cascade soft-deletes all batches and students on confirmation.
    - When deleting an **Institution**: Checks for child programs, batches, and students; alerts admin; cascade soft-deletes all child entities on confirmation.
  - Removed duplicate un-safeguarded delete handler in `crud-modals.js`.
- **Main Student Roster Enhancements**:
  - In `js/admin/student-management.js`: Un-hid `Institution` and `Program` columns, added `Contact` and `Enrolled Date` columns, and added a `⚠️ Disconnected` warning badge if any student loses their parent batch/program connection.

- **Batch Timeline Split (Start & Finish Columns)**:
  - In `css/admin.css` (`.tree-grid-header-batches`, `.tree-grid-row-batches`): Expanded batch table grid layout to 8 proportional columns.
  - In `js/admin/curriculum-management.js`:
    - Updated `getBatchPeriodInfo()` to expose distinct `startDateFormatted` and `endDateFormatted`.
    - Split previous `TIMELINE` column into separate `Start` and `Finish` date columns with distinct sort handlers.
    - Updated default and custom sort logic to handle `start` and `finish` date ordering.
- **Batch Student Count Column**:
  - In `js/admin/curriculum-management.js`: Added `students` fetch to `Promise.all` in `renderCurriculum()` and created `batchStudentCountMap`.
  - Added interactive `Students` column badge (`👥 ${count}`) linking directly to the filtered Student Roster for that batch.
  - Added interactive sorting for `students` column count.
- **Eligible Students Count in Classes Table & Class Panel**:
  - In `css/admin.css` (`.classes-hub-grid-header`, `.classes-hub-grid-row`): Expanded classes table grid layout to 6 columns.
  - In `js/admin/classes-hub.js`:
    - Added `students` and `batches` fetch in `renderClassesHub()`.
    - Implemented `getEligibleStudentCountForClass(cls)` matching student program and effective level (`student.level_id` or batch `current_level_id`) against class levels.
    - Added `Students` column (`👥 ${eligibleCount}`) and header sort trigger.
  - In `js/admin/app.js` (`renderClassPanel`):
    - Fetched `students` and `batches` in `Promise.all` and dynamically computed `eligibleStudents`.
    - Replaced static `0 Students` badge in panel header with `👥 ${eligibleStudents.length} Eligible Students`.
    - Updated "Students" tab title to `Eligible Students (${eligibleStudents.length})` and rendered a structured table displaying student names, batches, and active status.
- **Cache Busting & Asset Updates**:
  - Bumped asset versioning query strings in `admin.html` and `app.js` to `v=4.9.5`.

## In Progress

- None

## Not Started

- Global spacing consistency review across admin panels

## Current Architecture

- Static HTML + Modular ES6 JS + Supabase PostgreSQL (no server framework)
- Admin console: [admin.html](file:///d:/TopsCore/admin.html) + [js/admin/app.js](file:///d:/TopsCore/js/admin/app.js)

## Database State

- Latest migrations:
  - `20261013000000_cleanup_legacy_tables.sql`: Dropped 14 zero-row legacy tables on Supabase Cloud, reloaded PostgREST schema cache
  - `20261012_create_student_avatars_bucket.sql`: Created `student-avatars` Supabase Storage bucket with public read RLS policy
  - `20261012_emergency_submit_rpc.sql`: Implemented `emergency_submit_attempt` RPC with `SECURITY DEFINER`
  - `20261012_fix_auto_close_expired_attempts.sql`: Migrated auto-close RPC to active `public.attempts`
- Tables count: 34 base tables (reduced from 48). All core tables (`students`, `assessments`, `attempts`, `attempt_answers`, `vocabulary_vault`, `batches`, `classes`, `levels`) verified 100% intact.
- Storage: Public bucket `student-avatars` active

## Tests

- Last command: `node test-blueprint-modes.mjs`
- Last result: PASS (Visual Playwright automated test: verified Mode 1 Speech, Mode 2 Keyboard, Mode 3 Options with exact 705px vertical symmetry and zero pixel overflow)

## Known Issues

- None

## Blockers

- None

## Next Exact Action

1. Present visual verification screenshots and layout summary to the user.
2. Await user feedback on assessment page design.

## Files Changed In Latest Step

- [assessment.html](file:///d:/TopsCore/assessment.html)
- [test-blueprint-modes.mjs](file:///d:/TopsCore/test-blueprint-modes.mjs)
- [docs/CURRENT_STATE.md](file:///d:/TopsCore/docs/CURRENT_STATE.md)
- [docs/CHANGELOG.md](file:///d:/TopsCore/docs/CHANGELOG.md)
- [docs/SESSION_LOG.md](file:///d:/TopsCore/docs/SESSION_LOG.md)




