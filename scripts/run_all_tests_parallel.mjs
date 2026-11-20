/**
 * run_all_tests_parallel.mjs
 *
 * High-Performance Parallel Test Runner for TopsCore LMS
 * - Phase 0: Pre-Build & In-Process Syntax Validation (Sequential, ~300ms)
 * - Phase 1: Parallel Test Pool with Concurrency Throttling & Output Buffering
 *   Long-running browser tests are prioritized first so they overlap completely
 *   with fast AST/logic assertions.
 */

import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const PRE_BUILD_TASKS = [
  { name: 'Build Admin CSS', script: 'scripts/build_admin_css.mjs' },
  { name: 'Generate SW Manifest', script: 'scripts/generate_sw_manifest.mjs' },
  { name: 'In-Process Syntax Validation', script: 'scripts/check_all_js_syntax.mjs', args: ['--no-warnings', '--experimental-vm-modules'] }
];

const PARALLEL_SUITES = [
  // Heavy/Browser Playwright tests prioritized first to maximize parallel overlap
  'scripts/test_unified_test_room_ratios.mjs',
  'scripts/test_admin_headers_footers_standardization.mjs',
  'scripts/test_test_modes_runtime_guard.mjs',
  // Fast unit, DOM & AST suites
  'scripts/test_tutor_role_rbac.mjs',
  'scripts/test_vocab_vault_and_edit_mode.mjs',
  'scripts/test_student_dashboard_exam_parity.mjs',
  'scripts/test_homophones_spoken_mode.mjs',
  'scripts/test_prerequisite_deficit_guard.mjs',
  'scripts/test_vocab_dashboard_blueprint.mjs',
  'scripts/test_bottom_banner_universal.mjs',
  'scripts/test_smart_distractor_engine.mjs',
  'scripts/test_streamline_and_analytics_overhaul.mjs',
  'scripts/test_viewport_lock_and_table_normalization.mjs',
  'scripts/test_lower_panel_and_dynamic_columns.mjs',
  'scripts/test_class_hub_super_headers_and_continuous_dividers.mjs',
  'scripts/test_class_analytics_flush_layout_and_zero_gap.mjs',
  'scripts/test_universal_table_standardization.mjs',
  'scripts/test_unified_tutor_room_typography_and_loading.mjs',
  'scripts/test_universal_color_token_ssot.mjs',
  'scripts/verify_audit_log_datagrid.mjs',
  'scripts/verify_dead_db_calls_elimination.mjs',
  'scripts/verify_vocab_vault_datagrid.mjs',
  'scripts/verify_theme_manager_datagrid.mjs',
  'scripts/verify_live_sessions_analytics_and_eligibility.cjs',
  'scripts/test_student_title_exclusivity.mjs',
  '.agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs'
];

const CONCURRENCY = Math.max(4, Math.min(os.cpus().length, 8));

function runProcess(scriptPath, customArgs = []) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const args = [...customArgs, scriptPath];
    const proc = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: { ...process.env, CI: 'true' },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      resolve({
        script: scriptPath,
        code,
        duration: Date.now() - t0,
        stdout,
        stderr
      });
    });

    proc.on('error', (err) => {
      resolve({
        script: scriptPath,
        code: 1,
        duration: Date.now() - t0,
        stdout,
        stderr: err.message
      });
    });
  });
}

async function main() {
  console.log(`\n🚀 TopsCore Global Parallel Test Engine (Concurrency Limit: ${CONCURRENCY})`);
  const globalStart = Date.now();

  // Phase 0: Pre-Build & In-Process Syntax
  console.log('\n--- Phase 0: Pre-Build & AST Syntax Validation ---');
  for (const task of PRE_BUILD_TASKS) {
    const res = await runProcess(task.script, task.args || []);
    if (res.code !== 0) {
      console.error(`❌ [PRE-BUILD FAILED] ${task.name} (${res.duration}ms):`);
      console.error(res.stderr || res.stdout);
      process.exit(1);
    }
    console.log(`  ✔ [PASS] ${task.name} (${res.duration}ms)`);
  }

  // Phase 1: Parallel Test Pool
  console.log(`\n--- Phase 1: Parallel Test Pool (${PARALLEL_SUITES.length} Suites) ---`);
  const queue = [...PARALLEL_SUITES];
  const results = [];
  let activeWorkers = 0;

  await new Promise((resolve) => {
    function next() {
      if (queue.length === 0 && activeWorkers === 0) {
        return resolve();
      }

      while (activeWorkers < CONCURRENCY && queue.length > 0) {
        const script = queue.shift();
        activeWorkers++;

        runProcess(script).then((res) => {
          activeWorkers--;
          results.push(res);

          const scriptName = path.basename(res.script);
          if (res.code === 0) {
            console.log(`  ✔ [PASS] ${scriptName} (${res.duration}ms)`);
          } else {
            console.error(`  ❌ [FAIL] ${scriptName} (${res.duration}ms)`);
            console.error(res.stderr || res.stdout);
          }

          next();
        });
      }
    }

    next();
  });

  const totalTime = ((Date.now() - globalStart) / 1000).toFixed(2);
  const passed = results.filter(r => r.code === 0).length;
  const failed = results.filter(r => r.code !== 0).length;

  console.log('\n======================================================');
  console.log(`📊 Test Summary: ${passed} Passed | ${failed} Failed | Duration: ${totalTime}s`);
  console.log('======================================================\n');

  if (failed > 0) {
    console.error(`💥 ${failed} test suite(s) failed.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${PARALLEL_SUITES.length + PRE_BUILD_TASKS.length} suites passed cleanly in ${totalTime}s!`);
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
