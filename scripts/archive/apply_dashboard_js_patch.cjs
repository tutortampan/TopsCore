const fs = require('fs');
const path = require('path');

const jsPath = path.join(__dirname, '..', 'js', 'dashboard.js');
let js = fs.readFileSync(jsPath, 'utf8');

// 1. Add renderRepetitionMasteryRow right before renderNextAssignmentHero
const repRowFunction = `    async function renderRepetitionMasteryRow(allTests = [], attempts = [], classes = []) {
      const leftEl = document.getElementById('repetition-deck-left');
      const rightEl = document.getElementById('repetition-deck-right');
      if (!leftEl || !rightEl) return;

      const activeClassId = window._selectedClassId || (classes && classes[0]?.id);
      const activeClass = (classes || []).find(c => c.id === activeClassId) || (classes && classes[0]);
      const isVocab = activeClass && (
        /vocab/i.test(activeClass.name || '') ||
        (allTests || []).some(t => t.class_id === activeClassId && (/WORDS|PHRASE/i.test(t.shell_code || '') || /words|phrases/i.test(t.payload?.category || '')))
      );

      if (isVocab) {
        // 1. Vocabulary Class: 7 boxes of color & 0/7 up to 7/7
        let targetReps = 7;
        let minScore = 70;
        try {
          if (typeof fetchClassTestSettings === 'function' && activeClassId) {
            const settings = await fetchClassTestSettings(activeClassId).catch(() => null);
            if (settings?.taskRepetitions) targetReps = Number(settings.taskRepetitions) || 7;
            if (settings?.taskMinScore) minScore = Number(settings.taskMinScore) || 70;
          }
        } catch (_) {}

        // Find attempts on tasks in this active class
        const classTasks = (allTests || []).filter(t => t.class_id === activeClassId && !isExam(t) && !t.deleted_at);
        let maxPasses = 0;
        const taskAttemptsMap = {};
        (attempts || []).forEach(att => {
          const tid = att.test_id || att.Test_id;
          if (!tid) return;
          if (!taskAttemptsMap[tid]) taskAttemptsMap[tid] = [];
          taskAttemptsMap[tid].push(att);
        });

        classTasks.forEach(t => {
          const atts = taskAttemptsMap[t.id] || [];
          let passes = 0;
          atts.forEach(a => {
            const pct = parseFloat(a.percentage ?? a.effective_score ?? 0);
            const st = (a.status || '').toLowerCase();
            if (st === 'submitted' || st === 'auto_submitted' || st === 'evaluated') {
              if (a.is_forgiven || pct >= minScore) passes++;
            }
          });
          if (passes > maxPasses) maxPasses = passes;
        });

        const displayPasses = Math.min(maxPasses, targetReps);

        let boxesHtml = '<div class="rep-boxes-wrap">';
        for (let i = 1; i <= targetReps; i++) {
          const isPassed = i <= displayPasses;
          boxesHtml += \`<span class="rep-box \${isPassed ? 'is-passed' : 'is-empty'}" title="Pass \${i} of \${targetReps}">\${isPassed ? '✓' : i}</span>\`;
        }
        boxesHtml += '</div>';

        leftEl.innerHTML = boxesHtml;
        rightEl.innerHTML = \`<span class="rep-counter-pill">\${displayPasses}/\${targetReps}</span>\`;
      } else {
        // 2. Non-Vocab Class: Last Assessment Name on left, Last Score on right
        const classAttempts = (attempts || []).filter(a => {
          const t = (allTests || []).find(x => x.id === (a.test_id || a.Test_id));
          return t && t.class_id === activeClassId;
        });

        classAttempts.sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0));
        const lastAttempt = classAttempts[0];

        if (lastAttempt) {
          const t = (allTests || []).find(x => x.id === (lastAttempt.test_id || lastAttempt.Test_id));
          const title = t?.title || 'Last Assessment';
          const pct = parseFloat(lastAttempt.percentage || 0).toFixed(0);
          leftEl.innerHTML = \`<span class="last-asm-title" title="\${escapeHtml(title)}">Last: \${escapeHtml(title)}</span>\`;
          rightEl.innerHTML = \`<span class="last-asm-score">\${pct}%</span>\`;
        } else {
          leftEl.innerHTML = \`<span class="last-asm-title text-muted">No assessments taken yet</span>\`;
          rightEl.innerHTML = \`<span class="last-asm-score text-muted">—</span>\`;
        }
      }
    }

`;

if (!js.includes('function renderRepetitionMasteryRow')) {
  js = js.replace('async function renderNextAssignmentHero', `${repRowFunction}    async function renderNextAssignmentHero`);
}

// 2. Call renderRepetitionMasteryRow inside renderNextAssignmentHero
const heroHookTarget = 'section.classList.remove(\'hidden\');';
if (!js.includes('renderRepetitionMasteryRow(allTests, attempts, classes)')) {
  js = js.replace(heroHookTarget, `${heroHookTarget}\n      await renderRepetitionMasteryRow(allTests, attempts, classes).catch(() => {});`);
}

// 3. Update tierElements in computeOverallStats
const oldTierArray = `const tierElements = [
        document.getElementById('welcome-banner-section'),
        document.getElementById('dashboard-achievement-card'),
        document.getElementById('bottom-dock-section'),
        document.querySelector('.next-test-card'),
        document.getElementById('dashboard-classes-section'),
        document.getElementById('dashboard-classes-bar'),
        document.getElementById('dashboard-classes-boxes')
      ];`;

const newTierArray = `const tierElements = [
        document.getElementById('welcome-banner-section'),
        document.getElementById('dashboard-grade-legend'),
        document.getElementById('dashboard-achievement-card'),
        document.getElementById('bottom-dock-section'),
        document.getElementById('dashboard-repetition-deck'),
        document.querySelector('.next-test-card'),
        document.getElementById('dashboard-classes-section'),
        document.getElementById('dashboard-classes-bar'),
        document.getElementById('dashboard-classes-boxes')
      ];`;

if (js.includes(oldTierArray)) {
  js = js.replace(oldTierArray, newTierArray);
}

// 4. Update renderCompletedTestsBottom to sort descending, include tasks & exams, and render Retry button
const oldCompletedStart = `    // --- Render Completed Tests Section (Bottom of Dashboard) ---
    function renderCompletedTestsBottom(attempts, avgPct = 0) {`;

const oldCompletedEnd = `    // ============================================================
    // BATCH LEADERBOARD & DOCK TABS MODULE
    // ============================================================`;

const completedIndex = js.indexOf(oldCompletedStart);
const completedEndIndex = js.indexOf(oldCompletedEnd);

if (completedIndex === -1 || completedEndIndex === -1) {
  console.error("renderCompletedTestsBottom markers not found in js/dashboard.js!");
  process.exit(1);
}

const newCompletedImplementation = `    // --- Render Completed Tests Section (Bottom of Dashboard - Dual Panel) ---
    function renderCompletedTestsBottom(attempts = [], avgPct = 0) {
      const container = document.getElementById('completed-Tests-container');
      const countBadge = document.getElementById('dock-completed-count-badge');
      if (!container) return;

      // Filter out attempts on soft-deleted tests
      const validAttempts = (attempts || []).filter(att => {
        if (att.tests && att.tests.deleted_at) return false;
        const st = (att.status || '').toLowerCase();
        return st === 'submitted' || st === 'auto_submitted' || st === 'evaluated';
      });

      if (countBadge) {
        countBadge.textContent = validAttempts.length;
      }

      if (!validAttempts.length) {
        container.innerHTML = \`
          <div class="empty-state p-4 text-center" style="padding: 28px 12px;">
            <p style="color:var(--clr-text-3); font-size:0.82rem; margin:0;">No completed tests yet. Start with your assigned tests above!</p>
          </div>
        \`;
        return;
      }

      // Sort strictly descending by submitted_at so the latest taken is at the very top!
      const sortedAttempts = [...validAttempts].sort((a, b) => {
        const dateA = a.submitted_at ? new Date(a.submitted_at).getTime() : 0;
        const dateB = b.submitted_at ? new Date(b.submitted_at).getTime() : 0;
        return dateB - dateA;
      });

      let html = '';
      sortedAttempts.forEach(a => {
        const testObj = a.tests || a.Tests || {};
        const testId = a.test_id || a.Test_id || testObj.id || a.id;
        const testTitle = testObj.title || testObj.name || 'English Test';
        const isExamTest = typeof isWeeklyExam === 'function' ? isWeeklyExam(testObj) : (testObj.test_type === 'exam' || /exam/i.test(testTitle));
        const typeLabel = isExamTest ? 'EXAM' : 'TASK';
        const typeClass = isExamTest ? 'is-exam' : 'is-task';

        const isRem = Boolean(a.is_remedial_unlocked || a.is_remedial);
        const rawPct = parseFloat(a.percentage || 0);
        const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
        const pctFormatted = effPct.toFixed(0);
        const grade = a.grade || (typeof calculateGrade === 'function' ? calculateGrade(effPct) : 'E');
        const displayGrade = (typeof getGradeSymbol === 'function') ? getGradeSymbol(grade, effPct, isRem) : grade;
        const gradeColor = (typeof getGradeColorByScore === 'function') ? getGradeColorByScore(effPct) : (GRADE_PALETTE[grade]?.color || '#94a3b8');

        const dateStr = a.submitted_at ? new Date(a.submitted_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }) : 'Recent';

        const remSup = isRem ? '<sup class="asm-rem-sup" style="color:#eab308;font-size:0.65em;font-weight:800;margin-left:1px;">R</sup>' : '';
        const isStar = grade === '★' || grade === 'S';
        const textColor = isStar ? TOPSCORE_COLORS.TEXT_STAR : TOPSCORE_COLORS.TEXT_DARK;

        html += \`
          <div class="completed-test-row" onclick="window.location.href='result.html?attempt_id=\${escapeHtml(a.id)}'">
            <div class="completed-left">
              <div class="completed-title-wrap">
                <span class="completed-type-pill \${typeClass}">\${typeLabel}</span>
                <span class="completed-title" title="\${escapeHtml(testTitle)}">\${escapeHtml(testTitle)}</span>
              </div>
              <span class="completed-meta-date">\${escapeHtml(dateStr)}</span>
            </div>
            <div class="completed-right">
              <span class="completed-score-badge" style="color:\${gradeColor};">
                \${pctFormatted}%\${remSup}
              </span>
              <div class="completed-grade-chip" style="background:\${gradeColor}; color:\${textColor};" title="Grade \${displayGrade}">
                \${displayGrade}
              </div>
              <button type="button" 
                      class="btn-retry-test" 
                      title="Retry \${escapeHtml(testTitle)}" 
                      onclick="event.stopPropagation(); window.location.href='test.html?id=\${testId}'">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
                <span>Retry</span>
              </button>
            </div>
          </div>
        \`;
      });

      container.innerHTML = html;
    }

`;

js = js.slice(0, completedIndex) + newCompletedImplementation + js.slice(completedEndIndex);

// 5. Update setupDockTabs to handle tab switching and persist state
const oldSetupTabs = `    function setupDockTabs() {
      const btnStandings = document.getElementById('btn-dock-standings');
      const btnCompleted = document.getElementById('btn-dock-completed');
      const paneStandings = document.getElementById('dock-pane-standings');
      const paneCompleted = document.getElementById('dock-pane-completed');

      if (!btnStandings || !btnCompleted || !paneStandings || !paneCompleted) return;

      btnStandings.addEventListener('click', () => {
        btnStandings.classList.add('active');
        btnStandings.setAttribute('aria-selected', 'true');
        btnCompleted.classList.remove('active');
        btnCompleted.setAttribute('aria-selected', 'false');

        paneStandings.classList.remove('hidden');
        paneStandings.classList.add('active');
        paneCompleted.classList.add('hidden');
        paneCompleted.classList.remove('active');
      });

      btnCompleted.addEventListener('click', () => {
        btnCompleted.classList.add('active');
        btnCompleted.setAttribute('aria-selected', 'true');
        btnStandings.classList.remove('active');
        btnStandings.setAttribute('aria-selected', 'false');

        paneCompleted.classList.remove('hidden');
        paneCompleted.classList.add('active');
        paneStandings.classList.add('hidden');
        paneStandings.classList.remove('active');
      });
    }`;

const newSetupTabs = `    function setupDockTabs() {
      const btnStandings = document.getElementById('btn-dock-standings');
      const btnCompleted = document.getElementById('btn-dock-completed');
      const paneStandings = document.getElementById('dock-pane-standings');
      const paneCompleted = document.getElementById('dock-pane-completed');

      if (!btnStandings || !btnCompleted || !paneStandings || !paneCompleted) return;

      const setTab = (tab) => {
        if (tab === 'completed') {
          btnCompleted.classList.add('active');
          btnCompleted.setAttribute('aria-selected', 'true');
          btnStandings.classList.remove('active');
          btnStandings.setAttribute('aria-selected', 'false');

          paneCompleted.classList.remove('hidden');
          paneCompleted.classList.add('active');
          paneStandings.classList.add('hidden');
          paneStandings.classList.remove('active');
          try { sessionStorage.setItem('topscore_dock_tab', 'completed'); } catch (_) {}
        } else {
          btnStandings.classList.add('active');
          btnStandings.setAttribute('aria-selected', 'true');
          btnCompleted.classList.remove('active');
          btnCompleted.setAttribute('aria-selected', 'false');

          paneStandings.classList.remove('hidden');
          paneStandings.classList.add('active');
          paneCompleted.classList.add('hidden');
          paneCompleted.classList.remove('active');
          try { sessionStorage.setItem('topscore_dock_tab', 'standings'); } catch (_) {}
        }
      };

      btnStandings.addEventListener('click', () => setTab('standings'));
      btnCompleted.addEventListener('click', () => setTab('completed'));

      try {
        const savedTab = sessionStorage.getItem('topscore_dock_tab');
        if (savedTab === 'completed') setTab('completed');
      } catch (_) {}
    }`;

if (js.includes(oldSetupTabs)) {
  js = js.replace(oldSetupTabs, newSetupTabs);
}

fs.writeFileSync(jsPath, js, 'utf8');
console.log("Successfully updated js/dashboard.js with repetition logic, dual-panel tabs, and completed tests with retry!");

