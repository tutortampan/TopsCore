import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 500, height: 750 } });

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
    .modal-box-unified {
      max-width: 380px;
      width: 92%;
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
    .close-btn {
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

    /* 1. TOP BUTTON: GIVE UP (Red Accent) */
    .btn-giveup {
      height: 66px;
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
      box-shadow: 0 0 18px rgba(255, 0, 0, 0.22), inset 0 0 10px rgba(255, 0, 0, 0.05);
      transition: all 0.2s ease;
      font-family: 'Outfit', sans-serif;
    }

    /* 2. UNIFIED CENTER CARD: WARNING + 0/40 COUNTER (Yellow Accent) */
    .card-unified-warning-counter {
      background: #141A28;
      border: 1.5px solid rgba(255, 204, 0, 0.55);
      border-radius: 18px;
      padding: 18px 16px 16px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      box-sizing: border-box;
      box-shadow: 0 0 22px rgba(255, 204, 0, 0.1), inset 0 0 14px rgba(255, 204, 0, 0.04);
    }
    .warning-icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 2px;
    }
    .neon-warning-icon {
      width: 48px;
      height: 42px;
      filter: drop-shadow(0 0 8px rgba(255, 204, 0, 0.5));
    }
    .warning-title {
      font-size: 1.05rem;
      font-weight: 800;
      color: #FFCC00;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      line-height: 1.2;
    }

    /* Inner Deep-Well Counter Strip */
    .inner-counter-strip {
      width: 100%;
      background: #090E1A;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 10px 14px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    .counter-label {
      font-size: 0.72rem;
      font-weight: 700;
      color: #94A3B8;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }
    .counter-value-row {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }
    .counter-answered {
      font-size: 2.2rem;
      font-weight: 950;
      color: #FFFFFF;
      line-height: 1;
    }
    .counter-slash {
      font-size: 1.5rem;
      font-weight: 700;
      color: #64748B;
    }
    .counter-total {
      font-size: 1.5rem;
      font-weight: 800;
      color: #94A3B8;
    }
    .mini-progress-track {
      width: 80%;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      margin-top: 4px;
      overflow: hidden;
    }
    .mini-progress-fill {
      height: 100%;
      background: #00C000ff;
      border-radius: 4px;
      box-shadow: 0 0 6px rgba(0, 192, 0, 0.6);
    }
    .warning-penalty-note {
      font-size: 0.82rem;
      color: #CBD5E1;
      line-height: 1.35;
      margin: 0;
    }
    .warning-penalty-note strong {
      color: #FF4D4D;
      font-weight: 800;
    }

    /* 3. BOTTOM BUTTON: BACK TO THE TEST (Green Accent) */
    .btn-back {
      height: 66px;
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
      box-shadow: 0 0 18px rgba(0, 192, 0, 0.22), inset 0 0 10px rgba(0, 192, 0, 0.05);
      transition: all 0.2s ease;
      font-family: 'Outfit', sans-serif;
    }
  </style>
</head>
<body>
  <div class="modal-box-unified">
    <button type="button" class="close-btn" aria-label="Close">✕</button>

    <!-- 1. TOP ACTION: GIVE UP! -->
    <button type="button" class="btn-giveup">
      <span>🏳️</span>
      <span>GIVE UP!</span>
    </button>

    <!-- 2. UNIFIED CENTER CARD: WARNING SIGN + 0/40 COUNTER -->
    <div class="card-unified-warning-counter">
      <div class="warning-icon-wrap">
        <svg class="neon-warning-icon" viewBox="0 0 100 90" fill="none">
          <path d="M50 12 L88 78 H12 Z" stroke="#FFCC00" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
          <line x1="50" y1="36" x2="50" y2="54" stroke="#FFCC00" stroke-width="7" stroke-linecap="round" />
          <circle cx="50" cy="68" r="4.5" fill="#FFCC00" />
        </svg>
      </div>

      <div class="warning-title">WARNING: INCOMPLETE TEST!</div>

      <!-- Merged 0/40 Counter inside the warning card -->
      <div class="inner-counter-strip">
        <div class="counter-label">Questions Answered</div>
        <div class="counter-value-row">
          <span class="counter-answered">0</span>
          <span class="counter-slash">/</span>
          <span class="counter-total">40</span>
        </div>
        <div class="mini-progress-track">
          <div class="mini-progress-fill" style="width: 0%;"></div>
        </div>
      </div>

      <p class="warning-penalty-note">
        Any blank questions will receive <strong>0 points</strong>.
      </p>
    </div>

    <!-- 3. BOTTOM ACTION: BACK TO THE TEST -->
    <button type="button" class="btn-back">
      <span>BACK TO THE TEST</span>
    </button>
  </div>
</body>
</html>`;

  await page.setContent(html);
  await page.waitForTimeout(500);
  const outPath = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/submit_modal_unified_warning_counter.png';
  await page.screenshot({ path: outPath });
  console.log('Saved unified mockup to:', outPath);
  await browser.close();
}

main().catch(console.error);
