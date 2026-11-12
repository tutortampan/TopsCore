import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  // 1. Mobile Session for Student Screens (390 x 844)
  const contextMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const pageMobile = await contextMobile.newPage();

  await pageMobile.addInitScript(() => {
    const session = {
      student_id: 'a5e9451f-9bb5-493c-8c2d-27dbdcbb5a6e',
      student_name: 'Aditya',
      program_id: 'd9b3e15b-9b4e-4b47-b248-6d8175e11470',
      institution_id: 'e6988891-b3b3-4f9e-b143-df9cbb87841c'
    };
    sessionStorage.setItem('topscore_session', JSON.stringify(session));
    localStorage.setItem('topscore_session', JSON.stringify(session));
  });

  // A. Check Matrix Popup in test.html
  await pageMobile.goto('http://127.0.0.1:5500/test.html?id=31b7ac85-4c44-4a45-81d4-3a077207dc03', { waitUntil: 'networkidle' });
  await pageMobile.waitForTimeout(1000);

  // Dismiss pre-exam if needed
  const focusBtn = pageMobile.locator('#btn-enter-fullscreen-start');
  if (await focusBtn.count() > 0 && await focusBtn.isVisible()) {
    await focusBtn.click();
    await pageMobile.waitForTimeout(500);
  }

  // Open Matrix popup
  await pageMobile.evaluate(() => {
    if (window.toggleMatrixPopup) window.toggleMatrixPopup();
    else {
      const pop = document.getElementById('matrix-popup');
      if (pop) pop.style.display = 'flex';
    }
  });
  await pageMobile.waitForTimeout(400);
  await pageMobile.screenshot({ path: path.join(ARTIFACT_DIR, 'popup_check_matrix_mobile.png') });

  // B. Check Dashboard Modals
  await pageMobile.goto('http://127.0.0.1:5500/dashboard.html', { waitUntil: 'networkidle' });
  await pageMobile.waitForTimeout(1200);

  // Open Class Selector Modal
  await pageMobile.evaluate(() => {
    const m = document.getElementById('classes-selector-modal');
    if (m) m.classList.remove('hidden');
  });
  await pageMobile.waitForTimeout(400);
  await pageMobile.screenshot({ path: path.join(ARTIFACT_DIR, 'popup_check_class_selector_mobile.png') });

  // Open Gender Setup Modal
  await pageMobile.evaluate(() => {
    const m1 = document.getElementById('classes-selector-modal');
    if (m1) m1.classList.add('hidden');
    const m2 = document.getElementById('gender-setup-modal');
    if (m2) m2.classList.remove('hidden');
  });
  await pageMobile.waitForTimeout(400);
  await pageMobile.screenshot({ path: path.join(ARTIFACT_DIR, 'popup_check_gender_setup_mobile.png') });

  await pageMobile.close();
  await contextMobile.close();

  // 2. Desktop Landscape for Admin (1440 x 900)
  const contextDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pageDesktop = await contextDesktop.newPage();

  await pageDesktop.addInitScript(() => {
    const adminSession = {
      user: { id: 'admin-1', role: 'admin', email: 'admin@topscore.id' },
      access_token: 'fake-token'
    };
    sessionStorage.setItem('topscore_admin_session', JSON.stringify(adminSession));
    localStorage.setItem('topscore_admin_session', JSON.stringify(adminSession));
  });

  await pageDesktop.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'networkidle' });
  await pageDesktop.waitForTimeout(1500);

  // Remove loading overlay and show Delete Modal
  await pageDesktop.evaluate(() => {
    const loader = document.querySelector('.loading-overlay');
    if (loader) loader.remove();
    const del = document.getElementById('delete-modal');
    if (del) del.classList.remove('hidden');
  });
  await pageDesktop.waitForTimeout(400);
  await pageDesktop.screenshot({ path: path.join(ARTIFACT_DIR, 'popup_check_admin_delete_desktop.png') });

  await pageDesktop.close();
  await contextDesktop.close();
  await browser.close();

  console.log('Popup check screenshots captured!');
}

main().catch(console.error);
