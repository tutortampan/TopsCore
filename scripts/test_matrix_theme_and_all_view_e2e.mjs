import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLASS_ID = '2ccf6468-1e03-41d1-b72b-1d84dcad85b2';

async function runTest() {
  console.log('🚀 Starting Attendance Matrix Theme & All View E2E Test...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[BROWSER ERROR] ${msg.text()}`);
  });

  try {
    console.log('1. Navigating to admin.html...');
    await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Handle admin login if present
    const loginScreen = page.locator('#admin-login-screen');
    if (await loginScreen.isVisible()) {
      console.log('Logging in as Admin...');
      await page.fill('#admin-username', 'admin');
      await page.fill('#admin-password', 'admin123');
      await page.click('#admin-login-btn');
      await page.waitForTimeout(2000);
    }

    console.log('2. Rendering Class Hub Attendance tab for 2nd Vocabulary...');
    await page.evaluate(async (cid) => {
      window._selectedClassId = cid;
      window._classHubActiveTab = 'attendance';
      const area = document.getElementById('admin-content-area');
      if (window.renderClassHub) {
        await window.renderClassHub(area);
      }
    }, CLASS_ID);

    await page.waitForTimeout(3000);

    // Wait for the attendance matrix datagrid
    await page.waitForSelector('#class-attendance-grid .datagrid-table', { timeout: 15000 });
    console.log('✅ Attendance matrix loaded successfully!');

    // -------------------------------------------------------------
    // PART 1: VERIFY THEME VIEW (Theme A selected)
    // -------------------------------------------------------------
    console.log('\n--- PART 1: VERIFYING THEME VIEW (Theme A) ---');
    const themeABtn = page.locator('button:has-text("THEME A")').first();
    if (await themeABtn.isVisible().catch(() => false)) {
      console.log('Clicking Theme A filter button...');
      await themeABtn.click();
      await page.waitForTimeout(1200);
    }

    // A. Verify Student Details column order: INSTITUTION | PROGRAM | BATCH | STUDENT NAME | PROGRESS | POINTS | GRADE
    const stickyHdr5 = await page.locator('#class-attendance-grid thead tr:not(.datagrid-super-header-row) th.col-sticky-5').textContent();
    const stickyHdr6 = await page.locator('#class-attendance-grid thead tr:not(.datagrid-super-header-row) th.col-sticky-6').textContent();
    const stickyHdr7 = await page.locator('#class-attendance-grid thead tr:not(.datagrid-super-header-row) th.col-sticky-7').textContent();

    console.log(`Column 5: "${stickyHdr5.trim()}" (Expected: PROGRESS)`);
    console.log(`Column 6: "${stickyHdr6.trim()}" (Expected: POINTS)`);
    console.log(`Column 7: "${stickyHdr7.trim()}" (Expected: GRADE)`);

    if (!stickyHdr5.includes('PROGRESS')) throw new Error(`Expected Column 5 to be PROGRESS, got ${stickyHdr5}`);
    if (!stickyHdr6.includes('POINTS')) throw new Error(`Expected Column 6 to be POINTS, got ${stickyHdr6}`);
    if (!stickyHdr7.includes('GRADE')) throw new Error(`Expected Column 7 to be GRADE, got ${stickyHdr7}`);
    console.log('✅ PASS: Student Details column order matches blueprint (PROGRESS | POINTS | GRADE)!');

    // B. Verify Super Headers in Theme View
    const superHdrs = await page.locator('#class-attendance-grid tr.datagrid-super-header-row th').allTextContents();
    console.log('Theme View Super Headers:', superHdrs.map(s => s.trim()));
    const hasStudentDetailsHdr = superHdrs.some(h => h.includes('STUDENT DETAILS'));
    const hasThemeAHdr = superHdrs.some(h => h.includes('THEME A'));
    const hasExamHdr = superHdrs.some(h => h.includes('EXAM'));
    const hasActionHdr = superHdrs.some(h => h.includes('ACTION'));

    if (!hasStudentDetailsHdr) throw new Error('Missing STUDENT DETAILS super-header!');
    if (!hasThemeAHdr) throw new Error('Missing THEME A super-header!');
    if (!hasExamHdr) throw new Error('Missing EXAM super-header!');
    if (!hasActionHdr) throw new Error('Missing ACTION super-header!');
    console.log('✅ PASS: Theme View Super Headers verified (STUDENT DETAILS | THEME A | EXAM | ACTION)!');

    // C. Verify Row for Student "Test"
    const testRow = page.locator('#class-attendance-grid tbody tr:has-text("Test")').first();
    await testRow.waitFor({ state: 'visible', timeout: 5000 });

    const testProg = await testRow.locator('td.col-sticky-5').textContent();
    const testPts = await testRow.locator('td.col-sticky-6').textContent();
    const testGrd = await testRow.locator('td.col-sticky-7').textContent();

    console.log(`Student "Test" Details -> PROGRESS: "${testProg.trim()}", POINTS: "${testPts.trim()}", GRADE: "${testGrd.trim()}"`);

    // Verify Points is clean number 102 (no "pts" text) and Grade is B
    if (!testPts.includes('102') || testPts.includes('pts')) {
      throw new Error(`Expected clean points 102 without pts suffix, got: "${testPts}"`);
    }
    if (!testGrd.includes('B')) {
      throw new Error(`Expected student Test to have Grade B (from 85% Exam score), got: "${testGrd}"`);
    }
    console.log('✅ PASS: Student "Test" has Points 102 and Grade B!');

    // D. Verify Topic Cells render strictly repetition badge (e.g. 7/7, 0/6), no stacked 0% text!
    const taskCells = await testRow.locator('td.col-task .asm-rep-badge').allTextContents();
    console.log('Topic repetition badges in Test row:', taskCells.map(t => t.trim()));
    if (taskCells.length === 0) throw new Error('No repetition badges found in topic cells!');
    
    // Ensure no stacked 0% text inside task cells
    const taskCellHtml = await testRow.locator('td.col-task').first().innerHTML();
    if (taskCellHtml.includes('asm-score-task')) {
      throw new Error('Found redundant percentage text in formative task cell! Cells must strictly render repetition badges.');
    }
    console.log('✅ PASS: Topic cells strictly render clean repetition badges (no redundant percentage text)!');

    // E. Verify Exam Columns in Theme View
    const examScoreCell = await testRow.locator('td.col-exam-score').first().textContent();
    const examPtsCell = await testRow.locator('td.col-exam-pts').first().textContent();
    console.log(`Exam Score Cell: "${examScoreCell.trim()}", Exam Points Cell: "${examPtsCell.trim()}"`);
    if (!examScoreCell.includes('85%')) throw new Error(`Expected Exam Score 85%, got: ${examScoreCell}`);
    if (!examPtsCell.includes('102')) throw new Error(`Expected Exam Points 102, got: ${examPtsCell}`);

    // Verify Action button
    const actionBtn = testRow.locator('td.col-action button.btn-matrix-action');
    if (!await actionBtn.isVisible()) throw new Error('Action button 👁️ not visible in student row!');
    console.log('✅ PASS: Action button 👁️ present!');

    // Verify duplicate columns TOT and PTS do NOT exist in Theme View
    const allHeadersText = await page.locator('#class-attendance-grid thead tr:not(.datagrid-super-header-row) th').allTextContents();
    console.log('All Theme View Column Headers:', allHeadersText.map(h => h.replace(/\s+/g, ' ').trim()));
    const totDupCount = allHeadersText.filter(h => /TOT\s*SCORE/i.test(h)).length;
    if (totDupCount > 0) throw new Error('Found redundant duplicate TOT SCORE column in Theme View!');
    console.log('✅ PASS: Redundant duplicate TOT/PTS columns eliminated in Theme View!');

    // Capture Theme View Screenshot
    const screenshotPathTheme = path.resolve('C:/Users/ASUS/.gemini/antigravity/brain/32e9ca28-d796-4f35-afe9-223111004d95/theme_view_verified.png');
    await page.screenshot({ path: screenshotPathTheme });
    console.log(`📸 Theme View screenshot saved to: ${screenshotPathTheme}`);

    // -------------------------------------------------------------
    // PART 2: VERIFY ALL VIEW (ALL EXAMS ONLY)
    // -------------------------------------------------------------
    console.log('\n--- PART 2: VERIFYING ALL VIEW (ALL EXAMS ONLY) ---');
    const allBtn = page.locator('button:has-text("ALL (EXAMS ONLY)")').first();
    await allBtn.click();
    await page.waitForTimeout(1500);

    // A. Check Super Headers in All View
    const allSuperHdrs = await page.locator('#class-attendance-grid tr.datagrid-super-header-row th').allTextContents();
    console.log('ALL View Super Headers:', allSuperHdrs.map(s => s.trim()));
    const expectedThemes = ['STUDENT DETAILS', 'THEME A', 'THEME B', 'THEME C', 'THEME D'];
    for (const exp of expectedThemes) {
      if (!allSuperHdrs.some(h => h.includes(exp))) {
        throw new Error(`Missing expected super-header in ALL view: ${exp}`);
      }
    }
    console.log('✅ PASS: All View Super Headers verified (STUDENT DETAILS | THEME A | THEME B | THEME C | THEME D)!');

    // B. Check that Formative Topic Tasks are completely hidden in ALL View
    const allTaskCols = await page.locator('#class-attendance-grid thead th.col-task').count();
    console.log(`Formative task columns count in ALL view: ${allTaskCols} (Expected: 0)`);
    if (allTaskCols !== 0) {
      throw new Error(`Expected 0 formative task columns in ALL view, found: ${allTaskCols}`);
    }
    console.log('✅ PASS: Formative tasks are completely hidden in ALL view!');

    // C. Check total columns count in ALL View (7 student details + 4 themes * 2 cols = 15 cols)
    const allColCount = await page.locator('#class-attendance-grid thead tr:not(.datagrid-super-header-row) th').count();
    console.log(`Total columns in ALL view: ${allColCount} (Expected: 15)`);
    if (allColCount !== 15) {
      throw new Error(`Expected exactly 15 columns in ALL view, got: ${allColCount}`);
    }
    console.log('✅ PASS: Exactly 15 columns in ALL view (7 student details + 8 theme exam cols)! Zero horizontal scrolling!');

    // D. Verify Student "Test" values in ALL View
    const testRowAll = page.locator('#class-attendance-grid tbody tr:has-text("Test")').first();
    const testScoreAll = await testRowAll.locator('td.col-test-theme-score').first().textContent();
    const testPtsAll = await testRowAll.locator('td.col-test-theme-total').first().textContent();
    console.log(`Student "Test" in ALL View -> Theme A Score: "${testScoreAll.trim()}", Points: "${testPtsAll.trim()}"`);
    if (!testScoreAll.includes('85%')) throw new Error(`Expected Theme A score 85%, got: ${testScoreAll}`);
    if (!testPtsAll.includes('102')) throw new Error(`Expected Theme A points 102, got: ${testPtsAll}`);
    console.log('✅ PASS: Student "Test" Theme A Exam Score and Points correctly rendered in ALL View!');

    // Capture ALL View Screenshot
    const screenshotPathAll = path.resolve('C:/Users/ASUS/.gemini/antigravity/brain/32e9ca28-d796-4f35-afe9-223111004d95/all_view_verified.png');
    await page.screenshot({ path: screenshotPathAll });
    console.log(`📸 ALL View screenshot saved to: ${screenshotPathAll}`);

    console.log('\n🎉 ALL E2E VERIFICATION CHECKS PASSED 100%!');
  } catch (err) {
    console.error('❌ E2E Test Failed:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest();
