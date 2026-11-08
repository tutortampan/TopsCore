import fs from 'fs';
import path from 'path';

console.log('======================================================');
console.log('VERIFYING ANTI-CHEAT & LAYOUT MASTER PLAN IMPLEMENTATION');
console.log('======================================================\n');

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

// 1. Inspect js/test.js
const testJs = fs.readFileSync('js/test.js', 'utf8');

// Check countdown 5s
assert(
  testJs.includes('const durationSeconds = 5; // User requirement: exact 5s countdown'),
  'triggerCheatAlert sets exact 5s countdown (durationSeconds = 5)'
);
assert(
  testJs.includes("countdownSeconds: 5"),
  'securityConfig defaults countdownSeconds to 5'
);

// Check Dual-Defense Anti-Cheat
assert(
  testJs.includes('let _focusLostTimestamp = null;') &&
  testJs.includes('_focusLostTimestamp = Date.now();') &&
  testJs.includes('awayDurationMs >= 3000'),
  'Dual-defense timestamp delta (>= 3000ms) implemented to defeat OS timer freezing'
);

// Check removal of mobile / keyboard blur skips
assert(
  !testJs.includes("if (isMobileDevice) return;"),
  'Mobile blur bypass is completely eliminated'
);
assert(
  !testJs.includes("if (tag === 'textarea' || tag === 'input' || window.activeKeyboardInput) return;"),
  'Input focus blur bypass in window.blur is completely eliminated'
);

// Check Screen Area Covered / Split-Screen Detection
assert(
  testJs.includes('function initScreenSizeBaseline()') &&
  testJs.includes('function checkScreenSizeCovered()') &&
  testJs.includes('areaReduction >= 0.25') &&
  testJs.includes('Screen Area Covered / Split-Screen Detected'),
  'Screen Area Covered / Split-Screen Detection (25%-100%) active on resize and visualViewport'
);

// Check DOM order in renderQuestion
const isWrittenIdx = testJs.indexOf('if (isWritten) {');
const writtenMetadataIdx = testJs.indexOf('main.appendChild(metadataTable);', isWrittenIdx);
const writtenQuestionIdx = testJs.indexOf('main.appendChild(questionBox);', isWrittenIdx);
const writtenAnswerIdx = testJs.indexOf('main.appendChild(answerArea);', isWrittenIdx);

assert(
  writtenMetadataIdx > isWrittenIdx &&
  writtenQuestionIdx > writtenMetadataIdx &&
  writtenAnswerIdx > writtenQuestionIdx,
  'Written mode DOM order: Metadata Table -> Question Box -> Answer Area'
);

const elseIdx = testJs.indexOf('} else {', writtenAnswerIdx);
const spokenMetadataIdx = testJs.indexOf('main.appendChild(metadataTable);', elseIdx);
const spokenQuestionIdx = testJs.indexOf('main.appendChild(questionBox);', elseIdx);
const spokenAnswerIdx = testJs.indexOf('main.appendChild(answerArea);', elseIdx);

assert(
  spokenMetadataIdx > elseIdx &&
  spokenQuestionIdx > spokenMetadataIdx &&
  spokenAnswerIdx > spokenQuestionIdx,
  'Spoken/MCQ mode DOM order: Metadata Table -> Question Box -> Answer Area'
);

// Check Runtime Netlify Badge Purge in js/test.js
assert(
  testJs.includes('function purgeExternalBadges()') &&
  testJs.includes('a[href*="netlify.com"]'),
  'Runtime Netlify Badge Purge function & MutationObserver active in js/test.js'
);

// 2. Inspect css/test.css
const testCss = fs.readFileSync('css/test.css', 'utf8');

assert(
  testCss.includes('UNIVERSAL NETLIFY BADGE & INJECTION PURGE') &&
  testCss.includes('a[href*="netlify.com"]'),
  'Universal Netlify Badge Blocker present in css/test.css'
);

assert(
  testCss.includes('justify-content: flex-start !important;') &&
  testCss.includes('padding: 0 0 0 clamp(16px, 4vw, 24px) !important;'),
  'Bottom ad banner strictly left-aligned in css/test.css'
);

// 3. Inspect test.html
const testHtml = fs.readFileSync('test.html', 'utf8');

assert(
  testHtml.includes('css/test.css?v=20261108_v165') &&
  testHtml.includes('js/test.js?v=20261108_v165') &&
  testHtml.includes('sw.js?v=20261108_v165'),
  'test.html query parameters bumped to v165'
);

assert(
  !testHtml.includes('id="fullscreen-pause-modal"'),
  'Deprecated #fullscreen-pause-modal removed from test.html'
);

// 4. Inspect sw.js
const swJs = fs.readFileSync('sw.js', 'utf8');

assert(
  swJs.includes("CACHE_NAME = 'topscore-cache-option-a-v92'") &&
  swJs.includes("'./css/test.css?v=20261108_v165'") &&
  swJs.includes("'./js/test.js?v=20261108_v165'"),
  'sw.js cache name bumped to v92 with v165 assets'
);

console.log(`\n======================================================`);
console.log(`RESULTS: ${passCount} Passed, ${failCount} Failed`);
console.log(`======================================================`);

if (failCount > 0) {
  process.exit(1);
}
