import { adminFetchAll, formatStudentName, cleanStudentName, normalizeStudentNameForMatch, adminSoftDelete, clearAdminCache, adminInsert, adminUpdate, sha256, toLevelLetter, labelAttemptRemedial } from '../api.js?v=20261101_v75';
import { getSupabase } from '../supabase.js?v=5.3.2';
import { getGrade, showToast, getGradeColor, getGradeColorByScore, TOPSCORE_COLORS, isWeeklyExam, isExam, computeMilestoneExamMastery, calculateGrade } from '../app.js?v=20261030_v43';
import { processAndCompressAvatar, uploadStudentAvatar, generateAvatarSvg, generateAvatarDataUri, getBustedAvatarUrl, stripHonorific, getStudentInitial } from '../utils/avatar-engine.js?v=5.3.2';
import { DataGrid } from './datagrid.js?v=5.3.2';

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
    return (age && age > 0) ? `${age} yrs` : '—';
  } catch {
    return '—';
  }
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

export async function renderStudents(area) {
    const [rawData, allAttempts, allLevels, allProgress, allPrograms, allBatches, allAssignments, allTests, allClasses] = await Promise.all([
    adminFetchAll('students', 'id, name, gender, birth_date, photo_url, photo_status, is_active, created_at, deleted_at, level_id, batch_id, program_id, institution_id, programs!program_id(name, is_active), institutions!institution_id(name, is_active), batches!batch_id(name, is_active, current_level_id)'),
    adminFetchAll('attempts', 'id, student_id, test_id, status, score, total_questions, percentage, effective_score, created_at, is_remedial_unlocked, tests(test_type, title, class_id)'),
    adminFetchAll('levels', 'id, name, level_number'),
    adminFetchAll('progress', 'id, student_id, class_id, unlocked_level, highest_score'),
    adminFetchAll('programs', 'id, name, institution_id, is_active'),
    adminFetchAll('batches', 'id, name, program_id, is_active, current_level_id'),
    adminFetchAll('assignments', 'student_id, batch_id, test_id').catch(() => []),
    adminFetchAll('tests', 'id, title, test_type, shell_code, payload, display_order, category, level_id, class_id, levels(name, level_number)').catch(() => []),
    adminFetchAll('classes', 'id, name, is_active').catch(() => [])
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
    const sAssignments = (allAssignments || []).filter(a =>
      a.student_id === s.id || (a.batch_id && a.batch_id === s.batch_id)
    );
    const studentBatch = (allBatches || []).find(b => b.id === s.batch_id);
    const studentLevelId = s.level_id || studentBatch?.current_level_id;
    const levelAssesIds = studentLevelId ? (allTests || []).filter(a => a.level_id === studentLevelId).map(a => a.id) : [];
    const assignedAssesIds = new Set([...sAssignments.map(a => a.test_id), ...levelAssesIds]);
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
        totalQuestions: test.total_questions || test.payload?.total_questions || 10,
        attemptId: bestAttempt?.id || null,
        is_remedial_unlocked: Boolean(bestAttempt?.is_remedial_unlocked)
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

    const completedTestsCount = Math.max(bestByAsm.size, completedAssignedCount);
    const completionPct = totalAssigned > 0 ? Math.round((completedTestsCount / totalAssigned) * 100) : 0;
    const latestAttempt = studentAttempts.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
    
    // Authoritative Milestone Progression Engine (Rule 2.7, 2.8 & 2.10)
    // Academic Score, Grade, and Points are evaluated EXCLUSIVELY from Exams
    const studentLevelExams = (allTests || []).filter(a => {
      if (studentLevelId && a.level_id && a.level_id !== studentLevelId) return false;
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

    if (completedExamCount > 0) {
      overallPct = mastery.overallScore;
      globalGrade = mastery.grade;
      const isCappedRem = hasRemedial && overallPct === 60;
      overallScoreStr = isCappedRem ? '60%ᴿ' : `${overallPct}%`;
      overallColor = typeof getGradeColorByScore === 'function'
        ? getGradeColorByScore(overallPct)
        : (typeof getGradeColor === 'function' ? getGradeColor(globalGrade) : TOPSCORE_COLORS.STAR);
    }

    // ── Per-Class Stats (User Directive: 4 Exam columns matching each theme's total exam points) ──
    const perClassFinal = new Map();

    classesMap.forEach((cls, cId) => {
      const classAllTests = testsByClass.get(cId) || [];
      if (classAllTests.length === 0) return;

      const classExams = classAllTests.filter(t => isWeeklyExam(t));
      const targetExams = classExams.length > 0 ? classExams : classAllTests;

      // Group exams into 4 themes: A (Exam 1), B (Exam 2), C (Exam 3), D (Exam 4)
      const themeCodes = ['A', 'B', 'C', 'D'];
      const themePoints = {};
      let totalExamPts = 0;
      let hasAnyExamAtt = false;

      themeCodes.forEach(tc => {
        const examsInTheme = targetExams.filter(t => 
          t.payload?.theme_code === tc || 
          (t.shell_code && (t.shell_code.includes(`-${tc}-`) || t.shell_code.startsWith(`3${tc}-`)))
        );

        let earned = 0;
        let hasAttInTheme = false;
        examsInTheme.forEach(ex => {
          const best = bestByAsm.get(ex.id);
          if (best && best.score != null) {
            hasAttInTheme = true;
            earned += Number(best.score);
          }
        });

        if (hasAttInTheme) {
          hasAnyExamAtt = true;
          const cleanEarned = Math.round(earned * 10) / 10;
          themePoints[tc] = cleanEarned;
          totalExamPts += cleanEarned;
        } else {
          themePoints[tc] = null;
        }
      });

      // Does the student have any activity or enrollment in this class?
      const hasAttemptsInClass = studentAttempts.some(a => {
        const tObj = testsMap.get(a.test_id);
        return (tObj?.class_id || a.tests?.class_id) === cId;
      });
      const hasProgressInClass = (allProgress || []).some(p => p.student_id === s.id && p.class_id === cId);
      const isEnrolledInClass = hasAttemptsInClass || hasProgressInClass;

      if (!isEnrolledInClass && !hasAnyExamAtt) {
        return; // Student doesn't belong to this class, leave undefined so table shows '—'
      }

      perClassFinal.set(cId, {
        themes: themePoints,
        totalPts: hasAnyExamAtt ? Math.round(totalExamPts * 10) / 10 : null
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
        if (age && age > 0) ageDisplay = `${age} yrs`;
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
    if (s.level_id) {
      const lvlObj = levelsMap.get(s.level_id);
      levelName = lvlObj ? lvlObj.name : '—';
    } else {
      const batchLevelId = s.batches?.current_level_id;
      const batchLevel = batchLevelId ? levelsMap.get(batchLevelId) : null;
      levelName = batchLevel ? batchLevel.name : '—';
    }

    // Detect orphaned students (batch/program/institution inactive or missing)
    const isOrphaned = !s.program_id
      || (s.institutions && s.institutions.is_active === false)
      || (s.programs && s.programs.is_active === false)
      || (s.batches && s.batches.is_active === false)
      || (s.batch_id && !s.batches);

    // Join date
    let joinDate = '—';
    if (s.created_at) {
      try {
        const d = new Date(s.created_at);
        joinDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch { joinDate = '—'; }
    }

    const rowObj = {
      ...s,
      displayName: cleanStudentName(s.name),
      sortName: cleanStudentName(s.name).toLowerCase(),
      ageDisplay,
      instName: s.institutions?.name || (s.institution_id ? '⚠ Unknown Institution' : '—'),
      progName: s.programs?.name || (s.program_id ? '⚠ Unknown Program' : '—'),
      batchName: s.batches?.name || (s.batch_id ? '⚠ Unknown Batch' : '— No Batch —'),
      levelName,
      pinDisplay: s.pin || 'NOT SET',
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
      remediationPending,
      isOrphaned,
      joinDate,
      phone: s.phone || s.phone_number || '—',
      email: s.email || '—',
      perClassFinal   // Map<classId, {themes, totalPts}>
    };

    // Flatten per-class theme exam metrics so DataGrid can search & sort seamlessly
    perClassFinal.forEach((cs, cId) => {
      rowObj[`_cls_exam1_${cId}`] = cs.themes?.['A'] ?? -1;
      rowObj[`_cls_exam2_${cId}`] = cs.themes?.['B'] ?? -1;
      rowObj[`_cls_exam3_${cId}`] = cs.themes?.['C'] ?? -1;
      rowObj[`_cls_exam4_${cId}`] = cs.themes?.['D'] ?? -1;
      rowObj[`_cls_pts_${cId}`] = cs.totalPts ?? -1;
    });

    return rowObj;
  });

  // Hierarchical sort comparator: Active first, then Institution -> Program -> Batch -> Level -> Name (A-Z)
  gridData.sort(compareStudentsHierarchical);

  // 1 Program 1 Table: Dynamic Active Programs (Auto-show when active, auto-hide when inactive)
  const activePrograms = (allPrograms || []).filter(p => p.is_active !== false);
  activePrograms.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

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

  // Synchronize sidebar active state for program items
  document.querySelectorAll('.sidebar-program-item').forEach(i => {
    i.classList.toggle('active', i.getAttribute('data-program-id') === currentProgramId);
  });
  const topbarTitle = document.getElementById('topbar-title');
  if (topbarTitle && window._selectedProgramName) {
    topbarTitle.textContent = window._selectedProgramName;
  }

  // Filter students strictly by active program
  const programStudents = currentProgramId ? gridData.filter(s => s.program_id === currentProgramId) : gridData;

  // Filter data if navigated from Batches or batch status
  const currentBatchStatus = window._filterBatchStatus || (window._filterBatchId ? 'all' : 'active');
  const filteredGridData = programStudents.filter(s => {
    if (window._filterBatchId && s.batch_id !== window._filterBatchId) return false;
    if (currentBatchStatus === 'active') {
      return (s.batches ? s.batches.is_active !== false : true) && ((s._raw || s).is_active !== false);
    } else if (currentBatchStatus === 'inactive') {
      return (s.batches ? s.batches.is_active === false : false) || ((s._raw || s).is_active === false);
    }
    return true;
  });

  // Batches belonging to current active program
  const programBatches = (allBatches || []).filter(b => b.program_id === currentProgramId);

  const remediationPendingCount = filteredGridData.filter(s => s.remediationPending).length;

  // Update sidebar badge
  const rosterNavBtn = document.querySelector(`.sidebar-program-item[data-program-id="${currentProgramId}"]`) || document.querySelector('.admin-nav-item[data-sub="students"]');
  if (rosterNavBtn) {
    const existingBadge = rosterNavBtn.querySelector('.remediation-sidebar-badge');
    if (existingBadge) existingBadge.remove();
    if (remediationPendingCount > 0) {
      rosterNavBtn.insertAdjacentHTML('beforeend', `<span class="remediation-sidebar-badge badge badge-warning" style="margin-left:auto;font-size:0.7rem;padding:0.1rem 0.3rem;">${remediationPendingCount}</span>`);
    }
  }

  // Interactive Status Filter Tabs (User Directive: Active & Inactive in Topbar, No middle filter bar)
  const activeCount = programStudents.filter(s => (s.batches ? s.batches.is_active !== false : true) && ((s._raw || s).is_active !== false)).length;
  const inactiveCount = programStudents.filter(s => (s.batches ? s.batches.is_active === false : false) || ((s._raw || s).is_active === false)).length;
  const totalCount = programStudents.length;

  window._switchStudentRosterStatus = (statusId) => {
    window._filterBatchStatus = statusId;
    try {
      localStorage.setItem('topscore_student_status_tab', statusId);
      const url = new URL(window.location.href);
      url.searchParams.set('status', statusId);
      window.history.replaceState(null, '', url.toString());
    } catch (e) {}
    renderStudents(area);
  };

  // Keyboard Quick-Switch (Hotkeys: 1 for Active, 2 for Inactive, 3 for All)
  if (!window._rosterHotkeysBound) {
    window._rosterHotkeysBound = true;
    window.addEventListener('keydown', (e) => {
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (window._currentSection !== 'students' && window._activeSectionAlias !== 'students') return;

      if (e.key === '1') {
        window._switchStudentRosterStatus('active');
        showToast('Filter: Active Students', 'info');
      } else if (e.key === '2') {
        window._switchStudentRosterStatus('inactive');
        showToast('Filter: Inactive Students', 'info');
      } else if (e.key === '3') {
        window._switchStudentRosterStatus('all');
        showToast('Filter: All Students', 'info');
      }
    });
  }

  if (window.setTopbarTabs) {
    window.setTopbarTabs([
      { id: 'active', icon: '🟢', label: 'Active Students', val: activeCount, valColor: 'var(--clr-success, #4ade80)' },
      { id: 'inactive', icon: '⚪', label: 'Inactive Students', val: inactiveCount, valColor: '#94a3b8' },
      { id: 'all', icon: '👥', label: 'All Students', val: totalCount, valColor: 'var(--clr-accent-1, #38bdf8)' }
    ], currentBatchStatus, 'window._switchStudentRosterStatus');
  }

  // Raised Table Layout (User Directive: Strip bulky header & middle filter bar; table header sits directly beneath top panel)
  area.innerHTML = `
    ${totalDuplicates > 0 ? `
      <div class="mb-3 p-3 rounded d-flex align-center justify-between" style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);color:#fef3c7;">
        <div class="d-flex align-center gap-3">
          <span style="font-size:1.4rem;">⚠️</span>
          <div>
            <div class="fw-700 text-sm">Detected ${totalDuplicates} Duplicate Student Profiles</div>
            <div class="text-xs text-muted" style="color:rgba(255,255,255,0.85)!important;">
              Found ${duplicateGroups.length} groups of duplicate student profiles. Merge them to unify their Test progress.
            </div>
          </div>
        </div>
        <button class="btn btn-warning btn-sm" id="btn-banner-merge-duplicates" style="background:#f59e0b;color:#000;font-weight:700;border:none;">
          ⚠️ Resolve All Duplicates
        </button>
      </div>
    ` : ''}

    <div id="student-grid-container" class="card" style="padding:0.75rem 1rem;"></div>
  `;

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
      'Institution', 'Program', 'Batch', 'Current Level', 'Student Name', 'Age', 'Gender',
      'Exam 1 (Theme A) Pts', 'Exam 2 (Theme B) Pts', 'Exam 3 (Theme C) Pts', 'Exam 4 (Theme D) Pts',
      'Total Exam Pts', 'Score (%)', 'Grade', 'Status'
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
        'Age': s.ageDisplay || '—',
        'Gender': (s.gender || '').toUpperCase() || '—',
        'Exam 1 (Theme A) Pts': e1,
        'Exam 2 (Theme B) Pts': e2,
        'Exam 3 (Theme C) Pts': e3,
        'Exam 4 (Theme D) Pts': e4,
        'Total Exam Pts': s.totalEarnedScore ?? 0,
        'Score (%)': s.overallScoreStr || '—',
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
  window.showStudentProgressDetails = function(studentId) {
    const rec = (filteredGridData || gridData || []).find(d => d.id === studentId);
    if (!rec) return;
    const existing = document.getElementById('prog-details-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'prog-details-modal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.92);backdrop-filter:blur(6px);z-index:9999;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;';

    const renderDetailRow = (r) => {
      const attId = r.attemptId;
      const isRem = Boolean(r.is_remedial_unlocked);
      const scoreClickAttr = attId ? `onclick="window.open('result.html?attempt_id=${encodeURIComponent(attId)}&admin=1', '_blank'); event.stopPropagation();" style="cursor:pointer; text-decoration:underline;" title="View Exam Result Sheet"` : '';
      
      let actionHtml = '<span class="text-muted text-xs">—</span>';
      if (r.is_completed && attId) {
        if (isRem) {
          actionHtml = `
            <div style="display:inline-flex; align-items:center; gap:4px;">
              <span class="badge" style="font-size:0.65rem; background:rgba(255,255,0,0.15); color:${TOPSCORE_COLORS.C}; border:1px solid ${TOPSCORE_COLORS.C}; padding:2px 6px;">REMEDIAL</span>
              <button class="btn btn-ghost btn-xs btn-prog-toggle-rem" data-att-id="${attId}" data-set-remedial="false" style="padding:2px 6px; font-size:0.75rem;" title="Revert remedial status (return to normal)">↩️</button>
            </div>
          `;
        } else {
          actionHtml = `
            <button class="btn btn-warning btn-xs btn-prog-toggle-rem" data-att-id="${attId}" data-set-remedial="true" style="padding:3px 10px; font-size:0.72rem; font-weight:700; background:#f59e0b; color:#000; border-radius:4px;" title="Mark this exam result as Remedial">
              🏷️ Remedial
            </button>
          `;
        }
      }

      const scoreColor = r.bestPct != null ? (typeof getGradeColorByScore === 'function' ? getGradeColorByScore(r.bestPct) : TOPSCORE_COLORS.STAR) : 'var(--clr-text-3)';
      const ptsDisplay = (r.bestScore != null && r.totalQuestions) ? `${r.bestScore}/${r.totalQuestions} pts` : '—';

      return `
        <tr>
          <td class="fw-600 text-sm" style="color:var(--clr-text-1);">
            <div style="display:flex;align-items:center;gap:6px;">
              <span>${escapeHtml(r.testTitle || '—')}</span>
              ${r.shellCode ? `<span class="badge" style="font-size:0.65rem;background:rgba(255,255,255,0.06);color:#94a3b8;border:1px solid rgba(255,255,255,0.1);">${escapeHtml(r.shellCode)}</span>` : ''}
            </div>
          </td>
          <td class="text-center">
            <span class="badge badge-primary" style="font-size:0.75rem;">
              ${escapeHtml(r.levelName || (typeof toLevelLetter === 'function' ? toLevelLetter(r.levelNumber) : `Level ${r.levelNumber}`))}
            </span>
          </td>
          <td class="text-center">
            <span class="badge ${r.is_completed ? 'badge-success' : r.is_in_progress ? 'badge-warning' : 'badge-neutral'}" style="font-size:0.75rem;padding:3px 8px;">
              ${r.is_completed ? '&#10004;&#65039; Completed' : r.is_in_progress ? '&#9654;&#65039; In Progress' : '&#128276; Not Started'}
            </span>
          </td>
          <td class="text-center">
            <div class="fw-700 text-sm" ${scoreClickAttr} style="color:${scoreColor};">
              ${r.bestPct != null ? `${r.bestPct}%${isRem ? `<sup class="asm-rem-sup" style="font-size:0.7em;font-weight:900;margin-left:2px;color:${TOPSCORE_COLORS.C};">R</sup>` : ''}` : '—'}
            </div>
            <div class="text-xs text-muted" style="font-size:0.68rem;">${ptsDisplay}</div>
          </td>
          <td class="text-center">
            ${actionHtml}
          </td>
        </tr>
      `;
    };

    const examRows = (rec.details || []).filter(r => r.isExam).map(renderDetailRow).join('');
    const quizRows = (rec.details || []).filter(r => !r.isExam).map(renderDetailRow).join('');

    modal.innerHTML = `
      <div style="background:var(--fm-bg-panel, #0F172A);border:1px solid var(--clr-border);border-radius:14px;width:100%;max-width:820px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,0.6);overflow:hidden;">
        <div style="padding:1.25rem 1.5rem;border-bottom:1px solid var(--clr-border);display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.02);">
          <div class="d-flex align-center gap-3">
            ${rec.photo_url 
              ? `<img src="${rec.photo_url}" onerror="this.onerror=null;this.src='${generateAvatarDataUri(rec.displayName || rec.name, rec.gender)}';" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid var(--clr-border);">` 
              : `<img src="${generateAvatarDataUri(rec.displayName || rec.name, rec.gender)}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid var(--clr-border);">`
            }
            <div>
              <h3 style="margin:0;font-size:1.15rem;color:var(--clr-text-1);">${escapeHtml(rec.displayName || rec.name)}</h3>
              <div class="text-xs text-muted" style="margin-top:2px;">
                ${escapeHtml(rec.instName)} &bull; ${escapeHtml(rec.progName)} &bull; Batch ${escapeHtml(rec.batchName)} &bull; ${escapeHtml(rec.levelName)}
              </div>
            </div>
          </div>
          <button class="btn-icon" id="btn-close-prog-details" style="background:rgba(255,255,255,0.05);border:none;color:var(--clr-text-2);font-size:1.1rem;cursor:pointer;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;">&#10005;</button>
        </div>
        <div style="padding:1.25rem 1.5rem;overflow-y:auto;flex:1;">
          <div class="d-flex gap-3 mb-4 flex-wrap" style="background:rgba(255,255,255,0.03);border:1px solid var(--clr-border);padding:0.9rem 1.2rem;border-radius:10px;">
            <div style="flex:1;min-width:90px;">
              <div class="text-xs text-muted">Assigned</div>
              <div class="fw-700" style="font-size:1.25rem;color:var(--clr-text-1);">${rec.totalAssigned}</div>
            </div>
            <div style="flex:1;min-width:90px;">
              <div class="text-xs text-muted">Completed</div>
              <div class="fw-700" style="font-size:1.25rem;color:var(--clr-success);">${rec.completedTests}</div>
            </div>
            <div style="flex:1;min-width:90px;">
              <div class="text-xs text-muted">In Progress</div>
              <div class="fw-700" style="font-size:1.25rem;color:var(--clr-warning);">${rec.inProgressCount || 0}</div>
            </div>
            <div style="flex:1;min-width:100px;">
              <div class="text-xs text-muted">Mastery Score</div>
              <div class="fw-700" style="font-size:1.25rem;color:${rec.overallColor || 'var(--clr-text-1)'};">${rec.overallScoreStr}</div>
            </div>
            <div style="flex:1;min-width:90px;">
              <div class="text-xs text-muted">Global Grade</div>
              <div style="margin-top:2px;">
                <span class="badge" style="${rec.globalGrade === 'S' || rec.globalGrade === '★' ? `background:rgba(${TOPSCORE_COLORS.STAR_RGB},0.18);color:${TOPSCORE_COLORS.STAR};font-weight:900;box-shadow:0 0 10px rgba(${TOPSCORE_COLORS.STAR_RGB},0.45);border:1px solid ${TOPSCORE_COLORS.STAR};` : `background:${rec.overallColor};color:${TOPSCORE_COLORS?.TEXT_DARK || '#0F172A'};font-weight:800;`}font-size:0.85rem;padding:3px 10px;">${(rec.globalGrade === 'S' || rec.globalGrade === '★') ? '★' : rec.globalGrade}</span>
              </div>
            </div>
            <div style="flex:1;min-width:100px;">
              <div class="text-xs text-muted">Exam Points</div>
              <div class="fw-700" style="font-size:1.25rem;color:${rec.overallColor || 'var(--clr-text-1)'};">${rec.totalEarnedScore ?? 0} <span style="font-size:0.7rem;color:#94a3b8;font-weight:normal;">pts</span></div>
            </div>
            <div style="flex:1.2;min-width:120px;">
              <div class="text-xs text-muted mb-1">Completion</div>
              <div class="d-flex align-center gap-2">
                <div style="flex:1;background:rgba(255,255,255,0.1);height:8px;border-radius:4px;overflow:hidden;">
                  <div style="width:${rec.completionPct}%;background:var(--fm-accent-tactical, #6366f1);height:100%;border-radius:4px;"></div>
                </div>
                <span class="text-xs fw-700" style="color:var(--clr-text-1);">${rec.completionPct}%</span>
              </div>
            </div>
          </div>

          <!-- 1. Weekly Exams Section (Milestone Academic Assessments) -->
          <div class="mb-4">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <div style="font-size:0.9rem;font-weight:800;color:var(--clr-text-1);display:flex;align-items:center;gap:6px;">
                <span>🎓 Weekly Exams (Ujian Mingguan)</span>
                <span class="badge" style="background:rgba(244,114,182,0.15);color:#f472b6;font-size:0.7rem;border:1px solid rgba(244,114,182,0.3);">Penentu Nilai Akademik &amp; Milestone</span>
              </div>
              <span class="text-xs text-muted">${(rec.details || []).filter(r => r.isExam && r.is_completed).length} / ${(rec.details || []).filter(r => r.isExam).length} Completed</span>
            </div>
            <table class="table-wrap" style="width:100%;">
              <thead>
                <tr>
                  <th class="text-left" style="padding:8px 12px;">Exam Title</th>
                  <th class="text-center" style="padding:8px 12px;width:120px;">Level</th>
                  <th class="text-center" style="padding:8px 12px;width:120px;">Status</th>
                  <th class="text-center" style="padding:8px 12px;width:110px;">Exam Result</th>
                  <th class="text-center" style="padding:8px 12px;width:130px;">Action / Remedial</th>
                </tr>
              </thead>
              <tbody>
                ${examRows || '<tr><td colspan="5" class="text-center text-muted p-4">No weekly exams assigned.</td></tr>'}
              </tbody>
            </table>
          </div>

          <!-- 2. Daily Quizzes Section (Practice & Curriculum Pacing) -->
          <div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.08);">
              <div style="font-size:0.9rem;font-weight:800;color:var(--clr-text-1);display:flex;align-items:center;gap:6px;">
                <span>⚡ Daily Quizzes (Latihan Harian)</span>
                <span class="badge" style="background:rgba(250,204,21,0.15);color:#facc15;font-size:0.7rem;border:1px solid rgba(250,204,21,0.3);">Pacing &amp; Completion Only</span>
              </div>
              <span class="text-xs text-muted">${(rec.details || []).filter(r => !r.isExam && r.is_completed).length} / ${(rec.details || []).filter(r => !r.isExam).length} Completed</span>
            </div>
            <table class="table-wrap" style="width:100%;">
              <thead>
                <tr>
                  <th class="text-left" style="padding:8px 12px;">Quiz Title</th>
                  <th class="text-center" style="padding:8px 12px;width:120px;">Level</th>
                  <th class="text-center" style="padding:8px 12px;width:120px;">Status</th>
                  <th class="text-center" style="padding:8px 12px;width:110px;">Quiz Score</th>
                  <th class="text-center" style="padding:8px 12px;width:130px;">Action / Remedial</th>
                </tr>
              </thead>
              <tbody>
                ${quizRows || '<tr><td colspan="5" class="text-center text-muted p-4">No daily quizzes assigned.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#btn-close-prog-details').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };

    modal.querySelectorAll('.btn-prog-toggle-rem').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const attId = btn.dataset.attId;
        const targetRemedial = btn.dataset.setRemedial === 'true';
        const msg = targetRemedial
          ? 'Mark this exam result as REMEDIAL (Grade will display with small "R", actual score preserved)?'
          : 'Revert this exam result to NORMAL?';
        if (!confirm(msg)) return;
        try {
          showLoading('Updating remedial status...');
          await labelAttemptRemedial(attId, targetRemedial, 60);
          showToast(targetRemedial ? '🏷️ Successfully labeled as Remedial.' : '↩️ Remedial status reverted to Normal.', 'success');
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
  };

  // ─────────────────────────────────────────────────────────────
  // MODAL 1: INTERACTIVE STUDENT PROFILE MODAL (TACTICAL FM WORKSTATION)
  // ─────────────────────────────────────────────────────────────
  window.showStudentProfileModal = async function(studentId) {
    const list = filteredGridData || gridData || [];
    let rec = list.find(d => d.id === studentId);

    // Fallback query if called outside current filtered table
    if (!rec) {
      try {
        const sb = await getSupabase();
        const { data: st } = await sb.from('students')
          .select('id, name, gender, birth_date, is_active, photo_url, level_id, batch_id, program_id, institution_id, programs!program_id(name), institutions!institution_id(name), batches!batch_id(name), levels!level_id(name)')
          .eq('id', studentId)
          .single();
        if (st) {
          rec = {
            id: st.id,
            name: st.name,
            displayName: cleanStudentName(st.name),
            gender: st.gender,
            birth_date: st.birth_date,
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
        console.warn('Fallback student fetch failed:', err);
      }
    }
    if (!rec) return;

    // Carousel navigation indices
    const currentIdx = list.findIndex(d => d.id === studentId);
    const hasPrev = currentIdx > 0;
    const hasNext = currentIdx >= 0 && currentIdx < list.length - 1;
    const prevId = hasPrev ? list[currentIdx - 1].id : null;
    const nextId = hasNext ? list[currentIdx + 1].id : null;
    const positionText = list.length > 0 ? `${currentIdx + 1} of ${list.length}` : '';

    // Remove existing profile/dossier modals if any
    const existingP = document.getElementById('student-profile-modal');
    if (existingP) existingP.remove();
    const existingD = document.getElementById('student-dossier-modal');
    if (existingD) existingD.remove();

    if (window.location.hash && !window.location.hash.startsWith('#profile-') && !window.location.hash.startsWith('#dossier-')) {
      window._lastSectionBeforeProfile = window.location.hash.substring(1);
    }
    try {
      if (window.location.hash !== '#profile-' + studentId) {
        window.location.hash = '#profile-' + studentId;
      }
    } catch (_) {}

    const backdrop = document.createElement('div');
    backdrop.id = 'student-profile-modal';
    backdrop.className = 'student-modal-backdrop animate-fade-in';
    backdrop.style.cssText = 'position:fixed !important;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;background:rgba(9,13,22,0.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;box-sizing:border-box;margin:0;';
    document.body.style.overflow = 'hidden';

    const genderIcon = (rec.gender || '').toLowerCase().startsWith('m') ? '♂️' : '♀️';
    const photoContent = rec.photo_url
      ? `<img src="${rec.photo_url}" onerror="this.onerror=null;this.src='${generateAvatarDataUri(rec.displayName || rec.name, rec.gender)}';" alt="Student Photo" style="width:100%;height:100%;object-fit:cover;">`
      : `<img src="${generateAvatarDataUri(rec.displayName || rec.name, rec.gender)}" style="width:100%;height:100%;object-fit:cover;">`;

    backdrop.innerHTML = `
      <div class="student-profile-dialog">
        <!-- Header -->
        <div style="padding: 1.15rem 1.5rem; border-bottom: 1px solid var(--fm-border-subtle, rgba(255,255,255,0.08)); display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); gap: 12px; flex-wrap: wrap;">
          <div class="d-flex align-center gap-3">
            <div style="width: 56px; height: 56px; border-radius: 14px; overflow: hidden; border: 2px solid var(--fm-accent-tactical, #6366f1); box-shadow: 0 4px 12px rgba(0,0,0,0.4); flex-shrink: 0; background: #1e293b; display: flex; align-items: center; justify-content: center;">
              ${photoContent}
            </div>
            <div>
              <div class="d-flex align-center gap-2 flex-wrap">
                <h3 style="margin: 0; font-size: 1.2rem; color: var(--fm-text-primary, #f8fafc); font-weight: 800;">${escapeHtml(rec.displayName || rec.name)}</h3>
                <span class="badge ${rec.is_active !== false ? 'badge-success' : 'badge-neutral'}" style="font-size: 0.7rem;">${rec.is_active !== false ? 'Active' : 'Inactive'}</span>
                <span class="badge badge-info" style="font-size: 0.7rem;">${escapeHtml(rec.gender || '—')}</span>
              </div>
              <div class="text-xs text-muted" style="margin-top: 3px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span>🏛️ ${escapeHtml(rec.instName)}</span> &bull; 
                <span>👥 ${escapeHtml(rec.progName)}</span> &bull; 
                <span>🏷️ Batch ${escapeHtml(rec.batchName)}</span> &bull; 
                <span>⭐ ${escapeHtml(rec.levelName)}</span> &bull;
                <span>🎂 ${escapeHtml(rec.ageDisplay || '—')}</span>
              </div>
            </div>
          </div>

          <!-- Carousel & Actions -->
          <div class="d-flex align-center gap-2">
            ${list.length > 1 ? `
              <div class="d-flex align-center gap-1" style="margin-right: 6px;">
                <button class="btn btn-secondary btn-sm" id="btn-modal-prev-student" ${!hasPrev ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''} title="Previous Student (ArrowLeft)">←</button>
                <span class="text-xs text-muted" style="padding: 0 4px; font-weight: 700;">${positionText}</span>
                <button class="btn btn-secondary btn-sm" id="btn-modal-next-student" ${!hasNext ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''} title="Next Student (ArrowRight)">→</button>
              </div>
            ` : ''}
            <button class="btn btn-secondary btn-sm" id="btn-profile-open-dossier" style="display:inline-flex;align-items:center;gap:5px;font-weight:600;" title="Open Official Academic Dossier">
              <span>🖨️</span> Dossier
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-profile-edit-student" style="display:inline-flex;align-items:center;gap:5px;font-weight:600;" title="Edit Student">
              <span>✏️</span> Edit
            </button>
            <button class="btn-icon" id="btn-close-profile-modal" style="background:rgba(255,255,255,0.06);border:none;color:var(--clr-text-2);font-size:1.1rem;cursor:pointer;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;">✕</button>
          </div>
        </div>

        <!-- 6 Tactical KPI Cards -->
        <div style="padding: 0.9rem 1.5rem; display: flex; gap: 10px; flex-wrap: wrap; background: rgba(0,0,0,0.15);">
          <div class="profile-kpi-card" style="border-left: 3px solid var(--fm-accent-tactical, #6366f1);">
            <div class="profile-kpi-label">Global Grade</div>
            <div class="profile-kpi-val" style="color: ${rec.overallColor || '#38bdf8'};">${rec.globalGrade || '—'}</div>
          </div>
          <div class="profile-kpi-card">
            <div class="profile-kpi-label">Overall Score</div>
            <div class="profile-kpi-val" style="color: ${rec.overallColor || 'var(--fm-text-primary, #f8fafc)'}; ${(rec.globalGrade === 'S' || rec.globalGrade === '★') ? `filter:drop-shadow(0 0 8px rgba(${TOPSCORE_COLORS.STAR_RGB},0.6)); font-weight:900;` : ''}">${rec.overallScoreStr || '—'}</div>
          </div>
          <div class="profile-kpi-card">
            <div class="profile-kpi-label">Curriculum Done</div>
            <div class="profile-kpi-val" style="color: #38bdf8; font-size: 1.15rem;">
              ${rec.completedTests || 0} / ${rec.totalAssigned || 40}
              <span style="font-size: 0.75rem; color: var(--fm-text-muted); font-weight: 600;">(${rec.completionPct || 0}%)</span>
            </div>
          </div>
          <div class="profile-kpi-card" style="border-left: 3px solid var(--eval-correct);">
            <div class="profile-kpi-label" style="color: var(--eval-correct);">Correct Answers</div>
            <div class="profile-kpi-val" id="profile-stat-correct" style="color: var(--eval-correct);">...</div>
          </div>
          <div class="profile-kpi-card" style="border-left: 3px solid var(--eval-partial);">
            <div class="profile-kpi-label" style="color: var(--eval-partial);">Minor Errors</div>
            <div class="profile-kpi-val" id="profile-stat-minor" style="color: var(--eval-partial);">...</div>
          </div>
          <div class="profile-kpi-card" style="border-left: 3px solid var(--eval-incorrect);">
            <div class="profile-kpi-label" style="color: var(--eval-incorrect);">Incorrect</div>
            <div class="profile-kpi-val" id="profile-stat-wrong" style="color: var(--eval-incorrect);">...</div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div style="display: flex; gap: 4px; padding: 0 1.5rem; border-bottom: 1px solid var(--fm-border-subtle, rgba(255,255,255,0.08)); background: rgba(0,0,0,0.08);">
          <button class="student-profile-tab-btn active" data-tab="tests">📝 Test Breakdown (${(rec.details || []).length || 40})</button>
          <button class="student-profile-tab-btn" data-tab="remediation">⚠️ Remediation & Progression</button>
          <button class="student-profile-tab-btn" data-tab="account">🔑 Account & Enrollment</button>
        </div>

        <!-- Tab Body -->
        <div style="padding: 1.25rem 1.5rem; overflow-y: auto; flex: 1;" id="profile-tab-body">
          <div class="empty-state" style="padding: 2rem;"><div class="spinner"></div><p style="margin-top:8px;">Loading test history...</p></div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    // Fetch attempts asynchronously for question-level inspection
    let studentAttempts = [];
    try {
      const sb = await getSupabase();
      const { data: atts } = await sb.from('attempts')
        .select('id, test_id, score, total_questions, percentage, grade, submitted_at, status, is_remedial_unlocked, tests(id, title, test_type, classes(id, name)), attempt_answers(id, is_correct, evaluation_result, score, question_snapshot, student_answer, correct_answer_snapshot)')
        .eq('student_id', studentId)
        .in('status', ['submitted', 'auto_submitted', 'evaluated', 'graded'])
        .order('submitted_at', { ascending: false });
      studentAttempts = atts || [];
    } catch (err) {
      console.warn('Error fetching attempts for profile modal:', err);
    }

    // Accuracy calculations
    let totalCorrect = 0;
    let totalMinor = 0;
    let totalIncorrect = 0;
    studentAttempts.forEach(att => {
      (att.attempt_answers || []).forEach(ans => {
        const res = (ans.evaluation_result || '').toLowerCase();
        if (res === 'correct' || ans.is_correct || ans.score >= 1) totalCorrect++;
        else if (res.includes('minor') || (ans.score > 0 && ans.score < 1)) totalMinor++;
        else totalIncorrect++;
      });
    });

    const statCorrectEl = backdrop.querySelector('#profile-stat-correct');
    const statMinorEl = backdrop.querySelector('#profile-stat-minor');
    const statWrongEl = backdrop.querySelector('#profile-stat-wrong');
    if (statCorrectEl) statCorrectEl.textContent = totalCorrect;
    if (statMinorEl) statMinorEl.textContent = totalMinor;
    if (statWrongEl) statWrongEl.textContent = totalIncorrect;

    // Render Tab Function
    const renderTab = (tabName) => {
      const tabBody = backdrop.querySelector('#profile-tab-body');
      if (!tabBody) return;

      if (tabName === 'tests') {
        const details = rec.details || [];
        const rows = details.map(d => {
          const matchingAttempts = studentAttempts.filter(a => a.test_id === d.test_id);
          const latestAtt = matchingAttempts[0];
          const hasAnswers = latestAtt && latestAtt.attempt_answers && latestAtt.attempt_answers.length > 0;
          const attId = latestAtt ? latestAtt.id : null;

          return `
            <tr class="${hasAnswers ? 'clickable-attempt-row' : ''}" data-att-id="${attId || ''}" style="${hasAnswers ? 'cursor:pointer;' : ''}">
              <td class="fw-600">
                <div class="d-flex align-center gap-2">
                  ${hasAnswers ? `<span class="toggle-arrow" id="modal-arrow-${attId}" style="font-size:0.7rem; color:var(--clr-text-muted); transition:transform 0.2s;">▶</span>` : '<span style="display:inline-block;width:12px;"></span>'}
                  <span>${escapeHtml(d.testTitle || '—')}</span>
                </div>
              </td>
              <td class="text-center">
                <span class="badge badge-primary" style="font-size:0.75rem;">
                  ${escapeHtml(d.levelName || `Level ${d.levelNumber || '3'}`)}
                </span>
              </td>
              <td class="text-center">
                <span class="badge ${d.is_completed ? 'badge-success' : d.is_in_progress ? 'badge-warning' : 'badge-neutral'}" style="font-size:0.75rem;padding:3px 8px;">
                  ${d.is_completed ? '✔️ Completed' : d.is_in_progress ? '▶️ In Progress' : '🔔 Not Started'}
                </span>
              </td>
              <td class="text-center">
                <span class="fw-700 text-sm" style="color:${d.bestPct != null ? (typeof getGradeColorByScore === 'function' ? getGradeColorByScore(d.bestPct) : TOPSCORE_COLORS.STAR) : 'var(--clr-text-3)'};">
                  ${d.bestPct != null ? `${d.bestPct}%` : '—'}
                </span>
              </td>
              <td class="text-center text-xs text-muted">
                ${matchingAttempts.length > 0 ? `${matchingAttempts.length} attempt${matchingAttempts.length > 1 ? 's' : ''}` : '—'}
              </td>
            </tr>
            ${hasAnswers ? `
              <tr id="modal-detail-${attId}" class="hidden" style="background:rgba(0,0,0,0.3);">
                <td colspan="5" style="padding:12px 16px;">
                  <div style="border-left:3px solid var(--fm-accent-tactical, #6366f1); padding-left:12px;">
                    <div class="d-flex align-center justify-between mb-2">
                      <div class="fw-700 text-xs" style="color:var(--fm-text-primary, #f8fafc); text-transform:uppercase;">
                        Questions &amp; Answers Review (${latestAtt.attempt_answers.length} items)
                      </div>
                      <div class="d-flex align-center gap-2">
                        ${latestAtt ? `
                          ${latestAtt.is_remedial_unlocked ? `
                            <button class="btn btn-secondary btn-sm btn-modal-toggle-rem" data-att-id="${attId}" data-set-remedial="false" style="padding:2px 8px;font-size:0.75rem;background:rgba(245,158,11,0.15);border:1px solid #f59e0b;color:#fbbf24;" title="Revert status to Normal">
                              ↩️ Normal
                            </button>
                            <span class="badge badge-success" style="font-size:0.7rem;">🔓 Remedial Authorized</span>
                          ` : `
                            <button class="btn btn-warning btn-sm btn-modal-toggle-rem" data-att-id="${attId}" data-set-remedial="true" style="padding:2px 8px;font-size:0.75rem;" title="Mark this exam score as Remedial">
                              🏷️ Remedial
                            </button>
                          `}
                        ` : ''}
                      </div>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px; max-height:220px; overflow-y:auto; padding-right:4px;">
                      ${latestAtt.attempt_answers.map((ans, qIdx) => {
                        const evalRes = (ans.evaluation_result || '').toLowerCase();
                        const sc = parseFloat(ans.score || 0);
                        let badge = '<span class="badge badge-danger" style="font-size:0.7rem;">❌ Incorrect (0 pt)</span>';
                        if (evalRes === 'correct' || ans.is_correct || sc >= 1) {
                          badge = '<span class="badge badge-success" style="font-size:0.7rem;">✅ Correct (+1 pt)</span>';
                        } else if (evalRes.includes('minor') || (sc > 0 && sc < 1)) {
                          badge = '<span class="badge badge-warning" style="font-size:0.7rem;">⚠️ Minor (+0.5 pt)</span>';
                        }
                        const qPrompt = ans.question_snapshot || `Question #${qIdx + 1}`;
                        const sAns = ans.student_answer || '(No Answer)';
                        const cAns = ans.correct_answer_snapshot || '—';

                        return `
                          <div style="padding:6px 10px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:6px; font-size:0.8rem;">
                            <div class="d-flex align-center justify-between gap-2 mb-1">
                              <div><strong>Q${qIdx + 1}.</strong> ${escapeHtml(qPrompt)}</div>
                              <div>${badge}</div>
                            </div>
                            <div class="text-xs" style="color:var(--fm-text-secondary, #94a3b8);">
                              <span>Given: <code style="color:#f8fafc;">${escapeHtml(sAns)}</code></span>
                              <span style="margin-left:12px;">Accepted: <code style="color:${TOPSCORE_COLORS.CORRECT};">${escapeHtml(cAns)}</code></span>
                            </div>
                          </div>
                        `;
                      }).join('')}
                    </div>
                  </div>
                </td>
              </tr>
            ` : ''}
          `;
        }).join('');

        tabBody.innerHTML = `
          <table class="table-wrap" style="width:100%;">
            <thead>
              <tr>
                <th class="text-left" style="padding:8px 12px;">Test Title</th>
                <th class="text-center" style="padding:8px 12px;width:120px;">Level</th>
                <th class="text-center" style="padding:8px 12px;width:120px;">Status</th>
                <th class="text-center" style="padding:8px 12px;width:90px;">Best Score</th>
                <th class="text-center" style="padding:8px 12px;width:90px;">Attempts</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="5" class="text-center text-muted p-4">No tests assigned.</td></tr>'}
            </tbody>
          </table>
        `;

        // Bind Accordion clicks
        tabBody.querySelectorAll('.clickable-attempt-row').forEach(tr => {
          tr.onclick = () => {
            const attId = tr.dataset.attId;
            const detailRow = tabBody.querySelector(`#modal-detail-${attId}`);
            const arrow = tabBody.querySelector(`#modal-arrow-${attId}`);
            if (detailRow) {
              const isHidden = detailRow.classList.toggle('hidden');
              if (arrow) arrow.textContent = isHidden ? '▶' : '▼';
            }
          };
        });

        // Bind Remedial Toggle clicks
        tabBody.querySelectorAll('.btn-modal-toggle-rem, .btn-modal-remedial').forEach(btn => {
          btn.onclick = async (e) => {
            e.stopPropagation();
            const attId = btn.dataset.attId;
            const targetRemedial = btn.dataset.setRemedial !== 'false';
            const msg = targetRemedial
              ? 'Mark this score as REMEDIAL (Grade will display with small "R", actual score preserved)?'
              : 'Revert this score to NORMAL?';
            if (!confirm(msg)) return;
            try {
              await labelAttemptRemedial(attId, targetRemedial, 60);
              showToast(targetRemedial ? '🏷️ Score successfully labeled as Remedial.' : '↩️ Remedial status reverted to Normal.', 'success');
              window.showStudentProfileModal(studentId);
            } catch(err) {
              showToast('Failed to update status: ' + err.message, 'error');
            }
          };
        });

      } else if (tabName === 'remediation') {
        const failedTests = (rec.details || []).filter(d => d.bestPct != null && d.bestPct < 60);
        tabBody.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:16px;">
            <div style="padding:14px 18px; border-radius:10px; background:rgba(255,255,255,0.03); border:1px solid var(--fm-border-subtle, rgba(255,255,255,0.08));">
              <div class="fw-700 text-sm mb-1" style="color:var(--fm-text-primary, #f8fafc);">Curriculum Progression Status</div>
              <p class="text-xs text-muted" style="margin:0;">
                Current Level: <strong>${escapeHtml(rec.levelName)}</strong> &bull; Completed: <strong>${rec.completedTests} of ${rec.totalAssigned}</strong> (${rec.completionPct}%)
              </p>
            </div>

            ${failedTests.length > 0 ? `
              <div style="padding:14px 18px; border-radius:10px; background:rgba(${TOPSCORE_COLORS.D_RGB},0.08); border:1px solid rgba(${TOPSCORE_COLORS.D_RGB},0.25);">
                <div class="fw-700 text-sm mb-2" style="color:${TOPSCORE_COLORS.D};">⚠️ Remediation Alerts (${failedTests.length} Modules Below KKM 60%)</div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                  ${failedTests.map(fa => `
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:rgba(0,0,0,0.2); border-radius:6px;">
                      <div>
                        <div class="fw-600 text-sm" style="color:#f8fafc;">${escapeHtml(fa.testTitle)}</div>
                        <div class="text-xs text-muted">Current Best: <strong style="color:${getGradeColorByScore(fa.bestPct)};">${fa.bestPct}%</strong> (KKM Passing: 60%)</div>
                      </div>
                      <button class="btn btn-warning btn-sm" onclick="showToast('Remedial retake permitted for ${escapeHtml(fa.testTitle)}', 'info')">
                        Authorize Retake
                      </button>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : `
              <div style="padding:24px; text-align:center; background:rgba(${TOPSCORE_COLORS.STAR_RGB},0.08); border:1px solid rgba(${TOPSCORE_COLORS.STAR_RGB},0.2); border-radius:10px;">
                <div style="font-size:2rem; margin-bottom:4px;">🎉</div>
                <div class="fw-700" style="color:${TOPSCORE_COLORS.STAR};">No Remediation Required</div>
                <div class="text-xs text-muted" style="margin-top:4px;">All attempted tests meet or exceed academic passing criteria.</div>
              </div>
            `}
          </div>
        `;
      } else if (tabName === 'account') {
        tabBody.innerHTML = `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
            <div style="padding:14px 18px; border-radius:10px; background:rgba(255,255,255,0.03); border:1px solid var(--fm-border-subtle, rgba(255,255,255,0.08));">
              <div class="fw-700 text-xs text-muted uppercase mb-2">Student Authentication</div>
              <div style="margin-bottom:8px;">
                <div class="text-xs text-muted">PIN Security Status:</div>
                <div class="fw-700 text-sm" style="color:${TOPSCORE_COLORS.STAR};">✔️ Configured (4-digit PIN)</div>
              </div>
              <div>
                <div class="text-xs text-muted">Account Status:</div>
                <div class="fw-700 text-sm">${rec.is_active !== false ? 'Active Academic Access' : 'Suspended / Inactive'}</div>
              </div>
            </div>

            <div style="padding:14px 18px; border-radius:10px; background:rgba(255,255,255,0.03); border:1px solid var(--fm-border-subtle, rgba(255,255,255,0.08));">
              <div class="fw-700 text-xs text-muted uppercase mb-2">Academy Enrollment</div>
              <div style="margin-bottom:8px;">
                <div class="text-xs text-muted">Institution &amp; Program:</div>
                <div class="fw-600 text-sm">${escapeHtml(rec.instName)} &bull; ${escapeHtml(rec.progName)}</div>
              </div>
              <div style="margin-bottom:8px;">
                <div class="text-xs text-muted">Cohort Batch:</div>
                <div class="fw-600 text-sm">Batch ${escapeHtml(rec.batchName)} (${escapeHtml(rec.levelName)})</div>
              </div>
              <div>
                <div class="text-xs text-muted">Enrolled Date:</div>
                <div class="fw-600 text-sm">${escapeHtml(rec.joinDate || '—')}</div>
              </div>
            </div>
          </div>
        `;
      }
    };

    renderTab('tests');

    // Tab buttons event listeners
    backdrop.querySelectorAll('.student-profile-tab-btn').forEach(btn => {
      btn.onclick = () => {
        backdrop.querySelectorAll('.student-profile-tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTab(btn.dataset.tab);
      };
    });

    // Close button
    const cleanupKeys = (isReverting = true) => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      if (isReverting && window.location.hash === `#profile-${studentId}`) {
        const fallback = window._lastSectionBeforeProfile || localStorage.getItem('topscore_admin_last_section') || 'students';
        try { window.location.hash = '#' + fallback; } catch (_) {}
      }
    };
    const closeBtn = backdrop.querySelector('#btn-close-profile-modal');
    if (closeBtn) closeBtn.onclick = () => { backdrop.remove(); cleanupKeys(true); };
    backdrop.onclick = (e) => { if (e.target === backdrop) { backdrop.remove(); cleanupKeys(true); } };

    // Keyboard navigation
    const onKey = (e) => {
      if (e.key === 'Escape') {
        backdrop.remove();
        cleanupKeys(true);
      } else if (e.key === 'ArrowLeft' && hasPrev) {
        e.preventDefault();
        backdrop.remove();
        cleanupKeys(false);
        window.showStudentProfileModal(prevId);
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        backdrop.remove();
        cleanupKeys(false);
        window.showStudentProfileModal(nextId);
      }
    };
    window.addEventListener('keydown', onKey);

    // Carousel buttons
    const prevBtn = backdrop.querySelector('#btn-modal-prev-student');
    if (prevBtn && hasPrev) {
      prevBtn.onclick = () => { backdrop.remove(); cleanupKeys(false); window.showStudentProfileModal(prevId); };
    }
    const nextBtn = backdrop.querySelector('#btn-modal-next-student');
    if (nextBtn && hasNext) {
      nextBtn.onclick = () => { backdrop.remove(); cleanupKeys(false); window.showStudentProfileModal(nextId); };
    }

    // Switch to Dossier button
    const openDossierBtn = backdrop.querySelector('#btn-profile-open-dossier');
    if (openDossierBtn) {
      openDossierBtn.onclick = () => {
        backdrop.remove();
        cleanupKeys(false);
        window.showStudentDossierModal(studentId);
      };
    }

    // Edit Student button
    const editStudentBtn = backdrop.querySelector('#btn-profile-edit-student');
    if (editStudentBtn) {
      editStudentBtn.onclick = () => {
        if (typeof window.openStudentFullEdit === 'function') {
          window.openStudentFullEdit(rec._raw || rec, () => renderStudents(area));
        }
      };
    }
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
        const { data: st } = await sb.from('students')
          .select('id, name, gender, birth_date, is_active, photo_url, level_id, batch_id, program_id, institution_id, programs!program_id(name), institutions!institution_id(name), batches!batch_id(name), levels!level_id(name)')
          .eq('id', studentId)
          .single();
        if (st) {
          rec = {
            id: st.id,
            name: st.name,
            displayName: cleanStudentName(st.name),
            gender: st.gender,
            birth_date: st.birth_date,
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

    // Remove existing if open
    const existingP = document.getElementById('student-profile-modal');
    if (existingP) existingP.remove();
    const existingD = document.getElementById('student-dossier-modal');
    if (existingD) existingD.remove();

    if (window.location.hash && !window.location.hash.startsWith('#profile-') && !window.location.hash.startsWith('#dossier-')) {
      window._lastSectionBeforeProfile = window.location.hash.substring(1);
    }
    try {
      if (window.location.hash !== '#profile-' + studentId) {
        window.location.hash = '#profile-' + studentId;
      }
    } catch (_) {}

    const backdrop = document.createElement('div');
    backdrop.id = 'student-dossier-modal';
    backdrop.className = 'student-modal-backdrop animate-fade-in';
    backdrop.style.cssText = 'position:fixed !important;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;background:rgba(9,13,22,0.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;box-sizing:border-box;margin:0;';
    document.body.style.overflow = 'hidden';

    // Fetch attempts for transcript table (stateless & low-egress)
    let studentAttempts = [];
    try {
      const sb = await getSupabase();
      const { data: atts } = await sb.from('attempts')
        .select('id, test_id, score, total_questions, percentage, grade, submitted_at, status, tests(id, title, test_type)')
        .eq('student_id', studentId)
        .in('status', ['submitted', 'auto_submitted', 'evaluated', 'graded'])
        .order('submitted_at', { ascending: true });
      studentAttempts = atts || [];
    } catch(err) {
      console.warn('Error fetching attempts for dossier:', err);
    }

    // Best attempt per test
    const bestByAsm = new Map();
    studentAttempts.forEach(att => {
      const pct = parseFloat(att.percentage || att.score || 0);
      const prev = bestByAsm.get(att.test_id);
      if (!prev || pct > parseFloat(prev.percentage || prev.score || 0)) {
        bestByAsm.set(att.test_id, att);
      }
    });
    const completedRecords = Array.from(bestByAsm.values());
    const totalCorrect = completedRecords.reduce((sum, att) => sum + (Number(att.score) || 0), 0);

    const docRef = `TC-DOS-${studentId.substring(0, 8).toUpperCase()}`;
    const generationDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    const transcriptRows = completedRecords.map((att, idx) => {
      const title = att.tests?.title || 'Curriculum Test';
      const type = att.tests?.test_type || 'TASK';
      const isRem = Boolean(att.is_remedial_unlocked || att.is_remedial);
      const rawPct = att.percentage != null ? Number(att.percentage) : ((att.score || 0) / maxQ) * 100;
      const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;
      const pct = Math.round(effPct);
      const grade = att.grade || ((typeof getGrade === 'function') ? getGrade(effPct) : '—');
      const displayGrade = grade === 'S' || grade === '★' ? '★' : grade;
      const remTag = isRem ? '<sup style="font-size:0.65em;vertical-align:super;">R</sup>' : '';
      const dateStr = att.submitted_at ? new Date(att.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

      return `
        <tr>
          <td style="text-align:center;font-weight:600;color:#64748b;">${idx + 1}</td>
          <td style="font-weight:600;">${escapeHtml(title)}</td>
          <td style="text-align:center;"><span style="font-size:0.7rem;padding:2px 6px;border-radius:4px;background:#f1f5f9;font-weight:700;">${escapeHtml(type)}</span></td>
          <td style="text-align:center;color:#475569;font-size:0.78rem;">${dateStr}</td>
          <td style="text-align:center;font-weight:600;">${pts} / ${maxQ}</td>
          <td style="text-align:center;font-weight:700;color:#0f172a;">${pct}%${remTag}</td>
          <td style="text-align:center;"><strong style="font-size:0.9rem;">${displayGrade}</strong></td>
        </tr>
      `;
    }).join('');

    backdrop.innerHTML = `
      <div class="student-dossier-dialog">
        <!-- Control Toolbar -->
        <div class="dossier-modal-toolbar">
          <div class="d-flex align-center gap-2">
            <span style="font-size:1.2rem;">🖨️</span>
            <div>
              <div class="fw-700 text-sm" style="color:var(--fm-text-primary, #f8fafc);">Official Student Dossier</div>
              <div class="text-xs text-muted">Certified Academic Transcript &amp; Verification Document</div>
            </div>
          </div>
          <div class="d-flex align-center gap-2">
            <button class="btn btn-primary btn-sm" id="btn-print-dossier-sheet" style="display:inline-flex;align-items:center;gap:6px;font-weight:700;">
              <span>🖨️</span> Print / Save as PDF
            </button>
            <button class="btn btn-secondary btn-sm" id="btn-dossier-to-profile" style="display:inline-flex;align-items:center;gap:6px;">
              <span>👤</span> View Profile
            </button>
            <button class="btn-icon" id="btn-close-dossier-modal" style="background:rgba(255,255,255,0.06);border:none;color:var(--clr-text-2);font-size:1.1rem;cursor:pointer;width:32px;height:32px;border-radius:6px;display:flex;align-items:center;justify-content:center;">✕</button>
          </div>
        </div>

        <!-- Scrollable Document Area -->
        <div class="dossier-modal-scroll">
          <div id="student-dossier-sheet" class="student-dossier-sheet">
            <!-- Academy Official Header -->
            <div style="text-align:center;border-bottom:2px solid #0f172a;padding-bottom:12px;margin-bottom:18px;">
              <div style="font-size:1.3rem;font-weight:900;letter-spacing:0.04em;color:#0f172a;text-transform:uppercase;">
                🛡️ TOPS CORE ACADEMIC ADMINISTRATION
              </div>
              <div style="font-size:0.85rem;font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.06em;margin-top:2px;">
                CENTRAL ENGLISH TEST &amp; CERTIFICATION BOARD
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:0.72rem;color:#64748b;font-weight:600;border-top:1px solid #e2e8f0;padding-top:6px;">
                <span>DOCUMENT REF: <strong>${docRef}</strong></span>
                <span>STATUS: <strong style="color:#059669;">OFFICIAL &amp; CERTIFIED</strong></span>
                <span>ISSUED: <strong>${generationDate}</strong></span>
              </div>
            </div>

            <!-- Student Identity & Photo Grid -->
            <div style="display:grid;grid-template-columns:1fr 130px;gap:20px;align-items:start;margin-bottom:20px;">
              <div>
                <table style="width:100%;font-size:0.85rem;line-height:1.65;">
                  <tr>
                    <td style="width:130px;color:#64748b;font-weight:600;">Student Full Name:</td>
                    <td style="font-weight:800;font-size:1.05rem;color:#0f172a;">${escapeHtml(rec.displayName || rec.name)}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;font-weight:600;">Date of Birth / Age:</td>
                    <td style="font-weight:600;">${escapeHtml(rec.birth_date || '—')} (${escapeHtml(rec.ageDisplay || '—')}) &bull; ${escapeHtml(rec.gender || '—')}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;font-weight:600;">Institution:</td>
                    <td style="font-weight:600;">${escapeHtml(rec.instName)}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;font-weight:600;">Academic Program:</td>
                    <td style="font-weight:600;">${escapeHtml(rec.progName)}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;font-weight:600;">Batch &amp; Level:</td>
                    <td style="font-weight:600;">Batch ${escapeHtml(rec.batchName)} &bull; ${escapeHtml(rec.levelName)}</td>
                  </tr>
                  <tr>
                    <td style="color:#64748b;font-weight:600;">Enrollment Date:</td>
                    <td style="font-weight:600;">${escapeHtml(rec.joinDate || '—')}</td>
                  </tr>
                </table>
              </div>

              <!-- 3:4 Student Photo Box -->
              <div style="width:125px;height:166px;border:2px solid #cbd5e1;border-radius:6px;overflow:hidden;background:#f8fafc;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 6px rgba(0,0,0,0.05);position:relative;">
                ${rec.photo_url 
                  ? `<img src="${rec.photo_url}" onerror="this.onerror=null;this.src='${generateAvatarDataUri(rec.displayName || rec.name, rec.gender)}';" style="width:100%;height:100%;object-fit:cover;">` 
                  : `<img src="${generateAvatarDataUri(rec.displayName || rec.name, rec.gender)}" style="width:100%;height:100%;object-fit:cover;">`
                }
                <div style="position:absolute;bottom:0;inset-inline:0;background:rgba(15,23,42,0.8);color:#fff;font-size:0.6rem;text-align:center;padding:2px 0;font-weight:700;letter-spacing:0.04em;">
                  OFFICIAL
                </div>
              </div>
            </div>

            <!-- Certified Summary Box -->
            <div style="background:#f8fafc;border:1px solid #cbd5e1;border-radius:6px;padding:12px 16px;margin-bottom:20px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;text-align:center;">
              <div>
                <div style="font-size:0.65rem;font-weight:700;color:#64748b;text-transform:uppercase;">Overall Grade</div>
                <div style="font-size:1.6rem;font-weight:900;color:#0f172a;line-height:1.1;">${rec.globalGrade || '—'}</div>
              </div>
              <div>
                <div style="font-size:0.65rem;font-weight:700;color:#64748b;text-transform:uppercase;">Mastery Score</div>
                <div style="font-size:1.35rem;font-weight:900;color:#0f172a;line-height:1.2;">${rec.overallScoreStr || '—'}</div>
              </div>
              <div>
                <div style="font-size:0.65rem;font-weight:700;color:#64748b;text-transform:uppercase;">Curriculum Pace</div>
                <div style="font-size:1.15rem;font-weight:800;color:#0f172a;line-height:1.3;">
                  ${rec.completedTests || 0} / ${rec.totalAssigned || 40}
                  <span style="font-size:0.75rem;color:#64748b;font-weight:600;">(${rec.completionPct || 0}%)</span>
                </div>
              </div>
              <div>
                <div style="font-size:0.65rem;font-weight:700;color:#64748b;text-transform:uppercase;">Total Points</div>
                <div style="font-size:1.15rem;font-weight:800;color:${rec.overallColor || 'var(--clr-text-1)'};line-height:1.3;">
                  ${rec.totalEarnedScore ?? totalCorrect} <span style="font-size:0.75rem;color:#64748b;font-weight:600;">pts</span>
                </div>
              </div>
            </div>

            <!-- Test Transcript Section -->
            <div style="margin-bottom:20px;">
              <div style="font-size:0.85rem;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:0.04em;border-left:4px solid #0f172a;padding-left:8px;margin-bottom:8px;">
                Official Test Transcript &amp; Module History
              </div>
              <table class="dossier-table">
                <thead>
                  <tr>
                    <th style="width:30px;text-align:center;">#</th>
                    <th>Test Title</th>
                    <th style="width:70px;text-align:center;">Type</th>
                    <th style="width:95px;text-align:center;">Date</th>
                    <th style="width:85px;text-align:center;">Points</th>
                    <th style="width:65px;text-align:center;">Score</th>
                    <th style="width:55px;text-align:center;">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  ${transcriptRows || '<tr><td colspan="7" style="text-align:center;padding:16px;color:#94a3b8;">No completed tests recorded.</td></tr>'}
                </tbody>
              </table>
            </div>

            <!-- Signatures & Authentication Stamp Block -->
            <div style="display:grid;grid-template-columns:1fr 140px 1fr;gap:20px;align-items:center;padding-top:16px;border-top:1px dashed #cbd5e1;margin-top:16px;">
              <div style="text-align:center;">
                <div style="font-size:0.72rem;color:#64748b;margin-bottom:40px;">Lead Academic Instructor:</div>
                <div style="border-bottom:1px solid #0f172a;width:80%;margin:0 auto 4px;"></div>
                <div style="font-size:0.78rem;font-weight:700;">Academic Operations Officer</div>
              </div>

              <!-- Official Seal Stamp -->
              <div style="border:2px dashed #94a3b8;border-radius:50%;width:84px;height:84px;margin:0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4px;color:#64748b;">
                <span style="font-size:1.05rem;">🛡️</span>
                <span style="font-size:0.52rem;font-weight:800;letter-spacing:0.05em;line-height:1.1;">TOP OFFICE<br>ACADEMIC<br>SEAL</span>
              </div>

              <div style="text-align:center;">
                <div style="font-size:0.72rem;color:#64748b;margin-bottom:40px;">Director of Academic Board:</div>
                <div style="border-bottom:1px solid #0f172a;width:80%;margin:0 auto 4px;"></div>
                <div style="font-size:0.78rem;font-weight:700;">Head of Academic Board</div>
              </div>
            </div>

            <!-- Official Footer Notice -->
            <div style="text-align:center;margin-top:16px;font-size:0.62rem;color:#94a3b8;line-height:1.4;">
              This dossier is an authoritative evaluation record generated by TopsCore LMS.<br>
              Valid without wet signature if verification code matches the central registry.
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    // Event wiring
    const cleanupDossier = (isReverting = true) => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      if (isReverting && (window.location.hash === `#profile-${studentId}` || window.location.hash === `#dossier-${studentId}`)) {
        const fallback = window._lastSectionBeforeProfile || localStorage.getItem('topscore_admin_last_section') || 'students';
        try { window.location.hash = '#' + fallback; } catch (_) {}
      }
    };

    const closeBtn = backdrop.querySelector('#btn-close-dossier-modal');
    if (closeBtn) closeBtn.onclick = () => { backdrop.remove(); cleanupDossier(true); };
    backdrop.onclick = (e) => { if (e.target === backdrop) { backdrop.remove(); cleanupDossier(true); } };

    const toProfileBtn = backdrop.querySelector('#btn-dossier-to-profile');
    if (toProfileBtn) {
      toProfileBtn.onclick = () => {
        backdrop.remove();
        cleanupDossier(false);
        window.showStudentProfileModal(studentId);
      };
    }

    const printBtn = backdrop.querySelector('#btn-print-dossier-sheet');
    if (printBtn) {
      printBtn.onclick = () => {
        window.print();
      };
    }

    const onKey = (e) => {
      if (e.key === 'Escape') {
        backdrop.remove();
        cleanupDossier(true);
      }
    };
    window.addEventListener('keydown', onKey);
  };

  // Initialize DataGrid
  const gridContainer = area.querySelector('#student-grid-container') || document.getElementById('student-grid-container');
  if (!gridContainer) return;

  // ── Per-Class Column Discovery (Phase 214) ──────────────────────────────────
  // Collect all active class IDs that appear in the filtered student set,
  // then build dynamic columns for each.
  const activeClassIdsInGrid = new Set();
  filteredGridData.forEach(row => {
    if (row.perClassFinal) row.perClassFinal.forEach((_, cId) => {
      if (classesMap.has(cId)) activeClassIdsInGrid.add(cId);
    });
  });
  // Also include classes where any student in the batch has progress (enrolled but no attempts yet)
  (allProgress || []).forEach(p => {
    if (p.class_id && classesMap.has(p.class_id)) {
      const studentRow = filteredGridData.find(r => r.id === p.student_id);
      if (studentRow) activeClassIdsInGrid.add(p.class_id);
    }
  });

  // Sort classes by name for consistent column order
  const activeClassColumns = [...activeClassIdsInGrid]
    .map(cId => classesMap.get(cId))
    .filter(Boolean)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Build dynamic per-class DataGrid column definitions: 4 Exam columns matching each theme's total exam points
  const perClassColDefs = activeClassColumns.flatMap(cls => [
    {
      key: `_cls_exam1_${cls.id}`,
      label: 'Exam 1',
      sortable: true,
      align: 'center',
      width: '75px',
      _classId: cls.id,
      render: (row) => {
        const cs = row.perClassFinal?.get(cls.id);
        const pts = cs?.themes?.['A'];
        if (pts == null) return `<span class="text-muted" style="font-size:0.75rem;">—</span>`;
        const formatted = (pts % 1 !== 0) ? pts.toFixed(1) : pts;
        return `<div class="fw-700" style="font-size:0.82rem;color:var(--clr-text-1);" title="Theme A Total Exam Points: ${formatted}">${formatted}<span style="font-size:0.58rem;color:#94a3b8;font-weight:normal;"> pts</span></div>`;
      }
    },
    {
      key: `_cls_exam2_${cls.id}`,
      label: 'Exam 2',
      sortable: true,
      align: 'center',
      width: '75px',
      _classId: cls.id,
      render: (row) => {
        const cs = row.perClassFinal?.get(cls.id);
        const pts = cs?.themes?.['B'];
        if (pts == null) return `<span class="text-muted" style="font-size:0.75rem;">—</span>`;
        const formatted = (pts % 1 !== 0) ? pts.toFixed(1) : pts;
        return `<div class="fw-700" style="font-size:0.82rem;color:var(--clr-text-1);" title="Theme B Total Exam Points: ${formatted}">${formatted}<span style="font-size:0.58rem;color:#94a3b8;font-weight:normal;"> pts</span></div>`;
      }
    },
    {
      key: `_cls_exam3_${cls.id}`,
      label: 'Exam 3',
      sortable: true,
      align: 'center',
      width: '75px',
      _classId: cls.id,
      render: (row) => {
        const cs = row.perClassFinal?.get(cls.id);
        const pts = cs?.themes?.['C'];
        if (pts == null) return `<span class="text-muted" style="font-size:0.75rem;">—</span>`;
        const formatted = (pts % 1 !== 0) ? pts.toFixed(1) : pts;
        return `<div class="fw-700" style="font-size:0.82rem;color:var(--clr-text-1);" title="Theme C Total Exam Points: ${formatted}">${formatted}<span style="font-size:0.58rem;color:#94a3b8;font-weight:normal;"> pts</span></div>`;
      }
    },
    {
      key: `_cls_exam4_${cls.id}`,
      label: 'Exam 4',
      sortable: true,
      align: 'center',
      width: '75px',
      _classId: cls.id,
      render: (row) => {
        const cs = row.perClassFinal?.get(cls.id);
        const pts = cs?.themes?.['D'];
        if (pts == null) return `<span class="text-muted" style="font-size:0.75rem;">—</span>`;
        const formatted = (pts % 1 !== 0) ? pts.toFixed(1) : pts;
        return `<div class="fw-700" style="font-size:0.82rem;color:var(--clr-text-1);" title="Theme D Total Exam Points: ${formatted}">${formatted}<span style="font-size:0.58rem;color:#94a3b8;font-weight:normal;"> pts</span></div>`;
      }
    }
  ]);

  // Build superHeaders: span class-name across its 4 exam sub-columns (Exam 1 / Exam 2 / Exam 3 / Exam 4)
  // Plus span blank headers for the fixed columns before (inst/prog/batch/lvl/name/age/gender)
  // and after (enrolled/status/actions).
  const buildSuperHeaders = () => {
    if (activeClassColumns.length === 0) return null;
    const fixed_before = 4; // level, name, age, gender (checkbox handled automatically by DataGrid)
    const fixed_after = 1;  // actions (enrolled and status removed)
    const sh = [];
    sh.push({ label: '', colSpan: fixed_before, style: 'background:var(--clr-bg-2);border:none;' });
    activeClassColumns.forEach(cls => {
      sh.push({
        label: escapeHtml(cls.name),
        colSpan: 4,
        style: `background:rgba(99,102,241,0.1); border-bottom:2px solid #6366f1; color:#a5b4fc; font-weight:800; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.05em; text-align:center;`
      });
    });
    sh.push({ label: '', colSpan: fixed_after, style: 'background:var(--clr-bg-2);border:none;' });
    return sh;
  };

  studentGrid = new DataGrid({
    container: gridContainer,
    data: filteredGridData,
    pageSize: 50,
    searchKeys: ['levelName', 'displayName', 'name', 'pinDisplay'],
    initialSortKey: 'displayName',
    initialSortAsc: true,
    stickyActionCol: true,
    superHeaders: buildSuperHeaders(),
    summaryRow: (visibleCols, filteredData) => {
      if (!filteredData || filteredData.length === 0) return '';

      // Calculate dynamic average age
      let totalAge = 0;
      let ageCount = 0;
      const today = new Date();
      filteredData.forEach(r => {
        if (r.birth_date) {
          const bd = new Date(r.birth_date);
          if (!isNaN(bd.getTime())) {
            let age = today.getFullYear() - bd.getFullYear();
            const m = today.getMonth() - bd.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
            if (age > 0) {
              totalAge += age;
              ageCount++;
            }
          }
        }
      });
      const avgAgeStr = ageCount > 0 ? `${(totalAge / ageCount).toFixed(1)} yrs` : '—';

      // Calculate gender breakdown
      let mCount = 0;
      let fCount = 0;
      filteredData.forEach(r => {
        const g = (r.gender || '').trim().toLowerCase();
        if (g === 'male' || g === 'm') mCount++;
        else if (g === 'female' || g === 'f') fCount++;
      });
      const genderBreakdown = `${mCount} M · ${fCount} F`;

      // Calculate average points per active class exam
      const classExamAverages = {};
      activeClassColumns.forEach(cls => {
        ['1', '2', '3', '4'].forEach(num => {
          const key = `_cls_exam${num}_${cls.id}`;
          let sum = 0;
          let count = 0;
          filteredData.forEach(r => {
            const val = r[key];
            if (val != null && val >= 0) {
              sum += val;
              count++;
            }
          });
          classExamAverages[key] = count > 0 ? (sum / count).toFixed(1) : null;
        });
      });

      // Calculate total average points across students with completed exams
      let totalPtsSum = 0;
      let ptsCount = 0;
      filteredData.forEach(r => {
        if (r.totalEarnedScore != null && r.totalEarnedScore > 0) {
          totalPtsSum += r.totalEarnedScore;
          ptsCount++;
        }
      });
      const avgPtsStr = ptsCount > 0 ? `${(totalPtsSum / ptsCount).toFixed(1)} pts` : '—';

      let cells = '';
      // Checkbox column
      cells += `<td style="background:#0f172a;text-align:center;border-top:2px solid #38bdf8;color:#38bdf8;font-weight:700;">★</td>`;

      visibleCols.forEach(col => {
        if (col.key === 'levelName') {
          cells += `<td style="background:#0f172a;text-align:center;border-top:2px solid #38bdf8;font-weight:700;color:#38bdf8;font-size:0.75rem;">BATCH AVG</td>`;
        } else if (col.key === 'sortName') {
          cells += `<td style="background:#0f172a;border-top:2px solid #38bdf8;font-weight:700;color:#ffffff;font-size:0.78rem;">★ BATCH AVERAGE (${filteredData.length} Students)</td>`;
        } else if (col.key === 'ageDisplay') {
          cells += `<td style="background:#0f172a;text-align:center;border-top:2px solid #38bdf8;font-weight:700;color:#94a3b8;font-size:0.75rem;">${avgAgeStr}</td>`;
        } else if (col.key === 'gender') {
          cells += `<td style="background:#0f172a;text-align:center;border-top:2px solid #38bdf8;font-weight:700;font-size:0.72rem;color:var(--clr-text-2);white-space:nowrap;">${genderBreakdown}</td>`;
        } else if (col.key && col.key.includes('_cls_exam')) {
          const avgVal = classExamAverages[col.key];
          cells += `<td style="background:#0f172a;text-align:center;border-top:2px solid #38bdf8;font-weight:700;color:#38bdf8;font-size:0.8rem;">${avgVal != null ? `${avgVal} <span style="font-size:0.65rem;color:#94a3b8;font-weight:normal;">pts</span>` : '—'}</td>`;
        } else if (col.label === 'Actions') {
          cells += `<td style="background:#0f172a;text-align:right;border-top:2px solid #38bdf8;font-weight:700;color:#38bdf8;font-size:0.8rem;padding-right:1rem;">Avg: ${avgPtsStr}</td>`;
        } else {
          cells += `<td style="background:#0f172a;text-align:center;border-top:2px solid #38bdf8;color:#94a3b8;">—</td>`;
        }
      });

      return `<tr class="datagrid-summary-row" style="background:#0f172a;font-weight:700;">${cells}</tr>`;
    },
    sortComparator: (sortKey, direction, a, b) => {
      // Active students ALWAYS on top, inactive at bottom
      const aActive = ((a._raw || a).is_active !== false) ? 1 : 0;
      const bActive = ((b._raw || b).is_active !== false) ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;

      if (sortKey === 'displayName' || sortKey === 'sortName' || sortKey === 'instName') {
        const nameA = (a.displayName || a.name || '').toLowerCase();
        const nameB = (b.displayName || b.name || '').toLowerCase();
        return direction === 'desc' ? nameB.localeCompare(nameA) : nameA.localeCompare(nameB);
      }

      // Column-specific comparison for class exams
      if (sortKey.includes('_cls_exam') || sortKey.includes('_cls_pts_')) {
        const scA = a[sortKey] ?? -1;
        const scB = b[sortKey] ?? -1;
        if (scA !== scB) return direction === 'asc' ? scA - scB : scB - scA;
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
    bulkActions: true,
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
          <h3 style="margin:0 0 0.5rem;font-size:1.1rem;">Bulk Edit ${selectedIds.length} Student(s)</h3>
          <p style="color:var(--clr-text-3);font-size:0.85rem;margin:0 0 1.5rem;">Leave fields blank to keep their current values.</p>
          
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

          <h4 style="margin:0 0 0.5rem;font-size:0.95rem;color:var(--clr-text-2);">Quick Actions</h4>
          <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;">
            <button id="bulk-activate" class="btn btn-success" style="flex:1;">&#9989; Activate</button>
            <button id="bulk-deactivate" class="btn btn-secondary" style="flex:1;">&#128683; Deactivate</button>
            <button id="bulk-delete" class="btn btn-danger" style="flex:1;">&#128465; Delete</button>
          </div>
          
          <button id="bulk-cancel" class="btn btn-ghost" style="width:100%;color:var(--clr-text-3);">Cancel</button>
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

        const sb = (await import('../supabase.js?v=5.3.2')).getSupabase ? await (await import('../supabase.js?v=5.3.2')).getSupabase() : null;
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
        const sb = (await import('../supabase.js?v=5.3.2')).getSupabase ? await (await import('../supabase.js?v=5.3.2')).getSupabase() : null;
        if (!sb) { showToast('Cannot connect.', 'error'); return; }
        for (const id of selectedIds) await sb.from('students').update({ is_active: true }).eq('id', id);
        showToast(`Activated ${selectedIds.length} students.`, 'success');
        renderStudents(area);
      };

      overlay.querySelector('#bulk-deactivate').onclick = async () => {
        close();
        const sb = (await import('../supabase.js?v=5.3.2')).getSupabase ? await (await import('../supabase.js?v=5.3.2')).getSupabase() : null;
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
          c.innerHTML = `<div style="background:var(--fm-bg-panel, #0F172A);border:1px solid rgba(239,68,68,0.5);border-radius:12px;padding:2rem;max-width:380px;text-align:center;">
            <div style="font-size:2rem;margin-bottom:0.5rem;">&#9888;&#65039;</div>
            <h3 style="color:#ef4444;margin:0 0 0.5rem;">Delete ${selectedIds.length} Students?</h3>
            <p style="color:var(--clr-text-3);font-size:0.85rem;margin-bottom:1.5rem;">This will soft-delete all selected students. Their history will be preserved.</p>
            <div style="display:flex;gap:0.75rem;justify-content:center;">
              <button id="c-no" class="btn btn-secondary">Cancel</button>
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
    onRowClick: (row) => {
      if (row.remediationPending && typeof window.showStudentProfileModal === 'function') {
        window.showStudentProfileModal(row.id);
        return;
      }
      if (typeof window.openStudentFullEdit === 'function') {
        window.openStudentFullEdit(row, () => renderStudents(area));
      } else if (typeof window.showStudentProfileModal === 'function') {
        window.showStudentProfileModal(row.id);
      } else if (typeof window.openStudentProfile === 'function') {
        window.openStudentProfile(row.id);
      }
    },
    columns: [
      // 1. Level
      {
        key: 'levelName',
        label: 'Level',
        sortable: true,
        align: 'center',
        width: '85px',
        render: (row) => `<span class="text-sm fw-600" style="color:#ffffff;">${escapeHtml(row.levelName || '—')}</span>`
      },
      // 5. Name
      {
        key: 'sortName',
        label: 'Name',
        sortable: true,
        width: '170px',
        render: (row) => {
          return `
            <div class="d-flex align-center gap-3">
              ${row.photo_url ? `<img src="${row.photo_url}" onerror="this.onerror=null;this.src='${generateAvatarDataUri(row.displayName || row.name, row.gender)}';" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid var(--clr-border);">` : `<img src="${generateAvatarDataUri(row.displayName || row.name, row.gender)}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid var(--clr-border);">`}
              <div>
                <div class="fw-600" style="color:var(--clr-text-1);">
                  ${row.displayName}
                  ${row.isOrphaned ? `<span class="badge badge-danger" style="margin-left:6px;font-size:0.65rem;">⚠️ Disconnected</span>` : ''}
                  ${row.remediationPending ? `<span class="badge badge-warning" style="white-space:nowrap;margin-left:8px;font-size:0.75rem;">⚠️ Remediation Pending</span>` : ''}
                </div>
              </div>
            </div>
          `;
        }
      },
      // 6. Age
      {
        key: 'ageDisplay',
        label: 'Age',
        sortable: true,
        align: 'center',
        width: '75px',
        render: (row) => {
          if (!row.birth_date) {
            return `<span title="Date of Birth not set — edit this student to add it" style="display:inline-flex;align-items:center;gap:3px;cursor:help;">
              <span style="font-size:0.75rem;color:#f59e0b;font-weight:700;">⚠</span>
              <span style="font-size:0.68rem;color:#f59e0b;font-weight:600;">No DOB</span>
            </span>`;
          }
          return `<span class="text-sm fw-600">${row.ageDisplay}</span>`;
        }
      },
      // 7. Gender (User requirement: "keterangan gender cukup pakai M/F")
      {
        key: 'gender',
        label: 'Gender',
        sortable: true,
        align: 'center',
        width: '55px',
        render: (row) => {
          const g = (row.gender || '').trim().toLowerCase();
          if (g === 'male' || g === 'm') {
            return `<span class="fw-700" style="color:#38bdf8;font-size:0.8rem;" title="Male">M</span>`;
          }
          if (g === 'female' || g === 'f') {
            return `<span class="fw-700" style="color:#f472b6;font-size:0.8rem;" title="Female">F</span>`;
          }
          return `<span class="text-muted fw-600" style="font-size:0.8rem;">&mdash;</span>`;
        }
      },
      // 8–11. Dynamic Per-Class Columns (4 Theme Exams per active class)
      // Replaces the previous static Score / Grade / PTS / Progress columns per user directive.
      ...(perClassColDefs.length > 0 ? perClassColDefs : [
        {
          key: 'completedTests',
          label: 'Tests',
          sortable: true,
          align: 'center',
          width: '95px',
          render: (row) => `
            <div class="fw-700" style="font-size:0.9rem;color:var(--clr-text-1);">
              ${row.completedTests} <span class="text-xs text-muted" style="font-weight:400;">/ ${row.totalAssigned}</span>
            </div>
          `
        }
      ]),

      {
        label: 'Actions',
        className: 'actions-col',
        align: 'right',
        width: '168px',
        render: (row) => {
          const div = document.createElement('div');
          div.className = 'student-actions-cell actions-col';

          const detailsBtn = document.createElement('button');
          detailsBtn.className = 'btn btn-secondary btn-icon btn-sm student-action-btn';
          detailsBtn.title = 'Test Details (40 Modules Breakdown)';
          detailsBtn.innerHTML = '📝';
          detailsBtn.onclick = (e) => {
            e.stopPropagation();
            if (typeof window.showStudentProgressDetails === 'function') {
              window.showStudentProgressDetails(row.id);
            }
          };
          
          const profileBtn = document.createElement('button');
          profileBtn.className = 'btn btn-secondary btn-icon btn-sm student-action-btn';
          profileBtn.title = 'View Student Profile (Interactive Dashboard)';
          profileBtn.innerHTML = '&#128100;';
          profileBtn.onclick = (e) => {
            e.stopPropagation();
            if (typeof window.showStudentProfileModal === 'function') {
              window.showStudentProfileModal(row.id);
            } else if (typeof window.openStudentProfile === 'function') {
              window.openStudentProfile(row.id);
            }
          };

          const editBtn = document.createElement('button');
          editBtn.className = 'btn btn-secondary btn-icon btn-sm student-action-btn';
          editBtn.title = 'Edit Student';
          editBtn.innerHTML = '✏️';
          editBtn.onclick = (e) => {
            e.stopPropagation();
            if (window.openStudentFullEdit) {
              // Pass row._raw if it exists, otherwise the row itself
              window.openStudentFullEdit(row._raw || row, () => renderStudents(area));
            } else if (window._editRecord) {
              window._editRecord('students', row.id);
            }
          };
          
          const delBtn = document.createElement('button');
          delBtn.className = 'btn btn-danger btn-icon btn-sm student-action-btn';
          delBtn.title = 'Delete Student';
          delBtn.innerHTML = '&#128465;';
          delBtn.onclick = (e) => {
             e.stopPropagation();
             if (window._deleteRecord) window._deleteRecord('students', row.id, row.displayName);
          };
          
          div.appendChild(detailsBtn);
          div.appendChild(profileBtn);
          div.appendChild(editBtn);
          div.appendChild(delBtn);
          return div;
        }
      }
    ]
  });

  // Inject Action Buttons directly into DataGrid Toolbar
  const dgActions = gridContainer.querySelector('.datagrid-actions');
  if (dgActions) {
    const btnWrap = document.createElement('div');
    btnWrap.style.cssText = 'display:flex;gap:0.5rem;align-items:center;margin-left:0.5rem;';
    btnWrap.innerHTML = `
      ${totalDuplicates > 0 ? `<button class="btn btn-warning btn-sm" id="students-grid-merge" style="font-weight:700;font-size:0.75rem;">⚠️ Duplicates (${totalDuplicates})</button>` : ''}
      <button class="btn btn-secondary btn-sm" id="students-grid-export" style="font-size:0.75rem;" title="Export Excel Gradebook">📥 Export</button>
      <button class="btn btn-primary btn-sm" id="students-grid-add" style="font-size:0.75rem;">+ Add Student</button>
    `;
    dgActions.appendChild(btnWrap);
    btnWrap.querySelector('#students-grid-add')?.addEventListener('click', () => {
      if (window._openAddModal) window._openAddModal('students');
      else if (window.openStudentFullEdit) window.openStudentFullEdit({ program_id: currentProgramId }, () => renderStudents(area));
    });
    btnWrap.querySelector('#students-grid-export')?.addEventListener('click', () => {
      if (window.exportStudentsGradebook) window.exportStudentsGradebook();
    });
    btnWrap.querySelector('#students-grid-merge')?.addEventListener('click', () => {
      if (window.openDuplicateStudentsModal) window.openDuplicateStudentsModal();
    });
  }
}

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
    <div class="modal-box" style="max-width:680px;width:95%;max-height:90vh;overflow-y:auto;background:#0f172a;border:1px solid var(--clr-border);border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
      <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:1.25rem 1.5rem;border-bottom:1px solid var(--clr-border);">
        <h3 id="bfe-title" style="margin:0;font-size:1.15rem;font-weight:800;color:var(--clr-text-1);">Edit Student</h3>
        <button class="btn-icon" id="bfe-close" title="Close" style="background:transparent;border:none;color:var(--clr-text-2);font-size:1.2rem;cursor:pointer;">&#10005;</button>
      </div>
      <div id="bfe-body" style="padding:1.5rem;"></div>
      <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:.75rem;padding:1rem 1.5rem;border-top:1px solid var(--clr-border);">
        <button class="btn btn-ghost" id="bfe-cancel">Cancel</button>
        <button class="btn btn-primary" id="bfe-save">Save Changes</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function handleGuardClose(modal, onDiscard) {
  if (window.isProfileDirty) {
    const saveIt = confirm("⚠️ You have unsaved profile changes.\\n\\nClick OK to SAVE and leave, or CANCEL to discard changes and leave.");
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
      adminFetchAll('progress', 'id, student_id, class_id, level_id, status'),
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
  const initialBirth = draftData?.birth_date ?? (student?.birth_date || '');
  const initialPin = draftData?.pin || '';
  const initialBatchId = draftData?.batch_id ?? (student?.batch_id || '');
  const initialLevelId = draftData?.level_id ?? (student?.level_id || '');
  const initialActive = draftData?.is_active ?? (student?.is_active !== false);
  let currentPhotoUrl = draftData?.photo_url ?? (student?.photo_url || '');

  body.innerHTML = `
    <div style="display:flex;gap:1.5rem;flex-wrap:wrap;">
      <!-- 3:4 Avatar Center-Crop Upload (Left) -->
      <div style="flex:1;min-width:140px;max-width:180px;text-align:center;">
        <label class="form-label" style="display:block;margin-bottom:0.5rem;font-size:0.8rem;text-transform:uppercase;color:var(--clr-text-3);">3:4 Avatar</label>
        <div style="width:120px;height:160px;margin:0 auto;border-radius:8px;overflow:hidden;border:2px solid var(--clr-border);background:rgba(0,0,0,0.25);position:relative;">
          <img id="bfe-avatar-preview" src="${getBustedAvatarUrl(currentPhotoUrl)}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;" />
          <div id="bfe-avatar-loading" class="hidden" style="position:absolute;inset:0;background:rgba(15,23,42,0.95);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;">
            <div class="spinner" style="width:20px;height:20px;"></div>
          </div>
        </div>
        <div style="margin-top:0.75rem;">
          <label for="bfe-avatar-file" class="btn btn-secondary btn-xs" style="cursor:pointer;font-size:0.75rem;">
            📸 Upload (3:4)
          </label>
          <input type="file" id="bfe-avatar-file" accept="image/*" style="display:none;" />
          <div class="text-xs text-muted mt-1" style="font-size:0.7rem;">240x320 WebP &bull; 35% Top Bias</div>
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
            <option value="male" ${initialGender === 'male' ? 'selected' : ''}>Mr. (Male)</option>
            <option value="female" ${initialGender === 'female' ? 'selected' : ''}>Miss (Female)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Date of Birth <span style="color:#f87171;font-weight:800;" title="Required">*</span></label>
          <input type="date" class="form-control" id="bfe-birth" value="${escHtml(initialBirth)}" required>
          <div style="font-size:0.72rem;color:#94a3b8;margin-top:3px;">Required — used to calculate student age in the roster.</div>
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
              <h4 style="margin:0 0 0.75rem 0; font-size:0.95rem; display:flex; justify-content:space-between; align-items:center;">
                <span>📈 Manual Level Assignment</span>
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
      batch_id: document.getElementById('bfe-batch').value,
      pin: document.getElementById('bfe-pin').value,
      is_active: document.getElementById('bfe-active').value === 'true',
      level_id: document.getElementById('bfe-level')?.value || null
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(currentDraft));
    } catch (e) { /* ignore */ }
  };

  ['bfe-name', 'bfe-gender', 'bfe-birth', 'bfe-batch', 'bfe-level', 'bfe-pin', 'bfe-active'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateDraft);
    document.getElementById(id)?.addEventListener('change', updateDraft);
  });
  
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
  document.getElementById('bfe-close').onclick = () => handleGuardClose(modal, () => localStorage.removeItem(draftKey));
  document.getElementById('bfe-cancel').onclick = () => handleGuardClose(modal, () => localStorage.removeItem(draftKey));

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
      birth_date:     document.getElementById('bfe-birth').value  || null,
      batch_id:       selectedBatchId,
      program_id:     selectedProgramId,
      institution_id: selectedInstitutionId,
      level_id:       document.getElementById('bfe-level')?.value   || null,
      is_active:      document.getElementById('bfe-active').value === 'true',
      photo_url:      currentPhotoUrl || null,
    };
    const pinVal = document.getElementById('bfe-pin').value.trim();
    if (pinVal) payload.pin_hash = await sha256(pinVal);

    newSaveBtn.disabled = true;
    newSaveBtn.textContent = 'Saving...';
    try {
      const sb = await getSupabase();
      let finalStudentId = student?.id;
      
      if (finalStudentId) {
        await adminUpdate('students', finalStudentId, payload);
        showToast('Student updated successfully.', 'success');
      } else {
        // Pre-check for duplicate student in the same program
        const normNew = normalizeStudentNameForMatch(name);
        let dupQ = sb.from('students').select('id, name').is('deleted_at', null);
        if (selectedProgramId) dupQ = dupQ.eq('program_id', selectedProgramId);
        const { data: existingRows } = await dupQ;
        const dupMatch = (existingRows || []).find(r => normalizeStudentNameForMatch(r.name) === normNew);
        if (dupMatch) {
          showToast(`Student "${dupMatch.name}" already exists in this program. Cannot add duplicate.`, 'warning');
          newSaveBtn.disabled = false;
          newSaveBtn.textContent = 'Save Changes';
          return;
        }

        const created = await adminInsert('students', payload);
        finalStudentId = created.id;
        showToast('Student created successfully.', 'success');
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
  if (typeof window.showStudentProfileModal === 'function') {
    return window.showStudentProfileModal(studentId);
  }
}

export async function showStudentDossierModal(studentId) {
  if (typeof window.showStudentDossierModal === 'function') {
    return window.showStudentDossierModal(studentId);
  }
}


