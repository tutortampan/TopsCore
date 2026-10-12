const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    } else {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  page.on('pageerror', err => {
    console.log('PAGE EXCEPTION:', err.message);
  });

  try {
    await page.goto('http://127.0.0.1:5500/admin.html#students', { waitUntil: 'networkidle2' });
    console.log('Page loaded.');
    await page.waitForTimeout(3000);
    console.log('Done waiting.');
  } catch (e) {
    console.error('Failed to load page:', e);
  } finally {
    await browser.close();
  }
})();
