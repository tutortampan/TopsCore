const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'dashboard.html');
let html = fs.readFileSync(filePath, 'utf8');

const startIndex = html.indexOf('<!-- 3. GRADE LEGEND STRIP');
const endIndex = html.indexOf('<!-- 4. CLASSES SELECTOR');

if (startIndex === -1 || endIndex === -1) {
  console.error("Marker not found in dashboard.html!", { startIndex, endIndex });
  process.exit(1);
}

const replacement = `<!-- 3. GRADE DESCRIPTION CARD (40px) -->
    <div class="dashboard-grade-legend" id="dashboard-grade-legend" aria-label="Grade Achievement Status">
      <span class="achievement-status-text" id="dashboard-achievement-text"></span>
      <!-- Backward compatibility hidden items -->
      <button type="button" class="hidden" id="btn-lobby-flashcards"><span id="lobby-fc-count-badge">0</span></button>
    </div>

    `;

html = html.slice(0, startIndex) + replacement + html.slice(endIndex);
fs.writeFileSync(filePath, html, 'utf8');
console.log("Successfully updated dashboard.html to dynamic grade description!");

