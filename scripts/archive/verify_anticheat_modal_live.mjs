import { chromium } from '@playwright/test';
import assert from 'node:assert';
import path from 'node:path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function runVerification() {
  console.log('🚀 Running Playwright Automated Verification for Phase 426 (Anti-Cheat Redesign)...');

  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  // 1. Mobile Portrait Viewport: iPhone 13/14/15 (390 x 844)
  const contextMobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  const page = await contextMobile.newPage();

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

  console.log('1. Navigating to live test page (http://127.0.0.1:5500/test.html)...');
  await page.goto('http://127.0.0.1:5500/test.html?id=31b7ac85-4c44-4a45-81d4-3a077207dc03', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Dismiss pre-exam focus modal if visible
  const focusBtn = page.locator('#btn-enter-fullscreen-start');
  if (await focusBtn.count() > 0 && await focusBtn.isVisible()) {
    console.log('   Dismissing pre-exam focus modal...');
    await focusBtn.click();
    await page.waitForTimeout(600);
  }

  // Trigger anti-cheat overlay
  console.log('2. Triggering Anti-Cheat Overlay on mobile...');
  await page.evaluate(() => {
    const overlay = document.getElementById('cheat-overlay');
    if (overlay) overlay.style.display = 'flex';
    const strike = document.getElementById('cheat-strikes-badge');
    if (strike) strike.textContent = '{ STRIKE 1 / 10 }';
    const count = document.getElementById('cheat-timer-count');
    if (count) count.textContent = '10';
  });
  await page.waitForTimeout(500);

  // Capture Mobile Screenshot (390x844)
  const mobileScreenshotPath = path.join(ARTIFACT_DIR, 'live_anticheat_mobile_390x844.png');
  await page.screenshot({ path: mobileScreenshotPath });
  console.log('   ✔ Captured Mobile Screenshot (390x844):', mobileScreenshotPath);

  // Capture Card Precise Crop
  const cardLocator = page.locator('#cheat-box-card');
  const cardCropPath = path.join(ARTIFACT_DIR, 'live_anticheat_card_crop.png');
  await cardLocator.screenshot({ path: cardCropPath });
  console.log('   ✔ Captured Card Precise Crop:', cardCropPath);

  // Extract Exact Metrics & Computed Styles
  console.log('3. Validating Computed Styles and Equal Spacing (Option B)...');
  const metrics = await page.evaluate(() => {
    const overlay = document.getElementById('cheat-overlay');
    const card = document.getElementById('cheat-box-card');
    const strike = document.getElementById('cheat-strikes-badge');
    const countdownGroup = document.querySelector('.cheat-countdown-group');
    const countdownCircle = document.querySelector('.cheat-countdown-circle');
    const btn = document.getElementById('dismiss-cheat-btn');

    const overlayStyle = window.getComputedStyle(overlay);
    const cardStyle = window.getComputedStyle(card);
    const strikeStyle = window.getComputedStyle(strike);
    const circleStyle = window.getComputedStyle(countdownCircle);
    const btnStyle = window.getComputedStyle(btn);

    const strikeRect = strike.getBoundingClientRect();
    const countRect = countdownGroup.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    // Spacing between elements:
    const gap1 = countRect.top - strikeRect.bottom;
    const gap2 = btnRect.top - countRect.bottom;

    return {
      overlayDisplay: overlayStyle.display,
      cardWidth: parseFloat(cardStyle.width),
      cardHeight: parseFloat(cardStyle.height),
      cardBg: cardStyle.backgroundColor,
      cardGap: cardStyle.gap,
      strikeText: strike.innerText.trim(),
      strikeColor: strikeStyle.color,
      strikeBorderColor: strikeStyle.borderColor,
      circleWidth: parseFloat(circleStyle.width),
      circleHeight: parseFloat(circleStyle.height),
      circleBorderColor: circleStyle.borderColor,
      btnHeight: parseFloat(btnStyle.height),
      btnText: btn.innerText.trim(),
      btnBorderColor: btnStyle.borderColor,
      gap1: Math.round(gap1),
      gap2: Math.round(gap2)
    };
  });

  console.log('   Metrics:', JSON.stringify(metrics, null, 2));

  // Assertions
  assert.strictEqual(metrics.overlayDisplay, 'flex', 'Overlay must be visible (display: flex)');
  assert(metrics.cardWidth >= 340 && metrics.cardWidth <= 370, `Card width should be ~365px, got ${metrics.cardWidth}`);
  assert.strictEqual(metrics.strikeText, '{ STRIKE 1 / 10 }', 'Strike pill text should match { STRIKE 1 / 10 }');
  
  // Grade E color assertions (rgb(255, 0, 0))
  assert.strictEqual(metrics.strikeColor, 'rgb(255, 0, 0)', 'Strike pill color must be Grade E rgb(255, 0, 0)');
  assert.strictEqual(metrics.strikeBorderColor, 'rgb(255, 0, 0)', 'Strike pill border must be Grade E rgb(255, 0, 0)');
  assert.strictEqual(metrics.circleBorderColor, 'rgb(255, 0, 0)', 'Countdown ring border must be Grade E rgb(255, 0, 0)');

  // Dimensions
  assert(Math.abs(metrics.circleWidth - 120) <= 2, `Countdown circle width should be ~120px, got ${metrics.circleWidth}`);
  assert(Math.abs(metrics.circleHeight - 120) <= 2, `Countdown circle height should be ~120px, got ${metrics.circleHeight}`);
  assert(Math.abs(metrics.btnHeight - 62) <= 3, `Button height should be ~62px, got ${metrics.btnHeight}`);
  assert(metrics.btnText.includes('RETURN TO TEST'), 'Button text must contain RETURN TO TEST');

  // Equal Spacing Assertion: gap1 and gap2 must be 32px!
  assert.strictEqual(metrics.gap1, 32, `Gap 1 between Strike and Countdown must be exactly 32px, got ${metrics.gap1}`);
  assert.strictEqual(metrics.gap2, 32, `Gap 2 between Countdown and Button must be exactly 32px, got ${metrics.gap2}`);
  console.log('   ✔ Programmatic validation: Equal Spacing gap1 (32px) === gap2 (32px)!');

  // 4. Test Behavioral Dismiss Button
  console.log('4. Testing `#dismiss-cheat-btn` click behavior...');
  await page.click('#dismiss-cheat-btn');
  await page.waitForTimeout(500);

  const isOverlayHidden = await page.evaluate(() => {
    const overlay = document.getElementById('cheat-overlay');
    return overlay ? window.getComputedStyle(overlay).display === 'none' : true;
  });
  assert(isOverlayHidden, 'Overlay should be hidden after clicking dismiss button');
  console.log('   ✔ Click on `#dismiss-cheat-btn` cleanly hides `#cheat-overlay`!');

  // 5. Test Smaller Screen Viewport (360 x 640 - Android Small)
  console.log('5. Validating small mobile viewport (360 x 640)...');
  await page.setViewportSize({ width: 360, height: 640 });
  await page.evaluate(() => {
    const overlay = document.getElementById('cheat-overlay');
    if (overlay) overlay.style.display = 'flex';
  });
  await page.waitForTimeout(400);

  const smallScreenshotPath = path.join(ARTIFACT_DIR, 'live_anticheat_mobile_360x640.png');
  await page.screenshot({ path: smallScreenshotPath });
  console.log('   ✔ Captured Small Mobile Screenshot (360x640):', smallScreenshotPath);

  const hasNoOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth <= window.innerWidth &&
           document.documentElement.scrollHeight <= window.innerHeight;
  });
  assert(hasNoOverflow, 'Small mobile screen (360x640) must have zero horizontal and vertical page overflow');
  console.log('   ✔ Zero overflow confirmed on 360x640!');

  await page.close();
  await contextMobile.close();
  await browser.close();

  console.log('\n🎉 ALL AUTOMATED VERIFICATION CHECKS PASSED 100%!');
}

runVerification().catch(err => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
