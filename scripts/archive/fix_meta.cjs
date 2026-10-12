const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

html = html.replace(
  /<span id="meta-lvl" style="color: #cbd5e1;">/g,
  '<span id="meta-lvl">'
);

fs.writeFileSync('dashboard.html', html);
console.log('Fixed styling of meta-lvl to match the rest');
