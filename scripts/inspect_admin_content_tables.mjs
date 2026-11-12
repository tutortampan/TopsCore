import { chromium } from '@playwright/test';

async function checkContentTables() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  const urls = [
    { name: 'Organization', url: 'http://127.0.0.1:5500/admin.html#organization' },
    { name: 'Curriculum', url: 'http://127.0.0.1:5500/admin.html#curriculum' },
    { name: 'Dashboard', url: 'http://127.0.0.1:5500/admin.html#dashboard' },
    { name: 'Vocab Theme Manager', url: 'http://127.0.0.1:5500/admin.html#vocab_vault?tab=theme_manager' },
    { name: 'Vocab Blueprint', url: 'http://127.0.0.1:5500/admin.html#vocab_vault?tab=blueprint' },
    { name: 'Vocab Words', url: 'http://127.0.0.1:5500/admin.html#vocab_vault?tab=vocab' },
    { name: 'Vocab Phrases', url: 'http://127.0.0.1:5500/admin.html#vocab_vault?tab=phrases' },
    { name: 'Legacy Batches (#batches)', url: 'http://127.0.0.1:5500/admin.html#batches' },
    { name: 'Modules', url: 'http://127.0.0.1:5500/admin.html#modules' },
    { name: 'Settings', url: 'http://127.0.0.1:5500/admin.html#settings' },
  ];

  for (const u of urls) {
    await page.goto(u.url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const tables = page.locator('#admin-content-area table');
    const count = await tables.count();
    console.log(`\n=== [${u.name}] Tables in content area: ${count} ===`);
    for (let i = 0; i < count; i++) {
      const ths = await tables.nth(i).locator('th').allInnerTexts();
      const rows = await tables.nth(i).locator('tbody tr').count();
      console.log(`  Table #${i+1}: Rows: ${rows} | Headers:`, ths.join(' | '));
    }
  }

  // Also check sidebar items: Camp 134 and Camp 2nd Vocab
  await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.locator('.sidebar-program-item').first().click();
  await page.waitForTimeout(2000);
  console.log(`\n=== [Board: Batch Camp 134 Roster] ===`);
  const rosterTables = page.locator('#admin-content-area table');
  for (let i = 0; i < await rosterTables.count(); i++) {
    const ths = await rosterTables.nth(i).locator('th').allInnerTexts();
    const rows = await rosterTables.nth(i).locator('tbody tr').count();
    console.log(`  Table #${i+1}: Rows: ${rows} | Headers:`, ths.join(' | '));
  }

  await page.locator('.sidebar-class-item').first().click();
  await page.waitForTimeout(2000);
  console.log(`\n=== [Class: Camp 2nd Vocabulary (Tests Tab)] ===`);
  const classTables = page.locator('#admin-content-area table');
  for (let i = 0; i < await classTables.count(); i++) {
    const ths = await classTables.nth(i).locator('th').allInnerTexts();
    const rows = await classTables.nth(i).locator('tbody tr').count();
    console.log(`  Table #${i+1}: Rows: ${rows} | Headers:`, ths.join(' | '));
  }

  await browser.close();
}

checkContentTables();

