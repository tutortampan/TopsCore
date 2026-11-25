import fs from 'fs';
import path from 'path';

console.log('🧪 Starting Class Analytics Flush Layout & Zero Gap Verification...\n');

const analyticsJs = fs.readFileSync(path.resolve('js/admin/class-analytics.js'), 'utf8');
const adminCss = fs.readFileSync(path.resolve('css/admin.css'), 'utf8');

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

// 1. Gambar 2 & 3 Elimination & Mini Search Integration
console.log('--- 1. Testing Gambar 2 & 3 Elimination & Mini Search Integration ---');
assert(
  analyticsJs.includes('hideToolbar: true') && analyticsJs.includes('pageSize: 1000'),
  'DataGrid in class-analytics.js sets hideToolbar: true and pageSize: 1000 (eliminating top toolbar & pagination bar)'
);
assert(
  !analyticsJs.includes('summaryRow: summaryRowFn'),
  'Redundant table summaryRowFn removed from DataGrid in class-analytics.js'
);
assert(
  analyticsJs.includes('analytics-4col-matrix-container') || (analyticsJs.includes('id="analytics-quick-search"') && (analyticsJs.includes('placeholder="Filter word..."') || analyticsJs.includes('placeholder="🔍 Filter word..."'))),
  'Analytics view uses 4-column matrix or integrates mini search inside Universal Lower Panel'
);
assert(
  analyticsJs.includes('renderThemeExamAnalyticsBoard') || analyticsJs.includes("searchInput.addEventListener('input'"),
  '4-column matrix renderer or instant search listener active'
);

// 2. Official Grading Colors for Triage Pills / Matrix
console.log('\n--- 2. Testing Official Grading Colors on Triage Pills / Matrix ---');
assert(
  analyticsJs.includes('var(--grade-e, #ff0000)') || ((analyticsJs.includes('#ff0000') || analyticsJs.includes('var(--grade-e)')) && (analyticsJs.includes('Critical &gt;50%') || analyticsJs.includes('Critical >50%'))),
  'Critical / Missed Items uses Pure Red (#ff0000 / var(--grade-e))'
);
assert(
  analyticsJs.includes("urgency === 'warning'") || ((analyticsJs.includes('#ffff00') || analyticsJs.includes('var(--grade-c)')) && analyticsJs.includes('Needs Attention')),
  'Warning / Needs Attention urgency tier defined'
);
assert(
  (analyticsJs.includes('#00c000') || analyticsJs.includes('var(--grade-a)')) && analyticsJs.includes('Safe'),
  'Safe triage pill uses Grade A Pure Green (#00c000 / var(--grade-a))'
);

// 3. Spatial Bounds & Flush Docking Invariants
console.log('\n--- 3. Testing Spatial Bounds & Flush Docking Invariants (css/admin.css) ---');
assert(
  adminCss.includes('.admin-content:has(.test-analytics-view)') &&
  (adminCss.includes('padding: 10px 10px 10px 10px !important;') || adminCss.includes('padding: 10px 10px 0 10px !important;')),
  '.admin-content:has(.test-analytics-view) enforces 10px spatial padding invariant'
);
assert(
  adminCss.includes('.analytics-toolbar.workspace-lower-panel') &&
  adminCss.includes('margin-bottom: 0 !important;') &&
  adminCss.includes('border-bottom: none !important;'),
  'Lower panel enforces margin-bottom: 0 !important (0px gap to #bottom-ad-banner)'
);
assert(
  adminCss.includes('#class-analytics-datagrid-container th:nth-child(1)') &&
  adminCss.includes('width: 220px !important;') &&
  adminCss.includes('min-width: 180px !important;'),
  'Dynamic column sizing active on Test Analytics table (Zero Dead Space)'
);

// 4. Cache Busters
console.log('\n--- 4. Testing Cache Busters ---');
const adminHtml = fs.readFileSync(path.resolve('admin.html'), 'utf8');
const swJs = fs.readFileSync(path.resolve('sw.js'), 'utf8');
const vAdmin = parseInt((adminHtml.match(/css\/admin(?:\.min)?\.css\?v=202611\d+_v(\d+)/) || [])[1] || '0', 10);
const vSw = parseInt((swJs.match(/topscore-cache-(?:option-a-)?v(\d+)/) || [])[1] || '0', 10);
assert(
  vAdmin >= 180,
  `admin.html cache busters incremented (>= v180, current: v${vAdmin})`
);
assert(
  vSw >= 105,
  `sw.js cache name incremented (>= v105, current: v${vSw})`
);

console.log(`\n🎉 RESULTS: ${passed}/${total} assertions passed!`);
if (passed !== total) process.exit(1);
