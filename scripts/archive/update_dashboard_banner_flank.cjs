const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// 1. Locate and completely overwrite the .welcome-banner section
const startTag = '<section class="welcome-banner card"';
const endTag = '</section>';
const startIndex = html.indexOf(startTag);
const endIndex = html.indexOf(endTag, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  const newBanner = `<section class="welcome-banner card" aria-labelledby="welcome-heading" style="padding: 16px; display: flex; flex-direction: column; gap: 8px; background: var(--clr-bg-2, #0b1523); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.4);">
      <!-- 1. Student Name (Top Center) -->
      <div style="width: 100%; text-align: center; margin-bottom: 2px;">
        <h1 id="welcome-heading" style="margin: 0; font-size: 1.35rem; font-weight: 800; color: #fff; letter-spacing: 0.02em; font-family: var(--font-display);">
          <span id="welcome-name">Student</span>
        </h1>
      </div>

      <!-- 2. Primary 3-Column Flank Row -->
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; width: 100%; margin-top: 4px;">
        
        <!-- Left Column: Photo & Level -->
        <div style="display: flex; flex-direction: column; align-items: center; width: 84px; flex-shrink: 0;">
          <div id="banner-avatar-container" class="banner-avatar-box" title="Click to view or change profile" style="margin: 0; width: 84px; height: 84px; border-radius: 16px; overflow: hidden; border: 2px solid #6366f1; position: relative; cursor: pointer; box-shadow: 0 8px 20px rgba(0,0,0,0.35); transition: border-color 0.3s ease, box-shadow 0.3s ease;">
            <span id="banner-avatar-initial" style="font-size: 2.2rem; display: flex; align-items: center; justify-content: center; height: 100%; width: 100%;">S</span>
            <img id="banner-avatar-img" class="hidden" alt="Profile Photo" style="width: 100%; height: 100%; object-fit: cover;" />
            <input type="file" id="photo-file-input" accept="image/*" class="hidden" />
            <div style="position: absolute; bottom: 3px; right: 3px; width: 20px; height: 20px; border-radius: 50%; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; font-size: 10px; pointer-events: none;">📷</div>
          </div>
          <div style="margin-top: 6px; text-align: center; width: 100%;">
            <div id="welcome-level" style="font-size: 1.05rem; font-weight: 800; color: #fff; font-family: var(--font-display); line-height: 1.1;">—</div>
            <div style="font-size: 0.62rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">Current Level</div>
          </div>
        </div>

        <!-- Center Column: Digital Roster ID Card -->
        <div style="flex: 1; min-width: 0; margin: 0 4px; padding: 10px 6px; border-radius: 14px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.07); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 84px; box-sizing: border-box;">
          <span style="font-size: 0.58rem; font-weight: 800; color: #818cf8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 3px;">ROSTER INFO</span>
          <span id="roster-institution" style="font-size: 0.78rem; font-weight: 800; color: #f1f5f9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">CEC</span>
          <span style="width: 4px; height: 4px; border-radius: 50%; background: #64748b; margin: 2px 0;"></span>
          <span id="roster-program" style="font-size: 0.72rem; font-weight: 700; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">CAMP</span>
          <span style="width: 4px; height: 4px; border-radius: 50%; background: #64748b; margin: 2px 0;"></span>
          <span id="roster-batch" style="font-size: 0.72rem; font-weight: 700; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%;">BATCH 131</span>
        </div>

        <!-- Right Column: Grade Badge & Overall Avg Score -->
        <div style="display: flex; flex-direction: column; align-items: center; width: 84px; flex-shrink: 0;">
          <div class="result-grade-display grade-none" id="stat-overall-grade-badge" style="margin: 0 !important; width: 84px !important; height: 84px !important; border-radius: 16px !important; display: flex !important; align-items: center !important; justify-content: center !important; box-shadow: 0 8px 20px rgba(0,0,0,0.35) !important; cursor: pointer;">
            <div id="stat-overall-grade-value" style="font-size: 2.4rem; line-height: 1; font-weight: 900; font-family: var(--font-display);">—</div>
          </div>
          <div style="margin-top: 6px; text-align: center; width: 100%;">
            <div id="bottom-stat-avg-score" style="font-size: 1.05rem; font-weight: 800; color: #818cf8; font-family: var(--font-display); line-height: 1.1;">0%</div>
            <div style="font-size: 0.62rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">Overall Avg</div>
          </div>
        </div>

      </div>

      <!-- Hidden compatibility elements to prevent JS errors -->
      <div class="hidden" style="display: none !important;">
        <span id="welcome-age"></span>
        <span id="welcome-meta"></span>
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

// 2. Ensure JS updates the roster elements and sets avatar border color
if (!html.includes('roster-institution')) {
  // Regex needs to be broad enough to catch the previous modifications I made.
  // My previous modification added innerHTML for welcomeMetaEl.
  // I will just replace the block inside `if (welcomeMetaEl) { ... }` or completely override it.
  // It's safer to find the place where session data is loaded into banner.
  
  // Replace the original or modified block:
  const rosterJs = `const instEl = document.getElementById('roster-institution');
            const progEl = document.getElementById('roster-program');
            const batchEl = document.getElementById('roster-batch');
            if (instEl) instEl.textContent = session.institution_name || '-';
            if (progEl) progEl.textContent = session.program_name || '-';
            if (batchEl) batchEl.textContent = session.batch_name ? (String(session.batch_name).toUpperCase().includes('BATCH') ? session.batch_name : 'BATCH ' + session.batch_name) : '-';`;

  // Since I modified it with `welcomeMetaEl.innerHTML = ''`, I'll look for `const welcomeMetaEl = document.getElementById('welcome-meta');`
  html = html.replace(
    /const welcomeMetaEl = document\.getElementById\('welcome-meta'\);[\s\S]*?(?=const welcomeLevelPanelEl)/,
    rosterJs + '\n            '
  );
}

// 3. Synchronize avatar border color with grade palette in computeOverallStats
if (!html.includes('avatarBox.style.borderColor')) {
  const syncJs = `gradeBadge.className = \`result-grade-display grade-\${overallGrade}\`;
      const avatarBox = document.getElementById('banner-avatar-container');
      if (avatarBox) {
        const gradePalette = { S: '#f59e0b', A: '#10b981', B: '#3b82f6', C: '#f97316', D: '#eab308', E: '#ea580c', F: '#ef4444' };
        const targetColor = gradePalette[overallGrade] || '#6366f1';
        avatarBox.style.borderColor = targetColor;
        avatarBox.style.boxShadow = \`0 8px 24px \${targetColor}40\`;
      }`;
  
  html = html.replace(
    /gradeBadge\.className\s*=\s*`result-grade-display grade-\$\{overallGrade\}`;[\s\S]*?(?=renderCompletedAssessmentsBottom)/,
    syncJs + '\n  \n        '
  );
}

fs.writeFileSync('dashboard.html', html);
console.log('Successfully applied clean flank layout to dashboard.html');
