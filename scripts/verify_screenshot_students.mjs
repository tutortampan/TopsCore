import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('=== VERIFYING REPAIRED SCORES FOR SCREENSHOT STUDENTS ===\n');

const studentsToCheck = [
  'Aunul',
  'Unggul',
  'Syazida',
  'Nurhaliza',
  'Laura',
  'Gagan',
  'Sofa'
];

for (const name of studentsToCheck) {
  const { data: students } = await supabase.from('students').select('id, name').ilike('name', `%${name}%`);
  if (!students || students.length === 0) continue;

  for (const s of students) {
    const { data: atts } = await supabase
      .from('attempts')
      .select('id, score, percentage, grade, total_questions, is_best_score, tests(title, shell_code)')
      .eq('student_id', s.id)
      .eq('is_best_score', true);

    const examAtts = (atts || []).filter(a => a.tests?.shell_code?.includes('EXAM'));
    if (examAtts.length > 0) {
      console.log(`Student: "${s.name}" (ID: ${s.id.slice(0, 8)}...)`);
      examAtts.forEach(a => {
        console.log(`  * ${a.tests?.shell_code} (${a.tests?.title}): score=${a.score}/${a.total_questions} (${a.percentage}%, Grade ${a.grade})`);
      });
      console.log('');
    }
  }
}

