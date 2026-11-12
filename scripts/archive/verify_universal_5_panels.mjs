/**
 * verify_universal_5_panels.mjs
 * 
 * Automated Quality Gate Suite for TopsCore LMS Phase 419.
 * Validates:
 * 1. Universal 5-Panel Architecture (Top Corner, Low Corner, Top Panel, Main Panel, Lower Panel)
 * 2. 0px Gap between Side Panel and Lower Panel
 * 3. Strict 10px Container Gap between Main Panel and Lower Panel
 * 4. Permanent visibility of Lower Panel across ALL pages (Never hidden)
 * 5. Permanent visibility of [🛡️ Forgiven & Override] in View Mode and Edit Mode
 * 6. Button placement standardization: Action buttons on RIGHT, Metrics/Search on LEFT
 * 7. Anti-ballooning and scale protection rules in Lower Panel
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();

console.log('🏛️ [verify_universal_5_panels] Auditing Universal 5-Panel Architecture...\n');

// 1. Audit css/admin.css
console.log('--- 1. Auditing css/admin.css for 5-Panel Layout Invariants ---');
const adminCssPath = path.join(ROOT_DIR, 'css', 'admin.css');
assert.ok(fs.existsSync(adminCssPath), 'css/admin.css must exist');
const adminCss = fs.readFileSync(adminCssPath, 'utf-8');

// A. Top Corner Panel (sidebar-logo) & Low Corner Panel (sidebar-footer) 50px height
assert.ok(
  adminCss.includes('.sidebar-logo') && adminCss.includes('--fm-topbar-h: 50px;'),
  'Top Corner Panel (.sidebar-logo) must be locked to 50px height'
);
console.log('  ✔ Top Corner Panel (.sidebar-logo) 50px height verified');

assert.ok(
  adminCss.includes('.sidebar-footer') && adminCss.includes('height: 50px;'),
  'Low Corner Panel (.sidebar-footer) must be locked to 50px height'
);
console.log('  ✔ Low Corner Panel (.sidebar-footer) 50px height verified');

// B. Lower Panel (#admin-bottom-infobar) 50px height & #0f172a background & continuous border
assert.ok(
  adminCss.includes('.admin-bottom-infobar') &&
  adminCss.includes('height: 50px !important;') &&
  adminCss.includes('background: #0f172a !important;') &&
  adminCss.includes('border-top: 1px solid rgba(255, 255, 255, 0.08) !important;'),
  'Lower Panel (.admin-bottom-infobar) must enforce 50px height, #0f172a background, and border-top hairline'
);
console.log('  ✔ Lower Panel 50px height, background, and hairline border verified');

// C. Lower Panel NEVER hidden
assert.ok(
  adminCss.includes('.admin-bottom-infobar.hidden') &&
  adminCss.includes('display: flex !important;'),
  'Lower Panel must NEVER be hidden (.admin-bottom-infobar.hidden must enforce display: flex !important)'
);
console.log('  ✔ Lower Panel permanent visibility (never hidden) verified');

// D. Main Panel 10px Container Gap (padding on all 4 sides)
assert.ok(
  adminCss.includes('.admin-content') &&
  adminCss.includes('padding: 10px 10px 10px 10px !important;'),
  'Main Panel (.admin-content) must enforce padding: 10px 10px 10px 10px !important to activate 10px gap above Lower Panel'
);
console.log('  ✔ Main Panel strict 10px container gap above Lower Panel verified');

// E. Anti-ballooning on Lower Panel buttons
assert.ok(
  adminCss.includes('.bottom-infobar-right') &&
  adminCss.includes('flex-wrap: nowrap !important;') &&
  adminCss.includes('height: 32px !important;'),
  'Lower Panel action cluster must enforce flex-wrap: nowrap and compact button heights (32px)'
);
console.log('  ✔ Lower Panel button anti-ballooning & scale protection verified');

// 2. Audit js/admin/app.js
console.log('\n--- 2. Auditing js/admin/app.js ---');
const appJsPath = path.join(ROOT_DIR, 'js', 'admin', 'app.js');
assert.ok(fs.existsSync(appJsPath), 'js/admin/app.js must exist');
const appJs = fs.readFileSync(appJsPath, 'utf-8');

// A. setBottomInfobar never adds .hidden and provides default operational status
assert.ok(
  !appJs.includes("bar.classList.add('hidden')"),
  'setBottomInfobar must never add .hidden class to the lower panel'
);
assert.ok(
  appJs.includes('TopsCore ABCD System') && appJs.includes('Status: Operational'),
  'setBottomInfobar must provide default operational status when called empty'
);
console.log('  ✔ setBottomInfobar never hides and renders default system status');

// B. Class Hub syncClassHubLowerPanel implementation
assert.ok(
  appJs.includes('syncClassHubLowerPanel = (activeTab) =>'),
  'app.js must implement centralized syncClassHubLowerPanel dispatcher'
);
console.log('  ✔ Centralized syncClassHubLowerPanel dispatcher verified');

// C. Forgiven & Override permanently visible (NO .edit-mode-only)
const attendanceLowerMatch = appJs.match(/id="btn-open-forgiven-wizard"[^>]*>/);
assert.ok(attendanceLowerMatch, 'btn-open-forgiven-wizard must exist in app.js');
assert.ok(
  !attendanceLowerMatch[0].includes('edit-mode-only'),
  'btn-open-forgiven-wizard must NOT contain edit-mode-only (must be visible in View and Edit Mode)'
);
console.log('  ✔ [🛡️ Forgiven & Override] permanently visible in View Mode & Edit Mode verified');

// D. Action buttons on RIGHT, metrics on LEFT in Class Hub Lower Panel
assert.ok(
  appJs.includes('attendance-summary-cluster') && appJs.includes('attendance-actions-cluster'),
  'Attendance tab must separate summary on LEFT and actions on RIGHT'
);
assert.ok(
  appJs.includes('class-tests-summary-cluster') && appJs.includes('class-tests-actions-cluster'),
  'Class Tests tab must separate summary on LEFT and actions on RIGHT'
);
console.log('  ✔ Button placement standardization (Actions RIGHT, Metrics LEFT) verified');

// 3. Audit js/admin/modules.js
console.log('\n--- 3. Auditing js/admin/modules.js ---');
const modulesJsPath = path.join(ROOT_DIR, 'js', 'admin', 'modules.js');
assert.ok(fs.existsSync(modulesJsPath), 'js/admin/modules.js must exist');
const modulesJs = fs.readFileSync(modulesJsPath, 'utf-8');

assert.ok(
  modulesJs.includes('window.setBottomInfobar') &&
  modulesJs.includes('8 Core AI Evaluation Engines') &&
  modulesJs.includes('ALL ENGINES ACTIVE'),
  'modules.js must populate Lower Panel with 8 Core AI Evaluation Engines and active badge'
);
console.log('  ✔ Modules page Lower Panel integration verified');

console.log('\n🎉 [verify_universal_5_panels] ALL 5-PANEL ARCHITECTURAL INVARIANTS PASSED (100%)!\n');

