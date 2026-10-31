import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const PORT = 5591;
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function startServer() {
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/') reqPath = '/admin.html';
    const filePath = path.join(process.cwd(), reqPath);

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }
      const ext = path.extname(filePath);
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      res.end(data);
    });
  });

  return new Promise((resolve) => {
    server.listen(PORT, () => resolve(server));
  });
}

async function testResultsTable() {
  const server = await startServer();
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  await page.evaluateOnNewDocument(() => {
    const adminSession = JSON.stringify({
      admin_id: 'admin-master',
      role: 'admin',
      authenticated_at: new Date().toISOString()
    });
    sessionStorage.setItem('topscore_admin_session', adminSession);
    localStorage.setItem('topscore_admin_session', adminSession);
  });

  try {
    await page.goto(`http://localhost:${PORT}/admin.html#results`, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));

    // Force load section results
    const tableInfo = await page.evaluate(async () => {
      if (typeof window.loadSection === 'function') {
        await window.loadSection('results');
        await new Promise(r => setTimeout(r, 2000));
      }

      const container = document.getElementById('results-grid-container');
      const table = container ? container.querySelector('table') : null;
      const wrap = container ? container.querySelector('.table-wrap') : null;

      if (!table) {
        return { error: 'No table found in #results-grid-container', bodySnippet: document.body.innerText.substring(0, 300) };
      }

      const tableRect = table.getBoundingClientRect();
      const wrapRect = wrap ? wrap.getBoundingClientRect() : null;

      const cols = Array.from(table.querySelectorAll('thead th')).map(th => ({
        text: th.innerText.trim(),
        width: Math.round(th.getBoundingClientRect().width),
        fontWeight: window.getComputedStyle(th).fontWeight,
        fontSize: window.getComputedStyle(th).fontSize
      }));

      return {
        tableWidth: Math.round(tableRect.width),
        tableScrollWidth: table.scrollWidth,
        wrapWidth: wrapRect ? Math.round(wrapRect.width) : null,
        wrapScrollWidth: wrap ? wrap.scrollWidth : null,
        hasHorizontalScroll: wrap ? (wrap.scrollWidth > wrap.clientWidth) : false,
        totalCols: cols.length,
        cols
      };
    });

    console.log('Results table audit in live browser:');
    console.log(JSON.stringify(tableInfo, null, 2));

  } catch (err) {
    console.error('Test error:', err.message);
  } finally {
    await browser.close();
    server.close();
  }
}

testResultsTable();
