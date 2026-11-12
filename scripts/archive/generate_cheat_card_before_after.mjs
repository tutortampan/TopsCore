import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  const beforeImgPath = path.join(ARTIFACT_DIR, 'cheat_mobile_before.png');

  // Render NEW AFTER: Inside a CARD as requested, with glowing siren and countdown numbers
  const pageAfter = await browser.newPage({ 
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  const afterHtml = `
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
          --clr-danger: var(--grade-e);
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body {
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
          background: #090e1a;
        }

        /* Mock underlying test page (dimmed) */
        .mock-test-bg {
          position: absolute;
          inset: 0;
          background: #090e1a;
          padding: 16px;
          opacity: 0.15;
          filter: blur(5px);
        }
        .mock-header { height: 48px; background: #111827; border-radius: 8px; margin-bottom: 16px; }
        .mock-card { height: 240px; background: #1e293b; border-radius: 12px; margin-bottom: 16px; }

        /* Fullscreen Red Warning Overlay — 100% Mengacu ke Grade E (var(--grade-e-rgb)) */
        .cheat-overlay-new {
          position: fixed;
          inset: 0;
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: radial-gradient(circle at center, rgba(var(--grade-e-rgb), 0.92) 0%, rgba(var(--grade-e-rgb), 0.78) 55%, rgba(15, 6, 6, 0.98) 100%);
          animation: redPulse 1.4s ease-in-out infinite alternate;
          color: #ffffff;
        }

        @keyframes redPulse {
          0% {
            background-color: rgba(var(--grade-e-rgb), 0.88);
            box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.65);
          }
          100% {
            background-color: rgba(var(--grade-e-rgb), 0.98);
            box-shadow: inset 0 0 140px rgba(255, 255, 255, 0.28);
          }
        }

        /* THE CARD (Sama jarak / Equal Spacing antara setiap elemen) */
        .cheat-card-box {
          width: 100%;
          max-width: 350px;
          background: #0f172a;
          border: 2px solid rgba(255, 255, 255, 0.2);
          border-radius: 24px;
          padding: 28px 22px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.75), 0 0 40px rgba(var(--grade-e-rgb), 0.35);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 28px; /* Jarak sama persis antara Elemen 1, 2, dan 3 */
        }

        /* TIER 1: TOP STRIKE TEXT — Grade E Token */
        .strike-pill-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 24px;
          background: rgba(var(--grade-e-rgb), 0.15);
          border: 1.5px solid var(--grade-e);
          border-radius: 9999px;
          letter-spacing: 1.5px;
          font-size: 1.15rem;
          font-weight: 900;
          color: var(--grade-e);
          text-transform: uppercase;
          box-shadow: 0 0 16px rgba(var(--grade-e-rgb), 0.35);
        }

        /* TIER 2: CENTER COUNTDOWN NUMBER (Grade E Token) */
        .countdown-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }

        .countdown-circle {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          border: 4px solid var(--grade-e);
          background: rgba(var(--grade-e-rgb), 0.12);
          box-shadow: 0 0 35px rgba(var(--grade-e-rgb), 0.45), inset 0 0 15px rgba(var(--grade-e-rgb), 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          font-weight: 900;
          color: #ffffff;
          letter-spacing: -1px;
          animation: countPulse 1s ease-in-out infinite alternate;
        }

        @keyframes countPulse {
          0% { transform: scale(0.97); }
          100% { transform: scale(1.03); }
        }

        .countdown-label {
          font-size: 0.82rem;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: #94a3b8;
          font-weight: 700;
        }

        /* TIER 3: BOTTOM RETURN BUTTON (MAX THUMB COMFORT) */
        .btn-return-exam {
          width: 100%;
          height: 56px;
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          color: #ffffff;
          border: 2px solid #ffffff;
          border-radius: 14px;
          font-family: 'Outfit', sans-serif;
          font-size: 1.12rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4), 0 0 15px rgba(255, 255, 255, 0.2);
          cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease;
        }

        .btn-return-exam:active {
          transform: scale(0.97);
          background: #000000;
        }
      </style>
    </head>
    <body>
      <div class="mock-test-bg">
        <div class="mock-header"></div>
        <div class="mock-card"></div>
        <div class="mock-card"></div>
      </div>

      <div class="cheat-overlay-new">
        <!-- CARD CONTAINER (3 ELEMEN DENGAN JARAK SAMA PERSIS 28px) -->
        <div class="cheat-card-box">
          
          <!-- ELEMEN 1: STRIKE TEXT -->
          <div class="strike-pill-badge">{ STRIKE 1 / 10 }</div>

          <!-- ELEMEN 2: ANGKA HITUNG MUNDUR -->
          <div class="countdown-block">
            <div class="countdown-circle">10</div>
            <div class="countdown-label">Seconds to Auto-Submit</div>
          </div>

          <!-- ELEMEN 3: TOMBOL KEMBALI BESAR & MUDAH DIKLIK -->
          <button class="btn-return-exam" type="button">
            <span>&#x26F6;</span>
            <span>RETURN TO TEST</span>
          </button>

        </div>
      </div>
    </body>
    </html>
  `;

  await pageAfter.setContent(afterHtml);
  await pageAfter.waitForTimeout(600);

  const afterImgPath = path.join(ARTIFACT_DIR, 'cheat_mobile_after_card.png');
  await pageAfter.screenshot({ path: afterImgPath });
  await pageAfter.close();

  // 3. Generate Side-by-Side Comparison Card
  const pageComp = await browser.newPage({ viewport: { width: 920, height: 960 } });

  const beforeBase64 = fs.readFileSync(beforeImgPath).toString('base64');
  const afterBase64 = fs.readFileSync(afterImgPath).toString('base64');

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
        .label-red { color: #FF6B6B; }
        .label-green { color: #00E676; }
        .badge { padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .badge-red { background: rgba(255, 77, 77, 0.2); border: 1px solid #FF4D4D; }
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
        .points-list {
          margin-top: 12px;
          font-size: 12px;
          color: #94A3B8;
          line-height: 1.5;
          width: 100%;
          padding-left: 8px;
        }
        .points-list li { margin-bottom: 4px; }
      </style>
    </head>
    <body>
      <h1>Anti-Cheat Mobile Warning (HP Portrait) — Before vs After (Ultra Clean Card)</h1>
      <p class="sub">Format Card di Tengah: {STRIKE 1/10}, Angka Countdown Bersih (Tanpa Sirine), dan Tombol Kembali Besar</p>

      <div class="grid">
        <!-- BEFORE -->
        <div class="card">
          <div class="label label-red">
            <span class="badge badge-red">BEFORE (Kondisi Saat Ini)</span>
          </div>
          <div class="phone-frame">
            <img src="data:image/png;base64,${beforeBase64}" />
          </div>
          <ul class="points-list">
            <li>❌ Teks tumpuk 4 baris rapat &amp; sempit</li>
            <li>❌ Alasan panjang memenuhi ruang vertikal</li>
            <li>❌ Tombol kembali kecil dengan teks bertele-tele</li>
          </ul>
        </div>

        <!-- AFTER -->
        <div class="card">
          <div class="label label-green">
            <span class="badge badge-green">AFTER (Rancangan Simpel: Card + Countdown)</span>
          </div>
          <div class="phone-frame">
            <img src="data:image/png;base64,${afterBase64}" />
          </div>
          <ul class="points-list">
            <li>✅ <strong>Format Card:</strong> Kotak dark slate rapi di tengah latar merah darurat</li>
            <li>✅ <strong>Atas:</strong> <code>{ STRIKE 1 / 10 }</code> jelas &amp; tegas</li>
            <li>✅ <strong>Tengah:</strong> <strong>Angka Countdown Besar (10)</strong> bersih &amp; tanpa sirine</li>
            <li>✅ <strong>Bawah:</strong> Tombol <code>RETURN TO TEST</code> besar &amp; sangat mudah diklik jempol</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `;

  await pageComp.setContent(compHtml);
  await pageComp.waitForTimeout(600);

  const compImgPath = path.join(ARTIFACT_DIR, 'cheat_mobile_card_comparison.png');
  await pageComp.screenshot({ path: compImgPath });
  await pageComp.close();

  await browser.close();
  console.log('Mobile Card Before vs After generated successfully!');
}

main().catch(console.error);
