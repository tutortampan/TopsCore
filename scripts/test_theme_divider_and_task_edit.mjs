import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appJsPath = path.resolve(__dirname, '../js/admin/app.js');
const adminCssPath = path.resolve(__dirname, '../css/admin.css');

const appJs = fs.readFileSync(appJsPath, 'utf8');
const adminCss = fs.readFileSync(adminCssPath, 'utf8');

console.log('--- RUNNING THEME DIVIDER & TASK PROGRESS EDITING TESTS ---');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName}`);
  }
}

// 1. Theme Dividing Lines Realignment in admin.css (Anchored to Grade column - Phase 421)
assert(
  adminCss.includes('th.col-test-theme-grade-a,') &&
  adminCss.includes('td.col-test-theme-grade-a,') &&
  adminCss.includes('border-right: 3px solid #38bdf8 !important;'),
  'admin.css: Theme A 3px divider line is placed on GRADE column (col-test-theme-grade-a)'
);

assert(
  adminCss.includes('th.col-test-theme-grade-b,') &&
  adminCss.includes('td.col-test-theme-grade-b,') &&
  adminCss.includes('border-right: 3px solid #c084fc !important;'),
  'admin.css: Theme B 3px divider line is placed on GRADE column (col-test-theme-grade-b)'
);

assert(
  adminCss.includes('th.col-test-theme-grade-c,') &&
  adminCss.includes('td.col-test-theme-grade-c,') &&
  adminCss.includes('border-right: 3px solid #fbbf24 !important;'),
  'admin.css: Theme C 3px divider line is placed on GRADE column (col-test-theme-grade-c)'
);

assert(
  adminCss.includes('th.col-test-theme-grade-d,') &&
  adminCss.includes('td.col-test-theme-grade-d,') &&
  adminCss.includes('border-right: 3px solid #34d399 !important;'),
  'admin.css: Theme D 3px divider line is placed on GRADE column (col-test-theme-grade-d)'
);

assert(
  !adminCss.includes('td.col-test-theme-total-a {') &&
  !adminCss.includes('td.col-test-theme-total-b {') &&
  !adminCss.includes('td.col-test-theme-total-c {') &&
  !adminCss.includes('td.col-test-theme-total-d {'),
  'admin.css: PTS columns (col-test-theme-total-*) do not have misaligned dividing borders'
);

// 2. Table Footer Horizontal Baseline Alignment (Gambar 2 -> Gambar 3)
assert(
  appJs.includes('const availHeight = Math.max(260, window.innerHeight - rect.top - bannerHeight - lowerPanelHeight);') &&
  !appJs.includes('const availHeight = Math.max(260, window.innerHeight - rect.top - bannerHeight - lowerPanelHeight - 10);'),
  'app.js: fitMatrixToScreen eliminated - 10 deduction so table footer sits flush with sidebar-footer'
);

// 3. Task Progress Live Editing on Master Edit Mode
assert(
  appJs.includes('window.onMatrixTaskChange = (studentId, themeCode, maxTasks, valStr) => {') &&
  appJs.includes('window.saveRowManualTaskInput = async (studentId, themeCode, maxTasks) => {'),
  'app.js: onMatrixTaskChange and saveRowManualTaskInput handlers are defined'
);

assert(
  appJs.includes('class="input-matrix-task-progress input-matrix-task-progress-${row.id}-${tc.toLowerCase()}"') &&
  appJs.includes('data-theme-code="${tc}"') &&
  appJs.includes('data-max-tasks="${maxT}"'),
  'app.js: Task Progress renders interactive capsule input when Edit Mode is ON'
);

assert(
  appJs.includes('action: isComplete ? \'forgive\' : \'manual\',') &&
  appJs.includes('reason: `Manual Task Progress Input: ${earnedVal}/${maxTasks}`'),
  'app.js: saveRowManualTaskInput synchronizes task completion via adminApplyForgiven'
);

assert(
  appJs.includes('window._themeTaskAsmsMap[tc] = taskAsmsInTheme;'),
  'app.js: Theme task tests are tracked in _themeTaskAsmsMap for batch task updates'
);

assert(
  appJs.includes("if (k.startsWith('task_')) {") &&
  appJs.includes('toggleAllManualInputMode'),
  'app.js: toggleAllManualInputMode batch-saves dirty task progress edits across all students'
);

console.log(`\nTEST RESULTS: ${passedTests}/${totalTests} tests passed.`);
if (passedTests !== totalTests) {
  process.exit(1);
}
console.log('ALL THEME DIVIDER & TASK PROGRESS EDITING TESTS PASSED (100%)!');
