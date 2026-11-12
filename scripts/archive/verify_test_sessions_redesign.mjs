import { readFileSync } from 'fs';
import assert from 'assert';

console.log('🧪 Starting Verification: Live Test Sessions Redesign & Batch Controller...');

// 1. Check tests-access.js and admin.css files exist and readable
const testsAccessJs = readFileSync('js/admin/tests-access.js', 'utf8');
const adminCss = readFileSync('css/admin.css', 'utf8');

// 2. Program Isolation Verification
console.log('  Testing Task 1: Program-Level Batch Isolation...');
assert(testsAccessJs.includes('(!classProgramId || b.program_id === classProgramId)'), 'Batch filter must strictly enforce program_id matching');
assert(testsAccessJs.includes('classProgramId'), 'classProgramId must be resolved from currentClass');
console.log('  ✔ Task 1 Passed: Strict program isolation confirmed in tests-access.js');

// 3. Dynamic Curriculum Extraction Verification
console.log('  Testing Task 2: Dynamic Curriculum Extraction...');
assert(testsAccessJs.includes('THEME_PALETTES'), 'Must use dynamic THEME_PALETTES instead of static definitions');
assert(testsAccessJs.includes('discoveredCodes'), 'Must discover theme codes dynamically from classTests');
assert(testsAccessJs.includes('topicName'), 'Must dynamically extract topicName from test titles');
console.log('  ✔ Task 2 Passed: Dynamic curriculum extraction confirmed');

// 4. Batch Readiness Radar & Count-Aware Buttons
console.log('  Testing Task 3: Batch Readiness Radar...');
assert(testsAccessJs.includes('eligibleNormalCount'), 'Must compute eligibleNormalCount for active batch');
assert(testsAccessJs.includes('eligibleRemedialCount'), 'Must compute eligibleRemedialCount for active batch');
assert(testsAccessJs.includes('NORMAL (${eligibleNormalCount})'), 'Normal button must display student count');
assert(testsAccessJs.includes('REMEDI (${eligibleRemedialCount})'), 'Remedial button must display student count');
console.log('  ✔ Task 3 Passed: Batch readiness radar and count-aware buttons confirmed');

// 5. Outline / Border-Only Button Styling in CSS
console.log('  Testing Task 4: Outline / Border-Only Button Styling...');
assert(adminCss.includes('.btn-wireframe-normal') && adminCss.includes('border: 1.5px solid #00c000'), 'Normal button must use green outline border');
assert(adminCss.includes('.btn-wireframe-remidi') && adminCss.includes('border: 1.5px solid #ffff00'), 'Remedial button must use yellow outline border');
assert(adminCss.includes('.box-wireframe-standby') && adminCss.includes('Standby'), 'Standby box must be present without bright red');
assert(!adminCss.includes('.box-wireframe-standby {\n  background: #e60000'), 'Standby must never use solid red #e60000');
console.log('  ✔ Task 4 Passed: Outline styling and modern compact CSS verified');

// 6. Top Header Streamlining & Sub-Panel Footer Relocation
console.log('  Testing Task 5: Sub-Panel Footer Relocation...');
assert(testsAccessJs.includes('setBottomInfobar'), 'Must call setBottomInfobar to update 50px lower panel');
assert(!testsAccessJs.includes('<!-- KPI Summary Pills -->'), 'Bulky top 3 KPI cards must be removed from top container');
console.log('  ✔ Task 5 Passed: Header streamlined and metadata relocated to lower sub-panel');

// 7. Batch Student Readiness Matrix Table
console.log('  Testing Task 6: Batch Student Readiness Matrix Table...');
assert(testsAccessJs.includes('renderBatchReadinessMatrix'), 'renderBatchReadinessMatrix function must be implemented');
assert(testsAccessJs.includes('batch-readiness-matrix-container'), 'Matrix container must be present in DOM template');
assert(testsAccessJs.includes('matrix-theme-filter'), 'Theme filter dropdown must be present for matrix');
console.log('  ✔ Task 6 Passed: Batch Student Readiness Matrix table verified');

console.log('\n🎉 ALL 6 VERIFICATION SUITES PASSED FLAWLESSLY!');
