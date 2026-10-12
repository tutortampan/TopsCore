const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// 2. Add horizontal line above the bottom metadata (if not already added)
const hrHtml = `\n      <hr style="width: 100%; border: 0; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 0;">\n`;
if (!html.includes('<!-- Keterangan Ringkas di Bawah: Institusi - Program - Batch - Level -->\n      <hr')) {
  html = html.replace(
    /<!-- 3\. Keterangan Ringkas di Bawah: Institusi - Program - Batch - Level -->/,
    `<!-- 3. Keterangan Ringkas di Bawah: Institusi - Program - Batch - Level -->${hrHtml}`
  );
}

fs.writeFileSync('dashboard.html', html);
console.log('Added second divider');
