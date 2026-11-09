import fs from 'fs';
import path from 'path';

global.window = global;
global.window.addEventListener = () => {};
global.document = { addEventListener: () => {}, removeEventListener: () => {} };
global.location = { hostname: 'cloud' };
global.localStorage = { getItem: () => null, setItem: () => {} };

const api = await import('../js/api.js');
const apiKeys = new Set(Object.keys(api));

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
let hasError = false;

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = /import\s*\{([^}]+)\}\s*from\s*['"][^'"]*api\.js[^'"]*['"]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const imported = match[1]
      .split(',')
      .map(s => s.trim().replace(/\s+as\s+\w+/, ''))
      .filter(Boolean);
    const missing = imported.filter(sym => !apiKeys.has(sym));
    if (missing.length > 0) {
      console.error(`File ${filePath} has MISSING imports:`, missing);
      hasError = true;
    }
  }
}

if (!hasError) {
  console.log(`🎉 ALL ${allFiles.length} JS MODULE IMPORTS (100%) MATCH api.js EXPORTS PERFECTLY!`);
  process.exit(0);
} else {
  process.exit(1);
}
