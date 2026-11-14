// scripts/test_centered_loading_and_css_hygiene.mjs
// TopsCore — Centered Loading & CSS Hygiene Verification Suite

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

console.log('🧪 Starting Centered Loading & CSS Hygiene Test Suite...\n');

let failed = false;

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    failed = true;
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
}

// ── Check 1: CSS Brace Balance & Hygiene ──────────────────────
console.log('▶ Check 1: CSS Brace Balance & Hygiene...');
const cssFiles = [
  'css/style.css',
  'css/admin.css',
  'css/admin.min.css',
  'css/admin/admin-layout.css',
  'css/admin/admin-tables.css',
  'css/admin/admin-views.css',
  'css/admin/admin-modals.css',
  'css/admin/admin-editmode.css'
];

cssFiles.forEach(file => {
  const fullPath = path.join(ROOT_DIR, file);
  if (!fs.existsSync(fullPath)) return;
  const content = fs.readFileSync(fullPath, 'utf8');
  // Strip comments and strings to evaluate pure CSS structure
  const stripped = content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''");
  
  let depth = 0;
  let hasNegative = false;
  for (let i = 0; i < stripped.length; i++) {
    if (stripped[i] === '{') depth++;
    if (stripped[i] === '}') {
      depth--;
      if (depth < 0) hasNegative = true;
    }
  }
  assert(!hasNegative && depth === 0, `${file} has balanced braces (net depth: ${depth}, negative dip: ${hasNegative})`);
});

// ── Check 2: Universal Centered Loading Invariant ─────────────
console.log('\n▶ Check 2: Universal Centered Loading State Component (SSOT)...');
const styleCss = fs.readFileSync(path.join(ROOT_DIR, 'css/style.css'), 'utf8');
const tablesCss = fs.readFileSync(path.join(ROOT_DIR, 'css/admin/admin-tables.css'), 'utf8');
const adminCss = fs.readFileSync(path.join(ROOT_DIR, 'css/admin.css'), 'utf8');

assert(styleCss.includes('.topscore-loading-center'), 'css/style.css declares .topscore-loading-center');
assert(tablesCss.includes('.topscore-loading-center'), 'css/admin/admin-tables.css declares .topscore-loading-center');
assert(adminCss.includes('.topscore-loading-center'), 'css/admin.css contains compiled .topscore-loading-center');

assert(tablesCss.includes('#admin-content-area:has(.topscore-loading-center)'), 'admin-tables.css enforces #admin-content-area:has(.topscore-loading-center) centering');
assert(styleCss.includes('#admin-content-area:has(.topscore-loading-center)'), 'style.css enforces #admin-content-area:has(.topscore-loading-center) centering');

// ── Check 3: Canonical getLoadingStateHtml in app.js ───────────
console.log('\n▶ Check 3: Canonical getLoadingStateHtml Helper in js/admin/app.js...');
const appJs = fs.readFileSync(path.join(ROOT_DIR, 'js/admin/app.js'), 'utf8');
assert(appJs.includes('function getLoadingStateHtml'), 'getLoadingStateHtml function exists');
assert(appJs.includes('topscore-loading-center'), 'getLoadingStateHtml emits topscore-loading-center container');
assert(appJs.includes('window.getLoadingStateHtml = getLoadingStateHtml'), 'getLoadingStateHtml attached to window');

// ── Check 4: Scoped Query in student-management.js ─────────────
console.log('\n▶ Check 4: Scoped Query & Low-Egress Optimizations in student-management.js...');
const smJs = fs.readFileSync(path.join(ROOT_DIR, 'js/admin/student-management.js'), 'utf8');
assert(smJs.includes('studentFilters'), 'student-management.js uses scoped studentFilters');
assert(smJs.includes('student_id: studentIds'), 'student-management.js scopes attempts/progress by student_id array');

// ── Check 5: Array Query Invariant in js/api.js ─────────────────
console.log('\n▶ Check 5: Array Query Invariant in js/api.js...');
const apiJs = fs.readFileSync(path.join(ROOT_DIR, 'js/api.js'), 'utf8');
assert(apiJs.includes('query.in(normKey, val)'), 'adminFetchAll supports array filtering with query.in()');
assert(apiJs.includes('tests') && apiJs.includes('MASTER_TABLES_TTL'), 'MASTER_TABLES_TTL caches tests catalog');

// ── Check 6: Universal Module Hygiene (Zero Ad-hoc Spinners) ───
console.log('\n▶ Check 6: Universal Module Hygiene & Zero Ad-hoc Spinners...');
const deckJs = fs.readFileSync(path.join(ROOT_DIR, 'js/admin/admin-deck.js'), 'utf8');
const regJs = fs.readFileSync(path.join(ROOT_DIR, 'js/admin/student-registration.js'), 'utf8');
const autoGenJs = fs.readFileSync(path.join(ROOT_DIR, 'js/admin/auto-gen-modal.js'), 'utf8');
const testMgmtJs = fs.readFileSync(path.join(ROOT_DIR, 'js/admin/tests-management.js'), 'utf8');
const testBuilderJs = fs.readFileSync(path.join(ROOT_DIR, 'js/admin/test-builder.js'), 'utf8');

assert(!autoGenJs.includes('spinner-style'), 'auto-gen-modal.js purged ad-hoc spinner-style injection');
assert(!regJs.includes('margin: 2rem auto'), 'student-registration.js purged ad-hoc margin spinners');
assert(deckJs.includes('topscore-loading-center'), 'admin-deck.js adopts canonical topscore-loading-center');
assert(!testMgmtJs.includes("adminFetchAll('tests')"), 'tests-management.js uses lean select for tests');
assert(!testBuilderJs.includes("adminFetchAll('tests')"), 'test-builder.js queries specific test by id');

if (failed) {
  console.error('\n❌ SOME CHECKS FAILED!');
  process.exit(1);
} else {
  console.log('\n🎉 ALL CHECKS PASSED: Centered Loading & CSS Hygiene 100% Verified!');
  process.exit(0);
}
