# CURRENT STATE

Last Updated: 2026-11-06 06:21 UTC+8
Current Phase: Phase 346: Dual Top & Bottom Boundary Borders on Completed Exam Rows [COMPLETE]
Status: COMPLETE

## Completed Work:
1. **Dual Top & Bottom Boundary Lines for Exam Rows (`js/dashboard.js`)**:
   - Exam rows (`.completed-row.is-exam-row`) now receive both `border-top: 1.5px solid ${scoreColor}` and `border-bottom: 1.5px solid ${scoreColor}`, decisively framing each exam row from adjacent tasks and exams.
   - Preserves horizontal radiant background gradient (`linear-gradient(90deg, rgba(${scoreRgb}, 0.18) 0%, rgba(${scoreRgb}, 0.05) 75%, transparent 100%)`).
   - Title font and sequence number are Pure White (`#ffffff`), while Score, Grade circle, and Retry button retain their authentic earned tier colors.

2. **Next Test Deck Sharp Corner Elimination (`css/dashboard.css`)**:
   - Removed `.dashboard-next-test-deck` from the generic card border selector and explicitly styled `#up-next-section` as a transparent, borderless wrapper (`border: none !important; background: transparent !important; box-shadow: none !important;`).
   - Added `border-top-right-radius: 13px !important; border-bottom-right-radius: 13px !important;` to `.next-test-col-right` and matching top/bottom-left radii to `.next-test-col-left`.

3. **Star (★ / 100%) Pink Tier Color (`js/grading.js`, `css/style.css`)**:
   - Transformed Star tier (100% score) to Electric Pink (`#ff2d87`, RGB: `255, 45, 135`) with white star glyph (`#FFFFFF`) and radiant ambient glow `rgba(255, 45, 135, 0.5)`.
   - Distinct from Grade A (90%–99% Pure Green `#00c000ff`).

4. **White Table Headers (`css/dashboard.css`)**:
   - Table headers on both Ranking/Standings and Completed Tests are Pure White (`#ffffff`) with `font-weight: 800`.

5. **Completed Tests Exam A & Exam B Recovery (`js/dashboard.js`)**:
   - Ensured all exams that have been taken and submitted with valid scores (> 0%) appear in Completed Tests without being blocked by draft status of old curriculum tasks.

6. **Task 7-Attempt Average Scoring & Descending Chip Order (`js/dashboard.js`)**:
   - Mini grade chips under Task titles are sorted descending from highest to lowest.
   - Score and Grade columns for Tasks dynamically display the **average score** and derived grade of the student's top 7 attempts.

7. **Universal Cache Busting & Verification**:
   - Cache buster bumped to `v=20261106_v155` across all 8 files.
   - Service Worker cache updated to `topscore-cache-option-a-v83` and verified with `scripts/generate_sw_manifest.mjs`.
   - All 45 JS files passed syntax validation (`node scripts/check_all_js_syntax.cjs`).
   - Master blueprint regression test suite passed 100%.
   - Cache buster bumped to `v=20261106_v150` across all 8 files.
   - Service Worker cache updated to `topscore-cache-option-a-v78` and verified with `scripts/generate_sw_manifest.mjs`.
   - All 45 JS files passed syntax validation (`node scripts/check_all_js_syntax.cjs`).
   - Master blueprint regression test suite passed 100%.

2. **Metadata Card Horizontal Laser Dividers (`css/dashboard.css`)**:
   - Fixed flexbox height collapse: set `height: 2px !important; min-height: 2px !important; max-height: 2px !important; flex-shrink: 0 !important;` so the dividers are never collapsed by flexbox inside the 150px card.
   - Replaced transparent gradient with vibrant, full-width laser gradient: `linear-gradient(90deg, rgba(var(--tier-rgb, 234, 179, 8), 0.45) 0%, rgba(var(--tier-rgb, 234, 179, 8), 0.95) 15%, #ffffff 50%, rgba(var(--tier-rgb, 234, 179, 8), 0.95) 85%, rgba(var(--tier-rgb, 234, 179, 8), 0.45) 100%) !important;` with dual box-shadow glow.
   - Removed old conflicting duplicate rules from line 2260.

3. **Top Header Optimization (44px | Flex % | 44px) (`css/dashboard.css`)**:
   - Left wrapper: `width: 44px !important;` housing Door Icon (`#btn-change-class`).
   - Brand: `flex: 1 1 auto; font-size: clamp(0.95rem, 3.8vw, 1.15rem); font-weight: 800; white-space: nowrap; overflow: visible; text-align: center;`. Full Class Name (e.g. `2ND VOCABULARY`) receives full available space (~310px) and displays 100% in full without ellipsis truncation.
   - Right wrapper: `width: 44px !important;` housing Logout Icon (`#logout-btn`).

4. **Next Test 2-Line Structured Title ("Tema dan Topik di Baris Kedua") (`js/dashboard.js`, `css/dashboard.css`)**:
   - `formatNextTestTitleHtml`: Splits title at ` - `, ` – `, or `:` into Line 1 (test code/level) and Line 2 (theme/topic).
   - Card height: 70px (40px title wrap + 20px rainbow 1-7 + 70px full action column).

5. **Completed Tests Typography Parity (`css/dashboard.css`)**:
   - `.completed-col-num`: Bold, prominent font (`font-family: 'Outfit'; font-size: 0.85rem; font-weight: 800; color: #f8fafc; text-align: center;`).
   - `.completed-col-name`: Allows 2-line compact wrapping (`-webkit-line-clamp: 2; white-space: normal; line-height: 1.25;`), ensuring full test names are readable without truncation.

6. **System Verification & Cache Busting**:
   - Cache buster bumped to `v=20261106_v143` and Service Worker to `topscore-cache-option-a-v71`.
   - All automated test suites passing 100%.

2. **Universal Bottom Banner Overhaul across ALL Pages (`index.html`, `admin.html`, `dashboard.html`, `test.html`, `result.html`, and CSS)**:
   - Replaced old banner text (`TopsCore © 2026 | Created by Mr. Top`) with bold, enlarged branding: `<span class="banner-brand">TopsCore</span> <span class="banner-author">by Mr. Top</span>`.
   - **Enlarged and Emboldened ("Kita besarkan dan tebalkan")**:
     - `.banner-brand`: `font-size: clamp(1.05rem, 3vw, 1.25rem) !important; font-weight: 900 !important; color: #38bdf8 !important; text-shadow: 0 0 14px rgba(56, 189, 248, 0.45) !important;`
     - `.banner-author`: `font-size: clamp(1rem, 2.8vw, 1.15rem) !important; font-weight: 800 !important; color: #f8fafc !important;`
     - Banner container: `height: 60px !important; font-size: clamp(1rem, 2.8vw, 1.15rem) !important; font-weight: 800 !important; text-align: left !important; padding-left: clamp(16px, 4vw, 24px) !important;`
   - Automated regression test created: `scripts/test_bottom_banner_universal.mjs` verifying all 5 HTML files and 5 CSS files pass 100%.

3. **Master Blueprint Layout (60-150-50-70-FLEX-60) (`dashboard.html`, `css/dashboard.css`, `js/dashboard.js`)**:
   - **Header 60px**: Integrated Door Icon (`🚪`, `#btn-change-class`) to switch classes, `#dashboard-header-class-name` in center, and `#logout-btn` on right. Removed redundant header profile icon.
   - **Eliminated Classes Bar**: Saved 60px vertical space to maximize leaderboard real estate.
   - **Metadata Card 150px**: Breadcrumb (`CEC | CAMP | 134 | 2ND LEVEL`) on top, Score on left, Clickable 70px Avatar (`#banner-avatar-trigger`) in center with champion crown (`👑`), Grade on right, and Full Student Name with Title on bottom.
   - **Grade Description Card 50px**: Added support for `LET'S GO` (Purple Tier `#8B5CF6`) for new students without exams and `ALUMNI` (Grade `X`, Purple Tier `#8B5CF6`).
   - **Next Test Card 70px (50px + 20px)**:
     - Row 1: Next Test Full Name + 3-State Action Icon (Repetition numbers 1-7 for tasks, Yellow Padlock `🔒` when waiting for exam, Green Play `▶️` when exam is unlocked by tutor).
     - Row 2: 7 Rainbow Boxes (Red to Purple: `#EF4444`, `#F97316`, `#F59E0B`, `#EAB308`, `#84CC16`, `#06B6D4`, `#8B5CF6`). Displays vibrant lit state up to current pass count; emits full rainbow glow when at exam stage.
   - **Standings & Completed Tests Dual Panel (Dinamis Sisa Layar)**:
     - Tab 1: Leaderboard with Points-First hierarchy.
     - Tab 2: Completed Tests ordered strictly from latest accessible test down to earliest, with columns: `NO` | `TEST NAME` | `SCORE` | `GRADE` | `RETRY BUTTON ONLY` (launching test on click).
   - **TopsCore Banner 60px**: Fixed bottom footer locked at 60px, maintaining strict zero-scroll viewport on 800px devices.

4. **Authoritative Grading & Palette Extensions (`js/grading.js`)**:
   - Added `TOPSCORE_COLORS.X = '#8B5CF6'`, `TOPSCORE_COLORS.PURPLE = '#8B5CF6'`.
   - Added `GRADE_PALETTE.X` for Alumni.
   - Enhanced `getAchievementStatus` and `getGradeSymbol` for Grade `X`, `ALUMNI`, and `LET'S GO`.

5. **Automated Testing & Full Verification**:
   - Automated tests: `scripts/test_vocab_dashboard_blueprint.mjs` & `scripts/test_bottom_banner_universal.mjs`.
   - Busted cache to `v=20261106_v138`, service worker to `topscore-cache-option-a-v66`.
   - 45/45 JS syntax PASS (`check_all_js_syntax.cjs`).
   - 27/27 SW manifest assets PASS (`generate_sw_manifest.mjs`).
   - Exam Parity PASS (`test_student_dashboard_exam_parity.mjs`).
   - Homophones Spoken Mode 23/23 PASS (`test_homophones_spoken_mode.mjs`).
   - Prerequisite Deficit Guard PASS (`test_prerequisite_deficit_guard.mjs`).
   - Vocab Dashboard Blueprint PASS 100% (`test_vocab_dashboard_blueprint.mjs`).
   - Universal Bottom Banner PASS 100% (`test_bottom_banner_universal.mjs`).

## Completed Work:
1. **Root-Cause Analysis & Fix for "Tidak Bisa Lanjut Task" (Ayya & Batch 134)**:
   - Root Cause: Ayya (and other Batch 134 students) previously took downstream tasks (e.g. 2C3) before completing required 7 passes on upstream prerequisites (e.g. 2C2 at 6/7).
   - In `result.js`, `renderNextMilestone` was previously evaluating `currentPassCount < targetReps` in isolation on the current test (`curAsm`), commanding the student to "CONTINUE THE DRILL: 2C3 (3/7)".
   - When the student clicked this button, `test.html` called `startTest`, which checked prerequisites and returned `403 PREREQUISITE_NOT_MET (Prerequisite 2C2-WORDS-TASK must be passed first)`, creating a frustrating deadlock loop.
2. **Pedagogical Integrity (Option 1 - 7×7 Repetitive Mastery Enforced)**:
   - Preserved pedagogical rigor without artificial bypasses or lowering mastery standards.
   - Ayya and all students must genuinely earn 7 passes (>= 70%) on every prerequisite task.
3. **Prerequisite Deficit Guard Engine (`js/result.js`, `js/api.js`, `js/test.js`)**:
   - `js/result.js`: Evaluates `isPassedByTest` across all published curriculum tests. If `earliestUncompleted` has an index lower than `curIndex`, the button dynamically targets the earliest prerequisite with label `COMPLETE PREREQUISITE (${passes}/${targetReps}): ${testTitle} →`.
   - `js/api.js`: Enriches `PREREQUISITE_NOT_MET`, `TOPIC_MASTERY_NOT_MET`, and `PRIOR_THEME_EXAMS_REQUIRED` errors with `prereqTestId` and `prereqTitle`.
   - `js/test.js`: In the "Prerequisite Incomplete" modal, renders a direct green action button: `"Go to Prerequisite Task →"` pointing to `e.prereqTestId`, giving the student an immediate one-click path to resolve the deficit.
4. **Comprehensive Cross-Student Database Audit (Batch 134 & Beyond)**:
   - Audited all students in Batch 134:
     - Mr. Ayya: 2C1 (9/7), 2C2 (6/7), 2C3 (3/7) -> guided to 2C2.
     - Lalu Yuda: 2C1 (7/7), 2C2 (6/7), 2C3 (1/7) -> guided to 2C2.
     - Adinda: 2C1 (6/7), 2C2 (1/7), 2C3 (2/7), 2C4 (0/7) -> guided to 2C1.
     - Alfina: 2C1 (7/7), 2C2 (5/7), 2C3 (1/7), 2C4 (0/7) -> guided to 2C2.
     - Abdul Basit: 2C1 (6/7), 2C2 (1/7) -> guided to 2C1.
     - Wildian: 2C1 (7/7), 2C2 (2/7), 2C3 (0/7) -> guided to 2C2.
   - All 7 affected students are automatically routed to their prerequisite deficit with 0 errors.
5. **System Verification & Cache Busting**:
   - Automated regression test suite created: `scripts/test_prerequisite_deficit_guard.mjs`.
   - Cache bust to `v=20261105_v135`, service worker cache to `topscore-cache-option-a-v63`.
   - 45/45 JS syntax PASS.
   - 27/27 SW manifest assets PASS.
   - Exam Parity PASS.
   - Homophones Spoken Mode 23/23 PASS.
   - Prerequisite Deficit Guard 100% PASS.

## Completed Work:
1. **Test Page Precision Blueprint Overhaul (`test.html`, `css/test.css`, `js/test.js`)**:
1. **Catatan Wajib Zero-Empty-Space Layout Engine**:
   - Enforced on both `test.html` and `result.html`:
     - All empty space is absorbed by the dynamic body container (`flex: 1 1 0; min-height: 0;`).
     - Every vertical gap between panels is strictly locked at **10px**.
     - Absolutely no dead, blank, or uncontrolled black gaps.
2. **Test Page Updated Blueprint (`test.html`, `css/test.css`)**:
   - Header 50px (2 lines: Title + Topic).
   - Controls 50px (Red Give Up `🏳️`, 38px Avatar with tier ring, Dynamic Timer).
   - Dynamic body 520px (fills 100% of remaining space with zero empty space).
   - Bottom Nav: PREV/NEXT 40px + gap 10px + 0/100 Counter 30px (gap 10px above 60px banner).
   - Banner 60px (Left-aligned). Zero overflow (`hasOverflow: false`).
3. **Result Page Updated Blueprint (`result.html`, `css/result.css`, `js/result.js`)**:
   - Header 50px, Student Metadata 150px, Test Full Title 60px (2 lines).
   - Metrics Table dynamic ~138px (zero empty space).
   - Dual Score & Grade row 40px (Score % left, Grade right).
   - Grade Description card 50px (`#result-motivation-msg`, reveals after Grade impact animation).
   - Action row 60px (`.btn-next-milestone` and tutor segments visibly taller than 50px buttons below!).
   - View Breakdown 50px, Back to Lobby/Room 50px, Banner 60px.
   - Zero overflow (`hasOverflow: false`) on both Student's View and Tutor's View.
4. **Global 60px Banner Locked & Left-Aligned**:
   - Locked at 60px height across `index.html`, `admin.html`, `dashboard.html`, `test.html`, `result.html`.
   - Text left-aligned (`justify-content: flex-start !important; text-align: left !important; padding-left: 20px !important;`).
5. **Dynamic Tier Glow & Accent Lines**:
   - Result page: all cards, borders, divider lines, and radial auras ignite with active grade color.
   - Lobby (Dashboard): hero card, legend, next milestone, class deck, and active standing row ignite with active tier color.
6. **Full System Verification**:
   - Syntax validation: 45/45 JS files PASS.
   - SW Cache Manifest: 27/27 assets PASS.
   - Exam Parity: 100% PASS.
   - Homophones Spoken Mode: 23/23 PASS.
   - Puppeteer zero-overflow verification: PASS on both pages.
   - Cache bumped to `v=20261105_v132`, SW cache `topscore-cache-option-a-v60`.

2. **Test Page Precision Blueprint Overhaul (`test.html`, `css/test.css`, `js/test.js`)**:
   - Implemented exact pixel dimensions and layout hierarchy per user blueprint:
     - Top Header: Exact 50px height, 2 lines (Line 1 = Test Title, Line 2 = Topic/Tema in uppercase), 10px gap below.
     - Controls & Student Bar: Exact 50px height, Left = Give up button (`🏳️ Give up!`, red background), Center = Student avatar (38px with tier aura), Right = Dynamic countdown timer transitioning from Green (>50% time left) to Yellow (20%–50%) to Red with pulse (<20%), 10px gap below.
     - Dynamic Content Area: Spoken/Written has Question prompt (40%), 2x2 Metadata grid (20% - Category, Type, Tema, Topic), Answer preview (40%), fixed 186px Input Panel (Mic / Virtual Keyboard). Selection mode: Question (40%), Metadata (20%), Selections panel absorbing input panel (40% + 186px / `flex: 1`).
     - Bottom Navigation: Row 1 = `PREV` | `NEXT` (40px height), 10px gap, Row 2 = `0/100` Counter (40px height, full-width, tappable matrix trigger).
     - Fixed Lower Banner: Exact 60px height locked base footer.
     - Zero-scroll viewport verified on 400x800 standard mobile (`hasOverflow: false`).

2. **Result Page Precision Blueprint Overhaul (`result.html`, `css/result.css`, `js/result.js`)**:
   - Implemented exact pixel dimensions and layout hierarchy per user blueprint for both Student and Tutor views:
     - Top Header: Exact 50px height, 10px gap below.
     - Student Metadata Card: Exact 150px height matching Student Dashboard (Institution | Program | Batch | Level, 74px avatar with crown & tier aura, student name), 10px gap below.
     - Test Full Title Card: Exact 60px height, 2 lines (Line 1 = Test Title, Line 2 = Topic / Theme), 10px gap below.
     - Metrics Table: Dynamic height (`flex: 1 1 0` filling remaining screen space) with 4 rows: `CORRECT`, `PARTIAL`, `INCORRECT`, `POINTS`, 10px gap below.
     - Score & Grade Composite Row: Exact 60px height with 3 symmetrical columns (Score % 28%, Motivation / Predicate & Legend hint box 44%, Grade symbol 28%), 10px gap below.
     - Action Row: Exact 60px height (Student view: `NEXT TEST FULL TITLE ➔`; Tutor view: 3 segmented buttons `NORMAL` #059669, `REMIDI` #eab308, `FORGIVE` #dc2626), 10px gap below.
     - View Answer Breakdown Button: Exact 50px height, 10px gap below.
     - Navigation Button: Exact 50px height (`BACK TO LOBBY` for students, `BACK TO ROOM` for tutors), 10px gap below.
     - TopsCore Banner: Exact 60px height locked base footer.
     - Zero-scroll viewport verified on both Student & Tutor views (`hasOverflow: false`, `windowHeight: 800`, `scrollHeight: 800`).

3. **Full System Verification**:
   - `node scripts/check_all_js_syntax.cjs`: 45/45 JS files passed syntax validation.
   - `node scripts/generate_sw_manifest.mjs`: All 27 cache manifest assets verified.
   - `node scripts/test_student_dashboard_exam_parity.mjs`: 100% PASS.
   - `node scripts/test_homophones_spoken_mode.mjs`: 23/23 PASS.
   - `node scripts/verify_test_full_spec.mjs`: 100% PASS.
   - `node scripts/verify_result_full_spec.mjs`: 100% PASS.

2. **Permanent Deno Resolution & PATH Bridge for Antigravity IDE**:
   - Identified root cause of popup notification `"Could not resolve Deno executable..."`:
     1. Having `"deno.path"` in `.vscode/settings.json` (Workspace scope) marked the binary as an untrusted custom workspace binary, prompting a VS Code security approval modal. If unapproved or dismissed, it fell back to searching `process.env.PATH`.
     2. Because Antigravity IDE was launched before Deno was installed, its inherited process environment did not yet include `C:\Users\Top\.deno\bin`.
   - Solution deployed:
     - Populated `C:\Users\Top\AppData\Roaming\npm\deno.exe` (a path already present in Antigravity IDE's inherited launch PATH).
     - Removed `"deno.path"` from `.vscode/settings.json`, eliminating the workspace-level untrusted binary security prompt.
     - Kept `"deno.path": "C:\\Users\\Top\\.deno\\bin\\deno.exe"` in Global User Settings (`C:\Users\Top\AppData\Roaming\Antigravity IDE\User\settings.json`) where it is globally trusted.
     - Deno language server and CLI now resolve instantaneously on any shell or IDE context (`Get-Command deno` -> `C:\Users\Top\AppData\Roaming\npm\deno.exe`).
     - Verified `deno check` runs cleanly on Edge Functions. Full `npm test` passes 100% (23/23).

2. **Start-Test Preflight CORS Error Elimination (`js/supabase.js`)**:
   - Enhanced Edge Function circuit breaker with `sessionStorage` persistence (`topscore_offline_edge_functions`).
   - Pre-registered undeployed cloud functions (`start-test`, `submit-test`, `student-login`, `evaluate-test`, `generate-narrative`) so client DB fallback executes immediately without making unresolvable preflight HTTP calls that log CORS failures in the browser console.

3. **Test Page Bottom Navigation & 20px Lower Banner Distance (`css/test.css`)**:
   - Removed destructive `margin: 0 auto 50px auto` from `body.test-page .test-body`, allowing `.test-body` to flex naturally (`flex: 1; min-height: 0;`).
   - Set `.test-fixed-bottom`: `margin: 0 auto 70px auto !important;` (50px fixed footer + 20px requested gap).
   - Verified in headless browser (400x800 viewport): `gapBetweenAreaAndBanner: 20px`, `prevVisible: true`, `counterVisible: true`, `nextVisible: true`.
   - Bumped cache busters across all HTML and JS files to `v=20261105_v130`; bumped Service Worker cache name to `topscore-cache-option-a-v58`.
   - Full test suite verified: `npm test` PASS 100% across all 4 suites (Syntax, SW Manifest, Dashboard Parity, Acoustic Homophones).

2. **Phase 319: Execution & Verification of Consolidated Master Plan for 7x7 Repetition Gating & Acoustic Homophones Engine [COMPLETE]:**
   - **Plan Archival & Status Finalization**:
     - All 6 plan artifacts in artifact repository marked as `[IMPLEMENTED] (SUDAH) — CLOSED / ARCHIVED` with `UserFacing: false`.
     - `docs/Vocab_7x7_Level_Progression_Master_Plan.md` marked as `✅ 100% IMPLEMENTED & ARCHIVED (SELESAI)`.
     - `docs/TODO.md` verified with 0 pending tasks remaining.
     - Entire planning pipeline completely closed and clean.
   - **7x7 Repetitive Mastery & Prerequisite Gating Harmonization**:
     - Standardized `task_repetitions = 7` across database `tests.payload`, `site_settings`, Result Page, Student Dashboard, and `startTest` backend validators.
     - Updated prerequisite pass checks to respect dynamic `minimum_required_score` (50% for C1/C2 tasks) rather than a rigid 70%.
     - In `js/result.js`: vocabulary classes strictly evaluate `targetReps = 7`. The next milestone button renders `"CONTINUE THE DRILL (X/7): [TEST] →"` with grade-colored border until pass 7 is achieved.
     - Verified Ayya Sofyandi Mzeth has 7/7 passes on 2C1 and is 100% eligible for 2C2 without 403 error.
     - Verified Adinda Karunia Farela has 6/7 passes on 2C1 and is directed to complete drill 7/7 before 2C2 unlocks.
   - **Acoustic Homophone Tolerance Engine (`js/grading.js`, `js/api.js`)**:
     - Bidirectional `HOMOPHONE_MAP` and `isAcousticHomophoneMatch` deployed in `js/grading.js`.
     - In `mode === 'spoken'` (STT), homophones (`buy/bye`, `wrap/rap`, `sea/see`, `meat/meet`, `hour/our`) receive **1.0 pt** (`correct`, `is_homophone: true`).
     - In `mode === 'written'`, homophones are strictly rejected (spelling test maintained).
     - Letter spelling with spaces (`"b u y"`, `"b-u-y"`) and hyphenated terms (`"high-quality"`, `"high quality"`) normalized and awarded 1.0 pt.
   - **Cache & Deployment Verification**:
     - Bumped cache busters across all HTML and JS files to `v=20261105_v129`.
     - Service worker cache updated to `topscore-cache-option-a-v57`.
     - Full test suite verified: `npm test` PASS 100% (45/45 syntax, 27 SW assets, Exam Parity, 23/23 Acoustic Homophones).

2. **Phase 318: 7x7 Repetitive Mastery Harmonization, Ayya & Adinda Gating Resolution, Acoustic Homophone Engine & Result Page Fullscreen Integration [COMPLETE]:**
   - **Ayya Sofyandi & Adinda Karunia Progression Deadlock Resolved (`js/api.js`, `supabase/functions/start-test/index.ts`, `scripts/harmonize_task_repetitions_to_7.mjs`)**:
     - Identified root cause: `2nd Vocabulary` tests previously held `"task_repetitions": 6` in `tests.payload`.
     - When Ayya and Adinda achieved pass #6 on `2C1-WORDS-TASK`, the result page evaluated `6 < 6` as FALSE, concluded the drill was finished, and displayed `"ADVANCE TO NEXT TASK: C2"`. But backend `startTest` strictly enforced 7 passes (`passCount >= 7`). Clicking C2 blocked them with `403 PREREQUISITE_NOT_MET`.
     - Harmonized all 59 tests in database to `payload.task_repetitions = 7` via `scripts/harmonize_task_repetitions_to_7.mjs`.
     - Updated prerequisite minimum passing score checks in both client validator (`js/api.js:1476-1518`) and Edge Function (`supabase/functions/start-test/index.ts:425-485`) to dynamically query `prereqTest.minimum_required_score` (e.g. 50% for C1/C2) instead of hardcoded 70%.
     - Result page now reliably displays `"CONTINUE THE DRILL (6/7): [TEST TITLE] →"` until pass 7 is completed, whereupon C2 advances and starts seamlessly without 403 error.
   - **Acoustic Homophone Tolerance Engine (`js/grading.js`, `supabase/functions/submit-test/index.ts`, `scripts/test_homophones_spoken_mode.mjs`)**:
     - Built curated bidirectional `HOMOPHONE_MAP` covering 94+ common English homophone pairs (e.g. `buy` <-> `bye`/`by`, `wrap` <-> `rap`, `sea` <-> `see`, `hear` <-> `here`, `wait` <-> `weight`, `peace` <-> `piece`, `flower` <-> `flour`, `hole` <-> `whole`, `brake` <-> `break`).
     - Added `isAcousticHomophoneMatch()` in `js/grading.js` and `supabase/functions/submit-test/index.ts`: active strictly in **Spoken / Speech-to-Text modes** (`mode === 'spoken'`). Awards **1.0 pt (correct)** with `is_homophone: true`.
     - Written mode (typing) strictly rejects homophones (e.g. typing `"bye"` for `"buy"` receives 0.0 pts `incorrect`, typing `"weight"` for `"wait"` receives 0.0 pts `incorrect`).
     - Automated test suite `scripts/test_homophones_spoken_mode.mjs` verified 23/23 tests pass with 100% accuracy.
   - **Seamless Fullscreen Result Page (`result.html`, `js/result.js`, `css/result.css`, `js/test.js`)**:
     - Preserved fullscreen mode upon test submission by bypassing `document.exitFullscreen()` in `js/test.js:doSubmit()`.
     - Added glass toggle button (`#result-fullscreen-btn`, `⛶` / `🗗`) to `result.html` top header with smooth animations in `css/result.css`.
     - In `js/result.js`: added `requestFullscreenMode()`, `exitFullscreenMode()`, `toggleFullscreenMode()`, auto-fullscreen on first user interaction, and clean exit when returning to the lobby (`#back-dashboard-btn`).
   - **Plan Consolidation & Status Updates**:
     - Audited all open plan artifacts: consolidated uncompleted work into `unified_7x7_repetition_homophones_and_fullscreen_plan.md`.
     - Updated all artifacts to `[IMPLEMENTED]` with execution notes.
   - **CI & Test Automation**:
     - Integrated `test_homophones_spoken_mode.mjs` directly into `package.json` test runner.
     - Bumped cache busters across all HTML and JS files to `v=20261105_v127`; verified `sw.js` cache manifest (27 assets).
     - Ran full test suite: `npm test` PASS 100% across all 4 suites (Syntax, SW Manifest, Dashboard Parity, Acoustic Homophones).

2. **Phase 317: Points-First Leaderboard Ranking, Effective Score Sanitization, Fullscreen Result Page & Repetition Gating Mapping [COMPLETE]:**
   - **Points-First Standings Ranking Hierarchy (`js/dashboard.js`, `scripts/test_student_dashboard_exam_parity.mjs`)**:
     - Updated standings leaderboard sort hierarchy in `renderBatchLeaderboard()`:
       1. Primary: `ptsB - ptsA` (Total exam points DESC).
       2. Secondary: `scoreB - scoreA` (Overall exam score percentage DESC).
       3. Tertiary: `progB - progA` (Curriculum progress percentage DESC).
       4. Quaternary: `lastSubmittedAt` ASC (Earliest milestone completion).
       5. Quinquenary: `cleanName.localeCompare` (Alphabetical fallback).
     - Higher points now strictly rank higher (e.g. Lalu Yuda 353 PTS ranks #6 above Adinda 243 PTS at #16).
   - **Elimination of Score > 100% & Universal False Star (`★`) Inflation (`js/api.js`, `js/result.js`, `js/dashboard.js`)**:
     - In `js/api.js:4075,4098` inside `batchSaveManualScores`: fixed critical bug that wrote raw points (`sc`) into `effective_score` instead of percentage (`pct`).
     - In `js/result.js`: safely bounded `pct` and fallback to `rawPct` whenever `effective_score > 100.0`. Laura Fardila's result now renders Points `143`, Score `51.1%`, Grade `D`, Predicate `LESS` (Dark Orange `#FF8C00`), completely eliminating `143%` and false `★`.
     - In `js/dashboard.js`: clamped `effPct` and `overallScore` to `[0, 100]`. Authentic grades (A, B, C, D, E) restored to the leaderboard roster.
   - **Database Sanitization (`scripts/sanitize_attempts_effective_score.mjs`)**:
     - Audited all 1,484 attempts across Supabase PostgreSQL.
     - Idempotently sanitized all 241 corrupted attempt rows where `effective_score` held raw point counts. Verified remaining attempts with `effective_score > 100`: **0**.
   - **Seamless Fullscreen Result Page (`result.html`, `js/result.js`, `css/result.css`, `js/test.js`)**:
     - In `js/test.js:2729`: removed explicit `document.exitFullscreen()` on test submission, allowing the browser to smoothly maintain fullscreen across same-origin navigation into `result.html`.
     - In `result.html` & `css/result.css`: added sleek glass fullscreen toggle button (`#result-fullscreen-btn`, `⛶` / `🗗`) to top header.
     - In `js/result.js`: added `requestFullscreenMode()`, `exitFullscreenMode()`, `isFullscreenActive()`, `toggleFullscreenMode()`, auto-fullscreen on first user interaction, and graceful exit when returning to the lobby (`#back-dashboard-btn`).
     - Continuing or advancing from Result Page directly launches `test.html` in fullscreen with zero modal interruption.
   - **Comprehensive Repetition Gating & Homophone Tolerance Plan (`repetition_gating_and_homophones_plan.md`)**:
     - Diagnosed Ayya and Adinda's exact attempts: both reached 6 qualified passes on `2C1-WORDS-TASK`. The result page loaded `task_repetitions = 6` from outdated `tests.payload`, told them to advance, and the backend rejected them because it enforced 7 passes.
     - Formulated unified implementation plan combining 7x7 repetition alignment, dynamic threshold linking, and the acoustic homophone tolerance engine for spoken tests.
   - **Cache Buster & Validation**:
     - Bumped cache busters to `v=20261105_v128` across HTML, CSS, and JS files; bumped Service Worker cache name to `topscore-cache-option-a-v56`.
     - Verified 45/45 JS syntax checks PASS; `npm test` PASS 100%.
   - **Hyphen & Punctuation Tolerance ("high quality" vs "High-Quality") (`js/grading.js`, `js/api.js`, `supabase/migrations/`)**:
     - Strips unicode and ASCII hyphens/dashes (`-`, `–`, `—`, `\u2010-\u2015\u2212\uFE63\uFF0D`), converting them to spaces and normalizing.
     - Direct normalized and compact matching awards 1.0 pt (correct) when student answer differs only by punctuation or hyphenation.
     - Added Post-Submit Answer Tolerance & Spelling Sync in `submitTest` (`js/api.js`) to guarantee student answers are never penalized by older server RPC logic.
     - Migration `20261105080000_upgrade_answer_tolerance_and_spelling.sql` created and ready.
   - **Letter-by-Letter Spelling Mode Support ("b u y" &rarr; "buy") (`js/grading.js`, `js/api.js`)**:
     - Compares `compactStudent === compactOpt` via `stripAllPunctuationAndSpaces`.
     - Words spelled letter-by-letter with spaces (mic/typing producing `"b u y"` or `"b. u. y."`, `"w r a p"`, `"m y t h"`) are collapsed to match the target word and scored 1.0 pt (correct).
     - Homophones excluded per user directive.
   - **Result Page 7x Repetition Drill Loop & Dynamic Grade Color CTA (`js/result.js`)**:
     - Evaluates student passes on the current drill using `fetchClassTestSettings`.
     - Retains current drill as next test until 7/7 passes reached.
     - Formats button text according to authoritative specification:
       - Passed attempt (< 7 total passes): `CONTINUE THE DRILL (X/7): [TITLE] →`
       - Failed attempt (< 7 total passes): `RETRY THE DRILL (X/7): [TITLE] →`
       - Completed 7/7 passes: `ADVANCE TO NEXT TASK: [C2 WORDS / PHRASES] →`
     - Dynamically applies the earned grade color (`--tier-color` from `getGradeColorByScore`) to the CTA button border, text, and glow shadow.
     - Direct restart: navigates directly to `test.html?id=${curAsm.id}` without returning to the lobby.
   - **Service Worker Syntax Fix & Instant Cache Activation (`sw.js`)**:
     - Removed duplicate `const url` on line 65 of `sw.js` that threw `SyntaxError` and trapped browsers on `v124`.
     - Added `self.skipWaiting()` and `self.clients.claim()` for instant service worker activation.
     - Added origin check bypass for third-party assets (Google Fonts) to prevent CSP/fetch errors.
     - Added `sw.js` to `scripts/check_all_js_syntax.cjs`.
   - **Vocabulary Vault Edit Button Crash Fix (`js/admin/vocab-vault.js`)**:
     - Fixed `TypeError: Cannot set properties of null (setting 'innerHTML')` by adding `.cell-code.cell-topic-code` to table row rendering.
     - Added robust null guards across all cell selectors in edit mode and optional chaining in save mode.
   - **Mojibake Cleanup & Direct English Localization (`dashboard.html`)**:
     - Cleaned corrupted `â† â€™` arrows on lines 487 and 542 into `&rarr;`.
     - Localized line 270 and line 306 into Direct English per AGENTS.md Rule 2.12.
     - Cleaned corrupted emoji characters across modals and buttons.
   - **Historical Rescoring Execution (`scripts/apply_hyphen_and_spelling_rescore.mjs`)**:
     - Executed targeted historical rescore: successfully upgraded 80 student answers where hyphens/punctuation/spelling spacing resulted in 0 points.
     - Recalculated 40 student attempt records with updated points, percentages, and official grades.
   - **Plan Artifact Marked as [IMPLEMENTED]**:
     - Updated `answer_tolerance_homophones_and_vault_fix_plan.md` artifact header to `Status: [IMPLEMENTED]`.
   - **Verification**:
     - Answer Tolerance & Spelling Test: 5/5 test suites PASS (`node scripts/test_answer_tolerance_and_spelling.mjs`).
     - Syntax checks: 45/45 JS files PASS (`node scripts/check_all_js_syntax.cjs`).
     - Test suite: `npm test` PASS 100%.
     - Cache busters bumped to `v=20261105_v127` and SW cache bumped to `topscore-cache-option-a-v55`.

2. **Phase 315: Dashboard Blueprint Alignment, Exam Gating Fix, Section 5 Removal, Universal Fixed Bottom Banner & Cumulative Exam Questions Harmonization [COMPLETE]:**
   - **Cumulative Exam Question Count (`QS`) Harmonization (`js/admin/app.js`)**:
     - Fixed `vaultCountFor` in `js/admin/app.js` to correctly accumulate across themes for exams (`isTest=true`) without being overridden by `pl.theme_code`.
     - Resulting table: Exam A = 120 QS, Exam B = 280 QS (120+160), Exam C = 480 QS (120+160+200), Exam D = 640 QS (120+160+200+160).
     - Directly reconciles live Class Tests view with student historical attempt denominators (277/280).
   - **Exam Premature Access & "Topic null" Bug Resolved (`js/api.js`, `js/dashboard.js`)**:
     - Included `shell_code, payload` in `fetchTestsForStudentClass` query.
     - Implemented multi-source extraction for `themeCode` and `topicCode` from `shell_code` and test title patterns in `dashboard.js`.
     - Replaced `"Topic null"` display with clean `"Theme X: TopicTitle"`.
     - Completely restored inter-theme and task-to-exam prerequisites gating (`🔒 Locked` until 7/7 task passes).
   - **Student Score & Gradebook Parity (Rule 2.8) (`js/dashboard.js`)**:
     - Aligned top card score and grade with completed exam attempts (e.g. Queen Isnantika Salsabila evaluates to 87% Grade B instead of 24% Grade E).
     - Aligned leaderboard standings to compute `overallScore` from completed exam attempts, correctly displaying Points `366`, Grade `B`, and `${st.progressPct}% Progress`.
   - **Dock Panel Header 50%/50% Alignment (`css/dashboard.css`)**:
     - Configured `.dock-tab-header` to `justify-content: stretch` and `.dock-tab-btn` to `flex: 1 1 50%` (`width: 50%`), eliminating right-side empty space.
   - **Blueprint 50px Standard Heights & 2-Line Next Assessment Title (`css/dashboard.css`)**:
     - Standardized `.dashboard-grade-legend`, `.dashboard-classes-deck`, `.dashboard-next-test-deck`, and `.next-test-card` to exact 50px heights.
     - Formatted `.next-test-title` to multi-line box clamp (`-webkit-line-clamp: 2`, `white-space: normal`), preventing title ellipsis cut-off.
   - **Section 5 (7 Repetition Boxes Deck) Completely Removed (`dashboard.html`, `js/dashboard.js`, `css/dashboard.css`)**:
     - Removed `<section id="dashboard-repetition-deck">` from `dashboard.html`.
     - Removed styles from `css/dashboard.css` and cleaned JS DOM references in `js/dashboard.js`.
   - **Universal Fixed Bottom Banner Across ALL Pages (`dashboard.css`, `test.css`, `result.css`)**:
     - Styled `#bottom-ad-banner` and `.topscore-locked-banner` as `position: fixed !important; bottom: 0 !important; left: 0 !important; right: 0 !important; height: 50px !important; z-index: 1000 !important;`.
     - Added `padding-bottom: 50px !important;` to `body.dashboard-page` and `body.result-page`, and `margin-bottom: 50px !important;` to `.test-body`.
   - **Result Page Next Milestone Button Boundary & Vercel CSP Fix (`css/result.css`, `vercel.json`, `sw.js`)**:
     - Adjusted `.btn-next-milestone` to flexible height `46px-54px` with `-webkit-line-clamp: 2` on `.next-btn-title`.
     - Added `https://fonts.googleapis.com https://fonts.gstatic.com` to `connect-src` in `vercel.json`.
     - Patched offline document fallback in `sw.js` to ensure a valid `Response` object is always returned.
   - **Verification**:
     - Syntax checks: 42/42 JS files PASS (`node scripts/check_all_js_syntax.cjs`).
     - Test suite: `npm test` PASS 100%.
     - Cache busters bumped to `v=20261105_v126` and SW cache bumped to `topscore-cache-option-a-v54`.

2. **Phase 314: Test & Result Page Overhaul, Pacing & POS Cleanup, Next Button Alignment, CSP/SW & Boundary Fixes [COMPLETE]:**
   - **Yellow Pacing Badge Purge (`test.html`, `js/test.js`, `css/test.css`)**:
     - Completely removed unrequested dynamic pacing badge (`#test-pacing-indicator` `⚡ ~20s/q`).
     - Removed `updatePacingBadge` function, state calculations, and timer tick invocations in `js/test.js`.
     - Removed CSS pacing badge and icon styles from `css/test.css`.
   - **Part-of-Speech Cleanup in Question Prompt (`js/test.js`)**:
     - Eliminated redundant `[ ADJECTIVE ]` badge (`displayType`) from the central question prompt card in both Written and Spoken/MCQ modes.
     - Preserved the comprehensive 4-cell metadata table below the card (Theme, Category, Topic, Type/POS).
   - **Test Navigation & Next Button Overhaul (`js/test.js`, `css/test.css`)**:
     - Restored canonical `.btn-nav-next` class, ensuring strict 48px height matching `.btn-nav-prev` with cyan `#38bdf8` styling and border symmetry.
     - Replaced non-standard question-skipping logic with sequential progression (`renderQuestion(idx + 1)`).
     - Added dedicated transitions for Section changes (`Next Sec ➔`, `.btn-nav-next.is-next-sec`) and final submission (`Submit 📋`, `.btn-nav-next.is-submit`) with 48px height stability.
   - **CORS Preflight & HEAD Request Optimization (`js/api.js`, `js/supabase.js`)**:
     - Introduced an offline circuit breaker in `callEdgeFunction` to avoid repeated preflight network errors (`net::ERR_FAILED`) when Edge Functions are undeployed on Supabase Cloud.
     - Refined attempt counting in `startTest` from `head: true` to `head: false, limit: 1`, preventing aborted `HEAD` requests (`net::ERR_ABORTED`).
   - **Result Page CSP & Service Worker Error Fixes (`sw.js`, `netlify.toml`)**:
     - Added origin check in `sw.js` to bypass third-party requests (`fonts.googleapis.com`), allowing native browser `<link>` loading without triggering `connect-src` CSP blocks.
     - Handled offline `.catch()` gracefully by returning valid `Response` objects instead of `undefined`, eliminating `Uncaught (in promise) TypeError: Failed to convert value to 'Response'`.
     - Updated `netlify.toml` CSP directive to include `https://fonts.googleapis.com` and `https://fonts.gstatic.com` in `connect-src`.
   - **Result Page Next Assessment Button Boundary Overflow Fix (`css/result.css`, `js/result.js`)**:
     - Fixed typo: corrected `"GO TO NEXT ASSESMENT:"` to `"GO TO NEXT ASSESSMENT:"`.
     - Increased `.result-action-slot` and `.btn-next-milestone` height to 44px with balanced padding (3px 10px).
     - Adjusted typography: tag to 8.5px and title to 11px (line-height: 1.15), ensuring long titles (like `2ND VOCABULARY C4 WORDS TASK - BUDGETING & TRIP PLANNING ➔`) fit completely within button borders with zero border overlap.
   - **Verification**:
     - Playwright E2E verification: PASS 100% on both `test.html` and `result.html` (`scrollHeight <= offsetHeight`, zero CSP errors, correct spelling, matching 46px/48px button heights, sequential navigation).
     - Syntax checks: 42/42 JS files PASS (`node scripts/check_all_js_syntax.cjs`).
     - Test suite: `npm test` PASS 100%.
     - Cache busters bumped to `v=20261105_v125` across all modified files.

2. **Phase 313: 7/7 Mastery Action Button Redesign to White Forward Arrow in Green Box [COMPLETE]:**
   - **White Forward Arrow in Green Box (`js/dashboard.js`, `css/dashboard.css`)**:
     - When a student completes 7/7 passes on a task item, Section 6 action button displays a white forward arrow icon (`stroke="#ffffff"`) enclosed in a pure green box (`#00c000`, `--grade-star`).
     - Button dimensions: `32px` $\times$ `28px`, border-radius: `6px`, with green star glow and high-contrast styling.
     - Clicking button launches `test.html?id=<testId>` to continue repetition or advance.
   - **Verification**:
     - `scripts/test_7x7_gating_and_pass_button_e2e.mjs`: PASS 100% (Verified 7/7 button renders white forward arrow in `#00c000` green box).
     - Generated verified artifact: `dashboard_7x7_mastery_white_arrow_verified.png`.
     - 42/42 JS syntax checks: PASS.
     - `npm test`: PASS 100%.
     - Cache buster updated to `v=20261105_v125` in `dashboard.html`.

2. **Phase 312: 7×7 Repetitive Mastery Gating & Dynamic Pass Counter Action Button [COMPLETE]:**
   - **Section 3 Cleanup**:
     - Purged legacy `#btn-lobby-flashcards` button from `#dashboard-grade-legend` in `dashboard.html`.
     - Completely eliminated the mystery number "40" from Section 3.
   - **7×7 Repetitive Mastery Gating (`js/dashboard.js`, `js/api.js`, `supabase/functions/start-test/index.ts`)**:
     - Task items strictly enforce `passCount >= 7` with score $\ge 70\%$ (or `is_forgiven`) before a task is considered completed.
     - Next Assessment remains locked on the current task until 7 passes are reached.
     - Fixed topic code regex parsing: `parseInt(String(topicCode || '').replace(/^[A-Za-z]+/, ''), 10)` in both client dashboard and Edge Function, resolving the `parseInt('C2') === NaN` bug.
     - In `startTest`, prerequisite task validation verifies `passCount >= 7`.
   - **Dynamic Pass Counter Action Button (`js/dashboard.js`, `css/dashboard.css`)**:
     - Replaced static retry button with interactive pass counter badge (numbers 0 to 7) matching official TopsCore grade tiers:
       - 0–1 passes: Red (`#FF0000`, Grade E tier).
       - 2–3 passes: Dark Orange (`#FF8C00`, Grade D tier).
       - 4 passes: Yellow (`#FFFF00`, Grade C tier).
       - 5–6 passes: Electric Lime (`#95ff00`, Grade B tier).
       - 7 passes: Pure Green Play button (`#00c000`, Grade A / Star tier) indicating 7×7 completion.
     - Clicking button immediately launches `test.html?id=<testId>` to begin the next repetition.
     - Synchronized Section 5 repetitions row with active task progress.
   - **Verification**:
     - `scripts/test_7x7_gating_and_pass_button_e2e.mjs`: PASS 100% (Verified on Queen Isnantika Salsabila: Section 3 clean `FAIL`, Section 5 `1/7`, Section 6 stays on C1 with button `1` in Red E tier).
     - 42/42 JS syntax checks: PASS.
     - `npm test`: PASS 100%.

2. **Phase 311: Dual-Column Prerequisite Synchronization & Test Prerequisite Update Fix [COMPLETE]:**
   - **Root Cause Resolution**:
     - Database table `tests` contains both `prerequisite_test_id` and legacy `prerequisite_id`.
     - `crud-modals.js` only updated `prerequisite_test_id` and left `prerequisite_id` stale, causing table fallback `r.prerequisite_test_id || r.prerequisite_id` to continue displaying the old prerequisite.
   - **Dual-Column Synchronization (`js/api.js` & `js/admin/crud-modals.js`)**:
     - Enforced bi-directional synchronization in `adminInsert` and `adminUpdate` for table `'tests'`.
     - Updated `openCrudModal` to resolve existing prerequisite across both columns and display `[${shell_code}]` prefix in dropdown.
     - Updated save handler to pass both `prerequisite_test_id` and `prerequisite_id`.
   - **Database State (`public.tests`)**:
     - Synchronized `2C1-WORDS-TASK` (`prerequisite_test_id = null`, `prerequisite_id = null`).
     - Synchronized `3A1-PHRASES-TASK` (`prerequisite_id = '2439a060-2292-4280-a70e-5cfb15b93065'`).
     - Zero mismatches remaining across active tests.
   - **Verification**:
     - `scripts/test_prerequisite_update_e2e.mjs`: PASS (100% verified: C1 row shows "—" with no warning badge).
     - 42/42 JS syntax checks: PASS.

2. **Phase 310: Student Dashboard Blueprint Alignment & Dual-Panel Completed Tests with Retry [COMPLETE]:**
   - **Student Dashboard Blueprint Height Alignment (`dashboard.html`, `css/dashboard.css`)**:
     - Top Bar: strict `50px`.
     - Students Metadata Card: strict `150px`.
     - Grade Description Card: strict `40px` (dynamically displays only the single description of the student's evaluated grade e.g. `VERY GOOD`, `GOOD`, `ENOUGH`, etc.; strictly blank `""` when no exam is taken yet).
     - Class Selector Bar: strict `40px` (unified modal list trigger).
     - Repetition Points Row: strict `40px` (7 square boxes for Vocab, or last assessment for non-vocab).
     - Next Assessment Bar: strict `40px` (full title on left, REPEAT / LOCK / GO on right).
     - Dynamic Dual-Panel Card: `flex: 1 1 0%` (absorbs dynamic remaining screen space).
     - Bottom Banner: strict `50px` (`TopsCore Â© 2026 | Created by Mr. Top`).
     - Vertical Gaps: uniform `10px` across the entire layout with zero window scroll.
   - **Section 7 Dual-Panel System with Completed Tests & Retry Button (`js/dashboard.js`, `dashboard.html`)**:
     - Dual-tab header with `#btn-dock-standings` (`RANKING : MY RANK`) and `#btn-dock-completed` (`COMPLETED TESTS`).
     - `#dock-pane-standings`: Batch Leaderboard roster table (NO, Avatar, Title Mr./Miss, Full Name, Point, Grade).
     - `#dock-pane-completed`: Completed tests table with newest completion at the very top (`submitted_at DESC`).
     - Covers both Tasks and Exams with type badge pills (`TASK` / `EXAM`).
     - Interactive `Retry` button (`btn-retry-test`) positioned directly beside each score, triggering `test.html?id=<testId>`.
     - State persistence across reloads via `sessionStorage` (`topscore_dock_tab`).
   - **Dynamic Theme & Border Color Directive**:
     - Dashboard cards dynamically inherit `--tier-color` and `--tier-rgb` with radial gradient background aura based on the student's overall evaluation grade (`â˜…`, `A`, `B`, `C`, `D`, `E`).
   - **Verification & Tests**:
     - 42/42 JS files syntax check PASS (`node scripts/check_all_js_syntax.cjs`).
     - 100% CI test suite PASS (`npm test`).
     - Playwright E2E verification PASS (`scripts/test_dashboard_blueprint_e2e.mjs`):
       - Verified all section heights match expected blueprint: 50px, 150px, 40px, 40px, 40px, 40px, flex 1, 50px (diff 0.0px).
       - Verified dual tab switching between Leaderboard and Completed Tests.
       - Verified descending completion sorting (`submitted_at DESC`, newest on top).
       - Verified `Retry` buttons on every row beside score.
       - Verified mobile viewport (390 x 844) preserves layout and heights.
       - Screenshots archived: `dashboard_blueprint_completed_tab_verified.png`, `dashboard_blueprint_standings_tab_verified.png`, and `dashboard_blueprint_mobile_verified.png`.
   - **Cache Buster**: Bumped to `v=20261104_v123` across `dashboard.html`, `js/dashboard.js`, and `css/dashboard.css`.

2. **Phase 309: Inline Manual Exam Grade Input with Bi-directional Sync & Toggle [COMPLETE]:**
   - **Manual Input Controller Architecture (`js/admin/app.js`)**:
     - State tracking: `window._manualInputState = { activeStudentIds: new Set(), drafts: {} }`.
     - Live bi-directional score $\leftrightarrow$ points calculation sync (`window.onMatrixExamScoreChange`, `window.onMatrixExamPtsChange`).
     - Persistent save controller: `window.saveRowManualInput`, `window.toggleRowManualInput`, and `window.toggleAllManualInputMode` calling `adminApplyForgiven` (`action: 'manual'`) with tutor name `"Mr. Top"` and audit logging.
   - **Header & Column Redesign**:
     - Super header changed to `"MANUAL INPUT"` (`super-hdr-manual-input`) across both THEME VIEW and ALL VIEW.
     - Header sub-tag: clickable toggle badge (`ðŸŸ¢ ON` / `âšª OFF`) allowing tutors to toggle all rows at once.
     - Row action button: replaced with interactive toggle button `âœï¸ EDIT` (when inactive) and `ðŸ’¾ SAVE` (when active).
   - **Inline Cells Transformation**:
     - When active: Exam Score % and Exam Points cells transform into sleek `<input type="number">` fields.
     - Real-time calculation: typing 80 in Score % auto-populates 96 in Points (out of 120), and vice versa.
     - On Save or Enter: updates Supabase database, re-renders grid, grants authentic Grade (e.g. Grade B `#95ff00`) and Points (96 PTS), displays `á´¹` superscript, and closes manual input mode back to `âœï¸ EDIT`.
   - **Verification & Tests**:
     - 42/42 JS files syntax check PASS (`node scripts/check_all_js_syntax.cjs`).
     - 100% CI test suite PASS (`npm test`).
     - Playwright E2E verification PASS (`scripts/test_manual_input_matrix_e2e.mjs`):
       - Verified super header `"MANUAL INPUT"` and `"âšª OFF"` badge.
       - Verified clicking `"âœï¸ EDIT"` on `Abdul Basit` opens inputs and changes button to `"ðŸ’¾ SAVE"`.
       - Verified typing `80` in score input calculates `96` in points input.
       - Verified clicking `"ðŸ’¾ SAVE"` persists to Supabase and updates matrix (`80%á´¹`, `96` PTS, Grade `B`).
       - Verified button returns to `"âœï¸ EDIT"`.
       - Verified ALL VIEW also supports `"MANUAL INPUT"`.
       - Screenshots archived: `manual_input_active_editing_verified.png`, `manual_input_saved_verified.png`, and `manual_input_all_view_verified.png`.
   - **Cache Buster**: Bumped to `v=20261104_v122` across HTML pages and core JS modules.

2. **Phase 308: Smart Conditional Student Name Abbreviation & Matrix Column Fit [COMPLETE]:**
   - **Smart Conditional Abbreviation Engine (`js/api.js`)**:
     - Built and exported `formatMatrixStudentName(name, maxChars = 19)`.
     - Preserves short names completely intact: if `cleanName.length <= maxChars` (e.g. 19 chars), no abbreviation is performed.
       - Verified: `Lalu Arman Maulana` (18 chars), `Lalu Nune Mubarak` (17 chars), `Abdul Basit` (11 chars), and `Alfina Damayanti` (16 chars) remain unshortened.
     - Automatically abbreviates titles when names exceed 19 characters:
       - `Muhamad`/`Muhammad` $\rightarrow$ `M.` (`Muhamad Alifurrahman` $\rightarrow$ `M. Alifurrahman`, `Muhammad Ariwil Asrori` $\rightarrow$ `M. Ariwil Asrori`, `Muhammad Afyani Farobi` $\rightarrow$ `M. Afyani Farobi`).
       - `Lalu` $\rightarrow$ `L.` and `Baiq` $\rightarrow$ `Bq.`.
       - Middle names abbreviated to single letter initials with a dot (`Adinda Karunia Farela` $\rightarrow$ `Adinda K. Farela`, `Lalu Yuda Handika Prawira` $\rightarrow$ `L. Yuda H. Prawira`, `Abdul Qoyyim Hanif Dahuri` $\rightarrow$ `Abd. Q. H. Dahuri`).
     - Preserves 100% full original names in database, hover tooltips (`title`), and student profile modals.
   - **Matrix Column Fit & Sticky Width Expansion (`css/admin.css` & `js/admin/app.js`)**:
     - Increased `col-sticky-4` (STUDENT NAME) width from 110px to 145px (`max-width: 140px;`).
     - Aligned sticky offsets: Col 5 (`left: 259px`), Col 6 (`left: 295px`), Col 7 (`left: 329px`).
     - Total table width in ALL VIEW remains compact (699px), fitting 100% on standard screens with ZERO horizontal scrollbar.
   - **Verification & Tests**:
     - 42/42 JS files syntax check PASS (`node scripts/check_all_js_syntax.cjs`).
     - 100% CI test suite PASS (`npm test`).
     - E2E Playwright verification PASS (`scripts/test_smart_names_matrix_e2e.mjs`):
       - Verified: 0 truncations across all 18 student rows (`Has '...': false`).
       - Verified: `Lalu Arman Maulana`, `Lalu Nune Mubarak`, and `Abdul Basit` are NOT abbreviated.
       - Verified: `Lalu Yuda Handika Prawira` $\rightarrow$ `L. Yuda H. Prawira`, `Adinda Karunia Farela` $\rightarrow$ `Adinda K. Farela`, `Muhamad Alifurrahman` $\rightarrow$ `M. Alifurrahman`.
       - Screenshots archived: `smart_names_matrix_verified.png` and `smart_names_theme_view_verified.png`.
   - **Cache Buster**: Bumped to `v=20261104_v121` across HTML pages and core JS modules.

2. **Phase 307: Attendance Matrix Theme & All View Blueprint Redesign [COMPLETE]:**
   - **Student Details Columns Natural Pedagogical Order (Left Pane)**:
     - Reordered 7 sticky columns in `js/admin/app.js` (`renderAttendanceGridMatrix`): `INSTITUTION | PROGRAM | BATCH | STUDENT NAME | PROGRESS | POINTS | GRADE` (previously `GRD | PROG | PTS`).
     - Aligned sticky offsets and widths in `css/admin.css` (`col-sticky-1` through `col-sticky-7`), with `col-sticky-last` drop-shadow separator on Col 7 (`GRADE`).
     - Clean POINTS display: rendered as pure numeric points without trailing "pts" text, dynamically inheriting score tier color (`getGradeColorByScore`).
   - **Academic Grade & Point Credit for Authentic Manual Override Scores**:
     - Upgraded `computeMilestoneExamMastery` in `js/grading.js`: `cleanExamEntries` now excludes ONLY pure forgiven 0% entries (`isPureForgivenZero = Boolean(e.isForgiven) && !e.isManual && Number(e.effPoints ?? e.points ?? 0) === 0`).
     - In `js/admin/app.js`, student gradebook metrics calculate authentic scores from completed exams (Rule 2.8), giving student `Test` Grade B (`#95ff00`) and 102 PTS from their 85% Exam A score instead of penalizing with unreached future weeks.
   - **THEME VIEW (`selectedTheme !== 'ALL'`)**:
     - Super Header 1: `[THEME NAME]` spanning over `TOPIC 1 | TOPIC 2 | TOPIC 3 | TOPIC 4 ...` (formative tasks).
       - Cell content: strictly high-contrast repetition progress badge (`7/7`, `6/6`, `1/6`, `0/6`), removing stacked `0%` text for clean readability.
     - Super Header 2: `EXAM` spanning over `SCORE | POINTS` (removes duplicate `TOT SCORE %` and `PTS EXAM PTS` columns).
     - Super Header 3: `ACTION` with sub-column `BUTTON` (eye icon button `ðŸ‘ï¸` linking to student profile).
   - **ALL VIEW (`selectedTheme === 'ALL'`)**:
     - Formative drill tasks are completely hidden.
     - Each active theme displays a compact 2-column block:
       `THEME A (SCORE | POINTS) | THEME B (SCORE | POINTS) | THEME C (SCORE | POINTS) | THEME D (SCORE | POINTS)`.
     - Exactly 15 columns total (7 student details + 8 theme exam cols), fitting 100% on the screen in `FIT SCREEN` mode with zero horizontal scrollbar.
   - **Verification & Tests**:
     - 42/42 JS files syntax check PASS (`node scripts/check_all_js_syntax.cjs`).
     - 100% CI test suite PASS (`npm test`).
     - Full Playwright E2E verification PASS (`scripts/test_matrix_theme_and_all_view_e2e.mjs`):
       - Verified Student Details column order (`PROGRESS | POINTS | GRADE`).
       - Verified Student "Test" has Points 102 and Grade B.
       - Verified Topic cells render strictly clean repetition badges (e.g. `1/6`, `6/6á¶ `).
       - Verified Super Headers (`STUDENT DETAILS | THEME A | EXAM | ACTION`).
       - Verified duplicate TOT/PTS columns eliminated.
       - Verified ALL VIEW has exactly 15 columns with formative tasks hidden.
       - Verified Theme A exam score `85%á¶ ` and `102` in ALL VIEW.
       - Screenshots captured and archived: `theme_view_verified.png` and `all_view_verified.png`.
   - **Cache Buster**: Bumped to `v=20261104_v120` across HTML pages and core JS modules.

2. **Phase 306: Configurable Task Mastery Repetitions & Blueprint Test System Settings [COMPLETE]:**
   - **Configurable Repetitive Mastery Requirements**:
     - Upgraded repetition engine in `js/grading.js`: `getTaskProgressVisual(passCount, targetReps)` and `computeTopicPassLevel(..., targetReps)` dynamically scale with class-specific `targetReps`.
     - Multi-tier settings persistence in `js/api.js`: `fetchClassTestSettings` and `saveClassTestSettings` support `site_settings` table, `localStorage` fallback, and inspection of `tests` table in DB (`minimum_required_score` and `payload.task_repetitions`).
     - Dynamic gating in `js/dashboard.js` and `js/api.js`: uses configured `targetReps` (e.g. 6) and `taskMinScore` (e.g. 50%) for task completion and topic gating.
   - **Attendance Matrix Repetition Progress**:
     - In `js/admin/app.js` (`renderAttendanceGridMatrix`): Vertically stacked `.asm-cell-task-wrap` in each topic column (`1, 2, 3, etc.`) rendering both the percentage score (`roundPct%` with `á¶ `/`á´¹`/`á´¿`) and high-contrast repetition badge `.asm-rep-badge` (`passCount/targetReps`).
     - Badges dynamically color-code: green (`#00c000`) when complete, cyan (`#38bdf8`) when in progress, muted slate (`#64748b`) when unattempted.
   - **Inline Blueprint Exam Passing Score Column**:
     - In the Blueprint / Class Tests table, replaced static text with `<input type="number" class="input-test-pass-score" ...>`.
     - Typing any percentage (1–100%) and pressing Enter or blurring automatically invokes `updateTestPassingScore(testId, newVal)` and updates the database record immediately.
   - **Centralized Test System Settings Panel**:
     - Built `js/admin/test-system-settings-modal.js` modal dialog allowing tutors to configure:
       - Target Repetitions (1–10x)
       - Task Minimum Passing Score (1–100%)
       - Exam Minimum Passing Score (1–100%)
       - Scope Selection (This Class vs Global Default)
       - Batch Apply Checkbox to update all existing tests in the class.
     - Accessible via `âš™ï¸ Test System Settings` button (`#btn-open-blueprint-settings`) in Class Tests tab and `âš™ï¸ Test Settings` button (`#btn-blueprint-bottom-settings`) in Vocabulary Vault Blueprint.
   - **Verification & Tests**:
     - 42/42 JS files syntax check PASS (`node scripts/check_all_js_syntax.cjs`).
     - 100% CI test suite PASS (`npm test`).
     - Full Playwright E2E verification PASS (`scripts/test_mastery_and_blueprint_settings_e2e.mjs`):
       - Verified `saveClassTestSettings` and `fetchClassTestSettings` (set to 6 reps, 50% task min score, 60% exam min score).
       - Verified `updateTestPassingScore` persisted to DB.
       - Verified 54 repetition progress badges rendered in matrix cells (`6/6` and `0/6`).
       - Verified 19 inline `PASS (%)` editable number inputs in tests table.
       - Verified Test System Settings modal opens, edits, and saves successfully.
       - Screenshots captured: `roster_matrix_repetition_progress_verified.png`, `blueprint_exam_pass_score_inline_verified.png`, and `test_system_settings_modal_verified.png`.
   - **Cache Buster**: Bumped to `v=20261104_v119` across all HTML pages, core JS modules, and admin controllers.

2. **Phase 305: Forgiven & Exam Manual Override Wizard (Pacing Adjustment) [COMPLETE]:**
   - **Context & Motivation**:
     - Class `2nd Vocabulary` (Batch `Camp 134`) already ran for 2 weeks offline. The tutor required students to begin directly from Week 3 (Theme C) without taking Week 1–2 tests online, while preserving curriculum integrity for future batches.
     - Implemented Solusi B: a 2-step Forgiven & Manual Override Wizard accessible from Class Hub (`admin.html#class-hub`).
   - **Backend API & Database**:
     - Migration `supabase/migrations/20261104130000_add_manual_override_column.sql`: validated `is_forgiven`, `forgiven_by`, `forgiven_at`, `forgiven_reason`, and `is_manual_override`.
     - `adminApplyForgiven` & `adminRevokeForgiven` in `js/api.js`: full support for batch/student filtering, forgiving formative tasks (`0%á¶ `), and manual exam scoring with Rule 2.10 grading enforcement (85% = Grade B, 102 PTS). Admin name `"Mr. Top"` embedded in audit logs and attempt reasons.
   - **Admin Wizard UI (`js/admin/forgiven-wizard-modal.js`)**:
     - Step 1: Batch dropdown filter, search input, quick select/clear all, dynamic chip count.
     - Step 2: Formative tasks grouped by Theme (A, B, C, D) with theme toggles, milestone exam radio (`Abaikan`, `Forgive 0%á¶ `, `Input Nilai Manual` with live bi-directional `%` $\leftrightarrow$ `PTS` calculation), Admin name (`Mr. Top`), audit reason input, `âš¡ Setel Cepat Pekan 1 & 2` preset button, and Revoke action.
     - Toolbar button `ðŸ›¡ï¸ Forgiven & Override` (`#btn-open-forgiven-wizard`) integrated into Class Hub.
   - **Admin Roster Grid Matrix**:
     - Superscripts `.asm-forgiven-sup` (`á¶ `, `#f59e0b`) and `.asm-manual-sup` (`á´¹`, `#38bdf8`) rendered in exam and task cells with rich tooltips displaying tutor name `"Mr. Top"`, date, and audit reason.
   - **Student Gating & Dashboard Bypass**:
     - In `js/dashboard.js`, forgiven tasks count as 7/7 passes to bypass the 7Ã—7 repetitive mastery gate.
     - Forgiven milestone exams unlock subsequent theme tasks (e.g. Forgiven Exam B unlocks Task C1).
     - Student dashboard displays `0%á¶  FORGIVEN` badge with `ðŸ“– Practice` button for optional review, and renders `á¶ ` / `á´¹` superscripts.
   - **Verification & Tests**:
     - 41/41 JS files syntax check PASS (`node scripts/check_all_js_syntax.cjs`).
     - 100% CI test suite PASS (`npm test`).
     - Full Playwright E2E verification PASS (`scripts/test_forgiven_wizard_e2e.mjs`): verified database records, manual exam override, modal interaction, roster superscript `á¶ `, student lobby display, and revoke.
     - Screenshots captured: `forgiven_wizard_modal_verified.png`, `class_hub_roster_forgiven_verified.png`, and `student_dashboard_forgiven_verified.png`.
   - **Cache Buster**: Bumped to `v=20261104_v118` across `admin.html`, `dashboard.html`, `result.html`, `test.html`, `js/dashboard.js`, `js/result.js`, `js/test.js`, and `js/admin/app.js`.

2. **Phase 304: Task Question Count Clamping, Permanent 50px Banners, and Strict Level Class Isolation [COMPLETE]:**
   - **Task Question Count Overload Resolved**:
     - Root cause: In `supabase/functions/start-test/index.ts`, `themes` was evaluated before `topicCode`, causing task `2A1` (`payload.themes = ['A']`) to query all 120 words of Theme A instead of topic A1 (40 words).
     - Fixed in both `supabase/functions/start-test/index.ts` and `js/api.js`: prioritized `topicCode` over `themes`, added multi-candidate code matching (`[topicCode.toUpperCase(), themeCode + topicCode, topicCode.replace(/^[A-Za-z]/, '')]`), and implemented a hard safety clamp against `test.total_questions` (Task = 40, Exam = 120/160).
     - Result: `2nd Vocabulary A1 Words Task` now loads exactly 40 questions (`0/40 Answered`) with 0 words from A2/A3.
   - **Permanent 50px Top and Bottom Banners in Test Runner**:
     - Converted test runner header into standard 50px top header: `<header class="dashboard-header test-header" id="test-top-header">` featuring Give Up button, student avatar circle, cloud sync indicator, and countdown timer badge.
     - Extracted `.test-title-bar` as an independent 34px strip above `.test-body`.
     - Relocated `<footer id="bottom-ad-banner" class="topscore-locked-banner">` to be a permanent direct child of `body.test-page` at the very bottom, fixed at 50px height (`flex-shrink: 0 !important; z-index: 100 !important;`).
     - Added Netlify floating badge collision suppression so bottom banner remains 100% visible on all viewports without being cut off.
   - **Strict Class Level Isolation**:
     - Fixed `fetchStudentClasses` in `js/api.js` to strictly filter by the student's current active level (`cLvlNum === studentLevelNum` or `c.level_id === levelId`), removing the cumulative `<=` comparison.
     - Updated `renderClasses` in `js/dashboard.js`: past level classes (`cLvlNum < studentLevelNum`) now only push to `completedClasses` for history review and are excluded from `activeClasses`.
     - Result: Student account `Test` (in `2nd Level`) only sees `2nd Vocabulary` in the `Select Class` modal, with `1st Vocabulary` completely isolated.
   - **Verification & Parity**:
     - 40/40 JS files syntax check PASS (`node scripts/check_all_js_syntax.cjs`).
     - 100% CI test suite PASS (`npm test`).
     - `node scripts/verify_phase_304_all_issues.mjs`: 24/24 E2E assertion checks PASS.
     - Captured and archived screenshots: `test_page_verified.png` (50px top header, 50px permanent bottom banner, 0/40 Answered) and `dashboard_classes_selector_verified.png` (only 2nd Vocabulary listed).
   - **Cache Buster**: Bumped to `v=20261104_v117` across `test.html`, `dashboard.html`, `result.html`, `admin.html`, `js/test.js`, `js/dashboard.js`, `js/result.js`, and `js/admin/app.js`.

2. **Phase 303: Auto-Generator Test Hierarchy Diagnostic & Prerequisite Chain Resolution [COMPLETE]:**
   - **Root Cause Identified**:
     - Investigated why auto-generating tests for 2nd Vocabulary produced only 11 tasks and 4 exams (15 records) instead of 15 tasks and 4 exams (19 records).
     - Diagnosed fatal bug in `upsertDynamicTestShell` (`js/api.js`): `legacyCodes` check for TASK shells unconditionally included EXAM shell codes (`${levelNum}${themeCode}-WORDS-EXAM`).
     - When generating Task 1 (e.g., `2A1-WORDS-TASK`), it matched existing `2A-WORDS-EXAM` and renamed it to `2A1`. `2A2` then pointed its prerequisite to that UUID.
     - When the Theme Exam generated at the end of the theme, it matched `2A1-WORDS-TASK` and renamed it back to `2A-WORDS-EXAM`.
     - Result: Exactly 4 tasks (A1, B1, C1, D1) were clobbered by the 4 exams, leaving 11 tasks and 4 exams, with A2 pointing to the Exam as its prerequisite.
   - **Architectural Fix in `js/api.js`**:
     - Strictly bifurcated `legacyCodes` in `upsertDynamicTestShell`: EXAM shells match only legacy exam aliases; TASK shells match only legacy task/quiz aliases for their specific topic.
     - Added class isolation: `classId` is now checked so tests from another class never collide.
     - Synchronized both `prerequisite_test_id` and `prerequisite_id` columns to guarantee unified relational integrity.
     - Protected `autoGenerateTestsHierarchy` with chunked pagination via `fetchVaultWords({ targetLevel: levelNum, limit: 10000 })` so levels with >1,000 words are never truncated.
     - Applied natural alphanumeric sorting (`localeCompare(undefined, { numeric: true })`) to prevent sorting anomalies like A10 before A2.
   - **Live Production Database Resync**:
     - Resynced `2nd Vocabulary` (`class_id: 2ccf6468-1e03-41d1-b72b-1d84dcad85b2`): exactly **15 Tasks** (A1–A3, B1–B4, C1–C4, D1–D4) + **4 Exams** = **19 tests** (19 records).
     - Resynced `3rd Vocabulary` (`class_id: ab33498a-90e6-44b7-83f4-5765f964543e`): exactly **32 Tasks** (16 Words + 16 Phrases) + **8 Exams** = **40 tests** (40 records).
     - Verified linear prerequisite sequence across all topics: A1 -> A2 -> A3 -> A Exam -> B1 -> ... -> D Exam.
   - **System Answers to User Inquiries**:
     - Verified and documented that test auto-generation runs automatically in two scenarios: (1) upon Excel import in Vocabulary Vault via `autoSyncClassTestsForLevel({ force: true })`, and (2) upon Class Hub load as a self-healing mechanism when a class has 0 tests. Manual triggers via the Wizard button are also available.
   - **Verification & Parity**:
     - 40/40 JS files syntax check PASS (`node scripts/check_all_js_syntax.cjs`).
     - 100% CI test suite PASS (`npm test`).
     - E2E test suite PASS: 19/19 tests green (`node scripts/e2e_unified_code_verification.mjs`).
     - Live browser screenshot captured: `class_hub_vocab2_19_tests_verified.png` showing `âš¡ 15 Tasks | ðŸ“ 4 Exams | 19 records`.
   - **Cache Buster**: Bumped to `v=20261104_v116` across `admin.html`, `js/admin/app.js`, `auto-gen-modal.js`, `classes-management.js`, and `vocab-vault.js`.

2. **Phase 302: Unified Single `CODE` Pipeline & Level 3 Topic/Word Full Restoration [COMPLETE]:**
   - **Level 3 Restoration & Automated Chunked Pagination (`js/api.js`)**:
     - Identified root cause of missing Level 3 topics (C2..C5 and D1..D4): PostgREST's 1,000-row server ceiling truncated queries in `fetchVaultWords`.
     - Replaced single-range query with automated chunked pagination loop fetching 1,000 rows per batch.
     - Confirmed all 1,410 active rows (800 words in Level 3, 610 in Level 2) now load into memory.
     - Restored all 16 topics for Level 3 on Topic Blueprint: `[ ðŸŽ¯ 3rd (16) ]` (previously showed only 8 topics).
     - Infobar updated to accurate metrics: `Topics: 31`, `Vault Items: 1410`.
   - **Redundant Column Elimination (`js/admin/vocab-vault.js`)**:
     - Removed redundant `T.CODE` (Theme Code) column from Vocabulary Words grid (`tab=vocab`) and Phrases & Idioms grid (`tab=phrases`).
     - Removed redundant `THEME CODE` column from Topic Blueprint matrix (`tab=blueprint`).
     - Streamlined layout to 10 standard columns:
       - Grid: `INSTITUTION` | `PROGRAM` | `LEVEL` | `CODE` | `THEME` | `TOPIC` | `TYPE` | `INDONESIAN` | `ENGLISH` | `ACTIONS`.
       - Blueprint: `LEVEL` | `THEME` | `CODE` | `TOPIC` | `VERB` | `NOUN` | `ADJECTIVE` | `PHRASE` | `TOTAL` | `ACTION`.
     - `THEME` retains cascading `rowspan`, and `CODE` shows clean monospaced `A1`, `A2`, `B1`...
     - Inline edit simplified: single input for `Code` (`A1`). On save, automatically derives `topic_code = code` and `theme_code = code[0]`.
   - **Test Generation & Question Candidates Parity (`js/api.js`)**:
     - Updated `generateTestQuestions` to resolve topic code candidates across both `A1` and `1` formats, ensuring test runner questions are always retrieved.
   - **Cache Buster & Parity Checks**:
     - Bumped cache buster to `v=20261104_v115` across `admin.html`, `js/admin/app.js`, `classes-management.js`, and `vocab-vault.js`.
     - 40/40 JS syntax checks PASS (`node scripts/check_all_js_syntax.cjs`).
     - 100% CI test suite PASS (`npm test`).
     - Live browser inspection verified via Playwright Edge screenshots (`blueprint_restored_single_code.png`, `blueprint_lvl3_full_16_topics.png`, `vocab_grid_single_code.png`).

2. **Phase 301: Unified Topic Code (A1, A2, B1...) Pipeline in Vocabulary Vault [COMPLETE]:**
   - **Root Cause Resolution**:
     - Diagnosed and resolved Excel import failure where header whitespace and carriage returns caused `normalized['TOPIC CODE']` to fail silently, resulting in blank `topic_code = ''` in database.
     - Resolved Excel export issue where missing database codes led to blank cells in exported sheets.
   - **Live Database Normalization (`vocabulary_vault`)**:
     - Paginated full-table scan overcoming Supabase 1,000-row limit across all 1,410 active rows.
     - Normalized 214 rows from blank/numbers to standardized `A1`, `A2`, `B1`... `D4` codes.
     - Verified `remainingEmpty === 0` across entire Supabase table.
   - **Smart 10-Column Standard Excel Parser (`js/admin/vocab-vault.js`)**:
     - Normalized header keys by stripping hidden `\r`, `\n`, `\t` and multiple spaces.
     - Support 10-column standard (`Code: A1`, `B2`) with auto-extraction of `theme_code = 'A'` and `topic_code = 'A1'`.
     - Multi-format backward compatibility: handles legacy 11-column files (`Theme Code: A`, `Topic Code: 1` -> `A1`).
     - Curriculum dictionary fallback (`TOPIC_CODE_MAP`): auto-fills code from topic title if code column is omitted.
     - Updated import modal description to official 10-Column Standard.
   - **Full-Spectrum Excel Export (`js/api.js`)**:
     - Updated `exportVaultWords` with `.range(0, 99999)` ensuring all 1,410+ rows export completely.
     - Standardized 10-column schema with unified `Code` column (`A1`, `A2`...) with zero blank cells.
   - **UI Blueprint & Grid Synchronization (`js/admin/vocab-vault.js`)**:
     - Topic Blueprint: `TOPIC CODE` column renders clean `A1`, `A2`, `B1`... with natural alphanumeric sorting.
     - Vocabulary Words Grid: `Topic Code` / `Code` column renders monospaced badges (`A1`, `A2`...) instead of dashes (`—`).
     - Inline edit and save automatically normalizes topic code and theme code.
   - **Evaluation Engine & Test Hierarchy Parity (`js/admin/app.js` & `js/api.js`)**:
     - Updated `vaultCountFor` in `js/admin/app.js` to normalize and match both `A1` and `1` formats.
     - Added `cleanTopCode` in `upsertDynamicTestShell` (`js/api.js`) to guarantee clean shell codes (`3A1-WORDS-TASK`) and titles.
   - **Cache Buster & Parity Checks**:
     - Bumped cache buster to `v=20261103_v114` in `admin.html`, `app.js`, `classes-management.js`, and `vocab-vault.js`.
     - 40/40 JS syntax check PASS, 100% CI test suite PASS (`npm test`), verified with Playwright Edge screenshots (`blueprint_unified_code_verified.png`, `vocab_grid_unified_code_verified.png`).

2. **Phase 300: Unified Topic Blueprint Multi-Level Cascading Rowspan Matrix (Opsi B) [COMPLETE]:**
   - **Unified 3-Level Single-Page Visualization**: Overhauled Topic Blueprint in Vocabulary Vault (`js/admin/vocab-vault.js`) to display all 3 levels (1st, 2nd, 3rd) in one unified, continuous matrix table following user-selected **OPSI B**.
   - **Cascading Multi-Level Rowspan Hierarchy**:
     - `LEVEL` column with dynamic `rowspan` spanning all themes and topics in that level (`1ST`, `2ND`, `3RD`).
     - `THEME CODE` column with dynamic `rowspan` spanning all topics in that theme (`A`, `B`, `C`, `D`).
     - `THEME` column with dynamic `rowspan` spanning topic rows with clean vertical alignment.
     - Individual topic rows displaying `TOPIC CODE`, `TOPIC`, `VERB`, `NOUN`, `ADJECTIVE`, `PHRASE`, `TOTAL`, and inline action buttons (`âœï¸` Rename, `ðŸ—‘ï¸` Delete).
   - **Zero-Layout-Break Dynamic Search**: Real-time search (`#vault-topic-search`) re-calculates exact matching `rowspan` on the fly, ensuring zero table misalignment or broken borders during live keyword filtering.
   - **Flexible Curriculum Toolbar & Quick Jump**:
     - Added quick filter buttons: `[ ðŸŽ¯ ALL LEVELS (23) ]`, `[ ðŸŽ¯ 1st (0) ]`, `[ ðŸŽ¯ 2nd (15) ]`, `[ ðŸŽ¯ 3rd (8) ]`.
     - Graceful empty level handling for 1st Level with clear placeholder notice.
   - **High-Contrast Dark Matrix Styling**: Added CSS rules for `.cell-level-group`, `.cell-theme-code`, `.cell-theme-name`, `#blueprint-matrix-table`, and hover highlights in `css/admin.css`.
   - **Cache Buster Bump**: Bumped to `v=20261103_v113` across `admin.html`, `app.js`, `classes-management.js`, and `vocab-vault.js`.
   - **Verification**: 40/40 JS syntax checks PASS, 100% test suite PASS, Playwright live inspection verified (`blueprint_opsi_b_verified.png`).

2. **Phase 299: Realtime Full Student Journey (2nd Level -> 3rd Level) with Account "Test" & Housekeeping Reset [COMPLETE]:**
   - **Authentic Production Journey Verification**:
     - Live student account `"Test"` (`id: 0694c6f5-076c-43d1-99ee-0a8800975bcb`, CEC Camp, PIN: `1234`).
     - Real database attempts created, answered, and submitted across 46 distinct tests per run (30 attempts in Level 2 + 232 attempts in Level 3 = 262 real database attempts, ~1,310 cloud DB transactions per run).
     - Full Level 2 progression (`2A1-WORDS-TASK` $\rightarrow$ `2A2-WORDS-TASK` $\rightarrow$ `2A-WORDS-EXAM` $\rightarrow$ `2B1-WORDS-TASK` $\rightarrow$ `2B2-WORDS-TASK` $\rightarrow$ `2B-WORDS-EXAM`).
     - Verified automatic level promotion from Level 2 (Batch 134) to Level 3 (Batch 133).
     - Full Level 3 progression across Themes A, B, C, D (32 tasks with $7 \times 7$ Repetitive Mastery leveling + 8 parallel peer exams with dynamic student choice taking Phrases exam first).
   - **Critical Architectural & Engine Bugfixes**:
     - **Bugfix 1 (`themeCodeFallback` Reference Error)**: Fixed undefined identifier in `js/api.js` line 1076 inside client DB fallback for test gating, replacing with `asmData.payload?.theme_code`.
     - **Bugfix 2 (Flexible Exam Lockout Bypass)**: Fixed `startTest` in `js/api.js` and `supabase/functions/start-test/index.ts` where asynchronous/flexible exams (like Level 2 Vocabulary) were incorrectly blocked by tutor live session checks.
     - **Bugfix 3 (Proportional Points Normalization in `computeUnifiedScore`)**: In `js/grading.js` (`parseAttemptPoints`), raw question score (`att.score`) was erroneously prioritized before `percentage`, causing component points to exceed max bounds (e.g. 331/150 pts). Corrected priority order to strictly evaluate `percentage` and `effective_score` to proportionally scale points out of component max weight (`wordsMax: 120/40`, `phrasesMax: 30/10`), yielding clean, exact `142/150 pts (95%, Grade A)` results.
     - **Bugfix 4 (Direct DB Mode for Test Automation)**: Added `process.env.TOPSCORE_DIRECT_DB === '1'` optimization in `js/supabase.js` and `js/api.js` to eliminate 404 HTTP roundtrip delays on missing edge functions during automated test runs.
     - **Bugfix 5 (Level Table Compact Format & Cache Buster v112)**: Standardized compact format (`1st`, `2nd`, `3rd`, `Alumni`) across all admin tables in `classes-management.js`, `app.js`, `auto-gen-modal.js`, `vocab-vault.js`, `student-management.js`, and bumped version string `v=20261103_v112` in `admin.html` and modules.
   - **Protocol Verification Progress**:
     - Run #1: **PASSED** (46 tests, 262 real DB attempts, 0 defects).
     - Run #2: **PASSED** (46 tests, 262 real DB attempts, unified score 141.9/150 pts, 0 defects).
     - Run #3: **PASSED** (46 tests, 262 real DB attempts, unified score 141.9/150 pts, 0 defects).
     - Run #4: **PASSED** (46 tests, 262 real DB attempts, unified score 141.9/150 pts, 0 defects in 1002.3s).
     - Total: **4 consecutive runs PASSED with 0 defects** (1,048 real database attempts completed, ~5,240 cloud DB transactions). Evaluated and approved as fully sufficient and deterministic.
   - **Housekeeping & Demo Reset**:
     - Built dedicated reset script `scripts/reset_test_student.mjs`.
     - Purged all 66 test attempts and 3,280 attempt answers for student `"Test"`.
     - Restored student `"Test"` cleanly to Level 2 (`9936683a-5b4a-4796-bb5d-a7fd8ecf0b71`), Batch 134 (`3e7288b7-a90e-4323-9b02-24e73991f0d7`), active status `true`, and PIN `1234`. Student is 100% clean and ready for live presentation/demo.

1. **Phase 298: Virtual Unified Task (50 PTS) & Exam (150 PTS) with Component Selection Modal [COMPLETE]:**
   - **Student Choice Component Selector Modal**: Added `#component-selector-modal` to `dashboard.html` with card-based interface for choosing between Words (Written/Typed) and Phrases (Selection/Spoken) components. Allows students to freely decide which component to take first.
   - **Virtual 50 PTS Task & 150 PTS Exam Representation**:
     - Tasks are presented on the dashboard as a single unified card: `Theme X â€¢ Topic Y: Title`, `50 Items â€¢ 50 PTS (40 Words + 10 Phrases)`.
     - Exams are presented as a single unified card: `Theme X Exam Package`, `150 Items â€¢ 150 PTS (120 Words + 30 Phrases)`.
     - Single-component classes (e.g. `2nd Vocabulary` Level 2) automatically bypass modal selection and launch directly into test.
   - **7Ã—7 Repetitive Mastery with Math.min Leveling**:
     - A topic round is completed if and only if both Words and Phrases achieve $\ge 70\%$.
     - `computeTopicPassLevel(wordsPasses, phrasesPasses, hasPhrases)`: Calculated using `Math.min(wordsPasses, phrasesPasses)` for balanced mastery.
     - Failing one part requires retaking only that failed part; the passed sibling retains its pass.
   - **Strict Linear Topic Gating**:
     - Topic $K$ strictly requires all tasks in Topic $K-1$ to reach 7 passes with $\ge 70\%$.
     - Theme Exam strictly requires all Theme Tasks to reach 7 passes with $\ge 70\%$.
     - Theme $K+1$ strictly requires both Words Exam and Phrases Exam of Theme $K$ to reach $\ge 70\%$.
     - Parallel peer exams: Within the unlocked theme, Words Exam and Phrases Exam share the same prerequisite (`lastThemeTaskId`), allowing students to take either exam first.
   - **Class Hub Roster Unified Columns (`js/admin/app.js`)**:
     - For multi-component classes (3rd Vocabulary), dynamically renders unified columns: `A1 Task (50p)`, `A2 Task (50p)`, `A3 Task (50p)`, `A Exam (SCR %, PTS)` with breakdown tooltips and single-click access.
     - Single-component classes (2nd Vocabulary) gracefully retain their individual column view.
   - **Smart Peer Next Action Transition (`js/result.js`)**:
     - When finishing a component, smart next action automatically balances sibling components in the same topic before moving on to the next topic.
   - **Cache Buster Bump**: Bumped to `v20261103_v111` across `admin.html`, `dashboard.html`, `result.html`, `test.html`, and core modules.
   - **Verification**: 100% tests PASS (10/10 consecutive E2E runs with 132/132 assertions verified without defect).

1. **Phase 297: Level Column Standardization [COMPLETE]:**
   - Standardized level display across all admin panel tables to the compact format: `1st`, `2nd`, `3rd`, and `Alumni`.
   - Built canonical `toShortLevel(val)` helper in `js/api.js` with full support for ordinal suffixes and alumni normalization.
   - Fixed awkward two-line text wrapping (`2nd \n Level`) across Vocabulary Vault, Topic Blueprint, Student Registration, Student Inspection Modals, Curriculum Batches, Class Hub, and Program Management tables.
   - Added anti-wrapping CSS rule `.cell-level, .cell-level span, .badge-tag-level { white-space: nowrap !important; }` in `css/admin.css`.
   - Bumped cache buster in `admin.html` to `v20261103_v110`. 100% tests PASS (including 10/10 e2e runs).

1. **Phase 296: Topic Blueprint Re-Design [COMPLETE]:**
   - Replaced duplicate institution/program badges and separate level buttons with unified Curriculum Tabs: `[ ðŸŽ¯ CEC Camp 1st Level ] [ ðŸŽ¯ CEC Camp 2nd Level ] [ ðŸŽ¯ CEC Camp 3rd Level ]`.
   - Eliminated Board View and mode toggles; standardized solely on high-density Table View.
   - Relocated `[ âš’ï¸ Merge Topics ]` and `[ âš¡ Auto-Generate ]` to the bottom-right corner inside the bottom infobar action area.
   - Removed the dangerous Reset button from Vocabulary Vault and relocated it into **D — SYSTEM & DATA $\rightarrow$ System Settings (Danger Zone)** with mandatory `"RESET"` confirmation.
   - Cache buster bumped to `v20261103_v109`. 100% tests PASS.

1. **Phase 295: Class Tests Grid UI Streamlining [COMPLETE]:**
   - Removed redundant `CLASS` and `LEVEL` columns from `class-tests-grid` in `js/admin/app.js`.
   - Expanded `TITLE` column (`min-width: 280px; max-width: 600px;`), eliminating text clipping/ellipsis.
   - Standardized header badge and column to `ðŸŽ¯ Min. 70%` matching the 7Ã—7 Repetitive Mastery rule.
   - `admin.html` cache buster bumped to `v20261103_v108`. 100% tests PASS.

1. **Phase 294: Zero-Maintenance Auto-Provisioning & Auto-Sync of Tests from Vocabulary Vault [COMPLETE]:**
   - **Zero-Maintenance Architecture**: Tests are now automatically generated and synchronized whenever Vocabulary Vault data is imported or when a Vocabulary class is opened with 0 tests.
   - **`js/api.js`**: Enhanced `autoGenerateTestsHierarchy` with strict level/program/active-class targeting. Added `autoSyncClassTestsForLevel(levelNumberOrId, options)`.
   - **`js/admin/app.js`**: `renderClassHub` self-heals by automatically detecting if `classTests.length === 0` while vault words exist, generating tests on the fly and rendering the full thematic matrix without user manual action.
   - **`js/admin/vocab-vault.js`**: Excel import automatically triggers background auto-sync for all imported levels.
   - **Database**: Provisioned 6 test shells for `2nd Vocabulary` (Themes A and B).
   - **Cache Buster**: `admin.html` bumped to `v20261103_v107`. 100% tests PASS.

1. **Phase 293: Fix Class Hub Roster — Level-Exact Student Filter [COMPLETE]:**
   - **Root Cause Fixed**: `classStudents` filter in `renderClassHub` (`js/admin/app.js`) only matched program — now also matches level.
   - **`js/admin/app.js`**: Added `allClassLevels` to the `Promise.all` fetch, added `level_id` to the classes query, replaced old filter with new level-aware filter using `class_levels` junction table (fallback to `class.level_id`). Effective student level = `student.level_id ?? batch.current_level_id`.
   - **`admin.html`**: Cache buster bumped to `v20261103_v106`.
   - **Verified**: DB live check — 3rd Vocab = 29 correct students (0 from wrong level); 2nd Vocab = 17 correct students (0 from wrong level). All tests PASS.

1. **Phase 292: Vocabulary Vault Institution, Program & Level Columns Integration [COMPLETE]:**
   - **`js/api.js` Data Joins**: Updated `fetchVaultWords` select query to join `institutions(id, name, code)` and `programs(id, name, code)` on `vocabulary_vault`. All 820 items cleanly resolve with zero nulls.
   - **Words & Phrases Grid Table View**: Added explicit columns to `<thead>` and `renderRows` for `Institution`, `Program`, and `Level`:
     - Institution: Stylized cyan badge (`#38bdf8`) displaying `CEC`.
     - Program: Stylized purple badge (`#c084fc`) displaying `Camp`.
     - Level: Stylized slate badge (`#f8fafc`) displaying ordinal levels via `toOrdinalLevel()` (`2nd Level`, `3rd Level`).
   - **Dynamic Level Filter**: Added `#vault-level-filter` to the toolbar populated dynamically from vault records, enabling instant filtering by Level across both single words and phrases.
   - **Topic Blueprint Overhaul**:
     - Added prominent Institution (`INST: CEC`) and Program (`PROG: CAMP`) badges to the blueprint toolbar.
     - Implemented interactive Level Selector buttons (`[ ðŸŽ¯ 2ND LEVEL ]`, `[ ðŸŽ¯ 3RD LEVEL ]`) dynamically detected from vault records, enabling instant switching between 2nd Level and 3rd Level topics.
     - Added View Mode Switcher (`[ ðŸ—ºï¸ Board ]` and `[ ðŸ“Š Table ]`).
     - In **Board View**: Every topic card features a dedicated metadata hierarchy row `[CEC] [Camp] [2nd Level / 3rd Level]`.
     - In **Table View**: Explicit columns for `Institution`, `Program`, `Level`, `T.Code`, `Theme`, `Topic Code`, `Topic`, `Verbs`, `Adjs`, `Nouns`, `Phrases`, `Total Items`, and `Actions`.
     - Bottom infobar chips updated with Institution, Program, and Level metadata.
   - **Parity & Consistency**: Result page glow alignment, bright vibrant blue back button contrast, and 8-digit hex parsing verified alongside 100% test pass.

1. **Phase 291: Result Page Glow Alignment, 8-Digit Hex Fix & Bright Blue Back Button Contrast:**
   - **Bright Vibrant Blue Back Navigation Button Preserved**: Stripped `.btn-dashboard-primary` (`BACK TO ROOM` / `BACK TO LOBBY`) from tier-glow-active dark overrides. Restored `linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)` with bold white text and electric blue box shadow, ensuring unmistakable contrast against dark ghost button `VIEW ANSWER BREAKDOWN`.
   - **8-Digit Hex Normalization (Accidental Purple Eliminated)**: Fixed bitwise parser bug in `js/result.js` where `#00c000ff` shifted without stripping alpha bytes, corrupting Pure Green into Purple (`rgb(192, 0, 255)`). Stripped trailing alpha bytes and wired canonical RGB strings directly from `TOPSCORE_COLORS` constants (`STAR_RGB: '0, 192, 0'`, `C_RGB: '255, 255, 0'`).
   - **Synchronized Deferred Tier Glow across All 4 Content Panels**: Initial neutral dark slate borders (`rgba(255, 255, 255, 0.12)`) on all 4 cards (`#result-identity-card`, `#result-Test-name-container`, `#result-metrics-composite-card`, `#result-motivation-msg`). At the exact moment `#result-motivation-msg` reveals, all 4 cards ignite simultaneously with `1.5px solid rgba(var(--tier-rgb), 0.75-0.85)` and glowing box-shadows (Pure Green for 100% Star, Pure Yellow for Grade C).
   - **Animation Scope & Fallback Fix**: Passed `rgbColor` and `currentTier` into `runResultEntranceSequence`, resolving reference exceptions and adding `activateTierGlow()` to reduced motion and safety timeouts.
   - **/learn Codification**: Created `learning_proposal.md` and DECISION-042 establishing permanent architectural invariants.
   - **Verified**: Playwright live inspection of 100% Star (`result_star_100_verified.png`) and Grade C (`result_grade_c_verified.png`), plus 100% pass on `test_result_page_parity.cjs`, `verify_green_star_grading.mjs`, and `check_all_js_syntax.cjs`.

1. **Phase 290: Side Panel Perpetual Alphabetical Ordering for ABCD Groups:**
   - **Domain A Ordered (C -> D -> O)**: Curriculum (`classes-hub`), Dashboard (`dashboard`), Organization (`organization`).
   - **Domain B Ordered (C -> S)**: Dynamic active batches strictly ascending (Camp 132, Camp 133, Camp 134) followed by Students Registration (`student-registration`).
   - **Domain C Ordered (2 -> 3 -> T -> V)**: Dynamic active classes (2nd Vocabulary, 3rd Vocabulary) followed by Test Analytics (`tests`), Vocabulary Vault (`vocab_vault`).
   - **Domain D Ordered (M -> S)**: Modules (`modules`), System Settings (`settings`).
   - **display: contents Flow**: Configured `#sidebar-programs-list`, `#sidebar-classes-list`, `.sidebar-program-group`, and `.sidebar-class-group` with `display: contents;` in `css/admin.css` ensuring zero layout breakage and direct flexbox participation.
   - **Perpetual Sorter & MutationObserver**: Implemented `sortAllSidebarDomains()` and `initSidebarAlphabeticalObserver()` in `js/admin/admin-init.js`, auto-sorting items by clean text (stripping emojis/icons) with `{ numeric: true }` and maintaining continuous alphabetical order whenever dynamic items load.
   - **Verified**: `test_sidebar_alphabetical_verification.cjs`, `check_all_js_syntax.cjs`, and `test_result_page_parity.cjs` passing 100%.

2. **Phase 289: Result Page Harmonized Glow & 40px Button Height Alignment:**
   - **Flashcard Button Purged**: Completely removed unrequested `#open-flashcards-btn` from `result.html` and neutralized unhiding logic in `js/result.js`.
   - **Height 40px Alignment**: Aligned Action Row (`.result-action-slot`, `.btn-next-milestone`, `.tutor-remedial-segmented`), View Answer Breakdown (`.btn-breakdown-ghost`), and Back Navigation (`.btn-dashboard-primary`) to strictly 40px with uniform 11.5px font size (Weight 800) matching Image 1 wireframe. Zero vertical overflow or scrollbar.
   - **Harmonized Cohesive Color Palette**: Resolved mismatched cyan, purple, and blue borders. All panels (Metadata, Avatar Ring, Title, Topic row, Metrics Composite, Percentage, Points, Status Card, Action Buttons, Breakdown, and Back button) share the exact same `--tier-color` and `--tier-rgb`.
   - **Deferred Synchronized Tier Glow**: Configured initial clean neutral dark slate styling. Wired `activateTierGlow()` to fire at Step 6, exactly when `#result-motivation-msg` description reveals (`FAIL`...`EXCELLENT`). All panels illuminate simultaneously with glowing tier borders and radial background aura.
   - **Verified**: `test_result_page_parity.cjs`, `verify_green_star_grading.mjs`, and `check_all_js_syntax.cjs` passing 100%.

2. **Phase 288: Batch 132 Roster Activation & Ariwil Transfer to Batch 134:**
   - **Root Cause Resolution**: Resolved issue where Batch 132 appeared completely empty due to students having `level_id` set to Alumni (`b70a0ea2-785d-4291-9adf-a4cbd7a2c9a2`) and `is_active: false`.
   - **Database Trigger Fix**: Dropped dead legacy trigger `trigger_student_batch_change` and function `trg_student_batch_change()` which referenced dropped table `additional_members` and threw `42P01` on batch changes. Created migration `20261103070000_drop_legacy_batch_change_trigger.sql`.
   - **Batch 132 Reactivation**: Reactivated all 7 remaining students in Batch 132 with `level_id = 51589e1a-d96e-496e-92a3-d9d350483555` (3rd Level) and `is_active: true`.
   - **Ariwil Transfer**: Transferred Muhammad Ariwil Asrori to Batch 134 (`3e7288b7-a90e-4323-9b02-24e73991f0d7`) with `level_id = 9936683a-5b4a-4796-bb5d-a7fd8ecf0b71` (2nd Level) and `is_active: true`. Recorded `STUDENT_BATCH_TRANSFER` audit log.
   - **Batch 134 Level Alignment**: Backfilled remaining 16 students in Batch 134 to `level_id = 9936683a-5b4a-4796-bb5d-a7fd8ecf0b71` (2nd Level).
   - **Verified**: Frontend queries for Batch 132 (7 active students) and Batch 134 (17 active students including Ariwil) verified 100%.

2. **Phase 287: Result Page Wireframe Overhaul & Dual-View Parity:**
   - **Student Metadata (Strict 150px)**: Refactored `#result-identity-card` to match Student Dashboard `#welcome-banner-section` 1:1 in height, dividers, avatar photo ring, student name, and border-radius.
   - **Test Full Title (Strict 50px / 15%)**: 2-line format displaying Test Type/Title on line 1 and Assessment Topic/Theme on line 2 with fallback protection.
   - **Dynamic Metrics & Score/Grade Composite Card (35% Dynamic)**: Combined stacked vertical metrics (*CORRECT, PARTIAL, INCORRECT, POINTS*) with internal divider and 50px side-by-side Score % & Grade / Star vector row.
   - **Achievement Status (Strict 50px / 15%)**: Standardized 6-tier status (`FAIL`, `LESS`, `ENOUGH`, `GOOD`, `VERY GOOD`, `EXCELLENT`) matching Rule DECISION-018 and wireframe.
   - **Tutor 3-Button Controls (Strict 50px / 15%)**: Equal 3-column segmented button `[ NORMAL ]` `[ REMIDI ]` `[ FORGIVE ]` with uniform 11.5px font size, confirmation dialogs, and instant reactive reload.
   - **Student Next Action (Strict 50px / 15%)**: Displays tag `GO TO NEXT ASSESMENT:` with next test title link.
   - **View Answer Breakdown (Strict 30px / 10%)**: Reordered above Back button as Item 7.
   - **Bottom Navigation (Strict 30px / 10%)**: Contextual routing: `BACK TO ROOM` (`admin.html#class-hub`) for Tutor/Admin vs `BACK TO LOBBY` (`dashboard.html`) for Student.
   - **Dynamic Tier Aura**: Border color and background radial gradient across all result cards dynamically follow the student's exam score/grade calculation (`--tier-color`, `--tier-rgb`).
   - **Status Engine Helpers (`js/api.js`)**: Added `labelAttemptNormal` and `labelAttemptForgiven` with audit logs.
   - **Automated Verification**: `scripts/test_result_page_parity.cjs` passing 100% (all 30 IDs, styling, and logic verified).

1. **Phase 1: Terminology Unification (Quiz -> Task 100%):**
   - Normalized all 32 database test shells in 3rd Vocabulary to Task (`category: TASK`, `shell_code: *-TASK`, `title: * Task`).
   - Unified terminology across `js/dashboard.js`, `js/admin/app.js`, `js/admin/vocab-vault.js`, `js/admin/crud-modals.js`, `js/test.js`, and `supabase/seed.sql`.
2. **Phase 2: 7Ã—7 Repetitive Mastery Engine & Hard Gate Exam:**
   - Implemented `getTaskProgressVisual(passCount)` in `js/grading.js` with 5-tier gamified palette (Red `0/7` -> Star Green `7/7 ✓ Complete`).
   - Implemented realtime pass counter in `js/api.js` and `task-progress-chip` in `js/dashboard.js`.
   - Hard Gate Exam locked ðŸ”’ until all prerequisite tasks reach 7/7 passes in Edge Function and client.
   - Authorized remedial attempts exempted from 7Ã—7 task prerequisite lock in `start-test` Edge Function and client.
3. **Phase 3: Words Exam Written Mode & 70% Threshold:**
   - Configured all 4 Words Exams (`3A-WORDS-EXAM` ... `3D-WORDS-EXAM`) with `answer_type = 'written'` and `minimum_required_score = 70`.
   - Verified Rule 2.13 written tolerance engine (exact match 1.0 pt, typo 0.5 pt, root form 0.5 pt).
   - Standardized auto-leveling passing threshold in `submit-test` Edge Function to 70%.
4. **Phase 4: Class 2nd Vocabulary (Batch 134) Activation:**
   - Reactivated `2nd Vocabulary` (`VOCAB_2ND`, Level 2) with active status in database.
   - Verified Batch 134 links to 2nd Level and inherits 2nd Vocabulary.
5. **Phase 5: Level Progression System, Lifecycle Actions UI, Batch Transfer & Skor F:**
   - Updated Level 0 to `Alumni` (`toOrdinalLevel(0)` = `'Alumni'`).
   - Implemented Lifecycle actions column in `js/admin/student-management.js`: `ðŸš€ NEXT`, `ðŸ”’ HOLD`, `ðŸ” REPEAT`, `ðŸ”„ Transfer Batch`.
   - Implemented mass promotion `window.promoteAllEligibleStudents` and `window.promoteStudentNextLevel`.
   - Implemented `Transfer Batch` modal with `Inherit Batch Level`.
   - Implemented `Skor F (Forgiven)` waiver (`55%á¶ ` Red E) and Remedial Cap 60% (`60%á´¿` Yellow C) with audit logging.
   - Fixed Edge Function `start-test` level resolution to support Cumulative Retroactive Access (`testLevelNum <= studentLevelNum`) and Lifetime Universal Access for Alumni (`studentLevelNum === 0`).
   - Added graduating batch filter dropdown to `ðŸŽ“ Alumni` tab and hid promote button on alumni.
   - Persisted `alumni` status tab in `localStorage` and hash routing (Rule 2.20).
   - Fixed class modal in `js/dashboard.js` to render locked exams with unlock instructions rather than silently omitting them.
6. **Phase 6: Multi-Tenant Vocabulary Vault & 11-Column Import/Export:**
   - Added `institution_id` and `program_id` columns to `vocabulary_vault`.
   - Attributed all vault words to CEC and Camp.
   - Cascading dropdowns `[Institution] -> [Program] -> [Class] -> [Level]` in test gateway.
   - Standardized Excel import/export to 11 columns in `js/api.js` and `js/admin/vocab-vault.js`.
7. **Phase 7: Full E2E Check System (10Ã— Consecutive Pass Protocol):**
   - Created `scripts/test_vocab_7x7_and_leveling_e2e.mjs` and `scripts/test_start_test_gating.mjs`.
   - Executed 10 consecutive full realtime E2E cycles: 10/10 PASS (132/132 assertions verified without defect).
   - Validated all 40 JavaScript files in workspace with `node --check` (100% clean).

## Next Exact Action
1. All 7 phases verified, hardened, and regression tested with zero defects. Ready for production release.

## Audit & Cleanup Accomplishments (Phase 284):
1. **Disk Bloat Removed (> 61 MB Freed, 670+ Unused Files Cleaned):**
   - Cleaned all 415 dead files in `scratch/` (-48.7 MB, including multi-MB JSON dumps).
   - Deleted `scripts/archive/` containing 241 obsolete scripts and old HTML tester mockups (-3.70 MB).
   - Deleted `supabase_deploy/` containing 3 duplicate SQL dump files (-1.80 MB; canonical preserved in `supabase/schema.sql` and `supabase/migrations/`).
   - Deleted `supabase/data.sql` (-7.32 MB exact duplicate of canonical `supabase/seed.sql`).
   - Deleted duplicate `docs/ASSESSMENT_EXECUTION_AUDIT.md` (canonical preserved in `docs/archive/`).
   - Cleaned 11 one-off inspect and redundant version bump scripts from `scripts/` root.
   - Partitioned oversized `docs/CHANGELOG.md` (1.59 MB -> 111.4 KB) by safely archiving historical Phases 1–228 entries into `docs/archive/CHANGELOG_ARCHIVE.md`.

2. **Production Dead Code Pruning (> 2,000 Lines Pruned):**
   - `js/admin/class.js`: Pruned dead functions `renderAssignments` (190 lines), `renderProgressView` (484 lines), and `renderRecalibrator` (8 lines).
   - `js/admin/imports-exports.js`: Pruned dead functions `renderImportStudents` (746 lines) and `renderImportQuestions` (545 lines). Retained only the active, canonical `renderExportQuestions`.
   - `js/admin/cv-export.js`: Pruned dead `triggerCVExport` (74 lines).
   - `css/admin.css`: Pruned dead `.global-asm-*` rules (92 lines).

3. **Button & Handler Bug Fixes (Zero Broken / Zero Double Buttons):**
   - Fixed `student-management.js` line 1306 "Authorize Retake" button (`ReferenceError: showToast is not defined`) by ensuring global `window.showToast` fallback.
   - Fixed `admin-deck.js` broken "Create Profile" button (`openCrudModal('user_professionals')`) by replacing the deprecated profile card with a clean, functional Platform Overview card.
   - Fixed hardcoded version `?v=5.3.2` across `panel-c-builder.js`, `classes-management.js`, `program-management.js`, and `avatar-engine.js` to project standard `?v=20261102_v104`.
   - Fixed duplicate auto-generate and exam buttons in `vocab-vault.js` (both in Table View bottom infobar and Blueprint View bottom infobar).

4. **Modernized Legacy Terminology (`assessment` / `asm` -> `test`):**
   - `admin.html` & `crud-modals.js`: Modernized modal IDs `bulk-edit-asm-*` -> `bulk-edit-tests-*`.
   - `result.html` & `js/result.js`: Modernized element IDs `result-asm-*` -> `result-test-*` and variable `nextAsm` -> `nextTest`.
   - `dashboard.html` & `js/dashboard.js`: Modernized notification strings from `assessment` to `test`, variable `nextAsm` to `nextTest`, and added `.next-test-*` dual classes.
   - `css/dashboard.css`: Modernized `.next-asm-*` class selectors with `.next-test-*` aliases.
   - `js/admin/dossier_export.js` & `student-management.js`: Modernized fallback titles and comments to `Test`.
   - `css/admin.css`: Modernized comment from `Master Subject List` to `Master Class List`.

5. **Authoritative Verifications Run & Passing 100%:**
   - `node scripts/check_all_js_syntax.cjs`: ALL 40 JavaScript files passed syntax validation (`node --check`).
   - `node scripts/verify_green_star_grading.mjs`: 100% PASS (Green Star grading scale and color tokens).
   - `node scripts/test_student_dashboard_exam_parity.mjs`: 100% PASS (Exam-only metrics and multi-tier ranking).
   - `node scripts/test_sequential_exam_prerequisite.mjs`: 100% PASS (Theme exam prerequisites and sequential progression).

Status: COMPLETE

## Next Exact Action
1. All 7 test suites pass 100%. Master Blueprint and Universal "TopsCore by Mr. Top" Banner deployed to origin/main. System is running fast and clean. Ready for new user instructions.

## Database State
- Canonical schema: `supabase/schema.sql`
- Canonical seed: `supabase/seed.sql`
- Migrations: `supabase/migrations/`
- RLS status: ENABLED across all tables

## Frontend State
- Pages: `index.html`, `admin.html`, `dashboard.html`, `test.html`, `result.html`
- Modules: ES6 standard modules with unified cache buster `v=20261106_v136`
- Service Worker: `topscore-cache-option-a-v64`
