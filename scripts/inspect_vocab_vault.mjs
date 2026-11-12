import fs from 'fs';

const js = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');
const lines = js.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('renderWords') || l.includes('renderVocab') || l.includes('renderPhrases') || l.includes('tabContent')) {
    console.log(idx + 1, l.trim().slice(0, 120));
  }
});

