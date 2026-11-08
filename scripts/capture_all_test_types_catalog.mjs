import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/test.html';
  const filePath = path.join(process.cwd(), reqPath);

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

const BRAIN_DIR = 'C:\\Users\\Top\\.gemini\\antigravity\\brain\\9b065f0c-6f7c-402c-8b83-d748d1419b9e';
const SCREENSHOTS_DIR = path.join(BRAIN_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const TEST_SCENARIOS = [
  {
    id: 'written_mode',
    name: 'Written Mode (Virtual Keyboard)',
    filename: 'test_type_1_written_mode.png',
    testData: {
      title: '2nd Vocabulary A Words Exam - PUBLIC SPEAKING',
      status: 'PUBLISHED',
      test_type: 'exam',
      test_subtype: 'VOCAB_EXAM',
      answer_type: 'written',
      working_duration_minutes: 15
    },
    row: {
      id: 'row-written-1',
      question_id: 'q-written-1',
      question_text_snapshot: 'Menyampaikan presentasi',
      question_snapshot: {
        question_text: 'Menyampaikan presentasi',
        answer_type: 'written',
        correct_answer: 'deliver a presentation',
        theme: 'Workplace',
        theme_code: 'A',
        topic: 'Introduction & Delivery',
        word_type: 'Phrase',
        category: 'Words'
      }
    }
  },
  {
    id: 'spoken_words_mode',
    name: 'Spoken Mode - Words (Mic & Waveform)',
    filename: 'test_type_2_spoken_words_mode.png',
    testData: {
      title: '2nd Vocabulary B2 Words Task - Podcast Interviewing & Discussion',
      status: 'PUBLISHED',
      test_type: 'quiz',
      test_subtype: 'VOCAB_TASK',
      answer_type: 'spoken',
      working_duration_minutes: 10
    },
    row: {
      id: 'row-spoken-word-1',
      question_id: 'q-spoken-word-1',
      question_text_snapshot: 'Wawancara',
      question_snapshot: {
        question_text: 'Wawancara',
        answer_type: 'spoken',
        correct_answer: 'interview',
        theme: 'Tourism',
        theme_code: 'B',
        topic: 'Podcast Interviewing',
        word_type: 'Word',
        category: 'Words'
      }
    }
  },
  {
    id: 'spoken_phrases_mode',
    name: 'Spoken Mode - Phrases (Speech-to-Text)',
    filename: 'test_type_3_spoken_phrases_mode.png',
    testData: {
      title: '3rd Vocabulary D4 Phrases Task - Strategy, Solutions & Expression',
      status: 'PUBLISHED',
      test_type: 'quiz',
      test_subtype: 'PHRASE_TASK',
      answer_type: 'spoken',
      working_duration_minutes: 12
    },
    row: {
      id: 'row-spoken-phrase-1',
      question_id: 'q-spoken-phrase-1',
      question_text_snapshot: 'Menemukan jalan keluar yang kreatif',
      question_snapshot: {
        question_text: 'Menemukan jalan keluar yang kreatif',
        answer_type: 'spoken',
        correct_answer: 'come up with a creative solution',
        theme: 'High-Frequency',
        theme_code: 'D',
        topic: 'Strategy & Solutions',
        word_type: 'Phrase',
        category: 'Phrases'
      }
    }
  },
  {
    id: 'multiple_choice_mode',
    name: 'Multiple Choice Mode (4 Option Cards)',
    filename: 'test_type_4_multiple_choice_mode.png',
    testData: {
      title: '3rd Vocabulary D Phrases Exam - High-Frequency',
      status: 'PUBLISHED',
      test_type: 'exam',
      test_subtype: 'PHRASE_EXAM',
      answer_type: 'selection',
      working_duration_minutes: 20
    },
    row: {
      id: 'row-mc-1',
      question_id: 'q-mc-1',
      question_text_snapshot: 'Mengambil alih kendali situasi darurat',
      question_snapshot: {
        question_text: 'Mengambil alih kendali situasi darurat',
        answer_type: 'selection',
        correct_answer: 'take charge of the emergency',
        options_snapshot: [
          'take charge of the emergency',
          'step down from the position',
          'postpone the entire schedule',
          'ignore the surrounding warning'
        ],
        theme: 'High-Frequency',
        theme_code: 'D',
        topic: 'Emergency & Leadership',
        word_type: 'Phrase',
        category: 'Phrases'
      }
    }
  },
  {
    id: 'phrase_chips_mode',
    name: 'Phrase Chips Mode (Interactive Tile Builder)',
    filename: 'test_type_5_phrase_chips_mode.png',
    testData: {
      title: '1st Vocabulary A Phrases Exam - Foundational Communication',
      status: 'PUBLISHED',
      test_type: 'exam',
      test_subtype: 'PHRASE_EXAM',
      answer_type: 'phrase_chips',
      working_duration_minutes: 15
    },
    row: {
      id: 'row-chips-1',
      question_id: 'q-chips-1',
      question_text_snapshot: 'Senang bertemu dengan Anda lagi',
      question_snapshot: {
        question_text: 'Senang bertemu dengan Anda lagi',
        answer_type: 'phrase_chips',
        correct_answer: 'nice to meet you again',
        options_snapshot: [
          'nice',
          'to',
          'meet',
          'you',
          'again',
          'see',
          'too'
        ],
        theme: 'Workplace',
        theme_code: 'A',
        topic: 'Greetings & Basics',
        word_type: 'Phrase',
        category: 'Phrases'
      }
    }
  }
];

async function runCatalogCapture() {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`\n======================================================`);
  console.log(`TOPSCORE LMS — CAPTURING ALL TEST TYPES SCREENSHOTS`);
  console.log(`Server URL: ${baseUrl}`);
  console.log(`======================================================\n`);

  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch (_) {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  }

  // 1. MOBILE CAPTURE (390 x 844 - iPhone 14/15/16)
  console.log(`--- [1/2] CAPTURING MOBILE VIEWPORTS (390 x 844) ---`);
  for (const sc of TEST_SCENARIOS) {
    console.log(`Capturing: ${sc.name}...`);
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2
    });

    await page.addInitScript(() => {
      const mockSession = {
        student_id: 'bae52c8d-3456-4334-8f7a-7ba3c268c642',
        student_name: 'Mr. Ayya Sofyandi Mzeth',
        name: 'Mr. Ayya Sofyandi Mzeth',
        institution_id: 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447',
        institution_name: 'CAKE ENGLISH COURSE',
        program_id: '11deb53c-434a-44b0-83ca-1cc9b239cab3',
        program_name: 'Camp',
        batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7',
        level_id: '9936683a-5b4a-4796-bb5d-a7fd8ecf0b71',
        level_name: '2nd Level',
        level_number: 2,
        gender: 'male',
        photo_url: '',
        birth_date: '2000-01-01',
        education: 'University',
        authenticated_at: new Date().toISOString()
      };
      sessionStorage.setItem('topscore_session', JSON.stringify(mockSession));
      localStorage.setItem('topscore_session', JSON.stringify(mockSession));
      sessionStorage.setItem('topscore_test_id', 'catalog-mock-test');
    });

    await page.goto(`${baseUrl}/test.html?test_id=catalog-mock-test`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    // Wait for test module harness hook
    await page.waitForFunction(() => typeof window.__renderTestScenario === 'function', { timeout: 10000 });

    // Execute render scenario
    await page.evaluate((scenarioData) => {
      window.__renderTestScenario(scenarioData);
    }, sc);

    await page.waitForTimeout(400);
    await page.waitForSelector('.question-box-prompt', { timeout: 5000 });

    // Clean up any lingering toast notifications before capture
    await page.evaluate(() => {
      document.querySelectorAll('.toast, #toast-container, .toast-notification').forEach(el => el.remove());
    });

    const screenshotPath = path.join(SCREENSHOTS_DIR, sc.filename);
    const rootPath = path.join(BRAIN_DIR, sc.filename);

    await page.screenshot({ path: screenshotPath, fullPage: false });
    fs.copyFileSync(screenshotPath, rootPath);
    console.log(`  ✅ Mobile screenshot saved: ${sc.filename}`);

    await page.close();
  }

  // 2. DESKTOP OVERVIEW CAPTURE (1280 x 800)
  console.log(`\n--- [2/2] CAPTURING DESKTOP OVERVIEW (1280 x 800) ---`);
  const desktopScenarios = [
    {
      sc: TEST_SCENARIOS[0],
      filename: 'test_type_1_written_mode_desktop.png'
    },
    {
      sc: TEST_SCENARIOS[3],
      filename: 'test_type_4_multiple_choice_desktop.png'
    }
  ];

  for (const ds of desktopScenarios) {
    console.log(`Capturing Desktop: ${ds.sc.name}...`);
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 2
    });

    await page.addInitScript(() => {
      const mockSession = {
        student_id: 'bae52c8d-3456-4334-8f7a-7ba3c268c642',
        student_name: 'Mr. Ayya Sofyandi Mzeth',
        name: 'Mr. Ayya Sofyandi Mzeth',
        institution_id: 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447',
        institution_name: 'CAKE ENGLISH COURSE',
        program_id: '11deb53c-434a-44b0-83ca-1cc9b239cab3',
        program_name: 'Camp',
        batch_id: '3e7288b7-a90e-4323-9b02-24e73991f0d7',
        level_id: '9936683a-5b4a-4796-bb5d-a7fd8ecf0b71',
        gender: 'male',
        authenticated_at: new Date().toISOString()
      };
      sessionStorage.setItem('topscore_session', JSON.stringify(mockSession));
      localStorage.setItem('topscore_session', JSON.stringify(mockSession));
      sessionStorage.setItem('topscore_test_id', 'catalog-mock-test');
    });

    await page.goto(`${baseUrl}/test.html?test_id=catalog-mock-test`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    await page.waitForFunction(() => typeof window.__renderTestScenario === 'function', { timeout: 10000 });

    await page.evaluate((scenarioData) => {
      window.__renderTestScenario(scenarioData);
    }, ds.sc);

    await page.waitForTimeout(400);
    await page.waitForSelector('.question-box-prompt', { timeout: 5000 });

    // Clean up any lingering toast notifications before capture
    await page.evaluate(() => {
      document.querySelectorAll('.toast, #toast-container, .toast-notification').forEach(el => el.remove());
    });

    const screenshotPath = path.join(SCREENSHOTS_DIR, ds.filename);
    const rootPath = path.join(BRAIN_DIR, ds.filename);

    await page.screenshot({ path: screenshotPath, fullPage: false });
    fs.copyFileSync(screenshotPath, rootPath);
    console.log(`  ✅ Desktop screenshot saved: ${ds.filename}`);

    await page.close();
  }

  await browser.close();
  server.close();

  console.log(`\n🎉 ALL TEST TYPES CATALOG SCREENSHOTS PRODUCED SUCCESSFULLY!`);
}

runCatalogCapture().catch(e => {
  console.error('Fatal capture error:', e);
  process.exit(1);
});

