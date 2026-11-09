import fs from 'fs';

console.log('=== E2E DEEP MODULES AUDIT ===');

const modulesToCheck = [
  'js/app.js',
  'js/api.js',
  'js/auth.js',
  'js/grading.js',
  'js/dashboard.js',
  'js/result.js',
  'js/test.js',
  'js/admin/app.js',
  'js/admin/admin-init.js',
  'js/admin/admin-deck.js',
  'js/admin/class.js',
  'js/admin/classes-hub.js',
  'js/admin/classes-management.js',
  'js/admin/crud-modals.js',
  'js/admin/curriculum-management.js',
  'js/admin/datagrid.js',
  'js/admin/desk.js',
  'js/admin/imports-exports.js',
  'js/admin/modules.js',
  'js/admin/program-management.js',
  'js/admin/student-management.js',
  'js/admin/student-registration.js',
  'js/admin/tests-access.js',
  'js/admin/tests-management.js',
  'js/admin/vocab-vault.js'
];

let errors = 0;
for (const file of modulesToCheck) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Module not found: ${file}`);
    errors++;
    continue;
  }
  const content = fs.readFileSync(file, 'utf8');

  // Check 1: Unresolved template literal escapes
  if (content.includes('${undefined}')) {
    console.error(`❌ [${file}] Literal \${undefined} detected`);
    errors++;
  }

  // Check 2: Obsolete Grade 'F' references where standard scale strictly forbids Grade 'F' (Rule 2.10)
  const fMatches = content.match(/grade\s*===\s*['"]F['"]/g);
  if (fMatches) {
    console.warn(`⚠️ [${file}] Found obsolete 'grade === "F"' check: ${fMatches.length} occurrence(s)`);
  }

  // Check 3: Check for rogue '0%^F' or '0%ᶠ'
  if (content.includes('0%^F') || content.includes('0%ᶠ')) {
    console.error(`❌ [${file}] Rogue forgiven string detected!`);
    errors++;
  }

  // Check 4: Check for NaN in innerHTML templates
  const nanTemplateRegex = /\bNaN\b/g;
  // If NaN is hardcoded in strings
  if (/['"`][^'"`]*\bNaN\b[^'"`]*['"`]/.test(content)) {
    console.warn(`⚠️ [${file}] String containing 'NaN' detected`);
  }
}

console.log(`\nModule audit completed with ${errors} critical errors.`);

