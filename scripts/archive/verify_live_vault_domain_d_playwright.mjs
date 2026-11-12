import { chromium } from '@playwright/test';
import assert from 'assert';
import fs from 'fs';

async function run() {
  console.log('=== PLAYWRIGHT E2E: DOMAIN D VAULT & ALPHABETICAL SORTING ===\n');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });

  await context.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_global_edit_mode', 'false');
  });

  const page = await context.newPage();

  console.log('[1] Navigating to http://127.0.0.1:5500/admin.html?status=active#vocab_vault');
  await page.goto('http://127.0.0.1:5500/admin.html?status=active#vocab_vault', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. Verify Sidebar Domain D structure
  console.log('[2] Verifying Sidebar Structure:');
  const domainCItems = await page.$$eval('.nav-domain-group[data-domain="class"] .admin-nav-item', els => els.map(e => e.textContent.trim()));
  console.log('  Domain C Items:', domainCItems);
  assert.ok(!domainCItems.some(txt => txt.includes('Vocabulary Vault')), 'FAIL: Vocabulary Vault should not be in Domain C');
  console.log('  ✅ Domain C does NOT contain Vocabulary Vault.');

  const domainDItems = await page.$$eval('.nav-domain-group[data-domain="desk"] .admin-nav-item', els => els.map(e => e.textContent.trim()));
  console.log('  Domain D Items:', domainDItems);
  assert.ok(domainDItems.length === 3, 'Domain D should have exactly 3 items');
  assert.ok(domainDItems[0].includes('Modules'), 'Item 1 should be Modules');
  assert.ok(domainDItems[1].includes('System Settings'), 'Item 2 should be System Settings');
  assert.ok(domainDItems[2].includes('Vocabulary Vault'), 'Item 3 should be Vocabulary Vault');
  console.log('  ✅ Domain D items are strictly alphabetical: Modules -> System Settings -> Vocabulary Vault.');

  // 2. Verify Theme Manager Alphabetical Sorting
  console.log('[3] Verifying Theme Manager Alphabetical Sorting:');
  await page.waitForSelector('#theme-manager-tbody tr');

  // Filter to 2nd Level to check alphabetical sorting
  const btn2nd = await page.$('.btn-theme-curriculum-tab[data-lvl="2"]');
  if (btn2nd) {
    await btn2nd.click();
    await page.waitForTimeout(500);
  }

  // Get distinct themes rendered in order
  const renderedThemes = await page.$$eval('#theme-manager-tbody tr', rows => {
    const list = [];
    rows.forEach(r => {
      const thCell = r.querySelector('td:nth-child(3)');
      if (thCell) {
        const txt = thCell.textContent.trim();
        if (txt && !list.includes(txt)) list.push(txt);
      }
    });
    return list;
  });

  console.log('  Rendered 2nd Level Themes in order:', renderedThemes);
  // Check if renderedThemes is sorted alphabetically
  const sortedThemes = [...renderedThemes].sort((a, b) => a.localeCompare(b));
  assert.deepStrictEqual(renderedThemes, sortedThemes, 'Themes must be sorted alphabetically A-Z');
  console.log('  ✅ Themes in Theme Manager are strictly sorted alphabetically A-Z.');

  // 3. Verify Program Quick Filter Pills
  console.log('[4] Verifying Program Quick Filter Pills in Lower Panel:');
  const progPills = await page.$$eval('.btn-theme-prog-tab', els => els.map(e => e.textContent.trim()));
  console.log('  Program Filter Pills:', progPills);
  assert.ok(progPills.includes('PROG: ALL'), 'Must include PROG: ALL pill');
  console.log('  ✅ Program Quick Filter Pills are rendered in lower panel.');

  // Test clicking a program pill (e.g. EVN)
  const evnPill = await page.$('.btn-theme-prog-tab[data-prog="Evnikom"]');
  if (evnPill) {
    await evnPill.click();
    await page.waitForTimeout(500);
    const evnRowsCount = await page.$$eval('#theme-manager-tbody tr', rows => rows.length);
    console.log(`  Filtered EVN rows count: ${evnRowsCount}`);
    assert.ok(evnRowsCount > 0, 'Should display EVN rows');
    console.log('  ✅ Program filter pill click successfully filtered table rows.');

    // Click back to PROG: ALL
    const allPill = await page.$('.btn-theme-prog-tab[data-prog="ALL"]');
    if (allPill) await allPill.click();
    await page.waitForTimeout(500);
  }

  // 4. Verify Vocabulary Words Tab & LEX-CD
  console.log('[5] Verifying Vocabulary Words Tab & LEX-CD:');
  // Click on topbar tab for Vocabulary Words
  const vocabTabBtn = await page.$('.topbar-tab-btn:has-text("Vocabulary Words")');
  if (vocabTabBtn) {
    await vocabTabBtn.click();
  } else {
    await page.goto('http://127.0.0.1:5500/admin.html?status=active#vocab_vault?tab=vocab', { waitUntil: 'networkidle' });
  }
  await page.waitForTimeout(1000);

  // Check LEX-CD column in tbody
  await page.waitForSelector('#vault-tbody tr');
  const lexCodes = await page.$$eval('.col-vault-lexicon-code .vault-cell-view', els => els.slice(0, 5).map(e => e.textContent.trim()));
  console.log('  First 5 Lexicon Codes (LEX-CD):', lexCodes);
  assert.ok(lexCodes.length > 0, 'LEX-CD codes should be rendered');
  assert.ok(lexCodes[0].includes('-W'), 'LEX-CD code should contain -W for words');
  console.log('  ✅ LEX-CD column renders clean deterministic coordinates.');

  // Check program filter in words bottom bar
  const progFilterExists = await page.$('#vault-program-filter');
  assert.ok(progFilterExists !== null, 'Program filter dropdown must exist in Vocabulary Words bottom bar');
  console.log('  ✅ Program filter dropdown verified in Vocabulary Words grid.');

  // 5. Capture visual artifact
  fs.mkdirSync('tests/artifacts', { recursive: true });
  const screenshotPath = 'tests/artifacts/verify_vault_domain_d.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`  📸 Screenshot captured: ${screenshotPath}`);

  await browser.close();
  console.log('\n========================================');
  console.log('PLAYWRIGHT E2E SUITE: ALL TESTS PASSED!');
  console.log('========================================');
}

run().catch(err => {
  console.error('Playwright Error:', err);
  process.exit(1);
});
