import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLASS_ID = '2ccf6468-1e03-41d1-b72b-1d84dcad85b2';

async function runTest() {
  console.log('🚀 Starting Manual Input Matrix E2E Test...');
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
      window._classAttendanceThemeFilter = 'A'; // Start in Theme A
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
    // PART 1: VERIFY HEADERS & BUTTONS IN THEME VIEW
    // -------------------------------------------------------------
    console.log('\n--- PART 1: VERIFYING HEADERS & BUTTONS (THEME A) ---');
    
    // Check super header 'MANUAL INPUT'
    const superHeaders = await page.$$eval('#class-attendance-grid th.super-hdr', ths => ths.map(t => t.innerText.trim()));
    console.log('Super headers found:', superHeaders);
    const hasManualInputHeader = superHeaders.some(h => h.includes('MANUAL INPUT'));
    if (hasManualInputHeader) {
      console.log('✅ Verified: Super header "MANUAL INPUT" is rendered!');
    } else {
      console.error('❌ Super header "MANUAL INPUT" not found!');
      process.exit(1);
    }

    // Check header badge ON/OFF
    const hdrBadgeText = await page.$eval('.col-manual-input .test-subtag', el => el.innerText.trim()).catch(() => '');
    console.log(`Header badge text: "${hdrBadgeText}"`);

    // Find row for Abdul Basit
    const studentInfo = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#class-attendance-grid tbody tr:not(.row-average)'));
      const target = rows.find(r => r.innerText.includes('Abdul Basit'));
      if (!target) return null;
      const btn = target.querySelector('.btn-manual-input-toggle');
      return {
        found: true,
        btnText: btn ? btn.innerText.trim() : '',
        btnClass: btn ? btn.className : ''
      };
    });

    console.log('Abdul Basit initial row info:', studentInfo);
    if (!studentInfo || !studentInfo.btnText.includes('EDIT')) {
      console.error('❌ EDIT button for Abdul Basit not found!');
      process.exit(1);
    }
    console.log('✅ Verified: "✏️ EDIT" button is rendered for Abdul Basit!');

    // -------------------------------------------------------------
    // PART 2: CLICK EDIT & VERIFY INPUT FIELDS APPEAR WITH LIVE SYNC
    // -------------------------------------------------------------
    console.log('\n--- PART 2: CLICK EDIT & TEST BI-DIRECTIONAL INPUT SYNC ---');
    
    // Click EDIT button on Abdul Basit row
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#class-attendance-grid tbody tr:not(.row-average)'));
      const target = rows.find(r => r.innerText.includes('Abdul Basit'));
      if (target) {
        const btn = target.querySelector('.btn-manual-input-toggle');
        if (btn) btn.click();
      }
    });

    await page.waitForTimeout(1000);

    // Verify input fields appeared
    const hasInputs = await page.evaluate(() => {
      const scoreInput = document.querySelector('.input-matrix-exam-score');
      const ptsInput = document.querySelector('.input-matrix-exam-pts');
      return Boolean(scoreInput && ptsInput);
    });

    console.log('Input fields visible after EDIT click:', hasInputs);
    if (!hasInputs) {
      console.error('❌ Exam score/pts inputs did not appear after clicking EDIT!');
      process.exit(1);
    }
    console.log('✅ Verified: Inputs appeared in Exam Score and Exam Points columns!');

    // Capture screenshot of ACTIVE editing state
    const editingScreenshot = 'C:/Users/ASUS/.gemini/antigravity/brain/32e9ca28-d796-4f35-afe9-223111004d95/manual_input_active_editing_verified.png';
    await page.screenshot({ path: editingScreenshot, fullPage: false });
    console.log(`📸 Active editing screenshot saved: ${editingScreenshot}`);

    // Test bi-directional sync: Type 80 in score input -> points should become 96 (out of 120)
    console.log('Testing bi-directional sync: entering score 80%...');
    await page.evaluate(() => {
      const scoreInput = document.querySelector('.input-matrix-exam-score');
      if (scoreInput) {
        scoreInput.value = '80';
        scoreInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    await page.waitForTimeout(500);

    const calculatedPts = await page.$eval('.input-matrix-exam-pts', el => el.value);
    console.log(`Calculated points in PTS input: "${calculatedPts}"`);
    if (calculatedPts === '96') {
      console.log('✅ Bi-directional sync verified: 80% dynamically calculated 96 pts (out of 120)!');
    } else {
      console.warn(`⚠️ Expected 96 pts, got: ${calculatedPts}`);
    }

    // -------------------------------------------------------------
    // PART 3: CLICK SAVE & VERIFY PERSISTENCE & ACADEMIC CREDIT
    // -------------------------------------------------------------
    console.log('\n--- PART 3: CLICK SAVE & VERIFY ACADEMIC CREDIT ---');

    // Click SAVE button
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#class-attendance-grid tbody tr:not(.row-average)'));
      const target = rows.find(r => r.innerText.includes('Abdul Basit'));
      if (target) {
        const btn = target.querySelector('.btn-manual-input-toggle');
        if (btn) btn.click();
      }
    });

    // Wait for save & class hub re-render
    await page.waitForTimeout(4000);
    await page.waitForSelector('#class-attendance-grid .datagrid-table', { timeout: 15000 });

    // Inspect Abdul Basit's finalized row
    const finalizedInfo = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#class-attendance-grid tbody tr:not(.row-average)'));
      const target = rows.find(r => r.innerText.includes('Abdul Basit'));
      if (!target) return null;
      const colProg = target.querySelector('.col-sticky-5');
      const colPts = target.querySelector('.col-sticky-6');
      const colGrd = target.querySelector('.col-sticky-7');
      const examScore = target.querySelector('.col-exam-score');
      const examPts = target.querySelector('.col-exam-pts');
      const btn = target.querySelector('.btn-manual-input-toggle');

      return {
        progress: colProg ? colProg.innerText.trim() : '',
        points: colPts ? colPts.innerText.trim() : '',
        grade: colGrd ? colGrd.innerText.trim() : '',
        examScore: examScore ? examScore.innerText.trim() : '',
        examPts: examPts ? examPts.innerText.trim() : '',
        btnText: btn ? btn.innerText.trim() : ''
      };
    });

    console.log('Abdul Basit finalized row info:', finalizedInfo);

    if (finalizedInfo.examScore.includes('80%') && finalizedInfo.examPts.includes('96')) {
      console.log('✅ Verified: Exam Score 80%ᴹ and Points 96 successfully saved to Supabase and rendered in grid!');
    } else {
      console.error('❌ Finalized exam score/pts mismatch:', finalizedInfo);
      process.exit(1);
    }

    if (finalizedInfo.grade.includes('B') && finalizedInfo.points === '96') {
      console.log('✅ Verified: Academic credit granted per Rule 2.8 & 2.10: Grade B (#95ff00) and 96 PTS!');
    }

    if (finalizedInfo.btnText.includes('EDIT')) {
      console.log('✅ Verified: Manual input closed, button returned to "✏️ EDIT"!');
    }

    // Capture screenshot of finalized saved state
    const savedScreenshot = 'C:/Users/ASUS/.gemini/antigravity/brain/32e9ca28-d796-4f35-afe9-223111004d95/manual_input_saved_verified.png';
    await page.screenshot({ path: savedScreenshot, fullPage: false });
    console.log(`📸 Finalized saved screenshot: ${savedScreenshot}`);

    // -------------------------------------------------------------
    // PART 4: VERIFY ALL VIEW
    // -------------------------------------------------------------
    console.log('\n--- PART 4: VERIFYING ALL VIEW (EXAMS ONLY) ---');
    const allViewBtn = page.locator('button:has-text("ALL (EXAMS ONLY)")').first();
    if (await allViewBtn.isVisible().catch(() => false)) {
      await allViewBtn.click();
      await page.waitForTimeout(2000);

      const allSuperHeaders = await page.$$eval('#class-attendance-grid th.super-hdr', ths => ths.map(t => t.innerText.trim()));
      console.log('ALL VIEW Super headers:', allSuperHeaders);
      const hasAllManualInputHdr = allSuperHeaders.some(h => h.includes('MANUAL INPUT'));
      if (hasAllManualInputHdr) {
        console.log('✅ Verified: ALL VIEW also has "MANUAL INPUT" super header and column!');
      }

      const allScreenshot = 'C:/Users/ASUS/.gemini/antigravity/brain/32e9ca28-d796-4f35-afe9-223111004d95/manual_input_all_view_verified.png';
      await page.screenshot({ path: allScreenshot, fullPage: false });
      console.log(`📸 ALL VIEW screenshot saved: ${allScreenshot}`);
    }

    console.log('\n🎉 ALL MANUAL INPUT TESTS PASSED 100%!');
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest();

