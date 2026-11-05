const fs = require('fs');
const path = require('path');

const extensions = ['.html', '.js', '.css', '.sql', '.json'];
const mojibakePattern = /[\uFFFD]|â€[™œ—–\x9d\x9c]|Ã[\xa0-\xff]|Â[\xa0-\xff]|\?\?\?|ðŸ[\x80-\xbf]/g;

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    if (['node_modules', '.git', '.vscode', '.agents', '.antigravity', 'test-results', 'audit_screenshots'].includes(entry)) continue;
    const fullPath = path.join(dir, entry);
    try {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (extensions.includes(path.extname(entry))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const matches = content.match(mojibakePattern);
        if (matches && matches.length > 0) {
          console.log(fullPath, 'matches:', matches.length, [...new Set(matches)]);
        }
      }
    } catch (e) {
      // ignore
    }
  }
}

scanDir('d:/Tutor Tampan/TopsCore');
console.log('Mojibake scan complete.');

