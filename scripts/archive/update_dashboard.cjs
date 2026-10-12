const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

const regex = /<!-- Unified Metrics Row -->[\s\S]*?<!-- Hidden metric elements to satisfy JS constraints if any -->/;
const replacement = `<!-- Unified Metrics Row -->
      <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 14px; display: flex; justify-content: center; text-align: center;">
        <div>
          <div id="bottom-stat-avg-score" style="font-size: 1.8rem; font-weight: 800; color: var(--clr-text-1); line-height: 1; font-family: var(--font-display);">0%</div>
          <div style="font-size: 0.9rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; margin-top: 6px; letter-spacing: 0.05em;">Average Score</div>
        </div>
      </div>
      
      <!-- Hidden metric elements to satisfy JS constraints if any -->`;

if (html.match(regex)) {
  html = html.replace(regex, replacement);
  
  // also add the hidden items
  html = html.replace('<div class="hidden">\n        <span id="stat-Assessments-done">', '<div class="hidden">\n        <span id="stat-overall-score">0%</span>\n        <span id="bottom-stat-best-score">0%</span>\n        <span id="stat-Assessments-done">');
  
  fs.writeFileSync('dashboard.html', html);
  console.log('Successfully replaced');
} else {
  console.log('Could not find the target string');
}
