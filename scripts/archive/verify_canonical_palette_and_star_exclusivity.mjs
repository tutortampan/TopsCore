/**
 * verify_canonical_palette_and_star_exclusivity.mjs
 * 
 * Automated Verification Suite for TopsCore LMS Canonical Palette & Star Exclusivity.
 * Verifies:
 * 1. Star Pink (#ff2d87) 100% Exclusivity & Green Blend Purge
 * 2. Student Gate Tactical Blue Alignment (#38bdf8)
 * 3. Student Roster Promotion Action Button (#0284c7 / #38bdf8)
 * 4. Section 3.6 Preservation (Quick Add Time #ffe600 & Vocab Vault #FFFF00 kept as is)
 * 5. JavaScript Syntax Integrity across all modified modules
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

console.log('🚀 Running TopsCore Canonical Palette & Star Exclusivity Verification...\n');

// 1. JS Syntax Check
const jsFiles = [
  'js/grading.js',
  'js/dashboard.js',
  'js/result.js',
  'js/admin/app.js',
  'js/admin/desk.js',
  'js/admin/student-management.js',
  'js/admin/crud-modals.js',
  'js/admin/modules.js',
  'js/admin/tests-management.js'
];

console.log('1. Checking JavaScript Syntax Integrity...');
for (const file of jsFiles) {
  try {
    execSync(`node --check ${file}`, { stdio: 'pipe' });
    console.log(`  ✔ Syntax valid: ${file}`);
  } catch (err) {
    console.error(`  ❌ Syntax error in ${file}:`, err.message);
    process.exit(1);
  }
}

// 2. Star Pink Exclusivity & Green Blend Purge
console.log('\n2. Verifying Star Pink (100%) Exclusivity & Green Blend Purge...');
const starFiles = [
  'css/admin.css',
  'css/dashboard.css',
  'css/result.css',
  'js/dashboard.js',
  'js/result.js',
  'js/grading.js'
];

for (const file of starFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Check for corrupt gradient blending mint/green with Star Pink
    if ((line.includes('86efac') || line.includes('006400')) && 
        (line.includes('var(--grade-star)') || line.includes('TOPSCORE_COLORS.STAR') || line.includes('ff2d87'))) {
      assert.fail(`❌ Corrupt green-star blend found in ${file}:${idx + 1}: ${line.trim()}`);
    }
    // Check for button using Star Pink
    if ((line.includes('button') || line.includes('btn')) && line.includes('background') && line.includes('var(--grade-star)')) {
      assert.fail(`❌ Button styled with Star Pink in ${file}:${idx + 1}: ${line.trim()}`);
    }
  });
}
console.log('  ✔ Zero green blend in Star components across CSS and JS');
console.log('  ✔ Zero buttons styled with Star Pink');

// 3. Student Gate Tactical Blue Alignment
console.log('\n3. Verifying Student Gate Tactical Blue Alignment...');
const authCss = fs.readFileSync('css/auth.css', 'utf8');
assert.ok(authCss.includes('.cascade-section.selected .cascade-step-num'), 'Missing selected step rule in auth.css');
assert.ok(authCss.includes('color: #38bdf8;'), 'Missing Tactical Cyan #38bdf8 in auth.css');
assert.ok(authCss.includes('.opt-card:hover'), 'Missing opt-card hover rule in auth.css');
assert.ok(authCss.includes('rgba(56, 189, 248'), 'Missing tactical blue rgba in auth.css');
console.log('  ✔ Student Gate step badges, borders, and selection labels aligned to Tactical Blue (#38bdf8)');

// 4. Student Roster Promotion Action Button
console.log('\n4. Verifying Student Roster Promotion Action Button...');
const studentMgmt = fs.readFileSync('js/admin/student-management.js', 'utf8');
assert.ok(
  studentMgmt.includes('background:#0284c7;border:1px solid #38bdf8;color:#ffffff;'),
  '❌ Promotion action button not styled with Tactical Sky Blue (#0284c7 / #38bdf8)'
);
console.log('  ✔ Promotion action button styled with Tactical Sky Blue (#0284c7 / #38bdf8)');

// 5. Summary Row Footer Top Border
console.log('\n5. Verifying Roster Summary Row Footer Top Border...');
assert.ok(
  !studentMgmt.includes('border-top:2px solid var(--grade-star, #00c000ff);'),
  '❌ Old rogue Star Pink/Green border still present in student roster summary row'
);
assert.ok(
  studentMgmt.includes('border-top:2px solid #334155;'),
  '❌ Summary row footer not styled with clean neutral border #334155'
);
console.log('  ✔ Summary row footer top border cleanly set to #334155');

// 6. Section 3.6 Preservation
console.log('\n6. Verifying Section 3.6 Preservation (Quick Add Time & Vocab Vault)...');
const testsAccess = fs.readFileSync('js/admin/tests-access.js', 'utf8');
assert.ok(
  testsAccess.includes('#ffe600'),
  '❌ Quick Add Time yellow banner (#ffe600) was modified or removed!'
);
const vocabVault = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');
assert.ok(
  vocabVault.includes('#FFFF00') || vocabVault.includes('#ffff00'),
  '❌ Vocab Vault yellow headers/chips (#FFFF00) were modified or removed!'
);
console.log('  ✔ Section 3.6 strictly preserved as-is per user directive');

console.log('\n🎉 ALL CANONICAL PALETTE & STAR EXCLUSIVITY CHECKS PASSED (100%)!');
