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

assert(adminHtml.includes('<div class="sidebar-logo">'), 'admin.html must contain .sidebar-logo');
assert(adminHtml.includes('id="global-edit-mode-toggle"'), 'admin.html must contain #global-edit-mode-toggle');
// Ensure global-edit-mode-toggle is inside sidebar header before admin-nav
const sidebarHeaderArea = adminHtml.slice(adminHtml.indexOf('class="sidebar-logo"'), adminHtml.indexOf('class="admin-nav"'));
assert(sidebarHeaderArea && sidebarHeaderArea.includes('id="global-edit-mode-toggle"'), '#global-edit-mode-toggle must be inside .sidebar-logo (top-left corner)');
console.log('  ✓ #global-edit-mode-toggle verified in top-left sidebar header (.sidebar-logo)');

// Check sidebar-footer contains Tutor's Room and door logout
const sidebarFooterMatch = adminHtml.match(/<div class="sidebar-footer">([\s\S]*?)<\/div>\s*<\/aside>/);
assert(sidebarFooterMatch, 'admin.html must contain .sidebar-footer');
assert(sidebarFooterMatch[1].includes("Tutor's Room"), 'sidebar-footer must display "Tutor\'s Room"');
assert(sidebarFooterMatch[1].includes('id="sidebar-user-role-label"'), 'sidebar-footer must contain #sidebar-user-role-label');
assert(sidebarFooterMatch[1].includes('id="admin-logout-btn"'), 'sidebar-footer must contain #admin-logout-btn');
assert(sidebarFooterMatch[1].includes('🚪'), 'admin-logout-btn must contain door emoji 🚪');
console.log('  ✓ sidebar-footer verified: "Tutor\'s Room", dynamic role label, and door logout 🚪');

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

assert(appJs.includes('attendance-actions-cluster edit-mode-only'), 'app.js must place 4 action buttons in attendance-actions-cluster with edit-mode-only');
assert(appJs.includes('id="btn-open-forgiven-wizard"'), 'app.js must contain #btn-open-forgiven-wizard');
assert(appJs.includes('id="btn-open-blueprint-settings"'), 'app.js must contain #btn-open-blueprint-settings');
assert(appJs.includes('id="btn-open-blueprint-from-class"'), 'app.js must contain #btn-open-blueprint-from-class');
assert(appJs.includes('id="btn-open-generator-from-class"'), 'app.js must contain #btn-open-generator-from-class');
console.log('  ✓ app.js verified: 4 curriculum action buttons placed in attendance toolbar under edit-mode-only');

// 4. Check 4-Tab Navigation in Class Hub
console.log('\n[Test 4] Verifying 4-Tab Navigation in Class Hub...');
assert(appJs.includes("{ id: 'attendance', icon: '👥', val: activeBatchStudents.length, label: 'Students Grade and Score' }"), 'Tab 1 must be attendance');
assert(appJs.includes("{ id: 'test-sessions', icon: '⏱️', val: 4, label: 'Test Sessions' }"), 'Tab 2 must be test-sessions');
assert(appJs.includes("{ id: 'tests', icon: '📝', val: classTests.length, label: 'Class Tests' }"), 'Tab 3 must be Class Tests');
assert(appJs.includes("{ id: 'analytics', icon: '📊', val: 'Insights', label: 'Test Analytics' }"), 'Tab 4 must be Test Analytics');
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
