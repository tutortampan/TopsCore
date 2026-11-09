import fs from 'fs';
import assert from 'assert';

console.log('=== [TEST] Starting Global Edit Mode, Single-Responsibility Columns & Vocab Vault Verification ===\n');

// 1. Verify AGENTS.md Invariants
console.log('[Test 1] Verifying AGENTS.md rules 2.23 and 2.24...');
const agentsMd = fs.readFileSync('AGENTS.md', 'utf8');
assert(agentsMd.includes('## 2.23 Zero Outer Page Scroll & Table-Only Viewport Lock (/learn)'), 'AGENTS.md must contain Rule 2.23');
assert(agentsMd.includes('## 2.24 Global Master Edit Mode Across All Admin Pages (/learn)'), 'AGENTS.md must contain Rule 2.24');
assert(agentsMd.includes('Table-Only Vertical Scroll'), 'Rule 2.23 must mandate Table-Only vertical scroll');
assert(agentsMd.includes('Absolute Hiding when OFF'), 'Rule 2.24 must mandate Absolute Hiding when OFF');
console.log('  ✓ AGENTS.md Section 2.23 and 2.24 verified.');

// 2. Verify admin.html Structure
console.log('[Test 2] Verifying admin.html Global Edit Mode Toggle...');
const adminHtml = fs.readFileSync('admin.html', 'utf8');
assert(adminHtml.includes('id="global-edit-mode-toggle"'), 'admin.html must contain global edit mode toggle');
assert(adminHtml.includes('class="admin-topbar-actions"'), 'admin.html must place toggle in admin-topbar-actions');
assert(adminHtml.includes('EDIT: OFF'), 'Initial label should default to EDIT: OFF');
console.log('  ✓ admin.html topbar actions & toggle verified.');

// 3. Verify js/session.js Methods
console.log('[Test 3] Verifying js/session.js Global Edit Mode State Management...');
const sessionJs = fs.readFileSync('js/session.js', 'utf8');
assert(sessionJs.includes('export function getGlobalEditMode'), 'session.js must export getGlobalEditMode');
assert(sessionJs.includes('export function setGlobalEditMode'), 'session.js must export setGlobalEditMode');
assert(sessionJs.includes('export function toggleGlobalEditMode'), 'session.js must export toggleGlobalEditMode');
assert(sessionJs.includes('admin-edit-mode-changed'), 'session.js must dispatch admin-edit-mode-changed event');
console.log('  ✓ js/session.js state management and event dispatch verified.');

// 4. Verify css/admin.css Zero-Scroll & Edit Mode Hiding Rules
console.log('[Test 4] Verifying css/admin.css Viewport Lock & Hiding Rules...');
const adminCss = fs.readFileSync('css/admin.css', 'utf8');
assert(adminCss.includes('.btn-edit-mode-global'), 'css/admin.css must contain .btn-edit-mode-global');
assert(adminCss.includes('body:not(.global-edit-mode-on) .edit-mode-only'), 'css/admin.css must hide .edit-mode-only when OFF');
assert(adminCss.includes('.admin-content {') && adminCss.includes('overflow: hidden !important;'), 'css/admin.css must lock .admin-content to overflow: hidden');
assert(adminCss.includes('.table-wrap table thead th') && adminCss.includes('position: sticky'), 'Table headers must be sticky');
console.log('  ✓ css/admin.css viewport lock & edit-mode-only zero-leakage verified.');

// 5. Verify js/admin/vocab-vault.js Overhaul & Single Responsibility Columns
console.log('[Test 5] Verifying js/admin/vocab-vault.js Single-Responsibility Columns...');
const vaultJs = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');
assert(vaultJs.includes(`title: 'Test Blueprint', label: 'Test Blueprint'`), 'Tab must be named Test Blueprint');
assert(vaultJs.includes('theme-manager-flat-table'), 'Theme Manager must use flat table layout');
assert(vaultJs.includes('openThemeProgramAssignModal'), 'Theme Manager must implement theme-level assignment modal');
assert(vaultJs.includes('bp-select-all-cb'), 'Test Blueprint must include master select-all checkbox');
assert(vaultJs.includes('bp-row-select-cb'), 'Test Blueprint must include row selection checkboxes');
assert(vaultJs.includes('bp-setting-badge') && vaultJs.includes('bp-setting-input'), 'Test Blueprint must include settings badges/inputs');

// Check Single Responsibility Column Invariants in Theme Manager:
assert(vaultJs.includes('>TOTAL</th>') && vaultJs.includes('>WORDS</th>') && vaultJs.includes('>PHRASES</th>'), 'Theme Manager must split Vault Items into TOTAL, WORDS, PHRASES');
assert(!vaultJs.includes('Vault Items</th>'), 'Theme Manager must NOT contain composite Vault Items column');

// Check Single Responsibility Column Invariants in Theme Blueprint:
assert(vaultJs.includes('>ITEMS</th>') && vaultJs.includes('>DURATION</th>') && vaultJs.includes('>PASS SCORE</th>') && vaultJs.includes('>FORMAT</th>'), 'Theme Blueprint must split settings and vocab pool into discrete columns');
assert(!vaultJs.includes('Test Settings</th>'), 'Theme Blueprint must NOT contain composite Test Settings column');
assert(!vaultJs.includes('✓ Ready (${taskDuration}m'), 'Theme Blueprint Task Status must NOT cram duration/score into pill');
assert(!vaultJs.includes('✓ Ready (${examDuration}m'), 'Theme Blueprint Exam Status must NOT cram duration/score into pill');
console.log('  ✓ js/admin/vocab-vault.js Single-Responsibility Columns verified.');

// 6. Verify tests-management.js Single Responsibility Columns
console.log('[Test 6] Verifying js/admin/tests-management.js Single-Responsibility Columns...');
const testsMgmtJs = fs.readFileSync('js/admin/tests-management.js', 'utf8');
assert(testsMgmtJs.includes('>Test Title</th>') && testsMgmtJs.includes('>Shell Code</th>'), 'Pacing table must separate Test Title and Shell Code');
assert(testsMgmtJs.includes('>Avg Duration</th>') && testsMgmtJs.includes('>Time Limit</th>'), 'Pacing table must separate Avg Duration and Time Limit');
assert(!testsMgmtJs.includes('<th>Test &amp; Shell Code</th>'), 'Pacing table must NOT pack Test and Shell Code');
assert(!testsMgmtJs.includes('<th>Duration / Limit</th>'), 'Pacing table must NOT pack Duration and Limit');
console.log('  ✓ js/admin/tests-management.js Single-Responsibility Columns verified.');

// 7. Verify student-management.js Fallback Single Responsibility Columns
console.log('[Test 7] Verifying js/admin/student-management.js Single-Responsibility Columns...');
const studentMgmtJs = fs.readFileSync('js/admin/student-management.js', 'utf8');
assert(studentMgmtJs.includes("label: 'Completed'") && studentMgmtJs.includes("label: 'Assigned'"), 'Student grid fallback must separate Completed and Assigned columns');
console.log('  ✓ js/admin/student-management.js Single-Responsibility Columns verified.');

console.log('\n=== ALL TESTS PASSED: SINGLE-RESPONSIBILITY COLUMNS & EDIT MODE (100%) ===\n');
