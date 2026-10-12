import { adminFetchAll, formatStudentName, cleanStudentName, adminSoftDelete, clearAdminCache, adminInsert, adminUpdate, sha256 } from '../api.js?v=5.1.0';
import { getSupabase } from '../supabase.js?v=5.1.0';
import { getGrade, showToast } from '../app.js?v=5.1.0';
import { processAndCompressAvatar, uploadStudentAvatar, generateAvatarSvg, generateAvatarDataUri, getBustedAvatarUrl, stripHonorific, getStudentInitial } from '../utils/avatar-engine.js?v=5.1.0';
import { DataGrid } from './datagrid.js?v=5.1.0';

let studentGrid = null;

function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
const escapeHtml = escHtml;

/**
 * Hierarchical sort comparator for student records:
 * 1. Active students on top, Inactive students at the bottom.
 * 2. Alphabetical ordering: Institution -> Program -> Batch -> Level -> Name.
 */
export function compareStudentsHierarchical(a, b) {
  const aActive = ((a._raw || a).is_active !== false) ? 1 : 0;
  const bActive = ((b._raw || b).is_active !== false) ? 1 : 0;
  if (aActive !== bActive) return bActive - aActive;

  const instA = (a.instName || '').trim();
  const instB = (b.instName || '').trim();
  const instCmp = instA.localeCompare(instB, undefined, { sensitivity: 'base', numeric: true });
  if (instCmp !== 0) return instCmp;

  const progA = (a.progName || '').trim();
  const progB = (b.progName || '').trim();
  const progCmp = progA.localeCompare(progB, undefined, { sensitivity: 'base', numeric: true });
  if (progCmp !== 0) return progCmp;

  const batchA = (a.batchName || '').trim();
  const batchB = (b.batchName || '').trim();
  const batchCmp = batchA.localeCompare(batchB, undefined, { sensitivity: 'base', numeric: true });
  if (batchCmp !== 0) return batchCmp;

  const lvlA = (a.levelName || '').trim();
  const lvlB = (b.levelName || '').trim();
  const lvlCmp = lvlA.localeCompare(lvlB, undefined, { sensitivity: 'base', numeric: true });
  if (lvlCmp !== 0) return lvlCmp;

  const nameA = stripHonorific(a.displayName || a.name || a.sortName || '');
  const nameB = stripHonorific(b.displayName || b.name || b.sortName || '');
  return nameA.localeCompare(nameB, undefined, { sensitivity: 'base', numeric: true });
}

export async function renderStudents(area) {
    const [rawData, allAttempts, allLevels, allProgress, allPrograms, allBatches] = await Promise.all([
    adminFetchAll('students', 'id, name, gender, birth_date, photo_url, photo_status, is_active, created_at, deleted_at, level_id, batch_id, program_id, institution_id, programs!program_id(name, is_active), institutions!institution_id(name, is_active), batches!batch_id(name, is_active, current_level_id)'),
    adminFetchAll('attempts', 'id, student_id, assessment_id, status, score, total_questions, percentage, created_at, is_remedial_unlocked, assessments(assessment_type, title, class_id)'),
    adminFetchAll('levels', 'id, name, level_number'),
    adminFetchAll('progress', 'id, student_id, class_id, level_id, status'),
    adminFetchAll('programs', 'id, name, institution_id, is_active'),
    adminFetchAll('batches', 'id, name, program_id, is_active, current_level_id')
  ]);
  const levelsMap = new Map();
  (allLevels || []).forEach(l => levelsMap.set(l.id, l));

  // Detect duplicate students within the same class
  const dupMap = new Map();
  (rawData || []).forEach(s => {
    if (s.deleted_at) return;
    const key = `${s.program_id}::${(s.name || '').toLowerCase().trim()}`;
    if (!dupMap.has(key)) dupMap.set(key, []);
    dupMap.get(key).push(s);
  });
  const duplicateGroups = Array.from(dupMap.values()).filter(g => g.length > 1);
  const totalDuplicates = duplicateGroups.reduce((acc, g) => acc + (g.length - 1), 0);
  
  // Format data for DataGrid
  const gridData = (rawData || []).filter(s => {
    if (s.deleted_at) return false;
    return true;
  }).map(s => {
    const studentAttempts = (allAttempts || []).filter(a => a.student_id === s.id);
    const completedAssessmentsCount = new Set(studentAttempts.filter(a => a.status === 'SUBMITTED' || a.status === 'submitted').map(a => a.assessment_id || a.Assessment_id)).size;
    const latestAttempt = studentAttempts.sort((a,b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];
    
    // Overall logic from old app.js
    let overallScoreStr = '-';
    let globalGrade = '-';
    let overallColor = 'rgba(255,255,255,0.4)';
    if (completedAssessmentsCount > 0) {
      let totalMaxScore = 0;
      let totalObtained = 0;
      studentAttempts.filter(a => a.status === 'SUBMITTED' || a.status === 'submitted').forEach(a => {
        totalMaxScore += (a.total_questions || a.max_score || 0);
        totalObtained += (a.score || a.total_score || 0);
      });
      if (totalMaxScore > 0) {
        const pct = Math.round((totalObtained / totalMaxScore) * 100);
        overallScoreStr = `${pct}%`;
        if (typeof getGrade === 'function') {
           const g = getGrade(pct);
           globalGrade = g;
           const cMap = { 'S': '#8b5cf6', 'A': '#10b981', 'B': '#3b82f6', 'C': '#f59e0b', 'D': '#f97316', 'E': '#ef4444', 'F': '#ef4444' };
           overallColor = cMap[g] || 'rgba(255,255,255,0.4)';
        }
      }
    }

    // Compute age from birth_date
    let ageDisplay = '—';
    if (s.birth_date) {
      const bd = new Date(s.birth_date);
      if (!isNaN(bd.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - bd.getFullYear();
        const m = today.getMonth() - bd.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
        if (age >= 0) ageDisplay = `${age} yrs`;
      }
    }

    // Determine remediation pending
    const remediationPending = studentAttempts
      .filter(a => (a.status === 'SUBMITTED' || a.status === 'submitted') && a.assessments?.assessment_type === 'EXAM')
      .some(a => {
        const maxVal = a.total_questions || a.max_score || 0;
        if (!maxVal) return false;
        const pct = a.percentage != null ? parseFloat(a.percentage) : Math.round(((a.score || 0) / maxVal) * 100);
        return pct < 60 && !a.is_remedial_unlocked;
      });

    const studentProgs = (allProgress || []).filter(p => p.student_id === s.id);
    let levelName = '—';
    if (s.level_id) {
      const lvlObj = levelsMap.get(s.level_id);
      levelName = lvlObj ? lvlObj.name : '—';
    } else {
      const batchLevelId = s.batches?.current_level_id;
      const batchLevel = batchLevelId ? levelsMap.get(batchLevelId) : null;
      levelName = batchLevel ? batchLevel.name : '—';
    }

    // Detect orphaned students (batch/program/institution inactive or missing)
    const isOrphaned = !s.program_id
      || (s.institutions && s.institutions.is_active === false)
      || (s.programs && s.programs.is_active === false)
      || (s.batches && s.batches.is_active === false)
      || (s.batch_id && !s.batches);

    // Join date
    let joinDate = '—';
    if (s.created_at) {
      try {
        const d = new Date(s.created_at);
        joinDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch { joinDate = '—'; }
    }

    return {
      ...s,
      displayName: cleanStudentName(s.name),
      sortName: cleanStudentName(s.name).toLowerCase(),
      ageDisplay,
      instName: s.institutions?.name || (s.institution_id ? '⚠ Unknown Institution' : '—'),
      progName: s.programs?.name || (s.program_id ? '⚠ Unknown Program' : '—'),
      batchName: s.batches?.name || (s.batch_id ? '⚠ Unknown Batch' : '— No Batch —'),
      levelName,
      pinDisplay: s.pin || 'NOT SET',
      completedAssessments: completedAssessmentsCount,
      latestActivity: latestAttempt ? new Date(latestAttempt.created_at).toLocaleDateString() : 'Never',
      overallScoreStr,
      globalGrade,
      overallColor,
      remediationPending,
      isOrphaned,
      joinDate,
      phone: s.phone || s.phone_number || '—',
      email: s.email || '—'
    };
  });

  // Hierarchical sort comparator: Active first, then Institution -> Program -> Batch -> Level -> Name (A-Z)
  gridData.sort(compareStudentsHierarchical);

  // Filter data if navigated from Batches
  const filteredGridData = window._filterBatchId
    ? gridData.filter(s => s.batch_id === window._filterBatchId)
    : gridData;

  const remediationPendingCount = filteredGridData.filter(s => s.remediationPending).length;

  // Update sidebar badge
  const rosterNavBtn = document.querySelector('.admin-nav-item[data-sub="students"]');
  if (rosterNavBtn) {
    const existingBadge = rosterNavBtn.querySelector('.remediation-sidebar-badge');
    if (existingBadge) existingBadge.remove();
    if (remediationPendingCount > 0) {
      rosterNavBtn.insertAdjacentHTML('beforeend', `<span class="remediation-sidebar-badge badge badge-warning" style="margin-left:auto;font-size:0.7rem;padding:0.1rem 0.3rem;">${remediationPendingCount}</span>`);
    }
  }

  // Abort if area is no longer attached to DOM (e.g. user navigated to another tab)
  if (!area || !document.body.contains(area)) return;

  area.innerHTML = `
    <div class="section-header">
      <div>
        <h2 class="section-title">Students <span class="count-chip">${filteredGridData.length} Active</span>
        ${remediationPendingCount > 0 ? `<span class="badge badge-warning" style="margin-left:8px; font-size: 0.9rem;">⚠️ ${remediationPendingCount} Awaiting Remediation</span>` : ''}
        </h2>
        <p class="section-subtitle">Manage enrolled students with Batch, Overall Score & Global Grade</p>
      </div>
      <div class="d-flex gap-2">
        ${totalDuplicates > 0 ? `<button class="btn btn-warning btn-sm" id="students-merge-shortcut" style="font-weight:700;">&#9888;&#65039; Resolve Duplicates (${totalDuplicates})</button>` : ''}
        <button class="btn btn-secondary btn-sm" id="students-import-shortcut">📤 Import</button>
        <button class="btn btn-success btn-sm" id="students-export-btn">📊 Export CSV</button>
        <button class="btn btn-primary btn-sm" id="students-add-shortcut">+ Add Student</button>
      </div>
    </div>

    ${window._filterBatchId ? `
      <div class="mb-4 p-3 rounded d-flex align-center justify-between" style="background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.4);color:#93c5fd;">
        <div class="d-flex align-center gap-2">
          <span style="font-size:1.2rem;">&#128101;</span>
          <span>Filtered by Batch: <strong>${window._filterBatchName || 'Selected Batch'}</strong> (${filteredGridData.length} students)</span>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="window._filterBatchId=null; window._filterBatchName=null; window.loadSection('students');" style="text-decoration:underline;color:#93c5fd;">
          Show All Batches
        </button>
      </div>
    ` : ''}

    ${totalDuplicates > 0 ? `
      <div class="mb-4 p-3 rounded d-flex align-center justify-between" style="background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);color:#fef3c7;">
        <div class="d-flex align-center gap-3">
          <span style="font-size:1.4rem;">&#9888;&#65039;</span>
          <div>
            <div class="fw-700 text-sm">Detected ${totalDuplicates} Duplicate Student Profiles</div>
            <div class="text-xs text-muted" style="color:rgba(255,255,255,0.85)!important;">
              Found ${duplicateGroups.length} groups of students with identical names in the same class. Merge them to unify their Assessment progress.
            </div>
          </div>
        </div>
        <button class="btn btn-warning btn-sm" id="btn-banner-merge-duplicates" style="background:#f59e0b;color:#000;font-weight:700;border:none;">
          &#9888;&#65039; Resolve All Duplicates
        </button>
      </div>
    ` : ''}

    <div class="d-flex gap-3 mb-4" style="background:var(--fm-bg-panel, #0F172A); padding: 1rem; border-radius: 8px; border: 1px solid var(--clr-border);">
      <div style="flex: 1;">
        <label class="form-label" style="font-size: 0.8rem; margin-bottom: 0.2rem;">Filter by Program</label>
        <select id="students-filter-program" class="form-input" style="padding: 0.4rem; height: auto;">
          <option value="">All Programs</option>
          ${(allPrograms || []).map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
        </select>
      </div>
      <div style="flex: 1;">
        <label class="form-label" style="font-size: 0.8rem; margin-bottom: 0.2rem;">Filter by Batch</label>
        <select id="students-filter-batch" class="form-input" style="padding: 0.4rem; height: auto;">
          <option value="">All Batches</option>
          ${(allBatches || []).map(b => `<option value="${b.id}" data-prog="${b.program_id}">${b.name}</option>`).join('')}
        </select>
      </div>
    </div>
    <div id="student-grid-container" class="card" style="padding:1rem;"></div>
  `;

  // Bind Buttons
  const addBtn = document.getElementById('students-add-shortcut');
  if (addBtn) addBtn.onclick = () => window.openStudentFullEdit(null, () => window.loadSection('students'));
  
  const mergeBtn = document.getElementById('students-merge-shortcut');
  if (mergeBtn) mergeBtn.onclick = () => { if (window.openDuplicateStudentsModal) window.openDuplicateStudentsModal(); };
  
  const mergeBannerBtn = document.getElementById('btn-banner-merge-duplicates');
  if (mergeBannerBtn) mergeBannerBtn.onclick = () => { if (window.openDuplicateStudentsModal) window.openDuplicateStudentsModal(); };
  
  const importBtn = document.getElementById('students-import-shortcut');
  if (importBtn) importBtn.onclick = () => window.loadSection('import-students');
  
  const exportBtn = document.getElementById('students-export-btn');
  if (exportBtn) {
    exportBtn.onclick = () => {
      if (!filteredGridData || !filteredGridData.length) {
        showToast('No students to export.', 'info');
        return;
      }
      
      const headers = ['Institution', 'Program', 'Batch', 'Current Level', 'Student Name', 'Assessment Type', 'Score (%)', 'Status', 'Remediation Granted'];
      const rows = filteredGridData.map(s => {
        return {
          'Institution': s.instName || '—',
          'Program': s.progName || '—',
          'Batch': s.batchName || '—',
          'Current Level': s.levelName || '—',
          'Student Name': s.displayName || s.name || '—',
          'Assessment Type': s.remediationPending ? 'EXAM' : '—',
          'Score (%)': s.overallScoreStr || '—',
          'Status': s.is_active ? 'Active' : 'Inactive',
          'Remediation Granted': s.remediationPending ? 'No' : (s.overallScoreStr !== '—' ? 'Yes/NA' : '—')
        };
      });
      
      try {
        const ws = XLSX.utils.json_to_sheet(rows, { header: headers });
        ws['!cols'] = [
          { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 }
        ];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Gradebook");
        XLSX.writeFile(wb, "Gradebook_Export.xlsx");
      } catch (err) {
        console.error("Export error:", err);
        showToast('Export failed. Make sure the XLSX library is loaded.', 'error');
      }
    };
  }
  // Initialize DataGrid
  const gridContainer = area.querySelector('#student-grid-container') || document.getElementById('student-grid-container');
  if (!gridContainer) return;

  studentGrid = new DataGrid({
    container: gridContainer,
    data: filteredGridData,
    pageSize: 50,
    searchKeys: ['instName', 'progName', 'batchName', 'levelName', 'displayName', 'pinDisplay'],
    initialSortKey: 'instName',
    initialSortAsc: true,
    sortComparator: (sortKey, direction, a, b) => {
      // Active students ALWAYS on top, inactive at bottom
      const aActive = ((a._raw || a).is_active !== false) ? 1 : 0;
      const bActive = ((b._raw || b).is_active !== false) ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;

      // When sorting by instName, use full hierarchy
      if (sortKey === 'instName') {
        const cmp = compareStudentsHierarchical(a, b);
        return direction === 'desc' ? -cmp : cmp;
      }

      // Column-specific comparison
      let valA = a[sortKey];
      let valB = b[sortKey];
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return direction === 'asc' ? -1 : 1;
      if (valA > valB) return direction === 'asc' ? 1 : -1;

      // Secondary tie-breaker: Institution -> Program -> Batch -> Level -> Name
      return compareStudentsHierarchical(a, b);
    },
    bulkActions: true,
    onBulkAction: async (selectedIds) => {
      // Fetch data for dropdowns
      const [institutions, programs, batches, levels] = await Promise.all([
        adminFetchAll('institutions', 'id, name'),
        adminFetchAll('programs', 'id, name, institution_id'),
        adminFetchAll('batches', 'id, name, program_id'),
        adminFetchAll('levels', 'id, name, level_number')
      ]);

      const sortFn = (a, b) => (a.name || '').localeCompare(b.name || '');
      institutions.sort(sortFn);
      programs.sort(sortFn);
      batches.sort(sortFn);
      levels.sort(sortFn);

      const existing = document.getElementById('bulk-action-modal');
      if (existing) existing.remove();

      const overlay = document.createElement('div');
      overlay.id = 'bulk-action-modal';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.95);backdrop-filter:blur(5px);z-index:9999;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;';
      overlay.innerHTML = `
        <div style="background:var(--fm-bg-panel, #0F172A);border:1px solid var(--clr-border);border-radius:12px;padding:2rem;width:100%;max-width:500px;">
          <h3 style="margin:0 0 0.5rem;font-size:1.1rem;">Bulk Edit ${selectedIds.length} Student(s)</h3>
          <p style="color:var(--clr-text-3);font-size:0.85rem;margin:0 0 1.5rem;">Leave fields blank to keep their current values.</p>
          
          <div style="display:flex;flex-direction:column;gap:1rem;margin-bottom:2rem;">
            <div>
              <label class="form-label" style="display:block;margin-bottom:0.25rem;">Institution</label>
              <select id="bulk-inst" class="form-input">
                <option value="">-- No Change --</option>
                ${institutions.map(i => `<option value="${i.id}">${i.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label" style="display:block;margin-bottom:0.25rem;">Program / Class</label>
              <select id="bulk-prog" class="form-input">
                <option value="">-- No Change --</option>
                ${programs.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label" style="display:block;margin-bottom:0.25rem;">Batch</label>
              <select id="bulk-batch" class="form-input">
                <option value="">-- No Change --</option>
                ${batches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
              </select>
            </div>
            <div>
              <label class="form-label" style="display:block;margin-bottom:0.25rem;">Gender</label>
              <select id="bulk-gender" class="form-input">
                <option value="">-- No Change --</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <button id="bulk-save-fields" class="btn btn-primary" style="width:100%;margin-top:0.5rem;">Save Fields</button>
          </div>

          <hr style="border:0;border-top:1px solid var(--clr-border);margin:0 0 1.5rem 0;">

          <h4 style="margin:0 0 0.5rem;font-size:0.95rem;color:var(--clr-text-2);">Quick Actions</h4>
          <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;">
            <button id="bulk-activate" class="btn btn-success" style="flex:1;">&#9989; Activate</button>
            <button id="bulk-deactivate" class="btn btn-secondary" style="flex:1;">&#128683; Deactivate</button>
            <button id="bulk-delete" class="btn btn-danger" style="flex:1;">&#128465; Delete</button>
          </div>
          
          <button id="bulk-cancel" class="btn btn-ghost" style="width:100%;color:var(--clr-text-3);">Cancel</button>
        </div>
      `;
      document.body.appendChild(overlay);

      const close = () => overlay.remove();
      overlay.querySelector('#bulk-cancel').onclick = close;
      overlay.onclick = (e) => { if (e.target === overlay) close(); };

      overlay.querySelector('#bulk-save-fields').onclick = async () => {
        const instId = overlay.querySelector('#bulk-inst').value;
        const progId = overlay.querySelector('#bulk-prog').value;
        const batchId = overlay.querySelector('#bulk-batch').value;
        const gender = overlay.querySelector('#bulk-gender').value;

        const updates = {};
        if (instId) updates.institution_id = instId;
        if (progId) updates.program_id = progId;
        if (batchId) updates.batch_id = batchId;
        if (gender) updates.gender = gender;

        if (Object.keys(updates).length === 0) {
          showToast('No fields changed.', 'info');
          close();
          return;
        }

        const btn = overlay.querySelector('#bulk-save-fields');
        btn.textContent = 'Saving...';
        btn.disabled = true;

        const sb = (await import('../supabase.js?v=5.1.0')).getSupabase ? await (await import('../supabase.js?v=5.1.0')).getSupabase() : null;
        if (!sb) { showToast('Cannot connect.', 'error'); close(); return; }

        for (const id of selectedIds) {
          const { error } = await sb.from('students').update(updates).eq('id', id);
          if (error) {
             console.error('Update error on ID', id, error);
             showToast('Failed to update student: ' + error.message, 'error');
             return;
          }
        }
        
        clearAdminCache('students');
        close();
        showToast(`Updated ${selectedIds.length} students.`, 'success');
        if (typeof window.loadSection === 'function') window.loadSection('students'); else renderStudents(area);
      };

      overlay.querySelector('#bulk-activate').onclick = async () => {
        close();
        const sb = (await import('../supabase.js?v=5.1.0')).getSupabase ? await (await import('../supabase.js?v=5.1.0')).getSupabase() : null;
        if (!sb) { showToast('Cannot connect.', 'error'); return; }
        for (const id of selectedIds) await sb.from('students').update({ is_active: true }).eq('id', id);
        showToast(`Activated ${selectedIds.length} students.`, 'success');
        renderStudents(area);
      };

      overlay.querySelector('#bulk-deactivate').onclick = async () => {
        close();
        const sb = (await import('../supabase.js?v=5.1.0')).getSupabase ? await (await import('../supabase.js?v=5.1.0')).getSupabase() : null;
        if (!sb) { showToast('Cannot connect.', 'error'); return; }
        for (const id of selectedIds) await sb.from('students').update({ is_active: false }).eq('id', id);
        showToast(`Deactivated ${selectedIds.length} students.`, 'success');
        renderStudents(area);
      };

      overlay.querySelector('#bulk-delete').onclick = async () => {
        close();
        const confirmed = await new Promise(resolve => {
          const c = document.createElement('div');
          c.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10000;display:flex;align-items:center;justify-content:center;';
          c.innerHTML = `<div style="background:var(--fm-bg-panel, #0F172A);border:1px solid rgba(239,68,68,0.5);border-radius:12px;padding:2rem;max-width:380px;text-align:center;">
            <div style="font-size:2rem;margin-bottom:0.5rem;">&#9888;&#65039;</div>
            <h3 style="color:#ef4444;margin:0 0 0.5rem;">Delete ${selectedIds.length} Students?</h3>
            <p style="color:var(--clr-text-3);font-size:0.85rem;margin-bottom:1.5rem;">This will soft-delete all selected students. Their history will be preserved.</p>
            <div style="display:flex;gap:0.75rem;justify-content:center;">
              <button id="c-no" class="btn btn-secondary">Cancel</button>
              <button id="c-yes" class="btn btn-danger">Yes, Delete</button>
            </div>
          </div>`;
          document.body.appendChild(c);
          c.querySelector('#c-yes').onclick = () => { c.remove(); resolve(true); };
          c.querySelector('#c-no').onclick = () => { c.remove(); resolve(false); };
        });
        if (!confirmed) return;
        for (const id of selectedIds) await adminSoftDelete('students', id);
        showToast(`Deleted ${selectedIds.length} students.`, 'success');
        renderStudents(area);
      };
    },
    onRowClick: (row) => {
      if (row.remediationPending && typeof window.openStudentProfile === 'function') {
        window.openStudentProfile(row.id);
        return;
      }
      if (typeof window.openStudentFullEdit === 'function') {
        window.openStudentFullEdit(row, () => renderStudents(area));
      } else if (typeof window.openStudentProfile === 'function') {
        window.openStudentProfile(row.id);
      }
    },
    columns: [
      // 1. Institution
      {
        key: 'instName',
        label: 'Institution',
        sortable: true,
        render: (row) => `<div class="text-sm fw-600">${escapeHtml(row.instName)}</div>`
      },
      // 2. Program
      {
        key: 'progName',
        label: 'Program',
        sortable: true,
        render: (row) => `<div class="text-sm">${escapeHtml(row.progName)}</div>`
      },
      // 3. Batch
      {
        key: 'batchName',
        label: 'Batch',
        sortable: true,
        align: 'center',
        render: (row) => `<span class="badge" style="background:rgba(255,255,255,0.1);color:#fff;">${escapeHtml(row.batchName)}</span>`
      },
      // 4. Level
      {
        key: 'levelName',
        label: 'Level',
        sortable: true,
        align: 'center',
        render: (row) => `<span class="badge badge-neutral" style="font-size:0.75rem;">${escapeHtml(row.levelName)}</span>`
      },
      // 5. Name
      {
        key: 'sortName',
        label: 'Name',
        sortable: true,
        render: (row) => {
          const initial = getStudentInitial(row.displayName || row.name);
          return `
            <div class="d-flex align-center gap-3">
              ${row.photo_url ? `<img src="${row.photo_url}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid var(--clr-border);">` : `<img src="${generateAvatarDataUri(row.displayName || row.name, row.gender)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid var(--clr-border);">`}
              <div>
                <div class="fw-600" style="color:var(--clr-text-1);">
                  ${row.displayName}
                  ${row.isOrphaned ? `<span class="badge badge-danger" style="margin-left:6px;font-size:0.65rem;">⚠️ Disconnected</span>` : ''}
                  ${row.remediationPending ? `<span class="badge badge-warning" style="white-space:nowrap;margin-left:8px;font-size:0.75rem;">⚠️ Remediation Pending</span>` : ''}
                </div>
                <div class="text-xs text-muted" style="font-family:monospace;">PIN: ${row.pinDisplay}</div>
              </div>
            </div>
          `;
        }
      },
      // 6. Age
      {
        key: 'ageDisplay',
        label: 'Age',
        sortable: true,
        align: 'center',
        render: (row) => `<span class="text-sm fw-600">${row.ageDisplay}</span>`
      },
      // 7. Gender
      {
        key: 'gender',
        label: 'Gender',
        sortable: true,
        align: 'center',
        render: (row) => row.gender === 'male'
          ? `<span class="badge" style="background:rgba(56,189,248,0.15);color:#38bdf8;border:1px solid rgba(56,189,248,0.3);font-size:0.7rem;">&#9794; Male</span>`
          : row.gender === 'female'
          ? `<span class="badge" style="background:rgba(244,114,182,0.15);color:#f472b6;border:1px solid rgba(244,114,182,0.3);font-size:0.7rem;">&#9792; Female</span>`
          : `<span class="badge badge-neutral" style="font-size:0.7rem;">&#8212; Unset</span>`
      },
      // 8. Progress
      {
        key: 'overallScoreStr',
        label: 'Progress',
        sortable: true,
        align: 'center',
        render: (row) => `
          <div class="fw-600">${row.overallScoreStr}</div>
          <div class="text-xs text-muted">${row.completedAssessments} Assessments</div>
        `
      },
      // 9. Grade
      {
        key: 'globalGrade',
        label: 'Grade',
        sortable: true,
        align: 'center',
        render: (row) => row.globalGrade !== '-' ? `<span class="badge" style="background:${row.overallColor};color:#000;">${row.globalGrade}</span>` : '-'
      },
      // 10. Contact
      {
        key: 'phone',
        label: 'Contact',
        sortable: true,
        render: (row) => `<div class="text-xs" style="color:var(--clr-text-2);">${escapeHtml(row.phone !== '—' ? row.phone : row.email)}</div>`
      },
      // 11. Joined
      {
        key: 'joinDate',
        label: 'Enrolled',
        sortable: true,
        align: 'center',
        render: (row) => `<span class="text-xs text-muted">${escapeHtml(row.joinDate)}</span>`
      },
      // 12. Status
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        align: 'center',
        render: (val, row) => `<span class="badge ${((row._raw || row).is_active !== false) ? 'badge-success' : 'badge-neutral'}">${((row._raw || row).is_active !== false) ? 'Active' : 'Inactive'}</span>`
      },

      {
        label: 'Actions',
        align: 'right',
        render: (row) => {
          const div = document.createElement('div');
          div.className = 'd-flex gap-2 justify-end';
          
          const profileBtn = document.createElement('button');
          profileBtn.className = 'btn btn-secondary btn-icon btn-sm';
          profileBtn.title = 'View Profile';
          profileBtn.innerHTML = '&#128100;';
          profileBtn.onclick = (e) => {
             e.stopPropagation();
             if(typeof window.openStudentProfile === 'function') window.openStudentProfile(row.id);
          };
          
          const printBtn = document.createElement('button');
          printBtn.className = 'btn btn-secondary btn-icon btn-sm';
          printBtn.title = 'Print Dossier';
          printBtn.innerHTML = '&#x1F5A8;'; // printer icon
          printBtn.onclick = (e) => {
            e.stopPropagation();
            import('./dossier_export.js?v=5.1.0').then(m => {
              const edu = [{period: '2026', institution: row.instName, details: 'Enrolled in ' + row.progName}];
              const skills = ['English Proficiency'];
              const studentAttempts = (allAttempts || []).filter(a => a.student_id === row.id && a.status === 'SUBMITTED');
              const assessments = studentAttempts.map(a => {
                const pct = Math.round((a.total_score / Math.max(1, a.max_score || 1)) * 100);
                return {
                  date: new Date(a.created_at).toLocaleDateString(),
                  title: 'Assessment Record',
                  score: pct,
                  grade: (typeof getGrade === 'function') ? getGrade(pct) : '-',
                  status: 'Completed'
                };
              });
              const sData = {
                name: row.name,
                birth_date: row.birth_date,
                gender: row.gender,
                institution_name: row.instName,
                program_name: row.progName,
                batch_name: row.batchName,
                is_active: row.is_active,
                photo_url: row.photo_url
              };
              m.exportStudentDossier(sData, edu, skills, assessments);
            }).catch(err => {
              showToast('Failed to load dossier export module.', 'error');
              console.error(err);
            });
          };

          const editBtn = document.createElement('button');
          editBtn.className = 'btn btn-secondary btn-icon btn-sm';
          editBtn.innerHTML = '✏️';
          editBtn.onclick = (e) => {
            e.stopPropagation();
            if (window.openStudentFullEdit) {
              // Pass row._raw if it exists, otherwise the row itself
              window.openStudentFullEdit(row._raw || row, () => renderStudents(area));
            } else if (window._editRecord) {
              window._editRecord('students', row.id);
            }
          };
          
          const delBtn = document.createElement('button');
          delBtn.className = 'btn btn-danger btn-icon btn-sm';
          delBtn.innerHTML = '&#128465;';
          delBtn.onclick = (e) => {
             e.stopPropagation();
             if (window._deleteRecord) window._deleteRecord('students', row.id, row.displayName);
          };
          
          div.appendChild(profileBtn);
          div.appendChild(printBtn);
          div.appendChild(editBtn);
          div.appendChild(delBtn);
          return div;
        }
      }
    ]
  });

  // Bind custom filters
  const progFilter = document.getElementById('students-filter-program');
  const batchFilter = document.getElementById('students-filter-batch');
  
  if (progFilter && batchFilter) {
    const applyFilters = () => {
      const pid = progFilter.value;
      const bid = batchFilter.value;
      let newData = gridData;
      if (pid) newData = newData.filter(s => s.program_id === pid);
      if (bid) newData = newData.filter(s => s.batch_id === bid);
      studentGrid.updateData(newData);
    };

    progFilter.addEventListener('change', () => {
      const pid = progFilter.value;
      Array.from(batchFilter.options).forEach(opt => {
        if (opt.value === '') {
          opt.style.display = '';
        } else {
          opt.style.display = (!pid || opt.getAttribute('data-prog') === pid) ? '' : 'none';
        }
      });
      if (batchFilter.selectedOptions[0] && batchFilter.selectedOptions[0].style.display === 'none') {
        batchFilter.value = '';
      }
      applyFilters();
    });

    batchFilter.addEventListener('change', applyFilters);
  }
}

export function openStudentProfile(studentId, batchStudentIds = [], skipHistory = false) {
  if (typeof window.openStudentProfile === 'function') {
    return window.openStudentProfile(studentId, batchStudentIds, skipHistory);
  }
}

// ---- HELPERS ----
// escHtml is already declared at the top of this module
  // return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// }

// ---- FULL EDIT MODAL (#modal-student-full-edit) ----
function buildFullEditModal() {
  if (document.getElementById('modal-student-full-edit')) return;
  const modal = document.createElement('div');
  modal.id = 'modal-student-full-edit';
  modal.className = 'modal-backdrop hidden';
  modal.style.zIndex = '9999';
  modal.innerHTML = `
    <div class="modal-box" style="max-width:680px;width:95%;max-height:90vh;overflow-y:auto;background:#0f172a;border:1px solid var(--clr-border);border-radius:12px;box-shadow:0 20px 40px rgba(0,0,0,0.6);">
      <div class="modal-header" style="display:flex;justify-content:space-between;align-items:center;padding:1.25rem 1.5rem;border-bottom:1px solid var(--clr-border);">
        <h3 id="bfe-title" style="margin:0;font-size:1.15rem;font-weight:800;color:var(--clr-text-1);">Edit Student</h3>
        <button class="btn-icon" id="bfe-close" title="Close" style="background:transparent;border:none;color:var(--clr-text-2);font-size:1.2rem;cursor:pointer;">&#10005;</button>
      </div>
      <div id="bfe-body" style="padding:1.5rem;"></div>
      <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:.75rem;padding:1rem 1.5rem;border-top:1px solid var(--clr-border);">
        <button class="btn btn-ghost" id="bfe-cancel">Cancel</button>
        <button class="btn btn-primary" id="bfe-save">Save Changes</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function handleGuardClose(modal, onDiscard) {
  if (window.isProfileDirty) {
    const saveIt = confirm("⚠️ You have unsaved profile changes.\\n\\nClick OK to SAVE and leave, or CANCEL to discard changes and leave.");
    if (saveIt) {
      document.getElementById('bfe-save')?.click();
      return;
    } else {
      window.isProfileDirty = false;
      if (typeof onDiscard === 'function') onDiscard();
      modal.classList.add('hidden');
      return;
    }
  }
  modal.classList.add('hidden');
}

export async function openStudentFullEdit(student, onSaved) {
  buildFullEditModal();
  const modal   = document.getElementById('modal-student-full-edit');
  const title   = document.getElementById('bfe-title');
  const body    = document.getElementById('bfe-body');
  let   saveBtn = document.getElementById('bfe-save');

  // Reset dirty flag and check for local draft buffer
  window.isProfileDirty = false;
  const draftKey = 'topscore_student_draft_' + (student?.id || 'new');
  let draftData = null;
  try {
    const rawDraft = localStorage.getItem(draftKey);
    if (rawDraft) draftData = JSON.parse(rawDraft);
  } catch (e) { /* ignore */ }

  title.textContent = student ? ('Edit — ' + (student.name || 'Student')) : 'Add New Student';

  // Fetch data for dropdowns and level editing
  let batches = [];
  let classes = [];
  let levels = [];
  let studentProgress = [];
  let programs = [];
  try {
    const [bRes, cRes, lRes, pRes, prgRes] = await Promise.all([
      adminFetchAll('batches', 'id, name, program_id, programs(institution_id)'),
      adminFetchAll('classes', 'id, name'),
      adminFetchAll('levels', 'id, name, level_number'),
      adminFetchAll('progress', 'id, student_id, class_id, level_id, status'),
      adminFetchAll('programs', 'id, name, institution_id')
    ]);
    batches = (bRes || []).sort((a,b) => (a.name||'').localeCompare(b.name||''));
    classes = (cRes || []).sort((a,b) => (a.name||'').localeCompare(b.name||''));
    levels = lRes || [];
    programs = prgRes || [];
    if (student?.id) {
      studentProgress = (pRes || []).filter(p => p.student_id === student.id);
    }
  } catch (err) {
    console.warn('Could not load lookup data for edit modal:', err);
  }

  const initialName = draftData?.name ?? (student?.name || '');
  const initialGender = draftData?.gender ?? (student?.gender || '');
  const initialBirth = draftData?.birth_date ?? (student?.birth_date || '');
  const initialPin = draftData?.pin || '';
  const initialBatchId = draftData?.batch_id ?? (student?.batch_id || '');
  const initialLevelId = draftData?.level_id ?? (student?.level_id || '');
  const initialActive = draftData?.is_active ?? (student?.is_active !== false);
  let currentPhotoUrl = draftData?.photo_url ?? (student?.photo_url || '');

  body.innerHTML = `
    <div style="display:flex;gap:1.5rem;flex-wrap:wrap;">
      <!-- 3:4 Avatar Center-Crop Upload (Left) -->
      <div style="flex:1;min-width:140px;max-width:180px;text-align:center;">
        <label class="form-label" style="display:block;margin-bottom:0.5rem;font-size:0.8rem;text-transform:uppercase;color:var(--clr-text-3);">3:4 Avatar</label>
        <div style="width:120px;height:160px;margin:0 auto;border-radius:8px;overflow:hidden;border:2px solid var(--clr-border);background:rgba(0,0,0,0.25);position:relative;">
          <img id="bfe-avatar-preview" src="${getBustedAvatarUrl(currentPhotoUrl)}" alt="Avatar" style="width:100%;height:100%;object-fit:cover;" />
          <div id="bfe-avatar-loading" class="hidden" style="position:absolute;inset:0;background:rgba(15,23,42,0.95);backdrop-filter:blur(5px);display:flex;align-items:center;justify-content:center;">
            <div class="spinner" style="width:20px;height:20px;"></div>
          </div>
        </div>
        <div style="margin-top:0.75rem;">
          <label for="bfe-avatar-file" class="btn btn-secondary btn-xs" style="cursor:pointer;font-size:0.75rem;">
            📸 Upload (3:4)
          </label>
          <input type="file" id="bfe-avatar-file" accept="image/*" style="display:none;" />
          <div class="text-xs text-muted mt-1" style="font-size:0.7rem;">240x320 WebP &bull; 35% Top Bias</div>
        </div>
      </div>

      <!-- Main Fields (Right) -->
      <div style="flex:2.5;min-width:260px;display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Full Name *</label>
          <input class="form-control" id="bfe-name" value="${escHtml(initialName)}" placeholder="e.g. Johnathan Doe">
        </div>
        
        <div class="form-group">
          <label class="form-label">Honorific &amp; Gender</label>
          <select class="form-control" id="bfe-gender">
            <option value="">-- Unassigned --</option>
            <option value="male" ${initialGender === 'male' ? 'selected' : ''}>Mr. (Male)</option>
            <option value="female" ${initialGender === 'female' ? 'selected' : ''}>Miss (Female)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Date of Birth</label>
          <input type="date" class="form-control" id="bfe-birth" value="${escHtml(initialBirth)}">
        </div>

        <div class="form-group">
          <label class="form-label">Assigned Batch</label>
          <select class="form-control" id="bfe-batch">
            <option value="">-- No Batch Assigned --</option>
            ${batches.map(b => `<option value="${b.id}" ${b.id === initialBatchId ? 'selected' : ''}>${escHtml(b.name)}</option>`).join('')}
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Personal PIN (Reset)</label>
          <input type="text" class="form-control" id="bfe-pin" value="${escHtml(initialPin)}" placeholder="Leave blank to keep unchanged" autocomplete="new-password">
        </div>

        <div class="form-group" style="grid-column:1/-1;">
          <label class="form-label">Account Status</label>
          <select class="form-control" id="bfe-active">
            <option value="true"  ${initialActive ? 'selected' : ''}>Active</option>
            <option value="false" ${!initialActive  ? 'selected' : ''}>Inactive / Suspended</option>
          </select>
        </div>

        ${(() => {
          if (!levels || levels.length === 0) return '';
          let options = '<option value="">-- Inherit from Batch --</option>';
          levels.forEach(lvl => {
            options += '<option value="' + lvl.id + '" ' + (lvl.id === initialLevelId ? 'selected' : '') + '>' + escHtml(lvl.name) + '</option>';
          });
          return `
            <div style="grid-column:1/-1; margin-top:0.5rem; border-top:1px solid var(--clr-border); padding-top:1rem;">
              <h4 style="margin:0 0 0.75rem 0; font-size:0.95rem; display:flex; justify-content:space-between; align-items:center;">
                <span>📈 Manual Level Assignment</span>
                <span class="badge badge-neutral" style="font-weight:normal;">Applies instantly upon save</span>
              </h4>
              <div style="background:rgba(0,0,0,0.1); padding:1rem; border-radius:8px; border:1px solid var(--clr-border);">
                <div class="form-group mb-0">
                  <label class="form-label">Student's Current Level</label>
                  <select class="form-control" id="bfe-level">
                    ${options}
                  </select>
                </div>
              </div>
            </div>
          `;
        })()}
      </div>
    </div>
  `;

  // Write-Ahead Buffer & Dirty Tracking
  const updateDraft = () => {
    window.isProfileDirty = true;
    const currentDraft = {
      name: document.getElementById('bfe-name').value,
      gender: document.getElementById('bfe-gender').value,
      birth_date: document.getElementById('bfe-birth').value,
      batch_id: document.getElementById('bfe-batch').value,
      pin: document.getElementById('bfe-pin').value,
      is_active: document.getElementById('bfe-active').value === 'true',
      level_id: document.getElementById('bfe-level')?.value || null
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(currentDraft));
    } catch (e) { /* ignore */ }
  };

  ['bfe-name', 'bfe-gender', 'bfe-birth', 'bfe-batch', 'bfe-level', 'bfe-pin', 'bfe-active'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateDraft);
    document.getElementById(id)?.addEventListener('change', updateDraft);
  });
  
  // Avatar Upload Listener (3:4 Center-Crop Engine)
  const avatarFileInput = document.getElementById('bfe-avatar-file');
  avatarFileInput?.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const loading = document.getElementById('bfe-avatar-loading');
    loading?.classList.remove('hidden');

    try {
      const avatarUrl = await uploadStudentAvatar(file, student?.id);
      currentPhotoUrl = avatarUrl;
      document.getElementById('bfe-avatar-preview').src = getBustedAvatarUrl(avatarUrl, initialName, initialGender);
      updateDraft();
      showToast('Student avatar uploaded to CDN (3:4 WebP format).', 'success');
    } catch (err) {
      showToast('Avatar processing error: ' + err.message, 'error');
    } finally {
      loading?.classList.add('hidden');
      avatarFileInput.value = '';
    }
  });

  // Close & Cancel buttons with Unsaved Changes Guard
  document.getElementById('bfe-close').onclick = () => handleGuardClose(modal, () => localStorage.removeItem(draftKey));
  document.getElementById('bfe-cancel').onclick = () => handleGuardClose(modal, () => localStorage.removeItem(draftKey));

  // Save Changes
  const newSaveBtn = saveBtn.cloneNode(true);
  saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

  newSaveBtn.onclick = async () => {
    const name = document.getElementById('bfe-name').value.trim();
    if (!name) { showToast('Student name is required.', 'error'); return; }

    const selectedBatchId = document.getElementById('bfe-batch').value || null;
    let selectedProgramId = student?.program_id || null;
    let selectedInstitutionId = student?.institution_id || null;
    if (selectedBatchId && batches) {
      const bObj = batches.find(b => b.id === selectedBatchId);
      if (bObj && bObj.program_id) {
        selectedProgramId = bObj.program_id;
        selectedInstitutionId = bObj.programs?.institution_id || (programs || []).find(p => p.id === bObj.program_id)?.institution_id || null;
      }
    }

    const payload = {
      name,
      gender:         document.getElementById('bfe-gender').value || null,
      birth_date:     document.getElementById('bfe-birth').value  || null,
      batch_id:       selectedBatchId,
      program_id:     selectedProgramId,
      institution_id: selectedInstitutionId,
      level_id:       document.getElementById('bfe-level')?.value   || null,
      is_active:      document.getElementById('bfe-active').value === 'true',
      photo_url:      currentPhotoUrl || null,
    };
    const pinVal = document.getElementById('bfe-pin').value.trim();
    if (pinVal) payload.pin_hash = await sha256(pinVal);

    newSaveBtn.disabled = true;
    newSaveBtn.textContent = 'Saving...';
    try {
      const sb = await getSupabase();
      let finalStudentId = student?.id;
      
      if (finalStudentId) {
        await adminUpdate('students', finalStudentId, payload);
        showToast('Student updated successfully.', 'success');
      } else {
        const created = await adminInsert('students', payload);
        finalStudentId = created.id;
        showToast('Student created successfully.', 'success');
      }

      

      window.isProfileDirty = false;
      localStorage.removeItem(draftKey);
      modal.classList.add('hidden');
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      showToast(err.message || 'Save failed.', 'error');
    } finally {
      newSaveBtn.disabled = false;
      newSaveBtn.textContent = 'Save Changes';
    }
  };

  modal.classList.remove('hidden');
}

// Expose globally
window.openStudentFullEdit = openStudentFullEdit;


