const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('d:/Drives/Tutor Tampan/TopsCore/node_modules/playwright');

const artifactDir = 'C:/Users/Top/.gemini/antigravity/brain/779df3a5-d6c5-47f0-b10a-0377f6852212';
const scratchDir = path.join(artifactDir, 'scratch');
const harnessPath = path.join(scratchDir, 'harness_live_open_session.html');

let html = fs.readFileSync(harnessPath, 'utf8');

// Replace any capsule spans in table cells with pure font color without background/border/border-radius/padding
html = html.replace(
  /<span style="display:inline-block; padding:3px 8px; border-radius:4px; font-weight:800; font-size:12px; letter-spacing:0.02em; background:rgba\(255,0,0,0.15\); color:var\(--grade-e\); border:1px solid rgba\(255,0,0,0.35\);">([\s\S]*?)<\/span>/g,
  '<span style="font-weight:400; font-family:var(--fm-font-sans, Inter, sans-serif); font-size:12px; letter-spacing:0.02em; color:var(--grade-e); text-shadow:none;">$1</span>'
);

html = html.replace(
  /<span style="display:inline-block; padding:3px 8px; border-radius:4px; font-weight:800; font-size:12px; letter-spacing:0.02em; background:rgba\(0,192,0,0.16\); color:var\(--grade-a\); border:1px solid rgba\(0,192,0,0.4\);">([\s\S]*?)<\/span>/g,
  '<span style="font-weight:400; font-family:var(--fm-font-sans, Inter, sans-serif); font-size:12px; letter-spacing:0.02em; color:var(--grade-a); text-shadow:none;">$1</span>'
);

// Fix number font-weight from 700 to 400 per Rule 2.30
html = html.replace(/color:#94a3b8; font-weight:700; font-size:12px;/g, 'color:#94a3b8; font-weight:400; font-size:12px;');

// Fix checkbox gap from gap:6px to gap:10px
html = html.replace(/gap:6px; cursor:/g, 'gap:10px; cursor:');

fs.writeFileSync(harnessPath, html);
console.log('Updated harness HTML successfully.');

const PORT = 6098;
const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  let filePath = reqPath.startsWith('/scratch/') ? path.join(artifactDir, reqPath) : path.join('d:/Drives/Tutor Tampan/TopsCore', reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': ext === '.css' ? 'text/css' : 'text/html' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(PORT, async () => {
  try {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1.5 });
    await page.goto('http://127.0.0.1:' + PORT + '/scratch/harness_live_open_session.html', { waitUntil: 'networkidle' });
    const box = await page.locator('.modal-box');
    const targetPath = path.join(artifactDir, 'live_room_01_open_session_box_lowres.jpg');
    await box.screenshot({ path: targetPath, quality: 85, type: 'jpeg' });
    console.log('Saved screenshot successfully:', targetPath);
    await browser.close();
  } catch (err) {
    console.error('Error during screenshot capture:', err);
  } finally {
    server.close();
    process.exit(0);
  }
});