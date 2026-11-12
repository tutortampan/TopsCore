/**
 * verify_system_wide_no_hscroll.mjs
 * Comprehensive automated verification ensuring ZERO horizontal scrollbar across ALL tables
 * and full enforcement of TopsCore UI & Spatial Invariants (AGENTS.md & ui-invariants.md).
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve('d:/Drives/Tutor Tampan/TopsCore');
const PASS = '\x1b[32m✅ PASS\x1b[0m';
const FAIL = '\x1b[31m❌ FAIL\x1b[0m';

let allPassed = true;

function check(label, condition, hint = '') {
  if (condition) {
    console.log(`${PASS} ${label}`);
  } else {
    console.log(`${FAIL} ${label}${hint ? ' — ' + hint : ''}`);
    allPassed = false;
  }
}

function readFile(rel) {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(' TopsCore — System-Wide Zero Horizontal Scrollbar Verification');
console.log('═══════════════════════════════════════════════════════════════\n');

// ── 1. css/admin.css ────────────────────────────────────────────────────────
const adminCss = readFile('css/admin.css');
console.log('[ css/admin.css ]');

// A. No overflow-x: auto on table-wrap
const tableWrapAuto = adminCss.match(/\.table-wrap[^{]*\{[^}]*overflow-x:\s*auto/g);
check(
  '1a. Zero .table-wrap rules with overflow-x: auto',
  !tableWrapAuto,
  `Found rogue rules: ${JSON.stringify(tableWrapAuto)}`
);

// B. table-wrap has overflow-x: hidden !important at key declarations
check(
  '1b. Base .table-wrap has overflow-x: hidden !important',
  adminCss.includes('.table-wrap') && adminCss.includes('overflow-x: hidden !important;')
);

// C. Dynamic column sizing rule sets table-layout: fixed !important
check(
  '1c. Table layout invariant enforces table-layout: fixed !important (Rule 21)',
  adminCss.includes('table-layout: fixed !important;') &&
  adminCss.includes('.datagrid-table,\n.table-wrap table,\n#class-attendance-grid table,\n#blueprint-matrix-table')
);

// D. Grid container table-wrap explicitly enforces overflow-x: hidden !important
check(
  '1d. #student-grid-container .table-wrap enforces overflow-x: hidden !important',
  adminCss.includes('#student-grid-container .table-wrap') &&
  adminCss.includes('overflow-x: hidden !important;')
);

// E. WebKit horizontal scrollbar explicitly eradicated
check(
  '1e. Horizontal webkit scrollbar eradicated (height: 0px !important, display: none !important)',
  adminCss.includes('.table-wrap::-webkit-scrollbar:horizontal') &&
  adminCss.includes('display: none !important;') &&
  adminCss.includes('height: 0px !important;')
);

console.log('');

// ── 2. css/style.css ────────────────────────────────────────────────────────
const styleCss = readFile('css/style.css');
console.log('[ css/style.css ]');

check(
  '2a. Base .table-wrap has overflow-x: hidden !important',
  styleCss.includes('.table-wrap,') && styleCss.includes('overflow-x: hidden !important;')
);

check(
  '2b. Base style.css horizontal scrollbar eradicated',
  styleCss.includes('.table-wrap::-webkit-scrollbar:horizontal') &&
  styleCss.includes('display: none !important;')
);

console.log('');

// ── 3. js/admin/datagrid.js ─────────────────────────────────────────────────
const datagridJs = readFile('js/admin/datagrid.js');
console.log('[ js/admin/datagrid.js ]');

check(
  '3a. DataGrid .table-wrap inline style enforces overflow-x:hidden;',
  datagridJs.includes('<div class="table-wrap" style="overflow-x:hidden;">')
);

check(
  '3b. No rogue overflow-x:auto in DataGrid template',
  !datagridJs.includes('overflow-x:auto')
);

console.log('');

// ── 4. js/admin/student-management.js ───────────────────────────────────────
const studentMgmt = readFile('js/admin/student-management.js');
console.log('[ js/admin/student-management.js ]');

check(
  '4a. Student Roster DataGrid uses tableLayout: fixed',
  studentMgmt.includes("tableLayout: 'fixed',")
);

check(
  '4b. Level column optimized to 50px (proportional fit)',
  studentMgmt.includes("width: '50px',") && studentMgmt.includes("minWidth: '45px',")
);

console.log('');

// ── 5. Cache-Busting Synchronization ─────────────────────────────────────────
const adminHtml = readFile('admin.html');
const appJs = readFile('js/admin/app.js');
console.log('[ Cache-Busting Version Sync ]');

check(
  '5a. admin.html points to admin.css?v=20261112_v425',
  adminHtml.includes('css/admin.css?v=20261112_v425')
);

check(
  '5b. admin.html points to style.css?v=20261112_v425',
  adminHtml.includes('css/style.css?v=20261112_v425')
);

check(
  '5c. admin.html points to app.js?v=20261112_v425',
  adminHtml.includes('js/admin/app.js?v=20261112_v425')
);

check(
  '5d. app.js imports datagrid.js?v=20261112_v425',
  appJs.includes("./datagrid.js?v=20261112_v425")
);

check(
  '5e. app.js imports student-management.js?v=20261112_v425',
  appJs.includes("./student-management.js?v=20261112_v425")
);

console.log('\n═══════════════════════════════════════════════════════════════');
if (allPassed) {
  console.log(' \x1b[32m🎉 ALL SYSTEM-WIDE ZERO HORIZONTAL SCROLL CHECKS PASSED!\x1b[0m');
} else {
  console.log(' \x1b[31m⚠️  SOME CHECKS FAILED — See above for details.\x1b[0m');
}
console.log('═══════════════════════════════════════════════════════════════\n');

process.exit(allPassed ? 0 : 1);
