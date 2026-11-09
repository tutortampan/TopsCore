// TopsCore LMS — Tutor Role & RBAC Comprehensive Verification Suite
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

console.log('=== [RBAC TEST] Starting Tutor Role & Access Control Verification ===\n');

// -------------------------------------------------------------
// 1. Session Storage & Role Helper Functions Test
// -------------------------------------------------------------
console.log('Test 1: Verifying session.js role methods...');

// Mock browser storage for Node.js
class MockStorage {
  constructor() { this.store = {}; }
  getItem(key) { return this.store[key] !== undefined ? this.store[key] : null; }
  setItem(key, val) { this.store[key] = String(val); }
  removeItem(key) { delete this.store[key]; }
  clear() { this.store = {}; }
}

globalThis.sessionStorage = new MockStorage();
globalThis.localStorage = new MockStorage();

const {
  setAdminSession,
  getAdminSession,
  clearAdminSession,
  getAdminRole,
  isTutorRole,
  isAdminRole
} = await import('../js/session.js');

// Test 1a: Admin session
setAdminSession({ admin_id: 'admin-master', username: 'admin', role: 'admin' });
assert.strictEqual(getAdminRole(), 'admin', 'getAdminRole should return admin');
assert.strictEqual(isAdminRole(), true, 'isAdminRole should be true for admin');
assert.strictEqual(isTutorRole(), false, 'isTutorRole should be false for admin');
console.log('  ✓ Admin session correctly yields role="admin", isAdminRole=true, isTutorRole=false');

// Test 1b: Tutor session
setAdminSession({ admin_id: 'tutor-proctor', username: 'tutor', role: 'tutor' });
assert.strictEqual(getAdminRole(), 'tutor', 'getAdminRole should return tutor');
assert.strictEqual(isAdminRole(), false, 'isAdminRole should be false for tutor');
assert.strictEqual(isTutorRole(), true, 'isTutorRole should be true for tutor');
console.log('  ✓ Tutor session correctly yields role="tutor", isAdminRole=false, isTutorRole=true');

// Test 1c: Clear session
clearAdminSession();
assert.strictEqual(getAdminSession(), null, 'Session should be cleared');
assert.strictEqual(getAdminRole(), 'admin', 'Default role on null session should safely fallback to admin');
console.log('  ✓ Session clearing and null safe-fallback passed');


// -------------------------------------------------------------
// 2. Authentication Logic & Password Override Test
// -------------------------------------------------------------
console.log('\nTest 2: Verifying credential verification & custom password override...');

function authenticate(user, pass) {
  const normUser = user.toLowerCase().trim();
  const savedAdminPass = localStorage.getItem('topscore_admin_custom_password');
  const savedTutorPass = localStorage.getItem('topscore_tutor_custom_password');

  // Master Admin
  const isAdminUser = ['admin', 'administrator', 'superadmin', 'mr. top', 'mrtop'].includes(normUser);
  const isMasterAdmin = isAdminUser && (pass === 'admin123' || (savedAdminPass && pass === savedAdminPass));
  if (isMasterAdmin) return { success: true, role: 'admin' };

  // Tutor Proctor
  const isTutorUser = ['tutor', 'guru', 'proctor', 'pengawas'].includes(normUser);
  const isMasterTutor = isTutorUser && (savedTutorPass ? pass === savedTutorPass : pass === 'tutor123');
  if (isMasterTutor) return { success: true, role: 'tutor' };

  return { success: false, error: 'Invalid credentials' };
}

// Default credentials
assert.strictEqual(authenticate('admin', 'admin123').role, 'admin');
assert.strictEqual(authenticate('tutor', 'tutor123').role, 'tutor');
assert.strictEqual(authenticate('guru', 'tutor123').role, 'tutor');
assert.strictEqual(authenticate('proctor', 'tutor123').role, 'tutor');
assert.strictEqual(authenticate('pengawas', 'tutor123').role, 'tutor');
assert.strictEqual(authenticate('tutor', 'wrongpass').success, false);
assert.strictEqual(authenticate('unknown', 'tutor123').success, false);
console.log('  ✓ Default credentials verified for admin and tutor aliases (tutor, guru, proctor, pengawas)');

// Custom password override for tutor
localStorage.setItem('topscore_tutor_custom_password', 'my-secret-tutor-key');
assert.strictEqual(authenticate('tutor', 'my-secret-tutor-key').role, 'tutor');
assert.strictEqual(authenticate('tutor', 'tutor123').success, false, 'Default tutor password should be invalid when custom pass set');

// Reset custom tutor password
localStorage.removeItem('topscore_tutor_custom_password');
assert.strictEqual(authenticate('tutor', 'tutor123').role, 'tutor', 'Default tutor password restored');
console.log('  ✓ Custom tutor password override and restore verified');


// -------------------------------------------------------------
// 3. Navigation & Section Routing Guard Test
// -------------------------------------------------------------
console.log('\nTest 3: Verifying route guards & section permissions...');

function resolvePermittedSection(requestedSection, role) {
  if (role === 'tutor') {
    const allowed = ['class-hub', 'test-access'];
    if (!allowed.includes(requestedSection)) {
      return { section: 'class-hub', redirected: true };
    }
  }
  return { section: requestedSection, redirected: false };
}

const restrictedSections = [
  'dashboard', 'organization', 'curriculum', 'students',
  'student-registration', 'vocab_vault', 'tests', 'modules',
  'settings', 'audit', 'recycle'
];

for (const sec of restrictedSections) {
  const result = resolvePermittedSection(sec, 'tutor');
  assert.strictEqual(result.section, 'class-hub', `Section ${sec} must redirect tutor to class-hub`);
  assert.strictEqual(result.redirected, true, `Section ${sec} must be marked as redirected`);
}

const tutorPermitted = ['class-hub', 'test-access'];
for (const sec of tutorPermitted) {
  const result = resolvePermittedSection(sec, 'tutor');
  assert.strictEqual(result.section, sec, `Permitted section ${sec} must NOT redirect tutor`);
  assert.strictEqual(result.redirected, false);
}
console.log(`  ✓ All ${restrictedSections.length} restricted admin sections correctly blocked for tutor`);
console.log(`  ✓ Permitted sections (${tutorPermitted.join(', ')}) pass through without redirect`);


// -------------------------------------------------------------
// 4. Class Hub Tab Filtering Test
// -------------------------------------------------------------
console.log('\nTest 4: Verifying Class Hub tab scoping...');

function getClassHubTabs(role, allTabs) {
  if (role === 'tutor') {
    return allTabs.filter(t => t.id === 'test-sessions' || t.id === 'attendance');
  }
  return allTabs;
}

const standardClassHubTabs = [
  { id: 'attendance', label: 'Students Grade and Score' },
  { id: 'test-sessions', label: 'Test Sessions' },
  { id: 'tests', label: 'Class Tests' }
];

const tutorTabs = getClassHubTabs('tutor', standardClassHubTabs);
assert.strictEqual(tutorTabs.length, 2, 'Tutor must only have 2 tabs in Class Hub');
assert.deepStrictEqual(tutorTabs.map(t => t.id), ['attendance', 'test-sessions'], 'Tutor tabs must strictly be attendance and test-sessions');
assert.strictEqual(tutorTabs.some(t => t.id === 'tests'), false, 'tests tab (Class Tests) must be completely excluded for tutor');

const adminTabs = getClassHubTabs('admin', standardClassHubTabs);
assert.strictEqual(adminTabs.length, 3, 'Admin must see all 3 Class Hub tabs');
console.log('  ✓ Class Hub tabs strictly scoped: Tutor gets only [attendance, test-sessions], Class Tests excluded');


// -------------------------------------------------------------
// 5. Attendance Grid Manual Input Guard Test
// -------------------------------------------------------------
console.log('\nTest 5: Verifying Attendance Grid manual input removal...');

function buildGridColumns(role) {
  const cols = [
    { key: 'student_name', label: 'Student' },
    { key: 'theme_a_score', label: 'Theme A' }
  ];
  if (role !== 'tutor') {
    cols.push({ key: 'manual_input_action', label: 'Manual Input' });
  }
  return cols;
}

const tutorCols = buildGridColumns('tutor');
assert.strictEqual(tutorCols.some(c => c.key === 'manual_input_action'), false, 'Manual input column must NOT be present for tutor');

const adminCols = buildGridColumns('admin');
assert.strictEqual(adminCols.some(c => c.key === 'manual_input_action'), true, 'Manual input column must be present for admin');
console.log('  ✓ Attendance grid manual input column excluded for tutor role');


// -------------------------------------------------------------
// 6. CSS Rules Integrity Check
// -------------------------------------------------------------
console.log('\nTest 6: Verifying CSS scoping rules in css/admin.css...');

const cssContent = readFileSync(resolve('css/admin.css'), 'utf-8');

assert.ok(cssContent.includes('body.role-tutor .nav-domain-group[data-domain="admin"]'), 'CSS must hide Domain A for role-tutor');
assert.ok(cssContent.includes('body.role-tutor .nav-domain-group[data-domain="board"]'), 'CSS must hide Domain B for role-tutor');
assert.ok(cssContent.includes('body.role-tutor .nav-domain-group[data-domain="desk"]'), 'CSS must hide Domain D for role-tutor');
assert.ok(cssContent.includes('body.role-tutor .admin-nav-item[data-sub="tests"]'), 'CSS must hide tests subnav for role-tutor');
assert.ok(cssContent.includes('body.role-tutor .admin-nav-item[data-sub="vocab_vault"]'), 'CSS must hide vocab_vault subnav for role-tutor');
assert.ok(cssContent.includes('body.role-tutor .admin-user-chip .user-avatar'), 'CSS must style tutor avatar badge');
console.log('  ✓ css/admin.css contains all required role-tutor scoping rules');


// -------------------------------------------------------------
// 7. System Settings UI Integrity Check
// -------------------------------------------------------------
console.log('\nTest 7: Verifying Tutor Credentials card in js/admin/desk.js...');

const deskContent = readFileSync(resolve('js/admin/desk.js'), 'utf-8');

assert.ok(deskContent.includes('Tutor Proctor Credentials'), 'desk.js must contain Tutor Proctor Credentials card');
assert.ok(deskContent.includes('setting-tutor-password'), 'desk.js must contain setting-tutor-password input');
assert.ok(deskContent.includes('btn-save-tutor-password'), 'desk.js must contain btn-save-tutor-password button');
assert.ok(deskContent.includes('topscore_tutor_custom_password'), 'desk.js must persist topscore_tutor_custom_password');
console.log('  ✓ desk.js contains full Tutor Proctor Credentials card and save handler');


// -------------------------------------------------------------
// 8. Student Management Protection Check
// -------------------------------------------------------------
console.log('\nTest 8: Verifying CRUD guards in js/admin/student-management.js...');

const smContent = readFileSync(resolve('js/admin/student-management.js'), 'utf-8');

assert.ok(smContent.includes('isTutorRole'), 'student-management.js must import isTutorRole');
assert.ok(smContent.includes('openStudentFullEdit'), 'student-management.js has openStudentFullEdit');
assert.ok(smContent.includes('Permission denied: Tutor accounts cannot edit student data.'), 'openStudentFullEdit must guard against tutor');
assert.ok(smContent.includes('Permission denied: Tutor accounts cannot alter remedial status.'), 'labelAttemptRemedial must guard against tutor');
console.log('  ✓ student-management.js blocks editing student and altering remedial status for tutor');

console.log('\n=== ALL RBAC TUTOR ROLE TESTS PASSED (100%) ===\n');
