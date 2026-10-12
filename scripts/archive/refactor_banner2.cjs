const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// The new HTML
const newBanner = `
    <section class="welcome-banner card" aria-labelledby="welcome-heading" style="padding: clamp(16px, 4vw, 20px); display: flex; flex-direction: column; gap: 16px; background: var(--clr-bg-2); border-radius: var(--radius-xl); box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.08);">
      
      <!-- 1. Top Centered Element -->
      <h1 id="welcome-heading" class="text-xl font-extrabold text-white text-center" style="margin: 0; font-size: 1.35rem; font-weight: 800; color: #fff; text-align: center; font-family: var(--font-display); letter-spacing: 0.025em;">
        <span id="welcome-name">Student</span>
      </h1>

      <!-- 2. Central 3-Column Flank Row -->
      <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; width: 100%;">
        
        <!-- Left Flank (Avatar Column) -->
        <div style="display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 84px; gap: 8px;">
          <!-- Using inline CSS variable --grade-color that will be dynamically set by JS, or fallback to primary -->
          <div id="banner-avatar-container" class="banner-avatar-box" title="Click to view profile" style="width: 84px; height: 84px; border-radius: 16px; overflow: hidden; border: 3px solid var(--grade-color, rgba(99, 102, 241, 0.6)); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: border-color 0.3s ease;">
            <span id="banner-avatar-initial" style="font-size: 2.2rem; font-weight: 800; color: #fff;">S</span>
            <img id="banner-avatar-img" class="hidden" alt="Profile Photo" style="width: 100%; height: 100%; object-fit: cover;" />
            <input type="file" id="photo-file-input" accept="image/*" class="hidden" />
          </div>
          <div class="text-center" style="text-align: center; margin-top: 4px;">
            <span id="welcome-level" style="font-size: 1.05rem; font-weight: 800; color: #fff; display: block; font-family: var(--font-display);">—</span>
            <span style="font-size: 0.6rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: block;">Current Level</span>
          </div>
        </div>

        <!-- Center Column (Metadata Stack / Thin ID Card) -->
        <div style="flex: 1; display: flex; align-items: center; justify-content: center; height: 84px;">
          <div id="welcome-meta-card" style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 4px; box-shadow: inset 0 2px 4px rgba(255,255,255,0.02); min-width: 110px;">
            <div style="font-size: 0.65rem; color: #cbd5e1; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; display: flex; align-items: center; gap: 4px;">
              <span>🏷️</span> ROSTER INFO
            </div>
            <div id="welcome-meta" style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
              <span style="font-size: 0.75rem; font-weight: 700; color: #e2e8f0; letter-spacing: 0.025em;">Loading...</span>
            </div>
          </div>
        </div>

        <!-- Right Flank (Grade Column) -->
        <div style="display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 84px; gap: 8px;">
          <!-- Added generic onclick to open profile modal as hinted by "KLIK: MODAL" -->
          <div id="stat-overall-grade-badge" class="result-grade-display grade-none" title="Click to view details" onclick="document.getElementById('profile-modal') && document.getElementById('profile-modal').classList.remove('hidden')" style="width: 84px; height: 84px; border-radius: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); flex-shrink: 0; cursor: pointer; transition: transform 0.2s ease;">
            <div id="stat-overall-grade-value" style="font-size: 2.5rem; line-height: 1; font-weight: 900; font-family: var(--font-display);">—</div>
          </div>
          <div class="text-center" style="text-align: center; margin-top: 4px;">
            <span id="bottom-stat-avg-score" style="font-size: 1.05rem; font-weight: 800; color: #818cf8; display: block; font-family: var(--font-display);">0%</span>
            <span style="font-size: 0.6rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: block;">Overall Avg</span>
          </div>
        </div>

      </div>

      <!-- Hidden metric elements to satisfy JS constraints if any -->
      <div class="hidden" style="display: none !important;">
        <span id="stat-overall-score">0%</span>
        <span id="bottom-stat-best-score">0%</span>
        <span id="stat-Assessments-done">0</span>
        <span id="overview-Assessments-count">0</span>
        <span id="overview-classes-count">0</span>
        <span id="overview-mic-status">Ready</span>
        <span id="bottom-stat-total-Assessments">0</span>
        <div id="welcome-level-panel"></div>
      </div>
    </section>`;

const start = html.indexOf('<section class="welcome-banner');
const endStr = '<!-- Classes Section';
const end = html.indexOf(endStr);

if (start !== -1 && end !== -1) {
  html = html.substring(0, start) + newBanner + '\n\n    ' + html.substring(end);
} else {
  console.log('Could not find bounds');
}

// Update JS for dynamic vertical roster & Grade color sync
// Find where grade is set: `gradeBadge.className = \`result-grade-display grade-\${overallGrade}\`;`
// We need to inject logic to sync the avatar border color.
const jsToInject = `
        const gradeBadge = document.getElementById('stat-overall-grade-badge');
        gradeBadge.className = \`result-grade-display grade-\${overallGrade}\`;
        
        // Sync Avatar Border Color to Grade Color
        const avatarContainer = document.getElementById('banner-avatar-container');
        if (avatarContainer) {
          const computedBg = window.getComputedStyle(gradeBadge).backgroundColor;
          if (computedBg && computedBg !== 'rgba(0, 0, 0, 0)' && computedBg !== 'transparent') {
            avatarContainer.style.setProperty('--grade-color', computedBg);
          } else {
            // Fallbacks based on grade
            const colors = { 'S': '#fbbf24', 'A': '#34d399', 'B': '#60a5fa', 'C': '#fb923c', 'D': '#f87171', 'E': '#ef4444', 'F': '#dc2626' };
            avatarContainer.style.setProperty('--grade-color', colors[overallGrade] || 'rgba(99, 102, 241, 0.6)');
          }
        }
`;
html = html.replace(/const gradeBadge = document\.getElementById\('stat-overall-grade-badge'\);\s*gradeBadge\.className = `result-grade-display grade-\$\{overallGrade\}`;/g, jsToInject);

// And update `#welcome-meta` JS to make it vertical with dots
const rosterJsToInject = `
            welcomeMetaEl.innerHTML = '';
            parts.forEach((part, index) => {
              const span = document.createElement('span');
              span.textContent = part;
              if (index === 0) {
                span.style.cssText = "font-size: 0.75rem; font-weight: 800; color: #f1f5f9; letter-spacing: 0.025em;";
              } else {
                span.style.cssText = "font-size: 0.7rem; font-weight: 600; color: #94a3b8; letter-spacing: 0.025em;";
              }
              welcomeMetaEl.appendChild(span);
              if (index < parts.length - 1) {
                const dot = document.createElement('span');
                dot.style.cssText = "width: 3px; height: 3px; border-radius: 50%; background-color: #475569; display: block; margin: 2px 0;";
                welcomeMetaEl.appendChild(dot);
              }
            });
`;
html = html.replace(/welcomeMetaEl\.textContent = parts\.join\('[^']*'\);/g, rosterJsToInject);

fs.writeFileSync('dashboard.html', html);
console.log('Refactored correctly.');
