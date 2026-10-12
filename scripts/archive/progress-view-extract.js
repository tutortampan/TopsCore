export async function renderProgressView(area) {
  area.innerHTML = `
        <div class="section-header">
          <div>
            <h2 class="section-title">Student Progress <span class="count-chip" id="prog-count-chip">Loading...</span></h2>
            <p class="section-subtitle">Assessment progression and completion status filterable by Program, Class, and Batch</p>
          </div>
        </div>
        <div class="p-5 text-center text-muted"><span class="loader"></span> Loading progression data...</div>
      `;

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

      assignedAssesIds.forEach(assessmentId => {
        const assessment = assessmentsMap.get(assessmentId);
        if (!assessment) return;

        const studentAttempts = (allAttempts || []).filter(att => att.student_id === student.id && att.assessment_id === assessmentId);
        const isCompleted = studentAttempts.some(att => att.status === 'SUBMITTED' || att.status === 'AUTO_SUBMITTED');
        const isInProgress = studentAttempts.some(att => att.status === 'IN_PROGRESS');

        allData.push({
          student: student,
          assessmentTitle: assessment.title,
          levelNumber: assessment.levels?.level_number || 1,
          levelName: assessment.levels?.name || 'Unknown',
          is_completed: isCompleted,
          is_in_progress: isInProgress
        });
      });
    });

    // Default: sort alphabetically by Student Name (A-Z)
    allData.sort((a, b) => (a.student.name || '').localeCompare(b.student.name || ''));

    area.innerHTML = `
          <div class="section-header">
            <div>
              <h2 class="section-title">Student Progress <span class="count-chip" id="prog-count-chip">${allData.length} Records</span></h2>
              <p class="section-subtitle">Assessment progression and completion status filterable by Program, Class, and Batch</p>
            </div>
          </div>

          <div class="d-flex align-center gap-3 flex-wrap p-3 mb-4 rounded" style="background:var(--clr-surface-2); border:1px solid var(--clr-border);">
            <div style="min-width:180px;">
              <label class="text-xs text-muted d-block mb-1">Filter Class</label>
              <select id="prog-filter-class" class="form-control" style="padding:6px 10px;font-size:0.85rem;">
                <option value="">&mdash; All Programs &mdash;</option>
                ${(allPrograms || []).filter(c => !c.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(c => `<option value="${c.id}" data-inst="${c.institution_id}">${escapeHtml(c.name)}</option>`).join('')}
              </select>
            </div>

            <div style="min-width:180px;">
              <label class="text-xs text-muted d-block mb-1">Filter Batch (Group)</label>
              <select id="prog-filter-batch" class="form-control" style="padding:6px 10px;font-size:0.85rem;">
                <option value="">&mdash; All Batches &mdash;</option>
                ${(allBatches || []).filter(b => !b.deleted_at).sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(b => `<option value="${b.id}" data-prog="${b.program_id}">${escapeHtml(b.name)}</option>`).join('')}
              </select>
            </div>

            <div style="flex:1;min-width:220px;">
              <label class="text-xs text-muted d-block mb-1">Search Student / Assessment</label>
              <input type="text" id="prog-filter-search" class="form-control" placeholder="Type student name or assessment..." style="padding:6px 10px;font-size:0.85rem;">
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
                  <th class="text-left">Program</th>
                  <th class="text-left">Class</th>
                  <th class="text-left">Batch</th>
                  <th class="text-left">Assessment</th>
                  <th class="text-center">Level</th>
                  <th class="text-center">Status</th>
                  <th class="text-center">Completion</th>
                </tr>
              </thead>
              <tbody id="tbl-progress-body"></tbody>
            </table>
          </div>
        `;

    const progSelect = document.getElementById('prog-filter-prog');
    const classSelect = document.getElementById('prog-filter-class');
    const batchSelect = document.getElementById('prog-filter-batch');
    const searchInput = document.getElementById('prog-filter-search');
    const tbody = document.getElementById('tbl-progress-body');
    const countChip = document.getElementById('prog-count-chip');

    const updateClassOptions = () => {
      const pId = progSelect?.value;
      if (!pId) return;
      Array.from(classSelect.options).forEach((opt, idx) => {
        if (idx === 0) return;
        const match = !pId || opt.getAttribute('data-prog') === pId;
        opt.style.display = match ? '' : 'none';
      });
      if (pId && classSelect.selectedOptions[0]?.style.display === 'none') {
        classSelect.value = '';
      }
      updateBatchOptions();
    };

    const updateBatchOptions = () => {
      const cId = classSelect.value;
      Array.from(batchSelect.options).forEach((opt, idx) => {
        if (idx === 0) return;
        const match = !cId || opt.getAttribute('data-class') === cId;
        opt.style.display = match ? '' : 'none';
      });
      if (cId && batchSelect.selectedOptions[0]?.style.display === 'none') {
        batchSelect.value = '';
      }
    };

    const renderTable = () => {
      const pId = progSelect ? progSelect.value : '';
      const cId = classSelect.value;
      const bId = batchSelect.value;
      const q = searchInput.value.toLowerCase().trim();

      const filtered = allData.filter(r => {
        const studentProgId = r.student?.programs?.institutions?.id || r.student?.programs?.institution_id;
        if (pId && studentProgId !== pId) return false;
        if (cId && r.student?.program_id !== cId) return false;
        if (bId && r.student?.batch_id !== bId) return false;
        if (q) {
          const sName = (r.student?.name || '').toLowerCase();
          const sSubj = (r.assessmentTitle || '').toLowerCase();
          if (!sName.includes(q) && !sSubj.includes(q)) return false;
        }
        return true;
      });

      countChip.textContent = `${filtered.length} of ${allData.length}`;

      if (!filtered.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted p-5">No progression records match the selected filters.</td></tr>';
        return;
      }

      tbody.innerHTML = filtered.map(r => `
            <tr>
              <td class="fw-600" style="color:var(--clr-text-1);">${formatStudentName(r.student?.name, r.student?.gender) || '—'}</td>
              <td class="text-muted text-sm">${escapeHtml(r.student?.programs?.institutions?.name || '—')}</td>
              <td class="text-muted text-sm">${escapeHtml(r.student?.programs?.name || '—')}</td>
              <td><span class="badge ${r.student?.batches?.name ? 'badge-info' : 'badge-neutral'}" style="font-size:0.75rem;">${escapeHtml(r.student?.batches?.name || 'Unassigned')}</span></td>
              <td class="fw-600 text-sm">${escapeHtml(r.assessmentTitle || '—')}</td>
              <td class="text-center"><span class="badge badge-primary">Level ${toLevelLetter(r.levelNumber)} ${escapeHtml(r.levelName || '')}</span></td>
              <td class="text-center">
                <span class="badge ${r.is_completed ? 'badge-success' : r.is_in_progress ? 'badge-warning' : 'badge-neutral'}">
                  ${r.is_completed ? '&#10004;&#65039; Completed' : r.is_in_progress ? '&#9654;&#65039; In Progress' : '&#128276; Not Started'}
                </span>
              </td>
              <td class="text-center">
                <div class="progress-pill">
                  <div class="progress-pill-fill" style="width:${r.is_completed ? 100 : r.is_in_progress ? 50 : 0}%;"></div>
                </div>
              </td>
            </tr>
          `).join('');
    };

    progSelect?.addEventListener('change', () => { updateClassOptions(); renderTable(); });
    classSelect.addEventListener('change', () => { updateBatchOptions(); renderTable(); });
    batchSelect.addEventListener('change', renderTable);
    searchInput.addEventListener('input', renderTable);
    document.getElementById('prog-btn-reset')?.addEventListener('click', () => {
      if (progSelect) progSelect.value = '';
      classSelect.value = '';
      batchSelect.value = '';
      searchInput.value = '';
      updateClassOptions();
      renderTable();
    });

    renderTable();

  } catch (err) {
    console.error('Failed to load progress', err);
    area.innerHTML = `<div class="p-5 text-center text-error">Failed to load progression data: ${err.message}</div>`;
  }
}

window.viewClassInstanceRoster = async function (classInstanceId) {
  const modal = document.getElementById('roster-modal');
  const tbody = document.getElementById('roster-modal-tbody');
  const select = document.getElementById('roster-add-student-select');
  const addBtn = document.getElementById('roster-add-student-btn');

  modal.classList.remove('hidden');
  tbody.innerHTML = '<tr><td colspan="2" class="text-center">Loading roster...</td></tr>';

  try {
    const roster = await fetchClassInstanceRoster(classInstanceId);
    if (roster.length === 0) {
      tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted">No students enrolled yet.</td></tr>';
    } else {
      tbody.innerHTML = roster.map(s => `
        <tr style="border-bottom: 1px solid var(--clr-border);">
          <td style="padding:8px 0;">${escapeHtml(s.name)}</td>
          <td class="text-right" style="padding:8px 0;">
            <span class="badge ${s.enrollment_type === 'auto' ? 'badge-primary' : 'badge-warning'}">${s.enrollment_type === 'auto' ? 'Auto-Enrolled' : 'Manual / Dropped'}</span>
          </td>
        </tr>
      `).join('');
    }

    // Populate dropdown with all students (excluding those already in the roster)
    const allStudents = window._adminStore?.students || [];
    const rosterIds = new Set(roster.map(s => s.id));
    select.innerHTML = '<option value="">Select student to manually enroll...</option>' +
      allStudents.filter(s => !rosterIds.has(s.id)).map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');

    addBtn.onclick = async () => {
      const studentId = select.value;
      if (!studentId) return;
      addBtn.disabled = true;
      addBtn.textContent = 'Adding...';
      try {
        await addAdditionalMember(classInstanceId, studentId);
        await window.viewClassInstanceRoster(classInstanceId); // Refresh modal
      } catch (e) {
        alert('Failed to add member: ' + e.message);
      } finally {
        addBtn.disabled = false;
        addBtn.textContent = 'Add to Roster';
      }
    };
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="2" class="text-center text-danger">Error: ${err.message}</td></tr>`;
  }
};

// ============================================================
// Assessment RECALIBRATOR
// ============================================================
