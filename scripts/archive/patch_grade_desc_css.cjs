const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'css', 'dashboard.css');
let css = fs.readFileSync(cssPath, 'utf8');

const startMarker = '/* ============================================================\n   3. GRADE LEGEND STRIP';
const endMarker = '/* ============================================================\n   4. CLASSES SELECTOR BAR';

const startIndex = css.indexOf(startMarker);
const endIndex = css.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found in css/dashboard.css!", { startIndex, endIndex });
  process.exit(1);
}

const replacement = `/* ============================================================
   3. GRADE ACHIEVEMENT STATUS CARD (Strict 40px Height)
   Terms: FAIL, LESS, ENOUGH, GOOD, VERY GOOD, EXCELLENT (DECISION-018)
   Shows only the description of the student's evaluated grade; blank if empty.
   ============================================================ */
body.dashboard-page .dashboard-grade-legend {
  height: 40px !important;
  min-height: 40px !important;
  max-height: 40px !important;
  flex-shrink: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  border-radius: 10px !important;
  padding: 0 14px !important;
  margin: 0 !important;
  overflow: hidden !important;
}

body.dashboard-page .dashboard-grade-legend .achievement-status-text {
  font-family: 'Outfit', sans-serif !important;
  font-size: 1.05rem !important;
  font-weight: 900 !important;
  letter-spacing: 0.08em !important;
  text-transform: uppercase !important;
  line-height: 1 !important;
  color: var(--tier-color) !important;
  filter: drop-shadow(0 0 10px rgba(var(--tier-rgb), 0.7)) !important;
  text-align: center !important;
  transition: all 0.3s ease !important;
}

`;

css = css.slice(0, startIndex) + replacement + css.slice(endIndex);
fs.writeFileSync(cssPath, css, 'utf8');
console.log("Successfully updated css/dashboard.css for dynamic grade description!");

