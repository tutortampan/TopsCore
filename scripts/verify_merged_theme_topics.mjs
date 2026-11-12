import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = process.env.ARTIFACT_DIR || 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece';

async function run() {
  console.log('=== Verifying Merged Theme Topics in Theme Manager ===');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  console.log('Navigating to Theme Manager...');
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=theme_manager', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // Extract Level 1 rows
  const level1Rows = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('#theme-manager-tbody tr[data-level="1"]'));
    return rows.map(r => {
      const topic = r.querySelector('[data-action="edit-topic-name"]')?.value || r.getAttribute('data-topic');
      const thCode = r.getAttribute('data-theme-code');
      const tpCode = r.querySelector('[data-action="edit-topic-code"]')?.value;
      const compositeCode = r.querySelector('.col-theme-composite-code')?.textContent.trim();
      const cells = Array.from(r.querySelectorAll('td')).map(td => td.textContent.trim());
      // cells indices based on reorganized 19 columns:
      // 0: LVL, 1: TH-CD, 2: THEME, 3: TP-CD, 4: TOPIC, 5: CODE, 6: VERB, 7: NOUN, 8: ADJ, 9: OTH, 10: EXP, 11: PRV, 12: IDM, 13: OTH, 14: WORDS, 15: PHRASES, 16: TOTAL, 17: PROGRAMS, 18: ACT
      return {
        topic,
        thCode,
        tpCode,
        compositeCode,
        verb: cells[6],
        noun: cells[7],
        words: cells[14],
        total: cells[16]
      };
    });
  });

  console.log('Level 1 rows found:', JSON.stringify(level1Rows, null, 2));

  // Assertions
  if (level1Rows.length !== 2) {
    throw new Error(`Expected exactly 2 rows for Level 1, but found ${level1Rows.length}`);
  }

  const timeNameRow = level1Rows.find(r => r.topic === 'Time Name');
  if (!timeNameRow) throw new Error('Topic "Time Name" not found in Level 1!');
  console.log('Time Name row metrics:', timeNameRow);

  if (timeNameRow.total !== '40') {
    throw new Error(`Expected Time Name TOTAL to be 40, but got "${timeNameRow.total}"`);
  }
  if (timeNameRow.words !== '40') {
    throw new Error(`Expected Time Name WORDS to be 40, but got "${timeNameRow.words}"`);
  }
  if (timeNameRow.noun !== '40') {
    throw new Error(`Expected Time Name NOUN to be 40, but got "${timeNameRow.noun}"`);
  }

  const familyRow = level1Rows.find(r => r.topic === 'Family Member');
  if (!familyRow) throw new Error('Topic "Family Member" not found in Level 1!');
  if (familyRow.total !== '50') {
    throw new Error(`Expected Family Member TOTAL to be 50, but got "${familyRow.total}"`);
  }

  const shot = path.join(ARTIFACT_DIR, 'verified_theme_topics_merged.png');
  await page.screenshot({ path: shot });
  console.log('Screenshot saved to:', shot);

  await browser.close();
  console.log('=== All Merged Theme Topics Assertions PASSED (100%) ===');
}

run().catch(err => {
  console.error('Verification FAILED:', err);
  process.exit(1);
});
