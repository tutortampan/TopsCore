const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  await page.goto('http://127.0.0.1:8081/');
  
  await page.waitForFunction(() => {
    const status = document.getElementById('status');
    return status && status.textContent !== 'RUNNING...';
  }, { timeout: 10000 }).catch(e => console.log('Timeout waiting for status'));
  
  const result = await page.evaluate(() => {
    return {
      status: document.getElementById('status') ? document.getElementById('status').textContent : 'No status',
      log: document.getElementById('log') ? document.getElementById('log').textContent : 'No log'
    };
  });
  
  console.log('STATUS:', result.status);
  console.log('LOG:', result.log);
  
  await browser.close();
})();
