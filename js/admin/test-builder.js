// TOPS CORE — Centralized Test Wizard V1
// Implements multi-step Evaluation & Test creation, topic derivation from Evaluations,
// live question counts, inline assignments, and frozen snapshots on publish.
import {
  fetchClasses,
  fetchTopics,
  fetchCentralQuestions,
  fetchTestDefinitions,
  createTestDefinition,
  updateTestDefinition,
  createTestDefinitionWithTopics,
  updateTestWithTopics,
  publishTestDefinition,
  createTestInstance,
  fetchBatches,
  fetchClassInstances,
  createTopic,
  adminFetchAll,
  clearAdminCache,
  reorderTest
} from '../api.js?v=5.3.2';
import { showToast, showLoading, hideLoading, escapeHtml, escHtml } from '../app.js?v=5.3.2';

export async function openTestBuilder(testId = null, initialClassId = null) {
  const isEdit = !!testId;

  const builderDiv = document.createElement('div');
  builderDiv.id = 'test-builder-modal';
  builderDiv.className = 'modal-backdrop';
  builderDiv.innerHTML = `
    <div class="modal-content" style="max-width: 960px; height: 90vh; display: flex; flex-direction: column;">
      <div class="modal-header d-flex justify-between align-center p-3" style="border-bottom: 1px solid var(--clr-border);">
        <div>
          <h2 class="modal-title m-0 text-gradient" style="font-size: 1.35rem;">
            ${isEdit ? 'Edit Test' : 'New Test Wizard (V1)'}
          </h2>
          <p class="text-muted m-0" style="font-size: 0.8rem;">Create Evaluations or Comprehensive Tests with frozen question snapshots</p>
        </div>
        <button class="btn btn-ghost" id="close-test-builder" style="font-size: 1.5rem; line-height: 1;">&times;</button>
      </div>

      <div class="modal-body p-0" style="flex: 1; overflow: hidden; display: flex; flex-direction: column;">
        <!-- Step Navigation Tabs -->
        <div class="builder-tabs" style="display: flex; border-bottom: 1px solid var(--clr-border); background: var(--clr-bg-2);">
          <button class="builder-tab active" data-tab="tab-details" style="flex: 1; padding: 12px; border: none; background: transparent; cursor: pointer; font-weight: 700; border-bottom: 3px solid var(--clr-primary);">
            1. Details &amp; Type
          </button>
          <button class="builder-tab" data-tab="tab-topics" style="flex: 1; padding: 12px; border: none; background: transparent; cursor: pointer; font-weight: 700;">
            2. Topic Coverage
          </button>
          
          <button class="builder-tab" data-tab="tab-publish" style="flex: 1; padding: 12px; border: none; background: transparent; cursor: pointer; font-weight: 700;">
            3. Review &amp; Freeze
          </button>
        </div>

        <div class="builder-content" style="flex: 1; overflow-y: auto; padding: 24px; background: var(--clr-bg-1);">
          
          <!-- TAB 1: BASIC DETAILS -->
          <div id="tab-details" class="b-tab-content">
            <div class="card p-4" style="background:rgba(255,255,255,0.02);border:1px solid var(--clr-border);">
              <div class="form-grid">
                <div class="form-group form-group-full mb-3">
                  <label class="form-label">Test Type *</label>
                  <div class="d-flex gap-4">
                    <label style="cursor:pointer;display:flex;align-items:center;gap:8px;">
                      <input type="radio" name="wiz-type" value="EVALUATION" checked />
                      <strong>Evaluation</strong> <span class="text-muted text-xs">(Routine / modular topic check)</span>
                    </label>
                    <label style="cursor:pointer;display:flex;align-items:center;gap:8px;">
                      <input type="radio" name="wiz-type" value="Test" />
                      <strong>Comprehensive Test</strong> <span class="text-muted text-xs">(Derived from Evaluation sequences)</span>
                    </label>
                  </div>
                </div>

                <div class="form-group form-group-full mb-3">
                  <label class="form-label">Test Title *</label>
                  <input type="text" class="form-control" id="wiz-title" placeholder="e.g. Vocabulary Evaluation A1 - Daily Routine" required />
                </div>

                <div class="form-group form-group-full mb-3">
                  <label class="form-label">Class *</label>
                  <select class="form-control" id="wiz-class"></select>
                </div>

                <div class="form-group mb-3 d-flex gap-4">
                  <div style="flex:1;">
                    <label class="form-label">Status</label>
                    <select class="form-control" id="wiz-status">
                      <option value="DRAFT">Draft (Hidden from students)</option>
                      <option value="PUBLISHED">Published (Live)</option>
                    </select>
                  </div>
                  <div style="flex:1;">
                    <label class="form-label">Display Order (ORD)</label>
                    <input type="number" class="form-control" id="wiz-display-order" value="999" />
                  </div>
                </div>

                <div class="form-group mb-3 d-flex gap-4">
                  <div style="flex:1;">
                    <label class="form-label">Working Duration (Minutes) *</label>
                    <input type="number" class="form-control" id="wiz-duration" value="60" min="5" max="300" />
                  </div>
                  <div style="flex:1;">
                    <label class="form-label">Max Attempts (0 = Unlimited)</label>
                    <input type="number" class="form-control" id="wiz-max-attempts" value="0" min="0" />
                  </div>
                  <div style="flex:1;">
                    <label class="form-label">Pass Threshold (%)</label>
                    <input type="number" class="form-control" id="wiz-pass-threshold" value="0" min="0" max="100" />
                  </div>
                </div>

                <div class="form-group mb-3">
                  <label class="form-label">Prerequisite Test</label>
                  <select class="form-control" id="wiz-prereq">
                    <option value="">None (Available immediately)</option>
                  </select>
                </div>
                
                <div class="form-group mb-3">
                  <label class="form-label">Answer Type (Interaction Mode)</label>
                  <select class="form-control" id="wiz-answer-type">
                    <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                    <option value="DROPDOWN">Dropdown / Cards (Phrase)</option>
                    <option value="WRITTEN">Written Text</option>
                    <option value="SPEECH">Speech-to-Text</option>
                  </select>
                </div>

                <div class="form-group mb-3">
                  <label class="form-label">Question Order</label>
                  <select class="form-control" id="wiz-order">
                    <option value="RANDOM">Random (Shuffled order for each student attempt)</option>
                    <option value="SEQUENTIAL">Sequential (Fixed bank display order)</option>
                  </select>
                </div>

                

                <div class="form-group mb-3">
                  <label class="form-label">Availability End (Optional)</label>
                  <input type="datetime-local" class="form-control" id="wiz-end" />
                </div>
              </div>

              <div class="text-right mt-4">
                <button class="btn btn-primary" id="btn-details-next">Next: Topic Coverage →</button>
              </div>
            </div>
          </div>

          <!-- TAB 2: TOPIC COVERAGE -->
          <div id="tab-topics" class="b-tab-content hidden">
            <!-- Container for EVALUATION: direct topic checkboxes -->
            <div id="wiz-evaluation-topic-section" class="card p-4 mb-4" style="background:rgba(255,255,255,0.02);border:1px solid var(--clr-border);">
              <div class="d-flex justify-between align-center flex-wrap gap-2 mb-3">
                <div>
                  <h3 style="font-size:1.1rem;margin:0;">Select Topics for this Evaluation</h3>
                  <p class="text-muted text-xs m-0">All active questions from checked topics are automatically included. No question limit.</p>
                </div>
                <div>
                  <span class="badge badge-primary p-2" style="font-size:0.85rem;">
                    Total Questions: <strong id="wiz-eval-q-count">0</strong>
                  </span>
                </div>
              </div>
              <div id="wiz-topics-container" class="d-flex flex-column gap-2 mt-3" style="max-height: 360px; overflow-y: auto;">
                <!-- Topic checkboxes injected here -->
              </div>
            </div>

            <!-- Container for Test: sequence of evaluations derivation -->
            <div id="wiz-Test-sequence-section" class="card p-4 mb-4 hidden" style="background:rgba(255,255,255,0.02);border:1px solid var(--clr-border);">
              <div class="d-flex justify-between align-center flex-wrap gap-2 mb-3">
                <div>
                  <h3 style="font-size:1.1rem;margin:0;">Derive Coverage from Evaluations</h3>
                  <p class="text-muted text-xs m-0">Select the source Evaluations. The system unifies unique topics and includes all active questions.</p>
                </div>
                <div>
                  <span class="badge badge-primary p-2" style="font-size:0.85rem;">
                    Derived Questions: <strong id="wiz-Test-q-count">0</strong>
                  </span>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label" style="font-size:0.85rem;">Source Evaluations:</label>
                <div id="wiz-evaluations-container" class="d-flex flex-column gap-2" style="max-height: 200px; overflow-y: auto;">
                  <!-- Existing evaluations checkboxes injected here -->
                </div>
              </div>

              <!-- Derived Topics summary -->
              <div class="p-3 rounded" style="background:rgba(0,0,0,0.25);border:1px solid var(--clr-border);">
                <div class="text-xs fw-700 text-muted uppercase mb-2">Unified Topic Coverage (<span id="wiz-derived-topic-count">0</span> topics):</div>
                <div id="wiz-derived-topics-chips" class="d-flex gap-2 flex-wrap">
                  <span class="text-muted text-xs">No evaluations selected yet.</span>
                </div>
              </div>
            </div>

            <div class="d-flex justify-between mt-4">
              <button class="btn btn-secondary btn-sm" id="btn-topics-prev">← Back to Details</button>
              <button class="btn btn-primary btn-sm" id="btn-topics-next">Next: Review & Publish →</button>
            </div>
          </div>

          <!-- TAB 3: ASSIGNMENT -->
          <!-- TAB 4: REVIEW & PUBLISH -->
          <div id="tab-publish" class="b-tab-content hidden">
            <div class="card p-4" style="background:rgba(255,255,255,0.02);border:1px solid var(--clr-border);">
              <h3 style="font-size:1.1rem;margin-bottom:1rem;">Test Summary &amp; Snapshot Freeze</h3>
              
              <div class="p-4 rounded mb-4" style="background:rgba(0,0,0,0.25);border:1px solid var(--clr-border);">
                <div class="d-flex justify-between align-center mb-3">
                  <h4 class="m-0" id="rev-title" style="font-size:1.15rem;font-weight:700;">—</h4>
                  <span id="rev-type" class="badge badge-info">EVALUATION</span>
                </div>
                <div class="d-flex gap-4 flex-wrap text-sm mb-3">
                  <div><strong>Class Board:</strong> <span id="rev-class">—</span></div>
                  <div><strong>Duration:</strong> <span id="rev-duration">60 min</span></div>
                  <div><strong>Order:</strong> <span id="rev-order">Random</span></div>
                  <div><strong>Assignment:</strong> <span id="rev-assignment" class="badge badge-neutral">Batch</span></div>
                </div>
                <div class="mb-3">
                  <strong>Included Topics:</strong> <span id="rev-topics" class="text-muted">—</span>
                </div>
                <div class="d-flex align-center gap-2 p-3 rounded" style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.3);">
                  <div style="font-size:1.5rem;">🔒</div>
                  <div>
                    <div style="font-size:0.85rem;font-weight:700;">Question Snapshot Immutability</div>
                    <div class="text-xs text-muted">
                      Publishing will freeze exactly <strong id="rev-questions" class="text-success">0</strong> active questions into <code>test_questions</code>.
                    </div>
                  </div>
                </div>
              </div>

              <div class="d-flex justify-between align-center">
                <button class="btn btn-secondary btn-sm" id="btn-publish-prev">← Back to Topic Coverage</button>
                <div class="d-flex gap-2">
                  <button class="btn btn-secondary btn-sm" id="btn-save-draft">💾 Save as Draft</button>
                  <button class="btn btn-success btn-sm" id="btn-publish-test">🚀 Publish &amp; Freeze Snapshot</button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  document.body.appendChild(builderDiv);

  // Tab Switching
  const tabs = builderDiv.querySelectorAll('.builder-tab');
  const contents = builderDiv.querySelectorAll('.b-tab-content');

  function switchTab(targetTabId) {
    tabs.forEach(t => {
      const isTarget = t.dataset.tab === targetTabId;
      t.style.borderBottom = isTarget ? '3px solid var(--clr-primary)' : 'none';
      t.classList.toggle('active', isTarget);
    });
    contents.forEach(c => c.classList.toggle('hidden', c.id !== targetTabId));
  }

  tabs.forEach(t => t.onclick = () => switchTab(t.dataset.tab));

  const close = () => {
    builderDiv.remove();
    if (window.loadSection) window.loadSection('Tests');
  };
  document.getElementById('close-test-builder').onclick = close;

  // Load Initial Data
  showLoading('Initializing Test Wizard...');
  let allClasses = [];
  let allTopics = [];
  let allQuestions = [];
  let existingTests = [];
  let allBatches = [];
  let allStudents = [];
  let allClassInstances = [];
  let selectedTopicIds = new Set();
  let selectedEvalIds = new Set();
  let createdTestId = testId;

  try {
        const [subjs, topcs, qList, asms, btchs, stds, classInsts] = await Promise.all([
      fetchClasses(),
      fetchTopics(),
      fetchCentralQuestions({ status: 'active' }),
      fetchTestDefinitions(),
      fetchBatches(),
      adminFetchAll('students'),
      fetchClassInstances()
    ]);

    allClasses = subjs;
    allTopics = topcs;
    allQuestions = qList;
    existingTests = asms;
    allBatches = btchs;
    allStudents = stds.filter(s => !s.deleted_at);
    allClassInstances = classInsts;

    hideLoading();

    // Populate Classes dropdown
    const subSel = document.getElementById('wiz-class');
    if (subSel) {
      subSel.innerHTML = allClasses.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
      if (!isEdit && initialClassId) subSel.value = initialClassId;
    }

    // Populate Prerequisite dropdown
    const updatePrereqs = () => {
      const displayOrderInput = document.getElementById('wiz-display-order');
      const currentOrder = parseInt(displayOrderInput ? displayOrderInput.value : 999) || 999;
      const prereqSel = document.getElementById('wiz-prereq');
      if (!prereqSel) return;
      const currentVal = prereqSel.value;
      
      prereqSel.innerHTML = `<option value="">None (Available immediately)</option>` +
        existingTests
          .filter(a => a.id !== testId && subSel && a.class_id === subSel.value)
          .sort((a,b)=>(a.display_order||999)-(b.display_order||999))
          .map(a => {
            const ord = a.display_order || 999;
            const isDisabled = ord >= currentOrder;
            return `<option value="${a.id}" ${isDisabled ? 'disabled' : ''}>[ORD ${ord}] ${escapeHtml(a.title)} (${escapeHtml(a.test_type || 'EVALUATION')})</option>`;
          }).join('');
          
      if (prereqSel.querySelector(`option[value="${currentVal}"]`)) {
        prereqSel.value = currentVal;
      }
    };
    
    const displayOrderInputEl = document.getElementById('wiz-display-order');
    if (displayOrderInputEl) displayOrderInputEl.addEventListener('change', updatePrereqs);

    // Toggle Evaluation vs Test UI in Tab 2
    const typeRadios = builderDiv.querySelectorAll('input[name="wiz-type"]');
    const evalSection = document.getElementById('wiz-evaluation-topic-section');
    const Testsection = document.getElementById('wiz-Test-sequence-section');

    const updateTypeUI = () => {
      const checkedType = builderDiv.querySelector('input[name="wiz-type"]:checked');
      if (!checkedType) return;
      const isTest = checkedType.value === 'Test';
      if (evalSection) evalSection.classList.toggle('hidden', isTest);
      if (Testsection) Testsection.classList.toggle('hidden', !isTest);
      if (isTest) {
        renderTestEvaluations();
      } else {
        renderTopicCheckboxes();
      }
    };

    typeRadios.forEach(r => r.onchange = updateTypeUI);

    // Render topics checkboxes for current Class (EVALUATION mode)
    const renderTopicCheckboxes = () => {
      const currentClassId = subSel.value;
      const filteredTopics = allTopics.filter(t => t.class_id === currentClassId);
      const container = document.getElementById('wiz-topics-container');

      if (!filteredTopics.length) {
        container.innerHTML = `
          <div class="p-4 text-center rounded" style="background:rgba(255,255,255,0.02);border:1px dashed var(--clr-border);">
            <p class="text-muted text-xs mb-3">No topics found for this Class yet. You can add one quickly below:</p>
            <div class="d-flex justify-center gap-2 flex-wrap" style="max-width:420px;margin:0 auto;">
              <input type="text" class="form-control form-control-sm" id="wiz-quick-topic-name" placeholder="Topic Name (e.g. Vocabulary Set 1)" style="flex:1;min-width:180px;" />
              <button class="btn btn-primary btn-sm" id="btn-wiz-add-topic" type="button">+ Add Topic</button>
            </div>
          </div>
        `;
        document.getElementById('wiz-eval-q-count').textContent = '0';
        document.getElementById('btn-wiz-add-topic')?.addEventListener('click', async () => {
          const tName = document.getElementById('wiz-quick-topic-name')?.value.trim();
          if (!tName) {
            showToast('Please enter a topic name.', 'warning');
            return;
          }
          try {
            const newT = await createTopic({ class_id: currentClassId, name: tName });
            allTopics.push(newT);
            selectedTopicIds.add(newT.id);
            renderTopicCheckboxes();
            showToast(`Topic "${tName}" created and selected.`, 'success');
          } catch (err) {
            showToast(`Failed to create topic: ${err.message}`, 'error');
          }
        });
        return;
      }

      container.innerHTML = filteredTopics.map(t => {
        const qCount = allQuestions.filter(q => q.topic_id === t.id).length;
        const isChecked = selectedTopicIds.has(t.id);
        return `
          <label class="d-flex align-center justify-between p-3 rounded" style="background:rgba(255,255,255,0.03);border:1px solid var(--clr-border);cursor:pointer;">
            <div class="d-flex align-center gap-3">
              <input type="checkbox" class="topic-checkbox" value="${t.id}" data-count="${qCount}" ${isChecked ? 'checked' : ''} />
              <div>
                <strong>${escapeHtml(t.name)}</strong>
                ${t.code ? `<span class="badge badge-secondary ml-2">${escapeHtml(t.code)}</span>` : ''}
              </div>
            </div>
            <span class="badge ${qCount > 0 ? 'badge-info' : 'badge-neutral'}">
              ${qCount} questions
            </span>
          </label>
        `;
      }).join('');

      updateEvalQuestionSum();
    };

    const updateEvalQuestionSum = () => {
      let sum = 0;
      builderDiv.querySelectorAll('.topic-checkbox:checked').forEach(cb => {
        sum += Number(cb.dataset.count || 0);
      });
      document.getElementById('wiz-eval-q-count').textContent = sum;
    };

    // Render source Evaluations checkboxes (Test mode)
    const renderTestEvaluations = () => {
      const currentClassId = subSel.value;
      const evals = existingTests.filter(a => a.class_id === currentClassId && (a.test_type || 'EVALUATION') === 'EVALUATION');
      const container = document.getElementById('wiz-evaluations-container');

      if (!evals.length) {
        container.innerHTML = `<p class="text-muted text-xs p-3 text-center">No published evaluations found for this Class. Create Evaluations first.</p>`;
        updateTestDerivedCoverage();
        return;
      }

      container.innerHTML = evals.map(ev => {
        const isChecked = selectedEvalIds.has(ev.id);
        return `
          <label class="d-flex align-center justify-between p-3 rounded" style="background:rgba(255,255,255,0.03);border:1px solid var(--clr-border);cursor:pointer;">
            <div class="d-flex align-center gap-3">
              <input type="checkbox" class="eval-checkbox" value="${ev.id}" ${isChecked ? 'checked' : ''} />
              <div>
                <strong>${escapeHtml(ev.title)}</strong>
                <span class="badge badge-neutral ml-2">${ev.working_duration_minutes || 60} min</span>
              </div>
            </div>
          </label>
        `;
      }).join('');

      updateTestDerivedCoverage();
    };

    const updateTestDerivedCoverage = async () => {
      // Find all topics linked to selected evaluations
      const derivedTopicIds = new Set();

      for (const evId of selectedEvalIds) {
        const ev = existingTests.find(a => a.id === evId);
        if (ev && ev.test_topics) {
          ev.test_topics.forEach(t => derivedTopicIds.add(t.topic_id));
        }
      }

      // If test_topics is empty locally, fallback to all active topics in Class
      selectedTopicIds = derivedTopicIds;

      const chipsContainer = document.getElementById('wiz-derived-topics-chips');
      const topicCountEl = document.getElementById('wiz-derived-topic-count');

      const derivedTopics = allTopics.filter(t => derivedTopicIds.has(t.id));
      topicCountEl.textContent = derivedTopics.length;

      if (!derivedTopics.length) {
        chipsContainer.innerHTML = `<span class="text-muted text-xs">No evaluations selected or no topics linked yet.</span>`;
        document.getElementById('wiz-Test-q-count').textContent = '0';
        return;
      }

      chipsContainer.innerHTML = derivedTopics.map(t => `
        <span class="badge badge-info p-2">${escapeHtml(t.name)}</span>
      `).join('');

      // Calculate total questions belonging to these topics
      const qCount = allQuestions.filter(q => derivedTopicIds.has(q.topic_id)).length;
      document.getElementById('wiz-Test-q-count').textContent = qCount;
    };

    // Pre-populate if in edit mode
    let editTest = null;
    if (testId) {
      editTest = existingTests.find(a => a.id === testId);
      if (!editTest) {
        try {
          const allTests = await adminFetchAll('tests');
          editTest = (allTests || []).find(e => e.id === testId);
        } catch (_) {}
      }
    }

    if (editTest) {
      const isTest = (editTest.test_type || '').toUpperCase() === 'Test';
      const typeRadio = builderDiv.querySelector(`input[name="wiz-type"][value="${isTest ? 'Test' : 'EVALUATION'}"]`);
      if (typeRadio) typeRadio.checked = true;

      const titleInput = document.getElementById('wiz-title');
      if (titleInput) titleInput.value = editTest.title || editTest.title || '';

      if (editTest.class_id && subSel) {
        subSel.value = editTest.class_id;
      }

      const durInput = document.getElementById('wiz-duration');
      if (durInput) durInput.value = editTest.working_duration_minutes || editTest.time_limit_minutes || 60;

      const orderSel = document.getElementById('wiz-order');
      if (orderSel) {
        const ordVal = (editTest.question_order || '').toUpperCase();
        orderSel.value = ordVal === 'SEQUENTIAL' ? 'SEQUENTIAL' : 'RANDOM';
      }

      const statusSel = document.getElementById('wiz-status');
      if (statusSel) statusSel.value = editTest.status || 'DRAFT';
      
      const displayOrderInput = document.getElementById('wiz-display-order');
      if (displayOrderInput) displayOrderInput.value = editTest.display_order || 999;
      
      const maxAttemptsInput = document.getElementById('wiz-max-attempts');
      if (maxAttemptsInput) maxAttemptsInput.value = editTest.max_attempts || 0;
      
      const passThresholdInput = document.getElementById('wiz-pass-threshold');
      if (passThresholdInput) passThresholdInput.value = editTest.minimum_required_score || 0;
      
      const answerTypeSel = document.getElementById('wiz-answer-type');
      if (answerTypeSel) answerTypeSel.value = editTest.answer_type || 'MULTIPLE_CHOICE';

      updatePrereqs();
      const prereqSelEl = document.getElementById('wiz-prereq');
      if (prereqSelEl && (editTest.prerequisite_test_id || editTest.prerequisite_test_id)) {
        prereqSelEl.value = editTest.prerequisite_test_id || editTest.prerequisite_test_id;
      }
      
      // PUBLISHED Guardrails
      if (editTest.status === 'PUBLISHED') {
        if (typeRadio) typeRadio.disabled = true;
        subSel.disabled = true;
        answerTypeSel.disabled = true;
        
        // Disable structural edits on tab 2
        document.querySelectorAll('.topic-checkbox, .eval-checkbox').forEach(cb => cb.disabled = true);
        document.getElementById('btn-wiz-add-topic').disabled = true;
      }

      if (editTest.availability_start) {
        const d = new Date(editTest.availability_start);
        if (!isNaN(d.getTime())) document.getElementById('wiz-start').value = d.toISOString().slice(0, 16);
      }
      if (editTest.availability_end) {
        const d = new Date(editTest.availability_end);
        if (!isNaN(d.getTime())) document.getElementById('wiz-end').value = d.toISOString().slice(0, 16);
      }

      // Pre-select topics linked to this test/Test
      if (Array.isArray(editTest.test_topics)) {
        editTest.test_topics.forEach(t => selectedTopicIds.add(t.topic_id));
      }
      // Also check questions linked to this Test for topic_ids
      const linkedQuestions = allQuestions.filter(q => q.test_id === testId || q.test_id === testId);
      linkedQuestions.forEach(q => {
        if (q.topic_id) selectedTopicIds.add(q.topic_id);
      });
    }

    subSel.onchange = () => {
      selectedTopicIds.clear();
      selectedEvalIds.clear();
      updateTypeUI();
      updatePrereqs();
    };
    updateTypeUI();
    updatePrereqs();

    builderDiv.addEventListener('change', (e) => {
      if (e.target.classList.contains('topic-checkbox')) {
        const id = e.target.value;
        if (e.target.checked) selectedTopicIds.add(id);
        else selectedTopicIds.delete(id);
        updateEvalQuestionSum();
      }
      if (e.target.classList.contains('eval-checkbox')) {
        const id = e.target.value;
        if (e.target.checked) selectedEvalIds.add(id);
        else selectedEvalIds.delete(id);
        updateTestDerivedCoverage();
      }
    });

    // Step 1 -> Step 2
    document.getElementById('btn-details-next').onclick = () => {
      const title = document.getElementById('wiz-title').value.trim();
      if (!title) {
        showToast('Please enter an test title.', 'warning');
        return;
      }
      updateTypeUI();
      switchTab('tab-topics');
    };

    // Step 2 -> Step 3 (Review)
    document.getElementById('btn-topics-prev').onclick = () => switchTab('tab-details');
    document.getElementById('btn-topics-next').onclick = () => {
      if (selectedTopicIds.size === 0) {
        showToast('Please select at least one topic (or source evaluation) for this test.', 'warning');
        return;
      }
      
      const typeVal = builderDiv.querySelector('input[name="wiz-type"]:checked').value;
      const title = document.getElementById('wiz-title').value;
      const duration = document.getElementById('wiz-duration').value;
      const order = document.getElementById('wiz-order').value;

      document.getElementById('rev-title').textContent = title;
      document.getElementById('rev-type').textContent = typeVal;
      document.getElementById('rev-class').textContent = subSel.options[subSel.selectedIndex]?.text || '';
      document.getElementById('rev-duration').textContent = `${duration} minutes`;
      document.getElementById('rev-order').textContent = order;
      document.getElementById('rev-assignment').textContent = 'Auto by Level';
      
      switchTab('tab-publish');
    };

    // (Removed Step 3 tab logic)

    document.getElementById('btn-assign-prev').onclick = () => switchTab('tab-topics');
    document.getElementById('btn-assign-next').onclick = () => {
      const typeVal = builderDiv.querySelector('input[name="wiz-type"]:checked').value;
      const title = document.getElementById('wiz-title').value;
      const duration = document.getElementById('wiz-duration').value;
      const order = document.getElementById('wiz-order').value;
      const strategy = 'NONE';

      document.getElementById('rev-title').textContent = title;
      document.getElementById('rev-type').textContent = typeVal;
      document.getElementById('rev-class').textContent = subSel.options[subSel.selectedIndex]?.text || '';
      document.getElementById('rev-duration').textContent = `${duration} minutes`;
      document.getElementById('rev-order').textContent = order;

      if (strategy === 'BATCH') {
        const bName = batchSel.options[batchSel.selectedIndex]?.text || 'Batch';
        document.getElementById('rev-assignment').textContent = `Batch: ${bName}`;
      } else if (strategy === 'STUDENT') {
        const sName = studentSel.options[studentSel.selectedIndex]?.text || 'Student';
        document.getElementById('rev-assignment').textContent = `Student: ${sName}`;
      } else {
        document.getElementById('rev-assignment').textContent = 'Open / Assign Later';
      }

      const topicNames = allTopics.filter(t => selectedTopicIds.has(t.id)).map(t => t.name).join(', ');
      document.getElementById('rev-topics').textContent = topicNames || 'Selected Topics';

      const qTotal = (typeVal === 'Test')
        ? document.getElementById('wiz-Test-q-count').textContent
        : document.getElementById('wiz-eval-q-count').textContent;
      document.getElementById('rev-questions').textContent = qTotal;

      switchTab('tab-publish');
    };

    // Step 4 Nav
    document.getElementById('btn-publish-prev').onclick = () => switchTab('tab-topics');

    // Save as Draft
    document.getElementById('btn-save-draft').onclick = async () => {
      await persistTest('DRAFT');
    };

    // Publish & Freeze Snapshot
    document.getElementById('btn-publish-test').onclick = async () => {
      await persistTest('PUBLISHED');
    };

    async function persistTest(targetStatus) {
      const title = document.getElementById('wiz-title').value.trim();
      const typeVal = builderDiv.querySelector('input[name="wiz-type"]:checked').value;
      const ClassId = subSel.value;
      const duration = Number(document.getElementById('wiz-duration').value) || 60;
      const order = document.getElementById('wiz-order').value;
      const prereqId = document.getElementById('wiz-prereq').value || null;
      
      // New fields
      const statusVal = document.getElementById('wiz-status').value;
      const displayOrder = parseInt(document.getElementById('wiz-display-order').value) || 999;
      const maxAttempts = parseInt(document.getElementById('wiz-max-attempts').value) || 0;
      const passThreshold = parseInt(document.getElementById('wiz-pass-threshold').value) || 0;
      const answerType = document.getElementById('wiz-answer-type').value;

      const startVal = document.getElementById('wiz-start') ? document.getElementById('wiz-start').value : null;
      const endVal = document.getElementById('wiz-end') ? document.getElementById('wiz-end').value : null;

      showLoading(targetStatus === 'PUBLISHED' ? 'Publishing & Freezing Snapshot...' : 'Saving Test Draft...');
      try {
        let asmId = createdTestId;
        
        const isExamType = String(typeVal).toLowerCase() === 'test' || String(typeVal).toLowerCase() === 'exam';
        const resolvedType = isExamType ? 'exam' : 'quiz';
        const resolvedCategory = isExamType ? 'TEST' : 'TASK';

        // If edit mode and published, we should not change type, class, answer_type or topics.
        const structuralData = (editTest && editTest.status === 'PUBLISHED') ? {} : {
            class_id: ClassId,
            test_type: resolvedType,
            category: resolvedCategory,
            answer_type: answerType || 'spoken'
        };

        const updatePayload = {
          ...structuralData,
          title,
          working_duration_minutes: duration,
          question_order: order,
          prerequisite_test_id: prereqId,
          availability_start: startVal ? new Date(startVal).toISOString() : null,
          availability_end: endVal ? new Date(endVal).toISOString() : null,
          status: (targetStatus === 'PUBLISHED' ? 'PUBLISHED' : statusVal),
          max_attempts: maxAttempts,
          minimum_required_score: passThreshold
        };

        if (!asmId) {
          updatePayload.display_order = 999;
          const newAsm = await createTestDefinitionWithTopics(updatePayload, Array.from(selectedTopicIds));
          asmId = newAsm.id;
          createdTestId = asmId;
        } else {
          await updateTestWithTopics(
            asmId, 
            updatePayload, 
            (editTest && editTest.status === 'PUBLISHED') ? null : Array.from(selectedTopicIds)
          );
        }

        const oldOrder = editTest ? (editTest.display_order || 999) : 999;
        if (displayOrder !== oldOrder || !editTest) {
          await reorderTest(asmId, displayOrder, ClassId);
        }

        if (targetStatus === 'PUBLISHED') {
          const res = await publishTestDefinition(asmId);
          showToast(`Test published with ${res.total_questions} frozen questions!`, 'success');
        } else {
          showToast(isEdit ? 'Test updated successfully.' : 'Test saved as draft.', 'success');
        }

        close();
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        hideLoading();
      }
    }

  } catch (err) {
    showToast(`Failed to initialize wizard: ${err.message}`, 'error');
  } finally {
    hideLoading();
  }
}


