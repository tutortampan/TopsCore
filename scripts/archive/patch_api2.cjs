const fs = require('fs');
let code = fs.readFileSync('js/api.js', 'utf8');

code = code.replace(
  /\.is\('deleted_at', null\)\s*\.order\('name'\);/g,
  ".is('deleted_at', null)\n        .eq('is_active', true)\n        .order('name');"
);

fs.writeFileSync('js/api.js', code);
console.log('patched is_active');
