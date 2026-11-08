import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition, desc) {
  if (condition) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    failed++;
  }
}

console.log('================================================================');
console.log('VERIFYING UI TAB INSTITUSI, BADGE AKTIF HIJAU & GRADE-SCORE v167');
console.log('================================================================\n');

// 1. Check curriculum-management.js for Tab labels and green badges
console.log('[1] Checking js/admin/curriculum-management.js...');
const currCode = fs.readFileSync(path.resolve('js/admin/curriculum-management.js'), 'utf8');

assert(currCode.includes('label: inst.name'), 'institutionTabs uses label: inst.name');
assert(!currCode.includes("label: count === 1 ? 'Program' : 'Programs'"), 'Deprecated static Program/Programs label mapping removed');
assert(!currCode.includes('rgba(var(--grade-star-rgb, 0, 192, 0)'), 'No pink grade-star-rgb fallback in curriculum-management badge tags');
assert(currCode.includes('rgba(0, 192, 0, 0.15)'), 'Pure green background (rgba(0, 192, 0, 0.15)) used for batch counts');
assert(currCode.includes('border: 1px solid rgba(0, 192, 0, 0.35)'), 'Pure green border (rgba(0, 192, 0, 0.35)) used for batch counts');

// 2. Check css/style.css
console.log('\n[2] Checking css/style.css...');
const styleCss = fs.readFileSync(path.resolve('css/style.css'), 'utf8');

assert(styleCss.includes('--clr-success: #00c000ff;'), '--clr-success is pure green #00c000ff');
assert(styleCss.includes('--clr-success-rgb: 0, 192, 0;'), '--clr-success-rgb: 0, 192, 0 defined in css/style.css');
assert(!styleCss.includes('.badge-success {\n  background: rgba(var(--grade-star-rgb)'), '.badge-success does not use pink grade-star-rgb in css/style.css');
assert(!styleCss.includes('.btn-success {\n  background: rgba(var(--grade-star-rgb)'), '.btn-success does not use pink grade-star-rgb in css/style.css');

// 3. Check css/admin.css
console.log('\n[3] Checking css/admin.css...');
const adminCss = fs.readFileSync(path.resolve('css/admin.css'), 'utf8');

assert(adminCss.includes('.badge-tag-ongoing {\n  background: rgba(0, 192, 0, 0.15) !important;'), '.badge-tag-ongoing uses pure green background in css/admin.css');
assert(adminCss.includes('color: #00c000ff !important;'), '.badge-tag-ongoing has solid green text color');
assert(adminCss.includes('border: 1px solid rgba(0, 192, 0, 0.35) !important;'), '.badge-tag-ongoing has pure green border in css/admin.css');
assert(!adminCss.includes('.badge-tag-ongoing {\n  background: rgba(var(--grade-star-rgb)'), 'badge-tag-ongoing no longer references pink grade-star-rgb');
assert(!adminCss.includes('.attendance-theme-pill.mode-fit.active'), 'mode-fit.active styling purged from css/admin.css');

// 4. Check js/admin/app.js (Grade & Score Toolbar Cleanup)
console.log('\n[4] Checking js/admin/app.js (Grade & Score Toolbar Cleanup)...');
const appCode = fs.readFileSync(path.resolve('js/admin/app.js'), 'utf8');

assert(!appCode.includes('id="attendance-view-mode-container"'), 'attendance-view-mode-container completely removed');
assert(!appCode.includes('FIT SCREEN'), 'FIT SCREEN button completely removed from Grade & Score toolbar');
assert(!appCode.includes('100% SCROLL'), '100% SCROLL button completely removed from Grade & Score toolbar');
assert(!appCode.includes('id="attendance-pan-controls"'), 'attendance-pan-controls (Pan Left/Right) completely removed');
assert(!appCode.includes('id="matrix-fullwidth-btn"'), 'matrix-fullwidth-btn completely removed from toolbar');
assert(appCode.includes('WRD</span> Word'), 'Legend: WRD Word retained');
assert(appCode.includes('PHR</span> Phrase'), 'Legend: PHR Phrase retained');
assert(appCode.includes('PTS</span> Points'), 'Legend: PTS Points retained');
assert(appCode.includes('SCORE</span> %'), 'Legend: SCORE % retained');
assert(appCode.includes('ᴿ</span> Remedi'), 'Legend: ᴿ Remedi retained');
assert(appCode.includes('★</span> ★ (100%)'), 'Legend: ★ (100%) retained');

// 5. Check sw.js and admin.html Cache Bumping
console.log('\n[5] Checking sw.js & admin.html Cache & Asset Bumping...');
const swCode = fs.readFileSync(path.resolve('sw.js'), 'utf8');
const adminHtml = fs.readFileSync(path.resolve('admin.html'), 'utf8');

assert(swCode.includes("topscore-cache-option-a-v94"), 'Service Worker cache bumped to v94');
assert(adminHtml.includes('css/admin.css?v=20261109_v167'), 'admin.html references admin.css?v=20261109_v167');
assert(adminHtml.includes('js/admin/app.js?v=20261109_v167'), 'admin.html references app.js?v=20261109_v167');

console.log('================================================================');
console.log(`TOTAL RESULT: ${passed} PASSED / ${failed} FAILED`);
console.log('================================================================');

if (failed > 0) {
  process.exit(1);
}

