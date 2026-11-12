import fs from 'fs';

const js = fs.readFileSync('js/admin/app.js', 'utf8');
const lines = js.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('class-attendance-grid')) {
    console.log(idx + 1, l.trim().slice(0, 120));
  }
});

