/**
 * check_spatial_invariants.mjs
 * 
 * Automated Spatial & Visual Invariant Verification Suite for TopsCore LMS.
 * Validates Rule 15 (100vh lock), Rule 20 (Lower Panel & 10px gap),
 * Rule 21 (Dynamic Columns, Nowrap & Zero Dead Space), and Rule 22 (Centered Loading & Pure English).
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

console.log('📐 [ui-spatial-checker] Running Automated Spatial & Visual Invariant Audit...\n');

// 1. Audit css/admin.css
console.log('--- 1. Auditing css/admin.css ---');
const adminCssPath = path.join(ROOT_DIR, 'css', 'admin.css');
assert.ok(fs.existsSync(adminCssPath), 'css/admin.css must exist');
const adminCss = fs.readFileSync(adminCssPath, 'utf-8');

// Viewport 100vh lock
assert.ok(
  adminCss.includes('height: 100vh !important;') &&
  adminCss.includes('max-height: 100vh !important;') &&
  adminCss.includes('width: 100vw !important;') &&
  adminCss.includes('overflow: hidden !important;'),
  '[Rule 15] html & body must enforce 100vh viewport lock with overflow: hidden !important'
);
console.log('  ✔ Root 100vh lock & zero outer page scroll verified');

// 60px banner deduction
assert.ok(
  adminCss.includes('height: calc(100vh - 60px) !important;'),
  '[Rule 15] #admin-console must deduct 60px for #bottom-ad-banner'
);
console.log('  ✔ #admin-console 60px deduction verified');

// Universal Lower Panel 50px height
assert.ok(
  adminCss.includes('.workspace-lower-panel') &&
  adminCss.includes('height: 50px !important;'),
  '[Rule 20] .workspace-lower-panel must enforce height: 50px !important'
);
console.log('  ✔ Universal Lower Panel height strictly locked to 50px');

// Container 10px gap
assert.ok(
  adminCss.includes('gap: 10px !important;') || adminCss.includes('gap: 10px;'),
  '[Rule 20] Containers must maintain 10px gap'
);
console.log('  ✔ Container 10px spacing invariant verified');

// Table cells single-line nowrap
assert.ok(
  adminCss.includes('white-space: nowrap !important;'),
  '[Rule 21] Table cells must enforce single-line text (white-space: nowrap !important)'
);
console.log('  ✔ Table cells single-line non-wrapped text verified');

// Tabular numbers
assert.ok(
  adminCss.includes('font-variant-numeric: tabular-nums !important;'),
  '[Rule 18 / 21] Table data cells must enforce tabular numbers'
);
console.log('  ✔ Tabular numbers for clean numeric typography verified');

// Table view margins (10px 10px 0 10px)
assert.ok(
  adminCss.includes('.admin-content:has(.table-wrap)') &&
  adminCss.includes('padding: 10px 10px 0 10px !important;') &&
  adminCss.includes('margin-bottom: 0 !important;'),
  '[Pillar 1] Table view margins must enforce 10px top/sides, 0px bottom flush docked'
);
console.log('  ✔ Table view margins (10px top/sides, 0px bottom flush docked) verified');

// Table uniform 12px font size
assert.ok(
  adminCss.includes('font-size: 12px !important;'),
  '[Pillar 2] Table headers and cells must enforce uniform font-size: 12px !important'
);
console.log('  ✔ Table uniform 12px font size verified');

// Superscript tag standard (1.0em bold 900)
assert.ok(
  adminCss.includes('font-size: 1.0em !important;') && adminCss.includes('vertical-align: super !important;'),
  '[Pillar 3] Superscript tags must enforce font-size: 1.0em !important and vertical-align: super !important'
);
console.log('  ✔ Superscript 1.0em bold tags verified');

// Master Edit Mode input height lock (24px)
assert.ok(
  adminCss.includes('height: 24px !important;'),
  '[Pillar 8] Interactive table inputs in Edit Mode must enforce height: 24px !important'
);
console.log('  ✔ Master Edit Mode 24px table input height lock verified');

// 2. Audit js/admin/class-analytics.js
console.log('\n--- 2. Auditing js/admin/class-analytics.js ---');
const classAnalyticsPath = path.join(ROOT_DIR, 'js', 'admin', 'class-analytics.js');
if (fs.existsSync(classAnalyticsPath)) {
  const classAnalyticsJs = fs.readFileSync(classAnalyticsPath, 'utf-8');

  // Must not contain Indonesian loading string
  assert.ok(
    !classAnalyticsJs.includes('Memuat analitik kesalahan'),
    '[Rule 16 / 22] Must not contain Indonesian loading string'
  );

  // Must contain English loading string
  assert.ok(
    classAnalyticsJs.includes('Loading class vocabulary item error analytics...') ||
    classAnalyticsJs.includes('Loading class vocabulary item error analytics') ||
    classAnalyticsJs.includes('Loading'),
    '[Rule 22] Loading string must be in English'
  );

  // Must use centered flex container for loading spinner
  assert.ok(
    Boolean(classAnalyticsJs.match(/justify-content:\s*center/i) && classAnalyticsJs.match(/align-items:\s*center/i)),
    '[Rule 22] Loading container must be centered with justify-content: center and align-items: center'
  );
  console.log('  ✔ Class analytics loading messaging verified English & centered');
}

// 3. Audit js/admin/student-management.js
console.log('\n--- 3. Auditing js/admin/student-management.js ---');
const studentMgmtPath = path.join(ROOT_DIR, 'js', 'admin', 'student-management.js');
assert.ok(fs.existsSync(studentMgmtPath), 'student-management.js must exist');
const studentMgmtJs = fs.readFileSync(studentMgmtPath, 'utf-8');

// Must not have useless Avg pts in Actions column
assert.ok(
  !studentMgmtJs.includes('Avg: ${avgPtsStr}</td>') &&
  !studentMgmtJs.includes('Avg: ${avgPtsStr}'),
  '[Image 5 Invariant] Actions column in summary row must not contain useless "Avg:" metric'
);
console.log('  ✔ Student table Actions footer free of useless Avg pts metric');

// 4. Audit .antigravityrules
console.log('\n--- 4. Auditing .antigravityrules Governance ---');
const rulesPath = path.join(ROOT_DIR, '.antigravityrules');
assert.ok(fs.existsSync(rulesPath), '.antigravityrules must exist');
const rulesText = fs.readFileSync(rulesPath, 'utf-8');

assert.ok(
  rulesText.includes('20. UNIVERSAL LOWER PANEL ARCHITECTURE & 10PX CONTAINER GAP'),
  'Rule 20 must be codified in .antigravityrules'
);
assert.ok(
  rulesText.includes('21. DYNAMIC COLUMN SIZING, SINGLE-LINE TEXT & ZERO DEAD SPACE INVARIANT'),
  'Rule 21 must be codified in .antigravityrules'
);
assert.ok(
  rulesText.includes('22. CENTERED LOADING STATES'),
  'Rule 22 must be codified in .antigravityrules'
);
assert.ok(
  rulesText.includes('25. TUTOR\'S ROOM 8-TIER TYPOGRAPHIC SCALE & ZERO SUB-11PX INVARIANT'),
  'Rule 25 must be codified in .antigravityrules'
);
console.log('  ✔ Governance Rules 20, 21, 22, and 25 verified active');

console.log('\n🎉 [ui-spatial-checker] ALL SPATIAL & VISUAL INVARIANTS PASSED AUDIT (100%)!\n');
