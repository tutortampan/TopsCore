import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Set student session
  await page.addInitScript(() => {
    const session = {
      student_id: 'a5e9451f-9bb5-493c-8c2d-27dbdcbb5a6e',
      student_name: 'Aditya',
      program_id: 'd9b3e15b-9b4e-4b47-b248-6d8175e11470',
      institution_id: 'e6988891-b3b3-4f9e-b143-df9cbb87841c'
    };
    sessionStorage.setItem('topscore_session', JSON.stringify(session));
    localStorage.setItem('topscore_session', JSON.stringify(session));
  });

  await page.goto('http://127.0.0.1:5500/test.html?id=31b7ac85-4c44-4a45-81d4-3a077207dc03', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Directly call openSubmitModal in page context
  await page.evaluate(() => {
    if (window.openSubmitModal) window.openSubmitModal();
    else document.getElementById('submit-modal').classList.remove('hidden');
  });
  await page.waitForTimeout(600);

  const outPath = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/submit_modal_live_verified.png';
  await page.screenshot({ path: outPath });
  console.log('Saved live verified screenshot to:', outPath);
  await browser.close();
}

main().catch(console.error);
