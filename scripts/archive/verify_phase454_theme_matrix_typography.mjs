import fs from 'fs';
import assert from 'assert';

console.log('=== TEST: VERIFY PHASE 454 THEME MATRIX SUBHEADER TYPOGRAPHY ===\n');

const adminCss = fs.readFileSync('css/admin.css', 'utf8');

// 1. Verify .test-subtag font size is exactly 11px !important
console.log('[1] Verifying #class-attendance-grid .test-subtag font size:');
const subtagMatch = adminCss.match(/#class-attendance-grid\s+\.test-subtag\s*\{([^}]+)\}/);
assert.ok(subtagMatch, '#class-attendance-grid .test-subtag rule must exist');
const subtagRules = subtagMatch[1];

assert.ok(
  subtagRules.includes('font-size: 11px !important;'),
  '.test-subtag must enforce font-size: 11px !important;'
);
assert.ok(
  !subtagRules.includes('0.40rem'),
  '.test-subtag must NOT have 0.40rem (6.4px)'
);
console.log('  ✔ .test-subtag font-size is strictly 11px (eradicated 0.40rem / 6.4px).');

// 2. Verify font weight is 700 !important
console.log('\n[2] Verifying font-weight:');
assert.ok(
  subtagRules.includes('font-weight: 700 !important;'),
  '.test-subtag must enforce font-weight: 700 !important;'
);
console.log('  ✔ .test-subtag font-weight is 700 (Bold).');

// 3. Verify tactical cyan color #38bdf8
console.log('\n[3] Verifying tactical cyan color #38bdf8:');
assert.ok(
  subtagRules.includes('color: #38bdf8 !important;'),
  '.test-subtag default color must be #38bdf8 !important;'
);
assert.ok(
  adminCss.includes('#class-attendance-grid .test-subtag-task { color: #38bdf8 !important; }'),
  '.test-subtag-task must be tactical cyan #38bdf8'
);
assert.ok(
  adminCss.includes('#class-attendance-grid .test-subtag-test-score { color: #38bdf8 !important; }'),
  '.test-subtag-test-score must be tactical cyan #38bdf8'
);
assert.ok(
  adminCss.includes('#class-attendance-grid .test-subtag-test-pts { color: #38bdf8 !important; }'),
  '.test-subtag-test-pts must be tactical cyan #38bdf8'
);
assert.ok(
  adminCss.includes('#class-attendance-grid .test-subtag-test-grade { color: #38bdf8 !important; }'),
  '.test-subtag-test-grade must be tactical cyan #38bdf8'
);
console.log('  ✔ All 4 theme subheaders (PROGRESS, SCORE, POINTS, GRADE) enforce #38bdf8 cyan.');

// 4. Verify Theme Columns width protection
console.log('\n[4] Verifying theme columns not constrained by 36px col-exam-score:');
assert.ok(
  adminCss.includes('th.col-exam-score:not(.col-test-theme-score)'),
  'th.col-exam-score must exclude .col-test-theme-score'
);
assert.ok(
  adminCss.includes('th.col-exam-pts:not(.col-test-theme-total)'),
  'th.col-exam-pts must exclude .col-test-theme-total'
);
console.log('  ✔ Theme columns protected from 36px weekly exam width constraint.');

console.log('\n🎉 ALL PHASE 454 THEME MATRIX TYPOGRAPHY ASSERTIONS PASSED (100%)!\n');

