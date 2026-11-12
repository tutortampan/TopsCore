import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appJsPath = path.resolve(__dirname, '../js/admin/app.js');
const datagridJsPath = path.resolve(__dirname, '../js/admin/datagrid.js');
const adminCssPath = path.resolve(__dirname, '../css/admin.css');

const appCode = fs.readFileSync(appJsPath, 'utf8');
const datagridCode = fs.readFileSync(datagridJsPath, 'utf8');
const adminCss = fs.readFileSync(adminCssPath, 'utf8');

console.log('--- RUNNING SUBHEADER & LOWER PANEL RELOCATION TESTS ---');

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

// 1. DataGrid Header Content Horizontal Alignment
assert(
  datagridCode.includes('class="datagrid-header-content" style="display:inline-flex; align-items:center; justify-content:center; gap:4px; width:100%; white-space:nowrap; vertical-align:middle;"'),
  'DataGrid: Column headers wrap label and sort icon in inline-flex horizontal row'
);

assert(
  datagridCode.includes('<span class="datagrid-header-label" style="display:inline-flex; align-items:center;">${col.label}</span>'),
  'DataGrid: Header label is an inline-flex element'
);

assert(
  datagridCode.includes('<span class="sort-icon" style="display:inline-flex; align-items:center; font-size:0.68rem; line-height:1; opacity:0.85;">'),
  'DataGrid: Sort icon sits directly beside the label on the same line'
);

// 2. High-Contrast Subheader Labels in app.js
assert(
  appCode.includes("label: '<span class=\"test-subtag test-subtag-task\" style=\"font-size:0.70rem; font-weight:800; color:#38bdf8; letter-spacing:0.02em;\">TASK</span>',"),
  'app.js: TASK subheader uses 0.70rem, font-weight 800, and inline span'
);

assert(
  appCode.includes("label: '<span class=\"test-subtag test-subtag-test-pts\" style=\"font-size:0.70rem; font-weight:800; color:#38bdf8; letter-spacing:0.02em;\">PTS</span>',"),
  'app.js: PTS subheader uses 0.70rem, font-weight 800, and inline span'
);

assert(
  appCode.includes("label: '<span class=\"test-subtag test-subtag-test-score\" style=\"font-size:0.70rem; font-weight:800; color:#38bdf8; letter-spacing:0.02em;\">SCR</span>',"),
  'app.js: SCR subheader uses 0.70rem, font-weight 800, and inline span'
);

assert(
  !appCode.includes('<div class="asm-hdr-cell">'),
  'app.js: Block-level div.asm-hdr-cell is completely eliminated to prevent line wrapping'
);

// 3. Lower Panel Redundant Legend Elimination
assert(
  !appCode.includes('attendance-matrix-legend') &&
  !appCode.includes('METRICS: TSK Task Progress') &&
  !appCode.includes('WRD Word'),
  'app.js: Redundant lower panel legend is completely removed'
);

assert(
  appCode.includes('class="attendance-matrix-toolbar workspace-lower-panel edit-mode-only"'),
  'app.js: Lower action toolbar is edit-mode-only and collapses when Edit Mode is OFF'
);

// 4. Viewport Expansion & Table Footer Relocation
assert(
  appCode.includes("const isEditOn = document.body.classList.contains('global-edit-mode-on');") &&
  appCode.includes("const lowerPanelHeight = (isEditOn && lowerPanel && lowerPanel.offsetHeight > 0) ? (lowerPanel.offsetHeight + 10) : 0;"),
  'app.js: fitMatrixToScreen adjusts lowerPanelHeight dynamically (0 when Edit Mode OFF)'
);

assert(
  adminCss.includes('.datagrid-table tfoot') &&
  adminCss.includes('height: 50px !important;') &&
  adminCss.includes('position: sticky !important;') &&
  adminCss.includes('bottom: 0 !important;'),
  'admin.css: Table tfoot enforces 50px height and sticky bottom:0'
);

console.log(`\nTEST RESULTS: ${passedTests}/${totalTests} tests passed.`);
if (passedTests !== totalTests) {
  process.exit(1);
}
console.log('ALL SUBHEADER & FOOTER RELOCATION TESTS PASSED SUCCESSFULLY!');
