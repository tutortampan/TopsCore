import fs from 'fs';

const content = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');

function extractStyles(fnName, startLine, endLine) {
  const lines = content.split('\n').slice(startLine - 1, endLine);
  console.log(`=== ${fnName} (Lines ${startLine}-${endLine}) ===`);
  const colorMatches = new Set();
  const fontMatches = new Set();
  lines.forEach((l, idx) => {
    const cMatches = l.match(/color:\s*([^;\"'>]+)/gi);
    if (cMatches) cMatches.forEach(m => colorMatches.add(m.replace(/\s+/g, ' ').trim()));
    const fMatches = l.match(/font-size:\s*([^;\"'>]+)/gi);
    if (fMatches) fMatches.forEach(m => fontMatches.add(m.replace(/\s+/g, ' ').trim()));
  });
  console.log('Colors:');
  Array.from(colorMatches).sort().forEach(c => console.log('  ' + c));
  console.log('Font Sizes:');
  Array.from(fontMatches).sort().forEach(f => console.log('  ' + f));
}

// 1. Vault Grid
extractStyles('1. Words & Phrases Grid (_renderVaultGrid)', 185, 520);
// 2. Theme Manager
extractStyles('2. Theme Manager Tab (_renderThemeManagerTab)', 1930, 2090);
// 3. Test Blueprint
extractStyles('3. Test Blueprint Tab (_renderThemeBlueprintTab)', 2715, 2860);
