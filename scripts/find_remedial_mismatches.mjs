import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('--- FINDING THEME EXAM REMEDIAL MISMATCHES ACROSS DATABASE ---');

// Fetch all best attempts for exams
const { data: examAtts, error } = await supabase
  .from('attempts')
  .select('id, student_id, test_id, score, percentage, grade, is_remedial_unlocked, tests(title, shell_code, payload), students(name)')
  .eq('is_best_score', true);

if (error) {
  console.error(error);
  process.exit(1);
}

// Group by student_id and themeCode
const studentThemeExams = {};

(examAtts || []).forEach(att => {
  const code = att.tests?.shell_code || '';
  if (!code.includes('EXAM')) return;

  const rawTheme = att.tests?.payload?.theme_code || code.replace(/^[0-9]+/, '').charAt(0) || 'A';
  const tc = rawTheme.toUpperCase();
  const key = `${att.student_id}_${tc}`;

  if (!studentThemeExams[key]) studentThemeExams[key] = { studentName: att.students?.name, studentId: att.student_id, theme: tc, exams: [] };
  studentThemeExams[key].exams.push(att);
});

const mismatches = [];

Object.values(studentThemeExams).forEach(item => {
  if (item.exams.length < 2) return;
  const remCount = item.exams.filter(e => Boolean(e.is_remedial_unlocked)).length;
  if (remCount > 0 && remCount < item.exams.length) {
    mismatches.push(item);
  }
});

console.log(`Found ${mismatches.length} theme exam pairs with mismatched remedial status:`);
mismatches.forEach((m, idx) => {
  console.log(`\n#${idx + 1} Student: "${m.studentName}" | Theme: ${m.theme}`);
  m.exams.forEach(e => {
    console.log(`   - ${e.tests?.shell_code}: is_remedial_unlocked=${Boolean(e.is_remedial_unlocked)}, score=${e.score}, pct=${e.percentage}%, grade=${e.grade}`);
  });
});

