import { execSync } from 'child_process';

console.log('================================================================');
console.log('       TOPSCORE COMPLETE E2E SYSTEM DIAGNOSTIC & AUDIT          ');
console.log('================================================================\n');

const suites = [
  { name: '1. JavaScript Syntax Validation (45 files)', cmd: 'node scripts/check_all_js_syntax.cjs' },
  { name: '2. Offline Service Worker Asset Manifest (27 assets)', cmd: 'node scripts/generate_sw_manifest.mjs' },
  { name: '3. Student Dashboard Exam-Only & Multi-Tier Ranking Parity', cmd: 'node scripts/test_student_dashboard_exam_parity.mjs' },
  { name: '4. Acoustic Homophone & Spelling Tolerance Engine', cmd: 'node scripts/test_homophones_spoken_mode.mjs' },
  { name: '5. Automated Headless Browser Console Health Check (5 pages)', cmd: 'node scripts/e2e_console_health_check.mjs' },
  { name: '6. Test Page Blueprint & Zero-Overflow Layout Verification', cmd: 'node scripts/verify_test_full_spec.mjs' },
  { name: '7. Result Page Blueprint & Zero-Overflow Layout Verification (Dual View)', cmd: 'node scripts/verify_result_full_spec.mjs' },
];

let allPassed = true;
const results = [];

for (const suite of suites) {
  console.log(`\n▶ RUNNING: ${suite.name}...`);
  try {
    const output = execSync(suite.cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    console.log(output.trim());
    console.log(`✅ [PASS] ${suite.name}`);
    results.push({ name: suite.name, status: 'PASS' });
  } catch (err) {
    console.error(`❌ [FAIL] ${suite.name}`);
    if (err.stdout) console.log(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
    results.push({ name: suite.name, status: 'FAIL', error: err.message });
    allPassed = false;
  }
}

console.log('\n================================================================');
console.log('                   E2E AUDIT FINAL SUMMARY                      ');
console.log('================================================================');
results.forEach(r => {
  const icon = r.status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${r.status}: ${r.name}`);
});

if (allPassed) {
  console.log('\n🎉 ALL 7 E2E TEST SUITES PASSED WITH 0 ERRORS ACROSS THE SYSTEM!');
  process.exit(0);
} else {
  console.error('\n⚠️ SOME TESTS FAILED. INVESTIGATION REQUIRED.');
  process.exit(1);
}

