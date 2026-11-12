import fs from 'fs';

const html = fs.readFileSync('admin.html', 'utf8');
const lines = html.split('\n');
lines.forEach((line, i) => {
  if (line.includes('modal-header') || line.includes('modal-footer') || line.includes('modal-box')) {
    console.log(`${i + 1}: ${line.trim()}`);
  }
});

