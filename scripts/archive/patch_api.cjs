const fs = require('fs');
let code = fs.readFileSync('d:/TopsCore/js/api.js', 'utf8');

// 1. Add item_code to export query
code = code.replace(
  ".select('target_level, theme_code, theme, topic_code, topic, indonesian, english, word_type, created_at')",
  ".select('item_code, target_level, theme_code, theme, topic_code, topic, indonesian, english, word_type, created_at')"
);

// 2. Add Item Code to exported Excel object
code = code.replace(
  "Category: isPhrase ? 'Phrases' : 'Words',",
  "'Item Code': w.item_code || '',\n      Category: isPhrase ? 'Phrases' : 'Words',"
);

// 3. Update sanitizeVaultRow to parse item_code
code = code.replace(
  "export function sanitizeVaultRow(row) {",
  "export function sanitizeVaultRow(row) {\n  const ic = row['Item Code'] || row.item_code;"
);
code = code.replace(
  "target_level: parseInt(row.level || row.target_level || 1, 10) || 1",
  "target_level: parseInt(row.level || row.target_level || 1, 10) || 1,\n    item_code: ic || null"
);

// 4. Update importVaultWords logic to use item_code as primary duplication check instead of english+topic
// But wait, the Excel parsing logic is in `js/admin/vocab-vault.js`. Let's update `api.js` first.
fs.writeFileSync('d:/TopsCore/js/api.js', code);
console.log("api.js patched.");
