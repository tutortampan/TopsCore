import { adminFetchAll, adminUpdate } from '../api.js?v=20261114_v517';
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

    window._classesHubSort = window._classesHubSort || { key: 'name', asc: true };
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
              <button onclick="window.closeQuickEditModal()" style="background:transparent;border:none;color:#94a3b8;font-size:18px;cursor:pointer;">✕</button>
            </div>
            <div style="margin-bottom:14px;">
              <div style="font-size:13px;font-weight:600;color:#f1f5f9;margin-bottom:2px;">${escapeHtml(testTitle)}</div>
              <div style="font-size:11px;color:#94a3b8;display:flex;gap:8px;align-items:center;">
                <span style="font-family:monospace;background:rgba(255,255,255,0.06);padding:1px 5px;border-radius:3px;">${escapeHtml(shellCode || '-')}</span>
                <span>Type: <strong style="color:${testCat === 'EXAM' ? '#FF8C00' : '#818cf8'};">${testCat}</strong></span>
              </div>
            </div>
            <div style="margin-bottom:16px;">
              <label style="display:block;font-size:12px;font-weight:600;color:#cbd5e1;margin-bottom:6px;">Minimum Required Passing Score (%):</label>
              <div style="display:flex;gap:8px;margin-bottom:10px;">
                <button type="button" class="btn btn-secondary btn-sm" style="flex:1;font-size:12px;padding:6px 0;background:${curScore === 60 ? 'rgba(255,255,0,0.2)' : 'rgba(255,255,255,0.05)'};border-color:${curScore === 60 ? 'var(--grade-c)' : 'rgba(255,255,255,0.1)'};color:${curScore === 60 ? 'var(--grade-c)' : '#f8fafc'};" onclick="document.getElementById('quick-score-input').value = 60;">60% (Grade C)</button>
                <button type="button" class="btn btn-secondary btn-sm" style="flex:1;font-size:12px;padding:6px 0;background:${curScore === 70 ? 'rgba(56,189,248,0.2)' : 'rgba(255,255,255,0.05)'};border-color:${curScore === 70 ? '#38bdf8' : 'rgba(255,255,255,0.1)'};color:${curScore === 70 ? '#38bdf8' : '#f8fafc'};" onclick="document.getElementById('quick-score-input').value = 70;">70% (Task Pass)</button>
                <button type="button" class="btn btn-secondary btn-sm" style="flex:1;font-size:12px;padding:6px 0;background:${curScore === 80 ? 'rgba(149,255,0,0.2)' : 'rgba(255,255,255,0.05)'};border-color:${curScore === 80 ? 'var(--grade-b)' : 'rgba(255,255,255,0.1)'};color:${curScore === 80 ? 'var(--grade-b)' : '#f8fafc'};" onclick="document.getElementById('quick-score-input').value = 80;">80% (Grade B)</button>
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                <input id="quick-score-input" type="number" min="1" max="100" value="${curScore}" class="form-control" style="font-size:14px;font-weight:700;text-align:center;height:36px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.2);color:#38bdf8;" />
                <span style="font-size:14px;font-weight:700;color:#94a3b8;">%</span>
              </div>
              <div style="font-size:11px;color:#94a3b8;margin-top:6px;line-height:1.4;">
                * Standard Exams require <strong>60% (Grade C Enough)</strong> for level promotion eligibility.<br/>
                * Modular Formative Tasks default to <strong>70%</strong> for repetition mastery.
              </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.closeQuickEditModal()" style="font-size:12px;padding:6px 14px;">Cancel</button>
              <button type="button" class="btn btn-primary btn-sm" onclick="window.saveQuickEditPassingStandard('${test.id}')" style="font-size:12px;padding:6px 16px;background:#38bdf8;border-color:#38bdf8;color:#090D16;font-weight:700;">Save Standard</button>
            </div>
          </div>
        </div>
      `;
      const prev = document.getElementById('quick-edit-standard-overlay');
      if (prev) prev.remove();
      document.body.insertAdjacentHTML('beforeend', modalHtml);
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

        showToast(`Passing score updated to ${newScore}%.`, 'success');
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
              <button onclick="window.closeQuickEditModal()" style="background:transparent;border:none;color:#94a3b8;font-size:18px;cursor:pointer;">✕</button>
            </div>
            <div style="margin-bottom:14px;">
              <div style="font-size:14px;font-weight:700;color:#f1f5f9;">${escapeHtml(cls.name)}</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:2px;">
                ${classTests.length} Total Tests (${taskCount} Tasks, ${examCount} Exams)
              </div>
            </div>
            <div style="margin-bottom:16px;display:flex;flex-direction:column;gap:12px;">
              <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
                <label style="display:block;font-size:12px;font-weight:600;color:#818cf8;margin-bottom:4px;">Set All ${taskCount} Tasks Passing Score (%):</label>
                <div style="display:flex;align-items:center;gap:8px;">
                  <input id="batch-task-score" type="number" min="1" max="100" value="70" class="form-control" style="font-size:13px;font-weight:700;height:32px;background:rgba(0,0,0,0.3);width:90px;text-align:center;" />
                  <span style="font-size:12px;color:#cbd5e1;">% (Standard Formative Mastery)</span>
                </div>
              </div>
              <div style="background:rgba(255,255,255,0.03);padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.06);">
                <label style="display:block;font-size:12px;font-weight:600;color:#FF8C00;margin-bottom:4px;">Set All ${examCount} Exams Passing Score (%):</label>
                <div style="display:flex;align-items:center;gap:8px;">
                  <input id="batch-exam-score" type="number" min="1" max="100" value="60" class="form-control" style="font-size:13px;font-weight:700;height:32px;background:rgba(0,0,0,0.3);width:90px;text-align:center;" />
                  <span style="font-size:12px;color:#cbd5e1;">% (Standard TopsCore Grade C)</span>
                </div>
              </div>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:10px;border-top:1px solid rgba(255,255,255,0.08);padding-top:12px;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.closeQuickEditModal()" style="font-size:12px;padding:6px 14px;">Cancel</button>
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

      const searchQuery = (document.getElementById('classes-hub-search') ? document.getElementById('classes-hub-search').value : '').toLowerCase().trim();
      const searchedClasses = searchQuery
        ? filteredClasses.filter(c => {
            const prog = progMap.get(c.program_id);
            const inst = prog ? instMap.get(prog.institution_id) : (c.institution_id ? instMap.get(c.institution_id) : null);
            const cTests = testsByClass.get(c.id) || [];
            const matchesTest = cTests.some(t =>
              (t.title || '').toLowerCase().includes(searchQuery) ||
              (t.shell_code || '').toLowerCase().includes(searchQuery)
            );
            return (c.name || '').toLowerCase().includes(searchQuery) ||
                   (c.code || '').toLowerCase().includes(searchQuery) ||
                   (prog && (prog.name || '').toLowerCase().includes(searchQuery)) ||
                   (inst && (inst.name || '').toLowerCase().includes(searchQuery)) ||
                   matchesTest;
          })
        : filteredClasses;

      const getSortIcon = (key) => {
        const cur = window._classesHubSort || { key: 'name', asc: true };
        if (cur.key !== key) return '<span style="opacity:0.35;margin-left:4px;font-size:12px;">↕</span>';
        return cur.asc ? '<span style="color:var(--clr-primary,#6366f1);margin-left:4px;font-size:12px;">▲</span>' : '<span style="color:var(--clr-primary,#6366f1);margin-left:4px;font-size:12px;">▼</span>';
      };

      const sortClassList = (list) => {
        const { key, asc } = window._classesHubSort || { key: 'name', asc: true };
        return [...list].sort((a, b) => {
          let res = 0;
          if (key === 'name') {
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

      // Grid Layout Definition:
      // CLASS NAME | PROGRAM | CODE | STUDENTS | TASK | EXAM | STATUS | ACTIONS
      // TASK is positioned strictly BEFORE EXAM per user requirement!
      const gridTemplate = 'minmax(180px, 2fr) minmax(130px, 1.2fr) minmax(80px, 0.8fr) 85px 125px 125px 85px minmax(185px, 1.2fr)';

      const tableHeaderHtml = `
        <div class="classes-hub-grid-header" style="display:grid;grid-template-columns:${gridTemplate};gap:8px;padding:6px 12px;font-size:12px;font-weight:700;color:var(--fm-text-muted);text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid var(--fm-border-subtle);margin-bottom:4px;user-select:none;align-items:center;">
          <div style="cursor:pointer;" onclick="window.sortClassesHub('name')" title="Sort by Class Name">Class Name ${getSortIcon('name')}</div>
          <div style="cursor:pointer;" onclick="window.sortClassesHub('program')" title="Sort by Program">Program ${getSortIcon('program')}</div>
          <div style="text-align:center;cursor:pointer;" onclick="window.sortClassesHub('code')" title="Sort by Code">Code ${getSortIcon('code')}</div>
          <div style="text-align:center;cursor:pointer;" onclick="window.sortClassesHub('students')" title="Sort by Eligible Students">Students ${getSortIcon('students')}</div>
          <div style="text-align:center;cursor:pointer;color:#818cf8;" onclick="window.sortClassesHub('task')" title="Sort by Task Passing Standard">Task ${getSortIcon('task')}</div>
          <div style="text-align:center;cursor:pointer;color:#FF8C00;" onclick="window.sortClassesHub('exam')" title="Sort by Exam Passing Standard">Exam ${getSortIcon('exam')}</div>
          <div style="text-align:center;cursor:pointer;" onclick="window.sortClassesHub('status')" title="Sort by Status">Status ${getSortIcon('status')}</div>
          <div style="text-align:right;">Actions</div>
        </div>
      `;

      const buildClassRow = (cls) => {
        const prog = progMap.get(cls.program_id);
        const inst = prog ? instMap.get(prog.institution_id) : (cls.institution_id ? instMap.get(cls.institution_id) : null);
        const progName  = prog ? escapeHtml(prog.name) : '-- No Program --';
        const instLabel = inst ? '<span class="text-xs text-muted" style="margin-left:4px;">· ' + escapeHtml(inst.code || inst.name) + '</span>' : '';
        const isDimmed  = !cls.is_active ? 'tree-item-dimmed' : '';
        const effectiveCode = cls.code || (cls.name ? cls.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_') : '');
        const codeHtml  = effectiveCode
          ? '<span class="text-xs text-muted" style="font-family:monospace;">' + escapeHtml(effectiveCode) + '</span>'
          : '<span class="text-xs text-muted">-</span>';
        const eligibleCount = getEligibleStudentCountForClass(cls);
        const studentsHtml  = '<span style="color:#818cf8;font-size:12px;font-weight:400;display:inline-flex;align-items:center;gap:4px;" title="' + eligibleCount + ' students eligible to take this class">' + getSvgIcon('users', 12) + ' ' + eligibleCount + '</span>';

        // Class tests and passing standards
        const classTests = testsByClass.get(cls.id) || [];
        const tasks = classTests.filter(t => (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() !== 'EXAM');
        const exams = classTests.filter(t => (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() === 'EXAM');

        // Task passing badge (Task comes BEFORE Exam!)
        let taskHtml = '<span class="text-muted" style="font-size:12px;">-</span>';
        if (tasks.length > 0) {
          const taskScores = tasks.map(getTestMinScore);
          const minT = Math.min(...taskScores);
          const maxT = Math.max(...taskScores);
          const scoreLabel = minT === maxT ? `${minT}%` : `${minT}%–${maxT}%`;
          taskHtml = `
            <span style="color:#818cf8;font-size:12px;font-weight:400;display:inline-flex;align-items:center;gap:4px;" title="${tasks.length} Formative Tasks (Pass: ${scoreLabel})">
              ${scoreLabel} <span style="font-size:10px;opacity:0.8;">(${tasks.length})</span>
            </span>
          `;
        }

        // Exam passing badge
        let examHtml = '<span class="text-muted" style="font-size:12px;">-</span>';
        if (exams.length > 0) {
          const examScores = exams.map(getTestMinScore);
          const minE = Math.min(...examScores);
          const maxE = Math.max(...examScores);
          const scoreLabel = minE === maxE ? `${minE}%` : `${minE}%–${maxE}%`;
          examHtml = `
            <span style="color:#FF8C00;font-size:12px;font-weight:400;display:inline-flex;align-items:center;gap:4px;" title="${exams.length} Formal Exams (Pass: ${scoreLabel})">
              ${scoreLabel} <span style="font-size:10px;opacity:0.8;">(${exams.length})</span>
            </span>
          `;
        }

        const isVocab = (cls.name || '').toLowerCase().includes('vocab');
        const vocabBtnHtml = isVocab
          ? '<button class="btn btn-secondary btn-sm" style="padding:3px 7px;font-size:12px;border-color:rgba(99,102,241,0.3);color:#818cf8;" title="Open Vocabulary Vault for this class" onclick="window.openVocabVaultFromClassHub(\'' + (cls.program_id || '') + '\')">Vault</button>'
          : '';

        const isExpanded = window._classesHubExpandedTests.has(cls.id);

        // Tests Drawer HTML: Tasks BEFORE Exams per user requirement!
        let drawerHtml = '';
        if (isExpanded) {
          if (classTests.length === 0) {
            drawerHtml = `
              <div style="padding:10px 14px;background:rgba(0,0,0,0.25);border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#94a3b8;text-align:center;">
                No tests assigned to this class yet.
              </div>
            `;
          } else {
            // Sort: Tasks first, then Exams second!
            const sortedDrawerTests = [...classTests].sort((a, b) => {
              const isExamA = (a.category || (a.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() === 'EXAM';
              const isExamB = (b.category || (b.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() === 'EXAM';
              if (isExamA !== isExamB) return isExamA ? 1 : -1; // Tasks first!
              return (a.title || '').localeCompare(b.title || '');
            });

            const rowsHtml = sortedDrawerTests.map(t => {
              const score = getTestMinScore(t);
              const gi = getGradeInfoForScore(score);
              const isExam = (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() === 'EXAM';
              const typeBadge = isExam
                ? `<span style="color:#FF8C00;font-size:11px;font-weight:600;text-shadow:none;">EXAM</span>`
                : `<span style="color:#818cf8;font-size:11px;font-weight:600;text-shadow:none;">TASK</span>`;

              const shellCode = t.shell_code || t.payload?.shell_code || '-';
              const moduleName = t.payload?.answer_type || t.module_type || t.answer_type || 'Core';
              const questionCount = t.payload?.snapshot_question_count || t.payload?.total_questions || '-';

              return `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.15s ease;">
                  <td style="padding:6px 12px;font-family:monospace;font-size:11px;color:#cbd5e1;">${escapeHtml(shellCode)}</td>
                  <td style="padding:6px 12px;font-size:12px;font-weight:600;color:#f8fafc;">${escapeHtml(t.title || 'Untitled Test')}</td>
                  <td style="padding:6px 12px;text-align:center;">${typeBadge}</td>
                  <td style="padding:6px 12px;text-align:center;font-size:11px;color:#94a3b8;text-transform:capitalize;">${escapeHtml(moduleName)}</td>
                  <td style="padding:6px 12px;text-align:center;font-size:12px;color:#cbd5e1;">${escapeHtml(String(questionCount))}</td>
                  <td style="padding:6px 12px;text-align:center;">
                    <span style="color:${gi.color};font-size:12px;font-weight:600;text-shadow:none;">
                      ${score}% · Grade ${gi.grade} (${gi.label})
                    </span>
                  </td>
                  <td style="padding:6px 12px;text-align:right;">
                    <div class="d-flex align-center gap-1" style="justify-content:flex-end;">
                      <button class="btn btn-secondary btn-sm" style="font-size:11px;padding:2px 7px;border-color:rgba(56,189,248,0.4);color:#38bdf8;" onclick="window.openQuickEditPassingStandard('${t.id}')" title="Adjust Passing Score">
                        Edit Standard
                      </button>
                      <button class="btn btn-ghost btn-sm edit-mode-only" style="font-size:11px;padding:2px 5px;" onclick="window.openClassesHubEdit('tests', '${t.id}')" title="Full Test Settings">
                        ${getSvgIcon('settings', 12)}
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('');

            drawerHtml = `
              <div style="padding:8px 12px;background:rgba(0,0,0,0.3);border-top:1px solid rgba(255,255,255,0.08);">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                  <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">
                    Tests & Passing Standards for ${escapeHtml(cls.name)} (${tasks.length} Tasks, ${exams.length} Exams)
                  </div>
                  <button class="btn btn-secondary btn-sm" style="font-size:11px;padding:2px 8px;color:var(--grade-b);border-color:rgba(149,255,0,0.3);" onclick="window.openBatchAlignStandards('${cls.id}')">
                    Batch Align Standards
                  </button>
                </div>
                <div style="border:1px solid rgba(255,255,255,0.08);border-radius:6px;overflow:hidden;background:#090D16;">
                  <table style="width:100%;border-collapse:collapse;text-align:left;">
                    <thead>
                      <tr style="background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.1);font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">
                        <th style="padding:6px 12px;width:140px;">Shell Code</th>
                        <th style="padding:6px 12px;">Test Title</th>
                        <th style="padding:6px 12px;text-align:center;width:80px;">Type</th>
                        <th style="padding:6px 12px;text-align:center;width:90px;">Module</th>
                        <th style="padding:6px 12px;text-align:center;width:70px;">Questions</th>
                        <th style="padding:6px 12px;text-align:center;width:160px;">Passing Standard</th>
                        <th style="padding:6px 12px;text-align:right;width:130px;">Action</th>
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
        }

        return `
          <div style="border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.15s ease;">
            <div class="classes-hub-grid-row ${isDimmed}" style="display:grid;grid-template-columns:${gridTemplate};gap:8px;padding:6px 12px;align-items:center;font-size:12px;">
              <!-- 1. CLASS NAME -->
              <div class="d-flex align-center gap-2" style="min-width:0;">
                <span style="display:inline-flex;align-items:center;">${typeof getClassSvgIcon === 'function' ? getClassSvgIcon(cls.name, 16, '#818cf8') : ''}</span>
                <span class="text-truncate" style="font-weight:600;font-size:12px;color:var(--fm-text-primary);" title="${escapeHtml(cls.name)}">${escapeHtml(cls.name)}</span>
              </div>
              <!-- 2. PROGRAM -->
              <div class="d-flex align-center text-truncate"><span class="text-xs" style="color:var(--fm-text-secondary);">${progName}</span>${instLabel}</div>
              <!-- 3. CODE -->
              <div style="text-align:center;">${codeHtml}</div>
              <!-- 4. STUDENTS -->
              <div style="text-align:center;">${studentsHtml}</div>
              <!-- 5. TASK (BEFORE EXAM!) -->
              <div style="text-align:center;">${taskHtml}</div>
              <!-- 6. EXAM -->
              <div style="text-align:center;">${examHtml}</div>
              <!-- 7. STATUS -->
              <div style="text-align:center;">
                <span style="cursor:pointer;font-size:12px;font-weight:600;color:${cls.is_active ? 'var(--grade-a)' : 'var(--grade-e)'};text-shadow:none;" onclick="window.toggleClassesHubEntity('classes','${cls.id}',${!cls.is_active})" title="Click to ${cls.is_active ? 'deactivate' : 'activate'} this class">
                  ${cls.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <!-- 8. ACTIONS -->
              <div class="tree-actions-right" style="justify-content:flex-end;gap:4px;">
                ${classTests.length > 0 ? `
                  <button class="btn btn-secondary btn-sm" style="padding:3px 7px;font-size:11px;display:inline-flex;align-items:center;gap:3px;" onclick="window.toggleClassesHubTests('${cls.id}')" title="Inspect Tests">
                    <span>${isExpanded ? 'Hide' : 'Inspect'}</span>
                    <span style="font-size:9px;">${isExpanded ? '▲' : '▼'}</span>
                  </button>
                ` : ''}
                ${!cls.is_active ? `
                  <button class="btn btn-sm btn-activate-class" style="padding:3px 9px;font-size:11px;color:var(--grade-a);border:1px solid rgba(0,192,0,0.4);background:rgba(0,192,0,0.12);font-weight:700;display:inline-flex;align-items:center;gap:4px;cursor:pointer;border-radius:4px;" onclick="window.toggleClassesHubEntity('classes','${cls.id}',true)" title="Activate this class">
                    ${getSvgIcon('check-circle', 11)} Activate
                  </button>
                ` : `
                  <button class="btn btn-secondary btn-sm" style="padding:3px 8px;font-size:11px;color:var(--fm-text-muted);border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);font-weight:500;display:inline-flex;align-items:center;gap:3px;cursor:pointer;border-radius:4px;" onclick="window.toggleClassesHubEntity('classes','${cls.id}',false)" title="Deactivate this class">
                    Deactivate
                  </button>
                `}
                ${vocabBtnHtml}
                <button class="btn btn-secondary btn-sm edit-mode-only" style="padding:3px 8px;font-size:12px;" onclick="window.openClassesHubEdit('classes','${cls.id}')">Edit</button>
                <button class="btn btn-danger btn-sm edit-mode-only"    style="padding:3px 7px;font-size:12px;" onclick="window.deleteClassesHubRecord('classes','${cls.id}','${escapeHtml(cls.name)}')">Delete</button>
              </div>
            </div>
            ${drawerHtml}
          </div>
        `;
      };

      let levelGroupsHtml = '';
      const assignedClassIds = new Set();

      activeLevels.forEach(function(level) {
        const rawLevelClasses = searchedClasses
          .filter(c => c.level_id === level.id || classLevelPairs.has(c.id + '_' + level.id));
        const levelClasses = sortClassList(rawLevelClasses);

        levelClasses.forEach(c => assignedClassIds.add(c.id));

        if (levelClasses.length === 0 && searchQuery) return;

        const isExpanded = window._classesHubExpandedLevels.has(level.id) || Boolean(searchQuery);
        const levelLabel = escapeHtml(level.name || ('Level ' + level.level_number));

        let bodyHtml = '';
        if (isExpanded) {
          if (levelClasses.length === 0) {
            bodyHtml = '<div class="classes-hub-empty-level">No classes in this level yet. Click <strong>+ Add Class</strong> to create one.</div>';
          } else {
            let rowsHtml = '';
            levelClasses.forEach(function(cls) {
              rowsHtml += buildClassRow(cls);
            });
            bodyHtml = tableHeaderHtml + rowsHtml;
          }
        }

        levelGroupsHtml += '<div class="classes-hub-level-group" style="border:2px solid rgba(255,255,255,0.1);border-radius:8px;background:var(--fm-bg-panel);margin-bottom:10px;overflow:hidden;">' +
          '<div class="classes-hub-level-header" onclick="window.toggleClassesHubLevel(\'' + level.id + '\')">' +
            '<div class="d-flex align-center gap-2">' +
              '<span class="classes-hub-collapse-icon">' + (isExpanded ? '▼' : '▶') + '</span>' +
              '<span class="classes-hub-level-badge">L' + (level.level_number !== undefined ? level.level_number : '?') + '</span>' +
              '<span style="font-weight:700;font-size:16px;color:var(--fm-text-primary);">' + levelLabel + '</span>' +
              '<span style="color:#818cf8;font-size:12px;font-weight:600;text-shadow:none;">' + levelClasses.length + ' ' + (levelClasses.length === 1 ? 'Class' : 'Classes') + '</span>' +
            '</div>' +
            '<div class="tree-actions-right" onclick="event.stopPropagation()">' +
              '<button class="btn btn-primary btn-sm edit-mode-only"   style="font-size:12px;padding:4px 9px;" onclick="window.openClassesHubAddClass(\'' + level.id + '\')">+ Add Class</button>' +
              '<button class="btn btn-secondary btn-sm edit-mode-only" style="font-size:12px;padding:4px 8px;display:inline-flex;align-items:center;gap:4px;" onclick="window.openClassesHubEdit(\'levels\',\'' + level.id + '\')">' + getSvgIcon('edit', 12) + ' Edit</button>' +
              '<button class="btn btn-danger btn-sm edit-mode-only"    style="font-size:12px;padding:4px 7px;" onclick="window.deleteClassesHubRecord(\'levels\',\'' + level.id + '\',\'' + levelLabel + '\')">' + getSvgIcon('trash', 12) + '</button>' +
            '</div>' +
          '</div>' +
          (isExpanded ? '<div class="classes-hub-level-body" style="padding:0;">' + bodyHtml + '</div>' : '') +
        '</div>';
      });

      // Unassigned classes safeguard
      const rawUnassigned = searchedClasses
        .filter(c => !assignedClassIds.has(c.id));
      const unassignedClasses = sortClassList(rawUnassigned);

      if (unassignedClasses.length > 0) {
        const isExpandedUnassigned = window._classesHubExpandedLevels.has('unassigned') || Boolean(searchQuery);
        let unassignedBodyHtml = '';
        if (isExpandedUnassigned) {
          let rowsHtml = '';
          unassignedClasses.forEach(function(cls) {
            rowsHtml += buildClassRow(cls);
          });
          unassignedBodyHtml = tableHeaderHtml + rowsHtml;
        }

        levelGroupsHtml += '<div class="classes-hub-level-group" style="border:2px solid rgba(var(--grade-c-rgb),0.25);border-radius:8px;background:var(--fm-bg-panel);margin-bottom:10px;overflow:hidden;">' +
          '<div class="classes-hub-level-header" style="background:rgba(var(--grade-c-rgb),0.06);border-bottom-color:rgba(var(--grade-c-rgb),0.18);" onclick="window.toggleClassesHubLevel(\'unassigned\')">' +
            '<div class="d-flex align-center gap-2">' +
              '<span class="classes-hub-collapse-icon">' + (isExpandedUnassigned ? '▼' : '▶') + '</span>' +
              '<span class="classes-hub-level-badge" style="background:rgba(var(--grade-c-rgb),0.2);color:var(--grade-c);border-color:rgba(var(--grade-c-rgb),0.4);">L?</span>' +
              '<span style="font-weight:700;font-size:16px;color:var(--fm-text-primary);">Unassigned Level</span>' +
              '<span style="color:var(--grade-c);font-size:12px;font-weight:600;text-shadow:none;">' + unassignedClasses.length + ' ' + (unassignedClasses.length === 1 ? 'Class' : 'Classes') + '</span>' +
            '</div>' +
            '<div class="tree-actions-right" onclick="event.stopPropagation()">' +
              '<button class="btn btn-secondary btn-sm edit-mode-only" style="font-size:12px;padding:4px 9px;" onclick="window.openClassesHubAddClass(null)">+ Add Class</button>' +
            '</div>' +
          '</div>' +
          (isExpandedUnassigned ? '<div class="classes-hub-level-body" style="padding:0;">' + unassignedBodyHtml + '</div>' : '') +
        '</div>';
      }

      area.innerHTML = '<div>' +
        '<div class="hub-toolbar mb-3" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">' +
          '<div class="hub-toolbar-search" style="flex:1;max-width:440px;">' +
            '<span style="color:var(--fm-text-muted);font-size:12px;display:inline-flex;align-items:center;">' + getSvgIcon('search', 12) + '</span>' +
            '<input type="text" id="classes-hub-search" class="form-control" placeholder="Search classes, codes, programs, or test standards..." value="' + escapeHtml(searchQuery) + '" style="padding:5px 10px;font-size:12px;height:32px;background:rgba(0,0,0,0.2);" />' +
          '</div>' +
          '<div class="d-flex align-center gap-2">' +
            '<span class="text-xs text-muted">' + filteredClasses.length + ' Classes · ' + activeLevels.length + ' Levels</span>' +
            '<button class="btn btn-secondary btn-sm" onclick="window.openVocabVaultFromClassHub()" style="font-size:12px;padding:4px 9px;" title="Open Topic Blueprint & Vocabulary Vault">Open Vault</button>' +
            '<button class="btn btn-primary btn-sm edit-mode-only" onclick="window.openClassesHubAddLevel()" style="font-size:12px;padding:4px 9px;">+ Add Level</button>' +
          '</div>' +
        '</div>' +
        '<div id="classes-hub-container">' +
          (activeLevels.length === 0 && unassignedClasses.length === 0
            ? '<div class="empty-state"><p>No levels defined yet.</p><button class="btn btn-primary mt-2 edit-mode-only" onclick="window.openClassesHubAddLevel()">+ Create First Level</button></div>'
            : levelGroupsHtml.trim() === ''
              ? '<div class="empty-state"><p>No classes match your search.</p></div>'
              : levelGroupsHtml) +
        '</div>' +
      '</div>';

      const searchInp = document.getElementById('classes-hub-search');
      if (searchInp) {
        searchInp.addEventListener('input', function() {
          renderView();
          const inp = document.getElementById('classes-hub-search');
          if (inp) {
            inp.focus();
            inp.selectionStart = inp.selectionEnd = inp.value.length;
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
