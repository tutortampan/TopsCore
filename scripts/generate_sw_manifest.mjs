// scripts/generate_sw_manifest.mjs
// Scans the repository and validates / reports assets in sw.js

import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();
const SW_PATH = path.join(ROOT_DIR, 'sw.js');

if (!fs.existsSync(SW_PATH)) {
  console.error('sw.js not found at', SW_PATH);
  process.exit(1);
}

const swContent = fs.readFileSync(SW_PATH, 'utf-8');
const match = swContent.match(/const ASSETS_TO_CACHE = (\[[\s\S]*?\]);/);

if (!match) {
  console.error('Could not find ASSETS_TO_CACHE array in sw.js');
  process.exit(1);
}

const assets = eval(match[1]);
console.log(`Checking ${assets.length} assets declared in sw.js...`);

let missingCount = 0;
for (const rawAsset of assets) {
  const cleanPath = rawAsset.split('?')[0].replace(/^\.\//, '');
  if (!cleanPath) continue; // root './'

  const fullPath = path.join(ROOT_DIR, cleanPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ MISSING ASSET: ${rawAsset} -> ${cleanPath}`);
    missingCount++;
  } else {
    const stats = fs.statSync(fullPath);
    console.log(`✅ OK: ${cleanPath} (${Math.round(stats.size / 1024 * 10) / 10} KB)`);
  }
}

if (missingCount > 0) {
  console.error(`\nValidation FAILED: ${missingCount} assets listed in sw.js do not exist on disk.`);
  process.exit(1);
} else {
  console.log(`\nAll ${assets.length} cache manifest assets exist on disk!`);
}

