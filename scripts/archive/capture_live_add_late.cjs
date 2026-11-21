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
const startIdx = jsContent.indexOf('<!-- Modal 2: Add Late Arrival Students to Live Session (Window L3) -->');
const endIdx = jsContent.indexOf('<!-- Modal 3:', startIdx);
let modalHtml = jsContent.substring(startIdx, endIdx);

// Remove 'hidden' class from modal backdrop
modalHtml = modalHtml.replace('class="modal-backdrop hidden"', 'class="modal-backdrop"');

// Mock student rows in late arrival table
const mockRows = `
  <tr style="border-bottom:1px solid rgba(255,255,255,0.08); transition:background 0.15s ease;">
    <td style="padding:6px 6px; text-align:center; border-bottom:1px solid rgba(255,255,255,0.08); width:40px;">
      <label style="display:flex; align-items:center; justify-content:center; gap:10px; cursor:pointer; margin:0;">
        <input type="checkbox" class="late-student-checkbox" value="s1" checked style="width:15px; height:15px; accent-color:var(--primary-tactical); cursor:pointer;">
        <span style="font-variant-numeric:tabular-nums; color:#94a3b8; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); font-size:12px;">1</span>
      </label>
    </td>
    <td style="padding:6px 10px; text-align:left; border-bottom:1px solid rgba(255,255,255,0.08); color:#ffffff; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); font-size:12px; white-space:nowrap;">
      Fauzan Al-Rasyid
    </td>
    <td style="padding:6px 8px; text-align:right; border-bottom:1px solid rgba(255,255,255,0.08); font-size:12px; white-space:nowrap; width:215px;">
      <span style="font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); font-size:12px; letter-spacing:0.02em; color:var(--grade-a); text-shadow:none;">
        Tasks Completed (Exam Ready)
      </span>
    </td>
  </tr>
  <tr style="border-bottom:1px solid rgba(255,255,255,0.08); transition:background 0.15s ease;">
    <td style="padding:6px 6px; text-align:center; border-bottom:1px solid rgba(255,255,255,0.08); width:40px;">
      <label style="display:flex; align-items:center; justify-content:center; gap:10px; cursor:pointer; margin:0;">
        <input type="checkbox" class="late-student-checkbox" value="s2" style="width:15px; height:15px; accent-color:var(--primary-tactical); cursor:pointer;">
        <span style="font-variant-numeric:tabular-nums; color:#94a3b8; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); font-size:12px;">2</span>
      </label>
    </td>
    <td style="padding:6px 10px; text-align:left; border-bottom:1px solid rgba(255,255,255,0.08); color:#ffffff; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); font-size:12px; white-space:nowrap;">
      Gilang Pratama
    </td>
    <td style="padding:6px 8px; text-align:right; border-bottom:1px solid rgba(255,255,255,0.08); font-size:12px; white-space:nowrap; width:215px;">
      <span style="font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); font-size:12px; letter-spacing:0.02em; color:var(--grade-e); text-shadow:none;">
        Incomplete Tasks (1/2)
      </span>
    </td>
  </tr>
`;

modalHtml = modalHtml.replace('<tbody id="late-modal-students-table-body">', '<tbody id="late-modal-students-table-body">' + mockRows);

modalHtml = modalHtml.replace('<span id="late-modal-remaining-time" style="color:var(--grade-c); font-weight:800; font-variant-numeric:tabular-nums;">-- Mins</span>', '<span id="late-modal-remaining-time" style="color:var(--grade-c); font-weight:800; font-variant-numeric:tabular-nums;">45 Mins</span>');
modalHtml = modalHtml.replace('Batch Name', 'Batch EV-07 • 2 Enrolled');
modalHtml = modalHtml.replace('<span id="late-modal-selected-count" style="color:var(--primary-tactical);">0</span>', '<span id="late-modal-selected-count" style="color:var(--primary-tactical);">1</span>');

const fullHarness = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Late Arrival Window Test Harness</title>
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

const harnessPath = path.join(scratchDir, 'harness_live_add_late.html');
fs.writeFileSync(harnessPath, fullHarness);

const PORT = 6096;
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
    await page.goto('http://127.0.0.1:' + PORT + '/scratch/harness_live_add_late.html', { waitUntil: 'networkidle' });
    const box = await page.locator('.modal-box');
    const targetPath = path.join(artifactDir, 'live_room_03_add_late_box_lowres.jpg');
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
