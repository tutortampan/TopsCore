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

async function run() {
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`Test server running on port ${port}`);

  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  const viewports = [
    { name: 'Small Phone (360x640)', width: 360, height: 640 },
    { name: 'iPhone SE (375x667)', width: 375, height: 667 },
    { name: 'iPhone 12/13/14 (390x844)', width: 390, height: 844 },
    { name: 'Pixel 7 (412x915)', width: 412, height: 915 }
  ];

  const scenarios = [
    {
      id: 'written',
      name: 'Written Mode',
      testData: {
        title: '2nd Vocabulary Exam D - Cooking Class',
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
      id: 'spoken',
      name: 'Spoken Mode',
      testData: {
        title: '2nd Vocabulary Task C1 - Shopping & Choosing Products',
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
      id: 'mc',
      name: 'Multiple Choice Mode',
      testData: {
        title: '2nd Vocabulary Exam B - Podcast Hosting & Media Interview',
        status: 'PUBLISHED',
        test_type: 'exam',
        test_subtype: 'VOCAB_EXAM',
        answer_type: 'multiple_choice',
        working_duration_minutes: 15
      },
      row: {
        id: 'row-mc-1',
        question_id: 'q-mc-1',
        question_text_snapshot: 'Menyesuaikan nada suara',
        question_snapshot: {
          question_text: 'Menyesuaikan nada suara',
          answer_type: 'multiple_choice',
          correct_answer: 'adjust the tone',
          options: ['adjust the tone', 'set up the microphone', 'record audio', 'interview guest'],
          options_snapshot: ['adjust the tone', 'set up the microphone', 'record audio', 'interview guest'],
          theme: 'Media',
          theme_code: 'B',
          topic: 'Podcast Hosting',
          word_type: 'Phrase',
          category: 'Phrases'
        }
      }
    }
  ];

  for (const vp of viewports) {
    console.log(`\n==================================================`);
    console.log(`VIEWPORT: ${vp.name} (${vp.width}x${vp.height})`);
    console.log(`==================================================`);

    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2
    });
    const page = await context.newPage();

    await page.route('**/*.{woff,woff2}', route => route.abort());
    await page.route('**/dashboard.html*', route => route.abort());

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
      window.alert = () => {};
      window.confirm = () => true;

      const origSetTimeout = window.setTimeout;
      window.setTimeout = (fn, delay, ...args) => {
        if (typeof fn === 'function' && fn.toString().includes('dashboard.html')) {
          return 0;
        }
        return origSetTimeout(fn, delay, ...args);
      };
    });

    await page.goto(`http://localhost:${port}/test.html?test_id=ratio-test`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);
    await page.waitForFunction(() => typeof window.__renderTestScenario === 'function', { timeout: 10000 });

    for (const sc of scenarios) {
      await page.evaluate((scenarioData) => {
        window.__renderTestScenario(scenarioData);
        document.querySelectorAll('.loading-overlay').forEach(el => el.remove());
        document.querySelectorAll('.toast, #toast-container, .toast-notification, .toast-pill, .offline-pill, .offline-banner').forEach(el => el.remove());
      }, sc);

      await page.waitForTimeout(300);

      const metrics = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        const fixedBottom = document.getElementById('fixed-bottom-area');
        const banner = document.getElementById('bottom-ad-banner');
        const qBox = document.getElementById('question-box-prompt');
        const writtenAns = document.getElementById('answer-container-written');
        const speechAns = document.getElementById('speech-answer-container');
        const mcAns = document.getElementById('answer-container-mc');
        const keyboard = document.getElementById('virtual-keyboard-container');
        const micPanel = document.getElementById('speech-control-container');
        const typeInsteadBtn = document.querySelector('.switch-typing-btn');

        const fbRect = fixedBottom ? fixedBottom.getBoundingClientRect() : null;
        const bRect = banner ? banner.getBoundingClientRect() : null;

        // Gap between bottom of fixedBottom and top of banner
        const gapToBanner = fbRect && bRect ? (bRect.top - fbRect.bottom) : null;

        // Check if type instead is visible
        const hasTypeInstead = typeInsteadBtn && (
          window.getComputedStyle(typeInsteadBtn).display !== 'none' &&
          window.getComputedStyle(typeInsteadBtn).visibility !== 'hidden'
        );

        // Colors of Question & Answer
        let qBg = null, qColor = null, qJustify = null, qAlign = null;
        if (qBox) {
          const comp = window.getComputedStyle(qBox);
          qBg = comp.backgroundColor;
          const textEl = qBox.querySelector('.speech-question-text');
          if (textEl) {
            const tComp = window.getComputedStyle(textEl);
            qColor = tComp.color;
            qJustify = tComp.justifyContent;
            qAlign = tComp.alignItems;
          }
        }

        let aBg = null, aColor = null, aJustify = null, aAlign = null;
        const ansEl = writtenAns || speechAns;
        if (ansEl) {
          const comp = window.getComputedStyle(ansEl);
          aBg = comp.backgroundColor;
          const inputEl = ansEl.querySelector('.written-input') || ansEl.querySelector('[id^="speech-transcript"]');
          if (inputEl) {
            const iComp = window.getComputedStyle(inputEl);
            aColor = iComp.color;
            aJustify = iComp.justifyContent;
            aAlign = iComp.alignItems;
          }
        }

        // Check visibility of all key panels
        const panels = [];
        if (qBox) panels.push({ name: 'QuestionBox', rect: qBox.getBoundingClientRect() });
        if (writtenAns) panels.push({ name: 'WrittenAnswer', rect: writtenAns.getBoundingClientRect() });
        if (speechAns) panels.push({ name: 'SpeechAnswer', rect: speechAns.getBoundingClientRect() });
        if (mcAns) panels.push({ name: 'MCAnswer', rect: mcAns.getBoundingClientRect() });
        if (keyboard && window.getComputedStyle(keyboard).display !== 'none') {
          panels.push({ name: 'VirtualKeyboard', rect: keyboard.getBoundingClientRect() });
        }
        if (micPanel && window.getComputedStyle(micPanel).display !== 'none') {
          panels.push({ name: 'MicPanel', rect: micPanel.getBoundingClientRect() });
        }
        if (fixedBottom) panels.push({ name: 'FixedBottomArea', rect: fbRect });
        if (banner) panels.push({ name: 'Banner', rect: bRect });

        const allPanelsVisible = panels.every(p => {
          return p.rect.top >= 0 && p.rect.bottom <= window.innerHeight + 1;
        });

        const outerScrollable = html.scrollHeight > html.clientHeight || body.scrollHeight > body.clientHeight;

        return {
          windowHeight: window.innerHeight,
          gapToBanner: gapToBanner ? Math.round(gapToBanner * 10) / 10 : null,
          hasTypeInstead,
          allPanelsVisible,
          outerScrollable,
          qBg,
          qColor,
          qJustify,
          qAlign,
          aBg,
          aColor,
          aJustify,
          aAlign,
          panels: panels.map(p => ({
            name: p.name,
            top: Math.round(p.rect.top),
            bottom: Math.round(p.rect.bottom),
            height: Math.round(p.rect.height)
          }))
        };
      });

      console.log(`[${sc.name}]`);
      console.log(`  Outer Scrollable: ${metrics.outerScrollable ? '❌ YES (FAIL)' : '✅ NO (PASS)'}`);
      console.log(`  All Panels Visible: ${metrics.allPanelsVisible ? '✅ YES (PASS)' : '❌ NO (FAIL)'}`);
      console.log(`  Gap to Banner: ${metrics.gapToBanner}px (Target: exactly 10px) -> ${Math.abs(metrics.gapToBanner - 10) <= 0.5 ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`  Type Instead Removed: ${!metrics.hasTypeInstead ? '✅ YES (PASS)' : '❌ NO (FAIL)'}`);
      console.log(`  Question Box: bg=${metrics.qBg}, color=${metrics.qColor}, center=${metrics.qJustify}/${metrics.qAlign}`);
      if (metrics.aBg) {
        console.log(`  Answer Box: bg=${metrics.aBg}, color=${metrics.aColor}, center=${metrics.aJustify}/${metrics.aAlign}`);
      }
    }

    await context.close();
  }

  await browser.close();
  server.close();
  console.log('\nAudit verification complete!');
}

run().catch(console.error);
