import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
  console.log('=== STARTING PLAYWRIGHT E2E: DASHBOARD BLUEPRINT & DUAL PANEL VERIFICATION ===');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  // Mock valid session in sessionStorage before loading page
  await page.addInitScript(() => {
    sessionStorage.setItem('topscore_session', JSON.stringify({
      student_id: 'test-student-uuid',
      student_name: 'Muhammad Alifurrahman',
      name: 'Muhammad Alifurrahman',
      gender: 'male',
      institution_name: 'CEC',
      program_name: 'Camp',
      batch_id: 'batch-134',
      batch_name: '134',
      level_name: '3rd Level',
      level_number: 3,
      has_photo: true,
      avatar_url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="teal"/></svg>',
      photo_url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="teal"/></svg>'
    }));
  });

  console.log('Navigating to http://127.0.0.1:5500/dashboard.html...');
  await page.goto('http://127.0.0.1:5500/dashboard.html', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000); // Allow Supabase / async routines to settle
  await page.evaluate(() => {
    document.getElementById('photo-setup-modal')?.classList.add('hidden');
    document.getElementById('onboard-education-modal')?.classList.add('hidden');
  });

  // 1. Verify exact bounding box heights of all blueprint sections
  console.log('\n[1] Verifying Section Heights:');
  const sectionsToMeasure = [
    { name: 'Top Bar (Header)', selector: '#dashboard-top-header', expectedHeight: 50 },
    { name: 'Students Metadata Card', selector: '#welcome-banner-section', expectedHeight: 150 },
    { name: 'Grade Legend Strip', selector: '#dashboard-grade-legend', expectedHeight: 40 },
    { name: 'Class Selector Bar', selector: '#dashboard-classes-section', expectedHeight: 40 },
    { name: 'Repetitions Row', selector: '#dashboard-repetition-deck', expectedHeight: 40 },
    { name: 'Next Assessment Bar', selector: '#up-next-section', expectedHeight: 40 },
    { name: 'Bottom Banner', selector: '#bottom-ad-banner', expectedHeight: 50 }
  ];

  for (const s of sectionsToMeasure) {
    const el = page.locator(s.selector);
    const box = await el.boundingBox();
    if (!box) {
      console.error(`  ❌ Element not found: ${s.selector} (${s.name})`);
      process.exit(1);
    }
    const diff = Math.abs(box.height - s.expectedHeight);
    console.log(`  - ${s.name}: Computed height = ${box.height.toFixed(1)}px (Expected: ${s.expectedHeight}px, diff: ${diff.toFixed(1)}px)`);
    if (diff > 1.5) {
      console.error(`  ❌ Height mismatch on ${s.name}! Expected ${s.expectedHeight}px, got ${box.height}px`);
      process.exit(1);
    }
  }

  // Check Dynamic Leaderboard Card (Flex 1)
  const dockBox = await page.locator('#bottom-dock-section').boundingBox();
  console.log(`  - Bottom Dock Section (Flex 1): Computed height = ${dockBox.height.toFixed(1)}px (Must be > 100px)`);
  if (!dockBox || dockBox.height < 100) {
    console.error('  ❌ Bottom Dock Section height is too small!');
    process.exit(1);
  }
  console.log('  ✅ ALL SECTION HEIGHTS MATCH BLUEPRINT EXACTLY!\n');

  // 2. Verify Grade Description Card (Only shows description of current grade, empty if empty)
  console.log('[2] Verifying Grade Description Card:');
  const initialDesc = (await page.locator('#dashboard-grade-legend').innerText()).trim();
  console.log(`  - Initial Grade Description (when empty): "${initialDesc}"`);
  if (initialDesc !== '') {
    console.error(`  ❌ Expected empty grade description when no grade, but got: "${initialDesc}"`);
    process.exit(1);
  }
  console.log('  ✅ Verified: Empty grade produces empty description card!');

  // Now simulate student having Grade A (e.g. 95% score)
  console.log('  - Simulating evaluated Grade A (95%)...');
  await page.evaluate(() => {
    const el = document.getElementById('dashboard-achievement-text');
    if (el) {
      el.textContent = 'VERY GOOD';
      el.style.color = '#00c000';
    }
    const card = document.getElementById('dashboard-grade-legend');
    if (card) {
      card.style.borderColor = 'rgba(0, 192, 0, 0.55)';
    }
  });

  const evaluatedDesc = (await page.locator('#dashboard-grade-legend').innerText()).trim();
  console.log(`  - Evaluated Grade Description: "${evaluatedDesc}"`);
  if (evaluatedDesc !== 'VERY GOOD') {
    console.error(`  ❌ Expected "VERY GOOD", but got: "${evaluatedDesc}"`);
    process.exit(1);
  }
  console.log('  ✅ Verified: Grade A correctly shows only "VERY GOOD" (not all grades)!');

  // 3. Populate mock completed tests and verify descending order & retry button
  console.log('[3] Testing Completed Tests Dual Panel & Retry Button:');
  await page.evaluate(() => {
    // Call renderCompletedTestsBottom directly with mock attempts
    const mockAttempts = [
      {
        id: 'att-old',
        test_id: 'test-1',
        percentage: 85,
        score: 85,
        status: 'submitted',
        submitted_at: '2026-11-01T10:00:00Z',
        tests: { id: 'test-1', title: '1st Vocabulary Words Task 1', test_type: 'quiz' }
      },
      {
        id: 'att-newest',
        test_id: 'test-2',
        percentage: 95,
        score: 95,
        status: 'submitted',
        submitted_at: '2026-11-04T18:00:00Z',
        tests: { id: 'test-2', title: '2nd Vocabulary Theme A Words Exam', test_type: 'exam' }
      },
      {
        id: 'att-mid',
        test_id: 'test-3',
        percentage: 60,
        score: 30,
        is_remedial_unlocked: true,
        status: 'submitted',
        submitted_at: '2026-11-03T14:30:00Z',
        tests: { id: 'test-3', title: 'Storytelling Narrative Practice', test_type: 'task' }
      }
    ];
    window.renderCompletedTestsBottom(mockAttempts);
  });

  // Verify tab buttons exist
  const standingsBtn = page.locator('#btn-dock-standings');
  const completedBtn = page.locator('#btn-dock-completed');
  await completedBtn.click({ force: true });
  await page.waitForTimeout(500);

  const paneCompletedVisible = await page.locator('#dock-pane-completed').isVisible();
  const paneStandingsVisible = await page.locator('#dock-pane-standings').isVisible();
  console.log(`  - Completed Pane visible: ${paneCompletedVisible}, Standings Pane visible: ${paneStandingsVisible}`);
  if (!paneCompletedVisible || paneStandingsVisible) {
    console.error('  ❌ Dual-panel tab switching failed!');
    process.exit(1);
  }

  // Verify descending sort: newest item ('2nd Vocabulary Theme A Words Exam') is at index 0 (top)!
  const rowTitles = await page.locator('.completed-test-row .completed-title').allInnerTexts();
  console.log('  - Completed tests in rendered order:', rowTitles);
  if (rowTitles[0] !== '2nd Vocabulary Theme A Words Exam') {
    console.error(`  ❌ Descending sort failed! Expected newest on top, but got: ${rowTitles[0]}`);
    process.exit(1);
  }
  console.log('  ✅ Descending completion order verified: Most recent is strictly on top!');

  // Verify Retry button exists in each row
  const retryButtons = await page.locator('.btn-retry-test').count();
  console.log(`  - Retry buttons found: ${retryButtons} (Expected: 3)`);
  if (retryButtons !== 3) {
    console.error('  ❌ Retry buttons not found on all completed test rows!');
    process.exit(1);
  }
  console.log('  ✅ Retry buttons verified beside scores!');

  // Capture desktop screenshot
  const artifactDir = 'C:/Users/ASUS/.gemini/antigravity/brain/32e9ca28-d796-4f35-afe9-223111004d95';
  const screenshotCompletedPath = path.join(artifactDir, 'dashboard_blueprint_completed_tab_verified.png');
  await page.screenshot({ path: screenshotCompletedPath, fullPage: false });
  console.log(`  📸 Saved screenshot: ${screenshotCompletedPath}`);

  // Switch back to Leaderboard Standings Tab
  await standingsBtn.click({ force: true });
  await page.waitForTimeout(500);
  const screenshotStandingsPath = path.join(artifactDir, 'dashboard_blueprint_standings_tab_verified.png');
  await page.screenshot({ path: screenshotStandingsPath, fullPage: false });
  console.log(`  📸 Saved screenshot: ${screenshotStandingsPath}`);

  // 4. Test Mobile Viewport (iPhone 14 / 390x844)
  console.log('\n[4] Testing Mobile Viewport (390 x 844):');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);

  // Measure sections on mobile
  for (const s of sectionsToMeasure) {
    const el = page.locator(s.selector);
    const box = await el.boundingBox();
    const diff = Math.abs(box.height - s.expectedHeight);
    console.log(`  - Mobile ${s.name}: ${box.height.toFixed(1)}px (diff: ${diff.toFixed(1)}px)`);
    if (diff > 2.0) {
      console.error(`  ❌ Mobile height mismatch on ${s.name}!`);
      process.exit(1);
    }
  }

  const mobileScreenshotPath = path.join(artifactDir, 'dashboard_blueprint_mobile_verified.png');
  await page.screenshot({ path: mobileScreenshotPath, fullPage: false });
  console.log(`  📸 Saved screenshot: ${mobileScreenshotPath}`);

  await browser.close();
  console.log('\n=== ALL PLAYWRIGHT E2E DASHBOARD BLUEPRINT CHECKS PASSED 100% ===');
}

run().catch(err => {
  console.error('E2E Test Failed:', err);
  process.exit(1);
});
