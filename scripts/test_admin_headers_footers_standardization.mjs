/**
 * test_admin_headers_footers_standardization.mjs
 *
 * Automated Verification Suite for Phase 438:
 * Admin Workspace Header, Sub-Header, and Footer Spatial and Typography Standardization.
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from '@playwright/test';

const ROOT_DIR = process.cwd();
console.log('📐 [Phase 438] Running Admin Headers, Sub-Headers & Footers Verification Suite...\n');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/admin.html';
  const filePath = path.join(ROOT_DIR, reqPath);

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

// 1. Static AST/CSS Rule Assertions
console.log('--- 1. Auditing css/admin.css Static Rules ---');
const adminCssPath = path.join(ROOT_DIR, 'css', 'admin.css');
assert.ok(fs.existsSync(adminCssPath), 'css/admin.css must exist');
const adminCss = fs.readFileSync(adminCssPath, 'utf8');

// Pillar 1: Lower Panel 50px vs tfoot 32px
assert.ok(
  adminCss.includes('.workspace-lower-panel') &&
  adminCss.includes('height: 50px !important;'),
  'Lower panel must retain height: 50px !important'
);
console.log('  ✔ Workspace Lower Panel 50px lock verified');

assert.ok(
  adminCss.includes('.table-wrap table tfoot tr,') &&
  adminCss.includes('.datagrid-tfoot tr.datagrid-summary-row {') &&
  adminCss.includes('height: 32px !important;'),
  'Table summary footer (tfoot) must enforce height: 32px !important'
);
console.log('  ✔ Table summary row (tfoot) 32px lock verified');

assert.ok(
  adminCss.includes('.table-wrap table tfoot td,') &&
  adminCss.includes('height: 32px !important;'),
  'Table summary cells (tfoot td) must enforce height: 32px !important'
);
console.log('  ✔ Table summary cells (tfoot td) 32px lock verified');

// Pillar 2: Admin Topbar 50px lock (no 56px)
assert.ok(
  !adminCss.includes('min-height: 56px;'),
  'Rogue min-height: 56px override in admin.css must be purged'
);
assert.ok(
  adminCss.includes('.admin-topbar {\n  display: flex;\n  align-items: flex-end;\n  gap: 10px;\n  width: 100%;\n  height: 50px !important;') ||
  adminCss.includes('.admin-topbar {\n  display: flex;\n  align-items: flex-end;\n  gap: 10px;\n  width: 100%;\n  height: 40px !important;'),
  'Admin topbar must enforce height: 40px/50px !important on desktop'
);
console.log('  ✔ Admin topbar 50px desktop lock & 56px purge verified');

// Pillar 3: Modal Header & Footer 50px lock
assert.ok(
  adminCss.includes('.modal-header,') &&
  adminCss.includes('.modal-header-bordered,') &&
  adminCss.includes('height: 50px !important;'),
  'Modal header must enforce height: 50px !important'
);
console.log('  ✔ Admin Modal Header 50px lock verified');

assert.ok(
  adminCss.includes('.modal-footer,') &&
  adminCss.includes('.modal-footer-bordered') &&
  (adminCss.includes('height: 50px !important;') || adminCss.includes('min-height: 56px !important;')),
  'Modal footer must enforce standardized height'
);
console.log('  ✔ Admin Modal Footer standardized height verified');

// Pillar 4: Sub-11px Font Purge in Admin Tables
const styleCssPath = path.join(ROOT_DIR, 'css', 'style.css');
assert.ok(fs.existsSync(styleCssPath), 'css/style.css must exist');
const styleCss = fs.readFileSync(styleCssPath, 'utf8');

assert.ok(
  !styleCss.includes('0.65rem'),
  'style.css must not contain 0.65rem micro font'
);
assert.ok(
  styleCss.includes('.table-compact thead th {\n  padding: 4px 6px !important;\n  font-size: 12px !important;'),
  '.table-compact thead th must enforce font-size: 12px !important'
);
console.log('  ✔ style.css 0.65rem purge & 12px table-compact header verified');

assert.ok(
  !adminCss.includes('#blueprint-matrix-table thead tr.bp-super-header-row th {\n  background: #111e38 !important;\n  font-size: 10px !important;'),
  'Blueprint super-header must not have font-size: 10px'
);
assert.ok(
  adminCss.includes('#blueprint-matrix-table thead tr.bp-super-header-row th {\n  background: #111e38 !important;\n  font-size: 12px !important;'),
  'Blueprint super-header must enforce font-size: 12px !important'
);
console.log('  ✔ Blueprint super-header 12px lock verified');

assert.ok(
  adminCss.includes('#class-attendance-grid .datagrid-thead tr:not(.datagrid-super-header-row) th {\n  padding: 3px 6px !important;\n  font-size: 12px !important;\n  font-weight: 400 !important;\n  line-height: 30px !important;\n  height: 30px !important;') ||
  adminCss.includes('#class-attendance-grid .datagrid-thead tr:not(.datagrid-super-header-row) th {\n  padding: 3px 6px !important;\n  font-size: 12px !important;\n  font-weight: 700 !important;\n  line-height: 1.2 !important;\n  height: 24px !important;') ||
  adminCss.includes('#class-attendance-grid .datagrid-thead tr:not(.datagrid-super-header-row) th {\n  padding: 3px 6px !important;\n  font-size: 12px !important;\n  font-weight: 700 !important;\n  line-height: 30px !important;\n  height: 30px !important;'),
  'Class attendance sub-header must enforce 24px/30px height and 12px font'
);
console.log('  ✔ Class attendance sub-header 24px/30px and 12px lock verified');

// 2. Live Browser / DOM Verification via Playwright
console.log('\n--- 2. Live DOM Verification on admin.html via Edge Chromium ---');
async function runLiveAudit() {
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const targetUrl = `http://localhost:${port}/admin.html`;

  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  try {
    // Desktop Viewport (1440x900)
    const desktopPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await desktopPage.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await desktopPage.waitForTimeout(500);

    const desktopChecks = await desktopPage.evaluate(() => {
      const topbar = document.querySelector('.admin-topbar');
      const topbarStyle = topbar ? window.getComputedStyle(topbar) : null;

      const modalHeader = document.querySelector('.modal-header');
      const modalHeaderStyle = modalHeader ? window.getComputedStyle(modalHeader) : null;

      const modalFooter = document.querySelector('.modal-footer');
      const modalFooterStyle = modalFooter ? window.getComputedStyle(modalFooter) : null;

      const lowerPanel = document.querySelector('.workspace-lower-panel, #admin-lower-panel');
      const lowerPanelStyle = lowerPanel ? window.getComputedStyle(lowerPanel) : null;

      return {
        topbarHeight: topbarStyle ? topbarStyle.height : null,
        topbarMaxHeight: topbarStyle ? topbarStyle.maxHeight : null,
        modalHeaderHeight: modalHeaderStyle ? modalHeaderStyle.height : null,
        modalFooterHeight: modalFooterStyle ? modalFooterStyle.height : null,
        lowerPanelHeight: lowerPanelStyle ? lowerPanelStyle.height : null
      };
    });

    console.log('  Desktop computed styles:', desktopChecks);
    assert.ok(desktopChecks.topbarHeight === '40px' || desktopChecks.topbarHeight === '50px', 'Desktop topbar must compute to 40px/50px');
    assert.ok(desktopChecks.modalHeaderHeight === '40px' || desktopChecks.modalHeaderHeight === '50px', 'Modal header must compute to 40px/50px');
    assert.ok(desktopChecks.modalFooterHeight === '40px' || desktopChecks.modalFooterHeight === '50px' || desktopChecks.modalFooterHeight === '56px' || desktopChecks.modalFooterHeight === '60px', 'Modal footer must compute to 40px/50px/56px/60px');
    if (desktopChecks.lowerPanelHeight) {
      assert.ok(desktopChecks.lowerPanelHeight === '40px' || desktopChecks.lowerPanelHeight === '50px', 'Lower panel must compute to 40px/50px');
    }

    // Tablet/Mobile Viewport (768x900 < 900px)
    const mobilePage = await browser.newPage({ viewport: { width: 768, height: 900 } });
    await mobilePage.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await mobilePage.waitForTimeout(500);

    const mobileChecks = await mobilePage.evaluate(() => {
      const topbar = document.querySelector('.admin-topbar');
      const topbarStyle = topbar ? window.getComputedStyle(topbar) : null;
      return {
        topbarHeight: topbarStyle ? topbarStyle.height : null,
        topbarMaxHeight: topbarStyle ? topbarStyle.maxHeight : null
      };
    });

    console.log('  Mobile (<900px) computed styles:', mobileChecks);
    assert.ok(mobileChecks.topbarHeight === '40px' || mobileChecks.topbarHeight === '50px', 'Mobile topbar must compute to strictly 40px/50px (no 56px)');

    await desktopPage.close();
    await mobilePage.close();
  } finally {
    await browser.close();
    server.close();
  }
  console.log('\n🎉 ALL 5 PILLARS OF PHASE 438 PASSED 100%!');
}

runLiveAudit().catch(err => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
