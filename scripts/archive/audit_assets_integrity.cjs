const fs = require('fs');
const path = require('path');

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
console.log(`Auditing asset references in ${htmlFiles.length} HTML files:`);

let totalMissing = 0;
htmlFiles.forEach(htmlFile => {
  const content = fs.readFileSync(htmlFile, 'utf8');
  
  // Check script tags
  const scriptRegex = /src=["']([^"']+)["']/g;
  let m;
  while ((m = scriptRegex.exec(content)) !== null) {
    const src = m[1].split('?')[0];
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:')) continue;
    const resolved = path.resolve(src);
    if (!fs.existsSync(resolved)) {
      console.error(`  ❌ [MISSING SCRIPT in ${htmlFile}]: ${src}`);
      totalMissing++;
    }
  }

  // Check link stylesheet tags
  const cssRegex = /href=["']([^"']+\.css)(\?[^"']*)?["']/g;
  while ((m = cssRegex.exec(content)) !== null) {
    const href = m[1].split('?')[0];
    if (href.startsWith('http://') || href.startsWith('https://')) continue;
    const resolved = path.resolve(href);
    if (!fs.existsSync(resolved)) {
      console.error(`  ❌ [MISSING CSS in ${htmlFile}]: ${href}`);
      totalMissing++;
    }
  }
});

if (totalMissing === 0) {
  console.log('🎉 100% PASS! All local scripts and stylesheets referenced in HTML files exist on disk.');
  process.exit(0);
} else {
  console.error(`Total missing assets: ${totalMissing}`);
  process.exit(1);
}
