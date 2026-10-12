const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// 1. Ganti struktur HTML .welcome-banner dengan inline styling ketat
const startTag = '<section class="welcome-banner card"';
const endTag = '</section>';
const startIndex = html.indexOf(startTag);
const endIndex = html.indexOf(endTag, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const newBanner = `<section class="welcome-banner card" aria-labelledby="welcome-name" style="padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 14px; background: var(--clr-bg-2, #0b1523); border-radius: 18px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.4);">
      <!-- 1. Nama Siswa Paling Atas -->
      <div style="width: 100%; text-align: center;">
        <h1 id="welcome-name" style="margin: 0; font-size: 1.35rem; font-weight: 800; color: #ffffff; letter-spacing: 0.02em; font-family: var(--font-display); line-height: 1.2;">Student</h1>
      </div>

      <!-- 2. Tiga Kotak: Score (Solid) - Foto (Prominent) - Grade (Solid) -->
      <div style="display: flex; align-items: center; justify-content: center; gap: 14px; width: 100%; margin-top: 2px;">
        
        <!-- Kiri: Score Box (Warna Solid Sesuai Grade, Tanpa Transparan) -->
        <div id="banner-score-box" style="width: 76px; height: 76px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ea580c; border: 2px solid rgba(255, 255, 255, 0.2); box-shadow: 0 6px 16px rgba(0,0,0,0.35); flex-shrink: 0; transition: background 0.3s ease;">
          <span style="font-size: 0.62rem; color: #ffffff; text-transform: uppercase; font-weight: 800; letter-spacing: 0.08em; font-family: var(--font-display); line-height: 1; margin-bottom: 4px; opacity: 0.95;">SCORE</span>
          <div id="bottom-stat-avg-score" style="font-size: 1.45rem; font-weight: 900; color: #ffffff; font-family: var(--font-display); line-height: 1;">0%</div>
        </div>

        <!-- Tengah: Foto Siswa (Prominent + Border Solid) -->
        <div id="banner-avatar-container" class="banner-avatar-box" title="Click to view or change profile" style="margin: 0; width: 94px; height: 94px; border-radius: 22px; overflow: hidden; border: 3.5px solid #ea580c; position: relative; cursor: pointer; box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5); flex-shrink: 0; transition: border-color 0.3s ease; transform: scale(1.02); background: #1e293b;">
          <span id="banner-avatar-initial" style="font-size: 2.6rem; display: flex; align-items: center; justify-content: center; height: 100%; width: 100%; font-family: var(--font-display); font-weight: 800; color: #ffffff;">S</span>
          <img id="banner-avatar-img" class="hidden" alt="Profile Photo" style="width: 100%; height: 100%; object-fit: cover;" />
          <input type="file" id="photo-file-input" accept="image/*" class="hidden" />
          <div style="position: absolute; bottom: 4px; right: 4px; width: 22px; height: 22px; border-radius: 50%; background: #0f172a; border: 1.5px solid rgba(255,255,255,0.4); display: flex; align-items: center; justify-content: center; font-size: 11px; pointer-events: none;">📷</div>
        </div>

        <!-- Kanan: Grade Box (Warna Solid Sesuai Grade, Tanpa Transparan) -->
        <div id="stat-overall-grade-badge" style="width: 76px; height: 76px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #ea580c; border: 2px solid rgba(255, 255, 255, 0.2); box-shadow: 0 6px 16px rgba(0,0,0,0.35); flex-shrink: 0; cursor: pointer; transition: background 0.3s ease;">
          <span style="font-size: 0.62rem; color: #ffffff; text-transform: uppercase; font-weight: 800; letter-spacing: 0.08em; font-family: var(--font-display); line-height: 1; margin-bottom: 4px; opacity: 0.95;">GRADE</span>
          <div id="stat-overall-grade-value" style="font-size: 1.65rem; font-weight: 900; color: #ffffff; font-family: var(--font-display); line-height: 1;">—</div>
        </div>

      </div>

      <!-- 3. Keterangan Siswa Horizontal Rapi Tanpa Titik Liar -->
      <div id="welcome-meta-wrapper" style="width: 100%; text-align: center; margin-top: 2px; list-style: none !important;">
        <p id="welcome-meta-container" style="margin: 0; padding: 0; font-size: 0.82rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.05em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; justify-content: center; gap: 8px;">
          <span id="meta-inst">CEC</span>
          <span style="color: #475569;">•</span>
          <span id="meta-prog">CAMP</span>
          <span style="color: #475569;">•</span>
          <span id="meta-batch">131</span>
          <span style="color: #475569;">•</span>
          <span id="meta-lvl" style="color: #cbd5e1;">3rd Level</span>
        </p>
      </div>

      <!-- Elemen Kompatibilitas JS yang Disembunyikan Penuh -->
      <div class="hidden" style="display: none !important;">
        <span id="welcome-heading"></span>
        <span id="welcome-age"></span>
        <span id="welcome-meta"></span>
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

// 2. Timpa logika pembaruan teks agar langsung mengisi baris horizontal
// NOTE: I'll use a safer regex or plain replace for this part since the previous code might be varied
const jsCodeOriginal1 = `const welcomeMetaEl = document.getElementById('welcome-meta');`;
const replacementCode1 = `const elInst = document.getElementById('meta-inst');
  const elProg = document.getElementById('meta-prog');
  const elBatch = document.getElementById('meta-batch');
  const elLvl = document.getElementById('meta-lvl');
  if (elInst) elInst.textContent = session.institution_name || 'CEC';
  
  // Title case for program
  const prgName = session.program_name ? session.program_name.toLowerCase().replace(/\\b\\w/g, c => c.toUpperCase()) : 'Camp';
  if (elProg) elProg.textContent = prgName;
  
  if (elBatch) elBatch.textContent = session.batch_name ? String(session.batch_name).replace(/[^0-9]/g, '') || session.batch_name : '131';
  if (elLvl) elLvl.textContent = session.level_name ? (session.level_name.toLowerCase().includes('level') ? session.level_name : session.level_name + ' Level') : '3rd Level';
  
  // Suppress old welcome-meta logic
  const welcomeMetaEl = document.getElementById('welcome-meta');
  if(welcomeMetaEl) welcomeMetaEl.innerHTML = '';
`;

if (html.includes("const welcomeMetaEl = document.getElementById('welcome-meta');")) {
  html = html.replace(/const welcomeMetaEl = document\.getElementById\('welcome-meta'\);[\s\S]*?(?=const hdrNameEl = document\.getElementById\('header-student-name'\);)/g, replacementCode1 + "\n\n        ");
}

// 3. Pasang pewarnaan solid 100% (tanpa transparansi) di JS sinkronisasi grade
const jsCodeGrade = `const gradePalette = { S: '#f59e0b', A: '#10b981', B: '#3b82f6', C: '#f97316', D: '#eab308', E: '#ea580c', F: '#ef4444' };
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
    }`;

const solidGradeCode = `const gradePalette = { 
    S: '#f59e0b', 
    A: '#10b981', 
    B: '#3b82f6', 
    C: '#f97316', 
    D: '#eab308', 
    E: '#ea580c', 
    F: '#ef4444' 
  };
  const targetColor = gradePalette[overallGrade] || '#ea580c';

  const avatarBox = document.getElementById('banner-avatar-container');
  if (avatarBox) {
    avatarBox.style.borderColor = targetColor;
    avatarBox.style.boxShadow = '0 10px 28px rgba(0,0,0,0.5)';
  }

  const scoreBox = document.getElementById('banner-score-box');
  const gradeBadgeBox = document.getElementById('stat-overall-grade-badge');
  
  if (scoreBox) {
    scoreBox.style.background = targetColor;
    scoreBox.style.borderColor = 'rgba(255, 255, 255, 0.2)';
  }
  if (gradeBadgeBox) {
    gradeBadgeBox.style.background = targetColor;
    gradeBadgeBox.style.borderColor = 'rgba(255, 255, 255, 0.2)';
  }`;

if (html.includes(jsCodeGrade)) {
    html = html.replace(jsCodeGrade, solidGradeCode);
} else {
    // try regex for slightly different spacing
    const gradeRegex = /const gradePalette = \{ S: '#f59e0b', A: '#10b981', B: '#3b82f6', C: '#f97316', D: '#eab308', E: '#ea580c', F: '#ef4444' \};[\s\S]*?gradeBadgeBox\.style\.background = targetColor \+ '20';\s*\}/g;
    html = html.replace(gradeRegex, solidGradeCode);
}

fs.writeFileSync('dashboard.html', html);
console.log('Berhasil: Warna kotak Grade & Score solid 100% dan keterangan horizontal rapi!');
