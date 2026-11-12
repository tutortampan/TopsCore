import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const artifactDir = 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece';

const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Palette Standardization Comparisons</title>
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
      padding: 20px;
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
      border: 1.5px dashed rgba(244, 63, 94, 0.4);
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
      color: #cbd5e1;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      text-align: center;
      margin-top: 6px;
    }

    /* Component 1: Promote Button */
    .btn-before-promote {
      background: #00c000;
      border: 1px solid #00c000;
      color: #000000;
      height: 34px;
      line-height: 34px;
      padding: 0 16px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-after-promote {
      background: #0284c7;
      border: 1px solid #38bdf8;
      color: #ffffff;
      height: 34px;
      line-height: 34px;
      padding: 0 16px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      box-shadow: 0 0 14px rgba(56, 189, 248, 0.35);
    }

    /* Component 2: Student Gate Step Cards */
    .gate-card {
      width: 100%;
      max-width: 480px;
      border-radius: 8px;
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 13px;
    }
    .gate-before {
      background: rgba(255, 45, 135, 0.05);
      border: 1px solid rgba(255, 45, 135, 0.35);
    }
    .gate-after {
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.35);
    }
    .step-circle-before {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(255, 45, 135, 0.2);
      color: #ff2d87;
      border: 1px solid rgba(255, 45, 135, 0.5);
      font-size: 11px;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .step-circle-after {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(56, 189, 248, 0.2);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.6);
      font-size: 11px;
      font-weight: 800;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    /* Component 3: Active Status Pill */
    .badge-before-active {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.04em;
      background: rgba(255, 45, 135, 0.1);
      color: #00c000;
      border: 1px solid rgba(255, 45, 135, 0.4);
    }
    .badge-after-active {
      display: inline-flex;
      align-items: center;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      background: rgba(56, 189, 248, 0.12);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
    }

    /* Component 4: Engines Active Lower Badge */
    .engine-before {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(0, 192, 0, 0.15);
      color: #00c000;
      border: 1px solid rgba(0, 192, 0, 0.35);
    }
    .engine-after {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 12px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(56, 189, 248, 0.12);
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.3);
      box-shadow: 0 0 10px rgba(56, 189, 248, 0.2);
    }

    /* Component 5: Topbar Active Tab & Status Dot */
    .tab-before {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 6px 14px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
    }
    .tab-val-before {
      color: #00c000ff;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .tab-after {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 6px;
      padding: 6px 14px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 600;
    }
    .tab-val-after {
      color: #38bdf8;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
    }
    .dot-before {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #00c000;
      box-shadow: 0 0 8px rgba(0, 192, 0, 0.8);
      display: inline-block;
    }
    .dot-after {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 8px rgba(56, 189, 248, 0.8);
      display: inline-block;
    }
  </style>
</head>
<body>

  <!-- BOARD 1: Promote Button -->
  <div class="board-card" id="board-promote-btn">
    <div class="board-header">
      <div>
        <div class="board-title">1. Student Roster: Promotion Action Button</div>
        <div class="board-desc">Action button in lower infobar used to promote eligible students</div>
      </div>
    </div>
    <div class="comparison-grid">
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <button class="btn-before-promote">🚀 NEXT (Promote All Eligible)</button>
        <div class="spec-label">bg: #00c000 (Grade A Green) | text: #000</div>
      </div>
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <button class="btn-after-promote">🚀 NEXT (Promote All Eligible)</button>
        <div class="spec-label">bg: #0284c7 | border: #38bdf8 | text: #fff</div>
      </div>
    </div>
  </div>

  <!-- BOARD 2: Student Gate Steps -->
  <div class="board-card" id="board-student-gate">
    <div class="board-header">
      <div>
        <div class="board-title">2. Student Gate: Authentication Step Flow</div>
        <div class="board-desc">Completed step cards and numbered badges in student sign-in portal</div>
      </div>
    </div>
    <div class="comparison-grid">
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <div class="gate-card gate-before">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="step-circle-before">1</span>
            <span style="color:#94a3b8;font-weight:600;">Institution</span>
            <span style="color:#f8fafc;font-weight:700;">: CEC</span>
          </div>
          <span style="color:#64748b;font-size:11px;">Change</span>
        </div>
        <div class="gate-card gate-before">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="step-circle-before">2</span>
            <span style="color:#94a3b8;font-weight:600;">Program</span>
            <span style="color:#f8fafc;font-weight:700;">: Camp</span>
          </div>
          <span style="color:#64748b;font-size:11px;">Change</span>
        </div>
        <div class="spec-label">badges: #ff2d87 (Grade Star Pink) | border: rgba(255,45,135,0.35)</div>
      </div>
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <div class="gate-card gate-after">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="step-circle-after">1</span>
            <span style="color:#94a3b8;font-weight:600;">Institution</span>
            <span style="color:#f8fafc;font-weight:700;">: CEC</span>
          </div>
          <span style="color:#38bdf8;font-size:11px;">Change</span>
        </div>
        <div class="gate-card gate-after">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="step-circle-after">2</span>
            <span style="color:#94a3b8;font-weight:600;">Program</span>
            <span style="color:#f8fafc;font-weight:700;">: Camp</span>
          </div>
          <span style="color:#38bdf8;font-size:11px;">Change</span>
        </div>
        <div class="spec-label">badges: #38bdf8 (Tactical Cyan) | border: rgba(56,189,248,0.35)</div>
      </div>
    </div>
  </div>

  <!-- BOARD 3: Active Status Badges -->
  <div class="board-card" id="board-active-badge">
    <div class="board-header">
      <div>
        <div class="board-title">3. System Status Badge: .badge-success &amp; .badge-tag-ongoing</div>
        <div class="board-desc">Status indicators on Institutions, Programs, and Classes</div>
      </div>
    </div>
    <div class="comparison-grid">
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <span class="badge-before-active">ACTIVE</span>
        <div class="spec-label">text: #00c000 (Grade A) | border: pinkish capsule</div>
      </div>
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <span class="badge-after-active">ACTIVE</span>
        <div class="spec-label">bg: rgba(56,189,248,0.12) | text &amp; border: #38bdf8</div>
      </div>
    </div>
  </div>

  <!-- BOARD 4: Lower Infobar Engines Status -->
  <div class="board-card" id="board-engine-status">
    <div class="board-header">
      <div>
        <div class="board-title">4. Modules Hub: Lower Infobar Status Indicator</div>
        <div class="board-desc">Global AI Engine active badge in bottom bar</div>
      </div>
    </div>
    <div class="comparison-grid">
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <span class="engine-before">● ALL ENGINES ACTIVE</span>
        <div class="spec-label">color: var(--grade-a, #00c000) (Grade A Green)</div>
      </div>
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <span class="engine-after">● ALL ENGINES ACTIVE</span>
        <div class="spec-label">color: #38bdf8 (Tactical Cyan) | glow: rgba(56,189,248,0.2)</div>
      </div>
    </div>
  </div>

  <!-- BOARD 5: Topbar Active Tab & Status Dot -->
  <div class="board-card" id="board-active-tab">
    <div class="board-header">
      <div>
        <div class="board-title">5. Topbar Tab &amp; Live Indicator Dot</div>
        <div class="board-desc">Active students metric tab and pulsing live dot</div>
      </div>
    </div>
    <div class="comparison-grid">
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Current State)</span>
        <div style="display:flex;align-items:center;gap:14px;">
          <div class="tab-before">
            <span>🟢 Active Students</span>
            <span class="tab-val-before">16</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#94a3b8;">
            <span class="dot-before"></span> Live
          </div>
        </div>
        <div class="spec-label">valColor: #00c000ff (Grade A) | dot: pulseGreen</div>
      </div>
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Proposed System UI)</span>
        <div style="display:flex;align-items:center;gap:14px;">
          <div class="tab-after">
            <span>🔹 Active Students</span>
            <span class="tab-val-after">16</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;font-size:12px;color:#94a3b8;">
            <span class="dot-after"></span> Live
          </div>
        </div>
        <div class="spec-label">valColor: #38bdf8 (Tactical Cyan) | dot: pulseTactical</div>
      </div>
    </div>
  </div>

</body>
</html>
`;

async function main() {
  const tmpHtml = path.join(artifactDir, 'palette_comparison_boards.html');
  fs.writeFileSync(tmpHtml, htmlTemplate, 'utf8');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1000, height: 1600 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('Rendering comparison boards HTML...');
  await page.goto('file:///' + tmpHtml.replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForTimeout(500);

  // Capture master comparison board
  await page.screenshot({ path: path.join(artifactDir, 'comparison_master_palette_matrix.png'), fullPage: true });
  console.log('✔ comparison_master_palette_matrix.png captured');

  // Capture each individual board for crystal clear slide embeddings
  const boards = [
    { id: '#board-promote-btn', name: 'comparison_promote_button.png' },
    { id: '#board-student-gate', name: 'comparison_student_gate.png' },
    { id: '#board-active-badge', name: 'comparison_active_badge.png' },
    { id: '#board-engine-status', name: 'comparison_engine_status.png' },
    { id: '#board-active-tab', name: 'comparison_active_tab.png' }
  ];

  for (const b of boards) {
    const el = page.locator(b.id);
    await el.screenshot({ path: path.join(artifactDir, b.name) });
    console.log(`✔ ${b.name} captured`);
  }

  await browser.close();
  console.log('🎉 All 5 side-by-side comparison boards rendered and captured!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
