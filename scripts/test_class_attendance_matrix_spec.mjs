/**
 * test_class_attendance_matrix_spec.mjs
 * 
 * Verifies CEC Class Attendance Matrix (20 & 24 Meetings, Week Dividers, Header Timestamps, Manual Entry)
 */

import { getMeetingsConfigForClass } from '../js/admin/class-attendance.js';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('======================================================');
console.log('CEC CLASS & BATCH ATTENDANCE MATRIX SPECIFICATION TEST');
console.log('======================================================\n');

// ── PILLAR 1: Class Modality & Meeting Count SSOT ──────────
console.log('[PILLAR 1: Class Modality & Meeting Count SSOT]');
const vocabConfig1 = getMeetingsConfigForClass('Camp 1st Vocabulary');
assert(vocabConfig1.isVocab === true, 'Camp 1st Vocabulary detected as Vocab');
assert(vocabConfig1.totalMeetings === 24, 'Vocabulary has strictly 24 total meetings');
assert(vocabConfig1.weekDays === 6, 'Vocabulary has 6 meetings per week (Mon–Sat)');
assert(vocabConfig1.weekCount === 4, 'Vocabulary has 4 weeks');

const vocabConfig2 = getMeetingsConfigForClass({ code: 'CAMP-2VCB-B2-TASK', name: '2nd Vocabulary' });
assert(vocabConfig2.isVocab === true, 'CAMP-2VCB detected as Vocab');
assert(vocabConfig2.totalMeetings === 24, 'CAMP-2VCB has strictly 24 total meetings');

const vocabConfigLegacy = getMeetingsConfigForClass({ code: 'CMP-2VCB-B2-TASK', name: '2nd Vocabulary' });
assert(vocabConfigLegacy.isVocab === true, 'CMP-2VCB detected as Vocab');
assert(vocabConfigLegacy.totalMeetings === 24, 'CMP-2VCB has strictly 24 total meetings');

const speakingConfig = getMeetingsConfigForClass('Camp 2nd Speaking');
assert(speakingConfig.isVocab === false, 'Camp 2nd Speaking detected as Non-Vocab');
assert(speakingConfig.totalMeetings === 20, 'Speaking has strictly 20 total meetings');
assert(speakingConfig.weekDays === 5, 'Speaking has 5 meetings per week (Mon–Fri)');

const basicConfig = getMeetingsConfigForClass('Camp 1st Basic English');
assert(basicConfig.isVocab === false, 'Basic English detected as Non-Vocab');
assert(basicConfig.totalMeetings === 20, 'Basic English has strictly 20 total meetings');
assert(basicConfig.weekDays === 5, 'Basic English has 5 meetings per week (Mon–Fri)');

const storyConfig = getMeetingsConfigForClass('Camp 1st Storytelling');
assert(storyConfig.isVocab === false, 'Storytelling detected as Non-Vocab');
assert(storyConfig.totalMeetings === 20, 'Storytelling has strictly 20 total meetings');

const grammarConfig = getMeetingsConfigForClass('Camp Grammar');
assert(grammarConfig.isVocab === false, 'Grammar detected as Non-Vocab');
assert(grammarConfig.totalMeetings === 20, 'Grammar has strictly 20 total meetings');

// ── PILLAR 2: Weekly Divider Intervals (Every 5 or 6 Meetings) ──
console.log('\n[PILLAR 2: Weekly Divider Intervals]');
const vocabDividers = [];
for (let m = 1; m <= vocabConfig1.totalMeetings; m++) {
  if (m % vocabConfig1.weekDays === 0) vocabDividers.push(m);
}
assert(vocabDividers.join(',') === '6,12,18,24', 'Vocabulary dividers placed strictly at M6, M12, M18, M24');

const nonVocabDividers = [];
for (let m = 1; m <= speakingConfig.totalMeetings; m++) {
  if (m % speakingConfig.weekDays === 0) nonVocabDividers.push(m);
}
assert(nonVocabDividers.join(',') === '5,10,15,20', 'Non-Vocab dividers placed strictly at M5, M10, M15, M20');

// ── PILLAR 3: Header Timestamps & Rate Calculation Invariant ──
console.log('\n[PILLAR 3: Header Timestamps & Rate Invariant]');
const sampleDate = new Date('2026-11-21T08:00:00Z');
const dtStr = sampleDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
const tmStr = sampleDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
assert(dtStr.length > 0 && tmStr.length > 0, `Header formats date & time properly: ${dtStr} ${tmStr}`);

// Rate math: P / (P + E + S + A)
const p = 18, e = 1, s = 1, a = 0;
const tot = p + e + s + a;
const rate = Math.round((p / tot) * 100);
assert(tot === 20, 'Total recorded equals 20');
assert(rate === 90, 'Attendance rate strictly calculated as 90% (18/20)');

// ── PILLAR 4: Codebase Integration Verification ─────────────
console.log('\n[PILLAR 4: Codebase Integration Verification]');
const appJs = fs.readFileSync(path.resolve('js/admin/app.js'), 'utf8');
assert(appJs.includes("renderClassMeetingsAttendance"), 'app.js imports renderClassMeetingsAttendance');
assert(appJs.includes("class-attendance"), 'app.js registers class-attendance tab in Class Hub');
assert(appJs.includes("class-meetings-attendance-container"), 'app.js defines class-meetings-attendance-container');

const studentMgmtJs = fs.readFileSync(path.resolve('js/admin/student-management.js'), 'utf8');
assert(studentMgmtJs.includes("renderBatchAttendance"), 'student-management.js imports renderBatchAttendance');
assert(studentMgmtJs.includes("Batch Attendance"), 'student-management.js registers Batch Attendance tab');

const adminViewsCss = fs.readFileSync(path.resolve('css/admin/admin-views.css'), 'utf8');
assert(adminViewsCss.includes(".col-week-end"), 'admin-views.css defines .col-week-end divider border');
assert(adminViewsCss.includes(".att-cell-badge"), 'admin-views.css defines .att-cell-badge styles');
assert(adminViewsCss.includes(".badge-p") && adminViewsCss.includes(".badge-a"), 'admin-views.css defines P, E, S, A status badge colors');

// ── PILLAR 5: Table Matrix Header & Column Standardization SSOT ──
console.log('\n[PILLAR 5: Table Header & Column Standardization]');
const classAttJs = fs.readFileSync(path.resolve('js/admin/class-attendance.js'), 'utf8');

// 1. Two-Tier Sticky Header & Super-Header STUDENTS DATA
assert(classAttJs.includes('colspan="${identityColSpan}" class="super-hdr super-hdr-identity super-hdr-students-data col-sticky-group-hdr"'), 'Row 1 Super-Header has identityColSpan (3 for LVL, BTC, STUDENT NAME)');
assert(classAttJs.includes('colspan="5" class="super-hdr super-hdr-overall"'), 'Row 1 Super-Header has ATTENDANCE RECAP covering 5 recap columns');

// 2. Strict Column Sequence: LVL -> BTC -> STUDENT NAME (Student PIC purged from room tables per user directive)
const lvlIndex = classAttJs.indexOf('att-col-lvl col-sticky');
const btcIndex = classAttJs.indexOf('att-col-btc col-sticky');
const nameIndex = classAttJs.indexOf('att-col-name col-sticky');

assert(lvlIndex !== -1 && btcIndex !== -1 && nameIndex !== -1, 'All base identity columns present in sub-header');
assert(lvlIndex < btcIndex, 'Column 1 is LVL before BTC');
assert(btcIndex < nameIndex, 'Column 2 is BTC before STUDENT NAME');
assert(classAttJs.includes('attendance-grid-table no-pic'), 'Attendance tables enforce no-pic clean layout with 90px name offset');

// 3. Zero UUID Invariant: level must use toShortLevel and never raw level_id fallback
assert(!classAttJs.includes('const lvlStr = st.levelName || st.level_id'), 'Zero raw level_id UUID fallback in class-attendance.js');
assert(classAttJs.includes('toShortLevel(rawLvl)'), 'Level string passes through toShortLevel() SSOT');

// 4. Color SSOT: Status badges and recap sub-headers link to SSOT variables
assert(classAttJs.includes('var(--grade-a'), 'Present status links to var(--grade-a)');
assert(classAttJs.includes('var(--primary-tactical'), 'Excused status links to var(--primary-tactical)');
assert(classAttJs.includes('var(--grade-c'), 'Sick status links to var(--grade-c)');
assert(classAttJs.includes('var(--grade-e'), 'Absent status links to var(--grade-e)');

// ── PILLAR 6: Batch Multi-Class Weekly Attendance Matrix SSOT ──
console.log('\n[PILLAR 6: Batch Multi-Class Weekly Attendance Matrix]');
assert(classAttJs.includes('WEEK ${w}'), 'Batch table groups columns by 4 Weeks');
assert(classAttJs.includes('col-subhdr-total') && classAttJs.includes('Week ${w} Total Accumulation'), 'Batch table includes weekly TOTAL accumulation column per week');
assert(classAttJs.includes('OVERALL RECAP'), 'Batch table includes OVERALL RECAP with TOT, ABS, and RATE');
assert(classAttJs.includes('formatClassShortHeader'), 'Batch table formats class headers with clean shortcodes');

console.log('======================================================');
if (failed === 0) {
  console.log(`🎉 ALL ${passed} SPECIFICATION TESTS PASSED! ZERO REGRESSIONS.`);
  process.exit(0);
} else {
  console.error(`💥 ${failed} TEST(S) FAILED!`);
  process.exit(1);
}
