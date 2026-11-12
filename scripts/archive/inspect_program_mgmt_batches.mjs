import fs from 'fs';

const js = fs.readFileSync('js/admin/program-management.js', 'utf8');
const lines = js.split('\n');
const idx = js.indexOf('Unified Blueprint Control');
if (idx !== -1) {
  const lineNum = js.slice(0, idx).split('\n').length;
  console.log(`Found around line ${lineNum}:`);
  console.log(lines.slice(Math.max(0, lineNum - 25), lineNum + 40).join('\n'));
} else {
  console.log('Not found');
}

