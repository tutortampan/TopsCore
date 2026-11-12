import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  // iPhone 13 / 14 / 15 viewport (390 x 844)
  const page = await browser.newPage({ 
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

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
  await page.waitForTimeout(600);

  // Trigger current live cheat overlay
  await page.evaluate(() => {
    const preModal = document.getElementById('pre-exam-focus-modal');
    if (preModal) preModal.classList.add('hidden');
    const cheat = document.getElementById('cheat-overlay');
    if (cheat) {
      cheat.style.display = 'flex';
    }
  });

  await page.waitForTimeout(300);
  const outPath = path.join(ARTIFACT_DIR, 'live_cheat_overlay_mobile.png');
  await page.screenshot({ path: outPath });
  await page.close();
  await browser.close();
  console.log('Mobile screenshot of live cheat overlay captured:', outPath);
}

main().catch(console.error);
