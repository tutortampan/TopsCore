import fs from 'fs';

const html = fs.readFileSync('admin.html', 'utf8');
const lines = html.split('\n');

function printRange(start, end) {
  for (let i = start - 1; i < end; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}

console.log('=== Modal 1 footer area (around 175-185) ===');
printRange(170, 185);

console.log('=== Modal 2 footer area (around 185-198) ===');
printRange(185, 198);

console.log('=== Modal 3 footer area (around 220-240) ===');
printRange(220, 240);
