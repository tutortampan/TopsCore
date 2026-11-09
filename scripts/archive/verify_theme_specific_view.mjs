import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const PORT = 5579;
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

async function verifyThemeSpecificView() {
  console.log('=== VERIFYING CLASS HUB THEME C SPECIFIC VIEW ===');
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
    await new Promise(r => setTimeout(r, 2500));

    // Click on THEME C button
    console.log('Clicking on THEME C pill button...');
    await page.evaluate(() => {
      const btnC = document.querySelector('[data-theme="C"]');
      if (btnC) btnC.click();
    });

    await new Promise(r => setTimeout(r, 2000));

    const result = await page.evaluate(() => {
      const grid = document.querySelector('#class-attendance-grid');
      if (!grid) return { found: false };

      const superThs = Array.from(grid.querySelectorAll('thead tr.datagrid-super-header-row th')).map(th => ({
        label: th.innerText.trim(),
        colSpan: th.colSpan
      }));

      const subThs = Array.from(grid.querySelectorAll('thead tr:not(.datagrid-super-header-row) th')).map(th => th.innerText.replace(/\s+/g, ' ').trim());

      return {
        superThs,
        subThsCount: subThs.length,
        subThs
      };
    });

    console.log('Theme C View Result:');
    console.log('Super-Headers:', JSON.stringify(result.superThs, null, 2));
    console.log(`Sub-Headers Count: ${result.subThsCount}`);
    console.log('Sub-Headers:', result.subThs);

    const ssPath = 'C:\\Users\\Top\\.gemini\\antigravity\\brain\\6d27f237-f62d-4532-bae0-5a5e1bcf43b9\\screenshot_class_hub_theme_c.png';
    await page.screenshot({ path: ssPath, fullPage: false });
    console.log('Screenshot saved to:', ssPath);

  } catch (err) {
    console.error('Error during verification:', err);
  } finally {
    await browser.close();
    server.close();
  }
}

verifyThemeSpecificView();
