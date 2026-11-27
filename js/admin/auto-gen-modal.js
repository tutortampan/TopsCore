// TOPS CORE — Vocabulary System (Master Curriculum Matrix)
// Single Source of Truth (SSOT) for all Vocabulary classes across CEC & TOP institutions.
// Dual-Mode Presentation:
// 1. Modal Dialog Mode: openVocabularySystemModal / openAutoGenerateModal
// 2. Full-Page View Mode: renderVocabularySystemPage (Curriculum Management #class-hub)

import {
  fetchInstitutions,
  fetchPrograms,
  fetchVaultWords,
  autoGenerateTestsHierarchy,
  updateClassTestsConfig,
  fetchClassTestSettings,
  saveClassTestSettings,
  calculateAutoDurationMinutes,
  clearAdminCache,
  adminFetchAll,
  toShortLevel,
  escapeHtml,
  showToast
} from '../api.js?v=20261125_v688';
import { getSupabase } from '../supabase.js?v=20261027c';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';
import { isVocabularyClass, detectClassDiscipline } from '../grading.js?v=20261106_v160';

// Canonical list of Vocabulary Classes in TopsCore
const KNOWN_VOCAB_CLASSES = [
  { code: 'CAMP-1VOCAB', name: 'Camp 1st Vocabulary', institution: 'CEC', program: 'Camp', levelNumber: 1, levelLabel: '1st', hasPhrases: true },
  { code: 'CAMP-2VOCAB', name: 'Camp 2nd Vocabulary', institution: 'CEC', program: 'Camp', levelNumber: 2, levelLabel: '2nd', hasPhrases: false }, // 100% Words Only (DECISION-083)
  { code: 'CAMP-3VOCAB', name: 'Camp 3rd Vocabulary', institution: 'CEC', program: 'Camp', levelNumber: 3, levelLabel: '3rd', hasPhrases: true },
  { code: 'EVNK-VOCAB',  name: 'Evnikom Vocabulary',  institution: 'TOP', program: 'Evnikom', levelNumber: 0, levelLabel: '0',   hasPhrases: false }, // Level 0 Words-Only
  { code: 'SHRT-VOCAB',  name: 'Sheraton Vocabulary', institution: 'TOP', program: 'Sheraton', levelNumber: 0, levelLabel: '0',   hasPhrases: false }, // Level 0 Words-Only
  { code: 'TPTC-VOCAB',  name: 'Tamata Vocabulary',   institution: 'TOP', program: 'Tamata', levelNumber: 0, levelLabel: '0',   hasPhrases: false }  // Level 0 Words-Only
];

/**
 * Loads metadata and active configuration for all vocabulary classes
 */
async function loadAllVocabClassesData() {
  const sb = await getSupabase();
  const [allClasses, allLevels, institutions, programs, allVaultWords, tpaRes] = await Promise.all([
    adminFetchAll('classes', 'id, name, code, is_active, program_id, level_id, institution_id, deleted_at').catch(() => []),
    adminFetchAll('levels', 'id, name, level_number').catch(() => []),
    fetchInstitutions().catch(() => []),
    adminFetchAll('programs', 'id, name, code, institution_id').catch(() => []),
    fetchVaultWords({ limit: 10000 }).catch(() => []),
    sb.from('theme_program_assignments').select('theme_code, program_id, target_level').eq('is_active', true).then(r => r.data || []).catch(() => [])
  ]);
  const tpaRows = Array.isArray(tpaRes) ? tpaRes : [];

  const levelMap = new Map((allLevels || []).map(l => [l.id, l]));
  const instMap = new Map((institutions || []).map(i => [i.id, i]));
  const progMap = new Map((programs || []).map(p => [p.id, p]));

  // Match database classes with vocabulary modality
  const vocabClasses = (allClasses || []).filter(c => !c.deleted_at && isVocabularyClass(c));

  const enriched = [];
  for (const kc of KNOWN_VOCAB_CLASSES) {
    const matched = vocabClasses.find(c => {
      const cCode = String(c.code || '').toUpperCase();
      const cName = String(c.name || '').toLowerCase();
      return cCode === kc.code || cName.includes(kc.name.toLowerCase()) || (kc.code.includes('CAMP-1') && cCode.includes('1VOCAB'));
    }) || vocabClasses.find(c => String(c.name || '').toLowerCase() === kc.name.toLowerCase());

    const classId = matched ? matched.id : null;
    let settings = {
      taskRepetitions: 7,
      taskMinScore: 70,
      examMinScore: 60,
      taskQuestionOrder: 'random',
      examQuestionOrder: 'random',
      wordsTaskQuestions: 'ALL',
      phrasesTaskQuestions: 'ALL',
      wordsTaskAnswer: 'spoken',
      phrasesTaskAnswer: 'spoken',
      wordsTaskPace: 15,
      phrasesTaskPace: 20,
      wordsTaskDur: 5,
      phrasesTaskDur: 4,
      wordsExamQuestions: 'ALL',
      phrasesExamQuestions: 'ALL',
      wordsExamAnswer: 'spoken',
      phrasesExamAnswer: 'selection',
      wordsExamPace: 15,
      phrasesExamPace: 20,
      wordsExamDur: 30,
      phrasesExamDur: 10
    };

    if (classId) {
      try {
        const fetched = await fetchClassTestSettings(classId);
        if (fetched) {
          settings = { ...settings, ...fetched };
          // Ensure default is strictly 'ALL' unless explicitly saved as custom
          if (!fetched.wordsTaskQuestionsCustom) settings.wordsTaskQuestions = 'ALL';
          if (!fetched.phrasesTaskQuestionsCustom) settings.phrasesTaskQuestions = 'ALL';
          if (!fetched.wordsExamQuestionsCustom) settings.wordsExamQuestions = 'ALL';
          if (!fetched.phrasesExamQuestionsCustom) settings.phrasesExamQuestions = 'ALL';
        }
      } catch (_) {}
    }

    // Compute available themes for this class from cached vocabulary_vault + theme_program_assignments
    const programId = matched?.program_id || null;
    const tpaForLevel = tpaRows.filter(a => Number(a.target_level) === Number(kc.levelNumber));
    const myThemes = new Set(tpaForLevel.filter(a => String(a.program_id) === String(programId)).map(a => String(a.theme_code || '').toUpperCase()));
    const claimedByOthers = new Set(tpaForLevel.filter(a => String(a.program_id) !== String(programId)).map(a => String(a.theme_code || '').toUpperCase()));
    const themeMap = new Map();
    const topicWordsCount = new Map();
    const topicPhrasesCount = new Map();
    const themeWordsCount = new Map();
    const themePhrasesCount = new Map();

    for (const w of (allVaultWords || [])) {
      if (Number(w.target_level) !== Number(kc.levelNumber)) continue;
      if (w.program_id && programId && String(w.program_id) !== String(programId)) continue;
      const tc = String(w.theme_code || '').trim().toUpperCase();
      if (!tc) continue;
      if (myThemes.size > 0 && !myThemes.has(tc)) continue;
      if (myThemes.size === 0 && claimedByOthers.size > 0 && claimedByOthers.has(tc)) continue;
      if (!themeMap.has(tc)) {
        themeMap.set(tc, {
          code: tc,
          displayCode: kc.levelNumber === 0 ? `0${tc}` : tc,
          name: String(w.theme || `Theme ${tc}`).trim()
        });
      }
      const wt = String(w.word_type || '').toLowerCase();
      const isPhrase = ['expression', 'idiom', 'proverb', 'phrase'].includes(wt) || w.category === 'phrases';
      const topCode = String(w.topic_code || '').trim().toUpperCase();
      if (isPhrase) {
        themePhrasesCount.set(tc, (themePhrasesCount.get(tc) || 0) + 1);
        if (topCode) topicPhrasesCount.set(topCode, (topicPhrasesCount.get(topCode) || 0) + 1);
      } else {
        themeWordsCount.set(tc, (themeWordsCount.get(tc) || 0) + 1);
        if (topCode) topicWordsCount.set(topCode, (topicWordsCount.get(topCode) || 0) + 1);
      }
    }
    const themes = Array.from(themeMap.values()).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
    const avgOfMap = (m, fallback) => {
      const vals = Array.from(m.values()).filter(n => n > 0);
      return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : fallback;
    };
    const vaultWordsPerTask = avgOfMap(topicWordsCount, 20);
    const vaultPhrasesPerTask = avgOfMap(topicPhrasesCount, 10);
    const vaultWordsPerExam = avgOfMap(themeWordsCount, kc.hasPhrases ? 30 : 20);
    const vaultPhrasesPerExam = avgOfMap(themePhrasesCount, 10);

    enriched.push({
      ...kc,
      id: classId,
      vaultWordsPerTask,
      vaultPhrasesPerTask,
      vaultWordsPerExam,
      vaultPhrasesPerExam,
      rawClass: matched || null,
      programId,
      institutionId: matched?.institution_id || null,
      themes,
      settings
    });
  }

  return { enriched, institutions, programs, levels: allLevels };
}

/**
 * Builds the Master Matrix HTML markup
 */
function buildMatrixHtml(vocabClasses, activeClassId, isAllUnlocked = false, filterClassId = null) {
  let rowsHtml = '';
  const classesToRender = filterClassId
    ? vocabClasses.filter(c => String(c.id) === String(filterClassId))
    : vocabClasses;

  const getProgBadge = (prog) => {
    return `<span style="color:var(--admin-text-main, #f8fafc); font-size:12px; font-weight:600;">${escapeHtml(prog || '—')}</span>`;
  };

  classesToRender.forEach(c => {
    const isThisActive = isAllUnlocked || (activeClassId && String(c.id) === String(activeClassId));
    const instBadge = `<span style="color:var(--admin-text-main, #f8fafc); font-size:12px; font-weight:700;">${escapeHtml(c.institution)}</span>`;

    const progBadge = getProgBadge(c.program);
    const levelBadge = `<span style="color:var(--admin-text-muted, #94a3b8); font-size:12px; font-weight:600; font-variant-numeric:tabular-nums;">${escapeHtml(c.levelLabel)}</span>`;

    const statusBadge = isThisActive
      ? '<span style="color:var(--grade-b,#95ff00); font-size:12px; font-weight:800; display:inline-flex; align-items:center; gap:4px; white-space:nowrap;">● ACTIVE</span>'
      : `<button type="button" class="btn btn-ghost btn-sm btn-unlock-row" data-class-id="${c.id}" style="font-size:12px; padding:2px 8px; color:#94a3b8; border:1px solid rgba(255,255,255,0.12); border-radius:4px; cursor:pointer; white-space:nowrap;" title="Unlock this class for editing">${getSvgIcon('lock', 12)} LOCKED</button>`;

    const s = c.settings || {};
    const taskReps = s.taskRepetitions === 14 ? 7 : (s.taskRepetitions || 7);

    // Helper for input generator
    const makeInput = (field, val, type = 'number', width = '55px', suffix = '', extra = '') => {
      if (!isThisActive) {
        return `<span style="font-weight:600; color:#f8fafc; font-size:12px; font-variant-numeric:tabular-nums; white-space:nowrap;">${escapeHtml(String(val))}${suffix}</span>`;
      }
      return `
        <div style="display:inline-flex; align-items:center; justify-content:center; gap:3px;">
          <input type="${type}" class="form-control form-control-sm matrix-input" data-class-id="${c.id}" data-field="${field}" value="${escapeHtml(String(val))}" style="height:26px !important; width:${width}; font-size:12px; font-weight:700; text-align:center; background:#090d16; border:1px solid rgba(56,189,248,0.4); border-radius:4px; color:#ffffff; padding:0 3px;" ${extra} />
          ${suffix ? `<span style="font-size:12px; font-weight:700; color:#94a3b8;">${suffix}</span>` : ''}
        </div>
      `;
    };

    const makeSelect = (field, currentVal, options, width = '190px') => {
      const opt = options.find(o => o.value === currentVal);
      const label = opt ? opt.label : currentVal;
      if (!isThisActive) {
        return `<span style="font-size:12px; font-weight:600; color:#cbd5e1; white-space:nowrap;">${escapeHtml(label)}</span>`;
      }
      return `
        <select class="form-control form-control-sm matrix-select" data-class-id="${c.id}" data-field="${field}" style="height:26px !important; width:${width}; font-size:12px; font-weight:600; background:#090d16; border:1px solid rgba(56,189,248,0.4); border-radius:4px; color:#ffffff; padding:0 6px; white-space:nowrap;">
          ${options.map(o => `<option value="${o.value}" ${o.value === currentVal ? 'selected' : ''} style="background:#0f172a; color:#f8fafc;">${escapeHtml(o.label)}</option>`).join('')}
        </select>
      `;
    };

    const answerModeOptions = [
      { value: 'spoken', label: 'Spoken Module (15s)' },
      { value: 'selection', label: 'Recognition Module (20s)' },
      { value: 'written', label: 'Written Module (30s)' },
      { value: 'mixed', label: 'Mixed (Hybrid)' }
    ];

    const orderOptions = [
      { value: 'random', label: 'Random' },
      { value: 'sequential', label: 'Sequential' }
    ];

    const rowBg = isThisActive ? 'background:rgba(56,189,248,0.04);' : 'opacity:0.85;';
    const tdBase = 'padding:6px 8px; white-space:nowrap; overflow:visible !important; text-overflow:clip !important;';

    // 1. Words Task Row
    rowsHtml += `
      <tr class="matrix-row ${isThisActive ? 'row-active' : 'row-locked'}" data-class-id="${c.id}" style="${rowBg} border-bottom:1px solid rgba(255,255,255,0.06);">
        <td style="${tdBase} text-align:center;">${instBadge}</td>
        <td style="${tdBase} text-align:center;">${progBadge}</td>
        <td style="${tdBase} text-align:center;">${levelBadge}</td>
        <td style="${tdBase} font-weight:700; color:#f8fafc; font-size:12px;">${escapeHtml(c.name)}</td>
        <td style="${tdBase} text-align:center;"><span style="color:var(--task-color, #95ff00); font-weight:800; font-size:12px;">TASK</span></td>
        <td style="${tdBase} text-align:center;"><span style="color:var(--admin-text-main, #f8fafc); font-weight:700; font-size:12px;">WORD</span></td>
        <td style="${tdBase} text-align:center;">${makeInput('taskRepetitions', taskReps, 'number', '55px', '', 'min="1" max="7"')}</td>
        <td style="${tdBase} text-align:center;">${makeInput('wordsTaskQuestions', s.wordsTaskQuestions || 'ALL', 'text', '60px')}</td>
        <td style="${tdBase} text-align:center;">${makeInput('taskMinScore', s.taskMinScore || 70, 'number', '50px', '%', 'min="1" max="100"')}</td>
        <td style="${tdBase}">${makeSelect('wordsTaskAnswer', s.wordsTaskAnswer || 'spoken', answerModeOptions, '190px')}</td>
        <td style="${tdBase} text-align:center;">${makeSelect('taskQuestionOrder', s.taskQuestionOrder || 'random', orderOptions, '95px')}</td>
        <td style="${tdBase} text-align:center;">${makeInput('wordsTaskPace', s.wordsTaskPace || 15, 'number', '50px', 's', 'min="5" max="60"')}</td>
        <td style="${tdBase} text-align:center;">${makeInput('wordsTaskDur', s.wordsTaskDur || 5, 'number', '50px', 'm', 'min="1" max="120"')}</td>
        <td style="${tdBase} text-align:center;">${statusBadge}</td>
      </tr>
    `;

    // 2. Phrases Task Row (Omitted for Camp 2nd Vocab / Words-Only)
    if (c.hasPhrases) {
      rowsHtml += `
        <tr class="matrix-row ${isThisActive ? 'row-active' : 'row-locked'}" data-class-id="${c.id}" style="${rowBg} border-bottom:1px solid rgba(255,255,255,0.06);">
          <td style="${tdBase} text-align:center;">${instBadge}</td>
          <td style="${tdBase} text-align:center;">${progBadge}</td>
          <td style="${tdBase} text-align:center;">${levelBadge}</td>
          <td style="${tdBase} font-weight:700; color:#f8fafc; font-size:12px;">${escapeHtml(c.name)}</td>
          <td style="${tdBase} text-align:center;"><span style="color:var(--task-color, #95ff00); font-weight:800; font-size:12px;">TASK</span></td>
          <td style="${tdBase} text-align:center;"><span style="color:var(--admin-text-main, #f8fafc); font-weight:700; font-size:12px;">PHRASE</span></td>
          <td style="${tdBase} text-align:center;">${makeInput('taskRepetitions', taskReps, 'number', '55px', '', 'min="1" max="7"')}</td>
          <td style="${tdBase} text-align:center;">${makeInput('phrasesTaskQuestions', s.phrasesTaskQuestions || 'ALL', 'text', '60px')}</td>
          <td style="${tdBase} text-align:center;">${makeInput('taskMinScore', s.taskMinScore || 70, 'number', '50px', '%', 'min="1" max="100"')}</td>
          <td style="${tdBase}">${makeSelect('phrasesTaskAnswer', s.phrasesTaskAnswer || 'spoken', answerModeOptions, '190px')}</td>
          <td style="${tdBase} text-align:center;">${makeSelect('taskQuestionOrder', s.taskQuestionOrder || 'random', orderOptions, '95px')}</td>
          <td style="${tdBase} text-align:center;">${makeInput('phrasesTaskPace', s.phrasesTaskPace || 20, 'number', '50px', 's', 'min="5" max="60"')}</td>
          <td style="${tdBase} text-align:center;">${makeInput('phrasesTaskDur', s.phrasesTaskDur || 4, 'number', '50px', 'm', 'min="1" max="120"')}</td>
          <td style="${tdBase} text-align:center;">${statusBadge}</td>
        </tr>
      `;
    }

    // 3. Words Exam Row
    rowsHtml += `
      <tr class="matrix-row ${isThisActive ? 'row-active' : 'row-locked'}" data-class-id="${c.id}" style="${rowBg} border-bottom:1px solid rgba(255,255,255,0.06);">
        <td style="${tdBase} text-align:center;">${instBadge}</td>
        <td style="${tdBase} text-align:center;">${progBadge}</td>
        <td style="${tdBase} text-align:center;">${levelBadge}</td>
        <td style="${tdBase} font-weight:700; color:#f8fafc; font-size:12px;">${escapeHtml(c.name)}</td>
        <td style="${tdBase} text-align:center;"><span style="color:var(--exam-color, #ff2d87); font-weight:800; font-size:12px;">EXAM</span></td>
        <td style="${tdBase} text-align:center;"><span style="color:var(--admin-text-main, #f8fafc); font-weight:700; font-size:12px;">WORD</span></td>
        <td style="${tdBase} text-align:center;"><span style="color:#64748b; font-size:12px; font-weight:700;">1x (Final)</span></td>
        <td style="${tdBase} text-align:center;">${makeInput('wordsExamQuestions', s.wordsExamQuestions || 'ALL', 'text', '60px')}</td>
        <td style="${tdBase} text-align:center;">${makeInput('examMinScore', s.examMinScore || 60, 'number', '50px', '%', 'min="1" max="100"')}</td>
        <td style="${tdBase}">${makeSelect('wordsExamAnswer', s.wordsExamAnswer || 'spoken', answerModeOptions, '190px')}</td>
        <td style="${tdBase} text-align:center;">${makeSelect('examQuestionOrder', s.examQuestionOrder || 'random', orderOptions, '95px')}</td>
        <td style="${tdBase} text-align:center;">${makeInput('wordsExamPace', s.wordsExamPace || 15, 'number', '50px', 's', 'min="5" max="60"')}</td>
        <td style="${tdBase} text-align:center;">${makeInput('wordsExamDur', s.wordsExamDur || (c.hasPhrases ? 30 : 25), 'number', '50px', 'm', 'min="1" max="120"')}</td>
        <td style="${tdBase} text-align:center;">${statusBadge}</td>
      </tr>
    `;

    // 4. Phrases Exam Row (Omitted for Camp 2nd Vocab / Words-Only)
    if (c.hasPhrases) {
      rowsHtml += `
        <tr class="matrix-row ${isThisActive ? 'row-active' : 'row-locked'}" data-class-id="${c.id}" style="${rowBg} border-bottom:1.5px solid rgba(255,255,255,0.12);">
          <td style="${tdBase} text-align:center;">${instBadge}</td>
          <td style="${tdBase} text-align:center;">${progBadge}</td>
          <td style="${tdBase} text-align:center;">${levelBadge}</td>
          <td style="${tdBase} font-weight:700; color:#f8fafc; font-size:12px;">${escapeHtml(c.name)}</td>
          <td style="${tdBase} text-align:center;"><span style="color:var(--exam-color, #ff2d87); font-weight:800; font-size:12px;">EXAM</span></td>
          <td style="${tdBase} text-align:center;"><span style="color:var(--admin-text-main, #f8fafc); font-weight:700; font-size:12px;">PHRASE</span></td>
          <td style="${tdBase} text-align:center;"><span style="color:#64748b; font-size:12px; font-weight:700;">1x (Final)</span></td>
          <td style="${tdBase} text-align:center;">${makeInput('phrasesExamQuestions', s.phrasesExamQuestions || 'ALL', 'text', '60px')}</td>
          <td style="${tdBase} text-align:center;">${makeInput('examMinScore', s.examMinScore || 60, 'number', '50px', '%', 'min="1" max="100"')}</td>
          <td style="${tdBase}">${makeSelect('phrasesExamAnswer', s.phrasesExamAnswer || 'selection', answerModeOptions, '190px')}</td>
          <td style="${tdBase} text-align:center;">${makeSelect('examQuestionOrder', s.examQuestionOrder || 'random', orderOptions, '95px')}</td>
          <td style="${tdBase} text-align:center;">${makeInput('phrasesExamPace', s.phrasesExamPace || 20, 'number', '50px', 's', 'min="5" max="60"')}</td>
          <td style="${tdBase} text-align:center;">${makeInput('phrasesExamDur', s.phrasesExamDur || 10, 'number', '50px', 'm', 'min="1" max="120"')}</td>
          <td style="${tdBase} text-align:center;">${statusBadge}</td>
        </tr>
      `;
    }
  });

  return `
    <div class="table-wrap vocab-matrix-wrap" style="overflow-x:auto !important; overflow-y:auto !important; flex:1 1 0; min-height:0; width:100%; border:1px solid rgba(255,255,255,0.1); border-radius:6px; background:#0f172a;">
      <style>
        .vocab-matrix-wrap {
          overflow-x: auto !important;
          overflow-y: auto !important;
        }
        .vocab-matrix-table td,
        .vocab-matrix-table th {
          overflow: visible !important;
          text-overflow: clip !important;
          white-space: nowrap !important;
        }
      </style>
      <table class="table vocab-matrix-table" style="min-width:1320px; width:100%; border-collapse:collapse; font-size:12px; white-space:nowrap;">
        <thead style="position:sticky; top:0; z-index:10; background:#1e293b; border-bottom:1.5px solid rgba(255,255,255,0.16);">
          <tr style="height:36px;">
            <th style="width:85px; min-width:85px; padding:6px 6px; text-align:center; font-weight:800; color:#38bdf8; font-size:12px; text-transform:uppercase; letter-spacing:0.04em;">INSTITUTION</th>
            <th style="width:85px; min-width:85px; padding:6px 6px; text-align:center; font-weight:800; color:#38bdf8; font-size:12px; text-transform:uppercase; letter-spacing:0.04em;">PROGRAM</th>
            <th style="width:65px; min-width:65px; padding:6px 6px; text-align:center; font-weight:800; color:#38bdf8; font-size:12px; text-transform:uppercase; letter-spacing:0.04em;">LEVEL</th>
            <th style="width:190px; min-width:190px; padding:6px 8px; text-align:left; font-weight:800; color:#38bdf8; font-size:12px; text-transform:uppercase; letter-spacing:0.04em;">CLASS</th>
            <th style="width:70px; min-width:70px; padding:6px 6px; text-align:center; font-weight:800; color:#38bdf8; font-size:12px; text-transform:uppercase; letter-spacing:0.04em;">TYPE</th>
            <th style="width:75px; min-width:75px; padding:6px 6px; text-align:center; font-weight:800; color:#38bdf8; font-size:12px; text-transform:uppercase; letter-spacing:0.04em;">CONTENT</th>
            <th style="width:95px; min-width:95px; padding:6px 6px; text-align:center; font-weight:800; color:#95ff00; font-size:12px; text-transform:uppercase; letter-spacing:0.04em;">REPETITIONS</th>
            <th style="width:80px; min-width:80px; padding:6px 6px; text-align:center; font-weight:800; color:#95ff00; font-size:12px; text-transform:uppercase; letter-spacing:0.04em;">QUESTIONS</th>
            <th style="width:85px; min-width:85px; padding:6px 6px; text-align:center; font-weight:800; color:#95ff00; font-size:12px; text-transform:uppercase; letter-spacing:0.04em;">PASS RATE</th>
            <th style="width:180px; min-width:180px; padding:6px 8px; text-align:left; font-weight:800; color:var(--grade-star, #a855f7); font-size:12px; text-transform:uppercase; letter-spacing:0.04em;">ANSWER MODE</th>
            <th style="width:85px; min-width:85px; padding:6px 6px; text-align:center; font-weight:800; color:var(--grade-star, #a855f7); font-size:12px; text-transform:uppercase; letter-spacing:0.04em;">ORDER</th>
            <th style="width:105px; min-width:105px; padding:6px 6px; text-align:center; font-weight:800; color:#f8fafc; font-size:12px; text-transform:uppercase; letter-spacing:0.04em;">DUR / QUESTION</th>
            <th style="width:80px; min-width:80px; padding:6px 6px; text-align:center; font-weight:800; color:#f8fafc; font-size:12px; text-transform:uppercase; letter-spacing:0.04em;">DURATION</th>
            <th style="width:85px; min-width:85px; padding:6px 6px; text-align:center; font-weight:800; color:#38bdf8; font-size:12px; text-transform:uppercase; letter-spacing:0.04em;">STATUS</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Extracts form values for a given class ID
 */
function readMatrixInputs(rootEl, classId) {
  const inputs = rootEl.querySelectorAll(`.matrix-input[data-class-id="${classId}"], .matrix-select[data-class-id="${classId}"]`);
  const values = {};
  inputs.forEach(inp => {
    const field = inp.dataset.field;
    if (field) {
      values[field] = inp.value;
    }
  });

  return {
    taskRepetitions: Math.max(1, parseInt(values.taskRepetitions, 10) || 7),
    taskMinScore: Math.min(100, Math.max(1, parseInt(values.taskMinScore, 10) || 70)),
    examMinScore: Math.min(100, Math.max(1, parseInt(values.examMinScore, 10) || 60)),
    taskQuestionOrder: values.taskQuestionOrder === 'sequential' ? 'sequential' : 'random',
    examQuestionOrder: values.examQuestionOrder === 'sequential' ? 'sequential' : 'random',
    wordsTaskQuestions: String(values.wordsTaskQuestions || 'ALL').toUpperCase() === 'ALL' ? 'ALL' : (values.wordsTaskQuestions || 'ALL'),
    phrasesTaskQuestions: String(values.phrasesTaskQuestions || 'ALL').toUpperCase() === 'ALL' ? 'ALL' : (values.phrasesTaskQuestions || 'ALL'),
    wordsTaskAnswer: values.wordsTaskAnswer || 'spoken',
    phrasesTaskAnswer: values.phrasesTaskAnswer || 'spoken',
    wordsTaskPace: parseInt(values.wordsTaskPace, 10) || 15,
    phrasesTaskPace: parseInt(values.phrasesTaskPace, 10) || 20,
    wordsTaskDur: parseInt(values.wordsTaskDur, 10) || 5,
    phrasesTaskDur: parseInt(values.phrasesTaskDur, 10) || 4,
    wordsExamQuestions: String(values.wordsExamQuestions || 'ALL').toUpperCase() === 'ALL' ? 'ALL' : (values.wordsExamQuestions || 'ALL'),
    phrasesExamQuestions: String(values.phrasesExamQuestions || 'ALL').toUpperCase() === 'ALL' ? 'ALL' : (values.phrasesExamQuestions || 'ALL'),
    wordsExamAnswer: values.wordsExamAnswer || 'spoken',
    phrasesExamAnswer: values.phrasesExamAnswer || 'selection',
    wordsExamPace: parseInt(values.wordsExamPace, 10) || 15,
    phrasesExamPace: parseInt(values.phrasesExamPace, 10) || 20,
    wordsExamDur: parseInt(values.wordsExamDur, 10) || 30,
    phrasesExamDur: parseInt(values.phrasesExamDur, 10) || 10
  };
}

/**
 * 1. FULL-PAGE VIEW MODE
 * Renders the master matrix directly into #admin-content-area (Curriculum Management #class-hub)
 */
export async function renderVocabularySystemPage(container, options = {}) {
  if (!container) return;

  container.innerHTML = `
    <div id="vocabulary-system-page-container" style="display:flex; flex-direction:column; flex:1 1 0; min-height:0; height:100%; box-sizing:border-box;">
      <div class="topscore-loading-center" style="min-height: 200px !important;">
        <div class="spinner"></div>
        <p class="loading-text">Loading Vocabulary System Matrix...</p>
      </div>
    </div>
  `;

  try {
    const { enriched: vocabClasses } = await loadAllVocabClassesData();
    let currentActiveClassId = options.explicitClassId || vocabClasses[0]?.id || null;
    let isAllUnlocked = false;

    const render = () => {
      const pageContainer = document.getElementById('vocabulary-system-page-container');
      if (!pageContainer) return;

      const activeClass = vocabClasses.find(c => String(c.id) === String(currentActiveClassId)) || vocabClasses[0];

      // Strict Top Element Invariant: Direct Ceiling Docking (Zero floating sub-header bar above table)
      pageContainer.innerHTML = buildMatrixHtml(vocabClasses, currentActiveClassId, isAllUnlocked);

      // Wire Unlock Row triggers
      pageContainer.querySelectorAll('.btn-unlock-row').forEach(btn => {
        btn.onclick = () => {
          currentActiveClassId = btn.dataset.classId;
          isAllUnlocked = false;
          render();
        };
      });

      // Wire Live Duration Auto-Calculation
      pageContainer.querySelectorAll('.matrix-input').forEach(inp => {
        inp.addEventListener('input', () => {
          const targetRow = inp.closest('tr');
          if (!targetRow) return;
          const qVal = parseInt(targetRow.querySelector('[data-field$="Questions"]')?.value, 10) || 10;
          const pVal = parseInt(targetRow.querySelector('[data-field$="Pace"]')?.value, 10) || 15;
          const durInput = targetRow.querySelector('[data-field$="Dur"]');
          if (durInput && qVal && pVal) {
            durInput.value = Math.max(1, Math.ceil((qVal * pVal) / 60));
          }
        });
      });

      // Sub Panel Monopoly for Status & Actions (AGENTS.md §0.2.3)
      const leftHtml = `
        <div style="display:inline-flex; align-items:center; gap:8px; font-size:12px; color:#cbd5e1; font-weight:600; white-space:nowrap;">
          <span style="font-weight:800; color:#38bdf8; text-transform:uppercase;">VOCABULARY SYSTEM:</span>
          <span>Target: <strong style="color:#f8fafc;">${isAllUnlocked ? 'All Vocabulary Classes' : escapeHtml(activeClass?.name)}</strong></span>
          ${isAllUnlocked ? '<span class="badge" style="background:rgba(255,140,0,0.2); color:#FF8C00; font-weight:700;">ALL UNLOCKED</span>' : ''}
        </div>
      `;

      const rightHtml = `
        <div style="display:inline-flex; align-items:center; gap:8px; white-space:nowrap;">
          <button type="button" class="btn btn-outline btn-sm" id="btn-toggle-unlock-all" style="height:30px !important; line-height:28px !important; padding:0 10px !important; font-size:12px !important; font-weight:700; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; border-color:${isAllUnlocked ? '#FF8C00' : 'rgba(255,255,255,0.2)'}; color:${isAllUnlocked ? '#FF8C00' : '#cbd5e1'};" title="Toggle full matrix editing">
            ${getSvgIcon('unlock', 13)} ${isAllUnlocked ? 'Lock Other Classes' : 'Unlock All Classes'}
          </button>
          <button type="button" class="btn btn-outline btn-sm" id="btn-page-open-vault" style="height:30px !important; line-height:28px !important; padding:0 10px !important; font-size:12px !important; font-weight:700; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; border-color:var(--grade-star, #a855f7); color:var(--grade-star, #a855f7);" title="Open Topic Blueprint &amp; Vocabulary Vault">
            ${getSvgIcon('book-open', 13)} Vault ↗
          </button>
          <button type="button" class="btn btn-outline btn-sm" onclick="if(window.toggleClassesHubView){window.toggleClassesHubView('CARDS');}" style="height:30px !important; line-height:28px !important; padding:0 10px !important; font-size:12px !important; font-weight:700; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; border-color:#94a3b8; color:#94a3b8;" title="Switch to Class Directory Overview">
            ${getSvgIcon('grid', 13)} Directory Cards
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-save-page-settings" style="height:30px !important; line-height:28px !important; padding:0 12px !important; font-size:12px !important; font-weight:700; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:5px;" title="Save settings without generating new tests">
            ${getSvgIcon('save', 14)} Update Settings
          </button>
          <button type="button" class="btn btn-primary btn-sm" id="btn-sync-page-all" style="height:30px !important; line-height:28px !important; padding:0 14px !important; font-size:12px !important; font-weight:800; border-radius:4px; cursor:pointer; background:var(--primary-tactical, #38bdf8); color:#0f172a; display:inline-flex; align-items:center; gap:5px;" title="Generate and synchronize tests for active class">
            ${getSvgIcon('zap', 14)} Generate &amp; Sync
          </button>
        </div>
      `;

      if (typeof window.setBottomInfobar === 'function') {
        window.setBottomInfobar(leftHtml, rightHtml);
      }

      // Wire Bottom Toolbar triggers
      document.getElementById('btn-toggle-unlock-all')?.addEventListener('click', () => {
        isAllUnlocked = !isAllUnlocked;
        render();
      });

      document.getElementById('btn-page-open-vault')?.addEventListener('click', () => {
        if (typeof window.loadSection === 'function') window.loadSection('vocab_vault');
        else window.location.hash = '#vocab_vault';
      });

      // Wire Save Handler
      document.getElementById('btn-save-page-settings')?.addEventListener('click', async () => {
        const targetIds = isAllUnlocked ? vocabClasses.map(c => c.id).filter(Boolean) : [currentActiveClassId];
        const saveBtn = document.getElementById('btn-save-page-settings');
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.innerHTML = `${getSvgIcon('clock', 14)} Saving...`;
        }

        try {
          let count = 0;
          for (const cid of targetIds) {
            const vals = readMatrixInputs(pageContainer, cid);
            await saveClassTestSettings(cid, vals, true);
            await updateClassTestsConfig({
              classId: cid,
              taskRepetitions: vals.taskRepetitions,
              taskPassingScore: vals.taskMinScore,
              testPassingScore: vals.examMinScore,
              taskDurationMinutes: vals.wordsTaskDur,
              wordsTaskDurationMinutes: vals.wordsTaskDur,
              phrasesTaskDurationMinutes: vals.phrasesTaskDur,
              wordsTaskPaceSeconds: vals.wordsTaskPace,
              phrasesTaskPaceSeconds: vals.phrasesTaskPace,
              wordsExamPaceSeconds: vals.wordsExamPace,
              phrasesExamPaceSeconds: vals.phrasesExamPace,
              wordsTaskAnswerType: vals.wordsTaskAnswer,
              phrasesTaskAnswerType: vals.phrasesTaskAnswer,
              wordsTestAnswerType: vals.wordsExamAnswer,
              phrasesTestAnswerType: vals.phrasesExamAnswer,
              taskQuestionOrder: vals.taskQuestionOrder,
              examQuestionOrder: vals.examQuestionOrder
            });
            count++;
          }
          showToast(`Successfully saved settings for ${count} Vocabulary class(es)!`, 'success');
          render();
        } catch (err) {
          console.error('[renderVocabularySystemPage] Save error:', err);
          showToast('Failed to save settings: ' + err.message, 'error');
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `${getSvgIcon('save', 14)} Update Settings`;
          }
        }
      });

      // Wire Sync Handler
      document.getElementById('btn-sync-page-all')?.addEventListener('click', async () => {
        if (!currentActiveClassId) return;
        const targetClass = vocabClasses.find(c => String(c.id) === String(currentActiveClassId));
        const syncBtn = document.getElementById('btn-sync-page-all');
        if (syncBtn) {
          syncBtn.disabled = true;
          syncBtn.innerHTML = `${getSvgIcon('clock', 14)} Syncing...`;
        }

        try {
          const vals = readMatrixInputs(pageContainer, currentActiveClassId);
          await saveClassTestSettings(currentActiveClassId, vals, true);
          const res = await autoGenerateTestsHierarchy([targetClass.levelNumber], {
            programId: targetClass.programId,
            institutionId: targetClass.institutionId,
            explicitClassId: currentActiveClassId,
            category: targetClass.hasPhrases ? 'all' : 'words',
            taskDurationMinutes: vals.wordsTaskQuestionsCustom ? vals.wordsTaskDur : null,
            wordsTaskDurationMinutes: vals.wordsTaskQuestionsCustom ? vals.wordsTaskDur : null,
            phrasesTaskDurationMinutes: vals.phrasesTaskQuestionsCustom ? vals.phrasesTaskDur : null,
            wordsExamDurationMinutes: vals.wordsExamQuestionsCustom ? vals.wordsExamDur : null,
            phrasesExamDurationMinutes: vals.phrasesExamQuestionsCustom ? vals.phrasesExamDur : null,
            wordsTaskPaceSeconds: vals.wordsTaskPace,
            phrasesTaskPaceSeconds: vals.phrasesTaskPace,
            wordsExamPaceSeconds: vals.wordsExamPace,
            phrasesExamPaceSeconds: vals.phrasesExamPace,
            wordsTaskAnswerType: vals.wordsTaskAnswer,
            phrasesTaskAnswerType: vals.phrasesTaskAnswer,
            wordsTestAnswerType: vals.wordsExamAnswer,
            phrasesTestAnswerType: vals.phrasesExamAnswer,
            taskPassingScore: vals.taskMinScore,
            testPassingScore: vals.examMinScore,
            taskQuestionOrder: vals.taskQuestionOrder,
            examQuestionOrder: vals.examQuestionOrder
          });
          showToast(`Synchronized ${res.tasks ?? 0} Tasks & ${res.exams ?? 0} Exams for ${targetClass.name}!`, 'success');
          render();
        } catch (err) {
          console.error('[renderVocabularySystemPage] Sync error:', err);
          showToast('Failed to sync tests: ' + err.message, 'error');
          if (syncBtn) {
            syncBtn.disabled = false;
            syncBtn.innerHTML = `${getSvgIcon('zap', 14)} Generate &amp; Sync`;
          }
        }
      });
    };

    render();
  } catch (err) {
    console.error('[renderVocabularySystemPage] Error:', err);
    container.innerHTML = `
      <div style="padding:24px; text-align:center; color:var(--grade-e);">
        <p style="font-weight:700;">Failed to load Vocabulary System Matrix</p>
        <p style="font-size:12px; color:#94a3b8;">${err?.message || err}</p>
      </div>
    `;
  }
}

/**
 * 2. MODAL DIALOG MODE (openVocabularySystemModal / openAutoGenerateModal)
 * Opened from Class Tests tab or Vocabulary Vault
 */
export async function openVocabularySystemModal(options = {}) {
  const {
    explicitClassId = null,
    onComplete = null
  } = options;

  // Remove existing modal if any
  document.getElementById('vocabulary-system-modal-overlay')?.remove();

  // Show canonical centered loading indicator while preparing modal data
  const loading = document.createElement('div');
  loading.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.85);backdrop-filter:blur(4px);z-index:9999;display:flex;align-items:center;justify-content:center;color:white;';
  loading.innerHTML = `
    <div class="topscore-loading-center" style="min-height: 140px !important;">
      <div class="spinner"></div>
      <p class="loading-text">Preparing Vocabulary System Matrix...</p>
    </div>
  `;
  document.body.appendChild(loading);

  try {
    const { enriched: vocabClasses } = await loadAllVocabClassesData();
    loading.remove();

    // Determine current active class (default to explicitClassId or selected class)
    const currentClassId = explicitClassId || window._selectedClassId || localStorage.getItem('topscore_selected_class_id');
    let matchedClass = vocabClasses.find(c => String(c.id) === String(currentClassId)) || vocabClasses[0];

    const overlay = document.createElement('div');
    overlay.className = 'topscore-modal-overlay';
    overlay.id = 'vocabulary-system-modal-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);backdrop-filter:blur(6px);z-index:10000;display:flex;align-items:center;justify-content:center;padding:10px;box-sizing:border-box;animation:fadeIn 0.15s ease-out;';

    let currentScope = 'this';
    let selectedThemes = null; // null = ALL THEMES, Set<string> = specific theme codes
    let previewFilterMode = 'active'; // 'active' (4 rows) or 'all' (24 rows)
    let isPreviewVisible = true;

    const getAvailableThemesForScope = (activeClass) => {
      if (currentScope === 'all') {
        const unionMap = new Map();
        for (const vc of vocabClasses) {
          for (const t of (vc.themes || [])) {
            if (!unionMap.has(t.code)) {
              unionMap.set(t.code, { code: t.code, displayCode: t.code, name: t.name });
            }
          }
        }
        return Array.from(unionMap.values()).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true, sensitivity: 'base' }));
      }
      return activeClass?.themes || [];
    };

    const buildThemeSelectorRowHtml = (activeClass) => {
      const availableThemes = getAvailableThemesForScope(activeClass);
      const isAllMode = !selectedThemes || selectedThemes.size === 0;
      const allBtnStyle = isAllMode
        ? 'background:rgba(56,189,248,0.25); border:1px solid #38bdf8; color:#38bdf8; font-weight:800;'
        : 'background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); color:#94a3b8; font-weight:700;';

      const themePillsHtml = availableThemes.map(t => {
        const isSelected = !isAllMode && selectedThemes.has(t.code);
        const pillStyle = isSelected
          ? 'background:rgba(56,189,248,0.22); border:1px solid #38bdf8; color:#ffffff; font-weight:800;'
          : 'background:#090d16; border:1px solid rgba(255,255,255,0.15); color:#cbd5e1; font-weight:600;';
        return `
          <button type="button" class="wiz-theme-pill-btn ${isSelected ? 'active' : ''}" data-theme-code="${escapeHtml(t.code)}" style="height:28px; padding:0 10px; border-radius:4px; font-size:12px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; white-space:nowrap; transition:all 0.12s ease; ${pillStyle}" title="Toggle Theme ${escapeHtml(t.displayCode)} — ${escapeHtml(t.name)}">
            <span style="color:${isSelected ? '#38bdf8' : '#94a3b8'}; font-weight:800;">${escapeHtml(t.displayCode)}</span>
            <span>— ${escapeHtml(t.name)}</span>
          </button>
        `;
      }).join('');

      const hintText = availableThemes.length === 0
        ? 'No themes found in Vocabulary Vault'
        : (isAllMode
            ? `Applying to all ${availableThemes.length} theme(s)`
            : `Applying to ${selectedThemes.size} of ${availableThemes.length} theme(s) only`);
      const hintColor = (!isAllMode && availableThemes.length > 0) ? '#fbbf24' : '#94a3b8';

      return `
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; border-top:1px solid rgba(56,189,248,0.15); padding-top:8px;">
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; flex:1;">
            <span style="color:#38bdf8;">${getSvgIcon('layers', 15)}</span>
            <span style="font-size:12px; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.04em; white-space:nowrap;">APPLY TO THEMES:</span>
            <div id="wiz-theme-pills-wrap" style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
              <button type="button" id="wiz-theme-all-btn" class="wiz-theme-all-btn ${isAllMode ? 'active' : ''}" style="height:28px; padding:0 10px; border-radius:4px; font-size:12px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; white-space:nowrap; transition:all 0.12s ease; ${allBtnStyle}">
                ALL THEMES
              </button>
              ${themePillsHtml}
            </div>
          </div>
          <span id="wiz-theme-selection-hint" style="font-size:12px; font-weight:700; color:${hintColor}; white-space:nowrap;">${escapeHtml(hintText)}</span>
        </div>
      `;
    };

    const buildWizardPanelsHtml = (activeClass) => {
      const s = activeClass.settings || {};
      const taskReps = s.taskRepetitions === 14 ? 7 : (s.taskRepetitions || 7);

      const isWordsTaskCustom = Boolean(s.wordsTaskQuestionsCustom) && s.wordsTaskQuestions && String(s.wordsTaskQuestions).toUpperCase() !== 'ALL';
      const wordsTaskNum = (s.wordsTaskQuestions && String(s.wordsTaskQuestions).toUpperCase() !== 'ALL') ? String(s.wordsTaskQuestions) : '10';

      const isPhrasesTaskCustom = Boolean(s.phrasesTaskQuestionsCustom) && s.phrasesTaskQuestions && String(s.phrasesTaskQuestions).toUpperCase() !== 'ALL';
      const phrasesTaskNum = (s.phrasesTaskQuestions && String(s.phrasesTaskQuestions).toUpperCase() !== 'ALL') ? String(s.phrasesTaskQuestions) : '10';

      const isWordsExamCustom = Boolean(s.wordsExamQuestionsCustom) && s.wordsExamQuestions && String(s.wordsExamQuestions).toUpperCase() !== 'ALL';
      const wordsExamNum = (s.wordsExamQuestions && String(s.wordsExamQuestions).toUpperCase() !== 'ALL') ? String(s.wordsExamQuestions) : (activeClass.hasPhrases ? '30' : '20');

      const isPhrasesExamCustom = Boolean(s.phrasesExamQuestionsCustom) && s.phrasesExamQuestions && String(s.phrasesExamQuestions).toUpperCase() !== 'ALL';
      const phrasesExamNum = (s.phrasesExamQuestions && String(s.phrasesExamQuestions).toUpperCase() !== 'ALL') ? String(s.phrasesExamQuestions) : '10';

      return `
        <!-- Wizard Scope & Active Class Bar -->
        <div class="wizard-panel card-scope" style="background:#131c31; border:1px solid rgba(56,189,248,0.25); border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span style="color:#38bdf8;">${getSvgIcon('book-open', 16)}</span>
              <span style="font-size:12px; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.04em;">CONFIGURE TARGET:</span>
              <select id="wiz-active-class-select" style="height:32px; min-width:280px; font-size:12px; font-weight:700; background:#090d16; border:1.5px solid #38bdf8; border-radius:6px; color:#ffffff; padding:0 8px; cursor:pointer;">
                ${vocabClasses.map(c => `
                  <option value="${c.id}" ${String(c.id) === String(activeClass.id) ? 'selected' : ''}>
                    ${escapeHtml(c.institution || 'CEC')} • ${escapeHtml(c.program || 'Camp')} • ${escapeHtml(c.levelLabel)} — ${escapeHtml(c.name)}
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Segmented Scope Control -->
            <div class="wiz-scope-segmented" style="display:inline-flex; background:#090d16; border:1px solid rgba(56,189,248,0.35); border-radius:6px; overflow:hidden; height:32px;">
              <button type="button" class="wiz-scope-btn ${currentScope === 'this' ? 'active' : ''}" data-scope="this" style="padding:0 14px; font-size:12px; font-weight:800; border:none; background:${currentScope === 'this' ? 'rgba(56,189,248,0.25)' : 'transparent'}; color:${currentScope === 'this' ? '#38bdf8' : '#94a3b8'}; cursor:pointer; transition:all 0.12s ease;">
                Apply to Active Class Only
              </button>
              <button type="button" class="wiz-scope-btn ${currentScope === 'all' ? 'active' : ''}" data-scope="all" style="padding:0 14px; font-size:12px; font-weight:700; border:none; background:${currentScope === 'all' ? 'rgba(56,189,248,0.25)' : 'transparent'}; color:${currentScope === 'all' ? '#38bdf8' : '#94a3b8'}; cursor:pointer; transition:all 0.12s ease;">
                Apply to All 6 Classes
              </button>
            </div>
          </div>
          <div id="wiz-theme-selector-container">
            ${buildThemeSelectorRowHtml(activeClass)}
          </div>
        </div>

        <!-- Two-Pillar Configuration Grid -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; width:100%; box-sizing:border-box;">
          
          <!-- Pillar 1: Formative Tasks Engine (Lime Theme) -->
          <div class="wizard-panel card-tasks" style="background:#131c31; border:1.5px solid rgba(149,255,0,0.35); border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(149,255,0,0.2); padding-bottom:6px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="color:#95ff00;">${getSvgIcon('repeat', 16)}</span>
                <span style="font-size:13px; font-weight:800; color:#95ff00; text-transform:uppercase; letter-spacing:0.04em;">FORMATIVE TASKS CONFIGURATION</span>
              </div>
            </div>

            <!-- Top Controls Grid: Reps, Threshold, Order -->
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; background:rgba(0,0,0,0.25); border-radius:6px; padding:10px;">
              <!-- Repetitions Target -->
              <div>
                <label style="display:block; font-size:12px; font-weight:700; color:#cbd5e1; margin-bottom:4px; text-transform:uppercase;">Repetitions Target</label>
                <div style="display:inline-flex; align-items:center; background:#090d16; border:1px solid rgba(149,255,0,0.4); border-radius:4px; padding:0 8px; height:30px; width:88px; box-sizing:border-box;">
                  <input type="number" id="wiz-task-reps" value="${taskReps}" min="1" max="7" style="width:40px; border:none; background:transparent; color:#ffffff; font-size:13px; font-weight:800; text-align:center; padding:0;" />
                  <span style="font-size:12px; font-weight:700; color:#95ff00;">reps</span>
                </div>
                <div style="display:grid; grid-template-columns:repeat(7, minmax(0, 1fr)); gap:4px; margin-top:10px;">
                  <button type="button" class="wiz-preset-pill wiz-preset-pill-lime ${taskReps === 1 ? 'active' : ''}" data-target="wiz-task-reps" data-val="1" style="padding:0 !important; min-width:0;">1x</button>
                  <button type="button" class="wiz-preset-pill wiz-preset-pill-lime ${taskReps === 2 ? 'active' : ''}" data-target="wiz-task-reps" data-val="2" style="padding:0 !important; min-width:0;">2x</button>
                  <button type="button" class="wiz-preset-pill wiz-preset-pill-lime ${taskReps === 3 ? 'active' : ''}" data-target="wiz-task-reps" data-val="3" style="padding:0 !important; min-width:0;">3x</button>
                  <button type="button" class="wiz-preset-pill wiz-preset-pill-lime ${taskReps === 4 ? 'active' : ''}" data-target="wiz-task-reps" data-val="4" style="padding:0 !important; min-width:0;">4x</button>
                  <button type="button" class="wiz-preset-pill wiz-preset-pill-lime ${taskReps === 5 ? 'active' : ''}" data-target="wiz-task-reps" data-val="5" style="padding:0 !important; min-width:0;">5x</button>
                  <button type="button" class="wiz-preset-pill wiz-preset-pill-lime ${taskReps === 6 ? 'active' : ''}" data-target="wiz-task-reps" data-val="6" style="padding:0 !important; min-width:0;">6x</button>
                  <button type="button" class="wiz-preset-pill wiz-preset-pill-lime ${taskReps === 7 ? 'active' : ''}" data-target="wiz-task-reps" data-val="7" style="padding:0 !important; min-width:0;">7x</button>
                </div>
              </div>

              <!-- Passing Threshold -->
              <div>
                <label style="display:block; font-size:12px; font-weight:700; color:#cbd5e1; margin-bottom:4px; text-transform:uppercase;">Passing Threshold</label>
                <div style="display:inline-flex; align-items:center; background:#090d16; border:1px solid rgba(149,255,0,0.4); border-radius:4px; padding:0 8px; height:30px; width:80px; box-sizing:border-box;">
                  <input type="number" id="wiz-task-min-score" value="${s.taskMinScore || 70}" min="1" max="100" style="width:38px; border:none; background:transparent; color:#ffffff; font-size:13px; font-weight:800; text-align:center; padding:0;" />
                  <span style="font-size:12px; font-weight:700; color:#95ff00;">%</span>
                </div>
                <div style="display:flex; gap:5px; margin-top:10px;">
                  <button type="button" class="wiz-preset-pill wiz-preset-pill-lime ${(s.taskMinScore || 70) === 60 ? 'active' : ''}" data-target="wiz-task-min-score" data-val="60">60%</button>
                  <button type="button" class="wiz-preset-pill wiz-preset-pill-lime ${(s.taskMinScore || 70) === 70 ? 'active' : ''}" data-target="wiz-task-min-score" data-val="70">70%</button>
                  <button type="button" class="wiz-preset-pill wiz-preset-pill-lime ${(s.taskMinScore || 70) === 80 ? 'active' : ''}" data-target="wiz-task-min-score" data-val="80">80%</button>
                </div>
              </div>

              <!-- Question Order -->
              <div>
                <label style="display:block; font-size:12px; font-weight:700; color:#cbd5e1; margin-bottom:4px; text-transform:uppercase;">Question Order</label>
                <input type="hidden" id="wiz-task-order" value="${s.taskQuestionOrder || 'random'}" />
                <div class="wiz-segmented-order" style="display:flex; height:30px; background:#090d16; border:1px solid rgba(149,255,0,0.4); border-radius:4px; overflow:hidden;">
                  <button type="button" class="wiz-order-task-btn ${(s.taskQuestionOrder || 'random') === 'random' ? 'active' : ''}" data-val="random" style="flex:1; border:none; background:${(s.taskQuestionOrder || 'random') === 'random' ? 'rgba(149,255,0,0.22)' : 'transparent'}; color:${(s.taskQuestionOrder || 'random') === 'random' ? '#95ff00' : '#94a3b8'}; font-size:12px; font-weight:800; cursor:pointer;">Random</button>
                  <button type="button" class="wiz-order-task-btn ${(s.taskQuestionOrder || 'random') === 'sequential' ? 'active' : ''}" data-val="sequential" style="flex:1; border:none; background:${(s.taskQuestionOrder || 'random') === 'sequential' ? 'rgba(149,255,0,0.22)' : 'transparent'}; color:${(s.taskQuestionOrder || 'random') === 'sequential' ? '#95ff00' : '#94a3b8'}; font-size:12px; font-weight:700; cursor:pointer;">Sequential</button>
                </div>
                <span style="font-size:12px; font-weight:600; color:#64748b; line-height:24px; display:block; margin-top:10px;">Shuffled per attempt</span>
              </div>
            </div>

            <!-- Horizontal Side-by-Side: Words Task & Phrases Task -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <!-- Sub-Card: Words Task -->
              <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <span style="font-size:13px; font-weight:800; color:#f8fafc;">Standard Vocabulary Task (Word)</span>
                  <div style="font-size:12px; color:#94a3b8; font-weight:600;">
                    Duration: <strong id="wiz-words-task-dur-display" style="color:#95ff00; font-size:13px; font-weight:800;">${s.wordsTaskDur || 5}m</strong>
                  </div>
                </div>

                <!-- Row 1: Questions (Unified Capsule Control) & Answer Mode -->
                <div style="display:grid; grid-template-columns:115px 1fr; gap:10px; align-items:center;">
                  <div>
                    <label style="display:block; font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">Questions</label>
                    <div class="wiz-q-capsule" id="wiz-words-task-capsule" style="display:inline-flex; align-items:center; height:30px; background:#090d16; border:1px solid ${isWordsTaskCustom ? '#95ff00' : 'rgba(255,255,255,0.2)'}; border-radius:4px; overflow:hidden; box-sizing:border-box;">
                      <button type="button" class="wiz-q-btn-all" id="wiz-words-task-btn-all" data-target-check="wiz-words-task-custom" style="height:100%; border:none; padding:0 10px; font-size:12px; font-weight:${!isWordsTaskCustom ? '800' : '700'}; cursor:pointer; background:${!isWordsTaskCustom ? 'rgba(149,255,0,0.22)' : 'transparent'}; color:${!isWordsTaskCustom ? '#95ff00' : '#64748b'}; transition:all 0.12s ease;">ALL</button>
                      <div style="width:1px; height:18px; background:rgba(255,255,255,0.12);"></div>
                      <label id="wiz-words-task-custom-label" style="display:inline-flex; align-items:center; height:100%; padding:0 6px; gap:4px; cursor:pointer; background:${isWordsTaskCustom ? 'rgba(149,255,0,0.12)' : 'transparent'}; transition:all 0.12s ease;" title="Check to set custom question count">
                        <input type="checkbox" id="wiz-words-task-custom" class="wiz-q-custom-check" data-target="wiz-words-task-questions" data-capsule="wiz-words-task-capsule" data-btn-all="wiz-words-task-btn-all" data-custom-label="wiz-words-task-custom-label" data-color="#95ff00" data-rgb="149,255,0" ${isWordsTaskCustom ? 'checked' : ''} style="cursor:pointer; accent-color:#95ff00; width:13px; height:13px; margin:0;" />
                        <input type="number" id="wiz-words-task-questions" class="wiz-q-num-input" data-check="wiz-words-task-custom" value="${wordsTaskNum}" min="1" max="200" ${!isWordsTaskCustom ? 'disabled' : ''} style="height:26px; width:36px; text-align:center; font-size:12px; font-weight:800; background:transparent; border:none; color:${isWordsTaskCustom ? '#ffffff' : '#64748b'}; padding:0; outline:none; ${!isWordsTaskCustom ? 'opacity:0.4;' : ''}" />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label style="display:block; font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">Answer Mode</label>
                    <select id="wiz-words-task-answer" style="height:30px; width:100%; font-size:12px; font-weight:600; background:#090d16; border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#ffffff; padding:0 8px;">
                      <option value="spoken" ${(s.wordsTaskAnswer || 'spoken') === 'spoken' ? 'selected' : ''}>Spoken</option>
                      <option value="selection" ${(s.wordsTaskAnswer || 'spoken') === 'selection' ? 'selected' : ''}>Recognition</option>
                      <option value="written" ${(s.wordsTaskAnswer || 'spoken') === 'written' ? 'selected' : ''}>Written</option>
                      <option value="mixed" ${(s.wordsTaskAnswer || 'spoken') === 'mixed' ? 'selected' : ''}>Mixed (Hybrid)</option>
                    </select>
                  </div>
                </div>

                <!-- Row 2: Pace / Question -->
                <div>
                  <label style="display:block; font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">Pace / Question</label>
                  <div style="display:flex; align-items:center; gap:10px;">
                    <div style="display:inline-flex; align-items:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); border-radius:4px; padding:0 8px; height:30px; width:62px; box-sizing:border-box;">
                      <input type="number" id="wiz-words-task-pace" value="${s.wordsTaskPace || 15}" min="5" max="60" style="width:32px; border:none; background:transparent; color:#ffffff; font-size:12px; font-weight:800; text-align:center; padding:0;" />
                      <span style="font-size:12px; font-weight:700; color:#94a3b8;">s</span>
                    </div>
                    <div style="display:flex; gap:5px;">
                      ${[10, 15, 20, 25, 30].map(v => `<button type="button" class="wiz-preset-pill-mini wiz-preset-pill-lime ${(s.wordsTaskPace || 15) === v ? 'active' : ''}" data-target="wiz-words-task-pace" data-val="${v}">${v}s</button>`).join('')}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Sub-Card: Phrases Task -->
              <div style="background:rgba(0,0,0,0.3); border:1px solid ${activeClass.hasPhrases ? 'rgba(255,140,0,0.2)' : 'rgba(255,255,255,0.05)'}; border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:10px; opacity:${activeClass.hasPhrases ? '1' : '0.45'};">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <span style="font-size:13px; font-weight:800; color:#f8fafc;">Phrases Component (Phrase)</span>
                  <div style="font-size:12px; color:#94a3b8; font-weight:600;">
                    Duration: <strong id="wiz-phrases-task-dur-display" style="color:#FF8C00; font-size:13px; font-weight:800;">${activeClass.hasPhrases ? (s.phrasesTaskDur || 4) : 0}m</strong>
                  </div>
                </div>

                <!-- Row 1: Questions (Unified Capsule Control) & Answer Mode -->
                <div style="display:grid; grid-template-columns:115px 1fr; gap:10px; align-items:center;">
                  <div>
                    <label style="display:block; font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">Questions</label>
                    <div class="wiz-q-capsule" id="wiz-phrases-task-capsule" style="display:inline-flex; align-items:center; height:30px; background:#090d16; border:1px solid ${isPhrasesTaskCustom && activeClass.hasPhrases ? '#FF8C00' : 'rgba(255,255,255,0.2)'}; border-radius:4px; overflow:hidden; box-sizing:border-box; opacity:${activeClass.hasPhrases ? '1' : '0.5'};">
                      <button type="button" class="wiz-q-btn-all" id="wiz-phrases-task-btn-all" data-target-check="wiz-phrases-task-custom" ${!activeClass.hasPhrases ? 'disabled' : ''} style="height:100%; border:none; padding:0 10px; font-size:12px; font-weight:${!isPhrasesTaskCustom ? '800' : '700'}; cursor:pointer; background:${!isPhrasesTaskCustom && activeClass.hasPhrases ? 'rgba(255,140,0,0.25)' : 'transparent'}; color:${!isPhrasesTaskCustom && activeClass.hasPhrases ? '#FF8C00' : '#64748b'}; transition:all 0.12s ease;">ALL</button>
                      <div style="width:1px; height:18px; background:rgba(255,255,255,0.12);"></div>
                      <label id="wiz-phrases-task-custom-label" style="display:inline-flex; align-items:center; height:100%; padding:0 6px; gap:4px; cursor:pointer; background:${isPhrasesTaskCustom && activeClass.hasPhrases ? 'rgba(255,140,0,0.12)' : 'transparent'}; transition:all 0.12s ease;" title="Check to set custom question count">
                        <input type="checkbox" id="wiz-phrases-task-custom" class="wiz-q-custom-check" data-target="wiz-phrases-task-questions" data-capsule="wiz-phrases-task-capsule" data-btn-all="wiz-phrases-task-btn-all" data-custom-label="wiz-phrases-task-custom-label" data-color="#FF8C00" data-rgb="255,140,0" ${!activeClass.hasPhrases ? 'disabled' : ''} ${isPhrasesTaskCustom && activeClass.hasPhrases ? 'checked' : ''} style="cursor:pointer; accent-color:#FF8C00; width:13px; height:13px; margin:0;" />
                        <input type="number" id="wiz-phrases-task-questions" class="wiz-q-num-input" data-check="wiz-phrases-task-custom" value="${phrasesTaskNum}" min="1" max="200" ${!activeClass.hasPhrases || !isPhrasesTaskCustom ? 'disabled' : ''} style="height:26px; width:36px; text-align:center; font-size:12px; font-weight:800; background:transparent; border:none; color:${isPhrasesTaskCustom && activeClass.hasPhrases ? '#ffffff' : '#64748b'}; padding:0; outline:none; ${!isPhrasesTaskCustom || !activeClass.hasPhrases ? 'opacity:0.4;' : ''}" />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label style="display:block; font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">Answer Mode</label>
                    <select id="wiz-phrases-task-answer" ${!activeClass.hasPhrases ? 'disabled' : ''} style="height:30px; width:100%; font-size:12px; font-weight:600; background:#090d16; border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#ffffff; padding:0 8px;">
                      <option value="spoken" ${(s.phrasesTaskAnswer || 'spoken') === 'spoken' ? 'selected' : ''}>Spoken</option>
                      <option value="selection" ${(s.phrasesTaskAnswer || 'spoken') === 'selection' ? 'selected' : ''}>Recognition</option>
                      <option value="written" ${(s.phrasesTaskAnswer || 'spoken') === 'written' ? 'selected' : ''}>Written</option>
                      <option value="mixed" ${(s.phrasesTaskAnswer || 'spoken') === 'mixed' ? 'selected' : ''}>Mixed (Hybrid)</option>
                    </select>
                  </div>
                </div>

                <!-- Row 2: Pace / Question -->
                <div>
                  <label style="display:block; font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">Pace / Question</label>
                  <div style="display:flex; align-items:center; gap:10px;">
                    <div style="display:inline-flex; align-items:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); border-radius:4px; padding:0 8px; height:30px; width:62px; box-sizing:border-box;">
                      <input type="number" id="wiz-phrases-task-pace" value="${s.phrasesTaskPace || 20}" min="5" max="60" ${!activeClass.hasPhrases ? 'disabled' : ''} style="width:32px; border:none; background:transparent; color:#ffffff; font-size:12px; font-weight:800; text-align:center; padding:0;" />
                      <span style="font-size:12px; font-weight:700; color:#94a3b8;">s</span>
                    </div>
                    <div style="display:flex; gap:5px;">
                      ${[10, 15, 20, 25, 30].map(v => `<button type="button" class="wiz-preset-pill-mini wiz-preset-pill-orange ${(s.phrasesTaskPace || 20) === v ? 'active' : ''}" data-target="wiz-phrases-task-pace" data-val="${v}" ${!activeClass.hasPhrases ? 'disabled' : ''}>${v}s</button>`).join('')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Pillar 2: Milestone Exams Engine (Pink Theme) -->
          <div class="wizard-panel card-exams" style="background:#131c31; border:1.5px solid rgba(255,45,135,0.35); border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid rgba(255,45,135,0.2); padding-bottom:6px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="color:#ff2d87;">${getSvgIcon('award', 16)}</span>
                <span style="font-size:13px; font-weight:800; color:#ff2d87; text-transform:uppercase; letter-spacing:0.04em;">MILESTONE EXAMS CONFIGURATION</span>
              </div>
            </div>

            <!-- Top Controls Grid: Reps, Threshold, Order -->
            <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; background:rgba(0,0,0,0.25); border-radius:6px; padding:10px;">
              <!-- Repetitions (Fixed 1x) -->
              <div>
                <label style="display:block; font-size:12px; font-weight:700; color:#cbd5e1; margin-bottom:4px; text-transform:uppercase;">Repetitions Requirement</label>
                <div style="height:30px; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; color:#f8fafc; background:#090d16; border:1px solid rgba(255,45,135,0.4); border-radius:4px; padding:0 8px; width:100%; box-sizing:border-box;">
                  1x (Final Exam)
                </div>
                <span style="font-size:12px; color:#64748b; font-weight:600; line-height:24px; display:block; margin-top:10px;">Non-repetitive milestone</span>
              </div>

              <!-- Exam Passing Threshold -->
              <div>
                <label style="display:block; font-size:12px; font-weight:700; color:#cbd5e1; margin-bottom:4px; text-transform:uppercase;">Passing Threshold</label>
                <div style="display:inline-flex; align-items:center; background:#090d16; border:1px solid rgba(255,45,135,0.4); border-radius:4px; padding:0 8px; height:30px; width:80px; box-sizing:border-box;">
                  <input type="number" id="wiz-exam-min-score" value="${s.examMinScore || 60}" min="1" max="100" style="width:38px; border:none; background:transparent; color:#ffffff; font-size:13px; font-weight:800; text-align:center; padding:0;" />
                  <span style="font-size:12px; font-weight:700; color:#ff2d87;">%</span>
                </div>
                <div style="display:flex; gap:5px; margin-top:10px;">
                  <button type="button" class="wiz-preset-pill wiz-preset-pill-pink ${(s.examMinScore || 60) === 60 ? 'active' : ''}" data-target="wiz-exam-min-score" data-val="60">60%</button>
                  <button type="button" class="wiz-preset-pill wiz-preset-pill-pink ${(s.examMinScore || 60) === 70 ? 'active' : ''}" data-target="wiz-exam-min-score" data-val="70">70%</button>
                  <button type="button" class="wiz-preset-pill wiz-preset-pill-pink ${(s.examMinScore || 60) === 75 ? 'active' : ''}" data-target="wiz-exam-min-score" data-val="75">75%</button>
                </div>
              </div>

              <!-- Question Order -->
              <div>
                <label style="display:block; font-size:12px; font-weight:700; color:#cbd5e1; margin-bottom:4px; text-transform:uppercase;">Question Order</label>
                <input type="hidden" id="wiz-exam-order" value="${s.examQuestionOrder || 'random'}" />
                <div class="wiz-segmented-order" style="display:flex; height:30px; background:#090d16; border:1px solid rgba(255,45,135,0.4); border-radius:4px; overflow:hidden;">
                  <button type="button" class="wiz-order-exam-btn ${(s.examQuestionOrder || 'random') === 'random' ? 'active' : ''}" data-val="random" style="flex:1; border:none; background:${(s.examQuestionOrder || 'random') === 'random' ? 'rgba(255,45,135,0.22)' : 'transparent'}; color:${(s.examQuestionOrder || 'random') === 'random' ? '#ff2d87' : '#94a3b8'}; font-size:12px; font-weight:800; cursor:pointer;">Random</button>
                  <button type="button" class="wiz-order-exam-btn ${(s.examQuestionOrder || 'random') === 'sequential' ? 'active' : ''}" data-val="sequential" style="flex:1; border:none; background:${(s.examQuestionOrder || 'random') === 'sequential' ? 'rgba(255,45,135,0.22)' : 'transparent'}; color:${(s.examQuestionOrder || 'random') === 'sequential' ? '#ff2d87' : '#94a3b8'}; font-size:12px; font-weight:700; cursor:pointer;">Sequential</button>
                </div>
                <span style="font-size:12px; font-weight:600; color:#64748b; line-height:24px; display:block; margin-top:10px;">Shuffled per student</span>
              </div>
            </div>

            <!-- Horizontal Side-by-Side: Words Exam & Phrases Exam -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <!-- Sub-Card: Words Periodic Exam -->
              <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:10px;">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <span style="font-size:13px; font-weight:800; color:#f8fafc;">Vocabulary Periodic Exam (Word)</span>
                  <div style="font-size:12px; color:#94a3b8; font-weight:600;">
                    Duration: <strong id="wiz-words-exam-dur-display" style="color:#ff2d87; font-size:13px; font-weight:800;">${s.wordsExamDur || (activeClass.hasPhrases ? 30 : 25)}m</strong>
                  </div>
                </div>

                <!-- Row 1: Questions (Unified Capsule Control) & Answer Mode -->
                <div style="display:grid; grid-template-columns:115px 1fr; gap:10px; align-items:center;">
                  <div>
                    <label style="display:block; font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">Questions</label>
                    <div class="wiz-q-capsule" id="wiz-words-exam-capsule" style="display:inline-flex; align-items:center; height:30px; background:#090d16; border:1px solid ${isWordsExamCustom ? '#ff2d87' : 'rgba(255,255,255,0.2)'}; border-radius:4px; overflow:hidden; box-sizing:border-box;">
                      <button type="button" class="wiz-q-btn-all" id="wiz-words-exam-btn-all" data-target-check="wiz-words-exam-custom" style="height:100%; border:none; padding:0 10px; font-size:12px; font-weight:${!isWordsExamCustom ? '800' : '700'}; cursor:pointer; background:${!isWordsExamCustom ? 'rgba(255,45,135,0.25)' : 'transparent'}; color:${!isWordsExamCustom ? '#ff2d87' : '#64748b'}; transition:all 0.12s ease;">ALL</button>
                      <div style="width:1px; height:18px; background:rgba(255,255,255,0.12);"></div>
                      <label id="wiz-words-exam-custom-label" style="display:inline-flex; align-items:center; height:100%; padding:0 6px; gap:4px; cursor:pointer; background:${isWordsExamCustom ? 'rgba(255,45,135,0.12)' : 'transparent'}; transition:all 0.12s ease;" title="Check to set custom question count">
                        <input type="checkbox" id="wiz-words-exam-custom" class="wiz-q-custom-check" data-target="wiz-words-exam-questions" data-capsule="wiz-words-exam-capsule" data-btn-all="wiz-words-exam-btn-all" data-custom-label="wiz-words-exam-custom-label" data-color="#ff2d87" data-rgb="255,45,135" ${isWordsExamCustom ? 'checked' : ''} style="cursor:pointer; accent-color:#ff2d87; width:13px; height:13px; margin:0;" />
                        <input type="number" id="wiz-words-exam-questions" class="wiz-q-num-input" data-check="wiz-words-exam-custom" value="${wordsExamNum}" min="1" max="200" ${!isWordsExamCustom ? 'disabled' : ''} style="height:26px; width:36px; text-align:center; font-size:12px; font-weight:800; background:transparent; border:none; color:${isWordsExamCustom ? '#ffffff' : '#64748b'}; padding:0; outline:none; ${!isWordsExamCustom ? 'opacity:0.4;' : ''}" />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label style="display:block; font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">Answer Mode</label>
                    <select id="wiz-words-exam-answer" style="height:30px; width:100%; font-size:12px; font-weight:600; background:#090d16; border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#ffffff; padding:0 8px;">
                      <option value="spoken" ${(s.wordsExamAnswer || 'spoken') === 'spoken' ? 'selected' : ''}>Spoken</option>
                      <option value="selection" ${(s.wordsExamAnswer || 'spoken') === 'selection' ? 'selected' : ''}>Recognition</option>
                      <option value="written" ${(s.wordsExamAnswer || 'spoken') === 'written' ? 'selected' : ''}>Written</option>
                      <option value="mixed" ${(s.wordsExamAnswer || 'spoken') === 'mixed' ? 'selected' : ''}>Mixed (Hybrid)</option>
                    </select>
                  </div>
                </div>

                <!-- Row 2: Pace / Question -->
                <div>
                  <label style="display:block; font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">Pace / Question</label>
                  <div style="display:flex; align-items:center; gap:10px;">
                    <div style="display:inline-flex; align-items:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); border-radius:4px; padding:0 8px; height:30px; width:62px; box-sizing:border-box;">
                      <input type="number" id="wiz-words-exam-pace" value="${s.wordsExamPace || 15}" min="5" max="60" style="width:32px; border:none; background:transparent; color:#ffffff; font-size:12px; font-weight:800; text-align:center; padding:0;" />
                      <span style="font-size:12px; font-weight:700; color:#94a3b8;">s</span>
                    </div>
                    <div style="display:flex; gap:5px;">
                      ${[10, 15, 20, 25, 30].map(v => `<button type="button" class="wiz-preset-pill-mini wiz-preset-pill-pink ${(s.wordsExamPace || 15) === v ? 'active' : ''}" data-target="wiz-words-exam-pace" data-val="${v}">${v}s</button>`).join('')}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Sub-Card: Phrases Periodic Exam -->
              <div style="background:rgba(0,0,0,0.3); border:1px solid ${activeClass.hasPhrases ? 'rgba(255,140,0,0.2)' : 'rgba(255,255,255,0.05)'}; border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:10px; opacity:${activeClass.hasPhrases ? '1' : '0.45'};">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <span style="font-size:13px; font-weight:800; color:#f8fafc;">Phrases Periodic Exam (Phrase)</span>
                  <div style="font-size:12px; color:#94a3b8; font-weight:600;">
                    Duration: <strong id="wiz-phrases-exam-dur-display" style="color:#FF8C00; font-size:13px; font-weight:800;">${activeClass.hasPhrases ? (s.phrasesExamDur || 10) : 0}m</strong>
                  </div>
                </div>

                <!-- Row 1: Questions (Unified Capsule Control) & Answer Mode -->
                <div style="display:grid; grid-template-columns:115px 1fr; gap:10px; align-items:center;">
                  <div>
                    <label style="display:block; font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">Questions</label>
                    <div class="wiz-q-capsule" id="wiz-phrases-exam-capsule" style="display:inline-flex; align-items:center; height:30px; background:#090d16; border:1px solid ${isPhrasesExamCustom && activeClass.hasPhrases ? '#FF8C00' : 'rgba(255,255,255,0.2)'}; border-radius:4px; overflow:hidden; box-sizing:border-box; opacity:${activeClass.hasPhrases ? '1' : '0.5'};">
                      <button type="button" class="wiz-q-btn-all" id="wiz-phrases-exam-btn-all" data-target-check="wiz-phrases-exam-custom" ${!activeClass.hasPhrases ? 'disabled' : ''} style="height:100%; border:none; padding:0 10px; font-size:12px; font-weight:${!isPhrasesExamCustom ? '800' : '700'}; cursor:pointer; background:${!isPhrasesExamCustom && activeClass.hasPhrases ? 'rgba(255,140,0,0.25)' : 'transparent'}; color:${!isPhrasesExamCustom && activeClass.hasPhrases ? '#FF8C00' : '#64748b'}; transition:all 0.12s ease;">ALL</button>
                      <div style="width:1px; height:18px; background:rgba(255,255,255,0.12);"></div>
                      <label id="wiz-phrases-exam-custom-label" style="display:inline-flex; align-items:center; height:100%; padding:0 6px; gap:4px; cursor:pointer; background:${isPhrasesExamCustom && activeClass.hasPhrases ? 'rgba(255,140,0,0.12)' : 'transparent'}; transition:all 0.12s ease;" title="Check to set custom question count">
                        <input type="checkbox" id="wiz-phrases-exam-custom" class="wiz-q-custom-check" data-target="wiz-phrases-exam-questions" data-capsule="wiz-phrases-exam-capsule" data-btn-all="wiz-phrases-exam-btn-all" data-custom-label="wiz-phrases-exam-custom-label" data-color="#FF8C00" data-rgb="255,140,0" ${!activeClass.hasPhrases ? 'disabled' : ''} ${isPhrasesExamCustom && activeClass.hasPhrases ? 'checked' : ''} style="cursor:pointer; accent-color:#FF8C00; width:13px; height:13px; margin:0;" />
                        <input type="number" id="wiz-phrases-exam-questions" class="wiz-q-num-input" data-check="wiz-phrases-exam-custom" value="${phrasesExamNum}" min="1" max="200" ${!activeClass.hasPhrases || !isPhrasesExamCustom ? 'disabled' : ''} style="height:26px; width:36px; text-align:center; font-size:12px; font-weight:800; background:transparent; border:none; color:${isPhrasesExamCustom && activeClass.hasPhrases ? '#ffffff' : '#64748b'}; padding:0; outline:none; ${!isPhrasesExamCustom || !activeClass.hasPhrases ? 'opacity:0.4;' : ''}" />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label style="display:block; font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">Answer Mode</label>
                    <select id="wiz-phrases-exam-answer" ${!activeClass.hasPhrases ? 'disabled' : ''} style="height:30px; width:100%; font-size:12px; font-weight:600; background:#090d16; border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#ffffff; padding:0 8px;">
                      <option value="selection" ${(s.phrasesExamAnswer || 'selection') === 'selection' ? 'selected' : ''}>Recognition</option>
                      <option value="spoken" ${(s.phrasesExamAnswer || 'selection') === 'spoken' ? 'selected' : ''}>Spoken</option>
                      <option value="written" ${(s.phrasesExamAnswer || 'selection') === 'written' ? 'selected' : ''}>Written</option>
                      <option value="mixed" ${(s.phrasesExamAnswer || 'selection') === 'mixed' ? 'selected' : ''}>Mixed (Hybrid)</option>
                    </select>
                  </div>
                </div>

                <!-- Row 2: Pace / Question -->
                <div>
                  <label style="display:block; font-size:12px; font-weight:700; color:#94a3b8; text-transform:uppercase; margin-bottom:4px;">Pace / Question</label>
                  <div style="display:flex; align-items:center; gap:10px;">
                    <div style="display:inline-flex; align-items:center; background:#090d16; border:1px solid rgba(255,255,255,0.2); border-radius:4px; padding:0 8px; height:30px; width:62px; box-sizing:border-box;">
                      <input type="number" id="wiz-phrases-exam-pace" value="${s.phrasesExamPace || 20}" min="5" max="60" ${!activeClass.hasPhrases ? 'disabled' : ''} style="width:32px; border:none; background:transparent; color:#ffffff; font-size:12px; font-weight:800; text-align:center; padding:0;" />
                      <span style="font-size:12px; font-weight:700; color:#94a3b8;">s</span>
                    </div>
                    <div style="display:flex; gap:5px;">
                      ${[10, 15, 20, 25, 30].map(v => `<button type="button" class="wiz-preset-pill-mini wiz-preset-pill-orange ${(s.phrasesExamPace || 20) === v ? 'active' : ''}" data-target="wiz-phrases-exam-pace" data-val="${v}" ${!activeClass.hasPhrases ? 'disabled' : ''}>${v}s</button>`).join('')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <!-- Panel 3: Live Synchronized Master Matrix Preview -->
        <div class="wizard-panel card-preview" style="background:#131c31; border:1px solid rgba(56,189,248,0.25); border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:10px;">
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="color:#38bdf8;">${getSvgIcon('grid', 15)}</span>
              <span style="font-size:12px; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.04em;">SYNCHRONIZED CURRICULUM MATRIX PREVIEW</span>
              <span style="font-size:12px; color:#94a3b8; font-weight:600;">(Live Real-Time)</span>
            </div>

            <div style="display:flex; align-items:center; gap:8px;">
              <!-- Toggle Preview Scope: Active Class Only vs All Classes -->
              <div style="display:inline-flex; background:#090d16; border:1px solid rgba(56,189,248,0.35); border-radius:4px; overflow:hidden; height:28px;">
                <button type="button" id="wiz-btn-filter-active" class="btn-preview-filter ${previewFilterMode === 'active' ? 'active' : ''}" style="border:none; padding:0 10px; font-size:12px; font-weight:800; background:${previewFilterMode === 'active' ? 'rgba(56,189,248,0.25)' : 'transparent'}; color:${previewFilterMode === 'active' ? '#38bdf8' : '#94a3b8'}; cursor:pointer;">Active Class (4 Rows)</button>
                <button type="button" id="wiz-btn-filter-all" class="btn-preview-filter ${previewFilterMode === 'all' ? 'active' : ''}" style="border:none; padding:0 10px; font-size:12px; font-weight:700; background:${previewFilterMode === 'all' ? 'rgba(56,189,248,0.25)' : 'transparent'}; color:${previewFilterMode === 'all' ? '#38bdf8' : '#94a3b8'}; cursor:pointer;">All 6 Classes</button>
              </div>

              <!-- Toggle Collapse/Expand -->
              <button type="button" id="wiz-btn-toggle-matrix" style="border:1px solid rgba(255,255,255,0.15); border-radius:4px; background:rgba(255,255,255,0.06); color:#cbd5e1; font-size:12px; font-weight:700; height:28px; padding:0 10px; cursor:pointer;">
                ${isPreviewVisible ? '▾ Hide Preview' : '▸ Show Preview'}
              </button>
            </div>
          </div>

          <div id="modal-matrix-table-wrap" style="${isPreviewVisible ? '' : 'display:none;'} max-height:${previewFilterMode === 'active' ? '280px' : '360px'}; min-height:240px; overflow-y:auto; overflow-x:auto;">
            ${buildMatrixHtml(vocabClasses, activeClass.id, false, previewFilterMode === 'active' ? activeClass.id : null)}
          </div>
        </div>
      `;
    };

    overlay.innerHTML = `
      <style>
        #vocabulary-system-modal-overlay .modal-card {
          background: #0f172a; border: 1.5px solid rgba(255, 255, 255, 0.16); border-radius: 12px;
          width: 96vw !important; max-width: 1440px !important; max-height: 94vh; display: flex; flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); overflow: hidden; color: #f8fafc;
        }
        #vocabulary-system-modal-overlay input[type=number]::-webkit-inner-spin-button,
        #vocabulary-system-modal-overlay input[type=number]::-webkit-outer-spin-button {
          -webkit-appearance: none !important;
          margin: 0 !important;
        }
        #vocabulary-system-modal-overlay input[type=number] {
          -moz-appearance: textfield !important;
        }
        #vocabulary-system-modal-overlay .title-area {
          height: 60px !important; min-height: 60px !important; max-height: 60px !important;
          border-bottom: 1.5px solid rgba(255, 255, 255, 0.16) !important;
          display: flex; align-items: center; justify-content: space-between;
          background: #1e293b !important; box-sizing: border-box; padding: 0 16px;
        }
        #vocabulary-system-modal-overlay .title-area h2 {
          margin: 0; font-family: var(--fm-font-display, 'Inter', sans-serif);
          font-size: 15px; font-weight: 800; text-transform: uppercase;
          letter-spacing: 0.05em; color: #38bdf8; display: flex; align-items: center; gap: 8px;
        }
        #vocabulary-system-modal-overlay .modal-body {
          padding: 10px; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; box-sizing: border-box;
          max-height: calc(94vh - 120px);
        }
        #vocabulary-system-modal-overlay .cta-area {
          height: 60px !important; min-height: 60px !important; max-height: 60px !important;
          border-top: 1.5px solid rgba(255, 255, 255, 0.16) !important;
          background: rgba(30, 41, 59, 0.6); display: flex !important; justify-content: space-between !important;
          align-items: center !important; gap: 10px; padding: 0 12px !important; box-sizing: border-box;
        }
        #vocabulary-system-modal-overlay .btn-cta-close {
          height: 40px !important; line-height: 38px !important; padding: 0 16px !important; border-radius: 6px !important;
          font-family: var(--fm-font-display, 'Inter', sans-serif) !important; font-size: 13px !important;
          font-weight: 800 !important; text-transform: uppercase; letter-spacing: 0.03em;
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15);
          color: #94a3b8; cursor: pointer; transition: all 0.15s ease;
        }
        #vocabulary-system-modal-overlay .btn-cta-close:hover {
          background: rgba(255,255,255,0.12) !important; color: #ffffff !important;
        }
        #vocabulary-system-modal-overlay .btn-cta-save {
          height: 40px !important; line-height: 38px !important; padding: 0 16px !important; border-radius: 6px !important;
          font-family: var(--fm-font-display, 'Inter', sans-serif) !important; font-size: 13px !important;
          font-weight: 800 !important; text-transform: uppercase; letter-spacing: 0.03em;
          background: rgba(56,189,248,0.15); border: 1.5px solid #38bdf8; color: #38bdf8; cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease;
        }
        #vocabulary-system-modal-overlay .btn-cta-sync {
          height: 40px !important; line-height: 38px !important; padding: 0 18px !important; border-radius: 6px !important;
          font-family: var(--fm-font-display, 'Inter', sans-serif) !important; font-size: 13px !important;
          font-weight: 800 !important; text-transform: uppercase; letter-spacing: 0.03em;
          background: var(--primary-tactical, #38bdf8); border: none; color: #0f172a; cursor: pointer;
          display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 4px 14px rgba(56,189,248,0.35); transition: all 0.15s ease;
        }
        #vocabulary-system-modal-overlay .btn-cta-sync:hover {
          background: var(--primary-tactical, #38bdf8);
        }
        .wiz-preset-pill {
          height: 30px !important; line-height: 28px !important; padding: 0 8px !important; font-size: 12px !important; font-weight: 700 !important;
          border-radius: 4px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15);
          color: #94a3b8; cursor: pointer; transition: all 0.12s ease;
        }
        .wiz-preset-pill:hover, .wiz-preset-pill.active {
          background: rgba(149,255,0,0.2) !important; border-color: #95ff00 !important; color: #95ff00 !important;
        }
        .wiz-preset-pill-lime:hover, .wiz-preset-pill-lime.active {
          background: rgba(149,255,0,0.2) !important; border-color: #95ff00 !important; color: #95ff00 !important;
        }
        .wiz-preset-pill-pink:hover, .wiz-preset-pill-pink.active {
          background: rgba(255,45,135,0.22) !important; border-color: #ff2d87 !important; color: #ff2d87 !important;
        }
        .wiz-preset-pill-orange:hover, .wiz-preset-pill-orange.active {
          background: rgba(255,140,0,0.22) !important; border-color: #FF8C00 !important; color: #FF8C00 !important;
        }
        .wiz-preset-pill-mini {
          height: 30px !important; line-height: 28px !important; padding: 0 8px !important; font-size: 12px !important; font-weight: 700 !important;
          border-radius: 4px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15);
          color: #94a3b8; cursor: pointer; transition: all 0.12s ease;
        }
        .wiz-preset-pill-mini:hover, .wiz-preset-pill-mini.active {
          background: rgba(149,255,0,0.2) !important; border-color: #95ff00 !important; color: #95ff00 !important;
        }
        .wiz-preset-pill-mini.wiz-preset-pill-lime:hover, .wiz-preset-pill-mini.wiz-preset-pill-lime.active {
          background: rgba(149,255,0,0.2) !important; border-color: #95ff00 !important; color: #95ff00 !important;
        }
        .wiz-preset-pill-mini.wiz-preset-pill-pink:hover, .wiz-preset-pill-mini.wiz-preset-pill-pink.active {
          background: rgba(255,45,135,0.22) !important; border-color: #ff2d87 !important; color: #ff2d87 !important;
        }
        .wiz-preset-pill-mini.wiz-preset-pill-orange:hover, .wiz-preset-pill-mini.wiz-preset-pill-orange.active {
          background: rgba(255,140,0,0.22) !important; border-color: #FF8C00 !important; color: #FF8C00 !important;
        }
        .wiz-q-capsule {
          transition: border-color 0.15s ease;
        }
        .wiz-q-capsule .wiz-q-btn-all:hover {
          filter: brightness(1.15);
        }
      </style>

      <div class="modal-card">
        <!-- Title Area -->
        <div class="title-area">
          <h2>${getSvgIcon('settings', 16)} VOCABULARY SYSTEM WIZARD</h2>
        </div>

        <!-- Modal Body -->
        <div class="modal-body" id="vocab-modal-body-content">
          ${buildWizardPanelsHtml(matchedClass)}
        </div>

        <!-- Dedicated 60px CTA Area -->
        <div class="cta-area">
          <button type="button" class="btn-cta-close" id="modal-btn-close">CLOSE</button>
          <div style="display:flex; align-items:center; gap:8px;">
            <button type="button" class="btn-cta-save" id="modal-btn-update-only">
              ${getSvgIcon('zap', 14)} UPDATE SETTINGS ONLY
            </button>
            <button type="button" class="btn-cta-sync" id="modal-btn-generate-sync">
              ${getSvgIcon('zap', 14)} GENERATE &amp; SYNC ALL
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();
    overlay.querySelector('#modal-btn-close').onclick = closeModal;
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    const readWizardFormValues = () => {
      const getVal = (id, fallback) => overlay.querySelector(id)?.value ?? fallback;
      const getInt = (id, fallback) => {
        const n = parseInt(overlay.querySelector(id)?.value, 10);
        return isNaN(n) ? fallback : n;
      };

      const wordsTaskCustom = overlay.querySelector('#wiz-words-task-custom')?.checked ?? false;
      const wordsTaskQ = wordsTaskCustom ? (getVal('#wiz-words-task-questions', '10') || '10') : 'ALL';
      const wordsTaskPace = getInt('#wiz-words-task-pace', 15);
      const wordsTaskCount = wordsTaskCustom ? (parseInt(wordsTaskQ, 10) || 10) : (matchedClass?.vaultWordsPerTask || 20);
      const wordsTaskDur = Math.max(1, Math.ceil(wordsTaskCount * wordsTaskPace / 60));

      const phrasesTaskCustom = overlay.querySelector('#wiz-phrases-task-custom')?.checked ?? false;
      const phrasesTaskQ = phrasesTaskCustom ? (getVal('#wiz-phrases-task-questions', '10') || '10') : 'ALL';
      const phrasesTaskPace = getInt('#wiz-phrases-task-pace', 20);
      const phrasesTaskCount = phrasesTaskCustom ? (parseInt(phrasesTaskQ, 10) || 10) : (matchedClass?.vaultPhrasesPerTask || 10);
      const phrasesTaskDur = Math.max(1, Math.ceil(phrasesTaskCount * phrasesTaskPace / 60));

      const wordsExamCustom = overlay.querySelector('#wiz-words-exam-custom')?.checked ?? false;
      const wordsExamQ = wordsExamCustom ? (getVal('#wiz-words-exam-questions', matchedClass.hasPhrases ? '30' : '20') || (matchedClass.hasPhrases ? '30' : '20')) : 'ALL';
      const wordsExamPace = getInt('#wiz-words-exam-pace', 15);
      const wordsExamCount = wordsExamCustom ? (parseInt(wordsExamQ, 10) || 30) : (matchedClass?.vaultWordsPerExam || (matchedClass.hasPhrases ? 30 : 20));
      const wordsExamDur = Math.max(1, Math.ceil(wordsExamCount * wordsExamPace / 60));

      const phrasesExamCustom = overlay.querySelector('#wiz-phrases-exam-custom')?.checked ?? false;
      const phrasesExamQ = phrasesExamCustom ? (getVal('#wiz-phrases-exam-questions', '10') || '10') : 'ALL';
      const phrasesExamPace = getInt('#wiz-phrases-exam-pace', 20);
      const phrasesExamCount = phrasesExamCustom ? (parseInt(phrasesExamQ, 10) || 10) : (matchedClass?.vaultPhrasesPerExam || 10);
      const phrasesExamDur = Math.max(1, Math.ceil(phrasesExamCount * phrasesExamPace / 60));

      return {
        taskRepetitions: getInt('#wiz-task-reps', 7),
        taskMinScore: Math.min(100, Math.max(1, getInt('#wiz-task-min-score', 70))),
        examMinScore: Math.min(100, Math.max(1, getInt('#wiz-exam-min-score', 60))),
        taskQuestionOrder: getVal('#wiz-task-order', 'random') === 'sequential' ? 'sequential' : 'random',
        examQuestionOrder: getVal('#wiz-exam-order', 'random') === 'sequential' ? 'sequential' : 'random',
        wordsTaskQuestions: wordsTaskQ,
        wordsTaskQuestionsCustom: wordsTaskCustom,
        phrasesTaskQuestions: phrasesTaskQ,
        phrasesTaskQuestionsCustom: phrasesTaskCustom,
        wordsTaskAnswer: getVal('#wiz-words-task-answer', 'spoken'),
        phrasesTaskAnswer: getVal('#wiz-phrases-task-answer', 'spoken'),
        wordsTaskPace,
        phrasesTaskPace,
        wordsTaskDur,
        phrasesTaskDur,
        wordsExamQuestions: wordsExamQ,
        wordsExamQuestionsCustom: wordsExamCustom,
        phrasesExamQuestions: phrasesExamQ,
        phrasesExamQuestionsCustom: phrasesExamCustom,
        wordsExamAnswer: getVal('#wiz-words-exam-answer', 'spoken'),
        phrasesExamAnswer: getVal('#wiz-phrases-exam-answer', 'selection'),
        wordsExamPace,
        phrasesExamPace,
        wordsExamDur,
        phrasesExamDur
      };
    };

    const syncWizardValuesToSettings = () => {
      const vals = readWizardFormValues();
      const targets = currentScope === 'all' ? vocabClasses : [matchedClass];
      targets.forEach(c => {
        c.settings = { ...c.settings, ...vals };
      });

      // Update Live Duration Displays
      const wordsTaskDurEl = overlay.querySelector('#wiz-words-task-dur-display');
      if (wordsTaskDurEl) wordsTaskDurEl.textContent = `${vals.wordsTaskDur}m`;

      const phrasesTaskDurEl = overlay.querySelector('#wiz-phrases-task-dur-display');
      if (phrasesTaskDurEl) phrasesTaskDurEl.textContent = `${matchedClass.hasPhrases ? vals.phrasesTaskDur : 0}m`;

      const wordsExamDurEl = overlay.querySelector('#wiz-words-exam-dur-display');
      if (wordsExamDurEl) wordsExamDurEl.textContent = `${vals.wordsExamDur}m`;

      const phrasesExamDurEl = overlay.querySelector('#wiz-phrases-exam-dur-display');
      if (phrasesExamDurEl) phrasesExamDurEl.textContent = `${matchedClass.hasPhrases ? vals.phrasesExamDur : 0}m`;

      // Update Preview Table
      const previewTableWrap = overlay.querySelector('#modal-matrix-table-wrap');
      if (previewTableWrap) {
        previewTableWrap.innerHTML = buildMatrixHtml(
          vocabClasses,
          matchedClass.id,
          false,
          previewFilterMode === 'active' ? matchedClass.id : null
        );
        wirePreviewTableTriggers();
      }
    };

    const wirePreviewTableTriggers = () => {
      overlay.querySelectorAll('.btn-unlock-row').forEach(btn => {
        btn.onclick = () => {
          const cid = btn.dataset.classId;
          const found = vocabClasses.find(c => String(c.id) === String(cid));
          if (found) {
            matchedClass = found;
            selectedThemes = null;
            reRenderWizardBody();
          }
        };
      });
    };

    const wireThemeSelector = () => {
      const themeContainer = overlay.querySelector('#wiz-theme-selector-container');
      if (!themeContainer) return;
      const availableThemes = getAvailableThemesForScope(matchedClass);

      const refreshThemeRow = () => {
        themeContainer.innerHTML = buildThemeSelectorRowHtml(matchedClass);
        wireThemeSelector();
      };

      themeContainer.querySelector('#wiz-theme-all-btn')?.addEventListener('click', () => {
        selectedThemes = null;
        refreshThemeRow();
      });

      themeContainer.querySelectorAll('.wiz-theme-pill-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const code = String(btn.dataset.themeCode || '').trim().toUpperCase();
          if (!code) return;
          if (!selectedThemes) {
            selectedThemes = new Set([code]);
          } else if (selectedThemes.has(code)) {
            selectedThemes.delete(code);
            if (selectedThemes.size === 0) selectedThemes = null;
          } else {
            selectedThemes.add(code);
            if (availableThemes.length > 0 && selectedThemes.size >= availableThemes.length) {
              selectedThemes = null;
            }
          }
          refreshThemeRow();
        });
      });
    };

    const wireWizardInputs = () => {
      // 1. Target Class Selection dropdown
      const classSelect = overlay.querySelector('#wiz-active-class-select');
      if (classSelect) {
        classSelect.onchange = () => {
          const found = vocabClasses.find(c => String(c.id) === String(classSelect.value));
          if (found) {
            matchedClass = found;
            selectedThemes = null;
            reRenderWizardBody();
          }
        };
      }

      // 2. Segmented Scope Toggle
      overlay.querySelectorAll('.wiz-scope-btn').forEach(btn => {
        btn.onclick = () => {
          currentScope = btn.dataset.scope || 'this';
          selectedThemes = null;
          overlay.querySelectorAll('.wiz-scope-btn').forEach(b => {
            const isActive = b.dataset.scope === currentScope;
            b.classList.toggle('active', isActive);
            b.style.background = isActive ? 'rgba(56,189,248,0.25)' : 'transparent';
            b.style.color = isActive ? '#38bdf8' : '#94a3b8';
            b.style.fontWeight = isActive ? '800' : '700';
          });
          const themeContainer = overlay.querySelector('#wiz-theme-selector-container');
          if (themeContainer) {
            themeContainer.innerHTML = buildThemeSelectorRowHtml(matchedClass);
            wireThemeSelector();
          }
          syncWizardValuesToSettings();
        };
      });

      wireThemeSelector();

      // 3. Question Order Segmented Toggles
      overlay.querySelectorAll('.wiz-order-task-btn').forEach(btn => {
        btn.onclick = () => {
          const val = btn.dataset.val;
          const hiddenInp = overlay.querySelector('#wiz-task-order');
          if (hiddenInp) hiddenInp.value = val;
          overlay.querySelectorAll('.wiz-order-task-btn').forEach(b => {
            const isActive = b.dataset.val === val;
            b.classList.toggle('active', isActive);
            b.style.background = isActive ? 'rgba(149,255,0,0.22)' : 'transparent';
            b.style.color = isActive ? '#95ff00' : '#94a3b8';
            b.style.fontWeight = isActive ? '800' : '700';
          });
          syncWizardValuesToSettings();
        };
      });

      overlay.querySelectorAll('.wiz-order-exam-btn').forEach(btn => {
        btn.onclick = () => {
          const val = btn.dataset.val;
          const hiddenInp = overlay.querySelector('#wiz-exam-order');
          if (hiddenInp) hiddenInp.value = val;
          overlay.querySelectorAll('.wiz-order-exam-btn').forEach(b => {
            const isActive = b.dataset.val === val;
            b.classList.toggle('active', isActive);
            b.style.background = isActive ? 'rgba(255,45,135,0.22)' : 'transparent';
            b.style.color = isActive ? '#ff2d87' : '#94a3b8';
            b.style.fontWeight = isActive ? '800' : '700';
          });
          syncWizardValuesToSettings();
        };
      });

      // 4. Preset Pill Buttons
      overlay.querySelectorAll('.wiz-preset-pill, .wiz-preset-pill-mini').forEach(btn => {
        btn.onclick = () => {
          const targetId = btn.dataset.target;
          const val = btn.dataset.val;
          const inp = overlay.querySelector('#' + targetId);
          if (inp && val !== undefined) {
            inp.value = val;
            btn.parentElement?.querySelectorAll('.active')?.forEach(a => a.classList.remove('active'));
            btn.classList.add('active');
            syncWizardValuesToSettings();
          }
        };
      });

      // 5. Questions Unified Capsule Toggles & Listeners
      const updateCapsuleUi = (chk) => {
        const capsule = overlay.querySelector('#' + chk.dataset.capsule);
        const inp = overlay.querySelector('#' + chk.dataset.target);
        const btnAll = overlay.querySelector('#' + chk.dataset.btnAll);
        const customLabel = overlay.querySelector('#' + chk.dataset.customLabel);
        const accentColor = chk.dataset.color || '#95ff00';
        const accentRgb = chk.dataset.rgb || '149,255,0';
        const isChecked = chk.checked;

        if (capsule) {
          capsule.style.borderColor = isChecked ? accentColor : 'rgba(255,255,255,0.2)';
        }
        if (btnAll) {
          btnAll.style.background = !isChecked ? `rgba(${accentRgb},0.25)` : 'transparent';
          btnAll.style.color = !isChecked ? accentColor : '#64748b';
          btnAll.style.fontWeight = !isChecked ? '800' : '700';
        }
        if (customLabel) {
          customLabel.style.background = isChecked ? `rgba(${accentRgb},0.12)` : 'transparent';
        }
        if (inp) {
          inp.disabled = !isChecked;
          inp.style.color = isChecked ? '#ffffff' : '#64748b';
          inp.style.opacity = isChecked ? '1' : '0.4';
          if (isChecked) inp.focus();
        }
      };

      overlay.querySelectorAll('.wiz-q-custom-check').forEach(chk => {
        chk.onchange = () => {
          updateCapsuleUi(chk);
          syncWizardValuesToSettings();
        };
      });

      overlay.querySelectorAll('.wiz-q-btn-all').forEach(btn => {
        btn.onclick = (e) => {
          e.preventDefault();
          const chk = overlay.querySelector('#' + btn.dataset.targetCheck);
          if (chk && chk.checked) {
            chk.checked = false;
            updateCapsuleUi(chk);
            syncWizardValuesToSettings();
          }
        };
      });

      overlay.querySelectorAll('.wiz-q-num-input').forEach(inp => {
        inp.addEventListener('focus', () => {
          const chk = overlay.querySelector('#' + inp.dataset.check);
          if (chk && !chk.checked) {
            chk.checked = true;
            updateCapsuleUi(chk);
            syncWizardValuesToSettings();
          }
        });
      });

      // 6. Live Input & Select Listeners
      overlay.querySelectorAll('#wiz-task-reps, #wiz-task-min-score, #wiz-words-task-questions, #wiz-words-task-answer, #wiz-words-task-pace, #wiz-phrases-task-questions, #wiz-phrases-task-answer, #wiz-phrases-task-pace, #wiz-exam-min-score, #wiz-words-exam-questions, #wiz-words-exam-answer, #wiz-words-exam-pace, #wiz-phrases-exam-questions, #wiz-phrases-exam-answer, #wiz-phrases-exam-pace').forEach(el => {
        el.addEventListener('input', syncWizardValuesToSettings);
        el.addEventListener('change', syncWizardValuesToSettings);
      });

      // Suggest default pace when Answer Mode changes (still freely editable in Pace / Question)
      const ANSWER_PACE_PAIRS = [
        ['#wiz-words-task-answer', 'wiz-words-task-pace'],
        ['#wiz-phrases-task-answer', 'wiz-phrases-task-pace'],
        ['#wiz-words-exam-answer', 'wiz-words-exam-pace'],
        ['#wiz-phrases-exam-answer', 'wiz-phrases-exam-pace']
      ];
      const DEFAULT_PACE_BY_MODE = { spoken: 15, selection: 20, written: 30, mixed: 20 };
      ANSWER_PACE_PAIRS.forEach(([ansSel, paceId]) => {
        const ansEl = overlay.querySelector(ansSel);
        if (!ansEl) return;
        ansEl.addEventListener('change', () => {
          const suggested = DEFAULT_PACE_BY_MODE[ansEl.value] ?? 15;
          const paceInp = overlay.querySelector('#' + paceId);
          if (paceInp && !paceInp.disabled) {
            paceInp.value = String(suggested);
            overlay.querySelectorAll(`[data-target="${paceId}"]`).forEach(p => {
              p.classList.toggle('active', parseInt(p.dataset.val, 10) === suggested);
            });
            syncWizardValuesToSettings();
          }
        });
      });

      // 7. Preview Table Filter & Collapse Controls
      const btnFilterActive = overlay.querySelector('#wiz-btn-filter-active');
      const btnFilterAll = overlay.querySelector('#wiz-btn-filter-all');
      if (btnFilterActive && btnFilterAll) {
        btnFilterActive.onclick = () => {
          previewFilterMode = 'active';
          btnFilterActive.style.background = 'rgba(56,189,248,0.25)';
          btnFilterActive.style.color = '#38bdf8';
          btnFilterActive.style.fontWeight = '800';
          btnFilterAll.style.background = 'transparent';
          btnFilterAll.style.color = '#94a3b8';
          btnFilterAll.style.fontWeight = '700';
          const wrap = overlay.querySelector('#modal-matrix-table-wrap');
          if (wrap) {
            wrap.style.maxHeight = '250px';
            wrap.innerHTML = buildMatrixHtml(vocabClasses, matchedClass.id, false, matchedClass.id);
            wirePreviewTableTriggers();
          }
        };
        btnFilterAll.onclick = () => {
          previewFilterMode = 'all';
          btnFilterAll.style.background = 'rgba(56,189,248,0.25)';
          btnFilterAll.style.color = '#38bdf8';
          btnFilterAll.style.fontWeight = '800';
          btnFilterActive.style.background = 'transparent';
          btnFilterActive.style.color = '#94a3b8';
          btnFilterActive.style.fontWeight = '700';
          const wrap = overlay.querySelector('#modal-matrix-table-wrap');
          if (wrap) {
            wrap.style.maxHeight = '320px';
            wrap.innerHTML = buildMatrixHtml(vocabClasses, matchedClass.id, false, null);
            wirePreviewTableTriggers();
          }
        };
      }

      const btnToggleMatrix = overlay.querySelector('#wiz-btn-toggle-matrix');
      if (btnToggleMatrix) {
        btnToggleMatrix.onclick = () => {
          isPreviewVisible = !isPreviewVisible;
          const wrap = overlay.querySelector('#modal-matrix-table-wrap');
          if (wrap) wrap.style.display = isPreviewVisible ? 'block' : 'none';
          btnToggleMatrix.textContent = isPreviewVisible ? '▾ Hide Preview' : '▸ Show Preview';
        };
      }

      wirePreviewTableTriggers();
    };

    const reRenderWizardBody = () => {
      const bodyContent = overlay.querySelector('#vocab-modal-body-content');
      if (bodyContent) {
        bodyContent.innerHTML = buildWizardPanelsHtml(matchedClass);
        wireWizardInputs();
      }
    };

    wireWizardInputs();

    // 1. UPDATE SETTINGS ONLY
    overlay.querySelector('#modal-btn-update-only').onclick = async () => {
      const isApplyAll = currentScope === 'all';
      const targetIds = isApplyAll ? vocabClasses.map(c => c.id).filter(Boolean) : [matchedClass.id];
      const selectedThemeCodes = (selectedThemes && selectedThemes.size > 0) ? Array.from(selectedThemes) : null;

      const btn = overlay.querySelector('#modal-btn-update-only');
      btn.disabled = true;
      btn.innerHTML = `${getSvgIcon('clock', 14)} UPDATING...`;

      try {
        let updatedCount = 0;
        const vals = readWizardFormValues();
        for (const cid of targetIds) {
          if (!selectedThemeCodes) {
            await saveClassTestSettings(cid, vals, true);
          }
          await updateClassTestsConfig({
            classId: cid,
            themeCodes: selectedThemeCodes,
            taskRepetitions: vals.taskRepetitions,
            taskPassingScore: vals.taskMinScore,
            testPassingScore: vals.examMinScore,
            taskDurationMinutes: vals.wordsTaskQuestionsCustom ? vals.wordsTaskDur : null,
            wordsTaskDurationMinutes: vals.wordsTaskQuestionsCustom ? vals.wordsTaskDur : null,
            phrasesTaskDurationMinutes: vals.phrasesTaskQuestionsCustom ? vals.phrasesTaskDur : null,
            wordsExamDurationMinutes: vals.wordsExamQuestionsCustom ? vals.wordsExamDur : null,
            phrasesExamDurationMinutes: vals.phrasesExamQuestionsCustom ? vals.phrasesExamDur : null,
            wordsTaskPaceSeconds: vals.wordsTaskPace,
            phrasesTaskPaceSeconds: vals.phrasesTaskPace,
            wordsExamPaceSeconds: vals.wordsExamPace,
            phrasesExamPaceSeconds: vals.phrasesExamPace,
            wordsTaskAnswerType: vals.wordsTaskAnswer,
            phrasesTaskAnswerType: vals.phrasesTaskAnswer,
            wordsTestAnswerType: vals.wordsExamAnswer,
            phrasesTestAnswerType: vals.phrasesExamAnswer,
            taskQuestionOrder: vals.taskQuestionOrder,
            examQuestionOrder: vals.examQuestionOrder
          });
          updatedCount++;
        }

        const themeNote = selectedThemeCodes ? ` (Theme: ${selectedThemeCodes.join(', ')})` : '';
        showToast(`Settings updated successfully for ${updatedCount} Vocabulary class(es)${themeNote}!`, 'success');
        overlay.remove();
        if (onComplete) onComplete({ success: true, count: updatedCount });
      } catch (err) {
        console.error('[openVocabularySystemModal] Update error:', err);
        showToast('Failed to update settings: ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = `${getSvgIcon('zap', 14)} UPDATE SETTINGS ONLY`;
      }
    };

    // 2. GENERATE & SYNC ALL
    overlay.querySelector('#modal-btn-generate-sync').onclick = async () => {
      const isApplyAll = currentScope === 'all';
      const targetClasses = isApplyAll ? vocabClasses : [matchedClass];
      const selectedThemeCodes = (selectedThemes && selectedThemes.size > 0) ? Array.from(selectedThemes) : null;

      const btn = overlay.querySelector('#modal-btn-generate-sync');
      btn.disabled = true;
      btn.innerHTML = `${getSvgIcon('clock', 14)} GENERATING & SYNCING...`;

      try {
        let totalTasks = 0;
        let totalExams = 0;
        const vals = readWizardFormValues();

        for (const tc of targetClasses) {
          if (!tc.id) continue;
          if (!selectedThemeCodes) {
            await saveClassTestSettings(tc.id, vals, true);
          }

          const res = await autoGenerateTestsHierarchy([tc.levelNumber], {
            programId: tc.programId,
            institutionId: tc.institutionId,
            explicitClassId: tc.id,
            themeCodes: selectedThemeCodes,
            category: tc.hasPhrases ? 'all' : 'words',
            taskDurationMinutes: vals.wordsTaskQuestionsCustom ? vals.wordsTaskDur : null,
            wordsTaskDurationMinutes: vals.wordsTaskQuestionsCustom ? vals.wordsTaskDur : null,
            phrasesTaskDurationMinutes: vals.phrasesTaskQuestionsCustom ? vals.phrasesTaskDur : null,
            wordsExamDurationMinutes: vals.wordsExamQuestionsCustom ? vals.wordsExamDur : null,
            phrasesExamDurationMinutes: vals.phrasesExamQuestionsCustom ? vals.phrasesExamDur : null,
            wordsTaskPaceSeconds: vals.wordsTaskPace,
            phrasesTaskPaceSeconds: vals.phrasesTaskPace,
            wordsExamPaceSeconds: vals.wordsExamPace,
            phrasesExamPaceSeconds: vals.phrasesExamPace,
            wordsTaskAnswerType: vals.wordsTaskAnswer,
            phrasesTaskAnswerType: vals.phrasesTaskAnswer,
            wordsTestAnswerType: vals.wordsExamAnswer,
            phrasesTestAnswerType: vals.phrasesExamAnswer,
            taskPassingScore: vals.taskMinScore,
            testPassingScore: vals.examMinScore,
            taskQuestionOrder: vals.taskQuestionOrder,
            examQuestionOrder: vals.examQuestionOrder
          });
          totalTasks += (res.tasks ?? 0);
          totalExams += (res.exams ?? 0);
        }

        if (typeof clearAdminCache === 'function') clearAdminCache('tests');
        const themeNote = selectedThemeCodes ? ` (Themes: ${selectedThemeCodes.join(', ')})` : '';
        showToast(`Auto-Gen Success${themeNote}: ${totalTasks} Tasks, ${totalExams} Exams synchronized!`, 'success');
        overlay.remove();
        if (onComplete) onComplete({ success: true, tasks: totalTasks, exams: totalExams });
      } catch (err) {
        console.error('[openVocabularySystemModal] Sync error:', err);
        showToast('Auto-Generate Failed: ' + err.message, 'error');
        btn.disabled = false;
        btn.innerHTML = `${getSvgIcon('zap', 14)} GENERATE &amp; SYNC ALL`;
      }
    };

  } catch (err) {
    if (loading.parentNode) loading.remove();
    console.error('[openVocabularySystemModal] Error:', err);
    showToast('Failed to open Vocabulary System: ' + err.message, 'error');
  }
}

// Canonical Aliases for Backward Compatibility
export const openAutoGenerateModal = openVocabularySystemModal;
