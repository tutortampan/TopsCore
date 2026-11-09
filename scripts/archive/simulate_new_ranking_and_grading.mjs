import { getSupabase } from '../js/supabase.js';
import { calculateGrade } from '../js/grading.js';

async function simulate() {
  const sb = await getSupabase();
  const batchId = '3b697c66-da5d-4a68-b823-ba3d06353852';

  // 1. Get active students in batch 133
  const { data: students } = await sb.from('students')
    .select('id, name')
    .eq('batch_id', batchId)
    .eq('is_active', true)
    .order('name');

  // 2. Get all 40 tests
  const { data: tests } = await sb.from('tests')
    .select('id, title, shell_code, display_order, test_type, payload')
    .order('display_order', { ascending: true });

  const vocabTests = tests.filter(t => t.shell_code && t.shell_code.startsWith('3'));
  const examTests = vocabTests.filter(t => t.test_type === 'exam');

  // Total curriculum points for exams
  // A: 120 + 30 = 150
  // B: 280 + 70 = 350
  // C: 480 + 120 = 600
  // D: 640 + 160 = 800
  // Total = 1900
  const totalCurriculumExpectedPts = 1900;
  const totalClassExamsCount = 8;
  const totalClassTestsCount = 40;

  // 3. Fetch all attempts for these students
  const studentIds = students.map(s => s.id);
  const { data: attempts } = await sb.from('attempts')
    .select('id, student_id, test_id, score, percentage, effective_score, status, submitted_at, created_at, tests(display_order, shell_code, test_type)')
    .in('student_id', studentIds)
    .in('status', ['submitted', 'auto_submitted', 'evaluated', 'graded']);

  // Map student best attempts per test
  const studentStats = students.map(s => {
    const sAtts = attempts.filter(a => a.student_id === s.id);
    const bestByTest = {};
    sAtts.forEach(a => {
      const prev = bestByTest[a.test_id];
      const curScore = Number(a.score ?? 0);
      const prevScore = prev ? Number(prev.score ?? 0) : -1;
      if (!prev || curScore > prevScore) {
        bestByTest[a.test_id] = a;
      }
    });

    let completedAllCount = 0;
    let completedExamCount = 0;
    let totalExamPtsEarned = 0;
    let lastSubmission = null;

    vocabTests.forEach(t => {
      const b = bestByTest[t.id];
      if (b) {
        completedAllCount++;
        if (t.test_type === 'exam') {
          completedExamCount++;
          totalExamPtsEarned += Number(b.score ?? 0);
        }
        const dt = b.submitted_at || b.created_at;
        if (dt && (!lastSubmission || new Date(dt) > new Date(lastSubmission))) {
          lastSubmission = dt;
        }
      }
    });

    totalExamPtsEarned = Math.round(totalExamPtsEarned * 10) / 10;
    const progPct = Math.round((completedAllCount / totalClassTestsCount) * 100);
    const examProgPct = Math.round((completedExamCount / totalClassExamsCount) * 100);

    // Model 1: Current system grade (Latest theme score)
    // Model 2: Pure Cumulative Curriculum Score (pts / 1900 * 100)
    const pureCurriculumPct = Math.round((totalExamPtsEarned / totalCurriculumExpectedPts) * 100);
    const pureCurriculumGrade = calculateGrade(pureCurriculumPct);

    // Model 3: Paced Accuracy Score (pts earned / expected pts of completed exams)
    // If student completed Theme A (150 pts expected) and got 137.5 -> 92% (Grade A)
    // But composite grade incorporates progress:
    // Composite = (Paced Accuracy) * (Exam Progress)
    // Notice that: (P_earned / P_attempted) * (P_attempted / 1900) = P_earned / 1900!

    // Model 4: Dual Grade: Paced Grade while In-Progress, Final Grade when 100%
    return {
      name: s.name.replace(/^Mr\.\s+/i, '').replace(/^Ms\.\s+/i, '').trim(),
      completedAllCount,
      completedExamCount,
      progPct,
      examProgPct,
      totalExamPtsEarned,
      pureCurriculumPct,
      pureCurriculumGrade,
      lastSubmission
    };
  });

  // Sort by: 1. PROG % DESC, 2. PTS DESC, 3. pureCurriculumPct DESC, 4. Name ASC
  studentStats.sort((a, b) => {
    if (b.progPct !== a.progPct) return b.progPct - a.progPct;
    if (b.totalExamPtsEarned !== a.totalExamPtsEarned) return b.totalExamPtsEarned - a.totalExamPtsEarned;
    return a.name.localeCompare(b.name);
  });

  console.log('=== SIMULATED LEADERBOARD (Sort: PROG % DESC -> PTS DESC) ===');
  console.log('Rank | Student Name                | PROG % | Exams | PTS Earned | Curric % | Curric GRD');
  console.log('--------------------------------------------------------------------------------------');
  studentStats.forEach((s, idx) => {
    const rank = String(idx + 1).padStart(4);
    const name = s.name.padEnd(27);
    const prog = `${s.progPct}%`.padStart(6);
    const exams = `${s.completedExamCount}/8`.padStart(5);
    const pts = `${s.totalExamPtsEarned} pts`.padStart(11);
    const pct = `${s.pureCurriculumPct}%`.padStart(8);
    const grd = s.pureCurriculumGrade.padStart(10);
    console.log(`${rank} | ${name} | ${prog} | ${exams} | ${pts} | ${pct} | ${grd}`);
  });
}

simulate();

