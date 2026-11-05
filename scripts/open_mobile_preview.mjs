/**
 * TopsCore — Mobile Viewport Preview & Snapshot Engine
 * Provides instant mobile emulation (390x800, Touch, Retina 2x)
 * Usage:
 *   node scripts/open_mobile_preview.mjs [page]              (interactive mobile window)
 *   node scripts/open_mobile_preview.mjs --screenshot [page] (captures snapshot)
 *   node scripts/open_mobile_preview.mjs --all-screenshots   (captures all 5 pages)
 */

import { chromium, devices } from 'playwright';
import path from 'path';
import fs from 'fs';
import http from 'http';

const args = process.argv.slice(2);
const isScreenshot = args.includes('--screenshot');
const isAllScreenshots = args.includes('--all-screenshots');
const targetPageArg = args.find(a => !a.startsWith('--')) || 'dashboard.html';

// Verify local server on port 5500 (Five Server)
async function isServerRunning(port = 5500) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/`, (res) => {
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function run() {
  const serverUp = await isServerRunning(5500);
  const baseUrl = serverUp ? 'http://localhost:5500' : null;

  // Try launching system Microsoft Edge or Google Chrome
  let browser;
  try {
    browser = await chromium.launch({
      channel: 'msedge',
      headless: isScreenshot || isAllScreenshots,
      args: ['--window-size=440,920', '--disable-infobars']
    });
  } catch (e1) {
    try {
      browser = await chromium.launch({
        channel: 'chrome',
        headless: isScreenshot || isAllScreenshots,
        args: ['--window-size=440,920', '--disable-infobars']
      });
    } catch (e2) {
      browser = await chromium.launch({
        headless: isScreenshot || isAllScreenshots,
        args: ['--window-size=440,920', '--disable-infobars']
      });
    }
  }

  // Device Emulation: Modern Smartphone (390x800 viewport, touch enabled, DPR 2)
  const context = await browser.newContext({
    viewport: { width: 390, height: 800 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });

  const previewDir = path.resolve('.mobile_previews');
  if ((isScreenshot || isAllScreenshots) && !fs.existsSync(previewDir)) {
    fs.mkdirSync(previewDir, { recursive: true });
  }

  if (isAllScreenshots) {
    const pages = ['dashboard.html', 'result.html', 'index.html', 'test.html', 'admin.html'];
    console.log('📸 Capturing mobile snapshots for all 5 core pages at 390x800...');

    for (const p of pages) {
      const page = await context.newPage();
      const pageUrl = baseUrl ? `${baseUrl}/${p}` : `file:///${path.resolve(p).replace(/\\/g, '/')}`;
      try {
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
        await page.waitForTimeout(600);
        const outPath = path.join(previewDir, `${path.basename(p, '.html')}_390x800.png`);
        await page.screenshot({ path: outPath });
        console.log(`  ✅ Saved: .mobile_previews/${path.basename(outPath)}`);
      } catch (err) {
        console.warn(`  ⚠️ Failed to snapshot ${p}:`, err.message);
      } finally {
        await page.close();
      }
    }
    await browser.close();
    console.log('🎉 All mobile snapshots captured successfully in .mobile_previews/ folder!');
    return;
  }

  if (isScreenshot) {
    const page = await context.newPage();
    const pageUrl = baseUrl ? `${baseUrl}/${targetPageArg}` : `file:///${path.resolve(targetPageArg).replace(/\\/g, '/')}`;
    console.log(`📸 Capturing mobile snapshot for ${targetPageArg} at 390x800...`);
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 5000 });
    await page.waitForTimeout(600);
    const outPath = path.join(previewDir, `${path.basename(targetPageArg, '.html')}_390x800.png`);
    await page.screenshot({ path: outPath });
    console.log(`  ✅ Saved: .mobile_previews/${path.basename(outPath)}`);
    await browser.close();
    return;
  }

  // Interactive Live Headed Mobile Emulation
  const page = await context.newPage();
  const pageUrl = baseUrl ? `${baseUrl}/${targetPageArg}` : `file:///${path.resolve(targetPageArg).replace(/\\/g, '/')}`;
  console.log(`\n======================================================`);
  console.log(`📱 TopsCore Mobile Preview Launched!`);
  console.log(`Target: ${targetPageArg}`);
  console.log(`URL:    ${pageUrl}`);
  console.log(`Device: 390 x 800 (Touch Enabled, DPR 2x)`);
  console.log(`Server: ${serverUp ? 'Five Server (Live Reload Active)' : 'Local File Mode'}`);
  console.log(`Close the browser window when finished.`);
  console.log(`======================================================\n`);

  await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });

  // Keep process open until browser window is closed by user
  browser.on('disconnected', () => {
    process.exit(0);
  });

  // Keep node alive
  await new Promise(() => {});
}

run().catch(err => {
  console.error('Mobile preview error:', err);
  process.exit(1);
});
