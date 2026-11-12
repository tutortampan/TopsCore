import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  // 1. Render Current Size (350px width, 96px circle, 56px button)
  const pageCurrent = await browser.newPage({ 
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  const getHtml = (isBigger) => `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Outfit:wght@600;700;800;900&display=swap" rel="stylesheet">
      <style>
        :root {
          --grade-e: #ff0000;
          --grade-e-rgb: 255, 0, 0;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
          background: #090e1a;
        }

        .cheat-overlay-new {
          position: fixed;
          inset: 0;
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          background: radial-gradient(circle at center, rgba(var(--grade-e-rgb), 0.92) 0%, rgba(var(--grade-e-rgb), 0.78) 55%, rgba(15, 6, 6, 0.98) 100%);
          color: #ffffff;
        }

        /* CARD */
        .cheat-card-box {
          width: 100%;
          max-width: ${isBigger ? '365px' : '330px'};
          background: #0f172a;
          border: 2px solid rgba(255, 255, 255, 0.22);
          border-radius: ${isBigger ? '28px' : '22px'};
          padding: ${isBigger ? '36px 24px' : '26px 20px'};
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8), 0 0 45px rgba(var(--grade-e-rgb), 0.4);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: ${isBigger ? '32px' : '26px'};
        }

        /* TIER 1: STRIKE PILL */
        .strike-pill-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: ${isBigger ? '10px 28px' : '8px 22px'};
          background: rgba(var(--grade-e-rgb), 0.15);
          border: ${isBigger ? '2px' : '1.5px'} solid var(--grade-e);
          border-radius: 9999px;
          letter-spacing: 1.5px;
          font-size: ${isBigger ? '1.35rem' : '1.12rem'};
          font-weight: 900;
          color: var(--grade-e);
          text-transform: uppercase;
          box-shadow: 0 0 20px rgba(var(--grade-e-rgb), 0.4);
        }

        /* TIER 2: COUNTDOWN NUMBER */
        .countdown-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: ${isBigger ? '12px' : '8px'};
        }

        .countdown-circle {
          width: ${isBigger ? '120px' : '92px'};
          height: ${isBigger ? '120px' : '92px'};
          border-radius: 50%;
          border: ${isBigger ? '5px' : '4px'} solid var(--grade-e);
          background: rgba(var(--grade-e-rgb), 0.14);
          box-shadow: 0 0 ${isBigger ? '45px' : '32px'} rgba(var(--grade-e-rgb), 0.5), inset 0 0 20px rgba(var(--grade-e-rgb), 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${isBigger ? '3.85rem' : '2.85rem'};
          font-weight: 900;
          color: #ffffff;
          letter-spacing: -2px;
        }

        .countdown-label {
          font-size: ${isBigger ? '0.92rem' : '0.8rem'};
          text-transform: uppercase;
          letter-spacing: 1.8px;
          color: #94a3b8;
          font-weight: 750;
        }

        /* TIER 3: RETURN BUTTON */
        .btn-return-exam {
          width: 100%;
          height: ${isBigger ? '62px' : '54px'};
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          color: #ffffff;
          border: 2.5px solid #ffffff;
          border-radius: ${isBigger ? '16px' : '14px'};
          font-family: 'Outfit', sans-serif;
          font-size: ${isBigger ? '1.25rem' : '1.08rem'};
          font-weight: 900;
          letter-spacing: 0.8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 255, 255, 0.25);
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="cheat-overlay-new">
        <div class="cheat-card-box">
          <div class="strike-pill-badge">{ STRIKE 1 / 10 }</div>
          <div class="countdown-block">
            <div class="countdown-circle">10</div>
            <div class="countdown-label">Seconds to Auto-Submit</div>
          </div>
          <button class="btn-return-exam" type="button">
            <span>&#x26F6;</span>
            <span>RETURN TO TEST</span>
          </button>
        </div>
      </div>
    </body>
    </html>
  `;

  // Render Option A (Current Compact)
  await pageCurrent.setContent(getHtml(false));
  await pageCurrent.waitForTimeout(500);
  const pathCurrent = path.join(ARTIFACT_DIR, 'size_option_compact.png');
  await pageCurrent.screenshot({ path: pathCurrent });
  await pageCurrent.close();

  // Render Option B (Bigger & More Authoritative)
  const pageBigger = await browser.newPage({ 
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  await pageBigger.setContent(getHtml(true));
  await pageBigger.waitForTimeout(500);
  const pathBigger = path.join(ARTIFACT_DIR, 'size_option_bigger.png');
  await pageBigger.screenshot({ path: pathBigger });
  await pageBigger.close();

  // Create Side-by-Side Comparison
  const pageComp = await browser.newPage({ viewport: { width: 920, height: 960 } });
  const base64Current = fs.readFileSync(pathCurrent).toString('base64');
  const base64Bigger = fs.readFileSync(pathBigger).toString('base64');

  const compHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        body { background: #070B14; color: #fff; padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
        h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; text-align: center; }
        p.sub { font-size: 13px; color: #94A3B8; margin-bottom: 20px; text-align: center; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; width: 100%; max-width: 860px; }
        .card { background: #0D1424; border: 1px solid #1E293B; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; align-items: center; }
        .label { font-size: 13px; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; width: 100%; }
        .label-blue { color: #38BDF8; }
        .label-green { color: #00E676; }
        .badge { padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .badge-blue { background: rgba(56, 189, 248, 0.2); border: 1px solid #38BDF8; }
        .badge-green { background: rgba(0, 230, 118, 0.2); border: 1px solid #00E676; }
        .phone-frame {
          width: 320px;
          height: 692px;
          border-radius: 32px;
          border: 6px solid #1E293B;
          overflow: hidden;
          box-shadow: 0 16px 36px rgba(0,0,0,0.8);
          background: #000;
        }
        .phone-frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
        .spec-list {
          margin-top: 12px;
          font-size: 11.5px;
          color: #94A3B8;
          line-height: 1.6;
          width: 100%;
          padding-left: 8px;
        }
        .spec-list b { color: #F1F5F9; }
      </style>
    </head>
    <body>
      <h1>Perbandingan Ukuran Anti-Cheat Warning (HP Portrait 390x844)</h1>
      <p class="sub">Menilai proporsi card: Opsi A (Kompak) vs Opsi B (Lebih Besar &amp; Berwibawa)</p>

      <div class="grid">
        <!-- OPTION A -->
        <div class="card">
          <div class="label label-blue">
            <span class="badge badge-blue">Opsi A: Kompak (Ukuran Saat Ini)</span>
          </div>
          <div class="phone-frame">
            <img src="data:image/png;base64,${base64Current}" />
          </div>
          <ul class="spec-list">
            <li>• Card Width: <b>330px</b> (Tinggi card: ~340px)</li>
            <li>• Countdown Ring: <b>92px</b> (Angka: 45px)</li>
            <li>• Button: <b>54px</b> (Font: 17px)</li>
            <li>• Kesan: Bersih, namun ada banyak ruang merah kosong di atas &amp; bawah.</li>
          </ul>
        </div>

        <!-- OPTION B -->
        <div class="card">
          <div class="label label-green">
            <span class="badge badge-green">(Rekomendasi) Opsi B: Lebih Besar &amp; Berwibawa</span>
          </div>
          <div class="phone-frame">
            <img src="data:image/png;base64,${base64Bigger}" />
          </div>
          <ul class="spec-list">
            <li>• Card Width: <b>365px</b> (Tinggi card: ~470px)</li>
            <li>• Countdown Ring: <b>120px</b> (Angka: 60px — <i>super jelas!</i>)</li>
            <li>• Button: <b>62px</b> (Font: 20px — <i>sangat empuk di-tap jempol</i>)</li>
            <li>• Kesan: Gagah, tegas, memenuhi ~56% tinggi layar HP dengan proporsi ideal!</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `;

  await pageComp.setContent(compHtml);
  await pageComp.waitForTimeout(600);
  const compPath = path.join(ARTIFACT_DIR, 'cheat_size_options_comparison.png');
  await pageComp.screenshot({ path: compPath });
  await pageComp.close();

  await browser.close();
  console.log('Size options comparison generated:', compPath);
}

main().catch(console.error);
