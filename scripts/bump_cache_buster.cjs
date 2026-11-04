const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'admin.html',
  'dashboard.html',
  'result.html',
  'test.html',
  'js/admin/app.js',
  'js/admin/forgiven-wizard-modal.js',
  'js/admin/test-system-settings-modal.js',
  'js/admin/vocab-vault.js',
  'js/api.js',
  'js/dashboard.js',
  'js/result.js',
  'js/test.js'
];

let changedCount = 0;
filesToUpdate.forEach(f => {
  const p = path.resolve(f);
  if (fs.existsSync(p)) {
    let content = fs.readFileSync(p, 'utf8');
    if (content.includes('20261104_v121')) {
      content = content.replaceAll('20261104_v121', '20261104_v122');
      fs.writeFileSync(p, content, 'utf8');
      console.log(`Updated cache buster in: ${f}`);
      changedCount++;
    }
  }
});
console.log(`Finished. Updated ${changedCount} files.`);
