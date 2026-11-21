import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import http from 'http';

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

const ARTIFACT_DIR = 'C:\\Users\\ASUS\\.gemini\\antigravity\\brain\\1cf05216-dd8e-414c-814a-db7d9174d622';

const TEST_SCENARIOS = [
  {
    id: 'written_mode',
    name: 'Written Mode (Virtual Keyboard)',
    filename: 'test_vocab_written_keyboard.png',
    testData: {
      title: '2nd Vocabulary D Exam - Cooking Class',
      status: 'PUBLISHED',
      test_type: 'exam',
      test_subtype: 'VOCAB_EXAM',
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
  {
    id: 'spoken_words_mode',
    name: 'Spoken Mode - Words',
    filename: 'test_vocab_spoken_words.png',
    testData: {
      title: '2nd Vocabulary C1 Task - Shopping & Choosing Products',
      status: 'PUBLISHED',
      test_type: 'quiz',
      test_subtype: 'VOCAB_TASK',
      answer_type: 'spoken',
      working_duration_minutes: 10
    },
    row: {
      id: 'row-spoken-word-1',
      question_id: 'q-spoken-word-1',
      question_text_snapshot: 'Bertanya',
      question_snapshot: {
        question_text: 'Bertanya',
        answer_type: 'spoken',
        correct_answer: 'ask',
        theme: 'Shopping',
        theme_code: 'C',
        topic: 'Shopping & Choosing Products',
        word_type: 'Verb',
        category: 'Words'
      }
    }
  },
  {
    id: 'multiple_choice_mode',
    name: 'Multiple Choice Mode (Options)',
    filename: 'test_vocab_multiple_choice.png',
    testData: {
      title: '3rd Vocabulary D Exam - High-Frequency',
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
          'take control of the incident',
          'take responsibility for the crisis',
          'bring the situation under control',
          'step in during the emergency'
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
    filename: 'test_vocab_phrase_chips.png',
    testData: {
      title: '1st Vocabulary A Exam - Foundational Communication',
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
  },
  {
    id: 'level0_evnikom_mode',
    name: 'Level 0 Evnikom Non-Level Task',
    filename: 'test_vocab_level0_evnikom.png',
    testData: {
      title: 'Evnikom Vocabulary Task 0A1 - Time Name',
      status: 'PUBLISHED',
      test_type: 'quiz',
      test_subtype: 'VOCAB_TASK',
      answer_type: 'spoken',
      working_duration_minutes: 15
    },
    row: {
      id: 'row-evn-1',
      question_id: 'q-evn-1',
      question_text_snapshot: 'Waktu pagi hari',
      question_snapshot: {
        question_text: 'Waktu pagi hari',
        answer_type: 'spoken',
        correct_answer: 'morning',
        theme: 'Time Name',
        theme_code: '0A',
        topic: 'Time Name',
        word_type: 'Noun',
        category: 'Words'
      }
    }
  }
];

async function capture() {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Starting snapshot server on ${baseUrl}...`);

  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch (_) {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  }

  for (const sc of TEST_SCENARIOS) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 800 },
      deviceScaleFactor: 2
    });

    await page.addInitScript(() => {
      const mockSession = {
        student_id: 'test-student-1',
        student_name: 'Mr. Ayya Sofyandi Mzeth',
        institution_id: 'test-inst-1',
        institution_name: 'CAKE ENGLISH COURSE',
        program_id: 'test-prog-1',
        program_name: 'Camp',
        batch_id: 'test-batch-1',
        level_id: 'test-level-1',
        level_name: '2nd Level',
        level_number: 2,
        authenticated_at: new Date().toISOString()
      };
      sessionStorage.setItem('topscore_session', JSON.stringify(mockSession));
      localStorage.setItem('topscore_session', JSON.stringify(mockSession));
      sessionStorage.setItem('topscore_test_id', 'ratio-test');
    });

    await page.goto(`${baseUrl}/test.html?test_id=ratio-test`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    await page.waitForFunction(() => typeof window.__renderTestScenario === 'function', { timeout: 10000 });

    await page.evaluate((scenarioData) => {
      window.__renderTestScenario(scenarioData);
    }, sc);

    await page.waitForTimeout(400);
    await page.waitForSelector('.question-box-prompt', { timeout: 5000 });

    // Clean any toasts
    await page.evaluate(() => {
      document.querySelectorAll('.toast, #toast-container, .toast-notification').forEach(el => el.remove());
    });

    const outPath = path.join(ARTIFACT_DIR, sc.filename);
    await page.screenshot({ path: outPath });
    console.log(`Saved screenshot: ${sc.filename}`);
    await page.close();
  }

  await browser.close();
  server.close();
  console.log('All screenshots captured successfully!');
  process.exit(0);
}

capture().catch(err => {
  console.error('Capture error:', err);
  process.exit(1);
});
