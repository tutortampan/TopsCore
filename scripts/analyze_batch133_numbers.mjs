import { getSupabase } from '../js/supabase.js';
import { isExam, isWeeklyExam, calculateGrade, TOPSCORE_COLORS } from '../js/grading.js';

async function analyze() {
  const sb = await getSupabase();

  // Find class '3rd Vocabulary'
  const { data: classes } = await sb.from('classes').select('id, name').ilike('name', '%3rd Vocabulary%');
  const classId = classes?.[0]?.id;
  console.log('Class:', classes?.[0]);

  // Find Batch 133
  const batchId = '3b697c66-da5d-4a68-b823-ba3d06353852';
  console.log('Using Batch 133 ID:', batchId);

  // Find students in batch 133
  const { data: students } = await sb.from('students')
    .select('id, name, is_active')
    .eq('batch_id', batchId)
    .eq('is_active', true)
    .order('name');

  console.log(`Found ${students.length} active students in Batch 133.`);

  // Find all tests in this class
  const { data: allTests } = await sb.from('tests')
    .select('id, title, test_type, category, test_subtype, display_order, shell_code, payload')
    .eq('class_id', classId)
    .order('display_order');

  const exams = allTests.filter(isWeeklyExam);
  console.log(`Found ${allTests.length} tests in class, ${exams.length} are weekly exams:`);
  exams.forEach(e => console.log(`  - [Ord ${e.display_order}] ${e.shell_code || e.title} (${e.title})`));

  // Fetch all attempts for these students
  const studentIds = students.map(s => s.id);
  const { data: attempts, error: attErr } = await sb.from('attempts')
    .select('id, student_id, test_id, score, percentage, grade, status, is_best_score, is_remedial_unlocked, effective_score, total_questions')
    .in('student_id', studentIds)
    .eq('is_best_score', true);

  if (attErr) {
    console.error('Error fetching attempts:', attErr);
    return;
  }
  const safeAttempts = attempts || [];
  console.log(`Found ${safeAttempts.length} best attempts for Batch 133.`);

  // Group exams by Theme:
  // Theme A: Ord 7 (Words 120), Ord 8 (Phrases 30) -> Total 150
  // Theme B: Ord 17 (Words 280), Ord 18 (Phrases 70) -> Total 350
  // Theme C: Ord 29 (Words 480), Ord 30 (Phrases 120) -> Total 600
  // Theme D: Ord 39 (Words 640), Ord 40 (Phrases 160) -> Total 800
  // Total Max Questions across all 4 themes = 150 + 350 + 600 + 800 = 1900 points!

  const analysisRows = [];

  students.forEach(st => {
    const stAttempts = safeAttempts.filter(a => a.student_id === st.id);
    const attMap = {};
    stAttempts.forEach(a => { attMap[a.test_id] = a; });

    let themeAPts = 0, themeAMax = 150, themeAAttempted = false;
    let themeBPts = 0, themeBMax = 350, themeBAttempted = false;
    let themeCPts = 0, themeCMax = 600, themeCAttempted = false;
    let themeDPts = 0, themeDMax = 800, themeDAttempted = false;

    exams.forEach(ex => {
      const att = attMap[ex.id];
      if (!att) return;
      const ord = ex.display_order;
      const score = Number(att.score || 0);
      const isRem = Boolean(att.is_remedial_unlocked);
      const eff = isRem ? Math.min(score, (att.total_questions || 100) * 0.6) : score;

      if (ord === 7 || ord === 8) { themeAPts += eff; themeAAttempted = true; }
      else if (ord === 17 || ord === 18) { themeBPts += eff; themeBAttempted = true; }
      else if (ord === 29 || ord === 30) { themeCPts += eff; themeCAttempted = true; }
      else if (ord === 39 || ord === 40) { themeDPts += eff; themeDAttempted = true; }
    });

    const totalPts = themeAPts + themeBPts + themeCPts + themeDPts;
    const completedExamsCount = exams.filter(e => attMap[e.id]).length;
    const progPct = Math.round((completedExamsCount / exams.length) * 100);

    // Calculate different scoring models:
    // Model 1: Current Latest Active Theme Model
    let latestThemeScore = 0;
    let latestThemeCode = '—';
    if (themeDAttempted) { latestThemeScore = Math.round((themeDPts / themeDMax) * 100); latestThemeCode = 'D'; }
    else if (themeCAttempted) { latestThemeScore = Math.round((themeCPts / themeCMax) * 100); latestThemeCode = 'C'; }
    else if (themeBAttempted) { latestThemeScore = Math.round((themeBPts / themeBMax) * 100); latestThemeCode = 'B'; }
    else if (themeAAttempted) { latestThemeScore = Math.round((themeAPts / themeAMax) * 100); latestThemeCode = 'A'; }

    // Model 2: Cumulative Points Ratio over Attempted Max (Earned / Attempted Potential)
    let attemptedMax = (themeAAttempted ? themeAMax : 0) + (themeBAttempted ? themeBMax : 0) + (themeCAttempted ? themeCMax : 0) + (themeDAttempted ? themeDMax : 0);
    const attemptedMasteryPct = attemptedMax > 0 ? Math.round((totalPts / attemptedMax) * 100) : 0;

    // Model 3: Absolute Global Score (Total Points / Total Curriculum Max 1900)
    const absoluteGlobalPct = Math.round((totalPts / 1900) * 100);

    // Model 4: Theme Average (Equal weight per completed theme)
    const completedThemePcts = [];
    if (themeAAttempted) completedThemePcts.push(themeAPts / themeAMax);
    if (themeBAttempted) completedThemePcts.push(themeBPts / themeBMax);
    if (themeCAttempted) completedThemePcts.push(themeCPts / themeCMax);
    if (themeDAttempted) completedThemePcts.push(themeDPts / themeDMax);
    const equalThemeAvgPct = completedThemePcts.length > 0
      ? Math.round((completedThemePcts.reduce((a, b) => a + b, 0) / completedThemePcts.length) * 100)
      : 0;

    analysisRows.push({
      name: st.name,
      completedExamsCount,
      progPct,
      themeAPts, themeAScore: Math.round((themeAPts / themeAMax) * 100),
      themeBPts, themeBScore: Math.round((themeBPts / themeBMax) * 100),
      themeCPts, themeCScore: Math.round((themeCPts / themeCMax) * 100),
      themeDPts, themeDScore: Math.round((themeDPts / themeDMax) * 100),
      totalPts,
      latestThemeCode,
      latestThemeScore,
      latestThemeGrade: calculateGrade(latestThemeScore),
      attemptedMasteryPct,
      attemptedMasteryGrade: calculateGrade(attemptedMasteryPct),
      equalThemeAvgPct,
      equalThemeAvgGrade: calculateGrade(equalThemeAvgPct),
      absoluteGlobalPct,
      absoluteGlobalGrade: calculateGrade(absoluteGlobalPct)
    });
  });

  // Sort by Total Points DESC
  analysisRows.sort((a, b) => b.totalPts - a.totalPts);

  console.log('\n========================================================================================================================');
  console.log('STUDENT DATA ANALYSIS (SORTED BY TOTAL PTS):');
  console.log('========================================================================================================================');
  console.log('NAME                      | PROG | PTS    | ThA  | ThB  | ThC  | ThD  | LATEST (CURR) | ATTEMPTED AVG | EQUAL THEME AVG | GLOBAL /1900');
  console.log('------------------------------------------------------------------------------------------------------------------------');
  analysisRows.forEach(r => {
    const pad = (s, l) => String(s).padEnd(l);
    const rpad = (s, l) => String(s).padStart(l);
    console.log(
      `${pad(r.name.substring(0, 25), 25)} | ` +
      `${rpad(r.progPct + '%', 4)} | ` +
      `${rpad(r.totalPts, 6)} | ` +
      `${rpad(r.themeAScore + '%', 4)} | ` +
      `${rpad(r.themeBScore + '%', 4)} | ` +
      `${rpad(r.themeCScore + '%', 4)} | ` +
      `${rpad(r.themeDScore + '%', 4)} | ` +
      `${rpad(r.latestThemeCode + ': ' + r.latestThemeScore + '% (' + r.latestThemeGrade + ')', 13)} | ` +
      `${rpad(r.attemptedMasteryPct + '% (' + r.attemptedMasteryGrade + ')', 13)} | ` +
      `${rpad(r.equalThemeAvgPct + '% (' + r.equalThemeAvgGrade + ')', 15)} | ` +
      `${rpad(r.absoluteGlobalPct + '% (' + r.absoluteGlobalGrade + ')', 12)}`
    );
  });
}

analyze().catch(console.error);
