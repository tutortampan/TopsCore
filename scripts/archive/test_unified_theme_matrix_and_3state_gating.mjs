import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appJsPath = path.resolve(__dirname, '../js/admin/app.js');

const code = fs.readFileSync(appJsPath, 'utf8');

console.log('--- RUNNING UNIFIED THEME MATRIX & 3-STATE GATING TEST ---');

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

// 1. Toolbar removal in Class Tests tab
assert(
  !code.includes('class="class-asm-toolbar"'),
  'Phase 2: class-asm-toolbar is removed from tests tab'
);

assert(
  code.includes('container: document.getElementById(\'class-tests-grid\'),') &&
  code.includes('hideToolbar: true,'),
  'Phase 2: class-tests-grid has hideToolbar: true'
);

// 2. Super header has 3 colSpan per theme and NO manual input super header
assert(
  code.includes("colSpan: 3,") &&
  code.includes("className: themeColorClasses[tc] || `super-hdr super-hdr-theme super-hdr-theme-${tc.toLowerCase()}`"),
  'Phase 3: Each theme has colSpan: 3 in super headers'
);

assert(
  !code.includes("label: 'MANUAL INPUT',"),
  'Phase 5: Super-header MANUAL INPUT is completely removed'
);

// 3. Sub-headers are strictly TASK, PTS, SCR
assert(
  code.includes("key: `theme_${tc}_task`,") &&
  code.includes('class="test-subtag test-subtag-task"') &&
  code.includes('>TASK</span>'),
  'Phase 3: Column 1 is TASK with tag TASK'
);

assert(
  code.includes("key: `theme_${tc}_total_pts`,") &&
  code.includes('class="test-subtag test-subtag-test-pts"') &&
  code.includes('>PTS</span>'),
  'Phase 3: Column 2 is PTS with tag PTS'
);

assert(
  code.includes("key: `theme_${tc}_score`,") &&
  code.includes('class="test-subtag test-subtag-test-score"') &&
  code.includes('>SCR</span>'),
  'Phase 3: Column 3 is SCR with tag SCR'
);

assert(
  !code.includes("key: 'manual_input_action',"),
  'Phase 5: Sub-column manual_input_action is completely removed'
);

// 4. 3-State Gated Display Verification
// State 1: Stop Icon 🛑
assert(
  code.includes("if (!isTaskCompleted) {") &&
  code.includes("filter:drop-shadow(0 0 2px rgba(255,0,0,0.4));\">🛑</span>"),
  'Phase 4: State 1 renders Red Stop Icon 🛑 when tasks are incomplete'
);

// State 2: Lock Icon 🔒
assert(
  code.includes("if (!hasExamAttempt || ptsVal === undefined || ptsVal === null || ptsVal < 0) {") &&
  code.includes("filter:drop-shadow(0 0 2px rgba(255,255,0,0.4));\">🔒</span>"),
  'Phase 4: State 2 renders Yellow Lock Icon 🔒 when tasks are completed and exam is unattempted'
);

// State 3: Values rendered with grade color
assert(
  code.includes("style=\"color:${color} !important; font-weight:700; font-size:var(--matrix-font-size, 0.75rem); font-variant-numeric:tabular-nums;\"") &&
  code.includes("style=\"color:${cellColor}; font-weight:700; font-size:var(--matrix-font-size, 0.75rem); font-variant-numeric:tabular-nums;\""),
  'Phase 4: State 3 renders score and points with grade colors'
);

// 5. Master Edit Mode Integration
assert(
  code.includes("const isGlobalEdit = document.body.classList.contains('global-edit-mode-on') || window.isStudentManualInputActive?.(row.id);") &&
  code.includes("class=\"input-matrix-exam-pts input-matrix-exam-pts-${row.id}-${examAsm.id}\"") &&
  code.includes("class=\"input-matrix-exam-score input-matrix-exam-score-${row.id}-${examAsm.id}\""),
  'Phase 5: Master Edit Mode dynamically renders inline input capsules'
);

assert(
  code.includes("window.addEventListener('admin-edit-mode-changed', () => {"),
  'Phase 5: admin-edit-mode-changed event listener triggers grid re-render'
);

// 6. Zero Dead Space & Table Auto-Layout (Rule 21)
assert(
  code.includes("tableLayout: 'auto',"),
  'Phase 6: attendanceGridInstance sets tableLayout: auto'
);

assert(
  code.includes("minWidth: '140px',"),
  'Phase 6: displayName column allows flexible dynamic width expansion'
);

// 7. Tactical Lower Panel Legend Removed & Replaced by Edit-Mode Lower Action Bar
assert(
  code.includes('class="attendance-matrix-toolbar workspace-lower-panel edit-mode-only"'),
  'Phase 5: Redundant lower panel legend removed, lower toolbar collapses when Edit Mode is OFF'
);

console.log(`\nTEST RESULTS: ${passedTests}/${totalTests} tests passed.`);
if (passedTests !== totalTests) {
  process.exit(1);
}
console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');

