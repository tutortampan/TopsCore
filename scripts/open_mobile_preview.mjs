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

// Helper to format proper URL with query parameters
function resolvePageUrl(p, baseUrl) {
  let target = p;
  if (target === 'result.html' && !target.includes('attempt_id')) {
    target = 'result.html?attempt_id=ba8cb716-6cdd-4017-a631-3ee0558ca04a';
  }
  if (target === 'test.html' && !target.includes('test_id')) {
    target = 'test.html?test_id=93ed8f86-1427-4d04-8a97-31531fb26851';
  }
  if (baseUrl) {
    return `${baseUrl}/${target}`;
  }
  const [filePath, query] = target.split('?');
  const fullPath = `file:///${path.resolve(filePath).replace(/\\/g, '/')}`;
  return query ? `${fullPath}?${query}` : fullPath;
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

  // Automatically seed active preview session for Student & Admin views
  const ayyaSession = {
    student_id: "bae52c8d-3456-4334-8f7a-7ba3c268c642",
    student_name: "Mr. Ayya Sofyandi Mzeth",
    gender: "male",
    institution_id: "f51d4c2c-7c24-42ef-8d8f-b0f3e524a447",
    institution_name: "CEC",
    program_id: "11deb53c-434a-44b0-83ca-1cc9b239cab3",
    program_name: "Camp",
    class_id: "2ccf6468-1e03-41d1-b72b-1d84dcad85b2",
    class_name: "2nd Vocabulary",
    batch_id: "3e7288b7-a90e-4323-9b02-24e73991f0d7",
    batch_name: "134",
    level_id: "9936683a-5b4a-4796-bb5d-a7fd8ecf0b71",
    level_number: 2,
    level_name: "2ND LEVEL",
    authenticated_at: new Date().toISOString()
  };

  const adminSession = {
    token: "admin_preview_active_session",
    role: "admin",
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };

  await context.addInitScript(({ ayya, admin }) => {
    try {
      if (!sessionStorage.getItem('topscore_session')) {
        sessionStorage.setItem('topscore_session', JSON.stringify(ayya));
      }
      if (!sessionStorage.getItem('topscore_admin_session')) {
        sessionStorage.setItem('topscore_admin_session', JSON.stringify(admin));
      }
    } catch (_) {}
  }, { ayya: ayyaSession, admin: adminSession });

  const previewDir = path.resolve('.mobile_previews');
  if ((isScreenshot || isAllScreenshots) && !fs.existsSync(previewDir)) {
    fs.mkdirSync(previewDir, { recursive: true });
  }

  if (isAllScreenshots) {
    const pages = ['dashboard.html', 'result.html', 'index.html', 'test.html', 'admin.html'];
    console.log('📸 Capturing mobile snapshots for all 5 core pages at 390x800...');

    for (const p of pages) {
      const page = await context.newPage();
      const pageUrl = resolvePageUrl(p, baseUrl);
      try {
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        await page.waitForFunction(() => {
          const overlay = document.querySelector('.loading-overlay');
          return !overlay || overlay.style.display === 'none';
        }, { timeout: 20000 }).catch(() => {});
        if (p === 'dashboard.html') {
          await page.waitForSelector('#batch-leaderboard-container .leaderboard-row', { timeout: 10000 }).catch(() => {});
        }
        await page.waitForTimeout(1500);
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
    page.on('console', msg => console.log('  [Browser]', msg.text()));
    page.on('pageerror', err => console.log('  [Browser Error]', err.message));
    const pageUrl = resolvePageUrl(targetPageArg, baseUrl);
    console.log(`📸 Capturing mobile snapshot for ${targetPageArg} at 390x800...`);
    await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForFunction(() => {
      const overlay = document.querySelector('.loading-overlay');
      return !overlay || overlay.style.display === 'none';
    }, { timeout: 20000 }).catch(() => {});
    await page.waitForSelector('#batch-leaderboard-container .leaderboard-row', { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const outPath = path.join(previewDir, `${path.basename(targetPageArg, '.html')}_390x800.png`);
    await page.screenshot({ path: outPath });
    console.log(`  ✅ Saved: .mobile_previews/${path.basename(outPath)}`);
    await browser.close();
    return;
  }

  // Interactive Live Headed Mobile Emulation
  const page = await context.newPage();
  const pageUrl = resolvePageUrl(targetPageArg, baseUrl);
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
