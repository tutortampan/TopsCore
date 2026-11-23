import { openQuickAlumniGraduateModal } from './quick-score-wizards.js?v=20261115_v549';
import { adminFetchAll, formatStudentName, cleanStudentName, normalizeStudentNameForMatch, adminSoftDelete, clearAdminCache, adminInsert, adminUpdate, sha256, toLevelLetter, toShortLevel, labelAttemptRemedial, labelAttemptForgiven, labelAttemptNormal, adminApplyForgiven } from '../api.js?v=20261120_v640';
import { getSupabase } from '../supabase.js?v=20261106_v160';
import { getGrade, showToast, getGradeColor, getGradeColorByScore, TOPSCORE_COLORS, isWeeklyExam, isExam, computeMilestoneExamMastery, calculateGrade } from '../app.js?v=20261112_v423';
import { processAndCompressAvatar, uploadStudentAvatar, generateAvatarSvg, generateAvatarDataUri, getBustedAvatarUrl, stripHonorific, getStudentInitial } from '../utils/avatar-engine.js?v=20261112_v423';
import { DataGrid } from './datagrid.js?v=20261114_v500';
import { exportStudentDossier } from './dossier_export.js?v=20261106_v160';
import { isTutorRole } from '../session.js?v=20261106_v160';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';
import { INDONESIA_REGIONS, PROVINCE_DISPLAY_MAP, formatProvinceName, formatCityDistrict, formatDistrictName, formatVillageName, getDefaultDistrictAndVillage, getDistrictsForCity, getVillagesForDistrict, canonicalizeRegencyName } from '../indonesia-regions.js?v=20261117_v547';
import { getCertificatePredicate } from './exam-rules-engine.js';
import { renderBatchAttendance } from './class-attendance.js?v=20261123_v677';

if (typeof window !== 'undefined') {
  window.exportStudentDossier = exportStudentDossier;
}

let studentGrid = null;

// escapeHtml / escHtml imported canonically


function calculateAgeFromBirthDate(birthDateStr) {
  if (!birthDateStr) return '—';
  try {
    const dob = new Date(birthDateStr);
    if (isNaN(dob.getTime())) return '—';
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
      age--;
    }
    return (age && age > 0) ? String(age) : '—';
  } catch {
    return '—';
  }
}

export function formatBirthDate(dob) {
  if (!dob) return '—';
  try {
    const d = new Date(dob);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch (_) {
    return String(dob);
  }
}

export const EDUCATION_OPTIONS = [
  { value: 'kindergarten', label: 'Kindergarten' },
  { value: 'elementary', label: 'Elementary School' },
  { value: 'junior_high', label: 'Junior High School' },
  { value: 'senior_high', label: 'Senior High School' },
  { value: 'diploma', label: 'Diploma Degree' },
  { value: 'bachelor', label: "Bachelor's Degree" },
  { value: 'master', label: "Master's Degree" },
  { value: 'doctorate', label: 'Doctorate Degree' }
];

export function formatLastEducation(edu) {
  if (!edu) return '—';
  let raw = '';
  try {
    const parsed = typeof edu === 'string' ? JSON.parse(edu) : edu;
    if (Array.isArray(parsed) && parsed.length > 0) {
      const last = parsed[parsed.length - 1];
      raw = last.level || last.institution || last.degree || '';
    } else if (typeof parsed === 'object' && parsed !== null) {
      raw = parsed.level || parsed.institution || parsed.degree || '';
    } else {
      raw = String(parsed);
    }
  } catch (_) {
    raw = String(edu);
  }

  raw = (raw || '').trim();
  if (!raw || raw === '—') return '—';

  // Normalize lowercased key without year
  const lower = raw.toLowerCase().replace(/\s*\(\d{4}\)/g, '').trim();

  // Formal English educational terminology
  if (lower === 'kindergarten' || lower === 'tk' || lower === 'paud' || lower.includes('kindergarten')) return 'Kindergarten';
  if (lower === 'elementary' || lower === 'sd' || lower === 'mi' || lower.includes('elementary')) return 'Elementary School';
  if (lower === 'junior_high' || lower === 'smp' || lower === 'mts' || lower.includes('junior')) return 'Junior High School';
  if (lower === 'senior_high' || lower === 'sma' || lower === 'smk' || lower === 'ma' || lower.includes('senior') || lower === 'high school') return 'Senior High School';
  if (lower === 'diploma' || lower.startsWith('d1') || lower.startsWith('d2') || lower.startsWith('d3') || lower.includes('diploma')) return 'Diploma Degree';
  if (lower === 'bachelor' || lower === 's1' || lower === 'd4' || lower.includes('bachelor')) return "Bachelor's Degree";
  if (lower === 'master' || lower === 's2' || lower.includes('master')) return "Master's Degree";
  if (lower === 'doctorate' || lower === 's3' || lower === 'phd' || lower.includes('doctorate')) return 'Doctorate Degree';

  // Strip any lingering (YYYY) year suffix if present
  return raw.replace(/\s*\(\d{4}\)/g, '').trim();
}

/**
 * Hierarchical sort comparator for student records:
 * 1. Active students on top, Inactive students at the bottom.
 * 2. Alphabetical ordering: Institution -> Program -> Batch -> Level -> Name.
 */
export function compareStudentsHierarchical(a, b) {
  const aActive = ((a._raw || a).is_active !== false) ? 1 : 0;
  const bActive = ((b._raw || b).is_active !== false) ? 1 : 0;
  if (aActive !== bActive) return bActive - aActive;

  const instA = (a.instName || '').trim();
  const instB = (b.instName || '').trim();
  const instCmp = instA.localeCompare(instB, undefined, { sensitivity: 'base', numeric: true });
  if (instCmp !== 0) return instCmp;

  const progA = (a.progName || '').trim();
  const progB = (b.progName || '').trim();
  const progCmp = progA.localeCompare(progB, undefined, { sensitivity: 'base', numeric: true });
  if (progCmp !== 0) return progCmp;

  const batchA = (a.batchName || '').trim();
  const batchB = (b.batchName || '').trim();
  const batchCmp = batchA.localeCompare(batchB, undefined, { sensitivity: 'base', numeric: true });
  if (batchCmp !== 0) return batchCmp;

  const lvlA = (a.levelName || '').trim();
  const lvlB = (b.levelName || '').trim();
  const lvlCmp = lvlA.localeCompare(lvlB, undefined, { sensitivity: 'base', numeric: true });
  if (lvlCmp !== 0) return lvlCmp;

  const nameA = stripHonorific(a.displayName || a.name || a.sortName || '');
  const nameB = stripHonorific(b.displayName || b.name || b.sortName || '');
  return nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
}

export async function renderStudents(area, options = {}) {
  if (area && !area.innerHTML.trim()) {
    const getLoading = typeof window.getLoadingStateHtml === 'function' ? window.getLoadingStateHtml : () => '<div class="topscore-loading-center"><div class="spinner"></div><p class="loading-text">Loading students...</p></div>';
    area.innerHTML = getLoading('Loading students...');
  }
  const isAlumniPanel = Boolean(options?.isAlumniPanel || window._isAlumniMainPanel || window._currentSection === 'alumni' || (typeof window !== 'undefined' && window.location.hash.startsWith('#alumni')));
  if (isAlumniPanel) {
    window._isAlumniMainPanel = true;
  }
  window.renderStudents = (targetArea, opts) => renderStudents(targetArea || area || document.getElementById('admin-content-area'), opts || { isAlumniPanel });
  // 1. Resolve Master / Catalog References (Ultra-lean in-memory cache hit)
  const [allLevels, allPrograms, allBatches, allTests, allClasses] = await Promise.all([
    adminFetchAll('levels', 'id, name, level_number'),
    adminFetchAll('programs', 'id, name, institution_id, is_active'),
    adminFetchAll('batches', 'id, name, program_id, is_active, current_level_id'),
    adminFetchAll('tests', 'id, title, test_type, shell_code, payload, display_order, category, level_id, class_id, program_id, institution_id, levels(name, level_number)').catch(() => []),
    adminFetchAll('classes', 'id, name, program_id, institution_id, is_active').catch(() => [])
  ]);

  const levelsMap = new Map();
  (allLevels || []).forEach(l => levelsMap.set(l.id, l));

  const testsMap = new Map((allTests || []).map(a => [a.id, a]));

  // Classes map: id → class object (only active classes)
  const classesMap = new Map((allClasses || []).filter(c => c.is_active !== false).map(c => [c.id, c]));

  // Pre-build: tests grouped by class_id
  const testsByClass = new Map();
  (allTests || []).forEach(t => {
    if (!t.class_id) return;
    if (!testsByClass.has(t.class_id)) testsByClass.set(t.class_id, []);
    testsByClass.get(t.class_id).push(t);
  });

  // 1 Program 1 Table: Dynamic Active Programs (Auto-show when active, auto-hide when inactive)
  const activePrograms = (allPrograms || []).filter(p => p.is_active !== false);
  activePrograms.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Ensure active batch is selected (from memory or localStorage)
  if (!window._filterBatchId) {
    const savedBatchId = localStorage.getItem('topscore_selected_batch_id');
    const isValidSaved = savedBatchId && (allBatches || []).some(b => b.id === savedBatchId);
    if (isValidSaved) {
      window._filterBatchId = savedBatchId;
    }
  }

  // If filtered by batch, auto-detect program
  if (window._filterBatchId && allBatches) {
    const matchedBatch = allBatches.find(b => b.id === window._filterBatchId);
    if (matchedBatch && matchedBatch.program_id) {
      window._filterProgramId = matchedBatch.program_id;
    }
  }

  // Ensure current active program is selected (defaults to selected or 1st active program; no "All Programs" tab)
  let currentProgram = activePrograms.find(p => p.id === window._filterProgramId);
  if (!currentProgram && activePrograms.length > 0) {
    const savedProgId = localStorage.getItem('topscore_selected_program_id');
    currentProgram = activePrograms.find(p => p.id === savedProgId) || activePrograms[0];
    window._filterProgramId = currentProgram.id;
  }
  const currentProgramId = currentProgram ? currentProgram.id : null;
  window._selectedProgramName = currentProgram ? currentProgram.name : '';
  if (currentProgramId) {
    try {
      localStorage.setItem('topscore_selected_program_id', currentProgramId);
      localStorage.setItem('topscore_selected_program_name', window._selectedProgramName);
    } catch(e) {}
  }

  const isCampProgram = Boolean(
    (currentProgram && (/camp/i.test(currentProgram.name || '') || (currentProgram.code && /camp/i.test(currentProgram.code)))) ||
    (/camp/i.test(window._selectedProgramName || '')) ||
    (allBatches && allBatches.find(b => b.id === window._filterBatchId && /camp/i.test(b.name || '')))
  );

  // If still no batch selected, pick the first active batch of the active program
  if (!window._filterBatchId && currentProgramId && allBatches) {
    const firstActiveBatch = allBatches.find(b => b.program_id === currentProgramId && b.is_active !== false && !b.deleted_at);
    if (firstActiveBatch) {
      window._filterBatchId = firstActiveBatch.id;
      window._filterBatchName = firstActiveBatch.name;
      try {
        localStorage.setItem('topscore_selected_batch_id', firstActiveBatch.id);
        localStorage.setItem('topscore_selected_batch_name', firstActiveBatch.name);
      } catch(_) {}
    }
  }

  // 2. Scoped Student Fetch (Filtered strictly by current active program, or all programs if in Alumni main panel)
  // OPTIMIZATION: Exclude heavy base64 photo_url from bulk list queries (~85% egress reduction)
  // Photos are fetched on-demand strictly when opening student profile, dossier, or edit modal
  const studentFilters = isAlumniPanel ? {} : (currentProgramId ? { program_id: currentProgramId } : {});
  const rawData = await adminFetchAll(
    'students',
    'id, nis, name, pin, pin_hash, gender, birth_date, birthplace, education, province, city, district, village, is_active, program_status, created_at, deleted_at, level_id, batch_id, program_id, institution_id, programs!program_id(name, is_active), institutions!institution_id(name, is_active), batches!batch_id(name, is_active, current_level_id)',
    studentFilters
  );

  const studentIds = (rawData || []).filter(s => !s.deleted_at).map(s => s.id);

  // Helper: Chunked cohort fetching to prevent massive unconstrained scans while respecting Supabase URL length
  async function fetchInStudentChunks(table, select) {
    if (!studentIds || studentIds.length === 0) return [];
    const CHUNK_SIZE = 80;
    if (studentIds.length <= CHUNK_SIZE) {
      return adminFetchAll(table, select, { student_id: studentIds }).catch(() => []);
    }
    const chunks = [];
    for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
      chunks.push(studentIds.slice(i, i + CHUNK_SIZE));
    }
    const chunkPromises = chunks.map(chunk =>
      adminFetchAll(table, select, { student_id: chunk }).catch(() => [])
    );
    const chunkArrays = await Promise.all(chunkPromises);
    return chunkArrays.flat();
  }

  // 3. Scoped Attempts & Progress Fetch (Prunes 90%+ egress; strictly scoped to current cohort)
  let allAttempts = [];
  let allProgress = [];
  let allAcademicAssessments = [];
  let allFinalExams = [];
  if (studentIds.length > 0) {
    const [attRes, progRes, saaRes, sfeRes] = await Promise.all([
      fetchInStudentChunks(
        'attempts',
        'id, student_id, test_id, status, score, total_questions, percentage, effective_score, created_at, is_remedial_unlocked, is_forgiven, forgiven_reason, forgiven_by, forgiven_at, is_remedial, tests(test_type, title, class_id)'
      ),
      fetchInStudentChunks(
        'progress',
        'id, student_id, class_id, unlocked_level, highest_score'
      ),
      fetchInStudentChunks(
        'student_academic_assessments',
        'id, student_id, batch_id, class_id, step_level, subject_code, assessment_type, assessment_key, raw_score, target_score, percentage, grade, notes'
      ),
      fetchInStudentChunks(
        'student_final_examinations',
        'id, student_id, batch_id, exam_date, examiner_name, examiner_fluency, examiner_pronunciation, examiner_idea, examiner_grammar, examiner_total, tutor_name, tutor_fluency, tutor_pronunciation, tutor_grammar, tutor_comprehension, tutor_total, practice_score, practice_predicate, speaking_score, speaking_predicate, vocab_score, vocab_predicate, pronunciation_score, pronunciation_predicate, grammar_score, grammar_predicate, final_score, certificate_predicate, certificate_nis, certificate_month, certificate_year, status, notes'
      )
    ]);
    allAttempts = attRes || [];
    allProgress = progRes || [];
    allAcademicAssessments = saaRes || [];
    allFinalExams = sfeRes || [];
  }

  const academicByStudent = new Map();
  (allAcademicAssessments || []).forEach(item => {
    if (!item.student_id) return;
    if (!academicByStudent.has(item.student_id)) academicByStudent.set(item.student_id, new Map());
    const sMap = academicByStudent.get(item.student_id);
    const itemKey = `${item.step_level}:${item.subject_code}:${item.assessment_key}`;
    sMap.set(itemKey, item);
  });

  const finalExamsByStudent = new Map();
  (allFinalExams || []).forEach(fe => {
    if (fe.student_id) finalExamsByStudent.set(fe.student_id, fe);
  });

  const attemptsByStudent = new Map();
  (allAttempts || []).forEach(att => {
    if (!att.student_id) return;
    if (!attemptsByStudent.has(att.student_id)) attemptsByStudent.set(att.student_id, []);
    attemptsByStudent.get(att.student_id).push(att);
  });

  // Detect duplicate students within the same class (normalized by stripping honorifics & whitespace)
  const dupMap = new Map();
  (rawData || []).forEach(s => {
    if (s.deleted_at) return;
    const norm = normalizeStudentNameForMatch(s.name);
    const key = `${s.program_id}::${norm}`;
    if (!dupMap.has(key)) dupMap.set(key, []);
    dupMap.get(key).push(s);
  });
  const duplicateGroups = Array.from(dupMap.values()).filter(g => g.length > 1);
  const totalDuplicates = duplicateGroups.reduce((acc, g) => acc + (g.length - 1), 0);

  // Format data for DataGrid
  const gridData = (rawData || []).filter(s => {
    if (s.deleted_at) return false;
    return true;
  }).map(s => {
    const studentAttempts = attemptsByStudent.get(s.id) || [];
    const validStatuses = ['submitted', 'auto_submitted', 'evaluated', 'graded'];

    // Map curriculum assignments & level-centric tests (Rule 2.5 & 2.7)
    const studentBatch = (allBatches || []).find(b => b.id === s.batch_id);
    const studentLevelId = s.level_id || studentBatch?.current_level_id;
    const levelAssesIds = studentLevelId ? (allTests || []).filter(a => {
      if (a.level_id !== studentLevelId) return false;
      const tProg = a.program_id || classesMap.get(a.class_id)?.program_id;
      return !tProg || !s.program_id || tProg === s.program_id;
    }).map(a => a.id) : [];
    const assignedAssesIds = new Set(levelAssesIds);
    const totalAssigned = assignedAssesIds.size || 40;

    const sAttemptsByAsm = new Map();
    studentAttempts.forEach(att => {
      const asmId = att.test_id || att.Test_id;
      if (!asmId) return;
      if (!sAttemptsByAsm.has(asmId)) sAttemptsByAsm.set(asmId, []);
      sAttemptsByAsm.get(asmId).push(att);
    });

    let completedAssignedCount = 0;
    let inProgressCount = 0;
    const studentDetails = [];

    assignedAssesIds.forEach(testId => {
      const test = testsMap.get(testId);
      if (!test) return;

      const asmAtts = sAttemptsByAsm.get(testId) || [];
      const isCompleted = asmAtts.some(att => {
        const st = String(att.status || '').toLowerCase();
        return validStatuses.includes(st);
      });
      const isInProgress = !isCompleted && asmAtts.some(att => {
        const st = String(att.status || '').toLowerCase();
        return st === 'in_progress';
      });

      if (isCompleted) completedAssignedCount++;
      else if (isInProgress) inProgressCount++;

      let bestScore = null;
      let bestPct = null;
      let bestAttempt = null;
      if (isCompleted) {
        asmAtts.forEach(att => {
          const st = String(att.status || '').toLowerCase();
          if (validStatuses.includes(st)) {
            const sc = Number(att.score ?? 0);
            const tq = Number(att.total_questions || att.max_score || 10);
            const rawPct = att.percentage != null ? Number(att.percentage) : (tq > 0 ? (sc / tq) * 100 : 0);
            const isRem = Boolean(att.is_remedial_unlocked);
            const maxRemPts = tq * 0.6;
            const effScore = isRem ? Math.min(sc, maxRemPts) : sc;
            const effPct = isRem ? Math.min(rawPct, 60.0) : (att.effective_score != null ? Number(att.effective_score) : rawPct);
            if (bestPct === null || effScore > (bestScore ?? -1) || (effScore === bestScore && effPct > bestPct)) {
              bestScore = effScore;
              bestPct = Math.round(effPct);
              bestAttempt = att;
            }
          }
        });
      }

      const isExam = isWeeklyExam(test);
      studentDetails.push({
        testId,
        testTitle: test.title,
        shellCode: test.shell_code || test.payload?.shell_code || '',
        isExam,
        levelNumber: test.levels?.level_number || 1,
        levelName: test.levels?.name || 'Unknown',
        is_completed: isCompleted,
        is_in_progress: isInProgress,
        bestScore,
        bestPct,
        attemptId: bestAttempt?.id || null,
        is_remedial_unlocked: Boolean(bestAttempt?.is_remedial_unlocked || bestAttempt?.is_remedial),
        is_forgiven: Boolean(bestAttempt?.is_forgiven),
        forgiven_reason: bestAttempt?.forgiven_reason || null,
        forgiven_by: bestAttempt?.forgiven_by || null,
        forgiven_at: bestAttempt?.forgiven_at || null
      });
    });

    studentDetails.sort((a, b) => {
      if (a.levelNumber !== b.levelNumber) return a.levelNumber - b.levelNumber;
      return (a.testTitle || '').localeCompare(b.testTitle || '');
    });

    // Group valid attempts by test_id and find highest score (Rule 2.7 & 2.8)
    const bestByAsm = new Map();
    studentAttempts.forEach(a => {
      const st = String(a.status || '').toLowerCase();
      if (!validStatuses.includes(st)) return;
      const asmId = a.test_id || a.Test_id;
      if (!asmId) return;

      const sc = Number(a.score ?? 0);
      const tq = Number(a.total_questions || a.max_score || 10);
      const rawPct = a.percentage != null ? Number(a.percentage) : (tq > 0 ? (sc / tq) * 100 : 0);
      const isRem = Boolean(a.is_remedial_unlocked || a.is_remedial);
      const maxRemPts = tq * 0.6;
      const effPoints = isRem ? Math.min(sc, maxRemPts) : sc;
      const effPct = isRem ? Math.min(rawPct, 60.0) : (a.effective_score != null ? Number(a.effective_score) : rawPct);

      if (!bestByAsm.has(asmId)) {
        bestByAsm.set(asmId, { score: effPoints, totalQuestions: tq, percentage: effPct, attempt: a });
      } else {
        const existing = bestByAsm.get(asmId);
        const aDate = new Date(a.submitted_at || a.created_at || 0).getTime();
        const exDate = new Date(existing.attempt?.submitted_at || existing.attempt?.created_at || 0).getTime();
        if (effPoints > existing.score) {
          bestByAsm.set(asmId, { score: effPoints, totalQuestions: tq, percentage: effPct, attempt: a });
        } else if (effPoints === existing.score && effPct > existing.percentage) {
          bestByAsm.set(asmId, { score: effPoints, totalQuestions: tq, percentage: effPct, attempt: a });
        } else if (effPoints === existing.score && aDate > exDate) {
          bestByAsm.set(asmId, { score: effPoints, totalQuestions: tq, percentage: effPct, attempt: a });
        }
      }
    });

    const completedTestsCount = completedAssignedCount;
    const completionPct = totalAssigned > 0 ? Math.min(100, Math.round((completedTestsCount / totalAssigned) * 100)) : 0;
    const latestAttempt = studentAttempts.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];

    // Authoritative Milestone Progression Engine (Rule 2.7, 2.8 & 2.10)
    // Academic Score, Grade, and Points are evaluated EXCLUSIVELY from Exams
    const studentLevelExams = (allTests || []).filter(a => {
      if (studentLevelId && a.level_id && a.level_id !== studentLevelId) return false;
      const tProg = a.program_id || classesMap.get(a.class_id)?.program_id;
      if (tProg && s.program_id && tProg !== s.program_id) return false;
      return isWeeklyExam(a);
    });

    const examMapById = new Map(studentLevelExams.map(t => [t.id, t]));
    const studentExamEntries = [];
    studentLevelExams.forEach(examTest => {
      const best = bestByAsm.get(examTest.id);
      if (best) {
        studentExamEntries.push({
          test: examTest,
          effPoints: best.score,
          effPct: best.percentage,
          totalQ: best.totalQuestions
        });
      }
    });

    // Also include any other exam attempts from bestByAsm not in studentLevelExams
    bestByAsm.forEach((best, asmId) => {
      if (!examMapById.has(asmId)) {
        const tObj = testsMap.get(asmId);
        if (tObj && isWeeklyExam(tObj)) {
          studentExamEntries.push({
            test: tObj,
            effPoints: best.score,
            effPct: best.percentage,
            totalQ: best.totalQuestions
          });
          examMapById.set(asmId, tObj);
        }
      }
    });

    const hasRemedial = Array.from(bestByAsm.values()).some(b => Boolean(b.attempt?.is_remedial_unlocked || b.attempt?.is_remedial));
    const hasForgiven = Array.from(bestByAsm.values()).some(b => Boolean(b.attempt?.is_forgiven));

    // Determine Student Level Number and Alumni status
    const studentLvlObj = levelsMap.get(studentLevelId);
    const studentLevelNum = studentLvlObj?.level_number != null ? studentLvlObj.level_number : 1;
    const isLevelX = studentLevelNum === 99
      || (studentLvlObj?.name || '').toUpperCase() === 'X'
      || (studentLvlObj?.name || '').toLowerCase() === 'alumni'
      || (s.levelName && (s.levelName.toUpperCase() === 'X' || s.levelName.toLowerCase() === 'alumni'));

    const isNonLevel = studentLevelNum === 0
      || (studentLvlObj?.name || '').toLowerCase() === 'non-level'
      || (studentLvlObj?.name || '').toLowerCase() === 'general';

    const isAlumni = isLevelX
      || (s.program_status || '').toUpperCase() === 'ALUMNI'
      || (s.program_status || '').toUpperCase() === 'GRADUATED'
      || (s.program_status || '').toUpperCase() === 'COMPLETED'
      || (s.program_status || '').toUpperCase() === 'PROGRAM_COMPLETED';

    // Find all exams required for student's current active level
    const currentLevelExams = (allTests || []).filter(t => {
      const matchLvl = (studentLevelId && t.level_id === studentLevelId) || (t.levels?.level_number === studentLevelNum);
      const tProg = t.program_id || classesMap.get(t.class_id)?.program_id;
      const matchProg = !tProg || !s.program_id || tProg === s.program_id;
      return matchLvl && matchProg && isWeeklyExam(t);
    });

    let allCurrentExamsPassed = currentLevelExams.length > 0;
    currentLevelExams.forEach(ex => {
      const best = bestByAsm.get(ex.id);
      if (!best) {
        allCurrentExamsPassed = false;
        return;
      }
      const att = best.attempt;
      const pct = best.percentage;
      const minPass = Number(ex.payload?.min_score || ex.payload?.minimum_required_score || 60);
      const isPassed = pct >= minPass || att?.is_forgiven === true || (Boolean(att?.is_remedial_unlocked || att?.is_remedial) && pct >= 60);
      if (!isPassed) allCurrentExamsPassed = false;
    });

    const isEligibleNext = !isAlumni && !isNonLevel && currentLevelExams.length > 0 && allCurrentExamsPassed;

    const allExamsList = Array.from(examMapById.values());
    const mastery = (typeof computeMilestoneExamMastery === 'function')
      ? computeMilestoneExamMastery(studentExamEntries, allExamsList.length > 0 ? allExamsList : studentLevelExams)
      : {
          totalPoints: studentExamEntries.reduce((sum, e) => sum + (e.effPoints || 0), 0),
          overallScore: 0,
          grade: '—',
          completedExamCount: studentExamEntries.length
        };

    const completedExamCount = mastery.completedExamCount ?? studentExamEntries.length;
    let overallScoreStr = '—';
    let globalGrade = '—';
    let overallColor = '#94a3b8';
    let overallPct = -1;
    let totalEarnedScore = (mastery.cumulativePoints != null ? mastery.cumulativePoints : mastery.totalPoints) || 0;

    if (isAlumni) {
      if (completedExamCount > 0) {
        overallScoreStr = `${mastery.overallScore}%`;
        globalGrade = mastery.grade;
        overallColor = (typeof getGradeColorByScore === 'function') ? getGradeColorByScore(mastery.overallScore) : (TOPSCORE_COLORS?.A || 'var(--grade-a)');
      } else {
        globalGrade = 'X';
        overallColor = TOPSCORE_COLORS?.D || 'var(--grade-d)';
      }
    } else if (completedExamCount > 0) {
      overallPct = mastery.overallScore;
      globalGrade = mastery.grade;
      const isCappedRem = hasRemedial && overallPct === 60;
      if (hasForgiven && !isCappedRem) {
        overallScoreStr = `${overallPct}%`;
        globalGrade = 'F';
      } else if (isCappedRem) {
        overallScoreStr = '60%';
        globalGrade = 'R';
      } else {
        overallScoreStr = `${overallPct}%`;
      }
      overallColor = (globalGrade === 'F' || hasForgiven) ? (TOPSCORE_COLORS?.E || 'var(--grade-e)') : (globalGrade === 'R' ? (TOPSCORE_COLORS?.C || 'var(--grade-c)') : (typeof getGradeColorByScore === 'function'
        ? getGradeColorByScore(overallPct)
        : (typeof getGradeColor === 'function' ? getGradeColor(globalGrade) : TOPSCORE_COLORS.STAR)));
    }

    // ── Per-Class Stats (User Directive: 4 Exam columns matching each theme's total exam points) ──
    const perClassFinal = new Map();

    classesMap.forEach((cls, cId) => {
      // Strict Tenant Isolation: Only evaluate classes that belong to student's program and current program
      if (cls.program_id && s.program_id && cls.program_id !== s.program_id) return;
      if (currentProgramId && cls.program_id && cls.program_id !== currentProgramId) return;
      if (cls.institution_id && s.institution_id && cls.institution_id !== s.institution_id) return;

      const classAllTests = testsByClass.get(cId) || [];
      if (classAllTests.length === 0) return;

      const classExams = classAllTests.filter(t => isWeeklyExam(t));
      const targetExams = classExams.length > 0 ? classExams : classAllTests;

      // Group exams into 4 themes: A (Exam 1), B (Exam 2), C (Exam 3), D (Exam 4)
      const themeCodes = ['A', 'B', 'C', 'D'];
      const themePoints = {};
      const themeScores = {};
      let totalExamPts = 0;
      let hasAnyExamAtt = false;

      themeCodes.forEach(tc => {
        const examsInTheme = targetExams.filter(t =>
          t.payload?.theme_code === tc ||
          (t.shell_code && (t.shell_code.includes(`-${tc}-`) || t.shell_code.startsWith(`3${tc}-`)))
        );

        let earned = 0;
        let hasAttInTheme = false;
        let studentThemeMaxQ = 0;
        examsInTheme.forEach(ex => {
          const best = bestByAsm.get(ex.id);
          let maxQ = Number(ex.payload?.total_questions || ex.total_questions || 0);
          if (!maxQ || maxQ <= 0) {
            const isPhrase = ex.payload?.category === 'phrases' || /PHRASES/i.test(ex.shell_code || '') || /phrase/i.test(ex.title || '');
            if (tc === 'A') maxQ = isPhrase ? 30 : 120;
            else if (tc === 'B') maxQ = isPhrase ? 70 : 280;
            else if (tc === 'C') maxQ = isPhrase ? 120 : 480;
            else if (tc === 'D') maxQ = isPhrase ? 160 : 640;
            else maxQ = isPhrase ? 30 : 120;
          }

          if (best && best.score != null) {
            hasAttInTheme = true;
            earned += Number(best.score);
            studentThemeMaxQ += (best.totalQuestions ? Number(best.totalQuestions) : maxQ);
          }
        });

        if (hasAttInTheme) {
          hasAnyExamAtt = true;
          const cleanEarned = Math.round(earned * 10) / 10;
          themePoints[tc] = cleanEarned;
          const themePct = studentThemeMaxQ > 0 ? Math.round((cleanEarned / studentThemeMaxQ) * 100) : 0;
          themeScores[tc] = themePct;
          totalExamPts += cleanEarned;
        } else {
          themePoints[tc] = null;
          themeScores[tc] = null;
        }
      });

      // Also map discrete tests for this class (supports classes with custom/small test suites)
      const testScoresMap = new Map();
      let hasAnyTestAtt = false;
      classAllTests.forEach(t => {
        const best = bestByAsm.get(t.id);
        if (best && best.score != null) {
          hasAnyTestAtt = true;
          const maxQ = Number(best.totalQuestions || t.payload?.total_questions || t.total_questions || 40);
          testScoresMap.set(t.id, {
            // Rule 2.10: Points Half-Up Whole Integer Invariant (Math.round)
            pts: Math.round(Number(best.score)),
            pct: Number(best.percentage != null ? best.percentage : (maxQ > 0 ? (best.score / maxQ) * 100 : 0)),
            maxQ
          });
        }
      });

      // Does the student have any activity or enrollment in this class?
      const hasAttemptsInClass = studentAttempts.some(a => {
        const tObj = testsMap.get(a.test_id);
        return (tObj?.class_id || a.tests?.class_id) === cId;
      });
      const hasProgressInClass = (allProgress || []).some(p => p.student_id === s.id && p.class_id === cId);
      const isEnrolledInClass = hasAttemptsInClass || hasProgressInClass;

      if (!isEnrolledInClass && !hasAnyExamAtt && !hasAnyTestAtt) {
        return; // Student doesn't belong to this class, leave undefined so table shows '—'
      }

      perClassFinal.set(cId, {
        themes: themePoints,
        themeScores: themeScores,
        // Rule 2.10: Points Half-Up Whole Integer Invariant (Math.round)
        totalPts: (hasAnyExamAtt || hasAnyTestAtt) ? Math.round(totalExamPts) : null,
        testScores: testScoresMap
      });
    });


    // Compute age from birth_date
    let ageDisplay = '—';
    if (s.birth_date) {
      const bd = new Date(s.birth_date);
      if (!isNaN(bd.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - bd.getFullYear();
        const m = today.getMonth() - bd.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
        if (age && age > 0) ageDisplay = String(age);
      }
    }

    // Determine remediation pending
    const remediationPending = studentAttempts
      .filter(a => {
        const st = String(a.status || '').toLowerCase();
        return validStatuses.includes(st) && a.tests?.test_type === 'EXAM';
      })
      .some(a => {
        const maxVal = a.total_questions || a.max_score || 0;
        if (!maxVal) return false;
        const pct = a.percentage != null ? parseFloat(a.percentage) : Math.round(((a.score || 0) / maxVal) * 100);
        return pct < 60 && !a.is_remedial_unlocked;
      });

    const studentProgs = (allProgress || []).filter(p => p.student_id === s.id);
    let levelName = '—';
    if (isAlumni) {
      levelName = 'X';
    } else if (s.level_id) {
      const lvlObj = levelsMap.get(s.level_id);
      levelName = lvlObj ? lvlObj.name : '—';
    } else {
      const batchLevelId = s.batches?.current_level_id;
      const batchLevel = batchLevelId ? levelsMap.get(batchLevelId) : null;
      levelName = batchLevel ? batchLevel.name : '—';
    }

    // Detect orphaned students (batch/program/institution inactive or missing)
    // Note: Alumni students are graduated, not orphaned/disconnected
    const isOrphaned = !isAlumni && (
      !s.program_id
      || (s.institutions && s.institutions.is_active === false)
      || (s.programs && s.programs.is_active === false)
      || (s.batches && s.batches.is_active === false)
      || (s.batch_id && !s.batches)
    );

    // Join date
    let joinDate = '—';
    if (s.created_at) {
      try {
        const d = new Date(s.created_at);
        joinDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch { joinDate = '—'; }
    }

    let localDemographics = {};
    try {
      const cache = JSON.parse(localStorage.getItem('topscore_student_demographics_fallback') || '{}');
      if (cache[s.id]) localDemographics = cache[s.id];
    } catch (_) {}

    const studentProvince = (localDemographics.province || s.province || '').trim();
    const studentCity = (localDemographics.city || s.city || '').trim();
    const studentDistrict = (localDemographics.district || s.district || '').trim();
    const studentVillage = (localDemographics.village || s.village || '').trim();

    const sAcademicMap = academicByStudent.get(s.id) || new Map();
    const sFinalExam = finalExamsByStudent.get(s.id) || null;

    // Build authoritative 3-Step academic assessment summaries
    const stepSummaries = {};
    [1, 2, 3].forEach(stepNum => {
      // 1. Vocab NA (Strictly preserve existing system test attempts)
      let naVocab = null;
      const vocabCode = `CAMP-${stepNum}VOCAB`;
      let vocabClass = null;
      for (const c of classesMap.values()) {
        if ((c.code || '').toUpperCase().replace(/^CMP-/, 'CAMP-') === vocabCode) {
          vocabClass = c;
          break;
        }
      }
      if (vocabClass && perClassFinal.has(vocabClass.id)) {
        const cs = perClassFinal.get(vocabClass.id);
        const themeScores = Object.values(cs.themeScores || {}).filter(v => typeof v === 'number');
        if (themeScores.length > 0) {
          naVocab = Math.round((themeScores.reduce((a, b) => a + b, 0) / themeScores.length) * 100) / 100;
        }
      }
      if (naVocab == null) {
        const vKey = `${stepNum}:VOCABULARY:NA`;
        const vObj = sAcademicMap.get(vKey);
        if (vObj?.percentage != null) naVocab = Number(vObj.percentage);
        else if (sFinalExam?.vocab_score != null && stepNum === 1) naVocab = Number(sFinalExam.vocab_score);
      }

      // 2. Storytelling NA
      const storyKeys = ['W1', 'W2', 'W3', 'W4'].map(k => sAcademicMap.get(`${stepNum}:STORYTELLING:${k}`)).filter(x => x?.percentage != null);
      const naStory = storyKeys.length > 0 ? Math.round((storyKeys.reduce((acc, x) => acc + Number(x.percentage), 0) / storyKeys.length) * 100) / 100 : null;

      // 3. Grammar NA
      const gramKeys = ['U1', 'U2'].map(k => sAcademicMap.get(`${stepNum}:GRAMMAR:${k}`)).filter(x => x?.percentage != null);
      const naGram = gramKeys.length > 0 ? Math.round((gramKeys.reduce((acc, x) => acc + Number(x.percentage), 0) / gramKeys.length) * 100) / 100 : null;

      // 4. 4th Subject NA
      const fourthSubjCode = stepNum === 1 ? 'BASIC' : (stepNum === 2 ? 'GFS' : 'PRONUNCIATION');
      const fourthKeys = ['U1', 'U2'].map(k => sAcademicMap.get(`${stepNum}:${fourthSubjCode}:${k}`)).filter(x => x?.percentage != null);
      const naFourth = fourthKeys.length > 0 ? Math.round((fourthKeys.reduce((acc, x) => acc + Number(x.percentage), 0) / fourthKeys.length) * 100) / 100 : null;

      // 5. Speaking NA
      const spkSubKeys = stepNum === 1 ? ['U1', 'U2', 'PRACTICE'] : (stepNum === 2 ? ['U1', 'U2'] : ['U1', 'U2', 'U3']);
      const speakKeys = spkSubKeys.map(k => sAcademicMap.get(`${stepNum}:SPEAKING:${k}`)).filter(x => x?.percentage != null);
      const naSpeak = speakKeys.length > 0 ? Math.round((speakKeys.reduce((acc, x) => acc + Number(x.percentage), 0) / speakKeys.length) * 100) / 100 : null;

      // Step Average & Predicate
      const validNAs = [naVocab, naStory, naGram, naFourth, naSpeak].filter(v => typeof v === 'number');
      const stepAvg = validNAs.length > 0 ? Math.round((validNAs.reduce((a, b) => a + b, 0) / validNAs.length) * 100) / 100 : null;
      const predicate = stepAvg != null ? (typeof getCertificatePredicate === 'function' ? getCertificatePredicate(stepAvg) : (stepAvg >= 90 ? 'EXCELLENT' : stepAvg >= 80 ? 'VERY GOOD' : stepAvg >= 70 ? 'GOOD' : stepAvg >= 60 ? 'ENOUGH' : 'LESS')) : '—';

      stepSummaries[stepNum] = {
        naVocab,
        naStory,
        naGram,
        naFourth,
        naSpeak,
        stepAvg,
        predicate
      };
    });

    const rowObj = {
      ...s,
      academicMap: sAcademicMap,
      finalExam: sFinalExam,
      stepSummaries: stepSummaries,
      program_status: (isLevelX || isAlumni) ? 'ALUMNI' : (s.program_status || 'ACTIVE'),
      birthplace: s.birthplace || '',
      province: studentProvince,
      city: studentCity,
      district: studentDistrict,
      village: studentVillage,
      displayName: cleanStudentName(s.name),
      sortName: cleanStudentName(s.name).toLowerCase(),
      ageDisplay,
      instName: s.institutions?.name || (s.institution_id ? 'Unknown Institution' : '—'),
      progName: s.programs?.name || (s.program_id ? 'Unknown Program' : '—'),
      batchName: s.batches?.name || (s.batch_id ? 'Unknown Batch' : '— No Batch —'),
      levelName,
      pin: s.pin || (s.pin_hash === '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' ? '1234' : '——'),
      pinDisplay: s.pin || (s.pin_hash === '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' ? '1234' : '——'),
      totalAssigned,
      completedTests: completedTestsCount,
      completedExamCount,
      totalEarnedScore,
      inProgressCount,
      completionPct,
      details: studentDetails,
      latestActivity: latestAttempt ? new Date(latestAttempt.created_at).toLocaleDateString() : 'Never',
      overallScoreStr,
      overallPct,
      globalGrade,
      overallColor,
      hasRemedial,
      hasForgiven,
      isAlumni,
      studentLevelNum,
      isEligibleNext,
      activeLevelExamsCount: currentLevelExams.length,
      remediationPending,
      isOrphaned,
      joinDate,
      phone: s.phone || s.phone_number || '—',
      email: s.email || '—',
      perClassFinal   // Map<classId, {themes, totalPts}>
    };

    // Flatten per-class metrics so DataGrid can search & sort seamlessly
    perClassFinal.forEach((cs, cId) => {
      rowObj[`_cls_exam1_${cId}`] = cs.themes?.['A'] ?? -1;
      rowObj[`_cls_exam2_${cId}`] = cs.themes?.['B'] ?? -1;
      rowObj[`_cls_exam3_${cId}`] = cs.themes?.['C'] ?? -1;
      rowObj[`_cls_exam4_${cId}`] = cs.themes?.['D'] ?? -1;
      rowObj[`_cls_pts_${cId}`] = cs.totalPts ?? -1;
      if (cs.testScores) {
        cs.testScores.forEach((tVal, tId) => {
          rowObj[`_cls_test_${cId}_${tId}`] = tVal.pts ?? -1;
          rowObj[`_cls_test_${cId}_${tId}_pct`] = tVal.pct ?? 0;
        });
      }
    });

    // Flatten Camp Raport & Final Exam metrics onto rowObj for sorting & searching
    [1, 2, 3].forEach(stepNum => {
      const sum = stepSummaries[stepNum];
      if (sum) {
        rowObj[`_camp_sum_${stepNum}_avg`] = sum.stepAvg ?? -1;
        rowObj[`_camp_sum_${stepNum}_prd`] = sum.predicate ?? '';
        rowObj[`_camp_vcb_${stepNum}_na`] = sum.naVocab ?? -1;
        rowObj[`_camp_stt_${stepNum}_na`] = sum.naStory ?? -1;
        rowObj[`_camp_grm_${stepNum}_na`] = sum.naGram ?? -1;
        rowObj[`_camp_fourth_${stepNum}_na`] = sum.naFourth ?? -1;
        rowObj[`_camp_spk_${stepNum}_na`] = sum.naSpeak ?? -1;
      }
    });
    if (sFinalExam) {
      rowObj['_fe_ex_tot'] = sFinalExam.examiner_total ?? -1;
      rowObj['_fe_tu_tot'] = sFinalExam.tutor_total ?? -1;
      rowObj['_fe_prc'] = sFinalExam.practice_score ?? -1;
      rowObj['_fe_prc_prd'] = sFinalExam.practice_predicate ?? '';
      rowObj['_fe_cum_spk'] = sFinalExam.speaking_score ?? -1;
      rowObj['_fe_cum_vcb'] = sFinalExam.vocab_score ?? -1;
      rowObj['_fe_cum_prn'] = sFinalExam.pronunciation_score ?? -1;
      rowObj['_fe_cum_grm'] = sFinalExam.grammar_score ?? -1;
      rowObj['_fe_cert_final'] = sFinalExam.final_score ?? -1;
      rowObj['_fe_cert_prd'] = sFinalExam.certificate_predicate ?? '';
      rowObj['_fe_cert_nis'] = sFinalExam.certificate_nis ?? '';
      rowObj['_fe_cert_mo'] = sFinalExam.certificate_month ?? '';
      rowObj['_fe_cert_yr'] = sFinalExam.certificate_year ?? -1;
      rowObj['_fe_cert_stat'] = sFinalExam.status ?? '';
    }

    return rowObj;
  });

  // Hierarchical sort comparator: Active first, then Institution -> Program -> Batch -> Level -> Name (A-Z)
  gridData.sort(compareStudentsHierarchical);

  // Synchronize sidebar active state for program/batch items
  if (!isAlumniPanel) {
    document.querySelectorAll('.sidebar-program-item').forEach(i => {
      const matchesBatch = window._filterBatchId && i.getAttribute('data-batch-id') === window._filterBatchId;
      const matchesProg = !window._filterBatchId && i.getAttribute('data-program-id') === currentProgramId;
      i.classList.toggle('active', !!(matchesBatch || matchesProg));
    });
  }
  const topbarTitle = document.getElementById('topbar-title');
  if (topbarTitle) {
    if (isAlumniPanel) {
      topbarTitle.textContent = 'Alumni';
    } else {
      const curBatch = (allBatches || []).find(b => b.id === window._filterBatchId);
      const batchLabel = curBatch ? (curBatch.name.toLowerCase().startsWith((window._selectedProgramName || '').toLowerCase()) ? curBatch.name : `${window._selectedProgramName} ${curBatch.name}`) : window._selectedProgramName;
      topbarTitle.textContent = window._selectedSidebarLabel || batchLabel || window._selectedProgramName || 'Students';
    }
  }

  // Interactive Status Filter Classifications
  const isStudentAlumni = s => Boolean(
    s.isAlumni
    || s.studentLevelNum === 99
    || s.levelName === 'X'
    || (s.levelName && s.levelName.toLowerCase() === 'alumni')
    || (s.program_status || '').toUpperCase() === 'ALUMNI'
    || (s.program_status || '').toUpperCase() === 'GRADUATED'
    || (s.program_status || '').toUpperCase() === 'COMPLETED'
    || (s.program_status || '').toUpperCase() === 'PROGRAM_COMPLETED'
  );
  const isStudentInactive = s => !isStudentAlumni(s) && (((s.batches ? s.batches.is_active === false : false) || ((s._raw || s).is_active === false) || (s.program_status || '').toUpperCase() === 'INACTIVE' || (s.program_status || '').toUpperCase() === 'HOLD'));
  const isStudentActive = s => !isStudentAlumni(s) && !isStudentInactive(s);
  const isStudentHoldOrInactive = isStudentInactive; // SSOT: hold is redundant, hold == inactive

  // Determine current status tab (SSOT: Active vs Inactive vs All)
  let currentBatchStatus = 'active';
  if (isAlumniPanel) {
    currentBatchStatus = 'alumni';
  } else {
    const rawStatus = window._filterBatchStatus;
    if (rawStatus === 'inactive' || rawStatus === 'hold_inactive' || rawStatus === 'hold') {
      currentBatchStatus = 'inactive';
    } else if (rawStatus === 'all') {
      currentBatchStatus = 'all';
    } else {
      currentBatchStatus = 'active';
    }
  }

  // Filter students strictly by active program unless in Alumni main panel (where all alumni across programs are shown)
  const programStudents = isAlumniPanel ? gridData : (currentProgramId ? gridData.filter(s => s.program_id === currentProgramId) : gridData);

  // Scope students strictly by the active batch if selected, or all alumni in alumni panel
  const rosterScopeStudents = isAlumniPanel
    ? programStudents
    : (window._filterBatchId
      ? programStudents.filter(s => s.batch_id === window._filterBatchId)
      : programStudents.filter(s => (s.batches ? s.batches.is_active !== false : true)));

  const filteredGridData = rosterScopeStudents.filter(s => {
    if (isAlumniPanel) {
      if (!isStudentAlumni(s)) return false;
      if (window._alumniFilterProgramId && window._alumniFilterProgramId !== 'all') {
        if (s.program_id !== window._alumniFilterProgramId) return false;
      }
      if (window._alumniFilterBatchId && window._alumniFilterBatchId !== 'all') {
        return s.batch_id === window._alumniFilterBatchId;
      }
      return true;
    }
    if (currentBatchStatus === 'active') {
      return isStudentActive(s);
    }
    if (currentBatchStatus === 'inactive' || currentBatchStatus === 'hold_inactive') {
      return isStudentInactive(s);
    }
    return !isStudentAlumni(s); // 'all' active and inactive students in this batch
  });
  window._currentStudentsGridData = filteredGridData;

  // Batches belonging to current active program
  const programBatches = (allBatches || []).filter(b => b.program_id === currentProgramId);

  const remediationPendingCount = filteredGridData.filter(s => s.remediationPending).length;

  // Update sidebar badge
  const rosterNavBtn = document.querySelector(`.sidebar-program-item[data-program-id="${currentProgramId}"]`) || document.querySelector('.admin-nav-item[data-sub="students"]');
  if (rosterNavBtn && !isAlumniPanel) {
    const existingBadge = rosterNavBtn.querySelector('.remediation-sidebar-badge');
    if (existingBadge) existingBadge.remove();
    if (remediationPendingCount > 0) {
      rosterNavBtn.insertAdjacentHTML('beforeend', `<span class="remediation-sidebar-badge badge badge-warning" style="margin-left:auto;font-size: 12px;padding:0.1rem 0.3rem;">${remediationPendingCount}</span>`);
    }
  }

  window._switchStudentRosterStatus = (statusId) => {
    window._filterBatchStatus = statusId;
    try {
      localStorage.setItem('topscore_student_status_tab', statusId);
      const url = new URL(window.location.href);
      url.searchParams.set('status', statusId);
      window.history.replaceState(null, '', url.toString());
    } catch (e) {}
    renderStudents(area, { isAlumniPanel });
  };

  // Keyboard Quick-Switch (Hotkeys: 1 for Data, 2 for Raport, 3 for Hold & Inactive, 4 for All)
  if (!window._rosterHotkeysBound) {
    window._rosterHotkeysBound = true;
    window.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (window._currentSection !== 'students' && window._activeSectionAlias !== 'students' && window._currentSection !== 'alumni') return;

      if (e.key === '1') {
        window._switchStudentRosterTab('data');
        showToast('Tab: Students Data', 'info');
      } else if (e.key === '2') {
        window._switchStudentRosterTab('raport');
        showToast("Tab: Student's Raport", 'info');
      } else if (e.key === '3') {
        window._switchStudentRosterTab('inactive');
        showToast('Tab: Inactive', 'info');
      } else if (e.key === '4') {
        window._switchStudentRosterTab('all');
        showToast('Tab: All Students', 'info');
      }
    });
  }

  if (isAlumniPanel) {
    const allAlumni = gridData.filter(isStudentAlumni);
    const totalAlumni = allAlumni.length;

    // Detect alumni distribution per program
    const alumniProgramCounts = new Map();
    allAlumni.forEach(s => {
      const pId = s.program_id || 'unknown';
      alumniProgramCounts.set(pId, (alumniProgramCounts.get(pId) || 0) + 1);
    });

    const activeAlumniProgId = window._alumniFilterProgramId || 'all';

    // Sort programs alphabetically by name (User directive: "urutkan panel dengan cra nama program dengan alpabet")
    const relevantPrograms = (allPrograms || []).filter(p => {
      return alumniProgramCounts.has(p.id) || p.is_active !== false;
    }).sort((a, b) => {
      return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    });

    window._switchAlumniProgram = (progId) => {
      window._alumniFilterProgramId = progId;
      window._alumniFilterBatchId = 'all';
      try {
        localStorage.setItem('topscore_alumni_program_id', progId);
      } catch (_) {}
      renderStudents(area, { isAlumniPanel });
    };

    // User directive: "urutkan panel dengan cra nama program dengan alpabet, tapi all alumni taruh paling akhir"
    const alumniTopTabs = [
      ...relevantPrograms.map(p => {
        const count = alumniProgramCounts.get(p.id) || 0;
        return {
          id: p.id,
          icon: getSvgIcon('book-open', 14),
          label: p.name,
          val: count,
          valColor: count > 0 ? 'var(--clr-accent-1, #38bdf8)' : '#94a3b8'
        };
      }),
      {
        id: 'all',
        icon: getSvgIcon('graduation-cap', 14),
        label: 'All Alumni',
        val: totalAlumni,
        valColor: 'var(--quad-d)'
      }
    ];

    if (window.setTopbarTabs) {
      window.setTopbarTabs(alumniTopTabs, activeAlumniProgId, 'window._switchAlumniProgram');
    }
  } else {
    const activeCount = rosterScopeStudents.filter(isStudentActive).length;
    const inactiveCount = rosterScopeStudents.filter(isStudentInactive).length;
    const totalCount = rosterScopeStudents.filter(s => !isStudentAlumni(s)).length;

    if (!window._studentRosterTab) {
      try {
        window._studentRosterTab = localStorage.getItem('topscore_student_roster_tab') || 'data';
      } catch (_) {
        window._studentRosterTab = 'data';
      }
    }

    if (isCampProgram) {
      if (!window._raportPage) {
        try {
          window._raportPage = parseInt(localStorage.getItem('topscore_student_raport_page') || '1', 10);
        } catch (_) {
          window._raportPage = 1;
        }
        if (![1, 2, 3].includes(window._raportPage)) window._raportPage = 1;
      }
      if (!window._attendancePage) {
        try {
          window._attendancePage = parseInt(localStorage.getItem('topscore_student_attendance_page') || '1', 10);
        } catch (_) {
          window._attendancePage = 1;
        }
        if (![1, 2, 3].includes(window._attendancePage)) window._attendancePage = 1;
      }
    }

    const activeRaportTabId = `raport-${window._raportPage || 1}`;
    const activeAttendanceTabId = `attendance-${window._attendancePage || 1}`;
    const currentTabId = (currentBatchStatus === 'active')
      ? (window._studentRosterTab === 'attendance'
          ? (isCampProgram ? activeAttendanceTabId : 'attendance')
          : (window._studentRosterTab === 'final-exam'
              ? 'final-exam'
              : (window._studentRosterTab === 'raport' ? (isCampProgram ? activeRaportTabId : 'raport') : 'data')))
      : (currentBatchStatus === 'hold_inactive' ? 'inactive' : currentBatchStatus);

    window._switchRaportPage = (pageNum) => {
      window._raportPage = Number(pageNum) || 1;
      try {
        localStorage.setItem('topscore_student_raport_page', String(window._raportPage));
      } catch (_) {}
      if (window._studentRosterTab !== 'raport') {
        window._studentRosterTab = 'raport';
        try { localStorage.setItem('topscore_student_roster_tab', 'raport'); } catch (_) {}
      }
      renderStudents(area, { isAlumniPanel });
    };

    window._switchAttendancePage = (pageNum) => {
      window._attendancePage = Number(pageNum) || 1;
      try {
        localStorage.setItem('topscore_student_attendance_page', String(window._attendancePage));
      } catch (_) {}
      if (window._studentRosterTab !== 'attendance') {
        window._studentRosterTab = 'attendance';
        try { localStorage.setItem('topscore_student_roster_tab', 'attendance'); } catch (_) {}
      }
      renderStudents(area, { isAlumniPanel });
    };

    window._switchStudentRosterTab = (tabId) => {
      if (tabId === 'data') {
        window._studentRosterTab = 'data';
        window._filterBatchStatus = 'active';
      } else if (tabId === 'raport' || tabId === 'raport-1' || tabId === 'raport-2' || tabId === 'raport-3') {
        window._studentRosterTab = 'raport';
        window._filterBatchStatus = 'active';
        if (tabId === 'raport-1') window._raportPage = 1;
        else if (tabId === 'raport-2') window._raportPage = 2;
        else if (tabId === 'raport-3') window._raportPage = 3;
        try {
          localStorage.setItem('topscore_student_raport_page', String(window._raportPage || 1));
        } catch (_) {}
      } else if (tabId === 'final-exam') {
        window._studentRosterTab = 'final-exam';
        window._filterBatchStatus = 'active';
      } else if (tabId === 'attendance' || tabId === 'attendance-1' || tabId === 'attendance-2' || tabId === 'attendance-3') {
        window._studentRosterTab = 'attendance';
        window._filterBatchStatus = 'active';
        if (tabId === 'attendance-1') window._attendancePage = 1;
        else if (tabId === 'attendance-2') window._attendancePage = 2;
        else if (tabId === 'attendance-3') window._attendancePage = 3;
        try {
          localStorage.setItem('topscore_student_attendance_page', String(window._attendancePage || 1));
        } catch (_) {}
      } else if (tabId === 'inactive' || tabId === 'hold_inactive') {
        window._filterBatchStatus = 'inactive';
      } else if (tabId === 'all') {
        window._filterBatchStatus = 'all';
      }
      try {
        localStorage.setItem('topscore_student_roster_tab', window._studentRosterTab || 'data');
        localStorage.setItem('topscore_student_roster_status', window._filterBatchStatus || 'active');
      } catch (_) {}
      renderStudents(area, { isAlumniPanel });
    };
    window._switchStudentRosterStatus = window._switchStudentRosterTab;

    if (window.setTopbarTabs) {
      const topTabs = [
        { id: 'data', icon: getSvgIcon('user', 14), label: 'Students Data', val: activeCount, valColor: 'var(--clr-accent-1, #38bdf8)' },
        ...(isCampProgram ? [
          { id: 'raport-1', icon: getSvgIcon('award', 14), label: "1st Raport", val: '1st', valColor: (window._raportPage === 1 && window._studentRosterTab === 'raport') ? 'var(--grade-b)' : '#94a3b8' },
          { id: 'raport-2', icon: getSvgIcon('award', 14), label: "2nd Raport", val: '2nd', valColor: (window._raportPage === 2 && window._studentRosterTab === 'raport') ? 'var(--grade-b)' : '#94a3b8' },
          { id: 'raport-3', icon: getSvgIcon('award', 14), label: "3rd Raport", val: '3rd', valColor: (window._raportPage === 3 && window._studentRosterTab === 'raport') ? 'var(--grade-b)' : '#94a3b8' },
          { id: 'final-exam', icon: getSvgIcon('check-circle', 14), label: "Final Exam & Certificate", val: 'FINAL', valColor: (window._studentRosterTab === 'final-exam') ? 'var(--primary-tactical, #38bdf8)' : '#94a3b8' },
          { id: 'attendance-1', icon: getSvgIcon('clock', 14), label: "1st Attendance", val: '1st', valColor: (window._attendancePage === 1 && window._studentRosterTab === 'attendance') ? 'var(--primary-tactical, #38bdf8)' : '#94a3b8' },
          { id: 'attendance-2', icon: getSvgIcon('clock', 14), label: "2nd Attendance", val: '2nd', valColor: (window._attendancePage === 2 && window._studentRosterTab === 'attendance') ? 'var(--primary-tactical, #38bdf8)' : '#94a3b8' },
          { id: 'attendance-3', icon: getSvgIcon('clock', 14), label: "3rd Attendance", val: '3rd', valColor: (window._attendancePage === 3 && window._studentRosterTab === 'attendance') ? 'var(--primary-tactical, #38bdf8)' : '#94a3b8' }
        ] : [
          { id: 'raport', icon: getSvgIcon('award', 14), label: "Student's Raport", val: activeCount, valColor: 'var(--grade-b)' },
          { id: 'attendance', icon: getSvgIcon('clock', 14), label: 'Batch Attendance', val: activeCount, valColor: 'var(--primary-tactical, #38bdf8)' }
        ]),
        { id: 'inactive', icon: getSvgIcon('alert-circle', 14), label: 'Inactive', val: inactiveCount, valColor: 'var(--grade-e)' },
        { id: 'all', icon: getSvgIcon('users', 14), label: 'All Students', val: totalCount, valColor: '#94a3b8' }
      ];
      window.setTopbarTabs(topTabs, currentTabId, 'window._switchStudentRosterTab');
    }
  }

  const alumniBatches = (allBatches || []).filter(b => {
    if (window._alumniFilterProgramId && window._alumniFilterProgramId !== 'all') {
      return b.program_id === window._alumniFilterProgramId;
    }
    return !currentProgramId || b.program_id === currentProgramId;
  });
  const alumniBatchOptions = alumniBatches.map(b => `<option value="${b.id}" ${window._alumniFilterBatchId === b.id ? 'selected' : ''}>${b.name}</option>`).join('');

  // Raised Table Layout (User Directive: Strip bulky header & middle filter bar; table header sits directly beneath top panel)
  area.innerHTML = `
    ${totalDuplicates > 0 ? `
      <div class="mb-3 p-3 rounded d-flex align-center justify-between" style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);color:#fef3c7;">
        <div class="d-flex align-center gap-3">
          <span>${getSvgIcon('alert-triangle', 20)}</span>
          <div>
            <div class="fw-700 text-sm">Detected ${totalDuplicates} Duplicate Student Profiles</div>
            <div class="text-xs text-muted" style="color:rgba(255,255,255,0.85)!important;">
              Found ${duplicateGroups.length} groups of duplicate student profiles. Merge them to unify their Test progress.
            </div>
          </div>
        </div>
        <button class="btn btn-warning btn-sm" id="btn-banner-merge-duplicates" style="background:var(--grade-c);color:#0f172a;font-weight:700;border:none;display:inline-flex;align-items:center;gap:6px;">
          ${getSvgIcon('alert-triangle', 14)} Resolve All Duplicates
        </button>
      </div>
    ` : ''}

    <div id="student-grid-container" style="flex:1 1 0; min-height:0; margin-bottom:10px; display:flex; flex-direction:column;"></div>

  `;

  // ── Canonical Bottom Infobar (single sub-panel, always visible) ──────────────
  function syncStudentRosterBottomInfobar() {
    if (typeof window.setBottomInfobar !== 'function') return;
    const count = filteredGridData.length;
    const eligibleStudents = filteredGridData.filter(s => s.isEligibleNext && !s.isAlumni && s.studentLevelNum !== 0 && s.studentLevelNum !== 99);
    const eligibleCount = eligibleStudents.length;

    const leftHtml = `<div style="display:inline-flex;align-items:center;gap:8px;font-size: 12px;color:#94a3b8;font-weight:600;">
      <span>${currentBatchStatus === 'alumni' ? `${getSvgIcon('graduation-cap', 12)} Graduating Batch:` : 'Enrolled:'} <strong style="color:#f8fafc;">${count} Student${count !== 1 ? 's' : ''}</strong></span>
      ${currentBatchStatus === 'alumni' ? `<select id="select-alumni-batch-infobar" style="background:#1e293b;color:#f8fafc;border:1px solid #334155;border-radius:4px;padding:2px 8px;font-size: 12px;height:28px;min-width:170px;">
        <option value="all" ${(!window._alumniFilterBatchId || window._alumniFilterBatchId === 'all') ? 'selected' : ''}>All Graduating Batches</option>
        ${alumniBatchOptions}
      </select>` : ''}
    </div>`;

    const nextBtnStyle = eligibleCount > 0
      ? 'background:rgba(0,192,0,0.18);border:1.5px solid var(--grade-a);color:var(--grade-a);box-shadow:0 0 10px rgba(0,192,0,0.35);'
      : 'background:#1e293b;border:1px solid #334155;color:#94a3b8;';
    const nextBtnTitle = eligibleCount > 0
      ? `Promote ${eligibleCount} eligible student(s) to next level or Alumni`
      : 'Click to view promotion requirements and pending exam progress';

    const isEditOn = typeof window.getGlobalEditMode === 'function' ? window.getGlobalEditMode() : false;
    const editBtnStyle = isEditOn
      ? 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:#0284c7;border:1px solid #38bdf8;color:#ffffff;box-shadow:0 0 10px rgba(56,189,248,0.45);transition:all 0.15s ease;'
      : 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:transparent;border:1px solid #38bdf8;color:#38bdf8;transition:all 0.15s ease;';
    const editBtnLabel = isEditOn
      ? `${getSvgIcon('check-circle', 14)} Done Editing`
      : `${getSvgIcon('edit', 14)} Edit Mode`;

    const rightHtml = `<div style="display:inline-flex;align-items:center;gap:8px;overflow-y:hidden;">
      <button type="button" class="btn btn-sm" id="btn-toggle-roster-edit-mode" style="${editBtnStyle}" title="Toggle Inline Edit Mode (Excel Gridlines)">${editBtnLabel}</button>
      ${currentBatchStatus !== 'alumni' ? `
        <button type="button" class="btn btn-success btn-sm" id="btn-promote-all-eligible" style="${nextBtnStyle}height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 10px !important;font-size: 12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;" title="${nextBtnTitle}">${getSvgIcon('chevrons-up', 14)} LEVEL UP ALL (${eligibleCount} Eligible)</button>
      ` : ''}
      <button type="button" class="btn btn-tactical btn-sm" id="btn-add-student-direct" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 10px !important;font-size: 12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;" title="Register New Student">${getSvgIcon('plus', 14)} Add Student</button>
      <button type="button" class="btn btn-secondary btn-sm" id="btn-import-students-direct" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 10px !important;font-size: 12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;" title="Import Students from Excel / CSV">${getSvgIcon('upload', 14)} Import Excel / CSV</button>
    </div>`;

    const isRaportTabActive = (window._studentRosterTab === 'raport');
    const isFinalExamActive = (window._studentRosterTab === 'final-exam');
    let centerHtml = '';
    if (isRaportTabActive && isCampProgram) {
      centerHtml = `
      <div class="raport-page-switcher" style="display:inline-flex;align-items:center;gap:4px;background:#0b1324;border:1.5px solid #334155;border-radius:6px;padding:2px 6px;height:30px;box-sizing:border-box;">
        <span style="font-size:12px;font-weight:800;color:#94a3b8;letter-spacing:0.04em;margin-right:2px;">RAPORT:</span>
        <button type="button" class="btn btn-sm" onclick="event.stopPropagation();if(typeof window._switchRaportPage==='function')window._switchRaportPage(1);" style="height:24px;line-height:22px;padding:0 8px;font-size:12px;font-weight:800;border-radius:4px;cursor:pointer;transition:all 0.15s ease;${window._raportPage === 1 ? 'background:var(--grade-b);color:#0f172a;border:none;box-shadow:0 0 8px rgba(149,255,0,0.4);' : 'background:transparent;color:#94a3b8;border:1px solid #334155;'}" title="1st Level Raport (5 Classes)">1st</button>
        <button type="button" class="btn btn-sm" onclick="event.stopPropagation();if(typeof window._switchRaportPage==='function')window._switchRaportPage(2);" style="height:24px;line-height:22px;padding:0 8px;font-size:12px;font-weight:800;border-radius:4px;cursor:pointer;transition:all 0.15s ease;${window._raportPage === 2 ? 'background:var(--grade-b);color:#0f172a;border:none;box-shadow:0 0 8px rgba(149,255,0,0.4);' : 'background:transparent;color:#94a3b8;border:1px solid #334155;'}" title="2nd Level Raport (5 Classes)">2nd</button>
        <button type="button" class="btn btn-sm" onclick="event.stopPropagation();if(typeof window._switchRaportPage==='function')window._switchRaportPage(3);" style="height:24px;line-height:22px;padding:0 8px;font-size:12px;font-weight:800;border-radius:4px;cursor:pointer;transition:all 0.15s ease;${window._raportPage === 3 ? 'background:var(--grade-b);color:#0f172a;border:none;box-shadow:0 0 8px rgba(149,255,0,0.4);' : 'background:transparent;color:#94a3b8;border:1px solid #334155;'}" title="3rd Level Raport (5 Classes)">3rd</button>
      </div>`;
    } else if (isFinalExamActive) {
      centerHtml = `
      <div style="display:inline-flex;align-items:center;gap:6px;background:#0b1324;border:1.5px solid #334155;border-radius:6px;padding:2px 10px;height:30px;box-sizing:border-box;">
        <span style="font-size:12px;font-weight:800;color:var(--primary-tactical, #38bdf8);letter-spacing:0.04em;">FINAL EXAM & CERTIFICATE</span>
      </div>`;
    }
    window.setBottomInfobar(leftHtml, rightHtml, centerHtml);

    // Direct synchronous button bindings (No requestAnimationFrame async gap)
    const toggleEditBtn = document.getElementById('btn-toggle-roster-edit-mode');
    if (toggleEditBtn) {
      toggleEditBtn.onclick = () => {
        if (document.activeElement && typeof document.activeElement.blur === 'function') {
          document.activeElement.blur();
        }
        if (typeof window.toggleGlobalEditMode === 'function') {
          const newState = window.toggleGlobalEditMode();
          syncStudentRosterBottomInfobar();
          showToast(newState ? 'Master Edit Mode ON (Inline Excel Grid)' : 'Master Edit Mode OFF', newState ? 'info' : 'success');
          // If turning OFF edit mode in Raport view, refresh table to recalculate aggregated totals
          if (!newState && window._studentRosterTab === 'raport') {
            renderStudents(area, { isAlumniPanel });
          }
        }
      };
    }

    if (!window._rosterEditModeListenerBound) {
      window._rosterEditModeListenerBound = true;
      window.addEventListener('admin-edit-mode-changed', () => {
        syncStudentRosterBottomInfobar();
      });
    }

    const activeBatchId = window._filterBatchId || null;
    const addStudentBtn = document.getElementById('btn-add-student-direct');
    if (addStudentBtn) {
      addStudentBtn.onclick = () => {
        if (typeof window.openStudentFullEdit === 'function') {
          window.openStudentFullEdit({ program_id: currentProgramId, batch_id: activeBatchId }, () => renderStudents(area, { isAlumniPanel }));
        }
      };
    }
    const importStudentsBtn = document.getElementById('btn-import-students-direct');
    if (importStudentsBtn) {
      importStudentsBtn.onclick = () => {
        if (typeof window.loadSection === 'function') {
          window.loadSection('student-registration');
        } else if (typeof window.renderStudentsRegistration === 'function') {
          window.renderStudentsRegistration(area);
        }
      };
    }
    const graduateAlumniBtn = document.getElementById('btn-graduate-alumni-roster');
    if (graduateAlumniBtn) {
      graduateAlumniBtn.onclick = () => {
        const alumniModalFn = typeof openQuickAlumniGraduateModal === 'function' ? openQuickAlumniGraduateModal : window.openQuickAlumniGraduateModal;
        if (typeof alumniModalFn === 'function') {
          alumniModalFn({
            students: filteredGridData || [],
            onSaved: () => renderStudents(area, { isAlumniPanel })
          });
        }
      };
    }

    const promoteAllBtn = document.getElementById('btn-promote-all-eligible');
    if (promoteAllBtn) {
      promoteAllBtn.onclick = () => {
        if (typeof window.promoteAllEligibleStudents === 'function') {
          window.promoteAllEligibleStudents();
        }
      };
    }

    const alumniBatchSelectInfobar = document.getElementById('select-alumni-batch-infobar');
    if (alumniBatchSelectInfobar) {
      alumniBatchSelectInfobar.onchange = (e) => {
        window._alumniFilterBatchId = e.target.value;
        renderStudents(area, { isAlumniPanel });
      };
    }
  }
  syncStudentRosterBottomInfobar();

  // Bind Buttons
  const addBtn = document.getElementById('students-add-shortcut');
  if (addBtn) addBtn.onclick = () => window.openStudentFullEdit({ program_id: currentProgramId }, () => window.loadSection('students'));

  const mergeBtn = document.getElementById('students-merge-shortcut');
  if (mergeBtn) mergeBtn.onclick = () => { if (window.openDuplicateStudentsModal) window.openDuplicateStudentsModal(); };

  const mergeBannerBtn = document.getElementById('btn-banner-merge-duplicates');
  if (mergeBannerBtn) mergeBannerBtn.onclick = () => { if (window.openDuplicateStudentsModal) window.openDuplicateStudentsModal(); };

  // Global Export Function (callable from dedicated Import Students tab & DataGrid toolbar)
  window.exportStudentsGradebook = () => {
    if (!filteredGridData || !filteredGridData.length) {
      showToast('No students to export.', 'info');
      return;
    }

    const headers = [
      'Institution', 'Program', 'Batch', 'Current Level', 'Student Name', 'Gender', 'Birthplace', 'DOB', 'Age', 'Education',
      'Exam 1 (Theme A) Pts', 'Exam 2 (Theme B) Pts', 'Exam 3 (Theme C) Pts', 'Exam 4 (Theme D) Pts',
      'Total Exam Pts', 'Rate (%)', 'Grade', 'Status'
    ];
    const rows = filteredGridData.map(s => {
      let e1 = '—', e2 = '—', e3 = '—', e4 = '—';
      if (activeClassColumns && activeClassColumns.length > 0) {
        const cId = activeClassColumns[0].id;
        if (s[`_cls_exam1_${cId}`] >= 0) e1 = s[`_cls_exam1_${cId}`];
        if (s[`_cls_exam2_${cId}`] >= 0) e2 = s[`_cls_exam2_${cId}`];
        if (s[`_cls_exam3_${cId}`] >= 0) e3 = s[`_cls_exam3_${cId}`];
        if (s[`_cls_exam4_${cId}`] >= 0) e4 = s[`_cls_exam4_${cId}`];
      }
      return {
        'Institution': s.instName || '—',
        'Program': s.progName || '—',
        'Batch': s.batchName || '—',
        'Current Level': s.levelName || '—',
        'Student Name': s.displayName || s.name || '—',
        'Gender': (s.gender || '').toUpperCase() || '—',
        'Birthplace': s.birthplace || '—',
        'DOB': formatBirthDate(s.birth_date),
        'Age': s.ageDisplay || '—',
        'Education': formatLastEducation(s.education),
        'Exam 1 (Theme A) Pts': e1,
        'Exam 2 (Theme B) Pts': e2,
        'Exam 3 (Theme C) Pts': e3,
        'Exam 4 (Theme D) Pts': e4,
        'Total Exam Pts': s.totalEarnedScore ?? 0,
        'Rate (%)': s.overallScoreStr || '—',
        'Grade': s.globalGrade || '—',
        'Status': s.is_active !== false ? 'Active' : 'Inactive'
      };
    });

    try {
      const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
      ws['!cols'] = [
        { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 14 }, { wch: 25 }, { wch: 8 }, { wch: 8 },
        { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 },
        { wch: 15 }, { wch: 10 }, { wch: 8 }, { wch: 10 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Gradebook");
      XLSX.writeFile(wb, `Gradebook_${(window._selectedProgramName || 'Program')}_${(window._filterBatchName || 'Batch')}.xlsx`);
      showToast('Exported student gradebook successfully!', 'success');
    } catch (err) {
      console.error("Export error:", err);
      showToast('Export failed. Make sure the XLSX library is loaded.', 'error');
    }
  };

  // Detailed Modal for Curriculum Breakdown (40 Tests Pacing)
  window.showStudentProgressDetails = async function(studentId) {
    const rec = (filteredGridData || gridData || []).find(d => d.id === studentId);
    if (!rec) return;
    // On-demand photo fetch for detail modal
    if (!rec.photo_url && rec.id) {
      try {
        const sb = await getSupabase();
        const { data: pData } = await sb.from('students').select('photo_url').eq('id', rec.id).single();
        if (pData?.photo_url) rec.photo_url = pData.photo_url;
      } catch (_) {}
    }
    const existing = document.getElementById('prog-details-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'prog-details-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.92);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;';

    const renderDetailRow = (r) => {
      const attId = r.attemptId;
      const isRem = Boolean(r.is_remedial_unlocked || r.is_remedial);
      const isForgiven = Boolean(r.is_forgiven);
      const scoreClickAttr = attId ? `onclick="window.open('result.html?attempt_id=${encodeURIComponent(attId)}&admin=1', '_blank'); event.stopPropagation();" style="cursor:pointer; text-decoration:underline;" title="View Exam Result Sheet"` : '';

      let actionHtml = '<span class="text-muted text-xs">—</span>';
      if (r.is_completed && attId) {
        if (isForgiven) {
          actionHtml = `
            <div style="display:inline-flex; align-items:center; gap:4px;">
              <span style="font-size:12px; color:var(--grade-e); font-weight:600; text-shadow:none;" title="Grade Exemption: ${escapeHtml(r.forgiven_reason || 'Admin Exemption')}">FORGIVEN</span>
              <button class="btn btn-ghost btn-xs btn-prog-toggle-forgiven edit-mode-only" data-att-id="${attId}" style="padding:2px 6px; font-size: 12px;" title="Revoke grade exemption">${getSvgIcon('undo', 12)}</button>
            </div>
          `;
        } else if (isRem) {
          actionHtml = `
            <div style="display:inline-flex; align-items:center; gap:4px;">
              <span style="font-size:12px; color:var(--grade-c); font-weight:600; text-shadow:none;">REMEDIAL</span>
              <button class="btn btn-ghost btn-xs btn-prog-toggle-rem edit-mode-only" data-att-id="${attId}" data-set-remedial="false" style="padding:2px 6px; font-size: 12px;" title="Revert remedial status (return to normal)">${getSvgIcon('refresh', 12)}</button>
            </div>
          `;
        } else {
          actionHtml = `
            <div style="display:inline-flex; align-items:center; gap:4px;">
              <button class="btn btn-warning btn-xs btn-prog-toggle-rem edit-mode-only" data-att-id="${attId}" data-set-remedial="true" style="padding:3px 8px; font-size: 12px; font-weight:700; background:var(--grade-c); color:#0f172a; border-radius:4px; display:inline-flex; align-items:center; gap:4px;" title="Mark this exam result as Remedial">
                ${getSvgIcon('target', 12)} Remedial
              </button>
              ${r.isExam ? `
                <button class="btn btn-danger btn-xs btn-prog-grant-forgiven edit-mode-only" data-att-id="${attId}" data-test-id="${r.testId}" data-student-id="${rec.id}" style="padding:3px 8px; font-size: 12px; font-weight:700; background:var(--grade-e); color:#fff; border-radius:4px; display:inline-flex; align-items:center; gap:4px;" title="Exempt Grade (Admin Override)">
                  ${getSvgIcon('zap', 12)} Exempt
                </button>
              ` : ''}
            </div>
          `;
        }
      }

      let scoreDisplay = '—';
      if (r.bestPct != null) {
        scoreDisplay = `${r.bestPct}%`;
      }
      const scoreColor = isForgiven ? (TOPSCORE_COLORS?.E || 'var(--grade-e)') : (r.bestPct != null ? (typeof getGradeColorByScore === 'function' ? getGradeColorByScore(r.bestPct) : TOPSCORE_COLORS.STAR) : 'var(--clr-text-3)');
      const ptsDisplay = (r.bestScore != null && r.totalQuestions) ? `${r.bestScore}/${r.totalQuestions} pts` : '—';

      const statusColor = r.is_completed ? 'var(--grade-a)' : r.is_in_progress ? 'var(--grade-c)' : 'var(--clr-text-3)';
      const statusLabel = r.is_completed ? 'Completed' : r.is_in_progress ? 'In Progress' : 'Not Started';

      return `
        <tr>
          <td class="fw-600 text-sm" style="color:var(--clr-text-1);">
            <div style="display:flex;align-items:center;gap:6px;">
              <span>${escapeHtml(r.testTitle || '—')}</span>
              ${r.shellCode ? `<span style="font-size:12px;color:#94a3b8;font-family:var(--font-mono, monospace);text-shadow:none;">${escapeHtml(r.shellCode)}</span>` : ''}
            </div>
          </td>
          <td class="text-center">
            <span style="color:#cbd5e1;font-weight:600;font-size:12px;white-space:nowrap;text-shadow:none;">
              ${escapeHtml(typeof toShortLevel === 'function' ? toShortLevel(r.levelNumber || r.levelName) : (r.levelName || `Level ${r.levelNumber}`))}
            </span>
          </td>
          <td class="text-center">
            <span style="font-size:12px;font-weight:600;color:${statusColor};text-shadow:none;">
              ${statusLabel}
            </span>
          </td>
          <td class="text-center">
            <div class="fw-700 text-sm" ${scoreClickAttr} style="color:${scoreColor};">
              ${scoreDisplay}
            </div>
            <div style="font-size: 12px;color:${scoreColor};opacity:0.85;font-weight:600;">${ptsDisplay}</div>
          </td>
          <td class="text-center">
            ${actionHtml}
          </td>
        </tr>
      `;
    };

    const examRows = (rec.details || []).filter(r => r.isExam).map(renderDetailRow).join('');
    const taskRows = (rec.details || []).filter(r => !r.isExam).map(renderDetailRow).join('');

    modal.innerHTML = `
      <div style="background:var(--fm-bg-panel, #0F172A);border:1px solid var(--clr-border);border-radius:14px;width:100%;max-width:820px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,0.6);overflow:hidden;">
        <div style="padding:1.25rem 1.5rem;border-bottom:1px solid var(--clr-border);display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.02);">
          <div class="d-flex align-center gap-3">
            ${rec.photo_url
              ? `<img src="${rec.photo_url}" onerror="this.onerror=null;this.src='${generateAvatarDataUri(rec.displayName || rec.name, rec.gender)}';" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid var(--clr-border);">`
              : `<img src="${generateAvatarDataUri(rec.displayName || rec.name, rec.gender)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid var(--clr-border);">`
            }
            <div>
              <h3 style="margin:0;font-size: 16px;color:var(--clr-text-1);">${escapeHtml(rec.displayName || rec.name)}</h3>
              <div class="text-xs text-muted" style="margin-top:2px;">
                ${escapeHtml(rec.instName)} &bull; ${escapeHtml(rec.progName)} &bull; Batch ${escapeHtml(rec.batchName)} &bull; ${escapeHtml(rec.levelName)}
              </div>
            </div>
          </div>
        </div>
        <div style="padding:1.25rem 1.5rem;overflow-y:auto;flex:1;">
          <div class="d-flex gap-3 mb-4 flex-wrap" style="background:rgba(255,255,255,0.03);border:1px solid var(--clr-border);padding:0.9rem 1.2rem;border-radius:10px;">
            <div style="flex:1;min-width:90px;">
              <div class="text-xs text-muted">Assigned</div>
              <div class="fw-700" style="font-size: 16px;color:var(--clr-text-1);">${rec.totalAssigned}</div>
            </div>
            <div style="flex:1;min-width:90px;">
              <div class="text-xs text-muted">Completed</div>
              <div class="fw-700" style="font-size: 16px;color:var(--clr-success);">${rec.completedTests}</div>
            </div>
            <div style="flex:1;min-width:90px;">
              <div class="text-xs text-muted">In Progress</div>
              <div class="fw-700" style="font-size: 16px;color:var(--clr-warning);">${rec.inProgressCount || 0}</div>
            </div>
            <div style="flex:1;min-width:100px;">
              <div class="text-xs text-muted">Mastery Rate</div>
              <div class="fw-700" style="font-size: 16px;color:${rec.overallColor || 'var(--clr-text-1)'};">${rec.overallScoreStr}</div>
            </div>
            <div style="flex:1;min-width:90px;">
              <div class="text-xs text-muted">Global Grade</div>
              <div style="margin-top:2px;">
                <span class="badge" style="${rec.globalGrade === 'S' || rec.globalGrade === '★' ? `background:rgba(${TOPSCORE_COLORS.STAR_RGB},0.18);color:${TOPSCORE_COLORS.STAR};font-weight:900;box-shadow:0 0 10px rgba(${TOPSCORE_COLORS.STAR_RGB},0.45);border:1px solid ${TOPSCORE_COLORS.STAR};` : `background:${rec.overallColor};color:${TOPSCORE_COLORS?.TEXT_DARK || '#0F172A'};font-weight:800;`}font-size: 12px;padding:3px 10px;">${(rec.globalGrade === 'S' || rec.globalGrade === '★') ? '★' : rec.globalGrade}</span>
              </div>
            </div>
            <div style="flex:1;min-width:100px;">
              <div class="text-xs text-muted">Exam Points</div>
              <div class="fw-700" style="font-size: 16px;color:${rec.overallColor || 'var(--clr-text-1)'};">${rec.totalEarnedScore ?? 0} <span style="font-size: 12px;color:${rec.overallColor || '#94a3b8'};opacity:0.85;font-weight:normal;">pts</span></div>
            </div>
            <div style="flex:1.2;min-width:120px;">
              <div class="text-xs text-muted mb-1">Completion</div>
              <div class="d-flex align-center gap-2">
                <div style="flex:1;background:rgba(255,255,255,0.1);height:8px;border-radius:4px;overflow:hidden;">
                  <div style="width:${rec.completionPct}%;background:var(--primary-tactical, #38bdf8);height:100%;border-radius:4px;"></div>
                </div>
                <span class="text-xs fw-700" style="color:var(--clr-text-1);">${rec.completionPct}%</span>
              </div>
            </div>
          </div>

          <!-- 1. Weekly Exams Section (Milestone Academic Tests) -->
          <div class="mb-4">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <div style="font-size:12px;font-weight:800;color:var(--clr-text-1);display:flex;align-items:center;gap:6px;">
                <span>${getSvgIcon('award', 13)} Weekly Exams</span>
                <span class="badge" style="background:rgba(56,189,248,0.12);color:#38bdf8;font-size: 12px;border:1px solid rgba(56,189,248,0.25);">Academic Grading &amp; Milestone Determinant</span>
              </div>
              <span class="text-xs text-muted">${(rec.details || []).filter(r => r.isExam && r.is_completed).length} / ${(rec.details || []).filter(r => r.isExam).length} Completed</span>
            </div>
            <table class="table-wrap" style="width:100%;">
              <thead>
                <tr>
                  <th class="text-left" style="padding:8px 12px;">EXAM TITLE</th>
                  <th class="text-center" style="padding:8px 12px;width:120px;">LEVEL</th>
                  <th class="text-center" style="padding:8px 12px;width:120px;">STATUS</th>
                  <th class="text-center" style="padding:8px 12px;width:110px;">EXAM RESULT</th>
                  <th class="text-center" style="padding:8px 12px;width:160px;">ACTION / REMEDIAL</th>
                </tr>
              </thead>
              <tbody>
                ${examRows || '<tr><td colspan="5" class="text-center text-muted p-4">No weekly exams assigned.</td></tr>'}
              </tbody>
            </table>
          </div>

          <!-- 2. Daily Tasks Section (Practice & Curriculum Pacing) -->
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <div style="font-size:12px;font-weight:800;color:var(--clr-text-1);display:flex;align-items:center;gap:6px;">
                <span>Daily Tasks (Pacing &amp; Completion)</span>
                <span class="badge" style="background:rgba(var(--grade-c-rgb),0.15);color:var(--grade-c);font-size: 12px;border:1px solid rgba(var(--grade-c-rgb),0.3);">Pacing &amp; Completion Only</span>
              </div>
              <span class="text-xs text-muted">${(rec.details || []).filter(r => !r.isExam && r.is_completed).length} / ${(rec.details || []).filter(r => !r.isExam).length} Completed</span>
            </div>
            <table class="table-wrap" style="width:100%;">
              <thead>
                <tr>
                  <th class="text-left" style="padding:8px 12px;">TASK TITLE</th>
                  <th class="text-center" style="padding:8px 12px;width:120px;">LEVEL</th>
                  <th class="text-center" style="padding:8px 12px;width:120px;">STATUS</th>
                  <th class="text-center" style="padding:8px 12px;width:110px;">TASK RATE</th>
                  <th class="text-center" style="padding:8px 12px;width:160px;">ACTION / REMEDIAL</th>
                </tr>
              </thead>
              <tbody>
                ${taskRows || '<tr><td colspan="5" class="text-center text-muted p-4">No daily tasks assigned.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer" style="height:60px;min-height:60px;max-height:60px;padding:10px 16px;display:flex;align-items:center;justify-content:flex-start;border-top:1px solid rgba(255,255,255,0.08);background:rgba(0,0,0,0.2);flex-shrink:0;">
          <button type="button" class="btn btn-secondary btn-sm btn-modal-close-left" id="btn-close-prog-details">CLOSE</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#btn-close-prog-details').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    modal.querySelectorAll('.btn-prog-toggle-rem').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        if (typeof isTutorRole === 'function' && isTutorRole()) {
          showToast('Permission denied: Tutor accounts cannot alter remedial status.', 'warning');
          return;
        }
        const attId = btn.dataset.attId;
        const targetRemedial = btn.dataset.setRemedial === 'true';
        const msg = targetRemedial
          ? 'Mark this exam result as REMEDIAL (Grade R)?'
          : 'Revert this exam result to NORMAL?';
        if (!confirm(msg)) return;
        try {
          showLoading('Updating remedial status...');
          await labelAttemptRemedial(attId, targetRemedial, 60);
          showToast(targetRemedial ? 'Successfully labeled as Remedial (Grade R).' : 'Remedial status reverted to Normal.', 'success');
          modal.remove();
          if (typeof window.loadSection === 'function') {
            await window.loadSection(window._activeSectionAlias || window._currentSection || 'students');
          }
          setTimeout(() => {
            window.showStudentProgressDetails(studentId);
          }, 300);
        } catch(err) {
          console.error(err);
          showToast('Failed to update status: ' + err.message, 'error');
        } finally {
          hideLoading();
        }
      };
    });

    modal.querySelectorAll('.btn-prog-grant-forgiven').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const attId = btn.dataset.attId;

        const reason = prompt('Skor F (Forgiven) — Prerogatif Mr. Top\n\nMasukkan alasan tertulis dispensasi (wajib diisi):');
        if (!reason || !reason.trim()) {
          showToast('Alasan dispensasi Skor F wajib diisi.', 'warning');
          return;
        }
        try {
          showLoading('Applying Grade F exemption...');
          await labelAttemptForgiven(attId, reason.trim());

          showToast('Grade Exemption (Grade F) granted successfully.', 'success');
          modal.remove();
          if (typeof window.loadSection === 'function') {
            await window.loadSection(window._activeSectionAlias || window._currentSection || 'students');
          }
          setTimeout(() => {
            window.showStudentProgressDetails(studentId);
          }, 300);
        } catch (err) {
          console.error(err);
          showToast('Failed to grant Grade Exemption: ' + err.message, 'error');
        } finally {
          hideLoading();
        }
      };
    });

    modal.querySelectorAll('.btn-prog-toggle-forgiven').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const attId = btn.dataset.attId;
        if (!confirm('Revoke Grade F exemption (return to normal evaluation)?')) return;
        try {
          showLoading('Revoking Grade F exemption...');
          await labelAttemptNormal(attId);

          showToast('Grade exemption revoked.', 'success');
          modal.remove();
          if (typeof window.loadSection === 'function') {
            await window.loadSection(window._activeSectionAlias || window._currentSection || 'students');
          }
          setTimeout(() => {
            window.showStudentProgressDetails(studentId);
          }, 300);
        } catch (err) {
          console.error(err);
          showToast('Failed to revoke status: ' + err.message, 'error');
        } finally {
          hideLoading();
        }
      };
    });
  };

  // ─────────────────────────────────────────────────────────────
  // STUDENT PROFILE (RETIRED PER USER DIRECTIVE -> OFFICIAL A4 DOSSIER)
  // Per user directive: The dark tactical profile popup is retired;
  // the single authoritative report is the A4 printable Dossier.
  // ─────────────────────────────────────────────────────────────
  window.showStudentProfileModal = async function(studentId) {
    return window.showStudentDossierModal(studentId);
  };

  // ─────────────────────────────────────────────────────────────
  // MODAL 2: OFFICIAL ACADEMIC DOSSIER & CERTIFIED TRANSCRIPT
  // ─────────────────────────────────────────────────────────────
  window.showStudentDossierModal = async function(studentId) {
    const list = filteredGridData || gridData || [];
    let rec = list.find(d => d.id === studentId);
    if (!rec) {
      try {
        const sb = await getSupabase();
        let st = null;
        try {
          const res = await sb.from('students')
            .select('id, nis, name, gender, birth_date, birthplace, education, province, city, district, village, is_active, photo_url, level_id, batch_id, program_id, institution_id, programs!program_id(name), institutions!institution_id(name), batches!batch_id(name), levels!level_id(name)')
            .eq('id', studentId)
            .single();
          st = res.data;
        } catch (_) {}
        if (st) {
          rec = {
            id: st.id,
            nis: st.nis || '',
            name: st.name,
            displayName: cleanStudentName(st.name),
            gender: st.gender,
            birthplace: st.birthplace || '',
            birth_date: st.birth_date,
            education: st.education,
            province: st.province || (st.is_active !== false ? 'Nusa Tenggara Barat' : ''),
            city: st.city || (st.is_active !== false ? 'Kota Mataram' : ''),
            district: st.district || '',
            village: st.village || '',
            ageDisplay: calculateAgeFromBirthDate(st.birth_date),
            is_active: st.is_active,
            photo_url: st.photo_url,
            instName: st.institutions?.name || '—',
            progName: st.programs?.name || '—',
            batchName: st.batches?.name || '—',
            levelName: st.levels?.name || '—',
            overallScoreStr: '—',
            globalGrade: '—',
            completedTests: 0,
            totalAssigned: 40,
            completionPct: 0,
            details: []
          };
        }
      } catch (err) {
        console.warn('Fallback student fetch for dossier failed:', err);
      }
    }
    if (!rec) return;

    // Carousel navigation indices across cohort list
    const currentIdx = list.findIndex(d => d.id === studentId);
    const hasPrev = currentIdx > 0;
    const hasNext = currentIdx >= 0 && currentIdx < list.length - 1;
    const prevId = hasPrev ? list[currentIdx - 1].id : null;
    const nextId = hasNext ? list[currentIdx + 1].id : null;
    const positionText = list.length > 0 ? `${currentIdx + 1} of ${list.length}` : '';

    // Purge all existing modals to avoid stacked backdrops
    document.querySelectorAll('#student-dossier-modal, .student-modal-backdrop, #student-profile-modal').forEach(el => el.remove());

    if (window.location.hash && !window.location.hash.startsWith('#profile-') && !window.location.hash.startsWith('#dossier-')) {
      window._lastSectionBeforeProfile = window.location.hash.substring(1);
    }
    if (window.history && window.history.replaceState) {
      try {
        const url = new URL(window.location.href);
        url.hash = '#profile-' + studentId;
        window.history.replaceState(null, '', url.toString());
      } catch (_) {}
    } else {
      try {
        if (window.location.hash !== '#profile-' + studentId) {
          window.location.hash = '#profile-' + studentId;
        }
      } catch (_) {}
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'student-dossier-modal';
    backdrop.className = 'student-modal-backdrop animate-fade-in';
    backdrop.style.cssText = 'position:fixed !important;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;background:rgba(9,13,22,0.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;box-sizing:border-box;margin:0;';
    document.body.style.overflow = 'hidden';

    const cleanBatch = (rec.batchName || '').replace(/^batch\s*/i, '').trim();
    let rawBatch = (rec.batchName || '').trim();
    rawBatch = rawBatch.replace(/^(camp|cec|top|batch)\s*/gi, '').replace(/^batch\s*/gi, '').trim();
    const cleanBatchNum = rawBatch || cleanBatch || '134';
    const courseDataText = `${(rec.instName || 'CEC').trim()} ${(rec.progName || 'Camp').trim()} ${cleanBatchNum}`.replace(/\s+/g, ' ').trim();

    // Helper: Address Formatter
    function formatFullStudentAddress(r) {
      if (!r) return '—';
      const parts = [];
      const v = (r.village || '').trim();
      const d = (r.district || '').trim();
      const c = (r.city || '').trim();
      const p = (r.province || '').trim();

      if (v && v !== '—') parts.push(typeof formatVillageName === 'function' ? formatVillageName(v) : v);
      if (d && d !== '—') parts.push(typeof formatDistrictName === 'function' ? formatDistrictName(d) : d);
      if (c && c !== '—') parts.push(typeof formatCityDistrict === 'function' ? formatCityDistrict(c) : c);
      if (p && p !== '—') parts.push(typeof formatProvinceName === 'function' ? formatProvinceName(p) : p);

      return parts.length > 0 ? parts.join(', ') : '—';
    }

    // Fetch attempts, academic assessments, and final exams for transcript table (stateless & low-egress)
    let studentAttempts = [];
    let studentAcademicAssessments = [];
    let studentFinalExam = null;
    try {
      const sb = await getSupabase();
      const [attsRes, saaRes, sfeRes] = await Promise.all([
        sb.from('attempts')
          .select('id, test_id, score, total_questions, percentage, grade, submitted_at, status, is_remedial, is_remedial_unlocked, tests(id, title, test_type, shell_code, class_id, level_id, classes(id, name, code), levels(id, name, level_number))')
          .eq('student_id', studentId)
          .in('status', ['submitted', 'auto_submitted', 'evaluated', 'graded'])
          .order('submitted_at', { ascending: true }),
        sb.from('student_academic_assessments')
          .select('*')
          .eq('student_id', studentId),
        sb.from('student_final_examinations')
          .select('*')
          .eq('student_id', studentId)
          .maybeSingle()
      ]);
      studentAttempts = attsRes?.data || [];
      studentAcademicAssessments = saaRes?.data || [];
      studentFinalExam = sfeRes?.data || null;
    } catch(err) {
      console.warn('Error fetching data for dossier:', err);
    }

    // Helper: isExam check (strictly exams only, no tasks/quizzes)
    function isExamAttempt(att) {
      const t = att?.tests;
      if (!t) return false;
      const type = (t.test_type || '').toLowerCase();
      if (type === 'exam') return true;
      if (type === 'quiz' || type === 'task') return false;
      const shell = (t.shell_code || '').toUpperCase();
      if (shell.endsWith('-EXAM') || shell.includes('-EXAM-')) return true;
      if (shell.endsWith('-TASK') || shell.includes('-TASK-') || shell.endsWith('-QUIZ')) return false;
      const title = (t.title || '').toLowerCase();
      if (title.includes(' exam ') || title.includes(' exam -') || title.endsWith(' exam')) return true;
      return false;
    }

    const examAttempts = studentAttempts.filter(isExamAttempt);
    const targetAttempts = examAttempts; // Strictly exams only for official academic report (zero formative tasks)

    // Best attempt per test
    const bestByTest = new Map();
    targetAttempts.forEach(att => {
      const pct = parseFloat(att.percentage || att.score || 0);
      const prev = bestByTest.get(att.test_id);
      if (!prev || pct > parseFloat(prev.percentage || prev.score || 0)) {
        bestByTest.set(att.test_id, att);
      }
    });
    const uniqueEvaluations = Array.from(bestByTest.values());

    // Official TopsCore Grade Colors (SSOT Rule 2.10)
    function getExamGradeColor(grade) {
      const g = String(grade || '').trim().toUpperCase();
      if (typeof getGradeColor === 'function') return getGradeColor(g);
      if (g === '★' || g === 'S') return TOPSCORE_COLORS.STAR;
      if (g === 'A') return TOPSCORE_COLORS.A;
      if (g === 'B') return TOPSCORE_COLORS.B;
      if (g === 'C') return TOPSCORE_COLORS.C;
      if (g === 'D') return TOPSCORE_COLORS.D;
      return TOPSCORE_COLORS.E;
    }

    // Official TopsCore Predicate Descriptions (Rule 2.10)
    function getExamGradeDescription(grade, pct) {
      const p = Math.round(Number(pct) || 0);
      const g = String(grade || '').trim().toUpperCase();
      if (g === '★' || g === 'S' || p >= 100) return `Excellent (${p}%)`;
      if (g === 'A' || p >= 90) return `Very Good (${p}%)`;
      if (g === 'B' || p >= 80) return `Good (${p}%)`;
      if (g === 'C' || p >= 60) return `Enough (${p}%)`;
      if (g === 'D' || p >= 30) return `Less (${p}%)`;
      return `Fail (${p}%)`;
    }

    // Group evaluations by CLASS (Overall score per class)
    const byClass = new Map();
    uniqueEvaluations.forEach(att => {
      const clsId = att.tests?.class_id || att.tests?.classes?.id || 'default_class';
      const clsName = att.tests?.classes?.name || (att.tests?.title?.split(' ')[0] ? att.tests.title.split(' ')[0] + ' Class' : 'Class');
      const lvlName = att.tests?.levels?.name || rec.levelName || '—';
      const lvlNum = att.tests?.levels?.level_number || 1;

      if (!byClass.has(clsId)) {
        byClass.set(clsId, {
          id: clsId,
          name: clsName,
          levelName: lvlName,
          levelNumber: lvlNum,
          exams: []
        });
      }

      const isRem = Boolean(att.is_remedial_unlocked || att.is_remedial);
      const maxQ = Math.round(Number(att.total_questions || att.max_score || 40));
      const pts = Math.round(Number(isRem ? Math.min(att.score || 0, maxQ * 0.6) : (att.score || 0)));
      const rawPct = att.percentage != null ? Number(att.percentage) : (maxQ > 0 ? (pts / maxQ) * 100 : 0);
      const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;

      byClass.get(clsId).exams.push({
        pts,
        maxQ,
        effPct,
        testId: att.test_id,
        attemptId: att.id,
        hasAttempt: true,
        title: att.tests?.title || 'Exam'
      });
    });

    // Augment with curriculum classes for student's program to enable full calibration in report
    try {
      const sb = await getSupabase();
      let q = sb.from('classes')
        .select('id, name, code, program_id, level_id, levels(id, name, level_number)')
        .eq('is_active', true);
      if (rec.program_id) q = q.eq('program_id', rec.program_id);
      const { data: progCls } = await q;
      if (progCls && progCls.length > 0) {
        const cIds = progCls.map(c => c.id);
        const { data: progTsts } = await sb.from('tests')
          .select('id, title, test_type, shell_code, class_id, level_id, payload, total_questions')
          .in('class_id', cIds);

        (progCls || []).forEach(cls => {
          const clsExams = (progTsts || []).filter(t => t.class_id === cls.id && isExamAttempt({ tests: t }));
          if (clsExams.length === 0) return;

          if (!byClass.has(cls.id)) {
            const exList = clsExams.map(ex => {
              const maxQ = Number(ex.payload?.total_questions || ex.total_questions || 120);
              return {
                pts: 0,
                maxQ,
                effPct: 0,
                testId: ex.id,
                attemptId: null,
                hasAttempt: false,
                title: ex.title || 'Exam'
              };
            });
            byClass.set(cls.id, {
              id: cls.id,
              name: cls.name,
              levelName: cls.levels?.name || rec.levelName || '—',
              levelNumber: cls.levels?.level_number || 1,
              exams: exList
            });
          } else {
            const classObj = byClass.get(cls.id);
            clsExams.forEach(ex => {
              const alreadyHas = classObj.exams.some(e => e.testId === ex.id);
              if (!alreadyHas) {
                const maxQ = Number(ex.payload?.total_questions || ex.total_questions || 120);
                classObj.exams.push({
                  pts: 0,
                  maxQ,
                  effPct: 0,
                  testId: ex.id,
                  attemptId: null,
                  hasAttempt: false,
                  title: ex.title || 'Exam'
                });
              }
            });
          }
        });
      }
    } catch (err) {
      console.warn('Error augmenting dossier curriculum classes:', err);
    }

    // Augment with non-vocab academic assessments (Storytelling, Grammar, 4th Subject, Speaking)
    if (studentAcademicAssessments && studentAcademicAssessments.length > 0) {
      const acadGroups = new Map();
      studentAcademicAssessments.forEach(item => {
        const key = `${item.step_level}:${item.subject_code}`;
        if (!acadGroups.has(key)) acadGroups.set(key, []);
        acadGroups.get(key).push(item);
      });

      acadGroups.forEach((items, key) => {
        const [lvlNumStr, subjCode] = key.split(':');
        const lvlNum = parseInt(lvlNumStr, 10) || 1;
        const ord = lvlNum === 1 ? '1st' : lvlNum === 2 ? '2nd' : '3rd';
        let className = `Camp ${ord} ${subjCode}`;
        if (subjCode === 'STORYTELLING') className = `Camp ${ord} Storytelling`;
        else if (subjCode === 'GRAMMAR') className = `Camp ${ord} Grammar`;
        else if (subjCode === 'BASIC') className = `Camp 1st Basic English`;
        else if (subjCode === 'GFS') className = `Camp 2nd Grammar for Speaking`;
        else if (subjCode === 'PRONUNCIATION') className = `Camp 3rd Pronunciation`;
        else if (subjCode === 'SPEAKING') className = `Camp ${ord} Speaking`;

        const pseudoClassId = items[0]?.class_id || `acad_${key.toLowerCase()}`;
        const exList = items.map(a => ({
          pts: Math.round(Number(a.raw_score || 0)),
          maxQ: Math.round(Number(a.target_score || 10)),
          effPct: Number(a.percentage || 0),
          testId: a.id,
          attemptId: a.id,
          hasAttempt: true,
          title: a.assessment_key
        }));

        byClass.set(pseudoClassId, {
          id: pseudoClassId,
          name: className,
          levelName: `${ord} Step`,
          levelNumber: lvlNum,
          exams: exList
        });
      });
    }

    // Detect Camp Student (CEC / Camp Program or has academic assessments)
    const isCampStudent = Boolean(
      (rec.progName && /camp/i.test(rec.progName)) ||
      (rec.instName && /cec/i.test(rec.instName)) ||
      (studentAcademicAssessments && studentAcademicAssessments.length > 0)
    );

    // Build academicMap (key: "step_level:subject_code:assessment_key")
    const academicMap = rec.academicMap || new Map();
    if (studentAcademicAssessments && studentAcademicAssessments.length > 0) {
      studentAcademicAssessments.forEach(item => {
        academicMap.set(`${item.step_level}:${item.subject_code}:${item.assessment_key}`, item);
      });
      rec.academicMap = academicMap;
    }

    // Helper: Vocab Week Score (Strictly preserve existing system test attempts)
    function getVocabWeekScore(stepNum, weekCode) {
      const wNorm = String(weekCode || '').toUpperCase().trim();
      const tc = wNorm.replace('W1', 'A').replace('W2', 'B').replace('W3', 'C').replace('W4', 'D');
      const wKey = tc === 'A' ? 'W1' : tc === 'B' ? 'W2' : tc === 'C' ? 'W3' : tc === 'D' ? 'W4' : wNorm;

      if (rec.perClassFinal) {
        for (const [cId, clsData] of rec.perClassFinal.entries()) {
          const cls = (typeof classesMap !== 'undefined' ? classesMap.get(cId) : null);
          const cCode = (cls?.code || '').toUpperCase().replace(/^CMP-/, 'CAMP-');
          if (cCode === `CAMP-${stepNum}VOCAB`) {
            if (clsData.themeScores && typeof clsData.themeScores[tc] === 'number') {
              return clsData.themeScores[tc];
            }
          }
        }
      }

      const directAcad = academicMap.get(`${stepNum}:VOCABULARY:${wKey}`) || academicMap.get(`${stepNum}:VOCABULARY:${tc}`);
      if (directAcad?.percentage != null) return Number(directAcad.percentage);

      const matchingAtts = studentAttempts.filter(att => {
        const t = att.tests;
        if (!t) return false;
        const cCode = (t.classes?.code || '').toUpperCase().replace(/^CMP-/, 'CAMP-');
        const lvl = t.levels?.level_number || 1;
        const isVocab = cCode === `CAMP-${stepNum}VOCAB` || (lvl === stepNum && /vocab/i.test(t.classes?.name || ''));
        if (!isVocab) return false;
        const shell = (t.shell_code || '').toUpperCase();
        const theme = t.payload?.theme_code || (shell.includes(`-${tc}-`) || shell.startsWith(`${stepNum}${tc}-`) ? tc : null);
        return theme === tc;
      });
      if (matchingAtts.length > 0) {
        let bestPct = 0;
        matchingAtts.forEach(a => {
          const p = Number(a.percentage || a.score || 0);
          if (p > bestPct) bestPct = p;
        });
        return bestPct;
      }
      return null;
    }

    // Ensure stepSummaries exists
    if (!rec.stepSummaries || Object.keys(rec.stepSummaries).length === 0) {
      rec.stepSummaries = {};
      [1, 2, 3].forEach(stepNum => {
        let naVocab = null;
        const vocabPcts = ['A', 'B', 'C', 'D'].map(tc => getVocabWeekScore(stepNum, tc)).filter(p => typeof p === 'number');
        if (vocabPcts.length > 0) {
          naVocab = Math.round((vocabPcts.reduce((a, b) => a + b, 0) / vocabPcts.length) * 100) / 100;
        }

        const storyKeys = ['W1', 'W2', 'W3', 'W4'].map(k => academicMap.get(`${stepNum}:STORYTELLING:${k}`)).filter(x => x?.percentage != null);
        const naStory = storyKeys.length > 0 ? Math.round((storyKeys.reduce((acc, x) => acc + Number(x.percentage), 0) / storyKeys.length) * 100) / 100 : null;

        const gramKeys = ['U1', 'U2'].map(k => academicMap.get(`${stepNum}:GRAMMAR:${k}`)).filter(x => x?.percentage != null);
        const naGram = gramKeys.length > 0 ? Math.round((gramKeys.reduce((acc, x) => acc + Number(x.percentage), 0) / gramKeys.length) * 100) / 100 : null;

        const fourthSubjCode = stepNum === 1 ? 'BASIC' : (stepNum === 2 ? 'GFS' : 'PRONUNCIATION');
        const fourthKeys = ['U1', 'U2'].map(k => academicMap.get(`${stepNum}:${fourthSubjCode}:${k}`)).filter(x => x?.percentage != null);
        const naFourth = fourthKeys.length > 0 ? Math.round((fourthKeys.reduce((acc, x) => acc + Number(x.percentage), 0) / fourthKeys.length) * 100) / 100 : null;

        const spkSubKeys = stepNum === 1 ? ['U1', 'U2', 'PRACTICE'] : (stepNum === 2 ? ['U1', 'U2'] : ['U1', 'U2', 'U3']);
        const speakKeys = spkSubKeys.map(k => academicMap.get(`${stepNum}:SPEAKING:${k}`)).filter(x => x?.percentage != null);
        const naSpeak = speakKeys.length > 0 ? Math.round((speakKeys.reduce((acc, x) => acc + Number(x.percentage), 0) / speakKeys.length) * 100) / 100 : null;

        const validNAs = [naVocab, naStory, naGram, naFourth, naSpeak].filter(v => typeof v === 'number');
        const stepAvg = validNAs.length > 0 ? Math.round((validNAs.reduce((a, b) => a + b, 0) / validNAs.length) * 100) / 100 : null;
        const predicate = stepAvg != null ? (typeof getCertificatePredicate === 'function' ? getCertificatePredicate(stepAvg) : (stepAvg >= 90 ? 'EXCELLENT' : stepAvg >= 80 ? 'VERY GOOD' : stepAvg >= 70 ? 'GOOD' : stepAvg >= 60 ? 'ENOUGH' : 'LESS')) : '—';

        rec.stepSummaries[stepNum] = {
          naVocab,
          naStory,
          naGram,
          naFourth,
          naSpeak,
          stepAvg,
          predicate
        };
      });
    }

    // Determine active steps for Camp student
    const activeCampSteps = [1, 2, 3].filter(st => {
      const sObj = rec.stepSummaries?.[st];
      if (sObj && sObj.stepAvg != null) return true;
      if (studentAcademicAssessments && studentAcademicAssessments.some(a => Number(a.step_level) === st)) return true;
      const sLvl = Number(rec.studentLevelNum || rec.level_number || 1);
      return sLvl >= st;
    });
    if (activeCampSteps.length === 0) activeCampSteps.push(1);

    // Build Camp Raport Tables (5 Core Classes per step)
    const campRaportHtml = isCampStudent ? activeCampSteps.map(stepNum => {
      const ord = stepNum === 1 ? '1st' : (stepNum === 2 ? '2nd' : '3rd');
      const sObj = rec.stepSummaries?.[stepNum] || {};
      const stepAvg = sObj.stepAvg;
      const predicate = sObj.predicate || '—';
      const predColor = predicate === 'EXCELLENT' ? '#c084fc' : (predicate === 'VERY GOOD' ? '#22c55e' : (predicate === 'GOOD' ? '#95ff00' : (predicate === 'ENOUGH' ? '#eab308' : '#ff2d87')));

      const fourthSubjCode = stepNum === 1 ? 'BASIC' : (stepNum === 2 ? 'GFS' : 'PRONUNCIATION');
      const fourthSubjName = stepNum === 1 ? 'Basic English' : (stepNum === 2 ? 'Grammar for Speaking' : 'Pronunciation');
      const fourthTarget = stepNum === 1 ? 15 : (stepNum === 2 ? 20 : 25);
      const spkSubKeys = stepNum === 1 ? ['U1', 'U2', 'PRACTICE'] : (stepNum === 2 ? ['U1', 'U2'] : ['U1', 'U2', 'U3']);

      const subjects = [
        {
          name: 'Vocabulary',
          code: 'VOCABULARY',
          classCode: `CAMP-${stepNum}VOCAB`,
          isSystemVocab: true,
          na: sObj.naVocab,
          items: ['W1', 'W2', 'W3', 'W4'].map(k => {
            const p = getVocabWeekScore(stepNum, k);
            return { key: k, label: k, raw: p != null ? Math.round(p) : null, max: 100, pct: p, isPct: true };
          })
        },
        {
          name: 'Storytelling',
          code: 'STORYTELLING',
          classCode: `CAMP-${stepNum}STORY`,
          isSystemVocab: false,
          na: sObj.naStory,
          items: ['W1', 'W2', 'W3', 'W4'].map(k => {
            const item = academicMap.get(`${stepNum}:STORYTELLING:${k}`);
            return { key: k, label: k, raw: item?.raw_score != null ? Number(item.raw_score) : null, max: 5, pct: item?.percentage != null ? Number(item.percentage) : null };
          })
        },
        {
          name: 'Grammar',
          code: 'GRAMMAR',
          classCode: `CAMP-${stepNum}GRMMR`,
          isSystemVocab: false,
          na: sObj.naGram,
          items: ['U1', 'U2'].map(k => {
            const item = academicMap.get(`${stepNum}:GRAMMAR:${k}`);
            return { key: k, label: k, raw: item?.raw_score != null ? Number(item.raw_score) : null, max: 15, pct: item?.percentage != null ? Number(item.percentage) : null };
          })
        },
        {
          name: fourthSubjName,
          code: fourthSubjCode,
          classCode: `CAMP-${stepNum}${fourthSubjCode}`,
          isSystemVocab: false,
          na: sObj.naFourth,
          items: ['U1', 'U2'].map(k => {
            const item = academicMap.get(`${stepNum}:${fourthSubjCode}:${k}`);
            return { key: k, label: k, raw: item?.raw_score != null ? Number(item.raw_score) : null, max: fourthTarget, pct: item?.percentage != null ? Number(item.percentage) : null };
          })
        },
        {
          name: 'Speaking',
          code: 'SPEAKING',
          classCode: `CAMP-${stepNum}SPEAK`,
          isSystemVocab: false,
          na: sObj.naSpeak,
          items: spkSubKeys.map(k => {
            const item = academicMap.get(`${stepNum}:SPEAKING:${k}`);
            const label = k === 'PRACTICE' ? 'Practice' : k;
            return { key: k, label, raw: item?.raw_score != null ? Number(item.raw_score) : null, max: 25, pct: item?.percentage != null ? Number(item.percentage) : null };
          })
        }
      ];

      const stepRowsHtml = subjects.map(sub => {
        const hasScores = sub.items.some(it => it.pct != null);
        let subNa = sub.na;
        if (subNa == null && hasScores) {
          const validPcts = sub.items.map(it => it.pct).filter(p => typeof p === 'number');
          if (validPcts.length > 0) subNa = Math.round((validPcts.reduce((a, b) => a + b, 0) / validPcts.length) * 100) / 100;
        }

        const grade = subNa != null ? ((typeof getGrade === 'function') ? getGrade(subNa) : (subNa >= 90 ? 'A' : subNa >= 80 ? 'B' : subNa >= 60 ? 'C' : subNa >= 30 ? 'D' : 'E')) : '—';
        const displayGrade = (grade === 'S' || grade === '★') ? '★' : grade;
        const gradeColor = subNa != null ? getExamGradeColor(displayGrade) : '#64748b';
        const rateColor = subNa != null ? (typeof getGradeColorByScore === 'function' ? getGradeColorByScore(subNa) : gradeColor) : '#64748b';
        const predicateDesc = subNa != null ? getExamGradeDescription(displayGrade, subNa) : 'Not Attempted';

        const normalPillsHtml = sub.items.map(it => {
          if (it.isPct) {
            return `<span style="display:inline-flex;align-items:center;padding:2px 6px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:4px;font-size:12px;font-weight:700;color:#0f172a;margin:2px;">${it.label}: <strong style="margin-left:3px;color:${it.pct != null ? (it.pct >= 60 ? '#16a34a' : '#dc2626') : '#64748b'};">${it.pct != null ? `${Math.round(it.pct)}%` : '—'}</strong></span>`;
          }
          return `<span style="display:inline-flex;align-items:center;padding:2px 6px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:4px;font-size:12px;font-weight:700;color:#0f172a;margin:2px;">${it.label}: <strong style="margin-left:3px;color:${it.pct != null ? (it.pct >= 60 ? '#16a34a' : '#dc2626') : '#64748b'};">${it.raw != null ? `${it.raw}/${it.max}` : '—'}</strong></span>`;
        }).join('');

        const editInputsHtml = sub.isSystemVocab
          ? `<span style="font-size:11px;font-weight:700;color:#64748b;font-style:italic;">System Attempts (Read-Only)</span>`
          : `<div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center;align-items:center;">
              ${sub.items.map(it => `
                <div style="display:inline-flex;align-items:center;gap:2px;" title="${escapeHtml(sub.name + ' ' + it.label)}">
                  <span style="font-size:11px;font-weight:700;color:#64748b;">${it.label}:</span>
                  <input type="number" min="${sub.code === 'STORYTELLING' ? 1 : 0}" max="${it.max}" step="${sub.code === 'STORYTELLING' ? 0.1 : 1}"
                         class="dossier-academic-input"
                         data-student-id="${studentId}"
                         data-step="${stepNum}"
                         data-subject="${sub.code}"
                         data-key="${it.key}"
                         data-target="${it.max}"
                         value="${it.raw != null ? it.raw : ''}"
                         placeholder="${it.max}"
                         style="width:${it.max > 99 ? '52px' : '44px'};height:26px;font-size:12px;font-weight:700;text-align:center;color:#0f172a;background:#f8fafc;border:1.5px solid #38bdf8;border-radius:4px;padding:1px 2px;font-variant-numeric:tabular-nums;"
                         onclick="event.stopPropagation();">
                  <span style="font-size:11px;color:#64748b;font-weight:600;">/${it.max}</span>
                </div>
              `).join('')}
            </div>`;

        return `
          <tr style="border-bottom: 1px solid #e2e8f0;" data-step="${stepNum}" data-subject="${sub.code}">
            <td style="padding: 10px 14px; font-weight: 700; color: #0f172a; font-size: 14px; line-height: 1.35;">
              ${escapeHtml(sub.name)}
              <span style="display:block;font-size:11px;color:#64748b;font-weight:600;font-family:monospace;">${escapeHtml(sub.classCode)}</span>
            </td>
            <td style="padding: 10px 10px; text-align: center;">
              <div class="dossier-normal-view">
                ${normalPillsHtml}
              </div>
              <div class="dossier-edit-view" style="display:none; align-items:center; justify-content:center;">
                ${editInputsHtml}
              </div>
            </td>
            <td class="cell-dossier-na" style="padding: 10px 10px; text-align: center; font-size: 15px; font-weight: 800; color: ${rateColor}; font-variant-numeric: tabular-nums;">
              <span class="dossier-na-val">${subNa != null ? `${Math.round(subNa)}%` : '—'}</span>
            </td>
            <td class="cell-dossier-grade" style="padding: 10px 8px; text-align: center;">
              <span class="grade-circle dossier-grade-badge" style="display: inline-flex; width: 30px; height: 30px; border-radius: 50%; align-items: center; justify-content: center; font-family: var(--fm-font-display, 'Inter', sans-serif); font-weight: 900; font-size: 15px; color: #0f172a; background: ${gradeColor}; box-shadow: 0 1px 4px rgba(0,0,0,0.14);">
                ${displayGrade}
              </span>
            </td>
            <td class="cell-dossier-pred" style="padding: 10px 12px; font-weight: 600; color: #1e293b; font-size: 13px; line-height: 1.35;">
              <span class="dossier-pred-val">${escapeHtml(predicateDesc)}</span>
            </td>
          </tr>
        `;
      }).join('');

      return `
        <div class="step-transcript-block" style="margin-top: 18px; margin-bottom: 22px;" data-step-container="${stepNum}">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #0f172a;">
            <h3 style="margin: 0; font-family: var(--fm-font-display, 'Inter', sans-serif); font-size: 15px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em;">
              ${ord.toUpperCase()} STEP ACADEMIC REPORT
            </h3>
            <span style="font-size: 13px; font-weight: 700; color: #64748b;">
              Step Average: <strong class="step-header-avg" style="color: #0f172a; font-size: 15px;">${stepAvg != null ? `${Math.round(stepAvg)}%` : '—'}</strong>
              <span class="step-header-pred" style="margin-left: 6px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 800; color: #ffffff; background: ${predColor};">${predicate}</span>
            </span>
          </div>
          <table class="dossier-table" style="width: 100%; border-collapse: collapse; font-family: var(--fm-font-sans, 'Inter', sans-serif); font-variant-numeric: tabular-nums;">
            <thead>
              <tr style="background: #f1f5f9; border-top: 1.5px solid #cbd5e1; border-bottom: 2px solid #cbd5e1;">
                <th style="width: 26%; text-align: left; padding: 10px 14px; font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase;">SUBJECT</th>
                <th style="width: 40%; text-align: center; padding: 10px 10px; font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase;">ASSESSMENT BREAKDOWN</th>
                <th style="width: 11%; text-align: center; padding: 10px 10px; font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase;">NA</th>
                <th style="width: 9%; text-align: center; padding: 10px 8px; font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase;">GRADE</th>
                <th style="width: 14%; text-align: left; padding: 10px 12px; font-size: 13px; font-weight: 800; color: #0f172a; text-transform: uppercase;">PREDICATE</th>
              </tr>
            </thead>
            <tbody>
              ${stepRowsHtml}
            </tbody>
            <tfoot>
              <tr style="background: #f8fafc; border-top: 2px solid #cbd5e1; font-weight: 700;">
                <td colspan="2" style="padding: 10px 14px; text-align: right; font-size: 13px; color: #334155; text-transform: uppercase; font-weight: 800;">${ord.toUpperCase()} STEP AVERAGE:</td>
                <td class="step-footer-avg" style="padding: 10px 10px; text-align: center; font-size: 15px; font-weight: 900; color: #0f172a;">${stepAvg != null ? `${Math.round(stepAvg)}%` : '—'}</td>
                <td colspan="2" class="step-footer-pred" style="padding: 10px 12px; text-align: left;">
                  <span style="display:inline-block;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:900;color:#ffffff;background:${predColor};">${predicate}</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      `;
    }).join('') : '';

    const classList = Array.from(byClass.values());
    function getDossierModalityOrder(name = '') {
      const n = name.toLowerCase();
      if (n.includes('vocab')) return 1;
      if (n.includes('story')) return 2;
      if (n.includes('grammar for') || n.includes('gfors')) return 4;
      if (n.includes('grammar')) return 3;
      if (n.includes('basic')) return 4;
      if (n.includes('pronun')) return 4;
      if (n.includes('speak')) return 5;
      return 6;
    }
    classList.sort((a, b) => {
      if (a.levelNumber !== b.levelNumber) return a.levelNumber - b.levelNumber;
      const ordA = getDossierModalityOrder(a.name);
      const ordB = getDossierModalityOrder(b.name);
      if (ordA !== ordB) return ordA - ordB;
      return a.name.localeCompare(b.name);
    });

    // Render 6-Column Table: LEVEL | CLASS NAME | POINT | RATE | GRADE | GRADE DESCRIPTION
    const rowsHtml = classList.length > 0 ? classList.map(c => {
      let totalPts = 0;
      let totalMaxQ = 0;
      let totalPctSum = 0;
      let attemptedCount = 0;

      c.exams.forEach(ex => {
        if (ex.hasAttempt) {
          totalPts += ex.pts;
          totalMaxQ += ex.maxQ;
          totalPctSum += ex.effPct;
          attemptedCount++;
        }
      });

      const hasAnyAttempt = attemptedCount > 0;
      const avgPct = hasAnyAttempt ? Math.round(totalPctSum / attemptedCount) : 0;
      const grade = hasAnyAttempt ? ((typeof getGrade === 'function') ? getGrade(avgPct) : '—') : '—';
      const displayGrade = (grade === 'S' || grade === '★') ? '★' : grade;
      const color = hasAnyAttempt ? getExamGradeColor(displayGrade) : '#64748b';
      const desc = hasAnyAttempt ? getExamGradeDescription(displayGrade, avgPct) : 'Not Attempted';
      const rateColor = hasAnyAttempt ? (typeof getGradeColorByScore === 'function' ? getGradeColorByScore(avgPct) : color) : '#64748b';
      const ptsDisplay = hasAnyAttempt
        ? (totalMaxQ > 0 ? `${totalPts} <span style="font-size: 14px; color: #64748b; font-weight: 400;">/ ${totalMaxQ}</span>` : `${totalPts}`)
        : `<span style="color:#94a3b8;">—</span>`;

      return `
        <tr style="border-bottom: 1px solid #e2e8f0;" data-class-id="${c.id}">
          <td style="padding: 14px 16px; font-weight: 600; color: #0f172a; font-size: 16px; font-family: var(--fm-font-sans, 'Inter', sans-serif); line-height: 1.35;">${escapeHtml(c.levelName)}</td>
          <td style="padding: 14px 16px; font-weight: 500; color: #0f172a; font-size: 16px; font-family: var(--fm-font-sans, 'Inter', sans-serif); line-height: 1.35;">${escapeHtml(c.name)}</td>
          <td class="cell-dossier-pts" style="padding: 14px 12px; text-align: center; font-size: 16px; font-weight: 600; color: #0f172a; font-family: var(--fm-font-sans, 'Inter', sans-serif); font-variant-numeric: tabular-nums;">
            <div class="dossier-normal-view">
              ${ptsDisplay}
            </div>
            <div class="dossier-edit-view" style="display:none; align-items:center; justify-content:center; gap:6px;">
              ${c.exams.length === 1 ? `
                <input type="number" min="0" max="${c.exams[0].maxQ}" step="1"
                       class="dossier-score-input"
                       data-student-id="${studentId}"
                       data-class-id="${c.id}"
                       data-test-id="${c.exams[0].testId}"
                       data-max-q="${c.exams[0].maxQ}"
                       value="${c.exams[0].hasAttempt ? c.exams[0].pts : ''}"
                       placeholder="${c.exams[0].maxQ}"
                       style="width:58px;height:30px;font-size:14px;font-weight:700;text-align:center;color:#0f172a;background:#f8fafc;border:1.5px solid #38bdf8;border-radius:4px;padding:2px 4px;font-variant-numeric:tabular-nums;"
                       onclick="event.stopPropagation();">
                <span style="font-size:14px;color:#64748b;font-weight:600;">/ ${c.exams[0].maxQ}</span>
              ` : `
                <div style="display:flex;flex-direction:column;gap:4px;align-items:center;">
                  <div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:center;">
                    ${c.exams.map((ex, exIdx) => `
                      <div style="display:inline-flex;align-items:center;gap:2px;" title="${escapeHtml(ex.title)}">
                        <span style="font-size:12px;font-weight:700;color:#64748b;">E${exIdx + 1}:</span>
                        <input type="number" min="0" max="${ex.maxQ}" step="1"
                               class="dossier-score-input"
                               data-student-id="${studentId}"
                               data-class-id="${c.id}"
                               data-test-id="${ex.testId}"
                               data-max-q="${ex.maxQ}"
                               value="${ex.hasAttempt ? ex.pts : ''}"
                               placeholder="${ex.maxQ}"
                               style="width:46px;height:26px;font-size:12px;font-weight:700;text-align:center;color:#0f172a;background:#f8fafc;border:1.5px solid #38bdf8;border-radius:4px;padding:1px 2px;font-variant-numeric:tabular-nums;"
                               onclick="event.stopPropagation();">
                      </div>
                    `).join('')}
                  </div>
                  <span style="font-size:12px;color:#64748b;font-weight:600;">Total: <strong class="dossier-sum-pts">${totalPts}</strong> / ${totalMaxQ || (c.exams.reduce((s, e) => s + e.maxQ, 0))}</span>
                </div>
              `}
            </div>
          </td>
          <td class="cell-dossier-rate" style="padding: 14px 12px; text-align: center; font-size: 16px; font-family: var(--fm-font-sans, 'Inter', sans-serif); font-variant-numeric: tabular-nums;">
            <span class="dossier-rate-val" style="font-weight: 700; color: ${rateColor};">${hasAnyAttempt ? `${avgPct}%` : '—'}</span>
          </td>
          <td class="cell-dossier-grade" style="padding: 12px 10px; text-align: center;">
            <span class="grade-circle dossier-grade-badge" style="display: inline-flex; width: 34px; height: 34px; border-radius: 50%; align-items: center; justify-content: center; font-family: var(--fm-font-display, 'Inter', sans-serif); font-weight: 900; font-size: 16px; color: #0f172a; background: ${color}; box-shadow: 0 1px 4px rgba(0,0,0,0.14);">
              ${displayGrade}
            </span>
          </td>
          <td class="cell-dossier-desc" style="padding: 14px 16px; font-weight: 500; color: #1e293b; font-size: 16px; font-family: var(--fm-font-sans, 'Inter', sans-serif); line-height: 1.35; font-variant-numeric: tabular-nums;">
            <span class="dossier-desc-val">${escapeHtml(desc)}</span>
          </td>
        </tr>
      `;
    }).join('') : `
      <tr>
        <td colspan="6" style="text-align: center; padding: 28px; color: #94a3b8; font-style: italic; font-size: 16px; font-family: var(--fm-font-sans, 'Inter', sans-serif);">
          No official class evaluations recorded for this student yet.
        </td>
      </tr>
    `;

    // Academic Step Summaries Block
    let stepSummariesHtml = '';
    const recSummaries = rec.stepSummaries || {};
    const validSummarySteps = [1, 2, 3].filter(st => recSummaries[st]?.stepAvg != null);
    if (validSummarySteps.length > 0) {
      stepSummariesHtml = `
        <div style="margin-top:24px;padding:18px 20px;background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:8px;">
          <h4 style="margin:0 0 14px;font-size:15px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.04em;">Academic Step Summaries</h4>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:14px;">
            ${validSummarySteps.map(st => {
              const sObj = recSummaries[st];
              const ord = st === 1 ? '1st' : st === 2 ? '2nd' : '3rd';
              const pColor = sObj.predicate === 'EXCELLENT' ? '#c084fc' : (sObj.predicate === 'VERY GOOD' ? '#22c55e' : (sObj.predicate === 'GOOD' ? '#95ff00' : (sObj.predicate === 'ENOUGH' ? '#eab308' : '#ff2d87')));
              return `
                <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;padding:12px;display:flex;flex-direction:column;gap:6px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
                  <span style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;">${ord} Step Average</span>
                  <div style="display:flex;align-items:baseline;justify-content:space-between;">
                    <span style="font-size:22px;font-weight:900;color:#0f172a;font-variant-numeric:tabular-nums;">${Math.round(sObj.stepAvg)}%</span>
                    <span style="font-size:11px;font-weight:800;color:${pColor};background:rgba(15,23,42,0.06);padding:3px 8px;border-radius:4px;">${sObj.predicate}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    // Final Exam Transcript Card (if exists)
    let finalExamHtml = '';
    const fe = studentFinalExam || rec.finalExam;
    if (fe && (fe.practice_score != null || fe.speaking_score != null || fe.certificate_nis)) {
      finalExamHtml = `
        <div style="margin-top:20px;padding:18px 20px;background:#f8fafc;border:1.5px solid #cbd5e1;border-radius:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
            <h4 style="margin:0;font-size:15px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.04em;">Final Examination & Certificate Transcript</h4>
            <span style="font-family:monospace;font-size:12px;font-weight:700;color:#0284c7;background:rgba(2,132,199,0.08);padding:4px 10px;border-radius:4px;border:1px solid rgba(2,132,199,0.2);">${fe.certificate_nis || 'CEC/M/...'}</span>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:12px;">
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
              <span style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Final Practice</span>
              <strong style="font-size:16px;color:#0f172a;font-variant-numeric:tabular-nums;">${fe.practice_score ?? '—'} <span style="font-size:12px;font-weight:600;color:#64748b;">(${fe.practice_predicate || '—'})</span></strong>
            </div>
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
              <span style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Speaking (Cumulative)</span>
              <strong style="font-size:16px;color:#0f172a;font-variant-numeric:tabular-nums;">${fe.speaking_score ?? '—'}</strong>
            </div>
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
              <span style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Vocabulary (Cumulative)</span>
              <strong style="font-size:16px;color:#0f172a;font-variant-numeric:tabular-nums;">${fe.vocab_score ?? '—'}</strong>
            </div>
            <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:6px;padding:10px 12px;box-shadow:0 1px 3px rgba(0,0,0,0.04);">
              <span style="font-size:11px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">Grammar (Cumulative)</span>
              <strong style="font-size:16px;color:#0f172a;font-variant-numeric:tabular-nums;">${fe.grammar_score ?? '—'}</strong>
            </div>
          </div>
        </div>
      `;
    }

    backdrop.innerHTML = `
      <div class="student-dossier-dialog" style="max-width: 860px; width: 94vw; max-height: 94vh;">
        <!-- Standardized 60px Title Area (§1.5.1 Centered Title & Zero Subtitle Clutter Invariant) -->
        <div class="modal-header title-area dossier-modal-toolbar" style="height: 60px !important; min-height: 60px !important; max-height: 60px !important; padding: 0 16px !important; border-bottom: 1.5px solid rgba(255, 255, 255, 0.16) !important; display: flex !important; align-items: center !important; justify-content: center !important; text-align: center !important; background: #1E293B !important; box-sizing: border-box !important; flex-shrink: 0 !important; margin: 0 !important;">
          <h3 class="modal-title" style="margin: 0 !important; font-family: var(--fm-font-display, 'Inter', sans-serif) !important; font-size: 16px !important; font-weight: 800 !important; color: #ffffff !important; line-height: 1 !important; letter-spacing: 0.05em !important; text-transform: uppercase !important; text-align: center !important;">
            STUDENT ACADEMIC REPORT
          </h3>
        </div>

        <!-- Scrollable Document Area -->
        <div class="dossier-modal-scroll" style="padding: 24px; background: #060911;">
          <div id="student-dossier-sheet" class="student-dossier-sheet student-raport-portrait" style="background: #ffffff; color: #0f172a; border-radius: 8px; padding: 36px 40px; box-shadow: 0 8px 32px rgba(0,0,0,0.5); width: 100%; max-width: 800px; margin: 0 auto; box-sizing: border-box; font-family: var(--fm-font-sans, 'Inter', sans-serif);">

            <!-- 1. JUDUL HALAMAN: STUDENT REPORT CARD (32px Inter 900) -->
            <div class="raport-header-title" style="text-align: center; border-bottom: 2.5px solid #0f172a; padding-bottom: 14px; margin-bottom: 22px;">
              <h1 style="font-family: var(--fm-font-display, 'Inter', sans-serif); font-size: 30px; font-weight: 900; color: #0f172a; margin: 0; line-height: 1.1; letter-spacing: -0.01em; text-transform: uppercase;">
                STUDENT REPORT CARD
              </h1>
            </div>

            <!-- 2. PANEL BIODATA BERBARIS ATAS KE BAWAH DENGAN FOTO PASFOTO (UKURAN FOTO MENGIKUTI TEKS) -->
            <div class="student-profile-panel profile-cv-card profile-cv-hero" style="background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 20px 24px; margin-bottom: 24px; box-shadow: 0 2px 6px rgba(0,0,0,0.03); display: flex; gap: 24px; align-items: flex-start;">
              <!-- Foto Siswa: Ukuran Tinggi Mengikuti Kolom Teks Secara Dinamis (Rasio 3:4) -->
              <div id="raport-student-photo-box" style="height: 220px; width: 165px; border-radius: 8px; overflow: hidden; border: 2.5px solid #cbd5e1; flex-shrink: 0; background: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.08); display: flex; align-items: center; justify-content: center; position: relative;">
                ${rec.photo_url
                  ? `<img src="${rec.photo_url}" onerror="this.onerror=null;this.src='${generateAvatarDataUri(rec.displayName || rec.name, rec.gender)}';" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: block;">`
                  : `<img src="${generateAvatarDataUri(rec.displayName || rec.name, rec.gender)}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; display: block;">`
                }
              </div>

              <!-- Stacked Biodata Rows: Rapat, Rapi & Berbaris Atas ke Bawah (Zero Gap Buatan) -->
              <div class="profile-hero-meta-table" style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px;">

                <!-- Row 1: Full Name -->
                <div class="profile-hero-meta-row" style="display: flex; align-items: center; font-size: 16px; line-height: 1.4;">
                  <span class="profile-meta-lbl" style="width: 135px; font-weight: 700; color: #64748b; flex-shrink: 0; white-space: nowrap;">Full Name</span>
                  <span class="profile-meta-colon" style="width: 12px; text-align: center; font-weight: 700; color: #64748b; flex-shrink: 0; margin-right: 8px;">:</span>
                  <strong style="font-family: var(--fm-font-display, 'Inter', sans-serif); font-size: 16px; font-weight: 800; color: #0f172a;">${escapeHtml(rec.displayName || rec.name)}</strong>
                </div>

                <!-- Row 2: Sex / Gender -->
                <div class="profile-hero-meta-row" style="display: flex; align-items: center; font-size: 16px; line-height: 1.4;">
                  <span class="profile-meta-lbl" style="width: 135px; font-weight: 700; color: #64748b; flex-shrink: 0; white-space: nowrap;">Gender</span>
                  <span class="profile-meta-colon" style="width: 12px; text-align: center; font-weight: 700; color: #64748b; flex-shrink: 0; margin-right: 8px;">:</span>
                  <strong style="color: #0f172a; text-transform: capitalize; font-weight: 600;">${escapeHtml(rec.gender || '—')}</strong>
                </div>

                <!-- Row 3: Place & Date of Birth -->
                <div class="profile-hero-meta-row" style="display: flex; align-items: center; font-size: 16px; line-height: 1.4;">
                  <span class="profile-meta-lbl" style="width: 135px; font-weight: 700; color: #64748b; flex-shrink: 0; white-space: nowrap;">Place, DOB</span>
                  <span class="profile-meta-colon" style="width: 12px; text-align: center; font-weight: 700; color: #64748b; flex-shrink: 0; margin-right: 8px;">:</span>
                  <strong style="color: #0f172a; font-weight: 600; font-variant-numeric: tabular-nums;">${escapeHtml(rec.birthplace ? `${rec.birthplace}, ${rec.birth_date || '—'}` : (rec.birth_date || '—'))}</strong>
                </div>

                <!-- Row 4: Age -->
                <div class="profile-hero-meta-row" style="display: flex; align-items: center; font-size: 16px; line-height: 1.4;">
                  <span class="profile-meta-lbl" style="width: 135px; font-weight: 700; color: #64748b; flex-shrink: 0; white-space: nowrap;">Age</span>
                  <span class="profile-meta-colon" style="width: 12px; text-align: center; font-weight: 700; color: #64748b; flex-shrink: 0; margin-right: 8px;">:</span>
                  <strong style="color: #0f172a; font-weight: 600; font-variant-numeric: tabular-nums;">${escapeHtml(rec.ageDisplay || '—')} yo</strong>
                </div>

                <!-- Row 5: Education -->
                <div class="profile-hero-meta-row" style="display: flex; align-items: center; font-size: 16px; line-height: 1.4;">
                  <span class="profile-meta-lbl" style="width: 135px; font-weight: 700; color: #64748b; flex-shrink: 0; white-space: nowrap;">Education</span>
                  <span class="profile-meta-colon" style="width: 12px; text-align: center; font-weight: 700; color: #64748b; flex-shrink: 0; margin-right: 8px;">:</span>
                  <strong style="color: #0f172a; font-weight: 600;">${escapeHtml(formatLastEducation(rec.education))}</strong>
                </div>

                <!-- Row 6: Address -->
                <div class="profile-hero-meta-row" style="display: flex; align-items: baseline; font-size: 16px; line-height: 1.4;">
                  <span class="profile-meta-lbl" style="width: 135px; font-weight: 700; color: #64748b; flex-shrink: 0; white-space: nowrap;">Address</span>
                  <span class="profile-meta-colon" style="width: 12px; text-align: center; font-weight: 700; color: #64748b; flex-shrink: 0; margin-right: 8px;">:</span>
                  <strong style="color: #0f172a; font-weight: 600; line-height: 1.35;">${escapeHtml(formatFullStudentAddress(rec))}</strong>
                </div>

                <!-- Row 7: Course Data (Institusi Program Batch tanpa tanda pemisah strip/titik, font hitam) -->
                <div class="profile-hero-meta-row" style="display: flex; align-items: center; font-size: 16px; line-height: 1.4;">
                  <span class="profile-meta-lbl" style="width: 135px; font-weight: 700; color: #64748b; flex-shrink: 0; white-space: nowrap;">Course Data</span>
                  <span class="profile-meta-colon" style="width: 12px; text-align: center; font-weight: 700; color: #64748b; flex-shrink: 0; margin-right: 8px;">:</span>
                  <strong style="color: #0f172a; font-weight: 700; letter-spacing: 0.01em;">${escapeHtml(courseDataText)}</strong>
                </div>

              </div>
            </div>

            ${isCampStudent ? campRaportHtml : `
              <!-- 4. TABEL NILAI KELAS: LEVEL | CLASS NAME | POINT | RATE | GRADE | GRADE DESCRIPTION -->
              <div class="level-transcript-block" style="margin-top: 10px;">
                <table class="dossier-table" style="width: 100%; border-collapse: collapse; font-family: var(--fm-font-sans, 'Inter', sans-serif); font-variant-numeric: tabular-nums;">
                  <thead>
                    <tr style="background: #f1f5f9; border-top: 1.5px solid #cbd5e1; border-bottom: 2px solid #cbd5e1;">
                      <th style="width: 16%; text-align: left; padding: 12px 16px; font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em; font-family: var(--fm-font-sans, 'Inter', sans-serif);">LEVEL</th>
                      <th style="width: 32%; text-align: left; padding: 12px 16px; font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em; font-family: var(--fm-font-sans, 'Inter', sans-serif);">CLASS NAME</th>
                      <th style="width: 14%; text-align: center; padding: 12px 12px; font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em; font-family: var(--fm-font-sans, 'Inter', sans-serif);">PTS</th>
                      <th style="width: 10%; text-align: center; padding: 12px 12px; font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em; font-family: var(--fm-font-sans, 'Inter', sans-serif);">RATE</th>
                      <th style="width: 10%; text-align: center; padding: 12px 10px; font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em; font-family: var(--fm-font-sans, 'Inter', sans-serif);">GRADE</th>
                      <th style="width: 18%; text-align: left; padding: 12px 16px; font-size: 16px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.04em; font-family: var(--fm-font-sans, 'Inter', sans-serif);">GRADE DESCRIPTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
              </div>

              ${stepSummariesHtml}
            `}
            ${finalExamHtml}

          </div>
        </div>

        <!-- Modal Footer CTA Area: CLOSE & EDIT MODE (Left) | Student Pager (Center) | Export to PDF (Right) -->
        <div class="modal-footer" style="height: 56px; min-height: 56px; max-height: 56px; padding: 10px 1.5rem; display: flex; align-items: center; justify-content: space-between; border-top: 1.5px solid rgba(255, 255, 255, 0.16); background: rgba(0, 0, 0, 0.3); flex-shrink: 0; box-sizing: border-box;">

          <!-- Pojok Kiri Bawah: CLOSE & EDIT MODE Buttons -->
          <div style="flex: 1; display: flex; justify-content: flex-start; align-items: center; gap: 8px;">
            <button type="button" class="btn btn-secondary btn-sm btn-modal-close-left" id="btn-close-dossier-modal" style="display: inline-flex !important; align-items: center; justify-content: center; font-family: var(--fm-font-sans, 'Inter', sans-serif); font-weight: 700; font-size: 14px; background: rgba(255, 255, 255, 0.08); color: #f8fafc; border: 1px solid rgba(255, 255, 255, 0.2); padding: 8px 22px; border-radius: 6px; cursor: pointer;">
              CLOSE
            </button>
            <button type="button" class="btn btn-sm" id="btn-dossier-toggle-edit" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:transparent;border:1px solid #38bdf8;color:#38bdf8;transition:all 0.15s ease;" title="Toggle Edit Mode to calibrate student scores">
              ${getSvgIcon('edit', 14)} Edit Mode
            </button>
          </div>

          <!-- Tengah Area CTA: Tombol Panah Pindah Siswa (Carousel Pager) -->
          <div style="flex: 1; display: flex; justify-content: center; align-items: center;">
            ${list.length > 1 ? `
              <div class="d-flex align-center gap-1" style="background: rgba(255, 255, 255, 0.05); padding: 3px 8px; border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.12);">
                <button class="btn btn-secondary btn-sm" id="btn-modal-prev-dossier" ${!hasPrev ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : 'style="cursor:pointer;"'} title="Previous Student (ArrowLeft)">←</button>
                <span style="padding: 0 10px; font-weight: 700; color: #f8fafc; font-family: var(--fm-font-sans, 'Inter', sans-serif); font-size: 14px; font-variant-numeric: tabular-nums;">${positionText}</span>
                <button class="btn btn-secondary btn-sm" id="btn-modal-next-dossier" ${!hasNext ? 'disabled style="opacity:0.3;cursor:not-allowed;"' : 'style="cursor:pointer;"'} title="Next Student (ArrowRight)">→</button>
              </div>
            ` : ''}
          </div>

          <!-- Pojok Kanan Bawah: Export to PDF -->
          <div style="flex: 1; display: flex; justify-content: flex-end;">
            <button type="button" class="btn btn-primary btn-sm" id="btn-export-pdf-dossier" style="display: inline-flex; align-items: center; gap: 8px; font-weight: 700; background: linear-gradient(135deg, #0284c7, #0369a1); border: 1px solid #38bdf8; font-family: var(--fm-font-sans, 'Inter', sans-serif); font-size: 14px; padding: 8px 18px; border-radius: 6px; cursor: pointer; color: #ffffff;">
              ${getSvgIcon('download', 16)} Export to PDF
            </button>
          </div>

        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    // Dynamically synchronize photo box height and 3:4 width with exact text table height
    const syncRaportPhotoHeight = () => {
      const metaTable = backdrop.querySelector('.profile-hero-meta-table');
      const photoBox = backdrop.querySelector('#raport-student-photo-box');
      if (metaTable && photoBox) {
        const h = metaTable.offsetHeight;
        if (h > 60) {
          photoBox.style.height = `${h}px`;
          photoBox.style.width = `${Math.round(h * 3 / 4)}px`;
        }
      }
    };
    requestAnimationFrame(syncRaportPhotoHeight);
    setTimeout(syncRaportPhotoHeight, 50);
    setTimeout(syncRaportPhotoHeight, 250);
    window.addEventListener('resize', syncRaportPhotoHeight);

    const raportPhotoImg = backdrop.querySelector('#raport-student-photo-box img');
    if (raportPhotoImg) {
      if (raportPhotoImg.complete) {
        syncRaportPhotoHeight();
      } else {
        raportPhotoImg.addEventListener('load', syncRaportPhotoHeight, { once: true });
      }
    }

    // Event wiring & Instant Single-Click Modal Dismissal
    let hasDossierEdits = false;
    let isDossierEditOn = false;

    const cleanupDossier = (isReverting = true) => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', syncRaportPhotoHeight);
      document.body.style.overflow = '';
      if (hasDossierEdits && typeof window.renderStudents === 'function') {
        window.renderStudents();
      }
      if (isReverting) {
        const fallback = window._lastSectionBeforeProfile || localStorage.getItem('topscore_admin_last_section') || 'students';
        if (window.history && window.history.replaceState) {
          try {
            const url = new URL(window.location.href);
            url.hash = '#' + fallback;
            window.history.replaceState(null, '', url.toString());
          } catch (_) {}
        } else {
          try { window.location.hash = '#' + fallback; } catch (_) {}
        }
      }
    };

    const closeAllDossierModals = () => {
      document.querySelectorAll('#student-dossier-modal, .student-modal-backdrop, #student-profile-modal').forEach(el => el.remove());
      cleanupDossier(true);
    };

    // Close action (Pojok Kiri Bawah button - Instant 1-Click Close)
    const closeBtn = backdrop.querySelector('#btn-close-dossier-modal');
    if (closeBtn) closeBtn.onclick = (e) => {
      e.stopPropagation();
      closeAllDossierModals();
    };

    // Edit Mode Toggle Button inside Student Academic Report
    const toggleDossierEditBtn = backdrop.querySelector('#btn-dossier-toggle-edit');
    if (toggleDossierEditBtn) {
      toggleDossierEditBtn.onclick = (e) => {
        e.stopPropagation();
        isDossierEditOn = !isDossierEditOn;
        const sheet = backdrop.querySelector('#student-dossier-sheet');
        if (sheet) {
          sheet.querySelectorAll('.dossier-normal-view').forEach(el => {
            el.style.display = isDossierEditOn ? 'none' : 'block';
          });
          sheet.querySelectorAll('.dossier-edit-view').forEach(el => {
            el.style.display = isDossierEditOn ? 'flex' : 'none';
          });
        }
        toggleDossierEditBtn.innerHTML = isDossierEditOn
          ? `${getSvgIcon('check-circle', 14)} Done Editing`
          : `${getSvgIcon('edit', 14)} Edit Mode`;
        toggleDossierEditBtn.style.cssText = isDossierEditOn
          ? 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:#0284c7;border:1px solid #38bdf8;color:#ffffff;box-shadow:0 0 10px rgba(56,189,248,0.45);transition:all 0.15s ease;'
          : 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:transparent;border:1px solid #38bdf8;color:#38bdf8;transition:all 0.15s ease;';
      };
    }

    // Direct Inline Score Edit inside Student Academic Report
    backdrop.addEventListener('change', async (e) => {
      const target = e.target;

      // 1. Handle Academic Assessment Input (Storytelling, Grammar, 4th Subject, Speaking)
      if (target.matches('.dossier-academic-input')) {
        const sId = target.dataset.studentId;
        const stepLevel = parseInt(target.dataset.step, 10);
        const subjectCode = target.dataset.subject;
        const assessmentKey = target.dataset.key;
        const targetScore = Number(target.dataset.target) || 10;
        const valStr = (target.value || '').trim();

        if (!sId || !stepLevel || !subjectCode || !assessmentKey) return;
        if (valStr === '') return;

        const valNum = Number(valStr);
        if (isNaN(valNum)) {
          if (typeof showToast === 'function') showToast('Please enter a valid numeric score.', 'warning');
          return;
        }

        const minVal = subjectCode === 'STORYTELLING' ? 1 : 0;
        const clampedRaw = Math.max(minVal, valNum);
        const percentage = targetScore > 0 ? Math.round((clampedRaw / targetScore) * 10000) / 100 : 0;
        const grade = typeof calculateGrade === 'function' ? calculateGrade(percentage) : (percentage >= 90 ? 'A' : percentage >= 80 ? 'B' : percentage >= 60 ? 'C' : percentage >= 30 ? 'D' : 'E');

        target.value = clampedRaw;

        try {
          if (typeof showLoading === 'function') showLoading('Saving academic score...');
          const sb = await getSupabase();
          const payload = {
            student_id: sId,
            batch_id: rec.batch_id,
            step_level: stepLevel,
            subject_code: subjectCode,
            assessment_key: assessmentKey,
            raw_score: clampedRaw,
            target_score: targetScore,
            percentage: percentage,
            grade: grade,
            assessed_by: 'Academic Desk'
          };
          const { error } = await sb.from('student_academic_assessments')
            .upsert(payload, { onConflict: 'student_id,step_level,subject_code,assessment_key' });
          if (error) throw error;

          hasDossierEdits = true;
          if (typeof clearAdminCache === 'function') clearAdminCache('student_academic_assessments');

          // Update in-memory academicMap
          academicMap.set(`${stepLevel}:${subjectCode}:${assessmentKey}`, {
            raw_score: clampedRaw,
            target_score: targetScore,
            percentage: percentage,
            grade: grade
          });

          // Live update the row pills, NA, Grade, and Predicate
          const tr = target.closest('tr');
          if (tr) {
            const inputsInRow = Array.from(tr.querySelectorAll('.dossier-academic-input'));
            let pctSum = 0;
            let count = 0;
            inputsInRow.forEach(inp => {
              const v = (inp.value || '').trim();
              if (v !== '') {
                const raw = Number(v) || 0;
                const tgt = Number(inp.dataset.target) || 10;
                pctSum += tgt > 0 ? (raw / tgt) * 100 : 0;
                count++;
              }
            });
            const subNa = count > 0 ? Math.round((pctSum / count) * 100) / 100 : null;
            const subGrade = subNa != null ? ((typeof getGrade === 'function') ? getGrade(subNa) : 'C') : '—';
            const subDisplayGrade = (subGrade === 'S' || subGrade === '★') ? '★' : subGrade;
            const subColor = subNa != null ? getExamGradeColor(subDisplayGrade) : '#64748b';
            const subRateColor = subNa != null ? (typeof getGradeColorByScore === 'function' ? getGradeColorByScore(subNa) : subColor) : '#64748b';
            const subDesc = subNa != null ? getExamGradeDescription(subDisplayGrade, subNa) : 'Not Attempted';

            const naEl = tr.querySelector('.dossier-na-val');
            if (naEl) {
              naEl.textContent = subNa != null ? `${Math.round(subNa)}%` : '—';
              naEl.style.color = subRateColor;
            }
            const gradeEl = tr.querySelector('.dossier-grade-badge');
            if (gradeEl) {
              gradeEl.textContent = subDisplayGrade;
              gradeEl.style.background = subColor;
            }
            const predEl = tr.querySelector('.dossier-pred-val');
            if (predEl) predEl.textContent = subDesc;

            // Update normal view pills
            const normalView = tr.querySelector('.dossier-normal-view');
            if (normalView) {
              normalView.innerHTML = inputsInRow.map(inp => {
                const k = inp.dataset.key;
                const v = (inp.value || '').trim();
                const tgt = Number(inp.dataset.target) || 10;
                const raw = v !== '' ? Number(v) : null;
                const p = raw != null && tgt > 0 ? Math.round((raw / tgt) * 100) : null;
                const label = k === 'PRACTICE' ? 'Practice' : k;
                return `<span style="display:inline-flex;align-items:center;padding:2px 6px;background:#f1f5f9;border:1px solid #cbd5e1;border-radius:4px;font-size:12px;font-weight:700;color:#0f172a;margin:2px;">${label}: <strong style="margin-left:3px;color:${p != null ? (p >= 60 ? '#16a34a' : '#dc2626') : '#64748b'};">${raw != null ? `${raw}/${tgt}` : '—'}</strong></span>`;
              }).join('');
            }
          }

          // Live update Step Average & Predicate in table header and tfoot
          const stepContainer = target.closest('[data-step-container]');
          if (stepContainer) {
            const naVals = [];
            stepContainer.querySelectorAll('tbody tr').forEach(row => {
              const text = row.querySelector('.dossier-na-val')?.textContent?.trim() || '';
              if (text && text !== '—') {
                const num = parseFloat(text.replace('%', ''));
                if (!isNaN(num)) naVals.push(num);
              }
            });
            const newStepAvg = naVals.length > 0 ? Math.round((naVals.reduce((a, b) => a + b, 0) / naVals.length) * 100) / 100 : null;
            const newPred = newStepAvg != null ? (typeof getCertificatePredicate === 'function' ? getCertificatePredicate(newStepAvg) : (newStepAvg >= 90 ? 'EXCELLENT' : newStepAvg >= 80 ? 'VERY GOOD' : newStepAvg >= 70 ? 'GOOD' : newStepAvg >= 60 ? 'ENOUGH' : 'LESS')) : '—';
            const newPredColor = newPred === 'EXCELLENT' ? '#c084fc' : (newPred === 'VERY GOOD' ? '#22c55e' : (newPred === 'GOOD' ? '#95ff00' : (newPred === 'ENOUGH' ? '#eab308' : '#ff2d87')));

            const headerAvg = stepContainer.querySelector('.step-header-avg');
            if (headerAvg) headerAvg.textContent = newStepAvg != null ? `${Math.round(newStepAvg)}%` : '—';
            const headerPred = stepContainer.querySelector('.step-header-pred');
            if (headerPred) {
              headerPred.textContent = newPred;
              headerPred.style.background = newPredColor;
            }

            const footerAvg = stepContainer.querySelector('.step-footer-avg');
            if (footerAvg) footerAvg.textContent = newStepAvg != null ? `${Math.round(newStepAvg)}%` : '—';
            const footerPred = stepContainer.querySelector('.step-footer-pred span');
            if (footerPred) {
              footerPred.textContent = newPred;
              footerPred.style.background = newPredColor;
            }

            if (rec.stepSummaries && rec.stepSummaries[stepLevel]) {
              rec.stepSummaries[stepLevel].stepAvg = newStepAvg;
              rec.stepSummaries[stepLevel].predicate = newPred;
            }
          }

          if (typeof showToast === 'function') showToast(`✓ ${subjectCode} ${assessmentKey} saved: ${clampedRaw}/${targetScore} (${percentage}%)`, 'success', 2000);
        } catch (err) {
          console.error('Error saving academic score:', err);
          if (typeof showToast === 'function') showToast('Failed to save score: ' + (err.message || err), 'error');
        } finally {
          if (typeof hideLoading === 'function') hideLoading();
        }
        return;
      }

      // 2. Handle Final Examination Field Input
      if (target.matches('.dossier-final-input')) {
        const sId = target.dataset.studentId;
        const field = target.dataset.field;
        const val = (target.value || '').trim();
        if (!sId || !field) return;

        try {
          if (typeof showLoading === 'function') showLoading('Saving final exam detail...');
          const sb = await getSupabase();
          const { error } = await sb.from('student_final_examinations')
            .update({ [field]: val })
            .eq('student_id', sId);
          if (error) throw error;
          hasDossierEdits = true;
          if (typeof showToast === 'function') showToast('✓ Final exam detail saved', 'success', 2000);
        } catch (err) {
          console.error('Error updating final exam field:', err);
          if (typeof showToast === 'function') showToast('Failed to update final exam: ' + (err.message || err), 'error');
        } finally {
          if (typeof hideLoading === 'function') hideLoading();
        }
        return;
      }

      // 3. Handle Standard / Non-Camp Exam Score Input
      if (target.matches('.dossier-score-input')) {
        const sId = target.dataset.studentId;
        const cId = target.dataset.classId;
        const tId = target.dataset.testId;
        const maxQ = Number(target.dataset.maxQ) || 120;
        const valStr = (target.value || '').trim();

        if (!sId || !cId || !tId) return;

        if (valStr === '') return;

        const valNum = Number(valStr);
        if (isNaN(valNum)) {
          if (typeof showToast === 'function') showToast('Please enter a valid numeric score.', 'warning');
          return;
        }

        const clampedPts = Math.round(Math.max(0, Math.min(maxQ, valNum)));
        const pct = maxQ > 0 ? Math.round((clampedPts / maxQ) * 100) : 0;
        const grade = typeof calculateGrade === 'function' ? calculateGrade(pct) : 'C';

        target.value = clampedPts;

        try {
          if (typeof showLoading === 'function') showLoading('Saving score...');
          await adminApplyForgiven({
            classId: cId,
            studentIds: [sId],
            testActions: [{
              testId: tId,
              action: 'manual',
              percentage: pct,
              score: clampedPts,
              grade
            }],
            forgivenBy: 'Mr. Top',
            reason: 'Student Dossier Direct Edit'
          });

          hasDossierEdits = true;
          if (typeof clearAdminCache === 'function') clearAdminCache('attempts');

          // Update the row display live
          const tr = target.closest('tr');
          if (tr) {
            const inputsInRow = Array.from(tr.querySelectorAll('.dossier-score-input'));
            let rowTotalPts = 0;
            let rowTotalMaxQ = 0;
            let rowPctSum = 0;
            let count = 0;
            inputsInRow.forEach(inp => {
              const v = (inp.value || '').trim();
              if (v !== '') {
                const p = Number(v) || 0;
                const m = Number(inp.dataset.maxQ) || 120;
                rowTotalPts += p;
                rowTotalMaxQ += m;
                rowPctSum += (m > 0 ? (p / m) * 100 : 0);
                count++;
              }
            });
            const rowAvgPct = count > 0 ? Math.round(rowPctSum / count) : 0;
            const rowGrade = count > 0 ? ((typeof getGrade === 'function') ? getGrade(rowAvgPct) : '—') : '—';
            const rowDisplayGrade = (rowGrade === 'S' || rowGrade === '★') ? '★' : rowGrade;
            const rowColor = count > 0 ? getExamGradeColor(rowDisplayGrade) : '#64748b';
            const rowRateColor = count > 0 ? (typeof getGradeColorByScore === 'function' ? getGradeColorByScore(rowAvgPct) : rowColor) : '#64748b';
            const rowDesc = count > 0 ? getExamGradeDescription(rowDisplayGrade, rowAvgPct) : 'Not Attempted';

            const normalView = tr.querySelector('.dossier-normal-view');
            if (normalView) {
              normalView.innerHTML = count > 0
                ? (rowTotalMaxQ > 0 ? `${rowTotalPts} <span style="font-size: 14px; color: #64748b; font-weight: 400;">/ ${rowTotalMaxQ}</span>` : `${rowTotalPts}`)
                : `<span style="color:#94a3b8;">—</span>`;
            }
            const sumPtsEl = tr.querySelector('.dossier-sum-pts');
            if (sumPtsEl) sumPtsEl.textContent = rowTotalPts;

            const rateVal = tr.querySelector('.dossier-rate-val');
            if (rateVal) {
              rateVal.textContent = count > 0 ? `${rowAvgPct}%` : '—';
              rateVal.style.color = rowRateColor;
            }

            const gradeBadge = tr.querySelector('.dossier-grade-badge');
            if (gradeBadge) {
              gradeBadge.textContent = rowDisplayGrade;
              gradeBadge.style.background = rowColor;
            }

            const descVal = tr.querySelector('.dossier-desc-val');
            if (descVal) descVal.textContent = rowDesc;
          }

          if (typeof showToast === 'function') showToast(`✓ Score saved: ${clampedPts} pts (${pct}%)`, 'success', 2000);
        } catch (err) {
          console.error('Error saving dossier score:', err);
          if (typeof showToast === 'function') showToast('Failed to save score: ' + (err.message || err), 'error');
        } finally {
          if (typeof hideLoading === 'function') hideLoading();
        }
      }
    });

    backdrop.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.target.matches('.dossier-score-input') || e.target.matches('.dossier-academic-input') || e.target.matches('.dossier-final-input'))) {
        e.target.blur();
      }
    });

    backdrop.onclick = (e) => {
      if (e.target === backdrop) {
        closeAllDossierModals();
      }
    };

    // Carousel actions in Center of CTA
    const prevBtn = backdrop.querySelector('#btn-modal-prev-dossier');
    const nextBtn = backdrop.querySelector('#btn-modal-next-dossier');
    if (prevBtn && hasPrev) {
      prevBtn.onclick = (e) => {
        e.stopPropagation();
        closeAllDossierModals();
        window.showStudentDossierModal(prevId);
      };
    }
    if (nextBtn && hasNext) {
      nextBtn.onclick = (e) => {
        e.stopPropagation();
        closeAllDossierModals();
        window.showStudentDossierModal(nextId);
      };
    }

    // Export PDF (Portrait A4)
    const exportPdfBtn = backdrop.querySelector('#btn-export-pdf-dossier');
    if (exportPdfBtn) {
      exportPdfBtn.onclick = async () => {
        syncRaportPhotoHeight();

        if (typeof window.html2pdf !== 'function') {
          showToast('Loading PDF engine...', 'info');
          try {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = './js/vendor/html2pdf.bundle.min.js?v=20261119_v1';
              script.onload = resolve;
              script.onerror = () => {
                const cdnScript = document.createElement('script');
                cdnScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                cdnScript.onload = resolve;
                cdnScript.onerror = reject;
                document.head.appendChild(cdnScript);
              };
              document.head.appendChild(script);
            });
          } catch (e) {
            showToast('Failed to load PDF engine. Check connection or vendor files.', 'error');
            return;
          }
        }

        const sheetEl = backdrop.querySelector('#student-dossier-sheet');
        if (!sheetEl) return;

        const safeStudentName = (rec.displayName || rec.name || 'Student').replace(/[^a-zA-Z0-9_-]/g, '_');
        const filename = `TopsCore_Raport_${safeStudentName}_${cleanBatch || 'General'}.pdf`;

        showToast('Exporting Portrait PDF Raport...', 'info');
        exportPdfBtn.disabled = true;
        exportPdfBtn.style.opacity = '0.6';

        try {
          const opt = {
            margin: [8, 10, 8, 10],
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
          };

          await window.html2pdf().set(opt).from(sheetEl).save();
          showToast('Portrait PDF Raport downloaded!', 'success');
        } catch (err) {
          console.error('PDF Export Error:', err);
          showToast('Failed to export PDF: ' + (err.message || err), 'error');
        } finally {
          exportPdfBtn.disabled = false;
          exportPdfBtn.style.opacity = '1';
        }
      };
    }

    const onKey = (e) => {
      if (e.key === 'Escape') {
        backdrop.remove();
        cleanupDossier(true);
      } else if (e.key === 'ArrowLeft' && hasPrev && !isDossierEditOn) {
        backdrop.remove();
        cleanupDossier(false);
        window.showStudentDossierModal(prevId);
      } else if (e.key === 'ArrowRight' && hasNext && !isDossierEditOn) {
        backdrop.remove();
        cleanupDossier(false);
        window.showStudentDossierModal(nextId);
      }
    };
    window.addEventListener('keydown', onKey);
  };

  // Initialize DataGrid
  const gridContainer = area.querySelector('#student-grid-container') || document.getElementById('student-grid-container');
  if (!gridContainer) return;

  const CAMP_ATTENDANCE_CLASSES_BY_LEVEL = {
    1: [
      { suffix: '1BASIC', fallbackModality: 'BASIC', name: 'Camp 1st Basic English' },
      { suffix: '1VOCAB', fallbackModality: 'VOCAB', name: 'Camp 1st Vocabulary' },
      { suffix: '1STORY', fallbackModality: 'STORY', name: 'Camp 1st Storytelling' },
      { suffix: '1GRAM', fallbackModality: 'GRMMR', name: 'Camp 1st Grammar' },
      { suffix: '1SPEAK', fallbackModality: 'SPEAK', name: 'Camp 1st Speaking' }
    ],
    2: [
      { suffix: '2GFS', fallbackModality: 'GFORS', name: 'Camp 2nd Grammar for Speaking' },
      { suffix: '2VOCAB', fallbackModality: 'VOCAB', name: 'Camp 2nd Vocabulary' },
      { suffix: '2STORY', fallbackModality: 'STORY', name: 'Camp 2nd Storytelling' },
      { suffix: '2GRAM', fallbackModality: 'GRMMR', name: 'Camp 2nd Grammar' },
      { suffix: '2SPEAK', fallbackModality: 'SPEAK', name: 'Camp 2nd Speaking' }
    ],
    3: [
      { suffix: '3PRON', fallbackModality: 'PRONC', name: 'Camp 3rd Pronunciation' },
      { suffix: '3VOCAB', fallbackModality: 'VOCAB', name: 'Camp 3rd Vocabulary' },
      { suffix: '3STORY', fallbackModality: 'STORY', name: 'Camp 3rd Storytelling' },
      { suffix: '3GRAM', fallbackModality: 'GRMMR', name: 'Camp 3rd Grammar' },
      { suffix: '3SPEAK', fallbackModality: 'SPEAK', name: 'Camp 3rd Speaking' }
    ]
  };

  function findCampAttendanceClass(levelNum, spec) {
    const normSuffix = spec.suffix.toUpperCase();
    for (const c of classesMap.values()) {
      const code = (c.code || '').toUpperCase().replace(/^CMP-/, 'CAMP-');
      if (code === `CAMP-${normSuffix}`) return c;
    }
    for (const c of classesMap.values()) {
      const code = (c.code || '').toUpperCase();
      if (code.endsWith(normSuffix) || code.includes(`-${normSuffix}`)) return c;
    }
    const levelOrdinal = levelNum === 1 ? '1st' : (levelNum === 2 ? '2nd' : '3rd');
    for (const c of classesMap.values()) {
      const name = (c.name || '').toLowerCase();
      if (name.includes('camp') && name.includes(levelOrdinal)) {
        if (spec.fallbackModality === 'VOCAB' && name.includes('vocab')) return c;
        if (spec.fallbackModality === 'STORY' && name.includes('story')) return c;
        if (spec.fallbackModality === 'GRMMR' && name.includes('grammar') && !name.includes('speaking')) return c;
        if (spec.fallbackModality === 'BASIC' && name.includes('basic')) return c;
        if (spec.fallbackModality === 'GFORS' && (name.includes('speaking') && name.includes('grammar') || name.includes('gfs'))) return c;
        if (spec.fallbackModality === 'PRONC' && name.includes('pronun')) return c;
        if (spec.fallbackModality === 'SPEAK' && name.includes('speaking') && !name.includes('grammar')) return c;
      }
    }
    if (Array.isArray(allClasses)) {
      for (const c of allClasses) {
        const code = (c.code || '').toUpperCase().replace(/^CMP-/, 'CAMP-');
        if (code === `CAMP-${normSuffix}`) return c;
      }
      for (const c of allClasses) {
        const name = (c.name || '').toLowerCase();
        if (name.includes('camp') && name.includes(levelOrdinal)) {
          if (spec.fallbackModality === 'VOCAB' && name.includes('vocab')) return c;
          if (spec.fallbackModality === 'STORY' && name.includes('story')) return c;
          if (spec.fallbackModality === 'GRMMR' && name.includes('grammar') && !name.includes('speaking')) return c;
          if (spec.fallbackModality === 'BASIC' && name.includes('basic')) return c;
          if (spec.fallbackModality === 'GFORS' && (name.includes('speaking') && name.includes('grammar') || name.includes('gfs'))) return c;
          if (spec.fallbackModality === 'PRONC' && name.includes('pronun')) return c;
          if (spec.fallbackModality === 'SPEAK' && name.includes('speaking') && !name.includes('grammar')) return c;
        }
      }
    }
    return {
      id: `camp_${spec.suffix.toLowerCase()}`,
      name: spec.name,
      code: `CAMP-${spec.suffix}`,
      program_id: currentProgramId
    };
  }

  if (window._studentRosterTab === 'attendance') {
    let attendanceClasses = [];
    if (isCampProgram) {
      const attLvl = window._attendancePage || 1;
      const targetSpecs = CAMP_ATTENDANCE_CLASSES_BY_LEVEL[attLvl] || CAMP_ATTENDANCE_CLASSES_BY_LEVEL[1];
      attendanceClasses = targetSpecs.map(spec => findCampAttendanceClass(attLvl, spec));
    }

    await renderBatchAttendance(gridContainer, {
      batchId: window._filterBatchId,
      batchName: window._filterBatchName || currentProgram?.name || 'Batch',
      programId: currentProgramId,
      levelNumber: isCampProgram ? (window._attendancePage || 1) : 0,
      students: filteredGridData,
      batchClasses: attendanceClasses,
      allClasses,
      allBatches,
      allLevels,
      classesMap
    });
    return;
  }

  // ── Per-Class Column Discovery (Phase 214 & Phase 237) ──────────────────────
  // Collect active class IDs belonging strictly to the active program / filtered student set,
  // then build dynamic columns for each.
  const activeClassIdsInGrid = new Set();
  filteredGridData.forEach(row => {
    if (row.perClassFinal) row.perClassFinal.forEach((_, cId) => {
      const cls = classesMap.get(cId);
      const matchInst = !cls?.institution_id || !row.institution_id || cls.institution_id === row.institution_id;
      if (cls && (!currentProgramId || !cls.program_id || cls.program_id === currentProgramId) && matchInst) {
        activeClassIdsInGrid.add(cId);
      }
    });
  });
  // Also include classes where any student in the batch has progress (enrolled but no attempts yet)
  (allProgress || []).forEach(p => {
    const cls = classesMap.get(p.class_id);
    if (cls && (!currentProgramId || !cls.program_id || cls.program_id === currentProgramId)) {
      const studentRow = filteredGridData.find(r => r.id === p.student_id);
      const matchInst = !cls.institution_id || !studentRow?.institution_id || cls.institution_id === studentRow.institution_id;
      if (studentRow && matchInst) activeClassIdsInGrid.add(p.class_id);
    }
  });

  // Sort classes by name for consistent column order
  const activeClassColumns = [...activeClassIdsInGrid]
    .map(cId => classesMap.get(cId))
    .filter(Boolean)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // ── Camp 5-Class Fixed Raport Columns (1st, 2nd, 3rd Step) ───────────────────
  // Sub-headers:
  // Vocab: W1, W2, W3, W4, NA (existing system test attempts strictly preserved)
  // Storytelling: W1, W2, W3, W4, NA (rubric 1-5, NA average percentage)
  // Grammar: U1, U2, NA (points, NA average percentage)
  // 4th Subject: U1, U2, NA (Step 1 Basic, Step 2 GFS, Step 3 Pronunciation)
  // Speaking: U1, U2, PR/U3, NA (Step 1 has PR, Steps 2 & 3 have U3)
  // Step Summary: AVG, PRD
  function getCampRaportColDefs(stepNum = 1) {
    const sNum = parseInt(stepNum, 10) || 1;
    const fourthCode = sNum === 1 ? 'BASIC' : (sNum === 2 ? 'GFS' : 'PRONUNCIATION');
    const gramTarget = sNum === 2 ? 30 : 15;
    const fourthTarget = sNum === 1 ? 100 : (sNum === 2 ? 20 : 25);
    const spkKeys = sNum === 1 ? ['U1', 'U2', 'PRACTICE'] : (sNum === 2 ? ['U1', 'U2'] : ['U1', 'U2', 'U3']);
    const spkLabels = sNum === 1 ? ['U1', 'U2', 'PR'] : (sNum === 2 ? ['U1', 'U2'] : ['U1', 'U2', 'U3']);

    const cols = [];

    // 1. Vocabulary (5 cols: W1, W2, W3, W4, NA) - Read-only from DB test attempts
    const vocabClassCode = `CAMP-${sNum}VOCAB`;
    let vocabClass = null;
    for (const c of classesMap.values()) {
      if ((c.code || '').toUpperCase().replace(/^CMP-/, 'CAMP-') === vocabClassCode) {
        vocabClass = c;
        break;
      }
    }
    const themeMap = { W1: 'A', W2: 'B', W3: 'C', W4: 'D' };
    ['W1', 'W2', 'W3', 'W4'].forEach((wKey, idx) => {
      const tc = themeMap[wKey];
      cols.push({
        key: `_camp_vcb_${sNum}_${wKey.toLowerCase()}`,
        label: wKey,
        shortLabel: wKey,
        microLabel: wKey,
        headerTitle: `Vocabulary Week ${idx + 1} (Exam ${tc})`,
        sortable: true,
        align: 'center',
        width: '52px',
        minWidth: '48px',
        render: (row) => {
          let score = null;
          if (vocabClass && row.perClassFinal?.has(vocabClass.id)) {
            const cs = row.perClassFinal.get(vocabClass.id);
            if (cs?.themeScores && cs.themeScores[tc] != null) score = cs.themeScores[tc];
          }
          if (score == null) {
            const itm = row.academicMap?.get(`${sNum}:VOCABULARY:${wKey}`);
            if (itm?.percentage != null) score = itm.percentage;
          }
          const displayVal = score != null ? Math.round(score) : '—';
          const color = score != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(score) : 'var(--clr-text-3)';
          return `
            <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
              <span style="font-size:12px;font-weight:600;color:${color} !important;font-variant-numeric:tabular-nums;" title="Vocabulary ${wKey}: ${displayVal}%">${displayVal}</span>
            </div>
            <div class="student-inline-input text-center text-muted" style="display:none;font-size:11px;line-height:26px;">${displayVal}</div>
          `;
        }
      });
    });
    // Vocab NA
    cols.push({
      key: `_camp_vcb_${sNum}_na`,
      label: 'NA',
      shortLabel: 'NA',
      microLabel: 'NA',
      headerTitle: 'Vocabulary Final Score (NA)',
      className: 'super-hdr-divider',
      sortable: true,
      align: 'center',
      width: '55px',
      minWidth: '50px',
      render: (row) => {
        const na = row.stepSummaries?.[sNum]?.naVocab;
        const displayVal = na != null ? Math.round(na) : '—';
        const color = na != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(na) : 'var(--clr-text-3)';
        return `
          <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
            <span style="font-size:12px;font-weight:700;color:${color} !important;font-variant-numeric:tabular-nums;" title="Vocabulary NA: ${displayVal}%">${displayVal}</span>
          </div>
          <div class="student-inline-input text-center text-muted" style="display:none;font-size:11px;line-height:26px;">${displayVal}</div>
        `;
      }
    });

    // 2. Storytelling (5 cols: W1, W2, W3, W4, NA) - Rubric 1-5, NA is average %
    ['W1', 'W2', 'W3', 'W4'].forEach((wKey, idx) => {
      cols.push({
        key: `_camp_stt_${sNum}_${wKey.toLowerCase()}`,
        label: wKey,
        shortLabel: wKey,
        microLabel: wKey,
        headerTitle: `Storytelling Week ${idx + 1} (Rubric 1-5)`,
        sortable: true,
        align: 'center',
        width: '52px',
        minWidth: '48px',
        render: (row) => {
          const itm = row.academicMap?.get(`${sNum}:STORYTELLING:${wKey}`);
          const raw = itm?.raw_score != null ? itm.raw_score : '';
          const pct = itm?.percentage != null ? itm.percentage : (raw !== '' ? (raw / 5) * 100 : null);
          const displayVal = raw !== '' ? raw : '—';
          const color = pct != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pct) : 'var(--clr-text-3)';
          return `
            <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
              <span style="font-size:12px;font-weight:600;color:${color} !important;font-variant-numeric:tabular-nums;" title="Storytelling ${wKey}: ${displayVal} / 5 (${pct != null ? Math.round(pct) + '%' : '—'})">${displayVal}</span>
            </div>
            <input type="number"
              class="student-inline-input student-inline-academic-input text-center"
              data-student-id="${row.id}"
              data-batch-id="${row.batch_id || ''}"
              data-step="${sNum}"
              data-subject="STORYTELLING"
              data-type="WEEKLY_DEPOSIT"
              data-key="${wKey}"
              data-target="5"
              min="0"
              max="5"
              step="0.5"
              value="${raw}"
              placeholder="—"
              onclick="event.stopPropagation();">
          `;
        }
      });
    });
    // Storytelling NA
    cols.push({
      key: `_camp_stt_${sNum}_na`,
      label: 'NA',
      shortLabel: 'NA',
      microLabel: 'NA',
      headerTitle: 'Storytelling Final Score (NA)',
      className: 'super-hdr-divider',
      sortable: true,
      align: 'center',
      width: '55px',
      minWidth: '50px',
      render: (row) => {
        const na = row.stepSummaries?.[sNum]?.naStory;
        const displayVal = na != null ? Math.round(na) : '—';
        const color = na != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(na) : 'var(--clr-text-3)';
        return `
          <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
            <span style="font-size:12px;font-weight:700;color:${color} !important;font-variant-numeric:tabular-nums;" title="Storytelling NA: ${displayVal}%">${displayVal}</span>
          </div>
          <div class="student-inline-input text-center text-muted" style="display:none;font-size:11px;line-height:26px;">${displayVal}</div>
        `;
      }
    });

    // 3. Grammar (3 cols: U1, U2, NA)
    ['U1', 'U2'].forEach((uKey, idx) => {
      cols.push({
        key: `_camp_grm_${sNum}_${uKey.toLowerCase()}`,
        label: uKey,
        shortLabel: uKey,
        microLabel: uKey,
        headerTitle: `Grammar Exam ${idx + 1} (Max ${gramTarget})`,
        sortable: true,
        align: 'center',
        width: '58px',
        minWidth: '52px',
        render: (row) => {
          const itm = row.academicMap?.get(`${sNum}:GRAMMAR:${uKey}`);
          const raw = itm?.raw_score != null ? itm.raw_score : '';
          const pct = itm?.percentage != null ? itm.percentage : (raw !== '' ? (raw / gramTarget) * 100 : null);
          const displayVal = raw !== '' ? raw : '—';
          const color = pct != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pct) : 'var(--clr-text-3)';
          return `
            <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
              <span style="font-size:12px;font-weight:600;color:${color} !important;font-variant-numeric:tabular-nums;" title="Grammar ${uKey}: ${displayVal} / ${gramTarget} (${pct != null ? Math.round(pct) + '%' : '—'})">${displayVal}</span>
            </div>
            <input type="number"
              class="student-inline-input student-inline-academic-input text-center"
              data-student-id="${row.id}"
              data-batch-id="${row.batch_id || ''}"
              data-step="${sNum}"
              data-subject="GRAMMAR"
              data-type="PERIODIC_EXAM"
              data-key="${uKey}"
              data-target="${gramTarget}"
              min="0"
              max="${gramTarget}"
              step="1"
              value="${raw}"
              placeholder="—"
              onclick="event.stopPropagation();">
          `;
        }
      });
    });
    // Grammar NA
    cols.push({
      key: `_camp_grm_${sNum}_na`,
      label: 'NA',
      shortLabel: 'NA',
      microLabel: 'NA',
      headerTitle: 'Grammar Final Score (NA)',
      className: 'super-hdr-divider',
      sortable: true,
      align: 'center',
      width: '55px',
      minWidth: '50px',
      render: (row) => {
        const na = row.stepSummaries?.[sNum]?.naGram;
        const displayVal = na != null ? Math.round(na) : '—';
        const color = na != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(na) : 'var(--clr-text-3)';
        return `
          <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
            <span style="font-size:12px;font-weight:700;color:${color} !important;font-variant-numeric:tabular-nums;" title="Grammar NA: ${displayVal}%">${displayVal}</span>
          </div>
          <div class="student-inline-input text-center text-muted" style="display:none;font-size:11px;line-height:26px;">${displayVal}</div>
        `;
      }
    });

    // 4. 4th Subject (3 cols: U1, U2, NA)
    ['U1', 'U2'].forEach((uKey, idx) => {
      cols.push({
        key: `_camp_fourth_${sNum}_${uKey.toLowerCase()}`,
        label: uKey,
        shortLabel: uKey,
        microLabel: uKey,
        headerTitle: `${fourthCode} Exam ${idx + 1} (Max ${fourthTarget})`,
        sortable: true,
        align: 'center',
        width: '58px',
        minWidth: '52px',
        render: (row) => {
          const itm = row.academicMap?.get(`${sNum}:${fourthCode}:${uKey}`);
          const raw = itm?.raw_score != null ? itm.raw_score : '';
          const pct = itm?.percentage != null ? itm.percentage : (raw !== '' ? (raw / fourthTarget) * 100 : null);
          const displayVal = raw !== '' ? raw : '—';
          const color = pct != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pct) : 'var(--clr-text-3)';
          return `
            <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
              <span style="font-size:12px;font-weight:600;color:${color} !important;font-variant-numeric:tabular-nums;" title="${fourthCode} ${uKey}: ${displayVal} / ${fourthTarget} (${pct != null ? Math.round(pct) + '%' : '—'})">${displayVal}</span>
            </div>
            <input type="number"
              class="student-inline-input student-inline-academic-input text-center"
              data-student-id="${row.id}"
              data-batch-id="${row.batch_id || ''}"
              data-step="${sNum}"
              data-subject="${fourthCode}"
              data-type="PERIODIC_EXAM"
              data-key="${uKey}"
              data-target="${fourthTarget}"
              min="0"
              max="${fourthTarget}"
              step="1"
              value="${raw}"
              placeholder="—"
              onclick="event.stopPropagation();">
          `;
        }
      });
    });
    // 4th Subject NA
    cols.push({
      key: `_camp_fourth_${sNum}_na`,
      label: 'NA',
      shortLabel: 'NA',
      microLabel: 'NA',
      headerTitle: `${fourthCode} Final Score (NA)`,
      className: 'super-hdr-divider',
      sortable: true,
      align: 'center',
      width: '55px',
      minWidth: '50px',
      render: (row) => {
        const na = row.stepSummaries?.[sNum]?.naFourth;
        const displayVal = na != null ? Math.round(na) : '—';
        const color = na != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(na) : 'var(--clr-text-3)';
        return `
          <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
            <span style="font-size:12px;font-weight:700;color:${color} !important;font-variant-numeric:tabular-nums;" title="${fourthCode} NA: ${displayVal}%">${displayVal}</span>
          </div>
          <div class="student-inline-input text-center text-muted" style="display:none;font-size:11px;line-height:26px;">${displayVal}</div>
        `;
      }
    });

    // 5. Speaking (4 cols: U1, U2, PR/U3, NA)
    spkKeys.forEach((key, idx) => {
      const lbl = spkLabels[idx];
      cols.push({
        key: `_camp_spk_${sNum}_${key.toLowerCase()}`,
        label: lbl,
        shortLabel: lbl,
        microLabel: lbl,
        headerTitle: `Speaking ${key} (Max 25)`,
        sortable: true,
        align: 'center',
        width: '52px',
        minWidth: '48px',
        render: (row) => {
          const itm = row.academicMap?.get(`${sNum}:SPEAKING:${key}`);
          const raw = itm?.raw_score != null ? itm.raw_score : '';
          const pct = itm?.percentage != null ? itm.percentage : (raw !== '' ? (raw / 25) * 100 : null);
          const displayVal = raw !== '' ? raw : '—';
          const color = pct != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pct) : 'var(--clr-text-3)';
          return `
            <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
              <span style="font-size:12px;font-weight:600;color:${color} !important;font-variant-numeric:tabular-nums;" title="Speaking ${lbl}: ${displayVal} / 25 (${pct != null ? Math.round(pct) + '%' : '—'})">${displayVal}</span>
            </div>
            <input type="number"
              class="student-inline-input student-inline-academic-input text-center"
              data-student-id="${row.id}"
              data-batch-id="${row.batch_id || ''}"
              data-step="${sNum}"
              data-subject="SPEAKING"
              data-type="${key === 'PRACTICE' ? 'PRACTICE' : 'PERIODIC_EXAM'}"
              data-key="${key}"
              data-target="25"
              min="0"
              max="25"
              step="1"
              value="${raw}"
              placeholder="—"
              onclick="event.stopPropagation();">
          `;
        }
      });
    });
    // Speaking NA
    cols.push({
      key: `_camp_spk_${sNum}_na`,
      label: 'NA',
      shortLabel: 'NA',
      microLabel: 'NA',
      headerTitle: 'Speaking Final Score (NA)',
      className: 'super-hdr-divider',
      sortable: true,
      align: 'center',
      width: '55px',
      minWidth: '50px',
      render: (row) => {
        const na = row.stepSummaries?.[sNum]?.naSpeak;
        const displayVal = na != null ? Math.round(na) : '—';
        const color = na != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(na) : 'var(--clr-text-3)';
        return `
          <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
            <span style="font-size:12px;font-weight:700;color:${color} !important;font-variant-numeric:tabular-nums;" title="Speaking NA: ${displayVal}%">${displayVal}</span>
          </div>
          <div class="student-inline-input text-center text-muted" style="display:none;font-size:11px;line-height:26px;">${displayVal}</div>
        `;
      }
    });

    // 6. Step Summary (2 cols: AVG, PRD)
    cols.push({
      key: `_camp_sum_${sNum}_avg`,
      label: 'AVG',
      shortLabel: 'AVG',
      microLabel: 'AVG',
      headerTitle: `Step ${sNum} Average Score (NA Total Step)`,
      sortable: true,
      align: 'center',
      width: '60px',
      minWidth: '55px',
      render: (row) => {
        const avg = row.stepSummaries?.[sNum]?.stepAvg;
        const displayVal = avg != null ? Math.round(avg) : '—';
        const color = avg != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(avg) : 'var(--clr-text-3)';
        return `
          <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
            <span style="font-size:12px;font-weight:700;color:${color} !important;font-variant-numeric:tabular-nums;" title="Step ${sNum} Average: ${avg != null ? avg : '—'}">${displayVal}</span>
          </div>
          <div class="student-inline-input text-center text-muted" style="display:none;font-size:11px;line-height:26px;">${displayVal}</div>
        `;
      }
    });
    cols.push({
      key: `_camp_sum_${sNum}_prd`,
      label: 'PRD',
      shortLabel: 'PRD',
      microLabel: 'PRD',
      headerTitle: `Step ${sNum} Predicate`,
      className: 'super-hdr-divider',
      sortable: true,
      align: 'center',
      width: '85px',
      minWidth: '80px',
      render: (row) => {
        const prd = row.stepSummaries?.[sNum]?.predicate || '—';
        const avg = row.stepSummaries?.[sNum]?.stepAvg;
        const color = avg != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(avg) : '#94a3b8';
        return `
          <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
            <span style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.03em;" title="Predicate: ${prd}">${prd}</span>
          </div>
          <div class="student-inline-input text-center text-muted" style="display:none;font-size:11px;line-height:26px;">${prd}</div>
        `;
      }
    });

    return cols;
  }

  // ── Final Exam & Certificate Roster Columns ──────────────────────────────────
  function getFinalExamColDefs() {
    const cols = [];

    // Helper for Examiner / Tutor numeric sub-column
    const makeScoreCol = (key, label, title, field, maxVal = 25, isDivider = false) => ({
      key,
      label,
      shortLabel: label,
      microLabel: label,
      headerTitle: title,
      className: isDivider ? 'super-hdr-divider' : '',
      sortable: true,
      align: 'center',
      width: '55px',
      minWidth: '48px',
      render: (row) => {
        const fe = row.finalExam;
        const val = fe?.[field] != null ? fe[field] : '';
        const numVal = val !== '' ? Number(val) : null;
        const displayVal = numVal != null ? numVal : '—';
        const color = numVal != null ? 'var(--clr-text-1)' : 'var(--clr-text-3)';
        return `
          <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
            <span style="font-size:12px;font-weight:600;color:${color} !important;font-variant-numeric:tabular-nums;" title="${title}: ${displayVal}">${displayVal}</span>
          </div>
          <input type="number"
            class="student-inline-input student-inline-final-input text-center"
            data-student-id="${row.id}"
            data-field="${field}"
            min="0"
            max="${maxVal}"
            step="1"
            value="${val}"
            placeholder="—"
            onclick="event.stopPropagation();">
        `;
      }
    });

    // Helper for read-only total / computed sub-column
    const makeReadOnlyCol = (key, label, title, getter, isDivider = false, width = '55px') => ({
      key,
      label,
      shortLabel: label,
      microLabel: label,
      headerTitle: title,
      className: isDivider ? 'super-hdr-divider' : '',
      sortable: true,
      align: 'center',
      width,
      minWidth: '48px',
      render: (row) => {
        const { val, color, fullText } = getter(row);
        return `
          <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
            <span style="font-size:12px;font-weight:700;color:${color || 'var(--clr-text-1)'} !important;font-variant-numeric:tabular-nums;" title="${fullText || title}">${val}</span>
          </div>
          <div class="student-inline-input text-center text-muted" style="display:none;font-size:11px;line-height:26px;">${val}</div>
        `;
      }
    });

    // 1. Main Examiner (5 cols: FL, PR, ID, GR, TOT)
    cols.push(makeScoreCol('_fe_ex_fl', 'FL', 'Main Examiner: Fluency (0-25)', 'examiner_fluency', 25));
    cols.push(makeScoreCol('_fe_ex_pr', 'PR', 'Main Examiner: Pronunciation (0-25)', 'examiner_pronunciation', 25));
    cols.push(makeScoreCol('_fe_ex_id', 'ID', 'Main Examiner: Idea (0-25)', 'examiner_idea', 25));
    cols.push(makeScoreCol('_fe_ex_gr', 'GR', 'Main Examiner: Grammar (0-25)', 'examiner_grammar', 25));
    cols.push(makeReadOnlyCol('_fe_ex_tot', 'TOT', 'Main Examiner Total (0-100)', (r) => {
      const tot = r.finalExam?.examiner_total;
      const display = tot != null ? Math.round(tot) : '—';
      const c = tot != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(tot) : 'var(--clr-text-3)';
      return { val: display, color: c, fullText: `Examiner Total: ${display}` };
    }, true));

    // 2. Speaking Tutor (5 cols: FL, PR, GR, CP, TOT)
    cols.push(makeScoreCol('_fe_tu_fl', 'FL', 'Speaking Tutor: Fluency (0-25)', 'tutor_fluency', 25));
    cols.push(makeScoreCol('_fe_tu_pr', 'PR', 'Speaking Tutor: Pronunciation (0-25)', 'tutor_pronunciation', 25));
    cols.push(makeScoreCol('_fe_tu_gr', 'GR', 'Speaking Tutor: Grammar (0-25)', 'tutor_grammar', 25));
    cols.push(makeScoreCol('_fe_tu_cp', 'CP', 'Speaking Tutor: Comprehension (0-25)', 'tutor_comprehension', 25));
    cols.push(makeReadOnlyCol('_fe_tu_tot', 'TOT', 'Speaking Tutor Total (0-100)', (r) => {
      const tot = r.finalExam?.tutor_total;
      const display = tot != null ? Math.round(tot) : '—';
      const c = tot != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(tot) : 'var(--clr-text-3)';
      return { val: display, color: c, fullText: `Tutor Total: ${display}` };
    }, true));

    // 3. Final Practice (2 cols: PRC, PRD)
    cols.push(makeReadOnlyCol('_fe_prc', 'PRC', 'Final Practice Composite Score', (r) => {
      const p = r.finalExam?.practice_score;
      const display = p != null ? Math.round(p) : '—';
      const c = p != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(p) : 'var(--clr-text-3)';
      return { val: display, color: c, fullText: `Practice Score: ${display}` };
    }, false, '60px'));
    cols.push(makeReadOnlyCol('_fe_prc_prd', 'PRD', 'Final Practice Predicate', (r) => {
      const prd = r.finalExam?.practice_predicate || '—';
      const p = r.finalExam?.practice_score;
      const c = p != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(p) : '#94a3b8';
      return { val: prd, color: c, fullText: `Practice Predicate: ${prd}` };
    }, true, '75px'));

    // 4. 4-Skill Cumulative (4 cols: SPK, VCB, PRN, GRM)
    const skills = [
      { key: '_fe_cum_spk', label: 'SPK', title: 'Speaking Cumulative Score', field: 'speaking_score' },
      { key: '_fe_cum_vcb', label: 'VCB', title: 'Vocabulary Cumulative Score', field: 'vocab_score' },
      { key: '_fe_cum_prn', label: 'PRN', title: 'Pronunciation Cumulative Score', field: 'pronunciation_score' },
      { key: '_fe_cum_grm', label: 'GRM', title: 'Grammar Cumulative Score', field: 'grammar_score', isDivider: true }
    ];
    skills.forEach(sk => {
      cols.push({
        key: sk.key,
        label: sk.label,
        shortLabel: sk.label,
        microLabel: sk.label,
        headerTitle: sk.title,
        className: sk.isDivider ? 'super-hdr-divider' : '',
        sortable: true,
        align: 'center',
        width: '60px',
        minWidth: '55px',
        render: (row) => {
          const val = row.finalExam?.[sk.field];
          const display = val != null ? Math.round(val) : '—';
          const c = val != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(val) : 'var(--clr-text-3)';
          return `
            <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
              <span style="font-size:12px;font-weight:600;color:${c} !important;font-variant-numeric:tabular-nums;" title="${sk.title}: ${display}">${display}</span>
            </div>
            <input type="number"
              class="student-inline-input student-inline-final-input text-center"
              data-student-id="${row.id}"
              data-field="${sk.field}"
              min="0"
              max="100"
              step="1"
              value="${val != null ? val : ''}"
              placeholder="—"
              onclick="event.stopPropagation();">
          `;
        }
      });
    });

    // 5. Certificate & Diploma (6 cols: FIN, PRD, NIS, MO, YR, STAT)
    cols.push({
      key: '_fe_cert_final',
      label: 'FIN',
      shortLabel: 'FIN',
      microLabel: 'FIN',
      headerTitle: 'Final Certificate Score (0-100)',
      sortable: true,
      align: 'center',
      width: '60px',
      minWidth: '55px',
      render: (row) => {
        const val = row.finalExam?.final_score;
        const display = val != null ? Math.round(val) : '—';
        const c = val != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(val) : 'var(--clr-text-3)';
        return `
          <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
            <span style="font-size:12px;font-weight:700;color:${c} !important;font-variant-numeric:tabular-nums;" title="Final Score: ${display}">${display}</span>
          </div>
          <input type="number"
            class="student-inline-input student-inline-final-input text-center"
            data-student-id="${row.id}"
            data-field="final_score"
            min="0"
            max="100"
            step="0.1"
            value="${val != null ? val : ''}"
            placeholder="—"
            onclick="event.stopPropagation();">
        `;
      }
    });

    cols.push({
      key: '_fe_cert_prd',
      label: 'PRD',
      shortLabel: 'PRD',
      microLabel: 'PRD',
      headerTitle: 'Certificate Predicate',
      sortable: true,
      align: 'center',
      width: '85px',
      minWidth: '80px',
      render: (row) => {
        const prd = row.finalExam?.certificate_predicate || '—';
        const score = row.finalExam?.final_score;
        const c = score != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(score) : '#94a3b8';
        return `
          <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
            <span style="font-size:11px;font-weight:700;color:${c};text-transform:uppercase;letter-spacing:0.03em;" title="Certificate Predicate: ${prd}">${prd}</span>
          </div>
          <input type="text"
            class="student-inline-input student-inline-final-input text-center"
            data-student-id="${row.id}"
            data-field="certificate_predicate"
            value="${escapeHtml(prd === '—' ? '' : prd)}"
            placeholder="—"
            onclick="event.stopPropagation();">
        `;
      }
    });

    cols.push({
      key: '_fe_cert_nis',
      label: 'NIS',
      shortLabel: 'NIS',
      microLabel: 'NIS',
      headerTitle: 'Certificate NIS Number',
      sortable: true,
      align: 'center',
      width: '145px',
      minWidth: '135px',
      render: (row) => {
        const nis = row.finalExam?.certificate_nis || '';
        const display = nis || '—';
        return `
          <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
            <span style="font-family:var(--fm-font-mono, monospace);font-size:11px;font-weight:600;color:var(--clr-text-2);white-space:nowrap;" title="Certificate NIS: ${display}">${display}</span>
          </div>
          <input type="text"
            class="student-inline-input student-inline-final-input text-center"
            data-student-id="${row.id}"
            data-field="certificate_nis"
            value="${escapeHtml(nis)}"
            placeholder="CEC/M/C.134.../XI/2026"
            onclick="event.stopPropagation();">
        `;
      }
    });

    cols.push({
      key: '_fe_cert_mo',
      label: 'MO',
      shortLabel: 'MO',
      microLabel: 'MO',
      headerTitle: 'Certificate Month (Roman)',
      sortable: true,
      align: 'center',
      width: '55px',
      minWidth: '50px',
      render: (row) => {
        const mo = row.finalExam?.certificate_month || '';
        const display = mo || '—';
        return `
          <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
            <span style="font-size:11px;font-weight:600;color:var(--clr-text-2);" title="Certificate Month: ${display}">${display}</span>
          </div>
          <input type="text"
            class="student-inline-input student-inline-final-input text-center"
            data-student-id="${row.id}"
            data-field="certificate_month"
            value="${escapeHtml(mo)}"
            placeholder="XI"
            onclick="event.stopPropagation();">
        `;
      }
    });

    cols.push({
      key: '_fe_cert_yr',
      label: 'YR',
      shortLabel: 'YR',
      microLabel: 'YR',
      headerTitle: 'Certificate Year',
      sortable: true,
      align: 'center',
      width: '55px',
      minWidth: '50px',
      render: (row) => {
        const yr = row.finalExam?.certificate_year || '';
        const display = yr || '—';
        return `
          <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
            <span style="font-size:11px;font-weight:600;color:var(--clr-text-2);" title="Certificate Year: ${display}">${display}</span>
          </div>
          <input type="number"
            class="student-inline-input student-inline-final-input text-center"
            data-student-id="${row.id}"
            data-field="certificate_year"
            value="${yr}"
            placeholder="2026"
            onclick="event.stopPropagation();">
        `;
      }
    });

    cols.push({
      key: '_fe_cert_stat',
      label: 'STAT',
      shortLabel: 'STAT',
      microLabel: 'STAT',
      headerTitle: 'Certificate Status',
      className: 'super-hdr-divider',
      sortable: true,
      align: 'center',
      width: '80px',
      minWidth: '75px',
      render: (row) => {
        const stat = (row.finalExam?.status || 'DRAFT').toUpperCase();
        const colorMap = {
          ISSUED: 'var(--grade-a)',
          VERIFIED: 'var(--primary-tactical, #38bdf8)',
          SUBMITTED: 'var(--grade-c)',
          DRAFT: 'var(--clr-text-3)'
        };
        const c = colorMap[stat] || 'var(--clr-text-3)';
        return `
          <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
            <span style="font-size:11px;font-weight:700;color:${c};" title="Certificate Status: ${stat}">${stat}</span>
          </div>
          <select class="student-inline-select student-inline-final-select text-center"
            data-student-id="${row.id}"
            data-field="status"
            onclick="event.stopPropagation();">
            <option value="DRAFT" ${stat === 'DRAFT' ? 'selected' : ''}>DRAFT</option>
            <option value="SUBMITTED" ${stat === 'SUBMITTED' ? 'selected' : ''}>SUBMITTED</option>
            <option value="VERIFIED" ${stat === 'VERIFIED' ? 'selected' : ''}>VERIFIED</option>
            <option value="ISSUED" ${stat === 'ISSUED' ? 'selected' : ''}>ISSUED</option>
          </select>
        `;
      }
    });

    return cols;
  }

  // Build dynamic per-class DataGrid column definitions
  const classColCountMap = new Map();
  const perClassColDefs = activeClassColumns.flatMap(cls => {
    const classAllTests = (testsByClass.get(cls.id) || []).slice().sort((a, b) => (a.display_order ?? a.order_index ?? 999) - (b.display_order ?? b.order_index ?? 999));

    // Multi-theme milestone curriculum (4 Themes: Exam 1/A, Exam 2/B, Exam 3/C, Exam 4/D):
    // Covers Camp classes (1st, 2nd, 3rd), classes with > 6 tests, or classes spanning multiple themes (A, B, C, D)
    const isCampClass = Boolean(cls?.name && /camp/i.test(cls.name)) || Boolean(cls?.code && /^CMP-/i.test(cls.code));
    const hasMultipleThemes = ['A', 'B', 'C', 'D'].filter(tc =>
      classAllTests.some(t => t.payload?.theme_code === tc || (t.shell_code && (t.shell_code.includes(`-${tc}-`) || t.shell_code.startsWith(`3${tc}-`))))
    ).length >= 2;
    const isMultiTheme = isCampClass || hasMultipleThemes || (classAllTests.length > 6);

    if (isMultiTheme) {
      classColCountMap.set(cls.id, 4);

      const classExams = classAllTests.filter(t => isWeeklyExam(t));
      const targetExams = classExams.length > 0 ? classExams : classAllTests;

      const findExamForTheme = (tc) => {
        return targetExams.find(t =>
          t.payload?.theme_code === tc ||
          (t.shell_code && (t.shell_code.includes(`-${tc}-`) || t.shell_code.startsWith(`3${tc}-`)))
        );
      };

      const getExamTotalQ = (ex, tc) => {
        let q = Number(ex?.payload?.total_questions || ex?.total_questions || 0);
        if (q > 0) return q;
        if (tc === 'A') return 120;
        if (tc === 'B') return 280;
        if (tc === 'C') return 480;
        if (tc === 'D') return 640;
        return 120;
      };

      const buildThemeExamCol = (themeCode, colKeySuffix, examLabel, isDivider = false) => {
        const exObj = findExamForTheme(themeCode);
        const totalQ = getExamTotalQ(exObj, themeCode);
        return {
          key: `_cls_exam${colKeySuffix}_${cls.id}`,
          label: examLabel,
          className: isDivider ? 'super-hdr-divider' : '',
          sortable: true,
          align: 'center',
          width: '74px',
          minWidth: '68px',
          _classId: cls.id,
          render: (row) => {
            const cs = row.perClassFinal?.get(cls.id);
            const pts = cs?.themes?.[themeCode];
            const pct = cs?.themeScores?.[themeCode] ?? 0;
            const color = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pct) : '#ffffff';
            const formatted = (pts != null && !isNaN(pts)) ? Math.round(Number(pts)) : '';
            const viewHtml = pts == null
              ? `<span class="text-muted" style="font-size: 12px;">—</span>`
              : `<span style="font-size: 12px;font-weight:500;color:${color} !important;font-variant-numeric:tabular-nums;white-space:nowrap !important;" title="Theme ${themeCode} Total Exam Points: ${formatted} pts (${pct}%)">${formatted}</span>`;

            if (exObj) {
              return `
                <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
                  ${viewHtml}
                </div>
                <input type="number"
                  class="student-inline-input student-inline-score-input text-center"
                  style="text-align:center !important;"
                  min="0"
                  max="${totalQ}"
                  step="1"
                  data-student-id="${row.id}"
                  data-class-id="${cls.id}"
                  data-test-id="${exObj.id}"
                  data-total-q="${totalQ}"
                  data-theme-code="${themeCode}"
                  value="${formatted}"
                  placeholder="—"
                  onclick="event.stopPropagation();">
              `;
            }
            return `
              <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
                ${viewHtml}
              </div>
              <input type="text"
                class="student-inline-input text-center text-muted"
                style="text-align:center !important;opacity:0.35;"
                disabled
                value="—"
                onclick="event.stopPropagation();">
            `;
          }
        };
      };

      return [
        buildThemeExamCol('A', '1', 'Exam 1', false),
        buildThemeExamCol('B', '2', 'Exam 2', false),
        buildThemeExamCol('C', '3', 'Exam 3', false),
        buildThemeExamCol('D', '4', 'Exam 4', true)
      ];
    } else {
      // Dynamic columns for discrete tests (e.g. Evnikom Vocabulary, Sheraton Vocabulary)
      // SSOT: Student's Raport strictly shows EXAMS ONLY (zero formative tasks)
      const targetExams = classAllTests.filter(t => isWeeklyExam(t));
      classColCountMap.set(cls.id, Math.max(1, targetExams.length));

      if (targetExams.length === 0) {
        return [{
          key: `_cls_empty_${cls.id}`,
          label: 'No Exams',
          className: 'super-hdr-divider',
          align: 'center',
          width: '90px',
          _classId: cls.id,
          render: () => `<span class="text-muted" style="font-size: 12px;">—</span>`
        }];
      }

      return targetExams.map((t, tIdx) => {
        const shell = t.shell_code || '';
        let shortLabel = shell ? shell.replace('-WORDS-', ' ').replace('-PHRASES-', ' ') : (t.title || 'Exam');
        if (shortLabel.length > 12) {
          shortLabel = `Exam (${t.payload?.theme_code || 'G'})`;
        }
        const totalQ = Number(t.payload?.total_questions || t.total_questions || 100);
        const colKey = `_cls_test_${cls.id}_${t.id}`;
        const isLastColInClass = (tIdx === targetExams.length - 1);
        return {
          key: colKey,
          label: shortLabel,
          className: isLastColInClass ? 'super-hdr-divider' : '',
          sortable: true,
          align: 'center',
          width: '95px',
          minWidth: '80px',
          _classId: cls.id,
          render: (row) => {
            const cs = row.perClassFinal?.get(cls.id);
            const tScore = cs?.testScores?.get(t.id);
            const pts = tScore?.pts;
            const pct = tScore?.pct ?? 0;
            const color = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pct) : '#ffffff';
            const formatted = (pts != null && !isNaN(pts)) ? Math.round(Number(pts)) : '';
            const viewHtml = pts == null
              ? `<span class="text-muted" style="font-size: 12px;">—</span>`
              : `<span style="font-size: 12px;font-weight:500;color:${color} !important;font-variant-numeric:tabular-nums;white-space:nowrap !important;" title="${escapeHtml(t.title)}: ${formatted} pts (${pct}%)">${formatted}</span>`;

            return `
              <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
                ${viewHtml}
              </div>
              <input type="number"
                class="student-inline-input student-inline-score-input text-center"
                style="text-align:center !important;"
                min="0"
                max="${totalQ}"
                step="1"
                data-student-id="${row.id}"
                data-class-id="${cls.id}"
                data-test-id="${t.id}"
                data-total-q="${totalQ}"
                value="${formatted}"
                placeholder="—"
                onclick="event.stopPropagation();">
            `;
          }
        };
      });
    }
  });

  // Build superHeaders:
  // - STUDENTS DATA (colspan 4: Level, Photo, Gender, Name for Data view; colspan 3: Level, Photo, Name for Raport / Final Exam view)
  // - DEMOGRAPHIC (colspan 3: DOB, Age, Education - Data view only)
  // - ADDRESS (colspan 4: Village, District, City/Regency, Province - Data view only)
  // - Active class super-headers (colspan across test/exam sub-columns - Raport view only)
  // - OVERALL PERFORMANCE (colspan 3: DONE, PTS, GRD - Raport view only)
  // - SECURITY (colspan 2: PIN & STATUS)
  // - Standalone Spanning headers: Status & Actions (rowspan="2", height 60px)
  const isRaportView = (window._studentRosterTab === 'raport');
  const isFinalExamView = (window._studentRosterTab === 'final-exam');

  const buildSuperHeaders = () => {
    const sh = [];

    if (isFinalExamView) {
      // Group 1: STUDENTS DATA (Colspan 3: Level, Photo, Name)
      sh.push({
        label: 'STUDENTS DATA',
        colSpan: 3,
        className: 'super-hdr super-hdr-identity super-hdr-students-data',
        style: 'background:#1e293b; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important;'
      });

      // Group 2: MAIN EXAMINER (Colspan 5: FL, PR, ID, GR, TOT)
      sh.push({
        label: 'MAIN EXAMINER',
        colSpan: 5,
        className: 'super-hdr',
        style: 'background:#1e293b; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important;'
      });

      // Group 3: SPEAKING TUTOR (Colspan 5: FL, PR, GR, CP, TOT)
      sh.push({
        label: 'SPEAKING TUTOR',
        colSpan: 5,
        className: 'super-hdr',
        style: 'background:#1e293b; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important;'
      });

      // Group 4: FINAL PRACTICE (Colspan 2: PRC, PRD)
      sh.push({
        label: 'FINAL PRACTICE',
        colSpan: 2,
        className: 'super-hdr',
        style: 'background:#1e3a5f; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important;'
      });

      // Group 5: 4-SKILL CUMULATIVE (Colspan 4: SPK, VCB, PRN, GRM)
      sh.push({
        label: '4-SKILL CUMULATIVE',
        colSpan: 4,
        className: 'super-hdr',
        style: 'background:#1e293b; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important;'
      });

      // Group 6: CERTIFICATE & DIPLOMA (Colspan 6: FIN, PRD, NIS, MO, YR, STAT)
      sh.push({
        label: 'CERTIFICATE & DIPLOMA',
        colSpan: 6,
        className: 'super-hdr',
        style: 'background:#1e3a5f; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important;'
      });

      // Group 7: SECURITY (Colspan 2: PIN & STATUS)
      sh.push({
        label: 'SECURITY',
        colSpan: 2,
        className: 'super-hdr super-hdr-security',
        style: 'background:#1e293b; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35);'
      });
    } else if (isCampProgram && isRaportView) {
      const pageNum = window._raportPage || 1;
      const fourthName = pageNum === 1 ? 'BASIC ENGLISH' : (pageNum === 2 ? 'GRAMMAR FOR SPEAKING' : 'PRONUNCIATION');
      // Group 1: STUDENTS DATA (Colspan 3: Level, Photo, Name)
      sh.push({
        label: 'STUDENTS DATA',
        colSpan: 3,
        className: 'super-hdr super-hdr-identity super-hdr-students-data',
        style: 'background:#1e293b; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important;'
      });

      // Group 2: VOCABULARY (Colspan 5: W1, W2, W3, W4, NA)
      sh.push({
        label: 'VOCABULARY',
        colSpan: 5,
        className: 'super-hdr super-hdr-class',
        style: 'background:#1e293b; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important;'
      });

      // Group 3: STORYTELLING (Colspan 5: W1, W2, W3, W4, NA)
      sh.push({
        label: 'STORYTELLING',
        colSpan: 5,
        className: 'super-hdr super-hdr-class',
        style: 'background:#1e293b; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important;'
      });

      // Group 4: GRAMMAR (Colspan 3: U1, U2, NA)
      sh.push({
        label: 'GRAMMAR',
        colSpan: 3,
        className: 'super-hdr super-hdr-class',
        style: 'background:#1e293b; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important;'
      });

      // Group 5: 4TH SUBJECT (Colspan 3: U1, U2, NA)
      sh.push({
        label: fourthName,
        colSpan: 3,
        className: 'super-hdr super-hdr-class',
        style: 'background:#1e293b; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important;'
      });

      // Group 6: SPEAKING (Colspan: Step 1 = 4 [U1, U2, PR, NA], Step 2 = 3 [U1, U2, NA], Step 3 = 4 [U1, U2, U3, NA])
      const spkColSpan = pageNum === 2 ? 3 : 4;
      sh.push({
        label: 'SPEAKING',
        colSpan: spkColSpan,
        className: 'super-hdr super-hdr-class',
        style: 'background:#1e293b; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important;'
      });

      // Group 7: STEP SUMMARY (Colspan 2: AVG, PRD)
      sh.push({
        label: 'STEP SUMMARY',
        colSpan: 2,
        className: 'super-hdr super-hdr-overall',
        style: 'background:#1e3a5f; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important;'
      });

      // Group 8: SECURITY (Colspan 2: PIN & STATUS)
      sh.push({
        label: 'SECURITY',
        colSpan: 2,
        className: 'super-hdr super-hdr-security',
        style: 'background:#1e293b; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35);'
      });
    } else if (isRaportView) {
      // Group 1: STUDENTS DATA (Colspan 3: Level, Photo, Name)
      sh.push({
        label: 'STUDENTS DATA',
        colSpan: 3,
        className: 'super-hdr super-hdr-identity super-hdr-students-data',
        style: 'background:#1e293b; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important;'
      });

      // Group 2: Active Class Super Headers (Colspan across test/exam sub-columns)
      if (activeClassColumns.length > 0) {
        activeClassColumns.forEach(cls => {
          const colCount = classColCountMap.get(cls.id) || 4;
          sh.push({
            label: escapeHtml(cls.name),
            colSpan: colCount,
            className: 'super-hdr super-hdr-class',
            style: 'background:#1e293b; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px;'
          });
        });
      } else {
        sh.push({
          label: 'CLASSES',
          colSpan: 2,
          className: 'super-hdr super-hdr-class',
          style: 'background:#1e293b; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px;'
        });
      }

      // Group 3: OVERALL (Colspan 3: DONE, PTS, GRD)
      sh.push({
        label: 'OVERALL',
        colSpan: 3,
        className: 'super-hdr super-hdr-overall',
        style: 'background:#1e3a5f; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important;'
      });

      // Group 4: SECURITY (Colspan 2: PIN & STATUS)
      sh.push({
        label: 'SECURITY',
        colSpan: 2,
        className: 'super-hdr super-hdr-security',
        style: 'background:#1e293b; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35);'
      });
    } else {
      // Group 1: STUDENTS DATA (Colspan 4: Level, Photo, Gender, Name)
      sh.push({
        label: 'STUDENTS DATA',
        colSpan: 4,
        className: 'super-hdr super-hdr-identity super-hdr-students-data',
        style: 'background:#1e293b; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important;'
      });

      // Group 2: DEMOGRAPHIC (Colspan 4: Birthplace, DOB, Age, Education)
      sh.push({
        label: 'DEMOGRAPHIC',
        colSpan: 4,
        className: 'super-hdr super-hdr-demographic',
        style: 'background:#1e293b; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important;'
      });

      // Group 3: ADDRESS (Colspan 4: Village, District, City/Regency, Province)
      sh.push({
        label: 'ADDRESS',
        colSpan: 4,
        className: 'super-hdr super-hdr-address',
        style: 'background:#1e293b; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35); border-right:2px solid rgba(255,255,255,0.22) !important;'
      });

      // Group 4: SECURITY (Colspan 2: PIN & STATUS)
      sh.push({
        label: 'SECURITY',
        colSpan: 2,
        className: 'super-hdr super-hdr-security',
        style: 'background:#1e293b; color:#ffffff; font-weight:800; font-size:12px; text-transform:uppercase; letter-spacing:0.04em; text-align:center; height:30px; border-bottom:1px solid rgba(255,255,255,0.35);'
      });
    }

    return sh;
  };

  try { localStorage.removeItem('topscore_col_widths_student_roster_grid'); } catch (_) {}

  studentGrid = new DataGrid({
    container: gridContainer,
    tableId: isFinalExamView ? 'student_roster_final_exam_grid_v2' : (isRaportView ? 'student_roster_raport_grid_v2' : 'student_roster_data_grid_v2'),
    autoFitOnMount: false,
    data: filteredGridData,
    pageSize: 50,
    hideToolbar: true,
    tableLayout: 'fixed',
    searchKeys: (isRaportView || isFinalExamView) ? ['levelName', 'displayName', 'name', 'pinDisplay', 'globalGrade'] : ['levelName', 'displayName', 'name', 'pinDisplay', 'province', 'city', 'district', 'village'],
    initialSortKey: 'displayName',
    initialSortAsc: true,
    stickyActionCol: true,
    superHeaders: buildSuperHeaders(),
    sortComparator: (sortKey, direction, a, b) => {
      // Active students ALWAYS on top, inactive at bottom
      const aActive = ((a._raw || a).is_active !== false) ? 1 : 0;
      const bActive = ((b._raw || b).is_active !== false) ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;

      if (sortKey === 'displayName' || sortKey === 'sortName' || sortKey === 'name' || sortKey === 'instName') {
        const nameA = (a.displayName || a.name || '').toLowerCase();
        const nameB = (b.displayName || b.name || '').toLowerCase();
        return direction === 'desc' ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
      }

      if (sortKey.startsWith('_camp_') || sortKey.startsWith('_fe_')) {
        const scA = a[sortKey] ?? -1;
        const scB = b[sortKey] ?? -1;
        if (typeof scA === 'number' && typeof scB === 'number') {
          if (scA !== scB) return direction === 'asc' ? scA - scB : scB - scA;
        } else {
          const strA = String(scA).toLowerCase();
          const strB = String(scB).toLowerCase();
          if (strA !== strB) return direction === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
        }
      }

      if (sortKey === 'birthplace') {
        const ba = (a.birthplace || '').toLowerCase();
        const bb = (b.birthplace || '').toLowerCase();
        if (ba !== bb) return direction === 'asc' ? ba.localeCompare(bb) : bb.localeCompare(ba);
      } else if (sortKey === 'birth_date') {
        const da = a.birth_date ? new Date(a.birth_date).getTime() : 0;
        const db = b.birth_date ? new Date(b.birth_date).getTime() : 0;
        if (da !== db) return direction === 'asc' ? da - db : db - da;
      } else if (sortKey === 'province') {
        const pa = (a.province || '').toLowerCase();
        const pb = (b.province || '').toLowerCase();
        if (pa !== pb) return direction === 'asc' ? pa.localeCompare(pb) : pb.localeCompare(pa);
      } else if (sortKey === 'city') {
        const ca = (a.city || '').toLowerCase();
        const cb = (b.city || '').toLowerCase();
        if (ca !== cb) return direction === 'asc' ? ca.localeCompare(cb) : cb.localeCompare(ca);
      } else if (sortKey === 'district') {
        const da = (a.district || '').toLowerCase();
        const db = (b.district || '').toLowerCase();
        if (da !== db) return direction === 'asc' ? da.localeCompare(db) : db.localeCompare(da);
      } else if (sortKey === 'village') {
        const va = (a.village || '').toLowerCase();
        const vb = (b.village || '').toLowerCase();
        if (va !== vb) return direction === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      } else if (sortKey === 'education') {
        const ea = formatLastEducation(a.education).toLowerCase();
        const eb = formatLastEducation(b.education).toLowerCase();
        if (ea !== eb) return direction === 'asc' ? ea.localeCompare(eb) : eb.localeCompare(ea);
      } else if (sortKey === 'program_status') {
        const sa = (a.program_status || 'active').toLowerCase();
        const sb = (b.program_status || 'active').toLowerCase();
        if (sa !== sb) return direction === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
      } else if (sortKey === 'pin') {
        const pa = String(a.pin || a.pinDisplay || '');
        const pb = String(b.pin || b.pinDisplay || '');
        if (pa !== pb) return direction === 'asc' ? pa.localeCompare(pb) : pb.localeCompare(pa);
      }

      // Column-specific comparison for class exams & tests
      if (sortKey.includes('_cls_exam') || sortKey.includes('_cls_pts_') || sortKey.includes('_cls_test_')) {
        const scA = a[sortKey] ?? -1;
        const scB = b[sortKey] ?? -1;
        if (scA !== scB) return direction === 'asc' ? scA - scB : scB - scA;
      } else if (sortKey === 'ageDisplay') {
        const ageA = parseFloat(a.ageDisplay) || (a.birth_date ? (new Date().getFullYear() - new Date(a.birth_date).getFullYear()) : -1);
        const ageB = parseFloat(b.ageDisplay) || (b.birth_date ? (new Date().getFullYear() - new Date(b.birth_date).getFullYear()) : -1);
        if (ageA !== ageB) return direction === 'asc' ? ageA - ageB : ageB - ageA;
      } else if (sortKey === 'completedTests') {
        const scA = a.completedTests ?? 0;
        const scB = b.completedTests ?? 0;
        if (scA !== scB) return direction === 'asc' ? scA - scB : scB - scA;
      } else if (sortKey === 'completionPct') {
        const scA = a.completionPct ?? 0;
        const scB = b.completionPct ?? 0;
        if (scA !== scB) return direction === 'asc' ? scA - scB : scB - scA;
      } else if (sortKey === 'overallScoreStr') {
        const scA = a.overallPct ?? -1;
        const scB = b.overallPct ?? -1;
        if (scA !== scB) return direction === 'asc' ? scA - scB : scB - scA;
      } else if (sortKey === 'globalGrade') {
        const rank = { '★': 7, 'S': 7, 'A': 6, 'B': 5, 'C': 4, 'D': 3, 'E': 2, 'F': 1 };
        const rA = rank[a.globalGrade] || 0;
        const rB = rank[b.globalGrade] || 0;
        if (rA !== rB) return direction === 'asc' ? rA - rB : rB - rA;
      } else if (sortKey === 'totalEarnedScore') {
        const scA = a.totalEarnedScore ?? 0;
        const scB = b.totalEarnedScore ?? 0;
        if (scA !== scB) return direction === 'asc' ? scA - scB : scB - scA;
      }

      let valA = a[sortKey];
      let valB = b[sortKey];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;

      // Secondary tie-breaker: Institution -> Program -> Batch -> Level -> Name
      return compareStudentsHierarchical(a, b);
    },
    bulkActions: false,  // Rule 13: Checkbox columns purged
    onBulkAction: async (selectedIds) => {
      // Fetch data for dropdowns
      const [institutions, programs, batches, levels] = await Promise.all([
        adminFetchAll('institutions', 'id, name'),
        adminFetchAll('programs', 'id, name, institution_id'),
        adminFetchAll('batches', 'id, name, program_id, is_active, deleted_at'),
        adminFetchAll('levels', 'id, name, level_number')
      ]);

      const sortFn = (a, b) => (a.name || '').localeCompare(b.name || '');
      institutions.sort(sortFn);
      programs.sort(sortFn);
      const activeBatches = (batches || []).filter(b => !b.deleted_at && b.is_active !== false).sort(sortFn);
      levels.sort(sortFn);

      const existing = document.getElementById('bulk-action-modal');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'bulk-action-modal';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.95);backdrop-filter:blur(5px);z-index:9999;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;';
      overlay.innerHTML = `
        <div style="background:var(--fm-bg-panel, #0F172A);border:1px solid var(--clr-border);border-radius:12px;padding:2rem;width:100%;max-width:500px;">
          <h3 style="margin:0 0 0.5rem;font-size: 16px;">Bulk Edit ${selectedIds.length} Student(s)</h3>
          <p style="color:var(--clr-text-3);font-size: 12px;margin:0 0 1.5rem;">Leave fields blank to keep their current values.</p>

          <div style="display:flex;flex-direction:column;gap:1rem;margin-bottom:2rem;">
            <div>
              <label class="form-label" style="display:block;margin-bottom:0.25rem;">Institution</label>
              <select id="bulk-inst" class="form-input">
                <option value="">-- No Change --</option>
                ${institutions.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label" style="display:block;margin-bottom:0.25rem;">Program / Class</label>
              <select id="bulk-prog" class="form-input">
                <option value="">-- No Change --</option>
                ${programs.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label" style="display:block;margin-bottom:0.25rem;">Batch</label>
              <select id="bulk-batch" class="form-input">
                <option value="">-- No Change --</option>
                ${activeBatches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label" style="display:block;margin-bottom:0.25rem;">Gender</label>
              <select id="bulk-gender" class="form-input">
                <option value="">-- No Change --</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <button id="bulk-save-fields" class="btn btn-primary" style="width:100%;margin-top:0.5rem;">Save Fields</button>
          </div>

          <hr style="border:0;border-top:1px solid var(--clr-border);margin:0 0 1.5rem 0;">

          <h4 style="margin:0 0 0.5rem;font-size: 16px;color:var(--clr-text-2);">Quick Actions</h4>
          <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;">
            <button id="bulk-activate" class="btn btn-success" style="flex:1;">Activate</button>
            <button id="bulk-deactivate" class="btn btn-secondary" style="flex:1;">Deactivate</button>
            <button id="bulk-delete" class="btn btn-danger" style="flex:1;">Delete</button>
          </div>

          <button id="bulk-cancel" class="btn btn-secondary btn-modal-close-left" style="width:100%;">CLOSE</button>
        </div>
      `;
      document.body.appendChild(overlay);

      const close = () => overlay.remove();
      overlay.querySelector('#bulk-cancel').onclick = close;
      overlay.onclick = (e) => { if (e.target === overlay) close(); };

      overlay.querySelector('#bulk-save-fields').onclick = async () => {
        const instId = overlay.querySelector('#bulk-inst').value;
        const progId = overlay.querySelector('#bulk-prog').value;
        const batchId = overlay.querySelector('#bulk-batch').value;
        const gender = overlay.querySelector('#bulk-gender').value;

        const updates = {};
        if (instId) updates.institution_id = instId;
        if (progId) updates.program_id = progId;
        if (batchId) updates.batch_id = batchId;
        if (gender) updates.gender = gender;

        if (Object.keys(updates).length === 0) {
          showToast('No fields changed.', 'info');
          close();
          return;
        }

        const btn = overlay.querySelector('#bulk-save-fields');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        const sb = (await import('../supabase.js?v=20261106_v140')).getSupabase ? await (await import('../supabase.js?v=20261106_v140')).getSupabase() : null;
        if (!sb) { showToast('Cannot connect.', 'error'); close(); return; }

        for (const id of selectedIds) {
          const { error } = await sb.from('students').update(updates).eq('id', id);
          if (error) {
             console.error('Update error on ID', id, error);
             showToast('Failed to update student: ' + error.message, 'error');
             return;
          }
        }

        clearAdminCache('students');
        close();
        showToast(`Updated ${selectedIds.length} students.`, 'success');
        if (typeof window.loadSection === 'function') window.loadSection(window._activeSectionAlias || window._currentSection || 'students'); else renderStudents(area);
      };

      overlay.querySelector('#bulk-activate').onclick = async () => {
        close();
        const sb = (await import('../supabase.js?v=20261106_v140')).getSupabase ? await (await import('../supabase.js?v=20261106_v140')).getSupabase() : null;
        if (!sb) { showToast('Cannot connect.', 'error'); return; }
        for (const id of selectedIds) await sb.from('students').update({ is_active: true }).eq('id', id);
        showToast(`Activated ${selectedIds.length} students.`, 'success');
        renderStudents(area);
      };

      overlay.querySelector('#bulk-deactivate').onclick = async () => {
        close();
        const sb = (await import('../supabase.js?v=20261106_v140')).getSupabase ? await (await import('../supabase.js?v=20261106_v140')).getSupabase() : null;
        if (!sb) { showToast('Cannot connect.', 'error'); return; }
        for (const id of selectedIds) await sb.from('students').update({ is_active: false }).eq('id', id);
        showToast(`Deactivated ${selectedIds.length} students.`, 'success');
        renderStudents(area);
      };

      overlay.querySelector('#bulk-delete').onclick = async () => {
        close();
        const confirmed = await new Promise(resolve => {
          const c = document.createElement('div');
          c.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;';
          c.innerHTML = `<div style="background:var(--fm-bg-panel, #0F172A);border:1px solid rgba(255,0,0,0.5);border-radius:12px;padding:2rem;max-width:380px;text-align:center;">
            <div style="color:var(--grade-e);margin-bottom:0.5rem;">${getSvgIcon('alert-triangle', 36)}</div>
            <h3 style="color:var(--grade-e);margin:0 0 0.5rem;">Delete ${selectedIds.length} Students?</h3>
            <p style="color:var(--clr-text-3);font-size: 12px;margin-bottom:1.5rem;">This will soft-delete all selected students. Their history will be preserved.</p>
            <div style="display:flex;gap:0.75rem;justify-content:center;">
              <button id="c-no" class="btn btn-secondary btn-modal-close-left">CLOSE</button>
              <button id="c-yes" class="btn btn-danger">Yes, Delete</button>
            </div>
          </div>`;
          document.body.appendChild(c);
          c.querySelector('#c-yes').onclick = () => { c.remove(); resolve(true); };
          c.querySelector('#c-no').onclick = () => { c.remove(); resolve(false); };
        });
        if (!confirmed) return;
        for (const id of selectedIds) await adminSoftDelete('students', id);
        showToast(`Deleted ${selectedIds.length} students.`, 'success');
        renderStudents(area);
      };
    },
    // User directive: Do not open modals on general row clicks. Only clicking photo or name opens the report.
    onRowClick: null,
    columns: [
      // 1. Level (Inline Editable in Edit Mode)
      {
        key: 'levelName',
        label: 'LEVEL',
        shortLabel: 'LEVEL',
        microLabel: 'LVL',
        headerTitle: 'LEVEL',
        className: 'col-narrow-header',
        sortable: true,
        align: 'center',
        width: '46px',
        minWidth: '42px',
        render: (row) => {
          const isLvlX = row.isAlumni || isAlumniPanel || row.studentLevelNum === 99 || (row.levelName && (row.levelName.toLowerCase() === 'alumni' || row.levelName.toUpperCase() === 'X'));
          const isNonLvl = !isLvlX && (row.studentLevelNum === 0 || (row.levelName && (row.levelName.toLowerCase() === 'non-level' || row.levelName === '0' || row.levelName === '—' || row.levelName === '-')));
          const shortLvl = isLvlX ? 'X' : (isNonLvl ? '0' : (typeof toShortLevel === 'function' ? toShortLevel(row.studentLevelNum || row.levelName || '1') : (row.levelName || '0')));
          const alumniExitPct = (row.overallScore != null && row.overallScore !== '—') ? parseFloat(row.overallScore) : NaN;
          const alumniScoreColor = !isNaN(alumniExitPct)
            ? ((typeof getGradeColorByScore === 'function') ? getGradeColorByScore(alumniExitPct) : (TOPSCORE_COLORS?.A || 'var(--grade-a)'))
            : (row.overallColor || (TOPSCORE_COLORS?.D || 'var(--grade-d)'));
          const lvlColor = isLvlX ? alumniScoreColor : 'var(--clr-text-1)';

          const sortedLevels = (allLevels || []).slice().sort((a, b) => {
            const numA = (a.level_number === 99 || (a.name || '').toLowerCase() === 'alumni') ? 99 : (a.level_number ?? 1);
            const numB = (b.level_number === 99 || (b.name || '').toLowerCase() === 'alumni') ? 99 : (b.level_number ?? 1);
            return numA - numB;
          });

          const levelOptionsHtml = sortedLevels.map(lvl => {
            const isAlum = lvl.level_number === 99 || (lvl.name || '').toLowerCase() === 'alumni';
            const isNon = lvl.level_number === 0 || (lvl.name || '').toLowerCase() === 'non-level';
            const optLabel = isAlum ? 'X' : (isNon ? '0' : (typeof toShortLevel === 'function' ? toShortLevel(lvl.level_number || lvl.name) : (lvl.name || lvl.level_number)));
            const isSel = (row.level_id === lvl.id) || (isAlum && isLvlX) || (isNon && isNonLvl) || (!isLvlX && !isNonLvl && row.studentLevelNum === lvl.level_number);
            return `<option value="${lvl.id}" ${isSel ? 'selected' : ''}>${escapeHtml(optLabel)}</option>`;
          }).join('');

          if (isLvlX) {
            return `
              <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
                <span style="color:${lvlColor};font-weight:700;font-size: 12px;white-space:nowrap;font-variant-numeric:tabular-nums;" title="Alumni (Level X) • Final Grade">${escapeHtml(shortLvl)}</span>
              </div>
              <select class="student-inline-select student-level-select text-center" data-id="${row.id}" data-field="level_id" onclick="event.stopPropagation();">
                ${levelOptionsHtml}
              </select>
            `;
          }
          if (shortLvl === '—') {
            return `
              <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
                <span style="color:#94a3b8;font-weight:700;font-size: 12px;white-space:nowrap;font-variant-numeric:tabular-nums;">—</span>
              </div>
              <select class="student-inline-select student-level-select text-center" data-id="${row.id}" data-field="level_id" onclick="event.stopPropagation();">
                ${levelOptionsHtml}
              </select>
            `;
          }
          return `
            <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
              <span style="color:#f8fafc;font-weight:700;font-size: 12px;white-space:nowrap;font-variant-numeric:tabular-nums;">${escapeHtml(shortLvl)}</span>
            </div>
            <select class="student-inline-select student-level-select text-center" data-id="${row.id}" data-field="level_id" onclick="event.stopPropagation();">
              ${levelOptionsHtml}
            </select>
          `;
        }
      },
      // 2. Photo (Round Avatar, Single-Responsibility Column 1, Click to Open Profile)
      {
        key: 'photo_url',
        label: 'PHOTO',
        shortLabel: 'PHOTO',
        microLabel: 'PIC',
        headerTitle: 'PHOTO',
        className: 'col-narrow-header',
        sortable: false,
        align: 'center',
        width: '46px',
        minWidth: '42px',
        render: (row) => {
          const avatarUri = row.photo_url || generateAvatarDataUri(row.displayName || row.name, row.gender);
          return `
            <div style="display:flex;align-items:center;justify-content:center;cursor:pointer;"
                 onclick="event.stopPropagation();if(typeof window.showStudentDossierModal==='function')window.showStudentDossierModal('${row.id}');"
                 title="Click to view official academic report (A4 Dossier)">
              <img src="${avatarUri}" onerror="this.onerror=null;this.src='${generateAvatarDataUri(row.displayName || row.name, row.gender)}';"
                   style="width:30px;height:30px;border-radius:50%;object-fit:cover;border:1px solid var(--clr-border);">
            </div>
          `;
        }
      },
      // 3. Gender (Mister / Miss, Placed Before Name After Photo, Data View Only, Inline Editable in Edit Mode)
      ...((!isRaportView && !isFinalExamView) ? [{
        key: 'gender',
        label: 'GENDER',
        shortLabel: 'SEX',
        microLabel: 'SEX',
        headerTitle: 'GENDER',
        sortable: true,
        align: 'center',
        width: '68px',
        minWidth: '64px',
        render: (row) => {
          const g = (row.gender || '').trim().toLowerCase();
          const isM = g === 'male' || g === 'm';
          const isF = g === 'female' || g === 'f';
          const titleText = isM ? 'Male' : (isF ? 'Female' : '—');
          const titleColor = isM ? '#38bdf8' : (isF ? '#c084fc' : 'var(--clr-text-3)');
          return `
            <div class="student-cell-view" style="white-space:nowrap !important;">
              <span style="color:${titleColor};font-size: 12px;font-weight:500;">${titleText}</span>
            </div>
            <select class="student-inline-select student-gender-select" data-id="${row.id}" data-field="gender" onclick="event.stopPropagation();">
              <option value="male" ${isM ? 'selected' : ''}>Male</option>
              <option value="female" ${isF ? 'selected' : ''}>Female</option>
            </select>
          `;
        }
      }] : []),
      // 4. Name (Flex Primary Column — absorbs all remaining container width, min 200px)
      // Canonical key: 'name' aliased to sortName for Datagrid sorting
      {
        key: 'sortName',
        label: 'NAME',
        className: 'super-hdr-divider',
        sortable: true,
        align: 'left',
        minWidth: '200px',
        render: (row) => {
          return `
            <div class="student-cell-view" style="cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"
                 onclick="event.stopPropagation();if(typeof window.showStudentDossierModal==='function')window.showStudentDossierModal('${row.id}');"
                 title="${escapeHtml(row.displayName)}&#10;Click to view official academic report (A4 Dossier)">
              <span style="color:var(--clr-text-1);font-weight:400;font-size: 12px;">${escapeHtml(row.displayName)}</span>
              ${!isAlumniPanel && row.isOrphaned ? `<span style="margin-left:6px;font-size:12px;font-weight:600;color:var(--grade-e);text-shadow:none;">(Disconnected)</span>` : ''}
              ${row.remediationPending ? `<span style="white-space:nowrap;margin-left:6px;font-size:12px;font-weight:600;color:var(--grade-c);text-shadow:none;">(Remediation)</span>` : ''}
            </div>
            <input type="text" class="student-inline-input" data-id="${row.id}" data-field="name" value="${escapeHtml(row.name || row.displayName)}" placeholder="Student Name" onclick="event.stopPropagation();">
          `;
        }
      },
      // Demographic & Address Columns (Data View Only)
      ...((!isRaportView && !isFinalExamView) ? [
        // 5. Birthplace (Place of Birth)
        {
          key: 'birthplace',
          label: 'BIRTHPLACE',
          title: 'Place of Birth',
          sortable: true,
          align: 'left',
          width: '110px',
          minWidth: '100px',
          render: (row) => {
            const bp = row.birthplace || '';
            const display = bp || '—';
            return `
              <div class="student-cell-view" style="white-space:nowrap !important; overflow:hidden; text-overflow:ellipsis;">
                <span style="font-size: 12px;color:${bp ? 'var(--clr-text-2)' : 'var(--grade-c)'};font-weight:400;white-space:nowrap !important;" title="Place of Birth: ${display}">${escapeHtml(display)}</span>
              </div>
              <input type="text" class="student-inline-input" data-id="${row.id}" data-field="birthplace" value="${escapeHtml(bp)}" placeholder="Birthplace" onclick="event.stopPropagation();">
            `;
          }
        },
        // 6. DOB (Date of Birth placed BEFORE Age per user directive)
        {
        key: 'birth_date',
        label: 'DOB',
        title: 'Date of Birth',
        sortable: true,
        align: 'center',
        width: '110px',
        minWidth: '105px',
        render: (row) => {
          const dobFormatted = formatBirthDate(row.birth_date);
          return `
            <div class="student-cell-view" style="white-space:nowrap !important; overflow:hidden; text-overflow:ellipsis;">
              ${dobFormatted === '—'
                ? `<span style="font-size: 12px;color:var(--grade-c);font-weight:400;white-space:nowrap !important;">No DOB</span>`
                : `<span style="font-size: 12px;color:var(--clr-text-2);font-weight:400;font-variant-numeric:tabular-nums;white-space:nowrap !important;">${escapeHtml(dobFormatted)}</span>`}
            </div>
            <input type="date" class="student-inline-input" data-id="${row.id}" data-field="birth_date" value="${row.birth_date || ''}" onclick="event.stopPropagation();">
          `;
        }
      },
      // 6. Age (Calculated from DOB — Numbers only per user directive)
      {
        key: 'ageDisplay',
        label: 'AGE',
        sortable: true,
        align: 'center',
        width: '50px',
        minWidth: '45px',
        render: (row) => {
          if (!row.birth_date) {
            return `<span class="text-muted" style="font-size: 12px;font-weight:400;">—</span>`;
          }
          return `<span class="col-ageDisplay" style="color:var(--clr-text-2);font-size: 12px;font-weight:400;font-variant-numeric:tabular-nums;">${row.ageDisplay}</span>`;
        }
      },
      // 7. Education (Last Degree / School — Placed directly after Age per user directive)
      {
        key: 'education',
        label: 'EDUCATION',
        className: 'super-hdr-divider',
        sortable: true,
        align: 'center',
        width: '140px',
        minWidth: '140px',
        render: (row) => {
          const eduStr = formatLastEducation(row.education);
          const eduOptionsHtml = EDUCATION_OPTIONS.map(opt => {
            const isSel = (eduStr.toLowerCase() === opt.label.toLowerCase()) ||
                          ((typeof row.education === 'string') && row.education.toLowerCase() === opt.value);
            return `<option value="${opt.label}" ${isSel ? 'selected' : ''}>${opt.label}</option>`;
          }).join('');

          return `
            <div class="student-cell-view" title="${escapeHtml(eduStr)}">
              <span style="font-size: 12px;font-weight:400;color:var(--clr-text-2);white-space:nowrap;">${escapeHtml(eduStr)}</span>
            </div>
            <select class="student-inline-select text-center student-education-select" data-id="${row.id}" data-field="education" onclick="event.stopPropagation();">
              <option value="" ${eduStr === '—' ? 'selected' : ''} disabled>Select Education</option>
              ${eduOptionsHtml}
            </select>
          `;
        }
      },
      // 8. Village (Alamat: Desa / Kelurahan — Under ADDRESS category)
      {
        key: 'village',
        label: 'VILLAGE',
        title: 'Village',
        sortable: true,
        align: 'center',
        width: '130px',
        minWidth: '120px',
        render: (row) => {
          const rawCity = (row.city || '').trim();
          const rawDist = (row.district || '').trim();
          const rawVillage = (row.village || '').trim();
          const displayVillage = (rawVillage && rawVillage !== '—') ? formatVillageName(rawVillage) : '—';

          const villagesList = (rawCity && rawCity !== '—' && rawDist && rawDist !== '—') ? getVillagesForDistrict(rawCity, rawDist) : [];
          const villageOptionsHtml = (villagesList && villagesList.length > 0)
            ? `<option value="" ${!rawVillage ? 'selected' : ''}>—</option>` + villagesList.map(v => {
                const isSel = formatVillageName(v).toLowerCase() === displayVillage.toLowerCase();
                return `<option value="${v}" ${isSel ? 'selected' : ''}>${escapeHtml(formatVillageName(v))}</option>`;
              }).join('')
            : `<option value="${rawVillage || ''}" selected>${escapeHtml(displayVillage)}</option>`;

          return `
            <div class="student-cell-view" title="${escapeHtml(displayVillage)}">
              <span style="font-size: 12px;font-weight:400;color:var(--clr-text-2);white-space:nowrap;">${escapeHtml(displayVillage)}</span>
            </div>
            <select class="student-inline-select text-center student-village-select" data-id="${row.id}" data-field="village" onclick="event.stopPropagation();">
              ${villageOptionsHtml}
            </select>
          `;
        }
      },
      // 9. District (Alamat: Kecamatan — Under ADDRESS category)
      {
        key: 'district',
        label: 'DISTRICT',
        title: 'District',
        sortable: true,
        align: 'center',
        width: '130px',
        minWidth: '120px',
        render: (row) => {
          const rawCity = (row.city || '').trim();
          const rawDistrict = (row.district || '').trim();
          const displayDistrict = (rawDistrict && rawDistrict !== '—') ? formatDistrictName(rawDistrict) : '—';

          const districtsList = (rawCity && rawCity !== '—') ? getDistrictsForCity(rawCity) : [];
          const districtOptionsHtml = (districtsList && districtsList.length > 0)
            ? `<option value="" ${!rawDistrict ? 'selected' : ''}>—</option>` + districtsList.map(d => {
                const isSel = formatDistrictName(d).toLowerCase() === displayDistrict.toLowerCase();
                return `<option value="${d}" ${isSel ? 'selected' : ''}>${escapeHtml(formatDistrictName(d))}</option>`;
              }).join('')
            : `<option value="${rawDistrict || ''}" selected>${escapeHtml(displayDistrict)}</option>`;

          return `
            <div class="student-cell-view" title="${escapeHtml(displayDistrict)}">
              <span style="font-size: 12px;font-weight:400;color:var(--clr-text-2);white-space:nowrap;">${escapeHtml(displayDistrict)}</span>
            </div>
            <select class="student-inline-select text-center student-district-select" data-id="${row.id}" data-field="district" onclick="event.stopPropagation();">
              ${districtOptionsHtml}
            </select>
          `;
        }
      },
      // 10. Regency (Alamat: Kota / Kabupaten — Under ADDRESS category)
      {
        key: 'city',
        label: 'REGENCY',
        title: 'Regency',
        sortable: true,
        align: 'center',
        width: '160px',
        minWidth: '150px',
        render: (row) => {
          const rawCity = (row.city || '').trim();
          const displayCity = (rawCity && rawCity !== '—') ? formatCityDistrict(rawCity) : '—';

          const rawProv = (row.province || '').trim();
          let canonicalProv = rawProv || 'Nusa Tenggara Barat';
          if (typeof PROVINCE_DISPLAY_MAP !== 'undefined') {
            for (const [fullName, shortName] of Object.entries(PROVINCE_DISPLAY_MAP)) {
              if (rawProv.toLowerCase() === shortName.toLowerCase() || rawProv.toLowerCase() === fullName.toLowerCase()) {
                canonicalProv = fullName;
                break;
              }
            }
          }
          const citiesList = (typeof INDONESIA_REGIONS !== 'undefined' && INDONESIA_REGIONS[canonicalProv])
            ? INDONESIA_REGIONS[canonicalProv]
            : (typeof INDONESIA_REGIONS !== 'undefined' && INDONESIA_REGIONS['Nusa Tenggara Barat'] ? INDONESIA_REGIONS['Nusa Tenggara Barat'] : []);

          const cityOptionsHtml = citiesList.map(c => {
            const isSel = (rawCity.toLowerCase() === c.toLowerCase()) ||
                          (displayCity.toLowerCase() === formatCityDistrict(c).toLowerCase());
            return `<option value="${c}" ${isSel ? 'selected' : ''}>${escapeHtml(formatCityDistrict(c))}</option>`;
          }).join('');

          return `
            <div class="student-cell-view" title="${escapeHtml(displayCity)}">
              <span style="font-size: 12px;font-weight:400;color:var(--clr-text-2);white-space:nowrap;">${escapeHtml(displayCity)}</span>
            </div>
            <select class="student-inline-select text-center student-city-select" data-id="${row.id}" data-field="city" onclick="event.stopPropagation();">
              <option value="" ${!rawCity ? 'selected' : ''} disabled>Select Regency</option>
              ${cityOptionsHtml}
            </select>
          `;
        }
      },
      // 9. Province (Alamat: Provinsi — Standard recognized abbreviations like NTB per user directive)
      {
        key: 'province',
        label: 'PROVINCE',
        className: 'super-hdr-divider',
        sortable: true,
        align: 'center',
        width: '160px',
        minWidth: '150px',
        render: (row) => {
          const rawProv = (row.province || '').trim();
          const displayVal = (rawProv && rawProv !== '—') ? formatProvinceName(rawProv) : '—';
          const provKeys = (typeof INDONESIA_REGIONS !== 'undefined')
            ? Object.keys(INDONESIA_REGIONS).sort((a, b) => a.localeCompare(b, 'en'))
            : [];

          const provOptionsHtml = provKeys.map(p => {
            const shortName = (typeof PROVINCE_DISPLAY_MAP !== 'undefined' && PROVINCE_DISPLAY_MAP[p]) ? PROVINCE_DISPLAY_MAP[p] : p;
            const isSel = (rawProv.toLowerCase() === p.toLowerCase()) ||
                          (rawProv.toLowerCase() === shortName.toLowerCase());
            const labelText = shortName !== p ? `${shortName} (${p})` : p;
            return `<option value="${p}" ${isSel ? 'selected' : ''}>${escapeHtml(labelText)}</option>`;
          }).join('');

          return `
            <div class="student-cell-view" title="${escapeHtml(displayVal)}">
              <span style="font-size: 12px;font-weight:400;color:var(--clr-text-2);white-space:nowrap;">${escapeHtml(displayVal)}</span>
            </div>
            <select class="student-inline-select text-center student-province-select" data-id="${row.id}" data-field="province" onclick="event.stopPropagation();">
              <option value="" ${!rawProv ? 'selected' : ''} disabled>Select Province</option>
              ${provOptionsHtml}
            </select>
          `;
        }
      }
    ] : []),
    // Final Exam Columns
    ...(isFinalExamView ? getFinalExamColDefs() : []),
    // Camp Raport Columns (1st, 2nd, 3rd Step)
    ...((!isFinalExamView && isCampProgram && isRaportView) ? getCampRaportColDefs(window._raportPage || 1) : []),
    // Non-Camp Dynamic Per-Class Columns (Raport View Only: 4 Theme Exams per active class)
    ...((!isFinalExamView && !isCampProgram && isRaportView) ? (perClassColDefs.length > 0 ? perClassColDefs : [
      {
        key: 'completedTests',
        label: 'COMPLETED',
        shortLabel: 'PASSED',
        microLabel: 'PASS',
        sortable: true,
        align: 'center',
        width: '80px',
        render: (row) => `
          <div class="fw-700" style="font-size:12px;color:var(--clr-text-1);">
            ${row.completedTests}
          </div>
        `
      },
      {
        key: 'totalAssigned',
        label: 'ASSIGNED',
        className: 'super-hdr-divider',
        sortable: true,
        align: 'center',
        width: '80px',
        render: (row) => `
          <div class="fw-600 text-muted" style="font-size: 12px;">
            ${row.totalAssigned}
          </div>
        `
      }
    ]) : []),
    // Non-Camp Overall Performance Columns (Raport View Only)
    ...((!isFinalExamView && !isCampProgram && isRaportView) ? [
      {
        key: 'completionPct',
        label: 'DONE',
        shortLabel: 'DONE',
        microLabel: 'DONE',
        sortable: true,
        align: 'center',
        width: '74px',
        minWidth: '65px',
        render: (row) => {
          const pct = Math.round(Number(row.completionPct || 0));
          const color = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pct) : '#38bdf8';
          return `<div style="font-size:12px;font-weight:600;color:${color} !important;font-variant-numeric:tabular-nums;" title="Completion Rate: ${pct}%">${pct}%</div>`;
        }
      },
      {
        key: 'totalEarnedScore',
        label: 'PTS',
        shortLabel: 'PTS',
        microLabel: 'PTS',
        sortable: true,
        align: 'center',
        width: '74px',
        minWidth: '65px',
        render: (row) => {
          const rawPts = Number(row.totalEarnedScore || 0);
          const pts = Math.round(rawPts);
          const color = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(row.overallPct >= 0 ? row.overallPct : 0) : '#38bdf8';
          return `<div style="font-size:12px;font-weight:600;color:${color} !important;font-variant-numeric:tabular-nums;" title="Total Points: ${pts} pts">${pts}</div>`;
        }
      },
      {
        key: 'globalGrade',
        label: 'GRD',
        shortLabel: 'GRD',
        microLabel: 'GRD',
        className: 'super-hdr-divider',
        sortable: true,
        align: 'center',
        width: '65px',
        minWidth: '55px',
        render: (row) => {
          const grd = row.globalGrade || '—';
          const isPending = grd === '—' || !row.overallColor;
          const color = isPending ? '#64748b' : row.overallColor;
          return `
            <div style="display:flex;align-items:center;justify-content:center;">
              <span class="grade-circle" style="background:${color};color:#0f172a;font-weight:800;font-size:12px;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;" title="Overall Grade: ${grd}">${grd}</span>
            </div>
          `;
        }
      }
    ] : []),
      // 12. Security Group: PIN & STATUS (User Directive: "masukkan PIN dalam kategori SECURITY trus di sebelah kiri dari status, PIN DAN STATUS INI SATU KATEGORI")
      {
        key: 'pin',
        label: 'PIN',
        shortLabel: 'PIN',
        microLabel: 'PIN',
        sortable: true,
        align: 'center',
        width: '70px',
        minWidth: '65px',
        render: (row) => {
          const rawPin = row.pin || row.pinDisplay || '';
          const hasPin = rawPin && rawPin !== '——';
          const displayPin = hasPin ? rawPin : '——';
          const pinColor = hasPin ? '#38bdf8' : '#64748b';
          const valPin = hasPin ? rawPin : '';
          return `
            <div class="student-cell-view" style="display:flex; align-items:center; justify-content:center; width:100%; height:100%;">
              <span style="font-family:var(--fm-font-mono, monospace); font-size:12px; font-weight:600; color:${pinColor}; letter-spacing:0.08em; font-variant-numeric:tabular-nums;" title="Student Personal PIN: ${escapeHtml(displayPin)}">
                ${escapeHtml(displayPin)}
              </span>
            </div>
            <input type="text"
              class="student-inline-input student-inline-pin-input text-center"
              data-id="${row.id}"
              data-field="pin"
              value="${escapeHtml(valPin)}"
              placeholder="1234"
              maxlength="10"
              inputmode="numeric"
              onclick="event.stopPropagation();"
              style="text-align:center !important; font-family:var(--fm-font-mono, monospace) !important; font-size:12px; font-weight:600; letter-spacing:0.08em; color:#38bdf8 !important; width:100%; box-sizing:border-box;">
          `;
        }
      },
      // Status
      {
        key: 'program_status',
        label: 'STATUS',
        shortLabel: 'STATUS',
        microLabel: 'STATUS',
        className: 'super-hdr-divider',
        sortable: true,
        align: 'center',
        width: '108px',
        minWidth: '95px',
        render: (row) => {
          const isInactive = ((row._raw || row).is_active === false) || ((row.program_status || '').toUpperCase() === 'INACTIVE') || ((row.program_status || '').toUpperCase() === 'HOLD');
          const rawStatus = (row.program_status || 'ACTIVE').toUpperCase();
          const isLvlX = row.isAlumni || row.studentLevelNum === 99 || row.levelName === 'X' || (row.levelName && row.levelName.toLowerCase() === 'alumni') || isAlumniPanel;
          let currentStatus = 'active';
          let label = 'Active';
          let color = 'var(--grade-a)';

          if (isLvlX || rawStatus === 'ALUMNI' || rawStatus === 'COMPLETED' || rawStatus === 'GRADUATED') {
            currentStatus = 'alumni';
            label = 'Alumni';
            color = 'var(--quad-d)';
          } else if (isInactive) {
            currentStatus = 'inactive';
            label = 'Inactive';
            color = 'var(--grade-e)'; // Strictly RED (Grade E SSOT), never white or slate!
          } else {
            currentStatus = 'active';
            label = 'Active';
            color = 'var(--grade-a)';
          }

          const curNum = parseInt(row.studentLevelNum != null ? row.studentLevelNum : 1, 10);
          const canAlumni = curNum >= 3 || currentStatus === 'alumni' || isLvlX;
          const canDelete = currentStatus === 'inactive';

          let statusOptionsHtml = `
            <option value="active" style="color:var(--grade-a);" ${currentStatus === 'active' ? 'selected' : ''}>Active</option>
            <option value="inactive" style="color:var(--grade-e);" ${currentStatus === 'inactive' ? 'selected' : ''}>Inactive</option>
          `;
          if (canAlumni) {
            statusOptionsHtml += `<option value="alumni" style="color:var(--quad-d);" ${currentStatus === 'alumni' ? 'selected' : ''}>Alumni</option>`;
          }
          if (canDelete) {
            statusOptionsHtml += `<option value="delete" style="color:var(--grade-e);font-weight:700;">Delete</option>`;
          }

          // Active and fully eligible for promotion: Render interactive LEVEL UP button
          if (currentStatus === 'active' && row.isEligibleNext && !isLvlX && row.studentLevelNum !== 0) {
            const isGrad = curNum >= 3;
            const targetTitle = isGrad ? 'Graduate to ALUMNI (Level X)' : `Promote to Level ${curNum + 1}`;
            return `
              <div class="student-cell-view" style="display:flex;align-items:center;justify-content:center;">
                <button type="button" class="btn-level-up-cell" onclick="event.stopPropagation(); window.promoteStudentNextLevel('${row.id}');"
                  title="${escapeHtml(targetTitle)}">
                  ${getSvgIcon('chevrons-up', 12)} LEVEL UP
                </button>
              </div>
              <select class="student-inline-select student-status-select" data-id="${row.id}" data-name="${escapeHtml(row.displayName || row.name || 'Student')}" data-prev-status="${currentStatus}" data-level-num="${curNum}" data-field="program_status" onclick="event.stopPropagation();">
                ${statusOptionsHtml}
              </select>
            `;
          }

          return `
            <div class="student-cell-view">
              <span style="color:${color};font-size: 12px;font-weight:600;">${label}</span>
            </div>
            <select class="student-inline-select student-status-select" data-id="${row.id}" data-name="${escapeHtml(row.displayName || row.name || 'Student')}" data-prev-status="${currentStatus}" data-level-num="${curNum}" data-field="program_status" onclick="event.stopPropagation();">
              ${statusOptionsHtml}
            </select>
          `;
        }
      }
    ]
  });

  // Track remote database column support to prevent console spam
  let _dbHasAddressColumns = true;

  // Mount Column Resizing Memory (Phase 450)
  const stuTable = gridContainer.querySelector('table');
  if (stuTable && typeof window.initColumnResize === 'function') {
    window.initColumnResize(stuTable, 'topscore_col_widths_student_roster_grid');
  }

  // Attach Inline Editing Auto-Save Listeners
  gridContainer.addEventListener('change', async (e) => {
    const target = e.target;

    // Raport View Direct Inline Score Edit
    if (target.matches('.student-inline-score-input')) {
      const studentId = target.dataset.studentId;
      const classId = target.dataset.classId;
      const testId = target.dataset.testId;
      const totalQ = Number(target.dataset.totalQ) || 120;
      const themeCode = target.dataset.themeCode;
      const valStr = (target.value || '').trim();

      if (!studentId || !testId || !classId) return;

      const cell = target.closest('td');

      if (valStr === '') {
        return;
      }

      const valNum = Number(valStr);
      if (isNaN(valNum)) {
        showToast('Please enter a valid numeric score.', 'warning');
        return;
      }

      const clampedPts = Math.round(Math.max(0, Math.min(totalQ, valNum)));
      const pct = totalQ > 0 ? Math.round((clampedPts / totalQ) * 100) : 0;
      const grade = typeof calculateGrade === 'function' ? calculateGrade(pct) : (typeof getGrade === 'function' ? getGrade(pct) : 'C');

      target.value = clampedPts;

      try {
        if (typeof showLoading === 'function') showLoading('Saving score...');
        await adminApplyForgiven({
          classId,
          studentIds: [studentId],
          testActions: [{
            testId,
            action: 'manual',
            percentage: pct,
            score: clampedPts,
            grade
          }],
          forgivenBy: 'Mr. Top',
          reason: 'Student Raport Direct Inline Edit'
        });

        if (typeof clearAdminCache === 'function') clearAdminCache('attempts');

        // Visual feedback: green cell highlight
        if (cell) {
          const origBg = cell.style.background;
          cell.style.background = 'rgba(0, 192, 0, 0.25)';
          setTimeout(() => { cell.style.background = origBg; }, 600);

          const color = typeof getGradeColorByScore === 'function' ? getGradeColorByScore(pct) : '#ffffff';
          const viewSpan = cell.querySelector('.student-cell-view span');
          if (viewSpan) {
            viewSpan.textContent = clampedPts;
            viewSpan.style.color = color;
            viewSpan.className = '';
          }
        }

        // Update in-memory row data
        const s = filteredGridData.find(x => x.id === studentId);
        if (s && s.perClassFinal) {
          const cs = s.perClassFinal.get(classId);
          if (cs) {
            if (themeCode) {
              cs.themes[themeCode] = clampedPts;
              cs.themeScores[themeCode] = pct;
            } else if (cs.testScores) {
              cs.testScores.set(testId, { pts: clampedPts, pct, maxQ: totalQ });
            }
          }
        }

        showToast(`Score saved: ${clampedPts} pts (${pct}%)`, 'success', 2500);
      } catch (err) {
        console.error('Save inline score error:', err);
        showToast('Failed to save score: ' + (err.message || err), 'error');
      } finally {
        if (typeof hideLoading === 'function') hideLoading();
      }
      return;
    }

    // Camp Academic Direct Inline Score Edit (Storytelling, Grammar, 4th Subject, Speaking)
    if (target.matches('.student-inline-academic-input')) {
      const studentId = target.dataset.studentId;
      const batchId = target.dataset.batchId;
      const stepLevel = parseInt(target.dataset.step, 10);
      const subjectCode = target.dataset.subject;
      const assessmentType = target.dataset.type || 'PERIODIC_EXAM';
      const assessmentKey = target.dataset.key;
      const targetScore = parseFloat(target.dataset.target) || 100;
      const valStr = (target.value || '').trim();

      if (!studentId || !stepLevel || !subjectCode || !assessmentKey) return;
      const cell = target.closest('td');

      let rawScore = null;
      let percentage = null;
      let grade = null;

      if (valStr !== '') {
        const num = parseFloat(valStr);
        if (isNaN(num)) {
          showToast('Please enter a valid numeric score.', 'warning');
          return;
        }
        rawScore = Math.max(0, Math.min(targetScore, num));
        percentage = targetScore > 0 ? Math.round((rawScore / targetScore) * 100 * 100) / 100 : 0;
        grade = typeof calculateGrade === 'function' ? calculateGrade(percentage) : (percentage >= 80 ? 'A' : (percentage >= 60 ? 'C' : 'E'));
        target.value = rawScore;
      }

      try {
        const sb = (await import('../supabase.js?v=20261106_v140')).getSupabase ? await (await import('../supabase.js?v=20261106_v140')).getSupabase() : null;
        if (!sb) { showToast('Database connection failed', 'error'); return; }

        const payload = {
          student_id: studentId,
          batch_id: batchId || window._filterBatchId,
          step_level: stepLevel,
          subject_code: subjectCode,
          assessment_type: assessmentType,
          assessment_key: assessmentKey,
          raw_score: rawScore,
          target_score: targetScore,
          percentage: percentage,
          grade: grade,
          updated_at: new Date().toISOString()
        };

        const { error } = await sb.from('student_academic_assessments').upsert(payload, {
          onConflict: 'student_id,step_level,subject_code,assessment_key'
        });

        if (error) {
          console.error('Save academic assessment error:', error);
          showToast('Failed to save score: ' + error.message, 'error');
          return;
        }

        // Visual feedback: green cell highlight
        if (cell) {
          const origBg = cell.style.background;
          cell.style.background = 'rgba(0, 192, 0, 0.25)';
          setTimeout(() => { cell.style.background = origBg; }, 600);
          const viewSpan = cell.querySelector('.student-cell-view span');
          if (viewSpan) {
            viewSpan.textContent = rawScore != null ? rawScore : '—';
            viewSpan.style.color = percentage != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(percentage) : 'var(--clr-text-3)';
          }
        }

        // Update in-memory row data
        const s = filteredGridData.find(x => x.id === studentId);
        if (s) {
          if (!s.academicMap) s.academicMap = new Map();
          const mapKey = `${stepLevel}:${subjectCode}:${assessmentKey}`;
          s.academicMap.set(mapKey, payload);

          // Re-calculate step summary for this student
          const sum = s.stepSummaries?.[stepLevel];
          if (sum) {
            if (subjectCode === 'STORYTELLING') {
              const storyKeys = ['W1', 'W2', 'W3', 'W4'].map(k => s.academicMap.get(`${stepLevel}:STORYTELLING:${k}`)).filter(x => x?.percentage != null);
              sum.naStory = storyKeys.length > 0 ? Math.round((storyKeys.reduce((acc, x) => acc + Number(x.percentage), 0) / storyKeys.length) * 100) / 100 : null;
            } else if (subjectCode === 'GRAMMAR') {
              const gramKeys = ['U1', 'U2'].map(k => s.academicMap.get(`${stepLevel}:GRAMMAR:${k}`)).filter(x => x?.percentage != null);
              sum.naGram = gramKeys.length > 0 ? Math.round((gramKeys.reduce((acc, x) => acc + Number(x.percentage), 0) / gramKeys.length) * 100) / 100 : null;
            } else if (['BASIC', 'GFS', 'PRONUNCIATION'].includes(subjectCode)) {
              const fourthKeys = ['U1', 'U2'].map(k => s.academicMap.get(`${stepLevel}:${subjectCode}:${k}`)).filter(x => x?.percentage != null);
              sum.naFourth = fourthKeys.length > 0 ? Math.round((fourthKeys.reduce((acc, x) => acc + Number(x.percentage), 0) / fourthKeys.length) * 100) / 100 : null;
            } else if (subjectCode === 'SPEAKING') {
              const spkSubKeys = stepLevel === 1 ? ['U1', 'U2', 'PRACTICE'] : (stepLevel === 2 ? ['U1', 'U2'] : ['U1', 'U2', 'U3']);
              const speakKeys = spkSubKeys.map(k => s.academicMap.get(`${stepLevel}:SPEAKING:${k}`)).filter(x => x?.percentage != null);
              sum.naSpeak = speakKeys.length > 0 ? Math.round((speakKeys.reduce((acc, x) => acc + Number(x.percentage), 0) / speakKeys.length) * 100) / 100 : null;
            }
            const validNAs = [sum.naVocab, sum.naStory, sum.naGram, sum.naFourth, sum.naSpeak].filter(v => typeof v === 'number');
            sum.stepAvg = validNAs.length > 0 ? Math.round((validNAs.reduce((a, b) => a + b, 0) / validNAs.length) * 100) / 100 : null;
            sum.predicate = sum.stepAvg != null ? (typeof getCertificatePredicate === 'function' ? getCertificatePredicate(sum.stepAvg) : (sum.stepAvg >= 90 ? 'EXCELLENT' : sum.stepAvg >= 80 ? 'VERY GOOD' : sum.stepAvg >= 70 ? 'GOOD' : sum.stepAvg >= 60 ? 'ENOUGH' : 'LESS')) : '—';

            // Also update the row in grid if rendered
            const tr = cell?.closest('tr');
            if (tr) {
              const naSubjCell = tr.querySelector(`td[data-col-key="_camp_${subjectCode === 'STORYTELLING' ? 'stt' : subjectCode === 'GRAMMAR' ? 'grm' : subjectCode === 'SPEAKING' ? 'spk' : 'fourth'}_${stepLevel}_na"] .student-cell-view span`);
              const naVal = subjectCode === 'STORYTELLING' ? sum.naStory : subjectCode === 'GRAMMAR' ? sum.naGram : subjectCode === 'SPEAKING' ? sum.naSpeak : sum.naFourth;
              if (naSubjCell) {
                naSubjCell.textContent = naVal != null ? Math.round(naVal) : '—';
                naSubjCell.style.color = naVal != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(naVal) : 'var(--clr-text-3)';
              }
              const avgCell = tr.querySelector(`td[data-col-key="_camp_sum_${stepLevel}_avg"] .student-cell-view span`);
              if (avgCell) {
                avgCell.textContent = sum.stepAvg != null ? Math.round(sum.stepAvg) : '—';
                avgCell.style.color = sum.stepAvg != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(sum.stepAvg) : 'var(--clr-text-3)';
              }
              const prdCell = tr.querySelector(`td[data-col-key="_camp_sum_${stepLevel}_prd"] .student-cell-view span`);
              if (prdCell) {
                prdCell.textContent = sum.predicate || '—';
                prdCell.style.color = sum.stepAvg != null && typeof getGradeColorByScore === 'function' ? getGradeColorByScore(sum.stepAvg) : '#94a3b8';
              }
            }
          }
        }

        showToast(`Saved: ${rawScore != null ? rawScore : '—'} (${percentage != null ? Math.round(percentage) + '%' : '—'})`, 'success', 2000);
      } catch (err) {
        console.error('Inline academic edit error:', err);
        showToast('Error saving: ' + err.message, 'error');
      }
      return;
    }

    // Final Exam Direct Inline Edit
    if (target.matches('.student-inline-final-input, .student-inline-final-select')) {
      const studentId = target.dataset.studentId;
      const field = target.dataset.field;
      const valStr = (target.value || '').trim();

      if (!studentId || !field) return;
      const cell = target.closest('td');

      try {
        const sb = (await import('../supabase.js?v=20261106_v140')).getSupabase ? await (await import('../supabase.js?v=20261106_v140')).getSupabase() : null;
        if (!sb) { showToast('Database connection failed', 'error'); return; }

        const s = filteredGridData.find(x => x.id === studentId);
        const fe = s?.finalExam || { student_id: studentId, batch_id: s?.batch_id || window._filterBatchId };

        let updateVal = valStr;
        if (target.type === 'number') {
          updateVal = valStr === '' ? null : parseFloat(valStr);
        }
        fe[field] = updateVal;

        // Auto-recalculate composite fields
        const exFlu = Number(fe.examiner_fluency || 0);
        const exPrn = Number(fe.examiner_pronunciation || 0);
        const exIda = Number(fe.examiner_idea || 0);
        const exGrm = Number(fe.examiner_grammar || 0);
        const exTot = Math.round((exFlu + exPrn + exIda + exGrm) * 100) / 100;
        fe.examiner_total = exTot;

        const tuFlu = Number(fe.tutor_fluency || 0);
        const tuPrn = Number(fe.tutor_pronunciation || 0);
        const tuGrm = Number(fe.tutor_grammar || 0);
        const tuCmp = Number(fe.tutor_comprehension || 0);
        const tuTot = Math.round((tuFlu + tuPrn + tuGrm + tuCmp) * 100) / 100;
        fe.tutor_total = tuTot;

        const prcScore = (exTot > 0 || tuTot > 0) ? Math.round(((exTot + tuTot) / 2) * 100) / 100 : null;
        const prcPrd = prcScore != null ? (typeof getCertificatePredicate === 'function' ? getCertificatePredicate(prcScore) : (prcScore >= 90 ? 'EXCELLENT' : prcScore >= 80 ? 'VERY GOOD' : prcScore >= 70 ? 'GOOD' : prcScore >= 60 ? 'ENOUGH' : 'LESS')) : null;

        fe.practice_score = prcScore;
        fe.practice_predicate = prcPrd;

        // Note: Do NOT include examiner_total or tutor_total in the upsert payload (GENERATED ALWAYS AS columns in PG)
        const payload = {
          student_id: studentId,
          batch_id: fe.batch_id || window._filterBatchId,
          examiner_name: fe.examiner_name || null,
          examiner_fluency: fe.examiner_fluency != null ? Number(fe.examiner_fluency) : 0,
          examiner_pronunciation: fe.examiner_pronunciation != null ? Number(fe.examiner_pronunciation) : 0,
          examiner_idea: fe.examiner_idea != null ? Number(fe.examiner_idea) : 0,
          examiner_grammar: fe.examiner_grammar != null ? Number(fe.examiner_grammar) : 0,
          tutor_name: fe.tutor_name || null,
          tutor_fluency: fe.tutor_fluency != null ? Number(fe.tutor_fluency) : 0,
          tutor_pronunciation: fe.tutor_pronunciation != null ? Number(fe.tutor_pronunciation) : 0,
          tutor_grammar: fe.tutor_grammar != null ? Number(fe.tutor_grammar) : 0,
          tutor_comprehension: fe.tutor_comprehension != null ? Number(fe.tutor_comprehension) : 0,
          practice_score: fe.practice_score,
          practice_predicate: fe.practice_predicate,
          speaking_score: fe.speaking_score != null ? Number(fe.speaking_score) : null,
          speaking_predicate: fe.speaking_predicate || null,
          vocab_score: fe.vocab_score != null ? Number(fe.vocab_score) : null,
          vocab_predicate: fe.vocab_predicate || null,
          pronunciation_score: fe.pronunciation_score != null ? Number(fe.pronunciation_score) : null,
          pronunciation_predicate: fe.pronunciation_predicate || null,
          grammar_score: fe.grammar_score != null ? Number(fe.grammar_score) : null,
          grammar_predicate: fe.grammar_predicate || null,
          final_score: fe.final_score != null ? Number(fe.final_score) : null,
          certificate_predicate: fe.certificate_predicate || null,
          certificate_nis: fe.certificate_nis || null,
          certificate_month: fe.certificate_month || null,
          certificate_year: fe.certificate_year ? parseInt(fe.certificate_year, 10) : 2026,
          status: fe.status || 'DRAFT',
          updated_at: new Date().toISOString()
        };

        const { error } = await sb.from('student_final_examinations').upsert(payload, {
          onConflict: 'student_id'
        });

        if (error) {
          console.error('Save final exam error:', error);
          showToast('Failed to save final exam: ' + error.message, 'error');
          return;
        }

        // Visual feedback
        if (cell) {
          const origBg = cell.style.background;
          cell.style.background = 'rgba(0, 192, 0, 0.25)';
          setTimeout(() => { cell.style.background = origBg; }, 600);
          const viewSpan = cell.querySelector('.student-cell-view span');
          if (viewSpan) {
            viewSpan.textContent = updateVal != null ? updateVal : '—';
          }
        }

        // Update in-memory row data & computed cells in DOM
        if (s) {
          s.finalExam = fe;
          const tr = cell?.closest('tr');
          if (tr) {
            const exTotCell = tr.querySelector('td[data-col-key="_fe_ex_tot"] .student-cell-view span');
            if (exTotCell) exTotCell.textContent = exTot != null ? Math.round(exTot) : '—';
            const tuTotCell = tr.querySelector('td[data-col-key="_fe_tu_tot"] .student-cell-view span');
            if (tuTotCell) tuTotCell.textContent = tuTot != null ? Math.round(tuTot) : '—';
            const prcCell = tr.querySelector('td[data-col-key="_fe_prc"] .student-cell-view span');
            if (prcCell) prcCell.textContent = prcScore != null ? Math.round(prcScore) : '—';
            const prcPrdCell = tr.querySelector('td[data-col-key="_fe_prc_prd"] .student-cell-view span');
            if (prcPrdCell) prcPrdCell.textContent = prcPrd || '—';
          }
        }

        showToast('Final Exam record updated.', 'success', 2000);
      } catch (err) {
        console.error('Inline final exam edit error:', err);
        showToast('Error saving: ' + err.message, 'error');
      }
      return;
    }

    if (target.matches('.student-inline-input, .student-inline-select')) {
      const studentId = target.dataset.id;
      const field = target.dataset.field;
      const value = target.value;
      if (!studentId || !field) return;

      // If address columns are known to be pending in DB, save immediately to local cache without console 400 errors
      if (_dbHasAddressColumns === false && (field === 'province' || field === 'city' || field === 'district' || field === 'village')) {
        try {
          const fallbackKey = 'topscore_student_demographics_fallback';
          const cache = JSON.parse(localStorage.getItem(fallbackKey) || '{}');
          cache[studentId] = cache[studentId] || {};
          cache[studentId][field] = value.trim();
          localStorage.setItem(fallbackKey, JSON.stringify(cache));
        } catch (_) {}

        const cell = target.closest('td');
        if (cell) {
          const origBg = cell.style.background;
          cell.style.background = 'rgba(0, 192, 0, 0.25)';
          setTimeout(() => { cell.style.background = origBg; }, 600);
        }

        const s = filteredGridData.find(x => x.id === studentId);
        if (s) {
          s[field] = value.trim();
          const viewEl = cell?.querySelector('.student-cell-view span');
          if (viewEl) {
            const displayVal = field === 'province' ? formatProvinceName(value.trim()) : field === 'city' ? formatCityDistrict(value.trim()) : field === 'district' ? formatDistrictName(value.trim()) : field === 'village' ? formatVillageName(value.trim()) : value.trim();
            viewEl.textContent = displayVal || '—';
            cell.querySelector('.student-cell-view')?.setAttribute('title', displayVal || '—');
          }
        }
        showToast('Saved locally in browser', 'info', 2500);
        return;
      }

      const sb = await getSupabase();
      if (!sb) return;

      const updates = {};
      if (field === 'gender') {
        updates.gender = value;
      } else if (field === 'name') {
        updates.name = value.trim();
      } else if (field === 'pin') {
        const trimmedPin = value.trim();
        if (!trimmedPin) {
          showToast('PIN cannot be empty', 'warning');
          const s = filteredGridData.find(x => x.id === studentId);
          target.value = (s?.pin && s.pin !== '——') ? s.pin : '1234';
          return;
        }
        const pinHash = await sha256(trimmedPin);
        updates.pin = trimmedPin;
        updates.pin_hash = pinHash;
      } else if (field === 'birthplace') {
        updates.birthplace = value ? value.trim() : null;
      } else if (field === 'birth_date') {
        updates.birth_date = value || null;
      } else if (field === 'province') {
        updates.province = value.trim();

        // Dynamic city dropdown linking: populate city select with cities belonging to the newly selected province
        const tr = target.closest('tr');
        const citySel = tr ? tr.querySelector('.student-city-select') : null;
        if (citySel) {
          let canonicalProv = updates.province;
          if (typeof PROVINCE_DISPLAY_MAP !== 'undefined') {
            for (const [fullName, shortName] of Object.entries(PROVINCE_DISPLAY_MAP)) {
              if (updates.province.toLowerCase() === shortName.toLowerCase() || updates.province.toLowerCase() === fullName.toLowerCase()) {
                canonicalProv = fullName;
                break;
              }
            }
          }
          const newCities = (typeof INDONESIA_REGIONS !== 'undefined' && INDONESIA_REGIONS[canonicalProv])
            ? INDONESIA_REGIONS[canonicalProv]
            : [];

          if (newCities.length > 0) {
            citySel.innerHTML = `<option value="" disabled>Select Regency</option>` +
              newCities.map(c => `<option value="${c}">${escapeHtml(formatCityDistrict(c))}</option>`).join('');
            citySel.value = newCities[0];
            updates.city = newCities[0];

            const def = getDefaultDistrictAndVillage(updates.city, updates.province);
            updates.district = def.district;
            updates.village = def.village;

            const cityCell = citySel.closest('td');
            const cityViewEl = cityCell?.querySelector('.student-cell-view span');
            if (cityViewEl) {
              const formattedCity = formatCityDistrict(newCities[0]);
              cityViewEl.textContent = formattedCity;
              cityCell.querySelector('.student-cell-view')?.setAttribute('title', formattedCity);
            }

            // Also update district & village in the row
            const distSel = tr?.querySelector('.student-district-select');
            if (distSel) {
              const newDistricts = getDistrictsForCity(updates.city);
              distSel.innerHTML = newDistricts.map(d => `<option value="${d}" ${d === def.district ? 'selected' : ''}>${escapeHtml(formatDistrictName(d))}</option>`).join('');
              distSel.value = def.district;
              const distViewEl = distSel.closest('td')?.querySelector('.student-cell-view span');
              if (distViewEl) {
                distViewEl.textContent = formatDistrictName(def.district);
                distSel.closest('td')?.querySelector('.student-cell-view')?.setAttribute('title', formatDistrictName(def.district));
              }
            }
            const villSel = tr?.querySelector('.student-village-select');
            if (villSel) {
              const newVillages = getVillagesForDistrict(updates.city, def.district);
              villSel.innerHTML = newVillages.map(v => `<option value="${v}" ${v === def.village ? 'selected' : ''}>${escapeHtml(formatVillageName(v))}</option>`).join('');
              villSel.value = def.village;
              const villViewEl = villSel.closest('td')?.querySelector('.student-cell-view span');
              if (villViewEl) {
                villViewEl.textContent = formatVillageName(def.village);
                villSel.closest('td')?.querySelector('.student-cell-view')?.setAttribute('title', formatVillageName(def.village));
              }
            }
          }
        }
      } else if (field === 'city') {
        updates.city = value.trim();
        // Auto-populate district & village to center of regency per user directive
        const def = getDefaultDistrictAndVillage(updates.city);
        updates.district = def.district;
        updates.village = def.village;

        const tr = target.closest('tr');
        if (tr) {
          const distSel = tr.querySelector('.student-district-select');
          if (distSel) {
            const newDistricts = getDistrictsForCity(updates.city);
            distSel.innerHTML = newDistricts.map(d => `<option value="${d}" ${d === def.district ? 'selected' : ''}>${escapeHtml(formatDistrictName(d))}</option>`).join('');
            distSel.value = def.district;
            const distViewEl = distSel.closest('td')?.querySelector('.student-cell-view span');
            if (distViewEl) {
              distViewEl.textContent = formatDistrictName(def.district);
              distSel.closest('td')?.querySelector('.student-cell-view')?.setAttribute('title', formatDistrictName(def.district));
            }
          }
          const villSel = tr.querySelector('.student-village-select');
          if (villSel) {
            const newVillages = getVillagesForDistrict(updates.city, def.district);
            villSel.innerHTML = newVillages.map(v => `<option value="${v}" ${v === def.village ? 'selected' : ''}>${escapeHtml(formatVillageName(v))}</option>`).join('');
            villSel.value = def.village;
            const villViewEl = villSel.closest('td')?.querySelector('.student-cell-view span');
            if (villViewEl) {
              villViewEl.textContent = formatVillageName(def.village);
              villSel.closest('td')?.querySelector('.student-cell-view')?.setAttribute('title', formatVillageName(def.village));
            }
          }
        }
      } else if (field === 'district') {
        updates.district = value.trim();
        const tr = target.closest('tr');
        const s = filteredGridData.find(x => x.id === studentId);
        const city = s?.city || tr?.querySelector('.student-city-select')?.value || 'Kota Mataram';
        const newVillages = getVillagesForDistrict(city, updates.district);
        const newVillage = newVillages[0] || 'Pejanggik';
        updates.village = newVillage;

        if (tr) {
          const villSel = tr.querySelector('.student-village-select');
          if (villSel) {
            villSel.innerHTML = newVillages.map(v => `<option value="${v}" ${v === newVillage ? 'selected' : ''}>${escapeHtml(formatVillageName(v))}</option>`).join('');
            villSel.value = newVillage;
            const villViewEl = villSel.closest('td')?.querySelector('.student-cell-view span');
            if (villViewEl) {
              villViewEl.textContent = formatVillageName(newVillage);
              villSel.closest('td')?.querySelector('.student-cell-view')?.setAttribute('title', formatVillageName(newVillage));
            }
          }
        }
      } else if (field === 'village') {
        updates.village = value.trim();
      } else if (field === 'education') {
        updates.education = value.trim();
      } else if (field === 'level_id') {
        const lvlObj = levelsMap.get(value);
        updates.level_id = value;
        const isLvlZeroOrAlumni = lvlObj && (lvlObj.level_number === 0 || (lvlObj.name || '').toLowerCase() === 'alumni');
        if (isLvlZeroOrAlumni) {
          updates.program_status = 'ALUMNI';
          updates.is_active = true;
        } else {
          const curStatus = (filteredGridData.find(x => x.id === studentId)?.program_status || '').toUpperCase();
          if (curStatus === 'ALUMNI') {
            updates.program_status = 'ACTIVE';
            updates.is_active = true;
          }
        }
      } else if (field === 'program_status') {
        const prevStatus = target.dataset.prevStatus || 'active';
        const levelNum = parseInt(target.dataset.levelNum || 1, 10);

        if (value === 'delete') {
          target.value = prevStatus;
          if (prevStatus !== 'inactive') {
            showToast('Delete is only permitted for Inactive students.', 'warning');
            return;
          }
          const studentName = target.dataset.name || 'this student';
          if (!confirm(`Are you sure you want to delete ${studentName}? This will soft-delete the record.`)) return;
          await adminSoftDelete('students', studentId);
          showToast('Student deleted successfully', 'success');
          renderStudents(area, { isAlumniPanel });
          return;
        } else if (value === 'alumni') {
          if (levelNum < 3 && prevStatus !== 'alumni') {
            target.value = prevStatus;
            showToast('Alumni status is only available for students who have graduated from Level 3.', 'warning');
            return;
          }
          updates.is_active = true;
          updates.program_status = 'ALUMNI';
        } else if (value === 'inactive') {
          updates.is_active = false;
          updates.program_status = 'INACTIVE';
        } else {
          updates.is_active = true;
          updates.program_status = 'ACTIVE';
        }
      }

      let { error } = await sb.from('students').update(updates).eq('id', studentId);
      if (error && error.message && error.message.includes('pin') && updates.pin) {
        const hashOnly = { ...updates };
        delete hashOnly.pin;
        const retry = await sb.from('students').update(hashOnly).eq('id', studentId);
        if (!retry.error) {
          error = null;
        }
      }
      if (!error) {
        clearAdminCache('students');
        const cell = target.closest('td');
        if (cell) {
          const origBg = cell.style.background;
          cell.style.background = 'rgba(0, 192, 0, 0.25)';
          setTimeout(() => { cell.style.background = origBg; }, 600);
        }
        const s = filteredGridData.find(x => x.id === studentId);
        if (s) {
          if (field === 'name') {
            s.name = updates.name;
            s.displayName = updates.name;
            const viewEl = cell?.querySelector('.student-cell-view span');
            if (viewEl) viewEl.textContent = updates.name;
          } else if (field === 'pin') {
            s.pin = updates.pin;
            s.pinDisplay = updates.pin;
            s.pin_hash = updates.pin_hash;
            const viewEl = cell?.querySelector('.student-cell-view span');
            if (viewEl) {
              viewEl.textContent = updates.pin;
              viewEl.style.color = '#38bdf8';
              viewEl.setAttribute('title', `Student Personal PIN: ${updates.pin}`);
            }
          } else if (field === 'birthplace') {
            s.birthplace = updates.birthplace;
            const viewEl = cell?.querySelector('.student-cell-view span');
            if (viewEl) {
              viewEl.textContent = updates.birthplace || '—';
              viewEl.style.color = updates.birthplace ? 'var(--clr-text-2)' : 'var(--grade-c)';
            }
          } else if (field === 'birth_date') {
            s.birth_date = updates.birth_date;
            if (s.birth_date) {
              const bd = new Date(s.birth_date);
              const today = new Date();
              let age = today.getFullYear() - bd.getFullYear();
              const m = today.getMonth() - bd.getMonth();
              if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
              s.ageDisplay = age > 0 ? String(age) : '—';
              const ageCell = target.closest('tr')?.querySelector('.col-ageDisplay');
              if (ageCell) ageCell.textContent = s.ageDisplay;
            }
          } else if (field === 'province') {
            s.province = updates.province;
            if (updates.city) s.city = updates.city;
            if (updates.district) s.district = updates.district;
            if (updates.village) s.village = updates.village;
            const viewEl = cell?.querySelector('.student-cell-view span');
            if (viewEl) {
              const formattedProv = formatProvinceName(updates.province);
              viewEl.textContent = formattedProv;
              cell.querySelector('.student-cell-view')?.setAttribute('title', formattedProv);
            }
          } else if (field === 'city') {
            s.city = updates.city;
            if (updates.district) s.district = updates.district;
            if (updates.village) s.village = updates.village;
            const viewEl = cell?.querySelector('.student-cell-view span');
            if (viewEl) {
              const formattedCity = formatCityDistrict(updates.city);
              viewEl.textContent = formattedCity;
              cell.querySelector('.student-cell-view')?.setAttribute('title', formattedCity);
            }
          } else if (field === 'district') {
            s.district = updates.district;
            const viewEl = cell?.querySelector('.student-cell-view span');
            if (viewEl) {
              const formattedDistrict = formatDistrictName(updates.district);
              viewEl.textContent = formattedDistrict || '—';
              cell.querySelector('.student-cell-view')?.setAttribute('title', formattedDistrict || '—');
            }
          } else if (field === 'village') {
            s.village = updates.village;
            const viewEl = cell?.querySelector('.student-cell-view span');
            if (viewEl) {
              const formattedVillage = formatVillageName(updates.village);
              viewEl.textContent = formattedVillage || '—';
              cell.querySelector('.student-cell-view')?.setAttribute('title', formattedVillage || '—');
            }
          } else if (field === 'gender') {
            s.gender = updates.gender;
            const viewEl = cell?.querySelector('.student-cell-view span');
            if (viewEl) {
              const newG = updates.gender;
              viewEl.textContent = newG === 'male' ? 'Male' : newG === 'female' ? 'Female' : '—';
              viewEl.style.color = newG === 'male' ? '#38bdf8' : newG === 'female' ? '#c084fc' : 'var(--clr-text-3)';
            }
          } else if (field === 'education') {
            s.education = updates.education;
            const viewEl = cell?.querySelector('.student-cell-view span');
            if (viewEl) viewEl.textContent = formatLastEducation(updates.education);
          } else if (field === 'level_id') {
            const lvlObj = levelsMap.get(updates.level_id);
            const shortLvl = lvlObj ? (typeof toShortLevel === 'function' ? toShortLevel(lvlObj.level_number || lvlObj.name) : (lvlObj.name || lvlObj.level_number)) : '—';
            s.level_id = updates.level_id;
            s.levelName = lvlObj?.name;
            s.studentLevelNum = lvlObj?.level_number;
            const viewEl = cell?.querySelector('.student-cell-view span');
            if (viewEl) {
              if (updates.program_status === 'ALUMNI' || lvlObj?.level_number === 0) {
                viewEl.textContent = 'X';
                viewEl.style.color = '#c084fc';
                viewEl.setAttribute('title', 'Alumni (Level X)');
              } else {
                viewEl.textContent = shortLvl;
                viewEl.style.color = '#f8fafc';
                viewEl.removeAttribute('title');
              }
            }
            renderStudents(area, { isAlumniPanel });
          } else if (field === 'program_status') {
            if (updates.is_active === false) {
              renderStudents(area);
            }
          }
        }
        if (field === 'province' || field === 'city' || field === 'district' || field === 'village') _dbHasAddressColumns = true;
        showToast('Saved changes', 'success');
        try {
          const fallbackKey = 'topscore_student_demographics_fallback';
          const cache = JSON.parse(localStorage.getItem(fallbackKey) || '{}');
          if (cache[studentId]) {
            delete cache[studentId][field];
            if (Object.keys(cache[studentId]).length === 0) delete cache[studentId];
            localStorage.setItem(fallbackKey, JSON.stringify(cache));
          }
        } catch (_) {}
      } else {
        if (error.message && (error.message.includes('column') || error.code === 'PGRST204') && (field === 'province' || field === 'city' || field === 'district' || field === 'village')) {
          _dbHasAddressColumns = false;
          try {
            const fallbackKey = 'topscore_student_demographics_fallback';
            const cache = JSON.parse(localStorage.getItem(fallbackKey) || '{}');
            cache[studentId] = cache[studentId] || {};
            cache[studentId][field] = value.trim();
            localStorage.setItem(fallbackKey, JSON.stringify(cache));
          } catch (_) {}

          const s = filteredGridData.find(x => x.id === studentId);
          if (s) {
            s[field] = value.trim();
            const viewEl = target.closest('td')?.querySelector('.student-cell-view span');
            if (viewEl) {
              const displayVal = field === 'province' ? formatProvinceName(value.trim()) : field === 'city' ? formatCityDistrict(value.trim()) : field === 'district' ? formatDistrictName(value.trim()) : field === 'village' ? formatVillageName(value.trim()) : value.trim();
              viewEl.textContent = displayVal || '—';
              target.closest('td')?.querySelector('.student-cell-view')?.setAttribute('title', displayVal || '—');
            }
          }
          showToast('Saved locally (Database column pending in Supabase)', 'warning', 3500);
        } else {
          if (field === 'pin') {
            const s = filteredGridData.find(x => x.id === studentId);
            if (s) target.value = (s.pin && s.pin !== '——') ? s.pin : '';
          }
          showToast('Failed to save: ' + error.message, 'error');
        }
      }
    }
  });

  gridContainer.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.matches('.student-inline-input')) {
      e.target.blur();
    }
  });

  window.activateStudent = async (studentId) => {
    const sb = await getSupabase();
    if (!sb) return;
    const { error } = await sb.from('students').update({ is_active: true, program_status: 'ACTIVE' }).eq('id', studentId);
    if (!error) {
      clearAdminCache('students');
      showToast('Student restored to Active', 'success');
      renderStudents(area, { isAlumniPanel });
    } else {
      showToast('Error restoring student: ' + error.message, 'error');
    }
  };

  window.deleteStudentDirect = async (studentId, studentName = 'student') => {
    if (!confirm(`Are you sure you want to delete ${studentName}? This will soft-delete the record.`)) return;
    await adminSoftDelete('students', studentId);
    showToast('Student deleted successfully', 'success');
    renderStudents(area, { isAlumniPanel });
  };

  // Toolbar hidden per user directive (hideToolbar: true) - students added via Student Registration and batch sizes are compact.
}

// ─────────────────────────────────────────────────────────────
// LIFECYCLE ACTIONS: NEXT PROMOTION, HOLD, RETRY, REPEAT, BATCH TRANSFER
// ─────────────────────────────────────────────────────────────

window.promoteStudentNextLevel = async function(rowOrId) {
  if (!rowOrId) return;
  let row = typeof rowOrId === 'string'
    ? (window._currentStudentsGridData || []).find(d => d.id === rowOrId)
    : rowOrId;

  const sb = await getSupabase();

  if (!row && typeof rowOrId === 'string') {
    const { data: st } = await sb.from('students')
      .select('id, name, level_id, batch_id, program_id, program_status, levels(name, level_number)')
      .eq('id', rowOrId)
      .single();
    if (st) {
      row = {
        id: st.id,
        displayName: cleanStudentName(st.name),
        studentLevelNum: st.levels?.level_number,
        levelName: st.levels?.name,
        level_id: st.level_id,
        program_id: st.program_id,
        batch_id: st.batch_id,
        isAlumni: (st.program_status || '').toUpperCase() === 'ALUMNI' || st.levels?.level_number === 99
      };
    }
  }
  if (!row) return;

  const studentId = row.id;
  const currentLevelNum = parseInt(row.studentLevelNum != null ? row.studentLevelNum : 1, 10);

  if (row.isAlumni || currentLevelNum === 99 || row.levelName === 'Alumni' || row.levelName === 'X') {
    showToast(`${row.displayName} is already an Alumni graduate.`, 'info');
    return;
  }
  if (currentLevelNum === 0) {
    showToast(`${row.displayName} is in a non-leveled program and cannot be promoted.`, 'info');
    return;
  }

  // Next level sequence: 1 -> 2, 2 -> 3, 3 -> 99 (Alumni / Level X)
  let nextLevelNum = currentLevelNum + 1;
  if (currentLevelNum >= 3) {
    nextLevelNum = 99; // Alumni (Level X)
  }

  const { data: levels } = await sb.from('levels').select('id, name, level_number').order('level_number');
  const targetLevel = (levels || []).find(l => parseInt(l.level_number, 10) === nextLevelNum || (nextLevelNum === 99 && (l.name || '').toLowerCase() === 'alumni'));
  if (!targetLevel) {
    showToast(`Target Level ${nextLevelNum === 99 ? 'ALUMNI' : nextLevelNum} not found in database.`, 'error');
    return;
  }

  const confirmMsg = nextLevelNum === 99
    ? `Promote ${row.displayName} to ALUMNI (Level X)?\n\nStudent has successfully passed all level exams and is eligible for graduation.`
    : `Promote ${row.displayName} from ${row.levelName || 'Current Level'} to ${targetLevel.name}?\n\nStudent has met the passing criteria on all current level exams.`;

  if (!confirm(confirmMsg)) return;

  try {
    const promoUpdates = { level_id: targetLevel.id };
    if (nextLevelNum === 99) {
      promoUpdates.program_status = 'ALUMNI';
    }
    const { error: updErr } = await sb.from('students')
      .update(promoUpdates)
      .eq('id', studentId);
    if (updErr) throw updErr;

    // Auto-activate class for target level in student's program if needed
    const progId = row.program_id || currentProgramId;
    if (nextLevelNum !== 0 && nextLevelNum !== 99 && progId && targetLevel?.id) {
      await sb.from('classes').update({ is_active: true }).eq('program_id', progId).eq('level_id', targetLevel.id);
    }
    // Safeguard: Check if batch or previous classes have 0 active students
    if (typeof window.syncActiveCohortsAndClasses === 'function') {
      window.syncActiveCohortsAndClasses();
    }

    await sb.from('audit_logs').insert({
      actor_role: 'admin',
      action: nextLevelNum === 0 ? 'STUDENT_GRADUATED_ALUMNI' : 'LEVEL_PROMOTION',
      entity_type: 'students',
      entity_id: studentId,
      old_value: { level_id: row.level_id, level_number: currentLevelNum },
      new_value: { level_id: targetLevel.id, level_number: nextLevelNum, level_name: targetLevel.name, program_status: promoUpdates.program_status || 'ACTIVE' },
      created_at: new Date().toISOString()
    });

    clearAdminCache('students');
    if (nextLevelNum === 0) {
      showToast(`${row.displayName} has graduated to ALUMNI (Level X)!`, 'success');
    } else {
      showToast(`${row.displayName} successfully promoted to ${targetLevel.name}!`, 'success');
    }

    if (typeof window.loadSection === 'function') {
      window.loadSection(window._activeSectionAlias || window._currentSection || 'students');
    }
  } catch (err) {
    console.error('Promotion error:', err);
    showToast('Promotion failed: ' + err.message, 'error');
  }
};

export function showPromotionRequirementsModal(students = []) {
  const existing = document.getElementById('promotion-requirements-modal');
  if (existing) existing.remove();

  const activeStudents = (students || []).filter(s => !s.isAlumni && s.studentLevelNum !== 0);
  const eligibleStudents = activeStudents.filter(s => s.isEligibleNext);

  const modal = document.createElement('div');
  modal.id = 'promotion-requirements-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.85);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';

  const rowsHtml = activeStudents.slice(0, 15).map(s => {
    return `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 12px;">
        <td style="padding: 8px 12px; font-weight: 600; color: #f8fafc;">${escapeHtml(s.displayName || s.name)}</td>
        <td style="padding: 8px 12px; text-align: center; color: var(--clr-accent-1, #38bdf8);">${escapeHtml(s.levelName || '—')}</td>
        <td style="padding: 8px 12px; text-align: center; font-weight: 700; color: ${s.overallColor || '#fff'};">${escapeHtml(s.overallScoreStr || '—')}</td>
        <td style="padding: 8px 12px; text-align: center;">
          ${s.isEligibleNext ? `<span style="color:var(--grade-a);font-weight:600;display:inline-flex;align-items:center;gap:4px;text-shadow:none;">${getSvgIcon('check-circle', 12)} Eligible</span>` : `<span style="color:var(--grade-e);font-weight:600;display:inline-flex;align-items:center;gap:4px;text-shadow:none;">${getSvgIcon('clock', 12)} Pending Exams</span>`}
        </td>
      </tr>
    `;
  }).join('');

  modal.innerHTML = `
    <div style="background:#0f172a; border:1px solid rgba(255,255,255,0.15); border-radius:12px; max-width:540px; width:100%; box-shadow:0 20px 40px rgba(0,0,0,0.6); overflow:hidden; display:flex; flex-direction:column; max-height:85vh;">
      <div style="padding:16px 20px; border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between; background:rgba(30,41,59,0.5);">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size: 16px;">${getSvgIcon('award', 16)}</span>
          <div>
            <h3 style="margin:0; font-size: 16px; font-weight:700; color:#f8fafc;">Level Promotion Status</h3>
            <p style="margin:2px 0 0; font-size: 12px; color:#94a3b8;">${eligibleStudents.length} of ${activeStudents.length} Students Currently Eligible</p>
          </div>
        </div>
      </div>

      <div style="padding:16px 20px; overflow-y:auto; flex:1;">
        <div style="background:rgba(56,189,248,0.08); border:1px solid rgba(56,189,248,0.25); border-radius:8px; padding:12px; margin-bottom:14px; font-size: 12px; line-height:1.45; color:#cbd5e1;">
          <strong style="color:#38bdf8;">Promotion Criteria:</strong>
          <ul style="margin:6px 0 0 16px; padding:0;">
            <li>Student must have completed <strong>all required exams</strong> for their current level.</li>
            <li>Each exam rate must meet the passing threshold: <strong>&ge; 60%</strong> (Grade C or above, or Admin Forgiven grade exemption).</li>
            <li>Alumni graduates cannot be promoted further.</li>
          </ul>
        </div>

        <div style="border:1px solid rgba(255,255,255,0.08); border-radius:8px; overflow:hidden;">
          <table style="width:100%; border-collapse:collapse; text-align:left;">
            <thead>
              <tr style="background:#1e293b; font-size:12px; color:#ffffff; border-bottom:1px solid rgba(255,255,255,0.1);">
                <th style="padding:8px 12px;">STUDENT</th>
                <th style="padding:8px 12px; text-align:center;">LEVEL</th>
                <th style="padding:8px 12px; text-align:center;">RATE</th>
                <th style="padding:8px 12px; text-align:center;">STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="4" style="padding:16px; text-align:center; color:#94a3b8;">No active students in current view.</td></tr>'}
            </tbody>
          </table>
        </div>
        ${activeStudents.length > 15 ? `<p style="font-size: 12px; color:#64748b; text-align:center; margin-top:8px;">Showing first 15 of ${activeStudents.length} students.</p>` : ''}
      </div>

      <div style="padding:12px 20px; border-top:1px solid rgba(255,255,255,0.08); background:rgba(30,41,59,0.3); display:flex; justify-content:flex-start;">
        <button id="btn-done-promo-req" class="btn btn-secondary btn-sm btn-modal-close-left" style="font-weight:600; padding:6px 16px;">Understood</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  const close = () => modal.remove();
  modal.querySelector('#btn-done-promo-req').onclick = close;
  modal.onclick = (e) => { if (e.target === modal) close(); };
}

window.promoteAllEligibleStudents = async function() {
  const source = window._currentStudentsGridData || [];
  const eligible = source.filter(s => s.isEligibleNext && !s.isAlumni && s.studentLevelNum !== 0 && s.studentLevelNum !== 99);
  if (eligible.length === 0) {
    showPromotionRequirementsModal(source);
    return;
  }

  if (!confirm(`Promote ${eligible.length} eligible student(s) to their next levels?`)) return;

  const sb = await getSupabase();
  const { data: levels } = await sb.from('levels').select('id, name, level_number').order('level_number');
  const levelsByNum = new Map((levels || []).map(l => [parseInt(l.level_number, 10), l]));

  let promotedCount = 0;
  for (const s of eligible) {
    const curNum = parseInt(s.studentLevelNum != null ? s.studentLevelNum : 1, 10);
    const nextNum = curNum >= 3 ? 99 : curNum + 1;
    const targetLvl = (levels || []).find(l => parseInt(l.level_number, 10) === nextNum || (nextNum === 99 && (l.name || '').toLowerCase() === 'alumni'));
    if (!targetLvl) continue;

    const promoUpdates = { level_id: targetLvl.id };
    if (nextNum === 99) {
      promoUpdates.program_status = 'ALUMNI';
    }
    const { error } = await sb.from('students').update(promoUpdates).eq('id', s.id);
    if (!error) {
      promotedCount++;
      await sb.from('audit_logs').insert({
        actor_role: 'admin',
        action: 'LEVEL_PROMOTION',
        entity_type: 'students',
        entity_id: s.id,
        old_value: { level_id: s.level_id, level_number: curNum },
        new_value: { level_id: targetLvl.id, level_number: nextNum, level_name: targetLvl.name },
        created_at: new Date().toISOString()
      });
    }
  }

  // Sync batch level and activate target level classes if promoting batch students
  if (window._filterBatchId && promotedCount > 0 && eligible[0]) {
    const curNum = parseInt(eligible[0].studentLevelNum != null ? eligible[0].studentLevelNum : 1, 10);
    const nextNum = curNum >= 3 ? 99 : curNum + 1;
    const targetLvl = (levels || []).find(l => parseInt(l.level_number, 10) === nextNum || (nextNum === 99 && (l.name || '').toLowerCase() === 'alumni'));
    if (targetLvl && nextNum !== 99) {
      await sb.from('batches').update({ current_level_id: targetLvl.id }).eq('id', window._filterBatchId);
      const progId = eligible[0].program_id || currentProgramId;
      if (progId) {
        await sb.from('classes').update({ is_active: true }).eq('program_id', progId).eq('level_id', targetLvl.id);
      }
    } else if (targetLvl && nextNum === 99) {
      // Cohort completed and all students graduated to Alumni: mark batch completed/inactive
      await sb.from('batches').update({ current_level_id: targetLvl.id, is_active: false }).eq('id', window._filterBatchId);
    }
    if (typeof window.syncActiveCohortsAndClasses === 'function') {
      window.syncActiveCohortsAndClasses();
    }
  }

  clearAdminCache('students');
  showToast(`Successfully promoted ${promotedCount} student(s)!`, 'success');
  if (typeof window.loadSection === 'function') {
    window.loadSection(window._activeSectionAlias || window._currentSection || 'students');
  }
};

window.openTransferBatchModal = async function(studentId) {
  const source = window._currentStudentsGridData || [];
  let s = source.find(d => d.id === studentId);
  const sb = await getSupabase();
  if (!s) {
    const { data: st } = await sb.from('students')
      .select('id, name, batch_id, level_id, program_id, batches(name, current_level_id), levels(name, level_number)')
      .eq('id', studentId)
      .single();
    if (!st) { showToast('Student not found.', 'error'); return; }
    s = {
      id: st.id,
      displayName: cleanStudentName(st.name),
      batch_id: st.batch_id,
      level_id: st.level_id,
      program_id: st.program_id,
      batchName: st.batches?.name || '—',
      levelName: st.levels?.name || '—'
    };
  }

  const [{ data: batches }, { data: levels }] = await Promise.all([
    sb.from('batches').select('id, name, program_id, current_level_id, is_active').is('deleted_at', null).order('name'),
    sb.from('levels').select('id, name, level_number').order('level_number')
  ]);

  const levelsMap = new Map((levels || []).map(l => [l.id, l]));
  const availableBatches = (batches || []).filter(b => (!s.program_id || b.program_id === s.program_id) && b.is_active !== false);

  const existing = document.getElementById('transfer-batch-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'transfer-batch-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.92);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:var(--fm-bg-panel, #0F172A);border:1px solid var(--clr-border, rgba(255,255,255,0.12));border-radius:12px;padding:2rem;width:100%;max-width:480px;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
      <div class="d-flex align-center justify-between mb-3">
        <h3 style="margin:0;font-size: 16px;display:flex;align-items:center;gap:8px;">
          <span>${getSvgIcon('refresh', 14)}</span> Transfer Batch: <span style="color:#38bdf8;">${escapeHtml(s.displayName)}</span>
        </h3>
      </div>

      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px 14px;margin-bottom:1.25rem;font-size: 12px;">
        <div style="color:var(--clr-text-3);margin-bottom:4px;">Current Batch:</div>
        <div class="fw-700" style="color:#f8fafc;">
          Batch: <span style="color:#e2e8f0;">${escapeHtml(s.batchName)}</span> &bull; Level: <span style="color:#c084fc;">${escapeHtml(s.levelName)}</span>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;gap:1.1rem;margin-bottom:1.75rem;">
        <div>
          <label class="form-label" style="display:block;margin-bottom:0.35rem;font-size: 12px;font-weight:600;">Destination Batch</label>
          <select id="tb-target-batch" class="form-input" style="width:100%;">
            ${availableBatches.map(b => {
              const bLvl = levelsMap.get(b.current_level_id);
              const lvlText = bLvl ? ` (${bLvl.name})` : '';
              const isSelected = b.id === s.batch_id ? 'selected' : '';
              return `<option value="${b.id}" data-level-id="${b.current_level_id || ''}" ${isSelected}>${escapeHtml(b.name)}${lvlText}</option>`;
            }).join('')}
          </select>
        </div>

        <div style="background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.25);border-radius:8px;padding:10px 12px;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size: 12px;color:#e0f2fe;font-weight:600;">
            <input type="checkbox" id="tb-inherit-level" checked style="width:16px;height:16px;accent-color:var(--primary-tactical, #38bdf8);">
            <span>Inherit Destination Batch Level</span>
          </label>
          <div style="font-size: 12px;color:#bae6fd;margin-top:4px;margin-left:24px;">
            Automatically updates student's academic level to match the destination batch's current level.
          </div>
        </div>

        <div>
          <label class="form-label" style="display:block;margin-bottom:0.35rem;font-size: 12px;font-weight:600;">Academic Status</label>
          <select id="tb-status" class="form-input" style="width:100%;">
            <option value="active" selected>Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div class="d-flex align-center gap-2 justify-between mt-3 pt-3" style="border-top:1px solid rgba(255,255,255,0.08);">
        <button id="tb-cancel-btn" class="btn btn-secondary btn-modal-close-left">CLOSE</button>
        <button id="tb-save-btn" class="btn btn-tactical" style="font-weight:700;">
          Confirm Transfer
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#tb-cancel-btn').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  overlay.querySelector('#tb-save-btn').onclick = async () => {
    const batchSelect = overlay.querySelector('#tb-target-batch');
    const targetBatchId = batchSelect.value;
    const selectedOpt = batchSelect.options[batchSelect.selectedIndex];
    const targetLevelId = selectedOpt?.dataset?.levelId || null;
    const inheritLevel = overlay.querySelector('#tb-inherit-level').checked;
    const rawStatus = overlay.querySelector('#tb-status').value;
    const isActive = rawStatus !== 'inactive';
    const programStatus = rawStatus === 'inactive' ? 'INACTIVE' : 'ACTIVE';

    if (!targetBatchId) {
      showToast('Please select a destination batch.', 'warning');
      return;
    }

    const saveBtn = overlay.querySelector('#tb-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Transferring...';

    try {
      const updates = {
        batch_id: targetBatchId,
        is_active: isActive,
        program_status: programStatus
      };
      if (inheritLevel && targetLevelId) {
        updates.level_id = targetLevelId;
      }

      const { error: updErr } = await sb.from('students').update(updates).eq('id', studentId);
      if (updErr) throw updErr;

      await sb.from('audit_logs').insert({
        actor_role: 'admin',
        action: 'STUDENT_BATCH_TRANSFER',
        entity_type: 'students',
        entity_id: studentId,
        old_value: { batch_id: s.batch_id, level_id: s.level_id },
        new_value: { ...updates, inherited_level: inheritLevel },
        created_at: new Date().toISOString()
      });

      clearAdminCache('students');
      close();
      showToast('Student transferred successfully.', 'success');
      if (typeof window.loadSection === 'function') {
        window.loadSection(window._activeSectionAlias || window._currentSection || 'students');
      }
    } catch (err) {
      console.error(err);
      showToast('Transfer failed: ' + err.message, 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Confirm Transfer';
    }
  };
};

window.openRepeatLevelModal = async function(studentId) {
  const source = window._currentStudentsGridData || [];
  let s = source.find(d => d.id === studentId);
  const sb = await getSupabase();
  if (!s) {
    const { data: st } = await sb.from('students')
      .select('id, name, batch_id, level_id, program_id, batches(name), levels(name, level_number)')
      .eq('id', studentId)
      .single();
    if (!st) { showToast('Student not found.', 'error'); return; }
    s = {
      id: st.id,
      displayName: cleanStudentName(st.name),
      batch_id: st.batch_id,
      level_id: st.level_id,
      program_id: st.program_id,
      batchName: st.batches?.name || '—',
      levelName: st.levels?.name || '—'
    };
  }

  const [{ data: levels }, { data: batches }] = await Promise.all([
    sb.from('levels').select('id, name, level_number').gt('level_number', 0).order('level_number'),
    sb.from('batches').select('id, name, program_id, current_level_id, is_active').is('deleted_at', null).order('name')
  ]);

  const availableBatches = (batches || []).filter(b => (!s.program_id || b.program_id === s.program_id) && b.is_active !== false);

  const existing = document.getElementById('repeat-level-modal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'repeat-level-modal';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.92);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';
  overlay.innerHTML = `
    <div style="background:var(--fm-bg-panel, #0F172A);border:1px solid var(--clr-border, rgba(255,255,255,0.12));border-radius:12px;padding:2rem;width:100%;max-width:480px;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
      <div class="d-flex align-center justify-between mb-3">
        <h3 style="margin:0;font-size: 16px;display:flex;align-items:center;gap:8px;">
          <span>${getSvgIcon('refresh', 14)}</span> Repeat Level / Re-enroll: <span style="color:#a855f7;">${escapeHtml(s.displayName)}</span>
        </h3>
      </div>

      <p style="color:var(--clr-text-3);font-size: 12px;margin:0 0 1.25rem;">
        Student is currently marked as Alumni or requested to repeat curriculum. Select the academic level and batch to reactivate them.
      </p>

      <div style="display:flex;flex-direction:column;gap:1.1rem;margin-bottom:1.75rem;">
        <div>
          <label class="form-label" style="display:block;margin-bottom:0.35rem;font-size: 12px;font-weight:600;">Target Academic Level</label>
          <select id="rl-target-level" class="form-input" style="width:100%;">
            ${(levels || []).map(l => `<option value="${l.id}">${escapeHtml(l.name)}</option>`).join('')}
          </select>
        </div>

        <div>
          <label class="form-label" style="display:block;margin-bottom:0.35rem;font-size: 12px;font-weight:600;">Assign to Batch</label>
          <select id="rl-target-batch" class="form-input" style="width:100%;">
            <option value="">-- Keep Current / No Batch --</option>
            ${availableBatches.map(b => `<option value="${b.id}" ${b.id === s.batch_id ? 'selected' : ''}>${escapeHtml(b.name)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="d-flex align-center gap-2 justify-between mt-3 pt-3" style="border-top:1px solid rgba(255,255,255,0.08);">
        <button id="rl-cancel-btn" class="btn btn-secondary btn-modal-close-left">CLOSE</button>
        <button id="rl-save-btn" class="btn btn-purple" style="font-weight:700;display:inline-flex;align-items:center;gap:6px;">
          ${getSvgIcon('refresh', 14)} Confirm Re-enrollment
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#rl-cancel-btn').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };

  overlay.querySelector('#rl-save-btn').onclick = async () => {
    const targetLevelId = overlay.querySelector('#rl-target-level').value;
    const targetBatchId = overlay.querySelector('#rl-target-batch').value || null;

    if (!targetLevelId) {
      showToast('Please select a target level.', 'warning');
      return;
    }

    const saveBtn = overlay.querySelector('#rl-save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Re-enrolling...';

    try {
      const updates = {
        level_id: targetLevelId,
        is_active: true,
        program_status: 'ACTIVE'
      };
      if (targetBatchId) updates.batch_id = targetBatchId;

      const { error: updErr } = await sb.from('students').update(updates).eq('id', studentId);
      if (updErr) throw updErr;

      await sb.from('audit_logs').insert({
        actor_role: 'admin',
        action: 'REPEAT_LEVEL',
        entity_type: 'students',
        entity_id: studentId,
        old_value: { level_id: s.level_id, batch_id: s.batch_id },
        new_value: updates,
        created_at: new Date().toISOString()
      });

      clearAdminCache('students');
      close();
      showToast(`${s.displayName} successfully re-enrolled!`, 'success');
      if (typeof window.loadSection === 'function') {
        window.loadSection(window._activeSectionAlias || window._currentSection || 'students');
      }
    } catch (err) {
      console.error(err);
      showToast('Re-enrollment failed: ' + err.message, 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Confirm Re-enrollment';
    }
  };
};

export function openStudentProfile(studentId, batchStudentIds = [], skipHistory = false) {
  if (typeof window.openStudentProfile === 'function') {
    return window.openStudentProfile(studentId, batchStudentIds, skipHistory);
  }
}

// ---- HELPERS ----
// escHtml is already declared at the top of this module
  // return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// }

// ---- FULL EDIT MODAL (#modal-student-full-edit) ----
function buildFullEditModal() {
  if (document.getElementById('modal-student-full-edit')) return;
  const modal = document.createElement('div');
  modal.id = 'modal-student-full-edit';
  modal.className = 'modal-backdrop hidden';
  modal.style.zIndex = '9999';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:640px;width:95%;max-height:90vh;overflow-y:auto;background:#0f172a;border:1px solid var(--clr-border);border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
      <div class="modal-header" style="display:flex;justify-content:center;align-items:center;padding:1.25rem 1.5rem;border-bottom:1px solid var(--clr-border);text-align:center;">
        <h3 id="bfe-title" style="margin:0 auto;font-size: 16px;font-weight:800;color:var(--clr-text-1);text-align:center;">Edit Student</h3>
      </div>
      <div id="bfe-body" style="padding:1.5rem;"></div>
      <div class="modal-footer" style="display:flex;justify-content:space-between;align-items:center;padding:1rem 1.5rem;border-top:1px solid var(--clr-border);">
        <button class="btn btn-secondary btn-modal-close-left" id="bfe-cancel">CLOSE</button>
        <button class="btn btn-primary" id="bfe-save">Save Changes</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function handleGuardClose(modal, onDiscard) {
  if (window.isProfileDirty) {
    const saveIt = confirm("You have unsaved profile changes.\\n\\nClick OK to SAVE and leave, or CANCEL to discard changes and leave.");
    if (saveIt) {
      document.getElementById('bfe-save')?.click();
      return;
    } else {
      window.isProfileDirty = false;
      if (typeof onDiscard === 'function') onDiscard();
      modal.classList.add('hidden');
      return;
    }
  }
  modal.classList.add('hidden');
}

export async function openStudentFullEdit(student, onSaved) {
  if (isTutorRole()) {
    showToast('Permission denied: Tutor accounts cannot edit student data.', 'warning');
    return;
  }
  buildFullEditModal();
  const modal   = document.getElementById('modal-student-full-edit');
  const title   = document.getElementById('bfe-title');
  const body    = document.getElementById('bfe-body');
  let   saveBtn = document.getElementById('bfe-save');

  // Reset dirty flag and check for local draft buffer
  window.isProfileDirty = false;
  const draftKey = 'topscore_student_draft_' + (student?.id || 'new');
  let draftData = null;
  try {
    const rawDraft = localStorage.getItem(draftKey);
    if (rawDraft) draftData = JSON.parse(rawDraft);
  } catch (e) { /* ignore */ }

  title.textContent = student ? ('Edit — ' + (student.name || 'Student')) : 'Add New Student';

  // Fetch data for dropdowns and level editing
  let batches = [];
  let classes = [];
  let levels = [];
  let studentProgress = [];
  let programs = [];
  try {
    const [bRes, cRes, lRes, pRes, prgRes] = await Promise.all([
      adminFetchAll('batches', 'id, name, program_id, is_active, deleted_at, programs(institution_id)'),
      adminFetchAll('classes', 'id, name'),
      adminFetchAll('levels', 'id, name, level_number'),
      adminFetchAll('progress', 'id, student_id, class_id, unlocked_level, highest_score').catch(() => []),
      adminFetchAll('programs', 'id, name, institution_id')
    ]);
    batches = (bRes || []).filter(b => !b.deleted_at && b.is_active !== false).sort((a,b) => (a.name||'').localeCompare(b.name||''));
    classes = (cRes || []).sort((a,b) => (a.name||'').localeCompare(b.name||''));
    levels = lRes || [];
    programs = prgRes || [];
    if (student?.id) {
      studentProgress = (pRes || []).filter(p => p.student_id === student.id);
    }
  } catch (err) {
    console.warn('Could not load lookup data for edit modal:', err);
  }

  const initialName = draftData?.name ?? (student?.name || '');
  const initialGender = draftData?.gender ?? (student?.gender || '');
  const initialBirthplace = draftData?.birthplace ?? (student?.birthplace || '');
  const initialBirth = draftData?.birth_date ?? (student?.birth_date || '');
  const initialProvince = draftData?.province ?? (student?.province || 'Nusa Tenggara Barat');
  let canonicalProv = initialProvince;
  if (typeof PROVINCE_DISPLAY_MAP !== 'undefined') {
    for (const [fullName, shortName] of Object.entries(PROVINCE_DISPLAY_MAP)) {
      if (initialProvince.toLowerCase() === shortName.toLowerCase() || initialProvince.toLowerCase() === fullName.toLowerCase()) {
        canonicalProv = fullName;
        break;
      }
    }
  }

  const initialCity = draftData?.city ?? (student?.city || 'Kota Mataram');
  const defAddress = getDefaultDistrictAndVillage(initialCity, canonicalProv);
  const initialDistrict = draftData?.district ?? (student?.district || defAddress.district);
  const initialVillage = draftData?.village ?? (student?.village || defAddress.village);
  const initialPin = draftData?.pin ?? (student?.pin || '');
  const initialBatchId = draftData?.batch_id ?? (student?.batch_id || '');
  const initialLevelId = draftData?.level_id ?? (student?.level_id || '');
  const initialActive = draftData?.is_active ?? (student?.is_active !== false);
  let currentPhotoUrl = draftData?.photo_url ?? (student?.photo_url || '');
  if (!currentPhotoUrl && student?.id) {
    try {
      const sb = await getSupabase();
      const { data: pData } = await sb.from('students').select('photo_url').eq('id', student.id).single();
      if (pData?.photo_url) {
        currentPhotoUrl = pData.photo_url;
        student.photo_url = pData.photo_url;
      }
    } catch (_) {}
  }

  // Build options for address dropdowns
  const provKeys = (typeof INDONESIA_REGIONS !== 'undefined') ? Object.keys(INDONESIA_REGIONS).sort((a, b) => a.localeCompare(b, 'en')) : [];
  const bfeProvOptions = provKeys.map(p => {
    const isSel = (p.toLowerCase() === canonicalProv.toLowerCase()) || (p.toLowerCase() === initialProvince.toLowerCase());
    return `<option value="${p}" ${isSel ? 'selected' : ''}>${escapeHtml(formatProvinceName(p))}</option>`;
  }).join('');

  const cityList = (typeof INDONESIA_REGIONS !== 'undefined' && INDONESIA_REGIONS[canonicalProv]) ? INDONESIA_REGIONS[canonicalProv] : [];
  const bfeCityOptions = cityList.map(c => {
    const isSel = (c.toLowerCase() === initialCity.toLowerCase()) || (formatCityDistrict(c).toLowerCase() === formatCityDistrict(initialCity).toLowerCase());
    return `<option value="${c}" ${isSel ? 'selected' : ''}>${escapeHtml(formatCityDistrict(c))}</option>`;
  }).join('');

  const distList = getDistrictsForCity(initialCity);
  const bfeDistOptions = distList.map(d => {
    const isSel = formatDistrictName(d).toLowerCase() === formatDistrictName(initialDistrict).toLowerCase();
    return `<option value="${d}" ${isSel ? 'selected' : ''}>${escapeHtml(formatDistrictName(d))}</option>`;
  }).join('');

  const villList = getVillagesForDistrict(initialCity, initialDistrict);
  const bfeVillOptions = villList.map(v => {
    const isSel = formatVillageName(v).toLowerCase() === formatVillageName(initialVillage).toLowerCase();
    return `<option value="${v}" ${isSel ? 'selected' : ''}>${escapeHtml(formatVillageName(v))}</option>`;
  }).join('');

  body.innerHTML = `
    <div style="display:flex;gap:1.5rem;flex-wrap:wrap;">
      <!-- 3:4 Avatar Center-Crop Upload (Left) -->
      <div style="flex:1;min-width:140px;max-width:180px;text-align:center;">
        <label class="form-label" style="display:block;margin-bottom:0.5rem;font-size: 12px;text-transform:uppercase;color:var(--clr-text-3);">3:4 Avatar</label>
        <div style="width:120px;height:160px;margin:0 auto;border-radius:8px;overflow:hidden;border:2px solid var(--clr-border);background:rgba(0,0,0,0.25);position:relative;">
          <img id="bfe-avatar-preview" src="${getBustedAvatarUrl(currentPhotoUrl)}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;" />
          <div id="bfe-avatar-loading" class="hidden" style="position:absolute;inset:0;background:rgba(15,23,42,0.95);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;">
            <div class="spinner" style="width:20px;height:20px;"></div>
          </div>
        </div>
        <div style="margin-top:0.75rem;">
          <label for="bfe-avatar-file" class="btn btn-secondary btn-xs" style="cursor:pointer;font-size: 12px;display:inline-flex;align-items:center;gap:4px;">
            ${getSvgIcon('camera', 14)} Upload (3:4)
          </label>
          <input type="file" id="bfe-avatar-file" accept="image/*" style="display:none;" />
          <div class="text-xs text-muted mt-1" style="font-size: 12px;">240x320 WebP &bull; 35% Top Bias</div>
        </div>
      </div>

      <!-- Main Fields (Right) -->
      <div style="flex:2.5;min-width:260px;display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Full Name *</label>
          <input class="form-control" id="bfe-name" value="${escHtml(initialName)}" placeholder="e.g. Johnathan Doe">
        </div>

        <div class="form-group">
          <label class="form-label">Honorific &amp; Gender</label>
          <select class="form-control" id="bfe-gender">
            <option value="">-- Unassigned --</option>
            <option value="male" ${initialGender === 'male' ? 'selected' : ''}>Mister (Male)</option>
            <option value="female" ${initialGender === 'female' ? 'selected' : ''}>Miss (Female)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Birthplace (Tempat Lahir)</label>
          <input class="form-control" id="bfe-birthplace" value="${escHtml(initialBirthplace)}" placeholder="e.g. Praya, Mataram">
        </div>

        <div class="form-group">
          <label class="form-label">Date of Birth <span style="color:var(--grade-e);font-weight:800;" title="Required">*</span></label>
          <input type="date" class="form-control" id="bfe-birth" value="${escHtml(initialBirth)}" required>
          <div style="font-size: 12px;color:#94a3b8;margin-top:3px;">Required — used to calculate student age in the roster.</div>
        </div>

        <div class="form-group">
          <label class="form-label">Province</label>
          <select class="form-control" id="bfe-province">
            ${bfeProvOptions}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Regency</label>
          <select class="form-control" id="bfe-city">
            ${bfeCityOptions}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">District (Kecamatan)</label>
          <select class="form-control" id="bfe-district">
            ${bfeDistOptions}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Village (Desa / Kelurahan)</label>
          <select class="form-control" id="bfe-village">
            ${bfeVillOptions}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Assigned Batch</label>
          <select class="form-control" id="bfe-batch">
            <option value="">-- No Batch Assigned --</option>
            ${batches.map(b => `<option value="${b.id}" ${b.id === initialBatchId ? 'selected' : ''}>${escHtml(b.name)}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Personal PIN (Reset)</label>
          <input type="text" class="form-control" id="bfe-pin" value="${escHtml(initialPin)}" placeholder="Leave blank to keep unchanged" autocomplete="new-password">
        </div>

        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Account Status</label>
          <select class="form-control" id="bfe-active">
            <option value="true"  ${initialActive ? 'selected' : ''}>Active</option>
            <option value="false" ${!initialActive  ? 'selected' : ''}>Inactive / Suspended</option>
          </select>
        </div>

        ${(() => {
          if (!levels || levels.length === 0) return '';
          let options = '<option value="">-- Inherit from Batch --</option>';
          levels.forEach(lvl => {
            options += '<option value="' + lvl.id + '" ' + (lvl.id === initialLevelId ? 'selected' : '') + '>' + escHtml(lvl.name) + '</option>';
          });
          return `
            <div style="grid-column:1/-1; margin-top:0.5rem; border-top:1px solid var(--clr-border); padding-top:1rem;">
              <h4 style="margin:0 0 0.75rem 0; font-size: 16px; display:flex; justify-content:space-between; align-items:center;">
                <span>${getSvgIcon('trending-up', 14)} Manual Level Assignment</span>
                <span class="badge badge-neutral" style="font-weight:normal;">Applies instantly upon save</span>
              </h4>
              <div style="background:rgba(0,0,0,0.1); padding:1rem; border-radius:8px; border:1px solid var(--clr-border);">
                <div class="form-group mb-0">
                  <label class="form-label">Student's Current Level</label>
                  <select class="form-control" id="bfe-level">
                    ${options}
                  </select>
                </div>
              </div>
            </div>
          `;
        })()}
      </div>
    </div>
  `;

  // Write-Ahead Buffer & Dirty Tracking
  const updateDraft = () => {
    window.isProfileDirty = true;
    const currentDraft = {
      name: document.getElementById('bfe-name').value,
      gender: document.getElementById('bfe-gender').value,
      birth_date: document.getElementById('bfe-birth').value,
      province: document.getElementById('bfe-province')?.value || '',
      city: document.getElementById('bfe-city')?.value || '',
      district: document.getElementById('bfe-district')?.value || '',
      village: document.getElementById('bfe-village')?.value || '',
      batch_id: document.getElementById('bfe-batch').value,
      pin: document.getElementById('bfe-pin').value,
      is_active: document.getElementById('bfe-active').value === 'true',
      level_id: document.getElementById('bfe-level')?.value || null
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(currentDraft));
    } catch (e) { /* ignore */ }
  };

  ['bfe-name', 'bfe-gender', 'bfe-birth', 'bfe-province', 'bfe-city', 'bfe-district', 'bfe-village', 'bfe-batch', 'bfe-level', 'bfe-pin', 'bfe-active'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateDraft);
    document.getElementById(id)?.addEventListener('change', updateDraft);
  });

  // Cascading Address Dropdowns Linking (Province -> Regency -> District -> Village)
  const bfeProv = document.getElementById('bfe-province');
  const bfeCity = document.getElementById('bfe-city');
  const bfeDist = document.getElementById('bfe-district');
  const bfeVill = document.getElementById('bfe-village');

  const syncBfeVillages = () => {
    if (!bfeCity || !bfeDist || !bfeVill) return;
    const villages = getVillagesForDistrict(bfeCity.value, bfeDist.value);
    bfeVill.innerHTML = villages.map(v => `<option value="${v}">${escapeHtml(formatVillageName(v))}</option>`).join('');
    if (villages.length > 0) bfeVill.value = villages[0];
    updateDraft();
  };

  const syncBfeDistricts = () => {
    if (!bfeCity || !bfeDist) return;
    const districts = getDistrictsForCity(bfeCity.value);
    const def = getDefaultDistrictAndVillage(bfeCity.value);
    bfeDist.innerHTML = districts.map(d => `<option value="${d}" ${d === def.district ? 'selected' : ''}>${escapeHtml(formatDistrictName(d))}</option>`).join('');
    bfeDist.value = def.district;
    syncBfeVillages();
    if (bfeVill) bfeVill.value = def.village;
    updateDraft();
  };

  bfeProv?.addEventListener('change', () => {
    let cp = bfeProv.value;
    if (typeof PROVINCE_DISPLAY_MAP !== 'undefined') {
      for (const [fullName, shortName] of Object.entries(PROVINCE_DISPLAY_MAP)) {
        if (bfeProv.value.toLowerCase() === shortName.toLowerCase() || bfeProv.value.toLowerCase() === fullName.toLowerCase()) {
          cp = fullName;
          break;
        }
      }
    }
    const cities = (typeof INDONESIA_REGIONS !== 'undefined' && INDONESIA_REGIONS[cp]) ? INDONESIA_REGIONS[cp] : [];
    if (bfeCity) {
      bfeCity.innerHTML = cities.map(c => `<option value="${c}">${escapeHtml(formatCityDistrict(c))}</option>`).join('');
      if (cities.length > 0) bfeCity.value = cities[0];
      syncBfeDistricts();
    }
    updateDraft();
  });

  bfeCity?.addEventListener('change', syncBfeDistricts);
  bfeDist?.addEventListener('change', syncBfeVillages);

  // Avatar Upload Listener (3:4 Center-Crop Engine)
  const avatarFileInput = document.getElementById('bfe-avatar-file');
  avatarFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const loading = document.getElementById('bfe-avatar-loading');
    loading?.classList.remove('hidden');

    try {
      const avatarUrl = await uploadStudentAvatar(file, student?.id);
      currentPhotoUrl = avatarUrl;
      document.getElementById('bfe-avatar-preview').src = getBustedAvatarUrl(avatarUrl, initialName, initialGender);
      updateDraft();
      showToast('Student avatar uploaded to CDN (3:4 WebP format).', 'success');
    } catch (err) {
      showToast('Avatar processing error: ' + err.message, 'error');
    } finally {
      loading?.classList.add('hidden');
      avatarFileInput.value = '';
    }
  });

  // Close & Cancel buttons with Unsaved Changes Guard
  const bfeCloseBtn = document.getElementById('bfe-close');
  if (bfeCloseBtn) bfeCloseBtn.onclick = () => handleGuardClose(modal, () => localStorage.removeItem(draftKey));
  const bfeCancelBtn = document.getElementById('bfe-cancel');
  if (bfeCancelBtn) bfeCancelBtn.onclick = () => handleGuardClose(modal, () => localStorage.removeItem(draftKey));

  // Save Changes
  const newSaveBtn = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

  newSaveBtn.onclick = async () => {
    const name = document.getElementById('bfe-name').value.trim();
    if (!name) { showToast('Student name is required.', 'error'); return; }

    const birthVal = document.getElementById('bfe-birth').value.trim();
    if (!birthVal) {
      showToast('Date of Birth is required. Please enter the student\'s birthdate.', 'error');
      document.getElementById('bfe-birth').focus();
      return;
    }

    const selectedBatchId = document.getElementById('bfe-batch').value || null;
    let selectedProgramId = student?.program_id || null;
    let selectedInstitutionId = student?.institution_id || null;
    if (selectedBatchId && batches) {
      const bObj = batches.find(b => b.id === selectedBatchId);
      if (bObj && bObj.program_id) {
        selectedProgramId = bObj.program_id;
        selectedInstitutionId = bObj.programs?.institution_id || (programs || []).find(p => p.id === bObj.program_id)?.institution_id || null;
      }
    }

    const payload = {
      name,
      gender:         document.getElementById('bfe-gender').value || null,
      birthplace:     document.getElementById('bfe-birthplace')?.value.trim() || null,
      birth_date:     document.getElementById('bfe-birth').value  || null,
      province:       document.getElementById('bfe-province')?.value.trim() || null,
      city:           document.getElementById('bfe-city')?.value.trim() || null,
      district:       document.getElementById('bfe-district')?.value.trim() || null,
      village:        document.getElementById('bfe-village')?.value.trim() || null,
      batch_id:       selectedBatchId,
      program_id:     selectedProgramId,
      institution_id: selectedInstitutionId,
      level_id:       document.getElementById('bfe-level')?.value   || null,
      is_active:      document.getElementById('bfe-active').value === 'true',
      photo_url:      currentPhotoUrl || null,
    };
    const pinVal = document.getElementById('bfe-pin').value.trim();
    if (pinVal) {
      payload.pin_hash = await sha256(pinVal);
      payload.pin = pinVal;
    } else if (!student?.id) {
      payload.pin = '1234';
      payload.pin_hash = await sha256('1234');
    }

    newSaveBtn.disabled = true;
    newSaveBtn.textContent = 'Saving...';
    try {
      const sb = await getSupabase();
      let finalStudentId = student?.id;

      if (finalStudentId) {
        await adminUpdate('students', finalStudentId, payload);
        showToast('Student updated successfully.', 'success');
      } else {
        // Pre-check for duplicate student in the same institution and program
        const normNew = normalizeStudentNameForMatch(name);
        let dupQ = sb.from('students').select('id, name').is('deleted_at', null);
        if (selectedInstitutionId) dupQ = dupQ.eq('institution_id', selectedInstitutionId);
        if (selectedProgramId) dupQ = dupQ.eq('program_id', selectedProgramId);
        const { data: existingRows } = await dupQ;
        const dupMatch = (existingRows || []).find(r => normalizeStudentNameForMatch(r.name) === normNew);
        if (dupMatch) {
          showToast(`Student "${dupMatch.name}" already exists in this institution & program. Cannot add duplicate.`, 'warning');
          newSaveBtn.disabled = false;
          newSaveBtn.textContent = 'Save Changes';
          return;
        }

        const created = await adminInsert('students', payload);
        finalStudentId = created.id;
        showToast('Student created successfully.', 'success');

        // Initialize progress for eligible classes
        if (selectedProgramId && created?.id) {
          let classQ = sb.from('classes').select('id').eq('is_active', true).eq('program_id', selectedProgramId);
          if (selectedInstitutionId) classQ = classQ.or(`institution_id.eq.${selectedInstitutionId},institution_id.is.null`);
          const { data: pClasses } = await classQ;
          if (pClasses && pClasses.length > 0) {
            const pPayload = pClasses.map(c => ({
              student_id: created.id,
              class_id: c.id,
              unlocked_level: 1
            }));
            await sb.from('progress').upsert(pPayload, { onConflict: 'student_id,class_id', ignoreDuplicates: true });
          }
        }
      }



      window.isProfileDirty = false;
      localStorage.removeItem(draftKey);
      modal.classList.add('hidden');
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      showToast(err.message || 'Save failed.', 'error');
    } finally {
      newSaveBtn.disabled = false;
      newSaveBtn.textContent = 'Save Changes';
    }
  };

  modal.classList.remove('hidden');
}

// Expose globally
window.openStudentFullEdit = openStudentFullEdit;

export async function showStudentProfileModal(studentId) {
  return showStudentDossierModal(studentId);
}

export async function showStudentDossierModal(studentId) {
  if (typeof window.showStudentDossierModal === 'function') {
    return window.showStudentDossierModal(studentId);
  }
}


