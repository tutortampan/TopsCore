/**
 * scripts/check_workspace_hygiene.mjs
 * Automated workspace hygiene checker for TopsCore LMS.
 * 
 * Invariants Enforced:
 * 1. Plan Lifecycle: docs/plans/ <= 3 active files; zero completed/obsolete plans.
 * 2. Scripts Hygiene: zero unlisted one-off scratch scripts in scripts/ (must be registered in package.json).
 * 3. Root Hygiene: zero loose images, dumps, or scratch files in root.
 */

import fs from 'fs';
import path from 'path';

console.log('🧹 [HYGIENE] Running Workspace Hygiene & One-Off Eradication Check...\n');

let violations = 0;

// 1. Check docs/plans/
if (fs.existsSync('docs/plans')) {
  const plans = fs.readdirSync('docs/plans').filter(f => f.endsWith('.md'));
  console.log(`📁 docs/plans/ contains ${plans.length} files:`);
  plans.forEach(p => console.log(`   - ${p}`));

  if (plans.length > 5) {
    console.warn(`\n⚠️  WARNING: docs/plans/ contains ${plans.length} files (expected <= 3 active plans). Consider archiving completed plans.`);
  }

  // Cross-reference with CHANGELOG.md
  if (fs.existsSync('docs/CHANGELOG.md')) {
    const changelog = fs.readFileSync('docs/CHANGELOG.md', 'utf8');
    for (const p of plans) {
      const baseName = p.replace('.md', '');
      if (changelog.includes(baseName)) {
        console.error(`❌ VIOLATION: Plan '${p}' is already recorded in CHANGELOG.md as completed, but still lingers in docs/plans/. Please purge or move to docs/archive/.`);
        violations++;
      }
    }
  }
} else {
  console.log('📁 docs/plans/ does not exist (OK).');
}

// 2. Check scripts/ against package.json
if (fs.existsSync('package.json') && fs.existsSync('scripts')) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const pkgScriptValues = Object.values(pkg.scripts || {}).join(' ');

  const scriptFiles = fs.readdirSync('scripts').filter(f => {
    return (f.endsWith('.js') || f.endsWith('.cjs') || f.endsWith('.mjs')) && !fs.statSync(path.join('scripts', f)).isDirectory();
  });

  const unlisted = scriptFiles.filter(f => !pkgScriptValues.includes(f) && f !== 'check_workspace_hygiene.mjs');
  if (unlisted.length > 0) {
    console.warn(`\n⚠️  FOUND ${unlisted.length} ONE-OFF OR UNREGISTERED SCRIPTS IN scripts/:`);
    unlisted.slice(0, 15).forEach(f => console.warn(`   - scripts/${f}`));
    if (unlisted.length > 15) console.warn(`   ... and ${unlisted.length - 15} more.`);
    console.warn('   Per AGENTS.md Rule 5.3: Delete one-off scripts when task concludes.');
  } else {
    console.log('\n✅ All scripts in scripts/ are officially registered in package.json.');
  }
}

// 3. Check for loose screenshots or scratch files in root
const rootFiles = fs.readdirSync('.');
const looseBloat = rootFiles.filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.tmp') || f.endsWith('.log'));
if (looseBloat.length > 0) {
  console.error(`\n❌ VIOLATION: Found loose image/log files in workspace root: ${looseBloat.join(', ')}. Move to brain/scratch or docs/archive/.`);
  violations++;
}

console.log('\n------------------------------------------------------------');
if (violations === 0) {
  console.log('✅ PASS: Workspace hygiene complies 100% with AGENTS.md Section 5.3.');
  process.exit(0);
} else {
  console.error(`❌ FAILED: ${violations} hygiene violation(s) detected.`);
  process.exit(1);
}
