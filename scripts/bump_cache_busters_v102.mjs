import fs from 'fs';

const filesToUpdate = [
  'admin.html',
  'dashboard.html',
  'test.html',
  'result.html',
  'index.html',
  'sw.js',
  'js/admin/admin-init.js'
];

const OLD_VER = '20261102_v101';
const NEW_VER = '20261102_v102';

filesToUpdate.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (content.includes(OLD_VER)) {
      content = content.replaceAll(OLD_VER, NEW_VER);
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated ${file} to ${NEW_VER}`);
    } else {
      console.log(`No match for ${OLD_VER} in ${file}`);
    }
  }
});

// Update Service Worker cache name
if (fs.existsSync('sw.js')) {
  let swContent = fs.readFileSync('sw.js', 'utf8');
  swContent = swContent.replace(/topscore-cache-option-a-v49/g, 'topscore-cache-option-a-v50');
  fs.writeFileSync('sw.js', swContent, 'utf8');
  console.log('Updated sw.js CACHE_NAME to topscore-cache-option-a-v50');
}
