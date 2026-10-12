const fs = require('fs');

let html = fs.readFileSync('dashboard.html', 'utf8');

// 1. Define new welcome banner HTML
const newBannerHTML = `
      <section class="welcome-banner card" aria-labelledby="welcome-heading" style="padding: clamp(12px, 3vw, 16px); display: flex; flex-direction: column; gap: 12px; background: var(--clr-bg-2); border-radius: var(--radius-xl); box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.08);">
        
        <!-- 1. Top Centered Element -->
        <h1 id="welcome-heading" class="text-xl font-extrabold text-white text-center mb-3" style="margin: 0 0 12px 0; font-size: 1.25rem; font-weight: 800; color: #fff; text-align: center;">
          <span id="welcome-name">Student</span>
        </h1>

        <!-- 2. Central 3-Column Flank Row -->
        <div class="flex items-center justify-between w-full px-2" style="display: flex; align-items: center; justify-content: space-between; gap: 12px; width: 100%; padding: 0 8px;">
          
          <!-- Left Flank (Avatar Column) -->
          <div style="display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 84px;">
            <div id="banner-avatar-container" class="banner-avatar-box" title="Click to view or change profile" style="width: 84px; height: 84px; border-radius: 16px; overflow: hidden; border: 2px solid rgba(99, 102, 241, 0.6); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0;">
              <span id="banner-avatar-initial" style="font-size: 2.2rem; font-weight: 800; color: #fff;">S</span>
              <img id="banner-avatar-img" class="hidden" alt="Profile Photo" style="width: 100%; height: 100%; object-fit: cover;" />
              <input type="file" id="photo-file-input" accept="image/*" class="hidden" />
            </div>
            <div class="mt-2 text-center" style="margin-top: 8px; text-align: center;">
              <span id="welcome-level" class="text-base font-extrabold text-white block" style="font-size: 1rem; font-weight: 800; color: #fff; display: block;">—</span>
              <span class="text-[0.65rem] text-slate-400 font-bold uppercase tracking-wider block" style="font-size: 0.65rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: block;">Current Level</span>
            </div>
          </div>

          <!-- Center Column (Vertical Metadata Stack) -->
          <div id="welcome-meta" class="flex-1 flex flex-col items-center justify-center text-center gap-1 px-2" style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 4px; padding: 0 8px;">
            <span class="text-xs font-bold text-slate-200 tracking-wide" style="font-size: 0.75rem; font-weight: 700; color: #e2e8f0; letter-spacing: 0.025em;">Loading...</span>
          </div>

          <!-- Right Flank (Grade Column) -->
          <div style="display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 84px;">
            <div id="stat-overall-grade-badge" class="result-grade-display grade-none" style="width: 84px; height: 84px; border-radius: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); flex-shrink: 0;">
              <div id="stat-overall-grade-value" style="font-size: 2.5rem; line-height: 1; font-weight: 900; font-family: var(--font-display);">—</div>
            </div>
            <div class="mt-2 text-center" style="margin-top: 8px; text-align: center;">
              <span id="bottom-stat-avg-score" class="text-base font-extrabold text-indigo-400 block" style="font-size: 1rem; font-weight: 800; color: #818cf8; display: block;">0%</span>
              <span class="text-[0.65rem] text-slate-400 font-bold uppercase tracking-wider block" style="font-size: 0.65rem; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: block;">Overall Avg</span>
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
      </section>
`;

// Replace the old welcome-banner with the new one
const bannerStart = html.indexOf('<section class="welcome-banner');
const bannerEnd = html.indexOf('<!-- MODULES GRID -->');
if (bannerStart !== -1 && bannerEnd !== -1) {
  html = html.substring(0, bannerStart) + newBannerHTML + '\n      ' + html.substring(bannerEnd);
}

// 2. Modify JS that sets `#welcome-meta` to generate the new vertical HTML
// Search for `welcomeMetaEl.textContent = parts.join(' • ');`
// and replace it with innerHTML building.
html = html.replace(/welcomeMetaEl\.textContent = parts\.join\('[^']*'\);/g, `
            welcomeMetaEl.innerHTML = '';
            parts.forEach((part, index) => {
              const span = document.createElement('span');
              span.textContent = part;
              if (index === 0) {
                span.className = "text-xs font-bold text-slate-200 tracking-wide";
                span.style.cssText = "font-size: 0.75rem; font-weight: 700; color: #e2e8f0; letter-spacing: 0.025em;";
              } else {
                span.className = "text-xs font-semibold text-slate-400 tracking-wide";
                span.style.cssText = "font-size: 0.75rem; font-weight: 600; color: #94a3b8; letter-spacing: 0.025em;";
              }
              welcomeMetaEl.appendChild(span);
              if (index < parts.length - 1) {
                const dot = document.createElement('span');
                dot.className = "w-1 h-1 rounded-full bg-slate-600";
                dot.style.cssText = "width: 4px; height: 4px; border-radius: 50%; background-color: #475569; display: block; margin: 2px 0;";
                welcomeMetaEl.appendChild(dot);
              }
            });
`);

fs.writeFileSync('dashboard.html', html);
console.log('Successfully refactored dashboard.html banner.');
