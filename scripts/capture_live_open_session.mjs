import puppeteer from 'puppeteer';
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
  if (reqPath === '/' || reqPath === '') reqPath = '/admin.html';
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

server.listen(8099, async () => {
  console.log('Test server running at http://localhost:8099');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.goto('http://localhost:8099/admin.html', { waitUntil: 'domcontentloaded' });

  // Open the open session modal programmatically
  await page.evaluate(() => {
    // If openThemeExamSessionModal is available
    if (window.__testsAccessController && window.__testsAccessController.openThemeExamSessionModal) {
      window.__testsAccessController.openThemeExamSessionModal({
        theme: {
          code: 'G',
          name: 'General',
          tasks: [],
          wordsTest: { id: 'w1' },
          phrasesTest: { id: 'p1' }
        },
        context: {
          allStudents: [
            { id: 's1', name: 'Almira Putri', batch_id: 'b1', is_active: true },
            { id: 's2', name: 'Bima Santoso', batch_id: 'b1', is_active: true },
            { id: 's3', name: 'Cahya Ramadhan', batch_id: 'b1', is_active: true }
          ],
          classTests: [],
          allAttempts: []
        },
        mode: 'normal'
      });
    } else {
      // Direct modal fallback
      const m = document.getElementById('modal-theme-open-session');
      if (m) {
        m.classList.remove('hidden');
        m.style.display = 'flex';
      }
    }
  });

  await new Promise(r => setTimeout(r, 1000));

  const modalBox = await page.$('#modal-theme-open-session .modal-box, #modal-theme-open-session');
  const targetDir = 'C:\\Users\\Top\\.gemini\\antigravity\\brain\\779df3a5-d6c5-47f0-b10a-0377f6852212';
  const outPath = path.join(targetDir, 'live_room_01_open_session_no_capsule.jpg');

  if (modalBox) {
    await modalBox.screenshot({ path: outPath, quality: 85, type: 'jpeg' });
    console.log('Saved screenshot to', outPath);
  } else {
    await page.screenshot({ path: outPath, quality: 85, type: 'jpeg' });
    console.log('Saved fallback full page to', outPath);
  }

  await browser.close();
  server.close();
  process.exit(0);
});
