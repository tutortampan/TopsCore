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

  // Evaluate layout measurements
  const measurements = await page.evaluate(() => {
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
      viewport: { width: window.innerWidth, height: window.innerHeight },
      bannerRect: bannerRect ? { top: bannerRect.top, bottom: bannerRect.bottom, height: bannerRect.height } : null,
      bottomAreaRect: bottomAreaRect ? { top: bottomAreaRect.top, bottom: bottomAreaRect.bottom, height: bottomAreaRect.height } : null,
      gapBetweenAreaAndBanner: gap,
      prevVisible: prevRect && prevRect.bottom <= (bannerRect?.top || 800),
      counterVisible: counterRect && counterRect.bottom <= (bannerRect?.top || 800),
      nextVisible: nextRect && nextRect.bottom <= (bannerRect?.top || 800),
      prevRect: prevRect ? { top: prevRect.top, bottom: prevRect.bottom, height: prevRect.height } : null,
      counterRect: counterRect ? { top: counterRect.top, bottom: counterRect.bottom, height: counterRect.height } : null,
      nextRect: nextRect ? { top: nextRect.top, bottom: nextRect.bottom, height: nextRect.height } : null
    };
  });

  await page.screenshot({ path: 'test_layout_verification.png' });
  console.log('Layout Measurements:', JSON.stringify(measurements, null, 2));

  await browser.close();
}

run().catch(console.error);
