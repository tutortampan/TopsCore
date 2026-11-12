import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece';

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Headers, Sub-Headers & Footers Standardization: Before vs After</title>
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
      width: 1300px;
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
    .card-title-bar.before {
      background: rgba(255, 0, 0, 0.15);
      color: #ff4d4d;
      border-bottom: 1px solid rgba(255, 0, 0, 0.3);
    }
    .card-title-bar.after {
      background: rgba(0, 192, 0, 0.15);
      color: #00c000;
      border-bottom: 1px solid rgba(0, 192, 0, 0.3);
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
    .badge-before { background: #ff0000; color: #ffffff; }
    .badge-after { background: #00c000; color: #0f172a; }

    /* Mockups */
    .mockup-wrap {
      background: #090d16;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      overflow: hidden;
    }

    /* Table Mockup */
    table.demo-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    table.demo-table th {
      background: #0d1527;
      color: #94a3b8;
      font-weight: 700;
      height: 24px;
      padding: 3px 8px;
      text-align: left;
      border-bottom: 1px solid rgba(255, 255, 255, 0.12);
    }
    table.demo-table td {
      height: 26px;
      padding: 3px 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      color: #e2e8f0;
    }
    /* tfoot BEFORE */
    table.demo-table.before tfoot td {
      height: 50px !important;
      line-height: 50px !important;
      background: #111a2e;
      border-top: 2px solid rgba(56, 189, 248, 0.6);
      font-weight: 700;
      color: #38bdf8;
    }
    /* tfoot AFTER */
    table.demo-table.after tfoot td {
      height: 32px !important;
      line-height: 32px !important;
      background: #111a2e;
      border-top: 2px solid rgba(56, 189, 248, 0.6);
      font-weight: 700;
      color: #38bdf8;
    }

    /* Modal Mockup */
    .mock-modal {
      width: 100%;
      background: #0d1527;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      display: flex;
      flex-direction: column;
    }
    .mock-modal-header-before {
      padding: 18px 20px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 18px;
      height: auto;
    }
    .mock-modal-header-after {
      height: 50px;
      padding: 0 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 16px;
    }
    .mock-modal-body {
      padding: 14px 20px;
      color: #94a3b8;
      font-size: 13px;
    }
    .mock-modal-footer-before {
      padding: 16px 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      height: auto;
    }
    .mock-modal-footer-after {
      height: 50px;
      padding: 0 20px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
    }
    .btn-mock {
      height: 32px;
      padding: 0 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
    }
    .btn-cancel { background: rgba(255, 255, 255, 0.08); color: #cbd5e1; border: none; }
    .btn-save { background: #00c000; color: #0f172a; border: none; font-weight: 700; }

    /* Topbar Mockup */
    .mock-topbar-before {
      min-height: 56px;
      padding: 8px 14px;
      background: #0f172a;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .mock-topbar-after {
      height: 50px;
      padding: 0 16px;
      background: #0f172a;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: space-between;
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

  <h1>📐 TOPSCORE LMS — UNIVERSAL HEADER, SUB-HEADER & FOOTER STANDARDIZATION</h1>

  <!-- SECTION 1: TABLE FOOTER (tfoot) -->
  <div class="comparison-grid">
    <div class="board-card">
      <div class="card-title-bar before">
        <span>🔴 1. Table Summary Row (tfoot) — BEFORE</span>
        <span class="badge-pill badge-before">50px Ballooned</span>
      </div>
      <div class="card-body">
        <div class="spec-line"><strong>Current Rule:</strong> admin.css baris 400 (.table-wrap table tfoot)</div>
        <div class="spec-line"><strong>Tinggi:</strong> 50px !important (Terlalu tebal vs baris data normal 26px)</div>
        <div class="mockup-wrap">
          <table class="demo-table before">
            <thead>
              <tr><th>#</th><th>STUDENT NAME</th><th>PROGRAM</th><th>SCORE</th></tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>Aditya Pratama</td><td>Camp</td><td>95%</td></tr>
              <tr><td>2</td><td>Budi Santoso</td><td>Evnikom</td><td>88%</td></tr>
            </tbody>
            <tfoot>
              <tr><td colspan="3">BATCH AVG (2 Students)</td><td>91.5%</td></tr>
            </tfoot>
          </table>
        </div>
        <div class="spec-line" style="color:#ff8c00;">⚠️ Baris tfoot 50px membuat satu baris teks ringkasan terlihat membengkak dan memakan ruang vertikal secara berlebihan.</div>
      </div>
    </div>

    <div class="board-card">
      <div class="card-title-bar after">
        <span>🟢 1. Table Summary Row (tfoot) — AFTER</span>
        <span class="badge-pill badge-after">32px Standardized</span>
      </div>
      <div class="card-body">
        <div class="spec-line"><strong>Target Rule:</strong> .table-wrap table tfoot, .datagrid-tfoot</div>
        <div class="spec-line"><strong>Tinggi:</strong> 32px !important (Harmonis dengan baris data 24-28px)</div>
        <div class="mockup-wrap">
          <table class="demo-table after">
            <thead>
              <tr><th>#</th><th>STUDENT NAME</th><th>PROGRAM</th><th>SCORE</th></tr>
            </thead>
            <tbody>
              <tr><td>1</td><td>Aditya Pratama</td><td>Camp</td><td>95%</td></tr>
              <tr><td>2</td><td>Budi Santoso</td><td>Evnikom</td><td>88%</td></tr>
            </tbody>
            <tfoot>
              <tr><td colspan="3">BATCH AVG (2 Students)</td><td>91.5%</td></tr>
            </tfoot>
          </table>
        </div>
        <div class="spec-line" style="color:#00c000;">✔ Baris tfoot 32px proporsional, rapi, dan memisahkan diri dari Workspace Lower Panel 50px di bawahnya.</div>
      </div>
    </div>
  </div>

  <!-- SECTION 2: MODAL HEADER & FOOTER -->
  <div class="comparison-grid">
    <div class="board-card">
      <div class="card-title-bar before">
        <span>🔴 2. Modal Header & Footer — BEFORE</span>
        <span class="badge-pill badge-before">Fluid & Inconsistent</span>
      </div>
      <div class="card-body">
        <div class="spec-line"><strong>Current Rule:</strong> padding: 0.75rem / 18px (Header: ~56px, Footer: ~58px)</div>
        <div class="spec-line"><strong>Masalah:</strong> Tinggi modal bervariasi tanpa lock; border dan alignment tidak seragam.</div>
        <div class="mock-modal">
          <div class="mock-modal-header-before">Create New Student</div>
          <div class="mock-modal-body">Form inputs with fluid height containers...</div>
          <div class="mock-modal-footer-before">
            <button class="btn-mock btn-cancel">Cancel</button>
            <button class="btn-mock btn-save">Save Student</button>
          </div>
        </div>
      </div>
    </div>

    <div class="board-card">
      <div class="card-title-bar after">
        <span>🟢 2. Modal Header & Footer — AFTER</span>
        <span class="badge-pill badge-after">50px Strict Lock</span>
      </div>
      <div class="card-body">
        <div class="spec-line"><strong>Target Rule:</strong> .modal-header (50px) & .modal-footer (50px)</div>
        <div class="spec-line"><strong>Keuntungan:</strong> Tinggi presisi 50px, simetris, selaras dengan ritme topbar/lower-panel 50px.</div>
        <div class="mock-modal">
          <div class="mock-modal-header-after">
            <span>Create New Student</span>
            <span style="color:#94a3b8; font-size:18px; cursor:pointer;">✕</span>
          </div>
          <div class="mock-modal-body">Form inputs with standardized 10px spacing...</div>
          <div class="mock-modal-footer-after">
            <button class="btn-mock btn-cancel">Cancel</button>
            <button class="btn-mock btn-save">Save Student</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- SECTION 3: ADMIN TOPBAR MEDIA QUERY -->
  <div class="comparison-grid">
    <div class="board-card">
      <div class="card-title-bar before">
        <span>🔴 3. Admin Topbar (&lt;900px) — BEFORE</span>
        <span class="badge-pill badge-before">56px Auto-Height Override</span>
      </div>
      <div class="card-body">
        <div class="spec-line"><strong>Current Rule:</strong> @media (max-width: 900px) .admin-topbar { min-height: 56px }</div>
        <div class="mockup-wrap">
          <div class="mock-topbar-before">
            <span style="font-weight:800; font-family:'Outfit';">TopsCore Console</span>
            <span style="font-size:11px; background:#1e293b; padding:4px 8px; border-radius:4px;">56px Height</span>
          </div>
        </div>
        <div class="spec-line" style="color:#ff8c00;">⚠️ Override 56px merusak kalkulasi calc(100vh - 60px) dan menyebabkan pergeseran layout.</div>
      </div>
    </div>

    <div class="board-card">
      <div class="card-title-bar after">
        <span>🟢 3. Admin Topbar (&lt;900px) — AFTER</span>
        <span class="badge-pill badge-after">50px Pure Lock System-Wide</span>
      </div>
      <div class="card-body">
        <div class="spec-line"><strong>Target Rule:</strong> .admin-topbar strictly 50px across ALL breakpoints</div>
        <div class="mockup-wrap">
          <div class="mock-topbar-after">
            <span style="font-weight:800; font-family:'Outfit';">TopsCore Console</span>
            <span style="font-size:11px; background:#1e293b; padding:4px 8px; border-radius:4px;">50px Locked</span>
          </div>
        </div>
        <div class="spec-line" style="color:#00c000;">✔ Menjaga 100vh lock dan eliminasi scrollbar luar pada semua resolusi layar.</div>
      </div>
    </div>
  </div>

</body>
</html>
`;

fs.writeFileSync(path.join(ARTIFACT_DIR, 'header_footer_comparison_boards.html'), htmlContent, 'utf8');

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1360, height: 1200 } });
  await page.setContent(htmlContent, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  const outPath = path.join(ARTIFACT_DIR, 'comparison_master_header_sub_footer.png');
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('Master comparison screenshot captured:', outPath);

  // Capture individual crops for carousel
  const cards = await page.$$('.comparison-grid');
  const fileNames = [
    'comparison_board_table_footer_tfoot.png',
    'comparison_board_modal_header_footer.png',
    'comparison_board_admin_topbar_lock.png'
  ];

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const cropPath = path.join(ARTIFACT_DIR, fileNames[i]);
    await card.screenshot({ path: cropPath });
    console.log(`Saved crop ${i + 1}:`, cropPath);
  }

  await page.close();
  await browser.close();
  console.log('All visual boards generated successfully.');
}

main().catch(console.error);

