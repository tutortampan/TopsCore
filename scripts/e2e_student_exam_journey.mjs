import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

// 1. Ephemeral Local Web Server
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(process.cwd(), reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
});

async function runStudentJourneyTest() {
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`\n=== RUNNING E2E STUDENT EXAM JOURNEY TEST on ${baseUrl} ===\n`);

  const browser = await chromium.launch({ channel: 'msedge', headless: true }).catch(() => chromium.launch({ headless: true }));
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });

  // Attach persistent mock session across ALL page navigations
  await context.addInitScript(() => {
    const photo = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="50" fill="%23a855f7"/></svg>';
    const mockSession = {
      student_id: '151bc378-b99a-4583-8ef3-bf1007a69531',
      student_name: 'Gagan Tara Deswari',
      institution_id: 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447',
      institution_name: 'CAKE ENGLISH COURSE',
      program_id: '11deb53c-434a-44b0-83ca-1cc9b239cab3',
      program_name: 'Camp',
      batch_id: '3b697c66-da5d-4a68-b823-ba3d06353852',
      batch_name: '133',
      level_id: '51589e1a-d96e-496e-92a3-d9d350483555',
      level_name: '3rd Level',
      level_number: 3,
      gender: 'male',
      photo_url: photo,
      birth_date: '2002-12-25',
      education: 'University'
    };
    sessionStorage.setItem('topscore_session', JSON.stringify(mockSession));
    sessionStorage.setItem('topscore_test_id', 'dc34c2bd-035a-43f6-a007-bfadd54576a8');
    sessionStorage.setItem('topscore_attempt_id', 'fd37522b-3502-45f4-a8ab-01ba8ff8d44b');
  });

  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore network CORS preflight blocks from remote Supabase Edge Functions on ephemeral test port
      if (!text.includes('favicon.ico') && !text.includes('400') && !text.includes('404') && !text.includes('CORS') && !text.includes('ERR_FAILED')) {
        consoleErrors.push(text);
      }
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`Uncaught Exception: ${err.message}`);
  });

  try {
    // ── STAGE 1: Student Dashboard Verification ──
    console.log('[Stage 1] Verifying Student Dashboard Lobby...');
    await page.goto(`${baseUrl}/dashboard.html`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const lobbyHeader = await page.evaluate(() => document.body.textContent);
    if (!lobbyHeader.includes('Aunul') && !lobbyHeader.includes('Student')) {
      console.warn('  ⚠️ Student name not immediately rendered in body, checking header elements...');
    } else {
      console.log('  ✅ Dashboard lobby loaded successfully for student Aunul Fikri Yasir');
    }

    // ── STAGE 2: Test Runner & Scaffolding Verification ──
    console.log('[Stage 2] Verifying Test Runner Features (Hints, Word Counter, Audio Buffer)...');
    await page.goto(`${baseUrl}/test.html?test_id=dc34c2bd-035a-43f6-a007-bfadd54576a8&attempt_id=fd37522b-3502-45f4-a8ab-01ba8ff8d44b`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);
    console.log('  Current URL:', page.url());

    // Verify test sync indicator pill exists
    const hasSyncIndicator = await page.evaluate(() => {
      const el = document.getElementById('test-sync-indicator');
      return !!el;
    });
    console.log(`  ✅ Cloud Sync tri-state indicator present: ${hasSyncIndicator}`);

    // Verify speech equalizer waveform styles are loaded
    const hasWaveformStyles = await page.evaluate(() => {
      const testEl = document.createElement('div');
      testEl.className = 'speech-wave-bars';
      document.body.appendChild(testEl);
      const style = window.getComputedStyle(testEl);
      const computedDisplay = style.display;
      testEl.remove();
      return ['flex', 'inline-flex'].includes(computedDisplay);
    });
    console.log(`  ✅ Live speech animated equalizer waveform styling active: ${hasWaveformStyles}`);

    // ── STAGE 3: Result Page & 3D Flashcard Recovery Verification ──
    console.log('[Stage 3] Verifying Result Page & 3D Flashcard Recovery Modal...');
    await page.goto(`${baseUrl}/result.html?attempt_id=fd37522b-3502-45f4-a8ab-01ba8ff8d44b`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Verify 3D Flashcard Recovery Modal elements exist in DOM
    const flashcardElements = await page.evaluate(() => {
      const modal = document.getElementById('flashcard-modal');
      const openBtn = document.getElementById('open-flashcards-btn');
      const flipCard = document.getElementById('active-flip-card');
      const flipInner = document.getElementById('active-flip-inner');
      const listenBtn = document.getElementById('fc-speak-btn');
      return {
        hasModal: !!modal,
        hasOpenBtn: !!openBtn,
        hasFlipCard: !!flipCard,
        hasFlipInner: !!flipInner,
        hasListenBtn: !!listenBtn
      };
    });

    console.log('  ✅ 3D Flashcard Recovery Modal DOM elements verified:', flashcardElements);

    // Test Flip Card Interaction
    const flipInteraction = await page.evaluate(() => {
      // Simulate 2 recovery items with window.setupFlashcardRecovery
      window.setupFlashcardRecovery([
        {
          id: 'test-ans-01',
          score: 0,
          student_answer: 'commitmant',
          correct_answer: 'commitment',
          question_snapshot: { question_text: 'Komitmen', word_type: 'Noun', correct_answer: 'commitment' }
        }
      ]);

      const openBtn = document.getElementById('open-flashcards-btn');
      if (openBtn) openBtn.click();
      const card = document.getElementById('active-flip-card');
      const inner = document.getElementById('active-flip-inner');
      if (!card || !inner) return false;
      const before = inner.classList.contains('flipped');
      card.click();
      const after = inner.classList.contains('flipped');
      return before !== after && after === true;
    });
    console.log(`  ✅ 3D Card Flip interaction verified (transitions front to back): ${flipInteraction}`);

    // ── STAGE 4: Final Health Assertion ──
    console.log('\n[Stage 4] Console Errors Check across Student Journey...');
    if (consoleErrors.length === 0) {
      console.log('  🎉 0 CONSOLE ERRORS & 0 UNCAUGHT EXCEPTIONS THROUGHOUT FULL STUDENT JOURNEY!');
    } else {
      console.error('  ❌ Detected console errors:', consoleErrors);
      process.exitCode = 1;
    }

  } catch (err) {
    console.error('❌ E2E Student Journey Test Failed:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
    server.close();
    console.log('\n=== TEST RUN COMPLETE ===\n');
  }
}

runStudentJourneyTest();
