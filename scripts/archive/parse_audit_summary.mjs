import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'audit_typography_results.json'), 'utf8'));

console.log('=== LIVE PAGES TYPOGRAPHY SAMPLES ===\n');

for (const p of data.liveAnalysis) {
  console.log(`\n======================================================`);
  console.log(`SCREEN: ${p.screen} (${p.samples.length} sampled elements)`);
  console.log(`======================================================`);
  for (const s of p.samples) {
    console.log(`- Element: <${s.selector}> "${s.sampleText.substring(0, 30)}"`);
    console.log(`  Font: ${s.primaryFont} | Size: ${s.fontSizePx}px (${s.fontSizeRaw}) | Weight: ${s.fontWeight} | LineHeight: ${s.lineHeight}`);
    console.log(`  Color: ${s.hex} | Bg: ${s.bgHex} | Contrast: ${s.contrast} | WCAG: ${s.wcag}`);
  }
}

