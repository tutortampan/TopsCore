import fs from 'fs';
import path from 'path';

console.log('🧪 Starting Class Hub Super-Headers & Continuous Dividers Verification...\n');

const appJs = fs.readFileSync(path.resolve('js/admin/app.js'), 'utf8');
const adminCss = fs.readFileSync(path.resolve('css/admin.css'), 'utf8');
const adminHtml = fs.readFileSync(path.resolve('admin.html'), 'utf8');
const swJs = fs.readFileSync(path.resolve('sw.js'), 'utf8');

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✔ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    process.exitCode = 1;
  }
}

// 1. Super-Header Semantic Split
console.log('--- 1. Testing Super-Header Semantic Split (app.js & admin.css) ---');
const studentMgmtJs = fs.readFileSync(path.resolve('js/admin/student-management.js'), 'utf8');

assert(
  appJs.includes("label: 'STUDENTS DATA', colSpan: 2, className: 'super-hdr super-hdr-identity super-hdr-students-data'") &&
  appJs.includes("label: 'OVERALL PERFORMANCE', colSpan: 3, className: 'super-hdr super-hdr-overall'"),
  'dynamicSuperHeaders correctly configures STUDENTS DATA (colSpan: 2) and OVERALL PERFORMANCE (3 cols)'
);
assert(
  studentMgmtJs.includes("label: 'STUDENTS DATA',\n      colSpan: 4") &&
  studentMgmtJs.includes("label: 'DEMOGRAPHIC',\n      colSpan: 3") &&
  studentMgmtJs.includes("label: 'ADDRESS',\n      colSpan: 4"),
  'student-management.js correctly splits super-headers into STUDENTS DATA (4 cols), DEMOGRAPHIC (3 cols), and ADDRESS (4 cols)'
);
assert(
  adminCss.includes('th.super-hdr-identity') && adminCss.includes('th.super-hdr-overall') && adminCss.includes('th.super-hdr-students-data'),
  'css/admin.css contains styling rules for super-hdr-identity, super-hdr-students-data, and super-hdr-overall'
);

// 2. Dead Space Elimination & Column Bounding
console.log('\n--- 2. Testing Dynamic Width Rebalance & Zero Dead Space ---');
assert(
  adminCss.includes('#class-attendance-grid .col-sticky-2 { width: 220px !important; min-width: 180px !important; max-width: 260px !important;'),
  'STUDENT NAME (.col-sticky-2) width bounded between 180px and 260px to eliminate center dead void'
);
assert(
  adminCss.includes('th.col-theme-task') && adminCss.includes('min-width: 55px !important;'),
  'Theme sub-columns enforce min-width: 55px !important with dynamic expansion across horizontal width'
);

// 3. Continuous Neutral Super-Header Boundary Separators Across All Rows & Zero Star Footers
console.log('\n--- 3. Testing Continuous Neutral Super-Header Boundary Separators Across All Rows ---');
const vocabVaultJs = fs.readFileSync(path.resolve('js/admin/vocab-vault.js'), 'utf8');

assert(
  adminCss.includes('col-test-theme-grade'),
  'col-test-theme-grade defined for theme grade boundary'
);
assert(
  adminCss.includes('col-test-theme-grade') && adminCss.includes('border-right: 2px solid rgba(255, 255, 255, 0.22) !important;'),
  'Super-header boundaries enforce neutral vertical border (2px solid rgba(255, 255, 255, 0.22)) without colored borders'
);
assert(
  adminCss.includes('#blueprint-matrix-table th.col-bp-sep') && adminCss.includes('#vault-table th.super-hdr-divider'),
  'admin.css enforces 2px solid neutral continuous dividers for Blueprint Matrix and Vault Table'
);
assert(
  vocabVaultJs.includes('class="super-th super-hdr"') && vocabVaultJs.includes('class="bp-super-header-row"'),
  'vocab-vault.js super-headers configured with proper classes and boundary dividers'
);
assert(
  !adminCss.includes('border-right: 3px solid var(--quad-a') && !adminCss.includes('border-right: 3px solid #ff8c00 !important;') && !adminCss.includes('border-right: 3px solid #95ff00 !important;') && !adminCss.includes('border-right: 3px solid #c084fc !important;'),
  'Eradicated all theme-colored vertical borders on super-headers and columns'
);
assert(
  !appJs.includes('★ CLASS AVERAGE') && !appJs.includes('font-weight:700; color:var(--grade-c); font-size:12px;">★</td>'),
  'Eradicated all star icons (★) from class attendance table footers'
);

const datagridJs = fs.readFileSync(path.resolve('js/admin/datagrid.js'), 'utf8');
assert(
  datagridJs.includes('this.dividerColKeys = new Set()') && datagridJs.includes("td.classList.add('super-hdr-divider')"),
  'DataGrid automatically computes boundary divider columns and enforces continuous super-hdr-divider across headers, data rows, and footers'
);
assert(
  datagridJs.includes("'PROGRESS': { full: 'PROGRESS', medium: 'PRGRS', short: 'PGS' }") &&
  appJs.includes("shortLabel: 'PRGRS'") && appJs.includes("microLabel: 'PGS'"),
  'PROGRESS header correctly configured with 3-tier abbreviations: PRGRS (medium) - PGS (micro)'
);

// 4. Subheader Protection & Cache Busting
console.log('\n--- 4. Testing Subheader Protection & Cache Busters ---');
assert(
  adminCss.includes('#class-attendance-grid thead th:not(.super-hdr) {') && adminCss.includes('padding: 3px 4px !important;'),
  'Subheaders protected with safe padding (3px 4px) and height to prevent text clipping'
);
const vAdmin = parseInt((adminHtml.match(/css\/admin(?:\.min)?\.css\?v=202611\d+_v(\d+)/) || [])[1] || '0', 10);
const vSw = parseInt((swJs.match(/topscore-cache-option-a-v(\d+)/) || [])[1] || '0', 10);
assert(
  vAdmin >= 179,
  `admin.html cache busters incremented (>= v179, current: v${vAdmin})`
);
assert(
  vSw >= 104,
  `sw.js cache name incremented (>= v104, current: v${vSw})`
);

console.log(`\n🎉 RESULTS: ${passed}/${total} assertions passed!`);
if (passed !== total) process.exit(1);

