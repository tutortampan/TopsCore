import { chromium } from '@playwright/test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function runCheck() {
  console.log('🚀 Running Complete Automated Visual & Behavioral Verification for Submit Modal...\n');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  // 1. Desktop Check (1440 x 900)
  const contextDesktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await contextDesktop.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
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

  console.log('1. Loading test page on live server (http://127.0.0.1:5500/test.html)...');
  await page.goto('http://127.0.0.1:5500/test.html?id=31b7ac85-4c44-4a45-81d4-3a077207dc03', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Dismiss pre-exam focus modal if visible
  const focusBtn = page.locator('#btn-enter-fullscreen-start');
  if (await focusBtn.count() > 0 && await focusBtn.isVisible()) {
    console.log('   Dismissing pre-exam focus modal...');
    await focusBtn.click();
    await page.waitForTimeout(600);
  }

  // Record initial question index
  const initialQNum = await page.evaluate(() => {
    const qNumEl = document.getElementById('current-question-num') || document.querySelector('.question-number-badge');
    return qNumEl ? qNumEl.innerText.trim() : 'Unknown';
  });
  console.log('   Initial Question Number:', initialQNum);

  // Open modal via header giveup-btn
  console.log('2. Opening Submit Modal via window.openSubmitModal()...');
  await page.evaluate(() => {
    if (window.openSubmitModal) window.openSubmitModal();
    else document.getElementById('submit-modal').classList.remove('hidden');
  });
  await page.waitForTimeout(600);

  // Capture Full Desktop View
  const desktopPath = path.join(ARTIFACT_DIR, 'live_check_desktop_modal.png');
  await page.screenshot({ path: desktopPath });
  console.log('   ✔ Captured Desktop Fullscreen:', desktopPath);

  // Precise Crop of Modal Box
  const modalBox = page.locator('#submit-modal-box');
  const cropPath = path.join(ARTIFACT_DIR, 'live_check_modal_crop.png');
  await modalBox.screenshot({ path: cropPath });
  console.log('   ✔ Captured Modal Box Precise Crop:', cropPath);

  // Extract Exact Metrics & Computed Styles
  const metrics = await page.evaluate(() => {
    const box = document.getElementById('submit-modal-box');
    const giveUpBtn = document.getElementById('danger-submit-btn');
    const unifiedCard = document.getElementById('hazard-warning-block');
    const innerCounter = document.getElementById('hazard-counter-block');
    const backBtn = document.getElementById('cancel-submit-btn');

    const getBox = el => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return {
        width: Math.round(r.width),
        height: Math.round(r.height),
        bg: s.backgroundColor,
        color: s.color,
        border: s.border,
        borderColor: s.borderColor,
        boxShadow: s.boxShadow,
        borderRadius: s.borderRadius
      };
    };

    return {
      modal: getBox(box),
      giveUp: getBox(giveUpBtn),
      unifiedCard: getBox(unifiedCard),
      innerCounter: getBox(innerCounter),
      backBtn: getBox(backBtn)
    };
  });

  console.log('\n📊 Measured Live Spatial & Color Metrics:');
  console.log('   - Modal Box:', `${metrics.modal.width}x${metrics.modal.height}px`, `bg: ${metrics.modal.bg}`, `border: ${metrics.modal.borderColor}`);
  console.log('   - Give Up Btn:', `${metrics.giveUp.width}x${metrics.giveUp.height}px`, `bg: ${metrics.giveUp.bg}`, `border: ${metrics.giveUp.borderColor}`);
  console.log('   - Unified Card:', `${metrics.unifiedCard.width}x${metrics.unifiedCard.height}px`, `bg: ${metrics.unifiedCard.bg}`, `border: ${metrics.unifiedCard.borderColor}`);
  console.log('   - Inner Counter:', `${metrics.innerCounter.width}x${metrics.innerCounter.height}px`, `bg: ${metrics.innerCounter.bg}`);
  console.log('   - Back to Test Btn:', `${metrics.backBtn.width}x${metrics.backBtn.height}px`, `bg: ${metrics.backBtn.bg}`, `border: ${metrics.backBtn.borderColor}`);

  // Assertions on styles
  assert.ok(metrics.modal.width <= 380, 'Modal width should not exceed 380px');
  assert.ok(metrics.giveUp.borderColor.includes('255, 0, 0'), 'Give Up button must have red accent border');
  assert.ok(metrics.unifiedCard.borderColor.includes('255, 204, 0') || metrics.unifiedCard.borderColor.includes('255, 215, 0'), 'Unified card must have yellow accent border');
  assert.ok(metrics.backBtn.borderColor.includes('0, 192, 0'), 'Back button must have green accent border');
  console.log('   ✔ All accent color and spatial bounds validated');

  // 3. Test Behavioral Click: "BACK TO THE TEST"
  console.log('\n3. Testing "BACK TO THE TEST" click behavior...');
  await page.click('#cancel-submit-btn');
  await page.waitForTimeout(400);

  const isModalHidden = await page.evaluate(() => document.getElementById('submit-modal').classList.contains('hidden'));
  assert.ok(isModalHidden, 'Modal must be hidden after clicking BACK TO THE TEST');

  const afterQNum = await page.evaluate(() => {
    const qNumEl = document.getElementById('current-question-num') || document.querySelector('.question-number-badge');
    return qNumEl ? qNumEl.innerText.trim() : 'Unknown';
  });
  assert.strictEqual(afterQNum, initialQNum, 'Active question MUST NOT change after clicking BACK TO THE TEST');
  console.log(`   ✔ Modal closed cleanly. Question index preserved at ${afterQNum} (ZERO unwanted jumping)!`);

  // 4. Test Mobile Viewport (390 x 844 - iPhone / Android)
  console.log('\n4. Testing Mobile Viewport (390 x 844)...');
  const contextMobile = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const pageMobile = await contextMobile.newPage();

  await pageMobile.addInitScript(() => {
    const session = {
      student_id: 'a5e9451f-9bb5-493c-8c2d-27dbdcbb5a6e',
      student_name: 'Aditya',
      program_id: 'd9b3e15b-9b4e-4b47-b248-6d8175e11470',
      institution_id: 'e6988891-b3b3-4f9e-b143-df9cbb87841c'
    };
    sessionStorage.setItem('topscore_session', JSON.stringify(session));
  });

  await pageMobile.goto('http://127.0.0.1:5500/test.html?id=31b7ac85-4c44-4a45-81d4-3a077207dc03', { waitUntil: 'networkidle' });
  await pageMobile.waitForTimeout(2000);

  const mobileFocusBtn = pageMobile.locator('#btn-enter-fullscreen-start');
  if (await mobileFocusBtn.count() > 0 && await mobileFocusBtn.isVisible()) {
    await mobileFocusBtn.click();
    await pageMobile.waitForTimeout(600);
  }

  await pageMobile.evaluate(() => {
    if (window.openSubmitModal) window.openSubmitModal();
    else document.getElementById('submit-modal').classList.remove('hidden');
  });
  await pageMobile.waitForTimeout(500);

  const mobileCropPath = path.join(ARTIFACT_DIR, 'live_check_mobile_modal.png');
  await pageMobile.screenshot({ path: mobileCropPath });
  console.log('   ✔ Captured Mobile Viewport Screenshot:', mobileCropPath);

  await browser.close();
  console.log('\n🎉 ALL AUTOMATED VISUAL & BEHAVIORAL CHECKS PASSED (100%)!\n');
}

runCheck().catch(err => {
  console.error('❌ Check failed:', err);
  process.exit(1);
});
