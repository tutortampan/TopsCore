import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  
  // 1. Check test.html modals (#cheat-overlay and #pre-exam-focus-modal)
  {
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
    await page.waitForTimeout(1000);

    // Capture Pre-exam modal
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_pre_exam_modal.png') });

    // Hide pre-exam modal, Show Cheat overlay
    await page.evaluate(() => {
      const preModal = document.getElementById('pre-exam-focus-modal');
      if (preModal) preModal.classList.add('hidden');
      const cheat = document.getElementById('cheat-overlay');
      if (cheat) {
        cheat.style.display = 'flex';
      }
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_cheat_overlay.png') });
    await page.close();
  }

  // 2. Check admin.html delete modal
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await page.evaluate(() => {
      // Remove any loading overlay
      const loader = document.querySelector('.loading-overlay') || document.querySelector('.loader-overlay');
      if (loader) loader.remove();

      const delModal = document.getElementById('delete-modal');
      if (delModal) {
        delModal.classList.remove('hidden');
        delModal.style.display = 'flex';
        delModal.style.zIndex = '99999';
      }
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'audit_admin_delete_modal.png') });
    await page.close();
  }

  await browser.close();
  console.log('Screenshots captured successfully!');
}

main().catch(console.error);

