import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to create an in-process static server
function createStaticServer(port = 3458) {
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
  };

  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/' || reqUrl === '/assessment') reqUrl = '/assessment.html';
    
    let filePath = path.join(__dirname, reqUrl);
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File not found: ' + reqUrl);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

async function run() {
  const PORT = 3458;
  const server = await createStaticServer(PORT);
  console.log(`Local test server running at http://127.0.0.1:${PORT}`);

  const browser = await chromium.launch({ headless: true });

  const viewports = [
    { name: '412x915', width: 412, height: 915 },
    { name: '360x800', width: 360, height: 800 }
  ];

  const mockQuestions = [
    {
      id: 'ans-1',
      question_id: 'q-1',
      question_snapshot: {
        question_text: 'Choose the correct expression for professional greetings:',
        theme: 'Workplace',
        theme_code: 'A',
        topic: 'Building Your Professional Identity',
        category: 'Phrases',
        word_type: 'Expression',
        answer_type: 'multiple_choice',
        options_snapshot: [
          'It is a pleasure to make your acquaintance',
          'Hey buddy what is going on',
          'Catch you later alligator',
          'No problem at all see ya'
        ],
        section_id: 'default'
      }
    },
    {
      id: 'ans-2',
      question_id: 'q-2',
      question_snapshot: {
        question_text: 'Type the synonym of "essential":',
        theme: 'Workplace',
        theme_code: 'A',
        topic: 'Building Your Professional Identity',
        category: 'Words',
        word_type: 'Adjective',
        answer_type: 'written',
        section_id: 'default'
      }
    },
    {
      id: 'ans-3',
      question_id: 'q-3',
      question_snapshot: {
        question_text: 'Speak: "We need to finalize the quarterly report."',
        theme: 'Workplace',
        theme_code: 'A',
        topic: 'Building Your Professional Identity',
        category: 'Phrases',
        word_type: 'Sentence',
        answer_type: 'speech_to_text',
        section_id: 'default'
      }
    }
  ];

  try {
    for (const vp of viewports) {
      console.log(`\n========================================================`);
      console.log(`=== Testing Viewport ${vp.name} (${vp.width}x${vp.height}) ===`);
      console.log(`========================================================`);
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 2
      });
      const page = await context.newPage();

      page.on('console', msg => {
        if (msg.type() === 'error') console.log(`[BROWSER ERROR ${vp.name}]`, msg.text());
      });
      page.on('pageerror', err => console.log(`[PAGE ERROR ${vp.name}]`, err.message));

      await page.addInitScript(() => {
        sessionStorage.setItem('topscore_session', JSON.stringify({
          student_id: 'test-student-id',
          student_name: 'Alex Johnson',
          program_name: 'English Excellence',
          institution_name: 'Tops Academy'
        }));
        sessionStorage.setItem('topscore_assessment_id', 'test-assessment-id');
      });

      // Intercept Edge Functions and Supabase REST calls
      await page.route('**/functions/v1/start-assessment', async route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            attempt: {
              id: 'att-1',
              expires_at: new Date(Date.now() + 18 * 60 * 1000 + 2000).toISOString()
            },
            ASSESSMENT: {
              id: 'test-assessment-id',
              title: 'TOP ENGLISH ASSESSMENT LEVEL 1',
              assessment_type: 'VOCABULARY_MASTERY',
              schedule_mode: 'flexible',
              question_order: 'sequential',
              payload: { theme_code: 'A', category: 'phrases', question_order: 'sequential' }
            },
            sections: [
              { id: 'default', title: 'Main Test', time_limit_minutes: 20 }
            ],
            answers: mockQuestions
          })
        });
      });

      await page.route('**/functions/v1/get-security-settings', async route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ enabled: false, soundEnabled: false })
        });
      });

      await page.route('**/rest/v1/**', async route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        });
      });

      // Navigate to assessment page
      await page.goto(`http://127.0.0.1:${PORT}/assessment.html?id=test-assessment-id`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.metadata-table', { timeout: 10000 });
      await page.waitForTimeout(500);

      // Verify layout heights, width, and banner dimensions in Mode 1 (MCQ)
      const auditMCQ = await page.evaluate(() => {
        const bodyEl = document.querySelector('.assessment-body');
        const mainEl = document.getElementById('assessment-main');
        const qBox = document.querySelector('#assessment-main > div:nth-child(1)');
        const mTable = document.querySelector('.metadata-table');
        const iCont = document.getElementById('interaction-container');
        const banner = document.getElementById('bottom-ad-banner');

        const bRect = banner ? banner.getBoundingClientRect() : null;
        const bodyRect = bodyEl ? bodyEl.getBoundingClientRect() : null;
        const qRect = qBox ? qBox.getBoundingClientRect() : null;
        const mRect = mTable ? mTable.getBoundingClientRect() : null;
        const iRect = iCont ? iCont.getBoundingClientRect() : null;

        const metaBadges = Array.from(document.querySelectorAll('.metadata-table span')).map(s => s.innerText.trim());

        return {
          winWidth: window.innerWidth,
          winHeight: window.innerHeight,
          bodyRect,
          qRect,
          mRect,
          iRect,
          bannerRect: bRect,
          metaBadges
        };
      });

      console.log(`[${vp.name} MCQ] Window: ${auditMCQ.winWidth}x${auditMCQ.winHeight}`);
      console.log(`[${vp.name} MCQ] Assessment Body: width=${auditMCQ.bodyRect.width.toFixed(1)}px (95% of ${vp.width} is ${(vp.width * 0.95).toFixed(1)}px), height=${auditMCQ.bodyRect.height.toFixed(1)}px`);
      console.log(`[${vp.name} MCQ] Question Box: height=${auditMCQ.qRect.height.toFixed(1)}px (approx 30% = ${(auditMCQ.bodyRect.height * 0.3).toFixed(1)}px), top=${auditMCQ.qRect.top.toFixed(1)}px`);
      console.log(`[${vp.name} MCQ] Metadata Table: height=${auditMCQ.mRect.height.toFixed(1)}px (approx 10% = ${(auditMCQ.bodyRect.height * 0.1).toFixed(1)}px)`);
      console.log(`[${vp.name} MCQ] Interaction Zone: height=${auditMCQ.iRect.height.toFixed(1)}px (approx 60% = ${(auditMCQ.bodyRect.height * 0.6).toFixed(1)}px)`);
      console.log(`[${vp.name} MCQ] Banner: width=${auditMCQ.bannerRect.width.toFixed(1)}px (100% of ${vp.width} is ${vp.width}px), height=${auditMCQ.bannerRect.height.toFixed(1)}px`);
      console.log(`[${vp.name} MCQ] Metadata Badges:`, auditMCQ.metaBadges);

      // Verify no static prefix labels in metadata badges
      for (const badge of auditMCQ.metaBadges) {
        if (/^(THEME|CATHEGORY|CATEGORY|TOPIC|TYPE):/i.test(badge)) {
          throw new Error(`Forbidden static label found in metadata badge: ${badge}`);
        }
      }

      // Banner must be 100% width
      if (Math.abs(auditMCQ.bannerRect.width - vp.width) > 1) {
        throw new Error(`Banner width mismatch: expected ${vp.width}px, got ${auditMCQ.bannerRect.width}px`);
      }

      // Capture Mode 1: MCQ Mode
      console.log(`[${vp.name}] Capturing Mode 1: MCQ Mode screenshot...`);
      await page.screenshot({ path: `audit_${vp.name}_mcq.png` });

      // Mode 2: Keyboard Mode (Question 1)
      console.log(`[${vp.name}] Navigating to Mode 2: Keyboard Mode...`);
      await page.evaluate(() => {
        window.renderQuestion(1);
      });
      await page.waitForTimeout(500);

      const auditKB = await page.evaluate(() => {
        const bodyEl = document.querySelector('.assessment-body');
        const qBox = document.querySelector('#assessment-main > div:nth-child(1)');
        const mTable = document.querySelector('.metadata-table');
        const iCont = document.getElementById('interaction-container');
        const vk = document.getElementById('virtual-keyboard-container');

        return {
          bodyRect: bodyEl ? bodyEl.getBoundingClientRect() : null,
          qRect: qBox ? qBox.getBoundingClientRect() : null,
          mRect: mTable ? mTable.getBoundingClientRect() : null,
          iRect: iCont ? iCont.getBoundingClientRect() : null,
          vkRect: vk ? vk.getBoundingClientRect() : null
        };
      });

      console.log(`[${vp.name} KB] Question Box: top=${auditKB.qRect.top.toFixed(1)}px, height=${auditKB.qRect.height.toFixed(1)}px`);
      console.log(`[${vp.name} KB] Virtual Keyboard: height=${auditKB.vkRect.height.toFixed(1)}px`);

      // Check Zero Layout Shift between MCQ and Keyboard
      if (Math.abs(auditKB.qRect.top - auditMCQ.qRect.top) > 1) {
        throw new Error(`Layout shift detected in Question Box top coordinate between MCQ (${auditMCQ.qRect.top}) and Keyboard (${auditKB.qRect.top})`);
      }
      if (Math.abs(auditKB.qRect.height - auditMCQ.qRect.height) > 1) {
        throw new Error(`Layout shift detected in Question Box height between MCQ (${auditMCQ.qRect.height}) and Keyboard (${auditKB.qRect.height})`);
      }

      console.log(`[${vp.name}] Capturing Mode 2: Keyboard Mode screenshot...`);
      await page.screenshot({ path: `audit_${vp.name}_keyboard.png` });

      // Mode 3: Speech Mode (Question 2)
      console.log(`[${vp.name}] Navigating to Mode 3: Speech Mode...`);
      await page.evaluate(() => {
        window.renderQuestion(2);
      });
      await page.waitForTimeout(500);

      const auditSpeech = await page.evaluate(() => {
        const bodyEl = document.querySelector('.assessment-body');
        const qBox = document.querySelector('#assessment-main > div:nth-child(1)');
        const mTable = document.querySelector('.metadata-table');
        const iCont = document.getElementById('interaction-container');

        return {
          bodyRect: bodyEl ? bodyEl.getBoundingClientRect() : null,
          qRect: qBox ? qBox.getBoundingClientRect() : null,
          mRect: mTable ? mTable.getBoundingClientRect() : null,
          iRect: iCont ? iCont.getBoundingClientRect() : null
        };
      });

      console.log(`[${vp.name} Speech] Question Box: top=${auditSpeech.qRect.top.toFixed(1)}px, height=${auditSpeech.qRect.height.toFixed(1)}px`);

      // Check Zero Layout Shift between Keyboard and Speech
      if (Math.abs(auditSpeech.qRect.top - auditMCQ.qRect.top) > 1) {
        throw new Error(`Layout shift detected in Question Box top coordinate between MCQ (${auditMCQ.qRect.top}) and Speech (${auditSpeech.qRect.top})`);
      }
      if (Math.abs(auditSpeech.qRect.height - auditMCQ.qRect.height) > 1) {
        throw new Error(`Layout shift detected in Question Box height between MCQ (${auditMCQ.qRect.height}) and Speech (${auditSpeech.qRect.height})`);
      }

      console.log(`[${vp.name}] Capturing Mode 3: Speech Mode screenshot...`);
      await page.screenshot({ path: `audit_${vp.name}_speech.png` });

      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
    console.log('\nServer and browser closed cleanly.');
  }

  console.log('\nALL AUDIT VERIFICATIONS PASSED & SCREENSHOTS GENERATED SUCCESSFULLY!');
}

run().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});

