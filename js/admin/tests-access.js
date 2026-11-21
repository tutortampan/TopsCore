/**
 * TopsCore — Test Access & Live Test Sessions Controller (v5.8.0)
 * Integrated under Domain C: Class Hub (Vocabulary Class & Curriculum).
 *
 * Features:
 * 1. Unified Theme Test Cards (Theme A, B, C, D): Words Test & Phrases Test unified into 1 Theme Card.
 * 2. 2 Distinct Session Opening Triggers: "Open Normal Session" & "Open Remedial Session".
 * 3. Smart Eligibility Engine:
 *    - Normal Mode: Prerequisite tasks completed (>= 60%). Passed students remain visible for score improvement.
 *    - Remedial Mode: Prerequisite tasks completed (>= 60%) & not passed (< 60% or not taken). Passed students are excluded from remedial.
 * 4. Late Student Addition (+ Late Arrival):
 *    - ONLY displays eligible students who are NOT yet enrolled in the exam session.
 *    - Enrolled students are 100% hidden.
 *    - Automatically inherits session mode (Normal / Remedial) without manual toggles.
 *    - Remaining time tracks running global session duration.
 * 5. 1-Click Dual Activation: Opens/closes Words Test and Phrases Test synchronously in database.
 */

import {
  openTestSession,
  addLateStudentsToSession,
  removeStudentFromTestSession,
  fetchLiveTestSessionData,
  closeTestSession,
  extendTestSessionTime,
  extendIndividualAttemptTime,
  reopenStudentAttempt,
  updateLiveSessionModality,
  getGrade
} from '../api.js?v=20261114_v517';
import { getSupabase } from '../supabase.js';
import { getGradeColorByScore, getInvertedGradeColor, GRADE_PALETTE, detectClassDiscipline, isVocabularyClass } from '../grading.js?v=20261106_v160';
import { showToast, showLoading, hideLoading, escapeHtml, escHtml } from '../app.js?v=20261106_v160';

const THEME_PALETTES = {
  'A': { color: 'var(--quad-a, #ff2d87)', bgRgba: 'rgba(var(--quad-a-rgb, 255, 45, 135), 0.08)', borderRgba: 'rgba(var(--quad-a-rgb, 255, 45, 135), 0.35)' },
  'B': { color: 'var(--quad-b, #ff8c00)', bgRgba: 'rgba(var(--quad-b-rgb, 255, 140, 0), 0.08)', borderRgba: 'rgba(var(--quad-b-rgb, 255, 140, 0), 0.35)' },
  'C': { color: 'var(--quad-c, #95ff00)', bgRgba: 'rgba(var(--quad-c-rgb, 149, 255, 0), 0.08)', borderRgba: 'rgba(var(--quad-c-rgb, 149, 255, 0), 0.35)' },
  'D': { color: 'var(--quad-d, #c084fc)', bgRgba: 'rgba(var(--quad-d-rgb, 192, 132, 252), 0.08)', borderRgba: 'rgba(var(--quad-d-rgb, 192, 132, 252), 0.35)' },
  'G': { color: 'var(--quad-a, #ff2d87)', bgRgba: 'rgba(var(--quad-a-rgb, 255, 45, 135), 0.08)', borderRgba: 'rgba(var(--quad-a-rgb, 255, 45, 135), 0.35)' }
};
const DEFAULT_THEME_PALETTE = { color: 'var(--quad-a, #ff2d87)', bgRgba: 'rgba(var(--quad-a-rgb, 255, 45, 135), 0.08)', borderRgba: 'rgba(var(--quad-a-rgb, 255, 45, 135), 0.35)' };

let _activeClassHubContext = null;
let _selectedBatchId = null;
let _selectedMatrixTheme = 'A';
let _currentOpenModalTheme = null;
let _currentOpenModalMode = 'normal'; // 'normal' | 'remedial'
let _currentLateModalTheme = null;

// Backward-compatibility delegator for loadSection('test-access')
export async function renderTestAccess(area) {
  window._classHubActiveTab = 'test-sessions';
  if (window.loadSection) {
    window.loadSection('class-hub');
  }
}

/**
 * Dynamic Test Theme Code Extractor SSOT
 * Extracts Theme Code ('A', 'B', 'C', 'D', 'G', etc.) across all legacy and standard test formulas.
 */
export function getTestThemeCode(t) {
  if (!t) return '';
  const pl = t.payload || {};
  if (pl.theme_code) return String(pl.theme_code).toUpperCase();
  const shell = String(t.shell_code || pl.shell_code || '').toUpperCase();
  if (shell) {
    const parts = shell.split('-');
    if (parts.length >= 4 && parts[2]) {
      const m = parts[2].match(/^([A-Za-z])/);
      if (m) return m[1].toUpperCase();
    }
    const legacy = shell.replace(/^[0-9]+/, '');
    if (legacy && /^[A-Za-z]/.test(legacy)) {
      return legacy.charAt(0).toUpperCase();
    }
  }
  const title = String(t.title || '');
  const mTheme = title.match(/Theme\s+([A-Za-z])/i);
  if (mTheme) return mTheme[1].toUpperCase();
  const mCode = title.match(/\b(?:Task|Exam)\s+([A-Za-z])/i) || title.match(/\b([A-Za-z])[0-9]?\s+(?:Words|Phrases|Task|Exam)\b/i);
  if (mCode) return mCode[1].toUpperCase();
  return '';
}

/**
 * Main renderer inside Class Hub: Tab "Test Sessions"
 */
export async function renderClassTestSessions(container, context = {}) {
  _activeClassHubContext = context;
  const {
    classId,
    className,
    currentClass,
    classTests = [],
    allStudents = [],
    classStudents = [],
    allBatches = [],
    allLevels = [],
    allAttempts = [],
    batchMap = {},
    levelMap = {}
  } = context;

  // Program isolation: determine current class's program_id
  const classProgramId = currentClass?.program_id ||
    context.classProgramId ||
    (context.allClasses?.find(c => c.id === classId)?.program_id);
  const classProgramName = currentClass?.programs?.name ||
    context.programName ||
    (context.allPrograms?.find(p => p.id === classProgramId)?.name) || '';

  // Active batches strictly filtered by program_id to prevent cross-program leak
  const activeBatches = (allBatches || []).filter(b =>
    !b.deleted_at &&
    b.is_active !== false &&
    (!classProgramId || b.program_id === classProgramId)
  );

  // Batches belonging to this specific class (Class-Enrolled Batches)
  const enrolledBatchIds = new Set((classStudents || []).map(s => s.batch_id).filter(Boolean));
  const classBatches = activeBatches.filter(b => enrolledBatchIds.has(b.id));
  const effectiveBatches = classBatches.length > 0 ? classBatches : activeBatches;

  if (!_selectedBatchId || !effectiveBatches.some(b => b.id === _selectedBatchId)) {
    // Default to the first active batch with students or active batch in storage
    const saved = localStorage.getItem('topscore_active_test_batch');
    if (saved && effectiveBatches.some(b => b.id === saved)) {
      _selectedBatchId = saved;
    } else {
      _selectedBatchId = effectiveBatches[0]?.id || '';
    }
  }

  // Active batch students
  const activeBatchStudents = (allStudents || []).filter(s =>
    s.batch_id === _selectedBatchId &&
    !s.deleted_at &&
    s.is_active !== false
  );

  const isSingleBatch = effectiveBatches.length <= 1;

  // Strict Discipline Isolation SSOT
  const discipline = detectClassDiscipline(currentClass || className);
  const isVocab = discipline === 'VOCABULARY';

  let themesData = [];

  if (isVocab) {
    // Discover distinct theme codes present in this class's tests
    const discoveredCodes = [...new Set(classTests.map(t => getTestThemeCode(t)).filter(Boolean))].sort();

    const themeCodes = discoveredCodes.length > 0 ? discoveredCodes : ['A', 'B', 'C', 'D'];
    if (!_selectedMatrixTheme || !themeCodes.includes(_selectedMatrixTheme)) {
      _selectedMatrixTheme = themeCodes[0];
    }

    // Group class tests into Themes dynamically
    themesData = themeCodes.map(code => {
      const palette = THEME_PALETTES[code] || DEFAULT_THEME_PALETTE;

      // Separate explicit Words Test (only if dedicated words exam, not the theme primary/unified exam)
      const wordsTest = classTests.find(a => {
        const pl = a.payload || {};
        const tc = getTestThemeCode(a);
        if (tc !== code) return false;
        const type = (a.test_type || '').toLowerCase();
        const subtype = (a.test_subtype || '').toUpperCase();
        const shell = (a.shell_code || pl.shell_code || '').toUpperCase();
        const title = (a.title || '').toLowerCase();

        const isTask = type === 'quiz' || type === 'task' || a.category === 'QUIZ' || a.category === 'TASK' || subtype.includes('QUIZ') || subtype.includes('TASK') || shell.includes('-QUIZ') || shell.includes('-TASK') || title.includes('quiz') || title.includes('task');
        if (isTask) return false;

        const isExam = type === 'exam' || a.category === 'EXAM' || a.category === 'TEST' || subtype.includes('EXAM') || subtype.includes('TEST') || shell.endsWith('-EXAM') || shell.endsWith('-TEST') || title.includes('exam') || title.includes('test');
        if (!isExam) return false;

        const isExplicitWords = subtype === 'WORDS_EXAM' || shell.includes('-WORDS-EXAM') || shell.includes('-WORDS-TEST') || title.includes('words exam') || title.includes('words test');
        return isExplicitWords && !pl.is_unified && !pl.is_unified_test && !shell.match(/-[A-D]-EXAM$/);
      });

      // Separate explicit Phrases Test (only if dedicated phrases exam, not the theme primary/unified exam)
      const phrasesTest = classTests.find(a => {
        const pl = a.payload || {};
        const tc = getTestThemeCode(a);
        if (tc !== code) return false;
        const cat = (pl.category || '').toLowerCase();
        const type = (a.test_type || '').toLowerCase();
        const subtype = (a.test_subtype || '').toUpperCase();
        const shell = (a.shell_code || pl.shell_code || '').toUpperCase();
        const title = (a.title || '').toLowerCase();

        const isTask = type === 'quiz' || type === 'task' || a.category === 'QUIZ' || a.category === 'TASK' || subtype.includes('QUIZ') || subtype.includes('TASK') || shell.includes('-QUIZ') || shell.includes('-TASK') || title.includes('quiz') || title.includes('task');
        if (isTask) return false;

        const isExam = type === 'exam' || a.category === 'EXAM' || a.category === 'TEST' || subtype.includes('EXAM') || subtype.includes('TEST') || shell.endsWith('-EXAM') || shell.endsWith('-TEST') || title.includes('exam') || title.includes('test');
        if (!isExam) return false;

        const isExplicitPhrases = cat === 'phrases' || subtype === 'PHRASE_EXAM' || subtype === 'PHRASE_TEST' || shell.includes('-PHRASES-EXAM') || shell.includes('-PHRASE-EXAM') || shell.includes('-PHRASES-TEST') || title.includes('phrases exam') || title.includes('phrases test');
        return isExplicitPhrases && !pl.is_unified && !pl.is_unified_test && !shell.match(/-[A-D]-EXAM$/);
      });

      // Unified Exam Test or Primary Exam for this theme (DECISION-034 SSOT)
      const examTest = classTests.find(a => {
        const pl = a.payload || {};
        const tc = getTestThemeCode(a);
        if (tc !== code) return false;
        const type = (a.test_type || '').toLowerCase();
        const subtype = (a.test_subtype || '').toUpperCase();
        const shell = (a.shell_code || pl.shell_code || '').toUpperCase();
        const title = (a.title || '').toLowerCase();

        const isTask = type === 'quiz' || type === 'task' || a.category === 'QUIZ' || a.category === 'TASK' || subtype.includes('QUIZ') || subtype.includes('TASK') || shell.includes('-QUIZ') || shell.includes('-TASK') || title.includes('quiz') || title.includes('task');
        if (isTask) return false;

        const isExam = type === 'exam' || a.category === 'EXAM' || a.category === 'TEST' || subtype.includes('EXAM') || subtype.includes('TEST') || shell.endsWith('-EXAM') || shell.endsWith('-TEST') || title.includes('exam') || title.includes('test');
        if (!isExam) return false;

        if (wordsTest && a.id === wordsTest.id) return false;
        if (phrasesTest && a.id === phrasesTest.id) return false;

        return true;
      });

      const tasks = classTests.filter(a => {
        const pl = a.payload || {};
        const tc = getTestThemeCode(a);
        const type = (a.test_type || '').toLowerCase();
        const subtype = (a.test_subtype || '').toUpperCase();
        const shell = (a.shell_code || pl.shell_code || '').toUpperCase();
        const title = (a.title || '').toLowerCase();
        const isTask = type === 'quiz' || type === 'task' || a.category === 'QUIZ' || a.category === 'TASK' || subtype.includes('QUIZ') || subtype.includes('TASK') || shell.includes('-QUIZ') || shell.includes('-TASK') || title.includes('quiz') || title.includes('task');
        return tc === code && isTask;
      }).sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

      // Dynamic Topic Name
      let topicName = '';
      const directTopicName = examTest?.topics?.name || wordsTest?.topics?.name || phrasesTest?.topics?.name || tasks[0]?.topics?.name || examTest?.payload?.topic_name || wordsTest?.payload?.topic_name;
      if (directTopicName) {
        topicName = directTopicName.trim();
      } else if (examTest?.title) {
        const m = examTest.title.match(/-\s*([^-\n]+)$/);
        topicName = m ? m[1].trim() : examTest.title;
      } else if (wordsTest?.title) {
        const m = wordsTest.title.match(/-\s*([^-\n]+)$/);
        topicName = m ? m[1].trim() : wordsTest.title;
      } else if (phrasesTest?.title) {
        const m = phrasesTest.title.match(/-\s*([^-\n]+)$/);
        topicName = m ? m[1].trim() : phrasesTest.title;
      } else if (tasks.length > 0 && tasks[0].title) {
        const m = tasks[0].title.match(/-\s*([^-\n]+)$/);
        topicName = m ? m[1].trim() : `Theme ${code}`;
      } else {
        topicName = `Theme ${code} Curriculum`;
      }

      // Check live state
      const now = Date.now();
      const sessE = examTest?.payload?.test_session;
      const sessW = wordsTest?.payload?.test_session;
      const sessP = phrasesTest?.payload?.test_session;

      const _sessIsLive = (s) => {
        if (!s || s.status !== 'UNLOCKED') return false;
        const ac = s.auto_close_at ? new Date(s.auto_close_at).getTime() : 0;
        return ac > now;
      };

      if (examTest && sessE && sessE.status === 'UNLOCKED') {
        const ac = sessE.auto_close_at ? new Date(sessE.auto_close_at).getTime() : 0;
        if (ac && ac <= now) {
          closeTestSession(examTest.id).catch(err => console.warn('[Auto-sync] Close expired examTest notice:', err?.message || err));
          sessE.status = 'LOCKED';
        }
      }
      if (wordsTest && sessW && sessW.status === 'UNLOCKED') {
        const ac = sessW.auto_close_at ? new Date(sessW.auto_close_at).getTime() : 0;
        if (ac && ac <= now) {
          closeTestSession(wordsTest.id).catch(err => console.warn('[Auto-sync] Close expired wordsTest notice:', err?.message || err));
          sessW.status = 'LOCKED';
        }
      }
      if (phrasesTest && sessP && sessP.status === 'UNLOCKED') {
        const ac = sessP.auto_close_at ? new Date(sessP.auto_close_at).getTime() : 0;
        if (ac && ac <= now) {
          closeTestSession(phrasesTest.id).catch(err => console.warn('[Auto-sync] Close expired phrasesTest notice:', err?.message || err));
          sessP.status = 'LOCKED';
        }
      }

      const eLive = _sessIsLive(sessE);
      const wLive = _sessIsLive(sessW);
      const pLive = _sessIsLive(sessP);

      let sess = null;
      if (eLive) {
        sess = sessE;
      } else if (wLive && pLive) {
        const wEnd = new Date(sessW.auto_close_at).getTime();
        const pEnd = new Date(sessP.auto_close_at).getTime();
        sess = wEnd >= pEnd ? sessW : sessP;
      } else if (wLive) {
        sess = sessW;
      } else if (pLive) {
        sess = sessP;
      }

      let isLive = false;
      let remainingMinutes = 0;
      let liveBatchId = null;
      let liveBatchName = '';
      let allowedStudentIds = [];
      let isRemedial = false;

      if (sess) {
        const autoClose = new Date(sess.auto_close_at).getTime();
        isLive = true;
        remainingMinutes = Math.max(1, Math.ceil((autoClose - now) / 60000));
        liveBatchId = sess.batch_id;
        liveBatchName = batchMap[sess.batch_id]?.name || 'Batch ' + (sess.batch_id || '');
        const eIds = (eLive ? (sessE.allowed_student_ids || []) : []);
        const wIds = (wLive ? (sessW.allowed_student_ids || []) : []);
        const pIds = (pLive ? (sessP.allowed_student_ids || []) : []);
        allowedStudentIds = [...new Set([...eIds, ...wIds, ...pIds])];
        isRemedial = Boolean(sess.is_remedial);
      }

      // Evaluate Batch Readiness
      const themeObj = {
        code,
        name: topicName,
        color: palette.color,
        bgRgba: palette.bgRgba,
        borderRgba: palette.borderRgba,
        wordsTest,
        phrasesTest,
        examTest,
        tasks,
        isNonVocab: false,
        isLive,
        remainingMinutes,
        liveBatchId,
        liveBatchName,
        allowedStudentIds,
        isRemedial,
        unlockedAt: sess?.unlocked_at || null
      };
      const normalEvals = evaluateStudentsEligibility({
        students: activeBatchStudents,
        theme: themeObj,
        themeTasks: tasks,
        wordsTest,
        phrasesTest,
        examTest,
        classTests,
        allAttempts,
        mode: 'normal'
      });
      const eligibleNormalCount = normalEvals.filter(e => e.isEligible).length;

      const remedialEvals = evaluateStudentsEligibility({
        students: activeBatchStudents,
        theme: themeObj,
        themeTasks: tasks,
        wordsTest,
        phrasesTest,
        examTest,
        classTests,
        allAttempts,
        mode: 'remedial'
      });
      const eligibleRemedialCount = remedialEvals.filter(e => e.isEligible).length;

      themeObj.eligibleNormalCount = eligibleNormalCount;
      themeObj.eligibleRemedialCount = eligibleRemedialCount;
      themeObj.batchTotalStudents = activeBatchStudents.length;

      return themeObj;
    });
  } else {
    // Non-vocabulary classes (Basic English, Speaking, Storytelling, etc.):
    // Operational units are the actual Tests/Exams of this class, not Vocabulary Themes!
    const classExams = classTests.filter(t => {
      const st = String(t.shell_code || '').toUpperCase();
      const tt = String(t.test_type || '').toLowerCase();
      return tt === 'exam' || st.endsWith('-EXAM') || st.includes('-EXAM-');
    });
    const candidateTests = classExams.length > 0 ? classExams : classTests;

    themesData = candidateTests.map((t, idx) => {
      const shell = String(t.shell_code || '').toUpperCase();
      const codeMatch = shell.match(/-([A-Z0-9]+)-(?:EXAM|TASK|QUIZ)/);
      const code = codeMatch ? codeMatch[1] : (String.fromCharCode(65 + idx));
      const palette = THEME_PALETTES[code] || THEME_PALETTES['A'];

      const now = Date.now();
      const sess = t.payload?.test_session;
      const isLive = Boolean(sess && sess.status === 'UNLOCKED' && new Date(sess.auto_close_at).getTime() > now);

      if (sess && sess.status === 'UNLOCKED') {
        const ac = sess.auto_close_at ? new Date(sess.auto_close_at).getTime() : 0;
        if (ac && ac <= now) {
          closeTestSession(t.id).catch(err => console.warn('[Auto-sync] Close expired test notice:', err?.message || err));
          sess.status = 'LOCKED';
        }
      }

      const remainingMinutes = isLive ? Math.max(1, Math.ceil((new Date(sess.auto_close_at).getTime() - now) / 60000)) : 0;
      const liveBatchId = sess?.batch_id;
      const liveBatchName = liveBatchId ? (batchMap[liveBatchId]?.name || 'Batch ' + liveBatchId) : '';
      const allowedStudentIds = isLive ? (sess.allowed_student_ids || []) : [];
      const isRemedial = isLive ? Boolean(sess.is_remedial) : false;

      const tasks = classTests.filter(a => {
        if (a.id === t.id) return false;
        const aType = (a.test_type || '').toLowerCase();
        const aShell = (a.shell_code || '').toUpperCase();
        return aType === 'quiz' || aType === 'task' || aShell.includes('-TASK') || aShell.includes('-QUIZ');
      });

      const moduleName = t.payload?.module_name || (discipline === 'BASIC_ENGLISH' ? 'Description (Photo & Grammar)' : (t.test_type || 'Exam'));
      const totalQuestions = t.payload?.questions?.length || t.total_questions || 20;
      const duration = t.working_duration_minutes || 40;

      const themeObj = {
        code,
        name: t.title,
        examTest: t,
        wordsTest: null,
        phrasesTest: null,
        tasks,
        isNonVocab: true,
        discipline,
        moduleName,
        totalQuestions,
        duration,
        color: palette.color,
        bgRgba: palette.bgRgba,
        borderRgba: palette.borderRgba,
        isLive,
        remainingMinutes,
        liveBatchId,
        liveBatchName,
        allowedStudentIds,
        isRemedial,
        unlockedAt: sess?.unlocked_at || null
      };

      const normalEvals = evaluateStudentsEligibility({
        students: activeBatchStudents,
        theme: themeObj,
        themeTasks: tasks,
        wordsTest: null,
        phrasesTest: null,
        examTest: t,
        classTests,
        allAttempts,
        mode: 'normal'
      });
      themeObj.eligibleNormalCount = normalEvals.filter(e => e.isEligible).length;

      const remedialEvals = evaluateStudentsEligibility({
        students: activeBatchStudents,
        theme: themeObj,
        themeTasks: tasks,
        wordsTest: null,
        phrasesTest: null,
        examTest: t,
        classTests,
        allAttempts,
        mode: 'remedial'
      });
      themeObj.eligibleRemedialCount = remedialEvals.filter(e => e.isEligible).length;
      themeObj.batchTotalStudents = activeBatchStudents.length;

      return themeObj;
    });
  }

  // Count active sessions
  const liveCount = themesData.filter(t => t.isLive).length;

  // Update Lower Infobar Metadata (50px Lower Sub-Panel)
  if (typeof window.setBottomInfobar === 'function') {
    const totalExamsCount = isVocab
      ? themesData.reduce((acc, t) => acc + (t.examTest ? 1 : ((t.wordsTest ? 1 : 0) + (t.phrasesTest ? 1 : 0))), 0)
      : themesData.length;
    const selectedBatch = effectiveBatches.find(b => b.id === _selectedBatchId) || effectiveBatches[0];
    const selTheme = themesData.find(t => t.code === _selectedMatrixTheme) || themesData[0];
    const readyRatio = selTheme ? `${selTheme.eligibleNormalCount}/${selTheme.batchTotalStudents}` : '0/0';
    const readyPct = selTheme && selTheme.batchTotalStudents > 0 ? Math.round((selTheme.eligibleNormalCount / selTheme.batchTotalStudents) * 100) : 0;

    const leftHtml = isVocab ? `
      <div style="display:inline-flex; align-items:center; gap:8px; font-size:12px; color:#94a3b8; font-weight:600;">
        <span>Scope: <strong style="color:#ffffff;">${themesData.length} Themes (${totalExamsCount} Exams)</strong></span>
        <span>&bull;</span>
        <span>${classTests.length} Total Modules</span>
      </div>
    ` : `
      <div style="display:inline-flex; align-items:center; gap:8px; font-size:12px; color:#94a3b8; font-weight:600;">
        <span>Class: <strong style="color:#ffffff;">${escapeHtml(className || 'Basic English')}</strong></span>
        <span>&bull;</span>
        <span>${classTests.length} Total Tests</span>
      </div>
    `;
    const centerHtml = isVocab ? `
      <div style="display:inline-flex; align-items:center; gap:8px; font-size:12px;">
        <span style="color:#cbd5e1; font-weight:700;">Batch ${escapeHtml(selectedBatch?.name || '')} (${activeBatchStudents.length} Students):</span>
        <span style="color:${getGradeColorByScore(readyPct)}; font-weight:800;">Theme ${selTheme?.code || 'A'}: ${readyRatio} Ready (${readyPct}%)</span>
      </div>
    ` : `
      <div style="display:inline-flex; align-items:center; gap:8px; font-size:12px;">
        <span style="color:#cbd5e1; font-weight:700;">Batch ${escapeHtml(selectedBatch?.name || '')} (${activeBatchStudents.length} Students):</span>
        <span style="color:${getGradeColorByScore(readyPct)}; font-weight:800;">Ready: ${readyRatio} (${readyPct}%)</span>
      </div>
    `;
    const rightHtml = `
      <div style="display:inline-flex; align-items:center; gap:8px;">
        <span class="badge" style="background:${liveCount > 0 ? 'rgba(var(--grade-a-rgb),0.15)' : 'rgba(var(--quad-c-rgb, 149, 255, 0),0.12)'}; color:${liveCount > 0 ? 'var(--grade-a)' : 'var(--quad-c, #95ff00)'}; border:1px solid ${liveCount > 0 ? 'rgba(var(--grade-a-rgb),0.3)' : 'rgba(var(--quad-c-rgb, 149, 255, 0),0.25)'}; font-size: 12px; font-weight:800;">
          ${liveCount > 0 ? `${liveCount} SESSIONS LIVE` : 'SESSIONS STANDBY (0 LIVE)'}
        </span>
      </div>
    `;
    window.setBottomInfobar(leftHtml, rightHtml, centerHtml);
  }

  // Pre-load Empirical Exam Analytics Data for all themes
  const analyticsData = await loadThemeExamAnalyticsData(themesData, context);

  container.innerHTML = `
    <div class="test-sessions-tab-wrapper" style="display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; height: 100%; overflow: hidden; padding: 2px 0 0;">
      <!-- Single-Line Sleek Top Toolbar (Streamlined & Compact) -->
      <div style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 10px 16px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.25); flex-shrink: 0;">
        <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
          <span style="font-size: 12px; text-transform:uppercase; letter-spacing:0.08em; font-weight:800; color:var(--quad-c, #95ff00); display:flex; align-items:center; gap:5px;">
            TEST SESSIONS
          </span>
          <span style="color:rgba(255,255,255,0.2);">|</span>
          <span style="font-size: 16px; font-weight:800; color:#ffffff;">
            ${escapeHtml(className || 'Class Hub')}
          </span>
          ${classProgramName ? `<span style="font-size: 12px; padding:2px 7px; border-radius:4px; background:rgba(var(--quad-c-rgb, 149, 255, 0),0.12); color:var(--quad-c, #95ff00); border:1px solid rgba(var(--quad-c-rgb, 149, 255, 0),0.25); font-weight:700;">Program: ${escapeHtml(classProgramName)}</span>` : ''}
        </div>

        <div style="display:flex; align-items:center; gap:10px;">
          ${isSingleBatch ? `
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="font-size:12px; font-weight:700; color:#cbd5e1;">Target Batch:</span>
              <span class="badge" style="background:#1e293b; border:1px solid rgba(56,189,248,0.3); color:#38bdf8; font-size:12px; font-weight:800; padding:4px 10px; border-radius:6px;">Batch ${escapeHtml(effectiveBatches[0]?.name || _selectedBatchId || '—')} (${activeBatchStudents.length} Students)</span>
              <input type="hidden" id="test-session-batch-select" value="${_selectedBatchId}">
            </div>
          ` : `
            <label for="test-session-batch-select" style="font-size: 12px; font-weight:700; color:#cbd5e1; margin:0; white-space:nowrap;">
              Target Batch:
            </label>
            <select id="test-session-batch-select" class="form-control" style="background:#1e293b; border:1px solid rgba(56,189,248,0.3); color:#ffffff; padding:5px 10px; border-radius:6px; font-weight:700; font-size: 12px; min-width:180px; cursor:pointer;">
              ${effectiveBatches.map(b => {
                const bStuds = (classStudents || []).filter(s => s.batch_id === b.id).length;
                const isSel = b.id === _selectedBatchId;
                return `<option value="${b.id}" ${isSel ? 'selected' : ''}>Batch ${escapeHtml(b.name || b.id)} (${bStuds} Students)</option>`;
              }).join('')}
            </select>
          `}

          <button type="button" class="btn btn-secondary btn-sm" id="btn-refresh-test-sessions" style="padding:5px 10px; font-size: 12px; font-weight:600; display:inline-flex; align-items:center; gap:5px;">
            Refresh
          </button>
        </div>
      </div>

      <!-- Theme Cards Grid (Spacious & Compact Layout, Exact 10px Gap) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; margin-bottom: 10px; flex-shrink: 0;">
        ${themesData.map(theme => renderThemeCard(theme, context)).join('')}
      </div>

      <!-- Theme Exam Analytics Board (4-Column Zero-Capsule Table: TARGET | MISTAKE | COUNT | RATE) -->
      <div id="theme-exam-analytics-container" style="display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; height: 100%; overflow: hidden;">
        ${renderThemeExamAnalyticsBoard(themesData, context, analyticsData)}
      </div>
    </div>

    <!-- Modal 1: Open Test Session (Normal / Remedial) — Standardized Slim Floating Window (Phase 610 Mobile-Ready) -->
    <div id="modal-theme-open-session" class="modal-backdrop hidden" style="position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999; padding:10px;">
      <div class="modal-box" style="background:#0f172a; border:1.5px solid rgba(255,255,255,0.18); border-radius:14px; width:100%; max-width:520px; max-height:88vh; height:660px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.9); padding:0 !important;">

        <!-- 1. Header (Standardized Title Area 60px Solid Navy Banner per Invariant 1.5.1, Centered ALL CAPS) -->
        <div class="modal-header title-area" style="height:60px; min-height:60px; max-height:60px; padding:0 20px; border-bottom:1.5px solid rgba(255,255,255,0.16); display:flex; justify-content:center; align-items:center; background:#1E293B; box-sizing:border-box; flex-shrink:0; margin:0 !important;">
          <h2 id="open-modal-title" style="margin:0; font-family:var(--fm-font-display, 'Inter', sans-serif); font-size:16px; font-weight:800; color:#ffffff; line-height:1; letter-spacing:0.05em; text-transform:uppercase; text-align:center;">THEME A — WORKPLACE • EXAM SESSION</h2>
        </div>

        <!-- 2. Modal Body: Streamlined Vertical Stack (Compact Settings Top, Full Student Table Bottom) -->
        <div style="display:flex; flex-direction:column; flex:1; min-height:0; overflow:hidden;">

          <!-- TOP CONFIG SECTION: Batch, Modules (Dropdowns), Duration, Tutor Override -->
          <div style="padding:10px; display:flex; flex-direction:column; gap:10px; background:rgba(0,0,0,0.25); border-bottom:1px solid rgba(255,255,255,0.12); flex-shrink:0;">

            <!-- Row 1: Target Batch & Enrolled Counter -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; align-items:flex-end;">
              <div>
                <label class="form-label" style="font-weight:800; font-size:12px; color:#ffffff; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px; display:block;">1. Target Batch</label>
                ${isSingleBatch ? `
                  <div style="height:30px; background:#1e293b; border:1px solid rgba(56,189,248,0.3); border-radius:5px; padding:0 10px; display:flex; align-items:center; color:#38bdf8; font-weight:800; font-size:12px;">
                    Batch ${escapeHtml(effectiveBatches[0]?.name || _selectedBatchId || '—')}
                  </div>
                  <select id="open-modal-batch-select" class="form-control" style="display:none;">
                    <option value="${_selectedBatchId}" selected>Batch ${escapeHtml(effectiveBatches[0]?.name || _selectedBatchId || '—')}</option>
                  </select>
                ` : `
                  <select id="open-modal-batch-select" class="form-control" style="width:100%; height:30px; background:#1e293b; border:1px solid rgba(255,255,255,0.22); color:#ffffff; padding:2px 8px; border-radius:5px; font-weight:700; font-size:12px;">
                    ${effectiveBatches.map(b => `<option value="${b.id}" ${b.id === _selectedBatchId ? 'selected' : ''}>Batch ${escapeHtml(b.name || b.id)}</option>`).join('')}
                  </select>
                `}
              </div>

              <!-- Enrolled Students Counter Badge -->
              <div style="height:30px; padding:0 10px; background:#1e293b; border:1px solid rgba(255,255,255,0.16); border-radius:5px; display:flex; align-items:center; justify-content:space-between; box-sizing:border-box;">
                <span style="font-size:12px; font-weight:800; color:#cbd5e1; text-transform:uppercase; letter-spacing:0.04em;">Enrolled</span>
                <span id="open-modal-student-count" style="color:var(--primary-tactical); font-weight:800; font-size:12px;">0 selected</span>
              </div>
            </div>

            <!-- Row 2A: Words Module & Phrases Module (Strictly for Vocabulary Classes) -->
            <div id="open-modal-vocab-modules-row" style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
              <div>
                <label class="form-label" style="font-weight:800; font-size:12px; color:var(--primary-tactical); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:4px; display:block;">Words Module</label>
                <select id="open-modal-words-module-select" class="form-control" style="width:100%; height:30px; background:#1e293b; border:1px solid rgba(255,255,255,0.22); color:#ffffff; padding:2px 8px; border-radius:5px; font-weight:700; font-size:12px;">
                  <option value="written" selected>Written (M3)</option>
                  <option value="multiple_choice">Selection (M2)</option>
                  <option value="spoken">Spoken (M4)</option>
                </select>
              </div>

              <div>
                <label class="form-label" style="font-weight:800; font-size:12px; color:var(--quad-d); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:4px; display:block;">Phrases Module</label>
                <select id="open-modal-phrases-module-select" class="form-control" style="width:100%; height:30px; background:#1e293b; border:1px solid rgba(255,255,255,0.22); color:#ffffff; padding:2px 8px; border-radius:5px; font-weight:700; font-size:12px;">
                  <option value="written">Written (M3)</option>
                  <option value="multiple_choice" selected>Selection (M2)</option>
                  <option value="spoken">Spoken (M4)</option>
                </select>
              </div>
            </div>

            <!-- Row 2B: Non-Vocab Class Exam Details (Dedicated for Basic English, Speaking, Storytelling, etc.) -->
            <div id="open-modal-nonvocab-details-row" class="hidden" style="background:rgba(15,23,42,0.7); border:1px solid rgba(56,189,248,0.25); border-radius:6px; padding:8px 12px; display:none; flex-direction:column; gap:4px;">
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                <span style="color:#94a3b8; font-weight:700; text-transform:uppercase;">Exam:</span>
                <span id="open-modal-nonvocab-exam-title" style="color:#ffffff; font-weight:800; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:320px;">—</span>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                <span style="color:#94a3b8; font-weight:700; text-transform:uppercase;">Engine / Questions:</span>
                <span id="open-modal-nonvocab-engine-info" style="color:#38bdf8; font-weight:800;">—</span>
              </div>
            </div>

            <!-- Row 3: Duration Allocation & Tutor Override -->
            <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <label class="form-label" style="font-weight:800; font-size:12px; color:#ffffff; text-transform:uppercase; letter-spacing:0.04em; margin:0;">Duration:</label>
                <input type="number" id="open-modal-duration-input" class="form-control" value="60" min="5" max="360" step="5" style="width:65px; height:30px; background:#1e293b; border:1px solid rgba(255,255,255,0.25); color:#ffffff; padding:2px 6px; border-radius:5px; font-weight:800; font-size:12px; text-align:center;">
                <span id="open-modal-duration-suggestion-text" style="font-size:12px; color:var(--grade-c); font-weight:700;">60 min</span>
              </div>

              <label id="open-modal-override-wrapper" style="font-size:12px; color:var(--grade-c); display:flex; align-items:center; gap:10px; cursor:pointer; margin:0;" title="Allow students who haven't completed tasks to participate">
                <input type="checkbox" id="open-modal-override-checkbox" style="cursor:pointer; width:15px; height:15px; accent-color:var(--grade-c);">
                <span style="font-weight:800; letter-spacing:0.03em; text-transform:uppercase;">Tutor Override</span>
              </label>
            </div>

          </div>

          <!-- BOTTOM SECTION: Full Student Table with Filter Controls -->
          <div style="padding:10px; display:flex; flex-direction:column; gap:10px; flex:1; min-height:0; overflow:hidden;">

            <!-- Search + sort + select buttons with Strict 10px Gap -->
            <div style="display:flex; gap:10px; align-items:center; flex-shrink:0;">
              <input type="text" id="open-modal-student-search" placeholder="Search student..." class="form-control" style="font-size:12px; height:30px; padding:4px 10px; flex:1; min-width:100px; background:#1e293b; border:1px solid rgba(255,255,255,0.22); color:#ffffff; border-radius:5px; font-weight:600;">
              <button type="button" class="btn btn-secondary btn-xs" id="btn-open-modal-sort" style="height:30px; padding:0 10px; font-size:12px; font-weight:700; white-space:nowrap; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.22); color:#ffffff; border-radius:5px;">A → Z</button>
              <button type="button" class="btn btn-secondary btn-xs" id="btn-open-modal-select-all" style="height:30px; padding:0 10px; font-size:12px; font-weight:700; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.22); color:#ffffff; border-radius:5px;">All</button>
              <button type="button" class="btn btn-secondary btn-xs" id="btn-open-modal-deselect-all" style="height:30px; padding:0 10px; font-size:12px; font-weight:700; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.22); color:#ffffff; border-radius:5px;">None</button>
            </div>

            <!-- Student Table (Scrollable within container) -->
            <div class="table-wrap" style="flex:1; min-height:180px; overflow-y:auto; border:1px solid rgba(255,255,255,0.12); border-radius:6px; background:#090D16;">
              <table class="table" style="width:100%; border-collapse:collapse; font-size:12px; display:table; margin:0; table-layout:fixed;">
                <thead>
                  <tr style="background:#1E293B; border-bottom:1.5px solid rgba(255,255,255,0.18); height:38px;">
                    <th style="position:sticky; top:0; background:#1E293B; z-index:5; padding:6px 6px; text-align:center; font-size:12px; color:#ffffff; text-transform:uppercase; font-weight:800; letter-spacing:0.05em; width:40px;">NO</th>
                    <th style="position:sticky; top:0; background:#1E293B; z-index:5; padding:6px 10px; text-align:left; font-size:12px; color:#ffffff; text-transform:uppercase; font-weight:800; letter-spacing:0.05em;">NAME</th>
                    <th style="position:sticky; top:0; background:#1E293B; z-index:5; padding:6px 8px; text-align:right; font-size:12px; color:#ffffff; text-transform:uppercase; font-weight:800; letter-spacing:0.05em; width:215px;">STATUS</th>
                  </tr>
                </thead>
                <tbody id="open-modal-students-table-body">
                  <!-- Populated dynamically with ALL students -->
                </tbody>
              </table>
            </div>

          </div>
        </div>

        <!-- 3. Modal Footer: Standardized 60px CTA Area Invariant (§1.5.2 & §1.5.4) - Red Left Cancel & Green Right Unlock -->
        <div class="modal-footer" style="height:60px; min-height:60px; max-height:60px; padding:0 16px; border-top:1.5px solid rgba(255,255,255,0.16); display:flex; justify-content:space-between; align-items:center; background:#1E293B; box-sizing:border-box; flex-shrink:0; margin:0 !important;">
          <!-- Close Button: Strictly on Left with Red Accent -->
          <button type="button" class="btn btn-secondary btn-modal-close-left" id="btn-cancel-open-modal" style="height:40px; min-height:40px; line-height:38px; padding:0 20px; font-size:14px; font-weight:800; border-radius:6px; color:#ffffff; background:rgba(255,0,0,0.15); border:1.5px solid var(--grade-e); box-shadow:0 0 10px rgba(255,0,0,0.3); cursor:pointer; text-transform:uppercase;">
            CLOSE
          </button>

          <!-- Middle Student Count Summary -->
          <div id="open-modal-footer-summary" style="font-size:12px; color:#cbd5e1; font-weight:700; text-align:center;"></div>

          <!-- Confirm Unlock Button: Strictly on Right with Green Accent -->
          <button type="button" class="btn btn-primary" id="btn-confirm-open-session" style="height:40px; min-height:40px; line-height:38px; font-weight:800; padding:0 20px; display:inline-flex; align-items:center; gap:10px; font-size:14px; border-radius:6px; letter-spacing:0.04em; text-transform:uppercase; background:var(--grade-a); color:#090D16; border:1.5px solid var(--grade-a); box-shadow:0 0 14px rgba(0,192,0,0.45); cursor:pointer;">
            Unlock Test Now
          </button>
        </div>
      </div>
    </div>
      </div>
    </div>

    <!-- Modal 2: Add Late Arrival Students to Live Session (Window L3) -->
    <div id="modal-theme-add-late" class="modal-backdrop hidden" style="position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;">
      <div class="modal-box card" style="background:#0F172A; border:1.5px solid rgba(255,255,255,0.18); border-radius:12px; width:95vw; max-width:520px; height:560px; max-height:85vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.9);">
        <!-- Standardized 60px Solid Navy Title Area (§1.5.1 Centered Title & Stacked Subtitle Invariant) -->
        <div class="title-area dual-line" style="position:relative; padding:0 16px; height:60px; min-height:60px; max-height:60px; border-bottom:1.5px solid rgba(255,255,255,0.12); display:flex; justify-content:center; align-items:center; background:#1E293B; box-sizing:border-box; flex-shrink:0;">
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; max-width:calc(100% - 40px); overflow:hidden;">
            <h3 id="late-modal-theme-title" style="margin:0; font-size:16px; font-weight:800; font-family:var(--fm-font-display, 'Inter', sans-serif); color:#ffffff; letter-spacing:0.04em; text-transform:uppercase; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              THEME G — GENERAL • LATE ARRIVAL
            </h3>
            <span id="late-modal-batch-name" style="font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:#94a3b8; margin-top:2px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              Batch Name
            </span>
          </div>
        </div>

        <!-- Top Info & Toolbar Settings Container (Strict 10px Padding & Gaps) -->
        <div style="padding:10px 16px; display:flex; flex-direction:column; gap:10px; background:#0F172A; border-bottom:1px solid rgba(255,255,255,0.08); box-sizing:border-box; flex-shrink:0;">
          <!-- Session Info Row (Mode Badge, Remaining Time, Tutor Override) -->
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:nowrap;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span id="late-modal-mode-badge" style="font-size:12px; font-weight:700; padding:3px 10px; border-radius:5px; text-transform:uppercase; background:rgba(0,192,0,0.12); border:1px solid var(--grade-a); color:var(--grade-a);">
                EXAM SESSION
              </span>
              <span style="font-size:12px; color:#cbd5e1; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
                <span style="color:#94a3b8;">TIME LEFT:</span>
                <span id="late-modal-remaining-time" style="color:var(--grade-c); font-weight:800; font-variant-numeric:tabular-nums;">-- Mins</span>
              </span>
            </div>
            <label style="display:inline-flex; align-items:center; gap:6px; cursor:pointer; font-size:12px; font-weight:700; color:var(--grade-c); margin:0; user-select:none; white-space:nowrap;">
              <input type="checkbox" id="late-modal-override-checkbox" style="width:14px; height:14px; cursor:pointer; accent-color:var(--grade-c);">
              <span>TUTOR OVERRIDE</span>
            </label>
          </div>

          <!-- Search & Selection Toolbar Row (Strict 30px Height Controls) -->
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
            <input type="text" id="late-modal-search" placeholder="Search student..." class="form-control" style="font-size:12px; height:30px; padding:0 10px; flex:1; background:#1e293b; border:1px solid rgba(255,255,255,0.18); color:#ffffff; border-radius:5px;">
            <div style="display:flex; gap:8px; align-items:center;">
              <button type="button" class="btn btn-secondary btn-xs" id="btn-late-modal-select-all" style="height:30px; line-height:28px; padding:0 12px; font-size:12px; font-weight:700; border-radius:5px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.22); color:#ffffff;">All</button>
              <button type="button" class="btn btn-secondary btn-xs" id="btn-late-modal-deselect-all" style="height:30px; line-height:28px; padding:0 12px; font-size:12px; font-weight:700; border-radius:5px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.22); color:#ffffff;">None</button>
            </div>
          </div>
        </div>

        <!-- Student Table Container (Zero-Truncation & Standardized Dimensions per §4.2) -->
        <div style="padding:10px 16px; overflow-y:auto; flex:1; display:flex; flex-direction:column; box-sizing:border-box; min-height:220px;">
          <div class="table-wrap" style="overflow-x:hidden !important; overflow-y:auto; flex:1; border-radius:6px; border:1px solid rgba(255, 255, 255, 0.16) !important; background:#080D1A;">
            <table style="width:100%; table-layout:fixed; border-collapse:separate; border-spacing:0; font-size:12px; font-family:var(--fm-font-sans, 'Inter', sans-serif);">
              <colgroup>
                <col style="width:40px;">
                <col style="min-width:160px;">
                <col style="width:215px;">
              </colgroup>
              <thead>
                <tr style="height:36px; background:#0F172A;">
                  <th style="padding:6px 4px; text-align:center; font-size:12px; font-weight:700; color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.12);">NO</th>
                  <th style="padding:6px 10px; text-align:left; font-size:12px; font-weight:700; color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.12);">STUDENT NAME</th>
                  <th style="padding:6px 8px; text-align:right; font-size:12px; font-weight:700; color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.12);">STATUS</th>
                </tr>
              </thead>
              <tbody id="late-modal-students-table-body">
                <!-- Populated dynamically -->
              </tbody>
            </table>
          </div>
          <div id="late-modal-students-list" style="display:none;"></div>
        </div>

        <!-- Standardized 60px CTA Area Invariant (Solid Navy, Left Red Cancel & Right Green Add) -->
        <div class="modal-footer" style="height:60px; min-height:60px; max-height:60px; padding:0 16px; border-top:1.5px solid rgba(255,255,255,0.16); display:flex; justify-content:space-between; align-items:center; background:#1E293B; box-sizing:border-box; flex-shrink:0; margin:0 !important;">
          <!-- Close Button: Strictly on Left with Red Accent -->
          <button type="button" class="btn btn-secondary btn-modal-close-left" id="btn-cancel-late-modal" style="height:40px; min-height:40px; line-height:38px; padding:0 20px; font-size:14px; font-weight:800; border-radius:6px; color:#ffffff; background:rgba(255,0,0,0.15); border:1.5px solid var(--grade-e); box-shadow:0 0 10px rgba(255,0,0,0.3); cursor:pointer; text-transform:uppercase;">
            CLOSE
          </button>

          <!-- Middle Student Count Summary -->
          <div style="font-size:12px; color:#cbd5e1; font-weight:700; text-align:center;">
            Selected: <span id="late-modal-selected-count" style="color:var(--primary-tactical);">0</span> Students
          </div>

          <!-- Confirm Add Button: Strictly on Right with Green Accent -->
          <button type="button" class="btn btn-primary" id="btn-confirm-add-late" style="height:40px; min-height:40px; line-height:38px; font-weight:800; padding:0 20px; display:inline-flex; align-items:center; gap:8px; font-size:14px; border-radius:6px; letter-spacing:0.04em; text-transform:uppercase; background:var(--grade-a); color:#090D16; border:1.5px solid var(--grade-a); box-shadow:0 0 14px rgba(0,192,0,0.45); cursor:pointer;">
            Add to Test Now
          </button>
        </div>
      </div>
    </div>

    <!-- Modal 3: Live Test Session Monitor & Student Controller (Window L2) -->
    <div id="modal-theme-live-monitor" class="modal-backdrop hidden" style="position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:9999; padding:16px;">
      <div class="modal-box card" style="background:#0F172A; border:1.5px solid rgba(255,255,255,0.18); border-radius:12px; width:95vw; max-width:860px; max-height:85vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.9);">
        <!-- Standardized 60px Solid Navy Title Area (§1.5.1 Centered Title & Stacked Subtitle Invariant) -->
        <div class="title-area dual-line" style="position:relative; padding:0 16px; height:60px; min-height:60px; max-height:60px; border-bottom:1.5px solid rgba(255,255,255,0.12); display:flex; justify-content:center; align-items:center; background:#1E293B; box-sizing:border-box; flex-shrink:0;">
          <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; max-width:calc(100% - 40px); overflow:hidden;">
            <span id="live-modal-theme-badge" style="display:none;"></span>
            <h3 id="live-modal-title" style="margin:0; font-size:16px; font-weight:800; font-family:var(--fm-font-display, 'Inter', sans-serif); color:#ffffff; letter-spacing:0.04em; text-transform:uppercase; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              LIVE TEST SESSION MONITOR
            </h3>
            <span id="live-modal-subtitle" style="font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:#94a3b8; margin-top:2px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
              Real-time Progress, Alarm &amp; Scoring
            </span>
          </div>
        </div>

        <!-- Standardized In-Window Sub-Panel & Toolbar (40px Height, 10px Gap) -->
        <div style="padding:0 16px; height:40px; min-height:40px; max-height:40px; display:flex; justify-content:space-between; align-items:center; gap:10px; flex-wrap:nowrap; background:#0F172A; border-bottom:1px solid rgba(255,255,255,0.08); box-sizing:border-box; flex-shrink:0;">
          <div style="display:flex; gap:8px; flex-wrap:nowrap; align-items:center;" id="live-modal-filter-tabs">
            <button type="button" class="btn live-filter-btn active" data-filter="all" style="height:30px; line-height:28px; padding:0 10px; font-size:12px; font-weight:700; border-radius:5px; white-space:nowrap;">All (<span id="tab-cnt-all">0</span>)</button>
            <button type="button" class="btn live-filter-btn" data-filter="in_progress" style="height:30px; line-height:28px; padding:0 10px; font-size:12px; font-weight:700; border-radius:5px; white-space:nowrap;">In Progress (<span id="tab-cnt-in-progress">0</span>)</button>
            <button type="button" class="btn live-filter-btn" data-filter="submitted" style="height:30px; line-height:28px; padding:0 10px; font-size:12px; font-weight:700; border-radius:5px; white-space:nowrap;">Submitted (<span id="tab-cnt-submitted">0</span>)</button>
            <button type="button" class="btn live-filter-btn" data-filter="not_started" style="height:30px; line-height:28px; padding:0 10px; font-size:12px; font-weight:700; border-radius:5px; white-space:nowrap;">Not Started (<span id="tab-cnt-not-started">0</span>)</button>
            <button type="button" class="btn live-filter-btn" data-filter="alarm" style="height:30px; line-height:28px; padding:0 10px; font-size:12px; font-weight:700; border-radius:5px; white-space:nowrap;">Alarm (<span id="tab-cnt-alarm">0</span>)</button>
          </div>

          <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
            <button type="button" class="btn btn-secondary" id="btn-live-modal-refresh" style="height:30px; line-height:28px; padding:0 10px; font-size:12px; font-weight:700; display:inline-flex; align-items:center; gap:6px; border-radius:5px; color:#ffffff; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.22); white-space:nowrap;" title="Manual Refresh">
              Refresh
            </button>
            <label style="display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:500; color:#cbd5e1; cursor:pointer; user-select:none; margin:0; white-space:nowrap;">
              <input type="checkbox" id="live-modal-auto-poll" checked style="cursor:pointer; width:14px; height:14px; accent-color:var(--primary-tactical);">
              <span>Auto (5s)</span>
            </label>
            <input type="text" id="live-modal-search" placeholder="Search student..." class="form-control" style="font-size:12px; height:30px; padding:0 10px; width:130px; background:#1e293b; border:1px solid rgba(255,255,255,0.18); color:#ffffff; border-radius:5px;">
          </div>
        </div>

        <!-- Sortable Live Monitor Table Container (Zero Horizontal Scroll & Fixed Layout per §1.1 & §4.4) -->
        <div style="padding:10px 16px; overflow-y:auto; flex:1; display:flex; flex-direction:column; box-sizing:border-box;">
          <div class="live-monitor-table-wrapper" style="overflow-x:hidden !important; overflow-y:auto; flex:1; border-radius:6px; border:1px solid rgba(255, 255, 255, 0.16) !important; background:#080D1A;">
            <table class="live-monitor-table" style="width:100%; table-layout:fixed; border-collapse:separate; border-spacing:0; font-size:12px; font-family:var(--fm-font-sans, 'Inter', sans-serif);">
              <colgroup>
                <col style="width:75px;">
                <col style="min-width:180px;">
                <col style="width:130px;">
                <col style="width:130px;">
                <col style="width:90px;">
                <col style="width:80px;">
                <col style="width:55px;">
              </colgroup>
              <thead>
                <tr style="height:36px; background:#0F172A;">
                  <th style="padding:6px 4px; text-align:center; font-size:12px; font-weight:700; color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.12);">BATCH</th>
                  <th class="sortable-th" data-sort-key="name" style="padding:6px 10px; text-align:left; font-size:12px; font-weight:700; color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.12); cursor:pointer;">NAME <span class="sort-icon" id="th-sort-name"></span></th>
                  <th class="sortable-th" data-sort-key="status" style="padding:6px 6px; text-align:center; font-size:12px; font-weight:700; color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.12); cursor:pointer;">TEST STATUS <span class="sort-icon" id="th-sort-status"></span></th>
                  <th class="sortable-th" data-sort-key="progress" style="padding:6px 6px; text-align:center; font-size:12px; font-weight:700; color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.12); cursor:pointer;">PROGRESS <span class="sort-icon" id="th-sort-progress"></span></th>
                  <th class="sortable-th" data-sort-key="score" style="padding:6px 6px; text-align:center; font-size:12px; font-weight:700; color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.12); cursor:pointer;">RATE <span class="sort-icon" id="th-sort-score"></span></th>
                  <th class="sortable-th" data-sort-key="alarm" style="padding:6px 6px; text-align:center; font-size:12px; font-weight:700; color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.12); cursor:pointer;">ALARM <span class="sort-icon" id="th-sort-alarm"></span></th>
                  <th style="padding:6px 4px; text-align:center; font-size:12px; font-weight:700; color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.12);">EXPEL</th>
                </tr>
              </thead>
              <tbody id="live-modal-table-body">
                <!-- Populated dynamically -->
              </tbody>
            </table>
          </div>
          <div id="live-modal-students-container" style="display:none;"></div>
        </div>

        <!-- Standardized 60px CTA Panel (Solid Navy, Left Red Close CTA & Right Operational Panel) -->
        <div class="modal-footer" style="height:60px; min-height:60px; max-height:60px; padding:0 16px; border-top:1.5px solid rgba(255,255,255,0.16); display:flex; justify-content:space-between; align-items:center; background:#1E293B; box-sizing:border-box; flex-shrink:0; margin:0 !important;">
          <!-- Left: Bottom-Left Close CTA Invariant (Red Accent) -->
          <button type="button" class="btn btn-secondary btn-modal-close-left" id="btn-close-live-modal-footer" style="height:40px; min-height:40px; line-height:38px; padding:0 20px; font-size:14px; font-weight:800; border-radius:6px; color:#ffffff; background:rgba(255,0,0,0.15); border:1.5px solid var(--grade-e); box-shadow:0 0 10px rgba(255,0,0,0.3); cursor:pointer; text-transform:uppercase;">
            CLOSE
          </button>

          <!-- Right Operational Controls: NORMAL/REMEDIAL -> EDIT TIME -> TIME (Standard 40px Height) -->
          <div style="display:flex; align-items:center; gap:10px;">
            <!-- 1. Keterangan Normal/Remedial (40px Height) -->
            <button type="button" class="btn btn-session-mode mode-normal" id="live-modal-mode-badge" style="height:40px; min-height:40px; line-height:38px; padding:0 16px; font-size:12px; font-weight:800; border-radius:6px; border:1.5px solid rgba(0,192,0,0.4); background:rgba(0,192,0,0.08); color:var(--grade-a); cursor:default; text-transform:uppercase; white-space:nowrap;" title="Session Mode">
              NORMAL (FULL SCORE)
            </button>

            <!-- 2. Edit Session Time Button (40px Height) -->
            <div style="position:relative; display:inline-block;" id="live-modal-add-time-wrapper">
              <button type="button" class="btn btn-session-edit-time" id="btn-live-modal-add-time" style="height:40px; min-height:40px; line-height:38px; padding:0 16px; font-size:12px; font-weight:800; border-radius:6px; background:rgba(255,255,255,0.08); border:1.5px solid rgba(255,255,255,0.22); color:var(--grade-c); cursor:pointer; display:inline-flex; align-items:center; gap:8px; text-transform:uppercase; white-space:nowrap;" title="Adjust Remaining Exam Time (+ / -)">
                <span>EDIT TIME</span>
                <span style="font-size:12px;">▲</span>
              </button>
              <div id="live-modal-add-time-menu" class="hidden" style="position:absolute; right:0; bottom:calc(100% + 8px); background:#0f172a; border:2px solid var(--grade-c); border-radius:8px; box-shadow:0 16px 36px rgba(0,0,0,0.92); z-index:99999; width:220px; padding:8px; display:none; flex-direction:column; gap:6px;">
                <!-- Yellow Header Banner -->
                <div style="background:rgba(var(--grade-c-rgb), 0.12); border:1px solid rgba(var(--grade-c-rgb), 0.4); color:var(--grade-c); font-weight:800; font-size:12px; padding:5px 8px; border-radius:5px; text-transform:uppercase; letter-spacing:0.05em; display:flex; align-items:center; justify-content:space-between;">
                  <span>ADJUST SESSION TIME</span>
                  <span style="font-size:12px; background:#0f172a; color:var(--grade-c); padding:1px 5px; border-radius:3px;">LIVE</span>
                </div>

                <!-- Section 1: Add Time (+) -->
                <div>
                  <div style="font-size:12px; font-weight:800; color:#86efac; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
                    ADD TIME (+)
                  </div>
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                    <button type="button" class="btn-add-time-option" data-mins="5" style="background:rgba(var(--grade-a-rgb), 0.08); border:1px solid rgba(var(--grade-a-rgb), 0.4); color:#86efac; padding:5px 6px; border-radius:5px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px;">
                      +5 Min
                    </button>
                    <button type="button" class="btn-add-time-option" data-mins="10" style="background:rgba(var(--grade-a-rgb), 0.08); border:1px solid rgba(var(--grade-a-rgb), 0.4); color:#86efac; padding:5px 6px; border-radius:5px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px;">
                      +10 Min
                    </button>
                    <button type="button" class="btn-add-time-option" data-mins="15" style="background:rgba(var(--grade-a-rgb), 0.08); border:1px solid rgba(var(--grade-a-rgb), 0.4); color:#86efac; padding:5px 6px; border-radius:5px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px;">
                      +15 Min
                    </button>
                    <button type="button" class="btn-add-time-option" data-mins="30" style="background:rgba(var(--grade-a-rgb), 0.08); border:1px solid rgba(var(--grade-a-rgb), 0.4); color:#86efac; padding:5px 6px; border-radius:5px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px;">
                      +30 Min
                    </button>
                  </div>
                </div>

                <!-- Section 2: Reduce Time (-) -->
                <div>
                  <div style="font-size:12px; font-weight:800; color:#fca5a5; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
                    REDUCE TIME (-)
                  </div>
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
                    <button type="button" class="btn-add-time-option" data-mins="-5" style="background:rgba(var(--grade-e-rgb), 0.08); border:1px solid rgba(var(--grade-e-rgb), 0.4); color:#fca5a5; padding:5px 6px; border-radius:5px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px;">
                      -5 Min
                    </button>
                    <button type="button" class="btn-add-time-option" data-mins="-10" style="background:rgba(var(--grade-e-rgb), 0.08); border:1px solid rgba(var(--grade-e-rgb), 0.4); color:#fca5a5; padding:5px 6px; border-radius:5px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px;">
                      -10 Min
                    </button>
                    <button type="button" class="btn-add-time-option" data-mins="-15" style="background:rgba(var(--grade-e-rgb), 0.08); border:1px solid rgba(var(--grade-e-rgb), 0.4); color:#fca5a5; padding:5px 6px; border-radius:5px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px;">
                      -15 Min
                    </button>
                    <button type="button" class="btn-add-time-option" data-mins="-30" style="background:rgba(var(--grade-e-rgb), 0.08); border:1px solid rgba(var(--grade-e-rgb), 0.4); color:#fca5a5; padding:5px 6px; border-radius:5px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px;">
                      -30 Min
                    </button>
                  </div>
                </div>

                <!-- Section 3: Custom Button -->
                <button type="button" id="btn-add-time-custom" style="width:100%; text-align:center; background:rgba(var(--grade-c-rgb), 0.07); border:1px dashed rgba(var(--grade-c-rgb), 0.5); color:var(--grade-c); padding:6px 8px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; margin-top:2px;">
                  Custom Minutes (+ / -)...
                </button>
              </div>
            </div>

            <!-- 3. Time Button (40px Height) -->
            <button type="button" class="btn btn-session-time" id="btn-live-modal-time" style="height:40px; min-height:40px; line-height:38px; padding:0 16px; font-size:12px; font-weight:800; border-radius:6px; background:rgba(255,255,255,0.06); border:1.5px solid rgba(255,255,255,0.15); color:#ffffff; display:inline-flex; align-items:center; gap:6px; cursor:default; white-space:nowrap;" title="Remaining Exam Time">
              <span style="font-weight:600; color:#94a3b8;">TIME:</span>
              <span id="live-modal-remaining" style="font-weight:800; font-variant-numeric:tabular-nums; color:#ffffff;">--m</span>
            </button>
          </div>
        </div>
      </div>
    </div>
      </div>
    </div>

    <!-- Modal 4: Kick Student Confirmation Modal -->
    <div id="modal-kick-student-confirm" class="modal-backdrop hidden" style="position:fixed; inset:0; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-content:center; z-index:10005; padding:16px;">
      <div class="modal-box card" style="background:#0f172a; border:2px solid var(--grade-e); border-radius:12px; width:100%; max-width:480px; overflow:hidden; box-shadow:0 20px 50px rgba(var(--grade-e-rgb),0.35);">
        <div style="height:60px; min-height:60px; max-height:60px; padding:0 20px; background:#1E293B; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; box-sizing:border-box;">
          <h4 style="margin:0; font-family:'Inter',sans-serif; font-size:16px; font-weight:800; color:var(--grade-e); text-transform:uppercase; letter-spacing:0.5px;">EXPEL STUDENT FROM EXAM</h4>
          <div id="kick-confirm-student-name" style="font-family:'Inter',sans-serif; font-size:12px; font-weight:400; color:#94a3b8; margin-top:2px;">Student Name</div>
        </div>
        <div style="padding:16px 20px; font-size:12px; color:#cbd5e1; display:flex; flex-direction:column; gap:10px; box-sizing:border-box;">
          <div style="font-family:'Inter',sans-serif; font-size:12px; font-weight:600; color:#cbd5e1;">Select an action for the student's active exam attempt:</div>
          <label style="display:flex; align-items:flex-start; gap:10px; background:rgba(255,255,255,0.04); padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); cursor:pointer;">
            <input type="radio" name="kick_action" value="submit" checked style="margin-top:2px; cursor:pointer;">
            <div>
              <div style="font-family:'Inter',sans-serif; font-weight:700; color:#ffffff; font-size:12px;">Submit &amp; Grade Current Answers</div>
              <div style="font-family:'Inter',sans-serif; font-size:12px; font-weight:400; color:#94a3b8; margin-top:2px;">Student's exam is stopped immediately. Current answers are saved and graded automatically.</div>
            </div>
          </label>
          <label style="display:flex; align-items:flex-start; gap:10px; background:rgba(255,255,255,0.04); padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,0.08); cursor:pointer;">
            <input type="radio" name="kick_action" value="cancel" style="margin-top:2px; cursor:pointer;">
            <div>
              <div style="font-family:'Inter',sans-serif; font-weight:700; color:var(--grade-e); font-size:12px;">Cancel Exam (Score 0 / Cancelled)</div>
              <div style="font-family:'Inter',sans-serif; font-size:12px; font-weight:400; color:#94a3b8; margin-top:2px;">Exam is voided and the attempt status is set to 'cancelled' with score 0.</div>
            </div>
          </label>
        </div>
        <div style="height:60px; min-height:60px; max-height:60px; padding:10px 20px; border-top:1px solid rgba(255,255,255,0.08); display:flex; justify-content:space-between; align-items:center; background:#1E293B; box-sizing:border-box;">
          <button type="button" class="btn btn-modal-close-left" id="btn-cancel-kick" style="height:40px; min-height:40px; line-height:38px; background:rgba(255,0,0,0.15); border:1.5px solid var(--grade-e); color:#ffffff; font-weight:600; font-size:12px; padding:0 18px; border-radius:4px; box-sizing:border-box; cursor:pointer;">CLOSE</button>
          <button type="button" class="btn" id="btn-confirm-kick" style="height:40px; min-height:40px; line-height:38px; background:var(--grade-e) !important; border:1.5px solid var(--grade-e) !important; color:#ffffff !important; font-weight:800; font-size:14px; padding:0 18px; border-radius:4px; box-sizing:border-box; display:inline-flex; align-items:center; gap:6px; cursor:pointer; box-shadow:0 0 14px rgba(255,0,0,0.45);">
            Expel Now
          </button>
        </div>
      </div>
    </div>

    <!-- Modal 5: Student Alarm Detail & Forgive Modal -->
    <div id="modal-student-alarm-detail" class="modal-backdrop hidden" style="position:fixed; inset:0; background:rgba(0,0,0,0.85); backdrop-filter:blur(6px); display:flex; align-items:center; justify-content:center; z-index:10010; padding:16px;">
      <div class="modal-box card" style="background:#0f172a; border:1.5px solid rgba(var(--grade-e-rgb),0.35); border-radius:12px; width:100%; max-width:480px; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.9);">
        <div style="height:60px; min-height:60px; max-height:60px; padding:0 20px; background:#1E293B; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; box-sizing:border-box;">
          <h4 id="alarm-detail-student-name" style="margin:0; font-family:'Inter',sans-serif; font-size:16px; font-weight:800; color:#ffffff; text-transform:uppercase; letter-spacing:0.5px;">STUDENT INTEGRITY &amp; TAB-SWITCH ALARMS</h4>
        </div>
        <div id="alarm-detail-logs-list" style="padding:10px 16px; max-height:50vh; overflow-y:auto; display:flex; flex-direction:column; gap:10px; box-sizing:border-box;">
          <!-- Items injected dynamically -->
        </div>
        <div style="height:60px; min-height:60px; max-height:60px; padding:10px 20px; border-top:1px solid rgba(255,255,255,0.08); background:#1E293B; display:flex; justify-content:space-between; align-items:center; box-sizing:border-box;">
          <button type="button" class="btn btn-modal-close-left" id="btn-dismiss-alarm-detail" style="height:40px; min-height:40px; line-height:38px; background:rgba(255,0,0,0.15); border:1.5px solid var(--grade-e); color:#ffffff; font-weight:600; font-size:12px; padding:0 18px; border-radius:4px; box-sizing:border-box; cursor:pointer;">CLOSE</button>
          <button type="button" class="btn" id="btn-clear-student-alarms" style="height:40px; min-height:40px; line-height:38px; background:rgba(255,255,0,0.12); border:1.5px solid var(--grade-c); color:var(--grade-c); font-size:12px; font-weight:700; padding:0 16px; border-radius:4px; cursor:pointer; box-sizing:border-box;">
            Reset / Forgive Student Alarms
          </button>
        </div>
      </div>
    </div>
  `;

  bindTestSessionsEvents(container, themesData, context);
}

/**
 * Loads empirical exam mistake analytics across themes
 */
async function loadThemeExamAnalyticsData(themesData, context = {}) {
  // 1. If window._themeTop20 is already populated (from tests-management), format and return it
  if (window._themeTop20 && Object.keys(window._themeTop20).length > 0) {
    const formatted = {};
    (themesData || []).forEach(t => {
      const qs = window._themeTop20[t.code] || [];
      formatted[t.code] = qs.map(q => {
        let rawWrong = (q.topErrors && q.topErrors[0]) ? q.topErrors[0].answer : (q.commonWrong || '—');
        let cleanWrong = String(rawWrong || '').replace(/^["']|["']$/g, '').trim() || '—';
        return {
          text: q.text,
          commonWrong: cleanWrong,
          fail: q.fail != null ? q.fail : (q.failCount || 0),
          failRate: q.failRate != null ? q.failRate : 0,
          dominantErrorLabel: q.dominantErrorLabel || 'Spelling'
        };
      });
    });
    return formatted;
  }

  // 2. In-memory cache check
  if (window._testSessionsAnalyticsCache) {
    return window._testSessionsAnalyticsCache;
  }

  // 3. Authoritative Query: Aggregates attempt_answers across all tests in active class
  // Identical data source powering the Class Test Analytics tab (class-analytics.js)
  try {
    const sb = await getSupabase();
    if (!sb) return {};

    const classTests = context.classTests || [];
    const testIds = [];
    const testIdToTheme = {};

    // Map theme exams and tasks from themesData
    (themesData || []).forEach(t => {
      if (t.examTest?.id) {
        testIds.push(t.examTest.id);
        testIdToTheme[t.examTest.id] = t.code;
      }
      if (t.wordsTest?.id) {
        testIds.push(t.wordsTest.id);
        testIdToTheme[t.wordsTest.id] = t.code;
      }
      if (t.phrasesTest?.id) {
        testIds.push(t.phrasesTest.id);
        testIdToTheme[t.phrasesTest.id] = t.code;
      }
      (t.tasks || []).forEach(tsk => {
        if (tsk.id) {
          testIds.push(tsk.id);
          testIdToTheme[tsk.id] = t.code;
        }
      });
    });

    // Also map any remaining tests in context.classTests
    classTests.forEach(t => {
      if (!t.id || testIdToTheme[t.id]) return;
      testIds.push(t.id);
      const pl = t.payload || {};
      const tc = (pl.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : '')).toUpperCase();
      if (['A', 'B', 'C', 'D'].includes(tc)) {
        testIdToTheme[t.id] = tc;
      }
    });

    if (testIds.length === 0) return {};

    const { data: attempts, error: attErr } = await sb.from('attempts')
      .select('id, test_id, student_id, percentage, is_best_score')
      .in('test_id', testIds)
      .in('status', ['submitted', 'auto_submitted', 'evaluated', 'graded'])
      .order('created_at', { ascending: false })
      .limit(600);

    if (attErr || !attempts || attempts.length === 0) return {};

    // Deduplicate best attempt per student per test exactly like class-analytics.js
    const bestAttemptsMap = new Map();
    for (const a of attempts) {
      const key = `${a.student_id || ''}_${a.test_id}`;
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
    const repAttempts = Array.from(bestAttemptsMap.values());
    const attemptIds = repAttempts.map(a => a.id);

    const attemptToTheme = {};
    repAttempts.forEach(a => {
      attemptToTheme[a.id] = testIdToTheme[a.test_id] || 'A';
    });

    const allAnswers = [];
    const CHUNK_SIZE = 50;
    for (let i = 0; i < attemptIds.length; i += CHUNK_SIZE) {
      const chunk = attemptIds.slice(i, i + CHUNK_SIZE);
      const { data: ansChunk, error: ansErr } = await sb.from('attempt_answers')
        .select('attempt_id, student_answer, correct_answer_snapshot, is_correct, evaluation_result, question_snapshot')
        .in('attempt_id', chunk)
        .limit(1000);
      if (ansErr) {
        console.warn('[tests-access] Chunk fetch error:', ansErr.message);
        break;
      }
      if (ansChunk && ansChunk.length > 0) {
        allAnswers.push(...ansChunk);
      }
    }

    const themeMaps = { A: {}, B: {}, C: {}, D: {} };

    allAnswers.forEach(ans => {
      const qSnap = ans.question_snapshot || {};
      const target = (ans.correct_answer_snapshot || qSnap.target_word || qSnap.prompt || qSnap.question_text || '').trim();
      if (!target) return;

      const themeCode = qSnap.theme_code || attemptToTheme[ans.attempt_id] || 'A';
      if (!themeMaps[themeCode]) themeMaps[themeCode] = {};
      const qMap = themeMaps[themeCode];

      if (!qMap[target]) {
        qMap[target] = {
          target,
          total: 0,
          fail: 0,
          wrongAnswersCount: {},
          evalTypes: {}
        };
      }

      const qItem = qMap[target];
      qItem.total++;

      const rawAns = (ans.student_answer != null && typeof ans.student_answer === 'string') ? ans.student_answer.trim() : '';
      const isTimeout = !rawAns || rawAns.toLowerCase() === 'timeout' || rawAns.toLowerCase() === '[timeout]' || rawAns.toLowerCase() === 'timed out' || rawAns.toLowerCase() === 'null';

      if (isTimeout) return;

      if (!ans.is_correct) {
        qItem.fail++;
        qItem.wrongAnswersCount[rawAns] = (qItem.wrongAnswersCount[rawAns] || 0) + 1;
        const ev = ans.evaluation_result || 'spelling';
        qItem.evalTypes[ev] = (qItem.evalTypes[ev] || 0) + 1;
      }
    });

    const result = {};
    (themesData || []).forEach(t => {
      const code = t.code;
      const qList = Object.values(themeMaps[code] || {}).filter(q => q.fail >= 1);
      result[code] = qList.map(q => {
        const sortedWrongs = Object.entries(q.wrongAnswersCount).sort((a, b) => b[1] - a[1]);
        let rawWrong = sortedWrongs[0] ? sortedWrongs[0][0] : '—';
        let cleanWrong = String(rawWrong || '').replace(/^["']|["']$/g, '').trim() || '—';
        const failRate = q.total > 0 ? Math.round((q.fail / q.total) * 100) : 0;

        let dominantType = 'Spelling';
        const sortedTypes = Object.entries(q.evalTypes).sort((a, b) => b[1] - a[1]);
        if (sortedTypes[0]) {
          const tType = sortedTypes[0][0].toLowerCase();
          if (tType.includes('literal')) dominantType = 'Literal';
          else if (tType.includes('form')) dominantType = 'Word Form';
          else if (tType.includes('vocab')) dominantType = 'Vocab Gap';
          else dominantType = 'Spelling';
        }

        return {
          text: q.target,
          commonWrong: cleanWrong,
          fail: q.fail,
          failRate,
          dominantErrorLabel: dominantType
        };
      }).sort((a, b) => b.failRate - a.failRate || b.fail - a.fail);
    });

    window._testSessionsAnalyticsCache = result;
    return result;
  } catch (err) {
    console.warn('[tests-access] Error loading analytics:', err);
    return {};
  }
}

/**
 * Renders an individual theme's 4-column analytics table (TARGET | MISTAKE | COUNT | RATE)
 * Strictly flat text, zero capsules, electric blue typography (#38bdf8) for Mistake, and Inverted Score Color for Error Rate
 */
function renderThemeAnalyticsColumn(theme, questions = []) {
  const code = theme.code;
  const name = theme.name || `Theme ${code}`;
  const color = theme.color || '#38bdf8';
  const borderRgba = theme.borderRgba || 'rgba(255, 255, 255, 0.08)';

  const rowsHtml = (!questions || questions.length === 0)
    ? `<tr><td colspan="4" style="padding:14px 8px; text-align:center; color:#64748b; font-size: 12px;">No missed questions recorded yet</td></tr>`
    : questions.map(q => {
        const target = q.text || q.target || '—';
        let rawMistake = q.commonWrong || (q.topErrors && q.topErrors[0] ? q.topErrors[0].answer : '') || '—';
        // Strip any wrapping quotes per user directive
        const cleanMistake = String(rawMistake).replace(/^["']|["']$/g, '').trim() || '—';
        const failCount = q.fail != null ? q.fail : (q.failCount != null ? q.failCount : 0);
        const failRate = q.failRate != null ? q.failRate : 0;
        const rateColor = typeof getInvertedGradeColor === 'function' ? getInvertedGradeColor(failRate) : 'var(--grade-e)';

        return `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.06); transition:background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
            <td style="padding:6px 8px; color:#ffffff; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); font-size: 12px; white-space:nowrap !important; overflow:hidden; text-overflow:ellipsis; border-bottom:1px solid rgba(255,255,255,0.06); text-shadow:none;" title="${escapeHtml(target)}">${escapeHtml(target)}</td>
            <td style="padding:6px 8px; color:#38bdf8; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); font-size: 12px; white-space:nowrap !important; overflow:hidden; text-overflow:ellipsis; border-bottom:1px solid rgba(255,255,255,0.06); text-shadow:none;" title="${escapeHtml(cleanMistake)}">${escapeHtml(cleanMistake)}</td>
            <td style="padding:6px 4px; text-align:center; color:${rateColor}; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); font-size: 12px; font-variant-numeric:tabular-nums; border-bottom:1px solid rgba(255,255,255,0.06); width:50px; text-shadow:none;">${failCount}</td>
            <td style="padding:6px 4px; text-align:center; color:${rateColor}; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); font-size: 12px; font-variant-numeric:tabular-nums; border-bottom:1px solid rgba(255,255,255,0.06); width:52px; text-shadow:none;" title="Error Rate: ${failRate}%">${failRate}%</td>
          </tr>
        `;
      }).join('');

  const countLabel = (!questions || questions.length === 0) ? '0 Missed Items' : `${questions.length} Missed Items`;

  return `
    <div class="card" style="background: rgba(15, 23, 42, 0.85); border: 1px solid ${borderRgba}; border-radius: 8px; padding: 10px; box-sizing: border-box; display: flex; flex-direction: column; box-shadow: 0 4px 16px rgba(0,0,0,0.3); flex: 1 1 0; min-height: 0; height: 100%; overflow: hidden;">
      <div style="font-size: 12px; font-weight: 800; color: #ffffff; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 6px; flex-shrink: 0;">
        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 12px; font-weight: 800; color: ${color};">
          <span style="color: ${color};">${code}</span> - ${escapeHtml(name)} <span style="color: #94a3b8; font-weight: 600;">Analytics</span>
        </span>
        <span style="font-size: 12px; color: #94a3b8; font-weight: normal; flex-shrink: 0;">${countLabel}</span>
      </div>
      <div class="analytics-table-wrap" style="flex: 1 1 0 !important; min-height: 0 !important; height: 100% !important; overflow-y: auto !important; overflow-x: hidden !important; position: relative !important; border: 1px solid rgba(255,255,255,0.06); border-radius: 6px;">
        <table class="table" style="width: 100%; border-collapse: collapse; font-size: 12px; display: table; margin: 0; table-layout: fixed;">
          <thead>
            <tr style="background: #1e293b; border-bottom: 1px solid rgba(255,255,255,0.1);">
              <th style="position: sticky; top: 0; background: #1e293b; z-index: 5; padding: 6px 8px; text-align: center; font-size: 12px; color: #94a3b8; text-transform: uppercase; white-space: nowrap !important; font-weight: 700; overflow: hidden; text-overflow: ellipsis;">TARGET</th>
              <th style="position: sticky; top: 0; background: #1e293b; z-index: 5; padding: 6px 8px; text-align: center; font-size: 12px; color: #94a3b8; text-transform: uppercase; white-space: nowrap !important; font-weight: 700; overflow: hidden; text-overflow: ellipsis;">MISTAKE</th>
              <th style="position: sticky; top: 0; background: #1e293b; z-index: 5; padding: 6px 4px; text-align: center; font-size: 12px; color: #94a3b8; text-transform: uppercase; white-space: nowrap !important; font-weight: 700; width: 50px;">COUNT</th>
              <th style="position: sticky; top: 0; background: #1e293b; z-index: 5; padding: 6px 4px; text-align: center; font-size: 12px; color: #94a3b8; text-transform: uppercase; white-space: nowrap !important; font-weight: 700; width: 52px;" title="Error Rate (% Missed)">RATE</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

/**
 * Renders the 4-Theme Exam Analytics Board with 4-Column Zero-Capsule Tables
 */
function renderThemeExamAnalyticsBoard(themesData, context, analyticsData = {}) {
  if (!themesData || themesData.length === 0) return '';

  return `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px; flex: 1 1 0; min-height: 0; height: 100%;">
      ${themesData.map(theme => renderThemeAnalyticsColumn(theme, analyticsData[theme.code] || [])).join('')}
    </div>
  `;
}

/**
 * Backward compatibility alias for renderBatchReadinessMatrix
 */
function renderBatchReadinessMatrix(students, themesData, context, _ignoredThemeCode) {
  return renderThemeExamAnalyticsBoard(themesData, context);
}

/**
 * Renders a single unified Theme Card - 250px Zero-Overflow Glassmorphism with Standard 12px Font & 10px Gap
 */
function renderThemeCard(theme, context) {
  const {
    code,
    name,
    color,
    bgRgba,
    borderRgba,
    wordsTest,
    phrasesTest,
    examTest,
    tasks,
    isLive,
    remainingMinutes,
    liveBatchName,
    allowedStudentIds = [],
    isRemedial,
    eligibleNormalCount = 0,
    eligibleRemedialCount = 0,
    batchTotalStudents = 0
  } = theme;

  const isNonVocab = Boolean(theme.isNonVocab);
  const wordsQ = wordsTest?.total_questions || wordsTest?.payload?.total_questions || (Array.isArray(wordsTest?.questions) ? wordsTest.questions.length : 0);
  const phrasesQ = phrasesTest?.total_questions || phrasesTest?.payload?.total_questions || (Array.isArray(phrasesTest?.questions) ? phrasesTest.questions.length : 0);
  const examQ = examTest?.total_questions || examTest?.payload?.total_questions || (Array.isArray(examTest?.questions) ? examTest.questions.length : 0);
  const totalQ = isNonVocab ? (theme.totalQuestions || 20) : (examTest ? examQ : (wordsQ + phrasesQ));

  const enrolledCount = (allowedStudentIds && allowedStudentIds.length) ? allowedStudentIds.length : 0;
  const hasWords = Boolean(wordsTest);
  const hasPhrases = Boolean(phrasesTest);
  const hasExam = Boolean(examTest);
  const readinessPct = batchTotalStudents > 0 ? Math.round((eligibleNormalCount / batchTotalStudents) * 100) : 0;

  // Standar Pacing SSOT (DECISION-063 Khusus Vocabulary Class):
  // Words: 10s spoken / 15s written / 10s selection
  // Phrases: 20s spoken / 10s selection / 20s written
  let autoDur = 45;
  let wCount = 0;
  let pCount = 0;

  if (isNonVocab) {
    autoDur = theme.duration || examTest?.working_duration_minutes || 40;
  } else {
    const curModes = examTest?.payload?.test_session?.answering_modes || wordsTest?.payload?.test_session?.answering_modes || {};
    const curMode = examTest?.payload?.test_session?.answering_mode || wordsTest?.payload?.test_session?.answering_mode || 'written';
    const wordsAns = (curModes.words || curMode || 'written').toLowerCase();
    const phrasesAns = (curModes.phrases || 'multiple_choice').toLowerCase();

    const wPace = (wordsAns === 'written') ? 15 : 10;
    const pPace = (phrasesAns === 'selection' || phrasesAns === 'multiple_choice') ? 10 : 20;

    if (hasExam) {
      const isUnified = examTest.payload?.is_unified || examTest.payload?.category === 'unified' || examQ === 200;
      if (isUnified && examQ > 0) {
        if (Array.isArray(examTest.payload?.questions) && examTest.payload.questions.length > 0) {
          examTest.payload.questions.forEach(q => {
            if (q.test_section === 'phrases' || q.category === 'phrases') pCount++;
            else wCount++;
          });
        }
        if (wCount === 0 && pCount === 0) {
          if (examQ === 200) {
            wCount = 160;
            pCount = 40;
          } else if (examQ === 50) {
            wCount = 40;
            pCount = 10;
          } else {
            pCount = Math.round(examQ * 0.2);
            wCount = examQ - pCount;
          }
        }
      } else {
        const cat = (examTest.payload?.category || examTest.category || '').toLowerCase();
        if (cat === 'phrases') {
          pCount = examQ;
        } else {
          wCount = examQ;
        }
      }
    } else {
      wCount = wordsQ;
      pCount = phrasesQ;
    }

    const totalSeconds = (wCount * wPace) + (pCount * pPace);
    autoDur = totalSeconds > 0
      ? Math.max(5, Math.ceil(totalSeconds / 60))
      : (examTest?.working_duration_minutes || wordsTest?.working_duration_minutes || phrasesTest?.working_duration_minutes || 45);
  }

  const examTitleStr = isNonVocab
    ? escapeHtml(theme.name)
    : (hasExam
        ? escapeHtml(examTest.title || `Theme ${code} Exam`)
        : (hasWords && hasPhrases
            ? 'Words Exam & Phrases Exam'
            : (hasWords ? 'Words Exam' : (hasPhrases ? 'Phrases Exam' : 'Tasks Only'))));

  const questionCountStr = isNonVocab
    ? `${theme.totalQuestions || 20} Questions &bull; ${escapeHtml(theme.moduleName || 'Exam Engine')}`
    : (hasExam
        ? (pCount > 0 ? `Words: ${wCount}, Phrases: ${pCount} &bull; ${examQ} Qs` : `Words: ${wCount}, Phrases: 0 &bull; ${examQ} Qs`)
        : `Words: ${wordsQ}, Phrases: ${phrasesQ}`);

  // Top Group: Header Line, Exam Title Line, Standard 12px Metadata Box
  const topBlock = `
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <!-- Line 1: Theme Code + Name + Readiness / Live Badge -->
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 8px; margin-bottom: 2px; line-height: 1.4;">
        <span style="font-size: 12px; font-weight: 800; color: ${color}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: 0.02em;">
          ${isNonVocab ? `<span style="color: ${color};">[EXAM]</span> ${escapeHtml(name)}` : `<span style="color: ${color};">${code}</span> - ${escapeHtml(name)}`}
        </span>
        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
          ${isLive ? `
            <span style="font-size: 12px; font-weight: 800; padding: 2px 6px; border-radius: 4px; ${isRemedial ? 'background:rgba(var(--grade-c-rgb),0.15); border:1px solid var(--grade-c); color:var(--grade-c, #fef08a);' : 'background:rgba(var(--grade-a-rgb),0.15); border:1px solid var(--grade-a); color:var(--grade-a, #86efac);'}">
              LIVE (${remainingMinutes}m)
            </span>
          ` : `
            <span style="font-size: 12px; font-weight: 800; padding: 2px 7px; border-radius: 4px; ${eligibleNormalCount === batchTotalStudents && batchTotalStudents > 0 ? 'background:rgba(var(--grade-a-rgb),0.15); color:var(--grade-a,#86efac); border:1px solid rgba(var(--grade-a-rgb),0.3);' : 'background:rgba(var(--grade-c-rgb),0.12); color:var(--grade-c,#fef08a); border:1px solid rgba(var(--grade-c-rgb),0.3);'}">
              ${eligibleNormalCount}/${batchTotalStudents} Ready (${readinessPct}%)
            </span>
          `}
        </div>
      </div>

      <!-- Line 2: Associated Exam Title -->
      <div style="font-size: 12px; font-weight: 700; color: #93c5fd; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1.3;">
        ${isLive ? `${examTitleStr} &bull; ${escapeHtml(liveBatchName || '')} (${enrolledCount})` : examTitleStr}
      </div>

      <!-- Line 3: Standard 12px Metadata Box -->
      <div style="background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 6px; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; line-height: 1.5;">
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
          <span style="color: #94a3b8; font-weight: 500;">Default Duration:</span>
          <span style="color: #ffffff; font-weight: 700;">${autoDur} mins</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
          <span style="color: #94a3b8; font-weight: 500;">Question Count:</span>
          <span style="color: #ffffff; font-weight: 700;">${questionCountStr}</span>
        </div>
      </div>
    </div>
  `;

  // Row 2: Primary Action Row
  let row2Content = '';
  if (isLive) {
    row2Content = `
      <div style="height:36px;">
        <button type="button" class="btn btn-wireframe-live-view btn-theme-live-monitor" data-theme="${code}">
          LIVE VIEW &bull; REALTIME MONITOR (${enrolledCount} STUDENTS)
        </button>
      </div>
    `;
  } else {
    row2Content = `
      <div class="card-block-row-buttons" style="display:flex; gap:10px;">
        <button type="button" class="btn btn-wireframe-normal btn-theme-open-session" data-theme="${code}" data-mode="normal" style="flex:1; border:1px solid rgba(var(--grade-a-rgb, 0, 192, 0), 0.75); color:#86efac; background:rgba(var(--grade-a-rgb, 0, 192, 0), 0.06); box-shadow:none;" title="Open Normal Session (Full Score) - ${eligibleNormalCount} Eligible">
          NORMAL (${eligibleNormalCount})
        </button>
        <button type="button" class="btn btn-wireframe-remidi ${eligibleRemedialCount === 0 ? 'btn-dimmed' : ''} btn-theme-open-session" data-theme="${code}" data-mode="remedial" style="flex:1; ${eligibleRemedialCount > 0 ? 'border:1px solid rgba(var(--grade-c-rgb, 255, 255, 0), 0.85); color:var(--grade-c); background:rgba(var(--grade-c-rgb, 255, 255, 0), 0.06); box-shadow:none;' : ''}" title="Open Remedial Session (Max 60%) - ${eligibleRemedialCount} Eligible" ${eligibleRemedialCount === 0 ? 'disabled' : ''}>
          REMEDI (${eligibleRemedialCount})
        </button>
      </div>
    `;
  }

  // Row 3: Secondary Action / Standby Box
  let row3Content = '';
  if (isLive) {
    const curWordsMode = theme.examTest?.payload?.test_session?.answering_modes?.words ||
                         theme.wordsTest?.payload?.test_session?.answering_modes?.words ||
                         theme.examTest?.payload?.test_session?.answering_mode || 'written';
    const curPhrasesMode = theme.examTest?.payload?.test_session?.answering_modes?.phrases ||
                           theme.phrasesTest?.payload?.test_session?.answering_modes?.phrases ||
                           'multiple_choice';

    row3Content = `
      <div class="card-block-row-buttons" style="position:relative; display:flex; gap:6px;">
        <button type="button" class="btn btn-wireframe-late btn-theme-add-late" data-theme="${code}" style="flex:1; border:1px solid rgba(var(--grade-a-rgb, 0, 192, 0), 0.75); color:#86efac; background:rgba(var(--grade-a-rgb, 0, 192, 0), 0.06); box-shadow:none; padding:4px 6px;" title="Add Late Arrival Students">
          +LATE
        </button>

        <!-- Edit Time Popover -->
        <div style="position:relative; flex:1; height:100%; display:flex;">
          <button type="button" class="btn btn-wireframe-edit-time btn-card-add-time" data-theme="${code}" style="width:100%; border:1px solid rgba(var(--grade-c-rgb, 255, 255, 0), 0.85); color:var(--grade-c); background:rgba(var(--grade-c-rgb, 255, 255, 0), 0.06); box-shadow:none; padding:4px 6px;" title="Edit Exam Time (+ / -)">
            TIME
          </button>
          <div id="card-add-time-menu-${code}" class="card-add-time-menu" style="display:none; position:absolute; left:50%; transform:translateX(-50%); bottom:calc(100% + 8px); background:#0f172a; border:2px solid var(--grade-c); border-radius:10px; box-shadow:0 16px 36px rgba(0,0,0,0.92), 0 0 14px rgba(var(--grade-c-rgb), 0.18); z-index:99999; width:220px; padding:8px; flex-direction:column; gap:6px;">
            <div style="background:var(--grade-c); color:#0f172a; font-weight:900; font-size: 12px; padding:5px 8px; border-radius:6px; text-transform:uppercase; letter-spacing:0.04em; display:flex; align-items:center; justify-content:space-between;">
              <span>EDIT TIME &bull; THEME ${code}</span>
              <span style="font-size: 12px; background:rgba(0,0,0,0.25); color:#0f172a; padding:1px 5px; border-radius:3px; font-weight:800;">SESSION</span>
            </div>

            <!-- Add Time (+) -->
            <div>
              <div style="font-size: 12px; font-weight:800; color:#86efac; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
                ADD TIME (+)
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                <button type="button" class="btn-card-add-time-opt" data-theme="${code}" data-mins="5" style="background:rgba(var(--grade-a-rgb), 0.08); border:1px solid rgba(var(--grade-a-rgb), 0.4); color:#86efac; padding:5px 6px; border-radius:5px; font-size: 12px; font-weight:700; cursor:pointer;">+5m</button>
                <button type="button" class="btn-card-add-time-opt" data-theme="${code}" data-mins="10" style="background:rgba(var(--grade-a-rgb), 0.08); border:1px solid rgba(var(--grade-a-rgb), 0.4); color:#86efac; padding:5px 6px; border-radius:5px; font-size: 12px; font-weight:700; cursor:pointer;">+10m</button>
                <button type="button" class="btn-card-add-time-opt" data-theme="${code}" data-mins="15" style="background:rgba(var(--grade-a-rgb), 0.08); border:1px solid rgba(var(--grade-a-rgb), 0.4); color:#86efac; padding:5px 6px; border-radius:5px; font-size: 12px; font-weight:700; cursor:pointer;">+15m</button>
                <button type="button" class="btn-card-add-time-opt" data-theme="${code}" data-mins="30" style="background:rgba(var(--grade-a-rgb), 0.08); border:1px solid rgba(var(--grade-a-rgb), 0.4); color:#86efac; padding:5px 6px; border-radius:5px; font-size: 12px; font-weight:700; cursor:pointer;">+30m</button>
              </div>
            </div>

            <!-- Reduce Time (-) -->
            <div>
              <div style="font-size: 12px; font-weight:800; color:#fca5a5; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px; display:flex; align-items:center; gap:4px;">
                REDUCE TIME (-)
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                <button type="button" class="btn-card-add-time-opt" data-theme="${code}" data-mins="-5" style="background:rgba(var(--grade-e-rgb), 0.08); border:1px solid rgba(var(--grade-e-rgb), 0.4); color:#fca5a5; padding:5px 6px; border-radius:5px; font-size: 12px; font-weight:700; cursor:pointer;">-5m</button>
                <button type="button" class="btn-card-add-time-opt" data-theme="${code}" data-mins="-10" style="background:rgba(var(--grade-e-rgb), 0.08); border:1px solid rgba(var(--grade-e-rgb), 0.4); color:#fca5a5; padding:5px 6px; border-radius:5px; font-size: 12px; font-weight:700; cursor:pointer;">-10m</button>
                <button type="button" class="btn-card-add-time-opt" data-theme="${code}" data-mins="-15" style="background:rgba(var(--grade-e-rgb), 0.08); border:1px solid rgba(var(--grade-e-rgb), 0.4); color:#fca5a5; padding:5px 6px; border-radius:5px; font-size: 12px; font-weight:700; cursor:pointer;">-15m</button>
                <button type="button" class="btn-card-add-time-opt" data-theme="${code}" data-mins="-30" style="background:rgba(var(--grade-e-rgb), 0.08); border:1px solid rgba(var(--grade-e-rgb), 0.4); color:#fca5a5; padding:5px 6px; border-radius:5px; font-size: 12px; font-weight:700; cursor:pointer;">-30m</button>
              </div>
            </div>

            <button type="button" class="btn-card-add-time-custom" data-theme="${code}" style="width:100%; text-align:center; background:rgba(var(--grade-c-rgb), 0.07); border:1px dashed rgba(var(--grade-c-rgb), 0.5); color:var(--grade-c); padding:6px 8px; border-radius:6px; font-size: 12px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:5px; margin-top:2px;">
              Custom Minutes (+ / -)...
            </button>
          </div>
        </div>

        <!-- Live Modality Switch Popover -->
        <div style="position:relative; flex:1; height:100%; display:flex;">
          <button type="button" class="btn btn-wireframe-edit-mode btn-card-edit-mode" data-theme="${code}" style="width:100%; border:1px solid rgba(56, 189, 248, 0.85); color:#38bdf8; background:rgba(56, 189, 248, 0.06); box-shadow:none; padding:4px 6px;" title="Live Modality Switch (Written / Selection / Spoken)">
            MODE
          </button>
          <div id="card-edit-mode-menu-${code}" class="card-edit-mode-menu" style="display:none; position:absolute; left:50%; transform:translateX(-50%); bottom:calc(100% + 8px); background:#0f172a; border:2px solid #38bdf8; border-radius:10px; box-shadow:0 16px 36px rgba(0,0,0,0.92), 0 0 14px rgba(56, 189, 248, 0.25); z-index:99999; width:230px; padding:8px; flex-direction:column; gap:6px;">
            <div style="background:#38bdf8; color:#0f172a; font-weight:900; font-size:12px; padding:5px 8px; border-radius:6px; text-transform:uppercase; letter-spacing:0.04em; display:flex; align-items:center; justify-content:space-between;">
              <span>LIVE MODALITY &bull; THEME ${code}</span>
              <span style="font-size:10px; background:rgba(0,0,0,0.25); color:#0f172a; padding:1px 5px; border-radius:3px; font-weight:800;">AUTO NEXT</span>
            </div>

            <!-- Words Module Selection -->
            <div>
              <div style="font-size:11px; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:3px; display:flex; justify-content:space-between;">
                <span>Words Module</span>
                <span id="label-live-words-${code}" style="color:#ffffff; font-weight:700;">${curWordsMode}</span>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:3px;">
                <button type="button" class="btn-live-mode-opt" data-theme="${code}" data-section="words" data-mode="written" style="background:${curWordsMode === 'written' ? '#38bdf8' : 'rgba(56, 189, 248, 0.1)'}; color:${curWordsMode === 'written' ? '#0f172a' : '#cbd5e1'}; border:1px solid #38bdf8; padding:4px 2px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;">Written</button>
                <button type="button" class="btn-live-mode-opt" data-theme="${code}" data-section="words" data-mode="multiple_choice" style="background:${curWordsMode === 'multiple_choice' ? '#38bdf8' : 'rgba(56, 189, 248, 0.1)'}; color:${curWordsMode === 'multiple_choice' ? '#0f172a' : '#cbd5e1'}; border:1px solid #38bdf8; padding:4px 2px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;">Select</button>
                <button type="button" class="btn-live-mode-opt" data-theme="${code}" data-section="words" data-mode="spoken" style="background:${curWordsMode === 'spoken' ? '#38bdf8' : 'rgba(56, 189, 248, 0.1)'}; color:${curWordsMode === 'spoken' ? '#0f172a' : '#cbd5e1'}; border:1px solid #38bdf8; padding:4px 2px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;">Spoken</button>
              </div>
            </div>

            <!-- Phrases Module Selection -->
            <div>
              <div style="font-size:11px; font-weight:800; color:var(--quad-d); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:3px; display:flex; justify-content:space-between;">
                <span>Phrases Module</span>
                <span id="label-live-phrases-${code}" style="color:#ffffff; font-weight:700;">${curPhrasesMode}</span>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:3px;">
                <button type="button" class="btn-live-mode-opt" data-theme="${code}" data-section="phrases" data-mode="written" style="background:${curPhrasesMode === 'written' ? 'var(--quad-d)' : 'rgba(192, 132, 252, 0.1)'}; color:${curPhrasesMode === 'written' ? '#0f172a' : '#cbd5e1'}; border:1px solid var(--quad-d); padding:4px 2px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;">Written</button>
                <button type="button" class="btn-live-mode-opt" data-theme="${code}" data-section="phrases" data-mode="multiple_choice" style="background:${curPhrasesMode === 'multiple_choice' ? 'var(--quad-d)' : 'rgba(192, 132, 252, 0.1)'}; color:${curPhrasesMode === 'multiple_choice' ? '#0f172a' : '#cbd5e1'}; border:1px solid var(--quad-d); padding:4px 2px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;">Select</button>
                <button type="button" class="btn-live-mode-opt" data-theme="${code}" data-section="phrases" data-mode="spoken" style="background:${curPhrasesMode === 'spoken' ? 'var(--quad-d)' : 'rgba(192, 132, 252, 0.1)'}; color:${curPhrasesMode === 'spoken' ? '#0f172a' : '#cbd5e1'}; border:1px solid var(--quad-d); padding:4px 2px; border-radius:4px; font-size:11px; font-weight:800; cursor:pointer;">Spoken</button>
              </div>
            </div>

            <div style="font-size:10px; color:#94a3b8; text-align:center; margin-top:2px; line-height:1.2;">
              Updates instantly on student's next question
            </div>
          </div>
        </div>

        <!-- Close Session -->
        <button type="button" class="btn btn-wireframe-close btn-theme-close-session" data-theme="${code}" style="flex:1; border:1px solid rgba(var(--grade-e-rgb, 255, 0, 0), 0.75); color:#fca5a5; background:rgba(var(--grade-e-rgb, 255, 0, 0), 0.06); box-shadow:none; padding:4px 6px;" title="Close Active Exam Session">
          CLOSE
        </button>
      </div>
    `;
  } else {
    row3Content = `
      <div class="box-wireframe-standby">
        STANDBY &bull; AWAITING UNLOCK
      </div>
    `;
  }

  return `
    <div class="theme-test-card-frame" style="height:250px !important; min-height:250px !important; max-height:250px !important; padding:12px 14px !important; box-sizing:border-box !important; border:1px solid ${borderRgba} !important; background:#0f172a !important; border-radius:8px !important; display:flex !important; flex-direction:column !important; justify-content:space-between !important; overflow:hidden !important;">
      <div class="theme-test-card-inner" style="height:100% !important; display:flex !important; flex-direction:column !important; justify-content:space-between !important; background:transparent !important; border:none !important; padding:0 !important; overflow:hidden !important;">
        ${topBlock}
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${row2Content}
          ${row3Content}
        </div>
      </div>
    </div>
  `;
}

/**
 * Event binding and interactive modal controller
 */
function bindTestSessionsEvents(container, themesData, context) {
  const { allStudents = [], allAttempts = [], batchMap = {} } = context;

  // 1. Batch Selection Toolbar
  const batchSelect = container.querySelector('#test-session-batch-select');
  batchSelect?.addEventListener('change', (e) => {
    _selectedBatchId = e.target.value;
    window._testSessionsAnalyticsCache = null;
    try {
      localStorage.setItem('topscore_active_test_batch', _selectedBatchId);
    } catch(err) {}
    renderClassTestSessions(container, context);
  });

  // Matrix now shows all themes simultaneously (no filter dropdown)

  // Refresh status
  container.querySelector('#btn-refresh-test-sessions')?.addEventListener('click', () => {
    window._testSessionsAnalyticsCache = null;
    if (window.renderClassHub) {
      window.renderClassHub(document.getElementById('admin-content-area'));
    }
  });

  // 2. Open Session Triggers
  container.querySelectorAll('.btn-theme-open-session').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const themeCode = e.currentTarget.getAttribute('data-theme');
      const mode = e.currentTarget.getAttribute('data-mode') || 'normal';
      const theme = themesData.find(t => t.code === themeCode);
      if (!theme) return;

      openThemeSessionModal(container, theme, mode, context);
    });
  });

  // 3. Add Late Student Triggers
  container.querySelectorAll('.btn-theme-add-late').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const themeCode = e.currentTarget.getAttribute('data-theme');
      const theme = themesData.find(t => t.code === themeCode);
      if (!theme) return;

      openThemeLateModal(container, theme, context);
    });
  });

  // 3b. Live Monitor Triggers
  container.querySelectorAll('.btn-theme-live-monitor').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const themeCode = e.currentTarget.getAttribute('data-theme');
      const theme = themesData.find(t => t.code === themeCode);
      if (!theme) return;

      openThemeLiveMonitorModal(container, theme, context);
    });
  });

  // 3c. Card Direct Extend Time Triggers ('Di Luar')
  container.querySelectorAll('.btn-card-add-time').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const themeCode = e.currentTarget.getAttribute('data-theme');
      const menu = container.querySelector(`#card-add-time-menu-${themeCode}`);
      if (!menu) return;

      // Close all other menus first
      container.querySelectorAll('.card-add-time-menu').forEach(m => {
        if (m !== menu) m.style.display = 'none';
      });

      // Toggle current menu
      menu.style.display = (menu.style.display === 'flex' || menu.style.display === 'block') ? 'none' : 'flex';
    });
  });

  // Close menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.btn-card-add-time') && !e.target.closest('.card-add-time-menu')) {
      container.querySelectorAll('.card-add-time-menu').forEach(m => {
        m.style.display = 'none';
      });
    }
  });

  // Quick preset buttons (+5, +10, +15, +30, -5, -10, -15, -30)
  container.querySelectorAll('.btn-card-add-time-opt').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const themeCode = e.currentTarget.getAttribute('data-theme');
      const mins = parseInt(e.currentTarget.getAttribute('data-mins'), 10);
      const theme = themesData.find(t => t.code === themeCode);
      if (!theme || isNaN(mins) || mins === 0) return;

      // Close menu
      const menu = container.querySelector(`#card-add-time-menu-${themeCode}`);
      if (menu) menu.style.display = 'none';

      const actionText = mins > 0 ? `extended by +${mins} minutes` : `reduced by ${Math.abs(mins)} minutes`;
      showLoading();
      try {
        const promises = [];
        if (theme.examTest) promises.push(extendTestSessionTime(theme.examTest.id, mins));
        if (theme.wordsTest && (!theme.examTest || theme.wordsTest.id !== theme.examTest.id)) promises.push(extendTestSessionTime(theme.wordsTest.id, mins));
        if (theme.phrasesTest && (!theme.examTest || theme.phrasesTest.id !== theme.examTest.id)) promises.push(extendTestSessionTime(theme.phrasesTest.id, mins));
        await Promise.all(promises);

        const targetName = theme.isNonVocab ? theme.name : `Theme ${theme.code}`;
        showToast(`Exam timer for ${targetName} successfully ${actionText}!`, 'success');
        if (window.renderClassHub) {
          window.renderClassHub(document.getElementById('admin-content-area'));
        }
      } catch (err) {
        console.error('Error adjusting session time from card:', err);
        showToast('Failed to adjust exam timer: ' + err.message, 'error');
      } finally {
        hideLoading();
      }
    });
  });

  // Custom minute button (+ / -)
  container.querySelectorAll('.btn-card-add-time-custom').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const themeCode = e.currentTarget.getAttribute('data-theme');
      const theme = themesData.find(t => t.code === themeCode);
      if (!theme) return;

      // Close menu
      const menu = container.querySelector(`#card-add-time-menu-${themeCode}`);
      if (menu) menu.style.display = 'none';

      const targetLabel = theme.isNonVocab ? theme.name : `Theme ${theme.code}`;
      const input = prompt(
        `Adjust exam time for ${targetLabel}:\n` +
        `• Enter a positive number to extend (e.g. 15 or +15)\n` +
        `• Enter a negative number to reduce (e.g. -10)\n` +
        `Allowed range: -180 to +180 minutes (cannot be 0).`,
        '10'
      );
      if (input === null) return;
      const cleanInput = input.trim();
      const mins = parseInt(cleanInput, 10);
      if (isNaN(mins) || mins === 0 || mins < -180 || mins > 180) {
        showToast('Invalid minutes (enter a number between -180 and +180, non-zero)', 'warning');
        return;
      }

      const actionText = mins > 0 ? `extended by +${mins} minutes` : `reduced by ${Math.abs(mins)} minutes`;
      showLoading();
      try {
        const promises = [];
        if (theme.examTest) promises.push(extendTestSessionTime(theme.examTest.id, mins));
        if (theme.wordsTest && (!theme.examTest || theme.wordsTest.id !== theme.examTest.id)) promises.push(extendTestSessionTime(theme.wordsTest.id, mins));
        if (theme.phrasesTest && (!theme.examTest || theme.phrasesTest.id !== theme.examTest.id)) promises.push(extendTestSessionTime(theme.phrasesTest.id, mins));
        await Promise.all(promises);

        showToast(`Exam timer for ${targetLabel} successfully ${actionText}!`, 'success');
        if (window.renderClassHub) {
          window.renderClassHub(document.getElementById('admin-content-area'));
        }
      } catch (err) {
        console.error('Error adjusting session time from card:', err);
        showToast('Failed to adjust exam timer: ' + err.message, 'error');
      } finally {
        hideLoading();
      }
    });
  });

  // 3d. Card Direct Edit Modality Triggers (Live Answering Mode Switch)
  container.querySelectorAll('.btn-card-edit-mode').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const themeCode = e.currentTarget.getAttribute('data-theme');
      const menu = container.querySelector(`#card-edit-mode-menu-${themeCode}`);
      if (!menu) return;

      // Close all other menus first
      container.querySelectorAll('.card-add-time-menu, .card-edit-mode-menu').forEach(m => {
        if (m !== menu) m.style.display = 'none';
      });

      menu.style.display = (menu.style.display === 'flex' || menu.style.display === 'block') ? 'none' : 'flex';
    });
  });

  // Close modality menus when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.btn-card-edit-mode') && !e.target.closest('.card-edit-mode-menu')) {
      container.querySelectorAll('.card-edit-mode-menu').forEach(m => {
        m.style.display = 'none';
      });
    }
  });

  // Quick live mode opt buttons
  container.querySelectorAll('.btn-live-mode-opt').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const themeCode = e.currentTarget.getAttribute('data-theme');
      const section = e.currentTarget.getAttribute('data-section');
      const mode = e.currentTarget.getAttribute('data-mode');
      const theme = themesData.find(t => t.code === themeCode);
      if (!theme || !section || !mode) return;

      const examTest = theme.examTest || theme.wordsTest || theme.phrasesTest;
      if (!examTest) return;

      const currentSession = examTest.payload?.test_session || {};
      const currentModes = currentSession.answering_modes || {};

      const newWordsMode = section === 'words' ? mode : (currentModes.words || currentSession.answering_mode || 'written');
      const newPhrasesMode = section === 'phrases' ? mode : (currentModes.phrases || currentSession.answering_mode || 'written');

      showLoading();
      try {
        const promises = [];
        if (theme.examTest) {
          promises.push(updateLiveSessionModality({ testId: theme.examTest.id, wordsMode: newWordsMode, phrasesMode: newPhrasesMode }));
        }
        if (theme.wordsTest && (!theme.examTest || theme.wordsTest.id !== theme.examTest.id)) {
          promises.push(updateLiveSessionModality({ testId: theme.wordsTest.id, wordsMode: newWordsMode, phrasesMode: newPhrasesMode }));
        }
        if (theme.phrasesTest && (!theme.examTest || theme.phrasesTest.id !== theme.examTest.id)) {
          promises.push(updateLiveSessionModality({ testId: theme.phrasesTest.id, wordsMode: newWordsMode, phrasesMode: newPhrasesMode }));
        }
        await Promise.all(promises);

        const targetLabel = theme.isNonVocab ? theme.name : `Theme ${theme.code}`;
        const secLabel = section === 'words' ? 'Words' : 'Phrases';
        showToast(`Live modality for ${targetLabel} (${secLabel}) changed to ${mode.toUpperCase()}! Students will automatically switch on their next question.`, 'success');

        if (window.renderClassHub) {
          window.renderClassHub(document.getElementById('admin-content-area'));
        }
      } catch (err) {
        console.error('Error updating session modality:', err);
        showToast('Failed to update modality: ' + err.message, 'error');
      } finally {
        hideLoading();
      }
    });
  });

  // 4. Close Session Triggers
  container.querySelectorAll('.btn-theme-close-session').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const themeCode = e.currentTarget.getAttribute('data-theme');
      const theme = themesData.find(t => t.code === themeCode);
      if (!theme) return;

      const targetSessionLabel = theme.isNonVocab ? theme.name : `THEME ${theme.code} (${theme.name})`;
      const confirmed = confirm(`Close test session for ${targetSessionLabel} for ${theme.liveBatchName}?\nStudents will no longer be able to access the test once closed.`);
      if (!confirmed) return;

      showLoading();
      try {
        const promises = [];
        if (theme.examTest) promises.push(closeTestSession(theme.examTest.id));
        if (theme.wordsTest && (!theme.examTest || theme.wordsTest.id !== theme.examTest.id)) promises.push(closeTestSession(theme.wordsTest.id));
        if (theme.phrasesTest && (!theme.examTest || theme.phrasesTest.id !== theme.examTest.id)) promises.push(closeTestSession(theme.phrasesTest.id));
        await Promise.all(promises);

        showToast(`Test session "${theme.name}" closed successfully.`, 'success');
        if (window.renderClassHub) {
          window.renderClassHub(document.getElementById('admin-content-area'));
        }
      } catch (err) {
        console.error('Error closing test session:', err);
        showToast('Failed to close session: ' + err.message, 'error');
      } finally {
        hideLoading();
      }
    });
  });
}

/**
 * Open Modal: Buka Sesi Ujian (Normal / Remidi)
 */
function openThemeSessionModal(container, theme, mode, context) {
  _currentOpenModalTheme = theme;
  _currentOpenModalMode = mode;

  let modal = document.getElementById('modal-theme-open-session');
  if (!modal && container) {
    modal = container.querySelector('#modal-theme-open-session');
  }
  if (!modal) return;
  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }

  const titleEl = modal.querySelector('#open-modal-title');
  const badgeEl = modal.querySelector('#open-modal-theme-badge');
  const batchSelect = modal.querySelector('#open-modal-batch-select');
  const wordsModuleSelect = modal.querySelector('#open-modal-words-module-select');
  const phrasesModuleSelect = modal.querySelector('#open-modal-phrases-module-select');

  // Pre-populate selections from active session or previous settings if present
  const existingSessModes = theme.examTest?.payload?.test_session?.answering_modes ||
                            theme.wordsTest?.payload?.test_session?.answering_modes;
  const existingSessMode = theme.examTest?.payload?.test_session?.answering_mode ||
                           theme.wordsTest?.payload?.test_session?.answering_mode;

  if (wordsModuleSelect) {
    if (existingSessModes?.words) {
      wordsModuleSelect.value = existingSessModes.words;
    } else if (existingSessMode) {
      wordsModuleSelect.value = existingSessMode;
    }
  }
  if (phrasesModuleSelect) {
    if (existingSessModes?.phrases) {
      phrasesModuleSelect.value = existingSessModes.phrases;
    } else {
      phrasesModuleSelect.value = 'multiple_choice';
    }
  }

  let _selectedAnswerModeWords = wordsModuleSelect ? wordsModuleSelect.value : 'written';
  let _selectedAnswerModePhrases = phrasesModuleSelect ? phrasesModuleSelect.value : 'multiple_choice';

  const isNonVocab = Boolean(theme.isNonVocab);
  const vocabModulesRow = modal.querySelector('#open-modal-vocab-modules-row');
  const nonVocabDetailsRow = modal.querySelector('#open-modal-nonvocab-details-row');
  const durationInput = modal.querySelector('#open-modal-duration-input');
  if (durationInput) {
    delete durationInput.dataset.userSet;
    durationInput.addEventListener('input', () => { durationInput.dataset.userSet = '1'; });
    durationInput.addEventListener('change', () => { durationInput.dataset.userSet = '1'; });
  }

  // ── Auto-duration calculation (SSOT DECISION-063 Khusus Vocabulary Class) ────
  // Words: 10s spoken / 15s written / 10s selection
  // Phrases: 20s spoken / 10s selection / 20s written
  const recalcVocabDuration = () => {
    if (isNonVocab) return;
    const wordsAns = (_selectedAnswerModeWords || 'written').toLowerCase();
    const phrasesAns = (_selectedAnswerModePhrases || 'selection').toLowerCase();

    const wPace = (wordsAns === 'written') ? 15 : 10;
    const pPace = (phrasesAns === 'selection' || phrasesAns === 'multiple_choice') ? 10 : 20;

    const _examQ = theme.examTest?.total_questions || theme.examTest?.payload?.total_questions || (Array.isArray(theme.examTest?.questions) ? theme.examTest.questions.length : 0) || 0;
    let wCount = 0;
    let pCount = 0;

    const isUnified = theme.examTest?.payload?.is_unified || theme.examTest?.payload?.category === 'unified' || _examQ === 200;
    if (isUnified && _examQ > 0) {
      if (Array.isArray(theme.examTest?.payload?.questions) && theme.examTest.payload.questions.length > 0) {
        theme.examTest.payload.questions.forEach(q => {
          if (q.test_section === 'phrases' || q.category === 'phrases') pCount++;
          else wCount++;
        });
      }
      if (wCount === 0 && pCount === 0) {
        if (_examQ === 200) {
          wCount = 160;
          pCount = 40;
        } else if (_examQ === 50) {
          wCount = 40;
          pCount = 10;
        } else {
          pCount = Math.round(_examQ * 0.2);
          wCount = _examQ - pCount;
        }
      }
    } else if (theme.examTest) {
      const cat = (theme.examTest.payload?.category || theme.examTest.category || '').toLowerCase();
      if (cat === 'phrases') {
        pCount = _examQ;
      } else {
        wCount = _examQ;
      }
    } else {
      wCount = theme.wordsTest?.payload?.total_questions || theme.wordsTest?.total_questions || 0;
      pCount = theme.phrasesTest?.payload?.total_questions || theme.phrasesTest?.total_questions || 0;
    }

    const totalSeconds = (wCount * wPace) + (pCount * pPace);
    const autoDur = totalSeconds > 0
      ? Math.max(5, Math.ceil(totalSeconds / 60))
      : (theme.examTest?.working_duration_minutes || 45);

    const _suggEl = modal.querySelector('#open-modal-duration-suggestion-text');
    if (_suggEl) {
      const breakdownStr = pCount > 0
        ? `${wCount} Words @ ${wPace}s + ${pCount} Phrases @ ${pPace}s`
        : `${wCount} Questions @ ${wPace}s`;
      _suggEl.textContent = `Auto: ${autoDur} min (${breakdownStr})`;
    }

    if (durationInput && !durationInput.dataset.userSet) {
      durationInput.value = autoDur;
    }
  };

  if (wordsModuleSelect) {
    wordsModuleSelect.onchange = (e) => {
      _selectedAnswerModeWords = e.target.value;
      recalcVocabDuration();
    };
  }
  if (phrasesModuleSelect) {
    phrasesModuleSelect.onchange = (e) => {
      _selectedAnswerModePhrases = e.target.value;
      recalcVocabDuration();
    };
  }

  if (isNonVocab) {
    if (vocabModulesRow) vocabModulesRow.style.display = 'none';
    if (nonVocabDetailsRow) nonVocabDetailsRow.style.display = 'flex';
    const nonVocabTitleEl = modal.querySelector('#open-modal-nonvocab-exam-title');
    const nonVocabInfoEl = modal.querySelector('#open-modal-nonvocab-engine-info');
    if (nonVocabTitleEl) nonVocabTitleEl.textContent = (theme.examTest?.title || theme.name);
    const qCount = theme.examTest?.total_questions || theme.examTest?.payload?.total_questions || (Array.isArray(theme.examTest?.questions) ? theme.examTest.questions.length : 0) || (theme.totalQuestions || 20);
    const engName = theme.moduleName || 'Exam Engine';
    if (nonVocabInfoEl) nonVocabInfoEl.textContent = `${engName} • ${qCount} Questions`;

    const autoDur = theme.duration || 40;
    const _suggEl = modal.querySelector('#open-modal-duration-suggestion-text');
    if (_suggEl) _suggEl.textContent = `Default: ${autoDur} min`;
    if (durationInput && !durationInput.dataset.userSet) durationInput.value = autoDur;
  } else {
    // VOCABULARY CLASSES (both Unified Exam & separate Words/Phrases modules):
    // Answering module selectors (Written M3, Selection M2, Spoken M4) must always be visible!
    if (vocabModulesRow) vocabModulesRow.style.display = 'grid';
    if (nonVocabDetailsRow) nonVocabDetailsRow.style.display = 'none';

    // Calculate duration using modality-specific pacing SSOT
    recalcVocabDuration();
  }

  const confirmBtn = modal.querySelector('#btn-confirm-open-session');

  const sessionTypeLabel = mode === 'normal' ? 'EXAM SESSION' : 'REMEDIAL SESSION';
  if (titleEl) {
    titleEl.textContent = isNonVocab
      ? `${theme.name} • ${sessionTypeLabel}`.toUpperCase()
      : `THEME ${theme.code || 'A'} — ${theme.name || 'WORKPLACE'} • ${sessionTypeLabel}`.toUpperCase();
  }
  if (badgeEl) {
    badgeEl.style.display = 'none';
  }

  // Set selected batch
  if (_selectedBatchId) {
    batchSelect.value = _selectedBatchId;
  }

  // Clean student name helper: removes honorifics/titles (Mr., Miss, Mrs., Ms.)
  const cleanStudentName = (rawName) => {
    return String(rawName || 'Unnamed')
      .replace(/^(Mr\.|Miss|Mrs\.|Ms\.)\s+/i, '')
      .trim();
  };

  // State for student checklist inside modal
  let checkedStudentIds = new Set();
  let studentSearchQuery = '';
  let studentSortOrder = 'asc';
  let tutorOverrideActive = false;
  let hasInitializedSelection = false;

  const overrideCheckbox = modal.querySelector('#open-modal-override-checkbox');

  let lastEvaluatedStudents = [];

  const renderModalStudents = () => {
    const curBatchId = batchSelect.value;
    const batchStudents = (context.allStudents || []).filter(s => s.batch_id === curBatchId && !s.deleted_at && s.is_active !== false);

    // Evaluate eligibility
    const evaluated = evaluateStudentsEligibility({
      students: batchStudents,
      theme,
      themeTasks: theme.tasks,
      wordsTest: theme.wordsTest,
      phrasesTest: theme.phrasesTest,
      examTest: theme.examTest,
      classTests: context.classTests || [],
      allAttempts: context.allAttempts || [],
      mode
    });
    lastEvaluatedStudents = evaluated;

    const eligibleList = evaluated.filter(e => e.isEligible);

    // Tutor Override is strictly manual (never auto-activated) so prerequisites are always respected by default
    tutorOverrideActive = Boolean(overrideCheckbox && overrideCheckbox.checked);

    // Selectable condition:
    // If Tutor Override is active -> student is selectable (unless passed in Remedial mode)
    // If Tutor Override is inactive -> only eligible students are selectable
    const isStudentSelectable = (item) => {
      if (tutorOverrideActive) {
        return mode === 'normal' || !item.isAlreadyPassed;
      }
      return item.isEligible;
    };

    const selectableList = evaluated.filter(isStudentSelectable);

    // Initial check all selectable by default ONLY on first initialization
    if (!hasInitializedSelection && selectableList.length > 0) {
      selectableList.forEach(e => checkedStudentIds.add(e.student.id));
      hasInitializedSelection = true;
    }

    // Update count display in left panel
    const countEl = modal.querySelector('#open-modal-student-count');
    if (countEl) countEl.textContent = `Enrolled: ${checkedStudentIds.size} / ${selectableList.length} selected`;

    // ALL students from the batch are rendered in the table (zero hidden voids)
    let displayList = evaluated;
    const q = studentSearchQuery.trim().toLowerCase();
    if (q) {
      displayList = displayList.filter(e => {
        const raw = (e.student.name || '').toLowerCase();
        const clean = cleanStudentName(e.student.name).toLowerCase();
        return raw.includes(q) || clean.includes(q);
      });
    }

    // Sort by clean name
    displayList.sort((a, b) => {
      const nA = cleanStudentName(a.student.name);
      const nB = cleanStudentName(b.student.name);
      const cmp = nA.localeCompare(nB, undefined, { sensitivity: 'base', numeric: true });
      return studentSortOrder === 'asc' ? cmp : -cmp;
    });

    const tableBody = modal.querySelector('#open-modal-students-table-body');
    if (!tableBody) return;

    if (displayList.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="3" style="padding:24px 16px; text-align:center; color:#94a3b8; font-size:12px;">
            ${q ? `No students match "${escapeHtml(q)}".` : 'No students found in this batch.'}
          </td>
        </tr>
      `;
    } else {
      tableBody.innerHTML = displayList.map((item, idx) => {
        const s = item.student;
        const selectable = isStudentSelectable(item);
        const isChecked = checkedStudentIds.has(s.id) && selectable;
        const cleanName = cleanStudentName(s.name);

        let statusColor = 'var(--primary-tactical)';

        if (item.statusType === 'success' || item.isEligible) {
          statusColor = 'var(--grade-a)';
        } else if (item.statusType === 'amber' || item.statusType === 'warning') {
          statusColor = 'var(--grade-c)';
        } else if (item.statusType === 'danger') {
          statusColor = 'var(--grade-e)';
        }

        const disabledAttr = selectable ? '' : 'disabled';
        const cursorStyle = selectable ? 'cursor:pointer;' : 'cursor:not-allowed;';
        const tooltipTitle = selectable ? escapeHtml(cleanName) : `Ineligible: ${escapeHtml(item.reason || item.statusLabel)}. Check Tutor Override to enable.`;

        return `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.08); transition:background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'" title="${tooltipTitle}">
            <td style="padding:6px 6px; text-align:center; border-bottom:1px solid rgba(255,255,255,0.08); width:40px;">
              <label style="display:flex; align-items:center; justify-content:center; gap:10px; ${cursorStyle} margin:0;">
                <input type="checkbox" class="open-student-checkbox" value="${s.id}" ${isChecked ? 'checked' : ''} ${disabledAttr} style="width:15px; height:15px; accent-color:var(--primary-tactical); ${cursorStyle}">
                <span style="font-variant-numeric:tabular-nums; color:#94a3b8; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); font-size:12px;">${idx + 1}</span>
              </label>
            </td>
            <td style="padding:6px 10px; text-align:left; border-bottom:1px solid rgba(255,255,255,0.08); color:${selectable ? '#ffffff' : '#cbd5e1'}; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); font-size:12px; white-space:nowrap;">
              ${escapeHtml(cleanName)}
            </td>
            <td style="padding:6px 8px; text-align:right; border-bottom:1px solid rgba(255,255,255,0.08); font-size:12px; white-space:nowrap; width:215px;">
              <span style="font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); font-size:12px; letter-spacing:0.02em; color:${statusColor}; text-shadow:none;">
                ${escapeHtml(item.statusLabel)}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    }

    // Footer summary
    const summaryEl = modal.querySelector('#open-modal-footer-summary');
    if (summaryEl) {
      summaryEl.textContent = `Ready to unlock for ${checkedStudentIds.size} student${checkedStudentIds.size === 1 ? '' : 's'}`;
      summaryEl.style.color = '#ffffff';
      summaryEl.style.fontWeight = '700';
    }

    // Zero-selected button guard & dynamic confirm text (White Accent Invariant)
    if (confirmBtn) {
      const hasSelected = checkedStudentIds.size > 0;
      confirmBtn.disabled = !hasSelected;
      confirmBtn.textContent = hasSelected
        ? `Unlock for ${checkedStudentIds.size} Student${checkedStudentIds.size === 1 ? '' : 's'}`
        : 'Unlock Test Now';

      if (hasSelected) {
        confirmBtn.style.setProperty('background', 'var(--grade-a)', 'important');
        confirmBtn.style.setProperty('border', '1.5px solid var(--grade-a)', 'important');
        confirmBtn.style.setProperty('color', '#090D16', 'important');
        confirmBtn.style.setProperty('box-shadow', '0 0 14px rgba(0, 192, 0, 0.45)', 'important');
        confirmBtn.style.setProperty('cursor', 'pointer', 'important');
        confirmBtn.style.setProperty('opacity', '1', 'important');
        confirmBtn.removeAttribute('title');
      } else {
        confirmBtn.style.setProperty('background', 'rgba(255,255,255,0.08)', 'important');
        confirmBtn.style.setProperty('border', '1.5px solid rgba(255,255,255,0.15)', 'important');
        confirmBtn.style.setProperty('color', 'rgba(255,255,255,0.4)', 'important');
        confirmBtn.style.setProperty('box-shadow', 'none', 'important');
        confirmBtn.style.setProperty('cursor', 'not-allowed', 'important');
        confirmBtn.style.setProperty('opacity', '0.6', 'important');
        confirmBtn.title = 'Select at least 1 student to unlock test';
      }
    }
  };

  // Checkbox listener on table body
  modal.querySelector('#open-modal-students-table-body')?.addEventListener('change', (e) => {
    if (e.target.classList.contains('open-student-checkbox')) {
      if (e.target.checked) checkedStudentIds.add(e.target.value);
      else checkedStudentIds.delete(e.target.value);
      renderModalStudents();
    }
  });

  // Override checkbox listener
  if (overrideCheckbox) {
    overrideCheckbox.onchange = (e) => {
      overrideCheckbox.dataset.userInteracted = 'true';
      tutorOverrideActive = e.target.checked;
      // When override turned ON, auto-check all previously ineligible students
      if (tutorOverrideActive) {
        (lastEvaluatedStudents || []).forEach(e => {
          if (mode === 'normal' || !e.isAlreadyPassed) {
            checkedStudentIds.add(e.student.id);
          }
        });
      } else {
        // When override turned OFF, purge ineligible students from checked set
        (lastEvaluatedStudents || []).forEach(e => {
          if (!e.isEligible) {
            checkedStudentIds.delete(e.student.id);
          }
        });
      }
      renderModalStudents();
    };
  }

  // Batch changed
  batchSelect.onchange = () => {
    checkedStudentIds.clear();
    hasInitializedSelection = false;
    if (overrideCheckbox) delete overrideCheckbox.dataset.userInteracted;
    renderModalStudents();
  };

  // Search input
  const searchInput = modal.querySelector('#open-modal-student-search');
  if (searchInput) {
    searchInput.oninput = (e) => {
      studentSearchQuery = e.target.value;
      renderModalStudents();
    };
  }

  // Sort toggle
  const sortBtn = modal.querySelector('#btn-open-modal-sort');
  if (sortBtn) {
    sortBtn.onclick = () => {
      studentSortOrder = studentSortOrder === 'asc' ? 'desc' : 'asc';
      sortBtn.textContent = studentSortOrder === 'asc' ? 'A → Z' : 'Z → A';
      renderModalStudents();
    };
  }

  // Select all / deselect all
  const selectAllBtn = modal.querySelector('#btn-open-modal-select-all');
  if (selectAllBtn) {
    selectAllBtn.onclick = () => {
      hasInitializedSelection = true;
      (lastEvaluatedStudents || []).forEach(e => {
        const selectable = tutorOverrideActive ? (mode === 'normal' || !e.isAlreadyPassed) : e.isEligible;
        if (selectable) {
          checkedStudentIds.add(e.student.id);
        }
      });
      renderModalStudents();
    };
  }

  const deselectAllBtn = modal.querySelector('#btn-open-modal-deselect-all');
  if (deselectAllBtn) {
    deselectAllBtn.onclick = () => {
      checkedStudentIds.clear();
      hasInitializedSelection = true;
      renderModalStudents();
    };
  }

  // Safe removal / guard of ineligible toggle button
  const toggleIneligBtn = modal.querySelector('#btn-toggle-ineligible-view');
  if (toggleIneligBtn) {
    toggleIneligBtn.onclick = () => {
      const details = modal.querySelector('#open-modal-ineligible-details');
      if (details) {
        showIneligible = !showIneligible;
        details.classList.toggle('hidden', !showIneligible);
        toggleIneligBtn.textContent = showIneligible ? 'Hide Details' : 'View Details';
      }
    };
  }

  // Close handlers
  const closeModal = () => modal.classList.add('hidden');
  const closeBtn = modal.querySelector('#btn-close-open-modal');
  if (closeBtn) closeBtn.onclick = closeModal;
  const cancelBtn = modal.querySelector('#btn-cancel-open-modal');
  if (cancelBtn) cancelBtn.onclick = closeModal;

  // Confirm Unlock Session
  confirmBtn.onclick = async () => {
    const targetBatchId = batchSelect.value;
    if (!targetBatchId) {
      showToast('Please select a target batch first.', 'error');
      return;
    }

    const allowedStudentIds = Array.from(checkedStudentIds);
    if (allowedStudentIds.length === 0) {
      showToast('Please select at least 1 eligible student for the test.', 'warning');
      return;
    }

    const duration = parseInt(durationInput.value, 10) || 60;
    const isRemedial = (mode === 'remedial');
    const selectedWordsMode = wordsModuleSelect ? wordsModuleSelect.value : (_selectedAnswerModeWords || 'written');
    const selectedPhrasesMode = phrasesModuleSelect ? phrasesModuleSelect.value : (_selectedAnswerModePhrases || 'multiple_choice');

    showLoading();
    try {
      const promises = [];
      if (theme.examTest) {
        promises.push(openTestSession({
          testId: theme.examTest.id,
          batchId: targetBatchId,
          allocatedMinutes: duration,
          allowedStudentIds: allowedStudentIds,
          isRemedial: isRemedial,
          remedialStudentIds: isRemedial ? allowedStudentIds : [],
          answeringMode: theme.isNonVocab
            ? (theme.examTest.payload?.answering_mode || 'description')
            : selectedWordsMode,
          answeringModes: {
            words: selectedWordsMode,
            phrases: selectedPhrasesMode
          }
        }));
      }
      if (theme.wordsTest && (!theme.examTest || theme.wordsTest.id !== theme.examTest.id)) {
        promises.push(openTestSession({
          testId: theme.wordsTest.id,
          batchId: targetBatchId,
          allocatedMinutes: duration,
          allowedStudentIds: allowedStudentIds,
          isRemedial: isRemedial,
          remedialStudentIds: isRemedial ? allowedStudentIds : [],
          answeringMode: selectedWordsMode,
          answeringModes: {
            words: selectedWordsMode,
            phrases: selectedPhrasesMode
          }
        }));
      }
      if (theme.phrasesTest && (!theme.examTest || theme.phrasesTest.id !== theme.examTest.id)) {
        // Sequential prerequisite (Phrases requires Words Exam >= 60%) is dynamically enforced
        // on the student dashboard at test attempt time
        promises.push(openTestSession({
          testId: theme.phrasesTest.id,
          batchId: targetBatchId,
          allocatedMinutes: duration,
          allowedStudentIds: allowedStudentIds,
          isRemedial: isRemedial,
          remedialStudentIds: isRemedial ? allowedStudentIds : [],
          answeringMode: selectedPhrasesMode,
          answeringModes: {
            words: selectedWordsMode,
            phrases: selectedPhrasesMode
          }
        }));
      }

      if (promises.length === 0) {
        throw new Error(`No test modules found for ${theme.name || theme.code}.`);
      }

      await Promise.all(promises);

      const targetTitle = theme.isNonVocab ? theme.name : `Theme ${theme.code}`;
      showToast(`Test session "${targetTitle}" (${mode.toUpperCase()}) successfully opened for ${allowedStudentIds.length} students (${duration} mins)!`, 'success');
      closeModal();
      if (window.renderClassHub) {
        window.renderClassHub(document.getElementById('admin-content-area'));
      }
    } catch (err) {
      console.error('Error unlocking session:', err);
      showToast('Failed to open test session: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  };

  renderModalStudents();
  modal.classList.remove('hidden');
}

/**
 * Open Modal: Add Late Arrival Students to Running Session
 */
function openThemeLateModal(container, theme, context) {
  _currentLateModalTheme = theme;
  const modal = container.querySelector('#modal-theme-add-late');
  if (!modal) return;

  const titleEl = modal.querySelector('#late-modal-theme-title');
  const batchNameEl = modal.querySelector('#late-modal-batch-name');
  const remainingEl = modal.querySelector('#late-modal-remaining-time');
  const modeBadgeEl = modal.querySelector('#late-modal-mode-badge');
  const confirmBtn = modal.querySelector('#btn-confirm-add-late');

  const isNonVocab = Boolean(theme.isNonVocab);
  titleEl.textContent = isNonVocab
    ? `${(theme.name || 'EXAM').toUpperCase()} • LATE ARRIVAL`
    : `THEME ${theme.code || 'G'} — ${(theme.name || 'GENERAL').toUpperCase()} • LATE ARRIVAL`;
  batchNameEl.textContent = `${theme.liveBatchName || 'Batch'} • ${(theme.allowedStudentIds?.length || 0)} Enrolled`;
  remainingEl.textContent = `${theme.remainingMinutes || 0} Mins`;

  if (theme.isRemedial) {
    modeBadgeEl.style.background = 'rgba(255, 255, 0, 0.12)';
    modeBadgeEl.style.border = '1px solid var(--grade-c)';
    modeBadgeEl.style.color = 'var(--grade-c)';
    modeBadgeEl.textContent = 'REMEDIAL SESSION';
  } else {
    modeBadgeEl.style.background = 'rgba(0, 192, 0, 0.12)';
    modeBadgeEl.style.border = '1px solid var(--grade-a)';
    modeBadgeEl.style.color = 'var(--grade-a)';
    modeBadgeEl.textContent = 'EXAM SESSION';
  }

  // Filter ONLY unenrolled batch students who are eligible!
  const targetBatchId = theme.liveBatchId;
  const batchStudents = (context.allStudents || []).filter(s => s.batch_id === targetBatchId && !s.deleted_at && s.is_active !== false);
  const enrolledSet = new Set(theme.allowedStudentIds || []);

  // Exclude enrolled students completely!
  const unenrolledStudents = batchStudents.filter(s => !enrolledSet.has(s.id));

  // Evaluate eligibility for the session mode
  const mode = theme.isRemedial ? 'remedial' : 'normal';
  const evaluated = evaluateStudentsEligibility({
    students: unenrolledStudents,
    theme,
    themeTasks: theme.tasks,
    wordsTest: theme.wordsTest,
    phrasesTest: theme.phrasesTest,
    examTest: theme.examTest,
    classTests: context.classTests || [],
    allAttempts: context.allAttempts || [],
    mode
  });

  const eligibleLateList = evaluated.filter(e => e.isEligible);

  let checkedLateIds = new Set();
  let lateSearchQuery = '';
  let lateOverrideActive = false;

  const lateOverrideCheckbox = modal.querySelector('#late-modal-override-checkbox');
  if (lateOverrideCheckbox) {
    lateOverrideCheckbox.checked = false;
    lateOverrideCheckbox.onchange = () => {
      lateOverrideActive = lateOverrideCheckbox.checked;
      renderLateList();
    };
  }

  const renderLateList = () => {
    let list = lateOverrideActive ? evaluated : eligibleLateList;
    const q = lateSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(e => {
        const raw = (e.student.name || '').toLowerCase();
        const clean = cleanStudentName(e.student.name).toLowerCase();
        return raw.includes(q) || clean.includes(q);
      });
    }

    list.sort((a, b) => {
      const nA = cleanStudentName(a.student.name);
      const nB = cleanStudentName(b.student.name);
      return nA.localeCompare(nB, undefined, { sensitivity: 'base', numeric: true });
    });

    const selectedCountEl = modal.querySelector('#late-modal-selected-count');
    if (selectedCountEl) selectedCountEl.textContent = String(checkedLateIds.size);

    const tableBody = modal.querySelector('#late-modal-students-table-body');
    if (!tableBody) return;

    if (list.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="3" style="padding:24px 16px; text-align:center; color:#94a3b8; font-size:12px;">
            ${q ? `No students match "${escapeHtml(q)}".` : 'All eligible students in this batch are already enrolled in the test.'}
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = list.map((item, idx) => {
      const s = item.student;
      const isChecked = checkedLateIds.has(s.id);
      const cleanName = cleanStudentName(s.name);

      let statusColor = 'var(--primary-tactical)';
      if (item.statusType === 'success' || item.isEligible) {
        statusColor = 'var(--grade-a)';
      } else if (item.statusType === 'amber' || item.statusType === 'warning') {
        statusColor = 'var(--grade-c)';
      } else if (item.statusType === 'danger' || !item.isEligible) {
        statusColor = 'var(--grade-e)';
      }

      return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.08); transition:background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'">
          <td style="padding:6px 6px; text-align:center; border-bottom:1px solid rgba(255,255,255,0.08); width:40px;">
            <label style="display:flex; align-items:center; justify-content:center; gap:10px; cursor:pointer; margin:0;">
              <input type="checkbox" class="late-student-checkbox" value="${s.id}" ${isChecked ? 'checked' : ''} style="width:15px; height:15px; accent-color:var(--primary-tactical); cursor:pointer;">
              <span style="font-variant-numeric:tabular-nums; color:#94a3b8; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); font-size:12px;">${idx + 1}</span>
            </label>
          </td>
          <td style="padding:6px 10px; text-align:left; border-bottom:1px solid rgba(255,255,255,0.08); color:#ffffff; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); font-size:12px; white-space:nowrap;">
            ${escapeHtml(cleanName)}
          </td>
          <td style="padding:6px 8px; text-align:right; border-bottom:1px solid rgba(255,255,255,0.08); font-size:12px; white-space:nowrap; width:215px;">
            <span style="font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); font-size:12px; letter-spacing:0.02em; color:${statusColor}; text-shadow:none;">
              ${escapeHtml(item.statusLabel)}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  };

  const tableBodyEl = modal.querySelector('#late-modal-students-table-body');
  if (tableBodyEl) {
    tableBodyEl.onchange = (e) => {
      if (e.target.classList.contains('late-student-checkbox')) {
        if (e.target.checked) checkedLateIds.add(e.target.value);
        else checkedLateIds.delete(e.target.value);
        const selectedCountEl = modal.querySelector('#late-modal-selected-count');
        if (selectedCountEl) selectedCountEl.textContent = String(checkedLateIds.size);
      }
    };
  }

  modal.querySelector('#late-modal-search').oninput = (e) => {
    lateSearchQuery = e.target.value;
    renderLateList();
  };

  modal.querySelector('#btn-late-modal-select-all').onclick = () => {
    const listToSelect = lateOverrideActive ? evaluated : eligibleLateList;
    listToSelect.forEach(e => checkedLateIds.add(e.student.id));
    renderLateList();
  };

  modal.querySelector('#btn-late-modal-deselect-all').onclick = () => {
    checkedLateIds.clear();
    renderLateList();
  };

  const closeModal = () => modal.classList.add('hidden');
  modal.querySelector('#btn-cancel-late-modal').onclick = closeModal;

  confirmBtn.onclick = async () => {
    const studentIds = Array.from(checkedLateIds);
    if (studentIds.length === 0) {
      showToast('Please select at least 1 late arrival student to add.', 'warning');
      return;
    }

    const isRem = theme.isRemedial;
    showLoading();
    try {
      const promises = [];
      if (theme.examTest) {
        promises.push(addLateStudentsToSession({
          testId: theme.examTest.id,
          studentIds: studentIds,
          remedialStudentIds: isRem ? studentIds : []
        }));
      }
      if (theme.wordsTest && (!theme.examTest || theme.wordsTest.id !== theme.examTest.id)) {
        promises.push(addLateStudentsToSession({
          testId: theme.wordsTest.id,
          studentIds: studentIds,
          remedialStudentIds: isRem ? studentIds : []
        }));
      }
      if (theme.phrasesTest && (!theme.examTest || theme.phrasesTest.id !== theme.examTest.id)) {
        promises.push(addLateStudentsToSession({
          testId: theme.phrasesTest.id,
          studentIds: studentIds,
          remedialStudentIds: isRem ? studentIds : []
        }));
      }

      await Promise.all(promises);

      const targetTitle = theme.isNonVocab ? theme.name : `Theme ${theme.code}`;
      showToast(`Successfully added ${studentIds.length} late student(s) to ${targetTitle}! (${isRem ? 'Status: REMEDIAL' : 'Status: NORMAL'})`, 'success');
      closeModal();
      if (window.renderClassHub) {
        window.renderClassHub(document.getElementById('admin-content-area'));
      }
    } catch (err) {
      console.error('Error adding late students:', err);
      showToast('Failed to add late arrival students: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  };

  renderLateList();
  modal.classList.remove('hidden');
}

let _livePollingTimer = null;
let _liveSecondCountdownTimer = null;
let _liveMonitorActiveFilter = 'all';
let _liveMonitorSearchQuery = '';

/**
 * Open Modal: Live Test Session Monitor & Student Controller
 */
/**
 * Open Modal: Live Test Session Monitor & Student Controller
 */
async function openThemeLiveMonitorModal(container, theme, context) {
  const modal = container.querySelector('#modal-theme-live-monitor');
  if (!modal) return;

  if (_livePollingTimer) {
    clearInterval(_livePollingTimer);
    _livePollingTimer = null;
  }
  if (_liveSecondCountdownTimer) {
    clearInterval(_liveSecondCountdownTimer);
    _liveSecondCountdownTimer = null;
  }

  // Header Elements
  const themeBadgeEl = modal.querySelector('#live-modal-theme-badge');
  const titleEl = modal.querySelector('#live-modal-title');
  const subtitleEl = modal.querySelector('#live-modal-subtitle');
  const modeBadgeEl = modal.querySelector('#live-modal-mode-badge');
  const remainingEl = modal.querySelector('#live-modal-remaining');
  const studentsContainer = modal.querySelector('#live-modal-students-container');
  const tableBody = modal.querySelector('#live-modal-table-body') || studentsContainer;
  const autoPollCheckbox = modal.querySelector('#live-modal-auto-poll');
  const searchInput = modal.querySelector('#live-modal-search');
  const refreshBtn = modal.querySelector('#btn-live-modal-refresh');
  const footerInfoEl = modal.querySelector('#live-modal-footer-info');

  if (themeBadgeEl) {
    themeBadgeEl.textContent = theme.isNonVocab ? 'Exam' : `Theme ${theme.code}`;
  }

  titleEl.innerHTML = theme.isNonVocab
    ? `${(theme.name || 'EXAM').toUpperCase()} • LIVE MONITOR`
    : `THEME ${theme.code || 'G'} — ${(theme.name || 'EXAM').toUpperCase()} • LIVE MONITOR`;
  const modLabel = theme.isNonVocab
    ? (theme.moduleName || 'Exam Engine')
    : ((theme.wordsTest && theme.phrasesTest) ? 'Words & Phrases Modules' : (theme.wordsTest ? 'Words Module' : (theme.phrasesTest ? 'Phrases Module' : 'Tasks Module')));
  subtitleEl.textContent = `${theme.name} Test • ${theme.liveBatchName || 'Batch'} • ${modLabel}`;

  if (modeBadgeEl) {
    if (theme.isRemedial) {
      modeBadgeEl.className = 'btn btn-session-mode mode-remedial';
      modeBadgeEl.textContent = 'REMEDIAL (MAX 60%)';
      modeBadgeEl.style.borderColor = 'rgba(255,255,0,0.4)';
      modeBadgeEl.style.background = 'rgba(255,255,0,0.08)';
      modeBadgeEl.style.color = 'var(--grade-c)';
    } else {
      modeBadgeEl.className = 'btn btn-session-mode mode-normal';
      modeBadgeEl.textContent = 'NORMAL (FULL SCORE)';
      modeBadgeEl.style.borderColor = 'rgba(0,192,0,0.4)';
      modeBadgeEl.style.background = 'rgba(0,192,0,0.08)';
      modeBadgeEl.style.color = 'var(--grade-a)';
    }
  }

  // 1-Second Live Countdown Ticker
  const nonVocabAutoClose = theme.examTest?.payload?.test_session?.auto_close_at;
  const targetEndMs = (nonVocabAutoClose || theme.wordsTest?.payload?.test_session?.auto_close_at || theme.phrasesTest?.payload?.test_session?.auto_close_at)
    ? new Date(nonVocabAutoClose || theme.wordsTest?.payload?.test_session?.auto_close_at || theme.phrasesTest?.payload?.test_session?.auto_close_at).getTime()
    : Date.now() + (theme.remainingMinutes || 60) * 60000;

  const updateRemainingDisplay = () => {
    const diffMs = targetEndMs - Date.now();
    if (diffMs <= 0) {
      remainingEl.innerHTML = '<span style="color:var(--grade-e); font-weight:800;">EXPIRED</span>';
    } else {
      const mins = Math.floor(diffMs / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      remainingEl.innerHTML = `<span style="color:#ffffff; font-weight:800;">${mins}m ${secs < 10 ? '0' : ''}${secs}s</span>`;
    }
  };
  updateRemainingDisplay();
  _liveSecondCountdownTimer = setInterval(updateRemainingDisplay, 1000);
  if (searchInput) searchInput.value = '';
  _liveMonitorSearchQuery = '';
  _liveMonitorActiveFilter = 'all';
  let _liveSortKey = 'alarm';
  let _liveSortDirection = 'desc';

  // Attach header sort click listeners
  modal.querySelectorAll('.sortable-th').forEach(th => {
    th.onclick = (e) => {
      const key = e.currentTarget.getAttribute('data-sort-key');
      if (_liveSortKey === key) {
        _liveSortDirection = _liveSortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        _liveSortKey = key;
        _liveSortDirection = (key === 'name') ? 'asc' : 'desc';
      }
      renderLiveMonitorUI();
    };
  });

  let processedStudents = [];
  let _realtimeChannel = null;
  let _realtimeDebounce = null;

  // Question count reference per Theme (cumulative vault sizes)
  const THEME_EXPECTED_COUNTS = {
    'A': { words: 120, phrases: 30 },
    'B': { words: 280, phrases: 70 },
    'C': { words: 480, phrases: 120 },
    'D': { words: 640, phrases: 160 }
  };

  function countCorrectAnswers(answersList) {
    let count = 0;
    (answersList || []).forEach(ans => {
      if (ans.is_correct === true || (ans.score != null && ans.score >= 1)) {
        count++;
        return;
      }
      const val = (ans.student_answer || '').trim().toLowerCase();
      if (!val) return;
      let accepted = ans.accepted_answers_snapshot || [];
      if (typeof accepted === 'string') {
        try { accepted = JSON.parse(accepted); } catch { accepted = []; }
      }
      if (!Array.isArray(accepted) && typeof accepted === 'string') {
        accepted = [accepted];
      }
      const correctSnap = String(ans.correct_answer_snapshot || '').split(/[;/|,]/).map(s => s.trim().toLowerCase()).filter(Boolean);
      const acceptedClean = (accepted || []).flatMap(s => String(s).split(/[;/|,]/)).map(s => s.trim().toLowerCase()).filter(Boolean);
      const allValid = [...new Set([...correctSnap, ...acceptedClean])];
      if (allValid.includes(val)) {
        count++;
      }
    });
    return count;
  }

  async function loadLiveData(silent = false) {
    if (!silent) {
      studentsContainer.innerHTML = (typeof window !== 'undefined' && typeof window.getLoadingStateHtml === 'function')
        ? window.getLoadingStateHtml('Fetching live student status, answer progression, & alarms...')
        : `
          <div class="topscore-loading-center" style="min-height: 140px !important;">
            <div class="spinner"></div>
            <p class="loading-text">Fetching live student status, answer progression, & alarms...</p>
          </div>
        `;
    }

    try {
      const testIds = [theme.examTest?.id, theme.wordsTest?.id, theme.phrasesTest?.id].filter(Boolean);
      const studentIds = theme.allowedStudentIds || [];
      const sessionData = await fetchLiveTestSessionData({
        testIds,
        studentIds,
        unlockedAt: theme.unlockedAt
      });

      const allStudents = context.allStudents || [];
      const enrolledStudents = allStudents.filter(s => studentIds.includes(s.id) && !s.deleted_at && s.is_active !== false);

      const themeCodeUpper = (theme.code || 'B').toUpperCase();
      const themeCounts = THEME_EXPECTED_COUNTS[themeCodeUpper] || { words: 280, phrases: 70 };

      // Helper to prioritize in_progress attempts, then newest created_at / started_at DESC
      const getActiveOrLatestAttempt = (attempts, testId) => {
        if (!testId || !attempts || attempts.length === 0) return null;
        const matching = attempts.filter(a => a.test_id === testId);
        if (matching.length === 0) return null;
        matching.sort((a, b) => {
          if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
          if (b.status === 'in_progress' && a.status !== 'in_progress') return 1;
          const timeA = new Date(a.created_at || a.started_at || 0).getTime();
          const timeB = new Date(b.created_at || b.started_at || 0).getTime();
          return timeB - timeA;
        });
        return matching[0];
      };

      processedStudents = enrolledStudents.map(student => {
        const studAttempts = (sessionData.attempts || []).filter(a => a.student_id === student.id);
        const wAtt = getActiveOrLatestAttempt(studAttempts, theme.wordsTest?.id);
        const pAtt = getActiveOrLatestAttempt(studAttempts, theme.phrasesTest?.id);
        const exAtt = getActiveOrLatestAttempt(studAttempts, theme.examTest?.id);

        const totalAttemptCount = studAttempts.length;
        const isRetake = totalAttemptCount > 1;

        const inProgressAtt = (exAtt && exAtt.status === 'in_progress')
          ? exAtt
          : [wAtt, pAtt].find(a => a && a.status === 'in_progress');
        const hasSubmitted = (exAtt && ['submitted', 'auto_submitted', 'evaluated'].includes(exAtt.status)) ||
          [wAtt, pAtt].some(a => a && ['submitted', 'auto_submitted', 'evaluated'].includes(a.status));
        const hasCancelled = (exAtt && exAtt.status === 'cancelled') ||
          [wAtt, pAtt].some(a => a && a.status === 'cancelled');

        let status = 'not_started';
        let statusText = 'Not Started';
        let statusColor = 'var(--grade-c)';

        if (inProgressAtt) {
          status = 'in_progress';
          statusText = isRetake ? 'In Progress (Retake)' : 'In Progress';
          statusColor = '#38bdf8';
        } else if (hasSubmitted) {
          status = 'submitted';
          statusText = isRetake ? 'Submitted (Retake)' : 'Submitted';
          statusColor = 'var(--grade-a)';
        } else if (hasCancelled) {
          status = 'cancelled';
          statusText = 'Cancelled / Ejected';
          statusColor = 'var(--grade-e)';
        }

        // Active module identification
        let activeModule = 'None';
        let targetAtt = null;
        if (theme.isNonVocab || (theme.examTest && !theme.wordsTest && !theme.phrasesTest)) {
          targetAtt = inProgressAtt || exAtt;
          activeModule = (theme.isNonVocab ? theme.moduleName : (theme.examTest?.title || 'Exam'));
        } else if (inProgressAtt) {
          targetAtt = inProgressAtt;
          activeModule = (inProgressAtt.test_id === theme.wordsTest?.id) ? 'Words Exam' : 'Phrases Exam';
        } else if (hasSubmitted) {
          targetAtt = pAtt || wAtt || exAtt;
          activeModule = (wAtt && pAtt) ? 'Words & Phrases' : (wAtt ? 'Words Exam' : (pAtt ? 'Phrases Exam' : (theme.examTest?.title || 'Exam')));
        }

        // Answers belonging specifically to target attempt
        const targetAnswers = targetAtt
          ? (sessionData.answers || []).filter(ans => ans.attempt_id === targetAtt.id)
          : (studAttempts.length > 0
              ? (sessionData.answers || []).filter(ans => studAttempts.some(a => a.id === ans.attempt_id))
              : []);

        const validAnswers = targetAnswers.filter(ans => ans.student_answer ? ans.student_answer.trim() : true);
        const answeredCount = (status === 'submitted' && targetAtt?.total_questions > 0)
          ? targetAtt.total_questions
          : validAnswers.length;

        // Accurate total questions calculation
        let totalQuestions = 0;
        if (targetAtt && targetAtt.total_questions > 0) {
          totalQuestions = targetAtt.total_questions;
        } else if (targetAnswers.length > 0) {
          totalQuestions = targetAnswers.length;
        } else if (studAttempts.length > 0) {
          totalQuestions = studAttempts.reduce((acc, a) => acc + (a.total_questions || 0), 0);
        }

        if (totalQuestions === 0) {
          const isPhrases = inProgressAtt ? (inProgressAtt.test_id === theme.phrasesTest?.id) : false;
          totalQuestions = isPhrases ? themeCounts.phrases : themeCounts.words;
        }

        const answeredPercent = totalQuestions > 0 ? Math.min(100, Math.round((answeredCount / totalQuestions) * 100)) : 0;

        // Telemetry: Heartbeat & Last Activity (robust maximum timestamp across valid answers)
        let lastActivityTime = null;
        if (validAnswers.length > 0) {
          for (const ans of validAnswers) {
            const t = ans.answered_at || ans.updated_at || ans.created_at;
            if (t) {
              const ms = new Date(t).getTime();
              if (!isNaN(ms) && (!lastActivityTime || ms > new Date(lastActivityTime).getTime())) {
                lastActivityTime = t;
              }
            }
          }
        }
        if (!lastActivityTime && targetAtt?.started_at) {
          lastActivityTime = targetAtt.started_at;
        }
        const activitySecAgo = lastActivityTime ? Math.max(0, Math.floor((Date.now() - new Date(lastActivityTime).getTime()) / 1000)) : null;

        let heartbeat = 'not_started';
        let heartbeatText = 'Not Joined';
        let heartbeatColor = '#94a3b8';
        let isPulsing = false;

        if (status === 'in_progress') {
          if (activitySecAgo !== null && activitySecAgo <= 90) {
            heartbeat = 'active';
            heartbeatText = isRetake ? 'Actively Answering (Retake)' : 'Actively Answering';
            heartbeatColor = 'var(--grade-a)';
            isPulsing = true;
          } else if (activitySecAgo !== null && activitySecAgo <= 300) {
            heartbeat = 'idle';
            heartbeatText = isRetake ? `Idle ${Math.floor(activitySecAgo / 60)}m (Retake)` : `Idle ${Math.floor(activitySecAgo / 60)}m`;
            heartbeatColor = 'var(--grade-c)';
          } else if (activitySecAgo !== null && activitySecAgo > 300) {
            heartbeat = 'away';
            heartbeatText = isRetake ? `Inactive ${Math.floor(activitySecAgo / 60)}m (Retake)` : `Inactive ${Math.floor(activitySecAgo / 60)}m`;
            heartbeatColor = 'var(--grade-e)';
          } else {
            heartbeat = 'starting';
            heartbeatText = isRetake ? 'Starting Retake' : 'Starting Exam';
            heartbeatColor = '#38bdf8';
            isPulsing = true;
          }
        } else if (status === 'submitted') {
          heartbeat = 'completed';
          heartbeatText = isRetake ? 'Finished (Retake)' : 'Finished';
          heartbeatColor = 'var(--grade-a)';
        }

        // Micro-activity feed
        let activityFeed = '';
        if (status === 'in_progress') {
          if (answeredCount > 0 && activitySecAgo !== null) {
            const agoStr = activitySecAgo < 60 ? `${activitySecAgo}s ago` : `${Math.floor(activitySecAgo / 60)}m ago`;
            activityFeed = `Last: Question #${answeredCount} (${agoStr})`;
          } else {
            activityFeed = 'No questions answered yet';
          }
        } else if (status === 'submitted') {
          activityFeed = 'All questions submitted';
        } else {
          activityFeed = 'Waiting for student to start exam';
        }

        // Velocity & ETA
        let velocityText = '';
        if (status === 'in_progress' && answeredCount > 1 && targetAtt?.started_at) {
          const elapsedMins = Math.max(0.5, (Date.now() - new Date(targetAtt.started_at).getTime()) / 60000);
          const qPerMin = (answeredCount / elapsedMins).toFixed(1);
          const remainingQ = Math.max(0, totalQuestions - answeredCount);
          const etaMins = qPerMin > 0 ? Math.ceil(remainingQ / qPerMin) : 0;
          velocityText = `${qPerMin} q/m · ETA ~${etaMins}m`;
        }

        // Polished running score & evaluation
        let rawScore = 0;
        let effectiveScore = 0;
        let isEvaluated = false;
        let scoreLabel = 'No Score Yet';

        if (status === 'submitted') {
          const validSub = [exAtt, wAtt, pAtt].filter(a => a && ['submitted', 'auto_submitted', 'evaluated'].includes(a.status));
          if (validSub.length > 0) {
            let sumEff = 0;
            validSub.forEach(a => {
              let eff = parseFloat(a.effective_score ?? a.percentage ?? 0);
              if (eff === 0) {
                const subAnswers = (sessionData.answers || []).filter(ans => ans.attempt_id === a.id);
                const subAnswered = subAnswers.filter(ans => ans.student_answer && ans.student_answer.trim()).length;
                if (subAnswered > 0) {
                  const correct = countCorrectAnswers(subAnswers);
                  const tq = a.total_questions || subAnswers.length || 1;
                  const recomputedPct = Math.round((correct / tq) * 100);
                  eff = theme.isRemedial ? Math.min(recomputedPct, 60) : recomputedPct;
                }
              }
              sumEff += eff;
            });
            effectiveScore = Math.round(sumEff / validSub.length);
            rawScore = effectiveScore;
            isEvaluated = true;
            scoreLabel = effectiveScore >= 60 ? 'Passing' : 'Below Passing';
          }
        } else if (status === 'in_progress' && targetAtt) {
          // Official scoring occurs on submit; in-progress attempts display clean un-evaluated state (—)
          isEvaluated = false;
          rawScore = 0;
          effectiveScore = 0;
          scoreLabel = answeredCount > 0 ? `In Progress (${answeredCount}/${totalQuestions})` : 'Starting Exam...';
        }

        const grade = isEvaluated ? getGrade(effectiveScore) : '-';

        // Alarms / Anti-cheat details
        const studCheats = (sessionData.cheatLogs || []).filter(c => c.actor_user_id === student.id);
        const alarmCount = studCheats.length;
        const alarmList = studCheats.map(c => ({
          reason: c.new_value?.reason || 'Security Warning',
          time: c.created_at,
          strike: c.new_value?.strike || 1
        }));

        return {
          student,
          status,
          statusText,
          statusColor,
          activeModule,
          targetAtt,
          targetAnswers,
          answeredCount,
          totalQuestions,
          answeredPercent,
          rawScore,
          effectiveScore,
          isEvaluated,
          scoreLabel,
          grade,
          alarmCount,
          alarmList,
          heartbeat,
          heartbeatText,
          heartbeatColor,
          isPulsing,
          activityFeed,
          velocityText,
          hasAttempts: studAttempts.length > 0
        };
      });

      renderLiveMonitorUI();

      if (footerInfoEl) {
        const timeStr = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        footerInfoEl.textContent = `Last updated: ${timeStr} • Real-time synchronized`;
      }
    } catch (err) {
      console.error('Error loading live test session data:', err);
      studentsContainer.innerHTML = `
        <div style="padding: 30px; text-align: center; color: var(--grade-e);">
          <div>Failed to load live monitor data: ${escapeHtml(err.message)}</div>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-retry-live-load" style="margin-top: 10px;">Retry</button>
        </div>
      `;
      modal.querySelector('#btn-retry-live-load')?.addEventListener('click', () => loadLiveData(false));
    }
  }

  function renderLiveMonitorUI() {
    // 1. Update KPI numbers
    const total = processedStudents.length;
    const inProgress = processedStudents.filter(s => s.status === 'in_progress').length;
    const submitted = processedStudents.filter(s => s.status === 'submitted').length;
    const notStarted = processedStudents.filter(s => s.status === 'not_started').length;
    const totalAlarms = processedStudents.reduce((acc, s) => acc + s.alarmCount, 0);
    const studentsWithAlarms = processedStudents.filter(s => s.alarmCount > 0).length;

    // 1. Safe KPI updates (guarded for single triage bar where full KPI cards are streamlined)
    const elKpiTotal = modal.querySelector('#kpi-live-total');
    if (elKpiTotal) elKpiTotal.textContent = String(total);
    const elKpiProg = modal.querySelector('#kpi-live-in-progress');
    if (elKpiProg) elKpiProg.textContent = String(inProgress);
    const elKpiSub = modal.querySelector('#kpi-live-submitted');
    if (elKpiSub) elKpiSub.textContent = String(submitted);
    const elKpiNot = modal.querySelector('#kpi-live-not-started');
    if (elKpiNot) elKpiNot.textContent = String(notStarted);

    const kpiAlarmsCard = modal.querySelector('#kpi-card-alarms');
    const kpiAlarmsTitle = modal.querySelector('#kpi-title-alarms');
    const kpiAlarmsValue = modal.querySelector('#kpi-live-alarms');

    if (totalAlarms > 0) {
      if (kpiAlarmsCard) {
        kpiAlarmsCard.style.background = 'rgba(var(--grade-e-rgb), 0.1)';
        kpiAlarmsCard.style.borderColor = 'var(--grade-e)';
      }
      if (kpiAlarmsTitle) kpiAlarmsTitle.style.color = 'var(--grade-e)';
      if (kpiAlarmsValue) {
        kpiAlarmsValue.style.color = 'var(--grade-e)';
        kpiAlarmsValue.innerHTML = `${totalAlarms} <span style="font-size: 12px; font-weight:600; color:#fca5a5;">(${studentsWithAlarms} Students)</span>`;
      }
    } else {
      if (kpiAlarmsCard) {
        kpiAlarmsCard.style.background = 'rgba(255,255,255,0.03)';
        kpiAlarmsCard.style.borderColor = 'rgba(255,255,255,0.08)';
      }
      if (kpiAlarmsTitle) kpiAlarmsTitle.style.color = '#94a3b8';
      if (kpiAlarmsValue) {
        kpiAlarmsValue.style.color = '#ffffff';
        kpiAlarmsValue.innerHTML = `0 <span style="font-size: 12px; font-weight:500; color:#64748b;">(0 Students)</span>`;
      }
    }

    // Streamlined Single Triage Bar Counters
    const tabCntAll = modal.querySelector('#tab-cnt-all');
    if (tabCntAll) tabCntAll.textContent = String(total);
    const tabCntProg = modal.querySelector('#tab-cnt-in-progress');
    if (tabCntProg) tabCntProg.textContent = String(inProgress);
    const tabCntSub = modal.querySelector('#tab-cnt-submitted');
    if (tabCntSub) tabCntSub.textContent = String(submitted);
    const tabCntNot = modal.querySelector('#tab-cnt-not-started');
    if (tabCntNot) tabCntNot.textContent = String(notStarted);
    const tabCntAlarm = modal.querySelector('#tab-cnt-alarm');
    if (tabCntAlarm) tabCntAlarm.textContent = String(studentsWithAlarms);

    const alarmTabBtn = modal.querySelector('.live-filter-btn[data-filter="alarm"]');
    if (alarmTabBtn) {
      if (studentsWithAlarms > 0) {
        alarmTabBtn.classList.add('has-alarms');
      } else {
        alarmTabBtn.classList.remove('has-alarms');
      }
    }

    // 2. Filter tabs active class
    modal.querySelectorAll('.live-filter-btn').forEach(btn => {
      const f = btn.getAttribute('data-filter');
      if (f === _liveMonitorActiveFilter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 3. Filter & Search
    let displayList = processedStudents;
    if (_liveMonitorActiveFilter === 'in_progress') {
      displayList = displayList.filter(s => s.status === 'in_progress');
    } else if (_liveMonitorActiveFilter === 'submitted') {
      displayList = displayList.filter(s => s.status === 'submitted');
    } else if (_liveMonitorActiveFilter === 'not_started') {
      displayList = displayList.filter(s => s.status === 'not_started');
    } else if (_liveMonitorActiveFilter === 'alarm') {
      displayList = displayList.filter(s => s.alarmCount > 0);
    }

    const q = _liveMonitorSearchQuery.trim().toLowerCase();
    if (q) {
      displayList = displayList.filter(s => (s.student.name || '').toLowerCase().includes(q));
    }

    // Dynamic Column Sorting
    displayList.sort((a, b) => {
      let cmp = 0;
      if (_liveSortKey === 'name') {
        cmp = (a.student.name || '').localeCompare(b.student.name || '');
      } else if (_liveSortKey === 'status') {
        const order = { 'in_progress': 1, 'submitted': 2, 'not_started': 3, 'cancelled': 4 };
        cmp = (order[a.status] || 5) - (order[b.status] || 5);
      } else if (_liveSortKey === 'progress') {
        cmp = (a.answeredPercent || 0) - (b.answeredPercent || 0);
      } else if (_liveSortKey === 'score') {
        const sA = a.isEvaluated ? a.effectiveScore : -1;
        const sB = b.isEvaluated ? b.effectiveScore : -1;
        cmp = sA - sB;
      } else if (_liveSortKey === 'alarm') {
        cmp = (a.alarmCount || 0) - (b.alarmCount || 0);
      }
      return _liveSortDirection === 'asc' ? cmp : -cmp;
    });

    // Update Header Sort Icons
    modal.querySelectorAll('.sortable-th').forEach(th => {
      const key = th.getAttribute('data-sort-key');
      const icon = th.querySelector('.sort-icon');
      if (key === _liveSortKey) {
        th.classList.add('active-sort');
        if (icon) icon.textContent = _liveSortDirection === 'asc' ? '▲' : '▼';
      } else {
        th.classList.remove('active-sort');
        if (icon) icon.textContent = '';
      }
    });

    if (displayList.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="8" style="padding: 40px 20px; text-align: center; color: #94a3b8; font-size: 12px;">
            ${q ? `No students matching "${escapeHtml(q)}".` : 'No students found in this filter.'}
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = displayList.map(item => {
      const s = item.student;
      const studentName = String(s.name || 'Unnamed').replace(/^(mr\.?|miss|mrs\.?|ms\.?)\s+/i, '').trim();
      const initial = (studentName || 'S').charAt(0).toUpperCase();
      const scoreColor = item.isEvaluated ? getGradeColorByScore(item.effectiveScore) : '#64748b';
      const isRemedialCap = theme.isRemedial;
      const scoreDisplay = item.isEvaluated
        ? `${item.effectiveScore}%${isRemedialCap ? '<sup style="font-size:12px; font-weight:900; color:inherit; margin-left:1px;">R</sup>' : ''}`
        : '—';

      const isStar = item.isEvaluated && (item.grade === '★' || item.grade === 'Star' || item.grade === 'S' || item.effectiveScore === 100);
      const gradeText = isStar ? '★' : (item.isEvaluated ? item.grade : '—');
      const circleText = isStar ? '#0f172a' : (item.isEvaluated ? '#0f172a' : '#64748b');
      const circleClass = isStar ? 'grade-circle-star' : `grade-circle-${(item.grade || 'e').toLowerCase()}`;

      const hasAlarmAlert = item.alarmCount > 0;
      const rowClass = hasAlarmAlert ? 'live-table-row row-alarm-highlight' : 'live-table-row';

      // Progress text & color per Rule 2.10
      let progressColor = '#94a3b8';
      let progressText = `${item.answeredCount} / ${item.totalQuestions} (0%)`;
      if (item.status === 'not_started') {
        progressColor = '#94a3b8';
        progressText = `0 / ${item.totalQuestions} (0%)`;
      } else {
        progressColor = getGradeColorByScore(item.answeredPercent);
        progressText = `${item.answeredCount} / ${item.totalQuestions} (${item.answeredPercent}%)`;
      }

      return `
        <tr class="${rowClass}" style="border-bottom:1px solid rgba(255,255,255,0.08); transition:background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='transparent'">
          <!-- 1. BATCH: Dedicated Column to the left of Name -->
          <td style="padding:6px 4px; text-align:center; white-space:nowrap; font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:#94a3b8; border-bottom:1px solid rgba(255,255,255,0.08);">
            ${escapeHtml(theme.liveBatchName || '—')}
          </td>

          <!-- 2. NAME: Flex Primary Column (Student Name only, zero parentheses, zero avatar/circle) -->
          <td style="padding:6px 10px; text-align:left; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; border-bottom:1px solid rgba(255,255,255,0.08);">
            <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:12px;">
              <span style="font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:#ffffff;">${escapeHtml(studentName)}</span>
            </div>
          </td>

          <!-- 3. TEST STATUS: Borderless semantic text on single line, centered (No Capsule, No Glow) -->
          <td style="padding:6px 6px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
            <span style="display:inline-flex; align-items:center; gap:6px; color:${item.heartbeatColor}; font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); text-shadow:none;">
              <span style="width:7px; height:7px; border-radius:50%; background:${item.heartbeatColor}; display:inline-block; flex-shrink:0;"></span>
              ${item.heartbeatText}
            </span>
          </td>

          <!-- 4. PROGRESS: Tabular single line, neutral when unstarted, centered (No Capsule, No Glow) -->
          <td style="padding:6px 6px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
            <span style="font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:${progressColor}; font-variant-numeric:tabular-nums; text-shadow:none;">
              ${progressText}
            </span>
          </td>

          <!-- 5. SCORE: Single line, em dash if un-evaluated, centered (No Glow) -->
          <td style="padding:6px 6px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
            ${item.isEvaluated ? `
              <span style="display:inline-flex; align-items:center; gap:6px; text-shadow:none;">
                <span class="grade-circle ${circleClass}" style="width:20px; height:20px; border-radius:50%; display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:600; background:${scoreColor}; color:${circleText}; flex-shrink:0; text-shadow:none;">
                  ${gradeText}
                </span>
                <span style="font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:${scoreColor}; font-variant-numeric:tabular-nums; text-shadow:none;">
                  ${scoreDisplay}
                </span>
              </span>
            ` : `
              <span style="font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:#64748b; font-variant-numeric:tabular-nums; text-shadow:none;">—</span>
            `}
          </td>

          <!-- 6. ALARM: Borderless text (Green if 0, Red if > 0), centered (No Capsule, No Glow) -->
          <td style="padding:6px 6px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
            ${item.alarmCount === 0 ? `
              <span style="font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:var(--grade-a); text-shadow:none;">
                0 Clean
              </span>
            ` : `
              <span class="btn-inspect-student-alarms" data-student-id="${s.id}" data-student-name="${escapeHtml(studentName)}" style="font-size:12px; font-weight:400; font-family:var(--fm-font-sans, 'Inter', sans-serif); color:var(--grade-e); cursor:pointer; text-decoration:underline; text-shadow:none;" title="Click to view details of ${item.alarmCount} anti-cheat alarms">
                ${item.alarmCount}x Alarm
              </span>
            `}
          </td>

          <!-- 7. EXPEL: Single responsibility column with SVG vector icon -->
          <td style="padding:6px 4px; text-align:center; white-space:nowrap; border-bottom:1px solid rgba(255,255,255,0.08);">
            <button type="button" class="btn-kick-student" data-student-id="${s.id}" data-student-name="${escapeHtml(studentName)}" style="background:transparent; border:none; padding:4px; color:var(--grade-e); cursor:pointer; display:inline-flex; align-items:center; justify-content:center; transition:color 0.15s ease, transform 0.15s ease;" title="Expel student from exam session">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="18" y1="8" x2="23" y2="13"></line>
                <line x1="23" y1="8" x2="18" y2="13"></line>
              </svg>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Attach kick listener
    tableBody.querySelectorAll('.btn-kick-student').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const studentId = e.currentTarget.getAttribute('data-student-id');
        const studentName = e.currentTarget.getAttribute('data-student-name');
        if (!studentId) return;

        openKickConfirmationModal(container, studentId, studentName, theme, async () => {
          theme.allowedStudentIds = (theme.allowedStudentIds || []).filter(id => id !== studentId);
          await loadLiveData(false);
          const enrolledLabel = container.querySelector(`.btn-theme-live-monitor[data-theme="${theme.code}"]`);
          if (enrolledLabel) enrolledLabel.innerHTML = `Live Monitor & Exam Status (${theme.allowedStudentIds.length})`;
          if (window.renderClassHub) {
            // Background sync Class Hub if open
          }
        });
      });
    });

    // Attach Individual ±Time listener
    tableBody.querySelectorAll('.btn-student-add-time').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const attemptId = e.currentTarget.getAttribute('data-attempt-id');
        const studentName = e.currentTarget.getAttribute('data-student-name') || 'Student';
        if (!attemptId) return;

        const input = prompt(
          `Adjust remaining time for ${studentName}:\n` +
          `• Enter a positive number to extend (e.g. 10 or +10)\n` +
          `• Enter a negative number to reduce (e.g. -5)\n` +
          `Allowed range: -180 to +180 minutes (cannot be 0).`,
          '10'
        );
        if (input === null) return;
        const mins = parseInt(input.trim(), 10);
        if (isNaN(mins) || mins === 0 || mins < -180 || mins > 180) {
          showToast('Invalid minutes (enter a number between -180 and +180, non-zero)', 'warning');
          return;
        }

        const actionText = mins > 0 ? `extended by +${mins} minutes` : `reduced by ${Math.abs(mins)} minutes`;
        showLoading();
        try {
          await extendIndividualAttemptTime(attemptId, mins);
          showToast(`Time for ${studentName} successfully ${actionText}!`, 'success');
          await loadLiveData(true);
        } catch (err) {
          showToast('Failed to adjust student time: ' + err.message, 'error');
        } finally {
          hideLoading();
        }
      });
    });

    // Attach Reopen / Resume Attempt listener
    tableBody.querySelectorAll('.btn-student-reopen-attempt').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const attemptId = e.currentTarget.getAttribute('data-attempt-id');
        const studentName = e.currentTarget.getAttribute('data-student-name') || 'Student';
        if (!attemptId) return;

        const confirmed = confirm(`Reopen exam session for ${studentName}?\nStatus will be restored to 'in_progress' and exam time extended by +30 minutes so the student can resume.`);
        if (!confirmed) return;

        showLoading();
        try {
          await reopenStudentAttempt(attemptId, 30);
          showToast(`Exam for ${studentName} reopened successfully!`, 'success');
          await loadLiveData(false);
        } catch (err) {
          showToast('Failed to reopen exam: ' + err.message, 'error');
        } finally {
          hideLoading();
        }
      });
    });

    // Attach inspect alarm detail listener
    tableBody.querySelectorAll('.btn-inspect-student-alarms').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const studentId = e.currentTarget.getAttribute('data-student-id');
        const found = processedStudents.find(p => p.student.id === studentId);
        if (found) {
          openStudentAlarmDetailModal(container, found.student, found.alarmList, theme, async () => {
            await loadLiveData(true);
          });
        }
      });
    });
  }

  // Filter tab listeners
  modal.querySelectorAll('.live-filter-btn').forEach(btn => {
    btn.onclick = () => {
      _liveMonitorActiveFilter = btn.getAttribute('data-filter') || 'all';
      renderLiveMonitorUI();
    };
  });

  // Search input
  if (searchInput) {
    searchInput.oninput = (e) => {
      _liveMonitorSearchQuery = e.target.value;
      renderLiveMonitorUI();
    };
  }

  // Refresh button
  if (refreshBtn) {
    refreshBtn.onclick = () => loadLiveData(false);
  }

  // Time Extension Controls (+ Add Time)
  const addTimeBtn = modal.querySelector('#btn-live-modal-add-time');
  const addTimeMenu = modal.querySelector('#live-modal-add-time-menu');

  if (addTimeBtn && addTimeMenu) {
    addTimeBtn.onclick = (e) => {
      e.stopPropagation();
      const isHidden = addTimeMenu.style.display === 'none' || addTimeMenu.classList.contains('hidden');
      addTimeMenu.style.display = isHidden ? 'flex' : 'none';
      addTimeMenu.classList.toggle('hidden', !isHidden);
    };

    document.addEventListener('click', () => {
      addTimeMenu.style.display = 'none';
      addTimeMenu.classList.add('hidden');
    });

    modal.querySelectorAll('.btn-add-time-option').forEach(opt => {
      opt.onclick = async (e) => {
        e.stopPropagation();
        const mins = parseInt(opt.getAttribute('data-mins'), 10);
        addTimeMenu.style.display = 'none';
        addTimeMenu.classList.add('hidden');
        await doExtendTime(mins);
      };
    });

    const customBtn = modal.querySelector('#btn-add-time-custom');
    if (customBtn) {
      customBtn.onclick = async (e) => {
        e.stopPropagation();
        addTimeMenu.style.display = 'none';
        addTimeMenu.classList.add('hidden');
        const inputStr = prompt(
          `Adjust live exam session time:\n` +
          `• Enter a positive number to extend (e.g. 15 or +15)\n` +
          `• Enter a negative number to reduce (e.g. -10)\n` +
          `Allowed range: -180 to +180 minutes (cannot be 0).`,
          '10'
        );
        if (!inputStr) return;
        const mins = parseInt(inputStr.trim(), 10);
        if (isNaN(mins) || mins === 0 || mins < -180 || mins > 180) {
          alert('Minutes must be a number between -180 and +180 and cannot be 0.');
          return;
        }
        await doExtendTime(mins);
      };
    }
  }

  async function doExtendTime(mins) {
    const testIds = [theme.examTest?.id, theme.wordsTest?.id, theme.phrasesTest?.id].filter(Boolean);
    if (!testIds.length) {
      showToast('No active tests available to adjust time.', 'error');
      return;
    }

    const actionText = mins > 0 ? `+${mins} min` : `${mins} min`;
    try {
      showToast(`Adjusting exam time (${actionText})...`, 'info', 2500);
      const res = await extendTestSessionTime({ testIds, additionalMinutes: mins });
      if (res.success) {
        theme.remainingMinutes = res.remainingMinutes;
        remainingEl.textContent = `${res.remainingMinutes}m`;
        const resultMsg = mins > 0
          ? `Exam timer successfully extended by +${mins} minutes! Remaining time: ${res.remainingMinutes}m`
          : `Exam timer successfully reduced by ${Math.abs(mins)} minutes! Remaining time: ${res.remainingMinutes}m`;
        showToast(resultMsg, 'success', 5000);
        await loadLiveData(true);
        if (window.renderClassHub) {
          // Background sync
        }
      }
    } catch (err) {
      console.error('Failed to adjust test time:', err);
      showToast('Failed to adjust exam timer: ' + err.message, 'error');
    }
  }

  // Supabase Realtime Subscription setup
  const debouncedRealtimeLoad = () => {
    if (_realtimeDebounce) clearTimeout(_realtimeDebounce);
    _realtimeDebounce = setTimeout(() => {
      if (!modal.classList.contains('hidden')) {
        loadLiveData(true);
      }
    }, 400);
  };

  async function setupRealtimeSubscription() {
    try {
      const sb = await getSupabase();
      if (!sb || typeof sb.channel !== 'function') return;
      const testIds = [theme.examTest?.id, theme.wordsTest?.id, theme.phrasesTest?.id].filter(Boolean);
      if (!testIds.length) return;

      const channelId = `live-monitor-${theme.code}-${Date.now()}`;
      _realtimeChannel = sb.channel(channelId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attempts' }, (payload) => {
          if (testIds.includes(payload.new?.test_id || payload.old?.test_id)) {
            debouncedRealtimeLoad();
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attempt_answers' }, () => {
          debouncedRealtimeLoad();
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, (payload) => {
          if (payload.new?.action === 'CHEAT_ATTEMPT' && testIds.includes(payload.new?.entity_id)) {
            debouncedRealtimeLoad();
          }
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription not available, falling back to auto-poll:', e);
    }
  }

  // Close handlers
  const closeModal = () => {
    if (_livePollingTimer) {
      clearInterval(_livePollingTimer);
      _livePollingTimer = null;
    }
    if (_liveSecondCountdownTimer) {
      clearInterval(_liveSecondCountdownTimer);
      _liveSecondCountdownTimer = null;
    }
    if (_realtimeChannel) {
      try {
        getSupabase().then(sb => sb.removeChannel(_realtimeChannel));
      } catch (_) {}
      _realtimeChannel = null;
    }
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    modal.classList.add('hidden');
  };

  modal.querySelector('#btn-close-live-modal-footer').onclick = closeModal;

  // Smart Visibility Guard: pause polling when browser tab is inactive to protect egress quota
  const handleVisibilityChange = () => {
    if (!document.hidden && !modal.classList.contains('hidden') && autoPollCheckbox?.checked) {
      loadLiveData(true);
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Auto-poll interval handling (5s heartbeat safety with background tab suppression)
  const setupAutoPoll = () => {
    if (_livePollingTimer) {
      clearInterval(_livePollingTimer);
      _livePollingTimer = null;
    }
    if (autoPollCheckbox && autoPollCheckbox.checked) {
      _livePollingTimer = setInterval(() => {
        if (!modal.classList.contains('hidden') && !document.hidden) {
          loadLiveData(true);
        } else if (modal.classList.contains('hidden')) {
          clearInterval(_livePollingTimer);
          _livePollingTimer = null;
        }
      }, 5000);
    }
  };

  if (autoPollCheckbox) {
    autoPollCheckbox.onchange = setupAutoPoll;
  }

  await loadLiveData(false);
  setupAutoPoll();
  setupRealtimeSubscription();
  modal.classList.remove('hidden');
}

/**
 * Open Modal: Anti-Cheat Alarm Details & Student Alarm Reset
 */
function openStudentAlarmDetailModal(container, student, alarmsList = [], theme, onDone) {
  const alarmModal = container.querySelector('#modal-student-alarm-detail');
  if (!alarmModal) return;

  const nameEl = alarmModal.querySelector('#alarm-detail-student-name');
  const metaEl = alarmModal.querySelector('#alarm-detail-meta');
  const listEl = alarmModal.querySelector('#alarm-detail-logs-list');

  const studentName = String(student.name || 'Student').replace(/^(mr\.?|miss|mrs\.?|ms\.?)\s+/i, '').trim();
  if (nameEl) nameEl.textContent = 'STUDENT INTEGRITY & TAB-SWITCH ALARMS';
  if (metaEl) metaEl.textContent = `${studentName} • ${alarmsList.length} Alarm${alarmsList.length === 1 ? '' : 's'} Recorded • ${theme.isNonVocab ? theme.name : `Theme ${theme.code}`}`;

  if (listEl) {
    if (alarmsList.length === 0) {
      listEl.innerHTML = `
        <div style="text-align:center; color:var(--grade-a); padding:24px 10px; font-family:'Inter',sans-serif; font-size:12px; font-weight:600;">
          No integrity alarm records for this student.
        </div>
      `;
    } else {
      listEl.innerHTML = alarmsList.map((item, idx) => {
        const timeStr = item.time
          ? new Date(item.time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : '-';
        return `
          <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); border-radius:8px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; gap:10px; box-sizing:border-box;">
            <div>
              <div style="font-family:'Inter',sans-serif; font-size:12px; display:flex; align-items:center; gap:6px;">
                <span style="font-weight:700; color:var(--grade-e);">Incident #${idx + 1}</span>
                <span style="font-weight:400; color:#cbd5e1;">(Strike ${item.strike || 1})</span>
              </div>
              <div style="font-family:'Inter',sans-serif; font-size:12px; font-weight:400; color:#94a3b8; margin-top:3px;">${escapeHtml(item.reason)}</div>
            </div>
            <div style="font-family:'Inter',sans-serif; font-size:12px; font-weight:400; color:#94a3b8; white-space:nowrap;">
              ${timeStr}
            </div>
          </div>
        `;
      }).join('');
    }
  }

  const closeAlarmModal = () => alarmModal.classList.add('hidden');
  alarmModal.querySelector('#btn-dismiss-alarm-detail').onclick = closeAlarmModal;

  const resetBtn = alarmModal.querySelector('#btn-clear-student-alarms');
  if (resetBtn) {
    resetBtn.onclick = async () => {
      const testIds = [theme.examTest?.id, theme.wordsTest?.id, theme.phrasesTest?.id].filter(Boolean);
      if (!confirm(`Reset all exam integrity alarms for ${student.name}? This will treat previous warnings as false alarms.`)) return;

      try {
        await resetStudentTestAlarms({ studentId: student.id, testIds });
        showToast(`All alarms for ${student.name} successfully reset.`, 'success');
        closeAlarmModal();
        if (onDone) onDone();
      } catch (err) {
        showToast('Failed to reset alarms: ' + err.message, 'error');
      }
    };
  }

  alarmModal.classList.remove('hidden');
}

/**
 * Open Modal: Confirm Expel Student from Exam
 */
function openKickConfirmationModal(container, studentId, studentName, theme, onDone) {
  const kickModal = container.querySelector('#modal-kick-student-confirm');
  if (!kickModal) return;

  const nameEl = kickModal.querySelector('#kick-confirm-student-name');
  if (nameEl) {
    nameEl.textContent = `${studentName} • ${theme.isNonVocab ? theme.name : `Theme ${theme.code} (${theme.name})`}`;
  }

  const cancelBtn = kickModal.querySelector('#btn-cancel-kick');
  const confirmBtn = kickModal.querySelector('#btn-confirm-kick');

  const closeKickModal = () => kickModal.classList.add('hidden');
  cancelBtn.onclick = closeKickModal;

  confirmBtn.onclick = async () => {
    const actionRadios = kickModal.querySelectorAll('input[name="kick_action"]');
    let chosenAction = 'submit';
    actionRadios.forEach(r => {
      if (r.checked) chosenAction = r.value;
    });

    closeKickModal();
    showLoading();
    try {
      const promises = [];
      if (theme.examTest) {
        promises.push(removeStudentFromTestSession({
          testId: theme.examTest.id,
          studentId: studentId,
          action: chosenAction
        }));
      }
      if (theme.wordsTest && (!theme.examTest || theme.wordsTest.id !== theme.examTest.id)) {
        promises.push(removeStudentFromTestSession({
          testId: theme.wordsTest.id,
          studentId: studentId,
          action: chosenAction
        }));
      }
      if (theme.phrasesTest && (!theme.examTest || theme.phrasesTest.id !== theme.examTest.id)) {
        promises.push(removeStudentFromTestSession({
          testId: theme.phrasesTest.id,
          studentId: studentId,
          action: chosenAction
        }));
      }

      await Promise.all(promises);

      const actionText = chosenAction === 'submit' ? 'Answers Submitted & Graded' : 'Exam Cancelled (Score 0)';
      showToast(`${studentName} successfully removed from exam session (${actionText}).`, 'success');
      if (typeof onDone === 'function') {
        await onDone();
      }
    } catch (err) {
      console.error('Error kicking student:', err);
      showToast('Failed to expel student: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  };

  kickModal.classList.remove('hidden');
}

/**
 * Universal Fail-Safe / Backward-Compatibility Wrapper
 * Handles both singular/positional and options object invocations.
 */
function evaluateStudentEligibility(themeOrObj, students, allAttempts, mode = 'normal', classTests = []) {
  if (themeOrObj && typeof themeOrObj === 'object' && themeOrObj.students) {
    return evaluateStudentsEligibility(themeOrObj);
  }
  return evaluateStudentsEligibility({
    students: students || [],
    theme: themeOrObj,
    themeTasks: themeOrObj?.tasks || [],
    wordsTest: themeOrObj?.wordsTest,
    phrasesTest: themeOrObj?.phrasesTest,
    examTest: themeOrObj?.examTest,
    classTests,
    allAttempts,
    mode
  });
}

/**
 * Smart Eligibility Engine:
 * Evaluates whether students meet prerequisite tasks and prior exam status.
 */
function evaluateStudentsEligibility({ students, theme, themeTasks, themeQuizzes, wordsTest, phrasesTest, examTest, classTests = [], allAttempts = [], mode }) {
  const targetExam = examTest || theme?.examTest;
  const isNonVocab = Boolean(theme?.isNonVocab);
  const hasTargetExam = Boolean(targetExam);
  const testMap = Object.fromEntries((classTests || []).map(t => [t.id, t]));
  const results = [];
  const activeTasks = themeTasks || themeQuizzes || theme?.tasks || theme?.quizzes || [];

  students.forEach(student => {
    const studAtts = (allAttempts || []).filter(a => a.student_id === student.id);

    // 1. Prerequisite tasks check:
    let prereqMet = true;
    let completedTaskCount = 0;

    if (activeTasks.length > 0) {
      for (const task of activeTasks) {
        const taskAtts = studAtts.filter(a => (a.test_id || a.Test_id) === task.id);
        const passedAtt = taskAtts.find(a => {
          const st = String(a.status || '').toLowerCase();
          const isSub = ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st);
          const pct = parseFloat(a.percentage ?? 0);
          return isSub && pct >= 60;
        });

        if (passedAtt) {
          completedTaskCount++;
        } else {
          prereqMet = false;
        }
      }
    }

    // 1b. Cross-Theme Sequential Exam Prerequisite:
    // If evaluating Theme B, C, or D: must have passed prior theme's exams (>= 60%)
    const themeSeq = ['A', 'B', 'C', 'D'];
    const curThemeIdx = themeSeq.indexOf(String(theme?.code || '').toUpperCase());
    let priorThemePassed = true;
    let priorThemeCode = null;

    if (curThemeIdx > 0 && !isNonVocab) {
      priorThemeCode = themeSeq[curThemeIdx - 1];
      const priorExamAtts = studAtts.filter(a => {
        const t = a.tests || a.test || testMap[a.test_id] || testMap[a.Test_id] || {};
        const shell = String(t.shell_code || a.shell_code || '');
        const title = String(t.title || a.title || '');
        const isEx = t.test_type === 'exam' || /EXAM/i.test(shell) || /EXAM/i.test(title);
        if (!isEx) return false;
        const m = shell.match(/^[0-9]+([A-Za-z])/);
        const tc = getTestThemeCode(t) || (m ? m[1].toUpperCase() : (title.match(/Theme\s+([A-Za-z])/i)?.[1]?.toUpperCase() || ''));
        return tc === priorThemeCode;
      });

      if (priorExamAtts.length === 0) {
        priorThemePassed = false;
      } else {
        const priorBestScores = {};
        priorExamAtts.forEach(a => {
          const tId = a.test_id || a.Test_id;
          const st = String(a.status || '').toLowerCase();
          if (['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(st)) {
            const sc = parseFloat(a.effective_score ?? a.percentage ?? 0);
            if (!priorBestScores[tId] || sc > priorBestScores[tId]) {
              priorBestScores[tId] = sc;
            }
          }
        });
        // Dynamic prior exam count: count actual published exams for prior theme
        const priorPublishedExams = (classTests || []).filter(t => {
          const shell = String(t.shell_code || '');
          const title = String(t.title || '');
          const isEx = t.test_type === 'exam' || /EXAM/i.test(shell) || /EXAM/i.test(title);
          const m = shell.match(/^[0-9]+([A-Za-z])/);
          const tc = getTestThemeCode(t) || (m ? m[1].toUpperCase() : (title.match(/Theme\s+([A-Za-z])/i)?.[1]?.toUpperCase() || ''));
          const isPub = t.status === 'PUBLISHED' && !t.deleted_at;
          return isEx && tc === priorThemeCode && isPub;
        });
        const requiredPriorCount = Math.max(1, priorPublishedExams.length);
        const failedPrior = Object.keys(priorBestScores).length < requiredPriorCount || Object.values(priorBestScores).some(sc => sc < 60);
        if (failedPrior) {
          priorThemePassed = false;
        }
      }
    }

    // 2. Prior exam attempts:
    let wBestPct = null;
    let pBestPct = null;
    let examBestPct = null;

    if (hasTargetExam) {
      const eAtts = studAtts.filter(a => (a.test_id || a.Test_id) === targetExam.id);
      const subE = eAtts.filter(a => ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase()));
      if (subE.length > 0) {
        examBestPct = Math.max(...subE.map(a => parseFloat(a.percentage ?? 0)));
      }
    } else {
      if (wordsTest) {
        const wAtts = studAtts.filter(a => (a.test_id || a.Test_id) === wordsTest.id);
        const subW = wAtts.filter(a => ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase()));
        if (subW.length > 0) {
          wBestPct = Math.max(...subW.map(a => parseFloat(a.percentage ?? 0)));
        }
      }
      if (phrasesTest) {
        const pAtts = studAtts.filter(a => (a.test_id || a.Test_id) === phrasesTest.id);
        const subP = pAtts.filter(a => ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase()));
        if (subP.length > 0) {
          pBestPct = Math.max(...subP.map(a => parseFloat(a.percentage ?? 0)));
        }
      }
    }

    let hasAttempted = false;
    let isAlreadyPassed = false;
    let isFailed = false;
    let avgScore = null;
    let hasTakenWords = false;
    let hasTakenPhrases = false;
    let wordsPassed = false;
    let phrasesPassed = false;

    if (hasTargetExam) {
      const hasTakenExam = examBestPct !== null;
      const examPassed = hasTakenExam && examBestPct >= 60;
      hasAttempted = hasTakenExam;
      isAlreadyPassed = hasAttempted && examPassed;
      isFailed = hasAttempted && !isAlreadyPassed;
      if (hasTakenExam) avgScore = Math.round(examBestPct);
      wordsPassed = examPassed;
      phrasesPassed = examPassed;
      hasTakenWords = hasTakenExam;
      hasTakenPhrases = hasTakenExam;
    } else {
      hasTakenWords = wBestPct !== null;
      hasTakenPhrases = pBestPct !== null;
      wordsPassed = !wordsTest || (hasTakenWords && wBestPct >= 60);
      phrasesPassed = !phrasesTest || (hasTakenPhrases && pBestPct >= 60);

      hasAttempted = (Boolean(wordsTest) && hasTakenWords) || (Boolean(phrasesTest) && hasTakenPhrases);
      isAlreadyPassed = hasAttempted && wordsPassed && phrasesPassed;
      isFailed = hasAttempted && !isAlreadyPassed;

      if (hasTakenWords && hasTakenPhrases) avgScore = Math.round((wBestPct + pBestPct) / 2);
      else if (hasTakenWords) avgScore = Math.round(wBestPct);
      else if (hasTakenPhrases) avgScore = Math.round(pBestPct);
    }

    let isEligible = false;
    let statusLabel = '';
    let statusType = 'neutral';
    let reason = '';

    if (mode === 'normal') {
      // Normal Mode:
      // - Eligible ONLY if NOT yet taken the exam, prerequisites met, and prior theme passed.
      // - Students who passed (>=60%) can retake independently in the student portal (excluded here).
      // - Students who failed (<60%) must attend a Remedial session (excluded here).
      if (!priorThemePassed) {
        isEligible = false;
        statusType = 'danger';
        statusLabel = `Prior Theme ${priorThemeCode} Incomplete`;
        reason = `Must pass Theme ${priorThemeCode} Exams (≥60%) before taking Theme ${theme.code} Exam.`;
      } else if (!prereqMet) {
        isEligible = false;
        statusType = 'danger';
        statusLabel = `Incomplete Tasks (${completedTaskCount}/${activeTasks.length})`;
        reason = `Incomplete prerequisite tasks for Theme ${theme.code}.`;
      } else if (isAlreadyPassed) {
        isEligible = false;
        statusType = 'success';
        statusLabel = `Passed (${avgScore}%) • Retake via Student Portal`;
        reason = `Passed with ${avgScore}%. Self-paced retake available 24/7 in student portal.`;
      } else if (isFailed) {
        isEligible = false;
        statusType = 'warning';
        statusLabel = `Failed (${avgScore}%) • Needs Remedial`;
        reason = `Exam attempted and score below 60%. Must take Remedial session.`;
      } else {
        isEligible = true;
        statusType = 'success';
        statusLabel = isNonVocab ? 'Exam Ready' : `Tasks Completed (Exam Ready)`;
        reason = isNonVocab ? 'All prerequisite requirements met. Eligible for normal exam.' : `All ${activeTasks.length} prerequisite tasks passed >= 60%. Eligible for normal exam.`;
      }
    } else {
      // Remedial Mode:
      // - Eligible ONLY if prerequisites met AND student previously took exam and scored < 60%.
      // - Students who have not taken the exam must take Normal first.
      // - Students who already passed (>= 60%) retake independently via student portal.
      if (!prereqMet) {
        isEligible = false;
        statusType = 'danger';
        statusLabel = `Incomplete Tasks (${completedTaskCount}/${activeTasks.length})`;
        reason = `Prerequisite tasks must be passed (≥60%) before taking remedial exam.`;
      } else if (!hasAttempted) {
        isEligible = false;
        statusType = 'neutral';
        statusLabel = `Exam Not Attempted (Take Normal First)`;
        reason = `Student has not taken the normal exam yet. Must take normal exam first.`;
      } else if (isAlreadyPassed) {
        isEligible = false;
        statusType = 'success';
        statusLabel = `Passed (${avgScore}%) • Remedial Ineligible`;
        reason = `Student already passed normal exam (>= 60%), ineligible for remedial.`;
      } else if (isFailed) {
        isEligible = true;
        statusType = 'amber';
        statusLabel = `Remedial (Previous Score: ${avgScore}%)`;
        reason = `Previous score ${avgScore}% (< 60%). Eligible for remedial exam session.`;
      } else {
        isEligible = false;
        statusType = 'neutral';
        statusLabel = `Ineligible for Remedial`;
        reason = `Student does not qualify for remedial session.`;
      }
    }

    results.push({
      student,
      isEligible,
      statusLabel,
      statusType,
      reason,
      avgScore,
      hasAttempted,
      isAlreadyPassed,
      isFailed,
      completedTaskCount,
      completedQuizCount: completedTaskCount, // Backward compatibility
      totalTasks: activeTasks.length,
      totalQuizzes: activeTasks.length, // Backward compatibility
      prereqMet,
      wordsPassed,
      phrasesPassed,
      hasTakenWords,
      hasTakenPhrases,
      wBestPct,
      pBestPct
    });
  });

  return results;
}
