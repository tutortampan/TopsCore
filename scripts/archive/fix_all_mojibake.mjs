import fs from 'fs';
import path from 'path';

const REPLACEMENTS = [
  // Double-corrupted box drawing in comments
  [/\u00C3\u00A2\u201D\u009D\u00E2\u201A\u00AC/g, '──'],
  [/\u00C3\u00A2\u201D\u009D/g, '─'],
  [/Ã¢” â‚¬/g, '──'],
  [/Ã¢â‚¬â€”/g, '—'],

  // Arrows
  [/\u00E2\u2020\u0090/g, '←'],
  [/\u00E2\u2020\u2019/g, '→'],
  [/\u00E2\u2020\u201C/g, '↓'],
  [/â†“/g, '↓'],
  [/â†’/g, '→'],
  [/â† /g, '←'],

  // Symbols
  [/\u00E2\u0153\u008D\u00EF\u00B8\u008F/g, '✍️'],
  [/âœ ï¸ /g, '✍️'],
  [/âœ•/g, '✕'],
  [/âœ…/g, '✅'],
  [/âœ“/g, '✓'],
  [/âœ¨/g, '✨'],
  [/Â·/g, '·'],

  // Punctuation
  [/â€”/g, '—'],
  [/â€“/g, '–'],
  [/â€˜/g, '‘'],
  [/â€™/g, '’'],
  [/â€œ/g, '“'],
  [/â€ /g, '” '],

  // Box drawing
  [/â”€â”€â”€/g, '───'],
  [/â”€â”€/g, '──'],
  [/â”€/g, '─'],
  [/â”‚/g, '│'],
  [/â”Œ/g, '┌'],
  [/â””/g, '└'],
  [/â”œ/g, '├'],
  [/â”¤/g, '┤'],
  [/â”¬/g, '┬'],
  [/â”´/g, '┴'],
  [/â”˜/g, '┘']
];

const TARGETS = [
  'admin.html',
  'dashboard.html',
  'index.html',
  'test.html',
  'result.html',
  'offline.html',
  'js/admin/app.js',
  'js/admin/admin-init.js',
  'js/api.js',
  'js/auth.js',
  'js/dashboard.js',
  'js/test.js',
  'js/result.js',
  'js/excel-parser.js',
  'AGENTS.md',
  'docs/TODO.md',
  'docs/CURRENT_STATE.md'
];

for (const rel of TARGETS) {
  const p = path.resolve(rel);
  if (!fs.existsSync(p)) continue;
  let text = fs.readFileSync(p, 'utf8');
  let changed = false;
  for (const [pattern, repl] of REPLACEMENTS) {
    if (pattern.test ? pattern.test(text) : text.includes(pattern)) {
      text = text.replace(pattern, repl);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(p, text, 'utf8');
    console.log(`✅ Cleaned mojibake in ${rel}`);
  }
}

console.log('Finished deep mojibake cleanup.');

