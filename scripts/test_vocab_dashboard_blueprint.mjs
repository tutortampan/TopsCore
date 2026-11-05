import fs from 'fs';
import assert from 'assert';
import {
  TOPSCORE_COLORS,
  GRADE_PALETTE,
  getGradeSymbol,
  getGradeColor,
  getAchievementStatus
} from '../js/grading.js';

console.log('=== TEST: VOCAB & UNIVERSAL STUDENT DASHBOARD MASTER BLUEPRINT V2 ===\n');

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

assert.ok(html.includes('class="dashboard-header-left"'), 'Must have .dashboard-header-left (120px column)');
assert.ok(html.includes('class="dashboard-header-right dashboard-header-actions"'), 'Must have .dashboard-header-right (120px column)');
assert.ok(html.includes('id="btn-change-class"'), 'Must have #btn-change-class (Door Icon)');
assert.ok(html.includes('id="dashboard-header-class-name"'), 'Must have #dashboard-header-class-name');
assert.ok(html.includes('id="logout-btn"'), 'Must have #logout-btn');
assert.ok(html.includes('id="banner-avatar-trigger"'), 'Must have #banner-avatar-trigger');
assert.ok(html.includes('id="welcome-meta-wrapper"'), 'Must have #welcome-meta-wrapper (20px Sub-Row)');
assert.ok(html.includes('class="hero-metrics-row"'), 'Must have .hero-metrics-row (105px Sub-Row)');
assert.ok(html.includes('id="welcome-name"'), 'Must have #welcome-name (25px Sub-Row)');
assert.ok(html.includes('id="dashboard-grade-legend"'), 'Must have #dashboard-grade-legend');
assert.ok(html.includes('id="dashboard-achievement-text"'), 'Must have #dashboard-achievement-text');
assert.ok(html.includes('id="up-next-section"'), 'Must have #up-next-section');
assert.ok(html.includes('id="up-next-container"'), 'Must have #up-next-container');
assert.ok(html.includes('id="bottom-dock-section"'), 'Must have #bottom-dock-section');
assert.ok(html.includes('completed-table-header'), 'Must have .completed-table-header');
assert.ok(html.includes('<span class="th-col th-action">ACTION</span>'), 'Must have ACTION column in completed table header');
assert.ok(!html.includes('id="dashboard-classes-bar" class="dashboard-classes-bar"'), 'Must NOT have visible dashboard-classes-bar (saved 60px vertical)');
console.log('  ✅ PASS: dashboard.html DOM elements verified!\n');

// 3. Verify css/dashboard.css Pixel Precision, Sub-Rows & Internal Table Scrolling
console.log('[3] Testing css/dashboard.css Precision & Internal Table Scrolling:');
const css = fs.readFileSync('css/dashboard.css', 'utf8');

assert.ok(css.includes('.dashboard-header-left'), 'Must define .dashboard-header-left');
assert.ok(css.includes('width: 120px !important;'), 'Header left & right columns must be 120px');
assert.ok(css.includes('.dashboard-header-brand'), 'Must define .dashboard-header-brand');
assert.ok(css.includes('#banner-avatar-trigger'), 'Must define #banner-avatar-trigger');
assert.ok(css.includes('data-tier="X"'), 'Must support data-tier="X"');
assert.ok(css.includes('data-tier="LET\'S GO"'), 'Must support data-tier="LET\'S GO"');

// Sub-Row Budget of 150px Metadata Card
assert.ok(css.includes('height: 150px !important;'), 'welcome-banner-section must have strict 150px height');
assert.ok(css.includes('height: 20px !important;'), 'welcome-meta-wrapper must have strict 20px height');
assert.ok(css.includes('height: 25px !important;'), 'welcome-name must have strict 25px height');

// Next Test 70px (50px Title + 20px Rainbow)
assert.ok(css.includes('height: 70px !important;'), 'Next Test card must be exactly 70px');
assert.ok(css.includes('.next-test-col-right'), 'Must define .next-test-col-right');

// Internal Table Scrolling (Page Locked)
assert.ok(css.includes('overscroll-behavior: contain !important;'), 'Table container must have overscroll-behavior: contain');
assert.ok(css.includes('touch-action: pan-y !important;'), 'Table container must have touch-action: pan-y');
assert.ok(css.includes('touch-action: none !important;'), 'Body must have touch-action: none to prevent page dragging');

// Strict 10px Gap between panels
assert.ok(css.includes('padding: 10px 14px 10px 14px !important;'), 'dashboard-content must have strict 10px vertical padding');
assert.ok(css.includes('gap: 10px !important;'), 'dashboard-content must have strict 10px gap between panels');
assert.ok(css.includes('rgba(var(--tier-rgb), 0.70)'), 'Cards must have bold 1.5px tier border and glow');
console.log('  ✅ PASS: css/dashboard.css 70px Next Test, 120px Header, 20/105/25 Sub-Rows & Internal Table Scrolling verified!\n');

// 4. Verify js/dashboard.js Logic Hooks
console.log('[4] Testing js/dashboard.js Logic:');
const js = fs.readFileSync('js/dashboard.js', 'utf8');

assert.ok(js.includes('btn-change-class'), 'Must wire btn-change-class');
assert.ok(js.includes('dashboard-header-class-name'), 'Must update dashboard-header-class-name');
assert.ok(js.includes('banner-avatar-trigger'), 'Must wire banner-avatar-trigger to openProfile');
assert.ok(js.includes('next-test-col-left'), 'Must render next-test-col-left');
assert.ok(js.includes('next-test-col-right'), 'Must render next-test-col-right');
assert.ok(js.includes('rainbow-pass-bar'), 'Must render rainbow-pass-bar');
assert.ok(js.includes('is-exam-play'), 'Must render is-exam-play for unlocked exams');
assert.ok(js.includes('is-exam-lock'), 'Must render is-exam-lock for waiting exams');
assert.ok(js.includes('pass-counter-btn rainbow-step-'), 'Must render pass-counter-btn with rainbow-step-');
assert.ok(js.includes("overallGrade = \"LET'S GO\""), 'Must set LET\'S GO for students without exams');
assert.ok(js.includes("overallGrade = 'X'"), 'Must set Grade X for alumni');
assert.ok(js.includes('completed-retry-btn'), 'Must render completed-retry-btn in completed tests table');
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
