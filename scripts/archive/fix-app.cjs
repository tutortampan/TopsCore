const fs = require('fs');
let js = fs.readFileSync('js/admin/app.js', 'utf8');
js = js.replace("health: 'DATA', vocab_vault: 'DATA', modules: 'DATA'", "health: 'DATA', modules: 'DATA'");
js = js.replace("'class-panel': 'CLASS',", "'class-panel': 'CLASS', vocab_vault: 'CLASS',");
fs.writeFileSync('js/admin/app.js', js);
console.log('updated app.js');
