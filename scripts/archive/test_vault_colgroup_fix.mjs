import { chromium } from '@playwright/test';

async function testColgroup() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_global_edit_mode', 'false');
  });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5500/admin.html?status=active#vocab_vault?tab=theme_manager', { waitUntil: 'networkidle' });
  await page.waitForSelector('#theme-manager-tbody tr', { timeout: 15000 });

  const beforeWidth = await page.$eval('#theme-manager-tbody tr td:nth-child(5)', el => el.offsetWidth);
  console.log('Topic Name td offsetWidth BEFORE colgroup:', beforeWidth);

  await page.evaluate(() => {
    const table = document.querySelector('#theme-manager-flat-table');
    const colgroup = document.createElement('colgroup');
    colgroup.innerHTML = `
      <col style="width: 45px;">
      <col style="width: 48px;">
      <col style="width: 140px;">
      <col style="width: 48px;">
      <col style="width: 260px;">
      <col style="width: 50px;">
      <col style="width: 30px;">
      <col style="width: 30px;">
      <col style="width: 30px;">
      <col style="width: 30px;">
      <col style="width: 30px;">
      <col style="width: 30px;">
      <col style="width: 30px;">
      <col style="width: 30px;">
      <col style="width: 52px;">
      <col style="width: 58px;">
      <col style="width: 52px;">
      <col style="width: 105px;">
      <col style="width: 45px;">
    `;
    table.insertBefore(colgroup, table.firstChild);
  });

  const afterWidth = await page.$eval('#theme-manager-tbody tr td:nth-child(5)', el => el.offsetWidth);
  console.log('Topic Name td offsetWidth AFTER colgroup:', afterWidth);

  const topicText = await page.$eval('#theme-manager-tbody tr:nth-child(3) td:nth-child(5) .vault-cell-view', el => {
    return {
      text: el.textContent.trim(),
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      tdClientWidth: el.parentElement.clientWidth
    };
  });
  console.log('Topic cell check with colgroup:', topicText);

  await browser.close();
}
testColgroup().catch(console.error);
