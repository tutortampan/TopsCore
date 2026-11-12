import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  page.on('console', msg => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.addInitScript(() => {
    const session = JSON.stringify({ admin_id: 'test-admin', username: 'admin', role: 'admin' });
    sessionStorage.setItem('topscore_admin_session', session);
    localStorage.setItem('topscore_admin_session', session);
  });

  console.log('Navigating to Vocabulary Words table (tab=vocab)...');
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=vocab', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  // 1. Capture Words Tab
  console.log('Capturing Vocabulary Words table with LEX-CD...');
  await page.screenshot({ path: 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/verify_lexicon_codes_words.png' });
  console.log('Saved verify_lexicon_codes_words.png');

  // 2. Click Phrases & Idioms tab
  console.log('Switching to Phrases & Idioms tab (tab=phrases)...');
  await page.goto('http://127.0.0.1:5500/admin.html#vocab_vault?tab=phrases', { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  console.log('Capturing Phrases & Idioms table with LEX-CD...');
  await page.screenshot({ path: 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/verify_lexicon_codes_phrases.png' });
  console.log('Saved verify_lexicon_codes_phrases.png');

  await browser.close();
  console.log('Done capturing!');
}

main().catch(console.error);
