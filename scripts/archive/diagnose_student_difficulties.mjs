import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function runDiagnosis() {
  console.log('=== TOPSCORE STUDENT DIFFICULTY & TEST DELIVERY AUDIT ===\n');

  // 1. Fetch Batch 133 students
  const { data: batches } = await sb.from('batches').select('id, name').eq('name', '133').is('deleted_at', null);
  const batch133 = batches?.[0];
  if (!batch133) {
    console.error('Batch 133 not found');
    return;
  }
  const { data: students } = await sb.from('students')
    .select('id, name, is_active')
    .eq('batch_id', batch133.id)
    .is('deleted_at', null);

  const activeStudents = students.filter(s => s.is_active !== false && (s.name.startsWith('Miss ') || s.name.startsWith('Mr. ')));
  const studentIds = activeStudents.map(s => s.id);
  console.log(`Analyzing ${activeStudents.length} active students in Batch 133...`);

  // 2. Fetch attempts for Batch 133 students
  const { data: attempts, error: attErr } = await sb.from('attempts')
    .select('id, student_id, test_id, score, percentage, grade, status, started_at, submitted_at, expires_at, total_questions, tests(title, test_type, working_duration_minutes, answer_type)')
    .in('student_id', studentIds);

  if (attErr) {
    console.error('Error fetching attempts:', attErr);
    return;
  }
  console.log(`Total attempts for Batch 133 students: ${attempts.length}`);

  // Calculate timeout attempts vs completed
  const timeoutAttempts = attempts.filter(a => a.status === 'auto_submitted');
  console.log(`Auto-submitted / timed out attempts: ${timeoutAttempts.length} (${Math.round((timeoutAttempts.length / attempts.length) * 100)}%)`);

  // 3. Fetch attempt_answers for Batch 133 attempts (paginated)
  const attemptIds = attempts.map(a => a.id);
  console.log(`Fetching answer telemetry for Batch 133...`);

  let allAnswers = [];
  const chunkSize = 200;
  for (let i = 0; i < attemptIds.length; i += chunkSize) {
    const chunk = attemptIds.slice(i, i + chunkSize);
    const { data: ans } = await sb.from('attempt_answers')
      .select('id, attempt_id, question_id, student_answer, is_correct, evaluation_result, score, question_snapshot, correct_answer_snapshot, accepted_answers_snapshot')
      .in('attempt_id', chunk);
    if (ans) allAnswers = allAnswers.concat(ans);
  }
  console.log(`Total student answers collected: ${allAnswers.length}`);

  // 4. Categorize errors
  let blankCount = 0;
  let correctCount = 0;
  let partialCount = 0;
  let hyphenMismatches = [];
  let wordFormMismatches = [];
  let commonWrongByQuestion = new Map();

  allAnswers.forEach(ans => {
    if (ans.is_correct || ans.score >= 1.0) {
      correctCount++;
      return;
    }
    if (ans.score > 0 && ans.score < 1.0) {
      partialCount++;
    }

    const sAns = (ans.student_answer || '').trim();
    if (!sAns) {
      blankCount++;
      return;
    }

    const cAns = (ans.correct_answer_snapshot || '').trim();
    const qText = ans.question_snapshot?.question_text || 'Unknown';
    const cleanS = sAns.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanC = cAns.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Check if hyphen or space caused false failure
    if (cleanS === cleanC && cleanS.length > 3) {
      hyphenMismatches.push({
        prompt: qText,
        student: sAns,
        target: cAns,
        score: ans.score,
        eval: ans.evaluation_result
      });
    }

    // Check common mistakes per question
    const qKey = `${qText} -> ${cAns}`;
    if (!commonWrongByQuestion.has(qKey)) {
      commonWrongByQuestion.set(qKey, []);
    }
    commonWrongByQuestion.get(qKey).push(sAns);
  });

  console.log('\n--- ANSWER BREAKDOWN ---');
  console.log(`Total Answers: ${allAnswers.length}`);
  console.log(`Correct (1.0 pt): ${correctCount} (${Math.round((correctCount / allAnswers.length) * 100)}%)`);
  console.log(`Partial (0.5 pt): ${partialCount} (${Math.round((partialCount / allAnswers.length) * 100)}%)`);
  console.log(`Blank / Timed Out: ${blankCount} (${Math.round((blankCount / allAnswers.length) * 100)}%)`);
  console.log(`Punctuation/Hyphen False Failures: ${hyphenMismatches.length}`);

  if (hyphenMismatches.length > 0) {
    console.log('\nTop Hyphen / Punctuation Mismatches:');
    hyphenMismatches.slice(0, 10).forEach(h => {
      console.log(`  "${h.prompt}": Student answered "${h.student}", Target was "${h.target}" (Score: ${h.score})`);
    });
  }

  // Top repeated wrong answers
  console.log('\n--- TOP BOTTLENECK QUESTIONS ---');
  const sortedBottlenecks = Array.from(commonWrongByQuestion.entries())
    .map(([q, answers]) => {
      const counts = {};
      answers.forEach(a => counts[a] = (counts[a] || 0) + 1);
      return { q, totalWrong: answers.length, topWrong: counts };
    })
    .sort((a, b) => b.totalWrong - a.totalWrong)
    .slice(0, 15);

  sortedBottlenecks.forEach(b => {
    console.log(`\n[${b.totalWrong}x Wrong] ${b.q}`);
    const topAns = Object.entries(b.topWrong).sort((x, y) => y[1] - x[1]).slice(0, 4);
    topAns.forEach(([ans, c]) => console.log(`   - "${ans}": ${c}x`));
  });
}

runDiagnosis();
