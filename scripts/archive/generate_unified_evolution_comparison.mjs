import { chromium } from '@playwright/test';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 920, height: 750 } });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset='utf-8'>
  <link href='https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap' rel='stylesheet'>
  <style>
    body {
      margin: 0;
      padding: 24px 20px;
      background: #060B18;
      font-family: 'Outfit', sans-serif;
      color: #FFFFFF;
      box-sizing: border-box;
    }
    .header-title {
      text-align: center;
      margin-bottom: 20px;
    }
    .header-title h2 {
      margin: 0 0 4px 0;
      font-size: 1.5rem;
      font-weight: 800;
    }
    .header-title p {
      margin: 0;
      color: #94A3B8;
      font-size: 0.88rem;
    }
    .comparison-container {
      display: flex;
      justify-content: center;
      gap: 32px;
      align-items: flex-start;
    }
    .column {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 380px;
    }
    .column-badge {
      font-size: 0.82rem;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 20px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .badge-separate {
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid rgba(245, 158, 11, 0.4);
      color: #FBBF24;
    }
    .badge-unified {
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.4);
      color: #34D399;
    }

    /* Modal Base */
    .modal-box {
      width: 100%;
      background: #0D1424;
      border: 1.5px solid rgba(255, 255, 255, 0.12);
      border-radius: 24px;
      padding: 22px 18px 18px 18px;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(15, 23, 42, 0.8);
      display: flex;
      flex-direction: column;
      gap: 12px;
      box-sizing: border-box;
      position: relative;
      text-align: center;
    }
    .btn-giveup {
      height: 64px;
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
    .btn-back {
      height: 64px;
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

    /* LEFT: Separate Cards */
    .card-sep-warning {
      height: 125px;
      background: #141A28;
      border: 1.5px solid rgba(255, 204, 0, 0.5);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 10px;
      box-sizing: border-box;
    }
    .card-sep-counter {
      height: 70px;
      background: #090E1A;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    /* RIGHT: UNIFIED MERGED CARD */
    .card-unified {
      background: #141A28;
      border: 1.5px solid rgba(255, 204, 0, 0.55);
      border-radius: 18px;
      padding: 16px 14px 14px 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      box-sizing: border-box;
      box-shadow: 0 0 20px rgba(255, 204, 0, 0.1);
    }
    .inner-counter-strip {
      width: 100%;
      background: #090E1A;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 8px 12px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
    }
    .mini-progress-track {
      width: 75%;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      margin-top: 3px;
      overflow: hidden;
    }
    .mini-progress-fill {
      height: 100%;
      background: #00C000ff;
      border-radius: 4px;
    }
    .notes-box {
      margin-top: 10px;
      font-size: 0.8rem;
      color: #94A3B8;
      line-height: 1.4;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header-title">
    <h2>Rancangan Penggabungan Panel Warning &amp; Counter 0/40</h2>
    <p>Dari 4 Balok Terpisah Menjadi 3 Tingkat Terpadu (Unified &amp; Balanced)</p>
  </div>

  <div class="comparison-container">
    <!-- SEPARATE COLUMN -->
    <div class="column">
      <div class="column-badge badge-separate">4 TINGKAT TERPISAH (SEBELUMNYA)</div>
      <div class="modal-box">
        <div class="btn-giveup"><span>🏳️</span> <span>GIVE UP!</span></div>
        <div class="card-sep-warning">
          <svg width="40" height="36" viewBox="0 0 100 90" fill="none" style="margin-bottom: 4px;">
            <path d="M50 12 L88 78 H12 Z" stroke="#FFCC00" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
            <line x1="50" y1="36" x2="50" y2="54" stroke="#FFCC00" stroke-width="7" stroke-linecap="round" />
            <circle cx="50" cy="68" r="4.5" fill="#FFCC00" />
          </svg>
          <div style="font-size: 0.95rem; font-weight: 800; color: #FFCC00; text-transform: uppercase;">WARNING: INCOMPLETE TEST!</div>
          <div style="font-size: 0.78rem; color: #CBD5E1;">Unanswered questions = 0 pts</div>
        </div>
        <div class="card-sep-counter">
          <div style="font-size: 0.65rem; color: #64748B; font-weight: 700;">QUESTIONS ANSWERED</div>
          <div style="font-size: 1.8rem; font-weight: 900; color: #FFF;">0 / 40</div>
        </div>
        <div class="btn-back"><span>BACK TO THE TEST</span></div>
      </div>
      <div class="notes-box">
        Panel warning dan counter terpisah dalam 2 kotak berbeda.
      </div>
    </div>

    <!-- UNIFIED COLUMN -->
    <div class="column">
      <div class="column-badge badge-unified">✔ 3 TINGKAT TERPADU (GABUNGAN BARU)</div>
      <div class="modal-box">
        <!-- 1. TOP: GIVE UP -->
        <div class="btn-giveup"><span>🏳️</span> <span>GIVE UP!</span></div>

        <!-- 2. CENTER: UNIFIED WARNING & 0/40 COUNTER -->
        <div class="card-unified">
          <svg width="42" height="38" viewBox="0 0 100 90" fill="none" style="filter: drop-shadow(0 0 6px rgba(255,204,0,0.5));">
            <path d="M50 12 L88 78 H12 Z" stroke="#FFCC00" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
            <line x1="50" y1="36" x2="50" y2="54" stroke="#FFCC00" stroke-width="7" stroke-linecap="round" />
            <circle cx="50" cy="68" r="4.5" fill="#FFCC00" />
          </svg>
          <div style="font-size: 1rem; font-weight: 800; color: #FFCC00; text-transform: uppercase;">WARNING: INCOMPLETE TEST!</div>

          <!-- Merged Counter Strip -->
          <div class="inner-counter-strip">
            <div style="font-size: 0.7rem; font-weight: 700; color: #94A3B8; text-transform: uppercase;">Questions Answered</div>
            <div style="font-size: 2.1rem; font-weight: 950; color: #FFF; line-height: 1;">
              0 <span style="font-size: 1.4rem; color: #64748B;">/</span> <span style="font-size: 1.4rem; color: #94A3B8;">40</span>
            </div>
            <div class="mini-progress-track">
              <div class="mini-progress-fill" style="width: 0%;"></div>
            </div>
          </div>

          <div style="font-size: 0.8rem; color: #CBD5E1; margin: 0;">
            Any blank questions will receive <strong style="color: #FF4D4D;">0 points</strong>.
          </div>
        </div>

        <!-- 3. BOTTOM: BACK TO THE TEST -->
        <div class="btn-back"><span>BACK TO THE TEST</span></div>
      </div>
      <div class="notes-box">
        Warning sign &amp; counter 0/40 menyatu elegan dalam 1 kartu terpadu.
      </div>
    </div>
  </div>
</body>
</html>`;

  await page.setContent(html);
  await page.waitForTimeout(500);
  const outPath = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172/submit_modal_unified_evolution_comparison.png';
  await page.screenshot({ path: outPath });
  console.log('Saved evolution comparison to:', outPath);
  await browser.close();
}

main().catch(console.error);
