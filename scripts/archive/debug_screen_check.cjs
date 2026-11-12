const { chromium } = require('@playwright/test');

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.addInitScript(() => {
    const s = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', s);
    localStorage.setItem('topscore_admin_session', s);
  });
  await p.goto('http://localhost:5500/admin.html#students');
  await p.waitForTimeout(3000);
  const infobar = await p.$('#admin-bottom-infobar');
  console.log('Infobar text:', infobar ? await infobar.innerText() : 'NOT FOUND');
  console.log('Btn promote:', (await p.$('#btn-promote-all-eligible')) ? 'EXISTS' : 'NOT FOUND');
  const activeTab = await p.$('.topbar-tab-card[data-tab-id="active"]');
  console.log('Active tab:', activeTab ? await activeTab.innerText() : 'NOT FOUND');
  console.log('URL:', p.url());
  await b.close();
})();
