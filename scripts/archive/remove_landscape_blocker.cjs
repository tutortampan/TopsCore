const fs = require('fs');

// 1. Remove from CSS
let css = fs.readFileSync('css/style.css', 'utf8');
const cssRegex = /\/\* Portrait Lock Overlay \*\/[\s\S]*?display: flex !important;\r?\n  \}\r?\n\}/;
if (cssRegex.test(css)) {
  css = css.replace(cssRegex, '');
  fs.writeFileSync('css/style.css', css);
  console.log('Removed from CSS');
}

// 2. Remove from HTML
const htmlRegex = /\s*<!-- Portrait Lock Blocker -->\s*<div id="landscape-blocker">[\s\S]*?<\/div>/;
const files = ['index.html', 'dashboard.html', 'assessment.html', 'result.html', 'admin.html'];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (htmlRegex.test(content)) {
    content = content.replace(htmlRegex, '');
    fs.writeFileSync(f, content);
    console.log('Removed from ' + f);
  }
});
