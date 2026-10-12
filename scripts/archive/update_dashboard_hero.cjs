const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

const startTag = '<section class="welcome-banner card"';
const endTag = '</section>';
const startIndex = html.indexOf(startTag);
const endIndex = html.indexOf(endTag, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const newBanner = `<section class="welcome-banner card" aria-labelledby="welcome-level" style="padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 10px; background: var(--clr-bg-2, #0b1523); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.4);">
      <!-- 1. Level Paling Atas & Metadata Institusi -->
      <div style="width: 100%; text-align: center;">
        <h1 id="welcome-level" style="margin: 0; font-size: 1.45rem; font-weight: 800; color: #fff; letter-spacing: 0.02em; font-family: var(--font-display); line-height: 1.2;">3rd Level</h1>
        <p id="welcome-meta-container" style="margin: 4px 0 0; font-size: 0.8rem; font-weight: 600; color: #94a3b8; letter-spacing: 0.04em; text-transform: uppercase;">
          <span id="welcome-meta">CEC • CAMP • BATCH 131</span>
        </p>
      </div>

      <!-- 2. Tiga Kolom: Score (Kiri) - Foto (Tengah) - Grade (Kanan) -->
      <div style="display: flex; align-items: center; justify-content: center; gap: 14px; width: 100%; margin-top: 4px;">
        
        <!-- Kiri: Score Box -->
        <div style="width: 76px; height: 76px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); box-shadow: 0 4px 14px rgba(0,0,0,0.25); flex-shrink: 0;">
          <div id="bottom-stat-avg-score" style="font-size: 1.35rem; font-weight: 900; color: #818cf8; font-family: var(--font-display); line-height: 1;">0%</div>
          <div style="font-size: 0.6rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-top: 4px; letter-spacing: 0.05em;">AVG</div>
        </div>

        <!-- Tengah: Foto Siswa -->
        <div id="banner-avatar-container" class="banner-avatar-box" title="Click to view or change profile" style="margin: 0; width: 88px; height: 88px; border-radius: 20px; overflow: hidden; border: 2.5px solid #ea580c; position: relative; cursor: pointer; box-shadow: 0 8px 24px rgba(234, 88, 12, 0.35); flex-shrink: 0; transition: border-color 0.3s ease, box-shadow 0.3s ease;">
          <span id="banner-avatar-initial" style="font-size: 2.4rem; display: flex; align-items: center; justify-content: center; height: 100%; width: 100%;">S</span>
          <img id="banner-avatar-img" class="hidden" alt="Profile Photo" style="width: 100%; height: 100%; object-fit: cover;" />
          <input type="file" id="photo-file-input" accept="image/*" class="hidden" />
          <div style="position: absolute; bottom: 3px; right: 3px; width: 22px; height: 22px; border-radius: 50%; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; font-size: 11px; pointer-events: none;">📷</div>
        </div>

        <!-- Kanan: Grade Box -->
        <div class="result-grade-display grade-none" id="stat-overall-grade-badge" style="margin: 0 !important; width: 76px !important; height: 76px !important; border-radius: 16px !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: 0 4px 14px rgba(0,0,0,0.25) !important; flex-shrink: 0; cursor: pointer;">
          <div id="stat-overall-grade-value" style="font-size: 2.2rem; line-height: 1; font-weight: 900; font-family: var(--font-display);">—</div>
        </div>

      </div>

      <!-- 3. Nama Siswa di Bawah -->
      <div style="text-align: center; margin-top: 4px;">
        <div id="welcome-name" style="font-size: 1.15rem; font-weight: 800; color: #fff; font-family: var(--font-display); line-height: 1.2;">Student</div>
      </div>

      <!-- Elemen Tersembunyi untuk Kompatibilitas JS -->
      <div class="hidden" style="display: none !important;">
        <span id="welcome-heading"></span>
        <span id="welcome-age"></span>
        <div id="welcome-level-panel"></div>
        <span id="stat-overall-score">0%</span>
        <span id="bottom-stat-best-score">0%</span>
        <span id="stat-Assessments-done">0</span>
        <span id="overview-Assessments-count">0</span>
        <span id="overview-classes-count">0</span>
        <span id="overview-mic-status">Ready</span>
        <span id="bottom-stat-total-Assessments">0</span>
      </div>
    </section>`;

  html = html.substring(0, startIndex) + newBanner + html.substring(endIndex + endTag.length);
  fs.writeFileSync('dashboard.html', html);
  console.log('Hero Card berhasil diperbarui: Level di atas, Metadata di bawahnya, Foto di tengah diapit Score & Grade, Nama siswa di bawah!');
}
