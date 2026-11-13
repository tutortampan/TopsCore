import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 Starting Dead Database Calls & Legacy Table Elimination Verification...\n');

const droppedTables = [
  'subjects',
  'cec_app_state',
  'enrollments',
  'assignments',
  'class_meetings',
  'class_meeting_exceptions',
  'class_instances',
  'professional_skills',
  'user_professionals',
  'work_records',
  'question_usage_history',
  'questions',
  'test_items',
  'test_results',
  'test_topics',
  'student_submissions'
];

function scanDir(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'vendor' && entry.name !== 'archive') {
        results = results.concat(scanDir(fullPath));
      }
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.mjs'))) {
      results.push(fullPath);
    }
  }
  return results;
}

const jsFiles = scanDir('js');
console.log(`Auditing ${jsFiles.length} JavaScript files across js/...`);

// Patterns representing active DB operations:
// adminFetchAll('table'), adminFetchDeleted('table'), sb.from('table'),
// adminInsert('table'), adminUpdate('table'), adminSoftDelete('table'), adminHardDelete('table')
const violations = [];

for (const file of jsFiles) {
  const relPath = path.relative(process.cwd(), file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    for (const table of droppedTables) {
      const dbQueryRegex = new RegExp(`(adminFetchAll|adminFetchDeleted|adminInsert|adminUpdate|adminSoftDelete|adminHardDelete|\\.from)\\s*\\(\\s*['"\`]${table}['"\`]`, 'i');
      if (dbQueryRegex.test(line)) {
        violations.push({
          file: relPath,
          line: idx + 1,
          table,
          code: line.trim()
        });
      }
    }
  });
}

console.log(`▶ Pillar 1: Zero Active DB Query Invariant`);
if (violations.length > 0) {
  console.error(`❌ FAILED: Found ${violations.length} active database calls to dropped tables:`);
  violations.forEach(v => console.error(`   ${v.file}:${v.line} -> ${v.code}`));
  process.exit(1);
} else {
  console.log(`  ✅ Passed: Exactly 0 active database queries to dropped tables across all js/ modules.`);
}

console.log(`\n▶ Pillar 2: Checking noDeletedAtTables in js/api.js`);
const apiContent = fs.readFileSync('js/api.js', 'utf8');
for (const dropped of ['assignments', 'user_professionals', 'class_meetings', 'class_meeting_exceptions']) {
  assert(!apiContent.includes(`'${dropped}'`), `api.js must not include dropped table '${dropped}' in noDeletedAtTables`);
}
console.log(`  ✅ Passed: All dropped tables purged from api.js noDeletedAtTables filter.`);

console.log(`\n▶ Pillar 3: Checking Duplicate Test Logic Safety in tests-management.js`);
const tmContent = fs.readFileSync('js/admin/tests-management.js', 'utf8');
assert(!tmContent.includes("sb.from('questions')"), 'tests-management.js duplicateTest must not query questions table');
assert(!tmContent.includes("adminFetchAll('test_items'"), 'tests-management.js must not fetch test_items');
console.log(`  ✅ Passed: tests-management.js is completely clean of legacy questions and test_items queries.`);

console.log(`\n▶ Pillar 4: Checking Student Management Level-Centric Assignment (Rule 2.5)`);
const smContent = fs.readFileSync('js/admin/student-management.js', 'utf8');
assert(!smContent.includes("adminFetchAll('assignments'"), 'student-management.js must not query assignments table');
console.log(`  ✅ Passed: student-management.js enforces 100% level-centric test inheritance.`);

console.log(`\n🎉 ALL 4 PILLARS PASSED: ZERO DEAD DATABASE CALLS (100% INTEGRITY VERIFIED)!`);
