import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const PORT = 5599;
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

async function verifyAll() {
  const server = await startServer();
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  console.log('=== STARTING VISUAL & STICKY HEADER VERIFICATION ===\n');

  try {
    // 1. Test Admin with Session
    const adminPage = await browser.newPage();
    await adminPage.setViewport({ width: 1440, height: 900 });
    await adminPage.evaluateOnNewDocument(() => {
      const adminSession = JSON.stringify({
        admin_id: 'admin-master',
        role: 'admin',
        authenticated_at: new Date().toISOString()
      });
      sessionStorage.setItem('topscore_admin_session', adminSession);
      localStorage.setItem('topscore_admin_session', adminSession);
    });

    await adminPage.goto(`http://localhost:${PORT}/admin.html#students`, { waitUntil: 'networkidle0', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // Check Student Grid
    const studentGridAudit = await adminPage.evaluate(() => {
      const table = document.querySelector('#student-grid-container table');
      if (!table) return { found: false };
      const thead = table.querySelector('thead');
      const superRow = table.querySelector('.datagrid-super-header-row');
      const ths = Array.from(table.querySelectorAll('thead th'));
      const wrap = table.closest('.table-wrap');

      // Check sticky styles
      const results = ths.slice(0, 8).map(th => {
        const cs = window.getComputedStyle(th);
        return {
          text: th.innerText.trim(),
          pos: cs.position,
          top: cs.top,
          bg: cs.backgroundColor,
          zIndex: cs.zIndex
        };
      });

      return {
        found: true,
        hasSuperHeader: !!superRow,
        wrapOverflowY: wrap ? window.getComputedStyle(wrap).overflowY : null,
        wrapMaxHeight: wrap ? window.getComputedStyle(wrap).maxHeight : null,
        sampleThs: results
      };
    });

    console.log('Admin Student Grid Audit:', JSON.stringify(studentGridAudit, null, 2));

    await adminPage.close();

    // 2. Test Student Dashboard with mock session
    const dashPage = await browser.newPage();
    await dashPage.setViewport({ width: 1440, height: 900 });
    await dashPage.evaluateOnNewDocument(() => {
      const studentSession = JSON.stringify({
        id: 'mock-student-id',
        name: 'Aunul',
        institution_id: 'inst-1',
        program_id: 'prog-1',
        batch_id: 'batch-1'
      });
      sessionStorage.setItem('topscore_student_session', studentSession);
      localStorage.setItem('topscore_student_session', studentSession);
    });

    await dashPage.goto(`http://localhost:${PORT}/dashboard.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    const dashAudit = await dashPage.evaluate(() => {
      // Check font families
      const bodyComp = window.getComputedStyle(document.body);
      const h1Comp = window.getComputedStyle(document.querySelector('h1') || document.body);
      return {
        bodyFont: bodyComp.fontFamily,
        headingFont: h1Comp.fontFamily
      };
    });

    console.log('Student Dashboard Audit:', JSON.stringify(dashAudit, null, 2));
    await dashPage.close();

  } catch (err) {
    console.error('Audit verification error:', err);
  } finally {
    await browser.close();
    server.close();
  }
}

verifyAll();

