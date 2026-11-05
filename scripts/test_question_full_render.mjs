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

  // Simulate full question view
  const res = await page.evaluate(() => {
    // Populate dummy question UI inside test-main
    const main = document.getElementById('test-main');
    if (main) {
      main.innerHTML = `
        <div style="width:100%; height:calc(30% - 3px); min-height:80px; max-height:120px; display:flex; align-items:center; justify-content:center; background:#1e293b; border-radius:14px; padding:6px 14px;">
          <div style="font-size:24px; font-weight:800; color:#fff;">Popular</div>
        </div>
        <div style="width:100%; height:calc(10% - 2px); display:grid; grid-template-columns:1fr 1fr; gap:3px;">
          <div style="background:#0f172a; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:10px; color:#38bdf8;">SHOPPING ESSENTIALS</div>
          <div style="background:#0f172a; border-radius:6px; display:flex; align-items:center; justify-content:center; font-size:10px; color:#34d399;">Words</div>
        </div>
        <div style="width:100%; height:calc(60% - 7px); display:flex; flex-direction:column; gap:5px;">
          <div style="height:calc(50% - 3px); background:#1e293b; border-radius:14px; display:flex; align-items:center; justify-content:center; color:#94a3b8;">Listening...</div>
          <div style="height:calc(50% - 3px); background:#0f172a; border-radius:14px; display:flex; align-items:center; justify-content:center; color:#22c55e;">Tap to Speak</div>
        </div>
      `;
    }

    const banner = document.getElementById('bottom-ad-banner');
    const bottomArea = document.getElementById('fixed-bottom-area');
    const prevBtn = document.getElementById('bottom-prev-btn');
    const counter = document.getElementById('question-counter');
    const nextBtn = document.getElementById('bottom-next-btn');

    const bannerRect = banner ? banner.getBoundingClientRect() : null;
    const bottomAreaRect = bottomArea ? bottomArea.getBoundingClientRect() : null;
    const prevRect = prevBtn ? prevBtn.getBoundingClientRect() : null;
    const counterRect = counter ? counter.getBoundingClientRect() : null;
    const nextRect = nextBtn ? nextBtn.getBoundingClientRect() : null;

    const gap = (bannerRect && bottomAreaRect) ? Math.round(bannerRect.top - bottomAreaRect.bottom) : null;

    return {
      gap,
      prevVisible: prevRect && prevRect.bottom <= (bannerRect?.top || 800),
      counterVisible: counterRect && counterRect.bottom <= (bannerRect?.top || 800),
      nextVisible: nextRect && nextRect.bottom <= (bannerRect?.top || 800),
      bodyScrollHeight: document.body.scrollHeight,
      windowHeight: window.innerHeight,
      hasVerticalOverflow: document.body.scrollHeight > window.innerHeight
    };
  });

  await page.screenshot({ path: 'test_question_mock_verification.png' });
  console.log('Mock Question Render Result:', JSON.stringify(res, null, 2));

  await browser.close();
}

run().catch(console.error);

