const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'dashboard.html');
let content = fs.readFileSync(filePath, 'utf8');

// Also update cache buster at line 606
content = content.replace(/dashboard\.js\?v=20261104_v122/g, 'dashboard.js?v=20261104_v123');
content = content.replace(/sw\.js\?v=20261104_v122/g, 'sw.js?v=20261104_v123');

const targetRegex = /<!-- 3\. ACHIEVEMENT STATUS CARD \(50px\) -->[\s\S]*?<!-- Hidden compatibility elements for existing JS routines -->[\s\S]*?<\/div>\s*<\/div>/;

const replacement = `<!-- 3. GRADE LEGEND STRIP (40px) -->
    <div class="dashboard-grade-legend" id="dashboard-grade-legend" aria-label="Official Grading Scale Legend">
      <div class="legend-scale-strip">
        <span class="legend-item" style="color: var(--grade-e)">E=FAIL</span>
        <span class="legend-sep">/</span>
        <span class="legend-item" style="color: var(--grade-d)">D=LESS</span>
        <span class="legend-sep">/</span>
        <span class="legend-item" style="color: var(--grade-c)">C=ENOUGH</span>
        <span class="legend-sep">/</span>
        <span class="legend-item" style="color: var(--grade-b)">B=GOOD</span>
        <span class="legend-sep">/</span>
        <span class="legend-item" style="color: var(--grade-a)">A=VERY GOOD</span>
        <span class="legend-sep">/</span>
        <span class="legend-item legend-star" style="color: var(--grade-star)">★=EXCELLENT or ALUMNI</span>
      </div>
      <!-- Backward compatibility hidden items -->
      <span class="hidden" id="dashboard-achievement-text"></span>
      <button type="button" class="hidden" id="btn-lobby-flashcards"><span id="lobby-fc-count-badge">0</span></button>
    </div>

    <!-- 4. CLASSES SELECTOR BAR (40px: Unified Bar - click opens modal list) -->
    <section id="dashboard-classes-section" class="dashboard-classes-deck">
      <div id="dashboard-classes-bar" class="dashboard-classes-bar" role="button" tabindex="0" title="Click to switch class">
        <div class="classes-bar-left">
          <span class="classes-bar-icon">📚</span>
          <span class="classes-bar-name" id="classes-bar-current-name">Select Class</span>
          <span class="classes-bar-caret">▾</span>
        </div>
        <div class="classes-bar-right">
          <span class="classes-bar-pct" id="classes-bar-progress-val">0%</span>
        </div>
      </div>
      <!-- Backward compatibility hidden container -->
      <div id="dashboard-classes-boxes" class="dashboard-classes-boxes hidden" data-count="1"></div>
    </section>

    <!-- 5. PROGRESS POINTS / REPETITIONS ROW (40px: 7 boxes / last assessment) -->
    <section id="dashboard-repetition-deck" class="dashboard-repetition-deck" aria-label="Repetition Mastery and Progress">
      <div id="repetition-deck-left" class="repetition-deck-left">
        <!-- Populated dynamically by renderRepetitionMasteryRow -->
      </div>
      <div id="repetition-deck-right" class="repetition-deck-right">
        <!-- Populated dynamically by renderRepetitionMasteryRow -->
      </div>
    </section>

    <!-- 6. NEXT ASSESSMENT BAR (40px: Single Unified Card, no floating label) -->
    <section id="up-next-section" class="dashboard-next-test-deck" aria-label="Next Assessment">
      <div id="up-next-container" class="next-test-card">
        <!-- Populated dynamically by renderNextAssignmentHero -->
      </div>
    </section>

    <!-- 7. RANK STANDINGS & COMPLETED TESTS DUAL PANEL (DYNAMIC RESPONSIVE FIT) -->
    <section id="bottom-dock-section" class="dashboard-standings-card" aria-label="Rankings and Completed Tests">
      <!-- Dual-Tab Header -->
      <div class="standings-card-header dock-tab-header">
        <button type="button" class="dock-tab-btn active" id="btn-dock-standings" role="tab" aria-selected="true" aria-controls="dock-pane-standings">
          <span class="tab-label-text">RANKING : MY RANK</span>
          <span id="dock-my-rank-number" class="rank-number-chip">#--</span>
        </button>
        <button type="button" class="dock-tab-btn" id="btn-dock-completed" role="tab" aria-selected="false" aria-controls="dock-pane-completed">
          <span class="tab-label-text">COMPLETED TESTS</span>
          <span id="dock-completed-count-badge" class="count-badge">0</span>
        </button>
      </div>

      <!-- Pane A: Batch Leaderboard Table -->
      <div id="dock-pane-standings" class="dock-tab-pane active" role="tabpanel">
        <div class="standings-table-header">
          <span class="th-col th-rank">NO</span>
          <span class="th-col th-name">STUDENTS NAME</span>
          <span class="th-col th-point">POINT</span>
          <span class="th-col th-grade">GRADE</span>
        </div>
        <div class="standings-table-wrap" id="batch-leaderboard-container">
          <div class="empty-state p-4 text-center">
            <div class="spinner"></div>
            <p>Loading Rank Standings…</p>
          </div>
        </div>
      </div>

      <!-- Pane B: Completed Tests Table (Latest on Top + Retry Button) -->
      <div id="dock-pane-completed" class="dock-tab-pane hidden" role="tabpanel">
        <div class="completed-table-wrap" id="completed-Tests-container">
          <div class="empty-state p-4 text-center">
            <p style="color:var(--clr-text-3);">Loading Completed Tests…</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Hidden compatibility elements for existing JS routines -->
    <div class="hidden" aria-hidden="true">
      <div class="classes-grid" id="classes-grid"></div>
      <div id="dock-my-rank-badge"></div>
      <div id="standings-card-title"></div>
      <div id="leaderboard-my-summary">
        <span id="leaderboard-my-rank"></span>
        <span id="leaderboard-champion-name"></span>
      </div>
    </div>`;

if (!targetRegex.test(content)) {
  console.error("Target regex not found in dashboard.html!");
  process.exit(1);
}

content = content.replace(targetRegex, replacement);
fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully updated dashboard.html with blueprint alignment!");

