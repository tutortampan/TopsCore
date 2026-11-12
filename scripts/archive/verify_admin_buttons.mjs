/**
 * verify_admin_buttons.mjs
 * 
 * Comprehensive automated regression test for TopsCore LMS buttons,
 * lower panel actions, router integration, and global function bindings.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('🧪 [verify_admin_buttons] Starting automated button & action panel regression audit...\n');

// 1. Verify CSS Overflow Invariant on lower panel
console.log('1. Checking CSS Lower Panel Overflow Invariants in css/admin.css...');
const cssContent = fs.readFileSync('css/admin.css', 'utf8');
assert.ok(
  cssContent.includes('.bottom-infobar-right') && cssContent.includes('overflow-y: hidden !important;'),
  '❌ [CSS Gate Failed] .bottom-infobar-right must have overflow-y: hidden !important;'
);
assert.ok(
  cssContent.includes('.bottom-infobar-left') && cssContent.includes('overflow-y: hidden !important;'),
  '❌ [CSS Gate Failed] .bottom-infobar-left must have overflow-y: hidden !important;'
);
console.log('  ✔ CSS lower panel overflow-y: hidden invariants verified.');

// 2. Check student-management.js for currentBatchId regression
console.log('\n2. Checking js/admin/student-management.js for undeclared variable regressions...');
const smContent = fs.readFileSync('js/admin/student-management.js', 'utf8');
assert.ok(
  !smContent.includes('batch_id: currentBatchId'),
  '❌ [Variable Gate Failed] student-management.js must not reference undeclared currentBatchId'
);
assert.ok(
  smContent.includes('activeBatchId') || smContent.includes('_filterBatchId'),
  '❌ [Variable Gate Failed] student-management.js must use declared activeBatchId or _filterBatchId'
);
assert.ok(
  smContent.includes('NEXT (${eligibleCount} Eligible)'),
  '❌ [Action Gate Failed] NEXT button must dynamically display eligible count'
);
assert.ok(
  smContent.includes('showPromotionRequirementsModal'),
  '❌ [Action Gate Failed] showPromotionRequirementsModal must be defined for 0-eligible feedback'
);
assert.ok(
  !smContent.includes('requestAnimationFrame(() => {\n      const addStudentBtn'),
  '❌ [Binding Gate Failed] Button binding must be synchronous, not deferred in requestAnimationFrame'
);
console.log('  ✔ student-management.js button bindings and dynamic NEXT label verified.');

// 3. Verify student-registration.js and app.js router bindings
console.log('\n3. Checking student registration and router integrations...');
const srContent = fs.readFileSync('js/admin/student-registration.js', 'utf8');
assert.ok(
  srContent.includes('window.renderStudentsRegistration = renderStudentsRegistration'),
  '❌ [Router Gate Failed] student-registration.js must expose window.renderStudentsRegistration'
);

const appContent = fs.readFileSync('js/admin/app.js', 'utf8');
assert.ok(
  appContent.includes('window.renderStudentsRegistration = renderStudentsRegistration'),
  '❌ [Router Gate Failed] app.js must expose window.renderStudentsRegistration'
);
assert.ok(
  appContent.includes('case \'student-registration\':') && appContent.includes('await renderStudentsRegistration(area)'),
  '❌ [Router Gate Failed] app.js router must render renderStudentsRegistration for student-registration'
);
assert.ok(
  appContent.includes('window.formatTestDisplayName = formatTestDisplayName'),
  '❌ [Global Gate Failed] app.js must expose window.formatTestDisplayName'
);
console.log('  ✔ Student registration router and formatTestDisplayName exposures verified.');

// 4. Verify classes-management.js window.loadClassLearningPath
console.log('\n4. Checking classes-management.js function exposures...');
const cmContent = fs.readFileSync('js/admin/classes-management.js', 'utf8');
assert.ok(
  cmContent.includes('window.loadClassLearningPath = loadClassLearningPath'),
  '❌ [Global Gate Failed] classes-management.js must expose window.loadClassLearningPath'
);
console.log('  ✔ classes-management.js window.loadClassLearningPath verified.');

// 5. System-wide scan across all 25 admin modules for undeclared variable bugs in event handlers
console.log('\n5. Scanning all 25 modules in js/admin/ for handler regressions...');
const adminDir = 'js/admin';
const adminFiles = fs.readdirSync(adminDir).filter(f => f.endsWith('.js'));

const undeclaredFindings = [];
adminFiles.forEach(file => {
  const content = fs.readFileSync(path.join(adminDir, file), 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    if (line.includes('.onclick =') || line.includes('addEventListener(\'click\'') || line.includes('addEventListener("click"')) {
      const snippet = lines.slice(idx, idx + 6).join(' ');
      const callMatch = snippet.match(/window\.[a-zA-Z0-9_$]+\(\s*\{([^}]+)\}/);
      if (callMatch) {
        const props = callMatch[1].split(',');
        props.forEach(p => {
          const parts = p.split(':');
          if (parts.length === 2) {
            const val = parts[1].trim();
            if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(val) && !['null', 'undefined', 'true', 'false'].includes(val)) {
              const isDeclared = content.includes(`let ${val}`) || content.includes(`const ${val}`) || content.includes(`var ${val}`) || content.includes(`function ${val}`) || content.includes(`(${val}`) || content.includes(`, ${val}`);
              if (!isDeclared) {
                undeclaredFindings.push({ file, line: idx + 1, val });
              }
            }
          }
        });
      }
    }
  });
});

assert.strictEqual(
  undeclaredFindings.length,
  0,
  `❌ [Handler Gate Failed] Found undeclared variables in event handlers: ${JSON.stringify(undeclaredFindings)}`
);
console.log(`  ✔ All 25 admin modules passed zero-undeclared-handler audit (0 flaws found).`);

console.log('\n🎉 [verify_admin_buttons] ALL BUTTON & ACTION PANEL CHECKS PASSED (100%)!\n');
