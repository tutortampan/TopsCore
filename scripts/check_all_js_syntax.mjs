import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function getJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    if (['node_modules', 'archive', '.git'].includes(item.name)) continue;
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      results = results.concat(getJsFiles(full));
    } else if (item.isFile() && (item.name.endsWith('.js') || item.name.endsWith('.mjs') || item.name.endsWith('.cjs'))) {
      results.push(full);
    }
  }
  return results;
}

const jsFiles = [
  ...getJsFiles('js'),
  ...fs.readdirSync('.').filter(f => f.endsWith('.js') || f.endsWith('.mjs')).map(f => path.resolve(f))
];

console.log(`Scanning ${jsFiles.length} JavaScript files for syntax errors (In-Process AST Engine)...`);
const t0 = Date.now();
let hasErrors = false;

for (const file of jsFiles) {
  try {
    const code = fs.readFileSync(file, 'utf8');
    if (typeof vm.SourceTextModule === 'function' && !file.endsWith('.cjs')) {
      new vm.SourceTextModule(code, { identifier: file });
    } else {
      new vm.Script(code, { filename: file });
    }
  } catch (err) {
    console.error(`❌ SYNTAX ERROR in ${file}:\n`, err.stack || err.message);
    hasErrors = true;
  }
}

const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
if (!hasErrors) {
  console.log(`✔ ALL ${jsFiles.length} JS files passed syntax validation in ${elapsed}s! (Zero-Process-Spawn)`);
  process.exit(0);
} else {
  console.error('Syntax errors were detected.');
  process.exit(1);
}
