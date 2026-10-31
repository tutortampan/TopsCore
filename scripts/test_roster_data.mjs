import { createClient } from '@supabase/supabase-js';
import { isWeeklyExam } from '../js/grading.js';

const sb = createClient('https://oclajpyumehpojepcczg.supabase.co', 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB');

async function testRoster() {
  const [rawData, allAttempts, allLevels, allProgress, allPrograms, allBatches, allAssignments, allTests, allClasses] = await Promise.all([
    sb.from('students').select('id, name, gender, birth_date, photo_url, photo_status, is_active, created_at, deleted_at, level_id, batch_id, program_id, institution_id').is('deleted_at', null).eq('batch_id', '3b697c66-da5d-4a68-b823-ba3d06353852'),
    sb.from('attempts').select('id, student_id, test_id, status, score, total_questions, percentage, effective_score, created_at, is_remedial_unlocked, tests(test_type, title, class_id)'),
    sb.from('levels').select('id, name, level_number'),
    sb.from('progress').select('id, student_id, class_id, unlocked_level, highest_score'),
    sb.from('programs').select('id, name, institution_id, is_active'),
    sb.from('batches').select('id, name, program_id, is_active, current_level_id'),
    sb.from('assignments').select('student_id, batch_id, test_id'),
    sb.from('tests').select('id, title, test_type, shell_code, payload, total_questions, display_order, category, level_id, class_id'),
    sb.from('classes').select('id, name, is_active')
  ]);

  const attempts = allAttempts.data || [];
  const tests = allTests.data || [];
  const classes = allClasses.data || [];
  const students = rawData.data || [];

  console.log(`Loaded: ${students.length} students, ${attempts.length} attempts, ${tests.length} tests, ${classes.length} classes.`);

  const classesMap = new Map(classes.filter(c => c.is_active !== false).map(c => [c.id, c]));
  const testsByClass = new Map();
  tests.forEach(t => {
    if (!t.class_id) return;
    if (!testsByClass.has(t.class_id)) testsByClass.set(t.class_id, []);
    testsByClass.get(t.class_id).push(t);
  });

  const attemptsByStudent = new Map();
  attempts.forEach(att => {
    if (!att.student_id) return;
    if (!attemptsByStudent.has(att.student_id)) attemptsByStudent.set(att.student_id, []);
    attemptsByStudent.get(att.student_id).push(att);
  });

  // For 3rd Vocabulary class
  const vocabClass = classes.find(c => c.name.toLowerCase().includes('vocabulary') && c.name.includes('3rd'));
  console.log('Vocab Class:', vocabClass);
  const classTests = testsByClass.get(vocabClass.id) || [];
  console.log('Tests in 3rd Vocab:', classTests.length);
  const exams = classTests.filter(t => isWeeklyExam(t));
  console.log('Exams in 3rd Vocab (isWeeklyExam):', exams.map(e => ({ order: e.display_order, title: e.title, type: e.test_type })));

  // Test for a few students
  for (const s of students.slice(0, 5)) {
    const sAtts = attemptsByStudent.get(s.id) || [];
    const validStatuses = ['submitted', 'auto_submitted', 'evaluated', 'graded'];
    const bestByAsm = new Map();
    sAtts.forEach(a => {
      const st = String(a.status || '').toLowerCase();
      if (!validStatuses.includes(st)) return;
      bestByAsm.set(a.test_id, a);
    });

    const entries = [];
    exams.forEach(ex => {
      const best = bestByAsm.get(ex.id);
      if (best) entries.push(best);
    });

    console.log(`Student ${s.name}: ${sAtts.length} attempts, ${entries.length} exams completed.`);
  }
}

testRoster();
