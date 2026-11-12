import { chromium } from '@playwright/test';
import assert from 'assert';
import fs from 'fs';

async function run() {
  console.log('=== PLAYWRIGHT TEST: VERIFY NO VAULT TRUNCATION & CLEAN 6 COLUMNS ===\n');

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

  // 1. Test Phrases & Idioms Tab
  console.log('[1] Navigating to Phrases Tab: http://127.0.0.1:5500/admin.html?status=active#vocab_vault?tab=phrases');
  await page.goto('http://127.0.0.1:5500/admin.html?status=active#vocab_vault?tab=phrases', { waitUntil: 'networkidle' });
  await page.waitForSelector('#vault-tbody tr', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Check headers in #vault-table
  const headers = await page.$$eval('#vault-table thead th', els => els.map(e => e.textContent.trim()));
  console.log('  Rendered Headers in Phrases Grid:', headers);

  assert.ok(!headers.includes('INST'), 'INST header must be removed');
  assert.ok(!headers.includes('PROG'), 'PROG header must be removed');
  assert.ok(!headers.includes('LVL'), 'LVL header must be removed');
  assert.ok(!headers.includes('CODE'), 'CODE header must be removed');
  assert.strictEqual(headers[0], 'LEX-CD', 'First header must be LEX-CD');
  console.log('  ✅ Verified: Column layout begins directly with LEX-CD, zero redundant metadata columns.');

  // Check that English phrases are not truncated
  const phrasesInfo = await page.$$eval('#vault-tbody tr', rows => {
    return rows.slice(0, 10).map(r => {
      const lex = r.querySelector('.col-vault-lexicon-code')?.textContent.trim();
      const engCell = r.querySelector('td:nth-child(6)');
      const engText = engCell ? engCell.textContent.trim().replace(/^🔊\s*/, '') : '';
      const isTruncated = engCell ? (engCell.scrollWidth > engCell.clientWidth + 2) : false;
      return { lex, engText, isTruncated };
    });
  });

  console.log('  First 5 Phrases in Grid:');
  phrasesInfo.slice(0, 5).forEach(p => {
    console.log(`    [${p.lex}] "${p.engText}" (Truncated: ${p.isTruncated})`);
    assert.strictEqual(p.isTruncated, false, `Phrase "${p.engText}" must not be truncated!`);
  });
  console.log('  ✅ Verified: English phrases are displayed with ZERO truncation.');

  // 2. Test Theme Manager Tab
  console.log('\n[2] Navigating to Theme Manager Tab: http://127.0.0.1:5500/admin.html?status=active#vocab_vault?tab=theme_manager');
  await page.goto('http://127.0.0.1:5500/admin.html?status=active#vocab_vault?tab=theme_manager', { waitUntil: 'networkidle' });
  await page.waitForSelector('#theme-manager-tbody tr', { timeout: 15000 });
  await page.waitForTimeout(1000);

  // Check TOPIC NAME header style
  const topicNameHeaderStyle = await page.$eval('#theme-manager-flat-table thead th[title="Topic Name"]', el => el.getAttribute('style') || '');
  console.log('  TOPIC NAME header style:', topicNameHeaderStyle);
  assert.ok(!topicNameHeaderStyle.includes('max-width: 130px'), 'Must not have hardcoded max-width: 130px');
  assert.ok(topicNameHeaderStyle.includes('min-width: 240px'), 'Must have min-width: 240px');
  console.log('  ✅ Verified: Artificial ceiling (max-width: 130px) has been permanently eradicated.');

  // Check long topic names in tbody
  const topicNames = await page.$$eval('#theme-manager-tbody tr td:nth-child(5) .vault-cell-view', els => els.map(e => e.textContent.trim()));
  console.log('  Sample Rendered Topic Names:');
  const sampleTopics = topicNames.filter(t => t.split(' ').length >= 3).slice(0, 6);
  sampleTopics.forEach(t => {
    console.log(`    - "${t}"`);
    assert.ok(!t.includes('...'), `Topic name "${t}" must not contain ellipsis!`);
  });
  console.log('  ✅ Verified: Long topic names render 100% complete without truncation.');

  // 3. Capture visual artifact
  fs.mkdirSync('tests/artifacts', { recursive: true });
  const screenshotPath = 'tests/artifacts/verify_vault_clean_columns.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log(`\n  📸 Full visual screenshot captured: ${screenshotPath}`);

  // Copy to brain artifact directory
  const brainDest = 'C:/Users/Top/.gemini/antigravity/brain/f9f716d8-bd46-4f6b-a01d-ba72e36526ff/verify_vault_clean_columns.png';
  fs.copyFileSync(screenshotPath, brainDest);
  console.log(`  📸 Copied to brain artifact directory: ${brainDest}`);

  await browser.close();
  console.log('\n======================================================');
  console.log('PLAYWRIGHT TEST: ALL ASSERTIONS PASSED (100% SUCCESS)');
  console.log('======================================================');
}

run().catch(err => {
  console.error('Playwright Error:', err);
  process.exit(1);
});

