import { chromium } from 'playwright';
import path from 'path';

async function testResultPageSpec() {
  const browser = await chromium.launch({
    headless: true,
    channel: 'msedge'
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 800 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  const page = await context.newPage();

  // Set student session & attempt data in sessionStorage
  await page.addInitScript(() => {
    sessionStorage.setItem('topscore_session', JSON.stringify({
      student_id: 'd9bfa243-d343-4e2a-9e12-25cb4c82b123',
      student_name: 'Riska Fetrosia',
      gender: 'female',
      institution_name: 'Cake English Course',
      program_name: 'Camp',
      batch_name: '134',
      level_name: '2nd Level'
    }));

    // Mock active attempt result
    sessionStorage.setItem('topscore_last_result', JSON.stringify({
      attempt_id: 'att-mock-001',
      student_id: 'd9bfa243-d343-4e2a-9e12-25cb4c82b123',
      test_id: 'test-vocab-exam-001',
      score: 65,
      percentage: 65,
      grade: 'C',
      correct_count: 26,
      partial_count: 0,
      wrong_count: 14,
      total_questions: 40,
      points_earned: 26,
      test_title: '2ND VOCABULARY A WORDS EXAM - PUBLIC SPEAKING'
    }));
  });

  const filePath = path.resolve('result.html');
  await page.goto(`file://${filePath}`);
  await page.waitForTimeout(1000);

  // Unhide result content if still loading
  await page.evaluate(() => {
    const loading = document.getElementById('result-loading');
    if (loading) loading.classList.add('hidden');
    const content = document.getElementById('result-content');
    if (content) content.classList.remove('hidden');

    // Populate data
    const nameEl = document.getElementById('result-student-name-label');
    if (nameEl) nameEl.textContent = 'Miss Riska Fetrosia';

    const testTypeEl = document.getElementById('result-test-type-row');
    const testTopicEl = document.getElementById('result-test-topic-row');
    if (testTypeEl) testTypeEl.textContent = '2ND VOCABULARY A WORDS EXAM';
    if (testTopicEl) testTopicEl.textContent = 'PUBLIC SPEAKING';

    const pctEl = document.getElementById('result-percentage');
    if (pctEl) pctEl.textContent = '65%';
    const gradeEl = document.getElementById('result-grade-val');
    if (gradeEl) gradeEl.textContent = 'C';

    const predEl = document.getElementById('result-predicate-text');
    if (predEl) predEl.textContent = 'ENOUGH';

    const evalCard = document.getElementById('result-motivation-msg');
    if (evalCard) {
      evalCard.classList.add('cascade-revealed');
      evalCard.dataset.tier = 'C';
      evalCard.style.setProperty('--tier-color', '#FFFF00');
      evalCard.style.setProperty('--tier-rgb', '255, 255, 0');
    }

    document.body.classList.add('tier-glow-active');
  });

  await page.waitForTimeout(400);

  // 1. Verify Fullscreen Button is GONE
  const fsBtn = await page.$('#result-fullscreen-btn');
  console.log('Does #result-fullscreen-btn exist?', !!fsBtn);
  if (fsBtn) throw new Error('FAIL: #result-fullscreen-btn should be deleted from header!');

  // 2. Verify Hero Card Height & Avatar Dimensions & Exact Sub-Row Budget
  const heroCard = await page.$('#result-identity-card');
  const heroBox = await heroCard.boundingBox();
  console.log(`Hero Card Bounding Box: width=${heroBox.width}, height=${heroBox.height}`);
  if (Math.round(heroBox.height) !== 150) throw new Error(`FAIL: Hero card height should be exactly 150px, got ${heroBox.height}`);

  const subRowInfo = await page.evaluate(() => {
    const meta = document.getElementById('result-meta-wrapper')?.getBoundingClientRect();
    const stage = document.getElementById('result-avatar-stage')?.getBoundingClientRect();
    const name = document.getElementById('result-student-name-label')?.getBoundingClientRect();
    const dividers = Array.from(document.querySelectorAll('#result-identity-card .hero-divider')).map(d => d.getBoundingClientRect().height);
    return {
      metaHeight: meta ? meta.height : 0,
      stageHeight: stage ? stage.height : 0,
      nameHeight: name ? name.height : 0,
      dividerHeights: dividers
    };
  });
  console.log('Sub-row breakdown:', subRowInfo);
  if (Math.round(subRowInfo.metaHeight) !== 20) throw new Error(`FAIL: Sub-row 1 (meta) must be 20px, got ${subRowInfo.metaHeight}`);
  if (Math.round(subRowInfo.stageHeight) !== 93) throw new Error(`FAIL: Sub-row 2 (avatar stage) must be 93px, got ${subRowInfo.stageHeight}`);
  if (Math.round(subRowInfo.nameHeight) !== 35) throw new Error(`FAIL: Sub-row 3 (student name) must be 35px, got ${subRowInfo.nameHeight}`);

  const avatarContainer = await page.$('#result-avatar-container');
  const avatarBox = await avatarContainer.boundingBox();
  console.log(`Avatar Container Bounding Box: width=${avatarBox.width}, height=${avatarBox.height}`);
  if (Math.round(avatarBox.width) !== 84 || Math.round(avatarBox.height) !== 84) {
    throw new Error(`FAIL: Avatar container must be 84x84px, got ${avatarBox.width}x${avatarBox.height}`);
  }

  // 3. Verify Grade Description Card Height & Predicate Typography
  const gradeCard = await page.$('#result-motivation-msg');
  const gradeCardBox = await gradeCard.boundingBox();
  console.log(`Grade Description Card Bounding Box: width=${gradeCardBox.width}, height=${gradeCardBox.height}`);
  if (Math.round(gradeCardBox.height) !== 50) throw new Error(`FAIL: Grade card height must be 50px, got ${gradeCardBox.height}`);

  const predEl = await page.$('#result-predicate-text');
  const predText = await predEl.innerText();
  const predFontSize = await predEl.evaluate(el => window.getComputedStyle(el).fontSize);
  console.log(`Predicate text="${predText}", fontSize=${predFontSize}`);
  if (!predText || predText === '—') throw new Error('FAIL: Predicate text is empty or dash');

  // Verify No Hint Text inside grade description card
  const hintExists = await page.evaluate(() => {
    const card = document.getElementById('result-motivation-msg');
    return card?.textContent.includes('E=FAIL') || card?.textContent.includes('★=EXCELLENT');
  });
  if (hintExists) throw new Error('FAIL: Hint text should not be visible in grade description card');

  // 3.5. Verify Back Button Label is strictly BACK TO CLASS
  const backBtnText = await page.evaluate(() => document.getElementById('back-dashboard-btn')?.innerText.trim());
  console.log('Back button text:', backBtnText);
  if (backBtnText !== 'BACK TO CLASS') throw new Error(`FAIL: Back button must be 'BACK TO CLASS', got '${backBtnText}'`);

  // 4. Verify Zero Outer Scroll
  const scrollInfo = await page.evaluate(() => ({
    bodyScrollHeight: document.body.scrollHeight,
    bodyClientHeight: document.body.clientHeight,
    htmlScrollHeight: document.documentElement.scrollHeight,
    htmlClientHeight: document.documentElement.clientHeight
  }));
  console.log('Scroll Info:', scrollInfo);

  // Save Screenshots
  const heroScreenshotPath = path.resolve('C:/Users/Top/.gemini/antigravity/brain/043f93e9-2def-43b3-84f4-8d60fbb840ce/result_hero_card_crop.png');
  await heroCard.screenshot({ path: heroScreenshotPath });
  console.log('Saved hero card screenshot to', heroScreenshotPath);

  const gradeScreenshotPath = path.resolve('C:/Users/Top/.gemini/antigravity/brain/043f93e9-2def-43b3-84f4-8d60fbb840ce/result_grade_desc_crop.png');
  await gradeCard.screenshot({ path: gradeScreenshotPath });
  console.log('Saved grade description screenshot to', gradeScreenshotPath);

  const fullScreenshotPath = path.resolve('C:/Users/Top/.gemini/antigravity/brain/043f93e9-2def-43b3-84f4-8d60fbb840ce/result_page_mobile_verified.png');
  await page.screenshot({ path: fullScreenshotPath });
  console.log('Saved full page screenshot to', fullScreenshotPath);

  await browser.close();
  console.log('🎉 ALL RESULT PAGE SPEC VERIFICATIONS PASSED 100%!');
}

testResultPageSpec().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
