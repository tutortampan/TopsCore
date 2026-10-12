const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// 1. Kemas kini struktur HTML .welcome-banner
const startTag = '<section class="welcome-banner card"';
const endTag = '</section>';
const startIndex = html.indexOf(startTag);
const endIndex = html.indexOf(endTag, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const newBanner = `<section class="welcome-banner card" aria-labelledby="welcome-name" style="padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; background: var(--clr-bg-2, #0b1523); border-radius: 18px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.4);">
      <!-- 1. Nama Siswa Paling Atas -->
      <div style="width: 100%; text-align: center;">
        <h1 id="welcome-name" style="margin: 0; font-size: 1.35rem; font-weight: 800; color: #fff; letter-spacing: 0.02em; font-family: var(--font-display); line-height: 1.2;">Student</h1>
      </div>

      <!-- 2. Tiga Kotak: Score (Kiri) - Foto Menonjol (Tengah) - Grade (Kanan) -->
      <div style="display: flex; align-items: center; justify-content: center; gap: 12px; width: 100%; margin-top: 2px;">
        
        <!-- Kiri: Score Box (Label di Atas, Nilai di Bawah) -->
        <div id="banner-score-box" style="width: 72px; height: 72px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(234, 88, 12, 0.15); border: 2px solid rgba(234, 88, 12, 0.4); box-shadow: 0 4px 14px rgba(0,0,0,0.25); flex-shrink: 0; transition: all 0.3s ease;">
          <span style="font-size: 0.6rem; color: rgba(255, 255, 255, 0.8); text-transform: uppercase; font-weight: 800; letter-spacing: 0.08em; font-family: var(--font-display); line-height: 1; margin-bottom: 4px;">SCORE</span>
          <div id="bottom-stat-avg-score" style="font-size: 1.45rem; font-weight: 900; color: #fff; font-family: var(--font-display); line-height: 1;">0%</div>
        </div>

        <!-- Tengah: Foto Siswa (Lebih Besar & Prominent) -->
        <div id="banner-avatar-container" class="banner-avatar-box" title="Click to view or change profile" style="margin: 0; width: 94px; height: 94px; border-radius: 22px; overflow: hidden; border: 3px solid #ea580c; position: relative; cursor: pointer; box-shadow: 0 10px 28px rgba(234, 88, 12, 0.45); flex-shrink: 0; transition: border-color 0.3s ease, box-shadow 0.3s ease; transform: scale(1.02);">
          <span id="banner-avatar-initial" style="font-size: 2.6rem; display: flex; align-items: center; justify-content: center; height: 100%; width: 100%; font-family: var(--font-display); font-weight: 800;">S</span>
          <img id="banner-avatar-img" class="hidden" alt="Profile Photo" style="width: 100%; height: 100%; object-fit: cover;" />
          <input type="file" id="photo-file-input" accept="image/*" class="hidden" />
          <div style="position: absolute; bottom: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%; background: rgba(15, 23, 42, 0.85); border: 1.5px solid rgba(255,255,255,0.4); display: flex; align-items: center; justify-content: center; font-size: 11px; pointer-events: none;">📷</div>
        </div>

        <!-- Kanan: Grade Box (Label di Atas, Huruf di Bawah, Fon & Gaya Serupa) -->
        <div id="stat-overall-grade-badge" style="width: 72px; height: 72px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(234, 88, 12, 0.15); border: 2px solid rgba(234, 88, 12, 0.4); box-shadow: 0 4px 14px rgba(0,0,0,0.25); flex-shrink: 0; cursor: pointer; transition: all 0.3s ease;">
          <span style="font-size: 0.6rem; color: rgba(255, 255, 255, 0.8); text-transform: uppercase; font-weight: 800; letter-spacing: 0.08em; font-family: var(--font-display); line-height: 1; margin-bottom: 4px;">GRADE</span>
          <div id="stat-overall-grade-value" style="font-size: 1.6rem; font-weight: 900; color: #fff; font-family: var(--font-display); line-height: 1;">—</div>
        </div>

      </div>

      <!-- 3. Keterangan Ringkas di Bawah: Institusi - Program - Batch - Level -->
      <div style="width: 100%; text-align: center; margin-top: 2px;">
        <p id="welcome-meta-container" style="margin: 0; font-size: 0.82rem; font-weight: 600; color: #94a3b8; letter-spacing: 0.04em; text-transform: uppercase;">
          <span id="welcome-meta">CEC • CAMP • 131 • 3rd Level</span>
        </p>
      </div>

      <!-- Elemen Tersembunyi untuk Keserasian JS -->
      <div class="hidden" style="display: none !important;">
        <span id="welcome-heading"></span>
        <span id="welcome-age"></span>
        <span id="welcome-level"></span>
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
}

// 2. Format baris welcome-meta agar menyusun: Institusi - Program - No Batch Sahaja - Level
html = html.replace(
  /const parts = \[[^\]]*\]\.filter\(Boolean\);[\s\S]*?welcomeMetaEl\.textContent = parts\.join\(' • '\);/g,
  `const batchNum = session.batch_name ? String(session.batch_name).replace(/[^0-9]/g, '') || session.batch_name : '';
  const lvlText = session.level_name ? (session.level_name.toLowerCase().includes('level') ? session.level_name : session.level_name + ' Level') : '';
  const parts = [
    session.institution_name,
    session.program_name,
    batchNum,
    lvlText
  ].filter(Boolean);
  if (welcomeMetaEl) welcomeMetaEl.textContent = parts.join(' • ');`
);

// 3. Sinkronisasikan warna tema Grade ke kotak Score, kotak Grade, dan Bingkai Avatar
const regex = /gradeBadge\.className\s*=\s*[`"']result-grade-display grade-[$]?\{?overallGrade\}?[`"'];[\s\S]*?scoreVal\.style\.color = targetColor;\s*\}/g;
if(regex.test(html)) {
  html = html.replace(
    regex,
    `const gradePalette = { S: '#f59e0b', A: '#10b981', B: '#3b82f6', C: '#f97316', D: '#eab308', E: '#ea580c', F: '#ef4444' };
    const targetColor = gradePalette[overallGrade] || '#6366f1';

    const avatarBox = document.getElementById('banner-avatar-container');
    if (avatarBox) {
      avatarBox.style.borderColor = targetColor;
      avatarBox.style.boxShadow = \`0 10px 28px \${targetColor}50\`;
    }

    const scoreBox = document.getElementById('banner-score-box');
    const gradeBadgeBox = document.getElementById('stat-overall-grade-badge');
    
    if (scoreBox) {
      scoreBox.style.borderColor = targetColor + '66';
      scoreBox.style.background = targetColor + '20';
    }
    if (gradeBadgeBox) {
      gradeBadgeBox.style.borderColor = targetColor + '66';
      gradeBadgeBox.style.background = targetColor + '20';
    }`
  );
} else {
  // Let's use a simpler regex if the specific one fails due to my previous patch 
  html = html.replace(
    /var gradePalette = \{ S: '#f59e0b', A: '#10b981', B: '#3b82f6', C: '#f97316', D: '#eab308', E: '#ea580c', F: '#ef4444' \};[\s\S]*?scoreVal\.style\.color = targetColor;\s*\}/g,
    `const gradePalette = { S: '#f59e0b', A: '#10b981', B: '#3b82f6', C: '#f97316', D: '#eab308', E: '#ea580c', F: '#ef4444' };
    const targetColor = gradePalette[overallGrade] || '#6366f1';

    const avatarBox = document.getElementById('banner-avatar-container');
    if (avatarBox) {
      avatarBox.style.borderColor = targetColor;
      avatarBox.style.boxShadow = \`0 10px 28px \${targetColor}50\`;
    }

    const scoreBox = document.getElementById('banner-score-box');
    const gradeBadgeBox = document.getElementById('stat-overall-grade-badge');
    
    if (scoreBox) {
      scoreBox.style.borderColor = targetColor + '66';
      scoreBox.style.background = targetColor + '20';
    }
    if (gradeBadgeBox) {
      gradeBadgeBox.style.borderColor = targetColor + '66';
      gradeBadgeBox.style.background = targetColor + '20';
    }`
  );
}


fs.writeFileSync('dashboard.html', html);
console.log('dashboard.html berjaya dikemas kini: Score & Grade sepadan, label di atas nilai, foto di tengah lebih menonjol!');
