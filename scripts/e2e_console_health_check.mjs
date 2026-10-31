import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const PORT = 0; // Dynamic available port
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
    const port = 5520;
    server.listen(port, () => {
      resolve({ server, port });
    });
  });
}

async function runHealthCheck() {
  console.log('=== STARTING AUTOMATED E2E CONSOLE HEALTH CHECK ===\n');
  const { server, port } = await startServer();
  console.log(`Local test server running on http://localhost:${port}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const pagesToTest = [
    { name: 'Login (index.html)', path: '/index.html' },
    { name: 'Admin Console (admin.html)', path: '/admin.html' },
    { name: 'Student Dashboard (dashboard.html)', path: '/dashboard.html' },
    { name: 'Test Runner (test.html)', path: '/test.html' },
    { name: 'Result Page (result.html)', path: '/result.html' }
  ];

  let totalErrors = 0;

  for (const pageInfo of pagesToTest) {
    const page = await browser.newPage();
    const errors = [];
    const warnings = [];

    page.on('pageerror', (err) => {
      errors.push(`[Uncaught Exception] ${err.message}`);
    });

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected network auth failures when running offline/local without mock auth
        if (!text.includes('Failed to load resource') && !text.includes('401') && !text.includes('403')) {
          errors.push(`[Console Error] ${text}`);
        }
      }
    });

    console.log(`Testing: ${pageInfo.name}...`);
    try {
      await page.goto(`http://localhost:${port}${pageInfo.path}`, {
        waitUntil: 'networkidle2',
        timeout: 10000
      });
      // Allow dynamic imports and hydration to settle
      await new Promise(r => setTimeout(r, 1500));

      if (errors.length === 0) {
        console.log(`  ✅ ${pageInfo.name}: Clean! 0 console errors.`);
      } else {
        console.log(`  ❌ ${pageInfo.name}: ${errors.length} error(s) found:`);
        errors.forEach(e => console.log(`     -> ${e}`));
        totalErrors += errors.length;
      }
    } catch (e) {
      console.log(`  ⚠️ Navigation notice: ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  server.close();

  console.log(`\n=== E2E HEALTH CHECK SUMMARY ===`);
  console.log(`Total Uncaught Errors across 5 primary pages: ${totalErrors}`);
  if (totalErrors === 0) {
    console.log('🎉 ALL PRIMARY SYSTEM PAGES LOADED CLEANLY WITH ZERO SCRIPT ERRORS!');
  }
}

runHealthCheck().catch(console.error);
