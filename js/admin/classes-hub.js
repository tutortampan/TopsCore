import { adminFetchAll, adminUpdate, fetchClassTestSettings, saveClassTestSettings, toShortLevel } from '../api.js?v=20261114_v517';
import { showToast, escapeHtml, escHtml } from '../app.js?v=20261106_v160';
import { getClassSvgIcon } from '../grading.js?v=20261106_v160';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';

export async function renderClassesHub(area) {
  area.innerHTML = typeof window.getLoadingStateHtml === 'function'
    ? window.getLoadingStateHtml('Loading Curriculum Hub...')
    : '<div class="topscore-loading-center"><div class="spinner"></div><p class="loading-text">Loading Curriculum Hub...</p></div>';

  try {
    const [institutions, programs, classes, levels, classLevels, students, batches, tests] = await Promise.all([
      adminFetchAll('institutions', 'id, name, code, is_active, deleted_at'),
      adminFetchAll('programs',    'id, name, code, institution_id, is_active, deleted_at'),
      adminFetchAll('classes',     'id, name, code, is_active, program_id, level_id, institution_id, deleted_at'),
      adminFetchAll('levels',      'id, name, level_number'),
      adminFetchAll('class_levels', 'class_id, level_id').catch(() => []),
      adminFetchAll('students',    'id, name, program_id, batch_id, level_id, is_active, deleted_at').catch(() => []),
      adminFetchAll('batches',     'id, program_id, current_level_id, is_active, deleted_at').catch(() => []),
      adminFetchAll('tests',       'id, title, category, test_type, class_id, level_id, minimum_required_score, payload, status, deleted_at').catch(() => [])
    ]);

    const activeInsts   = (institutions || []).filter(i => !i.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const activeProgs   = (programs    || []).filter(p => !p.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const activeClasses = (classes     || []).filter(c => !c.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const activeLevels  = (levels      || []).sort((a, b) => (a.level_number || 0) - (b.level_number || 0));
    const activeTests   = (tests       || []).filter(t => !t.deleted_at);

    const batchMap   = new Map((batches || []).filter(b => !b.deleted_at).map(b => [b.id, b]));
    const activeStudents = (students || []).filter(s => !s.deleted_at && s.is_active !== false);

    const classLevelPairs = new Set();
    (classLevels || []).forEach(cl => {
      if (cl.class_id && cl.level_id) {
        classLevelPairs.add(cl.class_id + '_' + cl.level_id);
      }
    });

    const getEligibleStudentCountForClass = (cls) => {
      return activeStudents.filter(s => {
        if (cls.program_id && s.program_id && s.program_id !== cls.program_id) {
          return false;
        }
        const studentLevel = s.level_id || (s.batch_id ? batchMap.get(s.batch_id)?.current_level_id : null);
        if (cls.level_id) {
          if (studentLevel === cls.level_id) return true;
          if (classLevelPairs.has(cls.id + '_' + studentLevel)) return true;
          return false;
        }
        const classHasLevels = Array.from(classLevelPairs).some(pair => pair.startsWith(cls.id + '_'));
        if (classHasLevels) {
          return Boolean(studentLevel && classLevelPairs.has(cls.id + '_' + studentLevel));
        }
        return true;
      }).length;
    };

    const progMap  = new Map(activeProgs.map(p => [p.id, p]));
    const instMap  = new Map(activeInsts.map(i => [i.id, i]));
    const levelMap = new Map(activeLevels.map(l => [l.id, l]));

    // Group tests by class_id
    const testsByClass = new Map();
    activeTests.forEach(t => {
      if (!t.class_id) return;
      if (!testsByClass.has(t.class_id)) testsByClass.set(t.class_id, []);
      testsByClass.get(t.class_id).push(t);
    });

    // Helper: extract numeric minimum passing score for a test
    const getTestMinScore = (t) => {
      const raw = t.minimum_required_score ?? t.payload?.minimum_required_score ?? t.payload?.min_score;
      const num = Number(raw);
      return !isNaN(num) && num > 0 ? num : 60;
    };

    // Helper: evaluate grade badge info for a passing score
    const getGradeInfoForScore = (score) => {
      if (score >= 100) return { grade: '★', label: 'Excellent', color: 'var(--grade-star, #ff2d87)', bg: 'rgba(255, 45, 135, 0.15)' };
      if (score >= 90)  return { grade: 'A', label: 'Very Good',  color: 'var(--grade-a, #00c000)',    bg: 'rgba(0, 192, 0, 0.15)' };
      if (score >= 80)  return { grade: 'B', label: 'Good',       color: 'var(--grade-b, #95ff00)',    bg: 'rgba(149, 255, 0, 0.15)' };
      if (score >= 60)  return { grade: 'C', label: 'Enough',     color: 'var(--grade-c, #FFFF00)',    bg: 'rgba(255, 255, 0, 0.15)' };
      if (score >= 30)  return { grade: 'D', label: 'Less',       color: 'var(--grade-d, #FF8C00)',    bg: 'rgba(255, 140, 0, 0.15)' };
      return { grade: 'E', label: 'Fail', color: 'var(--grade-e, #FF0000)', bg: 'rgba(255, 0, 0, 0.15)' };
    };

    window._classesHubRecords = {};
    activeInsts.forEach(r   => window._classesHubRecords[r.id] = r);
    activeProgs.forEach(r   => window._classesHubRecords[r.id] = r);
    activeClasses.forEach(r => window._classesHubRecords[r.id] = r);
    activeLevels.forEach(r  => window._classesHubRecords[r.id] = r);
    activeTests.forEach(r   => window._classesHubRecords[r.id] = r);

    // Default UI states
    if (!window._classesHubActiveInst) window._classesHubActiveInst = 'all'; // 'all' | instId
    if (!window._classesHubExpandedLevels || window._classesHubExpandedLevels.size === 0) {
      window._classesHubExpandedLevels = new Set(activeLevels.map(l => l.id));
      window._classesHubExpandedLevels.add('unassigned');
    }
    if (!window._classesHubExpandedTests) {
      window._classesHubExpandedTests = new Set();
    }

    // Switch institution filter tab in topbar
    window.switchClassesHubInst = (instId) => {
      window._classesHubActiveInst = instId;
      renderView();
    };

    // Toggle level accordion
    window.toggleClassesHubLevel = (levelId) => {
      if (window._classesHubExpandedLevels.has(levelId)) {
        window._classesHubExpandedLevels.delete(levelId);
      } else {
        window._classesHubExpandedLevels.add(levelId);
      }
      renderView();
    };

    // Toggle class tests inspect drawer
    window.toggleClassesHubTests = (classId) => {
      if (window._classesHubExpandedTests.has(classId)) {
        window._classesHubExpandedTests.delete(classId);
      } else {
        window._classesHubExpandedTests.add(classId);
      }
      renderView();
    };

    window.openClassesHubEdit = (table, id) => {
      const rec = window._classesHubRecords[id];
      if (rec && window.openCrudModal) window.openCrudModal(table, { ...rec });
    };

    window.openClassesHubAddClass = (levelId) => {
      if (!window.openCrudModal) return;
      const filterInst = window._classesHubActiveInst;
      const defaultProg = (filterInst && filterInst !== 'all')
        ? (activeProgs.find(p => p.institution_id === filterInst)?.id || null)
        : (activeProgs[0]?.id || null);
      window.openCrudModal('classes', { level_id: levelId || null, program_id: defaultProg, is_active: true });
    };

    window.openClassesHubAddLevel = () => {
      if (window.openCrudModal) window.openCrudModal('levels', { is_active: true });
    };

    window.deleteClassesHubRecord = (table, id, name) => {
      if (window._deleteRecord) window._deleteRecord(table, id, name);
    };

    window.toggleClassesHubEntity = async (table, id, isActive) => {
      try {
        await adminUpdate(table, id, { is_active: isActive });
        if (window._classesHubRecords && window._classesHubRecords[id]) {
          window._classesHubRecords[id].is_active = isActive;
        }
        const clsObj = activeClasses.find(c => c.id === id);
        if (clsObj) clsObj.is_active = isActive;

        showToast(isActive ? 'Class activated successfully.' : 'Class deactivated.', 'success');
        if (table === 'classes' && window.loadSidebarClasses) window.loadSidebarClasses();
        renderView();
      } catch (err) {
        showToast('Failed to update status: ' + (err && err.message ? err.message : err), 'error');
        renderView();
      }
    };

    window._classesHubSort = window._classesHubSort || { key: 'level', asc: true };
    window.sortClassesHub = (key) => {
      if (window._classesHubSort.key === key) {
        window._classesHubSort.asc = !window._classesHubSort.asc;
      } else {
        window._classesHubSort.key = key;
        window._classesHubSort.asc = true;
      }
      renderView();
    };

    window.openVocabVaultFromClassHub = (progId) => {
      window._activeVaultTab = 'blueprint';
      try {
        localStorage.setItem('topscore_admin_vault_tab', 'blueprint');
      } catch (_) {}
      if (typeof window.loadSection === 'function') {
        window.loadSection('vocab_vault');
      } else {
        window.location.hash = '#vocab_vault';
      }
    };

    window.toggleClassesHubEditMode = () => {
      if (typeof window.toggleGlobalEditMode === 'function') {
        const newState = window.toggleGlobalEditMode();
        showToast(newState ? 'Master Edit Mode ON (Inline Standards)' : 'Master Edit Mode OFF', newState ? 'info' : 'success');
        renderView();
      }
    };

    window.handleClassPassingScoreChange = async (classId, type, rawVal) => {
      const val = Math.max(1, Math.min(100, parseInt(rawVal, 10) || 60));
      const classTests = testsByClass.get(classId) || [];
      const targetTests = classTests.filter(t => {
        const isExam = (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() === 'EXAM';
        return type === 'EXAM' ? isExam : !isExam;
      });
      if (targetTests.length === 0) return;
      try {
        await Promise.all(targetTests.map(t => {
          const updatedPayload = { ...(t.payload || {}) };
          updatedPayload.minimum_required_score = val;
          updatedPayload.min_score = val;
          t.minimum_required_score = val;
          t.payload = updatedPayload;
          return adminUpdate('tests', t.id, {
            minimum_required_score: val,
            payload: updatedPayload
          });
        }));

        // SSOT Synchronization: Propagate to class_test_settings in site_settings & cache
        try {
          const currentSettings = await fetchClassTestSettings(classId);
          const updatedSettings = {
            ...currentSettings,
            taskMinScore: type === 'EXAM' ? currentSettings.taskMinScore : val,
            examMinScore: type === 'EXAM' ? val : currentSettings.examMinScore
          };
          await saveClassTestSettings(classId, updatedSettings, false);
        } catch (syncErr) {
          console.warn('[ClassesHub] site_settings sync note:', syncErr);
        }

        showToast(`Updated passing rate to ${val}% for ${targetTests.length} ${type.toLowerCase()}(s).`, 'success');
        renderView();
      } catch (err) {
        showToast('Failed to update passing rate: ' + (err?.message || err), 'error');
      }
    };

    // Quick Edit Passing Standard Modal
    window.openQuickEditPassingStandard = (testId) => {
      const test = window._classesHubRecords[testId];
      if (!test) return;
      const curScore = getTestMinScore(test);
      const testTitle = test.title || test.display_name || 'Test';
      const shellCode = test.shell_code || test.payload?.shell_code || '';
      const testCat = (test.category || (test.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase();

      const modalHtml = `
        <div id="quick-edit-standard-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;">
          <div style="background:#0F172A;border:2px solid rgba(56,189,248,0.35);border-radius:12px;width:100%;max-width:440px;box-shadow:0 20px 40px rgba(0,0,0,0.6);padding:20px;color:#f8fafc;font-family:'Inter',sans-serif;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:10px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="color:#38bdf8;">${getSvgIcon('award', 18)}</span>
                <span style="font-size:16px;font-weight:700;">Calibrate Passing Standard</span>
              </div>
              <button onclick="window.closeQuickEditModal()" style="background:transparent;border:none;color:#94a3b8;font-size:16px;cursor:pointer;">✕</button>
            </div>
            <div style="margin-bottom:14px;">
              <div style="font-size:12px;font-weight:600;color:#f1f5f9;margin-bottom:2px;">${escapeHtml(testTitle)}</div>
              <div style="font-size:12px;color:#94a3b8;display:flex;gap:8px;align-items:center;">
                <span style="font-family:monospace;background:rgba(255,255,255,0.06);padding:1px 5px;border-radius:3px;">${escapeHtml(shellCode || '-')}</span>
                <span>Type: <strong style="color:${testCat === 'EXAM' ? '#FF8C00' : '#818cf8'};">${testCat}</strong></span>
              </div>
            </div>
            <div style="margin-bottom:16px;">
              <label style="display:block;font-size:12px;font-weight:600;color:#cbd5e1;margin-bottom:6px;">Minimum Required Passing Rate (%):</label>
              <div style="display:flex;gap:8px;margin-bottom:10px;">
                <button type="button" class="btn btn-secondary btn-sm" style="flex:1;font-size:12px;padding:6px 0;background:${curScore === 60 ? 'rgba(255,255,0,0.2)' : 'rgba(255,255,255,0.05)'};border-color:${curScore === 60 ? 'var(--grade-c)' : 'rgba(255,255,255,0.1)'};color:${curScore === 60 ? 'var(--grade-c)' : '#f8fafc'};" onclick="document.getElementById('quick-score-input').value = 60;">60% (Grade C)</button>
                <button type="button" class="btn btn-secondary btn-sm" style="flex:1;font-size:12px;padding:6px 0;background:${curScore === 70 ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.05)'};border-color:${curScore === 70 ? '#38bdf8' : 'rgba(255,255,255,0.1)'};color:${curScore === 70 ? '#38bdf8' : '#f8fafc'};" onclick="document.getElementById('quick-score-input').value = 70;">70% (Task Pass)</button>
                <button type="button" class="btn btn-secondary btn-sm" style="flex:1;font-size:12px;padding:6px 0;background:${curScore === 80 ? 'rgba(149,255,0,0.2)' : 'rgba(255,255,255,0.05)'};border-color:${curScore === 80 ? 'var(--grade-b)' : 'rgba(255,255,255,0.1)'};color:${curScore === 80 ? 'var(--grade-b)' : '#f8fafc'};" onclick="document.getElementById('quick-score-input').value = 80;">80% (Grade B)</button>
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                <input id="quick-score-input" type="number" min="1" max="100" value="${curScore}" class="form-control" style="font-size:14px;font-weight:700;text-align:center;height:36px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.2);color:#38bdf8;" />
                <span style="font-size:14px;font-weight:700;color:#94a3b8;">%</span>
              </div>
              <div style="font-size:12px;color:#94a3b8;margin-top:6px;line-height:1.4;">
                * Standard Tests require <strong>60% (Grade C Enough)</strong> for promotion eligibility per AGENTS.md §2.4.1.
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.closeQuickEditModal()" style="font-size:12px;padding:6px 14px;margin-right:auto;">CLOSE</button>
              <button type="button" class="btn btn-primary btn-sm" onclick="window.saveQuickEditPassingStandard('${test.id}')" style="font-size:12px;padding:6px 16px;background:#38bdf8;border-color:#38bdf8;color:#090D16;font-weight:700;">Save Standard</button>
            </div>
          </div>
        </div>
      `;
      const prev = document.getElementById('quick-edit-standard-overlay');
      if (prev) prev.remove();
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    // Open Full Class Test Settings & Blueprint Rules Modal directly from Classes Hub
    window.openClassTestSettingsFromHub = async (classId, className) => {
      try {
        const { openTestSystemSettingsModal } = await import('./test-system-settings-modal.js?v=20261106_v140');
        await openTestSystemSettingsModal({
          classId,
          className,
          onComplete: () => {
            renderView();
          }
        });
      } catch (err) {
        console.error(err);
        showToast('Failed to open test settings: ' + (err?.message || err), 'error');
      }
    };

    window.closeQuickEditModal = () => {
      const modal = document.getElementById('quick-edit-standard-overlay');
      if (modal) modal.remove();
    };

    window.saveQuickEditPassingStandard = async (testId) => {
      const inp = document.getElementById('quick-score-input');
      if (!inp) return;
      const newScore = Math.max(1, Math.min(100, parseInt(inp.value, 10) || 60));
      const test = window._classesHubRecords[testId];
      if (!test) return;

      const updatedPayload = { ...(test.payload || {}) };
      updatedPayload.minimum_required_score = newScore;
      updatedPayload.min_score = newScore;

      try {
        await adminUpdate('tests', testId, {
          minimum_required_score: newScore,
          payload: updatedPayload
        });

        test.minimum_required_score = newScore;
        test.payload = updatedPayload;

        showToast(`Passing rate updated to ${newScore}%.`, 'success');
        window.closeQuickEditModal();
        renderView();
      } catch (err) {
        showToast('Failed to update passing standard: ' + (err && err.message ? err.message : err), 'error');
      }
    };

    // Batch Align Class Standards Modal
    window.openBatchAlignStandards = (classId) => {
      const cls = window._classesHubRecords[classId];
      if (!cls) return;
      const classTests = testsByClass.get(classId) || [];
      const examCount = classTests.filter(t => (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() === 'EXAM').length;
      const taskCount = classTests.filter(t => (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() !== 'EXAM').length;

      const modalHtml = `
        <div id="quick-edit-standard-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;">
          <div style="background:#0F172A;border:2px solid rgba(149,255,0,0.35);border-radius:12px;width:100%;max-width:440px;box-shadow:0 20px 40px rgba(0,0,0,0.6);padding:20px;color:#f8fafc;font-family:'Inter',sans-serif;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:10px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span style="color:var(--grade-b);">${getSvgIcon('award', 18)}</span>
                <span style="font-size:16px;font-weight:700;">Batch Align Passing Standards</span>
              </div>
              <button onclick="window.closeQuickEditModal()" style="background:transparent;border:none;color:#94a3b8;font-size:16px;cursor:pointer;">✕</button>
            </div>
            <div style="margin-bottom:14px;">
              <div style="font-size:14px;font-weight:700;color:#f1f5f9;">${escapeHtml(cls.name)}</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:2px;">
                ${classTests.length} Total Tests (${taskCount} Tasks, ${examCount} Exams)
              </div>
            </div>
            <div style="margin-bottom:16px;display:flex;flex-direction:column;gap:12px;">
              <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
                <label style="display:block;font-size:12px;font-weight:600;color:#818cf8;margin-bottom:4px;">Set All ${taskCount} Tasks Passing Rate (%):</label>
                <div style="display:flex;align-items:center;gap:8px;">
                  <input id="batch-task-score" type="number" min="1" max="100" value="70" class="form-control" style="font-size:12px;font-weight:700;height:32px;background:rgba(0,0,0,0.3);width:90px;text-align:center;" />
                  <span style="font-size:12px;color:#cbd5e1;">% (Standard Formative Mastery)</span>
                </div>
              </div>
              <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
                <label style="display:block;font-size:12px;font-weight:600;color:#FF8C00;margin-bottom:4px;">Set All ${examCount} Exams Passing Rate (%):</label>
                <div style="display:flex;align-items:center;gap:8px;">
                  <input id="batch-exam-score" type="number" min="1" max="100" value="60" class="form-control" style="font-size:12px;font-weight:700;height:32px;background:rgba(0,0,0,0.3);width:90px;text-align:center;" />
                  <span style="font-size:12px;color:#cbd5e1;">% (Standard TopsCore Grade C)</span>
                </div>
              </div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.closeQuickEditModal()" style="font-size:12px;padding:6px 14px;margin-right:auto;">CLOSE</button>
              <button type="button" class="btn btn-primary btn-sm" onclick="window.applyBatchAlignStandards('${cls.id}')" style="font-size:12px;padding:6px 16px;background:var(--grade-b);border-color:var(--grade-b);color:#090D16;font-weight:700;">Apply to All Tests</button>
            </div>
          </div>
        </div>
      `;
      const prev = document.getElementById('quick-edit-standard-overlay');
      if (prev) prev.remove();
      document.body.insertAdjacentHTML('beforeend', modalHtml);
    };

    window.applyBatchAlignStandards = async (classId) => {
      const examInput = document.getElementById('batch-exam-score');
      const taskInput = document.getElementById('batch-task-score');
      const newExamScore = Math.max(1, Math.min(100, parseInt(examInput?.value, 10) || 60));
      const newTaskScore = Math.max(1, Math.min(100, parseInt(taskInput?.value, 10) || 70));

      const classTests = testsByClass.get(classId) || [];
      if (classTests.length === 0) {
        showToast('No tests found in this class.', 'warning');
        window.closeQuickEditModal();
        return;
      }

      showToast(`Aligning ${classTests.length} tests...`, 'info');
      try {
        await Promise.all(classTests.map(t => {
          const isExam = (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() === 'EXAM';
          const targetScore = isExam ? newExamScore : newTaskScore;
          const updatedPayload = { ...(t.payload || {}) };
          updatedPayload.minimum_required_score = targetScore;
          updatedPayload.min_score = targetScore;
          t.minimum_required_score = targetScore;
          t.payload = updatedPayload;
          return adminUpdate('tests', t.id, {
            minimum_required_score: targetScore,
            payload: updatedPayload
          });
        }));

        // SSOT Synchronization: Propagate to class_test_settings in site_settings & cache
        try {
          const currentSettings = await fetchClassTestSettings(classId);
          await saveClassTestSettings(classId, {
            ...currentSettings,
            taskMinScore: newTaskScore,
            examMinScore: newExamScore
          }, false);
        } catch (syncErr) {
          console.warn('[ClassesHub] site_settings sync note:', syncErr);
        }

        showToast(`Successfully calibrated all ${classTests.length} tests!`, 'success');
        window.closeQuickEditModal();
        renderView();
      } catch (err) {
        showToast('Failed to batch align standards: ' + (err && err.message ? err.message : err), 'error');
      }
    };

    // Main Renderer: Single Unified Table View
    const renderView = () => {
      const activeInstFilter = window._classesHubActiveInst || 'all';

      // 1. Topbar: Standard Institution Navigation Tabs
      const instTabs = [
        { id: 'all', icon: getSvgIcon('globe', 14), label: 'All Institutions', val: activeClasses.length },
        ...activeInsts.map(inst => {
          const cnt = activeClasses.filter(c => {
            const prog = progMap.get(c.program_id);
            return (prog && prog.institution_id === inst.id) || (c.institution_id === inst.id);
          }).length;
          return { id: inst.id, icon: getSvgIcon('building', 14), label: inst.name, val: cnt };
        })
      ];

      if (window.setTopbarTabs) {
        window.setTopbarTabs(instTabs, activeInstFilter, 'window.switchClassesHubInst');
      }

      // Filter classes by active institution
      const filteredClasses = activeInstFilter === 'all'
        ? activeClasses
        : activeClasses.filter(c => {
            const prog = progMap.get(c.program_id);
            return (prog && prog.institution_id === activeInstFilter) || (c.institution_id === activeInstFilter);
          });

      const searchQuery = (window._classesHubSearch !== undefined
        ? window._classesHubSearch
        : (document.getElementById('classes-hub-search')?.value || '')
      ).toLowerCase().trim();

      const filterClassesList = (clsList, query) => {
        if (!query) return clsList;
        return clsList.filter(c => {
          const prog = progMap.get(c.program_id);
          const inst = prog ? instMap.get(prog.institution_id) : (c.institution_id ? instMap.get(c.institution_id) : null);
          let lvl = c.level_id ? levelMap.get(c.level_id) : null;
          if (!lvl) {
            for (const cl of (classLevels || [])) {
              if (cl.class_id === c.id && cl.level_id && levelMap.has(cl.level_id)) {
                lvl = levelMap.get(cl.level_id);
                break;
              }
            }
          }
          const lvlName = lvl ? (lvl.name || '').toLowerCase() : '';
          const lvlNum = lvl?.level_number != null ? 'l' + lvl.level_number : '';
          const cTests = testsByClass.get(c.id) || [];
          const matchesTest = cTests.some(t =>
            (t.title || '').toLowerCase().includes(query) ||
            (t.shell_code || '').toLowerCase().includes(query)
          );
          return (c.name || '').toLowerCase().includes(query) ||
                 (c.code || '').toLowerCase().includes(query) ||
                 (prog && (prog.name || '').toLowerCase().includes(query)) ||
                 (inst && (inst.name || '').toLowerCase().includes(query)) ||
                 lvlName.includes(query) ||
                 lvlNum === query ||
                 matchesTest;
        });
      };

      const searchedClasses = filterClassesList(filteredClasses, searchQuery);

      const getSortIcon = (key) => {
        const cur = window._classesHubSort || { key: 'level', asc: true };
        if (cur.key !== key) return '';
        return cur.asc ? '<span style="color:var(--clr-primary,#6366f1);margin-left:4px;font-size:12px;">▲</span>' : '<span style="color:var(--clr-primary,#6366f1);margin-left:4px;font-size:12px;">▼</span>';
      };

      const sortClassList = (list) => {
        const { key, asc } = window._classesHubSort || { key: 'level', asc: true };
        return [...list].sort((a, b) => {
          let res = 0;
          if (key === 'institution') {
            const getInstCode = (c) => {
              const p = progMap.get(c.program_id);
              const i = p ? instMap.get(p.institution_id) : (c.institution_id ? instMap.get(c.institution_id) : null);
              return (i?.code || i?.name || '').toLowerCase();
            };
            res = getInstCode(a).localeCompare(getInstCode(b));
          } else if (key === 'level') {
            const getLvlNum = (c) => {
              if (c.level_id && levelMap.has(c.level_id)) return levelMap.get(c.level_id).level_number ?? 999;
              for (const cl of (classLevels || [])) {
                if (cl.class_id === c.id && cl.level_id && levelMap.has(cl.level_id)) {
                  return levelMap.get(cl.level_id).level_number ?? 999;
                }
              }
              return 999;
            };
            res = getLvlNum(a) - getLvlNum(b);
            if (res === 0) res = (a.name || '').localeCompare(b.name || '');
          } else if (key === 'name') {
            res = (a.name || '').localeCompare(b.name || '');
          } else if (key === 'program') {
            const pA = progMap.get(a.program_id)?.name || '';
            const pB = progMap.get(b.program_id)?.name || '';
            res = pA.localeCompare(pB);
          } else if (key === 'code') {
            const cA = a.code || a.name || '';
            const cB = b.code || b.name || '';
            res = cA.localeCompare(cB);
          } else if (key === 'students') {
            res = getEligibleStudentCountForClass(a) - getEligibleStudentCountForClass(b);
          } else if (key === 'task') {
            const tA = (testsByClass.get(a.id) || []).filter(t => (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() !== 'EXAM').length;
            const tB = (testsByClass.get(b.id) || []).filter(t => (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() !== 'EXAM').length;
            res = tA - tB;
          } else if (key === 'exam') {
            const eA = (testsByClass.get(a.id) || []).filter(t => (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() === 'EXAM').length;
            const eB = (testsByClass.get(b.id) || []).filter(t => (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() === 'EXAM').length;
            res = eA - eB;
          } else if (key === 'status') {
            res = (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
          }
          return asc ? res : -res;
        });
      };

      const buildClassRow = (cls, idx) => {
        const prog = progMap.get(cls.program_id);
        const inst = prog ? instMap.get(prog.institution_id) : (cls.institution_id ? instMap.get(cls.institution_id) : null);
        const instCode  = escapeHtml(inst?.code || inst?.name || '—');
        const progName  = prog ? escapeHtml(prog.name) : 'No Program';

        // Level detection
        let lvl = cls.level_id ? levelMap.get(cls.level_id) : null;
        if (!lvl) {
          for (const cl of (classLevels || [])) {
            if (cl.class_id === cls.id && cl.level_id && levelMap.has(cl.level_id)) {
              lvl = levelMap.get(cl.level_id);
              break;
            }
          }
        }
        const shortLvl = (lvl && lvl.level_number > 0 && lvl.level_number < 99)
          ? (typeof toShortLevel === 'function' ? toShortLevel(lvl.level_number) : (lvl.name || '—'))
          : '—';
        const levelHtml = shortLvl !== '—'
          ? `<span style="color:#818cf8;font-weight:600;font-size:12px;">${escapeHtml(shortLvl)}</span>`
          : '<span class="text-xs text-muted">—</span>';

        // Format class code: strictly PROGRAM-LEVELCLASS SSOT (e.g. CMP-3VOCAB, CMP-1BASIC, EVN-VOCAB)
        const getStandardClassCode = (c, levelObj, progObj) => {
          if (c.code) return c.code;
          const rawName = (c.name || '').toUpperCase();
          let progAbbr = 'CMP';
          if (rawName.includes('CAMP') || (progObj && (progObj.name || '').toUpperCase().includes('CAMP'))) {
            progAbbr = 'CMP';
          } else if (rawName.includes('EVNIKOM') || (progObj && (progObj.name || '').toUpperCase().includes('EVNIKOM'))) {
            progAbbr = 'EVN';
          } else if (rawName.includes('SHERATON') || (progObj && (progObj.name || '').toUpperCase().includes('SHERATON'))) {
            progAbbr = 'SHR';
          } else if (rawName.includes('TAMATA') || (progObj && (progObj.name || '').toUpperCase().includes('TAMATA'))) {
            progAbbr = 'TMT';
          } else if (progObj && progObj.code) {
            progAbbr = progObj.code.slice(0, 3).toUpperCase();
          }

          let lvlNum = levelObj?.level_number;
          if (lvlNum === 0 || (levelObj?.name || '').toLowerCase() === 'non-level') {
            lvlNum = ''; // Level 0 dianggap kosong!
          } else if (!lvlNum) {
            if (rawName.includes('1ST')) lvlNum = 1;
            else if (rawName.includes('2ND')) lvlNum = 2;
            else if (rawName.includes('3RD')) lvlNum = 3;
            else lvlNum = '';
          }

          let classAbbr = 'VOCAB';
          if (rawName.includes('BASIC')) classAbbr = 'BASIC';
          else if (rawName.includes('STORY')) classAbbr = 'STORY';
          else if (rawName.includes('SPEAK')) classAbbr = 'SPEAK';
          else if (rawName.includes('VOCAB')) classAbbr = 'VOCAB';
          else {
            const words = rawName.split(/\s+/).filter(w => !['CAMP', '1ST', '2ND', '3RD', 'LEVEL'].includes(w));
            classAbbr = (words[0] || 'CLASS').slice(0, 5);
          }

          return `${progAbbr}-${lvlNum}${classAbbr}`;
        };

        const effectiveCode = getStandardClassCode(cls, lvl, prog);
        const codeHtml  = `<span style="font-family:var(--fm-font-mono, monospace);font-size:12px;font-weight:600;letter-spacing:0.04em;color:#e2e8f0;">${escapeHtml(effectiveCode)}</span>`;
        const studentCount = getEligibleStudentCountForClass(cls);
        const studentsHtml = studentCount > 0
          ? `<span style="color:var(--fm-text-primary);font-weight:600;font-size:12px;font-variant-numeric:tabular-nums;">${studentCount}</span>`
          : '<span class="text-xs text-muted" style="font-variant-numeric:tabular-nums;">0</span>';

        // Class tests and passing standards
        const classTests = testsByClass.get(cls.id) || [];
        const tasks = classTests.filter(t => (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() !== 'EXAM');
        const exams = classTests.filter(t => (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() === 'EXAM');

        // Task passing standard badge & inline edit
        let taskHtml = '';
        if (tasks.length > 0) {
          const taskScores = tasks.map(getTestMinScore);
          const curTaskScore = Math.round(taskScores[0]);
          const minT = Math.min(...taskScores);
          const maxT = Math.max(...taskScores);
          const taskLabel = minT === maxT ? `${minT}%` : `${minT}%–${maxT}%`;
          taskHtml = `
            <span class="classes-hub-score-view" style="color:#818cf8;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;cursor:pointer;" onclick="window.openClassTestSettingsFromHub('${cls.id}','${escapeHtml(cls.name)}')" title="${tasks.length} Formative Tasks (Min Pass: ${taskLabel}) — Click to configure class rules">
              ${taskLabel} <span style="font-size:12px;opacity:0.75;font-weight:400;">(${tasks.length})</span>
            </span>
            <span class="classes-hub-score-input-wrap edit-mode-only" style="align-items:center;justify-content:center;gap:2px;">
              <input type="number" min="1" max="100" class="input-class-task-score" data-class-id="${cls.id}" value="${curTaskScore}" style="width:48px;height:24px;font-size:12px;font-weight:600;text-align:center;background:#090D16;color:#818cf8;border:1px solid rgba(129,140,248,0.4);border-radius:4px;padding:0;font-variant-numeric:tabular-nums;" onchange="window.handleClassPassingScoreChange('${cls.id}','TASK',this.value)" title="Set passing rate for all ${tasks.length} tasks" />
              <span style="font-size:12px;color:#94a3b8;">%</span>
            </span>
          `;
        } else {
          taskHtml = '<span class="text-xs text-muted">—</span>';
        }

        // Exam passing standard badge & inline edit
        let examHtml = '';
        if (exams.length > 0) {
          const examScores = exams.map(getTestMinScore);
          const curExamScore = Math.round(examScores[0]);
          const minE = Math.min(...examScores);
          const maxE = Math.max(...examScores);
          const examLabel = minE === maxE ? `${minE}%` : `${minE}%–${maxE}%`;
          examHtml = `
            <span class="classes-hub-score-view" style="color:#FF8C00;font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;cursor:pointer;" onclick="window.openClassTestSettingsFromHub('${cls.id}','${escapeHtml(cls.name)}')" title="${exams.length} Formal Exams (Min Pass: ${examLabel}) — Click to configure class rules">
              ${examLabel} <span style="font-size:12px;opacity:0.75;font-weight:400;">(${exams.length})</span>
            </span>
            <span class="classes-hub-score-input-wrap edit-mode-only" style="align-items:center;justify-content:center;gap:2px;">
              <input type="number" min="1" max="100" class="input-class-exam-score" data-class-id="${cls.id}" value="${curExamScore}" style="width:48px;height:24px;font-size:12px;font-weight:600;text-align:center;background:#090D16;color:#FF8C00;border:1px solid rgba(255,140,0,0.4);border-radius:4px;padding:0;font-variant-numeric:tabular-nums;" onchange="window.handleClassPassingScoreChange('${cls.id}','EXAM',this.value)" title="Set passing rate for all ${exams.length} exams" />
              <span style="font-size:12px;color:#94a3b8;">%</span>
            </span>
          `;
        } else {
          examHtml = '<span class="text-xs text-muted">—</span>';
        }

        return `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.15s ease;">
            <!-- 1. NO -->
            <td class="text-center" style="font-size:12px;color:var(--fm-text-muted);font-variant-numeric:tabular-nums;padding:8px 6px;">${idx + 1}</td>
            <!-- 2. INSTITUTION (Pure 1 Info) -->
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">
              <span style="font-weight:600;font-size:12px;color:var(--fm-text-primary);">${instCode}</span>
            </td>
            <!-- 3. PROGRAM (Pure 1 Info) -->
            <td style="font-size:12px;white-space:nowrap;padding:8px 8px;">
              <span style="color:var(--fm-text-secondary);font-size:12px;">${progName}</span>
            </td>
            <!-- 4. LEVEL (Pure 1 Info) -->
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">${levelHtml}</td>
            <!-- 5. CLASS NAME (Pure 1 Info, Zero Clutter) -->
            <td style="font-size:12px;white-space:nowrap;padding:8px 10px;">
              <span style="font-weight:600;font-size:12px;color:var(--fm-text-primary);" title="${escapeHtml(cls.name)}">${escapeHtml(cls.name)}</span>
            </td>
            <!-- 6. CODE -->
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">${codeHtml}</td>
            <!-- 7. STUDENTS (Pure Tabular Numbers) -->
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">${studentsHtml}</td>
            <!-- 8. TASK PASS -->
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">${taskHtml}</td>
            <!-- 9. EXAM PASS -->
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">${examHtml}</td>
            <!-- 10. STATUS -->
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">
              <span style="cursor:pointer;font-size:12px;font-weight:700;letter-spacing:0.04em;color:${cls.is_active ? 'var(--grade-a)' : 'var(--grade-e)'};text-shadow:none;" onclick="window.toggleClassesHubEntity('classes','${cls.id}',${!cls.is_active})" title="Click to ${cls.is_active ? 'deactivate' : 'activate'} this class">
                ${cls.is_active ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </td>
            <!-- 11. ACTIONS -->
            <td class="text-right" style="white-space:nowrap;padding:8px 10px;min-width:140px;">
              <div class="d-flex align-center gap-1" style="justify-content:flex-end;">
                ${!cls.is_active ? `
                  <button class="btn btn-sm btn-activate-class" style="padding:0 10px;font-size:12px;height:28px;line-height:26px;color:var(--grade-a);border:1px solid rgba(0,192,0,0.4);background:rgba(0,192,0,0.12);font-weight:700;display:inline-flex;align-items:center;gap:4px;cursor:pointer;border-radius:4px;" onclick="window.toggleClassesHubEntity('classes','${cls.id}',true)" title="Activate this class">
                    ${getSvgIcon('check-circle', 12)} Activate
                  </button>
                ` : `
                  <button class="btn btn-secondary btn-sm" style="padding:0 10px;font-size:12px;height:28px;line-height:26px;color:var(--fm-text-muted);border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.04);font-weight:600;display:inline-flex;align-items:center;gap:3px;cursor:pointer;border-radius:4px;" onclick="window.toggleClassesHubEntity('classes','${cls.id}',false)" title="Deactivate this class">
                    Deactivate
                  </button>
                `}
                <button class="btn btn-secondary btn-sm edit-mode-only" style="padding:0 10px;font-size:12px;height:28px;line-height:26px;" onclick="window.openClassesHubEdit('classes','${cls.id}')">Edit</button>
                <button class="btn btn-danger btn-sm edit-mode-only"    style="padding:0 9px;font-size:12px;height:28px;line-height:26px;" onclick="window.deleteClassesHubRecord('classes','${cls.id}','${escapeHtml(cls.name)}')">Delete</button>
              </div>
            </td>
          </tr>
        `;
      };

      const sortedClasses = sortClassList(searchedClasses);

      const renderTableRowsHtml = (list) => {
        if (list.length === 0) {
          return `
            <tr>
              <td colspan="11" style="text-align:center;padding:36px 16px;color:var(--fm-text-muted);">
                <div style="font-size:14px;font-weight:600;margin-bottom:6px;">No classes found</div>
                <div style="font-size:12px;">Try adjusting your search query or institution filter.</div>
              </td>
            </tr>
          `;
        }
        return list.map((cls, idx) => buildClassRow(cls, idx)).join('');
      };

      const updateTableOnly = () => {
        const query = (window._classesHubSearch || '').toLowerCase().trim();
        const activeInst = window._classesHubActiveInst || 'all';
        const filtered = activeInst === 'all'
          ? activeClasses
          : activeClasses.filter(c => {
              const prog = progMap.get(c.program_id);
              return (prog && prog.institution_id === activeInst) || (c.institution_id === activeInst);
            });
        const searched = filterClassesList(filtered, query);
        const sorted = sortClassList(searched);
        const actCount = sorted.filter(c => c.is_active).length;
        const inactCount = sorted.filter(c => !c.is_active).length;
        const totalEligible = sorted.reduce((sum, c) => sum + getEligibleStudentCountForClass(c), 0);

        const tbody = document.getElementById('classes-hub-tbody');
        if (tbody) {
          tbody.innerHTML = renderTableRowsHtml(sorted);
        }
        const summaryEl = document.getElementById('classes-hub-summary-text');
        if (summaryEl) {
          summaryEl.innerHTML = `
            <span><strong style="color:#f8fafc;">${sorted.length}</strong>${query ? ` of ${filtered.length}` : ''} Classes</span>
            <span>·</span>
            <span style="color:var(--grade-a);font-weight:700;"><strong style="color:var(--grade-a);">${actCount}</strong> ACTIVE</span>
            <span>·</span>
            <span style="color:var(--grade-e);font-weight:700;"><strong style="color:var(--grade-e);">${inactCount}</strong> INACTIVE</span>
            <span>·</span>
            <span><strong style="color:#f8fafc;">${activeLevels.length}</strong> Levels</span>
            <span>·</span>
            <span><strong style="color:#818cf8;">${totalEligible}</strong> Eligible Students</span>
          `;
        }
      };

      // Synchronize Canonical Sub Panel (Lower Panel 40px Height Docked Directly Above Banner per ui-invariants.md §1.3)
      const syncSubPanel = (currentSorted, currentFiltered, query) => {
        if (typeof window.setBottomInfobar !== 'function') return;

        const isEditOn = (typeof document !== 'undefined' && document.body.classList.contains('global-edit-mode-on')) || Boolean(window._globalEditMode);
        const actCount = currentSorted.filter(c => c.is_active).length;
        const inactCount = currentSorted.filter(c => !c.is_active).length;
        const totalEligible = currentSorted.reduce((sum, c) => sum + getEligibleStudentCountForClass(c), 0);

        const leftHtml = `
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:nowrap;">
            <div style="position:relative;display:inline-flex;align-items:center;">
              <span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:12px;display:inline-flex;align-items:center;pointer-events:none;">
                ${getSvgIcon('search', 12)}
              </span>
              <input type="text" id="classes-hub-search" placeholder="Search classes, codes, programs..." value="${escapeHtml(query)}" style="padding:0 8px 0 26px;font-size:12px;height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);color:#f8fafc;border-radius:4px;width:240px;outline:none;box-sizing:border-box;" />
            </div>
            <div id="classes-hub-summary-text" style="display:inline-flex;align-items:center;gap:10px;font-size:12px;color:#94a3b8;font-weight:600;white-space:nowrap;">
              <span><strong style="color:#f8fafc;">${currentSorted.length}</strong>${query ? ` of ${currentFiltered.length}` : ''} Classes</span>
              <span>·</span>
              <span style="color:var(--grade-a);font-weight:700;"><strong style="color:var(--grade-a);">${actCount}</strong> ACTIVE</span>
              <span>·</span>
              <span style="color:var(--grade-e);font-weight:700;"><strong style="color:var(--grade-e);">${inactCount}</strong> INACTIVE</span>
              <span>·</span>
              <span><strong style="color:#f8fafc;">${activeLevels.length}</strong> Levels</span>
              <span>·</span>
              <span><strong style="color:#818cf8;">${totalEligible}</strong> Eligible Students</span>
            </div>
          </div>
        `;

        const editBtnStyle = isEditOn
          ? 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:#0284c7;border:1px solid #38bdf8;color:#ffffff;box-shadow:0 0 10px rgba(56,189,248,0.45);transition:all 0.15s ease;'
          : 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:transparent;border:1px solid #38bdf8;color:#38bdf8;transition:all 0.15s ease;';
        const editBtnLabel = isEditOn
          ? `${getSvgIcon('check-circle', 14)} Done Editing`
          : `${getSvgIcon('edit', 14)} Edit Mode`;

        const rightHtml = `
          <div style="display:flex;align-items:center;gap:8px;white-space:nowrap;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-classes-hub-open-vault" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:600;display:inline-flex;align-items:center;gap:5px;border-radius:4px;cursor:pointer;" title="Open Topic Blueprint & Vocabulary Vault">
              ${getSvgIcon('book-open', 14)} Open Vault
            </button>
            <button type="button" class="btn btn-sm" id="btn-classes-hub-toggle-edit" style="${editBtnStyle}" title="Toggle Master Edit Mode (Excel Gridlines)">
              ${editBtnLabel}
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-classes-hub-add-class" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;background:var(--clr-primary,#6366f1);border-color:var(--clr-primary,#6366f1);color:#fff;" title="Add New Class">
              ${getSvgIcon('plus', 14)} Add Class
            </button>
            ${isEditOn ? `
              <button type="button" class="btn btn-secondary btn-sm" id="btn-classes-hub-add-level" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;" title="Add New Level">
                ${getSvgIcon('plus', 14)} Add Level
              </button>
            ` : ''}
          </div>
        `;

        window.setBottomInfobar(leftHtml, rightHtml);

        // Bind Sub Panel events
        const sInp = document.getElementById('classes-hub-search');
        if (sInp && !sInp.dataset.bound) {
          sInp.dataset.bound = 'true';
          sInp.addEventListener('input', (e) => {
            window._classesHubSearch = e.target.value;
            updateTableOnly();
          });
        }

        const openVaultBtn = document.getElementById('btn-classes-hub-open-vault');
        if (openVaultBtn) {
          openVaultBtn.onclick = () => window.openVocabVaultFromClassHub();
        }

        const toggleEditBtn = document.getElementById('btn-classes-hub-toggle-edit');
        if (toggleEditBtn) {
          toggleEditBtn.onclick = () => window.toggleClassesHubEditMode();
        }

        const addClassBtn = document.getElementById('btn-classes-hub-add-class');
        if (addClassBtn) {
          addClassBtn.onclick = () => window.openClassesHubAddClass(null);
        }

        const addLevelBtn = document.getElementById('btn-classes-hub-add-level');
        if (addLevelBtn) {
          addLevelBtn.onclick = () => window.openClassesHubAddLevel();
        }
      };

      area.innerHTML = `
        <div class="classes-hub-workspace" style="display:flex;flex-direction:column;flex:1 1 0 !important;min-height:0 !important;height:100% !important;overflow:hidden;gap:10px;">
          <!-- Unified Curriculum Table (100vh lock, table-wrap scroll only per ui-invariants.md §1.1) -->
          <div class="table-wrap sticky-first" style="flex:1 1 0 !important;min-height:0 !important;overflow-y:auto;overflow-x:auto !important;background:#0f172a;border:1px solid rgba(255,255,255,0.12) !important;border-radius:8px;margin:0;">
            <table class="datagrid-table" style="width:100%;min-width:1150px;border-collapse:collapse;table-layout:fixed;">
              <colgroup>
                <col style="width:45px;">
                <col style="width:95px;">
                <col style="width:110px;">
                <col style="width:75px;">
                <col style="width:210px;">
                <col style="width:125px;">
                <col style="width:75px;">
                <col style="width:95px;">
                <col style="width:95px;">
                <col style="width:85px;">
                <col style="width:140px;">
              </colgroup>
              <thead style="position:sticky;top:0;z-index:10;background:#0f172a;">
                <tr style="height:40px;">
                  <th style="width:45px;text-align:center;">NO</th>
                  <th style="width:95px;text-align:center;cursor:pointer;" onclick="window.sortClassesHub('institution')" title="Sort by Institution">INSTITUTION ${getSortIcon('institution')}</th>
                  <th style="width:110px;text-align:left;cursor:pointer;" onclick="window.sortClassesHub('program')" title="Sort by Program">PROGRAM ${getSortIcon('program')}</th>
                  <th style="width:75px;text-align:center;cursor:pointer;" onclick="window.sortClassesHub('level')" title="Sort by Level">LEVEL ${getSortIcon('level')}</th>
                  <th style="width:210px;text-align:left;cursor:pointer;" onclick="window.sortClassesHub('name')" title="Sort by Class Name">CLASS NAME ${getSortIcon('name')}</th>
                  <th style="width:125px;text-align:center;cursor:pointer;" onclick="window.sortClassesHub('code')" title="Sort by Code">CODE ${getSortIcon('code')}</th>
                  <th style="width:75px;text-align:center;cursor:pointer;" onclick="window.sortClassesHub('students')" title="Sort by Eligible Students">STUDENTS ${getSortIcon('students')}</th>
                  <th style="width:95px;text-align:center;cursor:pointer;" onclick="window.sortClassesHub('task')" title="Sort by Task Passing Rate">TASK PASS ${getSortIcon('task')}</th>
                  <th style="width:95px;text-align:center;cursor:pointer;" onclick="window.sortClassesHub('exam')" title="Sort by Exam Passing Rate">EXAM PASS ${getSortIcon('exam')}</th>
                  <th style="width:85px;text-align:center;cursor:pointer;" onclick="window.sortClassesHub('status')" title="Sort by Status">STATUS ${getSortIcon('status')}</th>
                  <th style="width:140px;text-align:right;">ACTIONS</th>
                </tr>
              </thead>
              <tbody id="classes-hub-tbody">
                ${renderTableRowsHtml(sortedClasses)}
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Synchronize Sub Panel (Lower Panel 40px Height Docked Directly Above Banner per ui-invariants.md §1.3)
      syncSubPanel(sortedClasses, filteredClasses, searchQuery);

      if (!window._classesHubEditModeListenerBound) {
        window._classesHubEditModeListenerBound = true;
        window.addEventListener('admin-edit-mode-changed', () => {
          if (document.getElementById('classes-hub-tbody')) {
            renderView();
          }
        });
      }
    };

    renderView();

  } catch (error) {
    console.error('[ClassesHub] Load error:', error);
    area.innerHTML = '<div class="empty-state"><p style="color:red;">Error loading Curriculum Hub: ' + error.message + '</p></div>';
  }
}
