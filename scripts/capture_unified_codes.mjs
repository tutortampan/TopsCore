import { chromium } from 'playwright';
import path from 'path';

const ARTIFACTS_DIR = 'C:\\Users\\Top\\.gemini\\antigravity\\brain\\30416560-f6e5-4275-91c0-9f8f8014feb0';
const BASE_URL = 'http://127.0.0.1:5500';

async function capture() {
  console.log('Launching Edge to capture Unified Code verification...');
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
  console.log('Navigating to Topic Blueprint Tab: ' + BASE_URL + '/admin.html#vocab_vault?tab=blueprint');
  await page.goto(`${BASE_URL}/admin.html#vocab_vault?tab=blueprint`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const imgBlueprint = path.join(ARTIFACTS_DIR, 'blueprint_unified_code_verified.png');
  await page.screenshot({ path: imgBlueprint, fullPage: false });
  console.log(`✓ Blueprint unified code screenshot saved: ${imgBlueprint}`);

  const sampleBlueprintCodes = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('#blueprint-matrix-table tbody tr')).slice(0, 10).map(tr => {
      const tds = tr.querySelectorAll('td');
      return Array.from(tds).map(td => td.innerText.trim()).join(' | ');
    });
  });
  console.log('Sample Blueprint rows:');
  sampleBlueprintCodes.forEach(r => console.log('  ' + r));

  // 2. Vocabulary Words Tab
  console.log('Navigating to Vocabulary Words Tab: ' + BASE_URL + '/admin.html#vocab_vault?tab=vocab');
  await page.goto(`${BASE_URL}/admin.html#vocab_vault?tab=vocab`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  const imgVocab = path.join(ARTIFACTS_DIR, 'vocab_grid_unified_code_verified.png');
  await page.screenshot({ path: imgVocab, fullPage: false });
  console.log(`✓ Vocab grid unified code screenshot saved: ${imgVocab}`);

  const sampleVocabCodes = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('#vault-tbody tr')).slice(0, 10).map(tr => {
      const topCode = tr.querySelector('.cell-topic-code')?.innerText.trim();
      const themeCode = tr.querySelector('.cell-theme-code')?.innerText.trim();
      const topic = tr.querySelector('.cell-topic')?.innerText.trim();
      const indo = tr.querySelector('.cell-indonesian')?.innerText.trim();
      const eng = tr.querySelector('.cell-english')?.innerText.trim();
      return `${themeCode} | ${topCode} | ${topic} | ${indo} -> ${eng}`;
    });
  });
  console.log('Sample Vocab rows:');
  sampleVocabCodes.forEach(r => console.log('  ' + r));

  await browser.close();
}

capture().catch(err => {
  console.error('Error in capture:', err);
  process.exit(1);
});

