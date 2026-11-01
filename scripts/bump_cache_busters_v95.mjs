import fs from 'fs';
import path from 'path';

const NEW_TAG = '20261101_v95';
const NEW_SW_CACHE = 'topscore-cache-option-a-v43';

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
  
  let updated = content.replace(/(?:\?|&)v=(20261101_v\d+|202610\d+_v\d+)/g, `?v=${NEW_TAG}`);
  
  if (file === 'sw.js') {
    updated = updated.replace(/topscore-cache-option-a-v\d+/g, NEW_SW_CACHE);
  }

  if (updated !== content) {
    fs.writeFileSync(fullPath, updated, 'utf8');
    console.log(`Updated cache busters in ${file} to ${NEW_TAG}`);
    totalReplacements++;
  }
});

console.log(`Cache busters updated across ${totalReplacements} files to ${NEW_TAG}.`);

