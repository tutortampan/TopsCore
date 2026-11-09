import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\Top\\.gemini\\antigravity\\brain\\30416560-f6e5-4275-91c0-9f8f8014feb0';
const BASE_URL = 'http://127.0.0.1:5500';

async function capture() {
  console.log('Launching Edge for live vault verification...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  await context.addInitScript(() => {
    const session = JSON.stringify({
      admin_id: 'admin-super',
      role: 'admin',
      authenticated_at: new Date().toISOString()
    });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  const page = await context.newPage();

  // 1. Topic Blueprint Tab
  console.log('Navigating to Topic Blueprint Tab...');
  await page.goto(`${BASE_URL}/admin.html#vocab_vault?tab=blueprint`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const imgBlueprint = path.join(ARTIFACTS_DIR, 'blueprint_restored_single_code.png');
  await page.screenshot({ path: imgBlueprint, fullPage: false });
  console.log(`✓ Blueprint screenshot saved: ${imgBlueprint}`);

  const blueprintStats = await page.evaluate(() => {
    const pills = Array.from(document.querySelectorAll('.btn-blueprint-curriculum-tab')).map(b => b.innerText.trim());
    const bottomChips = Array.from(document.querySelectorAll('.bottom-info-chip')).map(c => c.innerText.trim().replace(/\n/g, ' '));
    const headers = Array.from(document.querySelectorAll('#blueprint-matrix-table thead th')).map(th => th.innerText.trim());
    const rows = Array.from(document.querySelectorAll('#blueprint-matrix-table tbody tr')).map(tr => {
      const tds = tr.querySelectorAll('td');
      return Array.from(tds).map(td => td.innerText.trim()).join(' | ');
    });
    return { pills, bottomChips, headers, totalRows: rows.length, sampleRows: rows.slice(0, 15) };
  });

  console.log('Blueprint UI stats:');
  console.log('  Pills:', blueprintStats.pills.join('  '));
  console.log('  Bottom chips:', blueprintStats.bottomChips.join(' | '));
  console.log('  Headers:', blueprintStats.headers.join(' | '));
  console.log('  Total rendered rows:', blueprintStats.totalRows);
  console.log('  Sample rows:');
  blueprintStats.sampleRows.forEach(r => console.log('    ' + r));

  // Click 3rd Level button to see 3rd level exclusively
  console.log('Clicking 3rd Level pill...');
  await page.click('.btn-blueprint-curriculum-tab[data-lvl="3"]');
  await page.waitForTimeout(1000);
  const imgBlueprintLvl3 = path.join(ARTIFACTS_DIR, 'blueprint_lvl3_full_16_topics.png');
  await page.screenshot({ path: imgBlueprintLvl3, fullPage: false });
  console.log(`✓ Blueprint Level 3 screenshot saved: ${imgBlueprintLvl3}`);

  const lvl3Rows = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('#blueprint-matrix-table tbody tr')).map(tr => {
      const tds = tr.querySelectorAll('td');
      return Array.from(tds).map(td => td.innerText.trim()).join(' | ');
    });
  });
  console.log('Level 3 topics rendered (should be 16 topics):', lvl3Rows.length);
  lvl3Rows.forEach(r => console.log('    ' + r));

  // 2. Vocabulary Words Tab
  console.log('Navigating to Vocabulary Words Tab...');
  await page.goto(`${BASE_URL}/admin.html#vocab_vault?tab=vocab`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const imgVocab = path.join(ARTIFACTS_DIR, 'vocab_grid_single_code.png');
  await page.screenshot({ path: imgVocab, fullPage: false });
  console.log(`✓ Vocab grid screenshot saved: ${imgVocab}`);

  const vocabStats = await page.evaluate(() => {
    const headers = Array.from(document.querySelectorAll('#vault-table thead th')).map(th => th.innerText.trim());
    const countText = document.getElementById('vault-filtered-count')?.innerText.trim() || document.querySelector('.vault-count')?.innerText.trim();
    const rows = Array.from(document.querySelectorAll('#vault-tbody tr')).slice(0, 10).map(tr => {
      const tds = tr.querySelectorAll('td');
      return Array.from(tds).map(td => td.innerText.trim()).join(' | ');
    });
    return { headers, countText, sampleRows: rows };
  });

  console.log('Vocab Grid UI stats:');
  console.log('  Headers (should have Code, no T.Code):', vocabStats.headers.join(' | '));
  console.log('  Count text:', vocabStats.countText);
  console.log('  Sample rows:');
  vocabStats.sampleRows.forEach(r => console.log('    ' + r));

  await browser.close();
  console.log('Capture finished successfully.');
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});

