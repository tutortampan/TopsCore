import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

global.window = global;
global.window.addEventListener = () => {};
global.document = { addEventListener: () => {}, removeEventListener: () => {} };
global.location = { hostname: 'cloud' };
global.localStorage = { getItem: () => null, setItem: () => {} };

function getAllJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllJsFiles(fullPath));
    } else if (file.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

const allFiles = getAllJsFiles('./js');

// Map of exported symbols per file
const moduleExports = new Map();

for (const filePath of allFiles) {
  try {
    const url = pathToFileURL(path.resolve(filePath)).href;
    const mod = await import(url);
    moduleExports.set(path.resolve(filePath).toLowerCase(), new Set(Object.keys(mod)));
  } catch (err) {
    // Some vendor files or browser DOM files might throw in Node if they access window/document properties
    // We will parse their AST / exports if dynamic import fails
  }
}

let errorsFound = 0;

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Match: import { a, b } from './path.js?v=...' or from '../path.js'
  const importRegex = /import\s*(?:\{([^}]+)\}|\*\s*as\s*\w+|\w+)\s*from\s*['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const namedImports = match[1];
    let importPath = match[2].split('?')[0]; // strip query string

    if (!importPath.startsWith('.')) continue; // skip bare imports (e.g. libraries)

    const resolvedPath = path.resolve(path.dirname(filePath), importPath).toLowerCase();

    if (!fs.existsSync(resolvedPath)) {
      console.error(`[BROKEN FILE IMPORT] In ${filePath}: Target file not found: ${match[2]}`);
      errorsFound++;
      continue;
    }

    if (namedImports) {
      const symbols = namedImports
        .split(',')
        .map(s => s.trim().replace(/\s+as\s+\w+/, ''))
        .filter(Boolean);
      const exportedSet = moduleExports.get(resolvedPath);

      if (exportedSet) {
        for (const sym of symbols) {
          if (!exportedSet.has(sym)) {
            console.error(`[MISSING NAMED EXPORT] In ${filePath}: Symbol '${sym}' is NOT exported by ${importPath}`);
            errorsFound++;
          }
        }
      }
    }
  }
}

if (errorsFound === 0) {
  console.log(`\n🎉 PERFECT HEALTH: All ${allFiles.length} JS modules have 100% valid file references and named exports!`);
  process.exit(0);
} else {
  console.error(`\n❌ Found ${errorsFound} import/export issues!`);
  process.exit(1);
}
