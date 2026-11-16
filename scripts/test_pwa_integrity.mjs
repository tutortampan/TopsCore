// scripts/test_pwa_integrity.mjs
// Validates PWA manifest, meta tags, service worker, and icon assets

import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();

console.log('🧪 Validating PWA Integrity for TopsCore LMS...\n');

// 1. Validate manifest.json
const manifestPath = path.join(ROOT_DIR, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error('❌ FAIL: manifest.json does not exist');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
console.log('✔ manifest.json parsed successfully:');
console.log(`  - name: "${manifest.name}"`);
console.log(`  - short_name: "${manifest.short_name}"`);
console.log(`  - display: "${manifest.display}"`);
console.log(`  - start_url: "${manifest.start_url}"`);
console.log(`  - theme_color: "${manifest.theme_color}"`);
console.log(`  - background_color: "${manifest.background_color}"`);
console.log(`  - icons count: ${manifest.icons.length}`);

// Check manifest icons exist
for (const icon of manifest.icons) {
  const iconPath = path.join(ROOT_DIR, icon.src);
  if (!fs.existsSync(iconPath)) {
    console.error(`❌ FAIL: Manifest icon not found on disk: ${icon.src}`);
    process.exit(1);
  }
  const stat = fs.statSync(iconPath);
  console.log(`  ✔ Icon OK: ${icon.src} (${icon.sizes}, ${icon.purpose || 'any'}, ${Math.round(stat.size / 1024 * 10) / 10} KB)`);
}

// 2. Validate HTML files have PWA tags
const htmlFiles = ['index.html', 'dashboard.html', 'test.html', 'result.html'];
for (const htmlFile of htmlFiles) {
  const content = fs.readFileSync(path.join(ROOT_DIR, htmlFile), 'utf8');
  if (!content.includes('rel="manifest"') && !content.includes("rel='manifest'")) {
    console.error(`❌ FAIL: ${htmlFile} missing manifest link tag`);
    process.exit(1);
  }
  if (!content.includes('name="theme-color"') && !content.includes("name='theme-color'")) {
    console.error(`❌ FAIL: ${htmlFile} missing theme-color meta tag`);
    process.exit(1);
  }
  if (!content.includes('apple-touch-icon')) {
    console.error(`❌ FAIL: ${htmlFile} missing apple-touch-icon link tag`);
    process.exit(1);
  }
  if (!content.includes('js/pwa.js')) {
    console.error(`❌ FAIL: ${htmlFile} missing pwa.js script tag`);
    process.exit(1);
  }
  console.log(`✔ HTML OK: ${htmlFile} has complete PWA manifest, theme-color, and pwa.js`);
}

// 3. Validate Service Worker
const swPath = path.join(ROOT_DIR, 'sw.js');
const swContent = fs.readFileSync(swPath, 'utf8');
if (!swContent.includes('manifest.json') || !swContent.includes('icons/icon-192.png')) {
  console.error('❌ FAIL: sw.js missing manifest or icons in cache list');
  process.exit(1);
}
console.log('✔ sw.js properly references manifest and icons in cache.');

console.log('\n🎉 ALL PWA INTEGRITY CHECKS PASSED (100%)!');
