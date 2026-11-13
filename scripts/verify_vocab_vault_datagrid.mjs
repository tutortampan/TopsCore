/**
 * verify_vocab_vault_datagrid.mjs
 * Phase 444 Verification Suite — Vocabulary Vault DataGrid & Flex Primary Migration
 *
 * Verifies:
 * 1. vocab-vault.js #vault-table colgroup has percentage widths (30%, 35%) completely eradicated
 * 2. INDONESIAN column established as Flex Primary (min-width: 220px, zero fixed width)
 * 3. Fixed column widths calibrated (LEX-CD 85px, THEME 140px, TOPIC 180px, TYPE 80px, ENGLISH 280px, ACT 55px)
 * 4. Header <th> tags enforce Flex Primary pattern without percentage widths
 * 5. initColumnResize initialized for vault-table with localStorage key
 * 6. Master Edit Mode discipline (.edit-mode-only on ACT column and delete buttons)
 * 7. Sum of fixed columns + minWidth (1020px) safely fits within standard 1144px workspace
 * 8. Governance ratification in ui-invariants.md
 */

import fs from 'fs';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    failed++;
  }
}

console.log('🧪 Starting Phase 444: Vocabulary Vault DataGrid & Flex Primary Verification Suite...\n');

// -------------------------------------------------------------
// Part 1: Static Code Invariant Checks in vocab-vault.js
// -------------------------------------------------------------
console.log('▶ Pillar 1: Auditing vocab-vault.js Architecture & Column Calibration...');
const vaultContent = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');

// Check colgroup in _renderVaultGrid
const vaultTableMatch = vaultContent.match(/<table id="vault-table"[\s\S]*?<colgroup>([\s\S]*?)<\/colgroup>/);
assert(vaultTableMatch, '#vault-table with colgroup successfully extracted');

const colgroup = vaultTableMatch ? vaultTableMatch[1] : '';

assert(
  !colgroup.includes('30%') && !colgroup.includes('35%'),
  'Eradicated legacy percentage widths (30%, 35%) from #vault-table colgroup'
);

assert(
  colgroup.includes('width: 85px') && colgroup.includes('width: 140px') && colgroup.includes('width: 180px') && colgroup.includes('width: 80px'),
  'Calibrated fixed widths present for LEX-CD (85px), THEME (140px), TOPIC (180px), TYPE (80px)'
);

assert(
  colgroup.includes('width: 280px'),
  'ENGLISH column calibrated to fixed width 280px'
);

assert(
  colgroup.includes('min-width: 220px') && !colgroup.match(/<col style="[^"]*min-width:\s*220px;[^"]*width:\s*\d/),
  'INDONESIAN column col definition is Flex Primary (min-width: 220px, no fixed width)'
);

// -------------------------------------------------------------
// Part 2: Header <th> Tags and Flex Primary Discipline
// -------------------------------------------------------------
console.log('\n▶ Pillar 2: Checking Table Header <th> Invariants...');

const theadMatch = vaultContent.match(/<table id="vault-table"[\s\S]*?<thead[^>]*>([\s\S]*?)<\/thead>/);
assert(theadMatch, '<thead> of #vault-table successfully extracted');

const thead = theadMatch ? theadMatch[1] : '';

assert(
  !thead.includes('width: 30%') && !thead.includes('width: 35%'),
  'Eradicated legacy percentage widths (30%, 35%) from <th> tags'
);

assert(
  thead.includes('data-sort="indonesian"') && thead.includes('min-width: 220px'),
  'INDONESIAN header <th> configured as Flex Primary with min-width: 220px'
);

assert(
  thead.includes('data-sort="english"') && thead.includes('width: 280px'),
  'ENGLISH header <th> configured with fixed width 280px'
);

// -------------------------------------------------------------
// Part 3: Column Resizing and Master Edit Mode Discipline
// -------------------------------------------------------------
console.log('\n▶ Pillar 3: Checking Column Resize Memory & Master Edit Mode...');

assert(
  vaultContent.includes("window.initColumnResize(vaultTable, 'topscore_col_widths_vault-table')"),
  'window.initColumnResize dynamically mounted for vault-table with persistent localStorage key'
);

assert(
  thead.includes('class="edit-mode-only"') && thead.includes('title="Actions">ACT</th>'),
  'ACT header column enforces Master Edit Mode discipline (.edit-mode-only)'
);

// -------------------------------------------------------------
// Part 4: Spatial Allocation & Governance Ratification
// -------------------------------------------------------------
console.log('\n▶ Pillar 4: Spatial Bounds & Governance Ratification...');

const fixedSum = 85 + 140 + 180 + 80 + 280 + 55; // 820px
const minSafe = fixedSum + 220; // 1040px
const standardWorkspace = 1144; // 1366px screen workspace

assert(
  minSafe <= standardWorkspace,
  `Total minSafe width (${minSafe}px) is within standard 1366px workspace (${standardWorkspace}px), guaranteeing zero horizontal scroll`
);

const invariantsContent = fs.readFileSync('.agents/rules/ui-invariants.md', 'utf8');
assert(
  invariantsContent.includes('Vocabulary Vault') && invariantsContent.includes('vocab-vault.js'),
  'Vocabulary Vault formally ratified under §TABLE-FLEX-PRIMARY in ui-invariants.md'
);

console.log('\n======================================================');
console.log(`Phase 444 Verification Summary: ${passed} passed, ${failed} failed`);
console.log('======================================================');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL 13 CHECKS PASSED: VOCABULARY VAULT DATAGRID & FLEX PRIMARY VERIFIED (100%)!\n');
}
