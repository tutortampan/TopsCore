/**
 * scripts/test_test_modes_runtime_guard.mjs
 *
 * Automated Runtime & Question Rendering Guard for TopsCore LMS
 * Exercises all 5 question modalities (Written, Spoken, MCQ, Description, Phrase Chips)
 * in a real browser environment to catch any ReferenceError (e.g. undeclared variables),
 * TypeError, or DOM mount failures before code ever reaches production.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { chromium } from 'playwright';

const ROOT_DIR = process.cwd();

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/test.html';
  const filePath = path.join(ROOT_DIR, reqPath);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found: ' + reqPath);
    return;
  }
  const ext = path.extname(filePath);
  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Access-Control-Allow-Origin': '*'
  });
  fs.createReadStream(filePath).pipe(res);
});

async function runGuard() {
  console.log('===============================================================');
  console.log('🛡️ RUNNING TEST MODES RUNTIME GUARD & UNDEFINED VARIABLE AUDIT');
  console.log('===============================================================\n');

  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const targetUrl = `http://localhost:${port}/test.html?test_id=guard-check`;

  let browser;
  try {
    try {
      browser = await chromium.launch({ channel: 'msedge', headless: true });
    } catch (_) {
      browser = await chromium.launch({ channel: 'chrome', headless: true });
    }
  } catch (_) {
    browser = await chromium.launch({ headless: true });
  }

  const page = await browser.newPage({
    viewport: { width: 390, height: 800 },
    deviceScaleFactor: 2
  });

  const pageErrors = [];
  page.on('pageerror', err => {
    console.error('  ❌ [BROWSER PAGE ERROR]:', err.message);
    pageErrors.push(err);
  });

  await page.addInitScript(() => {
    window.__isTestHarnessMode = true;
    const mockSession = {
      student_id: 'guard-student-uuid',
      student_name: 'Test Student',
      institution_name: 'CAKE ENGLISH COURSE',
      program_name: 'Camp',
      authenticated_at: new Date().toISOString()
    };
    sessionStorage.setItem('topscore_session', JSON.stringify(mockSession));
    sessionStorage.setItem('topscore_test_id', 'guard-check');
    window.alert = () => {};
    window.confirm = () => true;

    // Prevent harness auto-redirect on boot error
    const origSetTimeout = window.setTimeout;
    window.setTimeout = function(fn, delay, ...args) {
      if (typeof fn === 'function' && fn.toString().includes('dashboard.html')) {
        return -1;
      }
      return origSetTimeout(fn, delay, ...args);
    };
  });

  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);

  // Ensure harness is ready
  await page.waitForFunction(() => typeof window.__renderTestScenario === 'function', { timeout: 10000 });

  const testScenarios = [
    {
      name: 'Written Mode (Words Exam & Written Task)',
      scenario: {
        testData: {
          title: '3rd Vocabulary Exam A - World of Work',
          status: 'PUBLISHED',
          test_type: 'exam',
          answer_type: 'written',
          working_duration_minutes: 15
        },
        row: {
          id: 'row-written-1',
          question_id: 'q-written-1',
          question_text_snapshot: 'Menyampaikan presentasi resep',
          question_snapshot: {
            question_text: 'Menyampaikan presentasi resep',
            answer_type: 'written',
            correct_answer: 'deliver a recipe presentation',
            theme: 'Culinary',
            theme_code: 'D',
            topic: 'Cooking Presentation',
            word_type: 'Phrase',
            category: 'Phrases'
          }
        }
      },
      expectedSelector: '#answer-container-written'
    },
    {
      name: 'Spoken / Speech-to-Text Mode',
      scenario: {
        testData: {
          title: '2nd Vocabulary Task A1 - Greetings',
          status: 'PUBLISHED',
          test_type: 'task',
          answer_type: 'spoken',
          working_duration_minutes: 15
        },
        row: {
          id: 'row-spoken-1',
          question_id: 'q-spoken-1',
          question_text_snapshot: 'Selamat pagi, apa kabar?',
          question_snapshot: {
            question_text: 'Selamat pagi, apa kabar?',
            answer_type: 'spoken',
            correct_answer: 'Good morning, how are you?',
            theme: 'Workplace',
            theme_code: 'A',
            topic: 'Greetings',
            word_type: 'Phrase',
            category: 'Phrases'
          }
        }
      },
      expectedSelector: '#speech-answer-container'
    },
    {
      name: 'Multiple Choice / Selection Mode',
      scenario: {
        testData: {
          title: '1st Vocabulary Task B1 - Daily Life',
          status: 'PUBLISHED',
          test_type: 'task',
          answer_type: 'selection',
          working_duration_minutes: 10
        },
        row: {
          id: 'row-mc-1',
          question_id: 'q-mc-1',
          question_text_snapshot: 'Mengambil alih kendali',
          question_snapshot: {
            question_text: 'Mengambil alih kendali',
            answer_type: 'selection',
            correct_answer: 'take charge',
            options_snapshot: ['take charge', 'step down', 'hold on', 'give up'],
            theme: 'Leadership',
            theme_code: 'A',
            topic: 'Daily Life',
            word_type: 'Phrase',
            category: 'Phrases'
          }
        }
      },
      expectedSelector: '#answer-container-mc'
    },
    {
      name: 'Description / Point & Speak Mode',
      scenario: {
        testData: {
          title: '3rd Vocabulary Task D1 - Tell Me What You See',
          status: 'PUBLISHED',
          test_type: 'task',
          answer_type: 'description',
          working_duration_minutes: 15
        },
        row: {
          id: 'row-desc-1',
          question_id: 'q-desc-1',
          question_text_snapshot: 'Describe what you see in the classroom',
          question_snapshot: {
            question_text: 'Describe what you see in the classroom',
            answer_type: 'description',
            theme: 'High-Frequency',
            theme_code: 'D',
            topic: 'Classroom Objects',
            word_type: 'Sentence',
            category: 'Description'
          }
        }
      },
      expectedSelector: '.desc-card-camera'
    },
    {
      name: 'Phrase Chips / Fallback Mode',
      scenario: {
        testData: {
          title: '2nd Vocabulary Task C1 - CCU Phrases',
          status: 'PUBLISHED',
          test_type: 'task',
          answer_type: 'phrases',
          working_duration_minutes: 15
        },
        row: {
          id: 'row-chips-1',
          question_id: 'q-chips-1',
          question_text_snapshot: 'Sampai jumpa besok pagi',
          question_snapshot: {
            question_text: 'Sampai jumpa besok pagi',
            answer_type: 'phrases',
            correct_answer: 'See you tomorrow morning',
            theme: 'CCU',
            theme_code: 'C',
            topic: 'Daily Greetings',
            word_type: 'Phrase',
            category: 'phrases'
          }
        }
      },
      expectedSelector: '#answer-container-chips'
    }
  ];

  let passedScenarios = 0;

  for (const item of testScenarios) {
    console.log(`▶ Testing Modality: ${item.name}...`);
    const initialErrorCount = pageErrors.length;

    await page.evaluate(sc => {
      window.__renderTestScenario(sc);
    }, item.scenario);

    await page.waitForTimeout(200);

    const hasNewError = pageErrors.length > initialErrorCount;
    assert.strictEqual(hasNewError, false, `Runtime error occurred while rendering ${item.name}!`);

    const elementExists = await page.evaluate(sel => {
      return !!document.querySelector(sel);
    }, item.expectedSelector);

    assert.ok(elementExists, `Target container ${item.expectedSelector} was not found for ${item.name}`);
    console.log(`  ✔ [PASS] ${item.name} rendered cleanly with zero runtime exceptions.`);
    passedScenarios++;
  }

  // Final assertions
  assert.strictEqual(pageErrors.length, 0, `Detected ${pageErrors.length} total browser errors during test rendering!`);
  console.log(`\n🎉 ALL ${passedScenarios} QUESTION MODALITIES VERIFIED! ZERO UNDECLARED VARIABLES OR RUNTIME CRASHES.`);

  await browser.close();
  server.close();
}

runGuard().catch(err => {
  console.error('\n❌ TEST MODES RUNTIME GUARD FAILED:\n', err);
  if (server.listening) server.close();
  process.exit(1);
});
