import fs from 'fs';
import path from 'path';

function searchFiles(dir, pattern) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const f of files) {
    const fullPath = path.join(dir, f.name);
    if (f.isDirectory() && !f.name.startsWith('.') && f.name !== 'node_modules') {
      searchFiles(fullPath, pattern);
    } else if (f.isFile() && (f.name.endsWith('.js') || f.name.endsWith('.html') || f.name.endsWith('.mjs'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (pattern.test(content)) {
        console.log(`Found in: ${fullPath}`);
        const lines = content.split('\n');
        lines.forEach((l, idx) => {
          if (pattern.test(l)) {
            console.log(`  L${idx+1}: ${l.trim().slice(0, 120)}`);
          }
        });
      }
    }
  }
}

console.log('--- Searching for #batches ---');
searchFiles('js', /#batches/);
searchFiles('.', /#batches/);

console.log('\n--- Searching for Unified Blueprint Control ---');
searchFiles('js', /Unified Blueprint Control/);

