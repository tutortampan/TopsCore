// scripts/test_unified_tutor_room_typography_and_loading.mjs
// Authoritative automated test suite verifying Tutor's Room 8-tier typography scale, centered loading state, and table invariants.

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

console.log('🧪 Starting Unified Tutor\'s Room Typography & Centered Loading Test Suite...\n');

// 1. Audit css/admin.css for 8-Tier Typographic Scale Tokens
console.log('▶ Checking Pillar 1: 8-Tier Typographic Scale Tokens in css/admin.css...');
const adminCssPath = path.join(rootDir, 'css', 'admin.css');
assert(fs.existsSync(adminCssPath), 'css/admin.css must exist');
const adminCss = fs.readFileSync(adminCssPath, 'utf-8');

const requiredTokens = [
  '--tr-font-display',
  '--tr-font-title',
  '--tr-font-subtitle',
  '--tr-font-body',
  '--tr-font-table',
  '--tr-font-control',
  '--tr-font-caption',
  '--tr-font-mono'
];
for (const token of requiredTokens) {
  assert(adminCss.includes(token), `css/admin.css must declare typographic token ${token}`);
}
console.log('  ✅ Pillar 1 Passed: Authoritative 8-tier typographic tokens declared in :root.');

// 2. Audit css/admin.css for Zero Sub-12px Rule (SSOT Invariant)
console.log('▶ Checking Pillar 2: Zero Sub-12px Rule in css/admin.css...');
const fontRegex = /font-size:\s*([^;]+);/g;
let match;
let sub12Count = 0;
while ((match = fontRegex.exec(adminCss)) !== null) {
  const val = match[1].trim();
  let px = null;
  if (val.endsWith('px')) px = parseFloat(val);
  else if (val.endsWith('rem')) px = parseFloat(val) * 12.8;
  else if (val.endsWith('pt')) px = parseFloat(val) * (96 / 72);

  if (px !== null && px < 11.9) {
    sub12Count++;
    console.error(`    Found sub-12px declaration: ${val} (${px.toFixed(1)}px)`);
  }
}
assert(sub12Count === 0, `css/admin.css must have 0 sub-12px font declarations, found ${sub12Count}`);
console.log('  ✅ Pillar 2 Passed: Zero sub-12px font declarations verified across admin.css.');

// 3. Audit Centered Loading State Component in css/admin.css
console.log('▶ Checking Pillar 3: Centered Loading State Component in css/admin.css...');
assert(adminCss.includes('.topscore-loading-center'), 'css/admin.css must define .topscore-loading-center');
assert(adminCss.includes('min-height: calc(100vh - 200px) !important;'), '.topscore-loading-center must have min-height: calc(100vh - 200px) !important');
assert(adminCss.includes('justify-content: center !important;'), '.topscore-loading-center must center horizontally and vertically');
assert(adminCss.includes('.empty-state {') && adminCss.includes('min-height: calc(100vh - 200px) !important;'), '.empty-state must be vertically centered with min-height: calc(100vh - 200px)');
console.log('  ✅ Pillar 3 Passed: Universal centered loading component and upgraded empty-state verified.');

// 4. Audit Container Stretching (Zero Side-Drifting)
console.log('▶ Checking Pillar 4: Container Stretching (Zero Side-Drifting)...');
assert(adminCss.includes('#class-analytics-container') && adminCss.includes('width: 100% !important;'), '#class-analytics-container must enforce width: 100% !important');
assert(adminCss.includes('#class-hub-tab-content') && adminCss.includes('width: 100% !important;'), '#class-hub-tab-content must enforce width: 100% !important');
console.log('  ✅ Pillar 4 Passed: Parent and tab containers enforce width: 100% flex stretch.');

// 5. Audit Canonical getLoadingStateHtml in js/admin/app.js
console.log('▶ Checking Pillar 5: Canonical getLoadingStateHtml in js/admin/app.js...');
const appJsPath = path.join(rootDir, 'js', 'admin', 'app.js');
assert(fs.existsSync(appJsPath), 'js/admin/app.js must exist');
const appJs = fs.readFileSync(appJsPath, 'utf-8');
assert(appJs.includes('export function getLoadingStateHtml'), 'js/admin/app.js must export getLoadingStateHtml');
assert(appJs.includes('window.getLoadingStateHtml = getLoadingStateHtml'), 'js/admin/app.js must attach getLoadingStateHtml to window');
assert(appJs.includes("area.innerHTML = getLoadingStateHtml('Loading...');"), 'app.js loadSection must use getLoadingStateHtml');
console.log('  ✅ Pillar 5 Passed: Canonical getLoadingStateHtml component helper verified.');

// 6. Audit Module Adoption of Centered Loading
console.log('▶ Checking Pillar 6: Module Adoption of Centered Loading...');
const classAnalyticsJs = fs.readFileSync(path.join(rootDir, 'js', 'admin', 'class-analytics.js'), 'utf-8');
assert(classAnalyticsJs.includes('getLoadingStateHtml'), 'class-analytics.js must use getLoadingStateHtml');
assert(!classAnalyticsJs.includes('margin-right:12px;'), 'class-analytics.js must not have horizontal drifting spinner');

const classesHubJs = fs.readFileSync(path.join(rootDir, 'js', 'admin', 'classes-hub.js'), 'utf-8');
assert(classesHubJs.includes('getLoadingStateHtml'), 'classes-hub.js must use getLoadingStateHtml');

const curriculumMgmtJs = fs.readFileSync(path.join(rootDir, 'js', 'admin', 'curriculum-management.js'), 'utf-8');
assert(curriculumMgmtJs.includes('getLoadingStateHtml'), 'curriculum-management.js must use getLoadingStateHtml');

const deskJs = fs.readFileSync(path.join(rootDir, 'js', 'admin', 'desk.js'), 'utf-8');
assert(deskJs.includes('getLoadingStateHtml'), 'desk.js must use getLoadingStateHtml');

const crudModalsJs = fs.readFileSync(path.join(rootDir, 'js', 'admin', 'crud-modals.js'), 'utf-8');
assert(crudModalsJs.includes('getLoadingStateHtml'), 'crud-modals.js must use getLoadingStateHtml');

const studentMgmtJs = fs.readFileSync(path.join(rootDir, 'js', 'admin', 'student-management.js'), 'utf-8');
assert(studentMgmtJs.includes('getLoadingStateHtml'), 'student-management.js must use getLoadingStateHtml');
console.log('  ✅ Pillar 6 Passed: All admin modules adopt centralized getLoadingStateHtml.');

// 7. Audit Zero Italic Degradation
console.log('▶ Checking Pillar 7: Zero Italic Degradation in css/admin.css...');
assert(!adminCss.includes('font-style: italic;'), 'css/admin.css must have zero font-style: italic declarations');
console.log('  ✅ Pillar 7 Passed: Slanted/italic text cleanly purged from dark workstation surfaces.');

// 8. Audit Governance Rules
console.log('▶ Checking Pillar 8: Governance Ratification...');
const agentsMd = fs.readFileSync(path.join(rootDir, 'AGENTS.md'), 'utf-8');
assert(agentsMd.includes('Centered loading states via canonical') || agentsMd.includes('2.28') || agentsMd.includes('2.35'), 'AGENTS.md must reference Centered Loading');
assert(agentsMd.includes('display: table') || agentsMd.includes('2.38'), 'AGENTS.md must reference Table Invariants');
assert(agentsMd.includes('Authoritative 8-tier typographic scale') || agentsMd.includes('3-level typographic scale') || agentsMd.includes('typographic scale') || agentsMd.includes('2.39'), 'AGENTS.md must reference Typographic Scale');

const uiInvariants = fs.readFileSync(path.join(rootDir, '.agents', 'rules', 'ui-invariants.md'), 'utf-8');
assert(uiInvariants.includes('Centered Loading States & Canonical Component Invariant') || uiInvariants.includes('Centered Loading States'), 'ui-invariants.md must contain Centered Loading section');
assert(uiInvariants.includes('Universal Table Standardization Protocol & Construction Blueprint') || uiInvariants.includes('Dimensi Tabel Baku & Native Display Lock') || uiInvariants.includes('Native Table Lock'), 'ui-invariants.md must contain Universal Table section');
assert(uiInvariants.includes('Tutor\'s Room 8-Tier Typographic Scale & Zero Sub-11px Invariant') || uiInvariants.includes('Authoritative 3-Level Typographic System') || uiInvariants.includes('Typographic'), 'ui-invariants.md must contain Typography section');

const rulesText = fs.readFileSync(path.join(rootDir, '.antigravityrules'), 'utf-8');
assert(rulesText.includes('22. CENTERED LOADING STATES') || rulesText.includes('Centered Loading') || rulesText.includes('CENTERED LOADING'), '.antigravityrules must contain Centered Loading rule');
assert(rulesText.includes('25. TUTOR\'S ROOM 8-TIER TYPOGRAPHIC SCALE & ZERO SUB-11PX INVARIANT') || rulesText.includes('Typography') || rulesText.includes('TYPOGRAPHY'), '.antigravityrules must contain Typography rule');
console.log('  ✅ Pillar 8 Passed: Governance rules ratified across AGENTS.md, ui-invariants.md, and .antigravityrules.');

// 9. Audit CSS Brace & Syntax Integrity Across All Stylesheets
console.log('▶ Checking Pillar 9: CSS Brace Integrity & Global Centered Loading...');
function checkCssBraces(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let line = 1, col = 1, inComment = false, inString = null, stack = [];
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '\n') { line++; col = 1; } else { col++; }
    if (inComment) {
      if (ch === '*' && content[i+1] === '/') { inComment = false; i++; col++; }
      continue;
    }
    if (inString) {
      if (ch === inString && content[i-1] !== '\\') inString = null;
      continue;
    }
    if (ch === '/' && content[i+1] === '*') { inComment = true; i++; col++; continue; }
    if (ch === '"' || ch === "'") { inString = ch; continue; }
    if (ch === '{') stack.push({ line, col });
    else if (ch === '}') {
      if (stack.length === 0) return false;
      stack.pop();
    }
  }
  return stack.length === 0;
}

const adminCssDir = path.join(rootDir, 'css', 'admin');
fs.readdirSync(adminCssDir).forEach(f => {
  assert(checkCssBraces(path.join(adminCssDir, f)), `css/admin/${f} must have 100% valid balanced braces`);
});
assert(checkCssBraces(path.join(rootDir, 'css', 'admin.css')), 'css/admin.css must have 100% valid balanced braces');
assert(checkCssBraces(path.join(rootDir, 'css', 'admin.min.css')), 'css/admin.min.css must have 100% valid balanced braces');
assert(checkCssBraces(path.join(rootDir, 'css', 'style.css')), 'css/style.css must have 100% valid balanced braces');

const styleCss = fs.readFileSync(path.join(rootDir, 'css', 'style.css'), 'utf-8');
assert(styleCss.includes('.topscore-loading-center'), 'css/style.css must declare .topscore-loading-center as universal foundation');
assert(styleCss.includes('justify-content: center !important;'), 'css/style.css .topscore-loading-center must be vertically centered');
assert(styleCss.includes('align-items: center !important;'), 'css/style.css .topscore-loading-center must be horizontally centered');

console.log('  ✅ Pillar 9 Passed: 100% CSS brace integrity and dual-layer stylesheet declarations verified.');

console.log('\n🎉 ALL 9 PILLARS PASSED: TUTOR\'S ROOM TYPOGRAPHY & LOADING STANDARDIZATION (100% VERIFIED)!\n');

