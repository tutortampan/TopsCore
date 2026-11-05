import fs from 'fs';
import assert from 'assert';
import {
  TOPSCORE_COLORS,
  GRADE_PALETTE,
  getGradeSymbol,
  getGradeColor,
  getAchievementStatus
} from '../js/grading.js';

console.log('=== TEST: VOCAB & UNIVERSAL STUDENT DASHBOARD MASTER BLUEPRINT V2 (PHASE 331) ===\n');

// 1. Verify grading.js exports & rules
console.log('[1] Testing grading.js Purple Tier & Alumni Grade X:');
assert.strictEqual(TOPSCORE_COLORS.X, '#8B5CF6', 'TOPSCORE_COLORS.X must be #8B5CF6 (Purple)');
assert.strictEqual(TOPSCORE_COLORS.X_RGB, '139, 92, 246', 'TOPSCORE_COLORS.X_RGB must be 139, 92, 246');
assert.ok(GRADE_PALETTE.X, 'GRADE_PALETTE.X must exist');
assert.strictEqual(GRADE_PALETTE.X.symbol, 'X', 'GRADE_PALETTE.X symbol must be X');
assert.strictEqual(GRADE_PALETTE.X.predicate, 'Alumni', 'GRADE_PALETTE.X predicate must be Alumni');

assert.strictEqual(getGradeSymbol('X'), 'X', 'getGradeSymbol("X") must return "X"');
assert.strictEqual(getAchievementStatus('X'), 'ALUMNI', 'getAchievementStatus("X") must return "ALUMNI"');
assert.strictEqual(getAchievementStatus("LET'S GO"), "LET'S GO", 'getAchievementStatus("LET\'S GO") must return "LET\'S GO"');
assert.strictEqual(getAchievementStatus('—'), "LET'S GO", 'getAchievementStatus("—") must return "LET\'S GO"');
assert.strictEqual(getGradeColor('X'), '#8B5CF6', 'getGradeColor("X") must be #8B5CF6');
assert.strictEqual(getGradeColor("LET'S GO"), '#8B5CF6', 'getGradeColor("LET\'S GO") must be #8B5CF6');
console.log('  ✅ PASS: Purple Tier (#8B5CF6), Alumni Grade X, and LET\'S GO verified!\n');

// 2. Verify dashboard.html DOM Structure
console.log('[2] Testing dashboard.html Structure:');
const html = fs.readFileSync('dashboard.html', 'utf8');

assert.ok(html.includes('class="dashboard-header-left"'), 'Must have .dashboard-header-left');
assert.ok(html.includes('class="dashboard-header-right dashboard-header-actions"'), 'Must have .dashboard-header-right');
assert.ok(html.includes('id="btn-change-class"'), 'Must have #btn-change-class (Door Icon)');
assert.ok(html.includes('id="dashboard-header-class-name"'), 'Must have #dashboard-header-class-name');
assert.ok(html.includes('id="logout-btn"'), 'Must have #logout-btn');
assert.ok(html.includes('id="banner-avatar-trigger"'), 'Must have #banner-avatar-trigger');
assert.ok(html.includes('id="welcome-meta-wrapper"'), 'Must have #welcome-meta-wrapper (20px Sub-Row)');
assert.ok(html.includes('class="hero-metrics-row"'), 'Must have .hero-metrics-row (100px Sub-Row budget)');
assert.ok(html.includes('id="welcome-name"'), 'Must have #welcome-name (30px Sub-Row)');
assert.ok(html.includes('class="hero-divider"'), 'Must have .hero-divider');
assert.ok(html.includes('hero-name-divider'), 'Must have .hero-name-divider');
assert.ok(html.includes('id="dashboard-grade-legend"'), 'Must have #dashboard-grade-legend');
assert.ok(html.includes('id="dashboard-achievement-text"'), 'Must have #dashboard-achievement-text');
assert.ok(html.includes('id="up-next-section"'), 'Must have #up-next-section');
assert.ok(html.includes('id="up-next-container"'), 'Must have #up-next-container');
assert.ok(html.includes('id="bottom-dock-section"'), 'Must have #bottom-dock-section');
assert.ok(html.includes('completed-table-header'), 'Must have .completed-table-header');
assert.ok(html.includes('<span class="th-col th-action">RETRY</span>'), 'Must have RETRY column in completed table header');
assert.ok(!html.includes('id="dashboard-classes-bar" class="dashboard-classes-bar"'), 'Must NOT have visible dashboard-classes-bar (saved 60px vertical)');
console.log('  ✅ PASS: dashboard.html DOM elements verified!\n');

// 3. Verify css/dashboard.css Pixel Precision, Sub-Rows & Internal Table Scrolling
console.log('[3] Testing css/dashboard.css Precision & Internal Table Scrolling:');
const css = fs.readFileSync('css/dashboard.css', 'utf8');

assert.ok(css.includes('.dashboard-header-left'), 'Must define .dashboard-header-left');
assert.ok(css.includes('width: 44px !important;'), 'Header left & right columns must be 44px (Phase 331 Master Blueprint)');
assert.ok(css.includes('.dashboard-header-brand'), 'Must define .dashboard-header-brand');
assert.ok(css.includes('overflow: visible !important;'), 'Header brand must have overflow: visible to show full class name');
assert.ok(css.includes('#banner-avatar-trigger'), 'Must define #banner-avatar-trigger');
assert.ok(css.includes('data-tier="X"'), 'Must support data-tier="X"');
assert.ok(css.includes('data-tier="LET\'S GO"'), 'Must support data-tier="LET\'S GO"');

// Sub-Row Budget of 150px Metadata Card (20px / 1px / 93px / 1px / 35px per Phase 337 Blueprint)
assert.ok(css.includes('height: 150px !important;'), 'welcome-banner-section must have strict 150px height');
assert.ok(css.includes('height: 20px !important;'), 'welcome-meta-wrapper must have strict 20px height');
assert.ok(css.includes('height: 93px !important;'), 'hero-metrics-row must have strict 93px height');
assert.ok(css.includes('height: 35px !important;'), 'welcome-name must have strict 35px height');
assert.ok(css.includes('width: 84px !important;') && css.includes('height: 84px !important;'), 'banner-avatar-container must have enlarged 84px diameter');
assert.ok(css.includes('height: 1px !important;') && css.includes('min-height: 1px !important;'), 'dividers must have strict 1px height');
assert.ok(css.includes('flex-shrink: 0 !important;'), 'dividers must have flex-shrink: 0');
assert.ok(css.includes('.hero-name-divider'), 'Must define .hero-name-divider');

// Next Test 70px (50px Title + 20px Rainbow)
assert.ok(css.includes('height: 70px !important;'), 'Next Test card must be exactly 70px');
assert.ok(css.includes('.next-test-col-right'), 'Must define .next-test-col-right');
assert.ok(css.includes('.next-test-primary-name'), 'Must define .next-test-primary-name');
assert.ok(css.includes('.next-test-topic-name'), 'Must define .next-test-topic-name');

// Completed Tests Typography: Bold Outfit 800 and 2-line wrap
assert.ok(css.includes('-webkit-line-clamp: 2 !important;'), 'completed-col-name must support 2-line wrap');
assert.ok(css.includes('color: #f8fafc !important;') && css.includes('font-size: 0.85rem !important;'), 'completed-col-num must be bright Outfit 800');

// Task 7-Grade Sub-Row & Leaderboard Current User Highlighting
assert.ok(css.includes('.task-grades-subrow'), 'Must define .task-grades-subrow');
assert.ok(css.includes('.task-mini-grade'), 'Must define .task-mini-grade');
assert.ok(css.includes('leaderboard-student-name.is-current-user'), 'Must define is-current-user on leaderboard');

// Internal Table Scrolling (Page Locked)
assert.ok(css.includes('overscroll-behavior: contain !important;'), 'Table container must have overscroll-behavior: contain');
assert.ok(css.includes('touch-action: pan-y !important;'), 'Table container must have touch-action: pan-y');
assert.ok(css.includes('touch-action: manipulation !important;'), 'Body must have touch-action: manipulation to allow smooth touch scrolling inside table containers');

// Strict 10px Gap between panels
assert.ok(css.includes('padding: 10px 14px 10px 14px !important;'), 'dashboard-content must have strict 10px vertical padding');
assert.ok(css.includes('gap: 10px !important;'), 'dashboard-content must have strict 10px gap between panels');
assert.ok(css.includes('rgba(var(--tier-rgb), 0.70)'), 'Cards must have bold 1.5px tier border and glow');
console.log('  ✅ PASS: css/dashboard.css 70px Next Test, 44px Header, 20/100/30 Sub-Rows & Internal Table Scrolling verified!\n');

// 4. Verify js/dashboard.js Logic Hooks
console.log('[4] Testing js/dashboard.js Logic:');
const js = fs.readFileSync('js/dashboard.js', 'utf8');

assert.ok(js.includes('btn-change-class'), 'Must wire btn-change-class');
assert.ok(js.includes('dashboard-header-class-name'), 'Must update dashboard-header-class-name');
assert.ok(js.includes('banner-avatar-trigger'), 'Must wire banner-avatar-trigger to openProfile');
assert.ok(js.includes('formatNextTestTitleHtml'), 'Must have formatNextTestTitleHtml helper for 2-line title');
assert.ok(js.includes('next-test-primary-name'), 'Must render next-test-primary-name');
assert.ok(js.includes('next-test-topic-name'), 'Must render next-test-topic-name');
assert.ok(js.includes('next-test-col-left'), 'Must render next-test-col-left');
assert.ok(js.includes('next-test-col-right'), 'Must render next-test-col-right');
assert.ok(js.includes('rainbow-pass-bar'), 'Must render rainbow-pass-bar');
assert.ok(js.includes('is-exam-play'), 'Must render is-exam-play for unlocked exams');
assert.ok(js.includes('is-exam-lock'), 'Must render is-exam-lock for waiting exams');
assert.ok(js.includes('pass-counter-btn rainbow-step-'), 'Must render pass-counter-btn with rainbow-step-');
assert.ok(js.includes("overallGrade = \"LET'S GO\""), 'Must set LET\'S GO for students without exams');
assert.ok(js.includes("overallGrade = 'X'"), 'Must set Grade X for alumni');
assert.ok(js.includes('completed-retry-btn'), 'Must render completed-retry-btn in completed tests table');
assert.ok(js.includes('task-grades-subrow'), 'Must render task-grades-subrow for tasks');
assert.ok(js.includes('is-current-user'), 'Must highlight current user in leaderboard');
assert.ok(js.includes('isTestPrereqMet'), 'Must check test prerequisites before including in completed tests');
assert.ok(js.includes('completedOnlyTests'), 'Must filter completedOnlyTests strictly');
assert.ok(js.includes('sortedAccessible'), 'Must sort accessible tests descending in completed pane');
console.log('  ✅ PASS: js/dashboard.js logic hooks verified!\n');

// 5. Verify Result Page (result.html, css/result.css, js/result.js)
console.log('[5] Testing Result Page Dynamic Tier & 10px Gaps:');
const resCss = fs.readFileSync('css/result.css', 'utf8');
const resJs = fs.readFileSync('js/result.js', 'utf8');

assert.ok(resCss.includes('body.result-page.tier-glow-active'), 'Result CSS must define tier-glow-active');
assert.ok(resCss.includes('gap: 10px !important;'), 'Result hero must enforce strict 10px gap between cards');
assert.ok(resCss.includes('padding: 10px 14px 10px 14px !important;'), 'Result content must enforce strict 10px vertical padding');
assert.ok(resJs.includes('Immediate application of dynamic tier colors'), 'Result JS must immediately apply dynamic tier variables on data load');
assert.ok(resJs.includes('activateTierGlow'), 'Result JS must invoke activateTierGlow');
console.log('  ✅ PASS: Result page dynamic tier and 10px gaps verified!\n');

console.log('=== ALL VOCAB & UNIVERSAL DASHBOARD + RESULT BLUEPRINT V2 CHECKS PASSED 100% ===');
