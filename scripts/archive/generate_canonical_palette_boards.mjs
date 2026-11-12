import { chromium } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const artifactDir = 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece';

const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Unified Canonical TopsCore Colors</title>
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

  <!-- BOARD 1: STAR PINK 100% EXCLUSIVITY (GREEN BLEND PURGE) -->
  <div class="board-card" id="board-star-exclusivity">
    <div class="board-header">
      <div>
        <div class="board-title">🌸 1. Star 100% Exclusivity: Green Blend Purge in Avatar Ring</div>
        <div class="board-desc">Star Pink (#ff2d87) is strictly exclusive to 100% score; legacy green stops (#86efac, #006400) purged</div>
      </div>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Corrupted Blend)</span>
        <div style="display:flex; align-items:center; gap:16px;">
          <div style="width:64px; height:64px; border-radius:50%; background: linear-gradient(135deg, #86efac 0%, #ff2d87 45%, #006400 100%); display:flex; align-items:center; justify-content:center; box-shadow: 0 0 20px rgba(255,45,135,0.6);">
            <div style="width:54px; height:54px; border-radius:50%; background:#0f172a; display:flex; align-items:center; justify-content:center; font-size:24px;">
              👨‍🎓
            </div>
          </div>
          <div style="display:flex; flex-direction:column; gap:4px;">
            <span style="font-weight:800; font-size:14px; color:#ff2d87;">★ 100% EXCELLENT</span>
            <span style="font-size:11px; color:#f87171;">Flanked by #86efac (Mint) & #006400 (Green)</span>
          </div>
        </div>
        <div class="spec-label">Legacy stop: <strong>#86efac & #006400 flanking Star Pink #ff2d87</strong></div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Pure Electric Pink)</span>
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
        <div class="spec-label">Standardized: <strong>Pure Electric Pink (#ff2d87) 100% Star Exclusivity</strong></div>
      </div>
    </div>
  </div>

  <!-- BOARD 2: STUDENT GATE (SYSTEM BLUE ALIGNMENT) -->
  <div class="board-card" id="board-gate-blue">
    <div class="board-header">
      <div>
        <div class="board-title">🚪 2. Student Gate: In Line with Base System Blue (#38bdf8)</div>
        <div class="board-desc">Step circles and card outlines aligned to Tactical System Blue on dark navy canvas</div>
      </div>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Pink Badges)</span>
        <div style="width:100%; max-width:380px; background:rgba(255,45,135,0.05); border:1px solid rgba(255,45,135,0.35); border-radius:8px; padding:8px 12px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="width:22px; height:22px; border-radius:50%; background:rgba(255,45,135,0.2); color:#ff2d87; border:1px solid rgba(255,45,135,0.5); font-size:11px; font-weight:800; display:inline-flex; align-items:center; justify-content:center;">1</span>
            <span style="color:#f8fafc; font-size:12px; font-weight:700;">Institution : CEC</span>
          </div>
          <span style="color:#64748b; font-size:11px;">Change</span>
        </div>
        <div class="spec-label">Step circles used <strong>Star Pink #ff2d87</strong></div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Tactical System Blue)</span>
        <div style="width:100%; max-width:380px; background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.35); border-radius:8px; padding:8px 12px; display:flex; align-items:center; justify-content:space-between;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="width:22px; height:22px; border-radius:50%; background:rgba(56,189,248,0.2); color:#38bdf8; border:1px solid rgba(56,189,248,0.6); font-size:11px; font-weight:800; display:inline-flex; align-items:center; justify-content:center;">1</span>
            <span style="color:#f8fafc; font-size:12px; font-weight:700;">Institution : CEC</span>
          </div>
          <span style="color:#38bdf8; font-size:11px;">Change</span>
        </div>
        <div class="spec-label">Standardized: <strong>Tactical System Blue (#38bdf8)</strong> aligned with navy canvas</div>
      </div>
    </div>
  </div>

  <!-- BOARD 3: PROMOTION BUTTON (SYSTEM BLUE ALIGNMENT) -->
  <div class="board-card" id="board-promote-blue">
    <div class="board-header">
      <div>
        <div class="board-title">🚀 3. Student Roster: Promotion Action Button in Tactical Blue</div>
        <div class="board-desc">Action button in lower infobar aligned to base system blue (#0284c7 / #38bdf8)</div>
      </div>
    </div>
    <div class="comparison-grid">
      <!-- BEFORE -->
      <div class="col-box col-before">
        <span class="tag tag-before">BEFORE (Grade A Green)</span>
        <button style="background:#00c000; border:1px solid #00c000; color:#000; height:34px; padding:0 16px; font-size:13px; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:6px;">
          🚀 NEXT (Promote All Eligible)
        </button>
        <div class="spec-label">Button used <strong>Grade A Green #00c000</strong> with black text</div>
      </div>
      <!-- AFTER -->
      <div class="col-box col-after">
        <span class="tag tag-after">AFTER (Tactical Sky Blue)</span>
        <button style="background:#0284c7; border:1px solid #38bdf8; color:#fff; height:34px; padding:0 16px; font-size:13px; font-weight:700; border-radius:4px; display:inline-flex; align-items:center; gap:6px; box-shadow:0 0 14px rgba(56,189,248,0.35);">
          🚀 NEXT (Promote All Eligible)
        </button>
        <div class="spec-label">Standardized: <strong>Tactical Sky Blue (#0284c7) & Cyan (#38bdf8)</strong></div>
      </div>
    </div>
  </div>

  <!-- BOARD 4: SECTION 3.6 - DIPERTAHANKAN (KEPT AS IS) -->
  <div class="board-card" id="board-section-36-kept">
    <div class="board-header">
      <div>
        <div class="board-title">⏱️ 4. Section 3.6: Quick Add Time &amp; Vocab Vault (DIPERTAHANKAN / KEPT AS IS)</div>
        <div class="board-desc">Per user instruction ("bagian 3.6 biarkan"), Quick Add Time yellow banner &amp; Vocab Vault remain as they are</div>
      </div>
    </div>
    <div class="comparison-grid">
      <!-- KEPT AS IS -->
      <div class="col-box" style="background:#0f172a; border:1.5px solid #ffe600; grid-column: span 2;">
        <span class="tag" style="background:rgba(255,230,0,0.2); color:#ffe600; border:1px solid #ffe600;">STATUS: DIPERTAHANKAN (KEPT AS IS)</span>
        <div style="display:flex; align-items:center; justify-content:center; gap:20px; flex-wrap:wrap; margin-top:10px;">
          <div style="background:#ffe600; color:#000; font-weight:800; font-size:12px; padding:6px 14px; border-radius:4px; text-transform:uppercase;">
            ⏱️ Quick Add / Reduce Time
          </div>
          <div style="font-size:11px; font-weight:700; color:#FFFF00; border:1px solid #FFFF00; padding:3px 8px; border-radius:4px;">
            BP SETTING: 20 WORDS
          </div>
          <div style="font-size:11px; font-weight:800; color:#FFFF00;">
            TARGET WORDS (TH)
          </div>
        </div>
        <div class="spec-label" style="color:#ffe600;">Status: <strong>TIDAK DIUBAH (Kept as is per user directive)</strong></div>
      </div>
    </div>
  </div>

  <!-- BOARD 5: UNIFIED CANONICAL COLORS (MERAH FAIL, KUNING ENOUGH, HIJAU VERY GOOD) -->
  <div class="board-card" id="board-canonical-colors">
    <div class="board-header">
      <div>
        <div class="board-title">🎨 5. Unified System Colors: Merah Fail (#FF0000), Kuning Enough (#FFFF00), Green Very Good (#00C000)</div>
        <div class="board-desc">Using our authoritative brand colors directly without inventing artificial intermediary shades</div>
      </div>
    </div>
    <div class="comparison-grid">
      <!-- DEMO 1: MERAH FAIL (#FF0000) & KUNING ENOUGH (#FFFF00) -->
      <div class="col-box" style="background:#0f172a; border:1.5px solid rgba(255,0,0,0.4);">
        <span class="tag" style="background:rgba(255,0,0,0.2); color:#ff4d4d; border:1px solid #ff0000;">MERAH FAIL & KUNING ENOUGH</span>
        <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
          <button style="background:#FF0000; border:1px solid #FF0000; color:#fff; font-weight:700; font-size:12px; padding:6px 14px; border-radius:4px;">
            ⚠️ Permanent Purge / Delete (#FF0000)
          </button>
          <div style="font-size:12px; color:#FFFF00; font-weight:700;">
            ⚠️ High Latency Warning (#FFFF00)
          </div>
        </div>
        <div class="spec-label">Directly uses <strong>Merah Fail (#FF0000) & Kuning Enough (#FFFF00)</strong></div>
      </div>
      <!-- DEMO 2: GREEN VERY GOOD (#00C000) & SYSTEM BLUE (#38BDF8) -->
      <div class="col-box" style="background:#0f172a; border:1.5px solid rgba(0,192,0,0.4);">
        <span class="tag" style="background:rgba(0,192,0,0.2); color:#00e600; border:1px solid #00c000;">GREEN VERY GOOD & SYSTEM BLUE</span>
        <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <div style="width:8px; height:8px; border-radius:50%; background:#00c000; box-shadow:0 0 8px #00c000;"></div>
            <span style="font-size:12px; color:#00c000; font-weight:700;">● Online / Published (#00C000)</span>
          </div>
          <span style="background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid #38bdf8; font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px;">
            Tactical System Blue (#38BDF8)
          </span>
        </div>
        <div class="spec-label">Directly uses <strong>Green Very Good (#00c000ff) & System Blue (#38bdf8)</strong></div>
      </div>
    </div>
  </div>

</body>
</html>
`;

async function main() {
  const tmpHtml = path.join(artifactDir, 'canonical_palette_boards.html');
  fs.writeFileSync(tmpHtml, htmlTemplate, 'utf8');

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1040, height: 2100 },
    deviceScaleFactor: 2
  });
  const page = await context.newPage();

  console.log('Rendering canonical palette comparison boards...');
  await page.goto('file:///' + tmpHtml.replace(/\\/g, '/'), { waitUntil: 'load' });
  await page.waitForTimeout(600);

  // Capture master comparison board
  await page.screenshot({ path: path.join(artifactDir, 'comparison_master_canonical_palette.png'), fullPage: true });
  console.log('✔ comparison_master_canonical_palette.png captured');

  // Capture individual boards
  const boards = [
    { id: '#board-star-exclusivity', name: 'comparison_board_star_exclusivity.png' },
    { id: '#board-gate-blue', name: 'comparison_board_gate_blue.png' },
    { id: '#board-promote-blue', name: 'comparison_board_promote_blue.png' },
    { id: '#board-section-36-kept', name: 'comparison_board_section_36_kept.png' },
    { id: '#board-canonical-colors', name: 'comparison_board_canonical_colors.png' }
  ];

  for (const b of boards) {
    const el = page.locator(b.id);
    await el.screenshot({ path: path.join(artifactDir, b.name) });
    console.log(`✔ ${b.name} captured`);
  }

  await browser.close();
  console.log('🎉 All Canonical TopsCore Color Boards Rendered & Captured!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
