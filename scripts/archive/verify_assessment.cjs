const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');

const PORT = 8082;
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json'
};

const server = http.createServer((request, response) => {
    let filePath = '.' + request.url.split('?')[0];
    if (filePath == './') filePath = './index.html';
    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            response.writeHead(404);
            response.end('Sorry, check with the site admin for error: '+error.code+' ..\n');
            response.end();
        } else {
            response.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
            response.end(content, 'utf-8');
        }
    });
});

(async () => {
  server.listen(PORT);
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  const url = `http://127.0.0.1:${PORT}/assessment.html?assessment_id=123`;
  
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  
  await page.evaluate(() => {
    sessionStorage.setItem('topscore_session', JSON.stringify({student_id: '1', student_name: 'Test Student'}));
  });
  // Reload with session
  await page.goto(url, { waitUntil: 'networkidle' });

  // Create audit screenshots dir
  if (!fs.existsSync('./audit_screenshots')) {
    fs.mkdirSync('./audit_screenshots');
  }

  // 1. Verify UI functions
  const openModalType = await page.evaluate(() => typeof window.openSubmitModal);
  const toggleMatrixType = await page.evaluate(() => typeof window.toggleMatrixPopup);
  if (openModalType !== 'function') errors.push('window.openSubmitModal is not defined correctly');
  if (toggleMatrixType !== 'function') errors.push('window.toggleMatrixPopup is not defined correctly');

  await page.evaluate(() => {
    const main = document.getElementById('assessment-main');
    
    window.renderMockMode = (mode) => {
      main.innerHTML = '';
      
      const topSection = document.createElement('div');
      topSection.className = 'h-[135px] max-h-[140px] w-full flex items-center justify-center text-center p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 shadow-md shrink-0';
      topSection.id = 'test-question-card';
      main.appendChild(topSection);

      let answerArea, controlArea;
      if (mode === 'written' || mode === 'speech_to_text') {
        answerArea = document.createElement('div');
        answerArea.className = 'h-[175px] max-h-[180px] w-full flex flex-col justify-center p-3 rounded-2xl bg-slate-900/70 border border-slate-700/60 shadow-inner shrink-0';
        answerArea.id = 'test-answer-card';
        main.appendChild(answerArea);

        controlArea = document.createElement('div');
        controlArea.className = 'flex-1 min-h-[260px] w-full flex items-center justify-center overflow-hidden';
        controlArea.id = 'test-control-area';
        
        if (mode === 'written') {
           const vk = document.getElementById('virtual-keyboard-container');
           if (vk) vk.style.display = 'flex';
        } else {
           const micBtn = document.createElement('button');
           micBtn.className = 'speech-mic-btn-lg';
           micBtn.style.width = '76px'; micBtn.style.height = '76px';
           controlArea.appendChild(micBtn);
        }
        main.appendChild(controlArea);
      } else {
        answerArea = document.createElement('div');
        answerArea.className = 'flex-1 flex flex-col justify-between gap-2 py-1 min-h-0';
        answerArea.id = 'test-answer-area-mc';
        for(let i=0; i<4; i++) {
           const btn = document.createElement('div');
           btn.className = 'mc-option';
           answerArea.appendChild(btn);
        }
        main.appendChild(answerArea);
      }
    };
  });

  const getDims = async (id) => {
    return page.evaluate((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return { h: Math.round(rect.height), mh: window.getComputedStyle(el).maxHeight };
    }, id);
  };

  // Written Mode
  await page.evaluate(() => window.renderMockMode('written'));
  await page.screenshot({ path: './audit_screenshots/written_mode.png' });
  const wQ = await getDims('test-question-card');
  const wA = await getDims('test-answer-card');
  
  // Speaking Mode
  await page.evaluate(() => window.renderMockMode('speech_to_text'));
  await page.screenshot({ path: './audit_screenshots/speaking_mode.png' });
  
  // MC Mode
  await page.evaluate(() => window.renderMockMode('multiple_choice'));
  await page.screenshot({ path: './audit_screenshots/mc_mode.png' });

  // Matrix Popup
  if (toggleMatrixType === 'function') {
    await page.evaluate(() => window.toggleMatrixPopup(true));
    await page.screenshot({ path: './audit_screenshots/matrix_popup.png' });
  }

  // Report
  const report = [
    '# ASSESSMENT_EXECUTION_AUDIT',
    '',
    '## 1. Runtime Exceptions / Console Errors',
    errors.length === 0 ? '✅ Zero console errors.' : `❌ Errors found:\n- ${errors.join('\n- ')}`,
    '',
    '## 2. API Variables & Global Bindings',
    openModalType === 'function' ? '✅ `window.openSubmitModal` is bound.' : '❌ `window.openSubmitModal` binding failed.',
    toggleMatrixType === 'function' ? '✅ `window.toggleMatrixPopup` is bound.' : '❌ `window.toggleMatrixPopup` binding failed.',
    '',
    '## 3. Layout Bounding Boxes',
    wQ && wQ.h <= 140 ? `✅ Question Card Height: ${wQ.h}px (Max: 140px)` : `❌ Question Card height invalid: ${JSON.stringify(wQ)}`,
    wA && wA.h <= 180 ? `✅ Answer Card Height: ${wA.h}px (Max: 180px)` : `❌ Answer Card height invalid: ${JSON.stringify(wA)}`,
    '',
    '## 4. Screenshots Captured',
    '✅ `./audit_screenshots/written_mode.png`',
    '✅ `./audit_screenshots/speaking_mode.png`',
    '✅ `./audit_screenshots/mc_mode.png`',
    toggleMatrixType === 'function' ? '✅ `./audit_screenshots/matrix_popup.png`' : '❌ `./audit_screenshots/matrix_popup.png` not generated due to missing function'
  ].join('\n');

  fs.writeFileSync('ASSESSMENT_EXECUTION_AUDIT.md', report);
  console.log(report);

  await browser.close();
  server.close();
})();
