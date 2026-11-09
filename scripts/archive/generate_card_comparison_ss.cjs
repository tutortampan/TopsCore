const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generateComparison() {
  const outputPath = 'C:/Users/Top/.gemini/antigravity/brain/69ab61e0-23a0-47b1-9eda-f47bdd9d599a/comparison_session_card_new_vs_current.png';

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Perbandingan Desain Exam Card Session - Versi Warna</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      background: #060a12;
      color: #f1f5f9;
      padding: 28px;
      display: flex;
      flex-direction: column;
      gap: 28px;
      width: 1240px;
    }
    .header-banner {
      background: linear-gradient(135deg, #0f172a, #0b1329);
      border: 1px solid rgba(56, 189, 248, 0.3);
      border-radius: 12px;
      padding: 18px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 10px 25px rgba(0,0,0,0.6);
    }
    .header-banner h1 {
      font-size: 1.4rem;
      font-weight: 800;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-banner p {
      font-size: 0.85rem;
      color: #94a3b8;
      margin-top: 4px;
    }
    .palette-legend {
      display: flex;
      align-items: center;
      gap: 12px;
      background: rgba(255,255,255,0.04);
      padding: 6px 14px;
      border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.08);
      font-size: 0.75rem;
      font-weight: 700;
    }
    .color-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .comparison-section {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .section-title {
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section-title.current {
      color: #f87171;
    }
    .section-title.new {
      color: #38bdf8;
    }
    .section-title span.tag {
      font-size: 0.72rem;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
    }
    .tag-current {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid #ef4444;
      color: #fca5a5;
    }
    .tag-new {
      background: rgba(56, 189, 248, 0.2);
      border: 1px solid #38bdf8;
      color: #7dd3fc;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    /* CARD STYLING */
    .exam-card {
      background: #0b1329;
      border-radius: 12px;
      padding: 16px 18px;
      display: flex;
      flex-direction: column;
      position: relative;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    }

    /* CARD THEMES - OUTLINE ACCENT */
    .card-locked-existing {
      border: 1px solid rgba(168, 85, 247, 0.35);
    }
    .card-live-existing {
      border: 1px solid rgba(245, 158, 11, 0.45);
    }

    .card-wireframe-frame {
      border: 2px solid #0099ff;
      background: #0284c7;
      padding: 10px;
      border-radius: 10px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .card-wireframe-inner {
      background: #0b1329;
      border-radius: 8px;
      padding: 14px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      height: 100%;
    }

    /* METADATA ROW */
    .card-meta-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
    }
    .theme-pill {
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .pill-theme-b {
      background: rgba(168, 85, 247, 0.2);
      color: #d8b4fe;
      border: 1px solid rgba(168, 85, 247, 0.4);
    }
    .pill-theme-c {
      background: rgba(245, 158, 11, 0.2);
      color: #fde047;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .meta-badges {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .duration-badge {
      font-size: 0.72rem;
      font-weight: 700;
      color: #cbd5e1;
      background: rgba(255,255,255,0.06);
      padding: 2px 7px;
      border-radius: 4px;
      border: 1px solid rgba(255,255,255,0.1);
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .card-title {
      font-size: 1.15rem;
      font-weight: 800;
      color: #ffffff;
      margin-top: 4px;
    }
    .card-submodules {
      font-size: 0.78rem;
      color: #94a3b8;
      margin-top: 3px;
      display: flex;
      gap: 8px;
    }

    /* BOXES & BUTTONS IN EXISTING */
    .locked-box-existing {
      background: rgba(245, 158, 11, 0.05);
      border: 1px solid rgba(245, 158, 11, 0.18);
      border-radius: 8px;
      padding: 10px 14px;
    }
    .live-banner-existing {
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    /* --- VERSI WARNA USER WIREFRAME (EXACT MAPPING) --- */
    .block-metadata-colored {
      background: #021a44;
      border: 1px solid #1e3a8a;
      border-radius: 8px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-height: 70px;
    }
    .block-row-buttons {
      display: flex;
      gap: 10px;
      height: 60px;
    }
    
    /* Tombol NORMAL (Hijau) */
    .btn-wireframe-normal {
      background: #00a82d;
      border: 1px solid #008022;
      color: #ffffff;
      font-weight: 800;
      font-size: 0.88rem;
      letter-spacing: 0.04em;
      flex: 1;
      height: 100%;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(0, 168, 45, 0.35);
      cursor: pointer;
    }

    /* Tombol REMIDI (Kuning Cerah) */
    .btn-wireframe-remidi {
      background: #ffe600;
      border: 1px solid #d4c000;
      color: #0f172a;
      font-weight: 900;
      font-size: 0.88rem;
      letter-spacing: 0.04em;
      flex: 1;
      height: 100%;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: 0 4px 12px rgba(255, 230, 0, 0.3);
      cursor: pointer;
    }

    /* Kotak LOCKED (Merah) */
    .box-wireframe-locked {
      background: #e60000;
      border: 1px solid #b30000;
      color: #ffffff;
      font-weight: 800;
      font-size: 0.88rem;
      letter-spacing: 0.04em;
      width: 100%;
      height: 60px;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 14px rgba(230, 0, 0, 0.35);
    }

    /* Tombol LIVE VIEW (Deep Navy / Royal Blue Lebar Penuh di Tengah) */
    .btn-wireframe-live-view {
      background: #021a44;
      border: 2px solid #2563eb;
      color: #ffffff;
      font-weight: 900;
      font-size: 0.95rem;
      letter-spacing: 0.05em;
      width: 100%;
      height: 60px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      box-shadow: 0 4px 18px rgba(37, 99, 235, 0.45);
      cursor: pointer;
    }

    /* Tombol +LATE STUDENTS (Hijau) */
    .btn-wireframe-late {
      background: #00a82d;
      border: 1px solid #008022;
      color: #ffffff;
      font-weight: 800;
      font-size: 0.78rem;
      flex: 1;
      height: 100%;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      box-shadow: 0 4px 10px rgba(0, 168, 45, 0.3);
      cursor: pointer;
    }

    /* Tombol EDIT TIME (Kuning Cerah) */
    .btn-wireframe-edit-time {
      background: #ffe600;
      border: 1px solid #d4c000;
      color: #0f172a;
      font-weight: 900;
      font-size: 0.78rem;
      flex: 1;
      height: 100%;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      box-shadow: 0 4px 10px rgba(255, 230, 0, 0.3);
      cursor: pointer;
    }

    /* Tombol CLOSE SESSION (Merah) */
    .btn-wireframe-close {
      background: #e60000;
      border: 1px solid #b30000;
      color: #ffffff;
      font-weight: 800;
      font-size: 0.78rem;
      flex: 1;
      height: 100%;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      box-shadow: 0 4px 10px rgba(230, 0, 0, 0.3);
      cursor: pointer;
    }

    .diff-callout {
      background: rgba(15, 23, 42, 0.9);
      border-left: 4px solid #38bdf8;
      border-radius: 0 8px 8px 0;
      padding: 12px 16px;
      font-size: 0.82rem;
      color: #cbd5e1;
      line-height: 1.5;
    }
  </style>
</head>
<body>

  <!-- HEADER BANNER -->
  <div class="header-banner">
    <div>
      <h1><span>🎨</span> Komparasi Desain: Versi Warna Wireframe vs Desain Lama</h1>
      <p>Mapping warna semantik: Hijau (Normal/Late) • Kuning (Remidi/Edit Time) • Merah (Locked/Close Session) • Deep Navy (Metadata & Live View)</p>
    </div>
    <div class="palette-legend">
      <span class="color-pill"><span class="dot" style="background:#00a82d;"></span> Hijau</span>
      <span class="color-pill"><span class="dot" style="background:#ffe600;"></span> Kuning</span>
      <span class="color-pill"><span class="dot" style="background:#e60000;"></span> Merah</span>
      <span class="color-pill"><span class="dot" style="background:#021a44; border:1px solid #38bdf8;"></span> Deep Navy</span>
    </div>
  </div>

  <!-- SECTION 1: SEKARANG (CURRENT - GAMBAR 2) -->
  <div class="comparison-section">
    <div class="section-title current">
      <span>❌ DESAIN SAAT INI (EXISTING - GAMBAR 2)</span>
      <span class="tag tag-current">Hierarki Terbalik & Tombol Melorot</span>
    </div>

    <div class="cards-grid">
      <!-- LOCKED CARD CURRENT -->
      <div class="exam-card card-locked-existing" style="gap: 12px;">
        <div>
          <div class="card-meta-top">
            <span class="theme-pill pill-theme-b">THEME B</span>
            <div class="meta-badges">
              <span class="duration-badge">⏱️ 120 Mins</span>
              <span style="font-size:0.75rem; color:#94a3b8;">1 Module</span>
            </div>
          </div>
          <h4 class="card-title">Tourism Test</h4>
          <div class="card-submodules">
            <span>📝 Words (Written)</span> &bull; <span>💬 Phrases (Dropdown)</span>
          </div>
        </div>

        <div class="locked-box-existing" style="margin-top:4px;">
          <div style="display:flex; justify-content:space-between; color:#fbbf24; font-size:0.8rem; font-weight:700;">
            <span>🔒 LOCKED &bull; No Active Session</span>
            <span>⏱️ 120 Mins</span>
          </div>
          <div style="font-size:0.72rem; color:#94a3b8; margin-top:2px;">Prerequisites: 4 Quizzes Theme B (Min 60%)</div>
        </div>

        <div style="display:flex; gap:8px; margin-top:auto;">
          <button style="background:#00c000; border:none; color:#fff; font-weight:700; padding:9px; border-radius:6px; flex:1; font-size:0.8rem;">🟢 Open Normal</button>
          <button style="background:rgba(245,158,11,0.15); border:1px solid #f59e0b; color:#fbbf24; font-weight:700; padding:9px; border-radius:6px; flex:1; font-size:0.8rem;">🟡 Open Remedial</button>
        </div>
      </div>

      <!-- LIVE CARD CURRENT -->
      <div class="exam-card card-live-existing" style="gap: 10px;">
        <div>
          <div class="card-meta-top">
            <span class="theme-pill pill-theme-c">THEME C</span>
            <div class="meta-badges">
              <span class="duration-badge">⏱️ 120 Mins</span>
              <span style="font-size:0.75rem; color:#94a3b8;">1 Module</span>
            </div>
          </div>
          <h4 class="card-title">CCU Test</h4>
          <div class="card-submodules">
            <span>📝 Words (Written)</span> &bull; <span>💬 Phrases (Dropdown)</span>
          </div>
        </div>

        <div class="live-banner-existing">
          <span style="color:#34d399; font-weight:800; font-size:0.82rem;">🟢 LIVE (12m remaining)</span>
          <span style="font-size:0.7rem; font-weight:800; background:rgba(0,192,0,0.2); color:#86efac; padding:2px 6px; border-radius:4px;">NORMAL (FULL SCORE)</span>
        </div>
        <div style="font-size:0.75rem; color:#94a3b8; margin-top:-4px;">👥 134 &bull; 9 Enrolled Students</div>

        <div style="display:flex; gap:6px; margin-top:auto;">
          <button style="background:#00c000; border:none; color:#fff; font-weight:700; padding:8px 4px; border-radius:6px; flex:1; font-size:0.75rem;">👥 + Students</button>
          <button style="background:#1e293b; border:1px solid #334155; color:#94a3b8; font-weight:700; padding:8px 4px; border-radius:6px; flex:1; font-size:0.75rem;">⏱️</button>
          <button style="background:#dc2626; border:none; color:#fff; font-weight:700; padding:8px 4px; border-radius:6px; flex:1; font-size:0.75rem;">🔒 Close Session</button>
        </div>

        <button style="background:linear-gradient(135deg,#2563eb,#1d4ed8); border:none; color:#fff; font-weight:700; padding:9px; border-radius:6px; width:100%; font-size:0.82rem;">
          👁️ Monitor Live & Status Ujian (9)
        </button>
      </div>
    </div>
  </div>

  <!-- SECTION 2: VERSI WARNA TERBARU (USER WIREFRAME DENGAN PALET WARNA LENGKAP) -->
  <div class="comparison-section">
    <div class="section-title new">
      <span>✨ DESAIN BARU — VERSI WARNA USER WIREFRAME (GRID 10px / TINGGI 80px)</span>
      <span class="tag tag-new">Sesuai Wireframe Warna User</span>
    </div>

    <div class="cards-grid">
      <!-- LOCKED CARD WIREFRAME COLORED -->
      <div class="card-wireframe-frame">
        <div class="card-wireframe-inner">
          <!-- BARIS 1: TEST METADATA (DEEP NAVY) -->
          <div class="block-metadata-colored">
            <div class="card-meta-top">
              <span class="theme-pill pill-theme-b">THEME B</span>
              <div class="meta-badges">
                <span class="duration-badge">⏱️ 120 Mins</span>
                <span style="font-size:0.72rem; color:#94a3b8;">1 Module</span>
              </div>
            </div>
            <div style="font-size:1.15rem; font-weight:900; color:#ffffff; margin-top:3px;">Tourism Test</div>
            <div style="font-size:0.75rem; color:#93c5fd; margin-top:2px;">📝 Words (Written) &bull; 💬 Phrases (Dropdown)</div>
          </div>

          <!-- BARIS 2: NORMAL (HIJAU) | REMIDI (KUNING) -->
          <div class="block-row-buttons">
            <button class="btn-wireframe-normal">
              <span>🟢</span> NORMAL
            </button>
            <button class="btn-wireframe-remidi">
              <span>🟡</span> REMIDI
            </button>
          </div>

          <!-- BARIS 3: LOCKED (MERAH) -->
          <div class="box-wireframe-locked">
            <div style="font-size:0.92rem; font-weight:900; display:flex; align-items:center; gap:6px;">
              <span>🔒</span> LOCKED &bull; NO ACTIVE SESSION
            </div>
            <div style="font-size:0.72rem; color:#fecaca; margin-top:2px; font-weight:600;">
              Prerequisites: 4 Quizzes Theme B (Min 60%)
            </div>
          </div>
        </div>
      </div>

      <!-- LIVE CARD WIREFRAME COLORED -->
      <div class="card-wireframe-frame">
        <div class="card-wireframe-inner">
          <!-- BARIS 1: TEST METADATA + LIVE BADGE (DEEP NAVY) -->
          <div class="block-metadata-colored">
            <div class="card-meta-top">
              <span class="theme-pill pill-theme-c">THEME C</span>
              <div class="meta-badges">
                <span style="font-size:0.72rem; font-weight:800; padding:2px 7px; border-radius:4px; background:rgba(0,192,0,0.25); border:1px solid #00c000; color:#86efac;">
                  🟢 LIVE (12m left)
                </span>
                <span class="duration-badge">👥 134 &bull; 9 Siswa</span>
              </div>
            </div>
            <div style="font-size:1.15rem; font-weight:900; color:#ffffff; margin-top:3px;">CCU Test</div>
            <div style="font-size:0.75rem; color:#93c5fd; margin-top:2px;">📝 Words (Written) &bull; 💬 Phrases (Dropdown)</div>
          </div>

          <!-- BARIS 2: LIVE VIEW (DEEP NAVY / ROYAL BLUE) -->
          <div style="height:60px;">
            <button class="btn-wireframe-live-view">
              <span>👁️</span> LIVE VIEW &bull; MONITOR REALTIME (9 SISWA)
            </button>
          </div>

          <!-- BARIS 3: +LATE STUDENTS (HIJAU) | EDIT TIME (KUNING) | CLOSE SESSION (MERAH) -->
          <div class="block-row-buttons">
            <button class="btn-wireframe-late" title="Tambah Siswa Susulan">
              <span>👥</span> +LATE STUDENTS
            </button>
            <button class="btn-wireframe-edit-time" title="Perpanjang Waktu Ujian">
              <span>⏱️</span> EDIT TIME
            </button>
            <button class="btn-wireframe-close" title="Tutup Sesi Ujian">
              <span>🔒</span> CLOSE SESSION
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- CALLOUT PENJELASAN WARNA -->
    <div class="diff-callout">
      <strong>🎯 Harmonisasi Warna Semantik (Semantic Palette Mapping):</strong><br>
      &bull; <strong style="color:#00a82d;">HIJAU (#00a82d)</strong>: Digunakan untuk aksi positif/buka/tambah &rarr; <code>NORMAL</code> (buka ujian penuh) dan <code>+LATE STUDENTS</code> (tambah siswa).<br>
      &bull; <strong style="color:#ffe600;">KUNING (#ffe600)</strong>: Digunakan untuk penyesuaian/remedial &rarr; <code>REMIDI</code> (ujian remedial cap 60%) dan <code>EDIT TIME</code> (perpanjang durasi waktu).<br>
      &bull; <strong style="color:#e60000;">MERAH (#e60000)</strong>: Digunakan untuk status tertutup/berbahaya &rarr; <code>LOCKED</code> (status ujian terkunci) dan <code>CLOSE SESSION</code> (tutup sesi live).<br>
      &bull; <strong style="color:#38bdf8;">DEEP NAVY / BLUE (#021a44 / #2563eb)</strong>: Digunakan untuk area informasi utama &rarr; <code>TEST METADATA</code> dan <code>LIVE VIEW</code>.
    </div>
  </div>

</body>
</html>
  `;

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,1180']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1140, deviceScaleFactor: 2 });
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: outputPath, fullPage: true });
  await browser.close();

  console.log('SUCCESS: Color comparison screenshot generated at: ' + outputPath);
}

generateComparison().catch(err => {
  console.error('ERROR generating screenshot:', err);
  process.exit(1);
});
