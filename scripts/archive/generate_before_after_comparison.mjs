import { chromium } from '@playwright/test';
import path from 'path';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 750 } });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <link href='https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap' rel='stylesheet'>
  <style>
    body {
      margin: 0;
      padding: 30px 20px;
      background: #060B18;
      font-family: 'Outfit', sans-serif;
      color: #FFFFFF;
      box-sizing: border-box;
    }
    .header-title {
      text-align: center;
      margin-bottom: 24px;
    }
    .header-title h2 {
      margin: 0 0 6px 0;
      font-size: 1.5rem;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .header-title p {
      margin: 0;
      color: #94A3B8;
      font-size: 0.9rem;
    }
    .comparison-container {
      display: flex;
      justify-content: center;
      gap: 36px;
      align-items: flex-start;
    }
    .column {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 370px;
    }
    .column-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.85rem;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 20px;
      margin-bottom: 14px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .badge-before {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #F87171;
    }
    .badge-after {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34D399;
    }

    /* === BEFORE MODAL (Glaring Solid Colors) === */
    .modal-before {
      width: 100%;
      background: #101726;
      border: 2.5px solid #FFEA00;
      border-radius: 22px;
      padding: 20px 16px 16px 16px;
      box-shadow: 0 0 25px rgba(255, 234, 0, 0.45), 0 25px 60px rgba(0, 0, 0, 0.95);
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-sizing: border-box;
      position: relative;
    }
    .btn-before-giveup {
      height: 70px;
      background: #DC2626;
      color: #FFFFFF;
      border: none;
      border-radius: 16px;
      font-size: 1.55rem;
      font-weight: 950;
      letter-spacing: 1.5px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 20px rgba(220, 38, 38, 0.45);
    }
    .card-before-warning {
      height: 135px;
      background: #EAB308;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card-before-counter {
      height: 72px;
      background: #080C14;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    .btn-before-back {
      height: 70px;
      background: #00C853;
      color: #FFFFFF;
      border: none;
      border-radius: 16px;
      font-size: 1.4rem;
      font-weight: 950;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 22px rgba(0, 200, 83, 0.55);
    }

    /* === AFTER MODAL (Dark Slate with System Color Accents) === */
    .modal-after {
      width: 100%;
      background: #0D1424;
      border: 1.5px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      padding: 22px 18px 18px 18px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(15, 23, 42, 0.8);
      display: flex;
      flex-direction: column;
      gap: 13px;
      box-sizing: border-box;
      position: relative;
    }
    .btn-after-giveup {
      height: 68px;
      background: #141A28;
      border: 1.8px solid #FF0000;
      border-radius: 16px;
      color: #FF4D4D;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 1.4rem;
      font-weight: 900;
      letter-spacing: 1.5px;
      box-shadow: 0 0 16px rgba(255, 0, 0, 0.22);
    }
    .card-after-warning {
      height: 135px;
      background: #141A28;
      border: 1.5px solid rgba(255, 204, 0, 0.6);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 12px;
      box-sizing: border-box;
      box-shadow: 0 0 18px rgba(255, 204, 0, 0.1);
    }
    .card-after-counter {
      height: 72px;
      background: #090E1A;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }
    .btn-after-back {
      height: 68px;
      background: #141A28;
      border: 1.8px solid #00C000ff;
      border-radius: 16px;
      color: #34D399;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      font-size: 1.3rem;
      font-weight: 900;
      letter-spacing: 1.2px;
      box-shadow: 0 0 16px rgba(0, 192, 0, 0.22);
    }
    .notes-box {
      margin-top: 10px;
      font-size: 0.78rem;
      color: #94A3B8;
      line-height: 1.4;
      text-align: center;
    }
    .notes-box strong {
      color: #F1F5F9;
    }
  </style>
</head>
<body>
  <div class="header-title">
    <h2>Submit Modal Comparison: Before vs. After</h2>
    <p>Transformation from Glaring Solid Slabs to TopsCore Dark Slate with Refined Accents</p>
  </div>

  <div class="comparison-container">
    <!-- BEFORE COLUMN -->
    <div class="column">
      <div class="column-badge badge-before">❌ BEFORE (Solid Glaring Slabs)</div>
      <div class="modal-before">
        <div class="btn-before-giveup">GIVE UP!</div>
        <div class="card-before-warning">
          <svg width="68" height="60" viewBox="0 0 100 90" fill="none">
            <path d="M50 12 L88 78 H12 Z" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
            <line x1="50" y1="36" x2="50" y2="54" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" />
            <circle cx="50" cy="68" r="4.5" fill="#FFFFFF" />
          </svg>
        </div>
        <div class="card-before-counter">
          <div style="font-size: 2.1rem; font-weight: 950; color: #FFF;">0/40</div>
        </div>
        <div class="btn-before-back">BACK TO THE TEST</div>
      </div>
      <div class="notes-box">
        Silau kuning/merah/hijau pekat.<br>
        Klik "Back to Test" memaksa lompat soal.
      </div>
    </div>

    <!-- AFTER COLUMN -->
    <div class="column">
      <div class="column-badge badge-after">✔ PROPOSED AFTER (System Slate &amp; Accents)</div>
      <div class="modal-after">
        <div class="btn-after-giveup">
          <span>🏳️</span>
          <span>GIVE UP!</span>
        </div>
        <div class="card-after-warning">
          <svg width="48" height="42" viewBox="0 0 100 90" fill="none" style="margin-bottom: 6px;">
            <path d="M50 12 L88 78 H12 Z" stroke="#FFCC00" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
            <line x1="50" y1="36" x2="50" y2="54" stroke="#FFCC00" stroke-width="7" stroke-linecap="round" />
            <circle cx="50" cy="68" r="4.5" fill="#FFCC00" />
          </svg>
          <div style="font-size: 0.98rem; font-weight: 800; color: #FFCC00; text-transform: uppercase;">WARNING: INCOMPLETE TEST!</div>
          <div style="font-size: 0.8rem; color: #CBD5E1; text-align: center;">Unanswered questions will receive <strong style="color: #FF4D4D;">0 points</strong>.</div>
        </div>
        <div class="card-after-counter">
          <div style="font-size: 0.68rem; font-weight: 700; color: #64748B; letter-spacing: 1px;">QUESTIONS ANSWERED</div>
          <div style="font-size: 1.85rem; font-weight: 900; color: #FFF;">0 / 40</div>
        </div>
        <div class="btn-after-back">
          <span>BACK TO THE TEST</span>
        </div>
      </div>
      <div class="notes-box">
        Dark slate elegan, warna hanya untuk border &amp; pendaran.<br>
        Klik "Back to Test" aman tanpa lompat soal.
      </div>
    </div>
  </div>
</body>
</html>`;

  await page.setContent(html);
  await page.waitForTimeout(500);
  const outPath = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/submit_modal_before_vs_after_comparison.png';
  await page.screenshot({ path: outPath });
  console.log('Saved comparison screenshot to:', outPath);
  await browser.close();
}

main().catch(console.error);
