import fs from 'fs';
import path from 'path';

function scan(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory() && item.name !== 'node_modules' && item.name !== 'archive') scan(full);
    else if (item.isFile() && item.name.endsWith('.js')) {
      const code = fs.readFileSync(full, 'utf8');
      const lines = code.split('\n');
      lines.forEach((l, idx) => {
        if (/=== ['"]F['"]|grade\s*:\s*['"]F['"]/.test(l)) {
          console.log(`${full}:${idx + 1}: ${l.trim()}`);
        }
      });
    }
  }
}

scan('js');
