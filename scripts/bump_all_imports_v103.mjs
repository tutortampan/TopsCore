import fs from 'fs';
import path from 'path';

const TARGET_VERSION = 'v=20261102_v103';
const VERSION_REGEX = /v=2026\d+_[a-z0-9]+/g;

function walkDir(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'archive' || entry.name === 'scratch') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(walkDir(full));
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.html'))) {
      files.push(full);
    }
  }
  return files;
}

const allFiles = walkDir('.');
let count = 0;

for (const file of allFiles) {
  let content = fs.readFileSync(file, 'utf8');
  if (VERSION_REGEX.test(content)) {
    const updated = content.replace(VERSION_REGEX, TARGET_VERSION);
    if (updated !== content) {
      fs.writeFileSync(file, updated, 'utf8');
      console.log(`Bumped: ${file}`);
      count++;
    }
  }
}

console.log(`\nSuccessfully bumped cache busters across ${count} files to ${TARGET_VERSION}!`);
