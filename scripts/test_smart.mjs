/**
 * test_smart.mjs
 *
 * Git-Aware Smart Test Runner for TopsCore LMS
 * Analyzes working tree diffs and executes only relevant test suites in < 1.5 seconds.
 */

import { execSync, spawnSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);

// Direct flag triggers
if (args.includes('--all') || args.includes('-a')) {
  console.log('🔄 Explicit --all flag detected: Executing Full Parallel Regression...');
  const res = spawnSync(process.execPath, ['scripts/run_all_tests_parallel.mjs'], { stdio: 'inherit' });
  process.exit(res.status ?? 0);
}

if (args.includes('--fast') || args.includes('-f')) {
  console.log('⚡ Explicit --fast flag detected: Executing Instant Preflight...');
  const res1 = spawnSync(process.execPath, ['--no-warnings', '--experimental-vm-modules', 'scripts/check_all_js_syntax.mjs'], { stdio: 'inherit' });
  if (res1.status !== 0) process.exit(res1.status ?? 1);
  const res2 = spawnSync(process.execPath, ['scripts/build_admin_css.mjs'], { stdio: 'inherit' });
  process.exit(res2.status ?? 0);
}

// 1. Inspect Git Working Tree
let statusOutput = '';
try {
  statusOutput = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
} catch (err) {
  console.warn('⚠️ Unable to run git status. Falling back to Full Parallel Suite.');
  const res = spawnSync(process.execPath, ['scripts/run_all_tests_parallel.mjs'], { stdio: 'inherit' });
  process.exit(res.status ?? 0);
}

const changedFiles = statusOutput
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean)
  .map(line => {
    // Format is 'XY path' or '?? path'
    const parts = line.slice(3).trim();
    return parts.replace(/^"|"$/g, '');
  })
  .filter(f => fs.existsSync(f));

console.log(`\n🧠 TopsCore Smart Test Runner`);
const t0 = Date.now();

// Scenario A: Clean Tree -> Fast Smoke Preflight
if (changedFiles.length === 0) {
  console.log('✔ Clean working tree detected. Running Fast Preflight (Syntax + Build + Spatial)...');
  const suites = [
    { name: 'Syntax AST Validation', script: 'scripts/check_all_js_syntax.mjs', args: ['--no-warnings', '--experimental-vm-modules'] },
    { name: 'Admin CSS Compilation', script: 'scripts/build_admin_css.mjs' },
    { name: 'Spatial Invariants Check', script: '.agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs' }
  ];

  for (const s of suites) {
    const res = spawnSync(process.execPath, [...(s.args || []), s.script], { stdio: 'inherit' });
    if (res.status !== 0) process.exit(res.status ?? 1);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`\n🎉 Fast Preflight passed in ${elapsed}s! All clean.`);
  process.exit(0);
}

console.log(`📂 Detected ${changedFiles.length} modified/staged file(s):`);
changedFiles.slice(0, 8).forEach(f => console.log(`   - ${f}`));
if (changedFiles.length > 8) console.log(`   ...and ${changedFiles.length - 8} more`);

// Scenario B: Routing based on impacted domains
const hasCoreChange = changedFiles.some(f =>
  f === 'package.json' ||
  f === 'js/api.js' ||
  f === 'js/grading.js' ||
  f === 'admin.html' ||
  f === 'dashboard.html'
);

const sourceFiles = changedFiles.filter(f => !f.startsWith('scripts/'));
const hasCssChange = changedFiles.some(f => f.startsWith('css/') || f.endsWith('.css'));
const hasRosterChange = sourceFiles.some(f => f.includes('student') || f.includes('roster'));
const hasVocabChange = sourceFiles.some(f => f.includes('vocab'));
const hasTestEngineChange = sourceFiles.some(f => f.includes('test.js') || f.includes('tests-') || f.includes('exam') || f.includes('attempt'));

if (hasCoreChange) {
  console.log('\n⚡ Core architecture modification detected. Escalating to Full Parallel Regression...');
  const res = spawnSync(process.execPath, ['scripts/run_all_tests_parallel.mjs'], { stdio: 'inherit' });
  process.exit(res.status ?? 0);
}

// Targeted Domain Execution
const suitesToRun = [];

// Always run in-process syntax check if JS files were touched
const hasJsTouch = changedFiles.some(f => f.endsWith('.js') || f.endsWith('.mjs'));
if (hasJsTouch) {
  suitesToRun.push({ name: 'Syntax AST', script: 'scripts/check_all_js_syntax.mjs', args: ['--no-warnings', '--experimental-vm-modules'] });
}

if (hasCssChange) {
  suitesToRun.push({ name: 'Build CSS', script: 'scripts/build_admin_css.mjs' });
  suitesToRun.push({ name: 'Spatial Invariants', script: '.agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs' });
}

if (hasRosterChange) {
  suitesToRun.push({ name: 'Universal Table Standardization', script: 'scripts/test_universal_table_standardization.mjs' });
  suitesToRun.push({ name: 'Student Title Exclusivity', script: 'scripts/test_student_title_exclusivity.mjs' });
}

if (hasVocabChange) {
  suitesToRun.push({ name: 'Vocab Vault & Edit Mode', script: 'scripts/test_vocab_vault_and_edit_mode.mjs' });
  suitesToRun.push({ name: 'Vocab DataGrid Integrity', script: 'scripts/verify_vocab_vault_datagrid.mjs' });
}

if (hasTestEngineChange) {
  suitesToRun.push({ name: 'Student Dashboard Exam Parity', script: 'scripts/test_student_dashboard_exam_parity.mjs' });
  suitesToRun.push({ name: 'Prerequisite Guard', script: 'scripts/test_prerequisite_deficit_guard.mjs' });
}

// Include targeted test script if it is a fast unit/AST/invariant suite (exclude runners and heavy browser E2E)
const BROWSER_E2E_SCRIPTS = new Set([
  'scripts/test_smart.mjs',
  'scripts/run_all_tests_parallel.mjs',
  'scripts/test_live_ui_flows_e2e.mjs',
  'scripts/test_student_registration_institution_hierarchy.mjs',
  'scripts/test_unified_test_room_ratios.mjs',
  'scripts/test_admin_headers_footers_standardization.mjs',
  'scripts/verify_roster_flex_layout.mjs'
]);

const touchedTestScripts = changedFiles.filter(f =>
  f.startsWith('scripts/test_') &&
  f.endsWith('.mjs') &&
  !BROWSER_E2E_SCRIPTS.has(f)
);
for (const script of touchedTestScripts) {
  suitesToRun.push({ name: path.basename(script, '.mjs'), script });
}

// Fallback if no specific rule matched: Run preflight + spatial
if (suitesToRun.length === 0) {
  suitesToRun.push({ name: 'Build CSS', script: 'scripts/build_admin_css.mjs' });
  suitesToRun.push({ name: 'Syntax AST', script: 'scripts/check_all_js_syntax.mjs', args: ['--no-warnings', '--experimental-vm-modules'] });
  suitesToRun.push({ name: 'Spatial Invariants', script: '.agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs' });
}

// Deduplicate suites
const uniqueSuites = [];
const seenScripts = new Set();
for (const s of suitesToRun) {
  if (!seenScripts.has(s.script)) {
    seenScripts.add(s.script);
    uniqueSuites.push(s);
  }
}

function runProcessAsync(s) {
  return new Promise((resolve) => {
    const tStart = Date.now();
    console.log(`  ⏳ [START] ${s.name}...`);
    const proc = spawn(process.execPath, [...(s.args || []), s.script], {
      cwd: process.cwd(),
      env: { ...process.env, CI: 'true' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let out = '';
    let err = '';
    proc.stdout.on('data', (d) => { out += d.toString(); });
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('close', (code) => {
      console.log(`  🏁 [DONE] ${s.name} (${((Date.now() - tStart) / 1000).toFixed(2)}s)`);
      resolve({ ...s, code, duration: Date.now() - tStart, out, err });
    });
    proc.on('error', (e) => {
      console.log(`  ❌ [ERROR] ${s.name}: ${e.message}`);
      resolve({ ...s, code: 1, duration: Date.now() - tStart, out, err: e.message });
    });
  });
}

async function executeTargetedSuites() {
  const preSuites = uniqueSuites.filter(s => s.script.includes('syntax') || s.script.includes('build_admin_css'));
  const testSuites = uniqueSuites.filter(s => !preSuites.includes(s));

  for (const s of preSuites) {
    console.log(`\n▶ [PRE] ${s.name} (${s.script})...`);
    const res = spawnSync(process.execPath, [...(s.args || []), s.script], { stdio: 'inherit' });
    if (res.status !== 0) process.exit(res.status ?? 1);
  }

  if (testSuites.length > 0) {
    console.log(`\n⚡ Launching ${testSuites.length} targeted test suites concurrently (Parallel Pool)...`);
    const results = await Promise.all(testSuites.map(runProcessAsync));

    let hasFail = false;
    for (const r of results) {
      if (r.code === 0) {
        console.log(`  ✔ [PASS] ${r.name} (${(r.duration / 1000).toFixed(2)}s)`);
      } else {
        hasFail = true;
        console.error(`\n❌ [FAIL] ${r.name} (${r.script}):`);
        if (r.out) console.log(r.out);
        if (r.err) console.error(r.err);
      }
    }
    if (hasFail) process.exit(1);
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`\n🎉 All targeted suites passed cleanly in ${elapsed}s! Ultra-fast feedback loop complete.`);
  process.exit(0);
}

await executeTargetedSuites();
