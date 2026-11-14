import { adminFetchAll, getTestQuestions } from '../api.js?v=20261114_v517';
import { showToast, showLoading, hideLoading } from '../app.js?v=20261106_v160';
import { getSupabase } from '../supabase.js?v=20261106_v160';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';

/**
 * Question Excel Export Module
 * Handles exporting test questions to standardized Excel spreadsheets.
 */
async function renderExportQuestions(area) {
  showLoading('Loading tests for export…');
  let tests = [];
  try {
    tests = await adminFetchAll('tests', 'id, title, test_type, class_id, level_id, program_id, institution_id, classes(name), levels(name), programs(name), institutions(name)');
  } catch (err) {
    console.warn('Export tests fetch warning:', err);
  } finally {
    hideLoading();
  }
  area.innerHTML = `
    <div class="section-header"><div><h2 class="section-title">Export Questions (Excel)</h2></div></div>
    <div class="glass-card p-8" style="max-width:640px;">
      <p class="text-muted mb-4">Export questions from a Test into an Excel workbook formatted with standard columns:</p>
      <div class="mb-5 p-3 rounded" style="background:rgba(255,255,255,0.03);border:1px solid var(--clr-border);font-size: 12px;font-family:monospace;">
        PROGRAM | CLASS | Class | LEVEL | TITLE | WEEK | DAY | TYPE | NO | QUESTION | ANSWER
      </div>
      <div class="form-group"><label class="form-label">Select Test to Export</label>
        <select class="form-control" id="export-test-select">
          <option value="">— Select Test —</option>
          ${[...tests].sort((a, b) => {
            const labelA = `${a.test_type ? a.test_type + ' - ' : ''}${a.title}`;
            const labelB = `${b.test_type ? b.test_type + ' - ' : ''}${b.title}`;
            return labelA.localeCompare(labelB);
          }).map(e => `<option value="${e.id}">${e.test_type ? e.test_type + ' - ' : ''}${e.title}</option>`).join('')}
        </select>
      </div>
      <button class="btn btn-primary mt-2" id="export-questions-btn" style="display:inline-flex;align-items:center;gap:6px;">${getSvgIcon('download', 14)} Download Excel (.xlsx)</button>
    </div>
  `;

  document.getElementById('export-questions-btn')?.addEventListener('click', async () => {
    const testId = document.getElementById('export-test-select').value;
    if (!testId) { showToast('Please select a Test to export.', 'warning'); return; }

    const selectedTest = tests.find(e => e.id === testId);
    showLoading('Preparing Excel export…');

    try {
      let questions = selectedTest?.payload?.questions || [];
      if (!questions.length) {
        try {
          questions = await getTestQuestions(selectedTest);
        } catch (_) {}
      }

      const sortedQuestions = questions.slice().sort((a,b) => (a.question_order || a.display_order || 0) - (b.question_order || b.display_order || 0));
      const programName = selectedTest?.programs?.name || 'Program';
      const instName = selectedTest?.institutions?.name || 'TOP';

      const excelData = sortedQuestions.map((q, idx) => ({
        'PROGRAM': instName,
        'CLASS': programName,
        'Class': q.metadata?.classItem || q.metadata?.Class || selectedTest?.classes?.name || 'Vocab',
        'LEVEL': selectedTest?.levels?.name || '1st Level',
        'TITLE': q.metadata?.title || selectedTest?.title || 'Practice 1',
        'WEEK': q.metadata?.week || '1',
        'DAY': q.metadata?.day || '1',
        'TYPE': q.metadata?.type || selectedTest?.test_type || '1 - VERB',
        'NO': q.question_order || (idx + 1),
        'QUESTION': q.question_text || '',
        'ANSWER': q.correct_answer || ''
      }));

      if (!excelData.length) {
        hideLoading();
        showToast('No questions found for this Test.', 'warning');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(excelData, {
        header: ['PROGRAM', 'CLASS', 'Class', 'LEVEL', 'TITLE', 'WEEK', 'DAY', 'TYPE', 'NO', 'QUESTION', 'ANSWER']
      });

      // Set column widths
      worksheet['!cols'] = [
        { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 6 }, { wch: 35 }, { wch: 25 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');

      const fileName = `${(selectedTest?.title || 'Test').replace(/\s+/g, '_')}_Questions.xlsx`;
      XLSX.writeFile(workbook, fileName);

      hideLoading();
      showToast(`Exported ${excelData.length} questions to ${fileName}`, 'success');
    } catch(err) {
      hideLoading();
      showToast(`Export error: ${err.message}`, 'error');
    }
  });
}

export { renderExportQuestions };
