import { getSupabase } from '../js/supabase.js';
import { isWeeklyExam, computeMilestoneExamMastery } from '../js/grading.js';

const cleanStudentName = (name) => (name || '').replace(/^(mr\.?|miss\.?|mrs\.?|ms\.?)\s+/i, '').trim();

async function main() {
  const sb = await getSupabase();
  const batchId = '3b697c66-da5d-4a68-b823-ba3d06353852';

  // 1. Fetch all students in batch 133
  const { data: students } = await sb.from('students')
    .select('*')
    .eq('batch_id', batchId)
    .is('deleted_at', null)
    .neq('is_active', false);

  // 2. Fetch all tests for 3rd Vocabulary
  const query = sb.from('tests').select('id, title, display_name, test_subtype, category, payload, class_id, level_id, display_order, status, minimum_required_score, prerequisite_test_id, working_duration_minutes, schedule_mode, test_type, is_dynamic_shell, shell_code, max_attempts, retake_allowed, created_at, deleted_at, classes(name), levels(name, level_number)').is('deleted_at', null);
  const { data: allTests } = await query;
  const allBatchExams = allTests.filter(isWeeklyExam);
  console.log(`Total exams in batch: ${allBatchExams.length}`);

  // 3. Fetch all attempts for students in batch
  const studentIds = students.map(s => s.id);
  const { data: attempts } = await sb.from('attempts')
    .select('id, student_id, test_id, score, percentage, status, is_remedial_unlocked, created_at, submitted_at, total_questions, tests(*)')
    .in('student_id', studentIds);

  console.log(`Total attempts for batch: ${attempts.length}`);

  // 4. Calculate stats for each student
  const studentStats = students.map(st => {
    const studAtts = (attempts || []).filter(a => a.student_id === st.id);
    const bestMap = {};
    let lastSubmittedAt = null;

    studAtts.forEach(att => {
      const stStatus = String(att.status || '').toLowerCase();
      if (!['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(stStatus)) return;
      const t = att.tests || allTests.find(x => x.id === att.test_id);
      if (!t) return;

      const isExam = isWeeklyExam(t);
      const totalQ = Number(att.total_questions || t.total_questions || 50);
      const rawScore = Number(att.score ?? 0);
      const rawPct = Number(att.percentage ?? 0);
      const isRemedial = Boolean(att.is_remedial_unlocked || att.is_remedial);
      const effPoints = isRemedial ? Math.min(rawScore, totalQ * 0.6) : rawScore;
      const effPct = isRemedial ? Math.min(rawPct, 60.0) : rawPct;

      const key = t.id;
      if (!bestMap[key] || effPoints > bestMap[key].points || (effPoints === bestMap[key].points && effPct > bestMap[key].effPct)) {
        bestMap[key] = {
          test: t,
          isExam,
          effPct,
          points: effPoints,
          totalQ
        };
      }

      if (att.submitted_at && (!lastSubmittedAt || new Date(att.submitted_at) > new Date(lastSubmittedAt))) {
        lastSubmittedAt = att.submitted_at;
      }
    });

    const bestItems = Object.values(bestMap);
    const completedCount = bestItems.length;
    const examItems = bestItems.filter(i => i.isExam);
    const mastery = computeMilestoneExamMastery(examItems, allBatchExams);

    return {
      id: st.id,
      name: st.name,
      cleanName: cleanStudentName(st.name),
      gender: st.gender,
      totalPoints: mastery.totalPoints,
      overallScore: mastery.overallScore,
      grade: mastery.grade,
      completedCount,
      completedWeeklyCount: mastery.completedWeeklyCount,
      progressPct: Math.round((completedCount / allTests.length) * 100),
      lastSubmittedAt
    };
  });

  // Sort
  studentStats.sort((a, b) => {
    const ptsA = Number(a.totalPoints ?? 0);
    const ptsB = Number(b.totalPoints ?? 0);
    if (ptsA !== ptsB) return ptsB - ptsA;

    const scoreA = (a.completedWeeklyCount > 0) ? Number(a.overallScore ?? 0) : -1;
    const scoreB = (b.completedWeeklyCount > 0) ? Number(b.overallScore ?? 0) : -1;
    if (scoreA !== scoreB) return scoreB - scoreA;

    const progA = Number(a.progressPct ?? 0);
    const progB = Number(b.progressPct ?? 0);
    if (progA !== progB) return progB - progA;

    if (a.lastSubmittedAt && b.lastSubmittedAt) {
      const diff = new Date(a.lastSubmittedAt) - new Date(b.lastSubmittedAt);
      if (diff !== 0) return diff;
    }

    return (a.cleanName || '').localeCompare(b.cleanName || '');
  });

  console.log('\n--- BATCH 133 STANDINGS IN STUDENT DASHBOARD ---');
  studentStats.forEach((s, idx) => {
    console.log(`#${idx + 1}: ${s.name.padEnd(30)} | PTS: ${String(s.totalPoints).padStart(5)} | SCORE: ${String(s.overallScore).padStart(3)}% (${s.grade}) | COMPLETED: ${s.completedCount} (${s.progressPct}%)`);
  });
}

main().catch(console.error);
