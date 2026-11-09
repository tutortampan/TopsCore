const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '..', 'css', 'dashboard.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Target block from MODERN TIER AURA to the end of class-deck-box
const startMarker = '/* ============================================================\n   MODERN TIER AURA (Shared across all Lobby Cards)';
const endMarker = 'body.dashboard-page .class-deck-title {';

const startIndex = css.indexOf(startMarker);
const endIndex = css.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error("Markers not found in css/dashboard.css!", { startIndex, endIndex });
  process.exit(1);
}

const replacement = `/* ============================================================
   MODERN TIER AURA (Shared across all Lobby Cards)
   "Warna border dan warna latar belakang pada halaman result
    dan dashboard siswa mengikuti warna dari penghitungan skor/grade"
   ============================================================ */
:root,
body.dashboard-page {
  --tier-color: var(--grade-star);
  --tier-rgb: var(--grade-star-rgb);
}

body.dashboard-page #welcome-banner-section,
body.dashboard-page .dashboard-grade-legend,
body.dashboard-page .dashboard-classes-deck,
body.dashboard-page .dashboard-repetition-deck,
body.dashboard-page .dashboard-next-test-deck,
body.dashboard-page .next-test-card,
body.dashboard-page .dashboard-standings-card {
  border: 1px solid rgba(var(--tier-rgb), 0.35) !important;
  background: radial-gradient(ellipse 90% 70% at 50% 0%, rgba(var(--tier-rgb), 0.12), transparent 75%), #0f172a !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25) !important;
  box-sizing: border-box !important;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

/* ============================================================
   3. GRADE LEGEND STRIP (Strict 40px Height)
   E=FAIL / D=LESS / C=ENOUGH / B=GOOD / A=VERY GOOD / STAR=EXCELLENT or ALUMNI
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
  padding: 0 10px !important;
  margin: 0 !important;
  overflow: hidden !important;
}

body.dashboard-page .legend-scale-strip {
  display: flex !important;
  align-items: center !important;
  justify-content: space-evenly !important;
  width: 100% !important;
  font-family: 'Outfit', sans-serif !important;
  font-size: clamp(0.62rem, 2.1vw, 0.76rem) !important;
  font-weight: 800 !important;
  letter-spacing: 0.04em !important;
  text-transform: uppercase !important;
  white-space: nowrap !important;
  line-height: 1 !important;
}

body.dashboard-page .legend-item {
  display: inline-flex !important;
  align-items: center !important;
}

body.dashboard-page .legend-sep {
  color: rgba(255, 255, 255, 0.25) !important;
  font-weight: 400 !important;
  margin: 0 2px !important;
}

body.dashboard-page .legend-star {
  filter: drop-shadow(0 0 6px rgba(var(--grade-star-rgb), 0.75)) !important;
}

/* ============================================================
   4. CLASSES SELECTOR BAR (Strict 40px Height)
   Single unified bar: click opens available class list
   ============================================================ */
body.dashboard-page .dashboard-classes-deck {
  height: 40px !important;
  min-height: 40px !important;
  max-height: 40px !important;
  flex-shrink: 0 !important;
  margin: 0 !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  border-radius: 10px !important;
  overflow: hidden !important;
  box-sizing: border-box !important;
}

body.dashboard-page .dashboard-classes-bar {
  width: 100% !important;
  height: 40px !important;
  min-height: 40px !important;
  max-height: 40px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 0 12px !important;
  cursor: pointer !important;
  -webkit-user-select: none !important;
  user-select: none !important;
  background: transparent !important;
  box-sizing: border-box !important;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
}

body.dashboard-page .dashboard-classes-bar:hover {
  background: rgba(var(--tier-rgb), 0.08) !important;
}

body.dashboard-page .classes-bar-left {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  min-width: 0 !important;
  flex: 1 1 auto !important;
}

body.dashboard-page .classes-bar-icon {
  font-size: 1.1rem !important;
  flex-shrink: 0 !important;
}

body.dashboard-page .classes-bar-name {
  font-family: 'Outfit', sans-serif !important;
  font-size: 0.88rem !important;
  font-weight: 800 !important;
  color: #f8fafc !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

body.dashboard-page .classes-bar-caret {
  font-size: 0.8rem !important;
  color: var(--tier-color) !important;
  margin-left: 2px !important;
  transition: transform 0.2s ease !important;
  flex-shrink: 0 !important;
}

body.dashboard-page .classes-bar-right {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  flex-shrink: 0 !important;
}

body.dashboard-page .classes-bar-pct {
  font-family: 'Outfit', sans-serif !important;
  font-size: 0.78rem !important;
  font-weight: 800 !important;
  color: var(--tier-color) !important;
  padding: 2px 7px !important;
  background: rgba(var(--tier-rgb), 0.15) !important;
  border: 1px solid rgba(var(--tier-rgb), 0.3) !important;
  border-radius: 6px !important;
  font-variant-numeric: tabular-nums !important;
}

/* ============================================================
   5. PROGRESS POINTS / REPETITIONS ROW (Strict 40px Height)
   7 boxes of color for Vocab / Last assessment for other classes
   ============================================================ */
body.dashboard-page .dashboard-repetition-deck {
  height: 40px !important;
  min-height: 40px !important;
  max-height: 40px !important;
  flex-shrink: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 0 12px !important;
  margin: 0 !important;
  border-radius: 10px !important;
  box-sizing: border-box !important;
  overflow: hidden !important;
}

body.dashboard-page .repetition-deck-left {
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
  min-width: 0 !important;
  flex: 1 1 auto !important;
  overflow: hidden !important;
}

body.dashboard-page .rep-boxes-wrap {
  display: flex !important;
  align-items: center !important;
  gap: 5px !important;
}

body.dashboard-page .rep-box {
  width: 20px !important;
  min-width: 20px !important;
  max-width: 20px !important;
  height: 20px !important;
  min-height: 20px !important;
  max-height: 20px !important;
  border-radius: 5px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-family: 'Outfit', sans-serif !important;
  font-size: 0.65rem !important;
  font-weight: 800 !important;
  box-sizing: border-box !important;
  transition: all 0.2s ease !important;
}

body.dashboard-page .rep-box.is-passed {
  background: linear-gradient(135deg, #86efac 0%, var(--grade-star) 100%) !important;
  border: 1px solid var(--grade-star) !important;
  color: #0f172a !important;
  box-shadow: 0 0 8px rgba(var(--grade-star-rgb), 0.5) !important;
}

body.dashboard-page .rep-box.is-empty {
  background: rgba(15, 23, 42, 0.6) !important;
  border: 1px dashed rgba(255, 255, 255, 0.18) !important;
  color: rgba(255, 255, 255, 0.25) !important;
}

body.dashboard-page .repetition-deck-right {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  flex-shrink: 0 !important;
}

body.dashboard-page .rep-counter-pill {
  font-family: 'Outfit', sans-serif !important;
  font-size: 0.78rem !important;
  font-weight: 800 !important;
  color: var(--tier-color) !important;
  padding: 2px 8px !important;
  background: rgba(var(--tier-rgb), 0.15) !important;
  border: 1px solid rgba(var(--tier-rgb), 0.35) !important;
  border-radius: 6px !important;
  font-variant-numeric: tabular-nums !important;
}

body.dashboard-page .last-asm-title {
  font-family: 'Outfit', sans-serif !important;
  font-size: 0.82rem !important;
  font-weight: 700 !important;
  color: #f8fafc !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

body.dashboard-page .last-asm-score {
  font-family: 'Outfit', sans-serif !important;
  font-size: 0.85rem !important;
  font-weight: 900 !important;
  color: var(--tier-color) !important;
}

/* ============================================================
   6. NEXT TEST SECTION (Strict 40px Height)
   Single unified card, no separate floating label
   ============================================================ */
body.dashboard-page .dashboard-next-test-deck {
  height: 40px !important;
  min-height: 40px !important;
  max-height: 40px !important;
  flex-shrink: 0 !important;
  display: flex !important;
  align-items: center !important;
  margin: 0 !important;
  padding: 0 !important;
}

body.dashboard-page .next-test-card {
  height: 40px !important;
  min-height: 40px !important;
  max-height: 40px !important;
  width: 100% !important;
  border-radius: 10px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 0 12px !important;
  box-sizing: border-box !important;
  gap: 10px !important;
}

body.dashboard-page .next-test-left,
body.dashboard-page .next-asm-left {
  display: flex !important;
  align-items: center !important;
  gap: 0 !important;
  min-width: 0 !important;
  flex: 1 1 auto !important;
}

body.dashboard-page .next-test-title,
body.dashboard-page .next-asm-title {
  font-family: 'Outfit', sans-serif !important;
  font-size: 0.84rem !important;
  font-weight: 800 !important;
  color: #f8fafc !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  line-height: 1.25 !important;
}

body.dashboard-page .next-test-go-btn,
body.dashboard-page .next-asm-go-btn {
  width: 32px !important;
  min-width: 32px !important;
  max-width: 32px !important;
  height: 28px !important;
  min-height: 28px !important;
  max-height: 28px !important;
  padding: 0 !important;
  font-family: 'Outfit', sans-serif !important;
  border-radius: 6px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
}

body.dashboard-page .next-test-go-btn:hover,
body.dashboard-page .next-asm-go-btn:hover {
  filter: brightness(1.15) !important;
  transform: scale(1.05) !important;
}

body.dashboard-page .next-test-go-btn.is-retake,
body.dashboard-page .next-test-go-btn.is-retake-red,
body.dashboard-page .next-asm-go-btn.is-retake,
body.dashboard-page .next-asm-go-btn.is-retake-red {
  background: linear-gradient(135deg, var(--grade-e) 0%, #990000 100%) !important;
  box-shadow: 0 0 12px rgba(var(--grade-e-rgb), 0.55) !important;
}

body.dashboard-page .next-test-go-btn.is-start,
body.dashboard-page .next-test-go-btn.is-start-green,
body.dashboard-page .next-asm-go-btn.is-start,
body.dashboard-page .next-asm-go-btn.is-start-green {
  background: linear-gradient(135deg, #86efac 0%, var(--grade-star) 100%) !important;
  box-shadow: 0 0 12px var(--grade-star-glow) !important;
}

body.dashboard-page .next-test-status-icon,
body.dashboard-page .next-asm-status-icon {
  width: 32px !important;
  min-width: 32px !important;
  max-width: 32px !important;
  height: 28px !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-shrink: 0 !important;
}

/* ============================================================
   7. RANK STANDINGS & COMPLETED TESTS DUAL PANEL (Dynamic Remaining Screen Space)
   ============================================================ */
body.dashboard-page .dashboard-standings-card {
  flex: 1 1 0% !important;
  min-height: 100px !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  border-radius: 12px !important;
  padding: 0 !important;
  margin: 0 !important;
}

body.dashboard-page .dock-tab-header,
body.dashboard-page .standings-card-header {
  height: 36px !important;
  min-height: 36px !important;
  max-height: 36px !important;
  display: flex !important;
  align-items: stretch !important;
  justify-content: flex-start !important;
  padding: 0 8px !important;
  gap: 8px !important;
  background: rgba(15, 23, 42, 0.75) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  flex-shrink: 0 !important;
}

body.dashboard-page .dock-tab-btn {
  background: transparent !important;
  border: none !important;
  border-bottom: 2.5px solid transparent !important;
  color: #94a3b8 !important;
  font-family: 'Outfit', sans-serif !important;
  font-size: 0.74rem !important;
  font-weight: 800 !important;
  letter-spacing: 0.05em !important;
  padding: 0 8px !important;
  display: inline-flex !important;
  align-items: center !important;
  gap: 6px !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  height: 100% !important;
  margin: 0 !important;
}

body.dashboard-page .dock-tab-btn:hover {
  color: #ffffff !important;
  background: rgba(255, 255, 255, 0.04) !important;
}

body.dashboard-page .dock-tab-btn.active {
  color: #ffffff !important;
  border-bottom-color: var(--tier-color) !important;
  background: rgba(var(--tier-rgb), 0.12) !important;
}

body.dashboard-page .rank-number-chip {
  background: rgba(var(--tier-rgb), 0.25) !important;
  color: var(--tier-color) !important;
  border: 1px solid rgba(var(--tier-rgb), 0.4) !important;
  font-size: 0.72rem !important;
  font-weight: 800 !important;
  padding: 1px 6px !important;
  border-radius: 4px !important;
  font-variant-numeric: tabular-nums !important;
}

body.dashboard-page .count-badge {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #cbd5e1 !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  font-size: 0.7rem !important;
  font-weight: 800 !important;
  padding: 1px 6px !important;
  border-radius: 4px !important;
  font-variant-numeric: tabular-nums !important;
}

body.dashboard-page .dock-tab-pane {
  flex: 1 1 0% !important;
  min-height: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  width: 100% !important;
}

body.dashboard-page .dock-tab-pane.hidden {
  display: none !important;
}

body.dashboard-page .standings-table-header {
  display: grid !important;
  grid-template-columns: 28px 1fr 48px 40px !important;
  align-items: center !important;
  padding: 4px 12px !important;
  font-family: 'Outfit', sans-serif !important;
  font-size: 0.68rem !important;
  font-weight: 800 !important;
  color: #64748b !important;
  letter-spacing: 0.06em !important;
  background: rgba(30, 41, 59, 0.45) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
  flex-shrink: 0 !important;
}

body.dashboard-page .standings-table-header .th-rank { text-align: center !important; }
body.dashboard-page .standings-table-header .th-name { text-align: left !important; }
body.dashboard-page .standings-table-header .th-point { text-align: right !important; }
body.dashboard-page .standings-table-header .th-grade { text-align: center !important; }

body.dashboard-page .standings-table-wrap {
  flex: 1 1 0% !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
}

body.dashboard-page .standings-table-wrap::-webkit-scrollbar {
  display: none !important;
}

body.dashboard-page .standings-row {
  display: grid !important;
  grid-template-columns: 28px 1fr 48px 40px !important;
  align-items: center !important;
  padding: 5px 12px !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04) !important;
  transition: background 0.15s ease !important;
}

body.dashboard-page .standings-row:hover {
  background: rgba(255, 255, 255, 0.03) !important;
}

body.dashboard-page .standings-row.my-row {
  background: rgba(var(--tier-rgb), 0.1) !important;
  border-left: 3px solid var(--tier-color) !important;
}

body.dashboard-page .standings-row.rank-1-row {
  background: radial-gradient(ellipse 90% 60% at 20% 50%, rgba(245, 158, 11, 0.12), transparent 75%), rgba(15, 23, 42, 0.9) !important;
  border-left: 3px solid #fbbf24 !important;
}

/* Completed Tests Pane Styling */
body.dashboard-page .completed-table-wrap {
  flex: 1 1 0% !important;
  min-height: 0 !important;
  overflow-y: auto !important;
  padding: 4px 6px !important;
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
}

body.dashboard-page .completed-table-wrap::-webkit-scrollbar {
  display: none !important;
}

body.dashboard-page .completed-test-row {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  padding: 7px 10px !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
  transition: background 0.15s ease !important;
  cursor: pointer !important;
  gap: 10px !important;
}

body.dashboard-page .completed-test-row:hover {
  background: rgba(255, 255, 255, 0.04) !important;
}

body.dashboard-page .completed-left {
  display: flex !important;
  flex-direction: column !important;
  gap: 2px !important;
  min-width: 0 !important;
  flex: 1 1 auto !important;
}

body.dashboard-page .completed-title-wrap {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
  min-width: 0 !important;
}

body.dashboard-page .completed-type-pill {
  font-family: 'Outfit', sans-serif !important;
  font-size: 0.62rem !important;
  font-weight: 800 !important;
  padding: 1px 5px !important;
  border-radius: 4px !important;
  text-transform: uppercase !important;
  letter-spacing: 0.04em !important;
  flex-shrink: 0 !important;
}

body.dashboard-page .completed-type-pill.is-exam {
  background: rgba(168, 85, 247, 0.2) !important;
  color: #c084fc !important;
  border: 1px solid rgba(168, 85, 247, 0.4) !important;
}

body.dashboard-page .completed-type-pill.is-task {
  background: rgba(56, 189, 248, 0.2) !important;
  color: #38bdf8 !important;
  border: 1px solid rgba(56, 189, 248, 0.4) !important;
}

body.dashboard-page .completed-title {
  font-family: 'Outfit', sans-serif !important;
  font-size: 0.82rem !important;
  font-weight: 700 !important;
  color: #f8fafc !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

body.dashboard-page .completed-meta-date {
  font-size: 0.68rem !important;
  color: #64748b !important;
}

body.dashboard-page .completed-right {
  display: flex !important;
  align-items: center !important;
  gap: 8px !important;
  flex-shrink: 0 !important;
}

body.dashboard-page .completed-score-badge {
  font-family: 'Outfit', sans-serif !important;
  font-size: 0.92rem !important;
  font-weight: 800 !important;
  font-variant-numeric: tabular-nums !important;
}

body.dashboard-page .completed-grade-chip {
  width: 24px !important;
  height: 24px !important;
  border-radius: 6px !important;
  font-family: 'Outfit', sans-serif !important;
  font-size: 0.74rem !important;
  font-weight: 800 !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  line-height: 1 !important;
}

body.dashboard-page .btn-retry-test {
  display: inline-flex !important;
  align-items: center !important;
  gap: 4px !important;
  padding: 3px 8px !important;
  font-family: 'Outfit', sans-serif !important;
  font-size: 0.7rem !important;
  font-weight: 800 !important;
  border-radius: 6px !important;
  background: rgba(239, 68, 68, 0.15) !important;
  border: 1px solid rgba(239, 68, 68, 0.4) !important;
  color: #f87171 !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  flex-shrink: 0 !important;
}

body.dashboard-page .btn-retry-test:hover {
  background: rgba(239, 68, 68, 0.35) !important;
  border-color: #ef4444 !important;
  color: #ffffff !important;
  transform: scale(1.05) !important;
}

`;

const newCss = css.slice(0, startIndex) + replacement + css.slice(endIndex);
fs.writeFileSync(cssPath, newCss, 'utf8');
console.log("Successfully updated css/dashboard.css with blueprint heights and dual-panel styling!");

