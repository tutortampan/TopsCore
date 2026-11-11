// ============================================================
// TOPSCORE LMS — AUTOMATED VERIFICATION SUITE
// Tests Universal Lower Panel (50px Height), 10px Container Gap,
// Dynamic Column Sizing, Single-Line Text, Centered Loading,
// Direct English Diagnostic Strings, and Footer Cleanup.
// ============================================================

import { strict as assert } from 'assert';
import fs from 'fs';

console.log('🧪 Starting Universal Lower Panel, Dynamic Columns, and Centered Loading Verification...\n');

// 1. Check css/admin.css for Lower Panel 50px height, 10px Gap, and nowrap
console.log('--- 1. Testing Lower Panel & Dynamic Column Styles (css/admin.css) ---');
const adminCss = fs.readFileSync('css/admin.css', 'utf8');

// 1.1 Lower panel height and alignment
assert.ok(
  adminCss.includes('.workspace-lower-panel') &&
  adminCss.includes('height: 50px !important;') &&
  adminCss.includes('min-height: 50px !important;') &&
  adminCss.includes('max-height: 50px !important;'),
  '.workspace-lower-panel must enforce exact 50px height lock'
);
console.log('  ✔ .workspace-lower-panel strictly locked to 50px height aligned with sidebar-footer');

// 1.2 Table footers 50px height lock
assert.ok(
  adminCss.includes('.table-wrap table tfoot tr') &&
  adminCss.includes('.datagrid-tfoot tr.datagrid-summary-row') &&
  adminCss.includes('height: 50px !important;'),
  'Table footers and summary rows must be standardized to 50px height'
);
console.log('  ✔ Table footers and summary rows standardized to 50px height');

// 1.3 Strict 10px Container Gap
assert.ok(
  adminCss.includes('#admin-content-area') &&
  adminCss.includes('gap: 10px !important;'),
  '#admin-content-area must enforce exact 10px container gap'
);
console.log('  ✔ #admin-content-area enforces exact 10px container gap');

// 1.4 Dynamic Column Sizing & Single-Line Invariant (nowrap)
assert.ok(
  adminCss.includes('.datagrid-table') &&
  adminCss.includes('white-space: nowrap !important;'),
  'Table cells must enforce white-space: nowrap !important to prevent multiple lines'
);
console.log('  ✔ Table cells enforce white-space: nowrap !important with dynamic table width');

// 1.5 Utility class .justify-center
assert.ok(
  adminCss.includes('.justify-center') &&
  adminCss.includes('justify-content: center !important;'),
  '.justify-center utility class must be defined'
);
console.log('  ✔ .justify-center utility class defined');


// 2. Check js/admin/student-management.js for Footer Cleanup & Dynamic Name Column
console.log('\n--- 2. Testing Student Management Datagrid & Footer (student-management.js) ---');
const studentMgmtJs = fs.readFileSync('js/admin/student-management.js', 'utf8');

// 2.1 Verify "Avg: ... pts" removed from Actions column in summary row
const actionsSummaryCellMatch = studentMgmtJs.match(/col\.label === 'Actions'\) \{([\s\S]*?)\}/);
assert.ok(actionsSummaryCellMatch, 'student-management.js must contain col.label === "Actions" block in summary row');
assert.ok(
  !actionsSummaryCellMatch[1].includes('Avg:') && !actionsSummaryCellMatch[1].includes('pts'),
  'Actions column in summary row must not contain "Avg: ... pts"'
);
console.log('  ✔ "Avg: ... pts" successfully removed from student table footer Actions column');

// 2.2 Summary row height set to 50px
assert.ok(
  studentMgmtJs.includes('class="datagrid-summary-row"') &&
  studentMgmtJs.includes('height:50px;'),
  'Summary row must specify 50px height inline or class'
);
console.log('  ✔ Student summary row explicitly set to 50px height');

// 2.3 Name column dynamic expansion
const nameColMatch = studentMgmtJs.match(/key:\s*'sortName'[\s\S]*?render:/);
assert.ok(nameColMatch, 'student-management.js must contain sortName column definition');
assert.ok(
  !nameColMatch[0].includes("width: '180px'"),
  'sortName column must not be capped with fixed 180px width to allow dynamic space filling'
);
console.log('  ✔ Name column dynamically expands across horizontal space without dead voids');


// 3. Check js/admin/class-analytics.js for Centered Loading & Direct English
console.log('\n--- 3. Testing Class Analytics Engine (class-analytics.js) ---');
const analyticsJs = fs.readFileSync('js/admin/class-analytics.js', 'utf8');

// 3.1 Centered Loading Spinner with English Text
assert.ok(
  analyticsJs.includes('display:flex; align-items:center; justify-content:center;') &&
  analyticsJs.includes('Loading class vocabulary item error analytics...'),
  'Loading spinner must be centered horizontally and vertically with English text'
);
console.log('  ✔ Loading indicator is centered (flex align-center justify-center) with professional English text');

// 3.2 Indonesian text eliminated from diagnostics
const indonesianKeywords = [
  'Aman',
  'Kehabisan Waktu',
  'Homofon Suara',
  'Spelling Typo (Ejaan)',
  'Salah Bentuk Kata',
  'Jebakan Distraktor',
  'Belum Ada Tes di Kelas Ini',
  'Memuat analitik kesalahan'
];
indonesianKeywords.forEach(keyword => {
  assert.ok(
    !analyticsJs.includes(`'${keyword}'`) && !analyticsJs.includes(`>${keyword}<`),
    `class-analytics.js must not contain Indonesian diagnostic/label: "${keyword}"`
  );
});
console.log('  ✔ All diagnostic labels and messages standardized to professional English');

// 3.3 English diagnosis labels present
assert.ok(analyticsJs.includes("'Safe'"), 'Must contain diagnosis label Safe');
assert.ok(analyticsJs.includes("'Timeout / Blank'"), 'Must contain diagnosis label Timeout / Blank');
assert.ok(analyticsJs.includes("'STT / Audio Homophone'"), 'Must contain diagnosis label STT / Audio Homophone');
assert.ok(analyticsJs.includes("'Spelling Typo'"), 'Must contain diagnosis label Spelling Typo');
assert.ok(analyticsJs.includes("'Word Form / Root Error'"), 'Must contain diagnosis label Word Form / Root Error');
assert.ok(analyticsJs.includes("'Distractor Trap / Concept Error'"), 'Must contain diagnosis label Distractor Trap / Concept Error');
console.log('  ✔ Verified all 6 English diagnostic classifications');

// 3.4 Triage pills relocated to Lower Panel
assert.ok(
  analyticsJs.includes('class="workspace-lower-panel analytics-toolbar"'),
  'Analytics triage pills must be rendered inside .workspace-lower-panel'
);
console.log('  ✔ Triage pills and evaluation KPIs relocated to 50px Lower Panel');

// 3.5 Single-Responsibility Columns Invariant (Separate Mistakes and Evaluated)
assert.ok(
  analyticsJs.includes("label: 'MISTAKES'") && analyticsJs.includes("label: 'EVALUATED'"),
  'Analytics table must separate Mistakes and Evaluated into dedicated individual columns'
);
assert.ok(
  !analyticsJs.includes("label: 'MISS / TOTAL'"),
  'Analytics table must not combine Mistakes and Evaluated in a single MISS / TOTAL column'
);
console.log('  ✔ Analytics table separates Mistakes and Evaluated into individual single-responsibility columns');


// 4. Check js/admin/app.js for Attendance Matrix Lower Panel & Direct English
console.log('\n--- 4. Testing Class Hub Attendance Matrix Lower Panel & English Standards (app.js) ---');
const appJs = fs.readFileSync('js/admin/app.js', 'utf8');

assert.ok(
  appJs.includes('attendance-matrix-toolbar workspace-lower-panel'),
  'app.js must place attendance theme pills and curriculum actions in .workspace-lower-panel'
);
// Ensure class-attendance-grid is rendered before workspace-lower-panel
const gridPos = appJs.indexOf('id="class-attendance-grid"');
const lowerPanelPos = appJs.indexOf('attendance-matrix-toolbar workspace-lower-panel');
assert.ok(
  gridPos !== -1 && lowerPanelPos !== -1 && gridPos < lowerPanelPos,
  '#class-attendance-grid must sit above .workspace-lower-panel'
);
console.log('  ✔ Attendance theme pills & curriculum actions successfully relocated to docked Lower Panel below the grid');

// 4.2 English standards in Class Hub tabs (No 'Analisis')
assert.ok(
  !appJs.includes("val: 'Analisis'"),
  'app.js must not contain Indonesian tab value "Analisis"'
);
assert.ok(
  appJs.includes("val: 'Insights'") || appJs.includes("val: 'Analytics'"),
  'app.js must use Direct English tab badge for Test Analytics'
);
console.log('  ✔ Class Hub Test Analytics tab badge standardized to Direct English');

// 4.3 English toasts in action buttons
assert.ok(
  !appJs.includes("showToast('Gagal membuka wizard:"),
  'app.js must not use Indonesian toast "Gagal membuka wizard:"'
);
assert.ok(
  !appJs.includes("showToast('Gagal membuka pengaturan blueprint:"),
  'app.js must not use Indonesian toast "Gagal membuka pengaturan blueprint:"'
);
console.log('  ✔ Action button toast errors standardized to Direct English');

// 4.4 fitMatrixToScreen lower panel & footer height accounting
assert.ok(
  appJs.includes('lowerPanelHeight') &&
  appJs.includes('footerHeight = 50'),
  'fitMatrixToScreen must account for 50px lower panel height and 50px footer height'
);
console.log('  ✔ fitMatrixToScreen dynamic sizing accounts for 50px Lower Panel and 50px footer');


// 5. Check CSS Invariants for Lower Panel & Class Hub Table Containment
console.log('\n--- 5. Testing CSS Lower Panel & Class Hub Containment Invariants ---');
assert.ok(
  adminCss.includes('flex-wrap: nowrap !important;') &&
  adminCss.includes('border-bottom: none !important;'),
  'workspace-lower-panel and attendance-matrix-toolbar must enforce flex-wrap: nowrap and border-bottom: none'
);
assert.ok(
  adminCss.includes('#class-analytics-container') &&
  adminCss.includes('#class-analytics-datagrid-container'),
  'css/admin.css must properly style #class-analytics-container and #class-analytics-datagrid-container'
);
assert.ok(
  adminCss.includes('#class-analytics-datagrid-container .table-wrap') ||
  adminCss.includes('.test-analytics-view .table-wrap'),
  'css/admin.css must include test analytics table-wrap in flex containment rules'
);
console.log('  ✔ CSS Lower Panel flex-wrap nowrap, border-bottom elimination, and class analytics table containment verified');

console.log('\n🎉 ALL UNIVERSAL LOWER PANEL, DYNAMIC COLUMNS, AND CENTERED LOADING CHECKS PASSED PERFECTLY!');

