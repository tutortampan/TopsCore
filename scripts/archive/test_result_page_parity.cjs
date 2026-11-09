const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('=== TEST SUITE: RESULT PAGE WIREFRAME & PARITY AUDIT ===\n');

// 1. Verify result.html
console.log('[1] Auditing result.html:');
const html = fs.readFileSync(path.join(__dirname, '..', 'result.html'), 'utf8');

const requiredIds = [
  'result-page-header',
  'result-identity-card',
  'result-meta-wrapper',
  'meta-inst',
  'meta-prog',
  'meta-batch',
  'meta-lvl',
  'result-avatar-stage',
  'result-avatar-container',
  'result-avatar-img',
  'result-student-name-label',
  'result-Test-name-container',
  'result-test-type-row',
  'result-test-topic-row',
  'result-metrics-composite-card',
  'result-metrics-bar',
  'card-filter-correct',
  'card-filter-partial',
  'card-filter-wrong',
  'result-points-box',
  'result-score-grade-card',
  'result-score-box',
  'result-percentage',
  'result-grade-box',
  'result-grade-val',
  'result-motivation-msg',
  'smart-next-action-container',
  'toggle-answers-btn',
  'back-dashboard-btn',
  'bottom-ad-banner'
];

requiredIds.forEach(id => {
  assert(html.includes(`id="${id}"`), `Missing ID in result.html: ${id}`);
});
console.log(`✅ PASS: All ${requiredIds.length} required element IDs present in result.html.`);

// Verify order of breakdown button and back button
const breakdownIdx = html.indexOf('id="toggle-answers-btn"');
const backIdx = html.indexOf('id="back-dashboard-btn"');
assert(breakdownIdx < backIdx, 'toggle-answers-btn must appear before back-dashboard-btn (wireframe item 7 & 8)');
console.log('✅ PASS: View Answer Breakdown is above Back Navigation Button.');

// 2. Verify css/result.css
console.log('\n[2] Auditing css/result.css:');
const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'result.css'), 'utf8');

assert(css.includes('grid-template-columns: 1fr 1fr 1fr'), 'tutor-remedial-segmented must have 3 columns');
assert(css.includes('.result-metrics-composite-card'), 'result-metrics-composite-card must be defined in CSS');
assert(css.includes('.metrics-score-grade-divider'), 'metrics-score-grade-divider must be defined in CSS');
assert(css.includes('.result-score-grade-row'), 'result-score-grade-row must be defined in CSS');
assert(css.includes('.result-action-slot'), 'result-action-slot must be defined in CSS');
assert(css.includes('.segment-forgive.active'), 'segment-forgive.active must be styled');
console.log('✅ PASS: CSS rules for 3-column tutor control, composite card, divider, and action slot verified.');

// 3. Verify js/result.js
console.log('\n[3] Auditing js/result.js:');
const js = fs.readFileSync(path.join(__dirname, '..', 'js', 'result.js'), 'utf8');

assert(js.includes('labelAttemptNormal'), 'labelAttemptNormal must be imported and used');
assert(js.includes('labelAttemptForgiven'), 'labelAttemptForgiven must be imported and used');
assert(js.includes('labelAttemptRemedial'), 'labelAttemptRemedial must be imported and used');
assert(js.includes('btn-segment-normal'), 'btn-segment-normal must be handled');
assert(js.includes('btn-segment-remidi'), 'btn-segment-remidi must be handled');
assert(js.includes('btn-segment-forgive'), 'btn-segment-forgive must be handled');
assert(js.includes('GO TO NEXT ASSESMENT:'), 'GO TO NEXT ASSESMENT: tag must be rendered');
assert(js.includes('BACK TO ROOM'), 'BACK TO ROOM must be set for Admin');
assert(js.includes('BACK TO LOBBY'), 'BACK TO LOBBY must be set for Student');
assert(js.includes('result-metrics-composite-card'), 'Composite card must be cascaded and aura-propagated');
console.log('✅ PASS: js/result.js logic verified for Tutor 3 buttons, Student next action, and back buttons.');

// 4. Verify js/api.js
console.log('\n[4] Auditing js/api.js:');
const api = fs.readFileSync(path.join(__dirname, '..', 'js', 'api.js'), 'utf8');
assert(api.includes('export async function labelAttemptNormal'), 'labelAttemptNormal must be exported in api.js');
assert(api.includes('export async function labelAttemptForgiven'), 'labelAttemptForgiven must be exported in api.js');
assert(api.includes('export async function labelAttemptRemedial'), 'labelAttemptRemedial must be exported in api.js');
console.log('✅ PASS: Status label functions exported canonically in api.js.');

console.log('\n======================================================');
console.log('✅ ALL RESULT PAGE PARITY TESTS PASSED 100%!');

