import fs from 'fs';

const targetFiles = [
  'css/style.css',
  'css/admin.css',
  'css/dashboard.css',
  'css/result.css',
  'css/test.css',
  'js/grading.js',
  'js/admin/classes-hub.js',
  'js/dashboard.js',
  'js/result.js',
  'js/admin/student-management.js',
  'js/admin/tests-management.js',
  'js/test.js',
  'js/admin/app.js'
];

console.log('=== AUDITING COLORS AGAINST TOPSCORE COLOR SPECIFICATION ===\n');

targetFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const matched = [];
  lines.forEach((line, idx) => {
    // Check for non-standard grade colors used in grade/eval contexts
    if (/#22c55e|#10b981|#84cc16|#eab308|#facc15|#f97316/i.test(line)) {
      matched.push({ line: idx + 1, content: line.trim() });
    }
  });

  if (matched.length > 0) {
    console.log(`\n[${file}] Found ${matched.length} occurrence(s):`);
    matched.forEach(m => {
      console.log(`  L${m.line}: ${m.content.substring(0, 140)}`);
    });
  }
});
