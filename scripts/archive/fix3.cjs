const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');
html = html.replace('Question Banks', 'Vocabulary Vault');
fs.writeFileSync('admin.html', html);
console.log('Reverted Question Banks to Vocabulary Vault');
