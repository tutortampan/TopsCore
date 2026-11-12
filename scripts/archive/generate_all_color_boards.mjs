import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const artifactDir = 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece';

const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Complete System UI Color Standardization Audit</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #060b18;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
      padding: 30px;
      display: flex;
      flex-direction: column;
      gap: 30px;
    }
    .board-card {
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
    }
    .board-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 12px;
    }
    .board-title {
      font-size: 16px;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: #f8fafc;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .board-desc {
      font-size: 13px;
      color: #94a3b8;
    }
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
    .col-box {
      border-radius: 8px;
      padding: 24px 20px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      min-height: 140px;
      justify-content: center;
      align-items: center;
      position: relative;
    }
    .col-before {
      background: #150d18;
      border: 1.5px dashed rgba(244, 63, 94, 0.45);
    }
    .col-after {
      background: #09172e;
      border: 1.5px solid rgba(56, 189, 248, 0.5);
      box-shadow: inset 0 0 20px rgba(56, 189, 248, 0.05);
    }
    .tag {
      position: absolute;
      top: 10px;
      left: 12px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .tag-before {
      background: rgba(239, 68, 68, 0.2);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
    }
    .tag-after {
      background: rgba(56, 189, 248, 0.2);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.5);
    }
    .spec-label {
      font-size: 12px;
      color: #94a3b8;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      text-align: center;
      margin-top: 4px;
    }
    .spec-label strong { color: #f8fafc; }
  </style>
</head>
<body>

  <!-- BOARD 1: YELLOW LEAKAGE AUDIT -->
  <div class="board-card" id="board-yellow">
    <div class="board-header">
      <div>
        <div class="board-title">🟡 1. Yellow Color Audit (Grade C #FFFF00 / #FFE600 vs System UI)</div>
        <div class="board-desc">Popovers, table headers, modal labels, and setting chips currently using Grade C Yellow</div>
      </div>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <!-- Time Edit Popover Banner -->
        <div style="background:#ffe600; color:#000; font-weight:800; font-size:12px; padding:6px 14px; border-radius:4px; text-transform:uppercase; letter-spacing:0.04em;">
          ⏱️ Quick Add / Reduce Time
        </div>
        <!-- Vocab Vault Setting Badge & Table Header -->
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:11px; font-weight:700; color:#FFFF00; border:1px solid #FFFF00; padding:3px 8px; border-radius:4px;">
            BP SETTING: 20 WORDS
          </span>
          <span style="font-size:11px; font-weight:800; color:#FFFF00; text-transform:uppercase;">
            TARGET WORDS (TH)
          </span>
        </div>
        <!-- Auto-Gen Modal Form Labels -->
        <div style="font-size:12px; color:#ffff00; font-weight:700;">
          * QUIZ ANSWER PHRASES &bull; FORM LABEL
        </div>
        <div class="spec-label">Grade C Yellow: <strong>#FFFF00, #FFE600</strong> leaked into chrome &amp; headers</div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <!-- Time Edit Popover Banner -->
        <div style="background:#0284c7; color:#fff; font-weight:700; font-size:12px; padding:6px 14px; border-radius:4px; border:1px solid #38bdf8; text-transform:uppercase; letter-spacing:0.04em; box-shadow:0 0 10px rgba(56,189,248,0.25);">
          ⏱️ Quick Add / Reduce Time
        </div>
        <!-- Vocab Vault Setting Badge & Table Header -->
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:11px; font-weight:700; color:#38bdf8; border:1px solid rgba(56,189,248,0.3); background:rgba(56,189,248,0.12); padding:3px 8px; border-radius:4px;">
            BP SETTING: 20 WORDS
          </span>
          <span style="font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase;">
            TARGET WORDS (TH)
          </span>
        </div>
        <!-- Auto-Gen Modal Form Labels -->
        <div style="font-size:12px; color:#f8fafc; font-weight:600;">
          Quiz Answer Phrases (Clean White Label)
        </div>
        <div class="spec-label">Replaced with: <strong>Tactical Blue (#0284c7), Cyan (#38bdf8), Slate (#94a3b8), White</strong></div>
      </div>
    </div>
  </div>

  <!-- BOARD 2: ORANGE LEAKAGE AUDIT -->
  <div class="board-card" id="board-orange">
    <div class="board-header">
      <div>
        <div class="board-title">🟠 2. Orange Color Audit (Grade D #FF8C00 vs System Amber #F59E0B)</div>
        <div class="board-desc">Draft test badges, upcoming batch chips, and WITA peak banners currently using Grade D Orange</div>
      </div>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="background:rgba(255,140,0,0.15); color:#FF8C00; border:1px solid rgba(255,140,0,0.35); font-size:11px; font-weight:700; padding:4px 10px; border-radius:4px;">
            DRAFT TEST
          </span>
          <span style="background:rgba(255,140,0,0.15); color:#FF8C00; border:1px solid rgba(255,140,0,0.35); font-size:11px; font-weight:700; padding:4px 10px; border-radius:4px;">
            🟠 UPCOMING BATCH
          </span>
        </div>
        <!-- Peak Hour Banner -->
        <div style="font-size:12px; font-weight:800; color:#FF8C00;">
          WITA Peak Hour: 20:00 WITA
        </div>
        <div class="spec-label">Grade D Orange: <strong>#FF8C00</strong> used on system tags &amp; analytics</div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="background:rgba(245,158,11,0.12); color:#fbbf24; border:1px solid rgba(245,158,11,0.3); font-size:11px; font-weight:700; padding:4px 10px; border-radius:4px;">
            DRAFT TEST
          </span>
          <span style="background:rgba(245,158,11,0.12); color:#fbbf24; border:1px solid rgba(245,158,11,0.3); font-size:11px; font-weight:700; padding:4px 10px; border-radius:4px;">
            🟡 UPCOMING BATCH
          </span>
        </div>
        <!-- Peak Hour Banner -->
        <div style="font-size:12px; font-weight:700; color:#fbbf24;">
          WITA Peak Hour: 20:00 WITA (System Amber)
        </div>
        <div class="spec-label">Standardized to: <strong>System Amber (#fbbf24 / #f59e0b)</strong>, fully decoupled from Grade D</div>
      </div>
    </div>
  </div>

  <!-- BOARD 3: RED LEAKAGE AUDIT -->
  <div class="board-card" id="board-red">
    <div class="board-header">
      <div>
        <div class="board-title">🔴 3. Red Color Audit (Grade E #FF0000 vs System Crimson #EF4444)</div>
        <div class="board-desc">Destructive confirmation modals, purge alerts, and required form asterisks</div>
      </div>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <div style="background:#FF0000; color:#fff; font-weight:800; font-size:12px; padding:6px 14px; border-radius:4px; text-transform:uppercase;">
          ⚠️ Permanent Purge Warning
        </div>
        <div style="font-size:13px; color:#f8fafc;">
          Full Name <span style="color:#FF0000; font-weight:800; font-size:15px;">*</span> &bull; Required Asterisk
        </div>
        <div style="background:rgba(255,0,0,0.12); color:#ff0000; border:1px solid #ff0000; font-size:11px; font-weight:700; padding:4px 8px; border-radius:4px;">
          ARCHIVED TEST (GRADE E RED)
        </div>
        <div class="spec-label">Grade E Fail Red: <strong>#FF0000</strong> used on system modals &amp; forms</div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <div style="background:#dc2626; color:#fff; font-weight:700; font-size:12px; padding:6px 14px; border-radius:4px; border:1px solid #ef4444; text-transform:uppercase; box-shadow:0 0 12px rgba(239,68,68,0.3);">
          ⚠️ Permanent Purge Warning
        </div>
        <div style="font-size:13px; color:#f8fafc;">
          Full Name <span style="color:#f43f5e; font-weight:700; font-size:14px;">*</span> &bull; System Rose Asterisk
        </div>
        <div style="background:rgba(100,116,139,0.12); color:#94a3b8; border:1px solid rgba(100,116,139,0.25); font-size:11px; font-weight:700; padding:4px 8px; border-radius:4px;">
          ARCHIVED TEST (NEUTRAL SLATE)
        </div>
        <div class="spec-label">Standardized to: <strong>System Crimson (#ef4444) &amp; Neutral Slate (#94a3b8)</strong></div>
      </div>
    </div>
  </div>

  <!-- BOARD 4: GREEN LEAKAGE AUDIT -->
  <div class="board-card" id="board-green">
    <div class="board-header">
      <div>
        <div class="board-title">🟢 4. Green Color Audit (Grade A #00C000 vs Tactical Blue #0284C7 / #38BDF8)</div>
        <div class="board-desc">Roster promotion buttons, live dots, and status badges</div>
      </div>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <button style="background:#00c000; border:1px solid #00c000; color:#000; height:34px; padding:0 16px; font-size:13px; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:6px;">
          🚀 NEXT (Promote All Eligible)
        </button>
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="background:rgba(0,192,0,0.15); color:#00c000ff; border:1px solid rgba(0,192,0,0.35); font-size:11px; font-weight:700; padding:4px 10px; border-radius:4px;">
            ● ALL ENGINES ACTIVE
          </span>
          <span style="color:#00c000; font-size:13px; font-weight:700;">🟢 Active: 16</span>
        </div>
        <div class="spec-label">Grade A Green: <strong>#00c000</strong> used on system buttons, badges &amp; dots</div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <button style="background:#0284c7; border:1px solid #38bdf8; color:#fff; height:34px; padding:0 16px; font-size:13px; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 0 14px rgba(56,189,248,0.35);">
          🚀 NEXT (Promote All Eligible)
        </button>
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); font-size:11px; font-weight:700; padding:4px 10px; border-radius:4px; box-shadow:0 0 10px rgba(56,189,248,0.2);">
            ● ALL ENGINES ACTIVE
          </span>
          <span style="color:#38bdf8; font-size:13px; font-weight:700;">🔹 Active: 16</span>
        </div>
        <div class="spec-label">Standardized to: <strong>Tactical Sky Blue (#0284c7) &amp; Cyan (#38bdf8)</strong></div>
      </div>
    </div>
  </div>

  <!-- BOARD 5: PINK LEAKAGE AUDIT -->
  <div class="board-card" id="board-pink">
    <div class="board-header">
      <div>
        <div class="board-title">🌸 5. Pink Color Audit (Grade Star #FF2D87 vs Tactical Indigo &amp; Blue)</div>
        <div class="board-desc">Student gate steps, desk health borders, and non-100% star badges</div>
      </div>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <div style="width:100%; max-width:380px; background:rgba(255,45,135,0.05); border:1px solid rgba(255,45,135,0.35); border-radius:8px; padding:8px 12px; display:flex; align-items:center; gap:10px;">
          <span style="width:22px; height:22px; border-radius:50%; background:rgba(255,45,135,0.2); color:#ff2d87; border:1px solid rgba(255,45,135,0.5); font-size:11px; font-weight:800; display:inline-flex; align-items:center; justify-content:center;">1</span>
          <span style="color:#94a3b8; font-size:12px; font-weight:600;">Student Gate Step Card</span>
        </div>
        <div style="border-left:3px solid #ff2d87; padding-left:10px; font-size:12px; color:#ff2d87; font-weight:700;">
          Desk Recalculation Metric Card Border
        </div>
        <div class="spec-label">Grade Star Pink: <strong>#ff2d87</strong> leaked into sign-in gate &amp; admin cards</div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <div style="width:100%; max-width:380px; background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.35); border-radius:8px; padding:8px 12px; display:flex; align-items:center; gap:10px;">
          <span style="width:22px; height:22px; border-radius:50%; background:rgba(56,189,248,0.2); color:#38bdf8; border:1px solid rgba(56,189,248,0.6); font-size:11px; font-weight:800; display:inline-flex; align-items:center; justify-content:center;">1</span>
          <span style="color:#f8fafc; font-size:12px; font-weight:600;">Student Gate Step Card</span>
        </div>
        <div style="border-left:3px solid #6366f1; padding-left:10px; font-size:12px; color:#818cf8; font-weight:700;">
          Desk Recalculation Metric (Brand Indigo #6366f1)
        </div>
        <div class="spec-label">Standardized to: <strong>Tactical Blue (#38bdf8) &amp; Tactical Indigo (#6366f1)</strong></div>
      </div>
    </div>
  </div>

</body>
</html>
`;

async function main() {
  const tmpHtml = path.join(artifactDir, 'all_color_boards.html');
  fs.writeFileSync(tmpHtml, htmlTemplate, 'utf8');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1040, height: 2100 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('Rendering all color comparison boards...');
  await page.goto('file:///' + tmpHtml.replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForTimeout(600);

  // Capture master comparison board
  await page.screenshot({ path: path.join(artifactDir, 'comparison_master_all_domains.png'), fullPage: true });
  console.log('✔ comparison_master_all_domains.png captured');

  // Capture individual boards
  const boards = [
    { id: '#board-yellow', name: 'comparison_board_yellow_leakage.png' },
    { id: '#board-orange', name: 'comparison_board_orange_leakage.png' },
    { id: '#board-red', name: 'comparison_board_red_leakage.png' },
    { id: '#board-green', name: 'comparison_board_green_leakage.png' },
    { id: '#board-pink', name: 'comparison_board_pink_leakage.png' }
  ];

  for (const b of boards) {
    const el = page.locator(b.id);
    await el.screenshot({ path: path.join(artifactDir, b.name) });
    console.log(`✔ ${b.name} captured`);
  }

  await browser.close();
  console.log('🎉 Complete 5-Color Domain Audit Boards rendered and captured!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
