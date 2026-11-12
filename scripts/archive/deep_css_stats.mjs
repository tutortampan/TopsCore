import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

const cssFiles = [
  'css/style.css',
  'css/admin.css',
  'css/dashboard.css',
  'css/test.css',
  'css/result.css',
  'css/auth.css',
  'css/components/avatars.css'
];

console.log('=== CSS FILE BY FILE TYPOGRAPHY METRICS ===\n');

const grandSummary = {
  families: {},
  sizesPx: {},
  sizesRem: {},
  sizesClamp: {},
  weights: {},
  colors: {}
};

for (const rel of cssFiles) {
  const file = path.join(ROOT_DIR, rel);
  if (!fs.existsSync(file)) continue;
  const content = fs.readFileSync(file, 'utf8');

  const families = {};
  const sizes = {};
  const weights = {};

  // Families
  for (const m of content.matchAll(/font-family\s*:\s*([^;!]+)/g)) {
    const v = m[1].trim();
    families[v] = (families[v] || 0) + 1;
    grandSummary.families[v] = (grandSummary.families[v] || 0) + 1;
  }

  // Sizes
  for (const m of content.matchAll(/font-size\s*:\s*([^;!]+)/g)) {
    const v = m[1].trim();
    sizes[v] = (sizes[v] || 0) + 1;
    if (v.includes('px')) grandSummary.sizesPx[v] = (grandSummary.sizesPx[v] || 0) + 1;
    else if (v.includes('rem')) grandSummary.sizesRem[v] = (grandSummary.sizesRem[v] || 0) + 1;
    else if (v.includes('clamp')) grandSummary.sizesClamp[v] = (grandSummary.sizesClamp[v] || 0) + 1;
  }

  // Weights
  for (const m of content.matchAll(/font-weight\s*:\s*([^;!]+)/g)) {
    const v = m[1].trim();
    weights[v] = (weights[v] || 0) + 1;
    grandSummary.weights[v] = (grandSummary.weights[v] || 0) + 1;
  }

  console.log(`FILE: ${rel} (${(fs.statSync(file).size / 1024).toFixed(1)} KB)`);
  console.log(`  Families (${Object.keys(families).length}):`, Object.keys(families));
  console.log(`  Distinct Sizes: ${Object.keys(sizes).length}`);
  console.log(`  Weights:`, Object.entries(weights));
  console.log('');
}

console.log('=== GRAND SYSTEM WEIGHTS ===');
console.log(Object.entries(grandSummary.weights).sort((a,b)=>b[1]-a[1]));

console.log('\n=== TOP 15 SIZES (PX) ===');
console.log(Object.entries(grandSummary.sizesPx).sort((a,b)=>b[1]-a[1]).slice(0, 15));

console.log('\n=== TOP 15 SIZES (REM) ===');
console.log(Object.entries(grandSummary.sizesRem).sort((a,b)=>b[1]-a[1]).slice(0, 15));

