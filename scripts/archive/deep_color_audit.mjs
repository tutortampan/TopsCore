import fs from 'fs';
import path from 'path';

const dir = '.';
const exts = ['.css', '.js', '.html'];
const excludeDirs = ['node_modules', '.git', 'docs', 'archive', 'scratch', 'brain'];

function scan(d, fileList = []) {
  const entries = fs.readdirSync(d, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(d, ent.name).replace(/\\/g, '/');
    if (ent.isDirectory()) {
      if (!excludeDirs.includes(ent.name) && !ent.name.startsWith('.')) {
        scan(full, fileList);
      }
    } else if (exts.some(ext => ent.name.endsWith(ext))) {
      fileList.push(full);
    }
  }
  return fileList;
}

const rogueHexes = [
  { hex: /#22c55e/i, label: 'Green 500 (should be #00c000ff / var(--grade-a))' },
  { hex: /#10b981/i, label: 'Emerald 500 (should be #00c000ff / var(--grade-a))' },
  { hex: /#16a34a/i, label: 'Green 600 (should be #00c000ff / var(--grade-a))' },
  { hex: /#84cc16/i, label: 'Lime 500 (should be #95ff00ff / var(--grade-b))' },
  { hex: /#65a30d/i, label: 'Lime 600 (should be #95ff00ff / var(--grade-b))' },
  { hex: /#eab308/i, label: 'Yellow 500 (should be #FFFF00 / var(--grade-c))' },
  { hex: /#facc15/i, label: 'Yellow 400 (should be #FFFF00 / var(--grade-c))' },
  { hex: /#ca8a04/i, label: 'Yellow 600 (should be #FFFF00 / var(--grade-c))' },
  { hex: /#f97316/i, label: 'Orange 500 (should be #FF8C00 / var(--grade-d))' },
  { hex: /#ea580c/i, label: 'Orange 600 (should be #FF8C00 / var(--grade-d))' },
  { hex: /#ef4444/i, label: 'Red 500 (should be #FF0000 / var(--grade-e))' },
  { hex: /#dc2626/i, label: 'Red 600 (should be #FF0000 / var(--grade-e))' }
];

const files = scan(dir);
console.log(`Auditing ${files.length} files across workspace for color conformity...`);

let totalRogue = 0;
const resultsByFile = {};

files.forEach(file => {
  if (file.startsWith('scripts/')) return;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    rogueHexes.forEach(r => {
      if (r.hex.test(line)) {
        if (!resultsByFile[file]) resultsByFile[file] = [];
        resultsByFile[file].push({
          line: idx + 1,
          label: r.label,
          text: line.trim()
        });
        totalRogue++;
      }
    });
  });
});

for (const [file, items] of Object.entries(resultsByFile)) {
  console.log(`\n=== [${file}] (${items.length} occurrences) ===`);
  items.slice(0, 15).forEach(it => {
    console.log(`  L${it.line}: [${it.label}] -> ${it.text.substring(0, 100)}`);
  });
  if (items.length > 15) {
    console.log(`  ... and ${items.length - 15} more in this file.`);
  }
}

console.log(`\n>>> Total rogue color matches: ${totalRogue}`);
