import { adminFetchAll, adminUpdate, adminInsert, adminSoftDelete } from '../api.js?v=5.3.2';
import { openCrudModal } from './crud-modals.js?v=5.3.2';
import { showToast, escapeHtml, escHtml } from '../app.js?v=5.3.2';

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
      durationText: '',
      statusBadge: `<span class="badge-tag badge-tag-completed" style="width: 100%; justify-content: center;">⚪ Unscheduled</span>`
    };
  }

  const startFormatted = formatDate(startDateStr);
  const endFormatted = endDateStr ? formatDate(endDateStr) : '—';
  const dateRange = `📅 ${startFormatted} – ${endFormatted}`;

  let durationText = '';
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
      statusBadge = `<span class="badge-tag badge-tag-upcoming" style="width: 100%; justify-content: center;">🟡 Upcoming (${daysUntil}d)</span>`;
      remainingText = `Starts in ${daysUntil}d`;
      remainingBadge = `<span class="badge-tag" style="background:rgba(251,191,36,0.12);color:#fbbf24;border:1px solid rgba(251,191,36,0.3);width:100%;justify-content:center;font-size:0.72rem;">📅 ${daysUntil}d to start</span>`;
    } else if (now > end) {
      statusBadge = `<span class="badge-tag badge-tag-completed" style="width: 100%; justify-content: center;">⚪ Completed</span>`;
      remainingText = 'Done';
      remainingBadge = `<span class="badge-tag" style="background:rgba(156,163,175,0.1);color:#9ca3af;border:1px solid rgba(156,163,175,0.2);width:100%;justify-content:center;font-size:0.72rem;">✓ Completed</span>`;
    } else {
      const daysLeft = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
      const weeksLeft = Math.floor(daysLeft / 7);
      remainingText = weeksLeft >= 1 ? `${weeksLeft}w ${daysLeft % 7}d left` : `${daysLeft}d left`;
      const urgentColor = daysLeft <= 14 ? '#f87171' : daysLeft <= 30 ? '#fb923c' : '#34d399';
      remainingBadge = `<span class="badge-tag" style="background:rgba(${daysLeft <= 14 ? '248,113,113' : daysLeft <= 30 ? '251,146,60' : '52,211,153'},0.12);color:${urgentColor};border:1px solid rgba(${daysLeft <= 14 ? '248,113,113' : daysLeft <= 30 ? '251,146,60' : '52,211,153'},0.3);width:100%;justify-content:center;font-size:0.72rem;">⏳ ${remainingText}</span>`;
      statusBadge = `<span class="badge-tag badge-tag-ongoing" style="width: 100%; justify-content: center;">🟢 Ongoing</span>`;
    }
  } else {
    if (now < start) {
      statusBadge = `<span class="badge-tag badge-tag-upcoming" style="width: 100%; justify-content: center;">🟡 Upcoming</span>`;
    } else {
      statusBadge = `<span class="badge-tag badge-tag-ongoing" style="width: 100%; justify-content: center;">🟢 Ongoing</span>`;
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
  area.innerHTML = '<div class="empty-state"><div class="spinner"></div><p>Loading Curriculum Hub...</p></div>';

  try {
    const [institutions, programs, classes, batches, levels, students] = await Promise.all([
      adminFetchAll('institutions', 'id, name, code, logo_url, address, phone, email, is_active, deleted_at'),
      adminFetchAll('programs', 'id, name, code, description, institution_id, is_active, deleted_at'),
      adminFetchAll('classes', 'id, name, code, is_active, program_id, level_id, deleted_at'),
      adminFetchAll('batches', 'id, name, is_active, program_id, current_level_id, enrollment_date, actual_final_date, deleted_at'),
      adminFetchAll('levels', 'id, name, level_number'),
      adminFetchAll('students', 'id, name, batch_id, is_active, deleted_at').catch(() => [])
    ]);

    // Active records (soft-delete filtered) — sorted A→Z
    const activeInsts   = (institutions || []).filter(i => !i.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const activeProgs   = (programs    || []).filter(p => !p.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const activeClasses = (classes     || []).filter(c => !c.deleted_at); // kept for cascade deactivation only
    const activeBatches = (batches     || []).filter(b => !b.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    const activeLevels  = (levels      || []).filter(l => !l.deleted_at).sort((a, b) => (a.level_number || 0) - (b.level_number || 0));
    const activeStudents = (students   || []).filter(s => !s.deleted_at && s.is_active !== false);

    // Build lookup maps
    const lvlMap = new Map(activeLevels.map(l => [l.id, l.name || `Level ${l.level_number}`]));
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

    // State: Active institution tab
    if (!window._curriculumActiveInstId || !activeInsts.some(i => i.id === window._curriculumActiveInstId)) {
      window._curriculumActiveInstId = activeInsts[0]?.id || null;
    }

    // State: Expanded program nodes (defaults to all expanded)
    if (!window._curriculumExpandedNodes) {
      window._curriculumExpandedNodes = new Set(activeProgs.map(p => p.id));
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
        window.openCrudModal('batches', { program_id: progId, institution_id: instId, is_active: true });
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
        } else if (table === 'programs') {
          const p = activeProgs.find(x => x.id === id);
          if (p) p.is_active = isActive;
        } else if (table === 'institutions') {
          const inst = activeInsts.find(x => x.id === id);
          if (inst) inst.is_active = isActive;
        }
        if (table === 'classes' && window.loadSidebarClasses) {
          window.loadSidebarClasses();
        }
        renderView();
      } catch (err) {
        console.error('[CurriculumHub] toggleEntityActive failed:', table, id, err);
        showToast(`Failed to update status: ${err?.message || err}`, 'error');
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
          // 1. Deactivate institution
          await adminUpdate('institutions', instId, { is_active: false });

          // 2. Cascade to programs
          const childProgs = activeProgs.filter(p => p.institution_id === instId);
          for (const p of childProgs) {
            await adminUpdate('programs', p.id, { is_active: false });
            // 3. Cascade to classes & batches
            const childCls = activeClasses.filter(c => c.program_id === p.id);
            for (const c of childCls) await adminUpdate('classes', c.id, { is_active: false });
            const childBtc = activeBatches.filter(b => b.program_id === p.id);
            for (const b of childBtc) await adminUpdate('batches', b.id, { is_active: false });
          }

          showToast('Institution and all descendant Programs, Classes, and Batches were deactivated.', 'success');
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
          renderCurriculum(area);
        } catch (err) {
          console.error('[CurriculumHub] Activate program failed:', err);
          showToast(`Failed to activate program: ${err.message || err}`, 'error');
          renderView();
        }
      }
    };

    window.toggleProgramNode = (progId) => {
      if (window._curriculumExpandedNodes.has(progId)) {
        window._curriculumExpandedNodes.delete(progId);
      } else {
        window._curriculumExpandedNodes.add(progId);
      }
      renderView();
    };

    window.expandAllCurriculum = () => {
      window._curriculumExpandedNodes = new Set(activeProgs.map(p => p.id));
      renderView();
    };

    window.collapseAllCurriculum = () => {
      window._curriculumExpandedNodes = new Set();
      renderView();
    };

    window.switchInstitutionTab = (instId) => {
      window._curriculumActiveInstId = instId;
      renderView();
    };

    window._curriculumBatchSort = window._curriculumBatchSort || { key: 'finish', asc: false };
    window.sortCurriculumBatches = (key) => {
      if (window._curriculumBatchSort.key === key) {
        window._curriculumBatchSort.asc = !window._curriculumBatchSort.asc;
      } else {
        window._curriculumBatchSort.key = key;
        window._curriculumBatchSort.asc = (key === 'name' || key === 'level');
      }
      renderView();
    };

    // Main render function
    const renderView = () => {
      const activeInst = activeInsts.find(i => i.id === window._curriculumActiveInstId) || activeInsts[0];
      if (!activeInst) {
        area.innerHTML = `
          <div class="empty-state">
            <p>No registered institutions found.</p>
            <button class="btn btn-primary mt-2" onclick="window.openCrudModal('institutions', null)">+ Add First Institution</button>
          </div>
        `;
        return;
      }

      // Build Top Tabs for Institutions
      const institutionTabs = activeInsts.map(inst => {
        const count = activeProgs.filter(p => p.institution_id === inst.id).length;
        return {
          id: inst.id,
          icon: '🏢',
          title: inst.name,
          val: count,
          label: count === 1 ? 'Program' : 'Programs'
        };
      });

      // Migrate institution tabs to topbar (same pattern as Test, Class Hub)
      if (window.setTopbarTabs) {
        window.setTopbarTabs(institutionTabs, activeInst.id, 'window.switchInstitutionTab');
      }

      // Programs under current institution (already sorted A→Z)
      const instPrograms = activeProgs.filter(p => p.institution_id === activeInst.id);
      const totalBatches = instPrograms.reduce((acc, p) => acc + activeBatches.filter(b => b.program_id === p.id).length, 0);

      // Search query filter
      const searchQuery = (document.getElementById('curriculum-search-input')?.value || '').toLowerCase().trim();

      // Filtered programs
      const displayedPrograms = instPrograms.filter(prog => {
        if (!searchQuery) return true;
        const progMatch = (prog.name || '').toLowerCase().includes(searchQuery) || (prog.code || '').toLowerCase().includes(searchQuery);
        const hasMatchingBatch = activeBatches.some(b => b.program_id === prog.id && (b.name || '').toLowerCase().includes(searchQuery));
        return progMatch || hasMatchingBatch;
      });

      // Institution Logo or Avatar
      const instInitials = (activeInst.code || activeInst.name || 'INS').substring(0, 3).toUpperCase();
      const avatarHtml = activeInst.logo_url
        ? `<div class="curriculum-inst-avatar"><img src="${escapeHtml(activeInst.logo_url)}" alt="${escapeHtml(activeInst.name)}" /></div>`
        : `<div class="curriculum-inst-avatar">${instInitials}</div>`;

      const getBatchStartTime = (b) => {
        if (b.enrollment_date) {
          const t = new Date(b.enrollment_date).getTime();
          if (!isNaN(t)) return t;
        }
        return 0;
      };

      const getBatchEndTime = (b) => {
        if (b.actual_final_date) {
          const t = new Date(b.actual_final_date).getTime();
          if (!isNaN(t)) return t;
        }
        if (b.enrollment_date) {
          const t = new Date(b.enrollment_date).getTime();
          if (!isNaN(t)) return t;
        }
        return 0;
      };

      const getBatchDurationDays = (b) => {
        if (b.enrollment_date && b.actual_final_date) {
          const start = new Date(b.enrollment_date).getTime();
          const end = new Date(b.actual_final_date).getTime();
          if (!isNaN(start) && !isNaN(end)) return Math.max(0, Math.round((end - start) / 86400000));
        }
        return 0;
      };

      const sortBatchList = (list) => {
        const { key, asc } = window._curriculumBatchSort || { key: 'finish', asc: false };
        return [...list].sort((a, b) => {
          let res = 0;
          if (key === 'finish' || key === 'timeline') {
            res = getBatchEndTime(a) - getBatchEndTime(b);
          } else if (key === 'start') {
            res = getBatchStartTime(a) - getBatchStartTime(b);
          } else if (key === 'students') {
            res = (batchStudentCountMap.get(a.id) || 0) - (batchStudentCountMap.get(b.id) || 0);
          } else if (key === 'name') {
            res = (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' });
          } else if (key === 'level') {
            const lA = (a.current_level_id && lvlMap.get(a.current_level_id)) ? lvlMap.get(a.current_level_id) : '';
            const lB = (b.current_level_id && lvlMap.get(b.current_level_id)) ? lvlMap.get(b.current_level_id) : '';
            res = lA.localeCompare(lB);
          } else if (key === 'duration') {
            res = getBatchDurationDays(a) - getBatchDurationDays(b);
          } else if (key === 'status') {
            const getStatusRank = (b) => {
              const p = getBatchPeriodInfo(b.enrollment_date, b.actual_final_date);
              if (!p.hasDates) return 0;
              if (p.statusBadge.includes('Ongoing')) return 3;
              if (p.statusBadge.includes('Upcoming')) return 2;
              return 1;
            };
            res = getStatusRank(a) - getStatusRank(b);
          }
          return asc ? res : -res;
        });
      };

      const getBatchSortIcon = (key) => {
        const cur = window._curriculumBatchSort || { key: 'finish', asc: false };
        if (cur.key !== key) return '<span style="opacity:0.35;margin-left:4px;font-size:0.75rem;">↕</span>';
        return cur.asc ? '<span style="color:var(--clr-primary,#6366f1);margin-left:4px;font-size:0.75rem;">▲</span>' : '<span style="color:var(--clr-primary,#6366f1);margin-left:4px;font-size:0.75rem;">▼</span>';
      };

      // Render Program Tree Nodes
      let treeNodesHtml = '';
      if (displayedPrograms.length === 0) {
        treeNodesHtml = `
          <div class="card" style="padding: 2.5rem; text-align: center; background: var(--fm-bg-panel); border: 1px solid var(--fm-border-subtle); border-radius: var(--fm-radius-md);">
            <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">🎓</div>
            <h4 style="margin: 0 0 0.5rem 0; font-size: 1.1rem; color: var(--fm-text-primary);">
              ${searchQuery ? 'No matching records found.' : `No Programs yet for ${escapeHtml(activeInst.name)}.`}
            </h4>
            <p style="margin: 0 0 1.25rem 0; font-size: 0.85rem; color: var(--fm-text-muted);">
              ${searchQuery ? 'Try using a different search keyword.' : 'Create a new program to start organizing classes and batches.'}
            </p>
            ${!searchQuery ? `<button class="btn btn-primary" onclick="window.openCurriculumAddProgram('${activeInst.id}')">+ Create New Program</button>` : ''}
          </div>
        `;
      } else {
        treeNodesHtml = displayedPrograms.map(prog => {
          const isExpanded = window._curriculumExpandedNodes.has(prog.id) || Boolean(searchQuery);
          // Batches sorted according to active curriculum batch sort setting
          const rawProgBatches = activeBatches.filter(b => b.program_id === prog.id);
          const progBatches = sortBatchList(rawProgBatches);

          const progDimmed = !prog.is_active || !activeInst.is_active ? 'tree-item-dimmed' : '';

          // Batches list
          let batchesListHtml = '';
          if (progBatches.length === 0) {
            batchesListHtml = `<div class="text-xs text-muted" style="padding: 12px 14px; font-style: italic; background: rgba(255,255,255,0.01); border-radius: 6px;">No batches scheduled yet. Click "+ Add Batch" to create one.</div>`;
          } else {
            const headerHtml = `
              <div class="tree-grid-header-batches" style="user-select:none;">
                <div style="cursor:pointer;" onclick="window.sortCurriculumBatches('name')" title="Sort by Batch Name">Batch Name ${getBatchSortIcon('name')}</div>
                <div style="text-align: center; cursor:pointer;" onclick="window.sortCurriculumBatches('level')" title="Sort by Level">Level ${getBatchSortIcon('level')}</div>
                <div style="text-align: center; cursor:pointer;" onclick="window.sortCurriculumBatches('students')" title="Sort by Number of Students">Students ${getBatchSortIcon('students')}</div>
                <div style="text-align: center; cursor:pointer;" onclick="window.sortCurriculumBatches('start')" title="Sort by Start Date">Start ${getBatchSortIcon('start')}</div>
                <div style="text-align: center; cursor:pointer;" onclick="window.sortCurriculumBatches('finish')" title="Sort by Finish Date">Finish ${getBatchSortIcon('finish')}</div>
                <div style="text-align: center; cursor:pointer;" onclick="window.sortCurriculumBatches('duration')" title="Sort by Duration">Duration ${getBatchSortIcon('duration')}</div>
                <div style="text-align: center;">Remaining</div>
                <div style="text-align: center; cursor:pointer;" onclick="window.sortCurriculumBatches('status')" title="Sort by Status">Status ${getBatchSortIcon('status')}</div>
                <div style="text-align: right;">Actions</div>
              </div>
            `;
            const rowsHtml = progBatches.map(batch => {
              const btcDimmed = !batch.is_active || !prog.is_active || !activeInst.is_active ? 'tree-item-dimmed' : '';
              const lvlName = (batch.current_level_id && lvlMap.get(batch.current_level_id)) ? lvlMap.get(batch.current_level_id) : '— No Level —';
              const periodInfo = getBatchPeriodInfo(batch.enrollment_date, batch.actual_final_date);
              const studentCount = batchStudentCountMap.get(batch.id) || 0;

              return `
                <div class="tree-grid-row-batches ${btcDimmed}">
                  <div class="d-flex align-center gap-2" style="min-width: 0;">
                    <span style="font-size: 0.95rem;">🏷️</span>
                    <span style="font-weight: 600; font-size: 0.88rem; color: var(--fm-text-primary);" class="text-truncate" title="${escapeHtml(batch.name)}">${escapeHtml(batch.name)}</span>
                  </div>
                  <div style="text-align: center;">
                    <span class="badge-tag badge-tag-level" style="width: 100%; justify-content: center; ${!batch.current_level_id ? 'opacity: 0.7; font-style: italic;' : ''}">${escapeHtml(lvlName)}</span>
                  </div>
                  <div style="text-align: center;">
                    <span class="badge-tag" style="background: rgba(99, 102, 241, 0.12); color: #818cf8; border: 1px solid rgba(99, 102, 241, 0.25); width: 100%; justify-content: center; cursor: pointer;" title="View ${studentCount} enrolled students in this batch" onclick="window._filterBatchId='${batch.id}'; window._filterBatchName='${escapeHtml(batch.name)}'; if(window.loadSection) window.loadSection('students');">
                      👥 ${studentCount}
                    </span>
                  </div>
                  <div style="text-align: center;">
                    <span class="badge-tag" style="background: rgba(255,255,255,0.06); color: var(--fm-text-secondary); border: 1px solid rgba(255,255,255,0.1); width: 100%; justify-content: center; text-align: center;" title="Batch Start: ${escapeHtml(periodInfo.startDateFormatted)}">
                      ${periodInfo.hasDates ? '📅 ' + escapeHtml(periodInfo.startDateFormatted) : '—'}
                    </span>
                  </div>
                  <div style="text-align: center;">
                    <span class="badge-tag" style="background: rgba(255,255,255,0.06); color: var(--fm-text-secondary); border: 1px solid rgba(255,255,255,0.1); width: 100%; justify-content: center; text-align: center;" title="Batch Finish: ${escapeHtml(periodInfo.endDateFormatted)}">
                      ${periodInfo.hasDates && periodInfo.endDateFormatted !== '—' ? '🏁 ' + escapeHtml(periodInfo.endDateFormatted) : '—'}
                    </span>
                  </div>
                  <div style="text-align: center;">
                    ${periodInfo.durationText ? `<span class="badge-tag badge-tag-duration" style="width: 100%; justify-content: center;">${escapeHtml(periodInfo.durationText)}</span>` : '<span class="text-xs text-muted" style="display: inline-block; width: 100%; text-align: center;">—</span>'}
                  </div>
                  <div style="text-align: center;">
                    ${periodInfo.remainingBadge || '<span class="text-xs text-muted" style="display:inline-block;width:100%;text-align:center;">—</span>'}
                  </div>
                  <div style="text-align: center;">
                    ${periodInfo.statusBadge}
                  </div>
                  <div class="tree-actions-right" style="justify-content: flex-end;">
                    <label class="toggle-switch" title="Active Toggle">
                      <input type="checkbox" onchange="window.toggleEntityActive('batches', '${batch.id}', this.checked)" ${batch.is_active ? 'checked' : ''}>
                      <span class="toggle-slider"></span>
                    </label>
                    <button class="btn btn-secondary btn-sm" style="padding: 3px 8px; font-size: 0.75rem;" onclick="window.openCurriculumEdit('batches', '${batch.id}')" title="Edit Batch">
                      ✏️ Edit
                    </button>
                    <button class="btn btn-danger btn-sm" style="padding: 3px 7px; font-size: 0.75rem;" onclick="window.deleteCurriculumRecord('batches', '${batch.id}', '${escapeHtml(batch.name)}')" title="Delete Batch">
                      🗑️
                    </button>
                  </div>
                </div>
              `;
            }).join('');
            batchesListHtml = headerHtml + rowsHtml;
          }

          return `
            <div class="curriculum-tree-node ${isExpanded ? 'expanded' : ''} ${progDimmed}">
              <div class="curriculum-tree-header" onclick="window.toggleProgramNode('${prog.id}')">
                <span style="font-size: 0.8rem; color: var(--fm-text-muted); width: 14px; text-align: center;">
                  ${isExpanded ? '▼' : '▶'}
                </span>
                <span style="font-size: 1.2rem;">🎓</span>
                <div style="min-width: 0; flex: 1;">
                  <div class="d-flex align-center gap-2 flex-wrap">
                    <span style="font-weight: 700; font-size: 1rem; color: var(--fm-text-primary);">${escapeHtml(prog.name)}</span>
                    ${prog.code ? `<span class="badge-tag" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: var(--fm-text-muted);">${escapeHtml(prog.code)}</span>` : ''}
                    <span class="badge-tag" style="background: rgba(var(--grade-star-rgb, 0, 192, 0), 0.12); color: var(--clr-success); border: 1px solid rgba(var(--grade-star-rgb, 0, 192, 0), 0.25);">${progBatches.length} Batches</span>
                  </div>
                  ${prog.description ? `<div class="text-xs text-muted mt-1 text-truncate" style="max-width: 600px;">${escapeHtml(prog.description)}</div>` : ''}
                </div>
                <div class="tree-actions-right" onclick="event.stopPropagation()">
                  <label class="toggle-switch" title="Toggle Program Active (Cascade)">
                    <input type="checkbox" onchange="window.toggleProgramCascade('${prog.id}', this.checked)" ${prog.is_active ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                  </label>
                  <button class="btn btn-primary btn-sm" style="font-size: 0.75rem; padding: 4px 9px; background: var(--clr-success); border-color: var(--clr-success); color: #0F172A; font-weight: 700;" onclick="window.openCurriculumAddBatch('${prog.id}', '${activeInst.id}')" title="Add Batch to Program">+ Add Batch</button>
                  <button class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 4px 8px;" onclick="window.openCurriculumEdit('programs', '${prog.id}')" title="Edit Program">
                    ✏️ Edit
                  </button>
                  <button class="btn btn-danger btn-sm" style="font-size: 0.75rem; padding: 4px 7px;" onclick="window.deleteCurriculumRecord('programs', '${prog.id}', '${escapeHtml(prog.name)}')" title="Delete Program">
                    🗑️
                  </button>
                </div>
              </div>

              ${isExpanded ? `
                <div class="curriculum-tree-body">
                  <div>
                    <div class="d-flex justify-between align-center mb-2">
                      <div class="curriculum-tree-group-title">
                        <span>👥 Batches</span>
                        <span class="badge-tag" style="font-size: 0.68rem; background: rgba(var(--grade-star-rgb, 0, 192, 0), 0.15); color: var(--clr-success); border: 1px solid rgba(var(--grade-star-rgb, 0, 192, 0), 0.25);">${progBatches.length}</span>
                      </div>
                      <button class="btn btn-ghost btn-sm" style="font-size: 0.72rem; padding: 2px 6px; color: var(--clr-success);" onclick="window.openCurriculumAddBatch('${prog.id}', '${activeInst.id}')">
                        + Add Batch
                      </button>
                    </div>
                    <div>${batchesListHtml}</div>
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');
      }

      area.innerHTML = `
        <div>
          <!-- Institution Profile Banner -->
          <div class="curriculum-inst-banner">
            <div class="d-flex align-center gap-3" style="min-width: 0; flex: 1;">
              ${avatarHtml}
              <div style="min-width: 0;">
                <div class="d-flex align-center gap-2 flex-wrap">
                  <h3 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: var(--fm-text-primary); letter-spacing: -0.01em;">
                    ${escapeHtml(activeInst.name)}
                  </h3>
                  ${activeInst.code ? `<span class="badge-tag" style="background: rgba(99,102,241,0.2); color: #818cf8; border: 1px solid rgba(99,102,241,0.4); font-weight: 700;">${escapeHtml(activeInst.code)}</span>` : ''}
                  <span class="badge-tag ${activeInst.is_active ? 'badge-tag-ongoing' : 'badge-tag-completed'}">
                    ${activeInst.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div class="d-flex align-center gap-3 flex-wrap mt-1 text-xs text-muted">
                  ${activeInst.address ? `<span>📍 ${escapeHtml(activeInst.address)}</span>` : ''}
                  ${activeInst.phone ? `<span>📞 ${escapeHtml(activeInst.phone)}</span>` : ''}
                  ${activeInst.email ? `<span>✉️ ${escapeHtml(activeInst.email)}</span>` : ''}
                </div>
              </div>
            </div>

            <!-- Right-aligned Institution Action Controls -->
            <div class="tree-actions-right">
              <label class="toggle-switch" title="Toggle Institution Active (Cascade to all programs, classes, batches)">
                <input type="checkbox" onchange="window.toggleInstitutionCascade('${activeInst.id}', this.checked)" ${activeInst.is_active ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </label>
              <button class="btn btn-secondary btn-sm" onclick="window.openCurriculumEdit('institutions', '${activeInst.id}')" title="Edit Institution Details (Logo, Address, Contact)">
                ✏️ Edit Details
              </button>
              <button class="btn btn-primary btn-sm" onclick="window.openCurriculumAddProgram('${activeInst.id}')" title="Add New Program to this Institution">
                + Add Program
              </button>
              <button class="btn btn-danger btn-sm" onclick="window.deleteCurriculumRecord('institutions', '${activeInst.id}', '${escapeHtml(activeInst.name)}')" title="Delete Institution">
                🗑️
              </button>
            </div>
          </div>

          <!-- Controls & Search Toolbar -->
          <div class="hub-toolbar mb-3">
            <div class="hub-toolbar-search">
              <span style="color: var(--fm-text-muted); font-size: 0.9rem;">🔍</span>
              <input type="text" id="curriculum-search-input" class="form-control" placeholder="Search Program or Batch..." value="${escapeHtml(searchQuery)}" style="padding: 5px 10px; font-size: 0.85rem; height: 32px; background: rgba(0,0,0,0.2);" />
            </div>
            <div class="d-flex align-center gap-2">
              <span class="text-xs text-muted">${instPrograms.length} Programs · ${totalBatches} Batches</span>
              <button class="btn btn-secondary btn-sm" onclick="window.expandAllCurriculum()" style="font-size: 0.75rem; padding: 4px 8px;">Expand All</button>
              <button class="btn btn-secondary btn-sm" onclick="window.collapseAllCurriculum()" style="font-size: 0.75rem; padding: 4px 8px;">Collapse All</button>
              <button class="btn btn-ghost btn-sm" onclick="window.openCrudModal('institutions', null)" style="font-size: 0.75rem; padding: 4px 8px; color: var(--clr-primary, #6366f1);">+ New Institution</button>
            </div>
          </div>

          <!-- The Tree Nodes -->
          <div id="curriculum-tree-container">
            ${treeNodesHtml}
          </div>
        </div>
      `;

      // Live search input handler
      const searchInp = document.getElementById('curriculum-search-input');
      if (searchInp) {
        searchInp.addEventListener('input', () => {
          renderView();
          // Keep focus on search input after re-render
          const updatedInp = document.getElementById('curriculum-search-input');
          if (updatedInp) {
            updatedInp.focus();
            updatedInp.selectionStart = updatedInp.selectionEnd = updatedInp.value.length;
          }
        });
      }
    };

    renderView();

  } catch (error) {
    console.error('[CurriculumHub] Load error:', error);
    area.innerHTML = `<div class="empty-state"><p style="color:red;">Error loading Curriculum Data: ${error.message}</p></div>`;
  }
}
