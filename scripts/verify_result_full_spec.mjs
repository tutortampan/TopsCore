import puppeteer from 'puppeteer';
import path from 'path';

async function verifyResult(viewMode = 'student') {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 800 });

  await page.evaluateOnNewDocument((mode) => {
    if (mode === 'tutor') {
      sessionStorage.setItem('topscore_admin_session', JSON.stringify({
        admin_id: 'dummy-admin-id',
        role: 'tutor'
      }));
    } else {
      sessionStorage.setItem('topscore_session', JSON.stringify({
        student_id: 'dummy-student-id',
        student_name: 'Dewi Lestari',
        batch_id: 'dummy-batch'
      }));
    }
  }, viewMode);

  const query = viewMode === 'tutor' ? '?admin=true' : '';
  const resultPath = 'file:///' + path.resolve('result.html').replace(/\\/g, '/') + query;
  await page.goto(resultPath, { waitUntil: 'domcontentloaded' });

  // Simulate loaded state
  await page.evaluate((mode) => {
    const loading = document.getElementById('result-loading');
    if (loading) loading.style.display = 'none';
    const content = document.getElementById('result-content');
    if (content) content.classList.remove('hidden');

    const nameLbl = document.getElementById('result-student-name-label');
    if (nameLbl) nameLbl.textContent = 'Dewi Lestari';

    const testType = document.getElementById('result-test-type-row');
    if (testType) testType.textContent = '2ND VOCABULARY C1 WORDS TASK';
    const testTopic = document.getElementById('result-test-topic-row');
    if (testTopic) testTopic.textContent = 'SHOPPING & CHOOSING PRODUCTS';

    const resCorrect = document.getElementById('res-correct');
    if (resCorrect) resCorrect.textContent = '36';
    const resPartial = document.getElementById('res-partial');
    if (resPartial) resPartial.textContent = '0';
    const resWrong = document.getElementById('res-wrong');
    if (resWrong) resWrong.textContent = '4';
    const resPoints = document.getElementById('res-points');
    if (resPoints) resPoints.textContent = '36';

    const resPct = document.getElementById('result-percentage');
    if (resPct) resPct.textContent = '90%';

    const predEl = document.getElementById('result-predicate-text');
    if (predEl) predEl.textContent = 'VERY GOOD';

    const gradeVal = document.getElementById('result-grade-val');
    if (gradeVal) {
      gradeVal.textContent = 'A';
      gradeVal.classList.remove('grade-delayed');
      gradeVal.classList.add('grade-revealed');
    }

    const motMsg = document.getElementById('result-motivation-msg');
    if (motMsg) motMsg.classList.add('cascade-revealed');

    const actSlot = document.getElementById('smart-next-action-container');
    if (actSlot) {
      if (mode === 'tutor') {
        actSlot.innerHTML = `
          <div class="tutor-remedial-segmented" role="group">
            <button type="button" class="remedial-segment-btn segment-normal active"><span>✓</span> NORMAL</button>
            <button type="button" class="remedial-segment-btn segment-remidi"><span>●</span> REMIDI</button>
            <button type="button" class="remedial-segment-btn segment-forgive"><span>●</span> FORGIVE</button>
          </div>
        `;
      } else {
        actSlot.innerHTML = `
          <button type="button" class="btn btn-next-milestone">
            <span class="next-btn-tag">NEXT TEST</span>
            <span class="next-btn-title">SHOPPING & CHOOSING PRODUCTS ➔</span>
          </button>
        `;
      }
    }

    const backBtn = document.getElementById('back-dashboard-btn');
    if (backBtn) {
      backBtn.textContent = mode === 'tutor' ? 'BACK TO ROOM' : 'BACK TO LOBBY';
    }
  }, viewMode);

  // Measure all sections
  const measurements = await page.evaluate(() => {
    const header = document.getElementById('result-page-header');
    const studentCard = document.getElementById('result-identity-card');
    const testTitle = document.getElementById('result-Test-name-container');
    const metricsTable = document.getElementById('result-metrics-bar') || document.getElementById('result-metrics-composite-card');
    const scoreGradeRow = document.getElementById('result-score-grade-card');
    const gradeDescCard = document.getElementById('result-motivation-msg');
    const actionSlot = document.getElementById('smart-next-action-container');
    const breakdownBtn = document.getElementById('toggle-answers-btn');
    const backBtn = document.getElementById('back-dashboard-btn');
    const banner = document.getElementById('bottom-ad-banner');

    const getBox = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) };
    };

    return {
      header: getBox(header),
      studentCard: getBox(studentCard),
      testTitle: getBox(testTitle),
      metricsTable: getBox(metricsTable),
      scoreGradeRow: getBox(scoreGradeRow),
      gradeDescCard: getBox(gradeDescCard),
      actionSlot: getBox(actionSlot),
      breakdownBtn: getBox(breakdownBtn),
      backBtn: getBox(backBtn),
      banner: getBox(banner),
      hasOverflow: document.body.scrollHeight > window.innerHeight,
      windowHeight: window.innerHeight,
      scrollHeight: document.body.scrollHeight
    };
  });

  const screenshotPath = `result_${viewMode}_spec_verification.png`;
  await page.screenshot({ path: screenshotPath });
  console.log(`Result [${viewMode}] Measurements:`, JSON.stringify(measurements, null, 2));

  await browser.close();
}

async function main() {
  console.log('=== VERIFYING RESULT STUDENT VIEW ===');
  await verifyResult('student');
  console.log('=== VERIFYING RESULT TUTOR VIEW ===');
  await verifyResult('tutor');
}

main().catch(console.error);
