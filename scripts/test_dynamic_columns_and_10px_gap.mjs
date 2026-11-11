import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const appJsPath = path.resolve(__dirname, '../js/admin/app.js');
const studentMgmtJsPath = path.resolve(__dirname, '../js/admin/student-management.js');
const adminCssPath = path.resolve(__dirname, '../css/admin.css');
const rulesPath = path.resolve(__dirname, '../.agents/rules/ui-invariants.md');
const agentsMdPath = path.resolve(__dirname, '../AGENTS.md');
const antigravityRulesPath = path.resolve(__dirname, '../.antigravityrules');

const appJs = fs.readFileSync(appJsPath, 'utf8');
const studentMgmtJs = fs.readFileSync(studentMgmtJsPath, 'utf8');
const adminCss = fs.readFileSync(adminCssPath, 'utf8');
const rulesMd = fs.readFileSync(rulesPath, 'utf8');
const agentsMd = fs.readFileSync(agentsMdPath, 'utf8');
const antigravityRules = fs.readFileSync(antigravityRulesPath, 'utf8');

console.log('--- RUNNING DYNAMIC COLUMNS & UNIVERSAL 10PX SPATIAL GAP TESTS ---');

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

// 1. Elimination of Broken Left Sticky Offsets & Crushed Micro-Widths in admin.css
assert(
  !adminCss.includes('left: 259px') &&
  !adminCss.includes('left: 295px') &&
  !adminCss.includes('left: 329px'),
  'admin.css: Broken hardcoded sticky left offsets (259px, 295px, 329px) are completely eliminated'
);

assert(
  adminCss.includes('#class-attendance-grid .col-sticky-1 { width: 80px !important; min-width: 75px !important;') &&
  adminCss.includes('#class-attendance-grid .col-sticky-2 { width: 85px !important; min-width: 80px !important;') &&
  adminCss.includes('#class-attendance-grid .col-sticky-3 { width: 65px !important; min-width: 60px !important;') &&
  adminCss.includes('#class-attendance-grid .col-sticky-4 { min-width: 200px !important;') &&
  adminCss.includes('#class-attendance-grid .col-sticky-5 { width: 80px !important; min-width: 70px !important;') &&
  adminCss.includes('#class-attendance-grid .col-sticky-6 { width: 75px !important; min-width: 65px !important;') &&
  adminCss.includes('#class-attendance-grid .col-sticky-7 { width: 65px !important; min-width: 60px !important;'),
  'admin.css: Student Info columns have generous, proportional minimum and base widths'
);

assert(
  adminCss.includes('#class-attendance-grid th.col-theme-task') &&
  adminCss.includes('min-width: 60px !important;') &&
  adminCss.includes('width: 65px !important;'),
  'admin.css: Theme sub-columns enforce min-width 60px and width 65px'
);

// 2. Attendance Matrix Column Definitions in app.js
assert(
  appJs.includes("key: 'instName',") &&
  appJs.includes("width: '80px',") &&
  appJs.includes("minWidth: '75px',"),
  'app.js: INSTITUTION column has 80px width, 75px minWidth'
);

assert(
  appJs.includes("key: 'progName',") &&
  appJs.includes("width: '85px',") &&
  appJs.includes("minWidth: '80px',") &&
  !appJs.includes('max-width:44px;'),
  'app.js: PROGRAM column has 85px width and eliminated cell-level 44px truncation'
);

assert(
  appJs.includes("key: 'batch',") &&
  appJs.includes("width: '65px',") &&
  appJs.includes("minWidth: '60px',"),
  'app.js: BATCH column has 65px width, 60px minWidth'
);

assert(
  appJs.includes("key: 'displayName',") &&
  appJs.includes("minWidth: '140px',") &&
  !appJs.includes('max-width:140px;'),
  'app.js: STUDENT NAME column has flexible minWidth and eliminated cell-level 140px clipping'
);

assert(
  appJs.includes("key: 'progressPct',") &&
  appJs.includes("width: '80px',") &&
  appJs.includes("minWidth: '70px',"),
  'app.js: PROGRESS column has 80px width, 70px minWidth'
);

assert(
  appJs.includes("key: 'totalEarnedScore',") &&
  appJs.includes("width: '75px',") &&
  appJs.includes("minWidth: '65px',"),
  'app.js: POINTS column has 75px width, 65px minWidth'
);

assert(
  appJs.includes("key: 'grade',") &&
  appJs.includes("width: '65px',") &&
  appJs.includes("minWidth: '60px',"),
  'app.js: GRADE column has 65px width, 60px minWidth'
);

assert(
  appJs.includes("key: `theme_${tc}_task`,") &&
  appJs.includes("width: '65px',") &&
  appJs.includes("minWidth: '60px',"),
  'app.js: Dynamic TASK column has 65px width, 60px minWidth'
);

assert(
  appJs.includes("key: `theme_${tc}_total_pts`,") &&
  appJs.includes("width: '65px',") &&
  appJs.includes("minWidth: '60px',"),
  'app.js: Dynamic PTS column has 65px width, 60px minWidth'
);

assert(
  appJs.includes("key: `theme_${tc}_score`,") &&
  appJs.includes("width: '65px',") &&
  appJs.includes("minWidth: '60px',"),
  'app.js: Dynamic SCR column has 65px width, 60px minWidth'
);

// 3. Batch Student Roster in student-management.js
assert(
  studentMgmtJs.includes('studentGrid = new DataGrid({') &&
  studentMgmtJs.includes("tableLayout: 'auto',"),
  'student-management.js: studentGrid explicitly sets tableLayout: auto'
);

assert(
  studentMgmtJs.includes("key: 'levelName',") &&
  studentMgmtJs.includes("width: '75px',"),
  'student-management.js: Level column allocated 75px'
);

assert(
  studentMgmtJs.includes("key: 'sortName',") &&
  studentMgmtJs.includes("width: '280px',") &&
  studentMgmtJs.includes("minWidth: '240px',") &&
  studentMgmtJs.includes("maxWidth: '340px',"),
  'student-management.js: Name column allocated proportional breathing room (240px–340px) without absorbing 1000px gap'
);

assert(
  studentMgmtJs.includes("key: 'ageDisplay',") &&
  studentMgmtJs.includes("width: '80px',"),
  'student-management.js: Age column allocated 80px'
);

assert(
  studentMgmtJs.includes("key: 'gender',") &&
  studentMgmtJs.includes("width: '65px',"),
  'student-management.js: Gender column allocated 65px'
);

assert(
  studentMgmtJs.includes("key: `_cls_exam1_${cls.id}`,") &&
  studentMgmtJs.includes("width: '125px',") &&
  studentMgmtJs.includes("minWidth: '100px',"),
  'student-management.js: Per-Class Exam 1-4 columns expanded from 75px to 125px with 100px minWidth'
);

assert(
  studentMgmtJs.includes("label: 'Actions',") &&
  studentMgmtJs.includes("width: '90px',"),
  'student-management.js: Actions column streamlined from 240px to 90px'
);

// 4. Universal 10px Container Gap Enforcement
assert(
  adminCss.includes('#admin-content-area') &&
  adminCss.includes('gap: 10px !important;'),
  'admin.css: #admin-content-area strictly enforces gap: 10px !important'
);

assert(
  adminCss.includes('.workspace-container-gap,') &&
  adminCss.includes('#class-attendance-container,') &&
  adminCss.includes('#student-grid-container,') &&
  adminCss.includes('#class-hub-tab-content,') &&
  adminCss.includes('.student-management-container') &&
  adminCss.includes('gap: 10px !important;'),
  'admin.css: All main workspace and grid containers strictly enforce gap: 10px !important'
);

// 5. Rules & Contract Synchronization
assert(
  rulesMd.includes('Universal 10px Container Gap Invariant') &&
  rulesMd.includes('Zero Dead Space & Proportional Width Distribution'),
  'ui-invariants.md: Sections 3 & 5 codified 10px gap and proportional dynamic column sizing'
);

assert(
  agentsMd.includes('2.33 Universal Lower Panel Architecture & Universal 10px Container Gap') &&
  agentsMd.includes('2.34 Dynamic Column Sizing, Single-Line Text & Zero Dead Space Invariant'),
  'AGENTS.md: Sub-sections 2.33 & 2.34 synchronized'
);

assert(
  antigravityRules.includes('UNIVERSAL LOWER PANEL ARCHITECTURE & 10PX CONTAINER GAP') &&
  antigravityRules.includes('DYNAMIC COLUMN SIZING, SINGLE-LINE TEXT & ZERO DEAD SPACE INVARIANT'),
  '.antigravityrules: Rules 20 & 21 synchronized'
);

console.log(`\nTEST RESULTS: ${passedTests}/${totalTests} tests passed.`);
if (passedTests !== totalTests) {
  process.exit(1);
}
console.log('ALL DYNAMIC COLUMNS & 10PX GAP TESTS PASSED SUCCESSFULLY!');
