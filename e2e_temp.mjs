import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:5500/admin.html', { waitUntil: 'networkidle2' });
  
  await page.type('#admin-username', 'admin');
  await page.type('#admin-password', 'admin123');
  await page.click('#admin-login-btn');
  await page.waitForSelector('#admin-console', { visible: true });
  
  await page.waitForSelector('.sidebar-class-item');
  
  const classItems = await page.$$('.sidebar-class-item');
  console.log('Found class items:', classItems.length);
  
  if(classItems.length > 0) {
     const title = await page.evaluate(el => el.textContent.trim(), classItems[0]);
     console.log('Clicking on:', title);
     await classItems[0].click();
     await new Promise(r => setTimeout(r, 1000));
     
     const mainContent = await page.evaluate(() => document.getElementById('admin-content-area').innerHTML);
     console.log('Main area length:', mainContent.length);
     console.log('Contains class-level-tab:', mainContent.includes('class-level-tab'));
     console.log('Main area text:', await page.evaluate(() => document.getElementById('admin-content-area').textContent.substring(0, 100)));
  }
  
  await browser.close();
})();
