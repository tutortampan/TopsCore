import fs from 'fs';

const REPLACEMENTS = [
  // Double-corrupted sequences first
  ['Ã¢â€ â‚¬', '──'],
  ['Ã¢â‚¬â€', '—'],
  
  // Single-corrupted box drawing
  ['â”€â”€â”€', '───'],
  ['â”€â”€', '──'],
  ['â”€', '─'],
  ['â”‚', '│'],
  ['â”Œ', '┌'],
  ['â””', '└'],
  ['â”œ', '├'],
  ['â”¤', '┤'],
  ['â”¬', '┬'],
  ['â”´', '┴'],
  ['â”˜', '┘'],

  // Punctuation & Quotes
  ['â€”', '—'],
  ['â€“', '–'],
  ['â€˜', '‘'],
  ['â€™', '’'],
  ['â€œ', '“'],
  ['â€ ', '” '],
  ['â€', '”'],

  // Arrows
  ['â†“', '↓'],
  ['â†’', '→'],
  ['â† ', '←'],

  // Symbols & Emojis
  ['âœ•', '✕'],
  ['âœ…', '✅'],
  ['âœ“', '✓'],
  ['âœ¨', '✨'],
  ['âœ ï¸ ', '✍️'],
  ['Â·', '·']
];

export function cleanMojibake(text) {
  let cleaned = text;
  for (const [bad, good] of REPLACEMENTS) {
    cleaned = cleaned.replaceAll(bad, good);
  }
  return cleaned;
}

// Test on files
const files = [
  'admin.html',
  'js/admin/app.js',
  'js/auth.js',
  'js/excel-parser.js',
  'AGENTS.md',
  'docs/TODO.md',
  'docs/SESSION_LOG.md'
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const original = fs.readFileSync(f, 'utf8');
  const cleaned = cleanMojibake(original);
  if (cleaned !== original) {
    fs.writeFileSync(f, cleaned, 'utf8');
    console.log(`Cleaned mojibake in ${f}`);
  }
}

