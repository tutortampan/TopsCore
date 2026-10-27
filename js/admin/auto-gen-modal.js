export async function openAutoGenerateModal(options = {}) {
  const { 
    fetchInstitutions, 
    fetchPrograms, 
    autoGenerateTestsHierarchy, 
    updateClassTestsConfig,
    adminFetchAll, 
    escapeHtml, 
    escHtml 
  } = await import('../api.js?v=20261027c');
  const { getSupabase } = await import('../supabase.js?v=20261027c');

  const { 
    availableLevels = [], 
    preSelectedLevels = [], 
    explicitClassId = null, 
    onComplete = null 
  } = options;

  // Show loading indicator while preparing modal data
  const loading = document.createElement('div');
  loading.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;color:white;';
  
  if (!document.getElementById('spinner-style')) {
    const style = document.createElement('style');
    style.id = 'spinner-style';
    style.innerHTML = `@keyframes spin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }
  
  loading.innerHTML = '<div class="spinner" style="width:28px;height:28px;border:3px solid rgba(255,255,255,0.25);border-radius:50%;border-top-color:#38bdf8;animation:spin 1s ease-in-out infinite;"></div>';
  document.body.appendChild(loading);

  try {
    const [institutions, allClasses] = await Promise.all([
      fetchInstitutions(),
      adminFetchAll('classes', 'id, name, program_id, level_id').catch(() => [])
    ]);

    if (!institutions.length) throw new Error('No institutions found.');
    const instId = institutions[0].id; 
    const programs = await fetchPrograms(instId);
    if (!programs.length) throw new Error('No programs found.');

    loading.remove();

    // Determine current active class
    const currentClassId = explicitClassId || window._selectedClassId || localStorage.getItem('topscore_selected_class_id');
    const matchedClass = allClasses.find(c => String(c.id) === String(currentClassId));
    const className = matchedClass ? matchedClass.name : 'Vocabulary Class';

    let prefillTaskDur = 5;
    let prefillWordsTaskAns = 'spoken';
    let prefillPhrasesTaskAns = 'spoken';
    let prefillTaskMin = 60;
    let prefillWordsTestAns = 'written';
    let prefillPhrasesTestAns = 'selection';
    let prefillTestMin = 60;

    if (currentClassId) {
      try {
        const sb = await getSupabase();
        const { data: existingAsms } = await sb
          .from('tests')
          .select('test_type, test_category, category, payload, shell_code, title, answer_type, working_duration_minutes, minimum_required_score')
          .eq('class_id', currentClassId)
          .is('deleted_at', null)
          .limit(40);

        if (existingAsms && existingAsms.length > 0) {
          for (const a of existingAsms) {
            const isTest = String(a.category || a.test_category || a.test_type).toUpperCase() === 'TEST' 
              || String(a.test_type).toLowerCase() === 'exam' 
              || (a.shell_code && a.shell_code.endsWith('-TEST'));
            const isPhrase = a.category === 'phrases' 
              || (a.payload && a.payload.category === 'phrases') 
              || (a.shell_code && a.shell_code.toUpperCase().includes('PHRASE'))
              || (a.title && a.title.toUpperCase().includes('PHRASE'));

            const ans = a.answer_type || (a.payload && a.payload.answer_type);
            const minSc = a.minimum_required_score || (a.payload && a.payload.minimum_required_score);
            const dur = a.working_duration_minutes || (a.payload && a.payload.working_duration_minutes);

            if (isTest) {
              if (minSc) prefillTestMin = minSc;
              if (ans) {
                if (isPhrase) prefillPhrasesTestAns = ans;
                else prefillWordsTestAns = ans;
              }
            } else {
              if (dur) prefillTaskDur = dur;
              if (minSc) prefillTaskMin = minSc;
              if (ans) {
                if (isPhrase) prefillPhrasesTaskAns = ans;
                else prefillWordsTaskAns = ans;
              }
            }
          }
        }
      } catch (err) {
        console.warn('Could not prefill wizard from existing tests:', err);
      }
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.id = 'test-generator-wizard-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto;';

    // Fallback to basic levels if none provided
    const displayLevels = availableLevels.length ? availableLevels : [1, 2, 3];

    overlay.innerHTML = `
      <div class="card" style="background:#0f172a; border:1px solid rgba(255,255,255,0.15); border-radius:12px; width:540px; max-width:96%; color:#f8fafc; box-shadow:0 20px 40px rgba(0,0,0,0.7); max-height:92vh; display:flex; flex-direction:column; overflow:hidden;">
        
        <!-- Modal Header -->
        <div style="padding:1rem 1.25rem; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; background:#1e293b;">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.25rem;">⚡</span>
              <h3 style="margin:0; font-size:1.05rem; font-weight:700; color:#f8fafc;">Test Generator &amp; Blueprint Wizard</h3>
            </div>
            <div style="font-size:0.72rem; color:#94a3b8; margin-top:2px;">
              Konfigurasi blueprint kurikulum, durasi task, cara jawab, dan passing score.
            </div>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" id="wizard-close-btn" style="color:#94a3b8; font-size:1.1rem; padding:2px 8px;">✕</button>
        </div>

        <!-- Modal Body (Scrollable) -->
        <div style="padding:1.1rem 1.25rem; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:14px;">
          
          <!-- Locked Class Context Banner -->
          <div style="background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.25); border-radius:8px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:1.1rem;">📘</span>
              <div>
                <div style="font-size:0.68rem; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.04em;">KELAS TARGET (TERKUNCI &amp; AMAN)</div>
                <div style="font-size:0.85rem; font-weight:700; color:#f8fafc;">${escapeHtml(className)}</div>
              </div>
            </div>
            <span class="badge" style="background:#0284c7; color:#ffffff; font-size:0.68rem; font-weight:700; padding:2px 8px; border-radius:6px;">LOCKED</span>
          </div>

          <!-- Section 1: Target Level & Program -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label class="form-label" style="font-size:0.72rem; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:4px; display:block;">Pilih Level:</label>
              <div style="display:flex; flex-wrap:wrap; gap:8px; background:#090d16; padding:6px 10px; border:1px solid rgba(255,255,255,0.08); border-radius:6px;">
                ${displayLevels.map(lvl => `
                  <label style="display:inline-flex; align-items:center; gap:4px; font-size:0.78rem; cursor:pointer; color:#e2e8f0;">
                    <input type="checkbox" class="wizard-level-chk" value="${lvl}" ${preSelectedLevels.includes(lvl) || preSelectedLevels.length === 0 ? 'checked' : ''} /> Level ${lvl}
                  </label>
                `).join('')}
              </div>
            </div>

            <div>
              <label for="wizard-scope-select" class="form-label" style="font-size:0.72rem; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:4px; display:block;">Cakupan Kategori:</label>
              <select id="wizard-scope-select" class="form-control" style="background:#090d16; color:#f8fafc; border:1px solid rgba(255,255,255,0.08); font-size:0.78rem; height:34px;">
                <option value="all" selected>● Semua (Words &amp; Phrases — 40 Soal)</option>
                <option value="words">○ Words Saja (20 Soal)</option>
                <option value="phrases">○ Phrases Saja (20 Soal)</option>
              </select>
            </div>
          </div>

          <!-- Section 2: Task Harian Configuration (Default 5 Menit) -->
          <div style="background:#1e293b; border:1px solid rgba(250,204,21,0.25); border-radius:8px; padding:10px 12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.82rem; font-weight:800; color:#facc15; display:inline-flex; align-items:center; gap:4px;">
                ⚡ 1. PENGATURAN TASK HARIAN (DAILY TASKS)
              </span>
              <span class="badge" style="background:rgba(250,204,21,0.15); color:#facc15; font-size:0.68rem; font-weight:700;">Mandiri</span>
            </div>

            <!-- Row 1: Durasi Pengerjaan & Nilai Minimal -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label for="wizard-task-dur" class="form-label" style="font-size:0.7rem; color:#94a3b8; margin-bottom:2px; display:block;">⏱️ Waktu (Mnt)</label>
                <input type="number" id="wizard-task-dur" min="1" max="180" value="${escapeHtml(String(prefillTaskDur))}" class="form-control" style="background:#090d16; color:#f8fafc; font-weight:700; font-size:0.82rem; height:32px;" title="Waktu pengerjaan task (default 5 menit)" />
                <div style="display:flex; gap:3px; margin-top:4px;">
                  <button type="button" class="btn btn-ghost btn-sm preset-btn" data-target="wizard-task-dur" data-val="5" style="font-size:0.65rem; padding:1px 4px; border:1px solid rgba(255,255,255,0.1);">5m</button>
                  <button type="button" class="btn btn-ghost btn-sm preset-btn" data-target="wizard-task-dur" data-val="10" style="font-size:0.65rem; padding:1px 4px; border:1px solid rgba(255,255,255,0.1);">10m</button>
                  <button type="button" class="btn btn-ghost btn-sm preset-btn" data-target="wizard-task-dur" data-val="15" style="font-size:0.65rem; padding:1px 4px; border:1px solid rgba(255,255,255,0.1);">15m</button>
                </div>
              </div>

              <div>
                <label for="wizard-task-min" class="form-label" style="font-size:0.7rem; color:#94a3b8; margin-bottom:2px; display:block;">🎯 Min. Skor (%)</label>
                <input type="number" id="wizard-task-min" min="1" max="100" value="${escapeHtml(String(prefillTaskMin))}" class="form-control" style="background:#090d16; color:#f8fafc; font-weight:700; font-size:0.82rem; height:32px;" title="Batas tuntas kelulusan task" />
                <div style="display:flex; gap:3px; margin-top:4px;">
                  <button type="button" class="btn btn-ghost btn-sm preset-btn" data-target="wizard-task-min" data-val="60" style="font-size:0.65rem; padding:1px 4px; border:1px solid rgba(255,255,255,0.1);">60%</button>
                  <button type="button" class="btn btn-ghost btn-sm preset-btn" data-target="wizard-task-min" data-val="70" style="font-size:0.65rem; padding:1px 4px; border:1px solid rgba(255,255,255,0.1);">70%</button>
                </div>
              </div>
            </div>

            <!-- Row 2: Cara Jawab Terpisah (Words Task vs Phrases Task) -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; background:rgba(0,0,0,0.22); padding:8px 10px; border-radius:6px; border:1px solid rgba(250,204,21,0.2);">
              <div>
                <label for="wizard-task-ans-words" class="form-label" style="font-size:0.7rem; color:#facc15; font-weight:700; margin-bottom:2px; display:block;">🗣️ Words Task</label>
                <select id="wizard-task-ans-words" class="form-control" style="background:#090d16; color:#f8fafc; font-size:0.78rem; height:32px;">
                  <option value="spoken" ${prefillWordsTaskAns === 'spoken' ? 'selected' : ''}>🗣️ Spoken (Lisan / AI)</option>
                  <option value="written" ${prefillWordsTaskAns === 'written' ? 'selected' : ''}>✍️ Written (Mengetik)</option>
                  <option value="selection" ${prefillWordsTaskAns === 'selection' ? 'selected' : ''}>🔘 Selection (Pilgan)</option>
                  <option value="mixed" ${prefillWordsTaskAns === 'mixed' ? 'selected' : ''}>🔀 Mixed (Campuran)</option>
                </select>
              </div>

              <div>
                <label for="wizard-task-ans-phrases" class="form-label" style="font-size:0.7rem; color:#facc15; font-weight:700; margin-bottom:2px; display:block;">🗣️ Phrases Task</label>
                <select id="wizard-task-ans-phrases" class="form-control" style="background:#090d16; color:#f8fafc; font-size:0.78rem; height:32px;">
                  <option value="spoken" ${prefillPhrasesTaskAns === 'spoken' ? 'selected' : ''}>🗣️ Spoken (Lisan / AI)</option>
                  <option value="written" ${prefillPhrasesTaskAns === 'written' ? 'selected' : ''}>✍️ Written (Mengetik)</option>
                  <option value="selection" ${prefillPhrasesTaskAns === 'selection' ? 'selected' : ''}>🔘 Selection (Pilgan)</option>
                  <option value="mixed" ${prefillPhrasesTaskAns === 'mixed' ? 'selected' : ''}>🔀 Mixed (Campuran)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Section 3: Test / Ujian Configuration (No Rigid Duration - Session Governed) -->
          <div style="background:#1e293b; border:1px solid rgba(244,114,182,0.25); border-radius:8px; padding:10px 12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.82rem; font-weight:800; color:#f472b6; display:inline-flex; align-items:center; gap:4px;">
                📝 2. PENGATURAN TEST / UJIAN (THEME TESTS A–D)
              </span>
              <span class="badge" style="background:rgba(244,114,182,0.15); color:#f472b6; font-size:0.68rem; font-weight:700;">Sesi Ujian</span>
            </div>

            <!-- Dynamic Session Duration Callout -->
            <div style="background:rgba(0,0,0,0.3); border-left:3px solid #f472b6; padding:6px 10px; border-radius:4px; font-size:0.72rem; color:#cbd5e1; line-height:1.35;">
              ⏱️ <strong>Durasi Ujian:</strong> Dikendalikan secara dinamis oleh <strong>Sesi Ujian Tutor</strong>. Tidak ada batasan durasi kaku agar siswa leluasa mengikuti jadwal buka/tutup sesi.
            </div>

            <div style="display:grid; grid-template-columns:1.2fr 1.2fr 1fr; gap:8px;">
              <div>
                <label for="wizard-test-ans-words" class="form-label" style="font-size:0.7rem; color:#94a3b8; margin-bottom:2px; display:block;">✍️ Words Test</label>
                <select id="wizard-test-ans-words" class="form-control" style="background:#090d16; color:#f8fafc; font-size:0.78rem; height:32px;">
                  <option value="written" ${prefillWordsTestAns === 'written' ? 'selected' : ''}>✍️ Written (Mengetik)</option>
                  <option value="selection" ${prefillWordsTestAns === 'selection' ? 'selected' : ''}>🔘 Selection (Pilgan)</option>
                  <option value="spoken" ${prefillWordsTestAns === 'spoken' ? 'selected' : ''}>🗣️ Spoken (Lisan)</option>
                  <option value="mixed" ${prefillWordsTestAns === 'mixed' ? 'selected' : ''}>🔀 Mixed (Campuran)</option>
                </select>
              </div>

              <div>
                <label for="wizard-test-ans-phrases" class="form-label" style="font-size:0.7rem; color:#94a3b8; margin-bottom:2px; display:block;">🔘 Phrases Test</label>
                <select id="wizard-test-ans-phrases" class="form-control" style="background:#090d16; color:#f8fafc; font-size:0.78rem; height:32px;">
                  <option value="selection" ${prefillPhrasesTestAns === 'selection' ? 'selected' : ''}>🔘 Selection (Pilgan)</option>
                  <option value="written" ${prefillPhrasesTestAns === 'written' ? 'selected' : ''}>✍️ Written (Mengetik)</option>
                  <option value="spoken" ${prefillPhrasesTestAns === 'spoken' ? 'selected' : ''}>🗣️ Spoken (Lisan)</option>
                  <option value="mixed" ${prefillPhrasesTestAns === 'mixed' ? 'selected' : ''}>🔀 Mixed (Campuran)</option>
                </select>
              </div>

              <div>
                <label for="wizard-test-min" class="form-label" style="font-size:0.7rem; color:#94a3b8; margin-bottom:2px; display:block;">🎯 Min. Skor (%)</label>
                <input type="number" id="wizard-test-min" min="1" max="100" value="${escapeHtml(String(prefillTestMin))}" class="form-control" style="background:#090d16; color:#f8fafc; font-weight:700; font-size:0.82rem; height:32px;" title="Batas tuntas kelulusan test" />
                <div style="display:flex; gap:3px; margin-top:4px;">
                  <button type="button" class="btn btn-ghost btn-sm preset-btn" data-target="wizard-test-min" data-val="60" style="font-size:0.65rem; padding:1px 4px; border:1px solid rgba(255,255,255,0.1);">60%</button>
                  <button type="button" class="btn btn-ghost btn-sm preset-btn" data-target="wizard-test-min" data-val="70" style="font-size:0.65rem; padding:1px 4px; border:1px solid rgba(255,255,255,0.1);">70%</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Hidden program ID helper -->
          <input type="hidden" id="wizard-prog-id" value="${window.currentProgId || programs[0].id}" />
        </div>

        <!-- Modal Footer: Action Buttons -->
        <div style="padding:0.85rem 1.25rem; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; background:#1e293b; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn btn-ghost btn-sm" id="wizard-cancel-btn" style="color:#94a3b8; font-size:0.8rem;">Batal</button>
          
          <div style="display:flex; gap:8px;">
            <!-- Action 1: Update Existing Only -->
            <button type="button" class="btn btn-secondary btn-sm" id="wizard-update-only-btn" style="font-size:0.78rem; font-weight:700; color:#38bdf8; border-color:rgba(56,189,248,0.4);">
              ⚡ Update Pengaturan Saja
            </button>

            <!-- Action 2: Generate & Sync All -->
            <button type="button" class="btn btn-primary btn-sm" id="wizard-generate-btn" style="font-size:0.78rem; font-weight:700; background:#4f46e5; border-color:#4f46e5;">
              🚀 Generate &amp; Sinkronkan Soal
            </button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(overlay);

    // Attach Preset Buttons handler
    overlay.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const targetVal = btn.dataset.val;
        const input = overlay.querySelector('#' + targetId);
        if (input) input.value = targetVal;
      });
    });

    const closeOverlay = () => overlay.remove();
    overlay.querySelector('#wizard-close-btn').onclick = closeOverlay;
    overlay.querySelector('#wizard-cancel-btn').onclick = closeOverlay;

    const getWizardConfig = () => {
      const selectedLevels = Array.from(overlay.querySelectorAll('.wizard-level-chk:checked')).map(cb => parseInt(cb.value, 10));
      const progId = overlay.querySelector('#wizard-prog-id').value;
      const category = overlay.querySelector('#wizard-scope-select').value;
      const taskDuration = parseInt(overlay.querySelector('#wizard-task-dur').value, 10) || 5;
      const wordsTaskAnswer = overlay.querySelector('#wizard-task-ans-words') ? overlay.querySelector('#wizard-task-ans-words').value : 'spoken';
      const phrasesTaskAnswer = overlay.querySelector('#wizard-task-ans-phrases') ? overlay.querySelector('#wizard-task-ans-phrases').value : 'spoken';
      const taskPassing = parseInt(overlay.querySelector('#wizard-task-min').value, 10) || 60;
      const wordsTestAnswer = overlay.querySelector('#wizard-test-ans-words').value;
      const phrasesTestAnswer = overlay.querySelector('#wizard-test-ans-phrases').value;
      const testPassing = parseInt(overlay.querySelector('#wizard-test-min').value, 10) || 60;

      return {
        selectedLevels,
        progId,
        category,
        taskDuration,
        wordsTaskAnswer,
        phrasesTaskAnswer,
        taskPassing,
        wordsTestAnswer,
        phrasesTestAnswer,
        testPassing,
        targetClassId: currentClassId
      };
    };

    // 1. UPDATE EXISTING SETTINGS ONLY
    overlay.querySelector('#wizard-update-only-btn').onclick = async () => {
      const cfg = getWizardConfig();
      if (!cfg.targetClassId) {
        if (window.showToast) window.showToast('ID Kelas tidak ditemukan.', 'error');
        return;
      }

      const btn = overlay.querySelector('#wizard-update-only-btn');
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Memperbarui...</span>';

      try {
        const res = await updateClassTestsConfig({
          classId: cfg.targetClassId,
          taskDurationMinutes: cfg.taskDuration,
          wordsTaskAnswerType: cfg.wordsTaskAnswer,
          phrasesTaskAnswerType: cfg.phrasesTaskAnswer,
          taskPassingScore: cfg.taskPassing,
          wordsTestAnswerType: cfg.wordsTestAnswer,
          phrasesTestAnswerType: cfg.phrasesTestAnswer,
          testPassingScore: cfg.testPassing
        });

        overlay.remove();
        const msg = `Pengaturan berhasil diterapkan: ${res.updatedTasks} Task (durasi ${cfg.taskDuration}m, Words: ${cfg.wordsTaskAnswer}, Phrases: ${cfg.phrasesTaskAnswer}), ${res.updatedTests} Test diperbarui!`;
        if (window.showToast) window.showToast(msg, 'success');
        else alert(msg);

        if (onComplete) onComplete(res);
      } catch (err) {
        console.error(err);
        btn.disabled = false;
        btn.innerHTML = '⚡ Update Pengaturan Saja';
        if (window.showToast) window.showToast('Gagal memperbarui: ' + err.message, 'error');
        else alert('Gagal memperbarui: ' + err.message);
      }
    };

    // 2. GENERATE & SYNC ALL FROM BLUEPRINT / VAULT
    overlay.querySelector('#wizard-generate-btn').onclick = async () => {
      const cfg = getWizardConfig();
      if (cfg.selectedLevels.length === 0) {
        if (window.showToast) window.showToast('Pilih setidaknya satu level.', 'error');
        else alert('Pilih setidaknya satu level.');
        return;
      }

      overlay.innerHTML = `
        <div style="background:#0f172a; padding:2.5rem; border-radius:12px; width:440px; text-align:center; font-family:Inter,sans-serif; color:white; border:1px solid rgba(255,255,255,0.15);">
          <div class="spinner" style="margin:0 auto 1.25rem; width:36px; height:36px; border:3px solid rgba(255,255,255,0.2); border-radius:50%; border-top-color:#38bdf8; animation:spin 1s ease-in-out infinite;"></div>
          <h3 style="margin:0 0 6px 0; font-size:1.1rem; font-weight:700;">Men-generate Test Kurikulum</h3>
          <p style="color:#94a3b8; font-size:0.8rem; margin:0; line-height:1.4;">
            Sedang membangun hierarki Task (durasi ${cfg.taskDuration}m, Words: ${cfg.wordsTaskAnswer}, Phrases: ${cfg.phrasesTaskAnswer}) &amp; Test untuk Level ${cfg.selectedLevels.join(', ')} pada kelas ${escapeHtml(className)}...
          </p>
        </div>
      `;

      try {
        const res = await autoGenerateTestsHierarchy(cfg.selectedLevels, {
          programId: cfg.progId,
          explicitClassId: cfg.targetClassId,
          category: cfg.category,
          taskDurationMinutes: cfg.taskDuration,
          wordsTaskAnswerType: cfg.wordsTaskAnswer,
          phrasesTaskAnswerType: cfg.phrasesTaskAnswer,
          taskPassingScore: cfg.taskPassing,
          wordsTestAnswerType: cfg.wordsTestAnswer,
          phrasesTestAnswerType: cfg.phrasesTestAnswer,
          testPassingScore: cfg.testPassing
        });

        overlay.remove();
        const msg = `Auto-Gen Sukses: ${res.tasks} Task (5m), ${res.tests} Test dibuat (${res.updated} disinkronkan)!`;
        if (window.showToast) window.showToast(msg, 'success');
        else alert(msg);

        if (onComplete) onComplete(res);
      } catch (err) {
        overlay.remove();
        console.error(err);
        if (window.showToast) window.showToast('Auto-Generate Gagal: ' + err.message, 'error');
        else alert('Auto-Generate Gagal: ' + err.message);
      }
    };

  } catch (err) {
    if (loading.parentNode) loading.remove();
    console.error(err);
    if (window.showToast) window.showToast(err.message, 'error');
    else alert(err.message);
  }
}
