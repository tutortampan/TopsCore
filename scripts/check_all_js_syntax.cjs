const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    if (item.name === 'node_modules' || item.name === 'archive' || item.name === '.git') continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(getJsFiles(full));
    } else if (item.isFile() && item.name.endsWith('.js')) {
      results.push(full);
    }
  }
  return results;
}

const jsFiles = getJsFiles('js');
console.log(`Scanning ${jsFiles.length} JavaScript files for syntax errors...`);

let hasErrors = false;
for (const file of jsFiles) {
  try {
    // Check syntax using node --check
    execSync(`node --check "${file}"`, { stdio: 'pipe' });
  } catch (err) {
    console.error(`SYNTAX ERROR in ${file}:\n`, err.stderr.toString());
    hasErrors = true;
  }
}

if (!hasErrors) {
  console.log('ALL JS files passed syntax validation (node --check)!');
} else {
  console.log('Syntax errors were detected.');
}
