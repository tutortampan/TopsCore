import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BRAIN_DIR = 'C:/Users/Top/.gemini/antigravity/brain/e109f303-e1a5-4e34-b57b-3d40f829c347';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1200, height: 1100 } });
  const page = await context.newPage();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  :root {
    --grade-a: #00c000;
    --grade-c: #ffff00;
    --grade-e: #ff0000;
    --fm-bg-main: #090D16;
    --fm-bg-panel: #0F172A;
    --fm-border-subtle: rgba(255, 255, 255, 0.08);
  }
  body {
    margin: 0;
    padding: 30px;
    background: #090D16;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #fff;
    display: flex;
    flex-direction: column;
    gap: 28px;
    box-sizing: border-box;
  }
  .proposal-header {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 16px;
  }
  .proposal-header h1 {
    margin: 0 0 6px 0;
    font-size: 1.4rem;
    font-weight: 800;
    color: #f8fafc;
  }
  .proposal-header p {
    margin: 0;
    font-size: 0.85rem;
    color: #94a3b8;
  }

  .section-block {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .section-tag {
    font-size: 0.76rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 4px;
    width: fit-content;
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.35);
    color: #38bdf8;
  }

  /* 1. MULTI-THEME UNIFIED READINESS MATRIX */
  .matrix-wrapper {
    background: #0F172A;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    overflow: hidden;
  }
  .matrix-header-bar {
    padding: 10px 16px;
    background: #131E35;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .matrix-title {
    font-size: 0.88rem;
    font-weight: 800;
    color: #ffffff;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .matrix-badge-all {
    font-size: 0.7rem;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(0, 192, 0, 0.12);
    border: 1px solid rgba(0, 192, 0, 0.3);
    color: #86efac;
  }
  .matrix-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
  }
  .matrix-table th {
    background: #18243E;
    color: #94a3b8;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    padding: 8px 10px;
    text-align: center;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }
  .matrix-table td {
    padding: 7px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    text-align: center;
  }
  .chip-pass {
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.35);
    color: #38bdf8;
    font-weight: 800;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-block;
  }
  .chip-ready {
    background: rgba(0, 192, 0, 0.12);
    border: 1px solid rgba(0, 192, 0, 0.35);
    color: #86efac;
    font-weight: 800;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-block;
  }
  .chip-incomp {
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    font-weight: 600;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 4px;
    display: inline-block;
  }

  /* 2. SPACIOUS SESSION WIZARD MODAL */
  .modal-demo {
    width: 760px;
    background: #0B1120;
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 12px;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .modal-top {
    padding: 14px 20px;
    background: #111B2E;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .modal-top-title {
    font-size: 1.1rem;
    font-weight: 800;
    color: #ffffff;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .modal-grid-2col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    padding: 16px 20px 10px 20px;
  }
  .form-group label {
    font-size: 11.5px;
    font-weight: 700;
    color: #cbd5e1;
    margin-bottom: 5px;
    display: block;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .input-styled {
    width: 100%;
    box-sizing: border-box;
    background: #141E33;
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #fff;
    padding: 7px 10px;
    border-radius: 6px;
    font-size: 12px;
  }
  .auto-duration-pill {
    margin-top: 5px;
    font-size: 11px;
    font-weight: 700;
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.1);
    border: 1px solid rgba(56, 189, 248, 0.25);
    padding: 3px 8px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  /* Answering Mode Selector */
  .mode-selector-block {
    padding: 0 20px 12px 20px;
  }
  .mode-selector-title {
    font-size: 11.5px;
    font-weight: 700;
    color: #cbd5e1;
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .mode-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .mode-card {
    background: #111A2D;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .mode-card-header {
    font-size: 11.5px;
    font-weight: 800;
    color: #f8fafc;
    display: flex;
    justify-content: space-between;
  }
  .mode-pills-row {
    display: flex;
    gap: 5px;
  }
  .mode-pill {
    flex: 1;
    font-size: 11px;
    font-weight: 700;
    padding: 4px 6px;
    border-radius: 4px;
    text-align: center;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.03);
    color: #94a3b8;
    cursor: pointer;
  }
  .mode-pill.active {
    background: rgba(56, 189, 248, 0.14);
    border-color: #38bdf8;
    color: #38bdf8;
  }

  /* Students Section */
  .students-section {
    padding: 0 20px 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .students-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .btn-mini {
    font-size: 11px;
    font-weight: 700;
    padding: 4px 10px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.15);
    background: #1e293b;
    color: #cbd5e1;
    cursor: pointer;
  }
  .students-table-wrap {
    max-height: 180px;
    overflow-y: auto;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    background: #090F1C;
  }
  .student-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    font-size: 12px;
  }

  /* 3. CARD REFINEMENT */
  .card-refined {
    width: 380px;
    background: #0F172A;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-top: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 8px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  }
  .card-refined-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .code-badge {
    font-size: 11px;
    font-weight: 800;
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.1);
    border: 1px solid rgba(56, 189, 248, 0.25);
    padding: 2px 7px;
    border-radius: 4px;
    font-family: monospace;
  }
  .card-refined-title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .card-refined-title {
    font-size: 13.5px;
    font-weight: 800;
    color: #ffffff;
    letter-spacing: -0.01em;
  }
  .card-refined-sub {
    font-size: 11.5px;
    color: #94a3b8;
  }
  .ready-chip-clean {
    font-size: 11px;
    font-weight: 700;
    color: var(--grade-c);
    background: rgba(255, 255, 0, 0.06);
    border: 1px solid rgba(255, 255, 0, 0.35);
    padding: 2px 7px;
    border-radius: 4px;
  }
  .action-row-refined {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    height: 32px;
  }
  .btn-action-norm {
    background: rgba(0, 192, 0, 0.06);
    border: 1px solid rgba(0, 192, 0, 0.45);
    color: #86efac;
    font-size: 11.5px;
    font-weight: 700;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .btn-action-rem {
    background: rgba(255, 255, 0, 0.06);
    border: 1px solid rgba(255, 255, 0, 0.45);
    color: #fef08a;
    font-size: 11.5px;
    font-weight: 700;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .standby-refined {
    background: rgba(15, 23, 42, 0.9);
    border: 1px solid rgba(56, 189, 248, 0.25);
    color: #cbd5e1;
    height: 32px;
    border-radius: 6px;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: 0.03em;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }
</style>
</head>
<body>

  <div class="proposal-header">
    <h1>🎯 Comprehensive Redesign: Live Test Sessions & Wizard Overhaul</h1>
    <p>Penyempurnaan 3 Area Utama: Multi-Theme Unified Matrix (Semua Tema Sekaligus), Roomy Test Session Wizard (Opsi Cara Menjawab + Auto-Duration), dan Card Typography Polish.</p>
  </div>

  <!-- 1. MULTI-THEME UNIFIED MATRIX -->
  <div class="section-block">
    <div class="section-tag">Gambar 1 Solution: Unified Multi-Theme Matrix (Tanpa Dropdown)</div>
    <div class="matrix-wrapper">
      <div class="matrix-header-bar">
        <div class="matrix-title">
          <span>📊</span> Batch Student Readiness Matrix &bull; All 4 Themes Unified
        </div>
        <span class="matrix-badge-all">16 Active Students &bull; Zero Filter Needed</span>
      </div>
      <table class="matrix-table">
        <thead>
          <tr>
            <th style="width:36px;">No</th>
            <th style="text-align:left;">Student Name</th>
            <th>Theme A: Workplace</th>
            <th>Theme B: Tourism</th>
            <th>Theme C: CCU</th>
            <th>Theme D: High-Freq</th>
            <th>Batch Readiness</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="color:#64748b; font-family:monospace;">1</td>
            <td style="text-align:left; font-weight:700; color:#fff;">Mr. Muhammad Ariwil Asrori</td>
            <td><span class="chip-pass">✓ Passed (67%)</span></td>
            <td><span class="chip-ready">🟢 Ready (3/3)</span></td>
            <td><span class="chip-incomp">⚠️ Incomplete (0/3)</span></td>
            <td><span class="chip-incomp">⚠️ Incomplete (0/3)</span></td>
            <td style="font-weight:700; color:#38bdf8;">2 / 4 Themes</td>
          </tr>
          <tr>
            <td style="color:#64748b; font-family:monospace;">2</td>
            <td style="text-align:left; font-weight:700; color:#fff;">Miss Adinda Karunia Farela</td>
            <td><span class="chip-pass">✓ Passed (83%)</span></td>
            <td><span class="chip-ready">🟢 Ready (3/3)</span></td>
            <td><span class="chip-ready">🟢 Ready (3/3)</span></td>
            <td><span class="chip-incomp">⚠️ Incomplete (1/3)</span></td>
            <td style="font-weight:700; color:#86efac;">3 / 4 Themes</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <div style="display:flex; gap:24px; align-items:flex-start;">
    <!-- 2. ROOMY WIZARD MODAL -->
    <div class="section-block" style="flex:1;">
      <div class="section-tag">Gambar 2 Solution: Roomy Wizard (760px) + Answering Mode + Auto-Duration</div>
      <div class="modal-demo">
        <div class="modal-top">
          <div class="modal-top-title">
            <span>🟢</span> Open Normal Test Session: Theme A (Public Speaking)
          </div>
          <span style="color:#94a3b8; font-size:1.1rem; cursor:pointer;">✕</span>
        </div>

        <div class="modal-grid-2col">
          <div class="form-group">
            <label>1. Target Test Batch</label>
            <select class="input-styled">
              <option>Batch 134 (16 Students &bull; Camp Program)</option>
            </select>
          </div>
          <div class="form-group">
            <label>2. Test Duration Allocation</label>
            <input type="number" class="input-styled" value="40" style="font-weight:700; color:#38bdf8;">
            <div class="auto-duration-pill">
              <span>⚡</span> Auto-Calculated: 40 Mins (40 Soal &bull; 1 m/soal)
            </div>
          </div>
        </div>

        <!-- NEW: Answering Mode Option -->
        <div class="mode-selector-block">
          <div class="mode-selector-title">
            <span>⚙️</span> 3. Opsi Cara Menjawab (Answering Mode)
          </div>
          <div class="mode-grid">
            <div class="mode-card">
              <div class="mode-card-header">
                <span>Part 1: Words Exam (20 Soal)</span>
              </div>
              <div class="mode-pills-row">
                <div class="mode-pill active">⌨️ Typing (Default)</div>
                <div class="mode-pill">🔘 Multiple Choice</div>
                <div class="mode-pill">🎙️ Voice Speaking</div>
              </div>
            </div>
            <div class="mode-card">
              <div class="mode-card-header">
                <span>Part 2: Phrases Exam (20 Soal)</span>
              </div>
              <div class="mode-pills-row">
                <div class="mode-pill active">🧩 Chips / Dropdown</div>
                <div class="mode-pill">⌨️ Typing</div>
                <div class="mode-pill">🎙️ Voice Speaking</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Students List with Functional All/None -->
        <div class="students-section">
          <div class="students-toolbar">
            <span style="font-size:11.5px; font-weight:700; color:#cbd5e1; text-transform:uppercase;">
              4. Enrolled Students (16 Selected)
            </span>
            <div style="display:flex; gap:6px;">
              <button class="btn-mini">🛡️ Tutor Override (ON)</button>
              <button class="btn-mini" style="background:#2563eb; color:#fff; border-color:#3b82f6;">✓ Select All</button>
              <button class="btn-mini">✕ Deselect All</button>
            </div>
          </div>

          <div class="students-table-wrap">
            <div class="student-row">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" checked style="width:15px; height:15px;">
                <span style="font-weight:700; color:#fff;">Mr. Muhammad Ariwil Asrori</span>
              </label>
              <span style="font-size:11px; font-weight:700; color:#86efac; background:rgba(0,192,0,0.1); border:1px solid rgba(0,192,0,0.3); padding:1px 6px; border-radius:4px;">
                🟢 Ready
              </span>
            </div>
            <div class="student-row">
              <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                <input type="checkbox" checked style="width:15px; height:15px;">
                <span style="font-weight:700; color:#fff;">Miss Adinda Karunia Farela</span>
              </label>
              <span style="font-size:11px; font-weight:700; color:#fca5a5; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); padding:1px 6px; border-radius:4px;">
                ⚠️ Incomplete (0/3 Quizzes)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3. CARD REFINEMENT -->
    <div class="section-block">
      <div class="section-tag">Gambar 3 Solution: Card Typography Polish</div>
      <div class="card-refined">
        <div class="card-refined-top">
          <span class="code-badge">THEME A</span>
          <span style="font-size:11px; color:#94a3b8; font-weight:600;">⏱️ 40m &bull; 2 Modules</span>
        </div>
        <div class="card-refined-title-row">
          <div>
            <div class="card-refined-title">Public Speaking</div>
            <div class="card-refined-sub">Words &bull; Phrases Exam</div>
          </div>
          <span class="ready-chip-clean">0/16 Ready (0%)</span>
        </div>
        <div class="action-row-refined">
          <div class="btn-action-norm"><span>🟢</span> Normal (0)</div>
          <div class="btn-action-rem"><span>🟡</span> Remedi (0)</div>
        </div>
        <div class="standby-refined">
          <span>⏸️</span> STANDBY &bull; AWAITING UNLOCK
        </div>
      </div>
    </div>
  </div>

</body>
</html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(600);

  const outputPath = path.join(BRAIN_DIR, 'proposed_3part_overhaul_mockup.png');
  await page.screenshot({ path: outputPath, fullPage: true });
  console.log(`Saved mockup screenshot to: ${outputPath}`);

  await browser.close();
}

main().catch(console.error);
