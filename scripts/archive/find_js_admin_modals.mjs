import fs from 'fs';

const files = fs.readdirSync('js/admin');
for (const file of files) {
  if (file.endsWith('.js')) {
    const content = fs.readFileSync(`js/admin/${file}`, 'utf8');
    if (content.includes('modal-header') || content.includes('modal-footer')) {
      console.log(`js/admin/${file} uses modal-header or modal-footer:`);
      const lines = content.split('\n');
      lines.forEach((l, i) => {
        if (l.includes('modal-header') || l.includes('modal-footer')) {
          console.log(`  L${i+1}: ${l.trim().slice(0, 100)}`);
        }
      });
    }
  }
}
