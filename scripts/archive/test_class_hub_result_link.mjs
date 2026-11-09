import { chromium } from 'playwright';

const BASE_URL = 'http://127.0.0.1:5500';

async function testClassHubResultLink() {
  console.log('Testing Test Results Grid Link in Playwright...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true }).catch(() => chromium.launch({ headless: true }));
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  
  await context.addInitScript(() => {
    const adminSession = { admin_id: 'admin', role: 'admin' };
    sessionStorage.setItem('topscore_admin_session', JSON.stringify(adminSession));
    localStorage.setItem('topscore_admin_session', JSON.stringify(adminSession));
    sessionStorage.setItem('topscore_admin_auth', 'true');
    sessionStorage.setItem('topscore_admin_user', JSON.stringify({ role: 'superadmin', username: 'Super Admin' }));
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  console.log(`Navigating to ${BASE_URL}/admin.html#results`);
  await page.goto(`${BASE_URL}/admin.html#results`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Look for Result buttons in the table
  const resultLinks = await page.$$('a[title*="Inspect Result"]');
  console.log(`Found ${resultLinks.length} "📋 Result" inspection links in results grid.`);

  if (resultLinks.length > 0) {
    const href = await resultLinks[0].getAttribute('href');
    console.log(`First Result link: ${href}`);
    if (href.includes('result.html?attempt_id=') && href.includes('&from=admin')) {
      console.log('✓ PASS: Result link correctly targets result.html with ?from=admin parameter!');
    }
  }

  await browser.close();
  console.log('Test completed successfully!');
}

testClassHubResultLink().catch(console.error);
