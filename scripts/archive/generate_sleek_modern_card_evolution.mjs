import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BRAIN_DIR = 'C:/Users/Top/.gemini/antigravity/brain/e109f303-e1a5-4e34-b57b-3d40f829c347';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1040, height: 680 } });
  const page = await context.newPage();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  :root {
    --grade-a: #00c000;
    --grade-a-rgb: 0, 192, 0;
    --grade-c: #ffff00;
    --grade-c-rgb: 255, 255, 0;
    --grade-e: #ff0000;
    --grade-e-rgb: 255, 0, 0;
  }
  body {
    margin: 0;
    padding: 32px;
    background: #090D16;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #fff;
    display: flex;
    flex-direction: column;
    gap: 24px;
    align-items: center;
  }
  .header-box {
    text-align: center;
    max-width: 800px;
  }
  .header-box h2 {
    margin: 0 0 6px 0;
    font-size: 1.35rem;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: #f8fafc;
  }
  .header-box p {
    margin: 0;
    font-size: 0.85rem;
    color: #94a3b8;
    line-height: 1.5;
  }
  .comparison-row {
    display: flex;
    gap: 32px;
    justify-content: center;
    width: 100%;
  }
  .col-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 440px;
  }
  .col-badge {
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 4px;
    width: fit-content;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .badge-before {
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.35);
    color: #fca5a5;
  }
  .badge-after {
    background: rgba(0, 192, 0, 0.12);
    border: 1px solid rgba(0, 192, 0, 0.35);
    color: #86efac;
  }

  /* ========================================================
     1. BEFORE: CHUNKY, TACKY NEON OVERLOAD
     ======================================================== */
  .card-before {
    background: #0F172A;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  }
  .card-before .top-pills {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .card-before .pill-theme {
    background: rgba(56, 189, 248, 0.15);
    border: 1px solid #38bdf8;
    color: #38bdf8;
    font-size: 0.7rem;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 4px;
  }
  .card-before .pill-live {
    background: rgba(0, 192, 0, 0.15);
    border: 1.5px solid #00c000;
    color: #86efac;
    font-size: 0.7rem;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .card-before .pill-batch {
    background: #1e293b;
    border: 1px solid #334155;
    color: #cbd5e1;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 4px;
  }
  .card-before .title-box {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .card-before .title-text {
    font-size: 1.05rem;
    font-weight: 900;
    color: #fff;
    margin-bottom: 2px;
  }
  .card-before .sub-text {
    font-size: 0.75rem;
    color: #94a3b8;
  }
  .card-before .pill-ready {
    background: rgba(255, 255, 0, 0.12);
    border: 1.5px solid #ffff00;
    color: #fef08a;
    font-size: 0.72rem;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 4px;
  }
  .card-before .btn-live-chunky {
    width: 100%;
    height: 40px;
    background: #021a44;
    border: 2px solid #38bdf8;
    color: #fff;
    font-weight: 900;
    font-size: 0.86rem;
    letter-spacing: 0.04em;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 4px 18px rgba(56, 189, 248, 0.4);
    box-sizing: border-box;
  }
  .card-before .action-row {
    display: flex;
    gap: 6px;
    height: 36px;
  }
  .card-before .btn-late {
    flex: 1;
    background: rgba(0, 192, 0, 0.12);
    border: 1.5px solid #00c000;
    color: #86efac;
    font-weight: 900;
    font-size: 0.78rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    box-shadow: 0 2px 10px rgba(0, 192, 0, 0.3);
  }
  .card-before .btn-time {
    flex: 1;
    background: rgba(255, 255, 0, 0.12);
    border: 1.5px solid #ffff00;
    color: #fef08a;
    font-weight: 900;
    font-size: 0.78rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    box-shadow: 0 2px 10px rgba(255, 255, 0, 0.3);
  }
  .card-before .btn-close {
    flex: 1;
    background: rgba(239, 68, 68, 0.12);
    border: 1.5px solid #ef4444;
    color: #fca5a5;
    font-weight: 900;
    font-size: 0.78rem;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    box-shadow: 0 2px 10px rgba(239, 68, 68, 0.3);
  }

  /* ========================================================
     2. AFTER: COMPACT, SLEEK, REFINED MODERN WORKSTATION
     ======================================================== */
  .card-after {
    background: #0B1120;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-top: 1px solid rgba(255, 255, 255, 0.16);
    border-radius: 10px;
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.04);
    position: relative;
    overflow: hidden;
  }
  /* Subtle tactical top accent line */
  .card-after::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, #38bdf8 0%, rgba(56, 189, 248, 0.1) 60%, transparent 100%);
  }
  .card-after .top-meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .card-after .badge-code {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 0.68rem;
    font-weight: 700;
    color: #38bdf8;
    background: rgba(56, 189, 248, 0.08);
    border: 1px solid rgba(56, 189, 248, 0.25);
    padding: 2px 7px;
    border-radius: 4px;
    letter-spacing: 0.05em;
  }
  .card-after .meta-chips-right {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .card-after .chip-live {
    font-size: 0.68rem;
    font-weight: 700;
    color: #4ade80;
    background: rgba(0, 192, 0, 0.06);
    border: 1px solid rgba(0, 192, 0, 0.3);
    padding: 2px 8px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 5px;
    letter-spacing: 0.02em;
  }
  .card-after .live-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--grade-a);
    box-shadow: 0 0 6px var(--grade-a);
  }
  .card-after .chip-batch {
    font-size: 0.68rem;
    font-weight: 600;
    color: #94a3b8;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 2px 7px;
    border-radius: 4px;
  }

  .card-after .title-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .card-after .title-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .card-after .title-name {
    font-size: 1.0rem;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: #f8fafc;
  }
  .card-after .title-spec {
    font-size: 0.72rem;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .card-after .spec-tag {
    color: #cbd5e1;
    font-weight: 500;
  }
  .card-after .readiness-badge-sleek {
    font-size: 0.70rem;
    font-weight: 700;
    color: var(--grade-c);
    background: rgba(var(--grade-c-rgb), 0.06);
    border: 1px solid rgba(var(--grade-c-rgb), 0.35);
    padding: 3px 8px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  /* Primary Hero Action: Refined Tactile Slate/Blue */
  .card-after .btn-hero-monitor {
    width: 100%;
    height: 36px;
    background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
    border: 1px solid rgba(56, 189, 248, 0.4);
    color: #f8fafc;
    font-size: 0.80rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
    transition: all 0.15s ease;
    box-sizing: border-box;
  }
  .card-after .btn-hero-monitor:hover {
    border-color: #38bdf8;
    background: #1e293b;
    box-shadow: 0 0 12px rgba(56, 189, 248, 0.25);
  }
  .card-after .monitor-chip {
    background: rgba(56, 189, 248, 0.15);
    color: #38bdf8;
    font-size: 0.68rem;
    padding: 1px 6px;
    border-radius: 3px;
    font-weight: 700;
  }

  /* Secondary Toolbar: Hairline SSOT Borders (Clean, Matte, Professional) */
  .card-after .sleek-actions-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6px;
    height: 32px;
  }
  .card-after .btn-sleek-action {
    height: 100%;
    border-radius: 6px;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    cursor: pointer;
    box-sizing: border-box;
    transition: all 0.15s ease;
    text-transform: uppercase;
  }
  /* Hijau (Grade A) */
  .card-after .btn-sleek-green {
    background: rgba(var(--grade-a-rgb), 0.05);
    border: 1px solid rgba(var(--grade-a-rgb), 0.45);
    color: #86efac;
  }
  .card-after .btn-sleek-green:hover {
    background: rgba(var(--grade-a-rgb), 0.14);
    border-color: var(--grade-a);
    color: #fff;
  }
  /* Kuning (Grade C) */
  .card-after .btn-sleek-yellow {
    background: rgba(var(--grade-c-rgb), 0.05);
    border: 1px solid rgba(var(--grade-c-rgb), 0.45);
    color: #fef08a;
  }
  .card-after .btn-sleek-yellow:hover {
    background: rgba(var(--grade-c-rgb), 0.14);
    border-color: var(--grade-c);
    color: #fff;
  }
  /* Merah (Grade E) */
  .card-after .btn-sleek-red {
    background: rgba(var(--grade-e-rgb), 0.05);
    border: 1px solid rgba(var(--grade-e-rgb), 0.45);
    color: #fca5a5;
  }
  .card-after .btn-sleek-red:hover {
    background: rgba(var(--grade-e-rgb), 0.14);
    border-color: var(--grade-e);
    color: #fff;
  }

  /* Critique Callouts */
  .critique-box {
    padding: 10px 12px;
    border-radius: 6px;
    font-size: 0.75rem;
    line-height: 1.45;
  }
  .critique-before {
    background: rgba(239, 68, 68, 0.06);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #cbd5e1;
  }
  .critique-before strong { color: #fca5a5; }
  .critique-after {
    background: rgba(0, 192, 0, 0.06);
    border: 1px solid rgba(0, 192, 0, 0.2);
    color: #cbd5e1;
  }
  .critique-after strong { color: #86efac; }
</style>
</head>
<body>

  <div class="header-box">
    <h2>Evolusi Desain: Dari "Neon Arcade" ke "Modern Tactical Workstation"</h2>
    <p>Perbandingan presisi antara gaya tombol chunky saturated (terasa murahan/tacky) vs gaya hairline border modern (sleek, compact, dan luxury professional ala Linear & Vercel) dengan tetap 100% patuh Rule 2.10 SSOT.</p>
  </div>

  <div class="comparison-row">
    <!-- BEFORE COLUMN -->
    <div class="col-card">
      <div class="col-badge badge-before">🔴 KONDISI SAAT INI (TACKY & CLUNKY)</div>
      <div class="card-before">
        <div class="top-pills">
          <div class="pill-theme">THEME A</div>
          <div style="display:flex; gap:6px;">
            <div class="pill-live"><span>🟢</span> LIVE (20m)</div>
            <div class="pill-batch">👥 EV-07 (3)</div>
          </div>
        </div>
        <div class="title-box">
          <div>
            <div class="title-text">PUBLIC SPEAKING</div>
            <div class="sub-text">📝 Words Exam</div>
          </div>
          <div class="pill-ready">👥 0/16 READY (0%)</div>
        </div>
        <div class="btn-live-chunky">
          <span>👁️</span> LIVE VIEW • REALTIME MONITOR (3 STUDENTS)
        </div>
        <div class="action-row">
          <div class="btn-late"><span>👥</span> +LATE</div>
          <div class="btn-time"><span>⏱️</span> TIME</div>
          <div class="btn-close"><span>🔒</span> CLOSE</div>
        </div>
      </div>
      <div class="critique-box critique-before">
        <strong>Kelemahan Estetika (Penyebab Tacky):</strong><br>
        • 4 warna neon menyala bersamaan (Cyan, Hijau, Kuning, Merah) dengan glow berat.<br>
        • Border 1.5px tebal dengan warna 100% saturated terlihat seperti game arcade/mainan.<br>
        • Tombol Live View terlalu gemuk dan mendominasi layar secara agresif.
      </div>
    </div>

    <!-- AFTER COLUMN -->
    <div class="col-card">
      <div class="col-badge badge-after">🟢 PROPOSAL MODERN (COMPACT & SLEEK)</div>
      <div class="card-after">
        <div class="top-meta-row">
          <span class="badge-code">THEME A</span>
          <div class="meta-chips-right">
            <span class="chip-live"><span class="live-dot"></span> LIVE 20m</span>
            <span class="chip-batch">EV-07 (3)</span>
          </div>
        </div>
        <div class="title-header">
          <div class="title-left">
            <div class="title-name">Public Speaking</div>
            <div class="title-spec">Words Exam &bull; <span class="spec-tag">1 Module</span></div>
          </div>
          <div class="readiness-badge-sleek">0/16 Ready (0%)</div>
        </div>
        <div class="btn-hero-monitor">
          <span>Realtime Live Monitor</span>
          <span class="monitor-chip">3 Students</span>
        </div>
        <div class="sleek-actions-grid">
          <button class="btn-sleek-action btn-sleek-green">+Late</button>
          <button class="btn-sleek-action btn-sleek-yellow">Time</button>
          <button class="btn-sleek-action btn-sleek-red">Close</button>
        </div>
      </div>
      <div class="critique-box critique-after">
        <strong>Penyempurnaan Luxury & Sleek:</strong><br>
        • Hairline 1px border dengan alpha tenang (tidak silau neon, bebas kesan murahan).<br>
        • Elevated surface matte #0B1120 dengan subtle rim lighting 1px atas.<br>
        • Hero button elegan bernuansa tactile slate, secondary actions bergaris tegas teratur.<br>
        • 100% mematuhi Rule 2.10 (Hijau = Grade A, Kuning = Grade C, Merah = Grade E).
      </div>
    </div>
  </div>

</body>
</html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(600);

  const outputPath = path.join(BRAIN_DIR, 'sleek_modern_card_evolution.png');
  await page.screenshot({ path: outputPath, fullPage: true });
  console.log(`Saved screenshot to: ${outputPath}`);

  await browser.close();
}

main().catch(console.error);
