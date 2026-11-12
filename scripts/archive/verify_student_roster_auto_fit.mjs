/**
 * Verification Script: Student Roster Default Proportional Column Sizing and Auto-Fit
 * Tests that:
 * 1. Monolithic colspan="7" in super-headers is removed and replaced by individual 1-span blank headers.
 * 2. Proportional column widths are properly configured with Name column as flex primary (320px / min 240px).
 * 3. Restrictive max-width styles on <th> and <td> are eliminated in DataGrid.
 * 4. Summary row under Level displays "AVG" avoiding "BATCH ..." truncation.
 * 5. DataGrid autoFitColumns and autoFitOnMount functionality is present and correctly wired.
 * 6. Cache busting query strings are unified to v=20261112_v425.
 */

import fs from 'fs';
import path from 'path';

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

console.log('🔍 Running Student Roster Auto-Fit & Column Sizing Verification...\n');

// 1. Check js/admin/student-management.js
const smPath = path.resolve('js/admin/student-management.js');
const smContent = fs.readFileSync(smPath, 'utf8');

console.log('📋 Checking js/admin/student-management.js:');

// Super-headers fix
assert(
  !smContent.includes("sh.push({ label: '', colSpan: fixed_before") &&
  smContent.includes("sh.push({ label: '', colSpan: 1, style: 'background:var(--clr-bg-2);border:none;' });"),
  'Super-headers no longer contain monolithic colSpan: fixed_before/7'
);

// Name column flex width
assert(
  smContent.includes("key: 'sortName'") &&
  smContent.includes("width: '320px'") &&
  smContent.includes("minWidth: '240px'"),
  'Name column has flexible width: 320px, minWidth: 240px'
);

// Level, Photo, Gender widths
assert(
  smContent.includes("key: 'levelName'") && smContent.includes("width: '50px'"),
  'Level column has compact width: 50px'
);
assert(
  smContent.includes("key: 'photo_url'") && smContent.includes("width: '48px'"),
  'Photo column has compact width: 48px'
);
assert(
  smContent.includes("key: 'gender'") && smContent.includes("width: '65px'"),
  'Gender column has compact width: 65px'
);

// Footer Level label
assert(
  smContent.includes("col.key === 'levelName'") &&
  smContent.includes('>AVG</td>') &&
  !smContent.includes('>BATCH AVG</td>'),
  'Summary row Level cell displays "AVG" instead of "BATCH AVG"'
);

// DataGrid initialization options
assert(
  smContent.includes("tableId: 'student_roster_grid'"),
  'DataGrid receives explicit tableId: student_roster_grid'
);
assert(
  smContent.includes("autoFitOnMount: true"),
  'DataGrid receives autoFitOnMount: true'
);

// 2. Check js/admin/datagrid.js
console.log('\n📋 Checking js/admin/datagrid.js:');
const dgPath = path.resolve('js/admin/datagrid.js');
const dgContent = fs.readFileSync(dgPath, 'utf8');

// No max-width on header th
assert(
  !dgContent.includes("max-width:${col.width};"),
  'Header <th> does not enforce restrictive max-width'
);

// No td.style.maxWidth
assert(
  !dgContent.includes("td.style.maxWidth = col.width;"),
  'Table body <td> does not enforce restrictive max-width'
);

// autoFitColumns method
assert(
  dgContent.includes("autoFitColumns(persist = false)"),
  'DataGrid has autoFitColumns(persist = false) method'
);

// autoFitOnMount in constructor
assert(
  dgContent.includes("this.autoFitOnMount = Boolean(autoFitOnMount || arguments[0]?.autoFitOnMount);"),
  'DataGrid constructor recognizes autoFitOnMount flag'
);

// initColumnResize synchronizes to <th>
assert(
  dgContent.includes("ths[thIdx].style.width = savedWidths[i] + 'px';"),
  'initColumnResize synchronizes saved widths to <th> elements'
);

// Double click super-header resets both cols and ths
assert(
  dgContent.includes("cols.forEach(col => col.style.width = '');") &&
  dgContent.includes("ths.forEach(th => th.style.width = '');"),
  'Super-header reset clears widths from both cols and ths'
);

// 3. Cache-Busting Version Verification
console.log('\n📋 Checking Cache-Busting Version Synchronization (v=20261112_v425):');
const adminHtml = fs.readFileSync(path.resolve('admin.html'), 'utf8');
const appJs = fs.readFileSync(path.resolve('js/admin/app.js'), 'utf8');

assert(
  adminHtml.includes('css/style.css?v=20261112_v425'),
  'admin.html imports style.css with v=20261112_v425'
);
assert(
  adminHtml.includes('css/admin.css?v=20261112_v425'),
  'admin.html imports admin.css with v=20261112_v425'
);
assert(
  adminHtml.includes('js/admin/app.js?v=20261112_v425'),
  'admin.html imports app.js with v=20261112_v425'
);
assert(
  appJs.includes("import { DataGrid } from './datagrid.js?v=20261112_v425';"),
  'app.js imports datagrid.js with v=20261112_v425'
);
assert(
  appJs.includes("import { renderStudents as _renderStudentsModule } from './student-management.js?v=20261112_v425';"),
  'app.js imports student-management.js with v=20261112_v425'
);
assert(
  smContent.includes("import { DataGrid } from './datagrid.js?v=20261112_v425';"),
  'student-management.js imports datagrid.js with v=20261112_v425'
);

// Summary
console.log(`\n========================================`);
console.log(`Results: ${passCount} passed, ${failCount} failed.`);
console.log(`========================================`);

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('🎉 All Student Roster Auto-Fit checks passed successfully!\n');
  process.exit(0);
}
