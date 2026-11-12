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
assert(
  appJs.includes("label: 'STUDENT IDENTITY', colSpan: 2, className: 'super-hdr super-hdr-identity'") &&
  appJs.includes("label: 'OVERALL PERFORMANCE', colSpan: 3, className: 'super-hdr super-hdr-overall'"),
  'dynamicSuperHeaders correctly splits into STUDENT IDENTITY (2 cols) and OVERALL PERFORMANCE (3 cols)'
);
assert(
  adminCss.includes('th.super-hdr-identity') && adminCss.includes('th.super-hdr-overall'),
  'css/admin.css contains styling rules for super-hdr-identity and super-hdr-overall'
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

// 3. Continuous 3px Theme Boundary Separator
console.log('\n--- 3. Testing Continuous 3px Theme Boundary Separators Across All Rows ---');
assert(
  adminCss.includes('col-test-theme-grade'),
  'col-test-theme-grade defined for theme grade boundary'
);
assert(
  adminCss.includes('tbody td.col-test-theme-grade-a') && adminCss.includes('border-right: 3px solid #38bdf8 !important;'),
  'tbody td.col-test-theme-grade-a has 3px solid theme-colored border'
);
assert(
  adminCss.includes('tbody td.col-test-theme-grade-b') && adminCss.includes('border-right: 3px solid #c084fc !important;'),
  'tbody td.col-test-theme-grade-b has 3px solid theme-colored border'
);
assert(
  adminCss.includes('tbody td.col-test-theme-grade-c') && adminCss.includes('border-right: 3px solid #fbbf24 !important;'),
  'tbody td.col-test-theme-grade-c has 3px solid theme-colored border'
);
assert(
  adminCss.includes('tbody td.col-test-theme-grade-d') && adminCss.includes('border-right: 3px solid #34d399 !important;'),
  'tbody td.col-test-theme-grade-d has 3px solid theme-colored border'
);

// 4. Subheader Protection & Cache Busting
console.log('\n--- 4. Testing Subheader Protection & Cache Busters ---');
assert(
  adminCss.includes('#class-attendance-grid thead th:not(.super-hdr) {') && adminCss.includes('padding: 3px 4px !important;'),
  'Subheaders protected with safe padding (3px 4px) and height to prevent text clipping'
);
assert(
  /css\/admin\.css\?v=20261111_v1[7-9]\d/.test(adminHtml) && /js\/admin\/app\.js\?v=20261111_v1[7-9]\d/.test(adminHtml),
  'admin.html cache busters incremented (>= v179)'
);
assert(
  /topscore-cache-option-a-v10[4-9]/.test(swJs),
  'sw.js cache name incremented (>= v104)'
);

console.log(`\n🎉 RESULTS: ${passed}/${total} assertions passed!`);
if (passed !== total) process.exit(1);

