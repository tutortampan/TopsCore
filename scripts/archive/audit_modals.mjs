import fs from 'fs';

const files = ['test.html', 'dashboard.html', 'admin.html', 'result.html', 'index.html'];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  console.log(`\n=================== ${file} ===================`);
  
  lines.forEach((line, idx) => {
    if (/(modal|overlay|popup|warning|alert|hazard|confirm|danger|cheat)/i.test(line) && /<(div|dialog|section|aside)/i.test(line)) {
      console.log(`Line ${idx + 1}: ${line.trim().substring(0, 120)}`);
    }
  });
}
