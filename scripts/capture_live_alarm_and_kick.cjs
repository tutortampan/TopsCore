const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('d:/Drives/Tutor Tampan/TopsCore/node_modules/playwright');

const artifactDir = 'C:/Users/Top/.gemini/antigravity/brain/779df3a5-d6c5-47f0-b10a-0377f6852212';
const scratchDir = path.join(artifactDir, 'scratch');
if (!fs.existsSync(scratchDir)) {
  fs.mkdirSync(scratchDir, { recursive: true });
}

// Read tests-access.js to get modal HTML
const jsContent = fs.readFileSync('d:/Drives/Tutor Tampan/TopsCore/js/admin/tests-access.js', 'utf8');

// 1. Window L4: Alarm Detail Modal
const startIdxL4 = jsContent.indexOf('<!-- Modal 5: Student Alarm Detail & Forgive Modal -->');
const endIdxL4 = jsContent.indexOf('bindTestSessionsEvents', startIdxL4);
let modalHtmlL4 = jsContent.substring(startIdxL4, endIdxL4);
modalHtmlL4 = modalHtmlL4.replace('class="modal-backdrop hidden"', 'class="modal-backdrop"');

// Mock alarms
const mockAlarms = `
  <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; gap:10px; box-sizing:border-box;">
    <div>
      <div style="font-family:'Inter',sans-serif; font-size:12px; display:flex; align-items:center; gap:6px;">
        <span style="font-weight:700; color:var(--grade-e);">Incident #1</span>
        <span style="font-weight:400; color:#cbd5e1;">(Strike 1)</span>
      </div>
      <div style="font-family:'Inter',sans-serif; font-size:12px; font-weight:400; color:#94a3b8; margin-top:3px;">Switched away from exam window (tab blur detected)</div>
    </div>
    <div style="font-family:'Inter',sans-serif; font-size:12px; font-weight:400; color:#94a3b8; white-space:nowrap;">
      10:24:18
    </div>
  </div>
  <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; gap:10px; box-sizing:border-box;">
    <div>
      <div style="font-family:'Inter',sans-serif; font-size:12px; display:flex; align-items:center; gap:6px;">
        <span style="font-weight:700; color:var(--grade-e);">Incident #2</span>
        <span style="font-weight:400; color:#cbd5e1;">(Strike 2)</span>
      </div>
      <div style="font-family:'Inter',sans-serif; font-size:12px; font-weight:400; color:#94a3b8; margin-top:3px;">Window focus lost for more than 5 seconds</div>
    </div>
    <div style="font-family:'Inter',sans-serif; font-size:12px; font-weight:400; color:#94a3b8; white-space:nowrap;">
      10:31:42
    </div>
  </div>
`;
modalHtmlL4 = modalHtmlL4.replace('<!-- Items injected dynamically -->', mockAlarms);
modalHtmlL4 = modalHtmlL4.replace('Student Name • 0 Alarms Recorded', 'Gilang Pratama • 2 Alarms Recorded • Theme G');

// 2. Window L5: Kick Modal
const startIdxL5 = jsContent.indexOf('<!-- Modal 4: Kick Student Confirmation Modal -->');
const endIdxL5 = jsContent.indexOf('<!-- Modal 5:', startIdxL5);
let modalHtmlL5 = jsContent.substring(startIdxL5, endIdxL5);
modalHtmlL5 = modalHtmlL5.replace('class="modal-backdrop hidden"', 'class="modal-backdrop"');
modalHtmlL5 = modalHtmlL5.replace('Student Name', 'Gilang Pratama • Theme G (General English)');

function createHarnessHtml(modalHtml, title) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <link rel="stylesheet" href="/css/style.css">
  <link rel="stylesheet" href="/css/admin/admin-layout.css">
  <link rel="stylesheet" href="/css/admin/admin-modals.css">
  <style>
    body {
      background: #060911;
      margin: 0;
      padding: 0;
      font-family: var(--fm-font-sans, 'Inter', sans-serif);
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      display: flex !important;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
  </style>
</head>
<body>
  ${modalHtml}
</body>
</html>
`;
}

const harnessPathL4 = path.join(scratchDir, 'harness_live_alarm_detail.html');
fs.writeFileSync(harnessPathL4, createHarnessHtml(modalHtmlL4, 'Alarm Detail Window Test Harness'));

const harnessPathL5 = path.join(scratchDir, 'harness_live_kick_confirm.html');
fs.writeFileSync(harnessPathL5, createHarnessHtml(modalHtmlL5, 'Kick Confirm Window Test Harness'));

// Start local HTTP server to serve CSS and harness
const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/harness_l4') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(harnessPathL4));
    return;
  }
  if (reqPath === '/harness_l5') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(harnessPathL5));
    return;
  }

  const filePath = path.join('d:/Drives/Tutor Tampan/TopsCore', reqPath);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    let contentType = 'text/plain';
    if (filePath.endsWith('.css')) contentType = 'text/css';
    if (filePath.endsWith('.js')) contentType = 'application/javascript';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(filePath));
    return;
  }
  res.writeHead(404);
  res.end('Not found');
});

server.listen(4123, async () => {
  console.log('Test harness server running at http://localhost:4123');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // 1. Capture L4
  const page4 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page4.goto('http://localhost:4123/harness_l4', { waitUntil: 'networkidle' });
  await page4.waitForTimeout(500);

  const modalBox4 = page4.locator('#modal-student-alarm-detail .modal-box');
  const screenshotPathL4 = path.join(artifactDir, 'live_room_04_alarm_detail_box_lowres.jpg');
  await modalBox4.screenshot({ path: screenshotPathL4, quality: 75, type: 'jpeg' });
  console.log('Saved Window L4 screenshot:', screenshotPathL4);
  await page4.close();

  // 2. Capture L5
  const page5 = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page5.goto('http://localhost:4123/harness_l5', { waitUntil: 'networkidle' });
  await page5.waitForTimeout(500);

  const modalBox5 = page5.locator('#modal-kick-student-confirm .modal-box');
  const screenshotPathL5 = path.join(artifactDir, 'live_room_05_kick_confirm_box_lowres.jpg');
  await modalBox5.screenshot({ path: screenshotPathL5, quality: 75, type: 'jpeg' });
  console.log('Saved Window L5 screenshot:', screenshotPathL5);
  await page5.close();

  await browser.close();
  server.close();
  console.log('Done capturing all modal screenshots!');
});
