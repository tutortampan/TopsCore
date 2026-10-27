import { adminFetchAll, adminUpdate, adminSoftDelete, clearAdminCache } from '../api.js?v=5.3.2';
import { openTestBuilder } from './test-builder.js?v=5.3.2';
import { openTestBuilderModal as openVocabWizard } from './vocab-vault.js?v=5.3.2';
import { showToast, showLoading, hideLoading, escapeHtml, escHtml } from '../app.js?v=5.3.2';
import { getSupabase } from '../supabase.js?v=5.3.2';
import { DataGrid } from './datagrid.js?v=5.3.2';
if (typeof window !== 'undefined') window.DataGrid = DataGrid;

let TestsGrid;

window.updateTestOrder = async (id, newOrd) => {
  if (!id) return;
  try {
    await adminUpdate('tests', id, { ord: parseInt(newOrd, 10) });
    if (window.showToast) window.showToast('Order updated successfully', 'success');
  } catch (e) {
    console.error('Failed to update order', e);
    alert('Failed to update order: ' + e.message);
  }
};

export async function renderTests(area) {
  const [rawData, allQuestions, allClasses, allLevels, allBoardClasses, allVault] = await Promise.all([
    adminFetchAll('tests'),
    adminFetchAll('test_questions', 'id, test_id, answer_type'),
    adminFetchAll('programs', 'id, name').catch(() => []),
    adminFetchAll('levels').catch(() => []),
    adminFetchAll('classes').catch(() => []),
    adminFetchAll('vocabulary_vault', 'id, target_level, theme_code, topic_code, word_type, deleted_at').catch(() => [])
  ]);

  const classMap = {};
  (allClasses || []).forEach(c => { classMap[c.id] = c; });
  const boardClassMap = {};
  (allBoardClasses || []).forEach(c => { boardClassMap[c.id] = c; });
  const levelMap = {};
  (allLevels || []).forEach(l => { levelMap[l.id] = l; });
  const TestMap = {};
  (rawData || []).forEach(e => { TestMap[e.id] = e; });

  const getDepth = (id, visited = new Set()) => {
    if (!id || visited.has(id)) return 0;
    visited.add(id);
    const item = TestMap[id];
    if (!item) return 0;
    const prereqId = item.prerequisite_test_id || item.prerequisite_id;
    if (!prereqId) return 0;
    return 1 + getDepth(prereqId, visited);
  };

  (rawData || []).forEach(e => { e._depth = getDepth(e.id); });

  const data = [...rawData].sort((a, b) => {
    const progA = a.program_id || '';
    const progB = b.program_id || '';
    if (progA !== progB) return progA.localeCompare(progB);
    const lvlA = a.level_id || '';
    const lvlB = b.level_id || '';
    if (lvlA !== lvlB) return lvlA.localeCompare(lvlB);
    return (a._depth || 0) - (b._depth || 0);
  });

  // Calculate KPI metrics (Tests table uses status, not test_type)
  const _norm = (v) => String(v || '').toLowerCase();
  const liveDataRaw = data.filter(e => !e.deleted_at);
  const liveData = liveDataRaw;
  const totalTests = liveData.length;
  const publishedCount = liveData.filter(e => _norm(e.status) === 'published').length;
  const draftCount = liveData.filter(e => !e.status || ['draft', 'unpublished'].includes(_norm(e.status))).length;
  const totalQuestions = allQuestions.length;

  window._testFilterTab = window._testFilterTab || 'all';

  const testTabs = [
    { id: 'all', icon: '📋', val: totalTests, label: 'Total Tests' },
    { id: 'published', icon: '🟢', val: publishedCount, label: 'Published Tests', valColor: 'var(--clr-success, #4ade80)' },
    { id: 'draft', icon: '🔧', val: draftCount, label: 'Draft / Inactive', valColor: 'var(--clr-warning, #fbbf24)' },
    { id: 'questions', icon: '❓', val: totalQuestions, label: 'Questions in Bank', valColor: 'var(--clr-accent-1)' }
  ];

  if (window.setTopbarTabs) {
    window.setTopbarTabs(testTabs, window._testFilterTab, 'window._switchTestFilterTab');
  }

  area.innerHTML = `
    <div>
      <div class="d-flex gap-2 mb-3 flex-wrap" id="test-filters">
        <button class="btn btn-sm btn-primary filter-btn active" data-filter="all">All Tests (${totalTests})</button>
        <button class="btn btn-sm btn-secondary filter-btn" data-filter="core">Core Curriculum (${liveData.filter(e => !e.test_category || ['TASK', 'TEST', 'DAILY'].includes(String(e.test_category).toUpperCase()) && !e.payload?.is_standalone_tryout).length})</button>
        <button class="btn btn-sm btn-secondary filter-btn" data-filter="standalone">Standalone & Try-Outs (${liveData.filter(e => ['TRYOUT', 'PLACEMENT', 'EXIT'].includes(String(e.test_category).toUpperCase()) || e.payload?.is_standalone_tryout).length})</button>
      </div>

      <div id="Tests-grid-container" class="card" style="padding:1rem;"></div>
    </div>
  `;


  // Dynamic shells hold NO rows in test_questions; project the live vault count instead.
  const _ALL_THEMES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const _PHRASE_TYPES = ['expression', 'idiom', 'proverb', 'phrase'];
  const _vaultRows = (allVault || []).filter(v => !v.deleted_at);
  const vaultCountFor = (r, lvlNumber) => {
    const pl = r?.payload || {};
    const wantPhrases = pl.category === 'phrases';
    const isTest = r?.test_category === 'TEST';
    let themes = null;
    if (isTest && pl.theme_code) {
      const idx = _ALL_THEMES.indexOf(pl.theme_code);
      themes = idx >= 0 ? _ALL_THEMES.slice(0, idx + 1) : [pl.theme_code];
    }
    return _vaultRows.filter(v => {
      if (Number(v.target_level) !== Number(lvlNumber)) return false;
      const isPhrase = _PHRASE_TYPES.includes(_norm(v.word_type));
      if (wantPhrases !== isPhrase) return false;
      if (themes) return themes.includes(v.theme_code);
      if (pl.theme_code && v.theme_code !== pl.theme_code) return false;
      if (pl.topic_code && v.topic_code !== pl.topic_code) return false;
      return true;
    }).length;
  };

  window._aRecords = {};
  liveData.forEach(r => window._aRecords[r.id] = r);

  const gridData = liveData.map(r => {
    const qCount = (allQuestions || []).filter(q => q?.test_id === r?.id).length;
    // Tests table uses program_id; map to program name
    const programName = (r?.program_id && classMap[r.program_id]?.name) ? classMap[r.program_id].name : 'All Programs';
    const prereqId = r?.prerequisite_test_id || r?.prerequisite_id;
    const prereqTest = (prereqId && TestMap[prereqId]) ? TestMap[prereqId] : null;
    const boardName = (r?.class_id && boardClassMap[r.class_id]?.name) || r?.classes?.name || '—';
    const lvlObj = (r?.level_id && levelMap[r.level_id]) || r?.levels;
    const lvlNum = lvlObj?.level_number || 1;
    const levelDisplay = window.toLevelLetter ? window.toLevelLetter(lvlNum) : lvlNum;
    const prereqTitle = prereqTest?.shell_code || prereqTest?.title || prereqTest?.name || r?.prereq?.name || r?.prerequisite?.name || r?.prereq || '';
    // Tests table: title, status, test_type, answer_type, time_limit_minutes, minimum_required_score
    const title = r?.title || r?.display_name || r?.name || 'Untitled';
    const status = r?.status || r?.test_type || 'draft';
    const TestCategory = r?.test_type || 'Daily';
    let answerType = r?.answer_type || '';
    const asmQs = (allQuestions || []).filter(q => q?.test_id === r?.id);
    if (!answerType && asmQs.length > 0) {
      const typeCounts = {};
      asmQs.forEach(q => {
        if (q.answer_type) typeCounts[q.answer_type] = (typeCounts[q.answer_type] || 0) + 1;
      });
      let max = 0;
      for (const t in typeCounts) {
        if (typeCounts[t] > max) { max = typeCounts[t]; answerType = t; }
      }
    }
    const timeLimit = r?.working_duration_minutes || r?.time_limit_minutes || Math.floor((r?.time_limit_seconds || 3600) / 60);
    const minScore = r?.minimum_required_score || 60;
    const _isDyn = !!(r?.payload && r.payload.is_dynamic_shell) || r?.is_dynamic_shell === true;
    const _vaultQ = _isDyn ? vaultCountFor(r, lvlNum) : 0;
    
    return {
      id: r?.id || '',
      title,
      programName,
      classBoard: boardName,
      level: levelDisplay,
      order: r?.display_order ?? r?.order_index ?? 1,
      prereq: prereqTitle,
      answerType: formatAnswerType(answerType),
      questionOrder: r?.question_order === 'random' ? 'Random' : 'Seq',
      TestCategory,
      timeLimit,
      minScore,
      qCount: _isDyn ? _vaultQ : qCount,
      qIsVault: _isDyn,
      status,
      shellCode: r?.shell_code || '',
      _raw: r || {}
    };
  });


  const statusColors = { published: 'badge-success', draft: 'badge-neutral', unpublished: 'badge-warning', archived: 'badge-danger' };

  TestsGrid = new (DataGrid || window.DataGrid)({
    container: 'Tests-grid-container',
    data: gridData,
    pageSize: 50,
    searchKeys: ['title', 'programName', 'classBoard', 'status'],
    bulkActions: true,
    customBulkActions: [
      {
        label: 'Publish Selected',
        onClick: async (ids) => {
          if (!confirm(`Publish ${ids.length} selected tests?`)) return;
          try {
            for (const id of ids) await adminUpdate('tests', id, { status: 'PUBLISHED' });
            if (window.showToast) window.showToast(`Published ${ids.length} tests`, 'success');
            window.loadSection('tests');
          } catch (e) {
            if (window.showToast) window.showToast('Error publishing: ' + e.message, 'error');
          }
        }
      },
      {
        label: 'Unpublish Selected',
        onClick: async (ids) => {
          if (!confirm(`Unpublish ${ids.length} selected tests?`)) return;
          try {
            for (const id of ids) await adminUpdate('tests', id, { status: 'DRAFT' });
            if (window.showToast) window.showToast(`Unpublished ${ids.length} tests`, 'success');
            window.loadSection('tests');
          } catch (e) {
            if (window.showToast) window.showToast('Error unpublishing: ' + e.message, 'error');
          }
        }
      },
      {
        label: 'Delete Selected',
        onClick: async (ids) => {
          if (!confirm(`Are you sure you want to PERMANENTLY delete ${ids.length} selected tests?`)) return;
          try {
            for (const id of ids) await adminSoftDelete('tests', id);
            if (window.showToast) window.showToast(`Deleted ${ids.length} tests`, 'success');
            window.loadSection('tests');
          } catch (e) {
            if (window.showToast) window.showToast('Error deleting: ' + e.message, 'error');
          }
        }
      }
    ],
    sortComparator: (sortKey, direction, a, b) => {
      if (sortKey === 'title' || sortKey === 'TITLE' || sortKey === 'order') {
        return direction === 'asc' 
          ? (a.display_order ?? a.order ?? 0) - (b.display_order ?? b.order ?? 0)
          : (b.display_order ?? b.order ?? 0) - (a.display_order ?? a.order ?? 0);
      }
    },
    initialSortKey: 'order',
    initialSortAsc: true,
    customBulkActions: [
      {
        label: '⚡ Bulk Edit',
        className: 'btn-primary',
        onClick: (selectedIds) => {
          if (window.openBulkEditTestsModal) {
            window.openBulkEditTestsModal(selectedIds, () => {
              renderTests(area);
            });
          }
        }
      },
      {
        label: '🗑️ Bulk Delete',
        className: 'btn-danger',
        onClick: async (selectedIds) => {
          if (confirm(`Are you sure you want to permanently soft-delete ${selectedIds.length} Tests?`)) {
            for (const id of selectedIds) {
              await adminSoftDelete('Tests', id);
            }
            showToast(`Deleted ${selectedIds.length} Tests.`, 'success');
            renderTests(area);
          }
        }
      }
    ],
    onRowClick: (row) => {
      const r = (row && typeof row === 'object') ? row : {};
      const prereqText = r?.prereq?.name || r?.prerequisite?.name || r?.prereq || '';
      const body = `
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <h4 style="margin:0; font-size:1.2rem;">${escapeHtml(r?.title || 'Untitled Test')}</h4>
            <div class="text-muted text-sm">Status: <strong class="${statusColors[String(r?.status || '').toLowerCase()] || 'text-muted'}" style="text-transform:uppercase;">${r?.status || 'draft'}</strong></div>
          </div>
          <hr style="border-color:var(--fm-border-subtle); margin:0;">
          <div>
            <div class="text-sm text-muted mb-1">Target</div>
            <div class="fw-600">Program: ${escapeHtml(r?.programName || 'Unknown')}</div>
            <div class="fw-600">Class Board: ${escapeHtml(r?.classBoard || 'Unknown')}</div>
          </div>
          <div>
            <div class="text-sm text-muted mb-1">Structure</div>
            <div class="fw-600">Type: ${escapeHtml(r?.TestCategory || 'Daily')} &bull; ${r?.qIsVault ? '&#9889; ' + (r?.qCount || 0) + ' (Vault)' : (r?.qCount || 0) + ' Qs'}</div>
            <div class="fw-600">Answer: ${formatAnswerType(r?.answerType)}</div>
          </div>
          <div>
            <div class="text-sm text-muted mb-1">Constraints</div>
            <div class="fw-600">Time Limit: ${r?.timeLimit || 60} min</div>
            <div class="fw-600">Pass Mark: ${r?.minScore || 60}%</div>
            ${prereqText ? `<div class="fw-600 text-warning">Prerequisite: ${escapeHtml(prereqText)}</div>` : ''}
          </div>
        </div>
      `;
      // Footer: close only — Edit & Publish actions are in the grid row to avoid duplication
      const footer = `<button class="btn btn-secondary" onclick="closeRecordDrawer()">Close</button>`;
      if (window.openRecordDrawer) window.openRecordDrawer('Test Details', body, footer);
    },
    columns: [
      { 
        key: 'title', 
        label: 'TITLE', 
        sortable: true,
        width: '32%',
        render: (val, row) => {
          const r = (row && typeof row === 'object') ? row : (val && typeof val === 'object' ? val : {}) || {};
          const title = (typeof val === 'string' ? val : r?.title) || 'Untitled Test';
          let displayTitle = escapeHtml(title);
          // Highlight Task in Yellow, Test in Pink for immediate visual clarity
          displayTitle = displayTitle.replace(/\b(Task)\b/gi, '<span style="color: #facc15;">$1</span>');
          displayTitle = displayTitle.replace(/\b(Test)\b/gi, '<span style="color: #f472b6;">$1</span>');
          
          return `<div class="fw-700" style="color:var(--clr-text-1); font-size:0.85rem; line-height:1.35; word-break:break-word;" title="${escapeHtml(title)}">${displayTitle}</div>`;
        }
      },
      {
        key: 'TestCategory',
        label: 'TYPE',
        sortable: true,
        render: (val, row) => {
          const r = (row && typeof row === 'object') ? row : {};
          let typeStr = escapeHtml(r?.TestCategory || 'Daily');
          // Highlight TASK and TEST in the TYPE column as well
          typeStr = typeStr.replace(/(TASK)/ig, '<span style="color: #facc15; font-weight: 800;">$1</span>');
          typeStr = typeStr.replace(/(TEST)/ig, '<span style="color: #f472b6; font-weight: 800;">$1</span>');
          return `<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">${typeStr}</div>`;
        }
      },
      {
        key: 'timeLimit',
        label: 'DUR. (m)',
        sortable: true,
        render: (val, row) => {
          const r = (row && typeof row === 'object') ? row : {};
          return `<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">&#9201;&#65039; ${r?.timeLimit || 60}</div>`;
        }
      },
      {
        key: 'minScore',
        label: 'PASS (%)',
        sortable: true,
        render: (val, row) => {
          const r = (row && typeof row === 'object') ? row : {};
          return `<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">&#127919; ${r?.minScore || 60}</div>`;
        }
      },
      { 
        key: 'qCount', 
        label: 'Qs', 
        sortable: true,
        render: (val, row) => {
          const r = (row && typeof row === 'object') ? row : (val && typeof val === 'object' ? val : {}) || {};
          const count = typeof val === 'number' ? val : (r?.qCount || 0);
          if (r?.qIsVault) return `<span class="fw-700 ${count > 0 ? 'text-info' : 'text-danger'}" style="font-size:0.8rem;" title="Live count projected from Vocabulary Vault">&#9889; ${count} (Vault)</span>`;
          return `<span class="fw-700 ${count > 0 ? 'text-info' : 'text-danger'}" style="font-size:0.8rem;">${count}</span>`;
        }
      },
      { 
        key: 'status', 
        label: 'Status', 
        sortable: true,
        render: (val, row) => {
          const r = (row && typeof row === 'object') ? row : (val && typeof val === 'object' ? val : {}) || {};
          const st = (typeof val === 'string' ? val : r?.status) || 'draft';
          return `<span class="badge ${statusColors[String(st).toLowerCase()] || 'badge-neutral'} fw-700" style="font-size: 0.65rem; padding: 2px 6px; text-transform: uppercase;">${escapeHtml(st)}</span>`;
        }
      },
      { 
        key: 'actions', 
        label: '', 
        sortable: false,
        render: (val, row) => {
          const r = (row && typeof row === 'object') ? row : (val && typeof val === 'object' ? val : {}) || {};
          const id = r?.id || '';
          return `
            <div class="d-flex gap-1 justify-end align-center">
              <button class="btn btn-ghost" style="padding: 2px 6px; font-size: 0.75rem;" title="View Results" onclick="window._filterTestResults='${id}'; window.loadSection('results');">&#128202;</button>
              <button class="btn btn-ghost" style="padding: 2px 6px; font-size: 0.75rem;" title="Recalibrate" onclick="window._filterRecalibrateTest='${id}'; window.loadSection('health');">&#9878;&#65039;</button>
              <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.75rem;" onclick="window._duplicateTest('${id}')" title="Duplicate">📄</button>
              <button class="btn ${String(r?.status).toLowerCase() === 'published' ? 'btn-danger' : 'btn-success'}" style="padding: 2px 6px; font-size: 0.75rem;" onclick="window._publishTest('${id}', '${r?.status || 'draft'}')">
                ${String(r?.status).toLowerCase() === 'published' ? '👁️‍🗨️' : '👁️'}
              </button>
              <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.75rem;" onclick="window.openCrudModal('tests', window._aRecords['${id}'])">✏️</button>
              <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.75rem; background-color: var(--clr-accent-1); color: white;" onclick="window._deleteRecord('tests', '${id}', '${escapeHtml(r?.title || '')}')">🗑️</button>
            </div>
          `;
        }
      }
    ]
  });

  const filterContainer = document.getElementById('test-filters');
  if (filterContainer) {
    filterContainer.addEventListener('click', (e) => {
      if (!e.target.classList.contains('filter-btn')) return;
      document.querySelectorAll('#test-filters .filter-btn').forEach(btn => btn.classList.remove('active'));
      e.target.classList.add('active');
      const filter = e.target.dataset.filter;
      if (filter === 'all') {
        TestsGrid.updateData(gridData);
      } else if (filter === 'core') {
        TestsGrid.updateData(gridData.filter(e => !e.TestCategory || ['TASK', 'TEST', 'DAILY'].includes(String(e.TestCategory).toUpperCase()) && !e._raw?.payload?.is_standalone_tryout));
      } else if (filter === 'standalone') {
        TestsGrid.updateData(gridData.filter(e => ['TRYOUT', 'PLACEMENT', 'EXIT'].includes(String(e.TestCategory).toUpperCase()) || e._raw?.payload?.is_standalone_tryout));
      }
    });
  }

  window._switchTestFilterTab = (tabId) => {
    window._testFilterTab = tabId;
    if (tabId === 'questions') {
      window.loadSection('questions');
      return;
    }
    document.querySelectorAll('.topbar-tab-card, .section-tab-bar .section-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tabId === tabId);
    });
    if (tabId === 'all') {
      TestsGrid.updateData(gridData);
    } else if (tabId === 'published') {
      TestsGrid.updateData(gridData.filter(e => String(e.status).toLowerCase() === 'published'));
    } else if (tabId === 'draft') {
      TestsGrid.updateData(gridData.filter(e => !e.status || ['draft', 'unpublished'].includes(String(e.status).toLowerCase())));
    }
  };
}

// Helpers
// escapeHtml / escHtml imported canonically

function formatAnswerType(type) {
  switch(type) {
    case 'speech_to_text':
    case 'spoken': return '🎙️ Spoken';
    
    case 'multiple_choice':
    case 'selection': return '✅ Selection';
    case 'written': return '\u270F\uFE0F Written';
    default: return String(type);
  }
}

window._publishTest = async (testId, currentStatus) => {
  const newStatus = (currentStatus || '').toUpperCase() === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
  try {
    await adminUpdate('tests', testId, { status: newStatus });
    showToast(`Test ${newStatus}.`, 'success');
    window.loadSection('tests');
  } catch(e) { showToast(e.message, 'error'); }
};

window._duplicateTest = async (testId) => {
  if (!confirm(`Are you sure you want to duplicate this Test?`)) return;
  
  showLoading('Duplicating Test and questions...');
  try {
    const sb = await getSupabase();
    
    // 1. Fetch original Test
    const { data: rec, error: recErr } = await sb.from('tests')
      .select('title, display_name, test_type, module_id, class_id, level_id, institution_id, working_duration_minutes, passing_score, instructions, status, settings, total_questions, dynamic_template, remedial_instructions, prerequisite_modules, unlock_conditions')
      .eq('id', testId)
      .single();
    if (recErr) throw new Error(recErr.message);

    // 2. Fetch original questions
    const { data: questions, error: qErr } = await sb.from('questions')
      .select('topic_id, question_text, question_type, points, correct_answer, accepted_answers, options, explanation, media_url, order_index, difficulty, metadata')
      .eq('test_id', testId);
    if (qErr) throw new Error(qErr.message);

    // 3. Duplicate Test
    const newTest = { ...rec };
    delete newTest.id;
    delete newTest.created_at;
    delete newTest.updated_at;
    delete newTest.deleted_at;
    delete newTest.classes;
    delete newTest.levels;
    delete newTest.institutions;
    newTest.title = `${newTest.title || newTest.display_name || 'Test'} (Copy)`;
    newTest.display_name = `${newTest.display_name || newTest.title} (Copy)`;
    newTest.status = 'draft';

    const { data: createdTest, error: eErr } = await sb.from('Tests').insert([newTest]).select().single();
    if (eErr) throw new Error(eErr.message);

    // 4. Duplicate Questions
    if (questions && questions.length > 0) {
      const newQuestions = questions.map(q => {
        const newQ = { ...q, test_id: createdTest.id };
        delete newQ.id;
        delete newQ.created_at;
        delete newQ.updated_at;
        delete newQ.deleted_at;
        return newQ;
      });
      const { error: qInsertErr } = await sb.from('questions').insert(newQuestions);
      if (qInsertErr) throw new Error(qInsertErr.message);
    }

    // 5. Duplicate Class Assignments
    const { data: assignments } = await sb.from('Test_programs').select('program_id').eq('test_id', testId);
    if (assignments && assignments.length > 0) {
       const newAssignments = assignments.map(a => ({ test_id: createdTest.id, program_id: a.program_id }));
       const { error: assignErr } = await sb.from('Test_programs').insert(newAssignments);
       if (assignErr) throw new Error(assignErr.message);
    }
    
    clearAdminCache('Tests');
    clearAdminCache('questions');
    clearAdminCache('Test_programs');

    showToast('Test duplicated successfully!', 'success');
    window.loadSection('Tests');
  } catch (e) {
    console.error(e);
    showToast('Error duplicating Test: ' + e.message, 'error');
  } finally {
    hideLoading();
  }
};

window.openTestBuilder = async (testId) => {
  await openTestBuilder(testId);
};

export async function renderQuestions(area) {
  const [questions, rawTests] = await Promise.all([
    adminFetchAll('test_questions'),
    adminFetchAll('tests', 'id, title, test_type').catch(() => [])
  ]);

  const TestMap = new Map((rawTests || []).map(e => [e.id, e]));

  area.innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Questions <span class="count-chip">${questions.length} Total</span></h2>
        <p class="section-subtitle">Question item bank for Testinations</p>
      </div>
    </div>
    <div id="questions-grid-container" class="card mt-4" style="padding:1rem;"></div>
  `;

  window._qRecords = {};
  questions.forEach(q => { window._qRecords[q.id] = q; });

  const gridData = questions.map(q => {
    const matchedTest = TestMap.get(q.test_id);
    const TestDisplay = matchedTest ? `${matchedTest.test_type ? matchedTest.test_type + ' — ' : ''}${matchedTest.title}` : (q.Tests ? window.formatTestDisplayName(q.Tests) : '—');
    return {
      id: q.id,
      order: q.question_order,
      text: q.question_text || '',
      correctAnswer: q.correct_answer || '',
      type: q.answer_type,
      TestDisplay: TestDisplay,
      _raw: q
    };
  });

  new (DataGrid || window.DataGrid)({
    container: 'questions-grid-container',
    data: gridData,
    pageSize: 50,
    searchKeys: ['text', 'correctAnswer', 'TestDisplay'],
    bulkActions: false,
    onRowClick: (row) => {
      const body = `
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <h4 style="margin:0; font-size:1.2rem;">Question #${row.order}</h4>
            <div class="text-muted text-sm">Test: <strong style="color:var(--fm-text-primary);">${escapeHtml(row.TestDisplay)}</strong></div>
          </div>
          <hr style="border-color:var(--fm-border-subtle); margin:0;">
          <div>
            <div class="text-sm text-muted mb-1">Question Text</div>
            <div class="fw-600 p-2 rounded" style="background:var(--fm-bg-1);">${escapeHtml(row.text)}</div>
          </div>
          <div>
            <div class="text-sm text-muted mb-1">Correct Answer</div>
            <div class="fw-600 p-2 rounded" style="background:rgba(74,222,128,0.1);color:var(--clr-success,#4ade80);font-family:monospace;">${escapeHtml(row.correctAnswer)}</div>
          </div>
          <div>
            <div class="text-sm text-muted mb-1">Answer Type</div>
            <div class="fw-600"><span class="badge badge-info">${formatAnswerType(row.type)}</span></div>
          </div>
        </div>
      `;
      const footer = `
        <button class="btn btn-secondary" onclick="closeRecordDrawer()">Close</button>
        <button class="btn btn-primary" onclick="window.openCrudModal('questions', window._qRecords['${row.id}']); closeRecordDrawer();">Edit Question</button>
      `;
      if (window.openRecordDrawer) window.openRecordDrawer('Question Details', body, footer);
    },
    columns: [
      { key: 'order', label: 'No', sortable: true, render: (val, row) => `<div class="text-center text-muted fw-700">${row ? (row.order ?? val) : val}</div>` },
      { key: 'text', label: 'Question Text', sortable: true, render: (val, row) => {
        const str = String((row ? row.text : val) || '');
        return `<div class="fw-600">${escapeHtml(str.slice(0, 70))}${str.length > 70 ? '...' : ''}</div>`;
      }},
      { key: 'correctAnswer', label: 'Correct Answer', sortable: true, render: (val, row) => {
        const str = String((row ? row.correctAnswer : val) || '');
        return `<div class="text-sm" style="color:var(--clr-success,#4ade80);font-family:monospace;">${escapeHtml(str.slice(0, 40))}${str.length > 40 ? '...' : ''}</div>`;
      }},
      { key: 'type', label: 'Answer Type', sortable: true, render: (val, row) => `<div class="text-center"><span class="badge badge-info">${formatAnswerType((row ? row.type : val) || '')}</span></div>` },
      { key: 'TestDisplay', label: 'Test Title', sortable: true, render: (val, row) => `<div class="text-muted text-sm">${escapeHtml(String((row ? row.TestDisplay : val) || '—'))}</div>` },
      { key: 'actions', label: 'Actions', sortable: false, render: (val, row) => {
        const r = row || (typeof val === 'object' ? val : {}) || {};
        return `
          <div class="d-flex gap-2 justify-end">
            <button class="btn btn-secondary btn-sm" onclick="window.openCrudModal('questions', window._qRecords['${r.id}'])">✏️</button>
            <button class="btn btn-danger btn-sm" onclick="window._deleteRecord('questions', '${r.id}', 'Question #${r.order || ''}')">🗑️</button>
          </div>
        `;
      }}
    ]
  });
}

export async function renderResults(area) {
  const [rawData, allPrograms, allClasses, allBatches] = await Promise.all([
    adminFetchAll('attempts', '*, students!student_id(name, gender, batch_id, batches!batch_id(name), program_id, programs!program_id(name, institution_id, institutions!institution_id(name))), tests!test_id(title, test_type), attempt_answers(id, evaluation_result, score)'),
    adminFetchAll('institutions'),
    adminFetchAll('programs'),
    adminFetchAll('batches')
  ]);

  const submittedOnly = rawData.filter(r => ['submitted', 'auto_submitted'].includes(r.status));

  // Deduplicate by Student + Test, keeping highest score only
  const getEffectivePct = (att) => {
    const isRem = Boolean(att.is_remedial_unlocked);
    const raw = parseFloat(att.percentage || 0);
    return isRem ? Math.min(raw, 60.0) : (att.effective_score != null ? parseFloat(att.effective_score) : raw);
  };

  const mergedResults = new Map();
  submittedOnly.forEach(r => {
    const key = `${r.student_id}_${r.test_id}`;
    const existing = mergedResults.get(key);
    if (!existing) {
      mergedResults.set(key, r);
    } else {
      const existingScore = getEffectivePct(existing);
      const currentScore = getEffectivePct(r);
      if (currentScore > existingScore || (currentScore === existingScore && new Date(r.submitted_at) > new Date(existing.submitted_at))) {
        mergedResults.set(key, r);
      }
    }
  });
  const deduplicated = Array.from(mergedResults.values());

  area.innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Results <span class="count-chip" id="res-count-chip">${deduplicated.length} Total</span></h2>
        <p class="section-subtitle">Student Test attempt submissions</p>
      </div>
    </div>
    <div id="results-grid-container" class="card mt-4" style="padding:1rem;"></div>
  `;

  const gridData = deduplicated.map(r => {
    const answers = r.attempt_answers || [];
    let attCorrect = 0, attMinor = 0, attWrong = 0;
    answers.forEach(a => {
      const res = (a.evaluation_result || '').toLowerCase();
      const sc  = parseFloat(a.score || 0);
      if (res === 'correct' || sc >= 1)          attCorrect++;
      else if (res.includes('minor') || (sc > 0 && sc < 1)) attMinor++;
      else                                        attWrong++;
    });

    const isRem = Boolean(r.is_remedial_unlocked);
    const rawPct = parseFloat(r.percentage || 0);
    const effPct = isRem ? Math.min(rawPct, 60.0) : (r.effective_score != null ? parseFloat(r.effective_score) : rawPct);
    const effGrade = r.grade || (typeof getGrade === 'function' ? getGrade(effPct) : (effPct >= 60 ? 'C' : 'E'));

    return {
      id: r.id,
      studentId: r.student_id,
      studentName: r.students?.name || 'Unknown',
      program: r.students?.programs?.institutions?.name || '—',
      className: r.students?.programs?.name || '—',
      batch: r.students?.batches?.name || '—',
      TestTitle: r.tests?.title || 'Unknown Test',
      score: effPct.toFixed(1) + (isRem ? ' (Remedial 60%)' : ''),
      grade: effGrade,
      correct: attCorrect,
      minor: attMinor,
      wrong: attWrong,
      submittedAt: r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—',
      _raw: r
    };
  });

  new (DataGrid || window.DataGrid)({
    container: 'results-grid-container',
    data: gridData,
    pageSize: 50,
    searchKeys: ['studentName', 'program', 'className', 'batch', 'TestTitle'],
    bulkActions: false,
    onRowClick: (row) => {
      const body = `
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <h4 style="margin:0; font-size:1.2rem;">${escapeHtml(row.studentName)}</h4>
            <div class="text-muted text-sm">Test: <strong style="color:var(--fm-text-primary);">${escapeHtml(row.TestTitle)}</strong></div>
          </div>
          <hr style="border-color:var(--fm-border-subtle); margin:0;">
          <div>
            <div class="text-sm text-muted mb-1">Enrollment</div>
            <div class="fw-600">${escapeHtml(row.program)} / ${escapeHtml(row.className)} / ${escapeHtml(row.batch)}</div>
          </div>
          <div>
            <div class="text-sm text-muted mb-1">Performance</div>
            <div class="fw-600" style="font-size:1.5rem;">${row.score}% <span class="badge badge-primary text-sm ml-2" style="background:rgba(168,85,247,0.18);color:#A855F7;border:1px solid #A855F7;">${escapeHtml((row.grade === '★' || row.grade === 'S' || parseFloat(row.score) >= 100) ? '★' : row.grade)}</span></div>
          </div>
          <div class="d-flex gap-2">
             <div class="p-2 rounded text-center" style="background:rgba(74,222,128,0.1);flex:1;">
               <div class="text-xs text-muted">Correct</div>
               <div class="fw-800" style="color:var(--clr-success,#4ade80);">${row.correct}</div>
             </div>
             <div class="p-2 rounded text-center" style="background:rgba(251,191,36,0.1);flex:1;">
               <div class="text-xs text-muted">Half</div>
               <div class="fw-800" style="color:var(--clr-warning,#fbbf24);">${row.minor}</div>
             </div>
             <div class="p-2 rounded text-center" style="background:rgba(248,113,113,0.1);flex:1;">
               <div class="text-xs text-muted">Wrong</div>
               <div class="fw-800" style="color:var(--clr-danger,#f87171);">${row.wrong}</div>
             </div>
          </div>
          <div>
            <div class="text-sm text-muted mb-1">Submitted At</div>
            <div class="fw-600">${row.submittedAt}</div>
          </div>
        </div>
      `;
      const footer = `
        <button class="btn btn-secondary" onclick="closeRecordDrawer()">Close</button>
        <button class="btn btn-primary" onclick="window.openStudentProfile('${row.studentId}'); closeRecordDrawer();">View Profile</button>
      `;
      if (window.openRecordDrawer) window.openRecordDrawer('Attempt Details', body, footer);
    },
    columns: [
      { key: 'studentName', label: 'Student', sortable: true, render: (val) => `<div class="fw-700" style="color:var(--clr-text-1);">${escapeHtml(val)}</div>` },
      { key: 'program', label: 'Program', sortable: true, render: (val) => `<div class="text-xs text-muted">${escapeHtml(val)}</div>` },
      { key: 'className', label: 'Class', sortable: true, render: (val) => `<div class="text-xs text-muted">${escapeHtml(val)}</div>` },
      { key: 'batch', label: 'Batch', sortable: true, render: (val) => `<div class="text-xs text-muted">${escapeHtml(val)}</div>` },
      { key: 'TestTitle', label: 'Test', sortable: true, render: (val) => `<div class="fw-600">${escapeHtml(val)}</div>` },
      { key: 'score', label: 'Score', sortable: true, render: (val) => `<div class="text-center fw-800">${val}%</div>` },
      { key: 'grade', label: 'Grade', sortable: true, render: (val, row) => `<div class="text-center"><span class="badge badge-primary fw-800" style="${(val === '★' || val === 'S' || parseFloat(row?.score) >= 100) ? 'background:rgba(168,85,247,0.18);color:#A855F7;border:1px solid #A855F7;' : ''}">${escapeHtml((val === '★' || val === 'S' || parseFloat(row?.score) >= 100) ? '★' : val)}</span></div>` },
      { key: 'correct', label: 'Correct', sortable: true, render: (val, row) => `<div class="text-center"><span class="badge ${val > 0 ? 'badge-success' : 'badge-neutral'}">${val}</span></div>` },
      { key: 'minor', label: 'Half', sortable: true, render: (val) => `<div class="text-center"><span class="badge ${val > 0 ? 'badge-warning' : 'badge-neutral'}">${val}</span></div>` },
      { key: 'wrong', label: 'Incorrect', sortable: true, render: (val) => `<div class="text-center"><span class="badge ${val > 0 ? 'badge-danger' : 'badge-neutral'}">${val}</span></div>` },
      { key: 'submittedAt', label: 'Submitted', sortable: true, render: (val) => `<div class="text-center text-xs text-muted">${val}</div>` },
      { key: 'actions', label: 'Profile', sortable: false, render: (val, row) => `<div class="text-center"><button class="btn btn-secondary btn-sm" onclick="window.openStudentProfile('${row.studentId}')">View</button></div>` }
    ]
  });
}

/**
 * Open Session Modal - Tutor Live Control (AGENTS.md §2 - Test Timing)
 * Unlocks a published QUIZ or EXAM test for students with a timed window.
 * Sets session_unlocked_at and session_expires_at on the Tests record.
 */
async function openSessionModal() {
  const { getSupabase } = await import('../supabase.js?v=5.3.2');
  const sb = await getSupabase();
  const { data: tests, error } = await sb
    .from('Tests')
    .select('id, title, test_type, classes(name)')
    .in('test_type', ['QUIZ', 'EXAM'])
    .eq('status', 'published')
    .order('title', { ascending: true });
  if (error) { window.showToast('Failed to load tests: ' + error.message, 'error'); return; }
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const asmOptions = (tests || []).map(a =>
    '<option value="' + esc(a.id) + '">[' + esc(a.test_type) + '] ' + esc(a.title || a.id) + ' — ' + esc(a.classes?.name || '—') + '</option>'
  ).join('');
  if (!asmOptions) { window.showToast('No published QUIZ or EXAM tests found.', 'warning'); return; }

  const overlay = document.createElement('div');
  overlay.id = 'open-session-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:9999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = [
    '<div style="background:var(--clr-surface-1,#1a1f2e);border:1px solid var(--clr-border);border-radius:12px;padding:2rem;max-width:480px;width:95%;box-shadow:0 24px 64px rgba(0,0,0,0.5);">',
    '  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem;">',
    '    <h3 style="color:var(--clr-text-1);font-size:1.1rem;font-weight:700;margin:0;">&#128275; Open Session &mdash; Tutor Live Control</h3>',
    '    <button id="close-session-modal" style="background:none;border:none;color:var(--clr-text-2);font-size:1.4rem;cursor:pointer;padding:2px 8px;">&#215;</button>',
    '  </div>',
    '  <div style="background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.3);border-radius:8px;padding:0.75rem 1rem;margin-bottom:1.5rem;">',
    '    <p style="color:#f59e0b;font-size:0.8rem;margin:0;">&#9888;&#65039; This unlocks the selected QUIZ/EXAM immediately. Students cannot begin once the session window closes.</p>',
    '  </div>',
    '  <div style="margin-bottom:1rem;">',
    '    <label style="font-size:0.85rem;font-weight:600;color:var(--clr-text-2);display:block;margin-bottom:6px;">Test (QUIZ / EXAM)</label>',
    '    <select id="session-asm-select" class="form-control" style="width:100%;"><option value="">-- Select Test --</option>' + asmOptions + '</select>',
    '  </div>',
    '  <div style="margin-bottom:1.5rem;">',
    '    <label style="font-size:0.85rem;font-weight:600;color:var(--clr-text-2);display:block;margin-bottom:6px;">Session Duration (minutes)</label>',
    '    <input type="number" id="session-duration" class="form-control" value="60" min="5" max="480" style="max-width:150px;" />',
    '    <p style="font-size:0.75rem;color:var(--clr-text-2);margin-top:4px;">Students cannot begin after this window closes.</p>',
    '  </div>',
    '  <div style="display:flex;gap:0.75rem;justify-content:flex-end;">',
    '    <button class="btn btn-ghost btn-sm" id="cancel-session-modal">Cancel</button>',
    '    <button class="btn btn-sm" id="confirm-open-session" style="background:rgba(245,158,11,0.2);color:#f59e0b;border:1px solid rgba(245,158,11,0.5);font-weight:700;">&#128275; Open Session Now</button>',
    '  </div>',
    '</div>'
  ].join('\n');
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  document.getElementById('close-session-modal').addEventListener('click', close);
  document.getElementById('cancel-session-modal').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.getElementById('confirm-open-session').addEventListener('click', async () => {
    const asmId = document.getElementById('session-asm-select').value;
    const durationMin = parseInt(document.getElementById('session-duration').value) || 60;
    if (!asmId) { window.showToast('Please select an test.', 'warning'); return; }
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMin * 60 * 1000).toISOString();
    const { error: updErr } = await sb.from('Tests')
      .update({ session_unlocked_at: now.toISOString(), session_expires_at: expiresAt })
      .eq('id', asmId);
    if (updErr) { window.showToast('Failed to open session: ' + updErr.message, 'error'); }
    else { window.showToast('Session opened — expires in ' + durationMin + ' minute(s). Students may now begin.', 'success'); close(); }
  });
}

window.openTestGatewayModal = async () => {
  showLoading('Loading Context...');
  let allClasses, allLevels;
  try {
    [allClasses, allLevels] = await Promise.all([
      adminFetchAll('classes', 'id, name, level_id'),
      adminFetchAll('levels', 'id, name')
    ]);
  } catch (e) {
    hideLoading();
    showToast('Failed to load class context', 'error');
    return;
  }
  hideLoading();

  const levelMap = {};
  (allLevels || []).forEach(l => { levelMap[l.id] = l.name; });

  const classOptions = (allClasses || []).map(c => {
    const lvlName = levelMap[c.level_id] || 'Unknown Level';
    return `<option value="${c.id}" data-name="${escapeHtml(c.name || '')}">${escapeHtml(c.name || '')} (Level: ${escapeHtml(lvlName || '')})</option>`;
  }).join('');

  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px;">
      <div class="modal-header d-flex justify-between align-center p-3">
        <h3 class="fw-700 m-0 text-gradient" style="font-size:1.25rem;">Create New Test</h3>
        <button class="btn btn-ghost btn-sm" id="close-gateway-modal">&#10005;</button>
      </div>
      <div class="modal-body p-4">
        <p class="text-muted text-sm mb-4">Please select the Class for this test. The system will automatically launch the correct test module based on the class type.</p>
        <div class="form-group mb-4">
          <label class="form-label">Target Class</label>
          <select id="gateway-class-select" class="form-control" style="width:100%;font-size:1.05rem;padding:0.75rem;">
            <option value="">-- Select Class --</option>
            ${classOptions}
          </select>
        </div>
        <div class="d-flex justify-end gap-2 mt-4">
          <button class="btn btn-secondary" id="cancel-gateway-modal">Cancel</button>
          <button class="btn btn-primary" id="btn-gateway-next">Next &rarr;</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  document.getElementById('close-gateway-modal').addEventListener('click', close);
  document.getElementById('cancel-gateway-modal').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

  document.getElementById('btn-gateway-next').addEventListener('click', () => {
    const sel = document.getElementById('gateway-class-select');
    const classId = sel.value;
    if (!classId) {
      showToast('Please select a class first.', 'warning');
      return;
    }
    const className = sel.options[sel.selectedIndex].getAttribute('data-name');
    close();

    // Context-Aware Routing
    if ((className || '').toLowerCase().includes('vocab')) {
      openVocabWizard(null, { classId: classId, className: className, testType: 'VOCAB_MASTERY' });
    } else {
      openTestBuilder(null, classId);
    }
  });
};
