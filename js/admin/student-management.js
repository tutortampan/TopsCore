import { adminFetchAll, formatStudentName, cleanStudentName, normalizeStudentNameForMatch, adminSoftDelete, clearAdminCache, adminInsert, adminUpdate, sha256, toLevelLetter, labelAttemptRemedial } from '../api.js?v=5.3.2';
import { getSupabase } from '../supabase.js?v=5.3.2';
import { getGrade, showToast } from '../app.js?v=5.3.2';
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
    const [rawData, allAttempts, allLevels, allProgress, allPrograms, allBatches, allAssignments, allTests] = await Promise.all([
    adminFetchAll('students', 'id, name, gender, birth_date, photo_url, photo_status, is_active, created_at, deleted_at, level_id, batch_id, program_id, institution_id, programs!program_id(name, is_active), institutions!institution_id(name, is_active), batches!batch_id(name, is_active, current_level_id)'),
    adminFetchAll('attempts', 'id, student_id, test_id, status, score, total_questions, percentage, effective_score, created_at, is_remedial_unlocked, tests(test_type, title, class_id)'),
    adminFetchAll('levels', 'id, name, level_number'),
    adminFetchAll('progress', 'id, student_id, class_id, unlocked_level, highest_score'),
    adminFetchAll('programs', 'id, name, institution_id, is_active'),
    adminFetchAll('batches', 'id, name, program_id, is_active, current_level_id'),
    adminFetchAll('assignments', 'student_id, batch_id, test_id').catch(() => []),
    adminFetchAll('tests', 'id, title, level_id, levels(name, level_number)').catch(() => [])
  ]);
  const levelsMap = new Map();
  (allLevels || []).forEach(l => levelsMap.set(l.id, l));

  const testsMap = new Map((allTests || []).map(a => [a.id, a]));

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

      studentDetails.push({
        testId,
        testTitle: test.title,
        levelNumber: test.levels?.level_number || 1,
        levelName: test.levels?.name || 'Unknown',
        is_completed: isCompleted,
        is_in_progress: isInProgress,
        bestScore,
        bestPct,
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
      const isRem = Boolean(a.is_remedial_unlocked);
      const maxRemPts = tq * 0.6;
      const effPoints = isRem ? Math.min(sc, maxRemPts) : sc;
      const effPct = isRem ? Math.min(rawPct, 60.0) : (a.effective_score != null ? Number(a.effective_score) : rawPct);

      if (!bestByAsm.has(asmId)) {
        bestByAsm.set(asmId, { score: effPoints, totalQuestions: tq, percentage: effPct, attempt: a });
      } else {
        const existing = bestByAsm.get(asmId);
        if (effPoints > existing.score || (effPoints === existing.score && effPct > existing.percentage)) {
          bestByAsm.set(asmId, { score: effPoints, totalQuestions: tq, percentage: effPct, attempt: a });
        }
      }
    });

    const completedTestsCount = Math.max(bestByAsm.size, completedAssignedCount);
    const completionPct = totalAssigned > 0 ? Math.round((completedTestsCount / totalAssigned) * 100) : 0;
    const latestAttempt = studentAttempts.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
    
    // Authoritative global grade & score across completed tests (Rule 2.8 & 2.10)
    let overallScoreStr = '—';
    let globalGrade = '—';
    let overallColor = 'rgba(255,255,255,0.4)';
    let overallPct = -1;

    if (bestByAsm.size > 0) {
      let sumPercentages = 0;

      bestByAsm.forEach(best => {
        sumPercentages += Number(best.percentage || 0);
      });

      overallPct = Math.round(sumPercentages / bestByAsm.size);

      if (overallPct >= 0) {
        overallScoreStr = `${overallPct}%`;
        const g = typeof getGrade === 'function' ? getGrade(overallPct) : (
          overallPct >= 100 ? '★' :
          overallPct >= 90 ? 'A' :
          overallPct >= 80 ? 'B' :
          overallPct >= 60 ? 'C' :
          overallPct >= 30 ? 'D' : 'E'
        );
        globalGrade = g;
        const cMap = { '★': '#22C55E', 'S': '#22C55E', 'A': '#10B981', 'B': '#84CC16', 'C': '#EAB308', 'D': '#F97316', 'E': '#EF4444' };
        overallColor = cMap[g] || 'rgba(255,255,255,0.4)';
      }
    }
    const hasRemedial = Array.from(bestByAsm.values()).some(b => Boolean(b.attempt?.is_remedial_unlocked));


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

    return {
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
      email: s.email || '—'
    };
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
      return s.batches ? s.batches.is_active !== false : true;
    } else if (currentBatchStatus === 'inactive') {
      return s.batches ? s.batches.is_active === false : false;
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

  // Elevate Student KPI tabs to topbar
  if (window.setTopbarTabs) {
    const activeCount = programStudents.filter(s => s.batches ? s.batches.is_active !== false : true).length;
    const totalAttemptCount = programStudents.reduce((sum, s) => sum + (s.completedTests || 0), 0);
    window.setTopbarTabs([
      { id: 'enrolled', icon: '👥', label: `${window._selectedProgramName || 'Program'} Students`, val: programStudents.length },
      { id: 'active', icon: '🟢', label: 'Active Students', val: activeCount, valColor: 'var(--clr-success, #4ade80)' },
      { id: 'completed', icon: '📝', label: 'Completed Modules', val: totalAttemptCount, valColor: 'var(--clr-accent-1, #38bdf8)' },
      { id: 'remediation', icon: '⚠️', label: 'Need Remediation', val: remediationPendingCount, valColor: remediationPendingCount > 0 ? 'var(--clr-warning, #fbbf24)' : '' }
    ], null, null);
  }

  area.innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Students — ${escapeHtml(currentProgram ? currentProgram.name : 'Roster')} <span class="count-chip">${filteredGridData.length} ${currentBatchStatus === 'active' ? 'Active' : 'Total'}</span>
        ${remediationPendingCount > 0 ? `<span class="badge badge-warning" style="margin-left:8px; font-size: 0.9rem;">⚠️ ${remediationPendingCount} Awaiting Remediation</span>` : ''}
        </h2>
        <p class="section-subtitle">Student roster for <strong>${escapeHtml(currentProgram ? currentProgram.name : 'Program')}</strong> with enrollment, curriculum test pacing, global scores, and grade records</p>
      </div>
      <div class="d-flex gap-2">
        ${totalDuplicates > 0 ? `<button class="btn btn-warning btn-sm" id="students-merge-shortcut" style="font-weight:700;">⚠️ Resolve Duplicates (${totalDuplicates})</button>` : ''}
        <button class="btn btn-primary btn-sm" id="students-add-shortcut">+ Add Student</button>
      </div>
    </div>

    ${window._filterBatchId ? `
      <div class="mb-4 p-3 rounded d-flex align-center justify-between" style="background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.4);color:#93c5fd;">
        <div class="d-flex align-center gap-2">
          <span style="font-size:1.2rem;">&#128101;</span>
          <span>Filtered by Batch: <strong>${window._filterBatchName || 'Selected Batch'}</strong> (${filteredGridData.length} students)</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="window._filterBatchId=null; window._filterBatchName=null; window._filterBatchStatus='all'; window.loadSection('students');" style="text-decoration:underline;color:#93c5fd;">
          Show All Batches
        </button>
      </div>
    ` : ''}

    ${totalDuplicates > 0 ? `
      <div class="mb-4 p-3 rounded d-flex align-center justify-between" style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);color:#fef3c7;">
        <div class="d-flex align-center gap-3">
          <span style="font-size:1.4rem;">&#9888;&#65039;</span>
          <div>
            <div class="fw-700 text-sm">Detected ${totalDuplicates} Duplicate Student Profiles</div>
            <div class="text-xs text-muted" style="color:rgba(255,255,255,0.85)!important;">
              Found ${duplicateGroups.length} groups of students with identical names in the same class. Merge them to unify their Test progress.
            </div>
          </div>
        </div>
        <button class="btn btn-warning btn-sm" id="btn-banner-merge-duplicates" style="background:#f59e0b;color:#000;font-weight:700;border:none;">
          &#9888;&#65039; Resolve All Duplicates
        </button>
      </div>
    ` : ''}

    <div class="students-filter-bar-slim">
      <span style="font-size: 0.75rem; color: var(--fm-text-secondary, #94a3b8); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; display: flex; align-items: center; gap: 4px; margin-right: 4px;">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--fm-accent-tactical, #6366f1);"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
        Filters:
      </span>
      <select id="students-filter-batch-status" class="form-input-slim">
        <option value="active" ${currentBatchStatus === 'active' ? 'selected' : ''}>Status: Active Batches</option>
        <option value="all" ${currentBatchStatus === 'all' ? 'selected' : ''}>Status: All Batches</option>
        <option value="inactive" ${currentBatchStatus === 'inactive' ? 'selected' : ''}>Status: Inactive / Past</option>
      </select>
      <select id="students-filter-batch" class="form-input-slim">
        <option value="">Batch: All Active</option>
        ${(programBatches || [])
          .filter(b => currentBatchStatus === 'all' ? true : (currentBatchStatus === 'inactive' ? b.is_active === false : b.is_active !== false))
          .map(b => `<option value="${b.id}" data-active="${b.is_active !== false}" ${window._filterBatchId === b.id ? 'selected' : ''}>Batch: ${escapeHtml(b.name)}${b.is_active === false ? ' (Past)' : ''}</option>`).join('')}
      </select>
      ${(currentBatchStatus !== 'active' || window._filterBatchId) ? `
        <button id="students-filter-reset" class="btn btn-ghost btn-sm" style="padding: 2px 8px; height: 26px; font-size: 0.72rem; color: var(--fm-text-secondary, #94a3b8); margin-left: auto;" title="Reset filters">✕ Reset</button>
      ` : ''}
    </div>
    <div id="student-grid-container" class="card" style="padding:1rem;"></div>
  `;

  // Bind Buttons
  const addBtn = document.getElementById('students-add-shortcut');
  if (addBtn) addBtn.onclick = () => window.openStudentFullEdit({ program_id: currentProgramId }, () => window.loadSection('students'));
  
  const mergeBtn = document.getElementById('students-merge-shortcut');
  if (mergeBtn) mergeBtn.onclick = () => { if (window.openDuplicateStudentsModal) window.openDuplicateStudentsModal(); };
  
  const mergeBannerBtn = document.getElementById('btn-banner-merge-duplicates');
  if (mergeBannerBtn) mergeBannerBtn.onclick = () => { if (window.openDuplicateStudentsModal) window.openDuplicateStudentsModal(); };
  
  // Global Export Function (callable from dedicated Import Students tab)
  window.exportStudentsGradebook = () => {
    if (!filteredGridData || !filteredGridData.length) {
      showToast('No students to export.', 'info');
      return;
    }
    
    const headers = ['Institution', 'Program', 'Batch', 'Current Level', 'Student Name', 'Test Type', 'Score (%)', 'Grade', 'Status', 'Remediation Granted'];
    const rows = filteredGridData.map(s => {
      return {
        'Institution': s.instName || '—',
        'Program': s.progName || '—',
        'Batch': s.batchName || '—',
        'Current Level': s.levelName || '—',
        'Student Name': s.displayName || s.name || '—',
        'Test Type': s.remediationPending ? 'EXAM' : '—',
        'Score (%)': s.overallScoreStr || '—',
        'Grade': s.globalGrade || '—',
        'Status': s.is_active ? 'Active' : 'Inactive',
        'Remediation Granted': s.remediationPending ? 'No' : (s.overallScoreStr !== '—' ? 'Yes/NA' : '—')
      };
    });
    
    try {
      const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
      ws['!cols'] = [
        { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 15 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Gradebook");
      XLSX.writeFile(wb, "Gradebook_Export.xlsx");
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

    const detailsRows = (rec.details || []).map(r => {
      const attId = r.attemptId;
      const isRem = Boolean(r.is_remedial_unlocked);
      const scoreClickAttr = attId ? `onclick="window.open('result.html?attempt_id=${encodeURIComponent(attId)}&admin=1', '_blank'); event.stopPropagation();" style="cursor:pointer; text-decoration:underline;" title="View Exam Result Sheet"` : '';
      
      let actionHtml = '<span class="text-muted text-xs">—</span>';
      if (r.is_completed && attId) {
        if (isRem) {
          actionHtml = `
            <div style="display:inline-flex; align-items:center; gap:4px;">
              <span class="badge" style="font-size:0.65rem; background:rgba(245,158,11,0.2); color:#fbbf24; border:1px solid #f59e0b; padding:2px 6px;">REMEDIAL</span>
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

      return `
        <tr>
          <td class="fw-600 text-sm" style="color:var(--clr-text-1);">${escapeHtml(r.testTitle || '—')}</td>
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
            <span class="fw-700 text-sm" ${scoreClickAttr} style="color:${r.bestPct != null ? (r.bestPct >= 100 ? '#22C55E' : r.bestPct >= 90 ? '#10B981' : r.bestPct >= 80 ? '#84CC16' : r.bestPct >= 60 ? '#EAB308' : r.bestPct >= 30 ? '#F97316' : '#EF4444') : 'var(--clr-text-3)'};">
              ${r.bestPct != null ? `${r.bestPct}%${isRem ? '<sup style="font-size:0.7em;font-weight:900;margin-left:2px;">R</sup>' : ''}` : '—'}
            </span>
          </td>
          <td class="text-center">
            ${actionHtml}
          </td>
        </tr>
      `;
    }).join('');

    modal.innerHTML = `
      <div style="background:var(--fm-bg-panel, #0F172A);border:1px solid var(--clr-border);border-radius:14px;width:100%;max-width:820px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 40px rgba(0,0,0,0.6);overflow:hidden;">
        <div style="padding:1.25rem 1.5rem;border-bottom:1px solid var(--clr-border);display:flex;justify-content:space-between;align-items:center;background:rgba(255,255,255,0.02);">
          <div class="d-flex align-center gap-3">
            ${rec.photo_url 
              ? `<img src="${rec.photo_url}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid var(--clr-border);">` 
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
              <div class="text-xs text-muted">Overall Score</div>
              <div class="fw-700" style="font-size:1.25rem;color:${rec.overallColor || 'var(--clr-text-1)'};">${rec.overallScoreStr}</div>
            </div>
            <div style="flex:1;min-width:90px;">
              <div class="text-xs text-muted">Global Grade</div>
              <div style="margin-top:2px;">
                <span class="badge" style="${rec.globalGrade === 'S' || rec.globalGrade === '★' ? 'background:rgba(34,197,94,0.18);color:#22C55E;font-weight:900;box-shadow:0 0 10px rgba(34,197,94,0.45);border:1px solid #22C55E;' : `background:${rec.overallColor};color:#000;font-weight:800;`}font-size:0.85rem;padding:3px 10px;">${(rec.globalGrade === 'S' || rec.globalGrade === '★') ? '★' : rec.globalGrade}</span>
              </div>
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
          <table class="table-wrap" style="width:100%;">
            <thead>
              <tr>
                <th class="text-left" style="padding:8px 12px;">Test Title</th>
                <th class="text-center" style="padding:8px 12px;width:130px;">Level</th>
                <th class="text-center" style="padding:8px 12px;width:120px;">Status</th>
                <th class="text-center" style="padding:8px 12px;width:100px;">Best Score</th>
                <th class="text-center" style="padding:8px 12px;width:130px;">Action / Remedial</th>
              </tr>
            </thead>
            <tbody>
              ${detailsRows || '<tr><td colspan="5" class="text-center text-muted p-4">No tests assigned.</td></tr>'}
            </tbody>
          </table>
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
            await window.loadSection('students');
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

    const backdrop = document.createElement('div');
    backdrop.id = 'student-profile-modal';
    backdrop.className = 'student-modal-backdrop animate-fade-in';
    backdrop.style.cssText = 'position:fixed !important;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;background:rgba(9,13,22,0.88);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;box-sizing:border-box;margin:0;';
    document.body.style.overflow = 'hidden';

    const genderIcon = (rec.gender || '').toLowerCase().startsWith('m') ? '♂️' : '♀️';
    const photoContent = rec.photo_url
      ? `<img src="${rec.photo_url}" alt="Student Photo" style="width:100%;height:100%;object-fit:cover;">`
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
                <span class="badge badge-info" style="font-size: 0.7rem;">${genderIcon} ${escapeHtml(rec.gender || '—')}</span>
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
            <div class="profile-kpi-val" style="color: ${rec.overallColor || 'var(--fm-text-primary, #f8fafc)'}; ${(rec.globalGrade === 'S' || rec.globalGrade === '★') ? 'filter:drop-shadow(0 0 8px rgba(34,197,94,0.6)); font-weight:900;' : ''}">${rec.overallScoreStr || '—'}</div>
          </div>
          <div class="profile-kpi-card">
            <div class="profile-kpi-label">Curriculum Done</div>
            <div class="profile-kpi-val" style="color: #38bdf8; font-size: 1.15rem;">
              ${rec.completedTests || 0} / ${rec.totalAssigned || 40}
              <span style="font-size: 0.75rem; color: var(--fm-text-muted); font-weight: 600;">(${rec.completionPct || 0}%)</span>
            </div>
          </div>
          <div class="profile-kpi-card" style="border-left: 3px solid #10b981;">
            <div class="profile-kpi-label" style="color: #10b981;">Correct Answers</div>
            <div class="profile-kpi-val" id="profile-stat-correct" style="color: #10b981;">...</div>
          </div>
          <div class="profile-kpi-card" style="border-left: 3px solid #f59e0b;">
            <div class="profile-kpi-label" style="color: #f59e0b;">Minor Errors</div>
            <div class="profile-kpi-val" id="profile-stat-minor" style="color: #f59e0b;">...</div>
          </div>
          <div class="profile-kpi-card" style="border-left: 3px solid #ef4444;">
            <div class="profile-kpi-label" style="color: #ef4444;">Incorrect</div>
            <div class="profile-kpi-val" id="profile-stat-wrong" style="color: #ef4444;">...</div>
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
                <span class="fw-700 text-sm" style="color:${d.bestPct != null ? (d.bestPct >= 80 ? '#10b981' : d.bestPct >= 60 ? '#84cc16' : d.bestPct >= 40 ? '#eab308' : d.bestPct >= 20 ? '#f97316' : '#ef4444') : 'var(--clr-text-3)'};">
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
                              <span style="margin-left:12px;">Accepted: <code style="color:#10b981;">${escapeHtml(cAns)}</code></span>
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
              <div style="padding:14px 18px; border-radius:10px; background:rgba(245,158,11,0.08); border:1px solid rgba(245,158,11,0.25);">
                <div class="fw-700 text-sm mb-2" style="color:#fbbf24;">⚠️ Remediation Alerts (${failedTests.length} Modules Below KKM 60%)</div>
                <div style="display:flex; flex-direction:column; gap:8px;">
                  ${failedTests.map(fa => `
                    <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; background:rgba(0,0,0,0.2); border-radius:6px;">
                      <div>
                        <div class="fw-600 text-sm" style="color:#f8fafc;">${escapeHtml(fa.testTitle)}</div>
                        <div class="text-xs text-muted">Current Best: <strong style="color:#ef4444;">${fa.bestPct}%</strong> (KKM Passing: 60%)</div>
                      </div>
                      <button class="btn btn-warning btn-sm" onclick="showToast('Remedial retake permitted for ${escapeHtml(fa.testTitle)}', 'info')">
                        Authorize Retake
                      </button>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : `
              <div style="padding:24px; text-align:center; background:rgba(16,185,129,0.08); border:1px solid rgba(16,185,129,0.2); border-radius:10px;">
                <div style="font-size:2rem; margin-bottom:4px;">🎉</div>
                <div class="fw-700" style="color:#10b981;">No Remediation Required</div>
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
                <div class="fw-700 text-sm" style="color:#10b981;">✔️ Configured (4-digit PIN)</div>
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
    const cleanupKeys = () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
    const closeBtn = backdrop.querySelector('#btn-close-profile-modal');
    if (closeBtn) closeBtn.onclick = () => { backdrop.remove(); cleanupKeys(); };
    backdrop.onclick = (e) => { if (e.target === backdrop) { backdrop.remove(); cleanupKeys(); } };

    // Keyboard navigation
    const onKey = (e) => {
      if (e.key === 'Escape') {
        backdrop.remove();
        cleanupKeys();
      } else if (e.key === 'ArrowLeft' && hasPrev) {
        e.preventDefault();
        backdrop.remove();
        cleanupKeys();
        window.showStudentProfileModal(prevId);
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        backdrop.remove();
        cleanupKeys();
        window.showStudentProfileModal(nextId);
      }
    };
    window.addEventListener('keydown', onKey);

    // Carousel buttons
    const prevBtn = backdrop.querySelector('#btn-modal-prev-student');
    if (prevBtn && hasPrev) {
      prevBtn.onclick = () => { backdrop.remove(); cleanupKeys(); window.showStudentProfileModal(prevId); };
    }
    const nextBtn = backdrop.querySelector('#btn-modal-next-student');
    if (nextBtn && hasNext) {
      nextBtn.onclick = () => { backdrop.remove(); cleanupKeys(); window.showStudentProfileModal(nextId); };
    }

    // Switch to Dossier button
    const openDossierBtn = backdrop.querySelector('#btn-profile-open-dossier');
    if (openDossierBtn) {
      openDossierBtn.onclick = () => {
        backdrop.remove();
        cleanupKeys();
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
                  ? `<img src="${rec.photo_url}" style="width:100%;height:100%;object-fit:cover;">` 
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
                <div style="font-size:1.15rem;font-weight:800;color:#059669;line-height:1.3;">
                  ${totalCorrect} <span style="font-size:0.75rem;color:#64748b;font-weight:600;">pts</span>
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
    const cleanupDossier = () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };

    const closeBtn = backdrop.querySelector('#btn-close-dossier-modal');
    if (closeBtn) closeBtn.onclick = () => { backdrop.remove(); cleanupDossier(); };
    backdrop.onclick = (e) => { if (e.target === backdrop) { backdrop.remove(); cleanupDossier(); } };

    const toProfileBtn = backdrop.querySelector('#btn-dossier-to-profile');
    if (toProfileBtn) {
      toProfileBtn.onclick = () => {
        backdrop.remove();
        cleanupDossier();
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
        cleanupDossier();
      }
    };
    window.addEventListener('keydown', onKey);
  };

  // Initialize DataGrid
  const gridContainer = area.querySelector('#student-grid-container') || document.getElementById('student-grid-container');
  if (!gridContainer) return;

  studentGrid = new DataGrid({
    container: gridContainer,
    data: filteredGridData,
    pageSize: 50,
    searchKeys: ['instName', 'progName', 'batchName', 'levelName', 'displayName', 'pinDisplay'],
    initialSortKey: 'instName',
    initialSortAsc: true,
    stickyActionCol: true,
    sortComparator: (sortKey, direction, a, b) => {
      // Active students ALWAYS on top, inactive at bottom
      const aActive = ((a._raw || a).is_active !== false) ? 1 : 0;
      const bActive = ((b._raw || b).is_active !== false) ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;

      // When sorting by instName, use full hierarchy
      if (sortKey === 'instName') {
        const cmp = compareStudentsHierarchical(a, b);
        return direction === 'desc' ? -cmp : cmp;
      }

      // Column-specific comparison
      if (sortKey === 'completedTests') {
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
        const rank = { 'S': 7, 'A': 6, 'B': 5, 'C': 4, 'D': 3, 'E': 2, 'F': 1 };
        const rA = rank[a.globalGrade] || 0;
        const rB = rank[b.globalGrade] || 0;
        if (rA !== rB) return direction === 'asc' ? rA - rB : rB - rA;
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
        if (typeof window.loadSection === 'function') window.loadSection('students'); else renderStudents(area);
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
      // 1. Institution
      {
        key: 'instName',
        label: 'Institution',
        sortable: true,
        width: '135px',
        render: (row) => `<div class="text-sm fw-600" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:130px;" title="${escapeHtml(row.instName)}">${escapeHtml(row.instName)}</div>`
      },
      // 2. Program
      {
        key: 'progName',
        label: 'Program',
        sortable: true,
        width: '100px',
        render: (row) => `<div class="text-sm fw-600" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:95px;color:var(--clr-text-2, #cbd5e1);" title="${escapeHtml(row.progName)}">${escapeHtml(row.progName)}</div>`
      },
      // 3. Batch
      {
        key: 'batchName',
        label: 'Batch',
        sortable: true,
        align: 'center',
        width: '75px',
        render: (row) => `<span class="text-sm fw-600" style="color:#ffffff;">${escapeHtml(row.batchName || '—')}</span>`
      },
      // 4. Level
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
              ${row.photo_url ? `<img src="${row.photo_url}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid var(--clr-border);">` : `<img src="${generateAvatarDataUri(row.displayName || row.name, row.gender)}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid var(--clr-border);">`}
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
        width: '65px',
        render: (row) => `<span class="text-sm fw-600">${row.ageDisplay}</span>`
      },
      // 7. Gender
      {
        key: 'gender',
        label: 'Gender',
        sortable: true,
        align: 'center',
        width: '80px',
        render: (row) => (row.gender || '').toLowerCase() === 'male'
          ? `<span class="fw-600" style="color:#22c55e;font-size:0.8rem;">&#9794; Male</span>`
          : (row.gender || '').toLowerCase() === 'female'
          ? `<span class="fw-600" style="color:#f472b6;font-size:0.8rem;">&#9792; Female</span>`
          : `<span class="text-muted fw-600" style="font-size:0.8rem;">&mdash;</span>`
      },
      // 8. Tests (Completed / Assigned)
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
      },
      // 9. Score (Overall %)
      {
        key: 'overallScoreStr',
        label: 'Score',
        sortable: true,
        align: 'center',
        width: '70px',
        render: (row) => `<span class="fw-700" style="font-size:0.92rem;color:${row.overallColor || 'var(--clr-text-1)'};">${row.overallScoreStr}</span>`
      },
      // 10. Grade
      {
        key: 'globalGrade',
        label: 'Grade',
        sortable: true,
        align: 'center',
        width: '65px',
        render: (row) => row.globalGrade !== '-' && row.globalGrade !== '—' 
          ? ((row.globalGrade === 'S' || row.globalGrade === '★')
            ? `<span class="badge" style="background:rgba(34,197,94,0.18);color:#22C55E;font-weight:900;font-size:0.8rem;padding:2px 8px;box-shadow:0 0 10px rgba(34,197,94,0.45);border:1px solid #22C55E;">★</span>`
            : `<span class="badge" style="background:${row.overallColor};color:#000;font-weight:800;font-size:0.8rem;padding:2px 8px;">${row.globalGrade}</span>`
          )
          : '—'
      },
      // 11. Completion (Level Progress Bar)
      {
        key: 'completionPct',
        label: 'Completion',
        sortable: true,
        align: 'center',
        width: '115px',
        render: (row) => `
          <div class="d-flex align-center gap-2 justify-center" style="min-width:105px;">
            <div style="flex:1;max-width:65px;background:rgba(255,255,255,0.1);height:6px;border-radius:3px;overflow:hidden;">
              <div style="width:${row.completionPct}%;background:var(--fm-accent-tactical, #6366f1);height:100%;border-radius:3px;"></div>
            </div>
            <span class="text-xs fw-600" style="color:var(--clr-text-2);min-width:28px;">${row.completionPct}%</span>
          </div>
        `
      },

      // 12. Joined
      {
        key: 'joinDate',
        label: 'Enrolled',
        sortable: true,
        align: 'center',
        width: '95px',
        render: (row) => `<span class="text-xs text-muted">${escapeHtml(row.joinDate)}</span>`
      },
      // 13. Status
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        align: 'center',
        width: '75px',
        render: (val, row) => `<span class="badge ${((row._raw || row).is_active !== false) ? 'badge-success' : 'badge-neutral'}">${((row._raw || row).is_active !== false) ? 'Active' : 'Inactive'}</span>`
      },

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

  // Bind custom filters
  const statusFilter = document.getElementById('students-filter-batch-status');
  const batchFilter = document.getElementById('students-filter-batch');
  
  if (statusFilter && batchFilter) {
    const applyFilters = () => {
      const bStatus = statusFilter.value;
      const bid = batchFilter.value;
      window._filterBatchStatus = bStatus;
      window._filterBatchId = bid || null;

      let newData = programStudents;
      if (bid) newData = newData.filter(s => s.batch_id === bid);
      if (bStatus === 'active') {
        newData = newData.filter(s => s.batches ? s.batches.is_active !== false : true);
      } else if (bStatus === 'inactive') {
        newData = newData.filter(s => s.batches ? s.batches.is_active === false : false);
      }
      studentGrid.updateData(newData);
      const countEl = document.querySelector('.section-title .count-chip');
      if (countEl) countEl.textContent = `${newData.length} ${bStatus === 'active' ? 'Active' : 'Total'}`;
    };

    statusFilter.addEventListener('change', () => {
      const bStatus = statusFilter.value;
      Array.from(batchFilter.options).forEach(opt => {
        if (!opt.value) return;
        const isActive = opt.getAttribute('data-active') === 'true';
        if (bStatus === 'active' && !isActive) {
          opt.style.display = 'none';
        } else if (bStatus === 'inactive' && isActive) {
          opt.style.display = 'none';
        } else {
          opt.style.display = '';
        }
      });
      if (batchFilter.selectedOptions[0] && batchFilter.selectedOptions[0].style.display === 'none') {
        batchFilter.value = '';
      }
      applyFilters();
    });

    batchFilter.addEventListener('change', applyFilters);

    const resetBtn = document.getElementById('students-filter-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        statusFilter.value = 'active';
        batchFilter.value = '';
        applyFilters();
      });
    }
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
          <label class="form-label">Date of Birth</label>
          <input type="date" class="form-control" id="bfe-birth" value="${escHtml(initialBirth)}">
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


