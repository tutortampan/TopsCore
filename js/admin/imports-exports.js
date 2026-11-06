import { adminFetchAll } from '../api.js?v=20261106_v160';
import { showToast, showLoading, hideLoading } from '../app.js?v=20261106_v160';
import { getSupabase } from '../supabase.js?v=20261106_v160';

/**
 * Question Excel Export Module
 * Handles exporting test questions to standardized Excel spreadsheets.
 */
async function renderExportQuestions(area) {
  showLoading('Loading tests for export…');
  let tests = [];
  try {
    tests = await adminFetchAll('tests', 'id, title, test_type, class_id, level_id');
  } catch (err) {
    console.warn('Export tests fetch warning:', err);
  } finally {
    hideLoading();
  }
  area.innerHTML = `
    <div class="section-header"><div><h2 class="section-title">Export Questions (Excel)</h2></div></div>
    <div class="glass-card p-8" style="max-width:640px;">
      <p class="text-muted mb-4">Export questions from a Test into an Excel workbook formatted with standard columns:</p>
      <div class="mb-5 p-3 rounded" style="background:rgba(255,255,255,0.03);border:1px solid var(--clr-border);font-size:0.75rem;font-family:monospace;">
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
      <button class="btn btn-primary mt-2" id="export-questions-btn">📤 Download Excel (.xlsx)</button>
    </div>
  `;

  document.getElementById('export-questions-btn')?.addEventListener('click', async () => {
    const testId = document.getElementById('export-test-select').value;
    if (!testId) { showToast('Please select a Test to export.', 'warning'); return; }

    const selectedTest = tests.find(e => e.id === testId);
    showLoading('Preparing Excel export…');

    try {
      const sb = await getSupabase();
      let questions = [];
      const [directQRes, testClasses] = await Promise.all([
        sb.from('test_items').select('*').eq('test_id', testId),
        sb.from('assignments').select('programs(name)').eq('test_id', testId)
      ]);
      questions = directQRes?.data || [];
      if (!questions.length) {
        try {
          const { data: sections } = await sb.from('Test_sections').select('id').eq('test_id', testId);
          const sectionIds = (sections || []).map(s => s.id);
          if (sectionIds.length > 0) {
            const { data: secQ } = await sb.from('questions').select('*').in('section_id', sectionIds).is('deleted_at', null);
            if (secQ && secQ.length > 0) questions = secQ;
          }
        } catch (_) {}
      }

      const sortedQuestions = questions.sort((a,b) => (a.question_order || 0) - (b.question_order || 0));
      const programName = testClasses?.data?.[0]?.programs?.name || 'Camp';

      const excelData = sortedQuestions.map((q, idx) => ({
        'PROGRAM': selectedTest?.institutions?.name || 'CEC',
        'CLASS': programName,
        'Class': q.metadata?.classItem || q.metadata?.Class || selectedTest?.classes?.name || 'Vocab',
        'LEVEL': selectedTest?.levels?.name || '3rd Step',
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
