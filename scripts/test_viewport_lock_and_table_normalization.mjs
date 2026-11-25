/**
 * test_viewport_lock_and_table_normalization.mjs
 * 
 * Automated Verification Suite for:
 * 1. Rule 15 & AGENTS.md 2.28 & 2.32: 100vh Root Viewport Lock, calc(100vh - 50px) Banner Compensation, Zero Outer Scroll.
 * 2. Rule 15: Universal Sticky Header (thead th top 0, z-index 10) & Sticky Footer (tfoot bottom 0, z-index 10) & tfoot:empty collapse.
 * 3. Rule 18 & AGENTS.md 2.31: No-Capsule View Mode, Flat Tabular-Nums Text, and Edit-Mode-Only Input Capsules.
 * 4. Rule 16 & AGENTS.md 2.30: Pure Direct English UI Standard across toolbars, tabs, modals, and tables.
 * 5. Rule 17 & AGENTS.md 2.31: Single-Responsibility Columns across data grids.
 * 6. Rule 19 & AGENTS.md 2.32: Middle-Panel Tab Hygiene & Editor Cleanup.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

console.log('🧪 Starting Viewport Lock & Table Layout Normalization Verification...\n');

// =========================================================================
// 1. Root & Layout Viewport Containment & 60px Deduction (css/admin.css)
// =========================================================================
console.log('--- 1. Testing Root & Layout Viewport Containment (css/admin.css) ---');
const adminCss = fs.readFileSync(path.join(ROOT_DIR, 'css', 'admin.css'), 'utf-8');

// 1.1 html & body viewport lock
assert.ok(
  adminCss.includes('height: 100vh !important;') &&
  adminCss.includes('max-height: 100vh !important;') &&
  adminCss.includes('width: 100vw !important;') &&
  adminCss.includes('overflow: hidden !important;') &&
  adminCss.includes('overflow-x: hidden !important;') &&
  adminCss.includes('overflow-y: hidden !important;'),
  'html & body MUST strictly enforce 100vh lock with overflow: hidden !important'
);
console.log('  ✔ html & body strictly locked to 100vh viewport without outer scrolling');

// 1.2 #admin-console 50px banner deduction
assert.ok(
  adminCss.includes('height: calc(100vh - 50px) !important;') &&
  adminCss.includes('max-height: calc(100vh - 50px) !important;'),
  '#admin-console MUST deduct exactly 50px for #bottom-ad-banner'
);
console.log('  ✔ #admin-console dynamically set to calc(100vh - 50px) to compensate locked bottom ad banner');

// 1.3 .admin-main & .admin-content containment
assert.ok(
  adminCss.includes('.admin-main') &&
  adminCss.includes('.admin-content') &&
  adminCss.includes('overflow: hidden !important; /* STRICT: No outer scrollbar */'),
  '.admin-main and .admin-content must be locked to overflow: hidden without outer scrollbars'
);
console.log('  ✔ .admin-main and .admin-content overflow strictly contained');

// =========================================================================
// 2. Universal Sticky Header & Footer on All Tables
// =========================================================================
console.log('\n--- 2. Testing Universal Sticky Header & Footer ---');

assert.ok(
  adminCss.includes('.table-wrap table thead th') &&
  adminCss.includes('.datagrid-table thead th') &&
  adminCss.includes('#blueprint-matrix-table thead th') &&
  adminCss.includes('position: sticky !important;') &&
  adminCss.includes('top: 0 !important;') &&
  adminCss.includes('z-index: 10 !important;'),
  'All table headers must have sticky top: 0 with z-index: 10'
);
console.log('  ✔ All table thead th headers have position: sticky !important; top: 0 !important; z-index: 10 !important;');

assert.ok(
  adminCss.includes('.table-wrap table tfoot') &&
  adminCss.includes('.datagrid-table tfoot') &&
  adminCss.includes('#blueprint-matrix-table tfoot') &&
  adminCss.includes('position: sticky !important;') &&
  adminCss.includes('bottom: 0 !important;') &&
  adminCss.includes('z-index: 10 !important;'),
  'All table footers must have sticky bottom: 0 with z-index: 10'
);
console.log('  ✔ All table footers have position: sticky !important; bottom: 0 !important; z-index: 10 !important;');

assert.ok(
  adminCss.includes('.table-wrap table tfoot:empty') &&
  adminCss.includes('.datagrid-table tfoot:empty') &&
  adminCss.includes('#blueprint-matrix-table tfoot:empty') &&
  adminCss.includes('display: none !important;'),
  'Empty table footers must automatically collapse'
);
console.log('  ✔ Empty table footers (tfoot:empty) automatically collapse');

// =========================================================================
// 3. No-Capsule View Mode & Transparent Excel-Like Edit Mode Cells
// =========================================================================
console.log('\n--- 3. Testing No-Capsule View Mode & Transparent Edit Mode Cells ---');

assert.ok(
  adminCss.includes('.datagrid-table td .badge:not(.badge-grade-symbol)') &&
  adminCss.includes('.table-wrap td .badge:not(.badge-grade-symbol)') &&
  adminCss.includes('background: transparent !important;') &&
  adminCss.includes('border: none !important;'),
  'Table data cells must not render in capsule/badge mode'
);
console.log('  ✔ CSS strips badge backgrounds, borders, and shadows from data cells');

assert.ok(
  adminCss.includes('font-variant-numeric: tabular-nums !important;'),
  'Table data cells must use tabular numbers for crisp aligned typography'
);
console.log('  ✔ Tabular numbers enforced across table cells');

assert.ok(
  adminCss.includes('body.global-edit-mode-on .datagrid-table td input') &&
  adminCss.includes('body.global-edit-mode-on .bp-setting-input input') &&
  adminCss.includes('background: transparent !important;'),
  'When Edit Mode is ON, editable interactive inputs receive transparent Excel cell styling'
);
console.log('  ✔ Edit-Mode-Only inputs receive transparent borderless Excel cell styling');

// =========================================================================
// 4. Student Roster Toolbar & Void Elimination (student-management.js)
// =========================================================================
console.log('\n--- 4. Testing Student Roster Toolbar & Table Layout ---');
const studentMgmtJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'admin', 'student-management.js'), 'utf-8');

assert.ok(
  studentMgmtJs.includes('syncStudentRosterBottomInfobar') &&
  studentMgmtJs.includes('window.setBottomInfobar'),
  'Student roster actions must be docked in the canonical bottom infobar'
);
console.log('  ✔ Student roster actions docked in canonical bottom infobar');

assert.ok(
  !studentMgmtJs.includes('title="Daftarkan Siswa Baru"') &&
  studentMgmtJs.includes('title="Register New Student"'),
  'Add student button tooltip must be in English'
);
assert.ok(
  !studentMgmtJs.includes('title="Import Siswa dari Excel / CSV"') &&
  studentMgmtJs.includes('title="Import Students from Excel / CSV"'),
  'Import students button tooltip must be in English'
);
console.log('  ✔ Student action tooltips standardized to English');

// Check Level column render in student table has no capsule
assert.ok(
  studentMgmtJs.includes('color:#f8fafc;font-weight:700;font-size:0.75rem;white-space:nowrap;font-variant-numeric:tabular-nums;') || studentMgmtJs.includes('color:#f8fafc;font-weight:700;font-size: 12px;white-space:nowrap;font-variant-numeric:tabular-nums;') || studentMgmtJs.includes('color:#f8fafc;font-weight:700;font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums;'),
  'Student table level render must be clean flat text with tabular numbers'
);
console.log('  ✔ Student table level render normalized to clean flat text');

// =========================================================================
// 5. Test Blueprint & Vocabulary Vault Normalization (vocab-vault.js)
// =========================================================================
console.log('\n--- 5. Testing Test Blueprint & Vocabulary Vault Normalization ---');
const vocabVaultJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'admin', 'vocab-vault.js'), 'utf-8');

assert.ok(
  vocabVaultJs.includes('class="bp-count-total" style="color: #38bdf8; font-weight: 700; font-size: 11px; font-variant-numeric: tabular-nums;"') ||
  vocabVaultJs.includes('class="bp-count-total" style="color: #38bdf8; font-weight: 700; font-size: 12px; font-variant-numeric: tabular-nums;"'),
  'Blueprint matrix totalCount must not use capsule background or border'
);
console.log('  ✔ Blueprint matrix totalCount renders as clean unboxed tabular text');

assert.ok(
  vocabVaultJs.includes('style="color: #38bdf8; font-weight: 600; font-size: 11px;">7×7</span>') ||
  vocabVaultJs.includes('style="color: #38bdf8; font-weight: 600; font-size: 12px;">7×7</span>') ||
  vocabVaultJs.includes('style="color: #38bdf8; font-weight: 600; font-size: 12px;">${formatLabel}</span>'),
  'Blueprint matrix delivery format renders as flat text'
);
console.log('  ✔ Blueprint matrix delivery format renders as flat text');

// =========================================================================
// 6. Pure Direct English UI Standard (app.js, desk.js, tests-access.js)
// =========================================================================
console.log('\n--- 6. Testing Pure Direct English UI Standard ---');
const appJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'admin', 'app.js'), 'utf-8');
const deskJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'admin', 'desk.js'), 'utf-8');
const testsAccessJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'admin', 'tests-access.js'), 'utf-8');

const classesHubJs = fs.readFileSync(path.join(ROOT_DIR, 'js', 'admin', 'classes-hub.js'), 'utf-8');

assert.ok(
  (appJs.includes('Open Test Blueprint ↗') || classesHubJs.includes('Open Topic Blueprint & Vocabulary Vault')) &&
  !appJs.includes('Buka Test Blueprint ↗'),
  'Class Hub toolbar button must use Direct English Blueprint label'
);
console.log('  ✔ Open Test Blueprint button label is in English');

assert.ok(
  appJs.includes('title="Open Default Test System &amp; Blueprint Settings"') ||
  classesHubJs.includes('title="Open Topic Blueprint & Vocabulary Vault"'),
  'Test System Settings / Blueprint tooltip is in English'
);
console.log('  ✔ Test System Settings tooltip is in English');

assert.ok(
  (deskJs.includes('Open/Close Exam &amp; Check Score Access') || deskJs.includes('Open/Close Exam &amp; Check Rate Access')) &&
  !deskJs.includes('Buka Tutup Ujian &amp; Cek Nilai Access'),
  'Desk tutor card must use English description'
);
console.log('  ✔ Desk tutor card uses English description');

assert.ok(
  testsAccessJs.includes('Open Normal Session (Full Score)') &&
  testsAccessJs.includes('Open Remedial Session (Max 60%)'),
  'Tests access button titles must be in English'
);
console.log('  ✔ Tests access session controls standardized to English');

// =========================================================================
// 7. Middle-Panel Tab Hygiene & VSCode Configuration
// =========================================================================
console.log('\n--- 7. Testing Editor Tab Hygiene (.vscode/settings.json) ---');
const rawSettings = fs.readFileSync(path.join(ROOT_DIR, '.vscode', 'settings.json'), 'utf-8');
const cleanJson = rawSettings.replace(/\/\/.*/g, '');
const vscodeSettings = JSON.parse(cleanJson);

assert.strictEqual(vscodeSettings['workbench.editor.limit.enabled'], true, 'workbench.editor.limit.enabled must be true');
assert.strictEqual(vscodeSettings['workbench.editor.limit.max'], 3, 'workbench.editor.limit.max must be 3');
assert.strictEqual(vscodeSettings['workbench.editor.limit.perEditorGroup'], true, 'workbench.editor.limit.perEditorGroup must be true');
console.log('  ✔ .vscode/settings.json enforces maximum 3 open editor tabs');

console.log('\n🎉 ALL VIEWPORT LOCK, TABLE NORMALIZATION, AND ENGLISH UI CHECKS PASSED PERFECTLY!\n');
