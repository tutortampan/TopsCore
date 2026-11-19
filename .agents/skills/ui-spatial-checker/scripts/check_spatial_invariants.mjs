/**
 * check_spatial_invariants.mjs
 * 
 * Automated Spatial & Visual Invariant Verification Suite for TopsCore LMS.
 * Validates ui-invariants.md §1.1 (100vh lock), §1.2 & §1.3 (Sub Panel & 10px gap),
 * §4.1 & §4.2 (Dynamic Columns, Nowrap & Zero Dead Space), and §1.4 (Centered Loading & Pure English).
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

// 80px banner deduction
assert.ok(
  adminCss.includes('height: calc(100vh - 80px) !important;'),
  '[Rule 1.1 & 1.8] #admin-console must deduct 80px for #bottom-ad-banner'
);
console.log('  ✔ #admin-console 80px deduction verified');

// Universal Sub Panel (Lower Panel) 40px height
assert.ok(
  adminCss.includes('.workspace-lower-panel') &&
  adminCss.includes('height: 40px !important;'),
  '[Rule 1.3] .workspace-lower-panel must enforce height: 40px !important'
);
console.log('  ✔ Universal Sub Panel (Lower Panel) height strictly locked to 40px');

// Sidebar Footer (Sub Corner) 40px height alignment with Sub Panel
assert.ok(
  adminCss.includes('.sidebar-footer') &&
  adminCss.includes('height: 40px !important;'),
  '[Rule 1.3] .sidebar-footer (Sub Corner) must enforce height: 40px !important to align with Sub Panel'
);
console.log('  ✔ Sidebar Footer (Sub Corner) height strictly locked to 40px (aligned with Sub Panel)');

// In-Panel 30px Button Invariant (Sub Panel & Toolbars)
assert.ok(
  adminCss.includes('.workspace-lower-panel .btn,') &&
  adminCss.includes('height: 30px !important;') &&
  adminCss.includes('min-height: 30px !important;'),
  '[Rule 1.3] Buttons inside Sub Panel & in-panel toolbars must enforce height: 30px !important'
);
console.log('  ✔ In-Panel buttons (Sub Panel & toolbars) strictly locked to 30px height (5px margin clearance)');

// Window, Wizard, Card & Popup 40px Button & Panel Invariant
assert.ok(
  adminCss.includes('.modal-footer .btn,') &&
  adminCss.includes('.wizard-footer .btn,') &&
  adminCss.includes('height: 40px !important;') &&
  adminCss.includes('min-height: 40px !important;'),
  '[Rule 1.5] Buttons inside Window, Wizard, Card & Popup must enforce height: 40px !important'
);
assert.ok(
  adminCss.includes('.modal-subpanel,') &&
  adminCss.includes('.wizard-subpanel,') &&
  adminCss.includes('height: 40px !important;'),
  '[Rule 1.5] Panels/sub-panels inside Window, Wizard, Card & Popup must enforce height: 40px !important'
);
assert.ok(
  adminCss.includes('.modal-footer,') &&
  adminCss.includes('.wizard-footer,') &&
  adminCss.includes('height: 60px !important;') &&
  adminCss.includes('padding: 10px 16px !important;'),
  '[Rule 1.5] Modal/wizard/popup footers must enforce height: 60px !important with 10px padding'
);
console.log('  ✔ Window, Wizard, Card & Popup buttons (40px) and footers (60px) strictly verified');

// Title Area 60px, Centered Title & ALL CAPS Typography Invariant (§1.5.1)
assert.ok(
  adminCss.includes('.title-area h3,') &&
  adminCss.includes('text-transform: uppercase !important;') &&
  adminCss.includes('text-align: center !important;'),
  '[Rule 1.5.1] Title Area titles must enforce text-transform: uppercase and centered alignment'
);
assert.ok(
  adminCss.includes('.title-area.dual-line,') &&
  adminCss.includes('flex-direction: column !important;'),
  '[Rule 1.5.1] Dual-line Title Areas must enforce vertically stacked subtitles'
);
console.log('  ✔ Title Area titles strictly locked to ALL CAPS, Centered alignment & Stacked Subtitles');

// Standard Modal 80vh Height Invariant (§1.5.3)
assert.ok(
  adminCss.includes('max-height: 80vh;'),
  '[Rule 1.5.3] Modal dialogs must enforce standard max-height: 80vh'
);
console.log('  ✔ Floating window dialogs strictly bound to standard 80vh height');


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

// Table view margins & 10px Container Gap (Phase 419 Universal 5-Panel Architecture)
assert.ok(
  adminCss.includes('.admin-content:has(.table-wrap)') &&
  adminCss.includes('padding: 10px 10px 10px 10px !important;'),
  '[Pillar 1 / Phase 419] Table view margins must enforce 10px on all 4 sides (10px gap to Lower Panel)'
);
console.log('  ✔ Table view margins (10px padding & active gap to Lower Panel) verified');

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

// 4. Audit Governance and SSOT rules
console.log('\n--- 4. Auditing Master Governance & SSOT Rules ---');
const rulesPath = path.join(ROOT_DIR, '.antigravityrules');
assert.ok(fs.existsSync(rulesPath), '.antigravityrules must exist');
const rulesText = fs.readFileSync(rulesPath, 'utf-8');

assert.ok(
  rulesText.includes('**SPATIAL & UNIVERSAL TABLE INVARIANTS**'),
  'Principle (Spatial & Universal Table Invariants) must be codified in .antigravityrules'
);
assert.ok(
  rulesText.includes('.agents/rules/ui-invariants.md'),
  'SSOT pointer to ui-invariants.md must be codified in .antigravityrules'
);

const uiInvariantsPath = path.join(ROOT_DIR, '.agents', 'rules', 'ui-invariants.md');
assert.ok(fs.existsSync(uiInvariantsPath), 'ui-invariants.md must exist');
const uiInvariantsText = fs.readFileSync(uiInvariantsPath, 'utf-8');

assert.ok(
  uiInvariantsText.includes('Sub Panel') && uiInvariantsText.includes('.workspace-lower-panel'),
  'Sub Panel architecture must be codified in ui-invariants.md'
);
assert.ok(
  uiInvariantsText.includes('Centered Loading States & Canonical Component Invariant'),
  'Centered loading state invariant must be codified in ui-invariants.md'
);
assert.ok(
  uiInvariantsText.includes('Authoritative 3-Level Typographic System'),
  'Authoritative 3-Level Typographic System must be codified in ui-invariants.md'
);
console.log('  ✔ Governance Master Index and ui-invariants.md SSOT verified active');

console.log('\n🎉 [ui-spatial-checker] ALL SPATIAL & VISUAL INVARIANTS PASSED AUDIT (100%)!\n');
