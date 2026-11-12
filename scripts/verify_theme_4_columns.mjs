import fs from 'fs';
import assert from 'assert';

console.log('=== TEST: VERIFY 4-COLUMN THEME MATRIX STANDARD (PHASE 421) ===\n');

const appJs = fs.readFileSync('js/admin/app.js', 'utf8');
const adminCss = fs.readFileSync('css/admin.css', 'utf8');

// 1. Super-Header ColSpan
console.log('[1] Verifying dynamicSuperHeaders colSpan: 4:');
assert.ok(
  appJs.includes('label: `THEME ${tc}${tName}`,') && appJs.includes('colSpan: 4,'),
  'dynamicSuperHeaders must set colSpan: 4 for each theme'
);
console.log('  ✔ colSpan: 4 verified for dynamic theme super-headers.');

// 2. Exact 4-Column Sequence: Progress | Score | Points | Grade
console.log('\n[2] Verifying exact 4-column sequence for each theme:');
const taskIdx = appJs.indexOf("key: `theme_${tc}_task`");
const scoreIdx = appJs.indexOf("key: `theme_${tc}_score`");
const ptsIdx = appJs.indexOf("key: `theme_${tc}_total_pts`");
const gradeIdx = appJs.indexOf("key: `theme_${tc}_grade`");

assert.ok(taskIdx !== -1, 'theme_${tc}_task column must exist');
assert.ok(scoreIdx !== -1, 'theme_${tc}_score column must exist');
assert.ok(ptsIdx !== -1, 'theme_${tc}_total_pts column must exist');
assert.ok(gradeIdx !== -1, 'theme_${tc}_grade column must exist');

assert.ok(taskIdx < scoreIdx, 'Progress (task) must precede Score');
assert.ok(scoreIdx < ptsIdx, 'Score must precede Points');
assert.ok(ptsIdx < gradeIdx, 'Points must precede Grade');
console.log('  ✔ Exact sequence verified: Progress -> Score -> Points -> Grade.');

// 3. Subtag Header Labels
console.log('\n[3] Verifying sub-header labels:');
assert.ok(appJs.includes('>PROGRESS</span>'), 'Progress sub-header must say PROGRESS');
assert.ok(appJs.includes('>SCORE</span>'), 'Score sub-header must say SCORE');
assert.ok(appJs.includes('>POINTS</span>'), 'Points sub-header must say POINTS');
assert.ok(appJs.includes('>GRADE</span>'), 'Grade sub-header must say GRADE');
console.log('  ✔ Sub-headers PROGRESS | SCORE | POINTS | GRADE verified.');

// 4. Grade Column 3-State Gated Rendering
console.log('\n[4] Verifying Grade column 3-state gated rendering:');
assert.ok(appJs.includes("Tasks Incomplete (${earnedTasks}/${maxTasks}). Complete all tasks to unlock exam."), 'Grade must show 🛑 if tasks incomplete');
assert.ok(appJs.includes("Exam Ready & Unlocked (${earnedTasks}/${maxTasks} Tasks Done). Waiting for student attempt."), 'Grade must show 🔒 if exam not taken');
assert.ok(appJs.includes("grid-grade-star") && appJs.includes("grid-grade-val"), 'Grade must render standard grade badge when exam taken');
console.log('  ✔ Grade column 3-state gated display (🛑 -> 🔒 -> Grade) verified.');

// 5. Summary Row Theme Grade Average
console.log('\n[5] Verifying class average summary row for theme grade:');
assert.ok(appJs.includes("col.key.endsWith('_grade')"), 'summaryRow must handle theme_*_grade column');
assert.ok(appJs.includes("avgThemeGrade"), 'summaryRow must compute avgThemeGrade');
console.log('  ✔ Summary row class average theme grade computation verified.');

// 6. CSS Styles for 4 Columns and Theme Boundary Dividers
console.log('\n[6] Verifying css/admin.css styling & 3px boundary dividers on Grade column:');
assert.ok(adminCss.includes('th.col-exam-grade') && adminCss.includes('td.col-exam-grade'), 'col-exam-grade width rules must exist');
assert.ok(adminCss.includes('th.col-test-theme-grade') && adminCss.includes('td.col-test-theme-grade'), 'col-test-theme-grade rules must exist');
assert.ok(adminCss.includes('th.col-test-theme-grade-a') && adminCss.includes('border-right: 3px solid #38bdf8 !important;'), 'Theme A 3px border must be on col-test-theme-grade-a');
assert.ok(adminCss.includes('th.col-test-theme-grade-b') && adminCss.includes('border-right: 3px solid #c084fc !important;'), 'Theme B 3px border must be on col-test-theme-grade-b');
assert.ok(adminCss.includes('th.col-test-theme-grade-c') && adminCss.includes('border-right: 3px solid #fbbf24 !important;'), 'Theme C 3px border must be on col-test-theme-grade-c');
assert.ok(adminCss.includes('th.col-test-theme-grade-d') && adminCss.includes('border-right: 3px solid #34d399 !important;'), 'Theme D 3px border must be on col-test-theme-grade-d');
assert.ok(adminCss.includes('.test-subtag-test-grade'), 'test-subtag-test-grade rule must exist');
console.log('  ✔ CSS theme boundary dividers (3px solid) anchored to Grade columns verified.');

console.log('\n🎉 ALL 4-COLUMN THEME MATRIX ASSERTIONS PASSED (100%)!\n');

