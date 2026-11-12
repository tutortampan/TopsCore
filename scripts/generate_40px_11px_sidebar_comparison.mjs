import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece';

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Spatial & Typography Exploration: 50px vs 40px, 12px vs 11px, Bold vs Clean Sidebar</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #060b18;
      color: #f8fafc;
      font-family: 'Inter', sans-serif;
      padding: 30px;
      display: flex;
      flex-direction: column;
      gap: 30px;
      width: 1360px;
    }
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 26px;
      font-weight: 800;
      color: #ffffff;
      border-bottom: 2px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 12px;
    }
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .board-card {
      background: #0f172a;
      border-radius: 14px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .card-title-bar {
      padding: 12px 18px;
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .card-title-bar.current {
      background: rgba(56, 189, 248, 0.12);
      color: #38bdf8;
      border-bottom: 1px solid rgba(56, 189, 248, 0.25);
    }
    .card-title-bar.proposed {
      background: rgba(168, 85, 247, 0.15);
      color: #c084fc;
      border-bottom: 1px solid rgba(168, 85, 247, 0.3);
    }
    .card-body {
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      flex: 1;
    }
    .badge-pill {
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .badge-curr { background: #0284c7; color: #ffffff; }
    .badge-prop { background: #9333ea; color: #ffffff; }

    /* Chrome Mockups */
    .mock-chrome {
      background: #090d16;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    /* Topbar 50px */
    .topbar-50 {
      height: 50px;
      padding: 0 16px;
      background: rgba(15, 23, 42, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    /* Topbar 40px */
    .topbar-40 {
      height: 40px;
      padding: 0 14px;
      background: rgba(15, 23, 42, 0.95);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .brand-title {
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 15px;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .topbar-tabs {
      display: flex;
      gap: 6px;
    }
    .tab-pill-38 {
      height: 38px;
      padding: 0 14px;
      background: #1e293b;
      border-radius: 6px 6px 0 0;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      color: #94a3b8;
    }
    .tab-pill-38.active {
      background: #090d16;
      color: #38bdf8;
      border-top: 2px solid #38bdf8;
    }
    .tab-pill-30 {
      height: 30px;
      padding: 0 12px;
      background: #1e293b;
      border-radius: 5px 5px 0 0;
      font-size: 11px;
      font-weight: 600;
      display: flex;
      align-items: center;
      color: #94a3b8;
    }
    .tab-pill-30.active {
      background: #090d16;
      color: #c084fc;
      border-top: 2px solid #c084fc;
    }

    /* Lower panel 50px */
    .lower-50 {
      height: 50px;
      padding: 0 14px;
      background: #0f172a;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    /* Lower panel 40px */
    .lower-40 {
      height: 40px;
      padding: 0 12px;
      background: #0f172a;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .btn-action-32 {
      height: 32px;
      padding: 0 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #0284c7;
      color: #ffffff;
      border: 1px solid #38bdf8;
    }
    .btn-action-28 {
      height: 28px;
      padding: 0 12px;
      border-radius: 5px;
      font-size: 11px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #7e22ce;
      color: #ffffff;
      border: 1px solid #c084fc;
    }

    /* Table Mockups: 12px vs 11px */
    table.data-table {
      width: 100%;
      border-collapse: collapse;
    }
    table.data-table.font-12 {
      font-size: 12px;
    }
    table.data-table.font-11 {
      font-size: 11px;
    }
    table.data-table th {
      background: #0d1527;
      color: #94a3b8;
      font-weight: 700;
      height: 24px;
      padding: 3px 8px;
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
      white-space: nowrap;
    }
    table.data-table td {
      height: 26px;
      padding: 3px 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #e2e8f0;
      white-space: nowrap;
    }
    table.data-table tfoot td {
      height: 32px;
      line-height: 32px;
      background: #111a2e;
      border-top: 2px solid rgba(56, 189, 248, 0.6);
      font-weight: 700;
      color: #38bdf8;
    }

    /* Sidebar Mockup */
    .mock-sidebar {
      width: 100%;
      background: #0f172a;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .side-domain-bold {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #38bdf8;
      padding: 4px 8px;
    }
    .side-domain-clean {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94a3b8;
      padding: 4px 8px;
    }
    .side-item-bold {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      color: #94a3b8;
    }
    .side-item-bold.active {
      background: #1e293b;
      color: #ffffff;
      font-weight: 700;
      border: 1px solid rgba(255, 255, 255, 0.1);
    }
    .side-item-clean {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 7px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 400;
      color: #94a3b8;
    }
    .side-item-clean.active {
      background: rgba(56, 189, 248, 0.1);
      color: #38bdf8;
      font-weight: 500;
      border-left: 3px solid #38bdf8;
    }

    .spec-line {
      font-size: 12px;
      color: #94a3b8;
      display: flex;
      gap: 10px;
    }
    .spec-line strong { color: #ffffff; }
  </style>
</head>
<body>

  <h1>🎨 TOPSCORE LMS — SPATIAL & TYPOGRAPHY COMPARISON</h1>

  <!-- COMPARISON 1: TOP PANEL & LOWER PANEL (50px vs 40px) -->
  <div class="comparison-grid">
    <div class="board-card">
      <div class="card-title-bar current">
        <span>KONDISI SAAT INI (50px Topbar & 50px Lower Panel)</span>
        <span class="badge-pill badge-curr">50px Height</span>
      </div>
      <div class="card-body">
        <div class="spec-line"><strong>Topbar:</strong> 50px | Tab Folder: 38px (lega, tinggi tab 76% topbar)</div>
        <div class="spec-line"><strong>Lower Panel:</strong> 50px | Tombol Aksi: 32px (padding vertikal 9px)</div>
        <div class="mock-chrome">
          <div class="topbar-50">
            <div class="brand-title">👑 TopsCore</div>
            <div class="topbar-tabs">
              <div class="tab-pill-38">Level 1 (Novice)</div>
              <div class="tab-pill-38 active">Level 2 (Explorer)</div>
            </div>
            <div style="font-size:12px; color:#94a3b8;">Admin Desk</div>
          </div>
          <div style="height: 70px; background:#070b16; display:flex; align-items:center; justify-content:center; color:#64748b; font-size:12px;">
            [Area Tabel / Konten Data - Ruang Vertikal Standar]
          </div>
          <div class="lower-50">
            <span style="font-size:12px; color:#94a3b8;">Total: 24 Students Active</span>
            <button class="btn-action-32">🚀 NEXT BATCH</button>
          </div>
        </div>
        <div class="spec-line" style="color:#38bdf8;">Karakter: Proporsional, nyaman untuk sentuhan mouse, jarak tombol tidak terlalu mepet.</div>
      </div>
    </div>

    <div class="board-card">
      <div class="card-title-bar proposed">
        <span>OPSI KOMPAK (40px Topbar & 40px Lower Panel)</span>
        <span class="badge-pill badge-prop">40px Ultra-Compact</span>
      </div>
      <div class="card-body">
        <div class="spec-line"><strong>Topbar:</strong> 40px | Tab Folder: 30px (ramping, hemat ruang)</div>
        <div class="spec-line"><strong>Lower Panel:</strong> 40px | Tombol Aksi: 28px (padding vertikal 6px)</div>
        <div class="mock-chrome">
          <div class="topbar-40">
            <div class="brand-title" style="font-size:14px;">👑 TopsCore</div>
            <div class="topbar-tabs">
              <div class="tab-pill-30">Level 1 (Novice)</div>
              <div class="tab-pill-30 active">Level 2 (Explorer)</div>
            </div>
            <div style="font-size:11px; color:#94a3b8;">Admin Desk</div>
          </div>
          <div style="height: 90px; background:#070b16; display:flex; align-items:center; justify-content:center; color:#c084fc; font-size:12px;">
            [Area Tabel / Konten Data - DITAMBAH +20px RUANG VERTIKAL LEBIH LUAS!]
          </div>
          <div class="lower-40">
            <span style="font-size:11px; color:#94a3b8;">Total: 24 Students Active</span>
            <button class="btn-action-28">🚀 NEXT BATCH</button>
          </div>
        </div>
        <div class="spec-line" style="color:#c084fc;">Keuntungan: Menghemat 20px total (10px atas + 10px bawah), memberi +1 baris data ekstra pada tabel!</div>
      </div>
    </div>
  </div>

  <!-- COMPARISON 2: TABLE FONT (12px vs 11px) -->
  <div class="comparison-grid">
    <div class="board-card">
      <div class="card-title-bar current">
        <span>UKURAN FONT TABEL SAAT INI (12px Inter)</span>
        <span class="badge-pill badge-curr">12px Standard</span>
      </div>
      <div class="card-body">
        <div class="spec-line"><strong>Header & Data:</strong> 12px Inter (Normal/Bold) | Line-height: 1.4</div>
        <div class="mock-chrome">
          <table class="data-table font-12">
            <thead>
              <tr><th>#</th><th>STUDENT NAME</th><th>PROGRAM</th><th>AGE</th><th>GRADE</th></tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>Aditya Pratama Putra</td><td>Camp Intensive</td><td>17</td><td style="color:#00c000; font-weight:700;">★ 100%</td></tr>
              <tr><td>2</td><td>Budi Santoso Nugroho</td><td>Evnikom English</td><td>16</td><td style="color:#00c000;">A 94%</td></tr>
              <tr><td>3</td><td>Citra Dewi Maharani</td><td>Sheraton Explorer</td><td>18</td><td style="color:#ffff00;">C 72%</td></tr>
            </tbody>
            <tfoot>
              <tr><td colspan="4">BATCH AVG (3 Students)</td><td>88.6%</td></tr>
            </tfoot>
          </table>
        </div>
        <div class="spec-line" style="color:#38bdf8;">Karakter: Sangat jelas dan mudah dibaca pada layar monitor jarak normal.</div>
      </div>
    </div>

    <div class="board-card">
      <div class="card-title-bar proposed">
        <span>OPSI FONT TABEL 11px (11px Inter Medium)</span>
        <span class="badge-pill badge-prop">11px Compact</span>
      </div>
      <div class="card-body">
        <div class="spec-line"><strong>Header & Data:</strong> 11px Inter (Medium 500) | Line-height: 1.3</div>
        <div class="mock-chrome">
          <table class="data-table font-11">
            <thead>
              <tr><th>#</th><th>STUDENT NAME</th><th>PROGRAM</th><th>AGE</th><th>GRADE</th></tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>Aditya Pratama Putra</td><td>Camp Intensive</td><td>17</td><td style="color:#00c000; font-weight:700;">★ 100%</td></tr>
              <tr><td>2</td><td>Budi Santoso Nugroho</td><td>Evnikom English</td><td>16</td><td style="color:#00c000;">A 94%</td></tr>
              <tr><td>3</td><td>Citra Dewi Maharani</td><td>Sheraton Explorer</td><td>18</td><td style="color:#ffff00;">C 72%</td></tr>
            </tbody>
            <tfoot>
              <tr><td colspan="4">BATCH AVG (3 Students)</td><td>88.6%</td></tr>
            </tfoot>
          </table>
        </div>
        <div class="spec-line" style="color:#c084fc;">Keuntungan: Kolom lebih hemat lebar horizontal (~15% lebih ramping), muat lebih banyak kolom tanpa scroll.</div>
      </div>
    </div>
  </div>

  <!-- COMPARISON 3: SIDEBAR BOLD vs CLEAN (UN-BOLDED) -->
  <div class="comparison-grid">
    <div class="board-card">
      <div class="card-title-bar current">
        <span>SIDEBAR SAAT INI (Heavy Bold: 800 Domain & 700 Active)</span>
        <span class="badge-pill badge-curr">Heavy Bold</span>
      </div>
      <div class="card-body">
        <div class="spec-line"><strong>Domain Header:</strong> 11px Inter 800 (Extra Bold)</div>
        <div class="spec-line"><strong>Active Item:</strong> 13px Inter 700 (Bold)</div>
        <div class="mock-sidebar">
          <div class="side-domain-bold">A — ADMIN DOMAIN</div>
          <div class="side-item-bold">📊 Executive Dashboard</div>
          <div class="side-item-bold active">🎯 Curriculum & Levels</div>
          <div class="side-domain-bold" style="margin-top:6px;">B — BOARD DOMAIN</div>
          <div class="side-item-bold">👥 Student Rosters</div>
        </div>
        <div class="spec-line" style="color:#38bdf8;">Karakter: Kontras tebal, tulisan agak berat/ramai.</div>
      </div>
    </div>

    <div class="board-card">
      <div class="card-title-bar proposed">
        <span>SIDEBAR BERSIH (Clean Minimalist: 600 Domain & 400/500 Active)</span>
        <span class="badge-pill badge-prop">Clean & Sleek</span>
      </div>
      <div class="card-body">
        <div class="spec-line"><strong>Domain Header:</strong> 11px Inter 600 (Semi-Bold Muted Slate)</div>
        <div class="spec-line"><strong>Active Item:</strong> 13px Inter 500 (Medium + Left Border Accent)</div>
        <div class="mock-sidebar">
          <div class="side-domain-clean">A — ADMIN DOMAIN</div>
          <div class="side-item-clean">📊 Executive Dashboard</div>
          <div class="side-item-clean active">🎯 Curriculum & Levels</div>
          <div class="side-domain-clean" style="margin-top:6px;">B — BOARD DOMAIN</div>
          <div class="side-item-clean">👥 Student Rosters</div>
        </div>
        <div class="spec-line" style="color:#c084fc;">Keuntungan: Sangat tenang, elegan, bernuansa workstation modern (Linear/Raycast style), tidak melelahkan mata.</div>
      </div>
    </div>
  </div>

</body>
</html>
`;

fs.writeFileSync(path.join(ARTIFACT_DIR, 'spatial_typography_exploration_boards.html'), htmlContent, 'utf8');

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 1300 } });
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const outPath = path.join(ARTIFACT_DIR, 'comparison_exploration_50vs40_12vs11_sidebar.png');
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('Exploration comparison screenshot captured:', outPath);

  // Capture individual crops
  const cards = await page.$$('.comparison-grid');
  const fileNames = [
    'exploration_top_sub_panel_50_vs_40.png',
    'exploration_table_font_12_vs_11.png',
    'exploration_sidebar_bold_vs_clean.png'
  ];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const cropPath = path.join(ARTIFACT_DIR, fileNames[i]);
    await card.screenshot({ path: cropPath });
    console.log(`Saved crop ${i + 1}:`, cropPath);
  }

  await page.close();
  await browser.close();
  console.log('All exploration boards generated successfully.');
}

main().catch(console.error);
