const fs = require('fs');

function updateDashboard() {
  let html = fs.readFileSync('dashboard.html', 'utf8');

  const startTag = '<section class="welcome-banner card"';
  const endTag = '</section>';
  const startIndex = html.indexOf(startTag);
  const endIndex = html.indexOf(endTag, startIndex);
  
  if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find welcome-banner tags.');
    return;
  }

  const newBanner = `<section class="welcome-banner card" aria-labelledby="welcome-name" style="width: 100%; max-width: 540px; margin: 0 auto; border-radius: 24px; background: #0f172a; padding: 32px; color: white; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.05); position: relative; margin-bottom: 24px;">
  
  <!-- Nama Siswa -->
  <h1 id="welcome-name" style="text-align: center; font-size: 1.75rem; font-weight: 800; letter-spacing: 0.025em; margin: 0; font-family: var(--font-display); line-height: 1.2; color: #ffffff;">Student</h1>

  <hr style="width: 100%; border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 24px 0;">

  <!-- Area Tengah: Skor, Avatar, Grade -->
  <div style="display: flex; align-items: center; justify-content: space-between; gap: 16px;">
    
    <!-- Kotak Score -->
    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #172138; border-radius: 16px; padding: 24px 16px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.05);">
      <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 4px;">Score</span>
      <span id="bottom-stat-avg-score" style="font-size: 2.25rem; font-weight: 800; color: #ff7722; filter: drop-shadow(0 0 12px rgba(255, 119, 34, 0.4)); font-family: var(--font-display); line-height: 1;">0%</span>
    </div>

    <!-- Avatar Tengah -->
    <div style="position: relative; flex-shrink: 0; cursor: pointer;" onclick="document.getElementById('photo-file-input').click();">
      <div id="banner-avatar-container" title="Click to view or change profile" style="width: 112px; height: 112px; border-radius: 50%; padding: 4px; background: linear-gradient(to top right, #ff6600, #ff8833); box-shadow: 0 0 20px rgba(255, 119, 34, 0.35); display: flex; align-items: center; justify-content: center; transition: transform 0.3s ease;">
        <span id="banner-avatar-initial" style="font-size: 2.6rem; display: flex; align-items: center; justify-content: center; height: 100%; width: 100%; border-radius: 50%; font-family: var(--font-display); font-weight: 800; color: #ffffff; background: #1e293b;">S</span>
        <img id="banner-avatar-img" class="hidden" alt="Profile Photo" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; background: #1e293b;" />
        <input type="file" id="photo-file-input" accept="image/*" class="hidden" />
      </div>
    </div>

    <!-- Kotak Grade -->
    <div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #172138; border-radius: 16px; padding: 24px 16px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid rgba(255, 255, 255, 0.05);">
      <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 4px;">Grade</span>
      <span id="stat-overall-grade-value" style="font-size: 2.25rem; font-weight: 800; color: #ff7722; filter: drop-shadow(0 0 12px rgba(255, 119, 34, 0.4)); font-family: var(--font-display); line-height: 1;">â€”</span>
    </div>

  </div>

  <hr style="width: 100%; border: none; border-top: 1px solid rgba(255, 255, 255, 0.1); margin: 24px 0 24px 0;">

  <!-- Info Footer -->
  <div id="welcome-meta-wrapper" style="margin: 0; text-align: center; font-size: 0.875rem; font-weight: 600; letter-spacing: 0.05em; color: #cbd5e1; display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 0.75rem; list-style: none;">
    <span id="meta-inst">CEC</span>
    <span style="color: #475569;">|</span>
    <span id="meta-prog">CAMP</span>
    <span style="color: #475569;">|</span>
    <span id="meta-batch">131</span>
    <span style="color: #475569;">|</span>
    <span id="meta-lvl" style="text-transform: uppercase;">3RD LEVEL</span>
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
  </div>
`;

  html = html.substring(0, startIndex) + newBanner + html.substring(endIndex + endTag.length);
  
  fs.writeFileSync('dashboard.html', html);
  console.log('Successfully updated banner with top/bottom dividers and width constraints.');
}

updateDashboard();
