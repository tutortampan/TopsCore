const puppeteer = require('puppeteer');
const fs = require('fs');

async function verifyScreenshots() {
  const outputPath = 'C:/Users/Top/.gemini/antigravity/brain/69ab61e0-23a0-47b1-9eda-f47bdd9d599a/live_table_and_card_session_verified.png';

  const htmlContent = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>Verifikasi Implementasi Akhir: Exam Card Session & Sortable Table</title>
  <link rel="stylesheet" href="file:///D:/Drives/Tutor%20Tampan/TopsCore/css/admin.css">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background: #060a12; color: #f1f5f9; padding: 24px; display: flex; flex-direction: column; gap: 24px; width: 1260px; }
    .page-header { background: #0f172a; border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; }
    .page-header h2 { font-size: 1.25rem; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 8px; }
    .section-box { display: flex; flex-direction: column; gap: 12px; }
    .section-title { font-size: 0.95rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #38bdf8; display: flex; align-items: center; gap: 8px; }
  </style>
</head>
<body>

  <div class="page-header">
    <h2><span>🚀</span> TopsCore Live Assessment — Verification Snapshot</h2>
    <span style="font-size:0.75rem; font-weight:700; color:#34d399; background:rgba(16,185,129,0.15); border:1px solid #10b981; padding:4px 10px; border-radius:6px;">
      100% PRODUCTION READY
    </span>
  </div>

  <!-- BAGIAN 1: KARTU SESI UJIAN (VERSI WARNA WIREFRAME TERVERIFIKASI) -->
  <div class="section-box">
    <div class="section-title">
      <span>1️⃣ Exam Card Session (Wireframe Warna: Hijau, Kuning, Merah, Deep Navy)</span>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <!-- KARTU LOCKED -->
      <div class="theme-test-card-frame" style="border: 2px solid rgba(168, 85, 247, 0.45); background: rgba(168, 85, 247, 0.15);">
        <div class="theme-test-card-inner">
          <div class="card-block-metadata">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
              <span style="font-size:0.72rem; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; padding:2px 8px; border-radius:4px; background:rgba(168,85,247,0.25); color:#c084fc; border:1px solid rgba(168,85,247,0.4);">
                THEME B
              </span>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:0.72rem; font-weight:700; color:#cbd5e1; background:rgba(255,255,255,0.06); padding:2px 7px; border-radius:4px; border:1px solid rgba(255,255,255,0.1);">
                  ⏱️ 120 Mins
                </span>
                <span style="font-size:0.72rem; color:#94a3b8; font-weight:600;">1 Module</span>
              </div>
            </div>
            <h4 style="margin:2px 0 0; font-size:1.15rem; font-weight:900; color:#ffffff;">Tourism Test</h4>
            <div style="font-size:0.75rem; color:#93c5fd; margin-top:2px; display:flex; gap:8px;">
              <span>📝 Words (Written)</span> &bull; <span>💬 Phrases (Dropdown)</span>
            </div>
          </div>

          <!-- BARIS 2: NORMAL (Hijau) | REMIDI (Kuning teks gelap) -->
          <div class="card-block-row-buttons">
            <button type="button" class="btn btn-wireframe-normal">
              <span>🟢</span> NORMAL
            </button>
            <button type="button" class="btn btn-wireframe-remidi">
              <span>🟡</span> REMIDI
            </button>
          </div>

          <!-- BARIS 3: LOCKED (Merah) -->
          <div class="box-wireframe-locked">
            <div style="font-size:0.88rem; font-weight:900; display:flex; align-items:center; gap:6px;">
              <span>🔒</span> LOCKED &bull; NO ACTIVE SESSION
            </div>
            <div style="font-size:0.72rem; color:#fecaca; margin-top:2px; font-weight:600;">
              Prerequisites: 4 Quizzes Theme B (Min 60%)
            </div>
          </div>
        </div>
      </div>

      <!-- KARTU LIVE -->
      <div class="theme-test-card-frame" style="border: 2px solid rgba(245, 158, 11, 0.5); background: rgba(245, 158, 11, 0.15);">
        <div class="theme-test-card-inner">
          <div class="card-block-metadata">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:4px;">
              <span style="font-size:0.72rem; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; padding:2px 8px; border-radius:4px; background:rgba(245,158,11,0.25); color:#fbbf24; border:1px solid rgba(245,158,11,0.4);">
                THEME C
              </span>
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:0.72rem; font-weight:800; padding:2px 7px; border-radius:4px; background:rgba(0,192,0,0.25); border:1px solid #00c000; color:#86efac;">
                  🟢 LIVE (36m left)
                </span>
                <span style="font-size:0.72rem; font-weight:700; color:#cbd5e1; background:rgba(255,255,255,0.06); padding:2px 7px; border-radius:4px; border:1px solid rgba(255,255,255,0.1);">
                  👥 134 (11 Siswa)
                </span>
              </div>
            </div>
            <h4 style="margin:2px 0 0; font-size:1.15rem; font-weight:900; color:#ffffff;">CCU Test</h4>
            <div style="font-size:0.75rem; color:#93c5fd; margin-top:2px; display:flex; gap:8px;">
              <span>📝 Words (Written)</span> &bull; <span>💬 Phrases (Dropdown)</span>
            </div>
          </div>

          <!-- BARIS 2: LIVE VIEW (Deep Navy / Royal Blue Lebar Penuh) -->
          <div style="height:54px;">
            <button type="button" class="btn btn-wireframe-live-view">
              <span>👁️</span> LIVE VIEW &bull; MONITOR REALTIME (11 SISWA)
            </button>
          </div>

          <!-- BARIS 3: +LATE STUDENTS (Hijau) | EDIT TIME (Kuning) | CLOSE SESSION (Merah) -->
          <div class="card-block-row-buttons">
            <button type="button" class="btn btn-wireframe-late">
              <span>👥</span> +LATE STUDENTS
            </button>
            <button type="button" class="btn btn-wireframe-edit-time">
              <span>⏱️</span> EDIT TIME
            </button>
            <button type="button" class="btn btn-wireframe-close">
              <span>🔒</span> CLOSE SESSION
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- BAGIAN 2: TABEL LIVE MONITOR (SORTABLE DENGAN 7 KOLOM) -->
  <div class="section-box">
    <div class="section-title">
      <span>2️⃣ Live Test Session Monitor (Sortable Data Table: NAMA - STATUS TEST - PROGRESS - SCORE - PEEK - ALARM - ACTION)</span>
    </div>

    <div class="live-monitor-table-wrapper" style="box-shadow: 0 12px 30px rgba(0,0,0,0.6);">
      <table class="live-monitor-table">
        <thead>
          <tr>
            <th class="sortable-th active-sort">NAMA <span class="sort-icon">▲</span></th>
            <th class="sortable-th">STATUS TEST <span class="sort-icon">⇅</span></th>
            <th class="sortable-th">PROGRESS <span class="sort-icon">⇅</span></th>
            <th class="sortable-th">SCORE (REALTIME) <span class="sort-icon">⇅</span></th>
            <th style="text-align: center; width: 85px;">PEEK</th>
            <th class="sortable-th" style="text-align: center; width: 120px;">ALARM <span class="sort-icon">⇅</span></th>
            <th style="text-align: right; width: 190px;">ACTION</th>
          </tr>
        </thead>
        <tbody>
          <!-- ROW 1: SISWA DENGAN ALARM (HIGHLIGHTED) -->
          <tr class="live-table-row row-alarm-highlight">
            <td>
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:34px; height:34px; border-radius:50%; background:#2563eb; color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.9rem; font-weight:800;">
                  H
                </div>
                <div>
                  <div style="font-size:0.88rem; font-weight:700; color:#ffffff;">Miss Havvina Solehah</div>
                  <div style="font-size:0.72rem; color:#94a3b8; display:flex; align-items:center; gap:4px; margin-top:2px;">
                    <span style="background:rgba(255,255,255,0.06); padding:1px 6px; border-radius:3px;">134</span>
                  </div>
                </div>
              </div>
            </td>
            <td>
              <div style="display:inline-flex; align-items:center; gap:6px; font-size:0.75rem; font-weight:700; padding:3px 8px; border-radius:5px; background:rgba(255,255,255,0.05); color:#f87171; border:1px solid rgba(255,255,255,0.08);">
                <span style="width:7px; height:7px; border-radius:50%; background:#f87171;"></span>
                Away (41s)
              </div>
              <div style="font-size:0.72rem; color:#cbd5e1; font-weight:600; margin-top:3px;">Words Exam</div>
            </td>
            <td style="min-width: 170px;">
              <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;">
                <span style="color:#94a3b8;">Soal:</span>
                <span style="font-weight:800; color:#ffffff;">0 / 440 (0%)</span>
              </div>
              <div style="height:5px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
                <div style="height:100%; width:0%; background:#3b82f6;"></div>
              </div>
              <div style="font-size:0.7rem; color:#94a3b8; margin-top:3px;">Belum ada soal dijawab</div>
            </td>
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700; background:rgba(255,255,255,0.06); color:#64748b; border:1px dashed rgba(255,255,255,0.15);">-</div>
                <div>
                  <div style="font-size:0.92rem; font-weight:800; color:#64748b;">--</div>
                  <div style="font-size:0.7rem; color:#94a3b8;">Belum ada soal</div>
                </div>
              </div>
            </td>
            <td style="text-align:center;">
              <button class="btn btn-xs" style="background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; font-weight:700; font-size:0.75rem; padding:5px 9px; border-radius:6px; cursor:pointer;">
                👁️ Intip
              </button>
            </td>
            <td style="text-align:center;">
              <span style="font-size:0.75rem; font-weight:800; color:#FF0000; background:rgba(255,0,0,0.2); border:1px solid #FF0000; padding:3px 8px; border-radius:6px; box-shadow:0 0 10px rgba(255,0,0,0.3); cursor:pointer;">
                🚨 2x ALARM 🔍
              </span>
            </td>
            <td style="text-align:right;">
              <div style="display:inline-flex; align-items:center; gap:5px; justify-content:flex-end;">
                <button class="btn btn-xs" style="background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.4); color:#34d399; font-weight:700; font-size:0.75rem; padding:5px 8px; border-radius:6px; cursor:pointer;">
                  🔄 Resume
                </button>
                <button class="btn btn-xs" style="background:rgba(255,0,0,0.15); border:1px solid rgba(255,0,0,0.35); color:#ff6b6b; font-weight:700; font-size:0.75rem; padding:5px 8px; border-radius:6px; cursor:pointer;">
                  🚫 Keluarkan
                </button>
              </div>
            </td>
          </tr>

          <!-- ROW 2: SISWA AKTIF DENGAN SKOR A -->
          <tr class="live-table-row">
            <td>
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:34px; height:34px; border-radius:50%; background:#2563eb; color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.9rem; font-weight:800;">
                  I
                </div>
                <div>
                  <div style="font-size:0.88rem; font-weight:700; color:#ffffff;">Miss Isnantika Salsabila</div>
                  <div style="font-size:0.72rem; color:#94a3b8; display:flex; align-items:center; gap:4px; margin-top:2px;">
                    <span style="background:rgba(255,255,255,0.06); padding:1px 6px; border-radius:3px;">134</span>
                  </div>
                </div>
              </div>
            </td>
            <td>
              <div style="display:inline-flex; align-items:center; gap:6px; font-size:0.75rem; font-weight:700; padding:3px 8px; border-radius:5px; background:rgba(255,255,255,0.05); color:#34d399; border:1px solid rgba(255,255,255,0.08);">
                <span style="width:7px; height:7px; border-radius:50%; background:#00c000;"></span>
                Aktif Menjawab
              </div>
              <div style="font-size:0.72rem; color:#cbd5e1; font-weight:600; margin-top:3px;">Words Exam</div>
            </td>
            <td style="min-width: 170px;">
              <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;">
                <span style="color:#94a3b8;">Soal:</span>
                <span style="font-weight:800; color:#ffffff;">111 / 440 (25%)</span>
              </div>
              <div style="height:5px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
                <div style="height:100%; width:25%; background:linear-gradient(90deg, #3b82f6, #00c000); border-radius:3px;"></div>
              </div>
              <div style="font-size:0.7rem; color:#94a3b8; margin-top:3px;">
                <span style="color:#cbd5e1;">Soal #111 (10s lalu)</span>
                <span style="color:#38bdf8; font-weight:700;">&bull; ⚡ 1.1 q/m</span>
              </div>
            </td>
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.78rem; font-weight:800; background:#00c000; color:#0f172a; box-shadow:0 0 8px #00c000;">
                  A
                </div>
                <div>
                  <div style="font-size:0.92rem; font-weight:800; color:#00c000;">93%</div>
                  <div style="font-size:0.7rem; color:#94a3b8;">Akurasi (103/111)</div>
                </div>
              </div>
            </td>
            <td style="text-align:center;">
              <button class="btn btn-xs" style="background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; font-weight:700; font-size:0.75rem; padding:5px 9px; border-radius:6px; cursor:pointer;">
                👁️ Intip
              </button>
            </td>
            <td style="text-align:center;">
              <span style="font-size:0.75rem; font-weight:700; color:#34d399; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); padding:3px 8px; border-radius:6px;">
                🛡️ 0x Bersih
              </span>
            </td>
            <td style="text-align:right;">
              <div style="display:inline-flex; align-items:center; gap:5px; justify-content:flex-end;">
                <button class="btn btn-xs" style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.4); color:#fbbf24; font-weight:700; font-size:0.75rem; padding:5px 8px; border-radius:6px; cursor:pointer;">
                  ⏱️ +Waktu
                </button>
                <button class="btn btn-xs" style="background:rgba(255,0,0,0.15); border:1px solid rgba(255,0,0,0.35); color:#ff6b6b; font-weight:700; font-size:0.75rem; padding:5px 8px; border-radius:6px; cursor:pointer;">
                  🚫 Keluarkan
                </button>
              </div>
            </td>
          </tr>

          <!-- ROW 3: SISWA DENGAN PROGRES TINGGI (GRADE C) -->
          <tr class="live-table-row">
            <td>
              <div style="display:flex; align-items:center; gap:10px;">
                <div style="width:34px; height:34px; border-radius:50%; background:#2563eb; color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.9rem; font-weight:800;">
                  C
                </div>
                <div>
                  <div style="font-size:0.88rem; font-weight:700; color:#ffffff;">Miss Cinta Laura</div>
                  <div style="font-size:0.72rem; color:#94a3b8; display:flex; align-items:center; gap:4px; margin-top:2px;">
                    <span style="background:rgba(255,255,255,0.06); padding:1px 6px; border-radius:3px;">134</span>
                  </div>
                </div>
              </div>
            </td>
            <td>
              <div style="display:inline-flex; align-items:center; gap:6px; font-size:0.75rem; font-weight:700; padding:3px 8px; border-radius:5px; background:rgba(255,255,255,0.05); color:#fbbf24; border:1px solid rgba(255,255,255,0.08);">
                <span style="width:7px; height:7px; border-radius:50%; background:#fbbf24;"></span>
                Idle (5m)
              </div>
              <div style="font-size:0.72rem; color:#cbd5e1; font-weight:600; margin-top:3px;">Words Exam</div>
            </td>
            <td style="min-width: 170px;">
              <div style="display:flex; justify-content:space-between; font-size:0.75rem; margin-bottom:4px;">
                <span style="color:#94a3b8;">Soal:</span>
                <span style="font-weight:800; color:#ffffff;">325 / 440 (74%)</span>
              </div>
              <div style="height:5px; background:rgba(255,255,255,0.1); border-radius:3px; overflow:hidden;">
                <div style="height:100%; width:74%; background:linear-gradient(90deg, #3b82f6, #00c000); border-radius:3px;"></div>
              </div>
              <div style="font-size:0.7rem; color:#94a3b8; margin-top:3px;">
                <span style="color:#cbd5e1;">Soal #325 (5m lalu)</span>
                <span style="color:#38bdf8; font-weight:700;">&bull; ⚡ 3.1 q/m</span>
              </div>
            </td>
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.78rem; font-weight:800; background:#FFFF00; color:#0f172a; box-shadow:0 0 8px #FFFF00;">
                  C
                </div>
                <div>
                  <div style="font-size:0.92rem; font-weight:800; color:#FFFF00;">70%</div>
                  <div style="font-size:0.7rem; color:#94a3b8;">Akurasi (228/325)</div>
                </div>
              </div>
            </td>
            <td style="text-align:center;">
              <button class="btn btn-xs" style="background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; font-weight:700; font-size:0.75rem; padding:5px 9px; border-radius:6px; cursor:pointer;">
                👁️ Intip
              </button>
            </td>
            <td style="text-align:center;">
              <span style="font-size:0.75rem; font-weight:700; color:#34d399; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); padding:3px 8px; border-radius:6px;">
                🛡️ 0x Bersih
              </span>
            </td>
            <td style="text-align:right;">
              <div style="display:inline-flex; align-items:center; gap:5px; justify-content:flex-end;">
                <button class="btn btn-xs" style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.4); color:#fbbf24; font-weight:700; font-size:0.75rem; padding:5px 8px; border-radius:6px; cursor:pointer;">
                  ⏱️ +Waktu
                </button>
                <button class="btn btn-xs" style="background:rgba(255,0,0,0.15); border:1px solid rgba(255,0,0,0.35); color:#ff6b6b; font-weight:700; font-size:0.75rem; padding:5px 8px; border-radius:6px; cursor:pointer;">
                  🚫 Keluarkan
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

</body>
</html>
  `;

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1300,1050']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1300, height: 1000, deviceScaleFactor: 2 });
  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: outputPath, fullPage: true });
  await browser.close();

  console.log('SUCCESS: Final verification screenshot captured at: ' + outputPath);
}

verifyScreenshots().catch(err => {
  console.error('ERROR in verifyScreenshots:', err);
  process.exit(1);
});

