import fs from 'fs';

const files = ['test.html', 'dashboard.html', 'result.html', 'admin.html', 'index.html'];

console.log('--- SCANNING ALL MODALS & POPUPS ---');

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  console.log(`\n=================== ${file} ===================`);

  lines.forEach((line, idx) => {
    if (/(modal-backdrop|modal-box|popup|overlay|\brole=["'](dialog|alertdialog)["'])/i.test(line) && /<div|<section|<dialog/i.test(line)) {
      const id = (line.match(/id=["']([^"']+)["']/) || [])[1] || 'no-id';
      const cls = (line.match(/class=["']([^"']+)["']/) || [])[1] || 'no-class';
      console.log(`L${idx + 1}: #${id} | .${cls}`);
    }
  });
}
