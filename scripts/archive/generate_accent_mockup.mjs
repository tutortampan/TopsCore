import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 480, height: 720 } });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <link href='https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap' rel='stylesheet'>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #060B18;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: 'Outfit', sans-serif;
    }
    .modal-box-accent {
      max-width: 370px;
      width: 90%;
      background: #0D1424;
      border: 1.5px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      padding: 24px 20px 20px 20px;
      position: relative;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(15, 23, 42, 0.8);
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-sizing: border-box;
      text-align: center;
    }
    .accent-close-btn {
      position: absolute;
      top: 14px;
      right: 14px;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #1A2540;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #94A3B8;
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .accent-layout-wrap {
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
    }
    /* BLOCK 1: GIVE UP (Red Accent) */
    .accent-btn-giveup {
      height: 68px;
      background: #141A28;
      border: 1.8px solid #FF0000;
      border-radius: 16px;
      color: #FF4D4D;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-size: 1.45rem;
      font-weight: 900;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow: 0 0 18px rgba(255, 0, 0, 0.25), inset 0 0 12px rgba(255, 0, 0, 0.08);
      transition: all 0.2s ease;
      font-family: 'Outfit', sans-serif;
    }
    /* BLOCK 2: WARNING CARD (Yellow/Amber Accent) */
    .accent-block-warning {
      height: 140px;
      background: #141A28;
      border: 1.5px solid rgba(255, 204, 0, 0.6);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 14px;
      box-sizing: border-box;
      box-shadow: 0 0 20px rgba(255, 204, 0, 0.12), inset 0 0 14px rgba(255, 204, 0, 0.04);
    }
    .accent-neon-warning-icon {
      width: 58px;
      height: 52px;
      margin-bottom: 8px;
      filter: drop-shadow(0 0 8px rgba(255, 204, 0, 0.5));
    }
    .accent-warning-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: #FFCC00;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .accent-warning-desc {
      font-size: 0.85rem;
      color: #CBD5E1;
      line-height: 1.3;
    }
    .accent-warning-desc strong {
      color: #FF4D4D;
    }
    /* BLOCK 3: 0/40 COUNTER (Dark Slate) */
    .accent-block-counter {
      height: 74px;
      background: #090E1A;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 8px 16px;
      box-sizing: border-box;
    }
    .accent-counter-title {
      font-size: 0.72rem;
      font-weight: 700;
      color: #64748B;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .accent-counter-val {
      font-size: 2rem;
      font-weight: 900;
      color: #FFFFFF;
      line-height: 1;
      letter-spacing: 0.5px;
    }
    .accent-mini-progress {
      width: 75%;
      height: 4px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      margin-top: 5px;
      overflow: hidden;
    }
    .accent-mini-progress-fill {
      height: 100%;
      background: #00C000ff;
      border-radius: 4px;
    }
    /* BLOCK 4: BACK TO THE TEST (Green Accent) */
    .accent-btn-back {
      height: 68px;
      background: #141A28;
      border: 1.8px solid #00C000ff;
      border-radius: 16px;
      color: #34D399;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-size: 1.35rem;
      font-weight: 900;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow: 0 0 18px rgba(0, 192, 0, 0.25), inset 0 0 12px rgba(0, 192, 0, 0.08);
      transition: all 0.2s ease;
      font-family: 'Outfit', sans-serif;
    }
  </style>
</head>
<body>
  <div class='modal-box-accent'>
    <button type='button' class='accent-close-btn'>✕</button>
    <div class='accent-layout-wrap'>
      <!-- BLOCK 1: GIVE UP! (Red Accent) -->
      <button type='button' class='accent-btn-giveup'>
        <span>🏳️</span>
        <span>GIVE UP!</span>
      </button>

      <!-- BLOCK 2: WARNING CARD (Yellow Accent) -->
      <div class='accent-block-warning'>
        <svg class='accent-neon-warning-icon' viewBox='0 0 100 90' fill='none'>
          <path d='M50 12 L88 78 H12 Z' stroke='#FFCC00' stroke-width='7' stroke-linecap='round' stroke-linejoin='round' />
          <line x1='50' y1='36' x2='50' y2='54' stroke='#FFCC00' stroke-width='7' stroke-linecap='round' />
          <circle cx='50' cy='68' r='4.5' fill='#FFCC00' />
        </svg>
        <div class='accent-warning-title'>WARNING: INCOMPLETE TEST!</div>
        <div class='accent-warning-desc'>Unanswered questions will receive <strong>0 points</strong>.</div>
      </div>

      <!-- BLOCK 3: 0/40 COUNTER -->
      <div class='accent-block-counter'>
        <div class='accent-counter-title'>QUESTIONS ANSWERED</div>
        <div class='accent-counter-val'><span>0</span> / <span>40</span></div>
        <div class='accent-mini-progress'>
          <div class='accent-mini-progress-fill' style='width: 0%;'></div>
        </div>
      </div>

      <!-- BLOCK 4: BACK TO THE TEST (Green Accent) -->
      <button type='button' class='accent-btn-back'>
        <span>BACK TO THE TEST</span>
      </button>
    </div>
  </div>
</body>
</html>`;

  await page.setContent(html);
  await page.waitForTimeout(500);
  const outPath = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/submit_modal_system_accent_mockup.png';
  await page.screenshot({ path: outPath });
  console.log('Saved screenshot to:', outPath);
  await browser.close();
}

main().catch(console.error);
