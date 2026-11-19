import { adminFetchAll, adminUpdate, adminInsert, adminSoftDelete, toShortLevel } from '../api.js?v=20261114_v517';
import { openCrudModal } from './crud-modals.js?v=20261115_v528';
import { showToast, escapeHtml, escHtml } from '../app.js?v=20261106_v160';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
}

function getBatchPeriodInfo(startDateStr, endDateStr) {
  if (!startDateStr) {
    return {
      hasDates: false,
      startDateFormatted: '—',
      endDateFormatted: '—',
      dateRange: 'Not Scheduled',
      durationText: '—',
      remainingText: '—',
      remainingBadge: '<span style="color:var(--fm-text-muted);font-size:12px;">—</span>',
      statusBadge: '<span style="color:#64748b;font-style:italic;">Unscheduled</span>'
    };
  }

  const startFormatted = formatDate(startDateStr);
  const endFormatted = endDateStr ? formatDate(endDateStr) : '—';
  const dateRange = `${getSvgIcon('calendar', 12)} ${startFormatted} – ${endFormatted}`;

  let durationText = '—';
  let statusBadge = '';

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);

  let remainingText = '';
  let remainingBadge = '';

  if (endDateStr) {
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const weeks = Math.round(diffDays / 7);
    durationText = weeks >= 1 ? `${weeks} Weeks (${diffDays} Days)` : `${diffDays} Days`;

    if (now < start) {
      const daysUntil = Math.ceil((start - now) / (1000 * 60 * 60 * 24));
      statusBadge = `<span style="color:var(--grade-c);font-weight:600;display:inline-flex;align-items:center;gap:5px;"><span class="status-dot dot-warning" style="width:6px;height:6px;border-radius:50%;background:var(--grade-c);display:inline-block;"></span> Upcoming</span>`;
      remainingText = `Starts in ${daysUntil}d`;
      remainingBadge = `<span style="color:var(--grade-c);font-size:12px;display:inline-flex;align-items:center;gap:4px;">${getSvgIcon('calendar', 12)} ${daysUntil}d to start</span>`;
    } else if (now > end) {
      statusBadge = `<span style="color:#94a3b8;font-weight:500;display:inline-flex;align-items:center;gap:5px;"><span class="status-dot dot-draft" style="width:6px;height:6px;border-radius:50%;background:#94a3b8;display:inline-block;"></span> Completed</span>`;
      remainingText = 'Done';
      remainingBadge = `<span style="color:#94a3b8;font-size:12px;">✓ Completed</span>`;
    } else {
      const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      const weeksLeft = Math.floor(daysLeft / 7);
      remainingText = weeksLeft >= 1 ? `${weeksLeft}w ${daysLeft % 7}d left` : `${daysLeft}d left`;
      const urgentColor = daysLeft <= 14 ? 'var(--grade-e)' : daysLeft <= 30 ? 'var(--grade-d)' : 'var(--grade-a)';
      remainingBadge = `<span style="color:${urgentColor};font-size:12px;display:inline-flex;align-items:center;gap:4px;">${getSvgIcon('clock', 12)} ${remainingText}</span>`;
      statusBadge = `<span style="color:var(--grade-a);font-weight:600;display:inline-flex;align-items:center;gap:5px;"><span class="status-dot dot-success" style="width:6px;height:6px;border-radius:50%;background:var(--grade-a);display:inline-block;"></span> Ongoing</span>`;
    }
  } else {
    if (now < start) {
      statusBadge = `<span style="color:var(--grade-c);font-weight:600;display:inline-flex;align-items:center;gap:5px;"><span class="status-dot dot-warning" style="width:6px;height:6px;border-radius:50%;background:var(--grade-c);display:inline-block;"></span> Upcoming</span>`;
    } else {
      statusBadge = `<span style="color:var(--grade-a);font-weight:600;display:inline-flex;align-items:center;gap:5px;"><span class="status-dot dot-success" style="width:6px;height:6px;border-radius:50%;background:var(--grade-a);display:inline-block;"></span> Ongoing</span>`;
    }
  }

  return {
    hasDates: true,
    startDateFormatted: startFormatted,
    endDateFormatted: endFormatted,
    dateRange,
    durationText,
    statusBadge,
    remainingText,
    remainingBadge
  };
}

export async function renderCurriculum(area) {
  area.innerHTML = typeof window.getLoadingStateHtml === 'function'
    ? window.getLoadingStateHtml('Loading Organization Hub...')
    : '<div class="topscore-loading-center"><div class="spinner"></div><p class="loading-text">Loading Organization Hub...</p></div>';

  try {
    const [institutions, programs, classes, batches, levels, students] = await Promise.all([
      adminFetchAll('institutions', 'id, name, code, logo_url, address, phone, email, is_active, deleted_at'),
      adminFetchAll('programs', 'id, name, code, description, institution_id, is_active, deleted_at'),
      adminFetchAll('classes', 'id, name, code, is_active, status, program_id, level_id, deleted_at'),
      adminFetchAll('batches', 'id, name, is_active, program_id, current_level_id, enrollment_date, actual_final_date, deleted_at'),
      adminFetchAll('levels', 'id, name, level_number'),
      adminFetchAll('students', 'id, name, batch_id, is_active, deleted_at').catch(() => [])
    ]);

    // Active records (soft-delete filtered) — sorted A→Z
    const activeInsts   = (institutions || []).filter(i => !i.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const activeProgs   = (programs    || []).filter(p => !p.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const activeClasses = (classes     || []).filter(c => !c.deleted_at);
    const activeBatches = (batches     || []).filter(b => !b.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const activeLevels  = (levels      || []).filter(l => !l.deleted_at).sort((a, b) => (a.level_number || 0) - (b.level_number || 0));
    const activeStudents = (students   || []).filter(s => !s.deleted_at && s.is_active !== false);

    // Build lookup maps
    const lvlMap = new Map(activeLevels.map(l => [l.id, l.name || (l.level_number === 0 ? '—' : `Level ${l.level_number}`)]));
    const batchStudentCountMap = new Map();
    activeStudents.forEach(s => {
      if (s.batch_id) {
        batchStudentCountMap.set(s.batch_id, (batchStudentCountMap.get(s.batch_id) || 0) + 1);
      }
    });

    // Store records in global map for modal access
    window._curriculumRecords = {};
    activeInsts.forEach(r   => window._curriculumRecords[r.id] = r);
    activeProgs.forEach(r   => window._curriculumRecords[r.id] = r);
    activeBatches.forEach(r => window._curriculumRecords[r.id] = r);
    activeClasses.forEach(r => window._curriculumRecords[r.id] = r);

    // State: Active institution tab
    if (!window._curriculumActiveInstId || !activeInsts.some(i => i.id === window._curriculumActiveInstId)) {
      window._curriculumActiveInstId = activeInsts[0]?.id || null;
    }

    // Global Modal and CRUD Helpers
    window.openCurriculumEdit = (table, id) => {
      const rec = window._curriculumRecords[id];
      if (rec && window.openCrudModal) {
        const recordCopy = { ...rec };
        if (!recordCopy.institution_id) {
          if (recordCopy.program_id) {
            const p = activeProgs.find(x => x.id === recordCopy.program_id);
            if (p) recordCopy.institution_id = p.institution_id;
          } else if (table === 'programs') {
            recordCopy.institution_id = recordCopy.institution_id || window._curriculumActiveInstId;
          } else {
            recordCopy.institution_id = window._curriculumActiveInstId;
          }
        }
        window.openCrudModal(table, recordCopy);
      }
    };

    window.openCurriculumAddProgram = (instId) => {
      if (window.openCrudModal) {
        window.openCrudModal('programs', { institution_id: instId, is_active: true });
      }
    };

    window.openCurriculumAddBatch = (progId, instId) => {
      if (window.openCrudModal) {
        const targetProgId = progId || (activeProgs.find(p => p.institution_id === instId)?.id || null);
        window.openCrudModal('batches', { program_id: targetProgId, institution_id: instId, is_active: true });
      }
    };

    window.deleteCurriculumRecord = (table, id, name) => {
      if (window._deleteRecord) {
        window._deleteRecord(table, id, name);
      }
    };

    // Toggle single entity
    window.toggleEntityActive = async (table, id, isActive) => {
      try {
        await adminUpdate(table, id, { is_active: isActive });
        showToast('Status updated successfully.', 'success');
        if (table === 'batches') {
          const b = activeBatches.find(x => x.id === id);
          if (b) b.is_active = isActive;
          if (window.loadSidebarPrograms) window.loadSidebarPrograms();
        } else if (table === 'programs') {
          const p = activeProgs.find(x => x.id === id);
          if (p) p.is_active = isActive;
          if (window.loadSidebarPrograms) window.loadSidebarPrograms();
        } else if (table === 'institutions') {
          const inst = activeInsts.find(x => x.id === id);
          if (inst) inst.is_active = isActive;
        } else if (table === 'classes') {
          const c = activeClasses.find(x => x.id === id);
          if (c) {
            c.is_active = isActive;
            c.status = isActive ? 'active' : 'inactive';
          }
          if (window.loadSidebarClasses) window.loadSidebarClasses();
        }
        renderView();
      } catch (err) {
        console.error('[CurriculumHub] toggleEntityActive failed:', table, id, err);
        showToast(`Failed to update status: ${err?.message || err}`, 'error');
      }
    };

    // Inline field updates for batches, programs, and classes
    window.updateCurriculumBatchField = async (batchId, field, value) => {
      try {
        const val = (field === 'is_active') ? Boolean(value) : value;
        await adminUpdate('batches', batchId, { [field]: val });
        const b = activeBatches.find(x => x.id === batchId);
        if (b) b[field] = val;
        showToast(`Batch ${field} updated successfully.`, 'success');
        if (field === 'is_active' || field === 'name') {
          if (window.loadSidebarPrograms) window.loadSidebarPrograms();
        }
        renderView();
      } catch (err) {
        console.error('[CurriculumHub] updateCurriculumBatchField failed:', batchId, field, err);
        showToast(`Failed to update batch: ${err.message || err}`, 'error');
      }
    };

    window.updateCurriculumProgramField = async (progId, field, value) => {
      try {
        const val = (field === 'is_active') ? Boolean(value) : value;
        await adminUpdate('programs', progId, { [field]: val });
        const p = activeProgs.find(x => x.id === progId);
        if (p) p[field] = val;
        showToast(`Program ${field} updated successfully.`, 'success');
        if (field === 'is_active' || field === 'name') {
          if (window.loadSidebarPrograms) window.loadSidebarPrograms();
        }
        renderView();
      } catch (err) {
        console.error('[CurriculumHub] updateCurriculumProgramField failed:', progId, field, err);
        showToast(`Failed to update program: ${err.message || err}`, 'error');
      }
    };

    window.updateCurriculumClassField = async (classId, field, value) => {
      try {
        const val = (field === 'is_active') ? Boolean(value) : value;
        await adminUpdate('classes', classId, { [field]: val });
        const c = activeClasses.find(x => x.id === classId);
        if (c) c[field] = val;
        showToast(`Class ${field} updated successfully.`, 'success');
        if (field === 'is_active' || field === 'name') {
          if (window.loadSidebarClasses) window.loadSidebarClasses();
        }
        renderView();
      } catch (err) {
        console.error('[CurriculumHub] updateCurriculumClassField failed:', classId, field, err);
        showToast(`Failed to update class: ${err.message || err}`, 'error');
      }
    };

    // Toggle Institution with Cascade Deactivation
    window.toggleInstitutionCascade = async (instId, isActive) => {
      if (!isActive) {
        const confirmCascade = confirm(
          'Deactivate this Institution?\n\nAll Programs, Classes, and Batches under this institution will also be deactivated.'
        );
        if (!confirmCascade) {
          renderView();
          return;
        }

        try {
          await adminUpdate('institutions', instId, { is_active: false });
          const childProgs = activeProgs.filter(p => p.institution_id === instId);
          for (const p of childProgs) {
            await adminUpdate('programs', p.id, { is_active: false });
            const childCls = activeClasses.filter(c => c.program_id === p.id);
            for (const c of childCls) await adminUpdate('classes', c.id, { is_active: false });
            const childBtc = activeBatches.filter(b => b.program_id === p.id);
            for (const b of childBtc) await adminUpdate('batches', b.id, { is_active: false });
          }

          showToast('Institution and all descendant Programs, Classes, and Batches were deactivated.', 'success');
          if (window.loadSidebarPrograms) window.loadSidebarPrograms();
          if (window.loadSidebarClasses) window.loadSidebarClasses();
          renderCurriculum(area);
        } catch (err) {
          console.error('[CurriculumHub] Institution cascade failed:', err);
          showToast(`Failed to deactivate institution: ${err.message || err}`, 'error');
          renderView();
        }
      } else {
        try {
          await adminUpdate('institutions', instId, { is_active: true });
          showToast('Institution activated successfully.', 'success');
          if (window.loadSidebarPrograms) window.loadSidebarPrograms();
          if (window.loadSidebarClasses) window.loadSidebarClasses();
          renderCurriculum(area);
        } catch (err) {
          console.error('[CurriculumHub] Activate institution failed:', err);
          showToast(`Failed to activate institution: ${err.message || err}`, 'error');
          renderView();
        }
      }
    };

    // Toggle Program with Cascade Deactivation
    window.toggleProgramCascade = async (progId, isActive) => {
      if (!isActive) {
        const confirmCascade = confirm(
          'Deactivate this Program?\n\nAll Classes and Batches under this program will also be deactivated.'
        );
        if (!confirmCascade) {
          renderView();
          return;
        }

        try {
          await adminUpdate('programs', progId, { is_active: false });
          const childCls = activeClasses.filter(c => c.program_id === progId);
          for (const c of childCls) await adminUpdate('classes', c.id, { is_active: false });
          const childBtc = activeBatches.filter(b => b.program_id === progId);
          for (const b of childBtc) await adminUpdate('batches', b.id, { is_active: false });

          showToast('Program and all its Classes and Batches were deactivated.', 'success');
          if (window.loadSidebarPrograms) window.loadSidebarPrograms();
          if (window.loadSidebarClasses) window.loadSidebarClasses();
          renderCurriculum(area);
        } catch (err) {
          console.error('[CurriculumHub] Program cascade failed:', err);
          showToast(`Failed to deactivate program: ${err.message || err}`, 'error');
          renderView();
        }
      } else {
        try {
          await adminUpdate('programs', progId, { is_active: true });
          showToast('Program activated successfully.', 'success');
          if (window.loadSidebarPrograms) window.loadSidebarPrograms();
          if (window.loadSidebarClasses) window.loadSidebarClasses();
          renderCurriculum(area);
        } catch (err) {
          console.error('[CurriculumHub] Activate program failed:', err);
          showToast(`Failed to activate program: ${err.message || err}`, 'error');
          renderView();
        }
      }
    };

    window.switchInstitutionTab = (instId) => {
      window._curriculumActiveInstId = instId;
      renderView();
    };

    window._curriculumSort = window._curriculumSort || { key: 'program', asc: true };
    window.sortCurriculum = (key) => {
      if (window._curriculumSort.key === key) {
        window._curriculumSort.asc = !window._curriculumSort.asc;
      } else {
        window._curriculumSort.key = key;
        window._curriculumSort.asc = true;
      }
      renderView();
    };

    const getCurriculumSortIcon = (key) => {
      const cur = window._curriculumSort || { key: 'program', asc: true };
      if (cur.key !== key) return '';
      return cur.asc
        ? '<span style="color:#38bdf8;margin-left:4px;font-size:12px;">▲</span>'
        : '<span style="color:#38bdf8;margin-left:4px;font-size:12px;">▼</span>';
    };

    // Main render function
    const renderView = () => {
      const activeInst = activeInsts.find(i => i.id === window._curriculumActiveInstId) || activeInsts[0];
      if (!activeInst) {
        area.innerHTML = `
          <div class="empty-state">
            <p>No registered institutions found.</p>
            <button class="btn btn-primary mt-2 edit-mode-only" onclick="window.openCrudModal('institutions', null)">+ Add First Institution</button>
          </div>
        `;
        return;
      }

      // Build Top Tabs for Institutions
      const institutionTabs = activeInsts.map(inst => {
        const count = activeProgs.filter(p => p.institution_id === inst.id).length;
        return {
          id: inst.id,
          icon: getSvgIcon('building', 14),
          label: inst.name,
          title: inst.name,
          val: count
        };
      });

      // Set institution tabs in topbar
      if (window.setTopbarTabs) {
        window.setTopbarTabs(institutionTabs, activeInst.id, 'window.switchInstitutionTab');
      }

      // Programs and Batches under current institution
      const instPrograms = activeProgs.filter(p => p.institution_id === activeInst.id);
      const instBatches = activeBatches.filter(b => instPrograms.some(p => p.id === b.program_id));
      const activeBatchesCount = instBatches.filter(b => b.is_active !== false).length;
      const inactiveBatchesCount = instBatches.length - activeBatchesCount;
      const totalStudents = instBatches.reduce((sum, b) => sum + (batchStudentCountMap.get(b.id) || 0), 0);

      // Search query filter
      const searchInpEl = document.getElementById('curriculum-search-input');
      const searchQuery = (searchInpEl?.value || '').toLowerCase().trim();

      // Build unified list of table items (each batch or empty-program row)
      const tableItems = [];
      instPrograms.forEach(prog => {
        const progBatches = instBatches.filter(b => b.program_id === prog.id);
        const progClasses = activeClasses.filter(c => c.program_id === prog.id);

        if (progBatches.length === 0) {
          tableItems.push({
            type: 'program-only',
            id: `prog-${prog.id}`,
            batch: null,
            program: prog,
            classes: progClasses,
            primaryClass: progClasses[0] || null,
            name: '— No Batches Scheduled —',
            levelName: '—',
            studentCount: 0,
            periodInfo: {
              hasDates: false,
              startDateFormatted: '—',
              endDateFormatted: '—',
              durationText: '—',
              remainingBadge: '<span style="color:var(--fm-text-muted);font-size:12px;">—</span>',
              statusBadge: '<span style="color:#64748b;font-style:italic;">No Batches</span>'
            },
            isActive: prog.is_active !== false
          });
        } else {
          progBatches.forEach(b => {
            const primaryClass = progClasses.find(c => !b.current_level_id || c.level_id === b.current_level_id) || progClasses[0] || null;
            const lvlRaw = b.current_level_id ? (lvlMap.get(b.current_level_id) || '—') : '—';
            const lvlName = (lvlRaw === 'Non-Level' || !b.current_level_id) ? '—' : (typeof toShortLevel === 'function' ? toShortLevel(lvlRaw) : lvlRaw);

            tableItems.push({
              type: 'batch',
              id: b.id,
              batch: b,
              program: prog,
              classes: progClasses,
              primaryClass: primaryClass,
              name: b.name || '',
              levelName: lvlName,
              studentCount: batchStudentCountMap.get(b.id) || 0,
              periodInfo: getBatchPeriodInfo(b.enrollment_date, b.actual_final_date),
              isActive: b.is_active !== false
            });
          });
        }
      });

      // Filtered items based on search query
      const filteredItems = tableItems.filter(item => {
        if (!searchQuery) return true;
        const pName = (item.program?.name || '').toLowerCase();
        const pCode = (item.program?.code || '').toLowerCase();
        const bName = (item.batch?.name || '').toLowerCase();
        const cName = (item.primaryClass?.name || '').toLowerCase();
        return pName.includes(searchQuery) || pCode.includes(searchQuery) || bName.includes(searchQuery) || cName.includes(searchQuery);
      });

      // Sort items
      const sortCurriculumItems = (list) => {
        const { key, asc } = window._curriculumSort || { key: 'program', asc: true };
        return [...list].sort((a, b) => {
          let res = 0;
          if (key === 'program') {
            res = (a.program?.name || '').localeCompare(b.program?.name || '');
          } else if (key === 'name' || key === 'batch') {
            res = (a.batch?.name || a.name || '').localeCompare(b.batch?.name || b.name || '', undefined, { numeric: true, sensitivity: 'base' });
          } else if (key === 'class') {
            res = (a.primaryClass?.name || '').localeCompare(b.primaryClass?.name || '');
          } else if (key === 'level') {
            res = (a.levelName || '').localeCompare(b.levelName || '');
          } else if (key === 'students') {
            res = a.studentCount - b.studentCount;
          } else if (key === 'start') {
            const tA = a.batch?.enrollment_date ? new Date(a.batch.enrollment_date).getTime() : 0;
            const tB = b.batch?.enrollment_date ? new Date(b.batch.enrollment_date).getTime() : 0;
            res = tA - tB;
          } else if (key === 'finish') {
            const tA = a.batch?.actual_final_date ? new Date(a.batch.actual_final_date).getTime() : 0;
            const tB = b.batch?.actual_final_date ? new Date(b.batch.actual_final_date).getTime() : 0;
            res = tA - tB;
          } else if (key === 'duration') {
            const getDays = it => (it.batch?.enrollment_date && it.batch?.actual_final_date)
              ? Math.round((new Date(it.batch.actual_final_date) - new Date(it.batch.enrollment_date)) / 86400000) : 0;
            res = getDays(a) - getDays(b);
          } else if (key === 'status' || key === 'period' || key === 'active') {
            const getRank = it => {
              if (!it.isActive) return 1;
              if (it.periodInfo?.statusBadge?.includes('Ongoing')) return 3;
              return 2;
            };
            res = getRank(a) - getRank(b);
          }
          return asc ? res : -res;
        });
      };

      const sortedItems = sortCurriculumItems(filteredItems);

      // Check global edit mode
      const isEditOn = (typeof document !== 'undefined' && document.body.classList.contains('global-edit-mode-on')) || Boolean(window._globalEditMode);

      // Institution Logo or Avatar
      const instInitials = (activeInst.code || activeInst.name || 'INS').substring(0, 3).toUpperCase();
      const avatarHtml = activeInst.logo_url
        ? `<div class="curriculum-inst-avatar" style="width:40px;height:40px;border-radius:6px;"><img src="${escapeHtml(activeInst.logo_url)}" alt="${escapeHtml(activeInst.name)}" /></div>`
        : `<div class="curriculum-inst-avatar" style="width:40px;height:40px;border-radius:6px;display:flex;align-items:center;justify-content:center;background:rgba(99,102,241,0.15);color:#818cf8;">${getSvgIcon('building', 20)}</div>`;

      // Build Table Rows
      let rowsHtml = '';
      if (sortedItems.length === 0) {
        rowsHtml = `
          <tr>
            <td colspan="11" style="text-align:center;padding:36px 16px;color:var(--fm-text-muted);">
              <div style="font-size:14px;font-weight:600;margin-bottom:6px;">No records found</div>
              <div style="font-size:12px;">Try adjusting your search query or click "+ Add Batch" below to create one.</div>
            </td>
          </tr>
        `;
      } else {
        rowsHtml = sortedItems.map((item, idx) => {
          const isProgOnly = item.type === 'program-only';
          const batch = item.batch;
          const prog = item.program;
          const cls = item.primaryClass;
          const periodInfo = item.periodInfo;
          const isRowDimmed = !item.isActive || !prog.is_active || !activeInst.is_active;
          const rowStyle = isRowDimmed ? 'opacity: 0.65;' : '';

          // 1. Program Cell
          const programCellHtml = isEditOn
            ? `<input type="text" class="form-control form-control-sm table-cell-input" value="${escapeHtml(prog.name)}" onchange="window.updateCurriculumProgramField('${prog.id}','name',this.value)" style="background:rgba(0,0,0,0.4);color:#fff;border:1px solid rgba(56,189,248,0.4);border-radius:4px;padding:3px 6px;font-size:12px;width:100%;box-sizing:border-box;" title="Edit Program Name" />`
            : `<div class="d-flex align-center gap-2" style="min-width:0;">
                <span style="font-weight:600;font-size:12px;color:var(--fm-text-primary);" class="text-truncate" title="${escapeHtml(prog.name)}">${escapeHtml(prog.name)}</span>
                ${(prog.code && prog.code.toUpperCase() !== prog.name.toUpperCase()) ? `<span class="badge-tag" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:var(--fm-text-muted);font-size:12px;">${escapeHtml(prog.code)}</span>` : ''}
              </div>`;

          // 2. Batch Name Cell
          let batchCellHtml = '';
          if (isProgOnly) {
            batchCellHtml = `<span style="color:var(--fm-text-muted);font-style:italic;font-size:12px;">— No Batches —</span>`;
          } else if (isEditOn) {
            batchCellHtml = `<input type="text" class="form-control form-control-sm table-cell-input" value="${escapeHtml(batch.name)}" onchange="window.updateCurriculumBatchField('${batch.id}','name',this.value)" style="background:rgba(0,0,0,0.4);color:#fff;border:1px solid rgba(56,189,248,0.4);border-radius:4px;padding:3px 6px;font-size:12px;width:100%;box-sizing:border-box;" title="Edit Batch Name" />`;
          } else {
            batchCellHtml = `<div class="d-flex align-center gap-2" style="min-width:0;">
              <span style="color:#818cf8;display:inline-flex;align-items:center;">${getSvgIcon('tag', 12)}</span>
              <span style="font-weight:600;font-size:12px;color:#f8fafc;" class="text-truncate" title="${escapeHtml(batch.name)}">${escapeHtml(batch.name)}</span>
            </div>`;
          }

          // 3. Class Cell (Clean single-line per ui-invariants.md §1.2 & §4.4)
          let classCellHtml = '';
          if (!cls) {
            classCellHtml = `<span style="color:var(--fm-text-muted);font-size:12px;font-style:italic;">—</span>`;
          } else if (isEditOn) {
            classCellHtml = `<input type="text" class="form-control form-control-sm table-cell-input" value="${escapeHtml(cls.name)}" onchange="window.updateCurriculumClassField('${cls.id}','name',this.value)" style="background:rgba(0,0,0,0.4);color:#fff;border:1px solid rgba(56,189,248,0.4);border-radius:4px;padding:3px 6px;font-size:12px;width:100%;box-sizing:border-box;" title="Edit Class Name" />`;
          } else {
            classCellHtml = `
              <div class="d-flex align-center gap-2" style="min-width:0;">
                <span style="color:var(--grade-b);display:inline-flex;align-items:center;">${getSvgIcon('book-open', 12)}</span>
                <span style="font-size:12px;color:var(--fm-text-secondary);" class="text-truncate" title="${escapeHtml(cls.name)}">${escapeHtml(cls.name)}</span>
              </div>
            `;
          }

          // 4. Level Cell (Zero-Truncation SSOT per ui-invariants.md §6.5)
          let levelCellHtml = '';
          const formatLevelOptionLabel = (l) => {
            if (l.level_number === 0 || (l.name && l.name.toLowerCase().includes('non-level'))) return '—';
            if (l.level_number === 99 || (l.name && l.name.toLowerCase().includes('alumni'))) return 'X (Alumni)';
            if (l.level_number === 1 || (l.name && l.name.startsWith('1'))) return '1st';
            if (l.level_number === 2 || (l.name && l.name.startsWith('2'))) return '2nd';
            if (l.level_number === 3 || (l.name && l.name.startsWith('3'))) return '3rd';
            return l.name || (l.level_number ? `Level ${l.level_number}` : '—');
          };

          if (isProgOnly) {
            levelCellHtml = `<span style="color:#94a3b8;font-size:12px;">—</span>`;
          } else if (isEditOn) {
            levelCellHtml = `
              <select class="table-cell-select" onchange="window.updateCurriculumBatchField('${batch.id}','current_level_id',this.value)" style="background:#1e293b;color:#f8fafc;border:1px solid rgba(56,189,248,0.4);border-radius:4px;padding:2px 4px;font-size:12px;width:100%;box-sizing:border-box;">
                ${activeLevels.map(l => `<option value="${l.id}" ${batch.current_level_id === l.id ? 'selected' : ''}>${formatLevelOptionLabel(l)}</option>`).join('')}
              </select>
            `;
          } else {
            levelCellHtml = item.levelName === '—'
              ? '<span style="color:#94a3b8;font-size:12px;">—</span>'
              : (item.levelName === 'X' || item.levelName === 'Alumni'
                  ? '<span style="color:var(--quad-d);font-weight:700;font-size:12px;">X</span>'
                  : `<span style="color:#f8fafc;font-weight:600;font-size:12px;">${escapeHtml(item.levelName)}</span>`);
          }

          // 5. Students Cell
          const studentsCellHtml = isProgOnly
            ? '<span style="color:var(--fm-text-muted);font-size:12px;">—</span>'
            : `<span class="badge-tag" style="background:rgba(99,102,241,0.12);color:#818cf8;border:1px solid rgba(99,102,241,0.25);width:100%;justify-content:center;cursor:pointer;display:inline-flex;align-items:center;gap:4px;" title="View ${item.studentCount} enrolled students" onclick="window._filterBatchId='${batch.id}'; window._filterBatchName='${escapeHtml(batch.name)}'; if(window.loadSection) window.loadSection('students');">${getSvgIcon('users', 12)} ${item.studentCount}</span>`;

          // 6. Start Date Cell
          let startCellHtml = '';
          if (isProgOnly) {
            startCellHtml = '<span style="color:var(--fm-text-muted);font-size:12px;">—</span>';
          } else if (isEditOn) {
            startCellHtml = `<input type="date" value="${batch.enrollment_date || ''}" onchange="window.updateCurriculumBatchField('${batch.id}','enrollment_date',this.value)" style="background:#1e293b;color:#f8fafc;border:1px solid rgba(56,189,248,0.4);border-radius:4px;padding:2px 4px;font-size:12px;width:100%;box-sizing:border-box;" />`;
          } else {
            startCellHtml = `<span style="color:var(--fm-text-secondary);font-size:12px;">${periodInfo.hasDates ? escapeHtml(periodInfo.startDateFormatted) : '—'}</span>`;
          }

          // 7. Finish Date Cell
          let finishCellHtml = '';
          if (isProgOnly) {
            finishCellHtml = '<span style="color:var(--fm-text-muted);font-size:12px;">—</span>';
          } else if (isEditOn) {
            finishCellHtml = `<input type="date" value="${batch.actual_final_date || ''}" onchange="window.updateCurriculumBatchField('${batch.id}','actual_final_date',this.value)" style="background:#1e293b;color:#f8fafc;border:1px solid rgba(56,189,248,0.4);border-radius:4px;padding:2px 4px;font-size:12px;width:100%;box-sizing:border-box;" />`;
          } else {
            finishCellHtml = `<span style="color:var(--fm-text-secondary);font-size:12px;">${periodInfo.hasDates && periodInfo.endDateFormatted !== '—' ? escapeHtml(periodInfo.endDateFormatted) : '—'}</span>`;
          }

          // 8. Duration Cell (Zero Truncation SSOT per ui-invariants.md §4.2)
          const durationCellHtml = `<span style="font-size:12px;color:var(--fm-text-secondary);white-space:nowrap;">${periodInfo.durationText || '—'}</span>`;

          // 9. Remaining Cell
          const remainingCellHtml = periodInfo.remainingBadge || '<span style="color:var(--fm-text-muted);font-size:12px;">—</span>';

          // 10. Unified Authoritative Status Cell (SSOT per User Directive: No Redundant ACTIVE or ACTIONS Columns)
          let statusCellHtml = '';
          if (isProgOnly) {
            if (isEditOn) {
              statusCellHtml = `
                <div class="d-flex align-center justify-center gap-1">
                  <select class="table-cell-select" onchange="window.toggleProgramCascade('${prog.id}', this.value === 'true')" style="background:#1e293b;color:${prog.is_active ? 'var(--grade-a)' : 'var(--grade-e)'};border:1px solid rgba(56,189,248,0.4);border-radius:4px;padding:2px 4px;font-size:12px;font-weight:700;width:75px;box-sizing:border-box;">
                    <option value="true" ${prog.is_active ? 'selected' : ''}>Active</option>
                    <option value="false" ${!prog.is_active ? 'selected' : ''}>Inactive</option>
                  </select>
                  <button class="btn btn-danger btn-sm" style="padding:2px 5px;font-size:12px;height:24px;display:inline-flex;align-items:center;justify-content:center;" onclick="window.deleteCurriculumRecord('programs', '${prog.id}', '${escapeHtml(prog.name)}')" title="Delete Program">
                    ${getSvgIcon('trash', 12)}
                  </button>
                </div>
              `;
            } else {
              statusCellHtml = prog.is_active
                ? `<span class="badge-tag badge-tag-ongoing" style="background:rgba(0,192,0,0.1);color:var(--grade-a);border:1px solid rgba(0,192,0,0.25);font-size:12px;font-weight:700;cursor:pointer;" onclick="window.toggleProgramCascade('${prog.id}', false)" title="Active Program · Click to deactivate">● Active</span>`
                : `<span class="badge-tag badge-tag-inactive" style="background:rgba(255,0,0,0.1);color:var(--grade-e);border:1px solid rgba(255,0,0,0.25);font-size:12px;font-weight:700;cursor:pointer;" onclick="window.toggleProgramCascade('${prog.id}', true)" title="Inactive Program · Click to activate">● Inactive</span>`;
            }
          } else {
            const isBatchActive = batch.is_active !== false;
            if (isEditOn) {
              statusCellHtml = `
                <div class="d-flex align-center justify-center gap-1">
                  <select class="table-cell-select" onchange="window.updateCurriculumBatchField('${batch.id}','is_active',this.value === 'true')" style="background:#1e293b;color:${isBatchActive ? 'var(--grade-a)' : 'var(--grade-e)'};border:1px solid rgba(56,189,248,0.4);border-radius:4px;padding:2px 4px;font-size:12px;font-weight:700;width:75px;box-sizing:border-box;">
                    <option value="true" ${isBatchActive ? 'selected' : ''}>Active</option>
                    <option value="false" ${!isBatchActive ? 'selected' : ''}>Inactive</option>
                  </select>
                  <button class="btn btn-danger btn-sm" style="padding:2px 5px;font-size:12px;height:24px;display:inline-flex;align-items:center;justify-content:center;" onclick="window.deleteCurriculumRecord('batches', '${batch.id}', '${escapeHtml(batch.name)}')" title="Delete Batch">
                    ${getSvgIcon('trash', 12)}
                  </button>
                </div>
              `;
            } else {
              if (!isBatchActive) {
                statusCellHtml = `<span class="badge-tag badge-tag-inactive" style="background:rgba(255,0,0,0.1);color:var(--grade-e);border:1px solid rgba(255,0,0,0.25);font-size:12px;font-weight:700;cursor:pointer;" onclick="window.toggleEntityActive('batches', '${batch.id}', true)" title="Inactive Batch · Click to activate">● Inactive</span>`;
              } else {
                statusCellHtml = `<span style="cursor:pointer;" onclick="window.toggleEntityActive('batches', '${batch.id}', false)" title="${periodInfo.statusBadge.includes('Ongoing') ? 'Ongoing' : 'Completed'} Batch · Click to deactivate">${periodInfo.statusBadge}</span>`;
              }
            }
          }

          return `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);transition:background 0.15s ease;${rowStyle}">
              <td class="text-center" style="font-size:12px;color:var(--fm-text-muted);font-variant-numeric:tabular-nums;padding:8px 6px;">${idx + 1}</td>
              <td style="font-size:12px;white-space:nowrap;padding:8px 10px;">${programCellHtml}</td>
              <td style="font-size:12px;white-space:nowrap;padding:8px 10px;">${batchCellHtml}</td>
              <td style="font-size:12px;white-space:nowrap;padding:8px 10px;">${classCellHtml}</td>
              <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 6px;">${levelCellHtml}</td>
              <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 6px;">${studentsCellHtml}</td>
              <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 6px;">${startCellHtml}</td>
              <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 6px;">${finishCellHtml}</td>
              <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 6px;">${durationCellHtml}</td>
              <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 6px;">${remainingCellHtml}</td>
              <td class="text-center" style="font-size:12px;white-space:nowrap;padding:8px 6px;">${statusCellHtml}</td>
            </tr>
          `;
        }).join('');
      }

      // Synchronize Sub Panel (Lower Panel 40px Height per ui-invariants.md §1.3)
      const syncCurriculumBottomInfobar = () => {
        if (typeof window.setBottomInfobar !== 'function') return;
        const currentEditState = (typeof document !== 'undefined' && document.body.classList.contains('global-edit-mode-on')) || Boolean(window._globalEditMode);

        const editBtnStyle = currentEditState
          ? 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:#0284c7;border:1px solid #38bdf8;color:#ffffff;box-shadow:0 0 10px rgba(56,189,248,0.45);transition:all 0.15s ease;'
          : 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:transparent;border:1px solid #38bdf8;color:#38bdf8;transition:all 0.15s ease;';
        const editBtnLabel = currentEditState
          ? `${getSvgIcon('check-circle', 14)} Done Editing`
          : `${getSvgIcon('edit', 14)} Edit Mode`;

        const leftHtml = `
          <div style="display:flex;align-items:center;gap:12px;flex-wrap:nowrap;">
            <div style="position:relative;display:inline-flex;align-items:center;">
              <span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:12px;display:inline-flex;align-items:center;pointer-events:none;">
                ${getSvgIcon('search', 12)}
              </span>
              <input type="text" id="curriculum-search-input" placeholder="Search program, batch, class..." value="${escapeHtml(searchQuery)}" style="padding:0 8px 0 26px;font-size:12px;height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);color:#f8fafc;border-radius:4px;width:220px;outline:none;box-sizing:border-box;" />
            </div>
            <div style="display:inline-flex;align-items:center;gap:10px;font-size:12px;color:#94a3b8;font-weight:600;white-space:nowrap;">
              <span><strong style="color:#f8fafc;">${instBatches.length}</strong> Batches</span>
              <span>·</span>
              <span style="color:var(--grade-a);font-weight:700;"><strong style="color:var(--grade-a);">${activeBatchesCount}</strong> ACTIVE</span>
              <span>·</span>
              <span style="color:var(--grade-e);font-weight:700;"><strong style="color:var(--grade-e);">${inactiveBatchesCount}</strong> INACTIVE</span>
              <span>·</span>
              <span><strong style="color:#f8fafc;">${instPrograms.length}</strong> Programs</span>
              <span>·</span>
              <span><strong style="color:#818cf8;">${totalStudents}</strong> Students</span>
            </div>
          </div>
        `;

        const rightHtml = `
          <div style="display:flex;align-items:center;gap:8px;white-space:nowrap;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-curriculum-edit-inst" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:600;display:inline-flex;align-items:center;gap:5px;border-radius:4px;cursor:pointer;" title="Edit Institution Details">
              ${getSvgIcon('edit', 14)} Edit Details
            </button>
            <button type="button" class="btn btn-sm" id="btn-toggle-curriculum-edit-mode" style="${editBtnStyle}" title="Toggle Inline Edit Mode (Excel Gridlines)">${editBtnLabel}</button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-curriculum-add-batch" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;display:inline-flex;align-items:center;gap:5px;">${getSvgIcon('plus', 14)} Add Batch</button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-curriculum-add-prog" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;display:inline-flex;align-items:center;gap:5px;">${getSvgIcon('plus', 14)} Add Program</button>
          </div>
        `;

        window.setBottomInfobar(leftHtml, rightHtml);

        const searchInp = document.getElementById('curriculum-search-input');
        if (searchInp && !searchInp.dataset.bound) {
          searchInp.dataset.bound = 'true';
          searchInp.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderView();
          });
        }
        const editInstBtn = document.getElementById('btn-curriculum-edit-inst');
        if (editInstBtn) {
          editInstBtn.onclick = () => window.openCurriculumEdit('institutions', activeInst.id);
        }

        const toggleBtn = document.getElementById('btn-toggle-curriculum-edit-mode');
        if (toggleBtn) {
          toggleBtn.onclick = () => {
            if (typeof window.toggleGlobalEditMode === 'function') {
              const newState = window.toggleGlobalEditMode();
              showToast(newState ? 'Master Edit Mode ON (Inline Excel Grid)' : 'Master Edit Mode OFF', newState ? 'info' : 'success');
              renderView();
            }
          };
        }
        const addBatchBtn = document.getElementById('btn-curriculum-add-batch');
        if (addBatchBtn) {
          addBatchBtn.onclick = () => {
            window.openCurriculumAddBatch(instPrograms[0]?.id, activeInst.id);
          };
        }
        const addProgBtn = document.getElementById('btn-curriculum-add-prog');
        if (addProgBtn) {
          addProgBtn.onclick = () => {
            window.openCurriculumAddProgram(activeInst.id);
          };
        }
      };

      // Set HTML into Area
      area.innerHTML = `
        <div class="organization-workspace" style="display:flex;flex-direction:column;flex:1 1 0 !important;min-height:0 !important;height:100% !important;overflow:hidden;gap:10px;">
          <!-- 1. Institution Banner (Compact Profile & Actions) -->
          <div class="curriculum-inst-banner" style="margin-bottom:0;padding:10px 14px;flex-shrink:0;">
            <div class="d-flex align-center gap-3" style="min-width:0;flex:1;">
              ${avatarHtml}
              <div style="min-width:0;">
                <div class="d-flex align-center gap-2 flex-wrap">
                  <h3 style="margin:0;font-size:16px;font-weight:800;color:var(--fm-text-primary);letter-spacing:-0.01em;">
                    ${escapeHtml(activeInst.name)}
                  </h3>
                  ${(activeInst.code && activeInst.code.toUpperCase() !== activeInst.name.toUpperCase()) ? `<span class="badge-tag" style="background:rgba(99,102,241,0.2);color:#818cf8;border:1px solid rgba(99,102,241,0.4);font-weight:700;">${escapeHtml(activeInst.code)}</span>` : ''}
                  <span class="badge-tag ${activeInst.is_active ? 'badge-tag-ongoing' : 'badge-tag-completed'}">
                    ${activeInst.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div class="d-flex align-center gap-3 flex-wrap mt-1 text-xs text-muted">
                  ${activeInst.address ? `<span style="display:inline-flex;align-items:center;gap:4px;">${getSvgIcon('map-pin', 12)} ${escapeHtml(activeInst.address)}</span>` : ''}
                  ${activeInst.phone ? `<span style="display:inline-flex;align-items:center;gap:4px;">${getSvgIcon('phone', 12)} ${escapeHtml(activeInst.phone)}</span>` : ''}
                  ${activeInst.email ? `<span style="display:inline-flex;align-items:center;gap:4px;">${getSvgIcon('mail', 12)} ${escapeHtml(activeInst.email)}</span>` : ''}
                </div>
              </div>
            </div>
          </div>

          <!-- 2. Desktop Workstation Datagrid Table (100vh lock, table-wrap scroll only per ui-invariants.md §1.1) -->
          <div class="table-wrap sticky-first" style="flex:1 1 0 !important;min-height:0 !important;overflow-y:auto;overflow-x:auto !important;background:#0f172a;border:1px solid rgba(255,255,255,0.12) !important;border-radius:8px;margin:0;">
            <table class="datagrid-table" style="width:100%;min-width:1100px;border-collapse:collapse;table-layout:fixed;">
              <colgroup>
                <col style="width:36px;">   <!-- NO -->
                <col style="width:140px;">  <!-- PROGRAM -->
                <col style="width:120px;">  <!-- BATCH NAME -->
                <col style="width:180px;">  <!-- CLASS -->
                <col style="width:80px;">   <!-- LEVEL -->
                <col style="width:75px;">   <!-- STUDENTS -->
                <col style="width:100px;">  <!-- START -->
                <col style="width:100px;">  <!-- FINISH -->
                <col style="width:135px;">  <!-- DURATION -->
                <col style="width:100px;">  <!-- REMAINING -->
                <col style="width:120px;">  <!-- STATUS -->
              </colgroup>
              <thead style="position:sticky;top:0;z-index:10;background:#0f172a;">
                <tr style="height:40px;">
                  <th style="width:36px;text-align:center;">NO</th>
                  <th style="width:140px;text-align:left;cursor:pointer;" onclick="window.sortCurriculum('program')" title="Sort by Program">PROGRAM ${getCurriculumSortIcon('program')}</th>
                  <th style="width:120px;text-align:left;cursor:pointer;" onclick="window.sortCurriculum('name')" title="Sort by Batch Name">BATCH NAME ${getCurriculumSortIcon('name')}</th>
                  <th style="width:180px;text-align:left;cursor:pointer;" onclick="window.sortCurriculum('class')" title="Sort by Class">CLASS ${getCurriculumSortIcon('class')}</th>
                  <th style="width:80px;text-align:center;cursor:pointer;" onclick="window.sortCurriculum('level')" title="Sort by Level">LEVEL ${getCurriculumSortIcon('level')}</th>
                  <th style="width:75px;text-align:center;cursor:pointer;" onclick="window.sortCurriculum('students')" title="Sort by Enrolled Students">STUDENTS ${getCurriculumSortIcon('students')}</th>
                  <th style="width:100px;text-align:center;cursor:pointer;" onclick="window.sortCurriculum('start')" title="Sort by Start Date">START ${getCurriculumSortIcon('start')}</th>
                  <th style="width:100px;text-align:center;cursor:pointer;" onclick="window.sortCurriculum('finish')" title="Sort by Finish Date">FINISH ${getCurriculumSortIcon('finish')}</th>
                  <th style="width:135px;text-align:center;cursor:pointer;" onclick="window.sortCurriculum('duration')" title="Sort by Duration">DURATION ${getCurriculumSortIcon('duration')}</th>
                  <th style="width:100px;text-align:center;">REMAINING</th>
                  <th style="width:120px;text-align:center;cursor:pointer;" onclick="window.sortCurriculum('status')" title="Sort by Status (Ongoing/Completed/Inactive)">STATUS ${getCurriculumSortIcon('status')}</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Synchronize bottom infobar
      syncCurriculumBottomInfobar();

      // Live search input handler
      const searchInp = document.getElementById('curriculum-search-input');
      if (searchInp && !searchInp.dataset.bound) {
        searchInp.dataset.bound = 'true';
        searchInp.addEventListener('input', (e) => {
          searchQuery = e.target.value.toLowerCase().trim();
          renderView();
          const updatedInp = document.getElementById('curriculum-search-input');
          if (updatedInp) {
            updatedInp.focus();
            updatedInp.selectionStart = updatedInp.selectionEnd = updatedInp.value.length;
          }
        });
      }
    };

    // Bind Edit Mode Listener for auto sync on external toggle or Escape key
    if (!window._curriculumEditModeListenerBound) {
      window._curriculumEditModeListenerBound = true;
      window.addEventListener('admin-edit-mode-changed', () => {
        if (window._currentSection === 'organization' || window.location.hash.includes('organization')) {
          renderView();
        }
      });
    }

    renderView();

  } catch (error) {
    console.error('[CurriculumHub] Load error:', error);
    area.innerHTML = `<div class="empty-state"><p style="color:red;">Error loading Curriculum Data: ${error.message}</p></div>`;
  }
}
