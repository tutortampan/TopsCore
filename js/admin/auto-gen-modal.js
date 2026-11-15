export async function openAutoGenerateModal(options = {}) {
  const { 
    fetchInstitutions, 
    fetchPrograms, 
    autoGenerateTestsHierarchy, 
    updateClassTestsConfig,
    calculateAutoDurationMinutes,
    adminFetchAll, 
    toShortLevel,
    escapeHtml, 
    escHtml 
  } = await import('../api.js?v=20261114_v517');
  const { getSupabase } = await import('../supabase.js?v=20261027c');
  const { getSvgIcon } = await import('../svg-icons.js?v=20261114_v487');

  const { 
    availableLevels = [], 
    preSelectedLevels = [], 
    explicitClassId = null, 
    onComplete = null 
  } = options;

  // Show canonical centered loading indicator while preparing modal data
  const loading = document.createElement('div');
  loading.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.85);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;color:white;';
  loading.innerHTML = `
    <div class="topscore-loading-center" style="min-height: 140px !important;">
      <div class="spinner"></div>
      <p class="loading-text">Preparing Test Generator...</p>
    </div>
  `;
  document.body.appendChild(loading);

  try {
    const [institutions, allClasses] = await Promise.all([
      fetchInstitutions(),
      adminFetchAll('classes', 'id, name, program_id, level_id').catch(() => [])
    ]);

    // Determine current active class first
    const currentClassId = explicitClassId || window._selectedClassId || localStorage.getItem('topscore_selected_class_id');
    const matchedClass = allClasses.find(c => String(c.id) === String(currentClassId));
    const className = matchedClass ? matchedClass.name : 'Vocabulary Class';

    let instId = matchedClass?.institution_id || (institutions.length > 0 ? institutions[0].id : null);
    let programs = [];
    if (instId) {
      try { programs = await fetchPrograms(instId); } catch (_) {}
    }
    if (!programs.length && institutions.length > 0) {
      try { programs = await fetchPrograms(institutions[0].id); } catch (_) {}
    }

    loading.remove();

    // Default task durations based on empirical pacing data (Phase 219):
    // Words Task (40 Qs, spoken): students need ~27s/q → 15 minutes
    // Phrases Task (10 Qs, spoken): students need ~37s/q → 10 minutes
    // Prefill is overridden below if existing class tests have a recorded duration.
    let prefillTaskDur = 15;
    let prefillWordsTaskDur = 15;
    let prefillPhrasesTaskDur = 10;
    let prefillWordsTaskAns = 'spoken';
    let prefillPhrasesTaskAns = 'spoken';
    let prefillTaskMin = 60;
    let prefillWordsTestAns = 'spoken';
    let prefillPhrasesTestAns = 'selection';
    let prefillTestMin = 60;

    if (currentClassId) {
      try {
        const sb = await getSupabase();
        const { data: existingAsms } = await sb
          .from('tests')
          .select('test_type, category, payload, shell_code, title, answer_type, working_duration_minutes, minimum_required_score')
          .eq('class_id', currentClassId)
          .is('deleted_at', null)
          .limit(40);

        if (existingAsms && existingAsms.length > 0) {
          for (const a of existingAsms) {
            const isTest = String(a.category || a.test_type).toUpperCase() === 'EXAM'
              || String(a.category || a.test_type).toUpperCase() === 'TEST' 
              || String(a.test_type).toLowerCase() === 'exam' 
              || (a.shell_code && (a.shell_code.endsWith('-EXAM') || a.shell_code.endsWith('-TEST')));
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
              if (dur) {
                if (isPhrase) prefillPhrasesTaskDur = dur;
                else prefillWordsTaskDur = dur;
                prefillTaskDur = dur;
              }
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
              <span style="font-size: 16px; display:inline-flex; align-items:center;">${getSvgIcon('zap', 16)}</span>
              <h3 style="margin:0; font-size: 16px; font-weight:700; color:#f8fafc;">Test Generator &amp; Blueprint Wizard</h3>
            </div>
            <div style="font-size: 12px; color:#94a3b8; margin-top:2px;">
              Konfigurasi blueprint kurikulum, durasi task, cara jawab, dan passing score.
            </div>
          </div>
        </div>

        <!-- Modal Body (Scrollable) -->
        <div style="padding:1.1rem 1.25rem; overflow-y:auto; flex:1; display:flex; flex-direction:column; gap:14px;">
          
          <!-- Locked Class Context Banner -->
          <div style="background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.25); border-radius:8px; padding:8px 12px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size: 16px; display:inline-flex; align-items:center;">${getSvgIcon('book-open', 16)}</span>
              <div>
                <div style="font-size: 12px; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.04em;">KELAS TARGET (TERKUNCI &amp; AMAN)</div>
                <div style="font-size: 12px; font-weight:700; color:#f8fafc;">${escapeHtml(className)}</div>
              </div>
            </div>
            <span class="badge" style="background:#0284c7; color:#ffffff; font-size: 12px; font-weight:700; padding:2px 8px; border-radius:6px;">LOCKED</span>
          </div>

          <!-- Section 1: Target Level & Program -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div>
              <label class="form-label" style="font-size: 12px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:4px; display:block;">Select Level:</label>
              <div style="display:flex; flex-wrap:wrap; gap:8px; background:#090d16; padding:6px 10px; border:1px solid rgba(255,255,255,0.08); border-radius:6px;">
                ${displayLevels.map(lvl => `
                  <label style="display:inline-flex; align-items:center; gap:4px; font-size: 12px; cursor:pointer; color:#e2e8f0;">
                    <input type="checkbox" class="wizard-level-chk" value="${lvl}" ${preSelectedLevels.includes(lvl) || preSelectedLevels.length === 0 ? 'checked' : ''} /> ${typeof toShortLevel === 'function' ? toShortLevel(lvl) : lvl}
                  </label>
                `).join('')}
              </div>
            </div>

            <div>
              <label for="wizard-scope-select" class="form-label" style="font-size: 12px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:4px; display:block;">Category Scope:</label>
              <select id="wizard-scope-select" class="form-control" style="background:#090d16; color:#f8fafc; border:1px solid rgba(255,255,255,0.08); font-size: 12px; height:34px;">
                <option value="all" selected>● All (Words &amp; Phrases — 40 Questions)</option>
                <option value="words">○ Words Only (20 Questions)</option>
                <option value="phrases">○ Phrases Only (20 Questions)</option>
              </select>
            </div>
          </div>

          <!-- Section 2: Task Configuration -->
          <div style="background:#1e293b; border:1px solid rgba(var(--grade-c-rgb),0.25); border-radius:8px; padding:10px 12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size: 12px; font-weight:800; color:var(--grade-c); display:inline-flex; align-items:center; gap:4px;">
                ${getSvgIcon('zap', 14)} 1. TASK SETTINGS (TASKS)
              </span>
              <span class="badge" style="background:rgba(var(--grade-c-rgb),0.15); color:var(--grade-c); font-size: 12px; font-weight:700;">Mandiri</span>
            </div>

            <!-- Row 1: Separate Durations (Words vs Phrases) & Passing Score -->
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px;">
              <div>
                <label for="wizard-task-words-pace" class="form-label" style="font-size: 12px; color:var(--grade-c); font-weight:700; margin-bottom:2px; display:block;">
                  Words Task (<span id="words-task-calc-dur">10m</span>)
                </label>
                <div style="display:flex; align-items:center; gap:4px;">
                  <input type="number" id="wizard-task-words-pace" min="5" max="60" value="15" class="form-control" style="background:#090d16; color:#f8fafc; font-weight:700; font-size: 12px; height:32px; width:70px;" title="Detik per kata (default 15s)" />
                  <span style="font-size: 12px; color:#94a3b8;">detik/soal</span>
                </div>
                <div style="display:flex; gap:3px; margin-top:4px;">
                  <button type="button" class="btn btn-ghost btn-sm pace-preset-btn" data-target="wizard-task-words-pace" data-val="10" style="font-size: 12px; padding:1px 4px; border:1px solid rgba(255,255,255,0.1);">10s</button>
                  <button type="button" class="btn btn-ghost btn-sm pace-preset-btn" data-target="wizard-task-words-pace" data-val="15" style="font-size: 12px; padding:1px 4px; border:1px solid rgba(255,255,255,0.1);">15s</button>
                  <button type="button" class="btn btn-ghost btn-sm pace-preset-btn" data-target="wizard-task-words-pace" data-val="20" style="font-size: 12px; padding:1px 4px; border:1px solid rgba(255,255,255,0.1);">20s</button>
                </div>
                <input type="hidden" id="wizard-task-words-dur" value="${escapeHtml(String(prefillWordsTaskDur || 10))}" />
              </div>

              <div>
                <label for="wizard-task-phrases-pace" class="form-label" style="font-size: 12px; color:var(--grade-c); font-weight:700; margin-bottom:2px; display:block;">
                  Phrases Task (<span id="phrases-task-calc-dur">5m</span>)
                </label>
                <div style="display:flex; align-items:center; gap:4px;">
                  <input type="number" id="wizard-task-phrases-pace" min="5" max="60" value="20" class="form-control" style="background:#090d16; color:#f8fafc; font-weight:700; font-size: 12px; height:32px; width:70px;" title="Detik per frase (default 20s)" />
                  <span style="font-size: 12px; color:#94a3b8;">detik/soal</span>
                </div>
                <div style="display:flex; gap:3px; margin-top:4px;">
                  <button type="button" class="btn btn-ghost btn-sm pace-preset-btn" data-target="wizard-task-phrases-pace" data-val="15" style="font-size: 12px; padding:1px 4px; border:1px solid rgba(255,255,255,0.1);">15s</button>
                  <button type="button" class="btn btn-ghost btn-sm pace-preset-btn" data-target="wizard-task-phrases-pace" data-val="20" style="font-size: 12px; padding:1px 4px; border:1px solid rgba(255,255,255,0.1);">20s</button>
                  <button type="button" class="btn btn-ghost btn-sm pace-preset-btn" data-target="wizard-task-phrases-pace" data-val="30" style="font-size: 12px; padding:1px 4px; border:1px solid rgba(255,255,255,0.1);">30s</button>
                </div>
                <input type="hidden" id="wizard-task-phrases-dur" value="${escapeHtml(String(prefillPhrasesTaskDur || 5))}" />
              </div>

              <div>
                <label for="wizard-task-min" class="form-label" style="font-size: 12px; color:#94a3b8; margin-bottom:2px; display:block;">Min. Skor (%)</label>
                <input type="number" id="wizard-task-min" min="1" max="100" value="${escapeHtml(String(prefillTaskMin))}" class="form-control" style="background:#090d16; color:#f8fafc; font-weight:700; font-size: 12px; height:32px;" title="Batas tuntas kelulusan task" />
                <div style="display:flex; gap:3px; margin-top:4px;">
                  <button type="button" class="btn btn-ghost btn-sm preset-btn" data-target="wizard-task-min" data-val="60" style="font-size: 12px; padding:1px 4px; border:1px solid rgba(255,255,255,0.1);">60%</button>
                  <button type="button" class="btn btn-ghost btn-sm preset-btn" data-target="wizard-task-min" data-val="70" style="font-size: 12px; padding:1px 4px; border:1px solid rgba(255,255,255,0.1);">70%</button>
                </div>
              </div>
            </div>

            <!-- Row 2: Cara Jawab Terpisah (Words Task vs Phrases Task) -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; background:rgba(0,0,0,0.22); padding:8px 10px; border-radius:6px; border:1px solid rgba(var(--grade-c-rgb),0.2);">
              <div>
                <label for="wizard-task-ans-words" class="form-label" style="font-size: 12px; color:var(--grade-c); font-weight:700; margin-bottom:2px; display:block;">Words Task</label>
                <select id="wizard-task-ans-words" class="form-control" style="background:#090d16; color:#f8fafc; font-size: 12px; height:32px;">
                  <option value="spoken" ${prefillWordsTaskAns === 'spoken' ? 'selected' : ''}>Spoken (Lisan / 15s)</option>
                  <option value="written" ${prefillWordsTaskAns === 'written' ? 'selected' : ''}>Written (Mengetik / 30s)</option>
                  <option value="selection" ${prefillWordsTaskAns === 'selection' ? 'selected' : ''}>Selection (Pilgan / 20s)</option>
                  <option value="mixed" ${prefillWordsTaskAns === 'mixed' ? 'selected' : ''}>Mixed (Campuran / 25s)</option>
                </select>
              </div>

              <div>
                <label for="wizard-task-ans-phrases" class="form-label" style="font-size: 12px; color:var(--grade-c); font-weight:700; margin-bottom:2px; display:block;">Phrases Task</label>
                <select id="wizard-task-ans-phrases" class="form-control" style="background:#090d16; color:#f8fafc; font-size: 12px; height:32px;">
                  <option value="spoken" ${prefillPhrasesTaskAns === 'spoken' ? 'selected' : ''}>Spoken (Lisan / 20s)</option>
                  <option value="written" ${prefillPhrasesTaskAns === 'written' ? 'selected' : ''}>Written (Mengetik / 30s)</option>
                  <option value="selection" ${prefillPhrasesTaskAns === 'selection' ? 'selected' : ''}>Selection (Pilgan / 20s)</option>
                  <option value="mixed" ${prefillPhrasesTaskAns === 'mixed' ? 'selected' : ''}>Mixed (Campuran / 25s)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Section 3: Exam Configuration (Auto-Calibrated Duration & Session Governed) -->
          <div style="background:#1e293b; border:1px solid rgba(251,191,36,0.25); border-radius:8px; padding:10px 12px; display:flex; flex-direction:column; gap:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size: 12px; font-weight:800; color:var(--grade-c); display:inline-flex; align-items:center; gap:4px;">
                ${getSvgIcon('clipboard', 14)} 2. EXAM SETTINGS (EXAMS)
              </span>
              <span class="badge" style="background:rgba(251,191,36,0.15); color:var(--grade-c); font-size: 12px; font-weight:700;">Exam Sessions</span>
            </div>

            <!-- Dynamic Session Duration Callout -->
            <div style="background:rgba(0,0,0,0.3); border-left:3px solid var(--grade-c); padding:6px 10px; border-radius:4px; font-size: 12px; color:#cbd5e1; line-height:1.35;">
              <strong>Durasi Exam:</strong> Dihitung otomatis per detik/soal sesuai tema kumulatif (Words: 15s/item, Phrases: 20s/item). Sesi live tutor juga dapat menetapkan alokasi waktu sendiri saat membuka ujian.
            </div>

            <div style="display:grid; grid-template-columns:1.2fr 1.2fr 1fr; gap:8px;">
              <div>
                <label for="wizard-test-ans-words" class="form-label" style="font-size: 12px; color:#94a3b8; margin-bottom:2px; display:block;">Words Exam</label>
                <select id="wizard-test-ans-words" class="form-control" style="background:#090d16; color:#f8fafc; font-size: 12px; height:32px;">
                  <option value="spoken" ${prefillWordsTestAns === 'spoken' ? 'selected' : ''}>Spoken (Lisan / 15s)</option>
                  <option value="selection" ${prefillWordsTestAns === 'selection' ? 'selected' : ''}>Selection (Pilgan / 20s)</option>
                  <option value="written" ${prefillWordsTestAns === 'written' ? 'selected' : ''}>Written (Mengetik / 30s)</option>
                  <option value="mixed" ${prefillWordsTestAns === 'mixed' ? 'selected' : ''}>Mixed (Campuran / 25s)</option>
                </select>
                <div style="display:flex; align-items:center; gap:4px; margin-top:4px;">
                  <input type="number" id="wizard-exam-words-pace" min="5" max="60" value="15" class="form-control" style="background:#090d16; color:#f8fafc; font-weight:700; font-size: 12px; height:26px; width:55px;" title="Detik per kata untuk exam" />
                  <span style="font-size: 12px; color:#94a3b8;">detik/soal</span>
                </div>
              </div>

              <div>
                <label for="wizard-test-ans-phrases" class="form-label" style="font-size: 12px; color:#94a3b8; margin-bottom:2px; display:block;">Phrases Exam</label>
                <select id="wizard-test-ans-phrases" class="form-control" style="background:#090d16; color:#f8fafc; font-size: 12px; height:32px;">
                  <option value="selection" ${prefillPhrasesTestAns === 'selection' ? 'selected' : ''}>Selection (Pilgan / 20s)</option>
                  <option value="written" ${prefillPhrasesTestAns === 'written' ? 'selected' : ''}>Written (Mengetik / 30s)</option>
                  <option value="spoken" ${prefillPhrasesTestAns === 'spoken' ? 'selected' : ''}>Spoken (Lisan / 20s)</option>
                  <option value="mixed" ${prefillPhrasesTestAns === 'mixed' ? 'selected' : ''}>Mixed (Campuran / 25s)</option>
                </select>
                <div style="display:flex; align-items:center; gap:4px; margin-top:4px;">
                  <input type="number" id="wizard-exam-phrases-pace" min="5" max="60" value="20" class="form-control" style="background:#090d16; color:#f8fafc; font-weight:700; font-size: 12px; height:26px; width:55px;" title="Detik per frase untuk exam" />
                  <span style="font-size: 12px; color:#94a3b8;">detik/soal</span>
                </div>
              </div>

              <div>
                <label for="wizard-test-min" class="form-label" style="font-size: 12px; color:#94a3b8; margin-bottom:2px; display:block;">Min. Skor (%)</label>
                <input type="number" id="wizard-test-min" min="1" max="100" value="${escapeHtml(String(prefillTestMin))}" class="form-control" style="background:#090d16; color:#f8fafc; font-weight:700; font-size: 12px; height:32px;" title="Batas tuntas kelulusan exam" />
                <div style="display:flex; gap:3px; margin-top:4px;">
                  <button type="button" class="btn btn-ghost btn-sm preset-btn" data-target="wizard-test-min" data-val="60" style="font-size: 12px; padding:1px 4px; border:1px solid rgba(255,255,255,0.1);">60%</button>
                  <button type="button" class="btn btn-ghost btn-sm preset-btn" data-target="wizard-test-min" data-val="70" style="font-size: 12px; padding:1px 4px; border:1px solid rgba(255,255,255,0.1);">70%</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Hidden program and institution ID helpers -->
          <input type="hidden" id="wizard-prog-id" value="${matchedClass?.program_id || window.currentProgId || programs[0]?.id || ''}" />
          <input type="hidden" id="wizard-inst-id" value="${matchedClass?.institution_id || ''}" />
        </div>

        <!-- Modal Footer: Action Buttons -->
        <div style="padding:0.85rem 1.25rem; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; background:#1e293b; gap:8px; flex-wrap:wrap;">
          <button type="button" class="btn btn-ghost btn-sm btn-modal-close-left" id="wizard-cancel-btn" style="color:#94a3b8; font-size: 12px;">Cancel</button>
          
          <div style="display:flex; gap:8px;">
            <!-- Action 1: Update Existing Only -->
            <button type="button" class="btn btn-secondary btn-sm" id="wizard-update-only-btn" style="font-size: 12px; font-weight:700; color:#38bdf8; border-color:rgba(56,189,248,0.4); display:inline-flex; align-items:center; gap:5px;">
              ${getSvgIcon('zap', 14)} Update Settings Only
            </button>

            <!-- Action 2: Generate & Sync All -->
            <button type="button" class="btn btn-purple btn-sm" id="wizard-generate-btn" style="font-size: 12px; font-weight:700; display:inline-flex; align-items:center; gap:5px;">
              ${getSvgIcon('zap', 14)} Generate &amp; Sinkronkan Soal
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
        if (input) {
          input.value = targetVal;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });

    overlay.querySelectorAll('.pace-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.dataset.target;
        const targetVal = btn.dataset.val;
        const input = overlay.querySelector('#' + targetId);
        if (input) {
          input.value = targetVal;
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });

    // Real-time Duration Auto-Calibration
    const recalculateDurations = () => {
      const wordsAns = overlay.querySelector('#wizard-task-ans-words')?.value || 'spoken';
      const phrasesAns = overlay.querySelector('#wizard-task-ans-phrases')?.value || 'spoken';
      const wordsPace = parseInt(overlay.querySelector('#wizard-task-words-pace')?.value, 10) || 15;
      const phrasesPace = parseInt(overlay.querySelector('#wizard-task-phrases-pace')?.value, 10) || 20;

      const wordsDur = calculateAutoDurationMinutes(40, wordsAns, 'words', wordsPace);
      const phrasesDur = calculateAutoDurationMinutes(10, phrasesAns, 'phrases', phrasesPace, 5);

      const wordsDurBadge = overlay.querySelector('#words-task-calc-dur');
      if (wordsDurBadge) wordsDurBadge.textContent = wordsDur + 'm';
      const wordsDurInput = overlay.querySelector('#wizard-task-words-dur');
      if (wordsDurInput) wordsDurInput.value = wordsDur;

      const phrasesDurBadge = overlay.querySelector('#phrases-task-calc-dur');
      if (phrasesDurBadge) phrasesDurBadge.textContent = phrasesDur + 'm';
      const phrasesDurInput = overlay.querySelector('#wizard-task-phrases-dur');
      if (phrasesDurInput) phrasesDurInput.value = phrasesDur;
    };

    // Live Event Listeners for real-time recalculation
    ['wizard-task-words-pace', 'wizard-task-phrases-pace'].forEach(id => {
      const el = overlay.querySelector('#' + id);
      if (el) {
        el.addEventListener('input', recalculateDurations);
        el.addEventListener('change', recalculateDurations);
      }
    });

    overlay.querySelector('#wizard-task-ans-words')?.addEventListener('change', (e) => {
      const val = e.target.value;
      const paceInput = overlay.querySelector('#wizard-task-words-pace');
      if (paceInput) {
        if (val === 'spoken') paceInput.value = 15;
        else if (val === 'written') paceInput.value = 30;
        else if (val === 'selection') paceInput.value = 20;
        else if (val === 'mixed') paceInput.value = 25;
      }
      recalculateDurations();
    });

    overlay.querySelector('#wizard-task-ans-phrases')?.addEventListener('change', (e) => {
      const val = e.target.value;
      const paceInput = overlay.querySelector('#wizard-task-phrases-pace');
      if (paceInput) {
        if (val === 'spoken') paceInput.value = 20;
        else if (val === 'written') paceInput.value = 30;
        else if (val === 'selection') paceInput.value = 20;
        else if (val === 'mixed') paceInput.value = 25;
      }
      recalculateDurations();
    });

    // Run initial calibration
    recalculateDurations();

    const closeOverlay = () => overlay.remove();
    overlay.querySelector('#wizard-cancel-btn').onclick = closeOverlay;

    const getWizardConfig = () => {
      const selectedLevels = Array.from(overlay.querySelectorAll('.wizard-level-chk:checked')).map(cb => parseInt(cb.value, 10));
      const progId = overlay.querySelector('#wizard-prog-id').value;
      const institutionId = overlay.querySelector('#wizard-inst-id')?.value || null;
      const category = overlay.querySelector('#wizard-scope-select').value;
      const durEl = overlay.querySelector('#wizard-task-dur') || overlay.querySelector('#wizard-task-dur');
      const wordsDurEl = overlay.querySelector('#wizard-task-words-dur');
      const phrasesDurEl = overlay.querySelector('#wizard-task-phrases-dur');
      const minEl = overlay.querySelector('#wizard-task-min') || overlay.querySelector('#wizard-task-min');
      const wordsAnsEl = overlay.querySelector('#wizard-task-ans-words') || overlay.querySelector('#wizard-task-ans-words');
      const phrasesAnsEl = overlay.querySelector('#wizard-task-ans-phrases') || overlay.querySelector('#wizard-task-ans-phrases');

      const wordsPace = parseInt(overlay.querySelector('#wizard-task-words-pace')?.value, 10) || 15;
      const phrasesPace = parseInt(overlay.querySelector('#wizard-task-phrases-pace')?.value, 10) || 20;
      const wordsExamPace = parseInt(overlay.querySelector('#wizard-exam-words-pace')?.value, 10) || 15;
      const phrasesExamPace = parseInt(overlay.querySelector('#wizard-exam-phrases-pace')?.value, 10) || 20;

      const wordsQuizAnswer = wordsAnsEl ? wordsAnsEl.value : 'spoken';
      const phrasesQuizAnswer = phrasesAnsEl ? phrasesAnsEl.value : 'spoken';

      const wordsQuizDuration = parseInt(wordsDurEl?.value, 10) || calculateAutoDurationMinutes(40, wordsQuizAnswer, 'words', wordsPace);
      const phrasesQuizDuration = parseInt(phrasesDurEl?.value, 10) || calculateAutoDurationMinutes(10, phrasesQuizAnswer, 'phrases', phrasesPace, 5);
      const quizDuration = wordsQuizDuration;
      const quizPassing = parseInt(minEl?.value, 10) || 60;
      const wordsTestAnswer = overlay.querySelector('#wizard-test-ans-words').value;
      const phrasesTestAnswer = overlay.querySelector('#wizard-test-ans-phrases').value;
      const testPassing = parseInt(overlay.querySelector('#wizard-test-min').value, 10) || 60;

      return {
        selectedLevels,
        progId,
        institutionId,
        category,
        quizDuration,
        taskDuration: quizDuration,
        wordsTaskDuration: wordsQuizDuration,
        phrasesTaskDuration: phrasesQuizDuration,
        wordsTaskPaceSeconds: wordsPace,
        phrasesTaskPaceSeconds: phrasesPace,
        wordsExamPaceSeconds: wordsExamPace,
        phrasesExamPaceSeconds: phrasesExamPace,
        wordsQuizAnswer,
        wordsTaskAnswer: wordsQuizAnswer,
        phrasesQuizAnswer,
        phrasesTaskAnswer: phrasesQuizAnswer,
        quizPassing,
        taskPassing: quizPassing,
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
        if (window.showToast) window.showToast('Class ID not found.', 'error');
        return;
      }

      const btn = overlay.querySelector('#wizard-update-only-btn');
      btn.disabled = true;
      btn.innerHTML = '<span>⏳ Updating...</span>';

      try {
        const res = await updateClassTestsConfig({
          classId: cfg.targetClassId,
          taskDurationMinutes: cfg.taskDuration,
          wordsTaskDurationMinutes: cfg.wordsTaskDuration,
          phrasesTaskDurationMinutes: cfg.phrasesTaskDuration,
          wordsTaskPaceSeconds: cfg.wordsTaskPaceSeconds,
          phrasesTaskPaceSeconds: cfg.phrasesTaskPaceSeconds,
          wordsExamPaceSeconds: cfg.wordsExamPaceSeconds,
          phrasesExamPaceSeconds: cfg.phrasesExamPaceSeconds,
          wordsTaskAnswerType: cfg.wordsTaskAnswer,
          phrasesTaskAnswerType: cfg.phrasesTaskAnswer,
          taskPassingScore: cfg.taskPassing,
          wordsTestAnswerType: cfg.wordsTestAnswer,
          phrasesTestAnswerType: cfg.phrasesTestAnswer,
          testPassingScore: cfg.testPassing
        });

        overlay.remove();
        const msg = `Settings successfully applied: ${res.updatedTasks} Tasks (Words: ${cfg.wordsTaskDuration}m, Phrases: ${cfg.phrasesTaskDuration}m), ${res.updatedTests} Exams updated!`;
        if (window.showToast) window.showToast(msg, 'success');
        else alert(msg);

        if (onComplete) onComplete(res);
      } catch (err) {
        console.error(err);
        btn.disabled = false;
        btn.innerHTML = `${getSvgIcon('zap', 14)} Update Settings Only`;
        if (window.showToast) window.showToast('Failed to update: ' + err.message, 'error');
        else alert('Failed to update: ' + err.message);
      }
    };

    // 2. GENERATE & SYNC ALL FROM BLUEPRINT / VAULT
    overlay.querySelector('#wizard-generate-btn').onclick = async () => {
      const cfg = getWizardConfig();
      if (cfg.selectedLevels.length === 0) {
        if (window.showToast) window.showToast('Please select at least one level.', 'error');
        else alert('Please select at least one level.');
        return;
      }

      overlay.innerHTML = `
        <div style="background:#0f172a; padding:2rem 2.5rem; border-radius:12px; width:440px; text-align:center; font-family:Inter,sans-serif; color:white; border:1px solid rgba(255,255,255,0.15); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
          <div class="topscore-loading-center" style="min-height: 120px !important;">
            <div class="spinner"></div>
            <h3 style="margin:0 0 6px 0; font-size: 16px; font-weight:700; color:#f8fafc;">Generating Curriculum Tests</h3>
            <p style="color:#94a3b8; font-size: 12px; margin:0; line-height:1.4;">
              Building Task hierarchy (Words: ${cfg.wordsTaskDuration}m, Phrases: ${cfg.phrasesTaskDuration}m) &amp; Exams for Level ${cfg.selectedLevels.join(', ')} in class ${escapeHtml(className)}...
            </p>
          </div>
        </div>
      `;

      try {
        const res = await autoGenerateTestsHierarchy(cfg.selectedLevels, {
          programId: cfg.progId,
          institutionId: cfg.institutionId,
          explicitClassId: cfg.targetClassId,
          category: cfg.category,
          taskDurationMinutes: cfg.taskDuration,
          wordsTaskDurationMinutes: cfg.wordsTaskDuration,
          phrasesTaskDurationMinutes: cfg.phrasesTaskDuration,
          wordsTaskPaceSeconds: cfg.wordsTaskPaceSeconds,
          phrasesTaskPaceSeconds: cfg.phrasesTaskPaceSeconds,
          wordsExamPaceSeconds: cfg.wordsExamPaceSeconds,
          phrasesExamPaceSeconds: cfg.phrasesExamPaceSeconds,
          wordsTaskAnswerType: cfg.wordsTaskAnswer,
          phrasesTaskAnswerType: cfg.phrasesTaskAnswer,
          taskPassingScore: cfg.taskPassing,
          wordsTestAnswerType: cfg.wordsTestAnswer,
          phrasesTestAnswerType: cfg.phrasesTestAnswer,
          testPassingScore: cfg.testPassing
        });

        overlay.remove();
        const msg = `Auto-Gen Success: ${res.tasks ?? 0} Tasks, ${res.exams ?? 0} Exams created (${res.updated ?? 0} synchronized)!`;
        if (window.showToast) window.showToast(msg, 'success');
        else alert(msg);

        if (onComplete) onComplete(res);
      } catch (err) {
        overlay.remove();
        console.error(err);
        if (window.showToast) window.showToast('Auto-Generate Failed: ' + err.message, 'error');
        else alert('Auto-Generate Failed: ' + err.message);
      }
    };

  } catch (err) {
    if (loading.parentNode) loading.remove();
    console.error(err);
    if (window.showToast) window.showToast(err.message, 'error');
    else alert(err.message);
  }
}
