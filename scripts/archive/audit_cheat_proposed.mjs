import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

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
  await page.waitForTimeout(800);

  // Apply proposed accent-only style to cheat overlay
  await page.evaluate(() => {
    const preModal = document.getElementById('pre-exam-focus-modal');
    if (preModal) preModal.classList.add('hidden');

    const cheat = document.getElementById('cheat-overlay');
    if (cheat) {
      cheat.style.setProperty('display', 'flex', 'important');
      cheat.style.setProperty('background', 'rgba(6, 11, 24, 0.88)', 'important');
      cheat.style.setProperty('backdrop-filter', 'blur(16px)', 'important');
      cheat.style.setProperty('-webkit-backdrop-filter', 'blur(16px)', 'important');
      cheat.style.setProperty('animation', 'none', 'important');

      const box = cheat.querySelector('.cheat-box');
      if (box) {
        box.style.background = '#0D1424';
        box.style.border = '1px solid rgba(255, 0, 0, 0.4)';
        box.style.boxShadow = '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 0, 0, 0.25)';
        box.style.borderRadius = '20px';
      }

      const badge = cheat.querySelector('#cheat-strikes-badge');
      if (badge) {
        badge.style.background = 'rgba(255, 0, 0, 0.15)';
        badge.style.border = '1px solid rgba(255, 0, 0, 0.6)';
        badge.style.color = '#ff4d4d';
        badge.style.boxShadow = '0 0 15px rgba(255, 0, 0, 0.3)';
      }

      const circle = cheat.querySelector('.cheat-countdown-circle');
      if (circle) {
        circle.style.border = '3px solid #ff0000';
        circle.style.background = 'rgba(255, 0, 0, 0.08)';
        circle.style.boxShadow = '0 0 25px rgba(255, 0, 0, 0.35)';
      }

      const btn = cheat.querySelector('#dismiss-cheat-btn');
      if (btn) {
        btn.style.background = 'linear-gradient(180deg, #1c0f13 0%, #12080a 100%)';
        btn.style.border = '1.5px solid #ff0000';
        btn.style.color = '#ff4d4d';
        btn.style.boxShadow = '0 0 16px rgba(255, 0, 0, 0.35)';
        btn.style.fontWeight = '800';
      }
    }
  });

  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_cheat_overlay_proposed.png') });
  await page.close();
  await browser.close();
  console.log('Proposed preview captured!');
}

main().catch(console.error);
