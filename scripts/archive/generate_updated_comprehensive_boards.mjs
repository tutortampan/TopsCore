import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const artifactDir = 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece';

const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Updated Cross-Realm Color Standardization Boards</title>
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

  <!-- BOARD 1: STAR 100% AVATAR CONTAINER (GREEN BLEND PURGE) -->
  <div class="board-card" id="board-star-avatar">
    <div class="board-header">
      <div>
        <div class="board-title">🌸 1. Star 100% Avatar Container: Legacy Green Blend Purge</div>
        <div class="board-desc">Dashboard & Result Review avatar rings when student achieves a perfect 100% score</div>
      </div>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="width:64px; height:64px; border-radius:50%; background: linear-gradient(135deg, #86efac 0%, #ff2d87 45%, #006400 100%); display:flex; align-items:center; justify-content:center; box-shadow: 0 0 20px rgba(255,45,135,0.6);">
            <div style="width:54px; height:54px; border-radius:50%; background:#0f172a; display:flex; align-items:center; justify-content:center; font-size:24px;">
              👨‍🎓
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <span style="font-weight:800; font-size:14px; color:#ff2d87;">★ 100% EXCELLENT</span>
            <span style="font-size:11px; color:#f87171;">Flanked by #86efac (Mint) & #006400 (Dark Green)</span>
          </div>
        </div>
        <div class="spec-label">Legacy defect: <strong>Electric Pink #ff2d87 corrupted by green gradient stops</strong></div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="width:64px; height:64px; border-radius:50%; background: linear-gradient(135deg, #ff2d87 0%, #be185d 100%); display:flex; align-items:center; justify-content:center; box-shadow: 0 0 25px rgba(255,45,135,0.85), 0 0 45px rgba(255,45,135,0.4);">
            <div style="width:54px; height:54px; border-radius:50%; background:#0f172a; display:flex; align-items:center; justify-content:center; font-size:24px;">
              👨‍🎓
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <span style="font-weight:800; font-size:14px; color:#ff2d87;">★ 100% EXCELLENT</span>
            <span style="font-size:11px; color:#38bdf8;">Pure Electric Pink Gradient (#ff2d87 → #be185d)</span>
          </div>
        </div>
        <div class="spec-label">Standardized: <strong>Pure Electric Pink (#ff2d87) Star Exclusivity (Zero Green)</strong></div>
      </div>
    </div>
  </div>

  <!-- BOARD 2: TEST RUNNER CONTROLS & AUDIO WAVE BARS -->
  <div class="board-card" id="board-test-runner">
    <div class="board-header">
      <div>
        <div class="board-title">🎙️ 2. Test Runner: Audio Recording Wave Bars & Pacing Badges</div>
        <div class="board-desc">Speech recording visualizer and time pacing chips in active test session</div>
      </div>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <div style="display:flex; align-items:center; gap:6px; height:32px;">
          <div style="width:4px; height:24px; background:#FF0000; border-radius:2px;"></div>
          <div style="width:4px; height:32px; background:#FF0000; border-radius:2px;"></div>
          <div style="width:4px; height:18px; background:#FF0000; border-radius:2px;"></div>
          <div style="width:4px; height:28px; background:#FF0000; border-radius:2px;"></div>
          <span style="font-size:12px; color:#FF0000; font-weight:700; margin-left:6px;">Recording...</span>
        </div>
        <div style="display:flex; gap:8px;">
          <span style="background:rgba(0,192,0,0.15); color:#00c000ff; border:1px solid #00c000ff; font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px;">Comfortable</span>
          <span style="background:rgba(255,255,0,0.15); color:#FFFF00; border:1px solid #FFFF00; font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px;">Moderate</span>
        </div>
        <div class="spec-label">Audio waves use <strong>Grade E Fail Red (#FF0000)</strong>; pacing uses Grade A & C</div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <div style="display:flex; align-items:center; gap:6px; height:32px;">
          <div style="width:4px; height:24px; background:#ef4444; border-radius:2px; box-shadow:0 0 6px rgba(239,68,68,0.5);"></div>
          <div style="width:4px; height:32px; background:#ef4444; border-radius:2px; box-shadow:0 0 8px rgba(239,68,68,0.5);"></div>
          <div style="width:4px; height:18px; background:#ef4444; border-radius:2px; box-shadow:0 0 6px rgba(239,68,68,0.5);"></div>
          <div style="width:4px; height:28px; background:#ef4444; border-radius:2px; box-shadow:0 0 8px rgba(239,68,68,0.5);"></div>
          <span style="font-size:12px; color:#ef4444; font-weight:700; margin-left:6px;">Recording...</span>
        </div>
        <div style="display:flex; gap:8px;">
          <span style="background:rgba(16,185,129,0.12); color:#10b981; border:1px solid rgba(16,185,129,0.3); font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px;">Comfortable</span>
          <span style="background:rgba(245,158,11,0.12); color:#fbbf24; border:1px solid rgba(245,158,11,0.3); font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px;">Moderate</span>
        </div>
        <div class="spec-label">Standardized: <strong>System Crimson (#ef4444) waves; System Emerald & Amber pacing</strong></div>
      </div>
    </div>
  </div>

  <!-- BOARD 3: WITA PEAK HOUR & TRAFFIC HEATMAP -->
  <div class="board-card" id="board-wita-peak">
    <div class="board-header">
      <div>
        <div class="board-title">📊 3. Analytics & Telemetry: WITA Peak Hour Histogram</div>
        <div class="board-desc">24-hour student exam submission peak traffic bars and telemetry banner</div>
      </div>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
          <div style="font-size:13px; font-weight:800; color:#ff8c00;">🔥 WITA Peak Hour: 20:00 WITA</div>
          <div style="display:flex; align-items:flex-end; gap:6px; height:45px;">
            <div style="width:14px; height:18px; background:#38bdf8; border-radius:2px;"></div>
            <div style="width:14px; height:26px; background:#38bdf8; border-radius:2px;"></div>
            <div style="width:14px; height:45px; background:linear-gradient(180deg, #ff8c00 0%, #c2410c 100%); border-radius:2px; box-shadow:0 0 8px rgba(255,140,0,0.5);"></div>
            <div style="width:14px; height:22px; background:#38bdf8; border-radius:2px;"></div>
          </div>
        </div>
        <div class="spec-label">Histogram peak bars use <strong>Grade D Orange (#ff8c00)</strong></div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <div style="display:flex; flex-direction:column; align-items:center; gap:6px;">
          <div style="font-size:13px; font-weight:700; color:#fbbf24;">⚡ WITA Peak Hour: 20:00 WITA (System Amber)</div>
          <div style="display:flex; align-items:flex-end; gap:6px; height:45px;">
            <div style="width:14px; height:18px; background:#38bdf8; border-radius:2px;"></div>
            <div style="width:14px; height:26px; background:#38bdf8; border-radius:2px;"></div>
            <div style="width:14px; height:45px; background:linear-gradient(180deg, #f59e0b 0%, #d97706 100%); border-radius:2px; box-shadow:0 0 10px rgba(245,158,11,0.4);"></div>
            <div style="width:14px; height:22px; background:#38bdf8; border-radius:2px;"></div>
          </div>
        </div>
        <div class="spec-label">Standardized: <strong>System Amber (#f59e0b / #fbbf24)</strong> decoupled from Grade D</div>
      </div>
    </div>
  </div>

  <!-- BOARD 4: DUPLICATE RESOLVERS & FORM ASTERISKS -->
  <div class="board-card" id="board-modals-asterisks">
    <div class="board-header">
      <div>
        <div class="board-title">🛡️ 4. Admin Modals: Duplicate Resolver Rows & Required Asterisks</div>
        <div class="board-desc">Primary candidate rows in merge resolvers and mandatory form field indicators</div>
      </div>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <div style="width:100%; max-width:380px; background:rgba(255,45,135,0.12); border:1px solid rgba(255,45,135,0.4); border-radius:6px; padding:6px 12px; display:flex; align-items:center; justify-content:space-between;">
          <span style="font-size:12px; color:#ff2d87; font-weight:700;">★ Primary Candidate Row</span>
          <span style="font-size:11px; background:#ff2d87; color:#fff; padding:2px 6px; border-radius:3px;">Keep</span>
        </div>
        <div style="font-size:13px; color:#f8fafc;">
          Student Full Name <span style="color:#FF0000; font-weight:800; font-size:15px;">*</span> &bull; PIN <span style="color:#FF0000; font-weight:800; font-size:15px;">*</span>
        </div>
        <div class="spec-label">Resolver row turns <strong>Electric Pink</strong>; asterisks use Grade E Red</div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <div style="width:100%; max-width:380px; background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.35); border-radius:6px; padding:6px 12px; display:flex; align-items:center; justify-content:space-between;">
          <span style="font-size:12px; color:#10b981; font-weight:700;">✔ Primary Candidate Row</span>
          <span style="font-size:11px; background:#10b981; color:#0f172a; font-weight:800; padding:2px 6px; border-radius:3px;">Keep</span>
        </div>
        <div style="font-size:13px; color:#f8fafc;">
          Student Full Name <span style="color:#f43f5e; font-weight:700; font-size:14px;">*</span> &bull; PIN <span style="color:#f43f5e; font-weight:700; font-size:14px;">*</span>
        </div>
        <div class="spec-label">Standardized: <strong>System Emerald (#10b981) row; System Rose (#f43f5e) asterisk</strong></div>
      </div>
    </div>
  </div>

  <!-- BOARD 5: TEST TIME POPOVERS & VOCAB VAULT -->
  <div class="board-card" id="board-popover-vault">
    <div class="board-header">
      <div>
        <div class="board-title">⏱️ 5. Test Access & Vocab Vault: Banners & Table Headers</div>
        <div class="board-desc">Quick add/reduce time popover banners and vocabulary blueprint setting chips</div>
      </div>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <div style="background:#ffe600; color:#000; font-weight:800; font-size:12px; padding:6px 14px; border-radius:4px; text-transform:uppercase;">
          ⏱️ Quick Add / Reduce Time
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:11px; font-weight:700; color:#FFFF00; border:1px solid #FFFF00; padding:3px 8px; border-radius:4px;">
            BP SETTING: 20 WORDS
          </span>
          <span style="font-size:11px; font-weight:800; color:#FFFF00;">TARGET (TH)</span>
        </div>
        <div class="spec-label">Grade C Yellow: <strong>#FFFF00 & #FFE600</strong> leaked into chrome & headers</div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <div style="background:#0284c7; color:#fff; font-weight:700; font-size:12px; padding:6px 14px; border-radius:4px; border:1px solid #38bdf8; text-transform:uppercase; box-shadow:0 0 10px rgba(56,189,248,0.25);">
          ⏱️ Quick Add / Reduce Time
        </div>
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:11px; font-weight:700; color:#38bdf8; border:1px solid rgba(56,189,248,0.3); background:rgba(56,189,248,0.12); padding:3px 8px; border-radius:4px;">
            BP SETTING: 20 WORDS
          </span>
          <span style="font-size:11px; font-weight:700; color:#94a3b8;">TARGET (TH)</span>
        </div>
        <div class="spec-label">Standardized: <strong>Tactical Blue (#0284c7), Cyan (#38bdf8), Slate (#94a3b8)</strong></div>
      </div>
    </div>
  </div>

  <!-- BOARD 6: PROMOTION BUTTON & LIVE TELEMETRY DOT -->
  <div class="board-card" id="board-promote-telemetry">
    <div class="board-header">
      <div>
        <div class="board-title">🚀 6. Student Roster: Promotion Action Button & Live Telemetry</div>
        <div class="board-desc">Action button in lower infobar used to promote eligible students and live pulse dot</div>
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
          <span style="color:#00c000; font-size:13px; font-weight:700;">🟢 Active: 16 Students</span>
          <div style="width:8px; height:8px; border-radius:50%; background:#00c000; box-shadow:0 0 8px rgba(0,192,0,0.8);"></div>
        </div>
        <div class="spec-label">Grade A Green: <strong>#00c000</strong> used on system buttons and live dots</div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <button style="background:#0284c7; border:1px solid #38bdf8; color:#fff; height:34px; padding:0 16px; font-size:13px; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 0 14px rgba(56,189,248,0.35);">
          🚀 NEXT (Promote All Eligible)
        </button>
        <div style="display:flex; align-items:center; gap:12px;">
          <span style="color:#38bdf8; font-size:13px; font-weight:700;">🔹 Active: 16 Students</span>
          <div style="width:8px; height:8px; border-radius:50%; background:#38bdf8; box-shadow:0 0 8px rgba(56,189,248,0.8);"></div>
        </div>
        <div class="spec-label">Standardized: <strong>Tactical Sky Blue (#0284c7) & Cyan (#38bdf8)</strong></div>
      </div>
    </div>
  </div>

  <!-- BOARD 7: STUDENT GATE STEP FLOW -->
  <div class="board-card" id="board-student-gate-flow">
    <div class="board-header">
      <div>
        <div class="board-title">🚪 7. Student Gate: Authentication Step Flow</div>
        <div class="board-desc">Completed step cards and numbered badges in student sign-in portal</div>
      </div>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <div style="width:100%; max-width:380px; background:rgba(255,45,135,0.05); border:1px solid rgba(255,45,135,0.35); border-radius:8px; padding:8px 12px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="width:22px; height:22px; border-radius:50%; background:rgba(255,45,135,0.2); color:#ff2d87; border:1px solid rgba(255,45,135,0.5); font-size:11px; font-weight:800; display:inline-flex; align-items:center; justify-content:center;">1</span>
            <span style="color:#f8fafc; font-size:12px; font-weight:700;">Institution : CEC</span>
          </div>
          <span style="color:#64748b; font-size:11px;">Change</span>
        </div>
        <div class="spec-label">Step circles use <strong>Grade Star Pink (#ff2d87)</strong></div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <div style="width:100%; max-width:380px; background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.35); border-radius:8px; padding:8px 12px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="width:22px; height:22px; border-radius:50%; background:rgba(56,189,248,0.2); color:#38bdf8; border:1px solid rgba(56,189,248,0.6); font-size:11px; font-weight:800; display:inline-flex; align-items:center; justify-content:center;">1</span>
            <span style="color:#f8fafc; font-size:12px; font-weight:700;">Institution : CEC</span>
          </div>
          <span style="color:#38bdf8; font-size:11px;">Change</span>
        </div>
        <div class="spec-label">Standardized: <strong>Tactical System Blue (#38bdf8)</strong> aligned with Navy canvas</div>
      </div>
    </div>
  </div>

</body>
</html>
`;

async function main() {
  const tmpHtml = path.join(artifactDir, 'updated_comprehensive_boards.html');
  fs.writeFileSync(tmpHtml, htmlTemplate, 'utf8');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1040, height: 2800 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('Rendering all updated comprehensive boards...');
  await page.goto('file:///' + tmpHtml.replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForTimeout(600);

  // Capture master comparison board
  await page.screenshot({ path: path.join(artifactDir, 'comparison_master_updated_comprehensive.png'), fullPage: true });
  console.log('✔ comparison_master_updated_comprehensive.png captured');

  // Capture individual boards
  const boards = [
    { id: '#board-star-avatar', name: 'comparison_board_star_avatar.png' },
    { id: '#board-test-runner', name: 'comparison_board_test_runner.png' },
    { id: '#board-wita-peak', name: 'comparison_board_wita_peak.png' },
    { id: '#board-modals-asterisks', name: 'comparison_board_modals_asterisks.png' },
    { id: '#board-popover-vault', name: 'comparison_board_popover_vault.png' },
    { id: '#board-promote-telemetry', name: 'comparison_board_promote_telemetry.png' },
    { id: '#board-student-gate-flow', name: 'comparison_board_student_gate_flow.png' }
  ];

  for (const b of boards) {
    const el = page.locator(b.id);
    await el.screenshot({ path: path.join(artifactDir, b.name) });
    console.log(`✔ ${b.name} captured`);
  }

  await browser.close();
  console.log('🎉 All 7 Detailed Before vs After Boards Rendered & Captured!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
