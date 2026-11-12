import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const BRAIN_DIR = 'C:/Users/Top/.gemini/antigravity/brain/e109f303-e1a5-4e34-b57b-3d40f829c347';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1000, height: 600 } });
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
    --grade-e: #ef4444;
  }
  body {
    margin: 0;
    padding: 30px;
    background: #090D16;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #fff;
    display: flex;
    flex-direction: column;
    gap: 24px;
    align-items: center;
  }
  .comparison-header {
    text-align: center;
    margin-bottom: 8px;
  }
  .comparison-header h2 {
    margin: 0 0 6px 0;
    font-size: 1.25rem;
    color: #f8fafc;
    letter-spacing: 0.02em;
  }
  .comparison-header p {
    margin: 0;
    font-size: 0.85rem;
    color: #94a3b8;
  }
  .cards-row {
    display: flex;
    gap: 24px;
    justify-content: center;
  }
  .card-wrapper {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .card-label {
    font-size: 0.78rem;
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 4px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    width: fit-content;
  }
  .label-before {
    background: rgba(239, 68, 68, 0.15);
    color: #fca5a5;
    border: 1px solid rgba(239, 68, 68, 0.4);
  }
  .label-after {
    background: rgba(0, 192, 0, 0.15);
    color: #86efac;
    border: 1px solid rgba(0, 192, 0, 0.4);
  }

  .theme-card {
    width: 420px;
    background: #0F172A;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .theme-badge {
    background: rgba(56, 189, 248, 0.12);
    border: 1px solid rgba(56, 189, 248, 0.35);
    color: #38bdf8;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.04em;
  }
  .live-badge {
    background: rgba(0, 192, 0, 0.12);
    border: 1px solid #00c000;
    color: #86efac;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 0.72rem;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }
  .batch-badge {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #94a3b8;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .theme-name {
    font-size: 0.98rem;
    font-weight: 900;
    letter-spacing: 0.02em;
    color: #ffffff;
    margin-bottom: 2px;
  }
  .theme-sub {
    font-size: 0.75rem;
    color: #94a3b8;
  }
  .ready-badge {
    background: rgba(255, 255, 0, 0.08);
    border: 1px solid #ffff00;
    color: #fef08a;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 0.72rem;
    font-weight: 800;
  }

  .btn-live-view {
    width: 100%;
    height: 38px;
    background: rgba(2, 26, 68, 0.8);
    border: 1.5px solid #38bdf8;
    color: #ffffff;
    font-weight: 900;
    font-size: 0.84rem;
    letter-spacing: 0.04em;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    box-shadow: 0 2px 14px rgba(56, 189, 248, 0.35);
    box-sizing: border-box;
  }

  .buttons-row {
    display: flex;
    gap: 6px;
    height: 34px;
    align-items: stretch;
  }

  .btn-late {
    flex: 1;
    height: 100%;
    background: rgba(0, 192, 0, 0.08);
    border: 1.5px solid #00c000;
    color: #86efac;
    font-weight: 800;
    font-size: 0.78rem;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    box-sizing: border-box;
  }

  .btn-close {
    flex: 1;
    height: 100%;
    background: rgba(239, 68, 68, 0.08);
    border: 1.5px solid #ef4444;
    color: #fca5a5;
    font-weight: 800;
    font-size: 0.78rem;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    box-sizing: border-box;
  }

  /* BEFORE: No yellow border, dark background */
  .btn-time-before {
    flex: 1;
    width: 100%;
    height: 100%;
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: #fef08a;
    font-weight: 800;
    font-size: 0.78rem;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    box-sizing: border-box;
  }

  /* AFTER: Yellow outline, yellow glow, subtle yellow tint */
  .btn-time-after {
    flex: 1;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 0, 0.08);
    border: 1.5px solid #ffff00;
    color: #fef08a;
    font-weight: 800;
    font-size: 0.78rem;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    box-shadow: 0 2px 8px rgba(255, 255, 0, 0.25);
    box-sizing: border-box;
  }

  .callout-box {
    margin-top: 6px;
    font-size: 0.74rem;
    padding: 6px 10px;
    border-radius: 6px;
  }
  .callout-before {
    background: rgba(239, 68, 68, 0.08);
    border: 1px solid rgba(239, 68, 68, 0.2);
    color: #fca5a5;
  }
  .callout-after {
    background: rgba(255, 255, 0, 0.08);
    border: 1px solid rgba(255, 255, 0, 0.25);
    color: #fef08a;
  }
</style>
</head>
<body>

  <div class="comparison-header">
    <h2>🎯 Before & After: Outline Garis Kuning Tombol TIME</h2>
    <p>Modernisasi Tombol Kontrol Sesi Ujian Aktif — Keselarasan Visual Palette SSOT (Hijau - Kuning - Merah)</p>
  </div>

  <div class="cards-row">
    <!-- BEFORE CARD -->
    <div class="card-wrapper">
      <div class="card-label label-before">🔴 KONDISI SAAT INI (BEFORE)</div>
      <div class="theme-card">
        <div class="card-top">
          <div class="theme-badge">THEME A</div>
          <div style="display:flex; gap:6px;">
            <div class="live-badge"><span>🟢</span> LIVE (20m)</div>
            <div class="batch-badge">👥 EV-07 (3)</div>
          </div>
        </div>
        <div class="title-row">
          <div>
            <div class="theme-name">PUBLIC SPEAKING</div>
            <div class="theme-sub">📝 Words Exam</div>
          </div>
          <div class="ready-badge">👥 0/16 READY (0%)</div>
        </div>
        <div class="btn-live-view">
          <span>👁️</span> LIVE VIEW • REALTIME MONITOR (3 STUDENTS)
        </div>
        <div class="buttons-row">
          <div class="btn-late"><span>👥</span> +LATE</div>
          <div style="flex:1; height:100%; display:flex;">
            <div class="btn-time-before"><span>⏱️</span> TIME</div>
          </div>
          <div class="btn-close"><span>🔒</span> CLOSE</div>
        </div>
      </div>
      <div class="callout-box callout-before">
        ❌ Border gelap/abu-abu tipis (tidak bergaris kuning), kontras lemah.
      </div>
    </div>

    <!-- AFTER CARD -->
    <div class="card-wrapper">
      <div class="card-label label-after">🟢 TARGET PERUBAHAN (AFTER)</div>
      <div class="theme-card">
        <div class="card-top">
          <div class="theme-badge">THEME A</div>
          <div style="display:flex; gap:6px;">
            <div class="live-badge"><span>🟢</span> LIVE (20m)</div>
            <div class="batch-badge">👥 EV-07 (3)</div>
          </div>
        </div>
        <div class="title-row">
          <div>
            <div class="theme-name">PUBLIC SPEAKING</div>
            <div class="theme-sub">📝 Words Exam</div>
          </div>
          <div class="ready-badge">👥 0/16 READY (0%)</div>
        </div>
        <div class="btn-live-view">
          <span>👁️</span> LIVE VIEW • REALTIME MONITOR (3 STUDENTS)
        </div>
        <div class="buttons-row">
          <div class="btn-late"><span>👥</span> +LATE</div>
          <div style="flex:1; height:100%; display:flex;">
            <div class="btn-time-after"><span>⏱️</span> TIME</div>
          </div>
          <div class="btn-close"><span>🔒</span> CLOSE</div>
        </div>
      </div>
      <div class="callout-box callout-after">
        ✨ <strong>border: 1.5px solid #ffff00</strong>, background kuning transparan (0.08), harmonis sempurna!
      </div>
    </div>
  </div>

</body>
</html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(600);

  const outputPath = path.join(BRAIN_DIR, 'time_button_before_after.png');
  await page.screenshot({ path: outputPath, fullPage: true });
  console.log(`Saved screenshot to: ${outputPath}`);

  await browser.close();
}

main().catch(console.error);
