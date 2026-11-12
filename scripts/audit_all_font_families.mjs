import fs from 'fs';

const cssFiles = [
  'css/style.css',
  'css/admin.css',
  'css/dashboard.css',
  'css/test.css',
  'css/result.css',
  'css/auth.css'
];

console.log('=== AUDITING FONT-FAMILY DECLARATIONS ACROSS CSS ===');

const fontsFound = {};

for (const file of cssFiles) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const matches = content.match(/font-family\s*:\s*([^;]+);/gi) || [];
  
  for (const m of matches) {
    const val = m.replace(/font-family\s*:\s*/i, '').replace(';', '').trim();
    if (!fontsFound[val]) fontsFound[val] = [];
    fontsFound[val].push(file);
  }
}

for (const [font, files] of Object.entries(fontsFound)) {
  const uniqueFiles = Array.from(new Set(files));
  console.log(`\nFont: "${font}"`);
  console.log(`  Count: ${files.length} times in [${uniqueFiles.join(', ')}]`);
}
