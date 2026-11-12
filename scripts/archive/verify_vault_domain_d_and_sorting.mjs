import fs from 'fs';

// Verify static DOM structure in admin.html
const adminHtml = fs.readFileSync('admin.html', 'utf8');

console.log('--- Testing admin.html DOM Architecture ---');
if (!adminHtml.includes('<!-- DOMAIN C: Class (Active Learning Classes) -->')) {
  throw new Error('Domain C comment missing or not updated');
}

// Ensure Domain C does NOT have vocab_vault
const domainCMatch = adminHtml.match(/<div class="nav-domain-group" data-domain="class">([\s\S]*?)<\/div>\s*<!-- DOMAIN D/);
if (!domainCMatch) {
  throw new Error('Could not extract Domain C block');
}
const domainCContent = domainCMatch[1];
if (domainCContent.includes('vocab_vault')) {
  throw new Error('FAIL: vocab_vault still found in Domain C!');
}
console.log('PASS: Domain C is clean and does not contain vocab_vault.');

// Ensure Domain D contains modules -> settings -> vocab_vault in that exact alphabetical order
const domainDMatch = adminHtml.match(/<div class="nav-domain-group" data-domain="desk">([\s\S]*?)<\/div>\s*<\/nav>/);
if (!domainDMatch) {
  throw new Error('Could not extract Domain D block');
}
const domainDContent = domainDMatch[1];
if (!domainDContent.includes('data-sub="modules"')) {
  throw new Error('FAIL: modules missing in Domain D');
}
if (!domainDContent.includes('data-sub="settings"')) {
  throw new Error('FAIL: settings missing in Domain D');
}
if (!domainDContent.includes('data-sub="vocab_vault"')) {
  throw new Error('FAIL: vocab_vault missing in Domain D');
}

const posModules = domainDContent.indexOf('data-sub="modules"');
const posSettings = domainDContent.indexOf('data-sub="settings"');
const posVault = domainDContent.indexOf('data-sub="vocab_vault"');

if (posModules >= posSettings || posSettings >= posVault) {
  throw new Error(`FAIL: Domain D items not in alphabetical order! Modules: ${posModules}, Settings: ${posSettings}, Vault: ${posVault}`);
}
console.log('PASS: Domain D items are in strict alphabetical order: Modules -> Settings -> Vocabulary Vault.');

// Verify js/admin/app.js sectionDomainMap
const appJs = fs.readFileSync('js/admin/app.js', 'utf8');
if (!appJs.includes("vocab_vault: 'DATA'")) {
  throw new Error("FAIL: sectionDomainMap does not map vocab_vault to 'DATA'");
}
if (appJs.includes("vocab_vault: 'CLASS'")) {
  throw new Error("FAIL: vocab_vault still mapped to 'CLASS'");
}
console.log("PASS: js/admin/app.js correctly maps vocab_vault to 'DATA'.");

// Verify js/admin/vocab-vault.js enhancements
const vaultJs = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');

if (!vaultJs.includes('btn-theme-prog-tab')) {
  throw new Error('FAIL: btn-theme-prog-tab not found in vocab-vault.js');
}
if (!vaultJs.includes('vault-program-filter')) {
  throw new Error('FAIL: vault-program-filter not found in vocab-vault.js');
}
if (!vaultJs.includes('_allWords.sort((a, b) => {')) {
  throw new Error('FAIL: Lexicon code pre-indexing sort not found in vocab-vault.js');
}
if (!vaultJs.includes('(a.name || \'\').localeCompare(b.name || \'\')')) {
  throw new Error('FAIL: Alphabetical name sorting not found in vocab-vault.js');
}
console.log('PASS: vocab-vault.js has all Alphabetical sorting, Program filter pills, and Lexicon Code pre-indexing.');

// Verify AGENTS.md Rule 2.1
const agentsMd = fs.readFileSync('AGENTS.md', 'utf8');
if (!agentsMd.includes('4. `D — DATA` (Vocabulary Vault, Item Banks, Modules, System Settings, Audit Logs)')) {
  throw new Error('FAIL: AGENTS.md Rule 2.1 not updated with Domain D Vocabulary Vault');
}
console.log('PASS: AGENTS.md Rule 2.1 verified.');

console.log('\n========================================');
console.log('ALL VERIFICATION ASSERTIONS PASSED (100%)');
console.log('========================================');
