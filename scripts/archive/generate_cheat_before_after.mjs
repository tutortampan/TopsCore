import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  // 1. Capture BEFORE (Current live implementation on mobile 390x844)
  const pageBefore = await browser.newPage({ 
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  await pageBefore.addInitScript(() => {
    const session = {
      student_id: 'a5e9451f-9bb5-493c-8c2d-27dbdcbb5a6e',
      student_name: 'Aditya',
      program_id: 'd9b3e15b-9b4e-4b47-b248-6d8175e11470',
      institution_id: 'e6988891-b3b3-4f9e-b143-df9cbb87841c'
    };
    sessionStorage.setItem('topscore_session', JSON.stringify(session));
    localStorage.setItem('topscore_session', JSON.stringify(session));
  });

  await pageBefore.goto('http://127.0.0.1:5500/test.html?id=31b7ac85-4c44-4a45-81d4-3a077207dc03', { waitUntil: 'networkidle' });
  await pageBefore.waitForTimeout(600);

  await pageBefore.evaluate(() => {
    const preModal = document.getElementById('pre-exam-focus-modal');
    if (preModal) preModal.classList.add('hidden');
    const cheat = document.getElementById('cheat-overlay');
    if (cheat) {
      cheat.style.display = 'flex';
    }
  });
  await pageBefore.waitForTimeout(400);

  const beforeImgPath = path.join(ARTIFACT_DIR, 'cheat_mobile_before.png');
  await pageBefore.screenshot({ path: beforeImgPath });
  await pageBefore.close();

  // 2. Render AFTER (Redesigned ultra-simple 3-tier layout on mobile 390x844)
  const pageAfter = await browser.newPage({ 
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  // HTML + CSS mockup of the redesigned simple anti-cheat overlay
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
          opacity: 0.2;
          filter: blur(4px);
        }
        .mock-header {
          height: 48px;
          background: #111827;
          border-radius: 8px;
          margin-bottom: 16px;
        }
        .mock-card {
          height: 240px;
          background: #1e293b;
          border-radius: 12px;
          margin-bottom: 16px;
        }

        /* Fullscreen Red Warning Overlay with Siren Tone Animation */
        .cheat-overlay-new {
          position: fixed;
          inset: 0;
          z-index: 999999;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          padding: 48px 24px 44px 24px;
          background: radial-gradient(circle at center, rgba(239, 68, 68, 0.96) 0%, rgba(185, 28, 28, 0.98) 60%, rgba(127, 29, 29, 1) 100%);
          animation: redPulse 0.8s ease-in-out infinite alternate;
          color: #ffffff;
          text-align: center;
        }

        @keyframes redPulse {
          0% {
            background-color: rgba(220, 38, 38, 0.94);
            box-shadow: inset 0 0 80px rgba(0, 0, 0, 0.6);
          }
          100% {
            background-color: rgba(239, 68, 68, 1);
            box-shadow: inset 0 0 140px rgba(255, 255, 255, 0.35);
          }
        }

        /* TIER 1: TOP STRIKE TEXT */
        .strike-header-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
        }

        .strike-pill-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 24px;
          background: rgba(0, 0, 0, 0.55);
          border: 2px solid rgba(255, 255, 255, 0.95);
          border-radius: 9999px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          letter-spacing: 1.5px;
          font-size: 1.25rem;
          font-weight: 900;
          color: #ffffff;
          text-transform: uppercase;
        }

        .strike-warning-sub {
          font-size: 0.82rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: 0.5px;
          text-transform: uppercase;
          margin-top: 4px;
        }

        /* TIER 2: CENTER GLOWING RED SIREN */
        .siren-center-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin: auto 0;
          position: relative;
        }

        /* Glowing Siren Beacon Graphic */
        .siren-beacon-glow {
          position: relative;
          width: 180px;
          height: 180px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .siren-pulse-ring {
          position: absolute;
          inset: -15px;
          border-radius: 50%;
          border: 3px solid rgba(255, 255, 255, 0.7);
          animation: ringPulse 1.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }

        .siren-pulse-ring-2 {
          position: absolute;
          inset: -35px;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.35);
          animation: ringPulse 1.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite 0.4s;
        }

        @keyframes ringPulse {
          0% { transform: scale(0.7); opacity: 1; }
          100% { transform: scale(1.35); opacity: 0; }
        }

        .siren-orb {
          width: 140px;
          height: 140px;
          border-radius: 50%;
          background: radial-gradient(circle, #ffffff 0%, #ff4d4d 55%, #990000 100%);
          box-shadow: 0 0 60px #ffffff, 0 0 100px #ff0000, 0 15px 35px rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: beaconFlash 0.5s ease-in-out infinite alternate;
          border: 3px solid #ffffff;
        }

        @keyframes beaconFlash {
          0% { transform: scale(0.95); filter: brightness(0.95); }
          100% { transform: scale(1.05); filter: brightness(1.2); }
        }

        .siren-emoji {
          font-size: 72px;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
          line-height: 1;
        }

        .countdown-countdown-text {
          margin-top: 18px;
          font-size: 1.15rem;
          font-weight: 800;
          color: #ffffff;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .countdown-num-badge {
          background: rgba(0, 0, 0, 0.5);
          padding: 2px 10px;
          border-radius: 6px;
          font-size: 1.35rem;
          font-weight: 900;
          color: #ffeb3b;
          border: 1px solid rgba(255, 235, 59, 0.6);
        }

        /* TIER 3: BOTTOM RETURN BUTTON (MAX THUMB ACCESSIBILITY) */
        .action-tier-wrap {
          width: 100%;
          max-width: 340px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .btn-return-exam {
          width: 100%;
          height: 56px;
          background: #0f172a;
          color: #ffffff;
          border: 2.5px solid #ffffff;
          border-radius: 16px;
          font-family: 'Outfit', sans-serif;
          font-size: 1.15rem;
          font-weight: 800;
          letter-spacing: 0.5px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 255, 255, 0.3);
          cursor: pointer;
          transition: transform 0.15s ease, background 0.15s ease;
        }

        .btn-return-exam:active {
          transform: scale(0.97);
          background: #000000;
        }

        .btn-tap-hint {
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 600;
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
        <!-- TIER 1: STRIKE TEXT -->
        <div class="strike-header-wrap">
          <div class="strike-pill-badge">{ STRIKE 1 / 10 }</div>
          <div class="strike-warning-sub">Security Violation Detected</div>
        </div>

        <!-- TIER 2: GLOWING RED SIREN & COUNTDOWN -->
        <div class="siren-center-wrap">
          <div class="siren-beacon-glow">
            <div class="siren-pulse-ring"></div>
            <div class="siren-pulse-ring-2"></div>
            <div class="siren-orb">
              <span class="siren-emoji">🚨</span>
            </div>
          </div>
          <div class="countdown-countdown-text">
            Auto-submitting in <span class="countdown-num-badge">10s</span>
          </div>
        </div>

        <!-- TIER 3: RETURN TO TEST BUTTON -->
        <div class="action-tier-wrap">
          <button class="btn-return-exam">
            <span>&#x26F6;</span>
            <span>RETURN TO TEST</span>
          </button>
          <div class="btn-tap-hint">Tap above to resume fullscreen &amp; continue</div>
        </div>
      </div>
    </body>
    </html>
  `;

  await pageAfter.setContent(afterHtml);
  await pageAfter.waitForTimeout(600);

  const afterImgPath = path.join(ARTIFACT_DIR, 'cheat_mobile_after.png');
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
      <h1>Anti-Cheat Mobile Warning (HP Portrait 390x844) — Before vs After</h1>
      <p class="sub">Desain simpel 3-tier: {STRIKE 1/10} di atas, Sirine merah menyala di tengah, Tombol kembali besar di bawah</p>

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
            <li>❌ Teks bertumpuk dan padat (4 baris panjang)</li>
            <li>❌ Kotak card mengambang sempit di tengah</li>
            <li>❌ Tombol kembali kecil dan teks panjang bertele-tele</li>
          </ul>
        </div>

        <!-- AFTER -->
        <div class="card">
          <div class="label label-green">
            <span class="badge badge-green">AFTER (Rancangan Simpel Baru)</span>
          </div>
          <div class="phone-frame">
            <img src="data:image/png;base64,${afterBase64}" />
          </div>
          <ul class="points-list">
            <li>✅ <strong>Atas:</strong> <code>{ STRIKE 1 / 10 }</code> jelas &amp; tegas</li>
            <li>✅ <strong>Tengah:</strong> Sirine merah menyala dengan gelombang pulsasi + timer digital</li>
            <li>✅ <strong>Bawah:</strong> Tombol <code>RETURN TO TEST</code> besar (56px) sangat mudah di-tap jempol</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `;

  await pageComp.setContent(compHtml);
  await pageComp.waitForTimeout(600);

  const compImgPath = path.join(ARTIFACT_DIR, 'cheat_mobile_before_after_comparison.png');
  await pageComp.screenshot({ path: compImgPath });
  await pageComp.close();

  await browser.close();
  console.log('Mobile Before vs After generated successfully!');
}

main().catch(console.error);
