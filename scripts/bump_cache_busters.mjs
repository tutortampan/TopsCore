import fs from 'fs';

const htmlFiles = ['admin.html', 'dashboard.html', 'result.html', 'test.html'];
const newVersion = '20261103_v111';

htmlFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf-8');
  const updated = content.replace(/\?v=2026[0-9]+_v[0-9]+/g, `?v=${newVersion}`);
  fs.writeFileSync(file, updated, 'utf-8');
  console.log(`Updated cache busters in ${file} to ?v=${newVersion}`);
});

// Also check js/ files that import with ?v=
const jsFiles = [
  'js/admin/app.js',
  'js/dashboard.js',
  'js/result.js',
  'js/test.js',
  'js/api.js',
  'js/grading.js',
  'js/admin/vocab-vault.js',
  'js/admin/tests-management.js',
  'js/admin/student-management.js',
  'js/admin/curriculum-management.js',
  'js/admin/program-management.js'
];

jsFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf-8');
  const updated = content.replace(/\?v=2026[0-9]+_v[0-9]+/g, `?v=${newVersion}`);
  fs.writeFileSync(file, updated, 'utf-8');
  console.log(`Updated cache busters in ${file} to ?v=${newVersion}`);
});

