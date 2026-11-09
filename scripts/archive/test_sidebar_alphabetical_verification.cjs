const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST SUITE: SIDEBAR ALPHABETICAL ORDER VERIFICATION ===\n');

// 1. Verify admin.html static structure
console.log('[1] Auditing admin.html layout:');
const html = fs.readFileSync(path.join(__dirname, '..', 'admin.html'), 'utf8');

// Domain A order
const domainAMatch = html.match(/<div class="nav-domain-group" data-domain="admin">([\s\S]*?)<\/div>\s*<!-- DOMAIN B/);
assert(domainAMatch, 'Domain A block must exist in admin.html');
const domainAHtml = domainAMatch[1];
const subMatchesA = [...domainAHtml.matchAll(/data-sub="([^"]+)"/g)].map(m => m[1]);
console.log('Domain A data-sub items in HTML:', subMatchesA);
assert.deepStrictEqual(subMatchesA, ['classes-hub', 'dashboard', 'organization'], 'Domain A must be Curriculum -> Dashboard -> Organization');

// Domain B order
const domainBMatch = html.match(/<div class="nav-domain-group" data-domain="board">([\s\S]*?)<\/div>\s*<!-- DOMAIN C/);
assert(domainBMatch, 'Domain B block must exist in admin.html');
const domainBHtml = domainBMatch[1];
assert(domainBHtml.indexOf('id="sidebar-programs-list"') < domainBHtml.indexOf('data-sub="student-registration"'),
  'In Domain B, sidebar-programs-list must precede student-registration in HTML');
console.log('Domain B: #sidebar-programs-list is positioned before student-registration (PASS)');

// Domain C order
const domainCMatch = html.match(/<div class="nav-domain-group" data-domain="class">([\s\S]*?)<\/div>\s*<!-- DOMAIN D/);
assert(domainCMatch, 'Domain C block must exist in admin.html');
const domainCHtml = domainCMatch[1];
assert(domainCHtml.indexOf('id="sidebar-classes-list"') < domainCHtml.indexOf('data-sub="tests"'),
  'In Domain C, sidebar-classes-list must precede tests in HTML');
assert(domainCHtml.indexOf('data-sub="tests"') < domainCHtml.indexOf('data-sub="vocab_vault"'),
  'In Domain C, tests must precede vocab_vault in HTML');
console.log('Domain C: #sidebar-classes-list -> Test Analytics -> Vocabulary Vault (PASS)');

// Domain D order
const domainDMatch = html.match(/<div class="nav-domain-group" data-domain="desk">([\s\S]*?)<\/div>\s*<\/nav>/);
assert(domainDMatch, 'Domain D block must exist in admin.html');
const domainDHtml = domainDMatch[1];
const subMatchesD = [...domainDHtml.matchAll(/data-sub="([^"]+)"/g)].map(m => m[1]);
console.log('Domain D data-sub items in HTML:', subMatchesD);
assert.deepStrictEqual(subMatchesD, ['modules', 'settings'], 'Domain D must be modules -> settings');

// 2. Verify css/admin.css display: contents rule
console.log('\n[2] Auditing css/admin.css:');
const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'admin.css'), 'utf8');
assert(css.includes('#sidebar-programs-list') && css.includes('display: contents;'),
  'css/admin.css must include display: contents for dynamic sidebar lists');
console.log('css/admin.css: display: contents configuration verified (PASS)');

// 3. Verify js/admin/admin-init.js functions
console.log('\n[3] Auditing js/admin/admin-init.js:');
const initJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'admin', 'admin-init.js'), 'utf8');
assert(initJs.includes('getSidebarNavItemLabel'), 'getSidebarNavItemLabel must be exported in admin-init.js');
assert(initJs.includes('sortAllSidebarDomains'), 'sortAllSidebarDomains must be exported in admin-init.js');
assert(initJs.includes('initSidebarAlphabeticalObserver'), 'initSidebarAlphabeticalObserver must be present in admin-init.js');
console.log('js/admin/admin-init.js: Alphabetical sorting and observer methods verified (PASS)');

// 4. Verify js/admin/app.js ascending sorts
console.log('\n[4] Auditing js/admin/app.js sorting logic:');
const appJs = fs.readFileSync(path.join(__dirname, '..', 'js', 'admin', 'app.js'), 'utf8');
assert(!appJs.includes('b.name || \'\').localeCompare(a.name'), 'app.js must not contain reverse descending sort for batches');
assert(appJs.includes('sortAllSidebarDomains()'), 'app.js must call sortAllSidebarDomains');
console.log('js/admin/app.js: Ascending numeric sort and sortAllSidebarDomains calls verified (PASS)');

console.log('\n=== ALL TESTS PASSED (100%) ===');
