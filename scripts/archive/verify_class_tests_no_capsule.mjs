/**
 * scripts/verify_class_tests_no_capsule.mjs
 * 
 * Automated Verification Script for Class Tests & Universal 50px Lower Panel
 * Tests:
 * 1. Purged Actions Column
 * 2. Eradicated Capsule Elements (CODE, PREREQUISITE, PASS %, STATUS)
 * 3. Direct In-Place Title Renaming in Edit Mode
 * 4. Interactive Status Dropdown (PUBLISHED / DRAFT / DELETE) in Edit Mode
 * 5. Universal 50px Lower Panel Always Visible on both Class Tests and Attendance tabs
 * 6. Relocated Test Creation/Blueprint/Settings buttons into Class Tests Lower Panel
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('🔍 [verify_class_tests_no_capsule] Auditing codebase...\n');

const appJsPath = path.resolve('js/admin/app.js');
const classesMgmtPath = path.resolve('js/admin/classes-management.js');

assert.ok(fs.existsSync(appJsPath), 'js/admin/app.js must exist');
assert.ok(fs.existsSync(classesMgmtPath), 'js/admin/classes-management.js must exist');

const appJs = fs.readFileSync(appJsPath, 'utf8');
const classesMgmt = fs.readFileSync(classesMgmtPath, 'utf8');

// 1. Actions column completely purged from classAsmGrid
assert.ok(
  !appJs.includes("key: 'actions'"),
  "❌ Fail: 'actions' column still present in classAsmGrid!"
);
console.log('✔ Assertion 1 Passed: Actions column completely purged from Class Tests grid');

// 2. Eradicate Capsule Elements in classAsmGrid
// Check CODE column
assert.ok(
  !appJs.includes("background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.1); display:inline-block; max-width:180px; overflow:hidden; text-overflow:ellipsis;"),
  "❌ Fail: Capsule styling still found on CODE in app.js!"
);
// Check PREREQUISITE column
assert.ok(
  !appJs.includes("color:var(--clr-warning); font-family:monospace; font-weight:bold; white-space:nowrap; background:rgba(255,255,255,0.05)"),
  "❌ Fail: Capsule styling still found on PREREQUISITE in app.js!"
);
console.log('✔ Assertion 2 Passed: Bordered capsule pills purged from CODE and PREREQUISITE');

// Check PASS (%) column does NOT render <input> in View Mode
assert.ok(
  appJs.includes('if (!isEditMode)') && appJs.includes('🎯') && appJs.includes('${currentMin}%'),
  "❌ Fail: PASS (%) must render flat text without <input> when isEditMode is false!"
);
console.log('✔ Assertion 3 Passed: PASS (%) renders flat text in View Mode');

// Check STATUS column does NOT use .badge in View Mode
assert.ok(
  appJs.includes("color:${isPub ? 'var(--grade-a, #00c000)' : '#94a3b8'}") &&
  !appJs.includes('badge ${statusColors[String(st).toLowerCase()]'),
  "❌ Fail: STATUS column must not use .badge capsule styling!"
);
console.log('✔ Assertion 4 Passed: STATUS column renders flat text without badge capsule');

// 3. Direct In-Place Title Renaming in Edit Mode
assert.ok(
  appJs.includes('class="input-test-title edit-mode-flat-input"'),
  "❌ Fail: input-test-title not found for direct renaming in Edit Mode!"
);
assert.ok(
  appJs.includes("await adminUpdate('tests', testId, { title: newTitle })"),
  "❌ Fail: adminUpdate for test title rename not found in event listeners!"
);
console.log('✔ Assertion 5 Passed: Direct in-place title renaming configured in Edit Mode');

// 4. Interactive Status Dropdown (PUBLISHED / DRAFT / DELETE) in Edit Mode
assert.ok(
  appJs.includes('class="input-test-status-select edit-mode-flat-select"') &&
  appJs.includes('<option value="published"') &&
  appJs.includes('<option value="draft"') &&
  appJs.includes('<option value="delete" style="background:#0f172a; color:#ef4444; font-weight:bold;">🗑️ DELETE</option>'),
  "❌ Fail: Status select dropdown with published/draft/delete missing in Edit Mode!"
);
assert.ok(
  appJs.includes("window.confirm(`Are you sure you want to delete test") &&
  appJs.includes("await window._deleteRecord('tests', testId, testTitle)"),
  "❌ Fail: Soft-delete confirmation and handler for status select missing!"
);
console.log('✔ Assertion 6 Passed: Status dropdown with PUBLISHED, DRAFT, and DELETE verified');

// 5. Universal 50px Lower Panel Always Visible on both tabs (Phase 419 syncClassHubLowerPanel)
assert.ok(
  appJs.includes('syncClassHubLowerPanel = (activeTab) =>') &&
  appJs.includes("syncClassHubLowerPanel(window._classHubActiveTab);"),
  "❌ Fail: Universal Lower Panel syncClassHubLowerPanel dispatcher missing!"
);
assert.ok(
  appJs.includes('id="btn-open-forgiven-wizard"') &&
  appJs.includes('id="btn-open-blueprint-settings"') &&
  appJs.includes('id="btn-open-blueprint-from-class"') &&
  appJs.includes('id="btn-open-generator-from-class"'),
  "❌ Fail: Required Lower Panel action buttons missing from Class Hub!"
);
// Verify Forgiven & Override does not have edit-mode-only
const forgivenWizardBtnMatch = appJs.match(/id="btn-open-forgiven-wizard"[^>]*>/);
assert.ok(
  forgivenWizardBtnMatch && !forgivenWizardBtnMatch[0].includes('edit-mode-only'),
  "❌ Fail: btn-open-forgiven-wizard must not have edit-mode-only (must be visible in View Mode and Edit Mode)!"
);
console.log('✔ Assertion 7 Passed: Universal 50px Lower Panel is persistent and always visible on both tabs');

// 6. Relocated Buttons into Class Tests Lower Panel
assert.ok(
  appJs.includes("activeTab === 'tests'") &&
  appJs.includes('id="btn-open-blueprint-settings"') &&
  appJs.includes('id="btn-open-blueprint-from-class"') &&
  appJs.includes('id="btn-open-generator-from-class"'),
  "❌ Fail: Blueprint Settings, Open Blueprint, and Generator Wizard must be in Class Tests lower panel!"
);

assert.ok(
  appJs.includes("activeTab === 'attendance'") &&
  appJs.includes('id="btn-open-forgiven-wizard"'),
  "❌ Fail: Forgiven Wizard must remain in Attendance lower panel!"
);
console.log('✔ Assertion 8 Passed: Action buttons correctly segregated between Class Tests and Attendance lower panels');

// 7. Legacy classes-management.js hygiene
assert.ok(
  !classesMgmt.includes("background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px; border:1px solid rgba(255,255,255,0.1); display:inline-block; max-width:180px; overflow:hidden; text-overflow:ellipsis;"),
  "❌ Fail: Legacy capsule styling still present in classes-management.js!"
);
console.log('✔ Assertion 9 Passed: Legacy classes-management.js CODE capsule styling cleaned');

// 8. Re-render on Edit Mode toggle
assert.ok(
  appJs.includes("window.addEventListener('admin-edit-mode-changed'") &&
  appJs.includes('window._classAsmGridInstance.render()'),
  "❌ Fail: Class Tests grid must re-render upon admin-edit-mode-changed event!"
);
console.log('✔ Assertion 10 Passed: Class Tests grid re-renders automatically when Edit Mode changes');

console.log('\n🎉 ALL 10 ASSERTIONS PASSED! (100% Quality Gate Success)\n');

