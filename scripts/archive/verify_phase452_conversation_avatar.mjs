import fs from 'fs';
import { chromium } from '@playwright/test';

async function runVerification() {
  console.log('====================================================');
  console.log('🚀 RUNNING PHASE 452 VERIFICATION SUITE');
  console.log('Target: AI Conversation Living Avatar & Waveform Engine');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(desc, condition) {
    total++;
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
    }
  }

  // --- Step 1: Static Code Assertions ---
  console.log('--- Step 1: Static Code Assertions ---');
  const html = fs.readFileSync('conversation.html', 'utf8');
  const css = fs.readFileSync('css/conversation.css', 'utf8');
  const js = fs.readFileSync('js/conversation-room.js', 'utf8');

  assert('conversation.html contains #living-avatar-stage', html.includes('id="living-avatar-stage"'));
  assert('conversation.html contains .avatar-ripple-container & .avatar-ripple-ring', html.includes('avatar-ripple-container') && html.includes('avatar-ripple-ring'));
  assert('conversation.html contains #conv-waveform-canvas', html.includes('id="conv-waveform-canvas"'));
  assert('conversation.html contains #avatar-state-badge', html.includes('id="avatar-state-badge"'));
  assert('css/conversation.css styles [data-state="idle"]', css.includes('[data-state="idle"]'));
  assert('css/conversation.css styles [data-state="listening"]', css.includes('[data-state="listening"]'));
  assert('css/conversation.css styles [data-state="thinking"]', css.includes('[data-state="thinking"]'));
  assert('css/conversation.css styles [data-state="speaking"]', css.includes('[data-state="speaking"]'));
  assert('js/conversation-room.js implements setAvatarState', js.includes('setAvatarState(state)'));
  assert('js/conversation-room.js implements initWaveformVisualizer', js.includes('initWaveformVisualizer()'));

  // --- Step 2: Live Playwright Browser Verification ---
  console.log('\n--- Step 2: Live Playwright Browser Verification ---');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1366, height: 768 });

  await page.addInitScript(() => {
    // Neutralize Live Server auto-reload
    window.WebSocket = class MockWebSocket {
      constructor() {}
      addEventListener() {}
      removeEventListener() {}
      send() {}
      close() {}
    };

    // Seed mock student session
    const studentSession = JSON.stringify({
      student_id: 'std-test-conv',
      student_name: 'Alex Rivera',
      assigned_role: 'Lead Engineer',
      auth: true
    });
    sessionStorage.setItem('topscore_session', studentSession);
    localStorage.setItem('topscore_session', studentSession);
  });

  try {
    await page.goto('http://127.0.0.1:5500/conversation.html?room=CONV-TEST', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    const avatarStage = await page.$('#living-avatar-stage');
    assert('#living-avatar-stage is present in DOM', !!avatarStage);

    const isVisible = await page.isVisible('#living-avatar-stage');
    assert('#living-avatar-stage is visible on screen', isVisible);

    const canvas = await page.$('#conv-waveform-canvas');
    assert('#conv-waveform-canvas is present in DOM', !!canvas);

    // Initial state should be idle
    const initialState = await page.getAttribute('#living-avatar-stage', 'data-state');
    assert('Initial avatar state is idle', initialState === 'idle');

    // Test State Transitions via setAvatarState
    // 1. LISTENING State
    await page.evaluate(() => {
      if (window.convRoomApp) window.convRoomApp.setAvatarState('listening');
    });
    const listeningState = await page.getAttribute('#living-avatar-stage', 'data-state');
    const listeningText = await page.textContent('#avatar-state-text');
    assert('Avatar transitions to listening state', listeningState === 'listening' && listeningText.includes('LISTENING'));

    // 2. THINKING State
    await page.evaluate(() => {
      if (window.convRoomApp) window.convRoomApp.setAvatarState('thinking');
    });
    const thinkingState = await page.getAttribute('#living-avatar-stage', 'data-state');
    const thinkingText = await page.textContent('#avatar-state-text');
    assert('Avatar transitions to thinking state', thinkingState === 'thinking' && thinkingText.includes('THINKING'));

    // 3. SPEAKING State
    await page.evaluate(() => {
      if (window.convRoomApp) window.convRoomApp.setAvatarState('speaking');
    });
    const speakingState = await page.getAttribute('#living-avatar-stage', 'data-state');
    const speakingText = await page.textContent('#avatar-state-text');
    assert('Avatar transitions to speaking state', speakingState === 'speaking' && speakingText.includes('SPEAKING'));

    // Capture screenshot in speaking state with waveform
    await page.screenshot({ path: 'tests/artifacts/phase452_living_avatar_waveform.png' });
    console.log('✓ Captured screenshot: tests/artifacts/phase452_living_avatar_waveform.png');

    // 4. Return to IDLE State
    await page.evaluate(() => {
      if (window.convRoomApp) window.convRoomApp.setAvatarState('idle');
    });
    const idleState = await page.getAttribute('#living-avatar-stage', 'data-state');
    assert('Avatar returns cleanly to idle state', idleState === 'idle');

  } catch (err) {
    console.error('Playwright verification error:', err);
    assert('Playwright test completed without unhandled exceptions', false);
  } finally {
    await browser.close();
  }

  console.log('\n====================================================');
  console.log(`📊 FINAL RESULTS: ${passed} / ${total} CHECKS PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('====================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runVerification();

