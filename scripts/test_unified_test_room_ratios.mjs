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

const TEST_SCENARIOS = [
  {
    id: 'written_mode',
    name: 'Written Mode',
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
    name: 'Spoken Mode (Words)',
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
    name: 'Spoken Mode (Phrases)',
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
    name: 'Multiple Choice Mode',
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
    name: 'Phrase Chips Mode',
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

async function runRatioVerification() {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`\n======================================================`);
  console.log(`TOPSCORE LMS — TEST ROOM UNIFIED RATIO VERIFICATION`);
  console.log(`Server URL: ${baseUrl}`);
  console.log(`======================================================\n`);

  let browser;
  try {
    browser = await chromium.launch({ channel: 'msedge', headless: true });
  } catch (_) {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
  }

  const results = {};
  let allPass = true;

  for (const sc of TEST_SCENARIOS) {
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2
    });

    await page.addInitScript(() => {
      const mockSession = {
        student_id: 'test-student-1',
        student_name: 'Test Student',
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

    // Measure bounding boxes
    const measurements = await page.evaluate(() => {
      const q = document.querySelector('.question-box-prompt');
      const m = document.querySelector('.metadata-grid');
      const ansW = document.querySelector('#answer-container-written');
      const ansS = document.querySelector('#speech-answer-container');
      const ansMC = document.querySelector('#answer-container-mc');
      const ansChips = document.querySelector('#answer-container-chips');
      const vk = document.querySelector('#virtual-keyboard-container');
      const mic = document.querySelector('#speech-control-container');
      const main = document.querySelector('.test-main-content');

      const getProps = (el) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return {
          height: r.height,
          width: r.width
        };
      };

      return {
        main: main ? { height: main.getBoundingClientRect().height, width: main.getBoundingClientRect().width } : null,
        question: getProps(q),
        metadata: getProps(m),
        writtenAnswer: getProps(ansW),
        speechAnswer: getProps(ansS),
        mcAnswer: getProps(ansMC),
        chipsAnswer: getProps(ansChips),
        vk: getProps(vk),
        mic: getProps(mic)
      };
    });

    results[sc.id] = measurements;
    console.log(`\n--- [SCENARIO: ${sc.name}] ---`);
    console.log(`  Main Content: ${measurements.main?.height.toFixed(2)}px`);
    console.log(`  Question Box: ${measurements.question?.height.toFixed(2)}px`);
    console.log(`  Metadata Grid: ${measurements.metadata?.height.toFixed(2)}px`);
    if (measurements.writtenAnswer) console.log(`  Written Answer: ${measurements.writtenAnswer.height.toFixed(2)}px`);
    if (measurements.vk) console.log(`  Virtual Keyboard: ${measurements.vk.height.toFixed(2)}px`);
    if (measurements.speechAnswer) console.log(`  Speech Answer: ${measurements.speechAnswer.height.toFixed(2)}px`);
    if (measurements.mic) console.log(`  Mic Control: ${measurements.mic.height.toFixed(2)}px`);
    if (measurements.mcAnswer) console.log(`  MCQ Answer (6 Units): ${measurements.mcAnswer.height.toFixed(2)}px`);
    if (measurements.chipsAnswer) console.log(`  Chips Answer (6 Units): ${measurements.chipsAnswer.height.toFixed(2)}px`);

    await page.close();
  }

  await browser.close();
  server.close();

  // EVALUATE RATIOS & PARITY CRITERIA
  console.log(`\n======================================================`);
  console.log(`EVALUATION OF ARCHITECTURAL RATIOS & GOLDEN INVARIANTS`);
  console.log(`======================================================\n`);

  // Check 1: Written Mode 1:1 Parity (Question == Answer)
  const writtenQ = results['written_mode'].question.height;
  const writtenA = results['written_mode'].writtenAnswer.height;
  const writtenDelta = Math.abs(writtenQ - writtenA);
  const writtenPass = writtenDelta <= 2.0;
  console.log(`1. Written Mode 1:1 Parity (Question vs Answer):`);
  console.log(`   Question: ${writtenQ.toFixed(2)}px | Answer: ${writtenA.toFixed(2)}px | Delta: ${writtenDelta.toFixed(2)}px`);
  console.log(`   Result: ${writtenPass ? '✅ PASS' : '❌ FAIL (Delta > 2.0px)'}`);
  if (!writtenPass) allPass = false;

  // Check 2: Spoken Words 1:1 Parity (Question == Answer == Mic)
  const spokenWordQ = results['spoken_words_mode'].question.height;
  const spokenWordA = results['spoken_words_mode'].speechAnswer.height;
  const spokenWordM = results['spoken_words_mode'].mic.height;
  const spokenWordDeltaQA = Math.abs(spokenWordQ - spokenWordA);
  const spokenWordDeltaQM = Math.abs(spokenWordQ - spokenWordM);
  const spokenWordPass = spokenWordDeltaQA <= 2.0 && spokenWordDeltaQM <= 2.0;
  console.log(`\n2. Spoken Words Mode 1:1 Parity (Question vs Answer vs Mic):`);
  console.log(`   Question: ${spokenWordQ.toFixed(2)}px | Answer: ${spokenWordA.toFixed(2)}px | Mic: ${spokenWordM.toFixed(2)}px`);
  console.log(`   Delta Q vs A: ${spokenWordDeltaQA.toFixed(2)}px | Delta Q vs Mic: ${spokenWordDeltaQM.toFixed(2)}px`);
  console.log(`   Result: ${spokenWordPass ? '✅ PASS' : '❌ FAIL (Delta > 2.0px)'}`);
  if (!spokenWordPass) allPass = false;

  // Check 3: Spoken Phrases 1:1 Parity
  const spokenPhraseQ = results['spoken_phrases_mode'].question.height;
  const spokenPhraseA = results['spoken_phrases_mode'].speechAnswer.height;
  const spokenPhraseM = results['spoken_phrases_mode'].mic.height;
  const spokenPhraseDeltaQA = Math.abs(spokenPhraseQ - spokenPhraseA);
  const spokenPhraseDeltaQM = Math.abs(spokenPhraseQ - spokenPhraseM);
  const spokenPhrasePass = spokenPhraseDeltaQA <= 2.0 && spokenPhraseDeltaQM <= 2.0;
  console.log(`\n3. Spoken Phrases Mode 1:1 Parity (Question vs Answer vs Mic):`);
  console.log(`   Question: ${spokenPhraseQ.toFixed(2)}px | Answer: ${spokenPhraseA.toFixed(2)}px | Mic: ${spokenPhraseM.toFixed(2)}px`);
  console.log(`   Delta Q vs A: ${spokenPhraseDeltaQA.toFixed(2)}px | Delta Q vs Mic: ${spokenPhraseDeltaQM.toFixed(2)}px`);
  console.log(`   Result: ${spokenPhrasePass ? '✅ PASS' : '❌ FAIL (Delta > 2.0px)'}`);
  if (!spokenPhrasePass) allPass = false;

  // Check 4: Cross-Mode Question Uniformity (Written vs Spoken)
  const crossModeDelta = Math.abs(writtenQ - spokenWordQ);
  const crossModePass = crossModeDelta <= 2.0;
  console.log(`\n4. Cross-Mode Question Uniformity (Written vs Spoken):`);
  console.log(`   Written Q: ${writtenQ.toFixed(2)}px | Spoken Q: ${spokenWordQ.toFixed(2)}px | Delta: ${crossModeDelta.toFixed(2)}px`);
  console.log(`   Result: ${crossModePass ? '✅ PASS' : '❌ FAIL (Delta > 2.0px)'}`);
  if (!crossModePass) allPass = false;

  // Check 5: Multiple Choice Question Uniformity & 6-Unit Ratio
  const mcQ = results['multiple_choice_mode'].question.height;
  const mcA = results['multiple_choice_mode'].mcAnswer.height;
  const mcDeltaQ = Math.abs(writtenQ - mcQ);
  const mcRatio = mcA / mcQ;
  const mcUniformPass = mcDeltaQ <= 2.5;
  const mcRatioPass = mcRatio >= 1.85 && mcRatio <= 2.15;
  console.log(`\n5. Multiple Choice Mode (Question Uniformity & 6-Unit Ratio):`);
  console.log(`   Written Q: ${writtenQ.toFixed(2)}px | MCQ Q: ${mcQ.toFixed(2)}px | Delta: ${mcDeltaQ.toFixed(2)}px`);
  console.log(`   MCQ Options Container: ${mcA.toFixed(2)}px | Ratio to Question: ${mcRatio.toFixed(2)}x (Target: ~2.0x)`);
  console.log(`   Question Uniformity: ${mcUniformPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Ratio 6:3 (2.0x): ${mcRatioPass ? '✅ PASS' : '❌ FAIL'}`);
  if (!mcUniformPass || !mcRatioPass) allPass = false;

  // Check 6: Phrase Chips Question Uniformity & 6-Unit Ratio
  const chipsQ = results['phrase_chips_mode'].question.height;
  const chipsA = results['phrase_chips_mode'].chipsAnswer.height;
  const chipsDeltaQ = Math.abs(writtenQ - chipsQ);
  const chipsRatio = chipsA / chipsQ;
  const chipsUniformPass = chipsDeltaQ <= 2.5;
  const chipsRatioPass = chipsRatio >= 1.85 && chipsRatio <= 2.15;
  console.log(`\n6. Phrase Chips Mode (Question Uniformity & 6-Unit Ratio):`);
  console.log(`   Written Q: ${writtenQ.toFixed(2)}px | Chips Q: ${chipsQ.toFixed(2)}px | Delta: ${chipsDeltaQ.toFixed(2)}px`);
  console.log(`   Chips Area Container: ${chipsA.toFixed(2)}px | Ratio to Question: ${chipsRatio.toFixed(2)}x (Target: ~2.0x)`);
  console.log(`   Question Uniformity: ${chipsUniformPass ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Ratio 6:3 (2.0x): ${chipsRatioPass ? '✅ PASS' : '❌ FAIL'}`);
  if (!chipsUniformPass || !chipsRatioPass) allPass = false;

  console.log(`\n======================================================`);
  if (allPass) {
    console.log(`🏆 ALL UNIFIED RATIO & PARITY CHECKS PASSED 100%!`);
  } else {
    console.log(`❌ SOME RATIO CHECKS FAILED`);
  }
  console.log(`======================================================\n`);

  process.exit(allPass ? 0 : 1);
}

runRatioVerification().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
