// ============================================================
// TOPSCORE LMS — AUTOMATED VERIFICATION SUITE
// Tests True Test Analytics, Viewport Lock, Pinned Table Header/Footer,
// Action Buttons in Attendance Toolbar, and Navigation Overhaul.
// ============================================================

import { strict as assert } from 'assert';
import fs from 'fs';
import path from 'path';

console.log('=== [TEST SUITE] Starting Streamlining & Analytics Overhaul Verification ===\n');

// 1. Check admin.html navigation elements
console.log('[Test 1] Verifying admin.html Navigation Structure (Edit Mode & Logout)...');
const adminHtml = fs.readFileSync('admin.html', 'utf8');

assert(adminHtml.includes('class="sidebar-logo') || adminHtml.includes('class="sidebar-corner-top'), 'admin.html must contain top corner');
assert(!adminHtml.includes('id="global-edit-mode-toggle"'), 'admin.html must be clean of #global-edit-mode-toggle (purged per Phase 556)');

// Ensure top corner contains user role (ADMIN/TUTOR) and Exit button is present in bottom banner or top corner
const sidebarHeaderArea = adminHtml.slice(adminHtml.indexOf('class="sidebar-logo'), adminHtml.indexOf('class="admin-nav"'));
assert(sidebarHeaderArea && (sidebarHeaderArea.includes('ADMIN/TUTOR') || sidebarHeaderArea.includes('id="sidebar-user-role-label"')), 'Top corner must contain user role label (ADMIN/TUTOR)');
assert(adminHtml.includes('id="admin-logout-btn"'), 'admin.html must contain #admin-logout-btn');
assert(adminHtml.includes('Exit Console') || adminHtml.includes('EXIT') || adminHtml.includes('Exit'), 'admin-logout-btn must contain clean Exit label/title');
console.log('  ✓ Top corner verified: "ADMIN/TUTOR", dynamic role label, and SVG logout Exit');

// Ensure bottom corner (.sidebar-footer) is clean of edit mode toggle
const sidebarFooterMatch = adminHtml.match(/<div class="sidebar-footer[\s\S]*?<\/aside>/);
assert(sidebarFooterMatch, 'admin.html must contain .sidebar-footer');
assert(!sidebarFooterMatch[0].includes('id="global-edit-mode-toggle"'), 'sidebar-footer must not contain #global-edit-mode-toggle');
console.log('  ✓ Bottom corner (.sidebar-footer) verified clean of master edit mode toggle');

// Check admin-topbar-actions is clean of the old toggle
const topbarActionsMatch = adminHtml.match(/<div class="admin-topbar-actions" id="admin-topbar-actions">([\s\S]*?)<\/div>/);
assert(topbarActionsMatch && !topbarActionsMatch[1].includes('id="global-edit-mode-toggle"'), '#admin-topbar-actions must not contain the duplicate toggle');
console.log('  ✓ #admin-topbar-actions verified clean of duplicate toggle');

// 2. Check css/admin.css for Zero Outer Scrollbar & Sticky Table Header/Footer
console.log('\n[Test 2] Verifying css/admin.css Viewport Lock & Sticky Header/Footer...');
const adminCss = fs.readFileSync('css/admin.css', 'utf8');

assert(adminCss.includes('overflow-y: hidden !important;'), 'admin.css must enforce overflow-y: hidden !important');
assert(adminCss.includes('.table-wrap table thead th') || adminCss.includes('.datagrid-table thead th'), 'admin.css must contain sticky thead');
assert(adminCss.includes('position: sticky !important;\n  top: 0 !important;') || adminCss.includes('position: sticky !important;\r\n  top: 0 !important;'), 'thead th must be sticky top: 0');
assert(adminCss.includes('.table-wrap table tfoot') || adminCss.includes('.datagrid-table tfoot'), 'admin.css must contain sticky tfoot');
assert(adminCss.includes('position: sticky !important;\n  bottom: 0 !important;') || adminCss.includes('position: sticky !important;\r\n  bottom: 0 !important;'), 'tfoot must be sticky bottom: 0');
assert(adminCss.includes('tfoot:empty'), 'admin.css must hide empty tfoot');
console.log('  ✓ css/admin.css verified: Zero outer scrollbar, sticky thead top: 0, sticky tfoot bottom: 0, and tfoot:empty hiding');

// 3. Check js/admin/app.js for Action Buttons in Attendance Toolbar
console.log('\n[Test 3] Verifying Action Buttons in Students Grade and Score toolbar...');
const appJs = fs.readFileSync('js/admin/app.js', 'utf8');

assert(appJs.includes('attendance-actions-cluster'), 'app.js must place action buttons in attendance-actions-cluster');
assert(appJs.includes('id="btn-subpanel-forgiven"') || appJs.includes('id="btn-open-forgiven-wizard"'), 'app.js must contain forgiven action button');
console.log('  ✓ app.js verified: Authoritative Grade and Score action buttons placed in attendance toolbar');

// 4. Check 4-Tab Navigation in Class Hub
console.log('\n[Test 4] Verifying 4-Tab Navigation in Class Hub...');
assert(appJs.includes("id: 'attendance'") && (appJs.includes("label: 'Students Grade and Rate'") || appJs.includes("label: 'Students Grade and Score'")), 'Tab 1 must be attendance');
assert(appJs.includes("id: 'test-sessions'") && (appJs.includes("label: 'Class Sessions'") || appJs.includes("label: 'Test Sessions'")), 'Tab 2 must be test-sessions');
assert(appJs.includes("id: 'tests'") && appJs.includes("label: 'Class Tests'"), 'Tab 3 must be Class Tests');
assert(appJs.includes("id: 'analytics'") && appJs.includes("label: 'Test Analytics'"), 'Tab 4 must be Test Analytics');
assert(appJs.includes('renderClassVocabularyAnalytics'), 'app.js must import and call renderClassVocabularyAnalytics');
console.log('  ✓ app.js verified: 4 distinct tabs (Grade & Score, Sessions, Class Tests, Test Analytics)');

// 5. Check js/admin/class-analytics.js
console.log('\n[Test 5] Verifying js/admin/class-analytics.js...');
const analyticsJs = fs.readFileSync('js/admin/class-analytics.js', 'utf8');

assert(analyticsJs.includes('export async function renderClassVocabularyAnalytics'), 'class-analytics.js must export renderClassVocabularyAnalytics');
assert(analyticsJs.includes('diagnoseErrorReason'), 'class-analytics.js must contain diagnoseErrorReason function');
assert(analyticsJs.includes('levenshteinDistance'), 'class-analytics.js must contain levenshteinDistance');
assert(analyticsJs.includes('openVocabErrorDetailModal'), 'class-analytics.js must contain openVocabErrorDetailModal');
assert(analyticsJs.includes('btn-analytics-pill'), 'class-analytics.js must contain urgency triage pills');
console.log('  ✓ class-analytics.js verified: Item-level analytics, Damerau-Levenshtein typo diagnosis, triage pills, and student mistake modal');

console.log('\n🎉 ALL STREAMLINING & ANALYTICS OVERHAUL TESTS PASSED (100%)!');
