/**
 * check_all_js_syntax.cjs (Fast Delegation Wrapper)
 * Delegates to the ultra-fast in-process AST validator (check_all_js_syntax.mjs)
 */
const { spawnSync } = require('child_process');
const path = require('path');

const targetScript = path.join(__dirname, 'check_all_js_syntax.mjs');
const res = spawnSync(process.execPath, ['--no-warnings', '--experimental-vm-modules', targetScript], {
  stdio: 'inherit'
});

process.exit(res.status ?? 0);
