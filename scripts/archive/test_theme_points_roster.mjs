import { createClient } from '@supabase/supabase-js';
import { isWeeklyExam, getGradeColorByScore } from '../js/grading.js';

const sb = createClient('https://oclajpyumehpojepcczg.supabase.co', 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB');

async function testThemePoints() {
  const { data: students } = await sb.from('students')
    .select('id, name, gender, birth_date, is_active')
    .eq('batch_id', '3b697c66-da5d-4a68-b823-ba3d06353852')
    .is('deleted_at', null)
    .order('name');

  const { data: tests } = await sb.from('tests')
    .select('id, title, test_type, shell_code, payload, display_order, category, level_id, class_id')
    .eq('class_id', 'ab33498a-90e6-44b7-83f4-5765f964543e')
    .order('display_order');

  const { data: attempts } = await sb.from('attempts')
    .select('id, student_id, test_id, score, percentage, total_questions, status, is_best_score')
    .in('student_id', students.map(s => s.id))
    .in('test_id', tests.map(t => t.id));

  const validStatuses = ['submitted', 'auto_submitted', 'evaluated', 'graded'];
  const bestAttemptsMap = new Map();
  attempts.forEach(a => {
    if (!validStatuses.includes(String(a.status || '').toLowerCase())) return;
    const key = `${a.student_id}|${a.test_id}`;
    if (!bestAttemptsMap.has(key)) {
      bestAttemptsMap.set(key, a);
    } else {
      const prev = bestAttemptsMap.get(key);
      if (Number(a.score || 0) > Number(prev.score || 0)) {
        bestAttemptsMap.set(key, a);
      }
    }
  });

  // Group exams by theme
  const themes = ['A', 'B', 'C', 'D'];
  const themeExams = {};
  themes.forEach(th => {
    themeExams[th] = tests.filter(t => (t.payload?.theme_code === th || (t.shell_code && t.shell_code.includes(`-${th}-`))) && isWeeklyExam(t));
  });

  console.log('Theme exams:');
  themes.forEach(th => {
    console.log(`Theme ${th}:`, themeExams[th].map(t => `${t.display_order}. ${t.title}`));
  });

  const results = students.map(s => {
    const themePoints = {};
    let totalPoints = 0;

    themes.forEach(th => {
      let earned = 0;
      let hasAtt = false;
      themeExams[th].forEach(ex => {
        const key = `${s.id}|${ex.id}`;
        const att = bestAttemptsMap.get(key);
        if (att) {
          hasAtt = true;
          earned += Number(att.score || 0);
        }
      });
      const cleanEarned = Math.round(earned * 10) / 10;
      themePoints[th] = hasAtt ? cleanEarned : null;
      if (hasAtt) totalPoints += cleanEarned;
    });

    return {
      name: s.name,
      Exam1_ThemeA: themePoints['A'],
      Exam2_ThemeB: themePoints['B'],
      Exam3_ThemeC: themePoints['C'],
      Exam4_ThemeD: themePoints['D'],
      TotalPoints: Math.round(totalPoints * 10) / 10
    };
  });

  console.table(results);
}

testThemePoints();
