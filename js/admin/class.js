// TOPS CORE Centralized Test System V1 Admin UI
import {
  fetchGlobalClasses,
  fetchWordTypes,
  createWordType,
  toggleWordType,
  fetchTopics,
  createTopic,
  updateTopic,
  deleteTopic,
  fetchCentralQuestions,
  createCentralQuestion,
  updateCentralQuestion,
  deleteCentralQuestion,
  fetchTestDefinitions,
  publishTestDefinition,
  fetchTestInstances,
  createTestInstance,
  adminFetchAll,
  adminSoftDelete,
  clearAdminCache,
  fetchClasses,
  fetchClassInstances,
  adminUpdate,
  previewRecalibrateTest,
  applyRecalibrateTest,
  isPassing,
  calculatePercentage,
  formatStudentName,
  toLevelLetter,
  labelAttemptRemedial
} from '../api.js?v=20261114_v517';
import { showToast, showLoading, hideLoading, getGrade, getGradeColor, getGradeColorByScore, TOPSCORE_COLORS } from '../app.js?v=20261106_v160';
import { parseExcelWorkbook, processCentralBankQuestionImport } from '../excel-parser.js?v=20261106_v160';
import { openStudentProfile } from './student-management.js?v=20261106_v160';
import { generateAvatarDataUri } from '../utils/avatar-engine.js?v=20261106_v160';
import { DataGrid } from './datagrid.js?v=20261106_v160';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';

// escapeHtml / escHtml imported canonically

// ============================================================
// 1. TOPICS MANAGEMENT
// ============================================================
export async function renderTopics(area) {
  showLoading();
  try {
    const [topics, Classes] = await Promise.all([
      fetchTopics(),
      fetchGlobalClasses()
    ]);
    hideLoading();

    area.innerHTML = `
      <div class="section-header d-flex justify-between align-center flex-wrap gap-3 mb-4">
        <div>
          <h2 class="section-title text-gradient">Topic Management</h2>
          <p class="section-subtitle">Categorize and structure questions into global topics</p>
        </div>
        <div>
          <button class="btn btn-primary btn-sm" id="btn-add-topic">+ Add New Topic</button>
        </div>
      </div>

      ${window._filterClassId ? `
        <div class="mb-3 p-2 rounded d-flex align-center justify-between" style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);color:#93c5fd;font-size: 12px;">
          <span>${getSvgIcon('filter', 14)} Filtered by Class: <strong>${escapeHtml(window._filterClassName || 'Selected Class')}</strong></span>
          <button class="btn btn-ghost btn-xs" id="clear-subj-filter-btn" style="text-decoration:underline;color:#93c5fd;">Show All Classes</button>
        </div>
      ` : ''}

      <div class="card p-3 mb-4" style="background:rgba(255,255,255,0.02);border:1px solid var(--clr-border);">
        <div class="d-flex align-center gap-3 flex-wrap">
          <label class="form-label mb-0" style="font-size: 12px;">Filter by Class:</label>
          <select class="form-control" id="topic-Class-filter" style="max-width:260px;">
            <option value="">All Classes (${Classes.length})</option>
            ${Classes.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
          </select>
          <span class="text-muted" style="font-size: 12px;margin-left:auto;">Total Topics: <strong id="topics-count">${topics.length}</strong></span>
        </div>
      </div>

      <div class="table-wrap">
        <table class="data-table" id="topics-table">
          <thead>
            <tr>
              <th>TOPIC NAME</th>
              <th>CODE</th>
              <th>CLASS</th>
              <th>STATUS</th>
              <th>CREATED</th>
              <th style="text-align:right;">ACTIONS</th>
            </tr>
          </thead>
          <tbody id="topics-tbody">
            ${renderTopicRows(topics)}
          </tbody>
        </table>
      </div>
    `;

    // Filter event
    const filterEl = document.getElementById('topic-Class-filter');
    const updateFilteredTopics = () => {
      const val = filterEl.value;
      const filtered = val ? topics.filter(t => t.class_id === val) : topics;
      document.getElementById('topics-tbody').innerHTML = renderTopicRows(filtered);
      document.getElementById('topics-count').textContent = filtered.length;
    };
    filterEl.addEventListener('change', updateFilteredTopics);

    if (window._filterClassId) {
      filterEl.value = window._filterClassId;
      updateFilteredTopics();
      document.getElementById('clear-subj-filter-btn')?.addEventListener('click', () => {
        window._filterClassId = null;
        window._filterClassName = null;
        renderTopics(area);
      });
    }

    // Add Topic Button
    document.getElementById('btn-add-topic')?.addEventListener('click', () => {
      openTopicModal(null, Classes, async () => {
        await renderTopics(area);
      });
    });

    // Edit and Delete Delegations
    document.getElementById('topics-tbody')?.addEventListener('click', async (e) => {
      const navBtn = e.target.closest('.btn-nav-questions');
      const editBtn = e.target.closest('.btn-edit-topic');
      const delBtn = e.target.closest('.btn-del-topic');

      if (navBtn) {
        window._filterTopicId = navBtn.dataset.id;
        window._filterTopicName = navBtn.dataset.name;
        window.loadSection('vocab_vault');
        return;
      }

      if (editBtn) {
        const id = editBtn.dataset.id;
        const topic = topics.find(t => t.id === id);
        if (topic) {
          openTopicModal(topic, Classes, async () => {
            await renderTopics(area);
          });
        }
      } else if (delBtn) {
        const id = delBtn.dataset.id;
        if (confirm('Are you sure you want to delete this topic? Associated questions will also be hidden.')) {
          showLoading();
          try {
            await deleteTopic(id);
            showToast('Topic deleted successfully.', 'success');
            await renderTopics(area);
          } catch (err) {
            showToast(err.message, 'error');
          } finally {
            hideLoading();
          }
        }
      }
    });

  } catch (err) {
    hideLoading();
    area.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to load topics: ${err.message}</p></div>`;
  }
}

function renderTopicRows(topicsList) {
  if (!topicsList || !topicsList.length) {
    return `<tr><td colspan="6" class="text-center p-4 text-muted">No topics found. Click "+ Add New Topic" to create one.</td></tr>`;
  }
  return topicsList.map(t => `
    <tr>
      <td><strong style="color:var(--clr-text-1);">${escapeHtml(t.name)}</strong></td>
      <td><code>${escapeHtml(t.code || '-')}</code></td>
      <td><span class="badge badge-info">${escapeHtml(t.classes?.name || 'General')}</span></td>
      <td>
        <span class="badge ${t.status === 'active' ? 'badge-success' : 'badge-secondary'}">
          ${escapeHtml(t.status || 'active')}
        </span>
      </td>
      <td style="font-size: 12px;color:var(--clr-text-muted);">${new Date(t.created_at).toLocaleDateString()}</td>
      <td style="text-align:right;">
        <div class="d-flex gap-1 justify-end">
          <button class="btn btn-outline btn-xs btn-nav-questions" data-id="${t.id}" data-name="${escapeHtml(t.name)}" title="View Questions in this Topic">Questions &rarr;</button>
          <button class="btn btn-secondary btn-xs btn-edit-topic edit-mode-only" data-id="${t.id}" title="Edit Topic">Edit</button>
          <button class="btn btn-danger btn-xs btn-del-topic edit-mode-only" data-id="${t.id}" title="Delete Topic" style="margin-left:4px;">Del</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function openTopicModal(topic, Classes, onSaved) {
  const isEdit = !!topic;
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:480px;">
      <div class="modal-header d-flex justify-between align-center p-3" style="border-bottom:1px solid var(--clr-border);">
        <h3 class="modal-title" style="margin:0;font-size: 16px;">${isEdit ? 'Edit Topic' : 'Add New Topic'}</h3>
      </div>
      <div class="modal-body p-4">
        <div class="form-group mb-3">
          <label class="form-label">Class *</label>
          <select class="form-control" id="modal-topic-Class">
            ${Classes.map(s => `
              <option value="${s.id}" ${topic?.class_id === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>
            `).join('')}
          </select>
        </div>
        <div class="form-group mb-3">
          <label class="form-label">Topic Name *</label>
          <input type="text" class="form-control" id="modal-topic-name" value="${escapeHtml(topic?.name || '')}" placeholder="e.g. Food, Travel, Daily Activities" required />
        </div>
        <div class="form-group mb-3">
          <label class="form-label">Topic Code (Optional)</label>
          <input type="text" class="form-control" id="modal-topic-code" value="${escapeHtml(topic?.code || '')}" placeholder="e.g. TOP-FOOD" />
        </div>
        <div class="form-group mb-4">
          <label class="form-label">Status</label>
          <select class="form-control" id="modal-topic-status">
            <option value="active" ${topic?.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${topic?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
        <div class="d-flex justify-between align-center gap-2 mt-3 pt-3" style="border-top:1px solid rgba(255,255,255,0.08);">
          <button class="btn btn-secondary btn-sm btn-modal-close-left" id="cancel-topic-btn">Cancel</button>
          <button class="btn btn-primary btn-sm" id="save-topic-btn">${isEdit ? 'Save Changes' : 'Create Topic'}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('#close-topic-modal')?.addEventListener('click', close);
  modal.querySelector('#cancel-topic-btn').onclick = close;

  modal.querySelector('#save-topic-btn').onclick = async () => {
    const ClassId = modal.querySelector('#modal-topic-Class').value;
    const name = modal.querySelector('#modal-topic-name').value.trim();
    const code = modal.querySelector('#modal-topic-code').value.trim();
    const status = modal.querySelector('#modal-topic-status').value;

    if (!name) {
      showToast('Please enter a topic name.', 'warning');
      return;
    }

    try {
      showLoading();
      if (isEdit) {
        await updateTopic(topic.id, { class_id: ClassId, name, code, status });
        showToast('Topic updated.', 'success');
      } else {
        await createTopic({ class_id: ClassId, name, code, status });
        showToast('Topic created.', 'success');
      }
      close();
      if (onSaved) onSaved();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      hideLoading();
    }
  };
}

// ============================================================
// 2. WORD TYPES MANAGEMENT
// ============================================================
export async function renderWordTypes(area) {
  showLoading();
  try {
    const wordTypes = await fetchWordTypes();
    hideLoading();

    const systemTypes = [
      'Noun', 'Verb', 'Adjective', 'Adverb', 'Pronoun', 'Preposition',
      'Conjunction', 'Interjection', 'Determiner', 'Article', 'Phrase', 'Expression', 'Idiom'
    ];

    area.innerHTML = `
      <div class="section-header d-flex justify-between align-center flex-wrap gap-3 mb-4">
        <div>
          <h2 class="section-title text-gradient">Word Types</h2>
          <p class="section-subtitle">Configurable vocabulary classification with intelligent system suggestions</p>
        </div>
      </div>

      <div class="card p-4 mb-4" style="background:rgba(255,255,255,0.02);border:1px solid var(--clr-border);">
        <h4 style="font-size: 16px;margin-bottom:0.75rem;">+ Add Custom Word Type</h4>
        <div class="d-flex gap-2 flex-wrap" style="max-width:500px;">
          <input type="text" class="form-control" id="new-word-type-input" placeholder="e.g. Phrasal Verb, Slang, Collocation" />
          <button class="btn btn-primary btn-sm" id="btn-add-word-type">+ Add</button>
        </div>

        <div class="mt-4">
          <label class="form-label" style="font-size: 12px;color:var(--clr-text-muted);">Quick Suggestions (Click to add):</label>
          <div class="d-flex gap-2 flex-wrap">
            ${systemTypes.map(st => {
      const exists = wordTypes.some(wt => wt.name.toLowerCase() === st.toLowerCase());
      return `
                <button class="btn btn-sm ${exists ? 'btn-ghost' : 'btn-outline-primary'} btn-suggest-wt" data-name="${st}" ${exists ? 'disabled title="Already added"' : ''}>
                  ${st} ${exists ? '✓' : '+'}
                </button>
              `;
    }).join('')}
          </div>
        </div>
      </div>

      <div class="table-responsive card" style="background:rgba(255,255,255,0.02);border:1px solid var(--clr-border);">
        <table class="data-table">
          <thead>
            <tr>
              <th>WORD TYPE</th>
              <th>CATEGORY</th>
              <th>ACTIVE STATUS</th>
              <th style="text-align:right;">TOGGLE</th>
            </tr>
          </thead>
          <tbody>
            ${wordTypes.map(wt => `
              <tr>
                <td style="font-weight:500; color:var(--clr-text-1);">${escapeHtml(wt.name)}</td>
                <td>
                  <span style="font-size:12px; color:var(--clr-text-2); font-weight:500;">
                    ${wt.is_system ? 'System Default' : 'Custom'}
                  </span>
                </td>
                <td>
                  <span style="font-size:12px; color:${wt.is_active ? 'var(--grade-a)' : 'var(--grade-e)'}; font-weight:500;">
                    ${wt.is_active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td style="text-align:right;">
                  <button class="btn btn-sm ${wt.is_active ? 'btn-secondary text-danger' : 'btn-success'} btn-toggle-wt" data-id="${wt.id}" data-active="${wt.is_active}">
                    ${wt.is_active ? 'Disable' : 'Enable'}
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Add custom word type
    const addBtn = document.getElementById('btn-add-word-type');
    const inputEl = document.getElementById('new-word-type-input');
    const handleAdd = async (name) => {
      if (!name) return;
      showLoading();
      try {
        await createWordType(name);
        showToast(`Word type "${name}" added.`, 'success');
        await renderWordTypes(area);
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        hideLoading();
      }
    };

    addBtn.onclick = () => handleAdd(inputEl.value);
    inputEl.onkeydown = (e) => { if (e.key === 'Enter') handleAdd(inputEl.value); };

    // Suggestion chips
    area.querySelectorAll('.btn-suggest-wt').forEach(btn => {
      btn.onclick = () => handleAdd(btn.dataset.name);
    });

    // Toggle status
    area.querySelectorAll('.btn-toggle-wt').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id;
        const currentActive = btn.dataset.active === 'true';
        showLoading();
        try {
          await toggleWordType(id, !currentActive);
          showToast(`Word type ${!currentActive ? 'enabled' : 'disabled'}.`, 'success');
          await renderWordTypes(area);
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          hideLoading();
        }
      };
    });

  } catch (err) {
    hideLoading();
    area.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to load word types: ${err.message}</p></div>`;
  }
}

// ============================================================
// 3. QUESTION BANK & IMPORT (Redirected to canonical vocab_vault)
// ============================================================
export async function renderCentralQuestionBank(area) {
  if (typeof window.loadSection === 'function') {
    return window.loadSection('vocab_vault');
  }
}

export async function renderCentralQuestionImport(area) {
  if (typeof window.loadSection === 'function') {
    return window.loadSection('vocab_vault');
  }
}

export async function renderResults(area) {
  const [rawData, allInstitutions, allPrograms, allBatches] = await Promise.all([
    adminFetchAll('attempts', 'id, student_id, test_id, attempt_number, status, score, percentage, effective_score, is_remedial_unlocked, created_at, submitted_at, students(name, gender, batch_id, batches(name), program_id, programs(name, institution_id, institutions(name))), tests(id, title, test_type, prerequisite_test_id, minimum_required_score, shell_code)'),
    adminFetchAll('institutions', 'id, name, is_active'),
    adminFetchAll('programs', 'id, name, is_active, institution_id'),
    adminFetchAll('batches', 'id, name, is_active, program_id')
  ]);

  // Precalculate student best scores per test for prerequisite checking and highest score logic
  const studentBestScoreMap = new Map();
  rawData.forEach(r => {
    if (!['submitted', 'auto_submitted'].includes(r.status)) return;
    const defId = r.tests?.id;
    if (!r.student_id || !defId) return;
    const key = `${r.student_id}_${defId}`;
    const pct = parseFloat(r.percentage || 0);
    const cur = studentBestScoreMap.get(key) ?? -1;
    if (pct > cur) {
      studentBestScoreMap.set(key, pct);
    }
  });

  const submittedOnly = rawData.filter(r => ['submitted', 'auto_submitted'].includes(r.status));
  // Default: sort alphabetically by Student Name (A-Z)
  let allData = [...submittedOnly].sort((a, b) => (a.students?.name || '').localeCompare(b.students?.name || ''));
  if (window._filterTestResults) {
    allData = allData.filter(r => r.tests?.id === window._filterTestResults);
  }

  let selectedProg = '';
  let selectedClass = '';
  let selectedBatch = '';
  let searchQuery = '';
  let currentDeduplicatedResults = [];

  area.innerHTML = `
        <div class="section-header d-flex justify-between align-center flex-wrap gap-2">
          <div>
            <h2 class="section-title">Test Results <span class="count-chip" id="res-count-chip">${allData.length} Total</span></h2>
            <p class="section-subtitle">Student test attempt submissions displaying highest score records and prerequisite status</p>
          </div>
          <div>
            <button class="btn btn-secondary btn-sm" id="export-gradebook-btn" style="display:inline-flex;align-items:center;gap:6px;font-weight:600;">
              ${getSvgIcon('download', 14)} Export Gradebook (.xlsx)
            </button>
          </div>
        </div>

        ${window._filterTestResults ? `
          <div class="mb-3 p-2 rounded d-flex align-center justify-between" style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);color:#93c5fd;font-size: 12px;">
            <span style="display:inline-flex;align-items:center;gap:6px;">${getSvgIcon('filter', 14)} Filtered Results for Selected Test (${allData.length} attempts)</span>
            <button class="btn btn-ghost btn-xs" id="clear-Test-results-btn" style="text-decoration:underline;color:#93c5fd;">Show All Test Results</button>
          </div>
        ` : ''}

        <!-- Filter Bar -->
        <div class="filter-bar mb-4 p-3 rounded d-flex gap-3 align-center flex-wrap" style="background:var(--clr-surface-2);border:1px solid var(--clr-border);">
          <div style="min-width:180px;">
            <label class="text-xs text-muted d-block mb-1">Filter Program</label>
            <select id="res-filter-prog" class="form-control" style="padding:6px 10px;font-size: 12px;">
              <option value="">&mdash; All Institutions &mdash;</option>
              ${(allInstitutions || []).filter(p => !p.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
            </select>
          </div>

          <div style="min-width:180px;">
            <label class="text-xs text-muted d-block mb-1">Filter Class</label>
            <select id="res-filter-class" class="form-control" style="padding:6px 10px;font-size: 12px;">
              <option value="">&mdash; All Programs &mdash;</option>
              ${(allPrograms || []).filter(c => !c.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(c => `<option value="${c.id}" data-inst="${c.institution_id}">${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>

          <div style="min-width:180px;">
            <label class="text-xs text-muted d-block mb-1">Filter Batch (Group)</label>
            <select id="res-filter-batch" class="form-control" style="padding:6px 10px;font-size: 12px;">
              <option value="">&mdash; All Batches &mdash;</option>
              ${(allBatches || []).filter(b => !b.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(b => `<option value="${b.id}" data-prog="${b.program_id}">${escapeHtml(b.name)}</option>`).join('')}
            </select>
          </div>

          <div style="flex:1;min-width:220px;">
            <label class="text-xs text-muted d-block mb-1">Search Student / Test</label>
            <input type="text" id="res-filter-search" class="form-control" placeholder="Type student name or test title&hellip;" style="padding:6px 10px;font-size: 12px;">
          </div>

          <div class="d-flex align-end" style="padding-top:18px;">
            <button class="btn btn-ghost btn-sm" id="res-btn-reset" title="Reset all filters" style="display:inline-flex;align-items:center;gap:4px;">${getSvgIcon('refresh', 14)} Reset</button>
          </div>
        </div>

        <div id="results-grid-container" class="mt-4"></div>
      `;

  const progSelect = document.getElementById('res-filter-prog');
  const classSelect = document.getElementById('res-filter-class');
  const batchSelect = document.getElementById('res-filter-batch');
  const searchInput = document.getElementById('res-filter-search');
  const countChip = document.getElementById('res-count-chip');

  const updateClassOptions = () => {
    const pId = progSelect.value;
    Array.from(classSelect.options).forEach((opt, idx) => {
      if (idx === 0) return;
      const match = !pId || opt.getAttribute('data-prog') === pId;
      opt.style.display = match ? '' : 'none';
    });
    if (pId && classSelect.selectedOptions[0]?.style.display === 'none') {
      classSelect.value = '';
    }
    updateBatchOptions();
  };

  const updateBatchOptions = () => {
    const cId = classSelect.value;
    Array.from(batchSelect.options).forEach((opt, idx) => {
      if (idx === 0) return;
      const match = !cId || opt.getAttribute('data-class') === cId;
      opt.style.display = match ? '' : 'none';
    });
    if (cId && batchSelect.selectedOptions[0]?.style.display === 'none') {
      batchSelect.value = '';
    }
  };

  const renderTable = () => {
    const pId = progSelect.value;
    const cId = classSelect.value;
    const bId = batchSelect.value;
    const q = searchInput.value.toLowerCase().trim();

    const filtered = allData.filter(r => {
      const studentProgId = r.student?.programs?.institutions?.id || r.student?.programs?.institution_id;
      if (pId && studentProgId !== pId) return false;
      if (cId && r.students?.program_id !== cId) return false;
      if (bId && r.students?.batch_id !== bId) return false;
      if (q) {
        const sName = (r.students?.name || '').toLowerCase();
        const eTitle = (r.tests?.title || '').toLowerCase();
        const eType = (r.tests?.test_type || '').toLowerCase();
        if (!sName.includes(q) && !eTitle.includes(q) && !eType.includes(q)) return false;
      }
      return true;
    });

    // Deduplicate by Student + Test, keeping highest EFFECTIVE score only.
    const getEffectivePct = (r) => {
      const rawPct = parseFloat(r.percentage || 0);
      if (r.is_remedial_unlocked && rawPct > 60) return 60;
      return r.effective_score != null ? parseFloat(r.effective_score) : rawPct;
    };
    const mergedResults = new Map();
    filtered.forEach(r => {
      const key = `${r.student_id}_${r.tests?.id}`;
      const existing = mergedResults.get(key);
      if (!existing) {
        mergedResults.set(key, r);
      } else {
        const existingScore = getEffectivePct(existing);
        const currentScore = getEffectivePct(r);
        // If current effective score is higher, or same score but newer submission, take the new one
        if (currentScore > existingScore || (currentScore === existingScore && new Date(r.submitted_at) > new Date(existing.submitted_at))) {
          mergedResults.set(key, r);
        }
      }
    });
    const deduplicated = Array.from(mergedResults.values());
    currentDeduplicatedResults = deduplicated;

    countChip.textContent = `${deduplicated.length} Records (Highest Score)`;

    document.getElementById('results-grid-container').innerHTML = '';
    if (!deduplicated.length) {
      document.getElementById('results-grid-container').innerHTML = '<div class="text-center text-muted p-5">No submitted results match the selected filters.</div>';
      return;
    }

    new window.DataGrid({
      container: 'results-grid-container',
      data: deduplicated,
      pageSize: 1000,
      hideToolbar: true,
      searchKeys: ['students.name', 'tests.title', 'tests.shell_code', 'tests.test_type', 'students.programs.name', 'students.programs.institutions.name'],
      columns: [
        { key: 'students.programs.institutions.name', label: 'INSTITUTION', sortable: true, render: (v, r) => `<span class="text-muted text-sm" style="font-size:12px;">${escapeHtml(r.students?.programs?.institutions?.name || '&mdash;')}</span>` },
        { key: 'students.programs.name', label: 'PROGRAM', sortable: true, render: (v, r) => `<span class="text-muted text-sm" style="font-size:12px;">${escapeHtml(r.students?.programs?.name || '&mdash;')}</span>` },
        { key: 'students.batches.name', label: 'BATCH', sortable: true, render: (v, r) => `<span class="text-sm fw-600" style="color:var(--clr-text-2); font-size:12px;">${escapeHtml(r.students?.batches?.name || 'Unassigned')}</span>` },
        { key: 'students.name', label: 'STUDENT NAME', sortable: true, render: (v, r) => `<span class="fw-600" style="color:var(--clr-text-1); font-size:12px;">${escapeHtml(r.students?.name || '&mdash;')}</span>` },
        {
          key: 'tests.title', label: 'TEST', sortable: true, render: (v, r) => {
            const def = r.tests || {};
            const codeBadge = def.shell_code ? `<span class="badge" style="font-family:monospace;font-size: 12px;background:rgba(56,189,248,0.12);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);margin-right:6px;padding:2px 5px;">${escapeHtml(def.shell_code)}</span>` : '';
            return `<div class="d-flex align-items-center flex-wrap gap-1" style="font-size:12px;">${codeBadge}<span class="text-sm fw-600">${def.test_type ? escapeHtml(def.test_type) + ' &mdash; ' : ''}${escapeHtml(def.title || '&mdash;')}</span></div>`;
          }
        },
        {
          key: 'percentage', label: 'RATE', shortLabel: 'RATE', microLabel: 'RATE', sortable: true, render: (v, r) => {
            const rawPct = parseFloat(r.percentage || 0);
            const isRemedial = Boolean(r.is_remedial_unlocked || r.is_remedial);
            const isForgiven = Boolean(r.is_forgiven);
            const effectivePct = isRemedial ? Math.min(rawPct, 60.0) : (r.effective_score != null ? parseFloat(r.effective_score) : rawPct);
            const effectiveGrade = isForgiven ? 'F' : (isRemedial ? 'R' : (r.grade || (typeof getGrade === 'function' ? getGrade(effectivePct) : (effectivePct >= 90 ? 'A' : (effectivePct >= 80 ? 'B' : (effectivePct >= 60 ? 'C' : (effectivePct >= 30 ? 'D' : 'E')))))));
            return `
              <div class="text-center fw-700" style="display:flex;align-items:center;justify-content:center;gap:4px;font-size:12px;">
                <div style="display:flex;align-items:center;gap:4px;" class="text-grade-${effectiveGrade}">
                  <span>${effectivePct.toFixed(1)}%</span>
                </div>
              </div>
            `;
          }
        },
        { key: 'grade', label: 'GRADE', sortable: true, render: (v, r) => {
            const rawPct = parseFloat(r.percentage || 0);
            const isRemedial = Boolean(r.is_remedial_unlocked || r.is_remedial);
            const isForgiven = Boolean(r.is_forgiven);
            const effectivePct = isRemedial ? Math.min(rawPct, 60.0) : (r.effective_score != null ? parseFloat(r.effective_score) : rawPct);
            let displayGrade = r.grade;
            if (isForgiven) {
              displayGrade = 'F';
            } else if (isRemedial) {
              displayGrade = 'R';
            } else if (!displayGrade) {
              displayGrade = typeof getGrade === 'function' ? getGrade(effectivePct) : 'E';
            }
            const gradeSymbol = (displayGrade === 'S' || displayGrade === '★' || effectivePct >= 100) ? '★' : displayGrade;
            return `<div class="text-center"><span class="grade-badge grade-${displayGrade}" style="width:30px;height:30px;font-size: 12px;display:inline-flex;align-items:center;justify-content:center;line-height:1;">${gradeSymbol}</span></div>`;
          }
        },
        {
          key: 'prereq', label: 'PREREQUISITE', sortable: false, render: (v, r) => {
            const def = r.tests || {};
            const prereqId = def.prerequisite_test_id;
            const minScore = Number(def.minimum_required_score) || 60;
            if (!prereqId) return '<div class="text-center"><span class="text-muted text-xs">&mdash;</span></div>';
            const studentPrereqBest = studentBestScoreMap.get(`${r.student_id}_${prereqId}`);
            if (studentPrereqBest != null && studentPrereqBest >= minScore) {
              return `<div class="text-center"><span class="badge badge-success text-xs" style="font-size: 12px;padding:2px 6px;" title="Prerequisite completed (${studentPrereqBest.toFixed(1)}% &ge; ${minScore}%)">Unlocked</span></div>`;
            }
            return `<div class="text-center"><span class="badge badge-danger" style="font-size: 12px;padding:2px 7px;font-weight:600;display:inline-flex;align-items:center;gap:3px;" title="Prerequisite requirement not completed (Required &ge; ${minScore}%)">Locked</span></div>`;
          }
        },
        {
          key: 'score', label: 'PTS', sortable: true, render: (v, r) => {
            const sc = r.score != null ? Math.round(Number(r.score)) : '-';
            const total = r.total_questions != null ? Math.round(Number(r.total_questions)) : '-';
            return `<div class="text-center fw-600"><span class="badge" style="background:rgba(56,189,248,0.12);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);font-size: 12px;padding:2px 8px;">${sc} / ${total}</span></div>`;
          }
        },
        { key: 'submitted_at', label: 'SUBMITTED', sortable: true, render: (v, r) => `<div class="text-center text-muted text-xs">${r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '&mdash;'}</div>` },
        { key: 'actions', label: 'ACTIONS', sortable: false, render: (v, r) => {
           let btns = `<a href="result.html?attempt_id=${r.id}&from=admin" target="_blank" class="btn btn-secondary btn-sm" style="font-size: 12px; padding:3px 8px; display:inline-flex; align-items:center; gap:4px; text-decoration:none;" title="Inspect Result & Answers Breakdown">Result</a>`;
           btns += `<button class="btn btn-ghost btn-sm results-view-profile-btn" data-sid="${r.student_id}" style="font-size: 12px; padding:3px 10px; display:inline-flex; align-items:center; gap:4px;" title="View full student profile">Profile</button>`;
           if (r.is_remedial_unlocked || r.is_remedial) {
             btns += `<button class="btn btn-secondary btn-sm toggle-remedial-btn" data-aid="${r.id}" data-set-remedial="false" style="font-size: 12px; padding:3px 8px; background:rgba(var(--grade-c-rgb),0.15); border:1px solid var(--grade-c); color:var(--grade-c);" title="Revert remedial status (return to normal)">Normal</button>`;
           } else {
             btns += `<button class="btn btn-warning btn-sm toggle-remedial-btn" data-aid="${r.id}" data-set-remedial="true" style="font-size: 12px; padding:3px 8px;" title="Mark this score as Remedial">Remedial</button>`;
           }
           return `<div class="text-center d-flex gap-2 justify-center flex-wrap" style="min-width:180px;">${btns}</div>`;
        } }
      ]
    });
  };

  progSelect.addEventListener('change', () => { updateClassOptions(); renderTable(); });
  classSelect.addEventListener('change', () => { updateBatchOptions(); renderTable(); });
  batchSelect.addEventListener('change', renderTable);
  searchInput.addEventListener('input', renderTable);

  document.getElementById('res-btn-reset')?.addEventListener('click', () => {
    window._filterTestResults = null;
    progSelect.value = '';
    classSelect.value = '';
    batchSelect.value = '';
    searchInput.value = '';
    updateClassOptions();
    loadSection('results');
  });

  document.getElementById('clear-Test-results-btn')?.addEventListener('click', () => {
    window._filterTestResults = null;
    loadSection('results');
  });

  renderTable();

  // Export Gradebook (.xlsx) handler
  document.getElementById('export-gradebook-btn')?.addEventListener('click', () => {
    if (typeof XLSX === 'undefined') {
      showToast('SheetJS library (XLSX) is not loaded.', 'error');
      return;
    }
    const rowsToExport = currentDeduplicatedResults && currentDeduplicatedResults.length > 0 ? currentDeduplicatedResults : allData;
    if (!rowsToExport.length) {
      showToast('No results to export.', 'warning');
      return;
    }
    const exportData = rowsToExport.map(r => {
      const def = r.tests || {};
      const rawPct = Number(r.percentage || r.effective_score || 0);
      const isRemedial = Boolean(r.is_remedial_unlocked || r.is_remedial);
      const isForgiven = Boolean(r.is_forgiven);
      const exportPct = isRemedial ? Math.min(rawPct, 60.0) : (r.effective_score != null ? Number(r.effective_score) : rawPct);
      const exportGrade = isForgiven ? 'F' : (isRemedial ? 'R' : (r.grade || getGrade(exportPct)));
      return {
        'Student Name': r.students?.name || '—',
        'Gender': r.students?.gender ? (r.students.gender === 'female' ? 'Female' : 'Male') : '—',
        'Institution': r.students?.programs?.institutions?.name || '—',
        'Program': r.students?.programs?.name || '—',
        'Batch': r.students?.batches?.name || '—',
        'Test Title': def.title || '—',
        'Test Type': def.test_type || '—',
        'Score': r.score != null ? r.score : '—',
        'Raw Percentage (%)': rawPct != null ? `${rawPct}%` : '—',
        'Effective Percentage (%)': `${exportPct}%`,
        'Grade': exportGrade,
        'Is Remedial': isRemedial ? 'Yes' : 'No',
        'Submitted At': r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—',
        'Status': r.status || '—'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Gradebook');
    const filename = `Gradebook_Export_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
    showToast(`Exported ${exportData.length} records to ${filename}`, 'success');
  });

  document.getElementById('results-grid-container')?.addEventListener('click', async e => {
    const toggleRemBtn = e.target.closest('.toggle-remedial-btn');
    if (toggleRemBtn) {
      const attemptId = toggleRemBtn.getAttribute('data-aid');
      const targetRemedial = toggleRemBtn.getAttribute('data-set-remedial') === 'true';
      const promptMsg = targetRemedial
        ? 'Mark this score as REMEDIAL (Grade will display with small "R", max score capped at 60%)?'
        : 'Revert this score to NORMAL?';

      if (confirm(promptMsg)) {
        showLoading();
        try {
          await labelAttemptRemedial(attemptId, targetRemedial, 60);
          const record = allData.find(x => x.id === attemptId);
          if (record) {
            record.is_remedial_unlocked = targetRemedial;
            const raw = parseFloat(record.percentage || 0);
            record.effective_score = targetRemedial ? Math.min(raw, 60.0) : raw;
            record.grade = getGrade(record.effective_score);
          }
          renderTable();
          showToast(targetRemedial ? 'Successfully labeled as Remedial.' : 'Remedial status reverted to Normal.', 'success');
        } catch (err) {
          console.error('Failed to toggle remedial:', err);
          showToast('Failed to update remedial status: ' + err.message, 'error');
        } finally {
          hideLoading();
        }
      }
      return;
    }

    const btn = e.target.closest('.results-view-profile-btn');
    if (!btn) return;
    const sid = btn.getAttribute('data-sid');
    if (!sid) return;

    // Collect all currently visible student IDs for batch nav
    const allSids = currentDeduplicatedResults.map(r => r.student_id);
    openStudentProfile(sid, allSids);
  });
}

// ============================================================
// CLASS INSTANCES UI (Redirected to canonical class-hub)
// ============================================================
export async function renderClassInstances(area) {
  if (typeof window.loadSection === 'function') {
    return window.loadSection('class-hub');
  }
}
