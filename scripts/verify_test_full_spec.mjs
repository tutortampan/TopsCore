import puppeteer from 'puppeteer';
import path from 'path';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 800 });

  await page.evaluateOnNewDocument(() => {
    sessionStorage.setItem('topscore_session', JSON.stringify({
      student_id: 'dummy-student-id',
      student_name: 'Test Student',
      batch_id: 'dummy-batch'
    }));
  });

  const testPath = 'file:///' + path.resolve('test.html').replace(/\\/g, '/');
  await page.goto(testPath, { waitUntil: 'domcontentloaded' });

  // Simulate spoken question
  await page.evaluate(() => {
    const titleEl = document.getElementById('test-main-title');
    if (titleEl) titleEl.textContent = '2nd Vocabulary C1 Words Task';
    const subEl = document.getElementById('test-title-sub');
    if (subEl) subEl.textContent = 'SHOPPING & CHOOSING PRODUCTS';

    const main = document.getElementById('test-main');
    if (main) {
      main.innerHTML = `
        <div id="question-interaction-group" style="flex:1; display:flex; flex-direction:column; gap:6px; width:100%; box-sizing:border-box;">
          <div class="question-box-prompt" style="flex:4; min-height:0; display:flex; align-items:center; justify-content:center; background:#1e293b; border-radius:14px;">
            <div style="font-size:24px; font-weight:800; color:#fff;">Berguna</div>
          </div>
          <div class="metadata-grid" style="flex:2; min-height:0; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; gap:3px;">
            <div style="background:#0f172a; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:10px; color:#34d399;">SHOPPING ESSENTIALS</div>
            <div style="background:#0f172a; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:10px; color:#cbd5e1;">WORDS</div>
            <div style="background:#0f172a; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:10px; color:#38bdf8;">SHOPPING & CHOOSING</div>
            <div style="background:#0f172a; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:10px; color:#f8fafc;">ADJECTIVE</div>
          </div>
          <div style="flex:4; min-height:0; display:flex; align-items:center; justify-content:center; background:#1e293b; border-radius:14px; color:#38bdf8; font-size:20px; font-weight:800;">
            Listening...
          </div>
        </div>
        <div class="speech-mic-panel" style="height:186px; min-height:186px; max-height:186px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#0f172a; border-radius:14px;">
          <div style="width:64px; height:64px; border-radius:50%; background:#22c55e; display:flex; align-items:center; justify-content:center; font-size:24px;">🎤</div>
          <div style="font-size:12px; color:#94a3b8; margin-top:8px;">Tap to Speak</div>
        </div>
      `;
    }
  });

  const measurements = await page.evaluate(() => {
    const topHeader = document.getElementById('test-top-header');
    const controlsBar = document.getElementById('test-controls-bar');
    const testBody = document.querySelector('.test-body');
    const bottomArea = document.getElementById('fixed-bottom-area');
    const banner = document.getElementById('bottom-ad-banner');

    const topRect = topHeader ? topHeader.getBoundingClientRect() : null;
    const ctrlRect = controlsBar ? controlsBar.getBoundingClientRect() : null;
    const bodyRect = testBody ? testBody.getBoundingClientRect() : null;
    const btmRect = bottomArea ? bottomArea.getBoundingClientRect() : null;
    const bnrRect = banner ? banner.getBoundingClientRect() : null;

    return {
      topHeader: topRect ? { top: Math.round(topRect.top), bottom: Math.round(topRect.bottom), height: Math.round(topRect.height) } : null,
      gapTopToCtrl: (topRect && ctrlRect) ? Math.round(ctrlRect.top - topRect.bottom) : null,
      controlsBar: ctrlRect ? { top: Math.round(ctrlRect.top), bottom: Math.round(ctrlRect.bottom), height: Math.round(ctrlRect.height) } : null,
      gapCtrlToBody: (ctrlRect && bodyRect) ? Math.round(bodyRect.top - ctrlRect.bottom) : null,
      testBody: bodyRect ? { top: Math.round(bodyRect.top), bottom: Math.round(bodyRect.bottom), height: Math.round(bodyRect.height) } : null,
      gapBodyToBtm: (bodyRect && btmRect) ? Math.round(btmRect.top - bodyRect.bottom) : null,
      bottomArea: btmRect ? { top: Math.round(btmRect.top), bottom: Math.round(btmRect.bottom), height: Math.round(btmRect.height) } : null,
      gapBtmToBanner: (btmRect && bnrRect) ? Math.round(bnrRect.top - btmRect.bottom) : null,
      banner: bnrRect ? { top: Math.round(bnrRect.top), bottom: Math.round(bnrRect.bottom), height: Math.round(bnrRect.height) } : null,
      hasOverflow: document.body.scrollHeight > window.innerHeight
    };
  });

  await page.screenshot({ path: 'test_full_spec_verification.png' });
  console.log('Test Full Spec Measurements:', JSON.stringify(measurements, null, 2));

  await browser.close();
}

run().catch(console.error);

