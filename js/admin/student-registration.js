// TOPS CORE — Student Registration Module (Domain B: Board)
// Handles Bulk Excel/CSV Ingestion and Individual Student Registration

import {
  adminFetchAll, adminInsert, adminUpdate, formatStudentName, cleanStudentName,
  normalizeStudentNameForMatch, clearAdminCache, sha256
} from '../api.js?v=20261125_v688';
import { showToast, showLoading, hideLoading, updateLoadingProgress, escapeHtml, escHtml } from '../app.js?v=20261106_v160';
import { getSupabase } from '../supabase.js?v=20261106_v160';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';

function renderLoadingState(msg = 'Loading...') {
  if (typeof window !== 'undefined' && typeof window.getLoadingStateHtml === 'function') {
    return window.getLoadingStateHtml(msg);
  }
  return `<div class="topscore-loading-center"><div class="spinner"></div><p class="loading-text">${escapeHtml(msg)}</p></div>`;
}

export async function renderStudentsRegistration(area) {
  if (window.setTopbarTabs) {
    window.setTopbarTabs([], '', '');
  }

  area.innerHTML = `
    <div id="student-reg-workspace" style="display:flex; flex-direction:column; flex:1; height:100%; min-height:0; gap:10px;">
      ${renderLoadingState('Loading registration workspace...')}
    </div>
  `;
  const container = document.getElementById('student-reg-workspace');
  await renderUnifiedRegistrationView(container, area);
}

// ============================================================
// UNIFIED STUDENT REGISTRATION (BULK + INDIVIDUAL + RECENT)
// ============================================================
async function renderUnifiedRegistrationView(container, rootArea) {
  container.innerHTML = renderLoadingState('Loading registration options...');

  let allInsts = [];
  let allProgs = [];
  let allBatches = [];
  let recentStudents = [];

  try {
    const results = await Promise.allSettled([
      adminFetchAll('institutions', 'id, name, is_active'),
      adminFetchAll('programs', 'id, name, is_active, institution_id'),
      adminFetchAll('batches', 'id, name, is_active, program_id'),
      adminFetchAll('students', 'id, name, gender, birth_date, is_active, created_at, institution_id, program_id, batch_id, institutions(name), programs(name), batches!batch_id(name)')
    ]);
    allInsts = (results[0].status === 'fulfilled' && Array.isArray(results[0].value)) ? results[0].value : [];
    allProgs = (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) ? results[1].value : [];
    allBatches = (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) ? results[2].value : [];
    recentStudents = (results[3].status === 'fulfilled' && Array.isArray(results[3].value)) ? results[3].value : [];
  } catch (err) {
    console.warn('[renderUnifiedRegistrationView] Lookup load failed:', err);
  }

  const sortedInsts = allInsts.filter(i => i && !i.deleted_at && i.is_active !== false).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const sortedProgs = allProgs.filter(p => p && !p.deleted_at && p.is_active !== false).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const sortedBatches = allBatches.filter(b => b && !b.deleted_at && b.is_active !== false).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const recentList = recentStudents.filter(s => s && !s.deleted_at).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 10);

  const renderRecentRowsHtml = (list) => {
    if (!list || list.length === 0) {
      return `
        <tr>
          <td colspan="7">
            <div class="smart-empty-state">
              <span class="smart-empty-icon">${getSvgIcon('users', 32)}</span>
              <div class="smart-empty-title">No students registered yet</div>
              <div class="smart-empty-subtext">Use Bulk Import or Individual Registration above to enroll your first student.</div>
            </div>
          </td>
        </tr>
      `;
    }
    return list.map((s, idx) => `
      <tr>
        <td style="text-align: center; color: var(--fm-text-muted);">${idx + 1}</td>
        <td>${escapeHtml(s.institutions?.name || '—')}</td>
        <td>${escapeHtml(s.programs?.name || '—')}</td>
        <td>${escapeHtml(s.batches?.name || '—')}</td>
        <td style="font-weight: 600; color: #fff; cursor: pointer;" data-edit-student-id="${s.id}" title="Click to view/edit profile">${escapeHtml(s.name)}</td>
        <td style="text-align: center;">
          <span class="status-dot-badge">
            <span class="status-dot ${s.is_active ? 'dot-success' : 'dot-draft'}"></span>
            ${s.is_active ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td style="text-align: center; font-size: 12px; color: var(--fm-text-muted);">
          ${s.created_at ? s.created_at.split('T')[0] : '—'}
        </td>
      </tr>
    `).join('');
  };

  container.innerHTML = `
    <!-- TOP ROW: BULK IMPORT (LEFT) + INDIVIDUAL REGISTRATION (RIGHT) -->
    <div style="display: grid; grid-template-columns: minmax(460px, 1fr) minmax(460px, 1fr); gap: 10px; align-items: stretch; flex-shrink: 0; width: 100%;">
      <!-- LEFT: BULK STUDENT INGESTION -->
      <div class="glass-card" style="padding: 10px; display: flex; flex-direction: column; gap: 8px; min-width: 0;">
        <div class="d-flex align-center justify-between gap-2">
          <h3 style="font-size: 16px; font-weight: 700; color: #fff; margin: 0; display: flex; align-items: center; gap: 8px;">
            <span>${getSvgIcon('upload', 16)}</span> Bulk Student Ingestion
          </h3>
          <span class="badge badge-info" style="font-size: 12px;">Default PIN: 1234</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;">
          <div class="form-group mb-0">
            <label class="form-label" style="font-size: 12px;">1. Institution</label>
            <select class="form-control" id="bulk-inst-select">
              <option value="">— From Sheet —</option>
              ${sortedInsts.map(i => `<option value="${i.id}">${escapeHtml(i.name)}</option>`).join('')}
            </select>
          </div>

          <div class="form-group mb-0">
            <label class="form-label" style="font-size: 12px;">2. Program</label>
            <select class="form-control" id="bulk-prog-select">
              <option value="">— From Sheet —</option>
              ${sortedProgs.map(p => `<option value="${p.id}" data-inst="${p.institution_id}">${escapeHtml(p.name)}</option>`).join('')}
            </select>
          </div>

          <div class="form-group mb-0">
            <label class="form-label" style="font-size: 12px;">3. Batch</label>
            <select class="form-control" id="bulk-batch-select" disabled>
              <option value="">— Select Prog —</option>
            </select>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1.15fr 1fr; gap: 8px; align-items: stretch; flex: 1;">
          <!-- Interactive Drag & Drop Box -->
          <div class="student-reg-dropzone" id="bulk-dropzone" style="display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 0; padding: 10px; min-height: 110px;">
            <input type="file" id="import-students-file" accept=".xlsx,.xls,.csv" style="display: none;" />
            <span class="student-reg-dropzone-icon">${getSvgIcon('upload', 26)}</span>
            <div style="font-size: 12px; font-weight: 600; color: #fff; text-align: center;">Click or drag &amp; drop Excel / CSV</div>
            <div style="font-size: 12px; color: var(--fm-text-muted); margin-top: 2px;">.xlsx, .xls, .csv</div>
            <div id="dropzone-file-name" style="margin-top: 4px; font-size: 12px; font-weight: 700; color: #818cf8; display: none; text-align: center;"></div>
          </div>

          <!-- Format Guide -->
          <div style="padding: 10px; border-radius: 8px; background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25); display: flex; flex-direction: column; justify-content: center; gap: 4px;">
            <div class="d-flex align-center justify-between gap-2">
              <span class="text-xs fw-700 text-gradient" style="font-size: 12px;">COLUMN HEADERS</span>
              <span class="badge badge-info" style="font-size: 12px;">Case-Insensitive</span>
            </div>
            <div class="text-xs text-muted d-flex flex-column gap-1" style="line-height: 1.35; font-size: 12px;">
              <div>&bull; <b>Req:</b> <code>INSTITUTION</code>, <code>PROGRAM</code>, <code>BATCH</code>, <code>NAME</code></div>
              <div>&bull; <b>Opt:</b> <code>GENDER</code>, <code>BIRTH_DATE</code>, <code>PIN</code></div>
              <div>&bull; <b>Pacing:</b> Auto-unlocks <b>Level 1</b>.</div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT: INDIVIDUAL STUDENT REGISTRATION -->
      <div class="glass-card" style="padding: 10px; display: flex; flex-direction: column; gap: 8px; min-width: 0;">
        <div class="d-flex align-center justify-between gap-2">
          <h3 style="font-size: 16px; font-weight: 700; color: #fff; margin: 0; display: flex; align-items: center; gap: 8px;">
            <span>${getSvgIcon('user', 16)}</span> Individual Student Registration
          </h3>
        </div>

        <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px;">
          <!-- Row 1: Full Name (2 cols) + Gender (1 col) -->
          <div class="form-group mb-0" style="grid-column: span 2;">
            <label class="form-label" style="font-size: 12px;">Full Name <span style="color: var(--grade-e);">*</span></label>
            <input type="text" class="form-control" id="indiv-name" placeholder="e.g. Johnathan Doe" autocomplete="off" />
          </div>

          <div class="form-group mb-0">
            <label class="form-label" style="font-size: 12px;">Honorific &amp; Gender</label>
            <select class="form-control" id="indiv-gender">
              <option value="">— Unassigned —</option>
              <option value="male">Mister (Male)</option>
              <option value="female">Miss (Female)</option>
            </select>
          </div>

          <!-- Row 2: DOB + Institution + Program -->
          <div class="form-group mb-0">
            <label class="form-label" style="font-size: 12px;">Date of Birth</label>
            <input type="date" class="form-control" id="indiv-birth" />
          </div>

          <div class="form-group mb-0">
            <label class="form-label" style="font-size: 12px;">Institution <span style="color: var(--grade-e);">*</span></label>
            <select class="form-control" id="indiv-inst">
              <option value="">— Select Institution —</option>
              ${sortedInsts.map(i => `<option value="${i.id}">${escapeHtml(i.name)}</option>`).join('')}
            </select>
          </div>

          <div class="form-group mb-0">
            <label class="form-label" style="font-size: 12px;">Program <span style="color: var(--grade-e);">*</span></label>
            <select class="form-control" id="indiv-prog">
              <option value="">— Select Program —</option>
              ${sortedProgs.map(p => `<option value="${p.id}" data-inst="${p.institution_id}">[${escapeHtml(p.name)}]</option>`).join('')}
            </select>
          </div>

          <!-- Row 3: Batch + PIN + Status -->
          <div class="form-group mb-0">
            <div class="d-flex align-center justify-between mb-1">
              <label class="form-label" style="font-size: 12px; margin: 0;">Batch <span style="color: var(--grade-e);">*</span></label>
              <button type="button" class="btn btn-ghost btn-xs text-primary" id="btn-quick-new-batch" style="padding: 0; font-size: 12px;">+ New Batch</button>
            </div>
            <select class="form-control" id="indiv-batch" disabled>
              <option value="">— Select Program First —</option>
            </select>
          </div>

          <div class="form-group mb-0">
            <label class="form-label" style="font-size: 12px;">Personal PIN <span style="color: var(--grade-e);">*</span></label>
            <input type="text" class="form-control" id="indiv-pin" value="1234" autocomplete="new-password" />
          </div>

          <div class="form-group mb-0">
            <label class="form-label" style="font-size: 12px;">Account Status</label>
            <select class="form-control" id="indiv-active">
              <option value="true">Active (Eligible for tests)</option>
              <option value="false">Inactive / Suspended</option>
            </select>
          </div>
        </div>

        <div class="d-flex align-center justify-end gap-2 pt-2 mt-auto" style="border-top: 1px solid rgba(255, 255, 255, 0.08);">
          <button class="btn btn-ghost btn-sm" id="btn-reset-indiv-form">Clear Form</button>
          <button class="btn btn-primary btn-sm" id="btn-save-indiv-student" style="min-width: 150px;">✓ Register Student</button>
        </div>
      </div>
    </div>

    <!-- BOTTOM ROW: RECENTLY REGISTERED STUDENTS (DEFAULT) OR SPREADSHEET PREVIEW -->
    <div style="flex: 1; min-height: 0; display: flex; flex-direction: column; width: 100%;">
      <!-- RECENTLY REGISTERED STUDENTS CARD -->
      <div class="glass-card" id="indiv-recent-card" style="width: 100%; padding: 10px; display: flex; flex-direction: column; gap: 8px; flex: 1; min-height: 0;">
        <div class="d-flex align-center justify-between flex-wrap gap-2">
          <div class="d-flex align-center gap-3">
            <h3 style="font-size: 16px; font-weight: 700; color: #fff; margin: 0; display: flex; align-items: center; gap: 8px;">${getSvgIcon('clipboard', 16)} Recently Registered Students</h3>
            <span class="text-xs text-muted" style="font-size: 12px;">Latest 10 enrolled students in TopsCore</span>
          </div>
          <button class="btn btn-ghost btn-xs" id="btn-refresh-recent" style="display: inline-flex; align-items: center; gap: 4px;">${getSvgIcon('refresh', 14)} Refresh List</button>
        </div>

        <div class="table-wrap table-compact sticky-first" style="flex: 1; min-height: 0; overflow: auto; width: 100%;">
          <table class="data-table" style="width: 100%;">
            <thead>
              <tr>
                <th style="width: 38px; text-align: center;">#</th>
                <th>INSTITUTION</th>
                <th>PROGRAM</th>
                <th>BATCH</th>
                <th>STUDENT NAME</th>
                <th style="width: 95px; text-align: center;">STATUS</th>
                <th style="width: 100px; text-align: center;">ENROLLED</th>
              </tr>
            </thead>
            <tbody id="indiv-recent-tbody">
              ${renderRecentRowsHtml(recentList)}
            </tbody>
          </table>
        </div>
      </div>

      <!-- SPREADSHEET PREVIEW CARD (SHOWN WHEN FILE UPLOADED) -->
      <div class="glass-card" id="bulk-preview-card" style="width: 100%; padding: 10px; display: none; flex-direction: column; gap: 8px; flex: 1; min-height: 0;">
        <div class="d-flex align-center justify-between flex-wrap gap-2 pb-2" style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
          <div class="d-flex align-center gap-3 flex-wrap">
            <h3 style="font-size: 16px; font-weight: 700; color: #fff; margin: 0;">Spreadsheet Preview</h3>
            <span class="text-xs text-muted" id="preview-row-count" style="font-size: 12px;">0 students loaded from file</span>
            <div class="d-flex gap-2 flex-wrap" id="preview-summary-chips">
              <span class="badge badge-info" id="chip-total">Total: 0</span>
              <span class="badge badge-success" id="chip-new">${getSvgIcon('sparkles', 12)} New: 0</span>
              <span class="badge badge-warning" id="chip-merge">${getSvgIcon('refresh', 12)} Merge: 0</span>
            </div>
          </div>
          <div class="d-flex align-center gap-2">
            <button class="btn btn-secondary btn-sm" id="btn-cancel-preview">CLOSE</button>
            <button class="btn btn-primary btn-sm" id="btn-confirm-save">✓ Confirm &amp; Save Students</button>
          </div>
        </div>

        <div class="table-wrap table-compact" style="flex: 1; min-height: 0; overflow-y: auto; width: 100%;">
          <table class="data-table" style="width: 100%;">
            <thead>
              <tr>
                <th style="width: 38px; text-align: center;">#</th>
                <th>INSTITUTION</th>
                <th>PROGRAM</th>
                <th>BATCH</th>
                <th>STUDENT NAME</th>
                <th style="width: 70px; text-align: center;">PIN</th>
                <th style="width: 90px; text-align: center;">STATUS</th>
              </tr>
            </thead>
            <tbody id="bulk-preview-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  const recentCard = document.getElementById('indiv-recent-card');

  // --- Element Binding & Cascading Dropdowns ---
  const instSelect = document.getElementById('bulk-inst-select');
  const progSelect = document.getElementById('bulk-prog-select');
  const batchSelect = document.getElementById('bulk-batch-select');
  const fileInput = document.getElementById('import-students-file');
  const dropzone = document.getElementById('bulk-dropzone');
  const previewCard = document.getElementById('bulk-preview-card');
  const fileNameDisplay = document.getElementById('dropzone-file-name');

  const updateBatchOptions = (selectedProgId) => {
    batchSelect.innerHTML = `<option value="">— Use Batch from Spreadsheet —</option>`;
    if (!selectedProgId) {
      batchSelect.disabled = true;
      batchSelect.innerHTML = `<option value="">— Select Program First —</option>`;
      return;
    }
    batchSelect.disabled = false;
    const filteredBatches = sortedBatches.filter(b => b.program_id === selectedProgId);
    filteredBatches.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      batchSelect.appendChild(opt);
    });
  };

  instSelect?.addEventListener('change', () => {
    const selInst = instSelect.value;
    let visibleCount = 0;
    let lastProg = null;
    Array.from(progSelect.options).forEach(opt => {
      if (!opt.value) return;
      const optInst = opt.getAttribute('data-inst');
      const isVis = (!selInst || optInst === selInst);
      opt.style.display = isVis ? '' : 'none';
      if (isVis) {
        visibleCount++;
        lastProg = opt.value;
      }
    });
    if (selInst && progSelect.selectedOptions[0]?.style.display === 'none') {
      progSelect.value = '';
    }
    if (visibleCount === 1 && selInst) {
      progSelect.value = lastProg;
    }
    updateBatchOptions(progSelect.value);
    if (fileInput.files.length > 0) fileInput.dispatchEvent(new Event('change'));
  });

  progSelect?.addEventListener('change', () => {
    updateBatchOptions(progSelect.value);
    if (fileInput.files.length > 0) fileInput.dispatchEvent(new Event('change'));
  });

  batchSelect?.addEventListener('change', () => {
    if (fileInput.files.length > 0) fileInput.dispatchEvent(new Event('change'));
  });

  // Auto-select single Institution / Program if only 1 exists
  if (sortedInsts.length === 1 && instSelect) {
    instSelect.value = sortedInsts[0].id;
    instSelect.dispatchEvent(new Event('change'));
  }

  // --- Dropzone interactions ---
  dropzone?.addEventListener('click', () => fileInput.click());
  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      fileInput.files = e.dataTransfer.files;
      fileInput.dispatchEvent(new Event('change'));
    }
  });

  // --- File Processing State ---
  let parsedStudents = [];

  fileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (fileNameDisplay) {
      fileNameDisplay.textContent = `Selected: ${file.name} (${Math.round(file.size / 1024)} KB)`;
      fileNameDisplay.style.display = 'block';
    }

    showLoading('Parsing spreadsheet file…');
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
        const sheetName = workbook.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });

        if (!rows || rows.length === 0) {
          hideLoading();
          showToast('Spreadsheet is empty or has no readable rows.', 'warning');
          return;
        }

        // Fetch existing students for duplicate check
        let existingStudents = [];
        try {
          existingStudents = await adminFetchAll('students', 'id, name, institution_id, program_id, deleted_at');
        } catch (err) {
          console.warn('Duplicate check lookup failed:', err);
        }
        const existingMap = new Map();
        (existingStudents || []).forEach(s => {
          if (s && !s.deleted_at) {
            const norm = normalizeStudentNameForMatch(s.name);
            if (s.institution_id && s.program_id) {
              existingMap.set(`${norm}::${s.institution_id}::${s.program_id}`, s);
            }
            if (s.program_id) {
              existingMap.set(`${norm}::${s.program_id}`, s);
            }
          }
        });

        const overrideInstId = instSelect.value;
        const overrideProgId = progSelect.value;
        const overrideBatchId = batchSelect.value;

        const overrideInst = sortedInsts.find(i => i.id === overrideInstId);
        const overrideProg = sortedProgs.find(p => p.id === overrideProgId);
        const overrideBatch = sortedBatches.find(b => b.id === overrideBatchId);

        const rowMap = new Map();

        rows.forEach((row, idx) => {
          // Resolve keys case-insensitively
          const getVal = (aliases) => {
            for (const a of aliases) {
              for (const rk of Object.keys(row)) {
                if (rk.toLowerCase().replace(/[^a-z0-9]/g, '') === a.toLowerCase().replace(/[^a-z0-9]/g, '')) {
                  const val = String(row[rk] || '').trim();
                  if (val) return val;
                }
              }
            }
            return '';
          };

          const rawName = getVal(['name', 'studentname', 'fullname', 'nama', 'namasiswa']);
          if (!rawName) return; // skip rows without name

          const rawInst = getVal(['institution', 'institutionname', 'lembaga', 'inst']);
          const rawProg = getVal(['program', 'programname', 'kelas', 'class']);
          const rawBatch = getVal(['batch', 'angkatan', 'batchname']);
          const rawGender = getVal(['gender', 'jeniskelamin', 'sex']);
          const rawBirth = getVal(['birthdate', 'dob', 'tanggallahir', 'birth_date']);
          const rawProvince = getVal(['province', 'provinsi', 'prov']);
          const rawCity = getVal(['city', 'kota', 'kabupaten', 'kabkot', 'district']);
          const rawPin = getVal(['pin', 'password', 'pass']) || '1234';

          // Resolve Institution
          let finalInstId = overrideInstId || null;
          let finalInstName = overrideInst?.name || '';
          if (!finalInstId && rawInst) {
            const m = sortedInsts.find(i => i.name.toLowerCase().trim() === rawInst.toLowerCase().trim());
            if (m) {
              finalInstId = m.id;
              finalInstName = m.name;
            }
          }

          // Resolve Program
          let finalProgId = overrideProgId || null;
          let finalProgName = overrideProg?.name || '';
          if (!finalProgId && rawProg) {
            const m = sortedProgs.find(p => {
              const nameMatch = p.name.toLowerCase().trim() === rawProg.toLowerCase().trim();
              return finalInstId ? (nameMatch && p.institution_id === finalInstId) : nameMatch;
            });
            if (m) {
              finalProgId = m.id;
              finalProgName = m.name;
              if (!finalInstId && m.institution_id) {
                finalInstId = m.institution_id;
                finalInstName = sortedInsts.find(i => i.id === m.institution_id)?.name || '';
              }
            }
          }

          // Resolve Batch
          let finalBatchId = overrideBatchId || null;
          let finalBatchName = overrideBatch?.name || '';
          const targetBatchName = rawBatch || finalBatchName;
          if (!finalBatchId && targetBatchName && finalProgId) {
            const m = sortedBatches.find(b => b.program_id === finalProgId && b.name.toLowerCase().trim() === targetBatchName.toLowerCase().trim());
            if (m) {
              finalBatchId = m.id;
              finalBatchName = m.name;
            } else {
              finalBatchName = targetBatchName.trim();
            }
          }

          // Cross-Institution Mismatch Guard
          let isMismatch = false;
          let mismatchMsg = '';
          if (finalInstId && finalProgId) {
            const progObj = sortedProgs.find(p => p.id === finalProgId);
            if (progObj && progObj.institution_id && progObj.institution_id !== finalInstId) {
              isMismatch = true;
              mismatchMsg = `Program "${progObj.name}" does not belong to Institution "${finalInstName}"`;
            }
          }

          const normName = normalizeStudentNameForMatch(rawName);
          const compoundKey = `${normName}::${finalInstId || ''}::${finalProgId || ''}`;
          const progKey = `${normName}::${finalProgId || ''}`;
          const existingDb = (finalInstId && finalProgId)
            ? (existingMap.get(compoundKey) || existingMap.get(progKey))
            : (finalProgId ? existingMap.get(progKey) : null);

          let status = 'valid';
          let statusBadge = '<span class="status-dot-badge"><span class="status-dot dot-success"></span>New</span>';
          let isExisting = false;
          let existingId = null;

          if (isMismatch) {
            status = 'error';
            statusBadge = `<span class="status-dot-badge" title="${escapeHtml(mismatchMsg)}"><span class="status-dot dot-locked"></span>Mismatch</span>`;
          } else if (!finalProgId) {
            status = 'error';
            statusBadge = '<span class="status-dot-badge"><span class="status-dot dot-locked"></span>No Prog</span>';
          } else if (!finalInstId) {
            status = 'error';
            statusBadge = '<span class="status-dot-badge"><span class="status-dot dot-locked"></span>No Inst</span>';
          } else if (existingDb) {
            status = 'merge';
            statusBadge = '<span class="status-dot-badge"><span class="status-dot dot-warning"></span>Merge</span>';
            isExisting = true;
            existingId = existingDb.id;
          }

          const item = {
            no: idx + 1,
            name: cleanStudentName(rawName),
            gender: rawGender || null,
            birthDate: rawBirth || null,
            province: rawProvince || null,
            city: rawCity || null,
            pin: rawPin,
            instId: finalInstId,
            instName: finalInstName || (rawInst ? `${rawInst} (Unmatched)` : '—'),
            progId: finalProgId,
            progName: finalProgName || (rawProg ? `${rawProg} (Unmatched)` : '—'),
            batchId: finalBatchId,
            batchName: finalBatchName || '—',
            status,
            statusBadge,
            isExisting,
            existingId
          };

          rowMap.set(compoundKey, item);
        });

        parsedStudents = Array.from(rowMap.values()).map((item, index) => {
          item.no = index + 1;
          return item;
        });

        hideLoading();

        if (parsedStudents.length === 0) {
          showToast('No valid student rows found in file.', 'warning');
          return;
        }

        // Render preview table
        renderPreviewRows();
        if (recentCard) recentCard.style.display = 'none';
        previewCard.style.display = 'flex';
        showToast(`Loaded ${parsedStudents.length} student records for review.`, 'info');
      } catch (err) {
        hideLoading();
        showToast('Failed to parse file: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  });

  const renderPreviewRows = () => {
    const tbody = document.getElementById('bulk-preview-tbody');
    const rowCountEl = document.getElementById('preview-row-count');
    const chipTotal = document.getElementById('chip-total');
    const chipNew = document.getElementById('chip-new');
    const chipMerge = document.getElementById('chip-merge');

    const total = parsedStudents.length;
    const newCount = parsedStudents.filter(s => s.status === 'valid').length;
    const mergeCount = parsedStudents.filter(s => s.status === 'merge').length;

    if (rowCountEl) rowCountEl.textContent = `${total} students parsed from file`;
    if (chipTotal) chipTotal.textContent = `Total: ${total}`;
    if (chipNew) chipNew.innerHTML = `${getSvgIcon('sparkles', 12)} New: ${newCount}`;
    if (chipMerge) chipMerge.innerHTML = `${getSvgIcon('refresh', 12)} Merge: ${mergeCount}`;

    if (!tbody) return;
    tbody.innerHTML = parsedStudents.map(s => `
      <tr style="${s.status === 'error' ? 'background: rgba(239, 68, 68, 0.08);' : ''}">
        <td style="text-align: center; color: var(--fm-text-muted);">${s.no}</td>
        <td>${escapeHtml(s.instName)}</td>
        <td>${escapeHtml(s.progName)}</td>
        <td>${escapeHtml(s.batchName)}</td>
        <td style="font-weight: 600; color: #fff;">${escapeHtml(s.name)}</td>
        <td style="text-align: center;"><code>${escapeHtml(s.pin)}</code></td>
        <td style="text-align: center;">${s.statusBadge}</td>
      </tr>
    `).join('');
  };

  // --- Cancel Preview ---
  document.getElementById('btn-cancel-preview')?.addEventListener('click', () => {
    previewCard.style.display = 'none';
    if (recentCard) recentCard.style.display = 'flex';
    fileInput.value = '';
    parsedStudents = [];
    if (fileNameDisplay) fileNameDisplay.style.display = 'none';
  });

  // --- Confirm & Save ---
  document.getElementById('btn-confirm-save')?.addEventListener('click', async () => {
    const readyList = parsedStudents.filter(s => s.status !== 'error');
    if (!readyList.length) {
      showToast('No valid students to save. Please fix errors first.', 'warning');
      return;
    }

    showLoading(`Saving ${readyList.length} students...`);
    try {
      const sb = await getSupabase();
      let insertedCount = 0;
      let updatedCount = 0;
      const batchCache = {};

      const { data: allClasses } = await sb.from('classes').select('id, program_id, institution_id, level_id').eq('is_active', true);
      const { data: allPrograms } = await sb.from('programs').select('id, name, institution_id, institutions(name, short_code)');
      const { data: allDbLevels } = await sb.from('levels').select('id, level_number');
      const nonLevelRec = (allDbLevels || []).find(l => l.level_number === 0);
      const level1Rec = (allDbLevels || []).find(l => l.level_number === 1);

      const totalOps = readyList.length;
      let currentOps = 0;

      for (const s of readyList) {
        currentOps++;
        updateLoadingProgress((currentOps / totalOps) * 100, `Saving student ${currentOps} of ${readyList.length}...`);

        // Determine appropriate level for student's program (Level 0 for Non-Level programs, Level 1 for tiered programs)
        const progObj = (allPrograms || []).find(p => p.id === s.progId);
        const isTopProg = progObj && (progObj.institutions?.short_code === 'TOP' || ['evnikom', 'sheraton', 'tamata'].includes((progObj.name || '').toLowerCase()));
        const isNonLevelProg = isTopProg || (allClasses || []).some(c => c.program_id === s.progId && nonLevelRec && c.level_id === nonLevelRec.id);
        const resolvedProgLevelId = isNonLevelProg ? (nonLevelRec?.id || null) : (level1Rec?.id || null);

        // 1. Auto-create batch if needed (or restore if soft-deleted)
        let resolvedBatchId = s.batchId || null;
        if (!resolvedBatchId && s.batchName && s.batchName !== '—' && s.progId) {
          const cacheKey = `${s.progId}::${s.batchName.toLowerCase().trim()}`;
          if (batchCache[cacheKey]) {
            resolvedBatchId = batchCache[cacheKey];
          } else {
            const { data: existingB } = await sb.from('batches')
              .select('id, deleted_at, is_active, current_level_id').eq('program_id', s.progId)
              .ilike('name', s.batchName.trim()).maybeSingle();
            if (existingB) {
              resolvedBatchId = existingB.id;
              const batchFixes = {};
              if (existingB.deleted_at || existingB.is_active === false) {
                batchFixes.deleted_at = null;
                batchFixes.is_active = true;
                batchFixes.updated_at = new Date().toISOString();
              }
              if (!existingB.current_level_id && resolvedProgLevelId) {
                batchFixes.current_level_id = resolvedProgLevelId;
              }
              if (Object.keys(batchFixes).length > 0) {
                await sb.from('batches').update(batchFixes).eq('id', existingB.id);
              }
            } else {
              const { data: newB } = await sb.from('batches').insert({
                program_id: s.progId,
                name: s.batchName.trim(),
                current_level_id: resolvedProgLevelId,
                is_active: true
              }).select('id').single();
              if (newB) resolvedBatchId = newB.id;
            }
            batchCache[cacheKey] = resolvedBatchId;
          }
        }

        const pinVal = s.pin || '1234';
        const pinHash = await sha256(pinVal);

        if (s.isExisting && s.existingId) {
          const updData = {
            pin: pinVal,
            pin_hash: pinHash,
            deleted_at: null,
            updated_at: new Date().toISOString()
          };
          if (resolvedBatchId) updData.batch_id = resolvedBatchId;
          if (resolvedProgLevelId) updData.level_id = resolvedProgLevelId;
          if (s.gender) updData.gender = s.gender;
          if (s.birthDate) updData.birth_date = s.birthDate;
          if (s.province) updData.province = s.province;
          if (s.city) updData.city = s.city;

          let { error: updErr } = await sb.from('students').update(updData).eq('id', s.existingId);
          if (updErr && (updData.province || updData.city)) {
            delete updData.province;
            delete updData.city;
            const retry = await sb.from('students').update(updData).eq('id', s.existingId);
            updErr = retry.error;
          }
          if (updErr) {
            console.warn(`[Bulk Import] Error updating student ${s.existingId} (${s.name}):`, updErr);
          }
          updatedCount++;
        } else {
          const insData = {
            name: s.name,
            institution_id: s.instId || null,
            program_id: s.progId || null,
            batch_id: resolvedBatchId,
            level_id: resolvedProgLevelId,
            gender: s.gender || null,
            birth_date: s.birthDate || null,
            pin: pinVal,
            pin_hash: pinHash,
            is_active: true,
            program_status: 'ACTIVE'
          };
          if (s.province) insData.province = s.province;
          if (s.city) insData.city = s.city;
          let created = null;
          let res = await sb.from('students').insert(insData).select('id').single();
          if (res.error && (insData.province || insData.city)) {
            delete insData.province;
            delete insData.city;
            res = await sb.from('students').insert(insData).select('id').single();
          }
          if (res.error) {
            console.warn(`[Bulk Import] Error inserting student "${s.name}":`, res.error);
          } else {
            created = res.data;
          }
          insertedCount++;
          if (created) s.existingId = created.id;
        }
      }

      // Initialize progression Level 1 strictly for active classes belonging to each student's exact program AND institution
      if (allClasses && allClasses.length > 0) {
        const progressPayload = [];
        for (const s of readyList) {
          if (s.existingId) {
            const studentProgId = s.progId || s.program_id;
            const studentInstId = s.instId || s.institution_id;
            const eligibleClasses = allClasses.filter(c => {
              const matchProg = c.program_id && c.program_id === studentProgId;
              const matchInst = !c.institution_id || !studentInstId || c.institution_id === studentInstId;
              return matchProg && matchInst;
            });
            for (const cls of eligibleClasses) {
              progressPayload.push({
                student_id: s.existingId,
                class_id: cls.id,
                unlocked_level: 1
              });
            }
          }
        }
        if (progressPayload.length > 0) {
          await sb.from('progress').upsert(progressPayload, { onConflict: 'student_id,class_id', ignoreDuplicates: true });
        }
      }

      clearAdminCache('batches');
      clearAdminCache('students');
      clearAdminCache('progress');

      hideLoading();
      showToast(`Success! ${insertedCount} new students enrolled, ${updatedCount} merged!`, 'success');
      previewCard.style.display = 'none';
      if (recentCard) recentCard.style.display = 'flex';
      fileInput.value = '';
      parsedStudents = [];
      if (fileNameDisplay) fileNameDisplay.style.display = 'none';
      await refreshRecentStudents();
    } catch (err) {
      hideLoading();
      showToast('Error saving students: ' + err.message, 'error');
    }
  });

  // --- Refresh Recent Students Helper ---
  const bindRecentEditClicks = () => {
    container.querySelectorAll('[data-edit-student-id]').forEach(cell => {
      cell.addEventListener('click', (e) => {
        const studentId = e.currentTarget.getAttribute('data-edit-student-id');
        const studentObj = recentStudents.find(s => s.id === studentId);
        if (studentObj && typeof window.openStudentFullEdit === 'function') {
          window.openStudentFullEdit(studentObj, () => refreshRecentStudents());
        }
      });
    });
  };

  async function refreshRecentStudents() {
    try {
      const fresh = await adminFetchAll('students', 'id, name, gender, birth_date, is_active, created_at, institution_id, program_id, batch_id, institutions(name), programs(name), batches!batch_id(name)');
      if (Array.isArray(fresh)) {
        recentStudents = fresh;
        const latest = recentStudents.filter(s => s && !s.deleted_at).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 10);
        const tbody = document.getElementById('indiv-recent-tbody');
        if (tbody) {
          tbody.innerHTML = renderRecentRowsHtml(latest);
          bindRecentEditClicks();
        }
      }
    } catch (err) {
      console.warn('[refreshRecentStudents] Failed:', err);
    }
  }

  bindRecentEditClicks();

  // --- Individual Cascading Dropdown Logic ---
  const instEl = document.getElementById('indiv-inst');
  const progEl = document.getElementById('indiv-prog');
  const batchEl = document.getElementById('indiv-batch');

  const updateBatchDropdown = (selectedProgId) => {
    batchEl.innerHTML = `<option value="">— Select Batch —</option>`;
    if (!selectedProgId) {
      batchEl.disabled = true;
      batchEl.innerHTML = `<option value="">— Select Program First —</option>`;
      return;
    }
    batchEl.disabled = false;
    const filtered = sortedBatches.filter(b => b.program_id === selectedProgId);
    filtered.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name;
      batchEl.appendChild(opt);
    });
  };

  instEl?.addEventListener('change', () => {
    const selInst = instEl.value;
    let visibleCount = 0;
    let lastProg = null;
    Array.from(progEl.options).forEach(opt => {
      if (!opt.value) return;
      const optInst = opt.getAttribute('data-inst');
      const isVis = (!selInst || optInst === selInst);
      opt.style.display = isVis ? '' : 'none';
      if (isVis) {
        visibleCount++;
        lastProg = opt.value;
      }
    });
    if (selInst && progEl.selectedOptions[0]?.style.display === 'none') {
      progEl.value = '';
    }
    if (visibleCount === 1 && selInst) {
      progEl.value = lastProg;
    }
    updateBatchDropdown(progEl.value);
  });

  progEl?.addEventListener('change', () => {
    updateBatchDropdown(progEl.value);
  });

  if (sortedInsts.length === 1 && instEl) {
    instEl.value = sortedInsts[0].id;
    instEl.dispatchEvent(new Event('change'));
  }

  // --- Inline Quick New Batch ---
  document.getElementById('btn-quick-new-batch')?.addEventListener('click', async () => {
    const progId = progEl.value;
    if (!progId) {
      showToast('Please select a Program first before creating a batch.', 'warning');
      return;
    }
    const batchName = prompt('Enter new Batch name (e.g. Batch 99):');
    if (!batchName || !batchName.trim()) return;

    try {
      showLoading('Creating new batch…');
      const created = await adminInsert('batches', {
        program_id: progId,
        name: batchName.trim(),
        is_active: true
      });
      sortedBatches.push(created);
      clearAdminCache('batches');
      hideLoading();
      showToast(`Batch "${created.name}" created!`, 'success');
      updateBatchDropdown(progId);
      batchEl.value = created.id;
    } catch (err) {
      hideLoading();
      showToast('Could not create batch: ' + err.message, 'error');
    }
  });

  // --- Open Full Edit Modal Shortcut ---
  document.getElementById('btn-open-modal-add')?.addEventListener('click', () => {
    if (typeof window.openStudentFullEdit === 'function') {
      window.openStudentFullEdit(null, () => renderIndividualRegView(container));
    } else {
      showToast('Modal editor unavailable.', 'error');
    }
  });

  // --- Clear Form Button ---
  document.getElementById('btn-reset-indiv-form')?.addEventListener('click', () => {
    document.getElementById('indiv-name').value = '';
    document.getElementById('indiv-gender').value = '';
    document.getElementById('indiv-birth').value = '';
    document.getElementById('indiv-pin').value = '1234';
  });

  // --- Register Student Form Submit ---
  const saveBtn = document.getElementById('btn-save-indiv-student');
  saveBtn?.addEventListener('click', async () => {
    const rawName = document.getElementById('indiv-name').value.trim();
    if (!rawName) {
      showToast('Student full name is required.', 'error');
      document.getElementById('indiv-name').focus();
      return;
    }

    const instId = instEl.value;
    const progId = progEl.value;
    const batchId = batchEl.value;

    if (!instId) {
      showToast('Please select a Target Institution.', 'warning');
      instEl.focus();
      return;
    }

    if (!progId) {
      showToast('Please select a Target Program.', 'warning');
      progEl.focus();
      return;
    }

    // Verify program strictly belongs to the selected institution
    const selectedProg = sortedProgs.find(p => p.id === progId);
    if (selectedProg && selectedProg.institution_id && selectedProg.institution_id !== instId) {
      showToast('Selected Program does not belong to the selected Institution.', 'error');
      progEl.focus();
      return;
    }

    if (!batchId) {
      showToast('Please select or create an assigned Batch.', 'warning');
      batchEl.focus();
      return;
    }

    const gender = document.getElementById('indiv-gender').value || null;
    const birthDate = document.getElementById('indiv-birth').value || null;
    const pin = document.getElementById('indiv-pin').value.trim() || '1234';
    const isActive = document.getElementById('indiv-active').value === 'true';

    // Rule 2.23: Clean student name stored in database without honorific prefix
    const formattedName = cleanStudentName(rawName);

    saveBtn.disabled = true;
    saveBtn.textContent = 'Registering…';

    try {
      const sb = await getSupabase();

      // Check duplicate student within the same institution AND program
      const normNew = normalizeStudentNameForMatch(rawName);
      let dupQuery = sb.from('students')
        .select('id, name')
        .eq('program_id', progId)
        .is('deleted_at', null);
      if (instId) {
        dupQuery = dupQuery.eq('institution_id', instId);
      }
      const { data: existingRows } = await dupQuery;

      const dup = (existingRows || []).find(r => normalizeStudentNameForMatch(r.name) === normNew);
      if (dup) {
        showToast(`Student "${dup.name}" is already registered in this institution & program.`, 'warning');
        saveBtn.disabled = false;
        saveBtn.textContent = '✓ Register Student';
        return;
      }

      const pinHash = await sha256(pin);

      const insPayload = {
        name: formattedName,
        institution_id: instId || null,
        program_id: progId,
        batch_id: batchId,
        gender,
        birth_date: birthDate,
        province: 'Nusa Tenggara Barat',
        city: 'Kota Mataram',
        pin: pin,
        pin_hash: pinHash,
        is_active: isActive,
        program_status: isActive ? 'ACTIVE' : 'INACTIVE'
      };

      let createdStudent = null;
      try {
        const res = await sb.from('students').insert(insPayload).select('id, name, created_at, is_active, programs(name), batches!batch_id(name)').single();
        if (res.error) throw res.error;
        createdStudent = res.data;
      } catch (_) {
        delete insPayload.province;
        delete insPayload.city;
        const res = await sb.from('students').insert(insPayload).select('id, name, created_at, is_active, programs(name), batches!batch_id(name)').single();
        if (res.error) throw res.error;
        createdStudent = res.data;
      }

      // Initialize Progress (Level 1) strictly for active classes belonging to student's exact program and institution
      let classQ = sb.from('classes')
        .select('id')
        .eq('is_active', true)
        .eq('program_id', createdStudent.program_id);
      if (createdStudent.institution_id) {
        classQ = classQ.or(`institution_id.eq.${createdStudent.institution_id},institution_id.is.null`);
      }
      const { data: progClasses } = await classQ;
      if (progClasses && progClasses.length > 0 && createdStudent) {
        const progressRows = progClasses.map(c => ({
          student_id: createdStudent.id,
          class_id: c.id,
          unlocked_level: 1
        }));
        await sb.from('progress').upsert(progressRows, { onConflict: 'student_id,class_id', ignoreDuplicates: true });
      }

      clearAdminCache('students');
      clearAdminCache('batches');
      clearAdminCache('progress');

      showToast(`Student "${formattedName}" registered successfully!`, 'success');

      // Clear input fields for next entry
      document.getElementById('indiv-name').value = '';
      document.getElementById('indiv-gender').value = '';
      document.getElementById('indiv-birth').value = '';
      document.getElementById('indiv-pin').value = '1234';
      document.getElementById('indiv-name').focus();

      // Refresh recent students table in-place
      await refreshRecentStudents();
    } catch (err) {
      showToast('Registration failed: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '✓ Register Student';
    }
  });

  document.getElementById('btn-refresh-recent')?.addEventListener('click', () => {
    refreshRecentStudents();
  });

  if (typeof window.setBottomInfobar === 'function') {
    const leftHtml = `
      <div style="display:flex;align-items:center;gap:12px;font-size:12px;color:#94a3b8;font-weight:600;">
        <span><strong style="color:#f8fafc;">Domain B</strong> · Student Ingestion Engine</span>
        <span>·</span>
        <span style="color:#38bdf8;font-weight:700;">Unified Registration</span>
      </div>
    `;
    const rightHtml = `
      <div style="display:flex;align-items:center;gap:8px;">
        <button type="button" class="btn btn-secondary btn-sm" id="btn-export-students-csv" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:600;display:inline-flex;align-items:center;gap:5px;border-radius:4px;cursor:pointer;">
          ${getSvgIcon('download', 14)} Export CSV
        </button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-dl-student-template" style="height:30px !important;min-height:30px !important;max-height:30px !important;line-height:28px !important;padding:0 12px !important;font-size:12px !important;font-weight:600;display:inline-flex;align-items:center;gap:5px;border-radius:4px;cursor:pointer;">
          ${getSvgIcon('download', 14)} Template (.xlsx)
        </button>
        <button type="button" class="btn btn-secondary btn-sm" id="btn-subpanel-reset-form" style="height:30px !important;font-size:12px;padding:0 12px !important;">Clear Form</button>
        <button type="button" class="btn btn-primary btn-sm" id="btn-subpanel-save-student" style="height:30px !important;font-size:12px;font-weight:700;display:inline-flex;align-items:center;gap:5px;border-radius:4px;">
          ${getSvgIcon('user-plus', 14)} Register Student
        </button>
      </div>
    `;
    window.setBottomInfobar(leftHtml, rightHtml);
    document.getElementById('btn-dl-student-template')?.addEventListener('click', () => {
      if (typeof XLSX === 'undefined') {
        showToast('SheetJS is not loaded yet.', 'error');
        return;
      }
      const sampleData = [
        { 'INSTITUTION': 'CEC', 'PROGRAM': 'Camp', 'BATCH': 'Batch 01', 'NAME': 'Jane Doe', 'GENDER': 'female', 'PIN': '1234' },
        { 'INSTITUTION': 'CEC', 'PROGRAM': 'Camp', 'BATCH': 'Batch 01', 'NAME': 'John Smith', 'GENDER': 'male', 'PIN': '1234' },
        { 'INSTITUTION': 'CEC', 'PROGRAM': 'Hospitality', 'BATCH': 'Batch 02', 'NAME': 'Michael Scott', 'GENDER': 'male', 'PIN': '1234' }
      ];
      const ws = XLSX.utils.json_to_sheet(sampleData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Student Roster');
      XLSX.writeFile(wb, 'Template_Students_Registration.xlsx');
      showToast('Student template downloaded successfully.', 'success');
    });
    document.getElementById('btn-export-students-csv')?.addEventListener('click', async () => {
      if (typeof window.exportStudentsGradebook === 'function') {
        await window.exportStudentsGradebook();
      } else {
        showToast('Exporting student records...', 'info');
        try {
          const stds = await adminFetchAll('students', 'name, gender, birth_date, is_active, created_at, programs(name), batches!batch_id(name)');
          if (!stds || stds.length === 0) { showToast('No students to export.', 'warning'); return; }
          const exportRows = stds.map(s => ({
            'Name': s.name,
            'Gender': s.gender || '',
            'Program': s.programs?.name || '',
            'Batch': s.batches?.name || '',
            'Status': s.is_active ? 'Active' : 'Inactive',
            'Enrolled': s.created_at ? s.created_at.split('T')[0] : ''
          }));
          const ws = XLSX.utils.json_to_sheet(exportRows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Active Students');
          XLSX.writeFile(wb, `Students_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
          showToast('Export complete.', 'success');
        } catch (err) {
          showToast('Export failed: ' + err.message, 'error');
        }
      }
    });
    document.getElementById('btn-subpanel-reset-form')?.addEventListener('click', () => {
      document.getElementById('btn-reset-indiv-form')?.click();
    });
    document.getElementById('btn-subpanel-save-student')?.addEventListener('click', () => {
      document.getElementById('btn-save-indiv-student')?.click();
    });
  }
}

if (typeof window !== 'undefined') {
  window.renderStudentsRegistration = renderStudentsRegistration;
}
