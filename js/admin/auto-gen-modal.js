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
    const [institutions, allClasses, allLevels] = await Promise.all([
      fetchInstitutions(),
      adminFetchAll('classes', 'id, name, program_id, level_id').catch(() => []),
      adminFetchAll('levels', 'id, name, level_number').catch(() => [])
    ]);

    // Determine current active class and strict level binding
    const isExplicitClass = Boolean(explicitClassId);
    const currentClassId = explicitClassId || window._selectedClassId || localStorage.getItem('topscore_selected_class_id');
    const matchedClass = allClasses.find(c => String(c.id) === String(currentClassId));
    const className = matchedClass ? matchedClass.name : 'Vocabulary Class';

    let matchedLevel = null;
    let matchedLevelNum = null;
    if (matchedClass && matchedClass.level_id) {
      matchedLevel = (allLevels || []).find(l => String(l.id) === String(matchedClass.level_id));
      if (matchedLevel && matchedLevel.level_number != null) {
        matchedLevelNum = Number(matchedLevel.level_number);
      }
    }
    if (matchedLevelNum == null && matchedClass) {
      const match = String(matchedClass.code || matchedClass.name || '').match(/(\d+)/);
      if (match) matchedLevelNum = Number(match[1]);
      else if (/evnikom|sheraton|tamata/i.test(matchedClass.name || '')) matchedLevelNum = 0;
    }

    // Class-scoped mode: locked to that specific class and its intrinsic level
    const isClassScoped = Boolean(matchedClass && matchedLevelNum != null && isExplicitClass);
    const isLevel2 = isClassScoped && (matchedLevelNum === 2);

    // ── Triple-Lock Lapis 2: Infer class modality from code/name (SSOT §2.5.3) ──
    // Mirrors detectClassDiscipline in grading.js without importing (avoid circular dep)
    function inferClassModality(classObj) {
      if (!classObj) return 'VOCABULARY';
      const code = String(classObj.code || '').toUpperCase();
      const name = String(classObj.name || '').toLowerCase();
      if (/-([0-9]*VCB|VOCAB)\b/.test(code) || /\b(vocab|vocabulary)\b/.test(name)) return 'VOCABULARY';
      if (/-([0-9]*BSC|BASIC)\b/.test(code) || /\bbasic(\s*english)?\b/.test(name)) return 'BASIC';
      if (/-([0-9]*SPK|SPEAK)\b/.test(code) || /\b(speaking|public\s*speaking)\b/.test(name)) return 'SPEAKING';
      if (/-([0-9]*STT|STORY)\b/.test(code) || /\b(storytelling|story)\b/.test(name)) return 'STORYTELLING';
      if (/-([0-9]*GRM|GRAM|GRMMR)\b/.test(code) || /\bgrammar\b/.test(name)) return 'GRAMMAR';
      if (/-([0-9]*PRN|PRON|PRONC)\b/.test(code) || /\bpronunciation\b/.test(name)) return 'PRONUNCIATION';
      if (/-([0-9]*GFS|GFORS)\b/.test(code) || /\bgrammar\s*for\s*speaking\b/.test(name)) return 'GFS';
      return 'VOCABULARY'; // safe default
    }
    const classModality = inferClassModality(matchedClass);
    const isVocabularyModal = classModality === 'VOCABULARY';
    const isNonVocabularyModal = !isVocabularyModal;

    let instId = matchedClass?.institution_id || (institutions.length > 0 ? institutions[0].id : null);
    let programs = [];
    if (instId) {
      try { programs = await fetchPrograms(instId); } catch (_) {}
    }
    if (!programs.length && institutions.length > 0) {
      try { programs = await fetchPrograms(institutions[0].id); } catch (_) {}
    }

    loading.remove();

    // Default task durations based on SSOT pacing data (DECISION-062):
    // Words Task (40 Qs @ 10s/q): 400s -> 7 minutes
    // Phrases Task (10 Qs @ 20s/q): 200s -> 4 minutes
    // Prefill is overridden below if existing class tests have a recorded duration.
    let prefillTaskDur = 7;
    let prefillWordsTaskDur = 7;
    let prefillPhrasesTaskDur = 4;
    let prefillWordsTaskAns = 'spoken';
    let prefillPhrasesTaskAns = 'spoken';
    let prefillTaskMin = 60;
    let prefillWordsTestAns = 'spoken';
    let prefillPhrasesTestAns = 'selection';
    let prefillTestMin = 60;

    if (currentClassId) {
      try {
        if (typeof window.fetchClassTestSettings === 'function') {
          const classRules = await window.fetchClassTestSettings(currentClassId);
          if (classRules) {
            prefillTaskMin = classRules.taskMinScore || 60;
            prefillTestMin = classRules.examMinScore || 60;
          }
        }
      } catch (_) {}

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
    overlay.className = 'topscore-modal-overlay modal-backdrop';
    overlay.id = 'test-generator-wizard-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:10px;box-sizing:border-box;animation:fadeIn 0.15s ease-out;';

    // Fallback to basic levels if none provided
    const displayLevels = availableLevels.length ? availableLevels : [0, 1, 2, 3];

    overlay.innerHTML = `
      <style>
        #test-generator-wizard-overlay .modal-card {
          background: #0f172a; border: 1.5px solid rgba(255,255,255,0.16) !important; border-radius: 12px;
          width: 640px; max-width: 96%; color: #f8fafc; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.7);
          max-height: 80vh !important; display: flex; flex-direction: column; overflow: hidden;
        }
        #test-generator-wizard-overlay .title-area {
          height: 60px !important; min-height: 60px !important; max-height: 60px !important; flex-shrink: 0 !important;
          border-bottom: 1.5px solid rgba(255,255,255,0.16) !important;
          border-left: 4px solid #38bdf8 !important;
          display: flex; align-items: center; justify-content: flex-start;
          background: linear-gradient(90deg, rgba(56, 189, 248, 0.38) 0%, rgba(56, 189, 248, 0.12) 55%, rgba(15, 23, 42, 0.95) 100%) !important;
          box-sizing: border-box; padding: 0 16px; gap: 12px;
        }
        #test-generator-wizard-overlay .title-icon-box {
          width: 34px !important; height: 34px !important; border-radius: 8px !important;
          display: inline-flex !important; align-items: center !important; justify-content: center !important;
          flex-shrink: 0 !important; background: rgba(56, 189, 248, 0.18) !important;
          border: 1.5px solid rgba(56, 189, 248, 0.5) !important; color: #38bdf8 !important;
        }
        #test-generator-wizard-overlay .title-area h2 {
          margin: 0; font-family: var(--fm-font-display, 'Inter', sans-serif);
          font-size: 16px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.04em; color: #ffffff; text-align: left;
        }
        #test-generator-wizard-overlay .modal-body {
          padding: 10px !important; overflow-y: auto; max-height: calc(80vh - 120px);
          display: flex; flex-direction: column; gap: 10px; box-sizing: border-box;
        }
        #test-generator-wizard-overlay .wizard-card {
          background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 10px;
          box-sizing: border-box;
        }
        #test-generator-wizard-overlay .wizard-card-task {
          border-color: rgba(var(--grade-b-rgb, 149, 255, 0), 0.35);
        }
        #test-generator-wizard-overlay .wizard-card-task .wizard-card-title {
          font-family: var(--fm-font-display, 'Inter', sans-serif);
          font-size: 12px; font-weight: 800; color: var(--task-color, var(--grade-b, #95ff00));
          text-transform: uppercase; letter-spacing: 0.04em;
          display: inline-flex; align-items: center; gap: 6px;
        }
        #test-generator-wizard-overlay .wizard-card-exam {
          border-color: rgba(var(--quad-a-rgb, 255, 45, 135), 0.35);
        }
        #test-generator-wizard-overlay .wizard-card-exam .wizard-card-title {
          font-family: var(--fm-font-display, 'Inter', sans-serif);
          font-size: 12px; font-weight: 800; color: var(--exam-color, var(--quad-a, #ff2d87));
          text-transform: uppercase; letter-spacing: 0.04em;
          display: inline-flex; align-items: center; gap: 6px;
        }
        #test-generator-wizard-overlay .wizard-card-header {
          display: flex; justify-content: space-between; align-items: center;
        }
        #test-generator-wizard-overlay .field-label {
          font-size: 12px; font-weight: 700; color: #94a3b8;
          text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; display: block;
        }
        #test-generator-wizard-overlay .cta-area {
          height: 60px !important; min-height: 60px !important; max-height: 60px !important; flex-shrink: 0 !important;
          border-top: 1.5px solid rgba(255, 255, 255, 0.16) !important;
          background: rgba(30, 41, 59, 0.5); display: flex !important; justify-content: space-between !important;
          align-items: center !important; gap: 10px; padding: 0 16px !important; box-sizing: border-box;
        }
        #test-generator-wizard-overlay .btn-cta-close {
          height: 40px !important; min-height: 40px !important; max-height: 40px !important;
          line-height: 38px !important; padding: 0 20px !important; border-radius: 6px !important;
          font-family: var(--fm-font-display, 'Inter', sans-serif) !important; font-size: 14px !important;
          font-weight: 800 !important; text-transform: uppercase; letter-spacing: 0.04em;
          background: transparent !important; border: 1.5px solid rgba(255, 255, 255, 0.22) !important;
          color: #94a3b8; cursor: pointer; transition: all 0.15s ease; box-sizing: border-box;
          margin-right: auto !important; margin-left: 0 !important; align-self: center !important; transform: none !important;
        }
        #test-generator-wizard-overlay .btn-cta-close:hover,
        #test-generator-wizard-overlay .btn-cta-close:active {
          background: #334155 !important; color: #ffffff !important;
          border-color: #64748b !important; box-shadow: 0 0 10px rgba(255, 255, 255, 0.2) !important;
        }
        #test-generator-wizard-overlay .btn-cta-secondary {
          height: 40px !important; min-height: 40px !important; max-height: 40px !important;
          line-height: 38px !important; padding: 0 20px !important; border-radius: 6px !important;
          font-family: var(--fm-font-display, 'Inter', sans-serif) !important; font-size: 14px !important;
          font-weight: 800 !important; text-transform: uppercase; letter-spacing: 0.04em;
          background: transparent !important; border: 1.5px solid rgba(56, 189, 248, 0.4) !important;
          color: #38bdf8; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
          gap: 6px; transition: all 0.15s ease; box-sizing: border-box; transform: none !important;
        }
        #test-generator-wizard-overlay .btn-cta-secondary:hover,
        #test-generator-wizard-overlay .btn-cta-secondary:active {
          background: rgba(56, 189, 248, 0.18) !important; color: #38bdf8 !important;
          border-color: #38bdf8 !important; box-shadow: 0 0 14px rgba(56, 189, 248, 0.4);
        }
        #test-generator-wizard-overlay .btn-cta-primary {
          height: 40px !important; min-height: 40px !important; max-height: 40px !important;
          line-height: 38px !important; padding: 0 22px !important; border-radius: 6px !important;
          font-family: var(--fm-font-display, 'Inter', sans-serif) !important; font-size: 14px !important;
          font-weight: 800 !important; text-transform: uppercase; letter-spacing: 0.04em;
          background: transparent !important; color: #38bdf8 !important; border: 1.5px solid #38bdf8 !important;
          cursor: pointer; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          transition: all 0.15s ease; box-sizing: border-box; margin-left: auto !important; transform: none !important;
        }
        #test-generator-wizard-overlay .btn-cta-primary:hover,
        #test-generator-wizard-overlay .btn-cta-primary:active {
          background: #38bdf8 !important; color: #0f172a !important;
          box-shadow: 0 0 16px rgba(56, 189, 248, 0.6) !important;
        }
      </style>

      <div class="modal-card">
        <!-- Title Area (60px SSOT, Left-Aligned 16px White Title with 34px Icon Box, Tactical Cyan #38bdf8, Zero Subtitle Clutter) -->
        <div class="title-area">
          <div class="title-icon-box">
            ${getSvgIcon('settings', 18)}
          </div>
          <h2>TEST GENERATOR WIZARD</h2>
          ${isClassScoped ? (() => {
            // Modality badge colors (Class Discipline Color SSOT §2.5.3)
            const MODALITY_BADGE = {
              VOCABULARY:   { bg: 'rgba(149,255,0,0.18)',  border: 'rgba(149,255,0,0.5)',  color: '#95ff00',  label: 'VOCABULARY' },
              SPEAKING:     { bg: 'rgba(56,189,248,0.18)', border: 'rgba(56,189,248,0.5)', color: '#38bdf8',  label: 'SPEAKING' },
              STORYTELLING: { bg: 'rgba(255,140,0,0.18)',  border: 'rgba(255,140,0,0.5)',  color: '#FF8C00',  label: 'STORYTELLING' },
              BASIC:        { bg: 'rgba(192,132,252,0.18)',border: 'rgba(192,132,252,0.5)',color: '#c084fc',  label: 'BASIC ENGLISH' },
              GRAMMAR:      { bg: 'rgba(192,132,252,0.18)',border: 'rgba(192,132,252,0.5)',color: '#c084fc',  label: 'GRAMMAR' },
            };
            const mb = MODALITY_BADGE[classModality] || MODALITY_BADGE.VOCABULARY;
            return `<span style="margin-left:auto; background:${mb.bg}; border:1px solid ${mb.border}; color:${mb.color}; font-size:11px; font-weight:800; padding:2px 10px; border-radius:4px; text-transform:uppercase; letter-spacing:0.06em; white-space:nowrap;">${mb.label}</span>`;
          })() : ''}
        </div>

        <!-- Modal Body (10px padding & gaps, capped at 80vh) -->
        <div class="modal-body">
          <!-- Context Banner -->
          ${isClassScoped ? `
          <div style="background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.25); border-radius:8px; padding:10px; display:flex; justify-content:space-between; align-items:center; box-sizing:border-box;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="display:inline-flex; align-items:center; color:#38bdf8;">${getSvgIcon('book-open', 16)}</span>
              <div>
                <div style="font-size:12px; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.04em;">TARGET CLASS (LOCKED &amp; SECURED)</div>
                <div style="font-size:12px; font-weight:700; color:#f8fafc;">${escapeHtml(className)}</div>
              </div>
            </div>
            <span class="badge" style="background:rgba(56,189,248,0.2); border:1px solid rgba(56,189,248,0.4); color:#38bdf8; font-size:12px; font-weight:700; padding:2px 8px; border-radius:4px;">LOCKED</span>
          </div>
          ` : `
          <div style="background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.25); border-radius:8px; padding:10px; display:flex; justify-content:space-between; align-items:center; box-sizing:border-box;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="display:inline-flex; align-items:center; color:#38bdf8;">${getSvgIcon('book-open', 16)}</span>
              <div>
                <div style="font-size:12px; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.04em;">CURRICULUM BLUEPRINT MODE</div>
                <div style="font-size:12px; font-weight:700; color:#f8fafc;">Program-Wide Dynamic Test Synchronization</div>
              </div>
            </div>
            <span class="badge" style="background:rgba(56,189,248,0.2); border:1px solid rgba(56,189,248,0.4); color:#38bdf8; font-size:12px; font-weight:700; padding:2px 8px; border-radius:4px;">BLUEPRINT</span>
          </div>
          `}

          <!-- Section 1: Target Level & Category Scope -->
          ${isNonVocabularyModal ? `
          <!-- Triple-Lock Lapis 2: Non-Vocabulary Class Notice (§2.5.3) -->
          <div style="background:rgba(255,140,0,0.08); border:1px solid rgba(255,140,0,0.3); border-radius:8px; padding:10px; display:flex; align-items:flex-start; gap:10px; box-sizing:border-box;">
            <span style="display:inline-flex; align-items:center; color:#FF8C00; flex-shrink:0; margin-top:1px;">${getSvgIcon('alert-triangle', 16)}</span>
            <div>
              <div style="font-size:12px; font-weight:800; color:#FF8C00; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:2px;">Non-Vocabulary Class — Manual Test Creation Required</div>
              <div style="font-size:12px; font-weight:600; color:#cbd5e1; line-height:1.45;">
                Class modality: <strong style="color:#f8fafc;">${classModality}</strong>. The Auto-Generate Wizard is optimized for the Vocabulary curriculum (7×7 repetition structure). For <strong>${classModality}</strong> classes, manually create tests via the Tests tab using the appropriate evaluation engine (${classModality === 'SPEAKING' ? 'M5/M7 Speech modules' : classModality === 'STORYTELLING' ? 'M6 Monologue module' : classModality === 'BASIC' ? 'M1 Description module' : 'class-specific module'}). Cross-class module injection is blocked by Triple-Lock Lapis 3.
              </div>
            </div>
          </div>
          ` : ''}
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; box-sizing:border-box;">
            ${isClassScoped ? `
            <div>
              <label class="field-label">Target Level (Locked):</label>
              <div style="background:#090d16; padding:6px 10px; border:1px solid rgba(255,255,255,0.08); border-radius:6px; min-height:34px; display:flex; align-items:center; gap:8px; box-sizing:border-box;">
                <span class="badge" style="background:rgba(56,189,248,0.2); border:1px solid rgba(56,189,248,0.4); color:#38bdf8; font-size:12px; font-weight:700; padding:2px 8px; border-radius:4px;">
                  ${matchedLevelNum === 0 ? '0 (Non-Level)' : (typeof toShortLevel === 'function' ? toShortLevel(matchedLevelNum) : matchedLevelNum + 'th Level')}
                </span>
                <span style="font-size:12px; color:#94a3b8; font-weight:600;">(Locked to ${escapeHtml(className)})</span>
              </div>
              <input type="hidden" class="wizard-level-chk" value="${matchedLevelNum}" checked />
            </div>
            ` : `
            <div>
              <label class="field-label">Select Level:</label>
              <div style="display:flex; flex-wrap:wrap; gap:8px; background:#090d16; padding:6px 10px; border:1px solid rgba(255,255,255,0.08); border-radius:6px; min-height:34px; align-items:center; box-sizing:border-box;">
                ${displayLevels.map(lvl => `
                  <label style="display:inline-flex; align-items:center; gap:4px; font-size:12px; cursor:pointer; color:#e2e8f0;">
                    <input type="checkbox" class="wizard-level-chk" value="${lvl}" ${preSelectedLevels.includes(lvl) || preSelectedLevels.length === 0 ? 'checked' : ''} /> ${lvl === 0 ? '0 (Non-Level)' : (typeof toShortLevel === 'function' ? toShortLevel(lvl) : lvl)}
                  </label>
                `).join('')}
              </div>
            </div>
            `}

            <div>
              <label for="wizard-scope-select" class="field-label">Category Scope:</label>
              <select id="wizard-scope-select" class="form-control" style="background:#090d16; color:#f8fafc; border:1px solid rgba(255,255,255,0.08); border-radius:6px; font-size:12px; height:34px; padding:0 8px; width:100%; box-sizing:border-box;">
                ${isLevel2 ? `
                  <option value="words" selected>● Words Only (Level 2 Words-Only SSOT)</option>
                ` : `
                  <option value="all" selected>● All (Words &amp; Phrases — 40 Questions)</option>
                  <option value="words">○ Words Only (20 Questions)</option>
                  <option value="phrases">○ Phrases Only (20 Questions)</option>
                `}
              </select>
            </div>
          </div>

          <!-- Section 2: Task Configuration -->
          <div class="wizard-card wizard-card-task">
            <div class="wizard-card-header">
              <span class="wizard-card-title">
                ${getSvgIcon('zap', 14)} 1. TASK SETTINGS (TASKS)
              </span>
            </div>

            <!-- Row 1: Separate Durations (Words vs Phrases) & Passing Score -->
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; box-sizing:border-box;">
              <div>
                <label for="wizard-task-words-pace" class="field-label" style="color:var(--task-color, var(--grade-b, #95ff00)); margin-bottom:2px;">
                  WORDS TASK (<span id="words-task-calc-dur">7m</span>)
                </label>
                <div style="display:flex; align-items:center; gap:4px;">
                  <input type="number" id="wizard-task-words-pace" min="5" max="60" value="10" class="form-control" style="background:#090d16; color:#f8fafc; font-weight:700; font-size:12px; height:32px; width:70px;" title="Seconds per word (default 10s)" />
                  <span style="font-size:12px; color:#94a3b8;">sec/item</span>
                </div>
                <div style="display:flex; gap:3px; margin-top:4px;">
                  <button type="button" class="btn btn-ghost btn-sm pace-preset-btn" data-target="wizard-task-words-pace" data-val="10" style="font-size:12px; padding:1px 6px; border:1px solid rgba(255,255,255,0.1); border-radius:4px;">10s</button>
                  <button type="button" class="btn btn-ghost btn-sm pace-preset-btn" data-target="wizard-task-words-pace" data-val="15" style="font-size:12px; padding:1px 6px; border:1px solid rgba(255,255,255,0.1); border-radius:4px;">15s</button>
                  <button type="button" class="btn btn-ghost btn-sm pace-preset-btn" data-target="wizard-task-words-pace" data-val="20" style="font-size:12px; padding:1px 6px; border:1px solid rgba(255,255,255,0.1); border-radius:4px;">20s</button>
                </div>
                <input type="hidden" id="wizard-task-words-dur" value="${escapeHtml(String(prefillWordsTaskDur || 7))}" />
              </div>

              <div>
                <label for="wizard-task-phrases-pace" class="field-label" style="color:var(--phrases-color, var(--quad-a, #ff2d87)); margin-bottom:2px;">
                  PHRASES TASK (<span id="phrases-task-calc-dur">4m</span>)
                </label>
                <div style="display:flex; align-items:center; gap:4px;">
                  <input type="number" id="wizard-task-phrases-pace" min="5" max="60" value="20" class="form-control" style="background:#090d16; color:#f8fafc; font-weight:700; font-size:12px; height:32px; width:70px;" title="Seconds per phrase (default 20s)" />
                  <span style="font-size:12px; color:#94a3b8;">sec/item</span>
                </div>
                <div style="display:flex; gap:3px; margin-top:4px;">
                  <button type="button" class="btn btn-ghost btn-sm pace-preset-btn" data-target="wizard-task-phrases-pace" data-val="15" style="font-size:12px; padding:1px 6px; border:1px solid rgba(255,255,255,0.1); border-radius:4px;">15s</button>
                  <button type="button" class="btn btn-ghost btn-sm pace-preset-btn" data-target="wizard-task-phrases-pace" data-val="20" style="font-size:12px; padding:1px 6px; border:1px solid rgba(255,255,255,0.1); border-radius:4px;">20s</button>
                  <button type="button" class="btn btn-ghost btn-sm pace-preset-btn" data-target="wizard-task-phrases-pace" data-val="30" style="font-size:12px; padding:1px 6px; border:1px solid rgba(255,255,255,0.1); border-radius:4px;">30s</button>
                </div>
                <input type="hidden" id="wizard-task-phrases-dur" value="${escapeHtml(String(prefillPhrasesTaskDur || 4))}" />
              </div>

              <div>
                <label for="wizard-task-min" class="field-label" style="margin-bottom:2px;">MIN. RATE (%)</label>
                <input type="number" id="wizard-task-min" min="1" max="100" value="${escapeHtml(String(prefillTaskMin))}" class="form-control" style="background:#090d16; color:#f8fafc; font-weight:700; font-size:12px; height:32px; width:100%; box-sizing:border-box;" title="Passing threshold for tasks" />
                <div style="display:flex; gap:3px; margin-top:4px;">
                  <button type="button" class="btn btn-ghost btn-sm preset-btn" data-target="wizard-task-min" data-val="60" style="font-size:12px; padding:1px 8px; border:1px solid rgba(255,255,255,0.1); border-radius:4px;">60% (Grade C)</button>
                </div>
              </div>
            </div>

            <!-- Row 2: Cara Jawab Terpisah & Question Order -->
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:10px; background:rgba(0,0,0,0.22); padding:8px 10px; border-radius:6px; border:1px solid rgba(var(--grade-b-rgb, 149, 255, 0), 0.2); box-sizing:border-box;">
              <div>
                <label for="wizard-task-ans-words" class="field-label" style="color:var(--task-color, var(--grade-b, #95ff00)); margin-bottom:2px;">Words Task</label>
                <select id="wizard-task-ans-words" class="form-control" style="background:#090d16; color:#f8fafc; font-size:12px; height:32px; width:100%; box-sizing:border-box;">
                  <option value="selection" ${prefillWordsTaskAns === 'selection' ? 'selected' : ''}>Recognition Module (20s)</option>
                  <option value="spoken" ${prefillWordsTaskAns === 'spoken' ? 'selected' : ''}>Spoken Module (15s)</option>
                  <option value="written" ${prefillWordsTaskAns === 'written' ? 'selected' : ''}>Written Module (30s)</option>
                  <option value="mixed" ${prefillWordsTaskAns === 'mixed' ? 'selected' : ''}>Mixed (Hybrid / 25s)</option>
                </select>
              </div>

              <div>
                <label for="wizard-task-ans-phrases" class="field-label" style="color:var(--phrases-color, var(--quad-a, #ff2d87)); margin-bottom:2px;">Phrases Task</label>
                <select id="wizard-task-ans-phrases" class="form-control" style="background:#090d16; color:#f8fafc; font-size:12px; height:32px; width:100%; box-sizing:border-box;">
                  <option value="selection" ${prefillPhrasesTaskAns === 'selection' ? 'selected' : ''}>Recognition Module (20s)</option>
                  <option value="spoken" ${prefillPhrasesTaskAns === 'spoken' ? 'selected' : ''}>Spoken Module (20s)</option>
                  <option value="written" ${prefillPhrasesTaskAns === 'written' ? 'selected' : ''}>Written Module (30s)</option>
                  <option value="mixed" ${prefillPhrasesTaskAns === 'mixed' ? 'selected' : ''}>Mixed (Hybrid / 25s)</option>
                </select>
              </div>

              <div>
                <label for="wizard-task-order" class="field-label" style="color:var(--task-color, var(--grade-b, #95ff00)); margin-bottom:2px;">Task Order</label>
                <select id="wizard-task-order" class="form-control" style="background:#090d16; color:#f8fafc; font-size:12px; height:32px; width:100%; box-sizing:border-box;">
                  <option value="random" selected>Random</option>
                  <option value="sequential">Sequential</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Section 3: Exam Configuration -->
          <div class="wizard-card wizard-card-exam">
            <div class="wizard-card-header">
              <span class="wizard-card-title">
                ${getSvgIcon('clipboard', 14)} 2. EXAM SETTINGS (EXAMS)
              </span>
            </div>

            <!-- Dynamic Session Duration Callout -->
            <div style="background:rgba(0,0,0,0.3); border-left:3px solid var(--exam-color, var(--quad-a, #ff2d87)); padding:6px 10px; border-radius:4px; font-size:12px; color:#cbd5e1; line-height:1.35; box-sizing:border-box;">
              <strong>Exam Duration:</strong> Automatically calculated per item based on cumulative theme scope (Words: 15s/item, Phrases: 20s/item). Live tutor sessions can also define dedicated time limits when launching exams.
            </div>

            <div style="display:grid; grid-template-columns:1.25fr 1.25fr 0.75fr 0.85fr; gap:10px; box-sizing:border-box;">
              <div>
                <label for="wizard-test-ans-words" class="field-label" style="color:var(--task-color, var(--grade-b, #95ff00)); margin-bottom:2px;">Words Exam</label>
                <select id="wizard-test-ans-words" class="form-control" style="background:#090d16; color:#f8fafc; font-size:12px; height:32px; width:100%; box-sizing:border-box;">
                  <option value="selection" ${prefillWordsTestAns === 'selection' ? 'selected' : ''}>Recognition Module (20s)</option>
                  <option value="spoken" ${prefillWordsTestAns === 'spoken' ? 'selected' : ''}>Spoken Module (15s)</option>
                  <option value="written" ${prefillWordsTestAns === 'written' ? 'selected' : ''}>Written Module (30s)</option>
                  <option value="mixed" ${prefillWordsTestAns === 'mixed' ? 'selected' : ''}>Mixed (Hybrid / 25s)</option>
                </select>
                <div style="display:flex; align-items:center; gap:4px; margin-top:4px;">
                  <input type="number" id="wizard-exam-words-pace" min="5" max="60" value="10" class="form-control" style="background:#090d16; color:#f8fafc; font-weight:700; font-size:12px; height:26px; width:55px;" title="Seconds per word for exam (default 10s)" />
                  <span style="font-size:12px; color:#94a3b8;">sec/item</span>
                </div>
              </div>

              <div>
                <label for="wizard-test-ans-phrases" class="field-label" style="color:var(--phrases-color, var(--quad-a, #ff2d87)); margin-bottom:2px;">Phrases Exam</label>
                <select id="wizard-test-ans-phrases" class="form-control" style="background:#090d16; color:#f8fafc; font-size:12px; height:32px; width:100%; box-sizing:border-box;">
                  <option value="selection" ${prefillPhrasesTestAns === 'selection' ? 'selected' : ''}>Recognition Module (20s)</option>
                  <option value="spoken" ${prefillPhrasesTestAns === 'spoken' ? 'selected' : ''}>Spoken Module (20s)</option>
                  <option value="written" ${prefillPhrasesTestAns === 'written' ? 'selected' : ''}>Written Module (30s)</option>
                  <option value="mixed" ${prefillPhrasesTestAns === 'mixed' ? 'selected' : ''}>Mixed (Hybrid / 25s)</option>
                </select>
                <div style="display:flex; align-items:center; gap:4px; margin-top:4px;">
                  <input type="number" id="wizard-exam-phrases-pace" min="5" max="60" value="20" class="form-control" style="background:#090d16; color:#f8fafc; font-weight:700; font-size:12px; height:26px; width:55px;" title="Seconds per phrase for exam" />
                  <span style="font-size:12px; color:#94a3b8;">sec/item</span>
                </div>
              </div>

              <div>
                <label for="wizard-test-min" class="field-label" style="margin-bottom:2px;">MIN. RATE (%)</label>
                <input type="number" id="wizard-test-min" min="1" max="100" value="${escapeHtml(String(prefillTestMin))}" class="form-control" style="background:#090d16; color:#f8fafc; font-weight:700; font-size:12px; height:32px; width:100%; box-sizing:border-box;" title="Passing threshold for exam" />
                <div style="display:flex; gap:3px; margin-top:4px;">
                  <button type="button" class="btn btn-ghost btn-sm preset-btn" data-target="wizard-test-min" data-val="60" style="font-size:12px; padding:1px 8px; border:1px solid rgba(255,255,255,0.1); border-radius:4px;">60% (Grade C)</button>
                </div>
              </div>

              <div>
                <label for="wizard-test-order" class="field-label" style="color:var(--exam-color, var(--quad-a, #ff2d87)); margin-bottom:2px;">Exam Order</label>
                <select id="wizard-test-order" class="form-control" style="background:#090d16; color:#f8fafc; font-size:12px; height:32px; width:100%; box-sizing:border-box;">
                  <option value="random" selected>Random</option>
                  <option value="sequential">Sequential</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Hidden program and institution ID helpers -->
          <input type="hidden" id="wizard-prog-id" value="${matchedClass?.program_id || window.currentProgId || programs[0]?.id || ''}" />
          <input type="hidden" id="wizard-inst-id" value="${matchedClass?.institution_id || ''}" />
        </div>

        <!-- CTA Area (60px SSOT, 1.5px border, Triple Buttons Kiri-Tengah-Kanan) -->
        <div class="cta-area">
          <!-- Button 1 (Left): CLOSE (Zero 'Cancel' Invariant) -->
          <button type="button" class="btn-cta-close" id="wizard-cancel-btn">CLOSE</button>

          <!-- Button 2 (Center): UPDATE SETTINGS ONLY -->
          <button type="button" class="btn-cta-secondary" id="wizard-update-only-btn">
            ${getSvgIcon('zap', 14)} UPDATE SETTINGS ONLY
          </button>

          <!-- Button 3 (Right): GENERATE & SYNC ALL (Pillar D Violet SSOT) -->
          <button type="button" class="btn-cta-primary" id="wizard-generate-btn">
            ${getSvgIcon('zap', 14)} GENERATE &amp; SYNC ALL
          </button>
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
      const wordsPace = parseInt(overlay.querySelector('#wizard-task-words-pace')?.value, 10) || 10;
      const phrasesPace = parseInt(overlay.querySelector('#wizard-task-phrases-pace')?.value, 10) || 20;

      const wordsDur = calculateAutoDurationMinutes(40, wordsAns, 'words', wordsPace, 1);
      const phrasesDur = calculateAutoDurationMinutes(10, phrasesAns, 'phrases', phrasesPace, 1);

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
      const paceInput = overlay.querySelector('#wizard-task-words-pace');
      if (paceInput) {
        paceInput.value = 10;
      }
      recalculateDurations();
    });

    overlay.querySelector('#wizard-task-ans-phrases')?.addEventListener('change', (e) => {
      const paceInput = overlay.querySelector('#wizard-task-phrases-pace');
      if (paceInput) {
        paceInput.value = 20;
      }
      recalculateDurations();
    });

    // Run initial calibration
    recalculateDurations();

    const closeOverlay = () => overlay.remove();
    overlay.querySelector('#wizard-cancel-btn').onclick = closeOverlay;

    const getWizardConfig = () => {
      const selectedLevels = (isClassScoped && matchedLevelNum != null)
        ? [matchedLevelNum]
        : Array.from(overlay.querySelectorAll('.wizard-level-chk:checked')).map(cb => parseInt(cb.value, 10));
      const progId = overlay.querySelector('#wizard-prog-id').value;
      const institutionId = overlay.querySelector('#wizard-inst-id')?.value || null;
      const category = isLevel2 ? 'words' : overlay.querySelector('#wizard-scope-select').value;
      const durEl = overlay.querySelector('#wizard-task-dur') || overlay.querySelector('#wizard-task-dur');
      const wordsDurEl = overlay.querySelector('#wizard-task-words-dur');
      const phrasesDurEl = overlay.querySelector('#wizard-task-phrases-dur');
      const minEl = overlay.querySelector('#wizard-task-min') || overlay.querySelector('#wizard-task-min');
      const wordsAnsEl = overlay.querySelector('#wizard-task-ans-words') || overlay.querySelector('#wizard-task-ans-words');
      const phrasesAnsEl = overlay.querySelector('#wizard-task-ans-phrases') || overlay.querySelector('#wizard-task-ans-phrases');

      const wordsPace = parseInt(overlay.querySelector('#wizard-task-words-pace')?.value, 10) || 10;
      const phrasesPace = parseInt(overlay.querySelector('#wizard-task-phrases-pace')?.value, 10) || 20;
      const wordsExamPace = parseInt(overlay.querySelector('#wizard-exam-words-pace')?.value, 10) || 10;
      const phrasesExamPace = parseInt(overlay.querySelector('#wizard-exam-phrases-pace')?.value, 10) || 20;

      const wordsQuizAnswer = wordsAnsEl ? wordsAnsEl.value : 'spoken';
      const phrasesQuizAnswer = phrasesAnsEl ? phrasesAnsEl.value : 'spoken';

      const wordsQuizDuration = parseInt(wordsDurEl?.value, 10) || calculateAutoDurationMinutes(40, wordsQuizAnswer, 'words', wordsPace, 1);
      const phrasesQuizDuration = parseInt(phrasesDurEl?.value, 10) || calculateAutoDurationMinutes(10, phrasesQuizAnswer, 'phrases', phrasesPace, 1);
      const quizDuration = wordsQuizDuration;
      const quizPassing = parseInt(minEl?.value, 10) || 60;
      const wordsTestAnswer = overlay.querySelector('#wizard-test-ans-words').value;
      const phrasesTestAnswer = overlay.querySelector('#wizard-test-ans-phrases').value;
      const testPassing = parseInt(overlay.querySelector('#wizard-test-min').value, 10) || 60;
      const taskQuestionOrder = overlay.querySelector('#wizard-task-order')?.value === 'sequential' ? 'sequential' : 'random';
      const examQuestionOrder = overlay.querySelector('#wizard-test-order')?.value === 'sequential' ? 'sequential' : 'random';

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
        taskQuestionOrder,
        examQuestionOrder,
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
      btn.innerHTML = '<span>⏳ UPDATING...</span>';

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
          testPassingScore: cfg.testPassing,
          taskQuestionOrder: cfg.taskQuestionOrder,
          examQuestionOrder: cfg.examQuestionOrder
        });

        overlay.remove();
        const msg = `Settings successfully applied: ${res.updatedTasks} Tasks (Words: ${cfg.wordsTaskDuration}m, Phrases: ${cfg.phrasesTaskDuration}m), ${res.updatedTests} Exams updated!`;
        if (window.showToast) window.showToast(msg, 'success');
        else alert(msg);

        if (onComplete) onComplete(res);
      } catch (err) {
        console.error(err);
        btn.disabled = false;
        btn.innerHTML = `${getSvgIcon('zap', 14)} UPDATE SETTINGS ONLY`;
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

      const loadingSubtitle = isClassScoped
        ? `Building Task hierarchy (Words: ${cfg.wordsTaskDuration}m) &amp; Exams for ${matchedLevelNum === 0 ? 'Level 0' : (typeof toShortLevel === 'function' ? toShortLevel(matchedLevelNum) : 'Level ' + matchedLevelNum)} in class ${escapeHtml(className)}...`
        : `Building Task hierarchy (Words: ${cfg.wordsTaskDuration}m, Phrases: ${cfg.phrasesTaskDuration}m) &amp; Exams for Level ${cfg.selectedLevels.join(', ')}...`;

      overlay.innerHTML = `
        <div style="background:#0f172a; padding:2rem 2.5rem; border-radius:12px; width:440px; text-align:center; font-family:Inter,sans-serif; color:white; border:1px solid rgba(255,255,255,0.15); box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
          <div class="topscore-loading-center" style="min-height: 120px !important;">
            <div class="spinner"></div>
            <h3 style="margin:0 0 6px 0; font-size: 16px; font-weight:700; color:#f8fafc;">Generating Curriculum Tests</h3>
            <p style="color:#94a3b8; font-size: 12px; margin:0; line-height:1.4;">
              ${loadingSubtitle}
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
          testPassingScore: cfg.testPassing,
          taskQuestionOrder: cfg.taskQuestionOrder,
          examQuestionOrder: cfg.examQuestionOrder
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
