// TOPS CORE — Student Registration Module (Domain B: Board)
// Handles Bulk Excel/CSV Ingestion and Individual Student Registration

import {
  adminFetchAll, adminInsert, adminUpdate, formatStudentName, cleanStudentName,
  normalizeStudentNameForMatch, clearAdminCache, sha256
} from '../api.js?v=5.3.2';
import { showToast, showLoading, hideLoading, updateLoadingProgress, escapeHtml, escHtml } from '../app.js?v=5.3.2';
import { getSupabase } from '../supabase.js?v=5.3.2';

export async function renderStudentsRegistration(area) {
  let activeTab = window._activeStudentRegTab || 'bulk';

  const regTabs = [
    { id: 'bulk', icon: '📥', title: 'Bulk Excel Import', label: 'Bulk Import (Excel / CSV)' },
    { id: 'individual', icon: '👤', title: 'Add Student (Individual)', label: 'Add Student (Individual)' }
  ];

  window._switchStudentRegTab = async (tabId) => {
    activeTab = tabId;
    window._activeStudentRegTab = tabId;
    if (window.setTopbarTabs) {
      window.setTopbarTabs(regTabs, activeTab, 'window._switchStudentRegTab');
    }
    const container = document.getElementById('student-reg-workspace');
    if (!container) return;
    if (tabId === 'bulk') {
      await renderBulkImportView(container);
    } else {
      await renderIndividualRegView(container);
    }
  };

  if (window.setTopbarTabs) {
    window.setTopbarTabs(regTabs, activeTab, 'window._switchStudentRegTab');
  }

  area.innerHTML = `
    <div id="student-reg-workspace" style="padding-top: 0.5rem;">
      <div class="spinner" style="margin: 2rem auto;"></div>
    </div>
  `;
  const container = document.getElementById('student-reg-workspace');

  if (activeTab === 'bulk') {
    await renderBulkImportView(container);
  } else {
    await renderIndividualRegView(container);
  }
}

// ============================================================
// TAB 1: BULK EXCEL / CSV IMPORT
// ============================================================
async function renderBulkImportView(container) {
  container.innerHTML = `<div class="spinner" style="margin: 2rem auto;"></div>`;

  let allInsts = [];
  let allProgs = [];
  let allBatches = [];

  try {
    const results = await Promise.allSettled([
      adminFetchAll('institutions'),
      adminFetchAll('programs'),
      adminFetchAll('batches')
    ]);
    allInsts = (results[0].status === 'fulfilled' && Array.isArray(results[0].value)) ? results[0].value : [];
    allProgs = (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) ? results[1].value : [];
    allBatches = (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) ? results[2].value : [];
  } catch (err) {
    console.warn('[renderBulkImportView] Lookup load failed:', err);
  }

  const sortedInsts = allInsts.filter(i => i && !i.deleted_at && i.is_active !== false).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const sortedProgs = allProgs.filter(p => p && !p.deleted_at && p.is_active !== false).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const sortedBatches = allBatches.filter(b => b && !b.deleted_at && b.is_active !== false).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  container.innerHTML = `
    <div class="section-header" style="flex-shrink: 0; margin-bottom: 1rem;">
      <div>
        <h2 class="section-title text-gradient" style="font-size: 1.4rem;">📥 Bulk Student Ingestion</h2>
        <p class="section-subtitle">Import student rosters from Excel (.xlsx / .xls) or CSV. PINs automatically default to <strong>1234</strong> (SHA-256 hashed).</p>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-secondary btn-sm" id="btn-export-students-csv">📊 Export CSV</button>
        <button class="btn btn-primary btn-sm" id="btn-dl-student-template">📥 Download Excel Template (.xlsx)</button>
      </div>
    </div>

    <div class="d-flex flex-wrap gap-4 align-stretch" style="margin-bottom: 1.5rem;">
      <!-- UPLOAD & OVERRIDES CARD -->
      <div class="glass-card p-5" style="flex: 1; min-width: 320px; max-width: 520px; display: flex; flex-direction: column; gap: 1rem;">
        <h3 style="font-size: 1rem; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 8px;">
          <span>⚙️</span> Target Scope (Default / Override)
        </h3>

        <div class="form-group mb-2">
          <label class="form-label" style="font-size: 0.78rem;">1. Target Institution</label>
          <select class="form-control" id="bulk-inst-select">
            <option value="">— Use Institution from Spreadsheet —</option>
            ${sortedInsts.map(i => `<option value="${i.id}">${escapeHtml(i.name)}</option>`).join('')}
          </select>
          <span class="text-muted text-xs mt-1" style="display:block;">Optionally force all rows into this Institution.</span>
        </div>

        <div class="form-group mb-2">
          <label class="form-label" style="font-size: 0.78rem;">2. Target Program</label>
          <select class="form-control" id="bulk-prog-select">
            <option value="">— Use Program from Spreadsheet —</option>
            ${sortedProgs.map(p => `<option value="${p.id}" data-inst="${p.institution_id}">${escapeHtml(p.name)}</option>`).join('')}
          </select>
          <span class="text-muted text-xs mt-1" style="display:block;">Optionally force all rows into this Program.</span>
        </div>

        <div class="form-group mb-3">
          <label class="form-label" style="font-size: 0.78rem;">3. Target Batch</label>
          <select class="form-control" id="bulk-batch-select" disabled>
            <option value="">— Select Program First —</option>
          </select>
          <span class="text-muted text-xs mt-1" style="display:block;">Optionally force all rows into this Batch.</span>
        </div>

        <!-- Interactive Drag & Drop Box -->
        <div class="student-reg-dropzone" id="bulk-dropzone">
          <input type="file" id="import-students-file" accept=".xlsx,.xls,.csv" style="display: none;" />
          <span class="student-reg-dropzone-icon">📁</span>
          <div style="font-size: 0.92rem; font-weight: 600; color: #fff;">Click to select or drag & drop file</div>
          <div style="font-size: 0.75rem; color: var(--fm-text-muted); margin-top: 4px;">Supports Excel (.xlsx, .xls) and CSV (.csv)</div>
          <div id="dropzone-file-name" style="margin-top: 8px; font-size: 0.8rem; font-weight: 700; color: #818cf8; display: none;"></div>
        </div>

        <!-- Format Guide -->
        <div class="p-3 rounded mt-2" style="background: rgba(99, 102, 241, 0.08); border: 1px solid rgba(99, 102, 241, 0.25);">
          <div class="d-flex align-center justify-between gap-2 mb-1">
            <span class="text-xs fw-700 text-gradient">SPREADSHEET COLUMN HEADERS</span>
            <span class="badge badge-info" style="font-size: 0.68rem;">Case-Insensitive</span>
          </div>
          <div class="text-xs text-muted d-flex flex-column gap-1" style="line-height: 1.4;">
            <div>&bull; <b>Required:</b> <code>INSTITUTION</code>, <code>PROGRAM</code>, <code>BATCH</code>, <code>NAME</code></div>
            <div>&bull; <b>Optional:</b> <code>GENDER</code> (male/female), <code>BIRTH_DATE</code> (YYYY-MM-DD), <code>PIN</code></div>
            <div>&bull; <b>Pacing:</b> Students will auto-unlock <b>Level 1</b> across all active classes.</div>
          </div>
        </div>
      </div>

      <!-- PREVIEW & CONFIRM CARD -->
      <div class="glass-card p-5" id="bulk-preview-card" style="flex: 2; min-width: 400px; display: none; flex-direction: column;">
        <div class="d-flex align-center justify-between flex-wrap gap-3 pb-3 mb-3" style="border-bottom: 1px solid rgba(255, 255, 255, 0.08);">
          <div>
            <h3 style="font-size: 1.1rem; font-weight: 700; color: #fff; margin: 0;">Spreadsheet Preview</h3>
            <p class="text-xs text-muted" id="preview-row-count" style="margin: 2px 0 0 0;">0 students loaded from file</p>
          </div>
          <div class="d-flex align-center gap-2">
            <button class="btn btn-secondary btn-sm" id="btn-cancel-preview">Cancel</button>
            <button class="btn btn-primary btn-sm" id="btn-confirm-save">✓ Confirm &amp; Save Students</button>
          </div>
        </div>

        <!-- Summary Chips -->
        <div class="d-flex gap-2 flex-wrap mb-3" id="preview-summary-chips">
          <span class="badge badge-info" id="chip-total">Total: 0</span>
          <span class="badge badge-success" id="chip-new">✨ New: 0</span>
          <span class="badge badge-warning" id="chip-merge">🔄 Merge: 0</span>
        </div>

        <div class="table-wrap table-compact" style="flex: 1; max-height: 480px; overflow-y: auto;">
          <table class="data-table" style="width: 100%;">
            <thead>
              <tr>
                <th style="width: 38px; text-align: center;">#</th>
                <th>Student Name</th>
                <th>Institution</th>
                <th>Program</th>
                <th>Batch</th>
                <th style="width: 70px; text-align: center;">PIN</th>
                <th style="width: 90px; text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody id="bulk-preview-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `;

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

  // --- Download Template ---
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

  // --- Export CSV ---
  document.getElementById('btn-export-students-csv')?.addEventListener('click', async () => {
    if (typeof window.exportStudentsGradebook === 'function') {
      await window.exportStudentsGradebook();
    } else {
      showToast('Exporting student records...', 'info');
      try {
        const stds = await adminFetchAll('students', 'name, gender, birth_date, is_active, created_at, programs(name), batches(name)');
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
          existingStudents = await adminFetchAll('students', 'id, name, program_id, deleted_at');
        } catch (err) {
          console.warn('Duplicate check lookup failed:', err);
        }
        const existingMap = new Map();
        (existingStudents || []).forEach(s => {
          if (s && !s.deleted_at) {
            const norm = normalizeStudentNameForMatch(s.name);
            existingMap.set(`${norm}::${s.program_id}`, s);
            if (!existingMap.has(norm)) existingMap.set(norm, s);
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

          const normName = normalizeStudentNameForMatch(rawName);
          const lookupKey = `${normName}::${finalProgId}`;
          const existingDb = existingMap.get(lookupKey) || (finalProgId ? existingMap.get(normName) : null);

          let status = 'valid';
          let statusBadge = '<span class="status-dot-badge"><span class="status-dot dot-success"></span>New</span>';
          let isExisting = false;
          let existingId = null;

          if (!finalProgId) {
            status = 'error';
            statusBadge = '<span class="status-dot-badge"><span class="status-dot dot-locked"></span>No Prog</span>';
          } else if (existingDb) {
            status = 'merge';
            statusBadge = '<span class="status-dot-badge"><span class="status-dot dot-warning"></span>Merge</span>';
            isExisting = true;
            existingId = existingDb.id;
          }

          const item = {
            no: idx + 1,
            name: formatStudentName(rawName, rawGender),
            gender: rawGender || null,
            birthDate: rawBirth || null,
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

          rowMap.set(lookupKey, item);
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
    if (chipNew) chipNew.textContent = `✨ New: ${newCount}`;
    if (chipMerge) chipMerge.textContent = `🔄 Merge: ${mergeCount}`;

    if (!tbody) return;
    tbody.innerHTML = parsedStudents.map(s => `
      <tr style="${s.status === 'error' ? 'background: rgba(239, 68, 68, 0.08);' : ''}">
        <td style="text-align: center; color: var(--fm-text-muted);">${s.no}</td>
        <td style="font-weight: 600; color: #fff;">${escapeHtml(s.name)}</td>
        <td>${escapeHtml(s.instName)}</td>
        <td>${escapeHtml(s.progName)}</td>
        <td>${escapeHtml(s.batchName)}</td>
        <td style="text-align: center;"><code>${escapeHtml(s.pin)}</code></td>
        <td style="text-align: center;">${s.statusBadge}</td>
      </tr>
    `).join('');
  };

  // --- Cancel Preview ---
  document.getElementById('btn-cancel-preview')?.addEventListener('click', () => {
    previewCard.style.display = 'none';
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

      const { data: allClasses } = await sb.from('classes').select('id').eq('is_active', true);
      const totalOps = readyList.length;
      let currentOps = 0;

      for (const s of readyList) {
        currentOps++;
        updateLoadingProgress((currentOps / totalOps) * 100, `Saving student ${currentOps} of ${readyList.length}...`);

        // 1. Auto-create batch if needed
        let resolvedBatchId = s.batchId || null;
        if (!resolvedBatchId && s.batchName && s.batchName !== '—' && s.progId) {
          const cacheKey = `${s.progId}::${s.batchName.toLowerCase().trim()}`;
          if (batchCache[cacheKey]) {
            resolvedBatchId = batchCache[cacheKey];
          } else {
            const { data: existingB } = await sb.from('batches')
              .select('id').eq('program_id', s.progId)
              .ilike('name', s.batchName.trim()).maybeSingle();
            if (existingB) {
              resolvedBatchId = existingB.id;
            } else {
              const { data: newB } = await sb.from('batches').insert({
                program_id: s.progId,
                name: s.batchName.trim(),
                is_active: true
              }).select('id').single();
              if (newB) resolvedBatchId = newB.id;
            }
            batchCache[cacheKey] = resolvedBatchId;
          }
        }

        const pinHash = await sha256(s.pin || '1234');

        if (s.isExisting && s.existingId) {
          await sb.from('students').update({
            batch_id: resolvedBatchId,
            pin_hash: pinHash,
            is_active: true,
            deleted_at: null,
            updated_at: new Date().toISOString()
          }).eq('id', s.existingId);
          updatedCount++;
        } else {
          const { data: created, error: insertErr } = await sb.from('students').insert({
            name: s.name,
            institution_id: s.instId || null,
            program_id: s.progId || null,
            batch_id: resolvedBatchId,
            gender: s.gender || null,
            birth_date: s.birthDate || null,
            pin_hash: pinHash,
            is_active: true
          }).select('id').single();

          if (insertErr) throw insertErr;
          insertedCount++;
          if (created) s.existingId = created.id;
        }
      }

      // Initialize progression Level 1 for active classes
      if (allClasses && allClasses.length > 0) {
        const progressPayload = [];
        for (const s of readyList) {
          if (s.existingId) {
            for (const cls of allClasses) {
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
      fileInput.value = '';
      parsedStudents = [];
      if (fileNameDisplay) fileNameDisplay.style.display = 'none';
    } catch (err) {
      hideLoading();
      showToast('Error saving students: ' + err.message, 'error');
    }
  });
}

// ============================================================
// TAB 2: INDIVIDUAL STUDENT REGISTRATION
// ============================================================
async function renderIndividualRegView(container) {
  container.innerHTML = `<div class="spinner" style="margin: 2rem auto;"></div>`;

  let allInsts = [];
  let allProgs = [];
  let allBatches = [];
  let recentStudents = [];

  try {
    const results = await Promise.allSettled([
      adminFetchAll('institutions'),
      adminFetchAll('programs'),
      adminFetchAll('batches'),
      adminFetchAll('students', 'id, name, gender, birth_date, is_active, created_at, institution_id, program_id, batch_id, institutions(name), programs(name), batches(name)')
    ]);
    allInsts = (results[0].status === 'fulfilled' && Array.isArray(results[0].value)) ? results[0].value : [];
    allProgs = (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) ? results[1].value : [];
    allBatches = (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) ? results[2].value : [];
    recentStudents = (results[3].status === 'fulfilled' && Array.isArray(results[3].value)) ? results[3].value : [];
  } catch (err) {
    console.warn('[renderIndividualRegView] Data load failed:', err);
  }

  const sortedInsts = allInsts.filter(i => i && !i.deleted_at && i.is_active !== false).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const sortedProgs = allProgs.filter(p => p && !p.deleted_at && p.is_active !== false).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const sortedBatches = allBatches.filter(b => b && !b.deleted_at && b.is_active !== false).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  // Sort recent students by creation descending
  const recentList = recentStudents.filter(s => s && !s.deleted_at).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')).slice(0, 10);

  container.innerHTML = `
    <div class="section-header" style="flex-shrink: 0; margin-bottom: 1rem;">
      <div>
        <h2 class="section-title text-gradient" style="font-size: 1.4rem;">👤 Individual Student Registration</h2>
        <p class="section-subtitle">Enroll an individual student directly into an institution, program, and batch with instant credentials.</p>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-secondary btn-sm" id="btn-open-modal-add">🗂️ Open Full Edit Modal</button>
      </div>
    </div>

    <!-- MAIN REGISTRATION FORM -->
    <div class="glass-card p-5 mb-5" style="max-width: 900px;">
      <h3 style="font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 8px;">
        <span>📝</span> New Student Details
      </h3>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem 1.25rem;">
        <!-- Full Name -->
        <div class="form-group" style="grid-column: 1 / -1;">
          <label class="form-label" style="font-size: 0.78rem;">Full Name <span style="color: #ef4444;">*</span></label>
          <input type="text" class="form-control" id="indiv-name" placeholder="e.g. Johnathan Doe" autocomplete="off" />
        </div>

        <!-- Gender / Honorific -->
        <div class="form-group">
          <label class="form-label" style="font-size: 0.78rem;">Honorific &amp; Gender</label>
          <select class="form-control" id="indiv-gender">
            <option value="">— Unassigned —</option>
            <option value="male">Mr. (Male)</option>
            <option value="female">Miss (Female)</option>
          </select>
        </div>

        <!-- Date of Birth -->
        <div class="form-group">
          <label class="form-label" style="font-size: 0.78rem;">Date of Birth</label>
          <input type="date" class="form-control" id="indiv-birth" />
        </div>

        <!-- Institution -->
        <div class="form-group">
          <label class="form-label" style="font-size: 0.78rem;">Institution <span style="color: #ef4444;">*</span></label>
          <select class="form-control" id="indiv-inst">
            <option value="">— Select Institution —</option>
            ${sortedInsts.map(i => `<option value="${i.id}">${escapeHtml(i.name)}</option>`).join('')}
          </select>
        </div>

        <!-- Program -->
        <div class="form-group">
          <label class="form-label" style="font-size: 0.78rem;">Program <span style="color: #ef4444;">*</span></label>
          <select class="form-control" id="indiv-prog">
            <option value="">— Select Program —</option>
            ${sortedProgs.map(p => `<option value="${p.id}" data-inst="${p.institution_id}">[${escapeHtml(p.name)}]</option>`).join('')}
          </select>
        </div>

        <!-- Batch -->
        <div class="form-group">
          <div class="d-flex align-center justify-between mb-1">
            <label class="form-label" style="font-size: 0.78rem; margin: 0;">Batch <span style="color: #ef4444;">*</span></label>
            <button type="button" class="btn btn-ghost btn-xs text-primary" id="btn-quick-new-batch" style="padding: 0; font-size: 0.72rem;">+ New Batch</button>
          </div>
          <select class="form-control" id="indiv-batch" disabled>
            <option value="">— Select Program First —</option>
          </select>
        </div>

        <!-- PIN -->
        <div class="form-group">
          <label class="form-label" style="font-size: 0.78rem;">Personal PIN <span style="color: #ef4444;">*</span></label>
          <input type="text" class="form-control" id="indiv-pin" value="1234" autocomplete="new-password" />
          <span class="text-muted text-xs mt-1" style="display:block;">Default preset is 1234 (hashed on save).</span>
        </div>

        <!-- Account Status -->
        <div class="form-group">
          <label class="form-label" style="font-size: 0.78rem;">Account Status</label>
          <select class="form-control" id="indiv-active">
            <option value="true">Active (Eligible for tests)</option>
            <option value="false">Inactive / Suspended</option>
          </select>
        </div>
      </div>

      <div class="d-flex align-center gap-3 mt-4 pt-3" style="border-top: 1px solid rgba(255, 255, 255, 0.08);">
        <button class="btn btn-primary btn-sm" id="btn-save-indiv-student" style="min-width: 150px;">✓ Register Student</button>
        <button class="btn btn-ghost btn-sm" id="btn-reset-indiv-form">Clear Form</button>
      </div>
    </div>

    <!-- RECENTLY REGISTERED STUDENTS TABLE -->
    <div class="glass-card p-5" style="max-width: 900px;">
      <div class="d-flex align-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h3 style="font-size: 1rem; font-weight: 700; color: #fff; margin: 0;">📋 Recently Registered Students</h3>
          <p class="text-xs text-muted" style="margin: 2px 0 0 0;">Latest 10 enrolled students in TopsCore</p>
        </div>
        <button class="btn btn-ghost btn-xs" id="btn-refresh-recent">🔄 Refresh List</button>
      </div>

      <div class="table-wrap table-compact sticky-first">
        <table class="data-table" style="width: 100%;">
          <thead>
            <tr>
              <th style="width: 38px; text-align: center;">#</th>
              <th>Student Name</th>
              <th>Program</th>
              <th>Batch</th>
              <th style="width: 95px; text-align: center;">Status</th>
              <th style="width: 90px; text-align: center;">Enrolled</th>
              <th style="width: 80px; text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody id="indiv-recent-tbody">
            ${recentList.length === 0 ? `
              <tr>
                <td colspan="7">
                  <div class="smart-empty-state">
                    <span class="smart-empty-icon">👥</span>
                    <div class="smart-empty-title">No students registered yet</div>
                    <div class="smart-empty-subtext">Use the registration form above to enroll your first student.</div>
                  </div>
                </td>
              </tr>
            ` : recentList.map((s, idx) => `
              <tr>
                <td style="text-align: center; color: var(--fm-text-muted);">${idx + 1}</td>
                <td style="font-weight: 600; color: #fff;">${escapeHtml(s.name)}</td>
                <td>${escapeHtml(s.programs?.name || '—')}</td>
                <td>${escapeHtml(s.batches?.name || '—')}</td>
                <td style="text-align: center;">
                  <span class="status-dot-badge">
                    <span class="status-dot ${s.is_active ? 'dot-success' : 'dot-draft'}"></span>
                    ${s.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style="text-align: center; font-size: 0.75rem; color: var(--fm-text-muted);">
                  ${s.created_at ? s.created_at.split('T')[0] : '—'}
                </td>
                <td style="text-align: center;">
                  <button class="btn btn-ghost btn-xs text-primary btn-edit-student" data-id="${s.id}" title="Edit Profile">✏️ Edit</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // --- Cascading Dropdown Logic ---
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

    if (!progId) {
      showToast('Please select a Target Program.', 'warning');
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

    const formattedName = formatStudentName(rawName, gender);

    saveBtn.disabled = true;
    saveBtn.textContent = 'Registering…';

    try {
      const sb = await getSupabase();

      // Check duplicate student in program
      const normNew = normalizeStudentNameForMatch(rawName);
      const { data: existingRows } = await sb.from('students')
        .select('id, name')
        .eq('program_id', progId)
        .is('deleted_at', null);

      const dup = (existingRows || []).find(r => normalizeStudentNameForMatch(r.name) === normNew);
      if (dup) {
        showToast(`Student "${dup.name}" is already registered in this program.`, 'warning');
        saveBtn.disabled = false;
        saveBtn.textContent = '✓ Register Student';
        return;
      }

      const pinHash = await sha256(pin);

      const { data: createdStudent, error: insertErr } = await sb.from('students').insert({
        name: formattedName,
        institution_id: instId || null,
        program_id: progId,
        batch_id: batchId,
        gender,
        birth_date: birthDate,
        pin_hash: pinHash,
        is_active: isActive
      }).select('id, name, created_at, is_active, programs(name), batches(name)').single();

      if (insertErr) throw insertErr;

      // Initialize Progress (Level 1) across all active classes
      const { data: allClasses } = await sb.from('classes').select('id').eq('is_active', true);
      if (allClasses && allClasses.length > 0 && createdStudent) {
        const progressRows = allClasses.map(c => ({
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

      // Reload view to update recent list
      await renderIndividualRegView(container);
    } catch (err) {
      showToast('Registration failed: ' + err.message, 'error');
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = '✓ Register Student';
    }
  });

  // --- Bind Edit Buttons in Recent Table ---
  container.querySelectorAll('.btn-edit-student').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const studentId = e.currentTarget.getAttribute('data-id');
      const studentObj = recentStudents.find(s => s.id === studentId);
      if (studentObj && typeof window.openStudentFullEdit === 'function') {
        window.openStudentFullEdit(studentObj, () => renderIndividualRegView(container));
      }
    });
  });

  document.getElementById('btn-refresh-recent')?.addEventListener('click', () => {
    renderIndividualRegView(container);
  });
}
