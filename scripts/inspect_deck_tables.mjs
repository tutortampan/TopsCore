import fs from 'fs';

const js = fs.readFileSync('js/admin/admin-deck.js', 'utf8');
const lines = js.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('<table')) {
    console.log(`Line ${idx+1}:`);
    console.log(lines.slice(Math.max(0, idx - 15), idx + 20).join('\n'));
  }
});

