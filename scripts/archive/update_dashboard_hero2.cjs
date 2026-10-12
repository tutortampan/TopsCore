const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// 1. Ganti struktur HTML .welcome-banner
const startTag = '<section class="welcome-banner card"';
const endTag = '</section>';
const startIndex = html.indexOf(startTag);
const endIndex = html.indexOf(endTag, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const newBanner = `<section class="welcome-banner card" aria-labelledby="welcome-level" style="padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; background: var(--clr-bg-2, #0b1523); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.4);">
      <!-- 1. Level Paling Atas (dengan kata Level) & Data Siswa Horizontal -->
      <div style="width: 100%; text-align: center;">
        <h1 id="welcome-level" style="margin: 0; font-size: 1.45rem; font-weight: 800; color: #fff; letter-spacing: 0.02em; font-family: var(--font-display); line-height: 1.2;">3rd Level</h1>
        <p id="welcome-meta-container" style="margin: 4px 0 0; font-size: 0.8rem; font-weight: 600; color: #94a3b8; letter-spacing: 0.04em; text-transform: uppercase;">
          <span id="welcome-meta">CEC • CAMP • BATCH 131</span>
        </p>
      </div>

      <!-- 2. Tiga Kotak: Score - Foto - Grade -->
      <div style="display: flex; align-items: center; justify-content: center; gap: 14px; width: 100%; margin-top: 4px;">
        
        <!-- Kiri: Score Box (Warna mengikuti grade + label SCORE) -->
        <div id="banner-score-box" style="width: 76px; height: 76px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(234, 88, 12, 0.1); border: 1.5px solid rgba(234, 88, 12, 0.35); box-shadow: 0 4px 14px rgba(0,0,0,0.25); flex-shrink: 0; transition: border-color 0.3s, background 0.3s;">
          <div id="bottom-stat-avg-score" style="font-size: 1.35rem; font-weight: 900; color: #ea580c; font-family: var(--font-display); line-height: 1; transition: color 0.3s;">25%</div>
          <div style="font-size: 0.62rem; color: #94a3b8; text-transform: uppercase; font-weight: 800; margin-top: 4px; letter-spacing: 0.06em;">SCORE</div>
        </div>

        <!-- Tengah: Foto Siswa -->
        <div id="banner-avatar-container" class="banner-avatar-box" title="Click to view or change profile" style="margin: 0; width: 88px; height: 88px; border-radius: 20px; overflow: hidden; border: 2.5px solid #ea580c; position: relative; cursor: pointer; box-shadow: 0 8px 24px rgba(234, 88, 12, 0.35); flex-shrink: 0; transition: border-color 0.3s ease, box-shadow 0.3s ease;">
          <span id="banner-avatar-initial" style="font-size: 2.4rem; display: flex; align-items: center; justify-content: center; height: 100%; width: 100%;">S</span>
          <img id="banner-avatar-img" class="hidden" alt="Profile Photo" style="width: 100%; height: 100%; object-fit: cover;" />
          <input type="file" id="photo-file-input" accept="image/*" class="hidden" />
          <div style="position: absolute; bottom: 3px; right: 3px; width: 22px; height: 22px; border-radius: 50%; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; font-size: 11px; pointer-events: none;">📷</div>
        </div>

        <!-- Kanan: Grade Box (Huruf Grade + label GRADE) -->
        <div class="result-grade-display grade-none" id="stat-overall-grade-badge" style="margin: 0 !important; width: 76px !important; height: 76px !important; border-radius: 16px !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; box-shadow: 0 4px 14px rgba(0,0,0,0.25) !important; flex-shrink: 0; cursor: pointer;">
          <div id="stat-overall-grade-value" style="font-size: 2rem; line-height: 1; font-weight: 900; font-family: var(--font-display);">—</div>
          <div style="font-size: 0.62rem; color: rgba(255,255,255,0.8); text-transform: uppercase; font-weight: 800; margin-top: 3px; letter-spacing: 0.06em;">GRADE</div>
        </div>

      </div>

      <!-- 3. Nama Siswa di Bawah -->
      <div style="text-align: center; margin-top: 2px;">
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
}

// 2. Format teks Level agar selalu memiliki akhiran 'Level'
html = html.replace(
  /welcomeLevelEl\.textContent\s*=\s*session\.level_name\.replace\(\/ Level\$\/i,\s*''\);/g,
  "welcomeLevelEl.textContent = session.level_name.toLowerCase().includes('level') ? session.level_name : session.level_name + ' Level';"
);
html = html.replace(
  /welcomeLevelEl\.textContent\s*=\s*session\.level_name;/g,
  "welcomeLevelEl.textContent = session.level_name.toLowerCase().includes('level') ? session.level_name : session.level_name + ' Level';"
);

// 3. Sinkronisasi warna Score & Foto dengan warna Grade
if (!html.includes('scoreBox.style.borderColor')) {
  html = html.replace(
    /gradeBadge\.className\s*=\s*[`"']result-grade-display grade-[$]?\{?overallGrade\}?[`"'];/,
    `gradeBadge.className = \`result-grade-display grade-\${overallGrade}\`;
      const gradePalette = { S: '#f59e0b', A: '#10b981', B: '#3b82f6', C: '#f97316', D: '#eab308', E: '#ea580c', F: '#ef4444' };
      const targetColor = gradePalette[overallGrade] || '#6366f1';

      const avatarBox = document.getElementById('banner-avatar-container');
      if (avatarBox) {
        avatarBox.style.borderColor = targetColor;
        avatarBox.style.boxShadow = \`0 8px 24px \${targetColor}40\`;
      }

      const scoreBox = document.getElementById('banner-score-box');
      const scoreVal = document.getElementById('bottom-stat-avg-score');
      if (scoreBox && scoreVal) {
        scoreBox.style.borderColor = targetColor + '55';
        scoreBox.style.background = targetColor + '18';
        scoreVal.style.color = targetColor;
      }`
  );
}

fs.writeFileSync('dashboard.html', html);
console.log('dashboard.html berhasil diperbarui dengan spesifikasi tata letak dan warna yang diminta!');
