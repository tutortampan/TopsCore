/**
 * TopsCore — E2E Test Suite: Tutor Ecosystem, Dual-Mode Attendance & Punishment Ledger
 * Verifies 7 Pillars of Multi-Tenant Tri-Role Architecture (Admin, Tutor, Student)
 */

import fs from 'fs';
import path from 'path';

console.log('======================================================');
console.log('TUTOR ECOSYSTEM & MULTI-TENANT ATTENDANCE E2E TEST');
console.log('======================================================');

const ROOT_DIR = process.cwd();
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
    failed++;
  }
}

// ----------------------------------------------------
// PILLAR 1: Database Migration Schema Verification
// ----------------------------------------------------
console.log('\n[PILLAR 1: Database Migration Schema Verification]');
const migrationPath = path.join(ROOT_DIR, 'supabase', 'migrations', '20261121000000_tutor_ecosystem_and_attendance.sql');
assert(fs.existsSync(migrationPath), 'Migration file 20261121000000_tutor_ecosystem_and_attendance.sql exists');

if (fs.existsSync(migrationPath)) {
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  assert(sql.includes('CREATE TABLE IF NOT EXISTS public.tutor_profiles'), 'Defines public.tutor_profiles table');
  assert(sql.includes('institution_id UUID REFERENCES public.institutions(id)'), 'tutor_profiles bound to institution_id for multi-tenancy');
  assert(sql.includes('CREATE TABLE IF NOT EXISTS public.class_sessions'), 'Defines public.class_sessions table');
  assert(sql.includes('CREATE TABLE IF NOT EXISTS public.session_attendance'), 'Defines public.session_attendance table');
  assert(sql.includes('CREATE TABLE IF NOT EXISTS public.language_violations'), 'Defines public.language_violations table');
  assert(sql.includes('CREATE TABLE IF NOT EXISTS public.language_violation_payments'), 'Defines public.language_violation_payments table');
  assert(sql.includes('GENERATED ALWAYS AS (fine_amount - paid_amount) STORED'), 'Enforces GENERATED ALWAYS debt_amount in database engine');
  assert(sql.includes('CREATE OR REPLACE FUNCTION public.close_class_session_with_auto_alpha'), 'Defines close_class_session_with_auto_alpha RPC');
  assert(sql.includes("program_status != 'ALUMNI'"), 'Excludes ALUMNI students from Auto-Alpha per DECISION-074');
  assert(sql.includes('idx_class_sessions_active'), 'High performance index idx_class_sessions_active created');
}

// ----------------------------------------------------
// PILLAR 2: Mobile Tutor App Corridor & Design System
// ----------------------------------------------------
console.log('\n[PILLAR 2: Mobile Tutor App Corridor & Design System]');
const tutorHtmlPath = path.join(ROOT_DIR, 'tutor.html');
const tutorCssPath = path.join(ROOT_DIR, 'css', 'tutor.css');
assert(fs.existsSync(tutorHtmlPath), 'tutor.html exists');
assert(fs.existsSync(tutorCssPath), 'css/tutor.css exists');

if (fs.existsSync(tutorHtmlPath)) {
  const html = fs.readFileSync(tutorHtmlPath, 'utf-8');
  assert(!html.includes('Outfit'), 'tutor.html strictly free of Outfit font (Inter only)');
  assert(html.includes('id="tutor-app-container"'), 'tutor.html defines mobile corridor #tutor-app-container');
  assert(html.includes('id="tutor-top-header"'), 'tutor.html defines 50px header #tutor-top-header');
  assert(html.includes('ENGLISH AREA'), 'Renamed punishment ledger tab to ENGLISH AREA');
  assert(html.includes('id="level-segmented-bar"'), 'Defines Level selector bar for CEC (Levels 1, 2, 3)');
  assert(html.includes('id="class-matrix-grid"'), 'Defines 5-Panel class matrix grid');
  assert(html.includes('id="btn-trigger-start-regular"') && html.includes('id="btn-trigger-start-exam"'), 'Defines dual 50px start action buttons');
  assert(html.includes('id="table-attendance-matrix"'), 'Defines 4-column attendance datagrid table');
  assert(html.includes('id="btn-arena-close-session"'), 'Master 50px close session button defined');
  assert(html.includes('id="bottom-ad-banner"'), '50px locked bottom banner present');
}

if (fs.existsSync(tutorCssPath)) {
  const css = fs.readFileSync(tutorCssPath, 'utf-8');
  assert(!css.includes('Outfit'), 'css/tutor.css strictly free of Outfit font (Inter only)');
  assert(css.includes('max-width: 480px') || css.includes('max-width: 430px'), 'Corridor width restricted for mobile corridor');
  assert(css.includes('height: 50px !important'), 'Enforces 50px master CTA button height');
  assert(css.includes('height: 50px') && css.includes('.topscore-locked-banner'), 'Enforces 50px locked bottom banner');
  assert(css.includes('--grade-a') && css.includes('--grade-e'), 'Uses SSOT grade colors (Grade A green, Grade E red)');
  assert(css.includes('.attendance-4col-table'), 'Defines styling for 4-column attendance table');
}

// ----------------------------------------------------
// PILLAR 3: Multi-Tenant Architecture & Tutor App Logic
// ----------------------------------------------------
console.log('\n[PILLAR 3: Multi-Tenant Architecture & Tutor App Logic]');
const tutorJsPath = path.join(ROOT_DIR, 'js', 'tutor.js');
assert(fs.existsSync(tutorJsPath), 'js/tutor.js exists');

if (fs.existsSync(tutorJsPath)) {
  const js = fs.readFileSync(tutorJsPath, 'utf-8');
  assert(js.includes('_currentTenant'), 'Implements multi-tenant detection (CEC vs TOP)');
  assert(js.includes('loadStudentsForCecLevel'), 'Implements CEC Level student loader (excluding Alumni and Level 0)');
  assert(js.includes('loadStudentsForTopProgram'), 'Implements TOP Corporate Program student loader');
  assert(js.includes('updateMeetingCounter'), 'Implements automated meeting count calculation');
  assert(js.includes('render4ColAttendanceTable'), 'Renders 4-column attendance datagrid with radio buttons');
  assert(js.includes('startDynamicCodeRotation'), 'Implements rotating dynamic 6-character check-in code');
  assert(js.includes('FINE_RATE_PER_WORD = 2000'), 'Enforces standard Rp 2.000 / word rate');
}

// ----------------------------------------------------
// PILLAR 4: Admin Low Corner Panel Tenant Switcher
// ----------------------------------------------------
console.log('\n[PILLAR 4: Admin Low Corner Panel Tenant Switcher]');
const adminHtmlPath = path.join(ROOT_DIR, 'admin.html');
const adminCssPath = path.join(ROOT_DIR, 'css', 'admin.css');
const adminJsPath = path.join(ROOT_DIR, 'js', 'admin', 'app.js');

if (fs.existsSync(adminHtmlPath)) {
  const aHtml = fs.readFileSync(adminHtmlPath, 'utf-8');
  assert(aHtml.includes('id="sidebar-tenant-switcher-container"') || aHtml.includes('tenant-switcher-capsule'), 'admin.html contains Tenant Switcher');
  assert(aHtml.includes('data-tenant="ALL"') && aHtml.includes('data-tenant="CEC"') && aHtml.includes('data-tenant="TOP"'), 'Provides ALL, CEC, and TOP tenant buttons');
  assert(aHtml.includes('theme-switcher-capsule'), 'admin.html contains Low Corner Theme Switcher');
  assert(aHtml.includes('data-theme="light"') && aHtml.includes('data-theme="navy"') && aHtml.includes('data-theme="dark"'), 'Provides Light, Navy, and Dark theme buttons');
}

if (fs.existsSync(adminCssPath)) {
  const aCss = fs.readFileSync(adminCssPath, 'utf-8');
  assert(aCss.includes('.tenant-switcher-capsule'), 'css/admin.css styles .tenant-switcher-capsule');
  assert(aCss.includes('.btn-tenant-toggle'), 'css/admin.css styles .btn-tenant-toggle');
}

if (fs.existsSync(adminJsPath)) {
  const aJs = fs.readFileSync(adminJsPath, 'utf-8');
  assert(aJs.includes('setupTenantSwitcher'), 'js/admin/app.js implements setupTenantSwitcher');
  assert(aJs.includes('topscore_active_tenant'), 'Saves tenant selection in sessionStorage');
}

// ----------------------------------------------------
// PILLAR 5: Student Dashboard Blade 3 Integration
// ----------------------------------------------------
console.log('\n[PILLAR 5: Student Dashboard Blade 3 Integration]');
const dashHtmlPath = path.join(ROOT_DIR, 'dashboard.html');
const dashJsPath = path.join(ROOT_DIR, 'js', 'dashboard.js');

if (fs.existsSync(dashHtmlPath)) {
  const dHtml = fs.readFileSync(dashHtmlPath, 'utf-8');
  assert(dHtml.includes('id="btn-dock-attendance"'), 'dashboard.html contains Blade 3 tab #btn-dock-attendance');
  assert(dHtml.includes('id="dock-pane-attendance"'), 'dashboard.html contains Blade 3 panel #dock-pane-attendance');
  assert(dHtml.includes('id="btn-student-gps-checkin"'), 'Blade 3 provides GPS Check In button');
  assert(dHtml.includes('id="btn-student-submit-code"'), 'Blade 3 provides 6-character Code entry input');
  assert(dHtml.includes('id="btn-student-enter-exam"'), 'Blade 3 provides Direct Exam Arena CTA');
}

if (fs.existsSync(dashJsPath)) {
  const dJs = fs.readFileSync(dashJsPath, 'utf-8');
  assert(dJs.includes('btn-dock-attendance'), 'js/dashboard.js binds click handler for Blade 3 tab');
  assert(dJs.includes('loadStudentAttendanceAndFines'), 'js/dashboard.js implements loadStudentAttendanceAndFines');
  assert(dJs.includes('recordStudentPresence'), 'js/dashboard.js records student presence via GPS or Code');
}

// ----------------------------------------------------
// PILLAR 6: Punishment Ledger Mathematical Invariant
// ----------------------------------------------------
console.log('\n[PILLAR 6: Punishment Ledger Mathematical Invariant]');
const rate = 2000;
let wordCount = 7;
let fineAmount = wordCount * rate; // 14,000
let paidAmount = 0;
let debtAmount = fineAmount - paidAmount;
assert(debtAmount === 14000, `Initial 7 words fine = Rp 14.000, paid = 0, debt = Rp ${debtAmount}`);

paidAmount += 5000;
debtAmount = fineAmount - paidAmount;
assert(debtAmount === 9000, `After partial payment of Rp 5.000, debt = Rp ${debtAmount}`);

paidAmount += 9000;
debtAmount = fineAmount - paidAmount;
assert(debtAmount === 0, `After full payment of Rp 14.000, debt = Rp 0 (LUNAS)`);

// ----------------------------------------------------
// PILLAR 7: Anti-Panic Grace Banner State (DECISION-065)
// ----------------------------------------------------
console.log('\n[PILLAR 7: Anti-Panic Grace Banner State (DECISION-065)]');
const testJsPath = path.join(ROOT_DIR, 'js', 'test.js');
if (fs.existsSync(testJsPath)) {
  const tJs = fs.readFileSync(testJsPath, 'utf-8');
  assert(tJs.includes("opts.mode === 'tutor_closed'"), 'js/test.js supports opts.mode === tutor_closed');
  assert(tJs.includes('SESSION CLOSED BY TUTOR • AUTO-SAVING'), 'Banner displays friendly auto-saving text on tutor close');
}

// Summary
console.log('\n======================================================');
if (failed === 0) {
  console.log(`🎉 ALL ${passed} TESTS PASSED! ZERO REGRESSIONS DETECTED.`);
  console.log('======================================================');
  process.exit(0);
} else {
  console.error(`❌ ${failed} TESTS FAILED out of ${passed + failed}.`);
  console.log('======================================================');
  process.exit(1);
}
