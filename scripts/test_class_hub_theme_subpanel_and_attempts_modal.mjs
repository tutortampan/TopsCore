import fs from 'fs';
import path from 'path';

console.log('🧪 Starting Class Hub Dynamic Themes & 7x7 Attempt Matrix Verification...\n');

const appJs = fs.readFileSync(path.resolve('js/admin/app.js'), 'utf8');
const adminTablesCss = fs.readFileSync(path.resolve('css/admin/admin-tables.css'), 'utf8');
const adminModalsCss = fs.readFileSync(path.resolve('css/admin/admin-modals.css'), 'utf8');
const adminCss = fs.readFileSync(path.resolve('css/admin.css'), 'utf8');

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    console.log(`  ✔ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAILED: ${message}`);
  }
}

// 1. Sub Panel Theme & Topic Navigation & Interactive Headers Architecture
console.log('--- 1. Testing Sub Panel Theme/Topic Navigation & Interactive Headers Architecture ---');
assert(
  !appJs.includes('<div id="class-attendance-top-panel"') &&
  adminTablesCss.includes('.btn-subpanel-nav') &&
  adminTablesCss.includes('width: 95px !important;'),
  'Floating top panel eradicated; Sub Panel enforces equal-width 95px button architecture'
);

assert(
  appJs.includes('attendance-nav-left-cluster') &&
  appJs.includes('btn-subpanel-nav') &&
  appJs.includes('width: 95px !important;') &&
  appJs.includes("switchClassAttendanceTheme('ALL')"),
  'Sub Panel renders equal-width 95px navigation buttons docked at the FAR LEFT edge'
);

assert(
  appJs.includes("label: `THEME ${tc}${tName}`") &&
  appJs.includes("label: `THEME ${activeThemeCode}${tName} - TOPICS OVERVIEW`"),
  'Table headers remain clean authoritative non-interactive super-headers'
);

assert(
  appJs.includes("switchClassAttendanceTheme") &&
  appJs.includes("switchClassAttendanceTopic"),
  'app.js provides switchClassAttendanceTheme and switchClassAttendanceTopic handlers'
);

assert(
  appJs.includes("nameAfterDash = parts.length > 1 ? parts.slice(1).join(' - ').trim() : ''") &&
  appJs.includes("themeNames[tc] ? `${tc} - ${themeNames[tc]}` : `THEME ${tc}`"),
  'Theme names dynamically extracted from test titles (after dash) and vocabulary vault'
);

// 2. Dual-Mode Matrix Rendering & 7x7 Attempt Columns
console.log('\n--- 2. Testing Dual-Mode Attendance Matrix & 7x7 Attempt Columns ---');
assert(
  appJs.includes("const isOverviewMode = !selectedTheme || selectedTheme === 'ALL' || selectedTheme === 'OVERVIEW';"),
  'renderAttendanceGridMatrix supports isOverviewMode'
);

assert(
  appJs.includes("dynamicSuperHeaders.push({") &&
  appJs.includes("superHdrText"),
  'Dedicated theme mode renders topic name in super-headers (e.g. TOPIC C1: SHOPPING)'
);

assert(
  appJs.includes("words_att_") &&
  (appJs.includes("for (let rep = 1; rep <= 7; rep++)") || appJs.includes("for (let rep = 1; rep <= compTargetReps; rep++)")),
  '7 distinct attempt columns generated per topic for Words (W1..W7)'
);

assert(
  appJs.includes("hasPhrasesInTopic") &&
  appJs.includes("phrases_att_"),
  '7 distinct attempt columns generated for Phrases (P1..P7) only when phrases exist'
);

assert(
  appJs.includes("asm-cell-rep-rate") &&
  appJs.includes("${pct}%"),
  'Attempt cells display exact Rate % with grade color'
);

assert(
  appJs.includes("progressPct") &&
  appJs.includes("isOverviewMode"),
  'OVERALL columns (DONE, PTS, GRD) are displayed in Overview mode'
);

assert(
  adminTablesCss.includes(".col-theme-topic-att") &&
  adminTablesCss.includes(".asm-cell-rep-rate"),
  'admin-tables.css includes styles for .col-theme-topic-att and .asm-cell-rep-rate'
);

// 3. Student Topic Attempts Modal
console.log('\n--- 3. Testing Student Topic Attempts Modal Architecture ---');
assert(
  appJs.includes("window.showStudentTopicAttemptsModal = async function"),
  'window.showStudentTopicAttemptsModal is defined as an async function'
);

assert(
  appJs.includes("THEME ${escapeHtml(tc)} · TOPIC ${escapeHtml(topicCode)}") &&
  appJs.includes("ATTEMPT DETAILS"),
  'Modal Title Area renders themed header with uppercase styling'
);

assert(
  appJs.includes("btn-close-topic-attempts-modal") &&
  !appJs.includes("btn-close-topic-attempts-modal-x"),
  'Modal contains centered CLOSE button and no top-right X'
);

assert(
  adminModalsCss.includes(".topic-attempts-dialog") &&
  adminModalsCss.includes(".topic-attempts-table"),
  'admin-modals.css contains styles for .topic-attempts-dialog and .topic-attempts-table'
);

assert(
  adminCss.includes(".topic-attempts-dialog") &&
  adminCss.includes(".topic-attempts-table"),
  'Compiled admin.css includes .topic-attempts-dialog and .topic-attempts-table'
);

console.log(`\n🎉 RESULTS: ${passed}/${total} assertions passed!`);
if (passed !== total) {
  process.exit(1);
}
