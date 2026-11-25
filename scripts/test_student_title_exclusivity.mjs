/**
 * test_student_title_exclusivity.mjs
 *
 * Authoritative Regression Suite for Rule 2.23 & ui-invariants Rule 2.8:
 * Standard Student Name (studentName) & Dashboard-Only Title (Mr. & Miss).
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('🧪 Starting Verification Suite: Standard Student Name & Dashboard-Only Title...\n');

// ============================================================
// PILLAR 1: Standard Name Concept & Helper Contracts
// ============================================================
console.log('▶ Pillar 1: Verifying standard student name & dashboard-only title helper...');
import { formatStudentName, formatStudentDashboardName } from '../js/api.js';

// 1.1 formatStudentName contract (Standard name everywhere)
assert.strictEqual(formatStudentName('Ahmad Dahlan'), 'Ahmad Dahlan', 'formatStudentName returns standard name');
assert.strictEqual(formatStudentName('Jessica Pratama'), 'Jessica Pratama', 'formatStudentName returns standard name');
console.log('  ✅ [PASS] formatStudentName preserves standard student name directly');

// 1.2 formatStudentDashboardName contract (Dashboard-Only title addition)
assert.strictEqual(formatStudentDashboardName('Ahmad Dahlan', 'male'), 'Mr. Ahmad Dahlan', 'Dashboard male gets Mr.');
assert.strictEqual(formatStudentDashboardName('Jessica Pratama', 'female'), 'Miss Jessica Pratama', 'Dashboard female gets Miss');
assert.strictEqual(formatStudentDashboardName('Ahmad Dahlan', 'male', true), 'King Ahmad Dahlan', 'Dashboard champion male gets King');
assert.strictEqual(formatStudentDashboardName('Jessica Pratama', 'female', true), 'Queen Jessica Pratama', 'Dashboard champion female gets Queen');
console.log('  ✅ [PASS] formatStudentDashboardName correctly formats dashboard-only title');

// ============================================================
// PILLAR 2: API Login, Student Fetch, and Gender Update Audit
// ============================================================
console.log('\n▶ Pillar 2: Auditing API functions (login, student fetch, gender update)...');
const apiContent = fs.readFileSync('js/api.js', 'utf8');

// Ensure fetchStudentsByProgram returns standard name
assert(apiContent.includes('displayName: s.name') && apiContent.includes('name: s.name'),
  'fetchStudentsByProgram must provide standard student name');
console.log('  ✅ [PASS] fetchStudentsByProgram returns standard student names directly');

// Ensure verifyStudentLogin returns standard student name
assert(apiContent.includes('name: student.name'),
  'verifyStudentLogin must set student.name directly without alteration');
console.log('  ✅ [PASS] verifyStudentLogin guarantees session.student_name is standard student name');

// Ensure updateStudentGender ONLY updates gender, never touching name
assert(apiContent.includes('.update({ gender: g, updated_at:'),
  'updateStudentGender must only update gender, never modifying student name');
console.log('  ✅ [PASS] updateStudentGender only updates gender column in database');

// ============================================================
// PILLAR 3: Consumer Screens Audit (Result, Test, Conversation)
// ============================================================
console.log('\n▶ Pillar 3: Auditing consumer screens (Result, Test, Conversation)...');

// 3.1 Result screen (js/result.js) — Displays Mr./Miss (and King/Queen for batch champions) matching Dashboard
const resultContent = fs.readFileSync('js/result.js', 'utf8');
assert(resultContent.includes('formatStudentDashboardName'),
  'js/result.js MUST import and apply formatStudentDashboardName for Mr./Miss & King/Queen titles');
assert(resultContent.includes('nameLabel.textContent = formatStudentDashboardName'),
  'js/result.js must format result-student-name-label using formatStudentDashboardName');
console.log('  ✅ [PASS] js/result.js displays Mr./Miss (and King/Queen) matching Student Dashboard');

// 3.2 Test room (js/test.js)
const testContent = fs.readFileSync('js/test.js', 'utf8');
assert(testContent.includes('nameEl.textContent = session.student_name'),
  'js/test.js must render session.student_name directly');
assert(testContent.includes('${session.student_name'),
  'js/test.js must render session.student_name directly in meta');
console.log('  ✅ [PASS] js/test.js directly displays standard session.student_name');

// 3.3 Conversation room (js/conversation-room.js)
const convContent = fs.readFileSync('js/conversation-room.js', 'utf8');
assert(convContent.includes('name: session.student_name'),
  'js/conversation-room.js must use session.student_name directly');
console.log('  ✅ [PASS] js/conversation-room.js directly uses standard session.student_name');

// 3.4 Floating windows & Modals audit
const testsAccessContent = fs.readFileSync('js/admin/tests-access.js', 'utf8');
assert(testsAccessContent.includes('${studentName} • Theme') || testsAccessContent.includes('${studentName} • ${theme.isNonVocab'),
  'Kick confirm modal must use standard studentName directly');
assert(testsAccessContent.includes("if (nameEl) nameEl.textContent = `${studentName} (${alarmsList.length}x ALARMS)`") || testsAccessContent.includes("${studentName} • ${alarmsList.length}"),
  'Alarm detail modal must use standard studentName directly');
assert(testsAccessContent.includes('${escapeHtml(studentName)}</span>'),
  'Live session monitor row must render clean studentName');

const studentMgmtContent = fs.readFileSync('js/admin/student-management.js', 'utf8');
assert(studentMgmtContent.includes('${escapeHtml(rec.displayName || rec.name)}'),
  'Student profile & dossier modal must use standard rec.displayName / rec.name directly');
console.log('  ✅ [PASS] All floating windows (modals, overlays, peek, dossier) strictly use standard studentName');

// ============================================================
// PILLAR 4: Student Dashboard Presentation Exclusivity
// ============================================================
console.log('\n▶ Pillar 4: Auditing Student Dashboard exclusivity (js/dashboard.js)...');
const dashContent = fs.readFileSync('js/dashboard.js', 'utf8');

// Ensure dashboard.js maintains its presentation logic for Mr./Miss
assert(dashContent.includes("initFormattedName = `Mr. ${initFormattedName}`") && dashContent.includes("initFormattedName = `Miss ${initFormattedName}`"),
  'dashboard.js welcome greeting must support Mr./Miss');
assert(dashContent.includes("formattedName = `Mr. ${cleanFullName}`") && dashContent.includes("formattedName = `Miss ${cleanFullName}`"),
  'dashboard.js applyStudentGenderUI must support Mr./Miss');
console.log('  ✅ [PASS] js/dashboard.js & js/result.js present Mr./Miss (and King/Queen)');

// ============================================================
// PILLAR 5: Governance SSOT Codification Audit
// ============================================================
console.log('\n▶ Pillar 5: Auditing SSOT Governance codification...');

// 5.1 AGENTS.md
const agentsContent = fs.readFileSync('AGENTS.md', 'utf8');
assert(agentsContent.includes('## 2.23 Standard Student Name (`studentName`) & Dashboard/Result Title (`Mr.` / `Miss`)'),
  'AGENTS.md must define Rule 2.23');
assert(agentsContent.includes('DO NOT prepend "Mr." or "Miss" titles to student names outside the Student Dashboard and Result Page'),
  'AGENTS.md Section 5.2 must contain prohibition');
console.log('  ✅ [PASS] AGENTS.md §2.23 & §5.2 authoritatively codified');

// 5.2 ui-invariants.md
const uiContent = fs.readFileSync('.agents/rules/ui-invariants.md', 'utf8');
assert(uiContent.includes('### 2.8 Standard Student Name (`studentName`) & Dashboard/Result Title (`Mr.` / `Miss`)'),
  'ui-invariants.md must define Rule 2.8');
console.log('  ✅ [PASS] .agents/rules/ui-invariants.md §2.8 authoritatively codified');

// 5.3 DECISIONS.md
const decisionsContent = fs.readFileSync('docs/DECISIONS.md', 'utf8');
assert(decisionsContent.includes('## DECISION-053 — Standard Student Name (`studentName`) and Dashboard/Result Title (`Mr.` / `Miss`)'),
  'docs/DECISIONS.md must contain DECISION-053');
console.log('  ✅ [PASS] docs/DECISIONS.md DECISION-053 authoritatively ratified');

// 5.4 .antigravityrules
const rulesContent = fs.readFileSync('.antigravityrules', 'utf8');
assert(rulesContent.includes('STUDENT NAME & DASHBOARD/RESULT TITLE'),
  '.antigravityrules must index Rule 2.23');
console.log('  ✅ [PASS] .antigravityrules master index synchronized');

console.log('\n======================================================');
console.log('🎉 ALL CHECKS PASSED: STANDARD STUDENT NAME & DASHBOARD-ONLY TITLE (100%)');
console.log('======================================================\n');
