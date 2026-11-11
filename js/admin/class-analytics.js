// ============================================================
// TOPSCORE LMS — CLASS VOCABULARY ERROR ANALYTICS ENGINE
// Authoritative Item-Level Missed Vocabulary Analytics
// ============================================================

import { getSupabase } from '../supabase.js';
import { escapeHtml } from '../api.js';
import { TOPSCORE_COLORS, getGradeColorByScore } from '../grading.js';

/**
 * Calculates Damerau-Levenshtein distance between two strings
 */
function levenshteinDistance(a, b) {
  const s1 = (a || '').toLowerCase().trim();
  const s2 = (b || '').toLowerCase().trim();
  const m = s1.length;
  const n = s2.length;
  const d = [];

  for (let i = 0; i <= m; i++) {
    d[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    d[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,       // deletion
        d[i][j - 1] + 1,       // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return d[m][n];
}

/**
 * Diagnoses why students missed this specific vocabulary item
 */
function diagnoseErrorReason(targetWord, mistakesList, isSpokenMode = false) {
  if (!mistakesList || mistakesList.length === 0) return { label: 'Safe', color: 'badge-success', icon: '✅' };

  let blankCount = 0;
  let spellingTypoCount = 0;
  let distractorCount = 0;
  let formCount = 0;
  const totalMistakes = mistakesList.length;

  mistakesList.forEach(m => {
    const ans = (m.studentAnswer || '').trim();
    if (!ans) {
      blankCount++;
      return;
    }
    const dist = levenshteinDistance(targetWord, ans);
    if (dist <= 2 && dist > 0) {
      spellingTypoCount++;
    } else if (ans.length >= 4 && targetWord.toLowerCase().startsWith(ans.toLowerCase().slice(0, 3))) {
      formCount++;
    } else {
      distractorCount++;
    }
  });

  if (blankCount / totalMistakes >= 0.45) {
    return { label: 'Timeout / Blank', color: '#ef4444', icon: '⏱️', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.35)' };
  }
  if (isSpokenMode) {
    return { label: 'STT / Audio Homophone', color: '#06b6d4', icon: '🎧', bg: 'rgba(6,182,212,0.15)', border: 'rgba(6,182,212,0.35)' };
  }
  if (spellingTypoCount / totalMistakes >= 0.35) {
    return { label: 'Spelling Typo', color: '#eab308', icon: '🔤', bg: 'rgba(234,179,8,0.15)', border: 'rgba(234,179,8,0.35)' };
  }
  if (formCount / totalMistakes >= 0.3) {
    return { label: 'Word Form / Root Error', color: '#f97316', icon: '🔄', bg: 'rgba(249,115,22,0.15)', border: 'rgba(249,115,22,0.35)' };
  }
  return { label: 'Distractor Trap / Concept Error', color: '#a855f7', icon: '🪤', bg: 'rgba(168,85,247,0.15)', border: 'rgba(168,85,247,0.35)' };
}

/**
 * Main renderer for True Vocabulary Test Analytics
 */
export async function renderClassVocabularyAnalytics(container, context = {}) {
  if (!container) return;

  const {
    classId,
    className,
    classTests = [],
    allBatches = [],
    allStudents = [],
    batchMap = {}
  } = context;

  container.innerHTML = typeof window.getLoadingStateHtml === 'function'
    ? window.getLoadingStateHtml('Loading class vocabulary item error analytics...')
    : `
      <div class="topscore-loading-center">
        <div class="spinner"></div>
        <p class="loading-text">Loading class vocabulary item error analytics...</p>
      </div>
    `;

  const testIds = classTests.map(t => t.id).filter(Boolean);
  if (testIds.length === 0) {
    container.innerHTML = `
      <div class="card p-5 text-center text-muted" style="margin:0;">
        <div style="font-size:2.5rem; margin-bottom:0.5rem;">📊</div>
        <h3 style="color:var(--clr-text-1); font-weight:700; margin-bottom:0.4rem;">No Tests in This Class Yet</h3>
        <p style="font-size:0.85rem; max-width:420px; margin:0 auto;">Publish tasks or exams first in the <strong>Class Tests</strong> tab to begin gathering item-level mistake analytics.</p>
      </div>
    `;
    return;
  }

  // Student name map
  const studentMap = (allStudents || []).reduce((acc, s) => {
    acc[s.id] = s.name || s.student_name || 'Student';
    return acc;
  }, {});

  // Test map
  const testMap = classTests.reduce((acc, t) => {
    acc[t.id] = t;
    return acc;
  }, {});

  try {
    const sb = await getSupabase();
    const { data: attempts, error: attErr } = await sb.from('attempts')
      .select(`
        id, test_id, student_id, percentage, grade, status,
        attempt_answers (
          id, question_id, student_answer, correct_answer_snapshot, accepted_answers_snapshot, score, is_correct, evaluation_result, question_snapshot
        )
      `)
      .in('test_id', testIds)
      .in('status', ['submitted', 'auto_submitted', 'evaluated', 'graded']);

    if (attErr) throw attErr;

    // Aggregate by vocabulary target
    const vocabAggregation = new Map();

    (attempts || []).forEach(att => {
      const tInfo = testMap[att.test_id] || {};
      const sName = studentMap[att.student_id] || 'Student';

      (att.attempt_answers || []).forEach(ans => {
        const qSnap = ans.question_snapshot || {};
        let target = (ans.correct_answer_snapshot || qSnap.target_word || qSnap.prompt || '').trim();
        if (!target) return;

        // Clean target
        const rawKey = target.toLowerCase();
        let translation = qSnap.translation || qSnap.clue || qSnap.indonesian || '—';
        let category = qSnap.word_type || qSnap.category || (target.includes(' ') ? 'Phrase' : 'Word');
        let answerType = qSnap.answer_type || 'written';

        if (!vocabAggregation.has(rawKey)) {
          vocabAggregation.set(rawKey, {
            key: rawKey,
            targetWord: target,
            translation,
            category,
            answerType,
            testTitles: new Set(),
            totalAttempts: 0,
            incorrectCount: 0,
            mistakeFrequencies: {},
            mistakesList: []
          });
        }

        const entry = vocabAggregation.get(rawKey);
        entry.totalAttempts++;
        if (tInfo.title) entry.testTitles.add(tInfo.title);

        const score = typeof ans.score === 'number' ? ans.score : (ans.is_correct ? 1 : 0);
        const isWrong = score < 1;

        if (isWrong) {
          entry.incorrectCount++;
          const studentAns = (ans.student_answer || '').trim() || '(Blank/Timeout)';
          entry.mistakeFrequencies[studentAns] = (entry.mistakeFrequencies[studentAns] || 0) + 1;
          entry.mistakesList.push({
            studentId: att.student_id,
            studentName: sName,
            studentAnswer: studentAns,
            score,
            evalResult: ans.evaluation_result || 'incorrect',
            testTitle: tInfo.title || 'Exam'
          });
        }
      });
    });

    const items = Array.from(vocabAggregation.values()).map(item => {
      const errorRate = item.totalAttempts > 0
        ? Math.round((item.incorrectCount / item.totalAttempts) * 100)
        : 0;

      // Sort top wrong answers
      const topMistakes = Object.entries(item.mistakeFrequencies)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([ans, cnt]) => `"${escapeHtml(ans)}" (${cnt}x)`);

      const diag = diagnoseErrorReason(item.targetWord, item.mistakesList, item.answerType === 'spoken');

      return {
        ...item,
        errorRate,
        topMistakesStr: topMistakes.join(', ') || '—',
        diag,
        urgency: errorRate >= 50 ? 'critical' : (errorRate >= 25 ? 'warning' : 'safe')
      };
    });

    // Sort descending by error rate
    items.sort((a, b) => b.errorRate - a.errorRate || b.incorrectCount - a.incorrectCount);

    // KPI Metrics
    const totalVocabCount = items.length;
    const criticalCount = items.filter(i => i.urgency === 'critical').length;
    const warningCount = items.filter(i => i.urgency === 'warning').length;
    const safeCount = items.filter(i => i.urgency === 'safe').length;

    const totalAttemptsAll = items.reduce((s, i) => s + i.totalAttempts, 0);
    const totalIncorrectAll = items.reduce((s, i) => s + i.incorrectCount, 0);
    const avgErrorPct = totalAttemptsAll > 0 ? Math.round((totalIncorrectAll / totalAttemptsAll) * 100) : 0;

    // Render View (DataGrid at top, Universal Lower Panel at bottom, 10px gap, 0px bottom banner gap)
    container.innerHTML = `
      <div class="test-analytics-view" style="display:flex; flex-direction:column; flex:1 1 0; min-height:0; height:100%; overflow:hidden; gap:10px;">
        <!-- DataGrid Container for Missed Vocabulary Items (Sits at the top directly under tabs) -->
        <div id="class-analytics-datagrid-container" style="flex:1 1 0; min-height:0; display:flex; flex-direction:column; overflow:hidden;"></div>

        <!-- Universal Lower Panel (50px Height, docked at bottom flush with sidebar footer and locked banner) -->
        <div class="workspace-lower-panel analytics-toolbar">
          <div style="display:flex; align-items:center; gap:8px;">
            <!-- Mini Search Input (Opsi A: Compact & Elegant) -->
            <div style="position:relative; width:160px;">
              <input type="text" id="analytics-quick-search" placeholder="🔍 Filter word..."
                     style="width:100%; height:28px; background:#0b1120; border:1px solid rgba(255,255,255,0.18); color:#fff; border-radius:4px; padding:0 8px; font-size:0.75rem; outline:none;"
                     autocomplete="off" />
            </div>

            <!-- Triage Pills with Official TopsCore Grading Colors -->
            <div class="analytics-triage-pills" style="display:inline-flex; align-items:center; gap:6px;">
              <button type="button" class="btn btn-sm btn-analytics-pill active" data-filter="all" style="font-size:0.75rem; font-weight:700;">
                🌐 All (${totalVocabCount})
              </button>
              <button type="button" class="btn btn-sm btn-analytics-pill" data-filter="critical" style="font-size:0.75rem; font-weight:700; background:rgba(255,0,0,0.15); color:#ff0000; border:1px solid rgba(255,0,0,0.35);">
                🔴 Critical &gt;50% (${criticalCount})
              </button>
              <button type="button" class="btn btn-sm btn-analytics-pill" data-filter="warning" style="font-size:0.75rem; font-weight:700; background:rgba(255,255,0,0.15); color:#ffff00; border:1px solid rgba(255,255,0,0.35);">
                🟡 Needs Attention (${warningCount})
              </button>
              <button type="button" class="btn btn-sm btn-analytics-pill" data-filter="safe" style="font-size:0.75rem; font-weight:700; background:rgba(0,192,0,0.15); color:#00c000; border:1px solid rgba(0,192,0,0.35);">
                🟢 Safe (${safeCount})
              </button>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:12px; font-size:0.74rem; color:var(--clr-text-muted);">
            <span>Class Error Average: <strong style="color:${avgErrorPct >= 50 ? '#ff0000' : (avgErrorPct >= 25 ? '#ffff00' : '#00c000')}; font-size:0.85rem;">${avgErrorPct}%</strong></span>
            <span>Total Evaluations: <strong style="color:var(--clr-text-1);">${totalAttemptsAll} attempts</strong></span>
          </div>
        </div>
      </div>
    `;

    // DataGrid Configuration
    const gridColumns = [
      {
        key: 'targetWord',
        label: 'TARGET VOCABULARY',
        width: '220px',
        render: (row) => `
          <div style="display:flex; flex-direction:column; gap:2px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-weight:800; font-size:0.88rem; color:var(--clr-text-1);">${escapeHtml(row.targetWord)}</span>
              <span class="badge" style="font-size:0.65rem; padding:1px 5px; background:rgba(255,255,255,0.06); color:#94a3b8; border:1px solid rgba(255,255,255,0.1); font-weight:700;">${escapeHtml(row.category)}</span>
            </div>
            <div style="font-size:0.75rem; color:var(--clr-text-muted); font-style:italic;">${escapeHtml(row.translation)}</div>
          </div>
        `
      },
      {
        key: 'errorRate',
        label: 'ERROR RATE',
        align: 'center',
        width: '95px',
        render: (row) => {
          const color = row.errorRate >= 50 ? '#FF0000' : (row.errorRate >= 25 ? '#FF8C00' : '#00c000ff');
          return `
            <div style="display:flex; flex-direction:column; align-items:center; gap:3px;">
              <span style="font-weight:900; font-size:0.95rem; color:${color}; font-variant-numeric:tabular-nums;">${row.errorRate}%</span>
              <div style="width:50px; height:4px; background:rgba(255,255,255,0.08); border-radius:2px; overflow:hidden;">
                <div style="width:${row.errorRate}%; height:100%; background:${color};"></div>
              </div>
            </div>
          `;
        }
      },
      {
        key: 'incorrectCount',
        label: 'MISTAKES',
        align: 'center',
        width: '80px',
        render: (row) => `
          <span style="font-weight:700; font-size:0.85rem; color:${row.incorrectCount > 0 ? '#ef4444' : '#22c55e'}; font-variant-numeric:tabular-nums;">
            ${row.incorrectCount}
          </span>
        `
      },
      {
        key: 'totalAttempts',
        label: 'EVALUATED',
        align: 'center',
        width: '80px',
        render: (row) => `
          <span style="font-weight:700; font-size:0.85rem; color:var(--clr-text-2); font-variant-numeric:tabular-nums;">
            ${row.totalAttempts}
          </span>
        `
      },
      {
        key: 'topMistakesStr',
        label: 'STUDENT MISTAKES (TOP MISTAKES)',
        render: (row) => `
          <div style="font-size:0.75rem; color:#f87171; font-family:monospace; line-height:1.4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(row.topMistakesStr)}">
            ${escapeHtml(row.topMistakesStr)}
          </div>
        `
      },
      {
        key: 'diag',
        label: 'ERROR DIAGNOSIS',
        align: 'center',
        width: '180px',
        render: (row) => `
          <span class="badge" style="background:${row.diag.bg}; color:${row.diag.color}; border:1px solid ${row.diag.border}; font-size:0.72rem; font-weight:700; padding:3px 8px; display:inline-flex; align-items:center; gap:4px;">
            <span>${row.diag.icon}</span>
            <span>${row.diag.label}</span>
          </span>
        `
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        align: 'center',
        width: '120px',
        render: (row) => `
          <button type="button" class="btn btn-secondary btn-sm btn-inspect-vocab-mistakes" data-key="${escapeHtml(row.key)}" style="font-size:0.72rem; font-weight:700; padding:2px 8px;">
            🔍 Student Details
          </button>
        `
      }
    ];

    let activeFilter = 'all';
    let searchQuery = '';
    let gridInstance = null;

    const getFilteredItems = () => {
      let filtered = items;
      if (activeFilter === 'critical') filtered = items.filter(i => i.urgency === 'critical');
      else if (activeFilter === 'warning') filtered = items.filter(i => i.urgency === 'warning');
      else if (activeFilter === 'safe') filtered = items.filter(i => i.urgency === 'safe');

      if (searchQuery) {
        const q = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(i =>
          (i.targetWord && i.targetWord.toLowerCase().includes(q)) ||
          (i.translation && i.translation.toLowerCase().includes(q)) ||
          (i.topMistakesStr && i.topMistakesStr.toLowerCase().includes(q)) ||
          (i.category && i.category.toLowerCase().includes(q))
        );
      }
      return filtered;
    };

    const bindRowEvents = () => {
      const gridContainer = container.querySelector('#class-analytics-datagrid-container');
      if (!gridContainer) return;
      gridContainer.querySelectorAll('.btn-inspect-vocab-mistakes').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.key;
          const targetItem = items.find(i => i.key === key);
          if (targetItem) {
            openVocabErrorDetailModal(targetItem);
          }
        });
      });
    };

    const initGrid = () => {
      const gridContainer = container.querySelector('#class-analytics-datagrid-container');
      if (!gridContainer) return;

      gridInstance = new window.DataGrid({
        container: gridContainer,
        data: getFilteredItems(),
        columns: gridColumns,
        pageSize: 1000,
        hideToolbar: true,
        summaryRow: null
      });

      bindRowEvents();
    };

    initGrid();

    // Instant Mini Search Input Listener (Opsi A)
    const searchInput = container.querySelector('#analytics-quick-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value || '';
        if (gridInstance) {
          gridInstance.updateData(getFilteredItems());
          bindRowEvents();
        }
      });
    }

    // Triage Pills Event Handlers
    container.querySelectorAll('.btn-analytics-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.btn-analytics-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter || 'all';
        if (gridInstance) {
          gridInstance.updateData(getFilteredItems());
          bindRowEvents();
        }
      });
    });

  } catch (err) {
    console.error('Error rendering class vocabulary analytics:', err);
    container.innerHTML = `
      <div class="card p-5 text-center" style="border-color:rgba(239,68,68,0.4); margin:0;">
        <div style="font-size:2rem; margin-bottom:0.5rem;">⚠️</div>
        <h3 style="color:#ef4444; font-weight:700; margin-bottom:0.4rem;">Failed to Load Class Analytics</h3>
        <p class="text-muted text-sm">${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

/**
 * Modal to inspect students who missed a specific vocabulary item
 */
function openVocabErrorDetailModal(item) {
  const existing = document.getElementById('vocab-error-details-modal');
  if (existing) existing.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'vocab-error-details-modal';
  backdrop.className = 'modal-backdrop';
  backdrop.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.75); display:flex; align-items:center; justify-content:center; z-index:9999; padding:1rem;';

  const mistakes = item.mistakesList || [];

  backdrop.innerHTML = `
    <div class="modal-box" style="max-width:650px; width:100%; max-height:85vh; display:flex; flex-direction:column; background:#0f172a; border:1px solid rgba(255,255,255,0.12); border-radius:12px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.7); overflow:hidden;">
      <div class="modal-header" style="display:flex; justify-content:space-between; align-items:center; padding:1rem 1.25rem; border-bottom:1px solid rgba(255,255,255,0.08); flex-shrink:0;">
        <div>
          <h3 style="margin:0; font-size:1.1rem; font-weight:800; color:var(--clr-text-1);">
            🔍 Student Details: <span style="color:#38bdf8;">${escapeHtml(item.targetWord)}</span>
          </h3>
          <div style="font-size:0.75rem; color:var(--clr-text-muted); margin-top:2px;">
            ${escapeHtml(item.translation)} • ${item.incorrectCount} of ${item.totalAttempts} Students Incorrect (${item.errorRate}%)
          </div>
        </div>
        <button class="btn btn-ghost btn-icon" id="close-vocab-error-modal" style="font-size:1.25rem; cursor:pointer;" aria-label="Close">✕</button>
      </div>

      <div class="modal-body" style="flex:1 1 0; min-height:0; overflow-y:auto; padding:1rem 1.25rem;">
        ${mistakes.length === 0 ? `
          <div class="text-center p-4 text-muted">No students missed this vocabulary item!</div>
        ` : `
          <table class="table w-100" style="width:100%; border-collapse:collapse; font-size:0.8rem;">
            <thead>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.1); text-align:left; color:#94a3b8; font-size:0.72rem;">
                <th style="padding:6px 8px;">STUDENT NAME</th>
                <th style="padding:6px 8px;">STUDENT ANSWER</th>
                <th style="padding:6px 8px;">SCORE</th>
                <th style="padding:6px 8px;">EXAM</th>
              </tr>
            </thead>
            <tbody>
              ${mistakes.map(m => `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                  <td style="padding:8px; font-weight:700; color:var(--clr-text-1);">${escapeHtml(m.studentName)}</td>
                  <td style="padding:8px; font-family:monospace; color:#ef4444; font-weight:700;">${escapeHtml(m.studentAnswer)}</td>
                  <td style="padding:8px;">
                    <span class="badge" style="background:${m.score > 0 ? 'rgba(234,179,8,0.15)' : 'rgba(239,68,68,0.15)'}; color:${m.score > 0 ? '#eab308' : '#ef4444'}; font-size:0.7rem; font-weight:800;">
                      ${m.score} pt
                    </span>
                  </td>
                  <td style="padding:8px; font-size:0.72rem; color:var(--clr-text-muted);">${escapeHtml(m.testTitle)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>

      <div class="modal-footer" style="padding:0.75rem 1.25rem; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:flex-end; flex-shrink:0;">
        <button class="btn btn-secondary btn-sm" id="btn-close-vocab-error-footer">Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const closeModal = () => backdrop.remove();
  backdrop.querySelector('#close-vocab-error-modal')?.addEventListener('click', closeModal);
  backdrop.querySelector('#btn-close-vocab-error-footer')?.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
}

