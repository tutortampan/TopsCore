// ============================================================
// TOPSCORE LMS — CLASS VOCABULARY ERROR ANALYTICS ENGINE
// Authoritative Item-Level Missed Vocabulary Analytics
// ============================================================

import { getSupabase } from '../supabase.js';
import { escapeHtml } from '../api.js';
import { TOPSCORE_COLORS, getGradeColorByScore, getInvertedGradeColor } from '../grading.js';
import { getSvgIcon } from '../svg-icons.js?v=20261114_01';
import { buildClassThemesData, loadThemeExamAnalyticsData, renderThemeExamAnalyticsBoard } from './tests-access.js';

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
  if (!mistakesList || mistakesList.length === 0) return { label: 'Safe', color: 'badge-success', icon: getSvgIcon('check-circle', 12) };

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
    return { label: 'Timeout / Blank', color: 'var(--grade-e)', icon: getSvgIcon('clock', 12), bg: 'rgba(var(--grade-e-rgb, 255, 0, 0),0.15)', border: 'rgba(var(--grade-e-rgb, 255, 0, 0),0.35)' };
  }
  if (isSpokenMode) {
    return { label: 'STT / Audio Homophone', color: 'var(--primary-tactical, #38bdf8)', icon: getSvgIcon('mic', 12), bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' };
  }
  if (spellingTypoCount / totalMistakes >= 0.35) {
    return { label: 'Spelling Typo', color: 'var(--grade-c)', icon: getSvgIcon('edit', 12), bg: 'rgba(var(--grade-c-rgb, 255, 255, 0),0.15)', border: 'rgba(var(--grade-c-rgb, 255, 255, 0),0.35)' };
  }
  if (formCount / totalMistakes >= 0.3) {
    return { label: 'Word Form / Root Error', color: 'var(--grade-d)', icon: getSvgIcon('refresh', 12), bg: 'rgba(var(--grade-d-rgb, 255, 140, 0),0.15)', border: 'rgba(var(--grade-d-rgb, 255, 140, 0),0.35)' };
  }
  return { label: 'Distractor Trap / Concept Error', color: 'var(--grade-star, #c084fc)', icon: getSvgIcon('alert-triangle', 12), bg: 'rgba(var(--grade-star-rgb, 192, 132, 252),0.15)', border: 'rgba(var(--grade-star-rgb, 192, 132, 252),0.35)' };
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
        <div style="margin-bottom:0.5rem; color:#94a3b8;">${getSvgIcon('bar-chart', 35)}</div>
        <h3 style="color:var(--clr-text-1); font-weight:700; margin-bottom:0.4rem;">No Tests in This Class Yet</h3>
        <p style="font-size: 12px; max-width:420px; margin:0 auto;">Publish tasks or exams first in the <strong>Class Tests</strong> tab to begin gathering item-level mistake analytics.</p>
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

    // Step 1: Query attempts for tests in this class
    let attQuery = sb.from('attempts')
      .select('id, test_id, student_id, percentage, grade, status, is_best_score, created_at')
      .in('test_id', testIds)
      .in('status', ['submitted', 'auto_submitted', 'evaluated', 'graded'])
      .order('created_at', { ascending: false });

    // Optional student scoping if class students list provided
    const studentIds = (allStudents || []).map(s => s.id).filter(Boolean);
    if (studentIds.length > 0) {
      attQuery = attQuery.in('student_id', studentIds);
    }

    const { data: rawAttempts, error: attErr } = await attQuery;
    if (attErr) throw attErr;

    // Deduplicate: Keep best attempt per student per test (or latest submitted)
    const bestAttemptsMap = new Map();
    for (const a of (rawAttempts || [])) {
      const key = `${a.student_id}_${a.test_id}`;
      if (!bestAttemptsMap.has(key)) {
        bestAttemptsMap.set(key, a);
      } else {
        const existing = bestAttemptsMap.get(key);
        if (a.is_best_score && !existing.is_best_score) {
          bestAttemptsMap.set(key, a);
        } else if ((a.percentage ?? 0) > (existing.percentage ?? 0)) {
          bestAttemptsMap.set(key, a);
        }
      }
    }
    const representativeAttempts = Array.from(bestAttemptsMap.values());
    const attemptIds = representativeAttempts.map(a => a.id);

    // Map attemptId -> attempt record for O(1) linking
    const attemptRecordMap = new Map();
    representativeAttempts.forEach(a => attemptRecordMap.set(a.id, a));

    // Step 2: Fetch attempt_answers in chunked batches (50 attempt_ids per batch) in parallel
    // Pull only required columns (excluding massive accepted_answers_snapshot)
    let allAnswers = [];
    const CHUNK_SIZE = 50;
    const chunkPromises = [];
    for (let i = 0; i < attemptIds.length; i += CHUNK_SIZE) {
      const chunk = attemptIds.slice(i, i + CHUNK_SIZE);
      chunkPromises.push(
        sb.from('attempt_answers')
          .select('id, attempt_id, question_id, student_answer, correct_answer_snapshot, score, is_correct, evaluation_result, question_snapshot')
          .in('attempt_id', chunk)
      );
    }

    const chunkResults = await Promise.allSettled(chunkPromises);
    chunkResults.forEach(res => {
      if (res.status === 'fulfilled' && res.value?.data && Array.isArray(res.value.data)) {
        allAnswers.push(...res.value.data);
      } else if (res.status === 'rejected') {
        console.warn('[ClassAnalytics] Chunk fetch error, continuing with available data:', res.reason?.message || res.reason);
      }
    });

    // Aggregate by vocabulary target
    const vocabAggregation = new Map();

    allAnswers.forEach(ans => {
      const att = attemptRecordMap.get(ans.attempt_id) || {};
      const tInfo = testMap[att.test_id] || {};
      const sName = studentMap[att.student_id] || 'Student';

      const qSnap = ans.question_snapshot || {};
      let target = (ans.correct_answer_snapshot || qSnap.target_word || qSnap.prompt || '').trim();
      if (!target) return;

      const rawAns = (ans.student_answer || '').trim();
      const isTimeoutOrBlank = !rawAns || ans.evaluation_result === 'timeout' || ans.evaluation_result === 'unanswered';

      // User directive: Do not count questions that are wrong due to timeout/blank
      if (isTimeoutOrBlank) return;

      // Clean target
      const rawKey = target.toLowerCase();
      let translation = qSnap.translation || qSnap.clue || qSnap.indonesian || qSnap.question_text || '—';
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
        const studentAns = rawAns;
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

    // Load 4-Theme Missed Items Data per User SSOT Architecture
    const themesData = buildClassThemesData(classTests, context);
    const themeAnalyticsData = await loadThemeExamAnalyticsData(themesData, context);

    // Update Bottom Infobar Sub-Panel
    if (typeof window.setBottomInfobar === 'function') {
      const totalMissedAcrossThemes = themesData.reduce((acc, t) => acc + (themeAnalyticsData[t.code]?.length || 0), 0);
      const leftHtml = `
        <div style="display:inline-flex; align-items:center; gap:8px; font-size:12px; color:#94a3b8; font-weight:600;">
          <span>Class: <strong style="color:#ffffff;">${escapeHtml(className || 'Class Hub')}</strong></span>
          <span>&bull;</span>
          <span>Themes: <strong style="color:var(--quad-c, #95ff00);">${themesData.length} Themes</strong></span>
        </div>
      `;
      const centerHtml = `
        <div style="display:inline-flex; align-items:center; gap:8px; font-size:12px;">
          <span style="color:#cbd5e1; font-weight:700;">Empirical Missed Items:</span>
          <span style="color:var(--grade-e, #fca5a5); font-weight:800;">${totalMissedAcrossThemes} Questions Recorded</span>
        </div>
      `;
      const rightHtml = `
        <div style="display:inline-flex; align-items:center; gap:8px;">
          <span class="badge" style="background:rgba(56,189,248,0.15); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); font-size:12px; font-weight:800;">
            4-COLUMN MATRIX ACTIVE
          </span>
        </div>
      `;
      window.setBottomInfobar(leftHtml, rightHtml, centerHtml);
    }

    // Render 4-Column Missed Items Tables Matrix Full Height Top to Bottom
    container.innerHTML = `
      <div class="test-analytics-view" style="display:flex; flex-direction:column; flex:1 1 0; min-height:0; height:100%; overflow:hidden;">
        <!-- 4-Column Missed Items Analytics Board (Full Height Top to Bottom) -->
        <div id="analytics-4col-matrix-container" style="display:flex; flex-direction:column; flex:1 1 0; min-height:0; height:100%; overflow:hidden;">
          ${renderThemeExamAnalyticsBoard(themesData, context, themeAnalyticsData)}
        </div>
      </div>
    `;
    return;

    // DataGrid Configuration
    const gridColumns = [
      {
        key: 'targetWord',
        label: 'TARGET VOCABULARY',
        width: '220px',
        render: (row) => `
          <div style="display:flex; flex-direction:column; gap:2px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-weight:700; font-size:12px; color:var(--clr-text-1);">${escapeHtml(row.targetWord)}</span>
              <span class="badge" style="font-size: 12px; padding:1px 5px; background:rgba(255,255,255,0.06); color:#94a3b8; border:1px solid rgba(255,255,255,0.1); font-weight:600;">${escapeHtml(row.category)}</span>
            </div>
            <div style="font-size:12px; color:var(--clr-text-muted);">${escapeHtml(row.translation)}</div>
          </div>
        `
      },
      {
        key: 'errorRate',
        label: 'ERROR RATE',
        align: 'center',
        width: '100px',
        render: (row) => {
          const color = typeof getInvertedGradeColor === 'function' ? getInvertedGradeColor(row.errorRate) : (row.errorRate >= 50 ? 'var(--grade-e)' : (row.errorRate >= 25 ? 'var(--grade-c)' : 'var(--grade-a)'));
          return `
            <div style="display:flex; flex-direction:column; align-items:center; gap:3px;">
              <span style="font-weight:900; font-size: 16px; color:${color}; font-variant-numeric:tabular-nums;">${row.errorRate}%</span>
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
        width: '85px',
        render: (row) => `
          <span style="font-weight:700; font-size: 12px; color:${row.incorrectCount > 0 ? 'var(--grade-e)' : 'var(--grade-a)'}; font-variant-numeric:tabular-nums;">
            ${row.incorrectCount}
          </span>
        `
      },
      {
        key: 'totalAttempts',
        label: 'EVALUATED',
        align: 'center',
        width: '100px',
        render: (row) => `
          <span style="font-weight:700; font-size: 12px; color:var(--clr-text-2); font-variant-numeric:tabular-nums;">
            ${row.totalAttempts}
          </span>
        `
      },
      {
        key: 'topMistakesStr',
        label: 'STUDENT MISTAKES (TOP MISTAKES)',
        render: (row) => `
          <div style="font-size: 12px; color:var(--grade-e); font-family:monospace; line-height:1.4; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(row.topMistakesStr)}">
            ${escapeHtml(row.topMistakesStr)}
          </div>
        `
      },
      {
        key: 'diag',
        label: 'ERROR DIAGNOSIS',
        align: 'center',
        width: '260px',
        render: (row) => `
          <span class="badge" style="background:${row.diag.bg}; color:${row.diag.color}; border:1px solid ${row.diag.border}; font-size: 12px; font-weight:700; padding:3px 8px; display:inline-flex; align-items:center; gap:4px; white-space:nowrap;">
            <span>${row.diag.icon}</span>
            <span>${row.diag.label}</span>
          </span>
        `
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        align: 'center',
        width: '140px',
        render: (row) => `
          <button type="button" class="btn btn-secondary btn-sm btn-inspect-vocab-mistakes" data-key="${escapeHtml(row.key)}" style="font-size: 12px; font-weight:700; padding:0 10px; height:28px; line-height:26px; white-space:nowrap; display:inline-flex; align-items:center; gap:4px;">
            ${getSvgIcon('search', 12)} Student Details
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
        <div style="margin-bottom:0.5rem; color:var(--grade-e);">${getSvgIcon('alert-triangle', 30)}</div>
        <h3 style="color:var(--grade-e); font-weight:700; margin-bottom:0.4rem;">Failed to Load Class Analytics</h3>
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
  backdrop.className = 'topscore-modal-overlay';
  backdrop.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.75); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:9999; padding:10px; box-sizing:border-box; animation:fadeIn 0.15s ease-out;';

  const mistakes = item.mistakesList || [];

  backdrop.innerHTML = `
    <style>
      #vocab-error-details-modal .modal-card {
        background: #0f172a; border: 1.5px solid rgba(255, 255, 255, 0.16); border-radius: 12px;
        width: 100%; max-width: 680px; display: flex; flex-direction: column;
        max-height: 80vh !important; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
        overflow: hidden; color: #f8fafc;
      }
      #vocab-error-details-modal .title-area {
        height: 60px !important; min-height: 60px !important; max-height: 60px !important;
        border-bottom: 1.5px solid rgba(255, 255, 255, 0.16) !important;
        display: flex; align-items: center; justify-content: center;
        background: #1e293b !important; box-sizing: border-box; padding: 0 16px;
      }
      #vocab-error-details-modal .title-area h2 {
        margin: 0; font-family: var(--fm-font-display, 'Inter', sans-serif);
        font-size: 16px; font-weight: 800; text-transform: uppercase;
        letter-spacing: 0.05em; color: #ffffff; text-align: center;
        display: flex; align-items: center; gap: 8px;
      }
      #vocab-error-details-modal .modal-body {
        padding: 10px !important; overflow-y: auto; max-height: calc(80vh - 120px);
        display: flex; flex-direction: column; gap: 10px; box-sizing: border-box;
      }
      #vocab-error-details-modal .cta-area {
        height: 60px !important; min-height: 60px !important; max-height: 60px !important;
        border-top: 1.5px solid rgba(255, 255, 255, 0.16) !important;
        background: rgba(30, 41, 59, 0.5); display: flex !important; justify-content: flex-start !important;
        align-items: center !important; gap: 10px; padding: 0 10px !important; box-sizing: border-box;
      }
      #vocab-error-details-modal .btn-cta-close {
        height: 40px !important; min-height: 40px !important; max-height: 40px !important;
        line-height: 38px !important; padding: 0 20px !important; border-radius: 6px !important;
        font-family: var(--fm-font-display, 'Inter', sans-serif) !important; font-size: 14px !important;
        font-weight: 800 !important; text-transform: uppercase; letter-spacing: 0.03em;
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15);
        color: #94a3b8; cursor: pointer; transition: all 0.15s ease; box-sizing: border-box;
      }
      #vocab-error-details-modal .btn-cta-close:hover {
        background: rgba(255,255,255,0.12) !important; color: #ffffff !important;
        border-color: rgba(255,255,255,0.3) !important;
      }
    </style>

    <div class="modal-card">
      <!-- Title Area (Strict 60px, ALL CAPS, Centered, Zero Subtitle Clutter) -->
      <div class="title-area">
        <h2>${getSvgIcon('alert-triangle', 18)} STUDENT MISTAKE DETAILS: ${escapeHtml((item.targetWord || '').toUpperCase())}</h2>
      </div>

      <!-- Modal Body (Strict 10px padding, 10px gap) -->
      <div class="modal-body">
        <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px; display:flex; justify-content:space-between; align-items:center; box-sizing:border-box;">
          <div>
            <div style="font-size:12px; font-weight:700; color:var(--clr-text-muted); text-transform:uppercase;">Meaning &amp; Translation</div>
            <div style="font-size:14px; font-weight:700; color:#38bdf8;">${escapeHtml(item.translation || '—')}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:12px; font-weight:700; color:var(--clr-text-muted); text-transform:uppercase;">Failure Ratio</div>
            <div style="font-size:14px; font-weight:800; color:var(--grade-e);">${item.incorrectCount} of ${item.totalAttempts} Students (${item.errorRate}%)</div>
          </div>
        </div>

        ${mistakes.length === 0 ? `
          <div style="text-align:center; padding:20px; color:var(--clr-text-muted); font-size:12px;">No students missed this vocabulary item!</div>
        ` : `
          <div style="border:1px solid rgba(255,255,255,0.12); border-radius:6px; overflow:hidden;">
            <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:left;">
              <thead>
                <tr style="background:#1e293b; color:#ffffff; border-bottom:1px solid rgba(255,255,255,0.12); text-transform:uppercase;">
                  <th style="padding:6px 10px; font-weight:700;">STUDENT NAME</th>
                  <th style="padding:6px 10px; font-weight:700;">STUDENT ANSWER</th>
                  <th style="padding:6px 10px; font-weight:700; text-align:center;">PTS</th>
                  <th style="padding:6px 10px; font-weight:700;">EXAM</th>
                </tr>
              </thead>
              <tbody>
                ${mistakes.map(m => `
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.01);">
                    <td style="padding:8px 10px; font-weight:700; color:#ffffff;">${escapeHtml(m.studentName)}</td>
                    <td style="padding:8px 10px; font-family:monospace; color:var(--grade-e); font-weight:700;">"${escapeHtml(m.studentAnswer)}"</td>
                    <td style="padding:8px 10px; text-align:center;">
                      <span class="badge" style="background:${m.score > 0 ? 'rgba(var(--grade-c-rgb, 255, 255, 0),0.15)' : 'rgba(var(--grade-e-rgb, 255, 0, 0),0.15)'}; color:${m.score > 0 ? 'var(--grade-c)' : 'var(--grade-e)'}; font-size:12px; font-weight:800; padding:2px 6px;">
                        ${m.score} pt
                      </span>
                    </td>
                    <td style="padding:8px 10px; font-size:12px; color:#94a3b8;">${escapeHtml(m.testTitle)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <!-- CTA Area (Strict 60px, CLOSE button at far left) -->
      <div class="cta-area">
        <button type="button" class="btn-cta-close" id="btn-close-vocab-error-footer">CLOSE</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  const closeModal = () => backdrop.remove();
  backdrop.querySelector('#btn-close-vocab-error-footer')?.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });
}

