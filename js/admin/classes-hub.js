import { adminFetchAll, adminUpdate } from '../api.js?v=5.1.0';
import { showToast } from '../app.js?v=5.1.0';

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function renderClassesHub(area) {
  area.innerHTML = '<div class="empty-state"><div class="spinner"></div><p>Loading Classes Hub...</p></div>';

  try {
    const [institutions, programs, classes, levels, classLevels, students, batches] = await Promise.all([
      adminFetchAll('institutions', 'id, name, code, is_active, deleted_at'),
      adminFetchAll('programs',    'id, name, code, institution_id, is_active, deleted_at'),
      adminFetchAll('classes',     'id, name, code, is_active, program_id, level_id, institution_id, deleted_at'),
      adminFetchAll('levels',      'id, name, level_number'),
      adminFetchAll('class_levels', 'class_id, level_id').catch(() => []),
      adminFetchAll('students',    'id, name, program_id, batch_id, level_id, is_active, deleted_at').catch(() => []),
      adminFetchAll('batches',     'id, program_id, current_level_id, is_active, deleted_at').catch(() => [])
    ]);

    const activeInsts   = (institutions || []).filter(i => !i.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const activeProgs   = (programs    || []).filter(p => !p.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const activeClasses = (classes     || []).filter(c => !c.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const activeLevels  = (levels      || []).sort((a, b) => (a.level_number || 0) - (b.level_number || 0));

    const batchMap = new Map((batches || []).filter(b => !b.deleted_at).map(b => [b.id, b]));
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

    const progMap = new Map(activeProgs.map(p => [p.id, p]));
    const instMap = new Map(activeInsts.map(i => [i.id, i]));

    window._classesHubRecords = {};
    activeInsts.forEach(r   => window._classesHubRecords[r.id] = r);
    activeProgs.forEach(r   => window._classesHubRecords[r.id] = r);
    activeClasses.forEach(r => window._classesHubRecords[r.id] = r);
    activeLevels.forEach(r  => window._classesHubRecords[r.id] = r);

    if (!window._classesHubActiveInst) window._classesHubActiveInst = 'all';
    if (!window._classesHubExpandedLevels || window._classesHubExpandedLevels.size === 0) {
      window._classesHubExpandedLevels = new Set(activeLevels.map(l => l.id));
      window._classesHubExpandedLevels.add('unassigned');
    }

    window.switchClassesHubInst = (instId) => { 
      window._classesHubActiveInst = instId; 
      renderView(); 
    };

    window.toggleClassesHubLevel = (levelId) => {
      if (window._classesHubExpandedLevels.has(levelId)) {
        window._classesHubExpandedLevels.delete(levelId);
      } else {
        window._classesHubExpandedLevels.add(levelId);
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
        showToast('Status updated.', 'success');
        if (table === 'classes' && window.loadSidebarClasses) window.loadSidebarClasses();
        renderView();
      } catch (err) {
        showToast('Failed: ' + (err && err.message ? err.message : err), 'error');
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

    const renderView = () => {
      const activeInstFilter = window._classesHubActiveInst || 'all';

      const instTabsHtml = window.buildSectionTabBar ? window.buildSectionTabBar({
        tabs: [
          { id: 'all', icon: '🌐', title: 'All Institutions', val: activeClasses.length, label: 'Classes' },
          ...activeInsts.map(inst => {
            const cnt = activeClasses.filter(c => {
              const prog = progMap.get(c.program_id);
              return (prog && prog.institution_id === inst.id) || (c.institution_id === inst.id);
            }).length;
            return { id: inst.id, icon: '🏢', title: inst.name, val: cnt, label: cnt === 1 ? 'Class' : 'Classes' };
          })
        ],
        activeId: activeInstFilter,
        onSelect: 'window.switchClassesHubInst'
      }) : '';

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
            return (c.name || '').toLowerCase().includes(searchQuery) ||
                   (c.code || '').toLowerCase().includes(searchQuery) ||
                   (prog && (prog.name || '').toLowerCase().includes(searchQuery)) ||
                   (inst && (inst.name || '').toLowerCase().includes(searchQuery));
          })
        : filteredClasses;

      const buildClassRow = (cls) => {
        const prog = progMap.get(cls.program_id);
        const inst = prog ? instMap.get(prog.institution_id) : (cls.institution_id ? instMap.get(cls.institution_id) : null);
        const progName  = prog ? escapeHtml(prog.name) : '-- No Program --';
        const instLabel = inst ? '<span class="text-xs text-muted" style="margin-left:4px;">· ' + escapeHtml(inst.name) + '</span>' : '';
        const isDimmed  = !cls.is_active ? 'tree-item-dimmed' : '';
        const effectiveCode = cls.code || (cls.name ? cls.name.toUpperCase().replace(/[^A-Z0-9]+/g, '_') : '');
        const codeHtml  = effectiveCode
          ? '<span class="text-xs text-muted" style="font-family:monospace;background:rgba(255,255,255,0.04);padding:2px 6px;border-radius:4px;border:1px solid rgba(255,255,255,0.08);">' + escapeHtml(effectiveCode) + '</span>'
          : '<span class="text-xs text-muted">-</span>';
        const eligibleCount = getEligibleStudentCountForClass(cls);
        const studentsHtml  = '<span class="badge-tag" style="background:rgba(99,102,241,0.12);color:#818cf8;border:1px solid rgba(99,102,241,0.25);font-size:0.75rem;padding:2px 8px;" title="' + eligibleCount + ' students eligible to take this class">👥 ' + eligibleCount + '</span>';

        return '<div class="classes-hub-grid-row ' + isDimmed + '">' +
          '<div class="d-flex align-center gap-2" style="min-width:0;">' +
            '<span style="font-size:0.95rem;">📖</span>' +
            '<span class="text-truncate" style="font-weight:600;font-size:0.88rem;color:var(--fm-text-primary);" title="' + escapeHtml(cls.name) + '">' + escapeHtml(cls.name) + '</span>' +
          '</div>' +
          '<div class="d-flex align-center text-truncate"><span class="text-xs" style="color:var(--fm-text-secondary);">' + progName + '</span>' + instLabel + '</div>' +
          '<div style="text-align:center;">' + codeHtml + '</div>' +
          '<div style="text-align:center;">' + studentsHtml + '</div>' +
          '<div style="text-align:center;"><span class="badge-tag ' + (cls.is_active ? 'badge-tag-ongoing' : 'badge-tag-completed') + '">' + (cls.is_active ? '🟢 Active' : '⚪ Inactive') + '</span></div>' +
          '<div class="tree-actions-right" style="justify-content:flex-end;">' +
            '<label class="toggle-switch" title="Toggle Active"><input type="checkbox" onchange="window.toggleClassesHubEntity(\'classes\',\'' + cls.id + '\',this.checked)" ' + (cls.is_active ? 'checked' : '') + '><span class="toggle-slider"></span></label>' +
            '<button class="btn btn-secondary btn-sm" style="padding:3px 8px;font-size:0.75rem;" onclick="window.openClassesHubEdit(\'classes\',\'' + cls.id + '\')">✏️ Edit</button>' +
            '<button class="btn btn-danger btn-sm"    style="padding:3px 7px;font-size:0.75rem;" onclick="window.deleteClassesHubRecord(\'classes\',\'' + cls.id + '\',\'' + escapeHtml(cls.name) + '\')">🗑️</button>' +
          '</div>' +
        '</div>';
      };

      const getSortIcon = (key) => {
        const cur = window._classesHubSort || { key: 'name', asc: true };
        if (cur.key !== key) return '<span style="opacity:0.35;margin-left:4px;font-size:0.8rem;">↕</span>';
        return cur.asc ? '<span style="color:var(--clr-primary,#6366f1);margin-left:4px;font-size:0.8rem;">▲</span>' : '<span style="color:var(--clr-primary,#6366f1);margin-left:4px;font-size:0.8rem;">▼</span>';
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
          } else if (key === 'status') {
            res = (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
          }
          return asc ? res : -res;
        });
      };

      const tableHeaderHtml = '<div class="classes-hub-grid-header" style="user-select:none;">' +
        '<div style="cursor:pointer;" onclick="window.sortClassesHub(\'name\')" title="Sort by Class Name">Class Name ' + getSortIcon('name') + '</div>' +
        '<div style="cursor:pointer;" onclick="window.sortClassesHub(\'program\')" title="Sort by Program">Program ' + getSortIcon('program') + '</div>' +
        '<div style="text-align:center;cursor:pointer;" onclick="window.sortClassesHub(\'code\')" title="Sort by Code">Code ' + getSortIcon('code') + '</div>' +
        '<div style="text-align:center;cursor:pointer;" onclick="window.sortClassesHub(\'students\')" title="Sort by Eligible Students">Students ' + getSortIcon('students') + '</div>' +
        '<div style="text-align:center;cursor:pointer;" onclick="window.sortClassesHub(\'status\')" title="Sort by Status">Status ' + getSortIcon('status') + '</div>' +
        '<div style="text-align:right;">Actions</div>' +
      '</div>';

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

        levelGroupsHtml += '<div class="classes-hub-level-group">' +
          '<div class="classes-hub-level-header" onclick="window.toggleClassesHubLevel(\'' + level.id + '\')">' +
            '<div class="d-flex align-center gap-2">' +
              '<span class="classes-hub-collapse-icon">' + (isExpanded ? '▼' : '▶') + '</span>' +
              '<span class="classes-hub-level-badge">L' + (level.level_number !== undefined ? level.level_number : '?') + '</span>' +
              '<span style="font-weight:700;font-size:1rem;color:var(--fm-text-primary);">' + levelLabel + '</span>' +
              '<span class="badge-tag" style="background:rgba(99,102,241,0.12);color:#818cf8;border:1px solid rgba(99,102,241,0.25);font-size:0.72rem;">' + levelClasses.length + ' ' + (levelClasses.length === 1 ? 'Class' : 'Classes') + '</span>' +
            '</div>' +
            '<div class="tree-actions-right" onclick="event.stopPropagation()">' +
              '<button class="btn btn-primary btn-sm"   style="font-size:0.75rem;padding:4px 9px;" onclick="window.openClassesHubAddClass(\'' + level.id + '\')">+ Add Class</button>' +
              '<button class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:4px 8px;" onclick="window.openClassesHubEdit(\'levels\',\'' + level.id + '\')">✏️ Edit</button>' +
              '<button class="btn btn-danger btn-sm"    style="font-size:0.75rem;padding:4px 7px;" onclick="window.deleteClassesHubRecord(\'levels\',\'' + level.id + '\',\'' + levelLabel + '\')">🗑️</button>' +
            '</div>' +
          '</div>' +
          (isExpanded ? '<div class="classes-hub-level-body">' + bodyHtml + '</div>' : '') +
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

        levelGroupsHtml += '<div class="classes-hub-level-group" style="border-color:rgba(245,158,11,0.25);">' +
          '<div class="classes-hub-level-header" style="background:rgba(245,158,11,0.06);border-bottom-color:rgba(245,158,11,0.18);" onclick="window.toggleClassesHubLevel(\'unassigned\')">' +
            '<div class="d-flex align-center gap-2">' +
              '<span class="classes-hub-collapse-icon">' + (isExpandedUnassigned ? '▼' : '▶') + '</span>' +
              '<span class="classes-hub-level-badge" style="background:rgba(245,158,11,0.2);color:#f59e0b;border-color:rgba(245,158,11,0.4);">L?</span>' +
              '<span style="font-weight:700;font-size:1rem;color:var(--fm-text-primary);">Unassigned Level</span>' +
              '<span class="badge-tag" style="background:rgba(245,158,11,0.15);color:#f59e0b;border:1px solid rgba(245,158,11,0.3);font-size:0.72rem;">' + unassignedClasses.length + ' ' + (unassignedClasses.length === 1 ? 'Class' : 'Classes') + '</span>' +
            '</div>' +
            '<div class="tree-actions-right" onclick="event.stopPropagation()">' +
              '<button class="btn btn-secondary btn-sm" style="font-size:0.75rem;padding:4px 9px;" onclick="window.openClassesHubAddClass(null)">+ Add Class</button>' +
            '</div>' +
          '</div>' +
          (isExpandedUnassigned ? '<div class="classes-hub-level-body">' + unassignedBodyHtml + '</div>' : '') +
        '</div>';
      }

      area.innerHTML = '<div>' +
        instTabsHtml +
        '<div class="hub-toolbar mb-3">' +
          '<div class="hub-toolbar-search">' +
            '<span style="color:var(--fm-text-muted);font-size:0.9rem;">🔍</span>' +
            '<input type="text" id="classes-hub-search" class="form-control" placeholder="Search classes, codes, or programs..." value="' + escapeHtml(searchQuery) + '" style="padding:5px 10px;font-size:0.85rem;height:32px;background:rgba(0,0,0,0.2);" />' +
          '</div>' +
          '<div class="d-flex align-center gap-2">' +
            '<span class="text-xs text-muted">' + filteredClasses.length + ' Classes · ' + activeLevels.length + ' Levels</span>' +
            '<button class="btn btn-primary btn-sm" onclick="window.openClassesHubAddLevel()" style="font-size:0.75rem;padding:4px 9px;">+ Add Level</button>' +
          '</div>' +
        '</div>' +
        '<div id="classes-hub-container">' +
          (activeLevels.length === 0 && unassignedClasses.length === 0
            ? '<div class="empty-state"><p>No levels defined yet.</p><button class="btn btn-primary mt-2" onclick="window.openClassesHubAddLevel()">+ Create First Level</button></div>'
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
          if (inp) { inp.focus(); inp.selectionStart = inp.selectionEnd = inp.value.length; }
        });
      }
    };

    renderView();

  } catch (error) {
    console.error('[ClassesHub] Load error:', error);
    area.innerHTML = '<div class="empty-state"><p style="color:red;">Error loading Classes Hub: ' + error.message + '</p></div>';
  }
}
