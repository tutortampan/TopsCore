import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 Starting Automated Verification: Test Blueprint Controls, Table Pruning, Answer Type & Theme Boundary Lines...');

const vocabVaultJs = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');
const adminCss = fs.readFileSync('css/admin.css', 'utf8');
const appJs = fs.readFileSync('js/admin/app.js', 'utf8');
const adminHtml = fs.readFileSync('admin.html', 'utf8');
const swJs = fs.readFileSync('sw.js', 'utf8');

let passedTests = 0;

function it(desc, fn) {
  try {
    fn();
    console.log(`  [PASS] ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${desc}: ${err.message}`);
    process.exitCode = 1;
  }
}

// 1. Top toolbar removed from above table in vocab-vault.js
it('vocab-vault.js: Top toolbar removed from above table, table directly under tab container', () => {
  assert(!vocabVaultJs.includes('<!-- Top Control Toolbar (Clean & Minimal: Program Select + Level Tabs + Search Only) -->'), 'Old top toolbar comment must be removed');
  assert(vocabVaultJs.includes('<table id="blueprint-matrix-table"'), 'Table must exist directly in container');
});

// 2. Bottom infobar 3-zone configuration
it('vocab-vault.js: Bottom infobar configures left (Program & Levels), center (Metadata), right (Search & Action Buttons)', () => {
  assert(vocabVaultJs.includes('window.setBottomInfobar(leftHtml, rightHtml, centerHtml)'), 'setBottomInfobar must pass left, right, and center HTML');
  assert(vocabVaultJs.includes('id="bp-program-select"'), 'Program select must be in bottom infobar');
  assert(vocabVaultJs.includes('class="btn-bp-level-tab"'), 'Level tabs must be in bottom infobar');
  assert(vocabVaultJs.includes('id="bp-search-input"'), 'Search input must be in bottom infobar');
  assert(vocabVaultJs.includes('id="btn-bp-settings"'), 'Settings button must be in bottom infobar');
  assert(vocabVaultJs.includes('id="btn-bp-autogen"'), 'Auto-generate button must be in bottom infobar');
  assert(vocabVaultJs.includes('Readiness:'), 'Readiness metadata chip must be present in center');
});

// 3. Checkbox column removed
it('vocab-vault.js: Checkbox column (select all & row checkboxes) completely eliminated', () => {
  assert(!vocabVaultJs.includes('id="bp-select-all-cb"'), 'Header checkbox must be removed');
  assert(!vocabVaultJs.includes('class="bp-row-select-cb"'), 'Row checkboxes must be removed');
});

// 4. ACTIONS column removed
it('vocab-vault.js: ACTIONS column with redundant Class Hub buttons completely eliminated from blueprint-matrix-table', () => {
  assert(!vocabVaultJs.includes('class="btn btn-secondary btn-sm btn-goto-class-hub"'), 'Row actions button must be removed');
  const bpTableMatch = vocabVaultJs.match(/<table id="blueprint-matrix-table"[\s\S]*?<\/thead>/);
  assert(bpTableMatch && !bpTableMatch[0].includes('ACTIONS'), 'ACTIONS header must be removed from blueprint table');
});

// 5. Super-headers structured
it('vocab-vault.js: 4-group super-headers implemented on blueprint-matrix-table', () => {
  assert(vocabVaultJs.includes('class="bp-sh-topic">Curriculum Topic</th>'), 'Curriculum Topic super header must exist');
  assert(vocabVaultJs.includes('class="bp-sh-vocab">Vocabulary Pool</th>'), 'Vocabulary Pool super header must exist');
  assert(vocabVaultJs.includes('class="bp-sh-blueprint">Generation Blueprint</th>'), 'Generation Blueprint super header must exist');
  assert(vocabVaultJs.includes('class="bp-sh-status">Readiness Status</th>'), 'Readiness Status super header must exist');
});

// 6. ANSWER TYPE column added
it('vocab-vault.js: ANSWER TYPE column added next to FORMAT in header and body rows', () => {
  assert(vocabVaultJs.includes('>ANSWER TYPE</th>'), 'ANSWER TYPE column header must exist');
  assert(vocabVaultJs.includes('badge-answer-type'), 'badge-answer-type class must be used in body rows');
  assert(vocabVaultJs.includes('window._onBpAnswerTypeChange'), 'Handler for changing topic answer type must exist');
});

// 7. Neutral border on student details
it('admin.css: super-hdr-student and col-sticky-last use neutral border instead of sky blue #38bdf8', () => {
  assert(!adminCss.includes('#class-attendance-grid th.super-hdr-student {\n  position: sticky !important;\n  top: 0 !important;\n  left: 0 !important;\n  z-index: 35 !important;\n  background: #0b1120 !important;\n  color: #ffffff !important;\n  border-right: 3px solid rgba(56, 189, 248, 0.75)'), 'super-hdr-student must not use sky blue border');
  assert(adminCss.includes('#class-attendance-grid th.super-hdr-student') && adminCss.includes('border-right: 3px solid rgba(255, 255, 255, 0.25) !important;'), 'super-hdr-student must use neutral rgba(255,255,255,0.25) border');
  assert(adminCss.includes('#class-attendance-grid .col-sticky-last') && adminCss.includes('border-right: 3px solid rgba(255, 255, 255, 0.25) !important;'), 'col-sticky-last must use neutral rgba(255,255,255,0.25) border');
});

// 8. Elimination of 3px divider on col-test-theme-total
it('admin.css: col-test-theme-total eliminated thick 3px border cutting through middle of themes', () => {
  assert(!adminCss.includes('#class-attendance-grid th.col-test-theme-total,\n#class-attendance-grid td.col-test-theme-total {\n  width: 38px !important;\n  min-width: 38px !important;\n  max-width: 40px !important;\n  border-left: none !important;\n  border-right: 3px solid rgba(255, 255, 255, 0.35) !important;'), 'Legacy 3px border on col-test-theme-total must be removed');
  assert(adminCss.includes('border-right: 1px dashed rgba(255, 255, 255, 0.08) !important;'), 'col-test-theme-total must use subtle dashed border');
});

// 9. Theme boundary borders on SCR
it('admin.css: Theme divider borders 3px solid firmly on col-test-theme-score-* (SCR)', () => {
  assert(adminCss.includes('#class-attendance-grid th.col-test-theme-score-a') && adminCss.includes('border-right: 3px solid #38bdf8 !important;'), 'Theme A boundary on SCR');
  assert(adminCss.includes('#class-attendance-grid th.col-test-theme-score-b') && adminCss.includes('border-right: 3px solid #c084fc !important;'), 'Theme B boundary on SCR');
  assert(adminCss.includes('#class-attendance-grid th.col-test-theme-score-c') && adminCss.includes('border-right: 3px solid #fbbf24 !important;'), 'Theme C boundary on SCR');
  assert(adminCss.includes('#class-attendance-grid th.col-test-theme-score-d') && adminCss.includes('border-right: 3px solid #34d399 !important;'), 'Theme D boundary on SCR');
});

// 10. setBottomInfobar 3-arg support in app.js
it('app.js: setBottomInfobar supports centerHtml as 3rd parameter', () => {
  assert(appJs.includes('export function setBottomInfobar(leftHtml = \'\', rightHtml = \'\', centerHtml = \'\')'), 'Function signature must accept centerHtml');
  assert(appJs.includes('bottom-infobar-center'), 'bottom-infobar-center markup must be rendered when centerHtml provided');
});

// 11. bottom-infobar-center styling in admin.css
it('admin.css: bottom-infobar-center styling exists', () => {
  assert(adminCss.includes('.bottom-infobar-center {'), '.bottom-infobar-center class must be styled');
});

// 12. Cache buster bumps
it('admin.html and sw.js: Cache busters bumped to v178 and v103', () => {
  assert(adminHtml.includes('v=20261111_v178'), 'admin.html cache buster must be v178');
  assert(swJs.includes('topscore-cache-option-a-v103'), 'sw.js cache name must be v103');
});

console.log(`\nTEST RESULTS: ${passedTests}/12 tests passed.`);
if (passedTests === 12) {
  console.log('🎉 ALL TEST BLUEPRINT REFACTOR & THEME BOUNDARY TESTS PASSED SUCCESSFULLY!\n');
} else {
  console.error('❌ Some tests failed.');
  process.exitCode = 1;
}
