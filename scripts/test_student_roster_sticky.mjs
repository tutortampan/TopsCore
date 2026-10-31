import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const PORT = 5581;
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
    if (reqPath === '/') reqPath = '/index.html';
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

async function testRosterSticky() {
  console.log('=== TESTING STUDENT ROSTER STICKY HEADERS ===');
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
    await page.goto(`http://localhost:${PORT}/admin.html?status=active#students`, { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2500));

    const check = await page.evaluate(() => {
      const container = document.querySelector('#student-grid-container');
      if (!container) return { found: false };

      const wrap = container.querySelector('.table-wrap');
      const superTh = container.querySelector('thead tr.datagrid-super-header-row th:nth-child(2)');
      const subTh = container.querySelector('thead tr:not(.datagrid-super-header-row) th');
      const firstRow = container.querySelector('tbody tr:first-child');

      const wrapRect = wrap?.getBoundingClientRect();
      const superRect = superTh?.getBoundingClientRect();
      const subRect = subTh?.getBoundingClientRect();
      const rowRect = firstRow?.getBoundingClientRect();

      return {
        found: true,
        wrapTop: wrapRect?.top,
        superTop: superRect?.top,
        subTop: subRect?.top,
        rowTop: rowRect?.top,
        wrapScrollHeight: wrap?.scrollHeight,
        wrapClientHeight: wrap?.clientHeight
      };
    });

    console.log('Roster state before scroll:', check);

    // Scroll down wrap or admin-content
    console.log('Scrolling .table-wrap down by 300px...');
    const after = await page.evaluate(() => {
      const container = document.querySelector('#student-grid-container');
      const wrap = container.querySelector('.table-wrap');
      if (wrap) wrap.scrollTop = 300;

      const adminContent = document.querySelector('.admin-content');
      if (adminContent) adminContent.scrollTop = 300;

      const superTh = container.querySelector('thead tr.datagrid-super-header-row th:nth-child(2)');
      const subTh = container.querySelector('thead tr:not(.datagrid-super-header-row) th');

      return {
        wrapScrollTop: wrap?.scrollTop,
        adminContentScrollTop: adminContent?.scrollTop,
        superTop: superTh?.getBoundingClientRect().top,
        subTop: subTh?.getBoundingClientRect().top
      };
    });

    console.log('Roster state after scroll:', after);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
    server.close();
  }
}

testRosterSticky();
