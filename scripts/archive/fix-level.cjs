const fs = require('fs');
let content = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');

content = content.replace('<option value=\"\">All Level</option>', '<option value=\"\">All Level (1, 2, 3, 0)</option>');

fs.writeFileSync('js/admin/vocab-vault.js', content, 'utf8');
