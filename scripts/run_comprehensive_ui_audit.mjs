/**
 * run_comprehensive_ui_audit.mjs
 *
 * Master Comprehensive UI, Typography, Color & Spatial Invariant Audit Runner
 * Validates the entire visual ecosystem of TopsCore LMS in < 2.5 seconds:
 *  1. Fast AST Syntax & CSS Build Preflight
 *  2. Spatial Invariants (100vh lock, 10px gap, 10px card padding, 40px sub-panel, 60px title area)
 *  3. 11 Pillars of Universal Table Standardization
 *  4. Single-Source Color Governance & Contrast SSOT
 *  5. Dual-Scale Typography & Centered Loading SSOT
 */

import { spawnSync } from 'node:child_process';

console.log('🚀 [CHECK-ALL] Initiating Master Comprehensive UI & System Invariant Audit...\n');
const startTime = Date.now();

const suites = [
  {
    name: '1. Fast AST Syntax, CSS Minifier & Repetitive Safeguards',
    script: 'scripts/test_smart.mjs',
    args: ['--fast']
  },
  {
    name: '2. Spatial Invariants, 100vh Lock, 10px Gaps & Sub Panel 40px',
    script: '.agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs',
    args: []
  },
  {
    name: '3. Universal Table Standardization (11 Pillars)',
    script: 'scripts/test_universal_table_standardization.mjs',
    args: []
  },
  {
    name: '4. Universal Color Token SSOT & Contrast Governance',
    script: 'scripts/test_universal_color_token_ssot.mjs',
    args: []
  },
  {
    name: '5. Typography Scale (Inter SSOT) & Centered Loading',
    script: 'scripts/test_unified_tutor_room_typography_and_loading.mjs',
    args: []
  }
];

let allPassed = true;

for (const suite of suites) {
  console.log(`▶ Executing: ${suite.name}...`);
  const res = spawnSync(process.execPath, [suite.script, ...suite.args], { stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`\n❌ FAILED: ${suite.name} exited with status ${res.status}`);
    allPassed = false;
    process.exit(res.status ?? 1);
  }
  console.log('');
}

const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);

if (allPassed) {
  console.log(`\n============================================================`);
  console.log(`🎉 [CHECK-ALL SUCCESS] 100% INVARIANTS PASSED AUDIT IN ${elapsedSec}s!`);
  console.log(`   - Color Tokens & Contrast: VERIFIED`);
  console.log(`   - Tables & Datagrids: VERIFIED`);
  console.log(`   - Cards, Padding & 10px Gaps: VERIFIED`);
  console.log(`   - Dual-Scale Typography (Inter SSOT): VERIFIED`);
  console.log(`   - 100vh Lock & 40px Sub Panel: VERIFIED`);
  console.log(`============================================================\n`);
  process.exit(0);
}
