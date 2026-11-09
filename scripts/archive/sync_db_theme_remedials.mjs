import { createClient } from '@supabase/supabase-js';
import { calculateGrade } from '../js/grading.js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('=== SYNCHRONIZING THEME EXAM REMEDIALS IN DATABASE ===\n');

// Fetch all best attempts for exams
const { data: examAtts, error } = await supabase
  .from('attempts')
  .select('id, student_id, test_id, score, percentage, effective_score, grade, is_remedial_unlocked, total_questions, tests(title, shell_code, payload), students(name)')
  .eq('is_best_score', true);

if (error) {
  console.error(error);
  process.exit(1);
}

// Group by student_id and theme
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

let updatedCount = 0;

for (const item of Object.values(studentThemeExams)) {
  if (item.exams.length < 2) continue;
  const hasRemedial = item.exams.some(e => Boolean(e.is_remedial_unlocked));

  if (hasRemedial) {
    for (const e of item.exams) {
      if (!e.is_remedial_unlocked) {
        console.log(`Synchronizing remedial for: "${item.studentName}" | ${e.tests?.shell_code}`);
        const pct = Number(e.percentage || 0);
        const newEffScore = Math.min(pct, 60.0);
        const newGrade = calculateGrade(newEffScore);

        const { error: updErr } = await supabase
          .from('attempts')
          .update({
            is_remedial_unlocked: true,
            effective_score: newEffScore,
            grade: newGrade,
            updated_at: new Date().toISOString()
          })
          .eq('id', e.id);

        if (updErr) {
          console.error(`Error updating attempt ${e.id}:`, updErr);
        } else {
          updatedCount++;
          console.log(`  -> Updated attempt ${e.id}: is_remedial_unlocked=true, effScore=${newEffScore}, grade=${newGrade}`);
        }
      }
    }
  }
}

console.log(`\nSuccessfully synchronized ${updatedCount} attempts in Supabase.`);

