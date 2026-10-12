const fs = require('fs');

let js = fs.readFileSync('js/admin/class.js', 'utf8');

const newRenderProgressView = `export async function renderProgressView(area) {
  area.innerHTML = \`
        <div class="section-header">
          <div>
            <h2 class="section-title">Student Progress <span class="count-chip" id="prog-count-chip">Loading...</span></h2>
            <p class="section-subtitle">Overview of student assessment completion filterable by Program, Class, and Batch</p>
          </div>
        </div>
        <div class="p-5 text-center text-muted"><span class="loader"></span> Loading progression data...</div>
      \`;

  try {
    const [allStudents, allInstitutions, allPrograms, allBatches, allAssignments, allAssessments, allAttempts] = await Promise.all([
      adminFetchAll('students', '*, batches!batch_id(name), programs!program_id(name, institution_id, institutions!institution_id(name))'),
      adminFetchAll('institutions'),
      adminFetchAll('programs'),
      adminFetchAll('batches'),
      adminFetchAll('assignments', 'student_id, batch_id, assessment_id'),
      adminFetchAll('assessments', 'id, title, level_id, levels(name, level_number)'),
      adminFetchAll('attempts', '*, students!student_id(name, gender, batch_id, batches!batch_id(name), program_id, programs!program_id(name, institution_id, institutions!institution_id(name))), assessments(title, assessment_type), attempt_answers(id, evaluation_result, score)')
    ]);

    const allData = [];

    // Map V1 Data
    const assessmentsMap = new Map((allAssessments || []).map(a => [a.id, a]));

    (allStudents || []).filter(s => !s.deleted_at).forEach(student => {
      const sAssignments = (allAssignments || []).filter(a =>
        a.student_id === student.id || (a.batch_id && a.batch_id === student.batch_id)
      );

      const studentBatch = allBatches.find(b => b.id === student.batch_id);
      const studentLevelId = studentBatch ? studentBatch.current_level_id : null;
      
      // Auto-assign assessments based on Level (if batch has a level_id)
      const levelAssesIds = studentLevelId ? (allAssessments || []).filter(a => a.level_id === studentLevelId).map(a => a.id) : [];

      // To avoid duplicates if both student and batch assigned
      const assignedAssesIds = new Set([...sAssignments.map(a => a.assessment_id), ...levelAssesIds]);

      if (assignedAssesIds.size === 0) return; // Skip students with no assessments assigned

      let completedCount = 0;
      let inProgressCount = 0;
      const studentDetails = [];

      assignedAssesIds.forEach(assessmentId => {
        const assessment = assessmentsMap.get(assessmentId);
        if (!assessment) return;

        const studentAttempts = (allAttempts || []).filter(att => att.student_id === student.id && att.assessment_id === assessmentId);
        const isCompleted = studentAttempts.some(att => att.status === 'SUBMITTED' || att.status === 'AUTO_SUBMITTED');
        const isInProgress = studentAttempts.some(att => att.status === 'IN_PROGRESS');

        if (isCompleted) completedCount++;
        else if (isInProgress) inProgressCount++;

        studentDetails.push({
          assessmentTitle: assessment.title,
          levelNumber: assessment.levels?.level_number || 1,
          levelName: assessment.levels?.name || 'Unknown',
          is_completed: isCompleted,
          is_in_progress: isInProgress
        });
      });

      // Sort details by level then alphabetically
      studentDetails.sort((a, b) => {
        if (a.levelNumber !== b.levelNumber) return a.levelNumber - b.levelNumber;
        return (a.assessmentTitle || '').localeCompare(b.assessmentTitle || '');
      });

      allData.push({
        student: student,
        totalAssigned: assignedAssesIds.size,
        completedCount,
        inProgressCount,
        details: studentDetails
      });
    });

    // Default: sort alphabetically by Student Name (A-Z)
    allData.sort((a, b) => (a.student.name || '').localeCompare(b.student.name || ''));

    area.innerHTML = \`
          <div class="section-header">
            <div>
              <h2 class="section-title">Student Progress <span class="count-chip" id="prog-count-chip">\${allData.length} Students</span></h2>
              <p class="section-subtitle">Overview of student assessment completion filterable by Program, Class, and Batch</p>
            </div>
          </div>

          <div class="d-flex align-center gap-3 flex-wrap p-3 mb-4 rounded" style="background:var(--clr-surface-2); border:1px solid var(--clr-border);">
            <div style="min-width:180px;">
              <label class="text-xs text-muted d-block mb-1">Filter Class</label>
              <select id="prog-filter-class" class="form-control" style="padding:6px 10px;font-size:0.85rem;">
                <option value="">&mdash; All Programs &mdash;</option>
                \${(allPrograms || []).filter(c => !c.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(c => \`<option value="\${c.id}" data-inst="\${c.institution_id}">\${escapeHtml(c.name)}</option>\`).join('')}
              </select>
            </div>

            <div style="min-width:180px;">
              <label class="text-xs text-muted d-block mb-1">Filter Batch (Group)</label>
              <select id="prog-filter-batch" class="form-control" style="padding:6px 10px;font-size:0.85rem;">
                <option value="">&mdash; All Batches &mdash;</option>
                \${(allBatches || []).filter(b => !b.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(b => \`<option value="\${b.id}" data-prog="\${b.program_id}">\${escapeHtml(b.name)}</option>\`).join('')}
              </select>
            </div>

            <div style="flex:1;min-width:220px;">
              <label class="text-xs text-muted d-block mb-1">Search Student</label>
              <input type="text" id="prog-filter-search" class="form-control" placeholder="Type student name..." style="padding:6px 10px;font-size:0.85rem;">
            </div>

            <div class="d-flex align-end" style="padding-top:18px;">
              <button class="btn btn-ghost btn-sm" id="prog-btn-reset" title="Reset all filters">&#10006; Reset</button>
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th class="text-left">Student Name</th>
                  <th class="text-left">Institution</th>
                  <th class="text-left">Program</th>
                  <th class="text-left">Batch</th>
                  <th class="text-center">Assessments</th>
                  <th class="text-center">Completion</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="tbl-progress-body"></tbody>
            </table>
          </div>
        \`;

    const classSelect = document.getElementById('prog-filter-class');
    const batchSelect = document.getElementById('prog-filter-batch');
    const searchInput = document.getElementById('prog-filter-search');
    const tbody = document.getElementById('tbl-progress-body');
    const countChip = document.getElementById('prog-count-chip');

    const updateBatchOptions = () => {
      const cId = classSelect.value;
      Array.from(batchSelect.options).forEach((opt, idx) => {
        if (idx === 0) return;
        const match = !cId || opt.getAttribute('data-class') === cId || opt.getAttribute('data-prog') === cId;
        opt.style.display = match ? '' : 'none';
      });
      if (cId && batchSelect.selectedOptions[0]?.style.display === 'none') {
        batchSelect.value = '';
      }
    };

    window.showStudentProgressDetails = function(studentId) {
       const rec = allData.find(d => d.student.id === studentId);
       if (!rec) return;
       const existing = document.getElementById('prog-details-modal');
       if (existing) existing.remove();
       
       const modal = document.createElement('div');
       modal.id = 'prog-details-modal';
       modal.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.95);backdrop-filter:blur(5px);z-index:9999;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;';
       
       const detailsRows = rec.details.map(r => \`
            <tr>
              <td class="fw-600 text-sm">\${escapeHtml(r.assessmentTitle || '—')}</td>
              <td class="text-center"><span class="badge badge-primary">Level \${toLevelLetter(r.levelNumber)} \${escapeHtml(r.levelName || '')}</span></td>
              <td class="text-center">
                <span class="badge \${r.is_completed ? 'badge-success' : r.is_in_progress ? 'badge-warning' : 'badge-neutral'}">
                  \${r.is_completed ? '&#10004;&#65039; Completed' : r.is_in_progress ? '&#9654;&#65039; In Progress' : '&#128276; Not Started'}
                </span>
              </td>
            </tr>
       \`).join('');

       modal.innerHTML = \`
         <div style="background:var(--fm-bg-panel, #0F172A);border:1px solid var(--clr-border);border-radius:12px;width:100%;max-width:700px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 10px 30px rgba(0,0,0,0.5);">
            <div style="padding:1.5rem;border-bottom:1px solid var(--clr-border);display:flex;justify-content:space-between;align-items:center;">
              <h3 style="margin:0;">Assessment Details: \${escapeHtml(rec.student.name)}</h3>
              <button class="btn-icon" onclick="document.getElementById('prog-details-modal').remove()" style="background:transparent;border:none;color:var(--clr-text-2);font-size:1.2rem;cursor:pointer;">&#10005;</button>
            </div>
            <div style="padding:1.5rem;overflow-y:auto;flex:1;">
               <div class="d-flex gap-4 mb-4" style="background:rgba(255,255,255,0.05);padding:1rem;border-radius:8px;">
                 <div><div class="text-xs text-muted">Assigned</div><div class="fw-700" style="font-size:1.2rem;">\${rec.totalAssigned}</div></div>
                 <div><div class="text-xs text-muted">Completed</div><div class="fw-700" style="font-size:1.2rem;color:var(--clr-success);">\${rec.completedCount}</div></div>
                 <div><div class="text-xs text-muted">In Progress</div><div class="fw-700" style="font-size:1.2rem;color:var(--clr-warning);">\${rec.inProgressCount}</div></div>
               </div>
               <table class="table-wrap" style="width:100%;">
                 <thead>
                   <tr>
                     <th class="text-left">Assessment</th>
                     <th class="text-center">Level</th>
                     <th class="text-center">Status</th>
                   </tr>
                 </thead>
                 <tbody>\${detailsRows}</tbody>
               </table>
            </div>
         </div>
       \`;
       document.body.appendChild(modal);
       modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    };

    const renderTable = () => {
      const cId = classSelect.value;
      const bId = batchSelect.value;
      const q = searchInput.value.toLowerCase().trim();

      const filtered = allData.filter(r => {
        if (cId && r.student?.program_id !== cId) return false;
        if (bId && r.student?.batch_id !== bId) return false;
        if (q) {
          const sName = (r.student?.name || '').toLowerCase();
          if (!sName.includes(q)) return false;
        }
        return true;
      });

      countChip.textContent = \`\${filtered.length} of \${allData.length} Students\`;

      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted p-5">No progression records match the selected filters.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(r => {
        const pct = r.totalAssigned > 0 ? Math.round((r.completedCount / r.totalAssigned) * 100) : 0;
        return \`
            <tr>
              <td class="fw-600" style="color:var(--clr-text-1);">\${formatStudentName(r.student?.name, r.student?.gender) || '—'}</td>
              <td class="text-muted text-sm">\${escapeHtml(r.student?.programs?.institutions?.name || '—')}</td>
              <td class="text-muted text-sm">\${escapeHtml(r.student?.programs?.name || '—')}</td>
              <td><span class="badge \${r.student?.batches?.name ? 'badge-info' : 'badge-neutral'}" style="font-size:0.75rem;">\${escapeHtml(r.student?.batches?.name || 'Unassigned')}</span></td>
              <td class="text-center fw-600 text-sm">
                <span style="color:var(--clr-success);">\${r.completedCount}</span> / \${r.totalAssigned}
              </td>
              <td class="text-center" style="min-width:120px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div class="progress-pill" style="flex:1;height:8px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden;">
                    <div class="progress-pill-fill" style="height:100%;width:\${pct}%; background: \${pct === 100 ? 'var(--clr-success)' : 'var(--clr-primary)'};"></div>
                  </div>
                  <span class="text-xs fw-700">\${pct}%</span>
                </div>
              </td>
              <td class="text-right">
                <button class="btn btn-secondary btn-sm" onclick="window.showStudentProgressDetails('\${r.student.id}')">Details</button>
              </td>
            </tr>
          \`;
      }).join('');
    };

    classSelect.addEventListener('change', () => { updateBatchOptions(); renderTable(); });
    batchSelect.addEventListener('change', renderTable);
    searchInput.addEventListener('input', renderTable);
    document.getElementById('prog-btn-reset')?.addEventListener('click', () => {
      classSelect.value = '';
      batchSelect.value = '';
      searchInput.value = '';
      updateBatchOptions();
      renderTable();
    });

    renderTable();

  } catch (err) {
    console.error('Failed to load progress', err);
    area.innerHTML = \`<div class="p-5 text-center text-error">Failed to load progression data: \${err.message}</div>\`;
  }
}`;

const regex = /export async function renderProgressView[\s\S]*?(?=\nexport async function|\nwindow\.viewClassInstanceRoster)/;
if (regex.test(js)) {
  js = js.replace(regex, newRenderProgressView + '\n');
  fs.writeFileSync('js/admin/class.js', js);
  console.log('Replaced renderProgressView');
} else {
  console.log('Could not find renderProgressView');
}
