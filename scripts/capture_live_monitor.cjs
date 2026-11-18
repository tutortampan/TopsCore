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
const startIdx = jsContent.indexOf('<!-- Modal 3: Live Test Session Monitor & Student Controller (Window L2) -->');
const endIdx = jsContent.indexOf('<!-- Modal 4: Kick Student Confirmation Modal -->', startIdx);
let modalHtml = jsContent.substring(startIdx, endIdx);

// Remove 'hidden' class from modal backdrop
modalHtml = modalHtml.replace('class="modal-backdrop hidden"', 'class="modal-backdrop"');

// Mock student rows in live monitor table
const mockRows = `
  <tr class="live-table-row" style="border-bottom:1px solid rgba(255,255,255,0.08); transition:background 0.15s ease;">
    <td style="padding:6px 4px; text-align:center; white-space:nowrap; font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.08);">
      EV-07
    </td>
    <td style="padding:6px 10px; text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; border-bottom:1px solid rgba(255,255,255,0.08);">
      <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:12px;">
        <span style="font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:#ffffff;">Ahmad Haekal Firdaus</span>
      </div>
    </td>
    <td style="padding:6px 6px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
      <span style="display:inline-flex; align-items:center; gap:6px; color:var(--grade-a); font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); text-shadow:none;">
        <span style="width:7px; height:7px; border-radius:50%; background:var(--grade-a); display:inline-block; flex-shrink:0;"></span>
        Actively Answering
      </span>
    </td>
    <td style="padding:6px 6px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
      <span style="font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:var(--grade-c); font-variant-numeric:tabular-nums; text-shadow:none;">
        45 / 70 (64%)
      </span>
    </td>
    <td style="padding:6px 6px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
      <span style="display:inline-flex; align-items:center; gap:6px; text-shadow:none;">
        <span class="grade-circle grade-circle-b" style="width:20px; height:20px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; background:var(--grade-b); color:#0f172a; flex-shrink:0; text-shadow:none;">
          B
        </span>
        <span style="font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:var(--grade-b); font-variant-numeric:tabular-nums; text-shadow:none;">
          82%
        </span>
      </span>
    </td>
    <td style="padding:6px 6px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
      <span style="font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:var(--grade-a); text-shadow:none;">
        0 Clean
      </span>
    </td>
    <td style="padding:6px 4px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
      <button type="button" class="btn-kick-student" style="background:transparent; border:none; padding:4px; color:var(--grade-e); cursor:pointer; display:inline-flex; align-items:center; justify-content:center;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="8.5" cy="7" r="4"></circle>
          <line x1="18" y1="8" x2="23" y2="13"></line>
          <line x1="23" y1="8" x2="18" y2="13"></line>
        </svg>
      </button>
    </td>
  </tr>

  <tr class="live-table-row" style="border-bottom:1px solid rgba(255,255,255,0.08); transition:background 0.15s ease;">
    <td style="padding:6px 4px; text-align:center; white-space:nowrap; font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.08);">
      EV-07
    </td>
    <td style="padding:6px 10px; text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; border-bottom:1px solid rgba(255,255,255,0.08);">
      <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:12px;">
        <span style="font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:#ffffff;">Aryadhewa Julian Firana</span>
      </div>
    </td>
    <td style="padding:6px 6px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
      <span style="display:inline-flex; align-items:center; gap:6px; color:var(--grade-a); font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); text-shadow:none;">
        <span style="width:7px; height:7px; border-radius:50%; background:var(--grade-a); display:inline-block; flex-shrink:0;"></span>
        Finished
      </span>
    </td>
    <td style="padding:6px 6px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
      <span style="font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:var(--grade-a); font-variant-numeric:tabular-nums; text-shadow:none;">
        70 / 70 (100%)
      </span>
    </td>
    <td style="padding:6px 6px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
      <span style="display:inline-flex; align-items:center; gap:6px; text-shadow:none;">
        <span class="grade-circle grade-circle-star" style="width:20px; height:20px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; background:var(--grade-star, #ff2d87); color:#0f172a; flex-shrink:0; text-shadow:none;">
          ★
        </span>
        <span style="font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:var(--grade-star, #ff2d87); font-variant-numeric:tabular-nums; text-shadow:none;">
          100%
        </span>
      </span>
    </td>
    <td style="padding:6px 6px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
      <span style="font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:var(--grade-a); text-shadow:none;">
        0 Clean
      </span>
    </td>
    <td style="padding:6px 4px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
      <button type="button" class="btn-kick-student" style="background:transparent; border:none; padding:4px; color:var(--grade-e); cursor:pointer; display:inline-flex; align-items:center; justify-content:center;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="8.5" cy="7" r="4"></circle>
          <line x1="18" y1="8" x2="23" y2="13"></line>
          <line x1="23" y1="8" x2="18" y2="13"></line>
        </svg>
      </button>
    </td>
  </tr>

  <tr class="live-table-row" style="border-bottom:1px solid rgba(255,255,255,0.08); transition:background 0.15s ease;">
    <td style="padding:6px 4px; text-align:center; white-space:nowrap; font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.08);">
      EV-07
    </td>
    <td style="padding:6px 10px; text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; border-bottom:1px solid rgba(255,255,255,0.08);">
      <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:12px;">
        <span style="font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:#ffffff;">Imam Azama</span>
      </div>
    </td>
    <td style="padding:6px 6px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
      <span style="display:inline-flex; align-items:center; gap:6px; color:var(--grade-e); font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); text-shadow:none;">
        <span style="width:7px; height:7px; border-radius:50%; background:var(--grade-e); display:inline-block; flex-shrink:0;"></span>
        Inactive 6m
      </span>
    </td>
    <td style="padding:6px 6px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
      <span style="font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:var(--grade-d); font-variant-numeric:tabular-nums; text-shadow:none;">
        20 / 70 (29%)
      </span>
    </td>
    <td style="padding:6px 6px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
      <span style="display:inline-flex; align-items:center; gap:6px; text-shadow:none;">
        <span class="grade-circle grade-circle-e" style="width:20px; height:20px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; background:var(--grade-e); color:#0f172a; flex-shrink:0; text-shadow:none;">
          E
        </span>
        <span style="font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:var(--grade-e); font-variant-numeric:tabular-nums; text-shadow:none;">
          40%
        </span>
      </span>
    </td>
    <td style="padding:6px 6px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
      <span style="font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:var(--grade-e); text-decoration:underline; cursor:pointer; text-shadow:none;">
        2x Alarm
      </span>
    </td>
    <td style="padding:6px 4px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
      <button type="button" class="btn-kick-student" style="background:transparent; border:none; padding:4px; color:var(--grade-e); cursor:pointer; display:inline-flex; align-items:center; justify-content:center;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="8.5" cy="7" r="4"></circle>
          <line x1="18" y1="8" x2="23" y2="13"></line>
          <line x1="23" y1="8" x2="18" y2="13"></line>
        </svg>
      </button>
    </td>
  </tr>
`;

modalHtml = modalHtml.replace('<tbody id="live-modal-table-body">\n                <!-- Populated dynamically -->\n              </tbody>', '<tbody id="live-modal-table-body">' + mockRows + '</tbody>');

// Update remaining time & counters
modalHtml = modalHtml.replace('<span id="tab-cnt-all">0</span>', '<span id="tab-cnt-all">3</span>');
modalHtml = modalHtml.replace('<span id="tab-cnt-in-progress">0</span>', '<span id="tab-cnt-in-progress">1</span>');
modalHtml = modalHtml.replace('<span id="tab-cnt-submitted">0</span>', '<span id="tab-cnt-submitted">1</span>');
modalHtml = modalHtml.replace('<span id="tab-cnt-alarm">0</span>', '<span id="tab-cnt-alarm">1</span>');
modalHtml = modalHtml.replace('<span id="live-modal-remaining" style="font-weight:800; font-variant-numeric:tabular-nums; color:#ffffff;">--m</span>', '<span id="live-modal-remaining" style="font-weight:800; font-variant-numeric:tabular-nums; color:#ffffff;">48m 12s</span>');
modalHtml = modalHtml.replace('LIVE TEST SESSION MONITOR', 'THEME G — GENERAL • LIVE MONITOR');
modalHtml = modalHtml.replace('Real-time Progress, Alarm &amp; Scoring', 'General Test • Batch EV-07 • Words &amp; Phrases Modules');

const fullHarness = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Live Monitor Window Test Harness</title>
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

const harnessPath = path.join(scratchDir, 'harness_live_monitor.html');
fs.writeFileSync(harnessPath, fullHarness);

const PORT = 6097;
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
    await page.goto('http://127.0.0.1:' + PORT + '/scratch/harness_live_monitor.html', { waitUntil: 'networkidle' });
    const box = await page.locator('.modal-box');
    const targetPath = path.join(artifactDir, 'live_room_02_live_monitor_box_lowres.jpg');
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
