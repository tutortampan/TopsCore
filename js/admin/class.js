// TOPS CORE Centralized Assessment System V1 Admin UI
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
  fetchAssessmentDefinitions,
  publishAssessmentDefinition,
  fetchAssessmentInstances,
  createAssessmentInstance,
  adminFetchAll,
  adminSoftDelete,
  clearAdminCache,
  fetchClasses,
  fetchClassInstances,
  adminUpdate,
  previewRecalibrateAssessment,
  applyRecalibrateAssessment,
  isPassing,
  calculatePercentage,
  formatStudentName,
  fetchClassInstanceRoster,
  addAdditionalMember,
  toLevelLetter
} from '../api.js?v=5.3.2';
import { showToast, showLoading, hideLoading, getGrade } from '../app.js?v=5.3.2';
import { parseExcelWorkbook, processCentralBankQuestionImport } from '../excel-parser.js?v=5.3.2';
import { openStudentProfile } from './student-management.js?v=5.3.2';
import { generateAvatarDataUri } from '../utils/avatar-engine.js?v=5.3.2';

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
        <div class="mb-3 p-2 rounded d-flex align-center justify-between" style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);color:#93c5fd;font-size:0.85rem;">
          <span>&#128209; Filtered by Class: <strong>${escapeHtml(window._filterClassName || 'Selected Class')}</strong></span>
          <button class="btn btn-ghost btn-xs" id="clear-subj-filter-btn" style="text-decoration:underline;color:#93c5fd;">Show All Classes</button>
        </div>
      ` : ''}

      <div class="card p-3 mb-4" style="background:rgba(255,255,255,0.02);border:1px solid var(--clr-border);">
        <div class="d-flex align-center gap-3 flex-wrap">
          <label class="form-label mb-0" style="font-size:0.85rem;">Filter by Class:</label>
          <select class="form-control" id="topic-Class-filter" style="max-width:260px;">
            <option value="">All Classes (${Classes.length})</option>
            ${Classes.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
          </select>
          <span class="text-muted" style="font-size:0.85rem;margin-left:auto;">Total Topics: <strong id="topics-count">${topics.length}</strong></span>
        </div>
      </div>

      <div class="table-responsive card" style="background:rgba(255,255,255,0.02);border:1px solid var(--clr-border);">
        <table class="data-table" id="topics-table">
          <thead>
            <tr>
              <th>Topic Name</th>
              <th>Code</th>
              <th>Class</th>
              <th>Status</th>
              <th>Created</th>
              <th style="text-align:right;">Actions</th>
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
    document.getElementById('btn-add-topic').addEventListener('click', () => {
      openTopicModal(null, Classes, async () => {
        await renderTopics(area);
      });
    });

    // Edit and Delete Delegations
    document.getElementById('topics-tbody').addEventListener('click', async (e) => {
      const navBtn = e.target.closest('.btn-nav-questions');
      const editBtn = e.target.closest('.btn-edit-topic');
      const delBtn = e.target.closest('.btn-del-topic');

      if (navBtn) {
        window._filterTopicId = navBtn.dataset.id;
        window._filterTopicName = navBtn.dataset.name;
        window.loadSection('questions');
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
      <td style="font-size:0.8rem;color:var(--clr-text-muted);">${new Date(t.created_at).toLocaleDateString()}</td>
      <td style="text-align:right;">
        <div class="d-flex gap-1 justify-end">
          <button class="btn btn-outline btn-xs btn-nav-questions" data-id="${t.id}" data-name="${escapeHtml(t.name)}" title="View Questions in this Topic">Questions &rarr;</button>
          <button class="btn btn-ghost btn-sm btn-edit-topic" data-id="${t.id}" title="Edit Topic">&#9999;&#65039;</button>
          <button class="btn btn-ghost btn-sm text-danger btn-del-topic" data-id="${t.id}" title="Delete Topic">&#128465;&#65039;</button>
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
        <h3 class="modal-title" style="margin:0;font-size:1.2rem;">${isEdit ? 'Edit Topic' : 'Add New Topic'}</h3>
        <button class="btn btn-ghost btn-sm" id="close-topic-modal" style="font-size:1.2rem;">&times;</button>
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
        <div class="d-flex justify-end gap-2">
          <button class="btn btn-secondary btn-sm" id="cancel-topic-btn">Cancel</button>
          <button class="btn btn-primary btn-sm" id="save-topic-btn">${isEdit ? 'Save Changes' : 'Create Topic'}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('#close-topic-modal').onclick = close;
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
        <h4 style="font-size:0.95rem;margin-bottom:0.75rem;">+ Add Custom Word Type</h4>
        <div class="d-flex gap-2 flex-wrap" style="max-width:500px;">
          <input type="text" class="form-control" id="new-word-type-input" placeholder="e.g. Phrasal Verb, Slang, Collocation" />
          <button class="btn btn-primary btn-sm" id="btn-add-word-type">+ Add</button>
        </div>

        <div class="mt-4">
          <label class="form-label" style="font-size:0.8rem;color:var(--clr-text-muted);">Quick Suggestions (Click to add):</label>
          <div class="d-flex gap-2 flex-wrap">
            ${systemTypes.map(st => {
      const exists = wordTypes.some(wt => wt.name.toLowerCase() === st.toLowerCase());
      return `
                <button class="btn btn-sm ${exists ? 'btn-ghost' : 'btn-outline-primary'} btn-suggest-wt" data-name="${st}" ${exists ? 'disabled title="Already added"' : ''}>
                  ${st} ${exists ? '&#10003;' : '+'}
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
              <th>Word Type</th>
              <th>Category</th>
              <th>Active Status</th>
              <th style="text-align:right;">Toggle</th>
            </tr>
          </thead>
          <tbody>
            ${wordTypes.map(wt => `
              <tr>
                <td><strong>${escapeHtml(wt.name)}</strong></td>
                <td>
                  <span class="badge ${wt.is_system ? 'badge-primary' : 'badge-secondary'}">
                    ${wt.is_system ? 'System Default' : 'Custom'}
                  </span>
                </td>
                <td>
                  <span class="badge ${wt.is_active ? 'badge-success' : 'badge-danger'}">
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
// 3. QUESTION BANK
// ============================================================
export async function renderCentralQuestionBank(area) {
  showLoading();
  const preFilterClassId = window._filterClassId || null;
  const preFilterClassName = window._filterClassName || null;
  // Consume the filter so it doesn't persist across navigations
  window._filterClassId = null;
  window._filterClassName = null;
  try {
    const [questions, topics, Classes, wordTypes] = await Promise.all([
      fetchCentralQuestions(preFilterClassId ? { class_id: preFilterClassId } : {}),
      fetchTopics(preFilterClassId || undefined),
      fetchGlobalClasses(),
      fetchWordTypes()
    ]);
    hideLoading();

    area.innerHTML = `
      <div class="section-header d-flex justify-between align-center flex-wrap gap-3 mb-4">
        <div>
          <h2 class="section-title text-gradient">Question Bank${preFilterClassName ? ` — ${escapeHtml(preFilterClassName)}` : ''}</h2>
          <p class="section-subtitle">${preFilterClassName ? `Questions scoped to class: ${escapeHtml(preFilterClassName)}` : 'Global repository of questions organized by Topic and Word Type'}</p>
        </div>
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-primary btn-sm" id="btn-add-question">+ Add New Question</button>
          <button class="btn btn-secondary btn-sm" onclick="window.loadSection('import-questions')">&#128229; Import Excel</button>
        </div>
      </div>

      ${preFilterClassName ? `
        <div class="mb-3 p-2 rounded d-flex align-center justify-between" style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.3);color:#a5b4fc;font-size:0.85rem;">
          <span>&#128209; Scoped to Class: <strong>${escapeHtml(preFilterClassName)}</strong></span>
          <button class="btn btn-ghost btn-xs" onclick="window.loadSection('questions')" style="text-decoration:underline;color:#a5b4fc;">Show All Classes</button>
        </div>
      ` : ''}

      ${window._filterTopicId ? `
        <div class="mb-3 p-2 rounded d-flex align-center justify-between" style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);color:#93c5fd;font-size:0.85rem;">
          <span>&#128209; Filtered by Topic: <strong>${escapeHtml(window._filterTopicName || 'Selected Topic')}</strong></span>
          <button class="btn btn-ghost btn-xs" id="clear-topic-filter-btn" style="text-decoration:underline;color:#93c5fd;">Show All Topics</button>
        </div>
      ` : ''}

      <!-- Filter Controls -->
      <div class="card p-3 mb-4" style="background:rgba(255,255,255,0.02);border:1px solid var(--clr-border);">
        <div class="d-flex gap-3 flex-wrap align-center">
          <div style="flex:1;min-width:200px;">
            <input type="text" class="form-control" id="q-search-input" placeholder="&#128269; Search question or answer..." />
          </div>
          <div style="min-width:160px;">
            <select class="form-control" id="q-topic-filter">
              <option value="">All Topics (${topics.length})</option>
              ${topics.map(t => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('')}
            </select>
          </div>
          <div style="min-width:150px;">
            <select class="form-control" id="q-wordtype-filter">
              <option value="">All Word Types</option>
              ${wordTypes.map(wt => `<option value="${wt.name}">${escapeHtml(wt.name)}</option>`).join('')}
            </select>
          </div>
          <span class="text-muted" style="font-size:0.85rem;margin-left:auto;">
            Questions: <strong id="q-count-badge">${questions.length}</strong>
          </span>
        </div>
      </div>

      <!-- Question List Table -->
      <div class="table-responsive card" style="background:rgba(255,255,255,0.02);border:1px solid var(--clr-border);">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width:160px;">Topic</th>
              <th style="width:110px;">Word Type</th>
              <th>Question Text</th>
              <th>Accepted Answers</th>
              <th style="width:80px;">Status</th>
              <th style="text-align:right;width:100px;">Actions</th>
            </tr>
          </thead>
          <tbody id="q-tbody">
            ${renderQuestionRows(questions)}
          </tbody>
        </table>
      </div>
    `;

    // Filter Logic
    const searchInput = document.getElementById('q-search-input');
    const topicFilter = document.getElementById('q-topic-filter');
    const wtFilter = document.getElementById('q-wordtype-filter');

    const applyFilters = () => {
      const s = searchInput.value.toLowerCase().trim();
      const tid = topicFilter.value;
      const wt = wtFilter.value;

      const filtered = questions.filter(q => {
        if (tid && q.topic_id !== tid) return false;
        if (wt && (q.question_type || '').toLowerCase() !== wt.toLowerCase()) return false;
        if (s) {
          const qMatch = (q.question_text || '').toLowerCase().includes(s);
          const aMatch = Array.isArray(q.accepted_answers) && q.accepted_answers.some((a) => String(a).toLowerCase().includes(s));
          if (!qMatch && !aMatch) return false;
        }
        return true;
      });

      document.getElementById('q-tbody').innerHTML = renderQuestionRows(filtered);
      document.getElementById('q-count-badge').textContent = filtered.length;
    };

    searchInput.oninput = applyFilters;
    topicFilter.onchange = applyFilters;
    wtFilter.onchange = applyFilters;

    if (window._filterTopicId) {
      topicFilter.value = window._filterTopicId;
      applyFilters();
      document.getElementById('clear-topic-filter-btn')?.addEventListener('click', () => {
        window._filterTopicId = null;
        window._filterTopicName = null;
        renderCentralQuestionBank(area);
      });
    }

    // Add Question
    document.getElementById('btn-add-question').onclick = () => {
      openQuestionModal(null, { topics, Classes, wordTypes }, async () => {
        await renderCentralQuestionBank(area);
      });
    };

    // Actions Delegation
    document.getElementById('q-tbody').addEventListener('click', async (e) => {
      const editBtn = e.target.closest('.btn-edit-q');
      const delBtn = e.target.closest('.btn-del-q');

      if (editBtn) {
        const qId = editBtn.dataset.id;
        const q = questions.find(item => item.id === qId);
        if (q) {
          openQuestionModal(q, { topics, Classes, wordTypes }, async () => {
            await renderCentralQuestionBank(area);
          });
        }
      } else if (delBtn) {
        const qId = delBtn.dataset.id;
        if (confirm('Delete this question from the question bank?')) {
          showLoading();
          try {
            await deleteCentralQuestion(qId);
            showToast('Question deleted.', 'success');
            await renderCentralQuestionBank(area);
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
    area.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to load questions: ${err.message}</p></div>`;
  }
}

function renderQuestionRows(list) {
  if (!list || !list.length) {
    return `<tr><td colspan="6" class="text-center p-4 text-muted">No questions found. Click "+ Add New Question" to create one.</td></tr>`;
  }
  return list.map(q => {
    const answers = Array.isArray(q.accepted_answers) ? q.accepted_answers : [];
    return `
      <tr>
        <td>
          <span class="badge badge-info" style="font-size:0.8rem;">
            ${escapeHtml(q.topics?.name || 'General')}
          </span>
        </td>
        <td>
          ${q.question_type ? `<span class="badge badge-secondary" style="font-size:0.75rem;">${escapeHtml(q.question_type)}</span>` : '<span class="text-muted">-</span>'}
        </td>
        <td>
          <strong style="color:var(--clr-text-1);font-size:0.95rem;">${escapeHtml(q.question_text)}</strong>
        </td>
        <td>
          <div class="d-flex gap-1 flex-wrap">
            ${answers.map(a => `<span class="badge badge-success" style="font-size:0.8rem;">${escapeHtml(a)}</span>`).join('')}
          </div>
        </td>
        <td>
          <span class="badge ${q.status === 'active' ? 'badge-success' : 'badge-secondary'}" style="font-size:0.75rem;">
            ${escapeHtml(q.status || 'active')}
          </span>
        </td>
        <td style="text-align:right;">
          <button class="btn btn-ghost btn-sm btn-edit-q" data-id="${q.id}" title="Edit Question">&#9999;&#65039;</button>
          <button class="btn btn-ghost btn-sm text-danger btn-del-q" data-id="${q.id}" title="Delete Question">&#128465;&#65039;</button>
        </td>
      </tr>
    `;
  }).join('');
}

function openQuestionModal(question, { topics, Classes, wordTypes }, onSaved) {
  const isEdit = !!question;
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';

  const currentAnswers = Array.isArray(question?.accepted_answers)
    ? question.accepted_answers.join('; ')
    : (question?.accepted_answers || '');

  modal.innerHTML = `
    <div class="modal-content" style="max-width:560px;">
      <div class="modal-header d-flex justify-between align-center p-3" style="border-bottom:1px solid var(--clr-border);">
        <h3 class="modal-title" style="margin:0;font-size:1.2rem;">${isEdit ? 'Edit Question' : 'Add Question to Bank'}</h3>
        <button class="btn btn-ghost btn-sm" id="close-q-modal" style="font-size:1.2rem;">&times;</button>
      </div>
      <div class="modal-body p-4">
        <div class="form-group mb-3">
          <label class="form-label">Class *</label>
          <select class="form-control" id="modal-q-Class">
            ${Classes.map(s => `
              <option value="${s.id}" ${question?.class_id === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>
            `).join('')}
          </select>
        </div>
        <div class="form-group mb-3">
          <label class="form-label">Topic *</label>
          <select class="form-control" id="modal-q-topic">
            ${topics.map(t => `
              <option value="${t.id}" ${question?.topic_id === t.id ? 'selected' : ''}>${escapeHtml(t.name)}</option>
            `).join('')}
          </select>
        </div>
        <div class="form-group mb-3">
          <label class="form-label">Word Type (e.g. Noun, Verb, Adjective)</label>
          <input list="word-types-datalist" class="form-control" id="modal-q-wordtype" value="${escapeHtml(question?.question_type || '')}" placeholder="Select or type word type" />
          <datalist id="word-types-datalist">
            ${wordTypes.map(wt => `<option value="${escapeHtml(wt.name)}">`).join('')}
          </datalist>
        </div>
        <div class="form-group mb-3">
          <label class="form-label">Question Text *</label>
          <textarea class="form-control" id="modal-q-text" rows="3" placeholder="Enter question prompt" required>${escapeHtml(question?.question_text || '')}</textarea>
        </div>
        <div class="form-group mb-3">
          <label class="form-label">Accepted Answers (Separate multiple valid answers with ; or /) *</label>
          <input type="text" class="form-control" id="modal-q-answers" value="${escapeHtml(currentAnswers)}" placeholder="e.g. cook; prepare; make" required />
          <small class="text-muted" style="font-size:0.75rem;">Students submitting any of these answers will receive full credit.</small>
        </div>
        <div class="form-group mb-4">
          <label class="form-label">Status</label>
          <select class="form-control" id="modal-q-status">
            <option value="active" ${question?.status === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" ${question?.status === 'inactive' ? 'selected' : ''}>Inactive</option>
          </select>
        </div>
        <div class="d-flex justify-end gap-2">
          <button class="btn btn-secondary btn-sm" id="cancel-q-btn">Cancel</button>
          <button class="btn btn-primary btn-sm" id="save-q-btn">${isEdit ? 'Save Changes' : 'Add Question'}</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('#close-q-modal').onclick = close;
  modal.querySelector('#cancel-q-btn').onclick = close;

  modal.querySelector('#save-q-btn').onclick = async () => {
    const ClassId = modal.querySelector('#modal-q-Class').value;
    const topicId = modal.querySelector('#modal-q-topic').value;
    const wordType = modal.querySelector('#modal-q-wordtype').value.trim();
    const questionText = modal.querySelector('#modal-q-text').value.trim();
    const answersRaw = modal.querySelector('#modal-q-answers').value.trim();
    const status = modal.querySelector('#modal-q-status').value;

    if (!questionText || !answersRaw) {
      showToast('Please provide both question text and at least one accepted answer.', 'warning');
      return;
    }

    const answersArray = answersRaw.split(/[;/|]/).map(s => s.trim()).filter(Boolean);

    try {
      showLoading();
      if (isEdit) {
        await updateCentralQuestion(question.id, {
          class_id: ClassId,
          topic_id: topicId,
          question_type: wordType || null,
          question_text: questionText,
          accepted_answers: answersArray,
          status
        });
        showToast('Question updated.', 'success');
      } else {
        await createCentralQuestion({
          class_id: ClassId,
          topic_id: topicId,
          question_type: wordType || null,
          question_text: questionText,
          accepted_answers: answersArray,
          status
        });
        showToast('Question added to bank.', 'success');
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
// 4. ASSIGNMENTS MANAGEMENT
// ============================================================
export async function renderAssignments(area) {
  showLoading();
  try {
    const [instances, definitions, batches, classInsts, classes] = await Promise.all([
      fetchAssessmentInstances(),
      fetchAssessmentDefinitions(),
      adminFetchAll('batches'),
      fetchClassInstances(),
      fetchClasses()
    ]);
    hideLoading();

    area.innerHTML = `
      <div class="section-header d-flex justify-between align-center flex-wrap gap-3 mb-4">
        <div>
          <h2 class="section-title text-gradient">Assessment Assignments</h2>
          <p class="section-subtitle">Control assessment access by Batch (Class Instance)</p>
        </div>
        <div>
          <button class="btn btn-primary btn-sm" id="btn-assign-assessment">+ New Assignment</button>
        </div>
      </div>

      <div class="table-responsive card" style="background:rgba(255,255,255,0.02);border:1px solid var(--clr-border);">
        <table class="data-table">
          <thead>
            <tr>
              <th>Assessment</th>
              <th>Type</th>
              <th>Assigned Target</th>
              <th>Availability Window</th>
              <th>Status</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody id="assignments-tbody">
            ${renderAssignmentRows(instances)}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('btn-assign-assessment').onclick = () => {
      openAssignmentModal({ definitions, batches: (batches || []).filter(b => !b.deleted_at && b.is_active !== false), classInsts, classes }, async () => {
        await renderAssignments(area);
      });
    };

    document.getElementById('assignments-tbody').addEventListener('click', async (e) => {
      const delBtn = e.target.closest('.btn-revoke-assignment');
      if (delBtn) {
        const id = delBtn.dataset.id;
        if (confirm('Revoke this assessment assignment?')) {
          showLoading();
          try {
            await adminSoftDelete('assignments', id);
            showToast('Assignment revoked.', 'success');
            await renderAssignments(area);
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
    area.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to load assignments: ${err.message}</p></div>`;
  }
}

function renderAssignmentRows(list) {
  if (!list || !list.length) {
    return `<tr><td colspan="6" class="text-center p-4 text-muted">No active assignments. Click "+ New Assignment" to assign an assessment.</td></tr>`;
  }
  return list.map(a => {
    const targetName = a.batches?.name
      ? `&#128101; Batch: ${escapeHtml(a.batches.name)}`
      : (a.students?.name ? `&#128104;&#8205;&#127891; Student: ${escapeHtml(a.students.name)}` : `&#128101; Unknown Target`);

    const windowText = (a.availability_start || a.availability_end)
      ? `${a.availability_start ? new Date(a.availability_start).toLocaleDateString() : 'Now'} &rarr; ${a.availability_end ? new Date(a.availability_end).toLocaleDateString() : 'Forever'}`
      : '<span class="text-success">Always Open</span>';

    return `
      <tr>
        <td><strong>${escapeHtml(a.title_override || a.assessments?.title || 'Assessment')}</strong></td>
        <td><span class="badge badge-info">${escapeHtml(a.assessments?.assessment_type || 'EVALUATION')}</span></td>
        <td>${targetName}</td>
        <td><small>${windowText}</small></td>
        <td><span class="badge badge-success">${escapeHtml(a.status || 'DRAFT')}</span></td>
        <td style="text-align:right;">
          <button class="btn btn-ghost btn-sm text-danger btn-revoke-assignment" data-id="${a.id}" title="Revoke Assignment">&#128465;&#65039; Revoke</button>
        </td>
      </tr>
    `;
  }).join('');
}

function openAssignmentModal({ definitions, batches, classInsts, classes }, onSaved) {
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.innerHTML = `
    <div class="modal-content" style="max-width:500px;">
      <div class="modal-header d-flex justify-between align-center p-3" style="border-bottom:1px solid var(--clr-border);">
        <h3 class="modal-title" style="margin:0;font-size:1.2rem;">Assign Assessment</h3>
        <button class="btn btn-ghost btn-sm" id="close-asgn-modal" style="font-size:1.2rem;">&times;</button>
      </div>
      <div class="modal-body p-4">
        <div class="form-group mb-3">
          <label class="form-label">Select Assessment *</label>
          <select class="form-control" id="asgn-assessment-id">
            ${definitions.map(a => `<option value="${a.id}" data-class="${a.class_id}">${escapeHtml(a.title)} (${escapeHtml(a.category)})</option>`).join('')}
          </select>
        </div>
        <div class="form-group mb-3">
          <label class="form-label">Assignment Mode *</label>
          <select class="form-control" id="asgn-mode">
            <option value="BATCH">Batch (Class Instance)</option>
          </select>
        </div>
        <div class="form-group mb-3" id="asgn-batch-group">
          <label class="form-label">Select Batch *</label>
          <select class="form-control" id="asgn-batch-id">
            ${(batches || []).filter(b => !b.deleted_at && b.is_active !== false).map(b => `<option value="${b.id}">${escapeHtml(b.name)}</option>`).join('')}
          </select>
          <small class="text-muted text-xs">Note: A Class Instance must exist for the selected Batch and the Assessment's Class.</small>
        </div>
        <div class="form-group mb-3">
          <label class="form-label">Availability Start (Optional)</label>
          <input type="datetime-local" class="form-control" id="asgn-start" />
        </div>
        <div class="form-group mb-4">
          <label class="form-label">Availability End (Optional)</label>
          <input type="datetime-local" class="form-control" id="asgn-end" />
        </div>
        <div class="d-flex justify-end gap-2">
          <button class="btn btn-secondary btn-sm" id="cancel-asgn-btn">Cancel</button>
          <button class="btn btn-primary btn-sm" id="save-asgn-btn">Save Assignment</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.remove();
  modal.querySelector('#close-asgn-modal').onclick = close;
  modal.querySelector('#cancel-asgn-btn').onclick = close;

  modal.querySelector('#save-asgn-btn').onclick = async () => {
    const asmSelect = modal.querySelector('#asgn-assessment-id');
    const definitionId = asmSelect.value;
    const classId = asmSelect.options[asmSelect.selectedIndex]?.dataset.class;
    const batchId = modal.querySelector('#asgn-batch-id').value;
    const startVal = modal.querySelector('#asgn-start').value;
    const endVal = modal.querySelector('#asgn-end').value;

    const ci = classInsts.find(c => c.batch_id === batchId && c.class_id === classId);
    if (!ci) {
      showToast('No Class Instance found for this Batch and the Assessment\'s Class. Please assign this batch to the class first.', 'error');
      return;
    }

    showLoading();
    try {
      await createAssessmentInstance({
        batch_id: batchId,
        assessment_id: definitionId,
        assignment_type: 'BATCH',
        availability_start: startVal ? new Date(startVal).toISOString() : null,
        availability_end: endVal ? new Date(endVal).toISOString() : null,
        status: 'active'
      });
      showToast('Assignment created.', 'success');
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
// 5. QUESTION BANK EXCEL IMPORT (V1 Safe Workflow)
// ============================================================
export async function renderCentralQuestionImport(area) {
  showLoading('Loading import environment...');
  try {
    const [Classes, existingQuestions, validWordTypes, existingTopics] = await Promise.all([
      fetchGlobalClasses(),
      fetchCentralQuestions(),
      fetchWordTypes(),
      fetchTopics()
    ]);
    hideLoading();

    area.innerHTML = `
      <div class="section-header d-flex justify-between align-center flex-wrap gap-3 mb-4">
        <div>
          <h2 class="section-title text-gradient">Import Questions to Central Bank (V1)</h2>
          <p class="section-subtitle">Batch import vocabulary and questions using Excel</p>
        </div>
        <div>
          <button class="btn btn-secondary btn-sm" id="btn-download-central-tmpl">&#128229; Download Excel Template</button>
        </div>
      </div>

      <!-- STEP 1: UPLOAD BOX -->
      <div class="card p-4 mb-4" id="import-upload-card" style="background:rgba(255,255,255,0.02);border:1px solid var(--clr-border);">
        <div class="form-grid mb-3">
          <div class="form-group mb-3">
            <label class="form-label">Target Class *</label>
            <select class="form-control" id="import-target-Class" style="max-width:360px;">
              ${Classes.map(s => `<option value="${s.id}">${escapeHtml(s.name)}${s.institutions?.name ? ` (${escapeHtml(s.institutions.name)})` : ''}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="drop-zone p-5 text-center rounded" id="question-drop-zone" style="border:2px dashed var(--clr-border);cursor:pointer;background:rgba(255,255,255,0.01);transition:all 0.2s;">
          <div style="font-size:2.8rem;margin-bottom:0.75rem;">&#128209;</div>
          <h3 style="font-size:1.1rem;margin-bottom:0.5rem;">Click to select Excel file or drag &amp; drop</h3>
          <p class="text-muted text-xs mb-3">Accepts .xlsx, .xls, .csv with columns: <strong>Topic | Word Type | Question | Answer</strong></p>
          <input type="file" id="central-excel-file-input" accept=".xlsx,.xls,.csv" style="display:none;" />
          <button class="btn btn-primary btn-sm" id="btn-browse-excel" type="button">Browse Computer</button>
        </div>
      </div>

      <!-- STEP 2: PREVIEW CARD (Hidden until file selected) -->
      <div class="card p-4 mb-4 hidden" id="import-preview-card" style="background:rgba(255,255,255,0.02);border:1px solid var(--clr-border);">
        <div class="d-flex justify-between align-center flex-wrap gap-3 mb-4">
          <div>
            <h3 class="m-0" style="font-size:1.2rem;">Import Preview &amp; Verification</h3>
            <p class="text-muted text-xs m-0" id="preview-file-name">filename.xlsx</p>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-secondary btn-sm" id="btn-cancel-preview">Cancel / Choose Another File</button>
            <button class="btn btn-success btn-sm" id="btn-confirm-commit-import">&#128640; Confirm &amp; Commit Import</button>
          </div>
        </div>

        <!-- Summary KPI Row -->
        <div class="d-flex gap-3 flex-wrap mb-4" id="import-kpi-row">
          <!-- KPI Cards Injected Here -->
        </div>

        <!-- Warning Notice if Duplicates or Word Type Warnings exist -->
        <div id="import-alerts-container"></div>

        <!-- Data Preview Table -->
        <div class="table-responsive" style="max-height:480px;overflow-y:auto;border:1px solid var(--clr-border);border-radius:8px;">
          <table class="data-table" style="font-size:0.85rem;">
            <thead>
              <tr>
                <th style="width:50px;">Row</th>
                <th style="width:130px;">Topic</th>
                <th style="width:120px;">Word Type</th>
                <th>Question</th>
                <th>Accepted Answers</th>
                <th style="width:180px;">Status / Match</th>
                <th style="width:140px;text-align:right;">Action</th>
              </tr>
            </thead>
            <tbody id="import-preview-tbody">
              <!-- Rows Injected Here -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    // 1. Download Template
    document.getElementById('btn-download-central-tmpl').onclick = () => {
      if (typeof XLSX === 'undefined') {
        showToast('SheetJS is not loaded.', 'error');
        return;
      }
      const data = [
        { "Topic": "Food", "Word Type": "Verb", "Question": "Memasak", "Answer": "cook / prepare" },
        { "Topic": "Food", "Word Type": "Noun", "Question": "Makanan", "Answer": "food / meal" },
        { "Topic": "Daily Activity", "Word Type": "Verb", "Question": "Bangun tidur", "Answer": "wake up / get up" },
        { "Topic": "Travel", "Word Type": "Noun", "Question": "Bandara", "Answer": "airport" },
        { "Topic": "Description", "Word Type": "Adjective", "Question": "Ramah", "Answer": "friendly / hospitable" }
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Vocabulary_Bank");
      XLSX.writeFile(wb, "Central_Question_Bank_Template.xlsx");
    };

    // 2. File Selection & Drag-Drop
    const fileInput = document.getElementById('central-excel-file-input');
    const dropZone = document.getElementById('question-drop-zone');
    const uploadCard = document.getElementById('import-upload-card');
    const previewCard = document.getElementById('import-preview-card');
    const browseBtn = document.getElementById('btn-browse-excel');

    browseBtn.onclick = (e) => { e.stopPropagation(); fileInput.click(); };
    dropZone.onclick = () => fileInput.click();

    dropZone.ondragover = (e) => { e.preventDefault(); dropZone.style.borderColor = 'var(--clr-primary)'; };
    dropZone.ondragleave = () => { dropZone.style.borderColor = 'var(--clr-border)'; };
    dropZone.ondrop = (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'var(--clr-border)';
      if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    };

    fileInput.onchange = () => {
      if (fileInput.files.length) handleFile(fileInput.files[0]);
    };

    document.getElementById('btn-cancel-preview').onclick = () => {
      previewCard.classList.add('hidden');
      uploadCard.classList.remove('hidden');
      fileInput.value = '';
    };

    let currentParsedResult = null;

    async function handleFile(file) {
      if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
        showToast('Please select a valid Excel file (.xlsx, .xls, or .csv).', 'warning');
        return;
      }
      showLoading(`Parsing ${file.name}...`);
      try {
        const buffer = await file.arrayBuffer();
        const { rows, rawHeaders } = parseExcelWorkbook(buffer);
        if (!rows.length) {
          throw new Error('The uploaded file does not contain any valid data rows.');
        }

        const parsed = processCentralBankQuestionImport(rows, {
          existingQuestions,
          validWordTypes
        });

        currentParsedResult = parsed;
        currentParsedResult.file = file;

        hideLoading();
        uploadCard.classList.add('hidden');
        previewCard.classList.remove('hidden');
        document.getElementById('preview-file-name').textContent = `${file.name} (${rows.length} rows)`;

        renderPreviewUI(parsed);
      } catch (err) {
        hideLoading();
        showToast(`Failed to parse file: ${err.message}`, 'error');
      }
    }

    function renderPreviewUI(parsed) {
      const summary = parsed.summary;

      // Summary KPIs
      document.getElementById('import-kpi-row').innerHTML = `
        <div class="card p-3" style="flex:1;min-width:130px;background:rgba(255,255,255,0.03);border:1px solid var(--clr-border);text-align:center;">
          <div style="font-size:1.4rem;font-weight:800;color:var(--clr-success);">${summary.newQuestions}</div>
          <div class="text-xs text-muted">New Questions</div>
        </div>
        <div class="card p-3" style="flex:1;min-width:130px;background:rgba(255,255,255,0.03);border:1px solid var(--clr-border);text-align:center;">
          <div style="font-size:1.4rem;font-weight:800;color:var(--clr-info);">${summary.existingQuestions}</div>
          <div class="text-xs text-muted">Exact Matches (Preserved)</div>
        </div>
        <div class="card p-3" style="flex:1;min-width:130px;background:rgba(255,255,255,0.03);border:1px solid var(--clr-border);text-align:center;">
          <div style="font-size:1.4rem;font-weight:800;color:#eab308;">${summary.answerChanges}</div>
          <div class="text-xs text-muted">Answer Updates</div>
        </div>
        <div class="card p-3" style="flex:1;min-width:130px;background:rgba(255,255,255,0.03);border:1px solid var(--clr-border);text-align:center;">
          <div style="font-size:1.4rem;font-weight:800;color:#f97316;">${summary.possibleDuplicates}</div>
          <div class="text-xs text-muted">Possible Duplicates</div>
        </div>
        <div class="card p-3" style="flex:1;min-width:130px;background:rgba(255,255,255,0.03);border:1px solid var(--clr-border);text-align:center;">
          <div style="font-size:1.4rem;font-weight:800;color:${summary.invalidWordTypes > 0 ? '#ef4444' : 'var(--clr-text-muted)'};">${summary.invalidWordTypes}</div>
          <div class="text-xs text-muted">Word Type Suggestions</div>
        </div>
      `;

      // Warning Alerts
      let alertHtml = '';
      if (summary.possibleDuplicates > 0) {
        alertHtml += `
          <div class="alert alert-warning p-3 mb-3 text-xs" style="background:rgba(249,115,22,0.1);border:1px solid rgba(249,115,22,0.3);border-radius:8px;">
            &#9888;&#65039; <strong>${summary.possibleDuplicates} Possible Duplicate(s) Found:</strong> High similarity detected. Review the comparisons below and choose whether to <em>Use Existing</em> or <em>Create New</em>.
          </div>
        `;
      }
      if (summary.invalidWordTypes > 0) {
        alertHtml += `
          <div class="alert alert-info p-3 mb-3 text-xs" style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);border-radius:8px;">
            &#128161; <strong>${summary.invalidWordTypes} Word Type Suggestion(s):</strong> Non-standard word types detected. Suggested standard types have been applied, or you can register them as custom types.
          </div>
        `;
      }
      document.getElementById('import-alerts-container').innerHTML = alertHtml;

      // Render Rows
      const tbody = document.getElementById('import-preview-tbody');
      tbody.innerHTML = parsed.rows.map((r, idx) => {
        let statusBadge = '';
        let actionCol = '';

        if (r.duplicateStatus === 'EXACT_DUPLICATE') {
          statusBadge = `<span class="badge badge-info">Exact Match</span>`;
          if (r.answerKeyChanged) {
            statusBadge += `<br/><span class="badge badge-warning mt-1" title="Existing: ${escapeHtml(r.existingAnswers.join(' / '))} -> New: ${escapeHtml(r.accepted_answers.join(' / '))}">&#9889; Answer Update</span>`;
          }
          actionCol = `
            <select class="form-control form-control-sm row-action-choice" data-idx="${idx}">
              <option value="USE_EXISTING" ${r.actionChoice === 'USE_EXISTING' ? 'selected' : ''}>Use Existing ID</option>
              <option value="SKIP" ${r.actionChoice === 'SKIP' ? 'selected' : ''}>Skip Row</option>
            </select>
          `;
        } else if (r.duplicateStatus === 'POSSIBLE_DUPLICATE') {
          statusBadge = `<span class="badge" style="background:#f97316;color:#fff;">Duplicate? (${r.similarityPct}%)</span>`;
          actionCol = `
            <select class="form-control form-control-sm row-action-choice" data-idx="${idx}">
              <option value="CREATE_NEW" ${r.actionChoice === 'CREATE_NEW' ? 'selected' : ''}>Create New</option>
              <option value="USE_EXISTING" ${r.actionChoice === 'USE_EXISTING' ? 'selected' : ''}>Use Existing</option>
              <option value="SKIP" ${r.actionChoice === 'SKIP' ? 'selected' : ''}>Skip</option>
            </select>
          `;
        } else {
          statusBadge = `<span class="badge badge-success">New Question</span>`;
          actionCol = `<span class="text-muted text-xs">Will Insert</span>`;
        }

        let qDisplay = `<div><strong>${escapeHtml(r.question_text)}</strong></div>`;
        if (r.duplicateStatus === 'POSSIBLE_DUPLICATE' && r.existingQuestionText) {
          qDisplay += `<div class="text-muted text-xs mt-1" style="font-style:italic;">Existing: "${escapeHtml(r.existingQuestionText)}"</div>`;
        }

        let wtDisplay = escapeHtml(r.wordType || '-');
        if (r.wordTypeWarning) {
          wtDisplay += `<div class="text-danger text-xs mt-1" title="${escapeHtml(r.wordTypeWarning)}">&#9888;&#65039; ${escapeHtml(r.wordTypeWarning)}</div>`;
        }

        return `
          <tr>
            <td>${r.rowIndex}</td>
            <td><span class="badge badge-neutral">${escapeHtml(r.topicName)}</span></td>
            <td>${wtDisplay}</td>
            <td>${qDisplay}</td>
            <td><code>${escapeHtml(r.accepted_answers.join(' / '))}</code></td>
            <td>${statusBadge}</td>
            <td style="text-align:right;">${actionCol}</td>
          </tr>
        `;
      }).join('');

      // Wire up action choice dropdowns
      tbody.querySelectorAll('.row-action-choice').forEach(sel => {
        sel.onchange = () => {
          const idx = parseInt(sel.dataset.idx, 10);
          parsed.rows[idx].actionChoice = sel.value;
        };
      });
    }

    // 3. Confirm & Commit Import
    document.getElementById('btn-confirm-commit-import').onclick = async () => {
      if (!currentParsedResult || !currentParsedResult.rows.length) return;

      const targetClassId = document.getElementById('import-target-Class').value;
      const rows = currentParsedResult.rows;

      const confirmMsg = `Are you sure you want to commit this import?
&bull; ${currentParsedResult.summary.newQuestions} new questions will be added
&bull; ${currentParsedResult.summary.answerChanges} answer keys will be updated
Existing historical attempt records will NOT be modified.`;

      if (!confirm(confirmMsg)) return;

      showLoading('Committing import to Question Bank...');
      try {
        const sb = await (await import('../supabase.js?v=5.3.2')).getSupabase();

        // PHASE 1: ROBUST TOPIC PRE-FETCHING & NORMALIZATION
        const { data: dbTopics } = await sb.from('topics').select('id, name');
        const topicDictionary = {};
        if (dbTopics) {
            dbTopics.forEach(t => {
                // Normalize: lowercase and remove leading/trailing spaces
                const normalizedDBName = t.name.trim().toLowerCase();
                topicDictionary[normalizedDBName] = t.id;
            });
        }

        let newTopicsCount = 0;

        // 1B: QUESTION PRE-FETCHING FOR DEDUPLICATION
        const { data: dbQuestions } = await sb.from('questions').select('id, question_text, topic_id');
        const questionSet = new Set();
        if (dbQuestions) {
            dbQuestions.forEach(q => {
                if (q.question_text && q.topic_id) {
                    const normQ = q.question_text.trim().toLowerCase();
                    questionSet.add(`${normQ}_${q.topic_id}`);
                }
            });
        }

        // 2. Auto-register any new custom Word Types
        const customWordTypesToRegister = Array.from(new Set(
          rows.filter(r => r.wordType && !validWordTypes.some(v => (v.name || v).toLowerCase() === r.wordType.toLowerCase()))
            .map(r => r.wordType.trim())
        ));
        for (const cwt of customWordTypesToRegister) {
          try {
            await sb.from('question_types').insert({ name: cwt, is_system: false, is_active: true });
          } catch (_) { }
        }

        // 3. Commit Question Updates and Inserts
        let insertedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        const questionsToInsert = [];

        // Grab the active topic_id from UI context
        const activeUiTopicId = document.getElementById('q-topic-filter')?.value || window._filterTopicId;
        const baseOrder = Math.floor(Math.random() * 999999);
        const isValidUUID = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
        
        let safeClassId = window.currentClassId || targetClassId || null;
        if (safeClassId && !isValidUUID(safeClassId)) safeClassId = null;

        for (const [idx, row] of rows.entries()) {
          if (row.actionChoice === 'SKIP') {
            skippedCount++;
            continue;
          }

          // 1. Extract and Normalize Topic
          // row.topicName is pre-resolved by processCentralBankQuestionImport (handles VOCAB_MASTERY's Class column too)
          const rawTopic = row.topicName || row.Topic || row.TOPIC || row.topic || row['Topic Name'] || row.topicName || '';
          const normalizedExcelTopic = rawTopic.trim().toLowerCase();
          let finalTopicId = null; 
          
          if (normalizedExcelTopic !== '') {
              if (topicDictionary[normalizedExcelTopic]) {
                  finalTopicId = topicDictionary[normalizedExcelTopic];
              } else {
                  // Topic doesn't exist, AUTO-CREATE IT!
                  try {
                      const { data: newTopic, error: createErr } = await sb
                          .from('topics')
                          .insert([{ 
                              name: rawTopic.trim(),
                              class_id: safeClassId
                          }])
                          .select('id')
                          .single();
          
                      if (newTopic) {
                          finalTopicId = newTopic.id;
                          topicDictionary[normalizedExcelTopic] = newTopic.id; // Cache it so we don't duplicate
                          newTopicsCount++;
                          console.log(`Auto-created missing topic: "${rawTopic.trim()}"`);
                      } else if (createErr) {
                          console.warn(`Failed to auto-create topic "${rawTopic.trim()}":`, createErr.message);
                      }
                  } catch (e) {
                      console.error("Topic creation exception:", e);
                  }
              }
          }

          // 2. Extract Word Type — prefer pre-parsed field from processCentralBankQuestionImport
          const finalWordType = row.wordType || row['Word Type'] || row.WordType || row.WORD_TYPE || row.word_type || row.question_type || '-';

          // 3. Extract Question Text — prefer pre-parsed field (handles VOCAB_MASTERY LEXICAL_ITEM)
          const finalQuestionText = row.question_text || row.Question || row.QUESTION || row.question || 'Empty Question';

          // 4. Extract Answers — prefer pre-parsed accepted_answers array (handles VOCAB_MASTERY DEFINITION)
          let finalAnswerArray = [];
          if (Array.isArray(row.accepted_answers) && row.accepted_answers.length > 0) {
              finalAnswerArray = row.accepted_answers;
          } else {
              const rawAnswer = row['Accepted Answers'] || row.ACCEPTED_ANSWERS || row.accepted_answers || row.Answers || row.correct_answer || row.answer || '';
              if (typeof rawAnswer === 'string') {
                  finalAnswerArray = rawAnswer.split(/[;/|]/).map(a => a.trim()).filter(a => a !== '');
              } else if (Array.isArray(rawAnswer)) {
                  finalAnswerArray = rawAnswer;
              }
          }
          
          const safeAnswer = finalAnswerArray.length > 0 ? JSON.stringify(finalAnswerArray) : '[]';

          if (row.duplicateStatus === 'EXACT_DUPLICATE' && row.actionChoice === 'USE_EXISTING') {
            if (row.answerKeyChanged && row.duplicateOfId) {
              try {
                // FOR UPDATES (Existing Questions PATCH)
                const updatePayload = {
                    question_type: finalWordType,
                    accepted_answers: finalAnswerArray,
                    topic_id: finalTopicId,
                    correct_answer: safeAnswer
                };
                
                const { error: updErr } = await sb.from('questions')
                  .update(updatePayload)
                  .eq('id', row.duplicateOfId);
                if (updErr) throw updErr;
                updatedCount++;
              } catch (updCatch) {
                console.error("Failed to update answer key (PATCH):", updCatch.message);
              }
            } else {
              skippedCount++;
            }
          } else if (row.duplicateStatus === 'POSSIBLE_DUPLICATE' && row.actionChoice === 'USE_EXISTING') {
            skippedCount++;
          } else {
            // FOR INSERTS (New Questions)
            const normFinalQ = finalQuestionText.trim().toLowerCase();
            const dedupeKey = `${normFinalQ}_${finalTopicId}`;

            if (questionSet.has(dedupeKey)) {
                // Skip if duplicate exists in the same topic
                skippedCount++;
            } else {
                const insertPayload = {
                    question_order: baseOrder + idx,
                    question_text: finalQuestionText,
                    question_type: finalWordType, 
                    answer_type: row.answer_type || 'written', // Keep constraint fallback
                    accepted_answers: finalAnswerArray, 
                    correct_answer: safeAnswer,
                    topic_id: finalTopicId,
                    class_id: safeClassId,
                    status: 'ACTIVE'
                };
                questionsToInsert.push(insertPayload);
                questionSet.add(dedupeKey); // Add to set to prevent in-sheet duplicates
            }
          }
        }

        // PHASE 4: THE BULK INSERT
        if (questionsToInsert.length > 0) {
          // Batch in chunks of 100 for safety
          const chunkSize = 100;
          for (let i = 0; i < questionsToInsert.length; i += chunkSize) {
            const chunk = questionsToInsert.slice(i, i + chunkSize);
            try {
              const { error: insErr } = await sb.from('questions').insert(chunk);
              if (insErr) {
                console.error("Final Insert Error:", insErr);
                showToast(insErr.message, 'error');
                throw insErr;
              }
              insertedCount += chunk.length;
            } catch (err) {
              // Caught and toasted above, throw to abort import flow
              throw err;
            }
          }
        }

        clearAdminCache('questions');
        clearAdminCache('topics');

        hideLoading();
        showToast(`Import Complete! ${insertedCount} new questions inserted. ${skippedCount} duplicates skipped. ${newTopicsCount} new topics created.`, 'success');

        // Redirect to Question Bank table
        if (window.loadSection) {
          window.loadSection('questions');
        }
      } catch (err) {
        hideLoading();
        showToast(`Failed during commit: ${err.message}`, 'error');
      }
    };

  } catch (err) {
    hideLoading();
    area.innerHTML = `<div class="empty-state"><p class="text-danger">Failed to load import screen: ${err.message}</p></div>`;
  }
}




export async function renderResults(area) {
  const [rawData, allInstitutions, allPrograms, allBatches] = await Promise.all([
    adminFetchAll('attempts', '*, students(name, gender, batch_id, batches(name), program_id, programs(name, institution_id, institutions(name))), assessments(id, title, assessment_type, prerequisite_assessment_id, prerequisite_min_score, shell_code), attempt_answers(id, evaluation_result, score)'),
    adminFetchAll('institutions'),
    adminFetchAll('programs'),
    adminFetchAll('batches')
  ]);

  // Precalculate student best scores per assessment for prerequisite checking and highest score logic
  const studentBestScoreMap = new Map();
  rawData.forEach(r => {
    if (!['submitted', 'auto_submitted'].includes(r.status)) return;
    const defId = r.assessments?.id;
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
  if (window._filterAssessmentResults) {
    allData = allData.filter(r => r.assessments?.id === window._filterAssessmentResults);
  }

  let selectedProg = '';
  let selectedClass = '';
  let selectedBatch = '';
  let searchQuery = '';
  let currentDeduplicatedResults = [];

  area.innerHTML = `
        <div class="section-header d-flex justify-between align-center flex-wrap gap-2">
          <div>
            <h2 class="section-title">Assessment Results <span class="count-chip" id="res-count-chip">${allData.length} Total</span></h2>
            <p class="section-subtitle">Student assessment attempt submissions displaying highest score records and prerequisite status</p>
          </div>
          <div>
            <button class="btn btn-secondary btn-sm" id="export-gradebook-btn" style="display:inline-flex;align-items:center;gap:6px;font-weight:600;">
              &#128202; Export Gradebook (.xlsx)
            </button>
          </div>
        </div>

        ${window._filterAssessmentResults ? `
          <div class="mb-3 p-2 rounded d-flex align-center justify-between" style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);color:#93c5fd;font-size:0.85rem;">
            <span>&#9889; Filtered Results for Selected Assessment (${allData.length} attempts)</span>
            <button class="btn btn-ghost btn-xs" id="clear-Assessment-results-btn" style="text-decoration:underline;color:#93c5fd;">Show All Assessment Results</button>
          </div>
        ` : ''}

        <!-- Filter Bar -->
        <div class="filter-bar mb-4 p-3 rounded d-flex gap-3 align-center flex-wrap" style="background:var(--clr-surface-2);border:1px solid var(--clr-border);">
          <div style="min-width:180px;">
            <label class="text-xs text-muted d-block mb-1">Filter Program</label>
            <select id="res-filter-prog" class="form-control" style="padding:6px 10px;font-size:0.85rem;">
              <option value="">&mdash; All Institutions &mdash;</option>
              ${(allInstitutions || []).filter(p => !p.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
            </select>
          </div>

          <div style="min-width:180px;">
            <label class="text-xs text-muted d-block mb-1">Filter Class</label>
            <select id="res-filter-class" class="form-control" style="padding:6px 10px;font-size:0.85rem;">
              <option value="">&mdash; All Programs &mdash;</option>
              ${(allPrograms || []).filter(c => !c.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(c => `<option value="${c.id}" data-inst="${c.institution_id}">${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>

          <div style="min-width:180px;">
            <label class="text-xs text-muted d-block mb-1">Filter Batch (Group)</label>
            <select id="res-filter-batch" class="form-control" style="padding:6px 10px;font-size:0.85rem;">
              <option value="">&mdash; All Batches &mdash;</option>
              ${(allBatches || []).filter(b => !b.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(b => `<option value="${b.id}" data-prog="${b.program_id}">${escapeHtml(b.name)}</option>`).join('')}
            </select>
          </div>

          <div style="flex:1;min-width:220px;">
            <label class="text-xs text-muted d-block mb-1">Search Student / Assessment</label>
            <input type="text" id="res-filter-search" class="form-control" placeholder="Type student name or assessment title&hellip;" style="padding:6px 10px;font-size:0.85rem;">
          </div>

          <div class="d-flex align-end" style="padding-top:18px;">
            <button class="btn btn-ghost btn-sm" id="res-btn-reset" title="Reset all filters">&#10006; Reset</button>
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
        const eTitle = (r.assessments?.title || '').toLowerCase();
        const eType = (r.assessments?.assessment_type || '').toLowerCase();
        if (!sName.includes(q) && !eTitle.includes(q) && !eType.includes(q)) return false;
      }
      return true;
    });

    // Deduplicate by Student + Assessment, keeping highest EFFECTIVE score only.
    // Remedial cap: EXAM/QUIZ remedial attempts are capped at 70% effective score.
    const getEffectivePct = (r) => {
      const rawPct = parseFloat(r.percentage || 0);
      const def = r.assessments || {};
      const isSummative = (def.assessment_type === 'EXAM' || def.assessment_type === 'QUIZ');
      if (r.is_remedial_unlocked && isSummative && rawPct > 70) return 70;
      return rawPct;
    };
    const mergedResults = new Map();
    filtered.forEach(r => {
      const key = `${r.student_id}_${r.assessments?.id}`;
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
      pageSize: 20,
      searchKeys: ['students.name', 'assessments.title', 'assessments.shell_code', 'assessments.assessment_type', 'students.programs.name', 'students.programs.institutions.name'],
      columns: [
        { key: 'students.name', label: 'Student Name', sortable: true, render: (v, r) => `<span class="fw-600" style="color:var(--clr-text-1);">${formatStudentName(r.students?.name, r.students?.gender) || '&mdash;'}</span>` },
        { key: 'students.programs.institutions.name', label: 'Program', sortable: true, render: (v, r) => `<span class="text-muted text-sm">${escapeHtml(r.students?.programs?.institutions?.name || '&mdash;')}</span>` },
        { key: 'students.programs.name', label: 'Class', sortable: true, render: (v, r) => `<span class="text-muted text-sm">${escapeHtml(r.students?.programs?.name || '&mdash;')}</span>` },
        { key: 'students.batches.name', label: 'Batch', sortable: true, render: (v, r) => `<span class="badge ${r.students?.batches?.name ? 'badge-info' : 'badge-neutral'}" style="font-size:0.75rem;">${escapeHtml(r.students?.batches?.name || 'Unassigned')}</span>` },
        {
          key: 'assessments.title', label: 'Assessment Title', sortable: true, render: (v, r) => {
            const def = r.assessments || {};
            const codeBadge = def.shell_code ? `<span class="badge" style="font-family:monospace;font-size:0.7rem;background:rgba(56,189,248,0.12);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);margin-right:6px;padding:2px 5px;">${escapeHtml(def.shell_code)}</span>` : '';
            return `<div class="d-flex align-items-center flex-wrap gap-1">${codeBadge}<span class="text-sm fw-600">${def.assessment_type ? escapeHtml(def.assessment_type) + ' &mdash; ' : ''}${escapeHtml(def.title || '&mdash;')}</span></div>`;
          }
        },
        {
          key: 'percentage', label: 'Score', sortable: true, render: (v, r) => {
            const def = r.assessments || {};
            const isSummative = (def.assessment_type === 'EXAM' || def.assessment_type === 'QUIZ');
            const rawPct = parseFloat(r.percentage || 0);
            const isRemedialCapped = r.is_remedial_unlocked && isSummative && rawPct > 70;
            const effectivePct = isRemedialCapped ? 70 : rawPct;
            const effectiveGrade = effectivePct >= 70 ? 'C' : (r.grade || 'F');
            return `
              <div class="text-center fw-700" style="display:flex;flex-direction:column;align-items:center;gap:3px;">
                <div style="display:flex;align-items:center;gap:4px;" class="text-grade-${effectiveGrade}">
                  <span>${effectivePct.toFixed(1)}%</span>
                  <span class="badge badge-success text-xs" style="font-size:0.65rem;padding:1px 5px;" title="Highest score recorded across attempts">Highest</span>
                </div>
                ${isRemedialCapped ? `<span class="badge" style="font-size:0.6rem;padding:1px 6px;background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.4);">&#128282; REMEDIAL CAP APPLIED</span>` : ''}
              </div>
            `;
          }
        },
        { key: 'grade', label: 'Grade', sortable: true, render: (v, r) => {
            const def = r.assessments || {};
            const isSummative = (def.assessment_type === 'EXAM' || def.assessment_type === 'QUIZ');
            const rawPct = parseFloat(r.percentage || 0);
            const isRemedialCapped = r.is_remedial_unlocked && isSummative && rawPct > 70;
            const displayGrade = isRemedialCapped ? 'C' : (r.grade || getGrade(rawPct));
            return `<div class="text-center"><span class="grade-badge grade-${displayGrade}" style="width:30px;height:30px;font-size:0.85rem;">${displayGrade}</span></div>`;
          }
        },
        {
          key: 'prereq', label: 'Prerequisite', sortable: false, render: (v, r) => {
            const def = r.assessments || {};
            const prereqId = def.prerequisite_assessment_id;
            const minScore = Number(def.prerequisite_min_score) || 60;
            if (!prereqId) return '<div class="text-center"><span class="text-muted text-xs">&mdash;</span></div>';
            const studentPrereqBest = studentBestScoreMap.get(`${r.student_id}_${prereqId}`);
            if (studentPrereqBest != null && studentPrereqBest >= minScore) {
              return `<div class="text-center"><span class="badge badge-success text-xs" style="font-size:0.75rem;padding:2px 6px;" title="Prerequisite completed (${studentPrereqBest.toFixed(1)}% &ge; ${minScore}%)">Unlocked &#9989;</span></div>`;
            }
            return `<div class="text-center"><span class="badge badge-danger" style="font-size:0.75rem;padding:2px 7px;font-weight:600;display:inline-flex;align-items:center;gap:3px;" title="Prerequisite requirement not completed (Required &ge; ${minScore}%)">Locked &#128274;</span></div>`;
          }
        },
        {
          key: 'correct', label: '&#9989; Correct', sortable: false, render: (v, r) => {
            const answers = r.attempt_answers || [];
            let attCorrect = 0;
            answers.forEach(a => {
              const res = (a.evaluation_result || '').toLowerCase();
              const sc = parseFloat(a.score || 0);
              if (res === 'correct' || sc >= 1) attCorrect++;
            });
            return answers.length > 0 ? `<div class="text-center"><span class="badge badge-success" style="font-size:0.75rem;">${attCorrect}</span></div>` : '<div class="text-center"><span class="text-muted text-xs">&mdash;</span></div>';
          }
        },
        {
          key: 'half', label: '&#9888;&#65039; Half', sortable: false, render: (v, r) => {
            const answers = r.attempt_answers || [];
            let attMinor = 0;
            answers.forEach(a => {
              const res = (a.evaluation_result || '').toLowerCase();
              const sc = parseFloat(a.score || 0);
              if (res.includes('minor') || (sc > 0 && sc < 1)) attMinor++;
            });
            return answers.length > 0 ? `<div class="text-center"><span class="badge badge-warning" style="font-size:0.75rem;">${attMinor}</span></div>` : '<div class="text-center"><span class="text-muted text-xs">&mdash;</span></div>';
          }
        },
        {
          key: 'wrong', label: '&#10060; Incorrect', sortable: false, render: (v, r) => {
            const answers = r.attempt_answers || [];
            let attWrong = 0;
            answers.forEach(a => {
              const res = (a.evaluation_result || '').toLowerCase();
              const sc = parseFloat(a.score || 0);
              if (res !== 'correct' && sc < 1 && !res.includes('minor') && !(sc > 0 && sc < 1)) attWrong++;
            });
            return answers.length > 0 ? `<div class="text-center"><span class="badge badge-danger" style="font-size:0.75rem;">${attWrong}</span></div>` : '<div class="text-center"><span class="text-muted text-xs">&mdash;</span></div>';
          }
        },
        { key: 'submitted_at', label: 'Submitted At', sortable: true, render: (v, r) => `<div class="text-center text-muted text-xs">${r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '&mdash;'}</div>` },
        { key: 'actions', label: 'Actions', sortable: false, render: (v, r) => {
           let btns = `<button class="btn btn-ghost btn-sm results-view-profile-btn" data-sid="${r.student_id}" style="font-size:0.75rem; padding:3px 10px; display:inline-flex; align-items:center; gap:4px;" title="View full student profile">&#128100; Profile</button>`;
           const def = r.assessments || {};
           const isSummativeType = (def.assessment_type === 'EXAM' || def.assessment_type === 'QUIZ');
           const pct = parseFloat(r.percentage || 0);
           if (isSummativeType && pct < 70 && !r.is_remedial_unlocked) {
               btns += `<button class="btn btn-warning btn-sm remedi-unlock-btn" data-aid="${r.id}" style="font-size:0.75rem; padding:3px 10px;" title="Unlock Remedial Attempt">&#128275; Allow Remedial</button>`;
           }
           return `<div class="text-center d-flex gap-2 justify-center flex-wrap" style="min-width:140px;">${btns}</div>`;
        } }
      ]
    });
  };

  progSelect.addEventListener('change', () => { updateClassOptions(); renderTable(); });
  classSelect.addEventListener('change', () => { updateBatchOptions(); renderTable(); });
  batchSelect.addEventListener('change', renderTable);
  searchInput.addEventListener('input', renderTable);

  document.getElementById('res-btn-reset')?.addEventListener('click', () => {
    window._filterAssessmentResults = null;
    progSelect.value = '';
    classSelect.value = '';
    batchSelect.value = '';
    searchInput.value = '';
    updateClassOptions();
    loadSection('results');
  });

  document.getElementById('clear-Assessment-results-btn')?.addEventListener('click', () => {
    window._filterAssessmentResults = null;
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
      const def = r.assessments || {};
      const rawPct = Number(r.percentage || r.effective_score || 0);
      const isSummative = (def.assessment_type === 'EXAM' || def.assessment_type === 'QUIZ');
      const isRemedialCapped = r.is_remedial_unlocked && isSummative && rawPct > 70;
      const exportPct = isRemedialCapped ? 70 : rawPct;
      const exportGrade = isRemedialCapped ? 'C' : (r.grade || getGrade(rawPct));
      return {
        'Student Name': r.students?.name || '—',
        'Gender': r.students?.gender ? (r.students.gender === 'female' ? 'Female' : 'Male') : '—',
        'Institution': r.students?.programs?.institutions?.name || '—',
        'Program': r.students?.programs?.name || '—',
        'Batch': r.students?.batches?.name || '—',
        'Assessment Title': def.title || '—',
        'Assessment Type': def.assessment_type || '—',
        'Score': r.score != null ? r.score : '—',
        'Raw Percentage (%)': rawPct != null ? `${rawPct}%` : '—',
        'Effective Percentage (%)': `${exportPct}%`,
        'Grade': exportGrade,
        'Remedial Cap Applied': isRemedialCapped ? 'Yes (capped at 70%)' : 'No',
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

  document.getElementById('results-grid-container').addEventListener('click', async e => {
    const remediBtn = e.target.closest('.remedi-unlock-btn');
    if (remediBtn) {
      const attemptId = remediBtn.getAttribute('data-aid');
      if (confirm('Allow this student to retake this Exam as a remedial attempt?')) {
        const { getSupabase } = await import('../supabase.js?v=5.3.2');
        const sb = await getSupabase();
        const { error } = await sb.from('attempts').update({ is_remedial_unlocked: true }).eq('id', attemptId);
        if (!error) {
          // Temporarily imported showToast should be used from scope, we just assume it's available or we use the local DOM alert
          // showToast is imported at top in class.js
          const record = allData.find(x => x.id === attemptId);
          if (record) record.is_remedial_unlocked = true;
          renderTable();
          showToast('Remedial attempt unlocked successfully.', 'success');
        } else {
          showToast('Failed to unlock: ' + error.message, 'error');
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
// STUDENT PROGRESS (Level Progression with Batch Grouping)
// ============================================================

export async function renderProgressView(area) {
  area.innerHTML = `
        <div class="section-header">
          <div>
            <h2 class="section-title">Student Progress <span class="count-chip" id="prog-count-chip">Loading...</span></h2>
            <p class="section-subtitle">Overview of student assessment completion filterable by Program, Class, and Batch</p>
          </div>
        </div>
        <div class="p-5 text-center text-muted"><span class="loader"></span> Loading progression data...</div>
      `;

  try {
    const [allStudents, allInstitutions, allPrograms, allBatches, allAssignments, allAssessments, allAttempts, allLevels] = await Promise.all([
      adminFetchAll('students', '*, batches!batch_id(name, current_level_id, is_active), programs!program_id(name, institution_id, institutions!institution_id(name)), institutions!institution_id(name)'),
      adminFetchAll('institutions'),
      adminFetchAll('programs'),
      adminFetchAll('batches'),
      adminFetchAll('assignments', 'student_id, batch_id, assessment_id'),
      adminFetchAll('assessments', 'id, title, level_id, levels(name, level_number)'),
      adminFetchAll('attempts', 'id, student_id, assessment_id, status, score, total_questions, percentage, grade, created_at, submitted_at'),
      adminFetchAll('levels').catch(() => [])
    ]);

    const allData = [];

    // Map V1 Data
    const assessmentsMap = new Map((allAssessments || []).map(a => [a.id, a]));
    const levelsMap = new Map((allLevels || []).map(l => [l.id, l.name]));

    // Map attempts by student_id for efficient lookup
    const attemptsByStudent = new Map();
    (allAttempts || []).forEach(att => {
      if (!att.student_id) return;
      if (!attemptsByStudent.has(att.student_id)) attemptsByStudent.set(att.student_id, []);
      attemptsByStudent.get(att.student_id).push(att);
    });

    (allStudents || []).filter(s => {
      if (s.deleted_at) return false;
      const bObj = (allBatches || []).find(b => b.id === s.batch_id);
      if (bObj && bObj.deleted_at) return false;
      const pObj = (allPrograms || []).find(p => p.id === s.program_id);
      if (pObj && pObj.deleted_at) return false;
      const iObj = (allInstitutions || []).find(i => i.id === (s.institution_id || pObj?.institution_id));
      if (iObj && iObj.deleted_at) return false;
      return true;
    }).forEach(student => {
      const sAssignments = (allAssignments || []).filter(a =>
        a.student_id === student.id || (a.batch_id && a.batch_id === student.batch_id)
      );

      const studentBatch = allBatches.find(b => b.id === student.batch_id);
      const studentLevelId = student.level_id || studentBatch?.current_level_id;
      
      // Auto-assign assessments based on Level (if batch has a level_id)
      const levelAssesIds = studentLevelId ? (allAssessments || []).filter(a => a.level_id === studentLevelId).map(a => a.id) : [];

      // To avoid duplicates if both student and batch assigned
      const assignedAssesIds = new Set([...sAssignments.map(a => a.assessment_id), ...levelAssesIds]);

      if (assignedAssesIds.size === 0) return; // Skip students with no assessments assigned

      const sAttempts = attemptsByStudent.get(student.id) || [];
      const sAttemptsByAsm = new Map();
      sAttempts.forEach(att => {
        if (!sAttemptsByAsm.has(att.assessment_id)) sAttemptsByAsm.set(att.assessment_id, []);
        sAttemptsByAsm.get(att.assessment_id).push(att);
      });

      let completedCount = 0;
      let inProgressCount = 0;
      const studentDetails = [];

      assignedAssesIds.forEach(assessmentId => {
        const assessment = assessmentsMap.get(assessmentId);
        if (!assessment) return;

        const asmAtts = sAttemptsByAsm.get(assessmentId) || [];
        const isCompleted = asmAtts.some(att => {
          const st = String(att.status || '').toLowerCase();
          return ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st);
        });
        const isInProgress = !isCompleted && asmAtts.some(att => {
          const st = String(att.status || '').toLowerCase();
          return st === 'in_progress';
        });

        if (isCompleted) completedCount++;
        else if (isInProgress) inProgressCount++;

        studentDetails.push({
          assessmentTitle: assessment.title,
          levelNumber: assessment.levels?.level_number || 1,
          levelName: assessment.levels?.name || 'Unknown',
          is_completed: isCompleted,
          is_in_progress: isInProgress
        });
      });

      // Calculate authoritative global grade & score across completed assessments (Rule 2.8 & 2.10)
      let totalScoreObtained = 0;
      let totalMaxPossible = 0;
      let completedScoredCount = 0;
      let sumPercentages = 0;

      assignedAssesIds.forEach(asmId => {
        const asmAtts = sAttemptsByAsm.get(asmId) || [];
        const validAtts = asmAtts.filter(att => {
          const st = String(att.status || '').toLowerCase();
          return ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st);
        });
        if (validAtts.length > 0) {
          let bestScore = -1;
          let bestTotalQ = 10;
          let bestPct = 0;
          validAtts.forEach(att => {
            const sc = Number(att.score ?? 0);
            const tq = Number(att.total_questions || 10);
            const pct = att.percentage != null ? Number(att.percentage) : (tq > 0 ? (sc / tq) * 100 : 0);
            if (sc > bestScore || bestScore === -1) {
              bestScore = sc;
              bestTotalQ = tq;
              bestPct = pct;
            }
          });
          totalScoreObtained += Math.max(0, bestScore);
          totalMaxPossible += bestTotalQ;
          sumPercentages += bestPct;
          completedScoredCount++;
        }
      });

      // Student Score (%) & Grade: Calculated ONLY from taken/unlocked assessments.
      // Formula: average_score = sum(best_percentage_on_taken) / count(taken_assessments)
      const overallPct = completedScoredCount > 0 
        ? Math.round(sumPercentages / completedScoredCount) 
        : 0;
      const overallScoreStr = completedScoredCount > 0 ? `${overallPct}%` : '—';
      const globalGrade = completedScoredCount > 0 && typeof getGrade === 'function' ? getGrade(overallPct) : '—';
      const cMap = { 'S': '#fbbf24', 'A': '#10b981', 'B': '#0ea5e9', 'C': '#c7c18c', 'D': '#f97316', 'E': '#f43f5e', 'F': '#ef4444' };
      const gradeColor = cMap[globalGrade] || 'rgba(255,255,255,0.4)';

      // Calculate age from birth_date
      let ageDisplay = '—';
      if (student.birth_date) {
        const bd = new Date(student.birth_date);
        if (!isNaN(bd.getTime())) {
          const today = new Date();
          let age = today.getFullYear() - bd.getFullYear();
          const m = today.getMonth() - bd.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
          if (age && age > 0) ageDisplay = `${age} yrs`;
        }
      }

      const isBatchActive = studentBatch ? studentBatch.is_active !== false : (student.batches ? student.batches.is_active !== false : true);
      const pinDisplay = student.pin || 'NOT SET';
      const displayName = formatStudentName(student.name, student.gender);

      // Sort details by level then alphabetically
      studentDetails.sort((a, b) => {
        if (a.levelNumber !== b.levelNumber) return a.levelNumber - b.levelNumber;
        return (a.assessmentTitle || '').localeCompare(b.assessmentTitle || '');
      });

      const instName = student.institutions?.name || student.programs?.institutions?.name || (allInstitutions.find(i => i.id === student.institution_id)?.name) || '—';
      const progName = student.programs?.name || (allPrograms.find(p => p.id === student.program_id)?.name) || '—';
      const batchName = student.batches?.name || studentBatch?.name || 'Unassigned';
      const levelName = (student.level_id && levelsMap.get(student.level_id)) || (studentBatch?.current_level_id && levelsMap.get(studentBatch.current_level_id)) || '—';

      allData.push({
        student: student,
        instName,
        progName,
        batchName,
        isBatchActive,
        levelName,
        displayName,
        pinDisplay,
        ageDisplay,
        gender: student.gender || '',
        photoUrl: student.photo_url || '',
        totalAssigned: assignedAssesIds.size,
        completedCount,
        inProgressCount,
        totalScoreObtained,
        totalMaxPossible,
        overallPct,
        overallScoreStr,
        globalGrade,
        gradeColor,
        details: studentDetails
      });
    });

    // Hierarchical sort: Active students on top, then Active Batches first -> Institution -> Program -> Batch -> Level -> Name (A-Z)
    allData.sort((a, b) => {
      const aActive = a.student.is_active !== false ? 1 : 0;
      const bActive = b.student.is_active !== false ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;

      const aBatchAct = a.isBatchActive ? 1 : 0;
      const bBatchAct = b.isBatchActive ? 1 : 0;
      if (aBatchAct !== bBatchAct) return bBatchAct - aBatchAct;

      const instCmp = (a.instName || '').localeCompare(b.instName || '', undefined, { sensitivity: 'base', numeric: true });
      if (instCmp !== 0) return instCmp;

      const progCmp = (a.progName || '').localeCompare(b.progName || '', undefined, { sensitivity: 'base', numeric: true });
      if (progCmp !== 0) return progCmp;

      const batchCmp = (a.batchName || '').localeCompare(b.batchName || '', undefined, { sensitivity: 'base', numeric: true });
      if (batchCmp !== 0) return batchCmp;

      const lvlCmp = (a.levelName || '').localeCompare(b.levelName || '', undefined, { sensitivity: 'base', numeric: true });
      if (lvlCmp !== 0) return lvlCmp;

      if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount;

      return (a.displayName || a.student?.name || '').localeCompare(b.displayName || b.student?.name || '', undefined, { sensitivity: 'base', numeric: true });
    });

    area.innerHTML = `
          <div class="section-header">
            <div>
              <h2 class="section-title">Student Progress <span class="count-chip" id="prog-count-chip">${allData.length} Students</span></h2>
              <p class="section-subtitle">Overview of student assessment completion, global scores, and grades filterable by Batch, Program, and Status</p>
            </div>
          </div>

          <div class="d-flex align-center gap-3 flex-wrap p-3 mb-4 rounded" style="background:var(--clr-surface-2); border:1px solid var(--clr-border);">
            <div style="min-width:180px;">
              <label class="text-xs text-muted d-block mb-1">Batch Status</label>
              <select id="prog-filter-batch-status" class="form-control" style="padding:6px 10px;font-size:0.85rem;">
                <option value="active" selected>Active Batches (Ongoing)</option>
                <option value="all">All Batches (Include Past)</option>
                <option value="inactive">Inactive / Past Batches Only</option>
              </select>
            </div>

            <div style="min-width:180px;">
              <label class="text-xs text-muted d-block mb-1">Filter Program</label>
              <select id="prog-filter-class" class="form-control" style="padding:6px 10px;font-size:0.85rem;">
                <option value="">&mdash; All Programs &mdash;</option>
                ${(allPrograms || []).filter(c => !c.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(c => `<option value="${c.id}" data-inst="${c.institution_id}">${escapeHtml(c.name)}</option>`).join('')}
              </select>
            </div>

            <div style="min-width:180px;">
              <label class="text-xs text-muted d-block mb-1">Filter Batch (Group)</label>
              <select id="prog-filter-batch" class="form-control" style="padding:6px 10px;font-size:0.85rem;">
                <option value="">&mdash; All Batches &mdash;</option>
                ${(allBatches || []).filter(b => !b.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(b => `<option value="${b.id}" data-prog="${b.program_id}" data-active="${b.is_active !== false ? 'true' : 'false'}">${escapeHtml(b.name)}${b.is_active === false ? ' (Past/Inactive)' : ''}</option>`).join('')}
              </select>
            </div>

            <div style="flex:1;min-width:220px;">
              <label class="text-xs text-muted d-block mb-1">Search Student</label>
              <input type="text" id="prog-filter-search" class="form-control" placeholder="Search by name, PIN..." style="padding:6px 10px;font-size:0.85rem;">
            </div>

            <div class="d-flex align-end" style="padding-top:18px;">
              <button class="btn btn-ghost btn-sm" id="prog-btn-reset" title="Reset all filters">&#10006; Reset</button>
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th class="text-left" style="width:110px;">Institution</th>
                  <th class="text-left" style="width:90px;">Program</th>
                  <th class="text-center" style="width:75px;">Batch</th>
                  <th class="text-center" style="width:85px;">Level</th>
                  <th class="text-left" style="min-width:180px;">Student Name</th>
                  <th class="text-center" style="width:65px;">Age</th>
                  <th class="text-center" style="width:80px;">Gender</th>
                  <th class="text-center" style="width:95px;">Assessments</th>
                  <th class="text-center" style="width:70px;">Score</th>
                  <th class="text-center" style="width:65px;">Grade</th>
                  <th class="text-center" style="width:130px;">Completion</th>
                  <th class="text-center" style="width:75px;">Status</th>
                  <th class="text-right" style="width:110px;">Actions</th>
                </tr>
              </thead>
              <tbody id="tbl-progress-body"></tbody>
            </table>
          </div>
        `;

    const batchStatusSelect = document.getElementById('prog-filter-batch-status');
    const classSelect = document.getElementById('prog-filter-class');
    const batchSelect = document.getElementById('prog-filter-batch');
    const searchInput = document.getElementById('prog-filter-search');
    const tbody = document.getElementById('tbl-progress-body');
    const countChip = document.getElementById('prog-count-chip');

    const updateBatchOptions = () => {
      const cId = classSelect.value;
      const bStatus = batchStatusSelect.value;
      Array.from(batchSelect.options).forEach((opt, idx) => {
        if (idx === 0) return;
        const progMatch = !cId || opt.getAttribute('data-prog') === cId || opt.getAttribute('data-class') === cId;
        const isActive = opt.getAttribute('data-active') === 'true';
        let statusMatch = true;
        if (bStatus === 'active') statusMatch = isActive;
        else if (bStatus === 'inactive') statusMatch = !isActive;
        opt.style.display = (progMatch && statusMatch) ? '' : 'none';
      });
      if (batchSelect.selectedOptions[0]?.style.display === 'none') {
        batchSelect.value = '';
      }
    };

    window.showStudentProgressDetails = function(studentId) {
       const rec = allData.find(d => d.student.id === studentId);
       if (!rec) return;
       const existing = document.getElementById('prog-details-modal');
       if (existing) existing.remove();
       
       const modal = document.createElement('div');
       modal.id = 'prog-details-modal';
       modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.95);backdrop-filter:blur(5px);z-index:9999;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;';
       
       const detailsRows = rec.details.map(r => `
            <tr>
              <td class="fw-600 text-sm">${escapeHtml(r.assessmentTitle || '—')}</td>
              <td class="text-center"><span class="badge badge-primary">Level ${toLevelLetter(r.levelNumber)} ${escapeHtml(r.levelName || '')}</span></td>
              <td class="text-center">
                <span class="badge ${r.is_completed ? 'badge-success' : r.is_in_progress ? 'badge-warning' : 'badge-neutral'}">
                  ${r.is_completed ? '&#10004;&#65039; Completed' : r.is_in_progress ? '&#9654;&#65039; In Progress' : '&#128276; Not Started'}
                </span>
              </td>
            </tr>
       `).join('');

       modal.innerHTML = `
         <div style="background:var(--fm-bg-panel, #0F172A);border:1px solid var(--clr-border);border-radius:12px;width:100%;max-width:700px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
            <div style="padding:1.5rem;border-bottom:1px solid var(--clr-border);display:flex;justify-content:space-between;align-items:center;">
              <h3 style="margin:0;">Assessment Details: ${escapeHtml(rec.displayName || rec.student.name)}</h3>
              <button class="btn-icon" onclick="document.getElementById('prog-details-modal').remove()" style="background:transparent;border:none;color:var(--clr-text-2);font-size:1.2rem;cursor:pointer;">&#10005;</button>
            </div>
            <div style="padding:1.5rem;overflow-y:auto;flex:1;">
               <div class="d-flex gap-4 mb-4" style="background:rgba(255,255,255,0.05);padding:1rem;border-radius:8px;">
                 <div><div class="text-xs text-muted">Assigned</div><div class="fw-700" style="font-size:1.2rem;">${rec.totalAssigned}</div></div>
                 <div><div class="text-xs text-muted">Completed</div><div class="fw-700" style="font-size:1.2rem;color:var(--clr-success);">${rec.completedCount}</div></div>
                 <div><div class="text-xs text-muted">In Progress</div><div class="fw-700" style="font-size:1.2rem;color:var(--clr-warning);">${rec.inProgressCount}</div></div>
                 <div><div class="text-xs text-muted">Overall Score</div><div class="fw-700" style="font-size:1.2rem;color:var(--clr-text-1);">${rec.overallScoreStr}</div></div>
                 <div><div class="text-xs text-muted">Global Grade</div><div><span class="badge" style="background:${rec.gradeColor};color:#000;font-weight:800;font-size:0.85rem;padding:2px 8px;">${rec.globalGrade}</span></div></div>
               </div>
               <table class="table-wrap" style="width:100%;">
                 <thead>
                   <tr>
                     <th class="text-left">Assessment</th>
                     <th class="text-center">Level</th>
                     <th class="text-center">Status</th>
                   </tr>
                 </thead>
                 <tbody>${detailsRows}</tbody>
               </table>
            </div>
         </div>
       `;
       document.body.appendChild(modal);
       modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    };

    const renderTable = () => {
      const bStatus = batchStatusSelect.value;
      const cId = classSelect.value;
      const bId = batchSelect.value;
      const q = searchInput.value.toLowerCase().trim();

      const filtered = allData.filter(r => {
        if (bStatus === 'active' && !r.isBatchActive) return false;
        if (bStatus === 'inactive' && r.isBatchActive) return false;
        if (cId && r.student?.program_id !== cId) return false;
        if (bId && r.student?.batch_id !== bId) return false;
        if (q) {
          const sName = (r.student?.name || '').toLowerCase();
          const dName = (r.displayName || '').toLowerCase();
          const sPin = String(r.student?.pin || '').toLowerCase();
          if (!sName.includes(q) && !dName.includes(q) && !sPin.includes(q)) return false;
        }
        return true;
      });

      countChip.textContent = `${filtered.length} of ${allData.length} Students`;

      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="13" class="text-center text-muted p-5">No progression records match the selected filters.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(r => {
        const pct = r.totalAssigned > 0 ? Math.round((r.completedCount / r.totalAssigned) * 100) : 0;
        return `
            <tr>
              <td class="text-muted text-xs" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:110px;" title="${escapeHtml(r.instName || '—')}">${escapeHtml(r.instName || '—')}</td>
              <td class="text-muted text-xs" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:90px;" title="${escapeHtml(r.progName || '—')}">${escapeHtml(r.progName || '—')}</td>
              <td class="text-center"><span class="badge" style="background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.25); font-weight:700; font-size:0.75rem; padding:2px 8px; border-radius:10px;">${escapeHtml(r.batchName || '—')}</span></td>
              <td class="text-center"><span class="badge badge-neutral" style="font-size:0.72rem;">${escapeHtml(r.levelName || '—')}</span></td>
              <td>
                <div class="d-flex align-center gap-3">
                  ${r.photoUrl 
                    ? `<img src="${r.photoUrl}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid var(--clr-border);">` 
                    : `<img src="${generateAvatarDataUri(r.displayName || r.student?.name, r.gender)}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid var(--clr-border);">`
                  }
                  <div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px;">
                    <div class="fw-600" style="color:var(--clr-text-1); cursor:pointer; font-size:0.85rem;" onclick="window.openStudentProfile('${r.student.id}')" title="Click to view student profile">
                      ${escapeHtml(r.displayName)}
                    </div>
                    <div class="text-xs text-muted" style="font-family:monospace; font-size:0.68rem;">PIN: ${escapeHtml(r.pinDisplay)}</div>
                  </div>
                </div>
              </td>
              <td class="text-center"><span class="text-xs fw-600" style="color:var(--clr-text-2);">${r.ageDisplay}</span></td>
              <td class="text-center">
                ${r.gender === 'male' 
                  ? `<span class="badge" style="background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);font-size:0.68rem;padding:2px 6px;">&#9794; Male</span>`
                  : r.gender === 'female'
                  ? `<span class="badge" style="background:rgba(244,114,182,0.15);color:#f472b6;border:1px solid rgba(244,114,182,0.3);font-size:0.68rem;padding:2px 6px;">&#9792; Female</span>`
                  : `<span class="badge badge-neutral" style="font-size:0.68rem;padding:2px 6px;">&mdash;</span>`
                }
              </td>
              <td class="text-center fw-600 text-sm">
                <span style="color:var(--clr-success); font-weight:700;">${r.completedCount}</span> / <span class="text-muted" style="font-size:0.75rem;">${r.totalAssigned}</span>
              </td>
              <td class="text-center">
                <span class="fw-700 text-xs" style="color:${r.gradeColor}; font-size:0.8rem; ${r.globalGrade === 'S' ? 'filter:drop-shadow(0 0 6px rgba(251,191,36,0.6)); font-weight:900;' : ''}">${r.overallScoreStr}</span>
              </td>
              <td class="text-center">
                ${r.globalGrade !== '—' 
                  ? (r.globalGrade === 'S'
                    ? `<span class="badge" style="background:linear-gradient(135deg, #fef08a, #fbbf24, #d97706);color:#1e1b4b;font-weight:900;font-size:0.72rem;padding:2px 7px;box-shadow:0 0 10px rgba(245,158,11,0.7);border:1px solid #fde68a;">S</span>`
                    : `<span class="badge" style="background:${r.gradeColor};color:#000;font-weight:800;font-size:0.72rem;padding:2px 7px;">${r.globalGrade}</span>`
                  ) 
                  : '<span class="text-muted" style="font-size:0.75rem;">&mdash;</span>'
                }
              </td>
              <td class="text-center" style="min-width:110px;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <div class="progress-pill" style="flex:1;height:7px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;">
                    <div class="progress-pill-fill" style="height:100%;width:${pct}%; background: ${pct === 100 ? 'var(--clr-success)' : 'var(--clr-primary)'};"></div>
                  </div>
                  <span class="text-xs fw-700" style="font-size:0.72rem;">${pct}%</span>
                </div>
              </td>
              <td class="text-center"><span class="badge ${r.student?.is_active !== false ? 'badge-success' : 'badge-neutral'}" style="font-size:0.68rem;padding:2px 6px;">${r.student?.is_active !== false ? 'Active' : 'Inactive'}</span></td>
              <td class="text-right">
                <div class="d-flex gap-1 justify-end align-center">
                  <button class="btn btn-secondary btn-icon btn-sm" onclick="window.openStudentProfile('${r.student.id}')" title="View Profile" style="padding:3px 6px; font-size:0.75rem;">&#128100;</button>
                  <button class="btn btn-secondary btn-sm" onclick="window.showStudentProgressDetails('${r.student.id}')" title="View Details" style="padding:3px 8px; font-size:0.75rem;">Details</button>
                </div>
              </td>
            </tr>
          `;
      }).join('');
    };

    batchStatusSelect.addEventListener('change', () => { updateBatchOptions(); renderTable(); });
    classSelect.addEventListener('change', () => { updateBatchOptions(); renderTable(); });
    batchSelect.addEventListener('change', renderTable);
    searchInput.addEventListener('input', renderTable);
    document.getElementById('prog-btn-reset')?.addEventListener('click', () => {
      batchStatusSelect.value = 'active';
      classSelect.value = '';
      batchSelect.value = '';
      searchInput.value = '';
      updateBatchOptions();
      renderTable();
    });

    updateBatchOptions();
    renderTable();

  } catch (err) {
    console.error('Failed to load progress', err);
    area.innerHTML = `<div class="p-5 text-center text-error">Failed to load progression data: ${err.message}</div>`;
  }
}

window.viewClassInstanceRoster = async function (classInstanceId) {
  const modal = document.getElementById('roster-modal');
  const tbody = document.getElementById('roster-modal-tbody');
  const select = document.getElementById('roster-add-student-select');
  const addBtn = document.getElementById('roster-add-student-btn');

  modal.classList.remove('hidden');
  tbody.innerHTML = '<tr><td colspan="2" class="text-center">Loading roster...</td></tr>';

  try {
    const roster = await fetchClassInstanceRoster(classInstanceId);
    if (roster.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No students enrolled yet.</td></tr>';
    } else {
      tbody.innerHTML = roster.map(s => `
        <tr style="border-bottom: 1px solid var(--clr-border);">
          <td style="padding:8px 0;">${escapeHtml(s.name)}</td>
          <td class="text-right" style="padding:8px 0;">
            <span class="badge ${s.enrollment_type === 'auto' ? 'badge-primary' : 'badge-warning'}">${s.enrollment_type === 'auto' ? 'Auto-Enrolled' : 'Manual / Dropped'}</span>
          </td>
        </tr>
      `).join('');
    }

    // Populate dropdown with all students (excluding those already in the roster)
    const allStudents = window._adminStore?.students || [];
    const rosterIds = new Set(roster.map(s => s.id));
    select.innerHTML = '<option value="">Select student to manually enroll...</option>' +
      allStudents.filter(s => !rosterIds.has(s.id)).map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');

    addBtn.onclick = async () => {
      const studentId = select.value;
      if (!studentId) return;
      addBtn.disabled = true;
      addBtn.textContent = 'Adding...';
      try {
        await addAdditionalMember(classInstanceId, studentId);
        await window.viewClassInstanceRoster(classInstanceId); // Refresh modal
      } catch (e) {
        alert('Failed to add member: ' + e.message);
      } finally {
        addBtn.disabled = false;
        addBtn.textContent = 'Add to Roster';
      }
    };
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="2" class="text-center text-danger">Error: ${err.message}</td></tr>`;
  }
};

// ============================================================
// Assessment RECALIBRATOR (Relocated to Domain D — Data Health)
// ============================================================

export async function renderRecalibrator(area) {
  window.location.hash = '#health';
  if (window.loadSection) return window.loadSection('health');
}

// ============================================================
// CLASS INSTANCES UI
// ============================================================
export async function renderClassInstances(area) {
  const [rawData, batches, classes] = await Promise.all([
    adminFetchAll('class_instances', '*, batches!batch_id(name, programs!program_id(name, institutions!institution_id(name)))'),
    adminFetchAll('batches', 'id, name'),
    adminFetchAll('classes', 'id, name')
  ]);

  const data = [...rawData].sort((a, b) => {
    const pA = a.batches?.programs?.name || '';
    const pB = b.batches?.programs?.name || '';
    return pA.localeCompare(pB) || (a.batches?.name || '').localeCompare(b.batches?.name || '');
  });

  area.innerHTML = `
        <div class="section-header d-flex justify-between align-center flex-wrap gap-2">
          <div>
            <h2 class="section-title">Class Instances <span class="count-chip">${data.length} Total</span></h2>
            <p class="section-subtitle">Manage class instances attached to batches (start dates, recurring schedules)</p>
          </div>
          <button class="btn btn-primary" onclick="window.openCrudModal('class_instances', null)">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path></svg>
            Attach Class to Batch
          </button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="text-left">Program</th>
                <th class="text-left">Batch</th>
                <th class="text-left">Class Board</th>
                <th class="text-left">Start Date</th>
                <th class="text-left">Est. Finish</th>
                <th class="text-left">Schedule</th>
                <th class="text-center">Status</th>
                <th class="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${data.length === 0 ? '<tr><td colspan="8" class="text-center text-muted">No class instances yet.</td></tr>' : (() => {
      window._ciRecords = {};
      return data.map(row => {
        window._ciRecords[row.id] = row;
        let scheduleText = '—';
        if (row.recurring_schedule) {
          try {
            const parsed = typeof row.recurring_schedule === 'string' ? JSON.parse(row.recurring_schedule) : row.recurring_schedule;
            if (Array.isArray(parsed)) scheduleText = parsed.join(', ');
            else scheduleText = JSON.stringify(parsed);
          } catch { scheduleText = String(row.recurring_schedule); }
        }
        return `
                <tr>
                  <td>
                    <div class="fw-600">${escapeHtml(row.batches?.programs?.name || '—')}</div>
                    <div class="text-xs text-muted">${escapeHtml(row.batches?.programs?.institutions?.name || '—')}</div>
                  </td>
                  <td>${escapeHtml(row.batches?.name || '—')}</td>
                  <td>${escapeHtml(row.classes?.name || '—')}</td>
                  <td>${row.start_date || '—'}</td>
                  <td>${row.estimated_finish || '—'}</td>
                  <td class="text-xs text-muted" style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(scheduleText)}</td>
                  <td class="text-center">
                    <span class="badge ${row.status === 'active' ? 'badge-primary' : (row.status === 'finished' ? 'badge-success' : 'badge-neutral')}">${row.status}</span>
                  </td>
                  <td class="text-right">
                    <button class="btn btn-ghost btn-sm" onclick="window.viewClassInstanceRoster('${row.id}')">Roster</button>
                    <button class="btn btn-ghost btn-sm" onclick="window.openCrudModal('class_instances', window._ciRecords['${row.id}'])">Edit</button>
                  </td>
                </tr>
              `}).join('');
    })()}
            </tbody>
          </table>
        </div>
      `;
}

