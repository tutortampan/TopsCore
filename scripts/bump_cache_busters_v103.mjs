import fs from 'fs';

const oldPattern = /v=\d+_[a-z0-9]+/g;
const newVersion = 'v=20261102_v103';

const files = [
  'admin.html',
  'dashboard.html',
  'test.html',
  'result.html',
  'index.html',
  'sw.js',
  'js/admin/app.js',
  'js/dashboard.js',
  'js/test.js'
];

files.forEach(f => {
  if (!fs.existsSync(f)) return;
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(oldPattern, newVersion);
  if (f === 'sw.js') {
    content = content.replace(/topscore-cache-option-a-v\d+/, 'topscore-cache-option-a-v52');
  }
  fs.writeFileSync(f, content, 'utf8');
  console.log('Bumped', f, 'to', newVersion);
});
