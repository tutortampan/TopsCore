const fs = require('fs');

const file = process.argv[2] || 'js/admin/tests-access.js';
const query = process.argv[3] || 'modal-theme-live-monitor';

const lines = fs.readFileSync(file, 'utf8').split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes(query.toLowerCase())) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});

