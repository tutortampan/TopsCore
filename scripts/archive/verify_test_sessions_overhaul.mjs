/**
 * verify_test_sessions_overhaul.mjs
 * 
 * Automated regression test suite for Class Hub Live Test Sessions Controller
 * (Phase 432).
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('🧪 [verify_test_sessions_overhaul] Starting automated verification...');

const testsAccessPath = path.resolve('js/admin/tests-access.js');
const adminCssPath = path.resolve('css/admin.css');

assert.ok(fs.existsSync(testsAccessPath), 'js/admin/tests-access.js exists');
assert.ok(fs.existsSync(adminCssPath), 'css/admin.css exists');

const jsContent = fs.readFileSync(testsAccessPath, 'utf8');
const cssContent = fs.readFileSync(adminCssPath, 'utf8');

// 1. Check for absence of hardcoded theme definitions array
console.log('\n1. Checking dynamic curriculum extraction...');
assert.ok(
  !jsContent.includes('const THEME_DEFINITIONS = [') && !jsContent.includes('let THEME_DEFINITIONS = ['),
  'Must not have hardcoded THEME_DEFINITIONS array'
);
assert.ok(
  !jsContent.includes('Batch SH-26'),
  'Must not have hardcoded "Batch SH-26" in modal placeholder'
);
assert.ok(
  jsContent.includes('directTopicName'),
  'Must extract directTopicName from topics.name or payload'
);
console.log('  ✔ Dynamic topic and theme metadata extraction verified');

// 2. Check Universal Dark Badge Text in Batch Readiness Matrix
console.log('\n2. Checking Universal Dark Badge Text in Matrix Table (Rule 2.10)...');
assert.ok(
  jsContent.includes('color: #0f172a; min-width: 44px;'),
  'Grade badge in matrix table must use universal dark slate text (#0f172a)'
);
assert.ok(
  !jsContent.includes('bestPct === 100 ? \'#ffffff\' : \'#0f172a\''),
  'Must not have white text for Star 100% grade badge'
);
console.log('  ✔ Universal dark slate text (#0F172A) strictly verified');

// 3. Check Spatial Invariants & Table Nowrap (Rule 2.20)
console.log('\n3. Checking Table Single-Line Text Invariant...');
assert.ok(
  jsContent.includes('white-space: nowrap !important;'),
  'Matrix table cells must enforce white-space: nowrap !important;'
);
assert.ok(
  jsContent.includes('font-size: 12px;'),
  'Matrix table must enforce 12px font size'
);
console.log('  ✔ 12px font size and single-line nowrap verified');

// 4. Check CSS Standby Status in css/admin.css
console.log('\n4. Checking Standby Neutral Styling in css/admin.css...');
assert.ok(
  cssContent.includes('.box-wireframe-standby'),
  'css/admin.css must define .box-wireframe-standby'
);
assert.ok(
  cssContent.includes('rgba(56, 189, 248, 0.25)'),
  'Standby box must use cyan border accent'
);
assert.ok(
  cssContent.includes('color: #e2e8f0 !important;'),
  'Standby box must use #e2e8f0 text'
);
console.log('  ✔ Standby neutral styling verified');

// 5. Check Live Monitor Subtitle Dynamic Modules
console.log('\n5. Checking Live Monitor Subtitle Dynamic Modules...');
assert.ok(
  jsContent.includes('modLabel = (theme.wordsTest && theme.phrasesTest)'),
  'Live monitor subtitle must dynamically label Words vs Phrases modules'
);
console.log('  ✔ Dynamic module labeling in monitor modal verified');

console.log('\n🎉 [verify_test_sessions_overhaul] ALL TEST SESSIONS CHECKS PASSED (100%)!\n');
