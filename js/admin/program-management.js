import { adminFetchAll, adminUpdate, adminInsert, adminSoftDelete, clearAdminCache } from '../api.js?v=5.2.2';
import { showToast, escapeHtml, escHtml } from '../app.js?v=5.2.2';
import { DataGrid } from './datagrid.js?v=5.2.2';

window.makeTableResizable = function(table, storageKey) {
  const cols = table.querySelectorAll('th');
  const savedWidths = JSON.parse(localStorage.getItem(storageKey) || '{}');
  
  [].forEach.call(cols, function (col, idx) {
    if (savedWidths[idx]) {
      col.style.width = savedWidths[idx];
    }
    
    const resizer = document.createElement('div');
    resizer.classList.add('col-resizer');
    col.appendChild(resizer);
    col.style.position = 'relative';

    let x = 0;
    let w = 0;

    const mouseDownHandler = function (e) {
      x = e.clientX;
      const styles = window.getComputedStyle(col);
      w = parseInt(styles.width, 10);
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
      resizer.classList.add('active');
    };

    const mouseMoveHandler = function (e) {
      const dx = e.clientX - x;
      col.style.width = `${w + dx}px`;
    };

    const mouseUpHandler = function () {
      resizer.classList.remove('active');
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
      
      // Save widths
      const currentWidths = {};
      [].forEach.call(cols, function (c, i) {
        currentWidths[i] = c.style.width;
      });
      localStorage.setItem(storageKey, JSON.stringify(currentWidths));
    };

    resizer.addEventListener('mousedown', mouseDownHandler);
  });
};



// escapeHtml / escHtml imported canonically
if (typeof window !== 'undefined' && !window.DataGrid) window.DataGrid = DataGrid;

let programsGrid, batchesGrid;

/**
 * Renders the Programs (Classes) section
 */
export async function renderClasses(area) {
  const [rawPrograms, institutions] = await Promise.all([
    adminFetchAll('programs', '*, institutions(name)'),
    adminFetchAll('institutions')
  ]);
  const instMap = new Map((institutions || []).map(i => [i.id, i.name]));
  const rawData = (rawPrograms || []).map(p => ({
    ...p,
    institutions: p.institutions || { name: instMap.get(p.institution_id) || '' }
  }));
  
  // Sort by Institution Name (A-Z), then Program Name (A-Z)
  const data = [...rawData].sort((a, b) => {
    const pA = a.institutions?.name || '';
    const pB = b.institutions?.name || '';
    return pA.localeCompare(pB) || (a.name || '').localeCompare(b.name || '');
  });

  const filteredData = window._filterInstitutionId
    ? data.filter(r => r.institution_id === window._filterInstitutionId)
    : data;

  area.innerHTML = `
    <div class="section-header d-flex justify-between align-center">
      <div>
        <h2 class="section-title">Programs <span class="count-chip">${filteredData.length} Total</span></h2>
        <p class="section-subtitle">Manage student classrooms ordered alphabetically by program and name</p>
      </div>
      <div>
        <button class="btn btn-primary btn-sm" id="programs-add-shortcut">+ Add Program</button>
      </div>
    </div>
    
    ${window._filterInstitutionId ? `
      <div class="mb-3 p-2 rounded d-flex align-center justify-between" style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);color:#93c5fd;font-size:0.85rem;">
        <span>🏛️ Filtered by Institution: <strong>${escapeHtml(window._filterInstitutionName || 'Selected Institution')}</strong> (${filteredData.length} programs)</span>
        <button class="btn btn-ghost btn-xs" onclick="window._filterInstitutionId=null; window._filterInstitutionName=null; window.loadSection('programs');" style="text-decoration:underline;color:#93c5fd;">Show All Institutions</button>
      </div>
    ` : ''}

    <div id="programs-grid-container" class="card" style="padding:1rem;"></div>
  `;

  // Bind Buttons
  const addBtn = document.getElementById('programs-add-shortcut');
  if (addBtn) addBtn.onclick = () => window.openCrudModal('programs', null);

  const gridData = filteredData.map(r => ({
    id: r.id,
    institutionName: r.institutions?.name || '-',
    name: r.name,
    status: r.is_active ? 'Active' : 'Inactive',
    _raw: r
  }));

  programsGrid = new (DataGrid || window.DataGrid)({
    container: 'programs-grid-container',
    data: gridData,
    pageSize: 50,
    searchKeys: ['institutionName', 'name'],
    bulkActions: true,
    onRowClick: (row) => {
      const body = `
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <h4 style="margin:0; font-size:1.2rem;">${escapeHtml(row.name)}</h4>
            <div class="text-muted text-sm">Status: <strong class="${row?._raw?.is_active ? 'text-success' : 'text-muted'}">${row.status}</strong></div>
          </div>
          <hr style="border-color:var(--fm-border-subtle); margin:0;">
          <div>
            <div class="text-sm text-muted mb-1">Institution</div>
            <div class="fw-600">${escapeHtml(row.institutionName)}</div>
          </div>
          <div>
            <div class="text-sm text-muted mb-1">Details</div>
            <div class="text-sm">More details about this program would go here.</div>
          </div>
        </div>
      `;
      const footer = `
        <button class="btn btn-secondary" onclick="closeRecordDrawer()">Close</button>
        <button class="btn btn-outline" onclick='window._filterProgramId="${row.id}"; window._filterProgramName="${escapeHtml(row.name)}"; window.loadSection("batches"); closeRecordDrawer();'>View Batches</button>
        <button class="btn btn-primary" onclick='window._editRecord("programs", "${row.id}", ${JSON.stringify(JSON.stringify(row._raw))}); closeRecordDrawer();'>Edit Program</button>
      `;
      if (window.openRecordDrawer) window.openRecordDrawer('Program Details', body, footer);
    },
    columns: [
      { 
        key: 'institutionName', 
        label: 'Institution', 
        sortable: true, 
        render: (val, row) => { 
          const nameStr = row?._raw?.institutions?.name || row?._raw?.institution_name || 'N/A';
          return escapeHtml(String(nameStr)); 
        } 
      },
      { 
        key: 'name', 
        label: 'Program Name', 
        sortable: true, 
        render: (val, row) => { 
          const nameStr = row?._raw?.name || row?._raw?.program_name || 'N/A';
          return `<span class="fw-600">${escapeHtml(String(nameStr))}</span>`; 
        } 
      },
      { key: 'status', label: 'Status', sortable: true, render: (val, row) => `<span class="badge ${row?._raw?.is_active ? 'badge-success' : 'badge-neutral'}">${val}</span>` },
      { 
        key: 'actions', 
        label: 'Actions', 
        sortable: false,
        render: (val, row) => {
          if (!row) return '';
          const rName = typeof row?.name === 'object' ? (row?.name?.name || JSON.stringify(row?.name)) : (row?.name || '');
          return `
          <div class="d-flex gap-2 justify-end">
            <button class="btn btn-outline btn-sm" onclick='window._filterProgramId="${row?.id || ''}"; window._filterProgramName="${escapeHtml(String(rName))}"; window.loadSection("batches");' title="View Batches in ${escapeHtml(String(rName))}">Batches &rarr;</button>
            <button class="btn btn-secondary btn-sm" onclick='window._editRecord("programs", "${row?.id || ''}", ${JSON.stringify(JSON.stringify(row?._raw || {}))})'>Edit</button>
            <button class="btn btn-danger btn-sm" onclick='window._deleteRecord("programs", "${row?.id || ''}", "${escapeHtml(String(rName))}")'>Delete</button>
          </div>
        `}
      }
    ]
  });
}

/**
 * Renders the Batches section
 */
export async function renderBatches(area) {
  const [rawData, allStudents] = await Promise.all([
    adminFetchAll('batches', '*, programs!program_id(name, institution_id, institutions!institution_id(name))'),
    adminFetchAll('students', 'id, is_active, batch_id')
  ]);

  // Sort by Program (A-Z), Class (A-Z), Batch Name (A-Z)
  const data = [...rawData].sort((a, b) => {
    const progA = a.programs?.institutions?.name || '';
    const progB = b.programs?.institutions?.name || '';
    if (progA !== progB) return progA.localeCompare(progB);
    const clsA = a.programs?.name || '';
    const clsB = b.programs?.name || '';
    if (clsA !== clsB) return clsA.localeCompare(clsB);
    return (a.name || '').localeCompare(b.name || '');
  });

  const filteredData = window._filterProgramId
    ? data.filter(r => r.program_id === window._filterProgramId)
    : data;

  area.innerHTML = `
    <div class="section-header d-flex justify-between align-center">
      <div>
        <h2 class="section-title">Batches <span class="count-chip">${filteredData.length} Total</span></h2>
        <p class="section-subtitle">Manage student batches ordered alphabetically by program, class, and name</p>
      </div>
      <div>
        <button class="btn btn-primary btn-sm" id="batches-add-shortcut">+ Add Batch</button>
      </div>
    </div>
    
    ${window._filterProgramId ? `
      <div class="mb-3 p-2 rounded d-flex align-center justify-between" style="background:rgba(59,130,246,0.1);border:1px solid rgba(59,130,246,0.3);color:#93c5fd;font-size:0.85rem;">
        <span>🏛️ Filtered by Program: <strong>${escapeHtml(window._filterProgramName || 'Selected Program')}</strong> (${filteredData.length} batches)</span>
        <button class="btn btn-ghost btn-xs" onclick="window._filterProgramId=null; window._filterProgramName=null; window.loadSection('batches');" style="text-decoration:underline;color:#93c5fd;">Show All Programs</button>
      </div>
    ` : ''}

    <div id="batches-grid-container" class="card" style="padding:1rem;"></div>
  `;

  const addBtn = document.getElementById('batches-add-shortcut');
  if (addBtn) addBtn.onclick = () => window.openCrudModal('batches', null);

  const gridData = filteredData.map(r => {
    const pName = r.programs?.institutions?.name || '-';
    const studentCount = allStudents.filter(s => s.batch_id === r.id && s.is_active).length;
    
    return {
      id: r.id,
      program: pName,
      name: r.name,
      studentCount,
      status: r.is_active ? 'Active' : 'Inactive',
      _raw: r
    };
  });

  batchesGrid = new (DataGrid || window.DataGrid)({
    container: 'batches-grid-container',
    data: gridData,
    pageSize: 50,
    searchKeys: ['program', 'name'],
    bulkActions: true,
    onRowClick: (row) => {
      const body = `
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <h4 style="margin:0; font-size:1.2rem;">${escapeHtml(row.name)}</h4>
            <div class="text-muted text-sm">Status: <strong class="${row?._raw?.is_active ? 'text-success' : 'text-muted'}">${row.status}</strong></div>
          </div>
          <hr style="border-color:var(--fm-border-subtle); margin:0;">
          <div>
            <div class="text-sm text-muted mb-1">Program</div>
            <div class="fw-600">${escapeHtml(row.program)}</div>
          </div>
          <div>
            <div class="text-sm text-muted mb-1">Enrollment</div>
            <div class="fw-600">${row.studentCount} Active Students</div>
          </div>
        </div>
      `;
      const footer = `
        <button class="btn btn-secondary" onclick="closeRecordDrawer()">Close</button>
        <button class="btn btn-outline" onclick='window._filterBatchId="${row.id}"; window._filterBatchName="${escapeHtml(row.name)}"; window.loadSection("students"); closeRecordDrawer();'>View Students</button>
        <button class="btn btn-primary" onclick='window._editRecord("batches", "${row.id}", ${JSON.stringify(JSON.stringify(row._raw))}); closeRecordDrawer();'>Edit Batch</button>
      `;
      if (window.openRecordDrawer) window.openRecordDrawer('Batch Details', body, footer);
    },
    columns: [
      { 
        key: 'program', 
        label: 'Program', 
        sortable: true, 
        render: (val, row) => { 
          const nameStr = row?._raw?.programs?.name || row?._raw?.program_name || val;
          return escapeHtml(String(nameStr || 'N/A')); 
        } 
      },
      { 
        key: 'name', 
        label: 'Batch Name', 
        sortable: true, 
        render: (val, row) => { 
          const nameStr = row?._raw?.name || val;
          return `<span class="fw-600">${escapeHtml(String(nameStr || 'N/A'))}</span>`; 
        } 
      },
      { 
        key: 'studentCount', 
        label: 'Active Students', 
        sortable: true,
        render: (val, row) => {
          if (!row) return '';
          return `
          <button class="btn btn-ghost btn-xs fw-600" onclick='window._filterBatchId="${row?.id || ''}"; window._filterBatchName="${escapeHtml(row?.name || '')}"; window.loadSection("students");' title="View ${val} Students in ${escapeHtml(row?.name || '')}">
            ${val} Students →
          </button>
        `}
      },
      { key: 'status', label: 'Status', sortable: true, render: (val, row) => `<span class="badge ${row?._raw?.is_active ? 'badge-success' : 'badge-neutral'}">${val}</span>` },
      { 
        key: 'actions', 
        label: 'Actions', 
        sortable: false,
        render: (val, row) => {
          if (!row) return '';
          const rName = typeof row?.name === 'object' ? (row?.name?.name || JSON.stringify(row?.name)) : (row?.name || '');
          return `
          <div class="d-flex gap-2 justify-end">
            <button class="btn btn-outline btn-sm" onclick='window._filterBatchId="${row?.id || ''}"; window._filterBatchName="${escapeHtml(String(rName))}"; window.loadSection("students");' title="View Students in ${escapeHtml(String(rName))}">Students &rarr;</button>
            <button class="btn btn-secondary btn-sm" onclick='window._editRecord("batches", "${row?.id || ''}", ${JSON.stringify(JSON.stringify(row?._raw || {}))})'>Edit</button>
            <button class="btn btn-danger btn-sm" onclick='window._deleteRecord("batches", "${row?.id || ''}", "${escapeHtml(String(rName))}")'>Delete</button>
          </div>
        `}
      }
    ]
  });
}

export async function renderUnifiedInstitutions(area) {
  const [batches, programs, institutions, allStudents, allLevels] = await Promise.all([
    adminFetchAll('batches', '*'),
    adminFetchAll('programs', '*'),
    adminFetchAll('institutions', '*'),
    adminFetchAll('students', 'id, is_active, batch_id'),
    adminFetchAll('levels', 'id, name, level_number')
  ]);

  const instMap = institutions.reduce((acc, i) => { acc[i.id] = { ...i, programs: {} }; return acc; }, {});
  const progMap = programs.reduce((acc, p) => { acc[p.id] = { ...p, batches: [] }; return acc; }, {});
  const levelsMap = (allLevels || []).reduce((acc, l) => { acc[l.id] = l; return acc; }, {});

  programs.forEach(p => {
    if (instMap[p.institution_id]) instMap[p.institution_id].programs[p.id] = progMap[p.id];
  });

  batches.forEach(b => {
    if (progMap[b.program_id]) {
      b.activeStudents = allStudents.filter(s => s.batch_id === b.id && s.is_active !== false).length;
      progMap[b.program_id].batches.push(b);
    }
  });

  let hierarchy = [];
  const isPersonal = (name) => (name || '').toLowerCase().includes('personal') || (name || '').toLowerCase().includes('private');

  const instList = Object.values(instMap).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const b2bList = instList.filter(i => !isPersonal(i.name));
  const personalList = instList.filter(i => isPersonal(i.name));
  const allOrderedInsts = [...b2bList, ...personalList];

  allOrderedInsts.forEach(inst => {
    let instNode = { id: inst.id, name: inst.name || 'Unknown', is_active: inst.is_active, raw: inst, rowspan: 0, programs: [] };
    const progs = Object.values(inst.programs).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    
    if (progs.length === 0) {
      instNode.rowspan = 2;
    } else {
      progs.forEach(prog => {
        let progNode = { id: prog.id, name: prog.name || 'Unknown', is_active: prog.is_active, raw: prog, rowspan: 0, batches: [] };
        const progBatches = [...prog.batches].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        
        if (progBatches.length === 0) {
          progNode.rowspan = 2;
        } else {
          progBatches.forEach(b => {
            progNode.batches.push({ id: b.id, name: b.name || 'Unknown', is_active: b.is_active, students: b.activeStudents, raw: b });
            progNode.rowspan += 2;
          });
        }
        instNode.programs.push(progNode);
        instNode.rowspan += progNode.rowspan;
      });
    }
    hierarchy.push(instNode);
  });

  let html = `
    <div class="section-header d-flex justify-between align-center mb-4 flex-wrap gap-3">
      <div>
        <h2 class="section-title">Unified Blueprint Control <span class="count-chip">${batches.length} Batches</span></h2>
        <p class="section-subtitle">Central hub for structural entity generation and assignment</p>
      </div>
    </div>
    
  `;
  hierarchy.forEach((inst, instIdx) => {
    html += `
      <div class="card mb-4" style="padding:0; overflow-x: auto; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px;">
        <table class="matrix-table" id="matrix-table-${instIdx}">
          <colgroup>
            <col style="width: 18%; min-width: 140px;">
            <col style="width: 22%; min-width: 160px;">
            <col style="width: 12%; min-width: 90px;">
            <col style="width: 48%; min-width: 380px;">
          </colgroup>
          <thead>
            <tr>
              <th>INSTITUTION</th>
              <th>PROGRAM</th>
              <th style="text-align: center;">BATCH</th>
              <th>LEVEL / DATA</th>
            </tr>
          </thead>
          <tbody>
    `;

    let isFirstInstRow = true;
    
    if (inst.programs.length === 0) {
      html += `
        <tr class="level-row">
          <td rowspan="2" style="font-weight: 600;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span>${escapeHtml(inst.name)}</span>
            <div style="display:flex; gap:4px; opacity:0.7;">
              <button class="btn btn-ghost btn-xs text-secondary" style="padding:0 4px;" onclick='window._editRecord("institutions", "${inst.id}", ${JSON.stringify(JSON.stringify(inst.raw))})' title="Edit">✏️</button>
              <button class="btn btn-ghost btn-xs text-danger" style="padding:0 4px;" onclick='window._deleteRecord("institutions", "${inst.id}", "${escapeHtml(inst.name)}")' title="Delete">🗑️</button>
            </div>
          </div>
        </td>
          <td rowspan="2" style="color: var(--fm-text-muted);">—</td>
          <td rowspan="2" style="color: var(--fm-text-muted); text-align: center;">—</td>
          <td style="border-bottom: none;">LEVEL: <span class="badge badge-neutral">No Batches</span></td>
        </tr>
        <tr class="students-row">
          <td>STUDENTS: 0 Enrolled</td>
        </tr>
      `;
    } else {
      inst.programs.forEach(prog => {
        let isFirstProgRow = true;
        
        if (prog.batches.length === 0) {
          html += `
            <tr class="level-row">
              ${isFirstInstRow ? `<td rowspan="${inst.rowspan}" style="font-weight: 600;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span>${escapeHtml(inst.name)}</span>
              <div style="display:flex; gap:4px; opacity:0.7;">
                <button class="btn btn-ghost btn-xs text-secondary" style="padding:0 4px;" onclick='window._editRecord("institutions", "${inst.id}", ${JSON.stringify(JSON.stringify(inst.raw))})' title="Edit">✏️</button>
                <button class="btn btn-ghost btn-xs text-danger" style="padding:0 4px;" onclick='window._deleteRecord("institutions", "${inst.id}", "${escapeHtml(inst.name)}")' title="Delete">🗑️</button>
              </div>
            </div>
          </td>` : ''}
              <td rowspan="2">
                <div class="fw-600" style="display:flex; justify-content:space-between; align-items:center;">
              <span>${escapeHtml(prog.name)}</span>
              <div style="display:flex; gap:4px; opacity:0.7;">
                <button class="btn btn-ghost btn-xs text-secondary" style="padding:0 4px;" onclick='window._editRecord("programs", "${prog.id}", ${JSON.stringify(JSON.stringify(prog.raw))})' title="Edit">✏️</button>
                <button class="btn btn-ghost btn-xs text-danger" style="padding:0 4px;" onclick='window._deleteRecord("programs", "${prog.id}", "${escapeHtml(prog.name)}")' title="Delete">🗑️</button>
              </div>
            </div>
              </td>
              <td rowspan="2" style="color: var(--fm-text-muted); text-align: center;">—</td>
              <td style="border-bottom: none;">LEVEL: <span class="badge badge-neutral">No Batches</span></td>
            </tr>
            <tr class="students-row">
              <td>STUDENTS: 0 Enrolled</td>
            </tr>
          `;
          isFirstInstRow = false;
          return;
        }

        prog.batches.forEach(batch => {
          const levelData = levelsMap[batch.raw.current_level_id];
          const levelBadge = levelData ? `<span class="badge badge-primary">🏷️ ${escapeHtml(levelData.name)}</span>` : `<span class="badge badge-neutral">No Level Set</span>`;

          html += `
            <tr class="level-row">
              ${isFirstInstRow ? `<td rowspan="${inst.rowspan}" style="font-weight: 600;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <span>${escapeHtml(inst.name)}</span>
                  <div style="display:flex; gap:4px; opacity:0.7;">
                    <button class="btn btn-ghost btn-xs text-secondary" style="padding:0 4px;" onclick='window._editRecord("institutions", "${inst.id}", ${JSON.stringify(JSON.stringify(inst.raw))})' title="Edit">✏️</button>
                    <button class="btn btn-ghost btn-xs text-danger" style="padding:0 4px;" onclick='window._deleteRecord("institutions", "${inst.id}", "${escapeHtml(inst.name)}")' title="Delete">🗑️</button>
                  </div>
                </div>
              </td>` : ''}
              ${isFirstProgRow ? `<td rowspan="${prog.rowspan}">
                <div class="fw-600" style="display:flex; justify-content:space-between; align-items:center;">
                  <span>${escapeHtml(prog.name)}</span>
                  <div style="display:flex; gap:4px; opacity:0.7;">
                    <button class="btn btn-ghost btn-xs text-secondary" style="padding:0 4px;" onclick='window._editRecord("programs", "${prog.id}", ${JSON.stringify(JSON.stringify(prog.raw))})' title="Edit">✏️</button>
                    <button class="btn btn-ghost btn-xs text-danger" style="padding:0 4px;" onclick='window._deleteRecord("programs", "${prog.id}", "${escapeHtml(prog.name)}")' title="Delete">🗑️</button>
                  </div>
                </div>
              </td>` : ''}
              <td rowspan="2" style="text-align: center;">
                <div class="fw-600">${escapeHtml(batch.name)}</div>
              </td>
              <td style="border-bottom: none; padding-bottom: 0.25rem;">
                <div class="d-flex align-center justify-between" style="flex-wrap: nowrap;">
                  <div>LEVEL: ${levelBadge}</div>
                  <button class="btn btn-ghost btn-xs text-primary" style="text-decoration: underline; white-space: nowrap;" onclick="window.openChangeLevelModal('${batch.id}', '${batch.raw.current_level_id || ''}')">Change Level</button>
                </div>
              </td>
            </tr>
            <tr class="students-row">
              <td style="padding-top: 0.25rem;">
                <div class="matrix-actions-row" style="justify-content: space-between; width: 100%;">
                  <div class="matrix-actions-row">
                    STUDENTS: ${batch.students} Enrolled &nbsp;&nbsp; 
                    <a href="#" class="text-primary fw-600" style="text-decoration: underline; font-size: 0.85rem;" onclick='event.preventDefault(); window._filterBatchId="${batch.id}"; window._filterBatchName="${escapeHtml(batch.name)}"; window.loadSection("students");'>[ Manage Roster ↗ ]</a>
                  </div>
                  <div class="matrix-actions-row">
                     <button class="btn btn-ghost btn-xs text-success" onclick="window.openStudentFullEdit({ batch_id: '${batch.id}' })">+ Add Student</button>
                     <button class="btn btn-ghost btn-xs text-primary" onclick="window._filterBatchId='${batch.id}'; window.loadSection('import-students')">📥 Import</button>
                     <button class="btn btn-ghost btn-xs text-secondary" onclick='window._editRecord("batches", "${batch.id}", ${JSON.stringify(JSON.stringify(batch.raw))})' title="Edit Batch">✏️ Edit</button>
                     <button class="btn btn-ghost btn-xs text-danger" onclick='window._deleteRecord("batches", "${batch.id}", "${escapeHtml(batch.name)}")' title="Delete Batch">🗑️ Delete</button>
                  </div>
                </div>
              </td>
            </tr>
          `;
          isFirstInstRow = false;
          isFirstProgRow = false;
        });
      });
    }

    html += `
          </tbody>
        </table>
      </div>
    `;
  });

  area.innerHTML = html;
  
  if (window.makeTableResizable) {
    area.querySelectorAll('.matrix-table').forEach((table, idx) => {
      window.makeTableResizable(table, 'batches-matrix-widths-' + idx);
    });
  }
}

window.openChangeLevelModal = async function(batchId, currentLevelId) {
  const levels = await adminFetchAll('levels', 'id, name, level_number');
  if (!levels || levels.length === 0) {
    if (window.showToast) window.showToast('No levels defined in the system. Create them first.', 'error');
    return;
  }
  
  levels.sort((a,b) => (a.name || '').localeCompare(b.name || ''));
  
  let selectHtml = '<select id="level-select" class="form-control mb-4" style="width:100%; padding: 8px;">';
  selectHtml += '<option value="">-- No Level --</option>';
  levels.forEach(l => {
    let label = escapeHtml(l.name);
    if (l.level_number) {
      const num = l.level_number;
      const s = ["th", "st", "nd", "rd"], v = num % 100;
      const ord = num + (s[(v - 20) % 10] || s[v] || s[0]);
      label = `${ord} Level (${label})`;
    }
    selectHtml += `<option value="${l.id}" ${l.id === currentLevelId ? 'selected' : ''}>${label}</option>`;
  });
  selectHtml += '</select>';

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.zIndex = '10000';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.background = 'rgba(15,23,42,0.95)';
  overlay.style.backdropFilter = 'blur(5px)';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.innerHTML = `
    <div class="modal-content card" style="min-width: 350px; background: var(--fm-bg-card);">
      <div class="modal-header d-flex justify-between align-center mb-3">
        <h3 class="fw-700 m-0 text-md">Change Batch Level</h3>
        <button class="btn btn-ghost btn-xs text-muted" id="cancel-level-btn-x" style="font-size: 1.25rem;">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label text-xs fw-600">Select Level</label>
          ${selectHtml}
        </div>
        <div class="d-flex justify-end gap-2 mt-4">
          <button class="btn btn-secondary" id="cancel-level-btn">Cancel</button>
          <button class="btn btn-primary" id="save-level-btn">Save Changes</button>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  const closeOverlay = () => overlay.remove();
  document.getElementById('cancel-level-btn').onclick = closeOverlay;
  document.getElementById('cancel-level-btn-x').onclick = closeOverlay;
  
  document.getElementById('save-level-btn').onclick = async () => {
    const newLevelId = document.getElementById('level-select').value;
    const btn = document.getElementById('save-level-btn');
    btn.disabled = true;
    btn.innerText = 'Saving...';
    try {
      if (newLevelId !== currentLevelId) {
        const { getSupabase } = await import('../supabase.js?v=5.2.2');
        const sb = await getSupabase();
        
        // Update batch
        const { error: batchErr } = await sb.from('batches').update({ current_level_id: newLevelId || null }).eq('id', batchId);
        if (batchErr) throw batchErr;
        
        

        clearAdminCache('batches');
        clearAdminCache('students');
        
        if (window.showToast) window.showToast('Batch and student levels updated successfully.', 'success');
        if (window.loadSection) window.loadSection('institutions');
      }
      closeOverlay();
    } catch (e) {
      console.error('Error changing level:', e);
      if (window.showToast) window.showToast('Failed to update level.', 'error');
      btn.disabled = false;
      btn.innerText = 'Save Changes';
    }
  };
};
