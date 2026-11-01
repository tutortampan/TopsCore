import fs from 'fs';
import path from 'path';

const TARGET_TAG = '20261101_v99';

function processDir(dir) {
  let count = 0;
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    const full = path.join(dir, it.name);
    if (it.isDirectory() && it.name !== 'node_modules' && it.name !== '.git') {
      count += processDir(full);
    } else if (it.isFile() && it.name.endsWith('.js')) {
      const content = fs.readFileSync(full, 'utf8');
      const updated = content.replace(/(from\s+['"][^'"]*?\?v=)(?:[a-zA-Z0-9._-]+)(['"])/g, `$1${TARGET_TAG}$2`);
      if (updated !== content) {
        fs.writeFileSync(full, updated, 'utf8');
        console.log(`Updated imports in ${full}`);
        count++;
      }
    }
  }
  return count;
}

const total = processDir('js');
console.log(`\nSuccessfully harmonized internal import cache tags across ${total} JavaScript files to ${TARGET_TAG}!`);
