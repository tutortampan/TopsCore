const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

// The original Left Card:
const leftCardRegex = /<!-- Left: Level Card -->[\s\S]*?(?=<!-- Center: Photo -->)/;

// The original Bottom Metric:
const bottomMetricRegex = /<!-- Unified Metrics Row -->[\s\S]*?(?=<!-- Hidden metric elements)/;

// New Left Card (Average Score)
const newLeftCard = `<!-- Left: Avg Score Card -->
        <div style="width: 76px; height: 76px; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(99, 102, 241, 0.1); border: 2px solid rgba(99, 102, 241, 0.4); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); flex-shrink: 0;">
          <div id="bottom-stat-avg-score" style="font-size: 1.6rem; font-weight: 800; color: #818cf8; font-family: var(--font-display); line-height: 1;">0%</div>
          <div style="font-size: 0.6rem; color: #818cf8; text-transform: uppercase; font-weight: 800; margin-top: 4px; letter-spacing: 0.05em; text-align: center; line-height: 1;">AVG</div>
        </div>

        `;

// New Bottom Metric (Level)
const newBottomMetric = `<!-- Unified Metrics Row (Level) -->
      <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 14px; display: flex; justify-content: center; text-align: center;">
        <div id="welcome-level-panel" class="hidden">
          <div id="welcome-level" style="font-size: 1.8rem; font-weight: 800; color: var(--clr-text-1); line-height: 1; font-family: var(--font-display);">—</div>
          <div style="font-size: 0.9rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-top: 6px; letter-spacing: 0.05em;">Current Level</div>
        </div>
      </div>
      
      `;

html = html.replace(leftCardRegex, newLeftCard);
html = html.replace(bottomMetricRegex, newBottomMetric);

fs.writeFileSync('dashboard.html', html);
console.log('Swapped successfully!');
