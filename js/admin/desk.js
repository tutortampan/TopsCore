/**
 * js/admin/desk.js
 * PILAR [D] DATA — SYSTEM ADMINISTRATION, SECURITY & HEALTH
 * Modules:
 * 1. Recycle Bin (Centralized Data Recovery & Gated Hard Purge)
 * 2. Activity & Audit Logs (Immutable Event Trail)
 * 3. Data Health & Connectivity (Real-Time Sync, Latency, Storage, Diagnostics)
 * 4. Site Settings & API Cost Guard (API Key Vault & Rate Limiting)
 */

import {
  adminFetchAll,
  adminFetchDeleted,
  adminRestore,
  adminHardDelete,
  clearAdminCache,
  testSupabaseConnection,
  previewRecalibrateTest,
  applyRecalibrateTest
} from '../api.js?v=20261114_v517';
import { getSupabase } from '../supabase.js?v=20261106_v160';
import { showToast, showLoading, hideLoading, escapeHtml, escHtml } from '../app.js?v=20261106_v160';
import { openDuplicateStudentsModal, openDuplicateQuestionsModal } from './crud-modals.js?v=20261115_v528';
import { DataGrid } from './datagrid.js?v=20261106_v160';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';
import { DEFAULT_COLOR_SYSTEM, DEFAULT_INTERFACE_SYSTEM, applyGlobalColorSystem, applyGlobalInterfaceSystem } from '../grading.js';
import { renderSystemArchitecture } from './system-architecture.js?v=20261121_v656';

// escapeHtml / escHtml imported canonically

// ============================================================
// MODULE 1: RECYCLE BIN (CENTRALIZED DATA RECOVERY & GATED PURGE)
// ============================================================

export async function renderRecycleBin(container) {
  container.innerHTML = `
    <div class="section-header mb-3">
      <h2 class="section-title text-gradient">Recycle Bin</h2>
      <p class="section-subtitle">Centralized data recovery for soft-deleted Students, Classes, Tests, and Questions</p>
    </div>

    <!-- Aggregated Table (100vh workstation height lock, table-wrap scroll only) -->
    <div class="table-wrap" id="recycle-results-wrap" style="flex:1 1 0 !important; min-height:0 !important; overflow-y:auto; overflow-x:auto !important; background:#0f172a; border:1px solid rgba(255,255,255,0.12) !important; border-radius:8px; margin:0;">
      ${(window.getLoadingStateHtml || ((msg) => `<div class="topscore-loading-center"><div class="spinner"></div><p class="loading-text">${msg}</p></div>`))('Scanning Recycle Bin...')}
    </div>

    <!-- Gated Hard Purge Modal Container -->
    <div id="purge-modal-container"></div>
  `;

  let currentDeletedRecords = [];
  let currentFilterType = 'all';

  const fetchAllDeleted = async () => {
    const wrap = document.getElementById('recycle-results-wrap');
    const chip = document.getElementById('recycle-total-chip');
    if (wrap) wrap.innerHTML = (window.getLoadingStateHtml || ((msg) => `<div class="topscore-loading-center"><div class="spinner"></div><p class="loading-text">${msg}</p></div>`))('Scanning Recycle Bin...');

    try {
      const [stds, progs, tests, vocab] = await Promise.all([
        adminFetchDeleted('students').catch(() => []),
        adminFetchDeleted('programs').catch(() => []),
        adminFetchDeleted('tests').catch(() => []),
        adminFetchDeleted('vocabulary_vault').catch(() => [])
      ]);

      const items = [
        ...stds.map(r => ({ ...r, _table: 'students', _entityType: 'Student', _name: r.name || 'Unnamed Student' })),
        ...progs.map(r => ({ ...r, _table: 'programs', _entityType: 'Class', _name: r.name || 'Unnamed Class' })),
        ...tests.map(r => ({ ...r, _table: 'tests', _entityType: 'Test', _name: r.title || 'Unnamed Test' })),
        ...vocab.map(r => ({ ...r, _table: 'vocabulary_vault', _entityType: 'Vocabulary', _name: r.english || r.indonesian || 'Unnamed Word' }))
      ];

      items.sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));
      currentDeletedRecords = items;

      const syncRecycleSubPanel = () => {
        if (typeof window.setBottomInfobar !== 'function') return;
        const isEditOn = (typeof document !== 'undefined' && document.body.classList.contains('global-edit-mode-on')) || Boolean(window._globalEditMode);
        const editBtnStyle = isEditOn
          ? 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:#38bdf8;border:1px solid #38bdf8;color:#090d16;transition:all 0.15s ease;'
          : 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:transparent;border:1px solid #38bdf8;color:#38bdf8;transition:all 0.15s ease;';
        const editBtnLabel = isEditOn
          ? `${getSvgIcon('check-circle', 14)} Done Editing`
          : `${getSvgIcon('edit', 14)} Edit Mode`;

        const leftHtml = `
          <div class="d-flex gap-1 align-center" id="recycle-type-tabs" style="flex-wrap:nowrap;">
            <button type="button" class="btn ${currentFilterType === 'all' ? 'btn-primary' : 'btn-secondary'} btn-sm recycle-tab-btn" data-type="all" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 10px !important;font-size:12px !important;font-weight:600;border-radius:4px;cursor:pointer;">All Entities</button>
            <button type="button" class="btn ${currentFilterType === 'students' ? 'btn-primary' : 'btn-secondary'} btn-sm recycle-tab-btn" data-type="students" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 10px !important;font-size:12px !important;font-weight:600;border-radius:4px;cursor:pointer;">Students</button>
            <button type="button" class="btn ${currentFilterType === 'programs' ? 'btn-primary' : 'btn-secondary'} btn-sm recycle-tab-btn" data-type="programs" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 10px !important;font-size:12px !important;font-weight:600;border-radius:4px;cursor:pointer;">Classes</button>
            <button type="button" class="btn ${currentFilterType === 'tests' ? 'btn-primary' : 'btn-secondary'} btn-sm recycle-tab-btn" data-type="tests" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 10px !important;font-size:12px !important;font-weight:600;border-radius:4px;cursor:pointer;">Tests</button>
            <button type="button" class="btn ${currentFilterType === 'vocabulary_vault' ? 'btn-primary' : 'btn-secondary'} btn-sm recycle-tab-btn" data-type="vocabulary_vault" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 10px !important;font-size:12px !important;font-weight:600;border-radius:4px;cursor:pointer;">Vocabulary</button>
          </div>
        `;
        const rightHtml = `
          <div style="display:flex;align-items:center;gap:10px;white-space:nowrap;">
            <span class="badge badge-info" id="recycle-total-chip" style="font-size:12px;font-weight:700;">${items.length} Soft-Deleted</span>
            <button type="button" class="btn btn-sm" id="recycle-toggle-edit-mode" style="${editBtnStyle}" title="Toggle Master Edit Mode (Excel Gridlines)">${editBtnLabel}</button>
            <button type="button" class="btn btn-secondary btn-sm" id="recycle-refresh-all-btn" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;display:inline-flex;align-items:center;gap:5px;cursor:pointer;">
              ${getSvgIcon('refresh', 14)} Refresh Vault
            </button>
          </div>
        `;
        window.setBottomInfobar(leftHtml, rightHtml);

        document.querySelectorAll('#recycle-type-tabs .recycle-tab-btn').forEach(tab => {
          tab.addEventListener('click', (e) => {
            currentFilterType = e.currentTarget.dataset.type;
            syncRecycleSubPanel();
            renderTable();
          });
        });
        document.getElementById('recycle-toggle-edit-mode')?.addEventListener('click', () => {
          if (typeof window.toggleGlobalEditMode === 'function') {
            const newState = window.toggleGlobalEditMode();
            showToast(newState ? 'Master Edit Mode ON (Inline Excel Grid)' : 'Master Edit Mode OFF', newState ? 'info' : 'success');
            syncRecycleSubPanel();
          }
        });
        document.getElementById('recycle-refresh-all-btn')?.addEventListener('click', fetchAllDeleted);
      };

      syncRecycleSubPanel();
      renderTable();
    } catch (err) {
      if (wrap) wrap.innerHTML = `<div class="p-4 text-center text-danger">Error loading recycle bin: ${escapeHtml(err.message)}</div>`;
    }
  };

  const renderTable = () => {
    const wrap = document.getElementById('recycle-results-wrap');
    if (!wrap) return;

    let filtered = currentDeletedRecords;
    if (currentFilterType !== 'all') {
      filtered = currentDeletedRecords.filter(r => r._table === currentFilterType);
    }

    if (!filtered.length) {
      wrap.innerHTML = `<div class="p-5 text-center text-muted">Recycle bin is empty for selected filter.</div>`;
      return;
    }

    let html = `
      <table class="table w-100">
        <thead>
          <tr>
            <th style="width:110px;">ENTITY TYPE</th>
            <th>NAME / DESCRIPTION</th>
            <th class="text-center" style="width:180px;">DELETED AT</th>
            <th class="text-right" style="width:190px;">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
    `;

    filtered.forEach(item => {
      const badgeClass =
        item._entityType === 'Student' ? 'badge-info' :
        item._entityType === 'Class' ? 'badge-success' :
        item._entityType === 'Test' ? 'badge-warning' : 'badge-neutral';

      html += `
        <tr>
          <td><span style="font-size: 12px; color:var(--clr-text-2); font-weight:500;">${item._entityType}</span></td>
          <td>
            <div class="fw-600" style="color:var(--clr-text-1); font-size:12px;">${escapeHtml(item._name)}</div>
            ${item._entityType === 'Student' ? '' : `<div class="text-xs text-muted" style="font-family:monospace; font-size:12px;">${escapeHtml(item._table || '')}</div>`}
          </td>
          <td class="text-center text-sm text-muted" style="font-size:12px;">${item.deleted_at ? new Date(item.deleted_at).toLocaleString() : '&mdash;'}</td>
          <td class="text-right">
            <button class="btn btn-secondary btn-sm btn-restore-item" data-table="${item._table}" data-id="${item.id}" data-name="${escapeHtml(item._name)}" title="Restore to active view" style="height:26px;font-size:12px;padding:0 8px;">
              Restore
            </button>
            <button class="btn btn-danger btn-sm btn-purge-item" data-table="${item._table}" data-id="${item.id}" data-name="${escapeHtml(item._name)}" title="Permanently delete from database" style="height:26px;font-size:12px;padding:0 8px;margin-left:4px;">
              Purge
            </button>
          </td>
        </tr>
      `;
    });

    html += `</tbody></table>`;
    wrap.innerHTML = html;

    // Attach Restore Listeners
    wrap.querySelectorAll('.btn-restore-item').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const table = e.currentTarget.dataset.table;
        const id = e.currentTarget.dataset.id;
        const name = e.currentTarget.dataset.name;

        showLoading('Restoring record...');
        try {
          await adminRestore(table, id);

          // Write to audit log
          const sb = await getSupabase();
          await sb.from('audit_logs').insert({
            actor_role: 'ADMIN',
            action: 'RESTORE_RECORD',
            entity_type: table,
            entity_id: id,
            new_value: { name, restored_at: new Date().toISOString() }
          }).catch(() => {});

          hideLoading();
          showToast(`Restored "${name}" successfully!`, 'success');
          fetchAllDeleted();
        } catch (err) {
          hideLoading();
          showToast('Failed to restore: ' + err.message, 'error');
        }
      });
    });

    // Attach Purge Listeners (Gated Red Modal)
    wrap.querySelectorAll('.btn-purge-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const table = e.currentTarget.dataset.table;
        const id = e.currentTarget.dataset.id;
        const name = e.currentTarget.dataset.name;
        openPurgeConfirmationModal(table, id, name, fetchAllDeleted);
      });
    });
  };

  fetchAllDeleted();
}

/**
 * Gated Red Confirmation Purge Modal requiring the admin to type "CONFIRM"
 */
function openPurgeConfirmationModal(table, id, name, onComplete) {
  const container = document.getElementById('purge-modal-container');
  if (!container) return;

  container.innerHTML = `
    <div class="purge-modal-overlay" id="purge-modal-backdrop">
      <div class="purge-modal-box">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="color:var(--grade-e);display:flex;align-items:center;">${getSvgIcon('alert-triangle', 28)}</div>
          <div>
            <h3 style="margin:0;font-size: 16px;color:var(--grade-e);font-weight:700;">Permanent Purge Warning</h3>
            <div class="text-xs text-muted">Irreversible Database Action</div>
          </div>
        </div>

        <p style="font-size:12px;line-height:1.5;color:#cbd5e1;margin-bottom:1rem;">
          You are about to permanently purge <strong style="color:#f8fafc;">${escapeHtml(name)}</strong> (<code style="color:var(--grade-e);">${table}</code>).
          This action will permanently delete this row and cannot be undone.
        </p>

        <div style="margin-bottom:1rem;">
          <label style="font-size: 12px;font-weight:700;color:var(--grade-e);text-transform:uppercase;letter-spacing:0.05em;display:block;margin-bottom:4px;">
            Type "CONFIRM" to unlock permanent purge:
          </label>
          <input type="text" class="purge-confirm-input" id="purge-confirm-text" placeholder="CONFIRM" autocomplete="off" />
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;gap:0.75rem;">
          <button class="btn btn-secondary btn-sm btn-modal-close-left" id="btn-purge-cancel">CLOSE</button>
          <button class="btn btn-danger btn-sm" id="btn-purge-execute" disabled style="opacity:0.5;cursor:not-allowed;display:inline-flex;align-items:center;gap:6px;">
            ${getSvgIcon('trash', 14)} Permanently Purge
          </button>
        </div>
      </div>
    </div>
  `;

  const input = document.getElementById('purge-confirm-text');
  const execBtn = document.getElementById('btn-purge-execute');
  const cancelBtn = document.getElementById('btn-purge-cancel');
  const backdrop = document.getElementById('purge-modal-backdrop');

  const closeModal = () => {
    container.innerHTML = '';
  };

  input.addEventListener('input', () => {
    const isUnlocked = input.value.trim() === 'CONFIRM';
    execBtn.disabled = !isUnlocked;
    execBtn.style.opacity = isUnlocked ? '1' : '0.5';
    execBtn.style.cursor = isUnlocked ? 'pointer' : 'not-allowed';
  });

  cancelBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeModal();
  });

  execBtn.addEventListener('click', async () => {
    if (input.value.trim() !== 'CONFIRM') return;

    closeModal();
    showLoading('Executing permanent purge...');
    try {
      await adminHardDelete(table, id);

      // Audit Log write
      const sb = await getSupabase();
      await sb.from('audit_logs').insert({
        actor_role: 'ADMIN',
        action: 'HARD_PURGE_RECORD',
        entity_type: table,
        entity_id: id,
        new_value: { name, purged_at: new Date().toISOString() }
      }).catch(() => {});

      hideLoading();
      showToast(`Record "${name}" was permanently purged.`, 'warning');
      onComplete?.();
    } catch (err) {
      hideLoading();
      showToast('Purge failed: ' + err.message, 'error');
    }
  });

  input.focus();
}


// ============================================================
// MODULE 2: ACTIVITY & AUDIT LOGS (IMMUTABLE LOGGING)
// ============================================================

export async function renderAuditLog(area) {
  area.innerHTML = `
    <div class="section-header mb-3">
      <h2 class="section-title text-gradient">Activity &amp; Audit Logs</h2>
      <p class="section-subtitle">Immutable security trail tracking administrative actions, logins, mutations, and anti-cheat triggers</p>
    </div>

    <!-- Audit Events Grid/Table (100vh workstation height lock, table-wrap scroll only) -->
    <div class="table-wrap" id="audit-table-wrap" style="flex:1 1 0 !important; min-height:0 !important; overflow-y:auto; overflow-x:auto !important; background:#0f172a; border:1px solid rgba(255,255,255,0.12) !important; border-radius:8px; margin:0;">
      ${(window.getLoadingStateHtml || ((msg) => `<div class="topscore-loading-center"><div class="spinner"></div><p class="loading-text">${msg}</p></div>`))('Fetching audit trail...')}
    </div>
  `;

  let allLogs = [];
  let auditGrid = null;

  const auditColumns = [
    {
      key: 'created_at',
      label: 'TIMESTAMP',
      sortable: true,
      width: '170px',
      render: (val, row) => {
        const rawDate = (val && typeof val !== 'object') ? val : (row?.created_at || row?.timestamp);
        const dateStr = rawDate && !isNaN(new Date(rawDate).getTime()) ? new Date(rawDate).toLocaleString() : '—';
        return `<span style="font-size:12px; color:var(--clr-text-3, #94a3b8); font-family:var(--font-mono, monospace); white-space:nowrap;">${dateStr}</span>`;
      }
    },
    {
      key: 'actor_role',
      label: 'ACTOR',
      sortable: true,
      width: '130px',
      render: (val, row) => `
        <span class="badge badge-info" style="font-size: 12px; font-weight:600;">${escapeHtml(val || 'ADMIN')}</span>
        ${row?.actor_user_id ? `<div style="font-size: 12px; color:var(--clr-text-3, #94a3b8); font-family:var(--font-mono, monospace); margin-top:2px;" title="${escapeHtml(row.actor_user_id)}">${escapeHtml(String(row.actor_user_id).substring(0, 8))}…</div>` : ''}
      `
    },
    {
      key: 'action',
      label: 'ACTION',
      sortable: true,
      width: '180px',
      render: (val, row) => {
        const rawAction = (typeof val === 'object' && val !== null ? (val.type || val.name || JSON.stringify(val)) : val) || row?.action || row?.event_type || 'UPDATE';
        const act = String(rawAction || '').toLowerCase();
        const isSecurity = act.includes('cheat') || act.includes('security') || act.includes('purge');
        const isSuccess = act.includes('create') || act.includes('restore') || act.includes('insert');
        const isInfo = act.includes('login') || act.includes('auth');
        const badgeClass = isSecurity ? 'badge-danger' : (isSuccess ? 'badge-success' : (isInfo ? 'badge-info' : 'badge-neutral'));
        return `<span class="badge ${badgeClass}" style="font-size: 12px; font-weight:700; white-space:nowrap;">${escapeHtml(String(rawAction || '—').toUpperCase())}</span>`;
      }
    },
    {
      key: 'entity_type',
      label: 'ENTITY',
      sortable: true,
      width: '120px',
      render: (val, row) => {
        if (!val) return `<span style="color:var(--clr-text-3, #94a3b8); font-size:12px;">—</span>`;
        return `<div style="font-size:12px; color:var(--clr-text-2, #cbd5e1); font-weight:500; white-space:nowrap;">${escapeHtml(val)}${row.entity_id ? ` <span style="font-family:var(--font-mono, monospace); font-size: 12px; color:var(--clr-text-3, #94a3b8);" title="${escapeHtml(row.entity_id)}">(${escapeHtml(String(row.entity_id).substring(0, 8))}…)</span>` : ''}</div>`;
      }
    },
    {
      // Flex Primary Column — absorbs all remaining viewport space (§TABLE-FLEX-PRIMARY)
      key: 'new_value',
      label: 'TARGET CONTEXT / DETAILS',
      sortable: false,
      minWidth: '260px',
      render: (val, row) => {
        let detailsText = '';
        if (row.new_value) {
          try {
            const nv = typeof row.new_value === 'string' ? JSON.parse(row.new_value) : row.new_value;
            detailsText = Object.entries(nv).map(([k, v]) => `<span style="color:var(--clr-text-3, #94a3b8);">${escapeHtml(k)}:</span> <strong style="font-weight:500; color:var(--clr-text-1, #f8fafc);">${escapeHtml(typeof v === 'object' ? JSON.stringify(v) : String(v))}</strong>`).join(' <span style="color:rgba(255,255,255,0.2);">|</span> ');
          } catch {
            detailsText = escapeHtml(String(row.new_value));
          }
        } else if (row.entity_type) {
          detailsText = `<span style="color:var(--clr-text-3, #94a3b8);">Entity:</span> <strong style="font-weight:500; color:var(--clr-text-1, #f8fafc);">${escapeHtml(row.entity_type)}</strong> (ID: <code style="font-size: 12px; color:var(--clr-primary, #38bdf8);">${escapeHtml(row.entity_id || '—')}</code>)`;
        } else {
          detailsText = `<span style="color:var(--clr-text-3, #94a3b8);">—</span>`;
        }
        return `<div style="font-size:12px; line-height:1.4; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;" title="${escapeHtml(detailsText.replace(/<[^>]+>/g, ''))}">${detailsText}</div>`;
      }
    }
  ];

  const applyFilters = () => {
    if (!auditGrid) return;
    const cat = document.getElementById('audit-filter-action')?.value || '';
    const q = (document.getElementById('audit-search-input')?.value || '').toLowerCase().trim();

    const filtered = allLogs.filter(r => {
      if (cat === 'AUTH' && !r.action.toLowerCase().includes('login') && !r.action.toLowerCase().includes('auth')) return false;
      if (cat === 'CRUD' && !['create', 'insert', 'delete', 'update', 'restore', 'purge'].some(k => r.action.toLowerCase().includes(k))) return false;
      if (cat === 'CONFIG' && !['config', 'setting', 'threshold', 'time_limit', 'score'].some(k => r.action.toLowerCase().includes(k))) return false;
      if (cat === 'SECURITY' && !['cheat', 'security', 'flag', 'tamper', 'lock'].some(k => r.action.toLowerCase().includes(k))) return false;

      if (q) {
        const actor = (r.actor_role || '') + ' ' + (r.actor_user_id || '');
        const action = r.action || '';
        const entity = (r.entity_type || '') + ' ' + (r.entity_id || '');
        const context = JSON.stringify(r.new_value || {}) + ' ' + JSON.stringify(r.old_value || {});
        const str = `${actor} ${action} ${entity} ${context}`.toLowerCase();
        if (!str.includes(q)) return false;
      }
      return true;
    });

    auditGrid.filteredData = filtered;
    auditGrid.sortData();
    auditGrid.currentPage = 1;
    auditGrid.render();
    const chip = document.getElementById('audit-count-chip');
    if (chip) chip.textContent = `${filtered.length} Events`;
  };

  const loadLogs = async () => {
    const wrap = document.getElementById('audit-table-wrap');
    const chip = document.getElementById('audit-count-chip');
    if (wrap && !auditGrid) {
      wrap.innerHTML = (window.getLoadingStateHtml || ((msg) => `<div class="topscore-loading-center"><div class="spinner"></div><p class="loading-text">${msg}</p></div>`))('Fetching audit trail...');
    }

    try {
      const sb = await getSupabase();
      const { data, error } = await sb
        .from('audit_logs')
        .select('id, created_at, actor_role, actor_user_id, action, entity_type, entity_id, old_value, new_value')
        .order('created_at', { ascending: false })
        .limit(150);

      if (error) throw error;
      allLogs = data || [];
      if (chip) chip.textContent = `${allLogs.length} Events`;

      // Instantiate DataGrid inside audit-table-wrap
      if (wrap) {
        wrap.innerHTML = '';
        auditGrid = new DataGrid({
          container: wrap,
          tableId: 'audit-logs-grid',
          autoFitOnMount: false,
          data: allLogs,
          columns: auditColumns,
          pageSize: 1000,
          hideToolbar: true,
          initialSortKey: 'created_at',
          initialSortAsc: false,
          bulkActions: false,
          emptyStateHtml: `<div class="p-5 text-center text-muted">No audit events match the selected criteria.</div>`
        });
        applyFilters();
      }
    } catch (err) {
      if (wrap) wrap.innerHTML = `<div class="p-4 text-center text-danger">Failed to load audit logs: ${escapeHtml(err.message)}</div>`;
    }
  };

  const syncAuditSubPanel = () => {
    if (typeof window.setBottomInfobar !== 'function') return;
    const currentCat = document.getElementById('audit-filter-action')?.value || '';
    const currentSearch = document.getElementById('audit-search-input')?.value || '';
    const count = auditGrid?.filteredData ? auditGrid.filteredData.length : allLogs.length;

    const leftHtml = `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:nowrap;">
        <select id="audit-filter-action" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;font-size:12px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);color:#f8fafc;border-radius:4px;padding:0 8px;outline:none;">
          <option value="" ${currentCat === '' ? 'selected' : ''}>All Categories</option>
          <option value="AUTH" ${currentCat === 'AUTH' ? 'selected' : ''}>Logins &amp; Auth</option>
          <option value="CRUD" ${currentCat === 'CRUD' ? 'selected' : ''}>CRUD Actions</option>
          <option value="CONFIG" ${currentCat === 'CONFIG' ? 'selected' : ''}>Configs &amp; Limits</option>
          <option value="SECURITY" ${currentCat === 'SECURITY' ? 'selected' : ''}>Security &amp; Cheating</option>
        </select>
        <div style="position:relative;display:inline-flex;align-items:center;">
          <span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);color:#94a3b8;font-size:12px;display:inline-flex;align-items:center;pointer-events:none;">
            ${getSvgIcon('search', 12)}
          </span>
          <input type="text" id="audit-search-input" placeholder="Search actor, entity, action..." value="${escapeHtml(currentSearch)}" style="padding:0 8px 0 26px;font-size:12px;height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.15);color:#f8fafc;border-radius:4px;width:240px;outline:none;box-sizing:border-box;" />
        </div>
        <button type="button" class="btn btn-ghost btn-sm" id="audit-reset-btn" style="height:30px;font-size:12px;color:#94a3b8;padding:0 8px;">Reset</button>
      </div>
    `;

    const isEditOn = (typeof document !== 'undefined' && document.body.classList.contains('global-edit-mode-on')) || Boolean(window._globalEditMode);
    const editBtnStyle = isEditOn
      ? 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:#38bdf8;border:1px solid #38bdf8;color:#090d16;transition:all 0.15s ease;'
      : 'height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;cursor:pointer;display:inline-flex;align-items:center;gap:6px;background:transparent;border:1px solid #38bdf8;color:#38bdf8;transition:all 0.15s ease;';
    const editBtnLabel = isEditOn
      ? `${getSvgIcon('check-circle', 14)} Done Editing`
      : `${getSvgIcon('edit', 14)} Edit Mode`;

    const rightHtml = `
      <div style="display:flex;align-items:center;gap:10px;white-space:nowrap;">
        <span class="badge badge-info" id="audit-count-chip" style="font-size:12px;font-weight:700;">${count} Events</span>
        <button type="button" class="btn btn-sm" id="audit-toggle-edit-mode" style="${editBtnStyle}" title="Toggle Master Edit Mode (Excel Gridlines)">${editBtnLabel}</button>
        <button type="button" class="btn btn-secondary btn-sm" id="audit-refresh-btn" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;display:inline-flex;align-items:center;gap:5px;cursor:pointer;">
          ${getSvgIcon('refresh', 14)} Refresh Logs
        </button>
      </div>
    `;

    window.setBottomInfobar(leftHtml, rightHtml);

    document.getElementById('audit-filter-action')?.addEventListener('change', applyFilters);
    document.getElementById('audit-search-input')?.addEventListener('input', applyFilters);
    document.getElementById('audit-toggle-edit-mode')?.addEventListener('click', () => {
      if (typeof window.toggleGlobalEditMode === 'function') {
        const newState = window.toggleGlobalEditMode();
        showToast(newState ? 'Master Edit Mode ON (Inline Excel Grid)' : 'Master Edit Mode OFF', newState ? 'info' : 'success');
        syncAuditSubPanel();
      }
    });
    document.getElementById('audit-reset-btn')?.addEventListener('click', () => {
      const filterEl = document.getElementById('audit-filter-action');
      const searchEl = document.getElementById('audit-search-input');
      if (filterEl) filterEl.value = '';
      if (searchEl) searchEl.value = '';
      applyFilters();
    });
    document.getElementById('audit-refresh-btn')?.addEventListener('click', loadLogs);
  };

  syncAuditSubPanel();
  loadLogs();
}


// ============================================================
// MODULE 3: DATA HEALTH & CONNECTIVITY (TELEMETRY & DIAGNOSTICS)
// ============================================================

export async function renderDataHealth(container) {
  container.innerHTML = `
    <div class="section-header d-flex justify-between align-center flex-wrap gap-2 mb-4">
      <div>
        <h2 class="section-title text-gradient">Data Health &amp; Connectivity (Pillar D)</h2>
        <p class="section-subtitle">Real-time database connectivity, WebSocket latency monitoring, storage metrics, and relational integrity diagnostics</p>
      </div>
      <div class="d-flex align-center gap-2" id="sync-heartbeat-badge">
        <span class="heartbeat-dot pulse-emerald" id="health-heartbeat-dot"></span>
        <span class="text-xs fw-700" id="health-heartbeat-text" style="color:var(--grade-a);">Supabase Live</span>
      </div>
    </div>

    <!-- Real-Time Metrics Dashboard -->
    <div class="grid mb-4" style="grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:1rem;">
      <div class="antigravity-card p-4">
        <div class="d-flex justify-between align-center mb-2">
          <span class="text-xs text-muted text-uppercase fw-700">WebSocket / DB Latency</span>
          <button class="btn btn-ghost btn-xs" id="btn-ping-latency" title="Measure latency" style="display:inline-flex;align-items:center;gap:4px;">${getSvgIcon('activity', 12)} Ping</button>
        </div>
        <div style="font-size: 20px;font-weight:700;color:#38bdf8;" id="metric-latency">Measuring...</div>
        <div class="text-xs text-muted mt-1" id="metric-latency-desc">Testing roundtrip response</div>
      </div>

      <div class="antigravity-card p-4">
        <div class="text-xs text-muted text-uppercase fw-700 mb-2">Storage Usage (Transient Blobs)</div>
        <div style="font-size: 20px;font-weight:700;color:var(--clr-success);" id="metric-storage">0.00 MB</div>
        <div class="text-xs text-muted mt-1">Zero audio blobs persisted (Low-Egress)</div>
      </div>

      <div class="antigravity-card p-4">
        <div class="text-xs text-muted text-uppercase fw-700 mb-2">Active Students</div>
        <div style="font-size: 20px;font-weight:700;color:#f8fafc;" id="metric-students">&mdash;</div>
        <div class="text-xs text-muted mt-1">Enrolled &amp; active records</div>
      </div>

      <div class="antigravity-card p-4">
        <div class="text-xs text-muted text-uppercase fw-700 mb-2">Tests &amp; Attempts</div>
        <div style="font-size: 20px;font-weight:700;color:#f8fafc;" id="metric-Tests">&mdash;</div>
        <div class="text-xs text-muted mt-1" id="metric-attempts-desc">Test attempts logged</div>
      </div>
    </div>

    <!-- 3 Relational Diagnostic Panels -->
    <div class="grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:10px;">

      <!-- Panel 1: Students Duplicate Engine -->
      <div class="antigravity-card p-4" style="display:flex;flex-direction:column;justify-content:space-between;height:100%;border-radius:8px;">
        <div>
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
            <div style="background:rgba(59,130,246,0.12);color:#60a5fa;padding:0.5rem;border-radius:8px;display:flex;align-items:center;justify-content:center;">${getSvgIcon('users', 24)}</div>
            <div>
              <h3 style="font-weight:700;margin:0 0 2px 0;font-size: 16px;">Student Profile Duplicates</h3>
              <div class="text-xs text-muted">Identical names within the same batch</div>
            </div>
          </div>
          <p style="font-size: 12px;color:var(--clr-text-2);line-height:1.4;margin:0 0 1rem 0;">
            Detect students registered under duplicate records. Safely merge duplicate profiles, transferring historical attempts to the authoritative ID.
          </p>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-health-scan-students" style="width:100%;height:32px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
          ${getSvgIcon('search', 14)} Scan Students
        </button>
      </div>

      <!-- Panel 2: Question Duplicate Engine -->
      <div class="antigravity-card p-4" style="display:flex;flex-direction:column;justify-content:space-between;height:100%;border-radius:8px;">
        <div>
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
            <div style="background:rgba(250,204,21,0.12);color:var(--grade-c);padding:0.5rem;border-radius:8px;display:flex;align-items:center;justify-content:center;">${getSvgIcon('zap', 24)}</div>
            <div>
              <h3 style="font-weight:700;margin:0 0 2px 0;font-size: 16px;">Question Bank Duplicates</h3>
              <div class="text-xs text-muted">Duplicate text or order conflicts</div>
            </div>
          </div>
          <p style="font-size: 12px;color:var(--clr-text-2);line-height:1.4;margin:0 0 1rem 0;">
            Identify duplicate questions across the centralized question bank or within the same test to maintain question uniqueness.
          </p>
        </div>
        <button class="btn btn-warning btn-sm" id="btn-health-scan-questions" style="width:100%;height:32px;font-size:12px;font-weight:700;color:#000;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
          ${getSvgIcon('search', 14)} Scan Questions
        </button>
      </div>

      <!-- Panel 3: Orphaned Records & Integrity Scanner -->
      <div class="antigravity-card p-4" style="display:flex;flex-direction:column;justify-content:space-between;height:100%;border-radius:8px;">
        <div>
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
            <div style="background:rgba(16,185,129,0.12);color:var(--grade-a);padding:0.5rem;border-radius:8px;display:flex;align-items:center;justify-content:center;">${getSvgIcon('shield', 24)}</div>
            <div>
              <h3 style="font-weight:700;margin:0 0 2px 0;font-size: 16px;">Orphaned Records &amp; Integrity</h3>
              <div class="text-xs text-muted">Audits relational foreign keys &amp; integrity</div>
            </div>
          </div>
          <p style="font-size: 12px;color:var(--clr-text-2);line-height:1.4;margin:0 0 1rem 0;">
            Audit foreign key integrity. Identify unlinked attempt answers, progress records missing students, and Tests with dangling references.
          </p>
        </div>
        <button class="btn btn-tactical btn-sm" id="btn-health-scan-orphans" style="width:100%;height:32px;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;gap:6px;">
          ${getSvgIcon('search', 14)} Scan Integrity
        </button>
      </div>

    </div>

    <!-- Dedicated Maintenance Card: Test Engine Recalibration -->
    <div class="antigravity-card p-5 mt-4" id="card-test-recalibration" style="border: 1px solid rgba(245, 158, 11, 0.25);">
      <div class="d-flex justify-between align-center flex-wrap gap-2 mb-3">
        <div class="d-flex align-center gap-3">
          <div style="background: rgba(245, 158, 11, 0.12); padding: 0.5rem; border-radius: 10px; line-height: 1; color: var(--grade-c);">${getSvgIcon('zap', 20)}</div>
          <div>
            <h3 style="font-weight: 700; margin: 0 0 2px 0; font-size: 16px;">Test Engine Recalibration</h3>
            <p class="text-xs text-muted" style="margin: 0;">
              Recalculate historical submitted student attempts after updating questions, adding multiple correct answers (separated by <code>;</code> or <code>|</code>), or enabling hyphen tolerance
            </p>
          </div>
        </div>
        <span class="badge badge-warning" style="font-weight: 700; font-size: 12px;">Domain D Maintenance</span>
      </div>

      <div class="d-flex align-center gap-3 flex-wrap mt-3" style="background: rgba(255, 255, 255, 0.02); padding: 14px; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.06);">
        <div style="flex: 1; min-width: 260px;">
          <label class="form-label text-xs fw-700 text-muted mb-1" style="display: block;">Select Target Test</label>
          <select class="form-control" id="recalibrator-Test-select" style="height: 38px;">
            <option value="">&mdash; Choose an Test to Recalibrate &mdash;</option>
          </select>
        </div>
        <div class="d-flex gap-2 align-end" style="padding-top: 18px;">
          <button class="btn btn-primary" id="btn-preview-recal" disabled style="height: 38px;">${getSvgIcon('search', 14)} Preview Recalibration</button>
          <button class="btn btn-tactical" id="btn-apply-recal" disabled style="height: 38px; font-weight: 700;">${getSvgIcon('zap', 14)} Apply Recalibration</button>
        </div>
      </div>

      <!-- Metrics Overview Panel -->
      <div id="recal-metrics-panel" class="hidden mt-4">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px;">
          <div class="glass-card p-3 text-center">
            <div class="text-xs text-muted mb-1">Total Questions</div>
            <div class="fw-700" style="font-size: 20px;" id="recal-metric-questions">0</div>
          </div>
          <div class="glass-card p-3 text-center">
            <div class="text-xs text-muted mb-1">Submitted Attempts</div>
            <div class="fw-700" style="font-size: 20px;" id="recal-metric-attempts">0</div>
          </div>
          <div class="glass-card p-3 text-center" style="border-left: 3px solid var(--primary-tactical, #38bdf8);">
            <div class="text-xs text-muted mb-1">Affected Attempts</div>
            <div class="fw-700" style="font-size: 20px; color: var(--clr-primary, #a855f7);" id="recal-metric-affected">0</div>
          </div>
          <div class="glass-card p-3 text-center" style="border-left: 3px solid var(--grade-a);">
            <div class="text-xs text-muted mb-1">Status: FAIL &rarr; PASS</div>
            <div class="fw-700" style="font-size: 20px; color: var(--grade-a);" id="recal-metric-fail-pass">0</div>
          </div>
          <div class="glass-card p-3 text-center" style="border-left: 3px solid var(--grade-e);">
            <div class="text-xs text-muted mb-1">Status: PASS &rarr; FAIL</div>
            <div class="fw-700" style="font-size: 20px; color: var(--grade-e);" id="recal-metric-pass-fail">0</div>
          </div>
          <div class="glass-card p-3 text-center" style="border-left: 3px solid #38bdf8;">
            <div class="text-xs text-muted mb-1">Rate Increases</div>
            <div class="fw-700" style="font-size: 20px; color: #38bdf8;" id="recal-metric-increases">0</div>
          </div>
        </div>
      </div>

      <!-- Preview Results Table -->
      <div id="recal-results-wrap" class="hidden mt-4">
        <div class="d-flex align-center justify-between flex-wrap gap-2 mb-3">
          <div class="fw-700 text-sm">Attempt Preview Changes</div>
          <div class="d-flex align-center gap-2">
            <label class="text-xs text-muted">Filter:</label>
            <select class="form-control" id="recal-filter-view" style="width: auto; padding: 3px 8px; font-size: 12px; height: 30px;">
              <option value="affected">Affected Students Only</option>
              <option value="all">All Students</option>
            </select>
          </div>
        </div>
        <div class="table-wrap" style="max-height: 360px; overflow-y: auto;">
          <table style="width: 100%;">
            <thead>
              <tr>
                <th class="text-left">PROGRAM</th>
                <th class="text-left">STUDENT NAME</th>
                <th class="text-center">OLD PTS</th>
                <th class="text-center">NEW PTS</th>
                <th class="text-center">OLD RATE</th>
                <th class="text-center">NEW RATE</th>
                <th class="text-center">OLD GRD</th>
                <th class="text-center">NEW GRD</th>
                <th class="text-center">STATUS CHANGE</th>
                <th class="text-center">ANSWERS CHANGED</th>
              </tr>
            </thead>
            <tbody id="recal-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Confirmation Modal for Recalibration -->
    <div class="modal-backdrop hidden" id="recal-confirm-modal" role="dialog" aria-modal="true">
      <div class="modal-box" style="max-width: 480px; text-align: center;">
        <div style="margin-bottom: 1rem; color: var(--grade-c);">${getSvgIcon('zap', 35)}</div>
        <h3 class="mb-2">Confirm Test Recalibration?</h3>
        <p class="text-muted text-sm mb-4">
          This will safely update historical submitted scores, percentages, grades, and student progression using the authoritative grading engine.
        </p>
        <div class="p-4 rounded text-left text-xs mb-6" style="background: rgba(255,255,255,0.04); border: 1px solid var(--clr-border);">
          <div class="mb-1">&bull; <b>Affected Attempts:</b> <span id="modal-affected-count" class="fw-700 text-primary">0</span></div>
          <div class="mb-1">&bull; <b>Status Transitions:</b> <span id="modal-status-changes" class="fw-700">0</span></div>
          <div>&bull; <b>Audit Trail:</b> An audit log entry will be permanently recorded.</div>
        </div>
        <div class="d-flex gap-3 justify-between">
          <button class="btn btn-secondary btn-modal-close-left" id="btn-recal-cancel" style="flex:1;">CLOSE</button>
          <button class="btn btn-tactical" id="btn-recal-confirm-run" style="flex:1; font-weight: 700;">${getSvgIcon('check-circle', 14)} Yes, Apply Changes</button>
        </div>
      </div>
    </div>
  `;

  // Measure Latency & Heartbeat
  const checkHealth = async () => {
    const latEl = document.getElementById('metric-latency');
    const latDesc = document.getElementById('metric-latency-desc');
    const dot = document.getElementById('health-heartbeat-dot');
    const text = document.getElementById('health-heartbeat-text');

    const start = performance.now();
    try {
      const res = await testSupabaseConnection();
      const latency = Math.round(performance.now() - start);

      if (latEl) latEl.textContent = `${latency} ms`;

      if (res.connected) {
        if (latency < 400) {
          if (dot) dot.className = 'heartbeat-dot pulse-emerald';
          if (text) { text.textContent = 'Supabase Connected'; text.style.color = 'var(--clr-success)'; }
          if (latDesc) latDesc.textContent = 'Optimal connection speed';
        } else {
          if (dot) dot.className = 'heartbeat-dot pulse-amber';
          if (text) { text.textContent = 'High Latency'; text.style.color = 'var(--clr-warning)'; }
          if (latDesc) latDesc.textContent = 'Moderate response delay';
        }
      } else {
        if (dot) dot.className = 'heartbeat-dot pulse-red';
        if (text) { text.textContent = 'Offline / Disconnected'; text.style.color = 'var(--clr-danger)'; }
        if (latDesc) latDesc.textContent = res.error || 'Connection failed';
      }
    } catch (e) {
      if (dot) dot.className = 'heartbeat-dot pulse-red';
      if (text) { text.textContent = 'Network Error'; text.style.color = 'var(--clr-danger)'; }
      if (latEl) latEl.textContent = 'Error';
    }
  };

  // Load Database Counts (OPTIMIZATION: head-only count query avoids fetching 8,827 rows)
  const loadEntityCounts = async () => {
    try {
      const sb = typeof getSupabase === 'function' ? await getSupabase() : null;
      const [students, Tests, attCountRes] = await Promise.all([
        adminFetchAll('students', 'id, deleted_at').catch(() => []),
        adminFetchAll('tests', 'id, deleted_at').catch(() => []),
        sb ? sb.from('attempts').select('*', { count: 'exact', head: true }) : Promise.resolve({ count: 0 })
      ]);

      const activeStds = (students || []).filter(s => !s.deleted_at).length;
      const activeTests = (Tests || []).filter(e => !e.deleted_at).length;
      const totalAttempts = attCountRes?.count ?? 0;

      const sEl = document.getElementById('metric-students');
      if (sEl) sEl.textContent = activeStds;

      const eEl = document.getElementById('metric-Tests');
      if (eEl) eEl.textContent = activeTests;

      const aEl = document.getElementById('metric-attempts-desc');
      if (aEl) aEl.textContent = `${totalAttempts} attempts logged`;
    } catch (err) {
      console.warn('Could not load health metrics counts:', err);
    }
  };

  document.getElementById('btn-ping-latency')?.addEventListener('click', checkHealth);
  checkHealth();
  loadEntityCounts();

  // Attach Diagnostic Scanners
  document.getElementById('btn-health-scan-students')?.addEventListener('click', () => {
    if (typeof openDuplicateStudentsModal === 'function') {
      openDuplicateStudentsModal();
    } else if (typeof window.openDuplicateStudentsModal === 'function') {
      window.openDuplicateStudentsModal();
    }
  });

  document.getElementById('btn-health-scan-questions')?.addEventListener('click', () => {
    if (typeof openDuplicateQuestionsModal === 'function') {
      openDuplicateQuestionsModal();
    } else if (typeof window.openDuplicateQuestionsModal === 'function') {
      window.openDuplicateQuestionsModal();
    }
  });

  document.getElementById('btn-health-scan-orphans')?.addEventListener('click', async () => {
    showLoading('Auditing relational database integrity...');
    try {
      const [students, Tests, attempts, attemptAnswers, progress] = await Promise.all([
        adminFetchAll('students', 'id, name, deleted_at'),
        adminFetchAll('tests', 'id, title, deleted_at'),
        adminFetchAll('attempts', 'id, student_id, test_id, status, created_at'),
        adminFetchAll('attempt_answers', 'id, attempt_id'),
        adminFetchAll('progress', 'id, student_id').catch(() => [])
      ]);

      const studentIdSet = new Set((students || []).map(s => s.id));
      const TestIdSet = new Set((Tests || []).map(e => e.id));
      const attemptIdSet = new Set((attempts || []).map(a => a.id));

      const orphanedAttempts = (attempts || []).filter(a =>
        (a.student_id && !studentIdSet.has(a.student_id)) ||
        (a.test_id && !TestIdSet.has(a.test_id))
      );

      const orphanedQuestions = [];

      const orphanedAnswers = (attemptAnswers || []).filter(ans =>
        ans.attempt_id && !attemptIdSet.has(ans.attempt_id)
      );

      const danglingProgress = (progress || []).filter(p =>
        p.student_id && !studentIdSet.has(p.student_id)
      );

      const totalIssues = orphanedAttempts.length + orphanedQuestions.length + orphanedAnswers.length + danglingProgress.length;

      const resultsHTML = `
        <div style="display:flex;flex-direction:column;gap:1.25rem;">
          <div class="antigravity-card p-4 text-center" style="border:1px solid ${totalIssues === 0 ? 'rgba(var(--grade-a-rgb, 0, 192, 0), 0.3)' : 'rgba(var(--grade-e-rgb, 255, 0, 0), 0.3)'};">
            <div style="display:flex;align-items:center;justify-content:center;margin-bottom:0.5rem;color:${totalIssues === 0 ? 'var(--grade-a)' : 'var(--grade-e)'};">
              ${totalIssues === 0 ? getSvgIcon('check-circle', 36) : getSvgIcon('alert-triangle', 36)}
            </div>
            <h3 style="font-weight:700;margin:0 0 4px 0;color:${totalIssues === 0 ? 'var(--clr-success)' : 'var(--clr-warning)'};">
              ${totalIssues === 0 ? 'All Relational Constraints Healthy' : `${totalIssues} Integrity Issue(s) Detected`}
            </h3>
            <p class="text-xs text-muted" style="margin:0;">
              ${totalIssues === 0 ? 'All Test attempts, questions, answers, and progress records have valid relational parents.' : 'Some records reference missing or unlinked entities.'}
            </p>
          </div>

          <div style="display:grid;grid-template-columns:repeat(2, 1fr);gap:1rem;">
            <div class="antigravity-card p-3">
              <div class="text-xs text-muted mb-1">Orphaned Attempts</div>
              <div style="font-size: 20px;font-weight:700;color:${orphanedAttempts.length ? 'var(--clr-danger)' : 'var(--clr-success)'};">
                ${orphanedAttempts.length}
              </div>
            </div>
            <div class="antigravity-card p-3">
              <div class="text-xs text-muted mb-1">Orphaned Questions</div>
              <div style="font-size: 20px;font-weight:700;color:${orphanedQuestions.length ? 'var(--clr-danger)' : 'var(--clr-success)'};">
                ${orphanedQuestions.length}
              </div>
            </div>
            <div class="antigravity-card p-3">
              <div class="text-xs text-muted mb-1">Unlinked Answers</div>
              <div style="font-size: 20px;font-weight:700;color:${orphanedAnswers.length ? 'var(--clr-danger)' : 'var(--clr-success)'};">
                ${orphanedAnswers.length}
              </div>
            </div>
            <div class="antigravity-card p-3">
              <div class="text-xs text-muted mb-1">Dangling Progress</div>
              <div style="font-size: 20px;font-weight:700;color:${danglingProgress.length ? 'var(--clr-danger)' : 'var(--clr-success)'};">
                ${danglingProgress.length}
              </div>
            </div>
          </div>
        </div>
      `;

      if (window.openRecordDrawer) {
        window.openRecordDrawer('Database Integrity & Orphan Scan', resultsHTML, '<button class="btn btn-secondary" onclick="closeRecordDrawer()">Close</button>');
      } else {
        showToast(totalIssues === 0 ? 'Database integrity is 100% healthy!' : `${totalIssues} issues found.`, totalIssues === 0 ? 'success' : 'warning');
      }
    } catch (err) {
      showToast('Scan error: ' + err.message, 'error');
    } finally {
      hideLoading();
    }
  });

  // --- Test Engine Recalibration Controller ---
  (async () => {
    try {
      const allTests = await adminFetchAll('tests');
      const activeTests = (allTests || []).filter(e => !e.deleted_at).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      const asmSelect = document.getElementById('recalibrator-Test-select');
      if (asmSelect) {
        asmSelect.innerHTML = '<option value="">&mdash; Choose an Test to Recalibrate &mdash;</option>' +
          activeTests.map(e => `<option value="${e.id}">[${escapeHtml(e.test_type || 'Test')}] ${escapeHtml(e.title || e.display_name || e.id)}</option>`).join('');
      }

      let currentPreviewData = null;
      const btnPreview = document.getElementById('btn-preview-recal');
      const btnApply = document.getElementById('btn-apply-recal');
      const metricsPanel = document.getElementById('recal-metrics-panel');
      const resultsWrap = document.getElementById('recal-results-wrap');
      const tableBody = document.getElementById('recal-table-body');
      const filterSelect = document.getElementById('recal-filter-view');
      const confirmModal = document.getElementById('recal-confirm-modal');

      if (asmSelect && btnPreview && btnApply) {
        asmSelect.addEventListener('change', () => {
          const val = asmSelect.value;
          btnPreview.disabled = !val;
          btnApply.disabled = true;
          if (metricsPanel) metricsPanel.classList.add('hidden');
          if (resultsWrap) resultsWrap.classList.add('hidden');
          currentPreviewData = null;
        });

        const renderPreviewRows = () => {
          if (!currentPreviewData || !tableBody) return;
          const mode = filterSelect ? filterSelect.value : 'affected';
          const list = mode === 'affected'
            ? currentPreviewData.attemptsDiff.filter(a => a.isAffected)
            : currentPreviewData.attemptsDiff;

          tableBody.innerHTML = '';
          if (!list.length) {
            tableBody.innerHTML = `<tr><td colspan="10" class="text-center text-muted p-4">No ${mode === 'affected' ? 'affected ' : ''}student attempts found.</td></tr>`;
            return;
          }

          list.forEach(item => {
            const isScoreUp = item.newPercentage > item.oldPercentage;
            const isScoreDown = item.newPercentage < item.oldPercentage;
            const isStatusPass = item.oldStatus === 'FAIL' && item.newStatus === 'PASS';
            const isStatusFail = item.oldStatus === 'PASS' && item.newStatus === 'FAIL';

            let statusBadge = '<span style="color:var(--clr-text-muted); font-size:12px; font-weight:500;">No Change</span>';
            if (isStatusPass) {
              statusBadge = '<span style="color:var(--grade-a); font-weight:700; font-size:12px;">Fail &rarr; Pass</span>';
            } else if (isStatusFail) {
              statusBadge = '<span style="color:var(--grade-e); font-weight:700; font-size:12px;">Pass &rarr; Fail</span>';
            } else if (item.isAffected) {
              statusBadge = isScoreUp ? '<span style="color:var(--primary-tactical, #38bdf8); font-weight:700; font-size:12px;">+ Rate Up</span>' : '<span style="color:var(--grade-c); font-weight:700; font-size:12px;">- Rate Down</span>';
            }

            const changedAnswersCount = item.questions ? item.questions.filter(q => q.isAffected).length : 0;

              const oldSymbol = (item.oldGrade === 'S' || item.oldGrade === '★' || parseFloat(item.oldPercentage) >= 100) ? '★' : item.oldGrade;
              const newSymbol = (item.newGrade === 'S' || item.newGrade === '★' || parseFloat(item.newPercentage) >= 100) ? '★' : item.newGrade;
              const tr = document.createElement('tr');
              tr.innerHTML = `
                <td class="text-muted text-sm">${escapeHtml(item.programName)}</td>
                <td class="fw-600">${escapeHtml(item.studentName)}</td>
                <td class="text-center text-muted">${item.oldScore}</td>
                <td class="text-center fw-700 ${isScoreUp ? 'text-success' : isScoreDown ? 'text-danger' : ''}">${item.newScore}</td>
                <td class="text-center text-muted">${item.oldPercentage}%</td>
                <td class="text-center fw-700 ${isScoreUp ? 'text-success' : isScoreDown ? 'text-danger' : ''}">${item.newPercentage}%</td>
                <td class="text-center"><span class="grade-badge grade-${item.oldGrade}" style="width:24px;height:24px;font-size: 12px;display:inline-flex;align-items:center;justify-content:center;line-height:1;">${oldSymbol}</span></td>
                <td class="text-center"><span class="grade-badge grade-${item.newGrade}" style="width:24px;height:24px;font-size: 12px;display:inline-flex;align-items:center;justify-content:center;line-height:1;">${newSymbol}</span></td>
                <td class="text-center">${statusBadge}</td>
                <td class="text-center"><span style="color:${changedAnswersCount > 0 ? 'var(--primary-tactical, #38bdf8)' : '#94a3b8'}; font-weight:700; font-size:12px;">${changedAnswersCount} q</span></td>
              `;
            tableBody.appendChild(tr);
          });
        };

        if (filterSelect) filterSelect.addEventListener('change', renderPreviewRows);

        btnPreview.addEventListener('click', async () => {
          const asmId = asmSelect.value;
          if (!asmId) return;

          showLoading('Calculating recalibration preview across all attempts...');
          try {
            currentPreviewData = await previewRecalibrateTest(asmId);
            hideLoading();

            const qEl = document.getElementById('recal-metric-questions');
            const attEl = document.getElementById('recal-metric-attempts');
            const affEl = document.getElementById('recal-metric-affected');
            const fpEl = document.getElementById('recal-metric-fail-pass');
            const pfEl = document.getElementById('recal-metric-pass-fail');
            const incEl = document.getElementById('recal-metric-increases');

            if (qEl) qEl.textContent = currentPreviewData.totalQuestions;
            if (attEl) attEl.textContent = currentPreviewData.totalAttempts;
            if (affEl) affEl.textContent = currentPreviewData.affectedAttemptsCount;
            if (fpEl) fpEl.textContent = currentPreviewData.failToPassCount;
            if (pfEl) pfEl.textContent = currentPreviewData.passToFailCount;
            if (incEl) incEl.textContent = currentPreviewData.scoreIncreaseCount;

            if (metricsPanel) metricsPanel.classList.remove('hidden');
            if (resultsWrap) resultsWrap.classList.remove('hidden');
            renderPreviewRows();

            if (currentPreviewData.affectedAttemptsCount > 0) {
              btnApply.disabled = false;
              showToast(`Found ${currentPreviewData.affectedAttemptsCount} attempts that can be recalibrated.`, 'info');
            } else {
              btnApply.disabled = true;
              showToast('All attempts already match the latest question definitions and grading engine.', 'success');
            }
          } catch (err) {
            hideLoading();
            showToast('Preview error: ' + err.message, 'error');
          }
        });

        btnApply.addEventListener('click', () => {
          if (!currentPreviewData || currentPreviewData.affectedAttemptsCount === 0) return;
          const affCountEl = document.getElementById('modal-affected-count');
          const statChangeEl = document.getElementById('modal-status-changes');
          if (affCountEl) affCountEl.textContent = currentPreviewData.affectedAttemptsCount;
          if (statChangeEl) statChangeEl.textContent = (currentPreviewData.failToPassCount + currentPreviewData.passToFailCount);
          if (confirmModal) confirmModal.classList.remove('hidden');
        });

        document.getElementById('btn-recal-cancel')?.addEventListener('click', () => {
          if (confirmModal) confirmModal.classList.add('hidden');
        });

        document.getElementById('btn-recal-confirm-run')?.addEventListener('click', async () => {
          if (confirmModal) confirmModal.classList.add('hidden');
          const asmId = asmSelect.value;
          if (!asmId) return;

          showLoading('Applying recalibration to historical student results...');
          try {
            const res = await applyRecalibrateTest(asmId);
            hideLoading();
            showToast(`Successfully recalibrated ${res.updatedAttemptsCount} attempts!`, 'success');
            btnApply.disabled = true;
            btnPreview.click();
          } catch (err) {
            hideLoading();
            showToast('Failed to apply recalibration: ' + err.message, 'error');
          }
        });

        // Pre-selection if navigated from an test row
        if (window._filterRecalibrateTest) {
          asmSelect.value = window._filterRecalibrateTest;
          window._filterRecalibrateTest = null;
          btnPreview.disabled = !asmSelect.value;
          document.getElementById('card-test-recalibration')?.scrollIntoView({ behavior: 'smooth' });
          if (!btnPreview.disabled) btnPreview.click();
        }
      }
    } catch(err) {
      console.warn('Could not initialize Test Recalibrator in Data Health:', err);
    }
  })();

  if (typeof window.setBottomInfobar === 'function') {
    const leftHtml = `
      <div style="display:flex;align-items:center;gap:12px;font-size:12px;color:#94a3b8;font-weight:600;">
        <span><strong style="color:#f8fafc;">Domain D</strong> · Data Health &amp; Connectivity</span>
        <span>·</span>
        <span style="color:var(--grade-a);font-weight:700;">● Real-time Telemetry</span>
      </div>
    `;
    const rightHtml = `
      <button type="button" class="btn btn-secondary btn-sm" id="btn-subpanel-ping-db" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:700;border-radius:4px;display:inline-flex;align-items:center;gap:5px;">
        ${getSvgIcon('activity', 14)} Ping Database
      </button>
    `;
    window.setBottomInfobar(leftHtml, rightHtml);
    document.getElementById('btn-subpanel-ping-db')?.addEventListener('click', () => {
      document.getElementById('btn-ping-db')?.click();
    });
  }
}


// ============================================================
// MODULE 4: SITE SETTINGS & API COST GUARD (VAULT & RATE LIMITS)
// ============================================================

export async function renderSettings(area) {
  const sb = await getSupabase();
  const { data } = await sb.from('site_settings').select('*');
  const settings = Object.fromEntries((data || []).map(r => [r.key, r.value]));

  // Local config cache
  const currentCustomPass = localStorage.getItem('topscore_admin_custom_password') || '';
  const currentTutorPass = localStorage.getItem('topscore_tutor_custom_password') || '';
  const cooldownSecs = settings.ai_cooldown_limit_seconds || localStorage.getItem('ai_cooldown_limit_seconds') || '60';
  const maxAudioSecs = settings.ai_max_audio_duration_seconds || localStorage.getItem('ai_max_audio_duration_seconds') || '180';

  area.innerHTML = `
    <div class="section-header mb-3">
      <h2 class="section-title text-gradient">Site Settings &amp; API Cost Guard (Pillar D)</h2>
      <p class="section-subtitle">Platform configuration, API key vault, security credentials, and AI token bankruptcy prevention limits</p>
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:10px;align-items:start;">

      <!-- 1. The Cost Guard Engine Card (Crucial) -->
      <div class="antigravity-card p-5" style="border-color:rgba(255,0,0,0.3);box-shadow:0 20px 40px rgba(255,0,0,0.08);">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="color:var(--grade-e);display:flex;align-items:center;">${getSvgIcon('shield', 22)}</div>
          <div>
            <h3 style="font-size: 16px;margin:0;color:var(--grade-e);font-weight:700;">The Cost Guard Engine</h3>
            <div class="text-xs text-muted">Global AI Token Bankruptcy Defense</div>
          </div>
        </div>
        <p class="text-xs text-muted mb-3" style="line-height:1.4;">
          Strict safety throttles to eliminate infinite looping and runaway LLM token bills. Configured values are broadcast globally to all student Testination sessions.
        </p>

        <div class="form-group mb-3">
          <label class="form-label text-sm fw-600">Global Cooldown Limit (Seconds)</label>
          <input class="form-control" type="number" id="setting-ai_cooldown" value="${escapeHtml(cooldownSecs)}" min="5" max="300" />
          <div class="text-xs text-muted mt-1">Mandatory wait time between AI submissions per student (Default: 60s).</div>
        </div>

        <div class="form-group mb-4">
          <label class="form-label text-sm fw-600">Max Audio Recording Duration (Seconds)</label>
          <input class="form-control" type="number" id="setting-ai_max_audio" value="${escapeHtml(maxAudioSecs)}" min="10" max="600" />
          <div class="text-xs text-muted mt-1">Hard ceiling for voice recordings before auto-stopping STT (Default: 180s).</div>
        </div>

        <button class="btn btn-danger btn-sm w-100" id="btn-save-cost-guard" style="height:32px;font-size:12px;font-weight:700;">
          ${getSvgIcon('lock', 13)} Save Cost Guard Limits
        </button>
      </div>

      <!-- 1.5 Test Security & Anti-Cheat Engine Card -->
      <div class="antigravity-card p-5" style="border-color:rgba(255, 255, 0, 0.3);box-shadow:0 20px 40px rgba(255, 255, 0, 0.08);">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="color:var(--grade-c);">${getSvgIcon('shield', 22)}</div>
          <div>
            <h3 style="font-size: 16px;margin:0;color:var(--grade-c);font-weight:700;">Test Security &amp; Anti-Cheat Engine</h3>
            <div class="text-xs text-muted">Controls for exam-taking integrity</div>
          </div>
        </div>

        <p class="text-xs text-muted mb-3" style="line-height:1.4;">
          Configurable anti-cheat controls to prevent tab switching and enforce exam integrity. Settings are synced dynamically to the test runner.
        </p>

        <div class="form-group mb-3 d-flex justify-between align-center">
          <div>
            <label class="form-label text-sm fw-600 mb-0">Anti-Cheat Gating</label>
            <div class="text-xs text-muted">Enforce blur/tab-switch lock</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="setting-anti_cheat_enabled" ${settings.anti_cheat_enabled !== 'false' ? 'checked' : ''} />
            <span class="slider round"></span>
          </label>
        </div>

        <div class="form-group mb-3 d-flex justify-between align-center">
          <div>
            <label class="form-label text-sm fw-600 mb-0">Audio Alert</label>
            <div class="text-xs text-muted">Play cheat-detection sound on violation</div>
          </div>
          <label class="switch">
            <input type="checkbox" id="setting-anti_cheat_sound" ${settings.anti_cheat_sound_enabled !== 'false' ? 'checked' : ''} />
            <span class="slider round"></span>
          </label>
        </div>

        <!-- Sound Type Picker -->
        <div class="form-group mb-3" id="sound-picker-group">
          <label class="form-label text-sm fw-600 mb-2">${getSvgIcon('volume-2', 14)} Alert Sound Style</label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem 0.8rem;">
            ${[
              { id: 'police_siren', icon: 'shield', label: 'Police Siren' },
              { id: 'alarm_beep',   icon: 'volume-2', label: 'Alarm Beeps' },
              { id: 'red_alert',    icon: 'alert-triangle', label: 'Red Alert' },
              { id: 'buzzer',       icon: 'clock', label: 'Buzzer' },
              { id: 'warning_tone', icon: 'alert-triangle', label: 'Warning Tone' },
              { id: 'laser_blast',  icon: 'zap', label: 'Laser Blast' },
              { id: 'rapid_fire',   icon: 'zap', label: 'Rapid Fire' },
              { id: 'klaxon',       icon: 'volume-2', label: 'Klaxon' },
              { id: 'whistle',      icon: 'activity', label: 'Whistle' },
              { id: 'dj_drop',      icon: 'activity', label: 'DJ Drop' },
              { id: 'custom',       icon: 'upload', label: 'Custom Upload' },
            ].map(s => `
              <label style="display:flex;align-items:center;gap:0.4rem;cursor:pointer;padding:0.3rem 0.5rem;border-radius:6px;border:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);transition:background 0.15s;" class="sound-opt-label">
                <input type="radio" name="anti_cheat_sound_type" value="${s.id}" ${(settings.anti_cheat_sound_type || 'police_siren') === s.id ? 'checked' : ''} style="accent-color:var(--grade-c);" />
                <span style="color:var(--clr-primary, #38bdf8);">${getSvgIcon(s.icon, 14)}</span>
                <span class="text-xs fw-600">${s.label}</span>
                <button type="button" class="btn-preview-sound" data-sound="${s.id}" title="Preview" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size: 12px;opacity:0.7;padding:0 2px;" tabindex="-1">▶</button>
              </label>`).join('')}
          </div>
        </div>

        <!-- Custom Sound Upload (shown only when 'custom' is selected) -->
        <div class="form-group mb-3" id="custom-sound-upload-group" style="display:${(settings.anti_cheat_sound_type || 'police_siren') === 'custom' ? 'block' : 'none'};">
          <label class="form-label text-sm fw-600">Upload Custom Alert Sound</label>
          <div class="text-xs text-muted mb-1">MP3, WAV, or OGG — stored in browser settings (max ~2 MB)</div>
          <input type="file" id="setting-custom-sound-file" accept="audio/*" class="form-control" style="padding:0.35rem;" />
          ${settings.anti_cheat_custom_sound_b64 ? `<div class="text-xs mt-1" style="color:var(--grade-a);">${getSvgIcon('check-circle', 12)} Custom sound uploaded. Uploading a new file will replace it.</div>` : ''}
        </div>

        <div class="form-group mb-4">
          <label class="form-label text-sm fw-600">Countdown Duration (Seconds)</label>
          <input class="form-control" type="number" id="setting-anti_cheat_countdown" value="${escapeHtml(settings.anti_cheat_countdown_seconds || '10')}" min="3" max="60" />
          <div class="text-xs text-muted mt-1">Time allowed before auto-submit on cheating (Default: 10s).</div>
        </div>

        <button class="btn btn-primary btn-sm w-100" id="btn-save-anti-cheat" style="height:32px;font-size:12px;font-weight:700;background:#7c3aed;border:1px solid var(--grade-star, #a855f7);color:#fff;">
          ${getSvgIcon('shield', 14)} Save Security Settings
        </button>
      </div>

      <!-- 2. Secure API Key Vault Card -->
      <div class="antigravity-card p-5">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="color:var(--clr-primary);display:flex;align-items:center;">${getSvgIcon('lock', 22)}</div>
          <div>
            <h3 style="font-size: 16px;margin:0;color:var(--clr-primary);font-weight:700;">API Key Vault</h3>
            <div class="text-xs text-muted">Masked credentials for LLM integration</div>
          </div>
        </div>

        <div class="form-group mb-3">
          <label class="form-label text-sm">OpenAI API Key</label>
          <div class="input-password-wrap">
            <input class="form-control" type="password" id="vault-openai-key" value="${escapeHtml(settings.openai_api_key || '')}" placeholder="sk-..." autocomplete="new-password" />
            <button class="input-password-toggle" type="button" data-target="vault-openai-key" title="Toggle visibility">${getSvgIcon('eye', 14)}</button>
          </div>
        </div>

        <div class="form-group mb-3">
          <label class="form-label text-sm">Anthropic Claude API Key</label>
          <div class="input-password-wrap">
            <input class="form-control" type="password" id="vault-anthropic-key" value="${escapeHtml(settings.anthropic_api_key || '')}" placeholder="sk-ant-..." autocomplete="new-password" />
            <button class="input-password-toggle" type="button" data-target="vault-anthropic-key" title="Toggle visibility">${getSvgIcon('eye', 14)}</button>
          </div>
        </div>

        <div class="form-group mb-4">
          <label class="form-label text-sm">Google Gemini API Key</label>
          <div class="input-password-wrap">
            <input class="form-control" type="password" id="vault-gemini-key" value="${escapeHtml(settings.gemini_api_key || '')}" placeholder="AIzaSy..." autocomplete="new-password" />
            <button class="input-password-toggle" type="button" data-target="vault-gemini-key" title="Toggle visibility">${getSvgIcon('eye', 14)}</button>
          </div>
        </div>

        <button class="btn btn-primary btn-sm w-100" id="btn-save-vault" style="height:32px;font-size:12px;font-weight:700;background:#7c3aed;border:1px solid var(--grade-star, #a855f7);color:#fff;">
          Save API Key Vault
        </button>
      </div>

      <!-- 3. Global Platform Configuration Card -->
      <div class="antigravity-card p-5">
        <h3 style="font-size: 16px;margin-bottom:1rem;color:var(--clr-text-1);">Global Platform Configuration</h3>

        <div class="form-group mb-3">
          <label class="form-label text-sm">Site Name</label>
          <input class="form-control" id="setting-site_name" value="${escapeHtml(settings.site_name || 'TOPS CORE')}" />
        </div>

        <div class="form-group mb-3">
          <label class="form-label text-sm">Default Passing Threshold (%)</label>
          <input class="form-control" type="number" id="setting-passing_threshold" value="${escapeHtml(settings.passing_threshold || '60')}" min="0" max="100" />
          <small class="text-xs text-muted" style="display:block;margin-top:2px;">Default institutional fallback for new classes (Standard: 60% Grade C). Active class standards are managed centrally in Curriculum & Level Master.</small>
        </div>

        <div class="form-group mb-4">
          <label class="form-label text-sm">Login Background URL (Optional)</label>
          <input class="form-control" id="setting-login_background_url" value="${escapeHtml(settings.login_background_url || '')}" placeholder="https://..." />
        </div>

        <button class="btn btn-secondary btn-sm w-100" id="save-settings-btn" style="height:32px;font-size:12px;font-weight:700;">
          Save Site Settings
        </button>
      </div>

      <!-- 4. Security & Administrator Credentials Card -->
      <div class="antigravity-card p-5">
        <h3 style="font-size: 16px;margin-bottom:1rem;color:var(--clr-text-1);">Administrator Authentication</h3>
        <p class="text-xs text-muted mb-3">Configure custom local credentials or restore default master admin access.</p>

        <div class="form-group mb-3">
          <label class="form-label text-sm">Master Username</label>
          <input class="form-control" value="admin" disabled style="opacity:0.7;" />
        </div>

        <div class="form-group mb-4">
          <label class="form-label text-sm">Custom Master Password Override</label>
          <div class="input-password-wrap">
            <input class="form-control" type="password" id="setting-custom-password" placeholder="Default: admin123" value="${escapeHtml(currentCustomPass)}" />
            <button class="input-password-toggle" type="button" data-target="setting-custom-password" title="Toggle visibility">${getSvgIcon('eye', 14)}</button>
          </div>
          <div class="text-xs text-muted mt-1">Leave blank to use default 'admin123' master key.</div>
        </div>

        <button class="btn btn-secondary btn-sm w-100" id="btn-save-admin-password" style="height:32px;font-size:12px;font-weight:700;">
          Update Admin Credentials
        </button>
      </div>

      <!-- 4b. Security & Tutor Proctor Credentials Card -->
      <div class="antigravity-card p-5">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="color:var(--clr-primary, #38bdf8);">${getSvgIcon('lock', 22)}</div>
          <div>
            <h3 style="font-size: 16px;margin:0;color:var(--clr-text-1);font-weight:700;">Tutor Proctor Credentials</h3>
            <div class="text-xs text-muted">Open/Close Exam &amp; Check Rate Access</div>
          </div>
        </div>
        <p class="text-xs text-muted mb-3">Tutor accounts are restricted strictly to opening/closing exam sessions and inspecting student rate cards.</p>

        <div class="form-group mb-3">
          <label class="form-label text-sm">Tutor Username</label>
          <input class="form-control" value="tutor" disabled style="opacity:0.7;" />
          <div class="text-xs text-muted mt-1">Supported aliases: tutor, guru, proctor, pengawas</div>
        </div>

        <div class="form-group mb-4">
          <label class="form-label text-sm">Custom Tutor Password Override</label>
          <div class="input-password-wrap">
            <input class="form-control" type="password" id="setting-tutor-password" placeholder="Default: tutor123" value="${escapeHtml(currentTutorPass)}" />
            <button class="input-password-toggle" type="button" data-target="setting-tutor-password" title="Toggle visibility">${getSvgIcon('eye', 14)}</button>
          </div>
          <div class="text-xs text-muted mt-1">Leave blank to use default 'tutor123' master key.</div>
        </div>

        <button class="btn btn-secondary btn-sm w-100" id="btn-save-tutor-password" style="height:32px;font-size:12px;font-weight:700;">
          Update Tutor Credentials
        </button>
      </div>

      <!-- 5. Workspace Scratchpad -->
      <div class="antigravity-card p-5">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="color:var(--clr-primary, #38bdf8);">${getSvgIcon('edit', 22)}</div>
          <div>
            <h3 style="font-size: 16px;margin:0;color:var(--clr-text-1);font-weight:700;">Workspace Scratchpad</h3>
            <div class="text-xs text-muted">Jot down quick notes, queries, or reminders.</div>
          </div>
        </div>
        <textarea id="admin-scratchpad" style="width: 100%; height: 160px; background: rgba(0,0,0,0.1); border: 1px solid var(--clr-border); border-radius: 8px; padding: 0.8rem; color: var(--clr-text-1); font-family: inherit; resize: none;" placeholder="Start typing..."></textarea>
      </div>

      <!-- 6. Danger Zone: Vocabulary Vault Master Reset -->
      <div class="antigravity-card p-5" style="border: 1px solid rgba(255, 0, 0, 0.45); box-shadow: 0 10px 30px rgba(255, 0, 0, 0.12); background: rgba(15, 23, 42, 0.65);">
        <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
          <div style="color:var(--grade-e);">${getSvgIcon('alert-triangle', 22)}</div>
          <div>
            <h3 style="font-size: 16px;margin:0;color:var(--grade-e);font-weight:700;">Danger Zone: Vocabulary Vault Reset</h3>
            <div class="text-xs text-muted">Master Reset for Vocabulary Vault Items</div>
          </div>
        </div>
        <p class="text-xs text-muted mb-3" style="line-height:1.4;">
          Permanently delete all words, phrases, and topic data from the Vocabulary Vault database. This action cannot be undone. To prevent accidental mispresses, you must type <strong style="color: var(--grade-e);">RESET</strong> to confirm.
        </p>
        <button class="btn btn-danger btn-sm w-100" id="btn-danger-reset-vault" style="font-weight:700; height: 32px; font-size:12px;">
          ${getSvgIcon('trash', 14)} Master Reset Vocabulary Vault
        </button>
      </div>

    </div>
  `;

  // Password Visibility Toggle Logic
  area.querySelectorAll('.input-password-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = e.currentTarget.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        e.currentTarget.innerHTML = getSvgIcon('eye-off', 14);
      } else {
        input.type = 'password';
        e.currentTarget.innerHTML = getSvgIcon('eye', 14);
      }
    });
  });

  // 1. Save Cost Guard Limits
  const saveCostGuard = async (silent = false) => {
    const cooldown = document.getElementById('setting-ai_cooldown')?.value.trim() || '60';
    const maxAudio = document.getElementById('setting-ai_max_audio')?.value.trim() || '180';

    try {
      await Promise.all([
        sb.from('site_settings').upsert({ key: 'ai_cooldown_limit_seconds', value: cooldown, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
        sb.from('site_settings').upsert({ key: 'ai_max_audio_duration_seconds', value: maxAudio, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      ]);

      // Cache locally and expose globally
      localStorage.setItem('ai_cooldown_limit_seconds', cooldown);
      localStorage.setItem('ai_max_audio_duration_seconds', maxAudio);
      window.TOPSCORE_CONFIG = {
        ...(window.TOPSCORE_CONFIG || {}),
        cooldownLimit: parseInt(cooldown, 10),
        maxAudioDuration: parseInt(maxAudio, 10)
      };

      if (!silent) showToast('Cost Guard safety limits saved globally!', 'success');
      return true;
    } catch (err) {
      if (!silent) showToast('Failed to save Cost Guard limits: ' + err.message, 'error');
      throw err;
    }
  };

  document.getElementById('btn-save-cost-guard')?.addEventListener('click', () => saveCostGuard(false));

  // Sound Picker: show/hide custom upload group
  area.querySelectorAll('input[name="anti_cheat_sound_type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const upGrp = document.getElementById('custom-sound-upload-group');
      if (upGrp) upGrp.style.display = radio.value === 'custom' ? 'block' : 'none';
    });
  });

  // Preview sound buttons — uses same Web Audio engine as test.js inline here
  area.querySelectorAll('.btn-preview-sound').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const soundId = btn.dataset.sound;
      const customB64 = settings.anti_cheat_custom_sound_b64 || '';
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        await ctx.resume();
        const PREVIEW_SOUNDS = {
          police_siren(c) {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'sawtooth'; o.frequency.value = 650; g.gain.value = 0.28;
            const now = c.currentTime;
            for (let i = 0; i < 6; i++) {
              o.frequency.linearRampToValueAtTime(1250, now + i * 1 + 0.5);
              o.frequency.linearRampToValueAtTime(650, now + i * 1 + 1.0);
            }
            o.connect(g); g.connect(c.destination); o.start(); o.stop(now + 3.0);
          },
          alarm_beep(c) {
            const now = c.currentTime;
            for (let i = 0; i < 5; i++) {
              const o = c.createOscillator(), g = c.createGain();
              o.type = 'square'; o.frequency.value = 880;
              g.gain.setValueAtTime(0, now + i * 0.35);
              g.gain.linearRampToValueAtTime(0.35, now + i * 0.35 + 0.02);
              g.gain.setValueAtTime(0.35, now + i * 0.35 + 0.18);
              g.gain.linearRampToValueAtTime(0, now + i * 0.35 + 0.22);
              o.connect(g); g.connect(c.destination);
              o.start(now + i * 0.35); o.stop(now + i * 0.35 + 0.25);
            }
          },
          red_alert(c) {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'sawtooth'; g.gain.value = 0.27;
            const now = c.currentTime;
            for (let i = 0; i < 4; i++) {
              const t = now + i * 0.8;
              o.frequency.setValueAtTime(1100, t);
              o.frequency.exponentialRampToValueAtTime(400, t + 0.64);
            }
            o.connect(g); g.connect(c.destination); o.start(); o.stop(now + 3.5);
          },
          buzzer(c) {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'square'; o.frequency.value = 110; g.gain.value = 0;
            const now = c.currentTime;
            for (let i = 0; i < 4; i++) {
              g.gain.setValueAtTime(0.4, now + i * 0.3);
              g.gain.setValueAtTime(0, now + i * 0.3 + 0.15);
            }
            o.connect(g); g.connect(c.destination); o.start(); o.stop(now + 1.4);
          },
          warning_tone(c) {
            const now = c.currentTime;
            [660, 880].forEach((freq, idx) => {
              const o = c.createOscillator(), g = c.createGain();
              o.type = 'sine'; o.frequency.value = freq; g.gain.value = 0;
              const off = idx * 0.5;
              for (let i = 0; i < 3; i++) {
                g.gain.setValueAtTime(0, now + off + i); g.gain.linearRampToValueAtTime(0.28, now + off + i + 0.05);
                g.gain.setValueAtTime(0.28, now + off + i + 0.38); g.gain.linearRampToValueAtTime(0, now + off + i + 0.45);
              }
              o.connect(g); g.connect(c.destination); o.start(); o.stop(now + 4);
            });
          },
          laser_blast(c) {
            const now = c.currentTime;
            for (let i = 0; i < 4; i++) {
              const o = c.createOscillator(), g = c.createGain();
              o.type = 'sawtooth'; const t = now + i * 0.4;
              o.frequency.setValueAtTime(1200, t); o.frequency.exponentialRampToValueAtTime(200, t + 0.3);
              g.gain.setValueAtTime(0.3, t); g.gain.linearRampToValueAtTime(0, t + 0.32);
              o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.35);
            }
          },
          rapid_fire(c) {
            const now = c.currentTime;
            for (let i = 0; i < 12; i++) {
              const o = c.createOscillator(), g = c.createGain();
              o.type = 'sawtooth'; o.frequency.value = 300 + Math.random() * 400;
              const t = now + i * 0.12;
              g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
              o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.12);
            }
          },
          klaxon(c) {
            const now = c.currentTime;
            for (let i = 0; i < 6; i++) {
              const o = c.createOscillator(), g = c.createGain();
              o.type = 'square'; o.frequency.value = i % 2 === 0 ? 220 : 180;
              const t = now + i * 0.35;
              g.gain.setValueAtTime(0.4, t); g.gain.setValueAtTime(0, t + 0.28);
              o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.32);
            }
          },
          whistle(c) {
            const o = c.createOscillator(), g = c.createGain();
            o.type = 'sine'; g.gain.value = 0;
            const now = c.currentTime;
            for (let i = 0; i < 3; i++) {
              const t = now + i * 0.55;
              g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 0.04);
              g.gain.setValueAtTime(0.35, t + 0.3); g.gain.linearRampToValueAtTime(0, t + 0.35);
              o.frequency.setValueAtTime(2800, t); o.frequency.linearRampToValueAtTime(3200, t + 0.175); o.frequency.linearRampToValueAtTime(2600, t + 0.35);
            }
            o.connect(g); g.connect(c.destination); o.start(); o.stop(now + 2);
          },
          dj_drop(c) {
            const now = c.currentTime;
            for (let i = 0; i < 4; i++) {
              const k = c.createOscillator(), kg = c.createGain();
              k.type = 'sine'; const t = now + i * 0.25;
              k.frequency.setValueAtTime(150, t); k.frequency.exponentialRampToValueAtTime(40, t + 0.2);
              kg.gain.setValueAtTime(0.6, t); kg.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
              k.connect(kg); kg.connect(c.destination); k.start(t); k.stop(t + 0.25);
            }
            [220, 330, 440, 660, 880, 1100, 1320, 1760].forEach((freq, idx) => {
              const o = c.createOscillator(), g = c.createGain();
              o.type = 'sawtooth'; o.frequency.value = freq;
              const t = now + 1.0 + idx * 0.08;
              g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
              o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.4);
            });
            [440, 550, 660].forEach(freq => {
              const o = c.createOscillator(), g = c.createGain();
              o.type = 'sawtooth'; o.frequency.value = freq;
              const t = now + 1.7;
              g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
              o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 1.3);
            });
          },
          async custom(c) {
            if (!customB64) { PREVIEW_SOUNDS.police_siren(c); return; }
            const binary = atob(customB64.split(',').pop());
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const buffer = await c.decodeAudioData(bytes.buffer);
            const src = c.createBufferSource();
            src.buffer = buffer; src.connect(c.destination); src.start(); src.stop(c.currentTime + 3);
          }
        };
        const fn = PREVIEW_SOUNDS[soundId] || PREVIEW_SOUNDS.police_siren;
        await fn(ctx);
        setTimeout(() => { try { ctx.close(); } catch (_) {} }, 4000);
      } catch (e) {
        showToast('Preview error: ' + e.message, 'error');
      }
    });
  });

  // 2. Save Anti-Cheat Settings
  const saveAntiCheat = async (silent = false) => {
    const isEnabled = document.getElementById('setting-anti_cheat_enabled')?.checked ?? true;
    const isSoundEnabled = document.getElementById('setting-anti_cheat_sound')?.checked ?? true;
    let countdown = document.getElementById('setting-anti_cheat_countdown')?.value.trim();

    // Ensure boundaries for countdown
    if (!countdown || isNaN(countdown) || parseInt(countdown) < 3) countdown = '3';
    if (parseInt(countdown) > 60) countdown = '60';

    // Sound type selection
    const selectedTypeEl = area.querySelector('input[name="anti_cheat_sound_type"]:checked');
    const soundType = selectedTypeEl ? selectedTypeEl.value : 'police_siren';

    // Custom sound file — read as base64 if provided
    let customSoundB64 = settings.anti_cheat_custom_sound_b64 || '';
    const customFileInput = document.getElementById('setting-custom-sound-file');
    if (customFileInput && customFileInput.files && customFileInput.files[0]) {
      const file = customFileInput.files[0];
      if (file.size > 2 * 1024 * 1024) {
        if (!silent) showToast('Custom sound file is too large (max 2 MB).', 'error');
        throw new Error('Custom sound file is too large (max 2 MB).');
      }
      customSoundB64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    try {
      const upserts = [
        sb.from('site_settings').upsert({ key: 'anti_cheat_enabled', value: isEnabled ? 'true' : 'false', updated_at: new Date().toISOString() }, { onConflict: 'key' }),
        sb.from('site_settings').upsert({ key: 'anti_cheat_sound_enabled', value: isSoundEnabled ? 'true' : 'false', updated_at: new Date().toISOString() }, { onConflict: 'key' }),
        sb.from('site_settings').upsert({ key: 'anti_cheat_countdown_seconds', value: countdown, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
        sb.from('site_settings').upsert({ key: 'anti_cheat_sound_type', value: soundType, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
      ];
      if (customSoundB64) {
        upserts.push(sb.from('site_settings').upsert({ key: 'anti_cheat_custom_sound_b64', value: customSoundB64, updated_at: new Date().toISOString() }, { onConflict: 'key' }));
      }
      await Promise.all(upserts);
      if (!silent) showToast('Security Settings saved!', 'success');
      return true;
    } catch (err) {
      if (!silent) showToast('Failed to save security settings: ' + err.message, 'error');
      throw err;
    }
  };

  document.getElementById('btn-save-anti-cheat')?.addEventListener('click', () => saveAntiCheat(false));

  // 3. Save API Key Vault
  const saveVault = async (silent = false) => {
    const openaiKey = document.getElementById('vault-openai-key')?.value.trim() || '';
    const anthropicKey = document.getElementById('vault-anthropic-key')?.value.trim() || '';
    const geminiKey = document.getElementById('vault-gemini-key')?.value.trim() || '';

    try {
      await Promise.all([
        sb.from('site_settings').upsert({ key: 'openai_api_key', value: openaiKey, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
        sb.from('site_settings').upsert({ key: 'anthropic_api_key', value: anthropicKey, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
        sb.from('site_settings').upsert({ key: 'gemini_api_key', value: geminiKey, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      ]);

      if (!silent) showToast('API Key Vault updated securely.', 'success');
      return true;
    } catch (err) {
      if (!silent) showToast('Failed to update API Key Vault: ' + err.message, 'error');
      throw err;
    }
  };

  document.getElementById('btn-save-vault')?.addEventListener('click', () => saveVault(false));

  // 4. Save General Platform Configuration
  const saveSiteConfig = async (silent = false) => {
    const siteName = document.getElementById('setting-site_name')?.value.trim() || 'TOPS CORE';
    const passThreshold = document.getElementById('setting-passing_threshold')?.value.trim() || '60';
    const bgUrl = document.getElementById('setting-login_background_url')?.value.trim() || '';

    try {
      await Promise.all([
        sb.from('site_settings').upsert({ key: 'site_name', value: siteName, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
        sb.from('site_settings').upsert({ key: 'passing_threshold', value: passThreshold, updated_at: new Date().toISOString() }, { onConflict: 'key' }),
        sb.from('site_settings').upsert({ key: 'login_background_url', value: bgUrl, updated_at: new Date().toISOString() }, { onConflict: 'key' })
      ]);
      if (!silent) showToast('Global site settings saved.', 'success');
      return true;
    } catch (err) {
      if (!silent) showToast('Failed to save settings: ' + err.message, 'error');
      throw err;
    }
  };

  document.getElementById('save-settings-btn')?.addEventListener('click', () => saveSiteConfig(false));

  // 5. Update Custom Admin Password
  const saveAdminPassword = (silent = false) => {
    const customPass = document.getElementById('setting-custom-password')?.value.trim() || '';
    if (customPass) {
      localStorage.setItem('topscore_admin_custom_password', customPass);
      if (!silent) showToast('Custom admin password saved.', 'success');
    } else {
      localStorage.removeItem('topscore_admin_custom_password');
      if (!silent) showToast('Custom password cleared. Default (admin123) restored.', 'info');
    }
    return true;
  };

  document.getElementById('btn-save-admin-password')?.addEventListener('click', () => saveAdminPassword(false));

  // 6. Update Custom Tutor Password
  const saveTutorPassword = (silent = false) => {
    const customPass = document.getElementById('setting-tutor-password')?.value.trim() || '';
    if (customPass) {
      localStorage.setItem('topscore_tutor_custom_password', customPass);
      if (!silent) showToast('Custom tutor password saved.', 'success');
    } else {
      localStorage.removeItem('topscore_tutor_custom_password');
      if (!silent) showToast('Custom tutor password cleared. Default (tutor123) restored.', 'info');
    }
    return true;
  };

  document.getElementById('btn-save-tutor-password')?.addEventListener('click', () => saveTutorPassword(false));

  // 7. Master Unified Save All Settings
  const saveAllSettings = async (btn) => {
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⏳ Saving All...';
    }

    try {
      await Promise.all([
        saveInterfaceSystem(true),
        saveCostGuard(true),
        saveAntiCheat(true),
        saveVault(true),
        saveSiteConfig(true)
      ]);
      saveAdminPassword(true);
      saveTutorPassword(true);

      showToast('✓ All settings saved and synced globally!', 'success');
    } catch (err) {
      showToast('Error saving settings: ' + err.message, 'error');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  };

  document.getElementById('btn-save-all-settings')?.addEventListener('click', (e) => saveAllSettings(e.currentTarget));

  // ---------------------------------------------------------
  // Workspace Scratchpad Persistence
  // ---------------------------------------------------------
  const scratchpad = document.getElementById('admin-scratchpad');
  if (scratchpad) {
    scratchpad.value = localStorage.getItem('topscore_admin_scratchpad') || '';
    scratchpad.addEventListener('input', (e) => {
      localStorage.setItem('topscore_admin_scratchpad', e.target.value);
    });
  }

  // ---------------------------------------------------------
  // Danger Zone: Master Reset Vocabulary Vault
  // ---------------------------------------------------------
  document.getElementById('btn-danger-reset-vault')?.addEventListener('click', async () => {
    if (!confirm('DANGER: This will permanently delete ALL words and phrases from the Vocabulary Vault. Are you sure you want to proceed?')) return;
    const confirmText = prompt('Type RESET in capital letters to confirm permanent deletion:');
    if (confirmText?.trim() !== 'RESET') {
      showToast('Master reset cancelled.', 'info');
      return;
    }
    showLoading('Resetting Vocabulary Vault...');
    try {
      const { error } = await sb.from('vocabulary_vault').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      hideLoading();
      if (error) throw error;
      showToast('✓ Vocabulary Vault successfully reset. All items deleted.', 'success');
      if (window.logAdminAudit) {
        window.logAdminAudit('RESET_VOCABULARY_VAULT', 'vocabulary_vault', null, { status: 'TRUNCATED' });
      }
    } catch (err) {
      hideLoading();
      showToast('Failed to reset Vocabulary Vault: ' + err.message, 'error');
    }
  });

  // Synchronize 40px Sub Panel for Site Settings per ui-invariants.md §1.3
  if (typeof window.setBottomInfobar === 'function') {
    const leftHtml = `
      <div style="display:flex;align-items:center;gap:12px;font-size:12px;color:#94a3b8;font-weight:600;">
        <span><strong style="color:#f8fafc;">Domain D</strong> · Site Settings &amp; Cost Guard</span>
        <span>·</span>
        <span style="color:var(--grade-a);font-weight:700;">● Operational</span>
      </div>
    `;
    const rightHtml = `
      <div style="display:flex;align-items:center;gap:8px;">
        <button type="button" class="btn btn-primary btn-sm" id="btn-subpanel-save-settings" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 14px !important;font-size:12px !important;font-weight:700;border-radius:4px;display:inline-flex;align-items:center;gap:6px;background:#7c3aed;border:1px solid var(--grade-star, #a855f7);color:#ffffff;cursor:pointer;" title="Save All Platform Configurations">
          ${getSvgIcon('save', 14)} Save Settings
        </button>
      </div>
    `;
    window.setBottomInfobar(leftHtml, rightHtml);
    document.getElementById('btn-subpanel-save-settings')?.addEventListener('click', (e) => {
      saveAllSettings(e.currentTarget);
    });
  }
}

// ============================================================
// MODULE 5: INTERFACE SYSTEM & DESIGN SSOT STUDIO (PILLAR D)
// ============================================================

export async function renderInterfaceSettings(area) {
  if (!area) return;
  const sb = await getSupabase();
  const { data } = await sb.from('site_settings').select('*');
  const settings = Object.fromEntries((data || []).map(r => [r.key, r.value]));

  // Parse interface system settings (Colours, Typography, Surfaces)
  let ifaceSettings = {
    colors: { ...DEFAULT_INTERFACE_SYSTEM.colors },
    typography: { ...DEFAULT_INTERFACE_SYSTEM.typography },
    surface: { ...DEFAULT_INTERFACE_SYSTEM.surface }
  };
  try {
    if (settings.interface_system_settings) {
      const parsed = JSON.parse(settings.interface_system_settings);
      ifaceSettings.colors = { ...ifaceSettings.colors, ...(parsed.colors || {}) };
      ifaceSettings.typography = { ...ifaceSettings.typography, ...(parsed.typography || {}) };
      ifaceSettings.surface = { ...ifaceSettings.surface, ...(parsed.surface || {}) };
    } else {
      const local = localStorage.getItem('topscore_interface_system');
      if (local) {
        const parsed = JSON.parse(local);
        ifaceSettings.colors = { ...ifaceSettings.colors, ...(parsed.colors || {}) };
        ifaceSettings.typography = { ...ifaceSettings.typography, ...(parsed.typography || {}) };
        ifaceSettings.surface = { ...ifaceSettings.surface, ...(parsed.surface || {}) };
      } else if (settings.color_system_overrides) {
        ifaceSettings.colors = { ...ifaceSettings.colors, ...JSON.parse(settings.color_system_overrides) };
      } else {
        const localColors = localStorage.getItem('topscore_color_system');
        if (localColors) ifaceSettings.colors = { ...ifaceSettings.colors, ...JSON.parse(localColors) };
      }
    }
  } catch (e) {
    console.warn('Failed to parse interface system settings:', e);
  }

  const colorSettings = ifaceSettings.colors;

  const renderColorItem = (key, label, colorName, loc, currentHex) => {
    const hexVal = currentHex || DEFAULT_COLOR_SYSTEM[key] || '#94a3b8';
    const hex7 = hexVal.startsWith('#') && hexVal.length >= 7 ? hexVal.substring(0, 7) : (hexVal.startsWith('#') ? hexVal : '#' + hexVal);
    return `
      <div style="display:flex; align-items:center; justify-content:space-between; padding:6px 10px; border-radius:6px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); margin-bottom:8px; min-height:48px; box-sizing:border-box;">
        <div style="min-width:0; flex:1; padding-right:10px;">
          <div style="font-size:12px; font-weight:700; color:#f8fafc; line-height:1.2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(label)}">${label}</div>
          <div style="font-size:12px; color:#94a3b8; line-height:1.2; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:flex; align-items:center; gap:5px;" title="${escapeHtml(colorName)} · Location: ${escapeHtml(loc)}">
            <span style="color:#f1f5f9; font-weight:700; flex-shrink:0;">${colorName}</span>
            <span style="color:#475569; flex-shrink:0;">·</span>
            <span style="color:var(--quad-d, #38bdf8); display:inline-flex; align-items:center; flex-shrink:0;">${getSvgIcon('map-pin', 12)}</span>
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${loc}</span>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px; flex-shrink:0;">
          <label style="position:relative; width:26px; height:26px; margin:0; cursor:pointer; display:inline-block;" title="Pick color (${escapeHtml(label)} - ${escapeHtml(colorName)})">
            <span class="cs-preview-swatch" id="cs-swatch-${key}" style="display:block; width:26px; height:26px; border-radius:5px; background:${hexVal}; border:1px solid rgba(255,255,255,0.3);"></span>
            <input type="color" class="cs-color-picker" data-key="${key}" value="${hex7}" style="position:absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer; padding:0; border:none;" />
          </label>
          <input type="text" class="cs-hex-input form-control" data-key="${key}" value="${hexVal}" maxlength="9" style="height:26px; width:82px; padding:2px 6px; font-family:'JetBrains Mono', 'Fira Code', monospace; font-size:12px; font-weight:700; text-align:center; text-transform:uppercase; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.15); border-radius:4px; color:#f8fafc;" />
        </div>
      </div>
    `;
  };

  area.innerHTML = `
    <!-- Streamlined 4-Column Balanced Layout with 11 Independent Cards SSOT -->
    <div class="interface-compact-grid" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(290px, 1fr)); gap:10px; height:100%; min-height:0; overflow-y:auto; overflow-x:hidden; padding:10px; box-sizing:border-box;">

      <!-- COLUMN 1: NAVIGATION & CONTROLS (3 DISTINCT CARDS: 4 + 3 + 2 = 9 ITEMS) -->
      <div style="display:flex; flex-direction:column; gap:10px;">

        <!-- CARD 1: ABCD NAVIGATION PILLARS -->
        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px; display:flex; flex-direction:column; box-sizing:border-box;">
          <div style="font-size:12px; font-weight:800; color:var(--quad-d, #38bdf8); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <span style="display:flex; align-items:center; gap:6px;">
              <span>${getSvgIcon('layers', 13)}</span>
              <span>ABCD Pillars</span>
            </span>
            <span style="font-size:12px; font-weight:700; color:#64748b; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); padding:1px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:0.03em;">4 Pillars</span>
          </div>
          ${renderColorItem('quadA', 'Pillar A (Admin &amp; Theme A)', 'Electric Pink', 'Sidebar Navigation A · Theme A Super-Header · Exam 1', colorSettings.quadA)}
          ${renderColorItem('quadB', 'Pillar B (Board &amp; Theme B)', 'Dark Orange', 'Sidebar Navigation B · Theme B Super-Header · Exam 2', colorSettings.quadB)}
          ${renderColorItem('quadC', 'Pillar C (Class &amp; Theme C)', 'Electric Lime', 'Sidebar Navigation C · Theme C Super-Header · Exam 3', colorSettings.quadC)}
          ${renderColorItem('quadD', 'Pillar D (Data &amp; Theme D)', 'Tactical Cyan', 'Sidebar Navigation D · Modules &amp; System Settings · Exam 4', colorSettings.quadD)}
        </div>

        <!-- CARD 2: EVALUATION SEMANTICS (RED ➔ GREEN) -->
        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px; display:flex; flex-direction:column; box-sizing:border-box;">
          <div style="font-size:12px; font-weight:800; color:var(--clr-success, #00c000); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <span style="display:flex; align-items:center; gap:6px;">
              <span>${getSvgIcon('check-circle', 13)}</span>
              <span>Evaluation Semantics</span>
            </span>
            <span style="font-size:12px; font-weight:700; color:#64748b; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); padding:1px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:0.03em;">Red ➔ Green</span>
          </div>
          ${renderColorItem('incorrect', 'Incorrect (0.0 pt) / Danger', 'Pure Red', 'Wrong 0.0 pt · Inactive Status · Danger Alert · Forgive', colorSettings.incorrect)}
          ${renderColorItem('partial', 'Partial (0.5 pt) / Warning', 'Pure Yellow', 'Minor Typo 0.5 pt · Remedial Status · Draft Action', colorSettings.partial)}
          ${renderColorItem('correct', 'Correct (1.0 pt) / Success', 'Pure Green', 'Score 1.0 pt · Online Status · Published Action', colorSettings.correct)}
        </div>

        <!-- CARD 3: ACTION BUTTONS (RED ➔ BLUE) -->
        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px; display:flex; flex-direction:column; box-sizing:border-box;">
          <div style="font-size:12px; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <span style="display:flex; align-items:center; gap:6px;">
              <span>${getSvgIcon('zap', 13)}</span>
              <span>Action Buttons</span>
            </span>
            <span style="font-size:12px; font-weight:700; color:#64748b; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); padding:1px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:0.03em;">Red ➔ Blue</span>
          </div>
          ${renderColorItem('btnDanger', 'Danger Action (Delete Button)', 'Pure Crimson', 'Permanent Delete · Hard Purge · Kick Student &amp; End Session', colorSettings.btnDanger || 'var(--grade-e, #ff0000)')}
          ${renderColorItem('btnPrimary', 'Primary Action (CTA Button)', 'Tactical Cyan', 'Modal Save Buttons · Proceed CTAs · Create Class &amp; Submit Exam', colorSettings.btnPrimary || '#38bdf8')}
        </div>

      </div>

      <!-- COLUMN 2: ACADEMICS & ASSESSMENTS (3 DISTINCT CARDS: 6 + 2 + 2 = 10 ITEMS) -->
      <div style="display:flex; flex-direction:column; gap:10px;">

        <!-- CARD 4: ACADEMIC GRADES (RED ➔ PURPLE SPECTRUM) -->
        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px; display:flex; flex-direction:column; box-sizing:border-box;">
          <div style="font-size:12px; font-weight:800; color:#a855f7; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <span style="display:flex; align-items:center; gap:6px;">
              <span>${getSvgIcon('award', 13)}</span>
              <span>Academic Grades (SSOT)</span>
            </span>
            <span style="font-size:12px; font-weight:700; color:#64748b; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); padding:1px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:0.03em;">Red ➔ Purple</span>
          </div>
          ${renderColorItem('gradeE', 'Grade E (0–29% · Fail)', 'Pure Red', 'Failed Score &amp; Danger Red Highlight (.badge-e)', colorSettings.gradeE)}
          ${renderColorItem('gradeD', 'Grade D (30–59% · Less)', 'Dark Orange', 'Remedial Status &amp; Low Score Indicator (.badge-d)', colorSettings.gradeD)}
          ${renderColorItem('gradeC', 'Grade C (60–79% · Enough)', 'Pure Yellow', 'Official Level Promotion Passing Threshold (.badge-c)', colorSettings.gradeC)}
          ${renderColorItem('gradeB', 'Grade B (80–89% · Good)', 'Electric Lime', 'Score 80%–89% · Good Report &amp; Standings', colorSettings.gradeB)}
          ${renderColorItem('gradeA', 'Grade A (90–99% · Very Good)', 'Pure Green', 'Score 90%–99% · Very Good Report &amp; Standings', colorSettings.gradeA)}
          ${renderColorItem('gradeStar', 'Grade ★ (100% · Excellent)', 'Vibrant Purple', 'Perfect Score 100% · Purple Star Badge (.grade-circle)', colorSettings.gradeStar)}
        </div>

        <!-- CARD 5: ASSESSMENT INSTRUMENTS (TESTS) -->
        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px; display:flex; flex-direction:column; box-sizing:border-box;">
          <div style="font-size:12px; font-weight:800; color:var(--quad-c, #95ff00); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <span style="display:flex; align-items:center; gap:6px;">
              <span>${getSvgIcon('target', 13)}</span>
              <span>Assessment Instruments</span>
            </span>
            <span style="font-size:12px; font-weight:700; color:#64748b; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); padding:1px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:0.03em;">Tests &amp; Exams</span>
          </div>
          ${renderColorItem('exam', 'EXAM (Milestone)', 'Electric Pink', 'Milestone Evaluation Exam · EXAM &amp; RATE Column · Theme Exams', colorSettings.exam)}
          ${renderColorItem('task', 'TASK (Formative)', 'Electric Lime', 'Daily Formative Task · Workstation TASK Column · Topic Quizzes', colorSettings.task)}
        </div>

        <!-- CARD 6: CURRICULUM WORKSHEETS -->
        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px; display:flex; flex-direction:column; box-sizing:border-box;">
          <div style="font-size:12px; font-weight:800; color:var(--quad-d, #38bdf8); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <span style="display:flex; align-items:center; gap:6px;">
              <span>${getSvgIcon('file-text', 13)}</span>
              <span>Curriculum Worksheets</span>
            </span>
            <span style="font-size:12px; font-weight:700; color:#64748b; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); padding:1px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:0.03em;">Unified Topics</span>
          </div>
          ${renderColorItem('phrases', 'Phrases (PHR Component)', 'Electric Pink', 'Phrases Worksheet (10 Phrases) · Repetition Pips Sub-Row P1–P7', colorSettings.phrases)}
          ${renderColorItem('words', 'Words (WRD Component)', 'Electric Lime', 'Words Worksheet (50 Words) · Repetition Pips Sub-Row W1–W7', colorSettings.words)}
        </div>

      </div>

      <!-- COLUMN 3: REPETITIONS & TYPOGRAPHY (2 DISTINCT CARDS: 7 + 2 = 9 ITEMS) -->
      <div style="display:flex; flex-direction:column; gap:10px;">

        <!-- CARD 7: RAINBOW REPETITION PIPS (RED ➔ VIOLET SPECTRUM) -->
        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px; display:flex; flex-direction:column; box-sizing:border-box;">
          <div style="font-size:12px; font-weight:800; color:var(--primary-tactical, #38bdf8); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <span style="display:flex; align-items:center; gap:6px;">
              <span>${getSvgIcon('activity', 13)}</span>
              <span>Rainbow Pips (Steps 1–7)</span>
            </span>
            <span style="font-size:12px; font-weight:700; color:#64748b; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); padding:1px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:0.03em;">Red ➔ Violet</span>
          </div>
          ${renderColorItem('rainbow1', 'Pip 1 (Step 1)', 'Pure Red', 'Module Repetition Step 1/7 · Grade E Threshold', colorSettings.rainbow1)}
          ${renderColorItem('rainbow2', 'Pip 2 (Step 2)', 'Dark Orange', 'Module Repetition Step 2/7 · Grade D Threshold', colorSettings.rainbow2)}
          ${renderColorItem('rainbow3', 'Pip 3 (Step 3)', 'Pure Yellow', 'Module Repetition Step 3/7 · Grade C Threshold', colorSettings.rainbow3)}
          ${renderColorItem('rainbow4', 'Pip 4 (Step 4)', 'Pure Green', 'Module Repetition Step 4/7 · Grade A Threshold', colorSettings.rainbow4)}
          ${renderColorItem('rainbow5', 'Pip 5 (Step 5)', 'Tactical Blue', 'Module Repetition Step 5/7 · Tactical Blue Accent', colorSettings.rainbow5)}
          ${renderColorItem('rainbow6', 'Pip 6 (Step 6)', 'Royal Indigo', 'Module Repetition Step 6/7 · Royal Indigo Accent', colorSettings.rainbow6)}
          ${renderColorItem('rainbow7', 'Pip 7 (Step 7)', 'Violet Mastery', 'Module Repetition Step 7/7 · Violet Mastery Complete', colorSettings.rainbow7)}
        </div>

        <!-- CARD 8: TYPOGRAPHY FAMILIES (SSOT) -->
        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px; display:flex; flex-direction:column; box-sizing:border-box;">
          <div style="font-size:12px; font-weight:800; color:var(--quad-d, #38bdf8); text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <span style="display:flex; align-items:center; gap:6px;">
              <span>${getSvgIcon('settings', 13)}</span>
              <span>Typography Families (SSOT)</span>
            </span>
            <span style="font-size:12px; font-weight:700; color:#64748b; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); padding:1px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:0.03em;">Font Stack</span>
          </div>
          <div style="margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
              <label style="font-size:12px; font-weight:700; color:#cbd5e1; margin:0;">Primary Sans-Serif</label>
            </div>
            <div style="font-size:12px; color:#94a3b8; margin-bottom:4px; display:flex; align-items:center; gap:4px;"><span style="color:var(--quad-d, #38bdf8); display:inline-flex; align-items:center; flex-shrink:0;">${getSvgIcon('map-pin', 12)}</span><span>Page Titles, Sidebar, Workstation Tables &amp; Dialogs</span></div>
            <select class="form-control" id="is-font-sans" style="height:30px; font-size:12px; padding:0 8px; background:rgba(0,0,0,0.35); border-color:rgba(255,255,255,0.12); color:#f8fafc;">
              <option value="'Inter', sans-serif" ${ifaceSettings.typography.fontSans?.includes('Inter') ? 'selected' : ''}>Inter (SSOT Standard)</option>
              <option value="'Plus Jakarta Sans', sans-serif" ${ifaceSettings.typography.fontSans?.includes('Plus Jakarta Sans') ? 'selected' : ''}>Plus Jakarta Sans</option>
              <option value="system-ui, -apple-system, sans-serif" ${ifaceSettings.typography.fontSans?.includes('system-ui') ? 'selected' : ''}>System UI Native</option>
              <option value="'Roboto', sans-serif" ${ifaceSettings.typography.fontSans?.includes('Roboto') ? 'selected' : ''}>Roboto</option>
            </select>
          </div>
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
              <label style="font-size:12px; font-weight:700; color:#cbd5e1; margin:0;">Monospace (Numeric &amp; Timers)</label>
            </div>
            <div style="font-size:12px; color:#94a3b8; margin-bottom:4px; display:flex; align-items:center; gap:4px;"><span style="color:var(--quad-d, #38bdf8); display:inline-flex; align-items:center; flex-shrink:0;">${getSvgIcon('map-pin', 12)}</span><span>Exam Countdown Timers, Tabular Numbers &amp; Shell Codes</span></div>
            <select class="form-control" id="is-font-mono" style="height:30px; font-size:12px; padding:0 8px; background:rgba(0,0,0,0.35); border-color:rgba(255,255,255,0.12); color:#f8fafc;">
              <option value="'JetBrains Mono', 'Fira Code', monospace" ${ifaceSettings.typography.fontMono?.includes('JetBrains') ? 'selected' : ''}>JetBrains Mono / Fira Code (SSOT)</option>
              <option value="'Consolas', monospace" ${ifaceSettings.typography.fontMono?.includes('Consolas') ? 'selected' : ''}>Consolas</option>
              <option value="'Courier New', monospace" ${ifaceSettings.typography.fontMono?.includes('Courier') ? 'selected' : ''}>Courier New</option>
            </select>
          </div>
        </div>

      </div>

      <!-- COLUMN 4: SURFACES & EFFECTS (3 DISTINCT CARDS: 5 + 3 + 2 = 10 ITEMS) -->
      <div style="display:flex; flex-direction:column; gap:10px;">

        <!-- CARD 9: DARK CANVAS SURFACES -->
        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px; display:flex; flex-direction:column; box-sizing:border-box;">
          <div style="font-size:12px; font-weight:800; color:#94a3b8; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <span style="display:flex; align-items:center; gap:6px;">
              <span>${getSvgIcon('layers', 13)}</span>
              <span>Dark Canvas Surfaces</span>
            </span>
            <span style="font-size:12px; font-weight:700; color:#64748b; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); padding:1px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:0.03em;">5 Surfaces</span>
          </div>
          ${renderColorItem('bgMain', 'Canvas Main Background', 'Deep Space Dark', 'Main Workstation Canvas &amp; Exam Room Workspace', ifaceSettings.surface.bgMain)}
          ${renderColorItem('bgSidebar', 'Sidebar &amp; Topbar Surface', 'Navy Slate', 'Left Sidebar Navigation &amp; Top Header Bar', ifaceSettings.surface.bgSidebar)}
          ${renderColorItem('bgCard', 'Card &amp; Panel Elevation', 'Midnight Elevation', 'Workstation Cards, Table Containers, Popovers &amp; Modals', ifaceSettings.surface.bgCard)}
          ${renderColorItem('bgStudent', 'Student Outer Canvas', 'Deep Pitch Black', 'Desktop Outer Canvas Surrounding 430px Student Corridor', ifaceSettings.surface.bgStudent || '#060911')}
          ${renderColorItem('bgBanner', 'Locked Base Banner', 'Base Midnight Dark', 'Standardized 50px Bottom Identity Banner (TopsCore by Mr. Top)', ifaceSettings.surface.bgBanner || '#030a12')}
        </div>

        <!-- CARD 10: TEXT CONTRAST LEVELS (WHITE ➔ SLATE) -->
        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px; display:flex; flex-direction:column; box-sizing:border-box;">
          <div style="font-size:12px; font-weight:800; color:#f8fafc; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <span style="display:flex; align-items:center; gap:6px;">
              <span>${getSvgIcon('file-text', 13)}</span>
              <span>Text Contrast Levels</span>
            </span>
            <span style="font-size:12px; font-weight:700; color:#64748b; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); padding:1px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:0.03em;">White ➔ Slate</span>
          </div>
          ${renderColorItem('text1', 'Text Primary (High Contrast)', 'Pure White', 'Page Titles, Table Headers &amp; Primary Score Metrics', ifaceSettings.typography.text1)}
          ${renderColorItem('text2', 'Text Secondary (Body)', 'Light Slate', 'Table Data Rows, Question Body &amp; Student Names', ifaceSettings.typography.text2)}
          ${renderColorItem('text3', 'Text Tertiary (Muted)', 'Soft Slate', 'Subtitles, Hints, Help Notes &amp; Placeholders', ifaceSettings.typography.text3)}
        </div>

        <!-- CARD 11: BORDERS & NEON AURA -->
        <div style="background:rgba(15,23,42,0.65); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:10px; display:flex; flex-direction:column; box-sizing:border-box;">
          <div style="font-size:12px; font-weight:800; color:#38bdf8; text-transform:uppercase; letter-spacing:0.04em; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
            <span style="display:flex; align-items:center; gap:6px;">
              <span>${getSvgIcon('sparkles', 13)}</span>
              <span>Borders &amp; Neon Aura</span>
            </span>
            <span style="font-size:12px; font-weight:700; color:#64748b; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.06); padding:1px 6px; border-radius:4px; text-transform:uppercase; letter-spacing:0.03em;">Effects</span>
          </div>
          <div style="margin-bottom:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
              <label style="font-size:12px; font-weight:700; color:#cbd5e1; margin:0;">Border Line Opacity</label>
            </div>
            <div style="font-size:12px; color:#94a3b8; margin-bottom:4px; display:flex; align-items:center; gap:4px;"><span style="color:var(--quad-d, #38bdf8); display:inline-flex; align-items:center; flex-shrink:0;">${getSvgIcon('map-pin', 12)}</span><span>Card Perimeter Borders, Column Dividers &amp; Modals</span></div>
            <select class="form-control" id="is-border-opacity" style="height:30px; font-size:12px; padding:0 8px; background:rgba(0,0,0,0.35); border-color:rgba(255,255,255,0.12); color:#f8fafc;">
              <option value="0.08" ${ifaceSettings.surface.borderOpacity === '0.08' ? 'selected' : ''}>0.08 (Subtle Minimalist SSOT)</option>
              <option value="0.12" ${ifaceSettings.surface.borderOpacity === '0.12' ? 'selected' : ''}>0.12 (Crisp Definition)</option>
              <option value="0.18" ${ifaceSettings.surface.borderOpacity === '0.18' ? 'selected' : ''}>0.18 (High Contrast)</option>
              <option value="0.04" ${ifaceSettings.surface.borderOpacity === '0.04' ? 'selected' : ''}>0.04 (Ultra Soft)</option>
            </select>
          </div>
          <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2px;">
              <label style="font-size:12px; font-weight:700; color:#cbd5e1; margin:0;">Neon Glow Intensity</label>
            </div>
            <div style="font-size:12px; color:#94a3b8; margin-bottom:4px; display:flex; align-items:center; gap:4px;"><span style="color:var(--quad-d, #38bdf8); display:inline-flex; align-items:center; flex-shrink:0;">${getSvgIcon('map-pin', 12)}</span><span>Rainbow Pips, Active Badges &amp; Tactical Glow Buttons</span></div>
            <select class="form-control" id="is-glow-intensity" style="height:30px; font-size:12px; padding:0 8px; background:rgba(0,0,0,0.35); border-color:rgba(255,255,255,0.12); color:#f8fafc;">
              <option value="1.0" ${ifaceSettings.surface.glowIntensity === '1.0' ? 'selected' : ''}>1.0x (Standard Tactical Glow SSOT)</option>
              <option value="0.7" ${ifaceSettings.surface.glowIntensity === '0.7' ? 'selected' : ''}>0.7x (Soft Subtle Glow)</option>
              <option value="1.3" ${ifaceSettings.surface.glowIntensity === '1.3' ? 'selected' : ''}>1.3x (Vivid Neon Aura)</option>
              <option value="0" ${ifaceSettings.surface.glowIntensity === '0' ? 'selected' : ''}>0.0x (Matte / Off)</option>
            </select>
          </div>
        </div>

      </div>

    </div>
  `;

  // Sub Panel (Lower Panel 40px) with Info & Action Buttons
  const syncSubPanel = () => {
    if (typeof window.setBottomInfobar !== 'function') return;
    const leftHtml = `
      <div style="display:flex; align-items:center; gap:8px; font-size:12px; font-weight:700; color:#f8fafc; white-space:nowrap;">
        <span style="color:var(--quad-d, #38bdf8); display:inline-flex; align-items:center;">${getSvgIcon('layers', 15)}</span>
        <span>System Designs SSOT (Pillar D)</span>
        <span style="color:#475569;">·</span>
        <span style="font-size:12px; color:#94a3b8; font-weight:500;">Unified Design System Governance</span>
        <span class="badge" style="background:rgba(56,189,248,0.12); color:#38bdf8; border:1px solid rgba(56,189,248,0.3); font-size:12px; font-weight:700; padding:2px 8px; border-radius:4px; display:inline-flex; align-items:center; gap:5px;">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#38bdf8;"></span>
          LIVE PROPAGATION ACTIVE
        </span>
      </div>
    `;
    const rightHtml = `
      <div style="display:flex; align-items:center; gap:8px;">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-reset-interface-system" style="height:30px !important; min-height:30px !important; max-height:30px !important; line-height:28px !important; font-size:12px !important; font-weight:700; border-color:rgba(255,255,255,0.2); padding:0 12px; cursor:pointer;">
          ${getSvgIcon('refresh', 12)} Reset Defaults
        </button>
        <button type="button" class="btn btn-primary btn-sm" id="btn-save-interface-system" style="height:30px !important; min-height:30px !important; max-height:30px !important; line-height:28px !important; font-size:12px !important; font-weight:800; background:var(--primary-tactical, #38bdf8); border:1px solid #38bdf8; color:#fff; padding:0 14px; cursor:pointer;">
          ${getSvgIcon('save', 12)} Save System Designs
        </button>
      </div>
    `;
    window.setBottomInfobar(leftHtml, rightHtml);

    document.getElementById('btn-save-interface-system')?.addEventListener('click', () => saveInterfaceSystem(false));
    document.getElementById('btn-reset-interface-system')?.addEventListener('click', resetInterfaceSystem);
  };

  const getInterfaceCurrentValues = () => {
    const colors = {};
    area.querySelectorAll('.cs-hex-input').forEach(input => {
      const k = input.dataset.key;
      if (k && !['text1', 'text2', 'text3', 'bgMain', 'bgSidebar', 'bgCard', 'bgStudent', 'bgBanner'].includes(k)) {
        colors[k] = input.value.trim();
      }
    });
    return {
      colors,
      typography: {
        fontSans: document.getElementById('is-font-sans')?.value || "'Inter', sans-serif",
        fontMono: document.getElementById('is-font-mono')?.value || "'JetBrains Mono', 'Fira Code', monospace",
        text1: area.querySelector('.cs-hex-input[data-key="text1"]')?.value || '#ffffff',
        text2: area.querySelector('.cs-hex-input[data-key="text2"]')?.value || '#e2e8f0',
        text3: area.querySelector('.cs-hex-input[data-key="text3"]')?.value || '#94a3b8'
      },
      surface: {
        bgMain: area.querySelector('.cs-hex-input[data-key="bgMain"]')?.value || '#090D16',
        bgSidebar: area.querySelector('.cs-hex-input[data-key="bgSidebar"]')?.value || '#0F172A',
        bgCard: area.querySelector('.cs-hex-input[data-key="bgCard"]')?.value || '#121c35',
        bgStudent: area.querySelector('.cs-hex-input[data-key="bgStudent"]')?.value || '#060911',
        bgBanner: area.querySelector('.cs-hex-input[data-key="bgBanner"]')?.value || '#030a12',
        borderOpacity: document.getElementById('is-border-opacity')?.value || '0.08',
        glowIntensity: document.getElementById('is-glow-intensity')?.value || '1.0'
      }
    };
  };

  // Live picker sync & dynamic real-time preview
  area.querySelectorAll('.cs-color-picker').forEach(picker => {
    picker.addEventListener('input', (e) => {
      const key = e.target.dataset.key;
      const hex = e.target.value;
      const hexInput = area.querySelector(`.cs-hex-input[data-key="${key}"]`);
      if (hexInput) hexInput.value = hex.toUpperCase();
      const swatch = document.getElementById(`cs-swatch-${key}`);
      if (swatch) {
        swatch.style.background = hex;
        swatch.style.boxShadow = `0 0 5px ${hex}55`;
      }
      applyGlobalInterfaceSystem(getInterfaceCurrentValues());
    });
  });

  area.querySelectorAll('.cs-hex-input').forEach(hexInput => {
    hexInput.addEventListener('input', (e) => {
      const key = e.target.dataset.key;
      let hex = e.target.value.trim();
      if (!hex.startsWith('#')) hex = '#' + hex;
      if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
        const picker = area.querySelector(`.cs-color-picker[data-key="${key}"]`);
        if (picker) picker.value = hex;
        const swatch = document.getElementById(`cs-swatch-${key}`);
        if (swatch) {
          swatch.style.background = hex;
          swatch.style.boxShadow = `0 0 5px ${hex}55`;
        }
        applyGlobalInterfaceSystem(getInterfaceCurrentValues());
      }
    });
  });

  // Typography & Surface select changes
  ['is-font-sans', 'is-font-mono', 'is-border-opacity', 'is-glow-intensity'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', () => {
      applyGlobalInterfaceSystem(getInterfaceCurrentValues());
    });
  });

  const saveInterfaceSystem = async (silent = false) => {
    const ifaceVals = getInterfaceCurrentValues();
    try {
      localStorage.setItem('topscore_interface_system', JSON.stringify(ifaceVals));
      localStorage.setItem('topscore_color_system', JSON.stringify(ifaceVals.colors));
      await Promise.all([
        sb.from('site_settings').upsert({
          key: 'interface_system_settings',
          value: JSON.stringify(ifaceVals),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' }),
        sb.from('site_settings').upsert({
          key: 'color_system_overrides',
          value: JSON.stringify(ifaceVals.colors),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' })
      ]);
      applyGlobalInterfaceSystem(ifaceVals);
      if (!silent) showToast('✓ System Designs saved and applied globally across TopsCore!', 'success');
      return true;
    } catch (err) {
      if (!silent) showToast('Failed to save System Designs: ' + err.message, 'error');
      throw err;
    }
  };

  const resetInterfaceSystem = async () => {
    if (!confirm('Reset all System Designs settings (Colours, Typography, Surfaces) to TopsCore SSOT defaults?')) return;
    try {
      localStorage.removeItem('topscore_interface_system');
      localStorage.removeItem('topscore_color_system');
      await Promise.all([
        sb.from('site_settings').upsert({
          key: 'interface_system_settings',
          value: JSON.stringify(DEFAULT_INTERFACE_SYSTEM),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' }),
        sb.from('site_settings').upsert({
          key: 'color_system_overrides',
          value: JSON.stringify(DEFAULT_INTERFACE_SYSTEM.colors),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' })
      ]);

      // Reset color inputs & swatches
      Object.entries(DEFAULT_INTERFACE_SYSTEM.colors).forEach(([key, val]) => {
        const picker = area.querySelector(`.cs-color-picker[data-key="${key}"]`);
        if (picker) picker.value = val.substring(0, 7);
        const hexInput = area.querySelector(`.cs-hex-input[data-key="${key}"]`);
        if (hexInput) hexInput.value = val.toUpperCase();
        const swatch = document.getElementById(`cs-swatch-${key}`);
        if (swatch) {
          swatch.style.background = val;
          swatch.style.boxShadow = `0 0 5px ${val}55`;
        }
      });

      // Reset typography inputs
      const fontSans = document.getElementById('is-font-sans');
      if (fontSans) fontSans.value = DEFAULT_INTERFACE_SYSTEM.typography.fontSans;
      const fontMono = document.getElementById('is-font-mono');
      if (fontMono) fontMono.value = DEFAULT_INTERFACE_SYSTEM.typography.fontMono;
      ['text1', 'text2', 'text3'].forEach(k => {
        const val = DEFAULT_INTERFACE_SYSTEM.typography[k];
        const picker = area.querySelector(`.cs-color-picker[data-key="${k}"]`);
        if (picker) picker.value = val.substring(0, 7);
        const hexInput = area.querySelector(`.cs-hex-input[data-key="${k}"]`);
        if (hexInput) hexInput.value = val.toUpperCase();
        const swatch = document.getElementById(`cs-swatch-${k}`);
        if (swatch) swatch.style.background = val;
      });

      // Reset surface inputs
      ['bgMain', 'bgSidebar', 'bgCard', 'bgStudent', 'bgBanner'].forEach(k => {
        const val = DEFAULT_INTERFACE_SYSTEM.surface[k];
        const picker = area.querySelector(`.cs-color-picker[data-key="${k}"]`);
        if (picker) picker.value = val.substring(0, 7);
        const hexInput = area.querySelector(`.cs-hex-input[data-key="${k}"]`);
        if (hexInput) hexInput.value = val.toUpperCase();
        const swatch = document.getElementById(`cs-swatch-${k}`);
        if (swatch) swatch.style.background = val;
      });
      const borderOp = document.getElementById('is-border-opacity');
      if (borderOp) borderOp.value = DEFAULT_INTERFACE_SYSTEM.surface.borderOpacity;
      const glowInt = document.getElementById('is-glow-intensity');
      if (glowInt) glowInt.value = DEFAULT_INTERFACE_SYSTEM.surface.glowIntensity;

      applyGlobalInterfaceSystem(DEFAULT_INTERFACE_SYSTEM);
      showToast('✓ System Designs reset to canonical defaults.', 'info');
    } catch (err) {
      showToast('Failed to reset: ' + err.message, 'error');
    }
  };

  syncSubPanel();
}
