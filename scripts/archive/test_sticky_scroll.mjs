import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const PORT = 5580;
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

async function testStickyScroll() {
  console.log('=== TESTING STICKY HEADERS ON VERTICAL SCROLL ===');
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
    localStorage.setItem('topscore_selected_class_id', 'ab33498a-90e6-44b7-83f4-5765f964543e');
    localStorage.setItem('topscore_selected_class_name', '3rd Vocabulary');
  });

  try {
    await page.goto(`http://localhost:${PORT}/admin.html?status=active#class-hub`, { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // Measure header positions before scroll
    const beforeScroll = await page.evaluate(() => {
      const wrap = document.querySelector('#class-attendance-grid .table-wrap');
      const superTh = document.querySelector('#class-attendance-grid th.super-hdr');
      const subTh = document.querySelector('#class-attendance-grid thead tr:not(.datagrid-super-header-row) th');
      const firstRow = document.querySelector('#class-attendance-grid tbody tr:first-child');

      const wrapRect = wrap.getBoundingClientRect();
      const superRect = superTh.getBoundingClientRect();
      const subRect = subTh.getBoundingClientRect();
      const rowRect = firstRow.getBoundingClientRect();

      return {
        wrapScrollTop: wrap.scrollTop,
        wrapTop: wrapRect.top,
        superTop: superRect.top,
        subTop: subRect.top,
        rowTop: rowRect.top
      };
    });

    console.log('Before scroll:', beforeScroll);

    // Scroll table-wrap down by 250px
    console.log('Scrolling .table-wrap down by 250px...');
    const afterScroll = await page.evaluate(() => {
      const wrap = document.querySelector('#class-attendance-grid .table-wrap');
      wrap.scrollTop = 250;

      const superTh = document.querySelector('#class-attendance-grid th.super-hdr');
      const subTh = document.querySelector('#class-attendance-grid thead tr:not(.datagrid-super-header-row) th');
      const firstRow = document.querySelector('#class-attendance-grid tbody tr:first-child');

      const wrapRect = wrap.getBoundingClientRect();
      const superRect = superTh.getBoundingClientRect();
      const subRect = subTh.getBoundingClientRect();
      const rowRect = firstRow.getBoundingClientRect();

      return {
        wrapScrollTop: wrap.scrollTop,
        wrapTop: wrapRect.top,
        superTop: superRect.top,
        subTop: subRect.top,
        rowTop: rowRect.top
      };
    });

    console.log('After scroll:', afterScroll);

    // Check sticky assertions
    const superDiff = Math.abs(afterScroll.superTop - beforeScroll.superTop);
    const subDiff = Math.abs(afterScroll.subTop - beforeScroll.subTop);
    console.log(`Super-header delta: ${superDiff}px (Expected ~0px)`);
    console.log(`Sub-header delta: ${subDiff}px (Expected ~0px)`);

    if (superDiff > 2 || subDiff > 2) {
      console.warn('⚠️ WARNING: Header moved when scrolling! Check sticky top constraints.');
    } else {
      console.log('✅ PASS: Headers remain 100% locked/sticky at top when scrolling down!');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await browser.close();
    server.close();
  }
}

testStickyScroll();
