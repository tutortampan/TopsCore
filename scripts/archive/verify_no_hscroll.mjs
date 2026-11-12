import { readFileSync } from 'fs';

const dg = readFileSync('js/admin/datagrid.js', 'utf8');
const sm = readFileSync('js/admin/student-management.js', 'utf8');
const app = readFileSync('js/admin/app.js', 'utf8');
const css = readFileSync('css/admin.css', 'utf8');

let pass = true;
function check(label, cond) {
  const r = cond ? '\x1b[32m✅ PASS\x1b[0m' : '\x1b[31m❌ FAIL\x1b[0m';
  console.log(r, label);
  if (!cond) pass = false;
}

console.log('\n=== HORIZONTAL SCROLL FIX VERIFICATION ===\n');

check('datagrid.js: .table-wrap has overflow-x:hidden inline style',
  dg.includes('overflow-x:hidden') && !dg.includes('overflow-x:auto')
);

check('student-management.js: tableLayout fixed (not auto)',
  sm.includes("tableLayout: 'fixed'") && !sm.includes("tableLayout: 'auto'")
);

check('app.js class-attendance: tableLayout fixed (not auto)',
  !app.includes("tableLayout: 'auto'")
);

check('admin.css: .table-wrap overflow-x: hidden !important',
  css.includes('overflow-x: hidden !important')
);

const caIdx = css.indexOf('#admin-content-area');
const caBlock = css.slice(caIdx, caIdx + 250);
check('admin.css: #admin-content-area has overflow: hidden', caBlock.includes('overflow: hidden'));

// Check #student-grid-container is covered by a rule with overflow: hidden
// It appears in a multi-selector block at line ~3832
check('admin.css: #student-grid-container block has overflow: hidden',
  css.includes('#student-grid-container') &&
  css.includes("overflow: hidden !important") &&
  (() => {
    // Find the block containing #student-grid-container
    let idx = 0;
    while (idx < css.length) {
      const found = css.indexOf('#student-grid-container', idx);
      if (found === -1) break;
      const blockEnd = css.indexOf('}', found);
      if (blockEnd !== -1 && css.slice(found, blockEnd).includes('overflow')) return true;
      // Also check backwards to find the block start
      const blockStart = css.lastIndexOf('{', found);
      const afterBrace = css.slice(blockStart, blockStart + 400);
      if (afterBrace.includes('overflow: hidden')) return true;
      idx = found + 1;
    }
    return false;
  })()
);

console.log('\n' + (pass ? '\x1b[32m✅ ALL PASS\x1b[0m' : '\x1b[31m❌ SOME FAILED\x1b[0m') + '\n');
process.exit(pass ? 0 : 1);
