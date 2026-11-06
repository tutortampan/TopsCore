// TOPS CORE — Forgiven & Exam Manual Override Wizard Modal
// Phase 305: Pacing Adjustment & Offline Exam Manual Override
import {
  adminApplyForgiven,
  adminRevokeForgiven,
  isExam,
  isWeeklyExam,
  escapeHtml,
  showToast
} from '../api.js?v=20261106_v160';

export async function openForgivenWizard(options = {}) {
  const {
    classId,
    classTests = [],
    batches = [],
    students = [],
    onComplete = null
  } = options;

  if (!classId) {
    showToast('Class ID diperlukan untuk membuka wizard.', 'error');
    return;
  }

  // Remove existing modal if any
  document.getElementById('forgiven-wizard-modal')?.remove();

  // Create Modal Container
  const overlay = document.createElement('div');
  overlay.id = 'forgiven-wizard-modal';
  overlay.className = 'topscore-modal-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(6px);
    z-index: 10000; display: flex; align-items: center; justify-content: center;
    padding: 20px; box-sizing: border-box; animation: fadeIn 0.15s ease-out;
  `;

  // Sort tests by display_order
  const sortedTests = [...classTests].sort((a, b) => {
    const oA = a.display_order ?? a.order_index ?? 0;
    const oB = b.display_order ?? b.order_index ?? 0;
    return oA - oB;
  });

  // Group tests by Theme (A, B, C, D)
  const themeGroups = {};
  sortedTests.forEach(t => {
    const rawTheme = t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A');
    const tc = (rawTheme || 'A').toUpperCase();
    if (!themeGroups[tc]) themeGroups[tc] = { tasks: [], exams: [] };
    if (isWeeklyExam(t)) {
      themeGroups[tc].exams.push(t);
    } else {
      themeGroups[tc].tasks.push(t);
    }
  });

  // Unique batches present in students list
  const availableBatches = [];
  const batchMap = {};
  (batches || []).forEach(b => { batchMap[b.id] = b.name; });

  const batchIdsInStudents = Array.from(new Set(students.map(s => s.batch_id).filter(Boolean)));
  batchIdsInStudents.forEach(bid => {
    availableBatches.push({ id: bid, name: batchMap[bid] || `Batch ${bid.slice(0, 8)}` });
  });

  // State
  let currentStep = 1;
  let selectedStudentIds = new Set(students.map(s => s.id)); // Default: all students selected
  let currentBatchFilter = availableBatches[0]?.id || 'ALL';

  overlay.innerHTML = `
    <div class="topscore-modal-card" style="
      background: #0f172a; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 14px;
      width: 100%; max-width: 820px; max-height: 90vh; display: flex; flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); overflow: hidden; color: #f8fafc;
    ">
      <!-- Modal Header -->
      <div style="padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: space-between; align-items: center; background: rgba(30, 41, 59, 0.7);">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.25rem;">🛡️</span>
            <h2 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #f8fafc; letter-spacing: -0.01em;">
              Wizard Forgiven &amp; Exam Manual Override
            </h2>
            <span style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.3); font-size: 0.68rem; font-weight: 800; padding: 2px 7px; border-radius: 4px; text-transform: uppercase;">
              Pacing Adjustment
            </span>
          </div>
          <p style="margin: 3px 0 0 0; font-size: 0.76rem; color: #94a3b8;">
            Buka gembok Pekan 3 untuk siswa/batch tertentu tanpa merusak silabus kurikulum.
          </p>
        </div>
        <button type="button" id="btn-close-forgiven-modal" style="background: transparent; border: none; color: #94a3b8; font-size: 1.3rem; cursor: pointer; padding: 4px 8px; line-height: 1; border-radius: 6px;">✕</button>
      </div>

      <!-- Step Indicator Bar -->
      <div style="display: flex; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: #0b1120;">
        <div id="step-tab-1" style="flex: 1; padding: 10px 16px; font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid #f59e0b; color: #f59e0b; cursor: pointer;">
          <span style="width: 20px; height: 20px; border-radius: 50%; background: #f59e0b; color: #0f172a; display: inline-flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 900;">1</span>
          PILIH SISWA &amp; BATCH
        </div>
        <div id="step-tab-2" style="flex: 1; padding: 10px 16px; font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid transparent; color: #64748b; cursor: pointer;">
          <span style="width: 20px; height: 20px; border-radius: 50%; background: #334155; color: #94a3b8; display: inline-flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 900;">2</span>
          KONFIGURASI TASK &amp; EXAM
        </div>
      </div>

      <!-- Modal Body (Scrollable) -->
      <div id="forgiven-modal-body" style="padding: 18px 20px; overflow-y: auto; flex: 1;">
        <!-- STEP 1 CONTAINER -->
        <div id="step-1-container">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; gap: 10px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <label style="font-size: 0.78rem; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Filter Batch:</label>
              <select id="forgiven-batch-select" style="background: #1e293b; border: 1px solid rgba(255,255,255,0.15); color: #f8fafc; padding: 5px 10px; border-radius: 6px; font-size: 0.82rem; font-weight: 600;">
                <option value="ALL">Semua Batch (${students.length} Siswa)</option>
                ${availableBatches.map(b => `
                  <option value="${b.id}" ${b.id === currentBatchFilter ? 'selected' : ''}>${escapeHtml(b.name)}</option>
                `).join('')}
              </select>
            </div>
            <div style="display: flex; gap: 8px;">
              <button type="button" id="btn-select-all-students" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #f8fafc; padding: 4px 10px; border-radius: 6px; font-size: 0.74rem; font-weight: 600; cursor: pointer;">
                ✓ Pilih Semua
              </button>
              <button type="button" id="btn-clear-all-students" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #94a3b8; padding: 4px 10px; border-radius: 6px; font-size: 0.74rem; font-weight: 600; cursor: pointer;">
                Kosongkan
              </button>
            </div>
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <input type="text" id="student-search-input" placeholder="Cari nama siswa..." style="background: #1e293b; border: 1px solid rgba(255,255,255,0.1); color: #fff; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; width: 100%; max-width: 320px;">
            <span id="selected-student-count-chip" style="font-size: 0.76rem; font-weight: 700; color: #f59e0b;">
              ${selectedStudentIds.size} siswa terpilih
            </span>
          </div>

          <!-- Students Checklist Grid -->
          <div id="students-checklist-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; max-height: 380px; overflow-y: auto; padding: 10px; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px;">
            <!-- Injected by renderStudentChecklist() -->
          </div>
        </div>

        <!-- STEP 2 CONTAINER -->
        <div id="step-2-container" style="display: none;">
          <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
            <div style="font-size: 0.8rem; color: #f8fafc;">
              Target: <strong id="summary-student-count" style="color: #f59e0b;">${selectedStudentIds.size} Siswa</strong> terpilih
            </div>
            <button type="button" id="btn-quick-pacing-w12" style="background: #d97706; border: none; color: #fff; padding: 5px 12px; border-radius: 6px; font-size: 0.74rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 5px;">
              ⚡ Setel Cepat Pekan 1 &amp; 2 (Forgive A1–B4 &amp; Exam A–B)
            </button>
          </div>

          <!-- Metadata Settings -->
          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 12px; margin-bottom: 16px; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
            <div>
              <label style="display: block; font-size: 0.72rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Nama Admin / Tutor:</label>
              <input type="text" id="forgiven-admin-name" value="Mr. Top" style="width: 100%; box-sizing: border-box; background: #1e293b; border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 6px 10px; border-radius: 6px; font-size: 0.82rem; font-weight: 600;">
            </div>
            <div>
              <label style="display: block; font-size: 0.72rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px;">Alasan / Catatan Audit:</label>
              <input type="text" id="forgiven-reason" value="Pacing Adjustment Pekan 1-2" style="width: 100%; box-sizing: border-box; background: #1e293b; border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 6px 10px; border-radius: 6px; font-size: 0.82rem;">
            </div>
          </div>

          <!-- Test Groups (Themes A, B, C, D) -->
          <div id="theme-test-groups-container">
            ${['A', 'B', 'C', 'D'].map(tc => {
              const grp = themeGroups[tc];
              if (!grp || (grp.tasks.length === 0 && grp.exams.length === 0)) return '';
              const themeTitles = { 'A': 'Public Speaking', 'B': 'Podcast', 'C': 'Shopping Essentials', 'D': 'Cooking' };
              const themeTitle = themeTitles[tc] || `Theme ${tc}`;

              return `
                <div class="theme-card-block" style="margin-bottom: 14px; border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; overflow: hidden; background: rgba(30, 41, 59, 0.4);">
                  <div style="padding: 10px 14px; background: rgba(255,255,255,0.04); border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; justify-content: space-between; align-items: center;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span style="font-size: 0.82rem; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.03em;">
                        PEKAN / TEMA ${tc}: ${escapeHtml(themeTitle)}
                      </span>
                      <span style="font-size: 0.7rem; color: #94a3b8;">(${grp.tasks.length} Tasks, ${grp.exams.length} Exams)</span>
                    </div>
                    <button type="button" class="btn-toggle-theme-tasks" data-theme="${tc}" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #f8fafc; padding: 3px 8px; border-radius: 4px; font-size: 0.7rem; cursor: pointer;">
                      Pilih Semua Task Tema ${tc}
                    </button>
                  </div>

                  <div style="padding: 12px 14px;">
                    <!-- Tasks Checklist -->
                    <div style="margin-bottom: 12px;">
                      <div style="font-size: 0.72rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px;">
                        📌 Formative Tasks (Prerequisite Gating Only):
                      </div>
                      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 6px;">
                        ${grp.tasks.map(task => `
                          <label style="display: flex; align-items: center; gap: 8px; font-size: 0.78rem; padding: 6px 8px; background: rgba(0,0,0,0.2); border-radius: 6px; cursor: pointer; border: 1px solid rgba(255,255,255,0.04);">
                            <input type="checkbox" class="task-forgive-checkbox" data-test-id="${task.id}" data-theme="${tc}" style="accent-color: #f59e0b; width: 15px; height: 15px; cursor: pointer;">
                            <span style="font-weight: 600; color: #e2e8f0;">${escapeHtml(task.title || task.shell_code || 'Task')}</span>
                          </label>
                        `).join('')}
                      </div>
                    </div>

                    <!-- Exams Configuration -->
                    ${grp.exams.length > 0 ? `
                      <div>
                        <div style="font-size: 0.72rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px;">
                          📝 Milestone Exam (Official Grade &amp; Points):
                        </div>
                        ${grp.exams.map(exam => {
                          const totalQ = Number(exam.payload?.total_questions || exam.total_questions || 120);
                          return `
                            <div class="exam-row-box" data-test-id="${exam.id}" data-theme="${tc}" data-total-q="${totalQ}" style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 10px 12px; margin-bottom: 6px;">
                              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                                <span style="font-weight: 700; font-size: 0.82rem; color: #f8fafc;">
                                  ${escapeHtml(exam.title || exam.shell_code || 'Exam')}
                                  <span style="font-size: 0.7rem; color: #94a3b8; font-weight: 400;">(${totalQ} Soal)</span>
                                </span>
                                <div style="display: flex; align-items: center; gap: 14px; font-size: 0.78rem;">
                                  <label style="display: flex; align-items: center; gap: 4px; cursor: pointer;">
                                    <input type="radio" name="exam_action_${exam.id}" value="none" checked style="accent-color: #94a3b8;">
                                    <span>Abaikan</span>
                                  </label>
                                  <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: #f59e0b;">
                                    <input type="radio" name="exam_action_${exam.id}" value="forgive" style="accent-color: #f59e0b;">
                                    <span>Forgive (0%ᶠ)</span>
                                  </label>
                                  <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: #38bdf8;">
                                    <input type="radio" name="exam_action_${exam.id}" value="manual" style="accent-color: #38bdf8;">
                                    <span>Input Nilai Manual</span>
                                  </label>
                                </div>
                              </div>

                              <!-- Manual Score Inputs (Hidden by default) -->
                              <div class="exam-manual-inputs-row" id="manual-inputs-${exam.id}" style="display: none; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.08); align-items: center; gap: 12px; font-size: 0.78rem;">
                                <span style="color: #38bdf8; font-weight: 700;">Nilai Ujian Offline:</span>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                  <input type="number" class="manual-pct-input" data-exam-id="${exam.id}" min="0" max="100" placeholder="0-100" style="width: 70px; background: #1e293b; border: 1px solid rgba(56,189,248,0.4); color: #fff; padding: 4px 6px; border-radius: 4px; text-align: center; font-weight: 700;">
                                  <span>%</span>
                                </div>
                                <span style="color: #64748b;">=</span>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                  <input type="number" class="manual-pts-input" data-exam-id="${exam.id}" min="0" max="${totalQ}" placeholder="0-${totalQ}" style="width: 75px; background: #1e293b; border: 1px solid rgba(56,189,248,0.4); color: #fff; padding: 4px 6px; border-radius: 4px; text-align: center; font-weight: 700;">
                                  <span style="color: #94a3b8;">/ ${totalQ} PTS</span>
                                </div>
                              </div>
                            </div>
                          `;
                        }).join('')}
                      </div>
                    ` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div style="padding: 14px 20px; border-top: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: space-between; align-items: center; background: rgba(30, 41, 59, 0.7);">
        <div>
          <button type="button" id="btn-forgiven-revoke" style="background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.4); color: #f87171; padding: 6px 14px; border-radius: 6px; font-size: 0.78rem; font-weight: 700; cursor: pointer; display: none;">
            ↩️ Revoke / Batalkan Forgiven
          </button>
        </div>
        <div style="display: flex; gap: 10px;">
          <button type="button" id="btn-forgiven-prev" style="background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.15); color: #f8fafc; padding: 7px 16px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; display: none;">
            ← Kembali
          </button>
          <button type="button" id="btn-forgiven-next" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border: none; color: #0f172a; padding: 7px 18px; border-radius: 6px; font-size: 0.82rem; font-weight: 800; cursor: pointer;">
            Lanjut ke Konfigurasi Tes →
          </button>
          <button type="button" id="btn-forgiven-submit" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border: none; color: #0f172a; padding: 7px 20px; border-radius: 6px; font-size: 0.82rem; font-weight: 800; cursor: pointer; display: none;">
            ⚡ Terapkan Sekarang
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // --- Step 1 Helpers ---
  function renderStudentChecklist() {
    const grid = overlay.querySelector('#students-checklist-grid');
    if (!grid) return;

    const searchTerm = (overlay.querySelector('#student-search-input')?.value || '').toLowerCase().trim();
    const filteredStudents = students.filter(s => {
      if (currentBatchFilter !== 'ALL' && s.batch_id !== currentBatchFilter) return false;
      if (searchTerm && !(s.name || '').toLowerCase().includes(searchTerm)) return false;
      return true;
    });

    if (filteredStudents.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 20px; font-size: 0.8rem;">Tidak ada siswa yang sesuai filter.</div>`;
      return;
    }

    grid.innerHTML = filteredStudents.map(s => {
      const isChecked = selectedStudentIds.has(s.id);
      return `
        <label style="display: flex; align-items: center; gap: 8px; padding: 6px 10px; background: ${isChecked ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255,255,255,0.02)'}; border: 1px solid ${isChecked ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255,255,255,0.06)'}; border-radius: 6px; cursor: pointer; transition: all 0.15s ease;">
          <input type="checkbox" class="student-checkbox" value="${s.id}" ${isChecked ? 'checked' : ''} style="accent-color: #f59e0b; width: 15px; height: 15px; cursor: pointer;">
          <div style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            <div style="font-size: 0.78rem; font-weight: 600; color: #f8fafc;">${escapeHtml(s.name)}</div>
            <div style="font-size: 0.68rem; color: #94a3b8;">${escapeHtml(s.batches?.name || s.batch_name || 'Camp 134')}</div>
          </div>
        </label>
      `;
    }).join('');

    // Attach student checkbox change events
    grid.querySelectorAll('.student-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const sId = e.target.value;
        if (e.target.checked) selectedStudentIds.add(sId);
        else selectedStudentIds.delete(sId);
        updateStudentCountChips();
      });
    });
  }

  function updateStudentCountChips() {
    const chip = overlay.querySelector('#selected-student-count-chip');
    const summary = overlay.querySelector('#summary-student-count');
    if (chip) chip.textContent = `${selectedStudentIds.size} siswa terpilih`;
    if (summary) summary.textContent = `${selectedStudentIds.size} Siswa`;
  }

  // --- Step Switching ---
  function goToStep(step) {
    currentStep = step;
    const step1 = overlay.querySelector('#step-1-container');
    const step2 = overlay.querySelector('#step-2-container');
    const tab1 = overlay.querySelector('#step-tab-1');
    const tab2 = overlay.querySelector('#step-tab-2');
    const btnNext = overlay.querySelector('#btn-forgiven-next');
    const btnPrev = overlay.querySelector('#btn-forgiven-prev');
    const btnSubmit = overlay.querySelector('#btn-forgiven-submit');
    const btnRevoke = overlay.querySelector('#btn-forgiven-revoke');

    if (step === 1) {
      step1.style.display = 'block';
      step2.style.display = 'none';
      tab1.style.borderColor = '#f59e0b';
      tab1.style.color = '#f59e0b';
      tab2.style.borderColor = 'transparent';
      tab2.style.color = '#64748b';
      btnNext.style.display = 'inline-block';
      btnPrev.style.display = 'none';
      btnSubmit.style.display = 'none';
      btnRevoke.style.display = 'none';
    } else {
      if (selectedStudentIds.size === 0) {
        showToast('Pilih minimal satu siswa untuk melanjutkan.', 'warning');
        return;
      }
      step1.style.display = 'none';
      step2.style.display = 'block';
      tab2.style.borderColor = '#f59e0b';
      tab2.style.color = '#f59e0b';
      tab1.style.borderColor = 'transparent';
      tab1.style.color = '#64748b';
      btnNext.style.display = 'none';
      btnPrev.style.display = 'inline-block';
      btnSubmit.style.display = 'inline-block';
      btnRevoke.style.display = 'inline-block';
    }
  }

  // --- Event Listeners ---

  // Close modal
  overlay.querySelector('#btn-close-forgiven-modal')?.addEventListener('click', () => overlay.remove());

  // Step Tabs
  overlay.querySelector('#step-tab-1')?.addEventListener('click', () => goToStep(1));
  overlay.querySelector('#step-tab-2')?.addEventListener('click', () => goToStep(2));
  overlay.querySelector('#btn-forgiven-next')?.addEventListener('click', () => goToStep(2));
  overlay.querySelector('#btn-forgiven-prev')?.addEventListener('click', () => goToStep(1));

  // Batch Filter
  overlay.querySelector('#forgiven-batch-select')?.addEventListener('change', (e) => {
    currentBatchFilter = e.target.value;
    renderStudentChecklist();
  });

  // Search input
  overlay.querySelector('#student-search-input')?.addEventListener('input', () => {
    renderStudentChecklist();
  });

  // Select / Clear all
  overlay.querySelector('#btn-select-all-students')?.addEventListener('click', () => {
    students.forEach(s => {
      if (currentBatchFilter === 'ALL' || s.batch_id === currentBatchFilter) {
        selectedStudentIds.add(s.id);
      }
    });
    renderStudentChecklist();
    updateStudentCountChips();
  });

  overlay.querySelector('#btn-clear-all-students')?.addEventListener('click', () => {
    if (currentBatchFilter === 'ALL') {
      selectedStudentIds.clear();
    } else {
      students.forEach(s => {
        if (s.batch_id === currentBatchFilter) selectedStudentIds.delete(s.id);
      });
    }
    renderStudentChecklist();
    updateStudentCountChips();
  });

  // Quick Select Week 1 & 2 Button
  overlay.querySelector('#btn-quick-pacing-w12')?.addEventListener('click', () => {
    // Check all tasks for Theme A and B
    overlay.querySelectorAll('.task-forgive-checkbox').forEach(cb => {
      const theme = cb.dataset.theme;
      if (theme === 'A' || theme === 'B') {
        cb.checked = true;
      }
    });

    // Set Exam A and Exam B radio to 'forgive'
    overlay.querySelectorAll('.exam-row-box').forEach(box => {
      const theme = box.dataset.theme;
      if (theme === 'A' || theme === 'B') {
        const testId = box.dataset.testId;
        const forgiveRadio = overlay.querySelector(`input[name="exam_action_${testId}"][value="forgive"]`);
        if (forgiveRadio) {
          forgiveRadio.checked = true;
          // Hide manual inputs
          const manualRow = overlay.querySelector(`#manual-inputs-${testId}`);
          if (manualRow) manualRow.style.display = 'none';
        }
      }
    });

    showToast('Pekan 1 & 2 (Tema A & B) otomatis dicentang untuk Forgiven!', 'info');
  });

  // Toggle tasks per theme button
  overlay.querySelectorAll('.btn-toggle-theme-tasks').forEach(btn => {
    btn.addEventListener('click', () => {
      const tc = btn.dataset.theme;
      const themeCbs = overlay.querySelectorAll(`.task-forgive-checkbox[data-theme="${tc}"]`);
      const allChecked = Array.from(themeCbs).every(cb => cb.checked);
      themeCbs.forEach(cb => { cb.checked = !allChecked; });
    });
  });

  // Exam Action Radio change listeners (toggle manual inputs)
  overlay.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const testId = e.target.name.replace('exam_action_', '');
      const manualRow = overlay.querySelector(`#manual-inputs-${testId}`);
      if (manualRow) {
        manualRow.style.display = e.target.value === 'manual' ? 'flex' : 'none';
      }
    });
  });

  // Real-time synchronization between % and PTS inputs
  overlay.querySelectorAll('.manual-pct-input').forEach(pctInput => {
    const examId = pctInput.dataset.examId;
    const box = overlay.querySelector(`.exam-row-box[data-test-id="${examId}"]`);
    const totalQ = Number(box?.dataset?.totalQ || 120);
    const ptsInput = overlay.querySelector(`.manual-pts-input[data-exam-id="${examId}"]`);

    pctInput.addEventListener('input', () => {
      const pct = parseFloat(pctInput.value) || 0;
      if (ptsInput) {
        ptsInput.value = Math.round(totalQ * (pct / 100) * 10) / 10;
      }
    });
  });

  overlay.querySelectorAll('.manual-pts-input').forEach(ptsInput => {
    const examId = ptsInput.dataset.examId;
    const box = overlay.querySelector(`.exam-row-box[data-test-id="${examId}"]`);
    const totalQ = Number(box?.dataset?.totalQ || 120);
    const pctInput = overlay.querySelector(`.manual-pct-input[data-exam-id="${examId}"]`);

    ptsInput.addEventListener('input', () => {
      const pts = parseFloat(ptsInput.value) || 0;
      if (pctInput) {
        pctInput.value = totalQ > 0 ? Math.round((pts / totalQ) * 100 * 10) / 10 : 0;
      }
    });
  });

  // --- SUBMIT ACTION ---
  overlay.querySelector('#btn-forgiven-submit')?.addEventListener('click', async () => {
    if (selectedStudentIds.size === 0) {
      showToast('Pilih minimal satu siswa.', 'warning');
      return;
    }

    const testActions = [];

    // Collect checked tasks
    overlay.querySelectorAll('.task-forgive-checkbox:checked').forEach(cb => {
      testActions.push({
        testId: cb.dataset.testId,
        action: 'forgive'
      });
    });

    // Collect exam actions
    overlay.querySelectorAll('.exam-row-box').forEach(box => {
      const testId = box.dataset.testId;
      const totalQ = Number(box.dataset.totalQ || 120);
      const selectedRadio = overlay.querySelector(`input[name="exam_action_${testId}"]:checked`);
      const action = selectedRadio?.value;

      if (action === 'forgive') {
        testActions.push({ testId, action: 'forgive' });
      } else if (action === 'manual') {
        const pctInput = overlay.querySelector(`.manual-pct-input[data-exam-id="${testId}"]`);
        const ptsInput = overlay.querySelector(`.manual-pts-input[data-exam-id="${testId}"]`);
        const pct = parseFloat(pctInput?.value) || 0;
        const pts = parseFloat(ptsInput?.value) || Math.round(totalQ * (pct / 100) * 10) / 10;
        testActions.push({ testId, action: 'manual', percentage: pct, score: pts });
      }
    });

    if (testActions.length === 0) {
      showToast('Pilih minimal satu task atau exam untuk diproses.', 'warning');
      return;
    }

    const adminName = (overlay.querySelector('#forgiven-admin-name')?.value || 'Mr. Top').trim();
    const reason = (overlay.querySelector('#forgiven-reason')?.value || 'Pacing Adjustment').trim();

    const submitBtn = overlay.querySelector('#btn-forgiven-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Memproses...';

    try {
      const res = await adminApplyForgiven({
        classId,
        studentIds: Array.from(selectedStudentIds),
        testActions,
        forgivenBy: adminName,
        reason
      });

      showToast(`Sukses! ${res.affectedCount} kombinasi siswa-tes telah diperbarui.`, 'success');
      overlay.remove();
      if (typeof onComplete === 'function') onComplete();
    } catch (err) {
      console.error('[ForgivenWizard Submit Error]:', err);
      showToast('Gagal menerapkan Forgiven: ' + err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.textContent = '⚡ Terapkan Sekarang';
    }
  });

  // --- REVOKE ACTION ---
  overlay.querySelector('#btn-forgiven-revoke')?.addEventListener('click', async () => {
    if (selectedStudentIds.size === 0) {
      showToast('Pilih minimal satu siswa untuk revoke.', 'warning');
      return;
    }

    // Collect all selected test IDs (tasks + exams)
    const testIds = [];
    overlay.querySelectorAll('.task-forgive-checkbox:checked').forEach(cb => testIds.push(cb.dataset.testId));
    overlay.querySelectorAll('.exam-row-box').forEach(box => {
      const testId = box.dataset.testId;
      const action = overlay.querySelector(`input[name="exam_action_${testId}"]:checked`)?.value;
      if (action === 'forgive' || action === 'manual') testIds.push(testId);
    });

    if (testIds.length === 0) {
      showToast('Centang task atau pilih exam yang ingin di-revoke status Forgiven-nya.', 'warning');
      return;
    }

    if (!confirm(`Batalkan status Forgiven untuk ${selectedStudentIds.size} siswa pada ${testIds.length} tes yang dipilih?`)) {
      return;
    }

    const revokeBtn = overlay.querySelector('#btn-forgiven-revoke');
    revokeBtn.disabled = true;
    revokeBtn.textContent = '⏳ Mencabut...';

    try {
      const res = await adminRevokeForgiven({
        classId,
        studentIds: Array.from(selectedStudentIds),
        testIds
      });

      showToast(`Status Forgiven dicabut (${res.deletedCount} dihapus, ${res.resetCount} direset).`, 'info');
      overlay.remove();
      if (typeof onComplete === 'function') onComplete();
    } catch (err) {
      console.error('[ForgivenWizard Revoke Error]:', err);
      showToast('Gagal mencabut Forgiven: ' + err.message, 'error');
      revokeBtn.disabled = false;
      revokeBtn.textContent = '↩️ Revoke / Batalkan Forgiven';
    }
  });

  // Initial render of Step 1
  renderStudentChecklist();
  document.body.appendChild(overlay);
}
