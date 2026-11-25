// TOPSCORE LMS — Quick Single-Step Action Wizards
// Phase 545: Focused Single-Step Modals for Manual (Cyan/M), Remedi (Yellow/R), Forgive (Red/F), and Alumni (Purple/X)

import { adminApplyForgiven, labelAttemptRemedial, labelAttemptForgiven, clearAdminCache } from '../api.js?v=20261125_v688';
import { getSupabase } from '../supabase.js?v=20261106_v160';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';
import { TOPSCORE_COLORS, getGradeColorByScore, isExam, isWeeklyExam } from '../app.js?v=20261112_v423';

function closeAllQuickModals() {
  document.getElementById('quick-score-wizard-overlay')?.remove();
  window._classRemedialModalOpen = false;
  window._classForgivenModalOpen = false;
  if (typeof window.syncClassHubLowerPanel === 'function') {
    window.syncClassHubLowerPanel('attendance');
  }
}

/**
 * openQuickManualScoreModal is DEPRECATED & PURGED.
 * Table editing is performed directly on the class table via the Sub Panel Edit Mode button.
 */
export async function openQuickManualScoreModal() {
  console.warn('openQuickManualScoreModal is deprecated. Table editing is now inline on table.');
}

export async function openQuickRemedialModal({ classId, classTests = [], students = [], allAttempts = [], onSaved }) {
  closeAllQuickModals();
  window._classRemedialModalOpen = true;
  if (typeof window.syncClassHubLowerPanel === 'function') {
    window.syncClassHubLowerPanel('attendance');
  }

  const overlay = document.createElement('div');
  overlay.id = 'quick-score-wizard-overlay';
  overlay.className = 'topscore-modal-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(9, 13, 22, 0.88); backdrop-filter: blur(8px);
    z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;
  `;

  const examTests = classTests.filter(isWeeklyExam);
  const activeExams = examTests.length > 0 ? examTests : classTests;

  // Build map of best attempt per student & test
  const attemptsMap = {};
  (allAttempts || []).forEach(a => {
    const sId = a.student_id;
    const tId = a.test_id || a.Test_id;
    if (!sId || !tId) return;
    if (!attemptsMap[sId]) attemptsMap[sId] = {};
    const cur = attemptsMap[sId][tId];
    if (!cur || Number(a.percentage || a.score || 0) > Number(cur.percentage || cur.score || 0)) {
      attemptsMap[sId][tId] = a;
    }
  });

  // Filter students who have at least one test below passing (< 60%) or need remedial
  const remedialCandidates = [];
  students.forEach(s => {
    const sAttempts = attemptsMap[s.id] || {};
    const pendingTests = [];

    activeExams.forEach(ex => {
      const att = sAttempts[ex.id];
      const pct = att ? parseFloat(att.percentage || att.score || 0) : null;
      const isRem = Boolean(att?.is_remedial_unlocked || att?.is_remedial);
      const isForgiven = Boolean(att?.is_forgiven);
      const isFailed = pct !== null && pct < 60;
      const isNotTaken = pct === null;

      if (!isForgiven && (isFailed || isNotTaken || isRem)) {
        pendingTests.push({ test: ex, attempt: att, pct, isRem });
      }
    });

    if (pendingTests.length > 0) {
      remedialCandidates.push({ student: s, pendingTests });
    }
  });

  const rowsHtml = remedialCandidates.map(({ student, pendingTests }, idx) => {
    return `
      <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 12px;">
        <td style="padding: 10px 12px; font-weight: 600; color: #f8fafc; vertical-align: top;">
          <span style="color: #64748b; font-size: 12px; margin-right: 6px;">${idx + 1}.</span>
          ${student.displayName || student.name}
          <div style="font-size: 12px; color: #94a3b8; font-weight: 400;">Batch: ${student.batchName || student.batch || '—'}</div>
        </td>
        <td style="padding: 10px 12px;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${pendingTests.map(({ test, attempt, pct, isRem }) => {
              const attId = attempt?.id || '';
              const scoreText = pct !== null ? `${pct}%` : 'Not Taken';
              return `
                <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 6px 10px;">
                  <span style="font-weight: 600; color: #e2e8f0;">${test.title || test.shell_code}</span>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: ${pct != null ? getGradeColorByScore(pct) : '#94a3b8'}; font-weight: 700;">Rate: ${scoreText}</span>
                    <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: var(--grade-c); font-weight: 700; font-size: 12px;">
                      <input type="checkbox" class="remedial-target-check"
                             data-attempt-id="${attId}" data-student-id="${student.id}" data-test-id="${test.id}"
                             ${isRem ? 'checked' : ''} style="accent-color: var(--grade-c); width: 15px; height: 15px;">
                      <span>Authorize Remedial (Grade R)</span>
                    </label>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  overlay.innerHTML = `
    <div style="background: #0f172a; border: 1px solid rgba(255,255,0,0.3); border-radius: 12px; width: 100%; max-width: 860px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 25px 50px rgba(0,0,0,0.7); overflow: hidden; color: #f8fafc;">
      <!-- Header -->
      <div style="padding: 14px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,0,0.06);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: var(--grade-c);">${getSvgIcon('refresh', 18)}</span>
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #f8fafc;">Remedial Authorization — Grade R (Yellow, Cap 60%)</h3>
            <p style="margin: 2px 0 0; font-size: 12px; color: #94a3b8;">Showing ${remedialCandidates.length} students with rates below 60% or pending in this class.</p>
          </div>
        </div>
      </div>

      <!-- Table Body -->
      <div style="padding: 16px 20px; overflow-y: auto; flex: 1;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #1e293b; color: #ffffff; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
              <th style="padding: 8px 12px; text-align: left; width: 220px;">STUDENT</th>
              <th style="padding: 8px 12px; text-align: left;">REMEDIATION CANDIDATE MODULES</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="2" style="text-align:center; padding:24px; color:var(--grade-a); font-weight:700;">✓ All students have passed their required tests! No remedial needed.</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Footer CTA -->
      <div style="padding: 12px 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); background: rgba(30, 41, 59, 0.4); display: flex; align-items: center; justify-content: space-between;">
        <button type="button" id="btn-cancel-quick-remedial" class="btn btn-secondary btn-sm btn-modal-close-left">CLOSE</button>
        <button type="button" id="btn-save-quick-remedial" class="btn btn-sm" style="background: var(--grade-c); border: 1px solid var(--grade-c); color: #0f172a; font-weight: 800; padding: 6px 18px; display: inline-flex; align-items: center; gap: 6px;">
          ${getSvgIcon('check-circle', 14)} Apply Remedial Authorizations (Grade R)
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    window._classRemedialModalOpen = false;
    window.removeEventListener('keydown', handleEsc);
    overlay.remove();
    if (typeof window.syncClassHubLowerPanel === 'function') {
      window.syncClassHubLowerPanel('attendance');
    }
  };
  const handleEsc = (e) => {
    if (e.key === 'Escape') close();
  };
  window.addEventListener('keydown', handleEsc);

  overlay.querySelector('#btn-cancel-quick-remedial').onclick = close;

  overlay.querySelector('#btn-save-quick-remedial').onclick = async () => {
    const checks = overlay.querySelectorAll('.remedial-target-check');
    let updatedCount = 0;

    const saveBtn = overlay.querySelector('#btn-save-quick-remedial');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      for (const chk of checks) {
        const attId = chk.dataset.attemptId;
        const shouldRem = chk.checked;
        if (attId) {
          await labelAttemptRemedial(attId, shouldRem, 60);
          updatedCount++;
        }
      }

      clearAdminCache('attempts');
      if (typeof window.showToast === 'function') window.showToast(`✓ Remedial status updated (${updatedCount} tests)!`, 'success');
      close();
      if (typeof onSaved === 'function') await onSaved();
    } catch (err) {
      console.error(err);
      if (typeof window.showToast === 'function') window.showToast('Failed to apply remedial: ' + err.message, 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Apply Remedial Authorizations (Grade R)';
    }
  };
}

/**
 * 3. QUICK FORGIVEN MODAL (RED #FF0000, GRADE F)
 * Single-step modal focused on granting score waivers to unlock progression.
 */
export async function openQuickForgivenModal({ classId, classTests = [], students = [], allAttempts = [], onSaved }) {
  closeAllQuickModals();
  window._classForgivenModalOpen = true;
  if (typeof window.syncClassHubLowerPanel === 'function') {
    window.syncClassHubLowerPanel('attendance');
  }

  const overlay = document.createElement('div');
  overlay.id = 'quick-score-wizard-overlay';
  overlay.className = 'topscore-modal-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(9, 13, 22, 0.88); backdrop-filter: blur(8px);
    z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;
  `;

  const examTests = classTests.filter(isWeeklyExam);
  const activeExams = examTests.length > 0 ? examTests : classTests;

  const attemptsMap = {};
  (allAttempts || []).forEach(a => {
    const sId = a.student_id;
    const tId = a.test_id || a.Test_id;
    if (!sId || !tId) return;
    if (!attemptsMap[sId]) attemptsMap[sId] = {};
    const cur = attemptsMap[sId][tId];
    if (!cur || Number(a.percentage || a.score || 0) > Number(cur.percentage || cur.score || 0)) {
      attemptsMap[sId][tId] = a;
    }
  });

  // Students who have not passed all exams (need waiver to unlock progression)
  const forgiveCandidates = [];
  students.forEach(s => {
    const sAttempts = attemptsMap[s.id] || {};
    const incompleteExams = [];

    activeExams.forEach(ex => {
      const att = sAttempts[ex.id];
      const pct = att ? parseFloat(att.percentage || att.score || 0) : null;
      const isPassed = (pct !== null && pct >= 60) || Boolean(att?.is_forgiven);

      if (!isPassed) {
        incompleteExams.push({ test: ex, attempt: att, pct, isForgiven: Boolean(att?.is_forgiven) });
      }
    });

    if (incompleteExams.length > 0) {
      forgiveCandidates.push({ student: s, incompleteExams });
    }
  });

  const rowsHtml = forgiveCandidates.map(({ student, incompleteExams }, idx) => {
    return `
      <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 12px;">
        <td style="padding: 10px 12px; font-weight: 600; color: #f8fafc; vertical-align: top;">
          <span style="color: #64748b; font-size: 12px; margin-right: 6px;">${idx + 1}.</span>
          ${student.displayName || student.name}
          <div style="font-size: 12px; color: #94a3b8; font-weight: 400;">Batch: ${student.batchName || student.batch || '—'}</div>
        </td>
        <td style="padding: 10px 12px;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${incompleteExams.map(({ test, attempt, pct, isForgiven }) => {
              const attId = attempt?.id || '';
              return `
                <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 6px; padding: 6px 10px;">
                  <span style="font-weight: 600; color: #e2e8f0;">${test.title || test.shell_code}</span>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="color: ${pct != null ? getGradeColorByScore(pct) : '#94a3b8'}; font-weight: 700;">Rate: ${pct != null ? `${pct}%` : 'Not Taken'}</span>
                    <label style="display: flex; align-items: center; gap: 4px; cursor: pointer; color: var(--grade-e); font-weight: 700; font-size: 12px;">
                      <input type="checkbox" class="forgiven-target-check"
                             data-attempt-id="${attId}" data-student-id="${student.id}" data-test-id="${test.id}"
                             ${isForgiven ? 'checked' : ''} style="accent-color: var(--grade-e); width: 15px; height: 15px;">
                      <span>Grant Waiver (Grade F)</span>
                    </label>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  overlay.innerHTML = `
    <div style="background: #0f172a; border: 1px solid rgba(255,0,0,0.3); border-radius: 12px; width: 100%; max-width: 860px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 25px 50px rgba(0,0,0,0.7); overflow: hidden; color: #f8fafc;">
      <!-- Header -->
      <div style="padding: 14px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: space-between; background: rgba(255,0,0,0.06);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: var(--grade-e);">${getSvgIcon('shield', 18)}</span>
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #f8fafc;">Forgiven Exemption Waiver — Grade F (Red)</h3>
            <p style="margin: 2px 0 0; font-size: 12px; color: #94a3b8;">Grant grade waiver to unblock sequential prerequisites for ${forgiveCandidates.length} students.</p>
          </div>
        </div>
      </div>

      <!-- Reason input -->
      <div style="padding: 10px 20px; background: rgba(0,0,0,0.2); border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; gap: 10px;">
        <label style="font-size: 12px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Waiver Reason / Audit Note:</label>
        <input type="text" id="quick-forgiven-reason" value="Tutor Result Waiver" style="background: #1e293b; border: 1px solid rgba(255,255,255,0.15); color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 12px; flex: 1;">
      </div>

      <!-- Table Body -->
      <div style="padding: 16px 20px; overflow-y: auto; flex: 1;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #1e293b; color: #ffffff; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
              <th style="padding: 8px 12px; text-align: left; width: 220px;">STUDENT</th>
              <th style="padding: 8px 12px; text-align: left;">INCOMPLETE EXAMS REQUIRING WAIVER</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="2" style="text-align:center; padding:24px; color:var(--grade-a); font-weight:700;">✓ All students have completed their exams! No waiver needed.</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Footer CTA -->
      <div style="padding: 12px 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); background: rgba(30, 41, 59, 0.4); display: flex; align-items: center; justify-content: space-between;">
        <button type="button" id="btn-cancel-quick-forgiven" class="btn btn-secondary btn-sm btn-modal-close-left">CLOSE</button>
        <button type="button" id="btn-save-quick-forgiven" class="btn btn-sm" style="background: var(--grade-e); border: 1px solid var(--grade-e); color: #ffffff; font-weight: 800; padding: 6px 18px; display: inline-flex; align-items: center; gap: 6px;">
          ${getSvgIcon('shield', 14)} Grant Forgiven Waivers (Grade F)
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => {
    window._classForgivenModalOpen = false;
    window.removeEventListener('keydown', handleEsc);
    overlay.remove();
    if (typeof window.syncClassHubLowerPanel === 'function') {
      window.syncClassHubLowerPanel('attendance');
    }
  };
  const handleEsc = (e) => {
    if (e.key === 'Escape') close();
  };
  window.addEventListener('keydown', handleEsc);

  overlay.querySelector('#btn-cancel-quick-forgiven').onclick = close;

  overlay.querySelector('#btn-save-quick-forgiven').onclick = async () => {
    const checks = overlay.querySelectorAll('.forgiven-target-check:checked');
    const reason = (overlay.querySelector('#quick-forgiven-reason')?.value || 'Tutor Result Waiver').trim();

    if (checks.length === 0) {
      if (typeof window.showToast === 'function') window.showToast('No exam selected for waiver.', 'warning');
      return;
    }

    const saveBtn = overlay.querySelector('#btn-save-quick-forgiven');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Granting Waivers...';

    try {
      const updatesByStudent = {};
      checks.forEach(chk => {
        const sId = chk.dataset.studentId;
        const tId = chk.dataset.testId;
        if (!updatesByStudent[sId]) updatesByStudent[sId] = [];
        updatesByStudent[sId].push({ testId: tId, action: 'forgive' });
      });

      for (const sId of Object.keys(updatesByStudent)) {
        await adminApplyForgiven({
          classId,
          studentIds: [sId],
          testActions: updatesByStudent[sId],
          forgivenBy: 'Mr. Top',
          reason
        });
      }

      clearAdminCache('attempts');
      if (typeof window.showToast === 'function') window.showToast(`✓ Forgiven waiver (Grade F) granted for ${checks.length} test(s)!`, 'success');
      close();
      if (typeof onSaved === 'function') await onSaved();
    } catch (err) {
      console.error(err);
      if (typeof window.showToast === 'function') window.showToast('Failed to grant waiver: ' + err.message, 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Grant Forgiven Waivers (Grade F)';
    }
  };
}

/**
 * 4. QUICK ALUMNI GRADUATION MODAL (PURPLE #A855F7, GRADE X)
 * Single-step modal on Student Roster to directly graduate students into Alumni.
 */
export async function openQuickAlumniGraduateModal({ students = [], onSaved }) {
  closeAllQuickModals();

  const overlay = document.createElement('div');
  overlay.id = 'quick-score-wizard-overlay';
  overlay.className = 'topscore-modal-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(9, 13, 22, 0.88); backdrop-filter: blur(8px);
    z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 20px; box-sizing: border-box;
  `;

  // Filter active students (non-alumni)
  const activeStudents = students.filter(s => !s.isAlumni && s.studentLevelNum !== 0 && (s.levelName || '').toLowerCase() !== 'alumni');

  const rowsHtml = activeStudents.map((s, idx) => {
    return `
      <tr style="border-bottom: 1px solid rgba(255, 255, 255, 0.06); font-size: 12px;">
        <td style="padding: 10px 12px; width: 40px; text-align: center;">
          <input type="checkbox" class="alumni-student-check" data-student-id="${s.id}" checked
                 style="accent-color: #a855f7; width: 16px; height: 16px; cursor: pointer;">
        </td>
        <td style="padding: 10px 12px; font-weight: 600; color: #f8fafc;">
          <span style="color: #64748b; font-size: 12px; margin-right: 6px;">${idx + 1}.</span>
          ${s.displayName || s.name}
          <div style="font-size: 12px; color: #94a3b8; font-weight: 400;">Batch: ${s.batchName || s.batch || '—'}</div>
        </td>
        <td style="padding: 10px 12px; text-align: center; color: #38bdf8; font-weight: 600;">
          ${s.levelName || '—'}
        </td>
        <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: ${s.overallColor || '#fff'};">
          ${s.overallScoreStr || '—'}
        </td>
        <td style="padding: 10px 12px; text-align: center;">
          ${s.isEligibleNext
            ? `<span style="color:var(--grade-a); font-weight:700; font-size:12px;">✓ Eligible</span>`
            : `<span style="color:var(--grade-star, #a855f7); font-weight:700; font-size:12px;">Direct Force</span>`}
        </td>
      </tr>
    `;
  }).join('');

  overlay.innerHTML = `
    <div style="background: #0f172a; border: 1px solid rgba(168,85,247,0.4); border-radius: 12px; width: 100%; max-width: 780px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 25px 50px rgba(0,0,0,0.7); overflow: hidden; color: #f8fafc;">
      <!-- Header -->
      <div style="padding: 14px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: space-between; background: rgba(168,85,247,0.08);">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #a855f7;">${getSvgIcon('graduation-cap', 20)}</span>
          <div>
            <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: #f8fafc;">Graduate Students to ALUMNI (Universal Access)</h3>
            <p style="margin: 2px 0 0; font-size: 12px; color: #94a3b8;">Select students to graduate directly to Alumni. Alumni receive universal access across all classes.</p>
          </div>
        </div>
      </div>

      <!-- Quick select tools -->
      <div style="padding: 10px 20px; background: rgba(0,0,0,0.25); border-bottom: 1px solid rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 12px; color: #cbd5e1; font-weight: 600;">
          Graduating from Current Roster View: <strong style="color: var(--grade-star, #a855f7);">${activeStudents.length} Active Students</strong>
        </span>
        <div style="display: flex; gap: 8px;">
          <button type="button" id="btn-select-all-alumni" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #fff; font-size: 12px; padding: 3px 10px; border-radius: 4px; cursor: pointer;">Select All</button>
          <button type="button" id="btn-clear-all-alumni" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #94a3b8; font-size: 12px; padding: 3px 10px; border-radius: 4px; cursor: pointer;">Clear</button>
        </div>
      </div>

      <!-- Table Body -->
      <div style="padding: 16px 20px; overflow-y: auto; flex: 1;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <thead>
            <tr style="background: #1e293b; color: #ffffff; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
              <th style="padding: 8px 12px; text-align: center; width: 40px;"></th>
              <th style="padding: 8px 12px; text-align: left;">STUDENT</th>
              <th style="padding: 8px 12px; text-align: center;">CURRENT LEVEL</th>
              <th style="padding: 8px 12px; text-align: center;">RATE</th>
              <th style="padding: 8px 12px; text-align: center;">STATUS</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || '<tr><td colspan="5" style="text-align:center; padding:24px; color:#94a3b8;">No active students in current view.</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Footer CTA -->
      <div style="padding: 12px 20px; border-top: 1px solid rgba(255, 255, 255, 0.08); background: rgba(30, 41, 59, 0.4); display: flex; align-items: center; justify-content: space-between;">
        <button type="button" id="btn-cancel-quick-alumni" class="btn btn-secondary btn-sm btn-modal-close-left">CLOSE</button>
        <button type="button" id="btn-confirm-quick-alumni" class="btn btn-purple btn-sm" style="font-weight: 800; padding: 6px 18px; display: inline-flex; align-items: center; gap: 6px;">
          ${getSvgIcon('graduation-cap', 16)} Confirm Graduation to ALUMNI
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#btn-cancel-quick-alumni').onclick = close;

  overlay.querySelector('#btn-select-all-alumni').onclick = () => {
    overlay.querySelectorAll('.alumni-student-check').forEach(c => { c.checked = true; });
  };
  overlay.querySelector('#btn-clear-all-alumni').onclick = () => {
    overlay.querySelectorAll('.alumni-student-check').forEach(c => { c.checked = false; });
  };

  overlay.querySelector('#btn-confirm-quick-alumni').onclick = async () => {
    const selectedChecks = overlay.querySelectorAll('.alumni-student-check:checked');
    if (selectedChecks.length === 0) {
      if (typeof window.showToast === 'function') window.showToast('Please select at least one student to graduate.', 'warning');
      return;
    }

    const studentIds = Array.from(selectedChecks).map(c => c.dataset.studentId);
    if (!confirm(`Are you sure you want to graduate ${studentIds.length} student(s) directly to ALUMNI status?`)) return;

    const confirmBtn = overlay.querySelector('#btn-confirm-quick-alumni');
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Graduating to Alumni...';

    try {
      const sb = await getSupabase();
      const { data: levels } = await sb.from('levels').select('id, name, level_number').order('level_number');
      const alumniLevel = (levels || []).find(l => parseInt(l.level_number, 10) === 0 || (l.name || '').toLowerCase() === 'alumni');

      if (!alumniLevel) throw new Error('Alumni level not found in database.');

      for (const sId of studentIds) {
        await sb.from('students').update({ level_id: alumniLevel.id }).eq('id', sId);
        await sb.from('audit_logs').insert({
          actor_role: 'admin',
          action: 'LEVEL_PROMOTION_ALUMNI',
          entity_type: 'students',
          entity_id: sId,
          new_value: { level_id: alumniLevel.id, level_number: 0, level_name: 'Alumni' },
          created_at: new Date().toISOString()
        });
      }

      clearAdminCache('students');
      if (typeof window.showToast === 'function') window.showToast(`Successfully graduated ${studentIds.length} student(s) to ALUMNI!`, 'success');
      close();
      if (typeof onSaved === 'function') await onSaved();
    } catch (err) {
      console.error(err);
      if (typeof window.showToast === 'function') window.showToast('Graduation failed: ' + err.message, 'error');
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirm Graduation to ALUMNI';
    }
  };
}

if (typeof window !== "undefined") {
  window.openQuickManualScoreModal = openQuickManualScoreModal;
  window.openQuickRemedialModal = openQuickRemedialModal;
  window.openQuickForgivenModal = openQuickForgivenModal;
  window.openQuickAlumniGraduateModal = openQuickAlumniGraduateModal;
}
