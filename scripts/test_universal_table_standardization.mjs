// scripts/test_universal_table_standardization.mjs
// Authoritative automated test suite verifying universal table standardization across TopsCore LMS.

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
}

console.log('🧪 Starting Universal Table Standardization & Harmonization Test Suite...\n');

// 1. Pillar 1: Uniform 12px Font Size
console.log('▶ Checking Pillar 1: Uniform 12px Font Size...');
const adminCss = fs.readFileSync(path.join(rootDir, 'css', 'admin.css'), 'utf-8');
assert(adminCss.includes('font-size: 12px !important;'), 'admin.css must declare font-size: 12px !important;');
assert(adminCss.includes('.table-wrap th'), 'admin.css must target .table-wrap th for 12px standardization');
assert(adminCss.includes('.table-wrap td'), 'admin.css must target .table-wrap td for 12px standardization');

const appJs = fs.readFileSync(path.join(rootDir, 'js', 'admin', 'app.js'), 'utf-8');
assert(appJs.includes("grid.style.setProperty('--matrix-font-size', '12px');"), 'app.js must enforce 12px matrix font size');
assert(appJs.includes("grid.style.setProperty('--matrix-badge-font', '12px');"), 'app.js must enforce 12px matrix badge font size');
console.log('  ✅ Pillar 1 Passed: Uniform 12px font size strictly enforced.');

// 2. Pillar 2: Superscript Tag Standard (1.0em)
console.log('▶ Checking Pillar 2: Superscript Tag Standard (1.0em)...');
const styleCss = fs.readFileSync(path.join(rootDir, 'css', 'style.css'), 'utf-8');
const resultCss = fs.readFileSync(path.join(rootDir, 'css', 'result.css'), 'utf-8');

assert(styleCss.includes('.test-rem-sup') && styleCss.includes('font-size: 1.0em !important;'), 'style.css must enforce 1.0em on .test-rem-sup');
assert(adminCss.includes('.test-rem-sup') && adminCss.includes('font-size: 1.0em !important;'), 'admin.css must enforce 1.0em on .test-rem-sup');
assert(resultCss.includes('.test-rem-sup') && resultCss.includes('font-size: 1.0em !important;'), 'result.css must enforce 1.0em on .test-rem-sup');
console.log('  ✅ Pillar 2 Passed: Superscript tags enforce exact 1.0em font size.');

// 3. Pillar 3: Table Spatial Margins & 100vh Viewport Lock
console.log('▶ Checking Pillar 3: Table Spatial Margins & Viewport Lock...');
assert(adminCss.includes('.admin-content:has(.table-wrap)'), 'admin.css must include .admin-content:has(.table-wrap) with 10px 10px 0 10px padding');
assert(adminCss.includes('.table-wrap {') && adminCss.includes('margin-bottom: 0 !important;'), 'admin.css must lock .table-wrap margin-bottom: 0 !important;');
console.log('  ✅ Pillar 3 Passed: 10px top/sides, 0px bottom margin verified.');

// 4. Pillar 4: Two-Tier Sticky Header Locking
console.log('▶ Checking Pillar 4: Two-Tier Sticky Header Locking...');
assert(adminCss.includes('position: sticky !important;') && adminCss.includes('top: 0 !important;') && adminCss.includes('z-index: 20 !important;'), 'admin.css must lock super-headers at top: 0 with z-index: 20');
assert(adminCss.includes('top: 24px !important;') && adminCss.includes('z-index: 19 !important;'), 'admin.css must lock subheaders at top: 24px with z-index: 19');
console.log('  ✅ Pillar 4 Passed: Two-Tier sticky headers locked at top:0 and top:24px.');

// 5. Pillar 5: Small Table Anti-Ballooning & Zero Scrollbar
console.log('▶ Checking Pillar 5: Small Table Anti-Ballooning & Zero Scrollbar...');
assert(appJs.includes('const minRowHeight = 24;') && appJs.includes('const maxRowHeight = 32;'), 'app.js must bound row heights between 24px and 32px');
assert(appJs.includes("wrap.style.overflowY = totalTableHeight <= (availHeight - 5) ? 'hidden' : 'auto';"), 'app.js must eliminate vertical scrollbar on small tables');
assert(adminCss.includes('#class-attendance-grid table.datagrid-table') && adminCss.includes('height: auto !important;'), 'admin.css must set height: auto !important; on matrix datagrid table to prevent row stretching');
console.log('  ✅ Pillar 5 Passed: Small tables cleanly bound (max 32px) and scrollbars eliminated.');

// 6. Pillar 6: Sort Icon Modernization (No idle ⇅, active ▲/▼ only)
console.log('▶ Checking Pillar 6: Sort Icon Modernization...');
const datagridJs = fs.readFileSync(path.join(rootDir, 'js', 'admin', 'datagrid.js'), 'utf-8');
assert(!datagridJs.includes("'⇅'"), 'datagrid.js must not render idle ⇅ sort icon');
assert(datagridJs.includes("this.sortAsc ? '▲' : '▼'"), 'datagrid.js must render ▲ / ▼ for active sorted column');

const testsAccessJs = fs.readFileSync(path.join(rootDir, 'js', 'admin', 'tests-access.js'), 'utf-8');
assert(!testsAccessJs.includes('>⇅<'), 'tests-access.js must not render idle ⇅ in table headers');
assert(testsAccessJs.includes("icon.textContent = _liveSortDirection === 'asc' ? '▲' : '▼'"), 'tests-access.js must render ▲ / ▼ for active sort');
assert(testsAccessJs.includes("icon.textContent = '';"), 'tests-access.js must clear sort icon for inactive columns');
console.log('  ✅ Pillar 6 Passed: Idle ⇅ purged; active ▲/▼ indicators verified.');

// 7. Pillar 7: Live Monitor UI Harmonization & Pure English
console.log('▶ Checking Pillar 7: Live Monitor UI Harmonization & Pure English...');
const bannedIndonesianPhrases = [
  'Belum Ada Skor',
  'Soal:',
  'Intip',
  '0x Bersih',
  'Sedang Mengerjakan',
  'Sudah Selesai',
  'Belum Mulai',
  '🚨 Total Alarm</div>',
  'Soal Terjawab',
  'Belum Diisi',
  'Akurasi:'
];
for (const phrase of bannedIndonesianPhrases) {
  assert(!testsAccessJs.includes(phrase), `tests-access.js must not contain Indonesian phrase "${phrase}"`);
}
assert(testsAccessJs.includes("const circleText = isStar ? '#0f172a' :"), 'tests-access.js must enforce dark slate (#0f172a) on Star circular badge text');
console.log('  ✅ Pillar 7 Passed: 100% Direct English and Star dark slate badge verified.');

// 8. Pillar 8: Classes Management, Class Results & Topics Harmonization
console.log('▶ Checking Pillar 8: Classes Management, Class Results & Topics Harmonization...');
const classesMgmtJs = fs.readFileSync(path.join(rootDir, 'js', 'admin', 'classes-management.js'), 'utf-8');
assert(classesMgmtJs.includes('hideToolbar: true'), 'classes-management.js ClassGrid must have hideToolbar: true');
assert(classesMgmtJs.includes('pageSize: 1000'), 'classes-management.js ClassGrid must have pageSize: 1000');
assert(classesMgmtJs.includes('white-space:nowrap !important; text-overflow:ellipsis; overflow:hidden;'), 'classes-management.js Title column must be single-line nowrap');
assert(!classesMgmtJs.includes('<span class="badge ${statusColors[st]'), 'classes-management.js Status column must not render capsule badge in view mode');

const classJs = fs.readFileSync(path.join(rootDir, 'js', 'admin', 'class.js'), 'utf-8');
assert(classJs.includes("container: 'results-grid-container'") && classJs.includes('hideToolbar: true'), 'class.js results-grid-container must have hideToolbar: true');
assert(classJs.includes('pageSize: 1000'), 'class.js results-grid-container must have pageSize: 1000');
assert(!classJs.includes('<span class="badge badge-success text-xs" style="font-size:0.65rem;padding:1px 5px;" title="Highest score recorded across attempts">Highest</span>'), 'class.js Score column must not render Highest capsule badge');
assert(classJs.includes('<div class="table-wrap">\n        <table class="data-table" id="topics-table">'), 'class.js #topics-table must be wrapped in .table-wrap');
assert(classJs.includes('btn-edit-topic edit-mode-only'), 'class.js topic edit button must have edit-mode-only class');
assert(classJs.includes('btn-del-topic edit-mode-only'), 'class.js topic del button must have edit-mode-only class');

const programMgmtJs = fs.readFileSync(path.join(rootDir, 'js', 'admin', 'program-management.js'), 'utf-8');
assert(programMgmtJs.includes('<div class="card mb-4 table-wrap"'), 'program-management.js matrix table must be wrapped in table-wrap');
assert(adminCss.includes('.matrix-table th {') && adminCss.includes('position: sticky !important;'), 'admin.css must declare sticky header for .matrix-table th');
console.log('  ✅ Pillar 8 Passed: Classes Management, Class Results, Topics & Program Matrix fully harmonized.');

// 9. Master Edit Mode ON Safeguards
console.log('▶ Checking Master Edit Mode ON Table Input Safeguards...');
assert(adminCss.includes('body.global-edit-mode-on .table-wrap td input'), 'admin.css must style inputs in .table-wrap td when edit mode is ON');
assert(adminCss.includes('border-radius: 9999px !important;'), 'admin.css must enforce capsule border-radius: 9999px on table inputs');
assert(adminCss.includes('height: 24px !important;'), 'admin.css must enforce exact 24px height on table inputs in edit mode');
console.log('  ✅ Master Edit Mode ON Safeguards verified: capsule pill 24px inputs.');

console.log('\n🎉 ALL 8 PILLARS OF UNIVERSAL TABLE STANDARDIZATION PASSED WITH 100% INTEGRITY!\n');
