import { createClient } from '@supabase/supabase-js';
import { calculateGrade, getGradeColorByScore, computeMilestoneExamMastery } from '../js/grading.js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function isWeeklyExam(asm) {
  if (!asm) return false;
  const t = String(asm.test_type || '').toLowerCase();
  const c = String(asm.category || '').toLowerCase();
  const st = String(asm.test_subtype || '').toLowerCase();
  const sc = String(asm.shell_code || '').toUpperCase();
  const title = String(asm.title || '').toLowerCase();
  return t === 'exam' || c === 'exam' || st.includes('exam') || sc.includes('-EXAM') || title.includes('exam');
}

async function simulate() {
  const classId = 'ab33498a-90e6-44b7-83f4-5765f964543e';
  const { data: tests } = await sb.from('tests').select('*').eq('class_id', classId).order('display_order');
  const testIds = tests.map(t => t.id);
  const testMap = Object.fromEntries(tests.map(t => [t.id, t]));

  const batchId = '3b697c66-da5d-4a68-b823-ba3d06353852';
  const { data: students } = await sb.from('students').select('id, name').eq('batch_id', batchId).order('name');
  const activeStudents = students.filter(s => s.name.startsWith('Miss ') || s.name.startsWith('Mr. '));

  // Fetch all best attempts
  let allAtts = [];
  let page = 0;
  while (true) {
    const { data: atts } = await sb.from('attempts')
      .select('*')
      .in('test_id', testIds)
      .in('student_id', activeStudents.map(s => s.id))
      .eq('is_best_score', true)
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!atts || atts.length === 0) break;
    allAtts.push(...atts);
    if (atts.length < 1000) break;
    page++;
  }

  const allClassExams = tests.filter(isWeeklyExam);
  console.log(`Class has ${tests.length} tests (${allClassExams.length} exams).`);

  const results = [];

  for (const s of activeStudents) {
    const sAtts = allAtts.filter(a => a.student_id === s.id);
    const attMap = Object.fromEntries(sAtts.map(a => [a.test_id, a]));

    let completedCount = 0;
    const studentExamEntries = [];

    // Per-theme tracking
    const themes = ['A', 'B', 'C', 'D'];
    const themeResults = {};
    for (const tc of themes) {
      themeResults[tc] = { earned: 0, maxQ: 0, hasAtt: false, count: 0 };
    }

    tests.forEach(asm => {
      const att = attMap[asm.id];
      const fallbackMax = asm.total_questions || (isWeeklyExam(asm) ? 40 : 10);
      const totalQ = Number(att?.total_questions || fallbackMax);
      const hasRealAtt = att && ['submitted','auto_submitted','evaluated','graded'].includes(String(att?.status||'').toLowerCase());

      const tc = asm.payload?.theme_code || (asm.shell_code ? asm.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'A');

      if (hasRealAtt) {
        completedCount++;
        const rawEarned = att.score != null ? Math.min(Number(att.score), totalQ) : 0;
        const rawPct = att.percentage != null ? Number(att.percentage) : (totalQ > 0 ? (rawEarned / totalQ) * 100 : 0);

        if (isWeeklyExam(asm)) {
          studentExamEntries.push({
            test: asm,
            effPoints: rawEarned,
            effPct: rawPct,
            totalQ
          });

          if (themeResults[tc]) {
            themeResults[tc].hasAtt = true;
            themeResults[tc].earned += rawEarned;
            themeResults[tc].maxQ += totalQ;
            themeResults[tc].count++;
          }
        }
      }
    });

    const progPct = Math.round((completedCount / tests.length) * 100);
    const mastery = computeMilestoneExamMastery(studentExamEntries, allClassExams);
    const pts = mastery.cumulativePoints != null ? mastery.cumulativePoints : mastery.totalPoints;
    const grade = mastery.grade;
    const avgScore = mastery.overallScore;

    // Theme display
    const themeDisplay = {};
    for (const tc of themes) {
      const th = themeResults[tc];
      if (th.hasAtt) {
        const pct = th.maxQ > 0 ? Math.round((th.earned / th.maxQ) * 100) : 0;
        themeDisplay[tc] = `${pct}% (${th.earned} pts)`;
      } else {
        themeDisplay[tc] = '·';
      }
    }

    results.push({
      Name: s.name.replace(/^(Mr\.|Miss)\s+/, ''),
      Tests: `${completedCount}/${tests.length}`,
      PROG: `${progPct}%`,
      Exams: `${studentExamEntries.length}/${allClassExams.length}`,
      PTS: pts,
      Score: `${avgScore}%`,
      GRD: grade,
      Theme_A: themeDisplay['A'],
      Theme_B: themeDisplay['B'],
      Theme_C: themeDisplay['C'],
      Theme_D: themeDisplay['D']
    });
  }

  // Sort by PTS descending
  results.sort((a, b) => b.PTS - a.PTS);
  console.table(results);
}

simulate();
