import fs from 'fs';

const js = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');
const lines = js.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('vocabulary_vault')) {
    console.log(`L${idx+1}:`, l.trim());
    console.log(lines.slice(idx, idx + 4).join('\n'));
  }
});

