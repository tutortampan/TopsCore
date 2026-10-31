import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/admin.html';
  const filePath = path.join(process.cwd(), reqPath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
});

async function verifyScreenshots() {
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Testing Admin Pages on ${baseUrl}`);

  const browser = await chromium.launch({ channel: 'msedge', headless: true }).catch(() => chromium.launch({ headless: true }));
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

  // Mock admin auth session
  await context.addInitScript(() => {
    sessionStorage.setItem('topscore_admin_auth', 'true');
    sessionStorage.setItem('topscore_admin_user', JSON.stringify({ role: 'superadmin', username: 'Super Admin' }));
  });

  const page = await context.newPage();

  // Test 1: Class Hub and Sidebar
  console.log('\n--- 1. Testing Class Hub & Domain B Sidebar ---');
  await page.goto(`${baseUrl}/admin.html#class-hub`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const sidebarItems = await page.evaluate(() => {
    const items = document.querySelectorAll('#sidebar-programs-list .sidebar-program-item');
    return Array.from(items).map(i => i.textContent.trim());
  });
  console.log('Sidebar Domain B Items found in DOM:', sidebarItems);

  // Assert only active batches are displayed
  const hasPast = sidebarItems.some(txt => txt.includes('Past'));
  console.log('Contains "Past" batches?', hasPast);
  if (hasPast) {
    console.error('FAIL: Sidebar should not contain Past batches!');
  } else {
    console.log('PASS: No Past batches in sidebar.');
  }

  // Test 2: Student Roster
  console.log('\n--- 2. Testing Student Roster Layout & Columns ---');
  await page.goto(`${baseUrl}/admin.html#students`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const topTabs = await page.evaluate(() => {
    const tabs = document.querySelectorAll('#topbar-tabs-container .topbar-tab-card');
    return Array.from(tabs).map(t => t.textContent.replace(/\s+/g, ' ').trim());
  });
  console.log('Topbar tabs rendered:', topTabs);

  const tableHeaders = await page.evaluate(() => {
    const ths = document.querySelectorAll('#student-grid-container table th');
    return Array.from(ths).map(th => th.textContent.trim()).filter(Boolean);
  });
  console.log('Student Table Headers rendered:', tableHeaders);

  const redundantCols = ['INSTITUTION', 'PROGRAM', 'BATCH', 'ENROLLED', 'STATUS'];
  const foundRedundant = redundantCols.filter(col => tableHeaders.includes(col));
  if (foundRedundant.length > 0) {
    console.error('FAIL: Found redundant columns in roster:', foundRedundant);
  } else {
    console.log('PASS: All redundant columns successfully purged from roster table!');
  }

  await browser.close();
  server.close();
}

verifyScreenshots().catch(console.error);
