import fs from 'fs';
import path from 'path';

const NEW_TAG = '20261101_v91';

const filesToUpdate = [
  'admin.html',
  'dashboard.html',
  'result.html',
  'test.html',
  'index.html',
  'offline.html',
  'management.html',
  'sw.js',
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
  
  // Replace any query parameter ?v=20261101_v\d+ or sw.js?v=...
  const updated = content.replace(/(?:\?|&)v=(20261101_v\d+|20261029_v\d+)/g, `?v=${NEW_TAG}`);
  if (updated !== content) {
    fs.writeFileSync(fullPath, updated, 'utf8');
    console.log(`Updated cache busters in ${file} to ${NEW_TAG}`);
    totalReplacements++;
  }
});

console.log(`Cache busters updated across ${totalReplacements} files to ${NEW_TAG}.`);

