import fs from 'fs';

const api = fs.readFileSync('js/api.js', 'utf8');
const lines = api.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('vocabulary_vault') || l.includes('fetchVault') || l.includes('getVocabulary')) {
    console.log(`L${idx+1}:`, l.trim());
    console.log(lines.slice(idx, idx + 5).join('\n'));
  }
});

