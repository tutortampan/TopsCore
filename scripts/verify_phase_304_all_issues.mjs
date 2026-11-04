// scripts/verify_phase_304_all_issues.mjs
// Verification of Phase 304 fixes:
// 1. Task question count (40 instead of 120) and topic isolation.
// 2. Permanent 50px Top Banner and 50px Bottom Banner in test.html across viewports.
// 3. Strict Level Isolation in fetchStudentClasses & dashboard.html Select Class modal.

import { chromium } from 'playwright';

global.window = {
  addEventListener: () => {},
  location: { hostname: 'localhost' },
  localStorage: { getItem: () => null, setItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {} }
};

const { getSupabase } = await import('../js/supabase.js');
const { generateTestQuestions, fetchStudentClasses } = await import('../js/api.js');
const sb = await getSupabase();

console.log('=== PHASE 304 COMPREHENSIVE VERIFICATION ===\n');

let passCount = 0;
let totalChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    console.log(`✅ PASS [${totalChecks}]: ${message}`);
    passCount++;
  } else {
    console.error(`❌ FAIL [${totalChecks}]: ${message}`);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------
// CHECK 1: Task Question Count & Topic Code Isolation
// -------------------------------------------------------------
console.log('--- CHECK 1: Task 2A1-WORDS-TASK Question Generation ---');
const TASK_2A1_ID = '6746ce4b-7628-4521-9932-0167f9e5573e';
const { data: testRec } = await sb.from('tests').select('*').eq('id', TASK_2A1_ID).single();
const taskQuestions = await generateTestQuestions(sb, testRec);

assert(taskQuestions.length === 40, `Task questions count must be exactly 40 (got ${taskQuestions.length})`);

const topics = [...new Set(taskQuestions.map(q => q.topic_snapshot))];
assert(topics.length === 1 && topics[0] === 'Introduction & Delivery', `All questions must belong strictly to Topic A1 'Introduction & Delivery' (got ${JSON.stringify(topics)})`);

const hasMenarik = taskQuestions.some(q => (q.question_text_snapshot || '').toLowerCase().includes('menarik'));
assert(!hasMenarik, `Word 'Menarik' (from Topic A3) must NOT be present in Task A1`);

// -------------------------------------------------------------
// CHECK 2: Strict Level Isolation for Student Classes
// -------------------------------------------------------------
console.log('\n--- CHECK 2: fetchStudentClasses Strict Level Isolation ---');
const PROGRAM_ID = '11deb53c-434a-44b0-83ca-1cc9b239cab3'; // Camp
const INSTITUTION_ID = 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447'; // CEC
const LEVEL_2_ID = '9936683a-5b4a-4796-bb5d-a7fd8ecf0b71'; // 2nd Level

const lvl2Classes = await fetchStudentClasses(PROGRAM_ID, INSTITUTION_ID, LEVEL_2_ID);
assert(lvl2Classes.length > 0, `Level 2 classes must not be empty (got ${lvl2Classes.length})`);

const hasLvl1Class = lvl2Classes.some(c => c.name.toLowerCase().includes('1st'));
assert(!hasLvl1Class, `Classes for Level 2 student must NOT contain '1st Vocabulary' or any 1st Level class`);

const hasLvl2Class = lvl2Classes.some(c => c.name === '2nd Vocabulary');
assert(hasLvl2Class, `Classes for Level 2 student must contain '2nd Vocabulary'`);

// -------------------------------------------------------------
// CHECK 3: Browser E2E - Permanent Banners in test.html
// -------------------------------------------------------------
console.log('\n--- CHECK 3: Browser E2E - test.html 50px Top and Bottom Banners ---');
const browser = await chromium.launch({ channel: 'msedge', headless: true });

for (const vpH of [820, 740, 667]) {
  const page = await browser.newPage({ viewport: { width: 375, height: vpH } });
  await page.addInitScript(() => {
    sessionStorage.setItem('topscore_session', JSON.stringify({
      student_id: '0694c6f5-076c-43d1-99ee-0a8800975bcb',
      student_name: 'Mr. Test',
      institution_id: 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447',
      program_id: '11deb53c-434a-44b0-83ca-1cc9b239cab3',
      level_id: '9936683a-5b4a-4796-bb5d-a7fd8ecf0b71',
      batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7',
      level_number: 2,
      batch_name: '134'
    }));
  });

  await page.goto('http://127.0.0.1:5500/test.html?test_id=' + TASK_2A1_ID);
  await page.waitForTimeout(2500);

  const metrics = await page.evaluate(() => {
    const vpHeight = window.innerHeight;
    const topHeader = document.querySelector('#test-top-header')?.getBoundingClientRect();
    const banner = document.querySelector('#bottom-ad-banner')?.getBoundingClientRect();
    const counterText = document.querySelector('#question-counter-text')?.textContent;
    return {
      vpHeight,
      topHeaderHeight: topHeader ? Math.round(topHeader.height) : 0,
      topHeaderTop: topHeader ? Math.round(topHeader.top) : -1,
      bannerHeight: banner ? Math.round(banner.height) : 0,
      bannerBottom: banner ? Math.round(banner.bottom) : 0,
      bannerVisible: banner ? (banner.bottom <= vpHeight && banner.top >= 0) : false,
      counterText
    };
  });

  assert(metrics.topHeaderHeight === 50, `Viewport ${vpH}px: Top banner must measure exactly 50px (got ${metrics.topHeaderHeight}px)`);
  assert(metrics.topHeaderTop === 0, `Viewport ${vpH}px: Top banner must dock at top: 0px (got ${metrics.topHeaderTop}px)`);
  assert(metrics.bannerHeight === 50, `Viewport ${vpH}px: Bottom banner must measure exactly 50px (got ${metrics.bannerHeight}px)`);
  assert(metrics.bannerVisible, `Viewport ${vpH}px: Bottom banner must be 100% visible inside viewport without cutoff`);
  assert(metrics.counterText === '0/40 Answered', `Viewport ${vpH}px: Counter must display '0/40 Answered' (got '${metrics.counterText}')`);
  await page.close();
}

// -------------------------------------------------------------
// CHECK 4: Browser E2E - dashboard.html Select Class Modal
// -------------------------------------------------------------
console.log('\n--- CHECK 4: Browser E2E - dashboard.html Select Class Modal ---');
const dashPage = await browser.newPage({ viewport: { width: 412, height: 820 } });
await dashPage.addInitScript(() => {
  sessionStorage.setItem('topscore_session', JSON.stringify({
    student_id: '0694c6f5-076c-43d1-99ee-0a8800975bcb',
    student_name: 'Mr. Test',
    institution_id: 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447',
    program_id: '11deb53c-434a-44b0-83ca-1cc9b239cab3',
    level_id: '9936683a-5b4a-4796-bb5d-a7fd8ecf0b71',
    batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7',
    level_number: 2,
    level_name: '2nd Level',
    batch_name: '134'
  }));
});

await dashPage.goto('http://127.0.0.1:5500/dashboard.html');
await dashPage.waitForTimeout(3000);

await dashPage.evaluate(() => {
  window.location.hash = '#select-class';
});
await dashPage.waitForTimeout(1000);

const dashMetrics = await dashPage.evaluate(() => {
  const items = Array.from(document.querySelectorAll('#classes-selector-modal-list .classes-selector-item')).map(el => el.textContent.trim());
  const currentClassName = document.querySelector('#classes-bar-current-name')?.textContent;
  return { items, currentClassName };
});

assert(dashMetrics.items.some(item => item.includes('2nd Vocabulary')), `Select Class modal must list '2nd Vocabulary'`);
assert(!dashMetrics.items.some(item => item.includes('1st Vocabulary')), `Select Class modal must NOT list '1st Vocabulary' for Level 2 student`);
assert(dashMetrics.currentClassName === '2nd Vocabulary', `Current active class on dashboard must be '2nd Vocabulary' (got '${dashMetrics.currentClassName}')`);

await dashPage.close();
await browser.close();

console.log(`\n========================================`);
console.log(`ALL CHECKS COMPLETED: ${passCount} / ${totalChecks} PASSED!`);
console.log(`========================================\n`);

if (passCount !== totalChecks) {
  process.exit(1);
}

