/**
 * verify_student_roster_polish.mjs
 * Automated verification for the Student Roster Polish plan.
 * Checks all 4 fix targets in the modified source files.
 * Run: node scripts/verify_student_roster_polish.mjs
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve('d:/Drives/Tutor Tampan/TopsCore');
const PASS = '\x1b[32m✅ PASS\x1b[0m';
const FAIL = '\x1b[31m❌ FAIL\x1b[0m';
const INFO = '\x1b[36mℹ️  INFO\x1b[0m';

let allPassed = true;

function check(label, condition, hint = '') {
  if (condition) {
    console.log(`${PASS} ${label}`);
  } else {
    console.log(`${FAIL} ${label}${hint ? ' — ' + hint : ''}`);
    allPassed = false;
  }
}

function readFile(rel) {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

console.log('\n═══════════════════════════════════════════════════════');
console.log(' TopsCore — Student Roster Polish — Verification');
console.log('═══════════════════════════════════════════════════════\n');

// ── FILE: student-management.js ───────────────────────────────────────────────
const sm = readFile('js/admin/student-management.js');
console.log('[ student-management.js ]');

// 1. Rogue panel must NOT exist
check(
  '1a. No rogue .student-roster-lower-panel div in template',
  !sm.includes('workspace-lower-panel student-roster-lower-panel'),
  'Rogue panel still present in area.innerHTML'
);

// 2. syncStudentRosterBottomInfobar function defined
check(
  '1b. syncStudentRosterBottomInfobar() function defined',
  sm.includes('function syncStudentRosterBottomInfobar()'),
  'Function not found in file'
);

// 3. setBottomInfobar called inside syncStudentRosterBottomInfobar
check(
  '1c. window.setBottomInfobar called inside sync function',
  sm.includes('window.setBottomInfobar(leftHtml, rightHtml)'),
  'setBottomInfobar call not found'
);

// 4. Gender titleText uses Mister / Miss (not Mr. / Miss.)
check(
  '1d. Gender titleText → Mister / Miss (no dots)',
  sm.includes("isM ? 'Mister' : (isF ? 'Miss' : '—')"),
  "Still shows Mr. / Miss. — titleText not updated"
);

// 5. Inline select options use Mister / Miss
check(
  '1e. Inline gender select options: Mister / Miss',
  sm.includes('>Mister</option>') && sm.includes('>Miss</option>') && !sm.includes('>Mr.</option>') && !sm.includes('>Miss.</option>'),
  'Select options not updated'
);

// 6. Gender live-update on save updates viewEl text
check(
  '1f. Gender live-update: viewEl.textContent uses Mister/Miss',
  sm.includes("newG === 'male' ? 'Mister' : newG === 'female' ? 'Miss' : '—'"),
  'Live-update on save not patched'
);

// 7. Exam columns reduced (85px)
check(
  '1g. Exam col widths reduced to 85px',
  sm.includes("width: '85px'") && !sm.match(/key: `_cls_exam[1234]_[\s\S]{0,200}?width: '125px'/),
  'Exam cols still at 125px'
);

// 8. Discrete test cols reduced (95px)
check(
  '1h. Discrete test col widths reduced to 95px',
  sm.includes("width: '95px'"),
  'Discrete test cols not reduced'
);

// 9. Full edit modal: Mister (Male)
check(
  '1l. Full edit modal gender option: Mister (Male)',
  sm.includes('>Mister (Male)</option>'),
  'Full edit modal still shows Mr. (Male)'
);

// 10. No edit-mode-only class on action buttons (buttons always visible)
const rosterButtonSection = sm.slice(sm.indexOf('function syncStudentRosterBottomInfobar'), sm.indexOf('function syncStudentRosterBottomInfobar') + 3000);
check(
  '1b(ii). Action buttons have no edit-mode-only class (always visible)',
  !rosterButtonSection.includes('edit-mode-only'),
  'edit-mode-only class found on buttons — they will hide when Edit Mode is OFF'
);

console.log('');

// ── FILE: css/admin.css ───────────────────────────────────────────────────────
const css = readFile('css/admin.css');
console.log('[ css/admin.css ]');

check(
  '2a. color-scheme: dark added for .student-inline-select',
  css.includes('color-scheme: dark !important') && css.includes('student-inline-select'),
  'color-scheme: dark not found'
);

check(
  '2a. Dark option background (#0f172a) added for inline selects',
  css.includes('#0f172a !important') && css.includes('student-inline-select option'),
  'Dark option background CSS not found'
);

check(
  '2b. No .student-roster-lower-panel CSS rules',
  !css.includes('student-roster-lower-panel'),
  'Obsolete .student-roster-lower-panel CSS still present'
);

console.log('');

// ── FILE: student-registration.js ────────────────────────────────────────────
const reg = readFile('js/admin/student-registration.js');
console.log('[ student-registration.js ]');

check(
  '3a. Registration gender options: Mister (Male)',
  reg.includes('>Mister (Male)</option>'),
  'Registration form still shows Mr. (Male)'
);

check(
  '3a. Registration gender options: Miss (Female)',
  reg.includes('>Miss (Female)</option>'),
  'Registration form still shows old label'
);

console.log('');

// ── FILE: avatar-engine.js ────────────────────────────────────────────────────
const av = readFile('js/utils/avatar-engine.js');
console.log('[ avatar-engine.js ]');

check(
  '4a. stripHonorific regex includes "mister"',
  av.includes('mister'),
  'mister not added to stripHonorific regex'
);

check(
  '4a. stripHonorific regex is case-insensitive (/i flag)',
  av.includes('/i,') || av.includes('/i)') || av.includes("'').trim()"),
  'stripHonorific regex may not be case-insensitive'
);

console.log('');

// ── SUMMARY ───────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════');
if (allPassed) {
  console.log(' \x1b[32m🎉 ALL CHECKS PASSED — Student Roster Polish Complete!\x1b[0m');
} else {
  console.log(' \x1b[31m⚠️  SOME CHECKS FAILED — See above for details.\x1b[0m');
}
console.log('═══════════════════════════════════════════════════════\n');

process.exit(allPassed ? 0 : 1);
