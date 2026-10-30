import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('--- TESTING DATABASE REMEDIAL SYNC FOR THEME EXAM PAIRS ---');

// The 4 students with mismatched Theme B remedial status:
const studentNames = ['Ahmad Nur Suhendro', 'Asmul Kholid', 'Nurhaliza', 'Latifa Maulidya'];

for (const name of studentNames) {
  const { data: students } = await supabase.from('students').select('id, name').ilike('name', `%${name}%`);
  if (!students || students.length === 0) continue;
  const s = students[0];

  const { data: atts } = await supabase
    .from('attempts')
    .select('id, score, percentage, effective_score, grade, is_remedial_unlocked, total_questions, tests(title, shell_code, payload)')
    .eq('student_id', s.id)
    .eq('is_best_score', true);

  const bExams = (atts || []).filter(a => a.tests?.shell_code?.includes('3B-') && a.tests?.shell_code?.includes('EXAM'));

  console.log(`\nStudent: "${s.name}" (ID: ${s.id.slice(0, 8)}...)`);
  bExams.forEach(a => {
    console.log(`  - ${a.tests?.shell_code}: is_remedial_unlocked=${Boolean(a.is_remedial_unlocked)}, score=${a.score}/${a.total_questions}, effScore=${a.effective_score}, grade=${a.grade}`);
  });
}

