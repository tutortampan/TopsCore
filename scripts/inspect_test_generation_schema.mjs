import fs from 'fs';

const api = fs.readFileSync('js/api.js', 'utf8');
const lines = api.split('\n');

console.log('--- Searching for test generation & test_items insertion in api.js ---');
lines.forEach((l, idx) => {
  if (l.includes('test_items') && (l.includes('insert') || l.includes('select') || l.includes('from'))) {
    console.log(`L${idx+1}:`, l.trim().slice(0, 120));
  }
});

