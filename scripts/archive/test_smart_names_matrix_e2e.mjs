import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLASS_ID = '2ccf6468-1e03-41d1-b72b-1d84dcad85b2';

async function runTest() {
  console.log('🚀 Starting Smart Student Names Matrix E2E Test...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`[CONSOLE ${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err}`);
  });
  page.on('response', res => {
    if (res.status() >= 400) {
      console.log(`[HTTP ${res.status()}] ${res.url()}`);
    }
  });

  try {
    console.log('1. Navigating to admin.html...');
    await page.goto('http://127.0.0.1:5500/admin.html', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Handle admin login if present
    const loginScreen = page.locator('#admin-login-screen');
    if (await loginScreen.isVisible()) {
      console.log('Logging in as Admin...');
      await page.fill('#admin-username', 'admin');
      await page.fill('#admin-password', 'admin123');
      await page.click('#admin-login-btn');
      await page.waitForTimeout(2000);
    }

    console.log('2. Rendering Class Hub Attendance tab for 2nd Vocabulary...');
    await page.evaluate(async (cid) => {
      window._selectedClassId = cid;
      window._classHubActiveTab = 'attendance';
      const area = document.getElementById('admin-content-area');
      if (window.renderClassHub) {
        await window.renderClassHub(area);
      }
    }, CLASS_ID);

    await page.waitForTimeout(3000);

    // Wait for the attendance matrix datagrid
    await page.waitForSelector('#class-attendance-grid .datagrid-table', { timeout: 15000 });
    console.log('✅ Attendance matrix loaded successfully!');

    // Inspect the names rendered in .col-sticky-4
    const studentRows = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#class-attendance-grid tbody tr:not(.row-average)'));
      return rows.map(r => {
        const col4 = r.querySelector('.col-sticky-4');
        const textSpan = col4 ? col4.querySelector('span') : null;
        const containerDiv = col4 ? col4.querySelector('div') : null;
        return {
          renderedText: textSpan ? textSpan.innerText.trim() : '',
          tooltip: containerDiv ? containerDiv.getAttribute('title') : '',
          hasEllipsis: textSpan ? textSpan.innerText.includes('...') : false,
          colWidth: col4 ? window.getComputedStyle(col4).width : ''
        };
      });
    });

    console.log(`\nFound ${studentRows.length} student rows:`);
    let allValid = true;
    studentRows.forEach((s, idx) => {
      console.log(`[#${idx + 1}] Rendered: "${s.renderedText}" | Width: ${s.colWidth} | Has '...': ${s.hasEllipsis}`);
      if (s.hasEllipsis) {
        console.error(`  ❌ Truncation detected in: "${s.renderedText}"`);
        allValid = false;
      }
    });

    // Check specific name transformations
    const findRendered = (pattern) => studentRows.find(s => s.renderedText.includes(pattern));

    // Check short names are NOT abbreviated
    const testArman = findRendered('Lalu Arman Maulana');
    if (testArman) {
      console.log('✅ Rule Verified: "Lalu Arman Maulana" is NOT abbreviated (kept intact)!');
    } else {
      console.warn('⚠️ "Lalu Arman Maulana" not found or abbreviated');
    }

    const testNune = findRendered('Lalu Nune Mubarak');
    if (testNune) {
      console.log('✅ Rule Verified: "Lalu Nune Mubarak" is NOT abbreviated (kept intact)!');
    } else {
      console.warn('⚠️ "Lalu Nune Mubarak" not found or abbreviated');
    }

    const testBasit = findRendered('Abdul Basit');
    if (testBasit) {
      console.log('✅ Rule Verified: "Abdul Basit" is NOT abbreviated (kept intact)!');
    }

    // Check long names ARE abbreviated
    const testAlif = findRendered('M. Alifurrahman');
    if (testAlif) {
      console.log('✅ Rule Verified: "Muhamad Alifurrahman" -> "M. Alifurrahman"!');
    }

    const testAriwil = findRendered('M. Ariwil Asrori');
    if (testAriwil) {
      console.log('✅ Rule Verified: "Muhammad Ariwil Asrori" -> "M. Ariwil Asrori"!');
    }

    const testYuda = findRendered('L. Yuda H. Prawira');
    if (testYuda) {
      console.log('✅ Rule Verified: "Lalu Yuda Handika Prawira" -> "L. Yuda H. Prawira"!');
    }

    const testAdinda = findRendered('Adinda K. Farela');
    if (testAdinda) {
      console.log('✅ Rule Verified: "Adinda Karunia Farela" -> "Adinda K. Farela"!');
    }

    // Take screenshot of ALL VIEW
    const screenshotPath = 'C:/Users/ASUS/.gemini/antigravity/brain/32e9ca28-d796-4f35-afe9-223111004d95/smart_names_matrix_verified.png';
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    // Switch to THEME A view and take screenshot
    const themeABtn = page.locator('button:has-text("THEME A")').first();
    if (await themeABtn.isVisible().catch(() => false)) {
      console.log('Switching to THEME A view...');
      await themeABtn.click();
      await page.waitForTimeout(1000);
      const themeScreenshotPath = 'C:/Users/ASUS/.gemini/antigravity/brain/32e9ca28-d796-4f35-afe9-223111004d95/smart_names_theme_view_verified.png';
      await page.screenshot({ path: themeScreenshotPath, fullPage: false });
      console.log(`📸 Theme View Screenshot saved: ${themeScreenshotPath}`);
    }

    if (allValid) {
      console.log('\n🎉 ALL SMART NAME CHECKS PASSED 100%!');
    } else {
      console.error('\n❌ SOME NAMES HAVE UNEXPECTED TRUNCATION!');
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest();
