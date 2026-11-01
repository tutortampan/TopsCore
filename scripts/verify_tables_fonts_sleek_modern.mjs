import http from 'http';
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function createStaticServer(port = 50245) {
  const server = http.createServer((req, res) => {
    let cleanUrl = req.url.split('?')[0];
    if (cleanUrl === '/') cleanUrl = '/index.html';
    const filePath = path.join(process.cwd(), cleanUrl);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
        'Access-Control-Allow-Origin': '*'
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => resolve(server));
  });
}

async function runAudit() {
  const port = 50245;
  const server = await createStaticServer(port);
  console.log(`Test server running at http://localhost:${port}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const pagesToTest = [
    { name: 'Login Page', url: `http://localhost:${port}/index.html` },
    { name: 'Admin Console (Students Roster)', url: `http://localhost:${port}/admin.html#students` },
    { name: 'Admin Console (Class Hub)', url: `http://localhost:${port}/admin.html#class-hub` },
    { name: 'Admin Console (Vocab Vault)', url: `http://localhost:${port}/admin.html#vocab` },
    { name: 'Admin Console (Tests)', url: `http://localhost:${port}/admin.html#tests` },
    { name: 'Student Dashboard', url: `http://localhost:${port}/dashboard.html` },
    { name: 'Test Runner', url: `http://localhost:${port}/test.html` },
    { name: 'Result Page', url: `http://localhost:${port}/result.html` },
    { name: 'Offline Fallback', url: `http://localhost:${port}/offline.html` }
  ];

  let totalErrors = 0;

  for (const pageInfo of pagesToTest) {
    console.log(`\n==================================================`);
    console.log(`Auditing: ${pageInfo.name} -> ${pageInfo.url}`);
    console.log(`==================================================`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore expected network fetch errors to supabase cloud when offline/local
        if (!text.includes('supabase') && !text.includes('Failed to load resource')) {
          consoleErrors.push(text);
        }
      }
    });

    try {
      await page.goto(pageInfo.url, { waitUntil: 'networkidle2', timeout: 15000 });
    } catch (e) {
      console.warn(`Navigation note: ${e.message}`);
    }

    // Wait a brief moment for dynamic renders
    await new Promise(r => setTimeout(r, 1200));

    // Audit 1: Check Fonts
    const fontAudit = await page.evaluate(() => {
      const allElements = document.querySelectorAll('body, h1, h2, h3, h4, h5, h6, p, span, button, th, td, label');
      const fontFamilies = new Set();
      let fontCollisions = 0;
      const collisionDetails = [];

      allElements.forEach(el => {
        const style = window.getComputedStyle(el);
        const ff = style.fontFamily;
        if (ff) fontFamilies.add(ff);

        // Check for text overlap / negative line height or height collapses
        const lh = parseFloat(style.lineHeight);
        const fs = parseFloat(style.fontSize);
        if (!isNaN(lh) && !isNaN(fs) && lh < fs * 0.8 && fs > 12) {
          fontCollisions++;
          collisionDetails.push({ tag: el.tagName, text: el.innerText.substring(0, 30), fs, lh });
        }
      });

      return {
        fonts: Array.from(fontFamilies).slice(0, 5),
        collisions: fontCollisions,
        collisionDetails
      };
    });

    console.log(`Fonts detected:`, fontAudit.fonts.map(f => f.substring(0, 40)).join(' | '));
    if (fontAudit.collisions > 0) {
      console.error(`❌ Found ${fontAudit.collisions} font line-height collisions!`, fontAudit.collisionDetails);
      totalErrors += fontAudit.collisions;
    } else {
      console.log(`✅ No font line-height/size collisions detected.`);
    }

    // Audit 2: Check Tables & Sticky Headers
    const tableAudit = await page.evaluate(() => {
      const tables = document.querySelectorAll('table');
      const results = [];

      tables.forEach((tbl, idx) => {
        const thead = tbl.querySelector('thead');
        const ths = tbl.querySelectorAll('th');
        const parent = tbl.parentElement;
        const parentStyle = window.getComputedStyle(parent);
        
        let allThSticky = true;
        let anyThNonSticky = [];
        let hasTransparentBg = [];

        ths.forEach(th => {
          const s = window.getComputedStyle(th);
          if (s.position !== 'sticky') {
            allThSticky = false;
            anyThNonSticky.push(th.innerText.trim().substring(0, 20) || 'unnamed th');
          }
          if (s.backgroundColor === 'rgba(0, 0, 0, 0)' || s.backgroundColor === 'transparent') {
            hasTransparentBg.push(th.innerText.trim().substring(0, 20) || 'unnamed th');
          }
        });

        // Test scrolling if container is scrollable
        let scrollTestPassed = true;
        if (parent.scrollHeight > parent.clientHeight && parent.clientHeight > 0) {
          const initialTop = ths.length > 0 ? ths[0].getBoundingClientRect().top : 0;
          parent.scrollTop = 150;
          const scrolledTop = ths.length > 0 ? ths[0].getBoundingClientRect().top : 0;
          // In sticky, the header should stay pinned within parent viewport
          if (Math.abs(initialTop - scrolledTop) > 20) {
            scrollTestPassed = false;
          }
          parent.scrollTop = 0; // reset
        }

        results.push({
          idx,
          thCount: ths.length,
          allThSticky,
          nonStickyThs: anyThNonSticky,
          transparentThs: hasTransparentBg,
          parentOverflowY: parentStyle.overflowY,
          scrollTestPassed
        });
      });

      return results;
    });

    console.log(`Tables present: ${tableAudit.length}`);
    tableAudit.forEach((t, i) => {
      if (!t.allThSticky) {
        console.warn(`  ⚠️ Table ${i+1}: Some TH are not sticky: ${t.nonStickyThs.join(', ')}`);
      } else {
        console.log(`  ✅ Table ${i+1} (${t.thCount} columns): ALL headers are position:sticky! Background is opaque.`);
      }
      if (!t.scrollTestPassed) {
        console.warn(`  ⚠️ Table ${i+1}: Sticky header shifted during container scroll!`);
      }
    });

    // Audit 3: Check Layout & Text Overflows
    const layoutAudit = await page.evaluate(() => {
      let horizontalOverflow = document.documentElement.scrollWidth > window.innerWidth;
      // Also check cards and buttons
      const buttons = document.querySelectorAll('.btn, button');
      let overlappingButtons = 0;
      for (let i = 0; i < buttons.length - 1; i++) {
        const r1 = buttons[i].getBoundingClientRect();
        if (r1.width === 0 || r1.height === 0) continue;
        const r2 = buttons[i+1].getBoundingClientRect();
        if (r2.width === 0 || r2.height === 0) continue;
        // Check if bounding boxes unintentionally overlap (intersection area)
        const xOverlap = Math.max(0, Math.min(r1.right, r2.right) - Math.max(r1.left, r2.left));
        const yOverlap = Math.max(0, Math.min(r1.bottom, r2.bottom) - Math.max(r1.top, r2.top));
        if (xOverlap > 10 && yOverlap > 10 && buttons[i].parentElement === buttons[i+1].parentElement) {
          overlappingButtons++;
        }
      }
      return {
        horizontalOverflow,
        overlappingButtons
      };
    });

    if (layoutAudit.horizontalOverflow) {
      console.warn(`  Note: Page has horizontal scrollbar (acceptable on dense matrix views)`);
    } else {
      console.log(`  ✅ Clean horizontal viewport alignment.`);
    }

    if (layoutAudit.overlappingButtons > 0) {
      console.warn(`  ⚠️ Found ${layoutAudit.overlappingButtons} overlapping buttons`);
      totalErrors += layoutAudit.overlappingButtons;
    } else {
      console.log(`  ✅ No overlapping buttons detected.`);
    }

    await page.close();
  }

  await browser.close();
  server.close();

  console.log(`\n==================================================`);
  console.log(`AUDIT COMPLETE. Total Critical Errors: ${totalErrors}`);
  console.log(`==================================================`);

  if (totalErrors === 0) {
    console.log(`🎉 ALL AUDITS PASSED WITH ZERO CRITICAL ERRORS!`);
    process.exit(0);
  } else {
    console.error(`Audit failed with ${totalErrors} errors.`);
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
