import fs from 'fs';
import path from 'path';

const OLD_TAG = '20261101_v89';
const NEW_TAG = '20261101_v90';

const filesToUpdate = [
  'admin.html',
  'dashboard.html',
  'result.html',
  'test.html',
  'index.html',
  'management.html',
  'js/admin/app.js',
  'js/admin/admin-init.js',
  'js/admin/student-management.js',
  'js/admin/tests-access.js',
  'js/admin/student-registration.js',
  'js/admin/vocab-vault.js',
  'js/dashboard.js',
  'js/test.js',
  'js/result.js',
  'js/api.js',
  'js/grading.js'
];

let totalReplacements = 0;

filesToUpdate.forEach(file => {
  const fullPath = path.resolve(file);
  if (!fs.existsSync(fullPath)) return;
  let content = fs.readFileSync(fullPath, 'utf8');
  if (content.includes(OLD_TAG)) {
    const count = content.split(OLD_TAG).length - 1;
    content = content.replaceAll(OLD_TAG, NEW_TAG);
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${file}: ${count} instances`);
    totalReplacements += count;
  }
});

console.log(`Total replacements to ${NEW_TAG}: ${totalReplacements}`);
