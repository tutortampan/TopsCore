import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 750 } });

  const beforeBase64 = fs.readFileSync(path.join(ARTIFACT_DIR, 'audit_cheat_overlay.png')).toString('base64');
  const afterBase64 = fs.readFileSync(path.join(ARTIFACT_DIR, 'audit_cheat_overlay_proposed.png')).toString('base64');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        body { background: #070B14; color: #fff; padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; overflow: hidden; }
        h1 { font-size: 20px; font-weight: 800; margin-bottom: 6px; letter-spacing: 0.5px; text-align: center; }
        p.sub { font-size: 13px; color: #94A3B8; margin-bottom: 20px; text-align: center; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; width: 100%; max-width: 1320px; }
        .card { background: #0D1424; border: 1px solid #1E293B; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; }
        .label { font-size: 13px; font-weight: 800; margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
        .label-red { color: #FF4D4D; }
        .label-green { color: #00C000; }
        .img-wrap { width: 100%; border-radius: 8px; overflow: hidden; border: 1px solid #334155; }
        img { width: 100%; height: auto; display: block; }
        .badge { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .badge-red { background: rgba(255, 77, 77, 0.2); border: 1px solid #FF4D4D; }
        .badge-green { background: rgba(0, 192, 0, 0.2); border: 1px solid #00C000; }
        .notes { font-size: 12px; color: #94a3b8; margin-top: 10px; line-height: 1.4; }
      </style>
    </head>
    <body>
      <h1>Anti-Cheat Violation Overlay (Cheat Modal) — Evaluasi Desain</h1>
      <p class="sub">Penerapan filosofi baru: warna merah murni digunakan <strong>strictly sebagai aksen</strong> di atas permukaan dark theme</p>
      
      <div class="grid">
        <div class="card">
          <div class="label label-red">
            <span class="badge badge-red">Kondisi Sekarang</span>
            <span>Full-screen Red Strobe / Solid Blinding Flood</span>
          </div>
          <div class="img-wrap">
            <img src="data:image/png;base64,${beforeBase64}" />
          </div>
          <p class="notes">❌ Layar penuh berkedip merah terang (0.4s flash). Sangat silau di mata siswa dan tidak konsisten dengan tema dark slate TopsCore.</p>
        </div>

        <div class="card">
          <div class="label label-green">
            <span class="badge badge-green">Rancangan Baru (Aksen Sistem)</span>
            <span>Dark Slate Surface + Glowing Red Accent</span>
          </div>
          <div class="img-wrap">
            <img src="data:image/png;base64,${afterBase64}" />
          </div>
          <p class="notes">✅ Latar gelap tembus pandang (blur), kotak dark slate, warna merah dipakai strictly sebagai aksen (border glowing, strike pill, countdown ring, &amp; tombol).</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await page.setContent(html);
  await page.waitForTimeout(600);
  const outPath = path.join(ARTIFACT_DIR, 'cheat_overlay_comparison.png');
  await page.screenshot({ path: outPath });
  await page.close();
  await browser.close();
  console.log('Side-by-side comparison artifact generated:', outPath);
}

main().catch(console.error);
