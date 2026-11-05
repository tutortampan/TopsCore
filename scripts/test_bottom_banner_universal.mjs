import fs from 'fs';
import path from 'path';

console.log('=== TEST: UNIVERSAL BOTTOM BANNER "TopsCore by Mr. Top" ===\n');

const htmlPages = [
  'index.html',
  'admin.html',
  'dashboard.html',
  'test.html',
  'result.html'
];

let allPassed = true;

// 1. Audit HTML pages
htmlPages.forEach(page => {
  const content = fs.readFileSync(page, 'utf8');
  
  // Check that old string is completely eradicated
  const hasOldText = /Created by Mr\. Top|&copy;\s*2026|©\s*2026/i.test(content);
  if (hasOldText) {
    console.error(`❌ FAIL: ${page} still contains old banner text!`);
    allPassed = false;
  } else {
    console.log(`✅ PASS: ${page} does not contain old banner text.`);
  }

  // Check that new string is present
  const hasBrand = /<span\s+class="banner-brand">TopsCore<\/span>/i.test(content);
  const hasAuthor = /<span\s+class="banner-author">by Mr\. Top<\/span>/i.test(content);
  const hasContainer = /(id="bottom-ad-banner"|class="[^"]*topscore-locked-banner[^"]*")/i.test(content);

  if (hasBrand && hasAuthor && hasContainer) {
    console.log(`✅ PASS: ${page} contains new banner: "TopsCore by Mr. Top"`);
  } else {
    console.error(`❌ FAIL: ${page} missing new banner elements (brand: ${hasBrand}, author: ${hasAuthor}, container: ${hasContainer})`);
    allPassed = false;
  }
});

// 2. Audit CSS files for larger font size and bold weights
const cssFiles = [
  'css/style.css',
  'css/admin.css',
  'css/dashboard.css',
  'css/test.css',
  'css/result.css'
];

cssFiles.forEach(cssFile => {
  const content = fs.readFileSync(cssFile, 'utf8');
  const hasBannerBrandFont = /\.banner-brand[\s\S]*?font-weight:\s*900/i.test(content);
  const hasBannerAuthorFont = /\.banner-author[\s\S]*?font-weight:\s*800/i.test(content);
  const hasBannerSize = /clamp\s*\(\s*1(\.05)?rem/i.test(content);

  if (hasBannerBrandFont && hasBannerAuthorFont && hasBannerSize) {
    console.log(`✅ PASS: ${cssFile} contains prominent bold & enlarged banner styling.`);
  } else {
    console.error(`❌ FAIL: ${cssFile} missing bold/enlarged styling (brandFont: ${hasBannerBrandFont}, authorFont: ${hasBannerAuthorFont}, size: ${hasBannerSize})`);
    allPassed = false;
  }
});

if (allPassed) {
  console.log('\n🎉 ALL UNIVERSAL BOTTOM BANNER TESTS PASSED 100%!');
  process.exit(0);
} else {
  console.error('\n❌ SOME BANNER TESTS FAILED!');
  process.exit(1);
}
