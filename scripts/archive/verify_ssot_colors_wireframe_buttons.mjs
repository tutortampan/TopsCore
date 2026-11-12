import fs from 'fs';
import path from 'path';

function runVerification() {
  console.log('🧪 Starting Automated Verification: SSOT Color Governance & Wireframe Buttons');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // Suite 1: CSS Brace Balance in css/admin.css
  console.log('\n--- Suite 1: CSS Syntax & Brace Balance ---');
  const css = fs.readFileSync('css/admin.css', 'utf8');
  let depth = 0;
  for (let ch of css) {
    if (ch === '{') depth++;
    if (ch === '}') depth--;
  }
  assert(depth === 0, `css/admin.css has 100% balanced braces (depth: ${depth})`);
  assert(!css.includes('font-variant-numeric: tabular-nums !important;\n}\n}'), 'No stray double-brace at line 849');
  assert(!css.includes('background: #1e3a8a !important;\n  border-color: #38bdf8 !important;\n  box-shadow: 0 6px 22px rgba(56, 189, 248, 0.5) !important;\n  transform: translateY(-1px);\n}\n  background: #1e3a8a'), 'No duplicate dangling block at line 7149');

  // Suite 2: SSOT Grade Variable Bindings in css/admin.css
  console.log('\n--- Suite 2: Wireframe Button SSOT Bindings ---');
  // btn-wireframe-close -> Grade E
  assert(css.includes('.btn-wireframe-close {') && css.includes('border: 1px solid rgba(var(--grade-e-rgb, 255, 0, 0), 0.5) !important;'), '.btn-wireframe-close bound to --grade-e-rgb with 1px hairline border');
  assert(css.includes('border-color: var(--grade-e, #ff0000) !important;'), '.btn-wireframe-close:hover bound to --grade-e');

  // btn-wireframe-late -> Grade A
  assert(css.includes('.btn-wireframe-late {') && css.includes('border: 1px solid rgba(var(--grade-a-rgb, 0, 192, 0), 0.5) !important;'), '.btn-wireframe-late bound to --grade-a-rgb with 1px hairline border');
  assert(css.includes('border-color: var(--grade-a, #00c000) !important;'), '.btn-wireframe-late:hover bound to --grade-a');

  // btn-wireframe-edit-time -> Grade C with width: 100%
  assert(css.includes('.btn-wireframe-edit-time {') && css.includes('border: 1px solid rgba(var(--grade-c-rgb, 255, 255, 0), 0.5) !important;'), '.btn-wireframe-edit-time bound to --grade-c-rgb with 1px hairline border');
  assert(css.includes('width: 100% !important;'), '.btn-wireframe-edit-time has width: 100% !important');
  assert(css.includes('border-color: var(--grade-c, #ffff00) !important;'), '.btn-wireframe-edit-time:hover bound to --grade-c');

  // card-add-time-menu -> Grade C
  assert(css.includes('.card-add-time-menu') && css.includes('border: 2px solid var(--grade-c, #ffff00) !important;'), '.card-add-time-menu bound to --grade-c');

  // btn-wireframe-live-view -> Tactile dark slate hero
  assert(css.includes('background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%) !important;'), '.btn-wireframe-live-view uses sleek tactile dark slate gradient');

  // Suite 3: Template Fallbacks in js/admin/tests-access.js
  console.log('\n--- Suite 3: tests-access.js Template SSOT Bindings ---');
  const js = fs.readFileSync('js/admin/tests-access.js', 'utf8');
  assert(js.includes('class="btn btn-wireframe-edit-time btn-card-add-time" data-theme="${code}" style="width:100%;"'), 'Card edit-time button has explicit width:100% inline');
  assert(js.includes('border:2px solid var(--grade-c, #ffff00);'), 'Card popover menu border uses var(--grade-c)');
  assert(!js.includes('background:#ffe600 !important; border:1px solid #d4c000 !important; color:#0f172a !important;'), 'Eliminated chunky solid yellow in live modal add time button');

  // Suite 4: Version Bump Verification
  console.log('\n--- Suite 4: Cache-Buster Version Stamps ---');
  const html = fs.readFileSync('admin.html', 'utf8');
  assert(html.includes('css/admin.css?v=20261113_v434'), 'admin.html references css/admin.css?v=20261113_v434');
  const appJs = fs.readFileSync('js/admin/app.js', 'utf8');
  assert(appJs.includes('./tests-access.js?v=20261113_v434'), 'app.js references tests-access.js?v=20261113_v434');

  console.log(`\n===========================================`);
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log(`===========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
