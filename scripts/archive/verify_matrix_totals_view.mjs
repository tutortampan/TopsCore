import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const PORT = 5577;
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

async function verifyMatrix() {
  console.log('=== VERIFYING CLASS HUB ALL (EXAM TOTALS) VIEW ===');
  const server = await startServer();
  console.log(`Test server running at http://localhost:${PORT}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1440,900']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // Add mock admin session
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
    await page.goto(`http://localhost:${PORT}/admin.html?status=active#class-hub`, { waitUntil: 'networkidle2', timeout: 15000 });
    await new Promise(r => setTimeout(r, 2000));

    // Check if class details need to be loaded
    await page.evaluate(async () => {
      // Find 3rd Vocabulary class
      const classId = 'ab33498a-90e6-44b7-83f4-5765f964543e';
      if (typeof window.loadClassDetails === 'function') {
        await window.loadClassDetails(classId);
      } else {
        const card = document.querySelector(`[data-class-id="${classId}"], .class-card`);
        if (card) card.click();
      }
    });

    await new Promise(r => setTimeout(r, 2500));

    // Inspect the rendered table columns and super-headers!
    const result = await page.evaluate(() => {
      const grid = document.querySelector('#class-attendance-grid');
      if (!grid) return { found: false, error: 'No #class-attendance-grid' };

      const superThs = Array.from(grid.querySelectorAll('thead tr.datagrid-super-header-row th')).map(th => ({
        label: th.innerText.trim(),
        colSpan: th.colSpan,
        className: th.className
      }));

      const subThs = Array.from(grid.querySelectorAll('thead tr:not(.datagrid-super-header-row) th')).map(th => ({
        text: th.innerText.replace(/\s+/g, ' ').trim(),
        width: window.getComputedStyle(th).width,
        key: th.dataset.key
      }));

      const rowsCount = grid.querySelectorAll('tbody tr').length;
      const firstRowTds = Array.from(grid.querySelectorAll('tbody tr:first-child td')).map(td => td.innerText.trim());

      const summaryRow = grid.querySelector('tfoot tr.datagrid-summary-row');
      const summaryTds = summaryRow ? Array.from(summaryRow.querySelectorAll('td')).map(td => td.innerText.trim()) : [];

      return {
        found: true,
        superThs,
        subThsCount: subThs.length,
        subThs,
        rowsCount,
        firstRowTds,
        summaryTds
      };
    });

    console.log('Class Hub Table Result:');
    console.log('Super-Headers:', JSON.stringify(result.superThs, null, 2));
    console.log(`Sub-Headers Count: ${result.subThsCount}`);
    console.log('Sub-Headers:', result.subThs?.map(h => `${h.text} [${h.width}]`));
    console.log(`Student Rows Rendered: ${result.rowsCount}`);
    if (result.firstRowTds) {
      console.log('First Student Row Sample:', result.firstRowTds.slice(0, 10).join(' | '));
    }
    if (result.summaryTds) {
      console.log('Summary Row Sample:', result.summaryTds.slice(0, 10).join(' | '));
    }

    // Take screenshot of the result
    const ssPath = 'C:\\Users\\Top\\.gemini\\antigravity\\brain\\6d27f237-f62d-4532-bae0-5a5e1bcf43b9\\screenshot_class_hub_totals.png';
    await page.screenshot({ path: ssPath, fullPage: false });
    console.log('Screenshot saved to:', ssPath);

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
    server.close();
  }
}

verifyMatrix();
