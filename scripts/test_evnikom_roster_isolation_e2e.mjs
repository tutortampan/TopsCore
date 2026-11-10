/**
 * scripts/test_evnikom_roster_isolation_e2e.mjs
 * 
 * Automated E2E verification for Evnikom EV-07 roster tenant isolation,
 * dynamic discrete test column rendering, student scores, and Camp batch non-regression.
 * Follows Rule 2.26 (Mandatory Automated Verification) & Rule 2.25 (Mockups & Visual Proof).
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import assert from 'assert';

const PORT = 5588;
const WORKSPACE_DIR = process.cwd();
const ARTIFACT_DIR = path.resolve('C:/Users/ASUS/.gemini/antigravity/brain/db70e579-3b54-4473-9eed-e7677e0d8525');

// MIME types dictionary for static file serving
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.cjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let reqPath = decodeURI(req.url.split('?')[0]);
      if (reqPath === '/') reqPath = '/admin.html';
      const filePath = path.join(WORKSPACE_DIR, reqPath);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    });

    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[HTTP] Local test server running at http://127.0.0.1:${PORT}`);
      resolve(server);
    });
  });
}

async function runE2E() {
  console.log('\n===============================================================');
  console.log('  STARTING E2E AUTOMATED VERIFICATION: EVNIKOM ROSTER ISOLATION');
  console.log('===============================================================\n');

  const server = await startServer();
  let browser;

  try {
    try {
      browser = await chromium.launch({ channel: 'chrome', headless: true });
    } catch {
      browser = await chromium.launch({ headless: true });
    }

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });

    // Seed admin session
    await context.addInitScript(() => {
      sessionStorage.setItem('topscore_admin_session', JSON.stringify({
        admin_id: 'admin-master',
        token: 'admin_master_test_token',
        role: 'admin',
        username: 'Administrator'
      }));
    });

    const page = await context.newPage();

    // Listen to console and page errors for diagnostic transparency
    page.on('console', msg => {
      if (msg.type() === 'error') console.log('  [Browser Error]', msg.text());
    });
    page.on('pageerror', err => console.log('  [Page Exception]', err.message));

    console.log(`[Step 1] Navigating to http://127.0.0.1:${PORT}/admin.html#students...`);
    await page.goto(`http://127.0.0.1:${PORT}/admin.html#students`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for sidebar programs list to be populated
    console.log('[Step 2] Waiting for sidebar programs and batches to hydrate...');
    await page.waitForSelector('.sidebar-program-item', { state: 'visible', timeout: 15000 });
    console.log('  ✓ Sidebar batches hydrated.');

    // ── TEST A: Evnikom EV-07 Batch ──
    console.log('\n[Step 3] Selecting Evnikom EV-07 batch in sidebar...');
    const evnikomItem = page.locator('.sidebar-program-item:has-text("Evnikom EV-07"), .sidebar-program-item:has-text("EV-07")').first();
    await evnikomItem.waitFor({ state: 'visible', timeout: 5000 });
    await evnikomItem.click();
    console.log('  ✓ Clicked Evnikom EV-07 batch.');

    // Wait for DataGrid table to render
    await page.waitForSelector('#student-grid-container .datagrid-table', { state: 'visible', timeout: 15000 });
    // Allow brief settle for calculations and DOM painting
    await page.waitForTimeout(2000);
    console.log('  ✓ Student DataGrid table rendered for Evnikom EV-07.');

    // Capture super headers text and colSpan
    console.log('\n[Step 4] Asserting Super-Header isolation for Evnikom EV-07...');
    const superHeaderCells = await page.locator('.datagrid-super-header-row th').evaluateAll(ths => 
      ths.map(th => ({ text: th.textContent.trim(), colSpan: th.colSpan }))
    );
    console.log('  Super-headers detected:', superHeaderCells);

    const superTexts = superHeaderCells.map(h => h.text.toUpperCase());
    
    // Assert 1: Camp classes MUST NOT appear
    assert(!superTexts.some(t => t.includes('CAMP 2ND') || t.includes('CAMP 3RD')), 
      'FAIL: Camp classes (CAMP 2ND / CAMP 3RD) leaked into Evnikom EV-07 table!');
    console.log('  ✓ PASS: CAMP 2ND and CAMP 3RD are completely ABSENT from Evnikom table.');

    // Assert 2: Evnikom 1st Vocabulary MUST appear with colSpan 3
    const evnikomSuper = superHeaderCells.find(h => h.text.toUpperCase().includes('EVNIKOM 1ST VOCABULARY'));
    assert(evnikomSuper, 'FAIL: EVNIKOM 1ST VOCABULARY super-header is missing!');
    assert.strictEqual(evnikomSuper.colSpan, 3, `FAIL: Expected colSpan 3 for Evnikom 1st Vocabulary, got ${evnikomSuper.colSpan}`);
    console.log(`  ✓ PASS: EVNIKOM 1ST VOCABULARY is present with exact colSpan = 3.`);

    // Assert 3: Sub-headers MUST display discrete test names, NOT Exam 1..4
    console.log('\n[Step 5] Asserting discrete test sub-headers...');
    const subHeaderTexts = await page.locator('.datagrid-table thead tr:last-child th').evaluateAll(ths => 
      ths.map(th => th.textContent.trim())
    );
    console.log('  Sub-headers detected:', subHeaderTexts);

    assert(subHeaderTexts.some(t => t.includes('1A1 TASK')), 'FAIL: Sub-header 1A1 TASK is missing!');
    assert(subHeaderTexts.some(t => t.includes('1G2 TASK')), 'FAIL: Sub-header 1G2 TASK is missing!');
    assert(subHeaderTexts.some(t => t.includes('1G EXAM')), 'FAIL: Sub-header 1G EXAM is missing!');
    assert(!subHeaderTexts.some(t => t === 'EXAM 1' || t === 'EXAM 2' || t === 'EXAM 3' || t === 'EXAM 4'),
      'FAIL: Generic EXAM 1..4 headers are incorrectly rendered for Evnikom!');
    console.log('  ✓ PASS: Sub-headers dynamically display 1A1 TASK, 1G2 TASK, 1G EXAM.');

    // Assert 4: Verify student scores and color coding
    console.log('\n[Step 6] Asserting student scores for Evnikom batch...');
    const rows = await page.locator('.datagrid-table tbody tr:not(.datagrid-summary-row)').evaluateAll(trs => {
      return trs.map(tr => {
        const nameEl = tr.querySelector('.cell-name, .student-name, td:nth-child(3)');
        const name = nameEl ? nameEl.textContent.trim() : '';
        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
        return { name, cells };
      });
    });

    console.log('  Student rows parsed:');
    rows.forEach(r => console.log(`    - ${r.name.split('\n')[0]}: ${r.cells.join(' | ')}`));

    const haekal = rows.find(r => r.name.includes('Ahmad Haekal'));
    assert(haekal, 'FAIL: Ahmad Haekal Firdaus row not found!');
    assert(haekal.cells.some(c => c.includes('40') && c.includes('pts')), 
      `FAIL: Ahmad Haekal should have 40 pts in 1A1 TASK! Row cells: ${JSON.stringify(haekal.cells)}`);
    console.log('  ✓ PASS: Ahmad Haekal Firdaus has 40 pts in 1A1 TASK.');

    const aryadhewa = rows.find(r => r.name.includes('Aryadhewa'));
    assert(aryadhewa, 'FAIL: Aryadhewa Julian Firana row not found!');
    assert(aryadhewa.cells.some(c => c.includes('40') && c.includes('pts')), 
      `FAIL: Aryadhewa should have 40 pts in 1A1 TASK! Row cells: ${JSON.stringify(aryadhewa.cells)}`);
    console.log('  ✓ PASS: Aryadhewa Julian Firana has 40 pts in 1A1 TASK.');

    const imam = rows.find(r => r.name.includes('Imam'));
    assert(imam, 'FAIL: Imam Azama row not found!');
    assert(imam.cells.some(c => c.includes('39') && c.includes('pts')), 
      `FAIL: Imam Azama should have 39 pts in 1A1 TASK! Row cells: ${JSON.stringify(imam.cells)}`);
    console.log('  ✓ PASS: Imam Azama has 39 pts in 1A1 TASK.');

    // Assert 5: Summary row average
    console.log('\n[Step 7] Asserting summary row batch average...');
    const summaryCells = await page.locator('.datagrid-summary-row td').evaluateAll(tds => 
      tds.map(td => td.textContent.trim())
    );
    console.log('  Summary row cells:', summaryCells);
    assert(summaryCells.some(c => c.includes('39.7') && c.includes('pts')), 
      `FAIL: Expected summary average 39.7 pts for 1A1 TASK! Summary cells: ${JSON.stringify(summaryCells)}`);
    console.log('  ✓ PASS: Summary row renders 39.7 pts for 1A1 TASK.');

    // Capture screenshot of Evnikom EV-07
    const evnikomScreenshotPath = path.join(ARTIFACT_DIR, 'after_evnikom_roster_isolated.png');
    await page.screenshot({ path: evnikomScreenshotPath, fullPage: false });
    console.log(`  ✓ Saved visual screenshot to: ${evnikomScreenshotPath}`);

    // ── TEST B: Non-Regression for Camp 134 Batch ──
    console.log('\n[Step 8] Testing Non-Regression for Camp 134 Batch...');
    const campItem = page.locator('.sidebar-program-item:has-text("Camp 134"), .sidebar-program-item:has-text("134")').first();
    await campItem.waitFor({ state: 'visible', timeout: 10000 });
    await campItem.click();
    console.log('  ✓ Clicked Camp 134 batch.');

    await page.waitForTimeout(2500);

    const campSuperHeaders = await page.locator('.datagrid-super-header-row th').evaluateAll(ths => 
      ths.map(th => ({ text: th.textContent.trim(), colSpan: th.colSpan }))
    );
    console.log('  Camp 134 Super-headers:', campSuperHeaders);

    const campSuperTexts = campSuperHeaders.map(h => h.text.toUpperCase());
    assert(campSuperTexts.some(t => t.includes('CAMP 2ND VOCABULARY')), 
      'FAIL: CAMP 2ND VOCABULARY missing from Camp 134 batch table!');
    assert(!campSuperTexts.some(t => t.includes('EVNIKOM')), 
      'FAIL: EVNIKOM leaked into Camp 134 batch table!');
    console.log('  ✓ PASS: Camp 134 displays CAMP 2ND VOCABULARY and has ZERO Evnikom leakage.');

    const campSubHeaders = await page.locator('.datagrid-table thead tr:last-child th').evaluateAll(ths => 
      ths.map(th => th.textContent.trim())
    );
    assert(campSubHeaders.some(t => t.includes('EXAM 1') || t.includes('Exam 1')), 
      'FAIL: Camp 2nd Vocabulary should retain Exam 1..4 columns!');
    console.log('  ✓ PASS: Camp 134 correctly retains multi-theme Exam 1..4 columns (no regression).');

    // Capture screenshot of Camp 134
    const campScreenshotPath = path.join(ARTIFACT_DIR, 'camp_134_roster_verified.png');
    await page.screenshot({ path: campScreenshotPath, fullPage: false });
    console.log(`  ✓ Saved visual screenshot to: ${campScreenshotPath}`);

    console.log('\n===============================================================');
    console.log('  🎉 ALL AUTOMATED E2E VERIFICATIONS PASSED SUCCESSFULLY!');
    console.log('===============================================================\n');

  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

runE2E().catch(err => {
  console.error('\n❌ E2E VERIFICATION FAILED:\n', err);
  process.exit(1);
});
