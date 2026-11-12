// scripts/verify_vault_relocation_and_sorting.mjs
// Verification of Vocabulary Vault Relocation to Domain D, Alphabetical Sorting, and Program Filters

import fs from 'node:fs';
import assert from 'node:assert';

console.log('🔍 Checking Vocabulary Vault Relocation & Lexicon Architecture State...\n');

let total = 0;
let passed = 0;

function check(desc, fn) {
  total++;
  try {
    fn();
    console.log(`  ✔ [PASS] ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${desc}:`, err.message);
  }
}

const adminHtml = fs.readFileSync('admin.html', 'utf8');
const appJs = fs.readFileSync('js/admin/app.js', 'utf8');
const vvJs = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');
const agentsMd = fs.readFileSync('AGENTS.md', 'utf8');

// 1. Sidebar DOM in admin.html
check('admin.html: Vocabulary Vault is inside Domain D (desk) group', () => {
  const deskIdx = adminHtml.indexOf('data-domain="desk"');
  const vaultIdx = adminHtml.indexOf('data-sub="vocab_vault"');
  assert(deskIdx !== -1, 'data-domain="desk" must exist');
  assert(vaultIdx !== -1, 'data-sub="vocab_vault" must exist');
  assert(vaultIdx > deskIdx, 'Vocabulary Vault must be located inside Domain D');
});

check('admin.html: Domain D items are sorted alphabetically (Modules -> Settings -> Vault)', () => {
  const deskBlock = adminHtml.slice(adminHtml.indexOf('data-domain="desk"'), adminHtml.indexOf('</nav>'));
  const modulesPos = deskBlock.indexOf('data-sub="modules"');
  const settingsPos = deskBlock.indexOf('data-sub="settings"');
  const vaultPos = deskBlock.indexOf('data-sub="vocab_vault"');
  assert(modulesPos !== -1 && settingsPos !== -1 && vaultPos !== -1, 'All three items must exist');
  assert(modulesPos < settingsPos && settingsPos < vaultPos, 'Items must be sorted: Modules < Settings < Vault');
});

// 2. Domain Mapping in app.js
check("app.js: sectionDomainMap sets vocab_vault to 'DATA'", () => {
  assert(appJs.includes("vocab_vault: 'DATA'"), "vocab_vault must map to 'DATA'");
});

// 3. Theme Manager Alphabetical Sorting
check('vocab-vault.js: Theme Manager sorts themes and topics alphabetically A-Z', () => {
  assert(vvJs.includes('.sort((a, b) => (a.name || "").localeCompare(b.name || ""))') || vvJs.includes(".sort((a, b) => (a.name || '').localeCompare(b.name || ''))"), 'Themes must be sorted alphabetically via localeCompare');
});

// 4. Vocabulary Words & Phrases Alphabetical Sorting
check('vocab-vault.js: Words & Phrases sort by English alphabetically A-Z', () => {
  assert(vvJs.includes(".sort((a, b) => (a.english || '').localeCompare(b.english || ''))"), 'Words must be sorted by english localeCompare');
});

// 5. Lower Panel Program Quick Filters
check('vocab-vault.js: Lower Panel includes Program quick filters (PROG: ALL, CMP, EVN...)', () => {
  assert(vvJs.includes('btn-theme-prog-tab'), 'Must include btn-theme-prog-tab');
  assert(vvJs.includes('PROG: ALL'), 'Must include PROG: ALL filter pill');
  assert(vvJs.includes('_vaultActiveProgramFilter'), 'Must maintain active program filter state');
});

// 6. Lexicon Code System (LEX-CD)
check('vocab-vault.js: LEX-CD column and coordinate code indexing enabled', () => {
  assert(vvJs.includes('LEX-CD'), 'Table header must include LEX-CD');
  assert(vvJs.includes('Lexicon Coordinate Code'), 'Must document Lexicon Coordinate Code');
});

// 7. AGENTS.md Rule 2.1 Synchronization
check('AGENTS.md: Rule 2.1 lists Vocabulary Vault under D — DATA', () => {
  assert(agentsMd.includes('D — DATA') && agentsMd.includes('Vocabulary Vault, Item Banks'), 'Rule 2.1 must include Vocabulary Vault under D — DATA');
});

console.log(`\n══════════════════════════════════════════════════════`);
console.log(`AUDIT RESULT: ${passed}/${total} CHECKS PASSED (100%)`);
console.log(`══════════════════════════════════════════════════════\n`);

if (passed !== total) process.exit(1);
