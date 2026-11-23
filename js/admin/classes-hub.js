import {
  adminFetchAll,
  adminUpdate,
  fetchClassTestSettings,
  saveClassTestSettings,
  toShortLevel,
  fetchDisciplineGovernance,
  saveDisciplineGovernance,
  DEFAULT_DISCIPLINE_GOVERNANCE
} from '../api.js?v=20261124_v681';
import { showToast, escapeHtml } from '../app.js?v=20261106_v160';
import { detectClassDiscipline, INSTITUTION_GRADING_SCALES, TOPSCORE_COLORS, calculateGrade, getGradeColorByScore } from '../grading.js?v=20261106_v160';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';

export async function renderClassesHub(area) {
  if (!area.querySelector('.classes-hub-container') && !area.querySelector('.curriculum-hub-container')) {
    area.innerHTML = typeof window.getLoadingStateHtml === 'function'
      ? window.getLoadingStateHtml('Loading Curriculum Hub...')
      : '<div class="topscore-loading-center"><div class="spinner"></div><p class="loading-text">Loading Curriculum Hub...</p></div>';
  }

  try {
    const [institutions, programs, classes, levels, classLevels, students, batches, tests, vaultWords] = await Promise.all([
      adminFetchAll('institutions', 'id, name, code, is_active, deleted_at'),
      adminFetchAll('programs',    'id, name, code, institution_id, is_active, deleted_at'),
      adminFetchAll('classes',     'id, name, code, is_active, program_id, level_id, institution_id, deleted_at'),
      adminFetchAll('levels',      'id, name, level_number'),
      adminFetchAll('class_levels', 'class_id, level_id').catch(() => []),
      adminFetchAll('students',    'id, name, program_id, batch_id, level_id, is_active, deleted_at').catch(() => []),
      adminFetchAll('batches',     'id, program_id, current_level_id, is_active, deleted_at').catch(() => []),
      adminFetchAll('tests',       'id, title, category, test_type, class_id, level_id, minimum_required_score, question_order, payload, status, deleted_at').catch(() => []),
      adminFetchAll('vocabulary_vault', 'target_level, deleted_at').catch(() => [])
    ]);

    const activeInsts   = (institutions || []).filter(i => !i.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const activeProgs   = (programs    || []).filter(p => !p.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const activeClasses = (classes     || []).filter(c => !c.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const activeLevels  = (levels      || []).sort((a, b) => (a.level_number || 0) - (b.level_number || 0));
    const activeTests   = (tests       || []).filter(t => !t.deleted_at);

    const batchMap   = new Map((batches || []).filter(b => !b.deleted_at).map(b => [b.id, b]));
    const activeStudents = (students || []).filter(s => !s.deleted_at && s.is_active !== false && s.program_status !== 'ALUMNI');

    // Live Vocabulary Vault target_level counts
    const vaultCountsByLevel = { 0: 0, 1: 0, 2: 0, 3: 0, total: 0 };
    (vaultWords || []).filter(w => !w.deleted_at).forEach(v => {
      const lvl = v.target_level != null ? Number(v.target_level) : 0;
      if (vaultCountsByLevel[lvl] != null) vaultCountsByLevel[lvl]++;
      vaultCountsByLevel.total++;
    });

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

    window._classesHubRecords = {};
    activeInsts.forEach(r   => window._classesHubRecords[r.id] = r);
    activeProgs.forEach(r   => window._classesHubRecords[r.id] = r);
    activeClasses.forEach(r => window._classesHubRecords[r.id] = r);
    activeLevels.forEach(r  => window._classesHubRecords[r.id] = r);
    activeTests.forEach(r   => window._classesHubRecords[r.id] = r);

    // Default UI states
    if (!window._classesHubActiveTenant) window._classesHubActiveTenant = 'CEC'; // 'CEC' | 'TOP'
    if (!window._classesHubActiveInst) window._classesHubActiveInst = 'all'; // 'all' | instId
    if (!window._classesHubDiscipline) window._classesHubDiscipline = 'VOCABULARY'; // 'VOCABULARY' | 'BASIC_ENGLISH' | 'SPEAKING' | 'STORYTELLING' | 'ALL_CLASSES'
    if (!window._classesHubExpandedLevels || window._classesHubExpandedLevels.size === 0) {
      window._classesHubExpandedLevels = new Set(activeLevels.map(l => l.id));
      window._classesHubExpandedLevels.add('unassigned');
    }
    if (!window._classesHubExpandedTests) {
      window._classesHubExpandedTests = new Set();
    }

    // Discipline definitions & configuration metadata
    const DISCIPLINE_TABS = [
      {
        key: 'VOCABULARY',
        name: 'Vocabulary',
        badge: 'Tiered Discipline (L1–L3 + Non-Level)',
        icon: 'book',
        color: '#c084fc',
        description: 'One continuous tiered discipline sharing identical systemic rules across all levels (1st, 2nd, 3rd, Non-Level): 7×7 repetitive mastery, 4 themes (A–D), and exclusive Vocabulary Vault data binding.',
        levels: ['1st Level', '2nd Level', '3rd Level', 'Non-Level'],
        skus: ['CAMP-1VOCAB', 'CAMP-2VOCAB', 'CAMP-3VOCAB', 'EVNK-VOCAB', 'SHRT-VOCAB', 'TPTC-VOCAB'],
        exclusiveModules: ['Vocabulary Mastery - Recognition (10s)', 'Vocabulary Mastery - Spoken (10s)', 'Vocabulary Mastery - Written (15s)'],
        dataSourceLabel: 'Vocabulary Vault (Direct DB Link)'
      },
      {
        key: 'BASIC_ENGLISH',
        name: 'Basic English',
        badge: 'Foundation Discipline',
        icon: 'camera',
        color: '#38bdf8',
        description: 'Elementary English foundations: Grammar structure, sentence formation, and turn-based photo description.',
        levels: ['1st Level', 'Foundation'],
        skus: ['CAMP-1BASIC', 'EVNK-BASIC', 'SHRT-BASIC', 'TPTC-BASIC'],
        exclusiveModules: ['Basic English - Description (M1)'],
        dataSourceLabel: 'Item Bank (Basic English Repository)'
      },
      {
        key: 'SPEAKING',
        name: 'Speaking',
        badge: 'Oral Performance & Speech',
        icon: 'mic',
        color: '#95ff00',
        description: 'Speech fluency, audio dialogue turn-taking, and pronunciation evaluation.',
        levels: ['2nd Level', 'Intermediate Speech'],
        skus: ['CAMP-2SPEAK', 'EVNK-SPEAK', 'SHRT-SPEAK', 'TPTC-SPEAK'],
        exclusiveModules: ['Public Speaking (M5, M7)'],
        dataSourceLabel: 'Item Bank (Public Speaking Topics)'
      },
      {
        key: 'STORYTELLING',
        name: 'Storytelling',
        badge: 'Narrative & Comprehension',
        icon: 'film',
        color: '#FF8C00',
        description: 'Story comprehension, audio narrative retelling, and contextual expression.',
        levels: ['1st Level', 'Narrative Performance'],
        skus: ['CAMP-1STORY', 'EVNK-STORY', 'SHRT-STORY', 'TPTC-STORY'],
        exclusiveModules: ['Storytelling (M6)'],
        dataSourceLabel: 'Item Bank (Story Audio & Scripts)'
      },
      {
        key: 'ALL_CLASSES',
        name: 'Master Directory',
        badge: 'All Institutions & Classes',
        icon: 'globe',
        color: '#cbd5e1',
        description: 'Comprehensive multi-institution inventory and cross-program class directory.',
        levels: ['All Levels'],
        skus: ['All SKUs'],
        exclusiveModules: ['All Engines'],
        dataSourceLabel: 'Central Database'
      }
    ];

    // Switch dual-tenant bilah (CEC vs TOP)
    window.switchClassesHubTenant = (tenant) => {
      window._classesHubActiveTenant = tenant;
      renderView();
    };

    // Switch institution filter tab
    window.switchClassesHubInst = (instId) => {
      window._classesHubActiveInst = instId;
      renderView();
    };

    // Switch discipline filter tab (called from Top Panel Topbar Tabs)
    window.switchClassesHubDiscipline = (discKey) => {
      window._classesHubDiscipline = discKey;
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

    window.openVocabVaultFromClassHub = () => {
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

    // Open specific class workstation directly
    window.openClassWorkstation = (classId) => {
      window._selectedClassId = classId;
      try {
        sessionStorage.setItem('topscore_current_class_context', JSON.stringify({ classId }));
      } catch (_) {}
      if (typeof window.loadSection === 'function') {
        window.loadSection('class-hub');
      } else {
        window.location.hash = '#class-hub';
      }
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

    // Save Vocabulary Governance from inline workspace panel inputs
    window.saveVocabGovInline = async () => {
      const taskScoreInp = document.getElementById('gov-inline-task-score');
      const examScoreInp = document.getElementById('gov-inline-exam-score');
      const taskDurInp = document.getElementById('gov-inline-task-dur');
      const examDurInp = document.getElementById('gov-inline-exam-dur');

      const taskMinScore = Math.max(1, Math.min(100, parseInt(taskScoreInp?.value, 10) || 60));
      const examMinScore = Math.max(1, Math.min(100, parseInt(examScoreInp?.value, 10) || 60));
      const taskDuration = Math.max(1, parseInt(taskDurInp?.value, 10) || 11);
      const examDuration = Math.max(1, parseInt(examDurInp?.value, 10) || 54);
      const taskOrderInp = document.getElementById('gov-inline-task-order');
      const examOrderInp = document.getElementById('gov-inline-exam-order');
      const taskOrder = taskOrderInp?.value === 'sequential' ? 'sequential' : 'random';
      const examOrder = examOrderInp?.value === 'sequential' ? 'sequential' : 'random';

      // Read per-modality pacing
      const pwWritten     = Math.max(1, parseInt(document.getElementById('pacing-words-written')?.value, 10) || 15);
      const pwRecognition = Math.max(1, parseInt(document.getElementById('pacing-words-recognition')?.value || document.getElementById('pacing-words-selection')?.value, 10) || 10);
      const pwSpoken      = Math.max(1, parseInt(document.getElementById('pacing-words-spoken')?.value, 10) || 10);

      const ppWritten     = Math.max(1, parseInt(document.getElementById('pacing-phrases-written')?.value, 10) || 25);
      const ppRecognition = Math.max(1, parseInt(document.getElementById('pacing-phrases-recognition')?.value || document.getElementById('pacing-phrases-selection')?.value, 10) || 10);
      const ppSpoken      = Math.max(1, parseInt(document.getElementById('pacing-phrases-spoken')?.value, 10) || 20);

      const wordsPacing = { written: pwWritten, recognition: pwRecognition, selection: pwRecognition, spoken: pwSpoken };
      const phrasesPacing = { written: ppWritten, recognition: ppRecognition, selection: ppRecognition, spoken: ppSpoken };

      showToast('Saving Vocabulary Governance Standards & Syncing...', 'info');

      try {
        await saveDisciplineGovernance('VOCABULARY', {
          taskMinScore,
          examMinScore,
          taskDuration,
          examDuration,
          taskOrder,
          examOrder,
          wordsPacing,
          phrasesPacing
        });

        // Synchronize all vocabulary classes
        const discClasses = activeClasses.filter(c => detectClassDiscipline(c) === 'VOCABULARY');
        for (const cls of discClasses) {
          try {
            const curSettings = await fetchClassTestSettings(cls.id);
            await saveClassTestSettings(cls.id, {
              ...curSettings,
              taskMinScore,
              examMinScore,
              taskQuestionOrder: taskOrder,
              examQuestionOrder: examOrder
            }, false);
          } catch (_) {}

          const clsTests = testsByClass.get(cls.id) || [];
          if (clsTests.length > 0) {
            await Promise.all(clsTests.map(t => {
              const isExam = (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() === 'EXAM';
              const targetScore = isExam ? examMinScore : taskMinScore;
              const targetOrder = isExam ? examOrder : taskOrder;
              const updatedPayload = { ...(t.payload || {}) };
              updatedPayload.minimum_required_score = targetScore;
              updatedPayload.min_score = targetScore;
              updatedPayload.question_order = targetOrder;
              t.minimum_required_score = targetScore;
              t.question_order = targetOrder;
              t.payload = updatedPayload;
              return adminUpdate('tests', t.id, {
                minimum_required_score: targetScore,
                question_order: targetOrder,
                payload: updatedPayload
              });
            }));
          }
        }

        const modalEl = document.getElementById('modal-vocab-discipline-rules');
        if (modalEl) modalEl.remove();

        showToast(`Vocabulary standards synced across ${discClasses.length} classes!`, 'success');
        renderView();
      } catch (err) {
        showToast('Failed to save governance standards: ' + (err?.message || err), 'error');
      }
    };

    // Main Renderer (Strict Zero Scrolling & 100vh Single-Screen Lock)
    const renderView = async () => {
      const activeTenant = window._classesHubActiveTenant || 'CEC';
      const viewMode = window._classesHubViewMode || 'CARDS'; // 'CARDS' | 'TABLE'
      const activeStepFilter = window._classesHubActiveStepFilter || 'ALL'; // 'ALL' | 1 | 2 | 3

      const isCecClass = (c) => {
        const prog = progMap.get(c.program_id);
        const inst = prog ? instMap.get(prog.institution_id) : (c.institution_id ? instMap.get(c.institution_id) : null);
        const instCode = (inst?.code || inst?.name || '').toUpperCase();
        const progName = (prog?.name || prog?.code || '').toUpperCase();
        const className = (c.name || c.code || '').toUpperCase();
        return instCode === 'CEC' || progName.includes('CAMP') || className.includes('CAMP');
      };

      const cecClasses = activeClasses.filter(isCecClass);
      const topClasses = activeClasses.filter(c => !isCecClass(c));
      const tenantClasses = activeTenant === 'CEC' ? cecClasses : topClasses;

      // ── Top Panel: Dual-Tenant Bilah Tabs (CEC vs TOP) ────
      const tenantTopTabs = [
        {
          id: 'CEC',
          label: 'CEC — Cake English Course',
          icon: getSvgIcon('book', 14),
          val: cecClasses.length,
          valColor: '#ff2d87',
          badge: 'Camp Step 1–3'
        },
        {
          id: 'TOP',
          label: 'TOP — Top Occupational Program',
          icon: getSvgIcon('award', 14),
          val: topClasses.length,
          valColor: '#38bdf8',
          badge: 'Vocational Level 0'
        }
      ];

      if (window.setTopbarTabs) {
        window.setTopbarTabs(tenantTopTabs, activeTenant, 'window.switchClassesHubTenant');
      }

      window.toggleClassesHubView = () => {
        window._classesHubViewMode = window._classesHubViewMode === 'TABLE' ? 'CARDS' : 'TABLE';
        renderView();
      };

      window.setClassesHubStepFilter = (stepVal) => {
        window._classesHubActiveStepFilter = stepVal;
        renderView();
      };

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
          return (c.name || '').toLowerCase().includes(query) ||
                 (c.code || '').toLowerCase().includes(query) ||
                 (prog && (prog.name || '').toLowerCase().includes(query)) ||
                 (inst && (inst.name || '').toLowerCase().includes(query)) ||
                 lvlName.includes(query) ||
                 lvlNum === query;
        });
      };

      const searchedClasses = filterClassesList(tenantClasses, searchQuery);

      const getSortIcon = (key) => {
        const cur = window._classesHubSort || { key: 'level', asc: true };
        if (cur.key !== key) return '';
        return cur.asc ? '<span style="color:var(--primary-tactical, #38bdf8);margin-left:4px;font-size:12px;">▲</span>' : '<span style="color:var(--primary-tactical, #38bdf8);margin-left:4px;font-size:12px;">▼</span>';
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

      const sortedClasses = sortClassList(searchedClasses);

      // Format class code: strictly PROGRAM-LEVELCLASS SSOT (e.g. CAMP-3VOCAB, CAMP-1BASIC, EVNK-VOCAB)
      const getStandardClassCode = (c, levelObj, progObj) => {
        if (c.code) return c.code;
        const rawName = (c.name || '').toUpperCase();
        let progAbbr = 'CAMP';
        if (rawName.includes('CAMP') || (progObj && (progObj.name || '').toUpperCase().includes('CAMP'))) {
          progAbbr = 'CAMP';
        } else if (rawName.includes('EVNIKOM') || (progObj && (progObj.name || '').toUpperCase().includes('EVNIKOM'))) {
          progAbbr = 'EVNK';
        } else if (rawName.includes('SHERATON') || (progObj && (progObj.name || '').toUpperCase().includes('SHERATON'))) {
          progAbbr = 'SHRT';
        } else if (rawName.includes('TAMATA') || (progObj && (progObj.name || '').toUpperCase().includes('TAMATA'))) {
          progAbbr = 'TPTC';
        } else if (progObj && progObj.code) {
          progAbbr = progObj.code.length >= 4 ? progObj.code.slice(0, 4).toUpperCase() : progObj.code.toUpperCase();
        }

        let lNum = levelObj?.level_number;
        if (lNum === 0 || (levelObj?.name || '').toLowerCase() === 'non-level') {
          lNum = '';
        } else if (!lNum) {
          if (rawName.includes('1ST')) lNum = 1;
          else if (rawName.includes('2ND')) lNum = 2;
          else if (rawName.includes('3RD')) lNum = 3;
          else lNum = '';
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

        return `${progAbbr}-${lNum}${classAbbr}`;
      };

      // ── 1. Compact Official Grading System Standard Card (~68px) ────
      const gradingScale = INSTITUTION_GRADING_SCALES[activeTenant] || INSTITUTION_GRADING_SCALES.CEC;
      const gradingCardHtml = `
        <div style="background:#0F172A; border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:6px 10px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:${activeTenant === 'CEC' ? '#ff2d87' : '#38bdf8'};"></span>
              <span style="font-size:11px; font-weight:800; color:${activeTenant === 'CEC' ? '#ff2d87' : '#38bdf8'}; text-transform:uppercase; letter-spacing:0.04em;">1. Official ${activeTenant} Grading System Standard</span>
            </div>
            <span style="font-size:9px; font-weight:800; color:#94a3b8; background:rgba(255,255,255,0.08); padding:1px 5px; border-radius:3px; text-transform:uppercase;">SSOT Standard</span>
          </div>
          <div style="display:grid; grid-template-columns:repeat(6, 1fr); gap:6px;">
            ${gradingScale.map(g => `
              <div style="background:#090D16; border:1px solid rgba(255,255,255,0.08); border-top:2px solid ${g.color}; border-radius:4px; padding:4px 4px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:1px;">
                <div style="display:flex; align-items:center; gap:3px;">
                  <span style="font-family:var(--fm-font-mono, monospace); font-size:13px; font-weight:900; line-height:1; color:${g.color};">${g.symbol}</span>
                  <span style="font-family:var(--fm-font-mono, monospace); font-size:11px; font-weight:700; color:#f8fafc;">${g.label}</span>
                </div>
                <span style="font-size:9px; font-weight:800; text-transform:uppercase; color:${g.color}; letter-spacing:0.03em;">${g.predicate}</span>
                <span style="font-size:8px; color:#94a3b8; line-height:1; white-space:nowrap;">${g.note}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      // ── 2. Compact Step Composite Scoring & Rules Card (~68px) ────
      const stepScoringCardHtml = activeTenant === 'CEC' ? `
        <div style="background:#0F172A; border:1px solid rgba(255,45,135,0.25); border-radius:6px; padding:6px 10px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:11px; font-weight:800; color:#ff2d87; text-transform:uppercase; letter-spacing:0.04em;">2. Step Composite Scoring &amp; Promotion Rules</span>
            <span style="font-size:9px; font-weight:800; color:#ff2d87; background:rgba(255,45,135,0.12); border:1px solid rgba(255,45,135,0.3); padding:1px 5px; border-radius:3px; text-transform:uppercase;">Tiered Steps 1–3</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <div style="background:#090D16; border-left:2px solid #ff2d87; border-radius:0 4px 4px 0; padding:4px 6px; font-size:10px; line-height:1.3; color:#cbd5e1;">
              <strong style="color:#f8fafc;">Passing Standard:</strong> Step Composite Average <strong style="color:#ffff00;">&ge; 60% (Grade C)</strong> with zero unresolved fails.
            </div>
            <div style="background:#090D16; border-left:2px solid #38bdf8; border-radius:0 4px 4px 0; padding:4px 6px; font-size:10px; line-height:1.3; color:#cbd5e1;">
              <strong style="color:#f8fafc;">Formula:</strong> <code>Avg(Milestone Exams)</code>. Remedial ceiling: <strong style="color:#ffff00;">60%</strong> clean score. 3rd Step &rarr; <strong style="color:#8b5cf6;">Alumni (Level X)</strong>.
            </div>
          </div>
        </div>
      ` : `
        <div style="background:#0F172A; border:1px solid rgba(56,189,248,0.25); border-radius:6px; padding:6px 10px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <span style="font-size:11px; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.04em;">2. Program Completion, Passing Standards &amp; Alumni Status</span>
            <span style="font-size:9px; font-weight:800; color:#38bdf8; background:rgba(56,189,248,0.12); border:1px solid rgba(56,189,248,0.3); padding:1px 5px; border-radius:3px; text-transform:uppercase;">Level 0 (Non-Level)</span>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px;">
            <div style="background:#090D16; border-left:2px solid #38bdf8; border-radius:0 4px 4px 0; padding:4px 6px; font-size:10px; line-height:1.3; color:#cbd5e1;">
              <strong style="color:#f8fafc;">Graduation Standard:</strong> Final Composite <strong style="color:#ffff00;">&ge; 60% (Grade C)</strong>. Passing graduates officially become <strong style="color:#8b5cf6;">Alumni (Level X)</strong>.
            </div>
            <div style="background:#090D16; border-left:2px solid #95ff00; border-radius:0 4px 4px 0; padding:4px 6px; font-size:10px; line-height:1.3; color:#cbd5e1;">
              <strong style="color:#f8fafc;">Formula:</strong> <code>Avg(Milestone Exams)</code>. Remedial ceiling: <strong style="color:#ffff00;">60%</strong> clean score. Single-tier completion.
            </div>
          </div>
        </div>
      `;

      // ── 3. Render Individual Class Card (Zero-Scroll Adaptive) ────
      const renderClassCard = (cls) => {
        const prog = progMap.get(cls.program_id);
        const inst = prog ? instMap.get(prog.institution_id) : (cls.institution_id ? instMap.get(cls.institution_id) : null);
        const instCode  = escapeHtml(inst?.code || inst?.name || (activeTenant === 'CEC' ? 'CEC' : 'TOP'));
        const progName  = prog ? escapeHtml(prog.name) : 'General Program';

        let lvl = cls.level_id ? levelMap.get(cls.level_id) : null;
        if (!lvl) {
          for (const cl of (classLevels || [])) {
            if (cl.class_id === cls.id && cl.level_id && levelMap.has(cl.level_id)) {
              lvl = levelMap.get(cl.level_id);
              break;
            }
          }
        }
        const lvlNum = lvl?.level_number != null ? Number(lvl.level_number) : null;
        const shortLvl = (lvl && lvl.level_number != null && lvl.level_number < 99)
          ? (lvl.level_number === 0 ? 'Level 0' : (typeof toShortLevel === 'function' ? toShortLevel(lvl.level_number) : `${lvl.level_number} Step`))
          : (activeTenant === 'TOP' ? 'Level 0' : '1st Step');

        const effectiveCode = getStandardClassCode(cls, lvl, prog);
        const studentCount = getEligibleStudentCountForClass(cls);
        const disc = detectClassDiscipline(cls);

        let modalityLabel = 'Vocabulary Mastery';
        let modalityColor = '#c084fc';
        if (disc === 'BASIC_ENGLISH') {
          modalityLabel = 'Basic English Structure (M1)';
          modalityColor = '#38bdf8';
        } else if (disc === 'SPEAKING') {
          modalityLabel = 'Speaking Oral Articulation (M5, M7)';
          modalityColor = '#95ff00';
        } else if (disc === 'STORYTELLING') {
          modalityLabel = 'Storytelling Narrative (M6)';
          modalityColor = '#FF8C00';
        } else if (disc === 'VOCABULARY') {
          const isL2 = lvlNum === 2 || (cls.name || '').toUpperCase().includes('2ND') || effectiveCode.includes('2VOCAB');
          modalityLabel = isL2 ? 'Vocabulary (100% Words)' : 'Vocabulary (Words & Phrases)';
          modalityColor = '#c084fc';
        }

        const classTests = testsByClass.get(cls.id) || [];
        const tasks = classTests.filter(t => (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() !== 'EXAM');
        const exams = classTests.filter(t => (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() === 'EXAM');

        const examCountLabel = exams.length > 0 ? `${exams.length} Milestone Exams (EX-1..${exams.length})` : '4 Periodic Milestone Exams (EX-1..4)';
        const taskCountLabel = tasks.length > 0 ? `${tasks.length} Formative Tasks` : (disc === 'VOCABULARY' ? (lvlNum === 2 ? '7 Tasks (7×7 Reps)' : '14 Tasks (7×7 Reps)') : 'Formative Coursework');

        const examMinScore = exams.length > 0 ? Math.round(getTestMinScore(exams[0])) : 60;
        const taskMinScore = tasks.length > 0 ? Math.round(getTestMinScore(tasks[0])) : (disc === 'VOCABULARY' ? 70 : 60);

        return `
          <div style="background:#0F172A; border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:8px 10px; display:flex; flex-direction:column; justify-content:space-between; gap:6px; box-sizing:border-box; transition:border-color 0.15s ease;" onmouseenter="this.style.borderColor='rgba(56,189,248,0.4)'" onmouseleave="this.style.borderColor='rgba(255,255,255,0.1)'">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:6px; margin-bottom:4px;">
                <div style="min-width:0; overflow:hidden;">
                  <div style="font-size:12px; font-weight:800; color:#f8fafc; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(cls.name)}</div>
                  <div style="font-family:var(--fm-font-mono, monospace); font-size:10px; font-weight:700; color:#38bdf8; margin-top:1px;">${escapeHtml(effectiveCode)}</div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:2px; flex-shrink:0;">
                  <span style="font-size:9px; font-weight:800; padding:1px 5px; border-radius:3px; background:rgba(255,255,255,0.08); color:#f8fafc; white-space:nowrap;">${escapeHtml(shortLvl)}</span>
                  <span style="font-size:9px; color:${cls.is_active ? '#95ff00' : '#ff0000'}; font-weight:700;">${cls.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                </div>
              </div>

              <div style="font-size:10px; font-weight:700; color:${modalityColor}; margin-bottom:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                ${modalityLabel}
              </div>

              <!-- Rules Matrix -->
              <div style="background:#090D16; border:1px solid rgba(255,255,255,0.06); border-radius:4px; padding:6px 8px; display:flex; flex-direction:column; gap:4px; font-size:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="color:#94a3b8;">Milestone Exams:</span>
                  <span style="font-weight:700; color:#ff2d87;">${examCountLabel}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="color:#94a3b8;">Formative Tasks:</span>
                  <span style="font-weight:700; color:#95ff00;">${taskCountLabel}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.05); padding-top:3px;">
                  <span style="color:#94a3b8;">Exam Pass (KKM):</span>
                  <span style="font-weight:800; color:#ffff00; font-variant-numeric:tabular-nums;">${examMinScore}% (${calculateGrade(examMinScore, { institution: activeTenant })})</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="color:#94a3b8;">Task Pass Threshold:</span>
                  <span style="font-weight:700; color:#95ff00; font-variant-numeric:tabular-nums;">${taskMinScore}% per rep</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span style="color:#94a3b8;">Enrolled:</span>
                  <span style="font-weight:700; color:#f8fafc; font-variant-numeric:tabular-nums;">${studentCount} students</span>
                </div>
              </div>

              <!-- Formula Box -->
              <div style="margin-top:5px; background:rgba(0,0,0,0.3); border-left:2px solid #38bdf8; border-radius:0 3px 3px 0; padding:4px 6px; font-size:9px; color:#cbd5e1; line-height:1.2;">
                <strong>Formula:</strong> <code>Avg(EX-1 .. EX-4)</code> &rarr; Equal weight in ${activeTenant === 'CEC' ? shortLvl + ' Composite AVG' : 'Program Final Score'}.
              </div>
            </div>

            <!-- Action Ribbon -->
            <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.06); padding-top:6px; margin-top:2px;">
              <button type="button" class="btn btn-secondary btn-sm" onclick="window.openClassTestSettingsFromHub('${cls.id}','${escapeHtml(cls.name)}')" style="height:24px !important; line-height:22px !important; padding:0 6px !important; font-size:10px !important; font-weight:700; border-radius:3px; cursor:pointer; display:inline-flex; align-items:center; gap:3px;" title="Configure Test & Scoring Rules for this class">
                ${getSvgIcon('award', 11)} Configure Rules
              </button>
              <button type="button" class="btn btn-outline btn-sm" onclick="if(typeof window.loadSection==='function'){window.loadSection('class-hub');}else{window.location.hash='#class-hub';}" style="height:24px !important; line-height:22px !important; padding:0 6px !important; font-size:10px !important; font-weight:700; border-radius:3px; cursor:pointer; color:#38bdf8; border-color:rgba(56,189,248,0.4);" title="Open Workstation Binder">
                Workspace ↗
              </button>
            </div>
          </div>
        `;
      };

      // ── Build Class Row for Optional Table View ────
      const buildClassRow = (cls, idx) => {
        const prog = progMap.get(cls.program_id);
        const inst = prog ? instMap.get(prog.institution_id) : (cls.institution_id ? instMap.get(cls.institution_id) : null);
        const instCode  = escapeHtml(inst?.code || inst?.name || '—');
        const progName  = prog ? escapeHtml(prog.name) : 'No Program';

        let lvl = cls.level_id ? levelMap.get(cls.level_id) : null;
        if (!lvl) {
          for (const cl of (classLevels || [])) {
            if (cl.class_id === cls.id && cl.level_id && levelMap.has(cl.level_id)) {
              lvl = levelMap.get(cl.level_id);
              break;
            }
          }
        }
        const shortLvl = (lvl && lvl.level_number != null && lvl.level_number < 99)
          ? (typeof toShortLevel === 'function' ? toShortLevel(lvl.level_number) : (lvl.level_number === 0 ? '0' : (lvl.name || '0')))
          : '—';
        const levelHtml = shortLvl !== '—'
          ? `<span style="color:#818cf8;font-weight:600;font-size:12px;">${escapeHtml(shortLvl)}</span>`
          : '<span class="text-xs text-muted">—</span>';

        const effectiveCode = getStandardClassCode(cls, lvl, prog);
        const codeHtml  = `<span style="font-family:var(--fm-font-mono, monospace);font-size:12px;font-weight:600;letter-spacing:0.04em;color:#e2e8f0;">${escapeHtml(effectiveCode)}</span>`;
        const studentCount = getEligibleStudentCountForClass(cls);
        const studentsHtml = studentCount > 0
          ? `<span style="color:var(--fm-text-primary);font-weight:600;font-size:12px;font-variant-numeric:tabular-nums;">${studentCount}</span>`
          : '<span class="text-xs text-muted" style="font-variant-numeric:tabular-nums;">0</span>';

        const disc = detectClassDiscipline(cls);
        let scopeHtml = '<span class="text-xs text-muted">—</span>';
        let engineHtml = '<span class="text-xs text-muted">Standard</span>';

        if (disc === 'VOCABULARY') {
          scopeHtml = '<span style="font-weight:700;font-size:12px;"><span style="color:#95ff00;">Words</span> <span style="color:#94a3b8;">&amp;</span> <span style="color:#ff2d87;">Phrases</span></span>';
          engineHtml = '<span style="color:#38bdf8;font-size:12px;font-weight:700;">Vocabulary Mastery</span>';
        } else if (disc === 'BASIC_ENGLISH') {
          scopeHtml = '<span style="color:#38bdf8;font-weight:700;font-size:12px;">Photo Description</span>';
          engineHtml = '<span style="color:#38bdf8;font-size:12px;font-weight:700;">Basic English (M1)</span>';
        } else if (disc === 'SPEAKING') {
          scopeHtml = '<span style="color:#95ff00;font-weight:700;font-size:12px;">Speech &amp; Dialogue</span>';
          engineHtml = '<span style="color:#95ff00;font-size:12px;font-weight:700;">Public Speaking (M5)</span>';
        } else if (disc === 'STORYTELLING') {
          scopeHtml = '<span style="color:#FF8C00;font-weight:700;font-size:12px;">Narrative &amp; Retell</span>';
          engineHtml = '<span style="color:#FF8C00;font-size:12px;font-weight:700;">Storytelling (M6)</span>';
        }

        const classTests = testsByClass.get(cls.id) || [];
        const tasks = classTests.filter(t => (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() !== 'EXAM');
        const exams = classTests.filter(t => (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() === 'EXAM');

        const taskScores = tasks.map(getTestMinScore);
        const taskLabel = taskScores.length > 0 ? `${Math.round(taskScores[0])}%` : '—';
        const examScores = exams.map(getTestMinScore);
        const examLabel = examScores.length > 0 ? `${Math.round(examScores[0])}%` : '60%';

        return `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.15s ease;">
            <td class="text-center" style="font-size:12px;color:var(--fm-text-muted);font-variant-numeric:tabular-nums;padding:8px 6px;">${idx + 1}</td>
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">
              <span style="font-weight:600;font-size:12px;color:var(--fm-text-primary);">${instCode}</span>
            </td>
            <td style="font-size:12px;white-space:nowrap;padding:8px 8px;">
              <span style="font-weight:600;font-size:12px;color:var(--fm-text-primary);">${progName}</span>
            </td>
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">
              ${levelHtml}
            </td>
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">
              ${codeHtml}
            </td>
            <td style="font-size:12px;white-space:nowrap;padding:8px 8px;">
              <span style="font-weight:600;font-size:12px;color:var(--fm-text-primary);">${escapeHtml(cls.name)}</span>
            </td>
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;border-right:2px solid rgba(255,255,255,0.22) !important;">
              ${studentsHtml}
            </td>
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">
              ${scopeHtml}
            </td>
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;border-right:2px solid rgba(255,255,255,0.22) !important;">
              ${engineHtml}
            </td>
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">
              <span style="color:#95ff00;font-weight:700;">${taskLabel}</span>
            </td>
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;border-right:2px solid rgba(255,255,255,0.22) !important;">
              <span style="color:#ff2d87;font-weight:700;">${examLabel}</span>
            </td>
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">
              <span style="font-weight:700;font-size:12px;color:${cls.is_active ? 'var(--grade-b, #95ff00)' : 'var(--grade-e, #ff0000)'};">
                ${cls.is_active ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </td>
          </tr>
        `;
      };

      const renderTableRowsHtml = (list) => {
        if (!list || list.length === 0) {
          return `
            <tr>
              <td colspan="12" style="text-align:center;padding:32px 16px;color:#94a3b8;font-size:12px;">
                No classes match the active filter or search query.
              </td>
            </tr>
          `;
        }
        return list.map((cls, idx) => buildClassRow(cls, idx)).join('');
      };

      // Filter classes for display
      let displayClasses = searchedClasses;
      if (activeTenant === 'CEC' && activeStepFilter !== 'ALL') {
        const targetStepNum = Number(activeStepFilter);
        displayClasses = searchedClasses.filter(c => {
          const raw = (c.name || c.code || '').toUpperCase();
          const lvl = c.level_id ? levelMap.get(c.level_id) : null;
          return lvl?.level_number === targetStepNum || raw.includes(`${targetStepNum}ST`) || raw.includes(`${targetStepNum}ND`) || raw.includes(`${targetStepNum}RD`) || raw.includes(`-${targetStepNum}`);
        });
      }

      // Compute grid layout:
      // If TOP: exactly 3 classes -> 3 columns in 1 row (100% height)
      // If CEC and filtered to a step (1-4 classes) -> 1 row of up to 4 columns (100% height)
      // If CEC and ALL -> 3 columns x 2 rows (100% height)
      let gridColumnsCss = 'repeat(3, 1fr)';
      let gridRowsCss = '1fr';
      if (activeTenant === 'TOP') {
        gridColumnsCss = `repeat(${Math.max(1, displayClasses.length)}, 1fr)`;
        gridRowsCss = '1fr';
      } else {
        if (activeStepFilter !== 'ALL') {
          gridColumnsCss = `repeat(${Math.max(1, displayClasses.length)}, 1fr)`;
          gridRowsCss = '1fr';
        } else {
          gridColumnsCss = 'repeat(3, 1fr)';
          gridRowsCss = 'repeat(2, 1fr)';
        }
      }

      // Step Filter Pills for CEC
      const stepFilterStripHtml = activeTenant === 'CEC' ? `
        <div style="display:flex; justify-content:space-between; align-items:center; flex:0 0 auto;">
          <div style="font-size:11px; font-weight:800; text-transform:uppercase; color:#94a3b8; letter-spacing:0.04em; display:flex; align-items:center; gap:6px;">
            <span style="color:#ff2d87;">●</span>
            <span>3. Curriculum Classes &amp; Exam Standards (${displayClasses.length} of ${tenantClasses.length} Classes)</span>
          </div>
          <div style="display:flex; align-items:center; gap:4px;">
            <span style="font-size:10px; color:#64748b; font-weight:700; margin-right:4px;">STEP VIEW:</span>
            <button type="button" onclick="window.setClassesHubStepFilter('ALL')" style="padding:2px 8px; font-size:10px; font-weight:700; border-radius:3px; cursor:pointer; border:1px solid ${activeStepFilter === 'ALL' ? '#ff2d87' : 'rgba(255,255,255,0.1)'}; background:${activeStepFilter === 'ALL' ? 'rgba(255,45,135,0.15)' : 'rgba(255,255,255,0.04)'}; color:${activeStepFilter === 'ALL' ? '#ff2d87' : '#94a3b8'};">ALL STEPS (6)</button>
            <button type="button" onclick="window.setClassesHubStepFilter(1)" style="padding:2px 8px; font-size:10px; font-weight:700; border-radius:3px; cursor:pointer; border:1px solid ${activeStepFilter === 1 ? '#38bdf8' : 'rgba(255,255,255,0.1)'}; background:${activeStepFilter === 1 ? 'rgba(56,189,248,0.15)' : 'rgba(255,255,255,0.04)'}; color:${activeStepFilter === 1 ? '#38bdf8' : '#94a3b8'};">1st STEP (4)</button>
            <button type="button" onclick="window.setClassesHubStepFilter(2)" style="padding:2px 8px; font-size:10px; font-weight:700; border-radius:3px; cursor:pointer; border:1px solid ${activeStepFilter === 2 ? '#95ff00' : 'rgba(255,255,255,0.1)'}; background:${activeStepFilter === 2 ? 'rgba(149,255,0,0.15)' : 'rgba(255,255,255,0.04)'}; color:${activeStepFilter === 2 ? '#95ff00' : '#94a3b8'};">2nd STEP (2)</button>
            <button type="button" onclick="window.setClassesHubStepFilter(3)" style="padding:2px 8px; font-size:10px; font-weight:700; border-radius:3px; cursor:pointer; border:1px solid ${activeStepFilter === 3 ? '#c084fc' : 'rgba(255,255,255,0.1)'}; background:${activeStepFilter === 3 ? 'rgba(192,132,252,0.15)' : 'rgba(255,255,255,0.04)'}; color:${activeStepFilter === 3 ? '#c084fc' : '#94a3b8'};">3rd STEP (1)</button>
          </div>
        </div>
      ` : `
        <div style="display:flex; justify-content:space-between; align-items:center; flex:0 0 auto;">
          <div style="font-size:11px; font-weight:800; text-transform:uppercase; color:#94a3b8; letter-spacing:0.04em; display:flex; align-items:center; gap:6px;">
            <span style="color:#38bdf8;">●</span>
            <span>3. Vocational Curriculum Classes &amp; Exam Standards (${displayClasses.length} Classes &middot; Level 0)</span>
          </div>
          <span style="font-size:10px; color:#64748b; font-weight:700;">EVNIKOM &middot; SHERATON &middot; TAMATA</span>
        </div>
      `;

      // Render outer workspace with strict 100vh lock & zero scrolling (overflow: hidden !important)
      if (viewMode === 'CARDS') {
        area.innerHTML = `
          <div class="classes-hub-workspace" style="display:flex; flex-direction:column; flex:1 1 0 !important; min-height:0 !important; max-height:100% !important; height:100% !important; overflow:hidden !important; gap:8px; padding:0; box-sizing:border-box; background:#090d16;">
            <!-- TOP DECK: Dual-Card Deck (Grading SSOT + Step Composite Rules) -->
            <div style="display:grid; grid-template-columns:1.25fr 1fr; gap:8px; flex:0 0 auto; box-sizing:border-box;">
              ${gradingCardHtml}
              ${stepScoringCardHtml}
            </div>

            <!-- FILTER STRIP -->
            ${stepFilterStripHtml}

            <!-- MAIN WORKSPACE CARDS GRID (100% Height, Zero Scroll) -->
            <div style="flex:1 1 0 !important; min-height:0 !important; overflow:hidden !important; display:grid; grid-template-columns:${gridColumnsCss}; grid-template-rows:${gridRowsCss}; gap:8px; box-sizing:border-box;">
              ${displayClasses.length > 0 ? displayClasses.map(renderClassCard).join('') : `
                <div style="grid-column:1/-1; background:#0F172A; border:1px dashed rgba(255,255,255,0.15); border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; color:#94a3b8;">
                  <div style="font-size:13px; font-weight:700; color:#f8fafc; margin-bottom:2px;">No Classes Found</div>
                  <div style="font-size:11px;">No active classes found for this filter. Click "+ Add Class" below to create one.</div>
                </div>
              `}
            </div>
          </div>
        `;
      } else {
        // Table Matrix View (Zero Scroll with internal datagrid fit)
        area.innerHTML = `
          <div class="classes-hub-workspace" style="display:flex; flex-direction:column; flex:1 1 0 !important; min-height:0 !important; max-height:100% !important; height:100% !important; overflow:hidden !important; gap:8px; padding:0; box-sizing:border-box; background:#090d16;">
            <!-- TOP DECK: Dual-Card Deck -->
            <div style="display:grid; grid-template-columns:1.25fr 1fr; gap:8px; flex:0 0 auto; box-sizing:border-box;">
              ${gradingCardHtml}
              ${stepScoringCardHtml}
            </div>

            <!-- TABLE CONTAINER -->
            <div class="table-wrap sticky-first" style="flex:1 1 0 !important; min-height:0 !important; max-height:100% !important; overflow-y:auto !important; overflow-x:auto !important; background:#0f172a; border:1px solid rgba(255,255,255,0.12) !important; border-radius:6px; margin:0;">
              <table class="datagrid-table" style="width:100%; min-width:1355px; border-collapse:collapse; table-layout:fixed;">
                <colgroup>
                  <col style="width:40px;"><col style="width:75px;"><col style="width:95px;"><col style="width:55px;"><col style="width:110px;"><col style="width:170px;"><col style="width:65px;"><col style="width:185px;"><col style="width:320px;"><col style="width:80px;"><col style="width:80px;"><col style="width:80px;">
                </colgroup>
                <thead style="position:sticky; top:0; z-index:20;">
                  <tr style="height:30px;">
                    <th colspan="7" style="background:#0b1120 !important; color:#ffffff !important; font-size:12px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.18); border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px;">CURRICULUM IDENTITY</th>
                    <th colspan="2" style="background:#0b1120 !important; color:var(--primary-tactical, #38bdf8) !important; font-size:12px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.18); border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px; text-shadow:0 0 10px rgba(56,189,248,0.35);">ASSESSMENT ENGINE</th>
                    <th colspan="2" style="background:#0b1120 !important; color:var(--quad-b, #ff8c00) !important; font-size:12px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.18); border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px; text-shadow:0 0 10px rgba(255,140,0,0.35);">PASSING STANDARDS</th>
                    <th colspan="1" style="background:#0b1120 !important; color:var(--grade-b, #95ff00) !important; font-size:12px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.18); height:30px; line-height:30px; text-shadow:0 0 10px rgba(149,255,0,0.35);">READINESS</th>
                  </tr>
                  <tr style="height:30px;">
                    <th style="width:40px; text-align:center; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;">NO</th>
                    <th style="width:75px; text-align:center; cursor:pointer; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;" onclick="window.sortClassesHub('institution')" title="Sort by Institution">INSTITUTION ${getSortIcon('institution')}</th>
                    <th style="width:95px; text-align:left; cursor:pointer; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;" onclick="window.sortClassesHub('program')" title="Sort by Program">PROGRAM ${getSortIcon('program')}</th>
                    <th style="width:55px; text-align:center; cursor:pointer; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;" onclick="window.sortClassesHub('level')" title="Sort by Level">LVL ${getSortIcon('level')}</th>
                    <th style="width:110px; text-align:center; cursor:pointer; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;" onclick="window.sortClassesHub('code')" title="Sort by Code">CODE ${getSortIcon('code')}</th>
                    <th style="width:170px; text-align:left; cursor:pointer; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;" onclick="window.sortClassesHub('name')" title="Sort by Class Name">CLASS NAME ${getSortIcon('name')}</th>
                    <th style="width:65px; text-align:center; cursor:pointer; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px;" onclick="window.sortClassesHub('students')" title="Sort by Eligible Students">STUDENTS ${getSortIcon('students')}</th>
                    <th style="width:185px; text-align:center; background:#0b1120 !important; color:var(--primary-tactical, #38bdf8) !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;">SCOPE / MODALITY</th>
                    <th style="width:320px; text-align:center; background:#0b1120 !important; color:var(--primary-tactical, #38bdf8) !important; font-weight:700; font-size:12px; border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px;">ENGINE</th>
                    <th style="width:80px; text-align:center; cursor:pointer; background:#0b1120 !important; color:var(--quad-b, #ff8c00) !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;" onclick="window.sortClassesHub('task')" title="Sort by Task Passing Rate">TASK PASS ${getSortIcon('task')}</th>
                    <th style="width:80px; text-align:center; cursor:pointer; background:#0b1120 !important; color:var(--quad-b, #ff8c00) !important; font-weight:700; font-size:12px; border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px;" onclick="window.sortClassesHub('exam')" title="Sort by Exam Passing Rate">EXAM PASS ${getSortIcon('exam')}</th>
                    <th style="width:80px; text-align:center; cursor:pointer; background:#0b1120 !important; color:var(--grade-b, #95ff00) !important; font-weight:700; font-size:12px; height:30px; line-height:30px;" onclick="window.sortClassesHub('status')" title="Sort by Status">STATUS ${getSortIcon('status')}</th>
                  </tr>
                </thead>
                <tbody id="classes-hub-tbody">
                  ${renderTableRowsHtml(sortedClasses)}
                </tbody>
              </table>
            </div>
          </div>
        `;
      }

      // Sub Panel (40px Lower Panel)
      if (window.setBottomInfobar) {
        const leftHtml = `
          <div style="display:flex; align-items:center; gap:8px; font-size:12px; color:#cbd5e1; white-space:nowrap;">
            <span style="font-weight:800; color:${activeTenant === 'CEC' ? '#ff2d87' : '#38bdf8'}; text-transform:uppercase;">${activeTenant} CURRICULUM:</span>
            <span><strong style="color:#f8fafc;">${tenantClasses.length}</strong> Classes</span>
            <span>·</span>
            <span>Exam Standard: <strong style="color:#ffff00;">60% (Grade C)</strong></span>
            <span>·</span>
            <span>Task Pass: <strong style="color:#95ff00;">70% Rep</strong></span>
            <span>·</span>
            <span>Remedial Ceiling: <strong style="color:#ffff00;">60%</strong></span>
            <span>·</span>
            <span style="color:#8b5cf6; font-weight:700;">Alumni: Level X</span>
          </div>
        `;
        const rightHtml = `
          <div style="display:flex; align-items:center; gap:8px; white-space:nowrap;">
            <button type="button" class="btn btn-outline btn-sm" onclick="window.toggleClassesHubView()" style="height:30px !important; line-height:28px !important; padding:0 10px !important; font-size:12px !important; font-weight:700; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; border-color:var(--primary-tactical, #38bdf8); color:var(--primary-tactical, #38bdf8);" title="Toggle between Cards Overview and Datagrid Matrix">
              ${getSvgIcon(viewMode === 'CARDS' ? 'grid' : 'layers', 13)} ${viewMode === 'CARDS' ? 'Table Matrix' : 'Cards View'}
            </button>
            <button type="button" class="btn btn-outline btn-sm" onclick="if(typeof window.loadSection==='function'){window.loadSection('exam-rules');}else{window.location.hash='#exam-rules';}" style="height:30px !important; line-height:28px !important; padding:0 10px !important; font-size:12px !important; font-weight:700; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; border-color:#ff2d87; color:#ff2d87;" title="View Authoritative Exam & Assessment Regulations">
              ${getSvgIcon('award', 13)} Exam Rules ↗
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-classes-hub-open-vault" onclick="window.openVocabVaultFromClassHub()" style="height:30px !important; line-height:28px !important; padding:0 12px !important; font-size:12px !important; font-weight:600; display:inline-flex; align-items:center; gap:5px; border-radius:4px; cursor:pointer;" title="Open Topic Blueprint & Vocabulary Vault">
              ${getSvgIcon('book-open', 14)} Open Vault
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-classes-hub-add-class" onclick="window.openClassesHubAddClass(null)" style="height:30px !important; line-height:28px !important; padding:0 12px !important; font-size:12px !important; font-weight:700; border-radius:4px; cursor:pointer; display:inline-flex; align-items:center; gap:5px; background:var(--primary-tactical, #38bdf8); border-color:var(--primary-tactical, #38bdf8); color:#0f172a; font-weight:800;" title="Add New Class">
              ${getSvgIcon('plus', 14)} Add Class
            </button>
          </div>
        `;
        window.setBottomInfobar(leftHtml, rightHtml);
      }

      if (!window._classesHubEditModeListenerBound) {
        window._classesHubEditModeListenerBound = true;
        window.addEventListener('admin-edit-mode-changed', () => {
          renderView();
        });
      }
    };

    await renderView();
  } catch (err) {
    console.error('[renderClassesHub] Error loading classes hub data:', err);
    area.innerHTML = `
      <div style="padding:24px; text-align:center; color:var(--grade-e);">
        <p style="font-weight:700;">Failed to load Curriculum Hub</p>
        <p style="font-size:12px; color:#94a3b8;">${err?.message || err}</p>
      </div>
    `;
  }
}
