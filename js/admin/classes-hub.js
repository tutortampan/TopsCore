import {
  adminFetchAll,
  adminUpdate,
  fetchClassTestSettings,
  saveClassTestSettings,
  toShortLevel,
  fetchDisciplineGovernance,
  saveDisciplineGovernance,
  DEFAULT_DISCIPLINE_GOVERNANCE
} from '../api.js?v=20261114_v517';
import { showToast, escapeHtml } from '../app.js?v=20261106_v160';
import { detectClassDiscipline } from '../grading.js?v=20261106_v160';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';

export async function renderClassesHub(area) {
  area.innerHTML = typeof window.getLoadingStateHtml === 'function'
    ? window.getLoadingStateHtml('Loading Curriculum Hub...')
    : '<div class="topscore-loading-center"><div class="spinner"></div><p class="loading-text">Loading Curriculum Hub...</p></div>';

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
    const activeStudents = (students || []).filter(s => !s.deleted_at && s.is_active !== false);

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
        skus: ['CMP-1VOCAB', 'CMP-2VOCAB', 'CMP-3VOCAB', 'EVN-VOCAB', 'SHR-VOCAB', 'TMT-VOCAB'],
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
        skus: ['CMP-1BASIC', 'EVN-BASIC', 'SHR-BASIC', 'TMT-BASIC'],
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
        skus: ['CMP-2SPEAK', 'EVN-SPEAK', 'SHR-SPEAK', 'TMT-SPEAK'],
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
        skus: ['CMP-1STORY', 'EVN-STORY', 'SHR-STORY', 'TMT-STORY'],
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

    // Main Renderer
    const renderView = async () => {
      const activeInstFilter = window._classesHubActiveInst || 'all';
      const activeDiscipline = window._classesHubDiscipline || 'VOCABULARY';
      const isMasterDirectory = activeDiscipline === 'ALL_CLASSES';

      // ── Top Panel: SSOT Discipline Tabs Integration via setTopbarTabs ────
      const disciplineTopTabs = DISCIPLINE_TABS.map(d => {
        const count = d.key === 'ALL_CLASSES'
          ? activeClasses.length
          : activeClasses.filter(c => detectClassDiscipline(c) === d.key).length;
        return {
          id: d.key,
          label: d.name,
          icon: getSvgIcon(d.icon, 14),
          val: count,
          valColor: d.color
        };
      });

      if (window.setTopbarTabs) {
        window.setTopbarTabs(disciplineTopTabs, activeDiscipline, 'window.switchClassesHubDiscipline');
      }

      // Filter classes by active discipline or all
      let targetClasses = isMasterDirectory
        ? (activeInstFilter === 'all'
            ? activeClasses
            : activeClasses.filter(c => {
                const prog = progMap.get(c.program_id);
                return (prog && prog.institution_id === activeInstFilter) || (c.institution_id === activeInstFilter);
              }))
        : activeClasses.filter(c => detectClassDiscipline(c) === activeDiscipline);

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

      const searchedClasses = filterClassesList(targetClasses, searchQuery);

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
        const lvlNum = lvl?.level_number != null ? Number(lvl.level_number) : null;
        const shortLvl = (lvl && lvl.level_number != null && lvl.level_number < 99)
          ? (typeof toShortLevel === 'function' ? toShortLevel(lvl.level_number) : (lvl.level_number === 0 ? '0' : (lvl.name || '0')))
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

          let lNum = levelObj?.level_number;
          if (lNum === 0 || (levelObj?.name || '').toLowerCase() === 'non-level') {
            lNum = ''; // Level 0 dianggap kosong!
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

        const effectiveCode = getStandardClassCode(cls, lvl, prog);
        const codeHtml  = `<span style="font-family:var(--fm-font-mono, monospace);font-size:12px;font-weight:600;letter-spacing:0.04em;color:#e2e8f0;">${escapeHtml(effectiveCode)}</span>`;
        const studentCount = getEligibleStudentCountForClass(cls);
        const studentsHtml = studentCount > 0
          ? `<span style="color:var(--fm-text-primary);font-weight:600;font-size:12px;font-variant-numeric:tabular-nums;">${studentCount}</span>`
          : '<span class="text-xs text-muted" style="font-variant-numeric:tabular-nums;">0</span>';

        // Discipline Modality & Engine Isolation (Zero-Capsule SSOT: pure text colors)
        const disc = detectClassDiscipline(cls);
        let scopeHtml = '<span class="text-xs text-muted">—</span>';
        let engineHtml = '<span class="text-xs text-muted">Standard</span>';

        if (disc === 'VOCABULARY') {
          const isL2 = lvlNum === 2 || (cls.name || '').toUpperCase().includes('2ND') || effectiveCode.includes('2VOCAB');
          if (isL2) {
            scopeHtml = '<span style="color:#95ff00;font-weight:700;font-size:12px;">100% Words (7 Reps)</span>';
          } else {
            scopeHtml = '<span style="font-weight:700;font-size:12px;"><span style="color:#95ff00;">Words</span> <span style="color:#94a3b8;">&amp;</span> <span style="color:#ff2d87;">Phrases</span> <span style="color:#94a3b8;font-weight:400;">(14 Reps)</span></span>';
          }
          engineHtml = '<span style="color:#38bdf8;font-size:12px;font-weight:700;">Vocabulary Mastery Modules</span> <span style="color:#94a3b8;font-size:12px;">(Recognition, Spoken, Written)</span>';
        } else if (disc === 'BASIC_ENGLISH') {
          scopeHtml = '<span style="color:#38bdf8;font-weight:700;font-size:12px;">Photo Description</span>';
          engineHtml = '<span style="color:#38bdf8;font-size:12px;font-weight:700;">Basic English</span> <span style="color:#94a3b8;font-size:12px;">(M1)</span>';
        } else if (disc === 'SPEAKING') {
          scopeHtml = '<span style="color:#95ff00;font-weight:700;font-size:12px;">Speech &amp; Dialogue</span>';
          engineHtml = '<span style="color:#95ff00;font-size:12px;font-weight:700;">Public Speaking</span> <span style="color:#94a3b8;font-size:12px;">(M5, M7)</span>';
        } else if (disc === 'STORYTELLING') {
          scopeHtml = '<span style="color:#FF8C00;font-weight:700;font-size:12px;">Narrative &amp; Retell</span>';
          engineHtml = '<span style="color:#FF8C00;font-size:12px;font-weight:700;">Storytelling</span> <span style="color:#94a3b8;font-size:12px;">(M6)</span>';
        }

        // Class tests and passing standards
        const classTests = testsByClass.get(cls.id) || [];
        const tasks = classTests.filter(t => (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() !== 'EXAM');
        const exams = classTests.filter(t => (t.category || (t.test_type === 'exam' ? 'EXAM' : 'TASK')).toUpperCase() === 'EXAM');

        // Task passing standard
        let taskHtml = '';
        if (tasks.length > 0) {
          const taskScores = tasks.map(getTestMinScore);
          const curTaskScore = Math.round(taskScores[0]);
          const minT = Math.min(...taskScores);
          const maxT = Math.max(...taskScores);
          const taskLabel = minT === maxT ? `${minT}%` : `${minT}%–${maxT}%`;
          taskHtml = `
            <span class="classes-hub-score-view" style="color:var(--task-color, var(--grade-b, #95ff00));font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;cursor:pointer;" onclick="window.openClassTestSettingsFromHub('${cls.id}','${escapeHtml(cls.name)}')" title="${tasks.length} Formative Tasks (Min Pass: ${taskLabel}) — Click to configure class rules">
              ${taskLabel} <span style="font-size:12px;opacity:0.75;font-weight:400;">(${tasks.length})</span>
            </span>
            <span class="classes-hub-score-input-wrap edit-mode-only" style="align-items:center;justify-content:center;gap:2px;">
              <input type="number" min="1" max="100" class="input-class-task-score" data-class-id="${cls.id}" value="${curTaskScore}" style="width:48px;height:24px;font-size:12px;font-weight:600;text-align:center;background:#090D16;color:var(--task-color, var(--grade-b, #95ff00));border:1px solid rgba(149,255,0,0.4);border-radius:4px;padding:0;font-variant-numeric:tabular-nums;" onchange="window.handleClassPassingScoreChange('${cls.id}','TASK',this.value)" title="Set passing rate for all ${tasks.length} tasks" />
              <span style="font-size:12px;color:#94a3b8;">%</span>
            </span>
          `;
        } else {
          taskHtml = '<span class="text-xs text-muted">—</span>';
        }

        // Exam passing standard
        let examHtml = '';
        if (exams.length > 0) {
          const examScores = exams.map(getTestMinScore);
          const curExamScore = Math.round(examScores[0]);
          const minE = Math.min(...examScores);
          const maxE = Math.max(...examScores);
          const examLabel = minE === maxE ? `${minE}%` : `${minE}%–${maxE}%`;
          examHtml = `
            <span class="classes-hub-score-view" style="color:var(--exam-color, var(--quad-a, #ff2d87));font-size:12px;font-weight:600;font-variant-numeric:tabular-nums;cursor:pointer;" onclick="window.openClassTestSettingsFromHub('${cls.id}','${escapeHtml(cls.name)}')" title="${exams.length} Formal Exams (Min Pass: ${examLabel}) — Click to configure class rules">
              ${examLabel} <span style="font-size:12px;opacity:0.75;font-weight:400;">(${exams.length})</span>
            </span>
            <span class="classes-hub-score-input-wrap edit-mode-only" style="align-items:center;justify-content:center;gap:2px;">
              <input type="number" min="1" max="100" class="input-class-exam-score" data-class-id="${cls.id}" value="${curExamScore}" style="width:48px;height:24px;font-size:12px;font-weight:600;text-align:center;background:#090D16;color:var(--exam-color, var(--quad-a, #ff2d87));border:1px solid rgba(255,45,135,0.4);border-radius:4px;padding:0;font-variant-numeric:tabular-nums;" onchange="window.handleClassPassingScoreChange('${cls.id}','EXAM',this.value)" title="Set passing rate for all ${exams.length} exams" />
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
            <!-- 2. INSTITUTION -->
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">
              <span style="font-weight:600;font-size:12px;color:var(--fm-text-primary);">${instCode}</span>
            </td>
            <!-- 3. PROGRAM -->
            <td style="font-size:12px;white-space:nowrap;padding:8px 8px;">
              <span style="color:var(--fm-text-secondary);font-size:12px;">${progName}</span>
            </td>
            <!-- 4. LEVEL -->
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">${levelHtml}</td>
            <!-- 5. CLASS NAME -->
            <td style="font-size:12px;white-space:nowrap;padding:8px 10px;">
              <span style="font-weight:600;font-size:12px;color:var(--fm-text-primary);cursor:pointer;transition:color 0.15s ease;"
                    onmouseover="this.style.color='#38bdf8'"
                    onmouseout="this.style.color='var(--fm-text-primary)'"
                    onclick="window.openClassWorkstation('${cls.id}')"
                    title="Click to open workstation for ${escapeHtml(cls.name)}">
                ${escapeHtml(cls.name)}
              </span>
            </td>
            <!-- 6. CODE -->
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">${codeHtml}</td>
            <!-- 7. STUDENTS -->
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">${studentsHtml}</td>
            <!-- 8. SCOPE / MODALITY -->
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">${scopeHtml}</td>
            <!-- 9. ENGINE -->
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">${engineHtml}</td>
            <!-- 10. TASK PASS -->
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">${taskHtml}</td>
            <!-- 11. EXAM PASS -->
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">${examHtml}</td>
            <!-- 12. STATUS -->
            <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 8px;">
              <span style="cursor:pointer;font-size:12px;font-weight:700;letter-spacing:0.04em;color:${cls.is_active ? 'var(--grade-a)' : 'var(--grade-e)'};text-shadow:none;" onclick="window.toggleClassesHubEntity('classes','${cls.id}',${!cls.is_active})" title="Click to ${cls.is_active ? 'deactivate' : 'activate'} this class">
                ${cls.is_active ? 'ACTIVE' : 'INACTIVE'}
              </span>
              <span class="edit-mode-only" style="margin-left:6px;gap:4px;display:none;">
                <button class="btn btn-secondary btn-sm" style="padding:0 6px;height:22px;line-height:20px;font-size:12px;" onclick="event.stopPropagation();window.openClassesHubEdit('classes','${cls.id}')" title="Edit Class">Edit</button>
                <button class="btn btn-danger btn-sm" style="padding:0 6px;height:22px;line-height:20px;font-size:12px;" onclick="event.stopPropagation();window.deleteClassesHubRecord('classes','${cls.id}','${escapeHtml(cls.name)}')" title="Delete Class">Del</button>
              </span>
            </td>
          </tr>
        `;
      };

      const sortedClasses = sortClassList(searchedClasses);

      const renderTableRowsHtml = (list) => {
        if (list.length === 0) {
          return `
            <tr>
              <td colspan="12" style="text-align:center;padding:36px 16px;color:var(--fm-text-muted);">
                <div style="font-size:14px;font-weight:600;margin-bottom:6px;">No classes found</div>
                <div style="font-size:12px;">Try adjusting your search query or discipline selection.</div>
              </td>
            </tr>
          `;
        }
        return list.map((cls, idx) => buildClassRow(cls, idx)).join('');
      };

      // Fetch governance rules for active discipline if in discipline view
      let discGov = DEFAULT_DISCIPLINE_GOVERNANCE[activeDiscipline] || DEFAULT_DISCIPLINE_GOVERNANCE.VOCABULARY;
      if (!isMasterDirectory) {
        try {
          discGov = await fetchDisciplineGovernance(activeDiscipline);
        } catch (_) {}
      }

      const isVocab = activeDiscipline === 'VOCABULARY';
      const taskScore = discGov.taskMinScore || 60;
      const examScore = discGov.examMinScore || 60;
      const wordsPacing = discGov.wordsPacing || { written: 15, recognition: 10, selection: 10, spoken: 10 };
      const phrasesPacing = discGov.phrasesPacing || { written: 25, recognition: 10, selection: 10, spoken: 20 };

      // Set bottom infobar: All summary and contextual info lives in Sub Panel per ui-invariants.md § 1.3
      const isEditOn = (typeof document !== 'undefined' && document.body.classList.contains('global-edit-mode-on')) || Boolean(window._globalEditMode);
      const actCount = sortedClasses.filter(c => c.is_active).length;
      const inactCount = sortedClasses.filter(c => !c.is_active).length;
      const totalEligible = sortedClasses.reduce((sum, c) => sum + getEligibleStudentCountForClass(c), 0);

      const editBtnStyle = isEditOn
        ? 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:#0284c7;border:1px solid #38bdf8;color:#ffffff;box-shadow:0 0 10px rgba(56,189,248,0.45);transition:all 0.15s ease;'
        : 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:transparent;border:1px solid #38bdf8;color:#38bdf8;transition:all 0.15s ease;';
      const editBtnLabel = isEditOn
        ? `${getSvgIcon('check-circle', 14)} Done Editing`
        : `${getSvgIcon('edit', 14)} Edit Mode`;

      let leftSubPanelHtml = '';
      let rightSubPanelHtml = '';

      if (isVocab) {
        // Sub Panel Left: Vocabulary Discipline Summary Info
        leftSubPanelHtml = `
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#cbd5e1;white-space:nowrap;">
            <span style="font-weight:800;color:#c084fc;text-transform:uppercase;">VOCABULARY MASTERY:</span>
            <span><strong style="color:#f8fafc;">${targetClasses.length}</strong> Classes</span>
            <span>·</span>
            <span><strong style="color:#38bdf8;">${totalEligible}</strong> Students</span>
            <span>·</span>
            <span style="color:var(--grade-a);font-weight:700;"><strong>${actCount}</strong> ACTIVE</span>
            <span>·</span>
            <span style="color:#95ff00;font-weight:700;">L2: 100% Words (7 Reps)</span>
            <span>·</span>
            <span style="color:#ff2d87;font-weight:700;">L1/L3/TOP: Words &amp; Phrases (14 Reps)</span>
            <span>·</span>
            <span style="color:var(--task-color, var(--grade-b, #95ff00));font-weight:700;">Task: ${taskScore}%</span>
            <span>·</span>
            <span style="color:var(--exam-color, var(--quad-a, #ff2d87));font-weight:700;">Exam: ${examScore}%</span>
            <span>·</span>
            <span style="color:#38bdf8;font-weight:700;">Vault: ${vaultCountsByLevel.total} Words</span>
          </div>
        `;

        // Sub Panel Right: Action buttons
        rightSubPanelHtml = `
          <div style="display:flex;align-items:center;gap:8px;white-space:nowrap;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-classes-hub-open-vault" onclick="window.openVocabVaultFromClassHub()" style="height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:600;display:inline-flex;align-items:center;gap:5px;border-radius:4px;cursor:pointer;" title="Open Topic Blueprint & Vocabulary Vault">
              ${getSvgIcon('book-open', 14)} Open Vault
            </button>
            <button type="button" class="btn btn-sm" id="btn-classes-hub-toggle-edit" onclick="window.toggleClassesHubEditMode()" style="${editBtnStyle}" title="Toggle Master Edit Mode (Inline Standards)">
              ${editBtnLabel}
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-classes-hub-add-class" onclick="window.openClassesHubAddClass(null)" style="height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;" title="Add New Class">
              ${getSvgIcon('plus', 14)} Add Class
            </button>
          </div>
        `;
      } else if (!isMasterDirectory) {
        const activeConfig = DISCIPLINE_TABS.find(d => d.key === activeDiscipline) || DISCIPLINE_TABS[0];
        leftSubPanelHtml = `
          <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#cbd5e1;white-space:nowrap;">
            <span style="font-weight:800;color:${activeConfig.color};text-transform:uppercase;">${activeConfig.name} DISCIPLINE:</span>
            <span><strong style="color:#f8fafc;">${targetClasses.length}</strong> Classes</span>
            <span>·</span>
            <span><strong style="color:#38bdf8;">${totalEligible}</strong> Students</span>
            <span>·</span>
            <span style="color:var(--grade-a);font-weight:700;"><strong>${actCount}</strong> ACTIVE</span>
            <span>·</span>
            <span style="color:var(--task-color, var(--grade-b, #95ff00));font-weight:700;">Task: ${taskScore}%</span>
            <span>·</span>
            <span style="color:var(--exam-color, var(--quad-a, #ff2d87));font-weight:700;">Exam: ${examScore}%</span>
          </div>
        `;

        rightSubPanelHtml = `
          <div style="display:flex;align-items:center;gap:8px;white-space:nowrap;">
            <button type="button" class="btn btn-sm" id="btn-classes-hub-toggle-edit" onclick="window.toggleClassesHubEditMode()" style="${editBtnStyle}" title="Toggle Master Edit Mode (Inline Standards)">
              ${editBtnLabel}
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-classes-hub-add-class" onclick="window.openClassesHubAddClass(null)" style="height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;" title="Add New Class">
              ${getSvgIcon('plus', 14)} Add Class
            </button>
          </div>
        `;
      } else {
        // Master Directory Sub Panel Left: Search & Overall summary
        leftSubPanelHtml = `
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:nowrap;">
            <div style="position:relative;display:inline-flex;align-items:center;">
              <span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:12px;display:inline-flex;align-items:center;pointer-events:none;">
                ${getSvgIcon('search', 12)}
              </span>
              <input type="text" id="classes-hub-search" placeholder="Search classes, codes, programs..." value="${escapeHtml(searchQuery)}" style="padding:0 8px 0 26px;font-size:12px;height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);color:#f8fafc;border-radius:4px;width:240px;outline:none;box-sizing:border-box;" />
            </div>
            <div id="classes-hub-summary-text" style="display:inline-flex;align-items:center;gap:10px;font-size:12px;color:#94a3b8;font-weight:600;white-space:nowrap;">
              <span><strong style="color:#f8fafc;">${sortedClasses.length}</strong>${searchQuery ? ` of ${targetClasses.length}` : ''} Classes</span>
              <span>·</span>
              <span style="color:var(--grade-a);font-weight:700;"><strong style="color:var(--grade-a);">${actCount}</strong> ACTIVE</span>
              <span>·</span>
              <span style="color:var(--grade-e);font-weight:700;"><strong style="color:var(--grade-e);">${inactCount}</strong> INACTIVE</span>
              <span>·</span>
              <span><strong style="color:#818cf8;">${totalEligible}</strong> Eligible Students</span>
            </div>
          </div>
        `;

        // Master Directory Sub Panel Right: Controls
        rightSubPanelHtml = `
          <div style="display:flex;align-items:center;gap:8px;white-space:nowrap;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-classes-hub-open-vault" onclick="window.openVocabVaultFromClassHub()" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:600;display:inline-flex;align-items:center;gap:5px;border-radius:4px;cursor:pointer;" title="Open Topic Blueprint & Vocabulary Vault">
              ${getSvgIcon('book-open', 14)} Open Vault
            </button>
            <button type="button" class="btn btn-sm" id="btn-classes-hub-toggle-edit" onclick="window.toggleClassesHubEditMode()" style="${editBtnStyle}" title="Toggle Master Edit Mode (Inline Standards)">
              ${editBtnLabel}
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-classes-hub-add-class" onclick="window.openClassesHubAddClass(null)" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;background:var(--primary-tactical, #38bdf8);border-color:var(--primary-tactical, #38bdf8);color:#0f172a;font-weight:800;" title="Add New Class">
              ${getSvgIcon('plus', 14)} Add Class
            </button>
            ${isEditOn ? `
              <button type="button" class="btn btn-secondary btn-sm" id="btn-classes-hub-add-level" onclick="window.openClassesHubAddLevel()" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:5px;" title="Add New Level">
                ${getSvgIcon('plus', 14)} Add Level
              </button>
            ` : ''}
          </div>
        `;
      }

      if (typeof window.setBottomInfobar === 'function') {
        window.setBottomInfobar(leftSubPanelHtml, rightSubPanelHtml);

        const sInp = document.getElementById('classes-hub-search');
        if (sInp && !sInp.dataset.bound) {
          sInp.dataset.bound = 'true';
          sInp.addEventListener('input', (e) => {
            window._classesHubSearch = e.target.value;
            const curTarget = isMasterDirectory
              ? (activeInstFilter === 'all'
                  ? activeClasses
                  : activeClasses.filter(c => {
                      const prog = progMap.get(c.program_id);
                      return (prog && prog.institution_id === activeInstFilter) || (c.institution_id === activeInstFilter);
                    }))
              : activeClasses.filter(c => detectClassDiscipline(c) === activeDiscipline);
            const searched = filterClassesList(curTarget, e.target.value.toLowerCase().trim());
            const sorted = sortClassList(searched);
            const tbody = document.getElementById('classes-hub-tbody');
            if (tbody) tbody.innerHTML = renderTableRowsHtml(sorted);
          });
        }
      }

      // Workstation Datagrid View (Strict 100vh lock, zero outer scrollbar)
      area.innerHTML = isVocab ? `
        <!-- VOCABULARY DISCIPLINE: Cards Top & Full-Width Datagrid Bottom (Workspace Dual-Zone Vertical Split) -->
        <div class="classes-hub-workspace" style="display:flex; flex-direction:column; flex:1 1 0 !important; min-height:0 !important; height:100% !important; overflow:hidden !important; gap:10px; padding:10px; box-sizing:border-box; background:#090d16;">

          <!-- TOP ROW: Vocabulary Governance 4-Card Deck (flex: 0 0 auto) -->
          <div style="display:grid; grid-template-columns:1.2fr 1fr 1fr 1.05fr; gap:10px; flex:0 0 auto; box-sizing:border-box;">

            <!-- Card 1: Vocabulary Mastery Modules (Tactical Cyan SSOT) -->
            <div style="background:#0F172A; border:1px solid rgba(56,189,248,0.3); border-radius:8px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.06);">
                  <span style="font-size:12px; font-weight:800; color:#38BDF8; text-transform:uppercase; letter-spacing:0.04em;">1. Vocabulary Mastery Modules</span>
                  <span style="font-size:12px; font-weight:700; color:var(--grade-e); border:1px solid rgba(255,0,0,0.3); padding:1px 6px; border-radius:4px; text-transform:uppercase;">Isolated</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px;">
                  <div>
                    <div style="font-size:12px; font-weight:700; color:#38BDF8;">Recognition Module</div>
                    <div style="font-size:12px; color:#94A3B8;">4-choice distractor recognition &amp; contextual filtering. Evaluates fast semantic identification.</div>
                  </div>
                  <div>
                    <div style="font-size:12px; font-weight:700; color:#38BDF8;">Spoken Module</div>
                    <div style="font-size:12px; color:#94A3B8;">Phonetic speech analysis &amp; pronunciation verification. Evaluates oral production &amp; acoustic clarity.</div>
                  </div>
                  <div>
                    <div style="font-size:12px; font-weight:700; color:#38BDF8;">Written Module</div>
                    <div style="font-size:12px; color:#94A3B8;">Text typing, spelling recall &amp; lexical precision. Evaluates word-for-word spelling accuracy &amp; translation.</div>
                  </div>
                </div>
              </div>
              <div style="margin-top:6px; font-size:12px; color:#64748b; border-top:1px solid rgba(255,255,255,0.05); padding-top:4px;">
                * Locked strictly to Vocabulary; zero cross-discipline leak.
              </div>
            </div>

            <!-- Card 2: Words Pacing & Modality (Lime SSOT) -->
            <div style="background:#0F172A; border:1px solid rgba(149,255,0,0.35); border-radius:8px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.06);">
                  <span style="font-size:12px; font-weight:800; color:#95FF00; text-transform:uppercase; letter-spacing:0.04em;">2. Words Pacing &amp; Rules</span>
                  <span style="font-size:12px; color:#95FF00; font-weight:700; border:1px solid rgba(149,255,0,0.3); padding:1px 6px; border-radius:4px;">INDIVIDUAL WORDS</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px;">
                  <div style="background:#090D16; border-radius:4px; padding:6px 8px; border-left:3px solid #95FF00;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span style="font-size:12px; font-weight:700; color:#f8fafc;">Recognition Module:</span>
                      <span class="classes-hub-score-view" style="font-size:12px; font-weight:700; color:#95FF00;">${wordsPacing.recognition || wordsPacing.selection || 10}s / word</span>
                      <span class="classes-hub-score-input-wrap edit-mode-only" style="align-items:center; gap:2px; display:none;">
                        <input type="number" id="pacing-words-recognition" value="${wordsPacing.recognition || wordsPacing.selection || 10}" min="1" max="180" style="width:40px; height:20px; font-size:12px; font-weight:700; text-align:center; background:#090D16; color:#95FF00; border:1px solid rgba(149,255,0,0.5); border-radius:3px; padding:0;" />
                        <span style="font-size:12px; color:#94a3b8;">s/word</span>
                      </span>
                    </div>
                    <div style="font-size:12px; color:#94A3B8;">4-choice recognition &amp; distractor filtering</div>
                  </div>
                  <div style="background:#090D16; border-radius:4px; padding:6px 8px; border-left:3px solid #95FF00;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span style="font-size:12px; font-weight:700; color:#f8fafc;">Spoken Module:</span>
                      <span class="classes-hub-score-view" style="font-size:12px; font-weight:700; color:#95FF00;">${wordsPacing.spoken || 10}s / word</span>
                      <span class="classes-hub-score-input-wrap edit-mode-only" style="align-items:center; gap:2px; display:none;">
                        <input type="number" id="pacing-words-spoken" value="${wordsPacing.spoken || 10}" min="1" max="180" style="width:40px; height:20px; font-size:12px; font-weight:700; text-align:center; background:#090D16; color:#95FF00; border:1px solid rgba(149,255,0,0.5); border-radius:3px; padding:0;" />
                        <span style="font-size:12px; color:#94a3b8;">s/word</span>
                      </span>
                    </div>
                    <div style="font-size:12px; color:#94A3B8;">Phonetic voice &amp; pronunciation check</div>
                  </div>
                  <div style="background:#090D16; border-radius:4px; padding:6px 8px; border-left:3px solid #95FF00;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span style="font-size:12px; font-weight:700; color:#f8fafc;">Written Module:</span>
                      <span class="classes-hub-score-view" style="font-size:12px; font-weight:700; color:#95FF00;">${wordsPacing.written || 15}s / word</span>
                      <span class="classes-hub-score-input-wrap edit-mode-only" style="align-items:center; gap:2px; display:none;">
                        <input type="number" id="pacing-words-written" value="${wordsPacing.written || 15}" min="1" max="180" style="width:40px; height:20px; font-size:12px; font-weight:700; text-align:center; background:#090D16; color:#95FF00; border:1px solid rgba(149,255,0,0.5); border-radius:3px; padding:0;" />
                        <span style="font-size:12px; color:#94a3b8;">s/word</span>
                      </span>
                    </div>
                    <div style="font-size:12px; color:#94A3B8;">Typing, spelling &amp; meaning recall</div>
                  </div>
                </div>
              </div>
              <div style="margin-top:6px; font-size:12px; color:#94a3b8; border-top:1px solid rgba(255,255,255,0.05); padding-top:4px;">
                Scope: 50 Q/task · 7 Reps · <strong style="color:#95FF00;">L2 is 100% Words Only</strong>
              </div>
            </div>

            <!-- Card 3: Phrases Pacing & Modality (Pink SSOT) -->
            <div style="background:#0F172A; border:1px solid rgba(255,45,135,0.35); border-radius:8px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.06);">
                  <span style="font-size:12px; font-weight:800; color:#FF2D87; text-transform:uppercase; letter-spacing:0.04em;">3. Phrases Pacing &amp; Rules</span>
                  <span style="font-size:12px; color:#FF2D87; font-weight:700; border:1px solid rgba(255,45,135,0.3); padding:1px 6px; border-radius:4px;">MULTI-WORD IDIOMS</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px;">
                  <div style="background:#090D16; border-radius:4px; padding:6px 8px; border-left:3px solid #FF2D87;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span style="font-size:12px; font-weight:700; color:#f8fafc;">Recognition Module:</span>
                      <span class="classes-hub-score-view" style="font-size:12px; font-weight:700; color:#FF2D87;">${phrasesPacing.recognition || phrasesPacing.selection || 10}s / phrase</span>
                      <span class="classes-hub-score-input-wrap edit-mode-only" style="align-items:center; gap:2px; display:none;">
                        <input type="number" id="pacing-phrases-recognition" value="${phrasesPacing.recognition || phrasesPacing.selection || 10}" min="1" max="180" style="width:40px; height:20px; font-size:12px; font-weight:700; text-align:center; background:#090D16; color:#FF2D87; border:1px solid rgba(255,45,135,0.5); border-radius:3px; padding:0;" />
                        <span style="font-size:12px; color:#94a3b8;">s/phrase</span>
                      </span>
                    </div>
                    <div style="font-size:12px; color:#94A3B8;">Context &amp; meaning match elimination</div>
                  </div>
                  <div style="background:#090D16; border-radius:4px; padding:6px 8px; border-left:3px solid #FF2D87;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span style="font-size:12px; font-weight:700; color:#f8fafc;">Spoken Module:</span>
                      <span class="classes-hub-score-view" style="font-size:12px; font-weight:700; color:#FF2D87;">${phrasesPacing.spoken || 20}s / phrase</span>
                      <span class="classes-hub-score-input-wrap edit-mode-only" style="align-items:center; gap:2px; display:none;">
                        <input type="number" id="pacing-phrases-spoken" value="${phrasesPacing.spoken || 20}" min="1" max="180" style="width:40px; height:20px; font-size:12px; font-weight:700; text-align:center; background:#090D16; color:#FF2D87; border:1px solid rgba(255,45,135,0.5); border-radius:3px; padding:0;" />
                        <span style="font-size:12px; color:#94a3b8;">s/phrase</span>
                      </span>
                    </div>
                    <div style="font-size:12px; color:#94A3B8;">Full-cadence sentence articulation</div>
                  </div>
                  <div style="background:#090D16; border-radius:4px; padding:6px 8px; border-left:3px solid #FF2D87;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                      <span style="font-size:12px; font-weight:700; color:#f8fafc;">Written Module:</span>
                      <span class="classes-hub-score-view" style="font-size:12px; font-weight:700; color:#FF2D87;">${phrasesPacing.written || 25}s / phrase</span>
                      <span class="classes-hub-score-input-wrap edit-mode-only" style="align-items:center; gap:2px; display:none;">
                        <input type="number" id="pacing-phrases-written" value="${phrasesPacing.written || 25}" min="1" max="180" style="width:40px; height:20px; font-size:12px; font-weight:700; text-align:center; background:#090D16; color:#FF2D87; border:1px solid rgba(255,45,135,0.5); border-radius:3px; padding:0;" />
                        <span style="font-size:12px; color:#94a3b8;">s/phrase</span>
                      </span>
                    </div>
                    <div style="font-size:12px; color:#94A3B8;">Multi-word idiom keyboarding &amp; recall</div>
                  </div>
                </div>
              </div>
              <div style="margin-top:6px; font-size:12px; color:#94a3b8; border-top:1px solid rgba(255,255,255,0.05); padding-top:4px;">
                Scope: 10 Q/task · 7 Reps · <strong style="color:var(--grade-e);">L2 Excludes Phrases (0 Reps)</strong>
              </div>
            </div>

            <!-- Card 4: Calibrate Standards & Vault -->
            <div style="background:#0F172A; border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px; display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box;">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid rgba(255,255,255,0.06);">
                  <span style="font-size:12px; font-weight:800; color:#f8fafc; text-transform:uppercase; letter-spacing:0.04em;">4. Standards &amp; Vault</span>
                  <span style="font-size:12px; color:var(--grade-c); font-weight:700;">LIVE PROPAGATION</span>
                </div>
                <div style="display:grid; grid-template-columns:repeat(2, 1fr); gap:6px; margin-bottom:8px;">
                  <div>
                    <label style="display:block; font-size:12px; font-weight:700; color:var(--task-color, var(--grade-b, #95ff00)); margin-bottom:2px; white-space:nowrap;">Task Pass (%):</label>
                    <input type="number" id="gov-inline-task-score" value="${taskScore}" min="1" max="100" style="width:100%; height:26px; background:#090D16; border:1px solid rgba(149,255,0,0.4); border-radius:4px; color:var(--task-color, var(--grade-b, #95ff00)); font-weight:700; font-size:12px; text-align:center; box-sizing:border-box;" />
                  </div>
                  <div>
                    <label style="display:block; font-size:12px; font-weight:700; color:var(--exam-color, var(--quad-a, #ff2d87)); margin-bottom:2px; white-space:nowrap;">Exam Pass (%):</label>
                    <input type="number" id="gov-inline-exam-score" value="${examScore}" min="1" max="100" style="width:100%; height:26px; background:#090D16; border:1px solid rgba(255,45,135,0.4); border-radius:4px; color:var(--exam-color, var(--quad-a, #ff2d87)); font-weight:700; font-size:12px; text-align:center; box-sizing:border-box;" />
                  </div>
                  <div>
                    <label style="display:block; font-size:12px; font-weight:700; color:#CBD5E1; margin-bottom:2px; white-space:nowrap;">Task Time (m):</label>
                    <input type="number" id="gov-inline-task-dur" value="${discGov.taskDuration || 11}" min="1" max="180" style="width:100%; height:26px; background:#090D16; border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#f8fafc; font-weight:700; font-size:12px; text-align:center; box-sizing:border-box;" />
                  </div>
                  <div>
                    <label style="display:block; font-size:12px; font-weight:700; color:#CBD5E1; margin-bottom:2px; white-space:nowrap;">Exam Time (m):</label>
                    <input type="number" id="gov-inline-exam-dur" value="${discGov.examDuration || 54}" min="1" max="180" style="width:100%; height:26px; background:#090D16; border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#f8fafc; font-weight:700; font-size:12px; text-align:center; box-sizing:border-box;" />
                  </div>
                  <div>
                    <label style="display:block; font-size:12px; font-weight:700; color:var(--task-color, var(--grade-b, #95ff00)); margin-bottom:2px; white-space:nowrap;">Task Order:</label>
                    <select id="gov-inline-task-order" style="width:100%; height:26px; background:#090D16; border:1px solid rgba(149,255,0,0.4); border-radius:4px; color:var(--task-color, var(--grade-b, #95ff00)); font-weight:700; font-size:12px; padding:0 4px; box-sizing:border-box;">
                      <option value="random" ${(discGov.taskOrder || 'random') === 'random' ? 'selected' : ''}>Random</option>
                      <option value="sequential" ${discGov.taskOrder === 'sequential' ? 'selected' : ''}>Sequential</option>
                    </select>
                  </div>
                  <div>
                    <label style="display:block; font-size:12px; font-weight:700; color:var(--exam-color, var(--quad-a, #ff2d87)); margin-bottom:2px; white-space:nowrap;">Exam Order:</label>
                    <select id="gov-inline-exam-order" style="width:100%; height:26px; background:#090D16; border:1px solid rgba(255,45,135,0.4); border-radius:4px; color:var(--exam-color, var(--quad-a, #ff2d87)); font-weight:700; font-size:12px; padding:0 4px; box-sizing:border-box;">
                      <option value="random" ${(discGov.examOrder || 'random') === 'random' ? 'selected' : ''}>Random</option>
                      <option value="sequential" ${discGov.examOrder === 'sequential' ? 'selected' : ''}>Sequential</option>
                    </select>
                  </div>
                </div>
                <button type="button" onclick="window.saveVocabGovInline()" style="width:100%; height:30px !important; line-height:28px !important; background:var(--primary-tactical, #38bdf8); border:none; border-radius:4px; color:#0f172a; font-size:12px; font-weight:800; cursor:pointer; letter-spacing:0.04em; display:flex; align-items:center; justify-content:center; gap:6px;">
                  ${getSvgIcon('check-circle', 14)} SAVE &amp; SYNC STANDARDS
                </button>
              </div>
              <div style="margin-top:6px; font-size:12px; color:#94a3b8; display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.05); padding-top:4px;">
                <span>Vault: <strong style="color:#38BDF8;">${vaultCountsByLevel.total}</strong> Words</span>
                <span style="color:#64748b;">L1: <strong style="color:#818cf8;">${vaultCountsByLevel[1] || 0}</strong> · L2: <strong style="color:#95FF00;">${vaultCountsByLevel[2] || 0}</strong> · L3: <strong style="color:#C084FC;">${vaultCountsByLevel[3] || 0}</strong> · Non-L: <strong style="color:#94A3B8;">${vaultCountsByLevel[0] || 0}</strong></span>
              </div>
            </div>

          </div><!-- /TOP ROW -->

          <!-- BOTTOM SECTION: Full-Width Classes Datagrid Table (flex: 1 1 0) -->
          <div class="table-wrap sticky-first" style="flex:1 1 0 !important; min-height:0 !important; max-height:100% !important; overflow-y:auto !important; overflow-x:auto !important; background:#0f172a; border:1px solid rgba(255,255,255,0.12) !important; border-radius:8px; margin:0;">
            <table class="datagrid-table" style="width:100%; min-width:1355px; border-collapse:collapse; table-layout:fixed;">
              <colgroup>
                <col style="width:40px;">
                <col style="width:75px;">
                <col style="width:95px;">
                <col style="width:55px;">
                <col style="width:170px;">
                <col style="width:110px;">
                <col style="width:65px;">
                <col style="width:185px;">
                <col style="width:320px;">
                <col style="width:80px;">
                <col style="width:80px;">
                <col style="width:80px;">
              </colgroup>
              <thead style="position:sticky; top:0; z-index:20;">
                <!-- Super-Headers Grouping (Dark Surface with Themed Colored Fonts SSOT §2.34 & Rule 4.11) -->
                <tr style="height:30px;">
                  <th colspan="7" style="background:#0b1120 !important; color:#ffffff !important; font-size:12px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.18); border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px;">CURRICULUM IDENTITY</th>
                  <th colspan="2" style="background:#0b1120 !important; color:var(--primary-tactical, #38bdf8) !important; font-size:12px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.18); border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px; text-shadow:0 0 10px rgba(56,189,248,0.35);">ASSESSMENT ENGINE</th>
                  <th colspan="2" style="background:#0b1120 !important; color:var(--quad-b, #ff8c00) !important; font-size:12px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.18); border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px; text-shadow:0 0 10px rgba(255,140,0,0.35);">PASSING STANDARDS</th>
                  <th colspan="1" style="background:#0b1120 !important; color:var(--grade-b, #95ff00) !important; font-size:12px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.18); height:30px; line-height:30px; text-shadow:0 0 10px rgba(149,255,0,0.35);">READINESS</th>
                </tr>
                <!-- Sub-Headers (Matching Themed Parent Colors on Dark Surface SSOT) -->
                <tr style="height:30px;">
                  <th style="width:40px; text-align:center; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;">NO</th>
                  <th style="width:75px; text-align:center; cursor:pointer; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;" onclick="window.sortClassesHub('institution')" title="Sort by Institution">INST ${getSortIcon('institution')}</th>
                  <th style="width:95px; text-align:left; cursor:pointer; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;" onclick="window.sortClassesHub('program')" title="Sort by Program">PROGRAM ${getSortIcon('program')}</th>
                  <th style="width:55px; text-align:center; cursor:pointer; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;" onclick="window.sortClassesHub('level')" title="Sort by Level">LVL ${getSortIcon('level')}</th>
                  <th style="width:170px; text-align:left; cursor:pointer; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;" onclick="window.sortClassesHub('name')" title="Sort by Class Name">CLASS NAME ${getSortIcon('name')}</th>
                  <th style="width:110px; text-align:center; cursor:pointer; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;" onclick="window.sortClassesHub('code')" title="Sort by Code">CODE ${getSortIcon('code')}</th>
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
      ` : `
        <!-- NON-VOCAB / MASTER DIRECTORY: Full-width Datagrid View -->
        <div class="classes-hub-workspace" style="display:flex; flex-direction:column; flex:1 1 0 !important; min-height:0 !important; max-height:100% !important; overflow:hidden !important; gap:0; padding:10px; box-sizing:border-box; background:#090d16;">

          <div class="table-wrap sticky-first" style="flex:1 1 0 !important; min-height:0 !important; max-height:100% !important; overflow-y:auto !important; overflow-x:auto !important; background:#0f172a; border:1px solid rgba(255,255,255,0.12) !important; border-radius:8px; margin:0;">
            <table class="datagrid-table" style="width:100%; min-width:1355px; border-collapse:collapse; table-layout:fixed;">
              <colgroup>
                <col style="width:40px;">
                <col style="width:75px;">
                <col style="width:95px;">
                <col style="width:55px;">
                <col style="width:170px;">
                <col style="width:110px;">
                <col style="width:65px;">
                <col style="width:185px;">
                <col style="width:320px;">
                <col style="width:80px;">
                <col style="width:80px;">
                <col style="width:80px;">
              </colgroup>
              <thead style="position:sticky; top:0; z-index:20;">
                <!-- Super-Headers Grouping (Dark Surface with Themed Colored Fonts SSOT §2.34 & Rule 4.11) -->
                <tr style="height:30px;">
                  <th colspan="7" style="background:#0b1120 !important; color:#ffffff !important; font-size:12px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.18); border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px;">CURRICULUM IDENTITY</th>
                  <th colspan="2" style="background:#0b1120 !important; color:var(--primary-tactical, #38bdf8) !important; font-size:12px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.18); border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px; text-shadow:0 0 10px rgba(56,189,248,0.35);">ASSESSMENT ENGINE</th>
                  <th colspan="2" style="background:#0b1120 !important; color:var(--quad-b, #ff8c00) !important; font-size:12px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.18); border-right:2px solid rgba(255,255,255,0.22) !important; height:30px; line-height:30px; text-shadow:0 0 10px rgba(255,140,0,0.35);">PASSING STANDARDS</th>
                  <th colspan="1" style="background:#0b1120 !important; color:var(--grade-b, #95ff00) !important; font-size:12px; font-weight:800; text-align:center; padding:5px 8px; border-bottom:1px solid rgba(255,255,255,0.18); height:30px; line-height:30px; text-shadow:0 0 10px rgba(149,255,0,0.35);">READINESS</th>
                </tr>
                <!-- Sub-Headers (Matching Themed Parent Colors on Dark Surface SSOT) -->
                <tr style="height:30px;">
                  <th style="width:40px; text-align:center; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;">NO</th>
                  <th style="width:75px; text-align:center; cursor:pointer; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;" onclick="window.sortClassesHub('institution')" title="Sort by Institution">INSTITUTION ${getSortIcon('institution')}</th>
                  <th style="width:95px; text-align:left; cursor:pointer; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;" onclick="window.sortClassesHub('program')" title="Sort by Program">PROGRAM ${getSortIcon('program')}</th>
                  <th style="width:55px; text-align:center; cursor:pointer; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;" onclick="window.sortClassesHub('level')" title="Sort by Level">LVL ${getSortIcon('level')}</th>
                  <th style="width:170px; text-align:left; cursor:pointer; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;" onclick="window.sortClassesHub('name')" title="Sort by Class Name">CLASS NAME ${getSortIcon('name')}</th>
                  <th style="width:110px; text-align:center; cursor:pointer; background:#0b1120 !important; color:#ffffff !important; font-weight:700; font-size:12px; border-right:1px solid rgba(255,255,255,0.08); height:30px; line-height:30px;" onclick="window.sortClassesHub('code')" title="Sort by Code">CODE ${getSortIcon('code')}</th>
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
