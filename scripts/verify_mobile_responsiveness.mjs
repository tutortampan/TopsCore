import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(process.cwd(), reqPath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

async function runMobileAudit() {
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Starting Mobile Responsiveness Audit on ${baseUrl}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const viewports = [
    { name: 'iPhone SE (375x667)', width: 375, height: 667 },
    { name: 'iPad Mini (768x1024)', width: 768, height: 1024 }
  ];

  const routes = [
    { name: 'Login', path: '/index.html' },
    { name: 'Student Lobby', path: '/dashboard.html' },
    { name: 'Test Runner', path: '/test.html' },
    { name: 'Result Page', path: '/result.html' }
  ];

  let totalIssues = 0;

  for (const vp of viewports) {
    console.log(`\n========================================`);
    console.log(`Testing Viewport: ${vp.name}`);
    console.log(`========================================`);

    const page = await browser.newPage();
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });

    for (const route of routes) {
      await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 800));

      const overflow = await page.evaluate(() => {
        return {
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
          hasBodyHorizontalScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
        };
      });

      if (overflow.hasBodyHorizontalScroll) {
        console.warn(`  ⚠️ [${route.name}] Unintended horizontal body overflow detected: scrollWidth=${overflow.scrollWidth}px vs clientWidth=${overflow.clientWidth}px`);
        totalIssues++;
      } else {
        console.log(`  ✅ [${route.name}] Clean viewport fit (Width: ${overflow.clientWidth}px, no horizontal leakage).`);
      }
    }

    await page.close();
  }

  await browser.close();
  server.close();

  console.log(`\n========================================`);
  console.log(`Mobile Responsiveness Audit Complete. Total Issues: ${totalIssues}`);
  console.log(`========================================`);
}

runMobileAudit().catch(console.error);
