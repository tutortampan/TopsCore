/**
 * Phase 441 — 3-Part Live Sessions Overhaul Patch
 * 1. Matrix: All-themes columns, correct color semantics (Passed=Green/Ready=Yellow/Incomplete=Red)
 * 2. Wizard: 2-column layout, Answering Mode, Auto-Duration, fix Select All
 * 3. Card: Typography polish (min 11px), uniform layout
 */
'use strict';
const fs = require('fs');

const FILE = 'd:/Drives/Tutor Tampan/TopsCore/js/admin/tests-access.js';
let code = fs.readFileSync(FILE, 'utf8');
const original = code;

// =========================================================
// PART 1: Matrix — replace renderBatchReadinessMatrix()
// =========================================================
const OLD_MATRIX_FN = `function renderBatchReadinessMatrix(students, themesData, context, selectedThemeCode) {
  const { allAttempts = [] } = context;
  const currentTheme = themesData.find(t => t.code === selectedThemeCode) || themesData[0];
  if (!currentTheme) return '';

  const tasks = currentTheme.tasks || [];

  return \`
    <div class="card" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px 16px; margin-top: 4px; box-shadow: 0 4px 16px rgba(0,0,0,0.3);">
      <!-- Matrix Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <h4 style="margin: 0; font-size: 0.92rem; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 6px;">
            <span>📊</span> Batch Student Readiness &amp; Exam Eligibility Matrix
          </h4>
          <span style="font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: rgba(56,189,248,0.12); color: #38bdf8; border: 1px solid rgba(56,189,248,0.25);">
            \${students.length} Students
          </span>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <label for="matrix-theme-filter" style="font-size: 0.78rem; font-weight: 700; color: #94a3b8; margin: 0;">
            Viewing Quizzes for:
          </label>
          <select id="matrix-theme-filter" class="form-control" style="background: #1e293b; border: 1px solid rgba(255,255,255,0.15); color: #ffffff; font-size: 0.78rem; font-weight: 700; padding: 4px 10px; border-radius: 5px; cursor: pointer;">
            \${themesData.map(t => \`<option value="\${t.code}" \${t.code === currentTheme.code ? 'selected' : ''}>Theme \${t.code} (\${escapeHtml(t.name)})</option>\`).join('')}
          </select>
        </div>
      </div>

      <!-- Matrix Table -->
      <div class="table-wrap" style="max-height: 280px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px;">
        <table class="table" style="width: 100%; border-collapse: collapse; font-size: 12px; margin: 0;">
          <thead>
            <tr style="background: #1e293b; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <th style="padding: 8px 10px; text-align: center; width: 40px; font-size: 11px; color: #94a3b8; text-transform: uppercase; white-space: nowrap !important;">No</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 11px; color: #94a3b8; text-transform: uppercase; white-space: nowrap !important;">Student Name</th>
              \${tasks.map((task, idx) => {
                const shortTask = (task.shell_code || \`Q\${idx+1}\`).replace(/^.*?([A-Z0-9]+-TASK|[A-Z0-9]+-QUIZ).*?$/i, '$1');
                return \`<th style="padding: 8px 10px; text-align: center; font-size: 11px; color: #94a3b8; text-transform: uppercase; white-space: nowrap !important;" title="\${escapeHtml(task.title)}">\${escapeHtml(shortTask)}</th>\`;
              }).join('')}
              <th style="padding: 8px 10px; text-align: center; font-size: 11px; color: #94a3b8; text-transform: uppercase; white-space: nowrap !important;">Quiz Avg</th>
              <th style="padding: 8px 12px; text-align: center; font-size: 11px; color: #94a3b8; text-transform: uppercase; white-space: nowrap !important;">Exam Status</th>
            </tr>
          </thead>
          <tbody>
            \${students.length === 0 ? \`
              <tr>
                <td colspan="\${tasks.length + 4}" style="text-align: center; padding: 24px; color: #94a3b8; white-space: nowrap !important;">
                  No students found in this active batch.
                </td>
              </tr>
            \` : students.map((s, idx) => {
              // Task scores
              let totalScore = 0;
              let attemptedTasksCount = 0;

              const taskCells = tasks.map(task => {
                const sAttempts = allAttempts.filter(a => a.student_id === s.id && a.test_id === task.id);
                if (sAttempts.length === 0) {
                  return \`<td style="padding: 6px 10px; text-align: center; color: #64748b; white-space: nowrap !important;">—</td>\`;
                }
                const bestPct = Math.max(...sAttempts.map(a => Number(a.percentage || 0)));
                totalScore += bestPct;
                attemptedTasksCount++;
                const gradeInfo = getGrade(bestPct);
                const gradeColor = getGradeColorByScore(bestPct);
                return \`
                  <td style="padding: 6px 10px; text-align: center; white-space: nowrap !important;">
                    <span style="display: inline-block; font-size: 11px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: \${gradeColor}; color: #0f172a; min-width: 44px;">
                      \${Math.round(bestPct)}% (\${gradeInfo.symbol})
                    </span>
                  </td>
                \`;
              }).join('');

              const avgPct = tasks.length > 0 ? Math.round(totalScore / tasks.length) : 0;
              const allTasksPassed = tasks.length > 0 && attemptedTasksCount === tasks.length && avgPct >= 60;

              // Check if student has exam attempts
              const examIds = [currentTheme.wordsTest?.id, currentTheme.phrasesTest?.id].filter(Boolean);
              const examAttempts = allAttempts.filter(a => a.student_id === s.id && examIds.includes(a.test_id));
              let examStatusHtml = '';

              if (examAttempts.length > 0) {
                const examBestPct = Math.max(...examAttempts.map(a => Number(a.percentage || 0)));
                if (examBestPct >= 60) {
                  examStatusHtml = \`<span style="font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px; background: rgba(56,189,248,0.15); color: #38bdf8; border: 1px solid rgba(56,189,248,0.3);">✓ PASSED (\${Math.round(examBestPct)}%)</span>\`;
                } else {
                  examStatusHtml = \`<span style="font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px; background: rgba(var(--grade-c-rgb, 255,255,0),0.15); color: var(--grade-c, #fef08a); border: 1px solid var(--grade-c, #ffff00);">🟡 REMEDI NEEDED (\${Math.round(examBestPct)}%)</span>\`;
                }
              } else if (allTasksPassed) {
                examStatusHtml = \`<span style="font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px; background: rgba(var(--grade-a-rgb, 0,192,0),0.15); color: var(--grade-a, #86efac); border: 1px solid var(--grade-a, #00c000);">🟢 READY (NORMAL)</span>\`;
              } else {
                examStatusHtml = \`<span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: rgba(239,68,68,0.1); color: #fca5a5; border: 1px solid rgba(239,68,68,0.25);">⚠️ INCOMPLETE (\${attemptedTasksCount}/\${tasks.length})</span>\`;
              }

              return \`
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                  <td style="padding: 6px 10px; text-align: center; color: #64748b; font-family: monospace; white-space: nowrap !important;">\${idx + 1}</td>
                  <td style="padding: 6px 12px; font-weight: 700; color: #ffffff; white-space: nowrap !important;">
                    \${escapeHtml(s.name || 'Student')}
                  </td>
                  \${taskCells}
                  <td style="padding: 6px 10px; text-align: center; font-weight: 800; color: \${avgPct >= 60 ? '#86efac' : '#fca5a5'}; font-family: monospace; white-space: nowrap !important;">
                    \${avgPct}%
                  </td>
                  <td style="padding: 6px 12px; text-align: center; white-space: nowrap !important;">
                    \${examStatusHtml}
                  </td>
                </tr>
              \`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  \`;
}`;

const NEW_MATRIX_FN = `function renderBatchReadinessMatrix(students, themesData, context, _ignoredThemeCode) {
  const { allAttempts = [] } = context;
  if (!themesData || themesData.length === 0) return '';

  return \`
    <div class="card" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 12px 16px; margin-top: 4px; box-shadow: 0 4px 16px rgba(0,0,0,0.3);">
      <!-- Matrix Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <h4 style="margin: 0; font-size: 0.92rem; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 6px;">
            <span>📊</span> Batch Student Readiness &amp; Exam Eligibility Matrix
          </h4>
          <span style="font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 4px; background: rgba(56,189,248,0.12); color: #38bdf8; border: 1px solid rgba(56,189,248,0.25);">
            \${students.length} Students
          </span>
        </div>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <span style="font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(var(--grade-a-rgb,0,192,0),0.12); color:var(--grade-a,#86efac); border:1px solid rgba(var(--grade-a-rgb,0,192,0),0.3); font-weight:700;">✓ Passed</span>
          <span style="font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(var(--grade-c-rgb,255,255,0),0.12); color:var(--grade-c,#fef08a); border:1px solid rgba(var(--grade-c-rgb,255,255,0),0.3); font-weight:700;">🟡 Ready</span>
          <span style="font-size:11px; padding:2px 8px; border-radius:4px; background:rgba(var(--grade-e-rgb,255,0,0),0.1); color:var(--grade-e,#fca5a5); border:1px solid rgba(var(--grade-e-rgb,255,0,0),0.25); font-weight:700;">⚠ Incomplete</span>
        </div>
      </div>

      <!-- Matrix Table -->
      <div class="table-wrap" style="max-height: 320px; overflow-y: auto; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px;">
        <table class="table" style="width: 100%; border-collapse: collapse; font-size: 11px; margin: 0;">
          <thead>
            <tr style="background: #1e293b; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <th style="padding: 8px 10px; text-align: center; width: 36px; font-size: 11px; color: #94a3b8; text-transform: uppercase; white-space: nowrap !important;">No</th>
              <th style="padding: 8px 12px; text-align: left; font-size: 11px; color: #94a3b8; text-transform: uppercase; white-space: nowrap !important; min-width:120px;">Student Name</th>
              \${themesData.map(theme => \`<th colspan="2" style="padding: 8px 10px; text-align: center; font-size: 11px; color: \${theme.color || '#94a3b8'}; text-transform: uppercase; white-space: nowrap !important; border-left:1px solid rgba(255,255,255,0.08);">
                Theme \${theme.code}<br><span style="font-size:10px; font-weight:600; color:#64748b;">\${escapeHtml(theme.name)}</span>
              </th>\`).join('')}
              <th style="padding: 8px 12px; text-align: center; font-size: 11px; color: #94a3b8; text-transform: uppercase; white-space: nowrap !important; border-left:1px solid rgba(255,255,255,0.08);">Overall</th>
            </tr>
            <tr style="background: rgba(30,41,59,0.6); border-bottom: 1px solid rgba(255,255,255,0.06);">
              <th colspan="2" style="padding:4px 10px; font-size:10px; color:#64748b;"></th>
              \${themesData.map(() => \`
                <th style="padding:4px 8px; text-align:center; font-size:10px; color:#64748b; font-weight:600; white-space:nowrap; border-left:1px solid rgba(255,255,255,0.08);">Quizzes</th>
                <th style="padding:4px 8px; text-align:center; font-size:10px; color:#64748b; font-weight:600; white-space:nowrap;">Exam</th>
              \`).join('')}
              <th style="padding:4px 8px; text-align:center; font-size:10px; color:#64748b; border-left:1px solid rgba(255,255,255,0.08);">Status</th>
            </tr>
          </thead>
          <tbody>
            \${students.length === 0 ? \`
              <tr>
                <td colspan="\${2 + themesData.length * 2 + 1}" style="text-align: center; padding: 24px; color: #94a3b8;">
                  No students found in this active batch.
                </td>
              </tr>
            \` : students.map((s, idx) => {
              let overallThemesPassed = 0;

              const themeCells = themesData.map(theme => {
                const tasks = theme.tasks || [];
                const examIds = [theme.wordsTest?.id, theme.phrasesTest?.id].filter(Boolean);

                // Quiz avg
                let totalScore = 0, attempted = 0;
                tasks.forEach(task => {
                  const sAttempts = allAttempts.filter(a => a.student_id === s.id && a.test_id === task.id);
                  if (sAttempts.length > 0) {
                    totalScore += Math.max(...sAttempts.map(a => Number(a.percentage || 0)));
                    attempted++;
                  }
                });
                const avgPct = tasks.length > 0 ? Math.round(totalScore / tasks.length) : 0;
                const allQuizDone = tasks.length > 0 && attempted === tasks.length && avgPct >= 60;

                // Quiz cell
                let quizCellStyle, quizText;
                if (tasks.length === 0) {
                  quizCellStyle = 'color:#64748b;';
                  quizText = '—';
                } else if (allQuizDone) {
                  quizCellStyle = 'color:var(--grade-a,#86efac); font-weight:800;';
                  quizText = avgPct + '%';
                } else if (attempted > 0) {
                  quizCellStyle = 'color:var(--grade-c,#fef08a); font-weight:700;';
                  quizText = attempted + '/' + tasks.length;
                } else {
                  quizCellStyle = 'color:var(--grade-e,#fca5a5); font-weight:700;';
                  quizText = '0/' + tasks.length;
                }

                // Exam status
                const examAttempts = allAttempts.filter(a => a.student_id === s.id && examIds.includes(a.test_id));
                let examChip;
                if (examAttempts.length > 0) {
                  const best = Math.max(...examAttempts.map(a => Number(a.percentage || 0)));
                  if (best >= 60) {
                    overallThemesPassed++;
                    examChip = \`<span style="display:inline-block; font-size:11px; font-weight:800; padding:1px 7px; border-radius:4px; background:rgba(var(--grade-a-rgb,0,192,0),0.15); color:var(--grade-a,#86efac); border:1px solid rgba(var(--grade-a-rgb,0,192,0),0.4);">✓ \${Math.round(best)}%</span>\`;
                  } else {
                    examChip = \`<span style="display:inline-block; font-size:11px; font-weight:800; padding:1px 7px; border-radius:4px; background:rgba(var(--grade-c-rgb,255,255,0),0.12); color:var(--grade-c,#fef08a); border:1px solid rgba(var(--grade-c-rgb,255,255,0),0.35);">🟡 \${Math.round(best)}%</span>\`;
                  }
                } else if (allQuizDone) {
                  examChip = \`<span style="display:inline-block; font-size:11px; font-weight:700; padding:1px 7px; border-radius:4px; background:rgba(var(--grade-c-rgb,255,255,0),0.1); color:var(--grade-c,#fef08a); border:1px solid rgba(var(--grade-c-rgb,255,255,0),0.3);">Ready</span>\`;
                } else {
                  examChip = \`<span style="display:inline-block; font-size:11px; font-weight:700; padding:1px 7px; border-radius:4px; background:rgba(var(--grade-e-rgb,255,0,0),0.1); color:var(--grade-e,#fca5a5); border:1px solid rgba(var(--grade-e-rgb,255,0,0),0.25);">Incomplete</span>\`;
                }

                return \`
                  <td style="padding:5px 8px; text-align:center; white-space:nowrap; border-left:1px solid rgba(255,255,255,0.06); font-size:11px; \${quizCellStyle}">\${quizText}</td>
                  <td style="padding:5px 8px; text-align:center; white-space:nowrap;">\${examChip}</td>
                \`;
              }).join('');

              // Overall badge
              const totalThemes = themesData.length;
              let overallChip;
              if (overallThemesPassed === totalThemes && totalThemes > 0) {
                overallChip = \`<span style="font-size:11px; font-weight:800; padding:2px 8px; border-radius:4px; background:rgba(var(--grade-a-rgb,0,192,0),0.15); color:var(--grade-a,#86efac); border:1px solid rgba(var(--grade-a-rgb,0,192,0),0.4);">★ All Passed</span>\`;
              } else if (overallThemesPassed > 0) {
                overallChip = \`<span style="font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px; background:rgba(var(--grade-c-rgb,255,255,0),0.1); color:var(--grade-c,#fef08a); border:1px solid rgba(var(--grade-c-rgb,255,255,0),0.3);">\${overallThemesPassed}/\${totalThemes} Passed</span>\`;
              } else {
                overallChip = \`<span style="font-size:11px; font-weight:700; padding:2px 8px; border-radius:4px; background:rgba(var(--grade-e-rgb,255,0,0),0.08); color:var(--grade-e,#fca5a5); border:1px solid rgba(var(--grade-e-rgb,255,0,0),0.2);">None</span>\`;
              }

              return \`
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                  <td style="padding: 6px 10px; text-align: center; color: #64748b; font-family: monospace; white-space: nowrap;">\${idx + 1}</td>
                  <td style="padding: 6px 12px; font-weight: 700; color: #ffffff; white-space: nowrap; font-size:11px;">\${escapeHtml(s.name || 'Student')}</td>
                  \${themeCells}
                  <td style="padding: 6px 12px; text-align: center; white-space: nowrap; border-left:1px solid rgba(255,255,255,0.08);">\${overallChip}</td>
                </tr>
              \`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  \`;
}`;

if (code.includes('function renderBatchReadinessMatrix(students, themesData, context, selectedThemeCode)')) {
  code = code.replace(OLD_MATRIX_FN, NEW_MATRIX_FN);
  console.log('✅ PART 1: Matrix function replaced');
} else {
  console.error('❌ PART 1: Could not find matrix function signature — checking partial match...');
  // Try finding by shorter unique string
  const startIdx = code.indexOf('function renderBatchReadinessMatrix(');
  const endIdx = code.indexOf('\nfunction renderThemeCard(');
  if (startIdx !== -1 && endIdx !== -1) {
    code = code.slice(0, startIdx) + NEW_MATRIX_FN + '\n\n' + code.slice(endIdx);
    console.log('✅ PART 1: Matrix function replaced via start/end markers');
  } else {
    console.error('❌ PART 1: FAILED to replace matrix function');
  }
}

// =========================================================
// PART 1b: Remove matrix-theme-filter event listener
// =========================================================
const OLD_MATRIX_EVENT = `  // 1b. Matrix Theme Filter
  const matrixThemeFilter = container.querySelector('#matrix-theme-filter');
  matrixThemeFilter?.addEventListener('change', (e) => {
    _selectedMatrixTheme = e.target.value;
    const activeBatchStudents = (allStudents || []).filter(s => 
      s.batch_id === _selectedBatchId && 
      !s.deleted_at && 
      s.is_active !== false
    );
    const matrixContainer = container.querySelector('#batch-readiness-matrix-container');
    if (matrixContainer) {
      matrixContainer.innerHTML = renderBatchReadinessMatrix(activeBatchStudents, themesData, context, _selectedMatrixTheme);
      bindTestSessionsEvents(container, themesData, context);
    }
  });`;

if (code.includes(OLD_MATRIX_EVENT)) {
  code = code.replace(OLD_MATRIX_EVENT, '  // Matrix now shows all themes simultaneously (no filter dropdown)');
  console.log('✅ PART 1b: Matrix filter event listener removed');
} else {
  console.warn('⚠️ PART 1b: matrix event listener not found (may already be removed)');
}

// =========================================================
// PART 2: Wizard — rewrite modal HTML (lines 358-437)
// =========================================================
const OLD_WIZARD_HTML = `    <!-- Modal 1: Open Test Session (Normal / Remedial) -->
    <div id="modal-theme-open-session" class="modal-backdrop hidden" style="position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;">
      <div class="modal-box card" style="background:#0f172a; border:1px solid rgba(255,255,255,0.15); border-radius:12px; width:100%; max-width:600px; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 24px 50px rgba(0,0,0,0.8);">
        <div style="padding:18px 20px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:flex-start;">
          <div>
            <div id="open-modal-theme-badge" style="display:inline-block; font-size:0.7rem; font-weight:800; text-transform:uppercase; letter-spacing:0.06em; padding:2px 8px; border-radius:4px; margin-bottom:4px;">THEME A</div>
            <h3 id="open-modal-title" style="margin:0; font-size:1.25rem; font-weight:800; color:#ffffff;">Open Test Session</h3>
            <div id="open-modal-subtitle" style="font-size:0.8rem; color:#94a3b8; margin-top:2px;">Words Exam &amp; Phrases Exam unlocked simultaneously.</div>
          </div>
          <button type="button" class="btn btn-ghost btn-icon" id="btn-close-open-modal" style="color:#94a3b8; font-size:1.25rem; padding:4px 8px;">✕</button>
        </div>

        <div style="padding:20px; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:16px;">
          <!-- 1. Target Batch -->
          <div>
            <label class="form-label" style="font-weight:700; font-size:0.85rem; color:#ffffff; margin-bottom:6px; display:block;">
              1. Target Test Batch
            </label>
            <select id="open-modal-batch-select" class="form-control" style="width:100%; background:#1e293b; border:1px solid rgba(255,255,255,0.12); color:#ffffff; padding:8px 12px; border-radius:6px; font-weight:600;">
              \${activeBatches.map(b => \`<option value="\${b.id}" \${b.id === _selectedBatchId ? 'selected' : ''}>Batch \${escapeHtml(b.name || b.id)}</option>\`).join('')}
            </select>
          </div>

          <!-- 2. Test Duration -->
          <div>
            <label class="form-label" style="font-weight:700; font-size:0.85rem; color:#ffffff; margin-bottom:6px; display:block;">
              2. Test Duration Allocation (Minutes)
            </label>
            <div style="display:flex; align-items:center; gap:10px;">
              <input type="number" id="open-modal-duration-input" class="form-control" value="60" min="5" max="180" step="5" style="width:110px; background:#1e293b; border:1px solid rgba(255,255,255,0.12); color:#ffffff; padding:8px 12px; border-radius:6px; font-weight:800; font-size:1.05rem;">
              <span style="font-size:0.8rem; color:#94a3b8;">Minutes (Student countdown synchronizes with this duration)</span>
            </div>
          </div>

          <!-- 3. Session Status Banner (Locked Mode) -->
          <div id="open-modal-mode-banner" style="border-radius:8px; padding:10px 14px; font-size:0.82rem; font-weight:600;">
            <!-- Populated dynamically -->
          </div>

          <!-- 4. Whitelist Attendance for Eligible Students -->
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
              <label class="form-label" style="font-weight:700; font-size:0.85rem; color:#ffffff; margin:0;">
                4. Enrolled Students (<span id="open-modal-student-count" style="color:#38bdf8;">0</span> Selected)
              </label>
              <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
                <label id="open-modal-override-wrapper" style="font-size:0.75rem; color:#fbbf24; display:inline-flex; align-items:center; gap:5px; cursor:pointer; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.25); padding:3px 6px; border-radius:4px;" title="Tutor Override allows students who haven't finished quizzes yet to participate">
                  <input type="checkbox" id="open-modal-override-checkbox" style="cursor:pointer; width:13px; height:13px;">
                  <span>🛡️ Tutor Override</span>
                </label>
                <input type="text" id="open-modal-student-search" placeholder="🔍 Search student..." class="form-control" style="font-size:0.75rem; padding:4px 8px; width:110px; background:#1e293b; border:1px solid rgba(255,255,255,0.12); color:#ffffff; border-radius:4px;">
                <button type="button" class="btn btn-secondary btn-xs" id="btn-open-modal-sort" style="padding:4px 8px; font-size:0.75rem; font-weight:600;">🔤 A → Z</button>
                <button type="button" class="btn btn-secondary btn-xs" id="btn-open-modal-select-all" style="padding:4px 8px; font-size:0.75rem;">✅ All</button>
                <button type="button" class="btn btn-secondary btn-xs" id="btn-open-modal-deselect-all" style="padding:4px 8px; font-size:0.75rem;">❌ None</button>
              </div>
            </div>

            <div id="open-modal-students-list" style="max-height:220px; overflow-y:auto; border:1px solid rgba(255,255,255,0.08); border-radius:8px; background:rgba(0,0,0,0.3); padding:8px; display:flex; flex-direction:column; gap:6px;">
              <!-- Populated dynamically -->
            </div>

            <!-- Ineligible notice & toggle -->
            <div id="open-modal-ineligible-summary" style="margin-top:8px; font-size:0.78rem; color:#94a3b8; display:flex; justify-content:space-between; align-items:center;">
              <span id="open-modal-ineligible-text">ℹ️ Loading student eligibility...</span>
              <button type="button" id="btn-toggle-ineligible-view" class="btn btn-ghost btn-xs" style="font-size:0.72rem; color:#38bdf8; padding:0 4px; text-decoration:underline;">View Details</button>
            </div>
            <div id="open-modal-ineligible-details" class="hidden" style="margin-top:6px; max-height:120px; overflow-y:auto; background:rgba(0,0,0,0.4); border:1px dashed rgba(255,255,255,0.1); border-radius:6px; padding:8px; font-size:0.75rem;">
              <!-- Populated with ineligible list -->
            </div>
          </div>
        </div>

        <div style="padding:14px 20px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25);">
          <button type="button" class="btn btn-ghost" id="btn-cancel-open-modal" style="color:#94a3b8;">Cancel</button>
          <button type="button" class="btn btn-primary" id="btn-confirm-open-session" style="font-weight:700; padding:8px 20px; display:flex; align-items:center; gap:8px;">
            <span>🔓</span> Unlock Test Now
          </button>
        </div>
      </div>
    </div>`;

const NEW_WIZARD_HTML = `    <!-- Modal 1: Open Test Session (Normal / Remedial) -->
    <div id="modal-theme-open-session" class="modal-backdrop hidden" style="position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;">
      <div class="modal-box card" style="background:#0f172a; border:1px solid rgba(255,255,255,0.15); border-radius:12px; width:100%; max-width:820px; max-height:92vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 24px 50px rgba(0,0,0,0.8);">
        <!-- Modal Header -->
        <div style="padding:18px 24px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:flex-start; flex-shrink:0;">
          <div>
            <div id="open-modal-theme-badge" style="display:inline-block; font-size:0.7rem; font-weight:800; text-transform:uppercase; letter-spacing:0.06em; padding:2px 8px; border-radius:4px; margin-bottom:4px;">THEME A</div>
            <h3 id="open-modal-title" style="margin:0; font-size:1.25rem; font-weight:800; color:#ffffff;">Open Test Session</h3>
            <div id="open-modal-subtitle" style="font-size:0.8rem; color:#94a3b8; margin-top:2px;">Words Exam &amp; Phrases Exam unlocked simultaneously.</div>
          </div>
          <button type="button" class="btn btn-ghost btn-icon" id="btn-close-open-modal" style="color:#94a3b8; font-size:1.25rem; padding:4px 8px;">✕</button>
        </div>

        <!-- Modal Body: 2-Column Layout -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0; overflow:hidden; flex:1; min-height:0;">

          <!-- LEFT COLUMN: Settings -->
          <div style="padding:20px 20px 20px 24px; overflow-y:auto; display:flex; flex-direction:column; gap:18px; border-right:1px solid rgba(255,255,255,0.07);">

            <!-- 1. Target Test Batch -->
            <div>
              <label class="form-label" style="font-weight:800; font-size:0.78rem; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px; display:block;">
                1. Target Test Batch
              </label>
              <select id="open-modal-batch-select" class="form-control" style="width:100%; background:#1e293b; border:1px solid rgba(255,255,255,0.12); color:#ffffff; padding:9px 12px; border-radius:7px; font-weight:600; font-size:13px;">
                \${activeBatches.map(b => \`<option value="\${b.id}" \${b.id === _selectedBatchId ? 'selected' : ''}>Batch \${escapeHtml(b.name || b.id)}</option>\`).join('')}
              </select>
              <!-- Mode Banner inline -->
              <div id="open-modal-mode-banner" style="margin-top:10px; border-radius:7px; padding:9px 12px; font-size:12px; font-weight:600; line-height:1.4;">
                <!-- Populated dynamically -->
              </div>
            </div>

            <!-- 2. Answering Mode -->
            <div>
              <label class="form-label" style="font-weight:800; font-size:0.78rem; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:10px; display:block;">
                2. Answering Mode
              </label>
              <!-- Words Exam -->
              <div style="margin-bottom:10px;">
                <div style="font-size:12px; font-weight:700; color:#93c5fd; margin-bottom:6px;">📝 Words Exam</div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;" id="open-modal-words-mode-pills">
                  <button type="button" class="answer-mode-pill active" data-exam="words" data-mode="typing" style="font-size:12px; padding:5px 12px; border-radius:5px; border:1px solid rgba(56,189,248,0.4); background:rgba(56,189,248,0.15); color:#38bdf8; font-weight:700; cursor:pointer;">⌨️ Typing</button>
                  <button type="button" class="answer-mode-pill" data-exam="words" data-mode="multiple_choice" style="font-size:12px; padding:5px 12px; border-radius:5px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#94a3b8; font-weight:600; cursor:pointer;">🔘 Multiple Choice</button>
                  <button type="button" class="answer-mode-pill" data-exam="words" data-mode="voice" style="font-size:12px; padding:5px 12px; border-radius:5px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#94a3b8; font-weight:600; cursor:pointer;">🎙️ Voice</button>
                </div>
              </div>
              <!-- Phrases Exam -->
              <div>
                <div style="font-size:12px; font-weight:700; color:#c4b5fd; margin-bottom:6px;">💬 Phrases Exam</div>
                <div style="display:flex; gap:6px; flex-wrap:wrap;" id="open-modal-phrases-mode-pills">
                  <button type="button" class="answer-mode-pill active" data-exam="phrases" data-mode="chips" style="font-size:12px; padding:5px 12px; border-radius:5px; border:1px solid rgba(56,189,248,0.4); background:rgba(56,189,248,0.15); color:#38bdf8; font-weight:700; cursor:pointer;">🧩 Chips</button>
                  <button type="button" class="answer-mode-pill" data-exam="phrases" data-mode="typing" style="font-size:12px; padding:5px 12px; border-radius:5px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#94a3b8; font-weight:600; cursor:pointer;">⌨️ Typing</button>
                  <button type="button" class="answer-mode-pill" data-exam="phrases" data-mode="voice" style="font-size:12px; padding:5px 12px; border-radius:5px; border:1px solid rgba(255,255,255,0.1); background:transparent; color:#94a3b8; font-weight:600; cursor:pointer;">🎙️ Voice</button>
                </div>
              </div>
            </div>

            <!-- 3. Duration Allocation -->
            <div>
              <label class="form-label" style="font-weight:800; font-size:0.78rem; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:8px; display:block;">
                3. Duration Allocation (Minutes)
              </label>
              <!-- Auto-calc suggestion -->
              <div id="open-modal-duration-suggestion" style="font-size:12px; color:var(--grade-c,#fef08a); margin-bottom:8px; font-weight:600; display:flex; align-items:center; gap:6px;">
                <span>⚡</span> <span id="open-modal-duration-suggestion-text">Auto-calculating...</span>
              </div>
              <div style="display:flex; align-items:center; gap:10px;">
                <input type="number" id="open-modal-duration-input" class="form-control" value="60" min="5" max="180" step="5" style="width:100px; background:#1e293b; border:1px solid rgba(255,255,255,0.12); color:#ffffff; padding:9px 12px; border-radius:7px; font-weight:800; font-size:1.1rem;">
                <span style="font-size:12px; color:#94a3b8; line-height:1.4;">Minutes<br><span style="font-size:11px; color:#64748b;">Timer syncs to this value</span></span>
              </div>
            </div>

          </div>

          <!-- RIGHT COLUMN: Students -->
          <div style="padding:20px 24px 20px 20px; overflow-y:auto; display:flex; flex-direction:column; gap:12px;">
            <div>
              <!-- Header row -->
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:6px;">
                <label class="form-label" style="font-weight:800; font-size:0.78rem; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; margin:0;">
                  4. Enrolled Students <span style="color:#38bdf8;">(<span id="open-modal-student-count">0</span> Selected)</span>
                </label>
                <label id="open-modal-override-wrapper" style="font-size:12px; color:var(--grade-c,#fef08a); display:inline-flex; align-items:center; gap:5px; cursor:pointer; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.25); padding:4px 8px; border-radius:5px;" title="Allow students who haven't finished quizzes to participate">
                  <input type="checkbox" id="open-modal-override-checkbox" style="cursor:pointer; width:13px; height:13px;">
                  <span>🛡️ Tutor Override</span>
                </label>
              </div>
              <!-- Search + sort + all/none -->
              <div style="display:flex; gap:6px; align-items:center; margin-bottom:8px; flex-wrap:wrap;">
                <input type="text" id="open-modal-student-search" placeholder="🔍 Search student..." class="form-control" style="font-size:12px; padding:5px 10px; flex:1; min-width:80px; background:#1e293b; border:1px solid rgba(255,255,255,0.12); color:#ffffff; border-radius:5px;">
                <button type="button" class="btn btn-secondary btn-xs" id="btn-open-modal-sort" style="padding:5px 9px; font-size:12px; font-weight:600; white-space:nowrap;">🔤 A→Z</button>
                <button type="button" class="btn btn-secondary btn-xs" id="btn-open-modal-select-all" style="padding:5px 9px; font-size:12px; font-weight:600;">✅ All</button>
                <button type="button" class="btn btn-secondary btn-xs" id="btn-open-modal-deselect-all" style="padding:5px 9px; font-size:12px; font-weight:600;">❌ None</button>
              </div>
              <!-- Student list -->
              <div id="open-modal-students-list" style="max-height:280px; overflow-y:auto; border:1px solid rgba(255,255,255,0.08); border-radius:8px; background:rgba(0,0,0,0.3); padding:8px; display:flex; flex-direction:column; gap:5px;">
                <!-- Populated dynamically -->
              </div>
              <!-- Ineligible notice -->
              <div id="open-modal-ineligible-summary" style="margin-top:8px; font-size:12px; color:#94a3b8; display:flex; justify-content:space-between; align-items:center;">
                <span id="open-modal-ineligible-text">ℹ️ Loading eligibility...</span>
                <button type="button" id="btn-toggle-ineligible-view" class="btn btn-ghost btn-xs" style="font-size:11px; color:#38bdf8; padding:0 4px; text-decoration:underline;">View Details</button>
              </div>
              <div id="open-modal-ineligible-details" class="hidden" style="margin-top:6px; max-height:120px; overflow-y:auto; background:rgba(0,0,0,0.4); border:1px dashed rgba(255,255,255,0.1); border-radius:6px; padding:8px; font-size:12px;">
                <!-- Populated with ineligible list -->
              </div>
            </div>
          </div>

        </div>

        <!-- Modal Footer -->
        <div style="padding:14px 24px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.25); flex-shrink:0;">
          <button type="button" class="btn btn-ghost" id="btn-cancel-open-modal" style="color:#94a3b8; font-size:13px;">Cancel</button>
          <button type="button" class="btn btn-primary" id="btn-confirm-open-session" style="font-weight:700; padding:9px 24px; display:flex; align-items:center; gap:8px; font-size:13px;">
            <span>🔓</span> Unlock Test Now
          </button>
        </div>
      </div>
    </div>`;

if (code.includes('<!-- Modal 1: Open Test Session (Normal / Remedial) -->')) {
  code = code.replace(OLD_WIZARD_HTML, NEW_WIZARD_HTML);
  console.log('✅ PART 2: Wizard modal HTML replaced');
} else {
  console.error('❌ PART 2: Could not find wizard modal HTML');
}

// =========================================================
// PART 2b: Fix Select All (select ALL students in batch, not just eligible)
// =========================================================
const OLD_SELECT_ALL = `  modal.querySelector('#btn-open-modal-select-all').onclick = () => {
    const curBatchId = batchSelect.value;
    const batchStudents = (context.allStudents || []).filter(s => s.batch_id === curBatchId && !s.deleted_at && s.is_active !== false);
    const evaluated = evaluateStudentsEligibility({
      students: batchStudents,
      theme,
      themeTasks: theme.tasks,
      wordsTest: theme.wordsTest,
      phrasesTest: theme.phrasesTest,
      classTests: context.classTests || [],
      allAttempts: context.allAttempts || [],
      mode
    });
    const targetList = tutorOverrideActive ? evaluated.filter(e => mode === 'normal' || !e.isAlreadyPassed) : evaluated.filter(e => e.isEligible);
    targetList.forEach(e => checkedStudentIds.add(e.student.id));
    renderModalStudents();
  };`;

const NEW_SELECT_ALL = `  modal.querySelector('#btn-open-modal-select-all').onclick = () => {
    const curBatchId = batchSelect.value;
    const batchStudents = (context.allStudents || []).filter(s => s.batch_id === curBatchId && !s.deleted_at && s.is_active !== false);
    const evaluated = evaluateStudentsEligibility({
      students: batchStudents,
      theme,
      themeTasks: theme.tasks,
      wordsTest: theme.wordsTest,
      phrasesTest: theme.phrasesTest,
      classTests: context.classTests || [],
      allAttempts: context.allAttempts || [],
      mode
    });
    // When Tutor Override is ON → select ALL students in batch regardless of eligibility
    // When OFF → select only eligible students
    if (tutorOverrideActive) {
      evaluated.forEach(e => checkedStudentIds.add(e.student.id));
    } else {
      evaluated.filter(e => e.isEligible).forEach(e => checkedStudentIds.add(e.student.id));
    }
    renderModalStudents();
  };`;

if (code.includes(OLD_SELECT_ALL)) {
  code = code.replace(OLD_SELECT_ALL, NEW_SELECT_ALL);
  console.log('✅ PART 2b: Select All fixed');
} else {
  console.warn('⚠️ PART 2b: Select All old pattern not found');
}

// =========================================================
// PART 2c: Add answering mode pill JS logic + auto-duration
// After the existing confirmBtn.onclick section, add pill binding
// Look for where openThemeSessionModal initializes
// =========================================================
const OLD_DURATION_SETUP = `  const durationInput = modal.querySelector('#open-modal-duration-input');`;

const NEW_DURATION_SETUP = `  // --- Answering mode pill state ---
  let _selectedAnswerModeWords = 'typing';
  let _selectedAnswerModePhrases = 'chips';

  // Bind answering mode pills
  modal.querySelectorAll('.answer-mode-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const exam = pill.dataset.exam;
      const modeVal = pill.dataset.mode;
      if (exam === 'words') _selectedAnswerModeWords = modeVal;
      else if (exam === 'phrases') _selectedAnswerModePhrases = modeVal;
      // Update active state within same exam group
      const groupId = exam === 'words' ? '#open-modal-words-mode-pills' : '#open-modal-phrases-mode-pills';
      modal.querySelectorAll(groupId + ' .answer-mode-pill').forEach(p => {
        const isActive = p.dataset.mode === modeVal;
        p.style.background = isActive ? 'rgba(56,189,248,0.15)' : 'transparent';
        p.style.border = isActive ? '1px solid rgba(56,189,248,0.4)' : '1px solid rgba(255,255,255,0.1)';
        p.style.color = isActive ? '#38bdf8' : '#94a3b8';
        p.style.fontWeight = isActive ? '700' : '600';
      });
    });
  });

  // --- Auto-duration calculation ---
  const durationInput = modal.querySelector('#open-modal-duration-input');
  const suggestionText = modal.querySelector('#open-modal-duration-suggestion-text');
  const wordsQ = theme.wordsTest?.total_questions || 0;
  const phrasesQ = theme.phrasesTest?.total_questions || 0;
  const totalQ = wordsQ + phrasesQ;
  const autoDurationMins = totalQ > 0 ? Math.max(10, Math.ceil(totalQ * 1.5)) : (theme.wordsTest?.working_duration_minutes || theme.phrasesTest?.working_duration_minutes || 60);
  if (suggestionText) {
    suggestionText.textContent = totalQ > 0
      ? \`Auto-Calculated: \${autoDurationMins} mins (\${totalQ} questions × 1.5)\`
      : \`Default: \${autoDurationMins} mins (no question count available)\`;
  }
  if (durationInput && !durationInput.dataset.userSet) {
    durationInput.value = autoDurationMins;
  }
  if (durationInput) {
    durationInput.addEventListener('change', () => { durationInput.dataset.userSet = '1'; });
  }`;

if (code.includes(OLD_DURATION_SETUP)) {
  code = code.replace(OLD_DURATION_SETUP, NEW_DURATION_SETUP);
  console.log('✅ PART 2c: Answering mode pills + auto-duration added');
} else {
  console.warn('⚠️ PART 2c: duration input setup line not found — searching alternate...');
}

// =========================================================
// PART 3: Card Typography — fix font sizes in readiness badge
// Fix: 0.68rem → 11px minimum; also fix READY badge to use CSS vars
// =========================================================
// Fix hardcoded colors in readiness badge (line 963 area)
const OLD_READINESS_BADGE = `        <span style="font-size:0.68rem; font-weight:800; padding:1px 5px; border-radius:3px; \${eligibleNormalCount === batchTotalStudents && batchTotalStudents > 0 ? 'background:rgba(0,192,0,0.15); color:#86efac; border:1px solid rgba(0,192,0,0.3);' : 'background:rgba(245,158,11,0.15); color:#fde047; border:1px solid rgba(245,158,11,0.3);'}">
          👥 \${eligibleNormalCount}/\${batchTotalStudents} READY (\${readinessPct}%)
        </span>`;

const NEW_READINESS_BADGE = `        <span style="font-size:11px; font-weight:800; padding:2px 7px; border-radius:4px; \${eligibleNormalCount === batchTotalStudents && batchTotalStudents > 0 ? 'background:rgba(var(--grade-a-rgb,0,192,0),0.15); color:var(--grade-a,#86efac); border:1px solid rgba(var(--grade-a-rgb,0,192,0),0.3);' : 'background:rgba(var(--grade-c-rgb,255,255,0),0.12); color:var(--grade-c,#fef08a); border:1px solid rgba(var(--grade-c-rgb,255,255,0),0.3);'}">
          👥 \${eligibleNormalCount}/\${batchTotalStudents} READY (\${readinessPct}%)
        </span>`;

if (code.includes(OLD_READINESS_BADGE)) {
  code = code.replace(OLD_READINESS_BADGE, NEW_READINESS_BADGE);
  console.log('✅ PART 3a: Readiness badge font + SSOT colors fixed');
} else {
  console.warn('⚠️ PART 3a: Readiness badge pattern not found');
}

// Fix card exam type subtitle font: 0.72rem → 11px
const OLD_SUBTITLE_FONT = `      <div style="font-size:0.72rem; margin-top:2px; display:flex; justify-content:space-between; align-items:center;">`;
const NEW_SUBTITLE_FONT = `      <div style="font-size:11px; margin-top:2px; display:flex; justify-content:space-between; align-items:center;">`;
if (code.includes(OLD_SUBTITLE_FONT)) {
  code = code.replace(OLD_SUBTITLE_FONT, NEW_SUBTITLE_FONT);
  console.log('✅ PART 3b: Card subtitle font 11px');
}

// Fix card theme pill: 0.7rem → 11px
const OLD_THEME_PILL_SIZE = `class="theme-pill" style="font-size:0.7rem;`;
const NEW_THEME_PILL_SIZE = `class="theme-pill" style="font-size:11px;`;
if (code.includes(OLD_THEME_PILL_SIZE)) {
  code = code.replace(OLD_THEME_PILL_SIZE, NEW_THEME_PILL_SIZE);
  console.log('✅ PART 3c: Theme pill font 11px');
}

// Fix LIVE badge font: 0.7rem → 11px
const OLD_LIVE_BADGE = `\`\n            <span style="font-size:0.7rem; font-weight:800; padding:2px 6px; border-radius:4px; \${isRemedial`;
const NEW_LIVE_BADGE = `\`\n            <span style="font-size:11px; font-weight:800; padding:2px 6px; border-radius:4px; \${isRemedial`;
if (code.includes(OLD_LIVE_BADGE)) {
  code = code.replace(OLD_LIVE_BADGE, NEW_LIVE_BADGE);
  console.log('✅ PART 3d: LIVE badge font 11px');
}

// Fix duration badge font: 0.7rem → 11px
const OLD_DURATION_BADGE = `class="duration-badge" style="font-size:0.7rem;`;
const NEW_DURATION_BADGE = `class="duration-badge" style="font-size:11px;`;
if (code.includes(OLD_DURATION_BADGE)) {
  // Replace all occurrences
  while (code.includes(OLD_DURATION_BADGE)) {
    code = code.replace(OLD_DURATION_BADGE, NEW_DURATION_BADGE);
  }
  console.log('✅ PART 3e: Duration badge font 11px (all)');
}

// =========================================================
// PART 4: Bump cache busters
// =========================================================
code = code.replace(/tests-access\.js\?v=\d+_v\d+/g, 'tests-access.js?v=20261113_v441');
console.log('✅ PART 4: Cache buster bumped to v441');

// =========================================================
// Write output
// =========================================================
if (code === original) {
  console.error('❌ FATAL: No changes were made — something went wrong. File NOT written.');
  process.exit(1);
}
fs.writeFileSync(FILE, code, 'utf8');
console.log('\n✅ ALL DONE: File written successfully.');
console.log('Total length:', code.length, 'chars');
