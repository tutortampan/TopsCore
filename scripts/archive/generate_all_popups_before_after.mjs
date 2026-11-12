import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/78072b6e-ce0f-42fd-b615-345f2a235172';

async function main() {
  console.log('Generating Before vs After Visual Mockup Boards for Popups...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  // -------------------------------------------------------------
  // BOARD 1: QUESTION MATRIX POPUP (HP PORTRAIT 390x844)
  // -------------------------------------------------------------
  const pageB1 = await browser.newPage({ viewport: { width: 920, height: 960 } });
  const beforeMatrix = fs.readFileSync(path.join(ARTIFACT_DIR, 'modal_before_matrix_mobile.png')).toString('base64');

  // Render After Matrix Mockup
  const pageMatrixAfter = await browser.newPage({ 
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  const matrixAfterHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Outfit:wght@600;700;800;900&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Outfit', 'Inter', sans-serif; }
        body { width: 100vw; height: 100vh; background: #090e1a; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .dimmed-bg { position: absolute; inset: 0; background: rgba(0,0,0,0.65); backdrop-filter: blur(8px); }
        .matrix-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 360px;
          background: #0f172a;
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(56, 189, 248, 0.15);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; }
        .title { font-size: 1.05rem; font-weight: 800; color: #fff; display: flex; align-items: center; gap: 8px; }
        .pill { background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; color: #38bdf8; font-size: 0.72rem; padding: 2px 8px; border-radius: 12px; font-weight: 700; }
        .close-btn { background: none; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer; }
        .legend { display: flex; justify-content: center; gap: 14px; font-size: 0.72rem; color: #94a3b8; }
        .legend-item { display: flex; align-items: center; gap: 5px; }
        .dot { width: 8px; height: 8px; border-radius: 50%; }
        .dot-curr { background: #38bdf8; box-shadow: 0 0 8px #38bdf8; }
        .dot-ans { background: #00c000; box-shadow: 0 0 8px #00c000; }
        .dot-unans { background: #334155; }
        .grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; }
        .q-box {
          height: 34px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.82rem;
          font-weight: 800;
          border: 1px solid rgba(255,255,255,0.08);
          background: #1e293b;
          color: #94a3b8;
        }
        .q-box.active { background: #38bdf8; color: #0f172a; border-color: #ffffff; box-shadow: 0 0 12px rgba(56, 189, 248, 0.6); }
        .q-box.answered { background: rgba(0, 192, 0, 0.2); border-color: #00c000; color: #00e676; }
        .btn-jump {
          height: 48px;
          background: #1e293b;
          border: 1px solid #38bdf8;
          border-radius: 12px;
          color: #38bdf8;
          font-size: 0.95rem;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
        }
      </style>
    </head>
    <body>
      <div class="dimmed-bg"></div>
      <div class="matrix-card">
        <div class="header">
          <div class="title">
            <span>Question Matrix</span>
            <span class="pill">40 Questions</span>
          </div>
          <button class="close-btn">✕</button>
        </div>
        <div class="legend">
          <div class="legend-item"><div class="dot dot-curr"></div><span>Current</span></div>
          <div class="legend-item"><div class="dot dot-ans"></div><span>Answered</span></div>
          <div class="legend-item"><div class="dot dot-unans"></div><span>Unanswered</span></div>
        </div>
        <div class="grid">
          <div class="q-box active">1</div>
          <div class="q-box answered">2</div>
          <div class="q-box answered">3</div>
          <div class="q-box answered">4</div>
          <div class="q-box">5</div>
          <div class="q-box">6</div>
          <div class="q-box">7</div>
          <div class="q-box">8</div>
          <div class="q-box">9</div>
          <div class="q-box">10</div>
          <div class="q-box">11</div>
          <div class="q-box">12</div>
          <div class="q-box">13</div>
          <div class="q-box">14</div>
          <div class="q-box">15</div>
          <div class="q-box">16</div>
          <div class="q-box">17</div>
          <div class="q-box">18</div>
          <div class="q-box">19</div>
          <div class="q-box">20</div>
          <div class="q-box">21</div>
          <div class="q-box">22</div>
          <div class="q-box">23</div>
          <div class="q-box">24</div>
          <div class="q-box">25</div>
          <div class="q-box">26</div>
          <div class="q-box">27</div>
          <div class="q-box">28</div>
          <div class="q-box">29</div>
          <div class="q-box">30</div>
          <div class="q-box">31</div>
          <div class="q-box">32</div>
          <div class="q-box">33</div>
          <div class="q-box">34</div>
          <div class="q-box">35</div>
          <div class="q-box">36</div>
          <div class="q-box">37</div>
          <div class="q-box">38</div>
          <div class="q-box">39</div>
          <div class="q-box">40</div>
        </div>
        <button class="btn-jump">🔍 Jump to Next Unanswered</button>
      </div>
    </body>
    </html>
  `;
  await pageMatrixAfter.setContent(matrixAfterHtml);
  await pageMatrixAfter.waitForTimeout(400);
  const matrixAfterPath = path.join(ARTIFACT_DIR, 'mock_matrix_after.png');
  await pageMatrixAfter.screenshot({ path: matrixAfterPath });
  await pageMatrixAfter.close();

  const afterMatrix = fs.readFileSync(matrixAfterPath).toString('base64');

  const b1Html = `
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
        .spec-list { margin-top: 12px; font-size: 11.5px; color: #94A3B8; line-height: 1.6; width: 100%; padding-left: 8px; }
        .spec-list b { color: #F1F5F9; }
      </style>
    </head>
    <body>
      <h1>Modal 1: Question Matrix Grid (HP Portrait 390x844)</h1>
      <p class="sub">Tampilan Kisi Soal: 8 Kolom Ergonomis, Legend Status Jelas, dan Tombol Lompat Thumb-Friendly</p>

      <div class="grid">
        <div class="card">
          <div class="label label-red"><span class="badge badge-red">BEFORE (Kondisi Saat Ini)</span></div>
          <div class="phone-frame"><img src="data:image/png;base64,${beforeMatrix}" /></div>
          <ul class="spec-list">
            <li>❌ 10 kolom kecil (26px) sempit untuk sentuhan jempol</li>
            <li>❌ Tombol Submit TEST hijau gelap menduplikasi flow Give Up</li>
            <li>❌ Tidak ada legenda warna status soal (Current/Answered)</li>
          </ul>
        </div>
        <div class="card">
          <div class="label label-green"><span class="badge badge-green">AFTER (Rancangan Modern &amp; Sleek)</span></div>
          <div class="phone-frame"><img src="data:image/png;base64,${afterMatrix}" /></div>
          <ul class="spec-list">
            <li>✅ <strong>8 Kolom Lebar (34px touch target)</strong> sangat nyaman di-tap</li>
            <li>✅ <strong>Legenda Status:</strong> Current (Biru), Answered (Hijau), Unanswered</li>
            <li>✅ <strong>Fokus Navigasi:</strong> Tombol Jump to Next Unanswered tunggal yang tegas</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `;
  await pageB1.setContent(b1Html);
  await pageB1.waitForTimeout(600);
  const b1Path = path.join(ARTIFACT_DIR, 'popup_comparison_matrix.png');
  await pageB1.screenshot({ path: b1Path });
  await pageB1.close();
  console.log('✔ Board 1 generated: popup_comparison_matrix.png');

  // -------------------------------------------------------------
  // BOARD 2: GENDER SETUP ONBOARDING MODAL (HP PORTRAIT)
  // -------------------------------------------------------------
  const pageB2 = await browser.newPage({ viewport: { width: 920, height: 960 } });
  const beforeGender = fs.readFileSync(path.join(ARTIFACT_DIR, 'modal_before_gender_setup_mobile.png')).toString('base64');

  const pageGenderAfter = await browser.newPage({ 
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });

  const genderAfterHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Outfit:wght@600;700;800;900&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Outfit', 'Inter', sans-serif; }
        body { width: 100vw; height: 100vh; background: #090e1a; display: flex; align-items: center; justify-content: center; padding: 16px; }
        .dimmed-bg { position: absolute; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); }
        .setup-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 350px;
          background: #0f172a;
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          border-radius: 24px;
          padding: 28px 22px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), 0 0 35px rgba(56, 189, 248, 0.15);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 20px;
        }
        .icon-sparkle { font-size: 3rem; line-height: 1; filter: drop-shadow(0 0 15px rgba(255, 215, 0, 0.6)); }
        .title { font-size: 1.25rem; font-weight: 800; color: #fff; margin-bottom: 4px; }
        .desc { font-size: 0.82rem; color: #94a3b8; line-height: 1.4; }
        .gender-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; width: 100%; }
        .g-card {
          background: #1e293b;
          border: 2px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .g-card.selected {
          border-color: #38bdf8;
          background: rgba(56, 189, 248, 0.12);
          box-shadow: 0 0 20px rgba(56, 189, 248, 0.35);
        }
        .avatar { font-size: 2.8rem; line-height: 1; }
        .g-name { font-size: 1rem; font-weight: 800; color: #fff; }
        .g-pill { font-size: 0.72rem; padding: 2px 10px; border-radius: 9999px; background: rgba(56, 189, 248, 0.2); color: #38bdf8; font-weight: 700; }
        .note { font-size: 0.74rem; color: #64748b; line-height: 1.3; }
        .btn-submit {
          width: 100%;
          height: 52px;
          background: linear-gradient(180deg, #0284c7 0%, #0369a1 100%);
          border: 1.5px solid #38bdf8;
          border-radius: 14px;
          color: #fff;
          font-size: 1.05rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 8px 20px rgba(2, 132, 199, 0.4);
        }
      </style>
    </head>
    <body>
      <div class="dimmed-bg"></div>
      <div class="setup-card">
        <div class="icon-sparkle">🌟</div>
        <div>
          <div class="title">Personalize Your Account</div>
          <div class="desc">Welcome to TOPS CORE! Select your gender to set your title (<strong>Mr.</strong> / <strong>Miss</strong>):</div>
        </div>
        <div class="gender-grid">
          <div class="g-card selected">
            <div class="avatar">👨</div>
            <div class="g-name">Male</div>
            <div class="g-pill">Title: Mr.</div>
          </div>
          <div class="g-card">
            <div class="avatar">👩</div>
            <div class="g-name">Female</div>
            <div class="g-pill">Title: Miss</div>
          </div>
        </div>
        <div class="note">ℹ️ You can change this anytime later from your Profile settings.</div>
        <button class="btn-submit">Confirm &amp; Continue →</button>
      </div>
    </body>
    </html>
  `;
  await pageGenderAfter.setContent(genderAfterHtml);
  await pageGenderAfter.waitForTimeout(400);
  const genderAfterPath = path.join(ARTIFACT_DIR, 'mock_gender_after.png');
  await pageGenderAfter.screenshot({ path: genderAfterPath });
  await pageGenderAfter.close();

  const afterGender = fs.readFileSync(genderAfterPath).toString('base64');

  const b2Html = `
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
        .spec-list { margin-top: 12px; font-size: 11.5px; color: #94A3B8; line-height: 1.6; width: 100%; padding-left: 8px; }
        .spec-list b { color: #F1F5F9; }
      </style>
    </head>
    <body>
      <h1>Modal 2: Onboarding Gender Setup (HP Portrait 390x844)</h1>
      <p class="sub">Perbaikan Mojibake Icon 🌟 &amp; Format Kompak 2 Kolom Side-by-Side</p>

      <div class="grid">
        <div class="card">
          <div class="label label-red"><span class="badge badge-red">BEFORE (Kondisi Saat Ini)</span></div>
          <div class="phone-frame"><img src="data:image/png;base64,${beforeGender}" /></div>
          <ul class="spec-list">
            <li>❌ <b>Bug Karakter Rusak:</b> <code>ðŸŒŸ</code> mojibake akibat ANSI/UTF-8 issue</li>
            <li>❌ Pilihan Male / Female bertumpuk vertikal memakan layar HP</li>
            <li>❌ Tampilan memanjang ke bawah</li>
          </ul>
        </div>
        <div class="card">
          <div class="label label-green"><span class="badge badge-green">AFTER (Rancangan Modern &amp; Sleek)</span></div>
          <div class="phone-frame"><img src="data:image/png;base64,${afterGender}" /></div>
          <ul class="spec-list">
            <li>✅ <b>Icon Sempurna:</b> 🌟 Sparkling Star bersih ber-glow kuning</li>
            <li>✅ <b>Kompak 2 Kolom Side-by-Side:</b> Pas di layar HP dalam 1 tampilan utuh</li>
            <li>✅ <b>Active State Glowing:</b> Border tactical blue `#38bdf8` saat dipilih</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `;
  await pageB2.setContent(b2Html);
  await pageB2.waitForTimeout(600);
  const b2Path = path.join(ARTIFACT_DIR, 'popup_comparison_gender_setup.png');
  await pageB2.screenshot({ path: b2Path });
  await pageB2.close();
  console.log('✔ Board 2 generated: popup_comparison_gender_setup.png');

  // -------------------------------------------------------------
  // BOARD 3: ADMIN DELETE CONFIRMATION (DESKTOP LANDSCAPE 1440x900)
  // -------------------------------------------------------------
  const pageB3 = await browser.newPage({ viewport: { width: 1200, height: 750 } });
  const beforeAdminDel = fs.readFileSync(path.join(ARTIFACT_DIR, 'modal_before_admin_delete_desktop.png')).toString('base64');

  const pageAdminDelAfter = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const adminDelAfterHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Outfit:wght@600;700;800;900&display=swap" rel="stylesheet">
      <style>
        :root { --grade-e: #ff0000; --grade-e-rgb: 255, 0, 0; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Outfit', 'Inter', sans-serif; }
        body { width: 100vw; height: 100vh; background: #070B14; display: flex; align-items: center; justify-content: center; }
        .dimmed-bg { position: absolute; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(10px); }
        .del-card {
          position: relative;
          z-index: 10;
          width: 100%;
          max-width: 440px;
          background: #0f172a;
          border: 1.5px solid rgba(var(--grade-e-rgb), 0.45);
          border-radius: 20px;
          padding: 32px 28px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(var(--grade-e-rgb), 0.25);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 20px;
        }
        .warn-icon-wrap {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: rgba(var(--grade-e-rgb), 0.12);
          border: 2px solid var(--grade-e);
          box-shadow: 0 0 25px rgba(var(--grade-e-rgb), 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
        }
        .title { font-size: 1.35rem; font-weight: 800; color: #fff; margin-bottom: 6px; }
        .desc { font-size: 0.88rem; color: #94a3b8; line-height: 1.5; }
        .btn-row { display: flex; gap: 14px; width: 100%; margin-top: 6px; }
        .btn-cancel {
          flex: 1;
          height: 48px;
          background: #1e293b;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 12px;
          color: #94a3b8;
          font-size: 0.95rem;
          font-weight: 700;
          cursor: pointer;
        }
        .btn-del {
          flex: 1;
          height: 48px;
          background: linear-gradient(180deg, #1c0f13 0%, #12080a 100%);
          border: 1.5px solid var(--grade-e);
          border-radius: 12px;
          color: var(--grade-e);
          font-size: 0.95rem;
          font-weight: 800;
          cursor: pointer;
          box-shadow: 0 0 16px rgba(var(--grade-e-rgb), 0.35);
        }
      </style>
    </head>
    <body>
      <div class="dimmed-bg"></div>
      <div class="del-card">
        <div class="warn-icon-wrap">⚠️</div>
        <div>
          <div class="title">Delete Record?</div>
          <div class="desc">This action soft-deletes the record. Historical learning progress and attempt results are safely preserved.</div>
        </div>
        <div class="btn-row">
          <button class="btn-cancel">Cancel</button>
          <button class="btn-del">Delete Record</button>
        </div>
      </div>
    </body>
    </html>
  `;
  await pageAdminDelAfter.setContent(adminDelAfterHtml);
  await pageAdminDelAfter.waitForTimeout(400);
  const adminDelAfterPath = path.join(ARTIFACT_DIR, 'mock_admin_delete_after.png');
  await pageAdminDelAfter.screenshot({ path: adminDelAfterPath });
  await pageAdminDelAfter.close();

  const afterAdminDel = fs.readFileSync(adminDelAfterPath).toString('base64');

  const b3Html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
        body { background: #070B14; color: #fff; padding: 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
        h1 { font-size: 20px; font-weight: 800; margin-bottom: 4px; text-align: center; }
        p.sub { font-size: 13px; color: #94A3B8; margin-bottom: 20px; text-align: center; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; width: 100%; max-width: 1140px; }
        .card { background: #0D1424; border: 1px solid #1E293B; border-radius: 14px; padding: 14px; display: flex; flex-direction: column; }
        .label { font-size: 13px; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .label-red { color: #FF6B6B; }
        .label-green { color: #00E676; }
        .badge { padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .badge-red { background: rgba(255, 77, 77, 0.2); border: 1px solid #FF4D4D; }
        .badge-green { background: rgba(0, 230, 118, 0.2); border: 1px solid #00E676; }
        .screen-frame { width: 100%; border-radius: 10px; overflow: hidden; border: 1px solid #334155; }
        .screen-frame img { width: 100%; height: auto; display: block; }
        .spec-list { margin-top: 12px; font-size: 12px; color: #94A3B8; line-height: 1.6; padding-left: 8px; }
        .spec-list b { color: #F1F5F9; }
      </style>
    </head>
    <body>
      <h1>Modal 3: Admin Delete Confirmation (Desktop Landscape 1440x900)</h1>
      <p class="sub">Penyelarasan Desain Aksen Merah Sistem (Grade E: var(--grade-e))</p>

      <div class="grid">
        <div class="card">
          <div class="label label-red"><span class="badge badge-red">BEFORE (Kondisi Saat Ini)</span></div>
          <div class="screen-frame"><img src="data:image/png;base64,${beforeAdminDel}" /></div>
          <ul class="spec-list">
            <li>❌ Kotak dasar sederhana tanpa aksen penegasan bahaya</li>
            <li>❌ Tombol delete merah gelap datar (.btn-danger)</li>
          </ul>
        </div>
        <div class="card">
          <div class="label label-green"><span class="badge badge-green">AFTER (Rancangan Modern &amp; Sleek)</span></div>
          <div class="screen-frame"><img src="data:image/png;base64,${afterAdminDel}" /></div>
          <ul class="spec-list">
            <li>✅ <b>Aksen Grade E Murni:</b> Border glowing merah <code>var(--grade-e)</code> elegan</li>
            <li>✅ <b>Warning Icon Badge:</b> Lingkaran neon 64px dengan icon ⚠️ berwibawa</li>
            <li>✅ <b>Tombol Aksi Bahaya:</b> Dark red gradient dengan border merah menyala (selaras dengan tombol Give Up)</li>
          </ul>
        </div>
      </div>
    </body>
    </html>
  `;
  await pageB3.setContent(b3Html);
  await pageB3.waitForTimeout(600);
  const b3Path = path.join(ARTIFACT_DIR, 'popup_comparison_admin_delete.png');
  await pageB3.screenshot({ path: b3Path });
  await pageB3.close();
  console.log('✔ Board 3 generated: popup_comparison_admin_delete.png');

  await browser.close();
  console.log('All Before & After Comparison Boards generated successfully!');
}

main().catch(console.error);
