import { createClient } from '@supabase/supabase-js';
import { isWeeklyExam, computeMilestoneExamMastery, calculateGrade, getGradeColorByScore } from '../js/grading.js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function cleanStudentName(raw) {
  return String(raw || '').replace(/^(mr\.?|miss\.?|mrs\.?|ms\.?)\s+/i, '').trim();
}

function getAsmExpectedMax(asm) {
  if (!asm) return 100;
  if (asm.payload?.total_questions) return Number(asm.payload.total_questions);
  if (asm.total_questions) return Number(asm.total_questions);
  const ord = Number(asm.display_order || 0);
  if (ord === 7) return 120;
  if (ord === 8) return 30;
  if (ord === 17) return 280;
  if (ord === 18) return 70;
  if (ord === 29) return 480;
  if (ord === 30) return 120;
  if (ord === 39) return 640;
  if (ord === 40) return 160;
  return 100;
}

async function deepCrossCheck() {
  console.log('=== DEEP CROSS-CHECK NILAI SISWA BATCH 133 (IMAGE 2 AUDIT) ===\n');

  // 1. Fetch Class '3rd Vocabulary'
  const { data: cls } = await sb.from('classes').select('id, name').ilike('name', '%3rd Vocabulary%').single();
  // 2. Fetch all 40 tests in this class
  const { data: classTests, error: errTests } = await sb.from('tests')
    .select('id, title, test_type, category, display_order, shell_code, payload')
    .eq('class_id', cls.id)
    .order('display_order');

  if (errTests) {
    console.error('Error fetching tests:', errTests);
    return;
  }

  console.log(`Class: ${cls.name} (Total Tests: ${classTests.length})`);
  const classExams = classTests.filter(isWeeklyExam);
  const classQuizzes = classTests.filter(t => !isWeeklyExam(t));
  console.log(`  - Milestone Exams: ${classExams.length}`);
  console.log(`  - Pacing Quizzes: ${classQuizzes.length}`);

  // Categorize tests by Theme
  const helperThemeCode = (t) => {
    if (!t) return 'A';
    if (t.payload?.theme_code) return String(t.payload.theme_code).toUpperCase();
    const shell = String(t.shell_code || t.payload?.shell_code || '');
    const m = shell.match(/^[0-9]+([A-Za-z])/);
    if (m) return m[1].toUpperCase();
    const titleM = String(t.title || '').match(/Theme\s+([A-Za-z])|Vocabulary\s+([A-Za-z])/i);
    if (titleM) return (titleM[1] || titleM[2]).toUpperCase();
    return 'A';
  };

  const themeTests = { A: [], B: [], C: [], D: [] };
  classTests.forEach(t => {
    const tc = helperThemeCode(t);
    if (themeTests[tc]) themeTests[tc].push(t);
  });

  // 3. Fetch Batch 133 students
  const { data: batches } = await sb.from('batches').select('id, name').eq('name', '133').is('deleted_at', null);
  const batch133Id = batches[0].id;
  const { data: students } = await sb.from('students')
    .select('id, name, gender, is_active')
    .eq('batch_id', batch133Id)
    .is('deleted_at', null);

  const activeStudents = students.filter(s => s.is_active !== false && (s.name.startsWith('Miss ') || s.name.startsWith('Mr. ')));

  // 4. Fetch all attempts for these students with pagination
  const sIds = activeStudents.map(s => s.id);
  let allAttempts = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data: attPage, error: attErr } = await sb.from('attempts')
      .select('id, student_id, test_id, score, percentage, grade, status, is_best_score, is_remedial_unlocked, total_questions')
      .in('student_id', sIds)
      .range(from, from + pageSize - 1);
    if (attErr) {
      console.error('Error fetching attempts page:', attErr);
      break;
    }
    if (!attPage || attPage.length === 0) break;
    allAttempts = allAttempts.concat(attPage);
    if (attPage.length < pageSize) break;
    from += pageSize;
  }
  console.log(`Fetched total attempts for Batch 133: ${allAttempts.length}`);

  const testIds = new Set(classTests.map(t => t.id));
  const classAttempts = allAttempts.filter(a => testIds.has(a.test_id));

  // 5. Build per-student scorecard matching Admin Class Hub logic
  const studentScores = activeStudents.map(st => {
    const sAtts = classAttempts.filter(a => a.student_id === st.id);
    
    // Best attempt per test
    const asmScores = {};
    classTests.forEach(asm => {
      const atts = sAtts.filter(a => a.test_id === asm.id && ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase()));
      if (atts.length > 0) {
        atts.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
        asmScores[asm.id] = atts[0];
      } else {
        asmScores[asm.id] = null;
      }
    });

    let completedCount = 0;
    const studentExamEntries = [];

    classTests.forEach(asm => {
      const bestAtt = asmScores[asm.id];
      const maxQ = getAsmExpectedMax(asm);
      const totalQ = Number(bestAtt?.total_questions || maxQ);
      const rawEarned = bestAtt?.score != null ? Math.min(Number(bestAtt.score), totalQ) : 0;
      const rawPct = bestAtt ? (bestAtt.percentage != null ? Number(bestAtt.percentage) : (totalQ > 0 ? (rawEarned / totalQ) * 100 : 0)) : -1;
      const hasRealAtt = bestAtt && ['submitted','auto_submitted','evaluated','graded'].includes(String(bestAtt?.status||'').toLowerCase());

      if (hasRealAtt) {
        completedCount++;
        const isRem = Boolean(bestAtt?.is_remedial_unlocked || bestAtt?.is_remedial);
        const effEarned = isRem ? Math.min(rawEarned, totalQ * 0.6) : rawEarned;
        const effPct = isRem ? Math.min(rawPct, 60.0) : rawPct;

        if (isWeeklyExam(asm)) {
          studentExamEntries.push({
            test: asm,
            testId: asm.id,
            effPoints: effEarned,
            effPct,
            totalQ
          });
        }
      }
    });

    const progressPct = Math.round((completedCount / classTests.length) * 100);
    const mastery = computeMilestoneExamMastery(studentExamEntries, classExams);

    // Cumulative Points across ALL completed tests in this class (including Quizzes)
    let cumulativeAllTestsPoints = 0;
    Object.values(asmScores).forEach(att => {
      if (att && att.score != null) {
        cumulativeAllTestsPoints += Number(att.score);
      }
    });

    // Theme Scores and Totals
    const getThemeStats = (themeChar) => {
      const testsInTheme = themeTests[themeChar] || [];
      const examsInTheme = testsInTheme.filter(isWeeklyExam);
      let earnedExamPts = 0;
      let totalExamMaxQ = 0;
      let hasAttempt = false;

      examsInTheme.forEach(asm => {
        const att = asmScores[asm.id];
        const maxQ = getAsmExpectedMax(asm);
        totalExamMaxQ += maxQ;
        if (att) {
          hasAttempt = true;
          earnedExamPts += Number(att.score || 0);
        }
      });

      const scorePct = hasAttempt && totalExamMaxQ > 0 ? Math.round((earnedExamPts / totalExamMaxQ) * 100) : null;
      return {
        hasAttempt,
        pts: hasAttempt ? earnedExamPts : null,
        maxQ: totalExamMaxQ,
        scorePct
      };
    };

    const thA = getThemeStats('A');
    const thB = getThemeStats('B');
    const thC = getThemeStats('C');
    const thD = getThemeStats('D');

    return {
      name: st.name,
      cleanName: cleanStudentName(st.name),
      progPct: progressPct,
      grade: mastery.grade,
      scorePct: mastery.overallScore,
      examPts: mastery.cumulativePoints,
      activeTheme: mastery.activeThemeCode,
      allPts: cumulativeAllTestsPoints,
      thA,
      thB,
      thC,
      thD
    };
  });

  // Sort matching Image 2 display (prog desc, then allPts desc)
  studentScores.sort((a, b) => {
    if (b.progPct !== a.progPct) return b.progPct - a.progPct;
    return b.examPts - a.examPts;
  });

  console.log('-------------------------------------------------------------------------------------------------------------------------');
  console.log('No | Student Name              | Prog | Grd | Score | Exam PTS | Active | Theme A (150) | Theme B (350) | Theme C (600) | Theme D (800)');
  console.log('---|---------------------------|------|-----|-------|----------|--------|---------------|---------------|---------------|--------------');
  studentScores.forEach((s, idx) => {
    const fmtTheme = (th) => {
      if (!th.hasAttempt) return '       —       ';
      return `${String(th.pts).padStart(5)}pt (${String(th.scorePct).padStart(2)}%)`;
    };
    console.log(
      `${String(idx + 1).padStart(2)} | ` +
      `${s.name.padEnd(25)} | ` +
      `${String(s.progPct).padStart(3)}% | ` +
      `  ${s.grade}  | ` +
      `${String(s.scorePct).padStart(3)}%  | ` +
      `${String(s.examPts).padStart(8)} | ` +
      `   ${s.activeTheme || '—'}    | ` +
      `${fmtTheme(s.thA)} | ` +
      `${fmtTheme(s.thB)} | ` +
      `${fmtTheme(s.thC)} | ` +
      `${fmtTheme(s.thD)}`
    );
  });
  console.log('-------------------------------------------------------------------------------------------------------------------------');
}

deepCrossCheck();
