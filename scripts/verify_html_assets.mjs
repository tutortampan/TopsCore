import fs from 'fs';
import path from 'path';

const htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
let errorsFound = 0;

for (const htmlFile of htmlFiles) {
  const content = fs.readFileSync(htmlFile, 'utf8');

  // Match <script src="...">
  const scriptRegex = /<script\s+[^>]*src=["']([^"']+)["']/gi;
  let match;
  while ((match = scriptRegex.exec(content)) !== null) {
    const src = match[1].split('?')[0];
    if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) continue;
    const resolved = path.resolve(src);
    if (!fs.existsSync(resolved)) {
      console.error(`[BROKEN SCRIPT IN ${htmlFile}]: ${src} (resolved to ${resolved})`);
      errorsFound++;
    }
  }

  // Match <link rel="stylesheet" href="...">
  const linkRegex = /<link\s+[^>]*href=["']([^"']+)["']/gi;
  while ((match = linkRegex.exec(content)) !== null) {
    const href = match[1].split('?')[0];
    if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//') || href.startsWith('data:')) continue;
    const resolved = path.resolve(href);
    if (!fs.existsSync(resolved)) {
      console.error(`[BROKEN LINK IN ${htmlFile}]: ${href} (resolved to ${resolved})`);
      errorsFound++;
    }
  }
}

if (errorsFound === 0) {
  console.log(`🎉 ALL ${htmlFiles.length} HTML FILES: All scripts and stylesheets exist on disk!`);
  process.exit(0);
} else {
  console.error(`❌ Found ${errorsFound} broken asset references in HTML files!`);
  process.exit(1);
}

